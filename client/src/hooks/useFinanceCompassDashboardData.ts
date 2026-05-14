import { useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface SessionStatus {
  verified: boolean;
  contactId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  expiresAt?: string;
  hasFullAssessmentAccess?: boolean;
}

interface UserAssessment {
  id: string;
  tier: string;
  status: string;
  startedAt: string;
  updatedAt: string;
  questionsAnswered?: number;
  totalQuestions?: number;
  progress?: number;
}

interface MyAssessmentsResponse {
  success: boolean;
  data?: {
    assessments: UserAssessment[];
  };
  error?: string;
}

interface RoiMetrics {
  roiPercent: number;
  paybackMonths: number;
  npvValue: number;
  totalCostOfOwnership: number;
  benefitCostRatio: number;
  totalImplementationCost: number;
  totalAnnualBenefits: number;
}

interface RoiMetricsResponse {
  success: boolean;
  data?: {
    profile: { currency?: string };
    metrics: RoiMetrics;
  };
}

interface AiAnalysis {
  summary?: string;
  keyInsights?: string[];
  recommendations?: string[];
  aiReadinessSummary?: string;
  dimensionInsights?: Record<string, string>;
}

interface AssessmentResultsResponse {
  success: boolean;
  data?: {
    assessment: {
      id: string;
      tier: string;
      status: string;
      dimensionScores?: Record<string, number | { score: number }>;
      weightedDimensionScores?: Record<string, number>;
      epmReadinessScore?: number;
      overallMaturityScore?: number;
    };
    aiAnalysis?: AiAnalysis;
  };
}

export function normalizeDimensionScores(
  rawScores: Record<string, number | { score: number }> | null | undefined
): Record<string, number> {
  if (!rawScores || typeof rawScores !== 'object') {
    return {};
  }

  const normalized: Record<string, number> = {};

  for (const [key, value] of Object.entries(rawScores)) {
    if (typeof value === 'number') {
      normalized[key] = value;
    } else if (value && typeof value === 'object' && 'score' in value && typeof value.score === 'number') {
      normalized[key] = value.score;
    }
  }

  return normalized;
}

const KNOWN_DIMENSION_KEYS = [
  'financial_planning_analysis',
  'management_reporting',
  'consolidation_close',
  'financial_controls_compliance',
  'technology_systems',
  'organisation_people',
  'data_analytics',
  'ai_machine_learning'
];

export function calculateKPIs(dimensionScores: Record<string, number>): {
  financeEfficiency: number;
  aiEnablement: number;
  transformationReadiness: number;
} {
  const tp = dimensionScores.consolidation_close ?? 0;
  const ts = dimensionScores.technology_systems ?? 0;
  const financeEfficiency = Math.round(Math.min(100, Math.max(0, (tp + ts) / 2)));

  const ai = dimensionScores.ai_machine_learning ?? 0;
  const da = dimensionScores.data_analytics ?? 0;
  const aiEnablement = Math.round(Math.min(100, Math.max(0, (ai + da) / 2)));

  const dimensionScoresOnly = KNOWN_DIMENSION_KEYS
    .map(key => dimensionScores[key])
    .filter((score): score is number => typeof score === 'number' && !isNaN(score));

  const transformationReadiness = dimensionScoresOnly.length > 0
    ? Math.round(Math.min(100, Math.max(0, dimensionScoresOnly.reduce((a, b) => a + b, 0) / dimensionScoresOnly.length)))
    : 0;

  return { financeEfficiency, aiEnablement, transformationReadiness };
}

export function useFinanceCompassDashboardData() {
  const [, navigate] = useLocation();

  const {
    data: sessionData,
    isLoading: sessionLoading,
    error: sessionError,
    isSuccess: sessionSuccess
  } = useQuery<SessionStatus>({
    queryKey: ["/api/finance-compass/public/session"],
    retry: 2,
    retryDelay: 1000,
  });

  const isVerified = sessionData?.verified === true;

  const {
    data: assessmentsData,
    isLoading: assessmentsLoading,
    error: assessmentsError,
    refetch: refetchAssessments
  } = useQuery<MyAssessmentsResponse>({
    queryKey: ["/api/finance-compass/public/my-assessments"],
    enabled: isVerified,
  });

  useEffect(() => {
    if (sessionSuccess && !sessionData?.verified) {
      navigate("/finance-compass");
    }
  }, [sessionSuccess, sessionData, navigate]);

  const assessments = useMemo(() => {
    return assessmentsData?.data?.assessments || [];
  }, [assessmentsData]);

  const latestAssessmentId = useMemo(() => {
    return assessments[0]?.id;
  }, [assessments]);

  const completedAssessments = useMemo(() => {
    return assessments.filter(a =>
      ["completed", "analysed", "report_generated", "initial_complete"].includes(a.status)
    );
  }, [assessments]);

  const latestCompletedId = useMemo(() => {
    return completedAssessments[0]?.id;
  }, [completedAssessments]);

  const handleStartAssessment = useCallback((tier: string) => {
    navigate(`/finance-compass/start/${tier}?qualified=true&email=${encodeURIComponent(sessionData?.email || "")}`);
  }, [navigate, sessionData?.email]);

  return {
    sessionData,
    sessionLoading,
    sessionError,
    isVerified,
    assessments,
    assessmentsLoading,
    assessmentsError,
    refetchAssessments,
    latestAssessmentId,
    latestCompletedId,
    completedAssessments,
    handleStartAssessment,
    navigate
  };
}

export function useAssessmentResults(assessmentId: string | undefined, enabled: boolean = true) {
  const { data, isLoading, error, refetch } = useQuery<AssessmentResultsResponse>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "results"],
    enabled: !!assessmentId && enabled,
  });

  const dimensionScores = useMemo(() => {
    return normalizeDimensionScores(data?.data?.assessment?.dimensionScores);
  }, [data?.data?.assessment?.dimensionScores]);

  const weightedDimensionScores = useMemo(() => {
    return data?.data?.assessment?.weightedDimensionScores || {};
  }, [data?.data?.assessment?.weightedDimensionScores]);

  // Weighted overall score (70/30 blend if both tiers exist, otherwise single tier score)
  const overallScore = useMemo(() => {
    return data?.data?.assessment?.overallMaturityScore ?? data?.data?.assessment?.epmReadinessScore;
  }, [data?.data?.assessment?.overallMaturityScore, data?.data?.assessment?.epmReadinessScore]);

  // Raw score for THIS specific assessment (not weighted with other tiers)
  const rawAssessmentScore = useMemo(() => {
    return data?.data?.assessment?.epmReadinessScore;
  }, [data?.data?.assessment?.epmReadinessScore]);

  const kpis = useMemo(() => {
    return calculateKPIs(dimensionScores);
  }, [dimensionScores]);

  const hasDimensionScores = Object.keys(dimensionScores).length > 0;
  const hasWeightedScores = Object.keys(weightedDimensionScores).length > 0;

  const aiAnalysis = useMemo(() => {
    return data?.data?.aiAnalysis || null;
  }, [data?.data?.aiAnalysis]);

  return {
    data,
    isLoading,
    error,
    refetch,
    dimensionScores,
    weightedDimensionScores,
    overallScore,
    rawAssessmentScore,
    kpis,
    hasDimensionScores,
    hasWeightedScores,
    aiAnalysis
  };
}

