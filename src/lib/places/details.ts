import "server-only";

import { devToolsEnabled } from "@/lib/dev/dev-tools";
import { DEV_FALLBACK_SHOPS } from "@/lib/places/fallback";
import type { ShopDetails } from "@/lib/places/types";

const GOOGLE_PLACE_ID = /^[A-Za-z0-9_-]{1,300}$/;

/**
 * Looks up a shop's details by place ID on the server, so stored shops never
 * carry details a client made up: the built-in list for `dev-fallback:` IDs
 * (only when dev tools are on), otherwise Google Place Details when a key is
 * configured. Null when the place can't be looked up.
 */
export async function placeDetails(placeId: string): Promise<ShopDetails | null> {
  if (placeId.startsWith("dev-fallback:")) {
    if (!devToolsEnabled()) return null;
    return DEV_FALLBACK_SHOPS.find((shop) => shop.placeId === placeId) ?? null;
  }
  return googlePlaceDetails(placeId);
}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
};

/**
 * Place Details (New) over REST. Uses GOOGLE_PLACES_SERVER_KEY, falling back
 * to the browser key (which only works if it isn't referrer-restricted).
 */
async function googlePlaceDetails(placeId: string): Promise<ShopDetails | null> {
  const apiKey =
    process.env.GOOGLE_PLACES_SERVER_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !GOOGLE_PLACE_ID.test(placeId)) return null;

  let place: GooglePlace;
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,googleMapsUri",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    place = await response.json();
  } catch {
    return null;
  }

  const { latitude, longitude } = place.location ?? {};
  const name = place.displayName?.text;
  if (place.id !== placeId || !name || latitude == null || longitude == null) {
    return null;
  }
  return {
    placeId,
    name,
    formattedAddress: place.formattedAddress ?? "",
    latitude,
    longitude,
    googleMapsUrl:
      place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`,
  };
}
