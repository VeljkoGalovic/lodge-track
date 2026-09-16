import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { requireMembership } from "@/lib/authorization"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { TwoFactorPanel } from "@/components/settings/TwoFactorPanel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

/** The label an authenticator app shows next to the account. */
const ISSUER = "LodgeTrack"

export default async function TwoFactorPage() {
  const { user } = await requireMembership()

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Settings
      </Link>

      <PageHeader
        eyebrow="Security"
        title="Two-factor authentication"
        description="A one-time code from your authenticator app, on top of your password."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#36BFAE]" />
            Authenticator app
          </CardTitle>
          <CardDescription>
            {user.twoFactorEnabled
              ? "This account already requires a code at sign-in"
              : "Not enabled on this account yet"}
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
