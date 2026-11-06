"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, Home, User, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/log", label: "Log", icon: CirclePlus, prominent: true },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Main navigation. A fixed bottom tab bar on mobile; an inline pill row in
 * the header on desktop (md and up).
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur",
        "md:static md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none",
      )}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4 md:flex md:gap-1">
        {tabs.map(({ href, label, icon: Icon, ...tab }) => {
          const active = isActive(pathname, href);
          const prominent = "prominent" in tab && tab.prominent;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-xs font-semibold text-muted-foreground transition-colors",
                  "md:flex-row md:gap-1.5 md:rounded-full md:px-3 md:py-1.5 md:text-sm md:hover:bg-accent",
                  active && "text-primary md:bg-matcha-100",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-6 md:size-4",
                    prominent && "text-primary",
                  )}
                  strokeWidth={prominent ? 2.5 : 2}
                />
                <span>
                  {prominent && <span aria-hidden>+ </span>}
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
