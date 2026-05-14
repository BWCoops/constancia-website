/**
 * Analytics Service Interfaces
 * 
 * Defines contracts for analytics business logic services.
 * These interfaces enable dependency injection and testability.
 * 
 * IMPORTANT: Core services MUST NOT import from /api or /db directly.
 * They receive dependencies through these interfaces.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Result } from '../types';
import type {
  PageView,
  VisitorSession,
  DownloadEvent,
  TimeRangeParams,
  AnalyticsOverview,
  PageViewByPath,
  DailyStats,
  AnalyticsTrends,
  EngagementMetrics,
  BlogAnalyticsStats,
  RealtimeAnalytics,
  TrafficSource,
  BrowserStats,
  DeviceStats,
  DownloadsByResource,
  DownloadSummary,
  AnalyticsAggregation,
} from './types';

/**
 * Page View Repository Interface
 * Abstracts data access for page view records
 */
export interface IPageViewRepository {
  record(data: CreatePageViewData): Promise<PageView>;
  findById(id: string): Promise<PageView | null>;
  findBySessionId(sessionId: string): Promise<PageView[]>;
  findByTimeRange(params: TimeRangeParams): Promise<PageView[]>;
  countByTimeRange(params: TimeRangeParams): Promise<number>;
  aggregateByPath(params: TimeRangeParams, limit?: number): Promise<PageViewByPath[]>;
  aggregateByTime(params: TimeRangeParams, aggregation: AnalyticsAggregation): Promise<DailyStats[]>;
  aggregateByBrowser(params: TimeRangeParams): Promise<BrowserStats[]>;
  countBlogViews(params: TimeRangeParams): Promise<number>;
  getAverageDuration(params: TimeRangeParams, pathPrefix?: string): Promise<number>;
  getActivePages(sinceMinutes: number): Promise<PageViewByPath[]>;
}

/**
 * Data for creating a page view record
 */
export interface CreatePageViewData {
  sessionId: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  duration?: number;
  isBot?: boolean;
}

/**
 * Session Repository Interface
 * Abstracts data access for visitor session records
 */
export interface ISessionRepository {
  record(data: CreateSessionData): Promise<VisitorSession>;
  findById(id: string): Promise<VisitorSession | null>;
  findByVisitorId(visitorId: string): Promise<VisitorSession[]>;
  findByTimeRange(params: TimeRangeParams): Promise<VisitorSession[]>;
  countByTimeRange(params: TimeRangeParams): Promise<number>;
  countUniqueVisitors(params: TimeRangeParams): Promise<number>;
  countBounces(params: TimeRangeParams): Promise<number>;
  countReturningVisitors(params: TimeRangeParams): Promise<number>;
  getAverageSessionDuration(params: TimeRangeParams): Promise<number>;
  aggregateByReferrer(params: TimeRangeParams, limit?: number): Promise<TrafficSource[]>;
  aggregateByDevice(params: TimeRangeParams): Promise<DeviceStats[]>;
  aggregateByBrowser(params: TimeRangeParams): Promise<BrowserStats[]>;
  getActiveSessions(sinceMinutes: number): Promise<number>;
  update(id: string, data: UpdateSessionData): Promise<VisitorSession | null>;
}

/**
 * Data for creating a session record
 */
export interface CreateSessionData {
  visitorId: string;
  entryPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

/**
 * Data for updating a session record
 */
export interface UpdateSessionData {
  endedAt?: Date;
  pageCount?: number;
  totalDuration?: number;
  exitPage?: string;
}

/**
 * Download Repository Interface
 * Abstracts data access for download event records
 */
export interface IDownloadRepository {
  record(data: CreateDownloadData): Promise<DownloadEvent>;
  findById(id: string): Promise<DownloadEvent | null>;
  findByLeadId(leadId: string): Promise<DownloadEvent[]>;
  findByResourceId(resourceId: string): Promise<DownloadEvent[]>;
  findByTimeRange(params: TimeRangeParams): Promise<DownloadEvent[]>;
  countByTimeRange(params: TimeRangeParams): Promise<number>;
  countUniqueLeads(params: TimeRangeParams): Promise<number>;
  aggregateByResource(params: TimeRangeParams, limit?: number): Promise<DownloadsByResource[]>;
}

/**
 * Data for creating a download record
 */
export interface CreateDownloadData {
  sessionId?: string;
  leadId: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}

/**
 * Analytics Service Interface
 * High-level business logic for analytics and reporting
 */
export interface IAnalyticsService {
  getOverview(timeRange: TimeRangeParams): Promise<Result<AnalyticsOverview>>;
  getTopPages(timeRange: TimeRangeParams, limit?: number): Promise<Result<PageViewByPath[]>>;
  getDailyStats(timeRange: TimeRangeParams): Promise<Result<DailyStats[]>>;
  getTrends(timeRange: TimeRangeParams): Promise<Result<AnalyticsTrends>>;
  getEngagementMetrics(timeRange: TimeRangeParams): Promise<Result<EngagementMetrics>>;
  getTrafficSources(timeRange: TimeRangeParams, limit?: number): Promise<Result<TrafficSource[]>>;
  getBrowserStats(timeRange: TimeRangeParams): Promise<Result<BrowserStats[]>>;
  getDeviceStats(timeRange: TimeRangeParams): Promise<Result<DeviceStats[]>>;
  getBlogStats(timeRange: TimeRangeParams): Promise<Result<BlogAnalyticsStats>>;
  getRealtimeStats(activeMinutes?: number): Promise<Result<RealtimeAnalytics>>;
  getDownloadSummary(timeRange: TimeRangeParams, limit?: number): Promise<Result<DownloadSummary>>;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Calculate bounce rate
 */
export function calculateBounceRate(bouncedSessions: number, totalSessions: number): number {
  if (totalSessions === 0) return 0;
  return Math.round((bouncedSessions / totalSessions) * 100);
}

/**
 * Calculate pages per session
 */
export function calculatePagesPerSession(totalPageViews: number, totalSessions: number): number {
  if (totalSessions === 0) return 0;
  return Math.round((totalPageViews / totalSessions) * 10) / 10;
}
