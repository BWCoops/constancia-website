/**
 * Download Repository Implementation
 * 
 * Implements IDownloadRepository interface by wrapping the existing storage layer.
 * Maps between database records (ResourceDownloadDb) and domain types (DownloadEvent).
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IStorage } from '../../storage';
import type {
  IDownloadRepository,
  CreateDownloadData,
} from '../../core/analytics/interfaces';
import type {
  DownloadEvent,
  TimeRangeParams,
  DownloadsByResource,
} from '../../core/analytics/types';
import type { ResourceDownloadDb } from '@shared/schema';

function mapDbDownloadToDomain(dbDownload: ResourceDownloadDb): DownloadEvent {
  return {
    id: dbDownload.id,
    sessionId: dbDownload.sessionId,
    leadId: dbDownload.leadId,
    resourceId: dbDownload.resourceId,
    ipAddress: dbDownload.ipAddress,
    userAgent: dbDownload.userAgent,
    referrer: dbDownload.referrer,
    downloadedAt: dbDownload.downloadedAt,
  };
}

export class DownloadRepository implements IDownloadRepository {
  constructor(private readonly storage: IStorage) {}

  async record(data: CreateDownloadData): Promise<DownloadEvent> {
    const dbDownload = await this.storage.createResourceDownload({
      sessionId: data.sessionId,
      leadId: data.leadId,
      resourceId: data.resourceId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      referrer: data.referrer,
    });
    return mapDbDownloadToDomain(dbDownload);
  }

  async findById(_id: string): Promise<DownloadEvent | null> {
    throw new Error(
      'DownloadRepository.findById: Not implemented. ' +
      'Storage layer does not yet support lookup by ID. ' +
      'Implement storage.getResourceDownloadById to enable this method.'
    );
  }

  async findByLeadId(leadId: string): Promise<DownloadEvent[]> {
    const dbDownloads = await this.storage.getDownloadsByLead(leadId);
    return dbDownloads.map(mapDbDownloadToDomain);
  }

  async findByResourceId(resourceId: string): Promise<DownloadEvent[]> {
    const dbDownloads = await this.storage.getDownloadsByResource(resourceId);
    return dbDownloads.map(mapDbDownloadToDomain);
  }

  async findByTimeRange(_params: TimeRangeParams): Promise<DownloadEvent[]> {
    throw new Error(
      'DownloadRepository.findByTimeRange: Not implemented. ' +
      'Storage layer does not yet support time range queries. ' +
      'Implement storage.getDownloadsByTimeRange to enable this method.'
    );
  }

  async countByTimeRange(_params: TimeRangeParams): Promise<number> {
    throw new Error(
      'DownloadRepository.countByTimeRange: Not implemented. ' +
      'Storage layer does not yet support counting downloads by time range. ' +
      'Implement storage.countDownloads to enable this method.'
    );
  }

  async countUniqueLeads(_params: TimeRangeParams): Promise<number> {
    throw new Error(
      'DownloadRepository.countUniqueLeads: Not implemented. ' +
      'Storage layer does not yet support counting unique leads. ' +
      'Implement storage.countUniqueDownloadLeads to enable this method.'
    );
  }

  async aggregateByResource(_params: TimeRangeParams, _limit?: number): Promise<DownloadsByResource[]> {
    throw new Error(
      'DownloadRepository.aggregateByResource: Not implemented. ' +
      'Storage layer does not yet support resource aggregation. ' +
      'Implement storage.getDownloadsByResourceAggregated to enable this method.'
    );
  }
}

export function createDownloadRepository(storage: IStorage): IDownloadRepository {
  return new DownloadRepository(storage);
}
