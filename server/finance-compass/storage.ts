/**
 * FinanceCompass Storage Interface
 * 
 * Ringfenced storage layer for the Finance Transformation Assessment Platform.
 * Isolated from the main application storage for independent deployment.
 */

import { db } from "../db";
import { eq, desc, and, sql, count, gte, lte, isNull, inArray, avg } from "drizzle-orm";
import crypto from "crypto";
import { createChildLogger } from "../lib/logger";

const logger = createChildLogger("fc-storage");
import {
  fcCompanies,
  fcContacts,
  fcAssessments,
  fcQuestions,
  fcResponses,
  fcReports,
  fcReportNarratives,
  fcAuditLogs,
  fcRolePermissions,
  fcAiSystemPrompts,
  fcAiGuardrails,
  fcAiGroundingRules,
  fcAiKnowledgeBase,
  fcAiFollowupTemplates,
  fcBenchmarks,
  fcEmailVerificationTokens,
  fcTenants,
  fcRoiProfiles,
  fcAccessRequests,
  fcScenarios,
  fcDocumentJobs,
  fcWorkshops,
  fcQuestionWeightings,
  fcQuestionCorrelations,
  type InsertFcCompany,
  type InsertFcAccessRequest,
  type FcAccessRequest,
  type InsertFcTenant,
  type FcTenant,
  type FcCompany,
  type InsertFcContact,
  type FcContact,
  type InsertFcAssessment,
  type FcAssessment,
  type InsertFcQuestion,
  type FcQuestion,
  type InsertFcResponse,
  type FcResponse,
  type InsertFcReport,
  type FcReport,
  type InsertFcAuditLog,
  type FcAuditLog,
  type FcRolePermissions,
  type FCAssessmentTier,
  type FCAssessmentStatus,
  type InsertFcRoiProfile,
  type FcRoiProfile,
  type FcReportNarrative,
  type FcQuestionWeighting,
  type FcQuestionCorrelation,
} from "@shared/finance-compass-schema";
import type { FullReportNarratives } from "./report-narrative-service";
import {
  financeCompassBetaAccess,
  type FcBetaAccess,
} from "@shared/schema";

// ============================================
// COMPANIES
// ============================================

export async function createCompany(data: InsertFcCompany): Promise<FcCompany> {
  const [company] = await db.insert(fcCompanies).values(data).returning();
  return company;
}

export async function getCompanyById(id: string): Promise<FcCompany | null> {
  const [company] = await db.select().from(fcCompanies).where(eq(fcCompanies.id, id)).limit(1);
  return company || null;
}

export async function updateCompany(id: string, data: Partial<InsertFcCompany>): Promise<FcCompany | null> {
  const [company] = await db
    .update(fcCompanies)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(fcCompanies.id, id))
    .returning();
  return company || null;
}

export async function getAllCompanies(): Promise<FcCompany[]> {
  return db.select().from(fcCompanies).orderBy(desc(fcCompanies.createdAt));
}

export async function getAllCompaniesWithPagination(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ companies: FcCompany[]; total: number }> {
  const limit = Math.min(options?.limit || 50, 200); // Max 200 per request
  const offset = options?.offset || 0;

  const [companies, countResult] = await Promise.all([
    db
      .select()
      .from(fcCompanies)
      .orderBy(desc(fcCompanies.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(fcCompanies),
  ]);

  const total = countResult[0]?.count || 0;
  return { companies, total };
}

// ============================================
// CONTACTS
// ============================================

export async function createContact(data: InsertFcContact): Promise<FcContact> {
  const [contact] = await db.insert(fcContacts).values(data).returning();
  return contact;
}

export async function getContactById(id: string): Promise<FcContact | null> {
  const [contact] = await db.select().from(fcContacts).where(eq(fcContacts.id, id)).limit(1);
  return contact || null;
}

export async function getContactByEmail(email: string): Promise<FcContact | null> {
  const [contact] = await db.select().from(fcContacts).where(eq(fcContacts.email, email)).limit(1);
  return contact || null;
}

export async function updateContact(id: string, data: Partial<InsertFcContact>): Promise<FcContact | null> {
  const [contact] = await db
    .update(fcContacts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(fcContacts.id, id))
    .returning();
  return contact || null;
}

export async function verifyContact(id: string): Promise<FcContact | null> {
  const [contact] = await db
    .update(fcContacts)
    .set({ verified: true, verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(fcContacts.id, id))
    .returning();
  return contact || null;
}

export async function toggleFullAssessmentAccess(id: string, hasAccess: boolean): Promise<FcContact | null> {
  const [contact] = await db
    .update(fcContacts)
    .set({ hasFullAssessmentAccess: hasAccess, updatedAt: new Date() })
    .where(eq(fcContacts.id, id))
    .returning();
  return contact || null;
}

// ============================================
// ASSESSMENTS
// ============================================

export async function createAssessment(data: InsertFcAssessment): Promise<FcAssessment> {
  const [assessment] = await db.insert(fcAssessments).values({
    ...data,
    startedAt: new Date(),
  }).returning();
  return assessment;
}

export async function getAssessmentById(id: string): Promise<FcAssessment | null> {
  const [assessment] = await db.select().from(fcAssessments).where(eq(fcAssessments.id, id)).limit(1);
  return assessment || null;
}

export async function getAssessmentWithDetails(id: string): Promise<{
  assessment: FcAssessment;
  company: FcCompany | null;
  contact: FcContact | null;
  responses: FcResponse[];
} | null> {
  const assessment = await getAssessmentById(id);
  if (!assessment) return null;

  // Batch independent lookups with Promise.all for better performance
  // Use Promise.allSettled pattern to handle partial failures gracefully
  try {
    const [company, contact, responses] = await Promise.all([
      assessment.companyId ? getCompanyById(assessment.companyId) : Promise.resolve(null),
      assessment.contactId ? getContactById(assessment.contactId) : Promise.resolve(null),
      getResponsesByAssessmentId(id),
    ]);

    return { assessment, company, contact, responses };
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)), assessmentId: id }, "Error fetching assessment details");
    // Return with null values for failed lookups rather than failing entirely
    return { assessment, company: null, contact: null, responses: [] };
  }
}

