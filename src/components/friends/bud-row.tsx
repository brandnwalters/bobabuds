import { InitialsAvatar } from "@/components/profiles/initials-avatar";
import type { Bud } from "@/lib/friends/queries";

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
      <InitialsAvatar displayName={bud.displayName} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{bud.displayName}</p>
        <p className="truncate text-sm text-muted-foreground">@{bud.username}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}
