/** A UUID (any case), unanchored, for building larger patterns. */
export const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Exactly a UUID. Check ids from URLs or forms before they reach a query. */
export const UUID = new RegExp(`^${UUID_PATTERN}$`, "i");
