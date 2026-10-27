import { cookies, headers } from "next/headers"
import { DEFAULT_LOCALE, parseLocale, type Locale } from "./locales"

/**
 * Holds the member's chosen language between requests.
 *
 * Not httpOnly: no secret is involved, and the value has to be readable from the
 * document if a client component ever needs it. `sameSite: "lax"` so it still
 * rides along on a normal top-level navigation but not on a cross-site form post.
 */
export const LOCALE_COOKIE = "lodgetrack_locale"

export const LOCALE_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
} as const

/**
 * The locale for this request.
 *
 * Cookie first, then the member's stored preference, then the default. The
 * cookie leads because it is what the browser sent, and it is the only source
 * available on a page that has not loaded a membership (sign-in, the invite
 * landing page); the database is the durable record that a member signing in on
 * a new device falls back to.
 *
 * `userLocale` is passed in rather than looked up here so this stays a pure
 * read — the dashboard layout has already loaded the user row, and a second
 * query for one short string would be waste on every dashboard render.
 *
 * Note that this cannot *write* the cookie: a server component has no response
 * to attach one to. The preference is persisted by the action in
 * app/actions/preferences.ts, which is the only thing that may change it.
 */
export async function currentLocale(userLocale?: string | null): Promise<Locale> {
  const store = await cookies()
  return parseLocale(store.get(LOCALE_COOKIE)?.value ?? userLocale ?? DEFAULT_LOCALE)
}

/**
 * The locale for an anonymous marketing page.
 *
 * Unlike `currentLocale`, there is no member to fall back on, so the resolver
 * is: an explicit choice wins (the navbar's language toggle writes
 * `LOCALE_COOKIE`), then the visitor's country as stamped by the Cloudflare
 * tunnel — Serbia's ISO 3166-1 alpha-2 code is "RS"; "SR" would be Suriname —
 * and finally the default for everyone else. Reading headers/cookies makes the
 * page render per request, which is intended: the language is per-visitor.
 */
export async function visitorLocale(): Promise<Locale> {
  const store = await cookies()
  const chosen = store.get(LOCALE_COOKIE)?.value
  if (chosen) return parseLocale(chosen)

  const headersList = await headers()
  if (headersList.get("cf-ipcountry") === "RS") return "sr"

  return DEFAULT_LOCALE
}
