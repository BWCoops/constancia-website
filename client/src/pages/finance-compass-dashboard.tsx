import { useState, useMemo, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Percent,
  Target,
  Building,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  BarChart3,
  Scale,
  Calculator,
  Settings,
  Lightbulb,
  Shield,
  Award,
  Info,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateRoiMetrics, calculateYearByYearAnalysis, formatCurrency, formatPercent, formatPayback, type RoiInputs } from "@shared/roi-calculator";
import { ROIAnalyticsCharts } from "@/components/finance-compass/ROIAnalyticsCharts";
import { calculateVendorAffinity, type DimensionScores, type OrganizationProfile, type VendorAffinityScore } from "@shared/vendor-affinity";

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
    sector?: string;
    sizeBand?: string;
  } | null;
  summary: {
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
  };
  aiAnalysis?: {
    summary?: string;
    keyInsights?: string[];
    recommendations?: string[];
  };
}

interface RoiProfileData {
  profile: RoiInputs;
  metrics: {
    roiPercent: number;
    paybackMonths: number;
    npvValue: number;
    totalCostOfOwnership: number;
    benefitCostRatio: number;
    totalImplementationCost: number;
    totalAnnualBenefits: number;
    netAnnualBenefit: number;
    totalAnnualCosts: number;
  };
}

const DEFAULT_ROI_INPUTS: RoiInputs = {
  currency: "GBP",
  horizonYears: 3,
  baselineOperatingCost: 2000,
  transformationBudget: 500,
  softwareLicenses: 150,
  integrationCosts: 100,
  dataMigration: 50,
  changeManagement: 75,
  internalFteCosts: 80,
  trainingCosts: 45,
  contingency: 50,
  processEfficiencyPercent: 25,
  headcountDelta: 2,
  closeAccelerationDays: 5,
  closeAccelerationValue: 100,
  complianceRiskAvoidance: 75,
  auditEfficiencySavings: 30,
  revenueEnablement: 50,
  externalConsultingSavings: 40,
  runRateOpex: 100,
  supportCosts: 50,
  depreciation: 30,
  discountRate: 8,
  inflationRate: 2,
  benefitRampYear1: 25,
  benefitRampYear2: 75,
  benefitRampYear3: 100,
};

type RiskLevel = "low" | "medium" | "high";

interface RiskIndicator {
  category: string;
  level: RiskLevel;
  description: string;
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case "low": return "bg-green-500";
    case "medium": return "bg-yellow-500";
    case "high": return "bg-red-500";
    default: return "bg-gray-500";
  }
}

