/**
 * Single source of truth for the Constancia analytics taxonomy.
 *
 * Everything analytics-related — event names, funnel stages, lead
 * definitions, retention windows, tier/band labels, insight thresholds —
 * is defined here. Client emitters, server handlers, DB queries, and
 * admin dashboards must import from this module rather than hardcoding
 * string literals.
 *
 * Adding a new event type? Add it to `ANALYTICS_EVENTS`, give it a
 * `EVENT_CATEGORY`, and (if it participates in the funnel) reference it
 * from the relevant stage in `FUNNEL_STAGES`. Don't sprinkle the literal
 * elsewhere.
 */

// -- Event types -----------------------------------------------------------
//
// One canonical string per event. Naming convention:
//   <subject>_<verb_past>   page_view, widget_completed, lead_captured
// Past-tense verbs everywhere — events describe things that have happened.

export const ANALYTICS_EVENTS = {
  // Page lifecycle
  PAGE_VIEW: "page_view",
  SCROLL_DEPTH_25: "scroll_depth_25",
  SCROLL_DEPTH_50: "scroll_depth_50",
  SCROLL_DEPTH_75: "scroll_depth_75",
  SCROLL_DEPTH_100: "scroll_depth_100",
  DWELL_TIME: "dwell_time",

  // Widget lifecycle
  WIDGET_VISIBLE: "widget_visible",
  WIDGET_LOADED: "widget_loaded",
  WIDGET_INTERACTION: "widget_interaction",
  WIDGET_COMPLETED: "widget_completed",
  PREVIEW_COMPLETED: "preview_completed",

  // Assessment lifecycle
  ASSESSMENT_PAGE_VIEW: "assessment_page_view",
  ASSESSMENT_STARTED: "assessment_started",
  ASSESSMENT_PROGRESS_25: "assessment_progress_25",
  ASSESSMENT_PROGRESS_50: "assessment_progress_50",
  ASSESSMENT_PROGRESS_75: "assessment_progress_75",
  ASSESSMENT_PROGRESS_100: "assessment_progress_100",
  ASSESSMENT_COMPLETED: "assessment_completed",
  ASSESSMENT_ABANDONED: "assessment_abandoned",
  QUESTION_ANSWERED: "question_answered",
  QUESTION_ABANDONED: "question_abandoned",
  QUALIFICATION_COMPLETED: "qualification_completed",

  // Results / report
  RESULTS_VIEWED: "results_viewed",
  REPORT_DOWNLOADED: "report_downloaded",
  REPORT_VIEWED: "report_viewed",
  EMAIL_RESULTS_SENT: "email_results_sent",

  // Lead capture (canonical — these are the ONLY events that count as a lead)
  LEAD_CAPTURED: "lead_captured",
  EMAIL_CAPTURED: "email_captured",

  // CTA
  CTA_CLICKED: "cta_clicked",

  // Comparison tools (vendor / EPM / ERP / AI)
  COMPARISON_OPENED: "comparison_opened",
  COMPARISON_LOADED: "comparison_loaded",
  COMPARISON_COMPLETED: "comparison_completed",
  COMPARISON_EXPORTED: "comparison_exported",
  WIZARD_STEP_CHANGED: "wizard_step_changed",
  WIZARD_COMPLETED: "wizard_completed",
  INDUSTRY_SELECTED: "industry_selected",
  PRESET_SELECTED: "preset_selected",
  DRIVER_WEIGHT_CHANGED: "driver_weight_changed",
  VENDOR_SELECTED: "vendor_selected",
  VENDOR_DESELECTED: "vendor_deselected",
  EXPORT_INITIATED: "export_initiated",
  EXPORT_PDF: "export_pdf",
  EXPORT_EXCEL: "export_excel",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Legacy event aliases that may still exist in historic event-stream data.
 * Used by the server when reading old rows so we don't lose data; new code
 * should never emit these. Each alias maps to its canonical successor so
 * funnel/insight queries treat them as equivalent.
 */
export const LEGACY_EVENT_ALIASES: Record<string, AnalyticsEvent> = {
  // results_view -> results_viewed
  results_view: ANALYTICS_EVENTS.RESULTS_VIEWED,
  results_page_view: ANALYTICS_EVENTS.RESULTS_VIEWED,
  // report_download -> report_downloaded
  report_download: ANALYTICS_EVENTS.REPORT_DOWNLOADED,
  report_view: ANALYTICS_EVENTS.REPORT_VIEWED,
  // assessment_start -> assessment_started
  assessment_start: ANALYTICS_EVENTS.ASSESSMENT_STARTED,
  // widget_complete -> widget_completed
  widget_complete: ANALYTICS_EVENTS.WIDGET_COMPLETED,
  // assessment_complete -> assessment_completed
  assessment_complete: ANALYTICS_EVENTS.ASSESSMENT_COMPLETED,
  // comparison_tool_opened -> comparison_opened
  comparison_tool_opened: ANALYTICS_EVENTS.COMPARISON_OPENED,
  // comparison_export -> comparison_exported
  comparison_export: ANALYTICS_EVENTS.COMPARISON_EXPORTED,
};

/**
 * Resolve an event-type string (possibly a legacy alias) to its canonical
 * form. Returns the input unchanged if it's already canonical or unknown.
 */
export function canonicalEvent(raw: string): string {
  return LEGACY_EVENT_ALIASES[raw] ?? raw;
}

/**
 * All historic event-type variants that should match a given canonical
 * event when querying. Use this when filtering the DB: `WHERE event_type
 * IN (eventVariants(ANALYTICS_EVENTS.RESULTS_VIEWED))` will pick up both
 * old and new rows.
 */
export function eventVariants(canonical: AnalyticsEvent): string[] {
  const aliases = Object.entries(LEGACY_EVENT_ALIASES)
    .filter(([, target]) => target === canonical)
    .map(([alias]) => alias);
  return [canonical, ...aliases];
}

// -- Event categories ------------------------------------------------------
//
// Used by dashboards to group events for display, and by the rollup job
// to attribute counts to a category column without enumerating each event.

export const EVENT_CATEGORY = {
  PAGE: "page",
  WIDGET: "widget",
  ASSESSMENT: "assessment",
  RESULTS: "results",
  LEAD: "lead",
  CTA: "cta",
  COMPARISON: "comparison",
  ENGAGEMENT: "engagement",
} as const;

export type EventCategory = (typeof EVENT_CATEGORY)[keyof typeof EVENT_CATEGORY];

const CATEGORY_BY_EVENT: Record<AnalyticsEvent, EventCategory> = {
  [ANALYTICS_EVENTS.PAGE_VIEW]: EVENT_CATEGORY.PAGE,
  [ANALYTICS_EVENTS.SCROLL_DEPTH_25]: EVENT_CATEGORY.ENGAGEMENT,
  [ANALYTICS_EVENTS.SCROLL_DEPTH_50]: EVENT_CATEGORY.ENGAGEMENT,
  [ANALYTICS_EVENTS.SCROLL_DEPTH_75]: EVENT_CATEGORY.ENGAGEMENT,
  [ANALYTICS_EVENTS.SCROLL_DEPTH_100]: EVENT_CATEGORY.ENGAGEMENT,
  [ANALYTICS_EVENTS.DWELL_TIME]: EVENT_CATEGORY.ENGAGEMENT,
  [ANALYTICS_EVENTS.WIDGET_VISIBLE]: EVENT_CATEGORY.WIDGET,
  [ANALYTICS_EVENTS.WIDGET_LOADED]: EVENT_CATEGORY.WIDGET,
  [ANALYTICS_EVENTS.WIDGET_INTERACTION]: EVENT_CATEGORY.WIDGET,
  [ANALYTICS_EVENTS.WIDGET_COMPLETED]: EVENT_CATEGORY.WIDGET,
  [ANALYTICS_EVENTS.PREVIEW_COMPLETED]: EVENT_CATEGORY.WIDGET,
  [ANALYTICS_EVENTS.ASSESSMENT_PAGE_VIEW]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.ASSESSMENT_STARTED]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_25]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_50]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_75]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_100]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.ASSESSMENT_COMPLETED]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.ASSESSMENT_ABANDONED]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.QUESTION_ANSWERED]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.QUESTION_ABANDONED]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.QUALIFICATION_COMPLETED]: EVENT_CATEGORY.ASSESSMENT,
  [ANALYTICS_EVENTS.RESULTS_VIEWED]: EVENT_CATEGORY.RESULTS,
  [ANALYTICS_EVENTS.REPORT_DOWNLOADED]: EVENT_CATEGORY.RESULTS,
  [ANALYTICS_EVENTS.REPORT_VIEWED]: EVENT_CATEGORY.RESULTS,
  [ANALYTICS_EVENTS.EMAIL_RESULTS_SENT]: EVENT_CATEGORY.RESULTS,
  [ANALYTICS_EVENTS.LEAD_CAPTURED]: EVENT_CATEGORY.LEAD,
  [ANALYTICS_EVENTS.EMAIL_CAPTURED]: EVENT_CATEGORY.LEAD,
  [ANALYTICS_EVENTS.CTA_CLICKED]: EVENT_CATEGORY.CTA,
  [ANALYTICS_EVENTS.COMPARISON_OPENED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.COMPARISON_LOADED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.COMPARISON_COMPLETED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.COMPARISON_EXPORTED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.WIZARD_STEP_CHANGED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.WIZARD_COMPLETED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.INDUSTRY_SELECTED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.PRESET_SELECTED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.DRIVER_WEIGHT_CHANGED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.VENDOR_SELECTED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.VENDOR_DESELECTED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.EXPORT_INITIATED]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.EXPORT_PDF]: EVENT_CATEGORY.COMPARISON,
  [ANALYTICS_EVENTS.EXPORT_EXCEL]: EVENT_CATEGORY.COMPARISON,
};

