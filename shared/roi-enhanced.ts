/**
 * Enhanced ROI Calculations
 * 
 * Additional ROI analytics including sensitivity analysis grids,
 * working capital impact, and hidden cost calculations.
 */

import type { RoiInputs, RoiMetrics } from "./roi-calculator";
import { calculateRoiMetrics } from "./roi-calculator";

// ============================================
// SENSITIVITY ANALYSIS GRID
// ============================================

export interface SensitivityVariation {
  value: number;
  npv: number;
  roi: number;
  paybackMonths: number;
  deltaFromBaseline: number;
}

export interface SensitivityDriverResult {
  driverName: string;
  driverKey: string;
  baselineValue: number;
  unit: string;
  isCostDriver: boolean;
  variations: {
    pessimistic: SensitivityVariation;
    mildPessimistic: SensitivityVariation;
    baseline: SensitivityVariation;
    mildOptimistic: SensitivityVariation;
    optimistic: SensitivityVariation;
  };
  sensitivity: 'high' | 'medium' | 'low';
  npvSwing: number;
}

export interface SensitivityGrid {
  drivers: SensitivityDriverResult[];
  baselineMetrics: RoiMetrics;
  mostSensitiveDriver: string;
  leastSensitiveDriver: string;
  summary: string;
}

function toNumber(value: number | null | undefined, defaultValue = 0): number {
  return value ?? defaultValue;
}

function cloneProfile(profile: RoiInputs): RoiInputs {
  return { ...profile };
}

/**
 * Calculate sensitivity grid showing NPV/ROI impact of ±10%, ±20% changes
 */
export function calculateSensitivityGrid(profile: RoiInputs): SensitivityGrid {
  const baselineMetrics = calculateRoiMetrics(profile);
  
  const drivers: SensitivityDriverResult[] = [];
  
  const driverConfigs: Array<{
    name: string;
    key: keyof RoiInputs;
    unit: string;
    invert?: boolean;
    isPercent?: boolean;
  }> = [
    { name: "Process Efficiency", key: "processEfficiencyPercent", unit: "%", isPercent: true },
    { name: "Software Licenses", key: "softwareLicenses", unit: "£k", invert: true },
    { name: "Integration Costs", key: "integrationCosts", unit: "£k", invert: true },
    { name: "Benefit Ramp Year 1", key: "benefitRampYear1", unit: "%", isPercent: true },
    { name: "Benefit Ramp Year 2", key: "benefitRampYear2", unit: "%", isPercent: true },
    { name: "Discount Rate", key: "discountRate", unit: "%", invert: true, isPercent: true },
    { name: "Headcount Reduction", key: "headcountDelta", unit: "FTEs" },
    { name: "Change Management", key: "changeManagement", unit: "£k", invert: true },
  ];
  
  for (const config of driverConfigs) {
    const baseValue = toNumber(profile[config.key] as number | null | undefined);
    if (baseValue === 0 && config.key !== "headcountDelta") continue;
    
    const baselineNpv = baselineMetrics.npvValue;
    
    const minus20 = calculateVariation(profile, config.key, baseValue, -0.2, config.isPercent, baselineNpv);
    const minus10 = calculateVariation(profile, config.key, baseValue, -0.1, config.isPercent, baselineNpv);
    const baselineVar: SensitivityVariation = { 
      value: baseValue, 
      npv: baselineNpv, 
      roi: baselineMetrics.roiPercent,
      paybackMonths: baselineMetrics.paybackMonths,
      deltaFromBaseline: 0,
    };
    const plus10 = calculateVariation(profile, config.key, baseValue, 0.1, config.isPercent, baselineNpv);
    const plus20 = calculateVariation(profile, config.key, baseValue, 0.2, config.isPercent, baselineNpv);
    
    const isCostDriver = config.invert === true;
    
    const variations: SensitivityDriverResult["variations"] = isCostDriver
      ? {
          pessimistic: plus20,
          mildPessimistic: plus10,
          baseline: baselineVar,
          mildOptimistic: minus10,
          optimistic: minus20,
        }
      : {
          pessimistic: minus20,
          mildPessimistic: minus10,
          baseline: baselineVar,
          mildOptimistic: plus10,
          optimistic: plus20,
        };
    
    const npvSwing = Math.abs(variations.optimistic.npv - variations.pessimistic.npv);
    const baseNpv = Math.abs(baselineNpv) || 1;
    const swingPercent = (npvSwing / baseNpv) * 100;
    
    let sensitivity: 'high' | 'medium' | 'low';
    if (swingPercent > 30) sensitivity = 'high';
    else if (swingPercent > 15) sensitivity = 'medium';
    else sensitivity = 'low';
    
    drivers.push({
      driverName: config.name,
      driverKey: config.key,
      baselineValue: baseValue,
      unit: config.unit,
      isCostDriver,
      variations,
      sensitivity,
      npvSwing: Math.round(npvSwing),
    });
  }
  
  drivers.sort((a, b) => b.npvSwing - a.npvSwing);
  
  const mostSensitive = drivers[0]?.driverName || "N/A";
  const leastSensitive = drivers[drivers.length - 1]?.driverName || "N/A";
  
  const highSensitivityCount = drivers.filter(d => d.sensitivity === 'high').length;
  
  let summary: string;
  if (highSensitivityCount >= 3) {
    summary = `The business case shows high sensitivity to ${highSensitivityCount} key drivers. Careful monitoring and risk mitigation recommended.`;
  } else if (highSensitivityCount >= 1) {
    summary = `The business case is most sensitive to ${mostSensitive}. Other drivers have moderate to low impact on outcomes.`;
  } else {
    summary = `The business case shows resilience across key drivers, with no single variable dominating the outcome.`;
  }
  
  return {
    drivers,
    baselineMetrics,
    mostSensitiveDriver: mostSensitive,
    leastSensitiveDriver: leastSensitive,
    summary,
  };
}

function calculateVariation(
  profile: RoiInputs,
  key: keyof RoiInputs,
  baseValue: number,
  percentChange: number,
  isPercent?: boolean,
  baselineNpv?: number
): SensitivityVariation {
  const modifiedProfile = cloneProfile(profile);
  let newValue = baseValue * (1 + percentChange);
  
  if (isPercent) {
    newValue = Math.max(0, Math.min(100, newValue));
  }
  
  (modifiedProfile as any)[key] = newValue;
  
  const metrics = calculateRoiMetrics(modifiedProfile);
  const npv = Math.round(metrics.npvValue);
  
  return {
    value: Math.round(newValue * 10) / 10,
    npv,
    roi: Math.round(metrics.roiPercent * 10) / 10,
    paybackMonths: Math.round(metrics.paybackMonths),
    deltaFromBaseline: npv - (baselineNpv ?? 0),
  };
}

// ============================================
// WORKING CAPITAL IMPACT
// ============================================

export interface MonthlyCapitalFlow {
  month: number;
  outflow: number;
  inflow: number;
  netFlow: number;
  cumulativePosition: number;
}

