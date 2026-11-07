import type { BrowserContext } from "@playwright/test";

/**
 * Gets a browser context through Vercel Deployment Protection on a preview
 * (`E2E_BASE_URL`) using the local Vercel login's short-lived OIDC token
 * (`vercel env run -- pnpm test:e2e ...` provides VERCEL_OIDC_TOKEN). The
 * header is only added to requests to the preview itself, never to Supabase
 * or Google. No-op locally.
 */
export async function trustVercelPreview(context: BrowserContext) {
  const token = process.env.VERCEL_OIDC_TOKEN;
  const baseURL = process.env.E2E_BASE_URL;
  if (!token || !baseURL) return;

  await context.route(`${new URL(baseURL).origin}/**`, (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        "x-vercel-trusted-oidc-idp-token": token,
      },
    }),
  );
}
