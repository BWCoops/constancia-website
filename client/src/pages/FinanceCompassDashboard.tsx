import { memo, useCallback, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Play,
  Eye,
  Download,
  FileText,
  Plus,
  BarChart3,
  RefreshCw,
  Calendar,
  Mail,
  Target,
  BookOpen,
  Users,
  TrendingUp,
  ClipboardList,
  Gauge,
  Layers,
  Shield,
  Server,
  Database,
  Sparkles,
  Info
} from "lucide-react";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  CompassIcon,
  PreAssessmentIcon,
  FullAssessmentIcon,
} from "@/components/finance-compass-icons";
import { Calculator, Percent, Scale, DollarSign, Settings } from "lucide-react";
import { FinanceCompassRadarChart } from "@/components/finance-compass/RadarChart";
import { GapAnalysisCard } from "@/components/finance-compass/GapAnalysisCard";
import { BenchmarkComparison } from "@/components/finance-compass/BenchmarkComparison";
import { formatCurrency, formatPercent, formatPayback } from "@shared/roi-calculator";
import {
  useFinanceCompassDashboardData,
  useAssessmentResults,
  useRoiMetrics,
  calculateKPIs,
  type UserAssessment
} from "@/hooks/useFinanceCompassDashboardData";
import { ChatbotWidget } from "@/components/finance-compass/ChatbotWidget";

const DIMENSION_CONFIG: Record<string, {
  name: string;
  shortName: string;
  icon: typeof TrendingUp;
  color: string;
  description: string;
  tooltipContent: {
    measures: string;
    goodIndicators: string;
    improvementAreas: string;
  };
}> = {
  financial_planning_analysis: {
    name: "Financial Planning & Analysis",
    shortName: "FP&A",
    icon: TrendingUp,
    color: "#8E4F67",
    description: "Budgeting, forecasting, scenario planning, and strategic finance",
    tooltipContent: {
      measures: "Assesses budgeting, forecasting, scenario planning, and strategic finance capabilities including driver-based planning and rolling forecasts.",
      goodIndicators: "75%+ indicates mature FP&A with integrated planning, accurate forecasts, and strong business partnering.",
      improvementAreas: "Below 50% suggests reliance on manual processes, limited scenario analysis, and disconnected planning cycles."
    }
  },
  management_reporting: {
    name: "Management Reporting",
    shortName: "Reporting",
    icon: BarChart3,
    color: "#7FB8A3",
    description: "Dashboards, analytics, KPIs, and insight delivery",
    tooltipContent: {
      measures: "Evaluates dashboards, analytics, KPI frameworks, and the ability to deliver timely, actionable insights to stakeholders.",
      goodIndicators: "75%+ indicates self-service analytics, real-time dashboards, and insights that drive decisions.",
      improvementAreas: "Below 50% suggests manual report generation, delayed insights, and limited KPI visibility."
    }
  },
  consolidation_close: {
    name: "Consolidation & Close",
    shortName: "Close",
    icon: RefreshCw,
    color: "#252826",
    description: "Financial close, consolidation, intercompany, and period-end processes",
    tooltipContent: {
      measures: "Assesses financial close efficiency, consolidation automation, intercompany eliminations, and period-end process maturity.",
      goodIndicators: "75%+ indicates fast close cycles (5 days or less), automated consolidation, and minimal manual adjustments.",
      improvementAreas: "Below 50% suggests extended close timelines, manual reconciliations, and spreadsheet-heavy processes."
    }
  },
  financial_controls_compliance: {
    name: "Controls & Compliance",
    shortName: "Controls",
    icon: Shield,
    color: "#6366F1",
    description: "Internal controls, audit, regulatory, and risk management",
    tooltipContent: {
      measures: "Evaluates internal controls effectiveness, audit readiness, regulatory compliance, and financial risk management frameworks.",
      goodIndicators: "75%+ indicates automated controls, clean audits, proactive compliance, and integrated risk monitoring.",
      improvementAreas: "Below 50% suggests manual controls, audit findings, reactive compliance, and control gaps."
    }
  },
  technology_systems: {
    name: "Technology & Systems",
    shortName: "Technology",
    icon: Server,
    color: "#10B981",
    description: "ERP, EPM, integration, cloud, and automation",
    tooltipContent: {
      measures: "Assesses ERP and EPM platform maturity, system integration, cloud adoption, and process automation levels.",
      goodIndicators: "75%+ indicates modern integrated platforms, cloud-first strategy, and high automation levels.",
      improvementAreas: "Below 50% suggests legacy systems, manual integrations, limited automation, and technical debt."
    }
  },
  organisation_people: {
    name: "Organisation & People",
    shortName: "People",
    icon: Users,
    color: "#C77A93",
    description: "Structure, talent, skills, culture, and business partnering",
    tooltipContent: {
      measures: "Evaluates finance team structure, talent development, skill capabilities, culture of continuous improvement, and business partnering effectiveness.",
      goodIndicators: "75%+ indicates skilled teams, clear development paths, strong business partnering, and change-ready culture.",
      improvementAreas: "Below 50% suggests skill gaps, siloed operations, limited training, and resistance to change."
    }
  },
  data_analytics: {
    name: "Data & Analytics",
    shortName: "Data",
    icon: Database,
    color: "#EC4899",
    description: "Data governance, master data, analytics maturity, and AI",
    tooltipContent: {
      measures: "Assesses data governance, master data management, data quality, and advanced analytics maturity across finance.",
      goodIndicators: "75%+ indicates trusted single source of truth, strong governance, and advanced predictive capabilities.",
      improvementAreas: "Below 50% suggests data silos, quality issues, inconsistent definitions, and limited analytics adoption."
    }
  },
  ai_machine_learning: {
    name: "AI & Machine Learning",
    shortName: "AI/ML",
    icon: Sparkles,
    color: "#5E8D7A",
    description: "AI adoption, ML models, automation, and intelligent insights",
    tooltipContent: {
      measures: "Evaluates AI and machine learning adoption in finance including intelligent automation, predictive models, and AI-driven insights.",
      goodIndicators: "75%+ indicates production AI use cases, ML-enhanced forecasting, and intelligent process automation.",
      improvementAreas: "Below 50% suggests early exploration phase, limited AI adoption, and manual analytical processes."
    }
  }
};

const MATURITY_LEVELS = [
  { min: 0, max: 20, label: "Foundational", color: "#DC2626" },   // Red - critical gap
  { min: 21, max: 40, label: "Developing", color: "#EA580C" },    // Orange - needs work
  { min: 41, max: 60, label: "Established", color: "#CA8A04" },   // Gold/Amber - average
  { min: 61, max: 80, label: "Advanced", color: "#0891B2" },      // Cyan/Teal - good
  { min: 81, max: 100, label: "Leading", color: "#16A34A" }       // Green - excellent
];

function getMaturityLevel(score: number): { label: string; color: string } {
  for (const level of MATURITY_LEVELS) {
    if (score >= level.min && score <= level.max) {
      return { label: level.label, color: level.color };
    }
  }
  return { label: "Unknown", color: "#6B7280" };
}

const tierConfig: Record<string, {
  name: string;
  tagline: string;
  icon: typeof PreAssessmentIcon;
  gradient: string;
  questions: number;
  duration: string;
}> = {
  pre_assessment: {
    name: "Pre-Assessment",
    tagline: "Strategic Analysis",
    icon: PreAssessmentIcon,
    gradient: "from-[#8E4F67] to-[#252826]",
    questions: 50,
    duration: "20-25 minutes",
  },
  full: {
    name: "Full Assessment",
    tagline: "Complete Transformation",
    icon: FullAssessmentIcon,
    gradient: "from-[#252826] to-[#8E4F67]",
    questions: 74,
    duration: "35-45 minutes",
  },
};

