# BobaBuds

Cozy, matcha-themed social app for logging boba and Asian-restaurant drinks. Read `docs/PRD.md` for what we're building and why, `docs/ROADMAP.md` for what's next, and `GLOSSARY.md` for the terms to use. Don't reopen decisions recorded in the PRD; ask the owner if one looks wrong.

## Stack

Next.js (App Router) + TypeScript strict, Tailwind, Supabase (Postgres, Auth, Storage, RLS), Google Places behind a `PlacesClient` interface, Vercel.

Commands are added by the scaffold (roadmap item 1). Update this section when they exist.

## Hard rules

- **No price data** anywhere: no columns, fields, or UI.
- **Never expose time of day** publicly. Timestamp columns are hidden with column grants; feeds sort server-side in Postgres functions; views use `security_invoker = true`; ids are UUIDv4. Show `drank_on` only.
- **Strip photo metadata.** Photos are re-encoded on the client before upload, which removes EXIF (GPS and capture time).
- **Never collect user GPS.** Location comes only from the chosen shop.
- **RLS is the security boundary.** Every table has RLS enabled with policies tested in pgTAP. UI checks are convenience only.
- **Tests never call Google.** Use the fake `PlacesClient`.
- **Never commit secrets.** Only `.env.example` is tracked.
- **Don't create cloud accounts or keys.** Steps marked 🔑 in the roadmap belong to the owner; stop and tell them it's time.

## How work happens

1. One roadmap item per branch, in a worktree. Never work on `main`. `docs/ROADMAP.md` is the task list; don't file GitHub issues.
2. Test first with `/pstack:tdd`: pgTAP for schema and RLS, Vitest for server code and helpers, Playwright for each feature's user path. Tests assert what a user or caller can observe.
3. Commit locally as you go.
4. When the item's "done when" checks pass, have a separate review agent check the branch diff (`/pstack:thermos` for code, `/pstack:interrogate` for design-heavy changes). Fix what it finds and re-review until clean.
5. Report to the owner: branch, what changed, test results, review summary. **Wait for explicit approval.**
6. After approval, push the feature branch and open a PR. The owner merges. Never push to `main`, never force-push, never merge.

Approval covers one change only; the next change needs its own.

## Code style

- Strict TypeScript; no `any`. Use the generated Supabase types.
- Parse external data (Places responses, form input) at the boundary with zod; trust types inside.
- Keep business logic in plain functions that are easy to unit test; keep route handlers and components thin.
- Prefer deleting code to adding layers.
