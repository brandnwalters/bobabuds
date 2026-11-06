import { MapPin } from "lucide-react";
import Link from "next/link";

import { TimeAgo } from "@/components/feed/time-ago";
import { Stars } from "@/components/logs/stars";
import { InitialsAvatar } from "@/components/profiles/initials-avatar";
import { ICE_LABELS } from "@/lib/logs/fields";
import type { FeedLog } from "@/lib/logs/queries";

/**
 * One Log in the Feed: author and how long ago, drink (links to the Log),
 * shop (links to the Shop Page), rating, sweetness/ice and note. Renders on
 * the server and in the browser (scroll-to-load), so keep it hook-free.
 */
export function FeedCard({ log }: { log: FeedLog }) {
  const headingId = `feed-log-${log.id}`;
  const extras = [
    log.sweetness !== null ? `${log.sweetness}% sweet` : null,
    log.ice ? ICE_LABELS[log.ice] : null,
  ].filter((extra): extra is string => extra !== null);
  const profileHref = `/u/${log.author.username}`;

  return (
    <article
      aria-labelledby={headingId}
      className="space-y-3 rounded-2xl border bg-card p-4"
    >
      <header className="flex items-center gap-3">
        <Link href={profileHref} tabIndex={-1} aria-hidden>
          <InitialsAvatar displayName={log.author.displayName} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={profileHref}
            className="block truncate font-bold underline-offset-2 hover:underline"
          >
            {log.author.displayName}
          </Link>
          <TimeAgo
            dateTime={log.createdAt}
            className="block text-sm text-muted-foreground"
          />
        </div>
      </header>

      <div className="space-y-1">
        <h2 id={headingId} className="text-lg font-extrabold leading-tight">
          <Link href={`/logs/${log.id}`} className="underline-offset-2 hover:underline">
            {log.drinkName}
          </Link>
        </h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin aria-hidden className="size-4 shrink-0 text-primary" />
          <Link
            href={`/shops/${log.shop.id}`}
            className="truncate font-semibold text-foreground underline-offset-2 hover:underline"
          >
            {log.shop.name}
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Stars rating={log.rating} />
        {extras.length > 0 && (
          <ul aria-label="Order details" className="flex flex-wrap gap-2">
            {extras.map((extra) => (
              <li
                key={extra}
                className="rounded-full bg-secondary px-3 py-0.5 text-sm font-semibold"
              >
                {extra}
              </li>
            ))}
          </ul>
        )}
      </div>

      {log.note && (
        <p className="rounded-xl bg-milk-tea-100 p-3 whitespace-pre-wrap">{log.note}</p>
      )}
    </article>
  );
}
