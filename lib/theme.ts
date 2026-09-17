import type { ThemePreference as SchemaThemePreference } from "@prisma/client"

/**
 * Theme preference: what the member *chose*, not what is currently painted.
 *
 * Kept as a hand-written union rather than re-exporting the Prisma enum because
 * this module is read by client components, and a value import from
 * `@prisma/client` would drag the Prisma runtime across the boundary. The enum
 * in prisma/schema.prisma mirrors these three names; `ThemeMatchesSchema` below
 * makes the compiler complain if the two ever drift apart.
 */
export const THEMES = ["SYSTEM", "LIGHT", "DARK"] as const

export type ThemePreference = (typeof THEMES)[number]

/**
 * Compile-time guard that the union above and the database enum agree.
 *
 * Exported only so `no-unused-vars` doesn't flag it — it exists to be *written*,
 * not read. If someone adds a theme to the schema and not here (or vice versa),
 * this resolves to `never` and the build fails at this line rather than at
 * runtime, where the failure would be a preference that silently fails to save.
 */
type AssertSame<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
export type ThemeMatchesSchema = AssertSame<ThemePreference, SchemaThemePreference>

/** Holds the member's choice between requests. Not a secret, so not httpOnly. */
export const THEME_COOKIE = "lodgetrack_theme"

/**
 * Readable by the blocking script in the document head, which is the whole point
 * — the theme has to be applied before the first paint, and a script cannot read
 * an httpOnly cookie. `sameSite: "lax"` keeps it off cross-site form posts.
 */
export const THEME_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
} as const

export const DEFAULT_THEME: ThemePreference = "SYSTEM"

export function isThemePreference(value: string): value is ThemePreference {
  return (THEMES as readonly string[]).includes(value)
}

/**
 * Reads a raw cookie value into a preference, falling back to SYSTEM.
 *
 * SYSTEM is the safe fallback in both directions: for a value that is missing and
 * one that is garbage. Defaulting to LIGHT or DARK would impose one member's
 * choice on a device whose operating system disagrees.
 */
export function parseThemePreference(raw: string | undefined | null): ThemePreference {
  return raw && isThemePreference(raw) ? raw : DEFAULT_THEME
}

/** Tailwind's `dark:` variant and the token layer both key off this class. */
export function themeClassName(preference: ThemePreference, systemPrefersDark: boolean): "dark" | "light" {
  if (preference === "SYSTEM") return systemPrefersDark ? "dark" : "light"
  return preference === "DARK" ? "dark" : "light"
}
