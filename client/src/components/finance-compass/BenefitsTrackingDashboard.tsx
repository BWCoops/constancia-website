import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  Shield,
  Target,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { BRAND_BERRY, BRAND_MINT, BRAND_DEEP_MINT, BRAND_ROSE, BRAND_INK, BRAND_CREAM, BRAND_STONE } from "@/lib/brand-colors";
import {
  getMaturityLevel,
  MATURITY_LEVELS,
  percentageToScale,
} from "@/lib/finance-compass-benchmarks";

interface BenefitCategory {
  id: string;
  name: string;
  icon: typeof Users;
  description: string;
  color: string;
  bgClass: string;
  metrics: BenefitMetric[];
}

interface BenefitMetric {
  name: string;
  currentState: string;
  potentialRange: [number, number];
  unit: string;
  impactLevel: 'low' | 'medium' | 'high';
  timeframe: string;
}

interface PhasedBenefit {
  phase: string;
  timeline: string;
  benefits: string[];
  percentage: number;
  timelineMonths?: { start: number; end: number };
}

interface ImplementationTimeline {
  totalMonths: number;
  minMonths: number;
  maxMonths: number;
  industryMultiplier: number;
  industryRationale?: string;
  phases: PhasedBenefit[];
}

const BENEFIT_CATEGORIES: BenefitCategory[] = [
  {
    id: 'fte',
    name: 'FTE Savings',
    icon: Users,
    description: 'Reduction in manual effort through automation',
    color: BRAND_BERRY,
    bgClass: 'bg-brand-berry/10',
    metrics: [
      { name: 'Data Collection', currentState: 'Manual', potentialRange: [30, 50], unit: '%', impactLevel: 'high', timeframe: '6-12 months' },
      { name: 'Report Generation', currentState: 'Semi-automated', potentialRange: [20, 40], unit: '%', impactLevel: 'high', timeframe: '3-6 months' },
      { name: 'Variance Analysis', currentState: 'Manual', potentialRange: [25, 45], unit: '%', impactLevel: 'medium', timeframe: '6-12 months' },
      { name: 'Consolidation', currentState: 'Spreadsheet-based', potentialRange: [40, 60], unit: '%', impactLevel: 'high', timeframe: '12-18 months' },
    ],
  },
  {
    id: 'cost',
    name: 'Cost Savings',
    icon: DollarSign,
    description: 'Direct cost reduction and efficiency gains',
    color: BRAND_MINT,
    bgClass: 'bg-green-100 dark:bg-green-900/20',
    metrics: [
      { name: 'Software Consolidation', currentState: 'Multiple tools', potentialRange: [15, 30], unit: '%', impactLevel: 'medium', timeframe: '12-18 months' },
      { name: 'External Audit Fees', currentState: 'Standard', potentialRange: [10, 20], unit: '%', impactLevel: 'low', timeframe: '12-24 months' },
      { name: 'IT Maintenance', currentState: 'Legacy systems', potentialRange: [20, 35], unit: '%', impactLevel: 'medium', timeframe: '18-24 months' },
      { name: 'Error Correction', currentState: 'Reactive', potentialRange: [25, 40], unit: '%', impactLevel: 'high', timeframe: '6-12 months' },
    ],
  },
  {
    id: 'cycle',
    name: 'Cycle Time Reduction',
    icon: Clock,
    description: 'Faster close, planning, and reporting cycles',
    color: BRAND_DEEP_MINT,
    bgClass: 'bg-purple-100 dark:bg-purple-900/20',
    metrics: [
      { name: 'Monthly Close', currentState: '10+ days', potentialRange: [30, 50], unit: '% faster', impactLevel: 'high', timeframe: '6-12 months' },
      { name: 'Quarterly Close', currentState: '15+ days', potentialRange: [25, 45], unit: '% faster', impactLevel: 'high', timeframe: '12-18 months' },
      { name: 'Annual Planning', currentState: '3+ months', potentialRange: [20, 40], unit: '% faster', impactLevel: 'medium', timeframe: '12-18 months' },
      { name: 'Ad-hoc Reporting', currentState: '2-3 days', potentialRange: [50, 70], unit: '% faster', impactLevel: 'high', timeframe: '3-6 months' },
    ],
  },
  {
    id: 'revenue',
    name: 'Revenue & Margin Impact',
    icon: TrendingUp,
    description: 'Top and bottom line improvements',
    color: BRAND_ROSE,
    bgClass: 'bg-orange-100 dark:bg-orange-900/20',
    metrics: [
      { name: 'Forecast Accuracy', currentState: '±15%', potentialRange: [2, 5], unit: 'pp improvement', impactLevel: 'high', timeframe: '12-18 months' },
      { name: 'Working Capital', currentState: 'Suboptimal', potentialRange: [1, 3], unit: '% improvement', impactLevel: 'medium', timeframe: '18-24 months' },
      { name: 'Pricing Decisions', currentState: 'Delayed', potentialRange: [0.5, 2], unit: '% margin gain', impactLevel: 'high', timeframe: '6-12 months' },
      { name: 'Investment ROI', currentState: 'Limited visibility', potentialRange: [1, 4], unit: '% improvement', impactLevel: 'medium', timeframe: '12-24 months' },
    ],
  },
  {
    id: 'risk',
    name: 'Risk Reduction',
    icon: Shield,
    description: 'Improved controls and compliance',
    color: BRAND_BERRY,
    bgClass: 'bg-red-100 dark:bg-red-900/20',
    metrics: [
      { name: 'Data Quality Issues', currentState: 'Frequent', potentialRange: [40, 60], unit: '% reduction', impactLevel: 'high', timeframe: '6-12 months' },
      { name: 'Control Violations', currentState: 'Reactive detection', potentialRange: [50, 70], unit: '% reduction', impactLevel: 'high', timeframe: '12-18 months' },
      { name: 'Audit Findings', currentState: 'Multiple per year', potentialRange: [30, 50], unit: '% reduction', impactLevel: 'medium', timeframe: '12-24 months' },
      { name: 'Manual Errors', currentState: 'Common', potentialRange: [60, 80], unit: '% reduction', impactLevel: 'high', timeframe: '6-12 months' },
    ],
  },
  {
    id: 'strategic',
    name: 'Strategic Value',
    icon: Target,
    description: 'Enhanced strategic decision support',
    color: BRAND_INK,
    bgClass: 'bg-brand-ink/10',
    metrics: [
      { name: 'Strategic Work Time', currentState: '<20%', potentialRange: [30, 50], unit: '% of FP&A time', impactLevel: 'high', timeframe: '18-24 months' },
      { name: 'Analytics Models', currentState: 'Basic', potentialRange: [3, 5], unit: 'x increase', impactLevel: 'medium', timeframe: '12-18 months' },
      { name: 'Scenario Planning', currentState: 'Limited', potentialRange: [2, 4], unit: 'x faster', impactLevel: 'high', timeframe: '6-12 months' },
      { name: 'Business Partner Time', currentState: 'Minimal', potentialRange: [25, 40], unit: '% increase', impactLevel: 'high', timeframe: '12-24 months' },
    ],
  },
];

