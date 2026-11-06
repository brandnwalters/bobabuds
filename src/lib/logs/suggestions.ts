import "server-only";

import type { ShopDetails } from "@/lib/places/types";
import { createClient } from "@/lib/supabase/server";

/** The Log form's shortcuts, from the signed-in user's own Logs. */
export type LogSuggestions = {
  /** Shops they've logged at, most recently logged first, each once. */
  recentShops: ShopDetails[];
  /** Per shop place ID: drink names they've logged there, most recent first, each once (ignoring case). */
  drinksByPlaceId: Record<string, string[]>;
};

const NO_SUGGESTIONS: LogSuggestions = { recentShops: [], drinksByPlaceId: {} };

const RECENT_SHOPS_MAX = 5;
const DRINKS_PER_SHOP_MAX = 8;
/** How many of the newest Logs to scan; plenty for short shortcut lists. */
const SCAN_LIMIT = 500;

type Row = {
  drink_name: string;
  shop: {
    place_id: string;
    name: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
    google_maps_url: string;
  };
};

/**
 * Recent shops and per-shop drink suggestions, in one query. Scoped to the
 * user's OWN Logs with an explicit author filter, not to every Log row-level
 * security lets them see (which includes friends' Logs).
 */
export async function getLogSuggestions(): Promise<LogSuggestions> {
  const supabase = await createClient();
  const userId = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!userId) return NO_SUGGESTIONS;
  const { data, error } = await supabase
    .from("logs")
    .select(
      "drink_name, shop:shops!inner(place_id, name, formatted_address, latitude, longitude, google_maps_url)",
    )
    .eq("author_id", userId)
    .order("drank_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(SCAN_LIMIT)
    .returns<Row[]>();
  if (error) return NO_SUGGESTIONS;

  const recentShops: ShopDetails[] = [];
  const drinksByPlaceId: Record<string, string[]> = {};
  for (const { drink_name: drink, shop } of data) {
    let drinks = drinksByPlaceId[shop.place_id];
    if (!drinks) {
      drinks = drinksByPlaceId[shop.place_id] = [];
      if (recentShops.length < RECENT_SHOPS_MAX) {
        recentShops.push({
          placeId: shop.place_id,
          name: shop.name,
          formattedAddress: shop.formatted_address,
          latitude: shop.latitude,
          longitude: shop.longitude,
          googleMapsUrl: shop.google_maps_url,
        });
      }
    }
    if (
      drinks.length < DRINKS_PER_SHOP_MAX &&
      !drinks.some((d) => d.toLowerCase() === drink.toLowerCase())
    ) {
      drinks.push(drink);
    }
  }
  return { recentShops, drinksByPlaceId };
}
