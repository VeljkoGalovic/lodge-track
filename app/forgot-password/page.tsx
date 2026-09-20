import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { currentLocale } from "@/lib/i18n/server"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

export const metadata = { title: "Forgot Password · LodgeTrack" }

export default async function ForgotPasswordPage() {
  const locale = await currentLocale()

  return (
    <LocaleProvider locale={locale}>
      <ForgotPasswordForm />
    </LocaleProvider>
  )
}