import { expect, test } from "@playwright/test";

import { adminClient, newUsername, signInAsNewUser } from "./support/supabase";

test("a signed-in user without a username is sent back to setup", async ({
  page,
}) => {
  await signInAsNewUser(page, { profile: false });

  await page.goto("/friends");

  await expect(page).toHaveURL(/\/onboarding$/);
});

test("setup checks the username live and creates the profile", async ({
  page,
}) => {
  const taken = newUsername("Taken");
  const { data: other } = await adminClient().auth.admin.createUser({
    email: `${taken}@bobabuds.test`,
    email_confirm: true,
  });
  await adminClient()
    .from("profiles")
    .insert({ id: other.user!.id, username: taken, display_name: "Other" });

  await signInAsNewUser(page, { profile: false });
  await page.goto("/onboarding");
  const username = page.getByLabel("Username");
  const status = page.getByTestId("username-status");

  await username.fill("ab");
  await expect(status).toHaveText("Usernames are 3 to 20 characters.");

  await username.fill("boba fan!");
  await expect(status).toHaveText(
    "Use only letters, numbers and underscores.",
  );

  await username.fill(taken.toLowerCase());
  await expect(status).toHaveText(`@${taken.toLowerCase()} is taken.`);

  const mine = newUsername("Mine");
  await username.fill(mine);
  await expect(status).toHaveText(`@${mine} is available!`);

  await page.getByLabel("Display name").fill("Milk Tea Fan");
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Feed" }),
  ).toBeVisible();
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/$/);
});
