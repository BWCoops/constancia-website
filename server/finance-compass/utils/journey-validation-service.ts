/**
 * Journey Validation Service - 6-Layer AI-Validated Pipeline
 * 
 * Validates each stage of the FinanceCompass journey with strict guardrails:
 * 1. Data Completeness - All required questions answered
 * 2. Scoring Accuracy - Calculations match expected formulas
 * 3. Context Validation - Responses are internally consistent
 * 4. Anomaly Detection - Flag unusual patterns
 * 5. Auto-Fix Engine - Automatically repair fixable issues
 * 6. Admin Reporting - Email notifications with code suggestions
 * 
 * Uses OpenAI with STRICT hardcoded guardrails - no creative responses.
 */

import OpenAI from "openai";
import { createChildLogger } from "../../lib/logger";
import { getOpenAIConfig } from "../../config";
import { sendEmailViaGraph, SENDER_EMAIL } from "../../services/ms-graph-email";
import { escapeHtml } from "../../utils/html-escape";

const log = createChildLogger("journey-validation");
import { calculateQuestionScore, type ScoreResult } from "./scoring-engine";
import { getQuestionById, ALL_QUESTIONS, type QuestionDefinition } from "../question-bank";
import type { FcAssessment, FcResponse } from "@shared/finance-compass-schema";
import * as fcStorage from "../storage";

const openaiConfig = getOpenAIConfig();
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
  baseURL: openaiConfig.baseURL,
});

// ============================================
// STRICT GUARDRAIL CONSTANTS - HARDCODED
// ============================================

const JOURNEY_STAGES = ['registration', 'pre_assessment', 'roi', 'full', 'report'] as const;
type JourneyStage = typeof JOURNEY_STAGES[number];

const STAGE_QUESTION_REQUIREMENTS: Record<JourneyStage, { tier: string; minQuestions: number; required: string[]; expectedTotal?: number }> = {
  registration: { tier: 'registration', minQuestions: 14, required: ['q1_company_name', 'q1_email', 'q1_industry', 'q1_company_size'], expectedTotal: 14 },
  pre_assessment: { tier: 'pre_assessment', minQuestions: 50, required: [], expectedTotal: 50 },
  roi: { tier: 'roi', minQuestions: 0, required: [] },
  full: { tier: 'full', minQuestions: 74, required: [], expectedTotal: 74 },
  report: { tier: 'full', minQuestions: 124, required: [], expectedTotal: 124 }, // pre_assessment (50) + full (74) = 124 total
};

const DIMENSION_SCORE_BOUNDS = { min: 0, max: 100 };
const OVERALL_SCORE_TOLERANCE = 2;
const ANOMALY_SCORE_VARIANCE_THRESHOLD = 40;
const AI_TEMPERATURE = 0.1;
const AI_MAX_TOKENS = 1500;

const STRICT_VALIDATION_RULES = {
  scoresMustBeNumeric: true,
  scoresMustBeInRange: true,
  allDimensionsMustHaveScores: true,
  overallScoreMustMatchAverage: true,
  responsesCannotBeEmpty: true,
  noNegativeScores: true,
  noScoresOver100: true,
};

const ADMIN_EMAIL_RECIPIENTS = ['admin@constancia.io', 'support@constancia.io'];

// ============================================
// VALIDATION RESULT TYPES
// ============================================

export interface JourneyValidationIssue {
  layer: 1 | 2 | 3 | 4 | 5 | 6;
  severity: 'critical' | 'error' | 'warning' | 'info';
  code: string;
  message: string;
  field?: string;
  currentValue?: unknown;
  expectedValue?: unknown;
  autoFixable: boolean;
  autoFixed: boolean;
  fixDescription?: string;
}

export interface JourneyValidationResult {
  stage: JourneyStage;
  assessmentId: string;
  isValid: boolean;
  totalIssues: number;
  criticalIssues: number;
  autoFixedCount: number;
  issues: JourneyValidationIssue[];
  dimensionScores: Record<string, number>;
  calculatedOverallScore: number;
  storedOverallScore: number;
  dataCompleteness: {
    totalQuestions: number;
    answeredQuestions: number;
    missingRequired: string[];
    completionPercent: number;
  };
  aiAnalysis?: {
    confidence: number;
    anomaliesDetected: string[];
    recommendation: 'proceed' | 'review' | 'block';
  };
  processingTimeMs: number;
  adminReportSent: boolean;
}

export interface AutoFixResult {
  field: string;
  previousValue: unknown;
  newValue: unknown;
  fixType: 'score_recalculation' | 'missing_data_default' | 'boundary_correction' | 'dimension_normalization';
  appliedToDatabase: boolean;
}

// ============================================
// LAYER 1: DATA COMPLETENESS CHECK
// ============================================

