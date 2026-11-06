import { cn } from "@/lib/utils";

/** Up to two initials from a display name. */
export function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** Initials in a circle: the avatar fallback (decorative; show the name too). */
export function InitialsAvatar({
  displayName,
  className,
}: {
  displayName: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-milk-tea-200 font-bold text-brown-700",
        className,
      )}
    >
      {initials(displayName)}
    </span>
  );
}
