/**
 * Insight generator.
 *
 * Runs after the nightly rollup. Reads from the rollup tables (cheap)
 * and applies the rules defined in `shared/analytics-insights.ts` to
 * produce a ranked list of decisions/recommendations for the admin.
 *
 * Each rule:
 *   1. Pulls the relevant rollup window.
 *   2. Decides whether it fires (against thresholds in INSIGHT_THRESHOLDS).
 *   3. Emits an `Insight` with severity, headline, detail, action.
 *
 * Insights persist in `analytics_insights`. The dashboard reads them
 * already-ranked. Operators can acknowledge or dismiss; that flag is
 * preserved on the next regeneration so the same insight doesn't keep
 * shouting once it's been seen.
 */

import { db } from "../../db";
import {
  analyticsDailyRollup,
  analyticsMonthlyRollup,
  analyticsInsights,
  type AnalyticsDailyRollup,
} from "@shared/schema";
import { fcAssessments } from "@shared/finance-compass-schema";
import {
  INSIGHT_KIND,
  INSIGHT_SEVERITY,
  INSIGHT_THRESHOLDS,
  severityForDropoff,
  severityForYoY,
  type Insight,
  type InsightKind,
  type InsightSeverity,
} from "@shared/analytics-insights";
import {
  EVENT_CATEGORY,
  SAMPLE_SIZE,
} from "@shared/analytics-taxonomy";
import { and, eq, gte, lte, isNull, sql } from "drizzle-orm";
import { createChildLogger } from "../../lib/logger";
import { computeFunnel } from "./funnel";

const log = createChildLogger("analytics-insights");

function newInsightId(kind: string): string {
  return `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface InsightBuilder {
  kind: InsightKind;
  severity: InsightSeverity;
  headline: string;
  detail: string;
  recommendedAction: string;
  link?: { label: string; href: string };
  metrics: Record<string, number | string>;
  windowStart: Date;
  windowEnd: Date;
}

function build(b: InsightBuilder): Insight {
  return {
    id: newInsightId(b.kind),
    kind: b.kind,
    severity: b.severity,
    headline: b.headline,
    detail: b.detail,
    recommendedAction: b.recommendedAction,
    link: b.link,
    metrics: b.metrics,
    generatedAt: new Date().toISOString(),
    windowStart: b.windowStart.toISOString(),
    windowEnd: b.windowEnd.toISOString(),
  };
}

// -- Rule: funnel drop-off ------------------------------------------------

async function funnelDropOffInsights(windowStart: Date, windowEnd: Date): Promise<Insight[]> {
  const funnel = await computeFunnel({ windowStart, windowEnd });
  const insights: Insight[] = [];

  for (let i = 1; i < funnel.stages.length; i++) {
    const stage = funnel.stages[i];
    if (stage.lowConfidence) continue;
    const target = stage.targetConversionPct;
    const actual = stage.stepwiseConversionPct;
    const gap = target - actual;
    if (gap < INSIGHT_THRESHOLDS.FUNNEL_DROPOFF_WARNING_PP) continue;
    const severity = severityForDropoff(actual, target);
    const prev = funnel.stages[i - 1];
    insights.push(
      build({
        kind: INSIGHT_KIND.FUNNEL_DROPOFF,
        severity,
        headline: `${prev.label} → ${stage.label} converting at ${actual}% (target ${target}%)`,
        detail: `${stage.absoluteDropOff} sessions reached "${prev.label}" but didn't progress to "${stage.label}". This is the largest single optimisation lever for this window.`,
        recommendedAction:
          severity === INSIGHT_SEVERITY.CRITICAL
            ? `Review the "${stage.label}" experience this week. Look at the page UX, the call-to-action copy, and whether the stage is technically reachable from "${prev.label}" on all devices.`
            : `Add to the optimisation backlog for this quarter. Run a single-variable test on the "${stage.label}" CTA or copy.`,
        link: { label: "Funnel analytics", href: "/admin/funnel-analytics" },
        metrics: {
          fromStage: prev.label,
          toStage: stage.label,
          actualConversionPct: actual,
          targetConversionPct: target,
          gapPp: Math.round(gap * 10) / 10,
          sessionsLost: stage.absoluteDropOff,
        },
        windowStart,
        windowEnd,
      }),
    );
  }
  return insights;
}

// -- Rule: channel performance --------------------------------------------

