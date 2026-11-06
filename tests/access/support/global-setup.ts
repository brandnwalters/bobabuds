import { execFileSync } from "node:child_process";

import type { TestProject } from "vitest/node";

export type SupabaseTestEnv = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

declare module "vitest" {
  export interface ProvidedContext {
    supabase: SupabaseTestEnv;
  }
}

/**
 * Reads the local Supabase URL and keys from `supabase status` so the access
 * tests need no .env file. Fails fast with a hint if Supabase isn't running.
 */
export default function setup(project: TestProject) {
  let raw: string;
  try {
    raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "Local Supabase is not running. Start it with `pnpm db:start` first.",
    );
  }

  const status = JSON.parse(raw) as Record<string, string>;
  project.provide("supabase", {
    url: status.API_URL,
    publishableKey: status.PUBLISHABLE_KEY,
    secretKey: status.SECRET_KEY,
  });
}
