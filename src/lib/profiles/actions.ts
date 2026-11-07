"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { removeImages, saveImageChoice } from "@/lib/images/storage";
import { AVATAR_UPLOAD, AVATARS_BUCKET } from "@/lib/profiles/avatars";
import { displayNameProblem } from "@/lib/profiles/validation";
import { createClient, getViewerId } from "@/lib/supabase/server";

export type EditProfileState = {
  displayName: string;
  errors: { displayName?: string; avatar?: string; form?: string };
};

/**
 * Saves the signed-in user's display name and avatar, then opens their
 * Profile. A replaced or removed avatar is deleted from Storage.
 */
export async function updateProfile(
  _previous: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const state: EditProfileState = { displayName, errors: {} };
  const problem = displayNameProblem(displayName);
  if (problem) return { ...state, errors: { displayName: problem } };

  const supabase = await createClient();
  const userId = await getViewerId(supabase);
  if (!userId) redirect("/sign-in?next=/profile/edit");

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle<{ avatar_path: string | null }>();
  if (readError || !current) {
    return { ...state, errors: { form: "We couldn't save your profile. Try again." } };
  }

  const avatar = await saveImageChoice(supabase, {
    ...AVATAR_UPLOAD,
    ownerId: userId,
    formData,
  });
  if (avatar.error) return { ...state, errors: { avatar: avatar.error } };
  const avatarChanged = avatar.path !== undefined;

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      ...(avatarChanged ? { avatar_path: avatar.path } : {}),
    })
    .eq("id", userId)
    .select("id");
  if (error || updated.length === 0) {
    await removeImages(supabase, AVATARS_BUCKET, [avatar.path]);
    return { ...state, errors: { form: "We couldn't save your profile. Try again." } };
  }
  if (avatarChanged) {
    await removeImages(supabase, AVATARS_BUCKET, [current.avatar_path]);
  }

  // The name and avatar show on every screen, so drop all cached pages.
  revalidatePath("/", "layout");
  redirect("/profile");
}
