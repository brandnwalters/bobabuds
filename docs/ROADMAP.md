# Roadmap

Work top to bottom. Each item is one branch and one PR. "Done when" lists the observable result a reviewer checks; every item also needs passing CI and a clean agent review (see `CLAUDE.md`).

🔑 marks a step where the owner creates an account or key. Agents stop and ask before that step.

## 0. Planning docs

PRD, roadmap, `CLAUDE.md`, glossary, `.gitignore`.

**Done when:** the owner approves the docs and the PR merges.

## 1. Scaffold

Next.js (App Router, TypeScript strict) + Tailwind + ESLint, Vitest, Playwright, Supabase CLI local stack, `.env.example`, package scripts (`dev`, `build`, `typecheck`, `lint`, `test`, `test:db`, `test:e2e`, `db:reset`, `db:types`), GitHub Actions running all checks with a local Supabase.

**Done when:** `npm run dev` serves a placeholder home page; every check command passes locally and in CI; a smoke Playwright test loads the home page.

## 2. Design tokens and app shell

Matcha palette, typography, and spacing as Tailwind theme tokens with light and dark mode; mobile-first layout with bottom nav (Following, Explore, Log, Profile); PWA manifest and icons.

**Done when:** the shell renders on a phone-width viewport in both themes, and the app is installable (manifest passes Lighthouse PWA checks).

## 3. Database schema and RLS

Migrations for the data model in `docs/PRD.md`, seeded toppings, generated TypeScript types, RLS policies. pgTAP tests first.

**Done when:** pgTAP tests prove: anyone can read public log data but never `created_at`; only the owner can insert, update, or delete their logs; ratings outside 1.0–10.0 or off 0.5 steps are rejected; self-follows are rejected; shop drink names are unique per shop by normalized name.

## 4. Auth and onboarding

Magic-link sign-in (works locally via Supabase's email catcher), Google sign-in wired but tested only with a real OAuth client, username picker with availability check, profile setup.

🔑 Google OAuth client — only needed to exercise Google sign-in for real; the magic-link path is enough for tests.

**Done when:** a Playwright test signs up by magic link, picks a username, and lands on the app; taken or invalid usernames are rejected.

## 5. Places client and shop search

A `PlacesClient` interface, a Google implementation, and a fake for tests. Search bubble tea shops, cafes, and Asian restaurants, ranking bubble tea first. Upsert chosen places into `shops` within Google's caching terms (check them here and record the outcome in the PRD).

🔑 Google Cloud project with billing + Places API key — for manual checks against the real API; tests use the fake.

**Done when:** unit tests cover ranking and the upsert; a Playwright test (fake client) searches and selects a shop location.

## 6. Log a drink

Log form: shop search, drink autocomplete from shop drinks, rating stepper in 0.5 steps, category, sugar, ice, toppings, note, date, photo upload (resized, one per log). Edit and delete.

**Done when:** a Playwright test logs a drink with a photo and every optional field, sees it on their profile, edits it, and deletes it; logging a new drink name creates a shop drink, and logging the same name again reuses it.

## 7. Profile page

Logs list plus stats: total drinks, average rating, top shop, top drink, category breakdown, favorite toppings.

**Done when:** a seeded user's profile shows the correct stats (asserted against seed data), and no time of day appears anywhere on the page.

## 8. Follows, feeds, and user search

Follow and unfollow, Following and Explore feeds (newest first, paginated), `@username` search, new users land on Explore.

**Done when:** a Playwright test with two users: B follows A, A logs a drink, it appears in B's Following feed and in Explore; after unfollow it leaves B's Following feed.

## 9. Shop location page

All logs at the location, average rating to one decimal, top drinks.

**Done when:** a seeded shop's page shows the correct average and top drinks, and a second location of the same chain shows only its own logs.

## 10. Report a log

Report button on logs, `reports` row created, reporter can't report the same log twice.

**Done when:** a Playwright test reports a log and the report row exists with RLS preventing other users from reading it.

## 11. Verification skill

Run `/pstack:create-verification-skill` against the running app and commit `.claude/skills/verify/`.

**Done when:** the generated skill has been run end to end once and its evidence survives cleanup.

## 12. First deploy

🔑 Supabase project, Vercel project linked to the repo, production env vars, Google OAuth redirect URLs, Places key restrictions.

**Done when:** the production URL completes sign-up, log a drink, and follow on a real phone.

## Later

Likes, comments, brand pages, map view, boba runs, notifications, private accounts, moderation tools, native app.
