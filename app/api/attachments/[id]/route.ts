import { NextRequest, NextResponse } from "next/server"
import { currentMembership } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { getAttachmentSignedUrl, deleteAttachment } from "@/lib/storage"
import { serializable } from "@/lib/transaction"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const membership = await currentMembership()
  if (!membership) {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 })
  }

  const { organization } = membership
  const { id } = await params

  const attachment = await prisma.attachment.findFirst({
    where: { id, orgId: organization.id },
    select: {
      id: true,
      objectPath: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
    },
  })

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const download = searchParams.get("download") === "true"
  const signedUrl = await getAttachmentSignedUrl(attachment.objectPath)

  if (!signedUrl) {
    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 })
  }

  if (download) {
    return NextResponse.redirect(signedUrl)
  }

  return NextResponse.json({ signedUrl, attachment })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const membership = await currentMembership()
  if (!membership) {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 })
  }

  const { organization } = membership
  const { id } = await params

  const attachment = await prisma.attachment.findFirst({
    where: { id, orgId: organization.id },
    select: { id: true, objectPath: true },
  })

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 })
  }

  // Delete from database and storage in a serializable transaction
  await serializable(async (tx: Prisma.TransactionClient) => {
    await tx.attachment.delete({ where: { id: attachment.id } })
    await deleteAttachment(attachment.objectPath)
  })

  return NextResponse.json({ success: "Attachment deleted." })
}