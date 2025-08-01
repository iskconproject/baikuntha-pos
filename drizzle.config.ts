import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: process.env.NODE_ENV === "production" ? "turso" : "sqlite",
  dbCredentials:
    process.env.NODE_ENV === "production"
      ? {
          url: process.env.TURSO_DATABASE_URL!,
          authToken: process.env.TURSO_AUTH_TOKEN!,
        }
      : {
          url: process.env.DATABASE_URL || "file:./local.db",
        },
  verbose: true,
  strict: true,
});
