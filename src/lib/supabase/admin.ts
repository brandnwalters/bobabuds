import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabasePublicEnv } from "@/lib/supabase/env";

/**
 * Service-role client that bypasses row-level security. Only the dev-only
 * Dev Bar sign-in route and adding shops (`findOrAddShop`, from details the
 * server looked up) may use it; other app code acts as the signed-in user.
 */
export function createAdminClient() {
  const { url } = supabasePublicEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY. Copy .env.example to .env.local.");
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
