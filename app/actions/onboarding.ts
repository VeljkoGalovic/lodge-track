"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import {
  currentMembership,
  canAdminister,
  field,
  type ActionState,
} from "@/lib/authorization"
import { isSupportedCurrency } from "@/lib/currency"
import { SUPPORTED_TIMEZONES } from "@/lib/timezones"
import { cleanupMockData } from "./mock-data"

export interface SetupWizardData {
  organizationName: string
  currency: string
  timeZone: string
  checkInTime: string      // HH:mm format
  checkOutTime: string     // HH:mm format
  walkthroughCompleted?: boolean  // Step 8: whether user wants to keep mock data
}

export async function completeSetupWizard(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canAdminister(membership.user.role)) {
    return { error: "Only an owner can complete organization setup." }
  }

  const orgId = membership.organization.id

  // Step 1: Organization basics
  const organizationName = field(formData, "organizationName")
  if (!organizationName) return { error: "Organization name is required." }

  const currency = field(formData, "currency") || "USD"
  if (!isSupportedCurrency(currency)) return { error: "Choose a supported currency." }

  // Step 2: Time zone
  const timeZone = field(formData, "timeZone")
  if (!timeZone) return { error: "Time zone is required." }
  if (!SUPPORTED_TIMEZONES.includes(timeZone)) return { error: "Invalid time zone." }

  // Step 3: Check-in/out times
  const checkInTime = field(formData, "checkInTime") || "15:00"
  const checkOutTime = field(formData, "checkOutTime") || "11:00"

  // Validate time format (HH:mm)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(checkInTime)) return { error: "Invalid check-in time format." }
  if (!timeRegex.test(checkOutTime)) return { error: "Invalid check-out time format." }

  // Step 8: Walkthrough completion preference
  const walkthroughCompleted = field(formData, "walkthroughCompleted") === "true"

  await prisma.$transaction(async (tx) => {
    // Update organization
    await tx.organization.update({
      where: { id: orgId },
      data: {
        name: organizationName,
        currency,
        timeZone,
        checkInTime,
        checkOutTime,
        onboardingCompleted: true,
      },
    })

    // Handle mock data cleanup if user doesn't want to keep it
    if (!walkthroughCompleted) {
      // The cleanup is done in a separate action to avoid transaction complexity
      // but we could also do it here if needed
    }
  })

  // If user doesn't want to keep mock data, clean it up after the transaction
  if (!walkthroughCompleted) {
    await cleanupMockData()
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/settings")
  return { success: "Setup complete. Welcome to LodgeTrack!", redirect: "/dashboard" }
}