export function categoryForEvent(raw: string): EventCategory | undefined {
  const canonical = canonicalEvent(raw) as AnalyticsEvent;
  return CATEGORY_BY_EVENT[canonical];
}

// -- Funnel stages ---------------------------------------------------------
//
// The default funnel. Stage definitions are duplicated into a DB-backed
// `funnel_stages` table on first boot (see server/services/analytics/
// funnel.ts); after that the DB is the source of truth and these defaults
// only serve as bootstrap data + fallback.

export interface FunnelStageDefinition {
  key: string;
  label: string;
  description: string;
  /** Canonical events. Variants are picked up via eventVariants() at query time. */
  events: AnalyticsEvent[];
  /** Default conversion-rate target from PRIOR stage (0–100). */
  targetConversionPct: number;
  /** Warning threshold below the target (yellow status). */
  warningPct: number;
}

export const FUNNEL_STAGES: FunnelStageDefinition[] = [
  {
    key: "landing",
    label: "Landing",
    description: "Unique sessions with at least one page view.",
    events: [ANALYTICS_EVENTS.PAGE_VIEW],
    targetConversionPct: 100,
    warningPct: 100,
  },
  {
    key: "widget_visible",
    label: "Widget visible",
    description: "Session scrolled the interactive widget into view.",
    events: [ANALYTICS_EVENTS.WIDGET_VISIBLE, ANALYTICS_EVENTS.WIDGET_LOADED],
    targetConversionPct: 80,
    warningPct: 60,
  },
  {
    key: "widget_engaged",
    label: "Widget engaged",
    description: "Session interacted with the widget (answered, clicked, dragged).",
    events: [ANALYTICS_EVENTS.WIDGET_INTERACTION, ANALYTICS_EVENTS.QUESTION_ANSWERED],
    targetConversionPct: 50,
    warningPct: 30,
  },
  {
    key: "widget_completed",
    label: "Widget completed",
    description: "Session finished the widget preview.",
    events: [ANALYTICS_EVENTS.WIDGET_COMPLETED, ANALYTICS_EVENTS.PREVIEW_COMPLETED],
    targetConversionPct: 30,
    warningPct: 20,
  },
  {
    key: "assessment_started",
    label: "Assessment started",
    description: "Session moved from preview into the full assessment.",
    events: [
      ANALYTICS_EVENTS.ASSESSMENT_STARTED,
      ANALYTICS_EVENTS.ASSESSMENT_PAGE_VIEW,
    ],
    targetConversionPct: 25,
    warningPct: 15,
  },
  {
    key: "assessment_midpoint",
    label: "Assessment midpoint",
    description: "Session reached 50% of the assessment.",
    events: [ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_50],
    targetConversionPct: 60,
    warningPct: 40,
  },
  {
    key: "assessment_completed",
    label: "Assessment completed",
    description: "Session finished the assessment.",
    events: [
      ANALYTICS_EVENTS.ASSESSMENT_COMPLETED,
      ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_100,
    ],
    targetConversionPct: 60,
    warningPct: 40,
  },
  {
    key: "lead_captured",
    label: "Lead captured",
    description:
      "Contact information explicitly submitted. NOTE: viewing the results page is NOT a lead — that's a separate stage.",
    events: [ANALYTICS_EVENTS.LEAD_CAPTURED, ANALYTICS_EVENTS.EMAIL_CAPTURED],
    targetConversionPct: 40,
    warningPct: 25,
  },
  {
    key: "results_viewed",
    label: "Results viewed",
    description: "Lead viewed their assessment results page.",
    events: [ANALYTICS_EVENTS.RESULTS_VIEWED],
    targetConversionPct: 90,
    warningPct: 70,
  },
  {
    key: "report_downloaded",
    label: "Report downloaded",
    description: "Lead downloaded the full PDF report.",
    events: [ANALYTICS_EVENTS.REPORT_DOWNLOADED, ANALYTICS_EVENTS.REPORT_VIEWED],
    targetConversionPct: 50,
    warningPct: 30,
  },
];

