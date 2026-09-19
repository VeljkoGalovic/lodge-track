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

it("defaults to one bed and includes the chosen count in the form", () => {
  const { container } = render(<PropertyForm />)
  const input = screen.getByLabelText("Bed count")
  expect(input).toHaveValue(1)
  fireEvent.change(input, { target: { value: "5" } })
  expect(new FormData(container.querySelector("form")!).get("bedCount")).toBe("5")
})

it("prefills the existing unit count on edit", () => {
  render(<PropertyForm property={{ id: "home", name: "Test", address: "Test street", icalUrl: null, currency: null, bedCount: 7 }} />)
  expect(screen.getByLabelText("Bed count")).toHaveValue(7)
})
