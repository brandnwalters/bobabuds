import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import { GET } from "@/app/auth/dev-sign-in/route";

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
});