export interface WorkingCapitalAnalysis {
  monthlyFlows: MonthlyCapitalFlow[];
  peakFundingRequirement: number;
  peakFundingMonth: number;
  breakEvenMonth: number;
  averageMonthlyBurn: number;
  financingCostEstimate: number;
  cashFlowProfile: 'front_loaded' | 'steady' | 'back_loaded';
  recommendations: string[];
}

/**
 * Calculate working capital impact and cash flow timing
 * 
 * Model: During implementation, pay implementation costs. After go-live,
 * receive transformation benefits minus new operating costs.
 * Net cash flow = gross benefits - new operating costs - implementation costs
 */
export function calculateWorkingCapitalImpact(profile: RoiInputs): WorkingCapitalAnalysis {
  const horizonYears = toNumber(profile.horizonYears, 3);
  const totalMonths = horizonYears * 12;
  
  const softwareLicenses = toNumber(profile.softwareLicenses);
  const integrationCosts = toNumber(profile.integrationCosts);
  const dataMigration = toNumber(profile.dataMigration);
  const changeManagement = toNumber(profile.changeManagement);
  const internalFteCosts = toNumber(profile.internalFteCosts);
  const trainingCosts = toNumber(profile.trainingCosts);
  const contingency = toNumber(profile.contingency);
  
  const totalImplementation = softwareLicenses + integrationCosts + dataMigration + 
    changeManagement + internalFteCosts + trainingCosts + contingency;
  
  const implementationMonths = 12;
  
  const monthlyFlows: MonthlyCapitalFlow[] = [];
  let cumulativePosition = 0;
  let peakFunding = 0;
  let peakMonth = 0;
  let breakEvenMonth = -1;
  
  const metrics = calculateRoiMetrics(profile);
  const grossMonthlyBenefit = metrics.totalAnnualBenefits / 12;
  const monthlyOperatingCost = metrics.totalAnnualCosts / 12;
  
  const rampY1 = toNumber(profile.benefitRampYear1, 25) / 100;
  const rampY2 = toNumber(profile.benefitRampYear2, 75) / 100;
  const rampY3 = toNumber(profile.benefitRampYear3, 100) / 100;
  
  for (let month = 1; month <= totalMonths; month++) {
    let implementationOutflow = 0;
    let operatingOutflow = 0;
    let benefitInflow = 0;
    
    if (month <= implementationMonths) {
      if (month === 1) {
        implementationOutflow += softwareLicenses * 0.5;
      } else if (month === 3) {
        implementationOutflow += softwareLicenses * 0.5;
      }
      
      implementationOutflow += integrationCosts / implementationMonths;
      const migrationPhase = Math.min(6, implementationMonths);
      if (month <= migrationPhase) {
        implementationOutflow += dataMigration / migrationPhase;
      }
      implementationOutflow += changeManagement / implementationMonths;
      implementationOutflow += internalFteCosts / implementationMonths;
      implementationOutflow += contingency / implementationMonths;
      
      if (month >= implementationMonths - 2) {
        implementationOutflow += trainingCosts / 3;
      }
    }
    
    if (month > implementationMonths) {
      operatingOutflow = monthlyOperatingCost;
    }
    
    if (month > implementationMonths) {
      const monthsSinceGolive = month - implementationMonths;
      let rampFactor: number;
      
      if (monthsSinceGolive <= 12) {
        const rampProgress = monthsSinceGolive / 12;
        rampFactor = rampY1 + (rampY2 - rampY1) * rampProgress;
      } else if (monthsSinceGolive <= 24) {
        const rampProgress = (monthsSinceGolive - 12) / 12;
        rampFactor = rampY2 + (rampY3 - rampY2) * rampProgress;
      } else {
        rampFactor = rampY3;
      }
      
      benefitInflow = grossMonthlyBenefit * rampFactor;
    }
    
    const totalOutflow = implementationOutflow + operatingOutflow;
    const netFlow = benefitInflow - totalOutflow;
    cumulativePosition += netFlow;
    
    if (cumulativePosition < peakFunding) {
      peakFunding = cumulativePosition;
      peakMonth = month;
    }
    
    if (cumulativePosition >= 0 && breakEvenMonth < 0) {
      breakEvenMonth = month;
    }
    
    monthlyFlows.push({
      month,
      outflow: Math.round(totalOutflow),
      inflow: Math.round(benefitInflow),
      netFlow: Math.round(netFlow),
      cumulativePosition: Math.round(cumulativePosition),
    });
  }
  
  const averageMonthlyBurn = totalImplementation / implementationMonths;
  
  const financingRate = 0.08;
  const financingCostEstimate = Math.abs(peakFunding) * financingRate * (peakMonth / 12);
  
  let cashFlowProfile: WorkingCapitalAnalysis['cashFlowProfile'];
  const firstQuarterOutflow = monthlyFlows.slice(0, 3).reduce((sum, m) => sum + m.outflow, 0);
  const totalOutflow = monthlyFlows.slice(0, implementationMonths).reduce((sum, m) => sum + m.outflow, 0);
  const frontLoadedRatio = firstQuarterOutflow / (totalOutflow || 1);
  
  if (frontLoadedRatio > 0.4) cashFlowProfile = 'front_loaded';
  else if (frontLoadedRatio < 0.2) cashFlowProfile = 'back_loaded';
  else cashFlowProfile = 'steady';
  
  const recommendations: string[] = [];
  
  if (Math.abs(peakFunding) > totalImplementation * 0.8) {
    recommendations.push("Consider phased implementation to reduce peak funding requirement");
  }
  if (cashFlowProfile === 'front_loaded') {
    recommendations.push("Negotiate staged payment terms with vendors to smooth cash flow");
  }
  if (breakEvenMonth > 30) {
    recommendations.push("Identify quick-win benefits to accelerate payback");
  }
  if (financingCostEstimate > totalImplementation * 0.05) {
    recommendations.push("Factor financing costs into total investment when presenting to stakeholders");
  }
  
  return {
    monthlyFlows,
    peakFundingRequirement: Math.round(Math.abs(peakFunding)),
    peakFundingMonth: peakMonth,
    breakEvenMonth: breakEvenMonth <= totalMonths ? breakEvenMonth : -1,
    averageMonthlyBurn: Math.round(averageMonthlyBurn),
    financingCostEstimate: Math.round(financingCostEstimate),
    cashFlowProfile,
    recommendations,
  };
}

// ============================================
// HIDDEN COST CALCULATOR
// ============================================

export interface HiddenCostCategory {
  category: string;
  description: string;
  annualCost: number;
  confidence: 'high' | 'medium' | 'low';
  calculationBasis: string;
}

export interface HiddenCostAnalysis {
  categories: HiddenCostCategory[];
  totalAnnualHiddenCosts: number;
  hiddenCostsAsPercentOfBaseline: number;
  opportunityCostOfDelay: number;
  cumulativeDelayImpact: number;
  monthlyOpportunityCost: number;
  riskAdjustedTotalCost: number;
  insights: string[];
}

export interface AssessmentScores {
  technology_systems?: number;
  data_analytics?: number;
  process_automation?: number;
  financial_controls_compliance?: number;
  overall_maturity?: number;
}

/**
 * Calculate hidden/overlooked costs often missing from transformation budgets
 */