export function useRoiMetrics(assessmentId: string | undefined) {
  const { data, isLoading, error } = useQuery<RoiMetricsResponse>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "roi"],
    enabled: !!assessmentId,
  });

  const metrics = data?.data?.metrics;
  const currency = data?.data?.profile?.currency || "GBP";
  const hasMetrics = !!metrics;

  return {
    data,
    isLoading,
    error,
    metrics,
    currency,
    hasMetrics
  };
}

interface TierBreakdown {
  pre: number;
  full: number;
  hasPreData: boolean;
  hasFullData: boolean;
}

interface MaturityScoreResponse {
  success: boolean;
  data?: {
    overallScore: number | null;
    rawTierScore: number | null;
    tier: string;
    status: string;
    tierBreakdown: TierBreakdown | null;
    maturityLevel: string | null;
    processing: boolean;
    companyName: string | null;
  };
  error?: string;
}

export function useMaturityScore(assessmentId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery<MaturityScoreResponse>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "maturity-score"],
    enabled: !!assessmentId,
  });

  const overallScore = useMemo(() => data?.data?.overallScore ?? null, [data?.data?.overallScore]);
  const rawTierScore = useMemo(() => data?.data?.rawTierScore ?? null, [data?.data?.rawTierScore]);
  const maturityLevel = useMemo(() => data?.data?.maturityLevel ?? null, [data?.data?.maturityLevel]);
  const tierBreakdown = useMemo(() => data?.data?.tierBreakdown ?? null, [data?.data?.tierBreakdown]);
  const tier = useMemo(() => data?.data?.tier ?? null, [data?.data?.tier]);
  const isProcessing = useMemo(() => data?.data?.processing ?? false, [data?.data?.processing]);
  const companyName = useMemo(() => data?.data?.companyName ?? null, [data?.data?.companyName]);

  const hasScore = overallScore !== null && overallScore > 0;
  const hasTierBlend = tierBreakdown?.hasPreData && tierBreakdown?.hasFullData;

  return {
    data,
    isLoading,
    error,
    refetch,
    overallScore,
    rawTierScore,
    maturityLevel,
    tierBreakdown,
    tier,
    isProcessing,
    companyName,
    hasScore,
    hasTierBlend
  };
}

