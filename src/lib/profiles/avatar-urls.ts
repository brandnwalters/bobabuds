import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { signedImageUrls, signedUrlFor } from "@/lib/images/storage";
import { AVATARS_BUCKET } from "@/lib/profiles/avatars";

/**
 * Adds `avatarUrl` (signed, or null without an avatar) to each person, in
 * one signing request. Pass the viewer's client; any signed-in user may read
 * avatars.
 */
export async function withAvatarUrls<T extends { avatarPath: string | null }>(
  supabase: SupabaseClient,
  people: T[],
): Promise<(T & { avatarUrl: string | null })[]> {
  const urls = await signedImageUrls(
    supabase,
    AVATARS_BUCKET,
    people.map((person) => person.avatarPath),
  );
  return people.map((person) => ({
    ...person,
    avatarUrl: signedUrlFor(urls, person.avatarPath),
  }));
}
