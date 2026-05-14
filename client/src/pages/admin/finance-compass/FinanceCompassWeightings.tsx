import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Settings2,
  Download,
  Upload,
  Save,
  X,
  Edit2,
  Plus,
  Trash2,
  FileSpreadsheet,
  History,
  Link2,
  AlertCircle,
  Check,
  Filter,
  ChevronDown,
  ChevronRight,
  Search,
  HelpCircle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface QuestionConfig {
  questionKey: string;
  questionText: string;
  tier: string;
  dimension: string | null;
  questionType: string;
  order: number;
  helpText: string | null;
  required: boolean;
  dimensionWeight: number;
  overallWeight: number;
  scoreMultiplier: number;
  maxScore: number;
  scoringConfig: any;
  benchmarkContribution: any;
  notes: string | null;
  weightingId: string | null;
  lastModifiedBy: string | null;
  updatedAt: string | null;
  correlations: Correlation[];
  correlationCount: number;
}

interface Correlation {
  id: string;
  sourceQuestionKey: string;
  sourceQuestionText: string;
  targetQuestionKey: string;
  targetQuestionText: string;
  correlationType: string;
  correlationWeight: number;
  effectType: string;
  effectValue: number;
  isActive: boolean;
  description: string | null;
}

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  questionKey: string | null;
  action: string;
  previousValue: any;
  newValue: any;
  modifiedBy: string | null;
  modifiedAt: string;
  importSource: string | null;
}

interface QuestionConfigResponse {
  data?: {
    questions?: QuestionConfig[];
    correlations?: Correlation[];
    totalQuestions?: number;
    totalWeightings?: number;
    totalCorrelations?: number;
    filters?: {
      tiers?: string[];
      dimensions?: string[];
    };
  };
}

const TIER_LABELS: Record<string, string> = {
  registration: "Registration",
  quick_assessment: "Quick",
  pre_assessment: "Pre-Assessment",
  full: "Full",
};

