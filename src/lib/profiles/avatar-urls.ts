import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { signedImageUrls } from "@/lib/images/storage";
import { AVATARS_BUCKET } from "@/lib/profiles/avatars";

/**
 * Short-lived signed URLs for avatar paths, in one request (path -> URL).
 * Pass the viewer's client; any signed-in user may read avatars.
 */
export function signedAvatarUrls(
  supabase: SupabaseClient,
  paths: (string | null)[],
): Promise<Map<string, string>> {
  return signedImageUrls(supabase, AVATARS_BUCKET, paths);
}

/** Adds `avatarUrl` (signed, or null without an avatar) to each person. */
export async function withAvatarUrls<T extends { avatarPath: string | null }>(
  supabase: SupabaseClient,
  people: T[],
): Promise<(T & { avatarUrl: string | null })[]> {
  const urls = await signedAvatarUrls(
    supabase,
    people.map((person) => person.avatarPath),
  );
  return people.map((person) => ({
    ...person,
    avatarUrl: (person.avatarPath && urls.get(person.avatarPath)) || null,
  }));
}
