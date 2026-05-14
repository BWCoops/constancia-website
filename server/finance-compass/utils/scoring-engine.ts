import { getQuestionById, type QuestionDefinition, type MultiSelectScoringMode } from '../question-bank';

export interface ScoreResult {
  rawScore: number;
  maxPossible: number;
  normalizedScore: number;
  explanation: string;
  userResponseLabel?: string;
}

export interface VendorTierConfig {
  type: 'vendor_tier';
  vendorTiers: {
    tier1?: string[];
    tier2?: string[];
    specialist?: string[];
    legacy?: string[];
  };
  tierScores: {
    tier1: number;
    tier2: number;
    specialist: number;
    legacy: number;
    none: number;
    other: number;
  };
  vendorTierMode?: 'best_of' | 'fragmentation_penalty';
  fragmentationPenalty?: number;
  mixedTierPenalty?: number;
}

export interface RangeConfig {
  type: 'range';
  direction?: 'direct' | 'inverse';
  benchmarks: {
    leading: number;
    advanced: number;
    established: number;
    developing: number;
  };
}

export interface WeightsConfig {
  weights: Record<string, number>;
}

export function calculateQuestionScore(
  questionId: string,
  responseValue: unknown,
  questionDef?: QuestionDefinition
): ScoreResult {
  const qDef = questionDef || getQuestionById(questionId);
  
  if (!qDef) {
    return {
      rawScore: 0,
      maxPossible: 5,
      normalizedScore: 0,
      explanation: 'Question definition not found'
    };
  }

  const config = qDef.scoringConfig as any;
  const options = qDef.options || [];
  const questionType = qDef.questionType;

  if (responseValue === null || responseValue === undefined) {
    return {
      rawScore: 0,
      maxPossible: 5,
      normalizedScore: 0,
      explanation: 'No response provided'
    };
  }

  if (config?.type === 'vendor_tier') {
    return calculateVendorTierScore(responseValue, config, options);
  }

  if (config?.type === 'range' && typeof responseValue === 'number') {
    return calculateRangeScore(responseValue, config);
  }

  if (questionType === 'slider' || typeof responseValue === 'number') {
    return calculateSliderScore(responseValue, config);
  }

  if (config?.weights && typeof responseValue === 'string') {
    return calculateWeightedScore(responseValue, config, options);
  }

  if (Array.isArray(responseValue)) {
    const scoringMode = qDef.multiSelectScoringMode || 'average';
    return calculateMultiSelectScore(responseValue, scoringMode, options, config);
  }

  if (typeof responseValue === 'string' && options.length > 0) {
    return calculateSingleSelectScore(responseValue, options);
  }

  return {
    rawScore: 0,
    maxPossible: 5,
    normalizedScore: 0,
    explanation: 'Unknown response type'
  };
}

