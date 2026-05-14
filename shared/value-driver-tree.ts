/**
 * Value Driver Tree Visualization Module
 * 
 * Provides hierarchical breakdown of ROI benefits for visualization.
 * Shows how total annual benefits are composed of individual value drivers.
 */

import type { RoiInputs, RoiMetrics } from "./roi-calculator";

export interface ValueDriverNode {
  id: string;
  name: string;
  value: number;
  percentage: number;
  category: 'primary' | 'secondary' | 'tertiary';
  children?: ValueDriverNode[];
  description?: string;
}

export interface ValueDriverTree {
  root: ValueDriverNode;
  totalValue: number;
  topDrivers: { name: string; value: number; percentage: number }[];
  summary: string;
}

function toNumber(value: number | null | undefined, defaultValue = 0): number {
  return value ?? defaultValue;
}

function round(value: number, decimals = 1): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return round((value / total) * 100, 1);
}

/**
 * Build a hierarchical value driver tree from ROI inputs and metrics.
 * 
 * Structure:
 * - Root: Total Annual Benefits
 *   - Level 1: Individual benefit streams (primary drivers)
 *     - Process Efficiency
 *     - Headcount Optimization
 *     - Close Cycle Acceleration
 *     - Compliance & Risk
 *     - Audit Efficiency
 *     - External Consulting
 */
export function buildValueDriverTree(profile: RoiInputs, metrics: RoiMetrics): ValueDriverTree {
  const baselineOperatingCost = toNumber(profile.baselineOperatingCost);
  const processEfficiencyPercent = toNumber(profile.processEfficiencyPercent);
  const headcountDelta = toNumber(profile.headcountDelta);
  const avgSalaryWithOverhead = 80;
  
  const efficiencyBenefits = round((processEfficiencyPercent / 100) * baselineOperatingCost);
  const headcountBenefits = round(headcountDelta * avgSalaryWithOverhead);
  const closeAccelerationValue = round(toNumber(profile.closeAccelerationValue));
  const complianceRiskAvoidance = round(toNumber(profile.complianceRiskAvoidance));
  const auditEfficiencySavings = round(toNumber(profile.auditEfficiencySavings));
  const externalConsultingSavings = round(toNumber(profile.externalConsultingSavings));
  
  const totalValue = metrics.totalAnnualBenefits;
  
  const children: ValueDriverNode[] = [];
  
  if (efficiencyBenefits > 0) {
    children.push({
      id: 'process-efficiency',
      name: 'Process Efficiency',
      value: efficiencyBenefits,
      percentage: calculatePercentage(efficiencyBenefits, totalValue),
      category: 'primary',
      description: `${processEfficiencyPercent}% improvement on £${baselineOperatingCost}k baseline operating cost`,
    });
  }
  
  if (headcountBenefits > 0) {
    children.push({
      id: 'headcount-optimization',
      name: 'Headcount Optimization',
      value: headcountBenefits,
      percentage: calculatePercentage(headcountBenefits, totalValue),
      category: 'primary',
      description: `${headcountDelta} FTE reduction at £${avgSalaryWithOverhead}k fully-loaded cost`,
    });
  }
  
  if (closeAccelerationValue > 0) {
    children.push({
      id: 'close-acceleration',
      name: 'Close Cycle Acceleration',
      value: closeAccelerationValue,
      percentage: calculatePercentage(closeAccelerationValue, totalValue),
      category: 'primary',
      description: 'Faster close cycles enabling earlier decision-making and reduced overtime',
    });
  }
  
  if (complianceRiskAvoidance > 0) {
    children.push({
      id: 'compliance-risk',
      name: 'Compliance & Risk',
      value: complianceRiskAvoidance,
      percentage: calculatePercentage(complianceRiskAvoidance, totalValue),
      category: 'secondary',
      description: 'Reduced regulatory risk and avoided penalties through improved controls',
    });
  }
  
  if (auditEfficiencySavings > 0) {
    children.push({
      id: 'audit-efficiency',
      name: 'Audit Efficiency',
      value: auditEfficiencySavings,
      percentage: calculatePercentage(auditEfficiencySavings, totalValue),
      category: 'secondary',
      description: 'Reduced audit preparation time and lower external audit fees',
    });
  }
  
  if (externalConsultingSavings > 0) {
    children.push({
      id: 'external-consulting',
      name: 'External Consulting',
      value: externalConsultingSavings,
      percentage: calculatePercentage(externalConsultingSavings, totalValue),
      category: 'tertiary',
      description: 'Reduced reliance on external consultants through improved internal capabilities',
    });
  }
  
  children.sort((a, b) => b.value - a.value);
  
  const root: ValueDriverNode = {
    id: 'total-benefits',
    name: 'Total Annual Benefits',
    value: totalValue,
    percentage: 100,
    category: 'primary',
    children,
    description: 'Combined annual value from all transformation benefit streams',
  };
  
  const topDrivers = children
    .slice(0, 3)
    .map(child => ({
      name: child.name,
      value: child.value,
      percentage: child.percentage,
    }));
  
  const topDriverNames = topDrivers.map(d => d.name);
  const topDriverPercentage = topDrivers.reduce((sum, d) => sum + d.percentage, 0);
  
  let summary: string;
  if (children.length === 0) {
    summary = 'No value drivers configured. Add benefit estimates to see the breakdown.';
  } else if (topDrivers.length === 1) {
    summary = `${topDrivers[0].name} drives ${topDrivers[0].percentage}% of total benefits at £${topDrivers[0].value}k annually.`;
  } else if (topDrivers.length === 2) {
    summary = `${topDriverNames[0]} and ${topDriverNames[1]} together account for ${round(topDriverPercentage)}% of total annual benefits.`;
  } else {
    summary = `Top 3 drivers (${topDriverNames.join(', ')}) represent ${round(topDriverPercentage)}% of £${totalValue}k total annual benefits.`;
  }
  
  return {
    root,
    totalValue,
    topDrivers,
    summary,
  };
}

/**
 * Get a flat list of all value drivers sorted by value (descending)
 */
export function getFlatDriverList(tree: ValueDriverTree): ValueDriverNode[] {
  return tree.root.children ? [...tree.root.children] : [];
}

/**
 * Get value drivers by category
 */
export function getDriversByCategory(
  tree: ValueDriverTree,
  category: 'primary' | 'secondary' | 'tertiary'
): ValueDriverNode[] {
  const children = tree.root.children || [];
  return children.filter(child => child.category === category);
}

/**
 * Calculate category-level aggregations
 */
export function getCategoryBreakdown(tree: ValueDriverTree): {
  primary: { value: number; percentage: number; count: number };
  secondary: { value: number; percentage: number; count: number };
  tertiary: { value: number; percentage: number; count: number };
} {
  const children = tree.root.children || [];
  const total = tree.totalValue;
  
  const sumByCategory = (cat: 'primary' | 'secondary' | 'tertiary') => {
    const filtered = children.filter(c => c.category === cat);
    const value = filtered.reduce((sum, c) => sum + c.value, 0);
    return {
      value: round(value),
      percentage: calculatePercentage(value, total),
      count: filtered.length,
    };
  };
  
  return {
    primary: sumByCategory('primary'),
    secondary: sumByCategory('secondary'),
    tertiary: sumByCategory('tertiary'),
  };
}
