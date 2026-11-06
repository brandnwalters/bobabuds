/// <reference types="google.maps" />
import type { ShopSearch } from "@/lib/places/types";

// Bias results toward the Triangle (Chapel Hill/Durham) without excluding elsewhere.
const LOCATION_BIAS = { center: { lat: 35.96, lng: -78.99 }, radius: 40_000 };

let placesLibrary: Promise<google.maps.PlacesLibrary> | undefined;

/** Loads the Maps JavaScript API once (async loading) and returns the Places library. */
function loadPlaces(apiKey: string): Promise<google.maps.PlacesLibrary> {
  placesLibrary ??= new Promise<void>((resolve, reject) => {
    if ("google" in window && window.google.maps) return resolve();
    const callback = "__bobabudsMapsReady";
    (window as unknown as Record<string, () => void>)[callback] = () => resolve();
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      callback,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error("Couldn't load Google Maps."));
    document.head.append(script);
  }).then(
    () => google.maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>,
  );
  placesLibrary.catch(() => {
    placesLibrary = undefined; // allow a retry later
  });
  return placesLibrary;
}

/**
 * Shop search through Google Places (New) in the browser. One session token
 * covers a run of autocomplete calls and the details call that ends it, so
 * the run is billed as one session.
 */
export function createGoogleShopSearch(apiKey: string): ShopSearch {
  let session: google.maps.places.AutocompleteSessionToken | undefined;
  const predictions = new Map<string, google.maps.places.PlacePrediction>();

  return {
    async suggest(query) {
      const input = query.trim();
      if (!input) return [];
      const places = await loadPlaces(apiKey);
      session ??= new places.AutocompleteSessionToken();
      const { suggestions } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: session,
          locationBias: LOCATION_BIAS,
          includedRegionCodes: ["us"],
        });
      return suggestions.flatMap(({ placePrediction: p }) => {
        if (!p) return [];
        predictions.set(p.placeId, p);
        return [
          {
            placeId: p.placeId,
            name: p.mainText?.text ?? p.text.text,
            detail: p.secondaryText?.text ?? "",
          },
        ];
      });
    },

    async details({ placeId }) {
      const places = await loadPlaces(apiKey);
      const place =
        predictions.get(placeId)?.toPlace() ?? new places.Place({ id: placeId });
      await place.fetchFields({
        fields: ["id", "displayName", "formattedAddress", "location", "googleMapsURI"],
      });
      session = undefined; // the details call ends the billing session
      predictions.clear();
      if (!place.location) throw new Error("That place has no location.");
      return {
        placeId: place.id,
        name: place.displayName ?? "",
        formattedAddress: place.formattedAddress ?? "",
        latitude: place.location.lat(),
        longitude: place.location.lng(),
        googleMapsUrl:
          place.googleMapsURI ??
          `https://www.google.com/maps/place/?q=place_id:${place.id}`,
      };
    },
  };
}
