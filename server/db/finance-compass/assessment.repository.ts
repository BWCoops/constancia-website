/**
 * Assessment Repository Implementation
 * 
 * Implements IAssessmentRepository interface by wrapping the FinanceCompass storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type {
  IAssessmentRepository,
  CreateAssessmentData,
  AssessmentScores,
} from '../../core/finance-compass/interfaces';
import type { Assessment, AssessmentWithDetails } from '../../core/finance-compass/types';
import {
  mapDbAssessmentToDomain,
  mapDbContactToDomain,
  mapDbCompanyToDomain,
  mapDbResponseToDomain,
} from './mappers';
import * as fcStorage from '../../finance-compass/storage';

export class AssessmentRepository implements IAssessmentRepository {
  async findById(id: string): Promise<Assessment | null> {
    const dbAssessment = await fcStorage.getAssessmentById(id);
    return dbAssessment ? mapDbAssessmentToDomain(dbAssessment) : null;
  }

  async findByContactId(contactId: string): Promise<Assessment[]> {
    const dbAssessments = await fcStorage.getAssessmentsByContactId(contactId);
    return dbAssessments.map(mapDbAssessmentToDomain);
  }

  async findWithDetails(id: string): Promise<AssessmentWithDetails | null> {
    const details = await fcStorage.getAssessmentWithDetails(id);
    if (!details) return null;

    return {
      assessment: mapDbAssessmentToDomain(details.assessment),
      contact: details.contact ? mapDbContactToDomain(details.contact) : null,
      company: details.company ? mapDbCompanyToDomain(details.company) : null,
      responses: details.responses.map(mapDbResponseToDomain),
    };
  }

  async create(data: CreateAssessmentData): Promise<Assessment> {
    const dbAssessment = await fcStorage.createAssessment({
      contactId: data.contactId,
      companyId: data.companyId,
      tier: data.tier,
      status: 'created',
    });
    return mapDbAssessmentToDomain(dbAssessment);
  }

  async update(id: string, data: Partial<Assessment>): Promise<Assessment | null> {
    const updateData: Parameters<typeof fcStorage.updateAssessment>[1] = {};
    
    if (data.status) updateData.status = data.status;
    if (data.tier) updateData.tier = data.tier;
    if (data.epmReadinessScore !== undefined) updateData.epmReadinessScore = data.epmReadinessScore;
    if (data.overallMaturityScore !== undefined) updateData.overallMaturityScore = data.overallMaturityScore;
    if (data.dimensionScores !== undefined) updateData.dimensionScores = data.dimensionScores;
    if (data.quickWins !== undefined) updateData.quickWins = data.quickWins;
    if (data.recommendations !== undefined) updateData.recommendations = data.recommendations;
    if (data.aiAnalysis !== undefined) updateData.aiAnalysis = data.aiAnalysis;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

    const dbAssessment = await fcStorage.updateAssessment(id, updateData);
    return dbAssessment ? mapDbAssessmentToDomain(dbAssessment) : null;
  }

  async updateStatus(id: string, status: Assessment['status']): Promise<void> {
    await fcStorage.updateAssessment(id, { status });
  }

  async updateScores(id: string, scores: AssessmentScores): Promise<void> {
    const updateData: Parameters<typeof fcStorage.updateAssessment>[1] = {};
    
    if (scores.epmReadinessScore !== undefined) updateData.epmReadinessScore = scores.epmReadinessScore;
    if (scores.dimensionScores !== undefined) updateData.dimensionScores = scores.dimensionScores;
    if (scores.overallMaturityScore !== undefined) updateData.overallMaturityScore = scores.overallMaturityScore;
    if (scores.quickWins !== undefined) updateData.quickWins = scores.quickWins;
    if (scores.recommendations !== undefined) updateData.recommendations = scores.recommendations;
    if (scores.aiAnalysis !== undefined) updateData.aiAnalysis = scores.aiAnalysis;

    await fcStorage.updateAssessment(id, updateData);
  }
}

export function createAssessmentRepository(): IAssessmentRepository {
  return new AssessmentRepository();
}