// -- Lead definition -------------------------------------------------------
//
// "Lead" is one of the most-overloaded words in this codebase. The
// canonical definition: a lead is a person who has provided contact
// information. Three flavours exist; the dashboards should label them
// distinctly and never sum them together without saying so.

export const LEAD_KIND = {
  /** Submitted a resource-download gate (resourceLeads table). */
  RESOURCE: "resource",
  /** Captured during the FC assessment flow (fc_contacts table). */
  ASSESSMENT: "assessment",
  /** Submitted email through a comparison-tool export. */
  COMPARISON: "comparison",
} as const;

export type LeadKind = (typeof LEAD_KIND)[keyof typeof LEAD_KIND];

export const LEAD_KIND_LABEL: Record<LeadKind, string> = {
  [LEAD_KIND.RESOURCE]: "Resource lead",
  [LEAD_KIND.ASSESSMENT]: "Assessment lead",
  [LEAD_KIND.COMPARISON]: "Comparison lead",
};

/**
 * The single set of events that count as a *lead capture* in the funnel.
 * `results_viewed` is NOT here — that's a separate stage downstream.
 */
export const LEAD_CAPTURE_EVENTS: AnalyticsEvent[] = [
  ANALYTICS_EVENTS.LEAD_CAPTURED,
  ANALYTICS_EVENTS.EMAIL_CAPTURED,
];

