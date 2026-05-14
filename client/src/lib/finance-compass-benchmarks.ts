/**
 * FinanceCompass Industry Benchmarks and Scoring Framework - Client Side
 * Based on 1QG Assessment Platform specifications
 * 
 * Re-exports from shared constants for consistency with server.
 */

export {
  DIMENSION_BENCHMARKS,
  DIMENSION_LABELS_BY_CODE as DIMENSION_LABELS,
  API_KEY_TO_DIMENSION,
  GAP_THRESHOLDS,
  GAP_CLASSIFICATION,
  MATURITY_LEVELS_SCALE as MATURITY_LEVELS,
  SCORE_WEIGHTS,
  BENCHMARK_TARGETS,
  classifyGap,
  getMaturityLevelFromScale as getMaturityLevel,
  percentageToScale,
  scaleToPercentage,
  type GapClassificationType,
  type MaturityLevelScaleType as MaturityLevelType,
} from "@shared/finance-compass-constants";

import { 
  BENCHMARK_TARGETS, 
  DIMENSION_BENCHMARKS,
  DIMENSION_LABELS_BY_CODE as DIMENSION_LABELS,
  API_KEY_TO_DIMENSION,
  GAP_CLASSIFICATION,
  classifyGap,
} from "@shared/finance-compass-constants";

import type { GapClassificationType } from "@shared/finance-compass-constants";

export const WORLD_CLASS_BENCHMARK = BENCHMARK_TARGETS.WORLD_CLASS;

export function calculateGapFromPercentage(percentageScore: number): number {
  const scaleScore = (percentageScore / 100) * 5;
  return Math.max(0, WORLD_CLASS_BENCHMARK - scaleScore);
}

export interface GapAnalysisResult {
  dimensionKey: string;
  dimensionLabel: string;
  score: number;
  scaleScore: number;
  benchmark: number;
  gap: number;
  classification: GapClassificationType;
  classificationInfo: typeof GAP_CLASSIFICATION[GapClassificationType];
}

export function calculateGapAnalysis(dimensionScores: Record<string, number>): GapAnalysisResult[] {
  const results: GapAnalysisResult[] = [];

  for (const [apiKey, percentageScore] of Object.entries(dimensionScores)) {
    const dimKey = API_KEY_TO_DIMENSION[apiKey] as keyof typeof DIMENSION_BENCHMARKS;
    if (dimKey) {
      const benchmarkData = DIMENSION_BENCHMARKS[dimKey];
      const scaleScore = (percentageScore / 100) * 5;
      const gap = Math.max(0, benchmarkData.worldClass - scaleScore);
      const classification = classifyGap(gap);

      results.push({
        dimensionKey: dimKey,
        dimensionLabel: DIMENSION_LABELS[dimKey].full,
        score: percentageScore,
        scaleScore,
        benchmark: benchmarkData.industryAverage,
        gap,
        classification,
        classificationInfo: GAP_CLASSIFICATION[classification],
      });
    }
  }

  return results.sort((a, b) => b.gap - a.gap);
}

export interface RadarDataPoint {
  dimension: string;
  shortLabel: string;
  fullLabel: string;
  yourScore: number;
  benchmark: number;
  worldClass: number;
}

export function prepareRadarChartData(dimensionScores: Record<string, number>): RadarDataPoint[] {
  const data: RadarDataPoint[] = [];

  for (const [dimKey, dimInfo] of Object.entries(DIMENSION_LABELS)) {
    const apiKey = dimInfo.key;
    const percentageScore = dimensionScores[apiKey];
    
    if (percentageScore !== undefined) {
      const scaleScore = (percentageScore / 100) * 5;
      const benchmarkData = DIMENSION_BENCHMARKS[dimKey as keyof typeof DIMENSION_BENCHMARKS];

      data.push({
        dimension: dimKey,
        shortLabel: dimInfo.short,
        fullLabel: dimInfo.full,
        yourScore: scaleScore,
        benchmark: benchmarkData.industryAverage,
        worldClass: benchmarkData.worldClass,
      });
    }
  }

  return data;
}
