import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DeleteExpenseButton } from "@/components/expenses/DeleteExpenseButton"
import { EXPENSE_CATEGORY_STYLES } from "@/lib/expense-category"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { Paperclip, Plus, Receipt } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { EXPENSE_COUNT_FORMS, format, getDictionary, plural } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/locales"

/** A `Date` as a plain day, in local time — the same clock `dateField` writes on. */
function formatDay(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "sr" ? "sr-Latn-RS" : "en-US", { day: "numeric", month: "short", year: "numeric" })
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>
}) {
  const { user, organization } = await requireMembership()
  const locale = await currentLocale(user.locale)
  const t = getDictionary(locale)
  const params = await searchParams

  /**
   * The property list is fetched first and the filter is then only honoured if it
   * names one of those properties — so `?propertyId=` pointing at another tenant's
   * property narrows to nothing instead of being trusted. The `orgId` term below
   * is what actually scopes the data; this is a guard on the link, not the gate.
   */
  const properties = await prisma.property.findMany({
    where: { orgId: organization.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const selectedProperty = properties.find((property) => property.id === params.propertyId)
  const selectedPropertyId = selectedProperty?.id

  const expenses = await prisma.expense.findMany({
    where: {
      orgId: organization.id,
      ...(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
    },
    orderBy: { date: "desc" },
    include: { property: { select: { id: true, name: true, currency: true } } },
  })

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Costs dated inside the current calendar month, so the headline figure is the
  // month the person is actually in rather than "everything, ever".
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const thisMonth = expenses
    .filter((expense) => expense.date >= monthStart && expense.date < nextMonthStart)
    .reduce((sum, expense) => sum + expense.amount, 0)

  const receiptCount = expenses.filter((expense) => expense.receiptPath !== null).length
  const canEdit = canManage(user.role)

  function filterHref(propertyId?: string): string {
    return propertyId
      ? `/dashboard/expenses?propertyId=${propertyId}`
      : "/dashboard/expenses"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.operations}
        title={t.pages.expenses.title}
        description={t.pages.expenses.description}
        action={
          canEdit ? (
            <Button variant="outline" href="/dashboard/expenses/new">
              <Plus className="mr-2 h-4 w-4" />
              {t.pages.expenses.logExpense}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: selectedPropertyId ? t.pages.expenses.totalForThisProperty : t.pages.expenses.totalLogged,
            value: formatCurrency(total, organization.currency),
          },
          { label: t.pages.expenses.thisMonth, value: formatCurrency(thisMonth, organization.currency) },
          {
            label: t.pages.expenses.withAReceipt,
            value: `${receiptCount} / ${expenses.length}`,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-subtle-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                {t.pages.expenses.loggedCosts}
              </CardTitle>
              <CardDescription>
                {expenses.length === 0
                  ? t.pages.expenses.nothingLoggedYet
                  : format(
                      selectedProperty ? t.pages.expenses.loggedForProperty : t.pages.expenses.loggedAcrossProperties,
                      {
                        expenses: plural(expenses.length, EXPENSE_COUNT_FORMS[locale], locale),
                        property: selectedProperty?.name ?? "",
                      }
                    )}
              </CardDescription>
            </div>

            {properties.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={selectedPropertyId ? "ghost" : "outline"}
                  size="sm"
                  href={filterHref()}
                >
                  {t.pages.expenses.allProperties}
                </Button>
                {properties.map((property) => (
                  <Button
                    key={property.id}
                    variant={selectedPropertyId === property.id ? "outline" : "ghost"}
                    size="sm"
                    href={filterHref(property.id)}
                  >
                    {property.name}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          {expenses.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-foreground">{t.pages.expenses.noExpensesLogged}</h3>
              <p className="mt-2 text-sm text-subtle-foreground">
                {t.pages.expenses.noExpensesHelp}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.pages.expenses.date}</TableHead>
                  <TableHead>{t.pages.expenses.property}</TableHead>
                  <TableHead>{t.pages.expenses.category}</TableHead>
                  <TableHead>{t.pages.expenses.descriptionLabel}</TableHead>
                  <TableHead>{t.pages.expenses.receipt}</TableHead>
                  <TableHead className="text-right">{t.pages.expenses.amount}</TableHead>
                  {canEdit ? <TableHead className="text-right">{t.pages.expenses.actions}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap text-sm text-subtle-foreground">
                      {formatDay(expense.date, locale)}
                    </TableCell>
                    <TableCell>{expense.property.name}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          EXPENSE_CATEGORY_STYLES[expense.category].badge
                        )}
                      >
                        {t.pages.expenses.categories[expense.category]}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[22rem] truncate text-muted-foreground">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      {expense.receiptPath ? (
                        <a
                          href={`/api/receipts/${expense.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[12rem] items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{expense.receiptName ?? t.common.view}</span>
                        </a>
                      ) : (
                        <span className="text-sm text-subtle-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium text-foreground">
                      {formatCurrency(expense.amount, expense.property.currency || organization.currency)}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            href={`/dashboard/expenses/${expense.id}/edit`}
                          >
                            {t.common.edit}
                          </Button>
                          <DeleteExpenseButton
                            expenseId={expense.id}
                            description={expense.description}
                            hasReceipt={expense.receiptPath !== null}
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
