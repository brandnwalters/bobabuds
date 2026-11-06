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

import { SEEDED_USERS, seededEmail } from "../src/lib/dev/seed-users.ts";

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

for (const user of SEEDED_USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: seededEmail(user.username),
    email_confirm: true,
    app_metadata: { seeded: true },
  });
  if (error) throw error;

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
