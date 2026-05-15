import { useState, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getPreferredCurrency } from "@/lib/currency";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Check,
  DollarSign,
  TrendingUp,
  Settings,
  PiggyBank,
  Target,
  Loader2,
  Percent,
  Clock,
  BarChart3,
  Scale,
  FileInput,
  PenLine,
  Sparkles,
  AlertCircle,
  List,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  calculateRoiMetrics, 
  formatCurrency, 
  formatPercent, 
  formatPayback,
  calculateScenarioComparison,
  calculateYearByYearAnalysis,
  calculateSensitivityAnalysis,
  calculateBenchmarkComparison,
  getPerformanceColor,
  getIndustryOptions,
} from "@shared/roi-calculator";
import {
  calculateDimensionContributions,
  DIMENSION_LABELS,
  BENEFIT_LABELS,
  type DimensionContribution,
} from "@shared/dimension-roi-mapping";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ROIAnalyticsCharts } from "@/components/finance-compass/ROIAnalyticsCharts";

type ViewMode = "wizard" | "full";

function safeToFixed(value: unknown, decimals: number): string {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value.toFixed(decimals);
  }
  return '0';
}

// Helper component for numeric inputs that handles empty values gracefully
// When user clears a field, treat it as 0 to prevent NaN/crashes
interface NumericInputProps {
  field: {
    value: number | string | undefined;
    onChange: (value: number) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<HTMLInputElement>;
  };
  min?: number;
  max?: number;
  step?: number;
  "data-testid"?: string;
}

function NumericInput({ field, min = 0, max, step, "data-testid": testId }: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    field.value !== undefined && field.value !== "" ? String(field.value) : ""
  );

  // Sync display value when field value changes externally (e.g., form reset)
  useEffect(() => {
    const newValue = field.value !== undefined && field.value !== "" ? String(field.value) : "";
    if (newValue !== displayValue) {
      setDisplayValue(newValue);
    }
  }, [field.value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setDisplayValue(rawValue);
    
    // Allow empty string during typing - don't update form yet
    if (rawValue === "" || rawValue === "-") {
      return;
    }
    
    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue)) {
      field.onChange(numValue);
    }
  };

  const handleBlur = () => {
    // On blur, if empty or invalid, reset to 0
    if (displayValue === "" || displayValue === "-" || isNaN(parseFloat(displayValue))) {
      setDisplayValue("0");
      field.onChange(0);
    }
    field.onBlur();
  };

  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      name={field.name}
      ref={field.ref}
      data-testid={testId}
    />
  );
}

/**
 * Dimension Contribution Card - shows how assessment dimensions contribute to ROI benefits
 */
