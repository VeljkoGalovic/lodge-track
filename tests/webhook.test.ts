import { createHmac } from "node:crypto"
import { Prisma } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const db = vi.hoisted(() => ({
  webhookEvent: { create: vi.fn() },
  subscription: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: db }))
import { POST } from "@/app/api/billing/webhook/route"
import { verifyWebhookSignature } from "@/lib/billing"

const secret = "local-test-secret"
const body = (status = "active") => JSON.stringify({
  meta: { event_name: "subscription_updated", custom_data: { org_id: "local-org" } },
  data: { type: "subscriptions", id: "42", attributes: { status } },
})
const sign = (raw: string) => createHmac("sha256", secret).update(raw).digest("hex")
const request = (raw: string, signature = sign(raw)) => new Request("http://localhost/api/billing/webhook", {
  method: "POST", body: raw, headers: { "x-signature": signature },
})
let ledger: Set<string>
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv("LEMON_SQUEEZY_WEBHOOK_SECRET", secret)
  vi.spyOn(console, "error").mockImplementation(() => {})
  ledger = new Set()
  // Models rollback to test receiver orchestration, not PostgreSQL itself.
  db.$transaction.mockImplementation(async work => {
    const snapshot = new Set(ledger)
    try { return await work(db) } catch (error) { ledger = snapshot; throw error }
  })
  db.webhookEvent.create.mockImplementation(async ({ data }: { data: { id: string } }) => {
    if (ledger.has(data.id)) throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" })
    ledger.add(data.id)
  })
  db.subscription.findUnique.mockResolvedValue({ id: "local-sub", billingSubscriptionId: "42" })
  db.subscription.update.mockResolvedValue({})
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe("raw-body webhook HMAC", () => {
  it("verifies the exact raw bytes, not reserialized JSON", () => {
    const raw = '{ "value": 1 }'
    expect(verifyWebhookSignature(raw, sign(raw))).toBe(true)
    expect(verifyWebhookSignature(JSON.stringify(JSON.parse(raw)), sign(raw))).toBe(false)
    expect(verifyWebhookSignature(raw + "\n", sign(raw))).toBe(false)
  })
  it("rejects missing, malformed and wrong-secret signatures safely", () => {
    for (const signature of [null, "", "short", "g".repeat(64), "0".repeat(64)]) {
      expect(verifyWebhookSignature(body(), signature)).toBe(false)
    }
    vi.stubEnv("LEMON_SQUEEZY_WEBHOOK_SECRET", "")
    expect(verifyWebhookSignature(body(), sign(body()))).toBe(false)
  })
  it("does no database work before signature verification", async () => {
    expect((await POST(request(body(), "wrong"))).status).toBe(401)
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

describe("webhook delivery transactions", () => {
  it.each(["not-json", "null", "[]", "{}", '{"meta":{"event_name":4}}'])("rejects malformed input (%s)", async raw => {
    expect((await POST(request(raw))).status).toBe(400)
    expect(db.$transaction).not.toHaveBeenCalled()
  })
  it("acknowledges a repeated delivery without applying it twice", async () => {
    expect((await POST(request(body()))).status).toBe(200)
    const duplicate = await POST(request(body()))
    expect(await duplicate.json()).toMatchObject({ duplicate: true })
    expect(db.subscription.update).toHaveBeenCalledOnce()
  })
  it("applies distinct lifecycle events sharing the same subscription ID", async () => {
    await POST(request(body("active")))
    await POST(request(body("paused")))
    expect(db.subscription.update).toHaveBeenCalledTimes(2)
    expect(ledger.size).toBe(2)
    expect(db.subscription.update.mock.calls[1][0].data.status).toBe("PAUSED")
  })
  it("returns a retryable failure and can apply a failed delivery on retry", async () => {
    db.subscription.update.mockRejectedValueOnce(new Error("simulated database failure"))
    expect((await POST(request(body()))).status).toBe(503)
    expect(db.subscription.update).toHaveBeenCalledOnce()
    expect(ledger.size).toBe(0)
    expect((await POST(request(body()))).status).toBe(200)
    expect(ledger.size).toBe(1)
    expect(db.subscription.update).toHaveBeenCalledTimes(2)
  })
  it("does not mistake ledger persistence failures for duplicates", async () => {
    db.webhookEvent.create.mockRejectedValueOnce(new Error("offline"))
    expect((await POST(request(body()))).status).toBe(503)
    expect(db.subscription.update).not.toHaveBeenCalled()
  })
  it("does not treat an unrelated subscription unique error as a duplicate delivery", async () => {
    db.subscription.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "test" }))
    expect((await POST(request(body()))).status).toBe(503)
    expect(ledger.size).toBe(0)
  })
})
