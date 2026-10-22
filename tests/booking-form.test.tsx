// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { BookingForm } from "@/components/bookings/BookingForm"
import { getDictionary } from "@/lib/i18n/dictionaries"

vi.mock("@/app/actions/bookings", () => ({ createBooking: vi.fn(), updateBooking: vi.fn() }))
vi.mock("@/lib/use-action-redirect", () => ({ useActionRedirect: vi.fn() }))
vi.mock("@/components/i18n/LocaleProvider", () => ({
  useI18n: () => ({ locale: "en", t: getDictionary("en") }),
  useDictionary: () => getDictionary("en"),
  useLocale: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}))
afterEach(cleanup)
const units = Array.from({ length: 5 }, (_, i) => ({ id: `bed-${i}`, propertyId: "p1", name: `Bed ${i + 1}`, kind: "Bed" }))
const props = {
  currency: "USD",
  properties: [
    { id: "p1", name: "Motel", allowSharedBookings: true },
    { id: "p2", name: "Cabin", allowSharedBookings: false },
  ],
  units,
  busy: units.slice(0, 3).map(u => ({ propertyId: "p1", type: "WHOLE_UNIT" as const, unitId: u.id, bedIds: [], startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 5) })),
}
function dates(start = "2026-09-01", end = "2026-09-05") {
  fireEvent.change(screen.getByLabelText("Check-in"), { target: { value: start } })
  fireEvent.change(screen.getByLabelText("Check-out"), { target: { value: end } })
}
/** A shared property shows mode radios and bed checkboxes instead of the unit select. */
describe("shared booking mode", () => {
  /** The bed checkboxes exist only while the per-bed mode radio is selected. */
  function chooseBedsMode() {
    fireEvent.click(screen.getByLabelText(/Individual bed\(s\)/))
  }

  it("offers exclusive and per-bed modes and submits chosen beds", () => {
    const { container } = render(<BookingForm {...props} />)
    dates()
    expect(screen.getByText("Whole property (exclusive)")).toBeInTheDocument()
    expect(screen.getByText("Individual bed(s)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Unit")).not.toBeInTheDocument()
    // Exclusive is the default mode, and no bed checkboxes are shown yet.
    expect(new FormData(container.querySelector("form")!).get("bookingMode")).toBe("whole")

    chooseBedsMode()
    // Three of five beds taken: only the free ones are selectable, and the
    // capacity readout is the segments' accessible label, not prose.
    expect(screen.getByLabelText(/Bed 1/)).toBeDisabled()
    expect(screen.getByRole("img", { name: "3 of 5 beds occupied" })).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Bed 4/))
    fireEvent.click(screen.getByLabelText(/Bed 5/))
    expect(new FormData(container.querySelector("form")!).getAll("bedIds")).toEqual(["bed-3", "bed-4"])
    expect(new FormData(container.querySelector("form")!).get("bookingMode")).toBe("beds")

    // Back to exclusive, and the claim changes with it.
    fireEvent.click(screen.getByLabelText(/Whole property \(exclusive\)/))
    expect(new FormData(container.querySelector("form")!).get("bookingMode")).toBe("whole")
  })

  it("submits nothing until at least one bed is chosen", () => {
    render(<BookingForm {...props} />)
    dates()
    chooseBedsMode()
    expect(screen.getByRole("button", { name: "Add booking" })).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/Bed 4/))
    expect(screen.getByRole("button", { name: "Add booking" })).toBeEnabled()
  })

  it("an exclusive stay is blocked while any stay overlaps, and free afterwards", () => {
    render(<BookingForm {...props} />)
    dates()
    fireEvent.click(screen.getByLabelText(/Whole property \(exclusive\)/))
    expect(screen.getByRole("alert")).toHaveTextContent(getDictionary("en").availability.occupied)
    expect(screen.getByRole("button", { name: "Add booking" })).toBeDisabled()
    dates("2026-09-06", "2026-09-08")
    expect(screen.getByRole("button", { name: "Add booking" })).toBeEnabled()
  })

  it("a taken bed blocks submission even when others are free", () => {
    render(<BookingForm {...props} />)
    dates()
    chooseBedsMode()
    fireEvent.click(screen.getByLabelText(/Bed 4/))
    fireEvent.click(screen.getByLabelText(/Bed 1/))
    expect(screen.getByRole("alert")).toHaveTextContent(getDictionary("en").availability.occupied)
    expect(screen.getByRole("button", { name: "Add booking" })).toBeDisabled()
  })
})

/** The pre-refactor form, untouched for properties without the flag. */
describe("whole-unit booking form", () => {
  it("keeps the unit picker and never shows bed controls", () => {
    const { container } = render(<BookingForm {...props} />)
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "p2" } })
    dates()
    expect(screen.queryByText("Whole property (exclusive)")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Individual bed/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add booking" })).toBeEnabled()
    expect(new FormData(container.querySelector("form")!).get("propertyId")).toBe("p2")
  })

  it("still submits a specific free unit on a divided property", () => {
    const legacyUnits = units.map(u => ({ ...u, propertyId: "p2" }))
    const { container } = render(<BookingForm {...props} units={legacyUnits} />)
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "p2" } })
    dates("2026-09-06", "2026-09-08")
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "bed-3" } })
    expect(new FormData(container.querySelector("form")!).get("unitId")).toBe("bed-3")
  })
})
