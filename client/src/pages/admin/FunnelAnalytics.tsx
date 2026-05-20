import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  ArrowDown,
  ArrowRight,
  Layers,
  Activity,
  Calendar,
  Globe,
  Mail,
  Search,
  FileText,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ComposedChart,
  ReferenceLine,
  Brush,
  ReferenceArea,
} from "recharts";
import { InteractiveChart } from "@/components/ui/interactive-chart";
import AdminLayout from "./AdminLayout";
import { InsightsPanel } from "@/components/admin/InsightsPanel";
import { apiRequest } from "@/lib/queryClient";

// Matches FunnelStageResult from server/services/analytics/funnel.ts,
// with legacy aliases populated by withLegacyAliases() so the
// existing UI bindings keep working without a wholesale rewrite.
interface FunnelStage {
  key: string;
  label: string;
  description?: string;
  order: number;
  uniqueSessions: number;
  stepwiseConversionPct: number;
  cumulativeConversionPct: number;
  absoluteDropOff: number;
  targetConversionPct: number;
  warningPct: number;
  status: "green" | "yellow" | "red";
  lowConfidence: boolean;
  // Always populated by withLegacyAliases.
  name: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
  targetPercentage: number;
}

interface DropOff {
  fromKey: string;
  fromLabel: string;
  toKey: string;
  toLabel: string;
  sessionsLost: number;
  dropOffPct: number;
  // Legacy aliases populated client-side in the query mapper.
  from?: string;
  to?: string;
  dropOffRate?: number;
  targetDropOff?: number;
  severity?: "green" | "yellow" | "red";
}

interface DeviceBreakdown {
  device: string;
  count: number;
  completed: number;
  completionRate: number;
}

interface SourceBreakdown {
  source: string;
  count: number;
  completed: number;
  completionRate: number;
}

interface FunnelStats {
  success: boolean;
  period: { days: number; startDate: string; endDate?: string };
  conversionMode?: string;
  totalSessions: number;
  totalEvents: number;
  funnel: FunnelStage[];
  biggestDropOffs?: DropOff[];
  /** Legacy alias preserved for any external consumers. */
  dropOffs?: DropOff[];
  deviceBreakdown: DeviceBreakdown[];
  sourceBreakdown: SourceBreakdown[];
}

/**
 * Adds the legacy field aliases that the existing UI components read.
 * Centralised so we don't sprinkle the mapping through the component tree.
 */
function withLegacyAliases(stage: FunnelStage): FunnelStage {
  return {
    ...stage,
    name: stage.key,
    count: stage.uniqueSessions,
    conversionRate: Math.round(stage.stepwiseConversionPct),
    dropOffRate: Math.round(Math.max(0, 100 - stage.stepwiseConversionPct)),
    targetPercentage: stage.targetConversionPct,
  };
}

interface CohortData {
  week: string;
  weekStart: string;
  sessions: number;
  widgetComplete: number;
  assessmentStart: number;
  assessmentComplete: number;
  leadsCaptured: number;
  avgTimeToComplete: number | null;
}

interface TimeMetric {
  milestone: string;
  label: string;
  converters: number;
  nonConverters: number;
  totalSessions: number;
  conversionRate: number;
  meanSeconds: number | null;
  medianSeconds: number | null;
  p95Seconds: number | null;
  /** Legacy alias for old UI bindings. */
  count?: number;
  avgSeconds?: number | null;
}

interface QuestionHeatmapData {
  questionNumber: number;
  sessionsReached: number;
  answered: number;
  abandoned: number;
  abandonmentRate: number;
  meanTimeSeconds: number | null;
  medianTimeSeconds: number | null;
  lowConfidence: boolean;
  /** Legacy aliases for old UI bindings. */
  uniqueSessions?: number;
  avgTimeSeconds?: number;
}

interface TrendData {
  date: string;
  sessions: number;
  widgetCompleted: number;
  assessmentCompleted: number;
  leads: number;
  /** Legacy alias for old UI bindings. */
  widgetComplete?: number;
  assessmentComplete?: number;
}

interface FunnelTarget {
  id: number;
  stageName: string;
  stageOrder: number;
  targetPercentage: number;
  warningThreshold: number;
  description: string | null;
  isActive: boolean;
}

const STATUS_COLORS = {
  green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", border: "border-green-500" },
  yellow: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-500" },
  red: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-500" },
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  unknown: <Monitor className="h-4 w-4" />,
};

