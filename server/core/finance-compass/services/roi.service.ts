/**
 * ROI Service
 * 
 * Pure business logic service for ROI calculations and profile management.
 * This service contains no HTTP or database code - all dependencies are injected.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { 
  IRoiService,
  IRoiProfileRepository,
  IAssessmentRepository,
  ICompanyRepository,
} from '../interfaces';
import type { RoiProfile, RoiMetrics } from '../types';
import { Result, success, failure, NotFoundError, ValidationError } from '../../types';

// Import shared calculation logic
import { calculateRoiMetrics as calculateMetricsCore } from '@shared/roi-calculator';

/**
 * Size band to default cost multipliers
 */
const SIZE_BAND_MULTIPLIERS: Record<string, { 
  softwareLicenses: number;
  changeManagement: number;
  trainingCosts: number;
  closeAccelerationValue: number;
  complianceRiskAvoidance: number;
}> = {
  'under_10m': {
    softwareLicenses: 50000,
    changeManagement: 15000,
    trainingCosts: 10000,
    closeAccelerationValue: 25000,
    complianceRiskAvoidance: 15000,
  },
  '10m_50m': {
    softwareLicenses: 150000,
    changeManagement: 37500,
    trainingCosts: 25000,
    closeAccelerationValue: 75000,
    complianceRiskAvoidance: 40000,
  },
  '50m_250m': {
    softwareLicenses: 350000,
    changeManagement: 75000,
    trainingCosts: 50000,
    closeAccelerationValue: 175000,
    complianceRiskAvoidance: 85000,
  },
  '250m_1b': {
    softwareLicenses: 500000,
    changeManagement: 112500,
    trainingCosts: 75000,
    closeAccelerationValue: 250000,
    complianceRiskAvoidance: 125000,
  },
  'over_1b': {
    softwareLicenses: 750000,
    changeManagement: 165000,
    trainingCosts: 100000,
    closeAccelerationValue: 375000,
    complianceRiskAvoidance: 185000,
  },
};

/**
 * ROI Service Implementation
 * 
 * Manages ROI profile creation, updates, and calculations.
 * All repository dependencies are injected.
 */
export class RoiService implements IRoiService {
  constructor(
    private readonly roiProfileRepo: IRoiProfileRepository,
    private readonly assessmentRepo: IAssessmentRepository,
    private readonly companyRepo: ICompanyRepository,
  ) {}

  /**
   * Create a default ROI profile for an assessment
   * Populates sensible defaults based on company size
   */
  async createDefaultProfile(
    assessmentId: string,
    contactId: string,
    companyId: string,
    companySize?: string,
    industry?: string
  ): Promise<Result<RoiProfile>> {
    // Check if profile already exists
    const existing = await this.roiProfileRepo.findByAssessmentId(assessmentId);
    if (existing) {
      return success(existing);
    }

    // Get default values based on company size
    const sizeBand = companySize || '250m_1b';
    const defaults = SIZE_BAND_MULTIPLIERS[sizeBand] || SIZE_BAND_MULTIPLIERS['250m_1b'];

    // Create the profile
    const profile = await this.roiProfileRepo.create({
      assessmentId,
      contactId,
      companyId,
      currency: 'GBP',
      industry: industry || 'cross_industry',
    });

    // Update with default values
    const updatedProfile = await this.roiProfileRepo.update(profile.id, {
      softwareLicenses: defaults.softwareLicenses,
      changeManagement: defaults.changeManagement,
      trainingCosts: defaults.trainingCosts,
      closeAccelerationValue: defaults.closeAccelerationValue,
      complianceRiskAvoidance: defaults.complianceRiskAvoidance,
    });

    return success(updatedProfile || profile);
  }

  /**
   * Get ROI profile for an assessment
   */
  async getProfile(assessmentId: string): Promise<Result<RoiProfile>> {
    const profile = await this.roiProfileRepo.findByAssessmentId(assessmentId);
    
    if (!profile) {
      return failure(new NotFoundError('ROI Profile', assessmentId));
    }

    return success(profile);
  }

