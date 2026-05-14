import { db } from "../db";
import { blogPosts, scheduledScans } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { scanBlogPost } from "./winston-ai";
import { runComprehensiveWeeklyScan } from "./weekly-scan-service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("scan-scheduler");

type ScanInterval = "disabled" | "weekly" | "monthly";

interface SchedulerState {
  lastScanDate: Date | null;
  nextScheduledScan: Date | null;
  isRunning: boolean;
  currentScanId: string | null;
  interval: ScanInterval;
  enabled: boolean;
}

interface ScanProgress {
  scanId: string;
  totalPosts: number;
  scannedPosts: number;
  failedPosts: number;
  currentPostTitle: string | null;
  startedAt: Date;
}

const SCHEDULER_ADMIN_ID = "scheduler";
const SCAN_DELAY_MS = 5000;
const HOUR_MS = 60 * 60 * 1000;

let schedulerState: SchedulerState = {
  lastScanDate: null,
  nextScheduledScan: null,
  isRunning: false,
  currentScanId: null,
  interval: "weekly",
  enabled: true,
};

let currentProgress: ScanProgress | null = null;
let checkInterval: NodeJS.Timeout | null = null;

function calculateNextScanDate(fromDate: Date, interval: ScanInterval): Date | null {
  if (interval === "disabled") {
    return null;
  }

  const nextDate = new Date(fromDate);
  
  if (interval === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (interval === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate;
}

async function initializeSchedulerState() {
  try {
    const lastScan = await db.select()
      .from(scheduledScans)
      .where(eq(scheduledScans.status, "completed"))
      .orderBy(desc(scheduledScans.completedAt))
      .limit(1);

    if (lastScan.length > 0 && lastScan[0].completedAt) {
      schedulerState.lastScanDate = new Date(lastScan[0].completedAt);
      schedulerState.nextScheduledScan = calculateNextScanDate(
        schedulerState.lastScanDate,
        schedulerState.interval
      );
      log.info(`Loaded last scan date: ${schedulerState.lastScanDate.toISOString()}`);
    } else {
      schedulerState.nextScheduledScan = new Date();
      log.info("No previous scans found, next scan scheduled for now");
    }

    const runningScans = await db.select()
      .from(scheduledScans)
      .where(eq(scheduledScans.status, "running"))
      .limit(1);

    if (runningScans.length > 0) {
      await db.update(scheduledScans)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(scheduledScans.id, runningScans[0].id));
      log.info(`Marked interrupted scan ${runningScans[0].id} as failed`);
    }
  } catch (error: any) {
    log.error({ err: new Error(error.message) }, "Error initializing scheduler state");
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runScheduledScan(
  triggeredBy: string = SCHEDULER_ADMIN_ID,
  scanType: "monthly_full" | "manual_bulk" = "monthly_full"
): Promise<{ success: boolean; scanId?: string; error?: string }> {
  if (schedulerState.isRunning) {
    return { success: false, error: "A scan is already in progress" };
  }

  log.info({ scanType, triggeredBy }, "Starting scan");

  try {
    const publishedPosts = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
    })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true));

    if (publishedPosts.length === 0) {
      log.info("No published posts to scan");
      return { success: false, error: "No published posts to scan" };
    }

    const [scanRecord] = await db.insert(scheduledScans).values({
      scanType,
      status: "running",
      totalPosts: publishedPosts.length,
      scannedPosts: 0,
      failedPosts: 0,
      startedAt: new Date(),
      triggeredBy,
    }).returning();

    schedulerState.isRunning = true;
    schedulerState.currentScanId = scanRecord.id;

    currentProgress = {
      scanId: scanRecord.id,
      totalPosts: publishedPosts.length,
      scannedPosts: 0,
      failedPosts: 0,
      currentPostTitle: null,
      startedAt: new Date(),
    };

    log.info({ scanId: scanRecord.id, totalPosts: publishedPosts.length }, "Created scan record");

    let scannedCount = 0;
    let failedCount = 0;

    for (const post of publishedPosts) {
      if (!schedulerState.isRunning) {
        log.info("Scan was cancelled");
        break;
      }

      currentProgress.currentPostTitle = post.title;
      log.info({ title: post.title, progress: `${scannedCount + 1}/${publishedPosts.length}` }, "Scanning post");

      try {
        await scanBlogPost(post.id, triggeredBy, "ai_detection");
        scannedCount++;
      } catch (error: any) {
        log.error({ err: new Error(error.message), title: post.title }, "Failed to scan post");
        failedCount++;
      }

      currentProgress.scannedPosts = scannedCount;
      currentProgress.failedPosts = failedCount;

      await db.update(scheduledScans)
        .set({
          scannedPosts: scannedCount,
          failedPosts: failedCount,
        })
        .where(eq(scheduledScans.id, scanRecord.id));

      if (publishedPosts.indexOf(post) < publishedPosts.length - 1) {
        await delay(SCAN_DELAY_MS);
      }
    }

    const finalStatus = failedCount === publishedPosts.length ? "failed" : "completed";
    const completedAt = new Date();

    await db.update(scheduledScans)
      .set({
        status: finalStatus,
        scannedPosts: scannedCount,
        failedPosts: failedCount,
        completedAt,
      })
      .where(eq(scheduledScans.id, scanRecord.id));

    schedulerState.isRunning = false;
    schedulerState.currentScanId = null;
    schedulerState.lastScanDate = completedAt;
    schedulerState.nextScheduledScan = calculateNextScanDate(completedAt, schedulerState.interval);

    currentProgress = null;

    log.info({ scannedCount, failedCount }, "Scan completed");

    return { success: true, scanId: scanRecord.id };
  } catch (error: any) {
    log.error({ err: new Error(error.message) }, "Scan failed");

    if (schedulerState.currentScanId) {
      await db.update(scheduledScans)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(scheduledScans.id, schedulerState.currentScanId));
    }

    schedulerState.isRunning = false;
    schedulerState.currentScanId = null;
    currentProgress = null;

    return { success: false, error: error.message };
  }
}

