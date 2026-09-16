import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { requireMembership } from "@/lib/authorization"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { PasswordForm } from "@/components/settings/PasswordForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyRound } from "lucide-react"

export default async function PasswordPage() {
  await requireMembership()

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
        title="Change password"
        description="Changing it signs out every other session."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#36BFAE]" />
            Password
          </CardTitle>
          <CardDescription>Enter your current password to set a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
