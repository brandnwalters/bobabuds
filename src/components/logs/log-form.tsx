"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useId, useState, useSyncExternalStore } from "react";

import { ImagePicker } from "@/components/images/image-picker";
import { DrinkNameInput } from "@/components/logs/drink-name-input";
import { ShopPicker } from "@/components/logs/shop-picker";
import { StarRatingInput } from "@/components/logs/star-rating-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ImageChoice, setImageChoice } from "@/lib/images/upload";
import { createLog, type LogFormState, updateLog } from "@/lib/logs/actions";
import {
  DRINK_NAME_MAX,
  ICE_LABELS,
  ICE_LEVELS,
  NOTE_MAX,
  PRESET_TOPPINGS,
  SWEETNESS_LEVELS,
  TOPPING_MAX,
  type IceLevel,
  type LogField,
} from "@/lib/logs/fields";
import { LOG_PHOTO_FIELD, PHOTO_MAX_EDGE } from "@/lib/logs/photos";
import type { LogWithPhoto } from "@/lib/logs/queries";
import type { LogSuggestions } from "@/lib/logs/suggestions";
import type { ShopDetails } from "@/lib/places/types";
import { cn } from "@/lib/utils";

const initialState: LogFormState = { errors: {} };

/** Today's date in the browser's time zone, as `YYYY-MM-DD` ("" while server rendering). */
function useToday() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    },
    () => "",
  );
}

/**
 * The single-screen Log form, in spec order: shop, drink, rating, date, then
 * the optional extras. Without `log` it creates a Log; with `log` it starts
 * from that Log's values and saves over it. `suggestions` (recent shops and
 * drink names from the user's own Logs) power the shop and drink shortcuts.
 * `builtInShops` lets the shop search use the built-in list when there's no
 * Google key; pass `devToolsEnabled()`.
 */
