/**
 * Feature Flag Repository Implementation
 * 
 * Implements IFeatureFlagRepository interface by wrapping the storage layer.
 * Maps between database records (FeatureFlagOverride) and domain types (FeatureFlag).
 * 
 * Note: The storage layer uses "FeatureFlagOverride" which represents admin-controlled
 * feature flags. This repository maps those to the domain FeatureFlag type.
 */

import type { IStorage } from '../../storage';
import type {
  IFeatureFlagRepository,
  CreateFeatureFlagData,
  UpdateFeatureFlagData,
} from '../../core/admin/interfaces';
import type { FeatureFlag } from '../../core/admin/types';
import type { FeatureFlagOverride } from '@shared/schema';

function mapDbFeatureFlagToDomain(dbFlag: FeatureFlagOverride): FeatureFlag {
  return {
    id: dbFlag.featureKey,
    key: dbFlag.featureKey,
    name: dbFlag.featureKey,
    description: null,
    enabled: dbFlag.isEnabled,
    enabledForPercentage: 100,
    allowedEmails: [],
    allowedIps: [],
    metadata: null,
    createdAt: dbFlag.updatedAt,
    updatedAt: dbFlag.updatedAt,
  };
}

export class FeatureFlagRepository implements IFeatureFlagRepository {
  constructor(private readonly storage: IStorage) {}

  async findById(_id: string): Promise<FeatureFlag | null> {
    throw new Error(
      'FeatureFlagRepository.findById: Not implemented. ' +
      'Storage layer does not yet support feature flag lookup by ID. ' +
      'Current implementation uses featureKey. Use findByKey instead, or ' +
      'implement storage.getFeatureFlagOverrideById to enable this method.'
    );
  }

  async findByKey(key: string): Promise<FeatureFlag | null> {
    const dbFlag = await this.storage.getFeatureFlagOverride(key);
    return dbFlag ? mapDbFeatureFlagToDomain(dbFlag) : null;
  }

  async findAll(): Promise<FeatureFlag[]> {
    const dbFlags = await this.storage.getFeatureFlagOverrides();
    return dbFlags.map(mapDbFeatureFlagToDomain);
  }

  async create(data: CreateFeatureFlagData): Promise<FeatureFlag> {
    const dbFlag = await this.storage.upsertFeatureFlagOverride({
      featureKey: data.key,
      isEnabled: data.enabled ?? false,
      updatedBy: 'system',
    });
    return mapDbFeatureFlagToDomain(dbFlag);
  }

  async update(_id: string, data: UpdateFeatureFlagData): Promise<FeatureFlag | null> {
    throw new Error(
      'FeatureFlagRepository.update: Partial implementation. ' +
      'Storage layer requires featureKey to update flags. ' +
      'Use upsertFeatureFlagOverride with the feature key directly, or ' +
      'implement storage.updateFeatureFlagOverrideById to enable this method.'
    );
  }

  async delete(keyOrId: string): Promise<boolean> {
    // The id field is the same as featureKey in our mapping
    // So we can safely use it for deletion
    return this.storage.deleteFeatureFlagOverride(keyOrId);
  }
}

export function createFeatureFlagRepository(storage: IStorage): IFeatureFlagRepository {
  return new FeatureFlagRepository(storage);
}
