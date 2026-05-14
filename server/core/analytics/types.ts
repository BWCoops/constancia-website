/**
 * Analytics Domain Types
 * 
 * Pure domain types for visitor analytics, page views, and engagement metrics.
 * These types represent business concepts without any infrastructure concerns.
 * 
 * @generated-by-ai (human-reviewed)
 */

/**
 * Analytics time range options
 */
export type AnalyticsTimeRange = 'today' | 'week' | 'month' | 'custom';

/**
 * Aggregation granularity for time-series data
 */
export type AnalyticsAggregation = 'hourly' | 'daily' | 'weekly' | 'monthly';

/**
 * Device type classification
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

/**
 * Traffic source classification
 */
export type TrafficSourceType = 
  | 'direct'
  | 'organic'
  | 'referral'
  | 'social'
  | 'email'
  | 'paid'
  | 'unknown';

/**
 * Page view domain entity
 * Represents a single page view event
 */
export interface PageView {
  id: string;
  sessionId: string;
  path: string;
  referrer: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  deviceType: DeviceType | null;
  browser: string | null;
  os: string | null;
  duration: number | null;
  isBot: boolean | null;
  createdAt: Date;
}

/**
 * Visitor session domain entity
 * Represents a user's browsing session
 */
export interface VisitorSession {
  id: string;
  visitorId: string;
  startedAt: Date;
  endedAt: Date | null;
  pageCount: number;
  totalDuration: number;
  entryPage: string | null;
  exitPage: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  country: string | null;
  city: string | null;
  deviceType: DeviceType | null;
  browser: string | null;
  os: string | null;
}

/**
 * Download event domain entity
 * Represents a resource download event
 */
export interface DownloadEvent {
  id: string;
  sessionId: string | null;
  leadId: string;
  resourceId: string;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  downloadedAt: Date;
}

/**
 * Traffic source aggregation
 */
export interface TrafficSource {
  referrer: string | null;
  sessions: number;
  sourceType: TrafficSourceType;
}

/**
 * Browser usage aggregation
 */
export interface BrowserStats {
  browser: string | null;
  sessions: number;
  percentage: number;
}

/**
 * Device usage aggregation
 */
export interface DeviceStats {
  deviceType: DeviceType | null;
  sessions: number;
  percentage: number;
}

/**
 * Time range parameters for analytics queries
 */
export interface TimeRangeParams {
  startDate: Date;
  endDate: Date;
  periodDays: number;
}

/**
 * Analytics overview stats
 */
export interface AnalyticsOverview {
  pageViews: number;
  sessions: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  period: number;
}

/**
 * Page view by path aggregation
 */
export interface PageViewByPath {
  path: string;
  views: number;
}

/**
 * Daily stats aggregation
 */
export interface DailyStats {
  date: string;
  views: number;
}

/**
 * Trend comparison data
 */
export interface TrendMetric {
  current: number;
  previous: number;
  change: number;
}

/**
 * Analytics trends comparison
 */
export interface AnalyticsTrends {
  pageViews: TrendMetric;
  sessions: TrendMetric;
  uniqueVisitors: TrendMetric;
  avgDuration: TrendMetric;
  period: number;
}

/**
 * Engagement metrics
 */
export interface EngagementMetrics {
  bounceRate: number;
  pagesPerSession: number;
  returningVisitorsPercent: number;
  totalSessions: number;
  bouncedSessions: number;
  totalPageViews: number;
  returningVisitors: number;
}

/**
 * Blog analytics stats
 */
export interface BlogAnalyticsStats {
  blogPageViews: number;
  totalPageViews: number;
  blogPercentage: number;
  topBlogPosts: PageViewByPath[];
  avgBlogDuration: number;
}

/**
 * Real-time analytics snapshot
 */
export interface RealtimeAnalytics {
  activeNow: number;
  activePages: PageViewByPath[];
  timestamp: string;
}

/**
 * Download aggregation by resource
 */
export interface DownloadsByResource {
  resourceId: string;
  resourceTitle: string;
  downloads: number;
}

/**
 * Download summary stats
 */
export interface DownloadSummary {
  totalDownloads: number;
  uniqueLeads: number;
  topResources: DownloadsByResource[];
}

/**
 * Create time range parameters from days value
 */
export function createTimeRange(days: number): TimeRangeParams {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate,
    endDate,
    periodDays: days,
  };
}

/**
 * Create comparison time ranges for trend analysis
 */
export function createComparisonTimeRanges(days: number): {
  current: TimeRangeParams;
  previous: TimeRangeParams;
} {
  const currentPeriodEnd = new Date();
  const currentPeriodStart = new Date();
  currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
  
  const previousPeriodEnd = new Date(currentPeriodStart);
  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
  
  return {
    current: {
      startDate: currentPeriodStart,
      endDate: currentPeriodEnd,
      periodDays: days,
    },
    previous: {
      startDate: previousPeriodStart,
      endDate: previousPeriodEnd,
      periodDays: days,
    },
  };
}
