"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { X, Cookie, Settings, Check, ChevronDown, ChevronUp } from "lucide-react"
import { useCookieConsent, type CookieCategory } from "@/lib/cookie-consent"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { parseLocale } from "@/lib/i18n/locales"

interface CookieConsentBannerProps {
  locale?: string
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
  const t = getDictionary(parseLocale(locale)).cookieConsent
  const label = t.categories[category]
  const description = t.descriptions[category]
  const isNecessary = category === "necessary"

  return (
    <div className="glass-card p-4 rounded-xl border border-white/10 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">{label}</span>
          {isNecessary && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
              {t.required}
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
        aria-label={`${label}: ${enabled ? t.on : t.off}`}
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
  // The interactive banner is all client-side; the server variant exists for
  // the provider boundary.
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
  const t = getDictionary(parseLocale(locale)).cookieConsent

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
        aria-label={t.settingsDialogAria}
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
                  <span>{t.settingsTitle}</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">{t.settingsIntro}</p>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                aria-label={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-3 mb-6" role="group" aria-label={t.categoriesGroupAria}>
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
                {t.acceptAll}
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="flex-1 px-6 py-3 glass-card text-foreground rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors"
              >
                {t.rejectNonEssential}
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="flex-1 px-6 py-3 glass-card text-foreground rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors"
              >
                {t.close}
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
      aria-label={t.dialogAria}
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
                  {t.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  {t.intro}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                {t.acceptAll}
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="px-5 py-2.5 glass-card text-foreground rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                {t.rejectNonEssential}
              </button>
              <button
                onClick={() => setShowPreferences(true)}
                className="px-5 py-2.5 glass-card text-foreground rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                <span className="flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  {t.customize}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
