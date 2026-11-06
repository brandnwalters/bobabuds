import Link from "next/link";

import { Stars } from "@/components/logs/stars";
import { formatDrankOn } from "@/lib/logs/fields";
import type { LogWithShop } from "@/lib/logs/queries";

/** A compact, tappable row for a Log in a list (e.g. the Profile). */
export function LogListItem({ log }: { log: LogWithShop }) {
  return (
    <Link
      href={`/logs/${log.id}`}
      className="block rounded-2xl border bg-card p-4 transition-colors hover:bg-accent"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate font-bold">{log.drinkName}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {log.shop.name}
          </span>
        </span>
        <time dateTime={log.drankOn} className="shrink-0 text-sm text-muted-foreground">
          {formatDrankOn(log.drankOn)}
        </time>
      </span>
      <Stars rating={log.rating} className="mt-2" />
    </Link>
  );
}
