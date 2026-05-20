/**
 * ROI/TCO Calculator Utility
 * 
 * Shared calculation logic for Finance Transformation ROI metrics.
 * Used by both frontend (live preview) and backend (stored calculations).
 */

import type { FcRoiProfile } from "./finance-compass-schema";
import { 
  INDUSTRIES, 
  getMetricBenchmarks, 
  calculateAsIsVsToBe,
  type BenchmarkRange,
} from "./epm-benchmarks";
import { getHistoricalBenchmark, BENCHMARK_YEARS, type BenchmarkYear, type IndustryId, type MetricId } from './constancia-historical-benchmarks';
import {
  ROI_DEFAULTS,
  clamp,
  inflatedAnnualCost,
  validateInRange,
  validateNonNegative,
} from './scoring-engine';

export interface RoiMetrics {
  totalImplementationCost: number;
  totalAnnualBenefits: number;
  totalAnnualCosts: number;
  netAnnualBenefit: number;
  roiPercent: number;
  totalCostOfOwnership: number;
  paybackMonths: number;
  npvValue: number;
  benefitCostRatio: number;
}

export interface RoiInputs {
  currency?: string;
  horizonYears?: number;
  baselineOperatingCost?: number | null;
  transformationBudget?: number | null;
  softwareLicenses?: number | null;
  integrationCosts?: number | null;
  dataMigration?: number | null;
  changeManagement?: number | null;
  internalFteCosts?: number | null;
  trainingCosts?: number | null;
  contingency?: number | null;
  processEfficiencyPercent?: number | null;
  headcountDelta?: number | null;
  /**
   * Fully-loaded average finance FTE cost in £k. Used to convert
   * `headcountDelta` into a money figure. Defaults to ROI_DEFAULTS.
   * AVG_SALARY_GBP / 1000 if not provided; the ROI wizard surfaces
   * this as a user-editable input so geographies with different
   * cost bases (UK vs India vs US) can model accurately.
   */
  avgFteCostK?: number | null;
  closeAccelerationDays?: number | null;
  closeAccelerationValue?: number | null;
  complianceRiskAvoidance?: number | null;
  auditEfficiencySavings?: number | null;
  revenueEnablement?: number | null;
  externalConsultingSavings?: number | null;
  runRateOpex?: number | null;
  supportCosts?: number | null;
  depreciation?: number | null;
  discountRate?: number | null;
  inflationRate?: number | null;
  benefitRampYear1?: number | null;
  benefitRampYear2?: number | null;
  benefitRampYear3?: number | null;
}

function toNumber(value: number | null | undefined, defaultValue = 0): number {
  return value ?? defaultValue;
}

/**
 * Calculate all ROI metrics from a profile's inputs.
 * All monetary values are in £k (thousands).
 */
