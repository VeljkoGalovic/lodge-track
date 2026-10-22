"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  onDeactivate?: () => void
}

/**
 * Traps focus within the component when active.
 * Focus cycles through focusable elements inside the trap.
 * Restores focus to previous element on deactivation.
 */
export function FocusTrap({ children, active = true, onDeactivate }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    previousActiveElement.current = document.activeElement as HTMLElement
    const container = containerRef.current

    // Focus first focusable element
    const focusableElements = container?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusableElements?.[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return

      const focusable = Array.from(focusableElements || [])
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onDeactivate?.()
      }
    }

    container?.addEventListener("keydown", handleKeyDown)
    container?.addEventListener("keydown", handleEscape)

    return () => {
      container?.removeEventListener("keydown", handleKeyDown)
      container?.removeEventListener("keydown", handleEscape)
      previousActiveElement.current?.focus()
    }
  }, [active, onDeactivate])

  if (!active) return <>{children}</>

  return createPortal(
    <div ref={containerRef} className="contents">{children}</div>,
    document.body
  )
}