/**
 * Comparison Service
 * 
 * Pure business logic for vendor comparison.
 * No HTTP or database imports - this is domain logic only.
 */

import type { IComparisonService } from '../interfaces';
import {
  ComparisonType,
  DEFAULT_WEIGHTINGS,
} from '../types';
import type {
  Vendor,
  ComparisonCriteria,
  ComparisonResult,
  ScoringMatrix,
  ScoreBreakdown,
  ComparisonSummary,
} from '../types';
import { success, failure, ValidationError } from '../../types';
import type { Result } from '../../types';

export class ComparisonService implements IComparisonService {
  private vendors: Vendor[];

  constructor(vendors: Vendor[] = []) {
    this.vendors = vendors;
  }

  setVendors(vendors: Vendor[]): void {
    this.vendors = vendors;
  }

  async compare(
    vendorIds: string[],
    criteria: ComparisonCriteria
  ): Promise<Result<ComparisonResult>> {
    if (vendorIds.length === 0) {
      return failure(new ValidationError('At least one vendor ID is required'));
    }

    const selectedVendors = this.vendors.filter(v => vendorIds.includes(v.id));
    
    if (selectedVendors.length === 0) {
      return failure(new ValidationError('No valid vendors found for the provided IDs'));
    }

    return this.buildComparisonResult(selectedVendors, criteria);
  }

  async compareAll(
    type: ComparisonType,
    criteria: ComparisonCriteria
  ): Promise<Result<ComparisonResult>> {
    const vendorsOfType = this.vendors.filter(v => v.type === type);
    
    if (vendorsOfType.length === 0) {
      return failure(new ValidationError(`No vendors found for type: ${type}`));
    }

    return this.buildComparisonResult(vendorsOfType, criteria);
  }

  private buildComparisonResult(
    vendors: Vendor[],
    criteria: ComparisonCriteria
  ): Result<ComparisonResult> {
    const scores = new Map<string, ScoreBreakdown>();
    
    for (const vendor of vendors) {
      scores.set(vendor.id, this.score(vendor, criteria));
    }

    const scoringMatrix = this.rankVendors(vendors, scores, criteria);
    const { top, alternatives } = this.getRecommendations(scoringMatrix);
    const summary = this.generateComparisonSummary(vendors, scoringMatrix);

    const result: ComparisonResult = {
      id: this.generateId(),
      type: vendors[0]?.type || ComparisonType.EPM,
      criteria,
      vendors,
      scoringMatrix,
      topRecommendation: top,
      alternativeRecommendations: alternatives,
      generatedAt: new Date(),
      summary,
    };

    return success(result);
  }

  score(vendor: Vendor, criteria: ComparisonCriteria): ScoreBreakdown {
    return {
      cost: this.calculateCostScore(vendor, criteria),
      timeline: this.calculateTimelineScore(vendor, criteria),
      capabilities: this.calculateCapabilitiesScore(vendor, criteria),
      integration: this.calculateIntegrationScore(vendor, criteria),
      vendorFit: this.calculateVendorFitScore(vendor, criteria),
      userExperience: this.calculateUserExperienceScore(vendor, criteria),
    };
  }

  calculateOverallScore(
    breakdown: ScoreBreakdown,
    criteria: ComparisonCriteria
  ): number {
    const weightings = criteria.weightings || DEFAULT_WEIGHTINGS;
    
    const weightedScore = 
      breakdown.cost * weightings.cost +
      breakdown.timeline * weightings.timeline +
      breakdown.capabilities * weightings.capabilities +
      breakdown.integration * weightings.integration +
      breakdown.vendorFit * weightings.vendorFit +
      breakdown.userExperience * weightings.userExperience;

    return Math.round(weightedScore * 100) / 100;
  }

  rankVendors(
    vendors: Vendor[],
    scores: Map<string, ScoreBreakdown>,
    criteria: ComparisonCriteria
  ): ScoringMatrix[] {
    const matrix: ScoringMatrix[] = vendors.map(vendor => {
      const breakdown = scores.get(vendor.id) || this.score(vendor, criteria);
      const overallScore = this.calculateOverallScore(breakdown, criteria);
      
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        overallScore,
        breakdown,
        rank: 0,
        recommendation: this.determineRecommendation(overallScore),
        reasoning: this.generateReasoning(vendor, breakdown, criteria),
      };
    });

