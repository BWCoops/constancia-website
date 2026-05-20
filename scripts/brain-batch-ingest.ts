/**
 * One-off batch ingestion CLI — the "off the laptops" sweep.
 *
 * Usage:
 *   BRAIN_DATABASE_URL=... \
 *   BRAIN_R2_ACCOUNT_ID=... BRAIN_R2_ACCESS_KEY_ID=... BRAIN_R2_SECRET_ACCESS_KEY=... \
 *   AI_INTEGRATIONS_OPENAI_API_KEY=... \
 *   npx tsx scripts/brain-batch-ingest.ts <dir> [--team=constancia] [--source=batch_cli] [--dry-run]
 *
 * Walks <dir> recursively, infers doc_type from filename, and ingests
 * each file in parallel (with a concurrency cap so OpenAI rate limits
 * don't bite). Skips already-ingested files by sha256.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import { brainDb } from "../server/brain/db";
import { kbTeams, type KbDocType } from "../shared/brain-schema";
import { eq } from "drizzle-orm";
import { ingestDocument } from "../server/brain/ingestion/ingest";

const CONCURRENCY = 4;
const SKIP_EXTENSIONS = new Set([
  ".lock", ".log", ".tmp", ".bak", ".swp", ".DS_Store",
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
  ".mp3", ".mp4", ".mov", ".avi", ".wav",
  ".zip", ".tar", ".gz", ".7z", ".rar",
  ".exe", ".dll", ".so", ".dylib",
]);
const SUPPORTED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".xlsx",
  ".txt", ".md", ".markdown",
  ".sql", ".csv", ".json",
  ".py", ".vb", ".cs", ".ts", ".tsx", ".js", ".jsx",
  ".yaml", ".yml", ".dax", ".mdx",
]);

interface CliArgs {
  dir: string;
  teamSlug: string;
  source: string;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error(
      "Usage: brain-batch-ingest <dir> [--team=constancia] [--source=batch_cli] [--dry-run]",
    );
    process.exit(1);
  }

  const dir = args[0];
  let teamSlug = "constancia";
  let source = "batch_cli";
  let dryRun = false;

  for (const a of args.slice(1)) {
    if (a.startsWith("--team=")) teamSlug = a.slice("--team=".length);
    else if (a.startsWith("--source=")) source = a.slice("--source=".length);
    else if (a === "--dry-run") dryRun = true;
  }

  return { dir, teamSlug, source, dryRun };
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

function inferDocType(filename: string): KbDocType {
  const name = filename.toLowerCase();
  if (name.includes("sow") || name.includes("statement_of_work")) return "sow";
  if (name.includes("rtm") || name.includes("traceability")) return "rtm";
  if (name.includes("tsd") || name.includes("technical_spec") || name.includes("tdd")) return "tech_spec";
  if (name.includes("fsd") || name.includes("functional_spec")) return "func_spec";

  const ext = path.extname(name);
  if ([".sql", ".vb", ".cs", ".py", ".js", ".ts", ".dax", ".mdx"].includes(ext)) {
    return "script";
  }
  if ([".pptx", ".ppt"].includes(ext)) return "presentation";
  if (ext === ".xlsx") return "report";
  return "other";
}

function inferMime(filename: string): string | undefined {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf": return "application/pdf";
    case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".sql": return "text/x-sql";
    case ".py": return "text/x-python";
    case ".vb": return "text/x-vb";
    case ".cs": return "text/x-csharp";
    case ".md": case ".markdown": case ".mdx": return "text/markdown";
    case ".csv": return "text/csv";
    case ".json": return "application/json";
    case ".txt": return "text/plain";
    default: return undefined;
  }
}

async function getTeamId(slug: string): Promise<string> {
  const rows = await brainDb
    .select({ id: kbTeams.id })
    .from(kbTeams)
    .where(eq(kbTeams.slug, slug))
    .limit(1);
  if (rows.length === 0) {
    throw new Error(
      `No kb_teams row with slug "${slug}". Run \`npm run brain:seed-dictionary\` first.`,
    );
  }
  return rows[0].id;
}

async function main() {
  const args = parseArgs();
  const teamId = await getTeamId(args.teamSlug);

  const stats = { scanned: 0, ingested: 0, deduped: 0, skipped: 0, failed: 0 };
  const limit = pLimit(CONCURRENCY);
  const promises: Array<Promise<void>> = [];

  for await (const file of walk(args.dir)) {
    stats.scanned++;
    const ext = path.extname(file).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) {
      stats.skipped++;
      continue;
    }
    if (ext !== "" && !SUPPORTED_EXTENSIONS.has(ext)) {
      stats.skipped++;
      continue;
    }

    promises.push(
      limit(async () => {
        try {
          const fileStat = await stat(file);
          if (fileStat.size === 0) {
            stats.skipped++;
            return;
          }
          if (args.dryRun) {
            console.log(`[dry] would ingest ${file} (${fileStat.size}B)`);
            return;
          }

          const buf = await readFile(file);
          const result = await ingestDocument({
            teamId,
            docType: inferDocType(file),
            source: args.source as never,
            filename: path.basename(file),
            mimeType: inferMime(file),
            buffer: buf,
            requestedBy: "cli",
            sourceMetadata: { originalPath: file },
          });

          if (result.status === "failed") {
            stats.failed++;
            console.error(`✗ ${file}: ${result.errorMessage}`);
          } else if (result.deduped) {
            stats.deduped++;
            console.log(`= ${file} (deduped → ${result.documentId})`);
          } else {
            stats.ingested++;
            console.log(`✓ ${file} → ${result.documentId} (${result.chunkCount} chunks)`);
          }
        } catch (err) {
          stats.failed++;
          console.error(`✗ ${file}:`, err instanceof Error ? err.message : err);
        }
      }),
    );
  }

  await Promise.all(promises);

  console.log("\n===== Batch ingestion summary =====");
  console.log(`Scanned : ${stats.scanned}`);
  console.log(`Ingested: ${stats.ingested}`);
  console.log(`Deduped : ${stats.deduped}`);
  console.log(`Skipped : ${stats.skipped}`);
  console.log(`Failed  : ${stats.failed}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Batch ingest failed:", err);
    process.exit(1);
  });
