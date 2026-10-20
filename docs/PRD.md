# BobaBuds — Product Requirements

Status: agreed 2026-10-20. This file records decisions; change it only when a decision changes. Items marked are defaults the owner hasn't explicitly chosen yet.

## What it is

BobaBuds is a cozy, matcha-themed social app for logging the drinks you get at boba shops and Asian restaurants. You log a drink in a few seconds, your followers see it in their feed, and shop pages show what everyone thinks of that location.

It is a portfolio project, built so it can grow into a real product or a friends-only app without a rewrite. It is a fresh build; nothing is carried over from the owner's earlier hackathon project except the boba theme.

## Users and social model

- Public profiles, one-way follows (Letterboxd model).
- Each account has a unique `@username`: 3–20 characters, lowercase letters, digits, and underscores, unique ignoring case, with a small reserved list (`admin`, `explore`, `settings`, `api`, …).
- Logged-out visitors can view profiles, logs, and shop pages but can't log, follow, or report.
- Sign-in: Google OAuth and email magic link (Supabase Auth). No passwords.
- Avatar: the Google profile picture if there is one, otherwise initials. No avatar uploads in v1.

## Core action: log a drink

| Field | Required | Notes |
|---|---|---|
| Shop location | yes | A specific location from Google Places, so two locations of one chain stay separate. |
| Drink | yes | Free text with autocomplete from drinks already logged at that location (see Shop drinks). |
| Rating | yes | 1.0–10.0 in 0.5 steps. Stored as `numeric(3,1)` with a check constraint, so finer steps are a one-line change. |
| Category | no | On the log. Fixed list: milk tea, fruit tea, matcha, coffee, slush, other. |
| Sugar | no | 0 / 25 / 50 / 75 / 100 / other. "Other" stores no extra text. |
| Ice | no | none / less / regular / extra / hot. |
| Toppings | no | Multi-select from a seeded list plus custom free text. |
| Photo | no | One per log. See Photos. |
| Note | no | Short text. |
| Drank on | no | A date, never a time. Defaults to today in the user's local timezone (computed on the client). Future dates are rejected. |

There is **no price data anywhere** in the app.

Users can edit and delete any of their own logs.

## Which drinks and places count

Any drink a typical boba shop sells, or that appears on an Asian restaurant's drink menu.

Shop search uses Google Places and covers bubble tea shops, cafes, and Asian restaurants, with bubble tea shops ranked first.

Because the app never reads the user's location, search needs an area to be useful for chains ("Gong Cha" alone matches the whole world). The search has an optional "near" field (city or neighborhood), prefilled from the request's approximate IP region (Vercel geo headers). The region is used only for that request and never stored. Browser geolocation is never used.

## Shops, chains, and shop drinks

- A **shop location** is one Google Place (`google_place_id`). Logs belong to exactly one location.
- Locations carry a nullable `brand_id`, filled from known chain names. Brand pages are out of v1 but the column exists from day one.
- **Shop drinks** are the per-location menu, built up from logs: logging "Brown Sugar Milk Tea" at a location either links to an existing shop drink (via autocomplete) or creates one. Matching uses a normalized name (lowercase, trimmed, collapsed whitespace).
- What we may store from Places beyond `place_id` is limited by Google's terms (some fields can only be cached for a limited time). Roadmap item 3 checks the current terms before the `shops` table is created and records the result here. Showing Places data also requires Google attribution.

## Privacy

Timestamps and location are the two things a public drink log can leak. The rules:

- **No time of day is ever exposed.** Only `drank_on` (a date) is public.
  - Every timestamp column (`logs.created_at`, `follows.created_at`, `reports.*`, any `updated_at`) is hidden from the `anon` and `authenticated` roles with column grants: revoke table-level `select`, then grant `select` on the public columns only.
  - Anything that needs to sort by a hidden timestamp (feeds, "most recent" tie-breaks in stats) goes through Postgres functions that sort internally and return only public columns. These functions are `security definer` with `set search_path = ''`, so they bypass RLS and must re-apply the visibility rules themselves; pgTAP tests show they return only rows the caller could otherwise see.
  - Generated Supabase types still list hidden columns, so app queries name their columns explicitly instead of using `select('*')`.
  - Views in `public` must use `security_invoker = true`, or they bypass RLS.
  - Ids are random UUIDv4, never UUIDv7 or other time-ordered ids.
