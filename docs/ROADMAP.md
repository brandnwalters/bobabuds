# Roadmap

This file is the task list; there are no GitHub issues. Work top to bottom. Each item is one branch and one PR. "Done when" lists the observable result a reviewer checks; from item 1 on, every item also needs passing CI and a clean agent review (see `CLAUDE.md`).

🔑 marks a step where the owner creates an account or key. Agents stop and ask before that step.

## 0. Planning docs

PRD, roadmap, `CLAUDE.md`, glossary, `.gitignore`.

**Done when:** the owner approves the docs and the PR merges.

## 1. Scaffold

Next.js (App Router, TypeScript strict) + Tailwind + ESLint, Vitest, Playwright, Supabase CLI local stack, `.env.example`, package scripts (`dev`, `build`, `typecheck`, `lint`, `test`, `test:db`, `test:e2e`, `db:reset`, `db:types`), GitHub Actions running all checks against a local Supabase. `typecheck` runs `next typegen` first, because `next-env.d.ts` is gitignored.

**Done when:** `npm run dev` serves a placeholder home page; every check command passes locally and in CI; a smoke Playwright test loads the home page.

## 2. Design tokens and app shell

Matcha palette, typography, and spacing as Tailwind theme tokens with light and dark mode; mobile-first layout with bottom nav (Following, Explore, Log, Profile); PWA manifest and icons.

**Done when:** the shell renders at phone width in both themes (Playwright screenshots); a Playwright test asserts `/manifest.webmanifest` has `name`, 192px and 512px icons, `start_url`, and `display: standalone`; Chrome DevTools' Application panel shows no installability errors.

## 3. Database schema, RLS, and storage policies

First, check Google's current Places caching and attribution terms and record in the PRD which fields `shops` may store and for how long. Then: migrations for the data model in `docs/PRD.md`, seeded toppings, generated TypeScript types, RLS and column grants, and the photo bucket with its policies. pgTAP tests first.

**Done when:** pgTAP tests prove:
- `anon` and `authenticated` can read public log, profile, follow, and shop data, but can't select any timestamp column on any table;
- only the owner can insert, update, or delete their logs;
- ratings outside 1.0–10.0 or off 0.5 steps are rejected, and future `drank_on` dates are rejected;
- self-follows are rejected; usernames are unique ignoring case and must match the format;
- shop drink names are unique per shop by normalized name, and a log's shop drink must belong to its shop;
- a user can write photos only under their own storage path, the bucket rejects non-images and oversize files, and listing is denied;
- views run with `security_invoker`.

## 4. Auth and onboarding

Magic-link sign-in (works locally via Supabase's email catcher), Google sign-in wired up, username picker with availability check, profile setup.

🔑 Google OAuth client, needed only to try Google sign-in for real; tests use the magic-link path.

**Done when:** a Playwright test signs up by magic link, picks a username, and lands on Explore; taken (any case), malformed, and reserved usernames are rejected with a clear message.

## 5. Places client and shop search

A `PlacesClient` interface, a Google implementation, and a fake for tests. Search bubble tea shops, cafes, and Asian restaurants, ranking bubble tea first, with the optional "near" field prefilled from the IP region. Upsert chosen places into `shops` within the terms recorded in item 3. Show the required Google attribution.

🔑 Google Cloud project with billing + Places API key, for manual checks against the real API; tests use the fake.

**Done when:** unit tests cover ranking, the "near" bias, and the upsert; a Playwright test (fake client) searches and selects a shop location; nothing on the request path stores the IP region.

## 5b. Skeleton deploy

Deploy what exists so production setup problems show up early.

🔑 Supabase project, Vercel project linked to the repo, an email-sending account (e.g. Resend) set up as Supabase's SMTP, production env vars, OAuth redirect URLs, Places key restrictions.

**Done when:** the production URL signs up by magic link on a real phone and searches a real shop.

## 6. Log a drink

Log form: shop search, drink autocomplete from shop drinks, rating stepper in 0.5 steps, category, sugar, ice, toppings, note, date (defaults to today in local time), photo (client-side resize and re-encode, direct upload to Storage). A simple "my logs" list. Edit and delete.

**Done when:**
- a Playwright test logs a drink with a photo and every optional field, sees it in "my logs", edits it, and deletes it (the photo object is deleted too);
- logging a new drink name creates a shop drink, and logging the same name again with different case and spacing reuses it;
- a stored test photo made from an image with GPS and DateTime EXIF tags has no EXIF metadata.

## 7. Profile page

Logs list plus the stats defined in the PRD.

**Done when:** a seeded user's profile shows the correct value for every stat, including tie-breaks (asserted against seed data); neither the page HTML nor any network response contains `created_at` or an ISO timestamp.

## 8. Follows, feeds, and user search

Follow and unfollow, Following and Explore feeds (newest first by post time, paginated, served by functions that never return timestamps), `@username` search.

**Done when:** a Playwright test with two users: B follows A, A logs a drink, it appears first in B's Following feed and in Explore; after unfollowing, it leaves B's Following feed; a backdated log still appears at the top when posted; feed responses contain no timestamps.

## 9. Shop location page

All logs at the location, average rating to one decimal, top 5 drinks.

**Done when:** a seeded shop's page shows the correct average and top drinks (including the tie-break), and a second location of the same chain shows only its own logs.

## 10. Report a log

Report button on logs; a user can report a log only once.

**Done when:** a Playwright test reports a log and sees confirmation; a second report attempt is refused; pgTAP proves only the reporter can read their report.

## 10b. Likes (optional, if time allows)

Like and unlike a log; like count on logs.

**Done when:** a Playwright test with two users: B likes A's log, the count goes up, B unlikes it, and the count goes back down; pgTAP proves a user can only create or delete their own likes.

## 11. Verification skill

Run `/pstack:create-verification-skill` against the running app and commit `.claude/skills/verify/`.

**Done when:** a fresh session follows the skill to drive sign-up → log a drink → follow, saves screenshots and a run log under the evidence path the skill names, and those files are still there after the skill's cleanup step.

## 12. Launch polish

🔑 Publish the Google OAuth consent screen out of "Testing" mode.

**Done when:** a friend who isn't a Google Cloud test user can sign up with Google on the production URL, log a drink, and follow the owner from their phone.

## Later

Comments, brand pages, map view, boba runs, notifications, private accounts, moderation tools, native app.
