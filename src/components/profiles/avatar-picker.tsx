"use client";

import { ImagePicker } from "@/components/images/image-picker";
import type { ImageChoice } from "@/lib/images/upload";
import { AVATAR_MAX_EDGE, AVATAR_PICKER_LABELS } from "@/lib/profiles/avatars";

/**
 * Picks an optional avatar (resized in the browser, round preview). Put the
 * choice into the form data with `setImageChoice(formData, AVATAR_FIELD, …)`.
 */
export function AvatarPicker({
  initialUrl,
  onChange,
  onBusyChange,
  describedBy,
}: {
  initialUrl?: string | null;
  onChange: (choice: ImageChoice) => void;
  onBusyChange?: (busy: boolean) => void;
  describedBy?: string;
}) {
  return (
    <ImagePicker
      initialUrl={initialUrl}
      maxEdge={AVATAR_MAX_EDGE}
      labels={AVATAR_PICKER_LABELS}
      onChange={onChange}
      onBusyChange={onBusyChange}
      describedBy={describedBy}
      previewClassName="size-24 max-h-none rounded-full"
    />
  );
}
