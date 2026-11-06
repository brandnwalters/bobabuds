import { describe, expect, it } from "vitest";

import { befriend, createLog, newBud, type Bud } from "./support/buds";

async function cheer(bud: Bud, logId: string) {
  return bud.client.from("cheers").insert({ log_id: logId });
}

async function cheererIds(bud: Bud, logId: string) {
  const { data, error } = await bud.client
    .from("cheers")
    .select("user_id")
    .eq("log_id", logId);
  if (error) throw error;
  return data.map((c) => c.user_id as string).sort();
}

async function uncheer(bud: Bud, logId: string) {
  // .select() returns the rows actually deleted (RLS hides the rest).
  return bud.client
    .from("cheers")
    .delete()
    .eq("log_id", logId)
    .select("user_id");
}

describe("cheers", () => {
  it("a friend can cheer a Log once and un-cheer it", async () => {
    const author = await newBud();
    const friend = await newBud();
    await befriend(author, friend);
    const logId = await createLog(author);

    expect((await cheer(friend, logId)).error).toBeNull();
    expect((await cheer(friend, logId)).error?.code).toBe("23505");
    expect(await cheererIds(author, logId)).toEqual([friend.user.id]);
    expect(await cheererIds(friend, logId)).toEqual([friend.user.id]);

    const removed = await uncheer(friend, logId);
    expect(removed.error).toBeNull();
    expect(removed.data).toEqual([{ user_id: friend.user.id }]);
    expect(await cheererIds(author, logId)).toEqual([]);
  });

  it("a stranger can't cheer or read Cheers on a Log they can't view", async () => {
    const author = await newBud();
    const friend = await newBud();
    const stranger = await newBud();
    await befriend(author, friend);
    const logId = await createLog(author);
    expect((await cheer(friend, logId)).error).toBeNull();

    expect((await cheer(stranger, logId)).error?.code).toBe("42501");
    expect(await cheererIds(stranger, logId)).toEqual([]);
    expect(await cheererIds(author, logId)).toEqual([friend.user.id]);
  });

  it("users can't cheer as someone else or remove someone else's Cheers", async () => {
    const author = await newBud();
    const friend = await newBud();
    await befriend(author, friend);
    const logId = await createLog(author);
    expect((await cheer(friend, logId)).error).toBeNull();

    const forged = await author.client
      .from("cheers")
      .insert({ log_id: logId, user_id: friend.user.id });
    expect(forged.error?.code).toBe("42501");

    const removed = await uncheer(author, logId);
    expect(removed.error).toBeNull();
    expect(removed.data).toEqual([]);
    expect(await cheererIds(friend, logId)).toEqual([friend.user.id]);
  });

  it("a former friend loses access to the Cheers after unfriending", async () => {
    const author = await newBud();
    const friend = await newBud();
    await befriend(author, friend);
    const logId = await createLog(author);
    expect((await cheer(friend, logId)).error).toBeNull();

    const unfriended = await author.client
      .from("friendships")
      .delete()
      .or(`user_a.eq.${friend.user.id},user_b.eq.${friend.user.id}`);
    expect(unfriended.error).toBeNull();

    expect(await cheererIds(friend, logId)).toEqual([]);
    expect((await uncheer(friend, logId)).data).toEqual([]);
    expect(await cheererIds(author, logId)).toEqual([friend.user.id]);
  });

  it("deleting a Log deletes its Cheers", async () => {
    const author = await newBud();
    const friend = await newBud();
    await befriend(author, friend);
    const logId = await createLog(author);
    expect((await cheer(friend, logId)).error).toBeNull();
    expect((await cheer(author, logId)).error).toBeNull();

    const { error } = await author.client.from("logs").delete().eq("id", logId);
    expect(error).toBeNull();

    // The friend can still view everything of the author's, yet nothing is left.
    expect(await cheererIds(friend, logId)).toEqual([]);
    expect(await cheererIds(author, logId)).toEqual([]);
  });
});
