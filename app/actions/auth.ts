// app/actions/auth.ts
"use server"

import { prisma } from "@/lib/prisma" // Use your shared prisma client instance
import bcrypt from "bcrypt"

export async function registerUser(prevState: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string; redirect?: string }> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    return { error: "User with this email already exists." }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  // Use a Prisma transaction to create the Organization, User, and default Starter Subscription atomically
  await prisma.$transaction(async (tx) => {
    // 1. Create the firm/organization
    const organization = await tx.organization.create({
      data: {
        name: name ? `${name}'s Organization` : "My Organization",
      },
    })

    // 2. Create the user linked to this organization
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "OWNER",
        orgId: organization.id,
      },
    })

    // 3. Create a default Trial/Starter subscription for the organization
    await tx.subscription.create({
      data: {
        orgId: organization.id,
        tier: "STARTER",
        status: "ACTIVE",
      },
    })
  })

  return { success: "Account created successfully!", redirect: "/dashboard" }
}