export interface Platform {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  scores: Record<string, number>;
  marketPosition: string;
  roiPotential: "high" | "medium" | "low";
  implementationTime: string;
  priceRange: string;
  priceTier: number;
  bestFor: string;
  strengths: string[];
  limitations: string[];
  description: string;
  keyFeatures: string[];
}

export type RelevanceLevel = 'low' | 'medium' | 'high' | 'very-high';

export interface IndustryRelevance {
  manufacturing?: RelevanceLevel;
  financial?: RelevanceLevel;
  retail?: RelevanceLevel;
  healthcare?: RelevanceLevel;
  services?: RelevanceLevel;
  technology?: RelevanceLevel;
  public?: RelevanceLevel;
  all?: RelevanceLevel;
}

export interface SizeRelevance {
  sme?: RelevanceLevel;
  midmarket?: RelevanceLevel;
  enterprise?: RelevanceLevel;
}

export interface SweetSpot {
  revenueBands: string[];
  companySizes: string[];
  erpLandscapes: string[];
  industries: string[];
  winningScenario: string;
  narrative: string;
  sources: string[];
}

export interface CompanyProfile {
  revenue: string | null;
  companySize: string | null;
  erpLandscape: string | null;
  industry: string | null;
  primaryObjective?: 'statutory-close' | 'agile-fpa' | 'unified-epm' | 'excel-heavy' | 'multi-erp' | 'ai-forecasting' | 'microsoft-salesforce' | 'manufacturing' | 'service-people' | 'microsoft-stack' | 'finance-only' | 'budget-conscious' | 'ai-priority' | null;
}

export interface FitResult {
  platformId: string;
  score: number;
  baseScore: number;
  modifier: number;
  fitLevel: 'excellent' | 'good' | 'fair' | 'poor';
  explanation: string;
  matchReasons: string[];
  concerns: string[];
}

export type AffinityLevel = 'strong' | 'neutral' | 'weak';
export type FitLevel = 'high' | 'medium' | 'low';
export type ERPAffinityLevel = 'native' | 'connector' | 'partnership' | 'custom';

export interface AIPlatformContext {
  stackAffinity: {
    microsoft: AffinityLevel;
    google: AffinityLevel;
    aws: AffinityLevel;
    linux: AffinityLevel;
  };
  erpAffinity: {
    oracle: ERPAffinityLevel;
    sap: ERPAffinityLevel;
    dynamics365: ERPAffinityLevel;
    netsuite: ERPAffinityLevel;
    workday: ERPAffinityLevel;
    sage: ERPAffinityLevel;
  };
  industryFit: {
    manufacturing: FitLevel;
    financial: FitLevel;
    retail: FitLevel;
    healthcare: FitLevel;
    services: FitLevel;
    technology: FitLevel;
  };
  scaleFit: {
    sme: FitLevel;
    midmarket: FitLevel;
    enterprise: FitLevel;
  };
  financeSpecificity: 'purpose-built' | 'finance-capable' | 'general-purpose';
  deploymentEase: 'plug-and-play' | 'low-code' | 'developer-required';
}

export interface ERPStackAlignment {
  oracle?: AffinityLevel;
  sap?: AffinityLevel;
  microsoft: AffinityLevel;
  aws: AffinityLevel;
  google?: AffinityLevel;
}

export interface AICompanyProfile {
  techStack: 'microsoft' | 'google' | 'aws-linux' | 'mixed' | null;
  erpLandscape: 'oracle' | 'sap' | 'dynamics365' | 'netsuite' | 'workday' | 'sage' | 'multi-vendor' | 'other' | null;
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null;
  industry: string | null;
  financeFocus: 'high' | 'balanced' | null;
}

export interface ScoringModifier {
  label: string;
  value: number;
  detail?: string;
  category?: string;
}

export interface AIPlatformWithContext extends Platform {
  context: AIPlatformContext;
}

export interface ERPPlatformWithStack extends Platform {
  stackAlignment: ERPStackAlignment;
}

export interface Category {
  id: string;
  name: string;
  weight: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  industryRelevance?: IndustryRelevance;
  sizeRelevance?: SizeRelevance;
}

export interface WeightPreset {
  id: string;
  name: string;
  description: string;
  weights: Record<string, number>;
}

export interface CompanySizeOption {
  id: string;
  label: string;
  scaleKey: 'sme' | 'midmarket' | 'enterprise';
}

export interface TechStackOption {
  id: string;
  label: string;
}

export interface ERPLandscapeOption {
  id: string;
  label: string;
}
