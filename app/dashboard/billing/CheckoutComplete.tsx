"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface CheckoutCompleteProps {
  message: string
  pollingMessage: string
}

export function CheckoutComplete({ message, pollingMessage }: CheckoutCompleteProps) {
  const [isPolling, setIsPolling] = useState(true)
  const [pollCount, setPollCount] = useState(0)
  const MAX_POLLS = 30 // 30 seconds max
  const POLL_INTERVAL = 1000 // 1 second

  useEffect(() => {
    const intervalIdRef = { current: null as NodeJS.Timeout | null }

    const pollStatus = async () => {
      try {
        const response = await fetch("/api/billing/status", {
          cache: "no-store",
        })

        if (response.ok) {
          const data = await response.json()
          if (data.hasAccess && data.billingSubscriptionId) {
            // Subscription is active, reload the page
            window.location.reload()
            return
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
      }

      setPollCount((prev) => prev + 1)

      if (pollCount >= MAX_POLLS - 1) {
        setIsPolling(false)
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current)
        }
      }
    }

    // Start polling
    intervalIdRef.current = setInterval(pollStatus, POLL_INTERVAL)

    // Also poll immediately on mount
    pollStatus()

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
      }
    }
  }, [pollCount])

  if (!isPolling) {
    return (
      <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
        {message}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-muted-foreground flex items-center gap-3">
      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
      <span>{pollingMessage}</span>
    </div>
  )
}