import { Request } from "express";
import { getPool } from "../db-pool";
import { logAuditEvent, createSystemActor, AuditActor } from "./audit-logger";
import { hashForLookup } from "./encryption";
import { createChildLogger } from "../lib/logger";

const pool = getPool();
const log = createChildLogger("gdpr");

export const RETENTION_PERIODS = {
  leads: 24,
  contact_submissions: 24,
  security_events: 12,
  audit_logs: 84,
  resource_sessions: 3,
  otp_storage: 1,
  rate_limits: 1,
  chat_sessions: 6, // FinanceCompass chat sessions - 6 months
} as const;

export type RetentionResourceType = keyof typeof RETENTION_PERIODS;

interface RetentionConfig {
  resourceType: string;
  retentionMonths: number;
  lastCleanupAt: Date | null;
}

interface ErasureSummary {
  email: string;
  emailHash: string;
  deletedRecords: {
    resourceLeads: number;
    contactSubmissions: number;
    resourceSessions: number;
    resourceDownloads: number;
    resourceOtps: number;
  };
  totalDeleted: number;
  completedAt: Date;
  auditLogId: string | null;
}

interface CleanupSummary {
  resourceType: string;
  deletedCount: number;
  cutoffDate: Date;
}

export async function initializeRetentionConfig(): Promise<void> {
  try {
    for (const [resourceType, months] of Object.entries(RETENTION_PERIODS)) {
      await pool.query(
        `INSERT INTO data_retention_config (resource_type, retention_months)
         VALUES ($1, $2)
         ON CONFLICT (resource_type) DO NOTHING`,
        [resourceType, months]
      );
    }
    log.info("Retention configuration initialized");
  } catch (error) {
    log.error({ err: error }, "Failed to initialize retention config");
  }
}

export async function getRetentionConfig(): Promise<RetentionConfig[]> {
  try {
    const result = await pool.query(
      `SELECT resource_type, retention_months, last_cleanup_at
       FROM data_retention_config
       ORDER BY resource_type`
    );
    
    return result.rows.map(row => ({
      resourceType: row.resource_type,
      retentionMonths: row.retention_months,
      lastCleanupAt: row.last_cleanup_at,
    }));
  } catch (error) {
    log.error({ err: error }, "Failed to fetch retention config");
    return [];
  }
}

export async function updateRetentionPeriod(
  resourceType: RetentionResourceType,
  months: number
): Promise<boolean> {
  if (months < 1 || months > 120) {
    log.error({ months }, "Invalid retention period. Must be between 1 and 120 months");
    return false;
  }

  try {
    await pool.query(
      `UPDATE data_retention_config 
       SET retention_months = $1 
       WHERE resource_type = $2`,
      [months, resourceType]
    );
    
    log.info({ resourceType, months }, "Updated retention period");
    return true;
  } catch (error) {
    log.error({ err: error }, "Failed to update retention period");
    return false;
  }
}

async function cleanupResourceLeads(cutoffDate: Date): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM resource_leads 
       WHERE created_at < $1
       RETURNING id`,
      [cutoffDate]
    );
    return result.rowCount || 0;
  } catch (error) {
    log.error({ err: error }, "Failed to cleanup resource leads");
    return 0;
  }
}

async function cleanupContactSubmissions(cutoffDate: Date): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM contact_submissions 
       WHERE created_at < $1
       RETURNING id`,
      [cutoffDate]
    );
    return result.rowCount || 0;
  } catch (error) {
    log.error({ err: error }, "Failed to cleanup contact submissions");
    return 0;
  }
}

async function cleanupSecurityEvents(cutoffDate: Date): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM security_events 
       WHERE created_at < $1
       RETURNING id`,
      [cutoffDate]
    );
    return result.rowCount || 0;
  } catch (error) {
    log.error({ err: error }, "Failed to cleanup security events");
    return 0;
  }
}

async function cleanupAuditLogs(cutoffDate: Date): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM audit_logs 
       WHERE created_at < $1
       AND action NOT IN ('ERASURE_REQUEST', 'RETENTION_CLEANUP')
       RETURNING id`,
      [cutoffDate]
    );
    return result.rowCount || 0;
  } catch (error) {
    log.error({ err: error }, "Failed to cleanup audit logs");
    return 0;
  }
}

async function cleanupResourceSessions(cutoffDate: Date): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM resource_sessions 
       WHERE expires_at < $1 OR created_at < $2
       RETURNING id`,
      [new Date(), cutoffDate]
    );
    return result.rowCount || 0;
  } catch (error) {
    log.error({ err: error }, "Failed to cleanup resource sessions");
    return 0;
  }
}

async function cleanupOtpStorage(cutoffDate: Date): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM otp_storage 
       WHERE expires_at < $1 OR created_at < $2
       RETURNING id`,
      [new Date(), cutoffDate]
    );
    return result.rowCount || 0;
  } catch (error) {
    log.error({ err: error }, "Failed to cleanup OTP storage");
    return 0;
  }
}

