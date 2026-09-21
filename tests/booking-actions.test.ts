import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    property: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    propertyUnit: { findFirst: vi.fn(), findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
    booking: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock("server-only", () => ({}))
vi.mock("@/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
import { createBooking, updateBooking, deleteBooking, setBookingStatus } from "@/app/actions/bookings"
import { createProperty, updateProperty, deleteProperty } from "@/app/actions/properties"
import { deleteUnit } from "@/app/actions/units"
import { serializable } from "@/lib/transaction"

const db = mocks.db
const stay = { id: "stay", propertyId: "home", type: "SHARED_BED", unitId: "bed-1", bedIds: ["bed-1"], guestName: "Test guest", startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 5), status: "CONFIRMED", unit: { name: "Bed 1" } }
function form(extra: Record<string, string> = {}) {
  const result = new FormData()
  for (const [key, value] of Object.entries({ id: "stay", propertyId: "home", unitId: "bed-1", guestName: "Test guest", startDate: "2026-09-01", endDate: "2026-09-05", status: "CONFIRMED", totalAmount: "1.005", orgId: "forged-org", ...extra })) result.set(key, value)
  return result
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ user: { email: "local@example.test" } })
  db.user.findUnique.mockResolvedValue({ id: "member", role: "MANAGER", organization: { id: "org-a", currency: "USD", subscription: null } })
  db.$transaction.mockImplementation(work => work(db))
  db.property.findFirst.mockResolvedValue({ id: "home", allowSharedBookings: true })
  db.propertyUnit.findFirst.mockResolvedValue({ id: "bed-1", propertyId: "home", name: "Bed 1" })
  db.propertyUnit.count.mockResolvedValue(5)
  db.booking.findFirst.mockResolvedValue(stay)
  db.booking.findMany.mockResolvedValue([])
  db.booking.create.mockResolvedValue({ id: "new-stay" })
  db.booking.updateMany.mockResolvedValue({ count: 1 })
  db.booking.deleteMany.mockResolvedValue({ count: 0 })
  db.booking.count.mockResolvedValue(0)
  db.propertyUnit.deleteMany.mockResolvedValue({ count: 1 })
  db.property.count.mockResolvedValue(0)
  db.property.create.mockResolvedValue({ id: "new-home" })
  db.property.updateMany.mockResolvedValue({ count: 1 })
  db.propertyUnit.findMany.mockResolvedValue([])
  db.propertyUnit.createMany.mockResolvedValue({ count: 0 })
})

