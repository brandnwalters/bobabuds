"use server";

import { refresh } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// Mutations run as the signed-in user, so the database's access rules decide
// what's allowed. Errors that just mean "the state already changed" (someone
// accepted, cancelled or sent first) are ignored: the refreshed page shows
// the real state.
const STALE_STATE_CODES = new Set(["23505", "23514", "P0002"]);

function check(error: { code: string } | null) {
  if (error && !STALE_STATE_CODES.has(error.code)) throw error;
}

/**
 * Sends a Friend Request to `recipientId`. If they've already requested the
 * signed-in user, the two become friends at once.
 */
export async function sendFriendRequest(recipientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_friend_request", {
    recipient: recipientId,
  });
  check(error);
  refresh();
}

/** Accepts the request `senderId` sent the signed-in user. */
export async function acceptFriendRequest(senderId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_friend_request", {
    sender: senderId,
  });
  check(error);
  refresh();
}

/** Declines the request `senderId` sent the signed-in user. */
export async function declineFriendRequest(senderId: string) {
  await deleteRequest(senderId, "recipient");
}

/** Cancels the signed-in user's request to `recipientId`. */
export async function cancelFriendRequest(recipientId: string) {
  await deleteRequest(recipientId, "sender");
}

async function deleteRequest(otherId: string, me: "sender" | "recipient") {
  const supabase = await createClient();
  const userId = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!userId) throw new Error("Not signed in");

  const [senderId, recipientId] =
    me === "sender" ? [userId, otherId] : [otherId, userId];
  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .match({ sender_id: senderId, recipient_id: recipientId });
  check(error);
  refresh();
}

/** Ends the signed-in user's Friendship with `friendId`. */
export async function unfriend(friendId: string) {
  const supabase = await createClient();
  const userId = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!userId) throw new Error("Not signed in");

  const [userA, userB] = [userId, friendId].sort();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .match({ user_a: userA, user_b: userB });
  check(error);
  refresh();
}
