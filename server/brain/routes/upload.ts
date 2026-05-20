/**
 * Brain API routes — file upload + ingest status.
 *
 * Mounted at /api/brain in routes.ts.
 *
 * Auth: relies on the existing Clerk middleware. The Clerk user id is
 * resolved to a kb_users row; first-time users are auto-provisioned
 * into the default `constancia` team.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { brainDb } from "../db";
import {
  kbUsers,
  kbTeams,
  kbDocuments,
  kbIngestionJobs,
  KB_DOC_TYPES,
} from "@shared/brain-schema";
import { eq, and, desc } from "drizzle-orm";
import { ingestDocument } from "../ingestion/ingest";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("brain-routes");

const router = Router();

// ─── Clerk-bridge middleware: resolve / provision kb_users row ───
interface BrainRequest extends Request {
  brainUser?: { id: string; teamId: string; email: string; role: string };
  // Clerk's @clerk/express middleware adds `auth()` to req; we read it
  // defensively in case the middleware is not present (dev mode).
  auth?: () => { userId?: string | null; sessionClaims?: { email?: string } };
}

async function requireBrainUser(
  req: BrainRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = req.auth?.();
    const clerkUserId = auth?.userId;
    const email = auth?.sessionClaims?.email;

    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const existing = await brainDb
      .select({
        id: kbUsers.id,
        teamId: kbUsers.teamId,
        email: kbUsers.email,
        role: kbUsers.role,
        isActive: kbUsers.isActive,
      })
      .from(kbUsers)
      .where(eq(kbUsers.clerkUserId, clerkUserId))
      .limit(1);

    if (existing.length > 0) {
      if (!existing[0].isActive) {
        res.status(403).json({ error: "User deactivated" });
        return;
      }
      req.brainUser = {
        id: existing[0].id,
        teamId: existing[0].teamId,
        email: existing[0].email,
        role: existing[0].role,
      };
      next();
      return;
    }

    if (!email) {
      res.status(400).json({ error: "Cannot provision user without email" });
      return;
    }

    // Auto-provision into the default team
    const [team] = await brainDb
      .select({ id: kbTeams.id })
      .from(kbTeams)
      .where(eq(kbTeams.slug, "constancia"))
      .limit(1);
    if (!team) {
      res.status(500).json({
        error: "Default team not provisioned. Run brain:seed-dictionary.",
      });
      return;
    }

    const [created] = await brainDb
      .insert(kbUsers)
      .values({
        teamId: team.id,
        clerkUserId,
        email,
        role: "contributor",
      })
      .returning({
        id: kbUsers.id,
        teamId: kbUsers.teamId,
        email: kbUsers.email,
        role: kbUsers.role,
      });

    req.brainUser = {
      id: created.id,
      teamId: created.teamId,
      email: created.email,
      role: created.role,
    };
    next();
  } catch (err) {
    log.error({ err }, "requireBrainUser failed");
    next(err);
  }
}

// ─── POST /api/brain/ingest ──────────────────────────────────────
const ingestQuerySchema = z.object({
  docType: z.enum(KB_DOC_TYPES).default("other"),
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  title: z.string().min(1).max(500).optional(),
});

router.post("/ingest", requireBrainUser, async (req: BrainRequest, res: Response) => {
  if (!req.brainUser) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }

  const file = req.files?.file;
  if (!file || Array.isArray(file)) {
    res.status(400).json({ error: "Multipart 'file' field required (single file)" });
    return;
  }

  const parsedQuery = ingestQuerySchema.safeParse(req.body);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.format() });
    return;
  }

  try {
    const result = await ingestDocument({
      teamId: req.brainUser.teamId,
      ownerUserId: req.brainUser.id,
      submittedByUserId: req.brainUser.id,
      docType: parsedQuery.data.docType,
      projectId: parsedQuery.data.projectId,
      clientId: parsedQuery.data.clientId,
      title: parsedQuery.data.title,
      source: "upload",
      filename: file.name,
      mimeType: file.mimetype,
      buffer: file.data,
      requestedBy: "web",
    });
    res.json(result);
  } catch (err) {
    log.error({ err }, "Upload ingest failed");
    res.status(500).json({
      error: "Ingestion failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─── GET /api/brain/documents ────────────────────────────────────
router.get("/documents", requireBrainUser, async (req: BrainRequest, res: Response) => {
  if (!req.brainUser) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }

  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const rows = await brainDb
    .select({
      id: kbDocuments.id,
      title: kbDocuments.title,
      docType: kbDocuments.docType,
      status: kbDocuments.status,
      sizeBytes: kbDocuments.sizeBytes,
      createdAt: kbDocuments.createdAt,
      ingestedAt: kbDocuments.ingestedAt,
    })
    .from(kbDocuments)
    .where(eq(kbDocuments.teamId, req.brainUser.teamId))
    .orderBy(desc(kbDocuments.createdAt))
    .limit(limit);

  res.json({ documents: rows });
});

// ─── GET /api/brain/jobs ─────────────────────────────────────────
router.get("/jobs", requireBrainUser, async (req: BrainRequest, res: Response) => {
  if (!req.brainUser) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }

  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const rows = await brainDb
    .select({
      id: kbIngestionJobs.id,
      documentId: kbIngestionJobs.documentId,
      stage: kbIngestionJobs.stage,
      attempts: kbIngestionJobs.attempts,
      lastError: kbIngestionJobs.lastError,
      progressPct: kbIngestionJobs.progressPct,
      startedAt: kbIngestionJobs.startedAt,
      finishedAt: kbIngestionJobs.finishedAt,
      createdAt: kbIngestionJobs.createdAt,
    })
    .from(kbIngestionJobs)
    .where(eq(kbIngestionJobs.teamId, req.brainUser.teamId))
    .orderBy(desc(kbIngestionJobs.createdAt))
    .limit(limit);

  res.json({ jobs: rows });
});

// ─── GET /api/brain/health ───────────────────────────────────────
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const teams = await brainDb
      .select({ id: kbTeams.id })
      .from(kbTeams)
      .limit(1);
    res.json({ ok: true, hasTeam: teams.length > 0 });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
