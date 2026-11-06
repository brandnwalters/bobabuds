"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { FeedCard } from "@/components/feed/feed-card";
import { Button } from "@/components/ui/button";
import { loadMoreFeed } from "@/lib/feed/actions";
import type { FeedPage } from "@/lib/logs/queries";

/**
 * The Feed's cards, starting from the server-rendered first page. Loads the
 * next page when the end of the list scrolls into view (or the button is
 * pressed, for keyboard users and when the observer isn't available).
 */
export function FeedList({ firstPage }: { firstPage: FeedPage }) {
  const [logs, setLogs] = useState(firstPage.logs);
  const [cursor, setCursor] = useState(firstPage.nextCursor);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!cursor || pending) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const page = await loadMoreFeed(cursor);
        setLogs((current) => {
          const seen = new Set(current.map((log) => log.id));
          return [...current, ...page.logs.filter((log) => !seen.has(log.id))];
        });
        setCursor(page.nextCursor);
      } catch {
        setFailed(true);
      }
    });
  }, [cursor, pending]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !cursor || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [cursor, failed, loadMore]);

  return (
    <div className="space-y-4">
      <ul aria-label="Logs" className="space-y-4">
        {logs.map((log) => (
          <li key={log.id}>
            <FeedCard log={log} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="flex flex-col items-center gap-2 py-2">
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t load more Logs.
          </p>
        )}
        {cursor ? (
          <Button variant="secondary" onClick={loadMore} disabled={pending}>
            {pending ? "Loading…" : failed ? "Try again" : "Load more"}
          </Button>
        ) : (
          logs.length > 0 && (
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          )
        )}
      </div>
    </div>
  );
}
