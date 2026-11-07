import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  type Browser,
  expect,
  type Page,
  test,
  type TestInfo,
} from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";
import { pickShop } from "./support/shop-picker";
import { trustVercelPreview } from "./support/vercel-preview";

// The whole MVP core loop, end to end, as a brand-new user and their friend.
// It only talks to the app (Dev Bar + seeded users), so it runs both locally
// and against a preview deployment: `E2E_BASE_URL=<preview> pnpm test:e2e core-loop`.
// It cleans up after itself (deletes its Log, unfriends sam), so seeded data
// is left as it found it apart from the new account.

const PHOTO = path.resolve("tests/e2e/fixtures/drink-photo.jpg");
const SHOP = "Wheat";

/** A second signed-out browser with the same device settings as `page`. */
async function newPage(browser: Browser, testInfo: TestInfo) {
  const {
    baseURL,
    extraHTTPHeaders,
    viewport,
    userAgent,
    deviceScaleFactor,
    isMobile,
    hasTouch,
  } = testInfo.project.use;
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport,
    userAgent,
    deviceScaleFactor,
    isMobile,
    hasTouch,
  });
  await trustVercelPreview(context);
  return context.newPage();
}

function region(page: Page, name: string) {
  return page.getByRole("region", { name });
}

function friendsRow(page: Page, list: string, username: string) {
  return region(page, list)
    .getByRole("listitem")
    .filter({ hasText: `@${username}` });
}

function feedCard(page: Page, drink: string) {
  return page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: drink }) });
}

test("core loop: setup, befriend, log with a photo, Feed, Cheers, edit, Profile, Shop Page, delete", async ({
  page,
  browser,
}, testInfo) => {
  test.slow();
  await trustVercelPreview(page.context());
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const username = `loop_${suffix}`;
  const displayName = `Loop ${suffix}`;
  const drink = `Core Loop Tea ${suffix}`;
  const editedDrink = `${drink} (less ice)`;

  // Setup: a brand-new account from the Dev Bar lands on onboarding.
  await page.goto("/sign-in");
  const devBar = page.getByRole("complementary", { name: "Dev Bar" });
  await devBar.locator("summary").click();
  await devBar.getByRole("button", { name: /New user/ }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  // Retry the fill: typing before the form hydrates is lost (and React then
  // ignores a refill with the same value, so clear it first).
  await expect(async () => {
    await page.getByLabel("Username").fill("");
    await page.getByLabel("Username").fill(username);
    await expect(page.getByTestId("username-status")).toHaveText(
      `@${username} is available!`,
      { timeout: 2_000 },
    );
  }).toPass();
  await page.getByLabel("Display name").fill(displayName);
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Feed" })).toBeVisible();
  await expect(page.getByText("Your Feed is empty")).toBeVisible();
  await expect(devBar.locator("summary")).toHaveText(`Dev Bar: @${username}`);

  // Friend Request: the new user asks sam, sam accepts.
  await page.goto("/friends?q=sam");
  await expect(page.getByText("No buds yet.")).toBeVisible();
  await friendsRow(page, "Search results", "sam")
    .getByRole("button", { name: "Add friend" })
    .click();
  await expect(friendsRow(page, "Sent requests", "sam")).toBeVisible();

  const friend = await newPage(browser, testInfo);
  await signInAs(friend, "sam", { next: "/friends" });
  await friendsRow(friend, "Friend Requests", username)
    .getByRole("button", { name: "Accept" })
    .click();
  await expect(friendsRow(friend, "Your friends", username)).toBeVisible();

  // Log with a photo.
  await page.goto("/log");
  await pickShop(page, SHOP);
  await page.getByLabel("Drink").fill(drink);
  await page.getByLabel("4 stars", { exact: true }).check();
  await page
    .getByLabel("Add photo", { exact: true })
    .filter({ visible: true })
    .setInputFiles(PHOTO);
  await expect(page.getByRole("img", { name: "Photo preview" })).toBeVisible();
  await page.getByRole("button", { name: "50%" }).click();
  await page.getByLabel("Note").fill("Made it through the whole loop");
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
  const logUrl = page.url();

  // It shows in the friend's Feed, with the photo, and the friend cheers it.
  await friend.goto("/");
  const card = feedCard(friend, drink);
  await expect(card).toContainText(displayName);
  await expect(card.getByRole("img", { name: `Photo of ${drink}` })).toBeVisible();
  const cheers = card.getByRole("button", { name: "Cheers" });
  await cheers.click();
  await expect(cheers).toHaveAttribute("aria-pressed", "true");
  await expect(cheers).toHaveAttribute("aria-busy", "false");

  // The author sees the Cheers, then edits the Log.
  await page.reload();
  const cheersRegion = region(page, "Cheers");
  await expect(cheersRegion).toContainText("1 Cheers");
  await expect(cheersRegion.getByRole("link", { name: "Sam Rivera" })).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Edit Log" })).toBeVisible();
  await page.getByRole("combobox", { name: "Drink" }).fill(editedDrink);
  await page.getByRole("radio", { name: "4.5 stars" }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(logUrl);
  const log = page.getByRole("article");
  await expect(log.getByRole("heading", { name: editedDrink })).toBeVisible();
  await expect(log.getByRole("img", { name: "4.5 out of 5 stars" })).toBeVisible();
  await expect(log.getByRole("img", { name: `Photo of ${editedDrink}` })).toBeVisible();

  // Profile: the journal for the author and their friend, locked for a stranger.
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: displayName })).toBeVisible();
  await expect(page.getByTestId("stat-logs")).toHaveText("1");
  await expect(page.getByTestId("stat-top-shop")).toHaveText(SHOP);
  await expect(page.getByTestId("stat-average")).toHaveText("4.5");

  await friend.goto(`/u/${username}`);
  await expect(
    friend.getByRole("list", { name: `${displayName}'s Logs` }),
  ).toContainText(editedDrink);

  const stranger = await newPage(browser, testInfo);
  await signInAs(stranger, "casey", { next: `/u/${username}` });
  await expect(stranger.getByRole("heading", { level: 1, name: displayName })).toBeVisible();
  await expect(
    stranger.getByText(`Become buds with Loop to see their boba journal.`),
  ).toBeVisible();
  await expect(stranger.getByText(editedDrink)).toHaveCount(0);
  await expect(stranger.getByRole("button", { name: "Add friend" })).toBeVisible();

  // Shop Page: the Log is listed at its shop.
  await page.getByTestId("stat-top-shop").click();
  await expect(page.getByRole("heading", { level: 1, name: SHOP })).toBeVisible();
  const shopUrl = page.url();
  await expect(
    feedCard(page, editedDrink).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "Average rating" })).toBeVisible();

  // Delete: gone from the Profile and from the friend's Feed.
  await page.goto(logUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText("No Logs yet. What was your last boba?")).toBeVisible();
  await friend.goto("/");
  await expect(friend.getByRole("heading", { level: 1, name: "Feed" })).toBeVisible();
  await expect(feedCard(friend, editedDrink)).toHaveCount(0);

  // Clean up: unfriend sam, which also empties the new user's Shop Page.
  await page.goto("/friends");
  await friendsRow(page, "Your friends", "sam")
    .getByRole("button", { name: "Unfriend" })
    .click();
  await expect(friendsRow(page, "Your friends", "sam")).toHaveCount(0);
  await page.goto(shopUrl);
  await expect(page.getByText("No Logs here yet")).toBeVisible();

  await friend.context().close();
  await stranger.context().close();
});
