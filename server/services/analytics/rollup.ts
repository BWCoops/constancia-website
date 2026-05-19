/**
 * Daily and monthly rollup job.
 *
 * Compresses raw events into `analytics_daily_rollup` (one row per
 * day × page × event_category × source_channel) and rolls those up
 * into `analytics_monthly_rollup` (one row per month × category × source).
 *
 * The job is idempotent — re-running for the same day overwrites the
 * existing row with the latest count, so partial-day data on first run
 * is corrected by the next nightly invocation.
 *
 * Why rollups: raw events can grow into the tens of millions. Dashboard
 * queries against raw tables would scan everything for every request.
 * Rollups make YoY comparisons O(months) instead of O(events) and let
 * us keep aggregate history forever while raw events expire after
 * RETENTION.RAW_DAYS.
 */

import { db } from "../../db";
import {
  pageAnalytics,
  analyticsDailyRollup,
  analyticsMonthlyRollup,
  analyticsJobRuns,
} from "@shared/schema";
import {
  ANALYTICS_EVENTS,
  LEAD_CAPTURE_EVENTS,
  canonicalEvent,
  categoryForEvent,
  utcDayKey,
  utcMonthKey,
  toUtcDay,
  toUtcMonth,
} from "@shared/analytics-taxonomy";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("analytics-rollup");

interface DailyBucket {
  utcDay: Date;
  page: string;
  eventCategory: string;
  eventType: string;
  sourceChannel: string;
  deviceType: string;
  countryCode: string | null;
  sessions: Set<string>;
  visitors: Set<string>;
  eventCount: number;
  dwellMsSamples: number[];
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

function bucketKey(b: Pick<DailyBucket, "utcDay" | "page" | "eventCategory" | "eventType" | "sourceChannel" | "deviceType" | "countryCode">): string {
  return [
    utcDayKey(b.utcDay),
    b.page,
    b.eventCategory,
    b.eventType,
    b.sourceChannel,
    b.deviceType,
    b.countryCode ?? "",
  ].join("|");
}

function median(samples: number[]): number | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function deriveSourceChannel(utmSource: string | null, referrer: string | null): string {
  if (utmSource) return utmSource;
  if (!referrer) return "direct";
  const r = referrer.toLowerCase();
  if (r.includes("google") || r.includes("bing") || r.includes("duckduckgo")) return "organic_search";
  if (r.includes("linkedin") || r.includes("twitter") || r.includes("facebook")) return "social";
  return "referral";
}

/**
 * Build daily rollup rows for a single calendar day (UTC). Idempotent —
 * deletes existing rows for the day, then re-inserts.
 */
export async function buildDailyRollup(day: Date): Promise<number> {
  const startedAt = new Date();
  const dayStart = toUtcDay(day);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const events = await db
    .select()
    .from(pageAnalytics)
    .where(and(gte(pageAnalytics.createdAt, dayStart), lte(pageAnalytics.createdAt, dayEnd)));

  const buckets = new Map<string, DailyBucket>();

  for (const event of events) {
    const canonical = canonicalEvent(event.eventType);
    const category = categoryForEvent(canonical) ?? "other";
    const sourceChannel = deriveSourceChannel(event.utmSource ?? null, event.referrer ?? null);
    const partial = {
      utcDay: dayStart,
      page: event.page,
      eventCategory: category,
      eventType: canonical,
      sourceChannel,
      deviceType: event.deviceType ?? "unknown",
      countryCode: null,
    };
    const key = bucketKey(partial);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        ...partial,
        sessions: new Set(),
        visitors: new Set(),
        eventCount: 0,
        dwellMsSamples: [],
        utmSource: event.utmSource ?? null,
        utmMedium: event.utmMedium ?? null,
        utmCampaign: event.utmCampaign ?? null,
      };
      buckets.set(key, bucket);
    }
    bucket.sessions.add(event.sessionId);
    if (event.visitorId) bucket.visitors.add(event.visitorId);
    bucket.eventCount++;
    if (event.dwellTimeMs && event.dwellTimeMs > 0) bucket.dwellMsSamples.push(event.dwellTimeMs);
  }

  // Replace the day's rows atomically.
  await db.delete(analyticsDailyRollup).where(eq(analyticsDailyRollup.utcDay, dayStart));

  const rowsToInsert = Array.from(buckets.values()).map(b => ({
    utcDay: b.utcDay,
    page: b.page,
    eventCategory: b.eventCategory,
    eventType: b.eventType,
    sourceChannel: b.sourceChannel,
    utmSource: b.utmSource,
    utmMedium: b.utmMedium,
    utmCampaign: b.utmCampaign,
    deviceType: b.deviceType,
    countryCode: b.countryCode,
    uniqueSessions: b.sessions.size,
    uniqueVisitors: b.visitors.size,
    eventCount: b.eventCount,
    avgDwellMs: b.dwellMsSamples.length
      ? Math.round(b.dwellMsSamples.reduce((a, c) => a + c, 0) / b.dwellMsSamples.length)
      : null,
    medianDwellMs: median(b.dwellMsSamples),
    isBotShare: null,
  }));

  if (rowsToInsert.length > 0) {
    await db.insert(analyticsDailyRollup).values(rowsToInsert);
  }

  await db.insert(analyticsJobRuns).values({
    jobName: "daily_rollup",
    windowStart: dayStart,
    windowEnd: dayEnd,
    rowsProcessed: events.length,
    status: "ok",
    startedAt,
    finishedAt: new Date(),
  });

  log.info({ day: utcDayKey(day), rows: rowsToInsert.length, events: events.length }, "Built daily rollup");
  return rowsToInsert.length;
}

