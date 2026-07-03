import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3,
  Globe,
  Monitor,
  Clock,
  Users,
  Target,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Building2,
  Briefcase,
  DollarSign,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Filter as FilterIcon,
  ArrowDown,
  ArrowRight,
  Lightbulb,
  Bot,
  Activity,
  XCircle,
  PlayCircle,
  Shield,
  Database,
  Zap,
  Flag,
  Download,
  Sliders,
  Timer,
  GitMerge,
  GitCompare,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend, ComposedChart, Area, LineChart, Line, PieChart, Pie } from "recharts";
import AdminLayout from "./AdminLayout";

interface WidgetEvent {
  id: string;
  widget: string;
  eventType: string;
  sessionId: string | null;
  questionId: string | null;
  questionNumber: number | null;
  dimension: string | null;
  answerValue: number | null;
  answerLabel: string | null;
  field: string | null;
  finalScore: number | null;
  answers: Record<string, number> | null;
  qualificationData: Record<string, string> | null;
  completionTime: number | null;
  previousScore: number | null;
  action: string | null;
  fingerprint: {
    timezone?: string;
    locale?: string;
    languages?: string;
    screen?: string;
    platform?: string;
    deviceMemory?: number;
    cores?: number;
  } | null;
  metadata: {
    answerValueStr?: string;
    dimensionKey?: string;
    maturityLevel?: string;
    rawScore?: number;
    maxPossible?: number;
    normalizedScore?: string;
    selectedVendors?: string[];
    categoryWeights?: Record<string, number>;
    vendorId?: string;
    driverId?: string;
    newWeight?: number;
    format?: string;
    // Wizard-specific fields
    category?: string;
    step?: string;
    fromStep?: string;
    industry?: string;
    preset?: string;
    action?: string;
    profile?: Record<string, any>;
  } | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface WidgetStats {
  success: boolean;
  data: {
    last24h: {
      uniqueSessions: number;
      completions: number;
      ctaClicks: number;
      impressions: number;
      conversionRate: number;
    };
    period: {
      uniqueSessions: number;
      completions: number;
      ctaClicks: number;
      impressions: number;
      conversionRate: number;
      avgScore: number;
      days: number | "all";
    };
    questionDropoff: Record<number, number>;
    totalEvents: number;
  };
}

interface DimensionAnalysisData {
  success: boolean;
  data: {
    dimensions: {
      dimension: string;
      dimensionKey: string;
      avgScore: number;
      responseCount: number;
      pctStruggling: number;
      pctMature: number;
      scoreDistribution: {
        score1: number;
        score2: number;
        score3: number;
        score4: number;
        score5: number;
      };
    }[];
    byIndustryDimension: {
      industry: string;
      dimension: string;
      avgScore: number;
      sampleSize: number;
    }[];
    funnelAnalysis: {
      questionDropoff: {
        questionNumber: number;
        sessionsAtQuestion: number;
        dropoffRate: number;
      }[];
    };
    lastUpdated: string;
  };
}

interface SessionSummary {
  sessionId: string;
  widget: string;
  events: WidgetEvent[];
  eventCount: number;
  startTime: Date;
  endTime: Date;
  status: 'completed' | 'in_progress' | 'abandoned';
  questionsAnswered: number;
  finalScore: number | null;
  qualificationData: Record<string, string> | null;
  isBotLike: boolean;
  durationSeconds: number;
}

interface WidgetTrend {
  date: string;
  totalEvents: number;
  questionAnsweredCount: number;
  qualificationCompletedCount: number;
  previewResetCount: number;
  previewCompletedCount: number;
  uniqueSessions: number;
}

interface QualityScoreBreakdown {
  sampleScore: number;
  completenessScore: number;
  varianceScore: number;
  recencyScore: number;
}

interface MarketInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  category: 'market_trend' | 'user_behaviour' | 'competitive' | 'recommendation';
  title: string;
  description: string;
  suggestedAction?: string;
  sources?: string[];
  confidence: number;
  generatedAt: string;
}

interface SegmentBreakdown {
  sessions: number;
  completions: number;
  completionRate: number;
  avgScore: number | null;
  maxScore?: number;
  minScore?: number;
}

interface IndustryBreakdown extends SegmentBreakdown {
  industry: string;
}

interface CompanySizeBreakdown extends SegmentBreakdown {
  companySize: string;
}

interface RevenueBreakdown extends SegmentBreakdown {
  revenueBand: string;
}

interface RoleBreakdown extends SegmentBreakdown {
  role: string;
}

interface Outlier {
  segment: string;
  type: string;
  value: number;
  benchmark: number;
  deviation: 'above' | 'below';
  insight: string;
}

interface WidgetAnalyticsResponse {
  success: boolean;
  data: {
    period: { days: number; startDate: string };
    trends: WidgetTrend[];
    qualityScore: { score: number; breakdown: QualityScoreBreakdown; confidence: string };
    insights: MarketInsight[];
    insightsMeta: { fromCache: boolean; nextRefresh: string; canRefresh: boolean };
    deviceBreakdown: { device: string; count: number; completionRate: number }[];
    sourceBreakdown: { source: string; count: number }[];
    topAbandonmentQuestions: { questionId: string; rate: number }[];
    segmentation: {
      industryBreakdown: IndustryBreakdown[];
      companySizeBreakdown: CompanySizeBreakdown[];
      revenueBreakdown: RevenueBreakdown[];
      roleBreakdown: RoleBreakdown[];
      outliers: Outlier[];
      benchmarks: { avgScore: number; avgCompletionRate: number };
    };
    summary: {
      totalEvents: number;
      totalSessions: number;
      completeSessions: number;
      avgCompletionRate: number;
      avgEventsPerSession: number;
    };
  };
}

interface DataQualityCombinedSummary {
  success: boolean;
  data: {
    assessments: {
      summary: {
        totalAssessments: number;
        validRecords: number;
        invalidRecords: number;
        avgQualityScore: number | null;
        avgCompletionTime: number | null;
      };
      segments: {
        byCountry: { countryCode: string; total: number; valid: number }[];
        byIndustry: { industry: string; total: number; valid: number }[];
        bySizeBand: { sizeBand: string; total: number; valid: number }[];
      };
    };
    widgets: {
      summary: {
        totalSessions: number;
        completeSessions: number;
        validSessions: number;
        invalidSessions: number;
        validPercentage: number;
        avgCompletionTime: number | null;
        avgQualityScore: number | null;
        byWidget: { widget: string; total: number; valid: number; avgScore: number | null }[];
        flagBreakdown: { flag: string; count: number }[];
      };
      segments: {
        byCountry: { countryCode: string; total: number; valid: number }[];
        byIndustry: { industry: string; total: number; valid: number }[];
        bySizeBand: { sizeBand: string; total: number; valid: number }[];
        byWidget: { widget: string; total: number; valid: number }[];
      };
    };
    combined: {
      totalValidRecords: number;
      totalInvalidRecords: number;
      overallValidPercentage: number;
    };
  };
}

interface WidgetQualityStats {
  success: boolean;
  data: {
    totalSessions: number;
    completeSessions: number;
    validSessions: number;
    invalidSessions: number;
    validPercentage: number;
    avgCompletionTime: number | null;
    avgQualityScore: number | null;
    byWidget: { widget: string; total: number; valid: number; avgScore: number | null }[];
    flagBreakdown: { flag: string; count: number }[];
  };
}

interface WidgetQualitySegments {
  success: boolean;
  data: {
    byCountry: { countryCode: string; total: number; valid: number }[];
    byIndustry: { industry: string; total: number; valid: number }[];
    bySizeBand: { sizeBand: string; total: number; valid: number }[];
    byWidget: { widget: string; total: number; valid: number }[];
  };
}

