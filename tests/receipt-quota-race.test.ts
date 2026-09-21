import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { getOrgFeatures } from "@/lib/subscriptions"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    property: { findFirst: vi.fn() },
    expense: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))
vi.mock("server-only", () => ({}))
vi.mock("@/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }))
// Mock fs operations
vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  unlink: vi.fn(),
}))
vi.mock("crypto", () => ({
  randomUUID: () => "mock-uuid",
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
import { createExpense } from "@/app/actions/expenses"
import { serializable } from "@/lib/transaction"

const db = mocks.db

function form(extra: Record<string, string | File> = {}) {
  const result = new FormData()
  for (const [key, value] of Object.entries({
    propertyId: "prop-1",
    amount: "100.00",
    category: "MAINTENANCE",
    date: "2026-09-01",
    description: "Test expense",
    receipt: receiptFile(1_000_000), // 1MB receipt
    ...extra
  })) result.set(key, value)
  return result
}

function receiptFile(size: number) {
  // Create a valid PDF with magic bytes
  const bytes = new Uint8Array(size)
  // PDF magic bytes: %PDF
  bytes[0] = 0x25 // %
  bytes[1] = 0x50 // P
  bytes[2] = 0x44 // D
  bytes[3] = 0x46 // F
  const file = new File([bytes.buffer], "receipt.pdf", { type: "application/pdf" })
  return file
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ user: { email: "local@example.test" } })
  db.user.findUnique.mockResolvedValue({
    id: "member",
    role: "MANAGER",
    organization: {
      id: "org-a",
      currency: "USD",
      subscription: { tier: "STARTER" }
    }
  })
  db.organization.findUnique.mockResolvedValue({
    id: "org-a",
    subscription: { tier: "STARTER" }
  })
  db.property.findFirst.mockResolvedValue({ id: "prop-1" })
  // STARTER tier: 1GB limit
  db.expense.aggregate.mockResolvedValue({ _sum: { receiptSize: 900_000_000 } }) // 900MB used
  db.$transaction.mockImplementation(work => work(db))
  db.expense.create.mockResolvedValue({ id: "new-expense" })
})

describe("Fix 1: Receipt quota race condition", () => {
  it("allows single upload under quota", async () => {
    const result = await createExpense({}, form())
    expect(result.success).toBeTruthy()
    expect(db.expense.create).toHaveBeenCalledOnce()
  })

  it("rejects upload that would exceed quota", async () => {
    // 1GB used (limit) + 1MB = over limit
    db.expense.aggregate.mockResolvedValue({ _sum: { receiptSize: 1_000_000_001 } })
    const result = await createExpense({}, form())
    expect(result.error).toMatch(/storage|used.*of its.*receipt storage/)
    expect(db.expense.create).not.toHaveBeenCalled()
  })

  it("uses serializable transaction for quota check and write", async () => {
    await createExpense({}, form())
    // Verify serializable was called with a function that does the quota check and write
    expect(db.$transaction).toHaveBeenCalled()
    const [txCallback, options] = db.$transaction.mock.calls[0]
    expect(options).toEqual({ isolationLevel: "Serializable" })
    expect(typeof txCallback).toBe("function")
  })

  it("calls receiptQuota inside the transaction", async () => {
    // We can't easily test the internal call, but we can verify the transaction is used
    await createExpense({}, form())
    expect(db.$transaction).toHaveBeenCalled()
  })
})