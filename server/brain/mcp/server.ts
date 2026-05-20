/**
 * Constancia Brain MCP server.
 *
 * Exposed at /mcp/brain on the existing Express app. Speaks the
 * Streamable-HTTP transport so any Claude Code cloud instance can
 * configure it as a remote MCP server.
 *
 * Auth: Bearer token. The token is a JWT issued by /api/brain/mcp-token
 * and signed with BRAIN_MCP_TOKEN_SECRET; it embeds kb_users.id and
 * kb_teams.id so the server can scope every query to a single team.
 *
 * Tools (see docs/enterprise-brain-architecture.md §7.2):
 *   brain.search        — hybrid (vector + tsvector) search across docs
 *   brain.get           — fetch one document with optional full text
 *   brain.list_recent   — N most recent documents
 *   brain.list_categories — category tree
 *   brain.dictionary    — look up a glossary term
 *   brain.list_scripts  — scripts with optional language/dialect filter
 *   brain.get_script    — fetch one script with parameters + source
 *   brain.write_note    — Claude's primary "don't save locally" mechanism
 */

import express, { type Request, type Response, type NextFunction } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { brainDb } from "../db";
import {
  kbDocuments,
  kbDocumentChunks,
  kbCategories,
  kbDictionaryTerms,
  kbScripts,
  kbAuditLog,
  kbSearchLog,
  KB_DOC_TYPES,
  KB_SCRIPT_LANGUAGES,
  type KbDocType,
} from "@shared/brain-schema";
import { hybridSearch } from "../search/search-service";
import { ingestDocument } from "../ingestion/ingest";
import { and, desc, eq, sql, isNull, or, ilike } from "drizzle-orm";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("brain-mcp");

// ─── Token (HMAC-signed minimal JWT-style) ───────────────────────
interface BrainPrincipal {
  userId: string;
  teamId: string;
  email: string;
  role: string;
}

function getTokenSecret(): string {
  const secret = process.env.BRAIN_MCP_TOKEN_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "BRAIN_MCP_TOKEN_SECRET (or SESSION_SECRET) must be set to issue/verify MCP tokens",
    );
  }
  return secret;
}

function b64urlEncode(s: string | Buffer): string {
  return Buffer.from(s)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  ).toString("utf8");
}

