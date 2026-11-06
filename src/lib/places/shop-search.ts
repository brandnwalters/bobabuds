import { fallbackShopSearch } from "@/lib/places/fallback";
import { createGoogleShopSearch } from "@/lib/places/google";
import type { ShopSearch } from "@/lib/places/types";

let instance: ShopSearch | undefined;

/**
 * The shop search for this browser: Google Places when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set, otherwise the built-in list of
 * Chapel Hill/Durham shops (for tests and local dev without a key).
 */
export function shopSearch(): ShopSearch {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  instance ??= apiKey ? createGoogleShopSearch(apiKey) : fallbackShopSearch;
  return instance;
}
