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
| `pnpm db:reset`    | Recreate the local database and apply all migrations         |
| `pnpm db:status`   | Show local Supabase URLs and keys                            |

The Supabase CLI is a dev dependency, so run any other command with
`pnpm exec supabase <command>`.

## Database migrations

Migrations live in `supabase/migrations/` and are applied in order by
`pnpm db:reset`. Create one with:

```sh
pnpm exec supabase migration new <name>
```

## Tests

- **Browser tests** (`tests/e2e/`, Playwright) drive the running app on a
  mobile and a desktop viewport. Set `E2E_BASE_URL` to test an already-running
  app, such as a Vercel preview, or `E2E_PORT` to change the dev server port.
- **Access-rule tests** (`tests/access/`, Vitest) sign in to the local Supabase
  as different users and attempt direct reads and writes, to check row-level
  security. They read the local URL and keys from `supabase status`, so no env
  file is needed.

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
