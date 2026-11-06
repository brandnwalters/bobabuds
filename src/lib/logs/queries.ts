import "server-only";

import {
  CHEERS_EMBED,
  toCheers,
  type CheersRow,
  type CheersSummary,
} from "@/lib/cheers/summary";
import { signedImageUrls, signedUrlFor } from "@/lib/images/storage";
import type { IceLevel } from "@/lib/logs/fields";
import { LOG_PHOTOS_BUCKET } from "@/lib/logs/photos";
import { withAvatarUrls } from "@/lib/profiles/avatar-urls";
import { BUD_COLUMNS, type Bud, type ProfileRow, toBud } from "@/lib/profiles/people";
import { type Shop, SHOP_COLUMNS, type ShopRow, toShop } from "@/lib/shops/columns";
import {
  createClient,
  getViewerId,
  type ServerSupabase,
} from "@/lib/supabase/server";
import { UUID, UUID_PATTERN } from "@/lib/uuid";

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
  shop: Shop;
};

/** A Log with a short-lived signed URL for its photo (null without one). */
export type LogWithPhoto = LogWithShop & { photoUrl: string | null };

const LOG_COLUMNS = `id, author_id, drink_name, rating, drank_on, sweetness, ice, toppings, note, created_at, photo_path, shop:shops!inner(${SHOP_COLUMNS})`;

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
  shop: ShopRow;
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
    shop: toShop(row.shop),
  };
}

/** A Log with its Cheers, as seen by the signed-in viewer. */
export type WithCheers = { cheers: CheersSummary };

/** A Log the signed-in user may see, or null (row-level security decides). */
export async function getLog(
  id: string,
): Promise<(LogWithPhoto & WithCheers) | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const [{ data, error }, viewerId] = await Promise.all([
    supabase
      .from("logs")
      .select(`${LOG_COLUMNS}, ${CHEERS_EMBED}`)
      .eq("id", id)
      .maybeSingle<LogRow & { cheers: CheersRow[] }>(),
    getViewerId(supabase),
  ]);
  if (error) throw error;
  if (!data) return null;
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
  return { ...log, photoUrl: signedUrlFor(urls, log.photoPath) };
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
export type FeedLog = LogWithPhoto & WithCheers & { author: Bud };

export type FeedPage = {
  logs: FeedLog[];
  /** Pass to `listFeed` for the next (older) page; null on the last page. */
  nextCursor: string | null;
};

export const FEED_PAGE_SIZE = 10;

const FEED_COLUMNS = `${LOG_COLUMNS}, author:profiles!logs_author_id_fkey!inner(${BUD_COLUMNS}), ${CHEERS_EMBED}`;

type FeedRow = LogRow & { author: ProfileRow; cheers: CheersRow[] };

/**
 * Maps FEED_COLUMNS rows, signing their photos and author avatars in one
 * request each; shared by the Feed and the Shop Page. `viewerId` (the
 * signed-in user) decides whether the viewer has cheered.
 */
async function toFeedLogs(
  supabase: ServerSupabase,
  rows: FeedRow[],
  viewerId: string | null,
): Promise<FeedLog[]> {
  const [photoUrls, authors] = await Promise.all([
    signedImageUrls(
      supabase,
      LOG_PHOTOS_BUCKET,
      rows.map((row) => row.photo_path),
    ),
    withAvatarUrls(
      supabase,
      rows.map((row) => toBud(row.author)),
    ),
  ]);
  return rows.map((row, i) => ({
    ...withPhotoUrl(toLog(row), photoUrls),
    author: authors[i]!,
    cheers: toCheers(row.cheers, viewerId),
  }));
}

// Cursor = "<created_at>|<id>" of the last Log on the previous page. It comes
// back from the browser, so it is parsed strictly before it reaches a filter.
const CURSOR = new RegExp(
  `^(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,6})?(?:Z|[+-]\\d{2}:\\d{2}))\\|(${UUID_PATTERN})$`,
  "i",
);

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

  const [{ data, error }, viewerId] = await Promise.all([
    query.returns<FeedRow[]>(),
    getViewerId(supabase),
  ]);
  if (error) throw error;

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
  const [{ data, error }, viewerId] = await Promise.all([
    supabase
      .from("logs")
      .select(FEED_COLUMNS)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .returns<FeedRow[]>(),
    getViewerId(supabase),
  ]);
  if (error) throw error;
  return toFeedLogs(supabase, data, viewerId);
}
