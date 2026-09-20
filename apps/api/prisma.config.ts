// Prisma config: root .env supplies DATABASE_URL (docker compose db on
// :15434), with a local fallback to the same credentials.
// Migrations run through the driver adapter — no engine-level connect.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { defineConfig } from "prisma/config";

const url =
  process.env.DATABASE_URL ??
  "postgresql://runmax:runmax@localhost:15434/runmax";

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
