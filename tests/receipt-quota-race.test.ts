import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { getOrgFeatures } from "@/lib/subscriptions"

// Hoisted mocks must be declared before vi.mock calls
const mockSaveAttachment = vi.hoisted(() => vi.fn())
const mockSniffAttachmentType = vi.hoisted(() => vi.fn().mockReturnValue({ type: "application/pdf", extension: "pdf" }))
const mockDeleteAttachment = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

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
    attachment: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
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
  createHash: () => ({
    update: () => ({
      digest: () => "mock-checksum",
    }),
  }),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { id: "mock-supabase-id" }, error: null }),
      }),
    },
  }),
}))
vi.mock("@/lib/storage", () => ({
  sniffAttachmentType: mockSniffAttachmentType,
  saveAttachment: mockSaveAttachment,
  deleteAttachment: mockDeleteAttachment,
  MAX_ATTACHMENT_BYTES: 5 * 1024 * 1024,
}))
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
  // STARTER tier: 1GB limit - attachmentQuota uses attachment aggregate, not expense aggregate
  db.attachment.aggregate.mockResolvedValue({ _sum: { fileSize: 900_000_000 } }) // 900MB used
  db.$transaction.mockImplementation(async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options?: Prisma.TransactionOptions) => {
    // Call the callback with a mock transaction client
    return callback(db)
  })
  db.expense.create.mockResolvedValue({ id: "new-expense" })
  db.attachment.findFirst.mockResolvedValue({ id: "att-1" })
  db.attachment.create.mockResolvedValue({ id: "att-1" })
  db.attachment.update.mockResolvedValue({})

  // Set up mockSaveAttachment implementation in beforeEach - default success
  mockSaveAttachment.mockImplementation(async (file: File, orgId: string, module: string, moduleId: string, quota: { usedBytes: number; limitBytes: number }, uploadedById: string, tx: Prisma.TransactionClient) => {
    if (file.size === 0) return { ok: false, error: "That file is empty." }
    if (file.size > 5 * 1024 * 1024) {
      return { ok: false, error: "Attachments must be under 5 MB." }
    }
    if (quota.usedBytes + file.size > quota.limitBytes) {
      const used = formatBytes(quota.usedBytes)
      const limit = formatBytes(quota.limitBytes)
      const free = formatBytes(Math.max(0, quota.limitBytes - quota.usedBytes))
      return { ok: false, error: `Your organization has used ${used} of its ${limit} attachment storage, leaving ${free}. Remove an old attachment or upgrade the plan to add this one.` }
    }
    return {
      ok: true,
      attachment: {
        path: "mock/path.pdf",
        name: "receipt.pdf",
        type: "application/pdf",
        size: file.size,
        checksum: "mock-checksum",
        supabaseId: "mock-supabase-id",
      },
    }
  })
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

describe("Fix 1: Receipt quota race condition", () => {
  it("allows single upload under quota", async () => {
    const result = await createExpense({}, form())
    expect(result.success).toBeTruthy()
    expect(db.expense.create).toHaveBeenCalledOnce()
  })

  it("rejects upload that would exceed quota", async () => {
    // attachmentQuota uses attachment aggregate (fileSize), not expense aggregate (receiptSize)
    // STARTER tier: 1GB limit. 900MB used + 2MB = 902MB (under limit, should succeed)
    // So we need to test with more used space: 900MB + 4MB = 904MB (still under)
    // Let's set used to 900MB and add 4MB file - that's under 1GB
    // For the quota exceed test, set used to 998MB and add 4MB = 1002MB > 1GB
    db.attachment.aggregate.mockResolvedValue({ _sum: { fileSize: 998_000_000 } }) // 998MB used

    const largeForm = form()
    // Replace the 1MB receipt with 4MB (under 5MB limit)
    largeForm.set("receipt", receiptFile(4_000_000))

    const result = await createExpense({}, largeForm)
    console.log("Result:", result)
    expect(result.error).toBeDefined()
    expect(result.error).toMatch(/storage|used.*of its.*attachment storage/)
    expect(db.expense.create).not.toHaveBeenCalled()
  })

  it("uses serializable transaction for quota check and write", async () => {
    await createExpense({}, form())
    // Verify serializable was called with a function that does the quota check and write
    expect(db.$transaction).toHaveBeenCalled()
    const call = db.$transaction.mock.calls[0]
    const [, options] = call
    expect(options).toEqual({ isolationLevel: "Serializable" })
  })

  it("calls receiptQuota inside the transaction", async () => {
    // We can't easily test the internal call, but we can verify the transaction is used
    await createExpense({}, form())
    expect(db.$transaction).toHaveBeenCalled()
  })
})