import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { anonClient, signInAsNewUser } from "./support/supabase";

/** A valid, unique-per-run username (letters, digits, underscore; max 20). */
function freshUsername(prefix = "bud") {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

describe("profiles", () => {
  it("a user can create their own profile and any signed-in user can read it", async () => {
    const alice = await signInAsNewUser();
    const bob = await signInAsNewUser();
    const username = freshUsername("alice");

    const { error } = await alice.client
      .from("profiles")
      .insert({ id: alice.user.id, username, display_name: "Alice" });
    expect(error).toBeNull();

    const { data, error: readError } = await bob.client
      .from("profiles")
      .select("id, username, display_name, avatar_path")
      .eq("id", alice.user.id)
      .single();
    expect(readError).toBeNull();
    expect(data).toEqual({
      id: alice.user.id,
      username,
      display_name: "Alice",
      avatar_path: null,
    });
  });

  it("a user can't create a profile for another user", async () => {
    const mallory = await signInAsNewUser();
    const victim = await signInAsNewUser();

    const { error } = await mallory.client.from("profiles").insert({
      id: victim.user.id,
      username: freshUsername("victim"),
      display_name: "Not me",
    });

    expect(error?.code).toBe("42501");
    const { data } = await victim.client
      .from("profiles")
      .select("id")
      .eq("id", victim.user.id);
    expect(data).toEqual([]);
  });

  it("a user can update their own profile but not another user's", async () => {
    const alice = await signInAsNewUser();
    const mallory = await signInAsNewUser();
    const username = freshUsername("alice");
    await createProfile(alice.client, alice.user.id, username, "Alice");

    const { error: ownError } = await alice.client
      .from("profiles")
      .update({ display_name: "Alice B" })
      .eq("id", alice.user.id);
    expect(ownError).toBeNull();

    const { data: hijacked } = await mallory.client
      .from("profiles")
      .update({ display_name: "Hacked" })
      .eq("id", alice.user.id)
      .select();
    expect(hijacked).toEqual([]);

    const { data } = await mallory.client
      .from("profiles")
      .select("username, display_name")
      .eq("id", alice.user.id)
      .single();
    expect(data).toEqual({ username, display_name: "Alice B" });
  });

  it("a username can't be changed after onboarding", async () => {
    const alice = await signInAsNewUser();
    const username = freshUsername("alice");
    await createProfile(alice.client, alice.user.id, username, "Alice");

    const { error } = await alice.client
      .from("profiles")
      .update({ username: freshUsername("renamed") })
      .eq("id", alice.user.id);
    expect(error?.code).toBe("42501");

    const { data } = await alice.client
      .from("profiles")
      .select("username")
      .eq("id", alice.user.id)
      .single();
    expect(data).toEqual({ username });
  });

  it("usernames are unique regardless of case", async () => {
    const first = await signInAsNewUser();
    const second = await signInAsNewUser();
    const username = freshUsername("Boba");
    await createProfile(first.client, first.user.id, username, "First");

    const { error } = await second.client.from("profiles").insert({
      id: second.user.id,
      username: username.toLowerCase(),
      display_name: "Second",
    });

    expect(error?.code).toBe("23505");
  });

  it("rejects usernames with other characters or the wrong length", async () => {
    const { client, user } = await signInAsNewUser();

    for (const username of ["ab", "a".repeat(21), "has space", "dash-ed", "émoji"]) {
      const { error } = await client
        .from("profiles")
        .insert({ id: user.id, username, display_name: "Bud" });
      expect(error?.code, username).toBe("23514");
    }
  });

  it("signed-out visitors can't read profiles", async () => {
    const alice = await signInAsNewUser();
    await createProfile(alice.client, alice.user.id, freshUsername(), "Alice");

    const { data, error } = await anonClient()
      .from("profiles")
      .select("id")
      .eq("id", alice.user.id);

    expect(data ?? []).toEqual([]);
    expect(error?.code).toBe("42501");
  });

  it("reports whether a username is available, ignoring case", async () => {
    const alice = await signInAsNewUser();
    const username = freshUsername("Taro");
    await createProfile(alice.client, alice.user.id, username, "Alice");
    const other = await signInAsNewUser();

    const taken = await other.client.rpc("username_available", {
      candidate: username.toUpperCase(),
    });
    const free = await other.client.rpc("username_available", {
      candidate: freshUsername("free"),
    });

    expect(taken.data).toBe(false);
    expect(free.data).toBe(true);
  });
});

type Client = Awaited<ReturnType<typeof signInAsNewUser>>["client"];

async function createProfile(
  client: Client,
  id: string,
  username: string,
  displayName: string,
) {
  const { error } = await client
    .from("profiles")
    .insert({ id, username, display_name: displayName });
  if (error) throw error;
}