function validateDataCompleteness(
  stage: JourneyStage,
  responses: FcResponse[],
  questions: QuestionDefinition[]
): { issues: JourneyValidationIssue[]; completeness: JourneyValidationResult['dataCompleteness'] } {
  const issues: JourneyValidationIssue[] = [];
  const requirements = STAGE_QUESTION_REQUIREMENTS[stage];
  
  const stageQuestions = questions.filter(q => q.tier === requirements.tier);
  const answeredIds = new Set(responses.map(r => r.questionId));
  
  const missingRequired = requirements.required.filter(qId => !answeredIds.has(qId));
  
  for (const missing of missingRequired) {
    issues.push({
      layer: 1,
      severity: 'critical',
      code: 'MISSING_REQUIRED_QUESTION',
      message: `Required question "${missing}" has no response`,
      field: missing,
      autoFixable: false,
      autoFixed: false,
    });
  }
  
  if (responses.length < requirements.minQuestions) {
    issues.push({
      layer: 1,
      severity: 'error',
      code: 'INSUFFICIENT_RESPONSES',
      message: `Stage "${stage}" requires at least ${requirements.minQuestions} responses, found ${responses.length}`,
      currentValue: responses.length,
      expectedValue: requirements.minQuestions,
      autoFixable: false,
      autoFixed: false,
    });
  }
  
  for (const response of responses) {
    if (response.response === null || response.response === undefined || 
        (typeof response.response === 'string' && response.response.trim() === '')) {
      issues.push({
        layer: 1,
        severity: 'warning',
        code: 'EMPTY_RESPONSE',
        message: `Response for question "${response.questionId}" is empty`,
        field: response.questionId,
        currentValue: response.response,
        autoFixable: false,
        autoFixed: false,
      });
    }
  }
  
  const completionPercent = stageQuestions.length > 0 
    ? Math.round((responses.length / stageQuestions.length) * 100) 
    : 0;
  
  return {
    issues,
    completeness: {
      totalQuestions: stageQuestions.length,
      answeredQuestions: responses.length,
      missingRequired,
      completionPercent,
    },
  };
}

// ============================================
// LAYER 2: SCORING ACCURACY VALIDATION
// ============================================

