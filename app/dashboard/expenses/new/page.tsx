import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { ExpenseForm } from "@/components/expenses/ExpenseForm"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"

export default async function NewExpensePage() {
  const { user, organization } = await requireMembership()
  const t = getDictionary(await currentLocale(user.locale))

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow={t.pages.eyebrows.operations} title={t.pages.expenses.newTitle} />
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.notPermitted}</CardTitle>
            <CardDescription>
              {t.pages.expenses.viewOnly}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" href="/dashboard/expenses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.pages.expenses.backToExpenses}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const properties = await prisma.property.findMany({
    where: { orgId: organization.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.operations}
        title={t.pages.expenses.newTitle}
        description={t.pages.expenses.newDescription}
        action={
          <Button variant="ghost" href="/dashboard/expenses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.common.back}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.pages.expenses.costDetails}</CardTitle>
          <CardDescription>
            {properties.length === 0
              ? t.pages.expenses.needsProperty
              : t.pages.expenses.costDetailsHelp}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm properties={properties} currency={organization.currency} />
        </CardContent>
      </Card>
    </div>
  )
}
