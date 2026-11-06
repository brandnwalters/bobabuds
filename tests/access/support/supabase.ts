import { randomUUID } from "node:crypto";

import { createClient, type User } from "@supabase/supabase-js";
import { inject } from "vitest";

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/** A client with no session: what a signed-out visitor can do. */
export function anonClient() {
  const { url, publishableKey } = inject("supabase");
  return createClient(url, publishableKey, clientOptions);
}

/** Service-role client that bypasses RLS. Use only to arrange fixtures. */
export function adminClient() {
  const { url, secretKey } = inject("supabase");
  return createClient(url, secretKey, clientOptions);
}

/** Signs in as an existing user (e.g. a seeded user) by email and password. */
export async function signInAs(email: string, password: string) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return { client, user: data.user };
}

/**
 * Creates a throwaway confirmed user and returns a client signed in as them.
 * Requests from the client run under row-level security as that user.
 */
export async function signInAsNewUser(): Promise<{
  client: ReturnType<typeof anonClient>;
  user: User;
}> {
  const email = `test-${randomUUID()}@bobabuds.test`;
  const password = randomUUID();
  const { error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return signInAs(email, password);
}