// -- Retention windows -----------------------------------------------------
//
// Driven by GDPR posture and the analytics need for year-over-year.
// `raw` rows are dropped after `RAW_RETENTION_DAYS`; daily rollups never
// expire; monthly rollups never expire (so YoY always works). PII fields
// (raw IPs, user agents) are scrubbed earlier — see `PII_RETENTION_DAYS`.

export const RETENTION = {
  /** Days to keep raw events before they're dropped (rollups retain forever). */
  RAW_DAYS: 730,
  /** Days to keep PII columns (ip_address, raw user_agent) before nulling. */
  PII_DAYS: 90,
  /** Days to keep daily rollups. -1 = never expire. */
  DAILY_ROLLUP_DAYS: -1,
  /** Days to keep monthly rollups. -1 = never expire. */
  MONTHLY_ROLLUP_DAYS: -1,
  /** Days to keep admin audit logs. */
  ADMIN_AUDIT_DAYS: 2555, // 7 years
} as const;

// -- Benchmark tiers -------------------------------------------------------
//
// Brand-neutral tier names. The DB historically uses `1qg_good` /
// `1qg_best` — those are aliased here and migrated by the schema update.

export const BENCHMARK_TIER = {
  TYPICAL: "typical",
  STRONG: "strong",
  WORLD_CLASS: "world_class",
} as const;

