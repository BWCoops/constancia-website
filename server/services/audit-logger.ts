import { Request } from "express";
import { getPool } from "../db-pool";
import { createChildLogger } from "../lib/logger";

const pool = getPool();
const log = createChildLogger("audit");

interface ReplitUserClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  exp?: number;
}

interface ReplitUser {
  claims?: ReplitUserClaims;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

interface RequestWithAuth {
  sessionID?: string;
  user?: ReplitUser;
}

export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT"
  | "DOWNLOAD"
  | "ERASURE_REQUEST"
  | "RETENTION_CLEANUP"
  | "CONFIG_CHANGE"
  | "PERMISSION_CHANGE"
  | "BULK_DELETE"
  | "BULK_UPDATE";

export type ResourceType =
  | "blog_post"
  | "resource_file"
  | "lead"
  | "contact_submission"
  | "admin_user"
  | "security_event"
  | "config"
  | "session"
  | "marketing_asset"
  | "guardrail_rule"
  | "gdpr_request";

export interface AuditActor {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuditLogEntry {
  id?: string;
  action: AuditAction;
  actorId: string;
  actorEmail: string;
  resourceType: ResourceType;
  resourceId?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function redactSensitiveFields(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!obj) return null;
  
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "api_key",
    "totpSecret",
    "totp_secret",
    "backupCodes",
    "backup_codes",
    "otpHash",
    "otp_hash",
    "encryptedEmail",
  ];

  const redacted = { ...obj };
  
  for (const key of Object.keys(redacted)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      redacted[key] = "[REDACTED]";
    }
    if (typeof redacted[key] === "object" && redacted[key] !== null && !Array.isArray(redacted[key])) {
      redacted[key] = redactSensitiveFields(redacted[key] as Record<string, unknown>);
    }
  }
  
  return redacted;
}

function computeChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Record<string, { from: unknown; to: unknown }> {
  if (!before && !after) return {};
  if (!before) return {};
  if (!after) return {};

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  
  for (const key of allKeys) {
    const fromVal = before[key];
    const toVal = after[key];
    
    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      changes[key] = { from: fromVal, to: toVal };
    }
  }
  
  return changes;
}

export async function logAuditEvent(
  actor: AuditActor,
  action: AuditAction,
  resourceType: ResourceType,
  resourceId: string | null,
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown> | null,
  req: Request,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers["user-agent"]?.slice(0, 500) || null;
    const sessionId = (req as unknown as RequestWithAuth).sessionID || null;

    const redactedBefore = redactSensitiveFields(beforeState);
    const redactedAfter = redactSensitiveFields(afterState);

    const changes = action === "UPDATE" ? computeChanges(redactedBefore, redactedAfter) : null;

    const result = await pool.query(
      `INSERT INTO audit_logs (
        action,
        actor_id,
        actor_email,
        resource_type,
        resource_id,
        before_state,
        after_state,
        ip_address,
        user_agent,
        session_id,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        action,
        actor.id,
        actor.email,
        resourceType,
        resourceId,
        redactedBefore ? JSON.stringify(redactedBefore) : null,
        redactedAfter ? JSON.stringify(redactedAfter) : null,
        ipAddress,
        userAgent,
        sessionId,
        metadata ? JSON.stringify({ ...metadata, changes }) : changes ? JSON.stringify({ changes }) : null,
      ]
    );

    const auditId = result.rows[0]?.id;

    if (action === "DELETE" || action === "ERASURE_REQUEST" || action === "PERMISSION_CHANGE") {
      log.info({ action, actor: actor.email, resourceType, resourceId, ipAddress }, "Audit event logged");
    }

    return auditId || null;
  } catch (error) {
    log.error({ err: error }, "Failed to log audit event");
    return null;
  }
}

export async function getAuditLogs(options: {
  resourceType?: ResourceType;
  resourceId?: string;
  actorId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(options.resourceType);
    }

    if (options.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(options.resourceId);
    }

    if (options.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(options.actorId);
    }

    if (options.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(options.action);
    }

    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(options.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const result = await pool.query(
      `SELECT 
        id, action, actor_id, actor_email, resource_type, resource_id,
        before_state, after_state, ip_address, user_agent, session_id,
        metadata, created_at
       FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      action: row.action as AuditAction,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      resourceType: row.resource_type as ResourceType,
      resourceId: row.resource_id,
      beforeState: row.before_state,
      afterState: row.after_state,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      sessionId: row.session_id,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  } catch (error) {
    log.error({ err: error }, "Failed to fetch audit logs");
    return [];
  }
}

export async function getAuditLogById(id: string): Promise<AuditLogEntry | null> {
  try {
    const result = await pool.query(
      `SELECT 
        id, action, actor_id, actor_email, resource_type, resource_id,
        before_state, after_state, ip_address, user_agent, session_id,
        metadata, created_at
       FROM audit_logs
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      action: row.action as AuditAction,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      resourceType: row.resource_type as ResourceType,
      resourceId: row.resource_id,
      beforeState: row.before_state,
      afterState: row.after_state,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      sessionId: row.session_id,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  } catch (error) {
    log.error({ err: error }, "Failed to fetch audit log by id");
    return null;
  }
}

export async function getResourceHistory(
  resourceType: ResourceType,
  resourceId: string
): Promise<AuditLogEntry[]> {
  return getAuditLogs({ resourceType, resourceId, limit: 1000 });
}

export function createSystemActor(): AuditActor {
  return {
    id: "system",
    email: "system@constancia.com",
    name: "System Process",
    role: "system",
  };
}

export function createActorFromRequest(req: Request): AuditActor {
  const user = (req as unknown as RequestWithAuth).user?.claims;
  return {
    id: user?.sub || "anonymous",
    email: user?.email || "anonymous@unknown.com",
    name: [user?.first_name, user?.last_name].filter(Boolean).join(" ") || undefined,
    role: "admin",
  };
}