    matrix.sort((a, b) => b.overallScore - a.overallScore);
    
    matrix.forEach((item, index) => {
      item.rank = index + 1;
    });

    return matrix;
  }

  getRecommendations(scoringMatrix: ScoringMatrix[]): {
    top: ScoringMatrix | null;
    alternatives: ScoringMatrix[];
  } {
    if (scoringMatrix.length === 0) {
      return { top: null, alternatives: [] };
    }

    const sorted = [...scoringMatrix].sort((a, b) => b.overallScore - a.overallScore);
    const top = sorted[0];
    
    const alternatives = sorted
      .slice(1)
      .filter(s => s.recommendation === 'highly_recommended' || s.recommendation === 'recommended')
      .slice(0, 3);

    return { top, alternatives };
  }

  generateComparisonSummary(
    vendors: Vendor[],
    scoringMatrix: ScoringMatrix[]
  ): ComparisonSummary {
    const sorted = [...scoringMatrix].sort((a, b) => b.overallScore - a.overallScore);
    const scores = scoringMatrix.map(s => s.overallScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    const allStrengths = vendors.flatMap(v => v.strengths);
    const allConsiderations = vendors.flatMap(v => v.considerations);
    
    const strengthCounts = this.countOccurrences(allStrengths);
    const considerationCounts = this.countOccurrences(allConsiderations);

    const commonStrengths = Object.entries(strengthCounts)
      .filter(([_, count]) => count >= Math.ceil(vendors.length / 2))
      .map(([strength]) => strength)
      .slice(0, 5);

    const commonConsiderations = Object.entries(considerationCounts)
      .filter(([_, count]) => count >= Math.ceil(vendors.length / 2))
      .map(([consideration]) => consideration)
      .slice(0, 5);

    const keyDifferentiators = this.identifyDifferentiators(vendors, scoringMatrix);

    return {
      totalVendorsCompared: vendors.length,
      topVendorName: sorted[0]?.vendorName || null,
      topVendorScore: sorted[0]?.overallScore || null,
      averageScore: Math.round(avgScore * 100) / 100,
      scoringSpread: Math.round((maxScore - minScore) * 100) / 100,
      keyDifferentiators,
      commonStrengths,
      commonConsiderations,
    };
  }

  private calculateCostScore(vendor: Vendor, criteria: ComparisonCriteria): number {
    const costs = vendor.implementationCosts[criteria.organizationSize];
    const typicalCost = costs.typical || (costs.min + costs.max) / 2;
    
    if (criteria.budget) {
      const budgetMid = criteria.budget.typical || (criteria.budget.min + criteria.budget.max) / 2;
      
      if (typicalCost <= criteria.budget.min) {
        return 100;
      } else if (typicalCost >= criteria.budget.max * 1.5) {
        return 20;
      } else if (typicalCost <= budgetMid) {
        return 100 - ((typicalCost - criteria.budget.min) / (budgetMid - criteria.budget.min)) * 20;
      } else {
        return 80 - ((typicalCost - budgetMid) / (criteria.budget.max - budgetMid)) * 40;
      }
    }

    const tierScores: Record<string, number> = {
      specialist: 85,
      tier2: 75,
      tier1: 60,
    };
    
    return tierScores[vendor.tier] || 70;
  }

  private calculateTimelineScore(vendor: Vendor, criteria: ComparisonCriteria): number {
    const timeline = vendor.implementationTimeline[criteria.organizationSize];
    const typicalMonths = timeline.typical || (timeline.min + timeline.max) / 2;

    if (criteria.timeline) {
      const targetMonths = criteria.timeline.typical || (criteria.timeline.min + criteria.timeline.max) / 2;
      
      if (typicalMonths <= criteria.timeline.min) {
        return 100;
      } else if (typicalMonths >= criteria.timeline.max * 1.5) {
        return 30;
      } else if (typicalMonths <= targetMonths) {
        return 100 - ((typicalMonths - criteria.timeline.min) / (targetMonths - criteria.timeline.min)) * 15;
      } else {
        return 85 - ((typicalMonths - targetMonths) / (criteria.timeline.max - targetMonths)) * 45;
      }
    }

    const baselineMonths: Record<string, number> = {
      smb: 6,
      mid_market: 12,
      enterprise: 18,
      large_enterprise: 24,
    };
    
    const baseline = baselineMonths[criteria.organizationSize];
    
    if (typicalMonths <= baseline * 0.5) return 100;
    if (typicalMonths <= baseline * 0.75) return 90;
    if (typicalMonths <= baseline) return 80;
    if (typicalMonths <= baseline * 1.5) return 60;
    return 40;
  }

  private calculateCapabilitiesScore(vendor: Vendor, criteria: ComparisonCriteria): number {
    let score = 70;

    if (criteria.requiredCapabilities && criteria.requiredCapabilities.length > 0) {
      const useCases = vendor.bestFitProfile.primaryUseCases.map(uc => uc.toLowerCase());
      const required = criteria.requiredCapabilities.map(rc => rc.toLowerCase());
      
      let matchCount = 0;
      for (const req of required) {
        const hasMatch = useCases.some(uc => 
          uc.includes(req) || req.includes(uc) || this.fuzzyMatch(uc, req)
        );
        if (hasMatch) matchCount++;
      }
      
      const matchRatio = matchCount / required.length;
      score = 50 + matchRatio * 50;
    }

    const tierBonus: Record<string, number> = {
      tier1: 15,
      tier2: 5,
      specialist: 10,
    };
    
    score = Math.min(100, score + (tierBonus[vendor.tier] || 0));

    return Math.round(score);
  }

  private calculateIntegrationScore(vendor: Vendor, criteria: ComparisonCriteria): number {
    let score = 70;

    const complexityScores: Record<string, number> = {
      low: 90,
      medium: 70,
      high: 50,
    };

    score = complexityScores[vendor.integrationComplexity] || 70;

    if (criteria.integrationRequirements && criteria.integrationRequirements.length > 0) {
      const hasSapErp = criteria.integrationRequirements.some(r => 
        r.toLowerCase().includes('sap')
      );
      const hasOracleErp = criteria.integrationRequirements.some(r => 
        r.toLowerCase().includes('oracle')
      );
      const hasWorkday = criteria.integrationRequirements.some(r => 
        r.toLowerCase().includes('workday')
      );

      if (hasSapErp && vendor.id === 'sap_sac') score += 15;
      if (hasOracleErp && vendor.id === 'oracle_epm') score += 15;
      if (hasWorkday && vendor.id === 'workday_adaptive') score += 15;
    }

    const migrationPenalty: Record<string, number> = {
      low: 0,
      medium: -5,
      high: -10,
    };
    
    score += migrationPenalty[vendor.dataMigrationComplexity] || 0;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private calculateVendorFitScore(vendor: Vendor, criteria: ComparisonCriteria): number {
    let score = 70;
    let factorsChecked = 0;
    let factorsMatched = 0;

    if (criteria.industry) {
      factorsChecked++;
      const vendorIndustries = vendor.bestFitProfile.industryFocus.map(i => i.toLowerCase());
      if (vendorIndustries.some(ind => 
        ind.includes(criteria.industry!.toLowerCase()) || 
        criteria.industry!.toLowerCase().includes(ind)
      )) {
        factorsMatched++;
      }
    }

    if (criteria.complexityTolerance) {
      factorsChecked++;
      if (vendor.bestFitProfile.complexityTolerance === criteria.complexityTolerance) {
        factorsMatched++;
      } else if (
        (criteria.complexityTolerance === 'high' && vendor.bestFitProfile.complexityTolerance === 'medium') ||
        (criteria.complexityTolerance === 'medium' && vendor.bestFitProfile.complexityTolerance === 'low')
      ) {
        factorsMatched += 0.5;
      }
    }

    if (criteria.excelDependency) {
      factorsChecked++;
      if (vendor.bestFitProfile.excelDependency === criteria.excelDependency) {
        factorsMatched++;
      }
    }

    if (criteria.aiReadinessImportance) {
      factorsChecked++;
      if (vendor.bestFitProfile.aiReadiness === criteria.aiReadinessImportance) {
        factorsMatched++;
      } else if (
        criteria.aiReadinessImportance === 'high' && 
        vendor.bestFitProfile.aiReadiness === 'medium'
      ) {
        factorsMatched += 0.5;
      }
    }

    if (factorsChecked > 0) {
      score = 50 + (factorsMatched / factorsChecked) * 50;
    }

    return Math.round(score);
  }

  private calculateUserExperienceScore(vendor: Vendor, criteria: ComparisonCriteria): number {
    let score = 70;

    if (criteria.excelDependency === 'high') {
      if (vendor.bestFitProfile.excelDependency === 'high') {
        score += 20;
      } else if (vendor.bestFitProfile.excelDependency === 'medium') {
        score += 10;
      }
    }

    const excelFriendlyVendors = ['vena', 'workday_adaptive', 'jedox', 'prophix'];
    if (criteria.excelDependency === 'high' && excelFriendlyVendors.includes(vendor.id)) {
      score += 10;
    }

    const complexityPenalty: Record<string, number> = {
      low: 10,
      medium: 0,
      high: -10,
    };
    
    score += complexityPenalty[vendor.bestFitProfile.complexityTolerance] || 0;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private determineRecommendation(
    score: number
  ): 'highly_recommended' | 'recommended' | 'conditional' | 'not_recommended' {
    if (score >= 85) return 'highly_recommended';
    if (score >= 70) return 'recommended';
    if (score >= 50) return 'conditional';
    return 'not_recommended';
  }

  private generateReasoning(
    vendor: Vendor,
    breakdown: ScoreBreakdown,
    criteria: ComparisonCriteria
  ): string[] {
    const reasoning: string[] = [];
    const scores = Object.entries(breakdown) as [keyof ScoreBreakdown, number][];
    
    const sortedScores = scores.sort((a, b) => b[1] - a[1]);
    
    const topStrengths = sortedScores.slice(0, 2);
    for (const [category, score] of topStrengths) {
      if (score >= 80) {
        reasoning.push(`Strong ${this.formatCategory(category)} score (${score}/100)`);
      }
    }

    const weakAreas = sortedScores.filter(([_, score]) => score < 60);
    for (const [category, score] of weakAreas.slice(0, 2)) {
      reasoning.push(`${this.formatCategory(category)} requires consideration (${score}/100)`);
    }

    if (vendor.strengths.length > 0) {
      reasoning.push(`Key strength: ${vendor.strengths[0]}`);
    }

    if (vendor.considerations.length > 0) {
      reasoning.push(`Key consideration: ${vendor.considerations[0]}`);
    }

    return reasoning;
  }

  private formatCategory(category: keyof ScoreBreakdown): string {
    const labels: Record<keyof ScoreBreakdown, string> = {
      cost: 'Cost efficiency',
      timeline: 'Implementation timeline',
      capabilities: 'Capabilities match',
      integration: 'Integration readiness',
      vendorFit: 'Vendor fit',
      userExperience: 'User experience',
    };
    return labels[category] || category;
  }

  private identifyDifferentiators(
    vendors: Vendor[],
    scoringMatrix: ScoringMatrix[]
  ): string[] {
    const differentiators: string[] = [];

    if (vendors.length < 2) return differentiators;

    const sorted = [...scoringMatrix].sort((a, b) => b.overallScore - a.overallScore);
    const top = sorted[0];
    const second = sorted[1];

    if (top && second) {
      const topBreakdown = top.breakdown;
      const secondBreakdown = second.breakdown;

      const categories: (keyof ScoreBreakdown)[] = [
        'cost', 'timeline', 'capabilities', 'integration', 'vendorFit', 'userExperience'
      ];

      for (const category of categories) {
        const diff = topBreakdown[category] - secondBreakdown[category];
        if (diff >= 15) {
          differentiators.push(
            `${top.vendorName} excels in ${this.formatCategory(category)} (+${Math.round(diff)} points vs ${second.vendorName})`
          );
        }
      }
    }

    const topVendor = vendors.find(v => v.id === top?.vendorId);
    if (topVendor && topVendor.strengths.length > 0) {
      differentiators.push(`${top?.vendorName}: ${topVendor.strengths[0]}`);
    }

    return differentiators.slice(0, 5);
  }

  private countOccurrences(items: string[]): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private fuzzyMatch(str1: string, str2: string): boolean {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.length > 3 && word2.length > 3) {
          if (word1.includes(word2) || word2.includes(word1)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  private generateId(): string {
    return `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createComparisonService(vendors: Vendor[] = []): ComparisonService {
  return new ComparisonService(vendors);
}
