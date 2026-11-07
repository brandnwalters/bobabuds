import type { Page } from "@playwright/test";

import type { SeededUsername } from "@/lib/dev/seed-users";

/**
 * Signs the browser in as a seeded user through the app's dev-only sign-in
 * route (needs `DEV_TOOLS=true` and `pnpm seed`). Talks only to the app, so it
 * also works against a preview deployment (`E2E_BASE_URL`). Lands on `next`.
 */
export async function signInAs(
  page: Page,
  username: SeededUsername,
  { next = "/" }: { next?: string } = {},
) {
  const params = new URLSearchParams({ as: username, next });
  await page.goto(`/auth/dev-sign-in?${params}`);
}
