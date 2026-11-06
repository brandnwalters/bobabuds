import { Wrench } from "lucide-react";

import { NEW_DEV_USER, type SeededUser } from "@/lib/dev/seed-users";
import { cn } from "@/lib/utils";

/**
 * The Dev Bar's toggle and user list. A native <details> disclosure, so it
 * works before hydration. Each user is a plain link to the dev sign-in route:
 * choosing one does a full navigation and the whole app reloads as that user.
 */
export function DevBarMenu({
  users,
  current,
}: {
  users: readonly SeededUser[];
  /** Who is signed in: a username, "no profile" (mid-onboarding) or null. */
  current: { username: string } | "no profile" | null;
}) {
  const currentUsername =
    typeof current === "object" ? (current?.username ?? null) : null;
  const label = currentUsername
    ? `@${currentUsername}`
    : typeof current === "string"
      ? current
      : "signed out";

  return (
    <aside
      aria-label="Dev Bar"
      className="fixed right-3 bottom-20 z-50 md:bottom-4"
    >
      <details className="group flex flex-col items-end">
        <summary className="ml-auto flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-full bg-taro px-3 py-1.5 text-xs font-bold text-taro-foreground shadow-lg [&::-webkit-details-marker]:hidden">
          <Wrench aria-hidden className="size-3.5" />
          <span className="sr-only">Dev Bar: </span>
          <span>{label}</span>
        </summary>
        <nav
          aria-label="Dev Bar users"
          className="absolute right-0 bottom-full mb-2 w-60 rounded-2xl border border-taro-500/40 bg-card p-2 text-sm shadow-lg"
        >
          <p className="px-2 pt-1 pb-2 text-xs font-semibold text-muted-foreground">
            Sign in as a seeded user
          </p>
          <ul>
            {users.map((user) => (
              <li key={user.username}>
                <a
                  href={`/auth/dev-sign-in?as=${user.username}`}
                  aria-current={
                    user.username === currentUsername ? "true" : undefined
                  }
                  className={cn(
                    "flex flex-col rounded-xl px-2 py-1.5 hover:bg-accent",
                    user.username === currentUsername && "bg-taro-100",
                  )}
                >
                  <span className="font-semibold">
                    {user.displayName}{" "}
                    <span className="text-muted-foreground">
                      @{user.username}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.relation}
                  </span>
                </a>
              </li>
            ))}
            <li className="mt-1 border-t border-taro-500/20 pt-1">
              <a
                href={`/auth/dev-sign-in?as=${NEW_DEV_USER}`}
                className="flex flex-col rounded-xl px-2 py-1.5 hover:bg-accent"
              >
                <span className="font-semibold">New user</span>
                <span className="text-xs text-muted-foreground">
                  fresh account, starts at setup
                </span>
              </a>
            </li>
          </ul>
        </nav>
      </details>
    </aside>
  );
}