async function channelPerformanceInsights(windowStart: Date, windowEnd: Date): Promise<Insight[]> {
  const rows = await db
    .select({
      sourceChannel: analyticsDailyRollup.sourceChannel,
      sessions: sql<number>`SUM(${analyticsDailyRollup.uniqueSessions})`,
      eventType: analyticsDailyRollup.eventType,
    })
    .from(analyticsDailyRollup)
    .where(and(gte(analyticsDailyRollup.utcDay, windowStart), lte(analyticsDailyRollup.utcDay, windowEnd)))
    .groupBy(analyticsDailyRollup.sourceChannel, analyticsDailyRollup.eventType);

  // Channel -> {sessions: total, leads: count}
  type ChannelAgg = { sessions: number; leads: number };
  const byChannel = new Map<string, ChannelAgg>();
  for (const r of rows) {
    const channel = r.sourceChannel ?? "unknown";
    let agg = byChannel.get(channel);
    if (!agg) {
      agg = { sessions: 0, leads: 0 };
      byChannel.set(channel, agg);
    }
    if (r.eventType === "page_view") agg.sessions += Number(r.sessions);
    if (r.eventType === "lead_captured" || r.eventType === "email_captured") agg.leads += Number(r.sessions);
  }

  // Compute overall conversion rate as the comparison baseline.
  let totalSessions = 0;
  let totalLeads = 0;
  byChannel.forEach(agg => {
    totalSessions += agg.sessions;
    totalLeads += agg.leads;
  });
  if (totalSessions < SAMPLE_SIZE.CONVERSION_MIN_N) return [];
  const baselineConversionPct = totalLeads / totalSessions;
  if (baselineConversionPct <= 0) return [];

  const insights: Insight[] = [];
  const channelEntries = Array.from(byChannel.entries());
  for (const [channel, agg] of channelEntries) {
    if (agg.sessions < INSIGHT_THRESHOLDS.CHANNEL_MIN_SESSIONS) continue;
    const conversion = agg.sessions > 0 ? agg.leads / agg.sessions : 0;
    const multiple = conversion / baselineConversionPct;
    if (multiple >= INSIGHT_THRESHOLDS.CHANNEL_OUTPERFORM_MULTIPLE) {
      insights.push(
        build({
          kind: INSIGHT_KIND.CHANNEL_HIGH_PERFORMER,
          severity: INSIGHT_SEVERITY.POSITIVE,
          headline: `${channel} is converting ${multiple.toFixed(1)}× site average`,
          detail: `${agg.sessions} sessions from ${channel} produced ${agg.leads} leads (${(conversion * 100).toFixed(1)}%) vs site average ${(baselineConversionPct * 100).toFixed(1)}%.`,
          recommendedAction: `Increase investment in ${channel}. Reproduce the messaging that's working here in other channels.`,
          link: { label: "Channel breakdown", href: "/admin/analytics" },
          metrics: {
            channel,
            sessions: agg.sessions,
            leads: agg.leads,
            conversionPct: Math.round(conversion * 1000) / 10,
            baselinePct: Math.round(baselineConversionPct * 1000) / 10,
            multiple: Math.round(multiple * 100) / 100,
          },
          windowStart,
          windowEnd,
        }),
      );
    } else if (multiple <= INSIGHT_THRESHOLDS.CHANNEL_UNDERPERFORM_MULTIPLE && agg.sessions >= 200) {
      insights.push(
        build({
          kind: INSIGHT_KIND.CHANNEL_UNDERPERFORMER,
          severity: INSIGHT_SEVERITY.WARNING,
          headline: `${channel} converting at ${multiple.toFixed(1)}× site average`,
          detail: `${agg.sessions} sessions from ${channel} produced only ${agg.leads} leads (${(conversion * 100).toFixed(1)}%) vs site average ${(baselineConversionPct * 100).toFixed(1)}%.`,
          recommendedAction: `Review targeting and landing-page fit for ${channel}. If paid, audit keywords/audience; if organic, audit the landing pages traffic is hitting.`,
          link: { label: "Channel breakdown", href: "/admin/analytics" },
          metrics: {
            channel,
            sessions: agg.sessions,
            leads: agg.leads,
            conversionPct: Math.round(conversion * 1000) / 10,
            baselinePct: Math.round(baselineConversionPct * 1000) / 10,
            multiple: Math.round(multiple * 100) / 100,
          },
          windowStart,
          windowEnd,
        }),
      );
    }
  }
  return insights;
}

// -- Rule: traffic anomaly (z-score) --------------------------------------

