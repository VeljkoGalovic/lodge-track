"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import {
  currentMembership,
  canAdminister,
  type ActionState,
} from "@/lib/authorization"

/**
 * Marker used to identify mock data created during onboarding walkthrough.
 * This allows selective cleanup without affecting real user data.
 */
const MOCK_DATA_MARKER = "[ONBOARDING_WALKTHROUGH]"

/**
 * Generates realistic sample data for the onboarding walkthrough.
 * Creates properties, units, bookings, and expenses that demonstrate
 * the app's key features with varied, realistic data.
 */
export async function generateMockData(): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canAdminister(membership.user.role)) {
    return { error: "Only an owner can generate onboarding sample data." }
  }

  const orgId = membership.organization.id
  const orgCurrency = membership.organization.currency
  const orgTimeZone = membership.organization.timeZone

  try {
    await prisma.$transaction(async (tx) => {
      // Create 3 properties of different types
      const property1 = await tx.property.create({
        data: {
          name: "Sunset Apartment",
          address: "123 Ocean Drive, Miami, FL 33139",
          currency: orgCurrency,
          orgId,
        },
      })

      const property2 = await tx.property.create({
        data: {
          name: "Mountain Cabin Retreat",
          address: "456 Pine Ridge Road, Aspen, CO 81611",
          currency: orgCurrency,
          orgId,
        },
      })

      const property3 = await tx.property.create({
        data: {
          name: "Downtown Business Hotel",
          address: "789 Commerce Street, Chicago, IL 60601",
          currency: orgCurrency,
          orgId,
        },
      })

      // Create units for each property
      const [unit1a, unit1b] = await Promise.all([
        tx.propertyUnit.create({
          data: {
            name: "Master Suite",
            kind: "Room",
            propertyId: property1.id,
            orgId,
          },
        }),
        tx.propertyUnit.create({
          data: {
            name: "Guest Room",
            kind: "Room",
            propertyId: property1.id,
            orgId,
          },
        }),
      ])

      const [unit2a] = await Promise.all([
        tx.propertyUnit.create({
          data: {
            name: "Main Cabin",
            kind: "Cabin",
            propertyId: property2.id,
            orgId,
          },
        }),
      ])

      const [unit3a, unit3b, unit3c] = await Promise.all([
        tx.propertyUnit.create({
          data: {
            name: "Deluxe King Room",
            kind: "Room",
            propertyId: property3.id,
            orgId,
          },
        }),
        tx.propertyUnit.create({
          data: {
            name: "Executive Suite",
            kind: "Suite",
            propertyId: property3.id,
            orgId,
          },
        }),
        tx.propertyUnit.create({
          data: {
            name: "Standard Double",
            kind: "Room",
            propertyId: property3.id,
            orgId,
          },
        }),
      ])

      // Create bookings - mix of past, current, and future
      const now = new Date()
      const bookingsData = [
        // Past bookings
        {
          propertyId: property1.id,
          unitId: unit1a.id,
          guestName: "Sarah Johnson",
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000),
          status: "CHECKED_OUT" as const,
          totalAmount: 85000, // $850.00
          source: "Airbnb",
        },
        {
          propertyId: property1.id,
          unitId: unit1b.id,
          guestName: "Michael Chen",
          startDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000),
          status: "CHECKED_OUT" as const,
          totalAmount: 42000, // $420.00
          source: "Booking.com",
        },
        {
          propertyId: property2.id,
          unitId: unit2a.id,
          guestName: "Emma Wilson",
          startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000),
          status: "CHECKED_OUT" as const,
          totalAmount: 120000, // $1,200.00
          source: "Direct",
        },
        // Current/Active bookings
        {
          propertyId: property1.id,
          unitId: unit1a.id,
          guestName: "David Martinez",
          startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          status: "CHECKED_IN" as const,
          totalAmount: 127500, // $1,275.00
          source: "Direct",
        },
        {
          propertyId: property3.id,
          unitId: unit3a.id,
          guestName: "Lisa Anderson",
          startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
          status: "CHECKED_IN" as const,
          totalAmount: 150000, // $1,500.00
          source: "Expedia",
        },
        // Future bookings
        {
          propertyId: property1.id,
          unitId: unit1b.id,
          guestName: "James Taylor",
          startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          status: "CONFIRMED" as const,
          totalAmount: 63000, // $630.00
          source: "Direct",
        },
        {
          propertyId: property2.id,
          unitId: unit2a.id,
          guestName: "Olivia Brown",
          startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
          status: "CONFIRMED" as const,
          totalAmount: 168000, // $1,680.00
          source: "VRBO",
        },
        {
          propertyId: property3.id,
          unitId: unit3b.id,
          guestName: "Robert Garcia",
          startDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
          status: "PENDING" as const,
          totalAmount: 200000, // $2,000.00
          source: "Direct",
        },
        {
          propertyId: property3.id,
          unitId: unit3c.id,
          guestName: "Jennifer Lee",
          startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000),
          status: "PENDING" as const,
          totalAmount: 150000, // $1,500.00
          source: "Booking.com",
        },
        {
          propertyId: property3.id,
          unitId: unit3a.id,
          guestName: "William Davis",
          startDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 48 * 24 * 60 * 60 * 1000),
          status: "PENDING" as const,
          totalAmount: 150000, // $1,500.00
          source: "Direct",
        },
      ]

      for (const booking of bookingsData) {
        await tx.booking.create({
          data: {
            ...booking,
            externalUid: `${MOCK_DATA_MARKER}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          },
        })
      }

      // Create expenses across different categories
      const expensesData = [
        {
          propertyId: property1.id,
          amount: 25000, // $250.00
          category: "MAINTENANCE" as const,
          date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          description: "AC unit repair and filter replacement",
          receiptPath: null,
        },
        {
          propertyId: property1.id,
          amount: 12000, // $120.00
          category: "UTILITIES" as const,
          date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          description: "Electricity bill - August",
          receiptPath: null,
        },
        {
          propertyId: property1.id,
          amount: 8500, // $85.00
          category: "CLEANING" as const,
          date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          description: "Deep cleaning between guests",
          receiptPath: null,
        },
        {
          propertyId: property2.id,
          amount: 45000, // $450.00
          category: "MAINTENANCE" as const,
          date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          description: "Roof inspection and gutter cleaning",
          receiptPath: null,
        },
        {
          propertyId: property2.id,
          amount: 32000, // $320.00
          category: "UTILITIES" as const,
          date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
          description: "Propane tank refill",
          receiptPath: null,
        },
        {
          propertyId: property3.id,
          amount: 180000, // $1,800.00
          category: "MAINTENANCE" as const,
          date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
          description: "Elevator annual service contract",
          receiptPath: null,
        },
        {
          propertyId: property3.id,
          amount: 95000, // $950.00
          category: "SUPPLIES" as const,
          date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
          description: "Linens, towels, and toiletries restock",
          receiptPath: null,
        },
        {
          propertyId: property3.id,
          amount: 45000, // $450.00
          category: "CLEANING" as const,
          date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          description: "Commercial cleaning service - monthly",
          receiptPath: null,
        },
      ]

      for (const expense of expensesData) {
        await tx.expense.create({
          data: {
            ...expense,
            orgId,
            description: `${MOCK_DATA_MARKER} ${expense.description}`,
          },
        })
      }
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/properties")
    revalidatePath("/dashboard/bookings")
    revalidatePath("/dashboard/calendar")
    revalidatePath("/dashboard/expenses")

    return {
      success: "Sample data created successfully! You now have 3 properties, 6 units, 9 bookings, and 8 expenses to explore.",
      redirect: "/dashboard",
    }
  } catch (error) {
    console.error("Error generating mock data:", error)
    return { error: "Failed to generate sample data. Please try again." }
  }
}

/**
 * Cleans up all mock data created during the onboarding walkthrough.
 * Only removes data marked with the onboarding walkthrough marker.
 */
export async function cleanupMockData(): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canAdminister(membership.user.role)) {
    return { error: "Only an owner can clean up onboarding sample data." }
  }

  const orgId = membership.organization.id

  try {
    await prisma.$transaction(async (tx) => {
      // Delete bookings with the mock marker
      await tx.booking.deleteMany({
        where: {
          property: { orgId },
          externalUid: { startsWith: MOCK_DATA_MARKER },
        },
      })

      // Delete expenses with the mock marker
      await tx.expense.deleteMany({
        where: {
          orgId,
          description: { startsWith: MOCK_DATA_MARKER },
        },
      })

      // Delete units belonging to mock properties
      // First find properties created during onboarding (they don't have the marker directly)
      // We'll identify them by checking if all their bookings are mock bookings
      // For simplicity, we delete properties that have no non-mock bookings/expenses
      const mockPropertyIds = await tx.property.findMany({
        where: {
          orgId,
          bookings: {
            some: { externalUid: { startsWith: MOCK_DATA_MARKER } },
          },
          // Ensure property ONLY has mock bookings (no real bookings)
          NOT: {
            bookings: {
              some: { externalUid: { not: { startsWith: MOCK_DATA_MARKER } } },
            },
          },
        },
        select: { id: true },
      })

      const propertyIds = mockPropertyIds.map((p) => p.id)

      if (propertyIds.length > 0) {
        // Delete units first (foreign key constraint)
        await tx.propertyUnit.deleteMany({
          where: { propertyId: { in: propertyIds } },
        })

        // Then delete properties
        await tx.property.deleteMany({
          where: { id: { in: propertyIds } },
        })
      }
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/properties")
    revalidatePath("/dashboard/bookings")
    revalidatePath("/dashboard/calendar")
    revalidatePath("/dashboard/expenses")

    return { success: "Sample data removed. You're starting fresh!" }
  } catch (error) {
    console.error("Error cleaning up mock data:", error)
    return { error: "Failed to clean up sample data. Please try again." }
  }
}

/**
 * Marks the onboarding walkthrough as completed for the organization.
 * This prevents the walkthrough from showing again.
 */
export async function completeOnboardingWalkthrough(): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canAdminister(membership.user.role)) {
    return { error: "Only an owner can complete the onboarding walkthrough." }
  }

  const orgId = membership.organization.id

  try {
    // Note: We're using the existing onboardingCompleted field for now.
    // A dedicated onboardingWalkthroughCompleted field could be added to the schema.
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        onboardingCompleted: true,
      },
    })

    revalidatePath("/dashboard")
    return { success: "Onboarding walkthrough completed." }
  } catch (error) {
    console.error("Error completing onboarding walkthrough:", error)
    return { error: "Failed to complete walkthrough. Please try again." }
  }
}