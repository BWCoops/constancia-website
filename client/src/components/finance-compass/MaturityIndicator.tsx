import { motion } from "framer-motion";
import { Clock, AlertTriangle, ArrowUp, CheckCircle, Award, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  getMaturityLevel, 
  MATURITY_LEVELS, 
  percentageToScale,
  type MaturityLevelType 
} from "@/lib/finance-compass-benchmarks";

interface MaturityIndicatorProps {
  score: number;
  title?: string;
  description?: string;
  showTimeline?: boolean;
  showRecommendations?: boolean;
  dimensionScores?: Record<string, number>;
}

const DIMENSION_RECOMMENDATIONS: Record<string, { low: string; medium: string }> = {
  consolidation_close: { 
    low: "Automate close processes and implement workflow controls",
    medium: "Optimise close calendar and reduce manual reconciliations"
  },
  planning_forecasting: { 
    low: "Implement driver-based planning and rolling forecasts",
    medium: "Enhance scenario modelling and forecast accuracy tracking"
  },
  reporting_analytics: { 
    low: "Build self-service dashboards and standardise KPIs",
    medium: "Advance predictive analytics and real-time insights"
  },
  data_management: { 
    low: "Establish data governance and single source of truth",
    medium: "Improve data quality automation and metadata management"
  },
  technology_systems: { 
    low: "Modernise legacy systems and integrate platforms",
    medium: "Leverage cloud capabilities and API-first architecture"
  },
  people_skills: { 
    low: "Invest in finance skills training and digital literacy",
    medium: "Develop advanced analytics competencies and change readiness"
  },
  process_governance: { 
    low: "Document processes and implement controls framework",
    medium: "Streamline approvals and enhance audit readiness"
  },
  ai_innovation: { 
    low: "Pilot AI use cases and build data foundations",
    medium: "Scale ML models and implement intelligent automation"
  }
};

function getDynamicTimeline(score: number, progressToNext: number): string {
  if (score >= 75) return "6-12 months";
  if (score >= 50) return `${Math.round(12 + (75 - score) * 0.4)}-${Math.round(18 + (75 - score) * 0.3)} months`;
  if (score >= 25) return `${Math.round(18 + (50 - score) * 0.3)}-${Math.round(24 + (50 - score) * 0.2)} months`;
  return "24-36 months";
}

function getDynamicRecommendations(dimensionScores: Record<string, number>): string[] {
  const sortedDimensions = Object.entries(dimensionScores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3);
  
  return sortedDimensions.map(([dimension, score]) => {
    const config = DIMENSION_RECOMMENDATIONS[dimension];
    if (!config) return null;
    return score < 50 ? config.low : config.medium;
  }).filter((rec): rec is string => rec !== null);
}

function MaturityIcon({ level }: { level: MaturityLevelType }) {
  const iconClass = "h-8 w-8";
  switch (level) {
    case 'FOUNDATIONAL':
      return <AlertTriangle className={`${iconClass} text-red-500`} />;
    case 'TRANSITIONAL':
      return <ArrowUp className={`${iconClass} text-orange-500`} />;
    case 'GOOD_BASELINE':
      return <CheckCircle className={`${iconClass} text-yellow-500`} />;
    case 'ADVANCED':
      return <Award className={`${iconClass} text-green-500`} />;
  }
}

