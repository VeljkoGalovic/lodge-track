// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 no longer reads a connection URL from the schema/env on its own —
 * the client must be constructed with a driver adapter. `@prisma/adapter-pg`
 * wraps `pg`, so the client speaks plain TCP and works in the Node runtime
 * behind server components, server actions, and route handlers.
 *
 * Both access and construction are lazy:
 * - Importing `lib/prisma` must have no side effects, because modules that only
 *   carry the prisma type (and tests that auto-mock this module) still execute
 *   this file's body — in environments where no database is configured at all.
 * - Failing on first *call* rather than first *import* keeps the error message
 *   at the place that actually needed the database.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function unavailable(): never {
  throw new Error(
    "DATABASE_URL is not configured. Set it in .env or the deployment environment.",
  );
}

/** Stand-in for the client when no DATABASE_URL exists: reads degrade, calls throw. */
const unavailableClient = new Proxy(unavailable as unknown as PrismaClient, {
  get: () => unavailable,
});

function clientInstance(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return unavailableClient;

  const client = new PrismaClient({
    // Cap the driver pool: Supabase's session-mode pooler allows only 15
    // clients per user across ALL consumers (this app, the workers.dev
    // fallback, ops scripts). Without an explicit max, the adapter defaults
    // high; combined with any parallel render the pooler returns
    // EMAXCONNSESSION and pages 500. 6 keeps ample headroom for the others.
    adapter: new PrismaPg({ connectionString, max: 6 }),
  });
  // Cache in every environment: this process is long-lived, so per-call
  // construction would hoist a brand-new pg pool onto every prisma access
  // and slam through the session-mode client cap (seen as EMAXCONNSESSION
  // bursts right after go-live). Tests that mock `@/lib/prisma` never run
  // this path either way.
  globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = clientInstance();
    const value = Reflect.get(client as object, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
