/**
 * FinanceCompass Question Bank
 * Complete question set for all 3 assessment tiers
 * Based on the comprehensive specification document
 */

import type { FCAssessmentTier, FCDimension, FCQuestionType } from "@shared/finance-compass-schema";

/**
 * Scoring mode for multi-select questions:
 * - 'cumulative': More selections = higher score (e.g., AI use cases, capabilities)
 *   Score = sum of selected weights / sum of all possible weights * 100
 * - 'penalty': More selections = lower score (e.g., fragmented systems, pain points)
 *   Score = 100 - (selectionCount - 1) * penaltyPerExtra
 * - 'average': Average score across selections (default, for priority rankings)
 *   Score = sum of selected weights / selection count / max single weight * 100
 */
export type MultiSelectScoringMode = 'cumulative' | 'penalty' | 'average';

export interface QuestionDefinition {
  id: string;
  tier: FCAssessmentTier;
  dimension: FCDimension | "qualification" | "sizing";
  order: number;
  questionType: FCQuestionType;
  questionText: string;
  helpText?: string;
  required: boolean;
  options?: { value: string; label: string; description?: string }[];
  sliderConfig?: { min: number; max: number; labels: Record<number, string> };
  structuredFields?: { id: string; label: string; type: string; placeholder?: string; validation?: string }[];
  scoringConfig?: any;
  /** Scoring mode for multi-select questions: 'cumulative' (more=better), 'penalty' (more=worse), 'average' (default) */
  multiSelectScoringMode?: MultiSelectScoringMode;
  aiGroundingNotes?: string;
  questionWeight?: number;
  isCritical?: boolean;
  criticalThreshold?: number;
  criticalFlag?: string;
}

// ============================================
// REGISTRATION QUESTIONS (Captured at signup, not during assessment)
// These questions are collected during lead registration and OTP verification
// Company info is stored in fc_contacts and fc_companies tables
// ============================================

export const REGISTRATION_QUESTIONS: QuestionDefinition[] = [
  // Note: User details (name, email, company, job title) are captured during lead signup
  // and OTP verification - no need to ask again in the assessment
  {
    id: "q1_pain_points",
    tier: "registration",
    dimension: "qualification",
    order: 1,
    questionType: "multi_select",
    questionText: "What brought you here today? Select the challenges or opportunities you're facing in your finance function.",
    helpText: "Select all that apply. You can also add additional context in the 'Other' field.",
    required: true,
    options: [
      { value: "slow_close", label: "Slow month-end and year-end close processes", description: "Takes too long to close the books and produce financial statements" },
      { value: "manual_reporting", label: "Manual, error-prone reporting and consolidation", description: "Heavy reliance on spreadsheets and manual data manipulation" },
      { value: "poor_visibility", label: "Lack of real-time visibility into financial performance", description: "Difficulty getting timely, accurate financial insights" },
      { value: "forecasting_challenges", label: "Difficulty creating accurate forecasts and budgets", description: "Unreliable planning processes and frequent forecast misses" },
      { value: "data_silos", label: "Data silos across different systems and departments", description: "Information trapped in disparate systems requiring manual integration" },
      { value: "compliance_issues", label: "Compliance and audit trail challenges", description: "Struggles with regulatory requirements and maintaining proper documentation" },
      { value: "scenario_analysis", label: "Inability to perform scenario and what-if analysis", description: "Limited capability to model different business scenarios" },
      { value: "resource_constraints", label: "Resource constraints in finance team", description: "Not enough staff or skills to meet business demands" },
      { value: "outdated_systems", label: "Outdated or disconnected technology systems", description: "Legacy systems that don't meet current business needs" },
      { value: "poor_data_quality", label: "Poor data quality and inconsistent definitions", description: "Data errors, mismatches, and lack of standardised definitions" },
      { value: "not_applicable", label: "None of these apply to us", description: "Our challenges are different from the options above" },
      { value: "other", label: "Other (please specify)", description: "Add any additional challenges not listed above" }
    ],
    scoringConfig: { allowOther: true, maxSelections: 5 },
    multiSelectScoringMode: "penalty", // More pain points = worse situation
    aiGroundingNotes: "Primary input for theme extraction. Informs urgency and personalisation of recommendations."
  },
  {
    id: "q1_company_size",
    tier: "registration",
    dimension: "sizing",
    order: 2,
    questionType: "structured",
    questionText: "What is the size of your organisation?",
    helpText: "These metrics help us benchmark your organisation and tailor recommendations. If you're unsure, provide your best estimate.",
    required: true,
    structuredFields: [
      { id: "revenue", label: "Annual Revenue (£ millions)", type: "number", placeholder: "e.g., 150" },
      { id: "entities", label: "Number of Legal Entities", type: "number", placeholder: "e.g., 5" },
      { id: "business_units", label: "Number of Business Units", type: "number", placeholder: "e.g., 3" },
      { id: "total_fte", label: "Total Company FTE", type: "number", placeholder: "e.g., 500" }
    ],
    aiGroundingNotes: "Used for size band classification and benchmark selection."
  },
  {
    id: "q1_finance_size",
    tier: "registration",
    dimension: "sizing",
    order: 3,
    questionType: "structured",
    questionText: "What is the size of your finance function?",
    helpText: "Include salaries, contractor costs, and benefits for the entire finance team (accounting, Financial Planning & Analysis, consolidation, shared services, etc.).",
    required: true,
    structuredFields: [
      { id: "finance_cost", label: "Finance Function Annual Staff Costs (£ thousands)", type: "number", placeholder: "e.g., 800" },
      { id: "finance_fte", label: "Finance Function Total FTE", type: "number", placeholder: "e.g., 12" }
    ],
    aiGroundingNotes: "Calculates Finance Cost Ratio and FTE per £M. Compare to benchmarks by size band."
  },
  {
    id: "q1_priorities",
    tier: "registration",
    dimension: "financial_planning_analysis",
    order: 4,
    questionType: "multi_select",
    questionText: "What are the top 2 priorities for your Finance function over the coming 3–5 years?",
    helpText: "Choose the 2 that are most critical to your success. We'll use these to personalise our recommendations.",
    required: true,
    options: [
      { value: "forecasting", label: "Improve forecasting accuracy and agility", description: "Ability to forecast more frequently, accurately, and respond to business changes faster" },
      { value: "close_cycle", label: "Reduce close cycle time", description: "Shorten the month-end or period-end close process and accelerate financial reporting" },
      { value: "reporting", label: "Enhance management reporting and analytics", description: "Provide better visibility, dashboards, self-service access, and business intelligence" },
      { value: "epm", label: "Implement or strengthen Enterprise Performance Management (EPM) capability", description: "Deploy EPM software that helps your organisation plan, budget, forecast, and report on performance" },
      { value: "operating_model", label: "Optimise finance operating model / shared services", description: "Redesign the finance organisation, centralise processes, or expand shared services" },
      { value: "data_quality", label: "Improve data quality and governance", description: "Establish master data governance, reduce data errors, and build a single source of truth" },
      { value: "controls", label: "Strengthen financial controls and compliance", description: "Improve SOD enforcement, audit trails, and regulatory reporting automation" },
      { value: "business_partnering", label: "Build business partnering capability", description: "Become a strategic advisor to the business; increase finance involvement in decisions" },
      { value: "cost_reduction", label: "Reduce finance operating costs", description: "Lower finance function spend through efficiency, automation, or outsourcing" },
      { value: "other", label: "Other (please specify)", description: "Free text for other priorities" }
    ],
    scoringConfig: { maxSelections: 2 },
    multiSelectScoringMode: "average", // Priority ranking with limited selections
    aiGroundingNotes: "Links recommendations to stated priorities. High EPM relevance if 'epm' or 'forecasting' selected."
  },
  {
    id: "q1_ambitions",
    tier: "registration",
    dimension: "qualification",
    order: 5,
    questionType: "multi_select",
    questionText: "What does success look like for your finance function in 3 years? Select your key ambitions.",
    helpText: "Think about where you want to be. These ambitions will shape our transformation roadmap.",
    required: true,
    options: [
      { value: "strategic_partner", label: "Finance as strategic business partner", description: "Finance actively shapes business strategy and commercial decisions" },
      { value: "real_time_insights", label: "Real-time financial insights", description: "On-demand access to current financial performance and forward-looking analytics" },
      { value: "predictive_analytics", label: "Predictive analytics and AI-enabled forecasting", description: "Leverage AI/ML to anticipate trends and automate insights" },
      { value: "zero_touch_close", label: "Near zero-touch period close", description: "Highly automated close with minimal manual intervention" },
      { value: "self_service", label: "Self-service reporting for the business", description: "Business users can access and analyse data without finance involvement" },
      { value: "continuous_planning", label: "Continuous rolling forecasts", description: "Move from annual/quarterly cycles to dynamic, continuous planning" },
      { value: "world_class_controls", label: "World-class controls and governance", description: "Best-in-class compliance, audit trails, and risk management" },
      { value: "talent_development", label: "Develop finance talent and skills", description: "Build a high-performing team with modern skills" },
      { value: "cost_efficiency", label: "Top-quartile cost efficiency", description: "Achieve best-in-class finance cost ratios through automation" },
      { value: "other", label: "Other (please specify)", description: "Free text for other ambitions" }
    ],
    scoringConfig: { maxSelections: 3 },
    multiSelectScoringMode: "cumulative", // More ambitious = higher maturity vision
    aiGroundingNotes: "Shapes the value journey and transformation narrative. Links ambitions to specific capabilities and recommendations."
  },
  {
    id: "q1_urgency",
    tier: "registration",
    dimension: "qualification",
    order: 6,
    questionType: "slider",
    questionText: "How strongly do you think your Finance function needs to change over the coming 3–5 years to meet the priorities you've identified?",
    helpText: "This helps us understand your readiness and appetite for transformation.",
    required: true,
    sliderConfig: {
      min: 1,
      max: 5,
      labels: {
        1: "No change needed",
        2: "Minor enhancements",
        3: "Moderate change",
        4: "Significant transformation",
        5: "Urgent, fundamental transformation"
      }
    },
    aiGroundingNotes: "Score ≥4 indicates high-value prospect. Adjusts recommendation tone from exploratory to critical."
  },
  
  // Technology Landscape (2 Questions)
  {
    id: "q1_erp_systems",
    tier: "registration",
    dimension: "technology_systems",
    order: 7,
    questionType: "single_select",
    questionText: "What best describes your current Enterprise Resource Planning (ERP) or core finance system landscape?",
    helpText: "ERP is your core business software that manages finance, HR, and other operations. Select the option that most closely matches your organisation's primary finance systems, including your main General Ledger (the central accounting record), consolidation, and reporting platforms.",
    required: true,
    options: [
      { value: "legacy_multiple", label: "Multiple legacy systems with limited integration", description: "Disparate older systems requiring significant manual data movement" },
      { value: "legacy_single", label: "Single legacy ERP", description: "One older core system that is stable but lacks modern capabilities" },
      { value: "modern_fragmented", label: "Modern systems but fragmented", description: "Recent implementations that aren't fully connected" },
      { value: "modern_integrated", label: "Modern integrated ERP/EPM platform", description: "Current-generation cloud or on-premise solution that manages both transactions and planning with good integration" },
      { value: "cloud_native", label: "Cloud-native unified platform", description: "Fully cloud-based with integrated planning, consolidation, and reporting" }
    ],
    scoringConfig: { weights: { legacy_multiple: 1, legacy_single: 2, modern_fragmented: 3, modern_integrated: 4, cloud_native: 5 } },
    aiGroundingNotes: "Legacy systems = higher transformation need. Cloud-native = focus on optimisation vs replacement."
  },
  {
    id: "q1_spreadsheet_dependency",
    tier: "registration",
    dimension: "technology_systems",
    order: 8,
    questionType: "single_select",
    questionText: "How dependent is your finance function on spreadsheets for critical processes?",
    helpText: "Consider budgeting, forecasting, consolidation, reporting, and analysis. What percentage of these processes rely heavily on Excel or similar tools?",
    required: true,
    options: [
      { value: "minimal", label: "Minimal (<20%)", description: "Spreadsheets used only for ad-hoc analysis; core processes in systems" },
      { value: "low", label: "Low (20-40%)", description: "Some spreadsheet use but most processes automated" },
      { value: "moderate", label: "Moderate (40-60%)", description: "Mix of system-driven and spreadsheet-based processes" },
      { value: "high", label: "High (60-80%)", description: "Spreadsheets are primary tool for most finance processes" },
      { value: "very_high", label: "Very high (>80%)", description: "Almost entirely spreadsheet-dependent for critical processes" }
    ],
    scoringConfig: { weights: { minimal: 5, low: 4, moderate: 3, high: 2, very_high: 1 } },
    questionWeight: 2.0,
    isCritical: true,
    criticalThreshold: 2,
    criticalFlag: "HIGH_SPREADSHEET_DEPENDENCY",
    aiGroundingNotes: "High spreadsheet dependency = strong EPM/automation business case. Very high = control and audit risk flag."
  },

  // Data Quality (2 Questions)
  {
    id: "q1_data_confidence",
    tier: "registration",
    dimension: "data_analytics",
    order: 9,
    questionType: "slider",
    questionText: "How confident are you in the accuracy of your financial data when making decisions?",
    helpText: "Consider data used for management reporting, forecasting, and board presentations. Rate your confidence from 1 (frequently question the numbers) to 5 (complete trust in the data).",
    required: true,
    sliderConfig: {
      min: 1,
      max: 5,
      labels: {
        1: "Very low confidence – frequently find errors",
        2: "Low confidence – often need to verify",
        3: "Moderate confidence – occasional concerns",
        4: "High confidence – rarely find issues",
        5: "Very high confidence – single source of truth"
      }
    },
    aiGroundingNotes: "Low confidence (1-2) indicates data governance issues. Strong driver for MDM and EPM investment."
  },
  {
    id: "q1_reconciliation_effort",
    tier: "registration",
    dimension: "data_analytics",
    order: 10,
    questionType: "single_select",
    questionText: "How much time does your team spend on data reconciliation and fixing data issues each month?",
    helpText: "Include time spent reconciling between systems, correcting errors, and investigating discrepancies across all finance team members.",
    required: true,
    options: [
      { value: "minimal", label: "Minimal (<5% of team time)", description: "Rare reconciliation issues, highly automated" },
      { value: "low", label: "Low (5-15% of team time)", description: "Some manual reconciliation but manageable" },
      { value: "moderate", label: "Moderate (15-25% of team time)", description: "Regular reconciliation effort across the team" },
      { value: "high", label: "High (25-40% of team time)", description: "Significant time spent on data cleanup" },
      { value: "very_high", label: "Very high (>40% of team time)", description: "Data reconciliation is a major ongoing burden" }
    ],
    scoringConfig: { weights: { minimal: 5, low: 4, moderate: 3, high: 2, very_high: 1 } },
    aiGroundingNotes: "High/Very high = strong ROI case for integration and automation. Quantifiable efficiency gains."
  },

  // Process Efficiency (2 Questions)
  {
    id: "q1_manual_vs_valueadd",
    tier: "registration",
    dimension: "organisation_people",
    order: 11,
    questionType: "single_select",
    questionText: "What proportion of your finance team's time is spent on manual, transactional work versus value-added analysis and business partnering?",
    helpText: "Manual work includes data entry, report formatting, copy-paste activities. Value-added work includes insight generation, strategic analysis, and decision support.",
    required: true,
    options: [
      { value: "mostly_manual", label: "80%+ manual / <20% value-added", description: "Team is consumed by transactional activities" },
      { value: "high_manual", label: "60-80% manual / 20-40% value-added", description: "Limited capacity for strategic work" },
      { value: "balanced", label: "40-60% manual / 40-60% value-added", description: "Reasonable balance but room to improve" },
      { value: "high_valueadd", label: "20-40% manual / 60-80% value-added", description: "Strong focus on insight and analysis" },
      { value: "mostly_valueadd", label: "<20% manual / 80%+ value-added", description: "Highly automated; team focuses on business partnering" }
    ],
    scoringConfig: { weights: { mostly_manual: 1, high_manual: 2, balanced: 3, high_valueadd: 4, mostly_valueadd: 5 } },
    aiGroundingNotes: "Mostly manual = high automation potential. Use to calculate FTE redeployment opportunity."
  },
  {
    id: "q1_process_bottlenecks",
    tier: "registration",
    dimension: "consolidation_close",
    order: 12,
    questionType: "multi_select",
    questionText: "Which of the following process areas cause the most friction or delays in your finance function?",
    helpText: "Select up to 3 areas that represent your biggest pain points. These help us focus recommendations on your priority areas.",
    required: true,
    options: [
      { value: "close", label: "Month-end close and consolidation", description: "Takes too long, requires too much effort" },
      { value: "budgeting", label: "Annual budgeting cycle", description: "Lengthy, cumbersome, too many iterations" },
      { value: "forecasting", label: "Forecasting and reforecasting", description: "Slow, inaccurate, or too infrequent" },
      { value: "reporting", label: "Management reporting", description: "Manual report production, inconsistent formats" },
      { value: "data_collection", label: "Data collection from the business", description: "Chasing inputs, inconsistent submissions" },
      { value: "intercompany", label: "Intercompany and eliminations", description: "Complex reconciliations, mismatches" },
      { value: "variance_analysis", label: "Variance analysis and commentary", description: "Time-consuming, lacks actionable insights" },
      { value: "approvals", label: "Approvals and workflow", description: "Slow sign-offs, unclear processes" }
    ],
    scoringConfig: { maxSelections: 3 },
    multiSelectScoringMode: "penalty", // More bottlenecks = worse situation
    aiGroundingNotes: "Map bottlenecks to EPM module recommendations. Close/consolidation → CCH Tagetik/OneStream. Forecasting → Anaplan/Pigment."
  },

  // Readiness Indicators (2 Questions)
  {
    id: "q1_budget_availability",
    tier: "registration",
    dimension: "qualification",
    order: 13,
    questionType: "single_select",
    questionText: "Is there budget allocated or available for finance transformation initiatives in the next 12-18 months?",
    helpText: "Consider both technology investment and implementation/consulting costs. This helps us understand the practical readiness for transformation.",
    required: true,
    options: [
      { value: "none", label: "No budget currently allocated", description: "Would need to build a business case from scratch" },
      { value: "exploring", label: "Exploring funding options", description: "Early discussions but no commitment yet" },
      { value: "partial", label: "Some budget available", description: "Funding for initial phases or pilot projects" },
      { value: "approved", label: "Budget approved for specific initiative", description: "Committed funding for defined scope" },
      { value: "significant", label: "Significant multi-year budget", description: "Major programme funding already secured" }
    ],
    scoringConfig: { weights: { none: 1, exploring: 2, partial: 3, approved: 4, significant: 5 } },
    aiGroundingNotes: "Approved/Significant = high-priority lead. None/Exploring = nurture track, focus on building business case."
  },
  {
    id: "q1_stakeholder_buyin",
    tier: "registration",
    dimension: "organisation_people",
    order: 14,
    questionType: "slider",
    questionText: "How would you rate the level of stakeholder buy-in for finance transformation within your organisation?",
    helpText: "Consider support from the CFO, CEO, Board, and business unit leaders. Strong sponsorship is critical for successful transformation.",
    required: true,
    sliderConfig: {
      min: 1,
      max: 5,
      labels: {
        1: "No sponsorship – Finance working alone",
        2: "Limited support – CFO engaged but others sceptical",
        3: "Moderate buy-in – Key stakeholders aware and supportive",
        4: "Strong support – Executive sponsor with cross-functional backing",
        5: "Full alignment – Board-level priority with dedicated resources"
      }
    },
    aiGroundingNotes: "Score ≥4 = transformation-ready. Score 1-2 = may need stakeholder engagement strategy before technical solution."
  }
];

