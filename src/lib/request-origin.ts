import type { NextRequest } from "next/server";

/**
 * The origin the browser actually used. `request.nextUrl` reports the dev
 * server's own hostname (localhost) even for requests to 127.0.0.1, and
 * redirecting across hosts would drop the session cookies.
 */
export function requestOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
