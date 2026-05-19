# Constancia Enterprise Brain — Architecture & Remediation Plan

> Status: Draft for review — four design choices locked (see §0)
> Branch: `claude/setup-enterprise-database-X3RS9`
> Owner: Engineering
> Scope: Shared institutional memory for every Claude Code cloud instance,
> consumable from chat, code and co-work sessions; ingestion of SOWs, RTMs,
> technical/functional specs, OneStream and SQL scripts, best-practice
> artefacts; full data dictionary; no local file silos.

---

## 0. Decisions locked

| Decision           | Chosen                                                         |
| ------------------ | -------------------------------------------------------------- |
| Object storage     | **Cloudflare R2** (S3 API, zero egress, no NDA constraint)     |
| Ingestion (v1)     | **Manual upload from laptops** — one-off batch first, then drag-and-drop UI |
| Tenancy            | **Multi-tenant** — `team_id` on every `kb_*` row from day one  |
| Embeddings         | **OpenAI `text-embedding-3-small`** — reuses existing API key  |

Still open (see §13): OneStream seed corpus, hosting boundary (in-process vs split).

---

## 1. Executive summary

Yes, Neon is the right primary store for the structured, queryable side of
this — it is serverless Postgres with native `pgvector`, full-text search,
JSONB, branching and a HTTP query endpoint, all of which match what we need
for a shared "brain" that hundreds of ephemeral Claude Code cloud instances
will hit concurrently.

However, **Neon alone is not the whole answer**. The brain needs three
co-operating layers:

1. **Object storage** for the raw binaries (PDF, DOCX, XLSX, PPTX, code
   files). Storing 50 MB binaries in Postgres is an anti-pattern — it
   bloats backups, breaks branching, and prices badly. Use an S3-compatible
   store (recommend **Cloudflare R2** — S3 API, zero egress, $0.015/GB/mo).
2. **Neon Postgres** for metadata, extracted text, embeddings, taxonomy,
   data dictionary, audit, ACL — everything queryable.
3. **A remote MCP server** (HTTP/SSE) as the single access surface used by
   every Claude Code cloud session. This is the technical lever that lets
   us forbid local file storage: the path of least resistance becomes
   "search the brain" rather than "save a file locally".

The current Constancia website already runs on this exact stack
(`@neondatabase/serverless`, Drizzle, Clerk, Anthropic SDK), so we extend
it rather than start fresh. Existing finance-compass KB tables
(`fc_ai_knowledge_base`, `fc_knowledge_base_search`,
`fc_learnings_corpus`) are a reasonable shape inspiration but should not
be reused — they are product-specific and use plain full-text only. The
enterprise brain is a separate concern that needs vectors, hierarchical
taxonomy, and cross-team RBAC.

---

## 2. Why Neon (and what it does not solve)

### Neon is the right choice because

| Need                                | How Neon delivers                                                        |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Serverless, scales 3 → 300 users    | Autoscaling compute (0.25–10 CU on Pro, scale-to-zero idle)              |
| Read-heavy from many clients        | HTTP / WebSocket pooled endpoints; the `@neondatabase/serverless` driver |
| Vector search (semantic recall)     | `pgvector` extension preinstalled; supports `halfvec` for 50% storage    |
| Keyword search (term lookups)       | Native `tsvector` / `to_tsquery`                                         |
| Mixed structured + unstructured     | JSONB + array + relational + vector in one query                         |
| Branching for safe experiments      | Postgres branches per environment (e.g., `main`, `staging`, `pr-123`)    |
| Existing codebase already uses it   | Drizzle schema and `server/db.ts` already wired                          |
| Cost at our scale                   | Sub-$100/mo at 4 users; predictable to ~$500/mo at 50 users              |

### Neon does not solve

