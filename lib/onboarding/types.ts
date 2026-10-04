import type { Locale } from "@/lib/i18n/locales"
import type { ThemePreference } from "@/lib/theme"

/**
 * Onboarding step types - now 5 steps with plan selection
 */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5

/**
 * Selected subscription tier during onboarding
 */
export type SubscriptionTier = "STARTER" | "PRO" | "BUSINESS"

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
  // Step 4: Plan selection
  selectedTier: SubscriptionTier
  // Step 5: Account details
  name: string
  email: string
  password: string
  confirmPassword: string
  termsAccepted: boolean
  isOver18: boolean
}

/**
 * Default initial onboarding data
 */
export const initialOnboardingData: OnboardingData = {
  locale: "en",
  theme: "SYSTEM",
  currency: "USD",
  selectedTier: "STARTER",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  isOver18: false,
}

/**
 * Step labels for progress indicator
 */
export const STEP_LABELS = {
  1: "language",
  2: "theme",
  3: "currency",
  4: "plan",
  5: "account",
} as const