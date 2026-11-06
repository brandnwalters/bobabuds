import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import type { SeededUsername } from "@/lib/dev/seed-users";

import { signInAs } from "./support/dev-sign-in";
import { pickShop } from "./support/shop-picker";
import { LOCAL_ONLY, signInAsNewUser } from "./support/supabase";

/** Logs a drink through the form as `username`; returns the drink name. */
async function logDrink(
  page: Page,
  username: SeededUsername,
  { shop, note }: { shop: string; note?: string },
) {
  // Unique per run, so parallel tests (and reruns) can tell their Log apart.
  const drink = `Feed Test Tea ${randomUUID().slice(0, 6)}`;
  await signInAs(page, username, { next: "/log" });
  await pickShop(page, shop);
  await page.getByLabel("Drink").fill(drink);
  await page.getByLabel("4 stars", { exact: true }).check();
  await page.getByRole("button", { name: "75%" }).click();
  await page.getByRole("button", { name: "Less ice" }).click();
  if (note) await page.getByLabel("Note").fill(note);
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
  return drink;
}

function feedCard(page: Page, drink: string) {
  return page.getByRole("article").filter({
    has: page.getByRole("heading", { name: drink }),
  });
}

test("a friend's Log appears in the Feed; a stranger's Log does not", async ({
  page,
}) => {
  const friendsDrink = await logDrink(page, "jordan", {
    shop: "Moge Tee",
    note: "Cheese foam was perfect",
  });
  const strangersDrink = await logDrink(page, "casey", { shop: "Cha House" });

  await signInAs(page, "mia");
  await expect(page.getByRole("heading", { level: 1, name: "Feed" })).toBeVisible();

  const card = feedCard(page, friendsDrink);
  await expect(card).toBeVisible();
  await expect(card).toContainText("Moge Tee");
  await expect(card.getByRole("img", { name: "4 out of 5 stars" })).toBeVisible();
  await expect(card).toContainText("75% sweet");
  await expect(card).toContainText("Less ice");
  await expect(card).toContainText("Cheese foam was perfect");
  await expect(card).toContainText("Jordan Lee");
  await expect(card).toContainText(/just now|minute/);

  await expect(feedCard(page, strangersDrink)).toHaveCount(0);
});

test("a Feed card links to the author's Profile and the Shop Page", async ({
  page,
}) => {
  const drink = await logDrink(page, "sam", { shop: "Wheat" });
  await signInAs(page, "mia");

  const card = feedCard(page, drink);
  await card.getByRole("link", { name: "Sam Rivera" }).click();
  await expect(page).toHaveURL(/\/u\/sam$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sam Rivera" }),
  ).toBeVisible();

  await page.goBack();
  await card.getByRole("link", { name: "Wheat" }).click();
  await expect(page).toHaveURL(/\/shops\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Wheat" })).toBeVisible();
  await expect(page.getByText("810 Ninth St, Durham")).toBeVisible();
});

test("a new user with no friends or Logs sees where to start", async ({
  page,
}) => {
  test.skip(...LOCAL_ONLY);
  await signInAsNewUser(page);
  await page.goto("/");

  await expect(page.getByText("Your Feed is empty")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("main").getByRole("link", { name: "Find friends" }).click();
  await expect(page).toHaveURL(/\/friends$/);
  await page.goBack();
  await page.getByRole("main").getByRole("link", { name: "Log a drink" }).click();
  await expect(page).toHaveURL(/\/log$/);
});

test("the Feed loads older Logs as you scroll", async ({ page }) => {
  // Seeded data gives mia more than one page of her own and friends' Logs.
  await signInAs(page, "mia");
  const cards = page.getByRole("list", { name: "Logs" }).getByRole("article");
  await expect(cards.first()).toBeVisible();
  const firstPage = await cards.count();

  await cards.last().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 10_000);
  await expect(async () => {
    expect(await cards.count()).toBeGreaterThan(firstPage);
  }).toPass();
});