export function calculateHiddenCosts(
  profile: RoiInputs,
  assessmentScores?: AssessmentScores
): HiddenCostAnalysis {
  const baselineOperatingCost = toNumber(profile.baselineOperatingCost);
  const processEfficiency = toNumber(profile.processEfficiencyPercent);
  
  const techScore = assessmentScores?.technology_systems ?? 2.5;
  const dataScore = assessmentScores?.data_analytics ?? 2.5;
  const automationScore = assessmentScores?.process_automation ?? 2.5;
  const overallMaturity = assessmentScores?.overall_maturity ?? 2.5;
  
  const categories: HiddenCostCategory[] = [];
  
  const techDebtMultiplier = Math.max(0, (3 - techScore) / 3);
  const techDebtCost = baselineOperatingCost * techDebtMultiplier * 0.08;
  if (techDebtCost > 0) {
    categories.push({
      category: "Technical Debt",
      description: "Ongoing maintenance of legacy systems, workarounds, and integration patches",
      annualCost: Math.round(techDebtCost),
      confidence: 'medium',
      calculationBasis: `${Math.round(techDebtMultiplier * 8)}% of baseline operating cost based on technology maturity`,
    });
  }
  
  const automationGap = Math.max(0, 4 - automationScore);
  const shadowITFTEs = automationGap * 0.8;
  const shadowITCost = shadowITFTEs * 65;
  if (shadowITCost > 0) {
    categories.push({
      category: "Shadow IT / Spreadsheet Maintenance",
      description: "Time spent maintaining manual workarounds, complex spreadsheets, and unofficial tools",
      annualCost: Math.round(shadowITCost),
      confidence: 'medium',
      calculationBasis: `${shadowITFTEs.toFixed(1)} FTE equivalent at £65k fully loaded`,
    });
  }
  
  const dataQualityMultiplier = Math.max(0, (3 - dataScore) / 3);
  const dataQualityCost = baselineOperatingCost * dataQualityMultiplier * 0.05;
  if (dataQualityCost > 0) {
    categories.push({
      category: "Data Quality Remediation",
      description: "Time spent reconciling, correcting, and validating data issues",
      annualCost: Math.round(dataQualityCost),
      confidence: 'low',
      calculationBasis: `${Math.round(dataQualityMultiplier * 5)}% of baseline based on data maturity`,
    });
  }
  
  const changeFatigueCost = baselineOperatingCost * 0.02;
  categories.push({
    category: "Change Fatigue / Productivity Dip",
    description: "Temporary productivity reduction during transition period (typically 3-6 months)",
    annualCost: Math.round(changeFatigueCost),
    confidence: 'high',
    calculationBasis: "2% of baseline operating cost (industry standard for finance transformation implementations)",
  });
  
  const reworkMultiplier = Math.max(0, (3.5 - overallMaturity) / 3.5);
  const reworkCost = baselineOperatingCost * reworkMultiplier * 0.04;
  if (reworkCost > 0) {
    categories.push({
      category: "Reporting Rework & Corrections",
      description: "Time spent correcting errors, rerunning reports, and manual adjustments",
      annualCost: Math.round(reworkCost),
      confidence: 'medium',
      calculationBasis: `${Math.round(reworkMultiplier * 4)}% of baseline based on maturity level`,
    });
  }
  
  const totalAnnualHiddenCosts = categories.reduce((sum, c) => sum + c.annualCost, 0);
  const hiddenCostsAsPercentOfBaseline = baselineOperatingCost > 0 
    ? (totalAnnualHiddenCosts / baselineOperatingCost) * 100 
    : 0;
  
  const metrics = calculateRoiMetrics(profile);
  const monthlyBenefit = metrics.totalAnnualBenefits / 12;
  const opportunityCostOfDelay = monthlyBenefit;
  
  const typicalDelayMonths = 6;
  const cumulativeDelayImpact = monthlyBenefit * typicalDelayMonths;
  
  const riskAdjustedTotalCost = totalAnnualHiddenCosts + cumulativeDelayImpact;
  
  const insights: string[] = [];
  
  if (hiddenCostsAsPercentOfBaseline > 15) {
    insights.push(`Hidden costs represent ${Math.round(hiddenCostsAsPercentOfBaseline)}% of your baseline operating cost - addressing these should be a priority`);
  }
  
  if (techDebtCost > totalAnnualHiddenCosts * 0.4) {
    insights.push("Technical debt is the largest hidden cost driver - modernising technology infrastructure will yield significant savings");
  }
  
  if (shadowITCost > 100) {
    insights.push(`Shadow IT and spreadsheet maintenance consumes an estimated ${shadowITFTEs.toFixed(1)} FTEs annually - consolidation into an EPM platform could redirect this capacity to value-add activities`);
  }
  
  if (monthlyBenefit > 50) {
    insights.push(`Each month of delay costs approximately £${Math.round(monthlyBenefit)}k in foregone benefits`);
  }
  
  return {
    categories,
    totalAnnualHiddenCosts: Math.round(totalAnnualHiddenCosts),
    hiddenCostsAsPercentOfBaseline: Math.round(hiddenCostsAsPercentOfBaseline * 10) / 10,
    opportunityCostOfDelay: Math.round(opportunityCostOfDelay),
    cumulativeDelayImpact: Math.round(cumulativeDelayImpact),
    monthlyOpportunityCost: Math.round(monthlyBenefit),
    riskAdjustedTotalCost: Math.round(riskAdjustedTotalCost),
    insights,
  };
}

// ============================================
// MONTE CARLO SIMULATION
// ============================================

export interface MonteCarloConfig {
  iterations: number;
  seed?: number;
  distributions: {
    processEfficiency: { type: 'triangular'; min: number; mode: number; max: number };
    implementationCost: { type: 'triangular'; min: number; mode: number; max: number };
    benefitRamp: { type: 'triangular'; min: number; mode: number; max: number };
    discountRate: { type: 'normal'; mean: number; stdDev: number };
  };
}

