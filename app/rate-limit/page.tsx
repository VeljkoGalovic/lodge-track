import { Metadata } from "next"
import Link from "next/link"
import { Timer } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { RateLimitCountdown } from "./RateLimitCountdown"

interface RateLimitPageProps {
  /** `retry` is the number of seconds the caller computed as safe to wait. */
  searchParams: Promise<{ retry?: string; action?: string }>
}

export const metadata: Metadata = {
  title: "Too many attempts | LodgeTrack",
  robots: { index: false, follow: false },
}

const ACTION_LIMITS: Record<string, { maxAttempts: string; window: string; windowSr: string }> = {
  register: { maxAttempts: "5", window: "per hour", windowSr: "na sat" },
  login: { maxAttempts: "10", window: "per 15 minutes", windowSr: "na 15 minuta" },
  email_verification: { maxAttempts: "3", window: "per hour", windowSr: "na sat" },
  password_reset: { maxAttempts: "3", window: "per hour", windowSr: "na sat" },
}

export default async function RateLimitPage({ searchParams }: RateLimitPageProps) {
  const locale = await currentLocale()
  const t = getDictionary(locale)
  const params = await searchParams
  const action = params.action ?? "default"
  const retrySeconds = Math.max(0, Math.min(86400, Number.parseInt(params.retry ?? "600", 10) || 600))

  const actionLabel =
    action === "register"
      ? t.auth.rateLimitActionRegister
      : action === "email_verification"
        ? t.auth.rateLimitActionVerification
        : action === "password_reset"
          ? t.auth.rateLimitActionReset
          : action === "login"
            ? t.auth.rateLimitActionLogin
            : t.auth.rateLimitActionDefault

  const limits = ACTION_LIMITS[action] ?? null

  return (
    <LocaleProvider locale={locale}>
      <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
        {/* Aurora background, same visual language as the other auth screens */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/25 to-[#ba87ff]/20 blur-[120px] animate-aurora" />
          <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/20 to-[#36bfae]/25 blur-[100px] animate-aurora [animation-delay:3s]" />
        </div>

        <div className="glass-card w-full max-w-md p-8 relative z-10 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#f97316] flex items-center justify-center">
            <Timer className="w-8 h-8 text-[#07090E]" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">{t.auth.rateLimitedTitle}</h1>
          <p className="text-sm text-slate-300 mb-6">{t.auth.rateLimitedBody}</p>

          <p className="text-sm text-slate-400 mb-6">
            {t.auth.rateLimitAppliesTo}{" "}
            <span className="font-medium text-white">{actionLabel}</span>
            {limits && (
              <span className="block mt-1 text-xs text-slate-500">
                {locale === "sr"
                  ? `${limits.maxAttempts} pokušaja ${limits.windowSr}`
                  : `${limits.maxAttempts} ${limits.window}`}
              </span>
            )}
          </p>

          <div className="mb-6 p-6 rounded-xl bg-white/5 border border-white/10">
            <RateLimitCountdown initialSeconds={retrySeconds} />
          </div>

          <div className="space-y-2">
            <Link
              href="/signin"
              className="block w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity"
            >
              {t.auth.backToSignIn}
            </Link>
            <Link
              href="/register"
              className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
            >
              {t.auth.backToRegister}
            </Link>
          </div>
        </div>
      </section>
    </LocaleProvider>
  )
}
