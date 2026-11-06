import "server-only";

import { type FeedLog, listShopLogs } from "@/lib/logs/queries";
import type { ShopDetails } from "@/lib/places/types";
import { createClient } from "@/lib/supabase/server";

export type ShopPage = {
  shop: ShopDetails & { id: string };
  /** Logs at the shop the viewer can see, newest first. */
  logs: FeedLog[];
  /** Mean rating over `logs`, or null when there are none. */
  averageRating: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A shop with the Logs at it the signed-in user can view and their average
 * rating, or null for an unknown shop. Shop details are not private; the
 * Logs (and so the average) are limited by row-level security.
 */
export async function getShopPage(id: string): Promise<ShopPage | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const [{ data: shop, error }, logs] = await Promise.all([
    supabase
      .from("shops")
      .select("id, place_id, name, formatted_address, latitude, longitude, google_maps_url")
      .eq("id", id)
      .maybeSingle(),
    listShopLogs(id),
  ]);
  if (error) throw error;
  if (!shop) return null;

  return {
    shop: {
      id: shop.id,
      placeId: shop.place_id,
      name: shop.name,
      formattedAddress: shop.formatted_address,
      latitude: shop.latitude,
      longitude: shop.longitude,
      googleMapsUrl: shop.google_maps_url,
    },
    logs,
    averageRating:
      logs.length > 0
        ? logs.reduce((sum, log) => sum + log.rating, 0) / logs.length
        : null,
  };
}
