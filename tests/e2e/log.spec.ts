import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";
import { pickShop } from "./support/shop-picker";

test("a seeded user logs a drink and sees it on their Profile", async ({
  page,
}) => {
  // Unique per run, so parallel tests (and reruns) can tell their Log apart.
  const drink = `Brown Sugar Boba ${randomUUID().slice(0, 6)}`;
  await signInAs(page, "priya", { next: "/log" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Log a drink" }),
  ).toBeVisible();

  await pickShop(page, "Yaya Tea");
  await page.getByLabel("Drink").fill(drink);
  await page.getByLabel("4.5 stars").check();
  await page.getByLabel("Date").fill("2026-11-02");
  await page.getByRole("button", { name: "50%" }).click();
  await page.getByRole("button", { name: "Less ice" }).click();
  await page.getByRole("button", { name: "Boba", exact: true }).click();
  await page.getByLabel("Add a topping").fill("Oreo crumbs");
  await page.getByRole("button", { name: "Add topping" }).click();
  await page.getByLabel("Note").fill("Too sweet, try 25% next time");
  await page.getByRole("button", { name: "Save Log" }).click();

  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
  const log = page.getByRole("article");
  await expect(log.getByRole("heading", { name: drink })).toBeVisible();
  await expect(log).toContainText("Yaya Tea");
  await expect(log.getByRole("img", { name: "4.5 out of 5 stars" })).toBeVisible();
  await expect(log).toContainText("Nov 2, 2026");
  await expect(log).toContainText("50% sweet");
  await expect(log).toContainText("Less ice");
  await expect(log).toContainText("Boba");
  await expect(log).toContainText("Oreo crumbs");
  await expect(log).toContainText("Too sweet, try 25% next time");

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Profile" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Priya Patel" }),
  ).toBeVisible();
  const entry = page.getByRole("link", { name: new RegExp(drink) });
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page.getByRole("heading", { name: drink })).toBeVisible();
});

test("the date defaults to today, and the form names each missing required field", async ({ page }) => {
  await signInAs(page, "priya", { next: "/log" });
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  await expect(page.getByLabel("Date")).toHaveValue(today);

  await page.getByLabel("Date").fill("");
  await page.getByRole("button", { name: "Save Log" }).click();

  await expect(page.getByText("Pick the shop.")).toBeVisible();
  await expect(page.getByText("Enter the drink name.")).toBeVisible();
  await expect(page.getByText("Pick a rating.")).toBeVisible();
  await expect(page.getByText("Pick the date.")).toBeVisible();
  await expect(page).toHaveURL(/\/log$/);
});

test("the Profile lists your own Logs, newest first", async ({ page }) => {
  const older = `Taro Slush ${randomUUID().slice(0, 6)}`;
  const newer = `Jasmine Green ${randomUUID().slice(0, 6)}`;
  await signInAs(page, "sam", { next: "/log" });

  for (const [drink, date] of [
    [newer, "2026-10-20"],
    [older, "2026-10-10"],
  ]) {
    await page.goto("/log");
    await pickShop(page, "Moge Tee");
    await page.getByLabel("Drink").fill(drink);
    await page.getByLabel("3 stars", { exact: true }).check();
    await page.getByLabel("Date").fill(date);
    await page.getByRole("button", { name: "Save Log" }).click();
    await expect(page).toHaveURL(/\/logs\//);
  }

  await page.goto("/profile");
  await expect(page.getByRole("link", { name: new RegExp(older) })).toBeVisible();
  const entries = page.getByRole("link", { name: /Taro Slush|Jasmine Green/ });
  const names = await entries.allTextContents();
  const newerIndex = names.findIndex((n) => n.includes(newer));
  const olderIndex = names.findIndex((n) => n.includes(older));
  expect(newerIndex).toBeGreaterThanOrEqual(0);
  expect(olderIndex).toBeGreaterThan(newerIndex);
});
