/**
 * Question Repository Implementation
 * 
 * Implements IQuestionRepository interface by wrapping the FinanceCompass storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IQuestionRepository } from '../../core/finance-compass/interfaces';
import type { Question, AssessmentTier } from '../../core/finance-compass/types';
import { mapDbQuestionToDomain } from './mappers';
import * as fcStorage from '../../finance-compass/storage';

export class QuestionRepository implements IQuestionRepository {
  async findByTier(tier: AssessmentTier): Promise<Question[]> {
    const dbQuestions = await fcStorage.getQuestionsByTier(tier);
    return dbQuestions.map(mapDbQuestionToDomain);
  }

  async findById(id: string): Promise<Question | null> {
    const dbQuestion = await fcStorage.getQuestionById(id);
    return dbQuestion ? mapDbQuestionToDomain(dbQuestion) : null;
  }

  async findByDimension(dimension: string, tier: AssessmentTier): Promise<Question[]> {
    const allQuestions = await fcStorage.getQuestionsByTier(tier);
    const filtered = allQuestions.filter(q => q.dimension === dimension);
    return filtered.map(mapDbQuestionToDomain);
  }

  async getNextQuestion(assessmentId: string, currentQuestionId: string | null): Promise<Question | null> {
    const assessment = await fcStorage.getAssessmentById(assessmentId);
    if (!assessment) return null;

    const responses = await fcStorage.getResponsesByAssessmentId(assessmentId);
    const answeredQuestionIds = new Set(responses.map(r => r.questionId));

    const questions = await fcStorage.getQuestionsByTier(assessment.tier);
    const sortedQuestions = questions.sort((a, b) => a.sequence - b.sequence);

    if (!currentQuestionId) {
      const firstUnanswered = sortedQuestions.find(q => !answeredQuestionIds.has(q.id));
      return firstUnanswered ? mapDbQuestionToDomain(firstUnanswered) : null;
    }

    const currentIndex = sortedQuestions.findIndex(q => q.id === currentQuestionId);
    if (currentIndex === -1) return null;

    for (let i = currentIndex + 1; i < sortedQuestions.length; i++) {
      if (!answeredQuestionIds.has(sortedQuestions[i].id)) {
        return mapDbQuestionToDomain(sortedQuestions[i]);
      }
    }

    return null;
  }
}

export function createQuestionRepository(): IQuestionRepository {
  return new QuestionRepository();
}
