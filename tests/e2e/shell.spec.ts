import { expect, test } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";

const tabs = [
  { name: "Feed", path: "/", heading: "Feed" },
  { name: "Log", path: "/log", heading: "Log a drink" },
  { name: "Friends", path: "/friends", heading: "Friends" },
  { name: "Profile", path: "/profile", heading: "Sam Rivera" },
];

test.beforeEach(async ({ page }) => {
  await signInAs(page, "sam");
});

test("the app shell loads with the Boba Buds tab bar", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Boba Buds" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  for (const tab of tabs) {
    await expect(nav.getByRole("link", { name: tab.name })).toBeVisible();
  }
});

test("each tab opens its screen and is marked current", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });

  for (const tab of tabs) {
    await nav.getByRole("link", { name: tab.name }).click();
    await expect(page).toHaveURL(tab.path);
    await expect(
      page.getByRole("heading", { level: 1, name: tab.heading }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: tab.name })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});
