import { Metadata } from "next"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy · LodgeTrack",
  description: "LodgeTrack Privacy Policy - How we collect, use, and protect your data",
}

export default async function PrivacyPage() {
  const locale = await currentLocale()
  const t = getDictionary(locale)

  return (
    <LocaleProvider locale={locale}>
      <section className="dark min-h-screen bg-background text-foreground px-4 py-12 md:py-20">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Header */}
          <header className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              {t.pages.privacy?.title || "Privacy Policy"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.pages.privacy?.subtitle || "Last updated: September 2026"}
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
                {t.pages.privacy?.section1Title || "1. Information We Collect"}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t.pages.privacy?.section1Intro || "We collect the following categories of information:"}
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
                <li>{t.pages.privacy?.collect1 || "<strong>Account information:</strong> Name, email address, password (hashed), and organization details."}</li>
                <li>{t.pages.privacy?.collect2 || "<strong>Usage data:</strong> Properties, bookings, expenses, and analytics you create in the application."}</li>
                <li>{t.pages.privacy?.collect3 || "<strong>Technical data:</strong> IP address, browser type, device information, and access logs for security."}</li>
                <li>{t.pages.privacy?.collect4 || "<strong>Communication data:</strong> Email address for verification, password resets, and important service notifications."}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section2Title || "2. How We Use Your Information"}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
                <li>{t.pages.privacy?.use1 || "Provide and maintain the LodgeTrack service."}</li>
                <li>{t.pages.privacy?.use2 || "Authenticate and secure your account (including 2FA and email verification)."}</li>
                <li>{t.pages.privacy?.use3 || "Send transactional emails: verification, password resets, and critical service notices."}</li>
                <li>{t.pages.privacy?.use4 || "Process subscription payments via our payment processor."}</li>
                <li>{t.pages.privacy?.use5 || "Improve the service through anonymized usage analytics."}</li>
                <li>{t.pages.privacy?.use6 || "Comply with legal obligations and enforce our Terms of Service."}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section3Title || "3. Data Storage and Security"}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
                <li>{t.pages.privacy?.security1 || "Data is stored in PostgreSQL databases with encryption at rest."}</li>
                <li>{t.pages.privacy?.security2 || "Passwords are hashed with bcrypt (cost factor 10)."}</li>
                <li>{t.pages.privacy?.security3 || "Two-factor authentication secrets are encrypted with AES-256-GCM."}</li>
                <li>{t.pages.privacy?.security4 || "All traffic uses HTTPS/TLS in production."}</li>
                <li>{t.pages.privacy?.security5 || "Receipt files are stored privately and only accessible to organization members."}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section4Title || "4. Data Sharing"}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t.pages.privacy?.section4Content || "We do not sell your data. We share data only in these limited circumstances:"}
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
                <li>{t.pages.privacy?.share1 || "<strong>Payment processor:</strong> For subscription billing (Lemon Squeezy)."}</li>
                <li>{t.pages.privacy?.share2 || "<strong>Email provider:</strong> For transactional emails (Resend)."}</li>
                <li>{t.pages.privacy?.share3 || "<strong>Legal requirements:</strong> When required by law or to protect rights."}</li>
                <li>{t.pages.privacy?.share4 || "<strong>Organization members:</strong> Data is visible to other members of your organization per role permissions."}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section5Title || "5. Your Rights"}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
                <li>{t.pages.privacy?.rights1 || "Access and export your data from the dashboard."}</li>
                <li>{t.pages.privacy?.rights2 || "Request deletion of your account and all associated data."}</li>
                <li>{t.pages.privacy?.rights3 || "Update your profile information at any time."}</li>
                <li>{t.pages.privacy?.rights4 || "Opt out of non-essential communications."}</li>
                <li>{t.pages.privacy?.rights5 || "Object to processing where applicable under GDPR."}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section6Title || "6. Data Retention"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.privacy?.section6Content || "We retain your data while your account is active. Upon account deletion, data is removed within 30 days. Backups are retained for up to 90 days for disaster recovery. Legal obligations may require longer retention for certain records."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section7Title || "7. Cookies and Tracking"}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t.pages.privacy?.section7Content || "We use only essential cookies:"}
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
                <li>{t.pages.privacy?.cookie1 || "<strong>Session cookie:</strong> Keeps you signed in (NextAuth.js)."}</li>
                <li>{t.pages.privacy?.cookie2 || "<strong>Locale cookie:</strong> Remembers your language preference."}</li>
                <li>{t.pages.privacy?.cookie3 || "<strong>Theme cookie:</strong> Remembers your light/dark/system preference."}</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                {t.pages.privacy?.cookie4 || "No third-party analytics, advertising, or tracking cookies are used."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section8Title || "8. International Transfers"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.privacy?.section8Content || "Your data may be processed in the United States and European Union. We rely on standard contractual clauses and adequacy decisions for international transfers."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section9Title || "9. Children's Privacy"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.privacy?.section9Content || "LodgeTrack is not directed to children under 16. We do not knowingly collect data from children. If you believe we have collected data from a child, contact us immediately."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section10Title || "10. Changes to This Policy"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.privacy?.section10Content || "We may update this policy. Material changes will be notified via email or in-app. The updated date at the top reflects the latest revision."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.pages.privacy?.section11Title || "11. Contact"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.pages.privacy?.section11Content || "Privacy questions? Contact us at privacy@lodgetrack.app or use the contact form in the app."}
              </p>
            </section>
          </article>

          {/* Footer */}
          <footer className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>{t.pages.privacy?.footer || "© 2026 LodgeTrack. All rights reserved."}</p>
          </footer>
        </div>
      </section>
    </LocaleProvider>
  )
}