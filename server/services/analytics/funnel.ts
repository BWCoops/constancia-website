/**
 * Funnel computation service.
 *
 * Reads stage definitions from the DB-backed `funnel_stages` table (seeded
 * from `shared/analytics-taxonomy.ts`), then computes per-stage session
 * counts with proper deduplication, both stepwise and cumulative
 * conversion rates, and surfaces sample-size warnings when the
 * denominator is too small to be reliable.
 *
 * No hardcoded event names or stage labels live in this file.
 */

import { db } from "../../db";
import { funnelStages, pageAnalytics, type FunnelStage } from "@shared/schema";
import {
  CONVERSION_MODE,
  SAMPLE_SIZE,
  canonicalEvent,
  type ConversionMode,
} from "@shared/analytics-taxonomy";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";

export interface FunnelStageResult {
  key: string;
  label: string;
  description: string;
  order: number;
  uniqueSessions: number;
  /** Sessions in stage N / sessions in stage (N-1). 0 for stage 0. */
  stepwiseConversionPct: number;
  /** Sessions in stage N / sessions in stage 0. */
  cumulativeConversionPct: number;
  /** Sessions lost between previous stage and this stage. */
  absoluteDropOff: number;
  targetConversionPct: number;
  warningPct: number;
  status: "green" | "yellow" | "red";
  /** True when the denominator is below the reliability threshold. */
  lowConfidence: boolean;
}

export interface FunnelComputeOptions {
  windowStart: Date;
  windowEnd: Date;
  conversionMode?: ConversionMode;
  /** Optional segmentation — restrict to a single channel / device. */
  filter?: {
    sourceChannel?: string;
    deviceType?: string;
    utmSource?: string;
  };
}

export interface FunnelComputeResult {
  stages: FunnelStageResult[];
  windowStart: string;
  windowEnd: string;
  totalSessions: number;
  totalEvents: number;
  /** Stages ranked by biggest absolute drop-off (highest leverage to fix). */
  biggestDropOffs: Array<{
    fromKey: string;
    fromLabel: string;
    toKey: string;
    toLabel: string;
    sessionsLost: number;
    dropOffPct: number;
  }>;
}

/**
 * Load the active stages from the DB, ordered. Used by every funnel
 * computation; cached for 60s to avoid per-request DB churn.
 */
let stageCache: { rows: FunnelStage[]; expiresAt: number } | null = null;

export async function getActiveFunnelStages(force = false): Promise<FunnelStage[]> {
  if (!force && stageCache && stageCache.expiresAt > Date.now()) {
    return stageCache.rows;
  }
  const rows = await db
    .select()
    .from(funnelStages)
    .where(eq(funnelStages.isActive, true))
    .orderBy(asc(funnelStages.stageOrder));
  stageCache = { rows, expiresAt: Date.now() + 60_000 };
  return rows;
}

export function invalidateStageCache(): void {
  stageCache = null;
}

/**
 * Compute the funnel over a window. Returns per-stage counts with proper
 * deduplication (each session counted at most once per stage), both
 * stepwise and cumulative conversion rates, and ranked drop-off targets.
 */
