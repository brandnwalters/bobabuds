"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";

export type SendMagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; email: string; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Emails a magic link that signs the user in (creating the account on first
 * use). The link lands on /auth/callback, which sets the session.
 */
export async function sendMagicLink(
  _previous: SendMagicLinkState,
  formData: FormData,
): Promise<SendMagicLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", email, message: "Enter a valid email address." };
  }

  const origin = (await headers()).get("origin");
  const callback = new URL("/auth/callback", origin ?? undefined);
  callback.searchParams.set("next", safeNextPath(formData.get("next")));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error) {
    return {
      status: "error",
      email,
      message:
        error.status === 429
          ? "Too many sign-in emails. Wait a minute and try again."
          : "We couldn't send the sign-in link. Try again.",
    };
  }
  return { status: "sent", email };
}

/** Ends the session on this device and returns to sign-in. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}
