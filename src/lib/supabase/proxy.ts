import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { requestOrigin } from "@/lib/request-origin";
import { supabasePublicEnv } from "@/lib/supabase/env";

/** Pages a signed-out visitor may open. Everything else needs a session. */
const PUBLIC_PATHS = ["/sign-in", "/auth/"];
const ONBOARDING_PATH = "/onboarding";

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Refreshes the Supabase session cookies and routes the request:
 * signed-out visitors go to sign-in, signed-in users without a profile go to
 * onboarding, and finished users are kept out of sign-in and onboarding.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabasePublicEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Don't run code between createServerClient and getClaims(): it refreshes
  // the session and must see the request cookies first.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const target = new URL(path, requestOrigin(request));
    if (path === "/sign-in" && pathname !== "/") {
      target.searchParams.set("next", pathname + search);
    }
    const redirect = NextResponse.redirect(target);
    // Keep any refreshed session cookies on the redirect.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (!userId) {
    return isPublic(pathname) ? response : redirectTo("/sign-in");
  }

  if (pathname.startsWith("/auth/")) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return pathname === ONBOARDING_PATH ? response : redirectTo(ONBOARDING_PATH);
  }
  if (pathname === ONBOARDING_PATH || pathname === "/sign-in") {
    return redirectTo("/");
  }
  return response;
}
