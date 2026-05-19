/**
 * Retention enforcement.
 *
 * Two stages:
 *   - Scrub PII columns (ip_address, raw user_agent) on rows older than
 *     RETENTION.PII_DAYS. The row is kept (it still contributes to
 *     analytics), but identifying fields are null'd.
 *   - Delete rows older than RETENTION.RAW_DAYS. Rollups already hold
 *     the aggregate data we need for YoY; the raw event is no longer
 *     needed.
 *
 * Rollups never expire. The whole point of having them is so we can
 * shed raw data while still keeping year-over-year history.
 */

import { db } from "../../db";
import { pageAnalytics, widgetAnalytics, analyticsJobRuns } from "@shared/schema";
import { RETENTION } from "@shared/analytics-taxonomy";
import { lt, sql } from "drizzle-orm";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("analytics-retention");

export async function scrubPii(): Promise<void> {
  const startedAt = new Date();
  const cutoff = new Date(Date.now() - RETENTION.PII_DAYS * 24 * 60 * 60 * 1000);

  const pageRes = await db
    .update(pageAnalytics)
    .set({ ipAddress: null, userAgent: null })
    .where(sql`${pageAnalytics.createdAt} < ${cutoff} AND (${pageAnalytics.ipAddress} IS NOT NULL OR ${pageAnalytics.userAgent} IS NOT NULL)`);

  const widgetRes = await db
    .update(widgetAnalytics)
    .set({ ipAddress: null, userAgent: null })
    .where(sql`${widgetAnalytics.createdAt} < ${cutoff} AND (${widgetAnalytics.ipAddress} IS NOT NULL OR ${widgetAnalytics.userAgent} IS NOT NULL)`);

  log.info({ cutoff: cutoff.toISOString(), pageAffected: (pageRes as any).rowCount, widgetAffected: (widgetRes as any).rowCount }, "Scrubbed PII");
  await db.insert(analyticsJobRuns).values({
    jobName: "pii_scrub",
    windowStart: cutoff,
    windowEnd: new Date(),
    rowsProcessed: ((pageRes as any).rowCount ?? 0) + ((widgetRes as any).rowCount ?? 0),
    status: "ok",
    startedAt,
    finishedAt: new Date(),
  });
}

export async function expireRawEvents(): Promise<void> {
  const startedAt = new Date();
  const cutoff = new Date(Date.now() - RETENTION.RAW_DAYS * 24 * 60 * 60 * 1000);

  const pageRes = await db.delete(pageAnalytics).where(lt(pageAnalytics.createdAt, cutoff));
  const widgetRes = await db.delete(widgetAnalytics).where(lt(widgetAnalytics.createdAt, cutoff));

  log.info({ cutoff: cutoff.toISOString(), pageDeleted: (pageRes as any).rowCount, widgetDeleted: (widgetRes as any).rowCount }, "Expired raw events");
  await db.insert(analyticsJobRuns).values({
    jobName: "raw_expire",
    windowStart: cutoff,
    windowEnd: new Date(),
    rowsProcessed: ((pageRes as any).rowCount ?? 0) + ((widgetRes as any).rowCount ?? 0),
    status: "ok",
    startedAt,
    finishedAt: new Date(),
  });
}

export async function runRetention(): Promise<void> {
  await scrubPii();
  await expireRawEvents();
}
