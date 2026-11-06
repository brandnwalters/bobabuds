import { cn } from "@/lib/utils";

/**
 * A Log's photo from its signed URL (renders nothing without one). Hook-free,
 * so it works in the server-rendered and client-rendered Feed alike.
 */
export function LogPhoto({
  url,
  drinkName,
  className,
}: {
  url: string | null;
  drinkName: string;
  className?: string;
}) {
  if (!url) return null;
  return (
    // Short-lived signed URLs: next/image optimization doesn't apply.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Photo of ${drinkName}`}
      loading="lazy"
      decoding="async"
      className={cn(
        "aspect-[4/3] w-full rounded-xl border bg-muted object-cover",
        className,
      )}
    />
  );
}
