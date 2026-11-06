"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkUsername,
  createProfile,
  type CreateProfileState,
  type UsernameCheck,
} from "@/lib/onboarding/actions";
import {
  DISPLAY_NAME_MAX,
  USERNAME_MAX,
  usernameProblem,
} from "@/lib/profiles/validation";
import { cn } from "@/lib/utils";

const initialState: CreateProfileState = {
  username: "",
  displayName: "",
  errors: {},
};

type Status = UsernameCheck | { status: "idle" | "checking"; message: string };

/** Watches the username field and reports whether it's valid and free. */
function useUsernameStatus(username: string): Status {
  const [checked, setChecked] = useState<{ username: string; result: UsernameCheck }>();
  const latest = useRef(username);

  const trimmed = username.trim();
  const problem = trimmed ? usernameProblem(trimmed) : null;

  useEffect(() => {
    latest.current = trimmed;
    if (!trimmed || problem) return;
    const timer = setTimeout(async () => {
      const result = await checkUsername(trimmed);
      // Ignore answers for a value the user has already changed.
      if (latest.current === trimmed) setChecked({ username: trimmed, result });
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmed, problem]);

  if (!trimmed) {
    return { status: "idle", message: "Letters, numbers and underscores." };
  }
  if (problem) return { status: "invalid", message: problem };
  if (checked?.username === trimmed) return checked.result;
  return { status: "checking", message: "Checking…" };
}

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createProfile,
    initialState,
  );
  const [username, setUsername] = useState(state.username);
  const status = useUsernameStatus(username);

  // A failed submit (e.g. someone took the name meanwhile) wins until edited.
  const usernameMessage =
    state.errors.username && username.trim() === state.username
      ? { status: "taken" as const, message: state.errors.username }
      : status;
  const usernameBad =
    usernameMessage.status === "invalid" || usernameMessage.status === "taken";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
          >
            @
          </span>
          <Input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={USERNAME_MAX + 5}
            className="pl-7"
            aria-invalid={usernameBad || undefined}
            aria-describedby="username-status"
            required
          />
        </div>
        <p
          id="username-status"
          data-testid="username-status"
          aria-live="polite"
          className={cn(
            "text-sm text-muted-foreground",
            usernameBad && "text-destructive",
            usernameMessage.status === "available" && "font-semibold text-primary",
          )}
        >
          {usernameMessage.message}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={state.displayName}
          autoComplete="name"
          maxLength={DISPLAY_NAME_MAX}
          placeholder="What your buds call you"
          aria-invalid={state.errors.displayName ? true : undefined}
          aria-describedby={
            state.errors.displayName ? "displayName-error" : undefined
          }
          required
        />
        {state.errors.displayName && (
          <p id="displayName-error" className="text-sm text-destructive">
            {state.errors.displayName}
          </p>
        )}
      </div>

      {state.errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {state.errors.form}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || usernameBad}
      >
        {pending ? "Saving…" : "Finish setup"}
      </Button>
    </form>
  );
}
