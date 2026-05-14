/**
 * Response Repository Implementation
 * 
 * Implements IResponseRepository interface by wrapping the FinanceCompass storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IResponseRepository, SaveResponseData } from '../../core/finance-compass/interfaces';
import type { QuestionResponse } from '../../core/finance-compass/types';
import { mapDbResponseToDomain } from './mappers';
import * as fcStorage from '../../finance-compass/storage';

export class ResponseRepository implements IResponseRepository {
  async findByAssessmentId(assessmentId: string): Promise<QuestionResponse[]> {
    const dbResponses = await fcStorage.getResponsesByAssessmentId(assessmentId);
    return dbResponses.map(mapDbResponseToDomain);
  }

  async findByQuestionId(assessmentId: string, questionId: string): Promise<QuestionResponse | null> {
    const dbResponse = await fcStorage.getResponseByQuestionId(assessmentId, questionId);
    return dbResponse ? mapDbResponseToDomain(dbResponse) : null;
  }

  async save(data: SaveResponseData): Promise<QuestionResponse> {
    const assessment = await fcStorage.getAssessmentById(data.assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${data.assessmentId}`);
    }

    const dbResponse = await fcStorage.upsertResponse({
      tier: assessment.tier,
      assessmentId: data.assessmentId,
      questionId: data.questionId,
      response: data.response,
    });
    return mapDbResponseToDomain(dbResponse);
  }

  async deleteByAssessmentId(_assessmentId: string): Promise<void> {
    throw new Error(
      'ResponseRepository.deleteByAssessmentId: Not implemented. ' +
      'FinanceCompass storage layer does not yet support deleting responses. ' +
      'Implement fcStorage.deleteResponsesByAssessmentId to enable this method.'
    );
  }
}

export function createResponseRepository(): IResponseRepository {
  return new ResponseRepository();
}