async function cleanupRateLimits(cutoffDate: Date): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM rate_limits 
       WHERE reset_at < $1 OR created_at < $2
       RETURNING id`,
      [new Date(), cutoffDate]
    );
    return result.rowCount || 0;
  } catch (error) {
    log.error({ err: error }, "Failed to cleanup rate limits");
    return 0;
  }
}

async function cleanupChatSessions(cutoffDate: Date): Promise<number> {
  try {
    // First delete messages from old sessions
    const messagesResult = await pool.query(
      `DELETE FROM fc_chat_messages 
       WHERE session_id IN (
         SELECT id FROM fc_chat_sessions WHERE created_at < $1
       )
       RETURNING id`,
      [cutoffDate]
    );
    const messagesDeleted = messagesResult.rowCount || 0;
    
    // Then delete the sessions themselves
    const sessionsResult = await pool.query(
      `DELETE FROM fc_chat_sessions 
       WHERE created_at < $1
       RETURNING id`,
      [cutoffDate]
    );
    const sessionsDeleted = sessionsResult.rowCount || 0;
    
    if (messagesDeleted > 0 || sessionsDeleted > 0) {
      log.info({ sessionsDeleted, messagesDeleted }, "Cleaned up chat sessions");
    }
    
    return sessionsDeleted;
  } catch (error) {
    log.error({ err: error }, "Failed to cleanup chat sessions");
    return 0;
  }
}

async function updateLastCleanup(resourceType: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE data_retention_config 
       SET last_cleanup_at = NOW() 
       WHERE resource_type = $1`,
      [resourceType]
    );
  } catch (error) {
    log.error({ err: error, resourceType }, "Failed to update last cleanup");
  }
}

export async function runRetentionCleanup(
  actor?: AuditActor,
  req?: Request
): Promise<CleanupSummary[]> {
  const summaries: CleanupSummary[] = [];
  const systemActor = actor || createSystemActor();

  log.info("Starting retention cleanup");

  try {
    const config = await getRetentionConfig();

    for (const { resourceType, retentionMonths } of config) {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

      let deletedCount = 0;

      switch (resourceType) {
        case "leads":
          deletedCount = await cleanupResourceLeads(cutoffDate);
          break;
        case "contact_submissions":
          deletedCount = await cleanupContactSubmissions(cutoffDate);
          break;
        case "security_events":
          deletedCount = await cleanupSecurityEvents(cutoffDate);
          break;
        case "audit_logs":
          deletedCount = await cleanupAuditLogs(cutoffDate);
          break;
        case "resource_sessions":
          deletedCount = await cleanupResourceSessions(cutoffDate);
          break;
        case "otp_storage":
          deletedCount = await cleanupOtpStorage(cutoffDate);
          break;
        case "rate_limits":
          deletedCount = await cleanupRateLimits(cutoffDate);
          break;
        case "chat_sessions":
          deletedCount = await cleanupChatSessions(cutoffDate);
          break;
      }

      if (deletedCount > 0) {
        await updateLastCleanup(resourceType);
        
        summaries.push({
          resourceType,
          deletedCount,
          cutoffDate,
        });

        log.info({ deletedCount, resourceType, cutoffDate: cutoffDate.toISOString() }, "Cleaned up retention records");
      }
    }

    if (summaries.length > 0 && req) {
      await logAuditEvent(
        systemActor,
        "RETENTION_CLEANUP",
        "gdpr_request",
        null,
        null,
        { summaries },
        req,
        { totalDeleted: summaries.reduce((sum, s) => sum + s.deletedCount, 0) }
      );
    }

    log.info("Retention cleanup completed");
    return summaries;
  } catch (error) {
    log.error({ err: error }, "Retention cleanup failed");
    return summaries;
  }
}

