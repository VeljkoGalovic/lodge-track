import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { requireMembership } from "@/lib/authorization"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { TwoFactorPanel } from "@/components/settings/TwoFactorPanel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"

/** The label an authenticator app shows next to the account. */
const ISSUER = "LodgeTrack"

export default async function TwoFactorPage() {
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
        title={t.settings.twoFactor}
        description={t.settings.twoFactorDescription}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t.settings.authenticator}
          </CardTitle>
          <CardDescription>
            {user.twoFactorEnabled
              ? t.settings.factorAlreadyEnabled
              : t.settings.factorNotEnabled}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorPanel
            enabled={user.twoFactorEnabled}
            issuer={ISSUER}
            accountName={user.email}
          />
        </CardContent>
      </Card>
    </div>
  )
}
