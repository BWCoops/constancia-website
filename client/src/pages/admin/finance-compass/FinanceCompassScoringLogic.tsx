import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  Building2,
  Layers,
  Scale,
  Award,
  Star,
  Target,
  TrendingUp,
  ArrowDown,
} from "lucide-react";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";
import { 
  INDUSTRY_DIMENSION_WEIGHTS, 
  VENDOR_TIER_SCORING as VENDOR_TIER_SCORING_BASE,
  DIMENSION_LABELS,
  BENCHMARK_THRESHOLDS,
  SCORING_TIERS as SCORING_TIERS_BASE,
} from "@shared/scoring-constants";

const VENDOR_TIER_COLORS: Record<string, string> = {
  tier1: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  tier2: "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#1E2630]/30 dark:text-[#7FB8A3]",
  specialist: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  legacy: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  none: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const VENDOR_TIER_SCORING = Object.fromEntries(
  Object.entries(VENDOR_TIER_SCORING_BASE).map(([key, tier]) => [
    key,
    { ...tier, color: VENDOR_TIER_COLORS[key] || VENDOR_TIER_COLORS.none },
  ])
);

const SCORING_TIER_ICONS = [Award, Star, Target, TrendingUp, ArrowDown];
const SCORING_TIER_COLORS = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#1E2630]/30 dark:text-[#7FB8A3]",
  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
];

const SCORING_TIERS = SCORING_TIERS_BASE.map((tier, idx) => ({
  ...tier,
  color: SCORING_TIER_COLORS[idx],
  icon: SCORING_TIER_ICONS[idx],
}));

function ScoringLogicContent() {
  const [selectedSector, setSelectedSector] = useState("Financial Services");
  const sectors = Object.keys(INDUSTRY_DIMENSION_WEIGHTS);
  const selectedWeights = INDUSTRY_DIMENSION_WEIGHTS[selectedSector] || INDUSTRY_DIMENSION_WEIGHTS["Other"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Scoring Logic</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View scoring configuration including vendor tiers, industry weights, and benchmark thresholds
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-brand-teal" />
            Scoring Tier Legend
          </CardTitle>
          <CardDescription>
            Overall assessment scores are mapped to performance tiers based on percentile benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {SCORING_TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div key={tier.tier} className={`flex items-center gap-2 px-3 py-2 rounded-md ${tier.color}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tier.tier}</span>
                  <span className="text-xs opacity-80">({tier.range}: {tier.score})</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vendor-tiers" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
          <TabsTrigger value="vendor-tiers" data-testid="tab-vendor-tiers">
            <Building2 className="h-4 w-4 mr-2" />
            Vendor Tiers
          </TabsTrigger>
          <TabsTrigger value="industry-weights" data-testid="tab-industry-weights">
            <Layers className="h-4 w-4 mr-2" />
            Industry Weights
          </TabsTrigger>
          <TabsTrigger value="benchmarks" data-testid="tab-benchmarks">
            <Calculator className="h-4 w-4 mr-2" />
            Benchmarks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendor-tiers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">EPM Vendor Tier Scoring</CardTitle>
              <CardDescription>
                Current EPM system vendors are scored based on their market tier. Organisations using higher-tier platforms indicate greater finance function maturity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(VENDOR_TIER_SCORING).map(([key, tier]) => (
                  <div key={key} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <Badge className={`${tier.color} text-lg px-3 py-1`}>
                        {tier.score} pts
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{tier.label}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{tier.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tier.vendors.map((vendor) => (
                          <Badge key={vendor} variant="outline" className="text-xs">
                            {vendor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="industry-weights" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-lg">Industry-Linked Dimension Weights</CardTitle>
                  <CardDescription>
                    Dimension weights are adjusted based on industry sector to reflect relative importance for each dimension.
                  </CardDescription>
                </div>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="w-[200px]" data-testid="select-sector">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dimension</TableHead>
                    <TableHead className="text-center">Weight (%)</TableHead>
                    <TableHead className="text-center">Relative Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(selectedWeights)
                    .sort(([, a], [, b]) => b - a)
                    .map(([dimension, weight]) => {
                      const isHighPriority = weight > 14;
                      const isLowPriority = weight < 10;
                      return (
                        <TableRow key={dimension}>
                          <TableCell className="font-medium">
                            {DIMENSION_LABELS[dimension] || dimension}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={isHighPriority ? "default" : isLowPriority ? "secondary" : "outline"}>
                              {weight}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {isHighPriority && (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                High Priority
                              </Badge>
                            )}
                            {!isHighPriority && !isLowPriority && (
                              <Badge variant="outline">Standard</Badge>
                            )}
                            {isLowPriority && (
                              <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                Lower Priority
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Weights sum to 100% per sector. Higher weights indicate dimensions that are more critical for the selected industry.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Efficiency Metric Benchmarks</CardTitle>
              <CardDescription>
                Benchmark thresholds used for scoring efficiency-based metrics. These determine how well an organization performs relative to industry standards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(BENCHMARK_THRESHOLDS).map(([key, benchmark]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{benchmark.metric}</h4>
                      <Badge variant="outline">
                        {benchmark.direction === "inverse" ? "Lower is Better" : "Higher is Better"}
                      </Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Performance Level</TableHead>
                          <TableHead className="text-center">Threshold ({benchmark.unit})</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(benchmark.thresholds).map(([level, data]) => (
                          <TableRow key={level}>
                            <TableCell className="font-medium">{data.label}</TableCell>
                            <TableCell className="text-center">
                              {(() => {
                                const val = data.value;
                                const isStringValue = typeof val === 'string';
                                if (benchmark.direction === "inverse") {
                                  if (isStringValue && val.includes('+')) {
                                    return `> ${val.replace('+', '')}`;
                                  }
                                  return `≤ ${val}`;
                                } else {
                                  if (isStringValue && val.startsWith('<')) {
                                    return val;
                                  }
                                  return `≥ ${val}`;
                                }
                              })()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                data.score === 5 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                data.score === 4 ? "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#1E2630]/30 dark:text-[#7FB8A3]" :
                                data.score === 3 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                data.score === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }>
                                {data.score} pts
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FinanceCompassScoringLogic() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <ScoringLogicContent />
        </div>
      </div>
    </AdminLayout>
  );
}