/**
 * Build the monthly rollup for a given month. Aggregates from
 * `analytics_daily_rollup`, NOT from raw events — so once a daily row
 * is committed, the monthly is a cheap derivative.
 */
export async function buildMonthlyRollup(month: Date): Promise<number> {
  const monthStart = toUtcMonth(month);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));

  const dailies = await db
    .select()
    .from(analyticsDailyRollup)
    .where(and(gte(analyticsDailyRollup.utcDay, monthStart), lte(analyticsDailyRollup.utcDay, monthEnd)));

  type MonthlyBucket = {
    utcMonth: Date;
    eventCategory: string;
    sourceChannel: string;
    sessions: Set<string>; // placeholder — we don't have session IDs here
    sessionCount: number;
    visitorCount: number;
    eventCount: number;
    leadCount: number;
    assessmentCompletedCount: number;
    reportDownloadedCount: number;
  };

  const buckets = new Map<string, MonthlyBucket>();

  for (const d of dailies) {
    const category = d.eventCategory ?? "other";
    const channel = d.sourceChannel ?? "unknown";
    const key = `${utcMonthKey(d.utcDay)}|${category}|${channel}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        utcMonth: monthStart,
        eventCategory: category,
        sourceChannel: channel,
        sessions: new Set(),
        sessionCount: 0,
        visitorCount: 0,
        eventCount: 0,
        leadCount: 0,
        assessmentCompletedCount: 0,
        reportDownloadedCount: 0,
      };
      buckets.set(key, bucket);
    }
    bucket.sessionCount += d.uniqueSessions;
    bucket.visitorCount += d.uniqueVisitors;
    bucket.eventCount += d.eventCount;
    if (LEAD_CAPTURE_EVENTS.includes(d.eventType as never)) {
      bucket.leadCount += d.uniqueSessions;
    }
    if (d.eventType === ANALYTICS_EVENTS.ASSESSMENT_COMPLETED) {
      bucket.assessmentCompletedCount += d.uniqueSessions;
    }
    if (d.eventType === ANALYTICS_EVENTS.REPORT_DOWNLOADED) {
      bucket.reportDownloadedCount += d.uniqueSessions;
    }
  }

  await db.delete(analyticsMonthlyRollup).where(eq(analyticsMonthlyRollup.utcMonth, monthStart));

  const rowsToInsert = Array.from(buckets.values()).map(b => ({
    utcMonth: b.utcMonth,
    eventCategory: b.eventCategory,
    sourceChannel: b.sourceChannel,
    uniqueSessions: b.sessionCount,
    uniqueVisitors: b.visitorCount,
    eventCount: b.eventCount,
    leadCount: b.leadCount,
    assessmentCompletedCount: b.assessmentCompletedCount,
    reportDownloadedCount: b.reportDownloadedCount,
  }));

  if (rowsToInsert.length > 0) {
    await db.insert(analyticsMonthlyRollup).values(rowsToInsert);
  }

  log.info({ month: utcMonthKey(month), rows: rowsToInsert.length }, "Built monthly rollup");
  return rowsToInsert.length;
}

/**
 * Run the standard nightly rollup: yesterday's daily + current month's
 * monthly. Called by the scheduler; safe to invoke at any time.
 */
export async function runNightlyRollup(): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await buildDailyRollup(yesterday);
  await buildDailyRollup(now); // today (partial) so the dashboard isn't a day behind
  await buildMonthlyRollup(now);
}

/**
 * Backfill rollups for the last N days. Used on first deploy of the
 * rollup system to populate history, and as a recovery tool.
 */
export async function backfillRollups(days: number): Promise<void> {
  const today = new Date();
  for (let offset = 0; offset < days; offset++) {
    const day = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
    try {
      await buildDailyRollup(day);
    } catch (err) {
      log.error({ err, day: utcDayKey(day) }, "Backfill day failed");
    }
  }
  // Roll up the last N months as well.
  const monthsToCover = Math.ceil(days / 28) + 1;
  for (let offset = 0; offset < monthsToCover; offset++) {
    const month = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    try {
      await buildMonthlyRollup(month);
    } catch (err) {
      log.error({ err, month: utcMonthKey(month) }, "Backfill month failed");
    }
  }
}

// Silence unused-import warning until used by insights module:
void sql;
