// Prisma config: root .env supplies DATABASE_URL (rootless embedded dev db
// via `pnpm db:up` on :54330; this user has no Docker group rights), with a
// local fallback to the same embedded cluster.
// Migrations run through the driver adapter — no engine-level connect.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { defineConfig } from "prisma/config";

const url =
  process.env.DATABASE_URL ??
  "postgresql://runmax:runmax@127.0.0.1:54330/runmax";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
  migrate: {
    adapter: async () => new PrismaPg(url),
  },
});
