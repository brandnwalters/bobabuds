"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, type SendMagicLinkState } from "@/lib/auth/actions";

const initialState: SendMagicLinkState = { status: "idle" };

export function SignInForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState,
  );

  if (state.status === "sent") {
    return (
      <div role="status" className="space-y-2 text-center">
        <MailCheck aria-hidden className="mx-auto size-10 text-primary" />
        <p className="text-lg font-bold">Check your email</p>
        <p className="text-muted-foreground">
          We sent a sign-in link to{" "}
          <span className="font-semibold text-foreground">{state.email}</span>.
          Open it on this device to continue.
        </p>
      </div>
    );
  }

  const linkFailed = searchParams.get("error") === "link";
  const error =
    state.status === "error"
      ? state.message
      : linkFailed
        ? "That sign-in link is invalid or has expired. Send yourself a new one."
        : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={searchParams.get("next") ?? "/"} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          defaultValue={state.status === "error" ? state.email : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
          required
        />
        {error && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
