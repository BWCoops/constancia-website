/**
 * Anonymous Data Export Service
 * 
 * Creates anonymized data views suitable for data product sales.
 * Strips all PII and personal identifiers.
 * 
 * Fields included in export:
 * - Demographic: countryCode, industry, sizeBand
 * - Scores: epmReadinessScore, dimensionScores, overallMaturityScore
 * - Metadata: tier, completionTimeSeconds, widgetVersion, sourceChannel, deviceType
 * - Quality: isValidRecord, qualityScore
 * - Timestamps: createdAt (date only, no time)
 * 
 * Fields explicitly excluded:
 * - All contact info (name, email, phone)
 * - Company name
 * - IP addresses
 * - User agents
 * - Internal notes
 * 
 * @version 1.0
 */

import { db } from "../../../db";
import { sql } from "drizzle-orm";

export interface AnonymousAssessmentRecord {
  assessmentId: string;  // Anonymized ID
  tier: string;
  status: string;
  widgetVersion: string | null;
  
  // Demographics
  countryCode: string;
  industry: string;
  sizeBand: string;
  
  // Scores
  epmReadinessScore: number | null;
  overallMaturityScore: number | null;
  dimensionScores: Record<string, number> | null;
  processPerformanceScore: number | null;
  complexityScaleScore: number | null;
  currentStateGapsScore: number | null;
  
  // Metadata
  sourceChannel: string | null;
  deviceType: string | null;
  completionTimeSeconds: number | null;
  
  // Quality
  isValidRecord: boolean;
  qualityScore: number | null;
  
  // Date (no time for additional anonymization)
  completedDate: string | null;
}

export interface AnonymousDataExport {
  version: string;
  exportDate: string;
  methodology: string;
  recordCount: number;
  validRecordCount: number;
  segments: {
    countries: string[];
    industries: string[];
    sizeBands: string[];
  };
  records: AnonymousAssessmentRecord[];
}

export class AnonymousExportService {
  /**
   * Generate anonymized data export for all valid records
   */
  async generateExport(options?: {
    validOnly?: boolean;
    minQualityScore?: number;
    fromDate?: Date;
    toDate?: Date;
    countryCode?: string;
    industry?: string;
    sizeBand?: string;
  }): Promise<AnonymousDataExport> {
    const validOnly = options?.validOnly ?? true;
    const minQualityScore = options?.minQualityScore ?? 60;

    // Build WHERE conditions using parameterized SQL fragments
    const conditions = [
      sql`a.status IN ('completed', 'analysed', 'report_generated')`,
    ];

    if (validOnly) {
      conditions.push(sql`a.is_valid_record = true`);
    }
    if (minQualityScore > 0) {
      conditions.push(sql`COALESCE(a.quality_score, 0) >= ${minQualityScore}`);
    }
    if (options?.fromDate) {
      conditions.push(sql`a.created_at >= ${options.fromDate.toISOString()}`);
    }
    if (options?.toDate) {
      conditions.push(sql`a.created_at <= ${options.toDate.toISOString()}`);
    }
    if (options?.countryCode) {
      conditions.push(sql`c.country_code = ${options.countryCode}`);
    }
    if (options?.industry) {
      conditions.push(sql`c.industry = ${options.industry}`);
    }
    if (options?.sizeBand) {
      conditions.push(sql`a.size_band = ${options.sizeBand}`);
    }

    const whereClause = sql.join(conditions, sql` AND `);

    const result = await db.execute(sql`
      SELECT 
        md5(a.id) as assessment_id,
        a.tier,
        a.status,
        COALESCE(a.widget_version, '1.0') as widget_version,
        
        COALESCE(c.country_code, 'OTHER') as country_code,
        COALESCE(c.industry, 'other') as industry,
        COALESCE(a.size_band, 'unknown') as size_band,
        
        a.epm_readiness_score,
        a.overall_maturity_score,
        a.dimension_scores,
        a.process_performance_score,
        a.complexity_scale_score,
        a.current_state_gaps_score,
        
        a.source_channel,
        a.device_type,
        a.completion_time_seconds,
        
        COALESCE(a.is_valid_record, false) as is_valid_record,
        a.quality_score,
        
        TO_CHAR(a.completed_at, 'YYYY-MM-DD') as completed_date
        
      FROM fc_assessments a
      LEFT JOIN fc_companies c ON a.company_id = c.id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
    `);

    const records: AnonymousAssessmentRecord[] = (result.rows as any[]).map(row => ({
      assessmentId: row.assessment_id,
      tier: row.tier,
      status: row.status,
      widgetVersion: row.widget_version,
      countryCode: row.country_code,
      industry: row.industry,
      sizeBand: row.size_band,
      epmReadinessScore: row.epm_readiness_score,
      overallMaturityScore: row.overall_maturity_score,
      dimensionScores: row.dimension_scores,
      processPerformanceScore: row.process_performance_score,
      complexityScaleScore: row.complexity_scale_score,
      currentStateGapsScore: row.current_state_gaps_score,
      sourceChannel: row.source_channel,
      deviceType: row.device_type,
      completionTimeSeconds: row.completion_time_seconds,
      isValidRecord: row.is_valid_record,
      qualityScore: row.quality_score,
      completedDate: row.completed_date,
    }));

    // Get unique segments
    const countries = Array.from(new Set(records.map(r => r.countryCode))).sort();
    const industries = Array.from(new Set(records.map(r => r.industry))).sort();
    const sizeBands = Array.from(new Set(records.map(r => r.sizeBand))).sort();

    return {
      version: "1.0",
      exportDate: new Date().toISOString().split("T")[0],
      methodology: "EPM Readiness Assessment Widget v1.0 - Anonymous benchmark data collected via self-service web assessment.",
      recordCount: records.length,
      validRecordCount: records.filter(r => r.isValidRecord).length,
      segments: {
        countries,
        industries,
        sizeBands,
      },
      records,
    };
  }