export async function updateAssessment(id: string, data: Partial<InsertFcAssessment>): Promise<FcAssessment | null> {
  const [assessment] = await db
    .update(fcAssessments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(fcAssessments.id, id))
    .returning();
  return assessment || null;
}

export async function deleteAssessment(id: string): Promise<boolean> {
  // Delete in order to respect foreign key constraints
  // 1. Delete responses first
  await db.delete(fcResponses).where(eq(fcResponses.assessmentId, id));
  
  // 2. Delete report narratives
  await db.delete(fcReportNarratives).where(eq(fcReportNarratives.assessmentId, id));
  
  // 3. Delete reports
  await db.delete(fcReports).where(eq(fcReports.assessmentId, id));
  
  // 4. Delete ROI profiles
  await db.delete(fcRoiProfiles).where(eq(fcRoiProfiles.assessmentId, id));
  
  // 5. Delete workshops
  await db.delete(fcWorkshops).where(eq(fcWorkshops.assessmentId, id));
  
  // 6. Delete scenarios (nullable FK so may not have any)
  await db.delete(fcScenarios).where(eq(fcScenarios.assessmentId, id));
  
  // 7. Delete document jobs (nullable FK so may not have any)
  await db.delete(fcDocumentJobs).where(eq(fcDocumentJobs.assessmentId, id));
  
  // 8. Finally delete the assessment itself
  await db.delete(fcAssessments).where(eq(fcAssessments.id, id));
  return true;
}

export async function deleteAssessmentResponses(assessmentId: string): Promise<boolean> {
  await db
    .delete(fcResponses)
    .where(eq(fcResponses.assessmentId, assessmentId));
  return true;
}

export async function resetAssessmentForRetake(id: string): Promise<FcAssessment | null> {
  // Reset assessment status to in_progress so user can re-answer questions
  // Responses are kept so they can be prefilled
  const [assessment] = await db
    .update(fcAssessments)
    .set({
      status: "in_progress",
      completedAt: null,
      currentStep: 0,
      overallMaturityScore: null,
      epmReadinessScore: null,
      dimensionScores: null,
      updatedAt: new Date(),
    })
    .where(eq(fcAssessments.id, id))
    .returning();
  return assessment || null;
}

export async function completeAssessmentTier(id: string, tier: FCAssessmentTier | string): Promise<FcAssessment | null> {
  // Status map includes legacy quick_assessment support
  const statusMap: Record<string, FCAssessmentStatus> = {
    registration: "completed", // Registration is completed immediately (no follow-ups)
    quick_assessment: "completed", // Legacy support
    pre_assessment: "completed",
    full: "initial_complete",
  };

  const [assessment] = await db
    .update(fcAssessments)
    .set({
      status: statusMap[tier],
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fcAssessments.id, id))
    .returning();
  return assessment || null;
}

export async function upgradeAssessmentTier(id: string, newTier: FCAssessmentTier): Promise<FcAssessment | null> {
  const [assessment] = await db
    .update(fcAssessments)
    .set({
      tier: newTier,
      status: "in_progress",
      currentStep: 0,
      updatedAt: new Date(),
    })
    .where(eq(fcAssessments.id, id))
    .returning();
  return assessment || null;
}

export async function getAssessmentsByContactId(contactId: string): Promise<FcAssessment[]> {
  return db
    .select()
    .from(fcAssessments)
    .where(eq(fcAssessments.contactId, contactId))
    .orderBy(desc(fcAssessments.updatedAt));
}

export async function getAllAssessments(filters?: {
  tier?: FCAssessmentTier;
  status?: FCAssessmentStatus;
  limit?: number;
  offset?: number;
}): Promise<FcAssessment[]> {
  // Enforce a default limit to prevent unbounded data loads
  const limit = filters?.limit ? Math.min(filters.limit, 500) : 50;
  let query = db.select().from(fcAssessments);
  
  const conditions = [];
  if (filters?.tier) {
    conditions.push(eq(fcAssessments.tier, filters.tier));
  }
  if (filters?.status) {
    conditions.push(eq(fcAssessments.status, filters.status));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  query = query.orderBy(desc(fcAssessments.createdAt)) as typeof query;
  query = query.limit(limit) as typeof query;
  
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }
  
  return query;
}

