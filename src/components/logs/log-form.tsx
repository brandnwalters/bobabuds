"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useState, useSyncExternalStore } from "react";

import { ShopPicker } from "@/components/logs/shop-picker";
import { StarRatingInput } from "@/components/logs/star-rating-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLog, type LogFormState } from "@/lib/logs/actions";
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

/** The single-screen Log form, in spec order: shop, drink, rating, date, then the optional extras. */
export function LogForm() {
  const [state, formAction, pending] = useActionState(createLog, initialState);
  const errors = state.errors;

  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [drinkName, setDrinkName] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const today = useToday();
  const [drankOn, setDrankOn] = useState<string | null>(null);
  const [sweetness, setSweetness] = useState<number | null>(null);
  const [ice, setIce] = useState<IceLevel | null>(null);
  const [toppings, setToppings] = useState<string[]>([]);
  const [customTopping, setCustomTopping] = useState("");
  const [note, setNote] = useState("");

  const errorProps = (field: LogField) =>
    errors[field]
      ? { "aria-invalid": true as const, "aria-describedby": `${field}-error` }
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
    <form action={formAction} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="shop">Shop</Label>
        <ShopPicker
          id="shop"
          value={shop}
          onChange={setShop}
          invalid={!!errors.shop && !shop}
          describedBy={errors.shop ? "shop-error" : undefined}
        />
        <input type="hidden" name="shop" value={shop ? JSON.stringify(shop) : ""} />
        <FieldError field="shop" errors={errors} hide={!!shop} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="drinkName">Drink</Label>
        <Input
          id="drinkName"
          name="drinkName"
          value={drinkName}
          onChange={(event) => setDrinkName(event.target.value)}
          maxLength={DRINK_NAME_MAX}
          placeholder="e.g. Brown sugar milk tea"
          autoComplete="off"
          {...errorProps("drinkName")}
        />
        <FieldError field="drinkName" errors={errors} />
      </div>

      <fieldset className="space-y-2">
        <legend id="rating-legend" className="text-sm font-medium">
          Rating
        </legend>
        <StarRatingInput
          value={rating}
          onChange={setRating}
          invalid={!!errors.rating}
          describedBy={errors.rating ? "rating-error" : undefined}
        />
        <FieldError field="rating" errors={errors} hide={rating !== null} />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="drankOn">Date</Label>
        <Input
          id="drankOn"
          name="drankOn"
          type="date"
          value={drankOn ?? today}
          max={today || undefined}
          onChange={(event) => setDrankOn(event.target.value)}
          className="w-auto"
          {...errorProps("drankOn")}
        />
        <FieldError field="drankOn" errors={errors} />
      </div>

      <div className="space-y-6 border-t pt-6">
        <p className="text-sm font-semibold text-muted-foreground">Optional</p>

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
        <FieldError field="sweetness" errors={errors} />

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
        <FieldError field="ice" errors={errors} />

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
          <FieldError field="toppings" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note</Label>
          <textarea
            id="note"
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
          <FieldError field="note" errors={errors} />
        </div>
      </div>

      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save Log"}
      </Button>
    </form>
  );
}

function FieldError({
  field,
  errors,
  hide,
}: {
  field: LogField;
  errors: LogFormState["errors"];
  hide?: boolean;
}) {
  if (!errors[field] || hide) return null;
  return (
    <p id={`${field}-error`} className="text-sm text-destructive">
      {errors[field]}
    </p>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = `${label.toLowerCase()}-label`;
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
