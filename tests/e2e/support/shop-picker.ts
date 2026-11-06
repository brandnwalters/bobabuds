import { expect, type Page } from "@playwright/test";

/**
 * Searches the Log form's shop picker and chooses the first suggestion whose
 * name starts with `name`. Without a Google Maps key the picker searches the
 * built-in list of Chapel Hill/Durham shops (`DEV_FALLBACK_SHOPS`), so use a
 * name from there (e.g. "Yaya Tea", "Moge Tee", "Cha House").
 */
export async function pickShop(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Shop" }).fill(name);
  await page
    .getByRole("listbox", { name: "Shop suggestions" })
    .getByRole("option", { name: new RegExp(`^${name}`) })
    .first()
    .click();
  await expect(page.getByTestId("chosen-shop")).toContainText(name);
}
