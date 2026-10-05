import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { SignInForm } from "./SignInForm"

export const metadata = { title: "Sign in · LodgeTrack" }

/** Server shell — strictly English only. */
export default function SignInPage() {
  return (
    <LocaleProvider locale="en">
      <SignInForm />
    </LocaleProvider>
  )
}