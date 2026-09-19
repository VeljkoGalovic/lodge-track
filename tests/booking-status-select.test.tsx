// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { BookingStatusSelect } from "@/components/bookings/BookingStatusSelect"

const mocks = vi.hoisted(() => ({ setStatus: vi.fn() }))
vi.mock("@/app/actions/bookings", () => ({ setBookingStatus: mocks.setStatus }))
vi.mock("@/components/i18n/LocaleProvider", () => ({ useI18n: () => ({ locale: "en", t: getDictionary("en") }) }))
afterEach(cleanup)
beforeEach(() => { mocks.setStatus.mockReset() })

it("offers five statuses and submits the booking identity immediately", async () => {
  mocks.setStatus.mockResolvedValue({ success: "Status updated." })
  render(<BookingStatusSelect bookingId="stay" status="PENDING" guestName="Test Guest" />)
  expect(screen.getAllByRole("option")).toHaveLength(5)
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "CONFIRMED" } })
  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("CONFIRMED"))
  const data = mocks.setStatus.mock.calls[0][1] as FormData
  expect(data.get("id")).toBe("stay")
  expect(data.get("status")).toBe("CONFIRMED")
})

it("keeps the saved status and shows the server error on failure", async () => {
  mocks.setStatus.mockResolvedValue({ error: "That slot has since been taken." })
  render(<BookingStatusSelect bookingId="stay" status="CANCELLED" guestName="Test Guest" />)
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "CONFIRMED" } })
  expect(await screen.findByText("That slot has since been taken.")).toBeInTheDocument()
  expect(screen.getByRole("combobox")).toHaveValue("CANCELLED")
})

it("disables changes while saving", async () => {
  mocks.setStatus.mockReturnValue(new Promise(() => {}))
  render(<BookingStatusSelect bookingId="stay" status="PENDING" guestName="Test Guest" />)
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "CANCELLED" } })
  expect(screen.getByRole("combobox")).toBeDisabled()
})
