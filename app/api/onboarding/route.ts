import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgName } = await req.json()

  if (!orgName || !orgName.trim()) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
  }

  try {
    // Check if user already has an organization
    const existingUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true }
    })

    if (existingUser?.organization) {
      return NextResponse.json({ error: "User already has an organization" }, { status: 400 })
    }

    // Create organization with user as owner
    const organization = await prisma.organization.create({
      data: {
        name: orgName.trim(),
        users: {
          connect: { email: session.user.email }
        },
        subscription: {
          create: {
            tier: "STARTER",
            status: "ACTIVE"
          }
        }
      },
      include: {
        subscription: true
      }
    })

    return NextResponse.json({ success: true, organization })
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
  }
}