const PHASED_BENEFITS: PhasedBenefit[] = [
  {
    phase: 'Phase 1: Foundation',
    timeline: '0-6 months',
    percentage: 15,
    benefits: [
      'Process standardisation',
      'Data quality improvements',
      'Quick-win automations',
      'Training and change management',
    ],
  },
  {
    phase: 'Phase 2: Core Implementation',
    timeline: '6-12 months',
    percentage: 40,
    benefits: [
      'EPM platform deployment',
      'Close cycle optimisation',
      'Integrated planning',
      'Self-service reporting',
    ],
  },
  {
    phase: 'Phase 3: Advanced Capabilities',
    timeline: '12-18 months',
    percentage: 30,
    benefits: [
      'Predictive analytics',
      'AI-powered insights',
      'Advanced scenario modelling',
      'Real-time dashboards',
    ],
  },
  {
    phase: 'Phase 4: Optimisation',
    timeline: '18-24 months',
    percentage: 15,
    benefits: [
      'Continuous improvement',
      'Extended automation',
      'Strategic transformation',
      'Innovation initiatives',
    ],
  },
];

interface BenefitsTrackingDashboardProps {
  overallScore?: number;
  dimensionScores?: Record<string, number>;
  compact?: boolean;
  implementationTimeline?: ImplementationTimeline;
}

