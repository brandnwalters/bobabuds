import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/app/sign-in/sign-in-form";

export const metadata: Metadata = { title: "Sign in · Boba Buds" };

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Your boba journal, shared with your buds. We'll email you a link, no password needed."
    >
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
