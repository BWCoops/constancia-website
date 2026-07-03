import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDuration } from "@shared/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  FileText, 
  FolderOpen, 
  Users, 
  UserCheck, 
  Download, 
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Target,
  BookOpen,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  Percent,
  MousePointerClick,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { InsightsPanel } from "@/components/admin/InsightsPanel";

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

interface DashboardStats {
  blogPosts: number;
  publishedPosts: number;
  resources: number;
  totalLeads: number;
  verifiedLeads: number;
  recentDownloads: number;
  totalScans: number;
  pageViews30d: number;
  sessions30d: number;
}

interface AnalyticsOverview {
  pageViews: number;
  sessions: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  period: number;
}

interface TrendMetric {
  current: number | string;
  previous: number | string;
  change: number | null;
}

interface AnalyticsTrends {
  pageViews: TrendMetric;
  sessions: TrendMetric;
  uniqueVisitors: TrendMetric;
  avgDuration: TrendMetric;
  period: number;
}

interface TopPage {
  path: string;
  views: number;
}

interface TrafficSource {
  referrer: string | null;
  sessions: number;
}

interface DeviceBreakdown {
  deviceType: string | null;
  sessions: number;
}

interface CountryData {
  country: string | null;
  sessions: number;
}

interface EngagementData {
  avgPagesPerSession: number;
  pagesPerSession?: number;
  avgTimeOnPage: number;
  bounceRate: number;
  returningVisitorRate: number;
  returningVisitorsPercent?: number;
  newVsReturning: {
    new: number;
    returning: number;
  };
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  jobTitle: string | null;
  verified: boolean;
  createdAt: string;
}

interface ScanScore {
  blogPostId?: string;
  resourceId?: string;
  aiScore?: number;
  humanScore?: number;
  plagiarismScore?: number;
  seoScore?: number;
  contentType: "blog" | "resource";
  title: string;
  completedAt: string;
}

