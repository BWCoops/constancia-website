import { useQuery } from "@tanstack/react-query";
import { formatDuration } from "@shared/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Eye, 
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Target,
  Download,
  Activity,
  MousePointerClick,
  UserCheck,
  Percent,
  BookOpen,
  MapPin,
  Bot
} from "lucide-react";
import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Brush,
  Legend,
} from "recharts";
import { InteractiveChart } from "@/components/ui/interactive-chart";

interface AnalyticsOverview {
  pageViews: number;
  sessions: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  period: number;
  botPageViews: number;
  botSessions: number;
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

interface DailyStats {
  date: string;
  views: number;
}

interface TrendMetric {
  current: number;
  previous: number;
  change: number;
}

interface TrendsData {
  pageViews: TrendMetric;
  sessions: TrendMetric;
  uniqueVisitors: TrendMetric;
  avgDuration: TrendMetric;
  period: number;
}

interface EngagementData {
  bounceRate: number;
  pagesPerSession: number;
  returningVisitorsPercent: number;
  totalSessions: number;
  bouncedSessions: number;
  totalPageViews: number;
  returningVisitors: number;
}

interface BlogStats {
  blogViews: number;
  totalViews: number;
  blogViewsPercent: number;
  avgTimeOnBlog: number;
  topBlogPosts: Array<{
    path: string;
    title: string;
    views: number;
  }>;
}

interface CountryData {
  country: string | null;
  sessions: number;
}

interface LeadsSummary {
  totalLeads: number;
  verifiedLeads: number;
  conversionRate: number;
  uniqueVisitors: number;
  leadsBySource: Array<{
    source: string;
    count: number;
  }>;
}

interface RealtimeData {
  activeNow: number;
  activePages: Array<{
    path: string;
    count: number;
  }>;
  timestamp: string;
}

interface HourlyData {
  hour: number;
  views: number;
}

interface BrowserData {
  browser: string | null;
  views: number;
}

interface OSData {
  os: string | null;
  views: number;
}

interface DownloadAnalytics {
  totalDownloads: number;
  topResources: Array<{
    resourceId: string;
    title: string | null;
    downloads: number;
  }>;
  dailyDownloads: Array<{
    date: string;
    downloads: number;
  }>;
}

interface WeeklyComparison {
  thisWeek: {
    pageViews: number;
    sessions: number;
    leads: number;
  };
  lastWeek: {
    pageViews: number;
    sessions: number;
    leads: number;
  };
  changes: {
    pageViews: number;
    sessions: number;
    leads: number;
  };
}

const COLORS = ['#C77A93', '#7FB8A3', '#12161D', '#4ECDC4', '#45B7D1', '#FF6B6B', '#96CEB4'];

function TrendIndicator({ change, label }: { change: number; label: string }) {
  const isPositive = change >= 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const colorClass = isPositive ? "text-green-500" : "text-red-500";
  const bgClass = isPositive ? "bg-green-500/10" : "bg-red-500/10";
  
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${bgClass}`}>
      <Icon className={`h-3 w-3 ${colorClass}`} />
      <span className={`text-xs font-medium ${colorClass}`}>
        {Math.abs(change)}%
      </span>
    </div>
  );
}

function AnalyticsContent() {
  const [period, setPeriod] = useState("30");

  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/admin/analytics/overview", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/overview?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: topPages, isLoading: pagesLoading } = useQuery<TopPage[]>({
    queryKey: ["/api/admin/analytics/top-pages", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/top-pages?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery<TrafficSource[]>({
    queryKey: ["/api/admin/analytics/traffic-sources", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/traffic-sources?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<DeviceBreakdown[]>({
    queryKey: ["/api/admin/analytics/devices", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/devices?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: dailyStats, isLoading: dailyLoading } = useQuery<DailyStats[]>({
    queryKey: ["/api/admin/analytics/daily", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/daily?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendsData>({
    queryKey: ["/api/admin/analytics/trends", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/trends?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: engagement, isLoading: engagementLoading } = useQuery<EngagementData>({
    queryKey: ["/api/admin/analytics/engagement", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/engagement?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: blogStats, isLoading: blogLoading } = useQuery<BlogStats>({
    queryKey: ["/api/admin/analytics/blog-stats", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/blog-stats?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: countries, isLoading: countriesLoading } = useQuery<CountryData[]>({
    queryKey: ["/api/admin/analytics/countries", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/countries?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: leadsSummary, isLoading: leadsLoading } = useQuery<LeadsSummary>({
    queryKey: ["/api/admin/analytics/leads-summary", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/leads-summary?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: realtime, refetch: refetchRealtime } = useQuery<RealtimeData>({
    queryKey: ["/api/admin/analytics/realtime"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/realtime`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30000, // Data considered fresh for 30 seconds
    refetchInterval: 30000,
  });

  const { data: hourlyData, isLoading: hourlyLoading } = useQuery<HourlyData[]>({
    queryKey: ["/api/admin/analytics/hourly", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/hourly?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000, // Data considered fresh for 1 minute
  });

  const { data: browsers, isLoading: browsersLoading } = useQuery<BrowserData[]>({
    queryKey: ["/api/admin/analytics/browsers", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/browsers?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000, // Data considered fresh for 1 minute
  });

  const { data: osData, isLoading: osLoading } = useQuery<OSData[]>({
    queryKey: ["/api/admin/analytics/os", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/os?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000, // Data considered fresh for 1 minute
  });

  const { data: downloadStats, isLoading: downloadsLoading } = useQuery<DownloadAnalytics>({
    queryKey: ["/api/admin/analytics/downloads", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/downloads?days=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000, // Data considered fresh for 1 minute
  });

  const { data: weeklyComparison, isLoading: weeklyLoading } = useQuery<WeeklyComparison>({
    queryKey: ["/api/admin/analytics/weekly-comparison"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/weekly-comparison`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 120000, // Weekly data changes slowly - 2 minute stale time
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetchRealtime();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchRealtime]);

  const getDeviceIcon = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatReferrer = (referrer: string | null) => {
    if (!referrer || referrer === 'Direct' || referrer === 'direct') return "Direct / None";
    try {
      const url = new URL(referrer);
      const hostname = url.hostname;
      // Handle Replit dev URLs - show as "Replit Preview" instead of long UUID hostname
      if (hostname.includes('.replit.dev') || hostname.includes('.repl.co')) {
        const path = url.pathname;
        if (path && path !== '/') {
          const cleanPath = path.replace(/^\//, '').split('/')[0];
          return cleanPath || 'Replit Preview';
        }
        return 'Replit Preview';
      }
      if (hostname === 'replit.com') return 'Replit';
      if (hostname === '127.0.0.1' || hostname === 'localhost') return 'Local Dev';
      return hostname.replace('www.', '');
    } catch {
      return referrer;
    }
  };

  const handleExportReport = () => {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    let csvContent = "Analytics Report\n";
    csvContent += `Period: ${formatDate(startDate)} to ${formatDate(now)}\n\n`;
    
    csvContent += "Overview Metrics\n";
    csvContent += `Page Views,${overview?.pageViews || 0}\n`;
    csvContent += `Sessions,${overview?.sessions || 0}\n`;
    csvContent += `Unique Visitors,${overview?.uniqueVisitors || 0}\n`;
    csvContent += `Avg Session Duration (seconds),${overview?.avgSessionDuration || 0}\n\n`;
    
    if (trends) {
      csvContent += "Trend Comparisons\n";
      csvContent += `Metric,Current,Previous,Change %\n`;
      csvContent += `Page Views,${trends.pageViews.current},${trends.pageViews.previous},${trends.pageViews.change}\n`;
      csvContent += `Sessions,${trends.sessions.current},${trends.sessions.previous},${trends.sessions.change}\n`;
      csvContent += `Unique Visitors,${trends.uniqueVisitors.current},${trends.uniqueVisitors.previous},${trends.uniqueVisitors.change}\n`;
      csvContent += `Avg Duration,${trends.avgDuration.current},${trends.avgDuration.previous},${trends.avgDuration.change}\n\n`;
    }
    
    if (engagement) {
      csvContent += "Engagement Metrics\n";
      csvContent += `Bounce Rate %,${engagement.bounceRate}\n`;
      csvContent += `Pages Per Session,${engagement.pagesPerSession}\n`;
      csvContent += `Returning Visitors %,${engagement.returningVisitorsPercent}\n\n`;
    }
    
    if (topPages && topPages.length > 0) {
      csvContent += "Top Pages\n";
      csvContent += "Page,Views\n";
      topPages.forEach(page => {
        csvContent += `"${page.path}",${page.views}\n`;
      });
      csvContent += "\n";
    }
    
    if (sources && sources.length > 0) {
      csvContent += "Traffic Sources\n";
      csvContent += "Source,Sessions\n";
      sources.forEach(source => {
        csvContent += `"${formatReferrer(source.referrer)}",${source.sessions}\n`;
      });
      csvContent += "\n";
    }
    
    if (devices && devices.length > 0) {
      csvContent += "Device Breakdown\n";
      csvContent += "Device Type,Sessions\n";
      devices.forEach(device => {
        csvContent += `"${device.deviceType || 'Desktop'}",${device.sessions}\n`;
      });
      csvContent += "\n";
    }
    
    if (countries && countries.length > 0) {
      csvContent += "Top Countries\n";
      csvContent += "Country,Sessions\n";
      countries.forEach(country => {
        csvContent += `"${country.country || 'Unknown'}",${country.sessions}\n`;
      });
      csvContent += "\n";
    }
    
    if (blogStats) {
      csvContent += "Blog Analytics\n";
      csvContent += `Blog Views,${blogStats.blogViews}\n`;
      csvContent += `Blog Views % of Total,${blogStats.blogViewsPercent}\n`;
      csvContent += `Avg Time on Blog (seconds),${blogStats.avgTimeOnBlog}\n`;
      if (blogStats.topBlogPosts.length > 0) {
        csvContent += "\nTop Blog Posts\n";
        csvContent += "Post,Views\n";
        blogStats.topBlogPosts.forEach(post => {
          csvContent += `"${post.path}",${post.views}\n`;
        });
      }
      csvContent += "\n";
    }
    
    if (leadsSummary) {
      csvContent += "Lead Conversion\n";
      csvContent += `Total Leads,${leadsSummary.totalLeads}\n`;
      csvContent += `Verified Leads,${leadsSummary.verifiedLeads}\n`;
      csvContent += `Conversion Rate %,${leadsSummary.conversionRate}\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-report-${formatDate(startDate)}-to-${formatDate(now)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = overviewLoading || pagesLoading || sourcesLoading || devicesLoading || dailyLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const hasData = (overview?.pageViews ?? 0) > 0 || (overview?.sessions ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Visitor Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track website traffic and user engagement
            </p>
          </div>
          {realtime && (
            <Badge variant="outline" className="flex items-center gap-2 animate-pulse" data-testid="badge-realtime">
              <Activity className="h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">{realtime.activeNow}</span>
              <span className="text-muted-foreground">active now</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={handleExportReport}
            data-testid="button-export-report"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last 1 year</SelectItem>
              <SelectItem value="9999">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-page-views">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="text-2xl font-bold">{overview?.pageViews?.toLocaleString() ?? 0}</div>
              {trends && <TrendIndicator change={trends.pageViews.change} label="vs prev" />}
            </div>
            <p className="text-xs text-muted-foreground">Last {period} days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-sessions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="text-2xl font-bold">{overview?.sessions?.toLocaleString() ?? 0}</div>
              {trends && <TrendIndicator change={trends.sessions.change} label="vs prev" />}
            </div>
            <p className="text-xs text-muted-foreground">Last {period} days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-visitors">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="text-2xl font-bold">{overview?.uniqueVisitors?.toLocaleString() ?? 0}</div>
              {trends && <TrendIndicator change={trends.uniqueVisitors.change} label="vs prev" />}
            </div>
            <p className="text-xs text-muted-foreground">Last {period} days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-duration">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="text-2xl font-bold">{formatDuration(overview?.avgSessionDuration ?? 0)}</div>
              {trends && <TrendIndicator change={trends.avgDuration.change} label="vs prev" />}
            </div>
            <p className="text-xs text-muted-foreground">Last {period} days</p>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Analytics Data Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Once visitors start browsing your website, you'll see detailed analytics about page views, 
                traffic sources, and user engagement here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-bounce-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {engagementLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{engagement?.bounceRate ?? 0}%</div>
                    <p className="text-xs text-muted-foreground">
                      {engagement?.bouncedSessions ?? 0} of {engagement?.totalSessions ?? 0} sessions
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-pages-per-session">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pages / Session</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {engagementLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{engagement?.pagesPerSession ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {engagement?.totalPageViews ?? 0} pages viewed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-bot-traffic">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bot Traffic</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{overview?.botPageViews?.toLocaleString() ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {overview?.botSessions ?? 0} bot sessions (excluded from metrics)
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-returning-visitors">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Returning Visitors</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {engagementLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{engagement?.returningVisitorsPercent ?? 0}%</div>
                    <p className="text-xs text-muted-foreground">
                      {engagement?.returningVisitors ?? 0} returning visitors
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-total-leads">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{leadsSummary?.totalLeads ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {leadsSummary?.verifiedLeads ?? 0} verified
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-conversion-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{leadsSummary?.conversionRate ?? 0}%</div>
                    <p className="text-xs text-muted-foreground">
                      From {leadsSummary?.uniqueVisitors ?? 0} visitors
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-blog-traffic">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Blog Traffic</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {blogLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{blogStats?.blogViewsPercent ?? 0}%</div>
                    <p className="text-xs text-muted-foreground">
                      {blogStats?.blogViews ?? 0} of {blogStats?.totalViews ?? 0} views
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-daily-chart">
            <CardHeader>
              <CardTitle>Daily Page Views</CardTitle>
              <CardDescription>Page views over the selected period - drag the brush below to zoom</CardDescription>
            </CardHeader>
            <CardContent>
              <InteractiveChart 
                title="Daily Page Views" 
                height={320}
                dataLength={dailyStats?.length || 0}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#C77A93" 
                      strokeWidth={2}
                      dot={{ fill: "#C77A93", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#C77A93" }}
                      name="Page Views"
                    />
                    {(dailyStats?.length || 0) > 14 && (
                      <Brush 
                        dataKey="date" 
                        height={25} 
                        stroke="#C77A93"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </InteractiveChart>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-top-pages">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Top Pages
                </CardTitle>
                <CardDescription>Most visited pages</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {topPages && topPages.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.map((page, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium truncate max-w-[200px]">
                            {page.path || "/"}
                          </TableCell>
                          <TableCell className="text-right">{page.views}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No page data available</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-traffic-sources">
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where your visitors come from</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {sources && sources.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sources.map((source, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {formatReferrer(source.referrer)}
                          </TableCell>
                          <TableCell className="text-right">{source.sessions}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No source data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-blog-analytics">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Blog Analytics
                </CardTitle>
                <CardDescription>Blog content performance</CardDescription>
              </CardHeader>
              <CardContent>
                {blogLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : blogStats?.topBlogPosts && blogStats.topBlogPosts.length > 0 ? (
                  <div className="space-y-4 overflow-x-auto">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg. time on blog</span>
                      <span className="font-medium">{formatDuration(blogStats.avgTimeOnBlog)}</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Post</TableHead>
                          <TableHead className="text-right">Views</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blogStats.topBlogPosts.slice(0, 5).map((post, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium truncate max-w-[200px] capitalize">
                              {post.title}
                            </TableCell>
                            <TableCell className="text-right">{post.views}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No blog data available</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-countries">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top Countries
                </CardTitle>
                <CardDescription>Geographic distribution of visitors</CardDescription>
              </CardHeader>
              <CardContent>
                {countriesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : countries && countries.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countries} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis 
                          dataKey="country" 
                          type="category" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12}
                          width={80}
                          tickFormatter={(value) => value || "Unknown"}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="sessions" fill="#C77A93" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No country data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-devices">
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
                <CardDescription>Visitor devices - hover chart for fullscreen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-full md:w-1/2 h-64">
                    {devices && devices.length > 0 ? (
                      <InteractiveChart 
                        title="Device Breakdown" 
                        height={256}
                        enableZoomControls={false}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={devices.map(d => ({
                                name: d.deviceType || "Desktop",
                                value: d.sessions
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {devices.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: "hsl(var(--card))", 
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px"
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </InteractiveChart>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">No device data available</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-1/2 space-y-3">
                    {devices?.map((device, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getDeviceIcon(device.deviceType)}
                          <span className="font-medium capitalize">{device.deviceType || "Desktop"}</span>
                        </div>
                        <span className="text-muted-foreground">{device.sessions} sessions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-leads-by-source">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Leads by Source
                </CardTitle>
                <CardDescription>Where your leads come from</CardDescription>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : leadsSummary?.leadsBySource && leadsSummary.leadsBySource.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadsSummary.leadsBySource}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="source" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12}
                          tickFormatter={(value) => {
                            if (!value || value === 'null' || value === 'Direct' || value === 'direct') return 'Direct';
                            // Handle Replit dev hostnames directly (may not have protocol)
                            if (value.includes('.replit.dev') || value.includes('.repl.co')) {
                              return 'Replit Preview';
                            }
                            if (value === '127.0.0.1' || value === 'localhost') return 'Local Dev';
                            if (value === 'replit.com') return 'Replit';
                            try {
                              const url = new URL(value);
                              const hostname = url.hostname;
                              if (hostname.includes('.replit.dev') || hostname.includes('.repl.co')) {
                                return 'Replit Preview';
                              }
                              if (hostname === 'replit.com') return 'Replit';
                              if (hostname === '127.0.0.1' || hostname === 'localhost') return 'Local Dev';
                              return hostname.replace('www.', '');
                            } catch {
                              // Not a valid URL - check if it's a hostname
                              const cleaned = value.replace('www.', '');
                              return cleaned.length > 20 ? cleaned.slice(0, 20) + '...' : cleaned;
                            }
                          }}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="count" fill="#7FB8A3" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-muted-foreground">No lead source data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Weekly Comparison */}
          {weeklyComparison && (
            <Card data-testid="card-weekly-comparison">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  This Week vs Last Week
                </CardTitle>
                <CardDescription>Compare performance with the previous week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Page Views</span>
                      <TrendIndicator change={weeklyComparison.changes.pageViews} label="vs last week" />
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">{weeklyComparison.thisWeek.pageViews}</span>
                      <span className="text-sm text-muted-foreground mb-1">vs {weeklyComparison.lastWeek.pageViews}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Sessions</span>
                      <TrendIndicator change={weeklyComparison.changes.sessions} label="vs last week" />
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">{weeklyComparison.thisWeek.sessions}</span>
                      <span className="text-sm text-muted-foreground mb-1">vs {weeklyComparison.lastWeek.sessions}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Leads</span>
                      <TrendIndicator change={weeklyComparison.changes.leads} label="vs last week" />
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">{weeklyComparison.thisWeek.leads}</span>
                      <span className="text-sm text-muted-foreground mb-1">vs {weeklyComparison.lastWeek.leads}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hourly Traffic */}
          <Card data-testid="card-hourly-traffic">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Traffic by Hour
              </CardTitle>
              <CardDescription>When your visitors are most active - hover for fullscreen</CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : hourlyData && hourlyData.length > 0 ? (
                <InteractiveChart 
                  title="Traffic by Hour" 
                  height={256}
                  dataLength={hourlyData.length}
                  enableZoomControls={false}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="hour" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickFormatter={(value) => `${value}:00`}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        labelFormatter={(value) => `${value}:00 - ${value}:59`}
                      />
                      <Bar dataKey="views" fill="#4ECDC4" radius={[4, 4, 0, 0]} name="Page Views" />
                    </BarChart>
                  </ResponsiveContainer>
                </InteractiveChart>
              ) : (
                <p className="text-muted-foreground text-center py-4">No hourly data available</p>
              )}
            </CardContent>
          </Card>

          {/* Browser & OS Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-browsers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Browsers
                </CardTitle>
                <CardDescription>Browser usage breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {browsersLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : browsers && browsers.length > 0 ? (
                  <div className="space-y-3">
                    {browsers.map((browser, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium capitalize">{browser.browser || "Unknown"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{browser.views} views</span>
                          <div 
                            className="w-20 h-2 bg-muted rounded-full overflow-hidden"
                          >
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${(browser.views / (browsers[0]?.views || 1)) * 100}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No browser data available</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-os">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Operating Systems
                </CardTitle>
                <CardDescription>OS usage breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {osLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : osData && osData.length > 0 ? (
                  <div className="space-y-3">
                    {osData.map((os, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium capitalize">{os.os || "Unknown"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{os.views} views</span>
                          <div 
                            className="w-20 h-2 bg-muted rounded-full overflow-hidden"
                          >
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${(os.views / (osData[0]?.views || 1)) * 100}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No OS data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Download Analytics */}
          <Card data-testid="card-downloads">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Resource Downloads
              </CardTitle>
              <CardDescription>Download activity and top resources</CardDescription>
            </CardHeader>
            <CardContent>
              {downloadsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : downloadStats ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Downloads</p>
                      <p className="text-3xl font-bold">{downloadStats.totalDownloads}</p>
                    </div>
                  </div>

                  {downloadStats.topResources && downloadStats.topResources.length > 0 && (
                    <div className="overflow-x-auto">
                      <h4 className="text-sm font-medium mb-3">Top Downloaded Resources</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Resource</TableHead>
                            <TableHead className="text-right">Downloads</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {downloadStats.topResources.map((resource, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium truncate max-w-[300px]">
                                {resource.title || "Untitled Resource"}
                              </TableCell>
                              <TableCell className="text-right">{resource.downloads}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {downloadStats.dailyDownloads && downloadStats.dailyDownloads.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Daily Downloads</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={downloadStats.dailyDownloads}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="date" 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={12}
                              tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: "hsl(var(--card))", 
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px"
                              }}
                              labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                            />
                            <Bar dataKey="downloads" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No download data available</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  return (
    <AdminLayout>
      <AnalyticsContent />
    </AdminLayout>
  );
}
