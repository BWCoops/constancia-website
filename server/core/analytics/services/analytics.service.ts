/**
 * Analytics Service
 * 
 * Pure business logic for analytics calculations and aggregations.
 * This service contains NO HTTP imports and NO database imports.
 * All data access is abstracted through repository interfaces.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Result } from '../../types';
import { success, failure, DomainError } from '../../types';
import type {
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
  DownloadSummary,
  TrendMetric,
} from '../types';
import { createComparisonTimeRanges } from '../types';
import type {
  IPageViewRepository,
  ISessionRepository,
  IDownloadRepository,
  IAnalyticsService,
} from '../interfaces';
import {
  calculatePercentageChange,
  calculatePercentage,
  calculateBounceRate,
  calculatePagesPerSession,
} from '../interfaces';

/**
 * Analytics calculation error
 */
export class AnalyticsError extends DomainError {
  readonly code = 'ANALYTICS_ERROR';
  readonly statusCode = 500;
  
  constructor(message: string) {
    super(message);
  }
}

/**
 * Analytics Service Implementation
 * 
 * Provides business logic for analytics calculations.
 * Depends on repository interfaces for data access.
 */
export class AnalyticsService implements IAnalyticsService {
  constructor(
    private readonly pageViewRepository: IPageViewRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly downloadRepository: IDownloadRepository
  ) {}