// ============================================
// TIER 2: PRE-ASSESSMENT (24 Questions)
// ============================================

export const PRE_ASSESSMENT_QUESTIONS: QuestionDefinition[] = [
  // Area 0: Framing & Sizing Questions (5Q)
  {
    id: "q2_annual_revenue",
    tier: "pre_assessment",
    dimension: "sizing",
    order: 1,
    questionType: "single_select",
    questionText: "What is your organisation's approximate annual revenue?",
    helpText: "This helps us benchmark your organisation and tailor recommendations appropriate to your scale.",
    required: true,
    options: [
      { value: "under_10m", label: "Under £10M", description: "Small organisation or early-stage business" },
      { value: "10_50m", label: "£10-50M", description: "Growing mid-market organisation" },
      { value: "50_100m", label: "£50-100M", description: "Established mid-market organisation" },
      { value: "100_500m", label: "£100-500M", description: "Large mid-market or small enterprise" },
      { value: "500m_1b", label: "£500M-1B", description: "Large enterprise" },
      { value: "over_1b", label: "Over £1B", description: "Major enterprise organisation" }
    ],
    scoringConfig: { type: "sizing", weights: { under_10m: 1, "10_50m": 2, "50_100m": 3, "100_500m": 4, "500m_1b": 5, over_1b: 6 } },
    aiGroundingNotes: "Revenue band determines complexity benchmarks and appropriate EPM platform recommendations. Larger organisations typically need more sophisticated solutions."
  },
  {
    id: "q2_industry_sector",
    tier: "pre_assessment",
    dimension: "sizing",
    order: 2,
    questionType: "single_select",
    questionText: "Which industry sector best describes your organisation?",
    helpText: "This allows us to compare your performance against industry-specific benchmarks and tailor recommendations to sector norms.",
    required: true,
    options: [
      { value: "technology", label: "Technology", description: "Software, IT services, digital platforms" },
      { value: "financial_services", label: "Financial Services", description: "Banking, insurance, asset management, fintech" },
      { value: "professional_services", label: "Professional Services", description: "Consulting, legal, accounting, engineering services" },
      { value: "manufacturing", label: "Manufacturing", description: "Industrial, consumer goods, automotive, aerospace" },
      { value: "pharmaceuticals", label: "Pharmaceuticals & Life Sciences", description: "Pharma, biotech, medical devices" },
      { value: "retail", label: "Retail & Consumer", description: "Retail, e-commerce, consumer products, hospitality" },
      { value: "healthcare", label: "Healthcare", description: "Hospitals, healthcare providers, health services" },
      { value: "energy", label: "Energy & Utilities", description: "Oil & gas, renewables, utilities, mining" },
      { value: "construction", label: "Construction & Real Estate", description: "Construction, property development, real estate" },
      { value: "transport_logistics", label: "Transport & Logistics", description: "Shipping, logistics, aviation, rail" },
      { value: "media_telecoms", label: "Media & Telecommunications", description: "Broadcasting, telecoms, digital media" },
      { value: "public_sector", label: "Public Sector & Education", description: "Government, education, non-profit" },
      { value: "other", label: "Other (please specify)", description: "Please describe your industry sector" }
    ],
    scoringConfig: { type: "industry", allowOther: true },
    aiGroundingNotes: "Industry sector determines benchmark comparisons and sector-specific EPM recommendations. Key for accurate benchmarking against peers."
  },
  {
    id: "q2_finance_team_size",
    tier: "pre_assessment",
    dimension: "sizing",
    order: 3,
    questionType: "structured",
    questionText: "What is the size of your finance function?",
    helpText: "This helps us understand your current finance capacity and calculate efficiency benchmarks.",
    required: true,
    structuredFields: [
      { id: "finance_fte", label: "Number of finance team members (FTE)", type: "number", placeholder: "e.g., 12" },
      { id: "finance_budget", label: "Annual finance function budget (£ thousands)", type: "number", placeholder: "e.g., 800" }
    ],
    scoringConfig: { type: "structured" },
    aiGroundingNotes: "Calculates Finance Cost Ratio and FTE per £M revenue. Compare to benchmarks by size band to identify efficiency opportunities."
  },
  {
    id: "q2_transformation_budget",
    tier: "pre_assessment",
    dimension: "sizing",
    order: 4,
    questionType: "single_select",
    questionText: "What budget is available for finance transformation initiatives?",
    helpText: "Consider both technology investment and implementation/consulting costs over the next 12-18 months.",
    required: true,
    options: [
      { value: "none", label: "No budget allocated", description: "Would need to build a business case from scratch" },
      { value: "under_50k", label: "Under £50k", description: "Limited budget for small improvements" },
      { value: "50k_100k", label: "£50k-100k", description: "Budget for targeted initiatives" },
      { value: "100k_250k", label: "£100k-250k", description: "Moderate budget for significant change" },
      { value: "250k_500k", label: "£250k-500k", description: "Substantial budget for major transformation" },
      { value: "over_500k", label: "Over £500k", description: "Significant multi-year programme funding" }
    ],
    scoringConfig: { type: "sizing", weights: { none: 1, under_50k: 2, "50k_100k": 3, "100k_250k": 4, "250k_500k": 5, over_500k: 6 } },
    aiGroundingNotes: "Budget availability determines feasibility and scope of EPM recommendations. Over £250k enables enterprise platform consideration."
  },
  {
    id: "q2_project_timeline",
    tier: "pre_assessment",
    dimension: "sizing",
    order: 5,
    questionType: "single_select",
    questionText: "When do you plan to start your finance transformation?",
    helpText: "This helps us understand urgency and tailor our engagement approach.",
    required: true,
    options: [
      { value: "already_started", label: "Already started", description: "Transformation is underway" },
      { value: "next_3_months", label: "Next 3 months", description: "Imminent start planned" },
      { value: "3_6_months", label: "3-6 months", description: "Near-term planning phase" },
      { value: "6_12_months", label: "6-12 months", description: "Medium-term planning" },
      { value: "12_plus_months", label: "12+ months", description: "Longer-term consideration" },
      { value: "no_timeline", label: "No specific timeline", description: "Exploratory stage" }
    ],
    scoringConfig: { 
      type: "urgency", 
      weights: { already_started: 6, next_3_months: 5, "3_6_months": 4, "6_12_months": 3, "12_plus_months": 2, no_timeline: 1 },
      vendorAffinity: {
        already_started: ["workday_adaptive", "planful", "vena", "board"],
        next_3_months: ["workday_adaptive", "planful", "vena", "board"],
        "3_6_months": ["anaplan", "board", "jedox", "prophix"],
        "6_12_months": ["anaplan", "onestream", "oracle_epm"],
        "12_plus_months": ["onestream", "oracle_epm", "sap_sac"],
        no_timeline: []
      }
    },
    aiGroundingNotes: "Timeline indicates lead priority and vendor fit. Already started or next 3 months = high-priority, consider rapid-deploy platforms. No timeline = nurture track."
  },
  {
    id: "q2_current_systems",
    tier: "pre_assessment",
    dimension: "sizing",
    order: 6,
    questionType: "multi_select",
    questionText: "Which General Ledger (GL) or Enterprise Resource Planning (ERP) systems does your organisation currently use?",
    helpText: "The General Ledger is your main accounting record where all financial transactions are recorded. ERP systems are core business software that manage finance, HR, supply chain, and other operations. Select all systems that are part of your finance technology landscape.",
    required: true,
    options: [
      { value: "sap", label: "SAP", description: "SAP ECC, S/4HANA, or SAP Business One" },
      { value: "oracle", label: "Oracle", description: "Oracle EBS, Oracle Cloud, or JD Edwards" },
      { value: "dynamics_365", label: "Microsoft Dynamics 365", description: "Dynamics 365 Finance/Business Central" },
      { value: "workday", label: "Workday", description: "Workday Financial Management" },
      { value: "netsuite", label: "NetSuite", description: "Oracle NetSuite" },
      { value: "sage", label: "Sage", description: "Sage Intacct, Sage 200, or other Sage products" },
      { value: "quickbooks", label: "QuickBooks", description: "QuickBooks Online or Desktop" },
      { value: "xero", label: "Xero", description: "Xero cloud accounting" },
      { value: "custom", label: "Custom/In-house", description: "Internally developed systems" },
      { value: "multiple_disconnected", label: "Multiple disconnected systems", description: "Several systems with limited integration" },
      { value: "other", label: "Other", description: "Other finance systems not listed" }
    ],
    scoringConfig: { maxSelections: 5 },
    multiSelectScoringMode: "penalty", // Multiple disconnected systems = fragmentation penalty
    aiGroundingNotes: "Current system landscape informs integration requirements and EPM platform compatibility. Multiple disconnected systems indicates higher integration complexity."
  },
  
  // Area 1: Process Performance – Consolidation (4Q)
  {
    id: "q2_consolidation_centralisation",
    tier: "pre_assessment",
    dimension: "consolidation_close",
    order: 7,
    questionType: "single_select",
    questionText: "How would you categorise the current rate of centralisation of your Consolidation process?",
    helpText: "Consolidation is the process of combining financial results from multiple entities, subsidiaries, or business units into a single set of group accounts. This can be done centrally by one team, or each entity can prepare their own results before submitting them. Which model best describes your organisation?",
    required: true,
    options: [
      { value: "fully_decentralised", label: "Fully decentralised", description: "Each entity or Business Unit performs their own consolidation independently" },
      { value: "mostly_decentralised", label: "Mostly decentralised", description: "Business Units are primarily responsible; limited central coordination" },
      { value: "mixed", label: "Mixed", description: "Some processes centralised, some remain decentralised (e.g., regional hubs)" },
      { value: "mostly_centralised", label: "Mostly centralised", description: "Central team consolidates most, with some local involvement" },
      { value: "fully_centralised", label: "Fully centralised", description: "One central finance team consolidates all entities globally" }
    ],
    scoringConfig: { weights: { fully_decentralised: 1, mostly_decentralised: 2, mixed: 3, mostly_centralised: 4, fully_centralised: 5 } },
    aiGroundingNotes: "Mixed or High Centralisation = +15 EPM-readiness points"
  },
  {
    id: "q2_close_cycle",
    tier: "pre_assessment",
    dimension: "consolidation_close",
    order: 8,
    questionType: "number",
    questionText: "Using your last 3 month-ends as reference, on average how many days did it take your Finance team to close the books and finish consolidation?",
    helpText: "'Closing the books' means completing all the accounting entries and adjustments for a period, reconciling accounts, and preparing final financial statements. Count from the period-end date (e.g., 31st March) to the date when your consolidated numbers are finalised and ready for reporting. Report generation duration is captured separately.",
    required: true,
    scoringConfig: { type: "range", benchmarks: { leading: 5, advanced: 8, established: 12, developing: 20 } },
    aiGroundingNotes: "Benchmark: <5 days = Leading, 5-8 = Advanced, 8-12 = Established, 12-20 = Developing, 20+ = Ad-hoc"
  },
  {
    id: "q2_close_reliability",
    tier: "pre_assessment",
    dimension: "consolidation_close",
    order: 9,
    questionType: "single_select",
    questionText: "Using your last 3 month-ends as reference, did your Finance team close the books and finish consolidation on target?",
    helpText: "'On target' means meeting your agreed close-completion date without slippage.",
    required: true,
    options: [
      { value: "always", label: "Yes, always on target (or early)", description: "Met or beat targets for all 3 closes" },
      { value: "mostly", label: "Mostly on target", description: "Met targets for 2 out of 3 closes" },
      { value: "sometimes", label: "Sometimes on target", description: "Met targets for 1 out of 3 closes" },
      { value: "rarely", label: "Rarely on target", description: "Missed most closes" },
      { value: "never", label: "Never on target; always late", description: "All 3 closes were late" }
    ],
    scoringConfig: { weights: { always: 5, mostly: 4, sometimes: 3, rarely: 2, never: 1 } },
    aiGroundingNotes: "Rarely/Never = +20 EPM-readiness points (reliability issues signal process gaps)"
  },
  {
    id: "q2_manual_consolidation",
    tier: "pre_assessment",
    dimension: "consolidation_close",
    order: 10,
    questionType: "single_select",
    questionText: "How would you categorise the amount of manual work in your consolidation process?",
    helpText: "Consider the full consolidation workflow: data extraction, transformation, entity matching, elimination entries, reporting. What % requires manual hands-on work?",
    required: true,
    options: [
      { value: "very_high", label: "Very high (>80% manual)", description: "Excel, cut-and-paste, manual calculations" },
      { value: "high", label: "High (60-80% manual)", description: "Some automation exists but most tasks are manual" },
      { value: "medium", label: "Medium (40-60% manual)", description: "A mix of automated and manual steps" },
      { value: "low", label: "Low (20-40% manual)", description: "Most consolidation is automated; exceptions handled manually" },
      { value: "very_low", label: "Very low (<20% manual)", description: "Highly automated; near straight-through processing" }
    ],
    scoringConfig: { weights: { very_high: 1, high: 2, medium: 3, low: 4, very_low: 5 } },
    aiGroundingNotes: "High/Very High = +25 EPM-readiness points (automation is core EPM value)"
  },
  
  // Area 2: Process Performance – Reporting (5Q)
  {
    id: "q2_reporting_centralisation",
    tier: "pre_assessment",
    dimension: "management_reporting",
    order: 11,
    questionType: "single_select",
    questionText: "How would you categorise the current rate of centralisation of Management and Business Unit reporting in your Finance function?",
    helpText: "This question is about who produces management reports (monthly packs, dashboards, performance updates) - not about who creates budgets and forecasts. Do individual Business Units create their own reports independently, or does a central team produce standardised reports for the whole organisation?",
    required: true,
    options: [
      { value: "fully_decentralised", label: "Fully decentralised", description: "Each Business Unit produces their own reports independently" },
      { value: "mostly_decentralised", label: "Mostly decentralised", description: "Business Units primarily responsible; limited central standards" },
      { value: "mixed", label: "Mixed", description: "Some central reports, some Business Unit-specific" },
      { value: "mostly_centralised", label: "Mostly centralised", description: "Central team produces most reports" },
      { value: "fully_centralised", label: "Fully centralised", description: "Single central reporting function" }
    ],
    scoringConfig: { weights: { fully_decentralised: 1, mostly_decentralised: 2, mixed: 3, mostly_centralised: 4, fully_centralised: 5 } }
  },
  {
    id: "q2_reporting_cycle",
    tier: "pre_assessment",
    dimension: "management_reporting",
    order: 12,
    questionType: "number",
    questionText: "How many days after close does it typically take to issue your Management Board Pack or primary management report?",
    helpText: "Count from close completion to when the full management pack is issued to leadership.",
    required: true,
    scoringConfig: { type: "range", benchmarks: { leading: 0, advanced: 3, established: 5, developing: 8 } }
  },
  {
    id: "q2_reporting_manual",
    tier: "pre_assessment",
    dimension: "management_reporting",
    order: 13,
    questionType: "single_select",
    questionText: "How would you categorise the amount of manual work in your management reporting process?",
    required: true,
    options: [
      { value: "very_high", label: "Very high (>80% manual)" },
      { value: "high", label: "High (60-80% manual)" },
      { value: "medium", label: "Medium (40-60% manual)" },
      { value: "low", label: "Low (20-40% manual)" },
      { value: "very_low", label: "Very low (<20% manual)" }
    ],
    scoringConfig: { weights: { very_high: 1, high: 2, medium: 3, low: 4, very_low: 5 } }
  },
  {
    id: "q2_self_service",
    tier: "pre_assessment",
    dimension: "management_reporting",
    order: 14,
    questionType: "single_select",
    questionText: "What level of self-service analytics capability exists for business users?",
    required: true,
    options: [
      { value: "none", label: "None", description: "All reports produced by Finance" },
      { value: "limited", label: "Limited", description: "Some static dashboards available" },
      { value: "moderate", label: "Moderate", description: "Interactive dashboards with drill-down" },
      { value: "advanced", label: "Advanced", description: "Full self-service with ad-hoc query capability" },
      { value: "leading", label: "Leading", description: "AI-assisted insights and predictive analytics" }
    ],
    scoringConfig: { weights: { none: 1, limited: 2, moderate: 3, advanced: 4, leading: 5 } }
  },
  {
    id: "q2_data_visualisation",
    tier: "pre_assessment",
    dimension: "management_reporting",
    order: 15,
    questionType: "multi_select",
    questionText: "Which data visualisation and dashboard tools do you currently use?",
    helpText: "Select all that apply. Many organisations use a combination of tools.",
    required: true,
    options: [
      { value: "excel_only", label: "Excel/spreadsheet only" },
      { value: "basic_bi", label: "Basic Business Intelligence (BI) tool implementation", description: "Simple reporting and dashboarding software" },
      { value: "established_bi", label: "Established BI with standard dashboards", description: "Mature reporting tools with regular use across the organisation" },
      { value: "advanced_bi", label: "Advanced BI with embedded analytics", description: "Sophisticated analytics integrated into business processes" },
      { value: "leading_bi", label: "Leading-edge with real-time and predictive", description: "Cutting-edge tools providing live data and forward-looking insights" }
    ],
    scoringConfig: { multiSelectScoring: true, weights: { excel_only: 1, basic_bi: 2, established_bi: 3, advanced_bi: 4, leading_bi: 5 } },
    multiSelectScoringMode: "cumulative" // More advanced tools = higher capability
  },
  
  // Area 3: Process Performance – Planning (4Q)
  {
    id: "q2_planning_centralisation",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 16,
    questionType: "single_select",
    questionText: "How would you categorise the current rate of centralisation of your Planning and Forecasting process?",
    helpText: "Planning centralisation refers to whether budgets and forecasts are created by individual Business Units independently, or coordinated and compiled by a central Financial Planning & Analysis (FP&A) team. A centralised approach typically provides more consistency and control, while a decentralised approach gives local teams more autonomy.",
    required: true,
    options: [
      { value: "fully_decentralised", label: "Fully decentralised", description: "Each Business Unit plans independently with no central coordination" },
      { value: "mostly_decentralised", label: "Mostly decentralised", description: "Business Unit-led with light central consolidation" },
      { value: "mixed", label: "Mixed", description: "Blend of central and Business Unit-led planning" },
      { value: "mostly_centralised", label: "Mostly centralised", description: "Central Financial Planning & Analysis (FP&A) team drives most planning with Business Unit input" },
      { value: "fully_centralised", label: "Fully centralised", description: "Single central planning function coordinates all budgets and forecasts" }
    ],
    scoringConfig: { weights: { fully_decentralised: 1, mostly_decentralised: 2, mixed: 3, mostly_centralised: 4, fully_centralised: 5 } }
  },
  {
    id: "q2_planning_cycle",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 17,
    questionType: "number",
    questionText: "How many weeks does your annual budgeting/planning cycle typically take from kickoff to board approval?",
    helpText: "Count from when planning starts to final board sign-off.",
    required: true,
    scoringConfig: { type: "range", benchmarks: { leading: 4, advanced: 8, established: 12, developing: 16 } }
  },
  {
    id: "q2_forecast_frequency",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 18,
    questionType: "single_select",
    questionText: "How frequently do you produce rolling forecasts?",
    helpText: "A rolling forecast is a regularly updated prediction of future financial performance that extends a fixed number of months or quarters into the future. Unlike a static annual budget, rolling forecasts are refreshed periodically (monthly or quarterly) and always look ahead by the same time horizon (e.g., always 12-18 months ahead).",
    required: true,
    options: [
      { value: "never", label: "Never – annual budget only", description: "We set one budget at the start of the year and don't update it" },
      { value: "quarterly", label: "Quarterly reforecasts", description: "We update our forecast every three months" },
      { value: "monthly", label: "Monthly reforecasts", description: "We update our forecast every month" },
      { value: "continuous", label: "Continuous/rolling forecasts (12-18 month horizon)", description: "We maintain a constantly-updated view of the next 12-18 months" },
      { value: "real_time", label: "Real-time/driver-based with automated triggers", description: "Forecasts update automatically when key business metrics change" }
    ],
    scoringConfig: { weights: { never: 1, quarterly: 2, monthly: 3, continuous: 4, real_time: 5 } }
  },
  {
    id: "q2_scenario_planning",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 19,
    questionType: "single_select",
    questionText: "What scenario planning capability exists in your organisation?",
    helpText: "Scenario planning involves creating multiple versions of your forecast based on different assumptions about the future (e.g., 'what if sales grow by 10%?' or 'what if costs increase by 5%?'). This helps organisations prepare for uncertainty and make better decisions by understanding the range of possible outcomes.",
    required: true,
    options: [
      { value: "none", label: "None", description: "We only produce a single forecast with no alternative versions" },
      { value: "basic", label: "Basic", description: "We create simple best-case/worst-case versions in spreadsheets" },
      { value: "moderate", label: "Moderate", description: "We model multiple scenarios linked to key business assumptions" },
      { value: "advanced", label: "Advanced", description: "We use driver-based models that automatically calculate the impact of changes" },
      { value: "leading", label: "Leading", description: "We use advanced simulations and AI to generate and evaluate many possible scenarios" }
    ],
    scoringConfig: { 
      weights: { none: 1, basic: 2, moderate: 3, advanced: 4, leading: 5 },
      vendorAffinity: {
        none: ["vena", "planful"],
        basic: ["prophix", "jedox"],
        moderate: ["workday_adaptive", "board"],
        advanced: ["anaplan", "onestream", "board"],
        leading: ["anaplan", "onestream", "oracle_epm", "sap_sac"]
      }
    },
    aiGroundingNotes: "Advanced/Leading scenario planning = need for Anaplan, Pigment, or OneStream with driver-based modelling."
  },
  
  // Area 4: Complexity (3Q)
  {
    id: "q2_multi_currency",
    tier: "pre_assessment",
    dimension: "consolidation_close",
    order: 20,
    questionType: "single_select",
    questionText: "How many currencies does your organisation operate in?",
    required: true,
    options: [
      { value: "single", label: "Single currency" },
      { value: "2_5", label: "2-5 currencies" },
      { value: "6_15", label: "6-15 currencies" },
      { value: "16_plus", label: "16+ currencies" }
    ],
    scoringConfig: { type: "complexity", weights: { single: 1, "2_5": 2, "6_15": 3, "16_plus": 4 } }
  },
  {
    id: "q2_intercompany",
    tier: "pre_assessment",
    dimension: "consolidation_close",
    order: 21,
    questionType: "single_select",
    questionText: "How complex is your intercompany accounting and elimination process?",
    helpText: "Intercompany transactions occur when entities within the same group trade with each other (e.g., one subsidiary sells goods to another). When preparing group accounts, these internal transactions must be 'eliminated' so they don't artificially inflate the group's total revenue or costs. The more entities and cross-border transactions you have, the more complex this process becomes.",
    required: true,
    options: [
      { value: "minimal", label: "Minimal", description: "Few or no transactions between group companies" },
      { value: "simple", label: "Simple", description: "Some internal transactions with straightforward removal during consolidation" },
      { value: "moderate", label: "Moderate", description: "Multiple entities trading with each other, but manageable" },
      { value: "complex", label: "Complex", description: "Significant internal trading with transfer pricing considerations and multi-tier ownership" },
      { value: "very_complex", label: "Very complex", description: "Highly intricate structures across multiple regions with frequent organisational changes" }
    ],
    scoringConfig: { 
      type: "complexity", 
      weights: { minimal: 1, simple: 2, moderate: 3, complex: 4, very_complex: 5 },
      vendorAffinity: {
        minimal: ["vena", "planful", "jedox"],
        simple: ["prophix", "workday_adaptive", "board"],
        moderate: ["board", "anaplan", "workday_adaptive"],
        complex: ["onestream", "oracle_epm", "sap_sac"],
        very_complex: ["onestream", "oracle_epm"]
      }
    },
    aiGroundingNotes: "Complex/Very complex intercompany = need for unified platforms like OneStream with strong consolidation capabilities."
  },
  {
    id: "q2_regulatory",
    tier: "pre_assessment",
    dimension: "financial_controls_compliance",
    order: 22,
    questionType: "single_select",
    questionText: "What is the level of regulatory reporting complexity in your industry?",
    required: true,
    options: [
      { value: "minimal", label: "Minimal", description: "Standard statutory requirements only" },
      { value: "moderate", label: "Moderate", description: "Some industry-specific requirements" },
      { value: "high", label: "High", description: "Significant regulatory reporting (e.g., financial services, healthcare)" },
      { value: "very_high", label: "Very high", description: "Multiple regulatory bodies, frequent changes, penalties for non-compliance" }
    ],
    scoringConfig: { 
      type: "complexity",
      weights: { minimal: 1, moderate: 2, high: 3, very_high: 4 },
      vendorAffinity: {
        minimal: ["planful", "vena", "jedox"],
        moderate: ["workday_adaptive", "prophix", "board"],
        high: ["onestream", "oracle_epm", "sap_sac"],
        very_high: ["onestream", "oracle_epm", "sap_sac"]
      }
    },
    aiGroundingNotes: "High/Very high regulatory complexity favours OneStream, CCH Tagetik, Oracle EPM with strong compliance features."
  },
  
  // Area 5: Accuracy & Data Integration (2Q)
  {
    id: "q2_data_accuracy",
    tier: "pre_assessment",
    dimension: "data_analytics",
    order: 23,
    questionType: "single_select",
    questionText: "How would you rate the overall accuracy and reliability of your financial data?",
    required: true,
    options: [
      { value: "poor", label: "Poor", description: "Frequent errors, manual corrections common" },
      { value: "fair", label: "Fair", description: "Some errors, periodic reconciliation issues" },
      { value: "good", label: "Good", description: "Generally reliable, occasional discrepancies" },
      { value: "very_good", label: "Very good", description: "High accuracy, rare issues" },
      { value: "excellent", label: "Excellent", description: "Near-perfect, automated validation in place" }
    ],
    scoringConfig: { weights: { poor: 1, fair: 2, good: 3, very_good: 4, excellent: 5 } }
  },
  {
    id: "q2_data_integration",
    tier: "pre_assessment",
    dimension: "data_analytics",
    order: 24,
    questionType: "single_select",
    questionText: "How well integrated are your finance data sources?",
    required: true,
    options: [
      { value: "siloed", label: "Siloed", description: "Multiple disconnected systems, manual data movement" },
      { value: "partially", label: "Partially integrated", description: "Some automated feeds, significant manual work" },
      { value: "mostly", label: "Mostly integrated", description: "Key systems connected, some gaps remain" },
      { value: "well", label: "Well integrated", description: "Comprehensive integration, minimal manual intervention" },
      { value: "fully", label: "Fully integrated", description: "Single source of truth, real-time data flows" }
    ],
    scoringConfig: { weights: { siloed: 1, partially: 2, mostly: 3, well: 4, fully: 5 } }
  },
  
  // Area 6: Systems (4Q)
  {
    id: "q2_erp_landscape",
    tier: "pre_assessment",
    dimension: "technology_systems",
    order: 25,
    questionType: "single_select",
    questionText: "How would you describe your current ERP/core finance system landscape?",
    required: true,
    options: [
      { value: "legacy_multiple", label: "Multiple legacy systems", description: "Several older systems, limited integration" },
      { value: "legacy_single", label: "Single legacy system", description: "One older system, outdated but functional" },
      { value: "modern_multiple", label: "Multiple modern systems", description: "Recent systems but not fully integrated" },
      { value: "modern_single", label: "Single modern ERP", description: "Modern integrated ERP platform" },
      { value: "cloud_native", label: "Cloud-native platform", description: "Fully cloud-based with advanced capabilities" }
    ],
    scoringConfig: { weights: { legacy_multiple: 1, legacy_single: 2, modern_multiple: 3, modern_single: 4, cloud_native: 5 } }
  },
  {
    id: "q2_planning_tools",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 26,
    questionType: "single_select",
    questionText: "What tools do you primarily use for budgeting, planning, and forecasting?",
    required: true,
    options: [
      { value: "spreadsheets", label: "Spreadsheets only", description: "Excel/Google Sheets for all planning" },
      { value: "basic_tool", label: "Basic planning tool", description: "Simple planning software or add-ins" },
      { value: "departmental", label: "Departmental EPM", description: "EPM for specific functions (e.g., FP&A only)" },
      { value: "enterprise", label: "Enterprise EPM", description: "Organisation-wide integrated EPM platform" },
      { value: "advanced", label: "Advanced EPM", description: "Full EPM with driver-based models, AI/ML capabilities" }
    ],
    scoringConfig: { weights: { spreadsheets: 1, basic_tool: 2, departmental: 3, enterprise: 4, advanced: 5 } },
    questionWeight: 2.0,
    isCritical: true,
    criticalThreshold: 1,
    criticalFlag: "SPREADSHEET_ONLY_PLANNING",
    aiGroundingNotes: "Planning tools directly impact FP&A capability maturity. Spreadsheet-only indicates high EPM transformation potential."
  },
  {
    id: "q2_current_epm_vendor",
    tier: "pre_assessment",
    dimension: "technology_systems",
    order: 27,
    questionType: "multi_select",
    questionText: "If you have an EPM/CPM system, which platform(s) are you currently using?",
    helpText: "Select all EPM/CPM platforms currently deployed in your organisation. Skip if using spreadsheets only.",
    required: false,
    options: [
      { value: "none", label: "No EPM system / Spreadsheets only", description: "Currently using Excel or similar for planning" },
      { value: "anaplan", label: "Anaplan", description: "Cloud-native connected planning platform" },
      { value: "onestream", label: "OneStream", description: "Unified CPM platform for consolidation, planning, reporting" },
      { value: "oracle_epm", label: "Oracle EPM Cloud", description: "Oracle's enterprise performance management suite" },
      { value: "sap_sac", label: "SAP Analytics Cloud", description: "SAP's unified analytics and planning platform" },
      { value: "board", label: "Board", description: "Unified decision-making platform with BI and planning" },
      { value: "workday_adaptive", label: "Workday Adaptive Planning", description: "Cloud planning with strong Workday integration" },
      { value: "planful", label: "Planful", description: "Cloud FP&A platform for continuous planning" },
      { value: "vena", label: "Vena", description: "Excel-native complete planning platform" },
      { value: "prophix", label: "Prophix", description: "CPM platform for mid-market finance teams" },
      { value: "jedox", label: "Jedox", description: "Self-service EPM with Excel integration" },
      { value: "ibm_planning", label: "IBM Planning Analytics", description: "TM1-powered enterprise planning platform" },
      { value: "wolters_kluwer", label: "Wolters Kluwer CCH Tagetik", description: "Unified performance management for regulated industries" },
      { value: "insightsoftware", label: "insightsoftware (Longview/Certent)", description: "Financial reporting and consolidation solutions" },
      { value: "hyperion", label: "Oracle Hyperion (on-prem)", description: "Legacy Oracle EPM on-premises platform" },
      { value: "other", label: "Other EPM platform", description: "Another EPM/CPM system not listed" }
    ],
    scoringConfig: { 
      type: "vendor_tier",
      maxSelections: 5,
      vendorTiers: {
        tier1: ["anaplan", "onestream", "oracle_epm", "sap_sac", "board"],
        tier2: ["workday_adaptive", "planful", "vena", "prophix", "jedox"],
        legacy: ["hyperion", "ibm_planning"],
        specialist: ["wolters_kluwer", "insightsoftware"]
      },
      tierScores: { tier1: 5, tier2: 4, specialist: 3, legacy: 2, none: 1, other: 2 },
      vendorTierMode: "fragmentation_penalty",
      fragmentationPenalty: 0.5,
      mixedTierPenalty: 0.25
    },
    questionWeight: 2.5,
    isCritical: true,
    criticalThreshold: 1,
    criticalFlag: "NO_EPM_SYSTEM",
    multiSelectScoringMode: "penalty", // Multiple EPM vendors = fragmentation
    aiGroundingNotes: "EPM vendor tier directly impacts technology_systems score. Tier1 (Leader) vendors = +15 points, Tier2 = +10 points. Multiple systems may indicate integration complexity. 'None' indicates greenfield EPM opportunity."
  },
  {
    id: "q2_cloud_adoption",
    tier: "pre_assessment",
    dimension: "technology_systems",
    order: 28,
    questionType: "single_select",
    questionText: "What is your current level of cloud adoption for finance applications?",
    required: true,
    options: [
      { value: "none", label: "None", description: "All on-premise" },
      { value: "minimal", label: "Minimal", description: "Exploring cloud, limited adoption" },
      { value: "partial", label: "Partial", description: "Some applications in cloud" },
      { value: "significant", label: "Significant", description: "Majority cloud-based" },
      { value: "cloud_first", label: "Cloud-first", description: "Cloud-native strategy, minimal on-premise" }
    ],
    scoringConfig: { weights: { none: 1, minimal: 2, partial: 3, significant: 4, cloud_first: 5 } }
  },
  {
    id: "q2_automation",
    tier: "pre_assessment",
    dimension: "technology_systems",
    order: 29,
    questionType: "single_select",
    questionText: "What is the current level of process automation in your finance function?",
    required: true,
    options: [
      { value: "minimal", label: "Minimal", description: "Most processes manual" },
      { value: "basic", label: "Basic", description: "Some macros/simple automation" },
      { value: "moderate", label: "Moderate", description: "RPA for selected processes" },
      { value: "advanced", label: "Advanced", description: "Widespread automation across finance" },
      { value: "intelligent", label: "Intelligent automation", description: "AI/ML-driven automation, predictive capabilities" }
    ],
    scoringConfig: { weights: { minimal: 1, basic: 2, moderate: 3, advanced: 4, intelligent: 5 } }
  },
  
  // Area 7: Development Capability (2Q)
  {
    id: "q2_change_capacity",
    tier: "pre_assessment",
    dimension: "organisation_people",
    order: 30,
    questionType: "single_select",
    questionText: "How would you rate your finance team's capacity and appetite for change?",
    required: true,
    options: [
      { value: "low", label: "Low", description: "Resistant to change, limited bandwidth" },
      { value: "moderate", label: "Moderate", description: "Open to change but constrained capacity" },
      { value: "good", label: "Good", description: "Willing and reasonably capable" },
      { value: "high", label: "High", description: "Change-ready with dedicated resources" },
      { value: "very_high", label: "Very high", description: "Transformation-focused, experienced change team" }
    ],
    scoringConfig: { weights: { low: 1, moderate: 2, good: 3, high: 4, very_high: 5 } }
  },
  {
    id: "q2_skills_gap",
    tier: "pre_assessment",
    dimension: "organisation_people",
    order: 31,
    questionType: "single_select",
    questionText: "How significant are the skills gaps in your finance team for modern finance capabilities?",
    helpText: "Consider skills in analytics, technology, business partnering, and change management.",
    required: true,
    options: [
      { value: "critical", label: "Critical", description: "Major gaps across most capability areas" },
      { value: "significant", label: "Significant", description: "Notable gaps in key areas" },
      { value: "moderate", label: "Moderate", description: "Some gaps but manageable" },
      { value: "minor", label: "Minor", description: "Small gaps, training can address" },
      { value: "minimal", label: "Minimal", description: "Team is well-equipped for modern finance" }
    ],
    scoringConfig: { weights: { critical: 1, significant: 2, moderate: 3, minor: 4, minimal: 5 } }
  },
  
  // Area 8: Planning Performance (3Q)
  {
    id: "q2_planning_reporting_time",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 32,
    questionType: "number",
    questionText: "Using your last 2 planning cycles as reference, on average how many days did it take your Finance team to generate and issue reports and analysis once plans were submitted and consolidated?",
    helpText: "Count from when plans are consolidated to when analysis reports are issued to stakeholders.",
    required: true,
    scoringConfig: { type: "range", benchmarks: { leading: 2, advanced: 5, established: 10, developing: 15 } },
    aiGroundingNotes: "Benchmark: <2 days = Leading, 2-5 = Advanced, 5-10 = Established, 10-15 = Developing, 15+ = Ad-hoc. High values indicate reporting bottleneck."
  },
  {
    id: "q2_planning_on_target",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 33,
    questionType: "single_select",
    questionText: "Using your last 2 planning cycles as reference, did your Finance team manage to deliver Budget / Forecast on time?",
    helpText: "'On time' means meeting your agreed submission and delivery dates without slippage.",
    required: true,
    options: [
      { value: "always", label: "Yes, always on target (or early)", description: "Met or beat targets for both cycles" },
      { value: "mostly", label: "Mostly on target", description: "Met targets most of the time" },
      { value: "sometimes", label: "Sometimes on target", description: "Mixed performance" },
      { value: "rarely", label: "Rarely on target", description: "Frequently missed deadlines" },
      { value: "never", label: "Never on target; always late", description: "Both cycles were late" }
    ],
    scoringConfig: { weights: { always: 5, mostly: 4, sometimes: 3, rarely: 2, never: 1 } },
    aiGroundingNotes: "Rarely/Never = +20 EPM-readiness points (reliability issues signal process gaps in planning)"
  },
  {
    id: "q2_manual_planning",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 34,
    questionType: "single_select",
    questionText: "Using your last 2 planning cycles as reference, how would you categorise the amount of manual work in the plan production, submission and aggregation process?",
    helpText: "Consider the full planning workflow: template distribution, data collection, consolidation, review cycles. What % requires manual hands-on work?",
    required: true,
    options: [
      { value: "very_high", label: "Very high (>80% manual)", description: "Excel, cut-and-paste, manual calculations" },
      { value: "high", label: "High (60-80% manual)", description: "Some automation exists but most tasks are manual" },
      { value: "medium", label: "Medium (40-60% manual)", description: "A mix of automated and manual steps" },
      { value: "low", label: "Low (20-40% manual)", description: "Most planning is automated; exceptions handled manually" },
      { value: "very_low", label: "Very low (<20% manual)", description: "Highly automated; near straight-through processing" }
    ],
    scoringConfig: { weights: { very_high: 1, high: 2, medium: 3, low: 4, very_low: 5 } },
    aiGroundingNotes: "High/Very High = +25 EPM-readiness points (automation is core EPM value for planning)"
  },
  
  // Area 9: Reporting Consistency (1Q)
  {
    id: "q2_reporting_inconsistency",
    tier: "pre_assessment",
    dimension: "management_reporting",
    order: 35,
    questionType: "single_select",
    questionText: "How would you categorise the reporting inconsistency and number of conflicting reports/views?",
    helpText: "Consider how often different reports show different numbers for the same metrics, or stakeholders receive conflicting information.",
    required: true,
    options: [
      { value: "very_high", label: "Very high", description: "Frequent conflicting reports; single source of truth is rare" },
      { value: "high", label: "High", description: "Regular inconsistencies between reports" },
      { value: "medium", label: "Medium", description: "Occasional discrepancies, manageable" },
      { value: "low", label: "Low", description: "Rare inconsistencies" },
      { value: "very_low", label: "Very low", description: "Consistent reporting across all views" }
    ],
    scoringConfig: { weights: { very_high: 1, high: 2, medium: 3, low: 4, very_low: 5 } },
    aiGroundingNotes: "High/Very High = strong data governance and EPM platform business case. Indicates lack of single source of truth."
  },
  
  // Area 10: Data & Scenario Complexity (2Q)
  {
    id: "q2_data_complexity",
    tier: "pre_assessment",
    dimension: "data_analytics",
    order: 36,
    questionType: "single_select",
    questionText: "Do your Financial Planning & Analysis (FP&A) and Consolidation processes require integration, transformation and analysis of large data sets (transactional, operational, etc)?",
    helpText: "FP&A is the function responsible for budgeting, forecasting, and financial analysis. Consider whether you need to bring in data from ERP, CRM, HR systems, or operational databases for planning and reporting.",
    required: true,
    options: [
      { value: "yes_significant", label: "Yes, significant", description: "Heavy reliance on large, complex data integrations" },
      { value: "yes_moderate", label: "Yes, moderate", description: "Regular need for external data integration" },
      { value: "some", label: "Some", description: "Occasional need for additional data sources" },
      { value: "minimal", label: "Minimal", description: "Mostly work with financial data only" },
      { value: "none", label: "None", description: "No integration with transactional/operational data" }
    ],
    scoringConfig: { type: "complexity", weights: { yes_significant: 5, yes_moderate: 4, some: 3, minimal: 2, none: 1 } },
    aiGroundingNotes: "Significant/Moderate = higher EPM platform requirements for data integration and ETL capabilities."
  },
  {
    id: "q2_scenario_complexity",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 37,
    questionType: "single_select",
    questionText: "How would you rate the need in your Financial Planning & Analysis (FP&A) processes for multi-scenario and complex driver-based modelling?",
    helpText: "Driver-based modelling means building financial plans that calculate automatically based on key business variables (like headcount or sales volume). Consider whether you need to model multiple scenarios, sensitivity analysis, or complex business drivers.",
    required: true,
    options: [
      { value: "very_high", label: "Very high", description: "Critical need for advanced modelling capabilities" },
      { value: "high", label: "High", description: "Strong need for multi-scenario planning" },
      { value: "moderate", label: "Moderate", description: "Some scenario modelling needs" },
      { value: "low", label: "Low", description: "Basic scenario needs only" },
      { value: "minimal", label: "Minimal", description: "Single-point forecasting is sufficient" }
    ],
    scoringConfig: { type: "complexity", weights: { very_high: 5, high: 4, moderate: 3, low: 2, minimal: 1 } },
    aiGroundingNotes: "Very High/High = strong driver for advanced EPM platforms like Anaplan, Pigment, or OneStream with xP&A capabilities."
  },
  
  // Area 11: Organisational Complexity (1Q)
  {
    id: "q2_org_structure_complexity",
    tier: "pre_assessment",
    dimension: "financial_controls_compliance",
    order: 38,
    questionType: "single_select",
    questionText: "How would you rate the complexity and frequency of change of your organisational (Legal vs Management) and reporting structures (GAAPs, CoAs)?",
    helpText: "Consider how often your legal entity structure, management hierarchies, or chart of accounts change, and how complex they are to manage.",
    required: true,
    options: [
      { value: "very_high", label: "Very high", description: "Frequent changes, highly complex multi-dimensional structures" },
      { value: "high", label: "High", description: "Regular restructuring, multiple GAAPs" },
      { value: "moderate", label: "Moderate", description: "Occasional changes, manageable complexity" },
      { value: "low", label: "Low", description: "Stable structures, infrequent changes" },
      { value: "minimal", label: "Minimal", description: "Simple, stable organisational structure" }
    ],
    scoringConfig: { type: "complexity", weights: { very_high: 5, high: 4, moderate: 3, low: 2, minimal: 1 } },
    aiGroundingNotes: "Very High/High = need for flexible EPM platform with strong metadata management and multiple hierarchy support."
  },
  
  // Area 12: EPM Resources (1Q)
  {
    id: "q2_epm_fte_count",
    tier: "pre_assessment",
    dimension: "organisation_people",
    order: 39,
    questionType: "number",
    questionText: "Roughly how many finance FTEs do you have that spend 75% or more of their time exclusively on Financial Planning & Analysis (FP&A), Consolidation, or Enterprise Performance Management (EPM) outputs?",
    helpText: "Count full-time equivalents dedicated primarily to planning, forecasting, consolidation, and performance management system administration. EPM refers to software that helps organisations plan, budget, forecast, and report on performance.",
    required: true,
    scoringConfig: { 
      type: "range", 
      direction: "direct", // Higher FTE count = higher score (more capacity = better)
      benchmarks: { leading: 20, advanced: 10, established: 5, developing: 2 } 
    },
    aiGroundingNotes: "Used for calculating EPM team capacity and potential automation benefits. Higher FTE counts suggest more complex EPM needs. ≥20 = Leading, 10-19 = Advanced, 5-9 = Established, 2-4 = Developing, <2 = Lagging"
  },
  
  // Area 13: Tool Satisfaction & Capabilities (3Q)
  {
    id: "q2_tool_satisfaction",
    tier: "pre_assessment",
    dimension: "technology_systems",
    order: 40,
    questionType: "slider",
    questionText: "How would you rate your Finance team's familiarity and satisfaction with the existing Financial Planning & Analysis (FP&A), Consolidation, and Enterprise Performance Management (EPM) tools?",
    helpText: "EPM tools are software that helps organisations plan, budget, forecast, and report on performance. Consider ease of use, functionality, reliability, and how well current tools meet your needs.",
    required: true,
    sliderConfig: {
      min: 1,
      max: 5,
      labels: {
        1: "Very dissatisfied – tools are a major pain point",
        2: "Dissatisfied – significant frustrations",
        3: "Neutral – tools are adequate but not ideal",
        4: "Satisfied – tools work well for most needs",
        5: "Very satisfied – tools are excellent"
      }
    },
    aiGroundingNotes: "Score 1-2 = strong case for EPM transformation. Score 4-5 = focus on optimisation rather than replacement."
  },
  {
    id: "q2_dev_capability",
    tier: "pre_assessment",
    dimension: "technology_systems",
    order: 41,
    questionType: "single_select",
    questionText: "Does your company have an available and highly capable data engineering and application developer team that the Finance function can leverage?",
    helpText: "Consider whether Finance has access to technical resources for building integrations, custom reports, or system modifications.",
    required: true,
    options: [
      { value: "yes_likely", label: "Yes, and they are likely available", description: "Strong IT partnership with dedicated resources" },
      { value: "yes_unlikely", label: "Yes, but they are unlikely to be available", description: "Capable team but competing priorities" },
      { value: "no_capable", label: "No, but we have some capable individuals", description: "Limited technical skills within finance" },
      { value: "no", label: "No", description: "No development capability available" }
    ],
    scoringConfig: { weights: { yes_likely: 4, yes_unlikely: 3, no_capable: 2, no: 1 } },
    aiGroundingNotes: "Yes_likely = may consider build vs buy for some capabilities. No = stronger case for packaged EPM solution."
  },
  {
    id: "q2_analyst_capability",
    tier: "pre_assessment",
    dimension: "data_analytics",
    order: 42,
    questionType: "single_select",
    questionText: "Does your Finance function have available and highly capable data analysts that can use ETL (Excel VBA, PowerQuery, etc) and BI & Visualisation software (PowerBI, Tableau, QlikView, etc) to build and maintain finance dashboards and analytics?",
    helpText: "Consider whether your finance team can independently build and maintain analytical tools and dashboards.",
    required: true,
    options: [
      { value: "yes", label: "Yes", description: "Strong analytical capabilities within finance" },
      { value: "partially", label: "Partially", description: "Some capability but limited capacity or skills gaps" },
      { value: "no", label: "No", description: "No significant BI/analytics capability in finance" }
    ],
    scoringConfig: { weights: { yes: 3, partially: 2, no: 1 } },
    aiGroundingNotes: "Yes = may leverage existing skills for EPM adoption. No = need for more turnkey EPM solution with embedded analytics."
  },

  // Area 14: AI & Machine Learning (5Q)
  {
    id: "q2_ai_adoption",
    tier: "pre_assessment",
    dimension: "ai_machine_learning",
    order: 43,
    questionType: "single_select",
    questionText: "What is your finance function's current level of AI/ML adoption?",
    helpText: "Consider any use of artificial intelligence, machine learning, or intelligent automation in finance processes.",
    required: true,
    options: [
      { value: "none", label: "No AI/ML usage", description: "Have not started exploring AI/ML capabilities" },
      { value: "exploring", label: "Exploring/Piloting", description: "Running proofs of concept or limited pilots" },
      { value: "limited", label: "Limited deployment", description: "Using AI/ML in 1-2 specific processes" },
      { value: "expanding", label: "Expanding usage", description: "AI/ML in multiple processes with plans to expand" },
      { value: "advanced", label: "Advanced/Embedded", description: "AI/ML deeply integrated into core finance operations" }
    ],
    scoringConfig: { weights: { none: 1, exploring: 2, limited: 3, expanding: 4, advanced: 5 } },
    aiGroundingNotes: "Indicates AI readiness level. None/exploring = significant transformation opportunity."
  },
  {
    id: "q2_ai_use_cases",
    tier: "pre_assessment",
    dimension: "ai_machine_learning",
    order: 44,
    questionType: "multi_select",
    questionText: "Which AI/ML use cases are you currently using or actively exploring in Finance?",
    helpText: "Select all that apply to your current initiatives or near-term plans.",
    required: true,
    options: [
      { value: "forecasting", label: "Predictive forecasting", description: "ML-based demand, revenue, or cash flow forecasting" },
      { value: "anomaly_detection", label: "Anomaly detection", description: "AI-powered fraud detection, error identification, or outlier analysis" },
      { value: "process_automation", label: "Intelligent process automation", description: "AI-enhanced RPA, document processing, or invoice matching" },
      { value: "chatbots", label: "AI assistants/Chatbots", description: "Conversational AI for finance queries or report generation" },
      { value: "nlp_insights", label: "NLP-based insights", description: "Natural language processing for reports, contracts, or sentiment analysis" },
      { value: "copilot_tools", label: "AI copilots/GenAI tools", description: "ChatGPT, Copilot, or similar tools for productivity" },
      { value: "none", label: "None of the above", description: "Not currently using or exploring any AI/ML use cases" }
    ],
    scoringConfig: { multiSelectScoring: true, pointsPerSelection: 1 },
    multiSelectScoringMode: "cumulative", // More AI use cases = higher adoption
    aiGroundingNotes: "Maps current AI/ML landscape. None selected = strong candidate for AI transformation."
  },
  {
    id: "q2_data_science_capability",
    tier: "pre_assessment",
    dimension: "ai_machine_learning",
    order: 45,
    questionType: "single_select",
    questionText: "Does your organisation have data science or ML engineering capabilities that Finance can access?",
    helpText: "Consider internal teams, centres of excellence, or external partnerships for AI/ML development.",
    required: true,
    options: [
      { value: "dedicated", label: "Dedicated finance data science team", description: "Embedded data scientists within finance" },
      { value: "shared_access", label: "Shared CoE with good access", description: "Central data science team available for finance projects" },
      { value: "limited_access", label: "Shared CoE with limited access", description: "Competing priorities limit finance access" },
      { value: "external", label: "External partners only", description: "Rely on consultants or vendors for AI/ML work" },
      { value: "none", label: "No access", description: "No data science capability available" }
    ],
    scoringConfig: { weights: { dedicated: 5, shared_access: 4, limited_access: 3, external: 2, none: 1 } },
    aiGroundingNotes: "Dedicated/shared_access = ready to build AI capabilities. None = need packaged AI solutions."
  },
  {
    id: "q2_ai_data_readiness",
    tier: "pre_assessment",
    dimension: "ai_machine_learning",
    order: 46,
    questionType: "slider",
    questionText: "How ready is your finance data for AI/ML applications?",
    helpText: "Consider data quality, accessibility, volume, and whether data is in formats suitable for machine learning.",
    required: true,
    sliderConfig: {
      min: 1,
      max: 5,
      labels: {
        1: "Poor – data quality and accessibility major barriers",
        2: "Limited – significant data preparation needed",
        3: "Moderate – some data ready, gaps remain",
        4: "Good – most data accessible and of suitable quality",
        5: "Excellent – comprehensive, clean, and ML-ready data"
      }
    },
    aiGroundingNotes: "Score 1-2 = data governance focus before AI. Score 4-5 = ready for AI acceleration."
  },
  {
    id: "q2_ai_governance",
    tier: "pre_assessment",
    dimension: "ai_machine_learning",
    order: 47,
    questionType: "single_select",
    questionText: "Does your organisation have AI governance policies and ethical guidelines in place?",
    helpText: "Consider policies for AI usage, model risk management, bias prevention, and responsible AI practices.",
    required: true,
    options: [
      { value: "comprehensive", label: "Comprehensive framework", description: "Formal AI governance, ethics committee, and regular audits" },
      { value: "basic", label: "Basic policies", description: "Some guidelines exist but not comprehensive" },
      { value: "developing", label: "In development", description: "Currently building AI governance framework" },
      { value: "informal", label: "Informal only", description: "Ad-hoc guidance without formal policies" },
      { value: "none", label: "None", description: "No AI governance in place" }
    ],
    scoringConfig: { weights: { comprehensive: 5, basic: 4, developing: 3, informal: 2, none: 1 } },
    aiGroundingNotes: "Comprehensive/basic = ready for enterprise AI. None/informal = governance foundations needed."
  },
  
  // ============================================
  // TOOL SELECTION QUESTIONS (Pre-Assessment)
  // Maps to EPM/ERP/AI Comparison Tool Key Drivers
  // ============================================
  {
    id: "q2_epm_priority_focus",
    tier: "pre_assessment",
    dimension: "financial_planning_analysis",
    order: 48,
    questionType: "multi_select",
    questionText: "When considering Enterprise Performance Management (EPM) platform capabilities, which areas are most important to your organisation? (Select top 3)",
    helpText: "EPM (also known as CPM - Corporate Performance Management) is software that helps organisations plan, budget, forecast, consolidate financial results, and report on performance. This helps us understand your priorities for platform selection and align recommendations with your needs.",
    required: true,
    options: [
      { value: "consolidation_close", label: "Consolidation & Close", description: "Multi-entity consolidation, intercompany eliminations, financial close management" },
      { value: "planning_forecasting", label: "Planning & Forecasting", description: "Budgeting, forecasting, scenario modelling, driver-based planning" },
      { value: "ai_automation", label: "AI & Automation", description: "Predictive analytics, anomaly detection, intelligent automation, ML capabilities" },
      { value: "modelling_extensibility", label: "Modelling & Extensibility", description: "Flexible data modelling, custom dimensions, low-code capabilities" },
      { value: "integration_data", label: "Integration & Data Fabric", description: "ERP/source system connectivity, data integration, API availability" },
      { value: "reporting_viz", label: "Reporting & Visualisation", description: "Native dashboards, self-service analytics, BI capabilities" },
      { value: "governance_compliance", label: "Governance & Compliance", description: "Audit trails, security controls, SOX readiness" },
      { value: "regulatory", label: "Regulatory Compliance", description: "IFRS, GAAP, statutory reporting, tax compliance" },
      { value: "time_to_value", label: "Time-to-Value", description: "Quick implementation, pre-built solutions, rapid deployment" }
    ],
    scoringConfig: { 
      type: "tool_priority",
      maxSelections: 3,
      priorityWeights: {
        consolidation_close: { dimension: "consolidation_close", weight: 17 },
        planning_forecasting: { dimension: "financial_planning_analysis", weight: 18 },
        ai_automation: { dimension: "ai_machine_learning", weight: 16 },
        modelling_extensibility: { dimension: "technology_systems", weight: 9 },
        integration_data: { dimension: "data_analytics", weight: 8 },
        reporting_viz: { dimension: "management_reporting", weight: 7 },
        governance_compliance: { dimension: "financial_controls_compliance", weight: 7 },
        regulatory: { dimension: "financial_controls_compliance", weight: 8 },
        time_to_value: { dimension: "organisation_people", weight: 4 }
      },
      vendorAffinity: {
        consolidation_close: ["onestream", "oracle_epm", "sap_sac"],
        planning_forecasting: ["anaplan", "workday_adaptive", "board", "planful", "jedox", "prophix"],
        ai_automation: ["anaplan", "onestream", "workday_adaptive", "board"],
        modelling_extensibility: ["anaplan", "onestream", "board", "jedox"],
        integration_data: ["workday_adaptive", "oracle_epm", "sap_sac"],
        reporting_viz: ["board", "planful", "vena", "prophix"],
        governance_compliance: ["onestream", "oracle_epm", "sap_sac"],
        regulatory: ["onestream", "oracle_epm", "sap_sac"],
        time_to_value: ["planful", "vena", "workday_adaptive", "jedox"]
      }
    },
    multiSelectScoringMode: "average", // Priority ranking question
    aiGroundingNotes: "Maps to EPM comparison tool key drivers. Selected priorities influence vendor recommendations and weighted scoring. Correlates with benchmark dimensions."
  },
  {
    id: "q2_erp_selection_priorities",
    tier: "pre_assessment",
    dimension: "technology_systems",
    order: 49,
    questionType: "multi_select",
    questionText: "If considering ERP modernisation, which capabilities would be most important? (Select top 3)",
    helpText: "Understanding your ERP priorities helps us recommend platforms that align with your business needs.",
    required: false,
    options: [
      { value: "business_process", label: "Business Process Alignment", description: "How well the ERP aligns with your workflows and multi-entity support" },
      { value: "industry_specific", label: "Industry-Specific Capabilities", description: "Features tailored to your industry requirements" },
      { value: "cloud_architecture", label: "Cloud Architecture", description: "Cloud-native design, multi-tenant SaaS, continuous updates" },
      { value: "reporting_analytics", label: "Reporting & Analytics", description: "Built-in reporting, dashboards, BI integration, real-time analytics" },
      { value: "scalability", label: "Scalability & Performance", description: "Ability to grow with your business and handle increasing volumes" },
      { value: "integration", label: "Integration Capabilities", description: "APIs, pre-built connectors, ecosystem compatibility" },
      { value: "user_experience", label: "User Experience", description: "Interface design, ease of use, mobile accessibility" },
      { value: "compliance_audit", label: "Compliance & Audit Trails", description: "Regulatory compliance, audit trails, security controls" },
      { value: "total_cost", label: "Total Cost of Ownership", description: "Licensing, implementation, and ongoing maintenance costs" },
      { value: "vendor_support", label: "Vendor Support & Ecosystem", description: "Partner network, training resources, implementation support" }
    ],
    scoringConfig: { 
      type: "tool_priority",
      maxSelections: 3,
      priorityWeights: {
        business_process: { dimension: "organisation_people", weight: 10 },
        industry_specific: { dimension: "financial_controls_compliance", weight: 10 },
        cloud_architecture: { dimension: "technology_systems", weight: 8 },
        reporting_analytics: { dimension: "management_reporting", weight: 8 },
        scalability: { dimension: "technology_systems", weight: 8 },
        integration: { dimension: "data_analytics", weight: 10 },
        user_experience: { dimension: "organisation_people", weight: 8 },
        compliance_audit: { dimension: "financial_controls_compliance", weight: 10 },
        total_cost: { dimension: "organisation_people", weight: 10 },
        vendor_support: { dimension: "organisation_people", weight: 6 }
      }
    },
    multiSelectScoringMode: "average", // Priority ranking question
    aiGroundingNotes: "Maps to ERP comparison tool key drivers. Selected priorities influence dimension scoring and AI narrative generation. Links to technology_systems dimension."
  },
  {
    id: "q2_ai_tool_priorities",
    tier: "pre_assessment",
    dimension: "ai_machine_learning",
    order: 50,
    questionType: "multi_select",
    questionText: "When evaluating AI tools for finance, which capabilities are most important? (Select top 3)",
    helpText: "This helps us recommend AI solutions that match your organisation's priorities and risk appetite. Consider what matters most for your team's daily work and your organisation's requirements.",
    required: false,
    options: [
      { value: "finance_specific", label: "Finance-Specific Features", description: "Pre-built finance capabilities, financial analysis, reporting automation" },
      { value: "security_compliance", label: "Data Security & Compliance", description: "Data protection, regulatory compliance, audit trails, access controls" },
      { value: "integration", label: "Integration Capabilities", description: "API availability, pre-built connectors, workflow integration" },
      { value: "ease_of_use", label: "Ease of Use", description: "User interface, learning curve, onboarding experience" },
      { value: "cost_effectiveness", label: "Cost Effectiveness", description: "Pricing model, value for money, hidden costs, Return on Investment (ROI) potential" },
      { value: "vendor_support", label: "Vendor Support", description: "Customer support quality, documentation, training resources" },
      { value: "accuracy_reliability", label: "Accuracy & Reliability", description: "Trustworthy outputs, fact-checking, hallucination prevention" },
      { value: "customisation", label: "Customisation & Flexibility", description: "Ability to train on your data, customise workflows, adapt to your processes" },
      { value: "speed_performance", label: "Speed & Performance", description: "Fast processing, real-time responses, low latency" },
      { value: "explainability", label: "Explainability & Transparency", description: "Clear reasoning, audit trails, understandable outputs" }
    ],
    scoringConfig: { 
      type: "tool_priority",
      maxSelections: 3,
      priorityWeights: {
        finance_specific: { dimension: "ai_machine_learning", weight: 25 },
        security_compliance: { dimension: "financial_controls_compliance", weight: 20 },
        integration: { dimension: "data_analytics", weight: 15 },
        ease_of_use: { dimension: "organisation_people", weight: 15 },
        cost_effectiveness: { dimension: "organisation_people", weight: 15 },
        vendor_support: { dimension: "organisation_people", weight: 10 },
        accuracy_reliability: { dimension: "ai_machine_learning", weight: 20 },
        customisation: { dimension: "ai_machine_learning", weight: 15 },
        speed_performance: { dimension: "technology_systems", weight: 12 },
        explainability: { dimension: "financial_controls_compliance", weight: 18 }
      }
    },
    multiSelectScoringMode: "average", // Priority ranking question
    aiGroundingNotes: "Maps to AI comparison tool key drivers. Selected priorities influence dimension scoring and AI narrative generation. Security focus indicates regulated industry considerations. Explainability focus indicates governance maturity."
  },
  ];

