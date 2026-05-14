/**
 * Workshop Schedule Service for FinanceCompass
 * Generates workshop recommendations based on assessment results
 * 
 * Two types of workshops:
 * 1. Remediation Workshops (W1-W4) - Fix gaps, always included for completed assessments
 * 2. Confirmation Workshops (C0_1-C3_1) - Validate strengths when score >= 3.5
 */

import { DIMENSION_BENCHMARKS, DIMENSION_LABELS } from "./benchmarks";
import type { 
  WorkshopSchedule, 
  WorkshopScheduleItem, 
  FCWorkshopType,
  FinanceCostBenchmark,
  EnhancedWorkshopSummary 
} from "@shared/finance-compass-schema";

// ============================================
// SECTOR FINANCE COST BENCHMARKS
// Finance function cost as % of revenue by industry
// ============================================

export const SECTOR_FINANCE_COST_BENCHMARKS: Record<string, { median: number; topQuartile: number }> = {
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

// ============================================
// INDUSTRY CONTEXT FOR VALUE DRIVERS
// ============================================

export const INDUSTRY_CONTEXT: Record<string, {
  sectorDescription: string;
  typicalTransformationTimeline: string;
  keyValueDrivers: string[];
  commonChallenges: string[];
}> = {
  financial_services: {
    sectorDescription: "Banking, Insurance, Asset Management, and Financial Technology",
    typicalTransformationTimeline: "12-18 months for full EPM transformation",
    keyValueDrivers: [
      "Regulatory reporting automation (FCA, PRA, Basel)",
      "Risk-adjusted performance management",
      "Multi-currency consolidation efficiency",
      "Capital planning and stress testing"
    ],
    commonChallenges: [
      "Complex regulatory requirements",
      "Multi-GAAP consolidation",
      "Intercompany eliminations at scale",
      "Real-time risk reporting needs"
    ]
  },
  technology: {
    sectorDescription: "Software, SaaS, Hardware, and IT Services",
    typicalTransformationTimeline: "9-12 months for full EPM transformation",
    keyValueDrivers: [
      "ARR/MRR metrics automation",
      "Product line profitability tracking",
      "Cohort-based revenue analysis",
      "R&D capitalisation optimisation"
    ],
    commonChallenges: [
      "Rapid growth scaling challenges",
      "Revenue recognition complexity (ASC 606)",
      "Multi-entity international consolidation",
      "Subscription billing integration"
    ]
  },
  manufacturing: {
    sectorDescription: "Discrete and Process Manufacturing, Industrial Products",
    typicalTransformationTimeline: "14-20 months for full EPM transformation",
    keyValueDrivers: [
      "Plant-level performance visibility",
      "Supply chain cost optimisation",
      "Transfer pricing automation",
      "Demand planning integration"
    ],
    commonChallenges: [
      "Multi-site manufacturing consolidation",
      "Complex cost allocation",
      "Legacy ERP integration",
      "S&OP financial alignment"
    ]
  },
  retail: {
    sectorDescription: "Consumer Retail, E-commerce, and Omnichannel Retailers",
    typicalTransformationTimeline: "10-14 months for full EPM transformation",
    keyValueDrivers: [
      "Store and channel profitability",
      "Seasonal demand forecasting",
      "Inventory optimisation",
      "Markdown management"
    ],
    commonChallenges: [
      "High transaction volumes",
      "Omnichannel complexity",
      "Franchise accounting",
      "Rapid store portfolio changes"
    ]
  },
  healthcare: {
    sectorDescription: "Healthcare Providers, Life Sciences, and Medical Technology",
    typicalTransformationTimeline: "12-16 months for full EPM transformation",
    keyValueDrivers: [
      "Cost per patient/procedure tracking",
      "Clinical and financial alignment",
      "Regulatory compliance (NHS, CQC)",
      "Research programme costing"
    ],
    commonChallenges: [
      "NHS reporting requirements",
      "Complex cost centre structures",
      "Clinical data integration",
      "Multi-trust consolidation"
    ]
  },
  professional_services: {
    sectorDescription: "Consulting, Legal, Accounting, and Business Services",
    typicalTransformationTimeline: "8-12 months for full EPM transformation",
    keyValueDrivers: [
      "Project profitability tracking",
      "Resource utilisation optimisation",
      "Partner compensation modelling",
      "WIP and revenue recognition"
    ],
    commonChallenges: [
      "Time-based revenue recognition",
      "Multi-currency billing",
      "Practice/partner level reporting",
      "Subcontractor management"
    ]
  },
  energy_utilities: {
    sectorDescription: "Energy, Oil & Gas, and Utilities",
    typicalTransformationTimeline: "14-18 months for full EPM transformation",
    keyValueDrivers: [
      "Regulatory price control compliance (Ofgem)",
      "Asset lifecycle planning",
      "Capital project management",
      "Commodity hedging integration"
    ],
    commonChallenges: [
      "Long-term asset planning",
      "Regulatory reporting complexity",
      "Environmental compliance costs",
      "Commodity price volatility"
    ]
  },
};

// Default industry context for sectors not explicitly defined
const DEFAULT_INDUSTRY_CONTEXT = {
  sectorDescription: "Diverse business operations across multiple segments",
  typicalTransformationTimeline: "12-15 months for full EPM transformation",
  keyValueDrivers: [
    "Operational efficiency improvement",
    "Financial close acceleration",
    "Reporting and analytics enhancement",
    "Planning cycle optimisation"
  ],
  commonChallenges: [
    "Legacy system integration",
    "Data quality and consistency",
    "Process standardisation",
    "Change management"
  ]
};

// ============================================
// ENHANCED REMEDIATION WORKSHOP DEFINITIONS
// ============================================

interface EnhancedRemediationWorkshop extends Omit<WorkshopScheduleItem, 'status'> {
  deliverables: string[];
  successMetrics: string[];
  prerequisites: string[];
  keyActivities: string[];
  risksMitigated: string[];
  estimatedValue: string;
  tools: string[];
}

const REMEDIATION_WORKSHOPS: EnhancedRemediationWorkshop[] = [
  {
    workshopId: "W1",
    workshopName: "Assessment Results & Vision Alignment",
    workshopType: "remediation",
    weekNumber: 1,
    durationHours: 4,
    objectives: [
      "Validate assessment findings with leadership team",
      "Establish shared understanding of finance transformation readiness gaps",
      "Articulate clear transformation vision",
      "Identify 3-5 strategic pillars",
      "Create draft roadmap skeleton"
    ],
    participantCount: "8-15 (cross-functional: CFO, Controller, FP&A, IT, COO)",
    deliverables: [
      "Strategic Vision Document",
      "Validated Capability Gap Analysis Report",
      "Draft Transformation Charter",
      "Stakeholder Alignment Summary",
      "Priority Dimension Heat Map"
    ],
    successMetrics: [
      "100% leadership alignment on top 5 priorities",
      "Signed-off transformation vision statement",
      "Agreement on 3-year target state",
      "Identified executive sponsor for each workstream",
      "Documented constraints and dependencies"
    ],
    prerequisites: [
      "Completed Finance Compass assessment",
      "All dimension scores reviewed by finance leadership",
      "Pre-read materials distributed to participants",
      "Executive sponsor confirmed and briefed",
      "Assessment responses validated with key stakeholders"
    ],
    keyActivities: [
      "Assessment findings walkthrough and validation",
      "Cross-functional breakout discussions by dimension",
      "Vision articulation workshop exercise",
      "Priority ranking using weighted criteria",
      "Roadmap skeleton co-creation",
      "Quick win identification brainstorm"
    ],
    risksMitigated: [
      "Misaligned expectations across leadership",
      "Underestimation of transformation scope",
      "Lack of executive sponsorship",
      "Unclear ownership of improvement initiatives",
      "Siloed understanding of finance function gaps"
    ],
    estimatedValue: "Enables prioritised improvement roadmap with clear ROI focus",
    tools: [
      "Finance Compass Assessment Dashboard",
      "Vision Alignment Canvas Template",
      "Priority Matrix Scorecard",
      "RACI Template",
      "Roadmap Planning Template"
    ]
  },
  {
    workshopId: "W2",
    workshopName: "Capability Deep-Dive & Initiative Design",
    workshopType: "remediation",
    weekNumber: 3,
    durationHours: 4,
    objectives: [
      "Deep-dive into 7 capabilities (one per dimension)",
      "Design specific initiatives to close gaps",
      "Estimate effort and benefits per initiative",
      "Create sequenced initiative roadmap",
      "Identify quick wins vs strategic bets"
    ],
    participantCount: "8-15 (same cross-functional team + extended SMEs)",
    deliverables: [
      "Capability Gap Analysis by Dimension",
      "Initiative Design Blueprints (per gap)",
      "Effort-Benefit Matrix",
      "Sequenced Initiative Roadmap",
      "Quick Win Implementation Plan",
      "Resource Requirements Summary"
    ],
    successMetrics: [
      "All 8 dimensions have defined improvement initiatives",
      "Each initiative has estimated effort (FTE-months)",
      "Each initiative has quantified benefit range",
      "Minimum 3 quick wins identified for immediate action",
      "Initiative dependencies mapped and validated",
      "Resource gaps identified and mitigation planned"
    ],
    prerequisites: [
      "W1 Vision Alignment Workshop completed",
      "Strategic pillars agreed and documented",
      "Dimension SMEs identified and invited",
      "Current state process documentation gathered",
      "Technology landscape inventory available"
    ],
    keyActivities: [
      "Dimension-by-dimension capability walkthrough",
      "Root cause analysis for priority gaps",
      "Initiative design in breakout groups",
      "Cross-functional impact assessment",
      "Effort estimation using planning poker",
      "Benefits quantification workshop",
      "Quick win selection and assignment"
    ],
    risksMitigated: [
      "Initiatives not tied to specific capability gaps",
      "Over-ambitious scope without clear phasing",
      "Missing dependencies between workstreams",
      "Underestimated resource requirements",
      "Benefits not quantifiable or trackable"
    ],
    estimatedValue: "Detailed improvement blueprint with £X-Y estimated value potential",
    tools: [
      "Capability Maturity Assessment Matrix",
      "Initiative Design Canvas",
      "Effort-Benefit Scoring Template",
      "Dependency Mapping Tool",
      "Quick Win Tracker",
      "Resource Planning Workbook"
    ]
  },
  {
    workshopId: "W3",
    workshopName: "Technology & Data Foundation",
    workshopType: "remediation",
    weekNumber: 5,
    durationHours: 4,
    objectives: [
      "Assess current technology landscape",
      "Define target EPM architecture",
      "Plan data migration and integration",
      "Evaluate vendor options",
      "Create technology roadmap"
    ],
    participantCount: "10-15 (IT, Finance Systems, Data Team, Vendors)",
    deliverables: [
      "Current State Technology Architecture Map",
      "Target EPM Architecture Blueprint",
      "Data Migration Strategy Document",
      "Integration Requirements Specification",
      "Vendor Evaluation Scorecard",
      "Technology Roadmap (18-24 months)"
    ],
    successMetrics: [
      "Full technology landscape documented",
      "Target architecture agreed by IT and Finance",
      "Data quality baseline established",
      "Integration approach validated by IT security",
      "Shortlist of 2-3 vendors for detailed evaluation",
      "Technology investment budget range defined"
    ],
    prerequisites: [
      "W2 Capability Deep-Dive completed",
      "Initiative designs requiring technology enabled",
      "IT architecture team engaged and briefed",
      "Current system inventory documented",
      "Data quality assessment initiated"
    ],
    keyActivities: [
      "Technology landscape mapping exercise",
      "Target architecture design workshop",
      "Data quality and migration planning",
      "Integration pattern selection",
      "Vendor capability assessment",
      "Build vs Buy analysis",
      "Security and compliance review"
    ],
    risksMitigated: [
      "Technology decisions made in isolation",
      "Data quality issues discovered late in implementation",
      "Integration complexity underestimated",
      "Vendor lock-in without proper evaluation",
      "Missing security or compliance requirements"
    ],
    estimatedValue: "Enables technology-enabled efficiency gains of 15-30%",
    tools: [
      "Technology Architecture Canvas",
      "EPM Vendor Comparison Matrix",
      "Data Quality Assessment Framework",
      "Integration Pattern Library",
      "Security Requirements Checklist",
      "TCO Calculator Template"
    ]
  },
  {
    workshopId: "W4",
    workshopName: "Roadmap & Implementation Planning",
    workshopType: "remediation",
    weekNumber: 7,
    durationHours: 4,
    objectives: [
      "Finalize 24-month transformation roadmap",
      "Define governance and steering structure",
      "Assign initiative ownership",
      "Establish success metrics and KPIs",
      "Plan change management approach"
    ],
    participantCount: "8-12 (Executive sponsors, PMO, Finance leadership)",
    deliverables: [
      "Final Transformation Roadmap (24 months)",
      "Programme Governance Charter",
      "Initiative RACI Matrix",
      "Benefits Realisation Framework",
      "Change Management Strategy",
      "Risk Register and Mitigation Plan",
      "Stakeholder Communication Plan"
    ],
    successMetrics: [
      "Roadmap approved by CFO and steering committee",
      "All initiatives have assigned owners",
      "Governance cadence established and diarised",
      "Benefits tracking methodology agreed",
      "First 90-day sprint plan finalised",
      "Change champions identified across business"
    ],
    prerequisites: [
      "W3 Technology & Data Foundation completed",
      "All initiative designs finalised",
      "Resource availability confirmed",
      "Budget approval in principle received",
      "Vendor selection initiated"
    ],
    keyActivities: [
      "Roadmap sequencing and optimisation",
      "Governance structure design",
      "RACI finalisation workshop",
      "Benefits tracking framework design",
      "Change impact assessment",
      "Risk identification and mitigation planning",
      "Communication planning",
      "90-day sprint planning"
    ],
    risksMitigated: [
      "Transformation stalls after initial momentum",
      "Unclear accountability for delivery",
      "Benefits not tracked or realised",
      "Change resistance from stakeholders",
      "Risks not proactively managed"
    ],
    estimatedValue: "Structured delivery plan to realise full transformation value",
    tools: [
      "Roadmap Visualisation Tool",
      "Governance Charter Template",
      "Benefits Realisation Tracker",
      "Change Impact Assessment Matrix",
      "Risk Register Template",
      "Communication Plan Template",
      "Sprint Planning Canvas"
    ]
  },
];

// ============================================
// ENHANCED CONFIRMATION WORKSHOP DEFINITIONS
// ============================================

interface EnhancedConfirmationWorkshop {
  workshopId: string;
  workshopName: string;
  durationHours: number;
  triggerDimension: string;
  triggerDimensionKey: string;
  minScore: number;
  objectives: string[];
  participantCount: string;
  scheduledDay: number;
  deliverables: string[];
  successMetrics: string[];
  prerequisites: string[];
  keyActivities: string[];
  risksMitigated: string[];
  estimatedValue: string;
  tools: string[];
  industryBenchmarkContext: string;
  maturityImplication: string;
}

const CONFIRMATION_WORKSHOPS: EnhancedConfirmationWorkshop[] = [
  {
    workshopId: "C0_1",
    workshopName: "Finance Governance Best Practices Validation",
    durationHours: 2,
    triggerDimension: "D7_GOVERNANCE",
    triggerDimensionKey: "financial_controls_compliance",
    minScore: 3.5,
    objectives: [
      "Validate governance maturity level",
      "Document existing best practices",
      "Create governance standards documentation",
      "Share learnings with broader finance team"
    ],
    participantCount: "10-15 (Finance Leadership, Governance Committee, Risk/Compliance)",
    scheduledDay: 30,
    deliverables: [
      "Governance Maturity Validation Report",
      "Best Practice Documentation Pack",
      "Control Framework Standards Guide",
      "Governance Excellence Case Study",
      "Internal Knowledge Transfer Materials"
    ],
    successMetrics: [
      "Governance practices documented and standardised",
      "Control framework validated by external benchmarks",
      "Best practices shared with minimum 3 other departments",
      "Internal audit endorsement received",
      "Governance excellence recognised in transformation narrative"
    ],
    prerequisites: [
      "Assessment confirmed governance score ≥ 70%",
      "Key governance stakeholders available",
      "Recent audit reports accessible for validation",
      "Control documentation gathered"
    ],
    keyActivities: [
      "Governance practice deep-dive and validation",
      "Best practice documentation workshop",
      "Peer comparison and benchmarking review",
      "Knowledge transfer session design",
      "Standards documentation co-creation"
    ],
    risksMitigated: [
      "Best practices not captured before transformation",
      "Governance excellence not leveraged in new state",
      "Knowledge silos within governance team",
      "Potential regression during change"
    ],
    estimatedValue: "Preserves and extends governance excellence across transformation",
    tools: [
      "Governance Maturity Assessment Template",
      "Best Practice Documentation Canvas",
      "Control Framework Mapping Tool",
      "Knowledge Transfer Playbook"
    ],
    industryBenchmarkContext: "Your governance practices place you in the top 25% of finance functions. This represents significant investment and capability that should be protected and extended during transformation.",
    maturityImplication: "High governance maturity indicates strong control environments, effective risk management, and audit-ready processes. This provides a solid foundation for transformation and reduces implementation risk."
  },
  {
    workshopId: "C1_1",
    workshopName: "Process Automation Best Practices Validation",
    durationHours: 3,
    triggerDimension: "D4_TECHNOLOGY",
    triggerDimensionKey: "technology_systems",
    minScore: 3.5,
    objectives: [
      "Validate technology/automation strengths",
      "Document automation standards",
      "Share RPA bot design patterns",
      "Create automation playbook"
    ],
    participantCount: "15-20 (Finance Ops, Process Owners, RPA Team)",
    scheduledDay: 135,
    deliverables: [
      "Automation Maturity Validation Report",
      "RPA Design Patterns Library",
      "Automation Playbook",
      "Technology Excellence Case Study",
      "Reusable Bot Component Catalogue"
    ],
    successMetrics: [
      "All automation patterns documented and catalogued",
      "Minimum 5 reusable components identified",
      "Automation playbook approved by IT governance",
      "Bot design patterns validated against industry standards",
      "Training materials created for extended team"
    ],
    prerequisites: [
      "Assessment confirmed technology score ≥ 70%",
      "RPA/automation team available",
      "Current automation inventory documented",
      "Performance metrics for existing automations available"
    ],
    keyActivities: [
      "Automation landscape review and validation",
      "Design pattern extraction workshop",
      "Reusability assessment exercise",
      "Playbook co-creation session",
      "Knowledge transfer planning"
    ],
    risksMitigated: [
      "Automation knowledge concentrated in few individuals",
      "Existing automations not scalable to new platform",
      "Design patterns not reused across organisation",
      "Technology debt accumulated without documentation"
    ],
    estimatedValue: "Accelerates automation rollout by 20-30% through reusable patterns",
    tools: [
      "Automation Maturity Assessment Framework",
      "Design Pattern Template Library",
      "Bot Performance Dashboard",
      "Reusability Scoring Matrix"
    ],
    industryBenchmarkContext: "Your technology and automation capabilities exceed 75% of peer organisations. This represents significant competitive advantage that should inform your transformation approach.",
    maturityImplication: "High technology maturity indicates strong digital foundation, automation expertise, and modern system architecture. This enables faster transformation and positions you for advanced capabilities like AI-driven finance."
  },
  {
    workshopId: "C2_1",
    workshopName: "Analytics Maturity Best Practices Validation",
    durationHours: 3,
    triggerDimension: "D6_KPIS",
    triggerDimensionKey: "management_reporting",
    minScore: 3.5,
    objectives: [
      "Validate analytics maturity",
      "Document KPI definitions and ownership",
      "Standardise analytics methodology",
      "Create analytics style guide"
    ],
    participantCount: "15-25 (Analytics Team, Business Analysts, Data Team)",
    scheduledDay: 240,
    deliverables: [
      "Analytics Maturity Validation Report",
      "KPI Definition Master Document",
      "Analytics Methodology Guide",
      "Reporting Style Guide",
      "Self-Service Analytics Playbook"
    ],
    successMetrics: [
      "All KPIs have documented definitions and owners",
      "Analytics methodology standardised across finance",
      "Style guide adopted by 100% of report producers",
      "Self-service capability validated and documented",
      "Data literacy baseline established"
    ],
    prerequisites: [
      "Assessment confirmed reporting score ≥ 70%",
      "Analytics and BI team available",
      "Current KPI inventory accessible",
      "Sample reports and dashboards gathered"
    ],
    keyActivities: [
      "Analytics capability validation deep-dive",
      "KPI definition and ownership mapping",
      "Methodology standardisation workshop",
      "Style guide co-creation",
      "Self-service maturity assessment"
    ],
    risksMitigated: [
      "KPI definitions inconsistent across organisation",
      "Analytics methodology varies by analyst",
      "Reporting standards not transferable to new platform",
      "Self-service capability lost during transformation"
    ],
    estimatedValue: "Ensures analytics excellence transfers to new state; reduces rework by 40%",
    tools: [
      "KPI Definition Template",
      "Analytics Methodology Framework",
      "Reporting Style Guide Template",
      "Self-Service Maturity Assessment",
      "Data Literacy Assessment"
    ],
    industryBenchmarkContext: "Your analytics and reporting capabilities rank in the top 30% of finance functions. This analytical excellence should be preserved and enhanced during transformation.",
    maturityImplication: "High analytics maturity indicates strong insight generation, well-defined KPIs, and effective management reporting. This enables data-driven decision making and positions you for advanced analytics like predictive forecasting."
  },
  {
    workshopId: "C3_1",
    workshopName: "Autonomous Finance Best Practices Validation",
    durationHours: 4,
    triggerDimension: "D8_AI",
    triggerDimensionKey: "ai_machine_learning",
    minScore: 3.5,
    objectives: [
      "Document autonomous finance successes",
      "Standardise AI governance practices",
      "Create innovation best practices",
      "Plan future finance evolution"
    ],
    participantCount: "15-20 (Finance Leadership, AI/Automation Team, Strategic Partners)",
    scheduledDay: 310,
    deliverables: [
      "AI/ML Maturity Validation Report",
      "AI Governance Framework",
      "Innovation Best Practices Guide",
      "Autonomous Finance Roadmap",
      "AI Use Case Library"
    ],
    successMetrics: [
      "All AI/ML use cases documented with outcomes",
      "AI governance framework approved and implemented",
      "Innovation process standardised",
      "Future autonomous finance vision articulated",
      "AI ethics guidelines established"
    ],
    prerequisites: [
      "Assessment confirmed AI/ML score ≥ 70%",
      "AI/data science team available",
      "Current AI/ML use cases documented",
      "Model performance metrics accessible"
    ],
    keyActivities: [
      "AI/ML use case validation and documentation",
      "Governance framework design workshop",
      "Innovation process standardisation",
      "Autonomous finance visioning session",
      "AI ethics and bias review"
    ],
    risksMitigated: [
      "AI capabilities not governed properly",
      "Innovation practices not scalable",
      "AI models not explainable or auditable",
      "Autonomous finance vision not aligned with strategy",
      "AI ethics not considered in deployment"
    ],
    estimatedValue: "Positions organisation for 3-5 year autonomous finance journey",
    tools: [
      "AI Maturity Assessment Framework",
      "AI Governance Template",
      "Innovation Process Canvas",
      "AI Use Case Library Template",
      "AI Ethics Checklist"
    ],
    industryBenchmarkContext: "Your AI and machine learning capabilities place you in the top 15% of finance functions globally. This represents leading-edge capability that should be carefully governed and scaled.",
    maturityImplication: "High AI maturity indicates advanced predictive capabilities, intelligent automation, and data science expertise. This positions you at the forefront of autonomous finance evolution."
  },
];

// Dimension key mapping for score lookup
const DIMENSION_KEY_MAP: Record<string, string> = {
  D1_STRATEGY: "financial_planning_analysis",
  D2_PROCESS: "consolidation_close",
  D3_ORGANISATION: "organisation_people",
  D4_TECHNOLOGY: "technology_systems",
  D5_DATA: "data_analytics",
  D6_KPIS: "management_reporting",
  D7_GOVERNANCE: "financial_controls_compliance",
  D8_AI: "ai_machine_learning",
};

/**
 * Get dimension score from assessment dimension scores
 * Returns score capped at 100 to prevent display issues
 */
function getDimensionScore(dimensionScores: Record<string, number> | null, dimensionKey: string): number | null {
  if (!dimensionScores) return null;
  
  let rawScore: number | undefined;
  
  // Try direct key match
  if (dimensionScores[dimensionKey] !== undefined) {
    rawScore = dimensionScores[dimensionKey];
  }
  
  // Try with d prefix format (e.g., d1, d2)
  if (rawScore === undefined) {
    const dKey = Object.entries(DIMENSION_KEY_MAP).find(([_, v]) => v === dimensionKey)?.[0];
    if (dKey) {
      const dNum = dKey.replace('D', 'd').replace('_STRATEGY', '').replace('_PROCESS', '')
        .replace('_ORGANISATION', '').replace('_TECHNOLOGY', '').replace('_DATA', '')
        .replace('_KPIS', '').replace('_GOVERNANCE', '').replace('_AI', '');
      if (dimensionScores[dNum] !== undefined) {
        rawScore = dimensionScores[dNum];
      }
    }
  }
  
  if (rawScore === undefined) return null;
  
  // Cap at 100 to prevent scores exceeding 100%
  return Math.min(100, Math.max(0, rawScore));
}

/**
 * Get sector benchmark for finance cost
 */
function getSectorBenchmark(sector: string | null): { median: number; topQuartile: number } {
  if (!sector) return SECTOR_FINANCE_COST_BENCHMARKS.professional_services;
  
  const normalised = sector.toLowerCase().replace(/[^a-z]/g, '_');
  
  // Direct match
  if (SECTOR_FINANCE_COST_BENCHMARKS[normalised]) {
    return SECTOR_FINANCE_COST_BENCHMARKS[normalised];
  }
  
  // Fuzzy matching
  if (normalised.includes("financ") || normalised.includes("bank") || normalised.includes("insur")) {
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
  
  return SECTOR_FINANCE_COST_BENCHMARKS.professional_services;
}

/**
 * Get industry context for a sector
 */
function getIndustryContext(sector: string | null): typeof INDUSTRY_CONTEXT[string] {
  if (!sector) return DEFAULT_INDUSTRY_CONTEXT;
  
  const normalised = sector.toLowerCase().replace(/[^a-z]/g, '_');
  
  // Direct match
  if (INDUSTRY_CONTEXT[normalised]) {
    return INDUSTRY_CONTEXT[normalised];
  }
  
  // Fuzzy matching
  if (normalised.includes("financ") || normalised.includes("bank") || normalised.includes("insur")) {
    return INDUSTRY_CONTEXT.financial_services;
  }
  if (normalised.includes("tech") || normalised.includes("software") || normalised.includes("saas")) {
    return INDUSTRY_CONTEXT.technology;
  }
  if (normalised.includes("manufactur")) {
    return INDUSTRY_CONTEXT.manufacturing;
  }
  if (normalised.includes("retail") || normalised.includes("consumer")) {
    return INDUSTRY_CONTEXT.retail;
  }
  if (normalised.includes("health") || normalised.includes("pharma")) {
    return INDUSTRY_CONTEXT.healthcare;
  }
  if (normalised.includes("professional") || normalised.includes("consult") || normalised.includes("legal")) {
    return INDUSTRY_CONTEXT.professional_services;
  }
  if (normalised.includes("energy") || normalised.includes("utility")) {
    return INDUSTRY_CONTEXT.energy_utilities;
  }
  
  return DEFAULT_INDUSTRY_CONTEXT;
}

/**
 * Generate workshop schedule based on assessment results (basic version)
 */
export function generateWorkshopSchedule(
  assessmentId: string,
  dimensionScores: Record<string, number> | null,
  overallScore: number | null
): WorkshopSchedule {
  // Always include all 4 remediation workshops with enhanced data
  const remediationWorkshops: WorkshopScheduleItem[] = REMEDIATION_WORKSHOPS.map(w => ({
    workshopId: w.workshopId,
    workshopName: w.workshopName,
    workshopType: w.workshopType,
    weekNumber: w.weekNumber,
    durationHours: w.durationHours,
    objectives: w.objectives,
    participantCount: w.participantCount,
    status: "pending_booking" as const,
    deliverables: w.deliverables,
    successMetrics: w.successMetrics,
    prerequisites: w.prerequisites,
    keyActivities: w.keyActivities,
    risksMitigated: w.risksMitigated,
    estimatedValue: w.estimatedValue,
    tools: w.tools,
  }));
  
  // Check for confirmation workshops based on dimension scores
  const confirmationWorkshops: WorkshopScheduleItem[] = [];
  
  if (dimensionScores) {
    for (const config of CONFIRMATION_WORKSHOPS) {
      const rawScore = getDimensionScore(dimensionScores, config.triggerDimensionKey);
      const benchmark = DIMENSION_BENCHMARKS[config.triggerDimension as keyof typeof DIMENSION_BENCHMARKS];
      
      // Dimension scores are stored as percentages (0-100), convert to 1-5 scale
      const score = rawScore !== null ? rawScore / 20 : null;
      
      if (score !== null && score >= config.minScore) {
        const dimensionLabel = DIMENSION_LABELS[config.triggerDimension];
        
        confirmationWorkshops.push({
          workshopId: config.workshopId,
          workshopName: config.workshopName,
          workshopType: "confirmation",
          weekNumber: Math.ceil(config.scheduledDay / 7),
          durationHours: config.durationHours,
          objectives: config.objectives,
          participantCount: config.participantCount,
          status: "pending_booking",
          triggerInfo: {
            dimension: dimensionLabel?.full || config.triggerDimension,
            score: score,
            benchmark: benchmark?.industryAverage || 3.0,
            reasoning: `Your ${dimensionLabel?.full || config.triggerDimension} score of ${score.toFixed(1)} exceeds the benchmark of ${benchmark?.industryAverage || 3.0}. This confirmation workshop will document and standardise your best practices in this area.`,
          },
          deliverables: config.deliverables,
          successMetrics: config.successMetrics,
          prerequisites: config.prerequisites,
          keyActivities: config.keyActivities,
          risksMitigated: config.risksMitigated,
          estimatedValue: config.estimatedValue,
          tools: config.tools,
          industryBenchmarkContext: config.industryBenchmarkContext,
          maturityImplication: config.maturityImplication,
        });
      }
    }
  }
  
  // Calculate summary
  const totalRemediationHours = remediationWorkshops.reduce((sum, w) => sum + w.durationHours, 0);
  const totalConfirmationHours = confirmationWorkshops.reduce((sum, w) => sum + w.durationHours, 0);
  
  // Generate insight text
  let insight = "";
  if (confirmationWorkshops.length > 0) {
    insight = `Your transformation programme includes ${remediationWorkshops.length} remediation workshops to address gaps and ${confirmationWorkshops.length} confirmation workshop${confirmationWorkshops.length > 1 ? 's' : ''} to validate and document your areas of strength. This balanced approach fixes weaknesses while celebrating successes.`;
  } else {
    insight = `Your transformation programme includes ${remediationWorkshops.length} focused remediation workshops over 8 weeks to systematically address your key improvement areas. As you progress, confirmation workshops may be recommended for areas where you achieve excellence.`;
  }
  
  return {
    assessmentId,
    remediationWorkshops,
    confirmationWorkshops,
    summary: {
      totalWorkshops: remediationWorkshops.length + confirmationWorkshops.length,
      totalHours: totalRemediationHours + totalConfirmationHours,
      remediationCount: remediationWorkshops.length,
      confirmationCount: confirmationWorkshops.length,
      durationWeeks: 8,
    },
    insight,
  };
}

/**
 * Enhanced workshop schedule with full context
 * Includes finance cost benchmarks, industry context, and value roadmap
 */
export interface EnhancedWorkshopContext {
  sector: string | null;
  revenueMillions: number | null;
  financeCostPercentage: number | null;
  financeFte: number | null;
  overallMaturityScore: number | null;
}

export function generateEnhancedWorkshopSchedule(
  assessmentId: string,
  dimensionScores: Record<string, number> | null,
  overallScore: number | null,
  context: EnhancedWorkshopContext
): WorkshopSchedule {
  // Get base workshop schedule
  const baseSchedule = generateWorkshopSchedule(assessmentId, dimensionScores, overallScore);
  
  // Get sector benchmarks
  const sectorBenchmark = getSectorBenchmark(context.sector);
  const industryContext = getIndustryContext(context.sector);
  
  // Calculate finance cost benchmark comparison
  let financeCostBenchmark: FinanceCostBenchmark | undefined;
  
  if (context.sector) {
    const companyPct = context.financeCostPercentage;
    let performanceVsMedian: "above" | "at" | "below" | "unknown" = "unknown";
    let gapToTopQuartile: number | null = null;
    
    if (companyPct !== null) {
      if (companyPct > sectorBenchmark.median * 1.1) {
        performanceVsMedian = "above"; // Worse than median (higher cost)
      } else if (companyPct < sectorBenchmark.median * 0.9) {
        performanceVsMedian = "below"; // Better than median (lower cost)
      } else {
        performanceVsMedian = "at";
      }
      
      gapToTopQuartile = companyPct - sectorBenchmark.topQuartile;
    }
    
    // Calculate potential savings
    let potentialSavingsRange: { min: number; max: number; currency: string } | undefined;
    if (companyPct !== null && context.revenueMillions !== null && gapToTopQuartile !== null && gapToTopQuartile > 0) {
      const potentialSavingPct = gapToTopQuartile * 0.5; // Assume 50% of gap can be closed
      const minSavings = context.revenueMillions * (potentialSavingPct / 100) * 0.7 * 1000000; // 70% of potential
      const maxSavings = context.revenueMillions * (potentialSavingPct / 100) * 1000000; // 100% of potential
      
      potentialSavingsRange = {
        min: Math.round(minSavings / 1000) * 1000, // Round to nearest thousand
        max: Math.round(maxSavings / 1000) * 1000,
        currency: "GBP"
      };
    }
    
    financeCostBenchmark = {
      sector: context.sector,
      companyFinanceCostPct: companyPct,
      industryMedianPct: sectorBenchmark.median,
      topQuartilePct: sectorBenchmark.topQuartile,
      performanceVsMedian,
      gapToTopQuartile,
      potentialSavingsRange
    };
  }
  
  // Calculate total transformation value potential
  let totalTransformationValue: string | undefined;
  let quickWinPotential: string | undefined;
  
  if (context.revenueMillions !== null) {
    const revenue = context.revenueMillions;
    // Estimate transformation value as 0.3-0.8% of revenue
    const minValue = Math.round(revenue * 0.003 * 1000000 / 1000) * 1000;
    const maxValue = Math.round(revenue * 0.008 * 1000000 / 1000) * 1000;
    
    totalTransformationValue = `£${(minValue / 1000000).toFixed(1)}M - £${(maxValue / 1000000).toFixed(1)}M`;
    
    // Quick wins typically 10-20% of total value
    const quickWinMin = Math.round(minValue * 0.1 / 1000) * 1000;
    const quickWinMax = Math.round(maxValue * 0.2 / 1000) * 1000;
    quickWinPotential = `£${(quickWinMin / 1000).toFixed(0)}K - £${(quickWinMax / 1000).toFixed(0)}K`;
  }
  
  // Build value roadmap based on maturity
  const maturityLevel = overallScore !== null ? overallScore : 50;
  const valueRoadmap = {
    phase1QuickWins: maturityLevel < 40 
      ? [
          "Automate manual reconciliations (2-4 week implementation)",
          "Standardise reporting templates (1-2 week effort)",
          "Implement close task tracking (immediate)",
          "Deploy automated data validation rules (2-3 weeks)"
        ]
      : [
          "Enhance existing automations with exception handling",
          "Extend self-service analytics to new user groups",
          "Optimise existing close calendar",
          "Deploy advanced variance commentary automation"
        ],
    phase2Foundation: [
      "Implement unified data model and master data management",
      "Deploy EPM platform for core planning and consolidation",
      "Establish governance framework and controls",
      "Build driver-based planning models"
    ],
    phase3Scale: [
      "Enable predictive analytics and AI-powered forecasting",
      "Implement continuous close capabilities",
      "Deploy advanced scenario modelling",
      "Achieve autonomous finance operations for routine processes"
    ],
    totalPotentialValue: totalTransformationValue || "To be calculated based on company profile"
  };
  
  // Enhance summary with additional metrics
  const enhancedSummary: EnhancedWorkshopSummary = {
    ...baseSchedule.summary,
    totalTransformationValue,
    implementationTimelineMonths: 18, // Standard transformation timeline
    quickWinPotential
  };
  
  // Enhanced insight with industry context
  let enhancedInsight = baseSchedule.insight;
  if (financeCostBenchmark && financeCostBenchmark.performanceVsMedian !== "unknown") {
    if (financeCostBenchmark.performanceVsMedian === "above") {
      enhancedInsight += ` Your finance function cost of ${financeCostBenchmark.companyFinanceCostPct?.toFixed(1)}% of revenue is above the industry median of ${financeCostBenchmark.industryMedianPct}%, indicating significant efficiency improvement potential.`;
    } else if (financeCostBenchmark.performanceVsMedian === "below") {
      enhancedInsight += ` Your finance function cost of ${financeCostBenchmark.companyFinanceCostPct?.toFixed(1)}% of revenue is already below the industry median of ${financeCostBenchmark.industryMedianPct}%, demonstrating operational efficiency.`;
    }
  }
  
  return {
    ...baseSchedule,
    summary: enhancedSummary,
    insight: enhancedInsight,
    financeCostBenchmark,
    industryContext: context.sector ? {
      sector: context.sector,
      sectorDescription: industryContext.sectorDescription,
      typicalTransformationTimeline: industryContext.typicalTransformationTimeline,
      keyValueDrivers: industryContext.keyValueDrivers,
      commonChallenges: industryContext.commonChallenges
    } : undefined,
    valueRoadmap
  };
}

/**
 * Get workshop details by ID
 */
export function getWorkshopDetails(workshopId: string): WorkshopScheduleItem | EnhancedConfirmationWorkshop | null {
  const remediation = REMEDIATION_WORKSHOPS.find(w => w.workshopId === workshopId);
  if (remediation) {
    return { 
      ...remediation, 
      status: "pending_booking" as const 
    };
  }
  
  const confirmation = CONFIRMATION_WORKSHOPS.find(w => w.workshopId === workshopId);
  return confirmation || null;
}

/**
 * Export workshop definitions for use elsewhere
 */
export { REMEDIATION_WORKSHOPS, CONFIRMATION_WORKSHOPS };
