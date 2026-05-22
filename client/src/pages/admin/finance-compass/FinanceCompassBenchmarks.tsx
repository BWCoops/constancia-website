import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Globe2,
  Layers,
  RefreshCw,
  Award,
  CheckCircle,
  MinusCircle,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";

interface AssessmentBenchmark {
  id: string;
  dimension: string;
  sector: string | null;
  sizeBand: string | null;
  jurisdiction: string | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean: number | null;
  stdDev: number | null;
  sampleSize: number | null;
  isActive: boolean;
  createdAt: string;
}

interface IndustryBenchmark {
  id: string;
  sicCode: string | null;
  sicDescription: string | null;
  sector: string | null;
  metricType: string;
  jurisdiction: string | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  mean: number | null;
  stdDev: number | null;
  unit: string | null;
  source: string | null;
  isActive: boolean;
  createdAt: string;
}

interface MacroBenchmark {
  id: string;
  source: string;
  metricType: string;
  metricName: string;
  sector: string | null;
  sicCode: string | null;
  jurisdiction: string | null;
  value: number;
  unit: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BenchmarkData {
  assessmentBenchmarks: AssessmentBenchmark[];
  industryBenchmarks: IndustryBenchmark[];
  macroBenchmarks: MacroBenchmark[];
  filters: {
    sectors: string[];
    dimensions: string[];
    types: string[];
  };
  counts: {
    assessment: number;
    industry: number;
    macro: number;
    total: number;
  };
}

interface BenchmarkResponse {
  success: boolean;
  data: BenchmarkData;
}

const DIMENSION_LABELS: Record<string, string> = {
  D1_STRATEGY: "D1: Strategy & Finance Role",
  D2_PROCESS: "D2: Process",
  D3_ORGANISATION: "D3: Organisation & Skills",
  D4_TECHNOLOGY: "D4: Technology & Automation",
  D5_DATA: "D5: Data & Master Data",
  D6_KPIS: "D6: Performance KPIs",
  D7_GOVERNANCE: "D7: Governance & Controls",
  D8_AI: "D8: AI & Machine Learning",
};

const SCORING_TIERS = [
  { tier: "World Class", range: "P90+", score: "4.5-5.0", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: Award },
  { tier: "Good", range: "P75-P90", score: "3.5-4.4", color: "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#252826]/30 dark:text-[#7FB8A3]", icon: CheckCircle },
  { tier: "Average", range: "P50-P75", score: "2.5-3.4", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: MinusCircle },
  { tier: "Below Average", range: "P25-P50", score: "1.5-2.4", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: ArrowDown },
  { tier: "Poor", range: "Below P25", score: "1.0-1.4", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
];

function getStatusBadgeClass(active: boolean) {
  return active
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function formatValue(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return "-";
  return val.toFixed(decimals);
}

function BenchmarksContent() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [dimensionFilter, setDimensionFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("assessment");

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (sectorFilter !== "all") queryParams.set("sector", sectorFilter);
  if (dimensionFilter !== "all") queryParams.set("dimension", dimensionFilter);

  const { data, isLoading, refetch, isFetching } = useQuery<BenchmarkResponse>({
    queryKey: ["/api/admin/finance-compass/benchmarks", typeFilter, sectorFilter, dimensionFilter],
    queryFn: async () => {
      const url = `/api/admin/finance-compass/benchmarks?${queryParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch benchmarks");
      return res.json();
    },
  });

  const benchmarkData = data?.data;
  const assessmentBenchmarks = benchmarkData?.assessmentBenchmarks ?? [];
  const industryBenchmarks = benchmarkData?.industryBenchmarks ?? [];
  const macroBenchmarks = benchmarkData?.macroBenchmarks ?? [];
  const sectors = benchmarkData?.filters?.sectors ?? [];
  const dimensions = benchmarkData?.filters?.dimensions ?? [];
  const counts = benchmarkData?.counts ?? { assessment: 0, industry: 0, macro: 0, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Benchmarks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage benchmark data across dimensions, industries, and economic indicators
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assessment Benchmarks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-assessment">{counts.assessment}</div>
            <p className="text-xs text-muted-foreground mt-1">Dimension scores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Industry Benchmarks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-industry">{counts.industry}</div>
            <p className="text-xs text-muted-foreground mt-1">Finance KPIs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Macro Benchmarks</CardTitle>
            <Globe2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-macro">{counts.macro}</div>
            <p className="text-xs text-muted-foreground mt-1">Economic data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sector Coverage</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-sectors">{sectors.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Industries covered</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[180px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter} data-testid="filter-type">
                <SelectTrigger data-testid="filter-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="assessment">Assessment (Dimensions)</SelectItem>
                  <SelectItem value="industry">Industry (KPIs)</SelectItem>
                  <SelectItem value="macro">Macro (Economic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Sector</label>
              <Select value={sectorFilter} onValueChange={setSectorFilter} data-testid="filter-sector">
                <SelectTrigger data-testid="filter-sector">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  <SelectItem value="cross-sector">Cross-Sector Only</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[220px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Dimension</label>
              <Select value={dimensionFilter} onValueChange={setDimensionFilter} data-testid="filter-dimension">
                <SelectTrigger data-testid="filter-dimension">
                  <SelectValue placeholder="All Dimensions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dimensions</SelectItem>
                  {dimensions.map((dim) => (
                    <SelectItem key={dim} value={dim}>{DIMENSION_LABELS[dim] || dim}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Scoring Tier Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {SCORING_TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div key={tier.tier} className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${tier.color}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tier.tier}</span>
                  <span className="text-xs opacity-80">({tier.range}: {tier.score})</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="assessment" data-testid="tab-assessment-benchmarks">
            Assessment ({counts.assessment})
          </TabsTrigger>
          <TabsTrigger value="industry" data-testid="tab-industry-benchmarks">
            Industry ({counts.industry})
          </TabsTrigger>
          <TabsTrigger value="macro" data-testid="tab-macro-benchmarks">
            Macro ({counts.macro})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessment" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Assessment Benchmarks (Dimension Scores)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : assessmentBenchmarks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table data-testid="table-assessment">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dimension</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead className="text-right">P25</TableHead>
                        <TableHead className="text-right">P50 (Median)</TableHead>
                        <TableHead className="text-right">P75</TableHead>
                        <TableHead className="text-right">P90 (World Class)</TableHead>
                        <TableHead className="text-right">Mean</TableHead>
                        <TableHead className="text-right">Sample Size</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessmentBenchmarks.map((benchmark, index) => (
                        <TableRow key={benchmark.id} data-testid={`row-assessment-${index}`}>
                          <TableCell className="font-medium">
                            {DIMENSION_LABELS[benchmark.dimension] || benchmark.dimension}
                          </TableCell>
                          <TableCell>{benchmark.sector || "Cross-Sector"}</TableCell>
                          <TableCell className="text-right font-mono">{formatValue(benchmark.p25)}</TableCell>
                          <TableCell className="text-right font-mono">{formatValue(benchmark.p50)}</TableCell>
                          <TableCell className="text-right font-mono">{formatValue(benchmark.p75)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatValue(benchmark.p90)}
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatValue(benchmark.mean)}</TableCell>
                          <TableCell className="text-right">{benchmark.sampleSize ?? "-"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(benchmark.isActive)}>
                              {benchmark.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No assessment benchmarks found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="industry" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Industry Benchmarks (Finance KPIs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : industryBenchmarks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table data-testid="table-industry">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric Type</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead className="text-right">P25</TableHead>
                        <TableHead className="text-right">P50</TableHead>
                        <TableHead className="text-right">P75</TableHead>
                        <TableHead className="text-right">P90</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {industryBenchmarks.map((benchmark, index) => (
                        <TableRow key={benchmark.id} data-testid={`row-industry-${index}`}>
                          <TableCell className="font-medium">{benchmark.metricType}</TableCell>
                          <TableCell>{benchmark.sector || "Cross-Sector"}</TableCell>
                          <TableCell className="text-right font-mono">{formatValue(benchmark.p25)}</TableCell>
                          <TableCell className="text-right font-mono">{formatValue(benchmark.p50)}</TableCell>
                          <TableCell className="text-right font-mono">{formatValue(benchmark.p75)}</TableCell>
                          <TableCell className="text-right font-mono">{formatValue(benchmark.p90)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{benchmark.unit || "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{benchmark.source || "-"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(benchmark.isActive)}>
                              {benchmark.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No industry benchmarks found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macro" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe2 className="h-5 w-5" />
                Macro Benchmarks (Economic Data)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : macroBenchmarks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table data-testid="table-macro">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric Type</TableHead>
                        <TableHead>Metric Name</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {macroBenchmarks.map((benchmark, index) => (
                        <TableRow key={benchmark.id} data-testid={`row-macro-${index}`}>
                          <TableCell className="font-medium">{benchmark.metricType}</TableCell>
                          <TableCell>{benchmark.metricName}</TableCell>
                          <TableCell>{benchmark.sector || "Cross-Sector"}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatValue(benchmark.value)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{benchmark.unit || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{benchmark.source}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(benchmark.isActive)}>
                              {benchmark.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Globe2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No macro benchmarks found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FinanceCompassBenchmarks() {
  return (
    <AdminLayout>
      <FCAdminTopNav />
      <div className="p-6">
        <BenchmarksContent />
      </div>
    </AdminLayout>
  );
}
