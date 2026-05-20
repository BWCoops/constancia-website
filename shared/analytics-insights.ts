/**
 * Insight definitions for the Constancia admin console.
 *
 * Dashboards previously surfaced numbers and left the operator to figure
 * out what mattered. This module turns those numbers into ranked
 * insights with a severity, a short headline, a "why this matters"
 * explanation, and a suggested next action.
 *
 * Insights are computed server-side from the daily/monthly rollup tables
 * (see server/services/analytics/insights.ts). Each rule type below
 * specifies its inputs, threshold, and produced action — so changes to
 * the heuristic happen here, not scattered across the codebase.
 */

import { SAMPLE_SIZE } from "./analytics-taxonomy";

export const INSIGHT_SEVERITY = {
  CRITICAL: "critical", // immediate ops attention
  WARNING: "warning",   // worth investigating this week
  INFO: "info",         // FYI / opportunity
  POSITIVE: "positive", // something working well
} as const;

export type InsightSeverity = (typeof INSIGHT_SEVERITY)[keyof typeof INSIGHT_SEVERITY];

export const INSIGHT_KIND = {
  FUNNEL_DROPOFF: "funnel_dropoff",
  FUNNEL_RECOVERY: "funnel_recovery",
  CHANNEL_HIGH_PERFORMER: "channel_high_performer",
  CHANNEL_UNDERPERFORMER: "channel_underperformer",
  TRAFFIC_ANOMALY: "traffic_anomaly",
  CONVERSION_ANOMALY: "conversion_anomaly",
  BOT_TRAFFIC_SPIKE: "bot_traffic_spike",
  YOY_GROWTH: "yoy_growth",
  YOY_DECLINE: "yoy_decline",
  AT_RISK_ASSESSMENT: "at_risk_assessment",
  RESOURCE_TOP_PERFORMER: "resource_top_performer",
  RESOURCE_UNDERPERFORMER: "resource_underperformer",
  QUESTION_HIGH_DROPOFF: "question_high_dropoff",
  CONTENT_AGED: "content_aged",
} as const;

export type InsightKind = (typeof INSIGHT_KIND)[keyof typeof INSIGHT_KIND];

export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  /** One-line headline shown in the dashboard. */
  headline: string;
  /** 1-2 sentence explanation of why this insight fired. */
  detail: string;
  /** Concrete next action the operator can take. */
  recommendedAction: string;
  /** Where in the admin this insight should link to. */
  link?: { label: string; href: string };
  /** Underlying metric values for the operator to verify. */
  metrics: Record<string, number | string>;
  /** When the insight was generated. */
  generatedAt: string;
  /** ISO date range the insight covers. */
  windowStart: string;
  windowEnd: string;
}

// -- Rule thresholds -------------------------------------------------------
//
// Every threshold is a named constant so it's reviewable and tunable in
// one place. Don't sprinkle magic numbers across the rule implementations.

export const INSIGHT_THRESHOLDS = {
  /** Funnel drop-off worse than 20pp below target = warning. */
  FUNNEL_DROPOFF_WARNING_PP: 20,
  /** Worse than 35pp below target = critical. */
  FUNNEL_DROPOFF_CRITICAL_PP: 35,

  /** Channel converts 2x better than the average = high-performer. */
  CHANNEL_OUTPERFORM_MULTIPLE: 2.0,
  /** Channel converts <0.5x the average = underperformer. */
  CHANNEL_UNDERPERFORM_MULTIPLE: 0.5,
  /** Minimum channel sessions before it qualifies as an insight. */
  CHANNEL_MIN_SESSIONS: 50,

  /** z-score above this is a traffic anomaly. */
  ANOMALY_Z_SCORE: 2.5,
  /** Minimum trailing-window days for z-score to be meaningful. */
  ANOMALY_MIN_HISTORY_DAYS: 14,

  /** Bot share above this fraction = spike. */
  BOT_SHARE_SPIKE_FRACTION: 0.4,

  /** YoY growth above this fraction = positive insight. */
  YOY_GROWTH_FRACTION: 0.25,
  /** YoY decline below this (negative) fraction = warning. */
  YOY_DECLINE_FRACTION: -0.15,

  /** Assessments started but inactive this long (ms) = at-risk. */
  AT_RISK_INACTIVE_MS: 3 * 24 * 60 * 60 * 1000, // 3 days
  /** Don't flag at-risk if the user has already converted (lead captured). */

  /** Resource leads/day below this fraction of top performer = underperformer. */
  RESOURCE_RELATIVE_FLOOR: 0.1,

  /** Question drop-off rate above this fraction = high-dropoff. */
  QUESTION_DROPOFF_FRACTION: 0.4,
  /** Min answered+abandoned events on a question before flagging. */
  QUESTION_MIN_N: SAMPLE_SIZE.HEATMAP_MIN_N,

  /** Blog post older than this (days) without refresh = aged. */
  CONTENT_AGED_DAYS: 365,
} as const;

// -- Helper: severity from drop-off magnitude ------------------------------

export function severityForDropoff(actualPct: number, targetPct: number): InsightSeverity {
  const gap = targetPct - actualPct;
  if (gap >= INSIGHT_THRESHOLDS.FUNNEL_DROPOFF_CRITICAL_PP) return INSIGHT_SEVERITY.CRITICAL;
  if (gap >= INSIGHT_THRESHOLDS.FUNNEL_DROPOFF_WARNING_PP) return INSIGHT_SEVERITY.WARNING;
  return INSIGHT_SEVERITY.INFO;
}

// -- Helper: severity from YoY delta --------------------------------------

export function severityForYoY(yoyFraction: number): InsightSeverity {
  if (yoyFraction <= INSIGHT_THRESHOLDS.YOY_DECLINE_FRACTION) {
    return Math.abs(yoyFraction) > 0.3 ? INSIGHT_SEVERITY.CRITICAL : INSIGHT_SEVERITY.WARNING;
  }
  if (yoyFraction >= INSIGHT_THRESHOLDS.YOY_GROWTH_FRACTION) return INSIGHT_SEVERITY.POSITIVE;
  return INSIGHT_SEVERITY.INFO;
}

// -- Helper: severity ordering for sorting --------------------------------

export const SEVERITY_RANK: Record<InsightSeverity, number> = {
  [INSIGHT_SEVERITY.CRITICAL]: 0,
  [INSIGHT_SEVERITY.WARNING]: 1,
  [INSIGHT_SEVERITY.POSITIVE]: 2,
  [INSIGHT_SEVERITY.INFO]: 3,
};

export function compareInsights(a: Insight, b: Insight): number {
  const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (rankDiff !== 0) return rankDiff;
  return b.generatedAt.localeCompare(a.generatedAt);
}