function StatusBadge({ status, hasData = true }: { status: "green" | "yellow" | "red"; hasData?: boolean }) {
  if (!hasData) {
    return (
      <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Awaiting Data
      </Badge>
    );
  }
  
  const colors = STATUS_COLORS[status];
  const Icon = status === "green" ? CheckCircle2 : status === "yellow" ? AlertTriangle : XCircle;
  const label = status === "green" ? "On Target" : status === "yellow" ? "Warning" : "Below Target";
  
  return (
    <Badge className={`${colors.bg} ${colors.text} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function Sparkline({ data, dataKey, color }: { data: TrendData[]; dataKey: keyof TrendData; color: string }) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fill={color} 
            fillOpacity={0.2}
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  "landing_page": "Users who landed on any page of the website",
  "widget_visible": "Users who scrolled enough to see the assessment widget",
  "widget_interaction": "Users who interacted with the widget (clicked, started)",
  "widget_complete": "Users who completed the quick assessment widget",
  "cta_clicked": "Users who clicked through to the full assessment",
  "assessment_start": "Users who began the full FinanceCompass assessment",
  "assessment_25": "Users who completed 25% of assessment questions",
  "assessment_50": "Users who completed 50% of assessment questions",
  "assessment_75": "Users who completed 75% of assessment questions",
  "assessment_complete": "Users who completed the full assessment",
  "results_view": "Users who viewed their results page",
  "lead_capture": "Users who provided their contact details",
};

function FunnelVisualization({ stages }: { stages: FunnelStage[] }) {
  const hasAnyData = stages.some(s => s.count > 0);
  const firstStageCount = stages[0]?.count || 1;
  
  if (!hasAnyData) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Funnel Data Yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Once visitors start engaging with your website, you'll see how they progress through each stage of the journey here.
        </p>
      </div>
    );
  }

  const STAGE_COLORS = [
    { bg: "bg-primary", text: "text-primary-foreground" },
    { bg: "bg-[#7FB8A3]/100", text: "text-white" },
    { bg: "bg-[#7FB8A3]/100", text: "text-white" },
    { bg: "bg-teal-500", text: "text-white" },
    { bg: "bg-emerald-500", text: "text-white" },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center overflow-x-auto pb-4">
        <div className="flex items-center gap-0 min-w-max">
          {stages.map((stage, index) => {
            const retentionFromStart = firstStageCount > 0 
              ? Math.round((stage.count / firstStageCount) * 100) 
              : 0;
            const colors = STAGE_COLORS[index % STAGE_COLORS.length];
            const heightPercent = Math.max(retentionFromStart, 15);
            
            return (
              <div key={stage.name} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div 
                    className={`${colors.bg} rounded-lg px-4 py-3 min-w-[120px] text-center shadow-sm transition-all hover:scale-105`}
                    style={{ 
                      minHeight: `${Math.max(60, heightPercent * 0.8)}px`,
                    }}
                  >
                    <div className={`text-2xl font-bold ${colors.text}`}>
                      {stage.count.toLocaleString()}
                    </div>
                    <div className={`text-xs ${colors.text} opacity-90 mt-1`}>
                      {stage.label}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    <span className="font-medium">{retentionFromStart}%</span>
                    <span className="block text-[10px]">of visitors</span>
                  </div>
                </div>
                
                {index < stages.length - 1 && (
                  <div className="flex flex-col items-center mx-2">
                    <div className="flex items-center">
                      <div className="w-8 h-0.5 bg-border" />
                      <ChevronRight className="h-5 w-5 text-muted-foreground -ml-1" />
                    </div>
                    {stage.dropOffRate > 0 && (
                      <div className="text-[10px] text-red-500 font-medium mt-1 whitespace-nowrap">
                        -{stage.dropOffRate}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm font-medium mb-3">Stage Details</div>
        <div className="grid gap-2">
          {stages.map((stage, index) => {
            const prevCount = index > 0 ? stages[index - 1].count : stage.count;
            const conversionFromPrev = prevCount > 0 
              ? Math.round((stage.count / prevCount) * 100) 
              : 100;
            const isGood = conversionFromPrev >= stage.targetPercentage;
            
            return (
              <div 
                key={stage.name}
                className="flex items-center justify-between py-2 px-3 bg-background rounded-md text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[index % STAGE_COLORS.length].bg}`} />
                  <span className="font-medium">{stage.label}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">
                    {stage.count.toLocaleString()} users
                  </span>
                  <div className={`flex items-center gap-1 ${isGood ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {index > 0 && (
                      <>
                        {isGood ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{conversionFromPrev}% from prev</span>
                      </>
                    )}
                    {index === 0 && <span className="text-muted-foreground">Start</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuestionHeatmap({ data }: { data: QuestionHeatmapData[] }) {
  const maxAbandonment = Math.max(...data.map(d => d.abandonmentRate), 1);
  
  const getColor = (rate: number) => {
    if (rate < 5) return "bg-green-500";
    if (rate < 10) return "bg-yellow-500";
    if (rate < 20) return "bg-orange-500";
    return "bg-red-500";
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Abandonment Rate:</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>&lt;5%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>5-10%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>10-20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>&gt;20%</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-10 gap-1">
        {data.slice(0, 100).map((q) => (
          <div
            key={q.questionNumber}
            className={`aspect-square rounded ${getColor(q.abandonmentRate)} opacity-80 hover:opacity-100 cursor-pointer transition-opacity`}
            title={`Q${q.questionNumber}: ${q.abandonmentRate}% abandonment, ${q.avgTimeSeconds}s avg time`}
          />
        ))}
      </div>
      
      {data.length > 100 && (
        <div className="grid grid-cols-10 gap-1 mt-2">
          {data.slice(100).map((q) => (
            <div
              key={q.questionNumber}
              className={`aspect-square rounded ${getColor(q.abandonmentRate)} opacity-80 hover:opacity-100 cursor-pointer transition-opacity`}
              title={`Q${q.questionNumber}: ${q.abandonmentRate}% abandonment, ${q.avgTimeSeconds}s avg time`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FunnelAnalytics() {
  const [timeRange, setTimeRange] = useState("30");
  const queryClient = useQueryClient();
  
  const { data: funnelStats, isLoading: loadingStats, refetch: refetchStats } = useQuery<FunnelStats>({
    queryKey: ["/api/analytics/funnel-stats", { days: timeRange }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/funnel-stats?days=${timeRange}`);
      const data = await res.json();
      if (data?.funnel) {
        data.funnel = data.funnel.map(withLegacyAliases);
      }
      // The server now returns biggestDropOffs; map to legacy `dropOffs`
      // shape (used by older UI code) without losing the new fields.
      if (data?.biggestDropOffs && !data.dropOffs) {
        data.dropOffs = data.biggestDropOffs.map((d: DropOff) => ({
          ...d,
          from: d.fromLabel,
          to: d.toLabel,
          dropOffRate: d.dropOffPct,
          severity: "yellow",
        }));
      }
      return data;
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
  
  const { data: cohortData, isLoading: loadingCohorts } = useQuery<{ cohorts: CohortData[] }>({
    queryKey: ["/api/analytics/cohort-analysis"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/cohort-analysis?weeks=8");
      return res.json();
    },
    staleTime: 120000, // Data considered fresh for 2 minutes (cohort data changes slowly)
  });
  
  const { data: timeMetrics, isLoading: loadingTime } = useQuery<{ metrics: TimeMetric[] }>({
    queryKey: ["/api/analytics/time-to-conversion", { days: timeRange }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/time-to-conversion?days=${timeRange}`);
      const data = await res.json();
      if (data?.metrics) {
        // Map new server field names back to legacy aliases so older UI
        // components don't have to change. Drop the alias once the UI
        // is rebuilt to use the new fields directly.
        data.metrics = data.metrics.map((m: TimeMetric) => ({
          ...m,
          avgSeconds: m.meanSeconds,
          count: m.converters,
        }));
      }
      return data;
    },
    staleTime: 60000,
  });

  const { data: questionHeatmap, isLoading: loadingHeatmap } = useQuery<{ heatmap: QuestionHeatmapData[] }>({
    queryKey: ["/api/analytics/question-heatmap", { days: timeRange }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/question-heatmap?days=${timeRange}`);
      const data = await res.json();
      if (data?.heatmap) {
        data.heatmap = data.heatmap.map((q: QuestionHeatmapData) => ({
          ...q,
          uniqueSessions: q.sessionsReached,
          avgTimeSeconds: q.meanTimeSeconds ?? 0,
        }));
      }
      return data;
    },
    staleTime: 60000,
  });

  const { data: trendData, isLoading: loadingTrends } = useQuery<{ trendData: TrendData[] }>({
    queryKey: ["/api/analytics/trend-data", { days: "14" }],
    queryFn: async () => {
      const res = await fetch("/api/analytics/trend-data?days=14");
      const data = await res.json();
      if (data?.trendData) {
        data.trendData = data.trendData.map((t: TrendData) => ({
          ...t,
          widgetComplete: t.widgetCompleted,
          assessmentComplete: t.assessmentCompleted,
        }));
      }
      return data;
    },
    staleTime: 60000,
  });
  
  const { data: targetsData } = useQuery<{ targets: FunnelTarget[] }>({
    queryKey: ["/api/analytics/funnel-targets"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/funnel-targets");
      return res.json();
    },
    staleTime: 120000, // Targets change infrequently - 2 minute stale time
  });
  
  const handleExportCSV = () => {
    if (!funnelStats) return;
    
    const headers = ["Stage", "Count", "Conversion Rate", "Drop-off Rate", "Target", "Status"];
    const rows = funnelStats.funnel.map(s => [
      s.label,
      s.count,
      `${s.conversionRate}%`,
      `${s.dropOffRate}%`,
      `${s.targetPercentage}%`,
      s.status,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `funnel-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };
  
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "-";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6" data-testid="funnel-analytics-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Full-Funnel Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Track the complete user journey from landing to conversion
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 md:w-36" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 180 days</SelectItem>
                <SelectItem value="365">Last 1 year</SelectItem>
                <SelectItem value="9999">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetchStats()} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <InsightsPanel filterByHref="/admin/funnel-analytics" />

        {loadingStats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 md:pt-6">
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24 mb-2" />
                  <Skeleton className="h-4 w-24 md:w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : funnelStats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card>
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground truncate">Total Sessions</p>
                      <p className="text-lg md:text-2xl font-bold">{funnelStats.totalSessions.toLocaleString()}</p>
                    </div>
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                  </div>
                  {trendData?.trendData && (
                    <div className="mt-2 hidden sm:block">
                      <Sparkline data={trendData.trendData} dataKey="sessions" color="hsl(var(--primary))" />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground truncate">Widget Completions</p>
                      <p className="text-lg md:text-2xl font-bold">
                        {funnelStats.funnel.find(f => f.name === "widget_complete")?.count.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                    </div>
                  </div>
                  {trendData?.trendData && (
                    <div className="mt-2 hidden sm:block">
                      <Sparkline data={trendData.trendData} dataKey="widgetComplete" color="hsl(142, 76%, 36%)" />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground truncate">Assessments Complete</p>
                      <p className="text-lg md:text-2xl font-bold">
                        {funnelStats.funnel.find(f => f.name === "assessment_complete")?.count.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-[#7FB8A3]/100/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 md:h-5 md:w-5 text-[#7FB8A3]" />
                    </div>
                  </div>
                  {trendData?.trendData && (
                    <div className="mt-2 hidden sm:block">
                      <Sparkline data={trendData.trendData} dataKey="assessmentComplete" color="hsl(187, 85%, 43%)" />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground truncate">Leads Captured</p>
                      <p className="text-lg md:text-2xl font-bold">
                        {funnelStats.funnel.find(f => f.name === "lead_captured")?.count.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 md:h-5 md:w-5 text-violet-500" />
                    </div>
                  </div>
                  {trendData?.trendData && (
                    <div className="mt-2 hidden sm:block">
                      <Sparkline data={trendData.trendData} dataKey="leads" color="hsl(262, 83%, 58%)" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {funnelStats.totalSessions === 0 && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-[#7FB8A3]/100/10 flex items-center justify-center shrink-0">
                      <Lightbulb className="h-5 w-5 text-[#7FB8A3]" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Getting Started with Funnel Analytics</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        No funnel data has been recorded in the selected time period. Here's how the funnel tracking works:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li><strong>Landing Page:</strong> Counts all page visits across your site</li>
                        <li><strong>Widget Visible:</strong> Tracks when users scroll to see the assessment widget</li>
                        <li><strong>Widget Interaction:</strong> Records clicks and engagement with the widget</li>
                        <li><strong>Assessment Progress:</strong> Monitors users moving through the full assessment</li>
                        <li><strong>Lead Capture:</strong> Counts when users provide their contact details</li>
                      </ul>
                      <p className="text-sm text-muted-foreground mt-3">
                        Targets are set based on industry benchmarks. As data accumulates, you'll see how each stage performs against these targets.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Tabs defaultValue="funnel" className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="funnel" data-testid="tab-funnel">
                  <Layers className="h-4 w-4 mr-2" />
                  Funnel Overview
                </TabsTrigger>
                <TabsTrigger value="dropoffs" data-testid="tab-dropoffs">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Drop-off Analysis
                </TabsTrigger>
                <TabsTrigger value="segments" data-testid="tab-segments">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Segmentation
                </TabsTrigger>
                <TabsTrigger value="cohorts" data-testid="tab-cohorts">
                  <Calendar className="h-4 w-4 mr-2" />
                  Cohort Analysis
                </TabsTrigger>
                <TabsTrigger value="questions" data-testid="tab-questions">
                  <Activity className="h-4 w-4 mr-2" />
                  Question Heatmap
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="funnel" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRight className="h-5 w-5" />
                      User Journey Flow
                    </CardTitle>
                    <CardDescription>
                      See how visitors progress through each stage of the widget
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FunnelVisualization stages={funnelStats.funnel} />
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Time to Conversion</CardTitle>
                      <CardDescription>Average time to reach each milestone</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingTime ? (
                        <Skeleton className="h-40" />
                      ) : timeMetrics?.metrics ? (
                        <div className="space-y-3">
                          {timeMetrics.metrics.map(metric => (
                            <div key={metric.milestone} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{metric.label}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-medium">{formatTime(metric.avgSeconds ?? null)}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({metric.count ?? 0} users)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No time data available</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">14-Day Trend</CardTitle>
                      <CardDescription>Daily sessions and conversions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingTrends ? (
                        <Skeleton className="h-40" />
                      ) : trendData?.trendData ? (
                        <InteractiveChart 
                          title="14-Day Trend" 
                          height={180}
                          dataLength={trendData.trendData.length}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData.trendData}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10 }} 
                                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip 
                                labelFormatter={(v) => new Date(v).toLocaleDateString()}
                                contentStyle={{ fontSize: 12, backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                              />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                              <Bar dataKey="sessions" fill="hsl(var(--primary))" opacity={0.3} name="Sessions" />
                              <Line type="monotone" dataKey="widgetComplete" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} name="Widget Complete" />
                              <Line type="monotone" dataKey="assessmentComplete" stroke="hsl(187, 85%, 43%)" strokeWidth={2} dot={false} name="Assessment Complete" />
                              {trendData.trendData.length > 7 && (
                                <Brush 
                                  dataKey="date" 
                                  height={20} 
                                  stroke="hsl(var(--primary))"
                                  tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                />
                              )}
                            </ComposedChart>
                          </ResponsiveContainer>
                        </InteractiveChart>
                      ) : (
                        <p className="text-muted-foreground text-sm">No trend data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="dropoffs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Biggest Drop-off Points
                    </CardTitle>
                    <CardDescription>
                      Areas needing the most attention to improve conversion
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(funnelStats.dropOffs ?? []).length === 0 ? (
                      <p className="text-muted-foreground">No drop-offs detected yet</p>
                    ) : (
                      <div className="space-y-4">
                        {(funnelStats.dropOffs ?? []).map((dropoff, index) => {
                          const severity = (dropoff.severity ?? "yellow") as "green" | "yellow" | "red";
                          const colors = STATUS_COLORS[severity];
                          const dropPct = dropoff.dropOffRate ?? dropoff.dropOffPct;
                          const targetDrop = dropoff.targetDropOff ?? 0;
                          const isOverTarget = dropPct > targetDrop;

                          return (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border-l-4 ${colors.border} ${colors.bg}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{dropoff.from ?? dropoff.fromLabel}</span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{dropoff.to ?? dropoff.toLabel}</span>
                                  </div>
                                  <StatusBadge status={severity} />
                                </div>
                                <div className="text-right">
                                  <span className={`text-xl font-bold ${colors.text}`}>
                                    {dropPct}%
                                  </span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    drop-off ({dropoff.sessionsLost} sessions)
                                  </span>
                                  {isOverTarget && (
                                    <p className="text-xs text-muted-foreground">
                                      Target: {targetDrop}%
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="segments" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5" />
                        Device Breakdown
                      </CardTitle>
                      <CardDescription>Completion rates by device type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {funnelStats.deviceBreakdown.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No device data available</p>
                      ) : (
                        <div className="space-y-4">
                          {funnelStats.deviceBreakdown.map((device) => (
                            <div key={device.device} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {DEVICE_ICONS[device.device] || DEVICE_ICONS.unknown}
                                  <span className="capitalize font-medium">{device.device}</span>
                                </div>
                                <span className="font-bold">{device.completionRate}%</span>
                              </div>
                              <Progress value={device.completionRate} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {device.completed.toLocaleString()} completions of {device.count.toLocaleString()} sessions
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Traffic Source Performance
                      </CardTitle>
                      <CardDescription>Completion rates by traffic source</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {funnelStats.sourceBreakdown.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No source data available</p>
                      ) : (
                        <InteractiveChart 
                          title="Traffic Source Performance" 
                          height={240}
                          dataLength={funnelStats.sourceBreakdown.length}
                          enableZoomControls={false}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelStats.sourceBreakdown} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                              <YAxis type="category" dataKey="source" width={80} tick={{ fontSize: 12 }} />
                              <Tooltip 
                                formatter={(value: number) => [`${value}%`, "Completion Rate"]}
                                contentStyle={{ fontSize: 12, backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                              />
                              <Bar dataKey="completionRate" fill="hsl(var(--primary))">
                                {funnelStats.sourceBreakdown.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.completionRate > 50 ? "hsl(142, 76%, 36%)" : entry.completionRate > 25 ? "hsl(var(--primary))" : "hsl(0, 84%, 60%)"}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </InteractiveChart>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="cohorts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Weekly Cohort Analysis
                    </CardTitle>
                    <CardDescription>
                      Track how users from each week progress through the funnel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingCohorts ? (
                      <Skeleton className="h-60" />
                    ) : cohortData?.cohorts && cohortData.cohorts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Week Starting</TableHead>
                            <TableHead className="text-right">Sessions</TableHead>
                            <TableHead className="text-right">Widget Complete</TableHead>
                            <TableHead className="text-right">Assessment Start</TableHead>
                            <TableHead className="text-right">Assessment Complete</TableHead>
                            <TableHead className="text-right">Leads</TableHead>
                            <TableHead className="text-right">Avg Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cohortData.cohorts.map((cohort) => (
                            <TableRow key={cohort.weekStart}>
                              <TableCell className="font-medium">
                                {new Date(cohort.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </TableCell>
                              <TableCell className="text-right">{cohort.sessions.toLocaleString()}</TableCell>
                              <TableCell className="text-right">
                                <span className="font-medium">{cohort.widgetComplete}</span>
                                {cohort.sessions > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({Math.round((cohort.widgetComplete / cohort.sessions) * 100)}%)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-medium">{cohort.assessmentStart}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-medium">{cohort.assessmentComplete}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-medium">{cohort.leadsCaptured}</span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatTime(cohort.avgTimeToComplete)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground">No cohort data available yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="questions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Question-Level Abandonment Heatmap
                    </CardTitle>
                    <CardDescription>
                      Identify which questions cause users to abandon the assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingHeatmap ? (
                      <Skeleton className="h-40" />
                    ) : questionHeatmap?.heatmap && questionHeatmap.heatmap.length > 0 ? (
                      <>
                        <QuestionHeatmap data={questionHeatmap.heatmap} />
                        
                        <div className="mt-6">
                          <h4 className="font-medium mb-3">Top Problematic Questions</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Question #</TableHead>
                                <TableHead className="text-right">Abandonment Rate</TableHead>
                                <TableHead className="text-right">Avg Time</TableHead>
                                <TableHead className="text-right">Total Answers</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {questionHeatmap.heatmap
                                .filter(q => q.abandonmentRate > 0)
                                .sort((a, b) => b.abandonmentRate - a.abandonmentRate)
                                .slice(0, 10)
                                .map(q => (
                                  <TableRow key={q.questionNumber}>
                                    <TableCell className="font-medium">Q{q.questionNumber}</TableCell>
                                    <TableCell className="text-right">
                                      <Badge 
                                        variant={q.abandonmentRate > 20 ? "destructive" : q.abandonmentRate > 10 ? "secondary" : "outline"}
                                      >
                                        {q.abandonmentRate}%
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{q.avgTimeSeconds}s</TableCell>
                                    <TableCell className="text-right">{q.answered.toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No question data available yet. Data will appear as users complete the assessment.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Unable to load funnel analytics. Please try again.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