export interface MonteCarloResult {
  iterations: number;
  npv: {
    mean: number;
    median: number;
    stdDev: number;
    p5: number;
    p25: number;
    p75: number;
    p95: number;
    min: number;
    max: number;
  };
  roi: {
    mean: number;
    median: number;
    p5: number;
    p95: number;
  };
  payback: {
    mean: number;
    median: number;
    p5: number;
    p95: number;
  };
  probabilityPositiveNpv: number;
  probabilityPaybackUnder3Years: number;
  riskAssessment: 'low' | 'medium' | 'high';
  confidenceStatement: string;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function triangularDistribution(
  random: () => number,
  min: number,
  mode: number,
  max: number
): number {
  const u = random();
  const fc = (mode - min) / (max - min);
  
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

function normalDistribution(
  random: () => number,
  mean: number,
  stdDev: number
): number {
  const u1 = random();
  const u2 = random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

interface RawSimulationResults {
  npvResults: number[];
  roiResults: number[];
  paybackResults: number[];
  iterations: number;
}

function getDefaultDistributions(profile: RoiInputs): MonteCarloConfig['distributions'] {
  const baseEfficiency = toNumber(profile.processEfficiencyPercent);
  const baseRampY1 = toNumber(profile.benefitRampYear1, 25);
  const baseDiscount = toNumber(profile.discountRate, 8);
  
  return {
    processEfficiency: { 
      type: 'triangular', 
      min: baseEfficiency * 0.7, 
      mode: baseEfficiency, 
      max: baseEfficiency * 1.3 
    },
    implementationCost: { 
      type: 'triangular', 
      min: 0.85, 
      mode: 1.0, 
      max: 1.25 
    },
    benefitRamp: { 
      type: 'triangular', 
      min: baseRampY1 * 0.6, 
      mode: baseRampY1, 
      max: Math.min(100, baseRampY1 * 1.4) 
    },
    discountRate: { 
      type: 'normal', 
      mean: baseDiscount, 
      stdDev: 2 
    },
  };
}

function runSimulationRaw(
  profile: RoiInputs,
  config?: Partial<MonteCarloConfig>
): RawSimulationResults {
  const iterations = config?.iterations ?? 1000;
  const random = seededRandom(config?.seed ?? Date.now());
  const dist = config?.distributions ?? getDefaultDistributions(profile);
  
  const baseLicenses = toNumber(profile.softwareLicenses);
  const baseIntegration = toNumber(profile.integrationCosts);
  
  const npvResults: number[] = [];
  const roiResults: number[] = [];
  const paybackResults: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const simProfile = cloneProfile(profile);
    
    simProfile.processEfficiencyPercent = triangularDistribution(
      random,
      dist.processEfficiency.min,
      dist.processEfficiency.mode,
      dist.processEfficiency.max
    );
    
    const costMultiplier = triangularDistribution(
      random,
      dist.implementationCost.min,
      dist.implementationCost.mode,
      dist.implementationCost.max
    );
    simProfile.softwareLicenses = baseLicenses * costMultiplier;
    simProfile.integrationCosts = baseIntegration * costMultiplier;
    
    simProfile.benefitRampYear1 = triangularDistribution(
      random,
      dist.benefitRamp.min,
      dist.benefitRamp.mode,
      dist.benefitRamp.max
    );
    
    simProfile.discountRate = Math.max(1, Math.min(20, normalDistribution(
      random,
      dist.discountRate.mean,
      dist.discountRate.stdDev
    )));
    
    const metrics = calculateRoiMetrics(simProfile);
    npvResults.push(metrics.npvValue);
    roiResults.push(metrics.roiPercent);
    paybackResults.push(metrics.paybackMonths);
  }
  
  return { npvResults, roiResults, paybackResults, iterations };
}

/**
 * Run Monte Carlo simulation for risk-adjusted ROI analysis
 */
export function runMonteCarloSimulation(
  profile: RoiInputs,
  config?: Partial<MonteCarloConfig>
): MonteCarloResult {
  const { npvResults, roiResults, paybackResults, iterations } = runSimulationRaw(profile, config);
  
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = (arr: number[]) => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / arr.length);
  };
  
  const npvMean = mean(npvResults);
  const npvStdDev = stdDev(npvResults);
  
  const probabilityPositiveNpv = npvResults.filter(n => n > 0).length / iterations;
  const probabilityPaybackUnder3Years = paybackResults.filter(p => p <= 36).length / iterations;
  
  let riskAssessment: 'low' | 'medium' | 'high';
  const coeffOfVariation = npvMean !== 0 ? Math.abs(npvStdDev / npvMean) : 1;
  
  if (probabilityPositiveNpv > 0.9 && coeffOfVariation < 0.3) {
    riskAssessment = 'low';
  } else if (probabilityPositiveNpv > 0.7 && coeffOfVariation < 0.5) {
    riskAssessment = 'medium';
  } else {
    riskAssessment = 'high';
  }
  
  let confidenceStatement: string;
  if (riskAssessment === 'low') {
    confidenceStatement = `Based on ${iterations} simulations, there is a ${Math.round(probabilityPositiveNpv * 100)}% probability of achieving positive NPV. The business case demonstrates low risk with consistent outcomes across scenarios.`;
  } else if (riskAssessment === 'medium') {
    confidenceStatement = `Based on ${iterations} simulations, there is a ${Math.round(probabilityPositiveNpv * 100)}% probability of achieving positive NPV. The business case shows moderate sensitivity to assumptions - recommend monitoring key drivers.`;
  } else {
    confidenceStatement = `Based on ${iterations} simulations, there is a ${Math.round(probabilityPositiveNpv * 100)}% probability of achieving positive NPV. The business case shows high variability - consider risk mitigation strategies before proceeding.`;
  }
  
  return {
    iterations,
    npv: {
      mean: Math.round(npvMean),
      median: Math.round(percentile(npvResults, 50)),
      stdDev: Math.round(npvStdDev),
      p5: Math.round(percentile(npvResults, 5)),
      p25: Math.round(percentile(npvResults, 25)),
      p75: Math.round(percentile(npvResults, 75)),
      p95: Math.round(percentile(npvResults, 95)),
      min: Math.round(Math.min(...npvResults)),
      max: Math.round(Math.max(...npvResults)),
    },
    roi: {
      mean: Math.round(mean(roiResults) * 10) / 10,
      median: Math.round(percentile(roiResults, 50) * 10) / 10,
      p5: Math.round(percentile(roiResults, 5) * 10) / 10,
      p95: Math.round(percentile(roiResults, 95) * 10) / 10,
    },
    payback: {
      mean: Math.round(mean(paybackResults)),
      median: Math.round(percentile(paybackResults, 50)),
      p5: Math.round(percentile(paybackResults, 5)),
      p95: Math.round(percentile(paybackResults, 95)),
    },
    probabilityPositiveNpv: Math.round(probabilityPositiveNpv * 100),
    probabilityPaybackUnder3Years: Math.round(probabilityPaybackUnder3Years * 100),
    riskAssessment,
    confidenceStatement,
  };
}

// ============================================
// RISK-ADJUSTED ROI WITH VAR/CVAR
// ============================================

export interface RiskAdjustedROI {
  var95: number;
  cvar95: number;
  median: number;
  iqr: { lower: number; upper: number };
  confidenceBand95: { lower: number; upper: number };
  probabilityPositiveNPV: number;
  interpretation: string;
}

/**
 * Calculate risk-adjusted ROI with VaR-style confidence intervals
 * 
 * Uses Monte Carlo simulation to derive:
 * - VaR95: 5th percentile NPV (95% confident NPV exceeds this value)
 * - CVaR95: Conditional VaR / Expected Shortfall (average of worst 5% outcomes)
 * - Confidence bands and probability metrics
 */
