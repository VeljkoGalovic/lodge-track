"use client"

import Link from "next/link"
import { Home, RotateCcw } from "lucide-react"
import { useDictionary } from "@/components/i18n/LocaleProvider"

export function NotFoundContent() {
  const t = useDictionary()

  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      {/* Aurora Background - matching signin/register */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/25 to-[#ba87ff]/20 blur-[120px] animate-aurora" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/20 to-[#36bfae]/25 blur-[100px] animate-aurora [animation-delay:3s]" />
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10 text-center">
        <div className="mb-6">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#36bfae]/10 text-[#36bfae] mb-4">
            <RotateCcw className="h-8 w-8" />
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">
          {t.pages.notFound.title}
        </h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          {t.pages.notFound.subtitle}
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            {t.pages.notFound.cta}
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex w-full items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            {t.pages.notFound.back}
          </button>
        </div>
      </div>
    </section>
  )
}