export default function FinanceCompassWeightings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("questions");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterDimension, setFilterDimension] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<QuestionConfig>>({});
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<QuestionConfig>>>(new Map());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [showCorrelationDialog, setShowCorrelationDialog] = useState(false);
  const [editingCorrelation, setEditingCorrelation] = useState<Partial<Correlation> | null>(null);
  
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);

  const { data: configData, isLoading: configLoading } = useQuery<QuestionConfigResponse>({
    queryKey: ["/api/admin/finance-compass/question-config"],
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["/api/admin/finance-compass/question-weightings/audit"],
  });

  const batchSaveMutation = useMutation({
    mutationFn: async (updates: Partial<QuestionConfig>[]) => {
      const response = await apiRequest("POST", "/api/admin/finance-compass/question-weightings/batch", { updates });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-weightings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-weightings/audit"] });
      setPendingChanges(new Map());
      toast({
        title: "Batch Save Complete",
        description: data.message || `Saved ${data.data?.summary?.succeeded} changes`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save changes", variant: "destructive" });
    },
  });

  const saveCorrelationMutation = useMutation({
    mutationFn: async (data: Partial<Correlation>) => {
      const response = await apiRequest("POST", "/api/admin/finance-compass/question-correlations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-correlations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-weightings/audit"] });
      setShowCorrelationDialog(false);
      setEditingCorrelation(null);
      toast({ title: "Saved", description: "Correlation saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save correlation", variant: "destructive" });
    },
  });

  const deleteCorrelationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/finance-compass/question-correlations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-correlations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-weightings/audit"] });
      toast({ title: "Deleted", description: "Correlation deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete correlation", variant: "destructive" });
    },
  });

  const seedCorrelationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/finance-compass/seed-correlations", {});
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-correlations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-weightings/audit"] });
      toast({ 
        title: "Correlations Seeded", 
        description: data.message || `Created ${data.data?.created || 0} correlations` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to seed correlations", variant: "destructive" });
    },
  });

  const recalculateScoresMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/finance-compass/recalculate-scores", {});
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/assessments"] });
      toast({ 
        title: "Scores Recalculated", 
        description: data.message || `Recalculated ${data.data?.recalculated || 0} assessments` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to recalculate scores", variant: "destructive" });
    },
  });

  const auditResponse = auditData as { data?: { items?: AuditLog[] } } | undefined;
  
  const questions: QuestionConfig[] = configData?.data?.questions || [];
  const allCorrelations: Correlation[] = configData?.data?.correlations || [];
  const auditLogs: AuditLog[] = auditResponse?.data?.items || [];
  const filterOptions = configData?.data?.filters || { tiers: [], dimensions: [] };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filterTier !== "all" && q.tier !== filterTier) return false;
      if (filterDimension !== "all" && q.dimension !== filterDimension) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return q.questionKey.toLowerCase().includes(query) ||
          q.questionText.toLowerCase().includes(query) ||
          (q.dimension?.toLowerCase().includes(query) ?? false);
      }
      return true;
    });
  }, [questions, filterTier, filterDimension, searchQuery]);

  const handleStartEdit = (row: QuestionConfig) => {
    setEditingRow(row.questionKey);
    setEditValues({
      dimensionWeight: row.dimensionWeight,
      overallWeight: row.overallWeight,
      scoreMultiplier: row.scoreMultiplier,
      maxScore: row.maxScore,
      notes: row.notes,
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const handleSaveEdit = (questionKey: string) => {
    const updates = new Map(pendingChanges);
    updates.set(questionKey, { questionKey, ...editValues });
    setPendingChanges(updates);
    setEditingRow(null);
    setEditValues({});
  };

  const handleBatchSave = () => {
    if (pendingChanges.size === 0) return;
    batchSaveMutation.mutate(Array.from(pendingChanges.values()));
  };

  const handleExport = () => {
    window.open("/api/admin/finance-compass/question-weightings/export/excel", "_blank");
    toast({ title: "Export Started", description: "Excel file download initiated" });
  };

  const handleExportScoringLogic = () => {
    window.open("/api/admin/finance-compass/scoring-logic/export?tier=pre_assessment", "_blank");
    toast({ title: "Export Started", description: "Scoring logic Excel file download initiated" });
  };

  const handleImportPreview = async () => {
    if (!importFile) return;

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const csrfToken = await (await import("@/lib/queryClient")).getCsrfToken();
      const response = await fetch("/api/admin/finance-compass/question-weightings/import/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      });
      const data = await response.json();
      setImportPreview(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to preview import", variant: "destructive" });
    }
  };

  const handleImportApply = async () => {
    if (!importFile) return;

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const csrfToken = await (await import("@/lib/queryClient")).getCsrfToken();
      const response = await fetch("/api/admin/finance-compass/question-weightings/import/apply", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      });
      const data = await response.json();
      
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-config"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-weightings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/question-weightings/audit"] });
        setShowImportDialog(false);
        setImportFile(null);
        setImportPreview(null);
        toast({ title: "Import Complete", description: data.message });
      } else {
        toast({ title: "Import Failed", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to apply import", variant: "destructive" });
    }
  };

  const handleEditCorrelation = (correlation: Correlation) => {
    setEditingCorrelation(correlation);
    setShowCorrelationDialog(true);
  };

  const handleNewCorrelation = () => {
    setEditingCorrelation({
      correlationType: "positive",
      correlationWeight: 0.5,
      effectType: "boost",
      effectValue: 0.1,
      isActive: true,
    });
    setShowCorrelationDialog(true);
  };

  const handleSaveCorrelation = () => {
    if (!editingCorrelation) return;
    
    // Validate required fields
    if (!editingCorrelation.sourceQuestionKey || !editingCorrelation.targetQuestionKey) {
      toast({ 
        title: "Validation Error", 
        description: "Please select both source and target questions", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!editingCorrelation.correlationType || !editingCorrelation.effectType) {
      toast({ 
        title: "Validation Error", 
        description: "Please select correlation type and effect type", 
        variant: "destructive" 
      });
      return;
    }
    
    saveCorrelationMutation.mutate(editingCorrelation);
  };

  const toggleRowExpansion = (questionKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(questionKey)) {
      newExpanded.delete(questionKey);
    } else {
      newExpanded.add(questionKey);
    }
    setExpandedRows(newExpanded);
  };

  if (configLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Link href="/admin" className="hover:text-foreground flex items-center gap-1" data-testid="link-admin-back">
          <ArrowLeft className="h-4 w-4" />
          Admin Centre
        </Link>
        <span>/</span>
        <span>FinanceCompass</span>
        <span>/</span>
        <span className="text-foreground">Question Configuration</span>
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-question-config">
            <Settings2 className="h-6 w-6" />
            Question Configuration
          </h1>
          <p className="text-muted-foreground">
            Configure scoring weights, correlations, and question settings for FinanceCompass assessments
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportScoringLogic} data-testid="button-export-scoring-logic">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Scoring Logic
          </Button>
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)} data-testid="button-import">
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => recalculateScoresMutation.mutate()} 
            disabled={recalculateScoresMutation.isPending}
            data-testid="button-recalculate-scores"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {recalculateScoresMutation.isPending ? "Recalculating..." : "Recalculate Scores"}
          </Button>
          {pendingChanges.size > 0 && (
            <Button onClick={handleBatchSave} disabled={batchSaveMutation.isPending} data-testid="button-save-all">
              <Save className="h-4 w-4 mr-2" />
              Save {pendingChanges.size} Changes
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="stat-total-questions">{configData?.data?.totalQuestions || 0}</div>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="stat-configured">{configData?.data?.totalWeightings || 0}</div>
            <p className="text-xs text-muted-foreground">Configured Weightings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="stat-correlations">{configData?.data?.totalCorrelations || 0}</div>
            <p className="text-xs text-muted-foreground">Correlations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="stat-pending">{pendingChanges.size}</div>
            <p className="text-xs text-muted-foreground">Pending Changes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="questions" data-testid="tab-questions">
            <Settings2 className="h-4 w-4 mr-2" />
            Questions ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="correlations" data-testid="tab-correlations">
            <Link2 className="h-4 w-4 mr-2" />
            Correlations ({allCorrelations.length})
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <History className="h-4 w-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Question Weightings</CardTitle>
                  <CardDescription>
                    Configure dimension and overall weights for each question.
                    {pendingChanges.size > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {pendingChanges.size} unsaved changes
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterTier} onValueChange={setFilterTier}>
                    <SelectTrigger className="w-[150px]" data-testid="select-tier-filter">
                      <SelectValue placeholder="Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      {filterOptions.tiers?.map(tier => (
                        <SelectItem key={tier} value={tier}>
                          {TIER_LABELS[tier] || tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterDimension} onValueChange={setFilterDimension}>
                    <SelectTrigger className="w-[180px]" data-testid="select-dimension-filter">
                      <SelectValue placeholder="Dimension" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dimensions</SelectItem>
                      {filterOptions.dimensions?.map(d => (
                        <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-[200px] pl-9"
                      data-testid="input-search"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[180px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              Question Key
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Unique identifier for this question used in scoring calculations</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="min-w-[300px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              Question Text
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The question displayed to users during assessment</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              Tier
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Assessment tier this question belongs to (Registration, Quick, Pre-Assessment, Full)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              Dimension
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The finance capability dimension this question measures</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 justify-end cursor-help">
                              Dim. Weight
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>How heavily this question contributes to its dimension score (0-10). Higher = more impact on dimension score.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 justify-end cursor-help">
                              Overall Weight
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>How heavily this question contributes to the overall assessment score (0-10). Higher = more impact on final score.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 justify-end cursor-help">
                              Multiplier
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Score multiplier applied after weighting. 1.0 = no change, &gt;1 = amplify, &lt;1 = reduce.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 justify-end cursor-help">
                              Max Score
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Maximum possible score for this question (typically 5 for slider, varies for select)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 justify-center cursor-help">
                              Corr. Count
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of correlation rules that affect or are affected by this question</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="min-w-[200px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              Primary Correlation
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>First correlation rule for this question (expand row to see all)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((row) => {
                      const isEditing = editingRow === row.questionKey;
                      const hasPendingChange = pendingChanges.has(row.questionKey);
                      const displayValues = hasPendingChange ? pendingChanges.get(row.questionKey) : row;
                      const isExpanded = expandedRows.has(row.questionKey);
                      const hasCorrelations = row.correlationCount > 0;

                      return (
                        <Fragment key={row.questionKey}>
                          <TableRow 
                            className={hasPendingChange ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}
                            data-testid={`row-${row.questionKey}`}
                          >
                            <TableCell>
                              {hasCorrelations && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => toggleRowExpansion(row.questionKey)}
                                  data-testid={`button-expand-${row.questionKey}`}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-1">
                                {row.questionKey}
                                {hasPendingChange && (
                                  <Badge variant="outline" className="text-xs">
                                    Modified
                                  </Badge>
                                )}
                                {hasCorrelations && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Link2 className="h-3 w-3 mr-1" />
                                    {row.correlationCount}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[400px] truncate" title={row.questionText}>
                              {row.questionText}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                row.tier === "registration" ? "outline" :
                                row.tier === "quick_assessment" ? "secondary" :
                                row.tier === "pre_assessment" ? "secondary" : "default"
                              }>
                                {TIER_LABELS[row.tier] || row.tier}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.dimension?.replace(/_/g, " ") || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={editValues.dimensionWeight}
                                  onChange={(e) => setEditValues({ ...editValues, dimensionWeight: parseFloat(e.target.value) })}
                                  className="w-20 text-right"
                                  data-testid="input-dimension-weight"
                                />
                              ) : (
                                displayValues?.dimensionWeight?.toFixed(1) || row.dimensionWeight.toFixed(1)
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={editValues.overallWeight}
                                  onChange={(e) => setEditValues({ ...editValues, overallWeight: parseFloat(e.target.value) })}
                                  className="w-20 text-right"
                                  data-testid="input-overall-weight"
                                />
                              ) : (
                                displayValues?.overallWeight?.toFixed(1) || row.overallWeight.toFixed(1)
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={editValues.scoreMultiplier}
                                  onChange={(e) => setEditValues({ ...editValues, scoreMultiplier: parseFloat(e.target.value) })}
                                  className="w-20 text-right"
                                  data-testid="input-multiplier"
                                />
                              ) : (
                                displayValues?.scoreMultiplier?.toFixed(1) || row.scoreMultiplier.toFixed(1)
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.5"
                                  value={editValues.maxScore}
                                  onChange={(e) => setEditValues({ ...editValues, maxScore: parseFloat(e.target.value) })}
                                  className="w-20 text-right"
                                  data-testid="input-max-score"
                                />
                              ) : (
                                displayValues?.maxScore?.toFixed(1) || row.maxScore.toFixed(1)
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {hasCorrelations ? (
                                <Badge variant="secondary" className="text-xs">
                                  {row.correlationCount}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {hasCorrelations && row.correlations.length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Badge variant={row.correlations[0].correlationType === "positive" ? "default" : 
                                                 row.correlations[0].correlationType === "negative" ? "destructive" : "secondary"}
                                         className="text-xs">
                                    {row.correlations[0].correlationType}
                                  </Badge>
                                  <span className="text-muted-foreground text-xs">→</span>
                                  <span className="font-mono text-xs">{row.correlations[0].targetQuestionKey}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {row.correlations[0].effectType}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleSaveEdit(row.questionKey)}
                                    data-testid="button-save-row"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    data-testid="button-cancel-row"
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleStartEdit(row)}
                                  data-testid={`button-edit-${row.questionKey}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded && hasCorrelations && (
                            <TableRow key={`${row.questionKey}-correlations`}>
                              <TableCell colSpan={12} className="bg-muted/50 py-2">
                                <div className="pl-8 space-y-2">
                                  <div className="text-xs font-medium text-muted-foreground mb-2">
                                    Correlations for this question:
                                  </div>
                                  {row.correlations.map((corr) => (
                                    <div 
                                      key={corr.id} 
                                      className="flex items-center gap-4 text-sm p-2 bg-background rounded border"
                                      data-testid={`correlation-${corr.id}`}
                                    >
                                      <Badge variant={corr.correlationType === "positive" ? "default" : 
                                                     corr.correlationType === "negative" ? "destructive" : "secondary"}>
                                        {corr.correlationType}
                                      </Badge>
                                      <span className="text-muted-foreground">affects</span>
                                      <span className="font-mono text-xs">{corr.targetQuestionKey}</span>
                                      <Badge variant="outline">{corr.effectType} {corr.effectValue}</Badge>
                                      <span className="text-muted-foreground text-xs">weight: {corr.correlationWeight}</span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleEditCorrelation(corr)}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
                </TooltipProvider>
              </div>
              {filteredQuestions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No questions match your filters.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Question Correlations</CardTitle>
                  <CardDescription>
                    Define relationships between questions that affect scoring
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => seedCorrelationsMutation.mutate()} 
                    disabled={seedCorrelationsMutation.isPending}
                    data-testid="button-seed-correlations"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {seedCorrelationsMutation.isPending ? "Seeding..." : "Seed Suggested Correlations"}
                  </Button>
                  <Button onClick={handleNewCorrelation} data-testid="button-new-correlation">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Correlation
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {allCorrelations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No correlations defined yet.</p>
                  <p className="text-sm">Click "Add Correlation" to create one.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Question</TableHead>
                      <TableHead>Target Question</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Effect</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCorrelations.map((corr) => (
                      <TableRow key={corr.id} data-testid={`row-correlation-${corr.id}`}>
                        <TableCell className="max-w-[200px]">
                          <div className="font-mono text-xs text-muted-foreground">{corr.sourceQuestionKey}</div>
                          <div className="truncate text-sm" title={corr.sourceQuestionText}>
                            {corr.sourceQuestionText}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="font-mono text-xs text-muted-foreground">{corr.targetQuestionKey}</div>
                          <div className="truncate text-sm" title={corr.targetQuestionText}>
                            {corr.targetQuestionText}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={corr.correlationType === "positive" ? "default" : 
                                         corr.correlationType === "negative" ? "destructive" : "secondary"}>
                            {corr.correlationType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{corr.effectType}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{corr.correlationWeight.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{corr.effectValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={corr.isActive ? "default" : "secondary"}>
                            {corr.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditCorrelation(corr)}
                              data-testid={`button-edit-correlation-${corr.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteCorrelationMutation.mutate(corr.id)}
                              disabled={deleteCorrelationMutation.isPending}
                              data-testid={`button-delete-correlation-${corr.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                Track all changes to question weightings and correlations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit records yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Modified By</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell className="text-sm">
                          {format(new Date(log.modifiedAt), "dd MMM HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.entityType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.action === "create" ? "default" : 
                                         log.action === "delete" ? "destructive" : "secondary"}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.questionKey || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.modifiedBy || "System"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.importSource || "manual"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCorrelationDialog} onOpenChange={setShowCorrelationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCorrelation?.id ? "Edit Correlation" : "New Correlation"}
            </DialogTitle>
            <DialogDescription>
              Define how questions relate to each other in scoring
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source Question</Label>
              <Select
                value={editingCorrelation?.sourceQuestionKey || ""}
                onValueChange={(v) => setEditingCorrelation({ ...editingCorrelation, sourceQuestionKey: v })}
              >
                <SelectTrigger data-testid="select-source-question">
                  <SelectValue placeholder="Select source question" />
                </SelectTrigger>
                <SelectContent>
                  {questions.map((q) => (
                    <SelectItem key={q.questionKey} value={q.questionKey}>
                      {q.questionKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Question</Label>
              <Select
                value={editingCorrelation?.targetQuestionKey || ""}
                onValueChange={(v) => setEditingCorrelation({ ...editingCorrelation, targetQuestionKey: v })}
              >
                <SelectTrigger data-testid="select-target-question">
                  <SelectValue placeholder="Select target question" />
                </SelectTrigger>
                <SelectContent>
                  {questions.map((q) => (
                    <SelectItem key={q.questionKey} value={q.questionKey}>
                      {q.questionKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Correlation Type</Label>
                <Select
                  value={editingCorrelation?.correlationType || "positive"}
                  onValueChange={(v) => setEditingCorrelation({ ...editingCorrelation, correlationType: v })}
                >
                  <SelectTrigger data-testid="select-correlation-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Effect Type</Label>
                <Select
                  value={editingCorrelation?.effectType || "boost"}
                  onValueChange={(v) => setEditingCorrelation({ ...editingCorrelation, effectType: v })}
                >
                  <SelectTrigger data-testid="select-effect-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boost">Boost (+)</SelectItem>
                    <SelectItem value="reduce">Reduce (-)</SelectItem>
                    <SelectItem value="adjust">Adjust (=)</SelectItem>
                    <SelectItem value="multiply">Multiply (x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Correlation Weight (0-1)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editingCorrelation?.correlationWeight || 0.5}
                  onChange={(e) => setEditingCorrelation({ ...editingCorrelation, correlationWeight: parseFloat(e.target.value) })}
                  data-testid="input-correlation-weight"
                />
              </div>
              <div className="space-y-2">
                <Label>Effect Value</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingCorrelation?.effectValue || 0}
                  onChange={(e) => setEditingCorrelation({ ...editingCorrelation, effectValue: parseFloat(e.target.value) })}
                  data-testid="input-effect-value"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingCorrelation?.description || ""}
                onChange={(e) => setEditingCorrelation({ ...editingCorrelation, description: e.target.value })}
                placeholder="Optional description of this correlation"
                data-testid="input-correlation-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCorrelationDialog(false)} data-testid="button-cancel-correlation">
              Cancel
            </Button>
            <Button onClick={handleSaveCorrelation} disabled={saveCorrelationMutation.isPending} data-testid="button-save-correlation">
              {saveCorrelationMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Excel File</DialogTitle>
            <DialogDescription>
              Upload an Excel file to update question weightings. Preview changes before applying.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Excel File</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportPreview(null);
                }}
                data-testid="input-import-file"
              />
            </div>
            
            {importFile && !importPreview && (
              <Button onClick={handleImportPreview} data-testid="button-preview-import">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Preview Changes
              </Button>
            )}

            {importPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Weighting Changes</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">
                          +{importPreview.data?.summary?.weightings?.creates || 0} new
                        </span>
                        <span className="text-yellow-600">
                          ~{importPreview.data?.summary?.weightings?.updates || 0} updated
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Correlation Changes</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">
                          +{importPreview.data?.summary?.correlations?.creates || 0} new
                        </span>
                        <span className="text-yellow-600">
                          ~{importPreview.data?.summary?.correlations?.updates || 0} updated
                        </span>
                        <span className="text-red-600">
                          -{importPreview.data?.summary?.correlations?.deletes || 0} deleted
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {importPreview.data?.errors?.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Validation Errors ({importPreview.data.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        {importPreview.data.errors.slice(0, 10).map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importPreview.data.errors.length > 10 && (
                          <li>...and {importPreview.data.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportPreview(null);
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            {importPreview?.success && (
              <Button onClick={handleImportApply} data-testid="button-apply-import">
                <Check className="h-4 w-4 mr-2" />
                Apply Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