function getTrendIcon(change: number) {
  if (change > 0) return <ArrowUpRight className="h-3 w-3" />;
  if (change < 0) return <ArrowDownRight className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

function getTrendClass(change: number) {
  if (change > 0) return "text-emerald-600 bg-emerald-500/10";
  if (change < 0) return "text-red-600 bg-red-500/10";
  return "text-muted-foreground bg-muted";
}

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  isLoading,
  trend,
  trendValue
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 sm:p-6 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold" data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </div>
            {trend && trendValue && (
              <Badge 
                className={`text-xs ${getTrendClass(trend === "up" ? 1 : trend === "down" ? -1 : 0)}`}
              >
                {getTrendIcon(trend === "up" ? 1 : trend === "down" ? -1 : 0)}
                {trendValue}
              </Badge>
            )}
          </div>
        )}
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  total,
  icon: Icon,
  color,
  isLoading
}: {
  title: string;
  value: number;
  total: number;
  icon: React.ElementType;
  color: string;
  isLoading?: boolean;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <Card data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 sm:p-6 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color} shrink-0`} />
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {isLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-semibold">{value.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">of {total.toLocaleString()}</span>
            </div>
            <Progress value={percentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{percentage}% of total</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NoDataCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType?.toLowerCase()) {
    case "desktop": return Monitor;
    case "mobile": return Smartphone;
    case "tablet": return Tablet;
    default: return Monitor;
  }
}

function DashboardContent() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const { data: analyticsOverview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/admin/analytics/overview"],
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<AnalyticsTrends>({
    queryKey: ["/api/admin/analytics/trends"],
  });

  const { data: topPages, isLoading: topPagesLoading } = useQuery<TopPage[]>({
    queryKey: ["/api/admin/analytics/top-pages"],
  });

  const { data: trafficSources, isLoading: sourcesLoading } = useQuery<TrafficSource[]>({
    queryKey: ["/api/admin/analytics/traffic-sources"],
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<DeviceBreakdown[]>({
    queryKey: ["/api/admin/analytics/devices"],
  });

  const { data: countries, isLoading: countriesLoading } = useQuery<CountryData[]>({
    queryKey: ["/api/admin/analytics/countries"],
  });

  const { data: engagement, isLoading: engagementLoading } = useQuery<EngagementData>({
    queryKey: ["/api/admin/analytics/engagement"],
  });

  const { data: recentLeads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/admin/dashboard/recent-leads"],
  });

  const { data: recentScans, isLoading: scansLoading } = useQuery<ScanScore[]>({
    queryKey: ["/api/admin/scans/recent"],
  });

  const hasAnalyticsData = analyticsOverview && (analyticsOverview.pageViews > 0 || analyticsOverview.sessions > 0);
  const hasTrendData = trends && trends.pageViews && Number(trends.pageViews.current) > 0;
  const hasEngagementData = engagement && (toNumber(engagement.avgPagesPerSession ?? engagement.pagesPerSession) > 0);
  
  const normalizedEngagement: EngagementData | null = engagement ? {
    avgPagesPerSession: toNumber(engagement.avgPagesPerSession ?? engagement.pagesPerSession),
    avgTimeOnPage: toNumber(engagement.avgTimeOnPage),
    bounceRate: toNumber(engagement.bounceRate),
    returningVisitorRate: toNumber(engagement.returningVisitorRate ?? engagement.returningVisitorsPercent),
    newVsReturning: engagement.newVsReturning ?? { new: 0, returning: 0 }
  } : null;

  const totalDeviceSessions = devices?.reduce((sum, d) => sum + d.sessions, 0) ?? 0;

  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2" data-testid="text-error-title">
          Unable to Load Dashboard
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-4" data-testid="text-error">
          Failed to load dashboard data. Please check your connection and try again.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-sm text-primary hover:underline"
          data-testid="button-retry"
        >
          Click to retry
        </button>
      </div>
    );
  }

  const conversionRate = stats && stats.totalLeads > 0 
    ? ((stats.verifiedLeads / stats.totalLeads) * 100).toFixed(1) 
    : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold" data-testid="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Overview of your Constancia Admin Centre
          </p>
        </div>
        {!hasAnalyticsData && (
          <Badge variant="outline" className="text-muted-foreground self-start sm:self-auto">
            Awaiting visitor data
          </Badge>
        )}
      </div>

      <InsightsPanel />

      {/* Key Metrics with Trends */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Page Views"
          value={analyticsOverview?.pageViews ?? 0}
          icon={Eye}
          description="Last 30 days"
          isLoading={overviewLoading}
          trend={hasTrendData ? ((trends.pageViews.change ?? 0) > 0 ? "up" : (trends.pageViews.change ?? 0) < 0 ? "down" : "neutral") : undefined}
          trendValue={hasTrendData ? `${Math.abs(trends.pageViews.change ?? 0).toFixed(1)}%` : undefined}
        />
        <StatsCard
          title="Sessions"
          value={analyticsOverview?.sessions ?? 0}
          icon={Activity}
          description="Last 30 days"
          isLoading={overviewLoading}
          trend={hasTrendData ? ((trends.sessions.change ?? 0) > 0 ? "up" : (trends.sessions.change ?? 0) < 0 ? "down" : "neutral") : undefined}
          trendValue={hasTrendData ? `${Math.abs(trends.sessions.change ?? 0).toFixed(1)}%` : undefined}
        />
        <StatsCard
          title="Unique Visitors"
          value={analyticsOverview?.uniqueVisitors ?? 0}
          icon={Users}
          description="Last 30 days"
          isLoading={overviewLoading}
          trend={hasTrendData ? ((trends.uniqueVisitors.change ?? 0) > 0 ? "up" : (trends.uniqueVisitors.change ?? 0) < 0 ? "down" : "neutral") : undefined}
          trendValue={hasTrendData ? `${Math.abs(trends.uniqueVisitors.change ?? 0).toFixed(1)}%` : undefined}
        />
        <StatsCard
          title="Avg. Session Duration"
          value={analyticsOverview?.avgSessionDuration ? formatDuration(analyticsOverview.avgSessionDuration) : "0s"}
          icon={Timer}
          description="Time on site"
          isLoading={overviewLoading}
          trend={hasTrendData ? ((trends.avgDuration.change ?? 0) > 0 ? "up" : (trends.avgDuration.change ?? 0) < 0 ? "down" : "neutral") : undefined}
          trendValue={hasTrendData ? `${Math.abs(trends.avgDuration.change ?? 0).toFixed(1)}%` : undefined}
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pages per Session"
          value={normalizedEngagement ? normalizedEngagement.avgPagesPerSession.toFixed(1) : "0.0"}
          icon={BarChart3}
          description="Average depth"
          isLoading={engagementLoading}
        />
        <StatsCard
          title="Bounce Rate"
          value={normalizedEngagement ? `${normalizedEngagement.bounceRate.toFixed(1)}%` : "0.0%"}
          icon={MousePointerClick}
          description="Single page visits"
          isLoading={engagementLoading}
        />
        <StatsCard
          title="Returning Visitors"
          value={normalizedEngagement ? `${normalizedEngagement.returningVisitorRate.toFixed(1)}%` : "0.0%"}
          icon={TrendingUp}
          description="Repeat visitors"
          isLoading={engagementLoading}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Target}
          description="Lead verification rate"
          isLoading={statsLoading}
        />
      </div>

      {/* Content & Leads Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Leads"
          value={stats?.totalLeads ?? 0}
          icon={Users}
          description="All collected leads"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Verified Leads"
          value={stats?.verifiedLeads ?? 0}
          icon={UserCheck}
          description="Email verified leads"
          isLoading={statsLoading}
        />
        <Link href="/admin/downloads" className="block hover-elevate rounded-lg">
          <StatsCard
            title="Recent Downloads"
            value={stats?.recentDownloads ?? 0}
            icon={Download}
            description="Last 30 days - Click for details"
            isLoading={statsLoading}
          />
        </Link>
        <StatsCard
          title="AI Scans"
          value={stats?.totalScans ?? 0}
          icon={ShieldCheck}
          description="Winston AI content scans"
          isLoading={statsLoading}
        />
      </div>

      {/* Latest Scan Scores */}
      <Card data-testid="card-latest-scans">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Latest Scan Scores
          </CardTitle>
          <CardDescription>Most recent AI & plagiarism detection results</CardDescription>
        </CardHeader>
        <CardContent>
          {scansLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentScans && recentScans.length > 0 ? (
            <div className="space-y-3">
              {recentScans.slice(0, 5).map((scan, index) => (
                <div key={`${scan.contentType}-${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-muted/50 border border-border/50" data-testid={`row-scan-${index}`}>
                  <div className="text-sm text-muted-foreground" data-testid={`text-scan-date-${index}`}>
                    {new Date(scan.completedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Badge variant={(scan.aiScore ?? 0) > 60 ? "destructive" : "secondary"} className="text-xs" data-testid={`badge-ai-score-${index}`}>
                      AI: {scan.aiScore ?? 0}
                    </Badge>
                    <Badge variant={(scan.plagiarismScore ?? 0) > 20 ? "destructive" : "secondary"} className="text-xs" data-testid={`badge-plagiarism-score-${index}`}>
                      Plag: {scan.plagiarismScore ?? 0}
                    </Badge>
                    <Badge variant={(scan.seoScore ?? 0) < 40 ? "destructive" : "secondary"} className="text-xs" data-testid={`badge-seo-score-${index}`}>
                      SEO: {scan.seoScore ?? 0}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No scans completed yet</p>
          )}
        </CardContent>
      </Card>

      {/* Content Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Published Posts"
          value={stats?.publishedPosts ?? 0}
          total={stats?.blogPosts ?? 0}
          icon={BookOpen}
          color="text-emerald-500"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Blog Posts"
          value={stats?.blogPosts ?? 0}
          icon={FileText}
          description="All articles in system"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Resources"
          value={stats?.resources ?? 0}
          icon={FolderOpen}
          description="Downloadable files"
          isLoading={statsLoading}
        />
      </div>

      {/* Detailed Analytics Grids */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Pages */}
        <Card data-testid="card-top-pages">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Top Pages
            </CardTitle>
            <CardDescription>Most viewed pages (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {topPagesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : topPages && topPages.length > 0 ? (
              <div className="space-y-3">
                {topPages.slice(0, 8).map((page, index) => (
                  <div key={page.path} className="flex items-center justify-between" data-testid={`row-top-page-${index}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                      <span className="text-sm truncate" title={page.path}>{page.path}</span>
                    </div>
                    <Badge variant="secondary">{page.views.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No page view data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card data-testid="card-traffic-sources">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Traffic Sources
            </CardTitle>
            <CardDescription>Where visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            {sourcesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : trafficSources && trafficSources.length > 0 ? (
              <div className="space-y-3">
                {trafficSources.slice(0, 6).map((source, index) => (
                  <div key={source.referrer || 'direct'} className="flex items-center justify-between gap-2" data-testid={`row-source-${index}`}>
                    <span className="text-sm truncate flex-1 min-w-0">{source.referrer || 'Direct Traffic'}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Progress 
                        value={(source.sessions / (trafficSources[0]?.sessions || 1)) * 100} 
                        className="w-16 sm:w-20 h-2" 
                      />
                      <Badge variant="secondary" className="min-w-[50px] justify-center">
                        {source.sessions.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No traffic data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device & Country Analytics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Device Breakdown */}
        <Card data-testid="card-devices">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Device Breakdown
            </CardTitle>
            <CardDescription>Visitor devices (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : devices && devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map((device, index) => {
                  const DevIcon = getDeviceIcon(device.deviceType);
                  const percentage = totalDeviceSessions > 0 
                    ? ((device.sessions / totalDeviceSessions) * 100).toFixed(1) 
                    : 0;
                  return (
                    <div key={device.deviceType || 'unknown'} className="flex items-center justify-between" data-testid={`row-device-${index}`}>
                      <div className="flex items-center gap-2">
                        <DevIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{device.deviceType || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={Number(percentage)} className="w-20 h-2" />
                        <Badge variant="secondary" className="min-w-[60px] justify-center">
                          {percentage}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No device data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card data-testid="card-countries">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Countries
            </CardTitle>
            <CardDescription>Visitor locations (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {countriesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : countries && countries.length > 0 ? (
              <div className="space-y-3">
                {countries.slice(0, 6).map((country, index) => (
                  <div key={country.country || 'unknown'} className="flex items-center justify-between gap-2" data-testid={`row-country-${index}`}>
                    <span className="text-sm truncate">{country.country || 'Unknown'}</span>
                    <Badge variant="secondary" className="shrink-0">{country.sessions.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No location data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card data-testid="card-recent-leads">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Leads
          </CardTitle>
          <CardDescription>Latest lead submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentLeads && recentLeads.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Company</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLeads.slice(0, 5).map((lead, index) => (
                    <TableRow key={lead.id} data-testid={`row-lead-${index}`}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {lead.firstName} {lead.lastName}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{lead.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {lead.company || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.verified ? "default" : "secondary"}>
                          {lead.verified ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No leads captured yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <DashboardContent />
    </AdminLayout>
  );
}
