# Boba Buds

A mobile-first boba journal you share with your friends. Next.js (App Router),
TypeScript, Tailwind CSS, shadcn/ui and Supabase, deployed on Vercel.

## Local setup

Prerequisites: Node 24+, Docker (running), and pnpm. If pnpm isn't installed,
enable it through Corepack: `corepack enable pnpm` (or
`corepack enable --install-directory ~/.local/bin pnpm` without root).

```sh
pnpm install
pnpm exec playwright install chromium   # browser for the e2e tests
cp .env.example .env.local              # local Supabase defaults
pnpm db:start                           # local Supabase in Docker (first run pulls images)
pnpm seed                               # reset the database and load the seeded users
pnpm dev                                # http://localhost:3000
```

Supabase Studio runs at http://127.0.0.1:54323 and Mailpit (catches magic-link
emails) at http://127.0.0.1:54324. Stop the stack with `pnpm db:stop`.

## Scripts

| Command            | What it does                                                 |
| ------------------ | ------------------------------------------------------------ |
| `pnpm dev`         | Start the app in development mode                            |
| `pnpm build`       | Production build                                             |
| `pnpm lint`        | ESLint                                                       |
| `pnpm typecheck`   | Generate Next route types, then `tsc --noEmit`               |
| `pnpm test:e2e`    | Playwright browser tests (starts `pnpm dev` if needed)       |
| `pnpm test:access` | Access-rule tests against the local Supabase (needs `db:start`) |
| `pnpm db:start`    | Start the local Supabase stack                               |
| `pnpm seed`        | Reset the local database, then load the seed data            |
| `pnpm db:reset`    | Recreate the local database and apply all migrations         |
| `pnpm db:status`   | Show local Supabase URLs and keys                            |

The Supabase CLI is a dev dependency, so run any other command with
`pnpm exec supabase <command>`.

## Seeded users and the Dev Bar

`pnpm seed` resets the local database and loads:

- **7 seeded users** with avatars (except `@taylor`, who shows the initials
  fallback), listed in `src/lib/dev/seed-users.ts`.
- **Every relationship state**, relative to the main test user `@mia`:
  | User      | Relation to @mia                                   |
  | --------- | -------------------------------------------------- |
  | `@jordan` | friend (also friends with `@priya`)                |
  | `@priya`  | friend                                             |
  | `@sam`    | friend                                             |
  | `@alex`   | sent mia a Friend Request (incoming for mia)       |
  | `@taylor` | mia sent them a Friend Request (outgoing for mia)  |
  | `@casey`  | stranger: no connection to anyone                  |
- **7 real Chapel Hill/Durham shops** (`src/lib/places/fallback.ts`).
- **40 Logs** spread over the last six weeks, by every user, with varied
  sweetness, ice, preset and custom toppings and notes
  (`src/lib/dev/seed-logs.ts`); 4 in 5 have a placeholder drink photo.
- **17 Cheers**, always from friends of the author
  (`src/lib/dev/seed-cheers.ts`).

With `DEV_TOOLS=true` (set in `.env.example`), every page shows the **Dev Bar**,
a floating purple button in the bottom-right corner. Open it and choose a
seeded user to sign in as them, no email needed. Switching creates a real
session, so the app then behaves exactly as it would for that user. The
**New user** entry creates a fresh account (no profile yet) and signs in as it,
so you land on the setup screen; use it to try onboarding without email.

The Dev Bar uses the dev-only route `/auth/dev-sign-in?as=<username>&next=<path>`
(or a POST to `?as=new`), which signs in with the service-role key. It returns 404
unless `DEV_TOOLS=true`, and 403 for any account that isn't a seeded user.

### Checking the privacy rules by hand

After `pnpm seed`, use the Dev Bar to switch between users and check that:

- `@mia`'s Feed shows her own Logs and jordan's, priya's and sam's, never
  alex's, taylor's or casey's.
- On `/friends`, mia has alex's request to accept or decline, a pending
  request to taylor she can cancel, and three friends.
- `/u/casey` (as mia) shows only casey's name, avatar and **Add friend**;
  `/u/jordan` shows the full journal (stats and Logs).
- A Shop Page (e.g. Moge Tee) lists only the Logs the current user can see,
  and its average covers only those.
- `@casey`'s Feed shows only casey's own Logs.
- Edit and Delete appear only on your own Logs; Cheers only on Logs you can
  see.

