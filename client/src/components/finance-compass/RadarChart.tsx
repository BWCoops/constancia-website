import { motion } from "framer-motion";
import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prepareRadarChartData, type RadarDataPoint } from "@/lib/finance-compass-benchmarks";

interface RadarChartProps {
  dimensionScores: Record<string, number>;
  title?: string;
  description?: string;
}

export function FinanceCompassRadarChart({ 
  dimensionScores, 
  title = "Dimension Comparison",
  description = "Your scores compared to industry benchmarks"
}: RadarChartProps) {
  const data = prepareRadarChartData(dimensionScores);

  if (data.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-lg" data-testid="card-radar-chart">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#8E4F67]" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsRadar data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid 
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.5}
                />
                <PolarAngleAxis 
                  dataKey="shortLabel"
                  tick={{ 
                    fill: "hsl(var(--foreground))", 
                    fontSize: 12,
                    fontWeight: 500
                  }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 5]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickCount={6}
                />
                <Radar
                  name="Your Score"
                  dataKey="yourScore"
                  stroke="#8E4F67"
                  fill="#8E4F67"
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
                <Radar
                  name="Industry Benchmark"
                  dataKey="benchmark"
                  stroke="#252826"
                  fill="#252826"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Radar
                  name="World Class (4.0)"
                  dataKey="worldClass"
                  stroke="#7FB8A3"
                  fill="transparent"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload as RadarDataPoint;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-sm mb-2">{dataPoint.fullLabel}</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Your Score:</span>
                              <span className="font-medium text-[#5E8D7A]">{dataPoint.yourScore.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Benchmark:</span>
                              <span className="font-medium text-[#252826]">{dataPoint.benchmark.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">World Class:</span>
                              <span className="font-medium text-[#7FB8A3]">4.00</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '12px'
                  }}
                />
              </RechartsRadar>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8E4F67]" />
                <span>Your Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#252826]" />
                <span>Industry Benchmark</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-[#7FB8A3]" />
                <span>World Class Target</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
