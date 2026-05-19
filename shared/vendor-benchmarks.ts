/**
 * EPM/CPM Vendor Cost Benchmarks
 * 
 * Comprehensive vendor benchmarking data for EPM platform selection.
 * Sources: Constancia Benchmark Database, Gartner TCO Studies, UK Market Research 2024-2025
 * All costs in £k (thousands GBP)
 * 
 * Organization Size Bands:
 * - SMB: £50m-250m revenue
 * - Mid-Market: £250m-1bn revenue
 * - Enterprise: £1bn+ revenue
 * - Large Enterprise: £5bn+ revenue
 */

export type OrganizationSizeBand = 'smb' | 'mid_market' | 'enterprise' | 'large_enterprise';
export type ComplexityLevel = 'low' | 'medium' | 'high';
export type LicenseModel = 'named_user' | 'concurrent_user' | 'capacity_based' | 'hybrid';

export interface CostRange {
  min: number;
  max: number;
  typical?: number;
}

export interface ImplementationCostsBySize {
  smb: CostRange;
  mid_market: CostRange;
  enterprise: CostRange;
  large_enterprise: CostRange;
}

export interface LicenseCost {
  model: LicenseModel;
  perUserAnnual: CostRange;
  minimumUsers?: number;
  volumeDiscountThreshold?: number;
  volumeDiscountPercent?: number;
  platformFeeAnnual?: CostRange;
}

export interface OrganizationProfile {
  industryFocus: string[];
  complexityTolerance: ComplexityLevel;
  excelDependency: 'low' | 'medium' | 'high';
  aiReadiness: ComplexityLevel;
  bestFitRevenue: CostRange;
  primaryUseCases: string[];
}

export interface VendorBenchmark {
  id: string;
  name: string;
  category: 'tier1' | 'tier2' | 'specialist';
  description: string;
  implementationCosts: ImplementationCostsBySize;
  licenseCosts: LicenseCost;
  implementationTimeline: {
    smb: CostRange;
    mid_market: CostRange;
    enterprise: CostRange;
    large_enterprise: CostRange;
  };
  integrationComplexity: ComplexityLevel;
  dataMigrationComplexity: ComplexityLevel;
  bestFitProfile: OrganizationProfile;
  strengths: string[];
  considerations: string[];
  marketPosition: string;
}

// ============================================
// VENDOR BENCHMARKS DATA
// ============================================

