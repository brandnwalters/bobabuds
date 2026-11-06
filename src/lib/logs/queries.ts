import "server-only";

import {
  CHEERS_EMBED,
  toCheers,
  type CheersRow,
  type CheersSummary,
} from "@/lib/cheers/summary";
import { signedImageUrls } from "@/lib/images/storage";
import type { IceLevel } from "@/lib/logs/fields";
import { LOG_PHOTOS_BUCKET } from "@/lib/logs/photos";
import type { ShopDetails } from "@/lib/places/types";
import { signedAvatarUrls } from "@/lib/profiles/avatar-urls";
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
  /** Storage path in the log-photos bucket (sign it to show it). */
  photoPath: string | null;
  shop: ShopDetails & { id: string };
};

/** A Log with a short-lived signed URL for its photo (null without one). */
export type LogWithPhoto = LogWithShop & { photoUrl: string | null };

const LOG_COLUMNS =
  "id, author_id, drink_name, rating, drank_on, sweetness, ice, toppings, note, created_at, photo_path, shop:shops!inner(id, place_id, name, formatted_address, latitude, longitude, google_maps_url)";

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
  photo_path: string | null;
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
    photoPath: row.photo_path,
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

/** A Log with its Cheers, as seen by the signed-in viewer. */
export type WithCheers = { cheers: CheersSummary };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A Log the signed-in user may see, or null (row-level security decides). */
export async function getLog(
  id: string,
): Promise<(LogWithPhoto & WithCheers) | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const [{ data, error }, claims] = await Promise.all([
    supabase
      .from("logs")
      .select(`${LOG_COLUMNS}, ${CHEERS_EMBED}`)
      .eq("id", id)
      .maybeSingle<LogRow & { cheers: CheersRow[] }>(),
    supabase.auth.getClaims(),
  ]);
  if (error) throw error;
  if (!data) return null;
  const viewerId = claims.data?.claims.sub ?? null;
  const urls = await signedImageUrls(supabase, LOG_PHOTOS_BUCKET, [data.photo_path]);
  return {
    ...withPhotoUrl(toLog(data), urls),
    cheers: toCheers(data.cheers, viewerId),
  };
}

function withPhotoUrl<T extends LogWithShop>(
  log: T,
  urls: Map<string, string>,
): T & { photoUrl: string | null } {
  return { ...log, photoUrl: (log.photoPath && urls.get(log.photoPath)) || null };
}

/** The signed-in user's id, or null when signed out. */
export async function getViewerId(): Promise<string | null> {
  const supabase = await createClient();
  return (await supabase.auth.getClaims()).data?.claims.sub ?? null;
}

/**
 * One user's Logs, newest drink first: all of them for the user themselves
 * and their friends, none for anyone else (row-level security decides).
 */
export async function listLogsBy(authorId: string): Promise<LogWithShop[]> {
  if (!UUID.test(authorId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("logs")
    .select(LOG_COLUMNS)
    .eq("author_id", authorId)
    .order("drank_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .returns<LogRow[]>();
  if (error) throw error;
  return data.map(toLog);
}

// Feed -----------------------------------------------------------------------

/** A Log in the Feed: the Log, its shop, its author, photo URL and Cheers. */
export type FeedLog = LogWithPhoto & WithCheers & {
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarPath: string | null;
    /** Short-lived signed URL of the author's avatar (null without one). */
    avatarUrl: string | null;
  };
};

export type FeedPage = {
  logs: FeedLog[];
  /** Pass to `listFeed` for the next (older) page; null on the last page. */
  nextCursor: string | null;
};

export const FEED_PAGE_SIZE = 10;

const FEED_COLUMNS = `${LOG_COLUMNS}, author:profiles!logs_author_id_fkey!inner(id, username, display_name, avatar_path), ${CHEERS_EMBED}`;

type FeedRow = LogRow & {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_path: string | null;
  };
  cheers: CheersRow[];
};

/**
 * Maps FEED_COLUMNS rows, signing their photos and author avatars in one
 * request each; shared by the
 * Feed and the Shop Page. `viewerId` (the signed-in user) decides whether the
 * viewer has cheered.
 */
async function toFeedLogs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: FeedRow[],
  viewerId: string | null,
): Promise<FeedLog[]> {
  const [photoUrls, avatarUrls] = await Promise.all([
    signedImageUrls(
      supabase,
      LOG_PHOTOS_BUCKET,
      rows.map((row) => row.photo_path),
    ),
    signedAvatarUrls(
      supabase,
      rows.map((row) => row.author.avatar_path),
    ),
  ]);
  return rows.map((row) => ({
    ...withPhotoUrl(toLog(row), photoUrls),
    author: {
      id: row.author.id,
      username: row.author.username,
      displayName: row.author.display_name,
      avatarPath: row.author.avatar_path,
      avatarUrl:
        (row.author.avatar_path && avatarUrls.get(row.author.avatar_path)) || null,
    },
    cheers: toCheers(row.cheers, viewerId),
  }));
}

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

  const [{ data, error }, claims] = await Promise.all([
    query.returns<FeedRow[]>(),
    supabase.auth.getClaims(),
  ]);
  if (error) throw error;
  const viewerId = claims.data?.claims.sub ?? null;

  const rows = data.slice(0, pageSize);
  return {
    logs: await toFeedLogs(supabase, rows, viewerId),
    nextCursor:
      data.length > pageSize ? encodeCursor(rows[rows.length - 1]!) : null,
  };
}

// Shop Page ------------------------------------------------------------------

/**
 * Every Log at a shop that the signed-in user can view (their own and their
 * friends', enforced by row-level security), newest created first, as Feed
 * cards.
 */
export async function listShopLogs(shopId: string): Promise<FeedLog[]> {
  if (!UUID.test(shopId)) return [];
  const supabase = await createClient();
  const [{ data, error }, claims] = await Promise.all([
    supabase
      .from("logs")
      .select(FEED_COLUMNS)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .returns<FeedRow[]>(),
    supabase.auth.getClaims(),
  ]);
  if (error) throw error;
  const viewerId = claims.data?.claims.sub ?? null;
  return toFeedLogs(supabase, data, viewerId);
}