- **Binary file storage** — PDFs/PPTXs are large and immutable; they belong
  in object storage with content-addressed keys. Use **Cloudflare R2** (no
  egress fees, S3 API). AWS S3 or Azure Blob are acceptable; given existing
  Microsoft Graph integration, **Azure Blob Storage** is a defensible
  alternative for tenant-of-record reasons.
- **Long-running ingestion jobs** — extraction, OCR, embedding can take
  minutes. Run on a worker process (existing Node server fine for now;
  graduate to a queue + worker when volume justifies).
- **Full-text relevance tuning at the top end** — for >5M chunks or
  multi-tenant ranking, consider Typesense / Meilisearch / OpenSearch
  alongside. **Not needed for 3–4 users**; revisit at 100k+ documents.
- **Local-file prevention** — that is policy + Claude Code hooks, not the
  database.

---

## 3. High-level architecture

```
                       Claude Code Cloud Instance (user A)
                       Claude Code Cloud Instance (user B)
                       Claude Code Cloud Instance (user N)
                                    │
                                    │  HTTPS + Bearer (Clerk-issued token)
                                    │  MCP tool calls
                                    ▼
                       ┌────────────────────────────┐
                       │  Brain MCP Server (Node)   │
                       │  - tool: brain.search      │
                       │  - tool: brain.get         │
                       │  - tool: brain.list_*      │
                       │  - tool: brain.ingest_url  │
                       │  - tool: brain.write_note  │
                       │  - tool: brain.run_script  │ (optional, sandboxed)
                       └────────────┬───────────────┘
                                    │
                  ┌─────────────────┼──────────────────┐
                  ▼                 ▼                  ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │  Neon Postgres │ │   Object Store │ │  Embeddings    │
        │  - metadata    │ │   (R2 / Blob)  │ │  provider      │
        │  - chunks+vec  │ │   - raw files  │ │  (Voyage AI    │
        │  - taxonomy    │ │   - thumbnails │ │   or OpenAI    │
        │  - dictionary  │ │   - exports    │ │   text-embed-  │
        │  - audit log   │ │                │ │   3-small)     │
        └────────────────┘ └────────────────┘ └────────────────┘
                  ▲
                  │
        ┌─────────┴──────────┐
        │  Ingestion Workers │
        │  - extract text    │
        │  - chunk + embed   │
        │  - auto-classify   │
        │  - extract entities│
        │  - dedupe          │
        └────────────────────┘
                  ▲
                  │
        ┌─────────┴──────────┐
        │  Ingestion API     │
        │  - POST /ingest    │
        │  - signed R2 URL   │
        │  - source webhooks │  (SharePoint, GDrive, Fireflies, ClickUp)
        └────────────────────┘
```

The brain runs as part of the existing `server/` workspace — a new
`server/brain/` module — and reuses the existing Express, Clerk and
Drizzle plumbing. We **do not** spin up a separate service for v1.

---

## 4. Neon project layout

Recommend **a separate Neon project** (`constancia-brain`) rather than
adding tables to the existing website project, because:

- Different blast radius — the brain holding client SOWs warrants stricter
  IAM than the marketing site backend.
- Different scaling profile — vector search is CPU-bound; we may want a
  larger compute size for the brain branch than for the site.
- Cleaner migrations — Drizzle pointing at one schema per project.
- Easier to grant a third-party (e.g., a future analytics tool) read-only
  access to one and not the other.

Branches inside the brain project:

- `main`            → production, what every Claude Code session reads
- `staging`         → mirror used by the dev branch of the MCP server
- `ephemeral/*`     → per-PR branches for schema changes

Connection wiring lives next to the existing `server/db.ts`:

```ts
// server/brain/db.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as brainSchema from "@shared/brain-schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.BRAIN_DATABASE_URL });
export const brainDb = drizzle(pool, { schema: brainSchema });
```

---

## 5. Schema — the data dictionary

All tables prefixed `kb_` (knowledge base). Definitions are Drizzle/Postgres.
Only the load-bearing columns are shown; full DDL ships in
`shared/brain-schema.ts` once the design is approved.

