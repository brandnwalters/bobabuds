"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The Log form's drink name: free text, plus an ARIA combobox list of
 * `suggestions` (drinks the user has logged at the chosen shop) that narrows
 * as they type. Picking one fills the field.
 */
export function DrinkNameInput({
  suggestions,
  value,
  onChange,
  ...inputProps
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);

  const needle = value.trim().toLowerCase();
  const matches = suggestions.filter(
    (drink) => drink.toLowerCase().includes(needle) && drink.toLowerCase() !== needle,
  );
  const open = focused && matches.length > 0;

  function pick(drink: string) {
    onChange(drink);
    setFocused(false);
  }

  return (
    <div className="relative">
      <Input
        {...inputProps}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setFocused(true);
          setActive(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => (i - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            pick(matches[active] ?? matches[0]);
          } else if (event.key === "Escape") {
            setFocused(false);
          }
        }}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Past orders here"
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border bg-card p-1 shadow-lg"
      >
        {matches.map((drink, i) => (
          <li
            key={drink}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-2 font-semibold",
              i === active && "bg-accent",
            )}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(drink)}
          >
            {drink}
          </li>
        ))}
      </ul>
    </div>
  );
}
