/**
 * Analytics Core Module
 * 
 * Exports all analytics domain types, interfaces, and services.
 * This module provides pure business logic for visitor analytics,
 * page views, and engagement metrics.
 * 
 * @generated-by-ai (human-reviewed)
 */

// Domain types
export type {
  AnalyticsTimeRange,
  AnalyticsAggregation,
  DeviceType,
  TrafficSourceType,
  PageView,
  VisitorSession,
  DownloadEvent,
  TrafficSource,
  BrowserStats,
  DeviceStats,
  TimeRangeParams,
  AnalyticsOverview,
  PageViewByPath,
  DailyStats,
  TrendMetric,
  AnalyticsTrends,
  EngagementMetrics,
  BlogAnalyticsStats,
  RealtimeAnalytics,
  DownloadsByResource,
  DownloadSummary,
} from './types';

export {
  createTimeRange,
  createComparisonTimeRanges,
} from './types';

// Repository interfaces
export type {
  IPageViewRepository,
  CreatePageViewData,
  ISessionRepository,
  CreateSessionData,
  UpdateSessionData,
  IDownloadRepository,
  CreateDownloadData,
  IAnalyticsService,
} from './interfaces';

export {
  calculatePercentageChange,
  calculatePercentage,
  calculateBounceRate,
  calculatePagesPerSession,
} from './interfaces';

// Service implementations
export {
  AnalyticsService,
  AnalyticsError,
  createAnalyticsService,
} from './services/analytics.service';
