"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useDictionary } from "@/components/i18n/LocaleProvider"
import { resetPassword } from "@/app/actions/auth"

export function ResetPasswordForm() {
  const t = useDictionary()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, formAction, isPending] = useActionState(resetPassword, { error: "", success: "" })
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Handle redirect after successful reset
  useEffect(() => {
    if (state?.redirect) {
      router.push(state.redirect)
      router.refresh()
    }
  }, [state?.redirect, router])

  const passwordsMatch = password === confirmPassword && password.length >= 8
  const canSubmit = passwordsMatch && !isPending && token

  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      {/* Pure Tailwind/CSS Aurora Background Effect */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/25 to-[#ba87ff]/20 blur-[120px] animate-aurora" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/20 to-[#36bfae]/25 blur-[100px] animate-aurora [animation-delay:3s]" />
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10">
        <h1 className="text-2xl font-bold text-white mb-2">
          {t.auth.resetPasswordTitle}
        </h1>
        <p className="text-slate-400 mb-6">
          {t.auth.resetPasswordSubtitle}
        </p>

        {!token && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {t.auth.invalidResetToken}
          </div>
        )}

        {state?.error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="mb-4 p-3 rounded-xl bg-[#36bfae]/10 border border-[#36bfae]/20 text-[#36bfae] text-sm">
            {state.success}
          </div>
        )}

        {token && (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                {t.auth.newPasswordLabel}
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#36bfae]"
              />
              <p className="text-xs text-slate-500 mt-1">
                {t.auth.passwordMinLength}
              </p>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                {t.auth.confirmPasswordLabel}
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#36bfae]"
              />
              {!passwordsMatch && password && confirmPassword && (
                <p className="text-xs text-red-400 mt-1">
                  {t.auth.passwordMismatch}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? t.auth.resettingPassword : t.auth.resetPassword}
            </button>
          </form>
        )}

        <p className="text-sm text-slate-400 text-center mt-6">
          {t.auth.backToSignIn}{" "}
          <Link href="/signin" className="text-[#36bfae] hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </div>
    </section>
  )
}