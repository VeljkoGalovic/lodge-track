import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { RegisterFormSingle } from "./RegisterFormSingle"

export const metadata = { title: "Create your account · LodgeTrack" }

/** Server shell — locale defaults to English; user selects language in the form. */
export default function RegisterPage() {
  return (
    <LocaleProvider locale="en">
      <RegisterFormSingle />
    </LocaleProvider>
  )
}