/**
 * The seeded users created by `pnpm seed`. The only accounts the Dev Bar and
 * its sign-in route will sign in as. `relation` describes each user relative
 * to the main test user, mia (seeded below in SEEDED_FRIENDSHIPS and
 * SEEDED_FRIEND_REQUESTS).
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

/**
 * Seeded Friendships and pending Friend Requests, matching each user's
 * `relation` above. jordan and priya are also friends with each other. casey
 * has no connections at all.
 */
export const SEEDED_FRIENDSHIPS: readonly [SeededUsername, SeededUsername][] = [
  ["mia", "jordan"],
  ["mia", "priya"],
  ["mia", "sam"],
  ["jordan", "priya"],
];

/** Pending requests as [sender, recipient]. */
export const SEEDED_FRIEND_REQUESTS: readonly [SeededUsername, SeededUsername][] =
  [
    ["alex", "mia"],
    ["mia", "taylor"],
  ];

/** Seeded users sign in by email only through the Dev Bar; nobody reads it. */
export function seededEmail(username: SeededUsername) {
  return `${username}@seed.bobabuds.test`;
}

/**
 * `POST ?as=new` on the dev sign-in route (the Dev Bar's "New user" entry) creates
 * a fresh account flagged as seeded but with no profile, so it lands on
 * onboarding. Lets the setup step be checked on a preview, with no email.
 */
export const NEW_DEV_USER = "new";

/** A unique email for a fresh dev account. */
export function newDevUserEmail() {
  return `new-${crypto.randomUUID()}@seed.bobabuds.test`;
}

/** The seeded user with this username, or undefined for anyone else. */
export function findSeededUser(username: unknown): SeededUser | undefined {
  return SEEDED_USERS.find((user) => user.username === username);
}
