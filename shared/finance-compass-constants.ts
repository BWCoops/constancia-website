/**
 * FinanceCompass Shared Constants
 * 
 * Centralized constants for dimension labels, maturity levels, and benchmark targets.
 * Used by both server and client code for consistency.
 */

export const BRAND_COLORS = {
  darkNavy: "#12161D",
  teal: "#8E4F67",
  brightCyan: "#7FB8A3",
  offWhite: "#F6F3EE",
  darkGray: "#212124",
  white: "#FFFFFF",
  statusGreen: "#16A34A",
  statusOrange: "#EA580C",
  statusRed: "#DC2626",
  statusAmber: "#CA8A04",
  statusCyan: "#0891B2",
  lightGray: "#F3F4F6",
  mediumGray: "#D8D0C6",
  trackerGray: "#E5E7EB",
  calloutBg: "#F2F2F2",
  calloutBorder: "#D1D5DB",
} as const;

export const DIMENSION_LABELS: Record<string, { 
  name: string; 
  shortName: string; 
  description: string;
  key: string;
}> = {
  financial_planning_analysis: { 
    name: "Financial Planning & Analysis", 
    shortName: "FP&A",
    description: "Budgeting, forecasting, variance analysis, and financial modeling capabilities",
    key: "D1_STRATEGY"
  },
  consolidation_close: { 
    name: "Consolidation & Close", 
    shortName: "Close",
    description: "Month-end close processes, consolidation, and statutory reporting",
    key: "D2_PROCESS"
  },
  financial_controls_compliance: { 
    name: "Financial Controls & Compliance", 
    shortName: "Controls",
    description: "Internal controls, audit readiness, and regulatory compliance",
    key: "D7_GOVERNANCE"
  },
  technology_systems: { 
    name: "Technology & Systems", 
    shortName: "Tech",
    description: "ERP, EPM platforms, automation, and system integration",
    key: "D4_TECHNOLOGY"
  },
  organisation_people: { 
    name: "Organisation & People", 
    shortName: "People",
    description: "Team structure, skills development, and operating model",
    key: "D3_ORGANISATION"
  },
  data_analytics: { 
    name: "Data & Analytics", 
    shortName: "Data",
    description: "Data quality, analytics capabilities, and reporting infrastructure",
    key: "D5_DATA"
  },
  ai_machine_learning: { 
    name: "AI & Machine Learning", 
    shortName: "AI/ML",
    description: "AI adoption, predictive analytics, and intelligent automation",
    key: "D8_AI"
  },
  strategic_finance: { 
    name: "Strategic Finance", 
    shortName: "Strategic",
    description: "Business partnering, strategic planning, and value creation",
    key: "D1_STRATEGY"
  },
  management_reporting: {
    name: "Management Reporting",
    shortName: "Reporting",
    description: "Performance KPIs, metrics, and management information",
    key: "D6_KPIS"
  },
};

export const DIMENSION_LABELS_BY_CODE: Record<string, { short: string; full: string; key: string }> = {
  D1_STRATEGY: { short: 'Strategy', full: 'Strategy & Finance Role', key: 'financial_planning_analysis' },
  D2_PROCESS: { short: 'Close', full: 'Consolidation & Close', key: 'consolidation_close' },
  D3_ORGANISATION: { short: 'Organisation', full: 'Organisation & Skills', key: 'organisation_people' },
  D4_TECHNOLOGY: { short: 'Technology', full: 'Technology & Automation', key: 'technology_systems' },
  D5_DATA: { short: 'Data', full: 'Data & Master Data', key: 'data_analytics' },
  D6_KPIS: { short: 'KPIs', full: 'Performance KPIs & Metrics', key: 'management_reporting' },
  D7_GOVERNANCE: { short: 'Governance', full: 'Governance & Controls', key: 'financial_controls_compliance' },
  D8_AI: { short: 'AI/ML', full: 'AI & Machine Learning', key: 'ai_machine_learning' },
};

export const API_KEY_TO_DIMENSION: Record<string, string> = {
  financial_planning_analysis: 'D1_STRATEGY',
  consolidation_close: 'D2_PROCESS',
  organisation_people: 'D3_ORGANISATION',
  technology_systems: 'D4_TECHNOLOGY',
  data_analytics: 'D5_DATA',
  management_reporting: 'D6_KPIS',
  financial_controls_compliance: 'D7_GOVERNANCE',
  ai_machine_learning: 'D8_AI',
};

