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
 * An absolute URL for a redirect target, resolved against the *current request's
 * real origin* (see `requestOrigin`).
 *
 * `NextResponse.redirect` rejects relative URLs. The naive fix — `new
 * URL(request.url).origin` — is a trap behind a reverse proxy: Next fabricates
 * `req.url` from the server's own binding rather than the incoming Host header,
 * so behind the tunnel it is `http://localhost:3001` no matter what the visitor
 * actually typed (which is exactly how auth.js sign-out ended up at
 * localhost:3001/signin). Reading the headers is what every other origin
 * builder in this app does, so this matches `requestOrigin`… which needs an
 * await, hence the change of shape.
 */
export async function absoluteUrl(path: string): Promise<string> {
  // Last-ditch fallback keeps the URL absolute (NextResponse.redirect needs
  // one); it is only reachable when no host and no AUTH_URL could be found,
  // i.e. never in a working deployment.
  const base = (await requestOrigin()) || "http://localhost:3001"
  return new URL(path, base).toString()
}
