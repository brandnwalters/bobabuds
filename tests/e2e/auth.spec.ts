import { expect, test } from "@playwright/test";

import { magicLinkFor, newEmail, signInAsNewUser } from "./support/supabase";

test("a signed-in user can sign out", async ({ page }) => {
  await signInAsNewUser(page);
  await page.goto("/profile");

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("a signed-out visitor is sent to sign-in", async ({ page }) => {
  await page.goto("/friends");

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible();
});

test("a new visitor signs up with an emailed magic link and lands on setup", async ({
  page,
}) => {
  const email = newEmail();
  await page.goto("/sign-in");

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  await page.goto(await magicLinkFor(email));

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Set up your profile" }),
  ).toBeVisible();
});