export const CANONICAL_DIMENSIONS = [
  "financial_planning_analysis",
  "organisation_people", 
  "data_analytics",
  "technology_systems",
  "financial_controls_compliance",
  "management_reporting",
  "consolidation_close",
  "ai_machine_learning"
] as const;

export const MATURITY_LEVELS_PERCENTAGE = [
  { min: 0, max: 20, label: "Foundational", color: BRAND_COLORS.statusRed },
  { min: 21, max: 40, label: "Developing", color: BRAND_COLORS.statusOrange },
  { min: 41, max: 60, label: "Established", color: BRAND_COLORS.statusAmber },
  { min: 61, max: 80, label: "Advanced", color: BRAND_COLORS.statusCyan },
  { min: 81, max: 100, label: "Leading", color: BRAND_COLORS.statusGreen },
] as const;

export const MATURITY_LEVELS_SCALE = {
  FOUNDATIONAL: {
    min: 1.0,
    max: 2.0,
    label: 'Foundational',
    timeline: '24 months',
    timelineMonths: 24,
    color: '#8E4F67',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    description: 'Manual processes, limited automation',
    icon: 'AlertTriangle',
    recommendations: [
      'Focus on foundational improvements',
      'Build basic finance capabilities',
      'Establish data governance framework'
    ],
  },
  TRANSITIONAL: {
    min: 2.0,
    max: 3.0,
    label: 'Transitional',
    timeline: '18 months',
    timelineMonths: 18,
    color: '#C77A93',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    description: 'Partial automation, building capabilities',
    icon: 'ArrowUp',
    recommendations: [
      'Accelerate automation initiatives',
      'Invest in skills development',
      'Implement EPM platform'
    ],
  },
  GOOD_BASELINE: {
    min: 3.0,
    max: 4.0,
    label: 'Good Baseline',
    timeline: '12 months',
    timelineMonths: 12,
    color: '#eab308',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    description: 'Solid foundation, ready for advanced capabilities',
    icon: 'CheckCircle',
    recommendations: [
      'Optimise existing processes',
      'Expand AI/ML capabilities',
      'Focus on strategic value delivery'
    ],
  },
  ADVANCED: {
    min: 4.0,
    max: 5.0,
    label: 'Advanced',
    timeline: '6 months',
    timelineMonths: 6,
    color: '#7FB8A3',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    description: 'Best-in-class, continuous improvement',
    icon: 'Award',
    recommendations: [
      'Maintain excellence standards',
      'Innovate with emerging technologies',
      'Lead industry transformation'
    ],
  },
} as const;

export const TARGET_MATURITY = 70;

export const BENCHMARK_TARGETS = {
  DEFAULT: 60,
  WORLD_CLASS: 4.0,
  INDUSTRY_AVERAGE: 3.0,
} as const;

export const DIMENSION_BENCHMARKS = {
  D1_STRATEGY: { industryAverage: 3.0, worldClass: 4.0 },
  D2_PROCESS: { industryAverage: 2.8, worldClass: 3.8 },
  D3_ORGANISATION: { industryAverage: 2.7, worldClass: 3.7 },
  D4_TECHNOLOGY: { industryAverage: 2.9, worldClass: 3.9 },
  D5_DATA: { industryAverage: 2.6, worldClass: 3.6 },
  D6_KPIS: { industryAverage: 2.5, worldClass: 3.5 },
  D7_GOVERNANCE: { industryAverage: 2.8, worldClass: 3.8 },
  D8_AI: { industryAverage: 2.0, worldClass: 3.5 },
} as const;

export const GAP_THRESHOLDS = {
  MINOR: 0.5,
  MODERATE: 1.0,
  SIGNIFICANT: 1.5,
  CRITICAL: 1.5,
} as const;

