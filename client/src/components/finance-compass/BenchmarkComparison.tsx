import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DIMENSION_BENCHMARKS,
  DIMENSION_LABELS,
  API_KEY_TO_DIMENSION,
  percentageToScale,
} from "@/lib/finance-compass-benchmarks";

interface BenchmarkComparisonProps {
  dimensionScores: Record<string, number>;
  title?: string;
  description?: string;
  variant?: 'bars' | 'chart';
}

interface MultiLayerComparisonData {
  dimension: string;
  shortLabel: string;
  fullLabel: string;
  yourScore: number;
  industryAverage: number;
  worldClass: number;
  difference: number;
  status: 'above' | 'below' | 'equal';
}

function prepareMultiLayerData(dimensionScores: Record<string, number>): MultiLayerComparisonData[] {
  const data: MultiLayerComparisonData[] = [];

  for (const [apiKey, percentageScore] of Object.entries(dimensionScores)) {
    const dimKey = API_KEY_TO_DIMENSION[apiKey];
    if (dimKey && dimKey in DIMENSION_BENCHMARKS) {
      const benchmarkData = DIMENSION_BENCHMARKS[dimKey as keyof typeof DIMENSION_BENCHMARKS];
      const scaleScore = percentageToScale(percentageScore);
      const difference = scaleScore - benchmarkData.industryAverage;
      
      data.push({
        dimension: dimKey,
        shortLabel: DIMENSION_LABELS[dimKey].short,
        fullLabel: DIMENSION_LABELS[dimKey].full,
        yourScore: scaleScore,
        industryAverage: benchmarkData.industryAverage,
        worldClass: benchmarkData.worldClass,
        difference,
        status: difference > 0.1 ? 'above' : difference < -0.1 ? 'below' : 'equal',
      });
    }
  }

  return data;
}

function StatusIcon({ status }: { status: 'above' | 'below' | 'equal' }) {
  switch (status) {
    case 'above':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'below':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'equal':
      return <Minus className="h-4 w-4 text-yellow-500" />;
  }
}

function ComparisonBarRow({ data, index }: { data: MultiLayerComparisonData; index: number }) {
  const yourProgress = (data.yourScore / 5) * 100;
  const industryProgress = (data.industryAverage / 5) * 100;
  const worldClassProgress = (data.worldClass / 5) * 100;

  const statusColors = {
    above: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    below: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    equal: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  };

  const colors = statusColors[data.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="space-y-2 p-3 rounded-lg border bg-card"
      data-testid={`benchmark-row-${data.dimension}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground flex-shrink-0 w-20">
            {data.shortLabel}
          </span>
          <span className="text-sm font-medium truncate">
            {data.fullLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={data.status} />
          <Badge 
            variant="outline" 
            className={`${colors.bg} ${colors.text} border-0 text-xs`}
            title={`${data.difference > 0 ? 'Above' : 'Below'} industry average by ${Math.abs(data.difference).toFixed(1)} points on 1-5 scale`}
          >
            {data.difference > 0 ? '+' : ''}{data.difference.toFixed(1)} pts
          </Badge>
        </div>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-24">Your Score</span>
          <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
            <div 
              className="h-full bg-[#0884AA] rounded-full transition-all duration-500"
              style={{ width: `${yourProgress}%` }}
            />
          </div>
          <span className="text-xs font-medium w-10 text-right">{data.yourScore.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-24">Industry Avg</span>
          <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
            <div 
              className="h-full bg-gray-400 rounded-full transition-all duration-500"
              style={{ width: `${industryProgress}%` }}
            />
          </div>
          <span className="text-xs font-medium w-10 text-right text-muted-foreground">{data.industryAverage.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-24">World-Class</span>
          <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
            <div 
              className="h-full bg-[#02205B] rounded-full transition-all duration-500"
              style={{ width: `${worldClassProgress}%` }}
            />
          </div>
          <span className="text-xs font-medium w-10 text-right text-[#02205B]">{data.worldClass.toFixed(1)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export function BenchmarkComparison({
  dimensionScores,
  title = "Multi-Layer Benchmark Comparison",
  description = "Your performance vs industry average and world-class benchmarks",
  variant = 'bars',
}: BenchmarkComparisonProps) {
  const comparisonData = prepareMultiLayerData(dimensionScores);

  if (comparisonData.length === 0) {
    return null;
  }

  const aboveCount = comparisonData.filter(d => d.status === 'above').length;
  const belowCount = comparisonData.filter(d => d.status === 'below').length;
  const avgDifference = comparisonData.reduce((sum, d) => sum + d.difference, 0) / comparisonData.length;

  if (variant === 'chart') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-lg" data-testid="card-benchmark-chart">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#0884AA]" />
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0">
                  {aboveCount} Above
                </Badge>
                <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0">
                  {belowCount} Below
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  barCategoryGap="20%"
                >
                  <XAxis 
                    type="number" 
                    domain={[0, 5]} 
                    tickCount={6}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="shortLabel"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as MultiLayerComparisonData;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium text-sm mb-2">{data.fullLabel}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between gap-4">
                                <span className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-[#0884AA]" />
                                  Your Score:
                                </span>
                                <span className="font-medium">{data.yourScore.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                                  Industry Avg:
                                </span>
                                <span className="font-medium">{data.industryAverage.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-[#02205B]" />
                                  World-Class:
                                </span>
                                <span className="font-medium">{data.worldClass.toFixed(2)}</span>
                              </div>
                              <div className="pt-1 border-t mt-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">vs Industry:</span>
                                  <span className={`font-medium ${data.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {data.difference > 0 ? '+' : ''}{data.difference.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: 10 }}
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        yourScore: 'Your Score',
                        industryAverage: 'Industry Average',
                        worldClass: 'World-Class'
                      };
                      return <span className="text-xs">{labels[value] || value}</span>;
                    }}
                  />
                  <Bar dataKey="yourScore" fill="#0884AA" radius={[0, 4, 4, 0]} name="yourScore" />
                  <Bar dataKey="industryAverage" fill="#9CA3AF" radius={[0, 4, 4, 0]} name="industryAverage" />
                  <Bar dataKey="worldClass" fill="#02205B" radius={[0, 4, 4, 0]} name="worldClass" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-lg" data-testid="card-benchmark-comparison">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#0884AA]" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${avgDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgDifference > 0 ? '+' : ''}{avgDifference.toFixed(1)} pts
              </div>
              <div className="text-xs text-muted-foreground">Avg. gap to industry (1-5 scale)</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparisonData.map((data, index) => (
              <ComparisonBarRow key={data.dimension} data={data} index={index} />
            ))}
          </div>

          <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0884AA]" />
                <span className="text-muted-foreground">Your Score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span className="text-muted-foreground">Industry Avg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#02205B]" />
                <span className="text-muted-foreground">World-Class</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-100/50 text-green-700 border-0 text-xs">
                {aboveCount} Above
              </Badge>
              <Badge variant="outline" className="bg-red-100/50 text-red-700 border-0 text-xs">
                {belowCount} Below
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
