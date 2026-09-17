import { notFound } from "next/navigation"
import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { ExpenseForm } from "@/components/expenses/ExpenseForm"
import { DeleteExpenseButton } from "@/components/expenses/DeleteExpenseButton"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, organization } = await requireMembership()
  const t = getDictionary(await currentLocale(user.locale))

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow={t.pages.eyebrows.operations} title={t.pages.expenses.editTitle} />
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

  /**
   * Scoped by `orgId` in the query itself. An id from another tenant then matches
   * nothing, so `notFound()` is the only possible outcome — there is no separate
   * ownership check to forget.
   */
  const [expense, properties] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, orgId: organization.id },
      select: {
        id: true,
        propertyId: true,
        amount: true,
        category: true,
        date: true,
        description: true,
        receiptName: true,
        receiptPath: true,
      },
    }),
    prisma.property.findMany({
      where: { orgId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  if (!expense) notFound()

  const hasReceipt = expense.receiptPath !== null

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.operations}
        title={t.pages.expenses.editTitle}
        description={expense.description}
        action={
          <>
            <Button variant="ghost" href="/dashboard/expenses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.back}
            </Button>
            <DeleteExpenseButton
              expenseId={expense.id}
              description={expense.description}
              hasReceipt={hasReceipt}
            />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.pages.expenses.costDetails}</CardTitle>
          <CardDescription>
            {t.pages.expenses.editHelp}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            properties={properties}
            currency={organization.currency}
            expense={{
              id: expense.id,
              propertyId: expense.propertyId,
              amount: expense.amount,
              category: expense.category,
              date: expense.date,
              description: expense.description,
              receiptName: expense.receiptName,
              hasReceipt,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