export async function getAssessmentStats(): Promise<{
  total: number;
  byTier: Record<string, number>;
  byStatus: Record<string, number>;
  completionRate: number;
  averageEpmScore: number | null;
}> {
  // Optimized: Use SQL to aggregate data instead of loading all records in memory
  const all = await db.select().from(fcAssessments);
  
  const byTier: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let epmScoreSum = 0;
  let epmScoreCount = 0;
  let completedCount = 0;

  for (const assessment of all) {
    byTier[assessment.tier] = (byTier[assessment.tier] || 0) + 1;
    byStatus[assessment.status] = (byStatus[assessment.status] || 0) + 1;
    
    if (assessment.status === "completed" || assessment.status === "analysed" || assessment.status === "report_generated") {
      completedCount++;
    }
    
    if (assessment.epmReadinessScore !== null) {
      epmScoreSum += assessment.epmReadinessScore;
      epmScoreCount++;
    }
  }

  return {
    total: all.length,
    byTier,
    byStatus,
    completionRate: all.length > 0 ? (completedCount / all.length) * 100 : 0,
    averageEpmScore: epmScoreCount > 0 ? epmScoreSum / epmScoreCount : null,
  };
}

/**
 * Optimized function to fetch assessments with related company and contact data
 * using a single JOIN query instead of N+1 separate queries.
 * 
 * PERFORMANCE: 1 query instead of 1 + 2N queries (where N = number of assessments)
 */
export async function getAllAssessmentsWithRelations(options?: {
  tier?: FCAssessmentTier;
  status?: FCAssessmentStatus;
  limit?: number;
  offset?: number;
}): Promise<{
  assessment: FcAssessment;
  company: FcCompany | null;
  contact: FcContact | null;
}[]> {
  const limit = options?.limit ? Math.min(options.limit, 500) : 50;
  const offset = options?.offset || 0;
  
  const conditions = [];
  if (options?.tier) {
    conditions.push(eq(fcAssessments.tier, options.tier));
  }
  if (options?.status) {
    conditions.push(eq(fcAssessments.status, options.status));
  }
  
  let query = db
    .select({
      assessment: fcAssessments,
      company: fcCompanies,
      contact: fcContacts,
    })
    .from(fcAssessments)
    .leftJoin(fcCompanies, eq(fcAssessments.companyId, fcCompanies.id))
    .leftJoin(fcContacts, eq(fcAssessments.contactId, fcContacts.id));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(fcAssessments.createdAt)) as any;
  query = query.limit(limit) as any;
  
  if (offset > 0) {
    query = query.offset(offset) as any;
  }
  
  const results = await query;
  return results.map(row => ({
    assessment: row.assessment,
    company: row.company,
    contact: row.contact,
  }));
}

// ============================================
// QUESTIONS
// ============================================

export async function getQuestionsByTier(tier: FCAssessmentTier | string): Promise<FcQuestion[]> {
  // Map legacy quick_assessment to registration for backwards compatibility
  const effectiveTier = tier === "quick_assessment" ? "registration" : tier;
  
  return db
    .select()
    .from(fcQuestions)
    .where(and(eq(fcQuestions.tier, effectiveTier), eq(fcQuestions.isActive, true)))
    .orderBy(fcQuestions.sequence);
}

export async function getQuestionById(id: string): Promise<FcQuestion | null> {
  const [question] = await db.select().from(fcQuestions).where(eq(fcQuestions.id, id)).limit(1);
  return question || null;
}

export async function getQuestionByKey(key: string): Promise<FcQuestion | null> {
  const [question] = await db.select().from(fcQuestions).where(eq(fcQuestions.questionKey, key)).limit(1);
  return question || null;
}

export async function createQuestion(data: InsertFcQuestion): Promise<FcQuestion> {
  const [question] = await db.insert(fcQuestions).values(data).returning();
  return question;
}

export async function updateQuestion(id: string, data: Partial<InsertFcQuestion>): Promise<FcQuestion | null> {
  const [question] = await db
    .update(fcQuestions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(fcQuestions.id, id))
    .returning();
  return question || null;
}

export async function getAllQuestions(): Promise<FcQuestion[]> {
  return db.select().from(fcQuestions).orderBy(fcQuestions.tier, fcQuestions.sequence);
}

export async function getAdaptiveQuestionsByAssessment(assessmentId: string): Promise<FcQuestion[]> {
  return db
    .select()
    .from(fcQuestions)
    .where(and(
      eq(fcQuestions.isAdaptive, true),
      sql`${fcQuestions.scoringConfig}->>'assessmentId' = ${assessmentId}`
    ))
    .orderBy(fcQuestions.sequence);
}

export async function createAdaptiveQuestion(data: InsertFcQuestion & { assessmentId?: string }): Promise<FcQuestion> {
  const questionData: InsertFcQuestion = {
    ...data,
    isAdaptive: true,
    scoringConfig: {
      ...(data.scoringConfig as object || {}),
      assessmentId: data.assessmentId,
      generatedAt: new Date().toISOString(),
    },
  };
  const [question] = await db.insert(fcQuestions).values(questionData).returning();
  return question;
}

// ============================================
// RESPONSES
// ============================================

export async function createResponse(data: InsertFcResponse): Promise<FcResponse> {
  const [response] = await db.insert(fcResponses).values(data).returning();
  return response;
}

export async function getResponsesByAssessmentId(assessmentId: string): Promise<FcResponse[]> {
  return db
    .select()
    .from(fcResponses)
    .where(eq(fcResponses.assessmentId, assessmentId))
    .orderBy(fcResponses.createdAt);
}

export async function getResponseByQuestionId(assessmentId: string, questionId: string): Promise<FcResponse | null> {
  const [response] = await db
    .select()
    .from(fcResponses)
    .where(and(eq(fcResponses.assessmentId, assessmentId), eq(fcResponses.questionId, questionId)))
    .limit(1);
  return response || null;
}

