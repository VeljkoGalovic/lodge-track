import { NextRequest, NextResponse } from "next/server"
import { currentMembership } from "@/lib/authorization"
import { attachmentQuota } from "@/lib/attachment-quota"
import { saveAttachment, MAX_ATTACHMENT_BYTES } from "@/lib/storage"
import { Prisma } from "@prisma/client"
import { guardApiRateLimit } from "@/lib/api-guard"

export async function POST(request: NextRequest) {
  const rateLimited = await guardApiRateLimit(request)
  if (rateLimited) return rateLimited

  const membership = await currentMembership()
  if (!membership) {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 })
  }

  const { organization, user } = membership

  // Parse form data
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const moduleName = formData.get("module") as string
  const moduleId = formData.get("moduleId") as string

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }
  if (!moduleName || !moduleId) {
    return NextResponse.json({ error: "Module and moduleId are required." }, { status: 400 })
  }

  // Validate module
  const validModules = ["EXPENSE", "BOOKING", "PROPERTY", "UNIT", "USER_AVATAR"]
  if (!validModules.includes(moduleName)) {
    return NextResponse.json({ error: "Invalid module." }, { status: 400 })
  }

  // Validate file size early
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 })
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { error: `Attachments must be under ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB.` },
      { status: 400 }
    )
  }

  // Check quota
  const quota = await attachmentQuota(organization.id)
  if (!quota) {
    return NextResponse.json({ error: "Your organization could not be found." }, { status: 404 })
  }

  // Save attachment using serializable transaction for quota consistency
  const { serializable } = await import("@/lib/transaction")
  const result = await serializable(async (tx: Prisma.TransactionClient) => {
    const stored = await saveAttachment(file, organization.id, moduleName as "EXPENSE" | "BOOKING" | "PROPERTY" | "UNIT" | "USER_AVATAR", moduleId, quota, user.id, tx)
    return stored
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ attachment: result.attachment })
}