import { Suspense } from "react";

import { pendingIncomingCount } from "@/lib/friends/queries";

/**
 * The Friends tab badge: how many Friend Requests are waiting for the
 * signed-in user. Renders nothing when there are none.
 */
export function FriendsBadge() {
  return (
    <Suspense>
      <PendingCount />
    </Suspense>
  );
}

async function PendingCount() {
  const count = await pendingIncomingCount();
  if (count === 0) return null;
  const label = `${count} pending friend request${count === 1 ? "" : "s"}`;

  return (
    <>
      <span
        aria-hidden
        className="absolute top-1 left-1/2 ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-taro px-1.5 text-[0.7rem] leading-none font-bold text-taro-foreground md:static md:ml-0"
      >
        {count > 99 ? "99+" : count}
      </span>
      <span className="sr-only">({label})</span>
    </>
  );
}