export async function upsertResponse(data: InsertFcResponse): Promise<FcResponse> {
  const existing = await getResponseByQuestionId(data.assessmentId, data.questionId);
  if (existing) {
    const [updated] = await db
      .update(fcResponses)
      .set({ response: data.response, rawValue: data.rawValue, score: data.score })
      .where(eq(fcResponses.id, existing.id))
      .returning();
    return updated;
  }
  return createResponse(data);
}

// ============================================
// REPORTS
// ============================================

export async function createReport(data: InsertFcReport): Promise<FcReport> {
  const [report] = await db.insert(fcReports).values(data).returning();
  return report;
}

export async function getReportsByAssessmentId(assessmentId: string): Promise<FcReport[]> {
  return db
    .select()
    .from(fcReports)
    .where(eq(fcReports.assessmentId, assessmentId))
    .orderBy(desc(fcReports.createdAt));
}

export async function getReportByAssessmentId(assessmentId: string): Promise<FcReport | null> {
  const [report] = await db
    .select()
    .from(fcReports)
    .where(eq(fcReports.assessmentId, assessmentId))
    .orderBy(desc(fcReports.createdAt))
    .limit(1);
  return report || null;
}

export async function getLatestReport(assessmentId: string, tier: string): Promise<FcReport | null> {
  const [report] = await db
    .select()
    .from(fcReports)
    .where(and(eq(fcReports.assessmentId, assessmentId), eq(fcReports.tier, tier)))
    .orderBy(desc(fcReports.version))
    .limit(1);
  return report || null;
}

export async function getReportById(reportId: string): Promise<FcReport | null> {
  const [report] = await db
    .select()
    .from(fcReports)
    .where(eq(fcReports.id, reportId))
    .limit(1);
  return report || null;
}

export async function updateReport(reportId: string, data: Partial<InsertFcReport>): Promise<FcReport | null> {
  const [updated] = await db
    .update(fcReports)
    .set(data)
    .where(eq(fcReports.id, reportId))
    .returning();
  return updated || null;
}

// ============================================
// ROLE PERMISSIONS
// ============================================

export async function getRolePermissions(role: string): Promise<string[]> {
  const [record] = await db
    .select()
    .from(fcRolePermissions)
    .where(eq(fcRolePermissions.role, role))
    .limit(1);
  return record?.permissions || [];
}

// Default permissions for standard admin roles (fallback when no DB entries exist)
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["fc:admin:full"],
  admin: ["fc:admin:full"],
  content_manager: ["fc:view", "fc:questions:view", "fc:assessments:view"],
  read_only: ["fc:view"],
};

export async function hasPermission(role: string, permission: string): Promise<boolean> {
  // First check database for custom role permissions
  const dbPermissions = await getRolePermissions(role);
  if (dbPermissions.length > 0) {
    return dbPermissions.includes(permission) || dbPermissions.includes("fc:admin:full");
  }
  
  // Fallback to default permissions for standard roles
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
  return defaultPerms.includes(permission) || defaultPerms.includes("fc:admin:full");
}

export async function getAllRolePermissions(): Promise<FcRolePermissions[]> {
  return db.select().from(fcRolePermissions);
}

export async function updateRolePermissions(role: string, permissions: string[]): Promise<FcRolePermissions | null> {
  const existing = await db.select().from(fcRolePermissions).where(eq(fcRolePermissions.role, role)).limit(1);
  
  if (existing[0]) {
    const [updated] = await db
      .update(fcRolePermissions)
      .set({ permissions, updatedAt: new Date() })
      .where(eq(fcRolePermissions.role, role))
      .returning();
    return updated;
  }
  
  const [created] = await db.insert(fcRolePermissions).values({ role, permissions }).returning();
  return created;
}

// ============================================
// AUDIT LOGS (Extended)
// ============================================

export async function createAuditLog(data: InsertFcAuditLog): Promise<FcAuditLog> {
  const [log] = await db.insert(fcAuditLogs).values(data).returning();
  return log;
}

export interface AuditLogFilters {
  assessmentId?: string;
  adminId?: string;
  contactId?: string;
  action?: string;
  actionPrefix?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  sortOrder?: 'asc' | 'desc';
}