- **No user GPS.** Location comes only from the shop the user picks.
- **Photo metadata is stripped.** Photos are re-encoded on the client before upload, which removes EXIF data (GPS position and capture time).
- **Known limitation:** public Storage URLs return a `Last-Modified` header that reveals roughly when a photo was uploaded. Accepted for v1; revisit if it matters.
- No price data.

## Photos

- Images only, one per log, resized and re-encoded on the client (canvas → WebP or JPEG, max about 1600px on the long edge) and uploaded straight to Supabase Storage, never through a Vercel function (their request bodies are capped at about 4.5 MB).
- The bucket enforces `allowed_mime_types` and `file_size_limit`. Storage RLS allows writes only under the uploader's own path, and object listing is not allowed.

## Feeds and discovery

- **Following** tab: logs from people you follow, newest first.
- **Explore** tab: recent public logs from everyone, newest first.
- "Newest first" means by when the log was posted (`created_at desc, id desc`), sorted server-side so `created_at` never reaches the client. A backdated log still appears at the top when posted.
- New users land on Explore until they follow someone.
- User search by `@username`.

## Profile

Your logs plus these stats:

- **Total drinks:** number of logs.
- **Average rating:** mean of your ratings, one decimal.
- **Top shop:** the shop location you've logged most. Ties go to the one logged most recently.
- **Top drink:** the shop drink you've logged most. Ties go to the higher average rating.
- **Category breakdown:** count of logs per category, plus "uncategorized".
- **Favorite toppings:** your top 3 toppings by count. Custom toppings are grouped by normalized name.

## Shop location page

Every log at that location, average rating to one decimal, and top drinks: the 5 shop drinks with the most logs, each with its average rating. Ties go to the higher average.

## Moderation

- Photo rules above.
- A "report" button creates a report on a log; a user can report a log only once. The owner reviews reports by hand.

## Look and feel

Cozy and warm with a matcha-green palette. Light and dark mode. Mobile-first; installable as a PWA.

## v1 scope

1. Sign up, pick a username, set up a profile.
2. Log a drink (with photo).
3. Profile page with stats.
4. Follow people; Following and Explore feeds; user search.
5. Shop location page.
6. Likes, if time allows.

**Later:** comments, brand pages, map, "boba runs" (meetups), notifications, private accounts, moderation tools beyond reports, native app (Expo).

## Stack

- Next.js (App Router) + TypeScript (strict), Tailwind CSS.
- Supabase: Postgres, Auth, Storage, row-level security (RLS) as the real security boundary.
- Google Places API for shop search, behind an interface so tests use a fake client.
- Hosting: Vercel (Hobby) + Supabase (free tier). Vercel Hobby doesn't allow commercial use, and the Supabase free tier pauses inactive projects; a real launch means paid plans.
- Local development runs fully offline against the Supabase CLI stack, except live Places search.

## Draft data model

Names are a starting point; roadmap item 3 settles them under test. All ids are UUIDv4.

- `profiles` (id = auth user id, username unique on `lower(username)`, display_name, bio)
- `brands` (id, name)
- `shops` (id, google_place_id unique, brand_id null, plus whatever Places fields the terms allow us to store)
- `shop_drinks` (id, shop_id, name, normalized_name; unique on shop_id + normalized_name; unique on id + shop_id for the logs composite foreign key)
- `toppings` (id, name) seeded
- `logs` (id, user_id, shop_id, shop_drink_id, rating, category, sugar, ice, note, drank_on date, photo_path, created_at). A composite foreign key `(shop_drink_id, shop_id)` keeps the drink and shop consistent.
- `log_toppings` (id, log_id, topping_id null, custom_name null; exactly one of topping_id / custom_name set)
- `likes` (user_id, log_id), if likes ship
- `follows` (follower_id, followee_id, created_at; no self-follow)
- `reports` (id, log_id, reporter_id, reason, created_at, resolved_at; unique on log_id + reporter_id)

## How it gets built

See `CLAUDE.md` for the working rules and `docs/ROADMAP.md` for the order of work.

## Accounts the owner creates

The owner creates these when the roadmap says so; agents never create them:

- Google Cloud project with billing, a Places API key, and an OAuth client for Google sign-in (roadmap items 4 and 5, for real-environment checks; tests don't need them)
- Supabase project and Vercel project linked to the GitHub repo (roadmap item 5b, the skeleton deploy)
- An email-sending account for magic links in production, such as Resend (item 5b). Supabase's built-in email is heavily rate-limited and not meant for real users.
- Publishing the Google OAuth consent screen out of "Testing" mode (item 12)