### 5.1 Core entities

| Table                 | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `kb_users`            | One row per human; FK to Clerk user id; `team_id`, `role`            |
| `kb_teams`            | Tenants/teams; supports future multi-org                             |
| `kb_clients`          | Customers/engagements that artefacts relate to                       |
| `kb_projects`         | Project / engagement codes — the unit of work                        |
| `kb_documents`        | One row per logical artefact (a SOW v3 is one row; v2 is another)    |
| `kb_document_versions`| Audit trail of edits to a `kb_documents` row                         |
| `kb_document_chunks`  | Embedded chunks for semantic + keyword search                        |
| `kb_categories`       | Hierarchical taxonomy (parent_id self-ref); the data dictionary tree |
| `kb_doc_categories`   | M:N between documents and categories                                 |
| `kb_tags`             | Flat tags (orthogonal to categories)                                 |
| `kb_doc_tags`         | M:N                                                                  |
| `kb_dictionary_terms` | Glossary: term → definition → context (e.g., RTM, SOW, FSD)          |
| `kb_entities`         | Extracted entities (people, orgs, products, KPIs)                    |
| `kb_doc_entities`     | M:N + extraction confidence                                          |
| `kb_relationships`    | Typed edges between docs/projects/clients (supersedes, references)   |
| `kb_scripts`          | First-class scripts (OneStream business rules, SQL, etc.)            |
| `kb_script_versions`  | Versioned source + tests + run results                               |
| `kb_ingestion_jobs`   | Pipeline state machine                                               |
| `kb_search_log`       | Every query (helps us see what people look for)                      |
| `kb_audit_log`        | Every read & write per user — required for governance                |
| `kb_doc_acl`          | Optional per-doc overrides; default ACL is team-wide                 |

### 5.2 `kb_documents` shape (sketch)

```ts
export const kbDocuments = pgTable("kb_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => kbTeams.id),
  projectId: varchar("project_id").references(() => kbProjects.id),
  clientId: varchar("client_id").references(() => kbClients.id),

  // What it is
  docType: text("doc_type").notNull(),        // sow | rtm | tech_spec | func_spec | script | note | meeting | other
  title: text("title").notNull(),
  summary: text("summary"),                    // LLM-generated, regenerated on update
  language: text("language").default("en"),

  // Source
  source: text("source").notNull(),            // upload | sharepoint | gdrive | fireflies | clickup | claude_note
  sourceUri: text("source_uri"),               // r2://bucket/sha256/...
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  contentSha256: text("content_sha256").notNull().unique(),  // dedup key

  // Lifecycle
  status: text("status").notNull().default("ready"),  // pending|ingesting|ready|failed|archived
  ownerUserId: varchar("owner_user_id").references(() => kbUsers.id),
  visibility: text("visibility").default("team").notNull(),  // team | restricted | public_internal
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ingestedAt: timestamp("ingested_at"),

  // Quick-search denormalisation
  tagsCache: text("tags_cache").array(),
  categoryPathCache: text("category_path_cache"),  // "Engagement Artefacts / SOW"
});
```

### 5.3 `kb_document_chunks`

```ts
export const kbDocumentChunks = pgTable("kb_document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => kbDocuments.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),

  text: text("text").notNull(),                 // raw chunk content
  tokenCount: integer("token_count"),
  headingPath: text("heading_path"),            // "Section 3 / 3.2 Scope"
  pageStart: integer("page_start"),
  pageEnd: integer("page_end"),

  // Hybrid search columns
  embedding: customVector("embedding", 1536),   // halfvec for storage savings
  ts: tsvector("ts"),                           // generated from `text`

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("kb_chunks_doc").on(t.documentId),
  index("kb_chunks_ts").using("gin", t.ts),
  // HNSW vector index added in raw SQL migration:
  // CREATE INDEX kb_chunks_vec ON kb_document_chunks USING hnsw (embedding halfvec_cosine_ops);
]);
```

