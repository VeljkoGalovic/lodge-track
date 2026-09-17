import type { ExpenseCategory } from "@prisma/client"

/**
 * How each expense category is labelled and coloured.
 *
 * Shaped like lib/booking-status.ts on purpose: keys are the real Prisma enum
 * members, so a new category cannot be added to the schema and silently render as
 * a fallback everywhere, and the class strings are complete sets rather than
 * overrides that fight each other through Tailwind's property merging.
 */
export interface ExpenseCategoryStyle {
  label: string
  /** Complete border/background/text class set. */
  badge: string
}

export const EXPENSE_CATEGORY_STYLES: Record<ExpenseCategory, ExpenseCategoryStyle> = {
  MAINTENANCE: {
    label: "Maintenance",
    badge: "border-[#BA87FF]/25 bg-[#BA87FF]/10 text-[#BA87FF]",
  },
  UTILITIES: {
    label: "Utilities",
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-400",
  },
  SUPPLIES: {
    label: "Supplies",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-400",
  },
  CLEANING: {
    label: "Cleaning",
    badge: "border-[#36BFAE]/25 bg-[#36BFAE]/10 text-[#36BFAE]",
  },
  TAXES: {
    label: "Taxes",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-400",
  },
  INSURANCE: {
    label: "Insurance",
    badge: "border-indigo-400/25 bg-indigo-400/10 text-indigo-400",
  },
  OTHER: {
    label: "Other",
    badge: "border-white/10 bg-white/5 text-slate-300",
  },
}

/** Enum values in the order the form offers them: day-to-day costs first. */
export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_STYLES) as ExpenseCategory[]

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return Object.prototype.hasOwnProperty.call(EXPENSE_CATEGORY_STYLES, value)
}

export function getExpenseCategoryStyle(category: ExpenseCategory): ExpenseCategoryStyle {
  return EXPENSE_CATEGORY_STYLES[category] ?? EXPENSE_CATEGORY_STYLES.OTHER
}