export function calculateRiskAdjustedROI(
  profile: RoiInputs,
  config?: Partial<MonteCarloConfig>
): RiskAdjustedROI {
  const { npvResults, iterations } = runSimulationRaw(profile, config);
  
  const sortedNpv = [...npvResults].sort((a, b) => a - b);
  
  const var95 = Math.round(percentile(npvResults, 5));
  const median = Math.round(percentile(npvResults, 50));
  const p25 = Math.round(percentile(npvResults, 25));
  const p75 = Math.round(percentile(npvResults, 75));
  const p95 = Math.round(percentile(npvResults, 95));
  
  const cutoffIndex = Math.ceil(iterations * 0.05);
  const worstOutcomes = sortedNpv.slice(0, cutoffIndex);
  const cvar95 = worstOutcomes.length > 0
    ? Math.round(worstOutcomes.reduce((sum, v) => sum + v, 0) / worstOutcomes.length)
    : var95;
  
  const positiveCount = npvResults.filter(n => n > 0).length;
  const probabilityPositiveNPV = Math.round((positiveCount / iterations) * 100);
  
  const bandWidth = p95 - var95;
  const bandWidthPercent = median !== 0 ? Math.round((bandWidth / Math.abs(median)) * 100) : 0;
  
  let interpretation: string;
  if (probabilityPositiveNPV >= 90 && var95 > 0) {
    interpretation = `Strong business case with 95% confidence NPV exceeds £${Math.round(var95).toLocaleString()}k. Even in worst-case scenarios (CVaR), expected NPV is £${Math.round(cvar95).toLocaleString()}k. The ${bandWidthPercent}% confidence band indicates low uncertainty.`;
  } else if (probabilityPositiveNPV >= 70 && var95 > 0) {
    interpretation = `Solid business case with ${probabilityPositiveNPV}% probability of positive NPV. VaR95 of £${Math.round(var95).toLocaleString()}k provides reasonable downside protection. Monitor key drivers to reduce the ${bandWidthPercent}% outcome variability.`;
  } else if (probabilityPositiveNPV >= 70) {
    interpretation = `Moderate business case with ${probabilityPositiveNPV}% probability of positive NPV, but VaR95 of £${Math.round(var95).toLocaleString()}k indicates potential downside risk. Consider risk mitigation or phased approach.`;
  } else if (probabilityPositiveNPV >= 50) {
    interpretation = `Marginal business case with ${probabilityPositiveNPV}% probability of positive NPV. VaR95 of £${Math.round(var95).toLocaleString()}k and CVaR of £${Math.round(cvar95).toLocaleString()}k suggest significant downside risk. Recommend sensitivity analysis before proceeding.`;
  } else {
    interpretation = `High-risk business case with only ${probabilityPositiveNPV}% probability of positive NPV. The 5th percentile outcome (VaR95) is £${Math.round(var95).toLocaleString()}k with expected shortfall (CVaR) of £${Math.round(cvar95).toLocaleString()}k. Significant restructuring of assumptions may be required.`;
  }
  
  return {
    var95,
    cvar95,
    median,
    iqr: { lower: p25, upper: p75 },
    confidenceBand95: { lower: var95, upper: p95 },
    probabilityPositiveNPV,
    interpretation,
  };
}

// ============================================
// PEER BENCHMARKING ANALYTICS
// ============================================

export interface PeerBenchmark {
  metric: string;
  userValue: number;
  industryAverage: number;
  industryMedian: number;
  percentileRank: number;
  gap: number;
  interpretation: 'above_average' | 'average' | 'below_average';
  insight: string;
}

export interface PeerBenchmarkResult {
  industry: string;
  benchmarks: PeerBenchmark[];
  overallPercentile: number;
  summary: string;
}

export type IndustryKey = 
  | 'financial_services'
  | 'manufacturing'
  | 'healthcare'
  | 'retail'
  | 'technology'
  | 'energy'
  | 'professional_services';

interface IndustryBenchmarkMetrics {
  name: string;
  financeCloseCycleDays: { average: number; median: number; p25: number; p75: number };
  forecastAccuracyPercent: { average: number; median: number; p25: number; p75: number };
  processAutomationPercent: { average: number; median: number; p25: number; p75: number };
  ftePerBillionRevenue: { average: number; median: number; p25: number; p75: number };
  epmMaturityLevel: { average: number; median: number; p25: number; p75: number };
}

export const INDUSTRY_BENCHMARKS: Record<IndustryKey, IndustryBenchmarkMetrics> = {
  financial_services: {
    name: 'Financial Services',
    financeCloseCycleDays: { average: 5.2, median: 5, p25: 4, p75: 7 },
    forecastAccuracyPercent: { average: 82, median: 83, p25: 78, p75: 88 },
    processAutomationPercent: { average: 58, median: 55, p25: 42, p75: 72 },
    ftePerBillionRevenue: { average: 48, median: 45, p25: 35, p75: 58 },
    epmMaturityLevel: { average: 3.2, median: 3.1, p25: 2.5, p75: 3.8 },
  },
  manufacturing: {
    name: 'Manufacturing',
    financeCloseCycleDays: { average: 7.5, median: 7, p25: 5, p75: 10 },
    forecastAccuracyPercent: { average: 75, median: 74, p25: 68, p75: 82 },
    processAutomationPercent: { average: 45, median: 42, p25: 32, p75: 58 },
    ftePerBillionRevenue: { average: 62, median: 58, p25: 48, p75: 75 },
    epmMaturityLevel: { average: 2.6, median: 2.5, p25: 2.0, p75: 3.2 },
  },
  healthcare: {
    name: 'Healthcare',
    financeCloseCycleDays: { average: 8.2, median: 8, p25: 6, p75: 11 },
    forecastAccuracyPercent: { average: 72, median: 71, p25: 65, p75: 79 },
    processAutomationPercent: { average: 38, median: 35, p25: 25, p75: 50 },
    ftePerBillionRevenue: { average: 72, median: 68, p25: 55, p75: 88 },
    epmMaturityLevel: { average: 2.3, median: 2.2, p25: 1.8, p75: 2.9 },
  },
  retail: {
    name: 'Retail',
    financeCloseCycleDays: { average: 6.8, median: 6, p25: 5, p75: 9 },
    forecastAccuracyPercent: { average: 78, median: 77, p25: 72, p75: 84 },
    processAutomationPercent: { average: 52, median: 50, p25: 38, p75: 65 },
    ftePerBillionRevenue: { average: 55, median: 52, p25: 42, p75: 68 },
    epmMaturityLevel: { average: 2.8, median: 2.7, p25: 2.2, p75: 3.4 },
  },
  technology: {
    name: 'Technology',
    financeCloseCycleDays: { average: 4.5, median: 4, p25: 3, p75: 6 },
    forecastAccuracyPercent: { average: 85, median: 86, p25: 80, p75: 91 },
    processAutomationPercent: { average: 68, median: 70, p25: 55, p75: 82 },
    ftePerBillionRevenue: { average: 38, median: 35, p25: 28, p75: 48 },
    epmMaturityLevel: { average: 3.5, median: 3.4, p25: 2.8, p75: 4.1 },
  },
  energy: {
    name: 'Energy',
    financeCloseCycleDays: { average: 7.0, median: 7, p25: 5, p75: 9 },
    forecastAccuracyPercent: { average: 74, median: 73, p25: 68, p75: 80 },
    processAutomationPercent: { average: 48, median: 45, p25: 35, p75: 60 },
    ftePerBillionRevenue: { average: 42, median: 40, p25: 32, p75: 52 },
    epmMaturityLevel: { average: 2.9, median: 2.8, p25: 2.3, p75: 3.5 },
  },
  professional_services: {
    name: 'Professional Services',
    financeCloseCycleDays: { average: 5.8, median: 5, p25: 4, p75: 8 },
    forecastAccuracyPercent: { average: 80, median: 79, p25: 74, p75: 86 },
    processAutomationPercent: { average: 55, median: 52, p25: 40, p75: 68 },
    ftePerBillionRevenue: { average: 52, median: 48, p25: 38, p75: 65 },
    epmMaturityLevel: { average: 3.0, median: 2.9, p25: 2.4, p75: 3.6 },
  },
};

