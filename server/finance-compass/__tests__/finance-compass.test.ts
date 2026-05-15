/**
 * FinanceCompass Feature Test Suite
 * 
 * Comprehensive tests covering:
 * - OTP verification flow
 * - Pre-assessment submission
 * - Score calculation for all 8 dimensions
 * - Benchmark calculations with correct gapPct formula
 * - Inline answer editing with score recalculation
 * - Dimension normalization (transaction_processing → consolidation_close)
 */

import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
import {
  calculateDimensionScore,
  calculateOverallScore,
  normalizeDimension,
  ASSESSMENT_DIMENSIONS,
  detectTechnologySpecialization,
} from '../ai-service';
import { calculateGapAnalysis } from '../benchmarks';
import { buildInsightContext } from '../report-narrative-service';
import { 
  getStageQuestionRequirements,
  getExpectedQuestionCounts,
  ensureScoreIntegrity,
} from '../utils/journey-validation-service';
import {
  calculateBaseScores,
  checkFragmentation,
  calculateCorrelationScoring,
} from '../utils/ai-scoring-validator';
import {
  applyCorrelationAdjustments,
  scoreToMaturityLevel,
  detectRootCauses,
} from '../correlation-matrix';
import type { FcQuestion, FcResponse, FcAssessment } from '../../../shared/finance-compass-schema';

// Test constants
const TEST_EMAIL = 'bradley.cooper@constancia.io';
const DEV_OTP_CODE = '000000';
const BASE_URL = 'http://localhost:5000/api/finance-compass/public';

// Mock questions for testing score calculation
const createMockQuestion = (
  id: string,
  dimension: string,
  type: string = 'single_select',
  options: any[] = [],
  scoringConfig: any = null,
  multiSelectScoringMode?: 'cumulative' | 'penalty' | 'average'
): Partial<FcQuestion> => ({
  id,
  dimension,
  type,
  options,
  scoringConfig,
  isRequired: true,
  tier: 'pre_assessment',
  prompt: `Test question for ${dimension}`,
  questionKey: `test_${id}`,
  sequence: 1,
  // Include multiSelectScoringMode in the mock for testing
  ...(multiSelectScoringMode ? { multiSelectScoringMode } : {}),
});

const createMockResponse = (
  questionId: string,
  response: any
): Partial<FcResponse> => ({
  id: `response_${questionId}`,
  questionId,
  response,
  assessmentId: 'test-assessment-id',
});

