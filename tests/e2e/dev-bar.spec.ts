import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";

function devBar(page: Page) {
  return page.getByRole("complementary", { name: "Dev Bar" });
}

/** The Dev Bar's toggle, which names the signed-in user. */
function devBarToggle(page: Page) {
  return devBar(page).locator("summary");
}

/** Opens the Dev Bar and picks a seeded user by username. */
async function switchTo(page: Page, username: string) {
  await devBarToggle(page).click();
  await devBar(page)
    .getByRole("navigation", { name: "Dev Bar users" })
    .getByRole("link", { name: new RegExp(`@${username}\\b`) })
    .click();
}

test("signing in through the dev route makes you that seeded user", async ({
  page,
}) => {
  await signInAs(page, "mia");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Feed" }),
  ).toBeVisible();
  await expect(devBarToggle(page)).toHaveText("Dev Bar: @mia");
});

test("choosing a user in the Dev Bar switches who you are signed in as", async ({
  page,
}) => {
  await signInAs(page, "mia", { next: "/friends" });
  await expect(devBarToggle(page)).toHaveText("Dev Bar: @mia");

  await switchTo(page, "jordan");

  await expect(page).toHaveURL(/\/$/);
  await expect(devBarToggle(page)).toHaveText("Dev Bar: @jordan");
  await page.goto("/profile");
  await expect(devBarToggle(page)).toHaveText("Dev Bar: @jordan");
});

test("a signed-out visitor can sign in from the Dev Bar", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(devBarToggle(page)).toHaveText("Dev Bar: signed out");

  await switchTo(page, "casey");

  await expect(
    page.getByRole("heading", { level: 1, name: "Feed" }),
  ).toBeVisible();
  await expect(devBarToggle(page)).toHaveText("Dev Bar: @casey");
});
