import "server-only";

import { placeDetails } from "@/lib/places/details";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns the id of the shop with this place ID, adding it first if nobody
 * has logged there yet. Users can't add shops themselves: the server looks
 * the details up by place ID (see `placeDetails`) and stores them with the
 * secret key. The first details stored for a place ID are kept. Null when the
 * place can't be looked up or saved.
 */
export async function findOrAddShop(placeId: string): Promise<string | null> {
  const admin = createAdminClient();
  const existing = await shopIdByPlaceId(admin, placeId);
  if (existing) return existing;

  const shop = await placeDetails(placeId);
  if (!shop) return null;
  const { error } = await admin.from("shops").upsert(
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
  return shopIdByPlaceId(admin, placeId);
}

async function shopIdByPlaceId(
  admin: ReturnType<typeof createAdminClient>,
  placeId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("shops")
    .select("id")
    .eq("place_id", placeId)
    .maybeSingle();
  return data?.id ?? null;
}
