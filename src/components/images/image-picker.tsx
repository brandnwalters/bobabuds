"use client";

import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { type ImageChoice, resizeImage } from "@/lib/images/upload";
import { cn } from "@/lib/utils";

export type ImagePickerLabels = {
  add: string;
  replace: string;
  remove: string;
  /** Alt text of the preview. */
  preview: string;
};

/**
 * Picks one optional image: the user can add, replace or remove it and sees a
 * preview. Picked files are resized in the browser (long edge `maxEdge`)
 * before `onChange` gets them; put the choice into the form data with
 * `setImageChoice` when submitting. `initialUrl` is the current image (e.g.
 * a signed URL) when editing. Reusable for avatars (`previewClassName`).
 */
export function ImagePicker({
  initialUrl,
  maxEdge,
  labels,
  onChange,
  onBusyChange,
  previewClassName,
  describedBy,
}: {
  initialUrl?: string | null;
  maxEdge: number;
  labels: ImagePickerLabels;
  onChange: (choice: ImageChoice) => void;
  onBusyChange?: (busy: boolean) => void;
  previewClassName?: string;
  describedBy?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Object URLs we created must be released when replaced or unmounted.
  useEffect(() => {
    if (!previewUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function setBusyState(value: boolean) {
    setBusy(value);
    onBusyChange?.(value);
  }

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Clear it so picking the same file again still fires a change.
    input.value = "";
    if (!file) return;
    setProblem(null);
    setBusyState(true);
    try {
      const resized = await resizeImage(file, { maxEdge });
      setPreviewUrl(URL.createObjectURL(resized));
      onChange({ status: "new", file: resized });
    } catch {
      setProblem("We couldn't read that image. Try a JPEG, PNG or WebP photo.");
    } finally {
      setBusyState(false);
    }
  }

  function remove() {
    setProblem(null);
    setPreviewUrl(null);
    onChange(initialUrl ? { status: "removed" } : { status: "unchanged" });
  }

  return (
    <div className="space-y-3">
      {previewUrl && (
        // Signed/blob URLs: next/image optimization doesn't apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={labels.preview}
          className={cn(
            "max-h-72 w-full rounded-xl border bg-muted object-cover",
            previewClassName,
          )}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <label
          className={cn(
            "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-secondary-foreground shadow-xs transition-colors hover:bg-secondary/80",
            "focus-within:ring-[3px] focus-within:ring-ring/50",
            busy && "pointer-events-none opacity-60",
          )}
        >
          {busy ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <ImagePlus aria-hidden className="size-4" />
          )}
          {previewUrl ? labels.replace : labels.add}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={pick}
            aria-describedby={describedBy}
          />
        </label>
        {previewUrl && (
          <Button type="button" variant="ghost" onClick={remove} disabled={busy}>
            <Trash2 aria-hidden />
            {labels.remove}
          </Button>
        )}
      </div>
      {busy && <p className="text-sm text-muted-foreground">Shrinking your photo…</p>}
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
