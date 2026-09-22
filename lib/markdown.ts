import fs from "fs"
import path from "path"
import matter from "gray-matter"

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