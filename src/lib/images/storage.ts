import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Image uploads, server half: store, remove and sign images in a private
 * Storage bucket whose objects live under `<owner id>/` (the bucket's
 * policies check that folder). Pass the signed-in user's Supabase client so
 * row-level security applies. The browser half is `@/lib/images/upload`.
 */

/** Signed URLs are short-lived, so a leaked link stops working soon. */
export const SIGNED_URL_SECONDS = 60 * 60;

/** Uploads `file` into `ownerId`'s folder; returns its path, or null on failure. */
export async function uploadImage(
  supabase: SupabaseClient,
  bucket: string,
  ownerId: string,
  file: Blob,
): Promise<string | null> {
  const extension = file.type === "image/webp" ? "webp" : "jpg";
  const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) {
    console.error(`Image upload to ${bucket} failed`, error);
    return null;
  }
  return path;
}

/**
 * Removes images (best effort: a failure is logged, not thrown, because the
 * row that pointed at them is already gone or changed).
 */
export async function removeImages(
  supabase: SupabaseClient,
  bucket: string,
  paths: (string | null | undefined)[],
) {
  const existing = paths.filter((path): path is string => !!path);
  if (existing.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(existing);
  if (error) console.error(`Removing images from ${bucket} failed`, error);
}

/**
 * Short-lived signed URLs for `paths`, in one request. Paths the viewer can't
 * read (or that are null) map to null.
 */
export async function signedImageUrls(
  supabase: SupabaseClient,
  bucket: string,
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => !!path))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) {
    console.error(`Signing images in ${bucket} failed`, error);
    return urls;
  }
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
