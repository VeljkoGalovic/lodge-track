import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { currentLocale } from "@/lib/i18n/server"
import { ResetPasswordForm } from "./ResetPasswordForm"

export const metadata = { title: "Reset Password · LodgeTrack" }

export default async function ResetPasswordPage() {
  const locale = await currentLocale()

  return (
    <LocaleProvider locale={locale}>
      <ResetPasswordForm />
    </LocaleProvider>
  )
}