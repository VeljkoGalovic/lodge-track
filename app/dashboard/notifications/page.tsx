import Link from "next/link"
import { CalendarCheck, CalendarX, CircleDollarSign, ArrowUpRight } from "lucide-react"
import { requireMembership } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import {
  buildActivity,
  ACTIVITY_PREFERENCE,
  type ActivityKind,
} from "@/lib/activity"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { Button } from "@/components/ui/Button"

const KIND_ICONS: Record<ActivityKind, typeof CalendarCheck> = {
  CHECK_IN_DUE: CalendarCheck,
  STAY_ENDING: CalendarX,
  MISSING_RATE: CircleDollarSign,
}

const KIND_ORDER: ActivityKind[] = ["CHECK_IN_DUE", "STAY_ENDING", "MISSING_RATE"]

export default async function NotificationsPage() {
  const { user, organization } = await requireMembership()
  const locale = await currentLocale(user.locale)
  const t = getDictionary(locale)
  const labels: Record<ActivityKind, string> = {
    CHECK_IN_DUE: t.pages.notifications.checkIns,
    STAY_ENDING: t.pages.notifications.ending,
    MISSING_RATE: t.pages.notifications.missingRate,
  }
  const empty: Record<ActivityKind, string> = {
    CHECK_IN_DUE: t.pages.notifications.noArrivals,
    STAY_ENDING: t.pages.notifications.noDepartures,
    MISSING_RATE: t.pages.notifications.noMissingRates,
  }

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

  const items = buildActivity(bookings, preferences, new Date(), locale)
  const hasMutedKind = KIND_ORDER.some((kind) => !preferences[ACTIVITY_PREFERENCE[kind]])

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.account}
        title={t.pages.notifications.title}
        description={t.pages.notifications.description}
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium text-foreground">{t.pages.notifications.empty}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-subtle-foreground">
              {hasMutedKind
                ? t.pages.notifications.mutedHelp
                : t.pages.notifications.emptyHelp}
            </p>
            <Button variant="outline" size="sm" href="/dashboard/settings" className="mt-5">
              {t.pages.notifications.preferences}
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
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-subtle-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {labels[kind]}
                {group.length > 0 ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {group.length}
                  </span>
                ) : null}
              </h2>

              {!enabled ? (
                <Card>
                  <CardContent className="py-4 text-sm text-subtle-foreground">
                    <Link
                      href="/dashboard/settings"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t.pages.notifications.muted}
                    </Link>
                  </CardContent>
                </Card>
              ) : group.length === 0 ? (
                <Card>
                  <CardContent className="py-4 text-sm text-subtle-foreground">{empty[kind]}</CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {group.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">{item.title}</span>
                        <span className="block text-sm text-subtle-foreground">{item.description}</span>
                      </span>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-subtle-foreground" />
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
