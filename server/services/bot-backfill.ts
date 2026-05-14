/**
 * Bot Traffic Backfill Script
 * 
 * Runs ONCE on first publish to update historical page_views and visitor_sessions
 * with the is_bot flag based on user agent patterns.
 * 
 * This ensures all historical analytics data is properly flagged for bot exclusion.
 * Uses database flag to prevent re-running on subsequent restarts.
 * 
 * @version 1.0
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { detectBot } from '../api/analytics/handlers';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("bot-backfill");

interface BotBackfillResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  pageViews: {
    total: number;
    botsFound: number;
    errors: string[];
  };
  sessions: {
    total: number;
    botsFound: number;
    errors: string[];
  };
}

let lastBackfillResult: BotBackfillResult | null = null;
let isBackfillRunning = false;

const BOT_BACKFILL_FLAG_KEY = 'bot_traffic_backfill_v1_completed';

/**
 * Check if bot backfill has already been completed
 */
async function hasBackfillCompleted(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT value FROM system_settings WHERE key = ${BOT_BACKFILL_FLAG_KEY}
    `);
    return (result.rows as any[]).length > 0;
  } catch {
    return false;
  }
}

/**
 * Mark backfill as completed in database
 */
async function markBackfillCompleted(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await db.execute(sql`
      INSERT INTO system_settings (key, value)
      VALUES (${BOT_BACKFILL_FLAG_KEY}, ${new Date().toISOString()})
      ON CONFLICT (key) DO UPDATE SET value = ${new Date().toISOString()}
    `);
  } catch (error) {
    log.error({ err: error }, "Failed to mark backfill as completed");
  }
}

/**
 * Run the bot traffic backfill
 */
export async function runBotBackfill(): Promise<BotBackfillResult> {
  if (isBackfillRunning) {
    log.info("Already running, skipping...");
    return lastBackfillResult || {
      success: false,
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      pageViews: { total: 0, botsFound: 0, errors: ['Already running'] },
      sessions: { total: 0, botsFound: 0, errors: [] },
    };
  }

  isBackfillRunning = true;
  const startTime = new Date();
  log.info("Starting bot traffic backfill...");

  const result: BotBackfillResult = {
    success: true,
    startTime,
    endTime: new Date(),
    durationMs: 0,
    pageViews: { total: 0, botsFound: 0, errors: [] },
    sessions: { total: 0, botsFound: 0, errors: [] },
  };

  try {
    log.info("Processing page_views...");
    const pageViewsResult = await db.execute(sql`
      SELECT id, user_agent FROM page_views WHERE is_bot IS NULL OR is_bot = false
    `);
    
    const pageViews = pageViewsResult.rows as Array<{ id: number; user_agent: string | null }>;
    result.pageViews.total = pageViews.length;
    
    let pvBotsFound = 0;
    const batchSize = 100;
    
    for (let i = 0; i < pageViews.length; i += batchSize) {
      const batch = pageViews.slice(i, i + batchSize);
      
      for (const pv of batch) {
        if (pv.user_agent && detectBot(pv.user_agent)) {
          await db.execute(sql`
            UPDATE page_views SET is_bot = true WHERE id = ${pv.id}
          `);
          pvBotsFound++;
        }
      }
    }
    
    result.pageViews.botsFound = pvBotsFound;
    log.info({ botsFound: pvBotsFound, total: pageViews.length }, "Page views processed");

    log.info("Updating visitor_sessions based on linked bot page views...");
    const sessionUpdateResult = await db.execute(sql`
      UPDATE visitor_sessions vs
      SET is_bot = true
      FROM page_views pv
      WHERE pv.session_id = vs.id::text
        AND pv.is_bot = true
        AND (vs.is_bot IS NULL OR vs.is_bot = false)
    `);
    
    const botSessionsCount = await db.execute(sql`
      SELECT COUNT(DISTINCT id) as count FROM visitor_sessions WHERE is_bot = true
    `);
    
    result.sessions.botsFound = parseInt((botSessionsCount.rows[0] as any)?.count || '0');
    result.sessions.total = result.sessions.botsFound;
    log.info({ botsFound: result.sessions.botsFound }, "Sessions marked as bots");

  } catch (error) {
    log.error({ err: error }, "Backfill failed");
    result.success = false;
    result.pageViews.errors.push(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();
    isBackfillRunning = false;
    lastBackfillResult = result;

    log.info({ durationMs: result.durationMs }, "Backfill completed");
    log.info({ totalBotsFlagged: result.pageViews.botsFound + result.sessions.botsFound }, "Total bots flagged");
    
    if (result.success) {
      await markBackfillCompleted();
      log.info("Marked as completed - will not run on next restart");
    }
  }

  return result;
}

/**
 * Schedule bot backfill to run after startup delay
 * Only runs ONCE on first publish
 */
export function scheduleBotBackfill(delayMs: number = 35000): void {
  log.info({ delaySeconds: delayMs / 1000 }, "Scheduling backfill check...");
  setTimeout(async () => {
    try {
      const alreadyCompleted = await hasBackfillCompleted();
      if (alreadyCompleted) {
        log.info("Already completed previously - skipping");
        return;
      }
      
      log.info("First-time backfill - running now...");
      await runBotBackfill();
    } catch (error) {
      log.error({ err: error }, "Scheduled backfill failed");
    }
  }, delayMs);
}