export type BenchmarkTier = (typeof BENCHMARK_TIER)[keyof typeof BENCHMARK_TIER];

export const BENCHMARK_TIER_LABEL: Record<BenchmarkTier, string> = {
  [BENCHMARK_TIER.TYPICAL]: "Typical (median)",
  [BENCHMARK_TIER.STRONG]: "Strong (top quartile)",
  [BENCHMARK_TIER.WORLD_CLASS]: "World-class (P90+)",
};

/** Map legacy 1QG tier strings to canonical Constancia tiers. */
export const LEGACY_TIER_ALIASES: Record<string, BenchmarkTier> = {
  "1qg_good": BENCHMARK_TIER.STRONG,
  "1qg_best": BENCHMARK_TIER.WORLD_CLASS,
};

export function canonicalTier(raw: string): string {
  return LEGACY_TIER_ALIASES[raw] ?? raw;
}

// -- Time helpers ----------------------------------------------------------

/**
 * Returns the UTC midnight Date for a given timestamp. Used by the rollup
 * job to bucket events into calendar-day rows. UTC is the project's
 * chosen analytics TZ; rendered as the operator's TZ on the client.
 */
export function toUtcDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Returns the UTC first-of-month Date for a given timestamp. */
export function toUtcMonth(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** YYYY-MM-DD in UTC. Stable string key for daily buckets. */
export function utcDayKey(date: Date | string): string {
  return toUtcDay(date).toISOString().slice(0, 10);
}

/** YYYY-MM in UTC. Stable string key for monthly buckets. */
export function utcMonthKey(date: Date | string): string {
  return toUtcDay(date).toISOString().slice(0, 7);
}

// -- Bot detection thresholds ---------------------------------------------
//
// The old code marked any session completing in < 20s as bot. That's too
// aggressive — capable users can finish a short widget in 15s. We split
// "fast completion" (suspicious-but-keep) from "impossibly fast" (drop).

export const BOT_HEURISTICS = {
  /** Below this, treat as bot. */
  IMPOSSIBLE_COMPLETION_MS: 5_000,
  /** Below this, flag for review but keep in analytics. */
  SUSPICIOUSLY_FAST_MS: 15_000,
  /** Above this, treat as inactive/background. */
  IMPLAUSIBLY_LONG_MS: 4 * 60 * 60 * 1000, // 4h
} as const;

// -- Sample size guards ----------------------------------------------------
//
// When showing percentages, low denominators produce noise that looks
// like signal. We mark any metric below this N as "low confidence" and
// the UI greys it out.

export const SAMPLE_SIZE = {
  /** Minimum sessions before a conversion rate is shown without a warning. */
  CONVERSION_MIN_N: 30,
  /** Minimum sessions before a question heatmap cell shows a percentage. */
  HEATMAP_MIN_N: 10,
  /** Minimum sessions before YoY comparison is shown without a warning. */
  YOY_MIN_N: 50,
} as const;

// -- Conversion-rate calculation -------------------------------------------
//
// We compute conversion rates two ways:
//   - `stepwise`: stage N / stage N-1 (the "how many of last stage moved on?" rate)
//   - `cumulative`: stage N / stage 1 (the "what % of all visitors got here?" rate)
//
// Dashboards show stepwise by default (more actionable for optimisation),
// with cumulative as a secondary readout. Always show the absolute count
// alongside the percentage so low-N noise is obvious.

export const CONVERSION_MODE = {
  STEPWISE: "stepwise",
  CUMULATIVE: "cumulative",
} as const;

export type ConversionMode = (typeof CONVERSION_MODE)[keyof typeof CONVERSION_MODE];
