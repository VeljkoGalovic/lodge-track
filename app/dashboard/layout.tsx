import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { buildActivity } from "@/lib/activity"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/signin")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: {
        include: {
          subscription: true,
        }
      }
    }
  })

  // `User.orgId` is required and cascades, so a user without an organization
  // should be impossible. Onboarding is the recovery path if that ever stops
  // being true, rather than a redirect to registration that would strand an
  // already-authenticated account.
  if (!user?.organization) {
    redirect("/onboarding")
  }

  const org = user.organization
  const subscription = org.subscription

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  // The bell's count obeys the same preferences as the feed itself, so the two
  // can never disagree about how much is waiting.
  const preferences = {
    notifyCheckInsDue: user.notifyCheckInsDue,
    notifyStaysEnding: user.notifyStaysEnding,
    notifyMissingRate: user.notifyMissingRate,
  }

  const bookings = await prisma.booking.findMany({
    where: { property: { orgId: org.id } },
    select: {
      id: true,
      guestName: true,
      startDate: true,
      endDate: true,
      status: true,
      totalAmount: true,
      property: { select: { id: true, name: true } },
    },
  })

  const attentionCount = buildActivity(bookings, preferences, new Date()).length

  return (
    <DashboardShell
      orgName={org.name}
      features={features}
      userName={user.name || undefined}
      userEmail={user.email}
      attentionCount={attentionCount}
    >
      {children}
    </DashboardShell>
  )
}