function normalizeIndustryKey(industry: string): IndustryKey {
  const normalized = industry.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const validKeys: IndustryKey[] = [
    'financial_services',
    'manufacturing',
    'healthcare',
    'retail',
    'technology',
    'energy',
    'professional_services',
  ];
  if (validKeys.includes(normalized as IndustryKey)) {
    return normalized as IndustryKey;
  }
  return 'manufacturing';
}

function calculatePercentileRank(value: number, p25: number, median: number, p75: number, higherIsBetter: boolean): number {
  let rank: number;
  
  if (higherIsBetter) {
    if (value >= p75) {
      rank = 75 + ((value - p75) / (p75 - median || 1)) * 25;
    } else if (value >= median) {
      rank = 50 + ((value - median) / (p75 - median || 1)) * 25;
    } else if (value >= p25) {
      rank = 25 + ((value - p25) / (median - p25 || 1)) * 25;
    } else {
      rank = ((value) / (p25 || 1)) * 25;
    }
  } else {
    if (value <= p25) {
      rank = 75 + ((p25 - value) / (p25 || 1)) * 25;
    } else if (value <= median) {
      rank = 50 + ((median - value) / (median - p25 || 1)) * 25;
    } else if (value <= p75) {
      rank = 25 + ((p75 - value) / (p75 - median || 1)) * 25;
    } else {
      rank = Math.max(0, 25 - ((value - p75) / (p75 || 1)) * 25);
    }
  }
  
  return Math.max(0, Math.min(100, Math.round(rank)));
}

function getInterpretation(percentileRank: number): 'above_average' | 'average' | 'below_average' {
  if (percentileRank >= 60) return 'above_average';
  if (percentileRank >= 40) return 'average';
  return 'below_average';
}

export interface PeerBenchmarkInputs {
  financeCloseCycleDays?: number | null;
  forecastAccuracyPercent?: number | null;
  processAutomationPercent?: number | null;
  ftePerBillionRevenue?: number | null;
  epmMaturityLevel?: number | null;
}

/**
 * Calculate peer benchmarks comparing user assessment results against industry averages
 */
export function calculatePeerBenchmarks(
  profile: RoiInputs & PeerBenchmarkInputs,
  industry: string
): PeerBenchmarkResult {
  const industryKey = normalizeIndustryKey(industry);
  const benchmarkData = INDUSTRY_BENCHMARKS[industryKey];
  
  const benchmarks: PeerBenchmark[] = [];
  let totalPercentile = 0;
  let metricCount = 0;
  
  const userCloseDays = toNumber(profile.financeCloseCycleDays, toNumber(profile.closeAccelerationDays, 8));
  if (userCloseDays > 0) {
    const bm = benchmarkData.financeCloseCycleDays;
    const percentileRank = calculatePercentileRank(userCloseDays, bm.p25, bm.median, bm.p75, false);
    const gap = userCloseDays - bm.median;
    const interpretation = getInterpretation(percentileRank);
    
    let insight: string;
    if (gap > 0) {
      insight = `Your close cycle is ${gap.toFixed(1)} days slower than industry median. Streamlining processes could improve working capital and reporting timeliness.`;
    } else if (gap < 0) {
      insight = `Your close cycle is ${Math.abs(gap).toFixed(1)} days faster than industry median. This positions you well for continuous close initiatives.`;
    } else {
      insight = `Your close cycle aligns with industry median. Consider automation to move toward best-in-class performance.`;
    }
    
    benchmarks.push({
      metric: 'Finance Close Cycle Days',
      userValue: userCloseDays,
      industryAverage: bm.average,
      industryMedian: bm.median,
      percentileRank,
      gap,
      interpretation,
      insight,
    });
    totalPercentile += percentileRank;
    metricCount++;
  }
  
  const userForecastAccuracy = toNumber(profile.forecastAccuracyPercent, 75);
  if (userForecastAccuracy > 0) {
    const bm = benchmarkData.forecastAccuracyPercent;
    const percentileRank = calculatePercentileRank(userForecastAccuracy, bm.p25, bm.median, bm.p75, true);
    const gap = userForecastAccuracy - bm.median;
    const interpretation = getInterpretation(percentileRank);
    
    let insight: string;
    if (gap > 0) {
      insight = `Your forecast accuracy is ${gap.toFixed(1)}% above industry median. This supports confident business planning and stakeholder trust.`;
    } else if (gap < 0) {
      insight = `Your forecast accuracy is ${Math.abs(gap).toFixed(1)}% below industry median. Consider driver-based forecasting or AI-assisted predictions.`;
    } else {
      insight = `Your forecast accuracy matches industry median. Explore predictive analytics to gain competitive advantage.`;
    }
    
    benchmarks.push({
      metric: 'Forecast Accuracy',
      userValue: userForecastAccuracy,
      industryAverage: bm.average,
      industryMedian: bm.median,
      percentileRank,
      gap,
      interpretation,
      insight,
    });
    totalPercentile += percentileRank;
    metricCount++;
  }
  
  const userAutomation = toNumber(profile.processAutomationPercent, toNumber(profile.processEfficiencyPercent, 40));
  if (userAutomation > 0) {
    const bm = benchmarkData.processAutomationPercent;
    const percentileRank = calculatePercentileRank(userAutomation, bm.p25, bm.median, bm.p75, true);
    const gap = userAutomation - bm.median;
    const interpretation = getInterpretation(percentileRank);
    
    let insight: string;
    if (gap > 0) {
      insight = `Your process automation level is ${gap.toFixed(1)}% above industry median. Continue leveraging technology for sustained competitive advantage.`;
    } else if (gap < 0) {
      insight = `Your process automation level is ${Math.abs(gap).toFixed(1)}% below industry median. Automation investments could yield significant FTE reallocation opportunities.`;
    } else {
      insight = `Your automation level matches industry median. Prioritise high-volume, repetitive processes for next-phase automation.`;
    }
    
    benchmarks.push({
      metric: 'Process Automation Level',
      userValue: userAutomation,
      industryAverage: bm.average,
      industryMedian: bm.median,
      percentileRank,
      gap,
      interpretation,
      insight,
    });
    totalPercentile += percentileRank;
    metricCount++;
  }
  
  const userFteRatio = toNumber(profile.ftePerBillionRevenue, 55);
  if (userFteRatio > 0) {
    const bm = benchmarkData.ftePerBillionRevenue;
    const percentileRank = calculatePercentileRank(userFteRatio, bm.p25, bm.median, bm.p75, false);
    const gap = userFteRatio - bm.median;
    const interpretation = getInterpretation(percentileRank);
    
    let insight: string;
    if (gap > 0) {
      insight = `Your FTE ratio is ${gap.toFixed(0)} higher than industry median. Process optimisation and technology investment could improve cost efficiency.`;
    } else if (gap < 0) {
      insight = `Your FTE ratio is ${Math.abs(gap).toFixed(0)} lower than industry median, indicating lean operations. Ensure capacity for growth and strategic initiatives.`;
    } else {
      insight = `Your FTE efficiency aligns with industry median. Balance cost optimisation with capability investment.`;
    }
    
    benchmarks.push({
      metric: 'FTE per £B Revenue',
      userValue: userFteRatio,
      industryAverage: bm.average,
      industryMedian: bm.median,
      percentileRank,
      gap,
      interpretation,
      insight,
    });
    totalPercentile += percentileRank;
    metricCount++;
  }
  
  const userMaturity = toNumber(profile.epmMaturityLevel, 2.5);
  if (userMaturity > 0) {
    const bm = benchmarkData.epmMaturityLevel;
    const percentileRank = calculatePercentileRank(userMaturity, bm.p25, bm.median, bm.p75, true);
    const gap = userMaturity - bm.median;
    const interpretation = getInterpretation(percentileRank);
    
    let insight: string;
    if (gap > 0) {
      insight = `Your finance function maturity is ${gap.toFixed(1)} levels above industry median. Focus on advanced capabilities like AI-driven insights and predictive analytics.`;
    } else if (gap < 0) {
      insight = `Your finance function maturity is ${Math.abs(gap).toFixed(1)} levels below industry median. A structured transformation programme could close this gap within 18-24 months.`;
    } else {
      insight = `Your finance function maturity matches industry median. Target specific capability gaps to move toward best-in-class performance.`;
    }
    
    benchmarks.push({
      metric: 'Finance Function Maturity Level',
      userValue: userMaturity,
      industryAverage: bm.average,
      industryMedian: bm.median,
      percentileRank,
      gap,
      interpretation,
      insight,
    });
    totalPercentile += percentileRank;
    metricCount++;
  }
  
  const overallPercentile = metricCount > 0 ? Math.round(totalPercentile / metricCount) : 50;
  
  const aboveAverageCount = benchmarks.filter(b => b.interpretation === 'above_average').length;
  const belowAverageCount = benchmarks.filter(b => b.interpretation === 'below_average').length;
  
  let summary: string;
  if (overallPercentile >= 75) {
    summary = `Your organisation ranks in the top quartile (${overallPercentile}th percentile) against ${benchmarkData.name} peers. You demonstrate best-in-class performance across ${aboveAverageCount} of ${benchmarks.length} key metrics. Focus on sustaining competitive advantage through continuous improvement and emerging technology adoption.`;
  } else if (overallPercentile >= 50) {
    summary = `Your organisation ranks at the ${overallPercentile}th percentile against ${benchmarkData.name} peers. You outperform industry median in ${aboveAverageCount} areas with improvement opportunities in ${belowAverageCount} metrics. Targeted investments could move you into the top quartile within 12-18 months.`;
  } else if (overallPercentile >= 25) {
    summary = `Your organisation ranks at the ${overallPercentile}th percentile against ${benchmarkData.name} peers. There are significant opportunities to improve ${belowAverageCount} key metrics to reach industry median. A structured transformation programme is recommended.`;
  } else {
    summary = `Your organisation ranks in the bottom quartile (${overallPercentile}th percentile) against ${benchmarkData.name} peers. Comprehensive finance transformation is strongly recommended to address gaps across ${belowAverageCount} key areas and achieve competitive parity.`;
  }
  
  return {
    industry: benchmarkData.name,
    benchmarks,
    overallPercentile,
    summary,
  };
}

