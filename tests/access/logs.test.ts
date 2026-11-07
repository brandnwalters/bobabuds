import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createShop, newShop } from "./support/buds";
import { anonClient, signInAsSeeded } from "./support/supabase";

function newLog(shopId: string) {
  return {
    shop_id: shopId,
    drink_name: `Brown Sugar Milk Tea ${randomUUID().slice(0, 8)}`,
    rating: 4.5,
    drank_on: "2026-11-01",
  };
}

describe("shops", () => {
  it("signed-in users can read shops but not add them (only the server does)", async () => {
    const mia = await signInAsSeeded("mia");
    const shop = newShop();

    const { error } = await mia.client.from("shops").insert(shop);
    expect(error?.code).toBe("42501");

    const shopId = await createShop();
    const { data } = await mia.client
      .from("shops")
      .select("id")
      .eq("id", shopId)
      .single();
    expect(data).toEqual({ id: shopId });
  });

  it("users can't add a shop by upserting either", async () => {
    const mia = await signInAsSeeded("mia");

    const { error } = await mia.client
      .from("shops")
      .upsert(newShop(), { onConflict: "place_id", ignoreDuplicates: true });

    expect(error?.code).toBe("42501");
  });

  it("users can't change a shop", async () => {
    const casey = await signInAsSeeded("casey");
    const shopId = await createShop();

    const { data: changed } = await casey.client
      .from("shops")
      .update({ name: "Fake Name" })
      .eq("id", shopId)
      .select();
    expect(changed ?? []).toEqual([]);

    const { data } = await casey.client
      .from("shops")
      .select("name")
      .eq("id", shopId)
      .single();
    expect(data).toEqual({ name: "Test Tea House" });
  });

  it("signed-out visitors can't read shops", async () => {
    const { data } = await anonClient().from("shops").select("id").limit(1);
    expect(data ?? []).toEqual([]);
  });
});


describe("logs", () => {
  it("the author can create a Log and read it back", async () => {
    const mia = await signInAsSeeded("mia");
    const shopId = await createShop();
    const log = newLog(shopId);

    const { data: created, error } = await mia.client
      .from("logs")
      .insert({
        ...log,
        sweetness: 50,
        ice: "less",
        toppings: ["boba", "Cheese foam"],
        note: "Try 25% next time",
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data } = await mia.client
      .from("logs")
      .select(
        "author_id, shop_id, drink_name, rating, drank_on, sweetness, ice, toppings, note",
      )
      .eq("id", created!.id)
      .single();
    expect(data).toEqual({
      ...log,
      author_id: mia.user.id,
      sweetness: 50,
      ice: "less",
      toppings: ["boba", "Cheese foam"],
      note: "Try 25% next time",
    });
  });

  it("another user can't read the author's Logs", async () => {
    const mia = await signInAsSeeded("mia");
    const casey = await signInAsSeeded("casey");
    const shopId = await createShop();
    const { data: created } = await mia.client
      .from("logs")
      .insert(newLog(shopId))
      .select("id")
      .single();

    const { data } = await casey.client
      .from("logs")
      .select("id")
      .eq("id", created!.id);
    expect(data).toEqual([]);

    const { data: anon } = await anonClient()
      .from("logs")
      .select("id")
      .eq("id", created!.id);
    expect(anon ?? []).toEqual([]);
  });

  it("another user can't create a Log as the author", async () => {
    const mia = await signInAsSeeded("mia");
    const casey = await signInAsSeeded("casey");
    const shopId = await createShop();
    const log = newLog(shopId);

    const { error } = await casey.client
      .from("logs")
      .insert({ ...log, author_id: mia.user.id });
    expect(error?.code).toBe("42501");

    const { data } = await mia.client
      .from("logs")
      .select("id")
      .eq("drink_name", log.drink_name);
    expect(data).toEqual([]);
  });

  it("the author can update and delete their own Log", async () => {
    const mia = await signInAsSeeded("mia");
    const shopId = await createShop();
    const { data: created } = await mia.client
      .from("logs")
      .insert(newLog(shopId))
      .select("id")
      .single();

    const { data: updated, error } = await mia.client
      .from("logs")
      .update({ rating: 2, note: "Changed my mind" })
      .eq("id", created!.id)
      .select("rating, note")
      .single();
    expect(error).toBeNull();
    expect(updated).toEqual({ rating: 2, note: "Changed my mind" });

    const { error: deleteError } = await mia.client
      .from("logs")
      .delete()
      .eq("id", created!.id);
    expect(deleteError).toBeNull();
    const { data } = await mia.client.from("logs").select("id").eq("id", created!.id);
    expect(data).toEqual([]);
  });

  it("another user can't update or delete the author's Log", async () => {
    const mia = await signInAsSeeded("mia");
    const casey = await signInAsSeeded("casey");
    const shopId = await createShop();
    const log = newLog(shopId);
    const { data: created } = await mia.client
      .from("logs")
      .insert(log)
      .select("id")
      .single();

    const { data: changed } = await casey.client
      .from("logs")
      .update({ rating: 0.5 })
      .eq("id", created!.id)
      .select("id");
    expect(changed ?? []).toEqual([]);

    const { data: removed } = await casey.client
      .from("logs")
      .delete()
      .eq("id", created!.id)
      .select("id");
    expect(removed ?? []).toEqual([]);

    const { data } = await mia.client
      .from("logs")
      .select("rating")
      .eq("id", created!.id)
      .single();
    expect(data).toEqual({ rating: log.rating });
  });

  it("the author can't hand their Log to someone else", async () => {
    const mia = await signInAsSeeded("mia");
    const casey = await signInAsSeeded("casey");
    const shopId = await createShop();
    const { data: created } = await mia.client
      .from("logs")
      .insert(newLog(shopId))
      .select("id")
      .single();

    const { error } = await mia.client
      .from("logs")
      .update({ author_id: casey.user.id })
      .eq("id", created!.id);
    expect(error).not.toBeNull();

    const { data } = await mia.client
      .from("logs")
      .select("author_id")
      .eq("id", created!.id)
      .single();
    expect(data).toEqual({ author_id: mia.user.id });
  });

  it("rejects ratings outside 0.5 to 5 in half steps, and bad options", async () => {
    const mia = await signInAsSeeded("mia");
    const shopId = await createShop();

    const bad = [
      { rating: 0 },
      { rating: 5.5 },
      { rating: 3.3 },
      { sweetness: 40 },
      { ice: "lots" },
      { note: "x".repeat(281) },
      { drink_name: "   " },
      { toppings: [""] },
    ];
    for (const fields of bad) {
      const { error } = await mia.client
        .from("logs")
        .insert({ ...newLog(shopId), ...fields });
      expect(error?.code, JSON.stringify(fields)).toBe("23514");
    }
  });
});
