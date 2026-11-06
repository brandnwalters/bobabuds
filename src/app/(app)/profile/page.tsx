import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileView } from "@/components/profiles/profile-view";
import { getMyProfile } from "@/lib/profiles/queries";

/** The signed-in user's own Profile: their boba journal. */
export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <MyProfile />
      </Suspense>
      <SignOutButton />
    </div>
  );
}

async function MyProfile() {
  const profile = await getMyProfile();
  // The proxy sends users without a profile to onboarding first.
  if (!profile) notFound();
  return <ProfileView profile={profile} />;
}
