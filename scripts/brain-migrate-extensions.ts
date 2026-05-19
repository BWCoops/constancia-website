/**
 * Apply raw SQL migrations for the Constancia Brain.
 *
 * Drizzle handles table DDL via `npm run brain:push`. This script applies
 * the things Drizzle cannot express: extensions (pgvector, pg_trgm) and
 * expression indexes (GIN on tsvector, trigram).
 *
 * Idempotent — every statement in the SQL files uses IF NOT EXISTS.
 * Run after every `brain:push` to keep the extensions and indexes
 * aligned with the schema.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations/brain");

async function main() {
  if (!process.env.BRAIN_DATABASE_URL) {
    console.error("BRAIN_DATABASE_URL is required.");
    process.exit(1);
  }

  const entries = await readdir(MIGRATIONS_DIR);
  const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();

  if (sqlFiles.length === 0) {
    console.log("No SQL migration files found.");
    return;
  }

  const pool = new Pool({ connectionString: process.env.BRAIN_DATABASE_URL });

  try {
    for (const file of sqlFiles) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = await readFile(fullPath, "utf8");

      console.log(`Applying ${file}...`);
      await pool.query(sql);
      console.log(`  ok`);
    }
    console.log(`Applied ${sqlFiles.length} migration file(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
