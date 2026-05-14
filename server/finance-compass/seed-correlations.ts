/**
 * Seed Correlations for FinanceCompass Question Weightings
 * 
 * These correlations represent logical relationships between questions
 * where the answer to one question should influence the scoring of another.
 * 
 * Correlation Types:
 * - positive: High score on source → boost target score
 * - negative: High score on source → reduce target score  
 * - conditional: Only apply if source matches certain conditions
 * 
 * Effect Types:
 * - boost: Add points to target score
 * - reduce: Subtract points from target score
 * - multiply: Multiply target score by factor
 * - adjust: Adjust target by percentage
 */

import type { InsertFcQuestionCorrelation } from "@shared/finance-compass-schema";

export const SEED_CORRELATIONS: Omit<InsertFcQuestionCorrelation, "id" | "createdAt" | "updatedAt">[] = [
  // ============================================
  // TECHNOLOGY → DATA QUALITY CORRELATIONS
  // Modern technology systems tend to produce better data quality
  // ============================================
  {
    sourceQuestionKey: "q1_erp_systems",
    targetQuestionKey: "q1_data_confidence",
    correlationType: "positive",
    correlationWeight: 0.6,
    effectType: "boost",
    effectValue: 0.15,
    description: "Modern ERP systems typically provide better data quality and consistency, boosting data confidence",
    isActive: true
  },
  {
    sourceQuestionKey: "q1_spreadsheet_dependency",
    targetQuestionKey: "q1_reconciliation_effort",
    correlationType: "negative",
    correlationWeight: 0.7,
    effectType: "reduce",
    effectValue: 0.2,
    description: "High spreadsheet dependency increases reconciliation effort due to manual data handling",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_erp_landscape",
    targetQuestionKey: "q2_data_accuracy",
    correlationType: "positive",
    correlationWeight: 0.65,
    effectType: "boost",
    effectValue: 0.15,
    description: "Modern integrated ERP landscape improves data accuracy through automated validation",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_data_integration",
    targetQuestionKey: "q2_data_accuracy",
    correlationType: "positive",
    correlationWeight: 0.75,
    effectType: "boost",
    effectValue: 0.2,
    description: "Well-integrated data sources reduce errors from manual data movement",
    isActive: true
  },

  // ============================================
  // AUTOMATION → PROCESS EFFICIENCY CORRELATIONS
  // Higher automation levels reduce manual work and improve cycle times
  // ============================================
  {
    sourceQuestionKey: "q2_automation",
    targetQuestionKey: "q2_manual_consolidation",
    correlationType: "positive",
    correlationWeight: 0.8,
    effectType: "boost",
    effectValue: 0.25,
    description: "Higher automation directly reduces manual consolidation work",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_manual_consolidation",
    targetQuestionKey: "q2_close_cycle",
    correlationType: "negative",
    correlationWeight: 0.7,
    effectType: "reduce",
    effectValue: 0.15,
    description: "High manual consolidation effort extends close cycle time",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_manual_planning",
    targetQuestionKey: "q2_planning_cycle",
    correlationType: "negative",
    correlationWeight: 0.7,
    effectType: "reduce",
    effectValue: 0.15,
    description: "High manual planning work extends the planning cycle duration",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_cloud_adoption",
    targetQuestionKey: "q2_automation",
    correlationType: "positive",
    correlationWeight: 0.55,
    effectType: "boost",
    effectValue: 0.1,
    description: "Cloud adoption enables better automation capabilities",
    isActive: true
  },

  // ============================================
  // PLANNING TOOLS → CAPABILITY CORRELATIONS
  // Better planning tools enable more sophisticated capabilities
  // ============================================
  {
    sourceQuestionKey: "q2_planning_tools",
    targetQuestionKey: "q2_scenario_planning",
    correlationType: "positive",
    correlationWeight: 0.8,
    effectType: "boost",
    effectValue: 0.2,
    description: "Enterprise EPM tools enable sophisticated scenario planning capabilities",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_planning_tools",
    targetQuestionKey: "q2_forecast_frequency",
    correlationType: "positive",
    correlationWeight: 0.65,
    effectType: "boost",
    effectValue: 0.15,
    description: "Advanced planning tools enable more frequent forecasting cycles",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_self_service",
    targetQuestionKey: "q2_reporting_cycle",
    correlationType: "positive",
    correlationWeight: 0.5,
    effectType: "boost",
    effectValue: 0.1,
    description: "Self-service analytics reduces pressure on centralized reporting",
    isActive: true
  },

  // ============================================
  // DATA QUALITY → REPORTING CORRELATIONS
  // Better data quality leads to faster and more reliable reporting
  // ============================================
  {
    sourceQuestionKey: "q2_data_accuracy",
    targetQuestionKey: "q2_close_reliability",
    correlationType: "positive",
    correlationWeight: 0.7,
    effectType: "boost",
    effectValue: 0.15,
    description: "Higher data accuracy improves close reliability by reducing rework",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_data_accuracy",
    targetQuestionKey: "q2_reporting_inconsistency",
    correlationType: "positive",
    correlationWeight: 0.75,
    effectType: "boost",
    effectValue: 0.2,
    description: "Better data accuracy reduces reporting inconsistencies",
    isActive: true
  },
  {
    sourceQuestionKey: "q1_data_confidence",
    targetQuestionKey: "q1_reconciliation_effort",
    correlationType: "positive",
    correlationWeight: 0.6,
    effectType: "boost",
    effectValue: 0.1,
    description: "Higher data confidence correlates with less reconciliation effort needed",
    isActive: true
  },

  // ============================================
  // AI/ML CORRELATIONS
  // AI readiness and capabilities are interconnected
  // ============================================
  {
    sourceQuestionKey: "q2_ai_data_readiness",
    targetQuestionKey: "q2_ai_adoption",
    correlationType: "positive",
    correlationWeight: 0.8,
    effectType: "boost",
    effectValue: 0.2,
    description: "Data readiness is a prerequisite for successful AI adoption",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_data_science_capability",
    targetQuestionKey: "q2_ai_use_cases",
    correlationType: "positive",
    correlationWeight: 0.7,
    effectType: "boost",
    effectValue: 0.15,
    description: "Data science capability enables more AI use case implementations",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_ai_governance",
    targetQuestionKey: "q2_ai_adoption",
    correlationType: "positive",
    correlationWeight: 0.5,
    effectType: "boost",
    effectValue: 0.1,
    description: "AI governance frameworks enable confident AI deployment",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_analyst_capability",
    targetQuestionKey: "q2_ai_data_readiness",
    correlationType: "positive",
    correlationWeight: 0.55,
    effectType: "boost",
    effectValue: 0.1,
    description: "Analyst capability contributes to data readiness for AI",
    isActive: true
  },

  // ============================================
  // ORGANIZATIONAL CORRELATIONS
  // People and organizational factors are interconnected
  // ============================================
  {
    sourceQuestionKey: "q2_change_capacity",
    targetQuestionKey: "q2_skills_gap",
    correlationType: "positive",
    correlationWeight: 0.6,
    effectType: "boost",
    effectValue: 0.1,
    description: "Higher change capacity helps address skills gaps through adaptation",
    isActive: true
  },
  {
    sourceQuestionKey: "q1_stakeholder_buyin",
    targetQuestionKey: "q1_budget_availability",
    correlationType: "positive",
    correlationWeight: 0.7,
    effectType: "boost",
    effectValue: 0.15,
    description: "Strong stakeholder buy-in typically leads to better budget availability",
    isActive: true
  },
  {
    sourceQuestionKey: "q1_urgency",
    targetQuestionKey: "q1_stakeholder_buyin",
    correlationType: "positive",
    correlationWeight: 0.55,
    effectType: "boost",
    effectValue: 0.1,
    description: "Recognition of urgency correlates with stakeholder engagement",
    isActive: true
  },

  // ============================================
  // COMPLEXITY → PROCESS CORRELATIONS
  // Higher complexity increases process difficulty
  // ============================================
  {
    sourceQuestionKey: "q2_multi_currency",
    targetQuestionKey: "q2_close_cycle",
    correlationType: "negative",
    correlationWeight: 0.5,
    effectType: "reduce",
    effectValue: 0.1,
    description: "Multi-currency complexity extends close cycle time",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_intercompany",
    targetQuestionKey: "q2_manual_consolidation",
    correlationType: "negative",
    correlationWeight: 0.6,
    effectType: "reduce",
    effectValue: 0.15,
    description: "Complex intercompany accounting increases manual consolidation work",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_regulatory",
    targetQuestionKey: "q2_close_reliability",
    correlationType: "negative",
    correlationWeight: 0.45,
    effectType: "reduce",
    effectValue: 0.1,
    description: "High regulatory complexity can impact close reliability",
    isActive: true
  },

  // ============================================
  // CENTRALIZATION CORRELATIONS
  // Centralization affects process efficiency
  // ============================================
  {
    sourceQuestionKey: "q2_consolidation_centralisation",
    targetQuestionKey: "q2_close_cycle",
    correlationType: "positive",
    correlationWeight: 0.6,
    effectType: "boost",
    effectValue: 0.1,
    description: "Centralized consolidation typically improves close cycle efficiency",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_reporting_centralisation",
    targetQuestionKey: "q2_reporting_inconsistency",
    correlationType: "positive",
    correlationWeight: 0.65,
    effectType: "boost",
    effectValue: 0.15,
    description: "Centralized reporting reduces inconsistencies across reports",
    isActive: true
  },
  {
    sourceQuestionKey: "q2_planning_centralisation",
    targetQuestionKey: "q2_planning_cycle",
    correlationType: "positive",
    correlationWeight: 0.55,
    effectType: "boost",
    effectValue: 0.1,
    description: "Centralized planning can streamline the planning cycle",
    isActive: true
  },

  // ============================================
  // FULL ASSESSMENT CORRELATIONS
  // Relationships between full assessment questions
  // ============================================
  {
    sourceQuestionKey: "q3_driver_based",
    targetQuestionKey: "q3_what_if",
    correlationType: "positive",
    correlationWeight: 0.75,
    effectType: "boost",
    effectValue: 0.15,
    description: "Driver-based planning models enable better scenario modelling",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_fpa_strategy",
    targetQuestionKey: "q3_business_partnering",
    correlationType: "positive",
    correlationWeight: 0.7,
    effectType: "boost",
    effectValue: 0.15,
    description: "Strategic FP&A alignment correlates with effective business partnering",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_data_governance",
    targetQuestionKey: "q3_single_source",
    correlationType: "positive",
    correlationWeight: 0.8,
    effectType: "boost",
    effectValue: 0.2,
    description: "Strong data governance enables single source of truth",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_integration_architecture",
    targetQuestionKey: "q3_data_platform",
    correlationType: "positive",
    correlationWeight: 0.65,
    effectType: "boost",
    effectValue: 0.15,
    description: "Modern integration architecture supports advanced data platforms",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_controls_framework",
    targetQuestionKey: "q3_audit_trail",
    correlationType: "positive",
    correlationWeight: 0.7,
    effectType: "boost",
    effectValue: 0.15,
    description: "Mature controls framework typically includes comprehensive audit trails",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_ar_automation",
    targetQuestionKey: "q3_reconciliation",
    correlationType: "positive",
    correlationWeight: 0.6,
    effectType: "boost",
    effectValue: 0.1,
    description: "AR automation supports automated reconciliation processes",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_ap_automation",
    targetQuestionKey: "q3_reconciliation",
    correlationType: "positive",
    correlationWeight: 0.6,
    effectType: "boost",
    effectValue: 0.1,
    description: "AP automation supports automated reconciliation processes",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_tech_strategy",
    targetQuestionKey: "q3_ai_adoption",
    correlationType: "positive",
    correlationWeight: 0.55,
    effectType: "boost",
    effectValue: 0.1,
    description: "Well-defined tech strategy enables AI adoption",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_learning_culture",
    targetQuestionKey: "q3_talent_strategy",
    correlationType: "positive",
    correlationWeight: 0.65,
    effectType: "boost",
    effectValue: 0.15,
    description: "Strong learning culture supports talent development strategy",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_collaboration",
    targetQuestionKey: "q3_business_partnering",
    correlationType: "positive",
    correlationWeight: 0.7,
    effectType: "boost",
    effectValue: 0.15,
    description: "Cross-functional collaboration enables effective business partnering",
    isActive: true
  },

  // ============================================
  // AI MATURITY CHAIN CORRELATIONS
  // AI capabilities build on each other
  // ============================================
  {
    sourceQuestionKey: "q3_ai_implementation_maturity",
    targetQuestionKey: "q3_ai_model_management",
    correlationType: "positive",
    correlationWeight: 0.75,
    effectType: "boost",
    effectValue: 0.15,
    description: "AI implementation maturity drives need for model management",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_ai_talent_strategy",
    targetQuestionKey: "q3_ai_implementation_maturity",
    correlationType: "positive",
    correlationWeight: 0.7,
    effectType: "boost",
    effectValue: 0.15,
    description: "AI talent strategy enables implementation maturity",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_ai_risk_framework",
    targetQuestionKey: "q3_ai_implementation_maturity",
    correlationType: "positive",
    correlationWeight: 0.6,
    effectType: "boost",
    effectValue: 0.1,
    description: "AI risk framework enables confident AI scaling",
    isActive: true
  },
  {
    sourceQuestionKey: "q3_ai_change_management",
    targetQuestionKey: "q3_ai_implementation_maturity",
    correlationType: "positive",
    correlationWeight: 0.65,
    effectType: "boost",
    effectValue: 0.1,
    description: "Effective change management supports AI implementation success",
    isActive: true
  },

  // ============================================
  // CROSS-TIER CORRELATIONS
  // Registration answers influencing pre-assessment scoring
  // ============================================
  {
    sourceQuestionKey: "q1_pain_points",
    targetQuestionKey: "q2_manual_consolidation",
    correlationType: "conditional",
    correlationWeight: 0.5,
    effectType: "adjust",
    effectValue: 0.1,
    condition: { matchValue: "manual_reporting" },
    description: "Pain point of manual reporting suggests high manual consolidation work",
    isActive: true
  },
  {
    sourceQuestionKey: "q1_pain_points",
    targetQuestionKey: "q2_close_cycle",
    correlationType: "conditional",
    correlationWeight: 0.5,
    effectType: "adjust",
    effectValue: 0.1,
    condition: { matchValue: "slow_close" },
    description: "Pain point of slow close suggests extended close cycle",
    isActive: true
  },
  {
    sourceQuestionKey: "q1_pain_points",
    targetQuestionKey: "q2_data_accuracy",
    correlationType: "conditional",
    correlationWeight: 0.5,
    effectType: "reduce",
    effectValue: 0.1,
    condition: { matchValue: "poor_data_quality" },
    description: "Pain point of poor data quality suggests accuracy issues",
    isActive: true
  },
  {
    sourceQuestionKey: "q1_priorities",
    targetQuestionKey: "q2_scenario_planning",
    correlationType: "conditional",
    correlationWeight: 0.45,
    effectType: "boost",
    effectValue: 0.1,
    condition: { matchValue: "forecasting" },
    description: "Priority on forecasting suggests focus on scenario planning capabilities",
    isActive: true
  }
];

export default SEED_CORRELATIONS;
