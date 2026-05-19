# Baseline / reference repositories

> Companion to `enterprise-brain-architecture.md`. Snapshot taken May 2026.
> Goal: shortlist of open-source repos to **borrow patterns from** (not
> necessarily fork) when we build the Constancia brain on Neon + R2 + MCP.

Tiered by relevance to our exact stack: TypeScript, Drizzle ORM, Neon
Postgres, Cloudflare R2, OpenAI embeddings, remote MCP server, multi-user.

---

## Tier 1 — Direct baselines (closest stack match, study deeply)

### 1. supermemoryai/supermemory  -  **primary candidate**

- **Stars / license**: 22.6k / MIT
- **Stack**: TypeScript (61%), Remix, Vite, **Drizzle ORM**, Cloudflare Workers, Postgres
- **MCP**: yes — open-source MCP server, OAuth + API key, designed for
  Claude Desktop / Claude Code integration
- **Ingestion**: Drive, Gmail, Notion, OneDrive, GitHub connectors; PDF,
  image (OCR), video (transcription), code (AST-aware chunking)
- **Multi-tenant**: `containerTag` parameter; projects model
- **Why it matters**: stack overlap is unusually high (TS + Drizzle +
  Postgres + MCP). The architecture mirrors our §3 design almost
  one-for-one.
- **Caveats**:
  - The "extraction intelligence" and webhook connectors may lean on
    their SaaS. Need to confirm the self-host story end-to-end before
    treating it as a dropped-in dependency.
  - Cloudflare Workers vs our Express/Node target — borrow patterns,
    not deploy topology.
- **How to use it**: read it cover-to-cover; lift their Drizzle schema
  shape, their MCP tool definitions, and their connector interface.
  Treat as a code-review reference, not a vendored dependency on day one.
- URL: https://github.com/supermemoryai/supermemory

### 2. ankushchhabra02/vortex  -  **compact reference for v1**

- **Stars / license**: 17 / MIT
- **Stack**: TypeScript, Next.js 16, **Supabase Postgres + pgvector +
  tsvector**, BM25 + RRF hybrid search, OpenAI/Google/OpenRouter/local
  embeddings
- **Ingestion**: PDF + plain text + URL only (no DOCX/XLSX)
- **MCP**: none (UI + REST only)
- **Why it matters**: ~20 files; implements **exactly** the v1 retrieval
  approach in §6 (pgvector cosine + tsvector + RRF). Readable in a
  single sitting and excellent as a reference for the SQL we will
  hand-write in Drizzle.
- **Caveats**: single-tenant per deploy, Supabase-specific client (not
  Drizzle), no MCP, no DOCX. Cherry-pick the SQL + chunking; ignore the
  rest.
- URL: https://github.com/ankushchhabra02/vortex

### 3. Azure-Samples/rag-postgres-openai-python  -  **canonical RRF + evals**

- **License**: MIT
- **Stack**: Python (FastAPI) + Postgres + pgvector + OpenAI
- **Why it matters**: the **canonical** implementation of RRF on
  Postgres and an `/evals` harness we should imitate. Pattern is
  portable; the code is not.
- **Use**: read the SQL in their retrieval module and the `/evals`
  layout; reimplement in TypeScript when we get to Phase 1's eval
  harness.
- URL: https://github.com/Azure-Samples/rag-postgres-openai-python

---

## Tier 2 — Memory libraries (consider as dependency, not fork)

### 4. mem0ai/mem0

- **Stars / license**: 56.2k / Apache 2.0
- **Stack**: Python-dominant (55%), TypeScript SDK (34%)
- **Model**: layer-on-top — fact extraction, hybrid (vector + BM25 +
  entity) search, multi-user via `user_id`
- **Verdict for us**: agent-loop oriented (remembers conversational
  facts). Less natural fit for a doc-corpus brain with SOWs, RTMs,
  scripts. **Skip for v1**; revisit if/when we want per-user
  conversational memory layered on top of the doc brain.
- URL: https://github.com/mem0ai/mem0

### 5. letta-ai/letta (formerly MemGPT)

- **License**: Apache 2.0
- **Stack**: Python; full agent runtime with three-tier memory (core /
  archival / recall)
- **Verdict for us**: forces adoption of their entire agent runtime.
  We need a library, not a runtime. **Skip.**
- URL: https://github.com/letta-ai/letta

### 6. doobidoo/mcp-memory-service

- **Stars / license**: 1.9k / Apache 2.0
- **MCP**: stdio + remote HTTPS, OAuth 2.0 + DCR
- **Verdict for us**: high quality and very actively maintained
  (v10.61.0 in May 2026). **But** backend is SQLite-vec or Milvus — no
  Postgres. Adopting it means leaving our chosen DB. **Skip** despite
  quality; reconsider only if Postgres support lands upstream.
- URL: https://github.com/doobidoo/mcp-memory-service

---

## Tier 3 — Small but stack-matched references

### 7. sdimitrov/mcp-memory  -  **minimum-viable reference**

