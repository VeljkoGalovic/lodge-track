import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 removed `url`/`directUrl` from the schema file, so connection URLs
 * for the CLI live here instead. This datasource is what Prisma CLI connects
 * with (migrate, db push, introspect); the runtime client connects through the
 * `pg` driver adapter instead — see lib/prisma.ts.
 *
 * `DIRECT_URL` keeps its old `directUrl` role: when present (a Supabase-style
 * split between a pooled runtime URL and a direct DDL URL), the CLI prefers it.
 * Environments that only set `DATABASE_URL` — e.g. CI — fall back automatically.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
