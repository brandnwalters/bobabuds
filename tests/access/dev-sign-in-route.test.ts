import { NextRequest } from "next/server";
import { afterEach, describe, expect, inject, test, vi } from "vitest";

import { GET, POST } from "@/app/auth/dev-sign-in/route";

import { adminClient } from "./support/supabase";

// A username the app treats as seeded but that `pnpm seed` never created, as
// when the code's list is ahead of the database.
const GHOST = vi.hoisted(() => `ghost_${Math.random().toString(36).slice(2, 10)}`);

vi.mock("@/lib/dev/seed-users", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/dev/seed-users")>();
  const users = [
    ...original.SEEDED_USERS,
    { username: GHOST, displayName: "Ghost", relation: "not in the database" },
  ];
  return {
    ...original,
    SEEDED_USERS: users,
    findSeededUser: (username: unknown) =>
      users.find((user) => user.username === username),
  };
});

// The Playwright suite runs with DEV_TOOLS=true, so the "off" behaviour of the
// dev sign-in route is checked here by calling its handler directly.
function devSignIn(query: string, method: "GET" | "POST" = "GET") {
  const request = new NextRequest(
    `http://127.0.0.1:3000/auth/dev-sign-in?${query}`,
    { method },
  );
  return method === "GET" ? GET(request) : POST(request);
}

function useLocalSupabase() {
  const { url, publishableKey, secretKey } = inject("supabase");
  vi.stubEnv("DEV_TOOLS", "true");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);
  vi.stubEnv("SUPABASE_SECRET_KEY", secretKey);
}

/** How many auth users exist. */
async function userCount() {
  const { data, error } = await adminClient().auth.admin.listUsers({
    perPage: 1,
  });
  if (error) throw error;
  return (data as { total: number }).total;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dev sign-in route", () => {
  test.each([undefined, "", "false", "1"])(
    "is 404 when DEV_TOOLS is %j",
    async (value) => {
      vi.stubEnv("DEV_TOOLS", value);

      for (const response of [
        await devSignIn("as=mia"),
        await devSignIn("as=new", "POST"),
      ]) {
        expect(response.status).toBe(404);
        expect(response.headers.get("set-cookie")).toBeNull();
      }
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

  test("refuses a listed seeded user the database doesn't have, without creating them", async () => {
    useLocalSupabase();
    const before = await userCount();

    const response = await devSignIn(`as=${GHOST}`);

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await userCount()).toBe(before);
  });

  test("a GET for as=new creates no account", async () => {
    useLocalSupabase();
    const before = await userCount();

    const response = await devSignIn("as=new");

    expect(response.status).toBe(405);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await userCount()).toBe(before);
  });

  test("POSTing as=new creates a fresh seeded account without a profile and signs in as it", async () => {
    useLocalSupabase();

    const first = await devSignIn("as=new", "POST");
    const second = await devSignIn("as=new", "POST");

    for (const response of [first, second]) {
      // 303, so the browser follows the redirect with a GET.
      expect(response.status).toBe(303);
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

  test("signs a seeded user in", async () => {
    useLocalSupabase();

    const response = await devSignIn("as=mia&next=/friends");

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/friends");
    const { data } = await adminClient().auth.admin.getUserById(
      sessionUserId(response),
    );
    expect(data.user?.email).toBe("mia@seed.bobabuds.test");
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