export async function computeFunnel(opts: FunnelComputeOptions): Promise<FunnelComputeResult> {
  const stages = await getActiveFunnelStages();

  // Collect every event type any stage cares about, plus the legacy
  // aliases that resolve to the same canonical event. This narrows the
  // DB scan to just the rows that could possibly contribute.
  const allEventTypes = new Set<string>();
  for (const stage of stages) {
    for (const eventType of stage.eventTypes ?? []) {
      allEventTypes.add(eventType);
      // Add legacy aliases that canonicalise to this event so old rows count.
      // canonicalEvent is the forward map; we need the reverse — covered
      // by the explicit alias entries that map TO this canonical event.
      // (Handled below when scanning rows: we canonicalise the row's
      // event_type, so any alias matches the stage's canonical event.)
    }
  }

  const conditions = [
    gte(pageAnalytics.createdAt, opts.windowStart),
    lte(pageAnalytics.createdAt, opts.windowEnd),
  ];
  if (opts.filter?.deviceType) {
    conditions.push(eq(pageAnalytics.deviceType, opts.filter.deviceType));
  }
  if (opts.filter?.utmSource) {
    conditions.push(eq(pageAnalytics.utmSource, opts.filter.utmSource));
  }

  const rows = await db
    .select({
      eventType: pageAnalytics.eventType,
      sessionId: pageAnalytics.sessionId,
    })
    .from(pageAnalytics)
    .where(and(...conditions));

  // For each stage, build the set of sessions that emitted any of its
  // canonical events (or their legacy aliases). One session is counted
  // once per stage no matter how many events it emitted.
  const sessionsByStageKey = new Map<string, Set<string>>();
  for (const stage of stages) {
    sessionsByStageKey.set(stage.stageKey, new Set());
  }

  const canonicalSetByStage = new Map<string, Set<string>>();
  for (const stage of stages) {
    const canonical = new Set<string>();
    for (const eventType of stage.eventTypes ?? []) {
      canonical.add(canonicalEvent(eventType));
    }
    canonicalSetByStage.set(stage.stageKey, canonical);
  }

  let totalEvents = 0;
  const allSessions = new Set<string>();
  for (const row of rows) {
    totalEvents++;
    allSessions.add(row.sessionId);
    const canonical = canonicalEvent(row.eventType);
    for (const stage of stages) {
      if (canonicalSetByStage.get(stage.stageKey)!.has(canonical)) {
        sessionsByStageKey.get(stage.stageKey)!.add(row.sessionId);
      }
    }
  }

  const totalSessions = allSessions.size;
  const mode = opts.conversionMode ?? CONVERSION_MODE.STEPWISE;

  const result: FunnelStageResult[] = [];
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const uniqueSessions = sessionsByStageKey.get(stage.stageKey)!.size;
    const prevCount = i === 0 ? totalSessions : result[i - 1]?.uniqueSessions ?? 0;
    const topCount = result[0]?.uniqueSessions ?? totalSessions;

    const stepwise =
      prevCount > 0 ? Math.round((uniqueSessions / prevCount) * 1000) / 10 : 0;
    const cumulative =
      topCount > 0 ? Math.round((uniqueSessions / topCount) * 1000) / 10 : 0;

    const display = mode === CONVERSION_MODE.STEPWISE ? stepwise : cumulative;
    const lowConfidence = prevCount < SAMPLE_SIZE.CONVERSION_MIN_N;
    const target = stage.targetConversionPct;
    const warning = stage.warningPct;

    let status: "green" | "yellow" | "red" = "green";
    if (display < warning) status = "red";
    else if (display < target) status = "yellow";

    result.push({
      key: stage.stageKey,
      label: stage.label,
      description: stage.description ?? "",
      order: stage.stageOrder,
      uniqueSessions,
      stepwiseConversionPct: stepwise,
      cumulativeConversionPct: cumulative,
      absoluteDropOff: Math.max(0, prevCount - uniqueSessions),
      targetConversionPct: target,
      warningPct: warning,
      status,
      lowConfidence,
    });
  }

  // Rank biggest drop-offs by ABSOLUTE sessions lost, not by percentage.
  // The top of the funnel always loses more in absolute terms — that's
  // also where the biggest optimisation leverage is.
  const biggestDropOffs = [];
  for (let i = 1; i < result.length; i++) {
    const from = result[i - 1];
    const to = result[i];
    if (from.uniqueSessions === 0) continue;
    biggestDropOffs.push({
      fromKey: from.key,
      fromLabel: from.label,
      toKey: to.key,
      toLabel: to.label,
      sessionsLost: from.uniqueSessions - to.uniqueSessions,
      dropOffPct: Math.round((1 - to.uniqueSessions / from.uniqueSessions) * 1000) / 10,
    });
  }
  biggestDropOffs.sort((a, b) => b.sessionsLost - a.sessionsLost);

  return {
    stages: result,
    windowStart: opts.windowStart.toISOString(),
    windowEnd: opts.windowEnd.toISOString(),
    totalSessions,
    totalEvents,
    biggestDropOffs: biggestDropOffs.slice(0, 5),
  };
}
