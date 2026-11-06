import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./support/dev-sign-in";
import { pickShop } from "./support/shop-picker";
import { adminClient, LOCAL_ONLY, signInAsNewUser } from "./support/supabase";

/** The Shop Page's list of Logs. */
function shopLogs(page: Page) {
  return page.getByRole("list", { name: "Logs at this shop" });
}

function logCard(page: Page, drink: string) {
  return shopLogs(page)
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: drink }) });
}

test("a Shop Page shows friends' Logs and their average, but not a stranger's", async ({
  page,
}) => {
  // casey is a stranger to mia. A 0.5-star Log would pull the average below
  // every Log mia can see if it were counted.
  const strangersDrink = `Stranger Tea ${randomUUID().slice(0, 6)}`;
  await signInAs(page, "casey", { next: "/log" });
  await pickShop(page, "Moge Tee");
  await page.getByLabel("Drink").fill(strangersDrink);
  await page.getByLabel("0.5 stars").check();
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);

  await signInAs(page, "mia");
  await page
    .getByRole("article")
    .getByRole("link", { name: "Moge Tee", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/shops\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Moge Tee" })).toBeVisible();
  await expect(page.getByText("151 E Franklin St, Chapel Hill")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open in Google Maps" }),
  ).toHaveAttribute("href", /^https:\/\//);

  // Seeded Logs at Moge Tee: mia's own and her friends' are listed...
  await expect(logCard(page, "Strawberry Cheese Foam")).toContainText("Jordan Lee");
  await expect(logCard(page, "Grapefruit Jasmine Tea")).toContainText("Priya Patel");
  await expect(logCard(page, "Cheese Foam Oolong")).toContainText("Mia Chen");
  // ...but not those of casey (stranger), alex or taylor (requests, not friends).
  await expect(shopLogs(page)).not.toContainText("Way too sweet for me.");
  await expect(logCard(page, "Peach Oolong")).toHaveCount(0);
  await expect(logCard(page, "Mango Pomelo Sago")).toHaveCount(0);
  await expect(logCard(page, strangersDrink)).toHaveCount(0);

  // The average covers exactly the listed Logs. Other tests add Logs here
  // concurrently, so the ratings are read off the page, not hard-coded.
  const labels = await shopLogs(page)
    .getByRole("img", { name: /out of 5 stars$/ })
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
  const ratings = labels.map((label) => parseFloat(label));
  expect(ratings.length).toBeGreaterThanOrEqual(5);
  const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

  const average = page.getByRole("group", { name: "Average rating" });
  await expect(average).toContainText(`from ${ratings.length} Logs`);
  const shown = parseFloat(
    (await average.getByTestId("average-rating-value").textContent()) ?? "",
  );
  // Shown to one decimal (+ a hair for float error).
  expect(Math.abs(shown - mean)).toBeLessThanOrEqual(0.05 + 1e-9);
});

test("a Shop Page with no visible Logs shows an empty state", async ({ page }) => {
  test.skip(...LOCAL_ONLY);
  const { data: shop, error } = await adminClient()
    .from("shops")
    .select("id")
    .eq("name", "Chill Bubble Tea")
    .single();
  if (error) throw error;
  // A brand-new user has no Logs and no friends, so no Logs are visible.
  await signInAsNewUser(page);
  await page.goto(`/shops/${shop.id}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Chill Bubble Tea" }),
  ).toBeVisible();
  await expect(page.getByText("No Logs here yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log a drink" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Google Maps" })).toBeVisible();
  await expect(shopLogs(page)).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Average rating" })).toHaveCount(0);
});

test("the shop name on a Log page links to the Shop Page", async ({ page }) => {
  const drink = `Shop Link Tea ${randomUUID().slice(0, 6)}`;
  await signInAs(page, "mia", { next: "/log" });
  await pickShop(page, "Wheat");
  await page.getByLabel("Drink").fill(drink);
  await page.getByLabel("4 stars", { exact: true }).check();
  await page.getByRole("button", { name: "Save Log" }).click();
  await expect(page).toHaveURL(/\/logs\/[0-9a-f-]{36}$/);

  await page.getByRole("article").getByRole("link", { name: "Wheat" }).click();
  await expect(page).toHaveURL(/\/shops\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Wheat" })).toBeVisible();
  await expect(logCard(page, drink)).toContainText("Mia Chen");
});