export function checkAndRunScheduledScans() {
  if (!schedulerState.enabled || schedulerState.interval === "disabled") {
    return;
  }

  if (schedulerState.isRunning) {
    log.info("Scan already in progress, skipping scheduled check");
    return;
  }

  const now = new Date();

  if (schedulerState.nextScheduledScan && now >= schedulerState.nextScheduledScan) {
    log.info("Scheduled scan time reached, starting scan");
    
    if (schedulerState.interval === "weekly") {
      runComprehensiveWeeklyScan(SCHEDULER_ADMIN_ID).then(result => {
        if (result.success) {
          schedulerState.lastScanDate = new Date();
          schedulerState.nextScheduledScan = calculateNextScanDate(
            schedulerState.lastScanDate,
            schedulerState.interval
          );
          schedulerState.isRunning = false;
          log.info({ nextScan: schedulerState.nextScheduledScan?.toISOString() }, "Weekly scan completed");
        } else {
          schedulerState.isRunning = false;
          schedulerState.nextScheduledScan = calculateNextScanDate(new Date(), schedulerState.interval);
          log.error({ error: result.error, nextRetry: schedulerState.nextScheduledScan?.toISOString() }, "Weekly scan failed");
        }
      }).catch(error => {
        schedulerState.isRunning = false;
        schedulerState.nextScheduledScan = calculateNextScanDate(new Date(), schedulerState.interval);
        log.error({ err: new Error(error.message), nextRetry: schedulerState.nextScheduledScan?.toISOString() }, "Weekly scan error");
      });
      schedulerState.isRunning = true;
    } else {
      runScheduledScan(SCHEDULER_ADMIN_ID, "monthly_full").catch(error => {
        log.error({ err: new Error(error.message) }, "Monthly scan failed");
      });
    }
  }
}

export function initializeScheduler() {
  log.info("Initializing scan scheduler...");

  initializeSchedulerState().then(() => {
    checkInterval = setInterval(() => {
      checkAndRunScheduledScans();
    }, HOUR_MS);

    log.info({ nextScan: schedulerState.nextScheduledScan?.toISOString() || "Not scheduled" }, "Scheduler initialized, checking every hour");
  });
}

export function stopScheduler() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    log.info("Scheduler stopped");
  }
}

export function getSchedulerStatus(): {
  enabled: boolean;
  interval: ScanInterval;
  isRunning: boolean;
  lastScanDate: string | null;
  nextScheduledScan: string | null;
  currentProgress: ScanProgress | null;
} {
  return {
    enabled: schedulerState.enabled,
    interval: schedulerState.interval,
    isRunning: schedulerState.isRunning,
    lastScanDate: schedulerState.lastScanDate?.toISOString() || null,
    nextScheduledScan: schedulerState.nextScheduledScan?.toISOString() || null,
    currentProgress: currentProgress,
  };
}

export function configureScheduler(config: {
  enabled?: boolean;
  interval?: ScanInterval;
}): { success: boolean } {
  if (config.enabled !== undefined) {
    schedulerState.enabled = config.enabled;
    log.info({ enabled: config.enabled }, `Scheduler ${config.enabled ? "enabled" : "disabled"}`);
  }

  if (config.interval !== undefined) {
    schedulerState.interval = config.interval;
    
    if (schedulerState.lastScanDate) {
      schedulerState.nextScheduledScan = calculateNextScanDate(
        schedulerState.lastScanDate,
        config.interval
      );
    } else if (config.interval !== "disabled") {
      schedulerState.nextScheduledScan = new Date();
    } else {
      schedulerState.nextScheduledScan = null;
    }
    
    log.info({ interval: config.interval, nextScan: schedulerState.nextScheduledScan?.toISOString() || "None" }, "Interval changed");
  }

  return { success: true };
}

export function cancelCurrentScan(): { success: boolean; message: string } {
  if (!schedulerState.isRunning) {
    return { success: false, message: "No scan is currently running" };
  }

  schedulerState.isRunning = false;
  log.info("Scan cancellation requested");

  return { success: true, message: "Scan cancellation requested" };
}

export async function getScheduledScans(limit: number = 20) {
  return await db.select()
    .from(scheduledScans)
    .orderBy(desc(scheduledScans.createdAt))
    .limit(limit);
}
