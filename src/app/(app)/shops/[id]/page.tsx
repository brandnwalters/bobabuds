import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Shop · Boba Buds" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Basic placeholder linked from Feed cards; the Shop Pages ticket (#13) adds
// the visible Logs, their average rating and the empty state.
export default function ShopPage({ params }: PageProps<"/shops/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <Shop params={params} />
    </Suspense>
  );
}

async function Shop({ params }: { params: PageProps<"/shops/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  // Per-request: the Supabase session check reads the clock.
  await connection();
  const supabase = await createClient();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("name, formatted_address, google_maps_url")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!shop) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">{shop.name}</h1>
        <p className="flex items-start gap-1.5 text-muted-foreground">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          {shop.formatted_address}
        </p>
      </div>
      <Button asChild variant="secondary">
        <a href={shop.google_maps_url} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </Button>
      <Card>
        <CardContent className="text-muted-foreground">
          What your buds thought of this shop is coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
