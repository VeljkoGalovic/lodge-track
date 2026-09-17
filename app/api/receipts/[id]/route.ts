import { NextResponse } from "next/server"
import { currentMembership } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { readReceipt } from "@/lib/storage"

/**
 * Serves an expense receipt.
 *
 * The only way a stored receipt ever leaves the server, and the reason receipts
 * are not written under `public/`. Three checks stand between the request and the
 * bytes, and all three are load-bearing:
 *
 *   1. a session — an anonymous request never reaches the query;
 *   2. the expense is found by `{ id, orgId }` together, so an id belonging to
 *      another tenant matches nothing rather than being fetched and then judged;
 *   3. the stored file exists and its key resolves inside the storage root.
 *
 * The response is marked `nosniff` and `no-store`: the content type comes from
 * the bytes verified at upload rather than the browser's claim, and a receipt is
 * tenant data that should not sit in a shared cache.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const membership = await currentMembership()
  if (!membership) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { id } = await params

  const expense = await prisma.expense.findFirst({
    // Both terms together: `orgId` is not a check performed after the fetch, it
    // is part of what makes the row findable at all.
    where: { id, orgId: membership.organization.id },
    select: { receiptPath: true, receiptName: true, receiptType: true },
  })

  if (!expense?.receiptPath) {
    return NextResponse.json({ error: "No receipt" }, { status: 404 })
  }

  const bytes = await readReceipt(expense.receiptPath)
  if (!bytes) {
    return NextResponse.json({ error: "Receipt file is missing" }, { status: 404 })
  }

  const headers = new Headers({
    "Content-Type": expense.receiptType ?? "application/octet-stream",
    "Content-Length": String(bytes.length),
    "Content-Disposition": `inline; filename="${encodeURIComponent(expense.receiptName ?? "receipt")}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  })

  return new NextResponse(new Uint8Array(bytes), { headers })
}
