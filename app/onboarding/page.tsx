import Link from "next/link"
import { redirect } from "next/navigation"
import { currentMembership } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { OnboardingForm } from "@/components/onboarding/OnboardingForm"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { currentLocale } from "@/lib/i18n/server"
import { format, getDictionary } from "@/lib/i18n/dictionaries"

export const metadata = { title: "Set up your organization · LodgeTrack" }

/**
 * Reached from the dashboard pages when a signed-in member has no organization.
 *
 * `User.orgId` is required and cascades, so this state should be impossible —
 * but the dashboard pages name `/onboarding` as their redirect target, and a
 * dead target is worse than a page that fixes the problem.
 */
export default async function OnboardingPage() {
  const membership = await currentMembership()
  if (!membership) redirect("/signin")

  // No user locale to pass: this page settles which account is signed in, but
  // the language is a cookie read like any other unauthenticated page.
  const locale = await currentLocale()
  const t = getDictionary(locale)

  // Nothing to onboard: send them where they were going. Checked against the row
  // itself rather than the relation, which is declared non-nullable.
  const organization = await prisma.organization.findUnique({
    where: { id: membership.user.orgId },
    select: { id: true },
  })
  if (organization) redirect("/dashboard")

  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-[10%] -top-[20%] h-[60%] w-[60%] animate-aurora rounded-full bg-gradient-to-br from-[#36bfae]/30 to-[#ba87ff]/25 blur-[120px]" />
        <div className="absolute -right-[10%] top-[30%] h-[50%] w-[50%] animate-aurora rounded-full bg-gradient-to-tl from-[#ba87ff]/25 to-[#36bfae]/30 blur-[100px] [animation-delay:3s]" />
      </div>

      <div className="glass-card relative z-10 w-full max-w-md p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">{t.onboarding.title}</h1>
        <p className="mb-6 text-sm text-slate-400">{t.onboarding.description}</p>

        <LocaleProvider locale={locale}>
          <OnboardingForm />
        </LocaleProvider>

        <p className="mt-6 text-center text-sm text-slate-400">
          {format(t.onboarding.signedInAs, { email: membership.user.email })}{" "}
          <Link href="/signin" className="text-[#36bfae] hover:underline">
            {t.onboarding.useAnotherAccount}
          </Link>
        </p>
      </div>
    </section>
  )
}
