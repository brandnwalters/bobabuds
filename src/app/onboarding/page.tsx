import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";

export const metadata: Metadata = { title: "Set up your profile · Boba Buds" };

export default function OnboardingPage() {
  return (
    <AuthCard
      title="Set up your profile"
      description="Pick a @username so your buds can find you, and the name they'll see."
    >
      <OnboardingForm />
    </AuthCard>
  );
}
