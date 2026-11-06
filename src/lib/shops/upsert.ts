import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ShopDetails } from "@/lib/places/types";

/**
 * Returns the id of the shop with this place ID, adding it first if nobody
 * has logged there yet. The first details stored for a place ID are kept.
 */
export async function upsertShop(
  supabase: SupabaseClient,
  shop: ShopDetails,
): Promise<string | null> {
  const { error } = await supabase.from("shops").upsert(
    {
      place_id: shop.placeId,
      name: shop.name,
      formatted_address: shop.formattedAddress,
      latitude: shop.latitude,
      longitude: shop.longitude,
      google_maps_url: shop.googleMapsUrl,
    },
    { onConflict: "place_id", ignoreDuplicates: true },
  );
  if (error) return null;

  const { data } = await supabase
    .from("shops")
    .select("id")
    .eq("place_id", shop.placeId)
    .single();
  return data?.id ?? null;
}
