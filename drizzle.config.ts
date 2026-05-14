import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DATABASE_URL or DATABASE_DIRECT_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  verbose: true,
  strict: true,
});