function calculateVendorTierScore(
  responseValue: unknown,
  config: VendorTierConfig,
  options: any[]
): ScoreResult {
  const tierScores = config.tierScores || { tier1: 5, tier2: 4, specialist: 3, legacy: 2, none: 1, other: 2 };
  const vendorTiers = config.vendorTiers || {};
  const scoringMode = (config as any).vendorTierMode || 'fragmentation_penalty';
  const fragmentationPenalty = (config as any).fragmentationPenalty ?? 0.5;
  const mixedTierPenalty = (config as any).mixedTierPenalty ?? 0.25;
  
  const values = Array.isArray(responseValue) ? responseValue : [responseValue];
  const selectedLabels: string[] = [];
  const tierCounts = { tier1: 0, tier2: 0, specialist: 0, legacy: 0, none: 0, other: 0 };
  let bestScore = tierScores.none || 1;
  
  for (const vendor of values) {
    if (typeof vendor !== 'string') continue;
    
    const vendorOption = options.find((opt: any) => opt.value === vendor);
    if (vendorOption) {
      selectedLabels.push(vendorOption.label);
    }
    
    if (vendor === 'none') {
      bestScore = Math.max(bestScore, tierScores.none || 1);
      tierCounts.none++;
    } else if (vendor === 'other') {
      bestScore = Math.max(bestScore, tierScores.other || 2);
      tierCounts.other++;
    } else if (vendorTiers.tier1?.includes(vendor)) {
      bestScore = Math.max(bestScore, tierScores.tier1 || 5);
      tierCounts.tier1++;
    } else if (vendorTiers.tier2?.includes(vendor)) {
      bestScore = Math.max(bestScore, tierScores.tier2 || 4);
      tierCounts.tier2++;
    } else if (vendorTiers.specialist?.includes(vendor)) {
      bestScore = Math.max(bestScore, tierScores.specialist || 3);
      tierCounts.specialist++;
    } else if (vendorTiers.legacy?.includes(vendor)) {
      bestScore = Math.max(bestScore, tierScores.legacy || 2);
      tierCounts.legacy++;
    }
  }
  
  const totalVendors = tierCounts.tier1 + tierCounts.tier2 + tierCounts.specialist + tierCounts.legacy + tierCounts.other;
  const distinctTiers = [tierCounts.tier1, tierCounts.tier2, tierCounts.specialist, tierCounts.legacy].filter(c => c > 0).length;
  
  let finalScore = bestScore;
  let explanation = '';
  
  if (scoringMode === 'fragmentation_penalty' && totalVendors > 1) {
    const extraVendorPenalty = (totalVendors - 1) * fragmentationPenalty;
    const tierMixPenalty = distinctTiers > 1 ? (distinctTiers - 1) * mixedTierPenalty : 0;
    const totalPenalty = extraVendorPenalty + tierMixPenalty;
    
    finalScore = Math.max(1, bestScore - totalPenalty);
    
    let tierLabel = 'Unknown tier';
    if (bestScore >= 5) tierLabel = 'Gartner Leader (Tier 1)';
    else if (bestScore >= 4) tierLabel = 'Challenger (Tier 2)';
    else if (bestScore >= 3) tierLabel = 'Specialist';
    else if (bestScore >= 2) tierLabel = 'Legacy/Other';
    else tierLabel = 'No EPM system';
    
    const penaltyDetails: string[] = [];
    if (extraVendorPenalty > 0) {
      penaltyDetails.push(`${totalVendors} systems: -${extraVendorPenalty.toFixed(1)} fragmentation`);
    }
    if (tierMixPenalty > 0) {
      penaltyDetails.push(`${distinctTiers} tiers mixed: -${tierMixPenalty.toFixed(2)}`);
    }
    
    explanation = `${tierLabel} base (${bestScore}/5)`;
    if (penaltyDetails.length > 0) {
      explanation += ` | ${penaltyDetails.join(', ')} → ${finalScore.toFixed(1)}/5`;
    }
  } else {
    let tierLabel = 'Unknown tier';
    if (bestScore >= 5) tierLabel = 'Gartner Leader (Tier 1)';
    else if (bestScore >= 4) tierLabel = 'Challenger (Tier 2)';
    else if (bestScore >= 3) tierLabel = 'Specialist';
    else if (bestScore >= 2) tierLabel = 'Legacy/Other';
    else tierLabel = 'No EPM system';
    
    explanation = `${tierLabel}: ${bestScore}/5 points`;
  }
  
  return {
    rawScore: Math.round(finalScore * 10) / 10,
    maxPossible: 5,
    normalizedScore: finalScore / 5,
    explanation,
    userResponseLabel: selectedLabels.join(', ') || 'Selected vendors'
  };
}