export function LogForm({
  log,
  suggestions = { recentShops: [], drinksByPlaceId: {} },
  builtInShops = false,
}: {
  log?: LogWithPhoto;
  suggestions?: LogSuggestions;
  builtInShops?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    log ? updateLog.bind(null, log.id) : createLog,
    initialState,
  );
  const errors = state.errors;
  const formId = useId();

  const [shop, setShop] = useState<ShopDetails | null>(log ? shopDetails(log) : null);
  const [drinkName, setDrinkName] = useState(log?.drinkName ?? "");
  const [rating, setRating] = useState<number | null>(log?.rating ?? null);
  const today = useToday();
  const [drankOn, setDrankOn] = useState<string | null>(log?.drankOn ?? null);
  const [sweetness, setSweetness] = useState<number | null>(log?.sweetness ?? null);
  const [ice, setIce] = useState<IceLevel | null>(log?.ice ?? null);
  const [toppings, setToppings] = useState<string[]>(log?.toppings ?? []);
  const [customTopping, setCustomTopping] = useState("");
  const [note, setNote] = useState(log?.note ?? "");
  const [photo, setPhoto] = useState<ImageChoice>({ status: "unchanged" });
  const [photoBusy, setPhotoBusy] = useState(false);
  const { recentShops, drinksByPlaceId } = suggestions;
  const drinkSuggestions = (shop && drinksByPlaceId[shop.placeId]) || [];

  const errorProps = (field: LogField) =>
    errors[field]
      ? { "aria-invalid": true as const, "aria-describedby": `${formId}-${field}-error` }
      : {};

  function toggleTopping(topping: string) {
    setToppings((current) =>
      current.includes(topping)
        ? current.filter((t) => t !== topping)
        : [...current, topping],
    );
  }

  function addCustomTopping() {
    const topping = customTopping.trim();
    if (!topping) return;
    if (!toppings.some((t) => t.toLowerCase() === topping.toLowerCase())) {
      setToppings([...toppings, topping]);
    }
    setCustomTopping("");
  }

  const customToppings = toppings.filter(
    (t) => !(PRESET_TOPPINGS as readonly string[]).includes(t),
  );

  return (
    <form
      // The photo lives in state (React resets file inputs after an action).
      action={(formData) => {
        setImageChoice(formData, LOG_PHOTO_FIELD, photo);
        formAction(formData);
      }}
      className="space-y-6"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor={`${formId}-shop`}>Shop</Label>
        <ShopPicker
          id={`${formId}-shop`}
          value={shop}
          onChange={setShop}
          recentShops={recentShops}
          builtInShops={builtInShops}
          invalid={!!errors.shop && !shop}
          describedBy={errors.shop ? `${formId}-shop-error` : undefined}
        />
        <input type="hidden" name="shop" value={shop ? JSON.stringify(shop) : ""} />
        <FieldError formId={formId} field="shop" errors={errors} hide={!!shop} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-drinkName`}>Drink</Label>
        <DrinkNameInput
          id={`${formId}-drinkName`}
          name="drinkName"
          value={drinkName}
          onChange={setDrinkName}
          suggestions={drinkSuggestions}
          maxLength={DRINK_NAME_MAX}
          placeholder="e.g. Brown sugar milk tea"
          {...errorProps("drinkName")}
        />
        <FieldError formId={formId} field="drinkName" errors={errors} />
      </div>

      <fieldset className="space-y-2">
        <legend id={`${formId}-rating-legend`} className="text-sm font-medium">
          Rating
        </legend>
        <StarRatingInput
          value={rating}
          onChange={setRating}
          invalid={!!errors.rating}
          describedBy={errors.rating ? `${formId}-rating-error` : undefined}
          labelledBy={`${formId}-rating-legend`}
        />
        <FieldError formId={formId} field="rating" errors={errors} hide={rating !== null} />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-drankOn`}>Date</Label>
        <Input
          id={`${formId}-drankOn`}
          name="drankOn"
          type="date"
          value={drankOn ?? today}
          max={today || undefined}
          onChange={(event) => setDrankOn(event.target.value)}
          className="w-auto"
          {...errorProps("drankOn")}
        />
        <FieldError formId={formId} field="drankOn" errors={errors} />
      </div>

      <div className="space-y-6 border-t pt-6">
        <p className="text-sm font-semibold text-muted-foreground">Optional</p>

        <div className="space-y-2">
          <p className="text-sm font-medium">Photo</p>
          <ImagePicker
            initialUrl={log?.photoUrl}
            maxEdge={PHOTO_MAX_EDGE}
            labels={{
              add: "Add photo",
              replace: "Replace photo",
              remove: "Remove photo",
              preview: "Photo preview",
            }}
            onChange={setPhoto}
            onBusyChange={setPhotoBusy}
            describedBy={errors.photo ? `${formId}-photo-error` : undefined}
          />
          <FieldError formId={formId} field="photo" errors={errors} />
        </div>

        <ChipGroup label="Sweetness">
          {SWEETNESS_LEVELS.map((level) => (
            <Chip
              key={level}
              pressed={sweetness === level}
              onClick={() => setSweetness(sweetness === level ? null : level)}
            >
              {level}%
            </Chip>
          ))}
        </ChipGroup>
        <input type="hidden" name="sweetness" value={sweetness ?? ""} />
        <FieldError formId={formId} field="sweetness" errors={errors} />

        <ChipGroup label="Ice">
          {ICE_LEVELS.map((level) => (
            <Chip
              key={level}
              pressed={ice === level}
              onClick={() => setIce(ice === level ? null : level)}
            >
              {ICE_LABELS[level]}
            </Chip>
          ))}
        </ChipGroup>
        <input type="hidden" name="ice" value={ice ?? ""} />
        <FieldError formId={formId} field="ice" errors={errors} />

        <div className="space-y-3">
          <ChipGroup label="Toppings">
            {PRESET_TOPPINGS.map((topping) => (
              <Chip
                key={topping}
                pressed={toppings.includes(topping)}
                onClick={() => toggleTopping(topping)}
              >
                {topping}
              </Chip>
            ))}
            {customToppings.map((topping) => (
              <Chip
                key={topping}
                pressed
                onClick={() => toggleTopping(topping)}
                aria-label={`Remove ${topping}`}
              >
                {topping}
                <X aria-hidden className="size-3.5" />
              </Chip>
            ))}
          </ChipGroup>
          {toppings.map((topping) => (
            <input key={topping} type="hidden" name="toppings" value={topping} />
          ))}
          <div className="flex gap-2">
            <Input
              aria-label="Add a topping"
              placeholder="Something else?"
              value={customTopping}
              maxLength={TOPPING_MAX}
              onChange={(event) => setCustomTopping(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomTopping();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addCustomTopping}
            >
              <Plus aria-hidden />
              Add<span className="sr-only"> topping</span>
            </Button>
          </div>
          <FieldError formId={formId} field="toppings" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${formId}-note`}>Note</Label>
          <textarea
            id={`${formId}-note`}
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={NOTE_MAX}
            rows={3}
            placeholder="Too sweet? Perfect chew? Remember it for next time."
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
            {...errorProps("note")}
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {note.length}/{NOTE_MAX}
          </p>
          <FieldError formId={formId} field="note" errors={errors} />
        </div>
      </div>

      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending || photoBusy}>
        {pending ? "Saving…" : log ? "Save changes" : "Save Log"}
      </Button>
    </form>
  );
}

function shopDetails({ shop }: LogWithPhoto): ShopDetails {
  return {
    placeId: shop.placeId,
    name: shop.name,
    formattedAddress: shop.formattedAddress,
    latitude: shop.latitude,
    longitude: shop.longitude,
    googleMapsUrl: shop.googleMapsUrl,
  };
}

function FieldError({
  formId,
  field,
  errors,
  hide,
}: {
  formId: string;
  field: LogField;
  errors: LogFormState["errors"];
  hide?: boolean;
}) {
  if (!errors[field] || hide) return null;
  return (
    <p id={`${formId}-${field}-error`} className="text-sm text-destructive">
      {errors[field]}
    </p>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <p id={id} className="text-sm font-medium">
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

function Chip({
  pressed,
  className,
  ...props
}: React.ComponentProps<"button"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground hover:bg-accent",
        className,
      )}
      {...props}
    />
  );
}