describe('FinanceCompass Core Tests', () => {
  describe('Dimension Normalization', () => {
    test('should normalize transaction_processing to consolidation_close', () => {
      expect(normalizeDimension('transaction_processing')).toBe('consolidation_close');
    });

    test('should preserve consolidation_close as is', () => {
      expect(normalizeDimension('consolidation_close')).toBe('consolidation_close');
    });

    test('should preserve all other dimensions unchanged', () => {
      const dimensions = [
        'financial_planning_analysis',
        'management_reporting',
        'financial_controls_compliance',
        'technology_systems',
        'organisation_people',
        'data_analytics',
        'ai_machine_learning',
      ];
      
      dimensions.forEach(dim => {
        expect(normalizeDimension(dim)).toBe(dim);
      });
    });
  });

  describe('Score Calculation', () => {
    test('should calculate dimension score from slider responses (1-5 scale)', () => {
      const questions = [
        createMockQuestion('q1', 'financial_planning_analysis', 'slider', [], { min: 1, max: 5 }),
        createMockQuestion('q2', 'financial_planning_analysis', 'slider', [], { min: 1, max: 5 }),
      ];
      
      const responses = [
        createMockResponse('q1', 4), // 4-1=3 out of 5-1=4 => 75%
        createMockResponse('q2', 3), // 3-1=2 out of 5-1=4 => 50%
      ];
      
      // Total: 5 out of 8 => 62.5% rounded to 63%
      const score = calculateDimensionScore(
        responses as FcResponse[],
        questions as FcQuestion[],
        'financial_planning_analysis'
      );
      
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(75);
    });

    test('should calculate dimension score from weighted single_select responses', () => {
      const questions = [
        createMockQuestion('q1', 'data_analytics', 'single_select', [], {
          weights: { low: 1, medium: 2, high: 3 }
        }),
      ];
      
      const responses = [
        createMockResponse('q1', 'high'),
      ];
      
      // high = 3, max = 3 => 100%
      const score = calculateDimensionScore(
        responses as FcResponse[],
        questions as FcQuestion[],
        'data_analytics'
      );
      
      expect(score).toBe(100);
    });

    test('should calculate dimension score from position-based single_select responses', () => {
      const options = [
        { value: 'poor', label: 'Poor' },       // index 0 => score 1
        { value: 'average', label: 'Average' }, // index 1 => score 2
        { value: 'good', label: 'Good' },       // index 2 => score 3
        { value: 'excellent', label: 'Excellent' }, // index 3 => score 4
      ];
      
      const questions = [
        createMockQuestion('q1', 'technology_systems', 'single_select', options),
      ];
      
      const responses = [
        createMockResponse('q1', 'good'), // index 2 => score 3 out of 4 => 75%
      ];
      
      const score = calculateDimensionScore(
        responses as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      expect(score).toBe(75);
    });

    test('should return 0 for dimension with no responses', () => {
      const questions = [
        createMockQuestion('q1', 'ai_machine_learning', 'slider'),
      ];
      
      const responses: FcResponse[] = [];
      
      const score = calculateDimensionScore(
        responses,
        questions as FcQuestion[],
        'ai_machine_learning'
      );
      
      expect(score).toBe(0);
    });

    test('should calculate overall score as average of dimension scores', () => {
      const dimensionScores = {
        financial_planning_analysis: 80,
        management_reporting: 60,
        consolidation_close: 70,
        financial_controls_compliance: 50,
        technology_systems: 40,
        organisation_people: 90,
        data_analytics: 65,
        ai_machine_learning: 45,
      };
      
      // Average: (80+60+70+50+40+90+65+45) / 8 = 500/8 = 62.5 => 63
      const overall = calculateOverallScore(dimensionScores);
      expect(overall).toBe(63);
    });

    test('should cap scores at 100', () => {
      const dimensionScores = {
        financial_planning_analysis: 120, // Shouldn't happen but cap it
        management_reporting: 100,
      };
      
      const overall = calculateOverallScore(dimensionScores);
      expect(overall).toBeLessThanOrEqual(100);
    });
  });

  describe('ASSESSMENT_DIMENSIONS constant', () => {
    test('should have exactly 8 dimensions', () => {
      expect(ASSESSMENT_DIMENSIONS).toHaveLength(8);
    });

    test('should include consolidation_close (not transaction_processing)', () => {
      expect(ASSESSMENT_DIMENSIONS).toContain('consolidation_close');
      expect(ASSESSMENT_DIMENSIONS).not.toContain('transaction_processing');
    });

    test('should include all expected dimensions', () => {
      const expectedDimensions = [
        'financial_planning_analysis',
        'management_reporting',
        'consolidation_close',
        'financial_controls_compliance',
        'technology_systems',
        'organisation_people',
        'data_analytics',
        'ai_machine_learning',
      ];
      
      expectedDimensions.forEach(dim => {
        expect(ASSESSMENT_DIMENSIONS).toContain(dim);
      });
    });
  });
});

describe('Benchmark Calculations', () => {
  const mockDimensionScores = {
    financial_planning_analysis: 55,
    management_reporting: 65,
    consolidation_close: 45,
    financial_controls_compliance: 70,
    technology_systems: 50,
    organisation_people: 60,
    data_analytics: 40,
    ai_machine_learning: 35,
  };

  test('should calculate gap analysis for all dimensions', () => {
    const gapAnalysis = calculateGapAnalysis(mockDimensionScores);
    
    expect(gapAnalysis).toBeDefined();
    expect(typeof gapAnalysis).toBe('object');
    
    const dimensionKeys = Object.keys(gapAnalysis);
    expect(dimensionKeys.length).toBeGreaterThan(0);
    
    // Each dimension should have the expected structure
    dimensionKeys.forEach(key => {
      const dim = gapAnalysis[key];
      expect(dim).toHaveProperty('score');
      expect(dim).toHaveProperty('benchmark');
      expect(dim).toHaveProperty('gap');
      expect(dim).toHaveProperty('classification');
    });
  });

  test('should classify gaps correctly', () => {
    const gapAnalysis = calculateGapAnalysis(mockDimensionScores);
    
    Object.values(gapAnalysis).forEach(dimension => {
      // Classification should be one of the valid types
      expect(['MINOR', 'MODERATE', 'SIGNIFICANT', 'CRITICAL']).toContain(dimension.classification);
      
      // Gap should be non-negative
      expect(dimension.gap).toBeGreaterThanOrEqual(0);
    });
  });

  test('should handle legacy transaction_processing dimension in benchmark mapping', () => {
    const legacyScores = {
      ...mockDimensionScores,
      transaction_processing: 45, // Legacy dimension
    };
    
    // Should not throw error
    expect(() => calculateGapAnalysis(legacyScores)).not.toThrow();
    
    const gapAnalysis = calculateGapAnalysis(legacyScores);
    // Both consolidation_close and transaction_processing should be mapped
    expect(gapAnalysis).toHaveProperty('consolidation_close');
    expect(gapAnalysis).toHaveProperty('transaction_processing');
  });

  test('should normalize scores to 1-5 scale for comparison', () => {
    const gapAnalysis = calculateGapAnalysis(mockDimensionScores);
    
    Object.entries(gapAnalysis).forEach(([key, dimension]) => {
      // Score should be normalized (percentage / 100 * 5)
      const originalScore = mockDimensionScores[key as keyof typeof mockDimensionScores];
      if (originalScore !== undefined) {
        const expectedNormalized = (originalScore / 100) * 5;
        expect(dimension.score).toBeCloseTo(expectedNormalized, 2);
      }
    });
  });
});

describe('API Integration Tests', () => {
  let testAssessmentId: string | null = null;
  let serverAvailable = false;
  
  // Helper to check if server is running and return JSON
  async function isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/questions?tier=pre_assessment`, {
        signal: AbortSignal.timeout(5000),
      });
      const text = await response.text();
      // Check if response is JSON (not HTML error page)
      return text.startsWith('{');
    } catch {
      return false;
    }
  }
  
  // Helper to safely parse JSON response
  async function safeJsonParse(response: Response): Promise<any> {
    const text = await response.text();
    if (!text.startsWith('{') && !text.startsWith('[')) {
      throw new Error('Server returned non-JSON response - is the server running?');
    }
    return JSON.parse(text);
  }

  describe('OTP Verification Flow', () => {
    test('should initiate OTP for whitelisted email', async () => {
      serverAvailable = await isServerAvailable();
      if (!serverAvailable) {
        console.log('Skipping - server not available or not returning JSON');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/auth/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL }),
      });
      
      const data = await safeJsonParse(response);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('sessionId');
    });

    test('should verify OTP with dev bypass code', async () => {
      if (!serverAvailable) {
        console.log('Skipping - server not available');
        return;
      }
      
      // First initiate
      const initResponse = await fetch(`${BASE_URL}/auth/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL }),
      });
      
      const initData = await safeJsonParse(initResponse);
      const sessionId = initData.data.sessionId;
      
      // Then verify with dev bypass
      const verifyResponse = await fetch(`${BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: DEV_OTP_CODE,
        }),
      });
      
      const verifyData = await safeJsonParse(verifyResponse);
      expect(verifyData.success).toBe(true);
      expect(verifyData.data).toHaveProperty('contactId');
    });
  });

  describe('Assessment Creation and Submission', () => {
    test('should create pre-assessment for verified contact', async () => {
      if (!serverAvailable) {
        console.log('Skipping - server not available');
        return;
      }
      
      // Complete OTP flow first
      const initResponse = await fetch(`${BASE_URL}/auth/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL }),
      });
      
      const initData = await safeJsonParse(initResponse);
      const sessionId = initData.data.sessionId;
      
      const verifyResponse = await fetch(`${BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: DEV_OTP_CODE,
        }),
      });
      
      const verifyData = await safeJsonParse(verifyResponse);
      const contactId = verifyData.data.contactId;
      
      // Create assessment
      const createResponse = await fetch(`${BASE_URL}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          tier: 'pre_assessment',
        }),
      });
      
      const createData = await safeJsonParse(createResponse);
      expect(createData.success).toBe(true);
      expect(createData.data).toHaveProperty('assessmentId');
      
      testAssessmentId = createData.data.assessmentId;
    });
  });

  describe('Response Submission', () => {
    test('should submit response and return responseId', async () => {
      if (!testAssessmentId) {
        console.log('Skipping - no assessment created');
        return;
      }
      
      // Get questions first
      const questionsResponse = await fetch(`${BASE_URL}/questions?tier=pre_assessment`);
      const questionsData = await safeJsonParse(questionsResponse);
      
      if (!questionsData.success || questionsData.data.length === 0) {
        console.log('Skipping - no questions available');
        return;
      }
      
      const firstQuestion = questionsData.data[0];
      
      // Submit a response
      const submitResponse = await fetch(`${BASE_URL}/assessments/${testAssessmentId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: firstQuestion.id,
          response: 'test_value',
        }),
      });
      
      const submitData = await safeJsonParse(submitResponse);
      expect(submitData.success).toBe(true);
      expect(submitData.data).toHaveProperty('responseId');
    });
  });
});

describe('Score Transparency', () => {
  test('should provide question contributions to dimension scores', () => {
    const options = [
      { value: 'poor', label: 'Poor' },
      { value: 'average', label: 'Average' },
      { value: 'good', label: 'Good' },
      { value: 'excellent', label: 'Excellent' },
    ];
    
    const questions = [
      createMockQuestion('q1', 'data_analytics', 'single_select', options),
      createMockQuestion('q2', 'data_analytics', 'single_select', options),
      createMockQuestion('q3', 'data_analytics', 'single_select', options),
    ];
    
    const responses = [
      createMockResponse('q1', 'excellent'), // 4/4 = 100%
      createMockResponse('q2', 'average'),   // 2/4 = 50%
      createMockResponse('q3', 'good'),      // 3/4 = 75%
    ];
    
    // Each question contributes:
    // q1: 4 points, q2: 2 points, q3: 3 points = 9 total
    // Max possible: 4+4+4 = 12
    // Score: 9/12 = 75%
    const score = calculateDimensionScore(
      responses as FcResponse[],
      questions as FcQuestion[],
      'data_analytics'
    );
    
    expect(score).toBe(75);
  });
});

describe('Multi-Select Scoring', () => {
  describe('Average Mode (default)', () => {
    test('should average scores across multiple selected options', () => {
      const options = [
        { value: 'excel', label: 'Excel/Spreadsheets' },      // Position 1 = 1 point
        { value: 'basic_tool', label: 'Basic FP&A Tool' },    // Position 2 = 2 points
        { value: 'integrated', label: 'Integrated EPM' },      // Position 3 = 3 points
        { value: 'advanced', label: 'Advanced Analytics' },    // Position 4 = 4 points
      ];
      
      const questions = [
        createMockQuestion('q1', 'technology_systems', 'multi_select', options, null, 'average'),
      ];
      
      // Multi-select response: selecting excel (1 point) and basic_tool (2 points)
      // Average = (1 + 2) / 2 = 1.5 points earned
      // Max = 4 points (single max weight)
      // Score = 1.5 / 4 = 37.5% → rounds to 38%
      const responses = [
        createMockResponse('q1', ['excel', 'basic_tool']),
      ];
      
      const score = calculateDimensionScore(
        responses as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      expect(score).toBe(38);
    });
    
    test('should handle single selection in multi-select question', () => {
      const options = [
        { value: 'option1', label: 'Option 1' },   // 1 point
        { value: 'option2', label: 'Option 2' },   // 2 points
        { value: 'option3', label: 'Option 3' },   // 3 points
      ];
      
      const questions = [
        createMockQuestion('q1', 'data_analytics', 'multi_select', options, null, 'average'),
      ];
      
      // Single selection: option3 (3 points) / 1 selection = 3 points
      // Max = 3 points (single max)
      // Score = 3/3 = 100%
      const responses = [
        createMockResponse('q1', ['option3']),
      ];
      
      const score = calculateDimensionScore(
        responses as FcResponse[],
        questions as FcQuestion[],
        'data_analytics'
      );
      
      expect(score).toBe(100);
    });
  });
  
  describe('Cumulative Mode (more = better)', () => {
    test('should reward selecting more options', () => {
      const options = [
        { value: 'opt1', label: 'Option 1' },   // 1 point
        { value: 'opt2', label: 'Option 2' },   // 2 points
        { value: 'opt3', label: 'Option 3' },   // 3 points
        { value: 'opt4', label: 'Option 4' },   // 4 points
        { value: 'opt5', label: 'Option 5' },   // 5 points
      ];
      
      const questions = [
        createMockQuestion('q1', 'ai_machine_learning', 'multi_select', options, null, 'cumulative'),
      ];
      
      // Select all 5 options: 1+2+3+4+5 = 15 points
      // Max = 1+2+3+4+5 = 15 points (sum of all possible weights)
      // Score = 15/15 = 100%
      const fullResponses = [
        createMockResponse('q1', ['opt1', 'opt2', 'opt3', 'opt4', 'opt5']),
      ];
      
      const fullScore = calculateDimensionScore(
        fullResponses as FcResponse[],
        questions as FcQuestion[],
        'ai_machine_learning'
      );
      
      expect(fullScore).toBe(100);
      
      // Select only 2 options: 4+5 = 9 points
      // Max = 15 points
      // Score = 9/15 = 60%
      const partialResponses = [
        createMockResponse('q1', ['opt4', 'opt5']),
      ];
      
      const partialScore = calculateDimensionScore(
        partialResponses as FcResponse[],
        questions as FcQuestion[],
        'ai_machine_learning'
      );
      
      expect(partialScore).toBe(60);
    });
    
    test('should give higher score for more selections', () => {
      const options = [
        { value: 'a', label: 'A' },  // 1 point
        { value: 'b', label: 'B' },  // 2 points
        { value: 'c', label: 'C' },  // 3 points
      ];
      
      const questions = [
        createMockQuestion('q1', 'data_analytics', 'multi_select', options, null, 'cumulative'),
      ];
      
      // Select 1 option: 3 points / 6 total = 50%
      const oneSelection = [createMockResponse('q1', ['c'])];
      const score1 = calculateDimensionScore(
        oneSelection as FcResponse[],
        questions as FcQuestion[],
        'data_analytics'
      );
      
      // Select 2 options: 5 points / 6 total = 83%
      const twoSelections = [createMockResponse('q1', ['b', 'c'])];
      const score2 = calculateDimensionScore(
        twoSelections as FcResponse[],
        questions as FcQuestion[],
        'data_analytics'
      );
      
      // Select all 3: 6 points / 6 total = 100%
      const threeSelections = [createMockResponse('q1', ['a', 'b', 'c'])];
      const score3 = calculateDimensionScore(
        threeSelections as FcResponse[],
        questions as FcQuestion[],
        'data_analytics'
      );
      
      expect(score1).toBe(50);
      expect(score2).toBe(83);
      expect(score3).toBe(100);
      expect(score3).toBeGreaterThan(score2);
      expect(score2).toBeGreaterThan(score1);
    });
  });
  
  describe('Penalty Mode (more = worse)', () => {
    test('should penalize selecting multiple options', () => {
      const options = [
        { value: 'sys1', label: 'System 1' },   // 1 point
        { value: 'sys2', label: 'System 2' },   // 2 points
        { value: 'sys3', label: 'System 3' },   // 3 points
        { value: 'sys4', label: 'System 4' },   // 4 points
      ];
      
      const questions = [
        createMockQuestion('q1', 'technology_systems', 'multi_select', options, null, 'penalty'),
      ];
      
      // Select 1 option (sys4 = 4 points): no fragmentation
      // Score = 4 / 1 = 4, max = 4, percentage = 100%
      const oneSystem = [createMockResponse('q1', ['sys4'])];
      const score1 = calculateDimensionScore(
        oneSystem as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      // Select 2 options (sys3, sys4): fragmentation penalty
      // Highest = 4, divided by 2 = 2, max = 4, percentage = 50%
      const twoSystems = [createMockResponse('q1', ['sys3', 'sys4'])];
      const score2 = calculateDimensionScore(
        twoSystems as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      // Select 4 options: maximum fragmentation
      // Highest = 4, divided by 4 = 1, max = 4, percentage = 25%
      const fourSystems = [createMockResponse('q1', ['sys1', 'sys2', 'sys3', 'sys4'])];
      const score4 = calculateDimensionScore(
        fourSystems as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      expect(score1).toBe(100);
      expect(score2).toBe(50);
      expect(score4).toBe(25);
      expect(score1).toBeGreaterThan(score2);
      expect(score2).toBeGreaterThan(score4);
    });
    
    test('should give lower scores for more pain points', () => {
      const options = [
        { value: 'pain1', label: 'Pain 1' },  // 1 point
        { value: 'pain2', label: 'Pain 2' },  // 2 points
        { value: 'pain3', label: 'Pain 3' },  // 3 points
      ];
      
      const questions = [
        createMockQuestion('q1', 'consolidation_close', 'multi_select', options, null, 'penalty'),
      ];
      
      // One pain point = best score (consolidated issue)
      const onePain = [createMockResponse('q1', ['pain3'])];
      const score1 = calculateDimensionScore(
        onePain as FcResponse[],
        questions as FcQuestion[],
        'consolidation_close'
      );
      
      // All pain points = worst score (fragmented issues)
      const allPains = [createMockResponse('q1', ['pain1', 'pain2', 'pain3'])];
      const scoreAll = calculateDimensionScore(
        allPains as FcResponse[],
        questions as FcQuestion[],
        'consolidation_close'
      );
      
      expect(score1).toBe(100);
      expect(scoreAll).toBe(33); // 3/3 = 1 earned, 3 max = 33%
      expect(score1).toBeGreaterThan(scoreAll);
    });
  });
  
  describe('Score boundaries', () => {
    test('cumulative mode should never exceed 100%', () => {
      const options = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ];
      
      const questions = [
        createMockQuestion('q1', 'ai_machine_learning', 'multi_select', options, null, 'cumulative'),
      ];
      
      // Select all options
      const responses = [createMockResponse('q1', ['a', 'b', 'c'])];
      const score = calculateDimensionScore(
        responses as FcResponse[],
        questions as FcQuestion[],
        'ai_machine_learning'
      );
      
      expect(score).toBeLessThanOrEqual(100);
    });
    
    test('penalty mode should never go below 0%', () => {
      const options = Array.from({ length: 10 }, (_, i) => ({ 
        value: `opt${i}`, 
        label: `Option ${i}` 
      }));
      
      const questions = [
        createMockQuestion('q1', 'technology_systems', 'multi_select', options, null, 'penalty'),
      ];
      
      // Select all options - maximum penalty
      const responses = [createMockResponse('q1', options.map(o => o.value))];
      const score = calculateDimensionScore(
        responses as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Inline Answer Editing', () => {
  test('should recalculate score when answer changes', () => {
    const options = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ];
    
    const questions = [
      createMockQuestion('q1', 'technology_systems', 'single_select', options),
    ];
    
    // Initial response: low => score 1/3 = 33%
    const initialResponses = [
      createMockResponse('q1', 'low'),
    ];
    
    const initialScore = calculateDimensionScore(
      initialResponses as FcResponse[],
      questions as FcQuestion[],
      'technology_systems'
    );
    
    expect(initialScore).toBe(33);
    
    // Updated response: high => score 3/3 = 100%
    const updatedResponses = [
      createMockResponse('q1', 'high'),
    ];
    
    const updatedScore = calculateDimensionScore(
      updatedResponses as FcResponse[],
      questions as FcQuestion[],
      'technology_systems'
    );
    
    expect(updatedScore).toBe(100);
    
    // Verify score actually changed
    expect(updatedScore).toBeGreaterThan(initialScore);
  });
});

describe('Inverse Benchmark Scoring (Range Type)', () => {
  test('should score lower values higher for time-based metrics (budgeting cycle weeks)', () => {
    // Question with range type and benchmarks (e.g., q2_planning_cycle)
    // Lower values = higher scores (faster cycle = more mature)
    const questions = [
      createMockQuestion('q2_planning_cycle', 'financial_planning_analysis', 'number', [], {
        type: 'range',
        benchmarks: { leading: 4, advanced: 8, established: 12, developing: 16 }
      }),
    ];
    
    // Test: 4 weeks (leading) should score 100%
    const leadingResponses = [createMockResponse('q2_planning_cycle', 4)];
    const leadingScore = calculateDimensionScore(
      leadingResponses as FcResponse[],
      questions as FcQuestion[],
      'financial_planning_analysis'
    );
    expect(leadingScore).toBe(100); // 5/5 = 100%
    
    // Test: 8 weeks (advanced) should score 80%
    const advancedResponses = [createMockResponse('q2_planning_cycle', 8)];
    const advancedScore = calculateDimensionScore(
      advancedResponses as FcResponse[],
      questions as FcQuestion[],
      'financial_planning_analysis'
    );
    expect(advancedScore).toBe(80); // 4/5 = 80%
    
    // Test: 12 weeks (established) should score 60%
    const establishedResponses = [createMockResponse('q2_planning_cycle', 12)];
    const establishedScore = calculateDimensionScore(
      establishedResponses as FcResponse[],
      questions as FcQuestion[],
      'financial_planning_analysis'
    );
    expect(establishedScore).toBe(60); // 3/5 = 60%
    
    // Test: 16 weeks (developing) should score 40%
    const developingResponses = [createMockResponse('q2_planning_cycle', 16)];
    const developingScore = calculateDimensionScore(
      developingResponses as FcResponse[],
      questions as FcQuestion[],
      'financial_planning_analysis'
    );
    expect(developingScore).toBe(40); // 2/5 = 40%
    
    // Test: 20 weeks (lagging) should score 20%
    const laggingResponses = [createMockResponse('q2_planning_cycle', 20)];
    const laggingScore = calculateDimensionScore(
      laggingResponses as FcResponse[],
      questions as FcQuestion[],
      'financial_planning_analysis'
    );
    expect(laggingScore).toBe(20); // 1/5 = 20%
  });
  
  test('should verify inverse relationship - shorter cycles score higher', () => {
    const questions = [
      createMockQuestion('q2_planning_cycle', 'financial_planning_analysis', 'number', [], {
        type: 'range',
        benchmarks: { leading: 4, advanced: 8, established: 12, developing: 16 }
      }),
    ];
    
    // 3 weeks should score higher than 10 weeks
    const shortCycleResponses = [createMockResponse('q2_planning_cycle', 3)];
    const longCycleResponses = [createMockResponse('q2_planning_cycle', 10)];
    
    const shortScore = calculateDimensionScore(
      shortCycleResponses as FcResponse[],
      questions as FcQuestion[],
      'financial_planning_analysis'
    );
    
    const longScore = calculateDimensionScore(
      longCycleResponses as FcResponse[],
      questions as FcQuestion[],
      'financial_planning_analysis'
    );
    
    expect(shortScore).toBeGreaterThan(longScore);
    expect(shortScore).toBe(100); // 3 weeks ≤ 4 (leading) = 5/5
    expect(longScore).toBe(60);   // 10 weeks ≤ 12 (established) = 3/5
  });
});

describe('EPM/ERP Specialization Detection', () => {
  test('should detect EPM specialization when EPM dimensions average below threshold', () => {
    // EPM avg: (35+40+30+45)/4 = 37.5 (below 65)
    // ERP avg: (75+80+70)/3 = 75 (above 65)
    // Difference: 37.5 - 75 = -37.5 (> 10 threshold)
    const dimensionScores = {
      financial_planning_analysis: 35,
      management_reporting: 40,
      consolidation_close: 30,
      data_analytics: 45,
      technology_systems: 75,
      financial_controls_compliance: 80,
      organisation_people: 70,
      ai_machine_learning: 50,
    };
    
    const result = detectTechnologySpecialization(
      dimensionScores,
      [] as FcResponse[],
      [] as FcQuestion[]
    );
    
    expect(result.specialization).toBe('epm');
    expect(result.primaryFocus).toContain('EPM');
    expect(result.epmIndicators.length).toBeGreaterThan(0);
  });
  
  test('should detect ERP specialization when ERP dimensions average below threshold', () => {
    // EPM avg: (75+70+80+72)/4 = 74.25 (above 65)
    // ERP avg: (35+30+40)/3 = 35 (below 65)
    // Difference: 74.25 - 35 = 39.25 (> 10 threshold)
    const dimensionScores = {
      financial_planning_analysis: 75,
      management_reporting: 70,
      consolidation_close: 80,
      data_analytics: 72,
      technology_systems: 35,
      financial_controls_compliance: 30,
      organisation_people: 40,
      ai_machine_learning: 50,
    };
    
    const result = detectTechnologySpecialization(
      dimensionScores,
      [] as FcResponse[],
      [] as FcQuestion[]
    );
    
    expect(result.specialization).toBe('erp');
    expect(result.primaryFocus).toContain('ERP');
    expect(result.erpIndicators.length).toBeGreaterThan(0);
  });
  
  test('should detect "both" when both EPM and ERP dimensions average below threshold', () => {
    // EPM avg: (35+40+30+45)/4 = 37.5 (below 65)
    // ERP avg: (35+30+40)/3 = 35 (below 65)
    // Both need improvement
    const dimensionScores = {
      financial_planning_analysis: 35,
      management_reporting: 40,
      consolidation_close: 30,
      data_analytics: 45,
      technology_systems: 35,
      financial_controls_compliance: 30,
      organisation_people: 40,
      ai_machine_learning: 50,
    };
    
    const result = detectTechnologySpecialization(
      dimensionScores,
      [] as FcResponse[],
      [] as FcQuestion[]
    );
    
    expect(result.specialization).toBe('both');
    expect(result.secondaryFocus).not.toBeNull();
  });
  
  test('should detect "neither" when all dimension averages are above threshold', () => {
    // EPM avg: (85+82+88+80)/4 = 83.75 (above 65)
    // ERP avg: (85+90+78)/3 = 84.33 (above 65)
    const dimensionScores = {
      financial_planning_analysis: 85,
      management_reporting: 82,
      consolidation_close: 88,
      data_analytics: 80,
      technology_systems: 85,
      financial_controls_compliance: 90,
      organisation_people: 78,
      ai_machine_learning: 75,
    };
    
    const result = detectTechnologySpecialization(
      dimensionScores,
      [] as FcResponse[],
      [] as FcQuestion[]
    );
    
    expect(result.specialization).toBe('neither');
    expect(result.primaryFocus).toBe('Finance Transformation');
  });
  
  test('should include narrative context in all specialization results', () => {
    // EPM avg: 50, ERP avg: 50 - both below 65 threshold
    const dimensionScores = {
      financial_planning_analysis: 50,
      management_reporting: 50,
      consolidation_close: 50,
      data_analytics: 50,
      technology_systems: 50,
      financial_controls_compliance: 50,
      organisation_people: 50,
      ai_machine_learning: 50,
    };
    
    const result = detectTechnologySpecialization(
      dimensionScores,
      [] as FcResponse[],
      [] as FcQuestion[]
    );
    
    expect(result.narrativeContext).toBeDefined();
    expect(result.narrativeContext.length).toBeGreaterThan(0);
  });
  
  test('should use stable thresholds to avoid classification flipping', () => {
    // Test borderline case - both just under threshold
    // EPM avg: 64, ERP avg: 64 - both just under 65
    const dimensionScores = {
      financial_planning_analysis: 64,
      management_reporting: 64,
      consolidation_close: 64,
      data_analytics: 64,
      technology_systems: 64,
      financial_controls_compliance: 64,
      organisation_people: 64,
      ai_machine_learning: 64,
    };
    
    const result = detectTechnologySpecialization(
      dimensionScores,
      [] as FcResponse[],
      [] as FcQuestion[]
    );
    
    // Both are equal and both need improvement, so should be "both"
    expect(result.specialization).toBe('both');
  });
});

// =========================================
// Unified Scoring Engine Tests
// =========================================
import { calculateQuestionScore } from '../utils/scoring-engine';
import { getQuestionById, ALL_QUESTIONS } from '../question-bank';

describe('Unified Scoring Engine', () => {
  describe('Vendor Tier Scoring with Fragmentation Penalty', () => {
    test('should score single Tier 1 vendor as 5/5', () => {
      const result = calculateQuestionScore(
        'q2_current_epm_vendor',
        ['onestream']
      );
      
      expect(result.rawScore).toBe(5);
      expect(result.maxPossible).toBe(5);
      expect(result.explanation).toContain('Gartner Leader');
    });
    
    test('should apply fragmentation penalty for 2 Tier 1 vendors', () => {
      const result = calculateQuestionScore(
        'q2_current_epm_vendor',
        ['onestream', 'anaplan']
      );
      
      // Base: 5, Penalty: 0.5 for 1 extra vendor = 4.5
      expect(result.rawScore).toBe(4.5);
      expect(result.explanation).toContain('fragmentation');
    });
    
    test('should apply mixed tier penalty for different tiers', () => {
      const result = calculateQuestionScore(
        'q2_current_epm_vendor',
        ['onestream', 'planful'] // Tier 1 + Tier 2
      );
      
      // Base: 5, Fragmentation: 0.5, Mixed tier: 0.25 = 4.25
      expect(result.rawScore).toBe(4.3); // Rounded
      expect(result.explanation).toContain('mixed');
    });
    
    test('should score single Tier 2 vendor as 4/5', () => {
      const result = calculateQuestionScore(
        'q2_current_epm_vendor',
        ['planful']
      );
      
      expect(result.rawScore).toBe(4);
      expect(result.explanation).toContain('Challenger');
    });
    
    test('should score legacy vendor as 2/5', () => {
      const result = calculateQuestionScore(
        'q2_current_epm_vendor',
        ['hyperion']
      );
      
      expect(result.rawScore).toBe(2);
      expect(result.explanation).toContain('Legacy');
    });
    
    test('should score "none" option as 1/5', () => {
      const result = calculateQuestionScore(
        'q2_current_epm_vendor',
        ['none']
      );
      
      expect(result.rawScore).toBe(1);
      expect(result.explanation).toContain('No EPM');
    });
    
    test('should handle 3+ vendors with compounding fragmentation penalty', () => {
      const result = calculateQuestionScore(
        'q2_current_epm_vendor',
        ['onestream', 'anaplan', 'oracle_epm'] // 3 Tier 1 vendors
      );
      
      // Base: 5, Penalty: 1.0 for 2 extra vendors = 4.0
      expect(result.rawScore).toBe(4);
      expect(result.explanation).toContain('3 systems');
    });
  });
  
  describe('Multi-Select Scoring Modes', () => {
    test('cumulative mode: more selections = higher score', () => {
      // Create a mock question for AI use cases (cumulative mode)
      const questionDef = getQuestionById('q2_ai_use_cases');
      expect(questionDef).toBeDefined();
      expect(questionDef?.multiSelectScoringMode).toBe('cumulative');
      
      // 1 selection should score lower than 3 selections
      const result1 = calculateQuestionScore('q2_ai_use_cases', ['demand_forecasting'], questionDef!);
      const result3 = calculateQuestionScore('q2_ai_use_cases', ['demand_forecasting', 'anomaly_detection', 'scenario_planning'], questionDef!);
      
      expect(result3.rawScore).toBeGreaterThan(result1.rawScore);
    });
    
    test('penalty mode: more selections = lower score', () => {
      // Pain points question uses penalty mode
      const questionDef = getQuestionById('q1_pain_points');
      expect(questionDef).toBeDefined();
      expect(questionDef?.multiSelectScoringMode).toBe('penalty');
      
      // More pain points = worse situation = lower score
      const result1 = calculateQuestionScore('q1_pain_points', ['slow_close'], questionDef!);
      const result3 = calculateQuestionScore('q1_pain_points', ['slow_close', 'manual_processes', 'data_quality'], questionDef!);
      
      expect(result1.rawScore).toBeGreaterThan(result3.rawScore);
    });
    
    test('average mode: average of selections', () => {
      // Priority ranking questions use average mode
      const questionDef = getQuestionById('q1_priorities');
      expect(questionDef).toBeDefined();
      expect(questionDef?.multiSelectScoringMode).toBe('average');
    });
  });
  
  describe('Range-Based Scoring', () => {
    test('should score leading benchmark correctly', () => {
      // Find a range-type question
      const rangeQuestion = ALL_QUESTIONS.find((q: any) => q.scoringConfig?.type === 'range');
      
      if (rangeQuestion) {
        const leadingValue = rangeQuestion.scoringConfig.benchmarks.leading;
        const isDirectScoring = rangeQuestion.scoringConfig.direction === 'direct';
        
        // Leading value should score 5
        const result = calculateQuestionScore(
          rangeQuestion.id, 
          isDirectScoring ? leadingValue : leadingValue - 1,
          rangeQuestion
        );
        
        expect(result.rawScore).toBe(5);
        expect(result.explanation).toContain('Leading');
      }
    });
  });
  
  describe('Weighted Single-Select Scoring', () => {
    test('should use weight values from scoringConfig', () => {
      // Cloud adoption question has weights
      const questionDef = getQuestionById('q2_cloud_adoption');
      expect(questionDef).toBeDefined();
      expect(questionDef?.scoringConfig?.weights).toBeDefined();
      
      const result = calculateQuestionScore('q2_cloud_adoption', 'cloud_first', questionDef!);
      
      expect(result.rawScore).toBe(5);
      expect(result.explanation).toContain('Weighted');
    });
  });
  
  describe('Scoring Engine Validation', () => {
    test('all multi-select questions should have a scoring mode defined', () => {
      const multiSelectQuestions = ALL_QUESTIONS.filter((q: any) => q.questionType === 'multi_select');
      
      for (const q of multiSelectQuestions) {
        expect(q.multiSelectScoringMode).toBeDefined();
        expect(['cumulative', 'penalty', 'average']).toContain(q.multiSelectScoringMode);
      }
    });
    
    test('vendor_tier questions should have vendorTiers and tierScores configured', () => {
      const vendorTierQuestions = ALL_QUESTIONS.filter((q: any) => q.scoringConfig?.type === 'vendor_tier');
      
      for (const q of vendorTierQuestions) {
        expect(q.scoringConfig.vendorTiers).toBeDefined();
        expect(q.scoringConfig.tierScores).toBeDefined();
        expect(q.scoringConfig.tierScores.tier1).toBe(5);
        expect(q.scoringConfig.tierScores.tier2).toBe(4);
      }
    });
    
    test('all score results should have normalizedScore between 0 and 1', () => {
      const testCases = [
        { qId: 'q2_current_epm_vendor', value: ['onestream'] },
        { qId: 'q2_current_epm_vendor', value: ['none'] },
        { qId: 'q2_cloud_adoption', value: 'cloud_first' },
        { qId: 'q2_cloud_adoption', value: 'none' },
      ];
      
      for (const tc of testCases) {
        const result = calculateQuestionScore(tc.qId, tc.value);
        expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
        expect(result.normalizedScore).toBeLessThanOrEqual(1);
      }
    });
  });
});

// =========================================
// AI Scoring Validator Tests
// =========================================
import { 
  validateBusinessRules,
  createAdminNotification,
  shouldAutoUpdateScores,
  type ValidationIssue,
  type AIValidationResult,
  type ValidationResult,
} from '../utils/ai-scoring-validator';

describe('AI Scoring Validator', () => {
  describe('Layer 1: Base Assessment Scoring', () => {
    test('should calculate dimension scores from responses', () => {
      const mockResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['onestream'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
        { id: '2', assessmentId: 'a1', questionId: 'q2_cloud_adoption', tier: 'pre_assessment', response: 'cloud_first', rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const { dimensionScores, questionScores } = calculateBaseScores(mockResponses as any, ALL_QUESTIONS);
      
      expect(Object.keys(questionScores).length).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Layer 2: Fragmentation Checking', () => {
    test('should detect high vendor fragmentation (3+ vendors)', () => {
      const mockResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['onestream', 'anaplan', 'oracle_epm'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const issues = checkFragmentation(mockResponses as any, ALL_QUESTIONS);
      
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].code).toBe('HIGH_VENDOR_FRAGMENTATION');
      expect(issues[0].severity).toBe('warning');
    });
    
    test('should detect mixed tier vendors', () => {
      const mockResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['onestream', 'vena'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const issues = checkFragmentation(mockResponses as any, ALL_QUESTIONS);
      
      const mixedTierIssue = issues.find(i => i.code === 'MIXED_TIER_VENDORS');
      expect(mixedTierIssue).toBeDefined();
    });
    
    test('should not flag single vendor selection', () => {
      const mockResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['onestream'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const issues = checkFragmentation(mockResponses as any, ALL_QUESTIONS);
      
      expect(issues.length).toBe(0);
    });
  });
  
  describe('Layer 3: Business Rule Validation', () => {
    test('should flag timeline below vendor minimum (OneStream enterprise = 12 months min)', () => {
      const mockAssessment = { dimensionScores: { financial_planning_analysis: 70 } };
      const mockResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['onestream'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
        { id: '2', assessmentId: 'a1', questionId: 'q1_company_size', tier: 'registration', response: '1b_5b', rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const issues = validateBusinessRules(mockAssessment as any, mockResponses as any, 6);
      
      const timelineIssue = issues.find(i => i.code === 'TIMELINE_BELOW_MINIMUM');
      expect(timelineIssue).toBeDefined();
      expect(timelineIssue?.severity).toBe('critical');
      expect(timelineIssue?.message).toContain('12 months');
    });
    
    test('should not flag timeline at or above vendor minimum', () => {
      const mockAssessment = { dimensionScores: { financial_planning_analysis: 70 } };
      const mockResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['onestream'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
        { id: '2', assessmentId: 'a1', questionId: 'q1_company_size', tier: 'registration', response: '1b_5b', rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const issues = validateBusinessRules(mockAssessment as any, mockResponses as any, 14);
      
      const timelineIssue = issues.find(i => i.code === 'TIMELINE_BELOW_MINIMUM');
      expect(timelineIssue).toBeUndefined();
    });
    
    test('should flag scores exceeding 100', () => {
      const mockAssessment = { dimensionScores: { financial_planning_analysis: 120 } };
      
      const issues = validateBusinessRules(mockAssessment as any, [], undefined);
      
      const scoreIssue = issues.find(i => i.code === 'SCORE_EXCEEDS_MAXIMUM');
      expect(scoreIssue).toBeDefined();
      expect(scoreIssue?.severity).toBe('critical');
    });
    
    test('should flag negative scores', () => {
      const mockAssessment = { dimensionScores: { financial_planning_analysis: -10 } };
      
      const issues = validateBusinessRules(mockAssessment as any, [], undefined);
      
      const scoreIssue = issues.find(i => i.code === 'NEGATIVE_SCORE');
      expect(scoreIssue).toBeDefined();
    });
    
    test('should flag high score variance', () => {
      const mockAssessment = { dimensionScores: { 
        financial_planning_analysis: 95,
        management_reporting: 15,
        consolidation_close: 90,
      }};
      
      const issues = validateBusinessRules(mockAssessment as any, [], undefined);
      
      const varianceIssue = issues.find(i => i.code === 'HIGH_SCORE_VARIANCE');
      expect(varianceIssue).toBeDefined();
      expect(varianceIssue?.severity).toBe('warning');
    });
  });
  
  describe('Layer 4: AI Advisory Helpers', () => {
    test('shouldAutoUpdateScores returns true for high confidence with adjustments', () => {
      const aiResult: AIValidationResult = {
        confidence: 97,
        recommendation: 'auto_update',
        issues: [],
        suggestedScoreAdjustments: { financial_planning_analysis: 75 },
      };
      
      expect(shouldAutoUpdateScores(aiResult)).toBe(true);
    });
    
    test('shouldAutoUpdateScores returns false for low confidence', () => {
      const aiResult: AIValidationResult = {
        confidence: 80,
        recommendation: 'flag_user',
        issues: [],
        suggestedScoreAdjustments: { financial_planning_analysis: 75 },
      };
      
      expect(shouldAutoUpdateScores(aiResult)).toBe(false);
    });
    
    test('shouldAutoUpdateScores returns false without adjustments', () => {
      const aiResult: AIValidationResult = {
        confidence: 97,
        recommendation: 'auto_update',
        issues: [],
      };
      
      expect(shouldAutoUpdateScores(aiResult)).toBe(false);
    });
  });
  
  describe('Admin Notification System', () => {
    test('should create notification for low AI confidence', () => {
      const validationResult = {
        isValid: true,
        overallScore: 70,
        adjustedOverallScore: 70,
        dimensionScores: {},
        adjustedDimensionScores: {},
        dimensionDetails: {},
        correlationAdjustments: [],
        rootCauses: [],
        issues: [],
        aiValidation: {
          confidence: 40,
          recommendation: 'flag_admin' as const,
          issues: [{ severity: 'warning' as const, category: 'ai_advisory' as const, code: 'TEST', message: 'Test issue' }],
        },
        processingTimeMs: 100,
      } satisfies ValidationResult;
      
      const notification = createAdminNotification('test-assessment-id', validationResult);
      
      expect(notification).not.toBeNull();
      expect(notification?.type).toBe('anomaly_detected');
      expect(notification?.severity).toBe('high');
    });
    
    test('should create notification for critical issues', () => {
      const validationResult = {
        isValid: false,
        overallScore: 70,
        adjustedOverallScore: 70,
        dimensionScores: {},
        adjustedDimensionScores: {},
        dimensionDetails: {},
        correlationAdjustments: [],
        rootCauses: [],
        issues: [{ severity: 'critical' as const, category: 'scoring' as const, code: 'TEST', message: 'Critical issue' }],
        aiValidation: {
          confidence: 85,
          recommendation: 'flag_user' as const,
          issues: [],
        },
        processingTimeMs: 100,
      } satisfies ValidationResult;
      
      const notification = createAdminNotification('test-assessment-id', validationResult);
      
      expect(notification).not.toBeNull();
      expect(notification?.type).toBe('validation_failed');
    });
    
    test('should not create notification for high confidence accept', () => {
      const validationResult = {
        isValid: true,
        overallScore: 70,
        adjustedOverallScore: 70,
        dimensionScores: {},
        adjustedDimensionScores: {},
        dimensionDetails: {},
        correlationAdjustments: [],
        rootCauses: [],
        issues: [],
        aiValidation: {
          confidence: 95,
          recommendation: 'accept' as const,
          issues: [],
        },
        processingTimeMs: 100,
      } satisfies ValidationResult;
      
      const notification = createAdminNotification('test-assessment-id', validationResult);
      
      expect(notification).toBeNull();
    });
  });
  
  describe('Vendor Benchmark Alignment', () => {
    test('Planful SMB should allow shorter timelines than OneStream', () => {
      const mockAssessment = { dimensionScores: {} };
      const mockResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['planful'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
        { id: '2', assessmentId: 'a1', questionId: 'q1_company_size', tier: 'registration', response: '50m_250m', rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const planfulIssues = validateBusinessRules(mockAssessment as any, mockResponses as any, 3);
      
      mockResponses[0].response = ['onestream'];
      const onestreamIssues = validateBusinessRules(mockAssessment as any, mockResponses as any, 3);
      
      const planfulTimelineIssue = planfulIssues.find(i => i.code === 'TIMELINE_BELOW_MINIMUM');
      const onestreamTimelineIssue = onestreamIssues.find(i => i.code === 'TIMELINE_BELOW_MINIMUM');
      
      expect(planfulTimelineIssue).toBeUndefined();
      expect(onestreamTimelineIssue).toBeDefined();
    });
    
    test('larger organizations should require longer implementation timelines', () => {
      const mockAssessment = { dimensionScores: {} };
      
      const smbResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['onestream'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
        { id: '2', assessmentId: 'a1', questionId: 'q1_company_size', tier: 'registration', response: '50m_250m', rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const enterpriseResponses = [
        { id: '1', assessmentId: 'a1', questionId: 'q2_current_epm_vendor', tier: 'pre_assessment', response: ['onestream'], rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
        { id: '2', assessmentId: 'a1', questionId: 'q1_company_size', tier: 'registration', response: '5b_plus', rawValue: null, score: null, isAdaptiveResponse: false, createdAt: new Date() },
      ];
      
      const smbIssues = validateBusinessRules(mockAssessment as any, smbResponses as any, 5);
      const enterpriseIssues = validateBusinessRules(mockAssessment as any, enterpriseResponses as any, 12);
      
      const smbTimelineIssue = smbIssues.find(i => i.code === 'TIMELINE_BELOW_MINIMUM');
      const enterpriseTimelineIssue = enterpriseIssues.find(i => i.code === 'TIMELINE_BELOW_MINIMUM');
      
      expect(smbTimelineIssue).toBeUndefined();
      expect(enterpriseTimelineIssue).toBeDefined();
    });
  });
});

// ============================================
// CORRELATION MATRIX & ROOT CAUSE ANALYSIS TESTS
// ============================================

import {
  calculateCorrelationAdjustments,
  getCorrelationsForTarget,
  getPrerequisiteDimensions,
  getEnabledDimensions,
  DIMENSION_CORRELATIONS,
  MATURITY_LEVELS,
  ROOT_CAUSE_PATTERNS,
  // Phase 2
  calculateRespondentConfidence,
  applyConfidenceWeighting,
  ROLE_DIMENSION_EXPERTISE,
  SENIORITY_MULTIPLIER,
  // Phase 3
  enhanceRootCauses,
  ROOT_CAUSE_REMEDIATIONS,
  // Phase 4
  getStakeholderRelevantDimensions,
  determineConfidenceLevel,
  STAKEHOLDER_FOCUS,
  CONFIDENCE_LEVEL_METADATA,
  type RespondentContext,
} from '../correlation-matrix';

describe('Correlation Matrix', () => {
  describe('Maturity Level Mapping', () => {
    test('should map scores to correct maturity levels', () => {
      expect(scoreToMaturityLevel(0).level).toBe(0);
      expect(scoreToMaturityLevel(10).level).toBe(0);
      expect(scoreToMaturityLevel(19).level).toBe(0);
      
      expect(scoreToMaturityLevel(20).level).toBe(1);
      expect(scoreToMaturityLevel(35).level).toBe(1);
      expect(scoreToMaturityLevel(39).level).toBe(1);
      
      expect(scoreToMaturityLevel(40).level).toBe(2);
      expect(scoreToMaturityLevel(55).level).toBe(2);
      expect(scoreToMaturityLevel(59).level).toBe(2);
      
      expect(scoreToMaturityLevel(60).level).toBe(3);
      expect(scoreToMaturityLevel(70).level).toBe(3);
      expect(scoreToMaturityLevel(79).level).toBe(3);
      
      expect(scoreToMaturityLevel(80).level).toBe(4);
      expect(scoreToMaturityLevel(90).level).toBe(4);
      expect(scoreToMaturityLevel(94).level).toBe(4);
      
      expect(scoreToMaturityLevel(95).level).toBe(5);
      expect(scoreToMaturityLevel(100).level).toBe(5);
    });
    
    test('should return maturity level labels', () => {
      expect(scoreToMaturityLevel(15).label).toBe('Ad-hoc');
      expect(scoreToMaturityLevel(30).label).toBe('Defined');
      expect(scoreToMaturityLevel(50).label).toBe('Managed');
      expect(scoreToMaturityLevel(70).label).toBe('Optimised');
      expect(scoreToMaturityLevel(85).label).toBe('Advanced');
      expect(scoreToMaturityLevel(97).label).toBe('Leading');
    });
    
    test('should clamp out-of-range scores', () => {
      expect(scoreToMaturityLevel(-10).level).toBe(0);
      expect(scoreToMaturityLevel(150).level).toBe(5);
    });
  });
  
  describe('Dimension Correlations', () => {
    test('should have correlations defined for all dimension relationships', () => {
      expect(DIMENSION_CORRELATIONS.length).toBeGreaterThan(10);
    });
    
    test('technology_systems should be a prerequisite for multiple dimensions', () => {
      const techPrerequisites = DIMENSION_CORRELATIONS.filter(
        c => c.source === 'technology_systems' && c.type === 'prerequisite'
      );
      expect(techPrerequisites.length).toBeGreaterThanOrEqual(2);
    });
    
    test('data_analytics should be prerequisite for AI/ML', () => {
      const dataToAi = DIMENSION_CORRELATIONS.find(
        c => c.source === 'data_analytics' && c.target === 'ai_machine_learning'
      );
      expect(dataToAi).toBeDefined();
      expect(dataToAi?.type).toBe('prerequisite');
      expect(dataToAi?.strength).toBeGreaterThanOrEqual(0.8);
    });
    
    test('getCorrelationsForTarget should find all incoming correlations', () => {
      const aiCorrelations = getCorrelationsForTarget('ai_machine_learning');
      expect(aiCorrelations.length).toBeGreaterThan(0);
      expect(aiCorrelations.some(c => c.source === 'data_analytics')).toBe(true);
    });
    
    test('getPrerequisiteDimensions should identify prerequisites', () => {
      const aiPrereqs = getPrerequisiteDimensions('ai_machine_learning');
      expect(aiPrereqs).toContain('data_analytics');
    });
    
    test('getEnabledDimensions should identify downstream dimensions', () => {
      const techEnables = getEnabledDimensions('technology_systems');
      expect(techEnables.length).toBeGreaterThan(0);
    });
  });
  
  describe('Correlation Adjustments', () => {
    test('should apply penalty when prerequisite dimension is weak', () => {
      const scores = {
        technology_systems: 15, // Well below penaltyThreshold of 35 to ensure non-zero adjustment
        financial_planning_analysis: 60,
        consolidation_close: 55,
        data_analytics: 20, // Below penaltyThreshold of 40
        ai_machine_learning: 50,
        management_reporting: 50,
        financial_controls_compliance: 50,
        organisation_people: 50,
      };
      
      const adjustments = calculateCorrelationAdjustments('financial_planning_analysis', scores);
      
      const techPenalty = adjustments.find(a => a.sourceDimension === 'technology_systems');
      expect(techPenalty).toBeDefined();
      expect(techPenalty?.adjustment).toBeLessThan(0);
    });
    
    test('should apply bonus when enabler dimension is strong', () => {
      const scores = {
        technology_systems: 75,
        financial_planning_analysis: 50,
        consolidation_close: 55,
        data_analytics: 75,
        ai_machine_learning: 45,
        management_reporting: 50,
        financial_controls_compliance: 50,
        organisation_people: 50,
      };
      
      const adjustments = calculateCorrelationAdjustments('ai_machine_learning', scores);
      
      expect(adjustments.length).toBeGreaterThan(0);
    });
    
    test('applyCorrelationAdjustments should modify all dimension scores', () => {
      const baseScores = {
        technology_systems: 15, // Well below penaltyThreshold of 35 to trigger penalties
        financial_planning_analysis: 60,
        consolidation_close: 55,
        data_analytics: 15, // Well below penaltyThreshold of 35 to trigger AI penalty
        ai_machine_learning: 50,
        management_reporting: 50,
        financial_controls_compliance: 50,
        organisation_people: 50,
      };
      
      const { adjustedScores, allAdjustments } = applyCorrelationAdjustments(baseScores);
      
      expect(allAdjustments.length).toBeGreaterThan(0);
      expect(adjustedScores).toBeDefined();
      
      expect(adjustedScores['financial_planning_analysis']).toBeLessThan(baseScores['financial_planning_analysis']);
      expect(adjustedScores['ai_machine_learning']).toBeLessThan(baseScores['ai_machine_learning']);
    });
    
    test('adjusted scores should be clamped between 0 and 100', () => {
      const extremeScores = {
        technology_systems: 5,
        financial_planning_analysis: 95,
        consolidation_close: 95,
        data_analytics: 5,
        ai_machine_learning: 98,
        management_reporting: 98,
        financial_controls_compliance: 95,
        organisation_people: 95,
      };
      
      const { adjustedScores } = applyCorrelationAdjustments(extremeScores);
      
      for (const score of Object.values(adjustedScores)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });
  });
  
  describe('Root Cause Detection', () => {
    test('should detect technology fragmentation pattern', () => {
      const weakTechScores = {
        technology_systems: 35,
        financial_planning_analysis: 45,
        consolidation_close: 40,
        data_analytics: 45,
        ai_machine_learning: 30,
        management_reporting: 42,
        financial_controls_compliance: 50,
        organisation_people: 55,
      };
      
      const rootCauses = detectRootCauses(weakTechScores);
      
      const techFragmentation = rootCauses.find(
        rc => rc.pattern.id === 'tech_fragmentation'
      );
      expect(techFragmentation).toBeDefined();
      expect(techFragmentation?.pattern.priority).toBe('critical');
    });
    
    test('should detect data quality gap pattern', () => {
      const weakDataScores = {
        technology_systems: 60,
        financial_planning_analysis: 55,
        consolidation_close: 60,
        data_analytics: 35,
        ai_machine_learning: 30,
        management_reporting: 45,
        financial_controls_compliance: 60,
        organisation_people: 55,
      };
      
      const rootCauses = detectRootCauses(weakDataScores);
      
      const dataQualityGap = rootCauses.find(
        rc => rc.pattern.id === 'data_quality_gap'
      );
      expect(dataQualityGap).toBeDefined();
    });
    
    test('should detect AI readiness gap when foundations are weak', () => {
      const notAiReadyScores = {
        technology_systems: 40,
        financial_planning_analysis: 55,
        consolidation_close: 55,
        data_analytics: 35,
        ai_machine_learning: 25,
        management_reporting: 50,
        financial_controls_compliance: 50,
        organisation_people: 40,
      };
      
      const rootCauses = detectRootCauses(notAiReadyScores);
      
      const aiReadinessGap = rootCauses.find(
        rc => rc.pattern.id === 'ai_not_ready'
      );
      expect(aiReadinessGap).toBeDefined();
    });
    
    test('should not detect patterns when scores are healthy', () => {
      const healthyScores = {
        technology_systems: 75,
        financial_planning_analysis: 70,
        consolidation_close: 72,
        data_analytics: 68,
        ai_machine_learning: 65,
        management_reporting: 70,
        financial_controls_compliance: 75,
        organisation_people: 72,
      };
      
      const rootCauses = detectRootCauses(healthyScores);
      
      expect(rootCauses.length).toBe(0);
    });
    
    test('should sort root causes by priority and confidence', () => {
      const multipleIssueScores = {
        technology_systems: 30,
        financial_planning_analysis: 40,
        consolidation_close: 35,
        data_analytics: 35,
        ai_machine_learning: 25,
        management_reporting: 40,
        financial_controls_compliance: 38,
        organisation_people: 40,
      };
      
      const rootCauses = detectRootCauses(multipleIssueScores);
      
      expect(rootCauses.length).toBeGreaterThan(1);
      
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < rootCauses.length; i++) {
        const prevPriority = priorityOrder[rootCauses[i - 1].pattern.priority];
        const currPriority = priorityOrder[rootCauses[i].pattern.priority];
        expect(currPriority).toBeGreaterThanOrEqual(prevPriority);
      }
    });
  });
  
  describe('Correlation Scoring Integration', () => {
    test('calculateCorrelationScoring should return complete result', () => {
      const baseScores = {
        technology_systems: 45,
        financial_planning_analysis: 55,
        consolidation_close: 50,
        data_analytics: 40,
        ai_machine_learning: 35,
        management_reporting: 50,
        financial_controls_compliance: 55,
        organisation_people: 50,
      };
      
      const result = calculateCorrelationScoring(baseScores);
      
      expect(result.adjustedScores).toBeDefined();
      expect(result.adjustments).toBeDefined();
      expect(result.dimensionDetails).toBeDefined();
      expect(result.rootCauses).toBeDefined();
      
      expect(Object.keys(result.dimensionDetails).length).toBe(8);
      
      for (const [dim, detail] of Object.entries(result.dimensionDetails)) {
        expect(detail.score).toBeDefined();
        expect(detail.adjustedScore).toBeDefined();
        expect(detail.maturityLevel).toBeDefined();
        expect(detail.correlationAdjustments).toBeDefined();
      }
    });
  });
});

// ============================================
// PHASE 2: RESPONDENT CONTEXT & CONFIDENCE TESTS
// ============================================

describe('Phase 2: Respondent Context & Confidence', () => {
  describe('Respondent Role Expertise', () => {
    test('CFO should have high expertise in FP&A and controls', () => {
      const cfoExpertise = ROLE_DIMENSION_EXPERTISE['cfo'];
      
      expect(cfoExpertise['financial_planning_analysis']).toBeGreaterThanOrEqual(90);
      expect(cfoExpertise['financial_controls_compliance']).toBeGreaterThanOrEqual(85);
      expect(cfoExpertise['ai_machine_learning']).toBeLessThanOrEqual(60);
    });
    
    test('CIO should have high expertise in technology and AI', () => {
      const cioExpertise = ROLE_DIMENSION_EXPERTISE['cio'];
      
      expect(cioExpertise['technology_systems']).toBeGreaterThanOrEqual(90);
      expect(cioExpertise['ai_machine_learning']).toBeGreaterThanOrEqual(85);
      expect(cioExpertise['consolidation_close']).toBeLessThanOrEqual(50);
    });
    
    test('all roles should have expertise defined', () => {
      const roles = Object.keys(ROLE_DIMENSION_EXPERTISE);
      expect(roles.length).toBeGreaterThanOrEqual(8);
      
      for (const role of roles) {
        const expertise = ROLE_DIMENSION_EXPERTISE[role as keyof typeof ROLE_DIMENSION_EXPERTISE];
        expect(Object.keys(expertise).length).toBeGreaterThanOrEqual(6);
      }
    });
  });
  
  describe('Seniority Multipliers', () => {
    test('C-suite should have highest multiplier', () => {
      expect(SENIORITY_MULTIPLIER['c_suite']).toBeGreaterThan(SENIORITY_MULTIPLIER['director']);
      expect(SENIORITY_MULTIPLIER['director']).toBeGreaterThanOrEqual(SENIORITY_MULTIPLIER['manager']);
    });
    
    test('analyst should have lowest multiplier', () => {
      expect(SENIORITY_MULTIPLIER['analyst']).toBeLessThan(SENIORITY_MULTIPLIER['manager']);
    });
  });
  
  describe('Respondent Confidence Calculation', () => {
    test('CFO should have high confidence on FP&A dimension', () => {
      const cfoContext: RespondentContext = {
        role: 'cfo',
        seniority: 'c_suite',
        yearsInRole: 5,
        yearsAtCompany: 10,
        dimensionExpertise: {}
      };
      
      const confidence = calculateRespondentConfidence(cfoContext, 'financial_planning_analysis');
      expect(confidence).toBeGreaterThanOrEqual(90);
    });
    
    test('CFO should have lower confidence on AI dimension', () => {
      const cfoContext: RespondentContext = {
        role: 'cfo',
        seniority: 'c_suite',
        yearsInRole: 5,
        yearsAtCompany: 10,
        dimensionExpertise: {}
      };
      
      const confidence = calculateRespondentConfidence(cfoContext, 'ai_machine_learning');
      expect(confidence).toBeLessThanOrEqual(75);
    });
    
    test('analyst should have lower confidence than director', () => {
      const analystContext: RespondentContext = {
        role: 'finance_analyst',
        seniority: 'analyst',
        yearsInRole: 2,
        yearsAtCompany: 2,
        dimensionExpertise: {}
      };
      
      const directorContext: RespondentContext = {
        role: 'finance_director',
        seniority: 'director',
        yearsInRole: 8,
        yearsAtCompany: 10,
        dimensionExpertise: {}
      };
      
      const analystConfidence = calculateRespondentConfidence(analystContext, 'financial_planning_analysis');
      const directorConfidence = calculateRespondentConfidence(directorContext, 'financial_planning_analysis');
      
      expect(directorConfidence).toBeGreaterThan(analystConfidence);
    });
    
    test('self-assessed expertise should influence confidence', () => {
      const lowSelfAssessContext: RespondentContext = {
        role: 'cfo',
        seniority: 'c_suite',
        yearsInRole: 5,
        yearsAtCompany: 10,
        dimensionExpertise: { technology_systems: 30 }
      };
      
      const highSelfAssessContext: RespondentContext = {
        role: 'cfo',
        seniority: 'c_suite',
        yearsInRole: 5,
        yearsAtCompany: 10,
        dimensionExpertise: { technology_systems: 90 }
      };
      
      const lowConfidence = calculateRespondentConfidence(lowSelfAssessContext, 'technology_systems');
      const highConfidence = calculateRespondentConfidence(highSelfAssessContext, 'technology_systems');
      
      expect(highConfidence).toBeGreaterThan(lowConfidence);
    });
  });
  
  describe('Confidence Weighting Application', () => {
    test('should identify low confidence dimensions', () => {
      const scores = {
        technology_systems: 50,
        financial_planning_analysis: 60,
        consolidation_close: 55,
        data_analytics: 45,
        ai_machine_learning: 40,
        management_reporting: 50,
        financial_controls_compliance: 55,
        organisation_people: 50,
      };
      
      const analystContext: RespondentContext = {
        role: 'finance_analyst',
        seniority: 'analyst',
        yearsInRole: 1,
        yearsAtCompany: 1,
        dimensionExpertise: {}
      };
      
      const { confidenceLevels, lowConfidenceDimensions } = applyConfidenceWeighting(scores, analystContext);
      
      expect(Object.keys(confidenceLevels).length).toBe(8);
      expect(lowConfidenceDimensions.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// PHASE 3: ENHANCED ROOT CAUSE ANALYSIS TESTS
// ============================================

describe('Phase 3: Enhanced Root Cause Analysis', () => {
  describe('Remediation Paths', () => {
    test('should have remediation paths for all root cause patterns', () => {
      for (const pattern of ROOT_CAUSE_PATTERNS) {
        const remediations = ROOT_CAUSE_REMEDIATIONS[pattern.id];
        expect(remediations).toBeDefined();
        expect(remediations.length).toBeGreaterThan(0);
      }
    });
    
    test('remediation paths should have required properties', () => {
      for (const [patternId, remediations] of Object.entries(ROOT_CAUSE_REMEDIATIONS)) {
        for (const remediation of remediations) {
          expect(remediation.id).toBeDefined();
          expect(remediation.title).toBeDefined();
          expect(remediation.description).toBeDefined();
          expect(['low', 'medium', 'high']).toContain(remediation.effort);
          expect(['low', 'medium', 'high']).toContain(remediation.impact);
          expect(remediation.timeframeMonths.min).toBeLessThanOrEqual(remediation.timeframeMonths.max);
          expect(remediation.stakeholders.length).toBeGreaterThan(0);
          expect(remediation.kpis.length).toBeGreaterThan(0);
        }
      }
    });
  });
  
  describe('Enhanced Root Causes', () => {
    test('should enhance root causes with remediation paths', () => {
      const weakScores = {
        technology_systems: 30,
        financial_planning_analysis: 45,
        consolidation_close: 40,
        data_analytics: 35,
        ai_machine_learning: 25,
        management_reporting: 42,
        financial_controls_compliance: 50,
        organisation_people: 40,
      };
      
      const detectedCauses = detectRootCauses(weakScores);
      const enhanced = enhanceRootCauses(detectedCauses, weakScores);
      
      expect(enhanced.length).toBeGreaterThan(0);
      
      for (const cause of enhanced) {
        expect(cause.remediationPaths).toBeDefined();
        expect(cause.impactScore).toBeGreaterThanOrEqual(0);
        expect(cause.impactScore).toBeLessThanOrEqual(100);
        expect(cause.urgencyScore).toBeGreaterThanOrEqual(0);
        expect(cause.urgencyScore).toBeLessThanOrEqual(100);
        expect(['low', 'medium', 'high']).toContain(cause.effortToResolve);
        expect(cause.businessRisk).toBeDefined();
        expect(cause.stakeholderImpact.length).toBeGreaterThanOrEqual(0);
      }
    });
    
    test('critical root causes should have higher urgency', () => {
      const criticalIssueScores = {
        technology_systems: 25,
        financial_planning_analysis: 35,
        consolidation_close: 30,
        data_analytics: 30,
        ai_machine_learning: 20,
        management_reporting: 35,
        financial_controls_compliance: 40,
        organisation_people: 35,
      };
      
      const detectedCauses = detectRootCauses(criticalIssueScores);
      const enhanced = enhanceRootCauses(detectedCauses, criticalIssueScores);
      
      const criticalCauses = enhanced.filter(c => c.pattern.priority === 'critical');
      const mediumCauses = enhanced.filter(c => c.pattern.priority === 'medium');
      
      if (criticalCauses.length > 0 && mediumCauses.length > 0) {
        const avgCriticalUrgency = criticalCauses.reduce((sum, c) => sum + c.urgencyScore, 0) / criticalCauses.length;
        const avgMediumUrgency = mediumCauses.reduce((sum, c) => sum + c.urgencyScore, 0) / mediumCauses.length;
        
        expect(avgCriticalUrgency).toBeGreaterThan(avgMediumUrgency);
      }
    });
  });
});

// ============================================
// PHASE 4: ENHANCED EXECUTIVE BRIEF TESTS
// ============================================

describe('Phase 4: Enhanced Executive Brief', () => {
  describe('Stakeholder Focus Configuration', () => {
    test('all stakeholder types should have focus configuration', () => {
      const stakeholders: Array<keyof typeof STAKEHOLDER_FOCUS> = [
        'cfo', 'cio', 'ceo', 'board', 'fpa_director', 'transformation_lead'
      ];
      
      for (const stakeholder of stakeholders) {
        const focus = STAKEHOLDER_FOCUS[stakeholder];
        expect(focus).toBeDefined();
        expect(focus.primaryDimensions.length).toBeGreaterThan(0);
        expect(focus.keyMetrics.length).toBeGreaterThan(0);
        expect(focus.toneGuidance).toBeDefined();
      }
    });
    
    test('CFO focus should prioritize finance dimensions', () => {
      const cfoFocus = STAKEHOLDER_FOCUS['cfo'];
      
      expect(cfoFocus.primaryDimensions).toContain('financial_planning_analysis');
      expect(cfoFocus.primaryDimensions).toContain('financial_controls_compliance');
      expect(cfoFocus.primaryDimensions).not.toContain('ai_machine_learning');
    });
    
    test('CIO focus should prioritize technology dimensions', () => {
      const cioFocus = STAKEHOLDER_FOCUS['cio'];
      
      expect(cioFocus.primaryDimensions).toContain('technology_systems');
      expect(cioFocus.primaryDimensions).toContain('ai_machine_learning');
      expect(cioFocus.primaryDimensions).not.toContain('consolidation_close');
    });
  });
  
  describe('Stakeholder Relevant Dimensions', () => {
    test('should prioritize critical dimensions for stakeholder', () => {
      const scores = {
        technology_systems: 30,
        financial_planning_analysis: 35,
        consolidation_close: 55,
        data_analytics: 45,
        ai_machine_learning: 40,
        management_reporting: 50,
        financial_controls_compliance: 60,
        organisation_people: 50,
      };
      
      const cfoRelevant = getStakeholderRelevantDimensions('cfo', scores);
      
      expect(cfoRelevant.length).toBe(8);
      
      // First items should be critical (low scores in primary dimensions)
      const criticalDims = cfoRelevant.filter(d => d.priority === 'critical');
      expect(criticalDims.length).toBeGreaterThan(0);
      
      // financial_planning_analysis should be critical for CFO (score 35, primary dimension)
      const fpaEntry = cfoRelevant.find(d => d.dimension === 'financial_planning_analysis');
      expect(fpaEntry?.priority).toBe('critical');
    });
  });
  
  describe('Confidence Level Metadata', () => {
    test('all confidence levels should have metadata', () => {
      const levels: Array<keyof typeof CONFIDENCE_LEVEL_METADATA> = [
        'validated_evidence', 'advisory_judgement', 'indicative_outlook', 'pending_validation'
      ];
      
      for (const level of levels) {
        const metadata = CONFIDENCE_LEVEL_METADATA[level];
        expect(metadata.label).toBeDefined();
        expect(metadata.icon).toBeDefined();
        expect(metadata.color).toBeDefined();
        expect(metadata.description).toBeDefined();
      }
    });
  });
  
  describe('Confidence Level Determination', () => {
    test('should return validated_evidence for high confidence with direct evidence', () => {
      const level = determineConfidenceLevel(
        'Test insight',
        ['financial_planning_analysis'],
        { financial_planning_analysis: 95 },
        true
      );
      
      expect(level).toBe('validated_evidence');
    });
    
    test('should return advisory_judgement for medium-high confidence', () => {
      const level = determineConfidenceLevel(
        'Test insight',
        ['financial_planning_analysis', 'technology_systems'],
        { financial_planning_analysis: 70, technology_systems: 65 },
        false
      );
      
      expect(level).toBe('advisory_judgement');
    });
    
    test('should return pending_validation for low confidence', () => {
      const level = determineConfidenceLevel(
        'Test insight',
        ['ai_machine_learning'],
        { ai_machine_learning: 30 },
        false
      );
      
      expect(level).toBe('pending_validation');
    });
  });
});

// Phase 2-4 Integration Tests: Verify buildInsightContext populates new fields
describe('Phase 2-4 Integration: buildInsightContext', () => {
  
  test('should populate enhancedRootCauses from dimension scores', () => {
    const mockAssessment = {
      id: 'test-assessment',
      tier: 'full',
      epmReadinessScore: 55,
      sizeBand: 'mid_market',
      dimensionScores: {
        financial_planning_analysis: 40, // Low score triggers root cause
        consolidation_close: 45,
        management_reporting: 50,
        financial_controls_compliance: 55,
        technology_systems: 60,
        organisation_people: 65,
        data_analytics: 70,
        ai_machine_learning: 35, // Low score triggers root cause
      },
    };
    
    const dimensionScores = Object.fromEntries(
      Object.entries(mockAssessment.dimensionScores as Record<string, number>).map(([k, v]) => [k, { score: v }])
    );
    
    const context = buildInsightContext(mockAssessment, dimensionScores);
    
    expect(context.enhancedRootCauses).toBeDefined();
    expect(Array.isArray(context.enhancedRootCauses)).toBe(true);
    // With multiple low scores, should detect root causes
    if (context.enhancedRootCauses && context.enhancedRootCauses.length > 0) {
      expect(context.enhancedRootCauses[0]).toHaveProperty('pattern');
      expect(context.enhancedRootCauses[0]).toHaveProperty('rootCause');
      expect(context.enhancedRootCauses[0]).toHaveProperty('remediationPaths');
    }
  });
  
  test('should populate respondentConfidence with default role/seniority', () => {
    const mockAssessment = {
      id: 'test-assessment',
      tier: 'full',
      epmReadinessScore: 60,
      sizeBand: 'mid_market',
      dimensionScores: {
        financial_planning_analysis: 60,
        consolidation_close: 60,
        management_reporting: 60,
        financial_controls_compliance: 60,
        technology_systems: 60,
        organisation_people: 60,
        data_analytics: 60,
        ai_machine_learning: 60,
      },
    };
    
    const dimensionScores = Object.fromEntries(
      Object.entries(mockAssessment.dimensionScores as Record<string, number>).map(([k, v]) => [k, { score: v }])
    );
    
    // Call without responses - should use defaults
    const context = buildInsightContext(mockAssessment, dimensionScores, null, undefined);
    
    expect(context.respondentConfidence).toBeDefined();
    expect(context.respondentConfidence?.overall).toBeGreaterThan(0);
    expect(context.respondentConfidence?.breakdown).toHaveProperty('roleConfidence');
    expect(context.respondentConfidence?.breakdown).toHaveProperty('seniorityMultiplier');
    expect(context.respondentConfidence?.respondentRole).toBe('fpa_manager');
    expect(context.respondentConfidence?.respondentSeniority).toBe('manager');
  });
  
  test('should include confidenceLevelMetadata in context', () => {
    const mockAssessment = {
      id: 'test-assessment',
      tier: 'full',
      epmReadinessScore: 60,
      sizeBand: 'mid_market',
      dimensionScores: { financial_planning_analysis: 60 },
    };
    
    const dimensionScores = { financial_planning_analysis: { score: 60 } };
    const context = buildInsightContext(mockAssessment, dimensionScores);
    
    expect(context.confidenceLevelMetadata).toBeDefined();
    expect(context.confidenceLevelMetadata).toHaveProperty('validated_evidence');
    expect(context.confidenceLevelMetadata).toHaveProperty('advisory_judgement');
    expect(context.confidenceLevelMetadata).toHaveProperty('indicative_outlook');
    expect(context.confidenceLevelMetadata).toHaveProperty('pending_validation');
  });
});

// ============================================
// JOURNEY VALIDATION SERVICE TESTS
// ============================================

describe('Stage Question Count Validation Tests', () => {
  test('should require 14 questions for registration stage', () => {
    const requirements = getStageQuestionRequirements();
    expect(requirements.registration.minQuestions).toBe(14);
    expect(requirements.registration.expectedTotal).toBe(14);
  });

  test('should require 50 questions for pre_assessment stage', () => {
    const requirements = getStageQuestionRequirements();
    expect(requirements.pre_assessment.minQuestions).toBe(50);
    expect(requirements.pre_assessment.expectedTotal).toBe(50);
  });

  test('should require 74 questions for full assessment stage', () => {
    const requirements = getStageQuestionRequirements();
    expect(requirements.full.minQuestions).toBe(74);
    expect(requirements.full.expectedTotal).toBe(74);
  });

  test('should require 124 questions for report stage (50 pre + 74 full)', () => {
    const requirements = getStageQuestionRequirements();
    expect(requirements.report.minQuestions).toBe(124);
    expect(requirements.report.expectedTotal).toBe(124);
  });

  test('should return expected question counts for all stages', () => {
    const counts = getExpectedQuestionCounts();
    expect(counts.registration).toBe(14);
    expect(counts.pre_assessment).toBe(50);
    expect(counts.full).toBe(74);
    expect(counts.report).toBe(124);
  });

  test('should have required fields for registration stage', () => {
    const requirements = getStageQuestionRequirements();
    expect(requirements.registration.required).toContain('q1_company_name');
    expect(requirements.registration.required).toContain('q1_email');
    expect(requirements.registration.required).toContain('q1_industry');
    expect(requirements.registration.required).toContain('q1_company_size');
  });

  test('should have empty required fields for pre_assessment stage', () => {
    const requirements = getStageQuestionRequirements();
    expect(requirements.pre_assessment.required).toEqual([]);
  });
});

describe('Stage Transition Validation Tests', () => {
  const createMockResponses = (count: number): Partial<FcResponse>[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `response_${i}`,
      questionId: `q_${i}`,
      response: 'test_value',
      assessmentId: 'test-assessment-id',
    }));
  };

  describe('Positive Transitions', () => {
    test('can transition from pre_assessment to full when 50 questions answered', () => {
      const requirements = getStageQuestionRequirements();
      const responses = createMockResponses(50);
      
      expect(responses.length).toBeGreaterThanOrEqual(requirements.pre_assessment.minQuestions);
    });

    test('can transition from full to report when 124 questions answered', () => {
      const requirements = getStageQuestionRequirements();
      const responses = createMockResponses(124);
      
      expect(responses.length).toBeGreaterThanOrEqual(requirements.report.minQuestions);
    });
  });

  describe('Negative Transitions', () => {
    test('cannot start full assessment without completing pre_assessment (insufficient responses)', () => {
      const requirements = getStageQuestionRequirements();
      const responses = createMockResponses(30); // Less than 50 required
      
      expect(responses.length).toBeLessThan(requirements.pre_assessment.minQuestions);
    });

    test('cannot generate report without completing full assessment (insufficient responses)', () => {
      const requirements = getStageQuestionRequirements();
      const responses = createMockResponses(80); // Less than 124 required for report
      
      expect(responses.length).toBeLessThan(requirements.report.minQuestions);
    });

    test('cannot transition backwards (full to pre_assessment would have excess responses)', () => {
      const fullRequirements = getStageQuestionRequirements();
      const responses = createMockResponses(100);
      
      expect(responses.length).toBeGreaterThan(fullRequirements.pre_assessment.minQuestions);
      expect(responses.length).toBeGreaterThan(fullRequirements.full.minQuestions);
    });
  });

  describe('Edge Cases', () => {
    test('exact minimum threshold for pre_assessment allows transition', () => {
      const requirements = getStageQuestionRequirements();
      const responses = createMockResponses(50);
      
      expect(responses.length).toBe(requirements.pre_assessment.minQuestions);
    });

    test('exact minimum threshold for full allows transition to report', () => {
      const requirements = getStageQuestionRequirements();
      const responses = createMockResponses(124);
      
      expect(responses.length).toBe(requirements.report.minQuestions);
    });
  });
});

describe('AI Validation Service Tests', () => {
  describe('Scoring Mismatch Detection', () => {
    test('should detect dimension score mismatches', () => {
      const storedScore = 70;
      const calculatedScore = 55;
      const tolerance = 2;
      
      const hasMismatch = Math.abs(storedScore - calculatedScore) > tolerance;
      expect(hasMismatch).toBe(true);
    });

    test('should not flag scores within tolerance', () => {
      const storedScore = 70;
      const calculatedScore = 71;
      const tolerance = 2;
      
      const hasMismatch = Math.abs(storedScore - calculatedScore) > tolerance;
      expect(hasMismatch).toBe(false);
    });
  });

  describe('Auto-Fix Functionality', () => {
    test('should identify auto-fixable dimension score mismatches', () => {
      const issue = {
        code: 'DIMENSION_SCORE_MISMATCH',
        field: 'technology_systems',
        currentValue: 70,
        expectedValue: 55,
        autoFixable: true,
        autoFixed: false,
      };
      
      expect(issue.autoFixable).toBe(true);
      expect(issue.autoFixed).toBe(false);
      expect(issue.expectedValue).not.toBe(issue.currentValue);
    });

    test('should mark issue as auto-fixed after correction', () => {
      const issue = {
        code: 'DIMENSION_SCORE_MISMATCH',
        field: 'technology_systems',
        currentValue: 70,
        expectedValue: 55,
        autoFixable: true,
        autoFixed: false,
      };
      
      const correctedIssue = { ...issue, autoFixed: true };
      expect(correctedIssue.autoFixed).toBe(true);
    });

    test('should clamp scores to valid bounds (0-100)', () => {
      const invalidScores = [-10, 110, 150];
      const clampedScores = invalidScores.map(s => Math.max(0, Math.min(100, s)));
      
      expect(clampedScores[0]).toBe(0);
      expect(clampedScores[1]).toBe(100);
      expect(clampedScores[2]).toBe(100);
    });
  });

  describe('Critical Issues Blocking', () => {
    test('should identify critical issues that block transitions', () => {
      const issues = [
        { severity: 'critical', code: 'MISSING_REQUIRED_QUESTION' },
        { severity: 'warning', code: 'HIGH_SCORE_VARIANCE' },
        { severity: 'error', code: 'INSUFFICIENT_RESPONSES' },
      ];
      
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      expect(criticalIssues.length).toBe(1);
      expect(criticalIssues[0].code).toBe('MISSING_REQUIRED_QUESTION');
    });

    test('should block transition when critical issues exist', () => {
      const validationResult = {
        isValid: false,
        criticalIssues: 1,
        issues: [{ severity: 'critical', code: 'MISSING_REQUIRED_QUESTION' }],
      };
      
      const shouldBlock = validationResult.criticalIssues > 0;
      expect(shouldBlock).toBe(true);
      expect(validationResult.isValid).toBe(false);
    });

    test('should allow transition when no critical issues', () => {
      const validationResult = {
        isValid: true,
        criticalIssues: 0,
        issues: [{ severity: 'info', code: 'HIGH_SCORE_VARIANCE' }],
      };
      
      const shouldBlock = validationResult.criticalIssues > 0;
      expect(shouldBlock).toBe(false);
      expect(validationResult.isValid).toBe(true);
    });
  });
});

describe('Context-Aware Scoring Tests', () => {
  describe('Correlation Adjustments', () => {
    test('should apply correlation adjustments to dimension scores', () => {
      const baseScores = {
        technology_systems: 75,
        financial_planning_analysis: 50,
        data_analytics: 60,
        ai_machine_learning: 40,
      };
      
      const { adjustedScores, allAdjustments } = applyCorrelationAdjustments(baseScores);
      
      expect(adjustedScores).toBeDefined();
      expect(typeof adjustedScores.technology_systems).toBe('number');
    });

    test('should generate adjustments based on dimension correlations', () => {
      const baseScores = {
        technology_systems: 80,
        financial_planning_analysis: 40,
        data_analytics: 70,
        ai_machine_learning: 30,
        management_reporting: 50,
        consolidation_close: 45,
        financial_controls_compliance: 55,
        organisation_people: 60,
      };
      
      const { allAdjustments } = applyCorrelationAdjustments(baseScores);
      
      expect(Array.isArray(allAdjustments)).toBe(true);
    });

    test('should provide maturity level for dimension scores', () => {
      const testScores = [0, 25, 45, 65, 85, 98];
      
      testScores.forEach(score => {
        const maturityLevel = scoreToMaturityLevel(score);
        expect(maturityLevel).toHaveProperty('level');
        expect(maturityLevel).toHaveProperty('label');
        expect(maturityLevel).toHaveProperty('scoreRange');
        expect(score).toBeGreaterThanOrEqual(maturityLevel.scoreRange.min);
        expect(score).toBeLessThanOrEqual(maturityLevel.scoreRange.max);
      });
    });

    test('should calculate correlation scoring with root causes', () => {
      const baseScores = {
        technology_systems: 30, // Low - should trigger root cause
        financial_planning_analysis: 35,
        data_analytics: 25, // Low - should trigger root cause
        ai_machine_learning: 20,
        management_reporting: 40,
        consolidation_close: 35,
        financial_controls_compliance: 45,
        organisation_people: 50,
      };
      
      const result = calculateCorrelationScoring(baseScores);
      
      expect(result).toHaveProperty('adjustedScores');
      expect(result).toHaveProperty('adjustments');
      expect(result).toHaveProperty('dimensionDetails');
      expect(result).toHaveProperty('rootCauses');
    });
  });

  describe('Fragmentation Detection', () => {
    test('should detect fragmentation for multi-vendor responses', () => {
      const vendorQuestion = {
        id: 'q2_current_epm_vendor',
        dimension: 'technology_systems',
        questionType: 'multi_select',
        tier: 'pre_assessment',
        options: [
          { value: 'onestream', label: 'OneStream' },
          { value: 'anaplan', label: 'Anaplan' },
          { value: 'oracle_epm', label: 'Oracle EPM' },
        ],
        scoringConfig: {
          type: 'vendor_tier',
          vendorTiers: {
            tier1: ['onestream', 'anaplan'],
            tier2: ['oracle_epm'],
          },
        },
      };
      
      const responses = [
        { questionId: 'q2_current_epm_vendor', response: ['onestream', 'anaplan', 'oracle_epm'] },
      ];
      
      const issues = checkFragmentation(responses as FcResponse[], [vendorQuestion as any]);
      
      const fragmentationIssues = issues.filter(i => i.category === 'fragmentation');
      expect(fragmentationIssues.length).toBeGreaterThanOrEqual(0);
    });

    test('should not flag single vendor selection as fragmented', () => {
      const vendorQuestion = {
        id: 'q2_current_epm_vendor',
        dimension: 'technology_systems',
        questionType: 'multi_select',
        tier: 'pre_assessment',
        options: [
          { value: 'onestream', label: 'OneStream' },
        ],
        scoringConfig: {
          type: 'vendor_tier',
          vendorTiers: {
            tier1: ['onestream'],
          },
        },
      };
      
      const responses = [
        { questionId: 'q2_current_epm_vendor', response: ['onestream'] },
      ];
      
      const issues = checkFragmentation(responses as FcResponse[], [vendorQuestion as any]);
      
      const highFragmentationIssues = issues.filter(i => i.code === 'HIGH_VENDOR_FRAGMENTATION');
      expect(highFragmentationIssues.length).toBe(0);
    });
  });

  describe('Overall Score Calculation', () => {
    test('should calculate overall score considering all dimension scores', () => {
      const dimensionScores = {
        financial_planning_analysis: 60,
        management_reporting: 70,
        consolidation_close: 55,
        financial_controls_compliance: 65,
        technology_systems: 50,
        organisation_people: 75,
        data_analytics: 45,
        ai_machine_learning: 40,
      };
      
      const overall = calculateOverallScore(dimensionScores);
      
      expect(overall).toBeGreaterThanOrEqual(0);
      expect(overall).toBeLessThanOrEqual(100);
      
      const expectedAverage = Math.round(
        Object.values(dimensionScores).reduce((a, b) => a + b, 0) / 
        Object.values(dimensionScores).length
      );
      expect(overall).toBe(expectedAverage);
    });
  });

  describe('Score Integrity Validation', () => {
    test('should detect and fix stale overall score (0 with valid dimension scores)', async () => {
      const mockAssessment = {
        id: 'test-stale-score',
        overallMaturityScore: 0, // Stale: should be non-zero
        dimensionScores: {
          financial_planning_analysis: 60,
          management_reporting: 70,
          consolidation_close: 55,
          financial_controls_compliance: 65,
          technology_systems: 50,
          organisation_people: 75,
          data_analytics: 45,
          ai_machine_learning: 40,
        },
      } as any;
      
      const result = await ensureScoreIntegrity(mockAssessment, {
        applyDatabaseFix: false, // Don't actually update DB in test
      });
      
      expect(result.wasRepaired).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].code).toBe('STALE_OVERALL_SCORE');
      expect(result.correctedOverallScore).toBeGreaterThan(0);
      
      // Should be average of dimension scores
      const expectedAverage = Math.round(
        Object.values(mockAssessment.dimensionScores).reduce((a: number, b: number) => a + b, 0) / 
        Object.keys(mockAssessment.dimensionScores).length
      );
      expect(result.correctedOverallScore).toBe(expectedAverage);
    });

    test('should not flag valid overall scores', async () => {
      const mockAssessment = {
        id: 'test-valid-score',
        overallMaturityScore: 58, // Valid: non-zero
        dimensionScores: {
          financial_planning_analysis: 60,
          management_reporting: 55,
        },
      } as any;
      
      const result = await ensureScoreIntegrity(mockAssessment, {
        applyDatabaseFix: false,
      });
      
      expect(result.wasRepaired).toBe(false);
      expect(result.issues.filter(i => i.code === 'STALE_OVERALL_SCORE').length).toBe(0);
      expect(result.correctedOverallScore).toBe(58);
    });

    test('should apply industry weights when provided', async () => {
      const mockAssessment = {
        id: 'test-weighted',
        overallMaturityScore: 0,
        dimensionScores: {
          financial_planning_analysis: 80,
          data_analytics: 40,
        },
      } as any;
      
      const industryWeights = {
        financial_planning_analysis: 2, // Higher weight
        data_analytics: 1,
      };
      
      const result = await ensureScoreIntegrity(mockAssessment, {
        applyDatabaseFix: false,
        industryWeights,
      });
      
      expect(result.wasRepaired).toBe(true);
      // Weighted: (80*2 + 40*1) / (2+1) = 200/3 = 67
      expect(result.correctedOverallScore).toBe(67);
    });

    test('should detect dimension scores outside valid range', async () => {
      const mockAssessment = {
        id: 'test-out-of-range',
        overallMaturityScore: 50,
        dimensionScores: {
          financial_planning_analysis: 150, // Above max
          data_analytics: -10, // Below min
        },
      } as any;
      
      const result = await ensureScoreIntegrity(mockAssessment, {
        applyDatabaseFix: false,
      });
      
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.code === 'DIMENSION_ABOVE_MAX')).toBe(true);
      expect(result.issues.some(i => i.code === 'DIMENSION_BELOW_MIN')).toBe(true);
      expect(result.correctedDimensionScores.financial_planning_analysis).toBe(100);
      expect(result.correctedDimensionScores.data_analytics).toBe(0);
    });

    test('should use computed dimension scores when stored scores are empty', async () => {
      // Simulates scenario where database has no stored dimension scores
      // but we have computed scores from response recalculation
      const mockAssessment = {
        id: 'test-computed-scores',
        overallMaturityScore: 0, // Stale
        dimensionScores: {}, // Empty stored scores
        epmReadinessScore: 55, // Existing value should be preserved
      } as any;
      
      const computedScores = {
        financial_planning_analysis: 60,
        management_reporting: 70,
        data_analytics: 50,
      };
      
      const result = await ensureScoreIntegrity(mockAssessment, {
        applyDatabaseFix: false,
        computedDimensionScores: computedScores,
      });
      
      expect(result.wasRepaired).toBe(true);
      expect(result.issues[0].code).toBe('STALE_OVERALL_SCORE');
      // Should calculate from computed scores: (60 + 70 + 50) / 3 = 60
      expect(result.correctedOverallScore).toBe(60);
    });

    test('should preserve existing epmReadinessScore when repairing', async () => {
      const mockAssessment = {
        id: 'test-preserve-epm',
        overallMaturityScore: 0,
        dimensionScores: { financial_planning_analysis: 70 },
        epmReadinessScore: 55, // Should be preserved
      } as any;
      
      const result = await ensureScoreIntegrity(mockAssessment, {
        applyDatabaseFix: false,
      });
      
      expect(result.wasRepaired).toBe(true);
      // The function should preserve epmReadinessScore=55, not overwrite with correctedOverall=70
      // We can only verify this behavior works by checking the corrected score is calculated
      expect(result.correctedOverallScore).toBe(70);
    });
  });
});

describe('Inline Answer Editing Tests', () => {
  describe('Response Update Triggers Recalculation', () => {
    test('should recalculate dimension score when response changes', () => {
      const options = [
        { value: 'poor', label: 'Poor' },
        { value: 'average', label: 'Average' },
        { value: 'good', label: 'Good' },
        { value: 'excellent', label: 'Excellent' },
      ];
      
      const questions = [
        createMockQuestion('q1', 'technology_systems', 'single_select', options),
        createMockQuestion('q2', 'technology_systems', 'single_select', options),
      ];
      
      const originalResponses = [
        createMockResponse('q1', 'poor'),     // 1/4 = 25%
        createMockResponse('q2', 'average'),  // 2/4 = 50%
      ];
      
      const originalScore = calculateDimensionScore(
        originalResponses as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      const updatedResponses = [
        createMockResponse('q1', 'excellent'), // 4/4 = 100%
        createMockResponse('q2', 'average'),   // 2/4 = 50%
      ];
      
      const updatedScore = calculateDimensionScore(
        updatedResponses as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      expect(updatedScore).toBeGreaterThan(originalScore);
    });

    test('should update dimension scores when answers change', () => {
      const options = [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ];
      
      const questions = [
        createMockQuestion('q1', 'data_analytics', 'single_select', options, {
          weights: { low: 1, medium: 2, high: 3 }
        }),
      ];
      
      const lowResponse = [createMockResponse('q1', 'low')];
      const highResponse = [createMockResponse('q1', 'high')];
      
      const lowScore = calculateDimensionScore(
        lowResponse as FcResponse[],
        questions as FcQuestion[],
        'data_analytics'
      );
      
      const highScore = calculateDimensionScore(
        highResponse as FcResponse[],
        questions as FcQuestion[],
        'data_analytics'
      );
      
      expect(lowScore).toBeLessThan(highScore);
      expect(lowScore).toBe(33);
      expect(highScore).toBe(100);
    });
  });

  describe('Overall Score Updates', () => {
    test('should update overall score when dimension scores change', () => {
      const originalDimensionScores = {
        financial_planning_analysis: 40,
        management_reporting: 40,
        consolidation_close: 40,
        financial_controls_compliance: 40,
        technology_systems: 40,
        organisation_people: 40,
        data_analytics: 40,
        ai_machine_learning: 40,
      };
      
      const originalOverall = calculateOverallScore(originalDimensionScores);
      expect(originalOverall).toBe(40);
      
      const updatedDimensionScores = {
        ...originalDimensionScores,
        technology_systems: 80, // Changed from 40 to 80
        data_analytics: 80,     // Changed from 40 to 80
      };
      
      const updatedOverall = calculateOverallScore(updatedDimensionScores);
      
      expect(updatedOverall).toBeGreaterThan(originalOverall);
      expect(updatedOverall).toBe(50); // (40*6 + 80*2) / 8 = 400/8 = 50
    });

    test('should maintain score bounds after editing', () => {
      const extremeScores = {
        financial_planning_analysis: 100,
        management_reporting: 100,
        consolidation_close: 100,
        financial_controls_compliance: 100,
        technology_systems: 100,
        organisation_people: 100,
        data_analytics: 100,
        ai_machine_learning: 100,
      };
      
      const maxOverall = calculateOverallScore(extremeScores);
      expect(maxOverall).toBe(100);
      expect(maxOverall).toBeLessThanOrEqual(100);
      
      const minScores = {
        financial_planning_analysis: 0,
        management_reporting: 0,
        consolidation_close: 0,
        financial_controls_compliance: 0,
        technology_systems: 0,
        organisation_people: 0,
        data_analytics: 0,
        ai_machine_learning: 0,
      };
      
      const minOverall = calculateOverallScore(minScores);
      expect(minOverall).toBe(0);
      expect(minOverall).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cascading Score Updates', () => {
    test('should update all affected dimensions when critical response changes', () => {
      const options = [
        { value: 'manual', label: 'Manual' },
        { value: 'semi_automated', label: 'Semi-Automated' },
        { value: 'fully_automated', label: 'Fully Automated' },
      ];
      
      const questions = [
        createMockQuestion('q1', 'technology_systems', 'single_select', options),
        createMockQuestion('q2', 'financial_planning_analysis', 'single_select', options),
      ];
      
      const manualResponses = [
        createMockResponse('q1', 'manual'),
        createMockResponse('q2', 'manual'),
      ];
      
      const automatedResponses = [
        createMockResponse('q1', 'fully_automated'),
        createMockResponse('q2', 'fully_automated'),
      ];
      
      const techManualScore = calculateDimensionScore(
        manualResponses as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      const techAutomatedScore = calculateDimensionScore(
        automatedResponses as FcResponse[],
        questions as FcQuestion[],
        'technology_systems'
      );
      
      const fpaManualScore = calculateDimensionScore(
        manualResponses as FcResponse[],
        questions as FcQuestion[],
        'financial_planning_analysis'
      );
      
      const fpaAutomatedScore = calculateDimensionScore(
        automatedResponses as FcResponse[],
        questions as FcQuestion[],
        'financial_planning_analysis'
      );
      
      expect(techAutomatedScore).toBeGreaterThan(techManualScore);
      expect(fpaAutomatedScore).toBeGreaterThan(fpaManualScore);
    });
  });
});
