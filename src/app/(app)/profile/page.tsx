import { PlaceholderScreen } from "@/components/app-shell/placeholder-screen";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PlaceholderScreen title="Profile">
        Your boba journal and stats will live here.
      </PlaceholderScreen>
      <SignOutButton />
    </div>
  );
}
