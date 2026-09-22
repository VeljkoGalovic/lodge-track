"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { X, Cookie, Settings, Check, ChevronDown, ChevronUp } from "lucide-react"
import { useCookieConsent, type CookieCategory } from "@/lib/cookie-consent"
import { getDictionary } from "@/lib/i18n/dictionaries"

interface CookieConsentBannerProps {
  locale?: string
}

const CATEGORY_LABELS: Record<CookieCategory, { en: string; sr: string }> = {
  necessary: {
    en: "Strictly Necessary",
    sr: "Strogo neophodni",
  },
  analytics: {
    en: "Analytics",
    sr: "Analitika",
  },
  marketing: {
    en: "Marketing",
    sr: "Marketing",
  },
}

const CATEGORY_DESCRIPTIONS: Record<CookieCategory, { en: string; sr: string }> = {
  necessary: {
    en: "Required for the website to function properly. Cannot be disabled.",
    sr: "Neophodni za rad sajta. Ne mogu da se onemoguće.",
  },
  analytics: {
    en: "Help us understand how visitors interact with our website anonymously.",
    sr: "Pomažu nam da razumemo kako posetioci interaguju sa sajtom anonimno.",
  },
  marketing: {
    en: "Used to track visitors across websites for relevant advertising.",
    sr: "Korišćeni za praćenje posetilaca preko sajtova za relevantno oglašavanje.",
  },
}

function CategoryToggle({
  category,
  enabled,
  onChange,
  locale = "en",
}: {
  category: CookieCategory
  enabled: boolean
  onChange: (enabled: boolean) => void
  locale: string
}) {
  const isSr = locale === "sr"
  const label = CATEGORY_LABELS[category][isSr ? "sr" : "en"]
  const description = CATEGORY_DESCRIPTIONS[category][isSr ? "sr" : "en"]
  const isNecessary = category === "necessary"

  return (
    <div className="glass-card p-4 rounded-xl border border-white/10 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">{label}</span>
          {isNecessary && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
              {isSr ? "Obavezno" : "Required"}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => !isNecessary && onChange(!enabled)}
        disabled={isNecessary}
        role="switch"
        aria-checked={enabled}
        aria-label={`${label}: ${enabled ? (isSr ? "uključeno" : "enabled") : (isSr ? "isključeno" : "disabled")}`}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-white/20 transition-all duration-200 ${
          enabled ? "bg-primary border-primary" : "bg-white/5"
        } ${isNecessary ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}

export async function CookieConsentBannerServer({ locale = "en" }: CookieConsentBannerProps) {
  const dict = getDictionary(locale as any)
  const isSr = locale === "sr"

  // We'll use the client-side component for the interactive part
  return <CookieConsentBannerClient locale={locale} />
}

export function CookieConsentBannerClient({ locale = "en" }: { locale: string }) {
  const {
    consent,
    isLoaded,
    hasConsent,
    acceptAll,
    rejectNonEssential,
    updateCategory,
  } = useCookieConsent()
  const [showPreferences, setShowPreferences] = useState(false)
  const isSr = locale === "sr"

  const dict = getDictionary(locale as any)

  if (!isLoaded || hasConsent) {
    return null
  }

  const handleAcceptAll = () => {
    acceptAll()
    setShowPreferences(false)
  }

  const handleRejectNonEssential = () => {
    rejectNonEssential()
    setShowPreferences(false)
  }

  if (showPreferences) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
        role="dialog"
        aria-label={isSr ? "Podešavanja kolačića" : "Cookie preferences"}
        aria-modal="true"
      >
        <div className="bg-background border-t border-border shadow-2xl max-w-4xl mx-auto">
          {/* Backdrop for mobile */}
          <div className="lg:hidden fixed inset-0 bg-black/50 z-[-1]" onClick={() => setShowPreferences(false)} />

          <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground mb-2">
                  <Cookie className="w-5 h-5 text-primary" />
                  <span>{isSr ? "Podešavanja kolačića" : "Cookie Preferences"}</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isSr
                    ? "Upravljajte svojim preferencama kolačića ispod. Neophodni kolačići ne mogu da se isključe jer su potrebni za rad sajta."
                    : "Manage your cookie preferences below. Strictly necessary cookies cannot be disabled as they are required for the website to function."}
                </p>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                aria-label={isSr ? "Zatvori" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-3 mb-6" role="group" aria-label={isSr ? "Kategorije kolačića" : "Cookie categories"}>
              {(["necessary", "analytics", "marketing"] as CookieCategory[]).map((category) => (
                <CategoryToggle
                  key={category}
                  category={category}
                  enabled={consent?.[category] ?? (category === "necessary")}
                  onChange={(enabled) => updateCategory(category, enabled)}
                  locale={locale}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                {isSr ? "Prihvati sve" : "Accept All"}
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="flex-1 px-6 py-3 glass-card text-foreground rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors"
              >
                {isSr ? "Odbij neophodne" : "Reject Non-Essential"}
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="flex-1 px-6 py-3 glass-card text-foreground rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors"
              >
                {isSr ? "Zatvori" : "Close"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      role="dialog"
      aria-label={isSr ? "Prisutnost kolačića" : "Cookie consent"}
      aria-modal="true"
    >
      <div className="bg-background border-t border-border shadow-2xl max-w-4xl mx-auto">
        {/* Backdrop for mobile */}
        <div className="lg:hidden fixed inset-0 bg-black/50 z-[-1]" onClick={() => setShowPreferences(true)} />

        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Cookie icon and text */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">
                  {isSr ? "Vrednjujemo vašu privatnost" : "We Value Your Privacy"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  {isSr
                    ? "Korišćimo kolačiće za poboljšanje vašeg iskustva. Kliknite \"Prilagodi\" da biste upravljali preferencama."
                    : "We use cookies to enhance your experience. Click \"Customize\" to manage your preferences."}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                {isSr ? "Prihvati sve" : "Accept All"}
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="px-5 py-2.5 glass-card text-foreground rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                {isSr ? "Odbij neophodne" : "Reject Non-Essential"}
              </button>
              <button
                onClick={() => setShowPreferences(true)}
                className="px-5 py-2.5 glass-card text-foreground rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                <span className="flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  {isSr ? "Prilagodi" : "Customize"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}