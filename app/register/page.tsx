import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { currentLocale } from "@/lib/i18n/server"
import { RegisterForm } from "./RegisterForm"

export const metadata = { title: "Create your account · LodgeTrack" }

/** Server shell, for the same reason as the sign-in page beside it: the locale
    is read from the cookie before the client form's first paint. */
export default async function RegisterPage() {
  const locale = await currentLocale()

  return (
    <LocaleProvider locale={locale}>
      <RegisterForm />
    </LocaleProvider>
  )
}
