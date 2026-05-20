/**
 * Ingestion orchestrator — the full pipeline for a single document.
 *
 * Input:  a buffer + minimal metadata (filename, mime, source, who)
 * Output: a `kb_documents` row (status=ready) with its chunks embedded
 *         and indexed, or a job row marked failed.
 *
 * Side effects:
 *   - Writes the raw buffer to R2 keyed by content sha256 (dedup)
 *   - Inserts kb_documents, kb_ingestion_jobs, kb_document_chunks rows
 *   - Optionally records an audit-log entry
 */

import { brainDb } from "../db";
import {
  kbDocuments,
  kbDocumentChunks,
  kbIngestionJobs,
  type KbDocType,
  type KbDocSource,
} from "@shared/brain-schema";
import { sql, eq, and } from "drizzle-orm";
import { uploadBuffer, sha256Hex, r2UriFor, existsInR2 } from "../storage/r2";
import { extractText } from "./extract";
import { chunkText } from "./chunk";
import { embedTexts, embeddingModel } from "./embed";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("brain-ingest");

export interface IngestInput {
  teamId: string;
  ownerUserId?: string;
  projectId?: string;
  clientId?: string;
  title?: string;
  docType: KbDocType;
  source: KbDocSource;
  filename: string;
  mimeType?: string;
  buffer: Buffer;
  // For URL ingests / external sources, the place we got it from.
  sourceMetadata?: Record<string, unknown>;
  requestedBy?: string; // free-form: cli|web|connector|mcp
  submittedByUserId?: string;
}

export interface IngestResult {
  documentId: string;
  chunkCount: number;
  deduped: boolean;
  status: "ready" | "failed";
  errorMessage?: string;
}

export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const sha256 = sha256Hex(input.buffer);
  const sizeBytes = input.buffer.length;

  // ─── Dedup check ──────────────────────────────────────────────
  const existing = await brainDb
    .select({ id: kbDocuments.id, status: kbDocuments.status })
    .from(kbDocuments)
    .where(
      and(
        eq(kbDocuments.teamId, input.teamId),
        eq(kbDocuments.contentSha256, sha256),
      ),
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status === "ready") {
    log.info(
      { documentId: existing[0].id, sha256 },
      "Document already ingested, deduped",
    );
    return {
      documentId: existing[0].id,
      chunkCount: 0,
      deduped: true,
      status: "ready",
    };
  }

  // ─── Insert pending document + job ────────────────────────────
  const [doc] = await brainDb
    .insert(kbDocuments)
    .values({
      teamId: input.teamId,
      projectId: input.projectId,
      clientId: input.clientId,
      ownerUserId: input.ownerUserId,
      docType: input.docType,
      title: input.title ?? input.filename,
      source: input.source,
      sourceMetadata: input.sourceMetadata,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      sizeBytes,
      contentSha256: sha256,
      status: "ingesting",
    })
    .onConflictDoUpdate({
      target: [kbDocuments.teamId, kbDocuments.contentSha256],
      set: { status: "ingesting", updatedAt: sql`now()` },
    })
    .returning({ id: kbDocuments.id });

  const [job] = await brainDb
    .insert(kbIngestionJobs)
    .values({
      teamId: input.teamId,
      documentId: doc.id,
      submittedByUserId: input.submittedByUserId,
      stage: "queued",
      requestedBy: input.requestedBy,
      payload: { filename: input.filename, mimeType: input.mimeType, sizeBytes },
    })
    .returning({ id: kbIngestionJobs.id });

  const startedAt = new Date();
  let chunkCount = 0;

  try {
    // ─── Upload to R2 ────────────────────────────────────────────
    await markStage(job.id, "downloading", startedAt);
    const alreadyUploaded = await existsInR2(sha256).catch(() => false);
    if (!alreadyUploaded) {
      await uploadBuffer(input.buffer, {
        contentType: input.mimeType,
        metadata: { filename: input.filename, teamId: input.teamId },
      });
    }
    const sourceUri = r2UriFor(sha256);

    // ─── Extract text ────────────────────────────────────────────
    await markStage(job.id, "extracting");
    const extracted = await extractText(input.buffer, {
      mimeType: input.mimeType,
      filename: input.filename,
    });

    if (!extracted.text || extracted.text.trim().length < 10) {
      throw new Error("Extraction produced no usable text");
    }

    // ─── Chunk ───────────────────────────────────────────────────
    await markStage(job.id, "chunking");
    const chunks = chunkText(extracted.text);
    if (chunks.length === 0) throw new Error("Chunking produced no chunks");

    // ─── Embed ───────────────────────────────────────────────────
    await markStage(job.id, "embedding");
    const embeddings = await embedTexts(chunks.map((c) => c.text));
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`,
      );
    }

    // ─── Persist chunks + finalise document ─────────────────────
    await brainDb.transaction(async (tx) => {
      // Replace any existing chunks (re-ingestion case)
      await tx
        .delete(kbDocumentChunks)
        .where(eq(kbDocumentChunks.documentId, doc.id));

      await tx.insert(kbDocumentChunks).values(
        chunks.map((c, i) => ({
          documentId: doc.id,
          teamId: input.teamId,
          chunkIndex: c.index,
          text: c.text,
          tokenCount: c.tokenCount,
          headingPath: c.headingPath,
          embedding: embeddings[i],
          embeddingModel,
        })),
      );

      await tx
        .update(kbDocuments)
        .set({
          status: "ready",
          sourceUri,
          ingestedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(kbDocuments.id, doc.id));
    });

    await markStage(job.id, "done", undefined, true);
    chunkCount = chunks.length;

    return {
      documentId: doc.id,
      chunkCount,
      deduped: false,
      status: "ready",
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error({ err, documentId: doc.id }, "Brain ingestion failed");

    await brainDb
      .update(kbDocuments)
      .set({ status: "failed", updatedAt: sql`now()` })
      .where(eq(kbDocuments.id, doc.id));

    await brainDb
      .update(kbIngestionJobs)
      .set({
        stage: "failed",
        lastError: errorMessage,
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(kbIngestionJobs.id, job.id));

    return {
      documentId: doc.id,
      chunkCount: 0,
      deduped: false,
      status: "failed",
      errorMessage,
    };
  }
}

async function markStage(
  jobId: string,
  stage: string,
  startedAt?: Date,
  finished = false,
): Promise<void> {
  const updates: Record<string, unknown> = {
    stage,
    updatedAt: sql`now()`,
  };
  if (startedAt) updates.startedAt = startedAt;
  if (finished) updates.finishedAt = sql`now()`;

  await brainDb
    .update(kbIngestionJobs)
    .set(updates)
    .where(eq(kbIngestionJobs.id, jobId));
}
