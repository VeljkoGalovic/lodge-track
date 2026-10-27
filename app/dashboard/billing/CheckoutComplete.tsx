"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface CheckoutCompleteProps {
  message: string
  pollingMessage: string
}

/**
 * Shown right after Lemon Squeezy returns the buyer to
 * /dashboard/billing?checkout=complete. The webhook usually applies the
 * subscription within seconds; this banner polls /api/billing/status until
 * that lands, then sends the browser on to the dashboard.
 *
 * The polling is deliberately owned by exactly ONE interval that stops once:
 * - keying the effect on a poll counter re-created the interval on every tick,
 *   and the original "stop" branch only hid the spinner while a fresh interval
 *   went on polling forever — one request per second, indefinitely;
 * - success must not silently `window.location.reload()`: the checkout param
 *   is still in the URL, so reloading re-renders this same banner and starts
 *   the cycle over. `location.replace` to the dashboard (which the server
 *   redirects paid tiers into anyway) ends the flow for good.
 */
export function CheckoutComplete({ message, pollingMessage }: CheckoutCompleteProps) {
  const [isPolling, setIsPolling] = useState(true)
  // Mutable polling state lives in refs so the effect runs once with a stable
  // interval instead of being torn down and re-created after every poll.
  const pollCountRef = useRef(0)
  const stoppedRef = useRef(false)

  useEffect(() => {
    const MAX_POLLS = 30 // 30 seconds max
    const POLL_INTERVAL = 1000

    const pollStatus = async () => {
      if (stoppedRef.current) return

      try {
        // In development, add mock=true after the first few polls to auto-grant
        // access without live webhooks.
        const isDev = process.env.NODE_ENV === "development"
        const url = isDev && pollCountRef.current >= 3
          ? "/api/billing/status?checkout=complete&mock=true"
          : "/api/billing/status?checkout=complete"

        const response = await fetch(url, { cache: "no-store" })

        if (response.ok) {
          const data = await response.json()
          if (data.hasAccess && data.billingSubscriptionId) {
            // The billing page never re-renders this banner once the
            // subscription has access, but a plain reload of this URL would
            // still carry ?checkout=complete — navigate to where the flow
            // actually continues instead.
            stoppedRef.current = true
            window.location.replace("/dashboard")
            return
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
      }

      pollCountRef.current += 1

      if (pollCountRef.current >= MAX_POLLS) {
        stoppedRef.current = true
        // Bounded give-up: stop the network activity and leave the static
        // completion message instead of polling forever.
        setIsPolling(false)
      }
    }

    pollStatus()

    const intervalId = setInterval(pollStatus, POLL_INTERVAL)

    return () => {
      stoppedRef.current = true
      clearInterval(intervalId)
    }
  }, [])

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
