import { Metadata } from "next"
import Link from "next/link"
import { readLegalMarkdown, getLegalVersionDate, extractHeadings, LegalMarkdown } from "@/lib/markdown"
import { TableOfContents } from "@/components/legal/TableOfContents"

export const metadata: Metadata = {
  title: "Data Processing Agreement · LodgeTrack",
  description: "LodgeTrack Data Processing Agreement (DPA) - GDPR compliance for data processing",
}

export default async function DPAPage() {
  const { content } = readLegalMarkdown("dpa.md")
  const lastUpdated = getLegalVersionDate("dpa.md")
  const headings = extractHeadings(content)

  return (
    <section className="dark min-h-screen bg-background text-foreground px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Data Processing Agreement
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Last updated: {lastUpdated}
          </p>
        </header>

        {/* Back link */}
        <div className="flex justify-start">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
          >
            ← Back to Privacy Policy
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