function calculateBenefitPotential(score: number): { multiplier: number; label: string } {
  const scaleScore = percentageToScale(score);
  const maturityLevel = getMaturityLevel(scaleScore);
  
  switch (maturityLevel) {
    case 'FOUNDATIONAL':
      return { multiplier: 1.0, label: 'Maximum Potential' };
    case 'TRANSITIONAL':
      return { multiplier: 0.85, label: 'High Potential' };
    case 'GOOD_BASELINE':
      return { multiplier: 0.65, label: 'Moderate Potential' };
    case 'ADVANCED':
      return { multiplier: 0.4, label: 'Optimisation Focus' };
    default:
      return { multiplier: 0.75, label: 'Good Potential' };
  }
}

function scaleTimeframe(baseTimeframe: string, totalMonths?: number): string {
  if (!totalMonths) return baseTimeframe;
  
  const BASE_MONTHS = 18;
  const scaleFactor = totalMonths / BASE_MONTHS;
  
  // Parse "X-Y months" format
  const match = baseTimeframe.match(/(\d+)-(\d+)\s*months?/i);
  if (!match) return baseTimeframe;
  
  const [, startStr, endStr] = match;
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);
  
  const scaledStart = Math.round(start * scaleFactor);
  const scaledEnd = Math.round(end * scaleFactor);
  
  return `${scaledStart}-${scaledEnd} months`;
}

