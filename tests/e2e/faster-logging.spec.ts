import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";
import { pickShop } from "./support/shop-picker";

/** Logs a drink through the form (the user must already be signed in). */
async function logDrink(page: Page, shop: string, drink: string) {
  await page.goto("/log");
  await pickShop(page, shop);
  await page.getByLabel("Drink").fill(drink);
  await page.getByLabel("4 stars", { exact: true }).check();
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
}

test("the Log form offers your recent shops and the drinks you've had there", async ({
  page,
}) => {
  const id = randomUUID().slice(0, 6);
  const mine = [`Wintermelon Tea ${id}`, `Hokkaido Milk Tea ${id}`];
  const theirs = `Someone Else's Slush ${id}`;

  // Another user's Log at the same shop must not show up as a suggestion.
  await signInAs(page, "jordan", { next: "/log" });
  await logDrink(page, "Quickly Tea House", theirs);

  // Casey's past Logs: two at the same shop, so it should appear only once.
  await signInAs(page, "casey", { next: "/log" });
  for (const drink of mine) await logDrink(page, "Quickly Tea House", drink);

  await page.goto("/log");
  const shop = page.getByRole("combobox", { name: "Shop" });
  await shop.focus();
  const recent = page.getByRole("listbox", { name: "Recent shops" });
  await expect(recent).toBeVisible();
  // Logged today, just now: the newest, so first.
  await expect(recent.getByRole("option").first()).toHaveAccessibleName(
    /^Quickly Tea House/,
  );
  await expect(
    recent.getByRole("option", { name: /^Quickly Tea House/ }),
  ).toHaveCount(1);
  await recent.getByRole("option", { name: /^Quickly Tea House/ }).click();
  await expect(page.getByTestId("chosen-shop")).toContainText(
    "Quickly Tea House",
  );

  const drinkField = page.getByRole("combobox", { name: "Drink" });
  await drinkField.focus();
  const suggestions = page.getByRole("listbox", { name: "Past orders here" });
  for (const drink of mine) {
    await expect(suggestions.getByRole("option", { name: drink })).toBeVisible();
  }
  await expect(suggestions.getByRole("option", { name: theirs })).toHaveCount(0);

  // Typing narrows the suggestions; picking one fills the field.
  await drinkField.fill("hokkaido");
  await expect(
    suggestions.getByRole("option", { name: mine[0] }),
  ).toHaveCount(0);
  await suggestions.getByRole("option", { name: mine[1] }).click();
  await expect(drinkField).toHaveValue(mine[1]);
  await expect(suggestions).toBeHidden();

  await page.getByLabel("5 stars", { exact: true }).check();
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
  const log = page.getByRole("article");
  await expect(log.getByRole("heading", { name: mine[1] })).toBeVisible();
  await expect(log).toContainText("Quickly Tea House");
});

test("the drink name still takes free text", async ({ page }) => {
  const drink = `Brand New Drink ${randomUUID().slice(0, 6)}`;
  await signInAs(page, "casey", { next: "/log" });
  await pickShop(page, "Wheat");
  await page.getByRole("combobox", { name: "Drink" }).fill(drink);
  await page.getByLabel("3 stars", { exact: true }).check();
  // An old date, so this Log never outranks the other test's "newest" shop.
  await page.getByLabel("Date").fill("2025-01-01");
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: drink })).toBeVisible();
});