### 5.4 `kb_scripts` — OneStream / SQL first-class

OneStream business rules, finance rules, SQL helpers etc. deserve their
own table because they have parameters, dialects and tested-or-not flags
that documents don't.

```ts
export const kbScripts = pgTable("kb_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  documentId: varchar("document_id").references(() => kbDocuments.id),

  name: text("name").notNull(),
  language: text("language").notNull(),         // onestream_vb | onestream_cs | sql | python | dax | mdx
  dialect: text("dialect"),                     // tsql | postgres | snowflake | bigquery | oracle
  purpose: text("purpose").notNull(),           // human description
  category: text("category"),                   // dataload | consolidation | finance_rule | etl | report
  parameters: jsonb("parameters"),              // [{name, type, required, default, description}]
  prerequisites: text("prerequisites"),         // env / tables / cubes it needs

  source: text("source").notNull(),             // the actual code
  exampleUsage: text("example_usage"),
  expectedOutput: text("expected_output"),
  tested: boolean("tested").default(false),
  lastTestedAt: timestamp("last_tested_at"),
  riskLevel: text("risk_level").default("low"), // low|medium|high — surfaced in MCP results
  embedding: customVector("embedding", 1536),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 5.5 `kb_dictionary_terms` — the explicit data dictionary

This is the table that makes the brain *self-explaining* when Claude
looks something up.

```ts
export const kbDictionaryTerms = pgTable("kb_dictionary_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  term: text("term").notNull(),                 // "RTM"
  expansion: text("expansion"),                 // "Requirements Traceability Matrix"
  definition: text("definition").notNull(),     // 1–3 sentence canonical definition
  domain: text("domain").notNull(),             // delivery | finance | onestream | sql | sales
  synonyms: text("synonyms").array(),
  exampleSnippets: text("example_snippets").array(),
  relatedCategoryIds: text("related_category_ids").array(),
  sourceDocumentId: varchar("source_document_id").references(() => kbDocuments.id),
  isCanonical: boolean("is_canonical").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Pre-seed with the obvious ones: SOW, RTM, FSD, TSD, BR (Business Rule),
KPI, etc., each scoped by `domain`.

---

## 6. Ingestion pipeline

```
[upload OR connector poll]
        │
        ▼
1. Receive — POST /api/brain/ingest (or signed-URL upload)
        │
        ▼
2. Store binary — write to R2 at sha256(content) key; dedupe by hash
        │
        ▼
3. Create kb_documents row (status=pending) + kb_ingestion_jobs row
        │
        ▼
4. Worker picks up:
   a. extract text (pdf / docx / xlsx / pptx / md / txt / source-code)
   b. detect language
   c. chunk (semantic recursive, 512–1024 tokens, 15% overlap)
   d. embed each chunk via Voyage AI or OpenAI text-embedding-3-small
   e. write kb_document_chunks rows in a single transaction
   f. call Claude to:
       - generate `summary`
       - propose categories & tags from the taxonomy
       - extract entities
       - if doc_type=script: extract parameters, language, dialect
   g. flip kb_documents.status = ready
        │
        ▼
5. Optional: human review queue for low-confidence categorisation
```

Extractors we already have or need:

| Type        | Library                                       | Status                          |
| ----------- | --------------------------------------------- | ------------------------------- |
| PDF         | `pdfkit` (write) + `pdf-parse` or `pdfjs-dist`| Need to add a reader            |
| DOCX        | `mammoth`                                     | Add                             |
| XLSX        | `exceljs`                                     | Already in deps                 |
| PPTX        | `pptxgenjs` writes; for reading use `officeparser` | Add (or convert via Tika)  |
| Code/text   | direct read                                   | Native                          |
| Images/scans| Tesseract / Azure Computer Vision OCR         | Phase 3                         |

For very heterogeneous inputs (forms, scanned PDFs), defer to
**Unstructured.io** or **Apache Tika** as a microservice once volume
justifies — out of scope for v1.

---

## 7. Access from Claude Code cloud — the MCP server

This is the linchpin. Claude Code on the Web (and desktop/CLI) natively
supports **remote MCP servers** added to a project or to a user's global
config. The brain ships as one MCP server.

### 7.1 Why MCP, not "just an API"

- Claude Code calls MCP tools transparently inside the agent loop — the
  model decides when to search the brain mid-task.
- Centralised: every cloud instance hits the same URL. Users do not
  install anything, copy files, or maintain local indexes.
- Token-friendly: tool returns small, ranked excerpts plus pointers, not
  whole documents.
- Auditable: every MCP call is logged with the calling user identity.

### 7.2 Tool surface (v1)

```
brain.search({ query, k?, doc_types?, project?, client?, since? })
   → ranked array of { doc_id, title, snippet, score, why, citation }

brain.get({ doc_id, include?: ["full_text" | "metadata" | "chunks"] })
   → full document object

brain.list_categories({ parent_id? })
   → category tree

brain.list_recent({ limit?, doc_type?, project? })
   → recently ingested or updated docs

brain.list_scripts({ language?, dialect?, category? })
   → script index

brain.get_script({ script_id })
   → full script with parameters + example usage

brain.dictionary({ term })
   → canonical definition + example snippets + related docs

brain.write_note({ project_id, title, content, tags? })
   → creates a kb_documents row of doc_type=note; this is how
     Claude Code persists learnings instead of writing local files

brain.ingest_url({ url, project_id?, suggested_tags? })
   → fetch + run pipeline (rate-limited; web only, not arbitrary paths)
```

`brain.write_note` is the **primary mechanism** for "don't keep things on
your local machine" — Claude is told (via the system prompt / project
`CLAUDE.md`) that durable knowledge is saved via `brain.write_note`, not
via `Write` to disk.

