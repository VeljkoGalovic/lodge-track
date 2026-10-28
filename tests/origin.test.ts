import { beforeEach, describe, expect, it, vi } from "vitest"
import { absoluteUrl, requestOrigin } from "@/lib/origin"

/**
 * Origin resolution behind a reverse proxy.
 *
 * Next fabricates `req.url` from the server's own binding, so behind the
 * tunnel it claims `http://localhost:3001` even for visitors on
 * `https://www.lodgetrack.com` — which is how auth.js sign-out once threw
 * people at localhost. Every origin builder here must therefore read the
 * request headers (`x-forwarded-host` preferred over `host`), the way the
 * tunnel annotates them.
 */
const { headerStore } = vi.hoisted(() => ({ headerStore: {} as Record<string, string> }))

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerStore[name] ?? null }),
}))

describe("requestOrigin", () => {
  beforeEach(() => {
    for (const key of Object.keys(headerStore)) delete headerStore[key]
  })

  it("prefers x-forwarded-host over the raw host", async () => {
    headerStore["x-forwarded-host"] = "www.lodgetrack.com"
    headerStore["x-forwarded-proto"] = "https"
    headerStore["host"] = "localhost:3001"
    expect(await requestOrigin()).toBe("https://www.lodgetrack.com")
  })

  it("falls back to the host header and https beyond localhost", async () => {
    headerStore["host"] = "www.lodgetrack.com"
    expect(await requestOrigin()).toBe("https://www.lodgetrack.com")
  })

  it("keeps http on localhost", async () => {
    headerStore["host"] = "localhost:3000"
    expect(await requestOrigin()).toBe("http://localhost:3000")
  })
})

describe("absoluteUrl", () => {
  beforeEach(() => {
    for (const key of Object.keys(headerStore)) delete headerStore[key]
  })

  it("resolves a path against the real request origin, not req.url's", async () => {
    headerStore["x-forwarded-host"] = "www.lodgetrack.com"
    headerStore["x-forwarded-proto"] = "https"
    expect(await absoluteUrl("/dashboard/billing?checkout=complete")).toBe(
      "https://www.lodgetrack.com/dashboard/billing?checkout=complete"
    )
  })

  it("preserves query strings and anchors", async () => {
    headerStore["host"] = "www.lodgetrack.com"
    expect(await absoluteUrl("/signin?reset=sent")).toBe(
      "https://www.lodgetrack.com/signin?reset=sent"
    )
  })
})
