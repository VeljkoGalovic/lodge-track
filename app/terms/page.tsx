import { Metadata } from "next"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service · LodgeTrack",
  description: "LodgeTrack Terms of Service and User Agreement",
}

export default async function TermsPage() {
  const locale = await currentLocale()
  const t = getDictionary(locale)

  return (
    <LocaleProvider locale={locale}>
      <section className="dark min-h-screen bg-background text-foreground px-4 py-12 md:py-20">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Header */}
          <header className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              {t.pages.terms?.title || "Terms of Service"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.pages.terms?.subtitle || "Last updated: September 2026"}
            </p>
          </header>

          {/* Back link */}
          <div className="flex justify-start">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
            >
              ← {t.auth.signUp || "Back to registration"}
            </Link>
          </div>

          {/* Content */}
          <article className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section1Title || "1. Acceptance of Terms"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.terms?.section1Content || "By creating an account and using LodgeTrack, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section2Title || "2. Description of Service"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.terms?.section2Content || "LodgeTrack is a property management platform for tracking bookings, revenue, occupancy, and expenses across your property portfolio. We provide the software as-is and reserve the right to modify features at any time."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section3Title || "3. Your Account"}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
                <li>{t.pages.terms?.account1 || "You are responsible for maintaining the confidentiality of your account credentials."}</li>
                <li>{t.pages.terms?.account2 || "You must provide accurate information and keep it updated."}</li>
                <li>{t.pages.terms?.account3 || "You are responsible for all activity under your account."}</li>
                <li>{t.pages.terms?.account4 || "You must verify your email address to use the service."}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section4Title || "4. Data and Privacy"}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t.pages.terms?.section4Content || "Your data belongs to you. We do not sell your data. See our Privacy Policy for details on how we collect, use, and protect your information."}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <Link href="/privacy" className="text-primary hover:underline">
                  {t.pages.terms?.privacyPolicyLink || "Read our Privacy Policy"}
                </Link>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section5Title || "5. Subscription and Billing"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.terms?.section5Content || "LodgeTrack offers free and paid plans. Billing is handled through our payment processor. You can cancel at any time. Refunds are subject to our payment processor's policies."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section6Title || "6. Acceptable Use"}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t.pages.terms?.section6Content || "You may not use LodgeTrack for illegal activities, to infringe intellectual property, or to interfere with the service's operation."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section7Title || "7. Disclaimer of Warranties"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.terms?.section7Content || "LodgeTrack is provided 'as is' without warranties of any kind. We do not guarantee uninterrupted or error-free service."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section8Title || "8. Limitation of Liability"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.terms?.section8Content || "To the maximum extent permitted by law, LodgeTrack shall not be liable for any indirect, incidental, or consequential damages."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section9Title || "9. Changes to Terms"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.terms?.section9Content || "We may update these terms. Continued use after changes constitutes acceptance. We will notify you of material changes via email or in-app notification."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.terms?.section10Title || "10. Contact"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.terms?.section10Content || "Questions about these Terms? Contact us at legal@lodgetrack.app"}
              </p>
            </section>
          </article>

          {/* Footer */}
          <footer className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>{t.pages.terms?.footer || "© 2026 LodgeTrack. All rights reserved."}</p>
          </footer>
        </div>
      </section>
    </LocaleProvider>
  )
}