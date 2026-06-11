import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ClipboardList,
  Building,
  User,
  Calendar,
  Eye,
  Filter,
  RefreshCw,
  Mail,
  Shield,
  Download,
  Loader2,
  FileText,
  Presentation,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  Trash2,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";

interface Assessment {
  id: string;
  tier: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  epmReadinessScore?: number;
  urgencyScore?: number;
  internalNotes?: string;
  company?: {
    id: string;
    name: string;
    sector?: string;
    country?: string;
  } | null;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleTitle?: string;
    phone?: string;
    hasFullAssessmentAccess?: boolean;
  } | null;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "not_started":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "in_progress":
      return "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#252826]/30 dark:text-[#7FB8A3]";
    case "initial_complete":
    case "followups_pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "completed":
    case "analysed":
    case "report_generated":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getTierBadgeClass(tier: string) {
  switch (tier) {
    case "pre_assessment":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    case "full":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatTierLabel(tier: string) {
  switch (tier) {
    case "pre_assessment":
      return "Pre-Assessment";
    case "full":
      return "Full";
    default:
      return tier;
  }
}

function formatStatusLabel(status: string) {
  return status.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

interface AssessmentOutputs {
  pdf: {
    available: boolean;
    generatedAt: string | null;
  };
  pptx: {
    available: boolean;
    status: 'not_started' | 'queued' | 'generating' | 'ready' | 'failed' | null;
    url: string | null;
    taskId: string | null;
  };
}

interface AssessmentQuestion {
  id: string;
  questionKey?: string;
  prompt: string;
  dimension?: string;
  type: string;
  options?: { value: string; label: string }[];
  sliderConfig?: { min: number; max: number; labels: Record<number, string> };
}

interface AssessmentResponse {
  id: string;
  questionId: string;
  value?: any;
  textValue?: string;
  score?: number;
}

interface AssessmentDetails {
  assessment: Assessment;
  company: Assessment['company'];
  contact: Assessment['contact'];
  responses: AssessmentResponse[];
  questions: AssessmentQuestion[];
}

function AssessmentsContent() {
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (tierFilter !== "all") queryParams.set("tier", tierFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const queryString = queryParams.toString();
  const apiUrl = `/api/admin/finance-compass/assessments${queryString ? `?${queryString}` : ""}`;
  
  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; data: Assessment[] }>({
    queryKey: [apiUrl],
  });

  const assessments = data?.data ?? [];

  // Query for assessment outputs when an assessment is selected
  const { data: outputsData, refetch: refetchOutputs, isLoading: isLoadingOutputs } = useQuery<{ success: boolean; data: AssessmentOutputs }>({
    queryKey: ['/api/admin/finance-compass/assessments', selectedAssessment?.id, 'outputs'],
    queryFn: async () => {
      if (!selectedAssessment?.id) return { success: false, data: null as unknown as AssessmentOutputs };
      const res = await fetch(`/api/admin/finance-compass/assessments/${selectedAssessment.id}/outputs`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!selectedAssessment?.id && isDetailOpen,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.data?.pptx?.status === 'queued' || data?.data?.pptx?.status === 'generating') {
        return 5000;
      }
      return false;
    },
  });

  const outputs = outputsData?.data;

  // Query for detailed assessment data (responses & questions) when dialog is open
  const { data: detailsData, isLoading: isLoadingDetails } = useQuery<{ success: boolean; data: AssessmentDetails }>({
    queryKey: ['/api/admin/finance-compass/assessments', selectedAssessment?.id, 'details'],
    queryFn: async () => {
      if (!selectedAssessment?.id) return { success: false, data: null as unknown as AssessmentDetails };
      const res = await fetch(`/api/admin/finance-compass/assessments/${selectedAssessment.id}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!selectedAssessment?.id && isDetailOpen,
  });

  const assessmentDetails = detailsData?.data;

  // Group questions by dimension
  const groupedResponses = useMemo(() => {
    if (!assessmentDetails?.questions || !assessmentDetails?.responses) return {};
    
    const responseMap = new Map<string, AssessmentResponse>();
    for (const resp of assessmentDetails.responses) {
      responseMap.set(resp.questionId, resp);
    }
    
    const grouped: Record<string, { question: AssessmentQuestion; response: AssessmentResponse | undefined }[]> = {};
    
    for (const question of assessmentDetails.questions) {
      const dimension = question.dimension || 'general';
      if (!grouped[dimension]) {
        grouped[dimension] = [];
      }
      grouped[dimension].push({
        question,
        response: responseMap.get(question.id),
      });
    }
    
    return grouped;
  }, [assessmentDetails]);

  const formatDimensionName = (dim: string) => {
    return dim.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const formatResponseValue = (response: AssessmentResponse | undefined, question?: AssessmentQuestion) => {
    if (!response) return "Not answered";
    if (response.textValue) return response.textValue;
    if (response.value === undefined || response.value === null) return "Not answered";
    
    // For slider/Likert scale questions with sliderConfig.labels
    if (question?.sliderConfig?.labels && typeof response.value === "number") {
      const label = question.sliderConfig.labels[response.value];
      if (label) {
        return `${response.value} - ${label}`;
      }
    }
    
    // For multi-select or single-select with options array
    if (question?.options && Array.isArray(question.options)) {
      if (Array.isArray(response.value)) {
        // Multi-select: map each value to its label
        const labels = response.value.map((val: string) => {
          const opt = question.options?.find((o) => o.value === val);
          return opt?.label || val;
        });
        return labels.join("; ");
      } else {
        // Single select
        const opt = question.options.find((o) => o.value === response.value);
        if (opt?.label) return opt.label;
      }
    }
    
    // For structured responses (objects), format nicely
    if (typeof response.value === "object") {
      if (response.value.text) return response.value.text;
      if (response.value.otherText) return response.value.otherText;
      return JSON.stringify(response.value);
    }
    
    return String(response.value);
  };

  const handleExportExcel = async () => {
    if (!selectedAssessment?.id) return;
    try {
      window.open(`/api/admin/finance-compass/assessments/${selectedAssessment.id}/responses/export`, '_blank');
      toast({ title: "Excel export started" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleViewDashboard = () => {
    if (!selectedAssessment?.id) return;
    window.open(`/finance-compass/results/${selectedAssessment.id}`, '_blank');
  };

  const handleGeneratePptx = async (force = false) => {
    if (!selectedAssessment?.id) return;
    setIsGeneratingPptx(true);
    try {
      const res = await apiRequest('POST', `/api/admin/finance-compass/assessments/${selectedAssessment.id}/slidespeak/generate`, { force });
      const result = await res.json();
      if (result.success) {
        toast({ 
          title: force ? "Regenerating Presentation" : "Generating Presentation", 
          description: result.data?.status === 'ready' ? "Presentation is already available" : "This may take a few minutes..." 
        });
        refetchOutputs();
      } else {
        throw new Error(result.error || 'Failed to start generation');
      }
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error?.message || "Failed to generate presentation", variant: "destructive" });
    } finally {
      setIsGeneratingPptx(false);
    }
  };

  const handleDownloadPptx = async () => {
    if (!selectedAssessment?.id) return;
    try {
      window.open(`/api/admin/finance-compass/assessments/${selectedAssessment.id}/slidespeak/download`, '_blank');
    } catch (error) {
      toast({ title: "Download Failed", variant: "destructive" });
    }
  };

  const deleteAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: string) => {
      return apiRequest("DELETE", `/api/admin/finance-compass/assessments/${assessmentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Assessment Deleted",
        description: "The assessment and all related data have been deleted.",
      });
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
      setIsDetailOpen(false);
      setSelectedAssessment(null);
      queryClient.invalidateQueries({ queryKey: [apiUrl] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "An unexpected error occurred while deleting the assessment.";
      toast({
        title: "Failed to Delete Assessment",
        description: `${errorMessage} Please try again or contact support if the issue persists.`,
        variant: "destructive",
      });
    },
  });

  const toggleAccessMutation = useMutation({
    mutationFn: async ({ contactId, hasFullAssessmentAccess }: { contactId: string; hasFullAssessmentAccess: boolean }) => {
      return apiRequest("PATCH", `/api/admin/finance-compass/contacts/${contactId}/full-access`, {
        hasFullAssessmentAccess,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.hasFullAssessmentAccess ? "Access Granted" : "Access Revoked",
        description: variables.hasFullAssessmentAccess 
          ? "Full assessment access has been granted to this contact."
          : "Full assessment access has been revoked from this contact.",
      });
      if (selectedAssessment?.contact) {
        setSelectedAssessment({
          ...selectedAssessment,
          contact: {
            ...selectedAssessment.contact,
            hasFullAssessmentAccess: variables.hasFullAssessmentAccess,
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/assessments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update access. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsDetailOpen(true);
  };

  const handleToggleAccess = (checked: boolean) => {
    if (selectedAssessment?.contact?.id) {
      toggleAccessMutation.mutate({
        contactId: selectedAssessment.contact.id,
        hasFullAssessmentAccess: checked,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Assessments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and review assessment submissions
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="flex items-center gap-3">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-tier-filter">
                  <SelectValue placeholder="Filter by tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="quick_assessment">Quick Assessment</SelectItem>
                  <SelectItem value="pre_assessment">Pre-Assessment</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="initial_complete">Initial Complete</SelectItem>
                  <SelectItem value="followups_pending">Followups Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="analysed">Analysed</SelectItem>
                  <SelectItem value="report_generated">Report Generated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assessments.length > 0 ? (
            <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment, index) => (
                  <TableRow 
                    key={assessment.id} 
                    className="cursor-pointer"
                    onClick={() => handleViewDetails(assessment)}
                    data-testid={`row-assessment-${index}`}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {assessment.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {assessment.company?.name || "Unknown Company"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {assessment.contact ? 
                              `${assessment.contact.firstName} ${assessment.contact.lastName}` : 
                              "Unknown"
                            }
                          </span>
                        </div>
                        {assessment.contact?.email && (
                          <span className="text-xs text-muted-foreground ml-6">
                            {assessment.contact.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTierBadgeClass(assessment.tier)} data-testid={`badge-tier-${index}`}>
                        {formatTierLabel(assessment.tier)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(assessment.status)} data-testid={`badge-status-${index}`}>
                        {formatStatusLabel(assessment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(assessment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(assessment);
                          }}
                          data-testid={`button-view-${index}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssessmentToDelete(assessment);
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No assessments found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tierFilter !== "all" || statusFilter !== "all" 
                  ? "Try adjusting your filters"
                  : "Assessments will appear here once users submit them"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Assessment Details
            </DialogTitle>
            <DialogDescription>
              {selectedAssessment?.id && `ID: ${selectedAssessment.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-6">
              {/* View Dashboard and Export Actions */}
              <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b">
                <Button 
                  onClick={handleViewDashboard}
                  className="gap-2"
                  data-testid="button-view-dashboard"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Results Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportExcel}
                  className="gap-2"
                  data-testid="button-export-excel"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Responses to Excel
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Company</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedAssessment.company?.name || "Unknown"}</span>
                      </div>
                      {selectedAssessment.company?.sector && (
                        <p className="text-sm text-muted-foreground">Sector: {selectedAssessment.company.sector}</p>
                      )}
                      {selectedAssessment.company?.country && (
                        <p className="text-sm text-muted-foreground">Country: {selectedAssessment.company.country}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedAssessment.contact 
                            ? `${selectedAssessment.contact.firstName} ${selectedAssessment.contact.lastName}`
                            : "Unknown"
                          }
                        </span>
                      </div>
                      {selectedAssessment.contact?.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {selectedAssessment.contact.email}
                        </div>
                      )}
                      {selectedAssessment.contact?.roleTitle && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedAssessment.contact.roleTitle}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {selectedAssessment.contact && (
                <Card className="border-[#8E4F67]/30 bg-[#8E4F67]/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[#8E4F67]/10">
                          <Shield className="h-5 w-5 text-brand-teal" />
                        </div>
                        <div>
                          <Label htmlFor="full-access-toggle" className="text-sm font-medium cursor-pointer">
                            Full Assessment Access
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Allow this contact to start full assessments
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="full-access-toggle"
                        checked={selectedAssessment.contact.hasFullAssessmentAccess ?? false}
                        onCheckedChange={handleToggleAccess}
                        disabled={toggleAccessMutation.isPending}
                        data-testid="switch-full-access"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Tier</h4>
                  <Badge className={getTierBadgeClass(selectedAssessment.tier)} data-testid="badge-detail-tier">
                    {formatTierLabel(selectedAssessment.tier)}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
                  <Badge className={getStatusBadgeClass(selectedAssessment.status)} data-testid="badge-detail-status">
                    {formatStatusLabel(selectedAssessment.status)}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Created</h4>
                  <p className="text-sm">{new Date(selectedAssessment.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {(selectedAssessment.epmReadinessScore !== undefined || selectedAssessment.urgencyScore !== undefined) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedAssessment.epmReadinessScore !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Maturity Score</h4>
                      <p className="text-2xl font-semibold">{selectedAssessment.epmReadinessScore}/100</p>
                    </div>
                  )}
                  {selectedAssessment.urgencyScore !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Urgency Score</h4>
                      <p className="text-2xl font-semibold">{selectedAssessment.urgencyScore}/5</p>
                    </div>
                  )}
                </div>
              )}

              {/* Report Outputs Section */}
              {['completed', 'analysed', 'report_generated'].includes(selectedAssessment.status) && (
                <div className="pt-4 border-t space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Report Outputs
                  </h4>
                  
                  {isLoadingOutputs ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {/* PDF Download */}
                      <Card className="p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                              <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">PDF Report</p>
                              <p className="text-xs text-muted-foreground">
                                {outputs?.pdf?.available ? 'Available for download' : 'Generate by downloading'}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/admin/finance-compass/assessments/${selectedAssessment.id}/pdf`, {
                                  credentials: 'include'
                                });
                                if (!response.ok) throw new Error('Failed to generate PDF');
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `FinanceCompass-${selectedAssessment.company?.name || 'Report'}-${selectedAssessment.tier}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                toast({ title: "PDF downloaded successfully" });
                                refetchOutputs();
                              } catch (error) {
                                toast({ title: "Failed to download PDF", variant: "destructive" });
                              }
                            }}
                            data-testid="button-download-pdf"
                          >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Download
                          </Button>
                        </div>
                      </Card>
                      
                      {/* PowerPoint Generation */}
                      <Card className="p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                              <Presentation className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">PowerPoint Presentation</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                {outputs?.pptx?.status === 'ready' && (
                                  <>
                                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                                    Ready for download
                                  </>
                                )}
                                {outputs?.pptx?.status === 'queued' && (
                                  <>
                                    <Clock className="h-3 w-3 text-amber-500" />
                                    Queued for generation...
                                  </>
                                )}
                                {outputs?.pptx?.status === 'generating' && (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin text-[#7FB8A3]" />
                                    Generating presentation...
                                  </>
                                )}
                                {outputs?.pptx?.status === 'failed' && (
                                  <>
                                    <XCircle className="h-3 w-3 text-red-500" />
                                    Generation failed
                                  </>
                                )}
                                {(!outputs?.pptx?.status || outputs?.pptx?.status === 'not_started') && (
                                  <>Not generated yet</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {outputs?.pptx?.status === 'ready' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleDownloadPptx}
                                  data-testid="button-download-pptx"
                                >
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                  Download
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleGeneratePptx(true)}
                                  disabled={isGeneratingPptx}
                                  data-testid="button-regenerate-pptx"
                                >
                                  {isGeneratingPptx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                </Button>
                              </>
                            ) : outputs?.pptx?.status === 'queued' || outputs?.pptx?.status === 'generating' ? (
                              <Button size="sm" variant="outline" disabled>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Processing...
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGeneratePptx(false)}
                                disabled={isGeneratingPptx}
                                data-testid="button-generate-pptx"
                              >
                                {isGeneratingPptx ? (
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Presentation className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Generate
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {/* Assessment Responses Section */}
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Assessment Responses
                  </h4>
                  {assessmentDetails && (
                    <Badge variant="secondary" data-testid="badge-response-count">
                      {assessmentDetails.responses?.length || 0} / {assessmentDetails.questions?.length || 0} answered
                    </Badge>
                  )}
                </div>
                
                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading responses...</span>
                  </div>
                ) : Object.keys(groupedResponses).length > 0 ? (
                  <Accordion type="multiple" className="w-full" data-testid="accordion-responses">
                    {Object.entries(groupedResponses).map(([dimension, items]) => {
                      const answeredCount = items.filter(item => item.response).length;
                      return (
                        <AccordionItem key={dimension} value={dimension} data-testid={`accordion-item-${dimension}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between gap-4 flex-1 mr-4">
                              <span className="font-medium text-sm">{formatDimensionName(dimension)}</span>
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                data-testid={`badge-dimension-count-${dimension}`}
                              >
                                {answeredCount} / {items.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2">
                              {items.map(({ question, response }, idx) => (
                                <Card 
                                  key={question.id} 
                                  className={`p-3 ${!response ? 'opacity-60' : ''}`}
                                  data-testid={`card-response-${dimension}-${idx}`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-medium leading-snug flex-1">
                                        {question.prompt}
                                      </p>
                                      {question.questionKey && (
                                        <Badge variant="secondary" className="text-xs shrink-0">
                                          {question.questionKey}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between gap-4 pt-1">
                                      <div className="flex-1">
                                        <span className="text-xs text-muted-foreground mr-2">Answer:</span>
                                        <span className={`text-sm ${response ? 'font-medium' : 'text-muted-foreground italic'}`}>
                                          {formatResponseValue(response, question)}
                                        </span>
                                      </div>
                                      {response?.score !== undefined && response?.score !== null && (
                                        <Badge className="bg-[#8E4F67]/10 text-brand-teal border-0">
                                          Score: {response.score}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No responses found for this assessment</p>
                  </div>
                )}
              </div>

              {selectedAssessment.internalNotes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Internal Notes</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedAssessment.internalNotes}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assessment? This will permanently remove all
              responses, reports, and related data.
              {assessmentToDelete?.company?.name && (
                <span className="block mt-2 font-medium">
                  Company: {assessmentToDelete.company.name}
                </span>
              )}
              {assessmentToDelete?.contact?.email && (
                <span className="block text-sm">
                  Contact: {assessmentToDelete.contact.email}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assessmentToDelete && deleteAssessmentMutation.mutate(assessmentToDelete.id)}
              disabled={deleteAssessmentMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteAssessmentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function FinanceCompassAssessments() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <AssessmentsContent />
        </div>
      </div>
    </AdminLayout>
  );
}
