"use client"

import { CookieConsentBannerClient as CookieConsentBanner } from "@/components/cookie-consent/CookieConsentBanner"

export function CookieConsentProvider() {
  // Get locale from the HTML lang attribute set by BootScript
  const locale = typeof document !== "undefined" ? document.documentElement.lang : "en"

  return <CookieConsentBanner locale={locale} />
}