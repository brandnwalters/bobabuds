import { randomUUID } from "node:crypto";

import { signInAsNewUser } from "./supabase";

/** A throwaway signed-in user who has finished onboarding. */
export type Bud = Awaited<ReturnType<typeof signInAsNewUser>>;

export async function newBud(): Promise<Bud> {
  const bud = await signInAsNewUser();
  const { error } = await bud.client.from("profiles").insert({
    id: bud.user.id,
    username: `bud_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    display_name: "Bud",
  });
  if (error) throw error;
  return bud;
}

/** Makes `a` and `b` friends through the real request/accept RPCs. */
export async function befriend(a: Bud, b: Bud) {
  const sent = await a.client.rpc("send_friend_request", {
    recipient: b.user.id,
  });
  if (sent.error) throw sent.error;
  const accepted = await b.client.rpc("accept_friend_request", {
    sender: a.user.id,
  });
  if (accepted.error) throw accepted.error;
}

/** Creates a Log by `bud` at a fresh shop and returns its id. */
export async function createLog(
  bud: Bud,
  extra: Record<string, unknown> = {},
) {
  const placeId = `test-${randomUUID()}`;
  const { error: shopError } = await bud.client.from("shops").insert({
    place_id: placeId,
    name: "Test Tea House",
    formatted_address: "123 Franklin St, Chapel Hill, NC 27516, USA",
    latitude: 35.9132,
    longitude: -79.0558,
    google_maps_url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
  });
  if (shopError) throw shopError;
  const { data: shop, error: readError } = await bud.client
    .from("shops")
    .select("id")
    .eq("place_id", placeId)
    .single();
  if (readError) throw readError;

  const { data, error } = await bud.client
    .from("logs")
    .insert({
      shop_id: shop.id,
      drink_name: "Taro Milk Tea",
      rating: 4,
      drank_on: "2026-11-01",
      ...extra,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
