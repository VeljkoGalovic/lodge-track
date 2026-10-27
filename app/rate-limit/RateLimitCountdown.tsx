"use client"

import { useEffect, useState } from "react"
import { useDictionary } from "@/components/i18n/LocaleProvider"

/**
 * Live countdown for the rate-limit page. Starts at the server-computed
 * wait, ticks once a second, and swaps to the "you can try again" state
 * when it reaches zero.
 */
export function RateLimitCountdown({ initialSeconds }: { initialSeconds: number }) {
  const t = useDictionary()
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.floor(initialSeconds)))

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (secondsLeft <= 0) {
    return (
      <div>
        <p className="text-3xl font-bold font-mono text-[#36bfae] mb-2">00:00</p>
        <p className="text-sm text-[#36bfae]">{t.auth.retryNow}</p>
      </div>
    )
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const display =
    minutes > 99
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  return (
    <div>
      <p className="text-4xl font-bold font-mono text-white text-center mb-2 tabular-nums">{display}</p>
      <p className="text-xs text-slate-400 text-center">
        {t.auth.tryAgainPrefix} {display}
      </p>
    </div>
  )
}
