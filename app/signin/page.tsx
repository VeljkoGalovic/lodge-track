import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { visitorLocale } from "@/lib/i18n/server"
import { SignInForm } from "./SignInForm"

export const metadata = { title: "Sign in · LodgeTrack" }

/**
 * Server shell in the visitor's language.
 *
 * The same resolver the landing page uses — an explicit cookie choice first,
 * then the visitor's country as stamped by the tunnel, then the default — so
 * someone who switched the landing page to Serbian does not get thrown back
 * into English the moment they sign in.
 */
export default async function SignInPage() {
  const locale = await visitorLocale()
  return (
    <LocaleProvider locale={locale}>
      <SignInForm />
    </LocaleProvider>
  )
}