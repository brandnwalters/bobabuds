import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { signInAsNewUser } from "./support/supabase";

type Bud = Awaited<ReturnType<typeof signInAsNewUser>>;

/** A throwaway signed-in user who has finished onboarding. */
async function newBud(): Promise<Bud> {
  const bud = await signInAsNewUser();
  const { error } = await bud.client.from("profiles").insert({
    id: bud.user.id,
    username: `bud_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    display_name: "Bud",
  });
  if (error) throw error;
  return bud;
}

async function befriend(a: Bud, b: Bud) {
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
async function createLog(bud: Bud) {
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
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function visibleLogIds(bud: Bud, authorId: string) {
  const { data, error } = await bud.client
    .from("logs")
    .select("id")
    .eq("author_id", authorId);
  if (error) throw error;
  return data.map((l) => l.id);
}

describe("log visibility", () => {
  it("friends can read each other's Logs; strangers can't", async () => {
    const author = await newBud();
    const friend = await newBud();
    const stranger = await newBud();
    await befriend(author, friend);
    const logId = await createLog(author);

    expect(await visibleLogIds(friend, author.user.id)).toEqual([logId]);
    expect(await visibleLogIds(stranger, author.user.id)).toEqual([]);
  });

  it("a former friend loses access right after unfriending", async () => {
    const author = await newBud();
    const friend = await newBud();
    await befriend(author, friend);
    const logId = await createLog(author);
    expect(await visibleLogIds(friend, author.user.id)).toEqual([logId]);

    const { error } = await author.client
      .from("friendships")
      .delete()
      .or(`user_a.eq.${friend.user.id},user_b.eq.${friend.user.id}`);
    expect(error).toBeNull();

    expect(await visibleLogIds(friend, author.user.id)).toEqual([]);
  });

  it("can_view_logs_of answers only for the signed-in viewer", async () => {
    const author = await newBud();
    const friend = await newBud();
    const stranger = await newBud();
    await befriend(author, friend);

    const check = async (viewer: Bud, target: Bud) => {
      const { data, error } = await viewer.client.rpc("can_view_logs_of", {
        author: target.user.id,
      });
      if (error) throw error;
      return data;
    };
    expect(await check(author, author)).toBe(true);
    expect(await check(friend, author)).toBe(true);
    expect(await check(stranger, author)).toBe(false);
  });
});
