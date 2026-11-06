/**
 * Where to go after signing in. Only same-site paths are allowed, so a crafted
 * link can't bounce the user to another site.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
