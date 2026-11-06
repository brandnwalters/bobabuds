import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";
import { pickShop } from "./support/shop-picker";

/** Logs a fresh drink through the form and returns its name, ending on the Log page. */
async function logADrink(page: Page) {
  const drink = `Thai Tea ${randomUUID().slice(0, 6)}`;
  await page.goto("/log");
  await pickShop(page, "Cha House");
  await page.getByLabel("Drink").fill(drink);
  await page.getByLabel("3 stars", { exact: true }).check();
  await page.getByLabel("Date").fill("2026-10-15");
  await page.getByRole("button", { name: "75%" }).click();
  await page.getByRole("button", { name: "Pudding", exact: true }).click();
  await page.getByLabel("Note").fill("Pretty good");
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
  return drink;
}

test("the author edits a Log's rating and then deletes it", async ({ page }) => {
  await signInAs(page, "jordan", { next: "/log" });
  const drink = await logADrink(page);
  const logUrl = page.url();

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit Log" }),
  ).toBeVisible();
  // The form starts with the Log's current values. (Role queries skip the
  // hidden /log form that Next keeps alive from the previous page.)
  await expect(page.getByTestId("chosen-shop").filter({ visible: true })).toContainText("Cha House");
  await expect(page.getByRole("combobox", { name: "Drink" })).toHaveValue(drink);
  await expect(page.getByRole("radio", { name: "3 stars", exact: true }))
    .toBeChecked();
  await expect(page.getByLabel("Date").filter({ visible: true }))
    .toHaveValue("2026-10-15");
  await expect(page.getByRole("button", { name: "75%" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Pudding", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("textbox", { name: "Note" })).toHaveValue("Pretty good");

  await page.getByRole("radio", { name: "4.5 stars" }).check();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(logUrl);
  const log = page.getByRole("article");
  await expect(log.getByRole("img", { name: "4.5 out of 5 stars" })).toBeVisible();
  await expect(log.getByRole("heading", { name: drink })).toBeVisible();
  await expect(log).toContainText("75% sweet");
  await expect(log).toContainText("Pudding");
  await expect(log).toContainText("Pretty good");

  await page.getByRole("button", { name: "Delete" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Delete this Log?");
  await confirm.getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Profile" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(drink) })).toHaveCount(0);
  await page.goto(logUrl);
  await expect(page.getByRole("heading", { name: drink })).toHaveCount(0);
});

test("the server rejects a future date when creating or editing a Log", async ({
  page,
}) => {
  await signInAs(page, "jordan", { next: "/log" });
  // The date picker's max only guides the browser; fill() skips it, as a
  // crafted request would.
  await pickShop(page, "Wheat");
  await page.getByLabel("Drink").fill(`Future Tea ${randomUUID().slice(0, 6)}`);
  await page.getByLabel("4 stars", { exact: true }).check();
  await page.getByLabel("Date").fill("2099-01-01");
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page.getByText("The date can't be in the future.")).toBeVisible();
  await expect(page).toHaveURL(/\/log$/);

  const drink = await logADrink(page);
  const logUrl = page.url();
  await page.getByRole("link", { name: "Edit" }).click();
  const date = page.getByLabel("Date").filter({ visible: true });
  await expect(date).toHaveValue("2026-10-15");
  await date.fill("2099-01-01");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("The date can't be in the future.")).toBeVisible();

  await page.goto(logUrl);
  const log = page.getByRole("article");
  await expect(log.getByRole("heading", { name: drink })).toBeVisible();
  await expect(log).toContainText("Oct 15, 2026");
});

test("only the author gets Edit and Delete, and the edit page", async ({
  browser,
}) => {
  const author = await browser.newPage();
  await signInAs(author, "jordan", { next: "/log" });
  await logADrink(author);
  const logUrl = author.url();
  await expect(author.getByRole("link", { name: "Edit" })).toBeVisible();
  await expect(author.getByRole("button", { name: "Delete" })).toBeVisible();

  const stranger = await browser.newPage();
  await signInAs(stranger, "casey");
  for (const url of [logUrl, `${logUrl}/edit`]) {
    await stranger.goto(url);
    await expect(stranger.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(stranger.getByRole("heading", { name: "Edit Log" })).toHaveCount(0);
    await expect(stranger.getByRole("combobox", { name: "Drink" })).toHaveCount(0);
    await expect(stranger.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await expect(stranger.getByRole("button", { name: "Delete" })).toHaveCount(0);
  }
});
