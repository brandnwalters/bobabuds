import { randomUUID } from "node:crypto";
import path from "node:path";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";
import { pickShop } from "./support/shop-picker";

// A 2400x3200 camera-sized JPEG; uploads are resized to a 1600px long edge.
const PHOTO = path.resolve("tests/e2e/fixtures/drink-photo.jpg");

/** The visible file input labelled `name` (Next keeps hidden copies of old pages). */
function fileInput(page: Page, name: string) {
  return page.getByLabel(name, { exact: true }).filter({ visible: true });
}

/** Logs a fresh drink with a photo as the signed-in user; ends on the Log page. */
async function logWithPhoto(page: Page, shop: string) {
  const drink = `Photo Tea ${randomUUID().slice(0, 6)}`;
  await page.goto("/log");
  await pickShop(page, shop);
  await page.getByLabel("Drink").fill(drink);
  await page.getByLabel("4 stars", { exact: true }).check();
  await fileInput(page, "Add photo").setInputFiles(PHOTO);
  await expect(page.getByRole("img", { name: "Photo preview" })).toBeVisible();
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);
  return drink;
}

/** Waits until `img` has actually loaded; returns its natural size. */
async function loadedSize(img: Locator) {
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
    .toBeGreaterThan(0);
  return img.evaluate((el: HTMLImageElement) => ({
    width: el.naturalWidth,
    height: el.naturalHeight,
  }));
}

async function status(page: Page, url: string) {
  return (await page.request.get(url)).status();
}

test("a Log's photo is resized, shown on the Log, and appears in a friend's Feed", async ({
  page,
}) => {
  await signInAs(page, "mia", { next: "/log" });
  const drink = await logWithPhoto(page, "Yaya Tea");

  const onLog = page.getByRole("article").getByRole("img", { name: `Photo of ${drink}` });
  const size = await loadedSize(onLog);
  // Resized in the browser before upload: long edge capped, aspect kept.
  expect(size.height).toBe(1600);
  expect(size.width).toBe(1200);

  await signInAs(page, "jordan");
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: drink }),
  });
  await expect(card).toContainText("Mia Chen");
  await loadedSize(card.getByRole("img", { name: `Photo of ${drink}` }));

  // A stranger can't see the Log, so they can't see its photo either.
  await signInAs(page, "casey");
  await expect(page.getByRole("heading", { level: 1, name: "Feed" })).toBeVisible();
  await expect(page.getByRole("img", { name: `Photo of ${drink}` })).toHaveCount(0);
});

test("the author replaces and then removes a Log's photo", async ({ page }) => {
  await signInAs(page, "priya", { next: "/log" });
  const drink = await logWithPhoto(page, "Chill Bubble Tea");
  const logUrl = page.url();
  const photo = page.getByRole("article").getByRole("img", { name: `Photo of ${drink}` });
  await loadedSize(photo);
  const firstUrl = (await photo.getAttribute("src"))!;

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Edit Log" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Photo preview" })).toBeVisible();
  await fileInput(page, "Replace photo").setInputFiles(PHOTO);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(logUrl);
  await loadedSize(photo);
  const secondUrl = (await photo.getAttribute("src"))!;
  expect(new URL(secondUrl).pathname).not.toBe(new URL(firstUrl).pathname);
  // The replaced photo is gone from Storage.
  expect(await status(page, firstUrl)).not.toBe(200);
  expect(await status(page, secondUrl)).toBe(200);

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByRole("img", { name: "Photo preview" })).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(logUrl);
  await expect(page.getByRole("article").getByRole("heading", { name: drink })).toBeVisible();
  await expect(page.getByRole("img", { name: `Photo of ${drink}` })).toHaveCount(0);
  expect(await status(page, secondUrl)).not.toBe(200);
});

test("deleting a Log deletes its photo", async ({ page }) => {
  await signInAs(page, "sam", { next: "/log" });
  const drink = await logWithPhoto(page, "Wheat");
  const photo = page.getByRole("article").getByRole("img", { name: `Photo of ${drink}` });
  await loadedSize(photo);
  const url = (await photo.getAttribute("src"))!;
  expect(await status(page, url)).toBe(200);

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  expect(await status(page, url)).not.toBe(200);
});
