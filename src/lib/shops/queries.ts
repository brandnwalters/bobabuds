import "server-only";

import { type FeedLog, listShopLogs } from "@/lib/logs/queries";
import { type Shop, SHOP_COLUMNS, type ShopRow, toShop } from "@/lib/shops/columns";
import { createClient } from "@/lib/supabase/server";
import { UUID } from "@/lib/uuid";

export type ShopPage = {
  shop: Shop;
  /** Logs at the shop the viewer can see, newest first. */
  logs: FeedLog[];
  /** Mean rating over `logs`, or null when there are none. */
  averageRating: number | null;
};

/**
 * A shop with the Logs at it the signed-in user can view and their average
 * rating, or null for an unknown shop. Shop details are not private; the
 * Logs (and so the average) are limited by row-level security.
 */
export async function getShopPage(id: string): Promise<ShopPage | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const [{ data: shop, error }, logs] = await Promise.all([
    supabase
      .from("shops")
      .select(SHOP_COLUMNS)
      .eq("id", id)
      .maybeSingle<ShopRow>(),
    listShopLogs(id),
  ]);
  if (error) throw error;
  if (!shop) return null;

  return {
    shop: toShop(shop),
    logs,
    averageRating:
      logs.length > 0
        ? logs.reduce((sum, log) => sum + log.rating, 0) / logs.length
        : null,
  };
}