export async function processErasureRequest(
  email: string,
  actor: AuditActor,
  req: Request
): Promise<ErasureSummary> {
  const emailHash = hashForLookup(email);
  const emailLower = email.toLowerCase().trim();

  log.info({ emailHashPrefix: emailHash.slice(0, 8) }, "Processing erasure request");

  const deletedRecords = {
    resourceLeads: 0,
    contactSubmissions: 0,
    resourceSessions: 0,
    resourceDownloads: 0,
    resourceOtps: 0,
  };

  try {
    const leadResult = await pool.query(
      `DELETE FROM resource_leads 
       WHERE LOWER(email) = $1
       RETURNING id`,
      [emailLower]
    );
    deletedRecords.resourceLeads = leadResult.rowCount || 0;

    if (deletedRecords.resourceLeads > 0) {
      const leadIds = leadResult.rows.map(r => r.id);
      
      for (const leadId of leadIds) {
        const downloadResult = await pool.query(
          `DELETE FROM resource_downloads WHERE lead_id = $1 RETURNING id`,
          [leadId]
        );
        deletedRecords.resourceDownloads += downloadResult.rowCount || 0;

        const sessionResult = await pool.query(
          `DELETE FROM resource_sessions WHERE lead_id = $1 RETURNING id`,
          [leadId]
        );
        deletedRecords.resourceSessions += sessionResult.rowCount || 0;

        const otpResult = await pool.query(
          `DELETE FROM resource_otps WHERE lead_id = $1 RETURNING id`,
          [leadId]
        );
        deletedRecords.resourceOtps += otpResult.rowCount || 0;
      }
    }

    const contactResult = await pool.query(
      `DELETE FROM contact_submissions 
       WHERE LOWER(email) = $1
       RETURNING id`,
      [emailLower]
    );
    deletedRecords.contactSubmissions = contactResult.rowCount || 0;

    const sessionByHashResult = await pool.query(
      `DELETE FROM resource_sessions 
       WHERE email_hash = $1
       RETURNING id`,
      [emailHash]
    );
    deletedRecords.resourceSessions += sessionByHashResult.rowCount || 0;

    const totalDeleted = Object.values(deletedRecords).reduce((sum, count) => sum + count, 0);

    const auditLogId = await logAuditEvent(
      actor,
      "ERASURE_REQUEST",
      "gdpr_request",
      emailHash,
      null,
      {
        emailHash: emailHash.slice(0, 16) + "...",
        deletedRecords,
        totalDeleted,
      },
      req,
      {
        requestType: "right_to_erasure",
        gdprArticle: "Article 17",
      }
    );

    log.info({ totalDeleted, emailHashPrefix: emailHash.slice(0, 8) }, "Erasure complete");

    return {
      email: emailLower.replace(/(?<=.{2}).(?=.*@)/g, "*"),
      emailHash: emailHash.slice(0, 16) + "...",
      deletedRecords,
      totalDeleted,
      completedAt: new Date(),
      auditLogId,
    };
  } catch (error) {
    log.error({ err: error }, "Erasure request failed");
    throw new Error("Failed to process erasure request");
  }
}

export async function findUserData(email: string): Promise<{
  leads: number;
  contactSubmissions: number;
  sessions: number;
  downloads: number;
}> {
  const emailLower = email.toLowerCase().trim();
  const emailHash = hashForLookup(email);

  try {
    const [leadsResult, contactsResult, sessionsResult, downloadsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM resource_leads WHERE LOWER(email) = $1`, [emailLower]),
      pool.query(`SELECT COUNT(*) FROM contact_submissions WHERE LOWER(email) = $1`, [emailLower]),
      pool.query(`SELECT COUNT(*) FROM resource_sessions WHERE email_hash = $1`, [emailHash]),
      pool.query(
        `SELECT COUNT(*) FROM resource_downloads rd
         JOIN resource_leads rl ON rd.lead_id = rl.id
         WHERE LOWER(rl.email) = $1`,
        [emailLower]
      ),
    ]);

    return {
      leads: parseInt(leadsResult.rows[0].count, 10),
      contactSubmissions: parseInt(contactsResult.rows[0].count, 10),
      sessions: parseInt(sessionsResult.rows[0].count, 10),
      downloads: parseInt(downloadsResult.rows[0].count, 10),
    };
  } catch (error) {
    log.error({ err: error }, "Failed to find user data");
    return { leads: 0, contactSubmissions: 0, sessions: 0, downloads: 0 };
  }
}

export async function exportUserData(email: string): Promise<Record<string, unknown>> {
  const emailLower = email.toLowerCase().trim();
  const emailHash = hashForLookup(email);

  try {
    const [leadsResult, contactsResult, sessionsResult, downloadsResult] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, email, company, job_title, created_at, verified_at
         FROM resource_leads WHERE LOWER(email) = $1`,
        [emailLower]
      ),
      pool.query(
        `SELECT id, first_name, last_name, email, company, job_title, message, created_at
         FROM contact_submissions WHERE LOWER(email) = $1`,
        [emailLower]
      ),
      pool.query(
        `SELECT id, issued_at, expires_at, last_seen_at
         FROM resource_sessions WHERE email_hash = $1 AND revoked = false`,
        [emailHash]
      ),
      pool.query(
        `SELECT rd.id, rd.resource_id, rd.downloaded_at, rf.title as resource_title
         FROM resource_downloads rd
         JOIN resource_leads rl ON rd.lead_id = rl.id
         LEFT JOIN resource_files rf ON rd.resource_id = rf.id
         WHERE LOWER(rl.email) = $1`,
        [emailLower]
      ),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      dataSubject: {
        emailHash: emailHash.slice(0, 16) + "...",
      },
      leads: leadsResult.rows,
      contactSubmissions: contactsResult.rows,
      activeSessions: sessionsResult.rows.length,
      downloads: downloadsResult.rows,
    };
  } catch (error) {
    log.error({ err: error }, "Failed to export user data");
    throw new Error("Failed to export user data");
  }
}
