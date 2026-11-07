/**
 * Logs created by `pnpm seed`, at the real Chapel Hill/Durham shops in
 * DEV_FALLBACK_SHOPS (so seeded shops are the same rows the shop picker
 * returns in tests). `shop` is the shop's name in that list; `daysAgo` sets
 * both the drink date and the created time, so the Feed has a history.
 *
 * Kept free of runtime imports so the seed script can load it with plain Node.
 */
import type { SeededUsername } from "./seed-users";

export type SeededLog = {
  author: SeededUsername;
  shop: string;
  drink: string;
  rating: number;
  daysAgo: number;
  sweetness?: 0 | 25 | 50 | 75 | 100;
  ice?: "none" | "less" | "regular" | "extra";
  toppings?: string[];
  note?: string;
};

export const SEEDED_LOGS: SeededLog[] = [
  // mia: main test user
  { author: "mia", shop: "Moge Tee", drink: "Brown Sugar Boba Milk", rating: 5, daysAgo: 1, sweetness: 50, ice: "less", toppings: ["Boba"], note: "Perfect as always. 50% is the sweet spot." },
  { author: "mia", shop: "Cha House", drink: "Jasmine Green Milk Tea", rating: 4, daysAgo: 4, sweetness: 25, ice: "regular", toppings: ["Lychee jelly"] },
  { author: "mia", shop: "Yaya Tea", drink: "Taro Slush", rating: 3.5, daysAgo: 9, sweetness: 75, ice: "regular", toppings: ["Taro balls"], note: "A bit too sweet, try 50% next time." },
  { author: "mia", shop: "Chill Bubble Tea", drink: "Mango Green Tea", rating: 4.5, daysAgo: 15, sweetness: 50, ice: "less", toppings: ["Popping boba"] },
  { author: "mia", shop: "Wheat", drink: "Matcha Latte", rating: 4, daysAgo: 22, sweetness: 25, ice: "none", note: "Hot and cozy." },
  { author: "mia", shop: "Moge Tee", drink: "Cheese Foam Oolong", rating: 4.5, daysAgo: 30, sweetness: 25, ice: "less", toppings: ["Cheese foam"] },
  { author: "mia", shop: "Quickly Tea House", drink: "Classic Milk Tea", rating: 3, daysAgo: 41, sweetness: 100, ice: "extra", toppings: ["Boba"] },

  // jordan: mia's friend
  { author: "jordan", shop: "Yaya Tea Durham", drink: "Thai Milk Tea", rating: 4.5, daysAgo: 0, sweetness: 75, ice: "regular", toppings: ["Boba"], note: "Strong and creamy." },
  { author: "jordan", shop: "Cha House", drink: "Brown Sugar Milk Tea", rating: 4, daysAgo: 3, sweetness: 50, ice: "less", toppings: ["Boba", "Pudding"] },
  { author: "jordan", shop: "Moge Tee", drink: "Strawberry Cheese Foam", rating: 5, daysAgo: 6, sweetness: 50, ice: "less", toppings: ["Cheese foam"], note: "New favorite!" },
  { author: "jordan", shop: "Quickly Tea House", drink: "Honeydew Milk Tea", rating: 3.5, daysAgo: 12, sweetness: 75, ice: "regular", toppings: ["Mini boba"] },
  { author: "jordan", shop: "Wheat", drink: "Hojicha Latte", rating: 4, daysAgo: 19, sweetness: 25, ice: "none" },
  { author: "jordan", shop: "Chill Bubble Tea", drink: "Lychee Black Tea", rating: 3, daysAgo: 27, sweetness: 50, ice: "regular", toppings: ["Lychee jelly"] },
  { author: "jordan", shop: "Yaya Tea", drink: "Wintermelon Milk Tea", rating: 4, daysAgo: 35 },

  // priya: mia's friend
  { author: "priya", shop: "Chill Bubble Tea", drink: "Passion Fruit Green Tea", rating: 4.5, daysAgo: 2, sweetness: 25, ice: "less", toppings: ["Popping boba", "Aloe vera"] },
  { author: "priya", shop: "Moge Tee", drink: "Grapefruit Jasmine Tea", rating: 4, daysAgo: 5, sweetness: 25, ice: "regular", note: "So refreshing on a hot day." },
  { author: "priya", shop: "Yaya Tea", drink: "Oolong Milk Tea", rating: 4.5, daysAgo: 10, sweetness: 50, ice: "less", toppings: ["Grass jelly"] },
  { author: "priya", shop: "Cha House", drink: "Rose Milk Tea", rating: 3.5, daysAgo: 16, sweetness: 50, ice: "regular", toppings: ["Coconut jelly"] },
  { author: "priya", shop: "Yaya Tea Durham", drink: "Taro Milk Tea", rating: 5, daysAgo: 24, sweetness: 50, ice: "less", toppings: ["Boba", "Taro balls"], note: "Real taro chunks. Worth the drive." },
  { author: "priya", shop: "Wheat", drink: "Earl Grey Milk Tea", rating: 4, daysAgo: 33, sweetness: 25, ice: "regular" },

  // sam: mia's friend
  { author: "sam", shop: "Quickly Tea House", drink: "Peach Green Tea", rating: 3.5, daysAgo: 1, sweetness: 75, ice: "extra", toppings: ["Crystal boba"] },
  { author: "sam", shop: "Moge Tee", drink: "Brown Sugar Boba Milk", rating: 4.5, daysAgo: 7, sweetness: 50, ice: "less", toppings: ["Boba"], note: "Mia was right about this one." },
  { author: "sam", shop: "Wheat", drink: "Coconut Matcha", rating: 4, daysAgo: 13, sweetness: 25, ice: "regular", toppings: ["Coconut jelly"] },
  { author: "sam", shop: "Cha House", drink: "Thai Milk Tea", rating: 3, daysAgo: 20, sweetness: 100, ice: "regular", toppings: ["Boba"] },
  { author: "sam", shop: "Yaya Tea", drink: "Mango Slush", rating: 4.5, daysAgo: 29, sweetness: 75, ice: "regular", toppings: ["Mini boba", "Pudding"] },
  { author: "sam", shop: "Chill Bubble Tea", drink: "Red Bean Milk Tea", rating: 3.5, daysAgo: 38, sweetness: 50, toppings: ["Red bean"] },
  // A custom (non-preset) topping, and no sweetness or ice.
  { author: "sam", shop: "Yaya Tea Durham", drink: "Hokkaido Milk Tea", rating: 4, daysAgo: 26, toppings: ["Boba", "Brûlée top"], note: "Ask for the torched sugar top." },

  // alex: sent mia a friend request (not her friend yet)
  { author: "alex", shop: "Yaya Tea", drink: "Lavender Milk Tea", rating: 4, daysAgo: 2, sweetness: 50, ice: "less", note: "Floral but not soapy." },
  { author: "alex", shop: "Moge Tee", drink: "Peach Oolong", rating: 4.5, daysAgo: 8, sweetness: 25, ice: "regular" },
  { author: "alex", shop: "Quickly Tea House", drink: "Coffee Milk Tea", rating: 3, daysAgo: 18, sweetness: 75, ice: "regular", toppings: ["Boba"] },
  { author: "alex", shop: "Cha House", drink: "Matcha Red Bean", rating: 4, daysAgo: 31, sweetness: 50, ice: "less", toppings: ["Red bean"] },

  // taylor: mia sent them a friend request
  { author: "taylor", shop: "Wheat", drink: "Black Sesame Latte", rating: 4.5, daysAgo: 3, sweetness: 50, ice: "none", note: "Nutty and rich." },
  { author: "taylor", shop: "Yaya Tea Durham", drink: "Wintermelon Lemonade", rating: 3.5, daysAgo: 11, sweetness: 75, ice: "extra" },
  { author: "taylor", shop: "Chill Bubble Tea", drink: "Strawberry Milk Tea", rating: 4, daysAgo: 23, sweetness: 50, ice: "regular", toppings: ["Popping boba"] },
  { author: "taylor", shop: "Moge Tee", drink: "Mango Pomelo Sago", rating: 5, daysAgo: 37, sweetness: 50, ice: "less", toppings: ["Coconut jelly"] },

  // casey: a stranger to mia
  { author: "casey", shop: "Cha House", drink: "Okinawa Milk Tea", rating: 4, daysAgo: 1, sweetness: 50, ice: "less", toppings: ["Boba"], note: "Casey's secret pick." },
  { author: "casey", shop: "Moge Tee", drink: "Brown Sugar Boba Milk", rating: 2.5, daysAgo: 5, sweetness: 100, ice: "regular", toppings: ["Boba"], note: "Way too sweet for me." },
  { author: "casey", shop: "Quickly Tea House", drink: "Almond Milk Tea", rating: 3.5, daysAgo: 14, sweetness: 50, ice: "regular", toppings: ["Pudding"] },
  { author: "casey", shop: "Yaya Tea", drink: "Lychee Oolong", rating: 4, daysAgo: 21, sweetness: 25, ice: "less", toppings: ["Lychee jelly"] },
  { author: "casey", shop: "Wheat", drink: "Chai Latte", rating: 4.5, daysAgo: 34, sweetness: 50, ice: "none" },
];
