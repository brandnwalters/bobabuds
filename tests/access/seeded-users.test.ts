import { describe, expect, test } from "vitest";

import { SEEDED_LOGS } from "@/lib/dev/seed-logs";

import { signInAsSeeded } from "./support/supabase";

// Needs `pnpm seed`.
describe("seeded users", () => {
  test("pnpm seed creates the seeded users with usernames and display names", async () => {
    const { client } = await signInAsSeeded("mia");

    const { data, error } = await client
      .from("profiles")
      .select("username, display_name")
      .order("username");

    expect(error).toBeNull();
    expect(data).toEqual(
      expect.arrayContaining([
        { username: "alex", display_name: "Alex Kim" },
        { username: "casey", display_name: "Casey Nguyen" },
        { username: "jordan", display_name: "Jordan Lee" },
        { username: "mia", display_name: "Mia Chen" },
        { username: "priya", display_name: "Priya Patel" },
        { username: "sam", display_name: "Sam Rivera" },
        { username: "taylor", display_name: "Taylor Brooks" },
      ]),
    );
  });

  test("pnpm seed gives mia friends, one request each way, and a stranger", async () => {
    const mia = await signInAsSeeded("mia");
    const casey = await signInAsSeeded("casey");

    const miaView = await relationshipsOf(mia.client, mia.user.id);
    const caseyView = await relationshipsOf(casey.client, casey.user.id);

    expect(miaView).toEqual({
      friends: ["jordan", "priya", "sam"],
      incoming: ["alex"],
      outgoing: ["taylor"],
    });
    expect(caseyView).toEqual({ friends: [], incoming: [], outgoing: [] });
  });

  test("pnpm seed gives most seeded Logs a photo that friends can load", async () => {
    const { client } = await signInAsSeeded("mia");

    // Only the seeded Logs: browser tests keep adding photo-less Logs.
    const { data: logs, error } = await client
      .from("logs")
      .select("photo_path")
      .in("drink_name", [...new Set(SEEDED_LOGS.map((log) => log.drink))]);
    expect(error).toBeNull();
    expect(logs!.length).toBeGreaterThan(0);
    const photos = logs!.flatMap((log) => (log.photo_path ? [log.photo_path] : []));
    // mia sees her own and her friends' seeded Logs.
    expect(photos.length / logs!.length).toBeGreaterThan(0.5);

    const { data: photo, error: downloadError } = await client.storage
      .from("log-photos")
      .download(photos[0]!);
    expect(downloadError).toBeNull();
    expect(photo!.type).toBe("image/webp");
    expect(photo!.size).toBeGreaterThan(0);
  });

  test("signInAsSeeded gives a client acting as that seeded user", async () => {
    const { client, user } = await signInAsSeeded("jordan");

    const { data: auth } = await client.auth.getUser();
    expect(auth.user?.id).toBe(user.id);

    const { data: profile } = await client
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    expect(profile).toEqual({ username: "jordan" });

    // RLS sees the same user: they may update their own row and nobody else's.
    const { data: updated } = await client
      .from("profiles")
      .update({ display_name: "Jordan Lee" })
      .neq("id", user.id)
      .select("id");
    expect(updated).toEqual([]);
  });
});

type Client = Awaited<ReturnType<typeof signInAsSeeded>>["client"];

/** Usernames of a user's friends and pending requests, as they see them. */
async function relationshipsOf(client: Client, userId: string) {
  const [friendships, requests, profiles] = await Promise.all([
    client.from("friendships").select("user_a, user_b"),
    client.from("friend_requests").select("sender_id, recipient_id"),
    client.from("profiles").select("id, username"),
  ]);
  if (friendships.error) throw friendships.error;
  if (requests.error) throw requests.error;
  if (profiles.error) throw profiles.error;
  const username = (id: string) =>
    profiles.data.find((p) => p.id === id)?.username;

  return {
    friends: friendships.data
      .map((f) => username(f.user_a === userId ? f.user_b : f.user_a))
      .sort(),
    incoming: requests.data
      .filter((r) => r.recipient_id === userId)
      .map((r) => username(r.sender_id))
      .sort(),
    outgoing: requests.data
      .filter((r) => r.sender_id === userId)
      .map((r) => username(r.recipient_id))
      .sort(),
  };
}
