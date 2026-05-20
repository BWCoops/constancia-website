/**
 * Hybrid search for the brain — vector + full-text via Reciprocal Rank
 * Fusion (RRF). Borrowed pattern from Azure-Samples/rag-postgres-openai-python
 * and ankushchhabra02/vortex (see docs/enterprise-brain-baseline-repos.md).
 *
 * Approach:
 *   1. Run two independent ranked queries (k_vec, k_fts).
 *   2. Combine using RRF: score(d) = Σ 1 / (k + rank_in_each_list).
 *   3. Filter by team_id, optional doc_type / project / client.
 *   4. Aggregate chunk-level results up to document-level.
 */

import { brainDb } from "../db";
import { sql } from "drizzle-orm";
import { embedOne } from "../ingestion/embed";
import type { KbDocType } from "@shared/brain-schema";

const RRF_K = 60; // typical RRF constant
const DEFAULT_PER_LIST = 40;
const DEFAULT_TOP_K = 10;

export interface SearchFilters {
  teamId: string;
  docTypes?: KbDocType[];
  projectId?: string;
  clientId?: string;
  sinceIso?: string;
}

export interface SearchResultItem {
  documentId: string;
  title: string;
  docType: string;
  projectId: string | null;
  clientId: string | null;
  snippet: string;
  headingPath: string | null;
  score: number;
  topChunkId: string;
}

export interface SearchOptions {
  query: string;
  topK?: number;
  perList?: number;
  filters: SearchFilters;
}

export async function hybridSearch(
  opts: SearchOptions,
): Promise<SearchResultItem[]> {
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const perList = opts.perList ?? DEFAULT_PER_LIST;

  if (!opts.query || opts.query.trim().length === 0) return [];

  const queryEmbedding = await embedOne(opts.query);

  // Vector literal must be passed as a Postgres array literal.
  const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

  // Filter SQL fragments. Drizzle's `sql` template handles parameterisation.
  const docTypesFilter =
    opts.filters.docTypes && opts.filters.docTypes.length > 0
      ? sql`AND d.doc_type = ANY(${opts.filters.docTypes})`
      : sql``;
  const projectFilter = opts.filters.projectId
    ? sql`AND d.project_id = ${opts.filters.projectId}`
    : sql``;
  const clientFilter = opts.filters.clientId
    ? sql`AND d.client_id = ${opts.filters.clientId}`
    : sql``;
  const sinceFilter = opts.filters.sinceIso
    ? sql`AND d.created_at >= ${opts.filters.sinceIso}::timestamptz`
    : sql``;

  const rows = await brainDb.execute<{
    document_id: string;
    chunk_id: string;
    title: string;
    doc_type: string;
    project_id: string | null;
    client_id: string | null;
    snippet: string;
    heading_path: string | null;
    score: number;
  }>(sql`
    WITH vec AS (
      SELECT
        c.id AS chunk_id,
        c.document_id,
        c.text,
        c.heading_path,
        ROW_NUMBER() OVER (ORDER BY c.embedding <=> ${embeddingLiteral}::vector) AS rnk
      FROM kb_document_chunks c
      JOIN kb_documents d ON d.id = c.document_id
      WHERE c.team_id = ${opts.filters.teamId}
        AND d.status = 'ready'
        AND c.embedding IS NOT NULL
        ${docTypesFilter}
        ${projectFilter}
        ${clientFilter}
        ${sinceFilter}
      ORDER BY c.embedding <=> ${embeddingLiteral}::vector
      LIMIT ${perList}
    ),
    fts AS (
      SELECT
        c.id AS chunk_id,
        c.document_id,
        c.text,
        c.heading_path,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank_cd(to_tsvector('english', c.text), websearch_to_tsquery('english', ${opts.query})) DESC
        ) AS rnk
      FROM kb_document_chunks c
      JOIN kb_documents d ON d.id = c.document_id
      WHERE c.team_id = ${opts.filters.teamId}
        AND d.status = 'ready'
        AND to_tsvector('english', c.text) @@ websearch_to_tsquery('english', ${opts.query})
        ${docTypesFilter}
        ${projectFilter}
        ${clientFilter}
        ${sinceFilter}
      ORDER BY ts_rank_cd(to_tsvector('english', c.text), websearch_to_tsquery('english', ${opts.query})) DESC
      LIMIT ${perList}
    ),
    fused AS (
      SELECT
        chunk_id,
        document_id,
        text,
        heading_path,
        SUM(score) AS score
      FROM (
        SELECT chunk_id, document_id, text, heading_path,
               1.0 / (${RRF_K} + rnk) AS score FROM vec
        UNION ALL
        SELECT chunk_id, document_id, text, heading_path,
               1.0 / (${RRF_K} + rnk) AS score FROM fts
      ) merged
      GROUP BY chunk_id, document_id, text, heading_path
    ),
    per_doc AS (
      SELECT DISTINCT ON (document_id)
        document_id, chunk_id, text, heading_path, score
      FROM fused
      ORDER BY document_id, score DESC
    )
    SELECT
      p.document_id,
      p.chunk_id,
      d.title,
      d.doc_type,
      d.project_id,
      d.client_id,
      LEFT(p.text, 400) AS snippet,
      p.heading_path,
      p.score::float AS score
    FROM per_doc p
    JOIN kb_documents d ON d.id = p.document_id
    ORDER BY p.score DESC
    LIMIT ${topK}
  `);

  return (rows.rows ?? rows).map((r) => ({
    documentId: r.document_id,
    title: r.title,
    docType: r.doc_type,
    projectId: r.project_id,
    clientId: r.client_id,
    snippet: r.snippet,
    headingPath: r.heading_path,
    score: r.score,
    topChunkId: r.chunk_id,
  }));
}
