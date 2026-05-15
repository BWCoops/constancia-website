import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Download,
  Layers,
  Activity,
  PieChart,
  Grid3X3,
  HelpCircle,
  Lightbulb,
  Building2,
  DollarSign,
  Briefcase,
  Users,
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
  Brush,
} from "recharts";
import { InteractiveChart } from "@/components/ui/interactive-chart";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";

interface QuestionStat {
  questionId: string;
  questionText: string;
  dimension: string;
  responseCount: number;
  avgScore: number | null;
  uniqueAssessments: number;
}

interface DimensionPerformance {
  dimension: string;
  avgScore: number;
  responseCount: number;
}

interface CompletionTrend {
  date: string;
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  avgScore: number | null;
}

interface ScoreDistribution {
  score_range: string;
  count: number;
}

interface DeviceBreakdown {
  device: string;
  count: number;
}

interface SourceBreakdown {
  source: string;
  count: number;
}

interface QuestionHeatmapData {
  questionNumber: number;
  questionId: string;
  questionText: string;
  dimension: string;
  responseCount: number;
  abandonmentRate: number;
  avgScore: number | null;
}

interface TierBreakdown {
  tier: string;
  total: number;
  completed: number;
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

interface AnalyticsResponse {
  success: boolean;
  data: {
    period: { days: number; startDate: string };
    questionStats: QuestionStat[];
    dimensionPerformance: DimensionPerformance[];
    completionTrends: CompletionTrend[];
    scoreDistribution: ScoreDistribution[];
    problematicQuestions: QuestionStat[];
    deviceBreakdown: DeviceBreakdown[];
    sourceBreakdown: SourceBreakdown[];
    questionHeatmap: QuestionHeatmapData[];
    tierBreakdown: TierBreakdown[];
    summary: {
      totalQuestions: number;
      totalResponses: number;
      avgOverallScore: number;
    };
  };
}

const DIMENSION_COLORS: Record<string, string> = {
  financial_planning_analysis: "#C77A93",
  management_reporting: "#0EA5E9",
  consolidation_close: "#6366F1",
  transaction_processing: "#8B5CF6",
  financial_controls_compliance: "#EC4899",
  technology_systems: "#F59E0B",
  organisation_people: "#10B981",
  data_analytics: "#14B8A6",
  ai_machine_learning: "#F97316",
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
};

function formatDimension(dim: string): string {
  return dim
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getHeatmapColor(abandonmentRate: number): string {
  if (abandonmentRate < 10) return "bg-green-500";
  if (abandonmentRate < 25) return "bg-yellow-500";
  if (abandonmentRate < 50) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-green-600 dark:text-green-400";
  if (score >= 3) return "text-cyan-600 dark:text-cyan-400";
  if (score >= 2) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function QuestionHeatmap({ data }: { data: QuestionHeatmapData[] }) {
  const [hoveredQuestion, setHoveredQuestion] = useState<QuestionHeatmapData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterDimension, setFilterDimension] = useState<string>('all');
  
  const dimensions = useMemo(() => {
    const dims = Array.from(new Set(data.map(q => q.dimension)));
    return dims.sort();
  }, [data]);
  
  const filteredData = useMemo(() => {
    if (filterDimension === 'all') return data;
    return data.filter(q => q.dimension === filterDimension);
  }, [data, filterDimension]);
  
  const gridSize = 14;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Abandonment Rate:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>&lt;10%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span>10-25%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span>25-50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>&gt;50%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterDimension} onValueChange={setFilterDimension}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Filter by dimension" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dimensions</SelectItem>
              {dimensions.map(dim => (
                <SelectItem key={dim} value={dim}>{formatDimension(dim)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setViewMode('list')}
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
            {filteredData.map((q) => (
              <div
                key={q.questionNumber}
                className={`aspect-square rounded ${getHeatmapColor(q.abandonmentRate)} opacity-80 hover:opacity-100 cursor-pointer transition-all hover:ring-2 hover:ring-foreground/20`}
                onMouseEnter={() => setHoveredQuestion(q)}
                onMouseLeave={() => setHoveredQuestion(null)}
                data-testid={`heatmap-cell-${q.questionNumber}`}
              />
            ))}
          </div>
          
          {hoveredQuestion && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              <div className="font-medium">Q{hoveredQuestion.questionNumber}: {hoveredQuestion.questionText}</div>
              <div className="text-muted-foreground text-xs mt-1">
                Dimension: {formatDimension(hoveredQuestion.dimension)}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span>Responses: {hoveredQuestion.responseCount}</span>
                <span>Abandonment: {hoveredQuestion.abandonmentRate}%</span>
                {hoveredQuestion.avgScore !== null && (
                  <span className={getScoreColor(hoveredQuestion.avgScore)}>
                    Avg Score: {hoveredQuestion.avgScore}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="max-h-[500px] overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="min-w-[300px]">Question</TableHead>
                <TableHead>Dimension</TableHead>
                <TableHead className="text-right w-24">Responses</TableHead>
                <TableHead className="text-right w-24">Abandon %</TableHead>
                <TableHead className="text-right w-24">Avg Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((q) => (
                <TableRow 
                  key={q.questionNumber} 
                  className="hover:bg-muted/50"
                  data-testid={`question-row-${q.questionNumber}`}
                >
                  <TableCell className="font-medium text-muted-foreground">
                    {q.questionNumber}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm leading-relaxed">{q.questionText}</div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className="text-xs whitespace-nowrap"
                      style={{ 
                        borderColor: DIMENSION_COLORS[q.dimension] || '#6366F1',
                        color: DIMENSION_COLORS[q.dimension] || '#6366F1',
                      }}
                    >
                      {formatDimension(q.dimension)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{q.responseCount}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-medium ${
                      q.abandonmentRate < 10 ? 'text-green-600 dark:text-green-400' :
                      q.abandonmentRate < 25 ? 'text-yellow-600 dark:text-yellow-400' :
                      q.abandonmentRate < 50 ? 'text-orange-600 dark:text-orange-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {q.abandonmentRate}%
                    </span>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getScoreColor(q.avgScore)}`}>
                    {q.avgScore !== null ? q.avgScore.toFixed(1) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function DimensionChart({ data }: { data: DimensionPerformance[] }) {
  return (
    <InteractiveChart height={350} dataLength={data.length} enableZoomControls={false}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" domain={[0, 5]} tickCount={6} />
          <YAxis 
            type="category" 
            dataKey="dimension" 
            width={110}
            tickFormatter={formatDimension}
            tick={{ fontSize: 11 }}
          />
          <Tooltip 
            formatter={(value: number) => [value.toFixed(1), "Avg Score"]}
            labelFormatter={formatDimension}
          />
          <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={DIMENSION_COLORS[entry.dimension] || "#6366F1"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </InteractiveChart>
  );
}

function CompletionTrendsChart({ data }: { data: CompletionTrend[] }) {
  const formattedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    }));
  }, [data]);
  
  return (
    <InteractiveChart height={300} dataLength={formattedData.length}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
          <Tooltip />
          <Legend />
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="total" 
            fill="#6366F1" 
            fillOpacity={0.3}
            stroke="#6366F1"
            name="Total Assessments"
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="completed" 
            stroke="#10B981" 
            strokeWidth={2}
            dot={false}
            name="Completed"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="avgScore" 
            stroke="#F59E0B" 
            strokeWidth={2}
            dot={false}
            name="Avg Score"
          />
          {formattedData.length > 14 && (
            <Brush dataKey="date" height={30} stroke="#6366F1" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </InteractiveChart>
  );
}

function ScoreHistogram({ data }: { data: ScoreDistribution[] }) {
  const sortedData = useMemo(() => {
    const order = ['0-1', '1-2', '2-3', '3-4', '4-5'];
    return order.map(range => {
      const item = data.find(d => d.score_range === range);
      return { score_range: range, count: item?.count || 0 };
    });
  }, [data]);
  
  const colors = ['#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#10B981'];
  
  return (
    <InteractiveChart height={250} dataLength={sortedData.length} enableZoomControls={false}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="score_range" />
          <YAxis />
          <Tooltip formatter={(value: number) => [value, "Assessments"]} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {sortedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </InteractiveChart>
  );
}

function DeviceSourceBreakdown({ 
  deviceData, 
  sourceData 
}: { 
  deviceData: DeviceBreakdown[];
  sourceData: SourceBreakdown[];
}) {
  const totalDevices = deviceData.reduce((sum, d) => sum + d.count, 0);
  const totalSources = sourceData.reduce((sum, s) => sum + s.count, 0);
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Device Breakdown</h4>
        {deviceData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No device data available</p>
        ) : (
          deviceData.map(device => {
            const percentage = totalDevices > 0 
              ? Math.round((device.count / totalDevices) * 100) 
              : 0;
            return (
              <div key={device.device} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {DEVICE_ICONS[device.device] || <Monitor className="h-4 w-4" />}
                    <span className="capitalize">{device.device}</span>
                  </div>
                  <span className="text-muted-foreground">{device.count} ({percentage}%)</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })
        )}
      </div>
      
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Traffic Sources</h4>
        {sourceData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No source data available</p>
        ) : (
          sourceData.map(source => {
            const percentage = totalSources > 0 
              ? Math.round((source.count / totalSources) * 100) 
              : 0;
            return (
              <div key={source.source} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{source.source}</span>
                  <span className="text-muted-foreground">{source.count} ({percentage}%)</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ProblematicQuestionsTable({ data }: { data: QuestionStat[] }) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No problematic questions identified yet</p>
        <p className="text-xs mt-1">Questions with low scores and sufficient responses will appear here</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Question</TableHead>
            <TableHead>Dimension</TableHead>
            <TableHead className="text-right">Responses</TableHead>
            <TableHead className="text-right">Avg Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 10).map((question, index) => (
            <TableRow key={question.questionId} data-testid={`problematic-question-${index}`}>
              <TableCell className="font-medium">
                <div className="line-clamp-2 text-sm">{question.questionText}...</div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  style={{ 
                    borderColor: DIMENSION_COLORS[question.dimension] || '#6366F1',
                    color: DIMENSION_COLORS[question.dimension] || '#6366F1',
                  }}
                >
                  {formatDimension(question.dimension)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{question.responseCount}</TableCell>
              <TableCell className={`text-right font-semibold ${getScoreColor(question.avgScore)}`}>
                {question.avgScore?.toFixed(1) || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function InsightsContent() {
  const [timeRange, setTimeRange] = useState("30");
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  
  const { data, isLoading, refetch, isFetching } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/admin/finance-compass/question-analytics", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/finance-compass/question-analytics?days=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 120000,
  });
  
  const { data: widgetData, isLoading: widgetLoading, refetch: refetchWidget, error: widgetError, isError: isWidgetError } = useQuery<WidgetAnalyticsResponse>({
    queryKey: ["/api/admin/finance-compass/widget-analytics", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/finance-compass/widget-analytics?days=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch widget analytics');
      return response.json();
    },
    refetchInterval: 300000,
    retry: 2,
  });
  
  const widgetAnalytics = widgetData?.data;
  
  const handleRefreshInsights = async () => {
    setIsRefreshingInsights(true);
    try {
      const csrfToken = await (await import("@/lib/queryClient")).getCsrfToken();
      await fetch('/api/admin/finance-compass/widget-analytics/refresh-insights', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      });
      await refetchWidget();
    } finally {
      setIsRefreshingInsights(false);
    }
  };
  
  const analytics = data?.data;
  
  const handleExport = () => {
    if (!analytics) return;
    
    const csvData = [
      ['Dimension', 'Avg Score', 'Response Count'],
      ...analytics.dimensionPerformance.map(d => [
        formatDimension(d.dimension),
        d.avgScore,
        d.responseCount,
      ]),
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-compass-insights-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  return (
    <div className="space-y-6">
      <FCAdminTopNav />
      
      <div className="px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Insights & Trends</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Question-level analytics and assessment performance insights
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 180 days</SelectItem>
                <SelectItem value="365">Last 1 year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={!analytics}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Responses</p>
                      <p className="text-2xl font-bold">{analytics.summary.totalResponses.toLocaleString()}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Overall Score</p>
                      <p className="text-2xl font-bold">{analytics.summary.avgOverallScore.toFixed(1)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-cyan-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Questions</p>
                      <p className="text-2xl font-bold">{analytics.summary.totalQuestions}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <HelpCircle className="h-5 w-5 text-indigo-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Dimensions</p>
                      <p className="text-2xl font-bold">{analytics.dimensionPerformance.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="heatmap" className="space-y-4">
              <TabsList>
                <TabsTrigger value="heatmap" data-testid="tab-heatmap">
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Question Heatmap
                </TabsTrigger>
                <TabsTrigger value="dimensions" data-testid="tab-dimensions">
                  <Layers className="h-4 w-4 mr-2" />
                  Dimensions
                </TabsTrigger>
                <TabsTrigger value="trends" data-testid="tab-trends">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trends
                </TabsTrigger>
                <TabsTrigger value="distribution" data-testid="tab-distribution">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Distribution
                </TabsTrigger>
                <TabsTrigger value="insights" data-testid="tab-insights">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="widget-trends" data-testid="tab-widget-trends">
                  <Activity className="h-4 w-4 mr-2" />
                  Widget Trends
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="heatmap">
                <Card>
                  <CardHeader>
                    <CardTitle>Question Abandonment Heatmap</CardTitle>
                    <CardDescription>
                      Visual representation of {analytics.questionHeatmap.length} questions showing where users abandon the assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <QuestionHeatmap data={analytics.questionHeatmap} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="dimensions">
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dimension Performance</CardTitle>
                      <CardDescription>
                        Average maturity scores across {analytics.dimensionPerformance.length} dimensions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DimensionChart data={analytics.dimensionPerformance} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Device & Source Breakdown</CardTitle>
                      <CardDescription>
                        How users access FinanceCompass assessments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DeviceSourceBreakdown 
                        deviceData={analytics.deviceBreakdown} 
                        sourceData={analytics.sourceBreakdown} 
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="trends">
                <Card>
                  <CardHeader>
                    <CardTitle>Completion Trends Over Time</CardTitle>
                    <CardDescription>
                      Daily assessment completions and average scores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.completionTrends.length > 0 ? (
                      <CompletionTrendsChart data={analytics.completionTrends} />
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No trend data available for this period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="distribution">
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Score Distribution</CardTitle>
                      <CardDescription>
                        Distribution of overall maturity scores
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.scoreDistribution.length > 0 ? (
                        <ScoreHistogram data={analytics.scoreDistribution} />
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No score data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Tier Breakdown</CardTitle>
                      <CardDescription>
                        Assessment completion by tier
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analytics.tierBreakdown.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-8 text-center">No tier data available</p>
                        ) : (
                          analytics.tierBreakdown.map(tier => {
                            const completionRate = tier.total > 0 
                              ? Math.round((tier.completed / tier.total) * 100) 
                              : 0;
                            return (
                              <div key={tier.tier} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium capitalize">{tier.tier.replace(/_/g, ' ')}</span>
                                  <span className="text-muted-foreground">
                                    {tier.completed}/{tier.total} completed ({completionRate}%)
                                  </span>
                                </div>
                                <Progress value={completionRate} className="h-2" />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="insights">
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Top Problematic Questions
                      </CardTitle>
                      <CardDescription>
                        Questions with the lowest average scores (min 5 responses)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProblematicQuestionsTable data={analytics.problematicQuestions} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Key Observations
                      </CardTitle>
                      <CardDescription>
                        Automated insights based on the data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.dimensionPerformance.length > 0 && (
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="text-sm font-medium text-green-700 dark:text-green-400">
                              Strongest Dimension
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {formatDimension(analytics.dimensionPerformance[0].dimension)} with an average score of {analytics.dimensionPerformance[0].avgScore.toFixed(1)}
                            </div>
                          </div>
                        )}
                        
                        {analytics.dimensionPerformance.length > 1 && (
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              Area for Improvement
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {formatDimension(analytics.dimensionPerformance[analytics.dimensionPerformance.length - 1].dimension)} has the lowest average score at {analytics.dimensionPerformance[analytics.dimensionPerformance.length - 1].avgScore.toFixed(1)}
                            </div>
                          </div>
                        )}
                        
                        {analytics.questionHeatmap.filter(q => q.abandonmentRate > 50).length > 0 && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="text-sm font-medium text-red-700 dark:text-red-400">
                              High Abandonment
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {analytics.questionHeatmap.filter(q => q.abandonmentRate > 50).length} questions have &gt;50% abandonment rate
                            </div>
                          </div>
                        )}
                        
                        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                          <div className="text-sm font-medium text-cyan-700 dark:text-cyan-400">
                            Data Coverage
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {analytics.summary.totalResponses.toLocaleString()} responses across {analytics.summary.totalQuestions} questions in the last {timeRange} days
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="widget-trends">
                {widgetLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[300px] w-full" />
                    <div className="grid md:grid-cols-2 gap-4">
                      <Skeleton className="h-[200px]" />
                      <Skeleton className="h-[200px]" />
                    </div>
                  </div>
                ) : isWidgetError ? (
                  <Card className="border-red-500/30">
                    <CardContent className="py-12 text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <h3 className="text-lg font-medium mb-2">Failed to Load Widget Analytics</h3>
                      <p className="text-muted-foreground mb-4">
                        {widgetError instanceof Error ? widgetError.message : 'An error occurred while fetching data'}
                      </p>
                      <Button onClick={() => refetchWidget()} variant="outline" data-testid="button-retry-widget">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : widgetAnalytics ? (
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
                          disabled={isRefreshingInsights || !widgetAnalytics.insightsMeta.canRefresh}
                          data-testid="button-refresh-insights"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingInsights ? 'animate-spin' : ''}`} />
                          {widgetAnalytics.insightsMeta.canRefresh ? 'Refresh Insights' : 'Refresh Available Soon'}
                        </Button>
                        {widgetAnalytics.insightsMeta.fromCache && (
                          <Badge variant="secondary" className="text-xs">
                            Next refresh: {new Date(widgetAnalytics.insightsMeta.nextRefresh).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Events</p>
                              <p className="text-2xl font-bold">{widgetAnalytics.summary.totalEvents.toLocaleString()}</p>
                            </div>
                            <Activity className="h-8 w-8 text-cyan-500 opacity-80" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Completion Rate</p>
                              <p className="text-2xl font-bold">{widgetAnalytics.summary.avgCompletionRate}%</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Events/Session</p>
                              <p className="text-2xl font-bold">{widgetAnalytics.summary.avgEventsPerSession}</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-amber-500 opacity-80" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className={`border-2 ${
                        widgetAnalytics.qualityScore.score >= 75 ? 'border-green-500/50' :
                        widgetAnalytics.qualityScore.score >= 50 ? 'border-amber-500/50' :
                        widgetAnalytics.qualityScore.score >= 25 ? 'border-orange-500/50' :
                        'border-red-500/50'
                      }`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Data Quality</p>
                              <p className="text-2xl font-bold">{widgetAnalytics.qualityScore.score}/100</p>
                              <Badge variant={
                                widgetAnalytics.qualityScore.confidence === 'high' ? 'default' :
                                widgetAnalytics.qualityScore.confidence === 'medium' ? 'secondary' :
                                'outline'
                              } className="mt-1 text-xs">
                                {widgetAnalytics.qualityScore.confidence} confidence
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
                                  strokeDasharray={`${widgetAnalytics.qualityScore.score * 1.5} 150`}
                                  className={
                                    widgetAnalytics.qualityScore.score >= 75 ? 'text-green-500' :
                                    widgetAnalytics.qualityScore.score >= 50 ? 'text-amber-500' :
                                    widgetAnalytics.qualityScore.score >= 25 ? 'text-orange-500' :
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
                            <ComposedChart data={[...widgetAnalytics.trends].reverse()}>
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
                                fill="#C77A93"
                                fillOpacity={0.2}
                                stroke="#C77A93"
                              />
                              <Bar dataKey="questionAnsweredCount" name="Questions Answered" fill="#7FB8A3" />
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
                            {widgetAnalytics.insightsMeta.fromCache && (
                              <span className="ml-2 text-xs">(refreshes weekly)</span>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {widgetAnalytics.insights.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No insights available yet. Click "Refresh Insights" to generate.
                              </p>
                            ) : (
                              widgetAnalytics.insights.map((insight) => (
                                <div
                                  key={insight.id}
                                  className={`p-3 rounded-lg border ${
                                    insight.type === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                                    insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                                    insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                                    'bg-cyan-500/10 border-cyan-500/30'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    {insight.type === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                                    {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                                    {insight.type === 'success' && <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                                    {insight.type === 'info' && <Lightbulb className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />}
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
                                <span>{Math.round(widgetAnalytics.qualityScore.breakdown.sampleScore)}/25</span>
                              </div>
                              <Progress value={widgetAnalytics.qualityScore.breakdown.sampleScore * 4} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                Based on total event count (100+ events = full score)
                              </p>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Completeness</span>
                                <span>{Math.round(widgetAnalytics.qualityScore.breakdown.completenessScore)}/25</span>
                              </div>
                              <Progress value={widgetAnalytics.qualityScore.breakdown.completenessScore * 4} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                Sessions with 5+ questions answered
                              </p>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Score Variance</span>
                                <span>{Math.round(widgetAnalytics.qualityScore.breakdown.varianceScore)}/25</span>
                              </div>
                              <Progress value={widgetAnalytics.qualityScore.breakdown.varianceScore * 4} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                Healthy distribution indicates genuine responses
                              </p>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Data Recency</span>
                                <span>{Math.round(widgetAnalytics.qualityScore.breakdown.recencyScore)}/25</span>
                              </div>
                              <Progress value={widgetAnalytics.qualityScore.breakdown.recencyScore * 4} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                Recent data weighted more heavily
                              </p>
                            </div>
                            
                            <div className="pt-4 border-t">
                              <div className="flex items-center gap-2 text-sm">
                                {widgetAnalytics.qualityScore.confidence === 'high' && (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                      Data is reliable for decision-making
                                    </span>
                                  </>
                                )}
                                {widgetAnalytics.qualityScore.confidence === 'medium' && (
                                  <>
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      Data is indicative but needs more volume
                                    </span>
                                  </>
                                )}
                                {(widgetAnalytics.qualityScore.confidence === 'low' || widgetAnalytics.qualityScore.confidence === 'insufficient') && (
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
                    {widgetAnalytics.segmentation && (
                      <>
                        {/* Outliers Alert Section */}
                        {widgetAnalytics.segmentation.outliers.length > 0 && (
                          <Card className="border-amber-500/30">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Outlier Trends Detected
                              </CardTitle>
                              <CardDescription>
                                Segments with significant deviation from benchmarks (Avg Score: {widgetAnalytics.segmentation.benchmarks.avgScore}, Completion: {widgetAnalytics.segmentation.benchmarks.avgCompletionRate}%)
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {widgetAnalytics.segmentation.outliers.map((outlier, idx) => (
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
                                      <div className={`text-sm font-bold ${
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
                                <Building2 className="h-5 w-5 text-cyan-500" />
                                By Industry
                              </CardTitle>
                              <CardDescription>
                                Performance segmented by industry sector
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {widgetAnalytics.segmentation.industryBreakdown.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Not enough data for industry analysis yet
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {widgetAnalytics.segmentation.industryBreakdown.map((ind) => (
                                    <div key={ind.industry} className="p-3 rounded-lg bg-muted/50">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium capitalize">{ind.industry.replace(/_/g, ' ')}</span>
                                        <Badge variant="secondary">{ind.sessions} sessions</Badge>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Completion</span>
                                          <div className={`font-semibold ${
                                            ind.completionRate >= widgetAnalytics.segmentation.benchmarks.avgCompletionRate ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                          }`}>
                                            {ind.completionRate}%
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Avg Score</span>
                                          <div className={`font-semibold ${
                                            (ind.avgScore || 0) >= widgetAnalytics.segmentation.benchmarks.avgScore ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
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
                              {widgetAnalytics.segmentation.companySizeBreakdown.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Not enough data for company size analysis yet
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {widgetAnalytics.segmentation.companySizeBreakdown.map((cs) => (
                                    <div key={cs.companySize} className="p-3 rounded-lg bg-muted/50">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{cs.companySize.replace(/_/g, '-')} employees</span>
                                        <Badge variant="secondary">{cs.sessions} sessions</Badge>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Completion</span>
                                          <div className={`font-semibold ${
                                            cs.completionRate >= widgetAnalytics.segmentation.benchmarks.avgCompletionRate ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                          }`}>
                                            {cs.completionRate}%
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Avg Score</span>
                                          <div className={`font-semibold ${
                                            (cs.avgScore || 0) >= widgetAnalytics.segmentation.benchmarks.avgScore ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
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
                              {widgetAnalytics.segmentation.revenueBreakdown.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Not enough revenue data yet
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {widgetAnalytics.segmentation.revenueBreakdown.map((rev) => (
                                    <div key={rev.revenueBand} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                      <span className="text-sm">{rev.revenueBand}</span>
                                      <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground">{rev.sessions} sessions</span>
                                        <span className={`font-medium ${
                                          rev.completionRate >= widgetAnalytics.segmentation.benchmarks.avgCompletionRate 
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
                              {widgetAnalytics.segmentation.roleBreakdown.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Not enough role data yet
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {widgetAnalytics.segmentation.roleBreakdown.map((role) => (
                                    <div key={role.role} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                      <span className="text-sm capitalize">{role.role.replace(/_/g, ' ')}</span>
                                      <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground">{role.sessions} sessions</span>
                                        <span className={`font-medium ${
                                          role.completionRate >= widgetAnalytics.segmentation.benchmarks.avgCompletionRate 
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
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground">
                Analytics data will appear once users start completing assessments.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function FinanceCompassInsights() {
  return (
    <AdminLayout>
      <InsightsContent />
    </AdminLayout>
  );
}
