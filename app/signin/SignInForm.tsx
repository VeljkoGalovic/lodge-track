"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, ArrowLeft, Mail, AlertCircle } from "lucide-react"
import { useDictionary } from "@/components/i18n/LocaleProvider"
import { sendVerificationEmailAction } from "@/app/actions/auth"


export function SignInForm() {
  const t = useDictionary()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  /** Set once the password is accepted and a code is outstanding. */
  const [needsCode, setNeedsCode] = useState(false)
  /** Email not verified - show resend option */
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  /** Resending verification email */
  const [resending, setResending] = useState(false)
  /** Resend success message */
  const [resendSuccess, setResendSuccess] = useState("")
  /** Live countdown while the verification resend is rate-limited (seconds). */
  const [resendRetrySeconds, setResendRetrySeconds] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        // Left off entirely on the first attempt; the server only asks for it
        // when the account has a factor enrolled.
        ...(needsCode ? { code } : {}),
        redirect: false,
      })

      if (!result?.error) {
        setShouldRedirect(true)
        return
      }

      // The credentials provider reports the specific refusal through `code`,
      // which is how the second step is told apart from a wrong password.
      switch (result.code) {
        case "second_factor_required":
          setNeedsCode(true)
          setCode("")
          setError("")
          break
        case "second_factor_invalid":
          setNeedsCode(true)
          setError(t.auth.codeInvalid)
          break
        case "second_factor_unavailable":
          setNeedsCode(false)
          setError(t.auth.twoFactorUnavailable)
          break
        case "email_not_verified":
          setNeedsCode(false)
          setEmailNotVerified(true)
          setError("")
          break
        default:
          // The limiter encodes its seconds to wait in the code — send the
          // visitor to the real page (with the countdown) instead of showing
          // an unexplained "invalid credentials" for a deliberate lockout.
          if (result.code!.startsWith("rate_limited:")) {
            const retrySeconds = Number.parseInt(result.code!.slice("rate_limited:".length), 10)
            window.location.assign(`/rate-limit?action=${needsCode ? "two_factor" : "login"}&retry=${Number.isFinite(retrySeconds) ? retrySeconds : 900}`)
            break
          }
          setNeedsCode(false)
          setEmailNotVerified(false)
          setError(t.auth.invalidCredentials)
      }
    } catch {
      setError(t.auth.unexpected)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) return
    if (resendRetrySeconds > 0) return
    setResending(true)
    setResendSuccess("")
    try {
      const result = await sendVerificationEmailAction(email)
      if (result.success) {
        setResendSuccess(t.auth.verificationEmailSent || "Verification email sent! Please check your inbox.")
      } else {
        setError(result.error || "Failed to send verification email")
        if (result.retryAfterSeconds) {
          setResendRetrySeconds(result.retryAfterSeconds)
        }
      }
    } catch {
      setError(t.auth.unexpected)
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/dashboard")
      router.refresh()
    }
  }, [shouldRedirect, router])

  // Tick the resend rate-limit countdown once a second, clamping at zero.
  useEffect(() => {
    const timer = setInterval(() => {
      setResendRetrySeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Clear email verification state when email changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setEmailNotVerified(false)
      setResendSuccess("")
    }, 0)
    return () => clearTimeout(timer)
  }, [email])

  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      {/* Aurora Background - z-0 keeps it visible above section but below form */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/30 to-[#ba87ff]/25 blur-[120px] animate-aurora" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/25 to-[#36bfae]/30 blur-[100px] animate-aurora [animation-delay:3s]" />
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10">
        <h1 className="text-2xl font-bold text-white mb-2">
          {needsCode ? t.auth.twoFactorTitle : t.auth.welcomeBack}
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {needsCode ? t.auth.twoFactorSubtitle : t.auth.signInSubtitle}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {resendSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-[#36bfae]/10 border border-[#36bfae]/20 text-[#36bfae] text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {resendSuccess}
          </div>
        )}

        {needsCode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-[#36bfae]/25 bg-[#36bfae]/10 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#36bfae]" />
              <p className="text-sm text-slate-300">
                {t.auth.signingInAs.replace("{email}", "")}{" "}
                <span className="font-medium text-white">{email}</span>
              </p>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm text-slate-300 mb-1">
                {t.auth.authCode}
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                placeholder="123456"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-mono tracking-[0.3em] text-white focus:outline-none focus:border-[#36bfae]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? t.auth.verifying : t.auth.verifyAndSignIn}
            </button>

            <button
              type="button"
              onClick={() => {
                setNeedsCode(false)
                setCode("")
                setError("")
                setPassword("")
              }}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.auth.useDifferentAccount}
            </button>
          </form>
        ) : emailNotVerified ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div>
                <p className="text-sm text-slate-300 font-medium">
                  {t.auth.emailNotVerifiedTitle}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {t.auth.emailNotVerifiedMessage}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending || !email || resendRetrySeconds > 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {resending
                  ? t.auth.sendingVerification
                  : resendRetrySeconds > 0
                    ? `${t.auth.tryAgainPrefix} ${fmtResendTimer(resendRetrySeconds)}`
                    : t.auth.resendVerification}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailNotVerified(false)
                  setPassword("")
                }}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.auth.useDifferentAccount}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">{t.auth.emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#36bfae]"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">{t.auth.passwordLabel}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#36bfae]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? t.auth.signingIn : t.auth.signIn}
            </button>
          </form>
        )}

        <p className="text-sm text-slate-400 text-center mt-6">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="text-[#36bfae] hover:underline">
            {t.auth.signUp}
          </Link>
        </p>
        <p className="text-sm text-slate-400 text-center mt-2">
          <Link href="/forgot-password" className="text-[#36bfae] hover:underline">
            {t.auth.forgotPassword || "Forgot password?"}
          </Link>
        </p>
      </div>
    </section>
  )
}

function fmtResendTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return minutes > 99
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}
