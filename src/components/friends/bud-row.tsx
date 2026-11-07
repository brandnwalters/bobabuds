import Link from "next/link";

import { Avatar } from "@/components/profiles/avatar";
import type { Bud } from "@/lib/profiles/people";

/**
 * One person in a Friends page list: avatar, display name (linking to their
 * Profile) and @username, with actions on the right.
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
      <Avatar url={bud.avatarUrl} displayName={bud.displayName} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/u/${bud.username}`}
          className="block truncate font-bold underline-offset-2 hover:underline"
        >
          {bud.displayName}
        </Link>
        <p className="truncate text-sm text-muted-foreground">@{bud.username}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}
