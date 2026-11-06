"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * A one-button form that runs a friends server action (already bound to the
 * other user's id). Disabled while it runs so a double tap doesn't repeat it.
 */
export function ActionButton({
  action,
  children,
  variant = "default",
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <form action={action}>
      <SubmitButton variant={variant}>{children}</SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "default" | "outline" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      className="rounded-full"
      disabled={pending}
    >
      {children}
    </Button>
  );
}
