"use client";

import { MapPin, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { shopSearch } from "@/lib/places/shop-search";
import type { ShopDetails, ShopSuggestion } from "@/lib/places/types";
import { cn } from "@/lib/utils";

type Search =
  | { status: "idle" }
  | { status: "searching"; query: string }
  | { status: "done"; query: string; results: ShopSuggestion[] }
  | { status: "failed"; query: string };

/**
 * Shop search box (an ARIA combobox). Suggestions come from `shopSearch()`:
 * Google Places when a key is configured, else the built-in fallback list.
 * Picking one fetches its details and hands them to `onChange`. While the box
 * is focused and empty it lists `recentShops` instead; those already have
 * their details, so picking one skips the search.
 */
export function ShopPicker({
  id,
  value,
  onChange,
  recentShops = [],
  invalid,
  describedBy,
}: {
  id: string;
  value: ShopDetails | null;
  onChange: (shop: ShopDetails | null) => void;
  recentShops?: ShopDetails[];
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [active, setActive] = useState(0);
  const [picking, setPicking] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const latest = useRef("");

  const trimmed = query.trim();
  useEffect(() => {
    latest.current = trimmed;
    if (!trimmed) return;
    const timer = setTimeout(async () => {
      setSearch({ status: "searching", query: trimmed });
      try {
        const results = await shopSearch().suggest(trimmed);
        if (latest.current === trimmed) {
          setSearch({ status: "done", query: trimmed, results });
          setActive(0);
        }
      } catch {
        if (latest.current === trimmed) setSearch({ status: "failed", query: trimmed });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const recent = !trimmed && showRecent;
  const results: ShopSuggestion[] = recent
    ? recentShops.map((shop) => ({
        placeId: shop.placeId,
        name: shop.name,
        detail: shop.formattedAddress,
      }))
    : trimmed && search.status === "done" && search.query === trimmed
      ? search.results
      : [];
  const open = results.length > 0 && !picking;

  async function pick(suggestion: ShopSuggestion) {
    const known = recent && recentShops.find((s) => s.placeId === suggestion.placeId);
    if (known) {
      setShowRecent(false);
      onChange(known);
      return;
    }
    setPicking(true);
    try {
      onChange(await shopSearch().details(suggestion));
      setQuery("");
      setSearch({ status: "idle" });
    } catch {
      setSearch({ status: "failed", query: trimmed });
    } finally {
      setPicking(false);
    }
  }

  if (value) {
    return (
      <div
        data-testid="chosen-shop"
        className="flex items-start gap-3 rounded-xl border bg-card p-3"
      >
        <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{value.name}</p>
          <p className="truncate text-sm text-muted-foreground">{value.formattedAddress}</p>
        </div>
        <button
          type="button"
          className="rounded-full p-1 text-muted-foreground hover:bg-accent"
          aria-label={`Change shop (${value.name})`}
          onClick={() => {
            onChange(null);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    );
  }

  let status = "";
  if (picking) status = "Loading shop…";
  else if (trimmed && search.status === "failed" && search.query === trimmed) {
    status = "Shop search isn't working right now. Try again.";
  } else if (trimmed && search.status === "done" && search.query === trimmed && !results.length) {
    status = "No shops found.";
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder="Search for a boba shop"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onFocus={() => setShowRecent(true)}
        onBlur={() => setShowRecent(false)}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => (i + 1) % results.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => (i - 1 + results.length) % results.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            void pick(results[active]);
          } else if (event.key === "Escape") {
            setQuery("");
            setShowRecent(false);
          }
        }}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={recent ? "Recent shops" : "Shop suggestions"}
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border bg-card p-1 shadow-lg"
      >
        {results.map((s, i) => (
          <li
            key={s.placeId}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-2",
              i === active && "bg-accent",
            )}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void pick(s)}
          >
            <span className="block font-semibold">{s.name}</span>
            <span className="block truncate text-sm text-muted-foreground">{s.detail}</span>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-1 text-sm text-muted-foreground empty:hidden">
        {status}
      </p>
    </div>
  );
}
