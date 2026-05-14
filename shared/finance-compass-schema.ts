/**
 * FinanceCompass - Finance Transformation Assessment Platform
 * 
 * RINGFENCED SCHEMA - This module is designed to be deployed independently
 * from the main Constancia website. All tables are prefixed with 'fc_' for isolation.
 * 
 * Version: 1.0
 * Platform Name: FinanceCompass
 * Tagline: "Navigate Your Finance Transformation Journey with Confidence"
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index, uniqueIndex, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS & CONSTANTS
// ============================================

// Current widget/schema version - increment when questions or scoring logic changes
export const FC_WIDGET_VERSION = "1.0" as const;

// Note: "quick_assessment" is kept for legacy backwards compatibility
// New assessments should use "registration" (signup), "pre_assessment", or "full"
export const FC_ASSESSMENT_TIERS = ["registration", "quick_assessment", "pre_assessment", "full"] as const;
export type FCAssessmentTier = typeof FC_ASSESSMENT_TIERS[number];

export const FC_ASSESSMENT_STATUSES = [
  "not_started",
  "in_progress", 
  "initial_complete",
  "followups_pending",
  "completed",
  "processing",  // AI analysis is running
  "analysed",
  "report_generated"
] as const;
export type FCAssessmentStatus = typeof FC_ASSESSMENT_STATUSES[number];

export const FC_DIMENSIONS = [
  "financial_planning_analysis",
  "management_reporting",
  "consolidation_close",
  "transaction_processing", // Alternative name for consolidation_close in database
  "financial_controls_compliance",
  "technology_systems",
  "organisation_people",
  "data_analytics",
  "ai_machine_learning"
] as const;
export type FCDimension = typeof FC_DIMENSIONS[number];

export const FC_QUESTION_TYPES = [
  "text",
  "long_text",
  "number",
  "scale",
  "slider",
  "single_select",
  "multi_select",
  "structured"
] as const;
export type FCQuestionType = typeof FC_QUESTION_TYPES[number];

export const FC_SIZE_BANDS = [
  "under_10m",
  "10m_50m",
  "50m_250m",
  "250m_1b",
  "over_1b"
] as const;
export type FCSizeBand = typeof FC_SIZE_BANDS[number];

// ============================================
// DATA QUALITY & MONETIZATION ENUMS
// ============================================

// Traffic source channels for attribution
export const FC_SOURCE_CHANNELS = [
  "direct",
  "organic_search",
  "paid_search",
  "display",
  "social",
  "referral",
  "email",
  "cross_network",
  "unknown"
] as const;
export type FCSourceChannel = typeof FC_SOURCE_CHANNELS[number];

// Device types for segmentation
export const FC_DEVICE_TYPES = [
  "desktop",
  "mobile",
  "tablet",
  "unknown"
] as const;
export type FCDeviceType = typeof FC_DEVICE_TYPES[number];

// Standardized industry categories for benchmarking
export const FC_INDUSTRIES = [
  "financial_services",
  "manufacturing",
  "retail",
  "technology",
  "healthcare",
  "professional_services",
  "energy",
  "real_estate",
  "construction",
  "hospitality",
  "education",
  "public_sector",
  "other"
] as const;
export type FCIndustry = typeof FC_INDUSTRIES[number];

// ISO 3166-1 alpha-2 country codes (most common markets)
export const FC_COUNTRY_CODES = [
  "ZA", // South Africa
  "GB", // United Kingdom
  "US", // United States
  "AU", // Australia
  "NZ", // New Zealand
  "IE", // Ireland
  "CA", // Canada
  "DE", // Germany
  "FR", // France
  "NL", // Netherlands
  "AE", // UAE
  "SG", // Singapore
  "HK", // Hong Kong
  "CH", // Switzerland
  "OTHER"
] as const;
export type FCCountryCode = typeof FC_COUNTRY_CODES[number];

// Quality validation flags
export const FC_QUALITY_FLAGS = [
  "too_fast",           // Completed in < 60 seconds
  "too_slow",           // Completed in > 45 minutes
  "missing_responses",  // More than 2 required questions unanswered
  "uniform_responses",  // All same extreme answer (e.g., all 1s or all 5s)
  "suspicious_pattern", // Other suspicious response patterns
  "incomplete",         // Assessment not completed
  "bot_suspected",      // Suspected automated/bot submission
  "duplicate_ip"        // Multiple submissions from same IP in short time
] as const;
export type FCQualityFlag = typeof FC_QUALITY_FLAGS[number];

// Country name to ISO code mapping for backfill
export const COUNTRY_NAME_TO_ISO: Record<string, FCCountryCode> = {
  "south africa": "ZA",
  "za": "ZA",
  "united kingdom": "GB",
  "uk": "GB",
  "great britain": "GB",
  "england": "GB",
  "scotland": "GB",
  "wales": "GB",
  "united states": "US",
  "usa": "US",
  "us": "US",
  "america": "US",
  "australia": "AU",
  "new zealand": "NZ",
  "ireland": "IE",
  "canada": "CA",
  "germany": "DE",
  "france": "FR",
  "netherlands": "NL",
  "uae": "AE",
  "united arab emirates": "AE",
  "singapore": "SG",
  "hong kong": "HK",
  "switzerland": "CH",
};

// Sector to standardized industry mapping for backfill
export const SECTOR_TO_INDUSTRY: Record<string, FCIndustry> = {
  "financial services": "financial_services",
  "banking": "financial_services",
  "insurance": "financial_services",
  "asset management": "financial_services",
  "fintech": "financial_services",
  "manufacturing": "manufacturing",
  "industrial": "manufacturing",
  "retail": "retail",
  "e-commerce": "retail",
  "consumer goods": "retail",
  "technology": "technology",
  "software": "technology",
  "it": "technology",
  "saas": "technology",
  "healthcare": "healthcare",
  "pharma": "healthcare",
  "life sciences": "healthcare",
  "professional services": "professional_services",
  "consulting": "professional_services",
  "legal": "professional_services",
  "accounting": "professional_services",
  "energy": "energy",
  "oil & gas": "energy",
  "utilities": "energy",
  "real estate": "real_estate",
  "property": "real_estate",
  "construction": "construction",
  "hospitality": "hospitality",
  "travel": "hospitality",
  "education": "education",
  "public sector": "public_sector",
  "government": "public_sector",
  "ngo": "public_sector",
};

// Admin role permissions for FinanceCompass access
export const FC_PERMISSIONS = [
  "fc:view",
  "fc:assessments:view",
  "fc:assessments:manage",
  "fc:questions:view",
  "fc:questions:manage",
  "fc:ai_config:view",
  "fc:ai_config:manage",
  "fc:reports:view",
  "fc:reports:generate",
  "fc:admin:full"
] as const;
export type FCPermission = typeof FC_PERMISSIONS[number];

// ============================================
// ROLE PERMISSIONS MAPPING
// ============================================

export const fcRolePermissions = pgTable("fc_role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcRolePermissionsSchema = createInsertSchema(fcRolePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcRolePermissions = z.infer<typeof insertFcRolePermissionsSchema>;
export type FcRolePermissions = typeof fcRolePermissions.$inferSelect;

// ============================================
// COMPANIES (Assessment Target Organisations)
// ============================================

export const fcCompanies = pgTable("fc_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sector: text("sector"),
  country: text("country").default("United Kingdom"),
  revenueMillions: real("revenue_millions"),
  sizeBand: text("size_band"),
  entities: integer("entities"),
  businessUnits: integer("business_units"),
  totalFte: integer("total_fte"),
  financeFte: integer("finance_fte"),
  financeCostThousands: real("finance_cost_thousands"),
  financeCostPercentage: real("finance_cost_percentage"),
  financeFtePerMillionRevenue: real("finance_fte_per_million_revenue"),
  // Company context for AI insights
  description: text("description"),
  businessModel: text("business_model"),
  keyServices: text("key_services"),
  // Benchmarking fields
  sicCode: text("sic_code"),
  sicDescription: text("sic_description"),
  companiesHouseNumber: text("companies_house_number"),
  jurisdiction: text("jurisdiction").default("UK"),
  // Standardized fields for data monetization (v1.0)
  countryCode: text("country_code").default("GB"),  // ISO 3166-1 alpha-2
  industry: text("industry"),  // Standardized industry category
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_companies_sic").on(table.sicCode),
  index("idx_fc_companies_sector").on(table.sector),
  index("idx_fc_companies_country_code").on(table.countryCode),
  index("idx_fc_companies_industry").on(table.industry),
]);

export const insertFcCompanySchema = createInsertSchema(fcCompanies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcCompany = z.infer<typeof insertFcCompanySchema>;
export type FcCompany = typeof fcCompanies.$inferSelect;

// ============================================
// CONTACTS (Assessment Participants)
// ============================================

export const fcContacts = pgTable("fc_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => fcCompanies.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  emailHash: text("email_hash"),
  roleTitle: text("role_title"),
  phone: text("phone"),
  priorities: text("priorities").array().default(sql`'{}'::text[]`),
  changeUrgency: integer("change_urgency"),
  motivation: text("motivation"),
  consentMarketing: boolean("consent_marketing").default(false).notNull(),
  verified: boolean("verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  hasFullAssessmentAccess: boolean("has_full_assessment_access").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcContactSchema = createInsertSchema(fcContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verified: true,
  verifiedAt: true,
});

export type InsertFcContact = z.infer<typeof insertFcContactSchema>;
export type FcContact = typeof fcContacts.$inferSelect;

// ============================================
// ASSESSMENTS (Main Assessment Records)
// ============================================

export const fcAssessments = pgTable("fc_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => fcCompanies.id),
  contactId: varchar("contact_id").references(() => fcContacts.id),
  tier: text("tier").notNull().default("pre_assessment"),
  status: text("status").notNull().default("not_started"),
  currentStep: integer("current_step").default(0),
  
  // Scoring
  epmReadinessScore: integer("epm_readiness_score"),
  urgencyScore: integer("urgency_score"),
  sizeBand: text("size_band"),
  
  // Dimension scores (1-5) for full assessment
  dimensionScores: jsonb("dimension_scores"),
  overallMaturityScore: real("overall_maturity_score"),
  
  // Component scores for EPM Readiness (0-100 each)
  processPerformanceScore: real("process_performance_score"),
  complexityScaleScore: real("complexity_scale_score"),
  currentStateGapsScore: real("current_state_gaps_score"),
  alternativeSolutionAdjustment: real("alternative_solution_adjustment"),
  
  // Cached data per tier
  generationData: jsonb("generation_data"),
  preAssessmentData: jsonb("pre_assessment_data"),
  fullAssessmentData: jsonb("full_assessment_data"),
  
  // AI Analysis results
  aiAnalysis: jsonb("ai_analysis"),
  aiAnalysedAt: timestamp("ai_analysed_at"),
  
  // Guardrail tracking
  guardrailFlags: jsonb("guardrail_flags"),
  
  // Quick wins and recommendations
  quickWins: jsonb("quick_wins"),
  recommendations: jsonb("recommendations"),
  
  // Internal notes for consultants
  internalNotes: text("internal_notes"),
  assignedTo: varchar("assigned_to"),
  
  // ============================================
  // DATA QUALITY & MONETIZATION FIELDS (v1.0)
  // ============================================
  
  // Widget/schema version for tracking evolution
  widgetVersion: text("widget_version").default("1.0"),
  
  // Traffic attribution
  sourceChannel: text("source_channel"),  // direct, organic_search, paid_search, display, etc.
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  referrer: text("referrer"),
  
  // Device/browser metadata
  deviceType: text("device_type"),  // desktop, mobile, tablet
  browser: text("browser"),
  operatingSystem: text("operating_system"),
  screenResolution: text("screen_resolution"),
  
  // Completion metrics
  completionTimeSeconds: integer("completion_time_seconds"),
  totalQuestionsAnswered: integer("total_questions_answered"),
  totalQuestionsRequired: integer("total_questions_required"),
  
  // Data quality flags
  isValidRecord: boolean("is_valid_record").default(true),
  qualityFlags: text("quality_flags").array().default(sql`'{}'::text[]`),  // Array of FCQualityFlag values
  qualityScore: integer("quality_score"),  // 0-100 quality score
  qualityCheckedAt: timestamp("quality_checked_at"),
  
  // IP/geo metadata (for duplicate detection, anonymized in exports)
  ipHash: text("ip_hash"),  // Hashed IP for duplicate detection
  geoCountry: text("geo_country"),  // Detected country from IP
  geoRegion: text("geo_region"),
  
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_assessments_tier").on(table.tier),
  index("idx_fc_assessments_status").on(table.status),
  index("idx_fc_assessments_company").on(table.companyId),
  index("idx_fc_assessments_valid").on(table.isValidRecord),
  index("idx_fc_assessments_widget_version").on(table.widgetVersion),
  index("idx_fc_assessments_source_channel").on(table.sourceChannel),
  index("idx_fc_assessments_created").on(table.createdAt),
]);

export const insertFcAssessmentSchema = createInsertSchema(fcAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcAssessment = z.infer<typeof insertFcAssessmentSchema>;
export type FcAssessment = typeof fcAssessments.$inferSelect;

// ============================================
// REPORT NARRATIVES (AI-Generated Content)
// ============================================

export const fcReportNarratives = pgTable("fc_report_narratives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => fcAssessments.id),
  
  // Report structure
  reportStructure: jsonb("report_structure"),
  
  // Executive Summary
  executiveSummary: jsonb("executive_summary"),
  
  // Dimension narratives (array of dimension analysis)
  dimensionNarratives: jsonb("dimension_narratives"),
  
  // Key findings and gaps
  keyFindings: jsonb("key_findings"),
  
  // Action plan with quick wins and strategic initiatives
  actionPlan: jsonb("action_plan"),
  
  // Benchmark comparisons
  benchmarks: jsonb("benchmarks"),
  
  // Data synthesis used for generation
  dataSynthesis: jsonb("data_synthesis"),
  
  // Metadata
  isFallback: boolean("is_fallback").default(false),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  regeneratedCount: integer("regenerated_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_report_narratives_assessment").on(table.assessmentId),
]);

export const insertFcReportNarrativeSchema = createInsertSchema(fcReportNarratives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcReportNarrative = z.infer<typeof insertFcReportNarrativeSchema>;
export type FcReportNarrative = typeof fcReportNarratives.$inferSelect;

// ============================================
// QUESTIONS (Question Bank)
// ============================================

export const fcQuestions = pgTable("fc_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tier: text("tier").notNull(),
  dimension: text("dimension"),
  area: text("area"),
  sequence: integer("sequence").notNull(),
  questionKey: text("question_key").notNull().unique(),
  prompt: text("prompt").notNull(),
  helpText: text("help_text"),
  type: text("type").notNull(),
  options: jsonb("options"),
  validation: jsonb("validation"),
  scoringConfig: jsonb("scoring_config"),
  benchmarkConfig: jsonb("benchmark_config"),
  isRequired: boolean("is_required").default(true).notNull(),
  isAdaptive: boolean("is_adaptive").default(false).notNull(),
  dependsOn: jsonb("depends_on"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_questions_tier").on(table.tier),
  index("idx_fc_questions_dimension").on(table.dimension),
]);

export const insertFcQuestionSchema = createInsertSchema(fcQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcQuestion = z.infer<typeof insertFcQuestionSchema>;
export type FcQuestion = typeof fcQuestions.$inferSelect;

// ============================================
// RESPONSES (Assessment Answers)
// ============================================

export const fcResponses = pgTable("fc_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => fcAssessments.id),
  questionId: varchar("question_id").notNull().references(() => fcQuestions.id),
  tier: text("tier").notNull(),
  response: jsonb("response").notNull(),
  rawValue: text("raw_value"),
  score: real("score"),
  isAdaptiveResponse: boolean("is_adaptive_response").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_responses_assessment").on(table.assessmentId),
  index("idx_fc_responses_question").on(table.questionId),
]);

export const insertFcResponseSchema = createInsertSchema(fcResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertFcResponse = z.infer<typeof insertFcResponseSchema>;
export type FcResponse = typeof fcResponses.$inferSelect;

// ============================================
// AI SYSTEM PROMPTS
// ============================================

export const fcAiSystemPrompts = pgTable("fc_ai_system_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  persona: text("persona").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  lastReviewedBy: varchar("last_reviewed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcAiSystemPromptSchema = createInsertSchema(fcAiSystemPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcAiSystemPrompt = z.infer<typeof insertFcAiSystemPromptSchema>;
export type FcAiSystemPrompt = typeof fcAiSystemPrompts.$inferSelect;

// ============================================
// AI GUARDRAILS
// ============================================

export const fcAiGuardrails = pgTable("fc_ai_guardrails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("high"),
  validationType: text("validation_type").notNull(),
  validationConfig: jsonb("validation_config"),
  errorMessage: text("error_message").notNull(),
  isBlocking: boolean("is_blocking").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcAiGuardrailSchema = createInsertSchema(fcAiGuardrails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcAiGuardrail = z.infer<typeof insertFcAiGuardrailSchema>;
export type FcAiGuardrail = typeof fcAiGuardrails.$inferSelect;

// ============================================
// AI GROUNDING RULES
// ============================================

export const fcAiGroundingRules = pgTable("fc_ai_grounding_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  content: text("content").notNull(),
  applicableTiers: text("applicable_tiers").array().default(sql`'{}'::text[]`),
  applicableDimensions: text("applicable_dimensions").array().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcAiGroundingRuleSchema = createInsertSchema(fcAiGroundingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcAiGroundingRule = z.infer<typeof insertFcAiGroundingRuleSchema>;
export type FcAiGroundingRule = typeof fcAiGroundingRules.$inferSelect;

// ============================================
// AI KNOWLEDGE BASE
// ============================================

export const fcAiKnowledgeBase = pgTable("fc_ai_knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  applicableTiers: text("applicable_tiers").array().default(sql`'{}'::text[]`),
  applicableDimensions: text("applicable_dimensions").array().default(sql`'{}'::text[]`),
  sourceCitation: text("source_citation"),
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcAiKnowledgeBaseSchema = createInsertSchema(fcAiKnowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcAiKnowledgeBase = z.infer<typeof insertFcAiKnowledgeBaseSchema>;
export type FcAiKnowledgeBase = typeof fcAiKnowledgeBase.$inferSelect;

// ============================================
// AI FOLLOWUP TEMPLATES
// ============================================

export const fcAiFollowupTemplates = pgTable("fc_ai_followup_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  triggerCondition: jsonb("trigger_condition").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  dimension: text("dimension"),
  priority: integer("priority").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcAiFollowupTemplateSchema = createInsertSchema(fcAiFollowupTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcAiFollowupTemplate = z.infer<typeof insertFcAiFollowupTemplateSchema>;
export type FcAiFollowupTemplate = typeof fcAiFollowupTemplates.$inferSelect;

// ============================================
// REPORTS (Generated Assessment Reports)
// ============================================

export const fcReports = pgTable("fc_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => fcAssessments.id),
  tier: text("tier").notNull(),
  version: integer("version").default(1).notNull(),
  pdfPath: text("pdf_path"),
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  summary: jsonb("summary"),
  executiveSummary: text("executive_summary"),
  dimensionNarratives: jsonb("dimension_narratives"),
  recommendations: jsonb("recommendations"),
  roadmap: jsonb("roadmap"),
  guardrailResult: jsonb("guardrail_result"),
  generatedBy: varchar("generated_by"),
  // SlideSpeak integration fields
  slidesSpeakTaskId: text("slides_speak_task_id"),
  slidesSpeakStatus: text("slides_speak_status"), // pending, generating, ready, failed
  slidesSpeakUrl: text("slides_speak_url"),
  slidesSpeakPdfUrl: text("slides_speak_pdf_url"),
  slidesSpeakError: text("slides_speak_error"),
  slidesSpeakRequestedAt: timestamp("slides_speak_requested_at"),
  slidesSpeakCompletedAt: timestamp("slides_speak_completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_reports_assessment").on(table.assessmentId),
]);

export const insertFcReportSchema = createInsertSchema(fcReports).omit({
  id: true,
  createdAt: true,
});

export type InsertFcReport = z.infer<typeof insertFcReportSchema>;
export type FcReport = typeof fcReports.$inferSelect;

// ============================================
// BENCHMARKS (Industry Benchmarks)
// ============================================

export const fcBenchmarks = pgTable("fc_benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  metric: text("metric").notNull(),
  sizeBand: text("size_band"),
  sector: text("sector"),
  lowValue: real("low_value"),
  midValue: real("mid_value"),
  highValue: real("high_value"),
  unit: text("unit"),
  source: text("source"),
  year: integer("year"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcBenchmarkSchema = createInsertSchema(fcBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcBenchmark = z.infer<typeof insertFcBenchmarkSchema>;
export type FcBenchmark = typeof fcBenchmarks.$inferSelect;

// ============================================
// AUDIT LOGS (FinanceCompass-specific audit trail)
// ============================================

export const fcAuditLogs = pgTable("fc_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id"),
  contactId: varchar("contact_id"),
  assessmentId: varchar("assessment_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_audit_logs_assessment").on(table.assessmentId),
  index("idx_fc_audit_logs_admin").on(table.adminId),
]);

export const insertFcAuditLogSchema = createInsertSchema(fcAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertFcAuditLog = z.infer<typeof insertFcAuditLogSchema>;
export type FcAuditLog = typeof fcAuditLogs.$inferSelect;

// ============================================
// EMAIL VERIFICATION TOKENS
// ============================================

export const fcEmailVerificationTokens = pgTable("fc_email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => fcContacts.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFcEmailVerificationTokenSchema = createInsertSchema(fcEmailVerificationTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertFcEmailVerificationToken = z.infer<typeof insertFcEmailVerificationTokenSchema>;
export type FcEmailVerificationToken = typeof fcEmailVerificationTokens.$inferSelect;

// ============================================
// ACCESS REQUESTS (Full Assessment Access Requests)
// ============================================

export const FC_ACCESS_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type FCAccessRequestStatus = typeof FC_ACCESS_REQUEST_STATUSES[number];

export const fcAccessRequests = pgTable("fc_access_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => fcContacts.id),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_access_requests_contact").on(table.contactId),
  index("idx_fc_access_requests_status").on(table.status),
]);

export const insertFcAccessRequestSchema = createInsertSchema(fcAccessRequests).omit({
  id: true,
  createdAt: true,
  requestedAt: true,
});

export type InsertFcAccessRequest = z.infer<typeof insertFcAccessRequestSchema>;
export type FcAccessRequest = typeof fcAccessRequests.$inferSelect;

// ============================================
// PRIORITY OPTIONS (For Generation Tier)
// ============================================

export const FC_PRIORITY_OPTIONS = [
  { value: "forecasting_accuracy", label: "Improve forecasting accuracy and agility" },
  { value: "reduce_close_time", label: "Reduce close cycle time" },
  { value: "management_reporting", label: "Enhance management reporting and analytics" },
  { value: "epm_planning", label: "Implement or strengthen EPM/planning capability" },
  { value: "operating_model", label: "Optimise finance operating model / shared services" },
  { value: "data_quality", label: "Improve data quality and governance" },
  { value: "controls_compliance", label: "Strengthen financial controls and compliance" },
  { value: "business_partnering", label: "Build business partnering capability" },
  { value: "reduce_costs", label: "Reduce finance operating costs" },
  { value: "other", label: "Other" },
] as const;

// ============================================
// URGENCY SCALE DESCRIPTIONS
// ============================================

export const FC_URGENCY_SCALE = [
  { value: 1, label: "No change needed", description: "The finance function is operating effectively" },
  { value: 2, label: "Minor enhancements", description: "Small improvements could be beneficial" },
  { value: 3, label: "Moderate change", description: "Some areas require meaningful improvement" },
  { value: 4, label: "Significant transformation", description: "Major changes are needed across multiple areas" },
  { value: 5, label: "Urgent, fundamental transformation", description: "Critical need for immediate, comprehensive change" },
] as const;

// ============================================
// EPM READINESS SCORE INTERPRETATION
// ============================================

export const FC_EPM_READINESS_BANDS = [
  { min: 60, max: 100, label: "Strong EPM Case", description: "Compelling business case for EPM implementation" },
  { min: 40, max: 59, label: "Moderate Case", description: "Context-dependent - benefits may vary" },
  { min: 0, max: 39, label: "Weak Case", description: "Focus on foundational improvements first" },
] as const;

// ============================================
// 7 DIMENSION FRAMEWORK DEFINITIONS
// ============================================

export const FC_DIMENSION_DEFINITIONS = {
  financial_planning_analysis: {
    name: "Financial Planning & Analysis",
    shortName: "FP&A",
    description: "Budgeting, forecasting, scenario modelling, and financial analysis capabilities",
    futureState: "Continuous real-time forecasts with AI-driven scenario modelling and autonomous variance analysis",
    aiCapabilities: ["Predictive analytics", "Autonomous forecasting", "AI-assisted scenario planning", "GenAI narrative generation"],
    maturityLevels: {
      1: "Annual budget only, manual spreadsheet processes",
      2: "Quarterly reforecasts with some automation",
      3: "Monthly rolling forecasts, structured processes",
      4: "Weekly rolling forecasts, AI-assisted analysis (Constancia Good)",
      5: "Continuous real-time forecasting with autonomous AI agents"
    }
  },
  management_reporting: {
    name: "Management Reporting",
    shortName: "Reporting",
    description: "Management information, dashboards, KPIs, and business intelligence",
    futureState: "Self-service analytics with AI-generated insights and natural language querying",
    aiCapabilities: ["Automated insight generation", "Natural language BI queries", "Anomaly detection", "Predictive KPI alerts"],
    maturityLevels: {
      1: "Static monthly reports, manual compilation",
      2: "Standardised reports with basic automation",
      3: "Interactive dashboards with drill-down",
      4: "Real-time dashboards with automated alerts (Constancia Good)",
      5: "AI-powered self-service with proactive insights"
    }
  },
  consolidation_close: {
    name: "Consolidation & Close",
    shortName: "Close",
    description: "Financial close, consolidation, intercompany transactions, and period-end processes",
    futureState: "Continuous close with intelligent automation and AI-powered exception handling",
    aiCapabilities: ["Intelligent document processing", "Automated intercompany matching", "Predictive close analytics", "AI exception handling"],
    maturityLevels: {
      1: "Manual close processes, extended timelines",
      2: "Basic automation, some standardization",
      3: "Workflow automation, structured close calendar",
      4: "Accelerated close with intelligent routing (Constancia Good)",
      5: "Continuous close with agentic AI handling exceptions"
    }
  },
  financial_controls_compliance: {
    name: "Financial Controls & Compliance",
    shortName: "Controls",
    description: "Internal controls, audit readiness, regulatory compliance, and governance",
    futureState: "Continuous controls monitoring with AI-powered risk detection and automated compliance",
    aiCapabilities: ["Continuous control monitoring", "AI fraud detection", "Automated compliance testing", "Predictive risk scoring"],
    maturityLevels: {
      1: "Manual controls, periodic testing",
      2: "Documented controls with scheduled reviews",
      3: "Automated key controls, risk-based testing",
      4: "Continuous monitoring with real-time alerts (Constancia Good)",
      5: "AI-powered predictive risk management and autonomous compliance"
    }
  },
  technology_systems: {
    name: "Technology & Systems",
    shortName: "Technology",
    description: "ERP, EPM, BI tools, integrations, and technology infrastructure",
    futureState: "Unified cloud platform with embedded AI, seamless integrations, and agentic capabilities",
    aiCapabilities: ["Embedded AI/ML capabilities", "Intelligent automation", "API-first architecture", "Agentic AI integration"],
    maturityLevels: {
      1: "Legacy systems, manual integrations",
      2: "Modern ERP with basic integrations",
      3: "Cloud-based systems with standard APIs",
      4: "Unified platform with embedded analytics (Constancia Good)",
      5: "AI-native platform with agentic automation capabilities"
    }
  },
  organisation_people: {
    name: "Organisation & People",
    shortName: "People",
    description: "Operating model, skills, talent, business partnering, and change readiness",
    futureState: "AI-augmented finance teams focused on strategic business partnering and value creation",
    aiCapabilities: ["AI-augmented decision making", "Digital skills development", "Human-AI collaboration", "Strategic workforce planning"],
    maturityLevels: {
      1: "Transactional focus, limited business interaction",
      2: "Some business partnering, developing skills",
      3: "Established business partnering model",
      4: "Strategic advisors with strong digital skills (Constancia Good)",
      5: "AI-augmented teams driving strategic value creation"
    }
  },
  data_analytics: {
    name: "Data & Analytics",
    shortName: "Data",
    description: "Data quality, governance, master data, and advanced analytics",
    futureState: "AI-ready data foundation with predictive analytics and autonomous data quality management",
    aiCapabilities: ["AI-powered data quality", "Predictive analytics", "Machine learning models", "Natural language data exploration"],
    maturityLevels: {
      1: "Fragmented data, poor quality, no governance",
      2: "Basic data standards, some governance",
      3: "Unified data model, established governance",
      4: "Analytics centre of excellence, advanced BI (Constancia Good)",
      5: "AI-ready data fabric with autonomous quality management"
    }
  },
} as const;

// ============================================
// TENANTS (Multi-Tenant Foundation)
// ============================================

export const fcTenants = pgTable("fc_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#0A1628"),
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#00D4FF"),
  fontFamily: text("font_family").default("Inter"),
  customCss: text("custom_css"),
  settings: jsonb("settings"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFcTenantSchema = createInsertSchema(fcTenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcTenant = z.infer<typeof insertFcTenantSchema>;
export type FcTenant = typeof fcTenants.$inferSelect;

// ============================================
// FINANCIAL SCENARIOS (Scenario Modelling)
// ============================================

export const FC_SCENARIO_TYPES = [
  "baseline",
  "optimistic",
  "conservative",
  "custom"
] as const;
export type FCScenarioType = typeof FC_SCENARIO_TYPES[number];

export const fcScenarios = pgTable("fc_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").references(() => fcAssessments.id),
  companyId: varchar("company_id").references(() => fcCompanies.id),
  name: text("name").notNull(),
  description: text("description"),
  scenarioType: text("scenario_type").notNull().default("baseline"),
  baseYear: integer("base_year").notNull(),
  projectionYears: integer("projection_years").default(5).notNull(),
  assumptions: jsonb("assumptions"),
  projections: jsonb("projections"),
  npv: real("npv"),
  irr: real("irr"),
  paybackMonths: integer("payback_months"),
  totalCost: real("total_cost"),
  totalBenefit: real("total_benefit"),
  riskScore: integer("risk_score"),
  isBaseline: boolean("is_baseline").default(false).notNull(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_scenarios_assessment").on(table.assessmentId),
  index("idx_fc_scenarios_company").on(table.companyId),
]);

export const insertFcScenarioSchema = createInsertSchema(fcScenarios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcScenario = z.infer<typeof insertFcScenarioSchema>;
export type FcScenario = typeof fcScenarios.$inferSelect;

// ============================================
// SCENARIO ASSUMPTIONS (Variables & Drivers)
// ============================================

export const FC_ASSUMPTION_CATEGORIES = [
  "cost",
  "benefit",
  "timeline",
  "resource",
  "risk",
  "growth"
] as const;
export type FCAssumptionCategory = typeof FC_ASSUMPTION_CATEGORIES[number];

export const fcScenarioAssumptions = pgTable("fc_scenario_assumptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: varchar("scenario_id").notNull().references(() => fcScenarios.id),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  value: real("value").notNull(),
  unit: text("unit"),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  isEditable: boolean("is_editable").default(true).notNull(),
  dependsOn: jsonb("depends_on"),
  formula: text("formula"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_scenario_assumptions_scenario").on(table.scenarioId),
]);

export const insertFcScenarioAssumptionSchema = createInsertSchema(fcScenarioAssumptions).omit({
  id: true,
  createdAt: true,
});

export type InsertFcScenarioAssumption = z.infer<typeof insertFcScenarioAssumptionSchema>;
export type FcScenarioAssumption = typeof fcScenarioAssumptions.$inferSelect;

// ============================================
// DOCUMENT GENERATION JOBS (SlideSpeak/PDF Queue)
// ============================================

export const FC_DOCUMENT_TYPES = [
  "pdf_report",
  "pdf_executive_summary",
  "pptx_presentation",
  "pptx_roadmap",
  "excel_data"
] as const;
export type FCDocumentType = typeof FC_DOCUMENT_TYPES[number];

export const FC_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled"
] as const;
export type FCJobStatus = typeof FC_JOB_STATUSES[number];

export const fcDocumentJobs = pgTable("fc_document_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: text("external_id").unique(),
  assessmentId: varchar("assessment_id").references(() => fcAssessments.id),
  scenarioId: varchar("scenario_id").references(() => fcScenarios.id),
  documentType: text("document_type").notNull(),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull().default("pdfkit"),
  inputData: jsonb("input_data"),
  outputUrl: text("output_url"),
  outputPath: text("output_path"),
  fileSize: integer("file_size"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  priority: integer("priority").default(0).notNull(),
  requestedBy: varchar("requested_by"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_document_jobs_assessment").on(table.assessmentId),
  index("idx_fc_document_jobs_status").on(table.status),
]);

export const insertFcDocumentJobSchema = createInsertSchema(fcDocumentJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export type InsertFcDocumentJob = z.infer<typeof insertFcDocumentJobSchema>;
export type FcDocumentJob = typeof fcDocumentJobs.$inferSelect;

// ============================================
// EXTENDED AUDIT EVENTS (Detailed Tracking)
// ============================================

export const FC_AUDIT_EVENT_TYPES = [
  "assessment_started",
  "assessment_completed",
  "response_submitted",
  "ai_analysis_triggered",
  "report_generated",
  "document_exported",
  "scenario_created",
  "scenario_modified",
  "admin_access",
  "data_viewed",
  "data_modified",
  "permission_changed",
  "login_success",
  "login_failed",
  "session_created",
  "session_expired"
] as const;
export type FCAuditEventType = typeof FC_AUDIT_EVENT_TYPES[number];

export const fcAuditEvents = pgTable("fc_audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => fcTenants.id),
  userId: varchar("user_id"),
  sessionId: varchar("session_id"),
  eventType: text("event_type").notNull(),
  resourceType: text("resource_type"),
  resourceId: varchar("resource_id"),
  action: text("action").notNull(),
  description: text("description"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  geoLocation: jsonb("geo_location"),
  riskLevel: text("risk_level").default("low"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_audit_events_tenant").on(table.tenantId),
  index("idx_fc_audit_events_user").on(table.userId),
  index("idx_fc_audit_events_type").on(table.eventType),
  index("idx_fc_audit_events_resource").on(table.resourceType, table.resourceId),
  index("idx_fc_audit_events_created").on(table.createdAt),
]);

export const insertFcAuditEventSchema = createInsertSchema(fcAuditEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertFcAuditEvent = z.infer<typeof insertFcAuditEventSchema>;
export type FcAuditEvent = typeof fcAuditEvents.$inferSelect;

// ============================================
// KNOWLEDGE BASE SEARCH INDEX (Full-Text Search)
// ============================================

export const fcKnowledgeBaseSearch = pgTable("fc_knowledge_base_search", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => fcAiKnowledgeBase.id),
  searchVector: text("search_vector"),
  titleTokens: text("title_tokens"),
  contentTokens: text("content_tokens"),
  tagTokens: text("tag_tokens"),
  combinedText: text("combined_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_kb_search_kb_id").on(table.knowledgeBaseId),
]);

export const insertFcKnowledgeBaseSearchSchema = createInsertSchema(fcKnowledgeBaseSearch).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcKnowledgeBaseSearch = z.infer<typeof insertFcKnowledgeBaseSearchSchema>;
export type FcKnowledgeBaseSearch = typeof fcKnowledgeBaseSearch.$inferSelect;

// ============================================
// ROI/TCO PROFILES (Finance Transformation ROI Calculator)
// ============================================

export const fcRoiProfiles = pgTable("fc_roi_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => fcAssessments.id),
  contactId: varchar("contact_id").references(() => fcContacts.id),
  companyId: varchar("company_id").references(() => fcCompanies.id),
  
  // Programme Framing
  currency: text("currency").default("GBP").notNull(),
  horizonYears: integer("horizon_years").default(3).notNull(),
  industry: text("industry").default("cross_industry"), // Industry sector for benchmarking
  baselineOperatingCost: real("baseline_operating_cost"), // Annual finance function cost (£k)
  transformationBudget: real("transformation_budget"), // From framing questions (£k)
  
  // Current State Metrics (for benchmarking)
  currentCloseDays: real("current_close_days").default(10), // Current monthly close cycle (days)
  currentForecastAccuracy: real("current_forecast_accuracy").default(82), // Current forecast accuracy (%)
  currentReportsAutomated: real("current_reports_automated").default(30), // Current reports automation (%)
  
  // Implementation Costs (£k) - Legacy simple fields for backwards compatibility
  softwareLicenses: real("software_licenses").default(0),
  integrationCosts: real("integration_costs").default(0),
  dataMigration: real("data_migration").default(0),
  changeManagement: real("change_management").default(0),
  internalFteCosts: real("internal_fte_costs").default(0),
  trainingCosts: real("training_costs").default(0),
  contingency: real("contingency").default(0),
  
  // Benefit Streams - Legacy simple fields for backwards compatibility
  processEfficiencyPercent: real("process_efficiency_percent").default(0), // % time saved
  headcountDelta: real("headcount_delta").default(0), // FTE reduction/redeployment
  closeAccelerationDays: real("close_acceleration_days").default(0), // Days saved in close
  closeAccelerationValue: real("close_acceleration_value").default(0), // £k value of faster close
  complianceRiskAvoidance: real("compliance_risk_avoidance").default(0), // £k risk reduction
  auditEfficiencySavings: real("audit_efficiency_savings").default(0), // £k audit cost savings
  revenueEnablement: real("revenue_enablement").default(0), // £k revenue impact
  externalConsultingSavings: real("external_consulting_savings").default(0), // £k consulting reduction
  
  // Operating Model Impacts (Annual £k) - Legacy simple fields
  runRateOpex: real("run_rate_opex").default(0), // Annual software/support costs
  supportCosts: real("support_costs").default(0), // Annual internal support
  depreciation: real("depreciation").default(0), // Annual depreciation
  
  // Financial Assumptions
  discountRate: real("discount_rate").default(8), // % annual discount rate
  inflationRate: real("inflation_rate").default(2.5), // % annual inflation
  benefitRampYear1: real("benefit_ramp_year_1").default(25), // % of benefits in Y1
  benefitRampYear2: real("benefit_ramp_year_2").default(75), // % of benefits in Y2
  benefitRampYear3: real("benefit_ramp_year_3").default(100), // % of benefits in Y3+
  
  // ============================================
  // ENHANCED TCO/ROI MODEL (JSONB for flexibility)
  // ============================================
  
  // Year-by-year TCO breakdown - one-off, recurring, indirect costs
  costBreakdown: jsonb("cost_breakdown"), // RoiCostBreakdown structure
  
  // Year-by-year benefit streams linked to KPIs
  benefitBreakdown: jsonb("benefit_breakdown"), // RoiBenefitBreakdown structure
  
  // Baseline KPIs imported from assessment
  kpiBaseline: jsonb("kpi_baseline"), // RoiKpiBaseline structure
  
  // Scenario comparison data (do-nothing vs target)
  scenarios: jsonb("scenarios"), // RoiScenarios structure
  
  // Sensitivity analysis configuration
  sensitivityConfig: jsonb("sensitivity_config"), // RoiSensitivityConfig structure
  
  // Calculated year-by-year analysis
  yearByYearAnalysis: jsonb("year_by_year_analysis"), // RoiYearByYearAnalysis structure
  
  // Calculated Metrics (stored for quick retrieval)
  totalImplementationCost: real("total_implementation_cost"),
  totalAnnualBenefits: real("total_annual_benefits"),
  totalAnnualCosts: real("total_annual_costs"),
  roiPercent: real("roi_percent"),
  totalCostOfOwnership: real("total_cost_of_ownership"),
  paybackMonths: real("payback_months"),
  npvValue: real("npv_value"),
  benefitCostRatio: real("benefit_cost_ratio"),
  
  // Metadata
  isComplete: boolean("is_complete").default(false).notNull(),
  lastCalculatedAt: timestamp("last_calculated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_roi_profiles_assessment").on(table.assessmentId),
  index("idx_fc_roi_profiles_contact").on(table.contactId),
  index("idx_fc_roi_profiles_company").on(table.companyId),
]);

// ============================================
// ROI ENHANCED TYPE DEFINITIONS
// ============================================

// Year-by-year cost entry
export interface RoiYearCost {
  year: number;
  value: number; // £k
}

// One-off / upfront costs
export interface RoiOneOffCosts {
  softwareLicenses: number;
  implementationPartnerFees: number;
  internalProjectTime: number;
  dataMigration: number;
  integrations: number;
  customisation: number;
  testing: number;
  processRedesign: number;
  changeManagement: number;
  training: number;
  legacyDecommissioning: number;
  contingency: number;
}

// Recurring operating costs
export interface RoiRecurringCosts {
  saasSubscriptions: RoiYearCost[];
  infrastructureHosting: RoiYearCost[];
  supportMaintenance: RoiYearCost[];
  adminFte: RoiYearCost[];
  ongoingTraining: RoiYearCost[];
  futureEnhancements: RoiYearCost[];
}

// Indirect and risk-related costs
export interface RoiIndirectCosts {
  productivityLoss: RoiYearCost[];
  parallelRun: RoiYearCost[];
  defectRemediation: RoiYearCost[];
  riskComplianceWork: RoiYearCost[];
  scalabilityUpgrades: RoiYearCost[];
}

// Complete cost breakdown structure
export interface RoiCostBreakdown {
  oneOff: RoiOneOffCosts;
  recurring: RoiRecurringCosts;
  indirect: RoiIndirectCosts;
}

// Efficiency and FTE savings
export interface RoiEfficiencyBenefits {
  planningCycleReductionDays: number;
  planningCycleValuePerDay: number;
  closeCycleReductionDays: number;
  closeCycleValuePerDay: number;
  manualReconciliationHoursSaved: number;
  hourlyRate: number;
  dataWranglingHoursSaved: number;
  fteReductionCount: number;
  fteLoadedCost: number;
}

// Revenue, margin, and cash impact
export interface RoiRevenueImpact {
  forecastAccuracyImprovementPercent: number;
  revenueBase: number;
  stockOutReductionValue: number;
  pricingImprovementValue: number;
  capacityDecisionValue: number;
  workingCapitalImprovementPercent: number;
  workingCapitalBase: number;
  costOfCapitalPercent: number;
}

// Risk and quality benefits
export interface RoiRiskBenefits {
  auditFindingsReduction: number;
  auditFindingCost: number;
  restatementAvoidanceProbability: number;
  restatementCost: number;
  errorAvoidanceValue: number;
}

// Intangible / strategic benefits (qualitative or proxy values)
export interface RoiIntangibleBenefits {
  decisionSpeedImprovement: string; // Qualitative description
  employeeSatisfactionChange: string;
  strategicFlexibility: string;
  proxyFinancialValue: number; // Conservative £k estimate
}

// Complete benefit breakdown structure
export interface RoiBenefitBreakdown {
  efficiency: RoiEfficiencyBenefits;
  revenue: RoiRevenueImpact;
  risk: RoiRiskBenefits;
  intangible: RoiIntangibleBenefits;
}

// KPI baseline from assessment
export interface RoiKpiBaseline {
  forecastAccuracyPercent: number | null;
  planningCycleDays: number | null;
  closeCycleDays: number | null;
  fteEffort: number | null;
  dataQualityIssuesPercent: number | null;
  manualAdjustmentsCount: number | null;
  auditFindingsCount: number | null;
  assessmentImportedAt: string | null;
}

// Individual scenario data
export interface RoiScenario {
  id: string;
  name: string;
  description: string;
  isBaseline: boolean;
  costBreakdown: RoiCostBreakdown | null;
  benefitBreakdown: RoiBenefitBreakdown | null;
  calculatedMetrics: {
    totalTco: number;
    totalBenefits: number;
    netBenefit: number;
    roiPercent: number;
    paybackMonths: number;
    npv: number;
    bcr: number;
  } | null;
}

// Scenario comparison structure
export interface RoiScenarios {
  doNothing: RoiScenario;
  targetImplementation: RoiScenario;
  alternatives?: RoiScenario[];
}

// Sensitivity analysis configuration
export interface RoiSensitivityConfig {
  improvementPercentRange: { min: number; max: number; current: number };
  licenseCostRange: { min: number; max: number; current: number };
  discountRateRange: { min: number; max: number; current: number };
  adoptionRateRange: { min: number; max: number; current: number };
  bestCase: { roiPercent: number; npv: number; paybackMonths: number };
  midCase: { roiPercent: number; npv: number; paybackMonths: number };
  worstCase: { roiPercent: number; npv: number; paybackMonths: number };
}

// Year-by-year analysis row
export interface RoiYearAnalysisRow {
  year: number;
  oneOffCosts: number;
  recurringCosts: number;
  indirectCosts: number;
  totalCosts: number;
  cumulativeCosts: number;
  efficiencyBenefits: number;
  revenueBenefits: number;
  riskBenefits: number;
  totalBenefits: number;
  cumulativeBenefits: number;
  netCashFlow: number;
  cumulativeNetCashFlow: number;
  discountedNetCashFlow: number;
  cumulativeNpv: number;
}

// Complete year-by-year analysis
export interface RoiYearByYearAnalysis {
  years: RoiYearAnalysisRow[];
  summary: {
    totalTco: number;
    totalBenefits: number;
    netBenefit: number;
    roiPercent: number;
    paybackMonth: number;
    npv: number;
    bcr: number;
    irr: number | null;
  };
}

export const insertFcRoiProfileSchema = createInsertSchema(fcRoiProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCalculatedAt: true,
});

export type InsertFcRoiProfile = z.infer<typeof insertFcRoiProfileSchema>;
export type FcRoiProfile = typeof fcRoiProfiles.$inferSelect;

// ============================================
// WORKSHOPS (Assessment Workshop Scheduling)
// ============================================

export const FC_WORKSHOP_TYPES = ["remediation", "confirmation"] as const;
export type FCWorkshopType = typeof FC_WORKSHOP_TYPES[number];

export const FC_WORKSHOP_STATUSES = [
  "scheduled",
  "pending_booking",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "rescheduled"
] as const;
export type FCWorkshopStatus = typeof FC_WORKSHOP_STATUSES[number];

export const fcWorkshops = pgTable("fc_workshops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => fcAssessments.id),
  
  // Workshop identification
  workshopType: text("workshop_type").notNull(), // remediation or confirmation
  workshopId: text("workshop_id").notNull(), // W1, W2, W3, W4 or C0_1, C1_1, etc.
  workshopName: text("workshop_name").notNull(),
  
  // Scheduling
  weekNumber: integer("week_number"), // 1, 3, 5, 7 for remediation
  durationHours: integer("duration_hours").notNull().default(4),
  scheduledDate: timestamp("scheduled_date"),
  scheduledEndDate: timestamp("scheduled_end_date"),
  
  // Status
  status: text("status").notNull().default("pending_booking"),
  
  // Workshop details
  objectives: jsonb("objectives"), // Array of strings
  preWorkshopRequirements: jsonb("pre_workshop_requirements"), // Array of strings
  agenda: jsonb("agenda"), // Session details
  deliverables: jsonb("deliverables"), // Array of strings
  
  // Confirmation workshop specific
  triggerDimension: text("trigger_dimension"), // Which dimension triggered this
  triggerScore: real("trigger_score"), // Score that triggered
  triggerBenchmark: real("trigger_benchmark"), // Benchmark comparison
  
  // Participants
  participantCount: text("participant_count"), // e.g., "8-15"
  participants: jsonb("participants"), // Array of participant details
  
  // Booking details
  bookedBy: varchar("booked_by"),
  bookedAt: timestamp("booked_at"),
  bookingNotes: text("booking_notes"),
  meetingLink: text("meeting_link"),
  
  // Admin management
  facilitator: text("facilitator"),
  internalNotes: text("internal_notes"),
  
  // Timestamps
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_workshops_assessment").on(table.assessmentId),
  index("idx_fc_workshops_type").on(table.workshopType),
  index("idx_fc_workshops_status").on(table.status),
]);

export const insertFcWorkshopSchema = createInsertSchema(fcWorkshops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcWorkshop = z.infer<typeof insertFcWorkshopSchema>;
export type FcWorkshop = typeof fcWorkshops.$inferSelect;

// Workshop schedule generation types
export interface WorkshopScheduleItem {
  workshopId: string;
  workshopName: string;
  workshopType: FCWorkshopType;
  weekNumber: number;
  durationHours: number;
  objectives: string[];
  participantCount: string;
  status: FCWorkshopStatus;
  scheduledDate?: string;
  triggerInfo?: {
    dimension: string;
    score: number;
    benchmark: number;
    reasoning: string;
  };
  deliverables?: string[];
  successMetrics?: string[];
  prerequisites?: string[];
  keyActivities?: string[];
  risksMitigated?: string[];
  estimatedValue?: string;
  tools?: string[];
  industryBenchmarkContext?: string;
  maturityImplication?: string;
}

export interface FinanceCostBenchmark {
  sector: string;
  companyFinanceCostPct: number | null;
  industryMedianPct: number;
  topQuartilePct: number;
  performanceVsMedian: "above" | "at" | "below" | "unknown";
  gapToTopQuartile: number | null;
  potentialSavingsRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface EnhancedWorkshopSummary {
  totalWorkshops: number;
  totalHours: number;
  remediationCount: number;
  confirmationCount: number;
  durationWeeks: number;
  totalTransformationValue?: string;
  implementationTimelineMonths?: number;
  quickWinPotential?: string;
}

export interface WorkshopSchedule {
  assessmentId: string;
  remediationWorkshops: WorkshopScheduleItem[];
  confirmationWorkshops: WorkshopScheduleItem[];
  summary: EnhancedWorkshopSummary;
  insight: string;
  financeCostBenchmark?: FinanceCostBenchmark;
  industryContext?: {
    sector: string;
    sectorDescription: string;
    typicalTransformationTimeline: string;
    keyValueDrivers: string[];
    commonChallenges: string[];
  };
  valueRoadmap?: {
    phase1QuickWins: string[];
    phase2Foundation: string[];
    phase3Scale: string[];
    totalPotentialValue: string;
  };
}

// ============================================
// BENCHMARKING ENGINE - SIC CODES
// ============================================

export const fcSicCodes = pgTable("fc_sic_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  section: text("section"), // A-U high-level sections
  sectionName: text("section_name"),
  division: text("division"), // 2-digit division
  divisionName: text("division_name"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_sic_codes_code").on(table.code),
  index("idx_fc_sic_codes_section").on(table.section),
]);

export const insertFcSicCodeSchema = createInsertSchema(fcSicCodes).omit({
  id: true,
  createdAt: true,
});

export type InsertFcSicCode = z.infer<typeof insertFcSicCodeSchema>;
export type FcSicCode = typeof fcSicCodes.$inferSelect;

// ============================================
// BENCHMARKING ENGINE - EXTERNAL COMPANIES
// ============================================

export const FC_JURISDICTIONS = ["UK", "US", "EU", "GLOBAL"] as const;
export type FCJurisdiction = typeof FC_JURISDICTIONS[number];

export const FC_COMPANY_SIZE_CATEGORIES = ["micro", "small", "mid_market", "large", "enterprise"] as const;
export type FCCompanySizeCategory = typeof FC_COMPANY_SIZE_CATEGORIES[number];

export const fcBenchmarkCompanies = pgTable("fc_benchmark_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ticker: text("ticker"),
  companiesHouseNumber: text("companies_house_number"),
  cik: text("cik"), // SEC CIK for US companies
  jurisdiction: text("jurisdiction").notNull().default("UK"),
  sicCode: text("sic_code"),
  sicDescription: text("sic_description"),
  sector: text("sector"),
  industry: text("industry"),
  sizeCategory: text("size_category"),
  revenueGbp: real("revenue_gbp"),
  employees: integer("employees"),
  foundingYear: integer("founding_year"),
  isPublic: boolean("is_public").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  dataSource: text("data_source"), // "companies_house", "sec_edgar", "manual"
  lastUpdated: timestamp("last_updated"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_benchmark_companies_sic").on(table.sicCode),
  index("idx_fc_benchmark_companies_sector").on(table.sector),
  index("idx_fc_benchmark_companies_jurisdiction").on(table.jurisdiction),
]);

export const insertFcBenchmarkCompanySchema = createInsertSchema(fcBenchmarkCompanies).omit({
  id: true,
  createdAt: true,
});

export type InsertFcBenchmarkCompany = z.infer<typeof insertFcBenchmarkCompanySchema>;
export type FcBenchmarkCompany = typeof fcBenchmarkCompanies.$inferSelect;

// ============================================
// BENCHMARKING ENGINE - FINANCIAL METRICS
// ============================================

export const fcFinancialMetrics = pgTable("fc_financial_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => fcBenchmarkCompanies.id),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalYearEnd: timestamp("fiscal_year_end"),
  filingDate: timestamp("filing_date"),
  
  // Core financials (in GBP thousands)
  revenue: real("revenue"),
  operatingProfit: real("operating_profit"),
  netProfit: real("net_profit"),
  totalAssets: real("total_assets"),
  totalLiabilities: real("total_liabilities"),
  shareholderEquity: real("shareholder_equity"),
  cashAndEquivalents: real("cash_and_equivalents"),
  
  // Derived metrics (calculated on insert/update)
  closeCycleDays: integer("close_cycle_days"), // filing_date - fiscal_year_end
  operatingMarginPercent: real("operating_margin_percent"),
  netMarginPercent: real("net_margin_percent"),
  assetTurnover: real("asset_turnover"), // revenue / total_assets
  debtToEquity: real("debt_to_equity"),
  returnOnAssets: real("return_on_assets"),
  returnOnEquity: real("return_on_equity"),
  
  // Filing quality
  wasAmended: boolean("was_amended").default(false).notNull(),
  wasLate: boolean("was_late").default(false).notNull(),
  
  // Metadata
  dataSource: text("data_source"),
  dataQualityScore: real("data_quality_score"), // 0-1
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_financial_metrics_company").on(table.companyId),
  index("idx_fc_financial_metrics_year").on(table.fiscalYear),
]);

export const insertFcFinancialMetricSchema = createInsertSchema(fcFinancialMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcFinancialMetric = z.infer<typeof insertFcFinancialMetricSchema>;
export type FcFinancialMetric = typeof fcFinancialMetrics.$inferSelect;

// ============================================
// BENCHMARKING ENGINE - MACRO BENCHMARKS
// ============================================

export const FC_MACRO_SOURCES = ["ONS", "FRED", "WORLD_BANK", "COMPANIES_HOUSE", "SEC", "MANUAL"] as const;
export type FCMacroSource = typeof FC_MACRO_SOURCES[number];

export const FC_BENCHMARK_METRIC_TYPES = [
  "close_cycle_days",
  "operating_margin",
  "net_margin",
  "revenue_growth",
  "asset_turnover",
  "return_on_assets",
  "return_on_equity",
  "debt_to_equity",
  "data_quality_score",
  "labor_productivity",
  "tech_adoption",
  "digital_maturity"
] as const;
export type FCBenchmarkMetricType = typeof FC_BENCHMARK_METRIC_TYPES[number];

export const fcMacroBenchmarks = pgTable("fc_macro_benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // ONS, FRED, WORLD_BANK, etc.
  metricType: text("metric_type").notNull(),
  metricName: text("metric_name").notNull(),
  sector: text("sector"),
  sicCode: text("sic_code"),
  jurisdiction: text("jurisdiction").default("UK"),
  
  // Values
  value: real("value").notNull(),
  unit: text("unit"), // "days", "percent", "ratio", etc.
  
  // Time context
  periodType: text("period_type"), // "annual", "quarterly", "monthly"
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  year: integer("year"),
  quarter: integer("quarter"),
  
  // Metadata
  sourceUrl: text("source_url"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  fetchedAt: timestamp("fetched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_macro_benchmarks_metric").on(table.metricType),
  index("idx_fc_macro_benchmarks_sector").on(table.sector),
  index("idx_fc_macro_benchmarks_source").on(table.source),
]);

export const insertFcMacroBenchmarkSchema = createInsertSchema(fcMacroBenchmarks).omit({
  id: true,
  createdAt: true,
});

export type InsertFcMacroBenchmark = z.infer<typeof insertFcMacroBenchmarkSchema>;
export type FcMacroBenchmark = typeof fcMacroBenchmarks.$inferSelect;

// ============================================
// BENCHMARKING ENGINE - INDUSTRY BENCHMARKS (Calculated Percentiles)
// ============================================

export const fcIndustryBenchmarks = pgTable("fc_industry_benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sicDivision: text("sic_division"),
  sector: text("sector"),
  sizeCategory: text("size_category"),
  metricType: text("metric_type").notNull(),
  metricName: text("metric_name"),
  jurisdiction: text("jurisdiction").default("UK"),
  
  // Percentile values
  p10: real("p10"),
  p25: real("p25"),
  p50: real("p50"), // Median
  p75: real("p75"),
  p90: real("p90"),
  mean: real("mean"),
  stdDev: real("std_dev"),
  
  // Sample info
  sampleSize: integer("sample_size").notNull(),
  dataPeriodStart: timestamp("data_period_start"),
  dataPeriodEnd: timestamp("data_period_end"),
  
  // Metadata
  notes: text("notes"),
  calculationDate: timestamp("calculation_date").defaultNow(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_industry_benchmarks_sic").on(table.sicDivision),
  index("idx_fc_industry_benchmarks_sector").on(table.sector),
  index("idx_fc_industry_benchmarks_metric").on(table.metricType),
]);

export const insertFcIndustryBenchmarkSchema = createInsertSchema(fcIndustryBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  calculationDate: true,
});

export type InsertFcIndustryBenchmark = z.infer<typeof insertFcIndustryBenchmarkSchema>;
export type FcIndustryBenchmark = typeof fcIndustryBenchmarks.$inferSelect;

// ============================================
// BENCHMARKING ENGINE - ASSESSMENT BENCHMARKS (Proprietary Constancia Data)
// ============================================

export const fcAssessmentBenchmarks = pgTable("fc_assessment_benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dimension: text("dimension").notNull(), // D1_STRATEGY, D2_PROCESS, etc.
  sector: text("sector"),
  sizeBand: text("size_band"),
  
  // Percentile values (scores on 1-5 scale)
  p10: real("p10"),
  p25: real("p25"),
  p50: real("p50"), // Median
  p75: real("p75"),
  p90: real("p90"),
  mean: real("mean"),
  stdDev: real("std_dev"),
  
  // Sample info
  sampleSize: integer("sample_size").notNull(),
  
  // Metadata
  notes: text("notes"),
  calculationDate: timestamp("calculation_date").defaultNow(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_assessment_benchmarks_dimension").on(table.dimension),
  index("idx_fc_assessment_benchmarks_sector").on(table.sector),
  index("idx_fc_assessment_benchmarks_size").on(table.sizeBand),
]);

export const insertFcAssessmentBenchmarkSchema = createInsertSchema(fcAssessmentBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  calculationDate: true,
});

export type InsertFcAssessmentBenchmark = z.infer<typeof insertFcAssessmentBenchmarkSchema>;
export type FcAssessmentBenchmark = typeof fcAssessmentBenchmarks.$inferSelect;

// ============================================
// BENCHMARK COMPARISON RESPONSE TYPES
// ============================================

export interface BenchmarkComparisonItem {
  metric: string;
  metricLabel: string;
  yourScore: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  industryAverage?: number;
  worldClass?: number;
  percentileRank: number; // Where you fall (0-100)
  gap: number; // Distance to p50 or worldClass
  status: "excellent" | "good" | "average" | "below_average" | "needs_attention";
  recommendation?: string;
}

export interface BenchmarkComparisonReport {
  assessmentId: string;
  companyName: string;
  sector: string;
  sizeBand: string;
  
  // Dimension comparisons (from assessment)
  dimensionComparisons: BenchmarkComparisonItem[];
  
  // Financial metric comparisons (if available)
  financialComparisons?: BenchmarkComparisonItem[];
  
  // Summary
  summary: {
    overallPercentileRank: number;
    strengthCount: number;
    improvementCount: number;
    criticalGapCount: number;
  };
  
  // Prioritized recommendations with detailed action plans
  priorities: {
    dimension: string;
    dimensionLabel?: string;
    gap: number;
    priority: number;
    workshopRecommendation?: string;
    keyActions?: string[];
    expectedOutcomes?: string[];
    timeframe?: string;
    investmentLevel?: 'Low' | 'Medium' | 'High';
    quickWins?: string[];
    riskIfIgnored?: string;
  }[];
  
  // Metadata
  benchmarkDate: string;
  sampleSizes: Record<string, number>;
}

// ============================================
// QUESTION WEIGHTINGS (Admin-defined scoring weights)
// ============================================

export const fcQuestionWeightings = pgTable("fc_question_weightings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionKey: text("question_key").notNull().unique(), // References question-bank questionId
  
  // Dimension weighting
  dimension: text("dimension"), // Which dimension this question contributes to
  dimensionWeight: real("dimension_weight").default(1.0).notNull(), // Weight within dimension (0-10 scale)
  
  // Overall score contribution
  overallWeight: real("overall_weight").default(1.0).notNull(), // Weight for overall maturity score
  
  // Scoring multipliers
  scoreMultiplier: real("score_multiplier").default(1.0).notNull(), // Multiplier applied to raw score
  maxScore: real("max_score").default(5.0).notNull(), // Maximum possible score for this question
  
  // Benchmark contribution
  benchmarkContribution: jsonb("benchmark_contribution"), // How this question affects benchmark calculations
  
  // Admin notes
  notes: text("notes"),
  
  // Audit fields
  lastModifiedBy: varchar("last_modified_by"), // Admin user who last modified
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_question_weightings_question_key").on(table.questionKey),
  index("idx_fc_question_weightings_dimension").on(table.dimension),
]);

export const insertFcQuestionWeightingSchema = createInsertSchema(fcQuestionWeightings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcQuestionWeighting = z.infer<typeof insertFcQuestionWeightingSchema>;
export type FcQuestionWeighting = typeof fcQuestionWeightings.$inferSelect;

// ============================================
// QUESTION CORRELATIONS (Relationships between questions)
// ============================================

export const fcQuestionCorrelations = pgTable("fc_question_correlations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // The two questions being correlated
  sourceQuestionKey: text("source_question_key").notNull(), // Primary question
  targetQuestionKey: text("target_question_key").notNull(), // Correlated question
  
  // Correlation configuration
  correlationType: text("correlation_type").notNull(), // "positive", "negative", "conditional"
  correlationWeight: real("correlation_weight").default(0.5).notNull(), // Strength 0-1
  
  // How source affects target scoring
  effectType: text("effect_type").notNull(), // "boost", "reduce", "adjust", "multiply"
  effectValue: real("effect_value").default(0.0).notNull(), // Value applied based on effectType
  
  // Conditional logic (optional)
  condition: jsonb("condition"), // { operator: "equals"|"greater"|"less", value: any }
  
  // Description for admins
  description: text("description"),
  
  // Audit fields
  isActive: boolean("is_active").default(true).notNull(),
  lastModifiedBy: varchar("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_question_correlations_source").on(table.sourceQuestionKey),
  index("idx_fc_question_correlations_target").on(table.targetQuestionKey),
]);

export const insertFcQuestionCorrelationSchema = createInsertSchema(fcQuestionCorrelations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcQuestionCorrelation = z.infer<typeof insertFcQuestionCorrelationSchema>;
export type FcQuestionCorrelation = typeof fcQuestionCorrelations.$inferSelect;

// ============================================
// QUESTION WEIGHTING AUDIT LOG (Track all changes)
// ============================================

export const fcQuestionWeightingAudit = pgTable("fc_question_weighting_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // What changed
  entityType: text("entity_type").notNull(), // "weighting" or "correlation"
  entityId: varchar("entity_id").notNull(),
  questionKey: text("question_key"),
  
  // Change details
  action: text("action").notNull(), // "create", "update", "delete"
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  changedFields: text("changed_fields").array(), // List of fields that changed
  
  // Who and when
  modifiedBy: varchar("modified_by"),
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
  
  // Context
  reason: text("reason"), // Optional reason for change
  importSource: text("import_source"), // "manual", "excel_import", "api"
}, (table) => [
  index("idx_fc_question_weighting_audit_entity").on(table.entityType, table.entityId),
  index("idx_fc_question_weighting_audit_question").on(table.questionKey),
  index("idx_fc_question_weighting_audit_date").on(table.modifiedAt),
]);

export const insertFcQuestionWeightingAuditSchema = createInsertSchema(fcQuestionWeightingAudit).omit({
  id: true,
  modifiedAt: true,
});

export type InsertFcQuestionWeightingAudit = z.infer<typeof insertFcQuestionWeightingAuditSchema>;
export type FcQuestionWeightingAudit = typeof fcQuestionWeightingAudit.$inferSelect;

// ============================================
// LEARNINGS CORPUS (Intelligence Engine Layer 3)
// Stores patterns from completed assessments for semantic learning
// ============================================

export const fcLearningsCorpus = pgTable("fc_learnings_corpus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Pattern identification
  patternType: text("pattern_type").notNull(), // "dimension_pattern", "outcome_pattern", "timeline_pattern", "bottleneck"
  patternKey: text("pattern_key").notNull(), // Unique identifier for deduplication
  
  // Source assessment context (anonymised)
  sector: text("sector").notNull(),
  sizeBand: text("size_band"),
  assessmentTier: text("assessment_tier").notNull(),
  
  // Dimension score ranges that define this pattern
  dimensionScoreRanges: jsonb("dimension_score_ranges").notNull(), // { dimension: { min: number, max: number } }
  
  // Pattern data
  patternDescription: text("pattern_description").notNull(),
  observedOutcome: text("observed_outcome"), // What happened after implementation
  actualTimeline: integer("actual_timeline_months"), // Actual vs planned
  plannedTimeline: integer("planned_timeline_months"),
  bottleneckEncountered: text("bottleneck_encountered"),
  successFactors: text("success_factors").array(),
  
  // Statistical confidence
  occurrenceCount: integer("occurrence_count").default(1).notNull(), // How many times this pattern observed
  confidenceLevel: real("confidence_level").default(0.5).notNull(), // 0-1 confidence
  lastOccurrence: timestamp("last_occurrence").defaultNow().notNull(),
  
  // Value realisation (anonymised ranges)
  valueRealisedRange: jsonb("value_realised_range"), // { min: number, max: number, currency: "GBP" }
  benefitCategory: text("benefit_category"), // "hard_costs", "soft_efficiency", "strategic_value"
  
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  sourceAssessmentCount: integer("source_assessment_count").default(1).notNull(), // Number of assessments contributing
}, (table) => [
  index("idx_fc_learnings_corpus_pattern").on(table.patternType, table.patternKey),
  index("idx_fc_learnings_corpus_sector").on(table.sector),
  index("idx_fc_learnings_corpus_confidence").on(table.confidenceLevel),
  uniqueIndex("idx_fc_learnings_corpus_pattern_context").on(table.patternKey, table.sector, table.assessmentTier),
]);

export const insertFcLearningsCorpusSchema = createInsertSchema(fcLearningsCorpus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcLearningsCorpus = z.infer<typeof insertFcLearningsCorpusSchema>;
export type FcLearningsCorpus = typeof fcLearningsCorpus.$inferSelect;

// ============================================
// CHATBOT - AI Assistant for FinanceCompass
// ============================================

// Chat Sessions
export const fcChatSessions = pgTable("fc_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").references(() => fcAssessments.id),
  contactId: varchar("contact_id").references(() => fcContacts.id),
  sessionToken: text("session_token").notNull(), // For anonymous users
  title: text("title"),
  status: text("status").notNull().default("active"), // active, archived, deleted
  leadScore: real("lead_score").default(0), // 0-1 lead qualification score
  leadSignals: jsonb("lead_signals"), // Detected intent signals
  messageCount: integer("message_count").default(0).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_chat_sessions_assessment").on(table.assessmentId),
  index("idx_fc_chat_sessions_contact").on(table.contactId),
  index("idx_fc_chat_sessions_token").on(table.sessionToken),
  index("idx_fc_chat_sessions_lead_score").on(table.leadScore),
]);

export const insertFcChatSessionSchema = createInsertSchema(fcChatSessions).omit({
  id: true,
  messageCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcChatSession = z.infer<typeof insertFcChatSessionSchema>;
export type FcChatSession = typeof fcChatSessions.$inferSelect;

// Chat Messages
export const fcChatMessages = pgTable("fc_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => fcChatSessions.id),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  
  // Research metadata
  researchUsed: boolean("research_used").default(false),
  researchTypes: text("research_types").array(), // MARKET_TREND, VENDOR_ANALYSIS, etc
  sourcesCited: text("sources_cited").array(),
  citations: jsonb("citations"), // { [key]: url/source }
  
  // Processing metadata
  processingTimeMs: integer("processing_time_ms"),
  processingStages: jsonb("processing_stages"), // Array of stage times
  tier: text("tier"), // local, light_research, deep_research
  
  // Tokens and cost tracking
  tokensUsed: integer("tokens_used"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_chat_messages_session").on(table.sessionId),
  index("idx_fc_chat_messages_created").on(table.createdAt),
]);

export const insertFcChatMessageSchema = createInsertSchema(fcChatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertFcChatMessage = z.infer<typeof insertFcChatMessageSchema>;
export type FcChatMessage = typeof fcChatMessages.$inferSelect;

// Research Cache - Cache Perplexity responses to reduce API costs
// Schema matches existing database structure
export const fcResearchCache = pgTable("fc_research_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryHash: varchar("query_hash").notNull().unique(), // MD5 hash of query
  query: text("query").notNull(), // Original query text
  researchTypes: text("research_types").array(), // MARKET_TREND, VENDOR_ANALYSIS, etc
  
  // Research data
  responseContent: text("response_content").notNull(), // Cached response
  sources: text("sources").array(),
  citations: jsonb("citations"),
  metadata: jsonb("metadata"), // Additional context
  
  // Cache management
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_research_cache_hash").on(table.queryHash),
  index("idx_fc_research_cache_expires").on(table.expiresAt),
]);

export const insertFcResearchCacheSchema = createInsertSchema(fcResearchCache).omit({
  id: true,
  createdAt: true,
});

export type InsertFcResearchCache = z.infer<typeof insertFcResearchCacheSchema>;
export type FcResearchCache = typeof fcResearchCache.$inferSelect;

// ============================================
// LEARNED INSIGHTS (AI Learning from Q&A patterns)
// ============================================

export const fcLearnedInsights = pgTable("fc_learned_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Topic classification
  topic: text("topic").notNull(), // e.g., "vendor_selection", "implementation", "roi"
  pattern: text("pattern").notNull(), // Question pattern/intent
  keywords: text("keywords").array(), // Extracted keywords
  
  // Learning metrics
  frequencyCount: integer("frequency_count").default(1).notNull(),
  successRate: real("success_rate").default(0), // Based on follow-up engagement
  
  // Learned content
  bestResponseSummary: text("best_response_summary"), // Distilled from successful responses
  commonFollowUps: text("common_follow_ups").array(), // Questions users often ask next
  relatedDimensions: text("related_dimensions").array(), // EPM dimensions this relates to
  
  // Context where this insight is most relevant
  relevantIndustries: text("relevant_industries").array(),
  relevantScoreRanges: jsonb("relevant_score_ranges"), // { min: 0, max: 50 } etc
  
  // Timestamps
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_learned_insights_topic").on(table.topic),
  index("idx_fc_learned_insights_frequency").on(table.frequencyCount),
]);

export const insertFcLearnedInsightSchema = createInsertSchema(fcLearnedInsights).omit({
  id: true,
  frequencyCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFcLearnedInsight = z.infer<typeof insertFcLearnedInsightSchema>;
export type FcLearnedInsight = typeof fcLearnedInsights.$inferSelect;
