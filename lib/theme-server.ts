import { cookies } from "next/headers"
import { DEFAULT_THEME, parseThemePreference, THEME_COOKIE, type ThemePreference } from "./theme"

export { THEME_COOKIE }

/**
 * The member's theme choice for this request.
 *
 * Read only where the choice is *displayed* — the toggle needs to know which of
 * its three options is selected. The theme the page actually paints is set by
 * the blocking script in the document head, which reads the same cookie without
 * a round trip and without making every route dynamic.
 */
export async function currentThemePreference(
  userTheme?: string | null
): Promise<ThemePreference> {
  const store = await cookies()
  const raw = store.get(THEME_COOKIE)?.value ?? userTheme ?? DEFAULT_THEME
  return parseThemePreference(raw)
}