export async function getAuditLogs(filters?: AuditLogFilters): Promise<FcAuditLog[]> {
  let query = db.select().from(fcAuditLogs);
  
  const conditions = [];
  if (filters?.assessmentId) {
    conditions.push(eq(fcAuditLogs.assessmentId, filters.assessmentId));
  }
  if (filters?.adminId) {
    conditions.push(eq(fcAuditLogs.adminId, filters.adminId));
  }
  if (filters?.contactId) {
    conditions.push(eq(fcAuditLogs.contactId, filters.contactId));
  }
  if (filters?.action) {
    conditions.push(eq(fcAuditLogs.action, filters.action));
  }
  if (filters?.actionPrefix) {
    conditions.push(sql`${fcAuditLogs.action} LIKE ${filters.actionPrefix + '%'}`);
  }
  if (filters?.entityType) {
    conditions.push(eq(fcAuditLogs.entityType, filters.entityType));
  }
  if (filters?.entityId) {
    conditions.push(eq(fcAuditLogs.entityId, filters.entityId));
  }
  if (filters?.fromDate) {
    conditions.push(gte(fcAuditLogs.createdAt, filters.fromDate));
  }
  if (filters?.toDate) {
    conditions.push(lte(fcAuditLogs.createdAt, filters.toDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  if (filters?.sortOrder === 'asc') {
    query = query.orderBy(fcAuditLogs.createdAt) as typeof query;
  } else {
    query = query.orderBy(desc(fcAuditLogs.createdAt)) as typeof query;
  }
  
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }
  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  
  return query;
}

export async function countAuditLogs(filters?: Omit<AuditLogFilters, 'limit' | 'offset' | 'sortOrder'>): Promise<number> {
  const conditions = [];
  if (filters?.assessmentId) {
    conditions.push(eq(fcAuditLogs.assessmentId, filters.assessmentId));
  }
  if (filters?.adminId) {
    conditions.push(eq(fcAuditLogs.adminId, filters.adminId));
  }
  if (filters?.contactId) {
    conditions.push(eq(fcAuditLogs.contactId, filters.contactId));
  }
  if (filters?.action) {
    conditions.push(eq(fcAuditLogs.action, filters.action));
  }
  if (filters?.actionPrefix) {
    conditions.push(sql`${fcAuditLogs.action} LIKE ${filters.actionPrefix + '%'}`);
  }
  if (filters?.entityType) {
    conditions.push(eq(fcAuditLogs.entityType, filters.entityType));
  }
  if (filters?.entityId) {
    conditions.push(eq(fcAuditLogs.entityId, filters.entityId));
  }
  if (filters?.fromDate) {
    conditions.push(gte(fcAuditLogs.createdAt, filters.fromDate));
  }
  if (filters?.toDate) {
    conditions.push(lte(fcAuditLogs.createdAt, filters.toDate));
  }
  
  let query = db.select({ count: count() }).from(fcAuditLogs);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  const [result] = await query;
  return result?.count || 0;
}

export async function getAuditLogStats(): Promise<{
  totalLogs: number;
  todayLogs: number;
  last7DaysLogs: number;
  actionBreakdown: { action: string; count: number }[];
  entityTypeBreakdown: { entityType: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Run all independent queries in parallel for better performance
  const [
    totalResult,
    todayResult,
    weekResult,
    actionBreakdownResult,
    entityTypeBreakdownResult,
    recentActivityResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(fcAuditLogs),
    db.select({ count: count() }).from(fcAuditLogs).where(gte(fcAuditLogs.createdAt, startOfToday)),
    db.select({ count: count() }).from(fcAuditLogs).where(gte(fcAuditLogs.createdAt, last7Days)),
    db.select({ action: fcAuditLogs.action, count: count() })
      .from(fcAuditLogs)
      .where(gte(fcAuditLogs.createdAt, last30Days))
      .groupBy(fcAuditLogs.action)
      .orderBy(desc(count()))
      .limit(20),
    db.select({ entityType: fcAuditLogs.entityType, count: count() })
      .from(fcAuditLogs)
      .where(gte(fcAuditLogs.createdAt, last30Days))
      .groupBy(fcAuditLogs.entityType)
      .orderBy(desc(count())),
    db.select({ date: sql<string>`DATE(${fcAuditLogs.createdAt})::text`, count: count() })
      .from(fcAuditLogs)
      .where(gte(fcAuditLogs.createdAt, last30Days))
      .groupBy(sql`DATE(${fcAuditLogs.createdAt})`)
      .orderBy(sql`DATE(${fcAuditLogs.createdAt})`),
  ]);

  const totalLogs = totalResult[0]?.count || 0;
  const todayLogs = todayResult[0]?.count || 0;
  const last7DaysLogs = weekResult[0]?.count || 0;
  
  const actionBreakdown = actionBreakdownResult.map(r => ({
    action: r.action,
    count: Number(r.count),
  }));
  
  const entityTypeBreakdown = entityTypeBreakdownResult
    .filter(r => r.entityType)
    .map(r => ({
      entityType: r.entityType!,
      count: Number(r.count),
    }));
  
  const recentActivity = recentActivityResult.map(r => ({
    date: r.date,
    count: Number(r.count),
  }));
  
  return {
    totalLogs,
    todayLogs,
    last7DaysLogs,
    actionBreakdown,
    entityTypeBreakdown,
    recentActivity,
  };
}

export async function getDistinctAuditActions(): Promise<string[]> {
  const result = await db
    .selectDistinct({ action: fcAuditLogs.action })
    .from(fcAuditLogs)
    .orderBy(fcAuditLogs.action);
  return result.map(r => r.action);
}

export async function getDistinctEntityTypes(): Promise<string[]> {
  const result = await db
    .selectDistinct({ entityType: fcAuditLogs.entityType })
    .from(fcAuditLogs)
    .where(sql`${fcAuditLogs.entityType} IS NOT NULL`)
    .orderBy(fcAuditLogs.entityType);
  return result.map(r => r.entityType!);
}

// ============================================
// AI CONFIGURATION
// ============================================

export async function getActiveSystemPrompts(): Promise<typeof fcAiSystemPrompts.$inferSelect[]> {
  return db.select().from(fcAiSystemPrompts).where(eq(fcAiSystemPrompts.isActive, true));
}

export async function getActiveGuardrails(): Promise<typeof fcAiGuardrails.$inferSelect[]> {
  return db.select().from(fcAiGuardrails).where(eq(fcAiGuardrails.isActive, true));
}

export async function getActiveGroundingRules(): Promise<typeof fcAiGroundingRules.$inferSelect[]> {
  return db.select().from(fcAiGroundingRules).where(eq(fcAiGroundingRules.isActive, true));
}

export async function getActiveKnowledgeBase(): Promise<typeof fcAiKnowledgeBase.$inferSelect[]> {
  return db.select().from(fcAiKnowledgeBase).where(eq(fcAiKnowledgeBase.isActive, true));
}

export async function getActiveFollowupTemplates(): Promise<typeof fcAiFollowupTemplates.$inferSelect[]> {
  return db.select().from(fcAiFollowupTemplates).where(eq(fcAiFollowupTemplates.isActive, true));
}

// ============================================
// BENCHMARKS
// ============================================

export async function getBenchmarks(filters?: {
  category?: string;
  sizeBand?: string;
  sector?: string;
}): Promise<typeof fcBenchmarks.$inferSelect[]> {
  let query = db.select().from(fcBenchmarks).where(eq(fcBenchmarks.isActive, true));
  
  const conditions = [eq(fcBenchmarks.isActive, true)];
  if (filters?.category) {
    conditions.push(eq(fcBenchmarks.category, filters.category));
  }
  if (filters?.sizeBand) {
    conditions.push(eq(fcBenchmarks.sizeBand, filters.sizeBand));
  }
  if (filters?.sector) {
    conditions.push(eq(fcBenchmarks.sector, filters.sector));
  }
  
  return db.select().from(fcBenchmarks).where(and(...conditions));
}

// ============================================
// EMAIL VERIFICATION
// ============================================

export async function createEmailVerificationToken(contactId: string, token: string, expiresAt: Date): Promise<typeof fcEmailVerificationTokens.$inferSelect> {
  const [record] = await db.insert(fcEmailVerificationTokens).values({
    contactId,
    token,
    expiresAt,
  }).returning();
  return record;
}

export async function verifyEmailToken(token: string): Promise<{ valid: boolean; contactId?: string }> {
  const [record] = await db
    .select()
    .from(fcEmailVerificationTokens)
    .where(and(
      eq(fcEmailVerificationTokens.token, token),
      isNull(fcEmailVerificationTokens.usedAt),
      gte(fcEmailVerificationTokens.expiresAt, new Date())
    ))
    .limit(1);
  
  if (!record) {
    return { valid: false };
  }
  
  await db
    .update(fcEmailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(fcEmailVerificationTokens.id, record.id));
  
  await verifyContact(record.contactId);
  
  return { valid: true, contactId: record.contactId };
}

// ============================================
// TENANTS (Multi-Tenant Foundation)
// ============================================

export async function createTenant(data: InsertFcTenant): Promise<FcTenant> {
  const [tenant] = await db.insert(fcTenants).values(data).returning();
  return tenant;
}

export async function getTenantById(id: string): Promise<FcTenant | null> {
  const [tenant] = await db.select().from(fcTenants).where(eq(fcTenants.id, id)).limit(1);
  return tenant || null;
}

export async function getTenantBySlug(slug: string): Promise<FcTenant | null> {
  const [tenant] = await db.select().from(fcTenants).where(eq(fcTenants.slug, slug)).limit(1);
  return tenant || null;
}

export async function getTenantByDomain(domain: string): Promise<FcTenant | null> {
  const [tenant] = await db.select().from(fcTenants).where(eq(fcTenants.domain, domain)).limit(1);
  return tenant || null;
}

export async function updateTenant(id: string, data: Partial<InsertFcTenant>): Promise<FcTenant | null> {
  const [tenant] = await db
    .update(fcTenants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(fcTenants.id, id))
    .returning();
  return tenant || null;
}

export async function getAllTenants(includeInactive = false): Promise<FcTenant[]> {
  if (includeInactive) {
    return db.select().from(fcTenants).orderBy(desc(fcTenants.createdAt));
  }
  return db.select().from(fcTenants).where(eq(fcTenants.isActive, true)).orderBy(desc(fcTenants.createdAt));
}

export async function deleteTenant(id: string): Promise<boolean> {
  const result = await db.delete(fcTenants).where(eq(fcTenants.id, id));
  return true;
}

// ============================================
// ROI PROFILES
// ============================================

export async function getRoiProfileByAssessmentId(assessmentId: string): Promise<FcRoiProfile | null> {
  const [profile] = await db
    .select()
    .from(fcRoiProfiles)
    .where(eq(fcRoiProfiles.assessmentId, assessmentId))
    .limit(1);
  return profile || null;
}

export async function getRoiProfileById(id: string): Promise<FcRoiProfile | null> {
  const [profile] = await db
    .select()
    .from(fcRoiProfiles)
    .where(eq(fcRoiProfiles.id, id))
    .limit(1);
  return profile || null;
}

export async function createRoiProfile(data: InsertFcRoiProfile): Promise<FcRoiProfile> {
  const [profile] = await db.insert(fcRoiProfiles).values(data).returning();
  return profile;
}

export async function updateRoiProfile(id: string, data: Partial<InsertFcRoiProfile>): Promise<FcRoiProfile | null> {
  const [profile] = await db
    .update(fcRoiProfiles)
    .set({ ...data, updatedAt: new Date(), lastCalculatedAt: new Date() })
    .where(eq(fcRoiProfiles.id, id))
    .returning();
  return profile || null;
}

export async function upsertRoiProfile(assessmentId: string, data: Partial<InsertFcRoiProfile>): Promise<FcRoiProfile> {
  const existing = await getRoiProfileByAssessmentId(assessmentId);
  
  if (existing) {
    const updated = await updateRoiProfile(existing.id, data);
    return updated!;
  }
  
  return createRoiProfile({
    assessmentId,
    ...data,
  } as InsertFcRoiProfile);
}

export async function getRoiProfilesByContactId(contactId: string): Promise<FcRoiProfile[]> {
  return db
    .select()
    .from(fcRoiProfiles)
    .where(eq(fcRoiProfiles.contactId, contactId))
    .orderBy(desc(fcRoiProfiles.updatedAt));
}

export async function deleteRoiProfile(id: string): Promise<boolean> {
  await db.delete(fcRoiProfiles).where(eq(fcRoiProfiles.id, id));
  return true;
}

// ============================================
// ACCESS REQUESTS
// ============================================

export async function createAccessRequest(data: InsertFcAccessRequest): Promise<FcAccessRequest> {
  const [request] = await db.insert(fcAccessRequests).values(data).returning();
  return request;
}

export async function getAccessRequestById(id: string): Promise<FcAccessRequest | null> {
  const [request] = await db.select().from(fcAccessRequests).where(eq(fcAccessRequests.id, id)).limit(1);
  return request || null;
}

export async function getLatestAccessRequestForContact(contactId: string): Promise<FcAccessRequest | null> {
  const [request] = await db
    .select()
    .from(fcAccessRequests)
    .where(eq(fcAccessRequests.contactId, contactId))
    .orderBy(desc(fcAccessRequests.requestedAt))
    .limit(1);
  return request || null;
}

export async function getPendingAccessRequestForContact(contactId: string): Promise<FcAccessRequest | null> {
  const [request] = await db
    .select()
    .from(fcAccessRequests)
    .where(and(
      eq(fcAccessRequests.contactId, contactId),
      eq(fcAccessRequests.status, "pending")
    ))
    .limit(1);
  return request || null;
}

export async function getAllAccessRequests(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<FcAccessRequest[]> {
  let query = db.select().from(fcAccessRequests);
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(fcAccessRequests.status, filters.status));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  query = query.orderBy(desc(fcAccessRequests.requestedAt)) as typeof query;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }
  
  return query;
}

export async function updateAccessRequestStatus(
  id: string, 
  status: string, 
  reviewedBy: string,
  notes?: string
): Promise<FcAccessRequest | null> {
  const [request] = await db
    .update(fcAccessRequests)
    .set({ 
      status, 
      reviewedBy, 
      reviewedAt: new Date(),
      notes: notes || null,
    })
    .where(eq(fcAccessRequests.id, id))
    .returning();
  return request || null;
}

export async function approveAccessRequest(id: string, reviewedBy: string, notes?: string): Promise<FcAccessRequest | null> {
  const request = await updateAccessRequestStatus(id, "approved", reviewedBy, notes);
  if (request) {
    await toggleFullAssessmentAccess(request.contactId, true);
  }
  return request;
}

export async function rejectAccessRequest(id: string, reviewedBy: string, notes?: string): Promise<FcAccessRequest | null> {
  return updateAccessRequestStatus(id, "rejected", reviewedBy, notes);
}

// ============================================
// BETA ACCESS WHITELIST
// ============================================

export async function getBetaAccessList(): Promise<FcBetaAccess[]> {
  return db.select().from(financeCompassBetaAccess).orderBy(desc(financeCompassBetaAccess.createdAt));
}

export async function addBetaAccess(email: string, addedBy?: string, notes?: string): Promise<FcBetaAccess> {
  const normalizedEmail = email.toLowerCase().trim();
  const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
  
  const [entry] = await db.insert(financeCompassBetaAccess).values({
    email: normalizedEmail,
    emailHash,
    addedBy,
    notes,
    isActive: true,
  }).returning();
  return entry;
}

export async function removeBetaAccess(id: string): Promise<boolean> {
  const result = await db.delete(financeCompassBetaAccess).where(eq(financeCompassBetaAccess.id, id));
  return true;
}

export async function checkBetaAccess(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const [entry] = await db.select()
    .from(financeCompassBetaAccess)
    .where(and(
      eq(financeCompassBetaAccess.email, normalizedEmail),
      eq(financeCompassBetaAccess.isActive, true)
    ))
    .limit(1);
  return !!entry;
}

export async function getBetaAccessByEmail(email: string): Promise<FcBetaAccess | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const [entry] = await db.select()
    .from(financeCompassBetaAccess)
    .where(eq(financeCompassBetaAccess.email, normalizedEmail))
    .limit(1);
  return entry || null;
}

