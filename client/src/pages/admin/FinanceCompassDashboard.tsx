import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Compass,
  ClipboardList,
  HelpCircle,
  Building,
  User,
  Calendar,
  ArrowRight,
  FileCheck,
  Brain,
  Building2,
  History,
  BookOpen,
  LineChart,
  MousePointerClick,
  TrendingUp,
  Users,
  Target,
  ExternalLink,
  Shield,
  Database,
  RefreshCw
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DashboardStats {
  totalAssessments: number;
  byTier: {
    pre_assessment: number;
    full: number;
    legacy?: number;
  };
  byStatus: Record<string, number>;
}

interface Assessment {
  id: string;
  tier: string;
  status: string;
  createdAt: string;
  company?: {
    id: string;
    name: string;
  } | null;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface DashboardData {
  stats: DashboardStats;
  recentAssessments: Assessment[];
  questionCount: number;
  questionsByTier: {
    pre_assessment: number;
    full: number;
  };
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "not_started":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "in_progress":
      return "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#1E2630]/30 dark:text-[#7FB8A3]";
    case "initial_complete":
    case "followups_pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "completed":
    case "analysed":
    case "report_generated":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getTierBadgeClass(tier: string) {
  switch (tier) {
    case "pre_assessment":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    case "full":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "quick_assessment":
      return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatTierLabel(tier: string) {
  switch (tier) {
    case "pre_assessment":
      return "Pre-Assessment";
    case "full":
      return "Full";
    case "quick_assessment":
      return "Legacy";
    default:
      return tier;
  }
}

function formatStatusLabel(status: string) {
  return status.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  isLoading,
  color = "text-muted-foreground"
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
  color?: string;
}) {
  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold" data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface WidgetStats {
  last24h: {
    uniqueSessions: number;
    completions: number;
    ctaClicks: number;
    conversionRate: number;
  };
  last7d: {
    uniqueSessions: number;
    completions: number;
    ctaClicks: number;
    conversionRate: number;
    avgScore: number;
  };
  questionDropoff: Record<string, number>;
  totalEvents: number;
}

interface DataQualitySummary {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  validPercentage: number;
  avgQualityScore: number;
}

interface IndustrySegment {
  industry: string;
  total: number;
  valid: number;
}

interface DataQualitySegments {
  byIndustry: IndustrySegment[];
}

function DashboardContent() {
  const { toast } = useToast();
  
  const { data, isLoading, error, refetch } = useQuery<{ success: boolean; data: DashboardData }>({
    queryKey: ["/api/admin/finance-compass/dashboard"],
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
  });

  const { data: widgetData, isLoading: widgetLoading } = useQuery<{ success: boolean; data: WidgetStats }>({
    queryKey: ["/api/analytics/widget-stats"],
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const { data: qualitySummary, isLoading: qualitySummaryLoading } = useQuery<{ success: boolean; data: DataQualitySummary }>({
    queryKey: ["/api/admin/finance-compass/data-quality/summary"],
    retry: 2,
  });

  const { data: qualitySegments, isLoading: qualitySegmentsLoading } = useQuery<{ success: boolean; data: DataQualitySegments }>({
    queryKey: ["/api/admin/finance-compass/data-quality/segments"],
    retry: 2,
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/finance-compass/data-quality/backfill");
    },
    onSuccess: () => {
      toast({
        title: "Backfill Started",
        description: "Data quality backfill has been initiated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/data-quality/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/data-quality/segments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Backfill Failed",
        description: error.message || "Failed to start data quality backfill.",
        variant: "destructive",
      });
    },
  });

  const dashboardData = data?.data;
  const qualityData = qualitySummary?.data;
  const segmentsData = qualitySegments?.data;

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const isAuthError = errorMessage.includes("401") || errorMessage.toLowerCase().includes("unauthorized");
    
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <Compass className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2" data-testid="text-error-title">
          Unable to Load Dashboard
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-4" data-testid="text-error">
          {isAuthError 
            ? "Your session may have expired. Please refresh the page to re-authenticate."
            : "Failed to load FinanceCompass dashboard data. This may be a temporary issue."}
        </p>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => refetch()} 
            data-testid="button-retry"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          {isAuthError && (
            <Button 
              variant="default"
              size="sm"
              onClick={() => window.location.reload()} 
              data-testid="button-refresh"
            >
              Refresh Page
            </Button>
          )}
        </div>
      </div>
    );
  }

  const moduleCards = [
    {
      title: "Assessments",
      description: "View and manage all assessment submissions",
      icon: ClipboardList,
      url: "/admin/finance-compass/assessments",
      color: "text-[#7FB8A3]",
      bgColor: "bg-[#7FB8A3]/100/10",
      stats: dashboardData?.stats.totalAssessments ?? 0,
      statsLabel: "total"
    },
    {
      title: "Questions",
      description: "Manage assessment questions by tier",
      icon: HelpCircle,
      url: "/admin/finance-compass/questions",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      stats: dashboardData?.questionCount ?? 0,
      statsLabel: "questions"
    },
    {
      title: "Tenants",
      description: "Manage organisations and companies",
      icon: Building2,
      url: "/admin/finance-compass/tenants",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      title: "Scenarios",
      description: "Configure assessment scenarios",
      icon: LineChart,
      url: "/admin/finance-compass/scenarios",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Knowledge Base",
      description: "Manage AI knowledge articles",
      icon: BookOpen,
      url: "/admin/finance-compass/knowledge-base",
      color: "text-teal-500",
      bgColor: "bg-teal-500/10"
    },
    {
      title: "AI Configuration",
      description: "Configure AI assistant settings",
      icon: Brain,
      url: "/admin/finance-compass/ai-config",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10"
    },
    {
      title: "Audit Logs",
      description: "View system activity and changes",
      icon: History,
      url: "/admin/finance-compass/audit-logs",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Finance Transformation Assessment Platform Overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {moduleCards.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.url} href={module.url}>
              <Card 
                className="cursor-pointer transition-all hover:shadow-md hover:border-[#7FB8A3]/30 h-full"
                data-testid={`card-module-${module.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${module.bgColor}`}>
                      <Icon className={`h-5 w-5 ${module.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{module.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {module.description}
                      </p>
                      {module.stats !== undefined && (
                        <div className="text-lg font-semibold mt-2">
                          {isLoading ? <Skeleton className="h-5 w-10 inline-block" /> : module.stats}
                          <span className="text-xs text-muted-foreground font-normal ml-1">
                            {module.statsLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Assessments"
          value={dashboardData?.stats.totalAssessments ?? 0}
          icon={ClipboardList}
          description="All assessment records"
          isLoading={isLoading}
          color="text-brand-cyan"
        />
        <StatsCard
          title="Pre-Assessment Tier"
          value={dashboardData?.stats.byTier?.pre_assessment ?? 0}
          icon={FileCheck}
          description="Strategic readiness evaluations"
          isLoading={isLoading}
          color="text-teal-500"
        />
        <StatsCard
          title="Full Assessment Tier"
          value={dashboardData?.stats.byTier?.full ?? 0}
          icon={Compass}
          description="Comprehensive transformations"
          isLoading={isLoading}
          color="text-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatsCard
          title="Pre-Assessment Questions"
          value={dashboardData?.questionsByTier?.pre_assessment ?? 0}
          icon={HelpCircle}
          description="Readiness evaluation"
          isLoading={isLoading}
        />
        <StatsCard
          title="Full Assessment Questions"
          value={dashboardData?.questionsByTier?.full ?? 0}
          icon={HelpCircle}
          description="Comprehensive maturity"
          isLoading={isLoading}
        />
      </div>

      {/* Assessment Data Quality Section */}
      <Card data-testid="card-data-quality">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-5 w-5 text-brand-cyan shrink-0" />
              <span className="truncate">Assessment Data Quality</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Quality metrics and validation status for assessment data
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending}
            data-testid="button-run-backfill"
            className="w-full sm:w-auto"
          >
            {backfillMutation.isPending ? (
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Database className="mr-2 h-3 w-3" />
            )}
            Run Backfill
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Valid Assessments</span>
              </div>
              {qualitySummaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-valid-assessments">
                  {qualityData?.validRecords ?? 0}
                </p>
              )}
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Invalid Assessments</span>
              </div>
              {qualitySummaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-invalid-assessments">
                  {qualityData?.invalidRecords ?? 0}
                </p>
              )}
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-[#7FB8A3] shrink-0" />
                <span className="text-xs text-muted-foreground">Valid %</span>
              </div>
              {qualitySummaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-valid-percentage">
                  {qualityData?.validPercentage?.toFixed(1) ?? 0}%
                </p>
              )}
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-500 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Avg Quality Score</span>
              </div>
              {qualitySummaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-avg-quality-score">
                  {qualityData?.avgQualityScore?.toFixed(1) ?? 0}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Segment Breakdown by Industry (Top 5)</h4>
            {qualitySegmentsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : segmentsData?.byIndustry && segmentsData.byIndustry.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Industry</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Valid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segmentsData.byIndustry.slice(0, 5).map((segment, index) => (
                    <TableRow key={segment.industry} data-testid={`row-industry-segment-${index}`}>
                      <TableCell className="font-medium">{segment.industry}</TableCell>
                      <TableCell className="text-right">{segment.total}</TableCell>
                      <TableCell className="text-right">{segment.valid}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No industry segment data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Widget Analytics Section */}
      <Card data-testid="card-widget-analytics">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MousePointerClick className="h-5 w-5 text-brand-cyan shrink-0" />
              <span className="truncate">Landing Page Widget Analytics</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Instant Preview widget engagement on the FinanceCompass landing page
            </CardDescription>
          </div>
          <Link href="/admin/widget-analytics">
            <Button variant="outline" size="sm" data-testid="button-view-all-analytics" className="w-full sm:w-auto">
              View All
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-[#7FB8A3] shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Sessions (24h)</span>
              </div>
              {widgetLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-widget-sessions-24h">
                  {widgetData?.data?.last24h?.uniqueSessions ?? 0}
                </p>
              )}
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Completions (24h)</span>
              </div>
              {widgetLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-widget-completions-24h">
                  {widgetData?.data?.last24h?.completions ?? 0}
                </p>
              )}
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">CTA Clicks (24h)</span>
              </div>
              {widgetLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-widget-cta-24h">
                  {widgetData?.data?.last24h?.ctaClicks ?? 0}
                </p>
              )}
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-500 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">Conversion (24h)</span>
              </div>
              {widgetLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-widget-conversion-24h">
                  {widgetData?.data?.last24h?.conversionRate ?? 0}%
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Last 7 Days Summary</h4>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span className="text-xs text-muted-foreground">Sessions</span>
                {widgetLoading ? (
                  <Skeleton className="h-5 w-10" />
                ) : (
                  <span className="font-semibold text-sm">{widgetData?.data?.last7d?.uniqueSessions ?? 0}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span className="text-xs text-muted-foreground">Completions</span>
                {widgetLoading ? (
                  <Skeleton className="h-5 w-10" />
                ) : (
                  <span className="font-semibold text-sm">{widgetData?.data?.last7d?.completions ?? 0}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span className="text-xs text-muted-foreground">CTA Clicks</span>
                {widgetLoading ? (
                  <Skeleton className="h-5 w-10" />
                ) : (
                  <span className="font-semibold text-sm">{widgetData?.data?.last7d?.ctaClicks ?? 0}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span className="text-xs text-muted-foreground">Conversion</span>
                {widgetLoading ? (
                  <Skeleton className="h-5 w-10" />
                ) : (
                  <span className="font-semibold text-sm">{widgetData?.data?.last7d?.conversionRate ?? 0}%</span>
                )}
              </div>
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-900 col-span-2 sm:col-span-1">
                <span className="text-xs text-muted-foreground">Avg Score</span>
                {widgetLoading ? (
                  <Skeleton className="h-5 w-10" />
                ) : (
                  <span className="font-semibold text-sm">{widgetData?.data?.last7d?.avgScore ?? 0}/100</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-recent-assessments">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardList className="h-5 w-5 shrink-0" />
              Recent Assessments
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Latest assessment submissions</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild data-testid="button-view-all-assessments" className="w-full sm:w-auto">
            <Link href="/admin/finance-compass/assessments">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dashboardData?.recentAssessments && dashboardData.recentAssessments.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.recentAssessments.map((assessment, index) => (
                  <TableRow 
                    key={assessment.id} 
                    className="cursor-pointer hover-elevate"
                    data-testid={`row-assessment-${index}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[150px]">
                          {assessment.company?.name || "Unknown Company"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[120px]">
                          {assessment.contact ? 
                            `${assessment.contact.firstName} ${assessment.contact.lastName}` : 
                            "Unknown"
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getTierBadgeClass(assessment.tier)} whitespace-nowrap`} data-testid={`badge-tier-${index}`}>
                        {formatTierLabel(assessment.tier)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusBadgeClass(assessment.status)} whitespace-nowrap`} data-testid={`badge-status-${index}`}>
                        {formatStatusLabel(assessment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="text-sm">
                          {new Date(assessment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Compass className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No assessments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Assessments will appear here once users complete them
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FinanceCompassDashboard() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-4 sm:p-6">
          <DashboardContent />
        </div>
      </div>
    </AdminLayout>
  );
}