// ============================================
// STRESS TESTING PACK
// ============================================

export interface StressScenario {
  name: string;
  description: string;
  adjustments: {
    benefitMultiplier: number;
    costMultiplier: number;
    implementationDelayMonths: number;
    rampSlowdown: number;
  };
  results: {
    npv: number;
    roi: number;
    paybackMonths: number;
    breakeven: boolean;
  };
  covenantAnalysis: {
    meetsMinimumROI: boolean;
    meetsPaybackTarget: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface StressTestResult {
  scenarios: StressScenario[];
  worstCase: StressScenario;
  bestCase: StressScenario;
  probabilityOfBreakeven: number;
  headroom: {
    benefitReductionBeforeBreakeven: number;
    costIncreaseBeforeBreakeven: number;
  };
  summary: string;
}

const STRESS_SCENARIO_CONFIGS = [
  {
    name: "Baseline",
    description: "Current assumptions with no adjustments",
    adjustments: {
      benefitMultiplier: 1.0,
      costMultiplier: 1.0,
      implementationDelayMonths: 0,
      rampSlowdown: 1.0,
    },
  },
  {
    name: "Recession Scenario",
    description: "30% benefit reduction, 20% cost increase, 6-month implementation delay",
    adjustments: {
      benefitMultiplier: 0.70,
      costMultiplier: 1.20,
      implementationDelayMonths: 6,
      rampSlowdown: 1.0,
    },
  },
  {
    name: "Delayed Implementation",
    description: "50% longer timeline, 15% cost overrun",
    adjustments: {
      benefitMultiplier: 1.0,
      costMultiplier: 1.15,
      implementationDelayMonths: 6,
      rampSlowdown: 1.5,
    },
  },
  {
    name: "Vendor Issues",
    description: "25% additional integration costs, 40% slower benefit ramp",
    adjustments: {
      benefitMultiplier: 1.0,
      costMultiplier: 1.25,
      implementationDelayMonths: 0,
      rampSlowdown: 1.4,
    },
  },
  {
    name: "Conservative Scenario",
    description: "All assumptions at pessimistic end - worst case planning",
    adjustments: {
      benefitMultiplier: 0.65,
      costMultiplier: 1.30,
      implementationDelayMonths: 9,
      rampSlowdown: 1.6,
    },
  },
];

function applyStressAdjustments(
  profile: RoiInputs,
  adjustments: StressScenario['adjustments']
): RoiInputs {
  const adjusted = cloneProfile(profile);
  
  const processEfficiency = toNumber(adjusted.processEfficiencyPercent);
  adjusted.processEfficiencyPercent = processEfficiency * adjustments.benefitMultiplier;
  
  const headcount = toNumber(adjusted.headcountDelta);
  adjusted.headcountDelta = Math.floor(headcount * adjustments.benefitMultiplier);
  
  adjusted.closeAccelerationValue = toNumber(adjusted.closeAccelerationValue) * adjustments.benefitMultiplier;
  adjusted.complianceRiskAvoidance = toNumber(adjusted.complianceRiskAvoidance) * adjustments.benefitMultiplier;
  adjusted.auditEfficiencySavings = toNumber(adjusted.auditEfficiencySavings) * adjustments.benefitMultiplier;
  adjusted.revenueEnablement = toNumber(adjusted.revenueEnablement) * adjustments.benefitMultiplier;
  adjusted.externalConsultingSavings = toNumber(adjusted.externalConsultingSavings) * adjustments.benefitMultiplier;
  
  adjusted.softwareLicenses = toNumber(adjusted.softwareLicenses) * adjustments.costMultiplier;
  adjusted.integrationCosts = toNumber(adjusted.integrationCosts) * adjustments.costMultiplier;
  adjusted.dataMigration = toNumber(adjusted.dataMigration) * adjustments.costMultiplier;
  adjusted.changeManagement = toNumber(adjusted.changeManagement) * adjustments.costMultiplier;
  adjusted.internalFteCosts = toNumber(adjusted.internalFteCosts) * adjustments.costMultiplier;
  adjusted.trainingCosts = toNumber(adjusted.trainingCosts) * adjustments.costMultiplier;
  adjusted.contingency = toNumber(adjusted.contingency) * adjustments.costMultiplier;
  
  const baseRampY1 = toNumber(adjusted.benefitRampYear1, 25);
  const baseRampY2 = toNumber(adjusted.benefitRampYear2, 75);
  const baseRampY3 = toNumber(adjusted.benefitRampYear3, 100);
  
  adjusted.benefitRampYear1 = Math.max(5, baseRampY1 / adjustments.rampSlowdown);
  adjusted.benefitRampYear2 = Math.max(15, baseRampY2 / adjustments.rampSlowdown);
  adjusted.benefitRampYear3 = Math.max(50, baseRampY3 / adjustments.rampSlowdown);
  
  return adjusted;
}

function calculateScenarioResults(
  profile: RoiInputs,
  adjustments: StressScenario['adjustments']
): StressScenario['results'] {
  const adjustedProfile = applyStressAdjustments(profile, adjustments);
  const metrics = calculateRoiMetrics(adjustedProfile);
  
  const delayPenalty = adjustments.implementationDelayMonths > 0
    ? (metrics.totalAnnualBenefits / 12) * adjustments.implementationDelayMonths * 0.5
    : 0;
  
  const adjustedNpv = metrics.npvValue - delayPenalty;
  const adjustedPayback = metrics.paybackMonths + adjustments.implementationDelayMonths;
  
  return {
    npv: Math.round(adjustedNpv * 10) / 10,
    roi: Math.round(metrics.roiPercent * 10) / 10,
    paybackMonths: Math.round(adjustedPayback * 10) / 10,
    breakeven: adjustedNpv > 0,
  };
}

function calculateCovenantAnalysis(
  results: StressScenario['results']
): StressScenario['covenantAnalysis'] {
  const meetsMinimumROI = results.roi > 15;
  const meetsPaybackTarget = results.paybackMonths < 36;
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  if (!results.breakeven) {
    riskLevel = 'critical';
  } else if (!meetsMinimumROI && !meetsPaybackTarget) {
    riskLevel = 'high';
  } else if (!meetsMinimumROI || !meetsPaybackTarget) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  return {
    meetsMinimumROI,
    meetsPaybackTarget,
    riskLevel,
  };
}

function findBenefitReductionBreakeven(profile: RoiInputs): number {
  let low = 0;
  let high = 100;
  const tolerance = 0.5;
  
  const baseMetrics = calculateRoiMetrics(profile);
  if (baseMetrics.npvValue <= 0) return 0;
  
  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const multiplier = 1 - (mid / 100);
    
    const testProfile = applyStressAdjustments(profile, {
      benefitMultiplier: multiplier,
      costMultiplier: 1.0,
      implementationDelayMonths: 0,
      rampSlowdown: 1.0,
    });
    
    const metrics = calculateRoiMetrics(testProfile);
    
    if (metrics.npvValue > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return Math.round(low * 10) / 10;
}

function findCostIncreaseBreakeven(profile: RoiInputs): number {
  let low = 0;
  let high = 200;
  const tolerance = 0.5;
  
  const baseMetrics = calculateRoiMetrics(profile);
  if (baseMetrics.npvValue <= 0) return 0;
  
  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const multiplier = 1 + (mid / 100);
    
    const testProfile = applyStressAdjustments(profile, {
      benefitMultiplier: 1.0,
      costMultiplier: multiplier,
      implementationDelayMonths: 0,
      rampSlowdown: 1.0,
    });
    
    const metrics = calculateRoiMetrics(testProfile);
    
    if (metrics.npvValue > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return Math.round(low * 10) / 10;
}

/**
 * Run stress tests with downside scenarios and covenant analysis
 * 
 * Evaluates business case resilience under adverse conditions including
 * recession, implementation delays, vendor issues, and conservative assumptions.
 */
export function runStressTests(profile: RoiInputs): StressTestResult {
  const scenarios: StressScenario[] = STRESS_SCENARIO_CONFIGS.map(config => {
    const results = calculateScenarioResults(profile, config.adjustments);
    const covenantAnalysis = calculateCovenantAnalysis(results);
    
    return {
      name: config.name,
      description: config.description,
      adjustments: config.adjustments,
      results,
      covenantAnalysis,
    };
  });
  
  const validScenarios = scenarios.filter(s => s.results.npv !== 0 || s.name === "Baseline");
  
  const sortedByNpv = [...validScenarios].sort((a, b) => a.results.npv - b.results.npv);
  const worstCase = sortedByNpv[0] || scenarios[0];
  const bestCase = sortedByNpv[sortedByNpv.length - 1] || scenarios[0];
  
  const breakevenCount = scenarios.filter(s => s.results.breakeven).length;
  const probabilityOfBreakeven = Math.round((breakevenCount / scenarios.length) * 100);
  
  const benefitReductionBeforeBreakeven = findBenefitReductionBreakeven(profile);
  const costIncreaseBeforeBreakeven = findCostIncreaseBreakeven(profile);
  
  const criticalCount = scenarios.filter(s => s.covenantAnalysis.riskLevel === 'critical').length;
  const highRiskCount = scenarios.filter(s => s.covenantAnalysis.riskLevel === 'high').length;
  
  let summary: string;
  
  if (criticalCount >= 3) {
    summary = `The business case shows significant vulnerability under stress conditions. ${criticalCount} of ${scenarios.length} scenarios fail to break even. Benefits can only drop ${benefitReductionBeforeBreakeven}% before NPV turns negative. Risk mitigation strategies are essential before proceeding.`;
  } else if (criticalCount >= 1) {
    summary = `The business case is moderately resilient but fails under ${criticalCount} extreme scenario(s). The worst case (${worstCase.name}) yields NPV of £${Math.round(worstCase.results.npv)}k. Consider contingency planning for downside scenarios.`;
  } else if (highRiskCount >= 2) {
    summary = `The business case remains positive across all scenarios but ${highRiskCount} scenarios show elevated risk (missing ROI or payback targets). Headroom analysis shows benefits can drop ${benefitReductionBeforeBreakeven}% or costs rise ${costIncreaseBeforeBreakeven}% before breaking even.`;
  } else {
    summary = `The business case demonstrates strong resilience across stress scenarios. All scenarios achieve breakeven with ${probabilityOfBreakeven}% probability. The investment can withstand up to ${benefitReductionBeforeBreakeven}% benefit reduction or ${costIncreaseBeforeBreakeven}% cost increase while remaining NPV-positive.`;
  }
  
  return {
    scenarios,
    worstCase,
    bestCase,
    probabilityOfBreakeven,
    headroom: {
      benefitReductionBeforeBreakeven,
      costIncreaseBeforeBreakeven,
    },
    summary,
  };
}
