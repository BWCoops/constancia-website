import { useParams, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { trackResultsView, trackReportDownload } from "@/lib/funnel-analytics";
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  TrendingUp, 
  Mail, 
  Phone,
  BarChart3,
  Target,
  Loader2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Radar,
  LineChart,
  Zap,
  Calendar,
  Clock,
  Users,
  BookOpen,
  AlertCircle,
  GraduationCap,
  Scale,
  Award,
  TrendingDown,
  AlertTriangle,
  FileText,
  Map,
  Briefcase,
  Info,
  HelpCircle,
  RefreshCw,
  Lightbulb,
  Calculator,
  Shield,
  Check,
  Monitor,
  ExternalLink,
  Layers
} from "lucide-react";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Pencil, Link2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import type { WorkshopSchedule, WorkshopScheduleItem, BenchmarkComparisonReport } from "@shared/finance-compass-schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FinanceCompassRadarChart } from "@/components/finance-compass/RadarChart";
import { MaturityIndicator, MaturityBadge } from "@/components/finance-compass/MaturityIndicator";
import { GaugeGrid, GaugeChart } from "@/components/finance-compass/GaugeChart";
import { BenchmarkComparison } from "@/components/finance-compass/BenchmarkComparison";
import { ScoringTransparency } from "@/components/finance-compass/ScoringTransparency";
import { BenefitsTrackingDashboard } from "@/components/finance-compass/BenefitsTrackingDashboard";
import { ROIAnalyticsCharts } from "@/components/finance-compass/ROIAnalyticsCharts";
import { ChatbotWidget } from "@/components/finance-compass/ChatbotWidget";
// DownloadGateModal import removed - PDF functionality disabled
import { calculateYearByYearAnalysis } from "@shared/roi-calculator";

interface PhasedBenefit {
  phase: string;
  timeline: string;
  timelineMonths?: { start: number; end: number };
  percentage: number;
  benefits: string[];
}

interface ImplementationTimelineData {
  totalMonths: number;
  minMonths: number;
  maxMonths: number;
  industryMultiplier: number;
  industryRationale?: string;
  phases: PhasedBenefit[];
}

interface ResultsData {
  assessment: {
    id: string;
    tier: string;
    status: string;
    completedAt: string | null;
    epmReadinessScore: number | null;
    dimensionScores: Record<string, number> | null;
    overallMaturityScore: number | null;
    quickWins: string[] | null;
    recommendations: string[] | null;
  };
  contact: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  company: {
    name: string;
  } | null;
  summary: {
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
  };
  report: {
    id: string;
    pdfPath: string | null;
    executiveSummary: string | null;
  } | null;
  implementationTimeline?: ImplementationTimelineData;
  processing?: boolean;
  processingMessage?: string;
}

interface ExecutiveBrief {
  headline: string;
  situationAnalysis: string;
  keyFindings: string[];
  topRecommendations: string[];
  valueProposition: string;
  riskHighlight: string;
  callToAction: string;
}

interface RoadmapPhase {
  phase: number;
  name: string;
  duration: string;
  objectives: string[];
  deliverables: string[];
  keyMilestones: string[];
  resources: string;
  riskMitigation: string;
}

interface ImplementationRoadmap {
  totalDuration: string;
  phases: RoadmapPhase[];
  criticalPath: string[];
  quickWins: string[];
  successFactors: string[];
  summary: string;
}

interface StakeholderNarrative {
  stakeholderType: string;
  title: string;
  // New structured format
  headline?: string;
  situationOverview?: string;
  keyInsights?: { title: string; description: string; impact: "high" | "medium" | "low" }[];
  priorityActions?: { action: string; rationale: string; timeframe: string; priority: "immediate" | "short-term" | "medium-term" }[];
  riskAssessment?: { risk: string; likelihood: "high" | "medium" | "low"; mitigation: string }[];
  valueOpportunities?: string[];
  callToAction?: string;
  // Legacy fields
  focusAreas: string[];
  keyMessages: string[];
  risksPrioritized: string[];
  actionItems: string[];
  metrics: { name: string; value: string; context: string }[];
  narrative: string;
}

interface Phase14Intelligence {
  enhancedRootCauses: Array<{
    pattern: string;
    patternLabel: string;
    confidence: number;
    urgencyScore: number;
    impactScore: number;
    businessRisk: string;
    affectedDimensions: string[];
    effortToResolve: 'low' | 'medium' | 'high';
    stakeholderImpact: string[];
    remediationPaths: Array<{
      id: string;
      title: string;
      description: string;
      effort: string;
      impact: string;
      timeframe: string;
      estimatedCost?: string;
    }>;
  }>;
  respondentConfidence: {
    overall: number;
    confidenceLevel: string;
    respondentRole?: string;
    respondentSeniority?: string;
    breakdown: {
      roleConfidence: number;
      seniorityMultiplier: number;
      selfAssessment?: number;
    };
  };
  confidenceLevels: {
    validated_evidence: { label: string; color: string; description: string };
    advisory_judgement: { label: string; color: string; description: string };
    indicative_outlook: { label: string; color: string; description: string };
    pending_validation: { label: string; color: string; description: string };
  };
}

interface NarrativesData {
  executiveBrief: ExecutiveBrief;
  implementationRoadmap: ImplementationRoadmap;
  stakeholderNarratives: {
    cfo: StakeholderNarrative;
    fpaDirector: StakeholderNarrative;
    itDirector?: StakeholderNarrative;
  };
  phase14Intelligence?: Phase14Intelligence;
  cachedAt?: string;
}

interface RoiMetrics {
  roiPercent: number;
  npvValue: number;
  paybackMonths: number;
  benefitCostRatio: number;
  totalImplementationCost: number;
  totalAnnualBenefits: number;
  totalAnnualCosts: number;
  totalCostOfOwnership: number;
  netPresentValue: number;
  irrPercent: number;
}

interface RoiProfile {
  id: string;
  assessmentId: string;
  baselineOperatingCost: number;
  fteSavingsPercent: number;
  processEfficiencyPercent: number;
  riskReductionPercent: number;
  implementationCost: number;
  annualLicenseCost: number;
  annualMaintenanceCost: number;
  horizonYears: number;
  currency: string;
}

interface RoiData {
  profile: RoiProfile | null;
  metrics: RoiMetrics | null;
}

interface ScoreBreakdownQuestion {
  questionId: string;
  questionKey?: string;
  questionText: string;
  questionType: string;
  options: Array<{ value: string; label: string }> | null;
  sliderConfig: { min: number; max: number; labels?: Record<number, string> } | null;
  userResponse: unknown;
  userResponseLabel: string;
  rawScore?: number;
  scoreEarned?: number;
  scoreMultiplier?: number;
  dimensionWeight?: number;
  weightedScore?: number;
  maxPossible: number;
  explanation: string;
}

interface AppliedCorrelation {
  sourceQuestion: string;
  targetQuestion: string;
  effectType: string;
  adjustment: number;
  description: string;
}

interface ScoreBreakdownDimension {
  dimension: string;
  dimensionCode: string;
  dimensionLabel: string;
  finalScore: number;
  weightedScore?: number;
  totalScoreEarned: number;
  maxPossibleScore: number;
  correlationAdjustment?: number;
  overallWeight?: number;
  calculation: string;
  questions: ScoreBreakdownQuestion[];
  appliedCorrelations?: AppliedCorrelation[];
}

interface ScoreBreakdownData {
  assessmentId: string;
  tier: string;
  dimensions: ScoreBreakdownDimension[];
  methodology: {
    description: string;
    benchmarkSource?: string;
    benchmarkDescription?: string;
    framework?: {
      name: string;
      dimensions: Array<{ code: string; name: string; description: string }>;
      maturityLevels: Array<{ level: number; name: string; range: string; description: string; timeline: string }>;
      benchmarkTiers: Array<{ tier: string; description: string }>;
    };
    weightingSystem?: {
      description: string;
      tiers: Array<{ name: string; description: string; default: number; example: string }>;
      correlations: {
        description: string;
        effectTypes: Array<{ type: string; description: string }>;
        example: string;
      };
      formula: string;
    };
    scoringTypes: Array<{ 
      type: string; 
      explanation: string;
      example?: string;
      calculation?: string;
    }>;
    trustIndicators?: string[];
    validationPipeline?: {
      name: string;
      description: string;
      layers: Array<{
        layer: number | string;
        name: string;
        description: string;
      }>;
    };
    assessmentStructure?: {
      description: string;
      tiers: Array<{
        tier: string;
        questionCount: number;
        focus: string;
        description: string;
      }>;
      combined: string;
    };
  };
}

const tierNames: Record<string, string> = {
  pre_assessment: "Pre-Assessment",
  full: "Full Assessment",
};

const tierUpgrades: Record<string, { nextTier: string; name: string; description: string }> = {
  pre_assessment: {
    nextTier: "full",
    name: "Full Assessment",
    description: "Complete 7-dimension analysis with KPI Registry, Governance Calendar, and Workshop Plan",
  },
};

function getScoreLevel(score: number): { label: string; color: string; description: string } {
  if (score >= 70) return { 
    label: "Strong", 
    color: "text-green-600", 
    description: "You have a strong case for finance transformation" 
  };
  if (score >= 40) return { 
    label: "Moderate", 
    color: "text-yellow-600", 
    description: "Transformation benefits may vary based on your specific context" 
  };
  return { 
    label: "Foundational", 
    color: "text-orange-600", 
    description: "Focus on foundational improvements before major transformation investment" 
  };
}

