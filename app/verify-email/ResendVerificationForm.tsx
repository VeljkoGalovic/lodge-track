"use client"

import { useEffect, useState } from "react"
import { Mail, Send } from "lucide-react"
import { useDictionary } from "@/components/i18n/LocaleProvider"
import { sendVerificationEmailAction } from "@/app/actions/auth"

/**
 * Email form for the no-token case on /verify-email: a user who lost the
 * verification email can request a fresh link here without signing in.
 * Mirrors the rate-limit handling of the sign-in panel (inline error +
 * countdown) since both call sendVerificationEmailAction.
 */
export function ResendVerificationForm() {
  const t = useDictionary()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [retrySeconds, setRetrySeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setRetrySeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const locked = retrySeconds > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || locked) return
    setError("")
    setSending(true)
    try {
      const result = await sendVerificationEmailAction(email)
      if (result.success) {
        setDone(true)
      } else {
        setError(result.error || t.auth.verificationResendFailed)
        if (result.retryAfterSeconds) setRetrySeconds(result.retryAfterSeconds)
      }
    } catch {
      setError(t.auth.unexpected)
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="p-4 rounded-xl bg-[#36bfae]/10 border border-[#36bfae]/20 text-[#36bfae] text-sm flex items-start gap-2 text-left">
        <Mail className="h-4 w-4 mt-0.5 shrink-0" />
        <p>{t.auth.resendVerificationInfo}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 text-left">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      <label htmlFor="resend-email" className="block text-sm text-slate-300 mb-1">
        {t.auth.emailLabel}
      </label>
      <input
        id="resend-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="you@example.com"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#36bfae]"
      />
      <button
        type="submit"
        disabled={sending || locked || !email}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="h-4 w-4" />
        {locked
          ? `${t.auth.tryAgainPrefix} ${fmt(retrySeconds)}`
          : sending
            ? t.auth.sendingVerification
            : t.auth.resendVerification}
      </button>
    </form>
  )
}

function fmt(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return minutes > 99
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}
