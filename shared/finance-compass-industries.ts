/**
 * FinanceCompass Industry Catalog
 * 
 * Expanded industry coverage based on APQC Open Standards Benchmarking data.
 * Provides 47 granular industries grouped into sectors with backward-compatible
 * mapping to legacy industry categories.
 * 
 * Data Sources:
 * - APQC Open Standards Benchmarking (budget cycle, close cycle data)
 * - 1QG Insights (40+ years combined consulting experience)
 * 
 * Last Updated: December 2025
 */

export interface IndustryDefinition {
  code: string;
  name: string;
  sector: string;
  sectorCode: string;
  legacyMapping: string;
  apqcBenchmarks: {
    budgetCycleDays: {
      topPerformer: number;
      median: number;
      laggard: number;
    };
  };
  adjustmentFactors: {
    complexity: number;
    regulatory: number;
    volatility: number;
  };
}

export interface IndustrySector {
  code: string;
  name: string;
  industries: IndustryDefinition[];
}

export const INDUSTRY_SECTORS: IndustrySector[] = [
  {
    code: 'IT',
    name: 'Technology',
    industries: [
      {
        code: 'IT_SW',
        name: 'Software & SaaS',
        sector: 'Technology',
        sectorCode: 'IT',
        legacyMapping: 'Technology',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 20, median: 35, laggard: 75 }
        },
        adjustmentFactors: { complexity: 0.85, regulatory: 0.7, volatility: 1.2 }
      },
      {
        code: 'IT_SERV',
        name: 'IT Services & Consulting',
        sector: 'Technology',
        sectorCode: 'IT',
        legacyMapping: 'Technology',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 22, median: 38, laggard: 80 }
        },
        adjustmentFactors: { complexity: 0.9, regulatory: 0.75, volatility: 1.0 }
      },
      {
        code: 'IT_HW',
        name: 'Hardware, Electronics & Components',
        sector: 'Technology',
        sectorCode: 'IT',
        legacyMapping: 'Technology',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 40, laggard: 85 }
        },
        adjustmentFactors: { complexity: 1.1, regulatory: 0.8, volatility: 1.1 }
      }
    ]
  },
  {
    code: 'FIN',
    name: 'Financial Services',
    industries: [
      {
        code: 'FIN_BANK',
        name: 'Banking & Capital Markets',
        sector: 'Financial Services',
        sectorCode: 'FIN',
        legacyMapping: 'Financial Services',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 35, laggard: 70 }
        },
        adjustmentFactors: { complexity: 1.3, regulatory: 1.5, volatility: 1.2 }
      },
      {
        code: 'FIN_INS',
        name: 'Insurance',
        sector: 'Financial Services',
        sectorCode: 'FIN',
        legacyMapping: 'Financial Services',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 38, laggard: 75 }
        },
        adjustmentFactors: { complexity: 1.2, regulatory: 1.4, volatility: 0.9 }
      },
      {
        code: 'FIN_AM',
        name: 'Asset & Wealth Management',
        sector: 'Financial Services',
        sectorCode: 'FIN',
        legacyMapping: 'Financial Services',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 35, laggard: 70 }
        },
        adjustmentFactors: { complexity: 1.15, regulatory: 1.3, volatility: 1.3 }
      },
      {
        code: 'FIN_FINTECH',
        name: 'Fintech & Payments',
        sector: 'Financial Services',
        sectorCode: 'FIN',
        legacyMapping: 'Financial Services',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 20, median: 32, laggard: 65 }
        },
        adjustmentFactors: { complexity: 0.9, regulatory: 1.2, volatility: 1.4 }
      }
    ]
  },
  {
    code: 'MFG',
    name: 'Manufacturing',
    industries: [
      {
        code: 'MFG_DISCR',
        name: 'Discrete Manufacturing',
        sector: 'Manufacturing',
        sectorCode: 'MFG',
        legacyMapping: 'Manufacturing',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 45, laggard: 90 }
        },
        adjustmentFactors: { complexity: 1.2, regulatory: 0.9, volatility: 1.0 }
      },
      {
        code: 'MFG_PROC',
        name: 'Process Manufacturing',
        sector: 'Manufacturing',
        sectorCode: 'MFG',
        legacyMapping: 'Manufacturing',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 28, median: 50, laggard: 100 }
        },
        adjustmentFactors: { complexity: 1.25, regulatory: 1.0, volatility: 0.9 }
      },
      {
        code: 'MFG_FOOD',
        name: 'Food & Beverage Manufacturing',
        sector: 'Manufacturing',
        sectorCode: 'MFG',
        legacyMapping: 'Manufacturing',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 28, median: 50, laggard: 100 }
        },
        adjustmentFactors: { complexity: 1.15, regulatory: 1.1, volatility: 1.0 }
      },
      {
        code: 'MFG_HITECH',
        name: 'High-tech Manufacturing & Electronics',
        sector: 'Manufacturing',
        sectorCode: 'MFG',
        legacyMapping: 'Manufacturing',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 42, laggard: 85 }
        },
        adjustmentFactors: { complexity: 1.3, regulatory: 0.85, volatility: 1.2 }
      }
    ]
  },
  {
    code: 'CNS',
    name: 'Consumer & Retail',
    industries: [
      {
        code: 'CNS_FMCG',
        name: 'Consumer Packaged Goods / FMCG',
        sector: 'Consumer & Retail',
        sectorCode: 'CNS',
        legacyMapping: 'Retail & Consumer Goods',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 45, laggard: 95 }
        },
        adjustmentFactors: { complexity: 1.1, regulatory: 0.85, volatility: 1.1 }
      },
      {
        code: 'CNS_RETAIL_ON',
        name: 'Online / E-commerce Retail',
        sector: 'Consumer & Retail',
        sectorCode: 'CNS',
        legacyMapping: 'Retail & Consumer Goods',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 22, median: 40, laggard: 80 }
        },
        adjustmentFactors: { complexity: 0.95, regulatory: 0.75, volatility: 1.3 }
      },
      {
        code: 'CNS_RETAIL_OFF',
        name: 'Brick-and-Mortar Retail & Wholesale',
        sector: 'Consumer & Retail',
        sectorCode: 'CNS',
        legacyMapping: 'Retail & Consumer Goods',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 45, laggard: 95 }
        },
        adjustmentFactors: { complexity: 1.0, regulatory: 0.8, volatility: 1.0 }
      },
      {
        code: 'CNS_APPAREL',
        name: 'Apparel, Luxury & Specialty Retail',
        sector: 'Consumer & Retail',
        sectorCode: 'CNS',
        legacyMapping: 'Retail & Consumer Goods',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 45, laggard: 95 }
        },
        adjustmentFactors: { complexity: 1.05, regulatory: 0.75, volatility: 1.15 }
      }
    ]
  },
  {
    code: 'HLTH',
    name: 'Healthcare & Life Sciences',
    industries: [
      {
        code: 'HLTH_PROVIDER',
        name: 'Healthcare Providers & Hospitals',
        sector: 'Healthcare & Life Sciences',
        sectorCode: 'HLTH',
        legacyMapping: 'Healthcare & Life Sciences',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 50, laggard: 105 }
        },
        adjustmentFactors: { complexity: 1.25, regulatory: 1.4, volatility: 0.85 }
      },
      {
        code: 'HLTH_PHARMA',
        name: 'Pharmaceuticals & Biotech',
        sector: 'Healthcare & Life Sciences',
        sectorCode: 'HLTH',
        legacyMapping: 'Healthcare & Life Sciences',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 50, laggard: 100 }
        },
        adjustmentFactors: { complexity: 1.35, regulatory: 1.5, volatility: 1.1 }
      },
      {
        code: 'HLTH_MEDTECH',
        name: 'Medical Devices & MedTech',
        sector: 'Healthcare & Life Sciences',
        sectorCode: 'HLTH',
        legacyMapping: 'Healthcare & Life Sciences',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 28, median: 48, laggard: 95 }
        },
        adjustmentFactors: { complexity: 1.2, regulatory: 1.35, volatility: 1.0 }
      }
    ]
  },
  {
    code: 'ENE',
    name: 'Energy & Utilities',
    industries: [
      {
        code: 'ENE_OILGAS',
        name: 'Oil, Gas & Exploration',
        sector: 'Energy & Utilities',
        sectorCode: 'ENE',
        legacyMapping: 'Energy & Utilities',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 115 }
        },
        adjustmentFactors: { complexity: 1.4, regulatory: 1.3, volatility: 1.5 }
      },
      {
        code: 'ENE_POWER',
        name: 'Power Generation & Utilities',
        sector: 'Energy & Utilities',
        sectorCode: 'ENE',
        legacyMapping: 'Energy & Utilities',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 115 }
        },
        adjustmentFactors: { complexity: 1.3, regulatory: 1.4, volatility: 0.9 }
      },
      {
        code: 'ENE_RENEW',
        name: 'Renewable Energy & Clean Tech',
        sector: 'Energy & Utilities',
        sectorCode: 'ENE',
        legacyMapping: 'Energy & Utilities',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 28, median: 50, laggard: 105 }
        },
        adjustmentFactors: { complexity: 1.15, regulatory: 1.25, volatility: 1.2 }
      }
    ]
  },
  {
    code: 'TELCO',
    name: 'Telecommunications & Media',
    industries: [
      {
        code: 'TELCO',
        name: 'Telecommunications',
        sector: 'Telecommunications & Media',
        sectorCode: 'TELCO',
        legacyMapping: 'Technology',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 45, laggard: 95 }
        },
        adjustmentFactors: { complexity: 1.2, regulatory: 1.2, volatility: 1.0 }
      },
      {
        code: 'MEDIA',
        name: 'Media, Entertainment & Publishing',
        sector: 'Telecommunications & Media',
        sectorCode: 'TELCO',
        legacyMapping: 'Technology',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 45, laggard: 95 }
        },
        adjustmentFactors: { complexity: 1.0, regulatory: 0.85, volatility: 1.25 }
      }
    ]
  },
  {
    code: 'TRANS',
    name: 'Transportation & Logistics',
    industries: [
      {
        code: 'TRANS_LOG',
        name: 'Logistics, Freight & Warehousing',
        sector: 'Transportation & Logistics',
        sectorCode: 'TRANS',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 28, median: 50, laggard: 105 }
        },
        adjustmentFactors: { complexity: 1.1, regulatory: 0.95, volatility: 1.15 }
      },
      {
        code: 'TRANS_PASS',
        name: 'Passenger Transport (Air, Rail, Road)',
        sector: 'Transportation & Logistics',
        sectorCode: 'TRANS',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 28, median: 50, laggard: 105 }
        },
        adjustmentFactors: { complexity: 1.2, regulatory: 1.3, volatility: 1.2 }
      }
    ]
  },
  {
    code: 'REAL',
    name: 'Real Estate & Construction',
    industries: [
      {
        code: 'REAL_DEV',
        name: 'Real Estate Development & Construction',
        sector: 'Real Estate & Construction',
        sectorCode: 'REAL',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 115 }
        },
        adjustmentFactors: { complexity: 1.15, regulatory: 1.1, volatility: 1.3 }
      },
      {
        code: 'REAL_REIT',
        name: 'Real Estate Investment Trusts (REITs)',
        sector: 'Real Estate & Construction',
        sectorCode: 'REAL',
        legacyMapping: 'Financial Services',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 28, median: 50, laggard: 105 }
        },
        adjustmentFactors: { complexity: 1.1, regulatory: 1.2, volatility: 1.1 }
      },
      {
        code: 'CONST_ENG',
        name: 'Engineering & Construction Services',
        sector: 'Real Estate & Construction',
        sectorCode: 'REAL',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 115 }
        },
        adjustmentFactors: { complexity: 1.2, regulatory: 1.05, volatility: 1.2 }
      }
    ]
  },
  {
    code: 'PUB',
    name: 'Public Sector',
    industries: [
      {
        code: 'PUB_CENT',
        name: 'Public Sector – Central Government',
        sector: 'Public Sector',
        sectorCode: 'PUB',
        legacyMapping: 'Public Sector',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 40, median: 90, laggard: 180 }
        },
        adjustmentFactors: { complexity: 1.5, regulatory: 1.6, volatility: 0.6 }
      },
      {
        code: 'PUB_LOCAL',
        name: 'Public Sector – Local / Regional Government',
        sector: 'Public Sector',
        sectorCode: 'PUB',
        legacyMapping: 'Public Sector',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 40, median: 90, laggard: 180 }
        },
        adjustmentFactors: { complexity: 1.4, regulatory: 1.5, volatility: 0.5 }
      },
      {
        code: 'PUB_AGENCY',
        name: 'Public Agencies & Non-departmental Bodies',
        sector: 'Public Sector',
        sectorCode: 'PUB',
        legacyMapping: 'Public Sector',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 40, median: 90, laggard: 180 }
        },
        adjustmentFactors: { complexity: 1.35, regulatory: 1.4, volatility: 0.55 }
      }
    ]
  },
  {
    code: 'EDU',
    name: 'Education',
    industries: [
      {
        code: 'EDU_SCHOOLS',
        name: 'Schools & K-12 Education',
        sector: 'Education',
        sectorCode: 'EDU',
        legacyMapping: 'Public Sector',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 35, median: 70, laggard: 150 }
        },
        adjustmentFactors: { complexity: 1.1, regulatory: 1.2, volatility: 0.6 }
      },
      {
        code: 'EDU_HE',
        name: 'Higher Education & Universities',
        sector: 'Education',
        sectorCode: 'EDU',
        legacyMapping: 'Public Sector',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 35, median: 75, laggard: 160 }
        },
        adjustmentFactors: { complexity: 1.25, regulatory: 1.15, volatility: 0.65 }
      }
    ]
  },
  {
    code: 'NFP',
    name: 'Non-Profit & Charities',
    industries: [
      {
        code: 'NFP_CHARITY',
        name: 'Non-profits, Charities & NGOs',
        sector: 'Non-Profit & Charities',
        sectorCode: 'NFP',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 35, median: 70, laggard: 150 }
        },
        adjustmentFactors: { complexity: 0.9, regulatory: 1.1, volatility: 0.7 }
      },
      {
        code: 'NFP_FOUND',
        name: 'Foundations & Membership Organisations',
        sector: 'Non-Profit & Charities',
        sectorCode: 'NFP',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 35, median: 70, laggard: 150 }
        },
        adjustmentFactors: { complexity: 0.85, regulatory: 1.0, volatility: 0.65 }
      }
    ]
  },
  {
    code: 'AGR',
    name: 'Agriculture & Agribusiness',
    industries: [
      {
        code: 'AGR_PRIMARY',
        name: 'Agriculture, Forestry & Fishing',
        sector: 'Agriculture & Agribusiness',
        sectorCode: 'AGR',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 60, laggard: 140 }
        },
        adjustmentFactors: { complexity: 0.85, regulatory: 0.9, volatility: 1.4 }
      },
      {
        code: 'AGR_AGRIBUS',
        name: 'Agribusiness & Farm Services',
        sector: 'Agriculture & Agribusiness',
        sectorCode: 'AGR',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 60, laggard: 140 }
        },
        adjustmentFactors: { complexity: 0.9, regulatory: 0.85, volatility: 1.3 }
      }
    ]
  },
  {
    code: 'HOSP',
    name: 'Hospitality & Leisure',
    industries: [
      {
        code: 'HOSP_HOTEL',
        name: 'Hotels & Lodging',
        sector: 'Hospitality & Leisure',
        sectorCode: 'HOSP',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 120 }
        },
        adjustmentFactors: { complexity: 1.0, regulatory: 0.85, volatility: 1.4 }
      },
      {
        code: 'HOSP_REST',
        name: 'Restaurants, Bars & Foodservice',
        sector: 'Hospitality & Leisure',
        sectorCode: 'HOSP',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 120 }
        },
        adjustmentFactors: { complexity: 0.9, regulatory: 0.9, volatility: 1.35 }
      },
      {
        code: 'HOSP_TRAVEL',
        name: 'Travel, Tourism & Leisure',
        sector: 'Hospitality & Leisure',
        sectorCode: 'HOSP',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 120 }
        },
        adjustmentFactors: { complexity: 1.05, regulatory: 0.9, volatility: 1.5 }
      }
    ]
  },
  {
    code: 'SERV',
    name: 'Professional Services',
    industries: [
      {
        code: 'IND_SERV',
        name: 'Business & Professional Services',
        sector: 'Professional Services',
        sectorCode: 'SERV',
        legacyMapping: 'Professional Services',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 25, median: 45, laggard: 95 }
        },
        adjustmentFactors: { complexity: 0.95, regulatory: 0.85, volatility: 1.0 }
      },
      {
        code: 'IND_SECURITY',
        name: 'Security & Facility Services',
        sector: 'Professional Services',
        sectorCode: 'SERV',
        legacyMapping: 'Professional Services',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 115 }
        },
        adjustmentFactors: { complexity: 0.9, regulatory: 0.95, volatility: 0.85 }
      }
    ]
  },
  {
    code: 'MAT',
    name: 'Basic Materials & Mining',
    industries: [
      {
        code: 'MAT_BASIC',
        name: 'Basic Materials & Mining',
        sector: 'Basic Materials & Mining',
        sectorCode: 'MAT',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 28, median: 50, laggard: 110 }
        },
        adjustmentFactors: { complexity: 1.2, regulatory: 1.15, volatility: 1.4 }
      },
      {
        code: 'MAT_BUILD',
        name: 'Building Materials & Construction Products',
        sector: 'Basic Materials & Mining',
        sectorCode: 'MAT',
        legacyMapping: 'Other',
        apqcBenchmarks: {
          budgetCycleDays: { topPerformer: 30, median: 55, laggard: 115 }
        },
        adjustmentFactors: { complexity: 1.1, regulatory: 1.0, volatility: 1.2 }
      }
    ]
  }
];

