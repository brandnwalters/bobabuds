import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabasePublicEnv } from "@/lib/supabase/env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers,
 * acting as the signed-in user from the request cookies, so row-level
 * security applies. Create a new one per request.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabasePublicEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh belongs in the proxy (src/proxy.ts) instead.
        }
      },
    },
  });
}