export const GAP_CLASSIFICATION = {
  MINOR: { 
    label: 'Minor', 
    color: '#7FB8A3',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    textClass: 'text-green-700 dark:text-green-400',
    borderClass: 'border-green-500',
    description: 'Small gap, quick wins available'
  },
  MODERATE: { 
    label: 'Moderate', 
    color: '#eab308',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    textClass: 'text-yellow-700 dark:text-yellow-400',
    borderClass: 'border-yellow-500',
    description: 'Targeted improvements needed'
  },
  SIGNIFICANT: { 
    label: 'Significant', 
    color: '#C77A93',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    textClass: 'text-orange-700 dark:text-orange-400',
    borderClass: 'border-orange-500',
    description: 'Substantial investment required'
  },
  CRITICAL: { 
    label: 'Critical', 
    color: '#8E4F67',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-500',
    description: 'Major transformation needed'
  },
} as const;

export const SCORE_WEIGHTS = {
  EPM: 0.40,
  AI: 0.35,
  INFRASTRUCTURE: 0.15,
  CONTEXT: 0.10,
} as const;

export const SCORING_TIERS = {
  WORLD_CLASS: {
    label: "World Class",
    percentileMin: 90,
    scoreRange: { min: 4.5, max: 5.0 },
    color: "#7FB8A3",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
  },
  GOOD: {
    label: "Good",
    percentileMin: 75,
    scoreRange: { min: 3.5, max: 4.4 },
    color: "#84cc16",
    bgColor: "bg-lime-100 dark:bg-lime-900/30",
    textColor: "text-lime-700 dark:text-lime-400",
  },
  AVERAGE: {
    label: "Average",
    percentileMin: 50,
    scoreRange: { min: 2.5, max: 3.4 },
    color: "#eab308",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-400",
  },
  BELOW_AVERAGE: {
    label: "Below Average",
    percentileMin: 25,
    scoreRange: { min: 1.5, max: 2.4 },
    color: "#C77A93",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-400",
  },
  POOR: {
    label: "Poor",
    percentileMin: 0,
    scoreRange: { min: 1.0, max: 1.4 },
    color: "#8E4F67",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
  },
} as const;

export type GapClassificationType = keyof typeof GAP_CLASSIFICATION;
export type MaturityLevelScaleType = keyof typeof MATURITY_LEVELS_SCALE;
export type ScoringTierType = keyof typeof SCORING_TIERS;

export function getMaturityLevelFromPercentage(score: number): { label: string; color: string } {
  for (const level of MATURITY_LEVELS_PERCENTAGE) {
    if (score >= level.min && score <= level.max) {
      return { label: level.label, color: level.color };
    }
  }
  return { label: "Unknown", color: "#6B7280" };
}

export function getMaturityLevelFromScale(score: number): MaturityLevelScaleType {
  if (score < MATURITY_LEVELS_SCALE.TRANSITIONAL.min) return 'FOUNDATIONAL';
  if (score < MATURITY_LEVELS_SCALE.GOOD_BASELINE.min) return 'TRANSITIONAL';
  if (score < MATURITY_LEVELS_SCALE.ADVANCED.min) return 'GOOD_BASELINE';
  return 'ADVANCED';
}

export function classifyGap(gap: number): GapClassificationType {
  if (gap <= GAP_THRESHOLDS.MINOR) return 'MINOR';
  if (gap <= GAP_THRESHOLDS.MODERATE) return 'MODERATE';
  if (gap <= GAP_THRESHOLDS.SIGNIFICANT) return 'SIGNIFICANT';
  return 'CRITICAL';
}

export function percentageToScale(percentage: number): number {
  return (percentage / 100) * 5;
}

export function scaleToPercentage(scale: number): number {
  return (scale / 5) * 100;
}

export function getScoringTier(score: number): ScoringTierType {
  if (score >= 4.5) return "WORLD_CLASS";
  if (score >= 3.5) return "GOOD";
  if (score >= 2.5) return "AVERAGE";
  if (score >= 1.5) return "BELOW_AVERAGE";
  return "POOR";
}

export function formatDimensionName(dimension: string): string {
  const labelEntry = DIMENSION_LABELS[dimension];
  if (labelEntry) {
    return labelEntry.name;
  }
  return dimension.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function getStatusInfo(score: number): { text: string; color: string } {
  if (score > 70) return { text: "ON TRACK", color: BRAND_COLORS.statusGreen };
  if (score >= 50) return { text: "AT RISK", color: BRAND_COLORS.statusOrange };
  return { text: "CRITICAL", color: BRAND_COLORS.statusRed };
}
