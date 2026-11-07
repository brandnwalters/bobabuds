import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * These helpers read keys from the local Supabase stack, so tests using them
 * can't run against a deployed app. Use `test.skip(...LOCAL_ONLY)` in them.
 * Prefer `signInAs` (./dev-sign-in) with a seeded user where possible.
 */
export const LOCAL_ONLY = [
  !!process.env.E2E_BASE_URL,
  "needs the local Supabase stack (not available with E2E_BASE_URL)",
] as const;

type LocalSupabase = { url: string; secretKey: string; mailpitUrl: string };

let cached: LocalSupabase | undefined;

/** Local Supabase URLs and keys, read once from `supabase status`. */
function localSupabase(): LocalSupabase {
  if (cached) return cached;
  const raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const status = JSON.parse(raw) as Record<string, string>;
  cached = {
    url: status.API_URL,
    secretKey: status.SECRET_KEY,
    mailpitUrl: status.MAILPIT_URL,
  };
  return cached;
}

/** Service-role client that bypasses RLS. Use only to arrange fixtures. */
export function adminClient() {
  const { url, secretKey } = localSupabase();
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A fresh email address that no account uses yet. */
export function newEmail() {
  return `e2e-${randomUUID()}@bobabuds.test`;
}

/** A valid username nobody has taken yet. */
export function newUsername(prefix = "bud") {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

/**
 * Waits for the newest sign-in email to `email` in the local Mailpit and
 * returns the magic link inside it.
 */
export async function magicLinkFor(email: string): Promise<string> {
  const { mailpitUrl } = localSupabase();
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const search = await fetch(
      `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    );
    const { messages } = (await search.json()) as {
      messages: { ID: string }[];
    };
    if (messages.length > 0) {
      const message = await fetch(`${mailpitUrl}/api/v1/message/${messages[0].ID}`);
      const { HTML } = (await message.json()) as { HTML: string };
      const href = HTML.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1];
      if (!href) throw new Error(`No magic link in the email to ${email}`);
      return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No sign-in email arrived for ${email}`);
}

/**
 * Creates a confirmed user (optionally with a finished profile) and signs the
 * browser in as them through the app's sign-in callback, skipping the email.
 */
export async function signInAsNewUser(
  page: Page,
  { profile = true }: { profile?: boolean } = {},
) {
  const admin = adminClient();
  const email = newEmail();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;

  const username = newUsername();
  if (profile) {
    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      username,
      display_name: "Test Bud",
    });
    if (profileError) throw profileError;
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;

  await page.goto(
    `/auth/callback?token_hash=${link.properties.hashed_token}&type=magiclink`,
  );
  return { email, username, userId: created.user.id };
}
