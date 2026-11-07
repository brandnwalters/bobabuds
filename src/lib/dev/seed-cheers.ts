/**
 * Cheers created by `pnpm seed`: who cheered which seeded Log. A Log is
 * identified by its author and drink name (unique per author in SEEDED_LOGS).
 * Cheerers must be the author's friends (SEEDED_FRIENDSHIPS), since only they
 * can see the Log; the seed script checks this.
 *
 * Kept free of runtime imports so the seed script can load it with plain Node.
 */
import type { SeededUsername } from "./seed-users";

export type SeededCheers = {
  author: SeededUsername;
  drink: string;
  by: SeededUsername[];
};

export const SEEDED_CHEERS: SeededCheers[] = [
  // mia's Logs (friends: jordan, priya, sam)
  { author: "mia", drink: "Brown Sugar Boba Milk", by: ["jordan", "priya", "sam"] },
  { author: "mia", drink: "Jasmine Green Milk Tea", by: ["priya"] },
  { author: "mia", drink: "Taro Slush", by: ["jordan", "sam"] },
  { author: "mia", drink: "Matcha Latte", by: ["sam"] },
  // jordan's Logs (friends: mia, priya)
  { author: "jordan", drink: "Thai Milk Tea", by: ["mia", "priya"] },
  { author: "jordan", drink: "Strawberry Cheese Foam", by: ["priya"] },
  { author: "jordan", drink: "Hojicha Latte", by: ["mia"] },
  // priya's Logs (friends: mia, jordan)
  { author: "priya", drink: "Passion Fruit Green Tea", by: ["jordan"] },
  { author: "priya", drink: "Grapefruit Jasmine Tea", by: ["mia", "jordan"] },
  { author: "priya", drink: "Rose Milk Tea", by: ["mia"] },
  // sam's Logs (friend: mia)
  { author: "sam", drink: "Peach Green Tea", by: ["mia"] },
  { author: "sam", drink: "Coconut Matcha", by: ["mia"] },
];
