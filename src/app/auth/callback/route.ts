import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign-in callback. Accepts either a PKCE `code` (the default magic-link
 * redirect from Supabase Auth) or a `token_hash` + `type` pair (links built
 * from an email template or by the admin API), sets the session cookies and
 * continues to `next`. The proxy then sends new users to onboarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = requestOrigin(request);
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/sign-in?error=link", origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