async function trafficAnomalyInsights(windowEnd: Date): Promise<Insight[]> {
  const historyStart = new Date(windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      utcDay: analyticsDailyRollup.utcDay,
      sessions: sql<number>`SUM(${analyticsDailyRollup.uniqueSessions})`,
    })
    .from(analyticsDailyRollup)
    .where(
      and(
        gte(analyticsDailyRollup.utcDay, historyStart),
        eq(analyticsDailyRollup.eventType, "page_view"),
      ),
    )
    .groupBy(analyticsDailyRollup.utcDay);

  if (rows.length < INSIGHT_THRESHOLDS.ANOMALY_MIN_HISTORY_DAYS) return [];

  const sorted = rows.map(r => ({ day: r.utcDay, sessions: Number(r.sessions) })).sort((a, b) => a.day.getTime() - b.day.getTime());
  const yesterday = sorted[sorted.length - 1];
  const history = sorted.slice(0, -1);
  const mean = history.reduce((a, c) => a + c.sessions, 0) / history.length;
  const variance = history.reduce((a, c) => a + (c.sessions - mean) ** 2, 0) / history.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return [];
  const z = (yesterday.sessions - mean) / stdDev;
  if (Math.abs(z) < INSIGHT_THRESHOLDS.ANOMALY_Z_SCORE) return [];

  const direction = z > 0 ? "spike" : "drop";
  const severity = Math.abs(z) > 3.5 ? INSIGHT_SEVERITY.CRITICAL : INSIGHT_SEVERITY.WARNING;
  return [
    build({
      kind: INSIGHT_KIND.TRAFFIC_ANOMALY,
      severity,
      headline: `Traffic ${direction}: ${yesterday.sessions} sessions yesterday (z=${z.toFixed(1)})`,
      detail: `Yesterday's ${yesterday.sessions} sessions is ${Math.abs(z).toFixed(1)} standard deviations from the trailing 30-day mean of ${Math.round(mean)} sessions/day.`,
      recommendedAction:
        direction === "spike"
          ? "Identify the source — referrer, paid campaign, or viral mention — and decide whether to amplify or capacity-plan."
          : "Check for outages, robots.txt regressions, or recent deploys that may have broken tracking or pages.",
      link: { label: "Operations dashboard", href: "/admin/operations" },
      metrics: {
        yesterdaySessions: yesterday.sessions,
        trailingMean: Math.round(mean),
        stdDev: Math.round(stdDev),
        zScore: Math.round(z * 10) / 10,
      },
      windowStart: historyStart,
      windowEnd,
    }),
  ];
}

// -- Rule: YoY comparison --------------------------------------------------

async function yoyInsights(windowEnd: Date): Promise<Insight[]> {
  const thisMonth = new Date(Date.UTC(windowEnd.getUTCFullYear(), windowEnd.getUTCMonth(), 1));
  const lastYearMonth = new Date(Date.UTC(windowEnd.getUTCFullYear() - 1, windowEnd.getUTCMonth(), 1));

  const [thisRows, lastRows] = await Promise.all([
    db.select().from(analyticsMonthlyRollup).where(eq(analyticsMonthlyRollup.utcMonth, thisMonth)),
    db.select().from(analyticsMonthlyRollup).where(eq(analyticsMonthlyRollup.utcMonth, lastYearMonth)),
  ]);

  if (lastRows.length === 0) return []; // no YoY data yet (new install)

  const sum = (rows: typeof thisRows, col: "uniqueSessions" | "leadCount" | "assessmentCompletedCount") =>
    rows.reduce((a, c) => a + (Number(c[col]) ?? 0), 0);

  const metrics = [
    { key: "uniqueSessions" as const, label: "Sessions" },
    { key: "leadCount" as const, label: "Leads" },
    { key: "assessmentCompletedCount" as const, label: "Assessments completed" },
  ];

  const insights: Insight[] = [];
  for (const m of metrics) {
    const thisVal = sum(thisRows, m.key);
    const lastVal = sum(lastRows, m.key);
    if (lastVal < SAMPLE_SIZE.YOY_MIN_N) continue;
    const delta = (thisVal - lastVal) / lastVal;
    if (Math.abs(delta) < INSIGHT_THRESHOLDS.YOY_GROWTH_FRACTION && delta > INSIGHT_THRESHOLDS.YOY_DECLINE_FRACTION) continue;
    const severity = severityForYoY(delta);
    const kind = delta > 0 ? INSIGHT_KIND.YOY_GROWTH : INSIGHT_KIND.YOY_DECLINE;
    insights.push(
      build({
        kind,
        severity,
        headline: `${m.label} ${delta > 0 ? "up" : "down"} ${Math.abs(delta * 100).toFixed(0)}% YoY (this month)`,
        detail: `${thisVal} this month vs ${lastVal} the same month last year.`,
        recommendedAction:
          delta > 0
            ? "Document what changed since last year — content, channel mix, product — to repeat the lift."
            : "Investigate which channels or pages dropped most vs last year. Compare paid-spend and content cadence YoY.",
        link: { label: "Trends", href: "/admin/analytics" },
        metrics: {
          metric: m.label,
          thisYear: thisVal,
          lastYear: lastVal,
          deltaPct: Math.round(delta * 1000) / 10,
        },
        windowStart: lastYearMonth,
        windowEnd,
      }),
    );
  }
  return insights;
}