describe("booking authorization and atomic action boundaries", () => {
  it.each([createBooking, updateBooking, deleteBooking, setBookingStatus, deleteUnit, createProperty, updateProperty, deleteProperty])("denies missing sessions before persistence", async action => {
    mocks.auth.mockResolvedValue(null)
    expect((await action({}, form())).error).toBeTruthy()
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(db.booking.deleteMany).not.toHaveBeenCalled()
  })
  it.each([createBooking, updateBooking, deleteBooking, setBookingStatus, deleteUnit, createProperty, updateProperty, deleteProperty])("denies read-only members before writes", async action => {
    db.user.findUnique.mockResolvedValue({ role: "MAINTENANCE", organization: { id: "org-a" } })
    expect((await action({}, form())).error).toMatch(/permission/)
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(db.booking.deleteMany).not.toHaveBeenCalled()
  })
  it("uses membership tenant, not submitted orgId, for property/unit validation", async () => {
    expect((await createBooking({}, form())).success).toBeTruthy()
    expect(db.property.findFirst).toHaveBeenCalledWith({ where: { id: "home", orgId: "org-a" }, select: { id: true, allowSharedBookings: true } })
    expect(db.propertyUnit.findFirst).toHaveBeenCalledWith({ where: { id: "bed-1", propertyId: "home", orgId: "org-a" }, select: { id: true } })
    expect(db.booking.findMany.mock.calls[0][0].where.property).toEqual({ orgId: "org-a" })
    expect(db.booking.create.mock.calls[0][0].data).toMatchObject({ unitId: "bed-1", totalAmount: 101 })
    expect(db.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: "Serializable" })
  })
  it("rejects an inaccessible property without reading its bookings", async () => {
    db.property.findFirst.mockResolvedValue(null)
    expect((await createBooking({}, form({ propertyId: "other-tenant" }))).error).toBeTruthy()
    expect(db.booking.findMany).not.toHaveBeenCalled()
    expect(db.booking.create).not.toHaveBeenCalled()
  })
  it("rejects a unit from another tenant or property", async () => {
    db.propertyUnit.findFirst.mockResolvedValue(null)
    expect((await createBooking({}, form({ unitId: "other-bed" }))).error).toBeTruthy()
    expect(db.booking.create).not.toHaveBeenCalled()
  })
  it.each([updateBooking, setBookingStatus])("does not update an inaccessible booking", async action => {
    db.booking.findFirst.mockResolvedValue(null)
    expect((await action({}, form())).error).toBeTruthy()
    expect(db.booking.findFirst.mock.calls[0][0].where).toEqual({ id: "stay", property: { orgId: "org-a" } })
    expect(db.booking.updateMany).not.toHaveBeenCalled()
  })
  it("scopes deletion even when the submitted ID is inaccessible", async () => {
    db.booking.findFirst.mockResolvedValue(null)
    expect((await deleteBooking({}, form())).error).toBeTruthy()
    expect(db.booking.deleteMany).toHaveBeenCalledWith({ where: { id: "stay", property: { orgId: "org-a" } } })
  })
  it.each(["bed-1", ""])("refuses occupied unit/whole-property writes (%s)", async unitId => {
    db.booking.findMany.mockResolvedValue([stay])
    expect((await createBooking({}, form({ unitId }))).error).toMatch(/not free/)
    expect(db.booking.create).not.toHaveBeenCalled()
  })
  it("creates a whole-unit booking with empty bedIds when no mode is posted", async () => {
    expect((await createBooking({}, form())).success).toBeTruthy()
    expect(db.booking.create.mock.calls[0][0].data).toMatchObject({ type: "WHOLE_UNIT", unitId: "bed-1", bedIds: [] })
  })
  it("allows a different bed while the first three of five are occupied", async () => {
    db.propertyUnit.findFirst.mockResolvedValue({ id: "bed-4" })
    db.booking.findMany.mockResolvedValue([1, 2, 3].map(i => ({ ...stay, id: `stay-${i}`, unitId: `bed-${i}` })))
    expect((await createBooking({}, form({ unitId: "bed-4" }))).success).toBeTruthy()
    expect(db.booking.create.mock.calls[0][0].data.unitId).toBe("bed-4")
  })
  it("books several free beds in one shared transaction", async () => {
    db.propertyUnit.findMany.mockResolvedValue([{ id: "bed-1" }, { id: "bed-2" }])
    const data = new FormData()
    for (const [key, value] of Object.entries({ propertyId: "home", guestName: "Test guest", startDate: "2026-09-01", endDate: "2026-09-05", status: "CONFIRMED", bookingMode: "beds" })) data.set(key, value)
    data.append("bedIds", "bed-1")
    data.append("bedIds", "bed-2")
    expect((await createBooking({}, data)).success).toBeTruthy()
    expect(db.booking.create.mock.calls.at(-1)?.[0].data).toMatchObject({
      type: "SHARED_BED",
      bedIds: ["bed-1", "bed-2"],
    })
  })
  it("refuses shared-bed mode when the property has not opted in", async () => {
    db.property.findFirst.mockResolvedValue({ id: "home", allowSharedBookings: false })
    const data = new FormData()
    for (const [key, value] of Object.entries({ propertyId: "home", guestName: "Test guest", startDate: "2026-09-01", endDate: "2026-09-05", status: "CONFIRMED", bookingMode: "beds" })) data.set(key, value)
    data.append("bedIds", "bed-1")
    expect((await createBooking({}, data)).error).toMatch(/does not accept individual bed/)
    expect(db.booking.create).not.toHaveBeenCalled()
  })
  it("rejects a shared stay claiming a bed from another property", async () => {
    db.propertyUnit.findMany.mockResolvedValue([{ id: "bed-1" }])
    const data = new FormData()
    for (const [key, value] of Object.entries({ propertyId: "home", guestName: "Test guest", startDate: "2026-09-01", endDate: "2026-09-05", status: "CONFIRMED", bookingMode: "beds" })) data.set(key, value)
    data.append("bedIds", "bed-1")
    data.append("bedIds", "foreign-bed")
    expect((await createBooking({}, data)).error).toMatch(/belong to this property/)
    expect(db.booking.create).not.toHaveBeenCalled()
  })
  it("refuses a shared stay when every chosen bed is already held", async () => {
    db.propertyUnit.findMany.mockResolvedValue([{ id: "bed-1" }])
    db.booking.findMany.mockResolvedValue([{ ...stay, type: "SHARED_BED", bedIds: ["bed-1"], unitId: "bed-1" }])
    const data = new FormData()
    for (const [key, value] of Object.entries({ propertyId: "home", guestName: "Test guest", startDate: "2026-09-01", endDate: "2026-09-05", status: "CONFIRMED", bookingMode: "beds" })) data.set(key, value)
    data.append("bedIds", "bed-1")
    expect((await createBooking({}, data)).error).toMatch(/not free/)
    expect(db.booking.create).not.toHaveBeenCalled()
  })
  it("stores the first chosen bed as unitId for shared stays", async () => {
    db.propertyUnit.findMany.mockResolvedValue([{ id: "bed-7" }, { id: "bed-3" }])
    const data = new FormData()
    for (const [key, value] of Object.entries({ propertyId: "home", guestName: "Test guest", startDate: "2026-09-01", endDate: "2026-09-05", status: "CONFIRMED", bookingMode: "beds" })) data.set(key, value)
    data.append("bedIds", "bed-7")
    data.append("bedIds", "bed-3")
    expect((await createBooking({}, data)).success).toBeTruthy()
    expect(db.booking.create.mock.calls.at(-1)?.[0].data).toMatchObject({
      type: "SHARED_BED",
      unitId: "bed-7",
      bedIds: ["bed-7", "bed-3"],
    })
  })
  it("a cancelled create does not claim capacity", async () => {
    expect((await createBooking({}, form({ status: "CANCELLED" }))).success).toBeTruthy()
    expect(db.booking.findMany).not.toHaveBeenCalled()
  })
  it("excludes the edited row but scopes the update to the tenant", async () => {
    db.booking.findMany.mockResolvedValue([stay])
    expect((await updateBooking({}, form())).success).toBeTruthy()
    expect(db.booking.findMany.mock.calls[0][0].where.id).toEqual({ not: "stay" })
    expect(db.booking.updateMany.mock.calls[0][0].where).toEqual({ id: "stay", property: { orgId: "org-a" } })
  })
  it("refuses reactivation if another booking has taken the bed", async () => {
    db.booking.findMany.mockResolvedValue([{ ...stay, id: "replacement" }])
    expect((await setBookingStatus({}, form())).error).toMatch(/taken/)
    expect(db.booking.updateMany).not.toHaveBeenCalled()
  })
  it.each(["2026-09-01", "2026-08-30", "2026-02-31"])("rejects invalid or nonpositive stays (%s)", async endDate => {
    expect((await createBooking({}, form({ endDate }))).error).toBeTruthy()
    expect(db.$transaction).not.toHaveBeenCalled()
  })
  it("does not delete a bed referenced by active bookings", async () => {
    db.booking.count.mockResolvedValue(1)
    expect((await deleteUnit({}, form({ id: "bed-1" }))).error).toMatch(/active booking/)
    expect(db.propertyUnit.deleteMany).not.toHaveBeenCalled()
    expect(db.booking.count.mock.calls[0][0].where.property).toEqual({ orgId: "org-a" })
  })
  it("deletes an unused bed only in the member's organization", async () => {
    expect((await deleteUnit({}, form({ id: "bed-1" }))).success).toBeTruthy()
    expect(db.propertyUnit.deleteMany).toHaveBeenCalledWith({ where: { id: "bed-1", orgId: "org-a" } })
  })
})

