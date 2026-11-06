"use client";

import { useState } from "react";

import { StarIcon } from "@/components/logs/stars";
import { cn } from "@/lib/utils";

function starsLabel(value: number) {
  return value === 1 ? "1 star" : `${value} stars`;
}

/**
 * 1–5 stars with half stars: each star's left half picks x.5, its right half
 * picks the whole star. Native radios (name="rating"), so it submits with the
 * form and works with the keyboard.
 */
export function StarRatingInput({
  value,
  onChange,
  invalid,
  describedBy,
  labelledBy,
}: {
  value: number | null;
  onChange: (value: number) => void;
  invalid?: boolean;
  describedBy?: string;
  labelledBy: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="flex items-center gap-3"
      onMouseLeave={() => setHover(null)}
    >
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="relative size-10">
            <StarIcon
              fill={Math.max(0, Math.min(1, shown - (star - 1)))}
              className="size-10 p-0.5"
            />
            {[star - 0.5, star].map((option, i) => (
              <label
                key={option}
                className={cn(
                  "absolute inset-y-0 w-1/2 cursor-pointer rounded-sm has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  i === 0 ? "left-0" : "right-0",
                )}
                onMouseEnter={() => setHover(option)}
              >
                <input
                  type="radio"
                  name="rating"
                  value={option}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
                />
                <span className="sr-only">{starsLabel(option)}</span>
              </label>
            ))}
          </span>
        ))}
      </div>
      <span aria-hidden className="text-sm font-semibold text-muted-foreground tabular-nums">
        {value ? `${value} / 5` : ""}
      </span>
    </div>
  );
}
