/**
 * Correlation Matrix Tests
 * 
 * Tests for the dimension correlation system and root cause analysis.
 */

import { describe, test, expect } from 'vitest';
import {
  DIMENSION_CORRELATIONS,
  MATURITY_LEVELS,
  ROOT_CAUSE_PATTERNS,
  ROOT_CAUSE_REMEDIATIONS,
  ROLE_DIMENSION_EXPERTISE,
  SENIORITY_MULTIPLIER,
  STAKEHOLDER_FOCUS,
  CONFIDENCE_LEVEL_METADATA,
  detectRootCauses,
  calculateRespondentConfidence,
  applyConfidenceWeighting,
  enhanceRootCauses,
  getStakeholderRelevantDimensions,
  determineConfidenceLevel,
  scoreToMaturityLevel,
  type RespondentRole,
  type RespondentSeniority,
  type StakeholderType,
} from '../finance-compass/correlation-matrix';

describe('Dimension Correlations', () => {
  test('should have correlation entries', () => {
    expect(DIMENSION_CORRELATIONS.length).toBeGreaterThan(0);
  });

  test('each correlation should have required properties', () => {
    for (const correlation of DIMENSION_CORRELATIONS) {
      expect(correlation).toHaveProperty('source');
      expect(correlation).toHaveProperty('target');
      expect(correlation).toHaveProperty('type');
      expect(correlation).toHaveProperty('strength');
      expect(correlation).toHaveProperty('description');
    }
  });

  test('correlation strengths should be between 0 and 1', () => {
    for (const correlation of DIMENSION_CORRELATIONS) {
      expect(correlation.strength).toBeGreaterThanOrEqual(0);
      expect(correlation.strength).toBeLessThanOrEqual(1);
    }
  });
});

describe('Maturity Levels', () => {
  test('should have 6 maturity levels', () => {
    expect(MATURITY_LEVELS.length).toBe(6);
  });

  test('should cover score range 0-100', () => {
    expect(MATURITY_LEVELS[0].scoreRange.min).toBe(0);
    expect(MATURITY_LEVELS[MATURITY_LEVELS.length - 1].scoreRange.max).toBe(100);
  });

  test('each level should have required properties', () => {
    for (const level of MATURITY_LEVELS) {
      expect(level).toHaveProperty('level');
      expect(level).toHaveProperty('label');
      expect(level).toHaveProperty('description');
      expect(level).toHaveProperty('scoreRange');
      expect(level).toHaveProperty('characteristics');
    }
  });

  test('scoreToMaturityLevel should return correct level for score 50', () => {
    const level = scoreToMaturityLevel(50);
    expect(level.level).toBe(2); // Managed level
  });

  test('scoreToMaturityLevel should return correct level for score 85', () => {
    const level = scoreToMaturityLevel(85);
    expect(level.level).toBe(4); // Advanced level
  });
});

