import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { Stars } from "@/components/logs/stars";
import { Card, CardContent } from "@/components/ui/card";
import { formatDrankOn, ICE_LABELS } from "@/lib/logs/fields";
import type { LogWithShop } from "@/lib/logs/queries";

/** Every field of one Log. */
export function LogDetails({ log }: { log: LogWithShop }) {
  const extras = [
    log.sweetness !== null ? `${log.sweetness}% sweet` : null,
    log.ice ? ICE_LABELS[log.ice] : null,
  ].filter((extra): extra is string => extra !== null);

  return (
    <article>
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{log.drinkName}</h1>
            <p className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <Link
                  href={`/shops/${log.shop.id}`}
                  className="font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  {log.shop.name}
                </Link>
                <span className="block text-sm">{log.shop.formattedAddress}</span>
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Stars rating={log.rating} />
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays aria-hidden className="size-4" />
              <time dateTime={log.drankOn}>{formatDrankOn(log.drankOn)}</time>
            </span>
          </div>

          {(extras.length > 0 || log.toppings.length > 0) && (
            <ul aria-label="Order details" className="flex flex-wrap gap-2">
              {extras.map((extra) => (
                <li
                  key={extra}
                  className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold"
                >
                  {extra}
                </li>
              ))}
              {log.toppings.map((topping) => (
                <li
                  key={`topping-${topping}`}
                  className="rounded-full bg-taro-100 px-3 py-1 text-sm font-semibold text-taro"
                >
                  {topping}
                </li>
              ))}
            </ul>
          )}

          {log.note && (
            <p className="rounded-xl bg-milk-tea-100 p-3 whitespace-pre-wrap">{log.note}</p>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