function getRiskBadgeVariant(level: RiskLevel): string {
  switch (level) {
    case "low": return "bg-green-100 text-green-700 border-green-300";
    case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "high": return "bg-red-100 text-red-700 border-red-300";
    default: return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function calculateRiskIndicators(dimensionScores: Record<string, number> | null, roiMetrics: ReturnType<typeof calculateRoiMetrics>): RiskIndicator[] {
  const indicators: RiskIndicator[] = [];
  
  const avgScore = dimensionScores 
    ? Object.values(dimensionScores).reduce((a, b) => a + b, 0) / Object.values(dimensionScores).length 
    : 50;
  
  indicators.push({
    category: "Implementation",
    level: avgScore < 40 ? "high" : avgScore < 60 ? "medium" : "low",
    description: avgScore < 40 
      ? "Significant gaps require careful change management" 
      : avgScore < 60 
        ? "Moderate effort needed for transformation" 
        : "Strong foundation for successful implementation"
  });
  
  indicators.push({
    category: "Financial",
    level: roiMetrics.paybackMonths > 36 ? "high" : roiMetrics.paybackMonths > 24 ? "medium" : "low",
    description: roiMetrics.paybackMonths > 36 
      ? "Extended payback period may require phased approach" 
      : roiMetrics.paybackMonths > 24 
        ? "Payback within typical transformation timeline" 
        : "Strong ROI supports investment case"
  });
  
  const techScore = dimensionScores?.technology_systems ?? 50;
  indicators.push({
    category: "Technology",
    level: techScore < 40 ? "high" : techScore < 60 ? "medium" : "low",
    description: techScore < 40 
      ? "Legacy systems require significant integration effort" 
      : techScore < 60 
        ? "Some modernisation needed for optimal outcomes" 
        : "Technology stack well-positioned for EPM"
  });
  
  const peopleScore = dimensionScores?.organisation_people ?? 50;
  indicators.push({
    category: "Adoption",
    level: peopleScore < 40 ? "high" : peopleScore < 60 ? "medium" : "low",
    description: peopleScore < 40 
      ? "Change management critical for user adoption" 
      : peopleScore < 60 
        ? "Training programme essential for success" 
        : "Organisation ready for transformation"
  });
  
  return indicators;
}

function VendorCard({ vendor, rank }: { vendor: VendorAffinityScore; rank: number }) {
  const rankColors = ["from-[#12161D] to-[#8E4F67]", "from-[#8E4F67] to-[#7FB8A3]", "from-[#5E8D7A] to-[#8E4F67]"];
  const rankLabels = ["Top Pick", "Strong Match", "Good Fit"];
  
  return (
    <Card className="hover-elevate overflow-visible" data-testid={`card-vendor-${vendor.vendorId}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${rankColors[rank] || rankColors[2]} text-white font-bold shadow-lg`}>
              {rank + 1}
            </div>
            <div>
              <CardTitle className="text-lg" data-testid={`text-vendor-name-${vendor.vendorId}`}>
                {vendor.vendorName}
              </CardTitle>
              <CardDescription className="text-xs capitalize">{vendor.category.replace("_", " ")}</CardDescription>
            </div>
          </div>
          <Badge className="bg-[#7FB8A3]/10 text-brand-teal border-[#8E4F67]/30">
            {rankLabels[rank] || "Recommended"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Affinity Score</span>
          <span className="text-xl font-bold text-brand-teal" data-testid={`text-vendor-score-${vendor.vendorId}`}>
            {Math.round(vendor.normalizedScore)}%
          </span>
        </div>
        <Progress value={vendor.normalizedScore} className="h-2" />
        
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Key Strengths:</p>
          <ul className="space-y-1">
            {vendor.strengths.slice(0, 3).map((strength, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {vendor.considerations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Considerations:</p>
            <ul className="space-y-1">
              {vendor.considerations.slice(0, 2).map((consideration, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{consideration}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <Badge 
            className={`${
              vendor.matchQuality === "excellent" ? "bg-green-100 text-green-700 border-green-300" :
              vendor.matchQuality === "good" ? "bg-[#7FB8A3]/10 text-[#8E4F67] border-[#7FB8A3]" :
              vendor.matchQuality === "moderate" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
              "bg-gray-100 text-gray-700 border-gray-300"
            }`}
            data-testid={`badge-match-quality-${vendor.vendorId}`}
          >
            {vendor.matchQuality.charAt(0).toUpperCase() + vendor.matchQuality.slice(1)} Match
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

const METRIC_TOOLTIPS: Record<string, { title: string; description: string; formula?: string }> = {
  roi: {
    title: "Return on Investment (ROI)",
    description: "Measures the annual return generated relative to the initial investment. Higher percentages indicate stronger financial returns.",
    formula: "ROI = (Net Annual Benefit ÷ Implementation Cost) × 100"
  },
  payback: {
    title: "Payback Period",
    description: "Time required to recover the initial investment through net benefits. Shorter payback periods indicate faster value realisation.",
    formula: "Payback = Implementation Cost ÷ Net Annual Benefit × 12 months"
  },
  npv: {
    title: "Net Present Value (NPV)",
    description: "The present value of all future cash flows minus the initial investment, discounted at your cost of capital. Positive NPV indicates value creation.",
    formula: "NPV = Σ (Cash Flow ÷ (1 + Discount Rate)^Year) - Initial Investment"
  },
  tco: {
    title: "Total Cost of Ownership (TCO)",
    description: "Complete cost including implementation and all operating costs over the investment horizon.",
    formula: "TCO = Implementation Cost + (Annual Operating Costs × Years)"
  },
  bcr: {
    title: "Benefit-Cost Ratio (BCR)",
    description: "Ratio of total benefits to total costs over the horizon. A ratio above 1.0 indicates benefits exceed costs.",
    formula: "BCR = Total Benefits ÷ Total Costs"
  },
  netBenefit: {
    title: "Net Annual Benefit",
    description: "Annual value generated after deducting ongoing operating costs from total benefits.",
    formula: "Net Benefit = Total Annual Benefits - Annual Operating Costs"
  },
  implCost: {
    title: "Implementation Cost",
    description: "One-time investment including software, integration, migration, training, and change management.",
    formula: "Sum of: Licenses + Integration + Migration + Change Management + Training + Contingency"
  }
};

function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  colorClass,
  testId,
  tooltipKey
}: { 
  label: string; 
  value: string; 
  icon: typeof TrendingUp; 
  colorClass: string;
  testId: string;
  tooltipKey?: string;
}) {
  const tooltip = tooltipKey ? METRIC_TOOLTIPS[tooltipKey] : null;
  
  return (
    <Card className={`p-4 ${colorClass}`} data-testid={testId}>
      <div className="flex items-center gap-2 text-xs mb-1 opacity-80">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="opacity-60 hover:opacity-100 transition-opacity" data-testid={`tooltip-trigger-${testId}`}>
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" data-testid={`tooltip-content-${testId}`}>
              <div className="space-y-1">
                <p className="font-semibold text-sm">{tooltip.title}</p>
                <p className="text-xs text-muted-foreground">{tooltip.description}</p>
                {tooltip.formula && (
                  <p className="text-xs font-mono bg-muted/50 px-2 py-1 rounded mt-1">{tooltip.formula}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </Card>
  );
}

export default function FinanceCompassInteractiveDashboard() {
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = params.assessmentId;
  
  const [roiInputs, setRoiInputs] = useState<RoiInputs>(DEFAULT_ROI_INPUTS);
  
  const { data: resultsData, isLoading: resultsLoading } = useQuery<{ success: boolean; data: ResultsData }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "results"],
    enabled: !!assessmentId,
  });
  
  const { data: roiProfileData } = useQuery<{ success: boolean; data: RoiProfileData }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "roi"],
    enabled: !!assessmentId,
  });
  
  const hasRoiProfile = !!roiProfileData?.data?.profile;
  
  const effectiveRoiInputs = useMemo(() => {
    if (hasRoiProfile && roiProfileData?.data?.profile) {
      return { ...DEFAULT_ROI_INPUTS, ...roiProfileData.data.profile, ...roiInputs };
    }
    return roiInputs;
  }, [hasRoiProfile, roiProfileData, roiInputs]);
  
  const roiMetrics = useMemo(() => {
    return calculateRoiMetrics(effectiveRoiInputs);
  }, [effectiveRoiInputs]);
  
  const yearByYearData = useMemo(() => {
    return calculateYearByYearAnalysis(effectiveRoiInputs);
  }, [effectiveRoiInputs]);
  
  const currency = effectiveRoiInputs.currency || "GBP";
  
  const dimensionScores = resultsData?.data?.assessment?.dimensionScores || null;
  const company = resultsData?.data?.company;
  
  const vendorRecommendations = useMemo(() => {
    if (!dimensionScores) return [];
    
    const orgProfile: OrganizationProfile = {
      industry: company?.sector || "Technology",
      sizeBand: (company?.sizeBand as "smb" | "mid_market" | "enterprise" | "large_enterprise") || "mid_market",
      transformationAmbition: "moderate",
    };
    
    const scores = calculateVendorAffinity(dimensionScores as DimensionScores, orgProfile);
    return scores.slice(0, 3);
  }, [dimensionScores, company]);
  
  const riskIndicators = useMemo(() => {
    return calculateRiskIndicators(dimensionScores, roiMetrics);
  }, [dimensionScores, roiMetrics]);
  
  const handleSliderChange = useCallback((key: keyof RoiInputs, value: number) => {
    setRoiInputs(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const handleDownloadReport = useCallback(() => {
    window.open(`/api/finance-compass/public/assessments/${assessmentId}/report`, "_blank");
  }, [assessmentId]);
  
  if (resultsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16 sm:pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-6 space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
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
  
  if (!resultsData?.success || !resultsData?.data) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16 sm:pt-20 pb-16 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Dashboard Not Available</h2>
              <p className="text-muted-foreground mb-4">
                This assessment may not be completed yet or the link is invalid.
              </p>
              <Link href="/finance-compass/dashboard">
                <Button data-testid="button-back-dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }
  
  const { assessment, contact, summary, aiAnalysis } = resultsData.data;
  const score = assessment.epmReadinessScore || 0;
  
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Interactive Assessment Dashboard | FinanceCompass"
        description="Explore your FinanceCompass assessment results with interactive ROI scenarios, vendor recommendations, and a personalised transformation roadmap."
      />
      
      <Navigation />
      
      <main className="pt-16 sm:pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-6 mb-4">
          <Link href="/finance-compass/dashboard">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-brand-teal hover:text-[#12161D] -ml-2"
              data-testid="button-back-main-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        
        <section className="bg-gradient-to-r from-[#12161D] via-[#5E8D7A] to-[#8E4F67] py-10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-brand-cyan" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-dashboard-title">
                      Interactive Dashboard
                    </h1>
                    <p className="text-white/70 text-sm">
                      {company?.name || "Your Organisation"} | Maturity Score: {Math.round(score)}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={handleDownloadReport}
                  data-testid="button-download-report"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Link href={`/finance-compass/roi/${assessmentId}`}>
                  <Button className="bg-[#7FB8A3] text-[#12161D] hover:bg-[#7FB8A3]/90" data-testid="button-go-roi-wizard">
                    <Calculator className="h-4 w-4 mr-2" />
                    Full ROI Wizard
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
        
        <div className="max-w-7xl mx-auto px-6 -mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* ROI Metrics - Only shown for FULL assessments that are completed */}
            {assessment.tier === "full" && ["completed", "analysed", "report_generated"].includes(assessment.status) ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8" data-testid="metrics-grid">
                <MetricCard
                  label="ROI"
                  value={formatPercent(roiMetrics.roiPercent)}
                  icon={Percent}
                  colorClass="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                  testId="metric-roi"
                  tooltipKey="roi"
                />
                <MetricCard
                  label="Payback"
                  value={formatPayback(roiMetrics.paybackMonths)}
                  icon={Clock}
                  colorClass="bg-gradient-to-br from-[#7FB8A3]/10 to-[#7FB8A3]/10 dark:from-[#1E2630]/20 dark:to-[#1E2630]/20 border-[#7FB8A3] dark:border-[#12161D] text-[#8E4F67] dark:text-[#7FB8A3]"
                  testId="metric-payback"
                  tooltipKey="payback"
                />
                <MetricCard
                  label="NPV"
                  value={formatCurrency(roiMetrics.npvValue, currency)}
                  icon={TrendingUp}
                  colorClass="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                  testId="metric-npv"
                  tooltipKey="npv"
                />
                <MetricCard
                  label="TCO"
                  value={formatCurrency(roiMetrics.totalCostOfOwnership, currency)}
                  icon={DollarSign}
                  colorClass="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  testId="metric-tco"
                  tooltipKey="tco"
                />
                <MetricCard
                  label="BCR"
                  value={`${roiMetrics.benefitCostRatio.toFixed(2)}x`}
                  icon={Scale}
                  colorClass="bg-gradient-to-br from-[#7FB8A3]/10 to-[#7FB8A3]/10 dark:from-[#1E2630]/20 dark:to-[#1E2630]/20 border-[#7FB8A3] dark:border-[#12161D] text-[#8E4F67] dark:text-[#7FB8A3]"
                  testId="metric-bcr"
                  tooltipKey="bcr"
                />
              </div>
            ) : (
              <Card className="mb-8 p-6 border-dashed border-2 border-[#8E4F67]/30 bg-[#8E4F67]/5" data-testid="card-roi-locked">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#12161D]/20 to-[#8E4F67]/20 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <Calculator className="h-6 w-6 text-brand-teal/60" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="font-semibold text-[#12161D] dark:text-white">Complete the Full Assessment to Unlock ROI & Business Case</h4>
                    <p className="text-sm text-muted-foreground">
                      ROI metrics, NPV, Payback, TCO, and BCR analysis are available after completing the Full Assessment. Complete your Full Assessment to access detailed financial projections.
                    </p>
                  </div>
                  <Link href="/finance-compass/dashboard">
                    <Button
                      className="bg-[#8E4F67] hover:bg-brand-navy"
                      data-testid="button-go-to-full-assessment"
                      aria-label="Go to dashboard to start Full Assessment"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" aria-hidden="true" />
                      Start Full Assessment
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </motion.div>
          
          <Tabs defaultValue="scenarios" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4" data-testid="tabs-dashboard">
              <TabsTrigger value="scenarios" className="flex items-center gap-2" data-testid="tab-trigger-scenarios">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Scenarios</span>
              </TabsTrigger>
              <TabsTrigger value="vendors" className="flex items-center gap-2" data-testid="tab-trigger-vendors">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Vendors</span>
              </TabsTrigger>
              <TabsTrigger value="risks" className="flex items-center gap-2" data-testid="tab-trigger-risks">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Risks</span>
              </TabsTrigger>
              <TabsTrigger value="findings" className="flex items-center gap-2" data-testid="tab-trigger-findings">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">Findings</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="scenarios" className="space-y-6" data-testid="tab-content-scenarios">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card data-testid="card-roi-scenarios">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-brand-teal" />
                      ROI Scenario Toggles
                    </CardTitle>
                    <CardDescription>
                      Adjust key drivers to see real-time impact on ROI metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-1">
                            Process Efficiency Improvement
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="opacity-60 hover:opacity-100" data-testid="tooltip-slider-efficiency">
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs" data-testid="tooltip-content-slider-efficiency">
                                <p className="text-xs">Increasing this value raises annual benefits proportionally. A 10% improvement on £2m operating cost = £200k annual savings.</p>
                              </TooltipContent>
                            </Tooltip>
                          </label>
                          <span className="text-sm font-bold text-brand-teal" data-testid="value-process-efficiency">
                            {roiInputs.processEfficiencyPercent || 0}%
                          </span>
                        </div>
                        <Slider
                          value={[roiInputs.processEfficiencyPercent || 0]}
                          onValueChange={(v) => handleSliderChange("processEfficiencyPercent", v[0])}
                          min={0}
                          max={50}
                          step={1}
                          data-testid="slider-process-efficiency"
                        />
                        <p className="text-xs text-muted-foreground">
                          Expected reduction in process time and manual effort
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-1">
                            Headcount Reduction (FTEs)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="opacity-60 hover:opacity-100" data-testid="tooltip-slider-headcount">
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs" data-testid="tooltip-content-slider-headcount">
                                <p className="text-xs">Each FTE reduction adds ~£80k annual savings (fully-loaded cost). This directly increases Net Annual Benefit.</p>
                              </TooltipContent>
                            </Tooltip>
                          </label>
                          <span className="text-sm font-bold text-brand-teal" data-testid="value-headcount">
                            {roiInputs.headcountDelta || 0}
                          </span>
                        </div>
                        <Slider
                          value={[roiInputs.headcountDelta || 0]}
                          onValueChange={(v) => handleSliderChange("headcountDelta", v[0])}
                          min={0}
                          max={10}
                          step={0.5}
                          data-testid="slider-headcount"
                        />
                        <p className="text-xs text-muted-foreground">
                          FTE reduction through automation and efficiency gains
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-1">
                            Implementation Cost (£k)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="opacity-60 hover:opacity-100" data-testid="tooltip-slider-implementation">
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs" data-testid="tooltip-content-slider-implementation">
                                <p className="text-xs">Higher implementation costs extend payback period and reduce ROI. Split 60% licenses, 40% integration by default.</p>
                              </TooltipContent>
                            </Tooltip>
                          </label>
                          <span className="text-sm font-bold text-brand-teal" data-testid="value-implementation">
                            {formatCurrency((roiInputs.softwareLicenses || 0) + (roiInputs.integrationCosts || 0), currency)}
                          </span>
                        </div>
                        <Slider
                          value={[(roiInputs.softwareLicenses || 0) + (roiInputs.integrationCosts || 0)]}
                          onValueChange={(v) => {
                            const total = v[0];
                            handleSliderChange("softwareLicenses", Math.round(total * 0.6));
                            handleSliderChange("integrationCosts", Math.round(total * 0.4));
                          }}
                          min={50}
                          max={1000}
                          step={25}
                          data-testid="slider-implementation"
                        />
                        <p className="text-xs text-muted-foreground">
                          Combined software licenses and integration costs
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-1">
                            Close Cycle Acceleration (days)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="opacity-60 hover:opacity-100" data-testid="tooltip-slider-close">
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs" data-testid="tooltip-content-slider-close">
                                <p className="text-xs">Faster close cycles free up finance team capacity and improve decision-making speed. Value calculated from Close Acceleration Value input.</p>
                              </TooltipContent>
                            </Tooltip>
                          </label>
                          <span className="text-sm font-bold text-brand-teal" data-testid="value-close-days">
                            {roiInputs.closeAccelerationDays || 0}
                          </span>
                        </div>
                        <Slider
                          value={[roiInputs.closeAccelerationDays || 0]}
                          onValueChange={(v) => handleSliderChange("closeAccelerationDays", v[0])}
                          min={0}
                          max={15}
                          step={1}
                          data-testid="slider-close-days"
                        />
                        <p className="text-xs text-muted-foreground">
                          Days reduced from monthly/quarterly close process
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-1">
                            Compliance Risk Avoidance (£k/year)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="opacity-60 hover:opacity-100" data-testid="tooltip-slider-compliance">
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs" data-testid="tooltip-content-slider-compliance">
                                <p className="text-xs">Quantifies risk reduction from improved controls, audit readiness, and regulatory compliance. Adds directly to annual benefits.</p>
                              </TooltipContent>
                            </Tooltip>
                          </label>
                          <span className="text-sm font-bold text-brand-teal" data-testid="value-compliance">
                            {formatCurrency(roiInputs.complianceRiskAvoidance || 0, currency)}
                          </span>
                        </div>
                        <Slider
                          value={[roiInputs.complianceRiskAvoidance || 0]}
                          onValueChange={(v) => handleSliderChange("complianceRiskAvoidance", v[0])}
                          min={0}
                          max={300}
                          step={10}
                          data-testid="slider-compliance"
                        />
                        <p className="text-xs text-muted-foreground">
                          Value of reduced regulatory and compliance risks
                        </p>
                      </div>
                    </div>
                    
                    <Accordion type="single" collapsible className="mt-6" data-testid="accordion-methodology">
                      <AccordionItem value="methodology" className="border rounded-lg px-4">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline" data-testid="accordion-trigger-methodology">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-brand-teal" />
                            How we calculated your ROI
                          </div>
                        </AccordionTrigger>
                        <AccordionContent data-testid="accordion-content-methodology">
                          <div className="space-y-4 text-sm">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-foreground">Formulas Used</h4>
                              <div className="space-y-2 text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                <div className="flex justify-between items-start gap-4">
                                  <span className="font-medium">ROI %</span>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">(Net Annual Benefit ÷ Implementation Cost) × 100</code>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                  <span className="font-medium">NPV</span>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">Σ(Cash Flow ÷ (1 + r)^t) - Initial Investment</code>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                  <span className="font-medium">Payback</span>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">Implementation Cost ÷ Net Annual Benefit × 12</code>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                  <span className="font-medium">TCO</span>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">Implementation + (Annual Operating × Years)</code>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-semibold text-foreground">Key Assumptions</h4>
                              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                                <li><span className="font-medium">Discount Rate:</span> {effectiveRoiInputs.discountRate || 8}% (cost of capital)</li>
                                <li><span className="font-medium">Investment Horizon:</span> {effectiveRoiInputs.horizonYears || 3} years</li>
                                <li><span className="font-medium">Benefit Ramp-up:</span> Year 1: {effectiveRoiInputs.benefitRampYear1 || 25}%, Year 2: {effectiveRoiInputs.benefitRampYear2 || 75}%, Year 3: {effectiveRoiInputs.benefitRampYear3 || 100}%</li>
                                <li><span className="font-medium">FTE Cost:</span> £80k fully-loaded average</li>
                                <li><span className="font-medium">Implementation:</span> 12-month typical timeline</li>
                              </ul>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-semibold text-foreground">Input Drivers</h4>
                              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                <div className="bg-muted/30 p-2 rounded">
                                  <p className="font-medium text-foreground text-xs">Benefits</p>
                                  <ul className="text-xs space-y-0.5 mt-1">
                                    <li>Process efficiency savings</li>
                                    <li>Headcount optimisation</li>
                                    <li>Close cycle acceleration</li>
                                    <li>Compliance risk avoidance</li>
                                    <li>Audit efficiency gains</li>
                                  </ul>
                                </div>
                                <div className="bg-muted/30 p-2 rounded">
                                  <p className="font-medium text-foreground text-xs">Costs</p>
                                  <ul className="text-xs space-y-0.5 mt-1">
                                    <li>Software licenses</li>
                                    <li>Integration & migration</li>
                                    <li>Change management</li>
                                    <li>Training & enablement</li>
                                    <li>Ongoing support</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-xs text-muted-foreground italic border-t pt-3">
                              Source: Constancia Benchmark Database, industry research, and your assessment responses. 
                              Adjust sliders above to model different scenarios.
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
                
                <Card data-testid="card-live-metrics">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-brand-cyan" />
                      Live Metrics Preview
                    </CardTitle>
                    <CardDescription>
                      Real-time calculations based on your scenario inputs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mb-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>Net Annual Benefit</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="opacity-60 hover:opacity-100" data-testid="tooltip-live-net-benefit">
                                <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs" data-testid="tooltip-content-live-net-benefit">
                              <p className="font-semibold text-sm">Net Annual Benefit</p>
                              <p className="text-xs text-muted-foreground">Annual value after deducting operating costs from total benefits.</p>
                              <p className="text-xs font-mono bg-muted/50 px-2 py-1 rounded mt-1">Total Benefits - Operating Costs</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="live-net-benefit">
                          {formatCurrency(roiMetrics.netAnnualBenefit, currency)}
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-gradient-to-br from-[#7FB8A3]/10 to-[#7FB8A3]/10 dark:from-[#1E2630]/20 dark:to-[#1E2630]/20 border border-[#7FB8A3] dark:border-[#12161D]">
                        <div className="flex items-center gap-2 text-[#8E4F67] dark:text-[#7FB8A3] text-sm mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Implementation Cost</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="opacity-60 hover:opacity-100" data-testid="tooltip-live-impl-cost">
                                <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs" data-testid="tooltip-content-live-impl-cost">
                              <p className="font-semibold text-sm">Implementation Cost</p>
                              <p className="text-xs text-muted-foreground">One-time investment including software, integration, and change management.</p>
                              <p className="text-xs font-mono bg-muted/50 px-2 py-1 rounded mt-1">Licenses + Integration + Migration + Training + Contingency</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-2xl font-bold text-[#8E4F67] dark:text-[#7FB8A3]" data-testid="live-impl-cost">
                          {formatCurrency(roiMetrics.totalImplementationCost, currency)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Total Annual Benefits</span>
                        <span className="font-semibold text-green-600" data-testid="live-annual-benefits">
                          {formatCurrency(roiMetrics.totalAnnualBenefits, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Annual Operating Costs</span>
                        <span className="font-semibold text-red-600" data-testid="live-annual-costs">
                          -{formatCurrency(roiMetrics.totalAnnualCosts, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">3-Year TCO</span>
                        <span className="font-semibold" data-testid="live-tco">
                          {formatCurrency(roiMetrics.totalCostOfOwnership, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Investment Grade</span>
                        <Badge 
                          className={roiMetrics.roiPercent >= 50 
                            ? "bg-green-100 text-green-700 border-green-300" 
                            : roiMetrics.roiPercent >= 25 
                              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                              : "bg-red-100 text-red-700 border-red-300"
                          }
                          data-testid="badge-investment-grade"
                        >
                          {roiMetrics.roiPercent >= 50 ? "Strong" : roiMetrics.roiPercent >= 25 ? "Moderate" : "Review"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-brand-teal" />
                        <span className="text-sm font-medium">Scenario Summary</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {roiMetrics.roiPercent >= 50 
                          ? `Strong business case with ${formatPercent(roiMetrics.roiPercent)} ROI and ${formatPayback(roiMetrics.paybackMonths)} payback. Recommend proceeding with vendor selection.`
                          : roiMetrics.roiPercent >= 25
                            ? `Moderate ROI of ${formatPercent(roiMetrics.roiPercent)}. Consider adjusting scope or phasing to improve returns.`
                            : `ROI of ${formatPercent(roiMetrics.roiPercent)} requires further analysis. Review assumptions and consider alternative approaches.`
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <ROIAnalyticsCharts
                  yearByYearData={yearByYearData.rows}
                  totalImplementationCost={roiMetrics.totalImplementationCost}
                  totalAnnualBenefits={roiMetrics.totalAnnualBenefits}
                  totalAnnualCosts={roiMetrics.totalAnnualCosts}
                  paybackMonths={roiMetrics.paybackMonths}
                  horizonYears={effectiveRoiInputs.horizonYears || 3}
                  processEfficiencyPercent={effectiveRoiInputs.processEfficiencyPercent ?? undefined}
                  baselineOperatingCost={effectiveRoiInputs.baselineOperatingCost ?? undefined}
                  currency={currency === "GBP" ? "£" : currency === "USD" ? "$" : "€"}
                />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="vendors" className="space-y-6" data-testid="tab-content-vendors">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-brand-teal" />
                    Vendor Shortlist
                  </CardTitle>
                  <CardDescription>
                    Top 3 recommended EPM vendors based on your organisation profile and assessment results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {vendorRecommendations.length > 0 ? (
                    <>
                      <div className="grid md:grid-cols-3 gap-6">
                        {vendorRecommendations.map((vendor, idx) => (
                          <VendorCard key={vendor.vendorId} vendor={vendor} rank={idx} />
                        ))}
                      </div>
                      
                      <Accordion type="single" collapsible className="mt-6" data-testid="accordion-vendor-scoring">
                        <AccordionItem value="scoring" className="border rounded-lg px-4">
                          <AccordionTrigger className="text-sm font-medium hover:no-underline" data-testid="accordion-trigger-vendor-scoring">
                            <div className="flex items-center gap-2">
                              <Scale className="h-4 w-4 text-brand-teal" />
                              How we scored vendor affinity
                            </div>
                          </AccordionTrigger>
                          <AccordionContent data-testid="accordion-content-vendor-scoring">
                            <div className="space-y-4 text-sm">
                              <p className="text-muted-foreground">
                                Vendor recommendations are generated using a 5-factor weighted scoring model based on your assessment results and organisation profile.
                              </p>
                              
                              <div className="space-y-3">
                                <h4 className="font-semibold text-foreground">Scoring Factors</h4>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-[#8E4F67]" />
                                      <span className="font-medium">Dimension Match</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={40} className="w-20 h-2" />
                                      <span className="text-xs text-muted-foreground w-8">40%</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground ml-4">
                                    How well vendor capabilities align with your maturity scores across 8 finance dimensions (FP&A, Reporting, Controls, Technology, etc.)
                                  </p>
                                  
                                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-[#8E4F67]" />
                                      <span className="font-medium">Industry Alignment</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={20} className="w-20 h-2" />
                                      <span className="text-xs text-muted-foreground w-8">20%</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground ml-4">
                                    Vendor's track record and specialisation in your industry sector ({company?.sector || "your industry"})
                                  </p>
                                  
                                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-[#8E4F67]" />
                                      <span className="font-medium">Company Size Fit</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={20} className="w-20 h-2" />
                                      <span className="text-xs text-muted-foreground w-8">20%</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground ml-4">
                                    Suitability of vendor for organisations of your size ({company?.sizeBand?.replace("_", " ") || "your size band"})
                                  </p>
                                  
                                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-[#8E4F67]" />
                                      <span className="font-medium">Tech Stack Compatibility</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={10} className="w-20 h-2" />
                                      <span className="text-xs text-muted-foreground w-8">10%</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground ml-4">
                                    Integration compatibility with existing ERP and technology infrastructure
                                  </p>
                                  
                                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-[#8E4F67]" />
                                      <span className="font-medium">Ambition Level</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={10} className="w-20 h-2" />
                                      <span className="text-xs text-muted-foreground w-8">10%</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground ml-4">
                                    Match between vendor capabilities and your transformation ambition (conservative, moderate, aggressive)
                                  </p>
                                </div>
                              </div>
                              
                              {vendorRecommendations.length > 0 && (
                                <div className="space-y-3 border-t pt-4">
                                  <h4 className="font-semibold text-foreground">Score Breakdown</h4>
                                  <div className="space-y-2">
                                    {vendorRecommendations.map((vendor, idx) => (
                                      <div key={vendor.vendorId} className="flex items-center justify-between p-2 bg-muted/30 rounded" data-testid={`vendor-score-breakdown-${vendor.vendorId}`}>
                                        <div className="flex items-center gap-2">
                                          <span className="h-5 w-5 rounded text-xs flex items-center justify-center bg-[#8E4F67] text-white font-bold">
                                            {idx + 1}
                                          </span>
                                          <span className="font-medium">{vendor.vendorName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="text-xs text-muted-foreground space-x-2 hidden sm:flex">
                                            <span>Dim: {Math.round(vendor.breakdown.dimensionScore * 100)}%</span>
                                            <span>Ind: {Math.round(vendor.breakdown.industryScore * 100)}%</span>
                                            <span>Size: {Math.round(vendor.breakdown.sizeScore * 100)}%</span>
                                          </div>
                                          <span className="font-bold text-brand-teal">{Math.round(vendor.normalizedScore)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <p className="text-xs text-muted-foreground italic border-t pt-3">
                                Source: Constancia Benchmark Database, vendor capability matrices, and industry research. 
                                Scores are indicative and should inform, not replace, detailed vendor evaluation.
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Complete your assessment to receive vendor recommendations</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="risks" className="space-y-6" data-testid="tab-content-risks">
              <Card data-testid="card-risk-indicators">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-brand-teal" />
                    Risk Assessment
                  </CardTitle>
                  <CardDescription>
                    Traffic light indicators for key transformation risk areas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {riskIndicators.map((indicator, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 rounded-lg border bg-card"
                        data-testid={`card-risk-${indicator.category.toLowerCase()}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`h-4 w-4 rounded-full ${getRiskColor(indicator.level)} mt-0.5 flex-shrink-0`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium">{indicator.category} Risk</span>
                              <Badge className={getRiskBadgeVariant(indicator.level)} data-testid={`badge-risk-level-${indicator.category.toLowerCase()}`}>
                                {indicator.level.charAt(0).toUpperCase() + indicator.level.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{indicator.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="findings" className="space-y-6" data-testid="tab-content-findings">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card data-testid="card-key-insights">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-brand-cyan" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiAnalysis?.keyInsights && aiAnalysis.keyInsights.length > 0 ? (
                      <ul className="space-y-3">
                        {aiAnalysis.keyInsights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-[#7FB8A3]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-brand-teal">{idx + 1}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{insight}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>AI insights will appear after assessment completion</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card data-testid="card-recommendations">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-brand-teal" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(assessment.recommendations && assessment.recommendations.length > 0) || (aiAnalysis?.recommendations && aiAnalysis.recommendations.length > 0) ? (
                      <ul className="space-y-3">
                        {(assessment.recommendations || aiAnalysis?.recommendations || []).slice(0, 5).map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">{rec}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Recommendations will appear after assessment completion</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {assessment.quickWins && assessment.quickWins.length > 0 && (
                <Card data-testid="card-quick-wins">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Quick Wins
                    </CardTitle>
                    <CardDescription>
                      Immediate actions that can deliver early value
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-3">
                      {assessment.quickWins.map((win, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
                          <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{win}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
