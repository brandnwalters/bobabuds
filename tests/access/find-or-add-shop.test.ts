import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, inject, test, vi } from "vitest";

import { findOrAddShop } from "@/lib/shops/find-or-add";

import { createShop } from "./support/buds";
import { adminClient } from "./support/supabase";

// The server adds shops from details it looks up itself by place ID; a
// client only ever names the place ID.

beforeEach(() => {
  const { url, publishableKey, secretKey } = inject("supabase");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);
  vi.stubEnv("SUPABASE_SECRET_KEY", secretKey);
  vi.stubEnv("GOOGLE_PLACES_SERVER_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
  vi.stubEnv("DEV_TOOLS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function shopByPlaceId(placeId: string) {
  const { data } = await adminClient()
    .from("shops")
    .select("id, name, formatted_address, latitude, longitude, google_maps_url")
    .eq("place_id", placeId)
    .maybeSingle();
  return data;
}

/** Answers Google Place Details requests with `place`; other requests go through. */
function stubGooglePlaces(place: Record<string, unknown>) {
  const realFetch = globalThis.fetch;
  const requests: Request[] = [];
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (!request.url.startsWith("https://places.googleapis.com/")) {
      return realFetch(input, init);
    }
    requests.push(request);
    return Promise.resolve(Response.json(place));
  });
  return requests;
}

describe("findOrAddShop", () => {
  test("returns a shop that's already stored, without looking it up", async () => {
    const id = await createShop();
    const { data } = await adminClient()
      .from("shops")
      .select("place_id")
      .eq("id", id)
      .single();
    const requests = stubGooglePlaces({});
    vi.stubEnv("GOOGLE_PLACES_SERVER_KEY", "server-key");

    expect(await findOrAddShop(data!.place_id)).toBe(id);
    expect(requests).toEqual([]);
  });

  test("adds a new place from Google's details for its place ID", async () => {
    vi.stubEnv("GOOGLE_PLACES_SERVER_KEY", "server-key");
    const placeId = `ChIJtest${randomUUID().replaceAll("-", "")}`;
    const requests = stubGooglePlaces({
      id: placeId,
      displayName: { text: "Real Boba", languageCode: "en" },
      formattedAddress: "1 Real St, Durham, NC 27701, USA",
      location: { latitude: 36.0, longitude: -78.9 },
      googleMapsUri: "https://maps.google.com/?cid=123",
    });

    const id = await findOrAddShop(placeId);

    expect(id).toEqual(expect.any(String));
    expect(await shopByPlaceId(placeId)).toEqual({
      id,
      name: "Real Boba",
      formatted_address: "1 Real St, Durham, NC 27701, USA",
      latitude: 36.0,
      longitude: -78.9,
      google_maps_url: "https://maps.google.com/?cid=123",
    });
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).pathname).toBe(`/v1/places/${placeId}`);
    expect(requests[0].headers.get("X-Goog-Api-Key")).toBe("server-key");
  });

  test("adds nothing for a place ID that can't be looked up", async () => {
    const placeId = `ChIJtest${randomUUID().replaceAll("-", "")}`;

    // No Google key at all.
    expect(await findOrAddShop(placeId)).toBeNull();

    // Google doesn't know it.
    vi.stubEnv("GOOGLE_PLACES_SERVER_KEY", "server-key");
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      String(input instanceof Request ? input.url : input).startsWith(
        "https://places.googleapis.com/",
      )
        ? Promise.resolve(Response.json({ error: { code: 404 } }, { status: 404 }))
        : realFetch(input, init),
    );
    expect(await findOrAddShop(placeId)).toBeNull();

    expect(await shopByPlaceId(placeId)).toBeNull();
  });

  test("adds a built-in shop only when dev tools are on", async () => {
    // The seed stores every built-in shop, so park one under another place
    // ID for the length of the test.
    const placeId = "dev-fallback:yaya-tea-durham";
    const parked = `parked-${randomUUID()}`;
    const admin = adminClient();
    await admin.from("shops").update({ place_id: parked }).eq("place_id", placeId);
    try {
      expect(await findOrAddShop(placeId)).toBeNull();
      expect(await shopByPlaceId(placeId)).toBeNull();

      vi.stubEnv("DEV_TOOLS", "true");
      const id = await findOrAddShop(placeId);
      expect(await shopByPlaceId(placeId)).toMatchObject({
        id,
        name: "Yaya Tea Durham",
        formatted_address: "807 E Main St, Durham, NC 27701, USA",
      });

      expect(await findOrAddShop("dev-fallback:made-up-shop")).toBeNull();
    } finally {
      await admin.from("shops").delete().eq("place_id", placeId);
      await admin.from("shops").update({ place_id: placeId }).eq("place_id", parked);
    }
  });
});