// -- Rule: at-risk assessments --------------------------------------------

async function atRiskAssessmentInsights(): Promise<Insight[]> {
  const inactiveCutoff = new Date(Date.now() - INSIGHT_THRESHOLDS.AT_RISK_INACTIVE_MS);

  const atRisk = await db
    .select({
      id: fcAssessments.id,
      status: fcAssessments.status,
      updatedAt: fcAssessments.updatedAt,
    })
    .from(fcAssessments)
    .where(
      and(
        sql`${fcAssessments.status} IN ('in_progress', 'initial_complete', 'followups_pending')`,
        lte(fcAssessments.updatedAt, inactiveCutoff),
      ),
    )
    .limit(50);

  if (atRisk.length === 0) return [];

  return [
    build({
      kind: INSIGHT_KIND.AT_RISK_ASSESSMENT,
      severity: atRisk.length > 10 ? INSIGHT_SEVERITY.WARNING : INSIGHT_SEVERITY.INFO,
      headline: `${atRisk.length} assessments idle > 3 days`,
      detail: `${atRisk.length} Finance Compass assessments are in progress but haven't seen activity in over 3 days. These are warm leads at risk of going cold.`,
      recommendedAction: "Trigger a nudge email or sales outreach for these contacts. Consider a re-engagement campaign.",
      link: { label: "FC assessments", href: "/admin/finance-compass/assessments?filter=at_risk" },
      metrics: {
        atRiskCount: atRisk.length,
        inactiveDays: 3,
      },
      windowStart: inactiveCutoff,
      windowEnd: new Date(),
    }),
  ];
}

// -- Orchestrator ---------------------------------------------------------

export async function generateInsights(windowDays = 30): Promise<Insight[]> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [funnelI, channelI, anomalyI, yoyI, atRiskI] = await Promise.all([
    funnelDropOffInsights(windowStart, windowEnd).catch(err => {
      log.error({ err }, "funnel insight rule failed");
      return [] as Insight[];
    }),
    channelPerformanceInsights(windowStart, windowEnd).catch(err => {
      log.error({ err }, "channel insight rule failed");
      return [] as Insight[];
    }),
    trafficAnomalyInsights(windowEnd).catch(err => {
      log.error({ err }, "anomaly insight rule failed");
      return [] as Insight[];
    }),
    yoyInsights(windowEnd).catch(err => {
      log.error({ err }, "yoy insight rule failed");
      return [] as Insight[];
    }),
    atRiskAssessmentInsights().catch(err => {
      log.error({ err }, "at-risk insight rule failed");
      return [] as Insight[];
    }),
  ]);

  return [...funnelI, ...channelI, ...anomalyI, ...yoyI, ...atRiskI];
}

/**
 * Generate insights, persist them, and return the list. Old insights of
 * the same kind that have NOT been acknowledged are replaced; ones the
 * operator already dismissed are kept (we don't want to nag).
 */
export async function refreshInsightCache(): Promise<Insight[]> {
  const insights = await generateInsights();

  // Clear unacknowledged previous insights so the dashboard shows fresh
  // signal. Acknowledged/dismissed ones persist for audit history.
  await db
    .delete(analyticsInsights)
    .where(and(isNull(analyticsInsights.acknowledgedAt), isNull(analyticsInsights.dismissedAt)));

  if (insights.length > 0) {
    await db.insert(analyticsInsights).values(
      insights.map(i => ({
        id: i.id,
        kind: i.kind,
        severity: i.severity,
        headline: i.headline,
        detail: i.detail,
        recommendedAction: i.recommendedAction,
        linkLabel: i.link?.label ?? null,
        linkHref: i.link?.href ?? null,
        metrics: i.metrics,
        windowStart: new Date(i.windowStart),
        windowEnd: new Date(i.windowEnd),
      })),
    );
  }
  log.info({ count: insights.length }, "Refreshed insights");
  return insights;
}

// Re-export for convenience
export { computeFunnel };

// Silence unused-import warning
void EVENT_CATEGORY;
type _Unused = AnalyticsDailyRollup;