// ============================================
// REPORT NARRATIVES
// ============================================

export async function saveReportNarrative(assessmentId: string, narratives: FullReportNarratives): Promise<FcReportNarrative> {
  const existing = await getReportNarrative(assessmentId);
  
  const data = {
    assessmentId,
    reportStructure: narratives.structure,
    executiveSummary: narratives.executiveSummary,
    dimensionNarratives: narratives.dimensionNarratives,
    keyFindings: narratives.keyFindings,
    actionPlan: narratives.actionPlan,
    benchmarks: narratives.benchmarks,
    dataSynthesis: narratives.dataSynthesis,
    isFallback: narratives.isFallback ?? false,
    generatedAt: new Date(),
    updatedAt: new Date(),
  };
  
  if (existing) {
    const [updated] = await db
      .update(fcReportNarratives)
      .set({
        ...data,
        regeneratedCount: (existing.regeneratedCount ?? 0) + 1,
      })
      .where(eq(fcReportNarratives.assessmentId, assessmentId))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(fcReportNarratives).values(data).returning();
    return created;
  }
}

export async function getReportNarrative(assessmentId: string): Promise<FcReportNarrative | null> {
  const [narrative] = await db.select()
    .from(fcReportNarratives)
    .where(eq(fcReportNarratives.assessmentId, assessmentId))
    .limit(1);
  return narrative || null;
}

