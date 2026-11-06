import type { ShopDetails, ShopSearch } from "@/lib/places/types";

/**
 * Real Chapel Hill/Durham boba shops, used for shop search when no Google Maps
 * key is configured (browser tests, local dev without a key). Their place IDs
 * are NOT Google place IDs: they start with `dev-fallback:` so they can't be
 * mistaken for (or collide with) real ones. Coordinates are approximate.
 */
export const DEV_FALLBACK_SHOPS: ShopDetails[] = [
  shop("cha-house-chapel-hill", "Cha House", "318 W Franklin St, Chapel Hill, NC 27516, USA", 35.9104, -79.0613),
  shop("chill-bubble-tea-chapel-hill", "Chill Bubble Tea", "145 E Franklin St, Chapel Hill, NC 27514, USA", 35.9131, -79.0552),
  shop("moge-tee-chapel-hill", "Moge Tee", "151 E Franklin St, Chapel Hill, NC 27514, USA", 35.9132, -79.0550),
  shop("yaya-tea-chapel-hill", "Yaya Tea", "157 E Franklin St, Chapel Hill, NC 27514, USA", 35.9133, -79.0548),
  shop("quickly-tea-house-durham", "Quickly Tea House", "2604 Hillsborough Rd, Durham, NC 27705, USA", 36.0109, -78.9296),
  shop("wheat-durham", "Wheat", "810 Ninth St, Durham, NC 27705, USA", 36.0113, -78.9222),
  shop("yaya-tea-durham", "Yaya Tea Durham", "807 E Main St, Durham, NC 27701, USA", 35.9927, -78.8926),
];

function shop(
  slug: string,
  name: string,
  formattedAddress: string,
  latitude: number,
  longitude: number,
): ShopDetails {
  const query = encodeURIComponent(`${name}, ${formattedAddress}`);
  return {
    placeId: `dev-fallback:${slug}`,
    name,
    formattedAddress,
    latitude,
    longitude,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
}

/** Shop search over DEV_FALLBACK_SHOPS: case-insensitive match on name or address. */
export const fallbackShopSearch: ShopSearch = {
  async suggest(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return DEV_FALLBACK_SHOPS.filter((s) =>
      `${s.name} ${s.formattedAddress}`.toLowerCase().includes(needle),
    ).map((s) => ({
      placeId: s.placeId,
      name: s.name,
      detail: s.formattedAddress,
    }));
  },
  async details({ placeId }) {
    const found = DEV_FALLBACK_SHOPS.find((s) => s.placeId === placeId);
    if (!found) throw new Error(`Unknown fallback shop ${placeId}`);
    return found;
  },
};
