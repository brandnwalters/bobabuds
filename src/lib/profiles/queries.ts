import "server-only";

import { connection } from "next/server";

import { type Relationship, relationshipWith } from "@/lib/friends/queries";
import { listLogsBy, type LogWithShop } from "@/lib/logs/queries";
import { withAvatarUrls } from "@/lib/profiles/avatar-urls";
import { BUD_COLUMNS, type Bud, type ProfileRow, toBud } from "@/lib/profiles/people";
import { USERNAME } from "@/lib/profiles/validation";
import {
  createClient,
  getViewerId,
  type ServerSupabase,
} from "@/lib/supabase/server";

/** A Profile's boba stats, over every Log on it. */
export type ProfileStats = {
  logCount: number;
  /** The shop with the most Logs (ties: the one logged most recently). */
  topShop: { id: string; name: string } | null;
  averageRating: number | null;
};

/**
 * A Profile as the viewer may see it. The user themselves and their friends
 * get the full view (stats and Logs); everyone else gets the limited view:
 * name, avatar and where the viewer stands with them.
 */
export type ProfileView =
  | { view: "full"; person: Bud; relationship: Relationship; stats: ProfileStats; logs: LogWithShop[] }
  | { view: "limited"; person: Bud; relationship: Relationship };

/** The Profile of `username` (any case) for the signed-in viewer, or null. */
export async function getProfile(username: string): Promise<ProfileView | null> {
  if (!USERNAME.test(username)) return null;
  // Per-request: the Supabase session check reads the clock.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(BUD_COLUMNS)
    // Usernames are unique case-insensitively; escape `_` for ilike.
    .ilike("username", username.replaceAll("_", "\\_"))
    .maybeSingle<ProfileRow>();
  if (error) throw error;
  return data ? profileView(supabase, data) : null;
}

/** The signed-in user's own Profile (null before onboarding). */
export async function getMyProfile(): Promise<ProfileView | null> {
  await connection();
  const supabase = await createClient();
  const userId = await getViewerId(supabase);
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(BUD_COLUMNS)
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  if (error) throw error;
  return data ? profileView(supabase, data) : null;
}

async function profileView(
  supabase: ServerSupabase,
  row: ProfileRow,
): Promise<ProfileView> {
  const [[person], relationship] = await Promise.all([
    withAvatarUrls(supabase, [toBud(row)]),
    relationshipWith(row.id),
  ]);
  if (relationship !== "self" && relationship !== "friends") {
    return { view: "limited", person: person!, relationship };
  }
  const logs = await listLogsBy(row.id);
  return { view: "full", person: person!, relationship, stats: profileStats(logs), logs };
}

/** Stats over `logs` (newest first, so ties go to the most recent shop). */
function profileStats(logs: LogWithShop[]): ProfileStats {
  if (logs.length === 0) return { logCount: 0, topShop: null, averageRating: null };
  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const log of logs) {
    const entry = counts.get(log.shop.id) ?? { id: log.shop.id, name: log.shop.name, count: 0 };
    entry.count += 1;
    counts.set(log.shop.id, entry);
  }
  // Map keeps first-seen order (most recent first); strict > keeps ties there.
  let top: { id: string; name: string; count: number } | null = null;
  for (const entry of counts.values()) if (!top || entry.count > top.count) top = entry;
  const total = logs.reduce((sum, log) => sum + log.rating, 0);
  return {
    logCount: logs.length,
    topShop: top && { id: top.id, name: top.name },
    averageRating: total / logs.length,
  };
}
