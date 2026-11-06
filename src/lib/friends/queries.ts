import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import { withAvatarUrls } from "@/lib/profiles/avatar-urls";
import { USERNAME_MAX } from "@/lib/profiles/validation";
import { createClient } from "@/lib/supabase/server";

/** The basic, public profile fields shown wherever a person is listed. */
export type Bud = {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  /** Short-lived signed URL of the avatar (null without one). */
  avatarUrl: string | null;
};

/**
 * Where the viewer stands with another user: `incoming` means they sent the
 * viewer a request, `outgoing` means the viewer sent them one.
 */
export type Relationship = "self" | "friends" | "incoming" | "outgoing" | "none";

export const SEARCH_LIMIT = 10;

const BUD_COLUMNS = "id, username, display_name, avatar_path";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
};

function toBud(row: ProfileRow): Omit<Bud, "avatarUrl"> {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarPath: row.avatar_path,
  };
}

async function viewer() {
  // Per-user data, read at request time (the session check reads the clock,
  // which Next won't allow while prerendering).
  await connection();
  const supabase = await createClient();
  const userId = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!userId) throw new Error("Not signed in");
  return { supabase, userId };
}

/** The viewer's incoming and outgoing Friend Requests and their friends. */
export async function getFriendsOverview(): Promise<{
  incoming: Bud[];
  outgoing: Bud[];
  friends: Bud[];
}> {
  const { supabase, userId } = await viewer();

  const [requests, friendships] = await Promise.all([
    supabase
      .from("friend_requests")
      .select(
        `sender_id, sender:profiles!friend_requests_sender_id_fkey(${BUD_COLUMNS}),
         recipient:profiles!friend_requests_recipient_id_fkey(${BUD_COLUMNS})`,
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("friendships")
      .select(
        `user_a, a:profiles!friendships_user_a_fkey(${BUD_COLUMNS}),
         b:profiles!friendships_user_b_fkey(${BUD_COLUMNS})`,
      ),
  ]);
  if (requests.error) throw requests.error;
  if (friendships.error) throw friendships.error;

  type RequestRow = { sender_id: string; sender: ProfileRow; recipient: ProfileRow };
  type FriendshipRow = { user_a: string; a: ProfileRow; b: ProfileRow };
  const requestRows = requests.data as unknown as RequestRow[];
  const friendshipRows = friendships.data as unknown as FriendshipRow[];

  const incoming = requestRows
    .filter((r) => r.sender_id !== userId)
    .map((r) => toBud(r.sender));
  const outgoing = requestRows
    .filter((r) => r.sender_id === userId)
    .map((r) => toBud(r.recipient));
  const friends = friendshipRows
    .map((f) => toBud(f.user_a === userId ? f.b : f.a))
    .sort((x, y) => x.displayName.localeCompare(y.displayName));

  // Sign every avatar in one request, then split the lists again.
  const signed = await withAvatarUrls(supabase, [...incoming, ...outgoing, ...friends]);
  return {
    incoming: signed.slice(0, incoming.length),
    outgoing: signed.slice(incoming.length, incoming.length + outgoing.length),
    friends: signed.slice(incoming.length + outgoing.length),
  };
}

/** How many Friend Requests are waiting for the viewer. Cached per request. */
export const pendingIncomingCount = cache(async (): Promise<number> => {
  const { supabase, userId } = await viewer();
  const { count, error } = await supabase
    .from("friend_requests")
    .select("sender_id", { count: "exact", head: true })
    .eq("recipient_id", userId);
  if (error) throw error;
  return count ?? 0;
});

/**
 * People whose username starts with `query` (ignoring case and a leading @),
 * excluding the viewer, with where the viewer stands with each.
 */
export async function searchBuds(
  query: string,
): Promise<(Bud & { relationship: Relationship })[]> {
  const prefix = query.trim().replace(/^@/, "");
  // Usernames only use these characters, so anything else matches nobody.
  if (!new RegExp(`^[A-Za-z0-9_]{1,${USERNAME_MAX}}$`).test(prefix)) return [];

  const { supabase, userId } = await viewer();
  const { data, error } = await supabase
    .from("profiles")
    .select(BUD_COLUMNS)
    .ilike("username", `${prefix.replaceAll("_", "\\_")}%`)
    .neq("id", userId)
    .order("username")
    .limit(SEARCH_LIMIT);
  if (error) throw error;

  const [relationships, buds] = await Promise.all([
    relationshipsWith(data.map((row) => row.id)),
    withAvatarUrls(supabase, data.map(toBud)),
  ]);
  return buds.map((row) => ({
    ...row,
    relationship: relationships.get(row.id) ?? "none",
  }));
}

/** Where the viewer stands with the user `otherId`. */
export async function relationshipWith(otherId: string): Promise<Relationship> {
  return (await relationshipsWith([otherId])).get(otherId) ?? "none";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function relationshipsWith(candidateIds: string[]) {
  const result = new Map<string, Relationship>();
  // The ids go into a filter string, so only well-formed ones get through.
  const ids = candidateIds.filter((id) => UUID.test(id));
  if (ids.length === 0) return result;
  const { supabase, userId } = await viewer();

  // RLS limits both tables to rows involving the viewer.
  const [requests, friendships] = await Promise.all([
    supabase
      .from("friend_requests")
      .select("sender_id, recipient_id")
      .or(`sender_id.in.(${ids}),recipient_id.in.(${ids})`),
    supabase
      .from("friendships")
      .select("user_a, user_b")
      .or(`user_a.in.(${ids}),user_b.in.(${ids})`),
  ]);
  if (requests.error) throw requests.error;
  if (friendships.error) throw friendships.error;

  if (ids.includes(userId)) result.set(userId, "self");
  for (const r of requests.data) {
    if (r.sender_id === userId) result.set(r.recipient_id, "outgoing");
    else result.set(r.sender_id, "incoming");
  }
  for (const f of friendships.data) {
    result.set(f.user_a === userId ? f.user_b : f.user_a, "friends");
  }
  return result;
}
