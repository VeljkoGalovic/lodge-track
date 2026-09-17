import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { currentLocale } from "@/lib/i18n/server"
import { SignInForm } from "./SignInForm"

export const metadata = { title: "Sign in · LodgeTrack" }

/**
 * A server shell around the client form.
 *
 * The form itself is client-side — it calls `signIn` and holds the two-step
 * state — but the language has to be resolved on the server, because a client
 * component cannot read the cookie without rendering in English first and
 * swapping afterwards. Resolving it here and handing the locale down means the
 * first paint is already in the right language, exactly as on the dashboard.
 */
export default async function SignInPage() {
  const locale = await currentLocale()

  return (
    <LocaleProvider locale={locale}>
      <SignInForm />
    </LocaleProvider>
  )
}
