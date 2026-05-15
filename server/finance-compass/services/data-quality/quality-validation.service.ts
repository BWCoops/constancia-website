/**
 * Data Quality Validation Service
 * 
 * Validates assessment records for data monetization readiness.
 * Implements quality rules from the data product specification.
 * 
 * Quality Rules:
 * 1. Completion time: 60s < valid < 45min
 * 2. Missing responses: max 2 required questions unanswered
 * 3. Uniform responses: detect all-same extreme answers
 * 4. Suspicious patterns: detect bot-like behavior
 * 
 * @version 1.0
 */

import { db } from "../../../db";
import { eq, and, sql, isNull, lt, gt, count, inArray } from "drizzle-orm";
import { 
  fcAssessments, 
  fcCompanies, 
  fcResponses,
  FC_QUALITY_FLAGS,
  COUNTRY_NAME_TO_ISO,
  SECTOR_TO_INDUSTRY,
  FC_WIDGET_VERSION,
  type FCQualityFlag,
  type FCCountryCode,
  type FCIndustry,
  type FCSourceChannel,
  type FCDeviceType,
} from "@shared/finance-compass-schema";

const MIN_COMPLETION_TIME_SECONDS = 60;
const MAX_COMPLETION_TIME_SECONDS = 45 * 60; // 45 minutes
const MAX_MISSING_REQUIRED_QUESTIONS = 2;
const MIN_RESPONSE_VARIANCE_THRESHOLD = 0.1; // Minimum variance in scale responses

export interface QualityValidationResult {
  isValid: boolean;
  qualityScore: number;
  qualityFlags: FCQualityFlag[];
  details: {
    completionTimeSeconds: number | null;
    totalQuestionsAnswered: number;
    totalQuestionsRequired: number;
    responseVariance: number | null;
    suspiciousPatterns: string[];
  };
}

export interface BackfillStats {
  totalAssessments: number;
  updatedAssessments: number;
  companiesUpdated: number;
  qualityChecked: number;
  validRecords: number;
  invalidRecords: number;
  errors: string[];
}

export class DataQualityService {
  /**
   * Validate a single assessment record
   */
  async validateAssessment(assessmentId: string): Promise<QualityValidationResult> {
    const assessment = await db.query.fcAssessments.findFirst({
      where: eq(fcAssessments.id, assessmentId),
    });

    if (!assessment) {
      return {
        isValid: false,
        qualityScore: 0,
        qualityFlags: ["incomplete"],
        details: {
          completionTimeSeconds: null,
          totalQuestionsAnswered: 0,
          totalQuestionsRequired: 0,
          responseVariance: null,
          suspiciousPatterns: ["Assessment not found"],
        },
      };
    }

    const responses = await db.query.fcResponses.findMany({
      where: eq(fcResponses.assessmentId, assessmentId),
    });

    const qualityFlags: FCQualityFlag[] = [];
    const suspiciousPatterns: string[] = [];
    let qualityScore = 100;

    // Calculate completion time
    let completionTimeSeconds: number | null = null;
    if (assessment.startedAt && assessment.completedAt) {
      completionTimeSeconds = Math.floor(
        (new Date(assessment.completedAt).getTime() - new Date(assessment.startedAt).getTime()) / 1000
      );
    }

    // Rule 1: Check completion time
    if (completionTimeSeconds !== null) {
      if (completionTimeSeconds < MIN_COMPLETION_TIME_SECONDS) {
        qualityFlags.push("too_fast");
        qualityScore -= 30;
        suspiciousPatterns.push(`Completed in ${completionTimeSeconds}s (min: ${MIN_COMPLETION_TIME_SECONDS}s)`);
      } else if (completionTimeSeconds > MAX_COMPLETION_TIME_SECONDS) {
        qualityFlags.push("too_slow");
        qualityScore -= 15;
        suspiciousPatterns.push(`Completed in ${Math.floor(completionTimeSeconds / 60)}min (max: 45min)`);
      }
    }

    // Rule 2: Check for incomplete assessment
    const isComplete = ["completed", "analysed", "report_generated"].includes(assessment.status);
    if (!isComplete) {
      qualityFlags.push("incomplete");
      qualityScore -= 20;
    }

    // Rule 3: Check for missing responses
    const totalQuestionsAnswered = responses.length;
    const expectedQuestions = this.getExpectedQuestionCount(assessment.tier);
    const missingCount = Math.max(0, expectedQuestions - totalQuestionsAnswered);
    
    if (missingCount > MAX_MISSING_REQUIRED_QUESTIONS) {
      qualityFlags.push("missing_responses");
      qualityScore -= 20;
      suspiciousPatterns.push(`Missing ${missingCount} responses (max allowed: ${MAX_MISSING_REQUIRED_QUESTIONS})`);
    }

    // Rule 4: Check for uniform extreme responses
    const scaleResponses = responses.filter(r => {
      const resp = r.response as { value?: number };
      return typeof resp?.value === 'number' && resp.value >= 1 && resp.value <= 5;
    });

    if (scaleResponses.length >= 5) {
      const values = scaleResponses.map(r => (r.response as { value: number }).value);
      const allSameExtreme = values.every(v => v === 1) || values.every(v => v === 5);
      
      if (allSameExtreme) {
        qualityFlags.push("uniform_responses");
        qualityScore -= 40;
        suspiciousPatterns.push(`All ${scaleResponses.length} scale responses are the same extreme value`);
      }

      // Calculate variance
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      
      if (variance < MIN_RESPONSE_VARIANCE_THRESHOLD && scaleResponses.length >= 8) {
        qualityFlags.push("suspicious_pattern");
        qualityScore -= 15;
        suspiciousPatterns.push(`Very low response variance: ${variance.toFixed(3)}`);
      }
    }

    // Ensure score is within bounds
    qualityScore = Math.max(0, Math.min(100, qualityScore));
    const isValid = qualityFlags.length === 0 || (qualityScore >= 60 && !qualityFlags.includes("uniform_responses"));

    return {
      isValid,
      qualityScore,
      qualityFlags,
      details: {
        completionTimeSeconds,
        totalQuestionsAnswered,
        totalQuestionsRequired: expectedQuestions,
        responseVariance: scaleResponses.length > 0 ? this.calculateVariance(
          scaleResponses.map(r => (r.response as { value: number }).value)
        ) : null,
        suspiciousPatterns,
      },
    };
  }

