"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ActionState } from "@/lib/action-state"

/**
 * Navigates once a form action reports a destination.
 *
 * Shared rather than repeated in every form: the `useActionState` result is the
 * only channel an action has for saying "done, go here", and getting the
 * dependency array wrong in one of a dozen copies would leave that form
 * silently failing to navigate.
 */
export function useActionRedirect(state: ActionState) {
  const router = useRouter()
  const target = state.redirect

  useEffect(() => {
    if (target) {
      router.push(target)
      router.refresh()
    }
  }, [target, router])
}
