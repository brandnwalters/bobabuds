/** One autocomplete suggestion for the shop search. */
export type ShopSuggestion = {
  placeId: string;
  /** The shop's name, e.g. "Yaya Tea". */
  name: string;
  /** The rest of the address, e.g. "East Franklin Street, Chapel Hill, NC". */
  detail: string;
};

/** Everything a Log needs to store about a shop (one row of public.shops). */
export type ShopDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
};

/**
 * Where shop search results come from. The Log form talks only to this, so it
 * works the same with Google Places or the built-in fallback list.
 */
export type ShopSearch = {
  suggest(query: string): Promise<ShopSuggestion[]>;
  /** Full details for a suggestion; call once, when the user picks it. */
  details(suggestion: ShopSuggestion): Promise<ShopDetails>;
};