describe("property bed count", () => {
  function propertyForm(extra: Record<string, string> = {}) {
    return form({ id: "home", name: "Motel", address: "12 Lake Road", allowSharedBookings: "on", bedCount: "4", ...extra })
  }

  it("creates the property and its beds in one transaction", async () => {
    const result = await createProperty({}, propertyForm({ bedCount: "3" }))
    expect(result.success).toBeTruthy()
    expect(result.redirect).toBe("/dashboard/properties/new-home")
    // `createProperty` wraps the write in `prisma.$transaction(work)`, and the
    // mock passes `db` itself as `tx`, so the work's calls land on the same
    // recorded mocks — one transaction, property and beds together.
    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(db.property.create.mock.calls[0][0].data).toMatchObject({ orgId: "org-a", name: "Motel", allowSharedBookings: true })
    expect(db.propertyUnit.createMany).toHaveBeenCalledWith({
      data: [
        { name: "Bed 1", kind: "Bed", propertyId: "new-home", orgId: "org-a" },
        { name: "Bed 2", kind: "Bed", propertyId: "new-home", orgId: "org-a" },
        { name: "Bed 3", kind: "Bed", propertyId: "new-home", orgId: "org-a" },
      ],
    })
  })
  it("a traditional property without the toggle creates no beds", async () => {
    await createProperty({}, propertyForm({ allowSharedBookings: "", bedCount: "3" }))
    expect(db.property.create.mock.calls.at(-1)?.[0].data).toMatchObject({ allowSharedBookings: false })
    expect(db.propertyUnit.createMany).not.toHaveBeenCalled()
  })
  it("creates one bookable bed when the count is one", async () => {
    await createProperty({}, propertyForm({ bedCount: "1" }))
    expect(db.property.create).toHaveBeenCalledOnce()
    expect(db.propertyUnit.createMany).toHaveBeenCalledWith({ data: [
      { name: "Bed 1", kind: "Bed", propertyId: "new-home", orgId: "org-a" },
    ] })
  })
  it("rejects zero, fractional, and oversized counts before any write", async () => {
    for (const bad of ["0", "-2", "2.5", "201", "abc"]) {
      expect((await createProperty({}, propertyForm({ bedCount: bad }))).error).toMatch(/Bed count/)
      expect((await updateProperty({}, propertyForm({ bedCount: bad }))).error).toMatch(/Bed count/)
    }
    expect(db.property.create).not.toHaveBeenCalled()
    expect(db.$transaction).not.toHaveBeenCalled()
  })
  it("edit creates only the beds missing to reach the new count", async () => {
    db.propertyUnit.findMany.mockResolvedValue([{ name: "Bed 1" }, { name: "Bed 2" }])
    expect((await updateProperty({}, propertyForm())).success).toBeTruthy()
    expect(db.property.updateMany).toHaveBeenCalledWith({
      where: { id: "home", orgId: "org-a" },
      data: expect.objectContaining({ name: "Motel" }),
    })
    expect(db.propertyUnit.createMany).toHaveBeenCalledWith({
      data: [
        { name: "Bed 3", kind: "Bed", propertyId: "home", orgId: "org-a" },
        { name: "Bed 4", kind: "Bed", propertyId: "home", orgId: "org-a" },
      ],
    })
  })
  it("counts custom units toward the requested total", async () => {
    db.propertyUnit.findMany.mockResolvedValue([{ name: "Bed 1" }, { name: "Suite" }])
    await updateProperty({}, propertyForm({ bedCount: "3" }))
    expect(db.propertyUnit.createMany).toHaveBeenCalledWith({
      data: [
        { name: "Bed 2", kind: "Bed", propertyId: "home", orgId: "org-a" },
      ],
    })
  })
  it("edit never deletes units — a lower count writes nothing to units", async () => {
    db.propertyUnit.findMany.mockResolvedValue([
      { name: "Bed 1" }, { name: "Bed 2" }, { name: "Bed 3" }, { name: "Bed 4" }, { name: "Bed 5" },
    ])
    expect((await updateProperty({}, propertyForm({ bedCount: "2" }))).success).toBeTruthy()
    expect(db.propertyUnit.createMany).not.toHaveBeenCalled()
    expect(db.propertyUnit.deleteMany).not.toHaveBeenCalled()
  })
  it("edit without the field leaves units untouched", async () => {
    const data = new FormData()
    data.set("id", "home")
    data.set("name", "Motel")
    data.set("address", "12 Lake Road")
    expect((await updateProperty({}, data)).success).toBeTruthy()
    expect(db.propertyUnit.findMany).not.toHaveBeenCalled()
    expect(db.propertyUnit.createMany).not.toHaveBeenCalled()
  })
  it("turning the flag off persists and stops bed creation", async () => {
    db.propertyUnit.findMany.mockResolvedValue([{ name: "Bed 1" }])
    expect((await updateProperty({}, propertyForm({ allowSharedBookings: "" }))).success).toBeTruthy()
    expect(db.property.updateMany.mock.calls.at(-1)?.[0].data).toMatchObject({ allowSharedBookings: false })
    expect(db.propertyUnit.createMany).not.toHaveBeenCalled()
  })
  it("reports name collisions as a friendly error and keeps the save failed-safe", async () => {
    db.propertyUnit.findMany.mockResolvedValue([{ name: "Bed 1" }])
    db.propertyUnit.createMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "test" })
    )
    const result = await updateProperty({}, propertyForm({ bedCount: "3" }))
    expect(result.error).toMatch(/already taken/)
    expect(db.property.updateMany).toHaveBeenCalledOnce()
  })
  it("scopes the edit to the membership's organization", async () => {
    db.property.updateMany.mockResolvedValue({ count: 0 })
    expect((await updateProperty({}, propertyForm())).error).toMatch(/no longer exists/)
    expect(db.property.updateMany.mock.calls[0][0].where).toEqual({ id: "home", orgId: "org-a" })
    expect(db.propertyUnit.findMany).not.toHaveBeenCalled()
  })
})

describe("serializable retry protocol (not a database concurrency test)", () => {
  const conflict = () => new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "test" })
  it("retries the entire operation on serialization failure", async () => {
    db.$transaction.mockRejectedValueOnce(conflict())
    const work = vi.fn().mockResolvedValue("committed")
    expect(await serializable(work)).toBe("committed")
    expect(db.$transaction).toHaveBeenCalledTimes(2)
    expect(db.$transaction.mock.calls.every(([callback]) => callback === work)).toBe(true)
  })
  it("stops after four attempts", async () => {
    db.$transaction.mockRejectedValue(conflict())
    await expect(serializable(async () => undefined)).rejects.toMatchObject({ code: "P2034" })
    expect(db.$transaction).toHaveBeenCalledTimes(4)
  })
  it("does not retry ordinary failures", async () => {
    db.$transaction.mockRejectedValue(new Error("offline"))
    await expect(serializable(async () => undefined)).rejects.toThrow("offline")
    expect(db.$transaction).toHaveBeenCalledOnce()
  })
})
