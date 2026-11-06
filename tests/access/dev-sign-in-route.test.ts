import { NextRequest } from "next/server";
import { afterEach, describe, expect, inject, test, vi } from "vitest";

import { GET } from "@/app/auth/dev-sign-in/route";

import { adminClient } from "./support/supabase";

// The Playwright suite runs with DEV_TOOLS=true, so the "off" behaviour of the
// dev sign-in route is checked here by calling its handler directly.
function devSignIn(query: string) {
  return GET(new NextRequest(`http://127.0.0.1:3000/auth/dev-sign-in?${query}`));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dev sign-in route", () => {
  test.each([undefined, "", "false", "1"])(
    "is 404 when DEV_TOOLS is %j",
    async (value) => {
      vi.stubEnv("DEV_TOOLS", value);

      const response = await devSignIn("as=mia");

      expect(response.status).toBe(404);
      expect(response.headers.get("set-cookie")).toBeNull();
    },
  );

  test("refuses anyone who isn't a seeded user", async () => {
    vi.stubEnv("DEV_TOOLS", "true");

    for (const as of ["", "nobody", "test_user", "mia@seed.bobabuds.test"]) {
      const response = await devSignIn(new URLSearchParams({ as }).toString());

      expect(response.status).toBe(403);
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });

  test("as=new creates a fresh seeded account without a profile and signs in as it", async () => {
    const { url, publishableKey, secretKey } = inject("supabase");
    vi.stubEnv("DEV_TOOLS", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);
    vi.stubEnv("SUPABASE_SECRET_KEY", secretKey);

    const first = await devSignIn("as=new");
    const second = await devSignIn("as=new");

    for (const response of [first, second]) {
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe(
        "/onboarding",
      );
      expect(response.headers.get("set-cookie")).toContain("auth-token");
    }
    const ids = [first, second].map(sessionUserId);
    expect(ids[0]).not.toBe(ids[1]);
    for (const id of ids) {
      const { data } = await adminClient().auth.admin.getUserById(id);
      expect(data.user?.app_metadata.seeded).toBe(true);
      expect(data.user?.email).toMatch(/@seed\.bobabuds\.test$/);
      const { data: profile } = await adminClient()
        .from("profiles")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      expect(profile).toBeNull();
    }
  });
});

/** The user id in the session cookie the route set. */
function sessionUserId(response: Response) {
  const cookie = response.headers
    .getSetCookie()
    .find((c) => c.includes("auth-token"))!;
  const value = decodeURIComponent(cookie.split(";")[0].split("=").slice(1).join("="));
  const json = value.startsWith("base64-")
    ? Buffer.from(value.slice("base64-".length), "base64url").toString("utf8")
    : value;
  return (JSON.parse(json) as { user: { id: string } }).user.id;
}
