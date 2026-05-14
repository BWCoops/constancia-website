/**
 * Finance Compass Intelligence Engine
 * 
 * 4-layer intelligence system for evidence-based strategic analysis:
 * - Layer 1: Confidence Thresholds (FACT/HYPOTHESIS/ESTIMATE)
 * - Layer 2: Semantic Analysis (cross-dimension pattern detection)
 * - Layer 3: Learnings Corpus (historical assessment patterns)
 * - Layer 4: Value Path Framework (ROI with confidence levels)
 */

import { VENDOR_BENCHMARKS, type VendorBenchmark, type CostRange } from "@shared/vendor-benchmarks";

// ============================================
// CONFIDENCE THRESHOLDS (Layer 1)
// Big 4 Consulting-Grade Presentation
// ============================================

export const CONFIDENCE_LEVELS = {
  FACT: {
    level: "FACT",
    threshold: 95,
    description: "Direct user input or verified data",
    tag: "[FACT]",
    prefix: "You reported",
    consultingLabel: "Validated Evidence",
    consultingDescription: "Directly evidenced from your assessment responses",
    visualStyle: "solid",
    iconType: "check-circle",
    colour: "emerald",
  },
  HYPOTHESIS: {
    level: "HYPOTHESIS",
    threshold: 70,
    description: "Inferred from pattern analysis",
    tag: "[HYPOTHESIS]",
    prefix: "Based on your responses, it appears",
    consultingLabel: "Advisory Judgement",
    consultingDescription: "Informed assessment based on pattern analysis",
    visualStyle: "dashed",
    iconType: "lightbulb",
    colour: "blue",
  },
  ESTIMATE: {
    level: "ESTIMATE",
    threshold: 50,
    description: "Based on industry benchmarks or corpus patterns",
    tag: "[ESTIMATE]",
    prefix: "Based on comparable organisations",
    consultingLabel: "Indicative Outlook",
    consultingDescription: "Benchmark-informed perspective from peer organisations",
    visualStyle: "dotted",
    iconType: "trending-up",
    colour: "amber",
  },
  REQUIRES_DISCOVERY: {
    level: "REQUIRES_DISCOVERY",
    threshold: 0,
    description: "Insufficient data - needs validation",
    tag: "[REQUIRES VALIDATION]",
    prefix: "To be confirmed in discovery",
    consultingLabel: "Pending Validation",
    consultingDescription: "Requires further exploration in discovery engagement",
    visualStyle: "outline",
    iconType: "search",
    colour: "slate",
  },
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_LEVELS;

export interface ConfidenceTaggedInsight {
  content: string;
  confidence: ConfidenceLevel;
  confidencePercentage: number;
  source: "user_direct_input" | "inferred_from_pattern" | "corpus_pattern" | "industry_benchmark";
  supportingEvidence?: string[];
}

// ============================================
// SEMANTIC PATTERNS (Layer 2)
// ============================================

export interface SemanticPattern {
  id: string;
  name: string;
  conditions: {
    dimension: string;
    operator: "high" | "low" | "above_peer" | "below_peer";
    threshold?: number;
  }[];
  inference: string;
  implication: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export const SEMANTIC_PATTERNS: SemanticPattern[] = [
  {
    id: "data_ready_process_bottleneck",
    name: "Data Ready, Process Bottleneck",
    conditions: [
      { dimension: "data_analytics", operator: "high", threshold: 65 },
      { dimension: "consolidation_close", operator: "low", threshold: 55 },
    ],
    inference: "Process/tool bottleneck, not data quality",
    implication: "EPM implementation will be relatively straightforward as data foundations are solid",
    confidence: 85,
    riskLevel: "low",
  },
  {
    id: "capability_exists_execution_gap",
    name: "Capability Exists, Execution Gap",
    conditions: [
      { dimension: "organisation_people", operator: "high", threshold: 60 },
      { dimension: "financial_planning_analysis", operator: "high", threshold: 60 },
      { dimension: "consolidation_close", operator: "low", threshold: 55 },
    ],
    inference: "Organisational capability exists; execution/process is the gap",
    implication: "Will respond well to process redesign; not a change management heavy lift",
    confidence: 80,
    riskLevel: "low",
  },
  {
    id: "ai_before_foundation",
    name: "AI Ambition Before Foundation",
    conditions: [
      { dimension: "ai_machine_learning", operator: "above_peer" },
      { dimension: "consolidation_close", operator: "low", threshold: 55 },
    ],
    inference: "ANOMALY: Planning AI/analytics before stabilising close process",
    implication: "RISK: Sequencing may be wrong. Recommend Phase 1 focus on Consolidation before AI initiatives",
    confidence: 90,
    riskLevel: "high",
  },
  {
    id: "governance_lagging_strategy",
    name: "Governance Lagging Strategy",
    conditions: [
      { dimension: "financial_controls_compliance", operator: "low", threshold: 55 },
      { dimension: "financial_planning_analysis", operator: "high", threshold: 65 },
    ],
    inference: "Controls may not keep pace with strategic execution",
    implication: "Discovery must prioritise governance/control design before scaling transformation",
    confidence: 75,
    riskLevel: "medium",
  },
  {
    id: "technology_outpacing_skills",
    name: "Technology Outpacing Skills",
    conditions: [
      { dimension: "technology_systems", operator: "high", threshold: 65 },
      { dimension: "organisation_people", operator: "low", threshold: 50 },
    ],
    inference: "Technology investments may not realise full value due to capability gaps",
    implication: "Change management and training programme essential for ROI",
    confidence: 80,
    riskLevel: "medium",
  },
  {
    id: "strong_foundation_ready_to_scale",
    name: "Strong Foundation, Ready to Scale",
    conditions: [
      { dimension: "consolidation_close", operator: "high", threshold: 65 },
      { dimension: "data_analytics", operator: "high", threshold: 65 },
      { dimension: "financial_controls_compliance", operator: "high", threshold: 60 },
    ],
    inference: "Solid operational foundation in place",
    implication: "Organisation is ready for strategic initiatives and advanced capabilities",
    confidence: 85,
    riskLevel: "low",
  },
  {
    id: "reporting_without_data_quality",
    name: "Reporting Without Data Quality",
    conditions: [
      { dimension: "management_reporting", operator: "high", threshold: 60 },
      { dimension: "data_analytics", operator: "low", threshold: 50 },
    ],
    inference: "Reporting outputs may be compromised by underlying data issues",
    implication: "Data quality remediation should precede reporting enhancements",
    confidence: 80,
    riskLevel: "high",
  },
];

// ============================================
// VALUE PATH FRAMEWORK (Layer 4)
// ============================================

export interface BenefitCategory {
  id: string;
  name: string;
  description: string;
  confidenceLevel: number;
  calculationApproach: string;
  requiresUserInput: string[];
}

export const BENEFIT_CATEGORIES: BenefitCategory[] = [
  {
    id: "hard_costs",
    name: "Hard Costs",
    description: "FTE reduction, audit fees, software consolidation",
    confidenceLevel: 95,
    calculationApproach: "Direct calculation from user-provided metrics",
    requiresUserInput: ["current_close_days", "target_close_days", "finance_fte_count", "average_salary"],
  },
  {
    id: "soft_efficiency",
    name: "Soft Efficiency",
    description: "Planning time, variance analysis, report generation",
    confidenceLevel: 80,
    calculationApproach: "Industry benchmarks applied to user context",
    requiresUserInput: ["planning_cycle_hours", "finance_fte_count"],
  },
  {
    id: "strategic_value",
    name: "Strategic Value",
    description: "Decision speed, revenue optimisation, working capital",
    confidenceLevel: 65,
    calculationApproach: "Scenario-based estimation requiring discovery validation",
    requiresUserInput: [],
  },
];

export interface TimelinePhase {
  id: string;
  name: string;
  monthRange: { start: number; end: number };
  typicalBenefitPercentage: number;
  keyActivities: string[];
  criticalDependencies: string[];
}

// ============================================
// VALUE JOURNEY FRAMEWORK (Layer 5)
// Maps client pain points and ambitions to findings
// ============================================

export interface ClientDiscoveryProfile {
  painPoints: string[];
  ambitions: string[];
  priorities: string[];
  urgencyLevel: number;
  budgetReadiness: string;
  stakeholderBuyIn: number;
}

export interface ValueJourneyTheme {
  id: string;
  name: string;
  description: string;
  painPointTriggers: string[];
  ambitionTriggers: string[];
  dimensionLinks: string[];
  recommendedActions: string[];
  expectedOutcomes: string[];
  typicalTimeline: string;
  confidenceLevel: ConfidenceLevel;
}

export const VALUE_JOURNEY_THEMES: ValueJourneyTheme[] = [
  {
    id: "close_acceleration",
    name: "Close Cycle Acceleration",
    description: "Reduce month-end close from days to hours through automation and process redesign",
    painPointTriggers: ["slow_close", "manual_reporting", "close"],
    ambitionTriggers: ["close_cycle", "cost_reduction", "zero_touch_close", "cost_efficiency"],
    dimensionLinks: ["consolidation_close", "technology_systems"],
    recommendedActions: [
      "Automate intercompany eliminations",
      "Implement close task management",
      "Deploy real-time consolidation",
    ],
    expectedOutcomes: [
      "30-50% reduction in close cycle time",
      "Reduced manual effort by 40-60%",
      "Earlier availability of management information",
    ],
    typicalTimeline: "4-8 months",
    confidenceLevel: "HYPOTHESIS",
  },
  {
    id: "planning_excellence",
    name: "Planning & Forecasting Excellence",
    description: "Transform planning from annual exercise to continuous, driver-based capability",
    painPointTriggers: ["forecasting_challenges", "scenario_analysis", "forecasting", "budgeting"],
    ambitionTriggers: ["forecasting", "epm", "business_partnering", "continuous_planning", "predictive_analytics"],
    dimensionLinks: ["financial_planning_analysis", "data_analytics"],
    recommendedActions: [
      "Implement driver-based planning models",
      "Deploy rolling forecast capability",
      "Enable scenario and what-if analysis",
    ],
    expectedOutcomes: [
      "25-40% improvement in forecast accuracy",
      "Reduced planning cycle by 30-50%",
      "Enhanced strategic decision support",
    ],
    typicalTimeline: "6-12 months",
    confidenceLevel: "HYPOTHESIS",
  },
  {
    id: "data_foundation",
    name: "Data Foundation & Quality",
    description: "Establish single source of truth with robust governance and quality controls",
    painPointTriggers: ["data_silos", "poor_data_quality", "data_collection"],
    ambitionTriggers: ["data_quality", "reporting", "real_time_insights"],
    dimensionLinks: ["data_analytics", "technology_systems"],
    recommendedActions: [
      "Implement master data management",
      "Establish data governance framework",
      "Deploy automated data quality monitoring",
    ],
    expectedOutcomes: [
      "95%+ data accuracy and consistency",
      "Reduced reconciliation effort by 60-80%",
      "Trusted reporting and analytics foundation",
    ],
    typicalTimeline: "6-10 months",
    confidenceLevel: "ESTIMATE",
  },
  {
    id: "controls_governance",
    name: "Controls & Governance Strengthening",
    description: "Embed robust controls, segregation of duties, and audit trail capabilities",
    painPointTriggers: ["compliance_issues", "approvals"],
    ambitionTriggers: ["controls", "cost_reduction", "world_class_controls"],
    dimensionLinks: ["financial_controls_compliance", "technology_systems"],
    recommendedActions: [
      "Implement automated controls framework",
      "Deploy workflow and approval automation",
      "Establish comprehensive audit trail",
    ],
    expectedOutcomes: [
      "Reduced compliance risk exposure",
      "Automated SOD enforcement",
      "Streamlined audit processes",
    ],
    typicalTimeline: "4-8 months",
    confidenceLevel: "HYPOTHESIS",
  },
  {
    id: "reporting_insights",
    name: "Reporting & Insights Transformation",
    description: "Move from static reports to dynamic, self-service insights and analytics",
    painPointTriggers: ["manual_reporting", "poor_visibility", "reporting", "variance_analysis"],
    ambitionTriggers: ["reporting", "business_partnering", "real_time_insights", "self_service"],
    dimensionLinks: ["management_reporting", "data_analytics"],
    recommendedActions: [
      "Implement self-service reporting platform",
      "Deploy automated variance commentary",
      "Enable real-time performance dashboards",
    ],
    expectedOutcomes: [
      "80% reduction in report production time",
      "Enhanced stakeholder self-service",
      "Proactive insight generation",
    ],
    typicalTimeline: "4-8 months",
    confidenceLevel: "HYPOTHESIS",
  },
  {
    id: "team_transformation",
    name: "Finance Team Transformation",
    description: "Shift team focus from transactional processing to strategic business partnering",
    painPointTriggers: ["resource_constraints"],
    ambitionTriggers: ["business_partnering", "operating_model", "cost_reduction", "strategic_partner", "talent_development"],
    dimensionLinks: ["organisation_people", "financial_planning_analysis"],
    recommendedActions: [
      "Redesign finance operating model",
      "Implement capability development programme",
      "Establish business partnering framework",
    ],
    expectedOutcomes: [
      "20-40% shift from transactional to value-add",
      "Enhanced business engagement",
      "Improved talent retention",
    ],
    typicalTimeline: "12-18 months",
    confidenceLevel: "ESTIMATE",
  },
  {
    id: "ai_analytics_enablement",
    name: "AI & Advanced Analytics Enablement",
    description: "Leverage AI and machine learning for predictive insights and intelligent automation",
    painPointTriggers: ["scenario_analysis", "forecasting_challenges", "poor_visibility"],
    ambitionTriggers: ["predictive_analytics", "real_time_insights", "continuous_planning"],
    dimensionLinks: ["ai_machine_learning", "data_analytics", "financial_planning_analysis"],
    recommendedActions: [
      "Deploy AI-powered forecasting models",
      "Implement intelligent anomaly detection",
      "Enable natural language analytics",
    ],
    expectedOutcomes: [
      "20-35% improvement in forecast accuracy",
      "Automated insight generation",
      "Proactive exception handling",
    ],
    typicalTimeline: "8-14 months",
    confidenceLevel: "ESTIMATE",
  },
];

export function matchValueJourneyThemes(
  clientProfile: ClientDiscoveryProfile,
  dimensionScores: Record<string, number>
): { theme: ValueJourneyTheme; relevanceScore: number; matchedTriggers: string[] }[] {
  const results: { theme: ValueJourneyTheme; relevanceScore: number; matchedTriggers: string[] }[] = [];
  
  for (const theme of VALUE_JOURNEY_THEMES) {
    let relevanceScore = 0;
    const matchedTriggers: string[] = [];
    
    for (const painPoint of clientProfile.painPoints) {
      if (theme.painPointTriggers.includes(painPoint)) {
        relevanceScore += 25;
        matchedTriggers.push(`Pain: ${painPoint}`);
      }
    }
    
    for (const ambition of clientProfile.ambitions) {
      if (theme.ambitionTriggers.includes(ambition)) {
        relevanceScore += 30;
        matchedTriggers.push(`Ambition: ${ambition}`);
      }
    }
    
    for (const priority of clientProfile.priorities) {
      if (theme.ambitionTriggers.includes(priority)) {
        relevanceScore += 20;
        matchedTriggers.push(`Priority: ${priority}`);
      }
    }
    
    for (const dimension of theme.dimensionLinks) {
      const score = dimensionScores[dimension];
      if (score !== undefined && score < 60) {
        relevanceScore += 15;
        matchedTriggers.push(`Gap: ${dimension} (${score}%)`);
      }
    }
    
    if (relevanceScore > 0) {
      results.push({ theme, relevanceScore: Math.min(relevanceScore, 100), matchedTriggers });
    }
  }
  
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function generateValueJourneyNarrative(
  clientProfile: ClientDiscoveryProfile,
  matchedThemes: { theme: ValueJourneyTheme; relevanceScore: number; matchedTriggers: string[] }[]
): string {
  if (matchedThemes.length === 0) {
    return "Based on your assessment, we will develop a customised transformation approach during our discovery engagement.";
  }
  
  const topThemes = matchedThemes.slice(0, 3);
  
  let narrative = "YOUR VALUE JOURNEY\n\n";
  narrative += "Based on the challenges you've identified and your strategic ambitions, we've mapped a tailored transformation path:\n\n";
  
  for (let i = 0; i < topThemes.length; i++) {
    const { theme, relevanceScore, matchedTriggers } = topThemes[i];
    const label = CONFIDENCE_LEVELS[theme.confidenceLevel].consultingLabel;
    
    narrative += `${i + 1}. ${theme.name} (${label})\n`;
    narrative += `   ${theme.description}\n`;
    narrative += `   Triggered by: ${matchedTriggers.slice(0, 3).map(t => t.split(': ')[1]).join(', ')}\n`;
    narrative += `   Expected outcomes:\n`;
    for (const outcome of theme.expectedOutcomes.slice(0, 2)) {
      narrative += `   - ${outcome}\n`;
    }
    narrative += `   Indicative timeline: ${theme.typicalTimeline}\n\n`;
  }
  
  return narrative;
}

// ============================================
// REALISTIC TIMELINE FLOORS
// Minimum implementation durations by complexity
// ============================================

export const TIMELINE_FLOORS = {
  integration: {
    minMonths: 5,
    description: "System integration minimum (data mapping, testing, go-live)",
  },
  coreImplementation: {
    minMonths: 8,
    description: "Core finance transformation module implementation minimum",
  },
  fullEPM: {
    minMonths: 12,
    description: "Full finance transformation platform implementation minimum",
  },
  multiEntity: {
    minMonths: 10,
    description: "Multi-entity consolidation minimum",
  },
  changeManagement: {
    minMonths: 3,
    description: "Change management and training minimum",
  },
  dataRemediation: {
    minMonths: 4,
    description: "Data quality remediation minimum",
  },
} as const;

// ============================================
// INDUSTRY COMPLEXITY FACTORS
// Multipliers applied to base timelines based on industry characteristics
// ============================================

export interface IndustryComplexityProfile {
  multiplier: number;
  phaseAdjustments: {
    foundation: number;  // Multiplier for foundation phase
    build: number;       // Multiplier for build/configure phase
    integration: number; // Multiplier for integration phase
    optimisation: number; // Multiplier for optimisation phase
  };
  rationale: string;
  typicalChallenges: string[];
}

export const INDUSTRY_COMPLEXITY: Record<string, IndustryComplexityProfile> = {
  // High Complexity Industries (1.3-1.5x baseline)
  manufacturing: {
    multiplier: 1.4,
    phaseAdjustments: { foundation: 1.2, build: 1.5, integration: 1.6, optimisation: 1.2 },
    rationale: "Complex supply chains, multiple ERP systems, plant-level consolidation, inventory and cost accounting complexity",
    typicalChallenges: [
      "Multi-site manufacturing consolidation",
      "Complex cost allocation and transfer pricing",
      "ERP integration across SAP, Oracle, and legacy systems",
      "Demand planning and S&OP integration",
    ],
  },
  financial_services: {
    multiplier: 1.35,
    phaseAdjustments: { foundation: 1.3, build: 1.4, integration: 1.4, optimisation: 1.3 },
    rationale: "Regulatory compliance requirements, complex product hierarchies, risk-adjusted reporting",
    typicalChallenges: [
      "Regulatory reporting (FCA, PRA, Basel III)",
      "Multi-currency and multi-GAAP consolidation",
      "Complex intercompany eliminations",
      "Risk and capital planning integration",
    ],
  },
  healthcare: {
    multiplier: 1.35,
    phaseAdjustments: { foundation: 1.3, build: 1.3, integration: 1.5, optimisation: 1.2 },
    rationale: "Regulatory compliance (NHS, CQC), complex cost centres, clinical and operational planning alignment",
    typicalChallenges: [
      "NHS reporting requirements",
      "Cost per patient/procedure tracking",
      "Clinical and financial data integration",
      "Multi-trust consolidation",
    ],
  },
  energy_utilities: {
    multiplier: 1.4,
    phaseAdjustments: { foundation: 1.2, build: 1.4, integration: 1.6, optimisation: 1.3 },
    rationale: "Asset-intensive operations, regulatory requirements, long-term capital planning complexity",
    typicalChallenges: [
      "Regulatory price control submissions (Ofgem)",
      "Asset lifecycle and capital planning",
      "Complex revenue recognition",
      "Multi-utility consolidation",
    ],
  },
  retail: {
    multiplier: 1.25,
    phaseAdjustments: { foundation: 1.1, build: 1.3, integration: 1.4, optimisation: 1.1 },
    rationale: "High transaction volumes, seasonal planning, omnichannel complexity, store-level consolidation",
    typicalChallenges: [
      "Store and channel-level planning",
      "Seasonal demand forecasting",
      "Inventory and markdown optimisation",
      "Franchise and concession accounting",
    ],
  },
  
  // Medium Complexity Industries (1.1-1.2x baseline)
  professional_services: {
    multiplier: 1.1,
    phaseAdjustments: { foundation: 1.0, build: 1.1, integration: 1.2, optimisation: 1.0 },
    rationale: "Project-based accounting, resource planning, simpler data structures",
    typicalChallenges: [
      "Project profitability tracking",
      "Resource utilisation planning",
      "Partner compensation modelling",
      "WIP and revenue recognition",
    ],
  },
  technology: {
    multiplier: 1.0,
    phaseAdjustments: { foundation: 1.0, build: 1.0, integration: 1.0, optimisation: 1.0 },
    rationale: "Generally simpler structures, modern systems, tech-savvy teams, SaaS revenue models",
    typicalChallenges: [
      "ARR/MRR metrics and cohort analysis",
      "Product line profitability",
      "R&D capitalisation tracking",
      "Multi-entity international consolidation",
    ],
  },
  media_entertainment: {
    multiplier: 1.15,
    phaseAdjustments: { foundation: 1.0, build: 1.2, integration: 1.2, optimisation: 1.1 },
    rationale: "Content accounting complexity, rights management, project-based structures",
    typicalChallenges: [
      "Content amortisation and rights accounting",
      "Project-based production budgeting",
      "Advertising revenue recognition",
      "Multi-platform distribution tracking",
    ],
  },
  
  // Lower Complexity Industries (0.9-1.0x baseline)
  real_estate: {
    multiplier: 1.05,
    phaseAdjustments: { foundation: 1.0, build: 1.0, integration: 1.1, optimisation: 1.0 },
    rationale: "Property-level accounting, simpler operational structures",
    typicalChallenges: [
      "Property-level P&L and NAV",
      "Development project tracking",
      "Rent roll forecasting",
      "Fund-level consolidation",
    ],
  },
} as const;

// ============================================
// INDUSTRY VALUE CONTEXT (Layer 6)
// Margin Profiles & Transformation Impact
// ============================================

export type MarginCategory = "low_margin" | "medium_margin" | "high_margin";

export interface IndustryValueProfile {
  marginCategory: MarginCategory;
  typicalMargin: { min: number; max: number };
  forecastImpactMultiplier: number;
  transformationValueDrivers: string[];
  keyEPMBenefits: string[];
  keyERPBenefits: string[];
  keyAIBenefits: string[];
  marketTrends: string[];
  regulatoryPressures: string[];
  stakeholderPriorities: {
    cfo: string[];
    cio: string[];
    fpa: string[];
  };
}

export const INDUSTRY_VALUE_PROFILES: Record<string, IndustryValueProfile> = {
  manufacturing: {
    marginCategory: "low_margin",
    typicalMargin: { min: 3, max: 8 },
    forecastImpactMultiplier: 2.5,
    transformationValueDrivers: [
      "1% improvement in forecast accuracy can add 3-5% to EBITDA",
      "Working capital optimisation from demand planning typically frees 5-10% of inventory value",
      "S&OP integration reduces production variances by 15-25%",
    ],
    keyEPMBenefits: [
      "Demand sensing and S&OP planning directly impact working capital",
      "Product-line profitability visibility drives portfolio decisions",
      "Driver-based cost modelling enables rapid margin simulation",
    ],
    keyERPBenefits: [
      "Real-time inventory visibility reduces carrying costs",
      "Production scheduling optimisation improves OEE",
      "Quality management integration reduces scrap and rework",
    ],
    keyAIBenefits: [
      "Demand forecasting AI reduces forecast error by 20-40%",
      "Predictive maintenance reduces unplanned downtime by 30-50%",
      "Anomaly detection identifies cost overruns before they escalate",
    ],
    marketTrends: [
      "Supply chain volatility driving investment in planning resilience",
      "ESG reporting requirements increasing data integration needs",
      "Industry 4.0 and IoT creating new data sources for planning",
    ],
    regulatoryPressures: [
      "Carbon reporting (CSRD, TCFD) requiring granular emissions tracking",
      "Supply chain due diligence legislation (UK Modern Slavery Act)",
      "Product safety and quality compliance automation",
    ],
    stakeholderPriorities: {
      cfo: ["Working capital optimisation", "Margin protection in volatile input costs", "CapEx planning and ROI tracking"],
      cio: ["ERP consolidation and cloud migration", "OT/IT convergence", "Data integration from shop floor"],
      fpa: ["Standard cost variance analysis automation", "Rolling forecast for capacity planning", "SKU-level profitability"],
    },
  },
  financial_services: {
    marginCategory: "high_margin",
    typicalMargin: { min: 25, max: 45 },
    forecastImpactMultiplier: 1.2,
    transformationValueDrivers: [
      "Regulatory compliance efficiency can reduce costs of compliance by 20-30%",
      "Customer profitability analytics drive portfolio optimisation",
      "Faster close enables earlier market communication and valuation benefits",
    ],
    keyEPMBenefits: [
      "Multi-GAAP and regulatory consolidation reduces reporting burden",
      "Capital planning and stress testing integration",
      "Product profitability across complex fee structures",
    ],
    keyERPBenefits: [
      "Customer lifecycle management and relationship profitability",
      "Contract and fee management automation",
      "Compliance workflow and audit trail automation",
    ],
    keyAIBenefits: [
      "Credit risk modelling and early warning systems",
      "Fraud detection and anti-money laundering enhancement",
      "Customer behaviour prediction for retention and cross-sell",
    ],
    marketTrends: [
      "Basel IV implementation driving capital efficiency focus",
      "Open banking and API ecosystem expansion",
      "Digital transformation and fintech competition",
    ],
    regulatoryPressures: [
      "FCA/PRA reporting requirements (ICAAP, ILAAP, SREP)",
      "Consumer Duty driving customer outcome measurement",
      "Operational resilience requirements (third-party oversight)",
    ],
    stakeholderPriorities: {
      cfo: ["Regulatory capital optimisation", "Cost-to-income ratio improvement", "Interest rate sensitivity planning"],
      cio: ["Legacy system modernisation", "API and integration platform strategy", "Cybersecurity and resilience"],
      fpa: ["Stress testing and scenario modelling", "NIM and spread analysis automation", "Provision forecasting"],
    },
  },
  technology: {
    marginCategory: "high_margin",
    typicalMargin: { min: 40, max: 70 },
    forecastImpactMultiplier: 1.0,
    transformationValueDrivers: [
      "ARR growth and retention metrics drive valuation multiples",
      "Unit economics visibility enables efficient scaling decisions",
      "Fast close supports rapid growth decision-making",
    ],
    keyEPMBenefits: [
      "SaaS metrics (ARR, MRR, cohort analysis) integrated planning",
      "Product-line and customer segment profitability",
      "Scenario modelling for growth investments",
    ],
    keyERPBenefits: [
      "Revenue recognition automation (ASC 606/IFRS 15)",
      "R&D capitalisation and project tracking",
      "Multi-entity and multi-currency consolidation",
    ],
    keyAIBenefits: [
      "Churn prediction and customer health scoring",
      "Pricing optimisation and elasticity modelling",
      "Sales forecasting and pipeline analytics",
    ],
    marketTrends: [
      "Shift from growth-at-all-costs to efficient growth (Rule of 40)",
      "AI integration into product offerings",
      "Increasing M&A activity requiring fast integration capability",
    ],
    regulatoryPressures: [
      "Data privacy (GDPR, UK Data Protection Act)",
      "AI regulation (EU AI Act) compliance preparation",
      "SOC 2 and security compliance for enterprise customers",
    ],
    stakeholderPriorities: {
      cfo: ["Rule of 40 optimisation", "IPO/exit readiness", "Unit economics visibility"],
      cio: ["Scalable infrastructure", "Data platform and analytics capability", "Security and compliance"],
      fpa: ["Cohort analysis automation", "CAC/LTV modelling", "Revenue forecasting accuracy"],
    },
  },
  retail: {
    marginCategory: "low_margin",
    typicalMargin: { min: 2, max: 6 },
    forecastImpactMultiplier: 3.0,
    transformationValueDrivers: [
      "0.5% improvement in markdown effectiveness can add 2-4% to gross margin",
      "Inventory optimisation frees significant working capital",
      "Demand forecasting accuracy directly impacts store profitability",
    ],
    keyEPMBenefits: [
      "Store-level planning and profitability analytics",
      "Promotional effectiveness and markdown optimisation",
      "Omnichannel demand planning and allocation",
    ],
    keyERPBenefits: [
      "Inventory management and replenishment automation",
      "Supplier management and procurement efficiency",
      "POS integration and transaction processing",
    ],
    keyAIBenefits: [
      "Demand sensing reduces stockouts by 30-50%",
      "Dynamic pricing optimisation improves margins",
      "Personalisation drives conversion and basket size",
    ],
    marketTrends: [
      "Omnichannel integration and unified commerce",
      "Supply chain resilience and nearshoring",
      "Sustainability and circular economy requirements",
    ],
    regulatoryPressures: [
      "Consumer protection and pricing transparency",
      "Sustainability reporting and packaging regulations",
      "Labour and living wage compliance",
    ],
    stakeholderPriorities: {
      cfo: ["Working capital velocity", "Store portfolio optimisation", "Lease accounting and occupancy costs"],
      cio: ["Unified commerce platform", "Real-time inventory visibility", "Customer data platform"],
      fpa: ["Promotional ROI analysis", "Category and SKU profitability", "Seasonal demand modelling"],
    },
  },
  healthcare: {
    marginCategory: "medium_margin",
    typicalMargin: { min: 8, max: 18 },
    forecastImpactMultiplier: 1.5,
    transformationValueDrivers: [
      "Capacity planning accuracy improves resource utilisation",
      "Cost-per-procedure visibility drives service line decisions",
      "Regulatory reporting automation reduces compliance burden",
    ],
    keyEPMBenefits: [
      "Activity-based costing for clinical procedures",
      "Capacity and workforce planning integration",
      "Multi-trust and multi-site consolidation",
    ],
    keyERPBenefits: [
      "Supply chain management for medical consumables",
      "Asset lifecycle management for medical equipment",
      "HR and payroll integration for complex workforce",
    ],
    keyAIBenefits: [
      "Patient demand forecasting improves bed management",
      "Clinical outcome prediction supports resource allocation",
      "Operational efficiency analytics reduce waiting times",
    ],
    marketTrends: [
      "NHS efficiency and transformation agenda",
      "Integrated care systems and population health",
      "Digital health and remote monitoring expansion",
    ],
    regulatoryPressures: [
      "CQC reporting and quality metrics",
      "NHS financial reporting requirements",
      "GDPR and patient data protection",
    ],
    stakeholderPriorities: {
      cfo: ["Cost-per-case analysis", "Income recovery optimisation", "Capital planning for equipment"],
      cio: ["Electronic patient records integration", "Interoperability and data sharing", "Cybersecurity for patient data"],
      fpa: ["Service line profitability", "Productivity and efficiency metrics", "Demand and capacity modelling"],
    },
  },
  energy_utilities: {
    marginCategory: "medium_margin",
    typicalMargin: { min: 8, max: 15 },
    forecastImpactMultiplier: 1.8,
    transformationValueDrivers: [
      "Asset planning accuracy impacts regulated returns",
      "Energy trading and hedging optimisation",
      "Regulatory submission efficiency and accuracy",
    ],
    keyEPMBenefits: [
      "Long-horizon capital planning (25+ years)",
      "Regulatory price control modelling",
      "Portfolio and commodity price sensitivity",
    ],
    keyERPBenefits: [
      "Asset lifecycle and maintenance management",
      "Field service and workforce management",
      "Meter-to-cash and billing automation",
    ],
    keyAIBenefits: [
      "Demand forecasting for grid balancing",
      "Predictive maintenance for infrastructure",
      "Customer usage pattern analysis for tariff design",
    ],
    marketTrends: [
      "Net zero transition and renewable integration",
      "Smart grid and IoT sensor proliferation",
      "Energy market volatility and price competition",
    ],
    regulatoryPressures: [
      "Ofgem price control submissions",
      "Carbon reporting and net zero commitments",
      "Customer vulnerability and fair pricing requirements",
    ],
    stakeholderPriorities: {
      cfo: ["Regulatory return optimisation", "Totex efficiency", "Financing and debt management"],
      cio: ["OT/IT convergence", "Smart meter data integration", "Operational resilience"],
      fpa: ["Price control modelling", "Asset valuation and RAV", "Wholesale cost forecasting"],
    },
  },
  professional_services: {
    marginCategory: "medium_margin",
    typicalMargin: { min: 15, max: 30 },
    forecastImpactMultiplier: 1.3,
    transformationValueDrivers: [
      "Utilisation improvement directly impacts profitability",
      "Project profitability visibility drives pricing decisions",
      "Resource planning accuracy reduces bench time",
    ],
    keyEPMBenefits: [
      "Project-level profitability and margin analysis",
      "Resource capacity and skills planning",
      "Partner compensation and incentive modelling",
    ],
    keyERPBenefits: [
      "Time and expense management automation",
      "Project accounting and WIP management",
      "Client relationship and engagement tracking",
    ],
    keyAIBenefits: [
      "Resource matching and skills optimisation",
      "Project risk and delivery prediction",
      "Client sentiment and relationship health scoring",
    ],
    marketTrends: [
      "Alternative fee arrangements and outcome-based pricing",
      "Talent competition and retention challenges",
      "Automation of routine professional tasks",
    ],
    regulatoryPressures: [
      "Professional body reporting requirements",
      "Anti-money laundering for professional services",
      "Data protection and client confidentiality",
    ],
    stakeholderPriorities: {
      cfo: ["Utilisation and realisation rates", "Partner economics and lock-up", "Practice profitability"],
      cio: ["Collaboration and knowledge management", "Client portal and digital delivery", "Cybersecurity for client data"],
      fpa: ["Project margin forecasting", "Pipeline and revenue recognition", "Resource demand planning"],
    },
  },

  // ============================================
  // ADDITIONAL SECTORS (2026 Forward-Looking Data)
  // Data Sources: APQC, ONS, IBIS World, Deloitte TMT
  // Last Updated: December 2025
  // ============================================

  telecommunications_media: {
    marginCategory: "medium_margin",
    typicalMargin: { min: 12, max: 25 }, // Source: Deloitte TMT Predictions 2025, IBIS World
    forecastImpactMultiplier: 1.6,
    transformationValueDrivers: [
      "Network capacity planning accuracy impacts CapEx efficiency by 15-20%",
      "Customer lifetime value modelling drives retention and ARPU decisions",
      "Content investment ROI analytics for media portfolio optimisation",
    ],
    keyEPMBenefits: [
      "Network infrastructure and spectrum planning",
      "Customer segment and product profitability",
      "Media content and rights valuation",
    ],
    keyERPBenefits: [
      "Subscription billing and revenue management",
      "Content rights and royalty management",
      "Multi-platform distribution and tracking",
    ],
    keyAIBenefits: [
      "Churn prediction reduces customer attrition by 15-25%",
      "Network demand forecasting for capacity planning",
      "Content recommendation and personalisation",
    ],
    marketTrends: [
      "5G monetisation and enterprise services expansion (2025-2026)",
      "Media M&A consolidation and streaming competition",
      "AI-generated content and copyright implications",
    ],
    regulatoryPressures: [
      "Ofcom digital markets and spectrum regulation",
      "Online Safety Act compliance requirements",
      "Data retention and lawful intercept obligations",
    ],
    stakeholderPriorities: {
      cfo: ["CapEx-to-revenue efficiency", "ARPU protection and growth", "Content investment ROI"],
      cio: ["Network transformation and virtualisation", "Customer data platform", "Content delivery optimisation"],
      fpa: ["Subscriber economics modelling", "Churn and LTV forecasting", "Infrastructure investment planning"],
    },
  },

  transportation_logistics: {
    marginCategory: "low_margin",
    typicalMargin: { min: 2, max: 8 }, // Source: ONS Transport Statistics, IBIS World Logistics
    forecastImpactMultiplier: 2.8,
    transformationValueDrivers: [
      "Route and fleet optimisation can reduce fuel costs by 10-15%",
      "Capacity utilisation improvements directly impact margins",
      "Dynamic pricing and yield management for perishable capacity",
    ],
    keyEPMBenefits: [
      "Route and network profitability analysis",
      "Fleet and asset utilisation planning",
      "Fuel hedging and cost scenario modelling",
    ],
    keyERPBenefits: [
      "Fleet management and maintenance scheduling",
      "Warehouse management and order fulfilment",
      "Freight billing and carrier settlement",
    ],
    keyAIBenefits: [
      "Demand forecasting reduces empty miles by 20-30%",
      "Predictive maintenance reduces breakdown costs by 25-40%",
      "Dynamic routing optimisation for real-time efficiency",
    ],
    marketTrends: [
      "Electric vehicle transition and charging infrastructure",
      "Last-mile delivery innovation and e-commerce demand",
      "Supply chain visibility and sustainability reporting",
    ],
    regulatoryPressures: [
      "Clean Air Zone and ULEZ compliance",
      "Driver hours and tachograph regulations",
      "Carbon reporting for scope 3 emissions",
    ],
    stakeholderPriorities: {
      cfo: ["Fuel cost management and hedging", "Asset ROI and replacement planning", "Working capital and debtor management"],
      cio: ["Telematics and IoT integration", "TMS and WMS modernisation", "Real-time visibility platforms"],
      fpa: ["Lane and customer profitability", "Capacity and yield forecasting", "Cost-per-mile analytics"],
    },
  },

  real_estate_construction: {
    marginCategory: "medium_margin",
    typicalMargin: { min: 8, max: 18 }, // Source: ONS Construction Output, RICS Market Survey
    forecastImpactMultiplier: 1.7,
    transformationValueDrivers: [
      "Project cash flow forecasting accuracy impacts financing costs",
      "Land bank and development pipeline valuation",
      "Subcontractor and materials cost management",
    ],
    keyEPMBenefits: [
      "Development appraisal and feasibility modelling",
      "Project cash flow and draw schedule planning",
      "Portfolio NAV and valuation modelling",
    ],
    keyERPBenefits: [
      "Project cost management and contractor payments",
      "Property management and lease administration",
      "Asset lifecycle and maintenance management",
    ],
    keyAIBenefits: [
      "Construction cost estimation AI improves accuracy by 20-30%",
      "Predictive analytics for rent roll and vacancy",
      "Site productivity and progress monitoring",
    ],
    marketTrends: [
      "Interest rate sensitivity and refinancing challenges (2025-2026)",
      "Build-to-rent and alternative asset classes growth",
      "Net zero construction and retrofitting requirements",
    ],
    regulatoryPressures: [
      "Building Safety Act compliance and fire safety",
      "EPC requirements for rental and commercial property",
      "Planning reform and biodiversity net gain",
    ],
    stakeholderPriorities: {
      cfo: ["Development IRR and project viability", "Debt covenant management", "NAV and valuation accuracy"],
      cio: ["BIM integration and digital twin", "Property management technology", "Sustainability data collection"],
      fpa: ["Project cash flow modelling", "Portfolio yield and income forecasting", "Cap rate and valuation sensitivity"],
    },
  },

  public_sector: {
    marginCategory: "low_margin",
    typicalMargin: { min: 0, max: 3 }, // Public sector operates on efficiency metrics, not profit margins
    forecastImpactMultiplier: 1.4, // Value measured in efficiency gains and service delivery
    transformationValueDrivers: [
      "Efficiency savings of 10-20% through better demand and resource planning",
      "Grant and funding utilisation optimisation",
      "Cross-departmental resource sharing and collaboration",
    ],
    keyEPMBenefits: [
      "Medium-term financial planning (MTFP) and scenario modelling",
      "Service costing and activity-based budgeting",
      "Capital programme and infrastructure planning",
    ],
    keyERPBenefits: [
      "Procurement and contract management automation",
      "HR and payroll for complex workforce",
      "Grant and funding management and compliance",
    ],
    keyAIBenefits: [
      "Demand forecasting for public services",
      "Fraud detection and error reduction",
      "Citizen service automation and chatbots",
    ],
    marketTrends: [
      "Efficiency and productivity improvement mandates (2025-2026)",
      "Digital transformation and channel shift",
      "Net zero public sector estate requirements",
    ],
    regulatoryPressures: [
      "CIPFA Financial Management Code compliance",
      "Public sector equality duty and outcomes reporting",
      "FOI and transparency requirements",
    ],
    stakeholderPriorities: {
      cfo: ["MTFP and savings delivery", "Reserve and cash flow management", "Capital programme funding"],
      cio: ["Legacy system modernisation", "Cyber security and resilience", "Data sharing and interoperability"],
      fpa: ["Service demand modelling", "Budget monitoring and forecasting", "Unit cost and efficiency metrics"],
    },
  },

  education: {
    marginCategory: "low_margin",
    typicalMargin: { min: 1, max: 5 }, // Source: OfS/ESFA financial benchmarking, university operating margins
    forecastImpactMultiplier: 1.5,
    transformationValueDrivers: [
      "Student recruitment forecasting accuracy impacts revenue planning",
      "Estate and capital planning for long-horizon investments",
      "Research income and grant management optimisation",
    ],
    keyEPMBenefits: [
      "Student number planning and fee income modelling",
      "Research costing and full economic costing (fEC)",
      "Estate strategy and space utilisation",
    ],
    keyERPBenefits: [
      "Student records and fee management",
      "Research grant and project accounting",
      "HR and payroll for academic and support staff",
    ],
    keyAIBenefits: [
      "Student outcome prediction and intervention",
      "Research funding opportunity matching",
      "Timetabling and resource optimisation",
    ],
    marketTrends: [
      "International student recruitment volatility",
      "Research funding landscape changes post-Brexit",
      "Digital learning and hybrid delivery models",
    ],
    regulatoryPressures: [
      "OfS registration and compliance (HE)",
      "ESFA financial reporting (FE)",
      "REF and TEF outcome requirements",
    ],
    stakeholderPriorities: {
      cfo: ["Income diversification and sustainability", "Pension liability management", "Capital investment prioritisation"],
      cio: ["Digital campus and student experience", "Research data management", "Cyber security for personal data"],
      fpa: ["Student number forecasting", "Course and department profitability", "Research margin analysis"],
    },
  },

  nonprofit_charities: {
    marginCategory: "low_margin",
    typicalMargin: { min: 2, max: 8 }, // Source: NCVO UK Civil Society Almanac, Charity Commission data
    forecastImpactMultiplier: 1.6,
    transformationValueDrivers: [
      "Donor retention and lifetime value optimisation",
      "Programme impact measurement and cost-effectiveness",
      "Grant utilisation and restricted fund management",
    ],
    keyEPMBenefits: [
      "Restricted and unrestricted fund planning",
      "Programme and project budgeting",
      "Donor pipeline and income forecasting",
    ],
    keyERPBenefits: [
      "Fund accounting and restricted income tracking",
      "Donor relationship and gift management",
      "Volunteer and beneficiary management",
    ],
    keyAIBenefits: [
      "Donor propensity and lapse prediction",
      "Impact prediction and outcome modelling",
      "Operational efficiency and cost optimisation",
    ],
    marketTrends: [
      "Cost-of-living crisis impact on donations",
      "Corporate giving and ESG alignment opportunities",
      "Digital fundraising and engagement channels",
    ],
    regulatoryPressures: [
      "Charity Commission reporting and governance",
      "SORP compliance and financial reporting",
      "Fundraising Regulator standards",
    ],
    stakeholderPriorities: {
      cfo: ["Income diversification", "Reserve policy and sustainability", "Cost allocation and overhead recovery"],
      cio: ["Donor and supporter data platform", "Impact measurement systems", "Digital engagement tools"],
      fpa: ["Fundraising ROI and cost ratios", "Programme budget management", "Cash flow and liquidity forecasting"],
    },
  },

  agriculture_agribusiness: {
    marginCategory: "low_margin",
    typicalMargin: { min: 2, max: 8 }, // Source: DEFRA Farm Business Survey, NFU data
    forecastImpactMultiplier: 2.2,
    transformationValueDrivers: [
      "Yield forecasting and crop planning accuracy impacts profitability",
      "Commodity price hedging and risk management",
      "Input cost optimisation for fertiliser and feed",
    ],
    keyEPMBenefits: [
      "Crop and livestock enterprise budgeting",
      "Commodity price scenario modelling",
      "Land and asset valuation",
    ],
    keyERPBenefits: [
      "Farm management and field records",
      "Inventory and input tracking",
      "Traceability and food safety compliance",
    ],
    keyAIBenefits: [
      "Precision agriculture and yield prediction",
      "Weather-based planning and risk assessment",
      "Supply chain demand forecasting",
    ],
    marketTrends: [
      "ELMS transition from Basic Payment Scheme (2025-2027)",
      "Sustainability and carbon markets for agriculture",
      "Agritech adoption and precision farming",
    ],
    regulatoryPressures: [
      "ELMS environmental land management requirements",
      "Water quality and nutrient neutrality",
      "Red Tractor and food safety standards",
    ],
    stakeholderPriorities: {
      cfo: ["Subsidy transition planning", "Cash flow seasonality management", "Asset replacement and succession"],
      cio: ["Precision agriculture technology", "Farm data integration", "Traceability systems"],
      fpa: ["Enterprise profitability analysis", "Commodity exposure and hedging", "Seasonal cash flow modelling"],
    },
  },

  hospitality_leisure: {
    marginCategory: "low_margin",
    typicalMargin: { min: 5, max: 12 }, // Source: UK Hospitality, ONS Accommodation & Food Services
    forecastImpactMultiplier: 2.4,
    transformationValueDrivers: [
      "Revenue management and yield optimisation can improve RevPAR by 10-20%",
      "Labour scheduling accuracy reduces overstaffing costs by 5-10%",
      "F&B margin and inventory management",
    ],
    keyEPMBenefits: [
      "Revenue and occupancy forecasting",
      "Property and unit-level profitability",
      "Labour planning and productivity modelling",
    ],
    keyERPBenefits: [
      "PMS and booking system integration",
      "Food and beverage inventory management",
      "Multi-unit accounting and consolidation",
    ],
    keyAIBenefits: [
      "Dynamic pricing optimisation improves revenue by 5-15%",
      "Demand forecasting for staffing and inventory",
      "Guest experience personalisation and upsell",
    ],
    marketTrends: [
      "Leisure demand growth offsetting business travel decline",
      "Labour shortage and wage inflation pressures",
      "Sustainability and eco-conscious consumer preferences",
    ],
    regulatoryPressures: [
      "Food safety and allergen management (Natasha's Law)",
      "Employment law and flexible working",
      "Business rates and licensing compliance",
    ],
    stakeholderPriorities: {
      cfo: ["RevPAR and occupancy optimisation", "Labour cost as percentage of revenue", "Lease and property costs management"],
      cio: ["PMS and guest experience platform", "Loyalty and CRM integration", "Operational efficiency technology"],
      fpa: ["Property and outlet profitability", "Demand and revenue forecasting", "Menu engineering and margin analysis"],
    },
  },

  basic_materials_mining: {
    marginCategory: "medium_margin",
    typicalMargin: { min: 10, max: 25 }, // Source: Mining industry reports, commodity cycles vary significantly
    forecastImpactMultiplier: 2.0,
    transformationValueDrivers: [
      "Production planning and mine scheduling optimisation",
      "Commodity price sensitivity and hedging strategies",
      "CapEx and exploration investment prioritisation",
    ],
    keyEPMBenefits: [
      "Mine plan and production forecasting",
      "Commodity price scenario modelling",
      "Long-range capital investment planning",
    ],
    keyERPBenefits: [
      "Asset-intensive maintenance management",
      "Supply chain and procurement for remote operations",
      "Health, safety and environmental compliance",
    ],
    keyAIBenefits: [
      "Ore grade prediction and geological modelling",
      "Predictive maintenance for heavy equipment",
      "Safety incident prediction and prevention",
    ],
    marketTrends: [
      "Critical minerals demand for energy transition",
      "ESG and social licence to operate pressures",
      "Automation and remote operations technology",
    ],
    regulatoryPressures: [
      "Environmental permitting and mine closure obligations",
      "Health and safety (Mines Regulations)",
      "Tailings management and dam safety",
    ],
    stakeholderPriorities: {
      cfo: ["Commodity exposure and hedging", "CapEx discipline and project returns", "Closure and rehabilitation provisioning"],
      cio: ["Autonomous and remote operations", "Asset performance management", "Environmental monitoring systems"],
      fpa: ["Mine economics and cut-off grades", "Production and cost forecasting", "Project valuation and NPV modelling"],
    },
  },
};

/**
 * DATA SOURCE NOTES (for audit and accuracy verification):
 * 
 * Margin data sources (2024-2025, forward-looking to 2026):
 * - Manufacturing: IBIS World Manufacturing Reports, ONS Annual Business Survey
 * - Financial Services: Bank of England Financial Stability Reports, FCA sector analysis
 * - Technology: Gartner IT Industry Outlook, SaaS Capital benchmarks
 * - Retail: ONS Retail Sales, British Retail Consortium data
 * - Healthcare: NHS England financial benchmarks, IBIS World
 * - Energy & Utilities: Ofgem financial performance reports, IBIS World
 * - Professional Services: REC, IBIS World Professional Services
 * - Telecommunications & Media: Ofcom Communications Market Report, Deloitte TMT Predictions
 * - Transportation & Logistics: ONS Transport Statistics, IBIS World Logistics
 * - Real Estate & Construction: RICS Construction and Property Monitor, ONS Construction Output
 * - Public Sector: CIPFA Financial Resilience Index, NAO reports
 * - Education: OfS Financial Sustainability, ESFA benchmarking
 * - Non-profit: NCVO UK Civil Society Almanac, Charity Commission
 * - Agriculture: DEFRA Farm Business Survey, NFU reports
 * - Hospitality & Leisure: UK Hospitality data, ONS Accommodation & Food Services
 * - Basic Materials & Mining: Mining industry reports (note: significant commodity cycle variance)
 * 
 * Forecast impact multipliers are derived from:
 * - Deloitte CFO Survey correlations
 * - APQC benchmarking studies
 * - 1QG consulting experience across 200+ implementations
 * 
 * ACCURACY NOTES:
 * - Margins can vary significantly within sectors based on sub-industry, scale, and geography
 * - Public sector margins represent efficiency metrics rather than profit
 * - Mining margins are highly volatile based on commodity cycles
 * - All data should be validated against client-specific circumstances
 */

// ============================================
// TECHNOLOGY MARKET TRENDS
// EPM/ERP Vendor Positioning & Trajectory
// ============================================

export interface VendorMarketPosition {
  vendorId: string;
  vendorName: string;
  gartnerPosition: "Leader" | "Challenger" | "Visionary" | "Niche";
  marketTrend: "rising" | "stable" | "declining";
  trendRationale: string;
  recentDevelopments: string[];
  strategicDirection: string;
  riskIndicators: string[];
  aiCapability: "leading" | "competitive" | "emerging" | "limited";
  cloudMaturity: "cloud_native" | "cloud_first" | "hybrid" | "legacy";
}

export const EPM_VENDOR_MARKET_POSITIONS: VendorMarketPosition[] = [
  {
    vendorId: "anaplan",
    vendorName: "Anaplan",
    gartnerPosition: "Leader",
    marketTrend: "stable",
    trendRationale: "Strong connected planning capabilities but faces increasing competition from Microsoft ecosystem",
    recentDevelopments: [
      "PlanIQ AI/ML capabilities expansion",
      "Thoma Bravo acquisition completed",
      "Focus on enterprise connected planning",
    ],
    strategicDirection: "Deepening connected planning across enterprise functions with AI augmentation",
    riskIndicators: [
      "Premium pricing may limit mid-market adoption",
      "Private equity ownership may prioritise short-term returns",
    ],
    aiCapability: "competitive",
    cloudMaturity: "cloud_native",
  },
  {
    vendorId: "onestream",
    vendorName: "OneStream",
    gartnerPosition: "Leader",
    marketTrend: "rising",
    trendRationale: "Strong growth trajectory with unified CPM platform and financial close integration",
    recentDevelopments: [
      "IPO in 2024 providing growth capital",
      "Sensible ML capabilities for planning",
      "XF Marketplace ecosystem expansion",
    ],
    strategicDirection: "Unified platform for consolidation, planning, and financial close",
    riskIndicators: [
      "Implementation complexity for smaller organisations",
      "Partner ecosystem still maturing outside North America",
    ],
    aiCapability: "competitive",
    cloudMaturity: "cloud_first",
  },
  {
    vendorId: "planful",
    vendorName: "Planful",
    gartnerPosition: "Challenger",
    marketTrend: "rising",
    trendRationale: "Strong mid-market positioning with modern UX and rapid deployment capabilities",
    recentDevelopments: [
      "Predict AI capabilities for forecasting",
      "Structured Planning for operational planning",
      "Focus on mid-market finance teams",
    ],
    strategicDirection: "AI-first planning for mid-market finance transformation",
    riskIndicators: [
      "Limited deep enterprise consolidation capabilities",
      "Smaller partner ecosystem than Tier 1 vendors",
    ],
    aiCapability: "leading",
    cloudMaturity: "cloud_native",
  },
  {
    vendorId: "workday_adaptive",
    vendorName: "Workday Adaptive Planning",
    gartnerPosition: "Leader",
    marketTrend: "stable",
    trendRationale: "Strong Workday ecosystem integration but standalone EPM positioning unclear",
    recentDevelopments: [
      "Deeper Workday Financials integration",
      "AI/ML through Workday Skills Cloud",
      "Focus on workforce planning convergence",
    ],
    strategicDirection: "Unified Workday platform strategy with planning as component",
    riskIndicators: [
      "Best value realised within Workday ecosystem",
      "May lack focus as standalone EPM for non-Workday shops",
    ],
    aiCapability: "competitive",
    cloudMaturity: "cloud_native",
  },
  {
    vendorId: "oracle_epm_cloud",
    vendorName: "Oracle EPM Cloud",
    gartnerPosition: "Leader",
    marketTrend: "stable",
    trendRationale: "Strong enterprise capabilities but modernisation journey ongoing",
    recentDevelopments: [
      "Fusion Analytics integration",
      "EPM Cloud Feature accelerator releases",
      "Narrative Reporting and close automation",
    ],
    strategicDirection: "Integrated Oracle Cloud ERP and EPM platform play",
    riskIndicators: [
      "Complexity for non-Oracle ERP environments",
      "User experience modernisation ongoing",
    ],
    aiCapability: "competitive",
    cloudMaturity: "cloud_first",
  },
  {
    vendorId: "board",
    vendorName: "Board International",
    gartnerPosition: "Visionary",
    marketTrend: "stable",
    trendRationale: "Unified decision-making platform but smaller market presence than leaders",
    recentDevelopments: [
      "BEAM AI for intelligent planning",
      "ESG planning capabilities",
      "Enhanced simulation and optimisation",
    ],
    strategicDirection: "Unified platform for BI, planning, and predictive analytics",
    riskIndicators: [
      "Smaller UK partner ecosystem",
      "Limited brand recognition compared to leaders",
    ],
    aiCapability: "competitive",
    cloudMaturity: "cloud_first",
  },
  {
    vendorId: "sap_sac",
    vendorName: "SAP Analytics Cloud",
    gartnerPosition: "Leader",
    marketTrend: "stable",
    trendRationale: "Strong SAP ecosystem play but standalone planning positioning evolving",
    recentDevelopments: [
      "Joule AI assistant integration",
      "BTP platform convergence",
      "Enhanced S/4HANA integration",
    ],
    strategicDirection: "Unified SAP platform with planning as intelligent enterprise component",
    riskIndicators: [
      "Primary value for SAP S/4HANA customers",
      "Complexity for heterogeneous environments",
    ],
    aiCapability: "competitive",
    cloudMaturity: "cloud_first",
  },
  {
    vendorId: "vena",
    vendorName: "Vena Solutions",
    gartnerPosition: "Challenger",
    marketTrend: "rising",
    trendRationale: "Excel-centric approach resonates with finance teams, strong mid-market traction",
    recentDevelopments: [
      "AI-powered planning copilot (Vena Copilot)",
      "Financial close and consolidation capabilities",
      "Deepening Excel native experience with M365 integration",
    ],
    strategicDirection: "Excel-native complete planning platform with consolidation, close management, and enterprise governance",
    riskIndicators: [
      "Excel dependency may limit advanced modelling",
      "Less suited for complex connected planning scenarios",
    ],
    aiCapability: "competitive",
    cloudMaturity: "cloud_native",
  },
  {
    vendorId: "prophix",
    vendorName: "Prophix",
    gartnerPosition: "Niche",
    marketTrend: "declining",
    trendRationale: "Acquisition integration ongoing, market momentum reduced",
    recentDevelopments: [
      "Pound Sterling Predictive Planning acquisition",
      "Virtual Assistant capabilities",
      "Focus on cash flow planning",
    ],
    strategicDirection: "Mid-market financial planning with cash management focus",
    riskIndicators: [
      "Acquisition integration may distract from product development",
      "Smaller partner ecosystem in UK",
      "Market share declining to more modern platforms",
    ],
    aiCapability: "emerging",
    cloudMaturity: "cloud_first",
  },
  {
    vendorId: "jedox",
    vendorName: "Jedox",
    gartnerPosition: "Niche",
    marketTrend: "declining",
    trendRationale: "On-premises heritage limits cloud momentum, competitive pressure increasing",
    recentDevelopments: [
      "AIssist predictive capabilities",
      "Cloud migration programme",
      "Spreadsheet integration enhancements",
    ],
    strategicDirection: "Hybrid deployment with Excel and cloud planning",
    riskIndicators: [
      "Cloud modernisation behind pure SaaS competitors",
      "Limited partner ecosystem growth",
      "Market positioning unclear in crowded mid-market",
    ],
    aiCapability: "emerging",
    cloudMaturity: "hybrid",
  },
  {
    vendorId: "excel_based",
    vendorName: "Excel/Spreadsheet-based",
    gartnerPosition: "Niche",
    marketTrend: "declining",
    trendRationale: "Increasing risk profile as regulatory, complexity, and scalability demands grow",
    recentDevelopments: [],
    strategicDirection: "Not applicable - tactical tool requiring platform replacement",
    riskIndicators: [
      "Version control and audit trail risks",
      "Single points of failure and key-person dependency",
      "Scalability limits as organisation grows",
      "Regulatory compliance increasingly difficult",
    ],
    aiCapability: "limited",
    cloudMaturity: "legacy",
  },
];

/**
 * Get industry value profile from sector string
 * Maps all 16 registration sectors to their value profiles
 */
export function getIndustryValueProfile(sector: string | undefined): IndustryValueProfile {
  const normalised = (sector || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
  
  // Manufacturing (MFG sector)
  if (normalised.includes("manufactur") || normalised.includes("industrial") || normalised.includes("automotive") || normalised.includes("mfg")) {
    return INDUSTRY_VALUE_PROFILES.manufacturing;
  }
  
  // Financial Services (FIN sector)
  if (normalised.includes("financial") || normalised.includes("banking") || normalised.includes("insurance") || normalised.includes("asset_") || normalised.includes("wealth") || normalised.includes("fintech")) {
    return INDUSTRY_VALUE_PROFILES.financial_services;
  }
  
  // Technology (IT sector) - but exclude "medtech"
  if ((normalised.includes("tech") && !normalised.includes("medtech")) || normalised.includes("software") || normalised.includes("saas") || normalised.includes("it_")) {
    return INDUSTRY_VALUE_PROFILES.technology;
  }
  
  // Consumer & Retail (CNS sector)
  if (normalised.includes("retail") || normalised.includes("consumer") || normalised.includes("fmcg") || normalised.includes("e_commerce") || normalised.includes("apparel")) {
    return INDUSTRY_VALUE_PROFILES.retail;
  }
  
  // Healthcare & Life Sciences (HLTH sector)
  if (normalised.includes("health") || normalised.includes("pharma") || normalised.includes("nhs") || normalised.includes("medtech") || normalised.includes("biotech") || normalised.includes("life_science")) {
    return INDUSTRY_VALUE_PROFILES.healthcare;
  }
  
  // Energy & Utilities (ENE sector)
  if (normalised.includes("energy") || normalised.includes("utility") || normalised.includes("oil") || normalised.includes("gas") || normalised.includes("power") || normalised.includes("renewable")) {
    return INDUSTRY_VALUE_PROFILES.energy_utilities;
  }
  
  // Telecommunications & Media (TELCO sector)
  if (normalised.includes("telecom") || normalised.includes("media") || normalised.includes("entertainment") || normalised.includes("publishing") || normalised.includes("broadcast")) {
    return INDUSTRY_VALUE_PROFILES.telecommunications_media;
  }
  
  // Transportation & Logistics (TRANS sector)
  if (normalised.includes("transport") || normalised.includes("logistics") || normalised.includes("freight") || normalised.includes("warehousing") || normalised.includes("passenger") || normalised.includes("aviation") || normalised.includes("rail")) {
    return INDUSTRY_VALUE_PROFILES.transportation_logistics;
  }
  
  // Real Estate & Construction (REAL sector)
  if (normalised.includes("real_estate") || normalised.includes("construction") || normalised.includes("property") || normalised.includes("reit") || normalised.includes("building")) {
    return INDUSTRY_VALUE_PROFILES.real_estate_construction;
  }
  
  // Public Sector (PUB sector)
  if (normalised.includes("public_sector") || normalised.includes("government") || normalised.includes("central_government") || normalised.includes("local_government") || normalised.includes("agency")) {
    return INDUSTRY_VALUE_PROFILES.public_sector;
  }
  
  // Education (EDU sector)
  if (normalised.includes("education") || normalised.includes("university") || normalised.includes("school") || normalised.includes("higher_education") || normalised.includes("college")) {
    return INDUSTRY_VALUE_PROFILES.education;
  }
  
  // Non-Profit & Charities (NFP sector)
  if (normalised.includes("non_profit") || normalised.includes("nonprofit") || normalised.includes("charity") || normalised.includes("ngo") || normalised.includes("foundation")) {
    return INDUSTRY_VALUE_PROFILES.nonprofit_charities;
  }
  
  // Agriculture & Agribusiness (AGR sector)
  if (normalised.includes("agricult") || normalised.includes("agribusiness") || normalised.includes("farming") || normalised.includes("forestry") || normalised.includes("fishing")) {
    return INDUSTRY_VALUE_PROFILES.agriculture_agribusiness;
  }
  
  // Hospitality & Leisure (HOSP sector)
  if (normalised.includes("hospitality") || normalised.includes("hotel") || normalised.includes("restaurant") || normalised.includes("travel") || normalised.includes("tourism") || normalised.includes("leisure") || normalised.includes("foodservice")) {
    return INDUSTRY_VALUE_PROFILES.hospitality_leisure;
  }
  
  // Basic Materials & Mining (MAT sector)
  if (normalised.includes("mining") || normalised.includes("basic_material") || normalised.includes("building_material") || normalised.includes("chemical") || normalised.includes("metal")) {
    return INDUSTRY_VALUE_PROFILES.basic_materials_mining;
  }
  
  // Professional Services (SERV sector) - default fallback
  if (normalised.includes("professional") || normalised.includes("consulting") || normalised.includes("legal") || normalised.includes("business_service") || normalised.includes("security_service")) {
    return INDUSTRY_VALUE_PROFILES.professional_services;
  }
  
  // Default to professional services for unknown sectors
  return INDUSTRY_VALUE_PROFILES.professional_services;
}

/**
 * Get vendor market position from vendor ID or name
 */
export function getVendorMarketPosition(vendorId: string | undefined): VendorMarketPosition | null {
  if (!vendorId) return null;
  
  const normalised = vendorId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  
  // Match by ID or name patterns
  for (const vendor of EPM_VENDOR_MARKET_POSITIONS) {
    if (vendor.vendorId === normalised) return vendor;
    if (normalised.includes(vendor.vendorId)) return vendor;
    if (normalised.includes(vendor.vendorName.toLowerCase().replace(/[^a-z0-9]/g, "_"))) return vendor;
  }
  
  // Check for spreadsheet/Excel patterns
  if (normalised.includes("excel") || normalised.includes("spreadsheet") || normalised.includes("none")) {
    return EPM_VENDOR_MARKET_POSITIONS.find(v => v.vendorId === "excel_based") || null;
  }
  
  return null;
}

/**
 * Generate industry-specific AI context for prompts
 * Explains why EPM/ERP/AI is valuable for this specific industry
 */
export function generateIndustryValueContext(sector: string | undefined): string {
  const profile = getIndustryValueProfile(sector);
  const complexity = getIndustryComplexity(sector);
  
  const marginLabel = {
    low_margin: "low-margin (typically " + profile.typicalMargin.min + "-" + profile.typicalMargin.max + "%)",
    medium_margin: "medium-margin (typically " + profile.typicalMargin.min + "-" + profile.typicalMargin.max + "%)",
    high_margin: "high-margin (typically " + profile.typicalMargin.min + "-" + profile.typicalMargin.max + "%)",
  }[profile.marginCategory];
  
  const impactContext = profile.forecastImpactMultiplier >= 2.0 
    ? "In this " + marginLabel + " industry, forecast accuracy improvements have AMPLIFIED impact on profitability. Small improvements in planning accuracy can materially affect EBITDA."
    : profile.forecastImpactMultiplier >= 1.5
    ? "In this " + marginLabel + " industry, planning improvements translate to meaningful profitability gains through better cost management and resource allocation."
    : "In this " + marginLabel + " industry, transformation value is driven primarily by speed, insight quality, and regulatory compliance rather than margin improvement.";
  
  return `
INDUSTRY VALUE CONTEXT:
${impactContext}

KEY TRANSFORMATION VALUE DRIVERS FOR THIS SECTOR:
${profile.transformationValueDrivers.map(d => "- " + d).join("\n")}

EPM BENEFITS SPECIFIC TO THIS INDUSTRY:
${profile.keyEPMBenefits.map(b => "- " + b).join("\n")}

AI BENEFITS SPECIFIC TO THIS INDUSTRY:
${profile.keyAIBenefits.map(b => "- " + b).join("\n")}

MARKET TRENDS AFFECTING THIS SECTOR:
${profile.marketTrends.map(t => "- " + t).join("\n")}

REGULATORY PRESSURES:
${profile.regulatoryPressures.map(r => "- " + r).join("\n")}

IMPLEMENTATION CONTEXT:
${complexity.rationale}
Typical challenges: ${complexity.typicalChallenges.slice(0, 2).join("; ")}
`;
}

/**
 * Generate stakeholder-specific value propositions
 */
export function generateStakeholderValueContext(sector: string | undefined, stakeholder: "cfo" | "cio" | "fpa"): string {
  const profile = getIndustryValueProfile(sector);
  const priorities = profile.stakeholderPriorities[stakeholder];
  
  const roleLabel = { cfo: "CFO/Finance Director", cio: "CIO/IT Director", fpa: "FP&A Director" }[stakeholder];
  
  return `
${roleLabel.toUpperCase()} PRIORITIES FOR THIS INDUSTRY:
${priorities.map(p => "- " + p).join("\n")}

These priorities should inform the narrative and recommendations for this stakeholder card.
`;
}

/**
 * Generate technology trend analysis for current vendor/tools
 */
export function generateTechnologyTrendContext(currentVendor: string | undefined): string {
  const vendorPosition = getVendorMarketPosition(currentVendor);
  
  if (!vendorPosition) {
    return `
TECHNOLOGY LANDSCAPE CONTEXT:
Current tooling not identified. Consider assessing existing planning tools to understand modernisation opportunities.
`;
  }
  
  const trendIcon = {
    rising: "POSITIVE TRAJECTORY",
    stable: "STABLE POSITION",
    declining: "CAUTION: DECLINING TRAJECTORY",
  }[vendorPosition.marketTrend];
  
  const riskSection = vendorPosition.riskIndicators.length > 0 
    ? `\nRISK INDICATORS TO MONITOR:\n${vendorPosition.riskIndicators.map(r => "- " + r).join("\n")}`
    : "";
  
  return `
CURRENT TECHNOLOGY ASSESSMENT - ${vendorPosition.vendorName}:

MARKET POSITION: ${vendorPosition.gartnerPosition} (Gartner Magic Quadrant)
TRAJECTORY: ${trendIcon}
Rationale: ${vendorPosition.trendRationale}

RECENT DEVELOPMENTS:
${vendorPosition.recentDevelopments.map(d => "- " + d).join("\n")}

STRATEGIC DIRECTION: ${vendorPosition.strategicDirection}

AI CAPABILITY: ${vendorPosition.aiCapability.toUpperCase()} - ${
  vendorPosition.aiCapability === "leading" ? "Advanced AI/ML capabilities with proven planning use cases" :
  vendorPosition.aiCapability === "competitive" ? "AI capabilities on roadmap or recently released" :
  vendorPosition.aiCapability === "emerging" ? "Early-stage AI development, limited production capabilities" :
  "Minimal AI capabilities, potential strategic gap"
}

CLOUD MATURITY: ${vendorPosition.cloudMaturity.replace(/_/g, " ").toUpperCase()}
${riskSection}

${vendorPosition.marketTrend === "declining" ? `
IMPORTANT: The current platform shows declining market momentum. This should be flagged as a strategic consideration for stakeholders. Consider:
- Vendor's long-term viability and investment roadmap
- Migration path options and timing
- Risk of falling behind on innovation (particularly AI capabilities)
` : ""}
`;
}

/**
 * Get industry complexity profile from sector/industry string
 * Extended keyword matching for comprehensive industry coverage
 */
export function getIndustryComplexity(sector: string | undefined): IndustryComplexityProfile {
  const normalised = (sector || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
  
  // High complexity industries (1.3-1.5x)
  // Manufacturing and related
  if (normalised.includes("manufactur") || normalised.includes("industrial") || normalised.includes("automotive") || 
      normalised.includes("aerospace") || normalised.includes("defence") || normalised.includes("chemicals") ||
      normalised.includes("engineering") || normalised.includes("machinery") || normalised.includes("steel") ||
      normalised.includes("metals") || normalised.includes("construction_materials")) {
    return INDUSTRY_COMPLEXITY.manufacturing;
  }
  
  // Financial Services
  if (normalised.includes("financial") || normalised.includes("banking") || normalised.includes("insurance") || 
      normalised.includes("asset_management") || normalised.includes("investment") || normalised.includes("wealth") ||
      normalised.includes("capital_markets") || normalised.includes("fintech") || normalised.includes("fund") ||
      normalised.includes("credit") || normalised.includes("mortgage") || normalised.includes("pension")) {
    return INDUSTRY_COMPLEXITY.financial_services;
  }
  
  // Healthcare
  if (normalised.includes("health") || normalised.includes("pharma") || normalised.includes("medical") || 
      normalised.includes("nhs") || normalised.includes("hospital") || normalised.includes("biotech") ||
      normalised.includes("life_science") || normalised.includes("clinical") || normalised.includes("diagnostic")) {
    return INDUSTRY_COMPLEXITY.healthcare;
  }
  
  // Energy & Utilities
  if (normalised.includes("energy") || normalised.includes("utility") || normalised.includes("oil") || 
      normalised.includes("gas") || normalised.includes("power") || normalised.includes("renewables") ||
      normalised.includes("electric") || normalised.includes("water") || normalised.includes("mining")) {
    return INDUSTRY_COMPLEXITY.energy_utilities;
  }
  
  // Public Sector / Government (similar complexity to financial services due to regulation)
  if (normalised.includes("public") || normalised.includes("government") || normalised.includes("council") ||
      normalised.includes("local_authority") || normalised.includes("civil_service") || normalised.includes("ministry") ||
      normalised.includes("department") || normalised.includes("agency") || normalised.includes("quango") ||
      normalised.includes("ngo") || normalised.includes("charity") || normalised.includes("not_for_profit") ||
      normalised.includes("education") || normalised.includes("university") || normalised.includes("college")) {
    return INDUSTRY_COMPLEXITY.financial_services; // Regulatory complexity similar to FS
  }
  
  // Transport/Aviation/Logistics (high complexity like manufacturing)
  if (normalised.includes("transport") || normalised.includes("aviation") || normalised.includes("logistics") ||
      normalised.includes("airline") || normalised.includes("shipping") || normalised.includes("rail") ||
      normalised.includes("freight") || normalised.includes("supply_chain") || normalised.includes("distribution")) {
    return INDUSTRY_COMPLEXITY.manufacturing;
  }
  
  // Medium complexity industries (1.1-1.25x)
  // Retail
  if (normalised.includes("retail") || normalised.includes("consumer") || normalised.includes("fmcg") || 
      normalised.includes("cpg") || normalised.includes("wholesale") || normalised.includes("ecommerce") ||
      normalised.includes("fashion") || normalised.includes("grocery") || normalised.includes("supermarket")) {
    return INDUSTRY_COMPLEXITY.retail;
  }
  
  // Professional Services
  if (normalised.includes("professional") || normalised.includes("consulting") || normalised.includes("legal") || 
      normalised.includes("accounting") || normalised.includes("audit") || normalised.includes("advisory") ||
      normalised.includes("law_firm") || normalised.includes("recruitment") || normalised.includes("staffing")) {
    return INDUSTRY_COMPLEXITY.professional_services;
  }
  
  // Media & Entertainment
  if (normalised.includes("media") || normalised.includes("entertainment") || normalised.includes("broadcast") || 
      normalised.includes("publishing") || normalised.includes("gaming") || normalised.includes("advertising") ||
      normalised.includes("creative") || normalised.includes("film") || normalised.includes("television") ||
      normalised.includes("music") || normalised.includes("sports")) {
    return INDUSTRY_COMPLEXITY.media_entertainment;
  }
  
  // Lower complexity industries (1.0-1.1x)
  // Technology
  if (normalised.includes("tech") || normalised.includes("software") || normalised.includes("saas") || 
      normalised.includes("it_services") || normalised.includes("cloud") || normalised.includes("data") ||
      normalised.includes("digital") || normalised.includes("platform") || normalised.includes("startup") ||
      normalised.includes("telecom") || normalised.includes("communications")) {
    return INDUSTRY_COMPLEXITY.technology;
  }
  
  // Real Estate
  if (normalised.includes("real_estate") || normalised.includes("property") || normalised.includes("reit") ||
      normalised.includes("housing") || normalised.includes("development") || normalised.includes("facilities")) {
    return INDUSTRY_COMPLEXITY.real_estate;
  }
  
  // Hospitality/Leisure (simpler structures)
  if (normalised.includes("hospitality") || normalised.includes("hotel") || normalised.includes("leisure") ||
      normalised.includes("travel") || normalised.includes("tourism") || normalised.includes("restaurant") ||
      normalised.includes("food_service")) {
    return INDUSTRY_COMPLEXITY.professional_services; // Simpler planning needs
  }
  
  // Default to technology baseline (1.0x multiplier) for unrecognised sectors
  return INDUSTRY_COMPLEXITY.technology;
}

export function applyTimelineFloors(rawMonths: number, complexity: string): number {
  const normalised = complexity.toLowerCase();
  
  if (normalised.includes("full") || normalised.includes("enterprise")) {
    return Math.max(rawMonths, TIMELINE_FLOORS.fullEPM.minMonths);
  }
  if (normalised.includes("integration") || normalised.includes("build")) {
    return Math.max(rawMonths, TIMELINE_FLOORS.integration.minMonths);
  }
  if (normalised.includes("multi") || normalised.includes("consolidation")) {
    return Math.max(rawMonths, TIMELINE_FLOORS.multiEntity.minMonths);
  }
  
  return Math.max(rawMonths, TIMELINE_FLOORS.coreImplementation.minMonths);
}

// Size band mapping for vendor benchmarks
type SizeBandKey = "smb" | "mid_market" | "enterprise" | "large_enterprise";

/**
 * Map revenue/size band strings to vendor benchmark keys
 * Handles various formats: "1b_5b", "over_5b", "250m_1b", "large_enterprise", etc.
 * 
 * Revenue bands (based on vendor-benchmarks.ts):
 * - SMB: £50m-250m revenue
 * - Mid-market: £250m-1bn revenue
 * - Enterprise: £1bn-5bn revenue (or £1bn+ without upper bound)
 * - Large Enterprise: £5bn+ revenue
 */
function mapSizeBandToKey(sizeBand: string | undefined): SizeBandKey {
  const normalised = (sizeBand || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  
  // Direct keyword matches take priority
  if (normalised.includes("large_enterprise")) return "large_enterprise";
  if (normalised === "enterprise") return "enterprise";
  if (normalised.includes("mid_market") || normalised === "mid") return "mid_market";
  if (normalised === "smb") return "smb";
  
  // Extract all billion values (e.g., "1b", "5b", "10b")
  const billionMatches = normalised.match(/(\d+)b/g);
  const billionValues = billionMatches?.map(m => parseInt(m.replace("b", ""), 10)) || [];
  
  // Extract all million values (e.g., "250m", "500m", "1000m")
  const millionMatches = normalised.match(/(\d+)m/g);
  const millionValues = millionMatches?.map(m => parseInt(m.replace("m", ""), 10)) || [];
  
  // Handle patterns like "1_5b" where lower bound has no unit suffix
  // Extract standalone numbers before "b" suffix (e.g., "1" from "1_5b")
  const standaloneNumMatch = normalised.match(/^(\d+)_\d+b$/);
  if (standaloneNumMatch) {
    const lowerBound = parseInt(standaloneNumMatch[1], 10);
    // If lower bound is 1-4 and upper is billion, it's likely enterprise
    if (lowerBound >= 1 && lowerBound <= 4 && billionValues.length > 0) {
      const maxBillion = Math.max(...billionValues);
      if (maxBillion >= 5) return "enterprise";  // "1_5b" = enterprise
      if (maxBillion >= 1) return "enterprise";  // "1_2b" = enterprise
    }
  }
  
  // Check for "over" or "plus" patterns indicating open-ended upper bound
  const hasOverPrefix = /over_|plus|_plus/.test(normalised);
  
  // Convert large million values to billions for comparison (1000m = 1b)
  const millionsAsBillions = millionValues.filter(m => m >= 1000).map(m => m / 1000);
  const allBillionEquivalents = [...billionValues, ...millionsAsBillions];
  
  // IMPORTANT: Check for hybrid ranges first (e.g., "250m_1b" = mid-market)
  // These have both million and billion values, where the billion is the upper bound
  if (millionValues.length > 0 && billionValues.length > 0) {
    // If it ends with _1b (upper bound is 1bn), it's mid-market
    if (/_1b$/.test(normalised)) return "mid_market";
    
    // If it ends with _5b and starts with billion (like "1b_5b"), it's enterprise
    if (/_5b$/.test(normalised) && billionValues.length >= 2) {
      const minBillion = Math.min(...billionValues);
      if (minBillion >= 1 && minBillion < 5) return "enterprise";
    }
  }
  
  // Large Enterprise: £5bn+ 
  // Patterns: "over_5b", "5b_plus", "5b", "5b_10b", "6b", "10b", "5000m", etc.
  if (allBillionEquivalents.length > 0) {
    const maxBillion = Math.max(...allBillionEquivalents);
    const minBillion = Math.min(...allBillionEquivalents);
    
    // If min billion value is >= 5, it's large enterprise
    // (This handles "5b", "5b_10b", "10b", "5000m" but NOT "1b_5b" which has min=1)
    if (minBillion >= 5) return "large_enterprise";
    if (hasOverPrefix && maxBillion >= 5) return "large_enterprise";
    
    // Enterprise: £1bn-5bn
    // Range starts at 1-4b, or "over_1b", "1b_plus", "1000m", "1200m" etc.
    if (minBillion >= 1 && minBillion < 5) return "enterprise";
    if (hasOverPrefix && minBillion >= 1) return "enterprise";
  }
  
  // Mid-market: £250m-1bn  
  // Patterns: "250m", "500m", "250_500m", "750m_plus", "over_750m"
  if (millionValues.length > 0) {
    const maxMillion = Math.max(...millionValues);
    
    // If million values are >= 250 (and < 1000 since 1000m+ handled above)
    if (maxMillion >= 250 && maxMillion < 1000) return "mid_market";
    
    // "over" or "plus" prefix with millions >= 250 is mid-market
    if (hasOverPrefix && maxMillion >= 250 && maxMillion < 1000) return "mid_market";
  }
  
  // SMB: < £250m (default for million-scale values under 250m)
  if (millionValues.length > 0) {
    return "smb";
  }
  
  // Default to SMB for unrecognised patterns
  return "smb";
}

/**
 * Get aggregated implementation timeline from vendor benchmarks
 * Returns the median timeline across all vendors for a given size band
 * Applies realistic floor durations and industry complexity factors
 * 
 * @param sizeBand - Revenue band string (e.g., "1b_5b", "250m_1b")
 * @param sector - Industry/sector string for complexity adjustment (e.g., "Manufacturing", "Technology")
 */
export function getAggregatedTimeline(sizeBand?: string, sector?: string): { 
  min: number; 
  max: number; 
  typical: number;
  industryMultiplier: number;
  industryRationale: string;
} {
  const sizeBandKey = mapSizeBandToKey(sizeBand);
  const industryProfile = getIndustryComplexity(sector);
  
  const timelines = VENDOR_BENCHMARKS
    .map(v => v.implementationTimeline[sizeBandKey])
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  
  if (timelines.length === 0) {
    const baseMin = TIMELINE_FLOORS.coreImplementation.minMonths;
    const baseMax = TIMELINE_FLOORS.fullEPM.minMonths;
    return {
      min: Math.round(baseMin * industryProfile.multiplier),
      max: Math.round(baseMax * industryProfile.multiplier),
      typical: Math.round(baseMin * industryProfile.multiplier),
      industryMultiplier: industryProfile.multiplier,
      industryRationale: industryProfile.rationale,
    };
  }
  
  const mins = timelines.map(t => t.min ?? 0);
  const maxs = timelines.map(t => t.max ?? 0);
  const typicals = timelines.map(t => t.typical ?? 0);
  
  const rawMin = Math.round(mins.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / mins.length);
  const rawMax = Math.round(maxs.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / maxs.length);
  const rawTypical = Math.round(typicals.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / typicals.length);
  
  // Apply industry complexity multiplier
  const adjustedMin = Math.round(rawMin * industryProfile.multiplier);
  const adjustedMax = Math.round(rawMax * industryProfile.multiplier);
  const adjustedTypical = Math.round(rawTypical * industryProfile.multiplier);
  
  return {
    min: Math.max(adjustedMin, TIMELINE_FLOORS.coreImplementation.minMonths),
    max: Math.max(adjustedMax, TIMELINE_FLOORS.fullEPM.minMonths),
    typical: Math.max(adjustedTypical, TIMELINE_FLOORS.coreImplementation.minMonths),
    industryMultiplier: industryProfile.multiplier,
    industryRationale: industryProfile.rationale,
  };
}

/**
 * Get vendor-specific implementation timeline
 */
export function getVendorTimeline(vendorId: string, sizeBand?: string): CostRange | null {
  const vendor = VENDOR_BENCHMARKS.find(v => v.id === vendorId);
  if (!vendor) return null;
  
  const sizeBandKey = mapSizeBandToKey(sizeBand);
  return vendor.implementationTimeline[sizeBandKey];
}

/**
 * Generate dynamic implementation phases based on vendor benchmarks and client context
 * Phase durations scale proportionally to the overall timeline
 * Activities are tailored based on client pain points and dimension gaps
 * Industry complexity adjusts phase proportions (e.g., manufacturing has longer integration phases)
 * 
 * @param sizeBand - Revenue band string (e.g., "1b_5b", "250m_1b")
 * @param clientProfile - Client discovery profile with pain points and ambitions
 * @param dimensionScores - Dimension scores to identify gaps
 * @param sector - Industry/sector string for complexity adjustment
 */
export function generateImplementationPhases(
  sizeBand?: string,
  clientProfile?: ClientDiscoveryProfile,
  dimensionScores?: Record<string, number>,
  sector?: string
): TimelinePhase[] {
  const timeline = getAggregatedTimeline(sizeBand, sector);
  const industryProfile = getIndustryComplexity(sector);
  const totalMonths = timeline.typical;
  
  // Apply industry-specific weights for phase proportions
  const foundationWeight = 0.15 * industryProfile.phaseAdjustments.foundation;
  const buildWeight = 0.35 * industryProfile.phaseAdjustments.build;
  const integrationWeight = 0.35 * industryProfile.phaseAdjustments.integration;
  const optimisationWeight = 0.15 * industryProfile.phaseAdjustments.optimisation;
  const totalWeight = foundationWeight + buildWeight + integrationWeight + optimisationWeight;
  
  // Calculate proportional durations
  let foundationDuration = Math.round(totalMonths * (foundationWeight / totalWeight));
  let buildDuration = Math.round(totalMonths * (buildWeight / totalWeight));
  let integrationDuration = Math.round(totalMonths * (integrationWeight / totalWeight));
  let optimisationDuration = totalMonths - foundationDuration - buildDuration - integrationDuration;
  
  // Enforce minimum durations - realistic enterprise implementation requires adequate time
  // Design & Build cannot be rushed - 3 months minimum even for short timelines
  // Configure & Integrate also requires adequate time for proper testing and training
  const isShortTimeline = totalMonths <= 12;
  const foundationMin = Math.max(2, Math.min(3, Math.floor(totalMonths * 0.15)));
  const buildMin = isShortTimeline ? 3 : Math.min(5, TIMELINE_FLOORS.integration.minMonths + 1);
  const intMin = isShortTimeline ? 3 : Math.min(5, TIMELINE_FLOORS.integration.minMonths + 1);
  const optMin = Math.max(2, Math.min(3, Math.floor(totalMonths * 0.12)));
  
  // Apply minimums, ensuring we don't exceed total
  if (foundationDuration < foundationMin) foundationDuration = foundationMin;
  if (buildDuration < buildMin) buildDuration = buildMin;
  if (integrationDuration < intMin) integrationDuration = intMin;
  if (optimisationDuration < optMin) optimisationDuration = optMin;
  
  // Recalculate and normalise to ensure sum equals totalMonths
  let sum = foundationDuration + buildDuration + integrationDuration + optimisationDuration;
  if (sum !== totalMonths) {
    const diff = totalMonths - sum;
    // Add/subtract from build or integration (largest phases)
    if (diff > 0) {
      buildDuration += Math.ceil(diff / 2);
      integrationDuration += Math.floor(diff / 2);
    } else {
      const reduction = Math.abs(diff);
      const buildReduce = Math.min(buildDuration - buildMin, Math.ceil(reduction / 2));
      buildDuration -= buildReduce;
      integrationDuration -= Math.min(integrationDuration - intMin, reduction - buildReduce);
    }
    // Final adjustment on optimisation
    sum = foundationDuration + buildDuration + integrationDuration;
    optimisationDuration = Math.max(1, totalMonths - sum);
  }
  
  const foundationEnd = foundationDuration;
  const coreEnd = foundationEnd + buildDuration;
  const strategicEnd = coreEnd + integrationDuration;
  
  const painPoints = clientProfile?.painPoints || [];
  const gaps = dimensionScores 
    ? Object.entries(dimensionScores).filter(([_, score]) => score < 55).map(([dim]) => dim)
    : [];
  
  const foundationActivities = buildDynamicActivities("foundation", painPoints, gaps);
  const coreActivities = buildDynamicActivities("core", painPoints, gaps);
  const strategicActivities = buildDynamicActivities("strategic", painPoints, gaps);
  const optimisationActivities = buildDynamicActivities("optimisation", painPoints, gaps);
  
  return [
    {
      id: "foundation",
      name: "Mobilise & Foundation",
      monthRange: { start: 0, end: foundationEnd },
      typicalBenefitPercentage: 5,
      keyActivities: foundationActivities,
      criticalDependencies: [
        "Executive sponsorship confirmed",
        "Core team assembled and onboarded",
        "Governance framework approved",
      ],
    },
    {
      id: "core_engine",
      name: "Design & Build",
      monthRange: { start: foundationEnd, end: coreEnd },
      typicalBenefitPercentage: 35,
      keyActivities: coreActivities,
      criticalDependencies: [
        "Data quality baseline established (>90%)",
        "Technical architecture signed off",
        "Entity coordination complete",
      ],
    },
    {
      id: "strategic",
      name: "Configure & Integrate",
      monthRange: { start: coreEnd, end: strategicEnd },
      typicalBenefitPercentage: 40,
      keyActivities: strategicActivities,
      criticalDependencies: [
        "User acceptance testing complete",
        "Integration points validated",
        "Training programme delivered",
      ],
    },
    {
      id: "optimisation",
      name: "Stabilise & Optimise",
      monthRange: { start: strategicEnd, end: totalMonths },
      typicalBenefitPercentage: 20,
      keyActivities: optimisationActivities,
      criticalDependencies: [
        "Hypercare period complete",
        "User adoption >80%",
        "Continuous improvement embedded",
      ],
    },
  ];
}

function buildDynamicActivities(
  phase: "foundation" | "core" | "strategic" | "optimisation",
  painPoints: string[],
  gaps: string[]
): string[] {
  const activities: string[] = [];
  
  switch (phase) {
    case "foundation":
      activities.push("Programme governance and stakeholder alignment");
      if (gaps.includes("data_analytics") || painPoints.includes("poor_data_quality")) {
        activities.push("Data quality assessment and remediation planning");
      }
      if (painPoints.includes("data_silos") || painPoints.includes("outdated_systems")) {
        activities.push("Current-state architecture review and target-state design");
      }
      activities.push("Quick wins identification and business case validation");
      if (gaps.includes("organisation_people")) {
        activities.push("Change readiness assessment and communication planning");
      }
      break;
      
    case "core":
      if (gaps.includes("consolidation_close") || painPoints.includes("slow_close")) {
        activities.push("Close process redesign and automation configuration");
      }
      if (painPoints.includes("manual_reporting") || gaps.includes("management_reporting")) {
        activities.push("Reporting template design and self-service configuration");
      }
      activities.push("Core system build and unit testing");
      if (gaps.includes("technology_systems")) {
        activities.push("Integration architecture implementation");
      }
      activities.push("Entity and user onboarding preparation");
      break;
      
    case "strategic":
      if (gaps.includes("financial_planning_analysis") || painPoints.includes("forecasting_challenges")) {
        activities.push("Planning model configuration and driver-based forecasting");
      }
      activities.push("System integration testing and data migration");
      activities.push("User acceptance testing and training delivery");
      if (painPoints.includes("scenario_analysis")) {
        activities.push("Scenario and what-if modelling capability deployment");
      }
      if (gaps.includes("ai_machine_learning")) {
        activities.push("AI and advanced analytics capability enablement");
      }
      break;
      
    case "optimisation":
      activities.push("Hypercare support and issue resolution");
      activities.push("Performance monitoring and process refinement");
      if (gaps.includes("organisation_people")) {
        activities.push("Business partnering capability development");
      }
      activities.push("Centre of Excellence establishment");
      activities.push("Benefits realisation tracking and continuous improvement");
      break;
  }
  
  return activities.slice(0, 5);
}

// Default phases for mid-market (most common)
export const IMPLEMENTATION_PHASES: TimelinePhase[] = generateImplementationPhases("mid_market");

/**
 * Get aggregated implementation costs from vendor benchmarks
 * Returns the range of costs across all vendors for a given size band
 */
export function getAggregatedImplementationCosts(sizeBand?: string): { 
  min: number; 
  max: number; 
  typical: number;
  vendorRange: { minVendor: string; maxVendor: string };
} {
  const sizeBandKey = mapSizeBandToKey(sizeBand);
  
  const costs = VENDOR_BENCHMARKS
    .filter(v => v.implementationCosts[sizeBandKey])
    .map(v => ({
      vendor: v.name,
      costs: v.implementationCosts[sizeBandKey],
    }));
  
  if (costs.length === 0) {
    return {
      min: 100,
      max: 500,
      typical: 250,
      vendorRange: { minVendor: "Unknown", maxVendor: "Unknown" },
    };
  }
  
  const sorted = costs.sort((a, b) => (a.costs?.typical ?? 0) - (b.costs?.typical ?? 0));
  
  return {
    min: Math.min(...costs.map(c => c.costs?.min ?? 0)),
    max: Math.max(...costs.map(c => c.costs?.max ?? 0)),
    typical: Math.round(costs.reduce((sum, c) => sum + (c.costs?.typical ?? 0), 0) / costs.length),
    vendorRange: {
      minVendor: sorted[0]?.vendor ?? "Unknown",
      maxVendor: sorted[sorted.length - 1]?.vendor ?? "Unknown",
    },
  };
}

/**
 * Get tier-specific vendor recommendations based on assessment profile
 */
export function getVendorRecommendationsByTier(category: "tier1" | "tier2" | "tier3"): VendorBenchmark[] {
  return VENDOR_BENCHMARKS.filter(v => v.category === category);
}

/**
 * Format vendor benchmark data for AI prompt context
 */
export function formatVendorContextForAI(sizeBand?: string): string {
  const timeline = getAggregatedTimeline(sizeBand);
  const costs = getAggregatedImplementationCosts(sizeBand);
  
  const tier1Vendors = getVendorRecommendationsByTier("tier1");
  const tier2Vendors = getVendorRecommendationsByTier("tier2");
  
  return `
COMPARISON TOOL DATA (dynamically sourced):
- Organisation Size Band: ${sizeBand || "mid_market"}
- Implementation Timeline Range: ${timeline.min}-${timeline.max} months (typical: ${timeline.typical} months)
- Implementation Cost Range: £${costs.min}k-£${costs.max}k (typical: £${costs.typical}k)
- Tier 1 EPM Vendors: ${tier1Vendors.map(v => v.name).join(", ")}
- Tier 2 EPM Vendors: ${tier2Vendors.map(v => v.name).join(", ")}
- Lowest Cost Vendor: ${costs.vendorRange.minVendor}
- Highest Cost Vendor: ${costs.vendorRange.maxVendor}

Use these exact figures when referencing timelines and costs. Do not invent figures.
`;
}

// ============================================
// AI PROMPT ENHANCEMENT INSTRUCTIONS
// ============================================

/**
 * Generate evidence-based guidelines dynamically with timeline data from comparison tool
 * Uses CONFIDENCE_LEVELS metadata to emit properly tagged guidance
 * Updated for Big 4 consulting-grade natural language presentation
 */
export function generateEvidenceBasedGuidelines(sizeBand?: string): string {
  const timeline = getAggregatedTimeline(sizeBand);
  const phases = generateImplementationPhases(sizeBand);
  
  const phaseDescriptions = phases.map(p => 
    `${p.monthRange.start}-${p.monthRange.end}mo ${p.name}`
  ).join(", ");
  
  const confidenceInstructions = Object.values(CONFIDENCE_LEVELS).map(level => 
    `   - "${level.consultingLabel}" (${level.threshold}%+): ${level.consultingDescription}`
  ).join('\n');
  
  return `
CRITICAL EVIDENCE-BASED ANALYSIS RULES (Big 4 Consulting Standard):

1. CONFIDENCE PRESENTATION - Use natural consulting language, NOT technical tags:
${confidenceInstructions}

   EXAMPLES OF PROPER PRESENTATION:
   - "Validated Evidence: You reported a current close cycle of 15 days"
   - "Advisory Judgement: Based on your responses, manual reconciliation appears to be the primary bottleneck"
   - "Indicative Outlook: Based on peer organisations, implementation typically takes ${timeline.min}-${timeline.max} months"
   - "Pending Validation: Specific FTE savings to be explored in our discovery engagement"

   DO NOT use technical tags like [FACT], [HYPOTHESIS], [ESTIMATE] in client-facing content.
   Use the natural language confidence labels above.

2. VALUE CLAIMS PRESENTATION:
   - "Validated Evidence": Only for figures directly from user input
   - "Indicative Outlook": Use ranges with peer context: "Organisations of similar scale typically achieve..."
   - "Pending Validation": Strategic value to be "explored and validated in discovery"
   - All quantified benefits must cite their evidence basis

3. TIMELINE ACCURACY (grounded in EPM Comparison Tool benchmarks):
   - Implementation timeline for this organisation size: ${timeline.min}-${timeline.max} months (typical: ${timeline.typical} months)
   - MINIMUM FLOORS: Integration phases never <4 months, core implementation never <6 months, full EPM never <9 months
   - Reference standard implementation phases: ${phaseDescriptions}
   - Include contingency range: "±${Math.round(timeline.typical * 0.15)} months depending on specific complexity factors"
   - These timelines are benchmarked against ${VENDOR_BENCHMARKS.length} leading EPM vendors

4. VALUE JOURNEY ALIGNMENT:
   - Map findings directly to client's stated pain points and ambitions
   - Reference specific registration responses when making recommendations
   - Build transformation narrative around their priorities, not generic best practices
   - Use "Based on the challenges you've identified..." framing

5. CROSS-DIMENSION PATTERN ANALYSIS:
   - Identify patterns between dimensions (e.g., strong data + weak consolidation = process issue)
   - Present pattern inferences as "Advisory Judgement" with reasoning
   - Link pattern implications to specific, actionable recommendations

6. COMPARABLE ORGANISATIONS:
   - Frame as "Indicative Outlook" with peer context
   - Use sector-specific language: "Similar organisations in [sector] have achieved..."
   - Qualify with organisation count where relevant
`;
}

// Default guidelines for mid-market
export const EVIDENCE_BASED_GUIDELINES = generateEvidenceBasedGuidelines("mid_market");

export const STAKEHOLDER_CONTEXT = {
  cfo: {
    role: "Chief Financial Officer",
    focusAreas: ["Strategic value", "ROI timeline", "Risk mitigation", "Board-level messaging"],
    metricsPriority: ["FPV total", "Payback period", "Strategic capability uplift"],
    tone: "Strategic, business outcome focused, investment-grade rigour",
  },
  fpa_director: {
    role: "FP&A Director",
    focusAreas: ["Planning efficiency", "Forecast accuracy", "Process automation", "Team productivity"],
    metricsPriority: ["Planning cycle reduction", "Forecast accuracy improvement", "FTE efficiency"],
    tone: "Practical, operationally focused, quantified improvements",
  },
  it_director: {
    role: "IT Director",
    focusAreas: ["Technology architecture", "Integration complexity", "Data governance", "Security"],
    metricsPriority: ["System consolidation", "Integration points", "Data quality metrics"],
    tone: "Technical credibility, architecture-aware, integration-focused",
  },
} as const;

// ============================================
// PATTERN DETECTION FUNCTIONS
// ============================================

export function detectSemanticPatterns(
  dimensionScores: Record<string, number>,
  industryBenchmarks?: Record<string, number>
): SemanticPattern[] {
  const detectedPatterns: SemanticPattern[] = [];
  
  for (const pattern of SEMANTIC_PATTERNS) {
    let allConditionsMet = true;
    
    for (const condition of pattern.conditions) {
      const score = dimensionScores[condition.dimension];
      const benchmark = industryBenchmarks?.[condition.dimension] || 50;
      
      if (score === undefined) {
        allConditionsMet = false;
        break;
      }
      
      switch (condition.operator) {
        case "high":
          if (score < (condition.threshold || 60)) allConditionsMet = false;
          break;
        case "low":
          if (score >= (condition.threshold || 50)) allConditionsMet = false;
          break;
        case "above_peer":
          if (score <= benchmark) allConditionsMet = false;
          break;
        case "below_peer":
          if (score >= benchmark) allConditionsMet = false;
          break;
      }
    }
    
    if (allConditionsMet) {
      detectedPatterns.push(pattern);
    }
  }
  
  return detectedPatterns;
}

export function tagConfidence(
  content: string,
  source: ConfidenceTaggedInsight["source"],
  customConfidence?: number
): ConfidenceTaggedInsight {
  let confidence: ConfidenceLevel;
  let confidencePercentage: number;
  
  switch (source) {
    case "user_direct_input":
      confidence = "FACT";
      confidencePercentage = customConfidence || 95;
      break;
    case "inferred_from_pattern":
      confidence = "HYPOTHESIS";
      confidencePercentage = customConfidence || 80;
      break;
    case "corpus_pattern":
      confidence = "ESTIMATE";
      confidencePercentage = customConfidence || 65;
      break;
    case "industry_benchmark":
      confidence = "ESTIMATE";
      confidencePercentage = customConfidence || 60;
      break;
    default:
      confidence = "REQUIRES_DISCOVERY";
      confidencePercentage = 0;
  }
  
  return {
    content,
    confidence,
    confidencePercentage,
    source,
  };
}

/**
 * Format a confidence-tagged insight for display
 * Uses natural consulting language instead of technical tags
 */
export function formatConfidenceTag(insight: ConfidenceTaggedInsight): string {
  const level = CONFIDENCE_LEVELS[insight.confidence];
  // Use natural consulting language instead of technical tags
  return `${level.consultingLabel}: ${level.prefix} ${insight.content}`;
}

// ============================================
// DYNAMIC ROI ESTIMATION
// Calculates potential savings based on company data
// and assessment scores for narrative generation
// ============================================

export interface EstimatedRoiMetrics {
  potentialAnnualSavings: number; // In £ thousands
  estimatedPaybackMonths: number;
  efficiencyGainPercent: number;
  confidenceLevel: "low" | "medium" | "high";
  calculationBasis: string;
}

/**
 * Revenue band mappings to typical annual revenue (in £k)
 * Used for estimating savings when exact revenue not provided
 */
const REVENUE_BAND_ESTIMATES: Record<string, number> = {
  // Pre-defined bands from registration form
  "under_50m": 30000,      // £30M midpoint
  "50m_250m": 150000,      // £150M midpoint
  "250m_1b": 500000,       // £500M midpoint
  "1b_5b": 2500000,        // £2.5B midpoint
  "over_5b": 7500000,      // £7.5B estimate
  // Alternative naming conventions
  "small": 50000,          // £50M
  "mid_market": 200000,    // £200M
  "large": 1000000,        // £1B
  "enterprise": 5000000,   // £5B
};

/**
 * Finance function cost as percentage of revenue by sector
 * Source: APQC benchmarking data
 */
const SECTOR_FINANCE_COST_BENCHMARKS: Record<string, { median: number; topQuartile: number }> = {
  financial_services: { median: 1.8, topQuartile: 1.2 },
  technology: { median: 1.5, topQuartile: 1.0 },
  manufacturing: { median: 2.2, topQuartile: 1.5 },
  retail: { median: 1.8, topQuartile: 1.2 },
  healthcare: { median: 2.5, topQuartile: 1.8 },
  energy_utilities: { median: 1.6, topQuartile: 1.1 },
  professional_services: { median: 2.0, topQuartile: 1.4 },
  telecommunications_media: { median: 1.7, topQuartile: 1.2 },
  transportation_logistics: { median: 2.3, topQuartile: 1.6 },
  real_estate_construction: { median: 2.0, topQuartile: 1.4 },
  public_sector: { median: 2.8, topQuartile: 2.0 },
  education: { median: 3.0, topQuartile: 2.2 },
  nonprofit_charities: { median: 3.5, topQuartile: 2.5 },
  agriculture_agribusiness: { median: 2.5, topQuartile: 1.8 },
  hospitality_leisure: { median: 2.2, topQuartile: 1.5 },
  basic_materials_mining: { median: 1.8, topQuartile: 1.2 },
};

/**
 * Efficiency improvement potential by maturity level
 * Based on 1QG consulting experience and industry benchmarks
 */
const MATURITY_IMPROVEMENT_POTENTIAL: Record<string, { minPercent: number; maxPercent: number }> = {
  foundational: { minPercent: 20, maxPercent: 35 },  // Score 0-29: High improvement potential
  developing: { minPercent: 15, maxPercent: 25 },    // Score 30-49: Good improvement potential
  established: { minPercent: 10, maxPercent: 18 },   // Score 50-74: Moderate improvement
  advanced: { minPercent: 5, maxPercent: 12 },       // Score 75-100: Incremental gains
};

/**
 * Estimate potential annual savings based on company profile and assessment score
 * 
 * Calculation methodology:
 * 1. Determine annual revenue (from company data or size band estimate)
 * 2. Calculate finance function cost (revenue × finance cost %)
 * 3. Determine improvement potential based on maturity level
 * 4. Apply sector-specific adjustments
 * 
 * @param company - Company profile with revenue and sector data
 * @param overallScore - Assessment overall maturity score (0-100)
 * @param sizeBand - Revenue size band if exact revenue not available
 * @returns Estimated ROI metrics for narrative generation
 */
export function estimatePotentialSavings(
  company: { revenue?: number | null; sector?: string | null; financeCostPercentage?: number | null } | null | undefined,
  overallScore: number,
  sizeBand?: string
): EstimatedRoiMetrics {
  // Step 1: Determine annual revenue
  let annualRevenue: number;
  let confidenceLevel: "low" | "medium" | "high";
  let calculationBasis: string;
  
  if (company?.revenue && company.revenue > 0) {
    // Exact revenue provided - high confidence
    annualRevenue = company.revenue;
    confidenceLevel = "high";
    calculationBasis = "Based on reported annual revenue";
  } else if (sizeBand) {
    // Estimate from size band - medium confidence
    const normalizedBand = sizeBand.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    annualRevenue = REVENUE_BAND_ESTIMATES[normalizedBand] || REVENUE_BAND_ESTIMATES["mid_market"];
    confidenceLevel = "medium";
    calculationBasis = `Estimated from ${sizeBand} revenue band`;
  } else {
    // Default to mid-market estimate - low confidence
    annualRevenue = REVENUE_BAND_ESTIMATES["mid_market"];
    confidenceLevel = "low";
    calculationBasis = "Estimated for mid-market organisation";
  }
  
  // Step 2: Determine finance function cost percentage
  const sector = company?.sector?.toLowerCase().replace(/[^a-z0-9_]/g, "_") || "professional_services";
  let financeCostPercent: number;
  
  if (company?.financeCostPercentage && company.financeCostPercentage > 0) {
    financeCostPercent = company.financeCostPercentage;
  } else {
    // Look up sector benchmark
    const sectorBenchmark = getSectorFinanceCostBenchmark(sector);
    financeCostPercent = sectorBenchmark.median;
  }
  
  // Step 3: Calculate finance function total cost
  const financeFunctionCost = annualRevenue * (financeCostPercent / 100);
  
  // Step 4: Determine maturity level and improvement potential
  let maturityLevel: string;
  if (overallScore >= 75) maturityLevel = "advanced";
  else if (overallScore >= 50) maturityLevel = "established";
  else if (overallScore >= 30) maturityLevel = "developing";
  else maturityLevel = "foundational";
  
  const improvementRange = MATURITY_IMPROVEMENT_POTENTIAL[maturityLevel];
  
  // Use midpoint of improvement range
  const efficiencyGainPercent = (improvementRange.minPercent + improvementRange.maxPercent) / 2;
  
  // Step 5: Calculate potential annual savings
  const potentialAnnualSavings = Math.round(financeFunctionCost * (efficiencyGainPercent / 100));
  
  // Step 6: Estimate payback period (typical EPM implementation 18-24 months ROI)
  // Implementation cost roughly 1.5-2.5x annual savings for mid-sized companies
  const implementationMultiplier = confidenceLevel === "high" ? 1.8 : 2.0;
  const estimatedPaybackMonths = Math.round(12 * implementationMultiplier);
  
  return {
    potentialAnnualSavings,
    estimatedPaybackMonths,
    efficiencyGainPercent: Math.round(efficiencyGainPercent * 10) / 10,
    confidenceLevel,
    calculationBasis,
  };
}

/**
 * Get sector-specific finance cost benchmark
 */
function getSectorFinanceCostBenchmark(sector: string): { median: number; topQuartile: number } {
  const normalised = sector.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  
  // Map sector strings to benchmark keys
  if (normalised.includes("financial") || normalised.includes("banking") || normalised.includes("insurance")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.financial_services;
  }
  if (normalised.includes("tech") || normalised.includes("software") || normalised.includes("saas")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.technology;
  }
  if (normalised.includes("manufactur")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.manufacturing;
  }
  if (normalised.includes("retail") || normalised.includes("consumer")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.retail;
  }
  if (normalised.includes("health") || normalised.includes("pharma")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.healthcare;
  }
  if (normalised.includes("energy") || normalised.includes("utility")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.energy_utilities;
  }
  if (normalised.includes("telecom") || normalised.includes("media")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.telecommunications_media;
  }
  if (normalised.includes("transport") || normalised.includes("logistics")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.transportation_logistics;
  }
  if (normalised.includes("real_estate") || normalised.includes("construction")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.real_estate_construction;
  }
  if (normalised.includes("public") || normalised.includes("government")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.public_sector;
  }
  if (normalised.includes("education") || normalised.includes("university")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.education;
  }
  if (normalised.includes("nonprofit") || normalised.includes("charity")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.nonprofit_charities;
  }
  if (normalised.includes("agricult") || normalised.includes("agri")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.agriculture_agribusiness;
  }
  if (normalised.includes("hospitality") || normalised.includes("hotel") || normalised.includes("leisure")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.hospitality_leisure;
  }
  if (normalised.includes("mining") || normalised.includes("material")) {
    return SECTOR_FINANCE_COST_BENCHMARKS.basic_materials_mining;
  }
  
  // Default to professional services
  return SECTOR_FINANCE_COST_BENCHMARKS.professional_services;
}

/**
 * Get visual presentation metadata for a confidence level
 * Used by frontend for styling insights with appropriate visual hierarchy
 */
export function getConfidenceVisualStyle(confidence: ConfidenceLevel) {
  const level = CONFIDENCE_LEVELS[confidence];
  return {
    label: level.consultingLabel,
    description: level.consultingDescription,
    style: level.visualStyle,
    icon: level.iconType,
    colour: level.colour,
  };
}

// ============================================
// INTELLIGENT OPPORTUNITY DETECTION
// Identifies high-value opportunities based on company profile
// ============================================

export interface IntelligentOpportunity {
  type: "ai" | "epm" | "erp" | "consolidation" | "analytics";
  confidence: "high" | "medium";
  reason: string;
  potentialImpact: string;
  isBlindSpot: boolean;
}

/**
 * Generate intelligent opportunities based on company profile
 * This is where we identify opportunities like "low-margin manufacturer = AI opportunity"
 * even if the user hasn't prioritized AI
 */
export function generateIntelligentOpportunities(
  sector: string | undefined,
  dimensionScores: Record<string, number>,
  userPriorities: string[]
): IntelligentOpportunity[] {
  const opportunities: IntelligentOpportunity[] = [];
  const profile = getIndustryValueProfile(sector);
  const prioritiesSet = new Set(userPriorities);
  
  // Check AI opportunity for low-margin industries
  if (profile.marginCategory === "low_margin") {
    const aiScore = dimensionScores["ai_automation"] || dimensionScores["ai"] || 0;
    const analyticsScore = dimensionScores["data_analytics"] || 0;
    
    if (aiScore < 50 || analyticsScore < 50) {
      opportunities.push({
        type: "ai",
        confidence: "high",
        reason: `In low-margin industries (${profile.typicalMargin.min}-${profile.typicalMargin.max}%), AI-driven forecast improvements can have ${profile.forecastImpactMultiplier}x impact on profitability. ${profile.keyAIBenefits[0]}`,
        potentialImpact: profile.transformationValueDrivers[0] || "Significant margin improvement potential",
        isBlindSpot: !prioritiesSet.has("ai"),
      });
    }
  }
  
  // Check EPM opportunity for industries with complex planning needs
  if (["manufacturing", "retail", "transportation_logistics", "hospitality_leisure"].some(ind => 
    sector?.toLowerCase().includes(ind.split("_")[0])
  )) {
    const planningScore = dimensionScores["planning_budgeting"] || dimensionScores["forecasting_modelling"] || 0;
    
    if (planningScore < 55) {
      opportunities.push({
        type: "epm",
        confidence: "high",
        reason: `Industries with volatile demand patterns benefit significantly from mature planning capabilities. ${profile.keyEPMBenefits[0]}`,
        potentialImpact: "Forecast accuracy improvement directly translates to working capital and margin gains",
        isBlindSpot: !prioritiesSet.has("epm"),
      });
    }
  }
  
  // Check consolidation opportunity for regulated industries
  if (["financial_services", "healthcare", "public_sector", "energy_utilities"].some(ind =>
    sector?.toLowerCase().includes(ind.split("_")[0])
  )) {
    const closeScore = dimensionScores["consolidation_close"] || dimensionScores["transaction_processing"] || 0;
    const complianceScore = dimensionScores["compliance_controls"] || 0;
    
    if (closeScore < 50 || complianceScore < 50) {
      opportunities.push({
        type: "consolidation",
        confidence: "high",
        reason: `Highly regulated industries face significant compliance costs. ${profile.regulatoryPressures[0]}`,
        potentialImpact: "Faster close and improved compliance can reduce regulatory risk and audit costs by 20-30%",
        isBlindSpot: !prioritiesSet.has("consolidation"),
      });
    }
  }
  
  // Check analytics opportunity for data-rich industries
  if (["retail", "technology", "telecommunications_media", "financial_services"].some(ind =>
    sector?.toLowerCase().includes(ind.split("_")[0])
  )) {
    const analyticsScore = dimensionScores["data_analytics"] || 0;
    const reportingScore = dimensionScores["reporting_visualisation"] || 0;
    
    if (analyticsScore < 55 && reportingScore < 55) {
      opportunities.push({
        type: "analytics",
        confidence: "medium",
        reason: `Data-rich industries can unlock significant value through advanced analytics. ${profile.marketTrends[0]}`,
        potentialImpact: "Improved decision-making speed and insight quality",
        isBlindSpot: !prioritiesSet.has("analytics"),
      });
    }
  }
  
  // Check ERP opportunity for industries needing operational integration
  if (profile.keyERPBenefits.length > 0) {
    const techScore = dimensionScores["technology_architecture"] || 0;
    
    if (techScore < 45) {
      opportunities.push({
        type: "erp",
        confidence: "medium",
        reason: `Technology architecture gaps may limit planning effectiveness. ${profile.keyERPBenefits[0]}`,
        potentialImpact: "Integrated systems enable real-time visibility and faster decision cycles",
        isBlindSpot: !prioritiesSet.has("erp"),
      });
    }
  }
  
  // Sort by confidence (high first) and blind spots (true first)
  return opportunities.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === "high" ? -1 : 1;
    }
    return a.isBlindSpot === b.isBlindSpot ? 0 : (a.isBlindSpot ? -1 : 1);
  });
}

/**
 * Generate AI prompt context for intelligent opportunities
 */
export function generateOpportunitiesContext(
  sector: string | undefined,
  dimensionScores: Record<string, number>,
  userPriorities: string[]
): string {
  const opportunities = generateIntelligentOpportunities(sector, dimensionScores, userPriorities);
  
  if (opportunities.length === 0) {
    return "";
  }
  
  const blindSpotOpps = opportunities.filter(o => o.isBlindSpot);
  const alignedOpps = opportunities.filter(o => !o.isBlindSpot);
  
  let context = `
INTELLIGENT OPPORTUNITY ANALYSIS:
Based on industry profile and assessment scores, the following opportunities have been identified:

`;

  if (alignedOpps.length > 0) {
    context += `ALIGNED WITH USER PRIORITIES:
${alignedOpps.map(o => `- ${o.type.toUpperCase()} (${o.confidence} confidence): ${o.reason}\n  Potential Impact: ${o.potentialImpact}`).join("\n\n")}

`;
  }
  
  if (blindSpotOpps.length > 0) {
    context += `OPPORTUNITIES OUTSIDE STATED PRIORITIES (Potential Blind Spots):
${blindSpotOpps.map(o => `- ${o.type.toUpperCase()} (${o.confidence} confidence): ${o.reason}\n  Potential Impact: ${o.potentialImpact}`).join("\n\n")}

GUIDANCE: These opportunities are OUTSIDE the client's stated priorities but are significant based on their industry profile. Surface them diplomatically - the client may benefit from expanding their transformation scope.
`;
  }
  
  return context;
}

// ============================================
// TRANSFORMATION PRIORITY WEIGHTING
// Adjusts dimension weights based on user-ranked priorities
// ============================================

/**
 * Mapping from registration priority IDs to assessment dimension keys
 * Users select priorities like "epm", "erp", "ai" etc.
 * These map to one or more assessment dimensions
 */
export const PRIORITY_TO_DIMENSIONS: Record<string, string[]> = {
  epm: ["planning_budgeting", "forecasting_modelling", "performance_management"],
  erp: ["data_analytics", "consolidation_close", "technology_architecture"],
  ai: ["ai_automation", "data_analytics", "forecasting_modelling"],
  analytics: ["data_analytics", "reporting_visualisation", "forecasting_modelling"],
  consolidation: ["consolidation_close", "compliance_controls", "performance_management"],
};

/**
 * Priority boost multipliers based on ranking position
 * 1st priority: 1.4x weight multiplier
 * 2nd priority: 1.3x
 * 3rd priority: 1.2x
 * 4th priority: 1.1x
 * 5th priority: 1.05x
 */
const PRIORITY_RANK_MULTIPLIERS = [1.4, 1.3, 1.2, 1.1, 1.05];

export interface PriorityWeightAdjustment {
  dimension: string;
  baseWeight: number;
  adjustedWeight: number;
  boostReason?: string;
  priorityRank?: number;
}

/**
 * Calculate adjusted dimension weights based on user-selected priorities
 * 
 * @param baseWeights - Original dimension weights (typically 1.0 each)
 * @param userPriorities - Ordered array of priority IDs from registration (e.g., ["epm", "ai", "analytics"])
 * @returns Adjusted weights with boost explanations
 */
export function calculatePriorityAdjustedWeights(
  baseWeights: Record<string, number>,
  userPriorities: string[]
): Record<string, PriorityWeightAdjustment> {
  const adjustments: Record<string, PriorityWeightAdjustment> = {};
  
  // Initialize all dimensions with base weights
  for (const [dimension, weight] of Object.entries(baseWeights)) {
    adjustments[dimension] = {
      dimension,
      baseWeight: weight,
      adjustedWeight: weight,
    };
  }
  
  // Apply priority boosts
  for (let i = 0; i < userPriorities.length && i < PRIORITY_RANK_MULTIPLIERS.length; i++) {
    const priorityId = userPriorities[i];
    const multiplier = PRIORITY_RANK_MULTIPLIERS[i];
    const affectedDimensions = PRIORITY_TO_DIMENSIONS[priorityId] || [];
    
    for (const dimension of affectedDimensions) {
      if (adjustments[dimension]) {
        adjustments[dimension].adjustedWeight *= multiplier;
        adjustments[dimension].boostReason = `Priority #${i + 1}: ${priorityId}`;
        adjustments[dimension].priorityRank = i + 1;
      }
    }
  }
  
  return adjustments;
}

/**
 * Get simple adjusted weights map for use in scoring calculations
 */
export function getAdjustedWeightsMap(
  baseWeights: Record<string, number>,
  userPriorities: string[]
): Record<string, number> {
  const adjustments = calculatePriorityAdjustedWeights(baseWeights, userPriorities);
  const result: Record<string, number> = {};
  
  for (const [dimension, adj] of Object.entries(adjustments)) {
    result[dimension] = adj.adjustedWeight;
  }
  
  return result;
}

/**
 * Identify dimensions that need attention regardless of user priorities
 * Returns dimensions where the score is significantly below benchmark
 * This ensures AI remains impartial about clear issues
 * 
 * @param dimensionScores - Current dimension scores (0-100)
 * @param industryBenchmarks - Industry benchmark scores (0-100)
 * @param threshold - Gap threshold below which to flag (default 15 points)
 */
export interface UnprioritizedGap {
  dimension: string;
  score: number;
  benchmark: number;
  gap: number;
  severity: "critical" | "significant" | "moderate";
  recommendation: string;
}

export function identifyUnprioritizedGaps(
  dimensionScores: Record<string, number>,
  industryBenchmarks: Record<string, number>,
  userPriorities: string[],
  threshold = 15
): UnprioritizedGap[] {
  const gaps: UnprioritizedGap[] = [];
  
  // Get dimensions that ARE in user priorities (so we can flag ones that aren't)
  const prioritizedDimensions = new Set<string>();
  for (const priorityId of userPriorities) {
    const dims = PRIORITY_TO_DIMENSIONS[priorityId] || [];
    dims.forEach(d => prioritizedDimensions.add(d));
  }
  
  for (const [dimension, score] of Object.entries(dimensionScores)) {
    const benchmark = industryBenchmarks[dimension] || 50;
    const gap = benchmark - score;
    
    // Only flag if:
    // 1. Gap exceeds threshold
    // 2. Dimension is NOT in user's stated priorities (we're surfacing blind spots)
    if (gap >= threshold && !prioritizedDimensions.has(dimension)) {
      let severity: "critical" | "significant" | "moderate";
      let recommendation: string;
      
      if (gap >= 30) {
        severity = "critical";
        recommendation = `Your ${formatDimensionName(dimension)} capability is significantly below industry peers. This may warrant attention regardless of current priorities.`;
      } else if (gap >= 20) {
        severity = "significant";
        recommendation = `${formatDimensionName(dimension)} shows a notable gap to industry benchmarks that could impact overall transformation success.`;
      } else {
        severity = "moderate";
        recommendation = `Consider including ${formatDimensionName(dimension)} in your transformation scope to address competitive gaps.`;
      }
      
      gaps.push({
        dimension,
        score,
        benchmark,
        gap,
        severity,
        recommendation,
      });
    }
  }
  
  // Sort by gap size (largest first)
  gaps.sort((a, b) => b.gap - a.gap);
  
  return gaps;
}

/**
 * Format dimension key as readable name
 */
function formatDimensionName(dimension: string): string {
  return dimension
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate priority context for AI narrative generation
 * Provides structured information about user priorities and any blind spots
 */
export interface PriorityContext {
  rankedPriorities: { rank: number; id: string; label: string; affectedDimensions: string[] }[];
  unprioritizedGaps: UnprioritizedGap[];
  priorityAcknowledgement: string;
  blindSpotWarning?: string;
}

export function generatePriorityContext(
  userPriorities: string[],
  dimensionScores: Record<string, number>,
  industryBenchmarks: Record<string, number>
): PriorityContext {
  // Map priority IDs to readable labels
  const PRIORITY_LABELS: Record<string, string> = {
    epm: "Planning & Forecasting (EPM)",
    erp: "Core Finance Systems (ERP)",
    ai: "AI & Automation",
    analytics: "Data & Analytics",
    consolidation: "Consolidation & Close",
  };
  
  const rankedPriorities = userPriorities.map((id, index) => ({
    rank: index + 1,
    id,
    label: PRIORITY_LABELS[id] || id,
    affectedDimensions: PRIORITY_TO_DIMENSIONS[id] || [],
  }));
  
  const unprioritizedGaps = identifyUnprioritizedGaps(
    dimensionScores,
    industryBenchmarks,
    userPriorities
  );
  
  // Generate priority acknowledgement for AI
  let priorityAcknowledgement = "";
  if (rankedPriorities.length > 0) {
    const topPriority = rankedPriorities[0];
    priorityAcknowledgement = `Based on your stated priorities, ${topPriority.label} is your primary focus area`;
    if (rankedPriorities.length > 1) {
      priorityAcknowledgement += `, followed by ${rankedPriorities.slice(1, 3).map(p => p.label).join(" and ")}`;
    }
    priorityAcknowledgement += ". Our recommendations reflect this emphasis while remaining alert to any areas that may need attention.";
  }
  
  // Generate blind spot warning if significant gaps exist outside priorities
  let blindSpotWarning: string | undefined;
  const criticalGaps = unprioritizedGaps.filter(g => g.severity === "critical" || g.severity === "significant");
  if (criticalGaps.length > 0) {
    blindSpotWarning = `Important: While respecting your stated priorities, we note ${criticalGaps.length} area${criticalGaps.length > 1 ? "s" : ""} outside your current focus (${criticalGaps.map(g => formatDimensionName(g.dimension)).join(", ")}) showing significant gaps to industry benchmarks. These may warrant consideration in your transformation planning.`;
  }
  
  return {
    rankedPriorities,
    unprioritizedGaps,
    priorityAcknowledgement,
    blindSpotWarning,
  };
}