const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  in_progress: {
    label: "In Progress",
    color: "text-brand-teal",
    bgColor: "bg-[#8E4F67]/10",
    borderColor: "border-[#8E4F67]/30",
  },
  initial_complete: {
    label: "Initial Complete",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  completed: {
    label: "Completed",
    color: "text-brand-teal",
    bgColor: "bg-[#8E4F67]/10",
    borderColor: "border-[#8E4F67]/30",
  },
  analysed: {
    label: "Analysed",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  report_generated: {
    label: "Report Ready",
    color: "text-[#252826]",
    bgColor: "bg-brand-navy/10",
    borderColor: "border-[#252826]/30",
  },
  not_started: {
    label: "Not Started",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProgressEstimate(tier: string, status: string, actualProgress?: number): number {
  if (status === "completed" || status === "analysed" || status === "report_generated") {
    return 100;
  }
  if (status === "initial_complete") {
    return 90;
  }
  // Use actual progress from API if available
  if (actualProgress !== undefined && actualProgress >= 0) {
    return Math.min(actualProgress, 100);
  }
  // Fallback estimates if no actual progress provided
  if (status === "in_progress") {
    return tier === "pre_assessment" ? 30 : 20;
  }
  return 0;
}

interface KpiIndicatorProps {
  label: string;
  value: number;
  icon: typeof TrendingUp;
  color: string;
  description: string;
  tooltipContent?: {
    measures: string;
    goodIndicators: string;
    improvementAreas: string;
  };
}

const KpiIndicator = memo(function KpiIndicator({
  label,
  value,
  icon: Icon,
  color,
  description,
  tooltipContent
}: KpiIndicatorProps) {
  const maturity = getMaturityLevel(value);
  const testId = `kpi-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const getScoreContext = (score: number) => {
    if (score >= 75) return tooltipContent?.goodIndicators || "Strong performance in this area.";
    if (score >= 50) return "Moderate maturity with room for targeted improvements.";
    return tooltipContent?.improvementAreas || "Significant opportunity for improvement.";
  };

  return (
    <Card
      className="p-4 hover-elevate"
      data-testid={testId}
      role="article"
      aria-label={`${label}: ${value}% - ${maturity.label}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className="text-sm font-medium text-[#252826] dark:text-white truncate cursor-help flex items-center gap-1"
                  data-testid={`tooltip-trigger-dimension-${testId}`}
                >
                  {label}
                  <Info className="h-3 w-3 opacity-40" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3" side="top" data-testid={`tooltip-content-dimension-${testId}`}>
                <div className="space-y-2">
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{tooltipContent?.measures || description}</p>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs font-medium" style={{ color: maturity.color }}>{getScoreContext(value)}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-lg font-bold cursor-help"
                  style={{ color: maturity.color }}
                  data-testid={`kpi-value-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-label={`${value} percent`}
                >
                  {value}%
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3" side="top" data-testid={`tooltip-content-score-${testId}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: maturity.color }} />
                    <p className="font-semibold text-sm">{maturity.label} Maturity ({value}%)</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{getScoreContext(value)}</p>
                  <div className="text-xs border-t pt-2 mt-2 space-y-1">
                    <p className="text-muted-foreground">Maturity Scale:</p>
                    <div className="flex flex-wrap gap-1">
                      {MATURITY_LEVELS.map(level => (
                        <span 
                          key={level.label} 
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{ 
                            backgroundColor: `${level.color}20`, 
                            color: level.color,
                            fontWeight: level.label === maturity.label ? 600 : 400
                          }}
                        >
                          {level.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground truncate">{description}</p>
            <Badge
              className="text-[10px] px-1.5 py-0"
              style={{ backgroundColor: `${maturity.color}20`, color: maturity.color, borderColor: `${maturity.color}40` }}
            >
              {maturity.label}
            </Badge>
          </div>
          <div
            className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} progress`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${value}%`, backgroundColor: maturity.color }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
});

interface MaturityScorecardProps {
  dimensionScores: Record<string, number>;
  overallScore?: number;
}

const MaturityScorecard = memo(function MaturityScorecard({
  dimensionScores,
  overallScore
}: MaturityScorecardProps) {
  const overallMaturity = overallScore !== undefined ? getMaturityLevel(overallScore) : null;

  const getOverallScoreContext = (score: number) => {
    if (score >= 75) return "Your finance function demonstrates leading practices across most dimensions. Focus on maintaining excellence and driving continuous improvement.";
    if (score >= 60) return "Good maturity with solid foundations. Target specific dimensions for improvement to reach best-in-class performance.";
    if (score >= 40) return "Moderate maturity with clear opportunities. Prioritise key dimensions to accelerate your transformation journey.";
    return "Early stage maturity with significant transformation potential. A structured improvement programme will deliver substantial value.";
  };

  const getDimensionScoreContext = (key: string, score: number) => {
    const config = DIMENSION_CONFIG[key];
    if (!config?.tooltipContent) return "";
    if (score >= 75) return config.tooltipContent.goodIndicators;
    if (score >= 50) return "Moderate capability with room for targeted improvements.";
    return config.tooltipContent.improvementAreas;
  };

  return (
    <div className="space-y-4" role="region" aria-label="Maturity Scorecard">
      {overallMaturity && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-[#252826]/5 to-[#8E4F67]/5 border border-[#8E4F67]/20">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-brand-teal" aria-hidden="true" />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium text-[#252826] dark:text-white cursor-help flex items-center gap-1">
                  Overall Maturity
                  <Info className="h-3 w-3 opacity-40" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3" side="top" data-testid="tooltip-content-overall-maturity">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Overall Finance Maturity Score</p>
                  <p className="text-xs text-muted-foreground">
                    A weighted average of all dimension scores, representing your finance function's overall transformation readiness and capability maturity.
                  </p>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs font-medium" style={{ color: overallMaturity.color }}>
                      {getOverallScoreContext(overallScore!)}
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-xl font-bold cursor-help"
                  style={{ color: overallMaturity.color }}
                  data-testid="text-overall-score"
                  aria-label={`Overall score: ${Math.round(overallScore!)} percent`}
                >
                  {Math.round(overallScore!)}%
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3" side="top" data-testid="tooltip-content-overall-score">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: overallMaturity.color }} />
                    <p className="font-semibold text-sm">{overallMaturity.label} Maturity</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{getOverallScoreContext(overallScore!)}</p>
                  <div className="text-xs border-t pt-2 mt-2">
                    <p className="text-muted-foreground mb-1">Maturity Scale:</p>
                    <div className="flex flex-wrap gap-1">
                      {MATURITY_LEVELS.map(level => (
                        <span 
                          key={level.label} 
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{ 
                            backgroundColor: `${level.color}20`, 
                            color: level.color,
                            fontWeight: level.label === overallMaturity.label ? 600 : 400
                          }}
                        >
                          {level.min}-{level.max}%: {level.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Badge
              style={{ backgroundColor: `${overallMaturity.color}20`, color: overallMaturity.color, borderColor: `${overallMaturity.color}40` }}
              data-testid="badge-overall-maturity"
            >
              {overallMaturity.label}
            </Badge>
          </div>
        </div>
      )}

      <ul className="space-y-2" aria-label="Dimension scores">
        {Object.entries(DIMENSION_CONFIG).map(([key, config]) => {
          const score = dimensionScores[key] ?? 0;
          const maturity = getMaturityLevel(score);
          const DimensionIcon = config.icon;

          return (
            <li key={key} className="group" data-testid={`dimension-row-${key}`}>
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${config.color}15` }}
                    aria-hidden="true"
                  >
                    <DimensionIcon className="h-3.5 w-3.5" style={{ color: config.color }} />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className="text-sm font-medium text-[#252826] dark:text-white truncate cursor-help flex items-center gap-1"
                        data-testid={`tooltip-trigger-dimension-${key}`}
                      >
                        {config.shortName}
                        <Info className="h-2.5 w-2.5 opacity-40" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3" side="top" data-testid={`tooltip-content-dimension-${key}`}>
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">{config.name}</p>
                        <p className="text-xs text-muted-foreground">{config.tooltipContent.measures}</p>
                        <div className="border-t pt-2 mt-2">
                          <p className="text-xs font-medium" style={{ color: maturity.color }}>
                            {getDimensionScoreContext(key, score)}
                          </p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${config.shortName} score`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${score}%`,
                        backgroundColor: maturity.color
                      }}
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="text-xs font-semibold w-10 text-right cursor-help"
                        style={{ color: maturity.color }}
                        data-testid={`text-dimension-score-${key}`}
                      >
                        {Math.round(score)}%
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3" side="left" data-testid={`tooltip-content-score-${key}`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: maturity.color }} />
                          <p className="font-semibold text-sm">{maturity.label} ({Math.round(score)}%)</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{getDimensionScoreContext(key, score)}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed" role="list" aria-label="Maturity level legend">
        {MATURITY_LEVELS.map((level) => (
          <Tooltip key={level.label}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help" role="listitem">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: level.color }} aria-hidden="true" />
                <span>{level.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="p-2" side="top">
              <p className="text-xs font-medium" style={{ color: level.color }}>{level.label}: {level.min}-{level.max}%</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
});

interface RoiKpiPanelProps {
  assessmentId: string;
}

const RoiKpiPanel = memo(function RoiKpiPanel({ assessmentId }: RoiKpiPanelProps) {
  const { metrics, currency, hasMetrics, isLoading } = useRoiMetrics(assessmentId);

  const handleNavigateToRoi = useCallback(() => {
    window.location.href = `/finance-compass/roi/${assessmentId}`;
  }, [assessmentId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" role="status" aria-label="Loading ROI metrics">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  if (!hasMetrics) {
    return (
      <Card className="p-6 border-dashed border-2 border-[#8E4F67]/30 bg-[#8E4F67]/5" data-testid="card-roi-empty-state">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center" aria-hidden="true">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-[#252826] dark:text-white">Build Your Business Case</h4>
            <p className="text-sm text-muted-foreground">Use our ROI Calculator to quantify your finance transformation benefits</p>
          </div>
          <Button
            className="bg-[#8E4F67] hover:bg-brand-navy"
            onClick={handleNavigateToRoi}
            data-testid="button-start-roi-wizard"
            aria-label="Calculate ROI for your transformation"
          >
            <Calculator className="h-4 w-4 mr-2" aria-hidden="true" />
            Calculate ROI
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3" role="region" aria-label="ROI metrics dashboard">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-gradient-to-br from-[#7FB8A3]/10 to-[#8E4F67]/20 dark:from-[#7FB8A3]/10 dark:to-[#8E4F67]/20 border-[#8E4F67]/30 dark:border-[#8E4F67]/40">
          <div className="flex items-center gap-2 text-brand-teal dark:text-brand-cyan text-xs mb-1">
            <Percent className="h-3 w-3" aria-hidden="true" />
            <span>ROI</span>
          </div>
          <div className="text-xl font-bold text-[#252826] dark:text-brand-cyan" data-testid="kpi-roi" aria-label={`Return on Investment: ${formatPercent(metrics!.roiPercent)}`}>
            {formatPercent(metrics!.roiPercent)}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-[#7FB8A3]/10 to-[#7FB8A3]/10 dark:from-[#252826]/20 dark:to-[#252826]/20 border-[#7FB8A3] dark:border-[#252826]">
          <div className="flex items-center gap-2 text-[#8E4F67] dark:text-[#7FB8A3] text-xs mb-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>Payback</span>
          </div>
          <div className="text-xl font-bold text-[#8E4F67] dark:text-[#7FB8A3]" data-testid="kpi-payback" aria-label={`Payback period: ${formatPayback(metrics!.paybackMonths)}`}>
            {formatPayback(metrics!.paybackMonths)}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs mb-1">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            <span>NPV</span>
          </div>
          <div className="text-xl font-bold text-purple-700 dark:text-purple-300" data-testid="kpi-npv" aria-label={`Net Present Value: ${formatCurrency(metrics!.npvValue, currency)}`}>
            {formatCurrency(metrics!.npvValue, currency)}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs mb-1">
            <DollarSign className="h-3 w-3" aria-hidden="true" />
            <span>TCO</span>
          </div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-300" data-testid="kpi-tco" aria-label={`Total Cost of Ownership: ${formatCurrency(metrics!.totalCostOfOwnership, currency)}`}>
            {formatCurrency(metrics!.totalCostOfOwnership, currency)}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-[#7FB8A3]/10 to-[#7FB8A3]/10 dark:from-[#252826]/20 dark:to-[#252826]/20 border-[#7FB8A3] dark:border-[#252826]">
          <div className="flex items-center gap-2 text-[#8E4F67] dark:text-[#7FB8A3] text-xs mb-1">
            <Scale className="h-3 w-3" aria-hidden="true" />
            <span>BCR</span>
          </div>
          <div className="text-xl font-bold text-[#8E4F67] dark:text-[#7FB8A3]" data-testid="kpi-bcr" aria-label={`Benefit Cost Ratio: ${metrics!.benefitCostRatio.toFixed(2)}x`}>
            {metrics!.benefitCostRatio.toFixed(2)}x
          </div>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNavigateToRoi}
          data-testid="button-edit-roi-drivers"
          aria-label="Edit ROI drivers and assumptions"
        >
          <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
          Edit ROI Drivers
        </Button>
      </div>
    </div>
  );
});

// Assessment Journey View - Shows the flow: Pre-Assessment → ROI → Full Assessment → Final Report
interface AssessmentJourneyViewProps {
  assessments: UserAssessment[];
  onStartAssessment: (tier: string) => void;
  roiMetrics?: { roiPercent: number; paybackMonths: number; npvValue: number } | null;
}

const VALIDATION_PIPELINE_LAYERS = [
  { layer: 1, name: "Base Scoring", icon: Calculator, description: "Context-aware scoring engine", color: "bg-brand-navy" },
  { layer: 2, name: "Fragmentation Check", icon: Layers, description: "Multi-vendor fragmentation detection", color: "bg-[#8E4F67]" },
  { layer: 2.5, name: "Correlation Matrix", icon: Target, description: "8x8 dimension correlations", color: "bg-purple-500" },
  { layer: 3, name: "Business Rules", icon: Shield, description: "Vendor benchmarks validation", color: "bg-[#7FB8A3]" },
  { layer: 4, name: "AI Advisory", icon: Sparkles, description: "GPT validation layer", color: "bg-[#7FB8A3]/100" },
  { layer: 5, name: "Intelligence Engine", icon: TrendingUp, description: "Root cause & stakeholder insights", color: "bg-indigo-500" },
];

const AssessmentJourneyView = memo(function AssessmentJourneyView({ 
  assessments, 
  onStartAssessment,
  roiMetrics 
}: AssessmentJourneyViewProps) {
  // Find pre-assessment and full assessment
  const preAssessment = assessments.find(a => a.tier === "pre_assessment");
  const fullAssessment = assessments.find(a => a.tier === "full");
  
  // Check completion status
  const isPreCompleted = preAssessment && ["completed", "analysed", "report_generated", "initial_complete", "processing"].includes(preAssessment.status);
  const isPreInProgress = preAssessment?.status === "in_progress";
  const isFullCompleted = fullAssessment && ["completed", "analysed", "report_generated", "initial_complete", "processing"].includes(fullAssessment.status);
  const isFullInProgress = fullAssessment?.status === "in_progress";
  const isFullAnalysed = fullAssessment && ["analysed", "report_generated"].includes(fullAssessment.status);
  
  // If full assessment exists and is completed, consider pre-assessment as implicitly done
  // This handles cases where full assessment was completed but pre-assessment is still in progress
  const preImplicitlyDone = isFullCompleted;
  const effectivePreCompleted = isPreCompleted || preImplicitlyDone;
  
  // Check if ROI is configured - roiMetrics exists means profile was saved (roiPercent can be 0 or negative)
  const hasRoiData = roiMetrics !== null && roiMetrics !== undefined;
  
  // Journey flow enforcement: Pre → ROI → Full → Report
  // Can only start full assessment if pre-assessment is completed (or implicitly done)
  const canStartFull = effectivePreCompleted;
  const isFinalReportReady = isFullAnalysed;
  
  // Total questions answered
  const totalQuestionsAnswered = (effectivePreCompleted ? 50 : 0) + (isFullCompleted ? 74 : 0);
  
  // Journey stages with enforced flow
  const stages = [
    {
      id: "pre",
      name: "Pre-Assessment",
      questions: 50,
      duration: "20-25 min",
      status: effectivePreCompleted ? "completed" : isPreInProgress ? "in_progress" : preAssessment ? "started" : "not_started",
      icon: PreAssessmentIcon,
      description: "Strategic context & current state",
      actionLabel: effectivePreCompleted ? "View Results" : isPreInProgress ? "Continue" : "Start",
      actionHref: preAssessment ? (isPreCompleted ? `/finance-compass/results/${preAssessment.id}` : `/finance-compass/assess/${preAssessment.id}`) : null,
      onAction: !preAssessment && !preImplicitlyDone ? () => onStartAssessment("pre_assessment") : undefined,
      locked: false, // Pre-assessment is always available to start
    },
    {
      id: "roi",
      name: "ROI Analysis",
      questions: null,
      duration: "Auto-calculated",
      status: hasRoiData ? "completed" : effectivePreCompleted ? "ready" : "locked",
      icon: Calculator,
      description: "Business case & payback analysis",
      actionLabel: hasRoiData ? "View ROI" : effectivePreCompleted ? "Configure ROI" : "Complete Pre-Assessment first",
      // Use the first available assessment ID for ROI (prefer full, then pre)
      actionHref: effectivePreCompleted ? `/finance-compass/roi/${fullAssessment?.id || preAssessment?.id}` : null,
      locked: !effectivePreCompleted, // Unlocks after Pre-Assessment is completed
    },
    {
      id: "full",
      name: "Full Assessment",
      questions: 74,
      duration: "35-45 min",
      status: isFullCompleted ? "completed" : isFullInProgress ? "in_progress" : canStartFull ? "ready" : "locked",
      icon: FullAssessmentIcon,
      description: "Deep-dive capability analysis",
      actionLabel: isFullCompleted ? "View Results" : isFullInProgress ? "Continue" : canStartFull ? "Start" : "Complete Pre-Assessment first",
      actionHref: fullAssessment ? (isFullCompleted ? `/finance-compass/results/${fullAssessment.id}` : `/finance-compass/assess/${fullAssessment.id}`) : null,
      onAction: !fullAssessment && canStartFull ? () => onStartAssessment("full") : undefined,
      locked: !canStartFull && !isFullCompleted, // Locked unless pre is done OR full already exists
    },
    {
      id: "report",
      name: "Final Report",
      questions: null,
      duration: "Combined insights",
      status: isFinalReportReady ? "completed" : "locked",
      icon: FileText,
      description: "Full report, AI-validated",
      actionLabel: isFinalReportReady ? "View Report" : "Complete Full Assessment",
      actionHref: isFinalReportReady && fullAssessment ? `/finance-compass/results/${fullAssessment.id}` : null,
      locked: !isFinalReportReady, // Locked until full assessment is analysed
    },
  ];

  // Stage-specific details for richer context
  const stageDetails: Record<string, { highlights: string[]; metrics?: string }> = {
    pre: {
      highlights: ["Strategic context analysis", "Current state mapping", "Pain point identification"],
      metrics: "50 questions across 8 dimensions"
    },
    roi: {
      highlights: ["NPV calculation", "Payback analysis", "Benefit quantification"],
      metrics: "Auto-calculated from responses"
    },
    full: {
      highlights: ["Deep capability analysis", "Maturity scoring", "Gap identification"],
      metrics: "74 questions with correlation analysis"
    },
    report: {
      highlights: ["AI-powered insights", "Stakeholder recommendations", "Transformation roadmap"],
      metrics: "6-layer validated analysis"
    }
  };

  return (
    <div className="space-y-8" data-testid="assessment-journey-view">
      {/* Journey Timeline - Horizontal Flow */}
      <div className="relative">
        <div className="relative grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
          {stages.map((stage, idx) => {
            const IconComponent = stage.icon;
            const isCompleted = stage.status === "completed";
            const isInProgress = stage.status === "in_progress";
            const isReady = stage.status === "ready";
            const isLocked = stage.status === "locked" || stage.locked;
            const details = stageDetails[stage.id];
            
            return (
              <motion.div 
                key={stage.id}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ 
                  duration: 0.6, 
                  delay: idx * 0.2,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                className="relative"
                data-testid={`journey-stage-${stage.id}`}
              >
                {/* Stage Card with enhanced styling */}
                <motion.div 
                  whileHover={!isLocked ? { scale: 1.02, y: -4 } : {}}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`
                    relative p-5 rounded-2xl border transition-all h-full min-h-[320px] flex flex-col overflow-hidden
                    ${isCompleted ? "bg-gradient-to-br from-[#8E4F67]/10 to-[#7FB8A3]/10 border-[#8E4F67] shadow-lg shadow-[#8E4F67]/20" : ""}
                    ${isInProgress ? "bg-gradient-to-br from-[#252826]/10 to-[#8E4F67]/10 border-[#8E4F67]/60 shadow-md" : ""}
                    ${isReady ? "bg-gradient-to-br from-white to-[#8E4F67]/5 dark:from-gray-900 dark:to-[#8E4F67]/10 border-[#8E4F67]/40 hover:border-[#8E4F67] hover:shadow-lg" : ""}
                    ${isLocked ? "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700" : ""}
                    ${!isCompleted && !isInProgress && !isReady && !isLocked ? "bg-background border-border" : ""}
                  `}
                >
                  {/* Decorative gradient orb for completed/active states */}
                  {(isCompleted || isInProgress) && (
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-[#8E4F67]/20 to-[#7FB8A3]/20 rounded-full blur-2xl" />
                  )}
                  
                  {/* Step indicator with pulsing animation for active */}
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div 
                      animate={isInProgress ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`
                        w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg
                        ${isCompleted ? "bg-gradient-to-br from-[#8E4F67] to-[#7FB8A3] text-white" : ""}
                        ${isInProgress ? "bg-gradient-to-br from-[#252826] to-[#8E4F67] text-white" : ""}
                        ${isReady ? "bg-gradient-to-br from-[#8E4F67] to-[#252826] text-white" : ""}
                        ${isLocked ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : ""}
                        ${!isCompleted && !isInProgress && !isReady && !isLocked ? "bg-brand-navy text-white" : ""}
                      `}
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                    </motion.div>
                    <div className="flex-1">
                      <h4 className={`font-semibold text-base ${isLocked ? "text-muted-foreground" : "text-[#252826] dark:text-white"}`}>
                        {stage.name}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] mt-1 ${
                          isCompleted ? "border-[#8E4F67] text-brand-teal" : 
                          isInProgress ? "border-[#252826] text-[#252826] dark:border-[#8E4F67] dark:text-brand-teal" : 
                          isReady ? "border-[#8E4F67]/50 text-brand-teal" :
                          "border-gray-300 text-gray-500"
                        }`}
                      >
                        {isCompleted ? "Completed" : isInProgress ? "In Progress" : isReady ? "Ready" : "Locked"}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Icon with enhanced styling */}
                  <div className="flex justify-center mb-4">
                    <motion.div 
                      animate={isCompleted ? { rotate: [0, 5, -5, 0] } : {}}
                      transition={{ duration: 4, repeat: Infinity }}
                      className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg
                        ${isCompleted ? "bg-gradient-to-br from-[#8E4F67] to-[#7FB8A3]" : ""}
                        ${isInProgress ? "bg-gradient-to-br from-[#252826] to-[#8E4F67]" : ""}
                        ${isReady ? "bg-gradient-to-br from-[#8E4F67] to-[#252826]" : ""}
                        ${isLocked ? "bg-gray-300 dark:bg-gray-600" : ""}
                        ${!isCompleted && !isInProgress && !isReady && !isLocked ? "bg-gradient-to-br from-[#252826] to-[#8E4F67]" : ""}
                      `}
                    >
                      <IconComponent className="h-8 w-8 text-white" />
                    </motion.div>
                  </div>
                  
                  {/* Description and highlights */}
                  <div className="text-center space-y-3 flex-1">
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                    
                    {details && (
                      <div className="space-y-2">
                        <ul className="text-xs text-left space-y-1.5">
                          {details.highlights.map((highlight, hIdx) => (
                            <motion.li 
                              key={hIdx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + (hIdx * 0.1) }}
                              className={`flex items-center gap-2 ${isLocked ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isCompleted ? "bg-[#8E4F67]" : 
                                isInProgress ? "bg-brand-navy dark:bg-[#8E4F67]" : 
                                isReady ? "bg-[#8E4F67]/60" : 
                                "bg-gray-300"
                              }`} />
                              {highlight}
                            </motion.li>
                          ))}
                        </ul>
                        {details.metrics && (
                          <div className={`text-[11px] font-medium pt-2 border-t border-dashed ${
                            isLocked ? "text-muted-foreground/50 border-gray-200" : "text-brand-teal border-[#8E4F67]/20"
                          }`}>
                            {details.metrics}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Button */}
                  <div className="mt-auto pt-4">
                    {stage.actionHref && !isLocked ? (
                      <Link href={stage.actionHref}>
                        <Button 
                          className={`w-full ${
                            isCompleted 
                              ? "bg-gradient-to-r from-[#8E4F67] to-[#7FB8A3] hover:from-[#8E4F67]/90 hover:to-[#7FB8A3]/90 text-white shadow-md" 
                              : "bg-gradient-to-r from-[#252826] to-[#8E4F67] hover:from-[#252826]/90 hover:to-[#8E4F67]/90 text-white shadow-md"
                          }`}
                          data-testid={`button-journey-${stage.id}`}
                        >
                          {stage.actionLabel}
                        </Button>
                      </Link>
                    ) : stage.onAction && !isLocked ? (
                      <Button 
                        className="w-full bg-gradient-to-r from-[#252826] to-[#8E4F67] hover:from-[#252826]/90 hover:to-[#8E4F67]/90 text-white shadow-md"
                        onClick={stage.onAction}
                        data-testid={`button-journey-${stage.id}`}
                      >
                        {stage.actionLabel}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full opacity-60" 
                        disabled
                        data-testid={`button-journey-${stage.id}-locked`}
                      >
                        {stage.actionLabel}
                      </Button>
                    )}
                  </div>
                </motion.div>
                
                {/* Flowing connector for mobile - vertical */}
                {idx < stages.length - 1 && (
                  <div className="flex justify-center py-4 lg:hidden">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 40 }}
                      transition={{ duration: 0.5, delay: idx * 0.2 }}
                      className={`w-0.5 ${
                        isCompleted ? "bg-gradient-to-b from-[#8E4F67] to-[#7FB8A3]" : "bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600"
                      }`}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Combined Assessment Summary */}
      <Card className="bg-gradient-to-br from-[#252826]/5 to-[#8E4F67]/5 border-[#8E4F67]/20">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center">
                <Gauge className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-[#252826] dark:text-white">Assessment Progress</h4>
                <p className="text-sm text-muted-foreground">
                  {totalQuestionsAnswered > 0 
                    ? `${totalQuestionsAnswered} of 124 questions completed (Pre + Full combined)`
                    : "Start your Pre-Assessment to begin the journey"}
                </p>
              </div>
            </div>
            
            {totalQuestionsAnswered > 0 && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-teal">{Math.round((totalQuestionsAnswered / 124) * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
                {hasRoiData && (
                  <>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-brand-cyan">{formatPercent(roiMetrics!.roiPercent)}</div>
                      <div className="text-xs text-muted-foreground">ROI</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-brand-teal">{formatPayback(roiMetrics!.paybackMonths)}</div>
                      <div className="text-xs text-muted-foreground">Payback</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 6-Layer Validation Pipeline */}
      {isFullCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-[#252826]/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#252826]/5 via-transparent to-[#8E4F67]/5 pointer-events-none" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center gap-3">
                <motion.div 
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center shadow-lg"
                >
                  <Layers className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <CardTitle className="text-lg text-[#252826] dark:text-white">6-Layer AI Validation Pipeline</CardTitle>
                  <CardDescription className="text-sm">Your scores pass through our rigorous validation system</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {/* Flowing connection line for desktop */}
              <div className="absolute top-[40px] left-[8%] right-[8%] h-1 bg-gradient-to-r from-[#252826]/20 via-[#8E4F67]/40 to-[#7FB8A3]/20 rounded-full hidden lg:block" />
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {VALIDATION_PIPELINE_LAYERS.map((layer, idx) => {
                  const IconComponent = layer.icon;
                  return (
                    <motion.div 
                      key={layer.layer}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="relative p-4 rounded-xl border bg-gradient-to-br from-white to-[#8E4F67]/5 dark:from-gray-900 dark:to-[#8E4F67]/10 border-[#8E4F67]/20 hover:border-[#8E4F67]/50 transition-all shadow-sm hover:shadow-md"
                      data-testid={`validation-layer-${layer.layer}`}
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-xl ${layer.color} flex items-center justify-center shadow-lg`}>
                            <IconComponent className="h-6 w-6 text-white" />
                          </div>
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 + idx * 0.1 }}
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#7FB8A3] flex items-center justify-center shadow-md"
                          >
                            <CheckCircle2 className="h-3 w-3 text-[#252826]" />
                          </motion.div>
                        </div>
                        <div>
                          <Badge variant="outline" className="text-[10px] border-[#8E4F67]/30 text-brand-teal mb-1">
                            Layer {layer.layer}
                          </Badge>
                          <div className="text-xs font-semibold text-[#252826] dark:text-white">{layer.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{layer.description}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
});

interface AssessmentCardProps {
  assessment: UserAssessment;
}

const AssessmentCard = memo(function AssessmentCard({ assessment }: AssessmentCardProps) {
  const tier = tierConfig[assessment.tier] || tierConfig.pre_assessment;
  const status = statusConfig[assessment.status] || statusConfig.not_started;
  const IconComponent = tier.icon;
  const progress = getProgressEstimate(assessment.tier, assessment.status, assessment.progress);
  const { toast } = useToast();

  const isInProgress = assessment.status === "in_progress";
  const isAnalysed = ["analysed", "report_generated"].includes(assessment.status);
  // Include 'processing' in completed states - assessment is done, just analyzing
  const isCompleted = ["completed", "analysed", "report_generated", "initial_complete", "processing"].includes(assessment.status);

  const { dimensionScores, overallScore, rawAssessmentScore, isLoading: resultsLoading, hasDimensionScores, aiAnalysis } = useAssessmentResults(
    assessment.id,
    isAnalysed
  );

  const handleResume = useCallback(() => {
    window.location.href = `/finance-compass/assess/${assessment.id}`;
  }, [assessment.id]);

  const handleViewResults = useCallback(() => {
    window.location.href = `/finance-compass/results/${assessment.id}`;
  }, [assessment.id]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label={`${tier.name} assessment - ${status.label}`}
    >
      <Card className="hover-elevate h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${tier.gradient} shadow-lg`} aria-hidden="true">
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg text-[#252826] dark:text-white" data-testid={`text-tier-name-${assessment.id}`}>
                  {tier.name}
                </CardTitle>
                <CardDescription className="text-sm">{tier.tagline}</CardDescription>
              </div>
            </div>
            <Badge className={`${status.bgColor} ${status.color} ${status.borderColor}`} data-testid={`badge-status-${assessment.id}`}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          {isInProgress && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-brand-teal" data-testid={`text-progress-${assessment.id}`}>{progress}%</span>
              </div>
              <Progress
                value={progress}
                className="h-2"
                aria-label={`Assessment progress: ${progress}%`}
              />
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>Started</span>
            </dt>
            <dd className="font-medium text-[#252826] dark:text-white" data-testid={`text-started-${assessment.id}`}>
              {formatDate(assessment.startedAt)}
            </dd>

            <dt className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Updated</span>
            </dt>
            <dd className="font-medium text-[#252826] dark:text-white" data-testid={`text-updated-${assessment.id}`}>
              {formatDateTime(assessment.updatedAt)}
            </dd>
          </dl>

          {isAnalysed && (
            <div className="pt-3 border-t border-dashed">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-brand-teal" aria-hidden="true" />
                <span className="text-sm font-medium text-[#252826] dark:text-white">Finance Maturity Scorecard</span>
              </div>
              {resultsLoading ? (
                <div className="flex items-center justify-center py-4" role="status" aria-label="Loading scorecard">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
                </div>
              ) : hasDimensionScores ? (
                <MaturityScorecard dimensionScores={dimensionScores} overallScore={rawAssessmentScore} />
              ) : (
                <div className="text-center py-3 text-xs text-muted-foreground">
                  Analysis in progress...
                </div>
              )}
            </div>
          )}

          {isAnalysed && aiAnalysis && (aiAnalysis.summary || (aiAnalysis.keyInsights && aiAnalysis.keyInsights.length > 0)) && (
            <div className="pt-3 border-t border-dashed" data-testid={`ai-insights-${assessment.id}`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-[#5E8D7A]" aria-hidden="true" />
                <span className="text-sm font-medium text-[#252826] dark:text-white">AI Insights</span>
              </div>
              {aiAnalysis.summary && (
                <p className="text-xs text-muted-foreground mb-3" data-testid={`ai-summary-${assessment.id}`}>
                  {aiAnalysis.summary}
                </p>
              )}
              {aiAnalysis.keyInsights && aiAnalysis.keyInsights.length > 0 && (
                <ul className="space-y-1.5" aria-label="Key insights from AI analysis">
                  {aiAnalysis.keyInsights.slice(0, 3).map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-brand-teal flex-shrink-0" aria-hidden="true" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 pt-3 border-t">
          {isInProgress && (
            <Button
              className="flex-1 bg-[#8E4F67] hover:bg-brand-navy"
              onClick={handleResume}
              data-testid={`button-resume-${assessment.id}`}
              aria-label={`Resume ${tier.name}`}
            >
              <Play className="h-4 w-4 mr-2" aria-hidden="true" />
              Resume
            </Button>
          )}

          {isCompleted && (
            <Button
              variant="outline"
              className="flex-1 border-[#8E4F67] text-brand-teal hover:bg-[#8E4F67]/10"
              onClick={handleViewResults}
              data-testid={`button-view-results-${assessment.id}`}
              aria-label={`View results for ${tier.name}`}
            >
              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
              View Results
            </Button>
          )}

          {isAnalysed && (
            <a
              href={`/api/finance-compass/public/assessments/${assessment.id}/pdf/generate`}
              className="flex-1 min-w-[120px]"
            >
              <Button
                variant="outline"
                className="w-full border-[#8E4F67] text-brand-teal hover:bg-[#8E4F67]/10"
                data-testid={`button-download-pdf-${assessment.id}`}
                aria-label={`Download PDF report for ${tier.name}`}
              >
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                PDF Report
              </Button>
            </a>
          )}
        </CardFooter>
      </Card>
    </motion.article>
  );
});

function AssessmentCardSkeleton() {
  return (
    <Card className="h-full" role="status" aria-label="Loading assessment">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

interface StartNewAssessmentCardProps {
  tier: string;
  onStart: (tier: string) => void;
  hasFullAssessmentAccess?: boolean;
}

const StartNewAssessmentCard = memo(function StartNewAssessmentCard({
  tier,
  onStart,
  hasFullAssessmentAccess
}: StartNewAssessmentCardProps) {
  const config = tierConfig[tier];
  if (!config) return null;

  const IconComponent = config.icon;
  const isPremium = tier === "full";
  const showContactUs = isPremium && hasFullAssessmentAccess === false;

  const handleClick = useCallback(() => {
    if (showContactUs) {
      window.location.href = "/contact";
    } else {
      onStart(tier);
    }
  }, [showContactUs, onStart, tier]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label={`Start new ${config.name}`}
    >
      <Card className={`hover-elevate h-full ${showContactUs ? "border-dashed border-2 border-[#252826]/30" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${config.gradient}`} aria-hidden="true">
              <IconComponent className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base text-[#252826] dark:text-white">{config.name}</CardTitle>
              <CardDescription className="text-xs">{config.tagline}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>{config.questions} questions</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{config.duration}</span>
          </div>
        </CardContent>
        <CardFooter className="pt-3">
          <Button
            className={showContactUs ? "w-full" : "w-full bg-[#8E4F67] hover:bg-brand-navy"}
            variant={showContactUs ? "outline" : "default"}
            onClick={handleClick}
            data-testid={`button-start-${tier}`}
            aria-label={showContactUs ? `Contact us about ${config.name}` : `Start ${config.name}`}
          >
            {showContactUs ? (
              <>
                Contact Us
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Start Assessment
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.article>
  );
});

interface AnalyticsDashboardProps {
  assessments: UserAssessment[];
  latestCompletedId?: string;
}

const AnalyticsDashboard = memo(function AnalyticsDashboard({
  assessments,
  latestCompletedId
}: AnalyticsDashboardProps) {
  const completedAssessments = useMemo(() => {
    return assessments.filter(a =>
      ["completed", "analysed", "report_generated", "initial_complete"].includes(a.status)
    );
  }, [assessments]);

  const hasCompletedAssessments = completedAssessments.length > 0;
  const assessmentIdToUse = latestCompletedId || completedAssessments[0]?.id;

  const { dimensionScores, weightedDimensionScores, overallScore, isLoading, hasDimensionScores, hasWeightedScores } = useAssessmentResults(assessmentIdToUse, !!assessmentIdToUse);

  // Use weighted dimension scores for the summary dashboard (70/30 blend of pre and full assessment)
  // Only show real data - no sample/mock data fallback
  const scoresForAnalytics = useMemo(() => {
    if (hasWeightedScores) return weightedDimensionScores;
    if (hasDimensionScores) return dimensionScores;
    return {};
  }, [hasWeightedScores, weightedDimensionScores, hasDimensionScores, dimensionScores]);

  const hasRealData = hasDimensionScores && Object.keys(scoresForAnalytics).length > 0;
  const displayOverallScore = overallScore ?? 0;

  const kpis = useMemo(() => {
    return calculateKPIs(scoresForAnalytics);
  }, [scoresForAnalytics]);

  const overallMaturity = getMaturityLevel(displayOverallScore);

  const topStrengths = useMemo(() => {
    return Object.entries(scoresForAnalytics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, score]) => ({ key, score, config: DIMENSION_CONFIG[key] }))
      .filter(item => item.config);
  }, [scoresForAnalytics]);

  const topOpportunities = useMemo(() => {
    return Object.entries(scoresForAnalytics)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([key, score]) => ({ key, score, config: DIMENSION_CONFIG[key] }))
      .filter(item => item.config);
  }, [scoresForAnalytics]);

  if (isLoading && hasCompletedAssessments) {
    return (
      <section className="mb-10" data-testid="section-analytics-dashboard" aria-label="Loading analytics">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg lg:col-span-2" />
        </div>
      </section>
    );
  }

  if (!hasCompletedAssessments || !hasRealData) {
    return (
      <section className="mb-10" data-testid="section-analytics-dashboard" aria-labelledby="analytics-dashboard-heading">
        <div className="mb-6">
          <h2 id="analytics-dashboard-heading" className="text-xl font-semibold text-[#252826] dark:text-white flex items-center gap-2">
            <Gauge className="h-5 w-5 text-brand-teal" aria-hidden="true" />
            Maturity Summary
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete an assessment to see your finance transformation maturity scores
          </p>
        </div>
        <Card className="border-[#8E4F67]/20 bg-[#8E4F67]/5" data-testid="card-empty-maturity-state">
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-[#8E4F67]/20 flex items-center justify-center mb-4" aria-hidden="true">
                <Gauge className="h-8 w-8 text-brand-teal" />
              </div>
              <h3 className="font-semibold text-lg text-[#252826] dark:text-white mb-2">No Maturity Data Yet</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-md">
                Complete your first assessment to unlock your personalised finance transformation maturity scorecard and dimension analysis.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                <span>Choose a path below to get started</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-10" data-testid="section-analytics-dashboard" aria-labelledby="analytics-dashboard-heading">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 id="analytics-dashboard-heading" className="text-xl font-semibold text-[#252826] dark:text-white flex items-center gap-2">
            <Gauge className="h-5 w-5 text-brand-teal" aria-hidden="true" />
            Maturity Summary
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your finance transformation maturity at a glance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="relative overflow-hidden" data-testid="card-overall-score">
          <div className="absolute inset-0 bg-gradient-to-br from-[#252826]/5 to-[#8E4F67]/10" aria-hidden="true" />
          <CardContent className="relative pt-6">
            <div className="flex flex-col items-center text-center">
              <div
                className="h-28 w-28 rounded-full flex items-center justify-center mb-3 border-4"
                style={{ borderColor: overallMaturity.color, backgroundColor: `${overallMaturity.color}15` }}
                aria-hidden="true"
              >
                <div className="text-center">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: overallMaturity.color }}
                    data-testid="text-overall-maturity-score"
                  >
                    {Math.round(displayOverallScore)}%
                  </span>
                </div>
              </div>
              <Badge
                className="text-sm px-3 py-1 mb-1"
                style={{ backgroundColor: `${overallMaturity.color}20`, color: overallMaturity.color, borderColor: `${overallMaturity.color}40` }}
                data-testid="badge-maturity-level"
              >
                {overallMaturity.label}
              </Badge>
              <span className="text-xs font-medium text-[#252826] dark:text-white mb-4">Overall Maturity Score</span>
              
              {/* Benchmark & Insight Section */}
              <div className="w-full pt-3 border-t border-[#8E4F67]/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Industry Average</span>
                  <span className="font-medium text-[#252826] dark:text-white">48%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Your Position</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${displayOverallScore >= 48 ? 'text-brand-teal border-[#8E4F67]/40' : 'text-amber-600 border-amber-400/40'}`}
                    data-testid="badge-benchmark-position"
                  >
                    {displayOverallScore >= 48 
                      ? `+${Math.round(displayOverallScore - 48)}% above avg` 
                      : `${Math.round(displayOverallScore - 48)}% below avg`}
                  </Badge>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground italic" data-testid="text-maturity-insight">
                    {displayOverallScore >= 70 
                      ? "Strong foundation for advanced transformation"
                      : displayOverallScore >= 50 
                      ? "Good base with targeted improvement opportunities"
                      : "Significant value potential from modernisation"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-dimension-summary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#252826] dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-teal" aria-hidden="true" />
              Dimension Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(DIMENSION_CONFIG).slice(0, 8).map(([key, config]) => {
                const score = scoresForAnalytics[key] ?? 0;
                const maturity = getMaturityLevel(score);
                const DimensionIcon = config.icon;
                const getDimensionScoreContextLocal = (s: number) => {
                  if (s >= 75) return config.tooltipContent.goodIndicators;
                  if (s >= 50) return "Moderate capability with room for targeted improvements.";
                  return config.tooltipContent.improvementAreas;
                };
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div
                        className="p-3 rounded-lg border bg-card hover-elevate cursor-help"
                        data-testid={`dimension-card-${key}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="h-6 w-6 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${config.color}15` }}
                            aria-hidden="true"
                          >
                            <DimensionIcon className="h-3.5 w-3.5" style={{ color: config.color }} />
                          </div>
                          <span className="text-xs font-medium text-[#252826] dark:text-white truncate flex items-center gap-1">
                            {config.shortName}
                            <Info className="h-2.5 w-2.5 opacity-40" />
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className="text-lg font-bold"
                            style={{ color: maturity.color }}
                            data-testid={`dimension-score-${key}`}
                          >
                            {Math.round(score)}%
                          </span>
                          <div
                            className="h-1.5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={score}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${score}%`, backgroundColor: maturity.color }}
                            />
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3" side="top" data-testid={`tooltip-dimension-overview-${key}`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: maturity.color }} />
                          <p className="font-semibold text-sm">{config.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{config.tooltipContent.measures}</p>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="font-semibold text-xs" style={{ color: maturity.color }}>{maturity.label}</span>
                            <span className="text-xs text-muted-foreground">({Math.round(score)}%)</span>
                          </div>
                          <p className="text-xs" style={{ color: maturity.color }}>{getDimensionScoreContextLocal(score)}</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" data-testid="kpi-panel">
        <KpiIndicator
          label="Finance Efficiency"
          value={kpis.financeEfficiency}
          icon={RefreshCw}
          color="#10B981"
          description="Process automation & technology"
          tooltipContent={{
            measures: "Composite score measuring process automation, technology maturity, close efficiency, and operational excellence across your finance function.",
            goodIndicators: "75%+ indicates highly automated processes, modern technology stack, and optimised operations driving efficiency gains.",
            improvementAreas: "Below 50% suggests manual processes, legacy systems, and significant opportunities to automate and streamline operations."
          }}
        />
        <KpiIndicator
          label="AI Enablement"
          value={kpis.aiEnablement}
          icon={Sparkles}
          color="#5E8D7A"
          description="AI & data analytics maturity"
          tooltipContent={{
            measures: "Composite score reflecting AI adoption, machine learning capabilities, data analytics maturity, and intelligent automation across finance.",
            goodIndicators: "75%+ indicates production AI use cases, ML-enhanced insights, and advanced analytics driving better decisions.",
            improvementAreas: "Below 50% means you're early in your AI journey. Strong runway to use AI to get ahead of less prepared peers."
          }}
        />
        <KpiIndicator
          label="Transformation Readiness"
          value={kpis.transformationReadiness}
          icon={Target}
          color="#8E4F67"
          description="Overall maturity composite"
          tooltipContent={{
            measures: "Overall assessment of your finance function's readiness for digital transformation, combining people, process, technology, and governance factors.",
            goodIndicators: "75%+ indicates a transformation-ready organisation with strong foundations for successful EPM and finance transformation initiatives.",
            improvementAreas: "Below 50% suggests foundational work needed before major transformation, but also significant value opportunity from improvement."
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-top-strengths">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#252826] dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-teal" aria-hidden="true" />
              Top Strengths
            </CardTitle>
            <CardDescription className="text-xs">Your highest performing dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {topStrengths.map(({ key, score, config }) => {
                const maturity = getMaturityLevel(score);
                const DimensionIcon = config.icon;
                return (
                  <li key={key} className="flex items-center justify-between" data-testid={`strength-${key}`}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}15` }}
                        aria-hidden="true"
                      >
                        <DimensionIcon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      <span className="text-sm font-medium text-[#252826] dark:text-white">{config.shortName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: maturity.color }}>{Math.round(score)}%</span>
                      <Badge
                        className="text-[10px] px-1.5"
                        style={{ backgroundColor: `${maturity.color}20`, color: maturity.color }}
                      >
                        {maturity.label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="card-top-opportunities">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#252826] dark:text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" aria-hidden="true" />
              Improvement Opportunities
            </CardTitle>
            <CardDescription className="text-xs">Focus areas for transformation</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {topOpportunities.map(({ key, score, config }) => {
                const maturity = getMaturityLevel(score);
                const DimensionIcon = config.icon;
                return (
                  <li key={key} className="flex items-center justify-between" data-testid={`opportunity-${key}`}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}15` }}
                        aria-hidden="true"
                      >
                        <DimensionIcon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      <span className="text-sm font-medium text-[#252826] dark:text-white">{config.shortName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: maturity.color }}>{Math.round(score)}%</span>
                      <Badge
                        className="text-[10px] px-1.5"
                        style={{ backgroundColor: `${maturity.color}20`, color: maturity.color }}
                      >
                        {maturity.label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
});

interface PathFlowCardProps {
  path: "pre_assessment" | "full" | "benefits";
  onStart: (tier: string) => void;
  hasFullAssessmentAccess?: boolean;
  latestAssessmentId?: string;
}

const JOURNEY_STAGE_CONFIG = {
  pre_assessment: {
    stage: 1,
    name: "Discovery",
    subtitle: "Pre-Assessment",
    description: "Establish your baseline maturity across 8 dimensions and identify priority focus areas",
    duration: "20-25 minutes",
    questions: "50 questions",
    gradient: "from-[#8E4F67] to-[#7FB8A3]",
    icon: PreAssessmentIcon,
    features: [
      "Finance Maturity Scorecard",
      "Priority Areas Identification",
      "Industry Benchmarking",
      "Initial Recommendations"
    ]
  },
  full: {
    stage: 2,
    name: "Deep Analysis",
    subtitle: "Full Assessment",
    description: "Build on your discovery with detailed capability mapping and transformation roadmap",
    duration: "35-45 minutes",
    questions: "74 questions",
    gradient: "from-[#252826] to-[#8E4F67]",
    icon: FullAssessmentIcon,
    features: [
      "Complete KPI Registry",
      "Governance Calendar",
      "12-14 Week Workshop Plan",
      "Stakeholder Mapping"
    ]
  },
  benefits: {
    stage: 3,
    name: "Value Realisation",
    subtitle: "ROI Dashboard",
    description: "Quantify your business case and track transformation benefits over time",
    duration: "Real-time",
    questions: "Ongoing",
    gradient: "from-[#7FB8A3] to-[#8E4F67]",
    icon: BarChart3,
    features: [
      "ROI Calculator",
      "Business Case Builder",
      "Benefits Realisation",
      "Performance Tracking"
    ]
  }
};

const JourneyStageCard = memo(function JourneyStageCard({
  path,
  onStart,
  hasFullAssessmentAccess,
  latestAssessmentId
}: PathFlowCardProps) {
  const config = JOURNEY_STAGE_CONFIG[path];
  const IconComponent = config.icon;
  const isPremium = path === "full";
  const isBenefits = path === "benefits";
  const showContactUs = isPremium && hasFullAssessmentAccess === false;

  const handleClick = useCallback(() => {
    if (isBenefits && latestAssessmentId) {
      window.location.href = `/finance-compass/roi/${latestAssessmentId}`;
    } else if (showContactUs) {
      window.location.href = "/contact";
    } else if (!isBenefits) {
      onStart(path);
    }
  }, [isBenefits, latestAssessmentId, showContactUs, onStart, path]);

  const buttonLabel = isBenefits
    ? latestAssessmentId ? "Open Dashboard" : "Complete Assessment First"
    : showContactUs
    ? "Contact Us"
    : "Start Assessment";

  const isDisabled = isBenefits && !latestAssessmentId;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: path === "pre_assessment" ? 0 : path === "full" ? 0.1 : 0.2 }}
      className="h-full"
    >
      <Card className={`h-full flex flex-col hover-elevate ${showContactUs ? "border-dashed border-2" : ""}`} data-testid={`card-path-${path}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge className="text-xs font-semibold bg-gradient-to-r from-[#252826] to-[#8E4F67] text-white border-0">
              Stage {config.stage}
            </Badge>
            {isPremium && (
              <Badge className="bg-brand-navy text-white text-[10px]">Premium</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${config.gradient} shadow-lg`} aria-hidden="true">
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-[#252826] dark:text-white">{config.name}</CardTitle>
              <CardDescription className="text-xs">{config.subtitle}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-4">
          <p className="text-sm text-muted-foreground">{config.description}</p>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{config.duration}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>{config.questions}</span>
            </div>
          </div>

          <ul className="space-y-2">
            {config.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand-teal flex-shrink-0" aria-hidden="true" />
                <span className="text-[#252826] dark:text-white">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="pt-4 border-t">
          <Button
            className={`w-full ${isDisabled ? "" : showContactUs ? "" : "bg-[#8E4F67] hover:bg-brand-navy"}`}
            variant={isDisabled ? "secondary" : showContactUs ? "outline" : "default"}
            onClick={handleClick}
            disabled={isDisabled}
            data-testid={`button-path-${path}`}
          >
            {isDisabled ? (
              <span className="text-muted-foreground">Complete Assessment First</span>
            ) : (
              <>
                {showContactUs ? (
                  <>Contact Us<ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" /></>
                ) : isBenefits ? (
                  <><BarChart3 className="h-4 w-4 mr-2" aria-hidden="true" />{buttonLabel}</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" aria-hidden="true" />{buttonLabel}</>
                )}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.article>
  );
});

interface JourneyToValueSectionProps {
  onStart: (tier: string) => void;
  hasFullAssessmentAccess?: boolean;
  latestAssessmentId?: string;
}

const JourneyToValueSection = memo(function JourneyToValueSection({
  onStart,
  hasFullAssessmentAccess,
  latestAssessmentId
}: JourneyToValueSectionProps) {
  return (
    <section className="mb-12" aria-labelledby="journey-heading" data-testid="section-journey-to-value">
      <div className="mb-6">
        <h2 id="journey-heading" className="text-xl font-semibold text-[#252826] dark:text-white flex items-center gap-2">
          <CompassIcon className="h-5 w-5 text-brand-teal" aria-hidden="true" />
          Your Journey to Value
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          A structured approach to finance transformation - from discovery through to value realisation
        </p>
      </div>

      {/* Journey flow indicator */}
      <div className="relative">
        {/* Connecting flow line - desktop only */}
        <div className="absolute top-1/2 left-[15%] right-[15%] h-1 bg-gradient-to-r from-[#8E4F67]/20 via-[#252826]/30 to-[#7FB8A3]/20 rounded-full hidden md:block -translate-y-1/2 z-0" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <JourneyStageCard
            path="pre_assessment"
            onStart={onStart}
            hasFullAssessmentAccess={hasFullAssessmentAccess}
            latestAssessmentId={latestAssessmentId}
          />
          <JourneyStageCard
            path="full"
            onStart={onStart}
            hasFullAssessmentAccess={hasFullAssessmentAccess}
            latestAssessmentId={latestAssessmentId}
          />
          <JourneyStageCard
            path="benefits"
            onStart={onStart}
            hasFullAssessmentAccess={hasFullAssessmentAccess}
            latestAssessmentId={latestAssessmentId}
          />
        </div>
      </div>
    </section>
  );
});

export default function FinanceCompassDashboard() {
  const {
    sessionData,
    sessionLoading,
    sessionError,
    isVerified,
    assessments,
    assessmentsLoading,
    assessmentsError,
    handleStartAssessment
  } = useFinanceCompassDashboardData();
  
  // Get ROI metrics for any completed assessment (prefer full, then pre)
  const roiAssessmentId = useMemo(() => {
    // First try to find a completed full assessment
    const fullAssessment = assessments.find(a => a.tier === "full" && ["completed", "analysed", "report_generated"].includes(a.status));
    if (fullAssessment) return fullAssessment.id;
    // Fall back to completed pre-assessment
    const preAssessment = assessments.find(a => a.tier === "pre_assessment" && ["completed", "analysed", "report_generated", "initial_complete", "processing"].includes(a.status));
    return preAssessment?.id;
  }, [assessments]);
  
  const { metrics: roiMetricsData } = useRoiMetrics(roiAssessmentId);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16 sm:pt-20 pb-16" role="main" aria-label="Loading dashboard">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-teal" aria-label="Loading" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16 sm:pt-20 pb-16" role="main" aria-label="Session error">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-muted-foreground text-sm">Unable to load your session. Please try again.</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  data-testid="button-retry-session"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Link href="/finance-compass">
                  <Button variant="default" data-testid="button-back-to-fc">
                    Back to FinanceCompass
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pt-16 sm:pt-20 pb-16" role="main" aria-label="Redirecting">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-teal" aria-label="Redirecting" />
              <p className="text-muted-foreground text-sm">Redirecting to FinanceCompass...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="My Dashboard | FinanceCompass | Constancia"
        description="View and manage your finance transformation assessments. Track your progress, view results, and download reports."
        keywords={["finance dashboard", "EPM assessment", "finance transformation", "assessment results"]}
      />

      <main className="pt-16 sm:pt-20 pb-16" role="main" aria-label="FinanceCompass Dashboard">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="mb-6" aria-label="Breadcrumb">
            <Link href="/finance-compass">
              <Button
                variant="ghost"
                size="sm"
                className="text-brand-teal hover:text-[#252826] -ml-2"
                data-testid="button-back-to-landing"
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Back to FinanceCompass
              </Button>
            </Link>
          </nav>

          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-start gap-4 flex-wrap">
              <div className="h-14 w-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] shadow-lg" aria-hidden="true">
                <CompassIcon className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#252826] dark:text-white" data-testid="text-welcome-message">
                    Welcome back, {sessionData?.firstName}!
                  </h1>
                  <Badge className="bg-[#8E4F67]/10 text-brand-teal border-[#8E4F67]/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                    Verified
                  </Badge>
                </div>
                <p className="text-muted-foreground flex items-center gap-2 text-sm" data-testid="text-user-email">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {sessionData?.email}
                </p>
              </div>
            </div>
          </motion.header>

          <AnalyticsDashboard
            assessments={assessments}
            latestCompletedId={assessments.find(a => ["completed", "analysed", "report_generated", "initial_complete"].includes(a.status))?.id}
          />

          <JourneyToValueSection
            onStart={handleStartAssessment}
            hasFullAssessmentAccess={sessionData?.hasFullAssessmentAccess}
            latestAssessmentId={assessments[0]?.id}
          />

          {/* ROI & Business Case - Only shown when a FULL assessment is completed */}
          {(() => {
            const completedFullAssessment = assessments.find(
              a => a.tier === "full" && ["completed", "analysed", "report_generated"].includes(a.status)
            );
            const hasAnyAssessment = assessments.length > 0;
            
            if (completedFullAssessment) {
              return (
                <section className="mb-12" aria-labelledby="roi-heading">
                  <div className="mb-6">
                    <h2 id="roi-heading" className="text-xl font-semibold text-[#252826] dark:text-white flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-brand-teal" aria-hidden="true" />
                      ROI & Business Case
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Financial metrics from your transformation business case
                    </p>
                  </div>
                  <RoiKpiPanel assessmentId={completedFullAssessment.id} />
                </section>
              );
            } else if (hasAnyAssessment) {
              return (
                <section className="mb-12" aria-labelledby="roi-heading">
                  <div className="mb-6">
                    <h2 id="roi-heading" className="text-xl font-semibold text-[#252826] dark:text-white flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-brand-teal" aria-hidden="true" />
                      ROI & Business Case
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Financial metrics from your transformation business case
                    </p>
                  </div>
                  <Card className="p-6 border-dashed border-2 border-[#8E4F67]/30 bg-[#8E4F67]/5" data-testid="card-roi-locked">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#252826]/20 to-[#8E4F67]/20 flex items-center justify-center" aria-hidden="true">
                        <Calculator className="h-6 w-6 text-brand-teal/60" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#252826] dark:text-white">Complete the Full Assessment to Unlock</h4>
                        <p className="text-sm text-muted-foreground">
                          ROI & Business Case analysis is available after completing the Full Assessment. Start your Full Assessment to access detailed financial projections and transformation business case.
                        </p>
                      </div>
                      <Button
                        className="bg-[#8E4F67] hover:bg-brand-navy"
                        onClick={() => handleStartAssessment("full")}
                        data-testid="button-start-full-for-roi"
                        aria-label="Start Full Assessment to unlock ROI analysis"
                      >
                        <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                        Start Full Assessment
                      </Button>
                    </div>
                  </Card>
                </section>
              );
            }
            return null;
          })()}

          <section className="mb-12" aria-labelledby="assessments-heading">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
              <div>
                <h2 id="assessments-heading" className="text-xl font-semibold text-[#252826] dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-teal" aria-hidden="true" />
                  Your Assessment Journey
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete each stage to unlock your full transformation insights
                </p>
              </div>
            </div>

            {assessmentsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : assessmentsError ? (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center">
                    <AlertCircle className="h-10 w-10 text-destructive mb-4" aria-hidden="true" />
                    <h3 className="font-semibold text-lg mb-2">Unable to load assessments</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      There was an error loading your assessments. Please try refreshing the page.
                    </p>
                    <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry-load">
                      <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AssessmentJourneyView 
                assessments={assessments}
                onStartAssessment={handleStartAssessment}
                roiMetrics={roiMetricsData}
              />
            )}
          </section>

        </div>
      </main>

      <Footer />
      
      <ChatbotWidget />
    </div>
  );
}