function validateScoringAccuracy(
  assessment: Partial<FcAssessment>,
  responses: FcResponse[],
  questions: QuestionDefinition[]
): { issues: JourneyValidationIssue[]; calculatedDimensions: Record<string, number>; calculatedOverall: number } {
  const issues: JourneyValidationIssue[] = [];
  const calculatedDimensions: Record<string, number[]> = {};
  
  for (const response of responses) {
    const question = questions.find(q => q.id === response.questionId) || getQuestionById(response.questionId);
    if (!question) continue;
    
    const scoreResult = calculateQuestionScore(response.questionId, response.response, question);
    const dimension = question.dimension;
    
    if (dimension && dimension !== 'qualification') {
      if (!calculatedDimensions[dimension]) {
        calculatedDimensions[dimension] = [];
      }
      const normalizedScore = scoreResult.normalizedScore * 100;
      
      if (isNaN(normalizedScore)) {
        issues.push({
          layer: 2,
          severity: 'error',
          code: 'NAN_SCORE',
          message: `Score calculation returned NaN for question "${response.questionId}"`,
          field: response.questionId,
          currentValue: normalizedScore,
          autoFixable: true,
          autoFixed: false,
          fixDescription: 'Replace NaN with 0',
        });
        calculatedDimensions[dimension].push(0);
      } else if (normalizedScore < DIMENSION_SCORE_BOUNDS.min) {
        issues.push({
          layer: 2,
          severity: 'warning',
          code: 'SCORE_BELOW_MIN',
          message: `Score ${normalizedScore} for "${response.questionId}" is below minimum (${DIMENSION_SCORE_BOUNDS.min})`,
          field: response.questionId,
          currentValue: normalizedScore,
          expectedValue: DIMENSION_SCORE_BOUNDS.min,
          autoFixable: true,
          autoFixed: false,
          fixDescription: `Clamp to ${DIMENSION_SCORE_BOUNDS.min}`,
        });
        calculatedDimensions[dimension].push(DIMENSION_SCORE_BOUNDS.min);
      } else if (normalizedScore > DIMENSION_SCORE_BOUNDS.max) {
        issues.push({
          layer: 2,
          severity: 'warning',
          code: 'SCORE_ABOVE_MAX',
          message: `Score ${normalizedScore} for "${response.questionId}" is above maximum (${DIMENSION_SCORE_BOUNDS.max})`,
          field: response.questionId,
          currentValue: normalizedScore,
          expectedValue: DIMENSION_SCORE_BOUNDS.max,
          autoFixable: true,
          autoFixed: false,
          fixDescription: `Clamp to ${DIMENSION_SCORE_BOUNDS.max}`,
        });
        calculatedDimensions[dimension].push(DIMENSION_SCORE_BOUNDS.max);
      } else {
        calculatedDimensions[dimension].push(normalizedScore);
      }
    }
  }
  
  const finalDimensionScores: Record<string, number> = {};
  for (const [dim, scores] of Object.entries(calculatedDimensions)) {
    if (scores.length > 0) {
      finalDimensionScores[dim] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }
  
  const storedDimensions = (assessment.dimensionScores || {}) as Record<string, number>;
  for (const [dim, calculated] of Object.entries(finalDimensionScores)) {
    const stored = storedDimensions[dim];
    if (stored !== undefined && Math.abs(stored - calculated) > OVERALL_SCORE_TOLERANCE) {
      issues.push({
        layer: 2,
        severity: 'error',
        code: 'DIMENSION_SCORE_MISMATCH',
        message: `Dimension "${dim}" stored score (${stored}) differs from calculated (${calculated})`,
        field: dim,
        currentValue: stored,
        expectedValue: calculated,
        autoFixable: true,
        autoFixed: false,
        fixDescription: `Update dimension score to ${calculated}`,
      });
    }
  }
  
  const calculatedOverall = Object.values(finalDimensionScores).length > 0
    ? Math.round(Object.values(finalDimensionScores).reduce((a, b) => a + b, 0) / Object.values(finalDimensionScores).length)
    : 0;
  
  const storedOverall = assessment.overallMaturityScore ?? 0;
  if (Math.abs(storedOverall - calculatedOverall) > OVERALL_SCORE_TOLERANCE) {
    issues.push({
      layer: 2,
      severity: 'error',
      code: 'OVERALL_SCORE_MISMATCH',
      message: `Overall score stored (${storedOverall}) differs from calculated (${calculatedOverall})`,
      field: 'overallMaturityScore',
      currentValue: storedOverall,
      expectedValue: calculatedOverall,
      autoFixable: true,
      autoFixed: false,
      fixDescription: `Update overall score to ${calculatedOverall}`,
    });
  }
  
  return { issues, calculatedDimensions: finalDimensionScores, calculatedOverall };
}

// ============================================
// LAYER 3: CONTEXT VALIDATION
// ============================================

function validateContext(
  responses: FcResponse[],
  dimensionScores: Record<string, number>
): JourneyValidationIssue[] {
  const issues: JourneyValidationIssue[] = [];
  
  const responseMap = new Map(responses.map(r => [r.questionId, r.response]));
  
  const companySize = responseMap.get('q1_company_size') as string | undefined;
  const annualRevenue = responseMap.get('q1_annual_revenue') as string | undefined;
  
  if (companySize && annualRevenue) {
    const sizeMismatch = checkSizeRevenueMismatch(companySize, annualRevenue);
    if (sizeMismatch) {
      issues.push({
        layer: 3,
        severity: 'warning',
        code: 'SIZE_REVENUE_MISMATCH',
        message: sizeMismatch,
        field: 'q1_company_size,q1_annual_revenue',
        autoFixable: false,
        autoFixed: false,
      });
    }
  }
  
  const scores = Object.values(dimensionScores);
  if (scores.length >= 2) {
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const variance = maxScore - minScore;
    
    if (variance > ANOMALY_SCORE_VARIANCE_THRESHOLD) {
      issues.push({
        layer: 3,
        severity: 'info',
        code: 'HIGH_SCORE_VARIANCE',
        message: `High variance in dimension scores (${variance} points between highest and lowest)`,
        currentValue: variance,
        expectedValue: `<= ${ANOMALY_SCORE_VARIANCE_THRESHOLD}`,
        autoFixable: false,
        autoFixed: false,
      });
    }
  }
  
  const techScore = dimensionScores['technology_systems'] ?? 0;
  const aiScore = dimensionScores['ai_machine_learning'] ?? 0;
  if (aiScore > techScore + 30) {
    issues.push({
      layer: 3,
      severity: 'warning',
      code: 'AI_TECH_IMBALANCE',
      message: `AI/ML score (${aiScore}) is unusually high compared to Technology Systems (${techScore})`,
      autoFixable: false,
      autoFixed: false,
    });
  }
  
  return issues;
}

function checkSizeRevenueMismatch(size: string, revenue: string): string | null {
  const sizeRevenueMap: Record<string, string[]> = {
    'under_50m': ['under_10m', '10m_50m'],
    '50m_250m': ['10m_50m', '50m_250m'],
    '250m_500m': ['50m_250m', '250m_500m'],
    '500m_1b': ['250m_500m', '500m_1b'],
    '1b_5b': ['500m_1b', '1b_5b'],
    '5b_plus': ['1b_5b', '5b_plus'],
  };
  
  const expectedRevenues = sizeRevenueMap[size];
  if (expectedRevenues && !expectedRevenues.includes(revenue)) {
    return `Company size "${size}" typically doesn't align with revenue "${revenue}"`;
  }
  return null;
}

// ============================================
// LAYER 4: AI ANOMALY DETECTION (STRICT GUARDRAILS)
// ============================================

async function detectAnomalies(
  assessment: Partial<FcAssessment>,
  responses: FcResponse[],
  existingIssues: JourneyValidationIssue[]
): Promise<{ confidence: number; anomalies: string[]; recommendation: 'proceed' | 'review' | 'block' }> {
  
  const STRICT_SYSTEM_PROMPT = `You are a STRICT data validation system for FinanceCompass assessments.
Your ONLY job is to detect data anomalies. You must NOT:
- Make creative suggestions
- Provide business advice
- Generate marketing content
- Discuss topics outside data validation

STRICT RULES:
1. Only analyze the exact data provided
2. Only flag issues that are mathematically or logically verifiable
3. Use ONLY these anomaly codes:
   - SCORE_INCONSISTENCY: Scores don't follow expected patterns
   - DATA_OUTLIER: Values are statistical outliers
   - RESPONSE_CONTRADICTION: Conflicting answers detected
   - MISSING_CORRELATION: Expected correlations not present
4. Confidence must be 0-100 based on data quality
5. Recommendation: "proceed" (>80 confidence), "review" (50-80), "block" (<50)

Respond ONLY in this exact JSON format:
{
  "confidence": <number 0-100>,
  "anomalies": ["<ANOMALY_CODE>: <brief description>"],
  "recommendation": "proceed" | "review" | "block"
}`;

  const userPrompt = `Validate this assessment data:
Assessment ID: ${assessment.id}
Status: ${assessment.status}
Tier: ${assessment.tier}
Overall Score: ${assessment.overallMaturityScore}
Dimension Scores: ${JSON.stringify(assessment.dimensionScores || {})}
Total Responses: ${responses.length}
Existing Issues Found: ${existingIssues.length}
Critical Issues: ${existingIssues.filter(i => i.severity === 'critical').length}

Analyze for anomalies ONLY. No advice or suggestions.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: STRICT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: AI_TEMPERATURE,
      max_tokens: AI_MAX_TOKENS,
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { confidence: 50, anomalies: ['AI_NO_RESPONSE'], recommendation: 'review' };
    }
    
    const result = JSON.parse(content) as { confidence: number; anomalies: string[]; recommendation: 'proceed' | 'review' | 'block' };
    
    result.confidence = Math.max(0, Math.min(100, Math.round(result.confidence)));
    result.anomalies = (result.anomalies || []).slice(0, 10);
    
    if (!['proceed', 'review', 'block'].includes(result.recommendation)) {
      result.recommendation = result.confidence >= 80 ? 'proceed' : result.confidence >= 50 ? 'review' : 'block';
    }
    
    return result;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "AI anomaly detection error");
    return { confidence: 50, anomalies: ['AI_ERROR: Validation service unavailable'], recommendation: 'review' };
  }
}

// ============================================
// LAYER 5: AUTO-FIX ENGINE
// ============================================

async function applyAutoFixes(
  assessmentId: string,
  issues: JourneyValidationIssue[],
  calculatedDimensions: Record<string, number>,
  calculatedOverall: number
): Promise<{ fixes: AutoFixResult[]; updatedIssues: JourneyValidationIssue[] }> {
  const fixes: AutoFixResult[] = [];
  const updatedIssues = [...issues];
  
  const fixableIssues = issues.filter(i => i.autoFixable && !i.autoFixed);
  
  if (fixableIssues.length === 0) {
    return { fixes, updatedIssues };
  }
  
  const dimensionFixes: Record<string, number> = {};
  let overallFix: number | null = null;
  
  for (const issue of fixableIssues) {
    if (issue.code === 'DIMENSION_SCORE_MISMATCH' && issue.field && issue.expectedValue !== undefined) {
      dimensionFixes[issue.field] = issue.expectedValue as number;
      fixes.push({
        field: issue.field,
        previousValue: issue.currentValue,
        newValue: issue.expectedValue,
        fixType: 'score_recalculation',
        appliedToDatabase: false,
      });
    } else if (issue.code === 'OVERALL_SCORE_MISMATCH' && issue.expectedValue !== undefined) {
      overallFix = issue.expectedValue as number;
      fixes.push({
        field: 'overallMaturityScore',
        previousValue: issue.currentValue,
        newValue: issue.expectedValue,
        fixType: 'score_recalculation',
        appliedToDatabase: false,
      });
    } else if (issue.code === 'NAN_SCORE' || issue.code === 'SCORE_BELOW_MIN' || issue.code === 'SCORE_ABOVE_MAX') {
      fixes.push({
        field: issue.field || 'unknown',
        previousValue: issue.currentValue,
        newValue: issue.code === 'SCORE_ABOVE_MAX' ? DIMENSION_SCORE_BOUNDS.max : DIMENSION_SCORE_BOUNDS.min,
        fixType: 'boundary_correction',
        appliedToDatabase: false,
      });
    }
    
    const idx = updatedIssues.findIndex(i => i === issue);
    if (idx !== -1) {
      updatedIssues[idx] = { ...updatedIssues[idx], autoFixed: true };
    }
  }
  
  if (Object.keys(dimensionFixes).length > 0 || overallFix !== null) {
    try {
      const updateData: Partial<FcAssessment> = {};
      
      if (Object.keys(dimensionFixes).length > 0) {
        const currentAssessment = await fcStorage.getAssessmentById(assessmentId);
        if (currentAssessment) {
          const existingScores = (currentAssessment.dimensionScores || {}) as Record<string, number>;
          updateData.dimensionScores = {
            ...existingScores,
            ...dimensionFixes,
          };
        }
      }
      
      if (overallFix !== null) {
        updateData.overallMaturityScore = overallFix;
      }
      
      if (Object.keys(updateData).length > 0) {
        await fcStorage.updateAssessment(assessmentId, updateData as any);
        fixes.forEach(f => f.appliedToDatabase = true);
        log.info({ fixCount: fixes.length, assessmentId }, "Applied auto-fixes to assessment");
      }
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Auto-fix database update failed");
    }
  }
  
  return { fixes, updatedIssues };
}

// ============================================
// LAYER 6: ADMIN ERROR REPORTING
// ============================================

async function sendAdminErrorReport(
  validationResult: JourneyValidationResult,
  assessment: Partial<FcAssessment>
): Promise<boolean> {
  const criticalIssues = validationResult.issues.filter(i => i.severity === 'critical' || i.severity === 'error');
  
  if (criticalIssues.length === 0 && (validationResult.aiAnalysis?.recommendation !== 'block')) {
    return false;
  }
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #02205B, #0884AA); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9f9f9; }
    .issue { margin: 10px 0; padding: 12px; border-radius: 6px; }
    .critical { background: #fee2e2; border-left: 4px solid #dc2626; }
    .error { background: #fef3c7; border-left: 4px solid #d97706; }
    .warning { background: #e0f2fe; border-left: 4px solid #0284c7; }
    .code-suggestion { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; margin: 15px 0; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .metric { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-value { font-size: 24px; font-weight: bold; color: #02205B; }
    .metric-label { font-size: 12px; color: #666; }
    .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FinanceCompass Validation Alert</h1>
    <p>Assessment ID: ${escapeHtml(validationResult.assessmentId)}</p>
    <p>Stage: ${escapeHtml(validationResult.stage)} | Generated: ${new Date().toISOString()}</p>
  </div>
  
  <div class="content">
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${validationResult.totalIssues}</div>
        <div class="metric-label">Total Issues</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #dc2626;">${validationResult.criticalIssues}</div>
        <div class="metric-label">Critical Issues</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #059669;">${validationResult.autoFixedCount}</div>
        <div class="metric-label">Auto-Fixed</div>
      </div>
    </div>
    
    <h2>Issues Requiring Attention</h2>
    ${criticalIssues.map(issue => `
      <div class="issue ${escapeHtml(issue.severity)}">
        <strong>[Layer ${escapeHtml(String(issue.layer))}] ${escapeHtml(issue.code)}</strong>
        <p>${escapeHtml(issue.message)}</p>
        ${issue.field ? `<p><em>Field:</em> ${escapeHtml(issue.field)}</p>` : ''}
        ${issue.currentValue !== undefined ? `<p><em>Current:</em> ${escapeHtml(JSON.stringify(issue.currentValue))}</p>` : ''}
        ${issue.expectedValue !== undefined ? `<p><em>Expected:</em> ${escapeHtml(JSON.stringify(issue.expectedValue))}</p>` : ''}
        ${issue.autoFixed ? '<p style="color: green;">Auto-fixed</p>' : ''}
      </div>
    `).join('')}
    
    ${validationResult.aiAnalysis?.anomaliesDetected && validationResult.aiAnalysis.anomaliesDetected.length > 0 ? `
      <h2>AI-Detected Anomalies</h2>
      <ul>
        ${validationResult.aiAnalysis.anomaliesDetected.map((a: string) => `<li>${escapeHtml(a)}</li>`).join('')}
      </ul>
      <p><strong>AI Confidence:</strong> ${escapeHtml(String(validationResult.aiAnalysis.confidence))}%</p>
      <p><strong>Recommendation:</strong> ${escapeHtml(validationResult.aiAnalysis.recommendation.toUpperCase())}</p>
    ` : ''}
    
    <h2>Suggested Code Updates</h2>
    <div class="code-suggestion">
<pre>
// Potential fixes for assessment: ${validationResult.assessmentId}

${criticalIssues.filter(i => i.code === 'DIMENSION_SCORE_MISMATCH').map(issue => `
// Fix dimension score mismatch for "${issue.field}"
await storage.fcAssessments.update("${validationResult.assessmentId}", {
  dimensionScores: {
    ...existingScores,
    "${issue.field}": ${issue.expectedValue}
  }
});
`).join('\n')}

${criticalIssues.some(i => i.code === 'OVERALL_SCORE_MISMATCH') ? `
// Fix overall score mismatch
await storage.fcAssessments.update("${validationResult.assessmentId}", {
  overallMaturityScore: ${validationResult.calculatedOverallScore}
});
` : ''}

// Force recalculation endpoint:
// POST /api/finance-compass/admin/assessments/${validationResult.assessmentId}/recalculate
</pre>
    </div>
    
    <h2>Assessment Data Summary</h2>
    <p><strong>Tier:</strong> ${assessment.tier}</p>
    <p><strong>Status:</strong> ${assessment.status}</p>
    <p><strong>Stored Overall Score:</strong> ${validationResult.storedOverallScore}</p>
    <p><strong>Calculated Overall Score:</strong> ${validationResult.calculatedOverallScore}</p>
    <p><strong>Completion:</strong> ${validationResult.dataCompleteness.completionPercent}%</p>
    <p><strong>Processing Time:</strong> ${validationResult.processingTimeMs}ms</p>
  </div>
  
  <div class="footer">
    <p>This is an automated message from the FinanceCompass Validation System</p>
    <p>© 2026 Constancia Ltd. All rights reserved.</p>
  </div>
</body>
</html>`;

  try {
    for (const recipient of ADMIN_EMAIL_RECIPIENTS) {
      await sendEmailViaGraph({
        to: recipient,
        subject: `[ALERT] FinanceCompass Validation Issues - ${validationResult.assessmentId}`,
        htmlContent,
      });
    }
    log.info({ assessmentId: validationResult.assessmentId }, "Admin error report sent");
    return true;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to send admin error report");
    return false;
  }
}

// ============================================
// MAIN VALIDATION ORCHESTRATOR
// ============================================

export async function validateJourneyStage(
  assessmentId: string,
  stage: JourneyStage,
  options: {
    runAIAnalysis?: boolean;
    applyAutoFixes?: boolean;
    sendAdminReport?: boolean;
  } = {}
): Promise<JourneyValidationResult> {
  const startTime = Date.now();
  const { runAIAnalysis = true, applyAutoFixes: shouldAutoFix = true, sendAdminReport = true } = options;
  
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    return {
      stage,
      assessmentId,
      isValid: false,
      totalIssues: 1,
      criticalIssues: 1,
      autoFixedCount: 0,
      issues: [{
        layer: 1,
        severity: 'critical',
        code: 'ASSESSMENT_NOT_FOUND',
        message: `Assessment "${assessmentId}" not found in database`,
        autoFixable: false,
        autoFixed: false,
      }],
      dimensionScores: {},
      calculatedOverallScore: 0,
      storedOverallScore: 0,
      dataCompleteness: { totalQuestions: 0, answeredQuestions: 0, missingRequired: [], completionPercent: 0 },
      processingTimeMs: Date.now() - startTime,
      adminReportSent: false,
    };
  }
  
  const responses = await fcStorage.getResponsesByAssessmentId(assessmentId);
  const questions = ALL_QUESTIONS;
  
  let allIssues: JourneyValidationIssue[] = [];
  
  const { issues: completenessIssues, completeness } = validateDataCompleteness(stage, responses, questions);
  allIssues.push(...completenessIssues);
  
  const { issues: scoringIssues, calculatedDimensions, calculatedOverall } = validateScoringAccuracy(
    assessment,
    responses,
    questions
  );
  allIssues.push(...scoringIssues);
  
  const contextIssues = validateContext(responses, calculatedDimensions);
  allIssues.push(...contextIssues);
  
  let aiAnalysis: JourneyValidationResult['aiAnalysis'] | undefined;
  if (runAIAnalysis) {
    const aiResult = await detectAnomalies(assessment, responses, allIssues);
    aiAnalysis = {
      confidence: aiResult.confidence,
      anomaliesDetected: aiResult.anomalies,
      recommendation: aiResult.recommendation,
    };
    
    for (const anomaly of aiResult.anomalies) {
      allIssues.push({
        layer: 4,
        severity: 'info',
        code: 'AI_ANOMALY',
        message: anomaly,
        autoFixable: false,
        autoFixed: false,
      });
    }
  }
  
  let autoFixedCount = 0;
  if (shouldAutoFix) {
    const { fixes, updatedIssues } = await applyAutoFixes(assessmentId, allIssues, calculatedDimensions, calculatedOverall);
    allIssues = updatedIssues;
    autoFixedCount = fixes.filter(f => f.appliedToDatabase).length;
  }
  
  const criticalCount = allIssues.filter(i => i.severity === 'critical' || i.severity === 'error').length;
  const isValid = criticalCount === 0 && (aiAnalysis?.recommendation !== 'block');
  
  const result: JourneyValidationResult = {
    stage,
    assessmentId,
    isValid,
    totalIssues: allIssues.length,
    criticalIssues: criticalCount,
    autoFixedCount,
    issues: allIssues,
    dimensionScores: calculatedDimensions,
    calculatedOverallScore: calculatedOverall,
    storedOverallScore: assessment.overallMaturityScore ?? 0,
    dataCompleteness: completeness,
    aiAnalysis,
    processingTimeMs: Date.now() - startTime,
    adminReportSent: false,
  };
  
  if (sendAdminReport && (criticalCount > 0 || aiAnalysis?.recommendation === 'block')) {
    result.adminReportSent = await sendAdminErrorReport(result, assessment);
  }
  
  return result;
}

