import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Access-rule tests: talk directly to the local Supabase as different users to
// check row-level security, plus the dev sign-in route's guards. Requires
// `pnpm db:start` and `pnpm seed` first.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Lets tests import server modules (e.g. route handlers) outside Next.
    alias: {
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    include: ["tests/access/**/*.test.ts"],
    globalSetup: ["tests/access/support/global-setup.ts"],
    // Tests share one database; run files one at a time so fixtures don't race.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
