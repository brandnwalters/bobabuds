import { afterEach, describe, expect, test, vi } from "vitest";

import { shopSearch } from "@/lib/places/shop-search";

afterEach(() => {
  vi.unstubAllEnvs();
});

// The built-in shop list is made-up data as far as production is concerned,
// so the picker may only offer it where dev tools are on.
describe("shop search without a Google key", () => {
  test("offers the built-in shops when dev tools are on", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");

    const results = await shopSearch({ builtInShops: true }).suggest("moge");

    expect(results.map((s) => s.name)).toEqual(["Moge Tee"]);
  });

  test("offers no shops when dev tools are off", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
    const search = shopSearch({ builtInShops: false });

    await expect(search.suggest("moge")).rejects.toThrow();
    await expect(
      search.details({ placeId: "dev-fallback:moge-tee-chapel-hill", name: "Moge Tee", detail: "" }),
    ).rejects.toThrow();
  });
});
