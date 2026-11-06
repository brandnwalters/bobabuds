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

async function sendRequest(from: Bud, to: Bud) {
  return from.client.rpc("send_friend_request", { recipient: to.user.id });
}

/** The ids of everyone `bud` is friends with, as `bud` can see them. */
async function friendIds(bud: Bud) {
  const { data, error } = await bud.client
    .from("friendships")
    .select("user_a, user_b");
  if (error) throw error;
  return data.map((f) => (f.user_a === bud.user.id ? f.user_b : f.user_a));
}

async function requestsVisibleTo(bud: Bud) {
  const { data, error } = await bud.client
    .from("friend_requests")
    .select("sender_id, recipient_id");
  if (error) throw error;
  return data;
}

describe("friend requests", () => {
  it("the recipient can accept a request, which makes both users friends", async () => {
    const alice = await newBud();
    const bob = await newBud();

    const sent = await sendRequest(alice, bob);
    expect(sent.error).toBeNull();
    expect(sent.data).toBe("requested");
    expect(await requestsVisibleTo(bob)).toEqual([
      { sender_id: alice.user.id, recipient_id: bob.user.id },
    ]);

    const accepted = await bob.client.rpc("accept_friend_request", {
      sender: alice.user.id,
    });
    expect(accepted.error).toBeNull();

    expect(await friendIds(alice)).toEqual([bob.user.id]);
    expect(await friendIds(bob)).toEqual([alice.user.id]);
    expect(await requestsVisibleTo(alice)).toEqual([]);
    expect(await requestsVisibleTo(bob)).toEqual([]);
  });

  it("a third party can't read or accept someone else's request", async () => {
    const alice = await newBud();
    const bob = await newBud();
    const mallory = await newBud();
    await sendRequest(alice, bob);

    expect(await requestsVisibleTo(mallory)).toEqual([]);

    const accepted = await mallory.client.rpc("accept_friend_request", {
      sender: alice.user.id,
    });
    expect(accepted.error).not.toBeNull();
    expect(await friendIds(alice)).toEqual([]);
    expect(await friendIds(mallory)).toEqual([]);
    expect(await requestsVisibleTo(bob)).toHaveLength(1);
  });

  it("the sender can't accept their own request", async () => {
    const alice = await newBud();
    const bob = await newBud();
    await sendRequest(alice, bob);

    const accepted = await alice.client.rpc("accept_friend_request", {
      sender: bob.user.id,
    });

    expect(accepted.error).not.toBeNull();
    expect(await friendIds(alice)).toEqual([]);
    expect(await requestsVisibleTo(bob)).toHaveLength(1);
  });

  it("a user can't write requests or friendships directly", async () => {
    const alice = await newBud();
    const bob = await newBud();
    const [a, b] = [alice.user.id, bob.user.id].sort();

    const friendship = await alice.client
      .from("friendships")
      .insert({ user_a: a, user_b: b });
    const onBehalf = await alice.client
      .from("friend_requests")
      .insert({ sender_id: bob.user.id, recipient_id: alice.user.id });

    expect(friendship.error?.code).toBe("42501");
    expect(onBehalf.error?.code).toBe("42501");
    expect(await friendIds(alice)).toEqual([]);
    expect(await requestsVisibleTo(alice)).toEqual([]);
  });

  it("sending to someone who already requested you makes you friends at once", async () => {
    const alice = await newBud();
    const bob = await newBud();
    await sendRequest(alice, bob);

    const crossed = await sendRequest(bob, alice);

    expect(crossed.error).toBeNull();
    expect(crossed.data).toBe("friends");
    expect(await friendIds(alice)).toEqual([bob.user.id]);
    expect(await requestsVisibleTo(alice)).toEqual([]);
    expect(await requestsVisibleTo(bob)).toEqual([]);
  });

  it("rejects duplicate requests, requests to friends and requests to yourself", async () => {
    const alice = await newBud();
    const bob = await newBud();
    const carol = await newBud();
    await sendRequest(alice, bob);
    await sendRequest(alice, carol);
    await carol.client.rpc("accept_friend_request", { sender: alice.user.id });

    const duplicate = await sendRequest(alice, bob);
    const toFriend = await sendRequest(alice, carol);
    const fromFriend = await sendRequest(carol, alice);
    const toSelf = await sendRequest(alice, alice);

    expect(duplicate.error).not.toBeNull();
    expect(toFriend.error).not.toBeNull();
    expect(fromFriend.error).not.toBeNull();
    expect(toSelf.error).not.toBeNull();
    expect(await requestsVisibleTo(alice)).toEqual([
      { sender_id: alice.user.id, recipient_id: bob.user.id },
    ]);
  });
});

describe("removing requests and friendships", () => {
  it("the recipient can decline and the sender can cancel, but a third party can't remove either", async () => {
    const alice = await newBud();
    const bob = await newBud();
    const carol = await newBud();
    const mallory = await newBud();
    await sendRequest(alice, bob);
    await sendRequest(carol, alice);

    const meddled = await mallory.client
      .from("friend_requests")
      .delete()
      .in("sender_id", [alice.user.id, carol.user.id])
      .select();
    expect(meddled.data ?? []).toEqual([]);
    expect(await requestsVisibleTo(alice)).toHaveLength(2);

    const cancelled = await alice.client
      .from("friend_requests")
      .delete()
      .match({ sender_id: alice.user.id, recipient_id: bob.user.id });
    const declined = await alice.client
      .from("friend_requests")
      .delete()
      .match({ sender_id: carol.user.id, recipient_id: alice.user.id });

    expect(cancelled.error).toBeNull();
    expect(declined.error).toBeNull();
    expect(await requestsVisibleTo(alice)).toEqual([]);
    expect(await friendIds(alice)).toEqual([]);
  });

  it("either friend can unfriend, but a third party can't", async () => {
    const alice = await newBud();
    const bob = await newBud();
    const mallory = await newBud();
    await sendRequest(alice, bob);
    await bob.client.rpc("accept_friend_request", { sender: alice.user.id });

    const meddled = await mallory.client
      .from("friendships")
      .delete()
      .or(`user_a.eq.${alice.user.id},user_b.eq.${alice.user.id}`)
      .select();
    expect(meddled.data ?? []).toEqual([]);
    expect(await friendIds(alice)).toEqual([bob.user.id]);

    const unfriended = await bob.client
      .from("friendships")
      .delete()
      .or(`user_a.eq.${alice.user.id},user_b.eq.${alice.user.id}`);

    expect(unfriended.error).toBeNull();
    expect(await friendIds(alice)).toEqual([]);
    expect(await friendIds(bob)).toEqual([]);
  });
});
