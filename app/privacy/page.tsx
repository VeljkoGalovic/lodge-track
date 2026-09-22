import { Metadata } from "next"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { readLegalMarkdown, getLegalVersionDate } from "@/lib/markdown"

export const metadata: Metadata = {
  title: "Privacy Policy · LodgeTrack",
  description: "LodgeTrack Privacy Policy - How we collect, use, and protect your data",
}

export default async function PrivacyPage() {
  const { content } = readLegalMarkdown("privacy-policy.md")
  const lastUpdated = getLegalVersionDate("privacy-policy.md")

  return (
    <section className="dark min-h-screen bg-background text-foreground px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Last updated: {lastUpdated}
          </p>
        </header>

        {/* Back link */}
        <div className="flex justify-start">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
          >
            ← Back to registration
          </Link>
        </div>

        {/* Content */}
        <article className="prose prose-invert max-w-none space-y-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            a: ({ href, children, ...props }) => {
              const isExternal = href?.startsWith("http") ?? false
              return (
                <a
                  {...props}
                  href={href ?? "#"}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="text-primary hover:underline"
                >
                  {children}
                </a>
              )
            },
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto">
                <table {...props} className="w-full border-collapse">
                  {children}
                </table>
              </div>
            ),
            th: ({ children, ...props }) => (
              <th {...props} className="border border-border px-4 py-2 text-left font-semibold bg-muted">
                {children}
              </th>
            ),
            td: ({ children, ...props }) => (
              <td {...props} className="border border-border px-4 py-2">
                {children}
              </td>
            ),
          }}>
            {content}
          </ReactMarkdown>
        </article>

        {/* Footer */}
        <footer className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© 2026 LodgeTrack. All rights reserved.</p>
        </footer>
      </div>
    </section>
  )
}