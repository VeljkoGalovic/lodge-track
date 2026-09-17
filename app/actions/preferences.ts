"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { type ActionState, currentMembership } from "@/lib/authorization"
import { isLocale } from "@/lib/i18n/locales"
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS } from "@/lib/i18n/server"
import { isThemePreference, THEME_COOKIE, THEME_COOKIE_OPTIONS } from "@/lib/theme"

/**
 * Interface preferences — language and theme.
 *
 * Both follow the same shape: validate the value against the closed set, write
 * it to the member's own row *and* to a cookie, then re-render the dashboard.
 *
 * The cookie is written alongside the row rather than derived from it because
 * the two answer different questions. The row is the durable record — what a
 * member signing in on a new device should get. The cookie is what the current
 * request already has in hand: it lets the theme be applied by a blocking script
 * before paint, and lets the locale be resolved on pages that never load a
 * membership. Deriving the cookie from the row on every render would need a
 * database read in the document head, which is exactly what the cookie avoids.
 *
 * Both writes are scoped by `{ id, orgId }` together, not by id alone. The id
 * comes from the session so it is already trustworthy, but keeping the tenant in
 * the `where` means a bug that ever put the wrong id in there still cannot reach
 * across organizations — the same belt-and-braces the expense and booking
 * actions use.
 */

const MAX_LOCALE_LENGTH = 8

function revalidatePreferences() {
  // Both settings are rendered by the dashboard shell, which every dashboard
  // route inherits, so the whole segment is what goes stale.
  revalidatePath("/dashboard", "layout")
}

export async function setLocalePreference(locale: string): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  // Bounded before it is compared: a request can send anything, and this is a
  // cheap way to keep megabytes out of the enum check.
  if (locale.length > MAX_LOCALE_LENGTH || !isLocale(locale)) {
    return { error: "That language is not available." }
  }

  const { count } = await prisma.user.updateMany({
    where: { id: membership.user.id, orgId: membership.organization.id },
    data: { locale },
  })
  if (count === 0) return { error: "Your account could not be found." }

  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS)

  revalidatePreferences()
  return { success: "Language updated." }
}

export async function setThemePreference(theme: string): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  if (!isThemePreference(theme)) return { error: "That theme is not available." }

  const { count } = await prisma.user.updateMany({
    where: { id: membership.user.id, orgId: membership.organization.id },
    data: { theme },
  })
  if (count === 0) return { error: "Your account could not be found." }

  const store = await cookies()
  store.set(THEME_COOKIE, theme, THEME_COOKIE_OPTIONS)

  revalidatePreferences()
  return { success: "Theme updated." }
}