export const VENDOR_BENCHMARKS: VendorBenchmark[] = [
  // Tier 1 Vendors
  {
    id: 'anaplan',
    name: 'Anaplan',
    category: 'tier1',
    description: 'Cloud-native connected planning platform with proprietary Hyperblock technology',
    implementationCosts: {
      smb: { min: 150, max: 350, typical: 250 },
      mid_market: { min: 400, max: 800, typical: 600 },
      enterprise: { min: 800, max: 2000, typical: 1400 },
      large_enterprise: { min: 2000, max: 5000, typical: 3500 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 8, max: 15, typical: 12 },
      minimumUsers: 25,
      volumeDiscountThreshold: 100,
      volumeDiscountPercent: 15,
      platformFeeAnnual: { min: 80, max: 250, typical: 150 },
    },
    implementationTimeline: {
      smb: { min: 3, max: 6, typical: 4 },
      mid_market: { min: 6, max: 12, typical: 9 },
      enterprise: { min: 12, max: 24, typical: 18 },
      large_enterprise: { min: 18, max: 36, typical: 24 },
    },
    integrationComplexity: 'medium',
    dataMigrationComplexity: 'medium',
    bestFitProfile: {
      industryFocus: ['Manufacturing', 'Retail', 'CPG', 'Technology', 'Financial Services'],
      complexityTolerance: 'high',
      excelDependency: 'low',
      aiReadiness: 'high',
      bestFitRevenue: { min: 250000, max: 50000000 },
      primaryUseCases: ['Connected Planning', 'Sales & Operations Planning', 'Workforce Planning', 'Supply Chain Planning'],
    },
    strengths: [
      'Powerful connected planning capabilities',
      'Strong scenario modeling',
      'Flexible multi-dimensional modeling',
      'Good collaboration features',
      'PlanIQ AI/ML capabilities',
    ],
    considerations: [
      'Premium pricing tier',
      'Steeper learning curve for model builders',
      'Requires dedicated planning expertise',
      'Less suited for pure financial consolidation',
    ],
    marketPosition: 'Leader in connected planning for complex organizations',
  },
  {
    id: 'onestream',
    name: 'OneStream',
    category: 'tier1',
    description: 'Unified CPM platform combining financial consolidation, planning, and reporting',
    implementationCosts: {
      smb: { min: 200, max: 450, typical: 325 },
      mid_market: { min: 500, max: 1200, typical: 850 },
      enterprise: { min: 1200, max: 3000, typical: 2000 },
      large_enterprise: { min: 3000, max: 8000, typical: 5000 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 6, max: 12, typical: 9 },
      minimumUsers: 20,
      volumeDiscountThreshold: 150,
      volumeDiscountPercent: 20,
      platformFeeAnnual: { min: 120, max: 400, typical: 250 },
    },
    implementationTimeline: {
      smb: { min: 4, max: 8, typical: 6 },
      mid_market: { min: 8, max: 14, typical: 11 },
      enterprise: { min: 14, max: 24, typical: 18 },
      large_enterprise: { min: 20, max: 36, typical: 28 },
    },
    integrationComplexity: 'medium',
    dataMigrationComplexity: 'high',
    bestFitProfile: {
      industryFocus: ['Financial Services', 'Insurance', 'Manufacturing', 'Healthcare', 'Energy'],
      complexityTolerance: 'high',
      excelDependency: 'medium',
      aiReadiness: 'medium',
      bestFitRevenue: { min: 500000, max: 100000000 },
      primaryUseCases: ['Financial Consolidation', 'Planning & Budgeting', 'Financial Reporting', 'Account Reconciliation'],
    },
    strengths: [
      'Unified platform - single product for all CPM needs',
      'Strong financial consolidation capabilities',
      'Extensible architecture via MarketPlace solutions',
      'Good audit trail and compliance features',
      'Excel-friendly interface',
    ],
    considerations: [
      'Higher implementation complexity for full platform',
      'Requires experienced implementation partners',
      'Can be over-engineered for simpler requirements',
      'Premium pricing for comprehensive solution',
    ],
    marketPosition: 'Leader in unified CPM for complex enterprise finance',
  },
  {
    id: 'onestream_cpm_express',
    name: 'OneStream CPM Express',
    category: 'tier2',
    description: 'Full OneStream unified platform capabilities purpose-built for mid-market with 3-6 month deployment',
    implementationCosts: {
      smb: { min: 40, max: 80, typical: 60 },
      mid_market: { min: 80, max: 150, typical: 115 },
      enterprise: { min: 150, max: 300, typical: 225 },
      large_enterprise: { min: 300, max: 500, typical: 400 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 4, max: 8, typical: 6 },
      minimumUsers: 10,
      volumeDiscountThreshold: 50,
      volumeDiscountPercent: 15,
      platformFeeAnnual: { min: 30, max: 80, typical: 55 },
    },
    implementationTimeline: {
      smb: { min: 3, max: 5, typical: 4 },
      mid_market: { min: 3, max: 6, typical: 4.5 },
      enterprise: { min: 4, max: 6, typical: 5 },
      large_enterprise: { min: 5, max: 8, typical: 6.5 },
    },
    integrationComplexity: 'low',
    dataMigrationComplexity: 'low',
    bestFitProfile: {
      industryFocus: ['Manufacturing', 'Professional Services', 'Retail', 'Healthcare', 'Technology'],
      complexityTolerance: 'medium',
      excelDependency: 'high',
      aiReadiness: 'medium',
      bestFitRevenue: { min: 50000, max: 1000000 },
      primaryUseCases: ['Financial Close', 'Financial Planning', 'Compliance Reporting', 'Management Reporting'],
    },
    strengths: [
      'Full OneStream unified platform capabilities for mid-market',
      '3-6 month deployment with pre-built best practices',
      'Complete GAAP and IFRS compliance framework',
      'Same data fabric and integration as enterprise OneStream',
      'Predictable pricing with faster time to realise value',
    ],
    considerations: [
      'Optimised for mid-market scale (under 50 users)',
      'Pre-configured approach may require adjustment for highly complex scenarios',
      'Seamless upgrade path to full OneStream for growing organisations',
    ],
    marketPosition: 'Mid-market leader bringing enterprise CPM quality to growing organisations',
  },
  {
    id: 'oracle_epm',
    name: 'Oracle EPM Cloud',
    category: 'tier1',
    description: 'Comprehensive cloud EPM suite integrated with Oracle Fusion ecosystem',
    implementationCosts: {
      smb: { min: 180, max: 400, typical: 290 },
      mid_market: { min: 450, max: 1000, typical: 725 },
      enterprise: { min: 1000, max: 2500, typical: 1750 },
      large_enterprise: { min: 2500, max: 6000, typical: 4000 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 5, max: 10, typical: 7.5 },
      minimumUsers: 25,
      volumeDiscountThreshold: 200,
      volumeDiscountPercent: 25,
      platformFeeAnnual: { min: 100, max: 350, typical: 200 },
    },
    implementationTimeline: {
      smb: { min: 4, max: 8, typical: 6 },
      mid_market: { min: 8, max: 16, typical: 12 },
      enterprise: { min: 16, max: 30, typical: 22 },
      large_enterprise: { min: 24, max: 42, typical: 32 },
    },
    integrationComplexity: 'high',
    dataMigrationComplexity: 'high',
    bestFitProfile: {
      industryFocus: ['Financial Services', 'Manufacturing', 'Public Sector', 'Utilities', 'Telecommunications'],
      complexityTolerance: 'high',
      excelDependency: 'medium',
      aiReadiness: 'medium',
      bestFitRevenue: { min: 500000, max: 200000000 },
      primaryUseCases: ['Enterprise Planning', 'Financial Consolidation', 'Profitability & Cost Management', 'Tax Reporting'],
    },
    strengths: [
      'Deep integration with Oracle Fusion ERP',
      'Comprehensive module coverage',
      'Strong enterprise scalability',
      'Robust security and compliance',
      'Global deployment capabilities',
    ],
    considerations: [
      'Complex licensing structure',
      'Longer implementation timelines',
      'Best value in Oracle-centric environments',
      'Requires significant Oracle expertise',
    ],
    marketPosition: 'Enterprise EPM leader for Oracle ecosystem organizations',
  },
  {
    id: 'sap_sac',
    name: 'SAP SAC (Analytics Cloud)',
    category: 'tier1',
    description: 'Unified analytics and planning platform with deep SAP integration',
    implementationCosts: {
      smb: { min: 140, max: 320, typical: 230 },
      mid_market: { min: 350, max: 800, typical: 575 },
      enterprise: { min: 800, max: 2000, typical: 1400 },
      large_enterprise: { min: 2000, max: 5500, typical: 3500 },
    },
    licenseCosts: {
      model: 'capacity_based',
      perUserAnnual: { min: 4, max: 9, typical: 6.5 },
      minimumUsers: 30,
      volumeDiscountThreshold: 250,
      volumeDiscountPercent: 20,
      platformFeeAnnual: { min: 80, max: 300, typical: 180 },
    },
    implementationTimeline: {
      smb: { min: 3, max: 7, typical: 5 },
      mid_market: { min: 7, max: 14, typical: 10 },
      enterprise: { min: 14, max: 28, typical: 20 },
      large_enterprise: { min: 24, max: 40, typical: 30 },
    },
    integrationComplexity: 'high',
    dataMigrationComplexity: 'medium',
    bestFitProfile: {
      industryFocus: ['Manufacturing', 'Automotive', 'Consumer Products', 'Oil & Gas', 'Chemicals'],
      complexityTolerance: 'high',
      excelDependency: 'low',
      aiReadiness: 'high',
      bestFitRevenue: { min: 250000, max: 150000000 },
      primaryUseCases: ['Integrated Business Planning', 'BI & Analytics', 'Financial Planning', 'Predictive Analytics'],
    },
    strengths: [
      'Unified analytics and planning in single platform',
      'Deep SAP S/4HANA integration',
      'Strong predictive analytics capabilities',
      'Modern cloud-native architecture',
      'Good self-service capabilities',
    ],
    considerations: [
      'Best value in SAP-centric environments',
      'Still maturing compared to dedicated EPM vendors',
      'Complex licensing model',
      'Requires SAP expertise for optimal deployment',
    ],
    marketPosition: 'Strategic choice for SAP ecosystem planning and analytics',
  },
  {
    id: 'board',
    name: 'Board',
    category: 'tier1',
    description: 'Unified decision-making platform combining BI, planning, and predictive analytics',
    implementationCosts: {
      smb: { min: 120, max: 280, typical: 200 },
      mid_market: { min: 300, max: 700, typical: 500 },
      enterprise: { min: 700, max: 1800, typical: 1200 },
      large_enterprise: { min: 1800, max: 4500, typical: 3000 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 5, max: 11, typical: 8 },
      minimumUsers: 15,
      volumeDiscountThreshold: 100,
      volumeDiscountPercent: 18,
      platformFeeAnnual: { min: 60, max: 200, typical: 120 },
    },
    implementationTimeline: {
      smb: { min: 3, max: 6, typical: 4 },
      mid_market: { min: 5, max: 10, typical: 7 },
      enterprise: { min: 10, max: 18, typical: 14 },
      large_enterprise: { min: 16, max: 30, typical: 22 },
    },
    integrationComplexity: 'medium',
    dataMigrationComplexity: 'medium',
    bestFitProfile: {
      industryFocus: ['Retail', 'Manufacturing', 'CPG', 'Pharmaceuticals', 'Logistics'],
      complexityTolerance: 'medium',
      excelDependency: 'medium',
      aiReadiness: 'high',
      bestFitRevenue: { min: 100000, max: 20000000 },
      primaryUseCases: ['Integrated Planning', 'Business Intelligence', 'Supply Chain Planning', 'Sales Planning'],
    },
    strengths: [
      'Unified BI and planning platform',
      'Flexible modeling capabilities',
      'Good price-performance ratio',
      'Strong supply chain planning features',
      'Quick time-to-value for smaller deployments',
    ],
    considerations: [
      'Less known brand recognition in UK market',
      'Financial consolidation capabilities less mature',
      'Smaller partner ecosystem than major vendors',
      'May require customization for complex requirements',
    ],
    marketPosition: 'Strong mid-market contender with unified decision-making approach',
  },

  // Tier 2 Vendors
  {
    id: 'workday_adaptive',
    name: 'Workday Adaptive Planning',
    category: 'tier2',
    description: 'Cloud planning platform with strong Workday HCM and Financials integration',
    implementationCosts: {
      smb: { min: 80, max: 180, typical: 130 },
      mid_market: { min: 180, max: 450, typical: 315 },
      enterprise: { min: 450, max: 1200, typical: 800 },
      large_enterprise: { min: 1200, max: 3000, typical: 2000 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 3, max: 7, typical: 5 },
      minimumUsers: 15,
      volumeDiscountThreshold: 75,
      volumeDiscountPercent: 15,
      platformFeeAnnual: { min: 40, max: 150, typical: 90 },
    },
    implementationTimeline: {
      smb: { min: 2, max: 4, typical: 3 },
      mid_market: { min: 4, max: 8, typical: 6 },
      enterprise: { min: 8, max: 16, typical: 12 },
      large_enterprise: { min: 14, max: 24, typical: 18 },
    },
    integrationComplexity: 'low',
    dataMigrationComplexity: 'low',
    bestFitProfile: {
      industryFocus: ['Technology', 'Professional Services', 'Healthcare', 'Education', 'Non-Profit'],
      complexityTolerance: 'medium',
      excelDependency: 'high',
      aiReadiness: 'medium',
      bestFitRevenue: { min: 50000, max: 10000000 },
      primaryUseCases: ['Financial Planning', 'Workforce Planning', 'Sales Planning', 'Operational Planning'],
    },
    strengths: [
      'Excellent Excel-like user experience',
      'Quick implementation for core planning',
      'Strong Workday ecosystem integration',
      'Good workforce planning capabilities',
      'Lower total cost of ownership',
    ],
    considerations: [
      'Limited financial consolidation capabilities',
      'Less suitable for complex multi-entity scenarios',
      'Reporting capabilities more basic than tier 1',
      'Best value when paired with Workday Financials',
    ],
    marketPosition: 'Leading mid-market planning solution with strong user experience',
  },
  {
    id: 'planful',
    name: 'Planful',
    category: 'tier2',
    description: 'Cloud FP&A platform focused on continuous planning and financial close',
    implementationCosts: {
      smb: { min: 70, max: 160, typical: 115 },
      mid_market: { min: 160, max: 400, typical: 280 },
      enterprise: { min: 400, max: 1000, typical: 700 },
      large_enterprise: { min: 1000, max: 2500, typical: 1700 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 2.5, max: 6, typical: 4 },
      minimumUsers: 10,
      volumeDiscountThreshold: 50,
      volumeDiscountPercent: 12,
      platformFeeAnnual: { min: 35, max: 120, typical: 75 },
    },
    implementationTimeline: {
      smb: { min: 2, max: 4, typical: 3 },
      mid_market: { min: 4, max: 8, typical: 6 },
      enterprise: { min: 8, max: 14, typical: 10 },
      large_enterprise: { min: 12, max: 20, typical: 16 },
    },
    integrationComplexity: 'low',
    dataMigrationComplexity: 'low',
    bestFitProfile: {
      industryFocus: ['Technology', 'SaaS', 'Professional Services', 'Healthcare', 'Financial Services'],
      complexityTolerance: 'medium',
      excelDependency: 'high',
      aiReadiness: 'medium',
      bestFitRevenue: { min: 50000, max: 5000000 },
      primaryUseCases: ['Financial Planning', 'Budgeting', 'Financial Close', 'Reporting'],
    },
    strengths: [
      'Strong continuous planning capabilities',
      'Good financial close and consolidation',
      'Excel-friendly interface',
      'Rapid deployment methodology',
      'Strong customer success focus',
    ],
    considerations: [
      'Less suitable for complex operational planning',
      'Limited supply chain planning capabilities',
      'Smaller enterprise reference base',
      'May outgrow for large complex organizations',
    ],
    marketPosition: 'Fast-growing mid-market FP&A specialist',
  },
  {
    id: 'vena',
    name: 'Vena Solutions',
    category: 'tier2',
    description: 'Excel-native planning platform maintaining spreadsheet familiarity',
    implementationCosts: {
      smb: { min: 50, max: 120, typical: 85 },
      mid_market: { min: 120, max: 300, typical: 210 },
      enterprise: { min: 300, max: 750, typical: 520 },
      large_enterprise: { min: 750, max: 1800, typical: 1250 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 2, max: 5, typical: 3.5 },
      minimumUsers: 10,
      volumeDiscountThreshold: 40,
      volumeDiscountPercent: 10,
      platformFeeAnnual: { min: 25, max: 100, typical: 60 },
    },
    implementationTimeline: {
      smb: { min: 1, max: 3, typical: 2 },
      mid_market: { min: 3, max: 6, typical: 4 },
      enterprise: { min: 6, max: 12, typical: 9 },
      large_enterprise: { min: 10, max: 18, typical: 14 },
    },
    integrationComplexity: 'low',
    dataMigrationComplexity: 'low',
    bestFitProfile: {
      industryFocus: ['Professional Services', 'Technology', 'Healthcare', 'Financial Services', 'Manufacturing'],
      complexityTolerance: 'low',
      excelDependency: 'high',
      aiReadiness: 'low',
      bestFitRevenue: { min: 25000, max: 3000000 },
      primaryUseCases: ['Financial Planning', 'Budgeting', 'Forecasting', 'Reporting'],
    },
    strengths: [
      'Maintains Excel experience users love',
      'Minimal training requirements',
      'Fast implementation',
      'Lower total cost of ownership',
      'Strong for Excel-centric teams',
    ],
    considerations: [
      'Less suitable for complex planning scenarios',
      'Limited multi-dimensional modeling',
      'May hit scalability limits at enterprise level',
      'Less modern architecture than newer solutions',
    ],
    marketPosition: 'Excel-native solution for teams wanting familiar experience',
  },
  {
    id: 'prophix',
    name: 'Prophix',
    category: 'tier2',
    description: 'Comprehensive CPM platform for mid-market finance teams',
    implementationCosts: {
      smb: { min: 60, max: 140, typical: 100 },
      mid_market: { min: 140, max: 350, typical: 245 },
      enterprise: { min: 350, max: 900, typical: 620 },
      large_enterprise: { min: 900, max: 2200, typical: 1500 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 2.5, max: 5.5, typical: 4 },
      minimumUsers: 10,
      volumeDiscountThreshold: 50,
      volumeDiscountPercent: 12,
      platformFeeAnnual: { min: 30, max: 110, typical: 70 },
    },
    implementationTimeline: {
      smb: { min: 2, max: 4, typical: 3 },
      mid_market: { min: 4, max: 8, typical: 6 },
      enterprise: { min: 8, max: 14, typical: 11 },
      large_enterprise: { min: 12, max: 20, typical: 16 },
    },
    integrationComplexity: 'medium',
    dataMigrationComplexity: 'medium',
    bestFitProfile: {
      industryFocus: ['Manufacturing', 'Distribution', 'Healthcare', 'Professional Services', 'Retail'],
      complexityTolerance: 'medium',
      excelDependency: 'medium',
      aiReadiness: 'medium',
      bestFitRevenue: { min: 50000, max: 5000000 },
      primaryUseCases: ['Financial Planning', 'Budgeting', 'Financial Consolidation', 'Reporting'],
    },
    strengths: [
      'Comprehensive CPM functionality',
      'Good consolidation capabilities for mid-market',
      'Virtual Financial Analyst AI features',
      'Strong reporting and dashboards',
      'Good price-performance ratio',
    ],
    considerations: [
      'Less brand recognition than tier 1 vendors',
      'Smaller partner ecosystem',
      'May need more customization for complex scenarios',
      'Limited operational planning depth',
    ],
    marketPosition: 'Solid mid-market CPM choice with growing AI capabilities',
  },
  {
    id: 'abacum',
    name: 'Abacum',
    category: 'tier2',
    description: 'AI-native FP&A platform for mid-market finance teams — AI embedded in the core data model, not added as a layer',
    implementationCosts: {
      smb: { min: 20, max: 35, typical: 27 },
      mid_market: { min: 35, max: 75, typical: 55 },
      enterprise: { min: 75, max: 180, typical: 125 },
      large_enterprise: { min: 150, max: 400, typical: 275 },
    },
    licenseCosts: {
      model: 'named_user',
      perUserAnnual: { min: 1.5, max: 3.5, typical: 2.5 },
      minimumUsers: 5,
      volumeDiscountThreshold: 30,
      volumeDiscountPercent: 15,
      platformFeeAnnual: { min: 30, max: 55, typical: 42 },
    },
    implementationTimeline: {
      smb: { min: 1, max: 2, typical: 1.5 },
      mid_market: { min: 1, max: 2, typical: 1.5 },
      enterprise: { min: 3, max: 6, typical: 4.5 },
      large_enterprise: { min: 6, max: 12, typical: 9 },
    },
    integrationComplexity: 'low',
    dataMigrationComplexity: 'low',
    bestFitProfile: {
      industryFocus: ['Technology', 'SaaS', 'Professional Services', 'Fintech', 'E-commerce'],
      complexityTolerance: 'medium',
      excelDependency: 'medium',
      aiReadiness: 'high',
      bestFitRevenue: { min: 10000, max: 1000000 },
      primaryUseCases: ['FP&A', 'Headcount Planning', 'Revenue Forecasting', 'Scenario Modelling', 'Workforce Planning'],
    },
    strengths: [
      'AI embedded in core architecture — forecasting, anomaly detection, and automated variance analysis',
      'Fastest deployment in segment — 4–6 weeks vs months for competitors',
      '700+ native integrations including NetSuite, Rippling, Xero, and QuickBooks',
      'Finance-owned administration — no IT dependency or dedicated modellers',
      'Strong mid-market TCO — 50–70% lower cost than Pigment in Year 1',
    ],
    considerations: [
      'No statutory consolidation — management reporting only, not suitable for complex group structures',
      'No regulatory reporting or intercompany eliminations',
      'Not suited for large enterprises (1,000+ employees) requiring multi-entity statutory close',
    ],
    marketPosition: 'AI-native mid-market FP&A leader with industry-leading time-to-value',
  },
  {
    id: 'jedox',
    name: 'Jedox',
    category: 'tier2',
    description: 'Flexible EPM platform with strong Excel integration and OLAP engine',
    implementationCosts: {
      smb: { min: 55, max: 130, typical: 92 },
      mid_market: { min: 130, max: 320, typical: 225 },
      enterprise: { min: 320, max: 800, typical: 560 },
      large_enterprise: { min: 800, max: 2000, typical: 1400 },
    },
    licenseCosts: {
      model: 'concurrent_user',
      perUserAnnual: { min: 2, max: 5, typical: 3.5 },
      minimumUsers: 10,
      volumeDiscountThreshold: 50,
      volumeDiscountPercent: 15,
      platformFeeAnnual: { min: 25, max: 90, typical: 55 },
    },
    implementationTimeline: {
      smb: { min: 2, max: 4, typical: 3 },
      mid_market: { min: 4, max: 8, typical: 6 },
      enterprise: { min: 8, max: 14, typical: 10 },
      large_enterprise: { min: 12, max: 20, typical: 15 },
    },
    integrationComplexity: 'medium',
    dataMigrationComplexity: 'medium',
    bestFitProfile: {
      industryFocus: ['Manufacturing', 'Retail', 'Automotive', 'Consumer Goods', 'Telecommunications'],
      complexityTolerance: 'medium',
      excelDependency: 'high',
      aiReadiness: 'medium',
      bestFitRevenue: { min: 50000, max: 8000000 },
      primaryUseCases: ['Planning & Budgeting', 'Financial Consolidation', 'BI & Reporting', 'Sales Planning'],
    },
    strengths: [
      'Strong Excel integration',
      'Powerful OLAP engine',
      'Flexible architecture',
      'Good price-performance ratio',
      'Strong European presence',
    ],
    considerations: [
      'Less known in UK market than US vendors',
      'Smaller analyst coverage',
      'May require more technical expertise',
      'Marketing/visibility lower than competitors',
    ],
    marketPosition: 'Flexible European EPM vendor with strong Excel integration',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a specific vendor benchmark by ID
 */
export function getVendorBenchmark(vendorId: string): VendorBenchmark | undefined {
  return VENDOR_BENCHMARKS.find(v => v.id === vendorId);
}

/**
 * Get vendors suitable for a specific organization size band
 * Returns vendors sorted by typical implementation cost (ascending)
 */
export function getVendorsByOrganizationSize(sizeBand: OrganizationSizeBand): VendorBenchmark[] {
  return VENDOR_BENCHMARKS
    .filter(vendor => {
      const costs = vendor.implementationCosts[sizeBand];
      const revenue = vendor.bestFitProfile.bestFitRevenue;
      
      // Check if vendor is suitable for this size band based on best fit revenue
      const sizeRanges: Record<OrganizationSizeBand, { min: number; max: number }> = {
        smb: { min: 50000, max: 250000 },
        mid_market: { min: 250000, max: 1000000 },
        enterprise: { min: 1000000, max: 5000000 },
        large_enterprise: { min: 5000000, max: 200000000 },
      };
      
      const range = sizeRanges[sizeBand];
      // Vendor is suitable if there's overlap between their best fit and the size band
      return revenue.min <= range.max && revenue.max >= range.min;
    })
    .sort((a, b) => {
      const aCost = a.implementationCosts[sizeBand].typical ?? a.implementationCosts[sizeBand].min;
      const bCost = b.implementationCosts[sizeBand].typical ?? b.implementationCosts[sizeBand].min;
      return aCost - bCost;
    });
}

/**
 * Compare costs between two vendors for a specific organization size
 */
export function compareVendorCosts(
  vendor1Id: string, 
  vendor2Id: string, 
  sizeBand: OrganizationSizeBand
): {
  vendor1: VendorBenchmark | undefined;
  vendor2: VendorBenchmark | undefined;
  comparison: {
    implementationCostDelta: number;
    implementationCostDeltaPercent: number;
    annualLicenseCostDelta: number;
    timelineDelta: number;
    threeYearTCODelta: number;
    fiveYearTCODelta: number;
    recommendation: string;
  } | null;
} {
  const vendor1 = getVendorBenchmark(vendor1Id);
  const vendor2 = getVendorBenchmark(vendor2Id);
  
  if (!vendor1 || !vendor2) {
    return { vendor1, vendor2, comparison: null };
  }
  
  const impl1 = vendor1.implementationCosts[sizeBand].typical ?? vendor1.implementationCosts[sizeBand].min;
  const impl2 = vendor2.implementationCosts[sizeBand].typical ?? vendor2.implementationCosts[sizeBand].min;
  
  // Estimate annual license costs (typical users by size band)
  const typicalUsers: Record<OrganizationSizeBand, number> = {
    smb: 25,
    mid_market: 75,
    enterprise: 200,
    large_enterprise: 500,
  };
  const users = typicalUsers[sizeBand];
  
  const license1 = (vendor1.licenseCosts.perUserAnnual.typical ?? vendor1.licenseCosts.perUserAnnual.min) * users +
    (vendor1.licenseCosts.platformFeeAnnual?.typical ?? vendor1.licenseCosts.platformFeeAnnual?.min ?? 0);
  const license2 = (vendor2.licenseCosts.perUserAnnual.typical ?? vendor2.licenseCosts.perUserAnnual.min) * users +
    (vendor2.licenseCosts.platformFeeAnnual?.typical ?? vendor2.licenseCosts.platformFeeAnnual?.min ?? 0);
  
  const timeline1 = vendor1.implementationTimeline[sizeBand].typical ?? vendor1.implementationTimeline[sizeBand].min;
  const timeline2 = vendor2.implementationTimeline[sizeBand].typical ?? vendor2.implementationTimeline[sizeBand].min;
  
  // Calculate 3-year and 5-year TCO
  const tco3Year1 = impl1 + (license1 * 3);
  const tco3Year2 = impl2 + (license2 * 3);
  const tco5Year1 = impl1 + (license1 * 5);
  const tco5Year2 = impl2 + (license2 * 5);
  
  // Generate recommendation
  let recommendation: string;
  const implementationDelta = impl1 - impl2;
  const tco3Delta = tco3Year1 - tco3Year2;
  
  if (Math.abs(tco3Delta) < tco3Year1 * 0.1) {
    // Within 10% - consider other factors
    if (timeline1 < timeline2) {
      recommendation = `${vendor1.name} offers faster implementation (${timeline1} vs ${timeline2} months) with similar TCO.`;
    } else if (timeline2 < timeline1) {
      recommendation = `${vendor2.name} offers faster implementation (${timeline2} vs ${timeline1} months) with similar TCO.`;
    } else {
      recommendation = `Both vendors have similar TCO and timelines. Consider capability fit and vendor relationship.`;
    }
  } else if (tco3Delta < 0) {
    recommendation = `${vendor1.name} offers ${Math.abs(tco3Delta).toFixed(0)}k lower 3-year TCO, but verify capability fit.`;
  } else {
    recommendation = `${vendor2.name} offers ${Math.abs(tco3Delta).toFixed(0)}k lower 3-year TCO, but verify capability fit.`;
  }
  
  return {
    vendor1,
    vendor2,
    comparison: {
      implementationCostDelta: Math.round((impl1 - impl2) * 10) / 10,
      implementationCostDeltaPercent: Math.round(((impl1 - impl2) / impl2) * 100 * 10) / 10,
      annualLicenseCostDelta: Math.round((license1 - license2) * 10) / 10,
      timelineDelta: Math.round((timeline1 - timeline2) * 10) / 10,
      threeYearTCODelta: Math.round((tco3Year1 - tco3Year2) * 10) / 10,
      fiveYearTCODelta: Math.round((tco5Year1 - tco5Year2) * 10) / 10,
      recommendation,
    },
  };
}

/**
 * Get all vendors by category
 */
export function getVendorsByCategory(category: 'tier1' | 'tier2' | 'specialist'): VendorBenchmark[] {
  return VENDOR_BENCHMARKS.filter(v => v.category === category);
}

/**
 * Get vendors by integration complexity
 */
export function getVendorsByComplexity(
  integrationComplexity?: ComplexityLevel,
  dataMigrationComplexity?: ComplexityLevel
): VendorBenchmark[] {
  return VENDOR_BENCHMARKS.filter(v => {
    if (integrationComplexity && v.integrationComplexity !== integrationComplexity) return false;
    if (dataMigrationComplexity && v.dataMigrationComplexity !== dataMigrationComplexity) return false;
    return true;
  });
}

/**
 * Get vendors suitable for specific industries
 */
export function getVendorsByIndustry(industry: string): VendorBenchmark[] {
  const normalizedIndustry = industry.toLowerCase();
  return VENDOR_BENCHMARKS.filter(v => 
    v.bestFitProfile.industryFocus.some(i => i.toLowerCase().includes(normalizedIndustry))
  );
}

/**
 * Calculate estimated TCO for a vendor at specific size
 */
export function calculateVendorTCO(
  vendorId: string,
  sizeBand: OrganizationSizeBand,
  years: number = 3,
  userCount?: number
): {
  implementationCost: CostRange;
  annualLicenseCost: CostRange;
  totalTCO: CostRange;
  timeline: CostRange;
} | null {
  const vendor = getVendorBenchmark(vendorId);
  if (!vendor) return null;
  
  const typicalUsers: Record<OrganizationSizeBand, number> = {
    smb: 25,
    mid_market: 75,
    enterprise: 200,
    large_enterprise: 500,
  };
  const users = userCount ?? typicalUsers[sizeBand];
  
  const implCost = vendor.implementationCosts[sizeBand];
  const platformFee = vendor.licenseCosts.platformFeeAnnual ?? { min: 0, max: 0 };
  
  const annualLicenseMin = vendor.licenseCosts.perUserAnnual.min * users + platformFee.min;
  const annualLicenseMax = vendor.licenseCosts.perUserAnnual.max * users + platformFee.max;
  const annualLicenseTypical = (vendor.licenseCosts.perUserAnnual.typical ?? vendor.licenseCosts.perUserAnnual.min) * users +
    (platformFee.typical ?? platformFee.min);
  
  return {
    implementationCost: implCost,
    annualLicenseCost: {
      min: Math.round(annualLicenseMin * 10) / 10,
      max: Math.round(annualLicenseMax * 10) / 10,
      typical: Math.round(annualLicenseTypical * 10) / 10,
    },
    totalTCO: {
      min: Math.round((implCost.min + annualLicenseMin * years) * 10) / 10,
      max: Math.round((implCost.max + annualLicenseMax * years) * 10) / 10,
      typical: Math.round(((implCost.typical ?? implCost.min) + annualLicenseTypical * years) * 10) / 10,
    },
    timeline: vendor.implementationTimeline[sizeBand],
  };
}
