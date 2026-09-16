import Link from "next/link"
import { CalendarCheck, CalendarX, CircleDollarSign, ArrowUpRight } from "lucide-react"
import { requireMembership } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import {
  buildActivity,
  ACTIVITY_LABELS,
  ACTIVITY_PREFERENCE,
  type ActivityKind,
} from "@/lib/activity"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"

const KIND_ICONS: Record<ActivityKind, typeof CalendarCheck> = {
  CHECK_IN_DUE: CalendarCheck,
  STAY_ENDING: CalendarX,
  MISSING_RATE: CircleDollarSign,
}

/** What a kind says when the preference is on but nothing matches right now. */
const KIND_EMPTY: Record<ActivityKind, string> = {
  CHECK_IN_DUE: "No arrivals in the next two days.",
  STAY_ENDING: "No stays finishing in the next two days.",
  MISSING_RATE: "Every stay from the last 30 days has a rate recorded.",
}

const KIND_ORDER: ActivityKind[] = ["CHECK_IN_DUE", "STAY_ENDING", "MISSING_RATE"]

export default async function NotificationsPage() {
  const { user, organization } = await requireMembership()

  const bookings = await prisma.booking.findMany({
    where: { property: { orgId: organization.id } },
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

  const preferences = {
    notifyCheckInsDue: user.notifyCheckInsDue,
    notifyStaysEnding: user.notifyStaysEnding,
    notifyMissingRate: user.notifyMissingRate,
  }

  const items = buildActivity(bookings, preferences, new Date())
  const hasMutedKind = KIND_ORDER.some((kind) => !preferences[ACTIVITY_PREFERENCE[kind]])

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description="Derived live from your bookings — nothing is stored or marked as read."
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium text-white">Nothing needs your attention</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
              {hasMutedKind
                ? "Some kinds are switched off in your preferences, so anything they would have shown is hidden."
                : "Check-ins due, stays ending and unrecorded rates appear here as they come up."}
            </p>
            <Button variant="outline" size="sm" href="/dashboard/settings" className="mt-5">
              Notification preferences
            </Button>
          </CardContent>
        </Card>
      ) : (
        KIND_ORDER.map((kind) => {
          const Icon = KIND_ICONS[kind]
          const enabled = preferences[ACTIVITY_PREFERENCE[kind]]
          const group = items.filter((item) => item.kind === kind)

          return (
            <section key={kind} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Icon className="h-4 w-4 text-[#36BFAE]" />
                {ACTIVITY_LABELS[kind]}
                {group.length > 0 ? (
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs tabular-nums text-slate-300">
                    {group.length}
                  </span>
                ) : null}
              </h2>

              {!enabled ? (
                <Card>
                  <CardContent className="py-4 text-sm text-slate-500">
                    Switched off in your{" "}
                    <Link
                      href="/dashboard/settings"
                      className="text-[#36BFAE] underline-offset-4 hover:underline"
                    >
                      notification preferences
                    </Link>
                    .
                  </CardContent>
                </Card>
              ) : group.length === 0 ? (
                <Card>
                  <CardContent className="py-4 text-sm text-slate-500">{KIND_EMPTY[kind]}</CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {group.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-white">{item.title}</span>
                        <span className="block text-sm text-slate-400">{item.description}</span>
                      </span>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