function DimensionContributionCard({ 
  dimensionScores, 
  sizeBand 
}: { 
  dimensionScores: Record<string, number>; 
  sizeBand: string;
}) {
  const contributions = calculateDimensionContributions(dimensionScores, sizeBand);
  const topContributions = contributions
    .filter(c => c.totalContribution > 0)
    .slice(0, 4);
  
  if (topContributions.length === 0) return null;
  
  const totalPotential = contributions.reduce((sum, c) => sum + c.totalContribution, 0);
  
  return (
    <Accordion type="single" collapsible className="mb-4">
      <AccordionItem value="dimension-insights" className="border rounded-lg bg-muted/30">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Assessment-Linked Value Insights</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              £{totalPotential}k potential
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-3">
            Your assessment scores drive these benefit estimates. Larger gaps indicate greater improvement potential.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topContributions.map((contrib) => (
              <div 
                key={contrib.dimension}
                className="flex items-center justify-between p-2 rounded-md bg-background border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{contrib.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {contrib.score}% | Gap: {contrib.gap} pts
                  </p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-sm font-semibold text-[#7FB8A3]">
                    £{contrib.totalContribution}k
                  </p>
                </div>
              </div>
            ))}
          </div>
          {contributions.length > 4 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              + {contributions.length - 4} more dimensions contributing to total
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const roiFormSchema = z.object({
  currency: z.enum(["GBP", "USD", "EUR", "ZAR"]).default("GBP"),
  horizonYears: z.coerce.number().min(1).max(10).default(3),
  industry: z.enum(["cross_industry", "banking", "utilities", "manufacturing", "retail", "software_saas", "healthcare", "professional_services"]).default("cross_industry"),
  currentCloseDays: z.coerce.number().min(0).default(10),
  currentForecastAccuracy: z.coerce.number().min(0).max(100).default(82),
  currentReportsAutomated: z.coerce.number().min(0).max(100).default(30),
  baselineOperatingCost: z.coerce.number().min(0).optional(),
  transformationBudget: z.coerce.number().min(0).optional(),
  softwareLicenses: z.coerce.number().min(0).default(0),
  integrationCosts: z.coerce.number().min(0).default(0),
  dataMigration: z.coerce.number().min(0).default(0),
  changeManagement: z.coerce.number().min(0).default(0),
  internalFteCosts: z.coerce.number().min(0).default(0),
  trainingCosts: z.coerce.number().min(0).default(0),
  contingency: z.coerce.number().min(0).default(0),
  processEfficiencyPercent: z.coerce.number().min(0).max(100).default(0),
  headcountDelta: z.coerce.number().min(0).default(0),
  closeAccelerationDays: z.coerce.number().min(0).default(0),
  closeAccelerationValue: z.coerce.number().min(0).default(0),
  complianceRiskAvoidance: z.coerce.number().min(0).default(0),
  auditEfficiencySavings: z.coerce.number().min(0).default(0),
  revenueEnablement: z.coerce.number().min(0).default(0),
  externalConsultingSavings: z.coerce.number().min(0).default(0),
  runRateOpex: z.coerce.number().min(0).default(0),
  supportCosts: z.coerce.number().min(0).default(0),
  depreciation: z.coerce.number().min(0).default(0),
  discountRate: z.coerce.number().min(0).max(30).default(8),
  inflationRate: z.coerce.number().min(0).max(20).default(2.5),
  benefitRampYear1: z.coerce.number().min(0).max(100).default(25),
  benefitRampYear2: z.coerce.number().min(0).max(100).default(75),
  benefitRampYear3: z.coerce.number().min(0).max(100).default(100),
});

type RoiFormValues = z.infer<typeof roiFormSchema>;

interface ROIWizardProps {
  assessmentId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

type SetupMode = "pending" | "import" | "fresh";

interface AssessmentDataForSeeding {
  tier: string;
  status: string;
  epmReadinessScore?: number;
  urgencyScore?: number;
  dimensionScores?: Record<string, number>;
  sizeBand?: string;
  overallMaturityScore?: number;
  preAssessmentData?: {
    financeFte?: number;
    financeCostThousands?: number;
    financeCostPercentage?: number;
    revenueMillions?: number;
    entities?: number;
    businessUnits?: number;
    closeCycleDays?: number;
    forecastCycleDays?: number;
    planningCycleDays?: number;
  };
  company?: {
    financeFte?: number;
    financeCostThousands?: number;
    revenueMillions?: number;
  };
}

function mapAssessmentToRoiDefaults(assessment: AssessmentDataForSeeding): Partial<RoiFormValues> {
  const defaults: Partial<RoiFormValues> = {};
  
  const financeCost = assessment.company?.financeCostThousands || 
                      assessment.preAssessmentData?.financeCostThousands;
  if (financeCost) {
    defaults.baselineOperatingCost = financeCost;
  }
  
  const maturityScore = assessment.overallMaturityScore || 0;
  const urgencyScore = assessment.urgencyScore || 0;
  const epmScore = assessment.epmReadinessScore || 0;
  
  if (maturityScore > 0 || urgencyScore > 0) {
    const efficiencyPotential = Math.min(35, Math.max(5, 
      (5 - maturityScore) * 5 + urgencyScore * 3
    ));
    defaults.processEfficiencyPercent = Math.round(efficiencyPotential);
  }
  
  const financeFte = assessment.company?.financeFte || 
                     assessment.preAssessmentData?.financeFte;
  if (financeFte && financeFte > 5) {
    const fteReduction = Math.max(0, Math.round(financeFte * 0.1));
    defaults.headcountDelta = fteReduction;
  }
  
  const closeCycle = assessment.preAssessmentData?.closeCycleDays;
  if (closeCycle && closeCycle > 5) {
    const reduction = Math.round(closeCycle * 0.2);
    defaults.closeAccelerationDays = reduction;
    
    if (financeCost && financeFte) {
      const workingDaysPerYear = 252;
      const dailyFinanceCost = financeCost / workingDaysPerYear;
      const closeCycleTeamFraction = 0.4;
      const valuePerDaySaved = dailyFinanceCost * closeCycleTeamFraction;
      const annualCloses = 12;
      defaults.closeAccelerationValue = Math.round(valuePerDaySaved * reduction * annualCloses);
    }
  }
  
  if (epmScore >= 60) {
    defaults.complianceRiskAvoidance = 50;
    defaults.auditEfficiencySavings = 30;
  } else if (epmScore >= 40) {
    defaults.complianceRiskAvoidance = 30;
    defaults.auditEfficiencySavings = 15;
  }
  
  if (financeCost && defaults.processEfficiencyPercent) {
    const annualEfficiencySavings = (defaults.processEfficiencyPercent / 100) * financeCost;
    const externalConsultingEstimate = Math.round(annualEfficiencySavings * 0.15);
    if (externalConsultingEstimate > 0) {
      defaults.externalConsultingSavings = externalConsultingEstimate;
    }
  }
  
  return defaults;
}

const STEPS = [
  {
    id: "framing",
    title: "Programme Framing",
    description: "Set up your transformation context",
    icon: Target,
  },
  {
    id: "implementation",
    title: "Implementation Costs",
    description: "Capture project investment",
    icon: DollarSign,
  },
  {
    id: "benefits",
    title: "Benefit Streams",
    description: "Define expected value creation",
    icon: TrendingUp,
  },
  {
    id: "operating",
    title: "Operating Model",
    description: "Ongoing costs post-implementation",
    icon: Settings,
  },
  {
    id: "assumptions",
    title: "Financial Assumptions",
    description: "Economic parameters",
    icon: PiggyBank,
  },
];

export function ROIWizard({ assessmentId, onComplete, onCancel }: ROIWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupMode, setSetupMode] = useState<SetupMode>("pending");
  const [viewMode, setViewMode] = useState<ViewMode>("wizard");
  const [benchmarkYear, setBenchmarkYear] = useState<number>(2024);
  const { toast } = useToast();

  const { data: existingData, isLoading: loadingExisting } = useQuery<{ data?: { profile?: RoiFormValues } }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "roi"],
    enabled: !!assessmentId,
  });

  const { data: assessmentData, isLoading: loadingAssessment } = useQuery<{ success: boolean; data?: AssessmentDataForSeeding }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId],
    enabled: !!assessmentId && setupMode === "pending",
  });

  const hasExistingProfile = !!(existingData?.data?.profile);
  const hasCompletedAssessment = assessmentData?.data?.status === "completed" || 
                                  assessmentData?.data?.status === "analysed" ||
                                  assessmentData?.data?.status === "report_generated";
  const assessmentTier = assessmentData?.data?.tier || "registration";

  // Auto-set to "fresh" mode when there's existing data (skips setup screen)
  useEffect(() => {
    if (hasExistingProfile && setupMode === "pending") {
      setSetupMode("fresh");
      setViewMode("full"); // Show dashboard view
    }
  }, [hasExistingProfile, setupMode]);

  const form = useForm<RoiFormValues>({
    resolver: zodResolver(roiFormSchema),
    defaultValues: {
      currency: getPreferredCurrency() as "GBP" | "USD" | "EUR" | "ZAR",
      horizonYears: 3,
      industry: "cross_industry",
      currentCloseDays: 10,
      currentForecastAccuracy: 82,
      currentReportsAutomated: 30,
      baselineOperatingCost: 0,
      transformationBudget: 0,
      softwareLicenses: 0,
      integrationCosts: 0,
      dataMigration: 0,
      changeManagement: 0,
      internalFteCosts: 0,
      trainingCosts: 0,
      contingency: 0,
      processEfficiencyPercent: 0,
      headcountDelta: 0,
      closeAccelerationDays: 0,
      closeAccelerationValue: 0,
      complianceRiskAvoidance: 0,
      auditEfficiencySavings: 0,
      revenueEnablement: 0,
      externalConsultingSavings: 0,
      runRateOpex: 0,
      supportCosts: 0,
      depreciation: 0,
      discountRate: 8,
      inflationRate: 2.5,
      benefitRampYear1: 25,
      benefitRampYear2: 75,
      benefitRampYear3: 100,
    },
  });

  useEffect(() => {
    if (existingData?.data?.profile) {
      const profile = existingData.data.profile;
      form.reset({
        currency: profile.currency || "GBP",
        horizonYears: profile.horizonYears || 3,
        industry: (profile as any).industry || "cross_industry",
        currentCloseDays: (profile as any).currentCloseDays || 10,
        currentForecastAccuracy: (profile as any).currentForecastAccuracy || 82,
        currentReportsAutomated: (profile as any).currentReportsAutomated || 30,
        baselineOperatingCost: profile.baselineOperatingCost || 0,
        transformationBudget: profile.transformationBudget || 0,
        softwareLicenses: profile.softwareLicenses || 0,
        integrationCosts: profile.integrationCosts || 0,
        dataMigration: profile.dataMigration || 0,
        changeManagement: profile.changeManagement || 0,
        internalFteCosts: profile.internalFteCosts || 0,
        trainingCosts: profile.trainingCosts || 0,
        contingency: profile.contingency || 0,
        processEfficiencyPercent: profile.processEfficiencyPercent || 0,
        headcountDelta: profile.headcountDelta || 0,
        closeAccelerationDays: profile.closeAccelerationDays || 0,
        closeAccelerationValue: profile.closeAccelerationValue || 0,
        complianceRiskAvoidance: profile.complianceRiskAvoidance || 0,
        auditEfficiencySavings: profile.auditEfficiencySavings || 0,
        revenueEnablement: profile.revenueEnablement || 0,
        externalConsultingSavings: profile.externalConsultingSavings || 0,
        runRateOpex: profile.runRateOpex || 0,
        supportCosts: profile.supportCosts || 0,
        depreciation: profile.depreciation || 0,
        discountRate: profile.discountRate || 8,
        inflationRate: profile.inflationRate || 2.5,
        benefitRampYear1: profile.benefitRampYear1 || 25,
        benefitRampYear2: profile.benefitRampYear2 || 75,
        benefitRampYear3: profile.benefitRampYear3 || 100,
      });
    }
  }, [existingData, form]);


  const handleImportFromAssessment = () => {
    if (assessmentData?.data) {
      const assessmentDefaults = mapAssessmentToRoiDefaults(assessmentData.data);
      const currentValues = form.getValues();
      form.reset({
        ...currentValues,
        ...assessmentDefaults,
      });
      toast({
        title: "Assessment Data Imported",
        description: "Baseline values have been pre-populated from your assessment.",
      });
    }
    setSetupMode("import");
  };

  const handleStartFresh = () => {
    setSetupMode("fresh");
  };

  const saveMutation = useMutation({
    mutationFn: async (data: RoiFormValues) => {
      return apiRequest("PUT", `/api/finance-compass/public/assessments/${assessmentId}/roi`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance-compass/public/assessments", assessmentId, "roi"] });
      toast({
        title: "ROI Profile Saved",
        description: "Your ROI calculations have been saved successfully.",
      });
      onComplete?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save ROI profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  const liveMetrics = calculateRoiMetrics(watchedValues);
  const currency = watchedValues.currency || "GBP";

  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    saveMutation.mutate(data);
  });

  if (loadingExisting || (loadingAssessment && setupMode === "pending")) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#7FB8A3]" />
      </div>
    );
  }

  const CurrentStepIcon = STEPS[currentStep].icon;

  // Full dashboard view - shown when there's existing data
  if (viewMode === "full" && hasExistingProfile) {
    const scenarios = calculateScenarioComparison(watchedValues);
    const yearlyAnalysis = calculateYearByYearAnalysis(watchedValues);
    
    // Benchmark thresholds
    const benchmarks = {
      roi: { excellent: 200, good: 100, typical: 50 },
      payback: { excellent: 12, good: 18, typical: 24 },
      bcr: { excellent: 2.0, good: 1.5, typical: 1.0 },
    };
    
    const getRoiStatus = () => {
      if (liveMetrics.roiPercent >= benchmarks.roi.excellent) return { label: "Excellent", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 };
      if (liveMetrics.roiPercent >= benchmarks.roi.good) return { label: "Good", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 };
      if (liveMetrics.roiPercent >= benchmarks.roi.typical) return { label: "Meets Expectations", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", icon: AlertTriangle };
      return { label: "Below Benchmark", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle };
    };
    
    const getPaybackStatus = () => {
      if (liveMetrics.paybackMonths <= benchmarks.payback.excellent) return { label: "Excellent", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 };
      if (liveMetrics.paybackMonths <= benchmarks.payback.good) return { label: "Good", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 };
      if (liveMetrics.paybackMonths <= benchmarks.payback.typical) return { label: "Typical", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", icon: AlertTriangle };
      return { label: "Extended", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle };
    };
    
    const getBcrStatus = () => {
      if (liveMetrics.benefitCostRatio >= benchmarks.bcr.excellent) return { label: "Excellent", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 };
      if (liveMetrics.benefitCostRatio >= benchmarks.bcr.good) return { label: "Good", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 };
      if (liveMetrics.benefitCostRatio >= benchmarks.bcr.typical) return { label: "Acceptable", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", icon: AlertTriangle };
      return { label: "Below Target", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle };
    };
    
    const roiStatus = getRoiStatus();
    const paybackStatus = getPaybackStatus();
    const bcrStatus = getBcrStatus();
    
    // Calculate progress percentages for benchmarks
    const roiProgress = Math.min(100, (liveMetrics.roiPercent / benchmarks.roi.excellent) * 100);
    const paybackProgress = liveMetrics.paybackMonths >= 999 ? 0 : Math.max(0, 100 - (liveMetrics.paybackMonths / benchmarks.payback.typical) * 100);
    const bcrProgress = Math.min(100, (liveMetrics.benefitCostRatio / benchmarks.bcr.excellent) * 100);
    
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Centered Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#12161D] to-[#7FB8A3] flex items-center justify-center shadow-lg">
              <Calculator className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#12161D] dark:text-white">ROI Analysis Dashboard</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Your transformation business case summary with key financial metrics and projections
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("wizard")}
              className="text-xs"
              data-testid="button-edit-values"
            >
              <PenLine className="h-3 w-3 mr-1" />
              Edit Values
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                form.reset();
                setSetupMode("pending");
                setViewMode("wizard");
              }}
              className="text-muted-foreground hover:text-foreground text-xs"
              data-testid="button-start-fresh"
            >
              Start Fresh
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics Grid with Tooltips and Gradients */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 bg-gradient-to-br from-[#12161D] to-[#7FB8A3] text-white overflow-visible">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                      <Percent className="h-3.5 w-3.5" />
                      ROI %
                      <Info className="h-3 w-3 ml-auto opacity-60" />
                    </div>
                    <motion.div 
                      className="text-2xl font-bold"
                      data-testid="text-dashboard-roi"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={liveMetrics.roiPercent}
                    >
                      {formatPercent(liveMetrics.roiPercent)}
                    </motion.div>
                    <div className="mt-2">
                      <Progress value={roiProgress} className="h-1.5 bg-white/20" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">Return on Investment</p>
              <p className="text-xs text-muted-foreground">The percentage gain on your total investment over the analysis period. Higher is better.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="border-[#7FB8A3]/20 overflow-visible">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-[#7FB8A3] text-xs mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      Payback
                      <Info className="h-3 w-3 ml-auto opacity-40" />
                    </div>
                    <motion.div 
                      className="text-2xl font-bold text-[#12161D] dark:text-white"
                      data-testid="text-dashboard-payback"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={liveMetrics.paybackMonths}
                    >
                      {formatPayback(liveMetrics.paybackMonths)}
                    </motion.div>
                    <div className="mt-2">
                      <Progress value={paybackProgress} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">Payback Period</p>
              <p className="text-xs text-muted-foreground">The time required to recover your initial investment through benefits. Shorter is better.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-[#7FB8A3]/20 overflow-visible">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-[#7FB8A3] text-xs mb-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      NPV
                      <Info className="h-3 w-3 ml-auto opacity-40" />
                    </div>
                    <motion.div 
                      className="text-2xl font-bold text-[#12161D] dark:text-white"
                      data-testid="text-dashboard-npv"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={liveMetrics.npvValue}
                    >
                      {formatCurrency(liveMetrics.npvValue, currency)}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">Net Present Value</p>
              <p className="text-xs text-muted-foreground">The total value of future cash flows discounted to today's value. Positive NPV indicates value creation.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
              >
                <Card className="border-[#7FB8A3]/20 overflow-visible">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-[#7FB8A3] text-xs mb-1">
                      <Scale className="h-3.5 w-3.5" />
                      BCR
                      <Info className="h-3 w-3 ml-auto opacity-40" />
                    </div>
                    <motion.div 
                      className="text-2xl font-bold text-[#12161D] dark:text-white"
                      data-testid="text-dashboard-bcr"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={liveMetrics.benefitCostRatio}
                    >
                      {safeToFixed(liveMetrics.benefitCostRatio, 2)}x
                    </motion.div>
                    <div className="mt-2">
                      <Progress value={bcrProgress} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">Benefit-Cost Ratio</p>
              <p className="text-xs text-muted-foreground">For every £1 invested, you receive this many £ in return. Above 1.0 means positive returns.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-[#7FB8A3]/20 overflow-visible">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-[#7FB8A3] text-xs mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      TCO
                      <Info className="h-3 w-3 ml-auto opacity-40" />
                    </div>
                    <motion.div 
                      className="text-2xl font-bold text-[#12161D] dark:text-white"
                      data-testid="text-dashboard-tco"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={liveMetrics.totalCostOfOwnership}
                    >
                      {formatCurrency(liveMetrics.totalCostOfOwnership, currency)}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">Total Cost of Ownership</p>
              <p className="text-xs text-muted-foreground">Complete costs including implementation and ongoing operations over {watchedValues.horizonYears} years.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Benchmark Comparison Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-[#7FB8A3]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-[#7FB8A3]" />
                Industry Benchmark Comparison
              </CardTitle>
              <CardDescription className="text-xs">
                How your metrics compare to typical EPM transformation projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${roiStatus.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">ROI Performance</span>
                    <roiStatus.icon className={`h-4 w-4 ${roiStatus.color}`} />
                  </div>
                  <div className={`text-lg font-bold ${roiStatus.color}`}>{roiStatus.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Best Practice: 200%+ | Average: 150% | Typical: 50%+
                  </div>
                  <Progress value={roiProgress} className="h-2 mt-2" />
                </div>
                
                <div className={`p-4 rounded-lg ${paybackStatus.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Payback Speed</span>
                    <paybackStatus.icon className={`h-4 w-4 ${paybackStatus.color}`} />
                  </div>
                  <div className={`text-lg font-bold ${paybackStatus.color}`}>{paybackStatus.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Best: &lt;12mo | Good: 12-18mo | Typical: 18-24mo
                  </div>
                  <Progress value={paybackProgress} className="h-2 mt-2" />
                </div>
                
                <div className={`p-4 rounded-lg ${bcrStatus.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Benefit-Cost Ratio</span>
                    <bcrStatus.icon className={`h-4 w-4 ${bcrStatus.color}`} />
                  </div>
                  <div className={`text-lg font-bold ${bcrStatus.color}`}>{bcrStatus.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Best: 2.0x+ | Good: 1.5x+ | Acceptable: 1.0x+
                  </div>
                  <Progress value={bcrProgress} className="h-2 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Explanatory Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-[#C77A93]/30 bg-gradient-to-r from-[#12161D]/5 to-[#7FB8A3]/5 dark:from-[#12161D]/20 dark:to-[#7FB8A3]/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-[#7FB8A3]/10 flex items-center justify-center flex-shrink-0">
                  <Info className="h-4 w-4 text-[#7FB8A3]" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-[#12161D] dark:text-white text-sm">Understanding Your Metrics</h4>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>An ROI above 100% means the project pays for itself and generates additional value</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>A positive NPV indicates the investment creates value after accounting for the time value of money</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>BCR above 1.0 means benefits exceed costs - higher ratios indicate stronger business cases</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Visual Analytics Charts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <ROIAnalyticsCharts
            yearByYearData={yearlyAnalysis.rows}
            totalImplementationCost={liveMetrics.totalImplementationCost}
            totalAnnualBenefits={liveMetrics.totalAnnualBenefits}
            totalAnnualCosts={liveMetrics.totalAnnualCosts}
            paybackMonths={liveMetrics.paybackMonths}
            horizonYears={watchedValues.horizonYears || 3}
            processEfficiencyPercent={watchedValues.processEfficiencyPercent || 0}
            baselineOperatingCost={watchedValues.baselineOperatingCost || 0}
            currency={currency === "GBP" ? "£" : currency === "USD" ? "$" : "€"}
          />
        </motion.div>

        {/* Investment Summary and Transformation Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-[#7FB8A3]/20 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#7FB8A3]" />
                  Investment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Investment</span>
                  <span className="font-medium">{formatCurrency(liveMetrics.totalImplementationCost, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual Benefits</span>
                  <span className="font-medium text-[#7FB8A3]">{formatCurrency(liveMetrics.totalAnnualBenefits, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual Costs</span>
                  <span className="font-medium">{formatCurrency(liveMetrics.totalAnnualCosts, currency)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground flex items-center gap-1 cursor-help">
                        TCO ({watchedValues.horizonYears}yr)
                        <Info className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Total Cost of Ownership over the analysis period</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="font-semibold">{formatCurrency(liveMetrics.totalCostOfOwnership, currency)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Card className="border-[#7FB8A3]/20 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#7FB8A3]" />
                  Transformation Value
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Do Nothing Cost</span>
                  <span className="font-medium text-red-600">{formatCurrency(Math.abs(scenarios.doNothing.npv), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">With EPM Net Value</span>
                  <span className="font-medium text-[#7FB8A3]">{formatCurrency(scenarios.withTransformation.netValue, currency)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Net Gain</span>
                  <span className="font-bold text-[#12161D] dark:text-[#C77A93]">{formatCurrency(scenarios.delta.netValueDelta, currency)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Year by Year Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-[#7FB8A3]/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#7FB8A3]" />
                Year-by-Year Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2">Year</TableHead>
                    <TableHead className="py-2 text-right">Costs</TableHead>
                    <TableHead className="py-2 text-right">Benefits</TableHead>
                    <TableHead className="py-2 text-right">Net Cash Flow</TableHead>
                    <TableHead className="py-2 text-right">Cumulative NPV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlyAnalysis.rows.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell className="py-2 font-medium">Year {row.year}</TableCell>
                      <TableCell className="py-2 text-right text-red-600">{formatCurrency(row.costs, currency)}</TableCell>
                      <TableCell className="py-2 text-right text-[#7FB8A3]">{formatCurrency(row.benefits, currency)}</TableCell>
                      <TableCell className={`py-2 text-right font-medium ${row.netCashFlow >= 0 ? 'text-[#7FB8A3]' : 'text-red-600'}`}>
                        {formatCurrency(row.netCashFlow, currency)}
                      </TableCell>
                      <TableCell className={`py-2 text-right font-medium ${row.cumulativeNpv >= 0 ? 'text-[#7FB8A3]' : 'text-red-600'}`}>
                        {formatCurrency(row.cumulativeNpv, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold bg-muted/30">
                    <TableCell className="py-2">Total</TableCell>
                    <TableCell className="py-2 text-right text-red-600">{formatCurrency(yearlyAnalysis.totals.totalCosts, currency)}</TableCell>
                    <TableCell className="py-2 text-right text-[#7FB8A3]">{formatCurrency(yearlyAnalysis.totals.totalBenefits, currency)}</TableCell>
                    <TableCell className={`py-2 text-right ${yearlyAnalysis.totals.totalNet >= 0 ? 'text-[#7FB8A3]' : 'text-red-600'}`}>
                      {formatCurrency(yearlyAnalysis.totals.totalNet, currency)}
                    </TableCell>
                    <TableCell className={`py-2 text-right ${yearlyAnalysis.totals.finalNpv >= 0 ? 'text-[#7FB8A3]' : 'text-red-600'}`}>
                      {formatCurrency(yearlyAnalysis.totals.finalNpv, currency)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (setupMode === "pending") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#12161D] to-[#7FB8A3] flex items-center justify-center">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#12161D] dark:text-white">ROI Calculator</h2>
            <p className="text-sm text-muted-foreground">Build your transformation business case</p>
          </div>
        </div>

        <div className="text-center py-4">
          <h3 className="text-lg font-medium text-[#12161D] dark:text-white mb-2">How would you like to get started?</h3>
          <p className="text-sm text-muted-foreground">Choose how to initialize your ROI baseline values</p>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${hasExistingProfile ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {hasExistingProfile && (
            <button
              type="button"
              onClick={handleStartFresh}
              className="relative p-6 rounded-xl border-2 border-green-300 dark:border-green-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 text-left transition-all cursor-pointer"
              data-testid="button-continue-existing"
            >
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-green-600 text-white">
                  <Check className="h-3 w-3 mr-1" />
                  Saved
                </Badge>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Calculator className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#12161D] dark:text-white mb-1">
                    Continue with Existing
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Resume editing your previously saved ROI profile
                  </p>
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={handleImportFromAssessment}
            disabled={!hasCompletedAssessment}
            className={`relative p-6 rounded-xl border-2 text-left transition-all ${
              hasCompletedAssessment
                ? "border-[#7FB8A3]/30 hover:border-[#7FB8A3] hover:bg-[#7FB8A3]/5 cursor-pointer"
                : "border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed"
            }`}
            data-testid="button-import-assessment"
          >
            {hasCompletedAssessment && !hasExistingProfile && (
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-gradient-to-r from-[#12161D] to-[#7FB8A3] text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              </div>
            )}
            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                hasCompletedAssessment 
                  ? "bg-[#7FB8A3]/10" 
                  : "bg-gray-100 dark:bg-gray-800"
              }`}>
                <FileInput className={`h-6 w-6 ${
                  hasCompletedAssessment 
                    ? "text-[#7FB8A3]" 
                    : "text-gray-400"
                }`} />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold mb-1 ${
                  hasCompletedAssessment 
                    ? "text-[#12161D] dark:text-white" 
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                  Import from Assessment
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {hasCompletedAssessment
                    ? hasExistingProfile
                      ? "Replace values with data from your assessment"
                      : `Pre-populate baseline values from your completed ${assessmentTier} assessment`
                    : "Complete an assessment first to enable this option"
                  }
                </p>
                {hasCompletedAssessment && assessmentData?.data?.epmReadinessScore !== undefined && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Maturity Score: {assessmentData.data.epmReadinessScore}%
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {assessmentTier}
                    </Badge>
                  </div>
                )}
                {!hasCompletedAssessment && (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <span>No completed assessment found</span>
                  </div>
                )}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              form.reset();
              setSetupMode("fresh");
            }}
            className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#7FB8A3]/50 hover:bg-[#7FB8A3]/5 text-left transition-all cursor-pointer"
            data-testid="button-start-fresh"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <PenLine className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-[#12161D] dark:text-white mb-1">
                  Start Fresh
                </h4>
                <p className="text-sm text-muted-foreground">
                  {hasExistingProfile 
                    ? "Clear all values and start over from scratch"
                    : "Enter all values manually from scratch"
                  }
                </p>
              </div>
            </div>
          </button>
        </div>

        {onCancel && (
          <div className="flex justify-center pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} data-testid="button-cancel-setup">
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#12161D] to-[#7FB8A3] flex items-center justify-center">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#12161D] dark:text-white">ROI Calculator</h2>
            <p className="text-sm text-muted-foreground">Build your transformation business case</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          Step {currentStep + 1} of {STEPS.length}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors w-full ${
                  isActive
                    ? "bg-[#7FB8A3]/10 border border-[#7FB8A3]/30"
                    : isCompleted
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "bg-gray-50 dark:bg-gray-800/50"
                }`}
                data-testid={`button-step-${step.id}`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? "bg-[#7FB8A3] text-white"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                </div>
                <span className={`text-xs font-medium hidden md:block ${isActive ? "text-[#7FB8A3]" : "text-muted-foreground"}`}>
                  {step.title}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 w-4 ${isCompleted ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form 
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                // Prevent Enter key from submitting form when in input fields
                // Only allow submit via the Save button
                if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                  e.preventDefault();
                }
              }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#7FB8A3]/10 flex items-center justify-center">
                      <CurrentStepIcon className="h-4 w-4 text-[#7FB8A3]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{STEPS[currentStep].title}</CardTitle>
                      <CardDescription>{STEPS[currentStep].description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentStep === 0 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="currency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Currency</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-currency">
                                        <SelectValue placeholder="Select currency" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="GBP">GBP (£)</SelectItem>
                                      <SelectItem value="USD">USD ($)</SelectItem>
                                      <SelectItem value="EUR">EUR (€)</SelectItem>
                                      <SelectItem value="ZAR">ZAR (R)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="horizonYears"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Analysis Horizon (Years)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={1} max={10} data-testid="input-horizon-years" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="baselineOperatingCost"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Annual Finance Function Cost (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-baseline-cost" />
                                  </FormControl>
                                  <FormDescription>Total annual cost of finance operations</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="transformationBudget"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Transformation Budget (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-transformation-budget" />
                                  </FormControl>
                                  <FormDescription>Approved or expected budget</FormDescription>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="industry"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Industry Benchmark</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-industry">
                                        <SelectValue placeholder="Select industry" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {getIndustryOptions().map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                          {option.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>Compare against industry benchmarks</FormDescription>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="rounded-lg border bg-muted/30 p-4">
                            <h4 className="text-sm font-medium mb-3">Current State (for benchmarking)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name="currentCloseDays"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Close Cycle (Days)</FormLabel>
                                    <FormControl>
                                      <NumericInput field={field} min={0} data-testid="input-current-close-days" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="currentForecastAccuracy"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Forecast Accuracy (%)</FormLabel>
                                    <FormControl>
                                      <NumericInput field={field} min={0} max={100} data-testid="input-current-forecast-accuracy" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="currentReportsAutomated"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Reports Automated (%)</FormLabel>
                                    <FormControl>
                                      <NumericInput field={field} min={0} max={100} data-testid="input-current-reports-automated" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {currentStep === 1 && (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800 p-3 mb-4">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <p className="font-medium text-amber-800 dark:text-amber-200">All monetary values in thousands (£k)</p>
                                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                                  Enter <strong>500</strong> for £500,000 or <strong>1000</strong> for £1 million. Do not enter full amounts like 500000.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="softwareLicenses"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Software Licenses (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-software-licenses" />
                                  </FormControl>
                                  <FormDescription>Annual licence fees. Typical: 50-500 mid-market, 200-2000 enterprise</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="integrationCosts"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Integration Costs (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-integration-costs" />
                                  </FormControl>
                                  <FormDescription>SI partner implementation fees. Typical: 100-500 mid-market</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="dataMigration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data Migration (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-data-migration" />
                                  </FormControl>
                                  <FormDescription>Data cleansing, mapping and migration. Typical: 30-150</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="changeManagement"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Change Management (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-change-management" />
                                  </FormControl>
                                  <FormDescription>Organisational change and adoption support. Typical: 50-200</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="internalFteCosts"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Internal FTE Costs (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-internal-fte" />
                                  </FormControl>
                                  <FormDescription>Internal team time allocation (project team, SMEs). Typical: 50-300</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="trainingCosts"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Training Costs (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-training" />
                                  </FormControl>
                                  <FormDescription>End-user and admin training programmes. Typical: 20-100</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="contingency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contingency (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-contingency" />
                                  </FormControl>
                                  <FormDescription>Risk buffer, typically 10-20% of total. Typical: 50-200</FormDescription>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {currentStep === 2 && (
                        <div className="space-y-6">
                          <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800 p-3 mb-2">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <p className="font-medium text-amber-800 dark:text-amber-200">All monetary values in thousands (£k) per year</p>
                                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                                  Enter <strong>100</strong> for £100,000/year savings. Benefits are calculated at full run-rate.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {setupMode === "import" && assessmentData?.data && (
                            <div className="rounded-lg bg-[#7FB8A3]/5 border border-[#7FB8A3]/20 p-3 mb-4">
                              <div className="flex items-center gap-2 text-sm text-[#7FB8A3] font-medium mb-1">
                                <Sparkles className="h-4 w-4" />
                                <span>Values seeded from your assessment</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Review and adjust the pre-populated values based on your specific context
                              </p>
                            </div>
                          )}
                          
                          {/* Dimension Contribution Visualization */}
                          {assessmentData?.data?.dimensionScores && Object.keys(assessmentData.data.dimensionScores).length > 0 && (
                            <DimensionContributionCard 
                              dimensionScores={assessmentData.data.dimensionScores}
                              sizeBand={assessmentData.data.sizeBand || "50m_250m"}
                            />
                          )}

                          <div className="space-y-4">
                            <div className="rounded-lg border bg-green-50/50 dark:bg-green-900/10 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-6 w-6 rounded bg-green-600 flex items-center justify-center">
                                  <Clock className="h-3 w-3 text-white" />
                                </div>
                                <h4 className="font-medium text-green-800 dark:text-green-200">Efficiency & Time Savings</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="processEfficiencyPercent"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Process Efficiency Gain (%)</FormLabel>
                                      <FormControl>
                                        <NumericInput field={field} min={0} max={100} data-testid="input-efficiency-percent" />
                                      </FormControl>
                                            <FormDescription>% reduction in time/effort. Typical: 15-30% for automation projects</FormDescription>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="headcountDelta"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>FTE Redeployment/Reduction</FormLabel>
                                      <FormControl>
                                        <NumericInput field={field} min={0} data-testid="input-headcount-delta" />
                                      </FormControl>
                                      <FormDescription>FTEs freed up (valued at £80k/FTE). Typical: 1-5 for mid-market</FormDescription>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="closeAccelerationDays"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Close Cycle Reduction (Days)</FormLabel>
                                      <FormControl>
                                        <NumericInput field={field} min={0} data-testid="input-close-days" />
                                      </FormControl>
                                      <FormDescription>Days saved per close cycle. Typical: 2-5 days improvement</FormDescription>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="closeAccelerationValue"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Close Acceleration Value (£k)</FormLabel>
                                      <FormControl>
                                        <NumericInput field={field} min={0} data-testid="input-close-value" />
                                      </FormControl>
                                      <FormDescription>Annual value of faster close. Typical: 20-100 for mid-market</FormDescription>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="externalConsultingSavings"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>External Consulting Savings (£k)</FormLabel>
                                      <FormControl>
                                        <NumericInput field={field} min={0} data-testid="input-consulting" />
                                      </FormControl>
                                      <FormDescription>Reduced external support costs. Typical: 30-150</FormDescription>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
                                  <TrendingUp className="h-3 w-3 text-white" />
                                </div>
                                <h4 className="font-medium text-blue-800 dark:text-blue-200">Revenue & Strategic Impact</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="revenueEnablement"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Revenue Enablement (£k)</FormLabel>
                                      <FormControl>
                                        <NumericInput field={field} min={0} data-testid="input-revenue" />
                                      </FormControl>
                                      <FormDescription>Better decisions from improved insights. Typical: 50-500</FormDescription>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-6 w-6 rounded bg-amber-600 flex items-center justify-center">
                                  <Scale className="h-3 w-3 text-white" />
                                </div>
                                <h4 className="font-medium text-amber-800 dark:text-amber-200">Risk & Compliance</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="complianceRiskAvoidance"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Compliance Risk Avoidance (£k)</FormLabel>
                                      <FormControl>
                                        <NumericInput field={field} min={0} data-testid="input-compliance" />
                                      </FormControl>
                                      <FormDescription>Avoided penalties or remediation. Typical: 10-100</FormDescription>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="auditEfficiencySavings"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Audit Efficiency Savings (£k)</FormLabel>
                                      <FormControl>
                                        <NumericInput field={field} min={0} data-testid="input-audit" />
                                      </FormControl>
                                      <FormDescription>Reduced audit effort and fees. Typical: 20-80</FormDescription>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {currentStep === 3 && (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800 p-3 mb-4">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <p className="font-medium text-amber-800 dark:text-amber-200">All costs in thousands (£k) per year</p>
                                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                                  Enter ongoing annual costs after go-live, not one-time implementation costs.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="runRateOpex"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Software/Support Annual Cost (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-opex" />
                                  </FormControl>
                                  <FormDescription>Ongoing licence and vendor support. Typical: 50-200</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="supportCosts"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Internal Support Costs (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-support" />
                                  </FormControl>
                                  <FormDescription>Internal admin and support resources. Typical: 30-100</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="depreciation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Annual Depreciation (£k)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} data-testid="input-depreciation" />
                                  </FormControl>
                                  <FormDescription>Capitalised implementation costs amortised. Typical: 50-150</FormDescription>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {currentStep === 4 && (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground mb-4">Financial modelling parameters</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="discountRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Discount Rate (%)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} max={30} step={0.5} data-testid="input-discount-rate" />
                                  </FormControl>
                                  <FormDescription>For NPV calculation</FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="inflationRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Inflation Rate (%)</FormLabel>
                                  <FormControl>
                                    <NumericInput field={field} min={0} max={20} step={0.5} data-testid="input-inflation" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="pt-4 border-t">
                            <Label className="text-sm font-medium mb-3 block">Benefit Ramp-up Schedule</Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name="benefitRampYear1"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Year 1 (%)</FormLabel>
                                    <FormControl>
                                      <NumericInput field={field} min={0} max={100} data-testid="input-ramp-y1" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="benefitRampYear2"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Year 2 (%)</FormLabel>
                                    <FormControl>
                                      <NumericInput field={field} min={0} max={100} data-testid="input-ramp-y2" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="benefitRampYear3"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Year 3+ (%)</FormLabel>
                                    <FormControl>
                                      <NumericInput field={field} min={0} max={100} data-testid="input-ramp-y3" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-between pt-4 border-t gap-2">
                    <div>
                      {onCancel && (
                        <Button type="button" variant="ghost" onClick={onCancel} data-testid="button-cancel">
                          Cancel
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        data-testid="button-previous"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      {currentStep < STEPS.length - 1 ? (
                        <Button
                          type="button"
                          onClick={handleNext}
                          className="bg-[#7FB8A3] hover:bg-[#12161D]"
                          data-testid="button-next"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          className="bg-[#12161D] hover:bg-[#7FB8A3]"
                          disabled={saveMutation.isPending}
                          data-testid="button-save-roi"
                        >
                          {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Save ROI Profile
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-[#7FB8A3]/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#7FB8A3]" />
                Live ROI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="w-full grid grid-cols-5 h-auto p-1 mx-4" style={{ width: 'calc(100% - 2rem)' }}>
                  <TabsTrigger value="summary" className="text-xs py-1.5 px-0.5" data-testid="tab-summary">Summary</TabsTrigger>
                  <TabsTrigger value="scenarios" className="text-xs py-1.5 px-0.5" data-testid="tab-scenarios">Scenarios</TabsTrigger>
                  <TabsTrigger value="yearly" className="text-xs py-1.5 px-0.5" data-testid="tab-yearly">Yearly</TabsTrigger>
                  <TabsTrigger value="sensitivity" className="text-xs py-1.5 px-0.5" data-testid="tab-sensitivity">Sensitivity</TabsTrigger>
                  <TabsTrigger value="benchmarks" className="text-xs py-1.5 px-0.5" data-testid="tab-benchmarks">Benchmarks</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="px-4 pb-4 pt-2 mt-0">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs mb-0.5">
                        <Percent className="h-3 w-3" />
                        ROI
                      </div>
                      <div className="text-base font-bold text-green-700 dark:text-green-300" data-testid="text-preview-roi">
                        {formatPercent(liveMetrics.roiPercent)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs mb-0.5">
                        <Clock className="h-3 w-3" />
                        Payback
                      </div>
                      <div className="text-base font-bold text-blue-700 dark:text-blue-300" data-testid="text-preview-payback">
                        {formatPayback(liveMetrics.paybackMonths)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 text-xs mb-0.5">
                        <TrendingUp className="h-3 w-3" />
                        NPV
                      </div>
                      <div className="text-base font-bold text-purple-700 dark:text-purple-300" data-testid="text-preview-npv">
                        {formatCurrency(liveMetrics.npvValue, currency)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs mb-0.5">
                        <Scale className="h-3 w-3" />
                        BCR
                      </div>
                      <div className="text-base font-bold text-amber-700 dark:text-amber-300" data-testid="text-preview-bcr">
                        {safeToFixed(liveMetrics.benefitCostRatio, 2)}x
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 mt-3 border-t space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Investment</span>
                      <span className="font-medium" data-testid="text-preview-investment">
                        {formatCurrency(liveMetrics.totalImplementationCost, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Annual Benefits</span>
                      <span className="font-medium text-green-600" data-testid="text-preview-benefits">
                        {formatCurrency(liveMetrics.totalAnnualBenefits, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Annual Costs</span>
                      <span className="font-medium text-red-600" data-testid="text-preview-costs">
                        {formatCurrency(liveMetrics.totalAnnualCosts, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">TCO ({watchedValues.horizonYears}yr)</span>
                      <span className="font-semibold" data-testid="text-preview-tco">
                        {formatCurrency(liveMetrics.totalCostOfOwnership, currency)}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scenarios" className="px-4 pb-4 pt-2 mt-0">
                  {(() => {
                    const comparison = calculateScenarioComparison(watchedValues);
                    return (
                      <div className="space-y-3">
                        <div className="text-xs text-muted-foreground mb-2">
                          Compare transformation vs. status quo over {watchedValues.horizonYears} years
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                            <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Do Nothing</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Opportunity Cost</span>
                                <span className="font-medium text-red-600" data-testid="text-donothing-cost">
                                  {formatCurrency(Math.abs(comparison.doNothing.npv), currency)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Benefits</span>
                                <span className="font-medium">{formatCurrency(0, currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Net Value</span>
                                <span className="font-medium text-red-600" data-testid="text-donothing-net">
                                  {formatCurrency(comparison.doNothing.netValue, currency)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                            <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">With EPM</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">TCO</span>
                                <span className="font-medium" data-testid="text-transform-tco">
                                  {formatCurrency(comparison.withTransformation.tco, currency)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Benefits</span>
                                <span className="font-medium text-green-600" data-testid="text-transform-benefits">
                                  {formatCurrency(comparison.withTransformation.totalBenefits, currency)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Net Value</span>
                                <span className="font-medium text-green-600" data-testid="text-transform-net">
                                  {formatCurrency(comparison.withTransformation.netValue, currency)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 rounded-lg border border-[#7FB8A3]/30 bg-[#7FB8A3]/5">
                          <div className="text-xs font-medium text-[#7FB8A3] mb-1">Transformation Value</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Net Gain</span>
                              <span className="font-bold text-[#12161D] dark:text-[#C77A93]" data-testid="text-delta-gain">
                                {formatCurrency(comparison.delta.netValueDelta, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">NPV Uplift</span>
                              <span className="font-bold text-[#12161D] dark:text-[#C77A93]" data-testid="text-delta-npv">
                                {formatCurrency(comparison.delta.npvDelta, currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="yearly" className="px-4 pb-4 pt-2 mt-0">
                  {(() => {
                    const yearlyAnalysis = calculateYearByYearAnalysis(watchedValues);
                    return (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground mb-2">
                          Year-by-year cash flow analysis with benefit ramp-up
                        </div>
                        <div className="overflow-x-auto">
                          <Table className="text-xs">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="py-1.5 px-1 w-10">Yr</TableHead>
                                <TableHead className="py-1.5 px-1 text-right">Costs</TableHead>
                                <TableHead className="py-1.5 px-1 text-right">Benefits</TableHead>
                                <TableHead className="py-1.5 px-1 text-right">Net</TableHead>
                                <TableHead className="py-1.5 px-1 text-right">Cum. NPV</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {yearlyAnalysis.rows.map((row) => (
                                <TableRow key={row.year} data-testid={`row-year-${row.year}`}>
                                  <TableCell className="py-1 px-1 font-medium">Y{row.year}</TableCell>
                                  <TableCell className="py-1 px-1 text-right text-red-600">
                                    {formatCurrency(row.costs, currency)}
                                  </TableCell>
                                  <TableCell className="py-1 px-1 text-right text-green-600">
                                    {formatCurrency(row.benefits, currency)}
                                  </TableCell>
                                  <TableCell className={`py-1 px-1 text-right font-medium ${row.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(row.netCashFlow, currency)}
                                  </TableCell>
                                  <TableCell className={`py-1 px-1 text-right font-medium ${row.cumulativeNpv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(row.cumulativeNpv, currency)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t-2 font-semibold bg-muted/30">
                                <TableCell className="py-1.5 px-1">Total</TableCell>
                                <TableCell className="py-1.5 px-1 text-right text-red-600" data-testid="text-yearly-total-costs">
                                  {formatCurrency(yearlyAnalysis.totals.totalCosts, currency)}
                                </TableCell>
                                <TableCell className="py-1.5 px-1 text-right text-green-600" data-testid="text-yearly-total-benefits">
                                  {formatCurrency(yearlyAnalysis.totals.totalBenefits, currency)}
                                </TableCell>
                                <TableCell className={`py-1.5 px-1 text-right ${yearlyAnalysis.totals.totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-yearly-total-net">
                                  {formatCurrency(yearlyAnalysis.totals.totalNet, currency)}
                                </TableCell>
                                <TableCell className={`py-1.5 px-1 text-right ${yearlyAnalysis.totals.finalNpv >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-yearly-final-npv">
                                  {formatCurrency(yearlyAnalysis.totals.finalNpv, currency)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="sensitivity" className="px-4 pb-4 pt-2 mt-0">
                  {(() => {
                    const sensitivity = calculateSensitivityAnalysis(watchedValues);
                    return (
                      <div className="space-y-3">
                        <div className="text-xs text-muted-foreground mb-2">
                          Key variable ranges and scenario outcomes
                        </div>
                        <div className="space-y-2">
                          {sensitivity.variables.map((v) => {
                            const currentVal = typeof v.current === 'number' && isFinite(v.current) ? v.current : 0;
                            const minVal = typeof v.min === 'number' && isFinite(v.min) ? v.min : 0;
                            const maxVal = typeof v.max === 'number' && isFinite(v.max) ? v.max : 100;
                            return (
                              <div key={v.key} className="space-y-1" data-testid={`sensitivity-var-${v.key}`}>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{v.name}</span>
                                  <span className="font-medium">{safeToFixed(currentVal, v.unit === '%' ? 0 : 1)}{v.unit}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-10">{safeToFixed(minVal, 0)}</span>
                                  <Slider
                                    value={[currentVal]}
                                    min={minVal}
                                    max={maxVal}
                                    step={1}
                                    disabled
                                    className="flex-1"
                                    data-testid={`slider-${v.key}`}
                                  />
                                  <span className="text-xs text-muted-foreground w-10 text-right">{safeToFixed(maxVal, 0)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">{sensitivity.worstCase.label}</div>
                            <div className="text-sm font-bold text-red-700 dark:text-red-300" data-testid="text-worst-roi">
                              {formatPercent(sensitivity.worstCase.roiPercent)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              NPV: {formatCurrency(sensitivity.worstCase.npv, currency)}
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-[#7FB8A3]/10 border border-[#7FB8A3]/30 text-center">
                            <div className="text-xs text-[#7FB8A3] font-medium mb-1">{sensitivity.midCase.label}</div>
                            <div className="text-sm font-bold text-[#12161D] dark:text-[#C77A93]" data-testid="text-mid-roi">
                              {formatPercent(sensitivity.midCase.roiPercent)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              NPV: {formatCurrency(sensitivity.midCase.npv, currency)}
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">{sensitivity.bestCase.label}</div>
                            <div className="text-sm font-bold text-green-700 dark:text-green-300" data-testid="text-best-roi">
                              {formatPercent(sensitivity.bestCase.roiPercent)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              NPV: {formatCurrency(sensitivity.bestCase.npv, currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="benchmarks" className="px-4 pb-4 pt-2 mt-0">
                  {(() => {
                    const benchmarkInputs = {
                      ...watchedValues,
                      industry: watchedValues.industry || "cross_industry",
                      currentCloseDays: watchedValues.currentCloseDays || 10,
                      currentForecastAccuracy: watchedValues.currentForecastAccuracy || 82,
                      currentReportsAutomated: watchedValues.currentReportsAutomated || 30,
                    };
                    const benchmarks = calculateBenchmarkComparison(benchmarkInputs, benchmarkInputs.industry, benchmarkYear);
                    const industryOptions = getIndustryOptions();
                    const selectedIndustry = industryOptions.find(i => i.id === benchmarkInputs.industry);
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-muted-foreground">
                            Industry benchmarks comparison
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={String(benchmarkYear)}
                              onValueChange={(value) => setBenchmarkYear(Number(value))}
                            >
                              <SelectTrigger className="h-7 w-[110px] text-xs" data-testid="select-benchmark-year">
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2020">2020</SelectItem>
                                <SelectItem value="2021">2021</SelectItem>
                                <SelectItem value="2022">2022</SelectItem>
                                <SelectItem value="2023">2023</SelectItem>
                                <SelectItem value="2024">2024 (Current)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Badge variant="outline" className="text-xs" data-testid="badge-industry">
                              {selectedIndustry?.name || "Cross-Industry"}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {benchmarks.metrics.map((metric) => {
                            const colorStyles = getPerformanceColor(metric.performanceLevel);
                            const bgColorClass = metric.performanceLevel === 'constancia_best' 
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                              : metric.performanceLevel === 'constancia_good'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : metric.performanceLevel === 'typical'
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                            
                            return (
                              <div 
                                key={metric.metricId} 
                                className={`p-2 rounded-lg border ${bgColorClass}`}
                                data-testid={`benchmark-card-${metric.metricId}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-xs font-medium">{metric.metricName}</span>
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${colorStyles.text}`}
                                    data-testid={`benchmark-status-${metric.metricId}`}
                                  >
                                    {metric.performanceLevel.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-xs">
                                  <div>
                                    <div className="text-muted-foreground">Current</div>
                                    <div className="font-semibold" data-testid={`benchmark-current-${metric.metricId}`}>
                                      {metric.current}{metric.unit === 'percent' ? '%' : metric.unit === 'days' ? 'd' : ''}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Typical</div>
                                    <div className="font-medium">
                                      {metric.typical ? (
                                        <>{metric.typical.min}-{metric.typical.max}{metric.unit === 'percent' ? '%' : metric.unit === 'days' ? 'd' : ''}</>
                                      ) : (
                                        <>N/A</>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Constancia Good</div>
                                    <div className="font-medium text-green-600 dark:text-green-400" data-testid={`benchmark-target-${metric.metricId}`}>
                                      {metric.oneQgGood ? `${metric.oneQgGood.min}-${metric.oneQgGood.max}` : 'N/A'}{metric.unit === 'percent' ? '%' : metric.unit === 'days' ? 'd' : ''}
                                    </div>
                                  </div>
                                </div>
                                {metric.gap !== 0 && (
                                  <div className="mt-1.5">
                                    <div className="flex justify-between text-xs mb-0.5">
                                      <span className="text-muted-foreground">Gap</span>
                                      <span className={colorStyles.text} data-testid={`benchmark-gap-${metric.metricId}`}>
                                        {metric.gap > 0 ? '+' : ''}{metric.gap}{metric.unit === 'percent' ? '%' : metric.unit === 'days' ? 'd' : ''} ({metric.gapPct > 0 ? '+' : ''}{safeToFixed(metric.gapPct, 0)}%)
                                      </span>
                                    </div>
                                    <Progress 
                                      value={Math.min(100, Math.max(0, 
                                        metric.lowerIsBetter 
                                          ? (metric.oneQgGood ? (metric.oneQgGood.max / metric.current) * 100 : 50)
                                          : (metric.oneQgGood ? (metric.current / metric.oneQgGood.min) * 100 : 50)
                                      ))} 
                                      className="h-1"
                                      data-testid={`benchmark-progress-${metric.metricId}`}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Based on {selectedIndustry?.name || "Cross-Industry"} EPM benchmarks ({benchmarks.year})
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