export function calculateRoiMetrics(profile: RoiInputs | FcRoiProfile): RoiMetrics {
  // Validate user inputs at the calculator boundary. Out-of-range or
  // negative values fall back to safe defaults instead of producing
  // NaN, Infinity, or absurd ROIs from typos.
  const horizonYears = validateInRange(profile.horizonYears, 1, ROI_DEFAULTS.MAX_HORIZON_YEARS, 3);
  const baselineOperatingCost = validateNonNegative(profile.baselineOperatingCost);

  // Implementation Costs (£k)
  const softwareLicenses = validateNonNegative(profile.softwareLicenses);
  const integrationCosts = validateNonNegative(profile.integrationCosts);
  const dataMigration = validateNonNegative(profile.dataMigration);
  const changeManagement = validateNonNegative(profile.changeManagement);
  const internalFteCosts = validateNonNegative(profile.internalFteCosts);
  const trainingCosts = validateNonNegative(profile.trainingCosts);
  const contingency = validateNonNegative(profile.contingency);

  const totalImplementationCost =
    softwareLicenses +
    integrationCosts +
    dataMigration +
    changeManagement +
    internalFteCosts +
    trainingCosts +
    contingency;

  // Benefit Streams (£k per year at full run-rate)
  const processEfficiencyPercent = validateInRange(profile.processEfficiencyPercent, 0, 100, 0);
  const efficiencySavings = (processEfficiencyPercent / 100) * baselineOperatingCost;

  const headcountDelta = validateInRange(
    profile.headcountDelta,
    -ROI_DEFAULTS.MAX_HEADCOUNT_DELTA,
    ROI_DEFAULTS.MAX_HEADCOUNT_DELTA,
    0,
  );
  // Salary is now an input. Profile value (in £k) wins; otherwise we
  // fall back to the ROI_DEFAULTS baseline. Negative or insane values
  // are clamped via validateInRange.
  // avgFteCostK isn't on the persisted FcRoiProfile type — only on
  // RoiInputs — so we read it defensively from either shape.
  const avgFteCostK = validateInRange(
    (profile as RoiInputs).avgFteCostK,
    20,
    500,
    ROI_DEFAULTS.AVG_SALARY_GBP / 1000,
  );
  const headcountSavings = headcountDelta * avgFteCostK;

  const closeAccelerationValue = validateNonNegative(profile.closeAccelerationValue);
  const complianceRiskAvoidance = validateNonNegative(profile.complianceRiskAvoidance);
  const auditEfficiencySavings = validateNonNegative(profile.auditEfficiencySavings);
  const revenueEnablement = validateNonNegative(profile.revenueEnablement);
  const externalConsultingSavings = validateNonNegative(profile.externalConsultingSavings);

  const totalAnnualBenefits =
    efficiencySavings +
    headcountSavings +
    closeAccelerationValue +
    complianceRiskAvoidance +
    auditEfficiencySavings +
    revenueEnablement +
    externalConsultingSavings;

  // Operating Model Costs (Annual £k)
  const runRateOpex = validateNonNegative(profile.runRateOpex);
  const supportCosts = validateNonNegative(profile.supportCosts);
  const depreciation = validateNonNegative(profile.depreciation);

  const totalAnnualCosts = runRateOpex + supportCosts + depreciation;

  // Net annual benefit (at full run-rate)
  const netAnnualBenefit = totalAnnualBenefits - totalAnnualCosts;

  // Ramp-up factors and macro rates.
  const discountRate = validateInRange(profile.discountRate, 0, ROI_DEFAULTS.MAX_DISCOUNT_RATE * 100, 8) / 100;
  const inflationRate = validateInRange(profile.inflationRate, -10, 20, 0) / 100;
  const benefitRampYear1 = validateInRange(profile.benefitRampYear1, 0, 100, ROI_DEFAULTS.RAMP_FACTORS[0] * 100) / 100;
  const benefitRampYear2 = validateInRange(profile.benefitRampYear2, 0, 100, ROI_DEFAULTS.RAMP_FACTORS[1] * 100) / 100;
  const benefitRampYear3 = validateInRange(profile.benefitRampYear3, 0, 100, ROI_DEFAULTS.RAMP_FACTORS[2] * 100) / 100;

  // TCO over the horizon. With inflation applied so the operating
  // costs in year N reflect compounded price increases. Costs grow,
  // benefits stay at their ramped £-figure (modelling the squeeze
  // realistically).
  let totalAnnualCostsOverHorizon = 0;
  for (let year = 1; year <= horizonYears; year++) {
    totalAnnualCostsOverHorizon += inflatedAnnualCost(totalAnnualCosts, inflationRate, year);
  }
  const totalCostOfOwnership = totalImplementationCost + totalAnnualCostsOverHorizon;

  // Payback Months = (Implementation Cost / Net Annual Benefit at full rate) × 12.
  // Uses full run-rate benefit for payback calculation.
  const paybackMonths = netAnnualBenefit > 0
    ? (totalImplementationCost / netAnnualBenefit) * 12
    : 999;

  // NPV Calculation with benefit ramp-up + inflated costs.
  let npvValue = -totalImplementationCost;
  let totalBenefitsWithRamp = 0;

  for (let year = 1; year <= horizonYears; year++) {
    let rampFactor: number;
    if (year === 1) rampFactor = benefitRampYear1;
    else if (year === 2) rampFactor = benefitRampYear2;
    else rampFactor = benefitRampYear3;

    const yearlyBenefit = totalAnnualBenefits * rampFactor;
    totalBenefitsWithRamp += yearlyBenefit;
    const yearlyCost = inflatedAnnualCost(totalAnnualCosts, inflationRate, year);
    const yearlyNetCashFlow = yearlyBenefit - yearlyCost;
    const discountFactor = Math.pow(1 + discountRate, year);
    npvValue += yearlyNetCashFlow / discountFactor;
  }

  // ROI % = (NPV / Implementation Cost) × 100 — finite-guarded.
  const roiPercent = totalImplementationCost > 0
    ? clamp((npvValue / totalImplementationCost) * 100, -10_000, 10_000, 0)
    : 0;
  
  // Benefit-Cost Ratio = Total Benefits over horizon / Total Costs over horizon (inflated).
  const totalCostsOverHorizon = totalImplementationCost + totalAnnualCostsOverHorizon;
  const benefitCostRatio = totalCostsOverHorizon > 0
    ? totalBenefitsWithRamp / totalCostsOverHorizon
    : 0;
  
  return {
    totalImplementationCost: Math.round(totalImplementationCost * 10) / 10,
    totalAnnualBenefits: Math.round(totalAnnualBenefits * 10) / 10,
    totalAnnualCosts: Math.round(totalAnnualCosts * 10) / 10,
    netAnnualBenefit: Math.round(netAnnualBenefit * 10) / 10,
    roiPercent: Math.round(roiPercent * 10) / 10,
    totalCostOfOwnership: Math.round(totalCostOfOwnership * 10) / 10,
    paybackMonths: Math.min(Math.round(paybackMonths * 10) / 10, 999),
    npvValue: Math.round(npvValue * 10) / 10,
    benefitCostRatio: Math.round(benefitCostRatio * 100) / 100,
  };
}

/**
 * Format currency value for display
 * Values are in £k (thousands), so 500 = £500k, 5000 = £5m
 */
