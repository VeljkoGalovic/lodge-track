import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Joins class names and resolves Tailwind conflicts left-to-right, so a
 * component's `className` prop reliably wins over its variant defaults instead
 * of depending on the order rules happen to land in the stylesheet.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
