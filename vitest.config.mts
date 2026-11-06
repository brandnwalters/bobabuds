import { defineConfig } from "vitest/config";

// Access-rule tests: talk directly to the local Supabase as different users to
// check row-level security. Requires `pnpm db:start` first.
export default defineConfig({
  test: {
    include: ["tests/access/**/*.test.ts"],
    globalSetup: ["tests/access/support/global-setup.ts"],
    // Tests share one database; run files one at a time so fixtures don't race.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
