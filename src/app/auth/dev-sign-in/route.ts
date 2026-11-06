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
  type SeededUsername,
} from "@/lib/dev/seed-users";
import { requestOrigin } from "@/lib/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabasePublicEnv } from "@/lib/supabase/env";

const notFound = () => new NextResponse("Not Found", { status: 404 });

/**
 * Dev-only sign-in: `GET /auth/dev-sign-in?as=<seeded username>&next=<path>`.
 * Uses the service-role key to mint a magic-link token for a seeded user,
 * verifies it here and sets the session cookies, so the browser holds a real
 * session for that user. 404 unless `DEV_TOOLS=true`; 403 for anyone who
 * isn't a seeded user in this database (and nobody is created then).
 * Creating a new user is `POST ?as=new` (see below), so link prefetching and
 * crawlers can't create accounts. Lives under /auth/ so the proxy lets it
 * through.
 */
export async function GET(request: NextRequest) {
  if (!devToolsEnabled()) return notFound();

  const { searchParams } = request.nextUrl;
  if (searchParams.get("as") === NEW_DEV_USER) {
    return new NextResponse("Use POST to create a new user.", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }
  const user = findSeededUser(searchParams.get("as"));
  if (!user) {
    return new NextResponse("Only seeded users can be signed in here.", {
      status: 403,
    });
  }

  const email = await seededUserEmail(user.username);
  if (!email) {
    return new NextResponse(
      `@${user.username} isn't a seeded user in this database. Run pnpm seed.`,
      { status: 403 },
    );
  }
  const next = safeNextPath(searchParams.get("next"));
  const { response, supabase } = redirectWithSession(request, next);
  if (!(await signInWithAdminLink(supabase, email))) {
    return new NextResponse(`Could not sign in as @${user.username}.`, {
      status: 500,
    });
  }
  return response;
}

/**
 * `POST /auth/dev-sign-in?as=new` (the Dev Bar's "New user"): creates a
 * fresh seeded account with no profile, signs in as it and lands on
 * onboarding.
 */
export async function POST(request: NextRequest) {
  if (!devToolsEnabled()) return notFound();
  if (request.nextUrl.searchParams.get("as") !== NEW_DEV_USER) {
    return new NextResponse("Only ?as=new can be POSTed.", { status: 400 });
  }

  const email = newDevUserEmail();
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { seeded: true },
  });
  if (error) {
    return new NextResponse("Could not create a new user.", { status: 500 });
  }
  // 303 so the browser follows up with a GET, not another POST.
  const { response, supabase } = redirectWithSession(request, "/onboarding", 303);
  if (!(await signInWithAdminLink(supabase, email))) {
    return new NextResponse("Could not sign in as the new user.", {
      status: 500,
    });
  }
  return response;
}

/**
 * The email of the seeded user with this username, if this database has
 * them: a profile whose auth user has that email and the seed's marker.
 * Checked before minting a link, because generateLink creates missing users.
 */
async function seededUserEmail(username: SeededUsername): Promise<string | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;
  const { data } = await admin.auth.admin.getUserById(profile.id);
  const email = seededEmail(username);
  return data.user?.app_metadata.seeded === true && data.user.email === email
    ? email
    : null;
}

/**
 * A redirect to `next` plus a Supabase client that writes its session
 * cookies onto that redirect.
 */
function redirectWithSession(request: NextRequest, next: string, status = 307) {
  const response = NextResponse.redirect(
    new URL(next, requestOrigin(request)),
    status,
  );
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
 * Mints a magic-link token for an existing user with the service-role key
 * and verifies it on `supabase`, which sets that client's session cookies. A
 * user holds only one live token, so a parallel sign-in as the same user can
 * invalidate ours before we verify it; retry a few times when that happens.
 */
async function signInWithAdminLink(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) return false;

    const { error } = await supabase.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (!error) return true;
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 200));
  }
  return false;
}
