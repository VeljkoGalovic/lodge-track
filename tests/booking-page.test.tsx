// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { getDictionary } from "@/lib/i18n/dictionaries"

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), membership: vi.fn() }))
vi.mock("@/lib/exchange-rates", () => ({ getExchangeRates: vi.fn(), convertAmount: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { booking: { findFirst: mocks.findFirst } } }))
vi.mock("@/lib/authorization", () => ({ requireMembership: mocks.membership, canManage: (role: string) => role !== "MAINTENANCE" }))
vi.mock("@/lib/i18n/server", () => ({ currentLocale: async () => "en" }))
vi.mock("@/components/i18n/LocaleProvider", () => ({ useI18n: () => ({ locale: "en", t: getDictionary("en") }) }))
vi.mock("@/app/actions/bookings", () => ({ deleteBooking: vi.fn(), setBookingStatus: vi.fn() }))
vi.mock("@/lib/use-action-redirect", () => ({ useActionRedirect: vi.fn() }))
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND") } }))
import BookingPage from "@/app/dashboard/bookings/[id]/page"

beforeEach(() => {
  mocks.membership.mockResolvedValue({ user: { role: "MANAGER", locale: "en" }, organization: { id: "org", currency: "USD" } })
})
afterEach(cleanup)

it.each([null, { name: "Bed 2" }])("renders booking details with nullable unit %j", async unit => {
  mocks.findFirst.mockResolvedValue({ id: "stay", guestName: "Test Guest", status: "PENDING", source: "Direct", totalAmount: null, unit,
    startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 5), createdAt: new Date(2026, 8, 1),
    property: { id: "home", name: "Test House", address: "Test street", currency: null } })
  render(await BookingPage({ params: Promise.resolve({ id: "stay" }) }))
  expect(screen.getByText("Test Guest")).toBeInTheDocument()
  expect(screen.getByText(getDictionary("en").pages.bookings.notRecorded)).toBeInTheDocument()
  expect(screen.getByText(`Unit: ${unit?.name ?? "Whole property"}`)).toBeInTheDocument()
  expect(screen.getByRole("combobox")).toBeInTheDocument()
  cleanup()
  mocks.membership.mockResolvedValue({ user: { role: "MAINTENANCE", locale: "en" }, organization: { id: "org", currency: "USD" } })
  render(await BookingPage({ params: Promise.resolve({ id: "stay" }) }))
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  expect(screen.getByText("Pending")).toBeInTheDocument()
})

it("returns not found for inaccessible or deleted bookings", async () => {
  mocks.findFirst.mockResolvedValue(null)
  await expect(BookingPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND")
  expect(mocks.findFirst.mock.calls.at(-1)?.[0].where).toEqual({ id: "missing", property: { orgId: "org" } })
})
