import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { devToolsEnabled } from "@/lib/dev/dev-tools";
import {
  findSeededUser,
  NEW_DEV_USER,
  newDevUserEmail,
  seededEmail,
} from "@/lib/dev/seed-users";
import { requestOrigin } from "@/lib/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabasePublicEnv } from "@/lib/supabase/env";

/**
 * Dev-only sign-in: `/auth/dev-sign-in?as=<seeded username>&next=<path>`.
 * Uses the service-role key to mint a magic-link token for a seeded user,
 * verifies it here and sets the session cookies, so the browser holds a real
 * session for that user. 404 unless `DEV_TOOLS=true`; 403 for anyone who
 * isn't a seeded user. `?as=new` instead creates a fresh seeded account (no
 * profile yet), signs in as it and lands on onboarding. Lives under /auth/
 * so the proxy lets it through.
 */
export async function GET(request: NextRequest) {
  if (!devToolsEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  if (searchParams.get("as") === NEW_DEV_USER) {
    return signInAsNewUser(request);
  }
  const user = findSeededUser(searchParams.get("as"));
  if (!user) {
    return new NextResponse("Only seeded users can be signed in here.", {
      status: 403,
    });
  }

  const next = safeNextPath(searchParams.get("next"));
  const { response, supabase } = redirectWithSession(request, next);
  const signedIn = await signInWithAdminLink(supabase, seededEmail(user.username));
  if (signedIn === "not-seeded") {
    return new NextResponse(
      `@${user.username} isn't a seeded user in this database. Run pnpm seed.`,
      { status: 403 },
    );
  }
  if (signedIn === "failed") {
    return new NextResponse(`Could not sign in as @${user.username}.`, {
      status: 500,
    });
  }
  return response;
}

/** Creates a fresh seeded account with no profile and signs in as it. */
async function signInAsNewUser(request: NextRequest) {
  const email = newDevUserEmail();
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { seeded: true },
  });
  if (error) {
    return new NextResponse("Could not create a new user.", { status: 500 });
  }
  const { response, supabase } = redirectWithSession(request, "/onboarding");
  if ((await signInWithAdminLink(supabase, email)) !== "ok") {
    return new NextResponse("Could not sign in as the new user.", {
      status: 500,
    });
  }
  return response;
}

/**
 * A redirect to `next` plus a Supabase client that writes its session
 * cookies onto that redirect.
 */
function redirectWithSession(request: NextRequest, next: string) {
  const response = NextResponse.redirect(new URL(next, requestOrigin(request)));
  const { url, publishableKey } = supabasePublicEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  return { response, supabase };
}

/**
 * Mints a magic-link token with the service-role key and verifies it on
 * `supabase`, which sets that client's session cookies. A user holds only one
 * live token, so a parallel sign-in as the same user can invalidate ours
 * before we verify it; retry a few times when that happens.
 */
async function signInWithAdminLink(
  supabase: SupabaseClient,
  email: string,
): Promise<"ok" | "not-seeded" | "failed"> {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) return "failed";
    // generateLink creates a missing user, so also require the seed's marker.
    if (link.user.app_metadata.seeded !== true) return "not-seeded";

    const { error } = await supabase.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (!error) return "ok";
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 200));
  }
  return "failed";
}
