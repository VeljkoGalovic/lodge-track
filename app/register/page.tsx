import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { visitorLocale } from "@/lib/i18n/server"
import { RegisterFormSingle } from "./RegisterFormSingle"

export const metadata = { title: "Create your account · LodgeTrack" }

/**
 * Server shell in the visitor's language — same resolver as the landing page,
 * so the language someone read the marketing copy in carries into the form
 * (and the form itself lets them switch again if they want).
 */
export default async function RegisterPage() {
  const locale = await visitorLocale()
  return (
    <LocaleProvider locale={locale}>
      <RegisterFormSingle />
    </LocaleProvider>
  )
}