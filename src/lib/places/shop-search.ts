import { fallbackShopSearch } from "@/lib/places/fallback";
import { createGoogleShopSearch } from "@/lib/places/google";
import type { ShopSearch } from "@/lib/places/types";

let google: ShopSearch | undefined;

/** Used with no Google key outside dev tools: every search fails. */
const unavailableShopSearch: ShopSearch = {
  async suggest() {
    throw new Error("Shop search isn't set up (no Google Maps key).");
  },
  async details() {
    throw new Error("Shop search isn't set up (no Google Maps key).");
  },
};

/**
 * The shop search for this browser: Google Places when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set. Without a key, the built-in list of
 * Chapel Hill/Durham shops, but only when `builtInShops` (dev tools are on,
 * for tests and local dev); otherwise search is unavailable.
 */
export function shopSearch({ builtInShops }: { builtInShops: boolean }): ShopSearch {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey) return (google ??= createGoogleShopSearch(apiKey));
  return builtInShops ? fallbackShopSearch : unavailableShopSearch;
}
