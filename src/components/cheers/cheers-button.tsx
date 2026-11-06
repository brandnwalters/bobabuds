"use client";

import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setCheers, type CheersState } from "@/lib/cheers/actions";
import { cheersCountLabel } from "@/lib/cheers/summary";
import { cn } from "@/lib/utils";

/**
 * The "🧋 Cheers" toggle (aria-pressed) and the Cheers count. Flips at once
 * and settles on what the server reports; reverts if the server refuses.
 */
export function CheersButton({
  logId,
  count,
  viewerCheered,
  className,
}: CheersState & { logId: string; className?: string }) {
  const [state, setState] = useState<CheersState>({ count, viewerCheered });
  const [shown, setShown] = useOptimistic(state);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !shown.viewerCheered;
    startTransition(async () => {
      setShown({
        viewerCheered: next,
        count: Math.max(0, shown.count + (next ? 1 : -1)),
      });
      const result = await setCheers(logId, next);
      if (result) startTransition(() => setState(result));
    });
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        type="button"
        size="sm"
        variant={shown.viewerCheered ? "default" : "outline"}
        aria-pressed={shown.viewerCheered}
        aria-busy={pending}
        onClick={toggle}
        className={cn(
          "rounded-full",
          !shown.viewerCheered && "border-primary text-primary hover:text-primary",
        )}
      >
        <span aria-hidden>🧋</span>
        Cheers
      </Button>
      <span aria-live="polite" className="text-sm font-semibold text-muted-foreground">
        {cheersCountLabel(shown.count)}
      </span>
    </div>
  );
}
