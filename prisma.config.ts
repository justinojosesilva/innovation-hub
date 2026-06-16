import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: connection URL for the CLI (migrate/studio) lives here, not in schema.
// The runtime client connects via the @prisma/adapter-pg driver adapter (see src/lib/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
