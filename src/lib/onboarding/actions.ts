"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { removeImages } from "@/lib/images/storage";
import { saveAvatar } from "@/lib/profiles/avatar-upload";
import { AVATARS_BUCKET } from "@/lib/profiles/avatars";
import {
  displayNameProblem,
  usernameProblem,
} from "@/lib/profiles/validation";
import { createClient } from "@/lib/supabase/server";

export type UsernameCheck =
  | { status: "invalid"; message: string }
  | { status: "taken"; message: string }
  | { status: "available"; message: string };

/** Is `username` well-formed and free (ignoring case)? */
export async function checkUsername(username: string): Promise<UsernameCheck> {
  const problem = usernameProblem(username);
  if (problem) return { status: "invalid", message: problem };

  const supabase = await createClient();
  const { data: available, error } = await supabase.rpc("username_available", {
    candidate: username,
  });
  if (error) throw error;
  return available
    ? { status: "available", message: `@${username} is available!` }
    : { status: "taken", message: `@${username} is taken.` };
}

export type CreateProfileState = {
  username: string;
  displayName: string;
  errors: { username?: string; displayName?: string; avatar?: string; form?: string };
};

/**
 * Finishes onboarding: creates the signed-in user's profile (with an optional
 * avatar), then opens the Feed.
 */
export async function createProfile(
  _previous: CreateProfileState,
  formData: FormData,
): Promise<CreateProfileState> {
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const state: CreateProfileState = { username, displayName, errors: {} };

  const usernameError = usernameProblem(username);
  const displayNameError = displayNameProblem(displayName);
  if (usernameError || displayNameError) {
    return {
      ...state,
      errors: {
        username: usernameError ?? undefined,
        displayName: displayNameError ?? undefined,
      },
    };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/sign-in");

  const avatar = await saveAvatar(supabase, userId, formData);
  if (avatar.error) return { ...state, errors: { avatar: avatar.error } };

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    username,
    display_name: displayName,
    avatar_path: avatar.avatarPath ?? null,
  });
  // The upload is orphaned if the profile wasn't created.
  if (error) await removeImages(supabase, AVATARS_BUCKET, [avatar.avatarPath]);

  if (error?.code === "23505") {
    // Unique violation: either the username went or the profile already exists.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!existing) {
      return { ...state, errors: { username: `@${username} is taken.` } };
    }
  } else if (error) {
    return {
      ...state,
      errors: { form: "We couldn't save your profile. Try again." },
    };
  }

  // The root layout (Dev Bar) still shows "no profile" until it re-renders.
  revalidatePath("/", "layout");
  redirect("/");
}
