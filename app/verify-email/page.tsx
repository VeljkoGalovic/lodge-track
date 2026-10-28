import { Metadata } from "next"
import { headers } from "next/headers"
import { visitorLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import Link from "next/link"
import { verifyAndConsumeToken } from "@/lib/tokens"
import { prisma } from "@/lib/prisma"
import { createCheckoutUrl } from "@/lib/billing"
import { redirect } from "next/navigation"
import { requestOrigin } from "@/lib/origin"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { ResendVerificationForm } from "./ResendVerificationForm"

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const locale = await visitorLocale()
  const t = getDictionary(locale)
  const params = await searchParams
  const token = params.token

  // Verify token if provided
  let verificationResult: { success: boolean; message: string } | null = null

  if (token) {
    try {
      const email = await verifyAndConsumeToken(token, "email_verification")
      if (email) {
        // Check if user has subscription and trigger checkout for paid tiers
        const user = await prisma.user.findUnique({
          where: { email },
          include: { organization: { include: { subscription: true } } },
        })

        const origin = await requestOrigin()

        if (user?.organization?.subscription) {
          const tier = user.organization.subscription.tier
          // All three tiers are paid - trigger checkout for STARTER, PRO, and BUSINESS
          if (tier === "STARTER" || tier === "PRO" || tier === "BUSINESS") {
            // Create checkout URL and redirect
            const checkoutUrl = await createCheckoutUrl({
              tier,
              email: user.email,
              orgId: user.orgId,
              redirectUrl: `${origin}/dashboard/billing?checkout=complete`,
            })

            if (checkoutUrl) {
              // Set redirect counter cookie via headers to prevent infinite loop after checkout returns
              const headersList = await headers()
              const responseHeaders = new Headers()
              responseHeaders.set("Set-Cookie", "checkout_redirect_count=0; Path=/; Max-Age=3600; SameSite=Lax")
              redirect(checkoutUrl)
            } else {
              // Checkout creation failed - variant ID missing or API error
              verificationResult = {
                success: false,
                message: t.verification.checkoutFailed,
              }
            }
          }
        }

        if (!verificationResult) {
          verificationResult = {
            success: true,
            message: t.verification.success,
          }
        }
      } else {
        verificationResult = {
          success: false,
          message: t.verification.invalidLink,
        }
      }
    } catch (error) {
      // Rethrow redirect errors so Next.js can handle them properly
      if (isRedirectError(error)) {
        throw error
      }
      console.error("Verification error:", error)
      verificationResult = {
        success: false,
        message: t.verification.genericError,
      }
    }
  }

  return (
    <LocaleProvider locale={locale}>
      <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
        {/* Pure Tailwind/CSS Aurora Background Effect */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/25 to-[#ba87ff]/20 blur-[120px] animate-aurora" />
          <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/20 to-[#36bfae]/25 blur-[100px] animate-aurora [animation-delay:3s]" />
        </div>

        <div className="glass-card w-full max-w-md p-8 relative z-10 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#36bfae] to-[#ba87ff] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#07090E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            {t.verification.title}
          </h1>

          {token && !verificationResult && (
            <p className="text-slate-300 mb-6">
              {t.verification.verifying}
            </p>
          )}

          {verificationResult && (
            <div className={`mb-6 p-4 rounded-xl ${verificationResult.success ? "bg-[#36bfae]/10 border border-[#36bfae]/20 text-[#36bfae]" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
              <p className="text-sm">{verificationResult.message}</p>
            </div>
          )}

          {!token && !verificationResult && (
            <>
              <p className="text-slate-300 mb-6">{t.verification.noToken}</p>
              <ResendVerificationForm />
            </>
          )}

          <div className="space-y-4">
            <Link
              href="/signin"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#36bfae] to-[#ba87ff] text-[#07090E] font-semibold hover:opacity-90 transition-opacity inline-block"
            >
              {t.verification.signIn}
            </Link>

            <Link
              href="/register"
              className="w-full py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors inline-block"
            >
              {t.verification.registerAgain}
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            {t.verification.contactUs}
          </p>
        </div>
      </section>
    </LocaleProvider>
  )
}