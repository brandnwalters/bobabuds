import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";
import { pickShop } from "./support/shop-picker";

/** Logs a fresh drink as jordan (mia's friend); returns the drink name. */
async function jordanLogsADrink(page: Page) {
  const drink = `Cheers Test Tea ${randomUUID().slice(0, 6)}`;
  await signInAs(page, "jordan", { next: "/log" });
  await pickShop(page, "Yaya Tea");
  await page.getByLabel("Drink").fill(drink);
  await page.getByLabel("4 stars", { exact: true }).check();
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
  return drink;
}

function feedCard(page: Page, drink: string) {
  return page.getByRole("article").filter({
    has: page.getByRole("heading", { name: drink }),
  });
}

test("a friend cheers a Log from the Feed and un-cheers it on the Log page", async ({
  page,
}) => {
  const drink = await jordanLogsADrink(page);

  await signInAs(page, "mia");
  const card = feedCard(page, drink);
  const cheers = card.getByRole("button", { name: "Cheers" });
  await expect(cheers).toHaveAttribute("aria-pressed", "false");
  await expect(card).toContainText("No Cheers yet");

  await cheers.click();
  await expect(cheers).toHaveAttribute("aria-pressed", "true");
  await expect(card).toContainText("1 Cheers");
  // The count flips at once; wait for the server to confirm before reloading.
  await expect(cheers).toHaveAttribute("aria-busy", "false");

  // It sticks: a fresh load shows the Cheers, and the Log page lists who cheered.
  await page.reload();
  await expect(cheers).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("link", { name: drink }).click();
  await expect(page.getByRole("heading", { level: 1, name: drink })).toBeVisible();

  const logCheers = page.getByRole("region", { name: "Cheers" });
  const toggle = logCheers.getByRole("button", { name: "Cheers" });
  const cheeredBy = logCheers.getByRole("list", { name: "Cheered by" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(logCheers).toContainText("1 Cheers");
  await expect(cheeredBy.getByRole("listitem")).toHaveText(["Mia Chen"]);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toHaveAttribute("aria-busy", "false");
  await expect(logCheers).toContainText("No Cheers yet");
  await expect(cheeredBy).toHaveCount(0);

  await page.goto("/");
  await expect(cheers).toHaveAttribute("aria-pressed", "false");
  await expect(card).toContainText("No Cheers yet");
});

test("the author sees who cheered their Log", async ({ page }) => {
  const drink = await jordanLogsADrink(page);
  const logUrl = page.url();

  await signInAs(page, "priya");
  const cheers = feedCard(page, drink).getByRole("button", { name: "Cheers" });
  await cheers.click();
  await expect(feedCard(page, drink)).toContainText("1 Cheers");
  await expect(cheers).toHaveAttribute("aria-busy", "false");

  await signInAs(page, "jordan", { next: new URL(logUrl).pathname });
  const logCheers = page.getByRole("region", { name: "Cheers" });
  await expect(
    logCheers.getByRole("list", { name: "Cheered by" }).getByRole("listitem"),
  ).toHaveText(["Priya Patel"]);
  await expect(logCheers).toContainText("1 Cheers");
  await expect(logCheers.getByRole("button", { name: "Cheers" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
