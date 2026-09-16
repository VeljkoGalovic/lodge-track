// app/signin/page.tsx
"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, ArrowLeft } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  /** Set once the password is accepted and a code is outstanding. */
  const [needsCode, setNeedsCode] = useState(false)

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
          setError("That code is not right. Check your authenticator app and try again.")
          break
        case "second_factor_unavailable":
          setNeedsCode(false)
          setError(
            "Two-factor is enabled on this account but its key cannot be read, so signing in is blocked. An owner of your organization can reset it for you."
          )
          break
        default:
          setNeedsCode(false)
          setError("Invalid email or password.")
      }
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/dashboard")
      router.refresh()
    }
  }, [shouldRedirect, router])

  return (
    <section className="relative isolate flex min-h-screen items-center justify-center px-4 overflow-hidden">
      {/* Aurora Background - z-0 keeps it visible above section but below form */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/30 to-[#ba87ff]/25 blur-[120px] animate-aurora" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/25 to-[#36bfae]/30 blur-[100px] animate-aurora [animation-delay:3s]" />
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10">
        <h1 className="text-2xl font-bold text-white mb-2">
          {needsCode ? "Two-factor authentication" : "Welcome back"}
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {needsCode
            ? "Enter the six-digit code from your authenticator app."
            : "Sign in to your LodgeTrack account"}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {needsCode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-[#36bfae]/25 bg-[#36bfae]/10 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#36bfae]" />
              <p className="text-sm text-slate-300">
                Signing in as <span className="font-medium text-white">{email}</span>
              </p>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm text-slate-300 mb-1">
                Authentication code
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
              {loading ? "Verifying..." : "Verify and sign in"}
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
              Use a different account
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Email</label>
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
              <label className="block text-sm text-slate-300 mb-1">Password</label>
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
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        <p className="text-sm text-slate-400 text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#36bfae] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </section>
  )
}
