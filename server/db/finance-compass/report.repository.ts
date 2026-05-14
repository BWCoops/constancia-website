/**
 * Report Repository Implementation
 * 
 * Implements IReportRepository interface by wrapping the FinanceCompass storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IReportRepository, CreateReportData } from '../../core/finance-compass/interfaces';
import type { Report } from '../../core/finance-compass/types';
import { mapDbReportToDomain } from './mappers';
import * as fcStorage from '../../finance-compass/storage';

export class ReportRepository implements IReportRepository {
  async findByAssessmentId(assessmentId: string): Promise<Report | null> {
    const dbReport = await fcStorage.getReportByAssessmentId(assessmentId);
    return dbReport ? mapDbReportToDomain(dbReport) : null;
  }

  async create(data: CreateReportData): Promise<Report> {
    const assessment = await fcStorage.getAssessmentById(data.assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${data.assessmentId}`);
    }

    const dbReport = await fcStorage.createReport({
      tier: assessment.tier,
      assessmentId: data.assessmentId,
      pdfPath: data.pdfPath,
      executiveSummary: data.executiveSummary,
      dimensionNarratives: data.narratives?.dimensionNarratives,
    });
    return mapDbReportToDomain(dbReport);
  }

  async update(_id: string, _data: Partial<Report>): Promise<Report | null> {
    throw new Error(
      'ReportRepository.update: Not implemented. ' +
      'FinanceCompass storage layer does not yet support updating reports. ' +
      'Implement fcStorage.updateReport to enable this method.'
    );
  }
}

export function createReportRepository(): IReportRepository {
  return new ReportRepository();
}
