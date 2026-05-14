/**
 * Vendor Repository Implementation
 * 
 * Implements IVendorRepository interface using static vendor benchmark data.
 * Maps between VendorBenchmark (shared data) and Vendor domain types.
 * 
 * Note: Vendor data is stored in static TypeScript files (shared/vendor-benchmarks.ts)
 * rather than a database. This repository provides a consistent interface for
 * accessing vendor data regardless of the underlying storage mechanism.
 */

import type { IStorage } from '../../storage';
import type { IVendorRepository } from '../../core/comparison-tools/interfaces';
import {
  ComparisonType,
  type Vendor,
  type ComparisonCriteria,
  type OrganizationSizeBand,
  type VendorTier,
} from '../../core/comparison-tools/types';
import { VENDOR_BENCHMARKS, type VendorBenchmark } from '../../../shared/vendor-benchmarks';

function mapVendorBenchmarkToDomain(benchmark: VendorBenchmark): Vendor {
  return {
    id: benchmark.id,
    name: benchmark.name,
    type: ComparisonType.EPM,
    tier: benchmark.category as VendorTier,
    description: benchmark.description,
    implementationCosts: benchmark.implementationCosts,
    licenseCosts: benchmark.licenseCosts,
    implementationTimeline: benchmark.implementationTimeline,
    integrationComplexity: benchmark.integrationComplexity,
    dataMigrationComplexity: benchmark.dataMigrationComplexity,
    bestFitProfile: benchmark.bestFitProfile,
    strengths: benchmark.strengths,
    considerations: benchmark.considerations,
    marketPosition: benchmark.marketPosition,
  };
}

export class VendorRepository implements IVendorRepository {
  constructor(private readonly storage: IStorage) {}

  async findAll(): Promise<Vendor[]> {
    return VENDOR_BENCHMARKS.map(mapVendorBenchmarkToDomain);
  }

  async findById(id: string): Promise<Vendor | null> {
    const benchmark = VENDOR_BENCHMARKS.find(v => v.id === id);
    return benchmark ? mapVendorBenchmarkToDomain(benchmark) : null;
  }

  async findByType(type: ComparisonType): Promise<Vendor[]> {
    if (type === ComparisonType.EPM) {
      return VENDOR_BENCHMARKS.map(mapVendorBenchmarkToDomain);
    }
    throw new Error(
      `VendorRepository.findByType: Comparison type '${type}' not yet supported. ` +
      `Currently only EPM vendors are available. ` +
      `Add ERP and AI vendor data to shared/vendor-benchmarks.ts to enable other types.`
    );
  }

  async findByTier(tier: VendorTier): Promise<Vendor[]> {
    const benchmarks = VENDOR_BENCHMARKS.filter(v => v.category === tier);
    return benchmarks.map(mapVendorBenchmarkToDomain);
  }

  async findByOrganizationSize(size: OrganizationSizeBand): Promise<Vendor[]> {
    const sizeRanges: Record<OrganizationSizeBand, { min: number; max: number }> = {
      smb: { min: 50000, max: 250000 },
      mid_market: { min: 250000, max: 1000000 },
      enterprise: { min: 1000000, max: 5000000 },
      large_enterprise: { min: 5000000, max: 200000000 },
    };

    const range = sizeRanges[size];
    const suitable = VENDOR_BENCHMARKS.filter(vendor => {
      const bestFit = vendor.bestFitProfile.bestFitRevenue;
      return bestFit.min <= range.max && bestFit.max >= range.min;
    });

    return suitable.map(mapVendorBenchmarkToDomain);
  }

  async findByIndustry(industry: string): Promise<Vendor[]> {
    const industryLower = industry.toLowerCase();
    const suitable = VENDOR_BENCHMARKS.filter(vendor =>
      vendor.bestFitProfile.industryFocus.some(
        ind => ind.toLowerCase().includes(industryLower) ||
               industryLower.includes(ind.toLowerCase())
      )
    );

    return suitable.map(mapVendorBenchmarkToDomain);
  }

  async findByCriteria(criteria: ComparisonCriteria): Promise<Vendor[]> {
    let vendors = [...VENDOR_BENCHMARKS];

    if (criteria.organizationSize) {
      const sizeRanges: Record<OrganizationSizeBand, { min: number; max: number }> = {
        smb: { min: 50000, max: 250000 },
        mid_market: { min: 250000, max: 1000000 },
        enterprise: { min: 1000000, max: 5000000 },
        large_enterprise: { min: 5000000, max: 200000000 },
      };
      const range = sizeRanges[criteria.organizationSize];
      vendors = vendors.filter(v => {
        const bestFit = v.bestFitProfile.bestFitRevenue;
        return bestFit.min <= range.max && bestFit.max >= range.min;
      });
    }

    if (criteria.industry) {
      const industryLower = criteria.industry.toLowerCase();
      vendors = vendors.filter(v =>
        v.bestFitProfile.industryFocus.some(
          ind => ind.toLowerCase().includes(industryLower) ||
                 industryLower.includes(ind.toLowerCase())
        )
      );
    }

    if (criteria.budget) {
      const orgSize = criteria.organizationSize || 'mid_market';
      vendors = vendors.filter(v => {
        const costs = v.implementationCosts[orgSize];
        return costs.min <= (criteria.budget!.max || Infinity) &&
               costs.max >= (criteria.budget!.min || 0);
      });
    }

    if (criteria.timeline) {
      const orgSize = criteria.organizationSize || 'mid_market';
      vendors = vendors.filter(v => {
        const timeline = v.implementationTimeline[orgSize];
        return timeline.min <= (criteria.timeline!.max || Infinity) &&
               timeline.max >= (criteria.timeline!.min || 0);
      });
    }

    if (criteria.complexityTolerance) {
      vendors = vendors.filter(v =>
        v.bestFitProfile.complexityTolerance === criteria.complexityTolerance ||
        (criteria.complexityTolerance === 'high')
      );
    }

    if (criteria.excelDependency) {
      vendors = vendors.filter(v =>
        v.bestFitProfile.excelDependency === criteria.excelDependency ||
        v.bestFitProfile.excelDependency === 'high'
      );
    }

    return vendors.map(mapVendorBenchmarkToDomain);
  }
}

export function createVendorRepository(storage: IStorage): IVendorRepository {
  return new VendorRepository(storage);
}
