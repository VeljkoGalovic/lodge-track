import { Metadata } from "next"
import { currentLocale } from "@/lib/i18n/server"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { NotFoundContent } from "./not-found/NotFoundContent"

export const metadata: Metadata = {
  title: "Page not found · LodgeTrack",
  description: "The page you are looking for does not exist.",
}

export default async function NotFoundPage() {
  const locale = await currentLocale()

  return (
    <LocaleProvider locale={locale}>
      <NotFoundContent />
    </LocaleProvider>
  )
}