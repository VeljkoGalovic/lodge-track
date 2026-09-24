import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    property: { findFirst: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
    booking: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock("server-only", () => ({}))
vi.mock("@/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
import { deleteProperty } from "@/app/actions/properties"
import { serializable } from "@/lib/transaction"

const db = mocks.db

function form(extra: Record<string, string> = {}) {
  const result = new FormData()
  for (const [key, value] of Object.entries({ id: "home", ...extra })) result.set(key, value)
  return result
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ user: { email: "local@example.test" } })
  db.user.findUnique.mockResolvedValue({ id: "member", role: "MANAGER", organization: { id: "org-a", currency: "USD", subscription: null } })
  db.$transaction.mockImplementation(work => work(db))
  db.property.findFirst.mockResolvedValue({ id: "home" })
  db.booking.count.mockResolvedValue(0)
  db.property.deleteMany.mockResolvedValue({ count: 1 })
})

describe("deleteProperty authorization and tenant scoping", () => {
  it("denies missing sessions before persistence", async () => {
    mocks.auth.mockResolvedValue(null)
    const result = await deleteProperty({}, form())
    expect(result.error).toBeTruthy()
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it("denies read-only members before writes", async () => {
    db.user.findUnique.mockResolvedValue({ role: "MAINTENANCE", organization: { id: "org-a" } })
    const result = await deleteProperty({}, form())
    expect(result.error).toMatch(/permission/)
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it("scopes deletion to the membership's organization", async () => {
    db.property.deleteMany.mockResolvedValue({ count: 0 })
    const result = await deleteProperty({}, form())
    expect(result.error).toMatch(/no longer exists/)
    expect(db.property.deleteMany).toHaveBeenCalledWith({ where: { id: "home", orgId: "org-a" } })
  })

  it("rejects cross-organization deletion even when property exists", async () => {
    // The property exists in another org, but deleteMany is scoped to org-a
    db.property.deleteMany.mockResolvedValue({ count: 0 })
    const result = await deleteProperty({}, form({ id: "other-org-property" }))
    expect(result.error).toMatch(/no longer exists/)
    expect(db.property.deleteMany).toHaveBeenCalledWith({ where: { id: "other-org-property", orgId: "org-a" } })
  })

  it("deletes property and reports booking count in success message", async () => {
    db.booking.count.mockResolvedValue(3)
    const result = await deleteProperty({}, form())
    expect(result.success).toMatch(/Property deleted, along with 3 bookings/)
    expect(result.redirect).toBe("/dashboard/properties")
    expect(db.property.deleteMany).toHaveBeenCalledWith({ where: { id: "home", orgId: "org-a" } })
    expect(db.booking.count).toHaveBeenCalledWith({ where: { propertyId: "home", property: { orgId: "org-a" } } })
  })

  it("deletes property with zero bookings and reports simple success", async () => {
    db.booking.count.mockResolvedValue(0)
    const result = await deleteProperty({}, form())
    expect(result.success).toBe("Property deleted.")
    expect(result.redirect).toBe("/dashboard/properties")
  })

  it("deletes property with one booking and uses singular booking", async () => {
    db.booking.count.mockResolvedValue(1)
    const result = await deleteProperty({}, form())
    expect(result.success).toMatch(/Property deleted, along with 1 booking\./)
  })

  it("revalidates dashboard, properties, and bookings paths", async () => {
    await deleteProperty({}, form())
    const { revalidatePath } = await import("next/cache")
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/properties")
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/bookings")
  })

  it("uses serializable isolation for the delete transaction", async () => {
    await deleteProperty({}, form())
    expect(db.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: "Serializable" })
  })

  it("requires canManage role", async () => {
    db.user.findUnique.mockResolvedValue({ role: "MEMBER", organization: { id: "org-a" } })
    const result = await deleteProperty({}, form())
    expect(result.error).toMatch(/permission/)
  })

  it("allows OWNER role to delete", async () => {
    db.user.findUnique.mockResolvedValue({ id: "member", role: "OWNER", organization: { id: "org-a", currency: "USD", subscription: null } })
    const result = await deleteProperty({}, form())
    expect(result.success).toBeTruthy()
  })

  it("allows MANAGER role to delete", async () => {
    db.user.findUnique.mockResolvedValue({ id: "member", role: "MANAGER", organization: { id: "org-a", currency: "USD", subscription: null } })
    const result = await deleteProperty({}, form())
    expect(result.success).toBeTruthy()
  })

  it("denies MAINTENANCE role from deleting", async () => {
    db.user.findUnique.mockResolvedValue({ id: "member", role: "MAINTENANCE", organization: { id: "org-a", currency: "USD", subscription: null } })
    const result = await deleteProperty({}, form())
    expect(result.error).toMatch(/permission/)
  })
})

describe("deleteProperty serialization retry behavior", () => {
  const conflict = () => new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "test" })

  it("retries the entire operation on serialization failure", async () => {
    db.$transaction.mockRejectedValueOnce(conflict())
    const work = vi.fn().mockResolvedValue({ success: "Property deleted.", redirect: "/dashboard/properties" })
    // We test serializable directly since it's the retry wrapper
    expect(await serializable(work)).toMatchObject({ success: "Property deleted.", redirect: "/dashboard/properties" })
    expect(db.$transaction).toHaveBeenCalledTimes(2)
  })

  it("stops after four attempts on persistent conflict", async () => {
    db.$transaction.mockRejectedValue(conflict())
    await expect(serializable(async () => undefined)).rejects.toMatchObject({ code: "P2034" })
    expect(db.$transaction).toHaveBeenCalledTimes(4)
  })
})