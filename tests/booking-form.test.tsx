// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { BookingForm } from "@/components/bookings/BookingForm"
import { getDictionary } from "@/lib/i18n/dictionaries"

vi.mock("@/app/actions/bookings", () => ({ createBooking: vi.fn(), updateBooking: vi.fn() }))
vi.mock("@/lib/use-action-redirect", () => ({ useActionRedirect: vi.fn() }))
vi.mock("@/components/i18n/LocaleProvider", () => ({ useI18n: () => ({ locale: "en", t: getDictionary("en") }) }))
afterEach(cleanup)
const units = Array.from({ length: 5 }, (_, i) => ({ id: `bed-${i}`, propertyId: "p1", name: `Bed ${i + 1}`, kind: "Bed" }))
const props = {
  currency: "USD", properties: [{ id: "p1", name: "Motel" }, { id: "p2", name: "Cabin" }], units,
  busy: units.slice(0, 3).map(u => ({ propertyId: "p1", unitId: u.id, startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 5) })),
}
function dates(start = "2026-09-01", end = "2026-09-05") {
  fireEvent.change(screen.getByLabelText("Check-in"), { target: { value: start } })
  fireEvent.change(screen.getByLabelText("Check-out"), { target: { value: end } })
}
describe("booking unit picker", () => {
  it("shows two free beds and submits the specific free bed identity", () => {
    const { container } = render(<BookingForm {...props} />)
    dates()
    expect(screen.getByText("2 of 5 units free")).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Whole property" })).toBeDisabled()
    expect(screen.getByRole("option", { name: /Bed 1 — Bed/ })).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "bed-3" } })
    expect(screen.getByRole("button", { name: "Add booking" })).toBeEnabled()
    expect(new FormData(container.querySelector("form")!).get("unitId")).toBe("bed-3")
  })
  it("does not carry a bed selection to another property", () => {
    render(<BookingForm {...props} />)
    dates()
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "bed-3" } })
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "p2" } })
    expect(screen.queryByLabelText("Unit")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add booking" })).toBeEnabled()
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "p1" } })
    expect(screen.getByLabelText("Unit")).toHaveValue("")
  })
  it("blocks a previously selected bed when new dates make it occupied", () => {
    render(<BookingForm {...props} />)
    dates("2026-09-06", "2026-09-08")
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "bed-0" } })
    dates()
    expect(screen.getByRole("alert")).toHaveTextContent(getDictionary("en").availability.occupied)
    expect(screen.getByRole("alert")).toHaveClass("rounded-full", "border", "px-4", "py-2", "items-center", "justify-center")
    expect(screen.getByRole("button", { name: "Add booking" })).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "CANCELLED" } })
    expect(screen.getByRole("button", { name: "Add booking" })).toBeEnabled()
  })
  it("requires strictly positive dates", () => {
    render(<BookingForm {...props} />)
    dates("2026-09-06", "2026-09-06")
    expect(screen.getByRole("button", { name: "Add booking" })).toBeDisabled()
  })
})