  /**
   * Update ROI profile with new values
   */
  async updateProfile(
    assessmentId: string,
    updates: Partial<RoiProfile>
  ): Promise<Result<RoiProfile>> {
    const existing = await this.roiProfileRepo.findByAssessmentId(assessmentId);
    
    if (!existing) {
      return failure(new NotFoundError('ROI Profile', assessmentId));
    }

    // Validate numeric fields are non-negative
    const numericFields = [
      'softwareLicenses', 'integrationCosts', 'dataMigration', 
      'changeManagement', 'internalFteCosts', 'trainingCosts',
      'contingency', 'runRateOpex', 'supportCosts', 'depreciation'
    ];

    for (const field of numericFields) {
      if (field in updates && (updates as any)[field] < 0) {
        return failure(new ValidationError(
          `${field} cannot be negative`,
          { [field]: 'Must be a non-negative number' }
        ));
      }
    }

    // Validate percentage fields are in valid range
    const percentFields = ['discountRate', 'inflationRate', 'processEfficiencyPercent'];
    for (const field of percentFields) {
      const value = (updates as any)[field];
      if (value !== undefined && (value < 0 || value > 100)) {
        return failure(new ValidationError(
          `${field} must be between 0 and 100`,
          { [field]: 'Must be between 0 and 100' }
        ));
      }
    }

    const updated = await this.roiProfileRepo.update(existing.id, updates);
    
    if (!updated) {
      return failure(new NotFoundError('ROI Profile', assessmentId));
    }

    return success(updated);
  }

  /**
   * Calculate ROI metrics from a profile
   * This is a pure calculation with no side effects
   */
  calculateMetrics(profile: RoiProfile): RoiMetrics {
    return calculateMetricsCore(profile);
  }

  /**
   * Run sensitivity analysis on a specific variable
   */
  runSensitivityAnalysis(
    profile: RoiProfile,
    variable: string,
    range: { min: number; max: number; steps: number }
  ): { values: number[]; metrics: RoiMetrics[] } {
    const values: number[] = [];
    const metrics: RoiMetrics[] = [];
    
    const step = (range.max - range.min) / (range.steps - 1);
    
    for (let i = 0; i < range.steps; i++) {
      const value = range.min + (step * i);
      values.push(value);
      
      // Create modified profile with this value
      const modifiedProfile = { ...profile, [variable]: value };
      metrics.push(this.calculateMetrics(modifiedProfile));
    }

    return { values, metrics };
  }

  /**
   * Run Monte Carlo simulation for risk analysis
   */
  runMonteCarloSimulation(
    profile: RoiProfile,
    iterations: number = 1000
  ): { percentiles: Record<number, RoiMetrics>; distribution: number[] } {
    const results: number[] = [];
    const allMetrics: RoiMetrics[] = [];

    // Define variance ranges for key variables (±20%)
    const varianceRanges: Record<string, { min: number; max: number }> = {
      softwareLicenses: { min: 0.8, max: 1.3 },
      integrationCosts: { min: 0.7, max: 1.5 },
      closeAccelerationValue: { min: 0.6, max: 1.2 },
      processEfficiencyPercent: { min: 0.5, max: 1.1 },
    };

    for (let i = 0; i < iterations; i++) {
      const modifiedProfile = { ...profile };
      
      // Apply random variance to each variable
      for (const [key, range] of Object.entries(varianceRanges)) {
        const variance = range.min + Math.random() * (range.max - range.min);
        (modifiedProfile as any)[key] = (profile as any)[key] * variance;
      }

      const metrics = this.calculateMetrics(modifiedProfile);
      results.push(metrics.npvValue);
      allMetrics.push(metrics);
    }

    // Sort for percentile calculation
    results.sort((a, b) => a - b);
    allMetrics.sort((a, b) => a.npvValue - b.npvValue);

    // Calculate percentiles
    const getPercentileIndex = (p: number) => Math.floor((p / 100) * iterations);
    
    const percentiles: Record<number, RoiMetrics> = {
      10: allMetrics[getPercentileIndex(10)],
      25: allMetrics[getPercentileIndex(25)],
      50: allMetrics[getPercentileIndex(50)],
      75: allMetrics[getPercentileIndex(75)],
      90: allMetrics[getPercentileIndex(90)],
    };

    return { percentiles, distribution: results };
  }
}

/**
 * Factory function to create ROI Service with injected dependencies
 */
export function createRoiService(
  roiProfileRepo: IRoiProfileRepository,
  assessmentRepo: IAssessmentRepository,
  companyRepo: ICompanyRepository
): IRoiService {
  return new RoiService(roiProfileRepo, assessmentRepo, companyRepo);
}