// ============================================
// STAGE TRANSITION VALIDATION
// ============================================

export function getStageQuestionRequirements() {
  return STAGE_QUESTION_REQUIREMENTS;
}

export function getExpectedQuestionCounts(): Record<string, number> {
  return {
    registration: 14,
    pre_assessment: 50,
    full: 74,
    report: 124, // pre_assessment + full combined
  };
}

export async function canTransitionToStage(
  assessmentId: string,
  targetStage: JourneyStage
): Promise<{ canTransition: boolean; blockers: string[]; currentCompletion: number; requiredCompletion: number }> {
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    return { canTransition: false, blockers: ['Assessment not found'], currentCompletion: 0, requiredCompletion: 0 };
  }
  
  const responses = await fcStorage.getResponsesByAssessmentId(assessmentId);
  const blockers: string[] = [];
  
  const stageOrder: JourneyStage[] = ['registration', 'pre_assessment', 'roi', 'full', 'report'];
  const currentTier = assessment.tier as JourneyStage;
  const currentIndex = stageOrder.indexOf(currentTier);
  const targetIndex = stageOrder.indexOf(targetStage);
  
  if (targetIndex <= currentIndex && targetStage !== 'roi') {
    blockers.push(`Cannot transition backwards from ${currentTier} to ${targetStage}`);
  }
  
  const requirements = STAGE_QUESTION_REQUIREMENTS[currentTier];
  const tierResponses = responses.filter(r => {
    const q = ALL_QUESTIONS.find(q => q.id === r.questionId);
    return q && q.tier === requirements.tier;
  });
  
  const currentCompletion = tierResponses.length;
  const requiredCompletion = requirements.minQuestions;
  
  if (currentCompletion < requiredCompletion) {
    blockers.push(`Current stage "${currentTier}" requires ${requiredCompletion} questions, only ${currentCompletion} answered`);
  }
  
  for (const reqId of requirements.required) {
    const hasResponse = responses.some(r => r.questionId === reqId);
    if (!hasResponse) {
      blockers.push(`Required question "${reqId}" is not answered`);
    }
  }
  
  if (targetStage === 'full' && currentTier !== 'pre_assessment') {
    blockers.push('Must complete pre_assessment before starting full assessment');
  }
  
  if (targetStage === 'report') {
    const preResponses = responses.filter(r => {
      const q = ALL_QUESTIONS.find(q => q.id === r.questionId);
      return q && q.tier === 'pre_assessment';
    });
    const fullResponses = responses.filter(r => {
      const q = ALL_QUESTIONS.find(q => q.id === r.questionId);
      return q && q.tier === 'full';
    });
    
    if (preResponses.length < 50) {
      blockers.push(`Report requires all 50 pre-assessment questions, only ${preResponses.length} answered`);
    }
    if (fullResponses.length < 74) {
      blockers.push(`Report requires all 74 full assessment questions, only ${fullResponses.length} answered`);
    }
  }
  
  return {
    canTransition: blockers.length === 0,
    blockers,
    currentCompletion,
    requiredCompletion,
  };
}

