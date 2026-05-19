/**
 * Constancia Enterprise Brain — Shared Institutional Memory
 *
 * RINGFENCED SCHEMA — Deployed to a dedicated Neon project (constancia-brain),
 * not the main website database. All tables prefixed `kb_` (knowledge base).
 *
 * See `docs/enterprise-brain-architecture.md` for design rationale, and
 * `docs/enterprise-brain-baseline-repos.md` for the reference repos studied.
 *
 * Companion SQL migration: `migrations/brain/0001_extensions_and_indexes.sql`
 * — installs pgvector, creates HNSW vector indexes and GIN tsvector indexes
 * that Drizzle cannot express natively.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  index,
  uniqueIndex,
  real,
  vector,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS & CONSTANTS
// ============================================

export const KB_DOC_TYPES = [
  "sow",
  "rtm",
  "tech_spec",
  "func_spec",
  "script",
  "note",
  "meeting",
  "presentation",
  "report",
  "email",
  "other",
] as const;
export type KbDocType = (typeof KB_DOC_TYPES)[number];

export const KB_DOC_STATUSES = [
  "pending",
  "ingesting",
  "ready",
  "failed",
  "archived",
] as const;
export type KbDocStatus = (typeof KB_DOC_STATUSES)[number];

export const KB_DOC_SOURCES = [
  "upload",
  "batch_cli",
  "sharepoint",
  "gdrive",
  "fireflies",
  "clickup",
  "claude_note",
  "url",
] as const;
export type KbDocSource = (typeof KB_DOC_SOURCES)[number];

export const KB_VISIBILITY = ["team", "restricted", "public_internal"] as const;
export type KbVisibility = (typeof KB_VISIBILITY)[number];

export const KB_SENSITIVITY = ["public_internal", "confidential", "restricted"] as const;
export type KbSensitivity = (typeof KB_SENSITIVITY)[number];

export const KB_USER_ROLES = ["viewer", "contributor", "admin"] as const;
export type KbUserRole = (typeof KB_USER_ROLES)[number];

export const KB_SCRIPT_LANGUAGES = [
  "onestream_vb",
  "onestream_cs",
  "sql",
  "python",
  "dax",
  "mdx",
  "javascript",
  "typescript",
  "powershell",
  "shell",
  "other",
] as const;
export type KbScriptLanguage = (typeof KB_SCRIPT_LANGUAGES)[number];

export const KB_SCRIPT_DIALECTS = [
  "tsql",
  "postgres",
  "snowflake",
  "bigquery",
  "oracle",
  "mysql",
  "sqlite",
  "spark_sql",
  "duckdb",
  "n_a",
] as const;
export type KbScriptDialect = (typeof KB_SCRIPT_DIALECTS)[number];

export const KB_RISK_LEVELS = ["low", "medium", "high"] as const;
export type KbRiskLevel = (typeof KB_RISK_LEVELS)[number];

export const KB_INGESTION_STAGES = [
  "queued",
  "downloading",
  "extracting",
  "chunking",
  "embedding",
  "classifying",
  "done",
  "failed",
] as const;
export type KbIngestionStage = (typeof KB_INGESTION_STAGES)[number];

export const KB_RELATIONSHIP_TYPES = [
  "supersedes",
  "references",
  "implements",
  "derives_from",
  "contradicts",
  "extends",
  "related_to",
] as const;
export type KbRelationshipType = (typeof KB_RELATIONSHIP_TYPES)[number];

// OpenAI text-embedding-3-small dimensions. Keep in sync with embedding code.
export const KB_EMBEDDING_DIMENSIONS = 1536 as const;

// ============================================
// TEAMS & USERS
// ============================================

export const kbTeams = pgTable("kb_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKbTeamSchema = createInsertSchema(kbTeams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbTeam = z.infer<typeof insertKbTeamSchema>;
export type KbTeam = typeof kbTeams.$inferSelect;

export const kbUsers = pgTable(
  "kb_users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "restrict" }),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("contributor"),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_users_team").on(t.teamId),
    uniqueIndex("uq_kb_users_email_per_team").on(t.teamId, t.email),
  ],
);

export const insertKbUserSchema = createInsertSchema(kbUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbUser = z.infer<typeof insertKbUserSchema>;
export type KbUser = typeof kbUsers.$inferSelect;

// ============================================
// CLIENTS & PROJECTS (the business context for documents)
// ============================================

export const kbClients = pgTable(
  "kb_clients",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"),
    industry: text("industry"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_clients_team").on(t.teamId),
    uniqueIndex("uq_kb_clients_code_per_team").on(t.teamId, t.code),
  ],
);

export const insertKbClientSchema = createInsertSchema(kbClients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbClient = z.infer<typeof insertKbClientSchema>;
export type KbClient = typeof kbClients.$inferSelect;

export const kbProjects = pgTable(
  "kb_projects",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    clientId: varchar("client_id").references(() => kbClients.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"), // active|on_hold|closed
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_projects_team").on(t.teamId),
    index("idx_kb_projects_client").on(t.clientId),
    uniqueIndex("uq_kb_projects_code_per_team").on(t.teamId, t.code),
  ],
);

export const insertKbProjectSchema = createInsertSchema(kbProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbProject = z.infer<typeof insertKbProjectSchema>;
export type KbProject = typeof kbProjects.$inferSelect;

// ============================================
// TAXONOMY: hierarchical categories + flat tags
// ============================================

export const kbCategories = pgTable(
  "kb_categories",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    parentId: varchar("parent_id"),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_categories_team").on(t.teamId),
    index("idx_kb_categories_parent").on(t.parentId),
    uniqueIndex("uq_kb_categories_slug_per_team").on(t.teamId, t.slug),
  ],
);

export const insertKbCategorySchema = createInsertSchema(kbCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbCategory = z.infer<typeof insertKbCategorySchema>;
export type KbCategory = typeof kbCategories.$inferSelect;

export const kbTags = pgTable(
  "kb_tags",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_tags_team").on(t.teamId),
    uniqueIndex("uq_kb_tags_slug_per_team").on(t.teamId, t.slug),
  ],
);

export const insertKbTagSchema = createInsertSchema(kbTags).omit({
  id: true,
  createdAt: true,
});
export type InsertKbTag = z.infer<typeof insertKbTagSchema>;
export type KbTag = typeof kbTags.$inferSelect;

// ============================================
// DATA DICTIONARY (the self-explaining glossary)
// ============================================

export const kbDictionaryTerms = pgTable(
  "kb_dictionary_terms",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    expansion: text("expansion"),
    definition: text("definition").notNull(),
    domain: text("domain").notNull(), // delivery|finance|onestream|sql|sales|general
    synonyms: text("synonyms").array().default(sql`'{}'::text[]`),
    exampleSnippets: text("example_snippets").array().default(sql`'{}'::text[]`),
    relatedCategoryIds: text("related_category_ids").array().default(sql`'{}'::text[]`),
    sourceDocumentId: varchar("source_document_id"),
    isCanonical: boolean("is_canonical").notNull().default(true),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_dictionary_team").on(t.teamId),
    index("idx_kb_dictionary_domain").on(t.domain),
    uniqueIndex("uq_kb_dictionary_term_per_team_domain").on(
      t.teamId,
      t.domain,
      t.term,
    ),
  ],
);

export const insertKbDictionaryTermSchema = createInsertSchema(kbDictionaryTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbDictionaryTerm = z.infer<typeof insertKbDictionaryTermSchema>;
export type KbDictionaryTerm = typeof kbDictionaryTerms.$inferSelect;

// ============================================
// DOCUMENTS (the main artefact table)
// ============================================

export const kbDocuments = pgTable(
  "kb_documents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    projectId: varchar("project_id").references(() => kbProjects.id, {
      onDelete: "set null",
    }),
    clientId: varchar("client_id").references(() => kbClients.id, {
      onDelete: "set null",
    }),
    ownerUserId: varchar("owner_user_id").references(() => kbUsers.id, {
      onDelete: "set null",
    }),

    // What it is
    docType: text("doc_type").notNull(),
    title: text("title").notNull(),
    summary: text("summary"), // LLM-generated; regenerated on update
    language: text("language").notNull().default("en"),

    // Source
    source: text("source").notNull(),
    sourceUri: text("source_uri"), // r2://bucket/sha256/...
    sourceMetadata: jsonb("source_metadata"), // connector-specific blob
    originalFilename: text("original_filename"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    contentSha256: text("content_sha256").notNull(),

    // Lifecycle
    status: text("status").notNull().default("pending"),
    visibility: text("visibility").notNull().default("team"),
    sensitivity: text("sensitivity").notNull().default("public_internal"),
    docVersion: integer("doc_version").notNull().default(1),

    // Quick-search denormalisation (kept in sync by application)
    tagsCache: text("tags_cache").array().default(sql`'{}'::text[]`),
    categoryPathCache: text("category_path_cache"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ingestedAt: timestamp("ingested_at"),
    archivedAt: timestamp("archived_at"),
  },
  (t) => [
    index("idx_kb_documents_team").on(t.teamId),
    index("idx_kb_documents_project").on(t.projectId),
    index("idx_kb_documents_client").on(t.clientId),
    index("idx_kb_documents_doc_type").on(t.docType),
    index("idx_kb_documents_status").on(t.status),
    index("idx_kb_documents_owner").on(t.ownerUserId),
    index("idx_kb_documents_created").on(t.createdAt),
    uniqueIndex("uq_kb_documents_sha256_per_team").on(t.teamId, t.contentSha256),
  ],
);

export const insertKbDocumentSchema = createInsertSchema(kbDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ingestedAt: true,
  archivedAt: true,
});
export type InsertKbDocument = z.infer<typeof insertKbDocumentSchema>;
export type KbDocument = typeof kbDocuments.$inferSelect;

// Document version history — captures successive edits to a document
export const kbDocumentVersions = pgTable(
  "kb_document_versions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: varchar("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentSha256: text("content_sha256").notNull(),
    sourceUri: text("source_uri"),
    changedByUserId: varchar("changed_by_user_id").references(() => kbUsers.id, {
      onDelete: "set null",
    }),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_doc_versions_doc").on(t.documentId),
    uniqueIndex("uq_kb_doc_versions_doc_version").on(t.documentId, t.version),
  ],
);

export const insertKbDocumentVersionSchema = createInsertSchema(kbDocumentVersions).omit({
  id: true,
  createdAt: true,
});
export type InsertKbDocumentVersion = z.infer<typeof insertKbDocumentVersionSchema>;
export type KbDocumentVersion = typeof kbDocumentVersions.$inferSelect;

// ============================================
// CHUNKS (embedded text for hybrid search)
// ============================================

export const kbDocumentChunks = pgTable(
  "kb_document_chunks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: varchar("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),

    text: text("text").notNull(),
    tokenCount: integer("token_count"),
    headingPath: text("heading_path"),
    pageStart: integer("page_start"),
    pageEnd: integer("page_end"),

    // OpenAI text-embedding-3-small — 1536 dims
    embedding: vector("embedding", { dimensions: KB_EMBEDDING_DIMENSIONS }),

    embeddingModel: text("embedding_model"), // e.g. "openai/text-embedding-3-small"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_chunks_doc").on(t.documentId),
    index("idx_kb_chunks_team").on(t.teamId),
    uniqueIndex("uq_kb_chunks_doc_chunk").on(t.documentId, t.chunkIndex),
    // HNSW cosine index added in raw SQL migration — Drizzle's vector ops
    // emitter is reliable here but the migration is the canonical source.
    index("idx_kb_chunks_embedding").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    // GIN tsvector index is added as an expression index in the SQL
    // migration since Drizzle cannot express `USING gin(to_tsvector(...))`.
  ],
);

export const insertKbDocumentChunkSchema = createInsertSchema(kbDocumentChunks).omit({
  id: true,
  createdAt: true,
});
export type InsertKbDocumentChunk = z.infer<typeof insertKbDocumentChunkSchema>;
export type KbDocumentChunk = typeof kbDocumentChunks.$inferSelect;

// ============================================
// JUNCTION TABLES (doc ↔ categories, doc ↔ tags)
// ============================================

export const kbDocCategories = pgTable(
  "kb_doc_categories",
  {
    documentId: varchar("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id")
      .notNull()
      .references(() => kbCategories.id, { onDelete: "cascade" }),
    confidence: real("confidence"), // 0..1 if auto-tagged; NULL if human-set
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_kb_doc_categories").on(t.documentId, t.categoryId),
    index("idx_kb_doc_categories_cat").on(t.categoryId),
  ],
);

export const kbDocTags = pgTable(
  "kb_doc_tags",
  {
    documentId: varchar("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id")
      .notNull()
      .references(() => kbTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_kb_doc_tags").on(t.documentId, t.tagId),
    index("idx_kb_doc_tags_tag").on(t.tagId),
  ],
);

// ============================================
// ENTITIES & RELATIONSHIPS (the knowledge graph)
// ============================================

export const kbEntities = pgTable(
  "kb_entities",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // person|org|product|kpi|system|process
    name: text("name").notNull(),
    canonicalName: text("canonical_name"), // for entity-linking dedup
    description: text("description"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_entities_team").on(t.teamId),
    index("idx_kb_entities_type").on(t.entityType),
    uniqueIndex("uq_kb_entities_canonical_per_team").on(
      t.teamId,
      t.entityType,
      t.canonicalName,
    ),
  ],
);

export const insertKbEntitySchema = createInsertSchema(kbEntities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbEntity = z.infer<typeof insertKbEntitySchema>;
export type KbEntity = typeof kbEntities.$inferSelect;

export const kbDocEntities = pgTable(
  "kb_doc_entities",
  {
    documentId: varchar("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    entityId: varchar("entity_id")
      .notNull()
      .references(() => kbEntities.id, { onDelete: "cascade" }),
    confidence: real("confidence"),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_kb_doc_entities").on(t.documentId, t.entityId),
    index("idx_kb_doc_entities_entity").on(t.entityId),
  ],
);

export const kbRelationships = pgTable(
  "kb_relationships",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    fromDocumentId: varchar("from_document_id").references(() => kbDocuments.id, {
      onDelete: "cascade",
    }),
    toDocumentId: varchar("to_document_id").references(() => kbDocuments.id, {
      onDelete: "cascade",
    }),
    fromEntityId: varchar("from_entity_id").references(() => kbEntities.id, {
      onDelete: "cascade",
    }),
    toEntityId: varchar("to_entity_id").references(() => kbEntities.id, {
      onDelete: "cascade",
    }),
    relationshipType: text("relationship_type").notNull(),
    metadata: jsonb("metadata"),
    createdByUserId: varchar("created_by_user_id").references(() => kbUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_rel_team").on(t.teamId),
    index("idx_kb_rel_from_doc").on(t.fromDocumentId),
    index("idx_kb_rel_to_doc").on(t.toDocumentId),
    index("idx_kb_rel_from_entity").on(t.fromEntityId),
    index("idx_kb_rel_to_entity").on(t.toEntityId),
    index("idx_kb_rel_type").on(t.relationshipType),
  ],
);

export const insertKbRelationshipSchema = createInsertSchema(kbRelationships).omit({
  id: true,
  createdAt: true,
});
export type InsertKbRelationship = z.infer<typeof insertKbRelationshipSchema>;
export type KbRelationship = typeof kbRelationships.$inferSelect;

// ============================================
// SCRIPTS (OneStream / SQL / first-class code artefacts)
// ============================================

export const kbScripts = pgTable(
  "kb_scripts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    documentId: varchar("document_id").references(() => kbDocuments.id, {
      onDelete: "set null",
    }),
    projectId: varchar("project_id").references(() => kbProjects.id, {
      onDelete: "set null",
    }),

    name: text("name").notNull(),
    language: text("language").notNull(),
    dialect: text("dialect"),
    purpose: text("purpose").notNull(),
    category: text("category"), // dataload|consolidation|finance_rule|etl|report|other
    parameters: jsonb("parameters"), // [{name,type,required,default,description}]
    prerequisites: text("prerequisites"),

    source: text("source").notNull(),
    exampleUsage: text("example_usage"),
    expectedOutput: text("expected_output"),
    tested: boolean("tested").notNull().default(false),
    lastTestedAt: timestamp("last_tested_at"),
    riskLevel: text("risk_level").notNull().default("low"),

    // Separate embedding so scripts can be searched without docs
    embedding: vector("embedding", { dimensions: KB_EMBEDDING_DIMENSIONS }),
    embeddingModel: text("embedding_model"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_scripts_team").on(t.teamId),
    index("idx_kb_scripts_language").on(t.language),
    index("idx_kb_scripts_dialect").on(t.dialect),
    index("idx_kb_scripts_category").on(t.category),
    index("idx_kb_scripts_doc").on(t.documentId),
    index("idx_kb_scripts_project").on(t.projectId),
    index("idx_kb_scripts_embedding").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const insertKbScriptSchema = createInsertSchema(kbScripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbScript = z.infer<typeof insertKbScriptSchema>;
export type KbScript = typeof kbScripts.$inferSelect;

export const kbScriptVersions = pgTable(
  "kb_script_versions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    scriptId: varchar("script_id")
      .notNull()
      .references(() => kbScripts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    source: text("source").notNull(),
    diff: text("diff"),
    testResults: jsonb("test_results"),
    changedByUserId: varchar("changed_by_user_id").references(() => kbUsers.id, {
      onDelete: "set null",
    }),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_script_versions_script").on(t.scriptId),
    uniqueIndex("uq_kb_script_versions_script_version").on(t.scriptId, t.version),
  ],
);

export const insertKbScriptVersionSchema = createInsertSchema(kbScriptVersions).omit({
  id: true,
  createdAt: true,
});
export type InsertKbScriptVersion = z.infer<typeof insertKbScriptVersionSchema>;
export type KbScriptVersion = typeof kbScriptVersions.$inferSelect;

// ============================================
// INGESTION JOBS (pipeline state machine)
// ============================================

export const kbIngestionJobs = pgTable(
  "kb_ingestion_jobs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    documentId: varchar("document_id").references(() => kbDocuments.id, {
      onDelete: "cascade",
    }),
    submittedByUserId: varchar("submitted_by_user_id").references(() => kbUsers.id, {
      onDelete: "set null",
    }),

    stage: text("stage").notNull().default("queued"),
    sourceUri: text("source_uri"),
    requestedBy: text("requested_by"), // free-form: cli|web|connector
    payload: jsonb("payload"),

    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    progressPct: integer("progress_pct").notNull().default(0),

    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_jobs_team").on(t.teamId),
    index("idx_kb_jobs_stage").on(t.stage),
    index("idx_kb_jobs_document").on(t.documentId),
    index("idx_kb_jobs_created").on(t.createdAt),
  ],
);

export const insertKbIngestionJobSchema = createInsertSchema(kbIngestionJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  finishedAt: true,
});
export type InsertKbIngestionJob = z.infer<typeof insertKbIngestionJobSchema>;
export type KbIngestionJob = typeof kbIngestionJobs.$inferSelect;

// ============================================
// AUDIT + SEARCH LOG (governance & learning)
// ============================================

export const kbAuditLog = pgTable(
  "kb_audit_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => kbUsers.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // mcp.search|mcp.get|doc.create|doc.update|...
    resourceType: text("resource_type"), // document|script|entity|...
    resourceId: varchar("resource_id"),
    argsHash: text("args_hash"), // sha256 of normalised args; we don't store PII
    resultCount: integer("result_count"),
    latencyMs: integer("latency_ms"),
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_audit_team").on(t.teamId),
    index("idx_kb_audit_user").on(t.userId),
    index("idx_kb_audit_action").on(t.action),
    index("idx_kb_audit_resource").on(t.resourceType, t.resourceId),
    index("idx_kb_audit_created").on(t.createdAt),
  ],
);

export const insertKbAuditLogSchema = createInsertSchema(kbAuditLog).omit({
  id: true,
  createdAt: true,
});
export type InsertKbAuditLog = z.infer<typeof insertKbAuditLogSchema>;
export type KbAuditLog = typeof kbAuditLog.$inferSelect;

export const kbSearchLog = pgTable(
  "kb_search_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => kbTeams.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => kbUsers.id, {
      onDelete: "set null",
    }),
    query: text("query").notNull(),
    filters: jsonb("filters"),
    resultCount: integer("result_count").notNull().default(0),
    topResultId: varchar("top_result_id"),
    latencyMs: integer("latency_ms"),
    source: text("source"), // mcp|web|cli
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_search_team").on(t.teamId),
    index("idx_kb_search_user").on(t.userId),
    index("idx_kb_search_created").on(t.createdAt),
  ],
);

export const insertKbSearchLogSchema = createInsertSchema(kbSearchLog).omit({
  id: true,
  createdAt: true,
});
export type InsertKbSearchLog = z.infer<typeof insertKbSearchLogSchema>;
export type KbSearchLog = typeof kbSearchLog.$inferSelect;

// ============================================
// ACL OVERRIDES (default ACL is team-wide)
// ============================================

export const kbDocAcl = pgTable(
  "kb_doc_acl",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: varchar("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => kbUsers.id, {
      onDelete: "cascade",
    }),
    role: text("role"), // optional team-role grant: viewer|contributor|admin
    permission: text("permission").notNull(), // read|write|admin
    grantedByUserId: varchar("granted_by_user_id").references(() => kbUsers.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_kb_doc_acl_doc").on(t.documentId),
    index("idx_kb_doc_acl_user").on(t.userId),
  ],
);

export const insertKbDocAclSchema = createInsertSchema(kbDocAcl).omit({
  id: true,
  createdAt: true,
});
export type InsertKbDocAcl = z.infer<typeof insertKbDocAclSchema>;
export type KbDocAcl = typeof kbDocAcl.$inferSelect;
