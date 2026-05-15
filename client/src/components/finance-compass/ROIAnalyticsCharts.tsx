import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";
import type { YearByYearRow } from "@shared/roi-calculator";

interface BenefitBreakdown {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface ROIAnalyticsChartsProps {
  yearByYearData: YearByYearRow[];
  totalImplementationCost: number;
  totalAnnualBenefits: number;
  totalAnnualCosts: number;
  paybackMonths: number;
  horizonYears: number;
  processEfficiencyPercent?: number;
  baselineOperatingCost?: number;
  currency?: string;
}

const BENEFIT_COLORS = {
  fte: "#7FB8A3",
  efficiency: "#22c55e",
  risk: "#8b5cf6",
};

function formatCurrencyCompact(value: number, currency: string = "£"): string {
  if (Math.abs(value) >= 1000000) {
    return `${currency}${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `${currency}${(value / 1000).toFixed(0)}K`;
  }
  return `${currency}${value.toFixed(0)}`;
}

export function ROIAnalyticsCharts({
  yearByYearData,
  totalImplementationCost,
  totalAnnualBenefits,
  totalAnnualCosts,
  paybackMonths,
  horizonYears,
  processEfficiencyPercent = 0,
  baselineOperatingCost = 0,
  currency = "£",
}: ROIAnalyticsChartsProps) {
  const benefitBreakdown = useMemo<BenefitBreakdown[]>(() => {
    if (totalAnnualBenefits <= 0) return [];

    const efficiencySavings = (baselineOperatingCost * processEfficiencyPercent) / 100;
    const otherBenefits = totalAnnualBenefits - efficiencySavings;

    const breakdown: BenefitBreakdown[] = [];

    if (efficiencySavings > 0) {
      breakdown.push({
        name: "Process Efficiency",
        value: efficiencySavings,
        percentage: (efficiencySavings / totalAnnualBenefits) * 100,
        color: BENEFIT_COLORS.efficiency,
      });
    }

    if (otherBenefits > 0) {
      breakdown.push({
        name: "Other Benefits",
        value: otherBenefits,
        percentage: (otherBenefits / totalAnnualBenefits) * 100,
        color: BENEFIT_COLORS.fte,
      });
    }

    return breakdown;
  }, [baselineOperatingCost, processEfficiencyPercent, totalAnnualBenefits]);

  const cumulativeCashFlowData = useMemo(() => {
    let cumulative = -totalImplementationCost;
    
    return [
      { 
        year: "Year 0", 
        cumulative: cumulative, 
        netCashFlow: -totalImplementationCost,
        benefits: 0,
        costs: totalImplementationCost,
      },
      ...yearByYearData.map((row) => {
        cumulative += row.netCashFlow;
        return {
          year: `Year ${row.year}`,
          cumulative: cumulative,
          netCashFlow: row.netCashFlow,
          benefits: row.benefits,
          costs: row.costs,
        };
      }),
    ];
  }, [yearByYearData, totalImplementationCost]);

  const waterfallData = useMemo(() => {
    const totalBenefitsOverHorizon = yearByYearData.reduce((sum, r) => sum + r.benefits, 0);
    const totalCostsOverHorizon = yearByYearData.reduce((sum, r) => sum + r.costs, 0) + totalImplementationCost;
    const netValue = totalBenefitsOverHorizon - totalCostsOverHorizon;
    
    return [
      { 
        name: "Implementation", 
        value: -totalImplementationCost, 
        fill: "#ef4444",
        isNegative: true,
      },
      { 
        name: "Operating Costs", 
        value: -yearByYearData.reduce((sum, r) => sum + r.costs, 0), 
        fill: "#f97316",
        isNegative: true,
      },
      { 
        name: "Benefits", 
        value: totalBenefitsOverHorizon, 
        fill: "#22c55e",
        isNegative: false,
      },
      { 
        name: "Net Value", 
        value: netValue, 
        fill: netValue >= 0 ? "#7FB8A3" : "#ef4444",
        isNegative: netValue < 0,
      },
    ];
  }, [yearByYearData, totalImplementationCost]);

  const paybackYear = Math.ceil(paybackMonths / 12);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full" data-testid="card-benefit-breakdown">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Annual Benefit Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                How savings are distributed across categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {benefitBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {benefitBreakdown.map((benefit, index) => (
                    <div key={benefit.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: benefit.color }}
                          />
                          <span className="font-medium">{benefit.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {formatCurrencyCompact(benefit.value, currency)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {benefit.percentage.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: benefit.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${benefit.percentage}%` }}
                          transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t flex justify-between items-center">
                    <span className="text-sm font-medium">Total Annual Benefits</span>
                    <span className="font-bold text-green-600">
                      {formatCurrencyCompact(totalAnnualBenefits, currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Configure ROI profile to see benefit breakdown
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full" data-testid="card-investment-returns">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#7FB8A3]" />
                Investment vs Returns ({horizonYears}yr)
              </CardTitle>
              <CardDescription className="text-xs">
                Cost-benefit comparison over horizon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={waterfallData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tickFormatter={(v) => formatCurrencyCompact(Math.abs(v), currency)}
                    fontSize={10}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={90}
                    fontSize={10}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrencyCompact(Math.abs(value), currency),
                      value < 0 ? "Cost" : "Benefit",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card data-testid="card-cumulative-cashflow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-[#7FB8A3]" />
                  Cumulative Cash Flow Projection
                </CardTitle>
                <CardDescription className="text-xs">
                  Net value over the investment horizon
                </CardDescription>
              </div>
              {paybackMonths > 0 && paybackMonths < horizonYears * 12 && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Payback in Year {paybackYear}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumulativeCashFlowData}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7FB8A3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7FB8A3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="year" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  fontSize={10}
                  tickFormatter={(v) => formatCurrencyCompact(v, currency)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const label = name === "cumulative" ? "Cumulative Value" : "Net Cash Flow";
                    return [formatCurrencyCompact(value, currency), label];
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#7FB8A3"
                  strokeWidth={2}
                  fill="url(#colorCumulative)"
                  dot={{ fill: "#7FB8A3", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#7FB8A3] rounded" />
                <span>Cumulative Value</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-muted-foreground rounded border-dashed" />
                <span>Break-even Line</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
