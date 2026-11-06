import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { uploadImage } from "@/lib/images/storage";
import { readImageChoice } from "@/lib/images/upload";
import { AVATAR_FIELD, AVATARS_BUCKET } from "@/lib/profiles/avatars";

/**
 * Reads the form's avatar field and uploads a new avatar into the user's
 * folder. `avatarPath` is the column value to save: a new path, null to
 * remove the avatar, or undefined to leave it alone.
 */
export async function saveAvatar(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData,
): Promise<{ avatarPath?: string | null; error?: string }> {
  const choice = readImageChoice(formData, AVATAR_FIELD);
  switch (choice.status) {
    case "invalid":
      return { error: choice.error };
    case "unchanged":
      return {};
    case "removed":
      return { avatarPath: null };
    case "new": {
      const path = await uploadImage(supabase, AVATARS_BUCKET, userId, choice.file);
      return path
        ? { avatarPath: path }
        : { error: "We couldn't upload your avatar. Try again." };
    }
  }
}
