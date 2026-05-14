import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  LineChart,
  Calendar,
  Eye,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Clock,
  Calculator
} from "lucide-react";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";

interface Scenario {
  id: string;
  name: string;
  assessmentId: string;
  baseInvestment: number;
  npv?: number | null;
  irr?: number | null;
  paybackMonths?: number | null;
  assumptions?: Record<string, unknown> | null;
  outputs?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function getIRRBadgeClass(irr: number | null | undefined) {
  if (irr === null || irr === undefined) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (irr >= 0.2) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (irr >= 0.1) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

function getPaybackBadgeClass(months: number | null | undefined) {
  if (months === null || months === undefined) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (months <= 24) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (months <= 36) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
}

function ScenariosContent() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; data: Scenario[] }>({
    queryKey: ["/api/admin/finance-compass/scenarios"],
  });

  const scenarios = data?.data ?? [];

  const handleViewDetails = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Scenarios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage financial scenarios and projections
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

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineChart className="h-5 w-5" />
            All Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : scenarios.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Assessment ID</TableHead>
                  <TableHead>Base Investment</TableHead>
                  <TableHead>NPV</TableHead>
                  <TableHead>IRR</TableHead>
                  <TableHead>Payback</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((scenario, index) => (
                  <TableRow 
                    key={scenario.id} 
                    className="cursor-pointer"
                    onClick={() => handleViewDetails(scenario)}
                    data-testid={`row-scenario-${index}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{scenario.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {scenario.assessmentId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatCurrency(scenario.baseInvestment)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {scenario.npv !== null && scenario.npv !== undefined ? (
                        <span className={scenario.npv >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                          {formatCurrency(scenario.npv)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getIRRBadgeClass(scenario.irr)} data-testid={`badge-irr-${index}`}>
                        {scenario.irr !== null && scenario.irr !== undefined ? formatPercentage(scenario.irr) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaybackBadgeClass(scenario.paybackMonths)} data-testid={`badge-payback-${index}`}>
                        {scenario.paybackMonths !== null && scenario.paybackMonths !== undefined 
                          ? `${scenario.paybackMonths} months` 
                          : "-"
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(scenario.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(scenario);
                        }}
                        data-testid={`button-view-${index}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <LineChart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No scenarios found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Scenarios will appear here once created from assessments
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Scenario Details
            </DialogTitle>
            <DialogDescription>
              {selectedScenario?.id && `ID: ${selectedScenario.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedScenario && (
            <div className="space-y-6">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-semibold text-lg">{selectedScenario.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Assessment ID</Label>
                  <p className="font-mono text-sm">{selectedScenario.assessmentId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="text-sm">{new Date(selectedScenario.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-muted-foreground">Base Investment</Label>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(selectedScenario.baseInvestment)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-muted-foreground">NPV</Label>
                    </div>
                    <p className={`text-2xl font-bold ${selectedScenario.npv && selectedScenario.npv >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {selectedScenario.npv !== null && selectedScenario.npv !== undefined 
                        ? formatCurrency(selectedScenario.npv) 
                        : "-"
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-muted-foreground">IRR</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getIRRBadgeClass(selectedScenario.irr)}>
                        {selectedScenario.irr !== null && selectedScenario.irr !== undefined 
                          ? formatPercentage(selectedScenario.irr) 
                          : "-"
                        }
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-muted-foreground">Payback Period</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPaybackBadgeClass(selectedScenario.paybackMonths)}>
                        {selectedScenario.paybackMonths !== null && selectedScenario.paybackMonths !== undefined 
                          ? `${selectedScenario.paybackMonths} months` 
                          : "-"
                        }
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedScenario.assumptions && Object.keys(selectedScenario.assumptions).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Assumptions</Label>
                  <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto max-h-48">
                    {JSON.stringify(selectedScenario.assumptions, null, 2)}
                  </pre>
                </div>
              )}

              {selectedScenario.outputs && Object.keys(selectedScenario.outputs).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Outputs</Label>
                  <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto max-h-48">
                    {JSON.stringify(selectedScenario.outputs, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FinanceCompassScenarios() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <ScenariosContent />
        </div>
      </div>
    </AdminLayout>
  );
}
