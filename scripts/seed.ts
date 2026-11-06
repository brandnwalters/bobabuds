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
import { SEEDED_LOGS } from "../src/lib/dev/seed-logs.ts";
import { SEEDED_CHEERS } from "../src/lib/dev/seed-cheers.ts";
import { DEV_FALLBACK_SHOPS } from "../src/lib/places/fallback.ts";

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

// Shops and Logs -------------------------------------------------------------
// Shops come from the shop picker's fallback list, so tests that pick "Moge
// Tee" log at the same row the seeded Logs use.

const { data: shops, error: shopsError } = await admin
  .from("shops")
  .insert(
    DEV_FALLBACK_SHOPS.map((shop) => ({
      place_id: shop.placeId,
      name: shop.name,
      formatted_address: shop.formattedAddress,
      latitude: shop.latitude,
      longitude: shop.longitude,
      google_maps_url: shop.googleMapsUrl,
    })),
  )
  .select("id, name");
if (shopsError) throw shopsError;
const shopIdByName = new Map(shops.map((shop) => [shop.name, shop.id]));

const HOUR = 60 * 60 * 1000;
const seedTime = Date.now();
const { error: logsError } = await admin.from("logs").insert(
  SEEDED_LOGS.map((log, index) => {
    const shopId = shopIdByName.get(log.shop);
    if (!shopId) throw new Error(`Seeded Log at unknown shop "${log.shop}"`);
    // A few hours apart within a day, so the Feed order is deterministic.
    const created = new Date(seedTime - log.daysAgo * 24 * HOUR - (1 + (index % 8)) * HOUR);
    return {
      author_id: idOf(log.author),
      shop_id: shopId,
      drink_name: log.drink,
      rating: log.rating,
      drank_on: created.toISOString().slice(0, 10),
      sweetness: log.sweetness ?? null,
      ice: log.ice ?? null,
      toppings: log.toppings ?? [],
      note: log.note ?? null,
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
    };
  }),
);
if (logsError) throw logsError;

console.log(`Seeded ${shops.length} shops and ${SEEDED_LOGS.length} logs`);

// Cheers ---------------------------------------------------------------------
// Only on Logs the cheerer could see: their friend's (checked here, since the
// service-role client bypasses the access rules).

const { data: seededLogRows, error: seededLogsError } = await admin
  .from("logs")
  .select("id, author_id, drink_name");
if (seededLogsError) throw seededLogsError;
const logIdByAuthorAndDrink = new Map(
  seededLogRows.map((log) => [`${log.author_id}|${log.drink_name}`, log.id]),
);
const areSeededFriends = (a: SeededUsername, b: SeededUsername) =>
  SEEDED_FRIENDSHIPS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );

const cheers = SEEDED_CHEERS.flatMap(({ author, drink, by }) => {
  const logId = logIdByAuthorAndDrink.get(`${idOf(author)}|${drink}`);
  if (!logId) throw new Error(`Seeded Cheers on unknown Log "${drink}" by @${author}`);
  return by.map((cheerer) => {
    if (!areSeededFriends(author, cheerer)) {
      throw new Error(`@${cheerer} can't see @${author}'s Logs to cheer "${drink}"`);
    }
    return { log_id: logId, user_id: idOf(cheerer) };
  });
});
const { error: cheersError } = await admin.from("cheers").insert(cheers);
if (cheersError) throw cheersError;

console.log(`Seeded ${cheers.length} cheers`);
