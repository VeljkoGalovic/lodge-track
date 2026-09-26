import type { Locale } from "@/lib/i18n/locales"
import type { ThemePreference } from "@/lib/theme"

/**
 * Onboarding step types
 */
export type OnboardingStep = 1 | 2 | 3 | 4

/**
 * Complete onboarding data collected across all steps
 */
export interface OnboardingData {
  // Step 1: Language
  locale: Locale
  // Step 2: Theme
  theme: ThemePreference
  // Step 3: Currency
  currency: string
  // Step 4: Account details
  name: string
  email: string
  password: string
  confirmPassword: string
  termsAccepted: boolean
}

/**
 * Default initial onboarding data
 */
export const initialOnboardingData: OnboardingData = {
  locale: "en",
  theme: "SYSTEM",
  currency: "USD",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
}

/**
 * Step labels for progress indicator
 */
export const STEP_LABELS = {
  1: "language",
  2: "theme",
  3: "currency",
  4: "account",
} as const