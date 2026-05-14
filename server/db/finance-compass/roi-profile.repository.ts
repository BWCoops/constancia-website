/**
 * ROI Profile Repository Implementation
 * 
 * Implements IRoiProfileRepository interface by wrapping the FinanceCompass storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IRoiProfileRepository, CreateRoiProfileData } from '../../core/finance-compass/interfaces';
import type { RoiProfile } from '../../core/finance-compass/types';
import { mapDbRoiProfileToDomain } from './mappers';
import * as fcStorage from '../../finance-compass/storage';

export class RoiProfileRepository implements IRoiProfileRepository {
  async findByAssessmentId(assessmentId: string): Promise<RoiProfile | null> {
    const dbProfile = await fcStorage.getRoiProfileByAssessmentId(assessmentId);
    return dbProfile ? mapDbRoiProfileToDomain(dbProfile) : null;
  }

  async create(data: CreateRoiProfileData): Promise<RoiProfile> {
    const dbProfile = await fcStorage.createRoiProfile({
      assessmentId: data.assessmentId,
      contactId: data.contactId,
      companyId: data.companyId,
      currency: data.currency || 'GBP',
      industry: data.industry || 'cross_industry',
    });
    return mapDbRoiProfileToDomain(dbProfile);
  }

  async update(id: string, data: Partial<RoiProfile>): Promise<RoiProfile | null> {
    const updateData: Parameters<typeof fcStorage.updateRoiProfile>[1] = {};
    
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.horizonYears !== undefined) updateData.horizonYears = data.horizonYears;
    if (data.industry !== undefined) updateData.industry = data.industry;
    
    if (data.softwareLicenses !== undefined) updateData.softwareLicenses = data.softwareLicenses;
    if (data.integrationCosts !== undefined) updateData.integrationCosts = data.integrationCosts;
    if (data.dataMigration !== undefined) updateData.dataMigration = data.dataMigration;
    if (data.changeManagement !== undefined) updateData.changeManagement = data.changeManagement;
    if (data.internalFteCosts !== undefined) updateData.internalFteCosts = data.internalFteCosts;
    if (data.trainingCosts !== undefined) updateData.trainingCosts = data.trainingCosts;
    if (data.contingency !== undefined) updateData.contingency = data.contingency;
    
    if (data.processEfficiencyPercent !== undefined) updateData.processEfficiencyPercent = data.processEfficiencyPercent;
    if (data.headcountDelta !== undefined) updateData.headcountDelta = data.headcountDelta;
    if (data.closeAccelerationDays !== undefined) updateData.closeAccelerationDays = data.closeAccelerationDays;
    if (data.closeAccelerationValue !== undefined) updateData.closeAccelerationValue = data.closeAccelerationValue;
    if (data.complianceRiskAvoidance !== undefined) updateData.complianceRiskAvoidance = data.complianceRiskAvoidance;
    if (data.auditEfficiencySavings !== undefined) updateData.auditEfficiencySavings = data.auditEfficiencySavings;
    if (data.revenueEnablement !== undefined) updateData.revenueEnablement = data.revenueEnablement;
    if (data.externalConsultingSavings !== undefined) updateData.externalConsultingSavings = data.externalConsultingSavings;
    
    if (data.runRateOpex !== undefined) updateData.runRateOpex = data.runRateOpex;
    if (data.supportCosts !== undefined) updateData.supportCosts = data.supportCosts;
    if (data.depreciation !== undefined) updateData.depreciation = data.depreciation;
    
    if (data.discountRate !== undefined) updateData.discountRate = data.discountRate;
    if (data.inflationRate !== undefined) updateData.inflationRate = data.inflationRate;
    if (data.benefitRampYear1 !== undefined) updateData.benefitRampYear1 = data.benefitRampYear1;
    if (data.benefitRampYear2 !== undefined) updateData.benefitRampYear2 = data.benefitRampYear2;
    if (data.benefitRampYear3 !== undefined) updateData.benefitRampYear3 = data.benefitRampYear3;

    const dbProfile = await fcStorage.updateRoiProfile(id, updateData);
    return dbProfile ? mapDbRoiProfileToDomain(dbProfile) : null;
  }
}

export function createRoiProfileRepository(): IRoiProfileRepository {
  return new RoiProfileRepository();
}