interface DimensionData {
  key: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  score: number | null;
  maturityLevel: string;
  insight: string | null;
  hasData: boolean;
}

interface DimensionsResponse {
  success: boolean;
  data?: {
    dimensions: DimensionData[];
    processing: boolean;
    tier: string;
    hasBothTiers: boolean;
  };
  error?: string;
}

export function useDimensionOverview(assessmentId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery<DimensionsResponse>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "dimensions"],
    enabled: !!assessmentId,
  });

  const dimensions = useMemo(() => data?.data?.dimensions ?? [], [data?.data?.dimensions]);
  const isProcessing = useMemo(() => data?.data?.processing ?? false, [data?.data?.processing]);
  const tier = useMemo(() => data?.data?.tier ?? null, [data?.data?.tier]);
  const hasBothTiers = useMemo(() => data?.data?.hasBothTiers ?? false, [data?.data?.hasBothTiers]);

  const hasDimensions = dimensions.length > 0 && dimensions.some(d => d.hasData);

  const sortedDimensions = useMemo(() => {
    return [...dimensions].sort((a, b) => {
      if (a.hasData && !b.hasData) return -1;
      if (!a.hasData && b.hasData) return 1;
      return (b.score ?? 0) - (a.score ?? 0);
    });
  }, [dimensions]);

  const topPerformingDimensions = useMemo(() => {
    return sortedDimensions.filter(d => d.hasData && (d.score ?? 0) >= 60).slice(0, 3);
  }, [sortedDimensions]);

  const improvementAreas = useMemo(() => {
    return [...dimensions]
      .filter(d => d.hasData && (d.score ?? 0) < 60)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 3);
  }, [dimensions]);

  return {
    data,
    isLoading,
    error,
    refetch,
    dimensions,
    sortedDimensions,
    topPerformingDimensions,
    improvementAreas,
    isProcessing,
    tier,
    hasBothTiers,
    hasDimensions
  };
}

export type { SessionStatus, UserAssessment, RoiMetrics, AssessmentResultsResponse, AiAnalysis, MaturityScoreResponse, TierBreakdown, DimensionData, DimensionsResponse };
