"use server";

import { refresh } from "next/cache";

import { createClient, getViewerId } from "@/lib/supabase/server";

export type CheersState = { count: number; viewerCheered: boolean };

/**
 * Cheers (`cheered = true`) or un-cheers the Log as the signed-in user, then
 * returns the Log's Cheers count and whether the viewer has cheered. Row-level
 * security allows this only on Logs the viewer can see. Already cheered /
 * already removed is not an error. Returns null if the Log can't be cheered
 * (not visible, deleted, signed out).
 */
export async function setCheers(
  logId: string,
  cheered: boolean,
): Promise<CheersState | null> {
  const supabase = await createClient();
  const viewerId = await getViewerId(supabase);
  if (!viewerId) return null;

  if (cheered) {
    const { error } = await supabase.from("cheers").insert({ log_id: logId });
    // 23505: already cheered (a double tap or another tab).
    if (error && error.code !== "23505") return null;
  } else {
    const { error } = await supabase
      .from("cheers")
      .delete()
      .eq("log_id", logId)
      .eq("user_id", viewerId);
    if (error) return null;
  }

  const { data, error } = await supabase
    .from("cheers")
    .select("user_id")
    .eq("log_id", logId);
  if (error) return null;

  // Lets server-rendered parts of the page (e.g. "Cheered by") catch up.
  refresh();
  return {
    count: data.length,
    viewerCheered: data.some((row) => row.user_id === viewerId),
  };
}
