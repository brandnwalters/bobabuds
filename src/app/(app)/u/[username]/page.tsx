import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { InitialsAvatar } from "@/components/profiles/initials-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile · Boba Buds" };

// Basic placeholder linked from Feed cards; the Profiles ticket (#12) replaces
// it with the full/limited views, stats and the relationship button.
export default function UserProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <UserProfile params={params} />
    </Suspense>
  );
}

async function UserProfile({
  params,
}: {
  params: PageProps<"/u/[username]">["params"];
}) {
  const { username } = await params;
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) notFound();
  // Per-request: the Supabase session check reads the clock.
  await connection();
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name")
    // Usernames are unique case-insensitively; escape `_` for ilike.
    .ilike("username", username.replaceAll("_", "\\_"))
    .maybeSingle();
  if (error) throw error;
  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <InitialsAvatar displayName={profile.display_name} className="size-16 text-xl" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            {profile.display_name}
          </h1>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>
      </div>
      <Card>
        <CardContent className="text-muted-foreground">
          Their boba journal is coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
