import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The rate-limit testing kill-switch.
 *
 * `RATE_LIMIT_DISABLED=true` in the runtime environment makes every auth
 * action's limiter answer "allowed" and write nothing to the database. The
 * point is a phone-testing session that must not lock itself out — while
 * keeping the switch auditable: it is an environment var on the box, not a
 * code-shaped difference, and any unset env restores normal operation.
 */
const { prisma } = vi.hoisted(() => ({
  prisma: {
    rateLimit: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma }))

const dummy = { maxAttempts: 10, windowMinutes: 15, action: "login" } as const

describe("RATE_LIMIT_DISABLED kill-switch", () => {
  const original = process.env.RATE_LIMIT_DISABLED

  afterEach(() => {
    if (original === undefined) delete process.env.RATE_LIMIT_DISABLED
    else process.env.RATE_LIMIT_DISABLED = original
    vi.clearAllMocks()
  })

  it("allows everything and writes nothing when the flag is set", async () => {
    process.env.RATE_LIMIT_DISABLED = "true"
    const { checkRateLimit } = await import("@/lib/rate-limit")

    const result = await checkRateLimit("email:test@example.com", dummy)

    expect(result.allowed).toBe(true)
    expect(prisma.rateLimit.count).not.toHaveBeenCalled()
    expect(prisma.rateLimit.create).not.toHaveBeenCalled()
  })

  it("behaves normally when the flag is absent", async () => {
    delete process.env.RATE_LIMIT_DISABLED
    const { checkRateLimit } = await import("@/lib/rate-limit")

    const result = await checkRateLimit("email:test@example.com", dummy)

    expect(result.allowed).toBe(true)
    expect(prisma.rateLimit.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: "login" }) })
    )
    expect(prisma.rateLimit.create).toHaveBeenCalled()
  })
})
