import "server-only";

import type { IceLevel } from "@/lib/logs/fields";
import type { ShopDetails } from "@/lib/places/types";
import { createClient } from "@/lib/supabase/server";

export type LogWithShop = {
  id: string;
  authorId: string;
  drinkName: string;
  rating: number;
  drankOn: string;
  sweetness: number | null;
  ice: IceLevel | null;
  toppings: string[];
  note: string | null;
  createdAt: string;
  shop: ShopDetails & { id: string };
};

const LOG_COLUMNS =
  "id, author_id, drink_name, rating, drank_on, sweetness, ice, toppings, note, created_at, shop:shops!inner(id, place_id, name, formatted_address, latitude, longitude, google_maps_url)";

type LogRow = {
  id: string;
  author_id: string;
  drink_name: string;
  rating: number;
  drank_on: string;
  sweetness: number | null;
  ice: IceLevel | null;
  toppings: string[];
  note: string | null;
  created_at: string;
  shop: {
    id: string;
    place_id: string;
    name: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
    google_maps_url: string;
  };
};

function toLog(row: LogRow): LogWithShop {
  return {
    id: row.id,
    authorId: row.author_id,
    drinkName: row.drink_name,
    rating: Number(row.rating),
    drankOn: row.drank_on,
    sweetness: row.sweetness,
    ice: row.ice,
    toppings: row.toppings,
    note: row.note,
    createdAt: row.created_at,
    shop: {
      id: row.shop.id,
      placeId: row.shop.place_id,
      name: row.shop.name,
      formattedAddress: row.shop.formatted_address,
      latitude: row.shop.latitude,
      longitude: row.shop.longitude,
      googleMapsUrl: row.shop.google_maps_url,
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A Log the signed-in user may see, or null (row-level security decides). */
export async function getLog(id: string): Promise<LogWithShop | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("logs")
    .select(LOG_COLUMNS)
    .eq("id", id)
    .maybeSingle<LogRow>();
  if (error) throw error;
  return data ? toLog(data) : null;
}

/** The signed-in user's id, or null when signed out. */
export async function getViewerId(): Promise<string | null> {
  const supabase = await createClient();
  return (await supabase.auth.getClaims()).data?.claims.sub ?? null;
}

/** The signed-in user's own Logs, newest drink first. */
export async function listMyLogs(): Promise<LogWithShop[]> {
  const supabase = await createClient();
  const userId = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("logs")
    .select(LOG_COLUMNS)
    .eq("author_id", userId)
    .order("drank_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .returns<LogRow[]>();
  if (error) throw error;
  return data.map(toLog);
}
