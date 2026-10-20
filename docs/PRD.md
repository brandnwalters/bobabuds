# BobaBuds — Product Requirements

Status: agreed 2026-10-20. This file records decisions; change it only when a decision changes.

## What it is

BobaBuds is a cozy, matcha-themed social app for logging the drinks you get at boba shops and Asian restaurants. You log a drink in a few seconds, your followers see it in their feed, and shop pages show what everyone thinks of that location.

It is a portfolio project, built so it can grow into a real product or a friends-only app without a rewrite. It is a fresh build; nothing is carried over from the 2026 hackathon code except the boba theme.

## Users and social model

- Public profiles, one-way follows (Letterboxd model).
- Each account has a unique `@username`.
- Sign-in: Google OAuth and email magic link (Supabase Auth). No passwords.

## Core action: log a drink

| Field | Required | Notes |
|---|---|---|
| Shop location | yes | A specific location from Google Places, so two locations of one chain stay separate. |
| Drink | yes | Free text with autocomplete from drinks already logged at that location (see Shop drinks). |
| Rating | yes | 1.0–10.0 in 0.5 steps. Stored as `numeric(3,1)` with a check constraint, so finer steps are a one-line change. |
| Category | no | Fixed list: milk tea, fruit tea, matcha, coffee, slush, other. |
| Sugar | no | 0 / 25 / 50 / 75 / 100 / other. |
| Ice | no | none / less / regular / extra / hot. |
| Toppings | no | Multi-select from a seeded list plus custom free text. |
| Photo | no | One per log, resized on upload. |
| Note | no | Short text. |
| Date | no | Defaults to today. Date only, never a time of day. |

There is **no price data anywhere** in the app.

Users can edit and delete any of their own logs.

## Which drinks and places count

Any drink a typical boba shop sells, or that appears on an Asian restaurant's drink menu.

Shop search uses Google Places and covers bubble tea shops, cafes, and Asian restaurants, with bubble tea shops ranked first.

## Shops, chains, and shop drinks

- A **shop location** is one Google Place (`google_place_id`). Logs belong to exactly one location.
- Locations carry a nullable `brand_id`, filled from known chain names. Brand pages are out of v1 but the column exists from day one.
- **Shop drinks** are the per-location menu, built up from logs: logging "Brown Sugar Milk Tea" at a location either links to an existing shop drink (via autocomplete) or creates one. Matching uses a normalized name (lowercase, trimmed, collapsed whitespace).

## Privacy

- Logs are public, but only the date is ever exposed — never `created_at` or any time of day. Public reads go through a view or column grants that omit timestamps.
- No user GPS is collected or stored. Location comes only from the shop the user picks.
- No price data.

## Feeds and discovery

- **Following** tab: logs from people you follow, newest first.
- **Explore** tab: recent public logs from everyone, newest first. New users land here until they follow someone.
- User search by `@username`.

## Profile

Your logs plus stats: total drinks logged, average rating given, top shop (most logs), top drink, category breakdown, favorite toppings.

## Shop location page

Every log at that location, average rating (shown to one decimal), and top drinks.

## Moderation

- Images only, one per log, resized on upload.
- A "report" button sets a flag on the log; the owner reviews reports by hand.

## Look and feel

Cozy and warm with a matcha-green palette. Light and dark mode. Mobile-first; installable as a PWA.

## v1 scope

1. Sign up, pick a username, set up a profile.
2. Log a drink (with photo).
3. Profile page with stats.
4. Follow people; Following and Explore feeds; user search.
5. Shop location page.

**Later:** likes (first if time allows), comments, brand pages, map, "boba runs" (meetups), notifications, private accounts, moderation tools beyond the report flag, native app (Expo).

## Stack

- Next.js (App Router) + TypeScript (strict), Tailwind CSS.
- Supabase: Postgres, Auth, Storage, row-level security (RLS) as the real security boundary.
- Google Places API for shop search, behind an interface so tests use a fake client.
- Hosting: Vercel (hobby) + Supabase (free tier).
- Local development runs fully offline against the Supabase CLI stack, except live Places search.

## Draft data model

Names are a starting point; the first database issue settles them under test.

- `profiles` (id = auth user id, username unique, display_name, avatar_path, bio)
- `brands` (id, name)
- `shops` (id, google_place_id unique, name, address, brand_id null) — what we may cache from Places is limited by Google's terms; check them in the Places issue.
- `shop_drinks` (id, shop_id, name, normalized_name, category null; unique on shop_id + normalized_name)
- `toppings` (id, name) seeded
- `logs` (id, user_id, shop_id, shop_drink_id, rating, sugar, ice, note, drank_on date, photo_path, created_at)
- `log_toppings` (log_id, topping_id null, custom_name null)
- `follows` (follower_id, followee_id, created_at; no self-follow)
- `reports` (id, log_id, reporter_id, reason, created_at, resolved_at)

## How it gets built

See `CLAUDE.md` for the working rules and `docs/ROADMAP.md` for the order of work.

## Accounts the owner creates

The owner creates these when the roadmap says so; agents never create them:

- Supabase project (before the first deploy)
- Vercel project linked to the GitHub repo (before the first deploy)
- Google Cloud project with billing, a Places API key, and an OAuth client for Google sign-in (before the Places and Google sign-in issues hit a real environment)
