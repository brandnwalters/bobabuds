import { createBrowserClient } from "@supabase/ssr";

import { supabasePublicEnv } from "@/lib/supabase/env";

/** Supabase client for Client Components, acting as the signed-in user. */
export function createClient() {
  const { url, publishableKey } = supabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}
