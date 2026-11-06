import { Star } from "lucide-react";

import { ratingLabel } from "@/lib/logs/fields";
import { cn } from "@/lib/utils";

/** One star filled by `fill` (0, 0.5 or 1). */
export function StarIcon({ fill, className }: { fill: number; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-block size-5", className)}>
      <Star className="absolute inset-0 size-full text-milk-tea-300" strokeWidth={1.75} />
      {fill > 0 && (
        <Star
          className="absolute inset-0 size-full fill-amber-400 text-amber-500"
          strokeWidth={1.75}
          style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
        />
      )}
    </span>
  );
}

/** A read-only star rating, announced as e.g. "4.5 out of 5 stars". */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={ratingLabel(rating)}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} fill={Math.max(0, Math.min(1, rating - (n - 1)))} />
      ))}
    </span>
  );
}
