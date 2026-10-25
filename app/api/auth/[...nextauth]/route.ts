// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
import { guardAuthEndpointRateLimit } from "@/lib/api-guard"
import type { NextRequest } from "next/server"

/**
 * NextAuth route handlers with per-endpoint rate limiting (replaces the
 * limiting that used to run in the proxy middleware, which must stay
 * database-free).
 */

const baseGET = handlers.GET
const basePOST = handlers.POST

async function rateLimitedGET(request: NextRequest) {
  const blocked = await guardAuthEndpointRateLimit(request)
  if (blocked) return blocked
  return baseGET(request)
}

async function rateLimitedPOST(request: NextRequest) {
  const blocked = await guardAuthEndpointRateLimit(request)
  if (blocked) return blocked
  return basePOST(request)
}

export async function GET(request: NextRequest) {
  return rateLimitedGET(request)
}

export async function POST(request: NextRequest) {
  return rateLimitedPOST(request)
}