export function MaturityIndicator({ 
  score, 
  title = "Maturity Level",
  description = "Your transformation readiness",
  showTimeline = true,
  showRecommendations = true,
  dimensionScores = {}
}: MaturityIndicatorProps) {
  const scaleScore = percentageToScale(score);
  const maturityKey = getMaturityLevel(scaleScore);
  const maturity = MATURITY_LEVELS[maturityKey];
  const progressValue = ((scaleScore - 1) / 4) * 100;
  
  const dynamicTimeline = getDynamicTimeline(score, progressValue);
  const hasDimensionData = Object.keys(dimensionScores).length > 0;
  const dynamicRecommendations = hasDimensionData 
    ? getDynamicRecommendations(dimensionScores) 
    : maturity.recommendations;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-lg overflow-hidden" data-testid="card-maturity-indicator">
        <div 
          className="h-1"
          style={{ backgroundColor: maturity.color }}
        />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#8E4F67]" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div className={`p-4 rounded-xl ${maturity.bgColor}`}>
              <MaturityIcon level={maturityKey} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold">{maturity.label}</h3>
                <Badge 
                  variant="outline" 
                  className={`${maturity.bgColor} ${maturity.textColor} border-0`}
                >
                  {scaleScore.toFixed(2)} / 5.0
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{maturity.description}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to Advanced</span>
              <span className="font-medium">{Math.round(progressValue)}%</span>
            </div>
            <div className="relative">
              <Progress value={progressValue} className="h-3" />
              <div className="absolute top-0 left-0 w-full flex justify-between px-0.5" style={{ marginTop: '-2px' }}>
                {Object.entries(MATURITY_LEVELS).map(([key, level], index) => (
                  <div 
                    key={key}
                    className="flex flex-col items-center"
                    style={{ 
                      position: 'absolute',
                      left: `${((level.min - 1) / 4) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div 
                      className="w-1 h-4 rounded-full"
                      style={{ backgroundColor: level.color }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="hidden sm:inline">Foundational</span>
              <span className="sm:hidden">Found.</span>
              <span className="hidden sm:inline">Transitional</span>
              <span className="sm:hidden">Trans.</span>
              <span className="hidden sm:inline">Good Baseline</span>
              <span className="sm:hidden">Good</span>
              <span>Advanced</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-[#252826]/5 dark:bg-[#252826]/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Gap to Next</div>
              <div className="text-lg font-bold text-[#252826] dark:text-white">
                {maturityKey === 'ADVANCED' ? 'N/A' : `${Math.round(100 - progressValue)}%`}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#8E4F67]/5 dark:bg-[#8E4F67]/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Percentile</div>
              <div className="text-lg font-bold text-[#8E4F67]">
                {score >= 70 ? 'Top 15%' : score >= 50 ? 'Top 40%' : score >= 35 ? 'Top 60%' : 'Top 80%'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#7FB8A3]/10 dark:bg-[#7FB8A3]/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Dimensions</div>
              <div className="text-lg font-bold text-[#8E4F67]">
                {hasDimensionData ? Object.keys(dimensionScores).length : 8}
              </div>
            </div>
          </div>

          {showTimeline && (
            <div className="p-3 rounded-lg bg-muted/50 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#8E4F67]" />
                  <div>
                    <div className="font-medium text-sm">Recommended Timeline</div>
                    <div className="text-xs text-muted-foreground">
                      {dynamicTimeline} to reach next level
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {maturityKey === 'ADVANCED' ? 'Optimise' : maturityKey === 'GOOD_BASELINE' ? 'Advanced' : maturityKey === 'TRANSITIONAL' ? 'Good Baseline' : 'Transitional'}
                </Badge>
              </div>
            </div>
          )}

          {showRecommendations && dynamicRecommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                Key Recommendations
                {hasDimensionData && (
                  <Badge variant="secondary" className="text-xs">Based on your gaps</Badge>
                )}
              </h4>
              <ul className="space-y-2">
                {dynamicRecommendations.map((rec, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle className="h-4 w-4 text-[#8E4F67] mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Dimension Quick View - only if data available */}
          {hasDimensionData && Object.keys(dimensionScores).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Dimension Summary</h4>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(dimensionScores).slice(0, 8).map(([dim, dimScore]) => {
                  const dimColor = dimScore >= 70 ? '#8E4F67' : dimScore >= 50 ? '#252826' : '#f59e0b';
                  return (
                    <div key={dim} className="text-center">
                      <div 
                        className="text-sm font-bold"
                        style={{ color: dimColor }}
                      >
                        {Math.round(dimScore)}%
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {dim.replace(/_/g, ' ').split(' ').map(w => w[0]?.toUpperCase()).join('')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function MaturityBadge({ score }: { score: number }) {
  const scaleScore = percentageToScale(score);
  const maturityKey = getMaturityLevel(scaleScore);
  const maturity = MATURITY_LEVELS[maturityKey];

  return (
    <Badge 
      variant="outline" 
      className={`${maturity.bgColor} ${maturity.textColor} border-0`}
      data-testid="badge-maturity"
    >
      {maturity.label}
    </Badge>
  );
}
