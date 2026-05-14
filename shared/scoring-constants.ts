/**
 * FinanceCompass Scoring Constants
 * 
 * Shared between client and server for consistent scoring logic display and calculation.
 */

export const INDUSTRY_DIMENSION_WEIGHTS: Record<string, Record<string, number>> = {
  "Financial Services": {
    financial_planning_analysis: 14,
    organisation_people: 10,
    data_analytics: 12,
    technology_systems: 12,
    financial_controls_compliance: 18,
    management_reporting: 14,
    consolidation_close: 16,
    ai_machine_learning: 4,
  },
  "Technology": {
    financial_planning_analysis: 16,
    organisation_people: 10,
    data_analytics: 16,
    technology_systems: 16,
    financial_controls_compliance: 10,
    management_reporting: 12,
    consolidation_close: 10,
    ai_machine_learning: 10,
  },
  "Manufacturing": {
    financial_planning_analysis: 14,
    organisation_people: 10,
    data_analytics: 14,
    technology_systems: 12,
    financial_controls_compliance: 14,
    management_reporting: 12,
    consolidation_close: 16,
    ai_machine_learning: 8,
  },
  "Professional Services": {
    financial_planning_analysis: 16,
    organisation_people: 14,
    data_analytics: 12,
    technology_systems: 12,
    financial_controls_compliance: 12,
    management_reporting: 16,
    consolidation_close: 10,
    ai_machine_learning: 8,
  },
  "Retail": {
    financial_planning_analysis: 16,
    organisation_people: 10,
    data_analytics: 18,
    technology_systems: 14,
    financial_controls_compliance: 10,
    management_reporting: 14,
    consolidation_close: 10,
    ai_machine_learning: 8,
  },
  "Healthcare": {
    financial_planning_analysis: 14,
    organisation_people: 12,
    data_analytics: 12,
    technology_systems: 12,
    financial_controls_compliance: 18,
    management_reporting: 14,
    consolidation_close: 12,
    ai_machine_learning: 6,
  },
  "Pharmaceuticals": {
    financial_planning_analysis: 14,
    organisation_people: 10,
    data_analytics: 14,
    technology_systems: 12,
    financial_controls_compliance: 18,
    management_reporting: 12,
    consolidation_close: 14,
    ai_machine_learning: 6,
  },
  "Energy": {
    financial_planning_analysis: 14,
    organisation_people: 10,
    data_analytics: 14,
    technology_systems: 14,
    financial_controls_compliance: 16,
    management_reporting: 12,
    consolidation_close: 14,
    ai_machine_learning: 6,
  },
  "Other": {
    financial_planning_analysis: 12.5,
    organisation_people: 12.5,
    data_analytics: 12.5,
    technology_systems: 12.5,
    financial_controls_compliance: 12.5,
    management_reporting: 12.5,
    consolidation_close: 12.5,
    ai_machine_learning: 12.5,
  },
};

export const VENDOR_TIER_SCORING = {
  tier1: {
    score: 5,
    label: "Leaders",
    vendors: ["Anaplan", "OneStream", "Oracle EPM", "SAP SAC", "Board"],
    description: "Top-tier enterprise platforms with comprehensive capabilities",
  },
  tier2: {
    score: 4,
    label: "Challengers",
    vendors: ["Workday Adaptive", "Planful", "Vena", "Prophix", "Jedox", "CPM Express by OneStream"],
    description: "Strong mid-market solutions with growing enterprise presence",
  },
  specialist: {
    score: 3,
    label: "Specialists",
    vendors: ["Pigment", "Datarails", "Cube", "Jirav", "Syntellis"],
    description: "Niche or specialized EPM solutions",
  },
  legacy: {
    score: 2,
    label: "Legacy",
    vendors: ["Excel/Spreadsheets", "On-premise legacy systems"],
    description: "Traditional or outdated planning tools",
  },
  none: {
    score: 1,
    label: "No EPM",
    vendors: ["No dedicated EPM system"],
    description: "No formal planning system in place",
  },
};

export const DIMENSION_LABELS: Record<string, string> = {
  financial_planning_analysis: "Financial Planning & Analysis",
  organisation_people: "Organisation & People",
  data_analytics: "Data & Analytics",
  technology_systems: "Technology & Systems",
  financial_controls_compliance: "Financial Controls & Compliance",
  management_reporting: "Management Reporting",
  consolidation_close: "Consolidation & Close",
  ai_machine_learning: "AI & Machine Learning",
};

export function getIndustryDimensionWeights(sector: string | null): Record<string, number> {
  if (!sector) return INDUSTRY_DIMENSION_WEIGHTS["Other"];
  return INDUSTRY_DIMENSION_WEIGHTS[sector] || INDUSTRY_DIMENSION_WEIGHTS["Other"];
}

/**
 * Benchmark thresholds for efficiency metrics
 * Used by both scoring calculation and admin display
 */
export const BENCHMARK_THRESHOLDS = {
  budgeting_cycle: {
    metric: "Budgeting Cycle Duration",
    unit: "days",
    direction: "inverse" as const,
    thresholds: {
      leading: { value: 30, score: 5, label: "Leading" },
      advanced: { value: 45, score: 4, label: "Advanced" },
      established: { value: 60, score: 3, label: "Established" },
      developing: { value: 90, score: 2, label: "Developing" },
      lagging: { value: "90+" as string | number, score: 1, label: "Lagging" },
    },
  },
  close_cycle: {
    metric: "Month-End Close",
    unit: "days",
    direction: "inverse" as const,
    thresholds: {
      leading: { value: 3, score: 5, label: "Leading" },
      advanced: { value: 5, score: 4, label: "Advanced" },
      established: { value: 7, score: 3, label: "Established" },
      developing: { value: 10, score: 2, label: "Developing" },
      lagging: { value: "10+" as string | number, score: 1, label: "Lagging" },
    },
  },
  automation_rate: {
    metric: "Process Automation Rate",
    unit: "%",
    direction: "direct" as const,
    thresholds: {
      leading: { value: 80, score: 5, label: "Leading" },
      advanced: { value: 60, score: 4, label: "Advanced" },
      established: { value: 40, score: 3, label: "Established" },
      developing: { value: 20, score: 2, label: "Developing" },
      lagging: { value: "<20" as string | number, score: 1, label: "Lagging" },
    },
  },
  fte_count: {
    metric: "Finance FTE Capacity",
    unit: "FTEs",
    direction: "direct" as const,
    thresholds: {
      leading: { value: 50, score: 5, label: "Leading" },
      advanced: { value: 30, score: 4, label: "Advanced" },
      established: { value: 15, score: 3, label: "Established" },
      developing: { value: 5, score: 2, label: "Developing" },
      lagging: { value: "<5" as string | number, score: 1, label: "Lagging" },
    },
  },
};

/**
 * Scoring tier definitions for overall assessment scores
 */
export const SCORING_TIERS = [
  { tier: "World Class", range: "P90+", score: "4.5-5.0" },
  { tier: "Good", range: "P75-P90", score: "3.5-4.4" },
  { tier: "Average", range: "P50-P75", score: "2.5-3.4" },
  { tier: "Below Average", range: "P25-P50", score: "1.5-2.4" },
  { tier: "Poor", range: "Below P25", score: "1.0-1.4" },
] as const;
