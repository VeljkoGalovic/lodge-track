"use client"

import { useState, useEffect, useCallback } from "react"

export type CookieCategory = "necessary" | "analytics" | "marketing"

export interface CookieConsent {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  timestamp: number
  version: number
}

const CONSENT_KEY = "cookie-consent"
const CONSENT_VERSION = 1

const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  timestamp: Date.now(),
  version: CONSENT_VERSION,
}

/**
 * Checks if cookie consent has been given (client-side only)
 */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false
  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) return false
    const consent = JSON.parse(stored) as CookieConsent
    return consent.version === CONSENT_VERSION
  } catch {
    return false
  }
}

/**
 * Gets the current consent preferences (client-side only)
 */
export function getConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) return null
    const consent = JSON.parse(stored) as CookieConsent
    if (consent.version !== CONSENT_VERSION) return null
    return consent
  } catch {
    return null
  }
}

/**
 * Checks if a specific category is consented to
 */
export function hasCategoryConsent(category: CookieCategory): boolean {
  const consent = getConsent()
  if (!consent) return category === "necessary"
  return consent[category]
}

/**
 * Saves consent preferences to localStorage
 */
export function saveConsent(consent: Omit<CookieConsent, "timestamp" | "version">): void {
  if (typeof window === "undefined") return
  const fullConsent: CookieConsent = {
    ...consent,
    necessary: true, // Always true
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(fullConsent))

  // Dispatch event for other components to react
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: fullConsent }))
}

/**
 * React hook for accessing and managing cookie consent
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Only run on client
    const stored = getConsent()
    setConsent(stored)
    setIsLoaded(true)

    // Listen for changes from other tabs/components
    const handleChange = (event: CustomEvent<CookieConsent>) => {
      setConsent(event.detail)
    }

    window.addEventListener("cookie-consent-changed", handleChange as EventListener)
    return () => {
      window.removeEventListener("cookie-consent-changed", handleChange as EventListener)
    }
  }, [])

  const acceptAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: true, marketing: true })
  }, [])

  const rejectNonEssential = useCallback(() => {
    saveConsent({ necessary: true, analytics: false, marketing: false })
  }, [])

  const updateCategory = useCallback((category: CookieCategory, enabled: boolean) => {
    if (category === "necessary") return // Cannot disable necessary
    const current = consent ?? DEFAULT_CONSENT
    saveConsent({ ...current, [category]: enabled })
  }, [consent])

  const resetConsent = useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(CONSENT_KEY)
    setConsent(null)
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: null }))
  }, [])

  return {
    consent,
    isLoaded,
    hasConsent: !!consent,
    acceptAll,
    rejectNonEssential,
    updateCategory,
    resetConsent,
    hasCategory: (category: CookieCategory) => hasCategoryConsent(category),
  }
}