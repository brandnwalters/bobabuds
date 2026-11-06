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

/**
 * A person's avatar in a circle: their picture (a signed URL) or, without
 * one, their initials. Decorative by default (show the name next to it);
 * `labelled` names it "<name>'s avatar" where it should be announced.
 */
export function Avatar({
  url,
  displayName,
  labelled = false,
  className,
}: {
  url: string | null;
  displayName: string;
  labelled?: boolean;
  className?: string;
}) {
  const label = `${displayName}'s avatar`;
  const shape = "size-10 shrink-0 rounded-full";
  if (url) {
    return (
      // Signed URLs: next/image optimization doesn't apply.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={labelled ? label : ""}
        className={cn(shape, "bg-milk-tea-200 object-cover", className)}
      />
    );
  }
  return (
    <span
      {...(labelled
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
      className={cn(
        shape,
        "flex items-center justify-center bg-milk-tea-200 font-bold text-brown-700",
        className,
      )}
    >
      {initials(displayName)}
    </span>
  );
}
