import { NextResponse } from "next/server"
import { currentMembership } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { getAttachmentSignedUrl } from "@/lib/storage"

/**
 * Serves an expense receipt (legacy endpoint).
 *
 * Redirects to the new attachments API which serves files via signed URLs
 * from the unified Attachment table. Maintains backward compatibility for
 * existing links during the migration period.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const membership = await currentMembership()
  if (!membership) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { id } = await params

  // First try to find the attachment in the new unified table
  const attachment = await prisma.attachment.findFirst({
    where: {
      module: "EXPENSE",
      moduleId: id,
      orgId: membership.organization.id,
    },
    select: { objectPath: true, fileName: true, mimeType: true, fileSize: true },
    orderBy: { createdAt: "desc" },
  })

  if (!attachment) {
    // Fallback to legacy receipt fields for backward compatibility
    const expense = await prisma.expense.findFirst({
      where: { id, orgId: membership.organization.id },
      select: { receiptPath: true, receiptName: true, receiptType: true },
    })

    if (!expense?.receiptPath) {
      return NextResponse.json({ error: "No receipt" }, { status: 404 })
    }

    // For legacy receipts, generate a signed URL from the stored path
    const signedUrl = await getAttachmentSignedUrl(expense.receiptPath)
    if (!signedUrl) {
      return NextResponse.json({ error: "Could not generate download link." }, { status: 500 })
    }

    return NextResponse.redirect(signedUrl)
  }

  // New attachment system: generate signed URL
  const signedUrl = await getAttachmentSignedUrl(attachment.objectPath)
  if (!signedUrl) {
    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 })
  }

  return NextResponse.redirect(signedUrl)
}
