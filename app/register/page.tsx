import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { RegisterForm } from "./RegisterForm"

export const metadata = { title: "Create your account · LodgeTrack" }

/** Server shell — locale defaults to English; user selects language in Step 1. */
export default function RegisterPage() {
  return (
    <LocaleProvider locale="en">
      <RegisterForm />
    </LocaleProvider>
  )
}