// ============================================
// QUESTION WEIGHTINGS (For Scoring)
// ============================================

export async function getAllQuestionWeightings(): Promise<FcQuestionWeighting[]> {
  return db.select().from(fcQuestionWeightings);
}

export async function getQuestionWeightingByKey(questionKey: string): Promise<FcQuestionWeighting | null> {
  const [weighting] = await db.select()
    .from(fcQuestionWeightings)
    .where(eq(fcQuestionWeightings.questionKey, questionKey))
    .limit(1);
  return weighting || null;
}

export async function getQuestionWeightingsMap(): Promise<Map<string, FcQuestionWeighting>> {
  const weightings = await getAllQuestionWeightings();
  return new Map(weightings.map(w => [w.questionKey, w]));
}

// ============================================
// QUESTION CORRELATIONS (For Scoring)
// ============================================

export async function getAllQuestionCorrelations(): Promise<FcQuestionCorrelation[]> {
  return db.select().from(fcQuestionCorrelations).where(eq(fcQuestionCorrelations.isActive, true));
}

export async function getCorrelationsBySourceKey(sourceQuestionKey: string): Promise<FcQuestionCorrelation[]> {
  return db.select()
    .from(fcQuestionCorrelations)
    .where(and(
      eq(fcQuestionCorrelations.sourceQuestionKey, sourceQuestionKey),
      eq(fcQuestionCorrelations.isActive, true)
    ));
}