interface BackfillResult {
  success: boolean;
  data: {
    success: boolean;
    assessments: { totalAssessments: number; validRecords: number; invalidRecords: number };
    widgets: { totalSessions: number; validSessions: number; invalidSessions: number };
    durationMs: number;
    startedAt: string;
    completedAt: string;
  };
  message: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventBadgeClass(eventType: string) {
  switch (eventType) {
    case "widget_loaded":
      return "bg-slate-100 text-slate-700";
    case "qualification_answered":
      return "bg-[#7FB8A3]/10 text-[#8E4F67]";
    case "qualification_completed":
      return "bg-indigo-100 text-indigo-700";
    case "question_answered":
      return "bg-amber-100 text-amber-700";
    case "preview_completed":
      return "bg-emerald-100 text-emerald-700";
    case "cta_clicked":
      return "bg-purple-100 text-purple-700";
    case "preview_reset":
      return "bg-rose-100 text-rose-700";
    case "vendor_selected":
      return "bg-[#7FB8A3]/10 text-[#8E4F67]";
    case "vendor_deselected":
      return "bg-orange-100 text-orange-700";
    case "driver_weight_changed":
      return "bg-violet-100 text-violet-700";
    case "export_pdf":
    case "export_excel":
      return "bg-green-100 text-green-700";
    case "comparison_loaded":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getWidgetLabel(widget: string) {
  switch (widget) {
    case "instant_preview":
      return "Instant Preview";
    case "epm_comparison":
      return "EPM Comparison";
    case "erp_comparison":
      return "ERP Comparison";
    case "ai_comparison":
      return "AI Comparison";
    default:
      return widget.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
}

function getIndustryLabel(value: string) {
  const industries: Record<string, string> = {
    technology: "Technology",
    financial_services: "Financial Services",
    manufacturing: "Manufacturing",
    healthcare: "Healthcare",
    retail_consumer: "Retail & Consumer",
    energy_utilities: "Energy & Utilities",
    professional_services: "Professional Services",
    government: "Government",
    education: "Education",
    other: "Other",
  };
  return industries[value] || value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getSizeLabel(value: string) {
  const sizes: Record<string, string> = {
    "1-50": "1-50 employees",
    "51-200": "51-200 employees",
    "201-500": "201-500 employees",
    "501-1000": "501-1,000 employees",
    "1001-5000": "1,001-5,000 employees",
    "5001-10000": "5,001-10,000 employees",
    "10001+": "10,001+ employees",
  };
  return sizes[value] || value;
}

function getRevenueLabel(value: string) {
  const revenues: Record<string, string> = {
    "under_10m": "Under £10M",
    "10m_50m": "£10M - £50M",
    "50m_100m": "£50M - £100M",
    "100m_500m": "£100M - £500M",
    "500m_1b": "£500M - £1B",
    "1b_5b": "£1B - £5B",
    "over_5b": "Over £5B",
  };
  return revenues[value] || value;
}

function getRoleLabel(value: string) {
  const roles: Record<string, string> = {
    cfo: "CFO / Finance Director",
    fp_a_head: "Head of FP&A",
    finance_manager: "Finance Manager",
    financial_controller: "Financial Controller",
    coo: "COO / Operations Director",
    cio_cto: "CIO / CTO",
    ceo: "CEO / Managing Director",
    consultant: "Consultant / Advisor",
    other: "Other",
  };
  return roles[value] || value;
}

function getScoreColour(score: number): string {
  if (score < 2.5) return "#8E4F67";
  if (score < 3.5) return "#C77A93";
  return "#10b981";
}

function getDropoffRecommendation(questionNumber: number, dropoffRate: number): string {
  if (dropoffRate < 20) return "";
  
  const recommendations: Record<number, string> = {
    1: "Review initial question clarity. Ensure the first question is engaging and easy to understand.",
    2: "Early dropout suggests qualification fatigue. Consider simplifying the flow.",
    3: "Users may find the question complex. Add contextual help or simplify wording.",
    4: "Consider adding progress indicators to motivate continued engagement.",
    5: "Halfway point dropout. Review question difficulty and user engagement.",
    6: "Users may feel the assessment is too long. Consider streamlining.",
    7: "Late-stage dropout. Ensure questions remain relevant and not repetitive.",
    8: "Near completion - users may be abandoning due to time constraints.",
    9: "Very late dropout. Review for any confusing or sensitive questions.",
    10: "Final question dropout. Ensure the path to results is clear.",
  };
  
  return recommendations[questionNumber] || "Review this question for clarity and user engagement.";
}

function FunnelAnalysisTab({ data, isLoading }: { data: DimensionAnalysisData | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.data?.funnelAnalysis?.questionDropoff) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No funnel data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const funnelData = data.data.funnelAnalysis.questionDropoff;
  const firstQuestionSessions = funnelData[0]?.sessionsAtQuestion || 0;
  const lastQuestionSessions = funnelData[funnelData.length - 1]?.sessionsAtQuestion || 0;
  const overallCompletionRate = firstQuestionSessions > 0 
    ? Math.round((lastQuestionSessions / firstQuestionSessions) * 100) 
    : 0;
  
  const hotspots = funnelData.filter(q => q.dropoffRate > 20);
  const highestDropoff = funnelData.reduce((max, q) => q.dropoffRate > max.dropoffRate ? q : max, funnelData[0]);

  const chartData = funnelData.map((q, idx) => ({
    name: `Q${q.questionNumber}`,
    sessions: q.sessionsAtQuestion,
    dropoff: q.dropoffRate,
    fill: q.dropoffRate > 20 
      ? (q.dropoffRate > 35 ? "#8E4F67" : "#C77A93") 
      : `hsl(${180 + idx * 5}, 70%, ${50 - idx * 2}%)`,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-[#12161D]/5 to-[#8E4F67]/5 border-[#8E4F67]/20">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#8E4F67]/10 shrink-0">
                <Target className="h-5 w-5 text-brand-teal" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-semibold text-[#F6F3EE]" data-testid="stat-completion-rate">
                  {overallCompletionRate}%
                </p>
                <p className="text-sm text-muted-foreground truncate">Overall Completion Rate</p>
                <p className="text-xs text-muted-foreground mt-1">Q1 → Q{funnelData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#12161D]/5 to-[#7FB8A3]/5 border-[#7FB8A3]/20">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#7FB8A3]/10 shrink-0">
                <Users className="h-5 w-5 text-[#7FB8A3]" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-semibold text-[#F6F3EE]" data-testid="stat-total-sessions">
                  {firstQuestionSessions}
                </p>
                <p className="text-sm text-muted-foreground truncate">Started Assessment</p>
                <p className="text-xs text-muted-foreground mt-1">{lastQuestionSessions} completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${hotspots.length > 0 ? 'from-amber-50 to-red-50 border-amber-200 dark:from-amber-900/20 dark:to-red-900/20 dark:border-amber-700/30' : 'from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-700/30'}`}>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${hotspots.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                {hotspots.length > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-2xl sm:text-3xl font-semibold ${hotspots.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`} data-testid="stat-hotspots">
                  {hotspots.length}
                </p>
                <p className="text-sm text-muted-foreground truncate">Dropoff Hotspots</p>
                <p className="text-xs text-muted-foreground mt-1">&gt;20% dropoff rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="h-5 w-5 text-brand-teal shrink-0" />
            <span className="truncate">Question Funnel Visualisation</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Sessions reaching each question with dropoff indicators</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="h-64 sm:h-80" data-testid="chart-funnel">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">{item.sessions} sessions</p>
                          <p className={item.dropoff > 20 ? 'text-amber-600' : 'text-muted-foreground'}>
                            {item.dropoff}% dropoff
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#8E4F67] shrink-0" />
              <span className="text-muted-foreground whitespace-nowrap">Normal (&lt;20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500 shrink-0" />
              <span className="text-muted-foreground whitespace-nowrap">Warning (20-35%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500 shrink-0" />
              <span className="text-muted-foreground whitespace-nowrap">Critical (&gt;35%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {hotspots.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="truncate">Dropoff Hotspots</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Questions with significant user dropout requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-4" data-testid="dropoff-hotspots">
              {hotspots.map((q) => (
                <div 
                  key={q.questionNumber} 
                  className={`p-4 rounded-lg border ${
                    q.dropoffRate > 35 
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/30' 
                      : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/30'
                  }`}
                  data-testid={`hotspot-q${q.questionNumber}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={q.dropoffRate > 35 ? 'border-red-500 text-red-700 dark:text-red-400' : 'border-amber-500 text-amber-700 dark:text-amber-400'}
                      >
                        Q{q.questionNumber}
                      </Badge>
                      <div>
                        <p className={`font-medium ${q.dropoffRate > 35 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {q.dropoffRate}% dropoff rate
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <ArrowDown className="h-3 w-3" />
                          {q.sessionsAtQuestion} sessions remaining
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-muted-foreground">
                      {getDropoffRecommendation(q.questionNumber, q.dropoffRate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Layers className="h-5 w-5 text-brand-teal shrink-0" />
            <span className="truncate">Question-by-Question Breakdown</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Detailed progression through each assessment question
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[500px] px-3 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Question</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Dropoff</TableHead>
                <TableHead className="text-right">Retention</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnelData.map((q, idx) => {
                const retention = firstQuestionSessions > 0 
                  ? Math.round((q.sessionsAtQuestion / firstQuestionSessions) * 100) 
                  : 0;
                const prevSessions = idx > 0 ? funnelData[idx - 1].sessionsAtQuestion : q.sessionsAtQuestion;
                const lostUsers = prevSessions - q.sessionsAtQuestion;
                
                return (
                  <TableRow key={q.questionNumber} data-testid={`funnel-row-q${q.questionNumber}`}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        Q{q.questionNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {q.sessionsAtQuestion}
                      {lostUsers > 0 && (
                        <span className="text-xs text-red-500 ml-1">(-{lostUsers})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${
                        q.dropoffRate > 35 ? 'text-red-600 dark:text-red-400' :
                        q.dropoffRate > 20 ? 'text-amber-600 dark:text-amber-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {q.dropoffRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              retention >= 70 ? 'bg-green-500' :
                              retention >= 40 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${retention}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{retention}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {q.dropoffRate <= 10 && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Healthy
                        </Badge>
                      )}
                      {q.dropoffRate > 10 && q.dropoffRate <= 20 && (
                        <Badge className="bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#12161D]/30 dark:text-[#7FB8A3]">
                          Normal
                        </Badge>
                      )}
                      {q.dropoffRate > 20 && q.dropoffRate <= 35 && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Review
                        </Badge>
                      )}
                      {q.dropoffRate > 35 && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Critical
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            </div>
          </div>
          
          <div className="mt-4 p-3 sm:p-4 rounded-lg bg-muted/50 border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Funnel Insights
            </h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Biggest Dropoff:</span>
                <p className="font-medium">
                  Q{highestDropoff.questionNumber} ({highestDropoff.dropoffRate}%)
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Users Lost:</span>
                <p className="font-medium">
                  {firstQuestionSessions - lastQuestionSessions} of {firstQuestionSessions}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Dropoff/Question:</span>
                <p className="font-medium">
                  {funnelData.length > 0 ? Math.round(funnelData.reduce((sum, q) => sum + q.dropoffRate, 0) / funnelData.length) : 0}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DimensionPerformanceTab({ data, isLoading }: { data: DimensionAnalysisData | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.data?.dimensions || data.data.dimensions.length === 0) {
    return (
      <Card>
        <CardContent className="p-3 sm:p-6 text-center">
          <p className="text-muted-foreground">No dimension data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const dimensions = data.data.dimensions;
  const industryDimensionData = data.data.byIndustryDimension || [];

  const uniqueIndustries = Array.from(new Set(industryDimensionData.map(d => d.industry)));
  const uniqueDimensions = Array.from(new Set(dimensions.map(d => d.dimension)));

  const heatmapData: Record<string, Record<string, number>> = {};
  for (const industry of uniqueIndustries) {
    heatmapData[industry] = {};
    for (const dim of uniqueDimensions) {
      const found = industryDimensionData.find(d => d.industry === industry && d.dimension === dim);
      heatmapData[industry][dim] = found?.avgScore || 0;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-brand-teal shrink-0" />
          <span className="truncate">Dimension Score Overview</span>
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" data-testid="dimension-cards">
          {dimensions.map((dim) => {
            const distributionData = [
              { score: '1', count: dim.scoreDistribution.score1 },
              { score: '2', count: dim.scoreDistribution.score2 },
              { score: '3', count: dim.scoreDistribution.score3 },
              { score: '4', count: dim.scoreDistribution.score4 },
              { score: '5', count: dim.scoreDistribution.score5 },
            ];

            return (
              <Card 
                key={dim.dimension} 
                className="bg-gradient-to-br from-background to-muted/30"
                data-testid={`dimension-card-${dim.dimensionKey}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{dim.dimension}</span>
                    <Badge 
                      variant="outline" 
                      className="shrink-0"
                      style={{ 
                        borderColor: getScoreColour(dim.avgScore), 
                        color: getScoreColour(dim.avgScore) 
                      }}
                    >
                      {dim.avgScore.toFixed(1)}/5
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">{dim.pctStruggling}%</p>
                      <p className="text-xs text-muted-foreground">Struggling</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold text-foreground">{dim.responseCount}</p>
                      <p className="text-xs text-muted-foreground">Responses</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">{dim.pctMature}%</p>
                      <p className="text-xs text-muted-foreground">Mature</p>
                    </div>
                  </div>

                  <div className="h-20" data-testid={`chart-distribution-${dim.dimensionKey}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                          {distributionData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                index < 2 ? '#8E4F67' : 
                                index === 2 ? '#C77A93' : 
                                '#10b981'
                              }
                              opacity={0.8}
                            />
                          ))}
                        </Bar>
                        <XAxis dataKey="score" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {uniqueIndustries.length > 0 && uniqueDimensions.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FilterIcon className="h-5 w-5 text-brand-teal shrink-0" />
              <span className="truncate">Industry × Dimension Heatmap</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Average scores by industry and dimension</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto -mx-3 sm:mx-0" data-testid="heatmap-container">
              <div className="min-w-[600px] px-3 sm:px-0">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">Industry</th>
                    {uniqueDimensions.map(dim => (
                      <th key={dim} className="p-2 font-medium text-muted-foreground text-center min-w-[100px]">
                        <span className="truncate block max-w-[100px]" title={dim}>
                          {dim.length > 12 ? dim.substring(0, 12) + '...' : dim}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueIndustries.map(industry => (
                    <tr key={industry} className="border-t">
                      <td className="p-2 font-medium">{getIndustryLabel(industry)}</td>
                      {uniqueDimensions.map(dim => {
                        const score = heatmapData[industry][dim] || 0;
                        const bgColour = score === 0 
                          ? 'bg-muted/50' 
                          : score < 2.5 
                            ? 'bg-red-100 dark:bg-red-900/30' 
                            : score < 3.5 
                              ? 'bg-amber-100 dark:bg-amber-900/30' 
                              : 'bg-green-100 dark:bg-green-900/30';
                        const textColour = score === 0 
                          ? 'text-muted-foreground' 
                          : score < 2.5 
                            ? 'text-red-700 dark:text-red-400' 
                            : score < 3.5 
                              ? 'text-amber-700 dark:text-amber-400' 
                              : 'text-green-700 dark:text-green-400';

                        return (
                          <td 
                            key={`${industry}-${dim}`} 
                            className={`p-2 text-center ${bgColour}`}
                            data-testid={`heatmap-cell-${industry}-${dim.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <span className={`font-medium ${textColour}`}>
                              {score > 0 ? score.toFixed(1) : '-'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-200 dark:bg-red-900/30 dark:border-red-700/30 shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">&lt;2.5 (Low)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/30 shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">2.5-3.5 (Mid)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-200 dark:bg-green-900/30 dark:border-green-700/30 shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">&gt;3.5 (High)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function WidgetAnalytics() {
  const [selectedEvent, setSelectedEvent] = useState<WidgetEvent | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [widgetFilter, setWidgetFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"sessions" | "events">("sessions");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [mainTab, setMainTab] = useState<string>("overview");
  const [timeRange, setTimeRange] = useState<string>("365");
  const [sessionTypeFilter, setSessionTypeFilter] = useState<"all" | "active" | "bot-like">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress" | "abandoned">("all");

  const pageTitle = "Widget Analytics";
  const pageDescription = "Detailed analytics for landing page widgets and comparison tools";

  const { data: statsData, isLoading: statsLoading } = useQuery<WidgetStats>({
    queryKey: ["/api/analytics/widget-stats", widgetFilter, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (widgetFilter !== "all") params.set("widget", widgetFilter);
      if (timeRange !== "all") params.set("days", timeRange);
      const res = await fetch(`/api/analytics/widget-stats?${params.toString()}`);
      return res.json();
    },
    staleTime: 30000, // Data considered fresh for 30 seconds
    refetchInterval: 30000,
  });

  const { data: eventsData, isLoading: eventsLoading, refetch } = useQuery<{ success: boolean; data: WidgetEvent[] }>({
    queryKey: ["/api/analytics/widget-events", timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "500" });
      if (timeRange !== "all") params.set("days", timeRange);
      const res = await fetch(`/api/analytics/widget-events?${params.toString()}`);
      return res.json();
    },
    staleTime: 30000, // Data considered fresh for 30 seconds
    refetchInterval: 30000,
  });

  const { data: dimensionData, isLoading: dimensionLoading } = useQuery<DimensionAnalysisData>({
    queryKey: ["/api/analytics/widget-dimension-analysis"],
    staleTime: 60000, // Data considered fresh for 1 minute
    refetchInterval: 60000,
  });

  const queryClient = useQueryClient();
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);

  const { 
    data: widgetTrendsData, 
    isLoading: widgetTrendsLoading, 
    isError: isWidgetTrendsError,
    error: widgetTrendsError,
    refetch: refetchWidgetTrends 
  } = useQuery<WidgetAnalyticsResponse>({
    queryKey: ["/api/admin/finance-compass/widget-analytics", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/finance-compass/widget-analytics?days=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch widget analytics');
      return response.json();
    },
    staleTime: 60000, // Data considered fresh for 1 minute
    refetchInterval: 60000,
  });

  const widgetTrends = widgetTrendsData?.data;

  const { toast } = useToast();

  const { 
    data: widgetQualityStats, 
    isLoading: widgetQualityStatsLoading,
    refetch: refetchWidgetQualityStats,
  } = useQuery<WidgetQualityStats>({
    queryKey: ["/api/admin/finance-compass/widget-quality/stats"],
    queryFn: async () => {
      const response = await fetch('/api/admin/finance-compass/widget-quality/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch widget quality stats');
      return response.json();
    },
    refetchInterval: 60000,
    enabled: mainTab === "data-quality",
  });

  const { 
    data: widgetQualitySegments, 
    isLoading: widgetQualitySegmentsLoading,
    refetch: refetchWidgetQualitySegments,
  } = useQuery<WidgetQualitySegments>({
    queryKey: ["/api/admin/finance-compass/widget-quality/segments"],
    queryFn: async () => {
      const response = await fetch('/api/admin/finance-compass/widget-quality/segments', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch widget quality segments');
      return response.json();
    },
    refetchInterval: 60000,
    enabled: mainTab === "data-quality",
  });


  const backfillMutation = useMutation<BackfillResult>({
    mutationFn: async () => {
      const csrfToken = await (await import("@/lib/queryClient")).getCsrfToken();
      const response = await fetch('/api/admin/finance-compass/widget-quality/backfill', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to run backfill');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Backfill Complete",
        description: data.message,
      });
      refetchWidgetQualityStats();
      refetchWidgetQualitySegments();
    },
    onError: (error: Error) => {
      toast({
        title: "Backfill Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRefreshInsights = async () => {
    setIsRefreshingInsights(true);
    try {
      const csrfToken = await (await import("@/lib/queryClient")).getCsrfToken();
      await fetch('/api/admin/finance-compass/widget-analytics/refresh-insights', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/widget-analytics"] });
    } catch (error) {
      console.error('Failed to refresh insights:', error);
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  const events = eventsData?.data || [];
  const stats = statsData?.data;

  const filteredEvents = events.filter(event => {
    if (widgetFilter !== "all" && event.widget !== widgetFilter) {
      return false;
    }
    if (eventTypeFilter !== "all" && event.eventType !== eventTypeFilter) return false;
    if (searchTerm && !event.sessionId?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const sessionSummaries = useMemo(() => {
    const sessionMap = new Map<string, WidgetEvent[]>();
    
    filteredEvents.forEach(event => {
      const key = event.sessionId || `no-session-${event.id}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, []);
      }
      sessionMap.get(key)!.push(event);
    });

    const summaries: SessionSummary[] = [];
    
    sessionMap.forEach((sessionEvents, sessionId) => {
      const sortedEvents = [...sessionEvents].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const hasPreviewCompleted = sortedEvents.some(e => e.eventType === 'preview_completed');
      const hasCtaClicked = sortedEvents.some(e => e.eventType === 'cta_clicked');
      const hasQualificationCompleted = sortedEvents.some(e => e.eventType === 'qualification_completed');
      const hasQualificationAnswered = sortedEvents.some(e => e.eventType === 'qualification_answered');
      const hasQuestionAnswered = sortedEvents.some(e => e.eventType === 'question_answered');
      
      let status: 'completed' | 'in_progress' | 'abandoned' = 'in_progress';
      if (hasPreviewCompleted || hasCtaClicked) {
        status = 'completed';
      } else if (sortedEvents.length > 1 && !hasQualificationCompleted) {
        const lastEventTime = new Date(sortedEvents[sortedEvents.length - 1].createdAt).getTime();
        const now = Date.now();
        if (now - lastEventTime > 30 * 60 * 1000) {
          status = 'abandoned';
        }
      }
      
      const questionsAnswered = sortedEvents.filter(e => e.eventType === 'question_answered').length;
      
      const previewEvent = sortedEvents.find(e => e.eventType === 'preview_completed');
      const finalScore = previewEvent?.finalScore ?? null;
      
      const qualEvent = sortedEvents.find(e => e.eventType === 'qualification_completed');
      const qualificationData = qualEvent?.qualificationData ?? null;
      
      const widget = sortedEvents[0]?.widget || 'unknown';
      
      const startTime = new Date(sortedEvents[0].createdAt);
      const endTime = new Date(sortedEvents[sortedEvents.length - 1].createdAt);
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      const onlyWidgetLoaded = sortedEvents.every(e => e.eventType === 'widget_loaded' || e.eventType === 'comparison_loaded');
      const hasNoFingerprint = !sortedEvents.some(e => e.fingerprint && Object.keys(e.fingerprint).length > 0);
      const veryShortDuration = durationSeconds < 2;
      const noInteraction = !hasQualificationAnswered && !hasQuestionAnswered && !hasCtaClicked && !hasPreviewCompleted;
      
      const isBotLike = (onlyWidgetLoaded && sortedEvents.length === 1) || 
                        (veryShortDuration && noInteraction) ||
                        (hasNoFingerprint && noInteraction && sortedEvents.length <= 2);
      
      summaries.push({
        sessionId: sessionId.startsWith('no-session-') ? sessionId : sessionId,
        widget,
        events: sortedEvents,
        eventCount: sortedEvents.length,
        startTime,
        endTime,
        status,
        questionsAnswered,
        finalScore,
        qualificationData,
        isBotLike,
        durationSeconds,
      });
    });
    
    return summaries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [filteredEvents]);

  const filteredSessionSummaries = useMemo(() => {
    return sessionSummaries.filter(session => {
      if (sessionTypeFilter === "active" && session.isBotLike) return false;
      if (sessionTypeFilter === "bot-like" && !session.isBotLike) return false;
      if (statusFilter !== "all" && session.status !== statusFilter) return false;
      return true;
    });
  }, [sessionSummaries, sessionTypeFilter, statusFilter]);

  const sessionStats = useMemo(() => {
    const activeSessions = sessionSummaries.filter(s => !s.isBotLike);
    const botLikeSessions = sessionSummaries.filter(s => s.isBotLike);
    const completed = activeSessions.filter(s => s.status === 'completed').length;
    const inProgress = activeSessions.filter(s => s.status === 'in_progress').length;
    const abandoned = activeSessions.filter(s => s.status === 'abandoned').length;
    const completionRate = activeSessions.length > 0 
      ? Math.round((completed / activeSessions.length) * 100) 
      : 0;
    
    return {
      total: sessionSummaries.length,
      active: activeSessions.length,
      botLike: botLikeSessions.length,
      completed,
      inProgress,
      abandoned,
      completionRate,
    };
  }, [sessionSummaries]);

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const formatDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    const remainingSeconds = diffSeconds % 60;
    if (diffMinutes < 60) return `${diffMinutes}m ${remainingSeconds}s`;
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}h ${remainingMinutes}m`;
  };

  const getStatusBadgeClass = (status: SessionSummary['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'in_progress':
        return 'bg-[#7FB8A3]/10 text-[#8E4F67]';
      case 'abandoned':
        return 'bg-rose-100 text-rose-700';
    }
  };

  // Use filteredEvents to respect widget filter selection
  const qualificationSummary = useMemo(() => {
    return filteredEvents
      .filter(e => e.eventType === "qualification_completed" && e.qualificationData)
      .reduce((acc, e) => {
        const data = e.qualificationData as Record<string, string>;
        if (data.industry) acc.industries[data.industry] = (acc.industries[data.industry] || 0) + 1;
        if (data.size) acc.sizes[data.size] = (acc.sizes[data.size] || 0) + 1;
        if (data.revenue) acc.revenues[data.revenue] = (acc.revenues[data.revenue] || 0) + 1;
        if (data.role) acc.roles[data.role] = (acc.roles[data.role] || 0) + 1;
        return acc;
      }, { industries: {} as Record<string, number>, sizes: {} as Record<string, number>, revenues: {} as Record<string, number>, roles: {} as Record<string, number> });
  }, [filteredEvents]);

  const widgetSpecificStats = useMemo(() => {
    const sessionMap = new Map<string, { widget: string; hasCompletion: boolean }>();
    
    events.forEach(event => {
      const key = event.sessionId || `no-session-${event.id}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, { 
          widget: event.widget, 
          hasCompletion: false 
        });
      }
      if (event.eventType === 'preview_completed' || event.eventType === 'cta_clicked') {
        sessionMap.get(key)!.hasCompletion = true;
      }
    });
    
    const byWidget: Record<string, { sessions: number; completions: number }> = {};
    sessionMap.forEach(({ widget, hasCompletion }) => {
      const w = widget || 'unknown';
      if (!byWidget[w]) {
        byWidget[w] = { sessions: 0, completions: 0 };
      }
      byWidget[w].sessions++;
      if (hasCompletion) {
        byWidget[w].completions++;
      }
    });
    
    return byWidget;
  }, [events]);
  
  const totalSessions = useMemo(() => {
    return Object.entries(widgetSpecificStats)
      .filter(([key]) => key !== 'comparison_tools')
      .reduce((sum, [, w]) => sum + w.sessions, 0);
  }, [widgetSpecificStats]);

  const filteredStats = useMemo(() => {
    const completedSessions = sessionSummaries.filter(s => s.status === 'completed').length;
    const ctaClicks = filteredEvents.filter(e => e.eventType === 'cta_clicked').length;
    const impressions = filteredEvents.filter(e => e.eventType === 'widget_loaded').length;
    const rate = sessionSummaries.length > 0 
      ? Math.round((completedSessions / sessionSummaries.length) * 100) 
      : 0;
    return {
      sessions: sessionSummaries.length,
      completions: completedSessions,
      ctaClicks,
      impressions,
      conversionRate: rate,
    };
  }, [sessionSummaries, filteredEvents]);

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">{pageDescription}</p>
        </div>

        <Card className="mb-6 border-[#7FB8A3]/30 bg-gradient-to-r from-[#12161D]/5 to-[#7FB8A3]/5 dark:from-[#12161D]/20 dark:to-[#7FB8A3]/10">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#7FB8A3]/20">
                  <GitCompare className="h-5 w-5 text-brand-teal" />
                </div>
                <div>
                  <h3 className="font-medium">Comparison Tools Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    View dedicated EPM, ERP, and AI comparison tool insights
                  </p>
                </div>
              </div>
              <Button asChild data-testid="link-comparison-dashboard">
                <Link href="/admin/comparison-analytics">
                  View Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1" data-testid="main-tabs">
            <TabsTrigger value="overview" className="text-xs sm:text-sm" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="funnel" className="text-xs sm:text-sm" data-testid="tab-funnel">
              Funnel
            </TabsTrigger>
            <TabsTrigger value="dimensions" className="text-xs sm:text-sm" data-testid="tab-dimensions">
              Dimensions
            </TabsTrigger>
            <TabsTrigger value="widget-trends" data-testid="tab-widget-trends">
              Widget Trends
            </TabsTrigger>
            <TabsTrigger value="data-quality" data-testid="tab-data-quality">
              Data Quality
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[140px]" data-testid="select-time-range">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24 hours</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 180 days</SelectItem>
                    <SelectItem value="365">Last 1 year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={widgetFilter} onValueChange={setWidgetFilter} className="w-full">
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs sm:text-sm" data-testid="tab-all-widgets">
                  <span className="hidden sm:inline">All Widgets</span>
                  <span className="sm:hidden">All</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                    {totalSessions}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="instant_preview" className="text-xs sm:text-sm" data-testid="tab-instant-preview">
                  <span className="hidden sm:inline">Instant Preview</span>
                  <span className="sm:hidden">Preview</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {widgetSpecificStats['instant_preview']?.sessions || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="epm_comparison" data-testid="tab-epm-comparison">
                  EPM
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {widgetSpecificStats['epm_comparison']?.sessions || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="erp_comparison" data-testid="tab-erp-comparison">
                  ERP
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {widgetSpecificStats['erp_comparison']?.sessions || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="ai_comparison" data-testid="tab-ai-comparison">
                  AI
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {widgetSpecificStats['ai_comparison']?.sessions || 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-900/30 shrink-0">
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-semibold truncate" data-testid="stat-impressions">{filteredStats.impressions}</p>
                      <p className="text-xs text-muted-foreground truncate">Impressions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-[#7FB8A3]/10 dark:bg-[#12161D]/30 shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#8E4F67] dark:text-[#7FB8A3]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-semibold truncate" data-testid="stat-sessions">{filteredStats.sessions}</p>
                      <p className="text-xs text-muted-foreground truncate">Sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-semibold truncate" data-testid="stat-completions">{filteredStats.completions}</p>
                      <p className="text-xs text-muted-foreground truncate">Completions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                      <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-semibold truncate" data-testid="stat-cta-clicks">{filteredStats.ctaClicks}</p>
                      <p className="text-xs text-muted-foreground truncate">CTA Clicks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-2 sm:col-span-1">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 shrink-0">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-semibold truncate" data-testid="stat-conversion">{filteredStats.conversionRate}%</p>
                      <p className="text-xs text-muted-foreground truncate">Conversion Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-teal" />
                  Assessment Progress
                </CardTitle>
                <CardDescription>Session breakdown by completion status (excludes bot-like sessions)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-br from-[#7FB8A3]/10 to-[#7FB8A3]/10/50 dark:from-[#12161D]/20 dark:to-[#12161D]/10 border-[#12161D]/30">
                    <div className="p-2 rounded-lg bg-[#7FB8A3]/10 dark:bg-[#12161D]/30">
                      <Activity className="h-5 w-5 text-[#8E4F67] dark:text-[#7FB8A3]" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-[#8E4F67] dark:text-[#7FB8A3]" data-testid="stat-active-sessions">{sessionStats.active}</p>
                      <p className="text-xs text-muted-foreground">Active Sessions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800/30">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400" data-testid="stat-completed-sessions">{sessionStats.completed}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200 dark:border-amber-800/30">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <PlayCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-amber-700 dark:text-amber-400" data-testid="stat-in-progress-sessions">{sessionStats.inProgress}</p>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 border-rose-200 dark:border-rose-800/30">
                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                      <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-rose-700 dark:text-rose-400" data-testid="stat-abandoned-sessions">{sessionStats.abandoned}</p>
                      <p className="text-xs text-muted-foreground">Abandoned</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/20 dark:to-slate-800/10 border-slate-200 dark:border-slate-800/30">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/30">
                      <Bot className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-700 dark:text-slate-400" data-testid="stat-bot-sessions">{sessionStats.botLike}</p>
                      <p className="text-xs text-muted-foreground">Bot-like</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Completion Rate (Active Sessions):</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400" data-testid="stat-active-completion-rate">{sessionStats.completionRate}%</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-brand-cyan" />
                    Qualification Breakdown
                  </CardTitle>
                  <CardDescription>Organisation profiles from completed previews</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Industries
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(qualificationSummary.industries)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([key, count]) => (
                          <Badge key={key} variant="secondary" className="text-xs" data-testid={`badge-industry-${key}`}>
                            {getIndustryLabel(key)}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Company Sizes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(qualificationSummary.sizes)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([key, count]) => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {getSizeLabel(key)}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Revenue Bands
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(qualificationSummary.revenues)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([key, count]) => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {getRevenueLabel(key)}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Roles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(qualificationSummary.roles)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([key, count]) => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {getRoleLabel(key)}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-brand-cyan" />
                    Visitor Insights
                  </CardTitle>
                  <CardDescription>Browser fingerprint and location data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Timezones
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(
                        filteredEvents
                          .filter(e => e.fingerprint?.timezone)
                          .reduce((acc, e) => {
                            const tz = e.fingerprint?.timezone || "Unknown";
                            acc[tz] = (acc[tz] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                      )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([tz, count]) => (
                          <Badge key={tz} variant="outline" className="text-xs">
                            {tz}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> Platforms
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(
                        filteredEvents
                          .filter(e => e.fingerprint?.platform)
                          .reduce((acc, e) => {
                            const platform = e.fingerprint?.platform || "Unknown";
                            acc[platform] = (acc[platform] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                      )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([platform, count]) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Locales
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(
                        filteredEvents
                          .filter(e => e.fingerprint?.locale)
                          .reduce((acc, e) => {
                            const locale = e.fingerprint?.locale || "Unknown";
                            acc[locale] = (acc[locale] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                      )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([locale, count]) => (
                          <Badge key={locale} variant="outline" className="text-xs">
                            {locale}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-brand-cyan" />
                      {viewMode === "sessions" ? "Session Log" : "Event Log"}
                    </CardTitle>
                    <CardDescription>
                      {viewMode === "sessions" 
                        ? `${filteredSessionSummaries.length} of ${sessionSummaries.length} sessions`
                        : `${stats?.totalEvents ?? 0} total events recorded`
                      }
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-sessions">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Tabs value={sessionTypeFilter} onValueChange={(v) => setSessionTypeFilter(v as "all" | "active" | "bot-like")} className="w-auto">
                    <TabsList className="flex-wrap h-auto gap-1" data-testid="session-type-tabs">
                      <TabsTrigger value="all" data-testid="tab-session-all">
                        All
                        <Badge variant="secondary" className="ml-2 text-xs">{sessionSummaries.length}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="active" data-testid="tab-session-active">
                        <Activity className="h-3 w-3 mr-1" />
                        Active
                        <Badge variant="secondary" className="ml-2 text-xs">{sessionStats.active}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="bot-like" data-testid="tab-session-bot">
                        <Bot className="h-3 w-3 mr-1" />
                        Bot-like
                        <Badge variant="secondary" className="ml-2 text-xs">{sessionStats.botLike}</Badge>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "completed" | "in_progress" | "abandoned")}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search session ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48"
                    data-testid="input-search-session"
                  />
                  <div className="flex rounded-lg border p-1">
                    <Button
                      variant={viewMode === "sessions" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("sessions")}
                      className="h-7 px-3"
                      data-testid="button-view-sessions"
                    >
                      Sessions
                    </Button>
                    <Button
                      variant={viewMode === "events" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("events")}
                      className="h-7 px-3"
                      data-testid="button-view-events"
                    >
                      All Events
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : viewMode === "sessions" ? (
                  filteredSessionSummaries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No sessions match the current filters.</p>
                    </div>
                  ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-[40px]"></TableHead>
                          <TableHead className="text-xs">Time</TableHead>
                          <TableHead className="text-xs">Widget</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-center">Questions</TableHead>
                          <TableHead className="text-xs text-center">Score</TableHead>
                          <TableHead className="text-xs text-center">Duration</TableHead>
                          {sessionTypeFilter !== "active" && <TableHead className="text-xs text-center">Type</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSessionSummaries.slice(0, 100).map((session) => (
                          <Collapsible
                            key={session.sessionId}
                            open={expandedSessions.has(session.sessionId)}
                            onOpenChange={() => toggleSession(session.sessionId)}
                            asChild
                          >
                            <>
                              <TableRow className="cursor-pointer hover:bg-muted/50" data-testid={`session-row-${session.sessionId}`}>
                                <TableCell className="py-2">
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-expand-${session.sessionId}`}>
                                      {expandedSessions.has(session.sessionId) ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2">
                                  {formatDate(session.startTime.toISOString())}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getWidgetLabel(session.widget)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge className={`text-xs ${getStatusBadgeClass(session.status)}`}>
                                    {session.status.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-center py-2">
                                  {session.questionsAnswered > 0 ? session.questionsAnswered : "-"}
                                </TableCell>
                                <TableCell className="text-xs text-center py-2 font-medium">
                                  {session.finalScore !== null ? `${session.finalScore}%` : "-"}
                                </TableCell>
                                <TableCell className="text-xs text-center text-muted-foreground py-2">
                                  {formatDuration(session.startTime, session.endTime)}
                                </TableCell>
                                {sessionTypeFilter !== "active" && (
                                  <TableCell className="text-center py-2">
                                    {session.isBotLike && (
                                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400">
                                        <Bot className="h-3 w-3 mr-1" />
                                        Bot
                                      </Badge>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                              <CollapsibleContent asChild>
                                <TableRow className="bg-muted/30">
                                  <TableCell colSpan={sessionTypeFilter !== "active" ? 8 : 7} className="p-0">
                                    <div className="p-3">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-xs">Time</TableHead>
                                            <TableHead className="text-xs">Event Type</TableHead>
                                            <TableHead className="text-xs">Details</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {session.events.map((event) => (
                                            <TableRow
                                              key={event.id}
                                              className="cursor-pointer hover:bg-muted/50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEvent(event);
                                              }}
                                            >
                                              <TableCell className="text-xs whitespace-nowrap py-2">
                                                {formatDate(event.createdAt)}
                                              </TableCell>
                                              <TableCell className="py-2">
                                                <Badge className={`text-xs ${getEventBadgeClass(event.eventType)}`}>
                                                  {event.eventType.replace(/_/g, " ")}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="text-xs text-muted-foreground py-2">
                                                {event.finalScore !== null && <span>Score: {event.finalScore}% </span>}
                                                {event.questionNumber !== null && <span>Q{event.questionNumber} </span>}
                                                {event.field && <span>{event.field} </span>}
                                                {event.answerLabel && <span>: {event.answerLabel}</span>}
                                              </TableCell>
                                              <TableCell className="py-2">
                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                  <Eye className="h-3 w-3" />
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                      {session.qualificationData && (
                                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                                          <span className="font-medium">Qualification: </span>
                                          {Object.entries(session.qualificationData).map(([key, value]) => (
                                            <span key={key} className="mr-2">
                                              {key}: {
                                                key === "industry" ? getIndustryLabel(value) :
                                                key === "size" ? getSizeLabel(value) :
                                                key === "revenue" ? getRevenueLabel(value) :
                                                key === "role" ? getRoleLabel(value) : value
                                              }
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              </CollapsibleContent>
                            </>
                          </Collapsible>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  )
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-36">Time</TableHead>
                        <TableHead>Widget</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Session ID</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.slice(0, 100).map((event) => (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(event.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getWidgetLabel(event.widget)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${getEventBadgeClass(event.eventType)}`}>
                              {event.eventType.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {event.sessionId?.slice(0, 8) || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {event.finalScore !== null && <span>Score: {event.finalScore}% </span>}
                            {event.questionNumber !== null && <span>Q{event.questionNumber} </span>}
                            {event.field && <span>{event.field} </span>}
                            {event.answerLabel && <span>: {event.answerLabel}</span>}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel">
            <FunnelAnalysisTab data={dimensionData} isLoading={dimensionLoading} />
          </TabsContent>

          <TabsContent value="dimensions">
            <DimensionPerformanceTab data={dimensionData} isLoading={dimensionLoading} />
          </TabsContent>

          <TabsContent value="widget-trends">
            {widgetTrendsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
                <div className="grid md:grid-cols-2 gap-4">
                  <Skeleton className="h-[200px]" />
                  <Skeleton className="h-[200px]" />
                </div>
              </div>
            ) : isWidgetTrendsError ? (
              <Card className="border-red-500/30">
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <h3 className="text-lg font-medium mb-2">Failed to Load Widget Trends</h3>
                  <p className="text-muted-foreground mb-4">
                    {widgetTrendsError instanceof Error ? widgetTrendsError.message : 'An error occurred while fetching data'}
                  </p>
                  <Button onClick={() => refetchWidgetTrends()} variant="outline" data-testid="button-retry-trends">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : widgetTrends ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Widget Engagement Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      InstantPreview widget performance with AI-powered market insights
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshInsights}
                      disabled={isRefreshingInsights || !widgetTrends.insightsMeta.canRefresh}
                      data-testid="button-refresh-insights"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingInsights ? 'animate-spin' : ''}`} />
                      {widgetTrends.insightsMeta.canRefresh ? 'Refresh Insights' : 'Refresh Available Soon'}
                    </Button>
                    {widgetTrends.insightsMeta.fromCache && (
                      <Badge variant="secondary" className="text-xs">
                        Next refresh: {new Date(widgetTrends.insightsMeta.nextRefresh).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Events</p>
                          <p className="text-lg sm:text-2xl font-semibold truncate">{widgetTrends.summary.totalEvents.toLocaleString()}</p>
                        </div>
                        <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-[#7FB8A3] opacity-80 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">Completion Rate</p>
                          <p className="text-lg sm:text-2xl font-semibold">{widgetTrends.summary.avgCompletionRate}%</p>
                        </div>
                        <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 opacity-80 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Events/Session</p>
                          <p className="text-lg sm:text-2xl font-semibold">{widgetTrends.summary.avgEventsPerSession}</p>
                        </div>
                        <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 opacity-80 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className={`border-2 ${
                    widgetTrends.qualityScore.score >= 75 ? 'border-green-500/50' :
                    widgetTrends.qualityScore.score >= 50 ? 'border-amber-500/50' :
                    widgetTrends.qualityScore.score >= 25 ? 'border-orange-500/50' :
                    'border-red-500/50'
                  }`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Data Quality</p>
                          <p className="text-2xl font-semibold">{widgetTrends.qualityScore.score}/100</p>
                          <Badge variant={
                            widgetTrends.qualityScore.confidence === 'high' ? 'default' :
                            widgetTrends.qualityScore.confidence === 'medium' ? 'secondary' :
                            'outline'
                          } className="mt-1 text-xs">
                            {widgetTrends.qualityScore.confidence} confidence
                          </Badge>
                        </div>
                        <div className="relative h-14 w-14">
                          <svg className="h-14 w-14 -rotate-90">
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-muted/20"
                            />
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeDasharray={`${widgetTrends.qualityScore.score * 1.5} 150`}
                              className={
                                widgetTrends.qualityScore.score >= 75 ? 'text-green-500' :
                                widgetTrends.qualityScore.score >= 50 ? 'text-amber-500' :
                                widgetTrends.qualityScore.score >= 25 ? 'text-orange-500' :
                                'text-red-500'
                              }
                            />
                          </svg>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Widget Events Over Time</CardTitle>
                    <CardDescription>
                      Daily breakdown of widget interactions over the last {timeRange} days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={[...widgetTrends.trends].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="totalEvents"
                            name="Total Events"
                            fill="#7FB8A3"
                            fillOpacity={0.2}
                            stroke="#7FB8A3"
                          />
                          <Bar dataKey="questionAnsweredCount" name="Questions Answered" fill="#8E4F67" />
                          <Bar dataKey="qualificationCompletedCount" name="Qualifications" fill="#10B981" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        AI Market Insights
                      </CardTitle>
                      <CardDescription>
                        Market research and recommendations from Perplexity AI
                        {widgetTrends.insightsMeta.fromCache && (
                          <span className="ml-2 text-xs">(refreshes weekly)</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {widgetTrends.insights.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No insights available yet. Click "Refresh Insights" to generate.
                          </p>
                        ) : (
                          widgetTrends.insights.map((insight) => (
                            <div
                              key={insight.id}
                              className={`p-3 rounded-lg border ${
                                insight.type === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                                insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                                insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                                'bg-[#7FB8A3]/100/10 border-[#7FB8A3]/30'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {insight.type === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                                {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                                {insight.type === 'success' && <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                                {insight.type === 'info' && <Lightbulb className="h-4 w-4 text-[#7FB8A3] mt-0.5 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{insight.title}</div>
                                  <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                                  {insight.suggestedAction && (
                                    <p className="text-xs text-foreground mt-2 font-medium">
                                      Action: {insight.suggestedAction}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {insight.category.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Data Quality Breakdown</CardTitle>
                      <CardDescription>
                        Factors contributing to the overall quality score
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Sample Size</span>
                            <span>{Math.round(widgetTrends.qualityScore.breakdown.sampleScore)}/25</span>
                          </div>
                          <Progress value={widgetTrends.qualityScore.breakdown.sampleScore * 4} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on total event count (100+ events = full score)
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Completeness</span>
                            <span>{Math.round(widgetTrends.qualityScore.breakdown.completenessScore)}/25</span>
                          </div>
                          <Progress value={widgetTrends.qualityScore.breakdown.completenessScore * 4} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Sessions with 5+ questions answered
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Score Variance</span>
                            <span>{Math.round(widgetTrends.qualityScore.breakdown.varianceScore)}/25</span>
                          </div>
                          <Progress value={widgetTrends.qualityScore.breakdown.varianceScore * 4} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Healthy distribution indicates genuine responses
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Data Recency</span>
                            <span>{Math.round(widgetTrends.qualityScore.breakdown.recencyScore)}/25</span>
                          </div>
                          <Progress value={widgetTrends.qualityScore.breakdown.recencyScore * 4} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Recent data weighted more heavily
                          </p>
                        </div>
                        
                        <div className="pt-4 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            {widgetTrends.qualityScore.confidence === 'high' && (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  Data is reliable for decision-making
                                </span>
                              </>
                            )}
                            {widgetTrends.qualityScore.confidence === 'medium' && (
                              <>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  Data is indicative but needs more volume
                                </span>
                              </>
                            )}
                            {(widgetTrends.qualityScore.confidence === 'low' || widgetTrends.qualityScore.confidence === 'insufficient') && (
                              <>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                  Insufficient data for reliable conclusions
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Deep Segmentation Analysis */}
                {widgetTrends.segmentation && (
                  <>
                    {/* Outliers Alert Section */}
                    {widgetTrends.segmentation.outliers.length > 0 && (
                      <Card className="border-amber-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Outlier Trends Detected
                          </CardTitle>
                          <CardDescription>
                            Segments with significant deviation from benchmarks (Avg Score: {widgetTrends.segmentation.benchmarks.avgScore}, Completion: {widgetTrends.segmentation.benchmarks.avgCompletionRate}%)
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {widgetTrends.segmentation.outliers.map((outlier, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border flex items-center gap-3 ${
                                  outlier.deviation === 'above' 
                                    ? 'bg-green-500/10 border-green-500/30' 
                                    : 'bg-red-500/10 border-red-500/30'
                                }`}
                              >
                                {outlier.deviation === 'above' ? (
                                  <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">{outlier.insight}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className={`text-sm font-semibold ${
                                    outlier.deviation === 'above' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {outlier.value}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    vs {outlier.benchmark}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    <div className="grid lg:grid-cols-2 gap-4">
                      {/* Industry Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[#7FB8A3]" />
                            By Industry
                          </CardTitle>
                          <CardDescription>
                            Performance segmented by industry sector
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {widgetTrends.segmentation.industryBreakdown.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Not enough data for industry analysis yet
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {widgetTrends.segmentation.industryBreakdown.map((ind) => (
                                <div key={ind.industry} className="p-3 rounded-lg bg-muted/50">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium capitalize">{ind.industry.replace(/_/g, ' ')}</span>
                                    <Badge variant="secondary">{ind.sessions} sessions</Badge>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Completion</span>
                                      <div className={`font-semibold ${
                                        ind.completionRate >= widgetTrends.segmentation.benchmarks.avgCompletionRate ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {ind.completionRate}%
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Avg Score</span>
                                      <div className={`font-semibold ${
                                        (ind.avgScore || 0) >= widgetTrends.segmentation.benchmarks.avgScore ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {ind.avgScore || '-'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Range</span>
                                      <div className="font-semibold">
                                        {ind.minScore || '-'} - {ind.maxScore || '-'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Company Size Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-500" />
                            By Company Size
                          </CardTitle>
                          <CardDescription>
                            Performance segmented by employee count
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {widgetTrends.segmentation.companySizeBreakdown.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Not enough data for company size analysis yet
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {widgetTrends.segmentation.companySizeBreakdown.map((cs) => (
                                <div key={cs.companySize} className="p-3 rounded-lg bg-muted/50">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{cs.companySize.replace(/_/g, '-')} employees</span>
                                    <Badge variant="secondary">{cs.sessions} sessions</Badge>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Completion</span>
                                      <div className={`font-semibold ${
                                        cs.completionRate >= widgetTrends.segmentation.benchmarks.avgCompletionRate ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {cs.completionRate}%
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Avg Score</span>
                                      <div className={`font-semibold ${
                                        (cs.avgScore || 0) >= widgetTrends.segmentation.benchmarks.avgScore ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {cs.avgScore || '-'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Range</span>
                                      <div className="font-semibold">
                                        {cs.minScore || '-'} - {cs.maxScore || '-'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-4">
                      {/* Revenue Band Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-500" />
                            By Revenue Band
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {widgetTrends.segmentation.revenueBreakdown.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Not enough revenue data yet
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {widgetTrends.segmentation.revenueBreakdown.map((rev) => (
                                <div key={rev.revenueBand} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                  <span className="text-sm">{rev.revenueBand}</span>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-muted-foreground">{rev.sessions} sessions</span>
                                    <span className={`font-medium ${
                                      rev.completionRate >= widgetTrends.segmentation.benchmarks.avgCompletionRate 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                      {rev.completionRate}% complete
                                    </span>
                                    {rev.avgScore && (
                                      <Badge variant="outline">{rev.avgScore} avg</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Role Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-indigo-500" />
                            By Role
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {widgetTrends.segmentation.roleBreakdown.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Not enough role data yet
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {widgetTrends.segmentation.roleBreakdown.map((role) => (
                                <div key={role.role} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                  <span className="text-sm capitalize">{role.role.replace(/_/g, ' ')}</span>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-muted-foreground">{role.sessions} sessions</span>
                                    <span className={`font-medium ${
                                      role.completionRate >= widgetTrends.segmentation.benchmarks.avgCompletionRate 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                      {role.completionRate}% complete
                                    </span>
                                    {role.avgScore && (
                                      <Badge variant="outline">{role.avgScore} avg</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Widget Data</h3>
                  <p className="text-muted-foreground">
                    Widget analytics will appear once users interact with the InstantPreview widget.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data-quality" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand-teal" />
                  Data Quality Metrics
                </h2>
                <p className="text-sm text-muted-foreground">Quality validation for assessment and widget session data</p>
              </div>
              <Button 
                onClick={() => backfillMutation.mutate()}
                disabled={backfillMutation.isPending}
                data-testid="button-run-backfill"
              >
                {backfillMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Backfill...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Backfill
                  </>
                )}
              </Button>
            </div>

            {widgetQualityStatsLoading || widgetQualitySegmentsLoading ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <Skeleton className="h-60 w-full" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <Skeleton className="h-60 w-full" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : widgetQualityStats?.data ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800/30">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-400 truncate" data-testid="stat-valid-records">
                            {widgetQualityStats.data.validSessions.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">Valid Sessions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 border-rose-200 dark:border-rose-800/30">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 shrink-0">
                          <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg sm:text-2xl font-semibold text-rose-700 dark:text-rose-400 truncate" data-testid="stat-invalid-records">
                            {widgetQualityStats.data.invalidSessions.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">Invalid Sessions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-[#7FB8A3]/10 to-[#7FB8A3]/10/50 dark:from-[#12161D]/20 dark:to-[#12161D]/10 border-[#12161D]/30">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-[#7FB8A3]/10 dark:bg-[#12161D]/30 shrink-0">
                          <Target className="h-4 w-4 sm:h-5 sm:w-5 text-[#8E4F67] dark:text-[#7FB8A3]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg sm:text-2xl font-semibold text-[#8E4F67] dark:text-[#7FB8A3]" data-testid="stat-valid-percentage">
                            {widgetQualityStats.data.validPercentage}%
                          </p>
                          <p className="text-xs text-muted-foreground truncate">Valid Percentage</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200 dark:border-amber-800/30">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg sm:text-2xl font-semibold text-amber-700 dark:text-amber-400" data-testid="stat-avg-quality-score">
                            {widgetQualityStats?.data?.avgQualityScore ?? '-'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">Avg Quality</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2 sm:col-span-1 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200 dark:border-purple-800/30">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 shrink-0">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg sm:text-2xl font-semibold text-purple-700 dark:text-purple-400" data-testid="stat-avg-completion-time">
                            {widgetQualityStats?.data?.avgCompletionTime 
                              ? `${Math.round(widgetQualityStats.data.avgCompletionTime / 60)}m`
                              : '-'
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Completion Time</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Flag className="h-5 w-5 text-brand-teal" />
                        Quality Flag Breakdown
                      </CardTitle>
                      <CardDescription>Most common quality issues detected</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {widgetQualityStats?.data?.flagBreakdown && widgetQualityStats.data.flagBreakdown.length > 0 ? (
                        <div className="h-64" data-testid="chart-quality-flags">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={widgetQualityStats.data.flagBreakdown.map(f => ({
                                name: f.flag.replace(/_/g, ' '),
                                count: f.count,
                                fill: f.flag === 'bot_suspected' ? '#8E4F67' :
                                      f.flag === 'too_fast' ? '#C77A93' :
                                      f.flag === 'too_slow' ? '#3b82f6' :
                                      f.flag === 'incomplete' ? '#5E8D7A' :
                                      f.flag === 'missing_responses' ? '#ec4899' :
                                      '#6b7280'
                              }))}
                              layout="vertical"
                              margin={{ left: 80, right: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                                        <p className="font-medium capitalize">{item.name}</p>
                                        <p className="text-muted-foreground">{item.count} sessions</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {widgetQualityStats.data.flagBreakdown.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.flag === 'bot_suspected' ? '#8E4F67' :
                                          entry.flag === 'too_fast' ? '#C77A93' :
                                          entry.flag === 'too_slow' ? '#3b82f6' :
                                          entry.flag === 'incomplete' ? '#5E8D7A' :
                                          entry.flag === 'missing_responses' ? '#ec4899' :
                                          '#6b7280'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center">
                          <p className="text-muted-foreground">No quality flags recorded yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-brand-cyan" />
                        By Widget
                      </CardTitle>
                      <CardDescription>Quality breakdown by widget type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {widgetQualityStats?.data?.byWidget && widgetQualityStats.data.byWidget.length > 0 ? (
                        <Table data-testid="table-by-widget">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Widget</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Valid</TableHead>
                              <TableHead className="text-right">Avg Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {widgetQualityStats.data.byWidget.map((w) => (
                              <TableRow key={w.widget}>
                                <TableCell>
                                  <Badge variant="outline">{getWidgetLabel(w.widget)}</Badge>
                                </TableCell>
                                <TableCell className="text-right">{w.total}</TableCell>
                                <TableCell className="text-right">
                                  <span className={w.valid === w.total ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                                    {w.valid}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {w.avgScore !== null ? (
                                    <Badge 
                                      variant="secondary"
                                      className={w.avgScore >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                w.avgScore >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}
                                    >
                                      {w.avgScore}
                                    </Badge>
                                  ) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No widget data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-brand-teal" />
                        By Country
                      </CardTitle>
                      <CardDescription>Session counts by country code</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-80 overflow-auto">
                      {widgetQualitySegments?.data?.byCountry && widgetQualitySegments.data.byCountry.length > 0 ? (
                        <Table data-testid="table-by-country">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Country</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Valid</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {widgetQualitySegments.data.byCountry.slice(0, 15).map((c) => (
                              <TableRow key={c.countryCode}>
                                <TableCell>
                                  <Badge variant="outline">{c.countryCode || 'Unknown'}</Badge>
                                </TableCell>
                                <TableCell className="text-right">{c.total}</TableCell>
                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                  {c.valid}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No country data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-brand-cyan" />
                        By Industry
                      </CardTitle>
                      <CardDescription>Session counts by industry</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-80 overflow-auto">
                      {widgetQualitySegments?.data?.byIndustry && widgetQualitySegments.data.byIndustry.length > 0 ? (
                        <Table data-testid="table-by-industry">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Industry</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Valid</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {widgetQualitySegments.data.byIndustry.map((ind) => (
                              <TableRow key={ind.industry}>
                                <TableCell>
                                  <span className="capitalize">{getIndustryLabel(ind.industry)}</span>
                                </TableCell>
                                <TableCell className="text-right">{ind.total}</TableCell>
                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                  {ind.valid}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No industry data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Data Quality Metrics</h3>
                  <p className="text-muted-foreground mb-4">
                    Run the backfill to calculate quality metrics for existing data.
                  </p>
                  <Button 
                    onClick={() => backfillMutation.mutate()}
                    disabled={backfillMutation.isPending}
                    data-testid="button-run-backfill-empty"
                  >
                    {backfillMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running Backfill...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Run Backfill
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Event Details
                {selectedEvent && (
                  <Badge className={getEventBadgeClass(selectedEvent.eventType)}>
                    {selectedEvent.eventType.replace(/_/g, " ")}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Widget: </span>
                    <Badge variant="outline">{getWidgetLabel(selectedEvent.widget)}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time: </span>
                    {formatDate(selectedEvent.createdAt)}
                  </div>
                  {selectedEvent.sessionId && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Session ID: </span>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{selectedEvent.sessionId}</code>
                    </div>
                  )}
                </div>

                {selectedEvent.questionNumber !== null && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Question Details</h4>
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                      <div><span className="text-muted-foreground">Question #: </span>{selectedEvent.questionNumber}</div>
                      {selectedEvent.dimension && (
                        <div><span className="text-muted-foreground">Dimension: </span>{selectedEvent.dimension}</div>
                      )}
                      {selectedEvent.answerValue !== null && (
                        <div><span className="text-muted-foreground">Answer Value: </span>{selectedEvent.answerValue}</div>
                      )}
                      {selectedEvent.answerLabel && (
                        <div><span className="text-muted-foreground">Answer: </span>{selectedEvent.answerLabel}</div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.qualificationData && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Qualification Data</h4>
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                      {Object.entries(selectedEvent.qualificationData).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key}: </span>
                          <span>
                            {key === "industry" ? getIndustryLabel(value) :
                             key === "size" ? getSizeLabel(value) :
                             key === "revenue" ? getRevenueLabel(value) :
                             key === "role" ? getRoleLabel(value) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.answers && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Maturity Answers</h4>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <pre className="text-xs">{JSON.stringify(selectedEvent.answers, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {selectedEvent.finalScore !== null && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Score</h4>
                    <p className="text-2xl font-semibold text-foreground">{selectedEvent.finalScore}%</p>
                  </div>
                )}

                {selectedEvent.fingerprint && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Browser Fingerprint</h4>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg text-sm">
                      {selectedEvent.fingerprint.timezone && (
                        <div><span className="text-muted-foreground">Timezone: </span>{selectedEvent.fingerprint.timezone}</div>
                      )}
                      {selectedEvent.fingerprint.locale && (
                        <div><span className="text-muted-foreground">Locale: </span>{selectedEvent.fingerprint.locale}</div>
                      )}
                      {selectedEvent.fingerprint.platform && (
                        <div><span className="text-muted-foreground">Platform: </span>{selectedEvent.fingerprint.platform}</div>
                      )}
                      {selectedEvent.fingerprint.screen && (
                        <div><span className="text-muted-foreground">Screen: </span>{selectedEvent.fingerprint.screen}</div>
                      )}
                      {selectedEvent.fingerprint.deviceMemory && (
                        <div><span className="text-muted-foreground">Memory: </span>{selectedEvent.fingerprint.deviceMemory}GB</div>
                      )}
                      {selectedEvent.fingerprint.cores && (
                        <div><span className="text-muted-foreground">CPU Cores: </span>{selectedEvent.fingerprint.cores}</div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Event Details</h4>
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                      {/* Wizard-specific fields displayed nicely */}
                      {selectedEvent.metadata.category && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <Badge variant="outline">{selectedEvent.metadata.category.toUpperCase()}</Badge>
                        </div>
                      )}
                      {selectedEvent.metadata.step && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Wizard Step:</span>
                          <span className="capitalize">{selectedEvent.metadata.step}</span>
                        </div>
                      )}
                      {selectedEvent.metadata.fromStep && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Previous Step:</span>
                          <span className="capitalize">{selectedEvent.metadata.fromStep}</span>
                        </div>
                      )}
                      {selectedEvent.metadata.industry && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Industry:</span>
                          <span className="capitalize">{selectedEvent.metadata.industry.replace(/-/g, ' ')}</span>
                        </div>
                      )}
                      {selectedEvent.metadata.preset && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preset:</span>
                          <span className="capitalize">{selectedEvent.metadata.preset.replace(/-/g, ' ')}</span>
                        </div>
                      )}
                      {selectedEvent.metadata.format && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Export Format:</span>
                          <Badge>{selectedEvent.metadata.format.toUpperCase()}</Badge>
                        </div>
                      )}
                      {selectedEvent.metadata.vendorId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vendor:</span>
                          <span>{selectedEvent.metadata.vendorId}</span>
                        </div>
                      )}
                      {selectedEvent.metadata.action && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Action:</span>
                          <Badge variant={selectedEvent.metadata.action === 'added' ? 'default' : 'secondary'}>
                            {selectedEvent.metadata.action}
                          </Badge>
                        </div>
                      )}
                      {selectedEvent.metadata.driverId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Driver:</span>
                          <span className="capitalize">{selectedEvent.metadata.driverId.replace(/-/g, ' ')}</span>
                        </div>
                      )}
                      {selectedEvent.metadata.newWeight !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Weight:</span>
                          <span>{selectedEvent.metadata.newWeight}%</span>
                        </div>
                      )}
                      {selectedEvent.metadata.selectedVendors && (
                        <div>
                          <span className="text-muted-foreground">Selected Vendors:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedEvent.metadata.selectedVendors.map((v: string) => (
                              <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Show profile data if present */}
                      {selectedEvent.metadata.profile && (
                        <div>
                          <span className="text-muted-foreground">Profile Data:</span>
                          <div className="mt-1 text-xs bg-background/50 p-2 rounded">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(selectedEvent.metadata.profile, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.userAgent && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">User Agent</h4>
                    <p className="text-xs text-muted-foreground break-all">{selectedEvent.userAgent}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
