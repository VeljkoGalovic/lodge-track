"use client"

import { RotateCcw, AlertTriangle } from "lucide-react"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { parseLocale, type Locale } from "@/lib/i18n/locales"

function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") {
    return "en"
  }

  try {
    const cookies = document.cookie.split("; ")
    const localeCookie = cookies.find((c) => c.startsWith("lodgetrack_locale="))
    if (localeCookie) {
      const value = localeCookie.split("=")[1]
      return parseLocale(value)
    }
  } catch {
    // ignore cookie parse errors
  }

  return "en"
}

const locale = getLocaleFromCookie()
const dict = getDictionary(locale)
const t = dict.pages.error

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      {/* Aurora Background - matching not-found/signin/register */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/25 to-[#ba87ff]/20 blur-[120px] animate-aurora" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/20 to-[#36bfae]/25 blur-[100px] animate-aurora [animation-delay:3s]" />
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10 text-center">
        <div className="mb-6">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 mb-4">
            <AlertTriangle className="h-8 w-8" />
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">
          {t.title}
        </h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          {t.subtitle}
        </p>

        <button
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity"
        >
          <RotateCcw className="h-4 w-4" />
          {t.cta}
        </button>
      </div>
    </section>
  )
}