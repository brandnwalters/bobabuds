import { expect, test, type Page } from "@playwright/test";

import type { SeededUsername } from "@/lib/dev/seed-users";

import { signInAs } from "./support/dev-sign-in";

function section(page: Page, name: string) {
  return page.getByRole("region", { name });
}

/** The row for @username inside a list on the Friends page. */
function row(page: Page, list: string, username: string) {
  return section(page, list)
    .getByRole("listitem")
    .filter({ hasText: `@${username}` });
}

async function search(page: Page, query: string) {
  await page.getByRole("searchbox", { name: "Find buds by @username" }).fill(query);
  await page.getByRole("button", { name: "Search" }).click();
}

/**
 * Removes any friendship or pending request between two seeded users, from
 * `a`'s side, so a test that mutates them starts (and ends) clean.
 */
async function resetRelationship(page: Page, a: SeededUsername, b: SeededUsername) {
  await signInAs(page, a, { next: "/friends" });
  await expect(page.getByRole("heading", { level: 1, name: "Friends" })).toBeVisible();
  for (const [list, button] of [
    ["Your friends", "Unfriend"],
    ["Sent requests", "Cancel"],
    ["Friend Requests", "Decline"],
  ] as const) {
    const existing = row(page, list, b);
    if (await existing.count()) {
      await existing.getByRole("button", { name: button }).click();
      await expect(existing).toHaveCount(0);
    }
  }
}

// Mutating tests use pairs that are strangers in the seed, and a different
// pair per Playwright project, so parallel runs never touch the same pair.
const pairs = {
  accept: {
    mobile: ["alex", "taylor"],
    desktop: ["alex", "casey"],
  },
  cancelDecline: {
    mobile: ["taylor", "casey"],
    desktop: ["jordan", "casey"],
  },
} as const satisfies Record<
  string,
  Record<string, readonly [SeededUsername, SeededUsername]>
>;

function pairFor(test: keyof typeof pairs, project: string) {
  return pairs[test][project as "mobile" | "desktop"];
}

test("mia sees her friends, both kinds of pending request, and a badge", async ({
  page,
}) => {
  await signInAs(page, "mia", { next: "/friends" });

  await expect(row(page, "Friend Requests", "alex")).toBeVisible();
  await expect(row(page, "Sent requests", "taylor")).toBeVisible();
  for (const friend of ["jordan", "priya", "sam"]) {
    await expect(row(page, "Your friends", friend)).toBeVisible();
  }
  await expect(section(page, "Your friends").getByRole("listitem")).toHaveCount(3);

  const friendsTab = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: /Friends/ });
  await expect(friendsTab).toHaveAccessibleName(
    "Friends (1 pending friend request)",
  );
});

test("search matches username prefixes, skips yourself and shows where you stand", async ({
  page,
}) => {
  await signInAs(page, "mia", { next: "/friends" });
  const results = section(page, "Search results");

  await search(page, "@TAY");
  await expect(row(page, "Search results", "taylor")).toContainText("Requested");

  await search(page, "ale");
  await expect(
    row(page, "Search results", "alex").getByRole("button", { name: "Accept" }),
  ).toBeVisible();

  await search(page, "jor");
  await expect(row(page, "Search results", "jordan")).toContainText("Friends");

  await search(page, "cas");
  await expect(
    row(page, "Search results", "casey").getByRole("button", { name: "Add friend" }),
  ).toBeVisible();

  // Never yourself, even on an exact match.
  await search(page, "mia");
  await expect(results).toBeVisible();
  await expect(row(page, "Search results", "mia")).toHaveCount(0);

  await search(page, "zz_nobody_");
  await expect(results).toContainText("No buds match @zz_nobody_");
});

test("send a request, switch users, accept it, and both are friends", async ({
  page,
}, testInfo) => {
  const [sender, recipient] = pairFor("accept", testInfo.project.name);
  await resetRelationship(page, sender, recipient);

  await search(page, recipient);
  await row(page, "Search results", recipient)
    .getByRole("button", { name: "Add friend" })
    .click();
  await expect(row(page, "Sent requests", recipient)).toBeVisible();

  await signInAs(page, recipient, { next: "/friends" });
  await row(page, "Friend Requests", sender)
    .getByRole("button", { name: "Accept" })
    .click();
  await expect(row(page, "Your friends", sender)).toBeVisible();
  await expect(row(page, "Friend Requests", sender)).toHaveCount(0);

  await signInAs(page, sender, { next: "/friends" });
  await expect(row(page, "Your friends", recipient)).toBeVisible();
  await expect(row(page, "Sent requests", recipient)).toHaveCount(0);

  // Unfriending removes the friendship for both of them.
  await row(page, "Your friends", recipient)
    .getByRole("button", { name: "Unfriend" })
    .click();
  await expect(row(page, "Your friends", recipient)).toHaveCount(0);
  await signInAs(page, recipient, { next: "/friends" });
  await expect(row(page, "Your friends", sender)).toHaveCount(0);
});

test("the sender can cancel a request and the recipient can decline one", async ({
  page,
}, testInfo) => {
  const [sender, recipient] = pairFor("cancelDecline", testInfo.project.name);
  await resetRelationship(page, sender, recipient);

  await search(page, recipient);
  await row(page, "Search results", recipient)
    .getByRole("button", { name: "Add friend" })
    .click();
  await row(page, "Sent requests", recipient)
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(row(page, "Sent requests", recipient)).toHaveCount(0);

  await signInAs(page, recipient, { next: "/friends" });
  await expect(row(page, "Friend Requests", sender)).toHaveCount(0);

  await signInAs(page, sender, { next: "/friends" });
  await search(page, recipient);
  await row(page, "Search results", recipient)
    .getByRole("button", { name: "Add friend" })
    .click();
  await expect(row(page, "Sent requests", recipient)).toBeVisible();

  await signInAs(page, recipient, { next: "/friends" });
  await row(page, "Friend Requests", sender)
    .getByRole("button", { name: "Decline" })
    .click();
  await expect(row(page, "Friend Requests", sender)).toHaveCount(0);
  await expect(row(page, "Your friends", sender)).toHaveCount(0);

  await signInAs(page, sender, { next: "/friends" });
  await expect(row(page, "Sent requests", recipient)).toHaveCount(0);
});