function BenefitCategoryCard({ category, score, index, implementationTimeline }: { category: BenefitCategory; score: number; index: number; implementationTimeline?: ImplementationTimeline }) {
  const { multiplier, label } = calculateBenefitPotential(score);
  const Icon = category.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="h-full hover-elevate transition-all" data-testid={`card-benefit-${category.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${category.bgClass}`}>
              <Icon className="h-5 w-5" style={{ color: category.color }} />
            </div>
            <Badge variant="outline" className="text-xs">
              {label}
            </Badge>
          </div>
          <CardTitle className="text-base mt-2">{category.name}</CardTitle>
          <CardDescription className="text-xs">{category.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {category.metrics.slice(0, 3).map((metric, idx) => {
              const adjustedMin = Math.round(metric.potentialRange[0] * multiplier);
              const adjustedMax = Math.round(metric.potentialRange[1] * multiplier);
              const avgValue = (adjustedMin + adjustedMax) / 2;
              const scaledTimeframe = scaleTimeframe(metric.timeframe, implementationTimeline?.totalMonths);
              
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate pr-2">{metric.name}</span>
                    <span className="font-medium whitespace-nowrap">
                      {adjustedMin}-{adjustedMax}{metric.unit}
                    </span>
                  </div>
                  <Progress 
                    value={avgValue} 
                    className="h-1.5"
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {scaledTimeframe}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PhasedBenefitsTimeline({ 
  score, 
  implementationTimeline 
}: { 
  score: number; 
  implementationTimeline?: ImplementationTimeline 
}) {
  const { multiplier } = calculateBenefitPotential(score);
  let cumulativePercentage = 0;
  
  // Use dynamic phases from API if available, otherwise fall back to defaults
  const phases = implementationTimeline?.phases || PHASED_BENEFITS;
  const totalMonths = implementationTimeline?.totalMonths;
  const industryMultiplier = implementationTimeline?.industryMultiplier;
  
  return (
    <Card data-testid="card-phased-benefits">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-brand-berry" />
          Phased Benefits Realisation
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span>Expected value capture across implementation phases</span>
          {totalMonths && (
            <Badge variant="outline" className="text-xs">
              {totalMonths} month programme
            </Badge>
          )}
          {industryMultiplier && industryMultiplier !== 1 && (
            <Badge variant="secondary" className="text-xs">
              {industryMultiplier > 1 ? 'Extended' : 'Accelerated'} timeline ({industryMultiplier.toFixed(2)}x)
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const adjustedPercentage = Math.round(phase.percentage * multiplier);
            cumulativePercentage += adjustedPercentage;
            
            return (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                      index === 0 ? 'bg-brand-ink' :
                      index === 1 ? 'bg-brand-berry' :
                      index === 2 ? 'bg-brand-mint text-brand-cream' :
                      'bg-green-500'
                    }`}>
                      {index + 1}
                    </div>
                    {index < phases.length - 1 && (
                      <div className="w-0.5 h-full min-h-[60px] bg-border mt-2" />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{phase.phase}</h4>
                        <p className="text-xs text-muted-foreground">{phase.timeline}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          +{adjustedPercentage}% value
                        </Badge>
                        <Badge className="bg-brand-berry text-xs">
                          {cumulativePercentage}% cumulative
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      {phase.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span className="truncate">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BenefitsSummaryCard({ 
  score, 
  implementationTimeline 
}: { 
  score: number; 
  implementationTimeline?: ImplementationTimeline 
}) {
  const { multiplier, label } = calculateBenefitPotential(score);
  const scaleScore = percentageToScale(score);
  const maturityLevel = getMaturityLevel(scaleScore);
  const maturityInfo = MATURITY_LEVELS[maturityLevel];
  
  // Use dynamic timeline if available
  const displayTimeline = implementationTimeline?.totalMonths 
    ? `${implementationTimeline.totalMonths} months`
    : maturityInfo.timeline;
  
  return (
    <Card className="bg-gradient-to-br from-brand-ink to-brand-berry text-white" data-testid="card-benefits-summary">
      <CardContent className="py-6">
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-semibold mb-1">
              {Math.round(multiplier * 100)}%
            </div>
            <div className="text-sm text-white/70">Benefit Potential</div>
            <div className="text-xs text-brand-mint mt-1">{label}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold mb-1">
              {displayTimeline}
            </div>
            <div className="text-sm text-white/70">Value Realisation</div>
            <div className="text-xs text-brand-mint mt-1">
              {implementationTimeline?.totalMonths ? 'Based on your profile' : 'Estimated timeline'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold mb-1">6</div>
            <div className="text-sm text-white/70">Benefit Categories</div>
            <div className="text-xs text-brand-mint mt-1">Across all dimensions</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BenefitsTrackingDashboard({ 
  overallScore = 50, 
  dimensionScores, 
  compact = false,
  implementationTimeline 
}: BenefitsTrackingDashboardProps) {
  const score = overallScore;
  
  if (compact) {
    return (
      <div className="space-y-4">
        <BenefitsSummaryCard score={score} implementationTimeline={implementationTimeline} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {BENEFIT_CATEGORIES.slice(0, 6).map((category, index) => (
            <BenefitCategoryCard key={category.id} category={category} score={score} index={index} implementationTimeline={implementationTimeline} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="benefits-tracking-dashboard">
      <BenefitsSummaryCard score={score} implementationTimeline={implementationTimeline} />
      
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-benefits">
          <TabsTrigger value="categories" className="flex items-center gap-2" data-testid="tab-trigger-categories">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Benefit Categories</span>
            <span className="sm:hidden">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2" data-testid="tab-trigger-timeline">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Implementation Timeline</span>
            <span className="sm:hidden">Timeline</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFIT_CATEGORIES.map((category, index) => (
              <BenefitCategoryCard key={category.id} category={category} score={score} index={index} implementationTimeline={implementationTimeline} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-4">
          <PhasedBenefitsTimeline score={score} implementationTimeline={implementationTimeline} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { BENEFIT_CATEGORIES, PHASED_BENEFITS };
