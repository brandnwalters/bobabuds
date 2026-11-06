import { describe, expect, it } from "vitest";

import { anonClient, signInAsNewUser } from "./support/supabase";

describe("local Supabase access", () => {
  it("an anonymous client has no session", async () => {
    const { data, error } = await anonClient().auth.getUser();

    expect(data.user).toBeNull();
    expect(error).not.toBeNull();
  });

  it("a signed-in client acts as its own user", async () => {
    const { client, user } = await signInAsNewUser();

    const { data, error } = await client.auth.getUser();

    expect(error).toBeNull();
    expect(data.user?.id).toBe(user.id);
  });
});
