// app/signin/page.tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Script from "next/script"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password.")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative isolate flex min-h-screen items-center justify-center bg-[#07090E] px-4 overflow-hidden">
      {/* Aurora Flow Background Effect */}
      <div>
        data-aifx="aurora-flow"
        data-aifx-bg-alpha="0.9"
        data-aifx-speed="0.55"
        data-aifx-softness="0.18"
        data-aifx-amplitude="0.41"
        data-aifx-scale="1.38"
        data-aifx-y-focus="0.28"
        class="absolute inset-0 -z-10 pointer-events-none"
        aria-hidden="true"
    </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-sm text-slate-400 mb-6">Sign in to your LodgeTrack account</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

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

        <p className="text-sm text-slate-400 text-center mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-[#36bfae] hover:underline">
            Sign up
          </Link>
        </p>
      </div>

      {/* Effect runtime script */}
      <Script src="https://cdn.aidesigner.ai/effects/runtime/v1.js" strategy="lazyOnload" />
    </section>
  )
}