// ============================================
// TIER 3: FULL ASSESSMENT (40 Questions)
// Across all 7 dimensions
// ============================================

export const FULL_ASSESSMENT_QUESTIONS: QuestionDefinition[] = [
  // Dimension 1: Financial Planning & Analysis (6Q)
  {
    id: "q3_fpa_strategy",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 1,
    questionType: "slider",
    questionText: "How aligned is your Financial Planning & Analysis (FP&A) function with overall business strategy?",
    helpText: "Financial Planning & Analysis (FP&A) is the team responsible for budgeting, forecasting, and analysing financial performance. Consider the extent to which FP&A insights influence strategic decisions across the organisation.",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Not aligned – FP&A operates independently with minimal input to strategic decisions", 2: "Loosely aligned – occasional involvement in strategy but mostly reactive reporting", 3: "Moderately aligned – regular contributions to planning cycles with some strategic input", 4: "Well aligned – FP&A proactively shapes decisions with clear links to strategic objectives", 5: "Fully embedded – FP&A is integral to strategy development and drives business outcomes" } }
  },
  {
    id: "q3_driver_based",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 2,
    questionType: "single_select",
    questionText: "To what extent do you use driver-based planning models?",
    helpText: "Driver-based planning means building your budgets and forecasts around key business variables (e.g., number of customers, units sold, headcount) rather than simply adjusting last year's numbers. When these 'drivers' change, the financial impact flows through automatically. This approach makes planning faster and more responsive to business changes.",
    required: true,
    options: [
      { value: "none", label: "None – line-item budgeting only", description: "We budget each expense line individually without linking to business drivers" },
      { value: "limited", label: "Limited – some key drivers identified", description: "We've identified some key variables but don't fully use them in planning" },
      { value: "partial", label: "Partial – driver models for core areas", description: "Key areas like sales or headcount are driven by business variables" },
      { value: "extensive", label: "Extensive – most planning is driver-based", description: "Most of our budget is calculated from underlying business assumptions" },
      { value: "fully", label: "Fully driver-based with real-time sensitivity", description: "All planning links to drivers with automatic recalculation when assumptions change" }
    ]
  },
  {
    id: "q3_what_if",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 3,
    questionType: "single_select",
    questionText: "How effective is your what-if and scenario modelling capability?",
    required: true,
    options: [
      { value: "none", label: "No capability" },
      { value: "basic", label: "Basic spreadsheet scenarios" },
      { value: "moderate", label: "Structured scenarios with some automation" },
      { value: "advanced", label: "Sophisticated multi-variable modelling" },
      { value: "leading", label: "AI-assisted with probabilistic outcomes" }
    ]
  },
  {
    id: "q3_forecast_accuracy",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 4,
    questionType: "single_select",
    questionText: "What is your typical forecast accuracy (variance to actual)?",
    required: true,
    options: [
      { value: "poor", label: ">15% variance", description: "Poor accuracy" },
      { value: "fair", label: "10-15% variance", description: "Fair accuracy" },
      { value: "good", label: "5-10% variance", description: "Good accuracy" },
      { value: "very_good", label: "2-5% variance", description: "Very good accuracy" },
      { value: "excellent", label: "<2% variance", description: "Excellent accuracy" }
    ]
  },
  {
    id: "q3_capex_planning",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 5,
    questionType: "single_select",
    questionText: "How mature is your Capital Expenditure (CapEx) planning process?",
    helpText: "Capital Expenditure (CapEx) refers to investments in long-term assets like property, equipment, technology, or infrastructure. These are significant purchases that benefit the organisation over multiple years, as opposed to day-to-day operating expenses.",
    required: true,
    options: [
      { value: "ad_hoc", label: "Ad-hoc – reactive approvals", description: "CapEx requests are handled case-by-case as they arise" },
      { value: "basic", label: "Basic – annual CapEx budget", description: "We set aside a total budget for the year but don't track projects in detail" },
      { value: "structured", label: "Structured – project-level tracking", description: "We track individual capital projects and their progress" },
      { value: "integrated", label: "Integrated – linked to strategy and Return on Investment (ROI) tracking", description: "CapEx aligns with strategic priorities and we measure the returns achieved" },
      { value: "optimised", label: "Optimised – portfolio management with automated prioritisation", description: "We actively manage a portfolio of investments and use data to prioritise spending" }
    ]
  },
  {
    id: "q3_cash_forecasting",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 6,
    questionType: "single_select",
    questionText: "How sophisticated is your cash flow forecasting?",
    required: true,
    options: [
      { value: "basic", label: "Basic – simple cash projections" },
      { value: "structured", label: "Structured – 13-week cash forecast" },
      { value: "integrated", label: "Integrated – linked to P&L and balance sheet" },
      { value: "advanced", label: "Advanced – scenario-based with treasury integration" },
      { value: "real_time", label: "Real-time – continuous visibility with predictive analytics" }
    ]
  },

  // Dimension 2: Management Reporting (6Q)
  {
    id: "q3_reporting_strategy",
    tier: "full",
    dimension: "management_reporting",
    order: 7,
    questionType: "slider",
    questionText: "How well does your management reporting meet stakeholder needs?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Poorly – reports often late, incomplete, or not addressing key questions", 2: "Partially – basic needs met but gaps in timeliness, format, or insights", 3: "Adequately – meets most requirements but limited self-service or interactivity", 4: "Well – reports are timely, accurate, and regularly refined based on feedback", 5: "Excellently – proactive insights, self-service access, and continuous improvement" } }
  },
  {
    id: "q3_report_timeliness",
    tier: "full",
    dimension: "management_reporting",
    order: 8,
    questionType: "single_select",
    questionText: "How timely is your management reporting?",
    required: true,
    options: [
      { value: "delayed", label: ">10 days post-close" },
      { value: "standard", label: "5-10 days post-close" },
      { value: "prompt", label: "3-5 days post-close" },
      { value: "fast", label: "1-3 days post-close" },
      { value: "real_time", label: "Same day or real-time" }
    ]
  },
  {
    id: "q3_kpi_framework",
    tier: "full",
    dimension: "management_reporting",
    order: 9,
    questionType: "single_select",
    questionText: "How comprehensive is your KPI framework?",
    required: true,
    options: [
      { value: "basic", label: "Basic financial metrics only" },
      { value: "balanced", label: "Balanced scorecard approach" },
      { value: "comprehensive", label: "Comprehensive with leading indicators" },
      { value: "integrated", label: "Integrated with strategic objectives" },
      { value: "predictive", label: "Predictive KPIs with AI-driven insights" }
    ]
  },
  {
    id: "q3_data_storytelling",
    tier: "full",
    dimension: "management_reporting",
    order: 10,
    questionType: "slider",
    questionText: "How effective is your finance team at data storytelling and insight communication?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Not effective – data presented without context; stakeholders struggle to understand implications", 2: "Basic – key messages identified but presentation lacks clarity or visual impact", 3: "Competent – clear narratives with supporting visuals but limited actionable recommendations", 4: "Effective – compelling stories that drive understanding and influence decisions", 5: "Excellent – world-class communication with predictive insights and prescriptive guidance" } }
  },
  {
    id: "q3_commentary_automation",
    tier: "full",
    dimension: "management_reporting",
    order: 11,
    questionType: "single_select",
    questionText: "What level of automation exists in variance commentary and narrative?",
    required: true,
    options: [
      { value: "none", label: "None – fully manual" },
      { value: "templates", label: "Templates – structured but manual" },
      { value: "partial", label: "Partial – some auto-population" },
      { value: "significant", label: "Significant – auto-generated with exceptions" },
      { value: "ai_assisted", label: "AI-assisted – natural language generation" }
    ]
  },
  {
    id: "q3_mobile_access",
    tier: "full",
    dimension: "management_reporting",
    order: 12,
    questionType: "single_select",
    questionText: "What mobile and on-demand access do executives have to finance data?",
    required: true,
    options: [
      { value: "none", label: "None – desktop only" },
      { value: "basic", label: "Basic – PDF distribution" },
      { value: "web", label: "Web dashboards" },
      { value: "mobile", label: "Mobile apps with interactivity" },
      { value: "full", label: "Full mobile with drill-down and alerts" }
    ]
  },

  // Dimension 3: Consolidation & Close (5Q)
  {
    id: "q3_ar_automation",
    tier: "full",
    dimension: "consolidation_close",
    order: 13,
    questionType: "single_select",
    questionText: "What is the level of automation in your accounts receivable process?",
    required: true,
    options: [
      { value: "manual", label: "Mostly manual" },
      { value: "basic", label: "Basic automation" },
      { value: "moderate", label: "Moderate automation with exceptions" },
      { value: "advanced", label: "Advanced with AI cash application" },
      { value: "full", label: "Fully automated end-to-end" }
    ]
  },
  {
    id: "q3_ap_automation",
    tier: "full",
    dimension: "consolidation_close",
    order: 14,
    questionType: "single_select",
    questionText: "What is the level of automation in your accounts payable process?",
    required: true,
    options: [
      { value: "manual", label: "Mostly manual" },
      { value: "basic", label: "Basic automation" },
      { value: "moderate", label: "Moderate – OCR and workflow" },
      { value: "advanced", label: "Advanced – touchless processing" },
      { value: "full", label: "Fully automated with exception-only handling" }
    ]
  },
  {
    id: "q3_reconciliation",
    tier: "full",
    dimension: "consolidation_close",
    order: 15,
    questionType: "single_select",
    questionText: "How automated is your account reconciliation process?",
    required: true,
    options: [
      { value: "manual", label: "Fully manual" },
      { value: "template", label: "Template-based with manual matching" },
      { value: "semi", label: "Semi-automated with rules" },
      { value: "automated", label: "Automated with exception focus" },
      { value: "continuous", label: "Continuous reconciliation with real-time matching" }
    ]
  },
  {
    id: "q3_shared_services",
    tier: "full",
    dimension: "consolidation_close",
    order: 16,
    questionType: "single_select",
    questionText: "What is the maturity of your finance shared services or GBS model?",
    required: true,
    options: [
      { value: "none", label: "No shared services" },
      { value: "basic", label: "Basic shared services centre" },
      { value: "established", label: "Established SSC with SLAs" },
      { value: "optimised", label: "Optimised with continuous improvement" },
      { value: "gbs", label: "Global Business Services with value-add focus" }
    ]
  },
  {
    id: "q3_process_mining",
    tier: "full",
    dimension: "consolidation_close",
    order: 17,
    questionType: "single_select",
    questionText: "Do you use process mining or task mining to identify automation opportunities?",
    required: true,
    options: [
      { value: "no", label: "No – not explored" },
      { value: "exploring", label: "Exploring – pilot phase" },
      { value: "partial", label: "Partial – some processes analysed" },
      { value: "regular", label: "Regular – ongoing analysis" },
      { value: "embedded", label: "Embedded – continuous process intelligence" }
    ]
  },

  // Dimension 4: Financial Controls & Compliance (5Q)
  {
    id: "q3_controls_framework",
    tier: "full",
    dimension: "financial_controls_compliance",
    order: 18,
    questionType: "single_select",
    questionText: "How mature is your internal controls framework?",
    required: true,
    options: [
      { value: "informal", label: "Informal – limited documentation" },
      { value: "documented", label: "Documented – policies exist" },
      { value: "implemented", label: "Implemented – controls actively enforced" },
      { value: "monitored", label: "Monitored – regular testing and reporting" },
      { value: "optimised", label: "Optimised – continuous controls monitoring" }
    ]
  },
  {
    id: "q3_segregation",
    tier: "full",
    dimension: "financial_controls_compliance",
    order: 19,
    questionType: "single_select",
    questionText: "How effectively is segregation of duties (SOD) enforced in your systems?",
    required: true,
    options: [
      { value: "manual", label: "Manual – periodic reviews only" },
      { value: "basic", label: "Basic – role-based access in key systems" },
      { value: "structured", label: "Structured – SOD matrix with monitoring" },
      { value: "automated", label: "Automated – real-time SOD enforcement" },
      { value: "ai_enhanced", label: "AI-enhanced – predictive risk identification" }
    ]
  },
  {
    id: "q3_audit_trail",
    tier: "full",
    dimension: "financial_controls_compliance",
    order: 20,
    questionType: "single_select",
    questionText: "What level of audit trail capability exists across your finance systems?",
    required: true,
    options: [
      { value: "limited", label: "Limited – basic logs only" },
      { value: "standard", label: "Standard – system-level audit trails" },
      { value: "comprehensive", label: "Comprehensive – full transaction history" },
      { value: "integrated", label: "Integrated – cross-system audit trail" },
      { value: "immutable", label: "Immutable – blockchain or equivalent" }
    ]
  },
  {
    id: "q3_regulatory_automation",
    tier: "full",
    dimension: "financial_controls_compliance",
    order: 21,
    questionType: "single_select",
    questionText: "How automated is your regulatory and statutory reporting?",
    required: true,
    options: [
      { value: "manual", label: "Mostly manual preparation" },
      { value: "template", label: "Template-based with manual population" },
      { value: "semi", label: "Semi-automated with validation" },
      { value: "automated", label: "Automated with exception handling" },
      { value: "continuous", label: "Continuous compliance with regulatory feeds" }
    ]
  },
  {
    id: "q3_risk_management",
    tier: "full",
    dimension: "financial_controls_compliance",
    order: 22,
    questionType: "slider",
    questionText: "How integrated is financial risk management with your finance processes?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Siloed – risk and finance operate independently with minimal data sharing", 2: "Some integration – periodic risk reviews but not embedded in day-to-day processes", 3: "Moderate – risk considerations in major decisions but manual coordination required", 4: "Well integrated – real-time risk data feeds into planning and reporting workflows", 5: "Fully embedded – predictive risk analytics drive proactive decision-making across finance" } }
  },

  // Dimension 5: Technology Systems (6Q)
  {
    id: "q3_tech_strategy",
    tier: "full",
    dimension: "technology_systems",
    order: 23,
    questionType: "slider",
    questionText: "How well-defined is your finance technology strategy and roadmap?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "No strategy – ad-hoc technology decisions without overall direction or vision", 2: "Informal – general technology aspirations but no documented plan or timeline", 3: "Defined – documented strategy with clear priorities but limited governance", 4: "Detailed roadmap – multi-year plan with milestones, funding, and executive sponsorship", 5: "Living strategy – continuously updated roadmap aligned to business strategy with agile delivery" } }
  },
  {
    id: "q3_integration_architecture",
    tier: "full",
    dimension: "technology_systems",
    order: 24,
    questionType: "single_select",
    questionText: "How would you describe your finance systems integration architecture?",
    required: true,
    options: [
      { value: "point_to_point", label: "Point-to-point – manual and fragmented" },
      { value: "basic", label: "Basic middleware" },
      { value: "hub", label: "Integration hub – standardised interfaces" },
      { value: "api", label: "API-first – modern integration platform" },
      { value: "event", label: "Event-driven – real-time microservices" }
    ]
  },
  {
    id: "q3_data_platform",
    tier: "full",
    dimension: "technology_systems",
    order: 25,
    questionType: "single_select",
    questionText: "What is the maturity of your finance data platform/data warehouse?",
    required: true,
    options: [
      { value: "none", label: "None – data in source systems" },
      { value: "basic", label: "Basic – departmental data marts" },
      { value: "warehouse", label: "Enterprise data warehouse" },
      { value: "lake", label: "Data lake with structured access" },
      { value: "mesh", label: "Data mesh – decentralised with governance" }
    ]
  },
  {
    id: "q3_security",
    tier: "full",
    dimension: "technology_systems",
    order: 26,
    questionType: "slider",
    questionText: "How robust is your finance systems security posture?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Basic – minimal security controls; reactive response to incidents only", 2: "Developing – foundational controls in place but gaps in monitoring or access management", 3: "Established – comprehensive controls with regular testing and compliance certification", 4: "Advanced – proactive threat detection, automated monitoring, and rapid incident response", 5: "Leading – zero-trust architecture with AI-powered threat intelligence and continuous improvement" } }
  },
  {
    id: "q3_ai_adoption",
    tier: "full",
    dimension: "technology_systems",
    order: 27,
    questionType: "single_select",
    questionText: "What is your current level of AI/ML adoption in finance?",
    required: true,
    options: [
      { value: "none", label: "None – not explored" },
      { value: "awareness", label: "Awareness – investigating use cases" },
      { value: "pilot", label: "Pilot – testing in limited areas" },
      { value: "scaling", label: "Scaling – multiple production use cases" },
      { value: "embedded", label: "Embedded – AI integral to finance operations" }
    ]
  },
  {
    id: "q3_vendor_management",
    tier: "full",
    dimension: "technology_systems",
    order: 28,
    questionType: "slider",
    questionText: "How effective is your finance technology vendor management?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Reactive – vendors managed only when issues arise; no formal oversight", 2: "Basic – contracts tracked but limited performance monitoring or relationship building", 3: "Structured – regular reviews, SLAs in place, and documented vendor performance", 4: "Strategic – vendors treated as partners with joint roadmaps and value realisation tracking", 5: "Partnership-based – co-innovation with key vendors; integrated into strategic planning" } }
  },

  // Dimension 6: Organisation & People (6Q)
  {
    id: "q3_org_structure",
    tier: "full",
    dimension: "organisation_people",
    order: 29,
    questionType: "single_select",
    questionText: "How would you describe your finance organisation structure?",
    required: true,
    options: [
      { value: "traditional", label: "Traditional functional silos" },
      { value: "hybrid", label: "Hybrid – some cross-functional teams" },
      { value: "matrix", label: "Matrix – business partners embedded" },
      { value: "agile", label: "Agile – flexible squads and pods" },
      { value: "networked", label: "Networked – global integration with local execution" }
    ]
  },
  {
    id: "q3_business_partnering",
    tier: "full",
    dimension: "organisation_people",
    order: 30,
    questionType: "slider",
    questionText: "How effective is finance business partnering in your organisation?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Non-existent – finance operates in isolation from business units", 2: "Basic – occasional ad-hoc support to business but primarily reactive reporting", 3: "Developing – assigned business partners but still focused on historical analysis", 4: "Effective – proactive engagement with forward-looking insights that influence decisions", 5: "Strategic advisor – finance embedded in leadership teams; co-owns business outcomes" } }
  },
  {
    id: "q3_talent_strategy",
    tier: "full",
    dimension: "organisation_people",
    order: 31,
    questionType: "single_select",
    questionText: "How mature is your finance talent strategy?",
    required: true,
    options: [
      { value: "reactive", label: "Reactive – hiring as needed" },
      { value: "basic", label: "Basic – job descriptions and hiring process" },
      { value: "structured", label: "Structured – career paths defined" },
      { value: "strategic", label: "Strategic – competency framework and development" },
      { value: "leading", label: "Leading – predictive workforce planning" }
    ]
  },
  {
    id: "q3_learning_culture",
    tier: "full",
    dimension: "organisation_people",
    order: 32,
    questionType: "slider",
    questionText: "How strong is the learning and development culture in your finance function?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Minimal – no formal training; learning happens only through experience", 2: "Basic training – occasional training courses but no development planning", 3: "Structured L&D – formal programmes with competency frameworks and career paths", 4: "Continuous learning – learning embedded in workflow with time allocated for development", 5: "Learning organisation – culture of curiosity; AI-recommended learning paths; knowledge sharing" } }
  },
  {
    id: "q3_collaboration",
    tier: "full",
    dimension: "organisation_people",
    order: 33,
    questionType: "slider",
    questionText: "How effective is collaboration between finance and other functions?",
    helpText: "This measures day-to-day working relationships between finance team members and colleagues in other departments (operations, sales, HR, IT). Consider how easily information flows, how well teams work together on shared projects, and whether there is mutual trust and understanding.",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Siloed – minimal interaction; each function operates independently", 2: "Limited – collaboration occurs only for formal processes like budgeting", 3: "Moderate – regular touchpoints but coordination still requires significant effort", 4: "Good – established relationships with smooth information flow and joint problem-solving", 5: "Excellent – seamless integration; shared goals and real-time collaboration tools" } }
  },
  {
    id: "q3_cfo_visibility",
    tier: "full",
    dimension: "organisation_people",
    order: 34,
    questionType: "slider",
    questionText: "How visible and influential is the CFO/finance leadership in strategic decisions?",
    helpText: "This measures the CFO's role at the executive level - whether finance leadership is seen as a strategic partner by the CEO and board, or primarily as a back-office function. This is different from team collaboration; it's about leadership influence on major business decisions.",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Limited – CFO focused on compliance and reporting with minimal strategic input", 2: "Consulted – CFO provides financial analysis when asked but not proactively engaged", 3: "Involved – CFO participates in strategic discussions with regular executive access", 4: "Influential – CFO shapes strategy with data-driven insights that drive decisions", 5: "Co-pilot to CEO – CFO is strategic partner leading transformation and growth initiatives" } }
  },

  // Dimension 7: Data & Analytics (6Q)
  {
    id: "q3_data_governance",
    tier: "full",
    dimension: "data_analytics",
    order: 35,
    questionType: "single_select",
    questionText: "What is the maturity of your finance data governance programme?",
    required: true,
    options: [
      { value: "none", label: "None – no formal governance" },
      { value: "informal", label: "Informal – some ownership defined" },
      { value: "basic", label: "Basic – policies and data stewards" },
      { value: "established", label: "Established – metadata and quality rules" },
      { value: "advanced", label: "Advanced – automated governance with catalogue" }
    ]
  },
  {
    id: "q3_master_data",
    tier: "full",
    dimension: "data_analytics",
    order: 36,
    questionType: "single_select",
    questionText: "How well-managed is your finance master data (COA, cost centres, entities)?",
    required: true,
    options: [
      { value: "fragmented", label: "Fragmented – multiple versions" },
      { value: "inconsistent", label: "Inconsistent – some standards" },
      { value: "managed", label: "Managed – central definitions" },
      { value: "governed", label: "Governed – MDM solution in place" },
      { value: "optimised", label: "Optimised – automated synchronisation" }
    ]
  },
  {
    id: "q3_analytics_capability",
    tier: "full",
    dimension: "data_analytics",
    order: 37,
    questionType: "single_select",
    questionText: "What is your current analytics capability maturity?",
    required: true,
    options: [
      { value: "descriptive", label: "Descriptive – what happened" },
      { value: "diagnostic", label: "Diagnostic – why it happened" },
      { value: "predictive", label: "Predictive – what will happen" },
      { value: "prescriptive", label: "Prescriptive – what should we do" },
      { value: "autonomous", label: "Autonomous – self-optimising decisions" }
    ]
  },
  {
    id: "q3_data_literacy",
    tier: "full",
    dimension: "data_analytics",
    order: 38,
    questionType: "slider",
    questionText: "How would you rate data literacy across your finance team?",
    required: true,
    sliderConfig: { min: 1, max: 5, labels: { 1: "Low – team struggles to interpret data or use analytical tools effectively", 2: "Basic – can work with spreadsheets but limited ability to extract insights", 3: "Moderate – comfortable with standard reports and basic analysis techniques", 4: "Good – proficient with BI tools and can perform sophisticated analysis independently", 5: "Excellent – advanced analytical skills; can build models and leverage AI/ML tools" } }
  },
  {
    id: "q3_single_source",
    tier: "full",
    dimension: "data_analytics",
    order: 39,
    questionType: "single_select",
    questionText: "Do you have a single source of truth for finance data?",
    required: true,
    options: [
      { value: "no", label: "No – multiple conflicting sources" },
      { value: "partial", label: "Partial – SSOT for some data" },
      { value: "mostly", label: "Mostly – core financials unified" },
      { value: "yes", label: "Yes – comprehensive SSOT" },
      { value: "real_time", label: "Yes with real-time synchronisation" }
    ]
  },
  {
    id: "q3_advanced_analytics",
    tier: "full",
    dimension: "data_analytics",
    order: 40,
    questionType: "single_select",
    questionText: "What advanced analytics use cases are live in your finance function?",
    required: true,
    options: [
      { value: "none", label: "None" },
      { value: "exploring", label: "Exploring – identifying use cases" },
      { value: "pilot", label: "1-2 pilots in progress" },
      { value: "production", label: "3-5 use cases in production" },
      { value: "extensive", label: "Extensive – part of BAU operations" }
    ]
  },

  // ============================================
  // FULL ASSESSMENT - Additional Questions (Q41-Q62)
  // Added from Constancia_all_95_questions JSON full_assessment sections
  // ============================================

  // Dimension 1: Financial Planning & Analysis (Q1.4, Q1.5, Q1.6)
  {
    id: "q3_ai_tools_access",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 41,
    questionType: "single_select",
    questionText: "Does your finance function have access to and actively use AI/predictive analytics tools for decision-making?",
    helpText: "58% of CFOs are already investing in AI. Low adoption signals need for AI literacy and upskilling investment.",
    required: true,
    options: [
      { value: "no_ai", label: "No, not at all" },
      { value: "pilot_phase", label: "Pilot/experimentation phase (some AI tools, limited adoption)" },
      { value: "partial_deployment", label: "Partial deployment (some processes AI-enabled, others manual)" },
      { value: "widespread_adoption", label: "Widespread adoption (most planning/forecasting AI-powered)" },
      { value: "fully_autonomous", label: "Fully autonomous (agentic AI handles routine decisions; humans focus on strategic)" }
    ]
  },
  {
    id: "q3_business_engagement",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 42,
    questionType: "single_select",
    questionText: "How does finance engage with business leaders to drive decisions?",
    helpText: "Forward-looking CFOs are moving toward embedded partnership and autonomous insights delivery.",
    required: true,
    options: [
      { value: "reactive_reporting", label: "Reactive reporting (business unit requests data; finance provides static reports)" },
      { value: "adhoc_analytics", label: "Ad-hoc analytics (business unit identifies questions; finance analyzes)" },
      { value: "regular_reviews", label: "Regular business partner reviews (scheduled, recurring sessions)" },
      { value: "embedded_partnership", label: "Continuous embedded partnership (finance embedded in business decisions, real-time)" },
      { value: "autonomous_insights", label: "Autonomous insights delivery (AI generates insights automatically; finance & business act on them)" }
    ]
  },
  {
    id: "q3_time_allocation",
    tier: "full",
    dimension: "financial_planning_analysis",
    order: 43,
    questionType: "single_select",
    questionText: "What % of your finance team's time is spent on routine/transactional work vs. analysis/decision-support?",
    helpText: "World-class teams spend 70-80% on analytical work. Higher automation enables FTE reallocation to higher-value work.",
    required: true,
    options: [
      { value: "mostly_transactional", label: "80%+ transactional, 20% analytical" },
      { value: "high_transactional", label: "70% transactional, 30% analytical" },
      { value: "balanced", label: "50/50 split" },
      { value: "mostly_analytical", label: "30% transactional, 70% analytical" },
      { value: "ai_automated", label: "10% transactional, 90% analytical (AI handles routine work)" }
    ]
  },

  // Dimension 2: Consolidation & Close (Q2.4, Q2.5, Q2.6, Q2.7)
  {
    id: "q3_manual_adjustments",
    tier: "full",
    dimension: "consolidation_close",
    order: 44,
    questionType: "single_select",
    questionText: "How many manual adjustments/journal entries are required to close each month?",
    helpText: "Constancia benchmark is <25 adjustments. High counts indicate data quality issues and can represent 5-10 FTE in rework.",
    required: true,
    options: [
      { value: "very_high", label: "100+ manual adjustments" },
      { value: "high", label: "50-99 adjustments" },
      { value: "moderate", label: "25-49 adjustments" },
      { value: "low", label: "10-24 adjustments" },
      { value: "minimal", label: "0-9 (mostly automated)" }
    ]
  },
  {
    id: "q3_planning_time_split",
    tier: "full",
    dimension: "consolidation_close",
    order: 45,
    questionType: "single_select",
    questionText: "What % of planning cycle time is spent on data gathering/cleanup vs. actual analysis?",
    helpText: "Planning cycles can be 5x faster with automation. AI agents can handle data gathering, validation, and consolidation.",
    required: true,
    options: [
      { value: "mostly_data", label: "70%+ on data work, 30% analysis" },
      { value: "high_data", label: "60% data, 40% analysis" },
      { value: "balanced", label: "50/50 split" },
      { value: "mostly_analysis", label: "30% data, 70% analysis" },
      { value: "automated_pipeline", label: "5% data, 95% analysis (automated data pipeline)" }
    ]
  },
  {
    id: "q3_realtime_dashboards",
    tier: "full",
    dimension: "consolidation_close",
    order: 46,
    questionType: "single_select",
    questionText: "Do you have real-time financial dashboards that update automatically (not manual uploads)?",
    helpText: "75%+ of world-class finance functions have real-time dashboards. AI layer adds anomaly detection and prescriptive recommendations.",
    required: true,
    options: [
      { value: "all_manual", label: "No, all manual" },
      { value: "mixed", label: "Some manual, some automated" },
      { value: "mostly_automated", label: "Mostly automated (80%+)" },
      { value: "fully_automated", label: "Fully automated real-time dashboards (ERP-integrated)" },
      { value: "autonomous", label: "Autonomous dashboards (AI updates insights + alerts management automatically)" }
    ]
  },
  {
    id: "q3_variance_automation",
    tier: "full",
    dimension: "consolidation_close",
    order: 47,
    questionType: "single_select",
    questionText: "What % of your variance explanations (budget vs actual, forecast vs actual) are automated vs manual?",
    helpText: "GenAI's highest-impact use case in finance is variance explanation (66% of leaders cite this). Automating saves 40-60 analyst hours/month.",
    required: true,
    options: [
      { value: "all_manual", label: "0% automated (all manual narratives)" },
      { value: "minimal_automated", label: "1-25% automated" },
      { value: "partial_automated", label: "26-50% automated" },
      { value: "mostly_automated", label: "51-75% automated" },
      { value: "genai_automated", label: "76-100% (GenAI generates narratives automatically)" }
    ]
  },

  // Dimension 3: Organisation & People (Q3.4, Q3.5, Q3.6)
  {
    id: "q3_upskilling_approach",
    tier: "full",
    dimension: "organisation_people",
    order: 48,
    questionType: "single_select",
    questionText: "How does your organization approach continuous learning/upskilling (esp. for AI/digital)?",
    helpText: "Learning culture is a predictor of innovation adoption. Organizations with strong learning retain talent 3x better.",
    required: true,
    options: [
      { value: "minimal", label: "Minimal formal training (ad-hoc, external courses only)" },
      { value: "annual_budget", label: "Annual training budget + some internal training" },
      { value: "structured_program", label: "Structured learning program (certifications, continuous upskilling)" },
      { value: "learning_culture", label: "Learning culture (dedicated time, internal experts, mentorship)" },
      { value: "ai_driven_learning", label: "AI-driven learning platform (personalized, continuous, autonomous recommendations)" }
    ]
  },
  {
    id: "q3_transformation_experience",
    tier: "full",
    dimension: "organisation_people",
    order: 49,
    questionType: "single_select",
    questionText: "How many major transformations has your finance team led successfully in the past 5 years?",
    helpText: "Zero transformation experience means higher risk for any major system implementation. A successful track record predicts success of the next transformation.",
    required: true,
    options: [
      { value: "none", label: "None (no transformation experience)" },
      { value: "one", label: "1 (some experience with change)" },
      { value: "two", label: "2 (moderate change capability)" },
      { value: "three_plus", label: "3+ (strong transformation track record)" },
      { value: "five_plus", label: "5+ (continuous transformation organization; agentic change management)" }
    ]
  },
  {
    id: "q3_team_composition",
    tier: "full",
    dimension: "organisation_people",
    order: 50,
    questionType: "single_select",
    questionText: "What is your finance team's composition by role? (% split)",
    helpText: "Target: 80% strategic roles to position finance as true business partner. Automation of transactional work enables FTE reallocation.",
    required: true,
    options: [
      { value: "mostly_accounting", label: "80%+ accounting/compliance, 20% other" },
      { value: "high_accounting", label: "70% accounting, 30% planning/analytics" },
      { value: "moderate_accounting", label: "60% accounting, 40% planning/analytics" },
      { value: "balanced_strategic", label: "40% accounting, 60% planning/analytics/strategic" },
      { value: "mostly_strategic", label: "20% transactional, 80% strategic/analytical (AI handles routine work)" }
    ]
  },

  // Dimension 4: Technology & Systems (Q4.4, Q4.5, Q4.6, Q4.7)
  {
    id: "q3_tech_stack_integration",
    tier: "full",
    dimension: "technology_systems",
    order: 51,
    questionType: "single_select",
    questionText: "How integrated is your technology stack? (Enterprise Resource Planning, performance management, Business Intelligence, accounts payable/receivable, General Ledger, etc.)",
    helpText: "Consider how well your various finance systems talk to each other. AI needs a unified data model; integration is a prerequisite for advanced capabilities. Integrated data enables better insights; siloed data creates blind spots.",
    required: true,
    options: [
      { value: "siloed", label: "Siloed systems (manual data sharing between systems)" },
      { value: "some_integration", label: "Some integration (key flows automated, some manual)" },
      { value: "highly_integrated", label: "Highly integrated (automated flows for most processes)" },
      { value: "fully_integrated", label: "Fully integrated (API-first, real-time data sync)" },
      { value: "autonomous_integration", label: "Autonomous integration (AI agents manage data flows, detect/resolve errors)" }
    ]
  },
  {
    id: "q3_api_connections",
    tier: "full",
    dimension: "technology_systems",
    order: 52,
    questionType: "single_select",
    questionText: "Do you have API connections to your major systems (Enterprise Resource Planning, Business Intelligence, accounts payable/receivable)?",
    helpText: "APIs (Application Programming Interfaces) allow systems to share data automatically. API-first architecture is a prerequisite for continuous data and AI updates, and enables real-time dashboards and alerts.",
    required: true,
    options: [
      { value: "no_apis", label: "No APIs; all manual exports/imports" },
      { value: "some_apis", label: "Some APIs (1-2 key connections)" },
      { value: "multiple_apis", label: "Multiple APIs (3-5 critical flows)" },
      { value: "comprehensive_apis", label: "Comprehensive APIs (most systems connected)" },
      { value: "api_first", label: "API-first architecture (microservices, real-time bidirectional sync)" }
    ]
  },
  {
    id: "q3_process_automation",
    tier: "full",
    dimension: "technology_systems",
    order: 53,
    questionType: "single_select",
    questionText: "What level of automation exists in your routine finance processes (e.g., accounts payable, General Ledger reconciliations, cost allocations)?",
    helpText: "Consider how much of your repetitive work is automated. Each 25% automation increase enables 5-10 FTE reallocation. Typical progression: Manual → Robotic Process Automation (RPA) → AI/ML → Autonomous agents.",
    required: true,
    options: [
      { value: "minimal", label: "Minimal automation (mostly manual)" },
      { value: "basic_rpa", label: "Basic automation (RPA for simple tasks)" },
      { value: "moderate", label: "Moderate automation (many routine tasks automated)" },
      { value: "extensive", label: "Extensive automation (80%+ of routine work automated)" },
      { value: "self_healing", label: "Self-healing autonomous processes (AI detects/corrects errors automatically)" }
    ]
  },
  {
    id: "q3_unstructured_data",
    tier: "full",
    dimension: "technology_systems",
    order: 54,
    questionType: "single_select",
    questionText: "What percentage of financial data sources are unstructured (e.g., emails, PDFs, Word docs) vs structured (in your core systems and databases)?",
    helpText: "Unstructured data refers to information not organised in databases, such as emails, contracts, and PDF invoices. GenAI can extract data from these sources automatically. High levels of unstructured data typically mean more manual entry and errors.",
    required: true,
    options: [
      { value: "high_unstructured", label: "50%+ unstructured (major manual data entry)" },
      { value: "forty_pct_unstructured", label: "40% unstructured" },
      { value: "thirty_pct_unstructured", label: "30% unstructured" },
      { value: "twenty_pct_unstructured", label: "20% unstructured" },
      { value: "mostly_structured", label: "5% unstructured (mostly structured; AI processes remaining)" }
    ]
  },

  // Dimension 5: Data & Analytics (Q5.4, Q5.5)
  {
    id: "q3_data_pipeline_automation",
    tier: "full",
    dimension: "data_analytics",
    order: 55,
    questionType: "single_select",
    questionText: "What % of your data pipeline is automated for quality checks vs manual review?",
    helpText: "Data validation is a prime use case for AI automation. Automating quality checks frees 10-15 FTE hours/month.",
    required: true,
    options: [
      { value: "all_manual", label: "0% automated (all manual)" },
      { value: "quarter_automated", label: "25% automated" },
      { value: "half_automated", label: "50% automated" },
      { value: "mostly_automated", label: "75% automated" },
      { value: "fully_automated", label: "95%+ (automated data validation; AI anomaly detection)" }
    ]
  },
  {
    id: "q3_external_data_integration",
    tier: "full",
    dimension: "data_analytics",
    order: 56,
    questionType: "single_select",
    questionText: "How do you handle external data integration (e.g., market data, currency rates, tax rules, supplier costs)?",
    helpText: "Real-time external data integration enables faster decision-making. Agentic systems automatically ingest market signals and adjust forecasts.",
    required: true,
    options: [
      { value: "manual_updates", label: "Manual updates (spreadsheets, email)" },
      { value: "some_automated", label: "Some automated feeds (limited coverage)" },
      { value: "mostly_automated", label: "Mostly automated (80%+ feeds automated)" },
      { value: "fully_automated", label: "Fully automated external data feeds" },
      { value: "autonomous_marketplace", label: "Autonomous data marketplace (AI sources, validates, integrates external data)" }
    ]
  },

  // Dimension 6: Management Reporting (Q6.4, Q6.5, Q6.6)
  {
    id: "q3_kpi_strategy_alignment",
    tier: "full",
    dimension: "management_reporting",
    order: 57,
    questionType: "single_select",
    questionText: "What % of your finance KPIs are linked to business outcomes/strategy vs operational metrics?",
    helpText: "Strategic KPI alignment is prerequisite for prescriptive analytics. Agentic systems optimize KPIs toward strategic objectives.",
    required: true,
    options: [
      { value: "low_alignment", label: "0-25% linked to business strategy" },
      { value: "partial_alignment", label: "26-50% linked" },
      { value: "moderate_alignment", label: "51-70% linked" },
      { value: "high_alignment", label: "71-85% linked" },
      { value: "full_alignment", label: "86-100% (all KPIs cascade from strategy; AI optimizes toward strategic goals)" }
    ]
  },
  {
    id: "q3_headline_kpis_count",
    tier: "full",
    dimension: "management_reporting",
    order: 58,
    questionType: "single_select",
    questionText: "How many headline finance KPIs do you actively track? (Estimate)",
    helpText: "World-class organizations track 15-25 KPIs with clear hierarchy. AI helps surface which KPIs matter most.",
    required: true,
    options: [
      { value: "five_or_fewer", label: "5 or fewer" },
      { value: "six_to_ten", label: "6-10" },
      { value: "eleven_to_fifteen", label: "11-15" },
      { value: "sixteen_to_twentyfive", label: "16-25" },
      { value: "twentyfive_plus", label: "25+ (comprehensive KPI framework with AI-managed insights)" }
    ]
  },
  {
    id: "q3_prescriptive_analysis",
    tier: "full",
    dimension: "management_reporting",
    order: 59,
    questionType: "single_select",
    questionText: "What % of your KPI variance analyses include what-if scenarios or prescriptive recommendations?",
    helpText: "CFOs increasingly want prescriptive recommendations, not just variance reports. GenAI + prescriptive ML enables fully prescriptive capability.",
    required: true,
    options: [
      { value: "descriptive_only", label: "0% (descriptive only: what happened)" },
      { value: "some_diagnostic", label: "1-25% (diagnostic: some why analysis)" },
      { value: "partial_prescriptive", label: "26-50% (some prescriptive: what should we do)" },
      { value: "mostly_prescriptive", label: "51-75% (mostly prescriptive)" },
      { value: "fully_prescriptive", label: "76-100% (fully prescriptive: AI recommends optimal actions)" }
    ]
  },

  // Dimension 7: Financial Controls & Compliance (Q7.4, Q7.5, Q7.6)
  {
    id: "q3_controls_focus",
    tier: "full",
    dimension: "financial_controls_compliance",
    order: 60,
    questionType: "single_select",
    questionText: "What is your finance function's primary focus on controls/compliance? (Select primary)",
    helpText: "Predictive and autonomous controls strengthen audit positioning. Predictive analytics + continuous monitoring enables autonomous control.",
    required: true,
    options: [
      { value: "reactive", label: "Reactive (address issues when found)" },
      { value: "preventive", label: "Preventive (controls in place to prevent issues)" },
      { value: "predictive", label: "Predictive (identify control risks before they occur)" },
      { value: "adaptive", label: "Adaptive (controls continuously evolve based on risk environment)" },
      { value: "autonomous", label: "Autonomous (AI predicts control failures, recommends adjustments, executes preventive actions)" }
    ]
  },
  {
    id: "q3_ai_governance",
    tier: "full",
    dimension: "financial_controls_compliance",
    order: 61,
    questionType: "single_select",
    questionText: "How do you approach AI governance (if using AI/ML in finance)?",
    helpText: "As AI adoption increases, governance becomes critical. Regulators increasingly expect transparent AI governance.",
    required: true,
    options: [
      { value: "no_governance", label: "No formal AI governance" },
      { value: "adhoc", label: "Ad-hoc (informal guidelines)" },
      { value: "basic", label: "Basic governance (documentation, oversight)" },
      { value: "formal", label: "Formal AI governance (policies, guardrails, audit trail, bias monitoring)" },
      { value: "continuous", label: "Continuous AI governance (real-time monitoring, automated guardrails, autonomous improvement)" }
    ]
  },
  {
    id: "q3_improvement_time",
    tier: "full",
    dimension: "financial_controls_compliance",
    order: 62,
    questionType: "single_select",
    questionText: "What % of your team's time is spent on continuous improvement/optimization vs maintaining status quo?",
    helpText: "Organizations spending 30%+ on improvement have high innovation. AI can automate identification of improvements, freeing team time.",
    required: true,
    options: [
      { value: "minimal", label: "5-10% on improvement" },
      { value: "low", label: "11-20% on improvement" },
      { value: "moderate", label: "21-30% on improvement" },
      { value: "high", label: "31-40% on improvement" },
      { value: "improvement_culture", label: "40%+ (improvement culture; AI identifies/executes improvements autonomously)" }
    ]
  },

  // Dimension 8: AI & Machine Learning (5 Questions)
  {
    id: "q3_ai_implementation_maturity",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 63,
    questionType: "single_select",
    questionText: "What is the maturity level of AI/ML implementations in your finance function?",
    helpText: "Consider production deployments, not just pilots or experiments.",
    required: true,
    options: [
      { value: "no_production", label: "No production AI – exploratory only" },
      { value: "single_use_case", label: "Single use case in production" },
      { value: "multiple_siloed", label: "Multiple AI solutions, but siloed" },
      { value: "integrated_platform", label: "Integrated AI platform across finance processes" },
      { value: "autonomous_ai", label: "Autonomous AI with self-learning and continuous optimization" }
    ],
    scoringConfig: { weights: { no_production: 1, single_use_case: 2, multiple_siloed: 3, integrated_platform: 4, autonomous_ai: 5 } },
    aiGroundingNotes: "Indicates AI implementation depth. Single use case or lower = opportunity for AI expansion."
  },
  {
    id: "q3_ai_finance_tools",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 64,
    questionType: "multi_select",
    questionText: "Which AI-powered tools are actively used in your finance operations?",
    helpText: "Select all tools currently deployed and used by your finance team.",
    required: true,
    options: [
      { value: "ml_forecasting", label: "ML-based forecasting models", description: "Statistical/ML models for revenue, cash, or demand forecasting" },
      { value: "document_ai", label: "Document AI/OCR", description: "Automated invoice processing, contract analysis" },
      { value: "genai_copilots", label: "GenAI copilots", description: "ChatGPT, Copilot, or similar for report generation and analysis" },
      { value: "anomaly_detection", label: "Anomaly detection systems", description: "AI for fraud, error, or outlier detection" },
      { value: "automated_reconciliation", label: "AI-powered reconciliation", description: "Smart matching and exception handling" },
      { value: "nlp_analytics", label: "NLP for text analytics", description: "Sentiment analysis, contract review, unstructured data processing" },
      { value: "none_active", label: "None actively deployed", description: "No AI tools in active use" }
    ],
    scoringConfig: { multiSelectScoring: true, pointsPerSelection: 1 },
    multiSelectScoringMode: "cumulative", // More AI tools = higher adoption
    aiGroundingNotes: "Maps AI tool adoption. None active = opportunity for quick wins with proven AI solutions."
  },
  {
    id: "q3_ai_model_management",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 65,
    questionType: "single_select",
    questionText: "How do you manage and monitor AI/ML models in production?",
    helpText: "Consider model versioning, performance monitoring, drift detection, and retraining processes.",
    required: true,
    options: [
      { value: "no_mlops", label: "No formal model management" },
      { value: "basic_tracking", label: "Basic tracking – manual updates and monitoring" },
      { value: "structured_mlops", label: "Structured MLOps – version control, scheduled retraining" },
      { value: "advanced_mlops", label: "Advanced MLOps – automated drift detection and retraining triggers" },
      { value: "full_mlops", label: "Full MLOps platform – continuous learning, A/B testing, automated deployment" }
    ],
    scoringConfig: { weights: { no_mlops: 1, basic_tracking: 2, structured_mlops: 3, advanced_mlops: 4, full_mlops: 5 } },
    aiGroundingNotes: "MLOps maturity critical for sustainable AI. Basic or lower = need MLOps foundations."
  },
  {
    id: "q3_ai_talent_strategy",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 66,
    questionType: "single_select",
    questionText: "What is your strategy for AI talent and capability building in finance?",
    helpText: "Consider both technical AI skills and business-side AI literacy.",
    required: true,
    options: [
      { value: "no_strategy", label: "No defined strategy – rely on vendors" },
      { value: "outsourced", label: "Fully outsourced – external consultants/vendors" },
      { value: "hybrid", label: "Hybrid – core team with external support" },
      { value: "building_internal", label: "Building internal capability – active hiring and training" },
      { value: "centre_of_excellence", label: "AI Centre of Excellence with embedded finance specialists" }
    ],
    scoringConfig: { weights: { no_strategy: 1, outsourced: 2, hybrid: 3, building_internal: 4, centre_of_excellence: 5 } },
    aiGroundingNotes: "Talent strategy determines AI sustainability. No strategy = dependent on vendor roadmaps."
  },
  {
    id: "q3_ai_roi_measurement",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 67,
    questionType: "slider",
    questionText: "How effectively do you measure and demonstrate Return on Investment (ROI) from AI/ML investments?",
    helpText: "ROI measures the value you get back compared to what you invested. Consider whether you have clear metrics, attribution models, and executive reporting for AI value.",
    required: true,
    sliderConfig: {
      min: 1,
      max: 5,
      labels: {
        1: "No measurement – AI value is assumed or anecdotal",
        2: "Ad-hoc measurement – occasional ROI calculations",
        3: "Basic framework – standard metrics tracked quarterly",
        4: "Robust measurement – clear attribution, regular executive reporting",
        5: "Value-driven AI – continuous ROI tracking, AI investments prioritized by measured impact"
      }
    },
    aiGroundingNotes: "ROI measurement enables sustained AI investment. Score 1-2 = need value framework before scaling AI."
  },
  {
    id: "q3_ai_risk_framework",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 68,
    questionType: "single_select",
    questionText: "How mature is your AI risk management framework for finance applications?",
    helpText: "Consider model risk, bias monitoring, explainability requirements, and regulatory compliance.",
    required: true,
    options: [
      { value: "none", label: "No framework – AI risks not formally addressed" },
      { value: "awareness", label: "Awareness only – risks recognized but no formal controls" },
      { value: "basic_controls", label: "Basic controls – documentation and approval processes" },
      { value: "comprehensive", label: "Comprehensive – model validation, bias testing, audit trails" },
      { value: "advanced", label: "Advanced – real-time monitoring, automated risk alerts, regulatory alignment" }
    ],
    scoringConfig: { weights: { none: 1, awareness: 2, basic_controls: 3, comprehensive: 4, advanced: 5 } },
    aiGroundingNotes: "AI risk framework critical for regulated finance. None/awareness = governance gap before scaling AI."
  },
  {
    id: "q3_ai_change_management",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 69,
    questionType: "single_select",
    questionText: "How do you manage change when introducing AI into finance processes?",
    helpText: "Consider stakeholder engagement, training, communication, and adoption strategies.",
    required: true,
    options: [
      { value: "no_process", label: "No formal process – deploy and hope for adoption" },
      { value: "basic_training", label: "Basic training – one-time training sessions" },
      { value: "structured", label: "Structured approach – training, documentation, support channels" },
      { value: "comprehensive", label: "Comprehensive – change champions, feedback loops, iterative rollout" },
      { value: "embedded", label: "Embedded culture – continuous learning, AI literacy programs, innovation incentives" }
    ],
    scoringConfig: { weights: { no_process: 1, basic_training: 2, structured: 3, comprehensive: 4, embedded: 5 } },
    aiGroundingNotes: "Change management determines AI adoption success. No process = high failure risk for AI initiatives."
  },
  {
    id: "q3_ai_ethics_transparency",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 70,
    questionType: "slider",
    questionText: "How transparent and explainable are AI decisions in your finance processes?",
    helpText: "Consider whether stakeholders understand how AI reaches its recommendations and can audit decision logic.",
    required: true,
    sliderConfig: {
      min: 1,
      max: 5,
      labels: {
        1: "Black box – AI decisions are not explainable",
        2: "Limited transparency – some high-level explanations available",
        3: "Partial explainability – key factors shown for major decisions",
        4: "Good transparency – clear decision rationale with audit capability",
        5: "Full explainability – real-time decision breakdown, stakeholder-friendly explanations, regulatory-ready"
      }
    },
    aiGroundingNotes: "Explainability essential for trust and compliance. Score 1-2 = need explainable AI before expanding use."
  },
  
  // ============================================
  // TOOL SELECTION QUESTIONS (Full Assessment)
  // Unique questions for platform selection criteria
  // ============================================
  {
    id: "q3_modelling_extensibility",
    tier: "full",
    dimension: "technology_systems",
    order: 71,
    questionType: "single_select",
    questionText: "How important is modelling flexibility and platform extensibility?",
    helpText: "Consider your need for custom dimensions, complex calculations, low-code development, and marketplace solutions.",
    required: true,
    options: [
      { value: "low", label: "Low", description: "Standard out-of-box models are sufficient" },
      { value: "moderate", label: "Moderate", description: "Some customisation needed for specific use cases" },
      { value: "high", label: "High", description: "Extensive customisation required for business-specific models" },
      { value: "very_high", label: "Very high", description: "Complex multi-dimensional modelling with custom solutions" },
      { value: "critical", label: "Critical", description: "Fully extensible platform with developer capabilities essential" }
    ],
    scoringConfig: { 
      type: "capability_need",
      weights: { low: 1, moderate: 2, high: 3, very_high: 4, critical: 5 },
      vendorAffinity: {
        low: ["planful", "vena"],
        moderate: ["workday_adaptive", "prophix"],
        high: ["board", "jedox"],
        very_high: ["anaplan", "onestream"],
        critical: ["anaplan", "onestream", "oracle_epm"]
      }
    },
    aiGroundingNotes: "Maps to EPM Modelling & Extensibility category (9% weight). Very high/Critical = need for Hyperblock-style or unified platforms."
  },
  {
    id: "q3_industry_specific_erp",
    tier: "full",
    dimension: "technology_systems",
    order: 72,
    questionType: "single_select",
    questionText: "How important are industry-specific ERP capabilities for your organisation?",
    helpText: "Consider manufacturing, financial services, healthcare, or sector-specific compliance requirements.",
    required: true,
    options: [
      { value: "not_important", label: "Not important", description: "General-purpose ERP sufficient" },
      { value: "somewhat_important", label: "Somewhat important", description: "Some industry features helpful but not essential" },
      { value: "important", label: "Important", description: "Industry-specific features needed for key processes" },
      { value: "very_important", label: "Very important", description: "Deep industry functionality required" },
      { value: "critical", label: "Critical", description: "Must have industry-specific ERP with regulatory compliance" }
    ],
    scoringConfig: { 
      type: "capability_need",
      weights: { not_important: 1, somewhat_important: 2, important: 3, very_important: 4, critical: 5 }
    },
    aiGroundingNotes: "Maps to ERP Industry-Specific Capabilities category (10% weight). Critical = recommend industry-focused ERP vendors."
  },
  {
    id: "q3_ai_finance_use_cases",
    tier: "full",
    dimension: "ai_machine_learning",
    order: 73,
    questionType: "multi_select",
    questionText: "Which AI use cases are priorities for your finance function? (Select all that apply)",
    helpText: "Consider both current needs and planned initiatives over the next 2-3 years.",
    required: true,
    options: [
      { value: "predictive_forecasting", label: "Predictive forecasting", description: "ML-based revenue, cash, or demand forecasting" },
      { value: "anomaly_detection", label: "Anomaly detection", description: "AI for fraud, error, or outlier detection" },
      { value: "process_automation", label: "Intelligent process automation", description: "AI-enhanced RPA, document processing" },
      { value: "genai_reporting", label: "GenAI for reporting", description: "Narrative generation, report automation" },
      { value: "copilot_productivity", label: "Finance copilots", description: "AI assistants for analysis and queries" },
      { value: "scenario_optimisation", label: "Scenario optimisation", description: "AI-driven what-if analysis and recommendations" },
      { value: "continuous_planning", label: "Continuous planning", description: "Real-time AI-adjusted forecasts and plans" },
      { value: "none", label: "None currently prioritised", description: "AI not a current focus" }
    ],
    scoringConfig: { 
      type: "tool_priority",
      maxSelections: 5,
      multiSelectScoring: true
    },
    multiSelectScoringMode: "cumulative", // More AI priorities = broader vision
    aiGroundingNotes: "Maps to AI comparison tool key drivers. Selection patterns inform AI platform recommendations and EPM vendor AI capabilities."
  },
  {
    id: "q3_vendor_ecosystem_preference",
    tier: "full",
    dimension: "technology_systems",
    order: 74,
    questionType: "single_select",
    questionText: "What is your preference for vendor ecosystem and technology stack alignment?",
    helpText: "Consider your existing investments in Microsoft, Oracle, SAP, or other technology platforms.",
    required: true,
    options: [
      { value: "microsoft", label: "Microsoft-centric", description: "Strong preference for Microsoft ecosystem (Azure, D365, Power BI)" },
      { value: "oracle", label: "Oracle-centric", description: "Strong preference for Oracle ecosystem (OCI, ERP Cloud, EPM Cloud)" },
      { value: "sap", label: "SAP-centric", description: "Strong preference for SAP ecosystem (S/4HANA, SAC, BTP)" },
      { value: "google", label: "Google Cloud-centric", description: "Strong preference for Google Cloud ecosystem" },
      { value: "best_of_breed", label: "Best-of-breed", description: "Willing to integrate multiple vendors for optimal capability" },
      { value: "no_preference", label: "No strong preference", description: "Open to different technology stacks" }
    ],
    scoringConfig: { 
      type: "vendor_alignment",
      vendorAffinity: {
        microsoft: ["workday_adaptive", "vena", "board"],
        oracle: ["oracle_epm", "onestream"],
        sap: ["sap_sac"],
        google: ["anaplan", "board"],
        best_of_breed: ["anaplan", "onestream", "planful"],
        no_preference: ["anaplan", "onestream", "workday_adaptive", "planful", "oracle_epm", "sap_sac", "board", "vena", "jedox", "prophix"]
      }
    },
    aiGroundingNotes: "Informs vendor affinity scoring. Microsoft = Vena/Board advantage. Oracle/SAP = native platform advantage. No preference = all vendors considered."
  }
];

