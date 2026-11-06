import type { ShopDetails } from "@/lib/places/types";

/** A stored shop: its details plus its row id. */
export type Shop = ShopDetails & { id: string };

/** The shops columns behind a `Shop` (select them, or embed `shop:shops(...)`). */
export const SHOP_COLUMNS =
  "id, place_id, name, formatted_address, latitude, longitude, google_maps_url";

export type ShopRow = {
  id: string;
  place_id: string;
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  google_maps_url: string;
};

export function toShop(row: ShopRow): Shop {
  return {
    id: row.id,
    placeId: row.place_id,
    name: row.name,
    formattedAddress: row.formatted_address,
    latitude: row.latitude,
    longitude: row.longitude,
    googleMapsUrl: row.google_maps_url,
  };
}
