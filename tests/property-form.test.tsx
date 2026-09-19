// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { PropertyForm } from "@/components/properties/PropertyForm"
import { getDictionary } from "@/lib/i18n/dictionaries"

vi.mock("@/app/actions/properties", () => ({ createProperty: vi.fn(), updateProperty: vi.fn() }))
vi.mock("@/lib/use-action-redirect", () => ({ useActionRedirect: vi.fn() }))
vi.mock("@/components/i18n/LocaleProvider", () => ({ useI18n: () => ({ locale: "en", t: getDictionary("en") }) }))
afterEach(cleanup)

it("hides the bed count and posts no shared flag for a traditional property", () => {
  const { container } = render(<PropertyForm />)
  expect(screen.queryByLabelText("Bed count")).not.toBeInTheDocument()
  expect(new FormData(container.querySelector("form")!).get("allowSharedBookings")).toBeNull()
  expect(container.querySelector("form")!.hasAttribute("novalidate")).toBe(false)
})

it("reveals the bed count when shared bookings are ticked and posts the count", () => {
  const { container } = render(<PropertyForm />)
  fireEvent.click(screen.getByLabelText("Shared / bed-level bookings"))
  const input = screen.getByLabelText("Bed count")
  expect(input).toHaveValue(1)
  fireEvent.change(input, { target: { value: "5" } })
  const data = new FormData(container.querySelector("form")!)
  expect(data.get("bedCount")).toBe("5")
  expect(data.get("allowSharedBookings")).toBe("on")
})

it("prefills an opted-in property's existing state on edit", () => {
  const { container } = render(
    <PropertyForm property={{ id: "home", name: "Test", address: "Test street", icalUrl: null, currency: null, allowSharedBookings: true, bedCount: 7 }} />
  )
  expect(screen.getByLabelText("Bed count")).toHaveValue(7)
  expect(new FormData(container.querySelector("form")!).get("allowSharedBookings")).toBe("on")
})