`pnpm seed --linked` passes `--linked` to `supabase db reset`, to seed a hosted
project that holds only seed data (set `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SECRET_KEY` to that project's values). Never point it at production:
it wipes the database.

## Google Places key

The Log form searches for shops with Google Places Autocomplete in the
browser, using `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Without a key, and only
when `DEV_TOOLS=true`, it searches a built-in list of real Chapel Hill/Durham
shops (`src/lib/places/fallback.ts`) instead; without a key or dev tools, shop
search is unavailable. The browser tests rely on that list, so run them
without a key. Shops from the list get `dev-fallback:` place IDs, not real
Google ones.

To use real autocomplete:

1. In Google Cloud, enable the **Maps JavaScript API** and **Places API (New)**,
   then create an API key.
2. **Restrict the key**, because it is visible to anyone using the app:
   - Application restriction: **Websites (HTTP referrers)**, limited to the
     app's domains (the production domain, `https://*-<team>.vercel.app/*` for
     previews, and `http://localhost:3000/*` / `http://127.0.0.1:3000/*` for
     local dev).
   - API restriction: only the Maps JavaScript API and Places API (New).
3. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` and in Vercel
   (Production and Preview). It's read at build time, so redeploy after you
   change it.
4. Users can't add shops directly. The first time someone logs at a place, the
   server fetches its details by place ID (Place Details, Places API (New))
   and stores them. Server requests have no browser referrer, so create a
   second key restricted to Places API (New) only and set it as
   `GOOGLE_PLACES_SERVER_KEY` (server-only, never `NEXT_PUBLIC_`) in
   `.env.local` and Vercel. Without it the server tries the browser key.

At MVP scale, usage should stay within Google's free tier. One search plus the
place-details call when a shop is picked is billed as one autocomplete session;
the server's details call for a shop nobody has logged at yet is billed
separately.

## Database migrations

Migrations live in `supabase/migrations/` and are applied in order by
`pnpm db:reset`. Create one with:

```sh
pnpm exec supabase migration new <name>
```

## Tests

- **Browser tests** (`tests/e2e/`, Playwright) drive the running app on a
  mobile and a desktop viewport. They sign in as seeded users through the Dev
  Bar route, so run `pnpm seed` first. Set `E2E_BASE_URL` to test an
  already-running app, such as a Vercel preview with dev tools on (tests that
  need the local Supabase stack are skipped there), or `E2E_PORT` to change the
  dev server port.
- **Access-rule tests** (`tests/access/`, Vitest) sign in to the local Supabase
  as different users and attempt direct reads and writes, to check row-level
  security. They read the local URL and keys from `supabase status`, so no env
  file is needed. Run `pnpm seed` first: they sign in as seeded users.

### Verifying the MVP

1. `pnpm lint && pnpm typecheck`
2. `pnpm seed`, then `pnpm test:access` (the full access-rule suite) and
   `pnpm test:e2e`.
3. The **core loop** (`tests/e2e/core-loop.spec.ts`) walks the whole MVP in
   one test: a New user from the Dev Bar finishes setup, sends `@sam` a Friend
   Request that sam accepts, logs a drink with a photo, sam sees it in his
   Feed and cheers it, the author edits it, the Profile shows the journal to
   the author and sam but not to stranger `@casey`, the Shop Page lists it,
   then the author deletes it and unfriends sam. It talks only to the app
   (Dev Bar route + seeded users), so it also runs against a preview:

   ```sh
   E2E_BASE_URL=https://<preview>.vercel.app pnpm test:e2e core-loop
   ```

   The preview needs:
   - `DEV_TOOLS=true` and a Supabase project that holds **only seed data**,
     seeded with `pnpm seed --linked` (see above). The test leaves the seed
     data as it found it, apart from one new `loop_*` account per run.
   - **No** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in the Preview environment, so
     the shop picker uses the built-in shop list the tests pick from.
   - If Vercel Deployment Protection is on, set
     `VERCEL_AUTOMATION_BYPASS_SECRET` to the project's "Protection Bypass
     for Automation" secret when running the command.

   Running the whole suite against a preview works the same way; tests that
   need the local Supabase stack skip themselves there.
4. By hand: use the Dev Bar on the preview to switch between seeded users and
   run through [Checking the privacy rules by hand](#checking-the-privacy-rules-by-hand).

## Deployment (manual, one-time)

These steps need the project owner's accounts:

1. **Hosted Supabase**: create a project at https://supabase.com. Push the
   migrations with `pnpm exec supabase link --project-ref <ref>` then
   `pnpm exec supabase db push`. In Auth > URL Configuration, set the Site URL
   to the production domain and add the Vercel preview URL pattern
   (`https://*-<team>.vercel.app/**`) to the redirect allow list.
2. **Vercel**: import the GitHub repo at https://vercel.com/new (framework:
   Next.js; pnpm is detected from the lockfile). The `main` branch deploys to
   production and every pull request gets a preview deployment.
3. **Environment variables** in Vercel (Project Settings > Environment
   Variables), from the hosted Supabase project's API settings:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
     `SUPABASE_SECRET_KEY`: Production and Preview.
   - `DEV_TOOLS=true`: **Preview only**, never Production.
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Production and Preview (see
     [Google Places key](#google-places-key)).
