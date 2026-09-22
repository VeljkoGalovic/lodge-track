import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeStringify from "rehype-stringify"
import { visit } from "unist-util-visit"
import type { Element } from "hast"
import ReactMarkdown from "react-markdown"
import type { ReactNode, ComponentPropsWithoutRef } from "react"
import type { Components } from "react-markdown"

/**
 * Reads and parses a markdown file from the legal content directory.
 * Returns the parsed content with frontmatter.
 */
export function readLegalMarkdown(filename: string): { content: string; data: Record<string, unknown> } {
  const filePath = path.join(process.cwd(), "src/content/legal", filename)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Legal document not found: ${filename}`)
  }

  const fileContent = fs.readFileSync(filePath, "utf-8")
  const { content, data } = matter(fileContent)

  return { content, data }
}

/**
 * Extracts headings (h2, h3) from markdown content with their IDs.
 * Uses unified/rehype to generate slugified IDs via rehype-slug.
 */
export function extractHeadings(content: string): Array<{ id: string; text: string; level: number }> {
  const headings: Array<{ id: string; text: string; level: number }> = []

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "append" })
    .use(() => (tree) => {
      visit(tree, "element", (node: Element) => {
        if (node.tagName === "h2" || node.tagName === "h3") {
          const id = node.properties?.id as string
          const text = node.children
            ?.filter((c): c is { type: "text"; value: string } => c.type === "text")
            ?.map((c) => c.value)
            ?.join("") || ""
          if (id && text) {
            headings.push({
              id,
              text,
              level: node.tagName === "h2" ? 2 : 3,
            })
          }
        }
      })
    })
    .use(rehypeStringify)

  processor.processSync(content)

  return headings
}

/**
 * Processes markdown to HTML with heading IDs and anchor links.
 */
export async function processMarkdownToHtml(content: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "append" })
    .use(rehypeStringify)

  const result = await processor.process(content)
  return String(result)
}

/**
 * ReactMarkdown components that include rehype plugins for heading IDs.
 * This ensures the rendered HTML has proper IDs on h2/h3 elements for TOC navigation.
 */
const legalMarkdownComponents: Components = {
  a: ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => {
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
  table: ({ children, ...props }: ComponentPropsWithoutRef<"table">) => (
    <div className="overflow-x-auto">
      <table {...props} className="w-full border-collapse">
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: ComponentPropsWithoutRef<"th">) => (
    <th {...props} className="border border-border px-4 py-2 text-left font-semibold bg-muted">
      {children}
    </th>
  ),
  td: ({ children, ...props }: ComponentPropsWithoutRef<"td">) => (
    <td {...props} className="border border-border px-4 py-2">
      {children}
    </td>
  ),
}

/**
 * Renders markdown content with proper heading IDs for TOC navigation.
 * Uses ReactMarkdown with rehype-slug and rehype-autolink-headings plugins.
 */
export function LegalMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: "append" }],
      ]}
      components={legalMarkdownComponents}
    >
      {content}
    </ReactMarkdown>
  )
}

/**
 * Extracts the "Last updated" date from markdown content.
 * Looks for patterns like "Last updated September 21, 2026" or "Last updated: September 21, 2026"
 */
export function extractLastUpdatedDate(content: string): string | null {
  // Pattern to match "Last updated September 21, 2026" or "Last updated: September 21, 2026"
  const patterns = [
    /^Last updated[:\s]+(.+)$/im,
    /^last updated[:\s]+(.+)$/im,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Gets the version date for a legal document.
 * First tries to extract from markdown, falls back to hardcoded date.
 */
export function getLegalVersionDate(filename: string): string {
  try {
    const { content } = readLegalMarkdown(filename)
    const extracted = extractLastUpdatedDate(content)
    if (extracted) {
      return extracted
    }
  } catch {
    // File not found or other error
  }
  // Fallback date
  return "September 21, 2026"
}