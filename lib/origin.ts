import { headers } from "next/headers"

/**
 * The origin the current request arrived on, for building absolute links.
 *
 * Read from the request rather than a hardcoded variable so an invitation link
 * copied in development points at `localhost` and one copied in production
 * points at the deployed host, with no configuration to keep in sync.
 */
export async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers()
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  if (!host) return process.env.AUTH_URL ?? ""

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https")

  return `${protocol}://${host}`
}

/**
 * An absolute URL for a redirect target, resolved against the request being
 * handled. `NextResponse.redirect` rejects relative URLs, and a route handler is
 * already holding the request, so this needs no `headers()` round trip and no
 * configured base URL to fall out of sync.
 */
export function absoluteUrl(path: string, request: Request): string {
  return new URL(path, new URL(request.url).origin).toString()
}
