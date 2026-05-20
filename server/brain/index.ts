/**
 * Mount the brain subsystem onto the existing Express app.
 *
 * Called from server/routes.ts during registerRoutes(). Adds:
 *   POST /api/brain/ingest, GET /api/brain/documents, GET /api/brain/jobs
 *   POST /api/brain/mcp-token   — Clerk-authenticated token issuance
 *   ALL  /mcp/brain             — Bearer-authenticated MCP server
 */

import type { Express } from "express";
import express from "express";
import uploadRoutes from "./routes/upload";
import mcpTokenRoutes from "./routes/mcp-token";
import { mcpRouter } from "./mcp/server";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("brain");

export function mountBrain(app: Express): void {
  if (!process.env.BRAIN_DATABASE_URL) {
    log.warn(
      "BRAIN_DATABASE_URL not set — brain endpoints disabled. See docs/enterprise-brain-architecture.md.",
    );
    return;
  }

  app.use("/api/brain", uploadRoutes);
  app.use("/api/brain", mcpTokenRoutes);

  // The MCP server reads the raw JSON body itself; mount express.json()
  // locally so it does not interfere with the upload routes' multipart
  // handling.
  app.use("/mcp/brain", express.json({ limit: "2mb" }), mcpRouter);

  log.info("Brain mounted: /api/brain, /mcp/brain");
}
