import { describe, expect, it } from "vitest";

import { type Bud, befriend, createLog, newBud } from "./support/buds";

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
