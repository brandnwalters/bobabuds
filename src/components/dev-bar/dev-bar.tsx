import { connection } from "next/server";
import { Suspense } from "react";

import { DevBarMenu } from "@/components/dev-bar/dev-bar-menu";
import { devToolsEnabled } from "@/lib/dev/dev-tools";
import { SEEDED_USERS } from "@/lib/dev/seed-users";
import { createClient, getViewerId } from "@/lib/supabase/server";

/**
 * Floating dev-only user switcher. Renders nothing unless `DEV_TOOLS=true`.
 */
export function DevBar() {
  return (
    // No fallback: swapping a placeholder for the streamed bar would close a
    // menu the user had already opened.
    <Suspense>
      <DevBarWithCurrentUser />
    </Suspense>
  );
}

async function DevBarWithCurrentUser() {
  // Check DEV_TOOLS per request, not at build time in the static shell, so
  // the bar matches what the sign-in route allows on this deployment.
  await connection();
  if (!devToolsEnabled()) return null;

  const supabase = await createClient();
  const userId = await getViewerId(supabase);
  let current: { username: string } | "no profile" | null = null;
  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();
    current = data ? { username: data.username } : "no profile";
  }
  return <DevBarMenu users={SEEDED_USERS} current={current} />;
}
