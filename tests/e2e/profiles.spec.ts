import path from "node:path";

import { type Browser, expect, type Page, test } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";
import {
  adminClient,
  LOCAL_ONLY,
  newUsername,
  signInAsNewUser,
} from "./support/supabase";

const PHOTO = path.resolve("tests/e2e/fixtures/drink-photo.jpg");

/** The visible file input labelled `name` (Next keeps hidden copies of old pages). */
function fileInput(page: Page, name: string) {
  return page.getByLabel(name, { exact: true }).filter({ visible: true });
}

function stats(page: Page) {
  return page.getByRole("region", { name: "Boba stats" });
}

/** A second, separate browser session signed in as a fresh user. */
async function newBudSession(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const bud = await signInAsNewUser(page);
  return { ...bud, page, close: () => context.close() };
}

test("a friend's Profile shows their stats and Logs", async ({ page }) => {
  await signInAs(page, "mia", { next: "/u/jordan" });

  await expect(page.getByRole("heading", { level: 1, name: "Jordan Lee" })).toBeVisible();
  await expect(page.getByRole("main").getByText("@jordan", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Friends" })).toBeVisible();
  await expect(stats(page)).toBeVisible();
  await expect(stats(page).getByTestId("stat-logs")).toHaveText(/^\d+$/);
  const logs = page.getByRole("list", { name: "Jordan Lee's Logs" });
  await expect(logs.getByRole("link", { name: /Hojicha Latte/ })).toBeVisible();
});

test("a stranger's Profile shows only the name, avatar and Add friend", async ({
  page,
}) => {
  await signInAs(page, "mia", { next: "/u/casey" });

  await expect(page.getByRole("heading", { level: 1, name: "Casey Nguyen" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Casey Nguyen's avatar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add friend" })).toBeVisible();
  await expect(stats(page)).toHaveCount(0);
  await expect(page.getByRole("list", { name: /Logs/ })).toHaveCount(0);
  await expect(page.getByText("Okinawa Milk Tea")).toHaveCount(0);
});

test("the relationship button matches pending requests", async ({ page }) => {
  await signInAs(page, "mia", { next: "/u/alex" });
  await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();

  await page.goto("/u/taylor");
  await expect(page.getByRole("button", { name: "Requested" })).toBeDisabled();
  // taylor is the seeded user without an avatar: initials instead.
  await expect(page.getByRole("img", { name: "Taylor Brooks's avatar" })).toHaveText("TB");
  await expect(page.getByRole("button", { name: "Cancel request" })).toBeVisible();
});

test("your own Profile shows your stats, avatar and an edit link", async ({ page }) => {
  await signInAs(page, "mia", { next: "/profile" });

  await expect(page.getByRole("heading", { level: 1, name: "Mia Chen" })).toBeVisible();
  // Seeded with an avatar picture.
  const avatar = page.getByRole("img", { name: "Mia Chen's avatar" });
  await expect(avatar).toHaveJSProperty("tagName", "IMG");
  await expect
    .poll(() => avatar.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
    .toBeGreaterThan(0);
  await expect(stats(page)).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test.describe("with throwaway users", () => {
  test.skip(...LOCAL_ONLY);

  test("stats count Logs, pick the top shop and average the ratings", async ({
    page,
    browser,
  }) => {
    const author = await newBudSession(browser);
    const admin = adminClient();
    const { data: shops } = await admin
      .from("shops")
      .select("id, name")
      .in("name", ["Moge Tee", "Wheat"]);
    const shopId = (name: string) => shops!.find((shop) => shop.name === name)!.id;
    const { error } = await admin.from("logs").insert([
      { author_id: author.userId, shop_id: shopId("Wheat"), drink_name: "Stat Tea A", rating: 3, drank_on: "2026-10-01" },
      { author_id: author.userId, shop_id: shopId("Moge Tee"), drink_name: "Stat Tea B", rating: 4, drank_on: "2026-10-02" },
      { author_id: author.userId, shop_id: shopId("Moge Tee"), drink_name: "Stat Tea C", rating: 4.5, drank_on: "2026-10-03" },
    ]);
    expect(error).toBeNull();

    // The author sees their own stats.
    await author.page.goto("/profile");
    await expect(stats(author.page).getByTestId("stat-logs")).toHaveText("3");
    await expect(stats(author.page).getByTestId("stat-top-shop")).toHaveText("Moge Tee");
    await expect(stats(author.page).getByTestId("stat-average")).toHaveText("3.8");

    // A stranger finds them, sends a request and sees nothing more yet.
    const viewer = await signInAsNewUser(page);
    await page.goto(`/u/${author.username}`);
    await expect(stats(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Add friend" }).click();
    await expect(page.getByRole("button", { name: "Requested" })).toBeDisabled();

    // The author accepts from the viewer's Profile; now both see the full view.
    await author.page.goto(`/u/${viewer.username}`);
    await author.page.getByRole("button", { name: "Accept" }).click();
    await expect(author.page.getByRole("button", { name: "Friends" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Friends" })).toBeVisible();
    await expect(stats(page).getByTestId("stat-logs")).toHaveText("3");
    await expect(stats(page).getByTestId("stat-top-shop")).toHaveText("Moge Tee");
    await expect(stats(page).getByTestId("stat-average")).toHaveText("3.8");
    const logs = page.getByRole("list", { name: "Test Bud's Logs" });
    await expect(logs.getByRole("link")).toHaveCount(3);
    await author.close();
  });

  test("edit your display name and avatar; without one you get initials", async ({
    page,
  }) => {
    await signInAsNewUser(page);
    await page.goto("/profile");
    await expect(page.getByRole("img", { name: "Test Bud's avatar" })).toHaveText("TB");

    await page.getByRole("link", { name: "Edit profile" }).click();
    await page.getByRole("textbox", { name: "Display name" }).fill("Tapioca Tester");
    await fileInput(page, "Add avatar").setInputFiles(PHOTO);
    await expect(page.getByRole("img", { name: "Avatar preview" })).toBeVisible();
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tapioca Tester" })).toBeVisible();
    const avatar = page.getByRole("img", { name: "Tapioca Tester's avatar" });
    await expect(avatar).toHaveJSProperty("tagName", "IMG");
    await expect
      .poll(() => avatar.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
      .toBeGreaterThan(0);

    await page.getByRole("link", { name: "Edit profile" }).click();
    await page.getByRole("button", { name: "Remove avatar" }).click();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("img", { name: "Tapioca Tester's avatar" })).toHaveText("TT");
  });

  test("setup takes an optional avatar", async ({ page }) => {
    await signInAsNewUser(page, { profile: false });
    await page.goto("/onboarding");
    const username = newUsername("Ava");
    await page.getByLabel("Username").fill(username);
    await expect(page.getByTestId("username-status")).toHaveText(`@${username} is available!`);
    await page.getByLabel("Display name").fill("Ava Tar");
    await fileInput(page, "Add avatar").setInputFiles(PHOTO);
    await expect(page.getByRole("img", { name: "Avatar preview" })).toBeVisible();
    await page.getByRole("button", { name: "Finish setup" }).click();

    await expect(page).toHaveURL(/\/$/);
    await page.goto("/profile");
    await expect(page.getByRole("img", { name: "Ava Tar's avatar" })).toHaveJSProperty(
      "tagName",
      "IMG",
    );
  });
});