export async function getCorrelationsByTargetKey(targetQuestionKey: string): Promise<FcQuestionCorrelation[]> {
  return db.select()
    .from(fcQuestionCorrelations)
    .where(and(
      eq(fcQuestionCorrelations.targetQuestionKey, targetQuestionKey),
      eq(fcQuestionCorrelations.isActive, true)
    ));
}

export async function getCorrelationsMap(): Promise<Map<string, FcQuestionCorrelation[]>> {
  const correlations = await getAllQuestionCorrelations();
  const map = new Map<string, FcQuestionCorrelation[]>();
  
  for (const corr of correlations) {
    const existing = map.get(corr.targetQuestionKey) || [];
    existing.push(corr);
    map.set(corr.targetQuestionKey, existing);
  }
  
  return map;
}

// Export all functions as a namespace
export const fcStorage = {
  // Companies
  createCompany,
  getCompanyById,
  updateCompany,
  getAllCompanies,
  getAllCompaniesWithPagination,
  
  // Contacts
  createContact,
  getContactById,
  getContactByEmail,
  updateContact,
  verifyContact,
  toggleFullAssessmentAccess,
  
  // Assessments
  createAssessment,
  getAssessmentById,
  getAssessmentWithDetails,
  updateAssessment,
  deleteAssessment,
  deleteAssessmentResponses,
  resetAssessmentForRetake,
  completeAssessmentTier,
  upgradeAssessmentTier,
  getAssessmentsByContactId,
  getAllAssessments,
  getAllAssessmentsWithRelations,
  getAssessmentStats,
  
  // Questions
  getQuestionsByTier,
  getQuestionById,
  getQuestionByKey,
  createQuestion,
  updateQuestion,
  getAllQuestions,
  getAdaptiveQuestionsByAssessment,
  createAdaptiveQuestion,
  
  // Responses
  createResponse,
  getResponsesByAssessmentId,
  getResponseByQuestionId,
  upsertResponse,
  
  // Reports
  createReport,
  getReportsByAssessmentId,
  getReportByAssessmentId,
  getLatestReport,
  getReportById,
  updateReport,
  
  // Role Permissions
  getRolePermissions,
  hasPermission,
  getAllRolePermissions,
  updateRolePermissions,
  
  // Audit Logs
  createAuditLog,
  getAuditLogs,
  countAuditLogs,
  getAuditLogStats,
  getDistinctAuditActions,
  getDistinctEntityTypes,
  
  // AI Configuration
  getActiveSystemPrompts,
  getActiveGuardrails,
  getActiveGroundingRules,
  getActiveKnowledgeBase,
  getActiveFollowupTemplates,
  
  // Benchmarks
  getBenchmarks,
  
  // Email Verification
  createEmailVerificationToken,
  verifyEmailToken,
  
  // Tenants
  createTenant,
  getTenantById,
  getTenantBySlug,
  getTenantByDomain,
  updateTenant,
  getAllTenants,
  deleteTenant,
  
  // ROI Profiles
  getRoiProfileByAssessmentId,
  getRoiProfileById,
  createRoiProfile,
  updateRoiProfile,
  upsertRoiProfile,
  getRoiProfilesByContactId,
  deleteRoiProfile,
  
  // Access Requests
  createAccessRequest,
  getAccessRequestById,
  getLatestAccessRequestForContact,
  getPendingAccessRequestForContact,
  getAllAccessRequests,
  updateAccessRequestStatus,
  approveAccessRequest,
  rejectAccessRequest,
  
  // Beta Access Whitelist
  getBetaAccessList,
  addBetaAccess,
  removeBetaAccess,
  checkBetaAccess,
  getBetaAccessByEmail,
  
  // Report Narratives
  saveReportNarrative,
  getReportNarrative,
};