export const ALL_INDUSTRIES: IndustryDefinition[] = INDUSTRY_SECTORS.flatMap(
  sector => sector.industries
);

export function getIndustryByCode(code: string): IndustryDefinition | undefined {
  return ALL_INDUSTRIES.find(ind => ind.code === code);
}

export function getIndustriesBySector(sectorCode: string): IndustryDefinition[] {
  return ALL_INDUSTRIES.filter(ind => ind.sectorCode === sectorCode);
}

export function getIndustryByLegacyName(legacyName: string): IndustryDefinition[] {
  return ALL_INDUSTRIES.filter(ind => ind.legacyMapping === legacyName);
}

export const LEGACY_INDUSTRY_MAP: Record<string, string[]> = {
  'Financial Services': ['FIN_BANK', 'FIN_INS', 'FIN_AM', 'FIN_FINTECH', 'REAL_REIT'],
  'Manufacturing': ['MFG_DISCR', 'MFG_PROC', 'MFG_FOOD', 'MFG_HITECH'],
  'Retail & Consumer Goods': ['CNS_FMCG', 'CNS_RETAIL_ON', 'CNS_RETAIL_OFF', 'CNS_APPAREL'],
  'Healthcare & Life Sciences': ['HLTH_PROVIDER', 'HLTH_PHARMA', 'HLTH_MEDTECH'],
  'Technology': ['IT_SW', 'IT_SERV', 'IT_HW', 'TELCO', 'MEDIA'],
  'Energy & Utilities': ['ENE_OILGAS', 'ENE_POWER', 'ENE_RENEW'],
  'Professional Services': ['IND_SERV', 'IND_SECURITY'],
  'Public Sector': ['PUB_CENT', 'PUB_LOCAL', 'PUB_AGENCY', 'EDU_SCHOOLS', 'EDU_HE'],
  'Other': ['TRANS_LOG', 'TRANS_PASS', 'REAL_DEV', 'CONST_ENG', 'NFP_CHARITY', 'NFP_FOUND', 
            'AGR_PRIMARY', 'AGR_AGRIBUS', 'HOSP_HOTEL', 'HOSP_REST', 'HOSP_TRAVEL', 
            'MAT_BASIC', 'MAT_BUILD']
};

export function getIndustryOptionsForSelector(): Array<{
  label: string;
  options: Array<{ value: string; label: string }>;
}> {
  return INDUSTRY_SECTORS.map(sector => ({
    label: sector.name,
    options: sector.industries.map(ind => ({
      value: ind.code,
      label: ind.name
    }))
  }));
}

export function getSimplifiedIndustryList(): Array<{ value: string; label: string; sector: string }> {
  return ALL_INDUSTRIES.map(ind => ({
    value: ind.code,
    label: ind.name,
    sector: ind.sector
  }));
}

export function applyIndustryAdjustment(
  baseValue: number,
  industryCode: string,
  factorType: 'complexity' | 'regulatory' | 'volatility'
): number {
  const industry = getIndustryByCode(industryCode);
  if (!industry) return baseValue;
  
  const factor = industry.adjustmentFactors[factorType];
  return Math.round(baseValue * factor * 10) / 10;
}
