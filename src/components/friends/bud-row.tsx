import type { Bud } from "@/lib/friends/queries";

/** Up to two initials from a display name, for the avatar fallback. */
function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/**
 * One person in a Friends page list: initials avatar, display name and
 * @username, with actions on the right.
 */
export function BudRow({
  bud,
  children,
}: {
  bud: Bud;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-milk-tea-200 font-bold text-brown-700"
      >
        {initials(bud.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{bud.displayName}</p>
        <p className="truncate text-sm text-muted-foreground">@{bud.username}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}
