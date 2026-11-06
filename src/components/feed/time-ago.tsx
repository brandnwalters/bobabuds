"use client";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

const format = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday", ... */
function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return format.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}

/** How long ago `dateTime` was, with the exact time as a tooltip. */
export function TimeAgo({
  dateTime,
  className,
}: {
  dateTime: string;
  className?: string;
}) {
  return (
    <time
      dateTime={dateTime}
      title={new Date(dateTime).toLocaleString("en-US")}
      className={className}
      // Server and browser render a moment (and maybe a time zone) apart.
      suppressHydrationWarning
    >
      {timeAgo(dateTime)}
    </time>
  );
}