  /**
   * Get analytics overview stats for a time range
   */
  async getOverview(timeRange: TimeRangeParams): Promise<Result<AnalyticsOverview>> {
    try {
      const [pageViews, sessions, uniqueVisitors, avgDuration] = await Promise.all([
        this.pageViewRepository.countByTimeRange(timeRange),
        this.sessionRepository.countByTimeRange(timeRange),
        this.sessionRepository.countUniqueVisitors(timeRange),
        this.sessionRepository.getAverageSessionDuration(timeRange),
      ]);

      return success({
        pageViews,
        sessions,
        uniqueVisitors,
        avgSessionDuration: Math.round(avgDuration),
        period: timeRange.periodDays,
      });
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to calculate analytics overview: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get top pages by view count
   */
  async getTopPages(
    timeRange: TimeRangeParams,
    limit: number = 10
  ): Promise<Result<PageViewByPath[]>> {
    try {
      const topPages = await this.pageViewRepository.aggregateByPath(timeRange, limit);
      return success(topPages);
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to get top pages: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get daily statistics for a time range
   */
  async getDailyStats(timeRange: TimeRangeParams): Promise<Result<DailyStats[]>> {
    try {
      const dailyStats = await this.pageViewRepository.aggregateByTime(timeRange, 'daily');
      return success(dailyStats);
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to get daily stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get trends comparing current period to previous period
   */
  async getTrends(timeRange: TimeRangeParams): Promise<Result<AnalyticsTrends>> {
    try {
      const { current, previous } = createComparisonTimeRanges(timeRange.periodDays);

      const [
        currentPageViews,
        previousPageViews,
        currentSessions,
        previousSessions,
        currentVisitors,
        previousVisitors,
        currentAvgDuration,
        previousAvgDuration,
      ] = await Promise.all([
        this.pageViewRepository.countByTimeRange(current),
        this.pageViewRepository.countByTimeRange(previous),
        this.sessionRepository.countByTimeRange(current),
        this.sessionRepository.countByTimeRange(previous),
        this.sessionRepository.countUniqueVisitors(current),
        this.sessionRepository.countUniqueVisitors(previous),
        this.sessionRepository.getAverageSessionDuration(current),
        this.sessionRepository.getAverageSessionDuration(previous),
      ]);

      const createTrendMetric = (currentVal: number, previousVal: number): TrendMetric => ({
        current: Math.round(currentVal),
        previous: Math.round(previousVal),
        change: calculatePercentageChange(currentVal, previousVal),
      });

      return success({
        pageViews: createTrendMetric(currentPageViews, previousPageViews),
        sessions: createTrendMetric(currentSessions, previousSessions),
        uniqueVisitors: createTrendMetric(currentVisitors, previousVisitors),
        avgDuration: createTrendMetric(currentAvgDuration, previousAvgDuration),
        period: timeRange.periodDays,
      });
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to calculate trends: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get engagement metrics for a time range
   */
  async getEngagementMetrics(
    timeRange: TimeRangeParams
  ): Promise<Result<EngagementMetrics>> {
    try {
      const [
        totalSessions,
        bouncedSessions,
        totalPageViews,
        returningVisitors,
        uniqueVisitors,
      ] = await Promise.all([
        this.sessionRepository.countByTimeRange(timeRange),
        this.sessionRepository.countBounces(timeRange),
        this.pageViewRepository.countByTimeRange(timeRange),
        this.sessionRepository.countReturningVisitors(timeRange),
        this.sessionRepository.countUniqueVisitors(timeRange),
      ]);

      return success({
        bounceRate: calculateBounceRate(bouncedSessions, totalSessions),
        pagesPerSession: calculatePagesPerSession(totalPageViews, totalSessions),
        returningVisitorsPercent: calculatePercentage(returningVisitors, uniqueVisitors),
        totalSessions,
        bouncedSessions,
        totalPageViews,
        returningVisitors,
      });
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to calculate engagement metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get traffic sources aggregation
   */
  async getTrafficSources(
    timeRange: TimeRangeParams,
    limit: number = 10
  ): Promise<Result<TrafficSource[]>> {
    try {
      const sources = await this.sessionRepository.aggregateByReferrer(timeRange, limit);
      return success(sources);
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to get traffic sources: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get browser usage statistics
   */
  async getBrowserStats(timeRange: TimeRangeParams): Promise<Result<BrowserStats[]>> {
    try {
      const browserStats = await this.sessionRepository.aggregateByBrowser(timeRange);
      return success(browserStats);
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to get browser stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get device usage statistics
   */
  async getDeviceStats(timeRange: TimeRangeParams): Promise<Result<DeviceStats[]>> {
    try {
      const deviceStats = await this.sessionRepository.aggregateByDevice(timeRange);
      return success(deviceStats);
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to get device stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get blog-specific analytics
   */
  async getBlogStats(timeRange: TimeRangeParams): Promise<Result<BlogAnalyticsStats>> {
    try {
      const [blogPageViews, totalPageViews, topBlogPosts, avgBlogDuration] = await Promise.all([
        this.pageViewRepository.countBlogViews(timeRange),
        this.pageViewRepository.countByTimeRange(timeRange),
        this.pageViewRepository.aggregateByPath(timeRange, 10),
        this.pageViewRepository.getAverageDuration(timeRange, '/blog/'),
      ]);

      const filteredBlogPosts = topBlogPosts.filter(p => p.path.startsWith('/blog/'));

      return success({
        blogPageViews,
        totalPageViews,
        blogPercentage: calculatePercentage(blogPageViews, totalPageViews),
        topBlogPosts: filteredBlogPosts,
        avgBlogDuration: Math.round(avgBlogDuration),
      });
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to get blog stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get real-time analytics snapshot
   */
  async getRealtimeStats(activeMinutes: number = 5): Promise<Result<RealtimeAnalytics>> {
    try {
      const [activeSessions, activePages] = await Promise.all([
        this.sessionRepository.getActiveSessions(activeMinutes),
        this.pageViewRepository.getActivePages(activeMinutes),
      ]);

      return success({
        activeNow: activeSessions,
        activePages,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to get realtime stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }

  /**
   * Get download summary statistics
   */
  async getDownloadSummary(
    timeRange: TimeRangeParams,
    limit: number = 10
  ): Promise<Result<DownloadSummary>> {
    try {
      const [totalDownloads, uniqueLeads, topResources] = await Promise.all([
        this.downloadRepository.countByTimeRange(timeRange),
        this.downloadRepository.countUniqueLeads(timeRange),
        this.downloadRepository.aggregateByResource(timeRange, limit),
      ]);

      return success({
        totalDownloads,
        uniqueLeads,
        topResources,
      });
    } catch (error) {
      return failure(new AnalyticsError(
        `Failed to get download summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  }
}

/**
 * Factory function to create AnalyticsService instance
 */
export function createAnalyticsService(
  pageViewRepository: IPageViewRepository,
  sessionRepository: ISessionRepository,
  downloadRepository: IDownloadRepository
): AnalyticsService {
  return new AnalyticsService(pageViewRepository, sessionRepository, downloadRepository);
}
