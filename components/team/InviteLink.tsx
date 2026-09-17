"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface InviteLinkProps {
  url: string
}

/**
 * The invitation URL with a copy button.
 *
 * The clipboard API is unavailable over plain HTTP on anything but localhost,
 * so the fallback selects the text instead of silently doing nothing — the link
 * is always readable, and always selectable by hand.
 */
export function InviteLink({ url }: InviteLinkProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
        {url}
      </code>
      <Button type="button" variant="glass" size="sm" onClick={copy} aria-live="polite">
        {copied ? (
          <>
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy
          </>
        )}
      </Button>
    </div>
  )
}