function calculateRangeScore(value: number, config: RangeConfig): ScoreResult {
  const benchmarks = config.benchmarks;
  const isDirectScoring = config.direction === 'direct';
  
  let score: number;
  let benchmarkLabel: string;
  
  if (isDirectScoring) {
    if (value >= benchmarks.leading) { score = 5; benchmarkLabel = 'Leading'; }
    else if (value >= benchmarks.advanced) { score = 4; benchmarkLabel = 'Advanced'; }
    else if (value >= benchmarks.established) { score = 3; benchmarkLabel = 'Established'; }
    else if (value >= benchmarks.developing) { score = 2; benchmarkLabel = 'Developing'; }
    else { score = 1; benchmarkLabel = 'Lagging'; }
  } else {
    if (value <= benchmarks.leading) { score = 5; benchmarkLabel = 'Leading'; }
    else if (value <= benchmarks.advanced) { score = 4; benchmarkLabel = 'Advanced'; }
    else if (value <= benchmarks.established) { score = 3; benchmarkLabel = 'Established'; }
    else if (value <= benchmarks.developing) { score = 2; benchmarkLabel = 'Developing'; }
    else { score = 1; benchmarkLabel = 'Lagging'; }
  }
  
  return {
    rawScore: score,
    maxPossible: 5,
    normalizedScore: score / 5,
    explanation: `${benchmarkLabel} benchmark: ${score}/5 points`,
    userResponseLabel: String(value)
  };
}

function calculateSliderScore(responseValue: unknown, config: any): ScoreResult {
  const numVal = typeof responseValue === 'number' ? responseValue : parseFloat(String(responseValue)) || 0;
  const maxVal = config?.max || config?.maxValue || 100;
  const minVal = config?.min || config?.minValue || 0;
  
  const rawScore = Math.min(5, Math.max(0, (numVal - minVal) / Math.max(1, (maxVal - minVal)) * 5));
  
  return {
    rawScore,
    maxPossible: 5,
    normalizedScore: rawScore / 5,
    explanation: `Value ${numVal} (scaled to ${rawScore.toFixed(1)}/5)`,
    userResponseLabel: String(numVal)
  };
}

function calculateWeightedScore(
  responseValue: string,
  config: WeightsConfig,
  options: any[]
): ScoreResult {
  const weights = config.weights;
  const weight = weights[responseValue] ?? 0;
  const rawScore = typeof weight === 'number' ? weight : parseFloat(String(weight)) || 0;
  
  const allWeights = Object.values(weights).map(v => typeof v === 'number' ? v : parseFloat(String(v)) || 0);
  const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : 5;
  
  const selectedOption = options.find((opt: any) => opt.value === responseValue);
  
  return {
    rawScore,
    maxPossible: maxWeight,
    normalizedScore: maxWeight > 0 ? rawScore / maxWeight : 0,
    explanation: `Weighted score: ${rawScore}/${maxWeight} points`,
    userResponseLabel: selectedOption?.label || responseValue
  };
}

