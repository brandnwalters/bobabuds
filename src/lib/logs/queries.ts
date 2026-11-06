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

// Feed -----------------------------------------------------------------------

/** A Log in the Feed: the Log, its shop and its author. */
export type FeedLog = LogWithShop & {
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarPath: string | null;
  };
};

export type FeedPage = {
  logs: FeedLog[];
  /** Pass to `listFeed` for the next (older) page; null on the last page. */
  nextCursor: string | null;
};

export const FEED_PAGE_SIZE = 10;

const FEED_COLUMNS = `${LOG_COLUMNS}, author:profiles!logs_author_id_fkey!inner(id, username, display_name, avatar_path)`;

type FeedRow = LogRow & {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_path: string | null;
  };
};

// Cursor = "<created_at>|<id>" of the last Log on the previous page. It comes
// back from the browser, so it is parsed strictly before it reaches a filter.
const CURSOR =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2}))\|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function encodeCursor(row: { created_at: string; id: string }) {
  return `${row.created_at}|${row.id}`;
}

/**
 * One page of the signed-in user's Feed: Logs they can view (their own and
 * their friends', enforced by row-level security), newest created first, with
 * id as the tie-breaker. `cursor` comes from the previous page's `nextCursor`.
 */
export async function listFeed(
  cursor?: string | null,
  pageSize = FEED_PAGE_SIZE,
): Promise<FeedPage> {
  const supabase = await createClient();
  let query = supabase
    .from("logs")
    .select(FEED_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    // One extra row tells us whether there is another page.
    .limit(pageSize + 1);

  if (cursor) {
    const match = CURSOR.exec(cursor);
    if (!match) throw new Error("Invalid feed cursor");
    const [, createdAt, id] = match;
    query = query.or(
      `created_at.lt."${createdAt}",and(created_at.eq."${createdAt}",id.lt.${id})`,
    );
  }

  const { data, error } = await query.returns<FeedRow[]>();
  if (error) throw error;

  const rows = data.slice(0, pageSize);
  return {
    logs: rows.map((row) => ({
      ...toLog(row),
      author: {
        id: row.author.id,
        username: row.author.username,
        displayName: row.author.display_name,
        avatarPath: row.author.avatar_path,
      },
    })),
    nextCursor:
      data.length > pageSize ? encodeCursor(rows[rows.length - 1]!) : null,
  };
}
