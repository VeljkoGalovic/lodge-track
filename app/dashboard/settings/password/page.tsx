import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { requireMembership } from "@/lib/authorization"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { PasswordForm } from "@/components/settings/PasswordForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyRound } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"

export default async function PasswordPage() {
  const { user } = await requireMembership()
  const t = getDictionary(await currentLocale(user.locale))

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-sm text-subtle-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t.settings.title}
      </Link>

      <PageHeader
        eyebrow={t.pages.eyebrows.security}
        title={t.settings.changePassword}
        description={t.settings.changePasswordDescription}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {t.auth.passwordLabel}
          </CardTitle>
          <CardDescription>{t.settings.passwordInstructions}</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