  /**
   * Update assessment with quality validation results
   */
  async updateAssessmentQuality(assessmentId: string): Promise<QualityValidationResult> {
    const result = await this.validateAssessment(assessmentId);

    await db.update(fcAssessments)
      .set({
        isValidRecord: result.isValid,
        qualityFlags: result.qualityFlags,
        qualityScore: result.qualityScore,
        qualityCheckedAt: new Date(),
        completionTimeSeconds: result.details.completionTimeSeconds,
        totalQuestionsAnswered: result.details.totalQuestionsAnswered,
        totalQuestionsRequired: result.details.totalQuestionsRequired,
        updatedAt: new Date(),
      })
      .where(eq(fcAssessments.id, assessmentId));

    return result;
  }

  /**
   * Backfill all existing assessments with quality data
   */
  async backfillAllAssessments(): Promise<BackfillStats> {
    const stats: BackfillStats = {
      totalAssessments: 0,
      updatedAssessments: 0,
      companiesUpdated: 0,
      qualityChecked: 0,
      validRecords: 0,
      invalidRecords: 0,
      errors: [],
    };

    try {
      // Get all assessments
      const assessments = await db.query.fcAssessments.findMany();
      stats.totalAssessments = assessments.length;

      // Process each assessment
      for (const assessment of assessments) {
        try {
          // Update widget version if not set
          const updates: Partial<typeof fcAssessments.$inferInsert> = {};
          
          if (!assessment.widgetVersion) {
            updates.widgetVersion = "1.0"; // Legacy records get v1.0
          }

          // Calculate completion time from timestamps if not set
          if (!assessment.completionTimeSeconds && assessment.startedAt && assessment.completedAt) {
            updates.completionTimeSeconds = Math.floor(
              (new Date(assessment.completedAt).getTime() - new Date(assessment.startedAt).getTime()) / 1000
            );
          }

          // Determine source channel from existing UTM data if available
          if (!assessment.sourceChannel) {
            updates.sourceChannel = this.inferSourceChannel(
              assessment.utmSource,
              assessment.utmMedium,
              assessment.referrer
            );
          }

          // Apply updates if any
          if (Object.keys(updates).length > 0) {
            await db.update(fcAssessments)
              .set({ ...updates, updatedAt: new Date() })
              .where(eq(fcAssessments.id, assessment.id));
            stats.updatedAssessments++;
          }

          // Run quality validation
          const result = await this.updateAssessmentQuality(assessment.id);
          stats.qualityChecked++;
          
          if (result.isValid) {
            stats.validRecords++;
          } else {
            stats.invalidRecords++;
          }
        } catch (err) {
          stats.errors.push(`Assessment ${assessment.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Backfill company standardization
      stats.companiesUpdated = await this.backfillCompanyStandardization();

    } catch (err) {
      stats.errors.push(`Backfill failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    return stats;
  }

  /**
   * Backfill standardized country codes and industry for companies
   */
  async backfillCompanyStandardization(): Promise<number> {
    let updatedCount = 0;

    const companies = await db.query.fcCompanies.findMany();

    for (const company of companies) {
      const updates: Partial<typeof fcCompanies.$inferInsert> = {};

      // Standardize country code
      if (!company.countryCode && company.country) {
        const countryCode = this.mapCountryToISO(company.country);
        if (countryCode) {
          updates.countryCode = countryCode;
        }
      }

      // Standardize industry
      if (!company.industry && company.sector) {
        const industry = this.mapSectorToIndustry(company.sector);
        if (industry) {
          updates.industry = industry;
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.update(fcCompanies)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(fcCompanies.id, company.id));
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Get segment counts for data quality dashboard
   */
  async getSegmentCounts(): Promise<{
    byCountry: { countryCode: string; total: number; valid: number }[];
    byIndustry: { industry: string; total: number; valid: number }[];
    bySizeBand: { sizeBand: string; total: number; valid: number }[];
    byCountryIndustrySizeBand: { countryCode: string; industry: string; sizeBand: string; total: number; valid: number }[];
  }> {
    // Get counts by country
    const byCountryRaw = await db.execute(sql`
      SELECT 
        COALESCE(c.country_code, 'OTHER') as country_code,
        COUNT(*) as total,
        SUM(CASE WHEN a.is_valid_record = true THEN 1 ELSE 0 END) as valid
      FROM fc_assessments a
      LEFT JOIN fc_companies c ON a.company_id = c.id
      WHERE a.status IN ('completed', 'analysed', 'report_generated')
      GROUP BY COALESCE(c.country_code, 'OTHER')
      ORDER BY total DESC
    `);

    // Get counts by industry
    const byIndustryRaw = await db.execute(sql`
      SELECT 
        COALESCE(c.industry, 'other') as industry,
        COUNT(*) as total,
        SUM(CASE WHEN a.is_valid_record = true THEN 1 ELSE 0 END) as valid
      FROM fc_assessments a
      LEFT JOIN fc_companies c ON a.company_id = c.id
      WHERE a.status IN ('completed', 'analysed', 'report_generated')
      GROUP BY COALESCE(c.industry, 'other')
      ORDER BY total DESC
    `);

    // Get counts by size band
    const bySizeBandRaw = await db.execute(sql`
      SELECT 
        COALESCE(a.size_band, 'unknown') as size_band,
        COUNT(*) as total,
        SUM(CASE WHEN a.is_valid_record = true THEN 1 ELSE 0 END) as valid
      FROM fc_assessments a
      WHERE a.status IN ('completed', 'analysed', 'report_generated')
      GROUP BY COALESCE(a.size_band, 'unknown')
      ORDER BY total DESC
    `);

    // Get full segment breakdown
    const bySegmentRaw = await db.execute(sql`
      SELECT 
        COALESCE(c.country_code, 'OTHER') as country_code,
        COALESCE(c.industry, 'other') as industry,
        COALESCE(a.size_band, 'unknown') as size_band,
        COUNT(*) as total,
        SUM(CASE WHEN a.is_valid_record = true THEN 1 ELSE 0 END) as valid
      FROM fc_assessments a
      LEFT JOIN fc_companies c ON a.company_id = c.id
      WHERE a.status IN ('completed', 'analysed', 'report_generated')
      GROUP BY 
        COALESCE(c.country_code, 'OTHER'),
        COALESCE(c.industry, 'other'),
        COALESCE(a.size_band, 'unknown')
      HAVING COUNT(*) >= 5
      ORDER BY total DESC
      LIMIT 50
    `);

    return {
      byCountry: (byCountryRaw.rows as any[]).map(r => ({
        countryCode: r.country_code,
        total: Number(r.total),
        valid: Number(r.valid),
      })),
      byIndustry: (byIndustryRaw.rows as any[]).map(r => ({
        industry: r.industry,
        total: Number(r.total),
        valid: Number(r.valid),
      })),
      bySizeBand: (bySizeBandRaw.rows as any[]).map(r => ({
        sizeBand: r.size_band,
        total: Number(r.total),
        valid: Number(r.valid),
      })),
      byCountryIndustrySizeBand: (bySegmentRaw.rows as any[]).map(r => ({
        countryCode: r.country_code,
        industry: r.industry,
        sizeBand: r.size_band,
        total: Number(r.total),
        valid: Number(r.valid),
      })),
    };
  }

  /**
   * Get data quality summary for dashboard
   */
  async getQualitySummary(): Promise<{
    totalAssessments: number;
    validRecords: number;
    invalidRecords: number;
    validPercentage: number;
    flagBreakdown: { flag: string; count: number }[];
    avgCompletionTime: number | null;
    avgQualityScore: number | null;
  }> {
    const summaryRaw = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_valid_record = true THEN 1 ELSE 0 END) as valid,
        AVG(completion_time_seconds) as avg_completion_time,
        AVG(quality_score) as avg_quality_score
      FROM fc_assessments
      WHERE status IN ('completed', 'analysed', 'report_generated')
    `);

    const flagsRaw = await db.execute(sql`
      SELECT unnest(quality_flags) as flag, COUNT(*) as count
      FROM fc_assessments
      WHERE quality_flags IS NOT NULL AND array_length(quality_flags, 1) > 0
      GROUP BY unnest(quality_flags)
      ORDER BY count DESC
    `);

    const summary = (summaryRaw.rows as any[])[0] || {};
    const total = Number(summary.total) || 0;
    const valid = Number(summary.valid) || 0;

    return {
      totalAssessments: total,
      validRecords: valid,
      invalidRecords: total - valid,
      validPercentage: total > 0 ? Math.round((valid / total) * 100) : 0,
      flagBreakdown: (flagsRaw.rows as any[]).map(r => ({
        flag: r.flag,
        count: Number(r.count),
      })),
      avgCompletionTime: summary.avg_completion_time ? Math.round(Number(summary.avg_completion_time)) : null,
      avgQualityScore: summary.avg_quality_score ? Math.round(Number(summary.avg_quality_score)) : null,
    };
  }

  // Helper methods

  private getExpectedQuestionCount(tier: string): number {
    switch (tier) {
      case "registration":
        return 5;
      case "quick_assessment":
        return 8;
      case "pre_assessment":
        return 14;
      case "full":
        return 40;
      default:
        return 10;
    }
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  }

  private mapCountryToISO(country: string): FCCountryCode | null {
    const normalized = country.toLowerCase().trim();
    return COUNTRY_NAME_TO_ISO[normalized] || null;
  }

  private mapSectorToIndustry(sector: string): FCIndustry | null {
    const normalized = sector.toLowerCase().trim();
    return SECTOR_TO_INDUSTRY[normalized] || null;
  }

  private inferSourceChannel(
    utmSource?: string | null,
    utmMedium?: string | null,
    referrer?: string | null
  ): FCSourceChannel {
    const source = utmSource?.toLowerCase() || "";
    const medium = utmMedium?.toLowerCase() || "";
    const ref = referrer?.toLowerCase() || "";

    // Check UTM parameters first
    if (medium.includes("cpc") || medium.includes("ppc") || medium.includes("paid")) {
      return "paid_search";
    }
    if (medium.includes("display") || medium.includes("banner")) {
      return "display";
    }
    if (medium.includes("social") || source.includes("facebook") || source.includes("linkedin") || source.includes("twitter")) {
      return "social";
    }
    if (medium.includes("email") || source.includes("email")) {
      return "email";
    }
    if (medium.includes("referral") || (ref && !ref.includes("constancia.io") && !ref.includes("financecompass"))) {
      return "referral";
    }
    if (source.includes("google") || source.includes("bing") || medium.includes("organic")) {
      return "organic_search";
    }
    if (!source && !medium && !ref) {
      return "direct";
    }

    return "unknown";
  }
}

export const dataQualityService = new DataQualityService();
