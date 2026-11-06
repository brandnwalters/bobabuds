/**
 * The seeded users created by `pnpm seed`. The only accounts the Dev Bar and
 * its sign-in route will sign in as. `relation` describes each user relative
 * to the main test user, mia, once later seed data adds relationships.
 *
 * Kept free of imports so the seed script can load it with plain Node.
 */
export const SEEDED_USERS = [
  { username: "mia", displayName: "Mia Chen", relation: "main test user" },
  { username: "jordan", displayName: "Jordan Lee", relation: "friend" },
  { username: "priya", displayName: "Priya Patel", relation: "friend" },
  { username: "sam", displayName: "Sam Rivera", relation: "friend" },
  {
    username: "alex",
    displayName: "Alex Kim",
    relation: "sent mia a friend request",
  },
  {
    username: "taylor",
    displayName: "Taylor Brooks",
    relation: "mia sent them a friend request",
  },
  { username: "casey", displayName: "Casey Nguyen", relation: "stranger" },
] as const;

export type SeededUser = (typeof SEEDED_USERS)[number];
export type SeededUsername = SeededUser["username"];

/** Seeded users sign in by email only through the Dev Bar; nobody reads it. */
export function seededEmail(username: SeededUsername) {
  return `${username}@seed.bobabuds.test`;
}

/** The seeded user with this username, or undefined for anyone else. */
export function findSeededUser(username: unknown): SeededUser | undefined {
  return SEEDED_USERS.find((user) => user.username === username);
}
