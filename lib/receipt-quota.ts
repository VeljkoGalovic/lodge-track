import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"

/**
 * Organization storage accounting for expense receipts.
 *
 * Receipts are the only user-supplied bytes this application writes to disk, and
 * they are the one place a tenant can consume an unbounded amount of it: a host
 * photographing every supplier invoice at 5 MB each reaches a gigabyte in a few
 * hundred uploads. The tier cap is what turns that from "the disk fills up and
 * every tenant is affected" into "this one organization is told to upgrade".
 *
 * Usage is *derived* rather than counted in a column. `Expense.receiptSize` is
 * already the authoritative record of what was written — summing it cannot drift
 * from the files, whereas a maintained counter can, every time an upload fails
 * after the counter was incremented or a delete races a re-upload. The
 * `@@index([orgId, receiptSize])` on Expense is what keeps the sum an index-only
 * scan instead of a table read per upload.
 *
 * Scoped by `orgId` throughout. These figures are what one organization is
 * allowed to store, so a query that leaked across tenants would both misreport
 * the cap and expose another tenant's usage.
 */

export interface ReceiptQuota {
  usedBytes: number
  /** `Infinity` when the organization's tier does not cap storage. */
  limitBytes: number
}

/** Total bytes of receipts stored for one organization. */
export async function receiptBytesUsed(orgId: string): Promise<number> {
  const { _sum } = await prisma.expense.aggregate({
    where: { orgId },
    _sum: { receiptSize: true },
  })
  return _sum.receiptSize ?? 0
}

/**
 * What an organization is using, and what its tier allows.
 *
 * Returns null when the organization row is gone. The id comes from the session
 * so that should not happen, but an upload path that throws on a deleted tenant
 * is worse than one that returns the same tidy error as every other action.
 *
 * The tier comes from the organization's `Subscription`, which every
 * organization gets at registration, and defaults to STARTER when the row is
 * somehow absent — the same rule the dashboard layout uses to decide what plan
 * to *display*. Deriving the cap any other way would let the storage limit
 * disagree with the plan shown on screen.
 */
export async function receiptQuota(orgId: string): Promise<ReceiptQuota | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, subscription: { select: { tier: true } } },
  })
  if (!organization) return null

  return {
    usedBytes: await receiptBytesUsed(orgId),
    limitBytes: getOrgFeatures(organization.subscription?.tier ?? "STARTER").maxStorageBytes,
  }
}
