import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EditProfileForm } from "@/components/profiles/edit-profile-form";
import { getMyProfile } from "@/lib/profiles/queries";

export const metadata: Metadata = { title: "Edit profile · Boba Buds" };

export default function EditProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Edit profile</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <EditMyProfile />
      </Suspense>
    </div>
  );
}

async function EditMyProfile() {
  const profile = await getMyProfile();
  if (!profile) notFound();
  const { displayName, avatarPath } = profile.person;
  return (
    <EditProfileForm
      // Next keeps visited pages alive (Activity), and a form only reads its
      // initial values once: start fresh whenever the saved profile changed.
      key={`${displayName}|${avatarPath}`}
      displayName={profile.person.displayName}
      avatarUrl={profile.person.avatarUrl}
    />
  );
}
