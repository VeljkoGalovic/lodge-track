import { Metadata } from "next"
import Link from "next/link"
import { readLegalMarkdown, getLegalVersionDate, LegalMarkdown, extractHeadings } from "@/lib/markdown"
import { TableOfContents } from "@/components/legal/TableOfContents"
import { currentLocale } from "@/lib/i18n/server"

export const metadata: Metadata = {
  title: "Cookie Policy · LodgeTrack",
  description: "LodgeTrack Cookie Policy - How we use cookies and tracking technologies",
}

export default async function CookiesPage() {
  const locale = await currentLocale()
  const { content } = readLegalMarkdown("cookies.md")
  const lastUpdated = getLegalVersionDate("cookies.md")
  const headings = extractHeadings(content)

  return (
    <section className="dark min-h-screen bg-background text-foreground px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Cookie Policy
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Last updated: {lastUpdated}
          </p>
        </header>

        {/* Back link */}
        <div className="flex justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        {/* Two-column layout with TOC */}
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          {/* Table of Contents - right sidebar on desktop */}
          <TableOfContents items={headings} />

          {/* Main content */}
          <article className="prose prose-invert max-w-none space-y-8">
            <LegalMarkdown content={content} />
          </article>
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© 2026 LodgeTrack. All rights reserved.</p>
        </footer>
      </div>
    </section>
  )
}