// ============================================
// COMBINED QUESTION BANK
// Note: REGISTRATION_QUESTIONS are captured at signup, not included in assessments
// ============================================

export const ALL_QUESTIONS: QuestionDefinition[] = [
  ...PRE_ASSESSMENT_QUESTIONS,
  ...FULL_ASSESSMENT_QUESTIONS
];

export function getQuestionsByTier(tier: FCAssessmentTier): QuestionDefinition[] {
  return ALL_QUESTIONS.filter(q => q.tier === tier).sort((a, b) => a.order - b.order);
}

export function getQuestionsByDimension(dimension: FCDimension | "qualification" | "sizing"): QuestionDefinition[] {
  return ALL_QUESTIONS.filter(q => q.dimension === dimension).sort((a, b) => a.order - b.order);
}

export function getQuestionById(id: string): QuestionDefinition | undefined {
  // Check ALL_QUESTIONS first (pre_assessment + full_assessment)
  const found = ALL_QUESTIONS.find(q => q.id === id);
  if (found) return found;
  
  // Also check REGISTRATION_QUESTIONS
  return REGISTRATION_QUESTIONS.find(q => q.id === id);
}

// ============================================
// DIMENSION METADATA
// ============================================

export const DIMENSION_CONFIG = {
  financial_planning_analysis: {
    name: "Financial Planning & Analysis",
    shortName: "FP&A",
    icon: "TrendingUp",
    color: "#8E4F67",
    description: "Budgeting, forecasting, scenario planning, and strategic finance"
  },
  management_reporting: {
    name: "Management Reporting",
    shortName: "Reporting",
    icon: "BarChart3",
    color: "#7FB8A3",
    description: "Dashboards, analytics, KPIs, and insight delivery"
  },
  consolidation_close: {
    name: "Consolidation & Close",
    shortName: "Close",
    icon: "RefreshCw",
    color: "#12161D",
    description: "Financial close, consolidation, intercompany, and period-end processes"
  },
  financial_controls_compliance: {
    name: "Controls & Compliance",
    shortName: "Controls",
    icon: "Shield",
    color: "#6366F1",
    description: "Internal controls, audit, regulatory, and risk management"
  },
  technology_systems: {
    name: "Technology & Systems",
    shortName: "Technology",
    icon: "Server",
    color: "#10B981",
    description: "ERP, EPM, integration, cloud, and automation"
  },
  organisation_people: {
    name: "Organisation & People",
    shortName: "People",
    icon: "Users",
    color: "#F59E0B",
    description: "Structure, talent, skills, culture, and business partnering"
  },
  data_analytics: {
    name: "Data & Analytics",
    shortName: "Data",
    icon: "Database",
    color: "#EC4899",
    description: "Data governance, master data, analytics maturity, and AI"
  },
  ai_machine_learning: {
    name: "AI & Machine Learning",
    shortName: "AI/ML",
    icon: "Sparkles",
    color: "#8B5CF6",
    description: "AI adoption, ML models, automation, and intelligent insights"
  }
};

export const TIER_CONFIG = {
  pre_assessment: {
    name: "Pre-Assessment",
    duration: "15 minutes",
    questionCount: PRE_ASSESSMENT_QUESTIONS.length,
    description: "Comprehensive EPM readiness evaluation for finance leaders",
    outputType: "EPM Readiness Report",
    badge: "Recommended"
  },
  full: {
    name: "Full Assessment",
    duration: "30+ minutes",
    questionCount: FULL_ASSESSMENT_QUESTIONS.length,
    description: "Complete 7-dimension finance transformation analysis",
    outputType: "Full Transformation Report",
    badge: "Comprehensive"
  }
};