function calculateMultiSelectScore(
  selectedValues: unknown[],
  scoringMode: MultiSelectScoringMode,
  options: any[],
  config: any
): ScoreResult {
  const selections = selectedValues.length;
  const totalOptions = options.length || 5;
  const weights = config?.weights as Record<string, number> | undefined;
  
  let sumSelectedWeights = 0;
  const selectedLabels: string[] = [];
  
  const maxSingleWeight = weights 
    ? Math.max(...Object.values(weights).filter(v => typeof v === 'number'))
    : totalOptions;
  
  for (const selectedValue of selectedValues) {
    if (typeof selectedValue !== 'string') continue;
    
    const option = options.find((opt: any) => opt.value === selectedValue);
    if (option) {
      selectedLabels.push(option.label);
    }
    
    if (weights) {
      sumSelectedWeights += weights[selectedValue] ?? 0;
    } else {
      const optionIndex = options.findIndex((opt: any) => opt.value === selectedValue);
      if (optionIndex >= 0) {
        sumSelectedWeights += optionIndex + 1;
      }
    }
  }
  
  let sumAllPossibleWeights = 0;
  if (weights) {
    sumAllPossibleWeights = Object.values(weights).reduce((sum, w) => sum + (typeof w === 'number' ? w : 0), 0);
  } else {
    sumAllPossibleWeights = (totalOptions * (totalOptions + 1)) / 2;
  }
  
  let rawScore: number;
  let explanation: string;
  
  switch (scoringMode) {
    case 'cumulative': {
      const pctEarned = sumAllPossibleWeights > 0 ? sumSelectedWeights / sumAllPossibleWeights : 0;
      rawScore = Math.round(pctEarned * 5 * 10) / 10;
      explanation = `${selections} items selected (more = higher maturity)`;
      break;
    }
    case 'penalty': {
      const highestSelectedWeight = weights
        ? Math.max(...selectedValues.map(v => typeof v === 'string' ? (weights[v] ?? 0) : 0))
        : Math.max(...selectedValues.map(v => {
            if (typeof v !== 'string') return 0;
            const idx = options.findIndex((opt: any) => opt.value === v);
            return idx >= 0 ? idx + 1 : 0;
          }));
      
      const penaltyPct = selections > 0 && maxSingleWeight > 0
        ? (highestSelectedWeight / selections) / maxSingleWeight
        : 0;
      rawScore = Math.round(penaltyPct * 5 * 10) / 10;
      explanation = `${selections} issue(s) selected (fewer = better)`;
      break;
    }
    case 'average':
    default: {
      const avgWeight = selections > 0 ? sumSelectedWeights / selections : 0;
      rawScore = maxSingleWeight > 0 ? Math.round((avgWeight / maxSingleWeight) * 5 * 10) / 10 : 0;
      explanation = `Average of ${selections} selections`;
      break;
    }
  }
  
  return {
    rawScore: Math.min(5, Math.max(0, rawScore)),
    maxPossible: 5,
    normalizedScore: Math.min(1, Math.max(0, rawScore / 5)),
    explanation,
    userResponseLabel: selectedLabels.slice(0, 3).join(', ') + (selectedLabels.length > 3 ? ` +${selectedLabels.length - 3} more` : '')
  };
}

function calculateSingleSelectScore(responseValue: string, options: any[]): ScoreResult {
  const optionIndex = options.findIndex((opt: any) => opt.value === responseValue);
  
  if (optionIndex < 0) {
    return {
      rawScore: 0,
      maxPossible: options.length,
      normalizedScore: 0,
      explanation: 'Option not found',
      userResponseLabel: responseValue
    };
  }
  
  const rawScore = optionIndex + 1;
  const maxPossible = options.length;
  
  return {
    rawScore,
    maxPossible,
    normalizedScore: rawScore / maxPossible,
    explanation: `Option ${optionIndex + 1} of ${options.length} (higher = better maturity)`,
    userResponseLabel: options[optionIndex].label
  };
}

export function calculateDimensionScoreFromResponses(
  responses: Record<string, unknown>,
  dimension: string
): { score: number; maxPossible: number; contributions: Array<{ questionId: string; contribution: number }> } {
  const { getAllQuestions } = require('../question-bank');
  const allQuestions = getAllQuestions();
  
  const dimensionQuestions = allQuestions.filter(
    (q: QuestionDefinition) => q.dimension === dimension
  );
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const contributions: Array<{ questionId: string; contribution: number }> = [];
  
  for (const qDef of dimensionQuestions) {
    const responseValue = responses[qDef.id];
    if (responseValue === undefined || responseValue === null) continue;
    
    const weight = qDef.questionWeight || 1;
    const result = calculateQuestionScore(qDef.id, responseValue, qDef);
    
    const weightedScore = result.normalizedScore * weight * 100;
    totalWeightedScore += weightedScore;
    totalWeight += weight;
    
    contributions.push({
      questionId: qDef.id,
      contribution: weightedScore
    });
  }
  
  const score = totalWeight > 0 ? Math.min(100, totalWeightedScore / totalWeight) : 0;
  
  return {
    score,
    maxPossible: 100,
    contributions
  };
}
