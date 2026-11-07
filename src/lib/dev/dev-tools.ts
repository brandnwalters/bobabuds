/**
 * Dev tools (the Dev Bar and its sign-in route) exist only when
 * `DEV_TOOLS=true`: locally and on Vercel preview deployments, never in
 * production. Read at request time on the server.
 */
export function devToolsEnabled() {
  return process.env.DEV_TOOLS === "true";
}
