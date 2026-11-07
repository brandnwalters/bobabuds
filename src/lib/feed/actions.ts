"use server";

import { listFeed, type FeedPage } from "@/lib/logs/queries";

/** The next (older) page of the signed-in user's Feed, for scroll-to-load. */
export async function loadMoreFeed(cursor: string): Promise<FeedPage> {
  return listFeed(cursor);
}
