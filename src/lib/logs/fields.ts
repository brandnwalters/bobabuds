/**
 * Log field rules. These mirror the check constraints on public.logs, which
 * remain the real boundary; this gives friendly messages first.
 */
import type { ShopDetails } from "@/lib/places/types";

export const DRINK_NAME_MAX = 80;
export const NOTE_MAX = 280;
export const TOPPING_MAX = 30;
export const TOPPINGS_MAX_COUNT = 12;

export const RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;
export const SWEETNESS_LEVELS = [0, 25, 50, 75, 100] as const;
export const ICE_LEVELS = ["none", "less", "regular", "extra"] as const;
export type IceLevel = (typeof ICE_LEVELS)[number];

export const ICE_LABELS: Record<IceLevel, string> = {
  none: "No ice",
  less: "Less ice",
  regular: "Regular ice",
  extra: "Extra ice",
};

/** Toppings offered as one-tap chips; users can add custom ones too. */
export const PRESET_TOPPINGS = [
  "Boba",
  "Mini boba",
  "Popping boba",
  "Crystal boba",
  "Lychee jelly",
  "Grass jelly",
  "Coconut jelly",
  "Pudding",
  "Red bean",
  "Taro balls",
  "Aloe vera",
  "Cheese foam",
] as const;

export type LogInput = {
  shop: ShopDetails;
  drinkName: string;
  rating: number;
  drankOn: string;
  sweetness: number | null;
  ice: IceLevel | null;
  toppings: string[];
  note: string | null;
};

export type LogField =
  | "shop"
  | "drinkName"
  | "rating"
  | "drankOn"
  | "sweetness"
  | "ice"
  | "toppings"
  | "note"
  | "photo";
export type LogErrors = Partial<Record<LogField | "form", string>>;

/** Reads and checks the Log form. Returns the clean input, or messages per field. */
export function parseLogForm(
  formData: FormData,
): { input: LogInput; errors?: undefined } | { input?: undefined; errors: LogErrors } {
  const errors: LogErrors = {};
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  const shop = parseShop(text("shop"));
  if (!shop) errors.shop = "Pick the shop.";

  const drinkName = text("drinkName");
  if (!drinkName) errors.drinkName = "Enter the drink name.";
  else if (drinkName.length > DRINK_NAME_MAX) {
    errors.drinkName = `Drink names are at most ${DRINK_NAME_MAX} characters.`;
  }

  const rating = Number(text("rating"));
  if (!text("rating")) errors.rating = "Pick a rating.";
  else if (!(RATINGS as readonly number[]).includes(rating)) {
    errors.rating = "Ratings go from half a star to 5 stars.";
  }

  const drankOn = text("drankOn");
  if (!drankOn) errors.drankOn = "Pick the date.";
  else if (!isIsoDate(drankOn)) errors.drankOn = "That isn't a valid date.";
  else if (drankOn > latestToday()) errors.drankOn = "The date can't be in the future.";

  const sweetnessText = text("sweetness");
  const sweetness = sweetnessText ? Number(sweetnessText) : null;
  if (sweetness !== null && !(SWEETNESS_LEVELS as readonly number[]).includes(sweetness)) {
    errors.sweetness = "Pick a sweetness from the list.";
  }

  const iceText = text("ice");
  const ice = iceText ? (iceText as IceLevel) : null;
  if (ice !== null && !ICE_LEVELS.includes(ice)) errors.ice = "Pick an ice level from the list.";

  const toppings = [
    ...new Set(formData.getAll("toppings").map((t) => String(t).trim()).filter(Boolean)),
  ];
  if (toppings.length > TOPPINGS_MAX_COUNT) {
    errors.toppings = `Pick at most ${TOPPINGS_MAX_COUNT} toppings.`;
  } else if (toppings.some((t) => t.length > TOPPING_MAX)) {
    errors.toppings = `Toppings are at most ${TOPPING_MAX} characters.`;
  }

  const note = text("note") || null;
  if (note && note.length > NOTE_MAX) {
    errors.note = `Notes are at most ${NOTE_MAX} characters.`;
  }

  if (Object.keys(errors).length > 0 || !shop) return { errors };
  return {
    input: { shop, drinkName, rating, drankOn, sweetness, ice, toppings, note },
  };
}

/**
 * Today's date (`YYYY-MM-DD`) in the time zone furthest ahead (UTC+14).
 * The server doesn't know the user's time zone, so a date after this is in
 * the future for everyone, while "today" stays allowed for everyone.
 */
function latestToday(now = new Date()) {
  return new Date(now.getTime() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function parseShop(json: string): ShopDetails | null {
  if (!json) return null;
  try {
    const s = JSON.parse(json) as Partial<ShopDetails>;
    const ok =
      typeof s.placeId === "string" && s.placeId.trim() !== "" &&
      typeof s.name === "string" && s.name.trim() !== "" &&
      typeof s.formattedAddress === "string" &&
      typeof s.latitude === "number" && Number.isFinite(s.latitude) &&
      typeof s.longitude === "number" && Number.isFinite(s.longitude) &&
      typeof s.googleMapsUrl === "string" && s.googleMapsUrl.startsWith("https://");
    if (!ok) return null;
    return {
      placeId: s.placeId!,
      name: s.name!.trim(),
      formattedAddress: s.formattedAddress!,
      latitude: s.latitude!,
      longitude: s.longitude!,
      googleMapsUrl: s.googleMapsUrl!,
    };
  } catch {
    return null;
  }
}

/** "4.5 out of 5 stars" */
export function ratingLabel(rating: number) {
  return `${rating} out of 5 stars`;
}

/** Formats a `YYYY-MM-DD` date as e.g. "Nov 2, 2026" (no time zone shift). */
export function formatDrankOn(drankOn: string) {
  return new Date(`${drankOn}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
