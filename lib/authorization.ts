import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { minorUnitDigits } from "@/lib/currency"
import { redirect } from "next/navigation"
import type { Role } from "@prisma/client"

/**
 * Re-exported so the actions, which all live on the server, have one import for
 * the authorization helpers and the result shape together. Client components
 * must import from `@/lib/action-state` instead — see the note there.
 */
export type { ActionState } from "@/lib/action-state"
export { EMPTY_ACTION_STATE } from "@/lib/action-state"

/**
 * Who is allowed to do what.
 *
 * The three roles are hierarchical in one direction and not the other:
 *
 *   OWNER       — everything, including billing and the organization itself
 *   MANAGER     — the day-to-day: properties, bookings, inviting members
 *   MAINTENANCE — read-only, so trades can see where they are going
 *
 * A manager may change a maintenance member's role but not another manager's,
 * and may never touch an owner. That is what stops two managers from demoting
 * each other, or one from locking the owner out.
 */

/**
 * Resolves the signed-in member together with their organization. Returns `null`
 * when there is no session, or the session points at a user who has since been
 * deleted — both of which callers must handle rather than assume.
 */
export async function currentMembership() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: { include: { subscription: true } } },
  })
  if (!user) return null

  const { organization, ...member } = user
  return { user: member, organization, subscription: organization.subscription }
}

export type Membership = NonNullable<Awaited<ReturnType<typeof currentMembership>>>

/**
 * The page-level form of `currentMembership`: signs the visitor in rather than
 * returning `null`. A session can outlive the user row it points at, so both
 * halves are checked before anything is rendered.
 */
export async function requireMembership(): Promise<Membership> {
  const membership = await currentMembership()
  if (!membership) redirect("/signin")
  return membership
}

export function isOwner(role: Role): boolean {
  return role === "OWNER"
}

/** May create, edit and delete properties, bookings and invitations. */
export function canManage(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER"
}

/** May change billing, the organization's own details, and other members' roles. */
export function canAdminister(role: Role): boolean {
  return role === "OWNER"
}

/**
 * Whether `actor` may change `target`'s role or remove them. Owners are
 * untouchable to everyone but another owner, and nobody may modify themselves
 * through the team page — the self-service paths live in Settings, where the
 * consequences are spelled out.
 */
export function canModifyMember(actor: { id: string; role: Role }, target: { id: string; role: Role }): boolean {
  if (actor.id === target.id) return false
  if (target.role === "OWNER") return actor.role === "OWNER"
  if (target.role === "MANAGER") return actor.role === "OWNER"
  return canManage(actor.role)
}

/** Trimmed string from a FormData entry, or `""` when absent. */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Parses a currency input into minor units for `currency`. An empty string is not
 * an error — "no rate recorded" is a state the schema supports on purpose — but
 * anything else unparseable is reported rather than quietly dropped.
 *
 * The currency's own precision decides the scale. Hardcoding a multiply-by-100
 * here would store ¥15,000 as ¥150, and no amount of correct formatting later
 * could recover it.
 */
export function parseMoneyField(
  raw: string,
  currency: string
): { ok: true; minorUnits: number | null } | { ok: false } {
  if (raw === "") return { ok: true, minorUnits: null }

  // Accept "1,250.50", since that is how a figure is likely to be pasted in.
  const parsed = Number(raw.replace(/,/g, ""))
  if (!Number.isFinite(parsed) || parsed < 0) return { ok: false }

  return { ok: true, minorUnits: Math.round(parsed * 10 ** minorUnitDigits(currency)) }
}

/** A `YYYY-MM-DD` date input as a local-midnight `Date`, or `null` when invalid. */
export function dateField(formData: FormData, name: string): Date | null {
  const raw = field(formData, name)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null

  const [year, month, day] = raw.split("-").map(Number)
  const date = new Date(year, month - 1, day)

  // Reject rolled-over dates like 2026-02-31, which `new Date` silently accepts.
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null
}
