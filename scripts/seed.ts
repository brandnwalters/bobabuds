/**
 * `pnpm seed`: resets the local database (migrations + supabase/seed.sql) and
 * creates the seeded users with their profiles. Extra arguments go to
 * `supabase db reset` (e.g. `pnpm seed --linked` for the preview project; set
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to that project's values).
 *
 * Runs with plain Node (type stripping), so imports need `.ts` extensions.
 */
import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import {
  SEEDED_FRIEND_REQUESTS,
  SEEDED_FRIENDSHIPS,
  SEEDED_USERS,
  seededEmail,
  type SeededUsername,
} from "../src/lib/dev/seed-users.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env.local.",
  );
}

console.log("Resetting the database…");
execFileSync("supabase", ["db", "reset", ...process.argv.slice(2)], {
  stdio: "inherit",
});

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ids = new Map<SeededUsername, string>();

for (const user of SEEDED_USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: seededEmail(user.username),
    email_confirm: true,
    app_metadata: { seeded: true },
  });
  if (error) throw error;
  ids.set(user.username, data.user.id);

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    username: user.username,
    display_name: user.displayName,
  });
  if (profileError) throw profileError;
}

console.log(
  `Seeded ${SEEDED_USERS.length} users: ${SEEDED_USERS.map((u) => `@${u.username}`).join(", ")}`,
);

const idOf = (username: SeededUsername) => ids.get(username)!;

const { error: friendshipsError } = await admin.from("friendships").insert(
  SEEDED_FRIENDSHIPS.map(([a, b]) => {
    // Stored once per pair, lower id first.
    const [userA, userB] = [idOf(a), idOf(b)].sort();
    return { user_a: userA, user_b: userB };
  }),
);
if (friendshipsError) throw friendshipsError;

const { error: requestsError } = await admin.from("friend_requests").insert(
  SEEDED_FRIEND_REQUESTS.map(([sender, recipient]) => ({
    sender_id: idOf(sender),
    recipient_id: idOf(recipient),
  })),
);
if (requestsError) throw requestsError;

console.log(
  `Seeded ${SEEDED_FRIENDSHIPS.length} friendships and ${SEEDED_FRIEND_REQUESTS.length} friend requests`,
);
