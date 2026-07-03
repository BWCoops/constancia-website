import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3,
  Users,
  Activity,
  Target,
  Bot,
  TrendingUp,
  Download,
  FileText,
  FileSpreadsheet,
  Building2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList, PieChart, Pie } from "recharts";
import AdminLayout from "./AdminLayout";

interface ComparisonStatsResponse {
  success: boolean;
  data: {
    period: { days: number; startDate: string };
    summary: {
      totalSessions: number;
      totalEvents: number;
      totalCompletions: number;
      avgCompletionRate: number;
      // Enhanced session metrics
      sessionsStarted?: number;
      sessionsCompleted?: number;
      sessionsExported?: number;
      startedCompletionRate?: number;
      exportRate?: number;
    };
    botTraffic: {
      totalBotEvents: number;
      totalHumanEvents: number;
      uniqueBotSessions: number;
      uniqueHumanSessions: number;
      botLikeSessions: number;
      botEventPercentage: number;
      botSessionPercentage: number;
      botPercentage: number;
    };
    categoryStats: {
      category: string;
      sessions: number;
      events: number;
      completions: number;
      completionRate: number;
    }[];
    trends: {
      date: string;
      epm: number;
      erp: number;
      ai: number;
      total: number;
    }[];
    industryBreakdown: { industry: string; count: number }[];
    companySizeBreakdown: { size: string; count: number }[];
    erpLandscapeBreakdown: { erp: string; count: number }[];
    revenueBandBreakdown?: { band: string; count: number }[];
    presetSelections?: { preset: string; count: number }[];
    presetChanges?: { change: string; count: number }[];
    sessionsWithPresetChange?: number;
    topPlatforms: { platform: string; score: number }[];
    crossTabs: {
      industryByErp: { industry: string; breakdown: { erp: string; count: number }[] }[];
      industryBySize: { industry: string; breakdown: { size: string; count: number }[] }[];
      vendorsByIndustry: { industry: string; topVendors: { vendor: string; count: number }[] }[];
    };
    wizardFunnel: {
      step: string;
      sessions: number;
      dropoffRate: number;
      conversionRate: number;
    }[];
    exportTracking: {
      formatBreakdown: { format: string; count: number }[];
      categoryBreakdown: { category: string; count: number }[];
      vendorCombinations: { vendors: string; count: number }[];
      totalExports: number;
    };
    weightModifications: {
      driver: string;
      changeCount: number;
      avgWeight: number | null;
    }[];
    vendorSelections: { vendor: string; count: number }[];
    vendorPairs: { pair: string; count: number }[];
    stepDurations: {
      transition: string;
      avgDurationSeconds: number;
      sampleSize: number;
    }[];
    lastUpdated: string;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  EPM: "#7FB8A3",
  ERP: "#8E4F67",
  AI: "#12161D",
};

const FUNNEL_COLORS = ["#7FB8A3", "#8E4F67", "#066B8A", "#12161D"];

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

function formatIndustryLabel(industry: string): string {
  return industry
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ComparisonToolsAnalytics() {
  const [days, setDays] = useState<string>("30");
  const [category, setCategory] = useState<string>("all");

  const { data, isLoading, error } = useQuery<ComparisonStatsResponse>({
    queryKey: ["/api/analytics/comparison-stats", days, category],
    queryFn: async () => {
      const params = new URLSearchParams({ days });
      if (category !== "all") params.append("category", category);
      const response = await fetch(`/api/analytics/comparison-stats?${params}`);
      if (!response.ok) throw new Error("Failed to fetch comparison stats");
      return response.json();
    },
    staleTime: 60000, // Data considered fresh for 1 minute
    refetchInterval: 60000, // Refresh every minute
  });

  const stats = data?.data;

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="comparison-tools-analytics">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="page-title">
              Comparison Tools Analytics
            </h1>
            <p className="text-muted-foreground text-sm">
              EPM, ERP, and AI comparison tool usage insights
            </p>
          </div>
          <Select value={days} onValueChange={setDays} data-testid="select-time-period">
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={category} onValueChange={setCategory} className="w-full" data-testid="tabs-category">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger 
              value="EPM" 
              data-testid="tab-epm"
              style={{ "--tw-ring-color": "#7FB8A3" } as React.CSSProperties}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#7FB8A3" }} />
                EPM
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="ERP" 
              data-testid="tab-erp"
              style={{ "--tw-ring-color": "#8E4F67" } as React.CSSProperties}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#8E4F67" }} />
                ERP
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="AI" 
              data-testid="tab-ai"
              className="data-[state=active]:text-white data-[state=active]:bg-brand-navy"
              style={{ "--tw-ring-color": "#12161D" } as React.CSSProperties}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#12161D" }} />
                AI
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Failed to load analytics data
            </CardContent>
          </Card>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card data-testid="card-total-sessions">
                <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{formatNumber(stats.summary.totalSessions)}</div>
                </CardContent>
              </Card>

              <Card data-testid="card-total-events">
                <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{formatNumber(stats.summary.totalEvents)}</div>
                </CardContent>
              </Card>

              <Card data-testid="card-completions">
                <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Completions</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{formatNumber(stats.summary.totalCompletions)}</div>
                </CardContent>
              </Card>

              <Card data-testid="card-completion-rate">
                <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{stats.summary.avgCompletionRate}%</div>
                </CardContent>
              </Card>

              <Card data-testid="card-bot-traffic">
                <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Bot-like Filtered</CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-semibold">{stats.botTraffic.botLikeSessions || stats.botTraffic.uniqueBotSessions}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>{stats.botTraffic.botSessionPercentage}% of sessions</div>
                    <div>{stats.botTraffic.totalBotEvents} events excluded</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Session Flow Metrics */}
            <Card data-testid="card-session-flow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Session Flow Metrics
                </CardTitle>
                <CardDescription>Detailed session progression and conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl font-semibold">{formatNumber(stats.summary.sessionsStarted ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">Started</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl font-semibold">{formatNumber(stats.summary.sessionsCompleted ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-2xl font-semibold">{formatNumber(stats.summary.sessionsExported ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">Exported</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10" style={{ borderLeft: "3px solid #7FB8A3" }}>
                    <div className="text-2xl font-semibold text-green-600">{stats.summary.startedCompletionRate ?? 0}%</div>
                    <div className="text-xs text-muted-foreground">Started → Complete</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[#7FB8A3]/100/10" style={{ borderLeft: "3px solid #3b82f6" }}>
                    <div className="text-2xl font-semibold text-[#8E4F67]">{stats.summary.exportRate ?? 0}%</div>
                    <div className="text-xs text-muted-foreground">Complete → Export</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {category === "all" ? (
                <Card data-testid="card-category-breakdown">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Category Breakdown
                    </CardTitle>
                    <CardDescription>EPM vs ERP vs AI usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="h-[180px] w-[180px] sm:h-[200px] sm:w-[200px] flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.categoryStats}
                              dataKey="sessions"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              innerRadius="55%"
                              outerRadius="85%"
                              paddingAngle={2}
                            >
                              {stats.categoryStats.map((entry) => (
                                <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || "#888"} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [value, "Sessions"]}
                              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-row sm:flex-col flex-wrap justify-center gap-3 sm:gap-2">
                        {stats.categoryStats.map((cat) => (
                          <div key={cat.category} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: CATEGORY_COLORS[cat.category] || "#888" }} 
                            />
                            <div className="text-sm">
                              <span className="font-medium">{cat.category}</span>
                              <span className="text-muted-foreground ml-1">({cat.sessions})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-4 pt-3 border-t">
                      {stats.categoryStats.map((cat) => (
                        <Badge key={cat.category} variant="outline" className="gap-1 text-xs">
                          {cat.category}: {cat.completionRate}% completion
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card data-testid="card-category-summary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" style={{ color: CATEGORY_COLORS[category] }} />
                      {category} Category Summary
                    </CardTitle>
                    <CardDescription>Filtered metrics for {category} comparison tool</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="rounded-lg p-6 text-center"
                      style={{ 
                        backgroundColor: `${CATEGORY_COLORS[category]}15`,
                        borderLeft: `4px solid ${CATEGORY_COLORS[category]}`
                      }}
                    >
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-3xl font-semibold" style={{ color: CATEGORY_COLORS[category] }}>
                            {formatNumber(stats.summary.totalSessions)}
                          </div>
                          <div className="text-sm text-muted-foreground">Sessions</div>
                        </div>
                        <div>
                          <div className="text-3xl font-semibold" style={{ color: CATEGORY_COLORS[category] }}>
                            {formatNumber(stats.summary.totalCompletions)}
                          </div>
                          <div className="text-sm text-muted-foreground">Completions</div>
                        </div>
                        <div>
                          <div className="text-3xl font-semibold" style={{ color: CATEGORY_COLORS[category] }}>
                            {stats.summary.avgCompletionRate}%
                          </div>
                          <div className="text-sm text-muted-foreground">Completion Rate</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center mt-4">
                      <Badge 
                        style={{ 
                          backgroundColor: `${CATEGORY_COLORS[category]}30`, 
                          color: CATEGORY_COLORS[category],
                          borderColor: CATEGORY_COLORS[category]
                        }}
                      >
                        Viewing {category} data only
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-industry-breakdown">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Top Industries
                  </CardTitle>
                  <CardDescription>Most active industries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.industryBreakdown.slice(0, 8)} layout="vertical">
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="industry"
                          width={120}
                          tickFormatter={formatIndustryLabel}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: number) => [value, "Sessions"]}
                          labelFormatter={formatIndustryLabel}
                          contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                        />
                        <Bar dataKey="count" fill="#8E4F67" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selection Breakdowns Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Band Breakdown */}
              {stats.revenueBandBreakdown && stats.revenueBandBreakdown.length > 0 && (
                <Card data-testid="card-revenue-band">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Revenue Band</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.revenueBandBreakdown.slice(0, 6).map((item) => (
                        <div key={item.band} className="flex justify-between items-center">
                          <span className="text-sm truncate max-w-[150px]">{item.band}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preset Selection */}
              {stats.presetSelections && stats.presetSelections.length > 0 && (
                <Card data-testid="card-preset-selections">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Preset Selections</CardTitle>
                    <CardDescription className="text-xs">
                      {stats.sessionsWithPresetChange ?? 0} sessions changed presets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.presetSelections.slice(0, 6).map((item) => (
                        <div key={item.preset} className="flex justify-between items-center">
                          <span className="text-sm truncate max-w-[150px]">{item.preset}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preset Changes */}
              {stats.presetChanges && stats.presetChanges.length > 0 && (
                <Card data-testid="card-preset-changes">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Preset Changes</CardTitle>
                    <CardDescription className="text-xs">Users switching presets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.presetChanges.slice(0, 6).map((item) => (
                        <div key={item.change} className="flex justify-between items-center">
                          <span className="text-xs truncate max-w-[150px]" title={item.change}>{item.change}</span>
                          <Badge variant="outline">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Company Size Breakdown */}
              {stats.companySizeBreakdown && stats.companySizeBreakdown.length > 0 && (
                <Card data-testid="card-company-size">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Company Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.companySizeBreakdown.slice(0, 6).map((item) => (
                        <div key={item.size} className="flex justify-between items-center">
                          <span className="text-sm truncate max-w-[150px]">{item.size}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ERP Landscape Breakdown */}
              {stats.erpLandscapeBreakdown && stats.erpLandscapeBreakdown.length > 0 && (
                <Card data-testid="card-erp-landscape">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Current ERP Systems</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.erpLandscapeBreakdown.slice(0, 6).map((item) => (
                        <div key={item.erp} className="flex justify-between items-center">
                          <span className="text-sm truncate max-w-[150px]">{item.erp}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card data-testid="card-wizard-funnel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Wizard Funnel
                </CardTitle>
                <CardDescription>Step-by-step progression through comparison wizard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {stats.wizardFunnel.map((step, idx) => (
                    <div key={step.step} className="flex-1 flex items-center gap-2">
                      <div
                        className="flex-1 rounded-lg p-4 text-center"
                        style={{ backgroundColor: FUNNEL_COLORS[idx] + "20", borderLeft: `4px solid ${FUNNEL_COLORS[idx]}` }}
                      >
                        <div className="text-sm font-medium text-muted-foreground">{step.step}</div>
                        <div className="text-2xl font-semibold mt-1">{step.sessions}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {step.conversionRate}% of total
                        </div>
                        {step.dropoffRate > 0 && (
                          <Badge variant="destructive" className="mt-2 text-xs">
                            -{step.dropoffRate}% dropoff
                          </Badge>
                        )}
                      </div>
                      {idx < stats.wizardFunnel.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-cross-tabs">
              <CardHeader>
                <CardTitle>Cross-Tabulations</CardTitle>
                <CardDescription>Deep-dive into segment combinations</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="industry-erp" data-testid="tabs-cross-tabs">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="industry-erp">Industry × ERP</TabsTrigger>
                    <TabsTrigger value="industry-size">Industry × Size</TabsTrigger>
                    <TabsTrigger value="vendors-industry">Vendors by Industry</TabsTrigger>
                  </TabsList>

                  <TabsContent value="industry-erp">
                    {stats.crossTabs.industryByErp.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No cross-tab data available</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Industry</TableHead>
                              <TableHead>ERP Systems</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.crossTabs.industryByErp.slice(0, 10).map((row) => (
                              <TableRow key={row.industry}>
                                <TableCell className="font-medium">{formatIndustryLabel(row.industry)}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {row.breakdown.slice(0, 5).map((erp) => (
                                      <Badge key={erp.erp} variant="secondary" className="text-xs">
                                        {erp.erp} ({erp.count})
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="industry-size">
                    {stats.crossTabs.industryBySize.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No cross-tab data available</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Industry</TableHead>
                              <TableHead>Company Sizes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.crossTabs.industryBySize.slice(0, 10).map((row) => (
                              <TableRow key={row.industry}>
                                <TableCell className="font-medium">{formatIndustryLabel(row.industry)}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {row.breakdown.slice(0, 5).map((size) => (
                                      <Badge key={size.size} variant="outline" className="text-xs">
                                        {size.size} ({size.count})
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="vendors-industry">
                    {stats.crossTabs.vendorsByIndustry.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No vendor data available</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Industry</TableHead>
                              <TableHead>Top Recommended Vendors</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.crossTabs.vendorsByIndustry.slice(0, 10).map((row) => (
                              <TableRow key={row.industry}>
                                <TableCell className="font-medium">{formatIndustryLabel(row.industry)}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {row.topVendors.map((vendor, idx) => (
                                      <Badge
                                        key={vendor.vendor}
                                        variant={idx === 0 ? "default" : "secondary"}
                                        className="text-xs"
                                      >
                                        {vendor.vendor} ({vendor.count})
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-top-platforms">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Recommended Platforms
                  </CardTitle>
                  <CardDescription>Most frequently recommended by scoring</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.topPlatforms.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No platform data yet</p>
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topPlatforms.slice(0, 8)} layout="vertical">
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="platform" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number) => [value, "Score"]}
                            contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                          />
                          <Bar dataKey="score" fill="#7FB8A3" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-export-tracking">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Tracking
                  </CardTitle>
                  <CardDescription>
                    Total exports: {stats.exportTracking.totalExports}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {stats.exportTracking.totalExports > 0 && (
                      <div className="h-[120px] w-[120px] sm:h-[140px] sm:w-[140px] flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.exportTracking.formatBreakdown}
                              dataKey="count"
                              nameKey="format"
                              cx="50%"
                              cy="50%"
                              innerRadius="50%"
                              outerRadius="80%"
                              paddingAngle={3}
                            >
                              {stats.exportTracking.formatBreakdown.map((entry) => (
                                <Cell 
                                  key={entry.format} 
                                  fill={entry.format === "PDF" ? "#8E4F67" : "#7FB8A3"} 
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, name: string) => [value, name]}
                              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="flex flex-row sm:flex-col flex-wrap justify-center gap-3 sm:gap-2">
                      {stats.exportTracking.formatBreakdown.map((fmt) => (
                        <div key={fmt.format} className="flex items-center gap-2">
                          {fmt.format === "PDF" ? (
                            <FileText className="h-4 w-4 text-red-500" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm font-medium">{fmt.format}</span>
                          <Badge variant="secondary">{fmt.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-medium mb-2">Exports by Category</h4>
                    <div className="flex flex-wrap gap-2">
                      {stats.exportTracking.categoryBreakdown.map((cat) => (
                        <Badge
                          key={cat.category}
                          style={{ backgroundColor: CATEGORY_COLORS[cat.category] + "30", color: CATEGORY_COLORS[cat.category] }}
                        >
                          {cat.category}: {cat.count}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {stats.exportTracking.vendorCombinations.length > 0 && (
                    <div className="pt-3 border-t">
                      <h4 className="text-sm font-medium mb-2">Top Vendor Combinations</h4>
                      <div className="space-y-1">
                        {stats.exportTracking.vendorCombinations.slice(0, 5).map((combo, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground truncate max-w-[200px]">{combo.vendors}</span>
                            <Badge variant="outline">{combo.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <p className="text-xs text-muted-foreground text-right">
              Last updated: {new Date(stats.lastUpdated).toLocaleString()}
            </p>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