export function formatCurrency(value: number, currency: string = "GBP"): string {
  const symbols: Record<string, string> = {
    GBP: "£",
    USD: "$",
    EUR: "€",
  };
  const symbol = symbols[currency] || "£";
  
  // Format with thousands separators for clarity
  if (Math.abs(value) >= 1000) {
    // Show as millions (value is already in £k)
    return `${symbol}${(value / 1000).toFixed(1)}m`;
  }
  if (Math.abs(value) >= 100) {
    // Show rounded thousands
    return `${symbol}${Math.round(value).toLocaleString()}k`;
  }
  if (value === 0) {
    return `${symbol}0`;
  }
  // Show with decimal for small values
  return `${symbol}${value.toFixed(1)}k`;
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  if (value >= 1000) return ">1000%";
  if (value <= -1000) return "<-1000%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/**
 * Format payback period for display
 */
export function formatPayback(months: number): string {
  if (months >= 999) return "N/A";
  if (months < 12) return `${months.toFixed(0)} months`;
  const years = Math.floor(months / 12);
  const remainingMonths = Math.round(months % 12);
  if (remainingMonths === 0) return `${years} year${years > 1 ? "s" : ""}`;
  return `${years}y ${remainingMonths}m`;
}

// ============================================
// SCENARIO COMPARISON
// ============================================

export interface DoNothingScenario {
  annualInefficiencyCost: number;
  annualManualEffortCost: number;
  annualRiskExposure: number;
  totalAnnualOpportunityCost: number;
  cumulativeOpportunityCost: number;
}

export interface ScenarioComparison {
  doNothing: {
    tco: number;
    totalBenefits: number;
    netValue: number;
    roiPercent: number;
    paybackMonths: number;
    npv: number;
  };
  withTransformation: {
    tco: number;
    totalBenefits: number;
    netValue: number;
    roiPercent: number;
    paybackMonths: number;
    npv: number;
  };
  delta: {
    tcoSavings: number;
    additionalBenefits: number;
    netValueDelta: number;
    roiImprovement: number;
    paybackDelta: number;
    npvDelta: number;
  };
}

/**
 * Calculate the "Do Nothing" scenario - represents the cost of continued inefficiency
 * This is NOT what you spend, but what you LOSE by not transforming (opportunity cost)
 */
export function calculateDoNothingScenario(profile: RoiInputs): DoNothingScenario {
  const horizonYears = toNumber(profile.horizonYears, 3);
  const baselineOperatingCost = toNumber(profile.baselineOperatingCost);
  const processEfficiencyPercent = toNumber(profile.processEfficiencyPercent);
  
  // Annual inefficiency cost = what you'd save with process efficiency gains
  const annualInefficiencyCost = (processEfficiencyPercent / 100) * baselineOperatingCost;
  
  // Manual effort costs = FTE savings you're not getting. Salary
  // taken from the user-editable input; falls back to the centralised
  // default (£80k) if not supplied.
  const headcountDelta = toNumber(profile.headcountDelta);
  const avgSalaryWithOverhead = validateInRange(
    (profile as RoiInputs).avgFteCostK,
    20,
    500,
    ROI_DEFAULTS.AVG_SALARY_GBP / 1000,
  );
  const annualManualEffortCost = headcountDelta * avgSalaryWithOverhead;
  
  // Risk exposure = compliance/audit costs you're still incurring
  const complianceRiskAvoidance = toNumber(profile.complianceRiskAvoidance);
  const auditEfficiencySavings = toNumber(profile.auditEfficiencySavings);
  const annualRiskExposure = complianceRiskAvoidance + auditEfficiencySavings;
  
  // Total annual opportunity cost (foregone benefits)
  const totalAnnualOpportunityCost = annualInefficiencyCost + annualManualEffortCost + annualRiskExposure;
  
  // Cumulative opportunity cost over the horizon (without benefit ramp-up for do-nothing)
  const cumulativeOpportunityCost = totalAnnualOpportunityCost * horizonYears;
  
  return {
    annualInefficiencyCost: Math.round(annualInefficiencyCost * 10) / 10,
    annualManualEffortCost: Math.round(annualManualEffortCost * 10) / 10,
    annualRiskExposure: Math.round(annualRiskExposure * 10) / 10,
    totalAnnualOpportunityCost: Math.round(totalAnnualOpportunityCost * 10) / 10,
    cumulativeOpportunityCost: Math.round(cumulativeOpportunityCost * 10) / 10,
  };
}

/**
 * Calculate scenario comparison between "Do Nothing" and "With Transformation"
 * 
 * Do-Nothing: Status quo - no investment, no benefits, no change in net position
 * With-Transformation: Full investment + operating costs, but with transformation benefits
 * Delta: The net value created by the transformation investment
 * 
 * Note: We do NOT subtract "opportunity costs" from do-nothing as that would double-count
 * the benefits already shown in the transformation scenario.
 */
export function calculateScenarioComparison(profile: RoiInputs): ScenarioComparison {
  const transformationMetrics = calculateRoiMetrics(profile);
  const doNothingScenario = calculateDoNothingScenario(profile);
  const horizonYears = toNumber(profile.horizonYears, 3);
  
  // === Do Nothing Scenario ===
  // Represents staying with current state - no investment, no improvement
  // Net Value = 0 (baseline reference point, not negative opportunity cost)
  const doNothingTco = 0;
  const doNothingBenefits = 0;
  const doNothingNetValue = 0; // Status quo baseline
  const doNothingNpv = 0; // No investment, no cash flows
  
  // === With Transformation Scenario ===
  // Calculate total net benefits over horizon (benefits minus annual operating costs)
  const yearByYear = calculateYearByYearAnalysis(profile);
  const withTransformationTco = transformationMetrics.totalCostOfOwnership;
  const withTransformationBenefits = yearByYear.totals.totalBenefits;
  // Net Value = Benefits - Total Costs (implementation + operating)
  const withTransformationNetValue = yearByYear.totals.totalNet;
  const withTransformationNpv = transformationMetrics.npvValue;
  
  // === Delta (Value of Transformation) ===
  // Simple comparison: transformation outcome vs status quo (0)
  const netValueDelta = withTransformationNetValue;
  const npvDelta = withTransformationNpv;
  
  return {
    doNothing: {
      tco: 0,
      totalBenefits: 0,
      netValue: 0,
      roiPercent: 0,
      paybackMonths: 999,
      npv: 0,
    },
    withTransformation: {
      tco: Math.round(withTransformationTco * 10) / 10,
      totalBenefits: Math.round(withTransformationBenefits * 10) / 10,
      netValue: Math.round(withTransformationNetValue * 10) / 10,
      roiPercent: transformationMetrics.roiPercent,
      paybackMonths: transformationMetrics.paybackMonths,
      npv: Math.round(withTransformationNpv * 10) / 10,
    },
    delta: {
      tcoSavings: 0,
      additionalBenefits: Math.round(withTransformationBenefits * 10) / 10,
      netValueDelta: Math.round(netValueDelta * 10) / 10,
      roiImprovement: transformationMetrics.roiPercent,
      paybackDelta: 999 - transformationMetrics.paybackMonths,
      npvDelta: Math.round(npvDelta * 10) / 10,
    },
  };
}

function calculateTotalBenefitsOverHorizon(profile: RoiInputs): number {
  const horizonYears = toNumber(profile.horizonYears, 3);
  const benefitRampYear1 = toNumber(profile.benefitRampYear1, 25) / 100;
  const benefitRampYear2 = toNumber(profile.benefitRampYear2, 75) / 100;
  const benefitRampYear3 = toNumber(profile.benefitRampYear3, 100) / 100;
  
  const metrics = calculateRoiMetrics(profile);
  let totalBenefits = 0;
  
  for (let year = 1; year <= horizonYears; year++) {
    let rampFactor: number;
    if (year === 1) rampFactor = benefitRampYear1;
    else if (year === 2) rampFactor = benefitRampYear2;
    else rampFactor = benefitRampYear3;
    
    totalBenefits += metrics.totalAnnualBenefits * rampFactor;
  }
  
  return totalBenefits;
}

// ============================================
// YEAR-BY-YEAR ANALYSIS
// ============================================

export interface YearByYearRow {
  year: number;
  costs: number;
  benefits: number;
  netCashFlow: number;
  discountedCashFlow: number;
  cumulativeNpv: number;
}

export interface YearByYearAnalysis {
  rows: YearByYearRow[];
  totals: {
    totalCosts: number;
    totalBenefits: number;
    totalNet: number;
    finalNpv: number;
  };
}

/**
 * Calculate year-by-year analysis with costs, benefits, and NPV
 */
export function calculateYearByYearAnalysis(profile: RoiInputs): YearByYearAnalysis {
  const horizonYears = toNumber(profile.horizonYears, 3);
  const discountRate = toNumber(profile.discountRate, 8) / 100;
  const benefitRampYear1 = toNumber(profile.benefitRampYear1, 25) / 100;
  const benefitRampYear2 = toNumber(profile.benefitRampYear2, 75) / 100;
  const benefitRampYear3 = toNumber(profile.benefitRampYear3, 100) / 100;
  
  const metrics = calculateRoiMetrics(profile);
  const totalImplementationCost = metrics.totalImplementationCost;
  const totalAnnualBenefits = metrics.totalAnnualBenefits;
  const totalAnnualCosts = metrics.totalAnnualCosts;
  
  const rows: YearByYearRow[] = [];
  let cumulativeNpv = 0;
  let totalCosts = 0;
  let totalBenefits = 0;
  let totalNet = 0;
  
  // Year 0 - Implementation costs only
  const year0Costs = totalImplementationCost;
  const year0Benefits = 0;
  const year0Net = -year0Costs;
  cumulativeNpv = year0Net; // No discounting for Year 0
  totalCosts += year0Costs;
  totalNet += year0Net;
  
  rows.push({
    year: 0,
    costs: Math.round(year0Costs * 10) / 10,
    benefits: 0,
    netCashFlow: Math.round(year0Net * 10) / 10,
    discountedCashFlow: Math.round(year0Net * 10) / 10,
    cumulativeNpv: Math.round(cumulativeNpv * 10) / 10,
  });
  
  // Years 1 to horizonYears
  for (let year = 1; year <= horizonYears; year++) {
    let rampFactor: number;
    if (year === 1) rampFactor = benefitRampYear1;
    else if (year === 2) rampFactor = benefitRampYear2;
    else rampFactor = benefitRampYear3;
    
    const yearCosts = totalAnnualCosts;
    const yearBenefits = totalAnnualBenefits * rampFactor;
    const netCashFlow = yearBenefits - yearCosts;
    const discountFactor = Math.pow(1 + discountRate, year);
    const discountedCashFlow = netCashFlow / discountFactor;
    cumulativeNpv += discountedCashFlow;
    
    totalCosts += yearCosts;
    totalBenefits += yearBenefits;
    totalNet += netCashFlow;
    
    rows.push({
      year,
      costs: Math.round(yearCosts * 10) / 10,
      benefits: Math.round(yearBenefits * 10) / 10,
      netCashFlow: Math.round(netCashFlow * 10) / 10,
      discountedCashFlow: Math.round(discountedCashFlow * 10) / 10,
      cumulativeNpv: Math.round(cumulativeNpv * 10) / 10,
    });
  }
  
  return {
    rows,
    totals: {
      totalCosts: Math.round(totalCosts * 10) / 10,
      totalBenefits: Math.round(totalBenefits * 10) / 10,
      totalNet: Math.round(totalNet * 10) / 10,
      finalNpv: Math.round(cumulativeNpv * 10) / 10,
    },
  };
}

// ============================================
// SENSITIVITY ANALYSIS
// ============================================

export interface SensitivityVariable {
  name: string;
  key: string;
  min: number;
  max: number;
  current: number;
  unit: string;
}

export interface SensitivityCase {
  label: string;
  roiPercent: number;
  npv: number;
  paybackMonths: number;
}

export interface SensitivityAnalysis {
  variables: SensitivityVariable[];
  bestCase: SensitivityCase;
  midCase: SensitivityCase;
  worstCase: SensitivityCase;
}

/**
 * Deep clone an ROI profile to avoid any mutation of the original
 */
function cloneRoiProfile(profile: RoiInputs): RoiInputs {
  return {
    currency: profile.currency,
    horizonYears: profile.horizonYears,
    baselineOperatingCost: profile.baselineOperatingCost,
    transformationBudget: profile.transformationBudget,
    softwareLicenses: profile.softwareLicenses,
    integrationCosts: profile.integrationCosts,
    dataMigration: profile.dataMigration,
    changeManagement: profile.changeManagement,
    internalFteCosts: profile.internalFteCosts,
    trainingCosts: profile.trainingCosts,
    contingency: profile.contingency,
    processEfficiencyPercent: profile.processEfficiencyPercent,
    headcountDelta: profile.headcountDelta,
    closeAccelerationDays: profile.closeAccelerationDays,
    closeAccelerationValue: profile.closeAccelerationValue,
    complianceRiskAvoidance: profile.complianceRiskAvoidance,
    auditEfficiencySavings: profile.auditEfficiencySavings,
    revenueEnablement: profile.revenueEnablement,
    externalConsultingSavings: profile.externalConsultingSavings,
    runRateOpex: profile.runRateOpex,
    supportCosts: profile.supportCosts,
    depreciation: profile.depreciation,
    discountRate: profile.discountRate,
    inflationRate: profile.inflationRate,
    benefitRampYear1: profile.benefitRampYear1,
    benefitRampYear2: profile.benefitRampYear2,
    benefitRampYear3: profile.benefitRampYear3,
  };
}

/**
 * Calculate sensitivity analysis with best/mid/worst case outcomes
 * 
 * Best case: +20% efficiency benefits, -15% implementation costs, faster adoption
 * Worst case: -20% efficiency benefits, +15% implementation costs, slower adoption
 * 
 * All calculations use fresh profile clones to avoid any mutation
 */
export function calculateSensitivityAnalysis(profile: RoiInputs): SensitivityAnalysis {
  // Extract current values from profile (read-only)
  const currentEfficiency = toNumber(profile.processEfficiencyPercent);
  const currentLicenses = toNumber(profile.softwareLicenses);
  const currentIntegration = toNumber(profile.integrationCosts);
  const currentChangeManagement = toNumber(profile.changeManagement);
  const currentDiscountRate = toNumber(profile.discountRate, 8);
  const currentRampY1 = toNumber(profile.benefitRampYear1, 25);
  const currentRampY2 = toNumber(profile.benefitRampYear2, 75);
  
  // Define sensitivity ranges for display
  const variables: SensitivityVariable[] = [
    {
      name: "Process Efficiency",
      key: "processEfficiencyPercent",
      min: Math.max(0, currentEfficiency * 0.8), // -20%
      max: Math.min(100, currentEfficiency * 1.2), // +20%
      current: currentEfficiency,
      unit: "%",
    },
    {
      name: "Implementation Costs",
      key: "softwareLicenses",
      min: Math.max(0, currentLicenses * 0.85), // -15%
      max: currentLicenses * 1.15, // +15%
      current: currentLicenses,
      unit: "£k",
    },
    {
      name: "Discount Rate",
      key: "discountRate",
      min: Math.max(0, currentDiscountRate - 3),
      max: Math.min(20, currentDiscountRate + 3),
      current: currentDiscountRate,
      unit: "%",
    },
    {
      name: "Year 1 Adoption",
      key: "benefitRampYear1",
      min: Math.max(0, currentRampY1 - 15),
      max: Math.min(100, currentRampY1 + 15),
      current: currentRampY1,
      unit: "%",
    },
  ];
  
  // Calculate mid case (base case with current values)
  const midMetrics = calculateRoiMetrics(profile);
  const midCase: SensitivityCase = {
    label: "Expected",
    roiPercent: midMetrics.roiPercent,
    npv: midMetrics.npvValue,
    paybackMonths: midMetrics.paybackMonths,
  };
  
  // === Best Case (Optimistic) ===
  // +20% efficiency benefits, -15% implementation costs, +15% adoption speed
  const bestCaseProfile = cloneRoiProfile(profile);
  bestCaseProfile.processEfficiencyPercent = Math.min(100, currentEfficiency * 1.2);
  bestCaseProfile.softwareLicenses = currentLicenses * 0.85;
  bestCaseProfile.integrationCosts = currentIntegration * 0.85;
  bestCaseProfile.changeManagement = currentChangeManagement * 0.85;
  bestCaseProfile.benefitRampYear1 = Math.min(100, currentRampY1 + 15);
  bestCaseProfile.benefitRampYear2 = Math.min(100, currentRampY2 + 10);
  
  const bestMetrics = calculateRoiMetrics(bestCaseProfile);
  const bestCase: SensitivityCase = {
    label: "Optimistic",
    roiPercent: bestMetrics.roiPercent,
    npv: bestMetrics.npvValue,
    paybackMonths: bestMetrics.paybackMonths,
  };
  
  // === Worst Case (Conservative) ===
  // -20% efficiency benefits, +15% implementation costs, -15% adoption speed
  const worstCaseProfile = cloneRoiProfile(profile);
  worstCaseProfile.processEfficiencyPercent = Math.max(0, currentEfficiency * 0.8);
  worstCaseProfile.softwareLicenses = currentLicenses * 1.15;
  worstCaseProfile.integrationCosts = currentIntegration * 1.15;
  worstCaseProfile.changeManagement = currentChangeManagement * 1.15;
  worstCaseProfile.benefitRampYear1 = Math.max(0, currentRampY1 - 15);
  worstCaseProfile.benefitRampYear2 = Math.max(0, currentRampY2 - 10);
  
  const worstMetrics = calculateRoiMetrics(worstCaseProfile);
  const worstCase: SensitivityCase = {
    label: "Conservative",
    roiPercent: worstMetrics.roiPercent,
    npv: worstMetrics.npvValue,
    paybackMonths: worstMetrics.paybackMonths,
  };
  
  return {
    variables,
    bestCase,
    midCase,
    worstCase,
  };
}

// ============================================
// BENCHMARK COMPARISON
// ============================================

export interface BenchmarkMetricComparison {
  metricId: string;
  metricName: string;
  unit: string;
  current: number;
  typical: BenchmarkRange;
  oneQgGood: BenchmarkRange;
  gap: number;
  gapPct: number;
  performanceLevel: 'below_typical' | 'typical' | '1qg_good' | '1qg_best';
  lowerIsBetter: boolean;
}

export interface BenchmarkComparisonResult {
  industryId: string;
  industryName: string;
  year: number;
  metrics: BenchmarkMetricComparison[];
}

export interface BenchmarkInputs extends RoiInputs {
  industry?: string;
  currentCloseDays?: number | null;
  currentForecastAccuracy?: number | null;
  currentReportsAutomated?: number | null;
}

/**
 * Helper to compute benchmark comparison from historical data
 */
function computeHistoricalComparison(
  current: number,
  historicalData: {
    typical: { min: number; max: number; median: number };
    '1qg_good': { min: number; max: number };
    '1qg_best': { min: number; max: number };
    direction: 'lower_is_better' | 'higher_is_better';
  }
): {
  typical: BenchmarkRange;
  oneQgGood: BenchmarkRange;
  gap: number;
  gapPct: number;
  performanceLevel: 'below_typical' | 'typical' | '1qg_good' | '1qg_best';
  lowerIsBetter: boolean;
} {
  const lowerIsBetter = historicalData.direction === 'lower_is_better';
  const typical: BenchmarkRange = {
    min: historicalData.typical.min,
    max: historicalData.typical.max,
    mid: historicalData.typical.median,
  };
  const oneQgGood: BenchmarkRange = {
    min: historicalData['1qg_good'].min,
    max: historicalData['1qg_good'].max,
  };
  const oneQgBest = historicalData['1qg_best'];

  // Calculate gap to constancia_good target
  const targetValue = lowerIsBetter ? oneQgGood.max : oneQgGood.min;
  const gap = lowerIsBetter ? current - targetValue : targetValue - current;
  const gapPct = targetValue !== 0 ? (gap / targetValue) * 100 : 0;

  // Determine performance level
  let performanceLevel: 'below_typical' | 'typical' | '1qg_good' | '1qg_best';
  if (lowerIsBetter) {
    if (current <= oneQgBest.max) {
      performanceLevel = '1qg_best';
    } else if (current <= oneQgGood.max) {
      performanceLevel = '1qg_good';
    } else if (current <= typical.max) {
      performanceLevel = 'typical';
    } else {
      performanceLevel = 'below_typical';
    }
  } else {
    if (current >= oneQgBest.min) {
      performanceLevel = '1qg_best';
    } else if (current >= oneQgGood.min) {
      performanceLevel = '1qg_good';
    } else if (current >= typical.min) {
      performanceLevel = 'typical';
    } else {
      performanceLevel = 'below_typical';
    }
  }

  return {
    typical,
    oneQgGood,
    gap: Math.round(gap * 10) / 10,
    gapPct: Math.round(gapPct * 10) / 10,
    performanceLevel,
    lowerIsBetter,
  };
}

/**
 * Calculate benchmark comparison for key EPM metrics.
 * Compares current state values against industry benchmarks.
 * @param profile - The benchmark inputs containing current values
 * @param industryId - The industry to compare against (defaults to 'cross_industry')
 * @param year - Optional year for historical benchmarks (2020-2024, defaults to 2024)
 */
export function calculateBenchmarkComparison(
  profile: BenchmarkInputs,
  industryId: string = 'cross_industry',
  year?: number
): BenchmarkComparisonResult {
  const benchmarkYear = year && BENCHMARK_YEARS.includes(year as BenchmarkYear) ? year as BenchmarkYear : 2024;
  const industry = INDUSTRIES.find(i => i.id === industryId) || INDUSTRIES[0];
  const metrics: BenchmarkMetricComparison[] = [];

  // Days to Close - use currentCloseDays if provided, otherwise calculate from closeAccelerationDays
  const currentCloseDays = toNumber(profile.currentCloseDays, 10);
  const closeAccelerationDays = toNumber(profile.closeAccelerationDays, 0);
  const targetCloseDays = Math.max(1, currentCloseDays - closeAccelerationDays);
  
  // Try historical benchmark first when year !== 2024
  // Use targetCloseDays to show how planned improvement compares to benchmarks
  let closeMetricAdded = false;
  if (benchmarkYear !== 2024) {
    const historicalCloseData = getHistoricalBenchmark(industryId as IndustryId, benchmarkYear, 'days_to_close');
    if (historicalCloseData) {
      const closeComparison = computeHistoricalComparison(targetCloseDays, historicalCloseData);
      metrics.push({
        metricId: 'days_to_close',
        metricName: 'Monthly Close Cycle',
        unit: 'days',
        current: targetCloseDays,
        typical: closeComparison.typical,
        oneQgGood: closeComparison.oneQgGood,
        gap: closeComparison.gap,
        gapPct: closeComparison.gapPct,
        performanceLevel: closeComparison.performanceLevel,
        lowerIsBetter: closeComparison.lowerIsBetter,
      });
      closeMetricAdded = true;
    }
  }
  
  // Fall back to 2024 benchmark data (when year === 2024 or no historical data found)
  if (!closeMetricAdded) {
    const closeBenchmark = getMetricBenchmarks('days_to_close', industryId);
    if (closeBenchmark) {
      const closeAnalysis = calculateAsIsVsToBe(targetCloseDays, 'days_to_close', industryId, '1qg_good');
      if (closeAnalysis) {
        metrics.push({
          metricId: 'days_to_close',
          metricName: 'Monthly Close Cycle',
          unit: 'days',
          current: targetCloseDays,
          typical: closeAnalysis.typical,
          oneQgGood: closeAnalysis.target,
          gap: closeAnalysis.gap,
          gapPct: closeAnalysis.gapPct,
          performanceLevel: closeAnalysis.performanceLevel,
          lowerIsBetter: true,
        });
      }
    }
  }

  // Forecast Accuracy
  const currentForecastAccuracy = toNumber(profile.currentForecastAccuracy, 82);
  
  // Try historical benchmark first when year !== 2024
  let forecastMetricAdded = false;
  if (benchmarkYear !== 2024) {
    const historicalForecastData = getHistoricalBenchmark(industryId as IndustryId, benchmarkYear, 'forecast_accuracy_pct');
    if (historicalForecastData) {
      const forecastComparison = computeHistoricalComparison(currentForecastAccuracy, historicalForecastData);
      metrics.push({
        metricId: 'forecast_accuracy_pct',
        metricName: 'Forecast Accuracy',
        unit: '%',
        current: currentForecastAccuracy,
        typical: forecastComparison.typical,
        oneQgGood: forecastComparison.oneQgGood,
        gap: forecastComparison.gap,
        gapPct: forecastComparison.gapPct,
        performanceLevel: forecastComparison.performanceLevel,
        lowerIsBetter: forecastComparison.lowerIsBetter,
      });
      forecastMetricAdded = true;
    }
  }
  
  // Fall back to 2024 benchmark data
  if (!forecastMetricAdded) {
    const forecastBenchmark = getMetricBenchmarks('forecast_accuracy_pct', industryId);
    if (forecastBenchmark) {
      const forecastAnalysis = calculateAsIsVsToBe(currentForecastAccuracy, 'forecast_accuracy_pct', industryId, '1qg_good');
      if (forecastAnalysis) {
        metrics.push({
          metricId: 'forecast_accuracy_pct',
          metricName: 'Forecast Accuracy',
          unit: '%',
          current: currentForecastAccuracy,
          typical: forecastAnalysis.typical,
          oneQgGood: forecastAnalysis.target,
          gap: forecastAnalysis.gap,
          gapPct: forecastAnalysis.gapPct,
          performanceLevel: forecastAnalysis.performanceLevel,
          lowerIsBetter: false,
        });
      }
    }
  }

  // Reports Automated
  const currentReportsAutomated = toNumber(profile.currentReportsAutomated, 30);
  
  // Try historical benchmark first when year !== 2024
  let reportsMetricAdded = false;
  if (benchmarkYear !== 2024) {
    const historicalReportsData = getHistoricalBenchmark(industryId as IndustryId, benchmarkYear, 'reports_automated_pct');
    if (historicalReportsData) {
      const reportsComparison = computeHistoricalComparison(currentReportsAutomated, historicalReportsData);
      metrics.push({
        metricId: 'reports_automated_pct',
        metricName: 'Reporting Automation',
        unit: '%',
        current: currentReportsAutomated,
        typical: reportsComparison.typical,
        oneQgGood: reportsComparison.oneQgGood,
        gap: reportsComparison.gap,
        gapPct: reportsComparison.gapPct,
        performanceLevel: reportsComparison.performanceLevel,
        lowerIsBetter: reportsComparison.lowerIsBetter,
      });
      reportsMetricAdded = true;
    }
  }
  
  // Fall back to 2024 benchmark data
  if (!reportsMetricAdded) {
    const reportsBenchmark = getMetricBenchmarks('reports_automated_pct', industryId);
    if (reportsBenchmark) {
      const reportsAnalysis = calculateAsIsVsToBe(currentReportsAutomated, 'reports_automated_pct', industryId, '1qg_good');
      if (reportsAnalysis) {
        metrics.push({
          metricId: 'reports_automated_pct',
          metricName: 'Reporting Automation',
          unit: '%',
          current: currentReportsAutomated,
          typical: reportsAnalysis.typical,
          oneQgGood: reportsAnalysis.target,
          gap: reportsAnalysis.gap,
          gapPct: reportsAnalysis.gapPct,
          performanceLevel: reportsAnalysis.performanceLevel,
          lowerIsBetter: false,
        });
      }
    }
  }

  // Manual Reconciliations - estimate based on close days
  const estimatedReconciliations = Math.round(currentCloseDays * 7.5); // ~75 at 10 days
  const reconBenchmark = getMetricBenchmarks('manual_reconciliations', industryId);
  if (reconBenchmark) {
    const reconAnalysis = calculateAsIsVsToBe(estimatedReconciliations, 'manual_reconciliations', industryId, '1qg_good');
    if (reconAnalysis) {
      metrics.push({
        metricId: 'manual_reconciliations',
        metricName: 'Manual Reconciliations',
        unit: 'count',
        current: estimatedReconciliations,
        typical: reconAnalysis.typical,
        oneQgGood: reconAnalysis.target,
        gap: reconAnalysis.gap,
        gapPct: reconAnalysis.gapPct,
        performanceLevel: reconAnalysis.performanceLevel,
        lowerIsBetter: true,
      });
    }
  }

  // Close FTE Hours - estimate based on close days
  const estimatedCloseHours = Math.round(currentCloseDays * 10); // ~100 at 10 days
  const closeFteBenchmark = getMetricBenchmarks('close_fte_hours', industryId);
  if (closeFteBenchmark) {
    const closeFteAnalysis = calculateAsIsVsToBe(estimatedCloseHours, 'close_fte_hours', industryId, '1qg_good');
    if (closeFteAnalysis) {
      metrics.push({
        metricId: 'close_fte_hours',
        metricName: 'Close FTE Effort',
        unit: 'hours',
        current: estimatedCloseHours,
        typical: closeFteAnalysis.typical,
        oneQgGood: closeFteAnalysis.target,
        gap: closeFteAnalysis.gap,
        gapPct: closeFteAnalysis.gapPct,
        performanceLevel: closeFteAnalysis.performanceLevel,
        lowerIsBetter: true,
      });
    }
  }

  return {
    industryId,
    industryName: industry.name,
    year: benchmarkYear,
    metrics,
  };
}

/**
 * Get performance color class based on performance level
 */
export function getPerformanceColor(level: BenchmarkMetricComparison['performanceLevel']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case '1qg_best':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' };
    case '1qg_good':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' };
    case 'typical':
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' };
    case 'below_typical':
    default:
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' };
  }
}

/**
 * Get industry options for dropdown selection
 */
export function getIndustryOptions(): { id: string; name: string }[] {
  return INDUSTRIES.map(i => ({ id: i.id, name: i.name }));
}
