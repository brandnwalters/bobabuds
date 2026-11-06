import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogListItem } from "@/components/logs/log-list-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listMyLogs } from "@/lib/logs/queries";
import { createClient } from "@/lib/supabase/server";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <MyProfile />
      </Suspense>
      <SignOutButton />
    </div>
  );
}

async function MyProfile() {
  // Per-request: the Supabase session check reads the clock.
  await connection();
  const supabase = await createClient();
  const userId = (await supabase.auth.getClaims()).data?.claims.sub;
  const [{ data: profile }, logs] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", userId ?? "")
      .maybeSingle(),
    listMyLogs(),
  ]);

  return (
    <>
      {profile && (
        <div>
          <p className="text-xl font-bold">{profile.display_name}</p>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>
      )}

      <section aria-labelledby="my-logs" className="space-y-3">
        <h2 id="my-logs" className="text-lg font-extrabold">
          My Logs
        </h2>
        {logs.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 text-center">
              <p className="text-muted-foreground">
                No Logs yet. What was your last boba?
              </p>
              <Button asChild>
                <Link href="/log">Log a drink</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li key={log.id}>
                <LogListItem log={log} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
