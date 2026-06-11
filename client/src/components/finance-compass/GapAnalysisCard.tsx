import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  calculateGapAnalysis, 
  GAP_CLASSIFICATION,
  WORLD_CLASS_BENCHMARK,
  type GapAnalysisResult 
} from "@/lib/finance-compass-benchmarks";

interface GapAnalysisCardProps {
  dimensionScores: Record<string, number>;
  title?: string;
  description?: string;
}

function GapIcon({ classification }: { classification: keyof typeof GAP_CLASSIFICATION }) {
  switch (classification) {
    case 'MINOR':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'MODERATE':
      return <Minus className="h-4 w-4 text-yellow-500" />;
    case 'SIGNIFICANT':
      return <TrendingDown className="h-4 w-4 text-orange-500" />;
    case 'CRITICAL':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
  }
}

function GapRow({ result, index }: { result: GapAnalysisResult; index: number }) {
  const { classificationInfo } = result;
  const progressValue = (result.scaleScore / 5) * 100;
  const benchmarkPosition = (result.benchmark / 5) * 100;
  const worldClassPosition = (WORLD_CLASS_BENCHMARK / 5) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 rounded-lg border bg-card"
      data-testid={`gap-row-${result.dimensionKey}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <GapIcon classification={result.classification} />
          <span className="font-medium text-sm">{result.dimensionLabel}</span>
        </div>
        <Badge 
          variant="outline" 
          className={`${classificationInfo.bgClass} ${classificationInfo.textClass} border-0`}
        >
          {classificationInfo.label} Gap
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Progress value={progressValue} className="h-3" />
          <div 
            className="absolute top-0 h-3 w-0.5 bg-brand-ink"
            style={{ left: `${benchmarkPosition}%` }}
            title="Industry Benchmark"
          />
          <div 
            className="absolute top-0 h-3 w-0.5 bg-brand-mint"
            style={{ left: `${worldClassPosition}%` }}
            title="World Class"
          />
        </div>

        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="whitespace-nowrap">
              You: <span className="font-medium text-foreground">{result.scaleScore.toFixed(2)}</span>
            </span>
            <span className="whitespace-nowrap">
              Bench: <span className="font-medium text-brand-cream">{result.benchmark.toFixed(2)}</span>
            </span>
          </div>
          <span className="whitespace-nowrap">
            Gap: <span className={`font-medium ${classificationInfo.textClass}`}>
              {result.gap.toFixed(2)}
            </span>
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        {classificationInfo.description}
      </p>
    </motion.div>
  );
}

export function GapAnalysisCard({ 
  dimensionScores, 
  title = "Gap Analysis",
  description = "Comparison against world-class benchmark (4.0)"
}: GapAnalysisCardProps) {
  const gaps = calculateGapAnalysis(dimensionScores);

  if (gaps.length === 0) {
    return null;
  }

  const criticalGaps = gaps.filter(g => g.classification === 'CRITICAL').length;
  const significantGaps = gaps.filter(g => g.classification === 'SIGNIFICANT').length;
  const averageGap = gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-lg" data-testid="card-gap-analysis">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-deep-mint" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">{averageGap.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Avg. Gap</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(criticalGaps > 0 || significantGaps > 0) && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50 flex items-center gap-4 text-sm">
              {criticalGaps > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-600">{criticalGaps} Critical</span>
                </div>
              )}
              {significantGaps > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-600">{significantGaps} Significant</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {gaps.map((gap, index) => (
              <GapRow key={gap.dimensionKey} result={gap} index={index} />
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              {Object.entries(GAP_CLASSIFICATION).map(([key, info]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: info.color }}
                  />
                  <span className="text-muted-foreground">
                    {info.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