export default function FinanceCompassResults() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const assessmentId = params.id;
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Edit answer state
  const [editingQuestion, setEditingQuestion] = useState<{
    questionId: string;
    questionText: string;
    questionType: string;
    options: Array<{ value: string; label: string }> | null;
    sliderConfig: { min: number; max: number; labels?: Record<number, string> } | null;
    currentResponse: unknown;
    dimension: string;
  } | null>(null);
  const [editedResponse, setEditedResponse] = useState<unknown>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCachedAtRef = useRef<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<{ success: boolean; data: ResultsData }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "results"],
    enabled: !!assessmentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      // Poll every 3 seconds while processing
      const isProcessing = query.state.data?.data?.processing;
      return isProcessing ? 3000 : false;
    },
  });

  // Fetch workshop schedule - can load while AI processing since it doesn't depend on AI
  const { data: workshopData, isLoading: workshopLoading } = useQuery<{ success: boolean; data: WorkshopSchedule }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "workshops/schedule"],
    enabled: !!assessmentId && data?.data?.assessment?.tier === "full",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch benchmark comparison - can load while AI processing since scores are available
  const { data: benchmarkData, isLoading: benchmarkLoading } = useQuery<{ success: boolean; data: BenchmarkComparisonReport }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "benchmark-comparison"],
    enabled: !!assessmentId && ["pre_assessment", "full"].includes(data?.data?.assessment?.tier || "") && !!data?.data?.assessment?.dimensionScores,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  // Fetch AI narratives - only when ai-report tab is selected AND AI processing is complete
  const { data: narrativesData, isLoading: narrativesLoading, error: narrativesError } = useQuery<{ success: boolean; processing?: boolean; data?: NarrativesData; message?: string }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "narratives"],
    enabled: !!assessmentId && ["pre_assessment", "full"].includes(data?.data?.assessment?.tier || "") && !data?.data?.processing && activeTab === "ai-report",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      // Poll every 5 seconds while narratives are processing (regenerating)
      const isProcessingNarratives = query.state.data?.processing === true;
      return isProcessingNarratives ? 5000 : false;
    },
  });

  // Fetch score breakdown - can load when scores are available
  const { data: scoreBreakdownData, isLoading: scoreBreakdownLoading } = useQuery<{ success: boolean; data: ScoreBreakdownData }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "score-breakdown"],
    enabled: !!assessmentId && !!data?.data?.assessment?.dimensionScores && activeTab === "benchmarks",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  // Fetch ROI data - available for all tiers with dimension scores
  const { data: roiData, isLoading: roiLoading } = useQuery<{ success: boolean; data: RoiData }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "roi"],
    enabled: !!assessmentId && ["pre_assessment", "full"].includes(data?.data?.assessment?.tier || "") && !!data?.data?.assessment?.dimensionScores,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Track results view on mount
  useEffect(() => {
    if (data?.data?.assessment) {
      const score = data.data.assessment.epmReadinessScore || 0;
      trackResultsView(assessmentId, score);
    }
  }, [assessmentId, data?.data?.assessment]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Watch for completion - when processing changes from true to false and we have data
  useEffect(() => {
    if (isRegenerating && narrativesData?.success) {
      // If processing is false and we have cachedAt, regeneration is complete
      if (!narrativesData.processing && narrativesData.data?.cachedAt) {
        const currentCachedAt = narrativesData.data.cachedAt;
        if (lastCachedAtRef.current && currentCachedAt !== lastCachedAtRef.current) {
          // Fresh data received
          setIsRegenerating(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          toast({
            title: "AI Report Regenerated",
            description: "Your report has been updated with fresh insights.",
          });
        }
      }
    }
  }, [narrativesData, isRegenerating, toast]);

  // Regenerate AI narratives mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/finance-compass/public/assessments/${assessmentId}/narratives/regenerate`);
      return response.json();
    },
    onMutate: () => {
      // Store the current cachedAt before regeneration
      lastCachedAtRef.current = narrativesData?.data?.cachedAt || null;
      setIsRegenerating(true);
      toast({
        title: "Regenerating AI Report",
        description: "This typically takes 1-2 minutes. We'll update the page when ready.",
        duration: 5000,
      });
    },
    onSuccess: () => {
      // Clear any existing polling interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      // Start polling for completion
      let pollCount = 0;
      pollIntervalRef.current = setInterval(() => {
        pollCount++;
        queryClient.invalidateQueries({ 
          queryKey: ["/api/finance-compass/public/assessments", assessmentId, "narratives"] 
        });
        
        // Stop after 24 attempts (2 minutes)
        if (pollCount >= 24) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsRegenerating(false);
          toast({
            title: "Check Back Soon",
            description: "The report is still generating. Refresh the page in a minute.",
          });
        }
      }, 5000);
    },
    onError: () => {
      setIsRegenerating(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      toast({
        title: "Regeneration Failed",
        description: "Unable to regenerate the AI report. Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Show toast when processing completes
  useEffect(() => {
    if (data?.data?.assessment?.status === "analysed" && !data?.data?.processing) {
      toast({
        title: "Analysis Complete",
        description: "Your assessment results are now ready to view.",
      });
    }
  }, [data?.data?.assessment?.status, data?.data?.processing, toast]);

  const upgradeMutation = useMutation({
    mutationFn: async (newTier: string) => {
      const res = await apiRequest("POST", `/api/finance-compass/public/assessments/${assessmentId}/upgrade`, {
        newTier,
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        navigate(`/finance-compass/assess/${result.data.assessmentId}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upgrade assessment",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upgrade assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a single answer
  const updateAnswerMutation = useMutation({
    mutationFn: async ({ questionId, response }: { questionId: string; response: unknown }) => {
      const res = await apiRequest("PATCH", `/api/finance-compass/public/assessments/${assessmentId}/responses/${questionId}`, {
        response,
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ 
          queryKey: ["/api/finance-compass/public/assessments", assessmentId, "results"] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["/api/finance-compass/public/assessments", assessmentId, "score-breakdown"] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["/api/finance-compass/public/assessments", assessmentId, "benchmark-comparison"] 
        });
        
        setEditingQuestion(null);
        setEditedResponse(null);
        toast({
          title: "Answer Updated",
          description: "Your scores have been recalculated with the new answer.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update answer",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // PDF download functionality removed - no longer generating PDF reports

  // Memoized handler for editing questions
  const handleEditQuestion = useCallback((question: {
    questionId: string;
    questionText: string;
    questionType: string;
    options: Array<{ value: string; label: string }> | null;
    sliderConfig: { min: number; max: number; labels?: Record<number, string> } | null;
    userResponse: unknown;
  }, dimension: string) => {
    setEditingQuestion({
      questionId: question.questionId,
      questionText: question.questionText,
      questionType: question.questionType,
      options: question.options,
      sliderConfig: question.sliderConfig,
      currentResponse: question.userResponse,
      dimension: dimension,
    });
    setEditedResponse(question.userResponse);
  }, []);

  // Memoized handler for saving edited questions
  const handleSaveEditedQuestion = useCallback(() => {
    if (editingQuestion && editedResponse !== null) {
      updateAnswerMutation.mutate({
        questionId: editingQuestion.questionId,
        response: editedResponse,
      });
    }
  }, [editingQuestion, editedResponse, updateAnswerMutation]);

  // Memoized handler for regenerating AI narratives
  const handleRegenerateNarratives = useCallback(() => {
    regenerateMutation.mutate();
  }, [regenerateMutation]);

  // Memoized handler for retrying analysis
  const handleRetryAnalysis = useCallback(async () => {
    try {
      await apiRequest("POST", `/api/finance-compass/public/assessments/${assessmentId}/analyse`);
      queryClient.invalidateQueries({ queryKey: ["/api/finance-compass/public/assessments", assessmentId, "results"] });
    } catch (err) {
      console.error("Failed to retry analysis:", err);
    }
  }, [assessmentId]);

  // Memoized handler for upgrade
  const handleUpgrade = useCallback((nextTier: string) => {
    upgradeMutation.mutate(nextTier);
  }, [upgradeMutation]);

  // Memoized handler for navigating to ROI page
  const handleNavigateToROI = useCallback(() => {
    navigate(`/finance-compass/roi/${assessmentId}`);
  }, [navigate, assessmentId]);

  // Extract data early for hooks (with safe defaults)
  const assessment = data?.data?.assessment;
  
  // Memoize computed values to prevent unnecessary recalculations
  // These must be before early returns to satisfy React hooks rules
  const score = useMemo(() => 
    assessment?.epmReadinessScore || assessment?.overallMaturityScore || 0, 
    [assessment?.epmReadinessScore, assessment?.overallMaturityScore]
  );
  
  const scoreInfo = useMemo(() => getScoreLevel(score), [score]);
  
  const upgrade = useMemo(() => 
    assessment?.tier ? tierUpgrades[assessment.tier] : undefined, 
    [assessment?.tier]
  );
  
  const hasDimensionScores = useMemo(() => 
    assessment?.dimensionScores && Object.keys(assessment.dimensionScores).length > 0,
    [assessment?.dimensionScores]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16 sm:pt-20 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <Skeleton className="h-12 w-64 mb-4" />
            <Skeleton className="h-6 w-96 mb-8" />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16 sm:pt-20 pb-16 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">Results Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This assessment may not be completed yet or the link is invalid.
              </p>
              <Link href="/finance-compass">
                <Button data-testid="button-back-home">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to FinanceCompass
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Progressive loading: show results immediately, AI sections load in background
  const isProcessingAI = data?.data?.processing === true;

  const { contact, company, summary, report } = data.data;

  // Type assertion since we've passed the data.success check - use this in render
  const safeAssessment = assessment!;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Your Results | ${tierNames[safeAssessment.tier] || "Assessment"} | FinanceCompass`}
        description="View your personalised finance maturity score, transformation roadmap, vendor recommendations, and ROI projections from your FinanceCompass assessment."
      />

      <main className="pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-3 sm:mb-4">
          <Link href="/finance-compass/dashboard">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-brand-teal hover:text-brand-cream -ml-2 text-xs sm:text-sm"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
          </Link>
        </div>
        
        {isProcessingAI && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-brand-berry to-brand-ink text-white py-2 sm:py-3 px-4 sm:px-6"
            data-testid="banner-processing"
          >
            <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 sm:gap-3">
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-center">
                <span className="sm:hidden">Generating AI insights...</span>
                <span className="hidden sm:inline">Generating AI insights in the background... Your scores are ready below.</span>
              </span>
            </div>
          </motion.div>
        )}
        
        <section className="bg-gradient-to-r from-brand-ink via-brand-deep-mint to-brand-berry py-8 sm:py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-white"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-mint/20 mb-4 sm:mb-6">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-brand-cyan" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">
                Thank You{contact ? `, ${contact.firstName}` : ""}!
              </h1>
              <p className="text-base sm:text-lg text-white/80 mb-1 sm:mb-2">
                Your {tierNames[safeAssessment.tier] || "assessment"} is complete
              </p>
              {company && (
                <p className="text-sm sm:text-base text-white/60">{company.name}</p>
              )}
            </motion.div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="shadow-lg" data-testid="card-score-overview">
              <CardContent className="py-4 sm:py-6 md:py-8 px-3 sm:px-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                  <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex flex-col items-center justify-center">
                    <GaugeChart
                      value={score}
                      title="Maturity Score"
                      colorScheme="epm"
                      size="lg"
                    />
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                      {summary.answeredQuestions}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground text-center">
                      Questions Answered
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                      {summary.completionPercentage}%
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground text-center">
                      Completion Rate
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                    <MaturityBadge score={score} />
                    <div className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
                      Maturity Level
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {hasDimensionScores && (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                <div className="overflow-x-auto -mx-2 px-2 pb-2 mb-4">
                  <TabsList className={`inline-flex w-auto min-w-full sm:grid sm:w-full ${safeAssessment.tier === "full" ? "sm:grid-cols-5" : "sm:grid-cols-4"}`} data-testid="tabs-analytics">
                    <TabsTrigger value="overview" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-trigger-overview">
                      <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="radar" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-trigger-radar">
                      <Radar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Radar</span>
                    </TabsTrigger>
                    <TabsTrigger value="benchmarks" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-trigger-benchmarks">
                      <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Benchmarks</span>
                    </TabsTrigger>
                    {safeAssessment.tier === "full" && (
                      <TabsTrigger value="benefits" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-trigger-benefits">
                        <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>Benefits</span>
                      </TabsTrigger>
                    )}
                    {["pre_assessment", "full"].includes(safeAssessment.tier) && (
                      <TabsTrigger value="ai-report" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-trigger-ai-report">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>AI Report</span>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <BenchmarkComparison 
                      dimensionScores={safeAssessment.dimensionScores!}
                      variant="bars"
                    />
                    <MaturityIndicator 
                      score={score}
                      showTimeline={true}
                      showRecommendations={true}
                      dimensionScores={safeAssessment.dimensionScores ?? undefined}
                    />
                  </div>
                  
                  {/* ROI Summary CTA Card - Shows for all tiers */}
                  {["pre_assessment", "full"].includes(safeAssessment.tier) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <Card 
                        className="bg-gradient-to-br from-brand-ink/5 via-brand-berry/5 to-brand-mint/10/30 dark:from-brand-ink/20 dark:via-brand-berry/20 dark:to-brand-ink/20 border-brand-berry/30"
                        data-testid="card-roi-overview-cta"
                      >
                        <CardContent className="py-6">
                          {roiLoading ? (
                            <div className="flex items-center justify-center gap-3 py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
                              <span className="text-muted-foreground">Loading ROI analysis...</span>
                            </div>
                          ) : roiData?.success && roiData.data?.metrics ? (
                            <div className="space-y-5">
                              {/* Header with icon and title */}
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center shadow-lg">
                                  <Calculator className="h-7 w-7 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg text-brand-mint">
                                    Return on Investment Analysis
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Your estimated EPM transformation delivers substantial value over a {roiData.data.profile?.horizonYears || 3}-year horizon
                                  </p>
                                </div>
                              </div>
                              
                              {/* Key metrics grid */}
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                                <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-brand-berry/20 hover:border-brand-berry/40 transition-colors">
                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">ROI</span>
                                  </div>
                                  <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-brand-ink to-brand-berry bg-clip-text text-transparent">
                                    {roiData.data.metrics.roiPercent.toFixed(0)}%
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                                    Net benefit vs cost
                                  </p>
                                </div>
                                
                                <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-brand-berry/20 hover:border-brand-berry/40 transition-colors">
                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">Payback</span>
                                  </div>
                                  <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-brand-ink to-brand-berry bg-clip-text text-transparent">
                                    {roiData.data.metrics.paybackMonths < 24 
                                      ? `${roiData.data.metrics.paybackMonths.toFixed(1)} mo`
                                      : `${(roiData.data.metrics.paybackMonths / 12).toFixed(1)} yr`}
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                                    Time to recover
                                  </p>
                                </div>
                                
                                <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-brand-berry/20 hover:border-brand-berry/40 transition-colors">
                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                    <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-berry dark:text-brand-mint flex-shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">NPV</span>
                                  </div>
                                  <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-brand-ink to-brand-berry bg-clip-text text-transparent">
                                    {roiData.data.metrics.npvValue >= 1000 
                                      ? `£${(roiData.data.metrics.npvValue / 1000).toFixed(1)}M`
                                      : `£${roiData.data.metrics.npvValue.toFixed(0)}k`}
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                                    Present value
                                  </p>
                                </div>
                                
                                <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-brand-berry/20 hover:border-brand-berry/40 transition-colors">
                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                    <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">BCR</span>
                                  </div>
                                  <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-brand-ink to-brand-berry bg-clip-text text-transparent">
                                    {roiData.data.metrics.benefitCostRatio.toFixed(2)}x
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                                    Benefit ratio
                                  </p>
                                </div>
                              </div>
                              
                              {/* Additional context row */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-3 border-t border-brand-berry/10">
                                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                    <span className="text-muted-foreground">Benefits:</span>
                                    <span className="font-semibold text-foreground">
                                      £{roiData.data.metrics.totalAnnualBenefits >= 1000 
                                        ? `${(roiData.data.metrics.totalAnnualBenefits / 1000).toFixed(1)}M`
                                        : `${roiData.data.metrics.totalAnnualBenefits.toFixed(0)}k`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-2 h-2 rounded-full bg-brand-mint flex-shrink-0"></div>
                                    <span className="text-muted-foreground">Cost:</span>
                                    <span className="font-semibold text-foreground">
                                      £{roiData.data.metrics.totalImplementationCost >= 1000 
                                        ? `${(roiData.data.metrics.totalImplementationCost / 1000).toFixed(1)}M`
                                        : `${roiData.data.metrics.totalImplementationCost.toFixed(0)}k`}
                                    </span>
                                  </div>
                                </div>
                                <Link href={`/finance-compass/roi/${assessmentId}`}>
                                  <Button 
                                    variant="default" 
                                    className="bg-gradient-to-r from-brand-ink to-brand-berry hover:from-brand-ink/90 hover:to-brand-berry/90 shadow-md"
                                    data-testid="button-view-roi-details"
                                  >
                                    View Full Analysis
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center shadow-lg">
                                <Calculator className="h-7 w-7 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-lg text-brand-mint">
                                  Return on Investment Analysis
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Complete your ROI profile to see personalised investment analysis and business case projections tailored to your organisation.
                                </p>
                              </div>
                              <Link href={`/finance-compass/roi/${assessmentId}`}>
                                <Button 
                                  variant="outline" 
                                  className="border-brand-berry text-brand-teal hover:bg-brand-berry/10"
                                  data-testid="button-complete-roi"
                                >
                                  Complete ROI Profile
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="radar" className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <FinanceCompassRadarChart
                      dimensionScores={safeAssessment.dimensionScores!}
                      title="Dimension Comparison"
                      description="Your scores vs industry benchmarks and world-class targets"
                    />
                    <BenchmarkComparison
                      dimensionScores={safeAssessment.dimensionScores!}
                      variant="chart"
                      title="Bar Chart Comparison"
                      description="Horizontal view of your performance"
                    />
                  </div>
                  <ScoringTransparency
                    industry={(safeAssessment as { industry?: string | null }).industry ?? null}
                    dimensionScores={safeAssessment.dimensionScores}
                  />
                </TabsContent>


                <TabsContent value="benchmarks" className="space-y-6" data-testid="tab-content-benchmarks">
                  {["pre_assessment", "full"].includes(safeAssessment.tier) ? (
                    benchmarkLoading ? (
                      <div className="space-y-4" data-testid="skeleton-benchmark-loading">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                          <Skeleton className="h-20 sm:h-24" />
                          <Skeleton className="h-20 sm:h-24" />
                          <Skeleton className="h-20 sm:h-24" />
                          <Skeleton className="h-20 sm:h-24" />
                        </div>
                        <Skeleton className="h-48 sm:h-64" />
                      </div>
                    ) : benchmarkData?.success && benchmarkData.data ? (
                      <div className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4" data-testid="benchmark-summary-cards">
                          <Card className="p-3 sm:p-4" data-testid="card-overall-percentile">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center mb-1.5 sm:mb-2">
                                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                              </div>
                              <div className="text-xl sm:text-2xl font-bold text-foreground">
                                {benchmarkData.data.summary.overallPercentileRank}%
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">Overall Percentile</div>
                            </div>
                          </Card>
                          <Card className="p-3 sm:p-4" data-testid="card-strengths-count">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-1.5 sm:mb-2">
                                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                                {benchmarkData.data.summary.strengthCount}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">Strengths</div>
                            </div>
                          </Card>
                          <Card className="p-3 sm:p-4" data-testid="card-improvements-count">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-1.5 sm:mb-2">
                                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400" />
                              </div>
                              <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {benchmarkData.data.summary.improvementCount}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">Improvements</div>
                            </div>
                          </Card>
                          <Card className="p-3 sm:p-4" data-testid="card-critical-gaps">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-1.5 sm:mb-2">
                                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                              </div>
                              <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                                {benchmarkData.data.summary.criticalGapCount}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">Critical Gaps</div>
                            </div>
                          </Card>
                        </div>

                        <Card className="bg-gradient-to-br from-brand-mint/10 to-brand-mint/10 dark:from-brand-ink/20 dark:to-brand-ink/20 border-brand-ink" data-testid="card-methodology-info">
                          <CardContent className="py-5">
                            <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center">
                                  <Scale className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-brand-mint mb-1">
                                    How are your scores calculated?
                                  </h4>
                                  <p className="text-sm text-brand-berry dark:text-brand-mint">
                                    {scoreBreakdownData?.data?.methodology?.description || 
                                      "Your scores are calculated using Constancia's proprietary Finance Transformation Framework."}
                                  </p>
                                </div>
                              </div>
                              
                              {scoreBreakdownData?.data?.methodology?.benchmarkDescription && (
                                <div className="p-3 bg-white/5 rounded-lg border border-brand-berry">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="h-4 w-4 text-brand-teal" />
                                    <span className="text-sm font-medium text-brand-mint">
                                      {scoreBreakdownData?.data?.methodology?.benchmarkSource || "Constancia Benchmark Database"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-brand-berry dark:text-brand-mint">
                                    {scoreBreakdownData.data.methodology.benchmarkDescription}
                                  </p>
                                </div>
                              )}

                              <Accordion type="multiple" className="w-full space-y-2">
                                {/* 6-Layer AI Validation Pipeline */}
                                {scoreBreakdownData?.data?.methodology?.validationPipeline && (
                                  <AccordionItem value="validation-pipeline" className="border-brand-berry">
                                    <AccordionTrigger className="text-sm font-medium text-brand-mint hover:no-underline py-2">
                                      <div className="flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-brand-teal" />
                                        {scoreBreakdownData.data.methodology.validationPipeline.name}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4 space-y-3">
                                      <p className="text-sm text-muted-foreground">
                                        {scoreBreakdownData.data.methodology.validationPipeline.description}
                                      </p>
                                      <div className="grid gap-2">
                                        {scoreBreakdownData.data.methodology.validationPipeline.layers.map((layer: { layer: number | string; name: string; description: string }, idx: number) => {
                                          const layerColors = [
                                            "bg-brand-mint",
                                            "bg-orange-500", 
                                            "bg-purple-500",
                                            "bg-green-500",
                                            "bg-brand-mint",
                                            "bg-indigo-500"
                                          ];
                                          return (
                                            <div 
                                              key={idx}
                                              className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-brand-ink"
                                              data-testid={`validation-layer-${layer.layer}`}
                                            >
                                              <div className={`w-8 h-8 rounded-full ${layerColors[idx] || "bg-gray-500"} flex items-center justify-center flex-shrink-0`}>
                                                <span className="text-white text-xs font-bold">L{layer.layer}</span>
                                              </div>
                                              <div className="flex-1">
                                                <div className="text-sm font-medium text-foreground">{layer.name}</div>
                                                <div className="text-xs text-muted-foreground">{layer.description}</div>
                                              </div>
                                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

                                {/* Assessment Structure - Pre + Full */}
                                {scoreBreakdownData?.data?.methodology?.assessmentStructure && (
                                  <AccordionItem value="assessment-structure" className="border-brand-berry">
                                    <AccordionTrigger className="text-sm font-medium text-brand-mint hover:no-underline py-2">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-brand-teal" />
                                        Assessment Structure
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4 space-y-3">
                                      <p className="text-sm text-muted-foreground">
                                        {scoreBreakdownData.data.methodology.assessmentStructure.description}
                                      </p>
                                      <div className="grid gap-3">
                                        {scoreBreakdownData.data.methodology.assessmentStructure.tiers.map((tier: { tier: string; questionCount: number; focus: string; description: string }, idx: number) => (
                                          <div 
                                            key={idx}
                                            className="p-3 bg-white/5 rounded-lg border border-brand-ink"
                                            data-testid={`assessment-tier-${idx}`}
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="font-medium text-foreground">{tier.tier}</span>
                                              <Badge variant="outline" className="bg-brand-berry/10 border-brand-berry/30 text-brand-teal">
                                                {tier.questionCount} questions
                                              </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground mb-1">
                                              <span className="font-medium">Focus:</span> {tier.focus}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{tier.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="p-3 bg-gradient-to-r from-brand-ink/5 to-brand-berry/5 rounded-lg border border-brand-berry/20">
                                        <p className="text-xs text-brand-mint">
                                          {scoreBreakdownData.data.methodology.assessmentStructure.combined}
                                        </p>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                )}

                                {scoreBreakdownData?.data?.methodology?.framework && (
                                  <AccordionItem value="framework" className="border-brand-berry">
                                    <AccordionTrigger className="text-sm font-medium text-brand-mint hover:no-underline py-2">
                                      <div className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-brand-teal" />
                                        {scoreBreakdownData.data.methodology.framework.name}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4 space-y-4">
                                      <div>
                                        <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                          7 Assessment Dimensions
                                        </h6>
                                        <div className="grid gap-2">
                                          {scoreBreakdownData.data.methodology.framework.dimensions.map((dim, idx) => (
                                            <div 
                                              key={idx}
                                              className="flex items-start gap-3 p-2 bg-white/5 rounded border border-brand-ink"
                                              data-testid={`framework-dimension-${idx}`}
                                            >
                                              <Badge variant="outline" className="bg-brand-navy text-white border-0 text-xs font-bold shrink-0">
                                                {dim.code}
                                              </Badge>
                                              <div>
                                                <div className="text-sm font-medium text-foreground">{dim.name}</div>
                                                <div className="text-xs text-muted-foreground">{dim.description}</div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                          Maturity Levels
                                        </h6>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                          {scoreBreakdownData.data.methodology.framework.maturityLevels.map((level, idx) => {
                                            const levelColors = [
                                              "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800",
                                              "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
                                              "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800",
                                              "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800",
                                            ];
                                            return (
                                              <div 
                                                key={idx}
                                                className={`p-2 rounded border text-center ${levelColors[idx]}`}
                                                data-testid={`maturity-level-${idx}`}
                                              >
                                                <div className="text-sm font-bold text-foreground">{level.name}</div>
                                                <div className="text-xs text-muted-foreground">{level.range}</div>
                                                <div className="text-xs text-muted-foreground mt-1">{level.timeline}</div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                          Benchmark Comparison Tiers
                                        </h6>
                                        <div className="grid gap-2">
                                          {scoreBreakdownData.data.methodology.framework.benchmarkTiers.map((tier, idx) => (
                                            <div 
                                              key={idx}
                                              className="flex items-center gap-3 p-2 bg-white/5 rounded border border-brand-ink"
                                              data-testid={`benchmark-tier-${idx}`}
                                            >
                                              <Badge 
                                                variant="outline" 
                                                className={`text-xs font-medium shrink-0 ${
                                                  idx === 0 ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" :
                                                  idx === 1 ? "bg-brand-mint/10 dark:bg-brand-ink text-brand-berry dark:text-brand-mint" :
                                                  "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                }`}
                                              >
                                                {tier.tier}
                                              </Badge>
                                              <span className="text-sm text-muted-foreground">{tier.description}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                )}
                                
                                <AccordionItem value="scoring-methods" className="border-brand-berry">
                                  <AccordionTrigger className="text-sm font-medium text-brand-mint hover:no-underline py-2">
                                    <div className="flex items-center gap-2">
                                      <Calculator className="h-4 w-4 text-brand-teal" />
                                      Scoring Methods Explained
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-2 pb-4">
                                    <div className="grid gap-3">
                                      {scoreBreakdownData?.data?.methodology?.scoringTypes?.map((type: { type: string; explanation: string; example?: string; calculation?: string }, idx: number) => (
                                        <div 
                                          key={idx} 
                                          className="p-3 bg-white/5 rounded-lg border border-brand-ink"
                                          data-testid={`scoring-method-${idx}`}
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge 
                                              variant="outline" 
                                              className="bg-brand-berry/10 border-brand-berry/30 text-brand-teal dark:text-brand-mint text-xs font-medium"
                                            >
                                              {type.type}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-foreground mb-2">{type.explanation}</p>
                                          {type.example && (
                                            <p className="text-xs text-muted-foreground italic mb-1">{type.example}</p>
                                          )}
                                          {type.calculation && (
                                            <code className="text-xs bg-muted px-2 py-1 rounded text-brand-mint font-mono">
                                              {type.calculation}
                                            </code>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>

                              {scoreBreakdownData?.data?.methodology?.trustIndicators && (
                                <div className="pt-2 border-t border-brand-berry">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-4 w-4 text-brand-teal" />
                                    <span className="text-xs font-medium text-brand-mint">
                                      Methodology Credentials
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {scoreBreakdownData.data.methodology.trustIndicators.map((indicator: string, idx: number) => (
                                      <div 
                                        key={idx} 
                                        className="flex items-start gap-2 text-xs text-brand-berry dark:text-brand-mint"
                                        data-testid={`trust-indicator-${idx}`}
                                      >
                                        <Check className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                                        <span>{indicator}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card data-testid="card-dimension-comparisons">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Scale className="h-5 w-5 text-brand-teal" />
                              Dimension Benchmarks
                            </CardTitle>
                            <CardDescription>
                              Your scores compared to industry benchmarks ({benchmarkData.data.sector} sector). Expand each dimension to see how scores are calculated.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Accordion type="multiple" className="space-y-3">
                              {benchmarkData.data.dimensionComparisons.map((comparison, index) => {
                                const statusColors: Record<string, string> = {
                                  excellent: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                                  good: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                                  average: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                                  below_average: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
                                  needs_attention: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                                };
                                const breakdownDimension = scoreBreakdownData?.data?.dimensions?.find(
                                  d => d.dimensionCode === comparison.metric || 
                                       d.dimension === comparison.metric ||
                                       d.dimensionLabel.toLowerCase().includes(comparison.metricLabel.toLowerCase().split(' ')[0])
                                );
                                return (
                                  <AccordionItem 
                                    key={comparison.metric}
                                    value={comparison.metric}
                                    className="border rounded-lg overflow-hidden"
                                    data-testid={`accordion-benchmark-${index}`}
                                  >
                                    <AccordionTrigger 
                                      className="px-4 py-3 hover:bg-muted/50 [&[data-state=open]]:bg-muted/30"
                                      data-testid={`trigger-benchmark-${index}`}
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full text-left">
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-foreground mb-1">
                                            {comparison.metricLabel}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="text-muted-foreground">
                                              Your score: <span className="font-semibold text-foreground">{(comparison.yourScore ?? 0).toFixed(1)}</span>
                                            </span>
                                            <span className="text-muted-foreground">vs</span>
                                            <span className="text-muted-foreground">
                                              Median (P50): <span className="font-semibold text-foreground">{(comparison.p50 ?? 0).toFixed(1)}</span>
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 mr-2">
                                          <Badge 
                                            variant="outline"
                                            className={`border-0 ${statusColors[comparison.status] || statusColors.average}`}
                                            data-testid={`badge-status-${index}`}
                                          >
                                            {comparison.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          </Badge>
                                          <Badge 
                                            variant="secondary"
                                            data-testid={`badge-percentile-${index}`}
                                          >
                                            P{comparison.percentileRank}
                                          </Badge>
                                          {comparison.gap != null && comparison.gap !== 0 && (
                                            <span className={`text-sm font-medium ${
                                              comparison.gap > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                            }`}>
                                              {comparison.gap > 0 ? '+' : ''}{comparison.gap.toFixed(1)} gap
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                      {comparison.recommendation && (
                                        <div className="mb-4 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground italic">
                                          {comparison.recommendation}
                                        </div>
                                      )}
                                      
                                      {scoreBreakdownLoading ? (
                                        <div className="space-y-3" data-testid="skeleton-breakdown-loading">
                                          <Skeleton className="h-4 w-48" />
                                          <Skeleton className="h-16" />
                                          <Skeleton className="h-16" />
                                        </div>
                                      ) : breakdownDimension ? (
                                        <div className="space-y-4">
                                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-brand-ink/5 to-brand-berry/5 rounded-lg border border-brand-berry/20">
                                            <div className="flex items-center gap-2">
                                              <Info className="h-4 w-4 text-brand-teal" />
                                              <span className="text-sm font-medium text-foreground">Score Calculation</span>
                                            </div>
                                            <span className="text-sm font-semibold text-brand-teal" data-testid={`text-calculation-${index}`}>
                                              {breakdownDimension.calculation}
                                            </span>
                                          </div>
                                          
                                          <div className="space-y-3">
                                            <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                              <BarChart3 className="h-4 w-4" />
                                              Questions in this dimension ({breakdownDimension.questions.length})
                                            </h5>
                                            {breakdownDimension.questions.map((question, qIndex) => (
                                              <div 
                                                key={question.questionId}
                                                className="p-3 border rounded-lg bg-card"
                                                data-testid={`question-breakdown-${index}-${qIndex}`}
                                              >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                  <div className="text-sm font-medium text-foreground">
                                                    {question.questionText}
                                                  </div>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="shrink-0 h-7 w-7"
                                                    onClick={() => handleEditQuestion(question, breakdownDimension.dimension)}
                                                    data-testid={`button-edit-${index}-${qIndex}`}
                                                  >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                  </Button>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 mb-2 text-sm">
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">Your answer:</span>
                                                    <span className="font-medium text-foreground" data-testid={`text-response-${index}-${qIndex}`}>
                                                      {question.userResponseLabel}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">Raw Score:</span>
                                                    <Badge variant="outline" className="text-xs" data-testid={`badge-score-${index}-${qIndex}`}>
                                                      {(question.rawScore ?? question.scoreEarned ?? 0).toFixed(1)}/{question.maxPossible}
                                                    </Badge>
                                                  </div>
                                                  {(question.scoreMultiplier !== 1.0 || question.dimensionWeight !== 1.0) && (
                                                    <div className="flex items-center gap-1">
                                                      <span className="text-muted-foreground">Weighted:</span>
                                                      <Badge variant="secondary" className="text-xs" data-testid={`badge-weighted-${index}-${qIndex}`}>
                                                        {(question.weightedScore ?? 0).toFixed(1)}
                                                      </Badge>
                                                      {question.scoreMultiplier !== 1.0 && (
                                                        <span className="text-xs text-brand-teal">×{question.scoreMultiplier}</span>
                                                      )}
                                                      {question.dimensionWeight !== 1.0 && (
                                                        <span className="text-xs text-purple-600">w:{question.dimensionWeight}</span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                                    <div 
                                                      className="h-full bg-gradient-to-r from-brand-ink to-brand-berry rounded-full transition-all duration-300"
                                                      style={{ width: `${question.maxPossible > 0 ? ((question.rawScore ?? question.scoreEarned ?? 0) / question.maxPossible) * 100 : 0}%` }}
                                                      data-testid={`progress-question-${index}-${qIndex}`}
                                                    />
                                                  </div>
                                                  <span className="text-xs text-muted-foreground w-10 text-right">
                                                    {question.maxPossible > 0 ? Math.round(((question.rawScore ?? question.scoreEarned ?? 0) / question.maxPossible) * 100) : 0}%
                                                  </span>
                                                </div>
                                                <div className="mt-2 text-xs text-muted-foreground italic" data-testid={`text-explanation-${index}-${qIndex}`}>
                                                  {question.explanation}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                          
                                          {breakdownDimension.appliedCorrelations && breakdownDimension.appliedCorrelations.length > 0 && (
                                            <div className="space-y-2 mt-4 pt-4 border-t">
                                              <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                <Link2 className="h-4 w-4" />
                                                Cross-Question Correlations ({breakdownDimension.appliedCorrelations.length})
                                              </h5>
                                              <div className="text-xs text-muted-foreground mb-2">
                                                Total correlation adjustment: 
                                                <span className={`ml-1 font-medium ${(breakdownDimension.correlationAdjustment ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                  {(breakdownDimension.correlationAdjustment ?? 0) >= 0 ? '+' : ''}{(breakdownDimension.correlationAdjustment ?? 0).toFixed(1)}
                                                </span>
                                              </div>
                                              <div className="space-y-1">
                                                {breakdownDimension.appliedCorrelations.map((corr, cIndex) => (
                                                  <div key={cIndex} className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded">
                                                    <Badge variant="outline" className="text-xs shrink-0">
                                                      {corr.effectType}
                                                    </Badge>
                                                    <span className="text-muted-foreground truncate">
                                                      {corr.description}
                                                    </span>
                                                    <span className={`ml-auto font-medium ${corr.adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                      {corr.adjustment >= 0 ? '+' : ''}{corr.adjustment.toFixed(1)}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {breakdownDimension.overallWeight && breakdownDimension.overallWeight !== 1.0 && (
                                            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                                              <span>Dimension overall weight: </span>
                                              <Badge variant="secondary" className="text-xs ml-1">
                                                {breakdownDimension.overallWeight}×
                                              </Badge>
                                              <span className="ml-1">(contributes more/less to overall score)</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-4" data-testid="dimension-summary">
                                          <div className="p-4 bg-gradient-to-r from-brand-ink/5 to-brand-berry/5 rounded-lg border border-brand-berry/20">
                                            <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                                              <BarChart3 className="h-4 w-4 text-brand-teal" />
                                              Dimension Performance Summary
                                            </h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                              <div className="text-center">
                                                <div className="text-2xl font-bold text-brand-mint">
                                                  {(comparison.yourScore ?? 0).toFixed(0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Your Score</div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-2xl font-bold text-muted-foreground">
                                                  {(comparison.p50 ?? 0).toFixed(0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Industry Median</div>
                                              </div>
                                              <div className="text-center">
                                                <div className={`text-2xl font-bold ${
                                                  (comparison.gap ?? 0) > 0 
                                                    ? 'text-red-600 dark:text-red-400' 
                                                    : 'text-green-600 dark:text-green-400'
                                                }`}>
                                                  {comparison.gap != null ? (comparison.gap > 0 ? '+' : '') + comparison.gap.toFixed(1) : '0'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Gap to Median</div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-2xl font-bold text-brand-teal">
                                                  P{comparison.percentileRank}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Percentile</div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="p-3 bg-muted/30 rounded-lg">
                                            <div className="flex items-start gap-2">
                                              <Info className="h-4 w-4 text-brand-teal mt-0.5 flex-shrink-0" />
                                              <div className="text-sm text-muted-foreground">
                                                <span className="font-medium text-foreground">How this is calculated: </span>
                                                Your score is derived from responses to questions in this dimension, 
                                                compared against Constancia's benchmark database of UK enterprise implementations. 
                                                A percentile of P{comparison.percentileRank} means you outperform {comparison.percentileRank}% of organisations 
                                                in this dimension.
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {comparison.recommendation && (
                                            <div className="p-3 border-l-4 border-brand-berry bg-brand-berry/5 rounded-r-lg">
                                              <div className="flex items-start gap-2">
                                                <Lightbulb className="h-4 w-4 text-brand-teal mt-0.5 flex-shrink-0" />
                                                <div className="text-sm text-foreground">
                                                  <span className="font-medium">Constancia Recommendation: </span>
                                                  {comparison.recommendation}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          </CardContent>
                        </Card>

                        {benchmarkData.data.priorities && benchmarkData.data.priorities.length > 0 && (
                          <Card data-testid="card-priority-recommendations">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-brand-teal" />
                                Priority Recommendations
                              </CardTitle>
                              <CardDescription>
                                Actionable improvement areas ranked by gap severity with detailed action plans
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <Accordion type="multiple" className="space-y-3">
                                {benchmarkData.data.priorities.map((priority, index) => (
                                  <AccordionItem 
                                    key={priority.dimension}
                                    value={priority.dimension}
                                    className="border rounded-lg overflow-hidden"
                                    data-testid={`accordion-priority-${index}`}
                                  >
                                    <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
                                      <div className="flex items-center gap-3 w-full">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center text-white font-bold text-sm">
                                          {priority.priority}
                                        </div>
                                        <div className="flex-1 text-left">
                                          <div className="font-medium text-foreground">
                                            {priority.dimensionLabel || priority.dimension.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                            <span>Gap: <span className="font-medium text-red-600 dark:text-red-400">{(priority.gap ?? 0).toFixed(1)} points</span></span>
                                            {priority.timeframe && (
                                              <Badge variant="outline" className="text-xs">
                                                {priority.timeframe}
                                              </Badge>
                                            )}
                                            {priority.investmentLevel && (
                                              <Badge 
                                                variant="secondary" 
                                                className={`text-xs ${
                                                  priority.investmentLevel === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                  priority.investmentLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                }`}
                                              >
                                                {priority.investmentLevel} Investment
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                      <div className="space-y-4 ml-11">
                                        {priority.workshopRecommendation && (
                                          <div className="p-3 bg-gradient-to-r from-brand-ink/5 to-brand-berry/5 rounded-lg border border-brand-berry/20">
                                            <div className="flex items-center gap-2 text-brand-teal font-medium text-sm">
                                              <Lightbulb className="h-4 w-4" />
                                              Recommended: {priority.workshopRecommendation}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {priority.keyActions && priority.keyActions.length > 0 && (
                                          <div>
                                            <h5 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
                                              <CheckCircle2 className="h-4 w-4 text-brand-teal" />
                                              Key Actions
                                            </h5>
                                            <ul className="space-y-1.5">
                                              {priority.keyActions.map((action, actionIdx) => (
                                                <li key={actionIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                  <span className="text-brand-teal mt-1">•</span>
                                                  {action}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {priority.expectedOutcomes && priority.expectedOutcomes.length > 0 && (
                                          <div>
                                            <h5 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
                                              <TrendingUp className="h-4 w-4 text-green-600" />
                                              Expected Outcomes
                                            </h5>
                                            <ul className="space-y-1.5">
                                              {priority.expectedOutcomes.map((outcome, outcomeIdx) => (
                                                <li key={outcomeIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                  <span className="text-green-600 mt-1">✓</span>
                                                  {outcome}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {priority.quickWins && priority.quickWins.length > 0 && (
                                          <div>
                                            <h5 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
                                              <Zap className="h-4 w-4 text-yellow-600" />
                                              Quick Wins
                                            </h5>
                                            <div className="flex flex-wrap gap-2">
                                              {priority.quickWins.map((win, winIdx) => (
                                                <Badge key={winIdx} variant="outline" className="text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                                                  {win}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {priority.riskIfIgnored && (
                                          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                            <div className="flex items-start gap-2">
                                              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                              <div>
                                                <span className="font-medium text-sm text-red-700 dark:text-red-400">Risk if Ignored: </span>
                                                <span className="text-sm text-red-600 dark:text-red-300">{priority.riskIfIgnored}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <Card className="p-8 text-center" data-testid="benchmark-empty-state">
                        <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground">
                          Benchmark comparison will be available after analysis is complete.
                        </p>
                      </Card>
                    )
                  ) : (
                    <Card className="p-8 text-center" data-testid="benchmark-upgrade-prompt">
                      <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                      <h3 className="font-semibold text-foreground mb-2">Upgrade to Full Assessment</h3>
                      <p className="text-muted-foreground mb-4">
                        Industry benchmark comparisons are available with our Full Assessment tier.
                      </p>
                    </Card>
                  )}
                </TabsContent>

                {safeAssessment.tier === "full" && (
                  <TabsContent value="benefits" className="space-y-6">
                    {/* ROI Summary Section */}
                    {roiLoading ? (
                      <Card className="shadow-lg" data-testid="skeleton-roi-summary">
                        <CardHeader>
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-4 w-72 mt-2" />
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                            <Skeleton className="h-20 sm:h-24" />
                            <Skeleton className="h-20 sm:h-24" />
                            <Skeleton className="h-20 sm:h-24" />
                            <Skeleton className="h-20 sm:h-24" />
                          </div>
                        </CardContent>
                      </Card>
                    ) : roiData?.success && roiData.data?.metrics ? (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Card className="shadow-lg border-brand-berry/20" data-testid="card-roi-summary">
                          <CardHeader>
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                                  <Calculator className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <CardTitle className="flex items-center gap-2">
                                    ROI Analysis Summary
                                  </CardTitle>
                                  <CardDescription>
                                    Financial returns based on your transformation profile
                                  </CardDescription>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNavigateToROI}
                                data-testid="button-edit-roi"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit ROI Profile
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="px-3 sm:px-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                              {/* ROI Percentage */}
                              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-1.5 sm:gap-2 text-green-600 dark:text-green-400 text-xs sm:text-sm mb-0.5 sm:mb-1">
                                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="truncate">ROI</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300" data-testid="text-roi-percent">
                                  {roiData.data.metrics.roiPercent.toFixed(0)}%
                                </div>
                                <div className="text-[10px] sm:text-xs text-green-600/70 dark:text-green-400/70 mt-0.5 sm:mt-1">
                                  Return on Investment
                                </div>
                              </div>
                              
                              {/* Payback Period */}
                              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-brand-mint/10 to-brand-mint/10 dark:from-brand-ink/20 dark:to-brand-ink/20 border border-brand-ink">
                                <div className="flex items-center gap-1.5 sm:gap-2 text-brand-berry dark:text-brand-mint text-xs sm:text-sm mb-0.5 sm:mb-1">
                                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="truncate">Payback</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-brand-berry dark:text-brand-mint" data-testid="text-payback">
                                  {roiData.data.metrics.paybackMonths.toFixed(1)} mo
                                </div>
                                <div className="text-[10px] sm:text-xs text-brand-berry/70 dark:text-brand-mint/70 mt-0.5 sm:mt-1">
                                  Time to Value
                                </div>
                              </div>
                              
                              {/* NPV */}
                              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-1.5 sm:gap-2 text-purple-600 dark:text-purple-400 text-xs sm:text-sm mb-0.5 sm:mb-1">
                                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="truncate">NPV</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300" data-testid="text-npv">
                                  £{(roiData.data.metrics.npvValue / 1000000).toFixed(2)}M
                                </div>
                                <div className="text-[10px] sm:text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5 sm:mt-1">
                                  Net Present Value
                                </div>
                              </div>
                              
                              {/* BCR */}
                              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-1.5 sm:gap-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm mb-0.5 sm:mb-1">
                                  <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span className="truncate">BCR</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300" data-testid="text-bcr">
                                  {roiData.data.metrics.benefitCostRatio.toFixed(2)}x
                                </div>
                                <div className="text-[10px] sm:text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5 sm:mt-1">
                                  Benefit-Cost Ratio
                                </div>
                              </div>
                            </div>
                            
                            {/* Financial Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                              {/* Investment Details */}
                              <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border">
                                <h5 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal flex-shrink-0" />
                                  Investment Overview
                                </h5>
                                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Implementation</span>
                                    <span className="font-medium">£{(roiData.data.metrics.totalImplementationCost / 1000000).toFixed(2)}M</span>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Annual Costs</span>
                                    <span className="font-medium">£{(roiData.data.metrics.totalAnnualCosts / 1000000).toFixed(2)}M</span>
                                  </div>
                                  <div className="flex justify-between gap-2 pt-1.5 sm:pt-2 border-t">
                                    <span className="text-muted-foreground">TCO ({roiData.data.profile?.horizonYears || 3}yr)</span>
                                    <span className="font-semibold">£{(roiData.data.metrics.totalCostOfOwnership / 1000000).toFixed(2)}M</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Benefits Details */}
                              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-900/10 dark:to-green-800/10 border border-green-200/50 dark:border-green-800/30">
                                <h5 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  Annual Benefits
                                </h5>
                                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Total Benefits</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      £{(roiData.data.metrics.totalAnnualBenefits / 1000000).toFixed(2)}M
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Net Value</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      £{((roiData.data.metrics.totalAnnualBenefits - roiData.data.metrics.totalAnnualCosts) / 1000000).toFixed(2)}M
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2 pt-1.5 sm:pt-2 border-t border-green-200/50 dark:border-green-800/30">
                                    <span className="text-muted-foreground">Baseline Cost</span>
                                    <span className="font-semibold">£{((roiData.data.profile?.baselineOperatingCost || 0) / 1000000).toFixed(2)}M</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                      
                        {/* ROI Visual Analytics */}
                        {roiData.data.profile && roiData.data.metrics && (
                          <ROIAnalyticsCharts
                            yearByYearData={calculateYearByYearAnalysis(roiData.data.profile).rows}
                            totalImplementationCost={roiData.data.metrics.totalImplementationCost}
                            totalAnnualBenefits={roiData.data.metrics.totalAnnualBenefits}
                            totalAnnualCosts={roiData.data.metrics.totalAnnualCosts}
                            paybackMonths={roiData.data.metrics.paybackMonths}
                            horizonYears={roiData.data.profile.horizonYears || 3}
                            processEfficiencyPercent={roiData.data.profile.processEfficiencyPercent || 0}
                            baselineOperatingCost={roiData.data.profile.baselineOperatingCost || 0}
                            currency={roiData.data.profile.currency || "£"}
                          />
                        )}
                      </>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Card className="shadow-lg border-dashed border-2" data-testid="card-roi-empty">
                          <CardContent className="py-8 text-center">
                            <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                            <h3 className="font-semibold text-foreground mb-2">Calculate Your ROI</h3>
                            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                              Complete the ROI calculator to see detailed financial projections for your finance transformation.
                            </p>
                            <Button
                              onClick={handleNavigateToROI}
                              className="bg-brand-berry"
                              data-testid="button-start-roi"
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              Start ROI Calculator
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                    
                    <BenefitsTrackingDashboard 
                      overallScore={score}
                      dimensionScores={safeAssessment.dimensionScores!}
                      implementationTimeline={data?.data?.implementationTimeline}
                    />
                    
                    {/* Workshop Schedule Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <Card className="shadow-lg" data-testid="card-workshop-schedule">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center">
                              <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                Your Transformation Workshop Roadmap
                              </CardTitle>
                              <CardDescription>
                                Recommended workshops based on your assessment results
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {workshopLoading ? (
                            <div className="space-y-4" data-testid="skeleton-workshop-loading">
                              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                <Skeleton className="h-16 sm:h-20" />
                                <Skeleton className="h-16 sm:h-20" />
                                <Skeleton className="h-16 sm:h-20" />
                              </div>
                              <Skeleton className="h-12 sm:h-16" />
                              <Skeleton className="h-24 sm:h-32" />
                            </div>
                          ) : workshopData?.success && workshopData.data ? (
                            <div className="space-y-4 sm:space-y-6">
                              {/* Summary Stats */}
                              <div className="grid grid-cols-3 gap-2 sm:gap-4" data-testid="workshop-summary-stats">
                                <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-muted/30 rounded-lg">
                                  <div className="flex items-center gap-1 sm:gap-2 text-lg sm:text-2xl font-bold text-foreground">
                                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-brand-teal flex-shrink-0" />
                                    {workshopData.data.summary.totalWorkshops}
                                  </div>
                                  <div className="text-[10px] sm:text-sm text-muted-foreground text-center">
                                    Workshops
                                  </div>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-muted/30 rounded-lg">
                                  <div className="flex items-center gap-1 sm:gap-2 text-lg sm:text-2xl font-bold text-foreground">
                                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-brand-teal flex-shrink-0" />
                                    {workshopData.data.summary.totalHours}h
                                  </div>
                                  <div className="text-[10px] sm:text-sm text-muted-foreground text-center">
                                    Hours
                                  </div>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-muted/30 rounded-lg">
                                  <div className="flex items-center gap-1 sm:gap-2 text-lg sm:text-2xl font-bold text-foreground">
                                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-brand-teal flex-shrink-0" />
                                    {workshopData.data.summary.durationWeeks}
                                  </div>
                                  <div className="text-[10px] sm:text-sm text-muted-foreground text-center">
                                    Weeks
                                  </div>
                                </div>
                              </div>

                              {/* Insight Text */}
                              {workshopData.data.insight && (
                                <div className="p-4 bg-gradient-to-r from-brand-ink/5 to-brand-berry/5 rounded-lg border border-brand-berry/20" data-testid="workshop-insight">
                                  <p className="text-sm text-muted-foreground italic">
                                    {workshopData.data.insight}
                                  </p>
                                </div>
                              )}

                              {/* Finance Cost Benchmark Section */}
                              {workshopData.data.financeCostBenchmark && (
                                <div className="p-3 sm:p-5 rounded-lg border bg-card" data-testid="finance-cost-benchmark-section">
                                  <h4 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                                    <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal flex-shrink-0" />
                                    <span className="sm:hidden">Finance Cost vs Peers</span>
                                    <span className="hidden sm:inline">Your Finance Function Cost vs Industry Peers</span>
                                  </h4>
                                  <div className="space-y-3 sm:space-y-4">
                                    {/* Cost Comparison Visual */}
                                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                      <div className="p-2 sm:p-4 rounded-lg bg-muted/30 text-center">
                                        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">Your Cost</div>
                                        <div className="text-lg sm:text-2xl font-bold text-foreground">
                                          {workshopData.data.financeCostBenchmark.companyFinanceCostPct !== null 
                                            ? `${workshopData.data.financeCostBenchmark.companyFinanceCostPct.toFixed(1)}%` 
                                            : 'N/A'}
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-muted-foreground">of revenue</div>
                                      </div>
                                      <div className="p-2 sm:p-4 rounded-lg bg-muted/30 text-center">
                                        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">Median</div>
                                        <div className="text-lg sm:text-2xl font-bold text-brand-teal">
                                          {workshopData.data.financeCostBenchmark.industryMedianPct.toFixed(1)}%
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-muted-foreground">of revenue</div>
                                      </div>
                                      <div className="p-2 sm:p-4 rounded-lg bg-muted/30 text-center">
                                        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">Top 25%</div>
                                        <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                                          {workshopData.data.financeCostBenchmark.topQuartilePct.toFixed(1)}%
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-muted-foreground">of revenue</div>
                                      </div>
                                    </div>

                                    {/* Progress Bar Visualization */}
                                    {workshopData.data.financeCostBenchmark.companyFinanceCostPct !== null && (
                                      <div className="space-y-2">
                                        <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                                          {/* Top quartile marker */}
                                          <div 
                                            className="absolute h-full w-0.5 bg-green-500 z-10"
                                            style={{ left: `${Math.min((workshopData.data.financeCostBenchmark.topQuartilePct / 5) * 100, 100)}%` }}
                                          />
                                          {/* Industry median marker */}
                                          <div 
                                            className="absolute h-full w-0.5 bg-brand-berry z-10"
                                            style={{ left: `${Math.min((workshopData.data.financeCostBenchmark.industryMedianPct / 5) * 100, 100)}%` }}
                                          />
                                          {/* Your position */}
                                          <div 
                                            className={`h-full rounded-full transition-all ${
                                              workshopData.data.financeCostBenchmark.performanceVsMedian === 'below' 
                                                ? 'bg-green-500' 
                                                : workshopData.data.financeCostBenchmark.performanceVsMedian === 'at'
                                                  ? 'bg-brand-berry'
                                                  : 'bg-amber-500'
                                            }`}
                                            style={{ width: `${Math.min((workshopData.data.financeCostBenchmark.companyFinanceCostPct / 5) * 100, 100)}%` }}
                                          />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>0%</span>
                                          <span>5% of revenue</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Performance Badge */}
                                    <div className="flex flex-wrap items-center gap-3">
                                      <Badge 
                                        variant="outline" 
                                        className={`border-0 ${
                                          workshopData.data.financeCostBenchmark.performanceVsMedian === 'below'
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : workshopData.data.financeCostBenchmark.performanceVsMedian === 'at'
                                              ? 'bg-brand-berry/10 text-brand-teal'
                                              : workshopData.data.financeCostBenchmark.performanceVsMedian === 'above'
                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                        data-testid="benchmark-performance-badge"
                                      >
                                        {workshopData.data.financeCostBenchmark.performanceVsMedian === 'below' && 'Below Median - Well Positioned'}
                                        {workshopData.data.financeCostBenchmark.performanceVsMedian === 'at' && 'At Industry Median'}
                                        {workshopData.data.financeCostBenchmark.performanceVsMedian === 'above' && 'Above Median - Optimisation Opportunity'}
                                        {workshopData.data.financeCostBenchmark.performanceVsMedian === 'unknown' && 'Benchmark Data Unavailable'}
                                      </Badge>
                                      {workshopData.data.financeCostBenchmark.gapToTopQuartile !== null && workshopData.data.financeCostBenchmark.gapToTopQuartile > 0 && (
                                        <span className="text-sm text-muted-foreground">
                                          {workshopData.data.financeCostBenchmark.gapToTopQuartile.toFixed(1)} pts gap to top quartile
                                        </span>
                                      )}
                                    </div>

                                    {/* Potential Savings */}
                                    {workshopData.data.financeCostBenchmark.potentialSavingsRange && (
                                      <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20" data-testid="potential-savings">
                                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                          <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">Potential Annual Savings</span>
                                        </div>
                                        <div className="text-base sm:text-xl font-bold text-green-700 dark:text-green-400">
                                          {workshopData.data.financeCostBenchmark.potentialSavingsRange.currency}
                                          {workshopData.data.financeCostBenchmark.potentialSavingsRange.min.toLocaleString()} - {workshopData.data.financeCostBenchmark.potentialSavingsRange.currency}
                                          {workshopData.data.financeCostBenchmark.potentialSavingsRange.max.toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Remediation Workshops */}
                              {workshopData.data.remediationWorkshops && workshopData.data.remediationWorkshops.length > 0 && (
                                <div className="space-y-3 sm:space-y-4" data-testid="remediation-workshops">
                                  <h4 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
                                    <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                                    Remediation Workshops
                                    <Badge variant="outline" className="ml-1 sm:ml-2 text-xs">{workshopData.data.remediationWorkshops.length}</Badge>
                                  </h4>
                                  <div className="space-y-2 sm:space-y-3">
                                    {workshopData.data.remediationWorkshops.map((workshop, index) => (
                                      <div 
                                        key={workshop.workshopId || index}
                                        className="p-3 sm:p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
                                        data-testid={`workshop-remediation-${index}`}
                                      >
                                        <div className="flex items-start justify-between gap-2 sm:gap-4 flex-wrap">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 text-[10px] sm:text-xs">
                                                Week {workshop.weekNumber}
                                              </Badge>
                                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                                {workshop.durationHours}h
                                              </Badge>
                                              {workshop.participantCount && (
                                                <Badge variant="outline" className="text-[10px] sm:text-xs bg-background">
                                                  <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                                  {workshop.participantCount}
                                                </Badge>
                                              )}
                                            </div>
                                            <h5 className="font-medium text-foreground">{workshop.workshopName}</h5>
                                            {workshop.triggerInfo && (
                                              <p className="text-sm text-muted-foreground mt-1">
                                                {workshop.triggerInfo.reasoning}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {workshop.objectives && workshop.objectives.length > 0 && (
                                          <div className="mt-3">
                                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Objectives</p>
                                            <ul className="space-y-1 pl-4">
                                              {workshop.objectives.map((obj, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                  <span className="text-amber-500 mt-0.5">•</span>
                                                  {obj}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {workshop.deliverables && workshop.deliverables.length > 0 && (
                                          <div className="mt-3">
                                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Key Outputs</p>
                                            <ul className="space-y-1 pl-4">
                                              {workshop.deliverables.map((del, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                  <span className="text-amber-500 mt-0.5">•</span>
                                                  {del}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {workshop.keyActivities && workshop.keyActivities.length > 0 && (
                                          <div className="mt-3">
                                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Key Activities</p>
                                            <ul className="space-y-1 pl-4">
                                              {workshop.keyActivities.slice(0, 4).map((act, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                  <span className="text-amber-500 mt-0.5">•</span>
                                                  {act}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Confirmation Workshops */}
                              {workshopData.data.confirmationWorkshops && workshopData.data.confirmationWorkshops.length > 0 && (
                                <div className="space-y-4" data-testid="confirmation-workshops">
                                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    Confirmation Workshops
                                    <Badge variant="outline" className="ml-2">{workshopData.data.confirmationWorkshops.length}</Badge>
                                  </h4>
                                  <div className="space-y-3">
                                    {workshopData.data.confirmationWorkshops.map((workshop, index) => (
                                      <div 
                                        key={workshop.workshopId || index}
                                        className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                                        data-testid={`workshop-confirmation-${index}`}
                                      >
                                        <div className="flex items-start justify-between gap-4 flex-wrap">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0">
                                                Week {workshop.weekNumber}
                                              </Badge>
                                              <Badge variant="outline" className="text-xs">
                                                {workshop.durationHours}h
                                              </Badge>
                                              {workshop.participantCount && (
                                                <Badge variant="outline" className="text-xs bg-background">
                                                  <Users className="h-3 w-3 mr-1" />
                                                  {workshop.participantCount}
                                                </Badge>
                                              )}
                                            </div>
                                            <h5 className="font-medium text-foreground">{workshop.workshopName}</h5>
                                            {workshop.triggerInfo && (
                                              <p className="text-sm text-muted-foreground mt-1">
                                                {workshop.triggerInfo.reasoning}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {workshop.objectives && workshop.objectives.length > 0 && (
                                          <div className="mt-3">
                                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Objectives</p>
                                            <ul className="space-y-1 pl-4">
                                              {workshop.objectives.map((obj, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                  <span className="text-green-500 mt-0.5">•</span>
                                                  {obj}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {workshop.deliverables && workshop.deliverables.length > 0 && (
                                          <div className="mt-3">
                                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Key Outputs</p>
                                            <ul className="space-y-1 pl-4">
                                              {workshop.deliverables.map((del, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                  <span className="text-green-500 mt-0.5">•</span>
                                                  {del}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {workshop.keyActivities && workshop.keyActivities.length > 0 && (
                                          <div className="mt-3">
                                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Key Activities</p>
                                            <ul className="space-y-1 pl-4">
                                              {workshop.keyActivities.slice(0, 4).map((act, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                  <span className="text-green-500 mt-0.5">•</span>
                                                  {act}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground" data-testid="workshop-empty-state">
                              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
                              <p>Workshop schedule will be available after analysis is complete.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>
                )}

                {["pre_assessment", "full"].includes(safeAssessment.tier) && (
                  <TabsContent value="ai-report" className="space-y-6" data-testid="tab-content-ai-report">
                    {
                    narrativesLoading ? (
                      <div className="space-y-6" data-testid="skeleton-ai-report-loading">
                        <Card>
                          <CardHeader>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-96 mt-2" />
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Skeleton className="h-20" />
                            <Skeleton className="h-20" />
                            <Skeleton className="h-20" />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <Skeleton className="h-6 w-56" />
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Skeleton className="h-32" />
                            <Skeleton className="h-32" />
                          </CardContent>
                        </Card>
                        <div className="grid md:grid-cols-2 gap-6">
                          <Skeleton className="h-64" />
                          <Skeleton className="h-64" />
                        </div>
                      </div>
                    ) : narrativesData?.processing || isRegenerating ? (
                      <Card className="p-8 text-center" data-testid="ai-report-regenerating-state">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="w-16 h-16 mx-auto mb-6 relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-ink to-brand-berry opacity-20 animate-pulse" />
                            <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                              <Loader2 className="h-8 w-8 text-brand-teal animate-spin" />
                            </div>
                          </div>
                          <h3 className="font-semibold text-foreground mb-2 text-lg">
                            AI Report is Being Generated
                          </h3>
                          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            {narrativesData?.message || "Your AI-powered insights are being regenerated. This typically takes 1-2 minutes."}
                          </p>
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>This page will update automatically when ready</span>
                          </div>
                        </motion.div>
                      </Card>
                    ) : narrativesError || !narrativesData?.success ? (
                      <Card className="p-8 text-center" data-testid="ai-report-error-state">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="font-semibold text-foreground mb-2">Unable to Load AI Report</h3>
                        <p className="text-muted-foreground">
                          There was an issue generating the AI narrative report. Please try again later.
                        </p>
                      </Card>
                    ) : narrativesData?.data ? (
                      <div className="space-y-4 sm:space-y-6">
                        {/* Header with regenerate option */}
                        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
                          <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-foreground">AI-Powered Insights</h2>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {narrativesData.data.cachedAt 
                                ? `Generated ${new Date(narrativesData.data.cachedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                : 'Freshly generated insights'
                              }
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerateNarratives}
                            disabled={regenerateMutation.isPending || isRegenerating}
                            data-testid="button-regenerate-ai-report"
                            className="gap-1.5 sm:gap-2 text-xs sm:text-sm"
                          >
                            {(regenerateMutation.isPending || isRegenerating) ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                <span className="hidden sm:inline">Regenerating...</span>
                                <span className="sm:hidden">Loading</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Regenerate Report</span>
                                <span className="sm:hidden">Refresh</span>
                              </>
                            )}
                          </Button>
                        </div>

                        <Card data-testid="card-executive-brief">
                          <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-base sm:text-lg">Executive Brief</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                  AI-generated strategic summary
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
                            <div className="p-3 sm:p-4 bg-gradient-to-r from-brand-ink/5 to-brand-berry/5 rounded-lg border border-brand-berry/20">
                              <p className="text-sm sm:text-lg font-medium text-foreground" data-testid="text-executive-headline">
                                {narrativesData.data.executiveBrief.headline}
                              </p>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Target className="h-4 w-4 text-brand-teal" />
                                Situation Analysis
                              </h4>
                              <p className="text-muted-foreground" data-testid="text-situation-analysis">
                                {narrativesData.data.executiveBrief.situationAnalysis}
                              </p>
                            </div>

                            <div>
                              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-brand-teal" />
                                Key Findings
                              </h4>
                              <ul className="space-y-2 pl-6" data-testid="list-key-findings">
                                {narrativesData.data.executiveBrief.keyFindings.map((finding, index) => (
                                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-berry mt-2 flex-shrink-0" />
                                    {finding}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-brand-teal" />
                                Top Recommendations
                              </h4>
                              <ul className="space-y-2 pl-6" data-testid="list-recommendations">
                                {narrativesData.data.executiveBrief.topRecommendations.map((rec, index) => (
                                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">{index + 1}</Badge>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                              <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <h5 className="font-medium text-green-800 dark:text-green-300 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  Value Proposition
                                </h5>
                                <p className="text-xs sm:text-sm text-green-700 dark:text-green-400" data-testid="text-value-proposition">
                                  {narrativesData.data.executiveBrief.valueProposition}
                                </p>
                              </div>
                              <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <h5 className="font-medium text-amber-800 dark:text-amber-300 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                  Risk Highlight
                                </h5>
                                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400" data-testid="text-risk-highlight">
                                  {narrativesData.data.executiveBrief.riskHighlight}
                                </p>
                              </div>
                            </div>

                            <div className="p-3 sm:p-4 bg-brand-navy/5 dark:bg-brand-navy/20 rounded-lg border border-brand-ink/20">
                              <h5 className="font-medium text-brand-cyan mb-1.5 sm:mb-2 text-sm sm:text-base">Call to Action</h5>
                              <p className="text-sm sm:text-base text-foreground" data-testid="text-call-to-action">
                                {narrativesData.data.executiveBrief.callToAction}
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card data-testid="card-implementation-roadmap">
                          <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                                <Map className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-base sm:text-lg">Implementation Roadmap</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                  {narrativesData.data.implementationRoadmap.totalDuration} programme
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
                            <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-roadmap-summary">
                              {narrativesData.data.implementationRoadmap.summary}
                            </p>

                            <Accordion type="single" collapsible className="w-full" data-testid="accordion-phases">
                              {narrativesData.data.implementationRoadmap.phases.map((phase) => (
                                <AccordionItem key={phase.phase} value={`phase-${phase.phase}`} data-testid={`accordion-item-phase-${phase.phase}`}>
                                  <AccordionTrigger className="hover:no-underline py-2 sm:py-4">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">
                                        {phase.phase}
                                      </div>
                                      <div className="text-left">
                                        <div className="font-semibold text-sm sm:text-base">{phase.name}</div>
                                        <div className="text-xs sm:text-sm text-muted-foreground">{phase.duration}</div>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="pl-8 sm:pl-11 space-y-3 sm:space-y-4">
                                      <div>
                                        <h5 className="font-medium text-foreground mb-2">Objectives</h5>
                                        <ul className="space-y-1 pl-4">
                                          {(phase.objectives || []).map((obj, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                              <Target className="h-3 w-3 mt-1 text-brand-teal flex-shrink-0" />
                                              {obj}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <h5 className="font-medium text-foreground mb-2">Deliverables</h5>
                                        <ul className="space-y-1 pl-4">
                                          {(phase.deliverables || []).map((del, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                              <CheckCircle2 className="h-3 w-3 mt-1 text-green-600 flex-shrink-0" />
                                              {del}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <h5 className="font-medium text-foreground mb-2">Key Milestones</h5>
                                        <ul className="space-y-1 pl-4">
                                          {(phase.keyMilestones || []).map((ms, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                              <Calendar className="h-3 w-3 mt-1 text-brand-teal flex-shrink-0" />
                                              {ms}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                                        <div className="text-sm">
                                          <span className="font-medium text-foreground">Resources: </span>
                                          <span className="text-muted-foreground">{phase.resources}</span>
                                        </div>
                                        <div className="text-sm">
                                          <span className="font-medium text-foreground">Risk Mitigation: </span>
                                          <span className="text-muted-foreground">{phase.riskMitigation}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                              <div className="p-3 sm:p-4 bg-muted/30 rounded-lg">
                                <h5 className="font-medium text-foreground mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal flex-shrink-0" />
                                  <span className="sm:hidden">Quick Wins</span>
                                  <span className="hidden sm:inline">Quick Wins (First 90 Days)</span>
                                </h5>
                                <ul className="space-y-1 pl-3 sm:pl-4">
                                  {(narrativesData.data.implementationRoadmap.quickWins || []).map((win, i) => (
                                    <li key={i} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                                      <span className="text-green-600">•</span>
                                      {win}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-3 sm:p-4 bg-muted/30 rounded-lg">
                                <h5 className="font-medium text-foreground mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                                  <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal flex-shrink-0" />
                                  <span className="sm:hidden">Success Factors</span>
                                  <span className="hidden sm:inline">Critical Success Factors</span>
                                </h5>
                                <ul className="space-y-1 pl-3 sm:pl-4">
                                  {(narrativesData.data.implementationRoadmap.successFactors || []).map((factor, i) => (
                                    <li key={i} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                                      <span className="text-brand-teal">•</span>
                                      {factor}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div>
                          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-brand-teal" />
                            Stakeholder Insights
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" data-testid="stakeholder-insights-grid">
                            {/* CFO Brief */}
                            <Card data-testid="card-stakeholder-cfo">
                              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base sm:text-lg">{narrativesData.data.stakeholderNarratives.cfo.title}</CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">Strategic CFO perspective</CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                                {/* Headline */}
                                {narrativesData.data.stakeholderNarratives.cfo.headline && (
                                  <p className="font-medium text-foreground text-sm border-l-4 border-brand-berry pl-3" data-testid="text-cfo-headline">
                                    {narrativesData.data.stakeholderNarratives.cfo.headline}
                                  </p>
                                )}
                                
                                {/* Situation Overview */}
                                <p className="text-sm text-muted-foreground" data-testid="text-cfo-narrative">
                                  {narrativesData.data.stakeholderNarratives.cfo.situationOverview || narrativesData.data.stakeholderNarratives.cfo.narrative}
                                </p>

                                {/* Key Insights */}
                                {narrativesData.data.stakeholderNarratives.cfo.keyInsights && narrativesData.data.stakeholderNarratives.cfo.keyInsights.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-foreground text-sm mb-2 flex items-center gap-1">
                                      <Lightbulb className="h-4 w-4 text-brand-teal" />
                                      Key Insights
                                    </h5>
                                    <div className="space-y-2">
                                      {narrativesData.data.stakeholderNarratives.cfo.keyInsights.slice(0, 3).map((insight, i) => (
                                        <div key={i} className="p-2 bg-muted/30 rounded-md">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-foreground">{insight.title}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                              insight.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                              insight.impact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                              {insight.impact}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground">{insight.description}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Priority Actions */}
                                {narrativesData.data.stakeholderNarratives.cfo.priorityActions && narrativesData.data.stakeholderNarratives.cfo.priorityActions.length > 0 ? (
                                  <div>
                                    <h5 className="font-medium text-foreground text-sm mb-2">Priority Actions</h5>
                                    <div className="space-y-2">
                                      {narrativesData.data.stakeholderNarratives.cfo.priorityActions.slice(0, 3).map((action, i) => (
                                        <div key={i} className="p-2 bg-muted/20 rounded-md text-xs">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-1.5 py-0.5 rounded text-white ${
                                              action.priority === 'immediate' ? 'bg-red-500' :
                                              action.priority === 'short-term' ? 'bg-amber-500' : 'bg-brand-mint'
                                            }`}>
                                              {action.priority === 'immediate' ? 'Immediate' : action.priority === 'short-term' ? 'Short-term' : 'Medium-term'}
                                            </span>
                                            <span className="text-muted-foreground">{action.timeframe}</span>
                                          </div>
                                          <p className="text-foreground">{action.action}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : narrativesData.data.stakeholderNarratives.cfo.actionItems && narrativesData.data.stakeholderNarratives.cfo.actionItems.length > 0 ? (
                                  <div>
                                    <h5 className="font-medium text-foreground text-sm mb-2">Key Actions</h5>
                                    <ul className="space-y-1 pl-4">
                                      {narrativesData.data.stakeholderNarratives.cfo.actionItems.slice(0, 3).map((action, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                          <ArrowRight className="h-3 w-3 mt-0.5 text-brand-teal flex-shrink-0" />
                                          {action}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}

                                {/* Call to Action */}
                                {narrativesData.data.stakeholderNarratives.cfo.callToAction && (
                                  <div className="p-3 bg-gradient-to-r from-brand-ink/10 to-brand-berry/10 rounded-lg border border-brand-berry/20">
                                    <p className="text-xs font-medium text-brand-teal">Next Step</p>
                                    <p className="text-sm text-foreground">{narrativesData.data.stakeholderNarratives.cfo.callToAction}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* FP&A Director Brief */}
                            <Card data-testid="card-stakeholder-fpa">
                              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base sm:text-lg">{narrativesData.data.stakeholderNarratives.fpaDirector.title}</CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">FP&A perspective</CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                                {/* Headline */}
                                {narrativesData.data.stakeholderNarratives.fpaDirector.headline && (
                                  <p className="font-medium text-foreground text-sm border-l-4 border-brand-berry pl-3" data-testid="text-fpa-headline">
                                    {narrativesData.data.stakeholderNarratives.fpaDirector.headline}
                                  </p>
                                )}
                                
                                {/* Situation Overview */}
                                <p className="text-sm text-muted-foreground" data-testid="text-fpa-narrative">
                                  {narrativesData.data.stakeholderNarratives.fpaDirector.situationOverview || narrativesData.data.stakeholderNarratives.fpaDirector.narrative}
                                </p>

                                {/* Key Insights */}
                                {narrativesData.data.stakeholderNarratives.fpaDirector.keyInsights && narrativesData.data.stakeholderNarratives.fpaDirector.keyInsights.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-foreground text-sm mb-2 flex items-center gap-1">
                                      <Lightbulb className="h-4 w-4 text-brand-teal" />
                                      Key Insights
                                    </h5>
                                    <div className="space-y-2">
                                      {narrativesData.data.stakeholderNarratives.fpaDirector.keyInsights.slice(0, 3).map((insight, i) => (
                                        <div key={i} className="p-2 bg-muted/30 rounded-md">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-foreground">{insight.title}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                              insight.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                              insight.impact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                              {insight.impact}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground">{insight.description}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Priority Actions */}
                                {narrativesData.data.stakeholderNarratives.fpaDirector.priorityActions && narrativesData.data.stakeholderNarratives.fpaDirector.priorityActions.length > 0 ? (
                                  <div>
                                    <h5 className="font-medium text-foreground text-sm mb-2">Priority Actions</h5>
                                    <div className="space-y-2">
                                      {narrativesData.data.stakeholderNarratives.fpaDirector.priorityActions.slice(0, 3).map((action, i) => (
                                        <div key={i} className="p-2 bg-muted/20 rounded-md text-xs">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-1.5 py-0.5 rounded text-white ${
                                              action.priority === 'immediate' ? 'bg-red-500' :
                                              action.priority === 'short-term' ? 'bg-amber-500' : 'bg-brand-mint'
                                            }`}>
                                              {action.priority === 'immediate' ? 'Immediate' : action.priority === 'short-term' ? 'Short-term' : 'Medium-term'}
                                            </span>
                                            <span className="text-muted-foreground">{action.timeframe}</span>
                                          </div>
                                          <p className="text-foreground">{action.action}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : narrativesData.data.stakeholderNarratives.fpaDirector.actionItems && narrativesData.data.stakeholderNarratives.fpaDirector.actionItems.length > 0 ? (
                                  <div>
                                    <h5 className="font-medium text-foreground text-sm mb-2">Key Actions</h5>
                                    <ul className="space-y-1 pl-4">
                                      {narrativesData.data.stakeholderNarratives.fpaDirector.actionItems.slice(0, 3).map((action, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                          <ArrowRight className="h-3 w-3 mt-0.5 text-brand-teal flex-shrink-0" />
                                          {action}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}

                                {/* Call to Action */}
                                {narrativesData.data.stakeholderNarratives.fpaDirector.callToAction && (
                                  <div className="p-3 bg-gradient-to-r from-brand-ink/10 to-brand-berry/10 rounded-lg border border-brand-berry/20">
                                    <p className="text-xs font-medium text-brand-teal">Next Step</p>
                                    <p className="text-sm text-foreground">{narrativesData.data.stakeholderNarratives.fpaDirector.callToAction}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* IT Director/CIO Brief */}
                            {narrativesData.data.stakeholderNarratives.itDirector && (
                              <Card data-testid="card-stakeholder-it">
                                <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                                      <Monitor className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-base sm:text-lg">{narrativesData.data.stakeholderNarratives.itDirector.title}</CardTitle>
                                      <CardDescription className="text-xs sm:text-sm">IT/CIO perspective</CardDescription>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                                  {/* Headline */}
                                  {narrativesData.data.stakeholderNarratives.itDirector.headline && (
                                    <p className="font-medium text-foreground text-sm border-l-4 border-brand-berry pl-3" data-testid="text-it-headline">
                                      {narrativesData.data.stakeholderNarratives.itDirector.headline}
                                    </p>
                                  )}
                                  
                                  {/* Situation Overview */}
                                  <p className="text-sm text-muted-foreground" data-testid="text-it-narrative">
                                    {narrativesData.data.stakeholderNarratives.itDirector.situationOverview || narrativesData.data.stakeholderNarratives.itDirector.narrative}
                                  </p>

                                  {/* Key Insights */}
                                  {narrativesData.data.stakeholderNarratives.itDirector.keyInsights && narrativesData.data.stakeholderNarratives.itDirector.keyInsights.length > 0 && (
                                    <div>
                                      <h5 className="font-medium text-foreground text-sm mb-2 flex items-center gap-1">
                                        <Lightbulb className="h-4 w-4 text-brand-teal" />
                                        Key Insights
                                      </h5>
                                      <div className="space-y-2">
                                        {narrativesData.data.stakeholderNarratives.itDirector.keyInsights.slice(0, 3).map((insight, i) => (
                                          <div key={i} className="p-2 bg-muted/30 rounded-md">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-xs font-medium text-foreground">{insight.title}</span>
                                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                insight.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                insight.impact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                              }`}>
                                                {insight.impact}
                                              </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{insight.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Priority Actions */}
                                  {narrativesData.data.stakeholderNarratives.itDirector.priorityActions && narrativesData.data.stakeholderNarratives.itDirector.priorityActions.length > 0 ? (
                                    <div>
                                      <h5 className="font-medium text-foreground text-sm mb-2">Priority Actions</h5>
                                      <div className="space-y-2">
                                        {narrativesData.data.stakeholderNarratives.itDirector.priorityActions.slice(0, 3).map((action, i) => (
                                          <div key={i} className="p-2 bg-muted/20 rounded-md text-xs">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className={`px-1.5 py-0.5 rounded text-white ${
                                                action.priority === 'immediate' ? 'bg-red-500' :
                                                action.priority === 'short-term' ? 'bg-amber-500' : 'bg-brand-mint'
                                              }`}>
                                                {action.priority === 'immediate' ? 'Immediate' : action.priority === 'short-term' ? 'Short-term' : 'Medium-term'}
                                              </span>
                                              <span className="text-muted-foreground">{action.timeframe}</span>
                                            </div>
                                            <p className="text-foreground">{action.action}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : narrativesData.data.stakeholderNarratives.itDirector.actionItems && narrativesData.data.stakeholderNarratives.itDirector.actionItems.length > 0 ? (
                                    <div>
                                      <h5 className="font-medium text-foreground text-sm mb-2">Key Actions</h5>
                                      <ul className="space-y-1 pl-4">
                                        {narrativesData.data.stakeholderNarratives.itDirector.actionItems.slice(0, 3).map((action, i) => (
                                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                            <ArrowRight className="h-3 w-3 mt-0.5 text-brand-teal flex-shrink-0" />
                                            {action}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}

                                  {/* Call to Action */}
                                  {narrativesData.data.stakeholderNarratives.itDirector.callToAction && (
                                    <div className="p-3 bg-gradient-to-r from-brand-ink/10 to-brand-berry/10 rounded-lg border border-brand-berry/20">
                                      <p className="text-xs font-medium text-brand-teal">Next Step</p>
                                      <p className="text-sm text-foreground">{narrativesData.data.stakeholderNarratives.itDirector.callToAction}</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>

                        {/* Phase 1-4 Intelligence Section */}
                        {narrativesData.data.phase14Intelligence && (
                          <div className="mt-6 space-y-4" data-testid="section-phase14-intelligence">
                            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Target className="h-5 w-5 text-brand-teal" />
                              Root Cause Analysis & Confidence Indicators
                            </h4>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                              {/* Respondent Confidence Card */}
                              <Card data-testid="card-respondent-confidence">
                                <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                                      <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-sm sm:text-base">Assessment Confidence</CardTitle>
                                      <CardDescription className="text-[10px] sm:text-xs">Data quality indicator</CardDescription>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xl sm:text-2xl font-bold text-brand-cyan">
                                      {narrativesData.data.phase14Intelligence.respondentConfidence.overall}%
                                    </span>
                                    <Badge variant="outline" className={`${
                                      narrativesData.data.phase14Intelligence.respondentConfidence.overall >= 75 
                                        ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
                                        : narrativesData.data.phase14Intelligence.respondentConfidence.overall >= 50
                                        ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
                                        : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
                                    }`}>
                                      {narrativesData.data.phase14Intelligence.respondentConfidence.confidenceLevel}
                                    </Badge>
                                  </div>
                                  <Progress 
                                    value={narrativesData.data.phase14Intelligence.respondentConfidence.overall} 
                                    className="h-2"
                                  />
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    {narrativesData.data.phase14Intelligence.respondentConfidence.respondentRole && (
                                      <div className="flex justify-between">
                                        <span>Respondent Role:</span>
                                        <span className="font-medium text-foreground capitalize">
                                          {narrativesData.data.phase14Intelligence.respondentConfidence.respondentRole.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span>Role Confidence:</span>
                                      <span className="font-medium text-foreground">
                                        {narrativesData.data.phase14Intelligence.respondentConfidence.breakdown.roleConfidence}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Seniority Multiplier:</span>
                                      <span className="font-medium text-foreground">
                                        {narrativesData.data.phase14Intelligence.respondentConfidence.breakdown.seniorityMultiplier.toFixed(2)}x
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Confidence Levels Legend */}
                              <Card data-testid="card-confidence-legend">
                                <CardHeader className="pb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center">
                                      <Info className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-base">Insight Confidence Levels</CardTitle>
                                      <CardDescription className="text-xs">How findings are classified</CardDescription>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    {Object.entries(narrativesData.data.phase14Intelligence.confidenceLevels).map(([key, level]) => (
                                      <div key={key} className="flex items-start gap-2 text-xs">
                                        <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                                          level.color === 'green' ? 'bg-green-500' :
                                          level.color === 'blue' ? 'bg-brand-mint' :
                                          level.color === 'amber' ? 'bg-amber-500' :
                                          'bg-gray-400'
                                        }`} />
                                        <div>
                                          <span className="font-medium text-foreground">{level.label}</span>
                                          <p className="text-muted-foreground">{level.description}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Root Causes */}
                            <Card data-testid="card-root-causes">
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center">
                                    <AlertTriangle className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base">Identified Root Causes</CardTitle>
                                    <CardDescription className="text-xs">Key patterns affecting transformation readiness</CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                {Array.isArray(narrativesData.data.phase14Intelligence.enhancedRootCauses) && narrativesData.data.phase14Intelligence.enhancedRootCauses.length > 0 ? (
                                  <Accordion type="single" collapsible className="w-full">
                                    {narrativesData.data.phase14Intelligence.enhancedRootCauses.map((rootCause, index) => (
                                      <AccordionItem key={index} value={`root-cause-${index}`}>
                                        <AccordionTrigger className="hover:no-underline py-3" data-testid={`accordion-root-cause-${index}`}>
                                          <div className="flex items-center gap-3 text-left flex-1">
                                            <Badge variant="outline" className={`flex-shrink-0 ${
                                              rootCause.urgencyScore >= 8 
                                                ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
                                                : rootCause.urgencyScore >= 5
                                                ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
                                                : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
                                            }`}>
                                              {rootCause.urgencyScore >= 8 ? 'Critical' : rootCause.urgencyScore >= 5 ? 'High' : 'Medium'}
                                            </Badge>
                                            <span className="font-medium text-sm">{rootCause.patternLabel}</span>
                                            <span className="text-xs text-muted-foreground ml-auto mr-2">
                                              {rootCause.confidence}% confidence
                                            </span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2">
                                          <div className="space-y-4">
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                              <div className="p-2 bg-muted/30 rounded-md">
                                                <p className="text-xs text-muted-foreground">Impact Score</p>
                                                <p className="text-sm font-medium">{(rootCause.impactScore / 10).toFixed(1)}/10</p>
                                              </div>
                                              <div className="p-2 bg-muted/30 rounded-md">
                                                <p className="text-xs text-muted-foreground">Effort to Resolve</p>
                                                <p className="text-sm font-medium capitalize">{rootCause.effortToResolve}</p>
                                              </div>
                                              <div className="p-2 bg-muted/30 rounded-md col-span-2">
                                                <p className="text-xs text-muted-foreground">Business Risk</p>
                                                <p className="text-sm">{rootCause.businessRisk}</p>
                                              </div>
                                            </div>
                                            
                                            {rootCause.affectedDimensions.length > 0 && (
                                              <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Affected Dimensions</p>
                                                <div className="flex flex-wrap gap-1">
                                                  {rootCause.affectedDimensions.map((dim, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                      {dim}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {rootCause.stakeholderImpact.length > 0 && (
                                              <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Stakeholder Impact</p>
                                                <div className="flex flex-wrap gap-1">
                                                  {rootCause.stakeholderImpact.map((stakeholder, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs capitalize">
                                                      {stakeholder.replace(/_/g, ' ')}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {rootCause.remediationPaths.length > 0 && (
                                              <div>
                                                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
                                                  <Zap className="h-3 w-3 text-brand-teal" />
                                                  Remediation Paths
                                                </p>
                                                <div className="space-y-2">
                                                  {rootCause.remediationPaths.map((path) => (
                                                    <div key={path.id} className="p-3 border rounded-md bg-muted/10">
                                                      <div className="flex items-start justify-between gap-2 mb-1">
                                                        <span className="text-sm font-medium text-foreground">{path.title}</span>
                                                        <div className="flex gap-1 flex-shrink-0">
                                                          <Badge variant="outline" className="text-xs">
                                                            {path.effort} Effort
                                                          </Badge>
                                                          <Badge variant="outline" className="text-xs">
                                                            {path.impact} Impact
                                                          </Badge>
                                                        </div>
                                                      </div>
                                                      <p className="text-xs text-muted-foreground mb-1">{path.description}</p>
                                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                          <Clock className="h-3 w-3" />
                                                          {path.timeframe}
                                                        </span>
                                                        {path.estimatedCost && (
                                                          <span className="flex items-center gap-1">
                                                            <Calculator className="h-3 w-3" />
                                                            {path.estimatedCost}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    ))}
                                  </Accordion>
                                ) : (
                                  <div className="text-center py-6 text-muted-foreground">
                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                    <p className="text-sm">No significant root causes identified.</p>
                                    <p className="text-xs mt-1">Your assessment shows strong alignment across all dimensions.</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Card className="p-8 text-center" data-testid="ai-report-empty-state">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground">
                          AI narrative report will be available after analysis is complete.
                        </p>
                      </Card>
                    )}
                  </TabsContent>
                )}
              </Tabs>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
                  className="w-full mb-4"
                  data-testid="button-toggle-detailed"
                >
                  {showDetailedAnalysis ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Detailed Breakdown
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Detailed Breakdown
                    </>
                  )}
                </Button>

                {showDetailedAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-8"
                  >
                    <Card className="shadow-lg" data-testid="card-what-scores-mean">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center">
                            <Lightbulb className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              What Your Scores Mean
                            </CardTitle>
                            <CardDescription>
                              Actionable insights for each capability dimension
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const dimensionInsights: Record<string, { 
                            medianScore: number; 
                            actionableInsight: string; 
                            businessImpact: string;
                            icon: React.ReactNode;
                          }> = {
                            consolidation_close: {
                              medianScore: 55,
                              actionableInsight: "Consider automating journal entries and intercompany eliminations to reduce close time by 2-3 days",
                              businessImpact: "Improving to 60% typically yields £50k-100k annual savings through reduced overtime and faster reporting",
                              icon: <Clock className="h-4 w-4" />,
                            },
                            transaction_processing: {
                              medianScore: 55,
                              actionableInsight: "Streamline transaction workflows and implement automated matching and reconciliation processes",
                              businessImpact: "Transaction automation typically reduces processing costs by 30-50% and improves accuracy",
                              icon: <Clock className="h-4 w-4" />,
                            },
                            financial_planning_analysis: {
                              medianScore: 52,
                              actionableInsight: "Implement driver-based planning models and rolling forecasts to improve business partnering",
                              businessImpact: "A 15% improvement in forecast accuracy can reduce inventory costs by 5-10% and improve cash flow",
                              icon: <TrendingUp className="h-4 w-4" />,
                            },
                            management_reporting: {
                              medianScore: 50,
                              actionableInsight: "Deploy self-service dashboards and automated variance commentary to reduce manual effort",
                              businessImpact: "80% reduction in report production time frees 2-3 FTE days per month for value-add analysis",
                              icon: <BarChart3 className="h-4 w-4" />,
                            },
                            data_analytics: {
                              medianScore: 48,
                              actionableInsight: "Establish master data governance and automated quality monitoring for trusted insights",
                              businessImpact: "Clean data reduces reconciliation effort by 60-80% and enables reliable decision support",
                              icon: <Target className="h-4 w-4" />,
                            },
                            financial_controls_compliance: {
                              medianScore: 58,
                              actionableInsight: "Automate segregation of duties and approval workflows to strengthen control environment",
                              businessImpact: "Reduced audit fees by 10-15% and lower compliance risk exposure",
                              icon: <Shield className="h-4 w-4" />,
                            },
                            risk_compliance: {
                              medianScore: 55,
                              actionableInsight: "Implement automated risk monitoring and compliance tracking to enhance governance posture",
                              businessImpact: "Proactive risk management reduces regulatory penalties and strengthens stakeholder confidence",
                              icon: <Shield className="h-4 w-4" />,
                            },
                            technology_systems: {
                              medianScore: 45,
                              actionableInsight: "Consolidate disparate tools onto an integrated EPM platform to reduce complexity",
                              businessImpact: "System consolidation typically delivers 20-30% reduction in technology costs",
                              icon: <Monitor className="h-4 w-4" />,
                            },
                            organisation_people: {
                              medianScore: 50,
                              actionableInsight: "Invest in capability development and business partnering skills to shift from transactional to strategic",
                              businessImpact: "20-40% shift from transactional to value-add activities improves retention and business impact",
                              icon: <Users className="h-4 w-4" />,
                            },
                            collaboration: {
                              medianScore: 48,
                              actionableInsight: "Implement collaborative planning tools and standardised cross-functional workflows to improve coordination",
                              businessImpact: "Enhanced collaboration reduces planning cycle time by 25-40% and improves forecast buy-in",
                              icon: <Users className="h-4 w-4" />,
                            },
                            ai_machine_learning: {
                              medianScore: 35,
                              actionableInsight: "Start with AI-powered forecasting or anomaly detection pilots on stable data foundations",
                              businessImpact: "AI forecasting can improve accuracy by 20-35% and enable proactive exception handling",
                              icon: <Zap className="h-4 w-4" />,
                            },
                            planning_subdomains: {
                              medianScore: 50,
                              actionableInsight: "Align planning processes across operational, financial, and strategic domains for integrated business planning",
                              businessImpact: "Integrated planning reduces cycle times by 30-50% and improves decision quality",
                              icon: <Calendar className="h-4 w-4" />,
                            },
                            budgeting: {
                              medianScore: 52,
                              actionableInsight: "Move from annual budgeting to continuous planning with driver-based models",
                              businessImpact: "Continuous budgeting improves resource allocation flexibility by 25-35%",
                              icon: <Calculator className="h-4 w-4" />,
                            },
                            forecasting: {
                              medianScore: 48,
                              actionableInsight: "Implement rolling forecasts with scenario modelling capabilities",
                              businessImpact: "Rolling forecasts improve decision agility and reduce forecast cycle time by 40-60%",
                              icon: <TrendingUp className="h-4 w-4" />,
                            },
                            strategy: {
                              medianScore: 45,
                              actionableInsight: "Link strategic planning to operational execution through integrated planning platforms",
                              businessImpact: "Strategic alignment improves goal achievement rates by 20-30%",
                              icon: <Target className="h-4 w-4" />,
                            },
                            process_efficiency: {
                              medianScore: 50,
                              actionableInsight: "Map and standardise finance processes, eliminating redundant steps and automating routine tasks",
                              businessImpact: "Process standardisation typically yields 20-35% efficiency improvements",
                              icon: <Clock className="h-4 w-4" />,
                            },
                            data_quality: {
                              medianScore: 48,
                              actionableInsight: "Implement data quality monitoring and automated cleansing workflows",
                              businessImpact: "High data quality reduces manual reconciliation by 60-80% and enables trusted analytics",
                              icon: <Target className="h-4 w-4" />,
                            },
                            automation_level: {
                              medianScore: 42,
                              actionableInsight: "Identify high-volume manual processes and implement RPA or workflow automation",
                              businessImpact: "Automation typically reduces manual effort by 40-70% for targeted processes",
                              icon: <Zap className="h-4 w-4" />,
                            },
                          };

                          const generateSmartFallback = (
                            dimension: string, 
                            score: number,
                            breakdownData?: ScoreBreakdownDimension
                          ): { 
                            medianScore: number; 
                            actionableInsight: string; 
                            businessImpact: string;
                            icon: React.ReactNode;
                          } => {
                            const dimName = dimension.replace(/_/g, ' ').toLowerCase();
                            const isLowScore = score < 40;
                            
                            // Try to generate evidence-based insight from breakdown data
                            if (breakdownData && breakdownData.questions && breakdownData.questions.length > 0) {
                              // Find low-scoring questions for specific insights
                              const lowScoringQuestions = breakdownData.questions
                                .filter(q => {
                                  const pct = q.maxPossible > 0 ? ((q.rawScore ?? q.scoreEarned ?? 0) / q.maxPossible) * 100 : 50;
                                  return pct < 60;
                                })
                                .slice(0, 2);
                              
                              if (lowScoringQuestions.length > 0) {
                                // Build insight from actual question responses
                                const questionContext = lowScoringQuestions
                                  .map(q => q.userResponseLabel)
                                  .filter(r => r && r.length > 0 && r !== 'No response')
                                  .join('; ');
                                
                                if (questionContext && questionContext.length > 10) {
                                  const evidenceBasedInsight = generateEvidenceBasedInsight(dimName, questionContext, isLowScore);
                                  if (evidenceBasedInsight) {
                                    return evidenceBasedInsight;
                                  }
                                }
                              }
                            }
                            
                            // Fall back to category-based insights if no breakdown data
                            if (dimName.includes('close') || dimName.includes('consolidat') || dimName.includes('transaction')) {
                              return {
                                medianScore: 52,
                                actionableInsight: isLowScore 
                                  ? "Prioritise process mapping and identify automation quick wins to establish a stable baseline"
                                  : "Consider advanced automation and workflow optimisation to reach best-in-class performance",
                                businessImpact: "Process improvements in this area typically yield 25-40% efficiency gains and faster reporting cycles",
                                icon: <Clock className="h-4 w-4" />,
                              };
                            }
                            if (dimName.includes('planning') || dimName.includes('forecast') || dimName.includes('budget')) {
                              return {
                                medianScore: 50,
                                actionableInsight: isLowScore
                                  ? "Focus on establishing driver-based models and reducing manual spreadsheet dependency"
                                  : "Enhance scenario modelling capabilities and rolling forecast processes",
                                businessImpact: "Planning improvements typically yield 15-30% forecast accuracy gains and faster decision cycles",
                                icon: <TrendingUp className="h-4 w-4" />,
                              };
                            }
                            if (dimName.includes('report') || dimName.includes('analytics') || dimName.includes('data')) {
                              return {
                                medianScore: 48,
                                actionableInsight: isLowScore
                                  ? "Establish data governance and quality monitoring as foundational capabilities"
                                  : "Deploy self-service analytics and automated insight generation",
                                businessImpact: "Analytics improvements enable 60-80% reduction in manual reporting effort",
                                icon: <BarChart3 className="h-4 w-4" />,
                              };
                            }
                            if (dimName.includes('control') || dimName.includes('compliance') || dimName.includes('risk') || dimName.includes('governance')) {
                              return {
                                medianScore: 55,
                                actionableInsight: isLowScore
                                  ? "Prioritise control automation and segregation of duties framework implementation"
                                  : "Enhance continuous monitoring and proactive risk identification capabilities",
                                businessImpact: "Control improvements reduce compliance risk and can lower audit fees by 10-20%",
                                icon: <Shield className="h-4 w-4" />,
                              };
                            }
                            if (dimName.includes('technology') || dimName.includes('system') || dimName.includes('platform')) {
                              return {
                                medianScore: 45,
                                actionableInsight: isLowScore
                                  ? "Assess current technology landscape and develop a consolidation roadmap"
                                  : "Tighten the integrations and use more of what the platform already does.",
                                businessImpact: "Technology optimisation typically delivers 20-35% reduction in system costs and complexity",
                                icon: <Monitor className="h-4 w-4" />,
                              };
                            }
                            if (dimName.includes('people') || dimName.includes('organisation') || dimName.includes('team') || dimName.includes('collaborat')) {
                              return {
                                medianScore: 50,
                                actionableInsight: isLowScore
                                  ? "Invest in skills development and establish clear capability frameworks"
                                  : "Focus on business partnering evolution and strategic skill enhancement",
                                businessImpact: "People development enables 20-40% shift from transactional to value-add activities",
                                icon: <Users className="h-4 w-4" />,
                              };
                            }
                            if (dimName.includes('ai') || dimName.includes('machine') || dimName.includes('automat')) {
                              return {
                                medianScore: 35,
                                actionableInsight: isLowScore
                                  ? "Build data foundations before embarking on AI initiatives"
                                  : "Pilot AI-powered forecasting or anomaly detection on stable data sets",
                                businessImpact: "AI implementation can improve accuracy by 20-35% and enable proactive exception handling",
                                icon: <Zap className="h-4 w-4" />,
                              };
                            }
                            if (dimName.includes('strateg')) {
                              return {
                                medianScore: 48,
                                actionableInsight: isLowScore
                                  ? "Establish clear linkages between strategic objectives and operational metrics"
                                  : "Enhance strategic planning integration with operational execution",
                                businessImpact: "Strategic alignment improves goal achievement rates by 20-30%",
                                icon: <Target className="h-4 w-4" />,
                              };
                            }
                            return {
                              medianScore: 50,
                              actionableInsight: isLowScore
                                ? "Focus on establishing baseline processes and identifying quick wins for improvement"
                                : "Review current processes and identify opportunities for automation and optimisation",
                              businessImpact: "Process improvements in this area typically yield 15-25% efficiency gains",
                              icon: <Target className="h-4 w-4" />,
                            };
                          };
                          
                          // Helper function to generate evidence-based insights from user responses
                          const generateEvidenceBasedInsight = (
                            dimName: string,
                            questionContext: string,
                            isLowScore: boolean
                          ): { medianScore: number; actionableInsight: string; businessImpact: string; icon: React.ReactNode } | null => {
                            const contextLower = questionContext.toLowerCase();
                            
                            if (dimName.includes('close') || dimName.includes('consolidat')) {
                              if (contextLower.includes('manual') || contextLower.includes('spreadsheet')) {
                                return {
                                  medianScore: 52,
                                  actionableInsight: `Based on your responses indicating manual processes, automating consolidation workflows could reduce close time by 30-50%`,
                                  businessImpact: "Organisations with similar manual processes typically save 40-60 FTE hours monthly after automation",
                                  icon: <Clock className="h-4 w-4" />,
                                };
                              }
                              if (contextLower.includes('days') || contextLower.includes('week')) {
                                return {
                                  medianScore: 52,
                                  actionableInsight: `Your close cycle timing suggests opportunity for process streamlining - target 50% reduction through task automation and parallel processing`,
                                  businessImpact: "Close cycle reduction typically frees 2-4 days of finance capacity per month for analysis",
                                  icon: <Clock className="h-4 w-4" />,
                                };
                              }
                            }
                            
                            if (dimName.includes('planning') || dimName.includes('forecast')) {
                              if (contextLower.includes('annual') || contextLower.includes('once')) {
                                return {
                                  medianScore: 50,
                                  actionableInsight: `Your annual planning approach could benefit from rolling forecasts - transitioning to quarterly or monthly cycles improves responsiveness`,
                                  businessImpact: "Moving from annual to rolling planning typically improves forecast accuracy by 15-25%",
                                  icon: <TrendingUp className="h-4 w-4" />,
                                };
                              }
                              if (contextLower.includes('spreadsheet') || contextLower.includes('excel')) {
                                return {
                                  medianScore: 50,
                                  actionableInsight: `Reducing spreadsheet dependency through integrated planning tools could eliminate version control issues and improve collaboration`,
                                  businessImpact: "Organisations moving from spreadsheets to integrated planning report 30-50% faster planning cycles",
                                  icon: <TrendingUp className="h-4 w-4" />,
                                };
                              }
                            }
                            
                            if (dimName.includes('data') || dimName.includes('analytics')) {
                              if (contextLower.includes('multiple') || contextLower.includes('silos') || contextLower.includes('different')) {
                                return {
                                  medianScore: 48,
                                  actionableInsight: `Your data fragmentation across systems creates reconciliation overhead - consolidating to a single source of truth would improve efficiency`,
                                  businessImpact: "Data consolidation typically reduces reconciliation effort by 60-80%",
                                  icon: <BarChart3 className="h-4 w-4" />,
                                };
                              }
                            }
                            
                            if (dimName.includes('control') || dimName.includes('compliance')) {
                              if (contextLower.includes('manual') || contextLower.includes('review')) {
                                return {
                                  medianScore: 55,
                                  actionableInsight: `Your manual control processes present automation opportunities - workflow-based approvals could strengthen controls while reducing effort`,
                                  businessImpact: "Automated controls typically reduce compliance review time by 40-60%",
                                  icon: <Shield className="h-4 w-4" />,
                                };
                              }
                            }
                            
                            return null;
                          };

                          const sortedDimensions = Object.entries(safeAssessment.dimensionScores!)
                            .map(([dimension, score]) => {
                              const numScore = typeof score === 'number' ? score : 0;
                              // Find breakdown data for this dimension if available
                              const breakdownDim = scoreBreakdownData?.data?.dimensions?.find(
                                d => d.dimensionCode === dimension || 
                                     d.dimension === dimension ||
                                     d.dimensionLabel.toLowerCase().includes(dimension.replace(/_/g, ' ').toLowerCase().split(' ')[0])
                              );
                              return {
                                dimension,
                                score: numScore,
                                insights: dimensionInsights[dimension] || generateSmartFallback(dimension, numScore, breakdownDim)
                              };
                            })
                            .sort((a, b) => a.score - b.score);

                          const needsAttention = sortedDimensions.filter(d => d.score < 70);
                          const strong = sortedDimensions.filter(d => d.score >= 70);

                          return (
                            <div className="space-y-4">
                              {needsAttention.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    Priority Areas for Improvement ({needsAttention.length})
                                  </div>
                                  <Accordion type="multiple" defaultValue={needsAttention.slice(0, 3).map(d => d.dimension)}>
                                    {needsAttention.map(({ dimension, score, insights }) => {
                                      const isModerate = score >= 40;
                                      const vsMedian = score - insights.medianScore;
                                      const vsMedianText = vsMedian >= 0 
                                        ? `${Math.abs(vsMedian)}% above` 
                                        : `${Math.abs(vsMedian)}% below`;
                                      
                                      return (
                                        <AccordionItem key={dimension} value={dimension} className="border rounded-lg px-4 mb-2" data-testid={`accordion-dimension-${dimension}`}>
                                          <AccordionTrigger className="hover:no-underline py-3">
                                            <div className="flex items-center justify-between w-full pr-2">
                                              <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                  isModerate 
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                }`}>
                                                  {insights.icon}
                                                </div>
                                                <span className="font-medium text-left">
                                                  {dimension.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className={`text-lg font-bold ${
                                                  isModerate ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                  {score}%
                                                </span>
                                              </div>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="pb-4">
                                            <div className="space-y-4 pt-2">
                                              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                                <Info className="h-4 w-4 text-brand-teal mt-0.5 flex-shrink-0" />
                                                <div>
                                                  <span className="text-sm font-medium">Score Context: </span>
                                                  <span className="text-sm text-muted-foreground">
                                                    Your {score}% score is {vsMedianText} the industry median of {insights.medianScore}%
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-berry/5 border border-brand-berry/20">
                                                <Lightbulb className="h-4 w-4 text-brand-teal mt-0.5 flex-shrink-0" />
                                                <div>
                                                  <span className="text-sm font-medium text-brand-teal">Recommended Action: </span>
                                                  <span className="text-sm text-muted-foreground">
                                                    {insights.actionableInsight}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                                <Calculator className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Business Impact: </span>
                                                  <span className="text-sm text-muted-foreground">
                                                    {insights.businessImpact}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              <Progress value={score} className="h-2" />
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      );
                                    })}
                                  </Accordion>
                                </div>
                              )}

                              {strong.length > 0 && (
                                <div className="space-y-2 pt-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Areas of Strength ({strong.length})
                                  </div>
                                  <Accordion type="multiple">
                                    {strong.map(({ dimension, score, insights }) => (
                                      <AccordionItem key={dimension} value={dimension} className="border rounded-lg px-4 mb-2" data-testid={`accordion-dimension-strong-${dimension}`}>
                                        <AccordionTrigger className="hover:no-underline py-3">
                                          <div className="flex items-center justify-between w-full pr-2">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                {insights.icon}
                                              </div>
                                              <span className="font-medium text-left">
                                                {dimension.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                                {score}%
                                              </span>
                                              <Badge variant="outline" className="border-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                Strong
                                              </Badge>
                                            </div>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-4">
                                          <div className="space-y-3 pt-2">
                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                              <Award className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                              <span className="text-sm text-muted-foreground">
                                                Your performance in this area exceeds the industry median of {insights.medianScore}%. 
                                                This capability can serve as a foundation for more advanced initiatives.
                                              </span>
                                            </div>
                                            <Progress value={score} className="h-2" />
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    ))}
                                  </Accordion>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            </>
          )}

          {upgrade && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-r from-brand-ink/5 to-brand-berry/5 border-brand-berry/20" data-testid="card-upgrade">
                <CardContent className="py-8">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center">
                        <Target className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Unlock Deeper Insights
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Upgrade to our {upgrade.name} to {upgrade.description.toLowerCase()}.
                      </p>
                      <Button
                        onClick={() => handleUpgrade(upgrade.nextTier)}
                        disabled={upgradeMutation.isPending}
                        className="bg-gradient-to-r from-brand-ink to-brand-berry hover:from-brand-berry hover:to-brand-mint"
                        data-testid="button-upgrade"
                      >
                        {upgradeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Upgrading...
                          </>
                        ) : (
                          <>
                            Upgrade to {upgrade.name}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* PDF report download section removed */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card data-testid="card-contact">
              <CardHeader>
                <CardTitle>Ready to Take the Next Step?</CardTitle>
                <CardDescription>
                  Our finance transformation experts are ready to discuss your results 
                  and help you plan your journey.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <a 
                    href="mailto:info@constancia.io?subject=FinanceCompass%20Assessment%20Follow-up"
                    className="flex items-center gap-4 p-4 rounded-lg border hover-elevate transition-all"
                    data-testid="link-email-contact"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">Email Us</div>
                      <div className="text-sm text-muted-foreground">info@constancia.io</div>
                    </div>
                  </a>
                  <Link href="/contact">
                    <div 
                      className="flex items-center gap-4 p-4 rounded-lg border hover-elevate transition-all cursor-pointer"
                      data-testid="link-contact-page"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Schedule a Call</div>
                        <div className="text-sm text-muted-foreground">Book a consultation</div>
                      </div>
                    </div>
                  </Link>
                </div>
                
                <div className="mt-6 pt-6 border-t text-center">
                  <Link href="/finance-compass">
                    <Button variant="ghost" data-testid="button-new-assessment">
                      Start a New Assessment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Edit Answer Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-edit-answer">
          <DialogHeader>
            <DialogTitle>Edit Your Answer</DialogTitle>
            <DialogDescription>
              Update your response to recalculate your scores.
            </DialogDescription>
          </DialogHeader>
          
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="text-sm font-medium text-foreground">
                {editingQuestion.questionText}
              </div>
              
              {/* Slider questions */}
              {editingQuestion.questionType === 'slider' && editingQuestion.sliderConfig && (
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{editingQuestion.sliderConfig.labels?.[editingQuestion.sliderConfig.min] || `${editingQuestion.sliderConfig.min}`}</span>
                    <span>{editingQuestion.sliderConfig.labels?.[editingQuestion.sliderConfig.max] || `${editingQuestion.sliderConfig.max}`}</span>
                  </div>
                  <Slider
                    value={[typeof editedResponse === 'number' ? editedResponse : editingQuestion.sliderConfig.min]}
                    onValueChange={(value) => setEditedResponse(value[0])}
                    min={editingQuestion.sliderConfig.min}
                    max={editingQuestion.sliderConfig.max}
                    step={1}
                    className="w-full"
                    data-testid="slider-edit-response"
                  />
                  <div className="text-center">
                    <div className="text-lg font-semibold text-brand-teal">
                      {typeof editedResponse === 'number' ? editedResponse : editingQuestion.sliderConfig.min}
                    </div>
                    {editingQuestion.sliderConfig.labels?.[typeof editedResponse === 'number' ? editedResponse : editingQuestion.sliderConfig.min] && (
                      <div className="text-xs text-muted-foreground">
                        {editingQuestion.sliderConfig.labels[typeof editedResponse === 'number' ? editedResponse : editingQuestion.sliderConfig.min]}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Single select questions with options */}
              {editingQuestion.questionType === 'single_select' && editingQuestion.options && (
                <RadioGroup
                  value={String(editedResponse ?? '')}
                  onValueChange={(value) => setEditedResponse(value)}
                  className="space-y-2"
                  data-testid="radio-edit-response"
                >
                  {editingQuestion.options.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {/* Multi-select questions */}
              {editingQuestion.questionType === 'multi_select' && editingQuestion.options && (
                <div className="space-y-2" data-testid="checkbox-edit-response">
                  {editingQuestion.options.map((option) => {
                    const selectedValues = Array.isArray(editedResponse) ? editedResponse : [];
                    const isChecked = selectedValues.includes(option.value);
                    return (
                      <div key={option.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={option.value}
                          checked={isChecked}
                          onChange={(e) => {
                            const newValues = e.target.checked
                              ? [...selectedValues, option.value]
                              : selectedValues.filter(v => v !== option.value);
                            setEditedResponse(newValues);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={option.value} className="cursor-pointer text-sm">
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Fallback for numeric responses without slider config */}
              {typeof editingQuestion.currentResponse === 'number' && editingQuestion.questionType !== 'slider' && (
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  <Slider
                    value={[typeof editedResponse === 'number' ? editedResponse : 3]}
                    onValueChange={(value) => setEditedResponse(value[0])}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                    data-testid="slider-edit-response-fallback"
                  />
                  <div className="text-center text-lg font-semibold text-brand-teal">
                    {typeof editedResponse === 'number' ? editedResponse : 3}
                  </div>
                </div>
              )}
              
              {/* Fallback for text responses without options */}
              {typeof editingQuestion.currentResponse === 'string' && 
               !editingQuestion.options && 
               editingQuestion.questionType !== 'slider' && (
                <div className="space-y-2">
                  <Label>Your response</Label>
                  <input
                    type="text"
                    value={String(editedResponse ?? '')}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                    data-testid="input-edit-response"
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingQuestion(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditedQuestion}
              disabled={updateAnswerMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateAnswerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Recalculate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Chatbot Widget */}
      <ChatbotWidget assessmentId={assessment?.id} />

      <Footer />
    </div>
  );
}
