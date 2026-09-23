import { NextRequest, NextResponse } from "next/server"
import { currentMembership } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const membership = await currentMembership()
  if (!membership) {
    return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 })
  }

  const { organization } = membership
  const { searchParams } = new URL(request.url)
  const moduleName = searchParams.get("module")
  const moduleId = searchParams.get("moduleId")

  if (!moduleName || !moduleId) {
    return NextResponse.json({ error: "Module and moduleId are required." }, { status: 400 })
  }

  const validModules = ["EXPENSE", "BOOKING", "PROPERTY", "UNIT", "USER_AVATAR"]
  if (!validModules.includes(moduleName)) {
    return NextResponse.json({ error: "Invalid module." }, { status: 400 })
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      orgId: organization.id,
      module: moduleName as "EXPENSE" | "BOOKING" | "PROPERTY" | "UNIT" | "USER_AVATAR",
      moduleId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      module: true,
      moduleId: true,
      orgId: true,
      bucket: true,
      objectPath: true,
      supabaseId: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      checksum: true,
      description: true,
      uploadedById: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ attachments })
}