import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 removed `url`/`directUrl` from the schema file, so connection URLs
 * for the CLI live here instead. This datasource is what Prisma CLI connects
 * with (migrate, db push, introspect); the runtime client connects through the
 * `pg` driver adapter instead — see lib/prisma.ts.
 *
 * `prisma generate` does not need a live database, and CI/CD build steps may
 * run with no database URL configured at all, so the datasource block is
 * omitted entirely when the environment carries none. `DIRECT_URL` keeps its
 * old `directUrl` role: when present (a Supabase-style split between a pooled
 * runtime URL and a direct DDL URL), the CLI prefers it.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: process.env.DATABASE_URL
    ? { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL }
    : undefined,
});
