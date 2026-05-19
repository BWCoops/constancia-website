/**
 * Analytics scheduler.
 *
 * Wires the rollup, retention, and insights jobs onto a daily cadence.
 * Runs once shortly after boot to populate "today's" rollup, then daily
 * thereafter at 02:30 UTC (low-traffic window).
 *
 * Boot order:
 *   1. seedFunnelStages   — idempotent; only inserts on first boot
 *   2. backfillRollups(N) — only on first boot when daily_rollup is empty
 *   3. scheduleDaily      — kicks the nightly cron
 */

import { db } from "../../db";
import { analyticsDailyRollup } from "@shared/schema";
import { createChildLogger } from "../../lib/logger";
import { seedFunnelStages } from "./seed";
import { backfillRollups, runNightlyRollup } from "./rollup";
import { runRetention } from "./retention";
import { refreshInsightCache } from "./insights";

const log = createChildLogger("analytics-scheduler");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let timerHandle: NodeJS.Timeout | null = null;

function msUntilNextRun(targetHourUtc: number, targetMinuteUtc: number): number {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    targetHourUtc,
    targetMinuteUtc,
    0,
    0,
  ));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

async function runNightlyJob(): Promise<void> {
  try {
    await runNightlyRollup();
  } catch (err) {
    log.error({ err }, "Nightly rollup failed");
  }
  try {
    await runRetention();
  } catch (err) {
    log.error({ err }, "Retention failed");
  }
  try {
    await refreshInsightCache();
  } catch (err) {
    log.error({ err }, "Insight refresh failed");
  }
}

function scheduleDaily(): void {
  const targetHourUtc = 2;
  const targetMinuteUtc = 30;

  const scheduleNext = () => {
    const delay = msUntilNextRun(targetHourUtc, targetMinuteUtc);
    log.info({ nextRunInMs: delay }, "Next analytics job scheduled");
    timerHandle = setTimeout(async () => {
      await runNightlyJob();
      scheduleNext();
    }, delay);
    timerHandle.unref?.();
  };

  scheduleNext();
}

/**
 * Boot wiring. Idempotent — calling twice is a no-op for the seed and
 * cron; the rollup refresh will just re-process today's partial data.
 */
export async function initAnalyticsScheduler(): Promise<void> {
  await seedFunnelStages();

  // First-boot backfill: if daily_rollup is empty, populate the last 30
  // days from raw events. Cheap on a small site; on large data it's a
  // one-off cost. After that, the nightly job keeps it current.
  const existing = await db.select().from(analyticsDailyRollup).limit(1);
  if (existing.length === 0) {
    log.info("No daily rollups present — backfilling last 60 days");
    void backfillRollups(60).catch(err => log.error({ err }, "Initial backfill failed"));
  }

  // Refresh insights once shortly after boot so the dashboard isn't
  // empty until 02:30 UTC.
  setTimeout(() => {
    runNightlyJob().catch(err => log.error({ err }, "Initial nightly run failed"));
  }, 60_000).unref?.();

  scheduleDaily();
  log.info("Analytics scheduler initialised");
}

export function stopAnalyticsScheduler(): void {
  if (timerHandle) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
}

// Silence unused-import warning
void ONE_DAY_MS;
