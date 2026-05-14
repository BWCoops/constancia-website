/**
 * Startup Backfill Job
 * 
 * Runs data quality backfill ONCE on first publish to ensure all records
 * are properly validated and standardized for data monetization.
 * 
 * This job:
 * 1. Backfills FC Assessment quality data
 * 2. Backfills Widget Analytics session quality data
 * 3. Standardizes country codes and industries
 * 4. Logs results for monitoring
 * 5. Stores completion flag in database to prevent re-running
 * 
 * @version 1.1
 */

import { createChildLogger } from "../../../lib/logger";
import { dataQualityService } from './quality-validation.service';
import { widgetQualityService } from './widget-quality.service';
import { db } from '../../../db';
import { sql } from 'drizzle-orm';

const log = createChildLogger("startup-backfill");

interface StartupBackfillResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  assessments: {
    total: number;
    valid: number;
    invalid: number;
    companiesUpdated: number;
    errors: string[];
  };
  widgets: {
    total: number;
    valid: number;
    invalid: number;
    errors: string[];
  };
}

let lastBackfillResult: StartupBackfillResult | null = null;
let isBackfillRunning = false;

const BACKFILL_FLAG_KEY = 'data_quality_backfill_v1_completed';

/**
 * Check if initial backfill has already been completed
 */
async function hasBackfillCompleted(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT value FROM system_settings WHERE key = ${BACKFILL_FLAG_KEY}
    `);
    return (result.rows as any[]).length > 0;
  } catch {
    // Table might not exist or other error - proceed with backfill
    return false;
  }
}

/**
 * Mark backfill as completed in database
 */
async function markBackfillCompleted(): Promise<void> {
  try {
    // Create system_settings table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert completion flag
    await db.execute(sql`
      INSERT INTO system_settings (key, value)
      VALUES (${BACKFILL_FLAG_KEY}, ${new Date().toISOString()})
      ON CONFLICT (key) DO UPDATE SET value = ${new Date().toISOString()}
    `);
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to mark backfill as completed");
  }
}

/**
 * Run the complete data quality backfill
 */
export async function runStartupBackfill(): Promise<StartupBackfillResult> {
  if (isBackfillRunning) {
    log.info("Backfill already running, skipping");
    return lastBackfillResult || {
      success: false,
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      assessments: { total: 0, valid: 0, invalid: 0, companiesUpdated: 0, errors: ['Backfill already running'] },
      widgets: { total: 0, valid: 0, invalid: 0, errors: [] },
    };
  }

  isBackfillRunning = true;
  const startTime = new Date();
  log.info("Starting startup backfill job");

  const result: StartupBackfillResult = {
    success: true,
    startTime,
    endTime: new Date(),
    durationMs: 0,
    assessments: { total: 0, valid: 0, invalid: 0, companiesUpdated: 0, errors: [] },
    widgets: { total: 0, valid: 0, invalid: 0, errors: [] },
  };

  try {
    // 1. Backfill FC Assessments
    log.info("Backfilling FC Assessments");
    const assessmentStats = await dataQualityService.backfillAllAssessments();
    result.assessments = {
      total: assessmentStats.totalAssessments,
      valid: assessmentStats.validRecords,
      invalid: assessmentStats.invalidRecords,
      companiesUpdated: assessmentStats.companiesUpdated,
      errors: assessmentStats.errors.slice(0, 10), // Limit errors for logging
    };
    log.info({ valid: assessmentStats.validRecords, invalid: assessmentStats.invalidRecords, total: assessmentStats.totalAssessments }, "FC Assessments backfill complete");

    // 2. Backfill Widget Analytics
    log.info("Backfilling Widget Analytics sessions");
    const widgetStats = await widgetQualityService.aggregateAndValidateSessions();
    result.widgets = {
      total: widgetStats.totalSessions,
      valid: widgetStats.validSessions,
      invalid: widgetStats.invalidSessions,
      errors: widgetStats.errors.slice(0, 10),
    };
    log.info({ valid: widgetStats.validSessions, invalid: widgetStats.invalidSessions, total: widgetStats.totalSessions }, "Widget Sessions backfill complete");

  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Startup backfill failed");
    result.success = false;
    result.assessments.errors.push(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();
    isBackfillRunning = false;
    lastBackfillResult = result;

    log.info({ durationMs: result.durationMs }, "Backfill completed");
    log.info({ totalValid: result.assessments.valid + result.widgets.valid }, "Backfill summary");
    
    // Mark as completed in database so it won't run again
    if (result.success) {
      await markBackfillCompleted();
      log.info("Backfill marked as completed - will not run on next restart");
    }
  }

  return result;
}

/**
 * Get the result of the last backfill run
 */
export function getLastBackfillResult(): StartupBackfillResult | null {
  return lastBackfillResult;
}

/**
 * Check if backfill is currently running
 */
export function isBackfillInProgress(): boolean {
  return isBackfillRunning;
}

/**
 * Schedule backfill to run after a delay (for startup)
 * Only runs ONCE on first publish - checks database flag to prevent re-running
 */
export function scheduleStartupBackfill(delayMs: number = 30000): void {
  log.info({ delaySeconds: delayMs / 1000 }, "Scheduling startup backfill check");
  setTimeout(async () => {
    try {
      // Check if backfill has already been completed
      const alreadyCompleted = await hasBackfillCompleted();
      if (alreadyCompleted) {
        log.info("Backfill already completed previously - skipping");
        return;
      }
      
      log.info("First-time backfill - running now");
      await runStartupBackfill();
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Scheduled backfill failed");
    }
  }, delayMs);
}