### 7.3 Auth

- Clerk issues a session JWT to the user.
- A small `/api/brain/mcp-token` endpoint exchanges that for a long-lived,
  scoped Bearer token bound to `kb_users.id` + `team_id`.
- MCP server verifies the Bearer, resolves user → team, applies row-level
  filters on every query.
- All MCP calls write to `kb_audit_log`.

### 7.4 Deployment

For v1, mount the MCP server as a route group under the existing Express
app: `POST /mcp/brain` (and SSE GET). No new infra. When it outgrows the
website's app, lift it to a dedicated Worker or container behind the same
Clerk auth.

---

## 8. Preventing local-file accumulation

Three layered controls — none alone is sufficient.

### 8.1 Policy (the cheapest, set first)

A short, repo-committed `CLAUDE.md` in every Constancia repo and a
team-wide one in `~/.claude/CLAUDE.md` shipped via dotfile sync. Content:

> Durable knowledge — specs, scripts, decisions, lessons — must be
> written to the brain via `brain.write_note` or `brain.ingest_*`.
> Do not save `.md`, `.txt`, `.docx`, `.xlsx`, or `.sql` files outside
> `/workspace/scratch/`. Files under `/workspace/scratch/` are wiped
> when the session ends and exist only for current-turn working memory.

### 8.2 Tooling — Claude Code hooks

