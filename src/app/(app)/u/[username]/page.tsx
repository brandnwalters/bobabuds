import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProfileView } from "@/components/profiles/profile-view";
import { getProfile } from "@/lib/profiles/queries";

export const metadata: Metadata = { title: "Profile · Boba Buds" };

/** Anyone's Profile: the full view for yourself and friends, else limited. */
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
  const profile = await getProfile(username);
  if (!profile) notFound();
  return <ProfileView profile={profile} />;
}
