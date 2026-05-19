-- Constancia Brain — extensions and indexes that Drizzle cannot express
--
-- Run this AFTER `npm run brain:push` has created the kb_* tables.
-- Idempotent: every statement uses IF NOT EXISTS or equivalent.
--
-- Order: extensions first, then expression indexes that depend on them.

-- ============================================================
-- Extensions
-- ============================================================

-- pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- pg_trgm for fast ILIKE + similarity matching on names/titles
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- Full-text search expression indexes (GIN on tsvector)
--
-- We store `text` plain and index its tsvector via an expression
-- index. This keeps the Drizzle schema minimal and avoids a
-- generated column or trigger.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_kb_chunks_tsv
  ON kb_document_chunks
  USING gin (to_tsvector('english', text));

CREATE INDEX IF NOT EXISTS idx_kb_documents_title_tsv
  ON kb_documents
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')));

CREATE INDEX IF NOT EXISTS idx_kb_scripts_search_tsv
  ON kb_scripts
  USING gin (to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(purpose, '') || ' ' ||
    coalesce(prerequisites, '')
  ));

CREATE INDEX IF NOT EXISTS idx_kb_dictionary_search_tsv
  ON kb_dictionary_terms
  USING gin (to_tsvector('english',
    coalesce(term, '') || ' ' ||
    coalesce(expansion, '') || ' ' ||
    coalesce(definition, '')
  ));

-- ============================================================
-- Trigram indexes for fuzzy name / title lookup
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_kb_documents_title_trgm
  ON kb_documents
  USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_kb_clients_name_trgm
  ON kb_clients
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_kb_projects_name_trgm
  ON kb_projects
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_kb_entities_name_trgm
  ON kb_entities
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_kb_dictionary_term_trgm
  ON kb_dictionary_terms
  USING gin (term gin_trgm_ops);

-- ============================================================
-- Notes
-- ============================================================
-- HNSW vector indexes on kb_document_chunks.embedding and
-- kb_scripts.embedding are created by drizzle-kit from the schema's
-- `.using("hnsw", ...)` declarations. If they fail there (older Drizzle
-- versions), uncomment the following:
--
-- CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding
--   ON kb_document_chunks
--   USING hnsw (embedding vector_cosine_ops);
--
-- CREATE INDEX IF NOT EXISTS idx_kb_scripts_embedding
--   ON kb_scripts
--   USING hnsw (embedding vector_cosine_ops);
