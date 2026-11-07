"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";

import { AvatarPicker } from "@/components/profiles/avatar-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ImageChoice, setImageChoice } from "@/lib/images/upload";
import { type EditProfileState, updateProfile } from "@/lib/profiles/actions";
import { AVATAR_FIELD } from "@/lib/profiles/avatars";
import { DISPLAY_NAME_MAX } from "@/lib/profiles/validation";

/** Edits the signed-in user's display name and avatar. */
export function EditProfileForm({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(updateProfile, {
    displayName,
    errors: {},
  } satisfies EditProfileState);
  const [avatar, setAvatar] = useState<ImageChoice>({ status: "unchanged" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const nameError = `${formId}-displayName-error`;
  const avatarError = `${formId}-avatar-error`;

  return (
    <form
      // The avatar lives in state (React resets file inputs after an action).
      action={(formData) => {
        setImageChoice(formData, AVATAR_FIELD, avatar);
        formAction(formData);
      }}
      className="space-y-6"
      noValidate
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">Avatar</p>
        <AvatarPicker
          initialUrl={avatarUrl}
          onChange={setAvatar}
          onBusyChange={setAvatarBusy}
          describedBy={state.errors.avatar ? avatarError : undefined}
        />
        {state.errors.avatar && (
          <p id={avatarError} className="text-sm text-destructive">
            {state.errors.avatar}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-displayName`}>Display name</Label>
        <Input
          id={`${formId}-displayName`}
          name="displayName"
          defaultValue={state.displayName}
          autoComplete="name"
          maxLength={DISPLAY_NAME_MAX}
          aria-invalid={state.errors.displayName ? true : undefined}
          aria-describedby={state.errors.displayName ? nameError : undefined}
          required
        />
        {state.errors.displayName && (
          <p id={nameError} className="text-sm text-destructive">
            {state.errors.displayName}
          </p>
        )}
      </div>

      {state.errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {state.errors.form}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending || avatarBusy}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/profile">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