describe('Root Cause Patterns', () => {
  test('should have at least 5 root cause patterns', () => {
    expect(ROOT_CAUSE_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });

  test('each pattern should have required properties', () => {
    for (const pattern of ROOT_CAUSE_PATTERNS) {
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('label');
      expect(pattern).toHaveProperty('description');
      expect(pattern).toHaveProperty('indicators');
      expect(pattern).toHaveProperty('minIndicatorsRequired');
      expect(pattern).toHaveProperty('affectedDimensions');
      expect(pattern).toHaveProperty('confidence');
      expect(pattern).toHaveProperty('recommendation');
      expect(pattern).toHaveProperty('priority');
    }
  });

  test('pattern priorities should be valid', () => {
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    for (const pattern of ROOT_CAUSE_PATTERNS) {
      expect(validPriorities).toContain(pattern.priority);
    }
  });
});

describe('Root Cause Remediations', () => {
  test('should have remediations for all root cause patterns', () => {
    for (const pattern of ROOT_CAUSE_PATTERNS) {
      expect(ROOT_CAUSE_REMEDIATIONS[pattern.id]).toBeDefined();
    }
  });

  test('each remediation should have at least 3 options', () => {
    for (const patternId of Object.keys(ROOT_CAUSE_REMEDIATIONS)) {
      const remediations = ROOT_CAUSE_REMEDIATIONS[patternId];
      expect(remediations.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('each remediation option should have required properties', () => {
    for (const patternId of Object.keys(ROOT_CAUSE_REMEDIATIONS)) {
      for (const remediation of ROOT_CAUSE_REMEDIATIONS[patternId]) {
        expect(remediation).toHaveProperty('id');
        expect(remediation).toHaveProperty('title');
        expect(remediation).toHaveProperty('description');
        expect(remediation).toHaveProperty('effort');
        expect(remediation).toHaveProperty('impact');
        expect(remediation).toHaveProperty('timeframe');
        expect(remediation).toHaveProperty('estimatedCostRange');
        expect(remediation).toHaveProperty('dependencies');
        expect(remediation).toHaveProperty('stakeholders');
        expect(remediation).toHaveProperty('kpis');
      }
    }
  });
});

describe('detectRootCauses Function', () => {
  test('should detect tech fragmentation when scores are low', () => {
    const lowScores: Record<string, number> = {
      technology_systems: 30,
      consolidation_close: 35,
      management_reporting: 40,
      financial_planning_analysis: 50,
      financial_controls_compliance: 50,
      organisation_people: 50,
      data_analytics: 50,
      ai_machine_learning: 50,
    };
    
    const rootCauses = detectRootCauses(lowScores);
    const techFragmentation = rootCauses.find(rc => rc.pattern.id === 'tech_fragmentation');
    expect(techFragmentation).toBeDefined();
  });

  test('should return empty array when all scores are high', () => {
    const highScores: Record<string, number> = {
      technology_systems: 80,
      consolidation_close: 85,
      management_reporting: 75,
      financial_planning_analysis: 80,
      financial_controls_compliance: 85,
      organisation_people: 75,
      data_analytics: 80,
      ai_machine_learning: 70,
    };
    
    const rootCauses = detectRootCauses(highScores);
    expect(rootCauses.length).toBe(0);
  });
});

describe('Role Dimension Expertise', () => {
  test('should have 10 role types', () => {
    expect(Object.keys(ROLE_DIMENSION_EXPERTISE).length).toBe(10);
  });

  test('CFO should have expertise on financial dimensions', () => {
    const cfoExpertise = ROLE_DIMENSION_EXPERTISE['cfo'];
    expect(cfoExpertise).toBeDefined();
    expect(cfoExpertise['financial_planning_analysis']).toBeDefined();
  });

  test('CIO should have expertise on technology dimensions', () => {
    const cioExpertise = ROLE_DIMENSION_EXPERTISE['cio'];
    expect(cioExpertise).toBeDefined();
    expect(cioExpertise['technology_systems']).toBeDefined();
  });
});

describe('Seniority Multiplier', () => {
  test('should have 6 seniority levels', () => {
    expect(Object.keys(SENIORITY_MULTIPLIER).length).toBe(6);
  });

  test('multipliers should be between 0.8 and 1.2', () => {
    for (const seniority of Object.keys(SENIORITY_MULTIPLIER)) {
      const multiplier = SENIORITY_MULTIPLIER[seniority as RespondentSeniority];
      expect(multiplier).toBeGreaterThanOrEqual(0.8);
      expect(multiplier).toBeLessThanOrEqual(1.2);
    }
  });

  test('c_suite should have highest multiplier', () => {
    expect(SENIORITY_MULTIPLIER['c_suite']).toBe(1.2);
  });
});

describe('calculateRespondentConfidence Function', () => {
  test('should return confidence number', () => {
    const context = {
      role: 'cfo' as const,
      seniority: 'c_suite' as const,
      yearsInRole: 5,
      yearsAtCompany: 10,
      dimensionExpertise: {}
    };
    
    const result = calculateRespondentConfidence(
      context,
      'financial_planning_analysis'
    );
    
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  test('CFO c_suite should have high confidence on financial dimensions', () => {
    const context = {
      role: 'cfo' as const,
      seniority: 'c_suite' as const,
      yearsInRole: 5,
      yearsAtCompany: 10,
      dimensionExpertise: {}
    };
    
    const result = calculateRespondentConfidence(
      context,
      'financial_planning_analysis'
    );
    
    expect(result).toBeGreaterThan(70);
  });

  test('analyst should have lower confidence than CFO', () => {
    const cfoContext = {
      role: 'cfo' as const,
      seniority: 'c_suite' as const,
      yearsInRole: 5,
      yearsAtCompany: 10,
      dimensionExpertise: {}
    };
    
    const analystContext = {
      role: 'finance_analyst' as const,
      seniority: 'analyst' as const,
      yearsInRole: 2,
      yearsAtCompany: 3,
      dimensionExpertise: {}
    };
    
    const cfoResult = calculateRespondentConfidence(cfoContext, 'financial_planning_analysis');
    const analystResult = calculateRespondentConfidence(analystContext, 'financial_planning_analysis');
    
    expect(cfoResult).toBeGreaterThan(analystResult);
  });
});

describe('Stakeholder Focus', () => {
  test('should have 6 stakeholder types', () => {
    expect(Object.keys(STAKEHOLDER_FOCUS).length).toBe(6);
  });

  test('each stakeholder should have primary dimensions', () => {
    for (const stakeholder of Object.keys(STAKEHOLDER_FOCUS)) {
      const focus = STAKEHOLDER_FOCUS[stakeholder as StakeholderType];
      expect(focus).toHaveProperty('primaryDimensions');
      expect(Array.isArray(focus.primaryDimensions)).toBe(true);
      expect(focus.primaryDimensions.length).toBeGreaterThan(0);
    }
  });

  test('CFO should prioritize financial dimensions', () => {
    const cfoFocus = STAKEHOLDER_FOCUS['cfo'];
    expect(cfoFocus.primaryDimensions).toContain('financial_planning_analysis');
    expect(cfoFocus.primaryDimensions).toContain('consolidation_close');
  });

  test('CIO should prioritize technology dimensions', () => {
    const cioFocus = STAKEHOLDER_FOCUS['cio'];
    expect(cioFocus.primaryDimensions).toContain('technology_systems');
    expect(cioFocus.primaryDimensions).toContain('data_analytics');
  });
});

describe('Confidence Level Metadata', () => {
  test('should have 4 confidence levels', () => {
    expect(Object.keys(CONFIDENCE_LEVEL_METADATA).length).toBe(4);
  });

  test('each level should have required display properties', () => {
    for (const level of Object.keys(CONFIDENCE_LEVEL_METADATA)) {
      const metadata = CONFIDENCE_LEVEL_METADATA[level as keyof typeof CONFIDENCE_LEVEL_METADATA];
      expect(metadata).toHaveProperty('label');
      expect(metadata).toHaveProperty('icon');
      expect(metadata).toHaveProperty('color');
      expect(metadata).toHaveProperty('description');
    }
  });
});

describe('getStakeholderRelevantDimensions Function', () => {
  test('should return dimensions array for CFO', () => {
    const scores: Record<string, number> = {
      financial_planning_analysis: 65,
      consolidation_close: 70,
      management_reporting: 55,
      financial_controls_compliance: 60,
      technology_systems: 50,
      organisation_people: 55,
      data_analytics: 45,
      ai_machine_learning: 40,
    };
    
    const dimensions = getStakeholderRelevantDimensions('cfo', scores);
    expect(Array.isArray(dimensions)).toBe(true);
    expect(dimensions.length).toBeGreaterThan(0);
  });

  test('CFO dimensions should prioritize financial areas', () => {
    const scores: Record<string, number> = {
      financial_planning_analysis: 65,
      consolidation_close: 70,
      management_reporting: 55,
      financial_controls_compliance: 60,
      technology_systems: 50,
      organisation_people: 55,
      data_analytics: 45,
      ai_machine_learning: 40,
    };
    
    const dimensions = getStakeholderRelevantDimensions('cfo', scores);
    // CFO's primary dimensions should appear in the result
    expect(dimensions.some(d => d.dimension === 'financial_planning_analysis' || d.dimension === 'consolidation_close')).toBe(true);
  });
});

describe('determineConfidenceLevel Function', () => {
  test('should return validated_evidence for high confidence', () => {
    const level = determineConfidenceLevel(
      'Test insight',
      ['financial_planning_analysis'],
      { financial_planning_analysis: 95 },
      true
    );
    expect(level).toBe('validated_evidence');
  });

  test('should return pending_validation for low confidence', () => {
    const level = determineConfidenceLevel(
      'Test insight',
      ['financial_planning_analysis'],
      { financial_planning_analysis: 30 },
      false
    );
    expect(level).toBe('pending_validation');
  });

  test('should return advisory_judgement for medium-high confidence', () => {
    const level = determineConfidenceLevel(
      'Test insight',
      ['financial_planning_analysis', 'data_analytics'],
      { financial_planning_analysis: 75, data_analytics: 80 }
    );
    expect(['validated_evidence', 'advisory_judgement']).toContain(level);
  });
});

describe('enhanceRootCauses Function', () => {
  test('should enhance root causes with remediation paths', () => {
    const lowScores: Record<string, number> = {
      technology_systems: 30,
      consolidation_close: 35,
      management_reporting: 40,
      financial_planning_analysis: 50,
      financial_controls_compliance: 50,
      organisation_people: 50,
      data_analytics: 50,
      ai_machine_learning: 50,
    };
    
    const rootCauses = detectRootCauses(lowScores);
    if (rootCauses.length > 0) {
      const enhanced = enhanceRootCauses(rootCauses, lowScores);
      expect(enhanced.length).toBe(rootCauses.length);
      expect(enhanced[0]).toHaveProperty('remediationPaths');
      expect(enhanced[0]).toHaveProperty('impactScore');
      expect(enhanced[0]).toHaveProperty('urgencyScore');
      expect(enhanced[0]).toHaveProperty('effortToResolve');
      expect(enhanced[0]).toHaveProperty('businessRisk');
      expect(enhanced[0]).toHaveProperty('stakeholderImpact');
    }
  });
});

describe('applyConfidenceWeighting Function', () => {
  test('should return weighted scores for dimensions', () => {
    const scores: Record<string, number> = {
      financial_planning_analysis: 65,
      technology_systems: 50,
    };
    
    const context = {
      role: 'cfo' as const,
      seniority: 'c_suite' as const,
      yearsInRole: 5,
      yearsAtCompany: 10,
      dimensionExpertise: {}
    };
    
    const weighted = applyConfidenceWeighting(scores, context);
    
    expect(typeof weighted).toBe('object');
    expect(weighted).toHaveProperty('weightedScores');
    expect(weighted).toHaveProperty('confidenceLevels');
    expect(weighted).toHaveProperty('lowConfidenceDimensions');
    expect(Array.isArray(weighted.lowConfidenceDimensions)).toBe(true);
  });
});