- **Stars**: ~62 (small but exact stack match)
- **Stack**: JavaScript, **Postgres + pgvector**, MCP via SSE
- **Schema**: id, type, content (JSON), source, embedding(384), tags,
  confidence, timestamps
- **Verdict**: missing auth, multi-tenant and document ingestion; useful
  as a "what does the simplest viable Postgres-backed MCP server look
  like" sanity check before we build ours.
- URL: https://github.com/sdimitrov/mcp-memory

### 8. ttommyth/rag-memory-mcp

- **Stars / license**: 46 / MIT
- **Stack**: TypeScript, SQLite + sqlite-vec, knowledge graph + vector
- **Tools surface**: 23 MCP tools across documents / graph / search /
  analytics — a **good design reference** for our tool surface even
  though the backend is wrong for us
- URL: https://github.com/ttommyth/rag-memory-mcp

### 9. martinloretzzz/nextjs-drizzle-pgvector

- **Stack**: Next.js + **Drizzle + pgvector** template
- **Verdict**: smallest end-to-end "Drizzle wired to pgvector" example.
  Useful as a sanity-check that our schema imports compile against
  pgvector before we layer business logic on.
- URL: https://github.com/martinloretzzz/nextjs-drizzle-pgvector

---

## Tier 4 — Catalogues and learning resources

### 10. TensorBlock/awesome-mcp-servers

- The de-facto MCP server catalogue. Use when we add connectors
  (SharePoint, GDrive, Fireflies, ClickUp) in phase 6 so we don't
  reinvent them.
- URL: https://github.com/TensorBlock/awesome-mcp-servers
- Knowledge-management page:
  https://github.com/TensorBlock/awesome-mcp-servers/blob/main/docs/knowledge-management--memory.md

### 11. NirDiamant/Agent_Memory_Techniques

- 30 runnable notebooks comparing Mem0, Letta, Zep, Graphiti, MemGPT,
  LoCoMo benchmarks, episodic vs semantic memory.
- Use: one-time read to make sure we are not missing a pattern before
  we lock the schema in §5 of the architecture doc.
- URL: https://github.com/NirDiamant/Agent_Memory_Techniques

---

## Tier 5 — Library primitives (not baselines, but referenced)

| Repo                                     | What it gives us                                |
| ---------------------------------------- | ----------------------------------------------- |
| `pgvector/pgvector`                      | The extension itself                            |
| `pgvector/pgvector-node`                 | Node client; Drizzle-friendly                   |
| Drizzle docs — vector similarity search  | Canonical HNSW + cosine examples in Drizzle DSL |
| `modelcontextprotocol/servers`           | Official MCP reference servers (filesystem, memory, git) — for tool-surface conventions |

---

## OneStream-specific

There is **no consolidated open-source repository** of OneStream
business rules on GitHub. What exists:

- The official **OneStream Documentation** site has worked examples per
  rule type (Finance, Parser, Connector, Dashboard).
- A handful of community gists (e.g., "Business Rule Source Code
  Extractor") and the OneStream community forum.
- Implication: for the `kb_scripts` seed we cannot point at an upstream
  corpus; the seed has to come from **our own** historical engagements
  — which is exactly the institutional knowledge the brain is meant to
  capture in the first place. Treat as a feature, not a gap.

---

## Recommendation — locked

**Primary baseline: [`supermemoryai/supermemory`](https://github.com/supermemoryai/supermemory)**.
Studied as a reference, **not** vendored. Concrete folder-by-folder
"what we lift" guide lives in Appendix B of
`enterprise-brain-architecture.md`. Short version: four folders, four
hours of reading, before any of us writes the first Drizzle table:

- `apps/mcp/`              → MCP tool surface conventions
- `packages/memory-graph/` → graph model for our `kb_relationships`
- `packages/validation/`   → Zod input shapes for the `brain.*` tools
- `packages/ai-sdk/`       → embedding-provider abstraction

**Secondary references** (consult as needed):

1. `vortex` — copy the RRF + chunking SQL for our v1 hybrid search.
2. `Azure-Samples/rag-postgres-openai-python` — imitate the `/evals`
   harness in TypeScript when we get there.

**Explicitly skipped**:

| Repo                       | Reason                                                        |
| -------------------------- | ------------------------------------------------------------- |
| Mem0                       | Agent-loop memory shape, not a doc-corpus brain               |
| Letta                      | Forces adopting a whole agent runtime                         |
| doobidoo/mcp-memory-service| High quality, but SQLite/Milvus only — leaves Neon            |
| ttommyth/rag-memory-mcp    | SQLite + single-user + local stdio                            |

**Stay aware of**: `TensorBlock/awesome-mcp-servers` for connectors in
phase 6.

### Bottom line

No repo we can fork drops in cleanly. supermemory is the unambiguous
best reference because it is the only public project that combines all
five of our locked decisions (TypeScript, Drizzle, Postgres, MCP,
multi-tenant). We treat it as a pattern source, write our own thin
implementation, and revisit vendoring only when a concrete need
(AST-aware code chunking, self-hostable Drive/Notion connectors)
makes it worth taking the dependency.
