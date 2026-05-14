/**
 * Dashboard Repository Implementation
 * 
 * Implements IDashboardRepository interface by wrapping the storage layer.
 * Provides aggregate statistics for the admin dashboard.
 */

import type { IStorage } from '../../storage';
import type { IDashboardRepository } from '../../core/admin/interfaces';
import type { RecentLead, RecentScan } from '../../core/admin/types';

export class DashboardRepository implements IDashboardRepository {
  constructor(private readonly storage: IStorage) {}

  async getBlogPostCount(): Promise<number> {
    const result = await this.storage.getBlogPosts();
    return result.total;
  }

  async getPublishedBlogPostCount(): Promise<number> {
    const result = await this.storage.getBlogPosts();
    return result.total;
  }

  async getResourceCount(): Promise<number> {
    const result = await this.storage.getResourceFiles();
    return result.total;
  }

  async getLeadCount(): Promise<number> {
    throw new Error(
      'DashboardRepository.getLeadCount: Not implemented. ' +
      'Storage layer does not yet support counting all leads. ' +
      'Implement storage.getResourceLeadCount to enable this method.'
    );
  }

  async getVerifiedLeadCount(): Promise<number> {
    throw new Error(
      'DashboardRepository.getVerifiedLeadCount: Not implemented. ' +
      'Storage layer does not yet support counting verified leads. ' +
      'Implement storage.getVerifiedResourceLeadCount to enable this method.'
    );
  }

  async getRecentDownloadCount(_since: Date): Promise<number> {
    throw new Error(
      'DashboardRepository.getRecentDownloadCount: Not implemented. ' +
      'Storage layer does not yet support counting downloads since a date. ' +
      'Implement storage.getDownloadCountSince to enable this method.'
    );
  }

  async getScanCount(): Promise<number> {
    throw new Error(
      'DashboardRepository.getScanCount: Not implemented. ' +
      'Storage layer does not yet support counting content scans. ' +
      'Implement storage.getContentScanCount to enable this method.'
    );
  }

  async getPageViewCount(_since: Date): Promise<number> {
    throw new Error(
      'DashboardRepository.getPageViewCount: Not implemented. ' +
      'Storage layer does not yet support counting page views since a date. ' +
      'Implement storage.getPageViewCountSince to enable this method.'
    );
  }

  async getSessionCount(_since: Date): Promise<number> {
    throw new Error(
      'DashboardRepository.getSessionCount: Not implemented. ' +
      'Storage layer does not yet support counting sessions since a date. ' +
      'Implement storage.getVisitorSessionCountSince to enable this method.'
    );
  }

  async getRecentLeads(_limit: number): Promise<RecentLead[]> {
    throw new Error(
      'DashboardRepository.getRecentLeads: Not implemented. ' +
      'Storage layer does not yet support fetching recent leads with limit. ' +
      'Implement storage.getRecentResourceLeads to enable this method.'
    );
  }

  async getRecentScans(_limit: number): Promise<RecentScan[]> {
    throw new Error(
      'DashboardRepository.getRecentScans: Not implemented. ' +
      'Storage layer does not yet support fetching recent content scans. ' +
      'Implement storage.getRecentContentScans to enable this method.'
    );
  }
}

export function createDashboardRepository(storage: IStorage): IDashboardRepository {
  return new DashboardRepository(storage);
}
