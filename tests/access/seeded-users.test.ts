import { describe, expect, test } from "vitest";

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