export async function validateStageTransition(
  assessmentId: string,
  fromStage: JourneyStage,
  toStage: JourneyStage
): Promise<JourneyValidationResult> {
  const currentValidation = await validateJourneyStage(assessmentId, fromStage, {
    runAIAnalysis: true,
    applyAutoFixes: true,
    sendAdminReport: true,
  });
  
  if (!currentValidation.isValid) {
    return currentValidation;
  }
  
  const transitionCheck = await canTransitionToStage(assessmentId, toStage);
  if (!transitionCheck.canTransition) {
    return {
      ...currentValidation,
      isValid: false,
      issues: [
        ...currentValidation.issues,
        ...transitionCheck.blockers.map(blocker => ({
          layer: 1 as const,
          severity: 'critical' as const,
          code: 'TRANSITION_BLOCKED',
          message: blocker,
          autoFixable: false,
          autoFixed: false,
        })),
      ],
      totalIssues: currentValidation.totalIssues + transitionCheck.blockers.length,
      criticalIssues: currentValidation.criticalIssues + transitionCheck.blockers.length,
    };
  }
  
  return currentValidation;
}

// ============================================
// SCORE INTEGRITY CHECK (Lightweight Validation for View Endpoints)
// ============================================

export interface ScoreIntegrityResult {
  wasRepaired: boolean;
  issues: JourneyValidationIssue[];
  correctedOverallScore: number;
  correctedDimensionScores: Record<string, number>;
  originalOverallScore: number;
  originalDimensionScores: Record<string, number>;
}