export function issueMcpToken(principal: BrainPrincipal, ttlSeconds = 60 * 60 * 24 * 30): string {
  const payload = {
    ...principal,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sig = createHmac("sha256", getTokenSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

function verifyMcpToken(token: string): BrainPrincipal {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) throw new Error("Malformed token");

  const expected = createHmac("sha256", getTokenSecret()).update(payloadB64).digest();
  const actual = Buffer.from(
    sigB64.replace(/-/g, "+").replace(/_/g, "/") +
      (sigB64.length % 4 === 0 ? "" : "=".repeat(4 - (sigB64.length % 4))),
    "base64",
  );
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Bad signature");
  }

  const payload = JSON.parse(b64urlDecode(payloadB64)) as BrainPrincipal & {
    exp: number;
    iat: number;
  };
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return {
    userId: payload.userId,
    teamId: payload.teamId,
    email: payload.email,
    role: payload.role,
  };
}

// ─── Audit-logged execution wrapper ──────────────────────────────
async function audited<T>(
  principal: BrainPrincipal,
  action: string,
  args: unknown,
  exec: () => Promise<{ result: T; resultCount?: number; resourceId?: string; resourceType?: string }>,
): Promise<T> {
  const start = Date.now();
  const argsHash = createHash("sha256")
    .update(JSON.stringify(args ?? null))
    .digest("hex");
  try {
    const { result, resultCount, resourceId, resourceType } = await exec();
    await brainDb.insert(kbAuditLog).values({
      teamId: principal.teamId,
      userId: principal.userId,
      action,
      argsHash,
      resultCount,
      resourceId,
      resourceType,
      latencyMs: Date.now() - start,
      success: true,
    });
    return result;
  } catch (err) {
    await brainDb.insert(kbAuditLog).values({
      teamId: principal.teamId,
      userId: principal.userId,
      action,
      argsHash,
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Tool handlers ───────────────────────────────────────────────
const searchArgs = z.object({
  query: z.string().min(1).max(500),
  k: z.number().int().min(1).max(50).optional(),
  doc_types: z.array(z.enum(KB_DOC_TYPES)).optional(),
  project_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
});

const getArgs = z.object({
  doc_id: z.string().uuid(),
  include_full_text: z.boolean().optional().default(false),
});

const listRecentArgs = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  doc_type: z.enum(KB_DOC_TYPES).optional(),
});

const listCategoriesArgs = z.object({
  parent_id: z.string().uuid().nullable().optional(),
});

const dictionaryArgs = z.object({
  term: z.string().min(1).max(200),
  domain: z
    .enum(["delivery", "finance", "onestream", "sql", "sales", "general"])
    .optional(),
});

const listScriptsArgs = z.object({
  language: z.enum(KB_SCRIPT_LANGUAGES).optional(),
  dialect: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const getScriptArgs = z.object({ script_id: z.string().uuid() });

const writeNoteArgs = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100_000),
  doc_type: z.enum(["note", "tech_spec", "func_spec"]).optional().default("note"),
  project_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

function textResult(payload: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

async function handleSearch(p: BrainPrincipal, args: unknown): Promise<CallToolResult> {
  const a = searchArgs.parse(args);
  return audited(p, "mcp.search", a, async () => {
    const results = await hybridSearch({
      query: a.query,
      topK: a.k,
      filters: {
        teamId: p.teamId,
        docTypes: a.doc_types,
        projectId: a.project_id,
        clientId: a.client_id,
        sinceIso: a.since,
      },
    });
    await brainDb.insert(kbSearchLog).values({
      teamId: p.teamId,
      userId: p.userId,
      query: a.query,
      filters: { doc_types: a.doc_types, project_id: a.project_id, client_id: a.client_id, since: a.since },
      resultCount: results.length,
      topResultId: results[0]?.documentId,
      source: "mcp",
    });
    return {
      result: textResult({ results }),
      resultCount: results.length,
      resourceType: "document",
    };
  });
}

async function handleGet(p: BrainPrincipal, args: unknown): Promise<CallToolResult> {
  const a = getArgs.parse(args);
  return audited(p, "mcp.get", a, async () => {
    const [doc] = await brainDb
      .select()
      .from(kbDocuments)
      .where(and(eq(kbDocuments.id, a.doc_id), eq(kbDocuments.teamId, p.teamId)))
      .limit(1);
    if (!doc) throw new Error(`Document not found: ${a.doc_id}`);

    let chunks: Array<{ chunkIndex: number; text: string; headingPath: string | null }> = [];
    if (a.include_full_text) {
      chunks = await brainDb
        .select({
          chunkIndex: kbDocumentChunks.chunkIndex,
          text: kbDocumentChunks.text,
          headingPath: kbDocumentChunks.headingPath,
        })
        .from(kbDocumentChunks)
        .where(eq(kbDocumentChunks.documentId, a.doc_id))
        .orderBy(kbDocumentChunks.chunkIndex);
    }

    return {
      result: textResult({
        document: doc,
        chunks: a.include_full_text ? chunks : undefined,
      }),
      resourceType: "document",
      resourceId: a.doc_id,
    };
  });
}

async function handleListRecent(p: BrainPrincipal, args: unknown): Promise<CallToolResult> {
  const a = listRecentArgs.parse(args);
  return audited(p, "mcp.list_recent", a, async () => {
    const conditions = [eq(kbDocuments.teamId, p.teamId)];
    if (a.doc_type) conditions.push(eq(kbDocuments.docType, a.doc_type));

    const docs = await brainDb
      .select({
        id: kbDocuments.id,
        title: kbDocuments.title,
        docType: kbDocuments.docType,
        createdAt: kbDocuments.createdAt,
        summary: kbDocuments.summary,
      })
      .from(kbDocuments)
      .where(and(...conditions))
      .orderBy(desc(kbDocuments.createdAt))
      .limit(a.limit);

    return { result: textResult({ documents: docs }), resultCount: docs.length };
  });
}

async function handleListCategories(p: BrainPrincipal, args: unknown): Promise<CallToolResult> {
  const a = listCategoriesArgs.parse(args);
  return audited(p, "mcp.list_categories", a, async () => {
    const where =
      a.parent_id === null
        ? and(eq(kbCategories.teamId, p.teamId), isNull(kbCategories.parentId))
        : a.parent_id
          ? and(eq(kbCategories.teamId, p.teamId), eq(kbCategories.parentId, a.parent_id))
          : eq(kbCategories.teamId, p.teamId);

    const cats = await brainDb
      .select()
      .from(kbCategories)
      .where(where)
      .orderBy(kbCategories.sortOrder);
    return { result: textResult({ categories: cats }), resultCount: cats.length };
  });
}

async function handleDictionary(p: BrainPrincipal, args: unknown): Promise<CallToolResult> {
  const a = dictionaryArgs.parse(args);
  return audited(p, "mcp.dictionary", a, async () => {
    const conditions = [eq(kbDictionaryTerms.teamId, p.teamId)];
    if (a.domain) conditions.push(eq(kbDictionaryTerms.domain, a.domain));

    const terms = await brainDb
      .select()
      .from(kbDictionaryTerms)
      .where(
        and(
          ...conditions,
          or(
            ilike(kbDictionaryTerms.term, a.term),
            ilike(kbDictionaryTerms.term, `%${a.term}%`),
            sql`${kbDictionaryTerms.synonyms} && ARRAY[${a.term}]::text[]`,
          ),
        ),
      )
      .limit(10);

    return { result: textResult({ terms }), resultCount: terms.length };
  });
}

async function handleListScripts(p: BrainPrincipal, args: unknown): Promise<CallToolResult> {
  const a = listScriptsArgs.parse(args);
  return audited(p, "mcp.list_scripts", a, async () => {
    const conditions = [eq(kbScripts.teamId, p.teamId)];
    if (a.language) conditions.push(eq(kbScripts.language, a.language));
    if (a.dialect) conditions.push(eq(kbScripts.dialect, a.dialect));
    if (a.category) conditions.push(eq(kbScripts.category, a.category));

    const scripts = await brainDb
      .select({
        id: kbScripts.id,
        name: kbScripts.name,
        language: kbScripts.language,
        dialect: kbScripts.dialect,
        purpose: kbScripts.purpose,
        category: kbScripts.category,
        tested: kbScripts.tested,
        riskLevel: kbScripts.riskLevel,
      })
      .from(kbScripts)
      .where(and(...conditions))
      .orderBy(desc(kbScripts.updatedAt))
      .limit(a.limit);

    return { result: textResult({ scripts }), resultCount: scripts.length };
  });
}

async function handleGetScript(p: BrainPrincipal, args: unknown): Promise<CallToolResult> {
  const a = getScriptArgs.parse(args);
  return audited(p, "mcp.get_script", a, async () => {
    const [s] = await brainDb
      .select()
      .from(kbScripts)
      .where(and(eq(kbScripts.id, a.script_id), eq(kbScripts.teamId, p.teamId)))
      .limit(1);
    if (!s) throw new Error(`Script not found: ${a.script_id}`);
    return {
      result: textResult({ script: s }),
      resourceType: "script",
      resourceId: a.script_id,
    };
  });
}

async function handleWriteNote(p: BrainPrincipal, args: unknown): Promise<CallToolResult> {
  const a = writeNoteArgs.parse(args);
  return audited(p, "mcp.write_note", a, async () => {
    const buf = Buffer.from(a.content, "utf8");
    const result = await ingestDocument({
      teamId: p.teamId,
      ownerUserId: p.userId,
      submittedByUserId: p.userId,
      projectId: a.project_id,
      docType: a.doc_type as KbDocType,
      title: a.title,
      source: "claude_note",
      filename: `${a.title.replace(/[^\w\s.-]/g, "_").slice(0, 80)}.md`,
      mimeType: "text/markdown",
      buffer: buf,
      requestedBy: "mcp",
      sourceMetadata: { tags: a.tags ?? [] },
    });
    return {
      result: textResult(result),
      resourceType: "document",
      resourceId: result.documentId,
    };
  });
}

// ─── MCP server factory + Express adapter ────────────────────────
function buildMcpServer(principal: BrainPrincipal): Server {
  const server = new Server(
    { name: "constancia-brain", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "brain.search",
        description:
          "Hybrid (semantic + keyword) search across documents the user's team has ingested.",
        inputSchema: { type: "object", properties: { query: { type: "string" }, k: { type: "number" }, doc_types: { type: "array", items: { type: "string" } }, project_id: { type: "string" }, client_id: { type: "string" }, since: { type: "string" } }, required: ["query"] },
      },
      {
        name: "brain.get",
        description: "Fetch one document by id, optionally including its full text.",
        inputSchema: { type: "object", properties: { doc_id: { type: "string" }, include_full_text: { type: "boolean" } }, required: ["doc_id"] },
      },
      {
        name: "brain.list_recent",
        description: "Most recently ingested or updated documents.",
        inputSchema: { type: "object", properties: { limit: { type: "number" }, doc_type: { type: "string" } } },
      },
      {
        name: "brain.list_categories",
        description: "List children of a category (or top-level if parent_id is null).",
        inputSchema: { type: "object", properties: { parent_id: { type: ["string", "null"] } } },
      },
      {
        name: "brain.dictionary",
        description: "Look up a glossary term in the data dictionary (SOW, RTM, FSD, etc.).",
        inputSchema: { type: "object", properties: { term: { type: "string" }, domain: { type: "string" } }, required: ["term"] },
      },
      {
        name: "brain.list_scripts",
        description: "List code artefacts (OneStream business rules, SQL helpers, etc.).",
        inputSchema: { type: "object", properties: { language: { type: "string" }, dialect: { type: "string" }, category: { type: "string" }, limit: { type: "number" } } },
      },
      {
        name: "brain.get_script",
        description: "Fetch a single script with its parameters and source.",
        inputSchema: { type: "object", properties: { script_id: { type: "string" } }, required: ["script_id"] },
      },
      {
        name: "brain.write_note",
        description:
          "Persist a note/spec/insight into the brain. Use this instead of writing files to disk — this is how durable knowledge survives ephemeral cloud sessions.",
        inputSchema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, doc_type: { type: "string" }, project_id: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "content"] },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    switch (name) {
      case "brain.search": return handleSearch(principal, args);
      case "brain.get": return handleGet(principal, args);
      case "brain.list_recent": return handleListRecent(principal, args);
      case "brain.list_categories": return handleListCategories(principal, args);
      case "brain.dictionary": return handleDictionary(principal, args);
      case "brain.list_scripts": return handleListScripts(principal, args);
      case "brain.get_script": return handleGetScript(principal, args);
      case "brain.write_note": return handleWriteNote(principal, args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// ─── Express middleware: verify Bearer token ─────────────────────
function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "Bearer token required" });
    return;
  }
  const token = header.slice(7).trim();
  try {
    (req as Request & { brainPrincipal?: BrainPrincipal }).brainPrincipal =
      verifyMcpToken(token);
    next();
  } catch (err) {
    res.status(401).json({
      error: "Invalid token",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Mount onto Express ──────────────────────────────────────────
export const mcpRouter = express.Router();

mcpRouter.all("/", requireBearerToken, async (req: Request, res: Response) => {
  const principal = (req as Request & { brainPrincipal?: BrainPrincipal })
    .brainPrincipal;
  if (!principal) {
    res.status(401).json({ error: "No principal" });
    return;
  }
  const server = buildMcpServer(principal);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: one request, one response
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    log.error({ err }, "MCP handler failed");
    if (!res.headersSent) {
      res.status(500).json({
        error: "MCP handler failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }
});