  /**
   * Generate aggregated benchmark data (no individual records)
   */
  async generateBenchmarkSummary(): Promise<{
    version: string;
    exportDate: string;
    segments: {
      countryCode: string;
      industry: string;
      sizeBand: string;
      sampleSize: number;
      avgEpmReadiness: number;
      avgOverallMaturity: number;
      medianEpmReadiness: number;
      percentile25: number;
      percentile75: number;
    }[];
  }> {
    const result = await db.execute(sql`
      SELECT 
        COALESCE(c.country_code, 'OTHER') as country_code,
        COALESCE(c.industry, 'other') as industry,
        COALESCE(a.size_band, 'unknown') as size_band,
        COUNT(*) as sample_size,
        ROUND(AVG(a.epm_readiness_score)::numeric, 1) as avg_epm_readiness,
        ROUND(AVG(a.overall_maturity_score)::numeric, 2) as avg_overall_maturity,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.epm_readiness_score)::numeric, 1) as median_epm_readiness,
        ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY a.epm_readiness_score)::numeric, 1) as percentile_25,
        ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY a.epm_readiness_score)::numeric, 1) as percentile_75
      FROM fc_assessments a
      LEFT JOIN fc_companies c ON a.company_id = c.id
      WHERE a.status IN ('completed', 'analysed', 'report_generated')
        AND a.is_valid_record = true
        AND a.epm_readiness_score IS NOT NULL
      GROUP BY 
        COALESCE(c.country_code, 'OTHER'),
        COALESCE(c.industry, 'other'),
        COALESCE(a.size_band, 'unknown')
      HAVING COUNT(*) >= 5
      ORDER BY COUNT(*) DESC
    `);

    return {
      version: "1.0",
      exportDate: new Date().toISOString().split("T")[0],
      segments: (result.rows as any[]).map(row => ({
        countryCode: row.country_code,
        industry: row.industry,
        sizeBand: row.size_band,
        sampleSize: Number(row.sample_size),
        avgEpmReadiness: Number(row.avg_epm_readiness),
        avgOverallMaturity: Number(row.avg_overall_maturity),
        medianEpmReadiness: Number(row.median_epm_readiness),
        percentile25: Number(row.percentile_25),
        percentile75: Number(row.percentile_75),
      })),
    };
  }
}

export const anonymousExportService = new AnonymousExportService();