/**
 * Lightweight score integrity check for view endpoints.
 * Detects and auto-fixes stale overall scores without running full validation.
 * 
 * Use this in view endpoints to ensure scores are always correct without
 * the overhead of full AI validation.
 * 
 * @param assessment - The assessment to check
 * @param options - Configuration options
 * @returns Score integrity result with corrected values
 */
export async function ensureScoreIntegrity(
  assessment: FcAssessment,
  options: {
    applyDatabaseFix?: boolean;
    industryWeights?: Record<string, number>;
    computedDimensionScores?: Record<string, number>; // Use these instead of stored scores when provided
  } = {}
): Promise<ScoreIntegrityResult> {
  const { applyDatabaseFix = true, industryWeights, computedDimensionScores } = options;
  
  const issues: JourneyValidationIssue[] = [];
  let wasRepaired = false;
  
  const storedOverall = assessment.overallMaturityScore ?? 0;
  const storedDimensions = (assessment.dimensionScores || {}) as Record<string, number>;
  
  // Use computed dimension scores if provided (e.g., from response recalculation)
  // Fall back to stored scores otherwise
  const effectiveDimensions = computedDimensionScores && Object.keys(computedDimensionScores).length > 0
    ? computedDimensionScores
    : storedDimensions;
  const dimensionValues = Object.values(effectiveDimensions).filter(v => typeof v === 'number' && !isNaN(v));
  
  let correctedOverall = storedOverall;
  const correctedDimensions = { ...storedDimensions };
  
  // Check for stale overall score: 0 but dimension scores exist
  if (storedOverall === 0 && dimensionValues.length > 0) {
    // Calculate correct overall score using effective dimension scores
    if (industryWeights && Object.keys(industryWeights).length > 0) {
      // Industry-weighted calculation
      let weightedSum = 0;
      let totalWeight = 0;
      for (const [dim, score] of Object.entries(effectiveDimensions)) {
        const weight = industryWeights[dim] || 1;
        weightedSum += score * weight;
        totalWeight += weight;
      }
      correctedOverall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    } else {
      // Simple average
      correctedOverall = Math.round(dimensionValues.reduce((a, b) => a + b, 0) / dimensionValues.length);
    }
    
    issues.push({
      layer: 2,
      severity: 'error',
      code: 'STALE_OVERALL_SCORE',
      message: `Overall score was 0 but ${dimensionValues.length} dimension scores exist. Recalculated to ${correctedOverall}.`,
      field: 'overallMaturityScore',
      currentValue: storedOverall,
      expectedValue: correctedOverall,
      autoFixable: true,
      autoFixed: applyDatabaseFix,
      fixDescription: `Recalculated overall score from dimension scores: ${correctedOverall}`,
    });
    
    wasRepaired = true;
    
    // Apply database fix if requested
    if (applyDatabaseFix) {
      try {
        // Preserve existing epmReadinessScore if it has a valid value, otherwise use corrected overall
        const newEpmReadinessScore = (assessment.epmReadinessScore && assessment.epmReadinessScore > 0)
          ? assessment.epmReadinessScore
          : correctedOverall;
        
        await fcStorage.updateAssessment(assessment.id, {
          overallMaturityScore: correctedOverall,
          epmReadinessScore: newEpmReadinessScore,
        });
        log.info({ assessmentId: assessment.id, correctedOverall }, "Fixed stale overall score");
      } catch (error) {
        log.error({ err: error instanceof Error ? error : new Error(String(error)), assessmentId: assessment.id }, "Failed to update database");
        issues[0].autoFixed = false;
      }
    }
  }
  
  // Check for dimension scores outside valid range
  for (const [dim, score] of Object.entries(effectiveDimensions)) {
    if (score < DIMENSION_SCORE_BOUNDS.min) {
      issues.push({
        layer: 2,
        severity: 'warning',
        code: 'DIMENSION_BELOW_MIN',
        message: `Dimension "${dim}" score ${score} is below minimum ${DIMENSION_SCORE_BOUNDS.min}`,
        field: dim,
        currentValue: score,
        expectedValue: DIMENSION_SCORE_BOUNDS.min,
        autoFixable: true,
        autoFixed: false,
      });
      correctedDimensions[dim] = DIMENSION_SCORE_BOUNDS.min;
    } else if (score > DIMENSION_SCORE_BOUNDS.max) {
      issues.push({
        layer: 2,
        severity: 'warning',
        code: 'DIMENSION_ABOVE_MAX',
        message: `Dimension "${dim}" score ${score} is above maximum ${DIMENSION_SCORE_BOUNDS.max}`,
        field: dim,
        currentValue: score,
        expectedValue: DIMENSION_SCORE_BOUNDS.max,
        autoFixable: true,
        autoFixed: false,
      });
      correctedDimensions[dim] = DIMENSION_SCORE_BOUNDS.max;
    }
  }
  
  // Clamp overall score to valid range
  if (correctedOverall < DIMENSION_SCORE_BOUNDS.min) {
    correctedOverall = DIMENSION_SCORE_BOUNDS.min;
  } else if (correctedOverall > DIMENSION_SCORE_BOUNDS.max) {
    correctedOverall = DIMENSION_SCORE_BOUNDS.max;
  }
  
  return {
    wasRepaired,
    issues,
    correctedOverallScore: correctedOverall,
    correctedDimensionScores: correctedDimensions,
    originalOverallScore: storedOverall,
    originalDimensionScores: storedDimensions,
  };
}

export async function validateAllStages(assessmentId: string): Promise<Record<JourneyStage, JourneyValidationResult | null>> {
  const results: Record<JourneyStage, JourneyValidationResult | null> = {
    registration: null,
    pre_assessment: null,
    roi: null,
    full: null,
    report: null,
  };
  
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) return results;
  
  const stagesToValidate: JourneyStage[] = [];
  
  if (assessment.tier === 'registration') {
    stagesToValidate.push('registration');
  } else if (assessment.tier === 'pre_assessment') {
    stagesToValidate.push('pre_assessment');
  } else if (assessment.tier === 'full') {
    stagesToValidate.push('pre_assessment', 'full');
  }
  
  for (const stage of stagesToValidate) {
    results[stage] = await validateJourneyStage(assessmentId, stage);
  }
  
  return results;
}