A `PreToolUse` hook installed in the team `settings.json` rejects `Write`
and `Edit` outside an allow-list. Sketch:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/check-no-local-knowledge.sh"
          }
        ]
      }
    ]
  }
}
```

The script blocks paths matching `*.sow.docx`, `*.rtm.xlsx`, `*spec*.md`
outside the brain workspace, and prints a message redirecting the model
to `brain.write_note`. Distribute via the existing `update-config` skill
or a simple `claude/setup-config` startup hook in each repo.

### 8.3 Architecture — make the brain the easy path

The biggest lever: `brain.write_note`, `brain.ingest_url` and
`brain.upload` are **always present**, **always cited in the system
prompt**, and **return results faster than writing to disk feels worth
it**. Models naturally route to whatever tool returns relevant context
in the fewest tokens.

In short: the cloud session is ephemeral anyway — once that fact lands
in muscle memory, "saving locally" stops being a thing people want to
do. Hooks just enforce that fact for the few times it might happen.

---

## 9. Embeddings provider — recommendation

| Option                        | Pros                                       | Cons                                | Verdict                |
| ----------------------------- | ------------------------------------------ | ----------------------------------- | ---------------------- |
| **OpenAI text-embedding-3-small** | Cheap ($0.02/M tokens), already in stack | Vendor split from Anthropic         | **Pragmatic v1 pick**  |
| **Voyage AI voyage-3-large**  | Anthropic's recommended partner; strong reranker | New vendor account; ~3× cost   | Best for v2 upgrade    |
| Self-hosted `bge-large-en`    | Free at-rest                               | Ops cost; slower; we'd run a GPU    | Skip for now           |

Start with OpenAI for v1 because the key is already configured
(`AI_INTEGRATIONS_OPENAI_API_KEY` in `.env.example`). Re-evaluate with
Voyage when we have ≥10k documents and can measure recall against a
golden set.

---

## 10. RBAC, audit, compliance

- **RBAC**: simple `kb_users.role` ∈ `{viewer, contributor, admin}` for
  v1. All members of a team can read all docs by default; restricted
  docs use `kb_doc_acl` for additions. Defer per-project ACLs until
  there is a client that demands it.
- **Audit**: every MCP tool call writes
  `{user_id, tool, args_hash, result_count, latency_ms, ts}` into
  `kb_audit_log`. Cheap; invaluable when the first "who saw client X's
  SOW?" question arrives.
- **PII / confidentiality**: client SOWs may contain personal data.
  Three measures:
  - Encrypt the R2 bucket at rest (KMS-managed key).
  - Mark documents with a `sensitivity` flag (`public_internal | confidential | restricted`); MCP search results redact body when sensitivity > caller's clearance.
  - Add a redaction pass during ingestion that flags emails / phone /
    NIN-like patterns and surfaces them for review (Phase 3).
- **Right to be forgotten**: deletion cascade from `kb_documents` →
  `kb_document_chunks` is straightforward; also purge R2 object and
  record the deletion in `kb_audit_log` to retain the *fact* of deletion.

---

## 11. Scalability checkpoints

| Stage          | Volume                  | What changes                                                          |
| -------------- | ----------------------- | --------------------------------------------------------------------- |
| v1 (today)     | 4 users, ~500 docs      | Single Neon compute, single Node process, OpenAI embeddings           |
| Year 1         | 20 users, 5k docs       | Add HNSW index tuning, move ingestion worker out of API process       |
| Year 2         | 100 users, 50k docs     | Neon autoscaling 1–4 CU; consider Voyage embeddings + reranker        |
| Year 3+        | 250+ users, 500k+ docs  | Optional Typesense/OpenSearch front; MCP server on dedicated infra    |

There is no architectural cliff between any of these stages — each one
is an additive change, not a rewrite.

---

## 12. Cost order-of-magnitude (USD/month, v1)

- Neon (Pro, ~1 CU avg): **~$30**
- Cloudflare R2 (100 GB stored, free egress): **~$1.50**
- OpenAI embeddings (one-off 100 MB text ≈ 25M tokens, $0.50; re-embed
  rarely): **~$1–5/mo recurring**
- Claude (categorisation/summarisation calls; the brain runs Sonnet 4.6
  for batch, Haiku 4.5 for cheap classification): **~$20–40**
- Total: **<$80/mo at v1**

---

## 13. Open questions for you

Four of the original six are now resolved (see §0). Two remain:

1. **OneStream seed corpus** — do we have a starter set of business
   rules / data-management sequences / load files we can ingest on day
   one? Having even 10–20 real scripts lets us validate the
   `kb_scripts` design end-to-end (parameter extraction, dialect
   detection, risk-level surfacing) instead of mocking them.
2. **Hosting boundary** — keep the brain inside the existing Constancia
   website Express process (simplest, reuses Clerk and Drizzle as-is),
   or split into its own deploy on day one? Recommend in-process for
   v1 with a clean module boundary at `server/brain/`; lift to its own
   service only if/when the website's deploy cadence starts to fight
   the brain's.

---

## 14. Phased delivery plan

### Phase 0 — decide (this week)
- [ ] Sign off on this design or call out changes
- [ ] Provision Neon project `constancia-brain` and R2 bucket
- [ ] Pick embedding provider

### Phase 1 — core schema + ingestion (week 1)
- [ ] `shared/brain-schema.ts` with all `kb_*` tables (`team_id` on every row)
- [ ] `drizzle-kit push` migration against new `constancia-brain` Neon project
- [ ] R2 bucket + signed-URL upload helper
- [ ] `server/brain/ingestion/` — upload, store, extract, chunk, embed
       (OpenAI `text-embedding-3-small`)
- [ ] CLI `npm run brain:batch-ingest <dir>` for the initial laptop-to-brain
       sweep (each of us points it at our local `~/Documents/Constancia/`
       once, then we never look at those folders again)
- [ ] Minimal admin UI to drag-and-drop a file and see it indexed
- [ ] Seed `kb_dictionary_terms` with ~30 starter terms

### Phase 2 — MCP server (week 2)
- [ ] `server/brain/mcp/` — implement `brain.search`, `brain.get`,
      `brain.list_categories`, `brain.dictionary`, `brain.write_note`
- [ ] Clerk → MCP token exchange
- [ ] Wire to 3–4 users' Claude Code via remote MCP config
- [ ] Add audit logging on every tool call

### Phase 3 — categorisation + entity extraction (week 3–4)
- [ ] LLM-driven category and tag suggestion
- [ ] Entity extraction → `kb_entities`
- [ ] Auto-summary on ingest
- [ ] Optional human-review queue

### Phase 4 — scripts module (week 5)
- [ ] `kb_scripts` ingestion path for OneStream BR / SQL
- [ ] `brain.list_scripts`, `brain.get_script` MCP tools
- [ ] Parameter extraction
- [ ] Risk-level surfacing in MCP results

### Phase 5 — governance (week 6+)
- [ ] Distribute `CLAUDE.md` + hook config to all team Claude installs
- [ ] Sensitivity flags + redaction pass
- [ ] Per-doc ACLs (`kb_doc_acl`)
- [ ] Read-receipt dashboard from `kb_audit_log`

### Phase 6+ — connectors (as needed)
- [ ] SharePoint connector (we already have MS Graph creds)
- [ ] Google Drive (existing MCP server in this workspace can be re-used)
- [ ] Fireflies meeting transcripts → notes
- [ ] ClickUp tasks → projects/documents linkage

---

## 15. What I am explicitly NOT recommending

- **Storing files in Postgres bytea/jsonb.** Slow, expensive, kills
  branching. Use R2.
- **Building our own vector store.** `pgvector` is mature and fits the
  shape of our other data.
- **A separate microservice on day one.** It buys nothing for 4 users
  and triples ops surface. Module boundary inside the existing app is
  enough.
- **Reusing `fc_ai_knowledge_base`.** It is product-internal and uses
  only full-text search. The brain needs vectors and tenant isolation.
- **Synchronous embedding inside the upload request.** Always queue —
  uploads must return fast.
- **Generating documents from Claude into the brain by default.** Per
  your direction, Claude reads from the brain and writes only structured
  notes/summaries (`brain.write_note`), not arbitrary new docs.

---

## 16. Next step

Read this, mark the questions in §13 and any sections you want changed,
and I will turn the agreed plan into the actual schema, migrations and
MCP server in the order laid out in §14.
