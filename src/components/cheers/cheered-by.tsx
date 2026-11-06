import Link from "next/link";
import { useId } from "react";

import type { Cheerer } from "@/lib/cheers/summary";

/** Who cheered a Log, oldest first, each linking to their Profile. */
export function CheeredBy({ cheerers }: { cheerers: Cheerer[] }) {
  const labelId = useId();
  if (cheerers.length === 0) return null;
  return (
    <div className="space-y-1">
      <p id={labelId} className="text-sm font-bold text-muted-foreground">
        Cheered by
      </p>
      <ul aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {cheerers.map((cheerer) => (
          <li key={cheerer.id}>
            <Link
              href={`/u/${cheerer.username}`}
              className="inline-block rounded-full bg-matcha-100 px-3 py-0.5 text-sm font-semibold underline-offset-2 hover:underline"
            >
              {cheerer.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
