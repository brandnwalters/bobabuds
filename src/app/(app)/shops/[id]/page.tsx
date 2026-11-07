import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { FeedCard } from "@/components/feed/feed-card";
import { Stars } from "@/components/logs/stars";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getShopPage } from "@/lib/shops/queries";

export const metadata: Metadata = { title: "Shop · Boba Buds" };

export default function ShopPage({ params }: PageProps<"/shops/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <Shop params={params} />
    </Suspense>
  );
}

async function Shop({ params }: { params: PageProps<"/shops/[id]">["params"] }) {
  const { id } = await params;
  // Per-request: the Supabase session check reads the clock.
  await connection();
  const page = await getShopPage(id);
  if (!page) notFound();
  const { shop, logs, averageRating } = page;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{shop.name}</h1>
          <p className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            {shop.formattedAddress}
          </p>
        </div>
        {averageRating !== null && (
          <AverageRating rating={averageRating} count={logs.length} />
        )}
        <Button asChild variant="secondary">
          <a href={shop.googleMapsUrl} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
        </Button>
      </div>

      <section aria-labelledby="shop-logs-heading" className="space-y-3">
        <h2 id="shop-logs-heading" className="text-lg font-extrabold">
          What your buds had here
        </h2>
        {logs.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 text-center">
              <p className="text-lg font-bold">No Logs here yet</p>
              <p className="text-muted-foreground">
                Neither you nor your friends have logged a drink at {shop.name}.
                Be the first!
              </p>
              <Button asChild>
                <Link href="/log">Log a drink</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul aria-label="Logs at this shop" className="space-y-4">
            {logs.map((log) => (
              <li key={log.id}>
                <FeedCard log={log} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AverageRating({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating * 10) / 10;
  return (
    <div
      role="group"
      aria-label="Average rating"
      className="flex flex-wrap items-center gap-2"
    >
      {/* Stars show the nearest half star, so only the number is announced. */}
      <span aria-hidden className="contents">
        <Stars rating={Math.round(rating * 2) / 2} />
      </span>
      <span data-testid="average-rating-value" className="text-lg font-extrabold">
        {rounded.toFixed(1)}
      </span>
      <span className="sr-only">out of 5 stars,</span>
      <span className="text-sm text-muted-foreground">
        from {count} {count === 1 ? "Log" : "Logs"}
      </span>
    </div>
  );
}
