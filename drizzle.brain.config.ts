import { defineConfig } from "drizzle-kit";

const brainUrl = process.env.BRAIN_DATABASE_URL;

if (!brainUrl) {
  throw new Error(
    "BRAIN_DATABASE_URL must be set for the brain migration. See docs/enterprise-brain-architecture.md.",
  );
}

export default defineConfig({
  out: "./migrations/brain",
  schema: "./shared/brain-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: brainUrl,
  },
  verbose: true,
  strict: true,
});
