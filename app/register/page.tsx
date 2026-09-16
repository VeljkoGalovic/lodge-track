// app/register/page.tsx
"use client"

import { useActionState } from "react"
import { registerUser } from "@/app/actions/auth"
import Link from "next/link"
import Script from "next/script"

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerUser, null)

  return (
    <section className="relative isolate flex min-h-screen items-center justify-center bg-[#07090E] px-4 overflow-hidden">
      {/* Aurora Flow Background Effect */}
      <div
        data-aifx="aurora-flow"
        className="absolute inset-0 -z-10 pointer-events-none"
        aria-hidden="true"
      ></div>

      <div className="glass-card w-full max-w-md p-8 relative z-10">
        <h1 className="text-2xl font-bold text-white mb-6">Create your LodgeTrack account</h1>
        
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

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Name</label>
            <input 
              type="text" 
              name="name" 
              placeholder="John Doe" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#36bfae]"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="you@example.com" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#36bfae]"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              placeholder="••••••••" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#36bfae]"
            />
          </div>
          <button 
            type="submit" 
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-sm text-slate-400 text-center mt-6">
          Already have an account?{" "}
          <Link href="/signin" className="text-[#36bfae] hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      {/* Effect runtime script */}
      <Script src="https://cdn.aidesigner.ai/effects/runtime/v1.js" strategy="lazyOnload" />
    </section>
  )
}