import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Activity, 
  Heart, 
  Server, 
  Clock, 
  Database, 
  Cpu, 
  HardDrive,
  RefreshCw,
  FileSearch,
  Globe,
  Bot,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  List,
  Brain,
  Shield,
  BookOpen,
  MessageSquare,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: { status: string; latency?: number };
    memory: { status: string; used: number; total: number; percentage: number };
    cpu: { status: string; loadAverage: number[] };
  };
}

interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  correlationId: string;
  ip: string;
  userAgent?: string;
}

interface RequestStats {
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
  statusCodes: Record<string, number>;
  topEndpoints: { path: string; count: number }[];
}

interface SeoStatus {
  sitemapLastGenerated: string | null;
  totalUrls: number;
  robotsConfig: {
    allowAll: boolean;
    disallowedPaths: string[];
    sitemapUrl: string;
  };
}

interface FcAiSystemPrompt {
  id: string;
  key: string;
  name: string;
  description: string | null;
  persona: string;
  content: string;
  category: string;
  isActive: boolean;
  version: number;
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FcAiGuardrail {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  priority: string;
  validationType: string;
  validationConfig: any;
  errorMessage: string;
  isBlocking: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FcAiGroundingRule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  applicableTiers: string[] | null;
  applicableDimensions: string[] | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface FcAiKnowledgeBase {
  id: string;
  key: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  tags: string[] | null;
  applicableTiers: string[] | null;
  applicableDimensions: string[] | null;
  sourceCitation: string | null;
  isActive: boolean;
  version: number;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FcAiFollowupTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  triggerCondition: any;
  promptTemplate: string;
  dimension: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminOperations() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiConfigTab, setAiConfigTab] = useState("prompts");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<any>(null);
  const [entityType, setEntityType] = useState<string>("");

  const { data: health, isLoading: healthLoading, refetch: refetchHealth, error: healthError } = useQuery<SystemHealth>({
    queryKey: ["/api/admin/operations/health"],
    refetchInterval: 30000,
  });

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs, error: logsError } = useQuery<{ logs: RequestLog[]; total: number }>({
    queryKey: ["/api/admin/operations/request-logs"],
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<RequestStats>({
    queryKey: ["/api/admin/operations/request-stats"],
    refetchInterval: 60000,
  });

  const { data: seoStatus, isLoading: seoLoading, error: seoError } = useQuery<SeoStatus>({
    queryKey: ["/api/admin/operations/seo/status"],
  });

  // AI Config queries
  const { data: systemPrompts, isLoading: promptsLoading, refetch: refetchPrompts, error: promptsError } = useQuery<FcAiSystemPrompt[]>({
    queryKey: ["/api/admin/ai-config/system-prompts"],
  });

  const { data: guardrails, isLoading: guardrailsLoading, refetch: refetchGuardrails, error: guardrailsError } = useQuery<FcAiGuardrail[]>({
    queryKey: ["/api/admin/ai-config/guardrails"],
  });

  const { data: groundingRules, isLoading: groundingLoading, refetch: refetchGrounding, error: groundingError } = useQuery<FcAiGroundingRule[]>({
    queryKey: ["/api/admin/ai-config/grounding-rules"],
  });

  const { data: knowledgeBase, isLoading: kbLoading, refetch: refetchKb, error: kbError } = useQuery<FcAiKnowledgeBase[]>({
    queryKey: ["/api/admin/ai-config/knowledge-base"],
  });

  const { data: followupTemplates, isLoading: followupLoading, refetch: refetchFollowup, error: followupError } = useQuery<FcAiFollowupTemplate[]>({
    queryKey: ["/api/admin/ai-config/followup-templates"],
  });

  // Aggregate query errors so the admin knows when something's broken instead
  // of staring at infinite skeletons. Auth failures (401/403) are by far the
  // most common cause — surface them up front.
  const queryErrors = [
    { label: "System health",     error: healthError },
    { label: "Request logs",      error: logsError },
    { label: "Request stats",     error: statsError },
    { label: "SEO status",        error: seoError },
    { label: "AI prompts",        error: promptsError },
    { label: "AI guardrails",     error: guardrailsError },
    { label: "AI grounding",      error: groundingError },
    { label: "AI knowledge base", error: kbError },
    { label: "AI followups",      error: followupError },
  ].filter((e) => e.error != null);
  const firstErrMsg = queryErrors[0]?.error instanceof Error ? queryErrors[0].error.message : "";
  const looksLikeAuth = firstErrMsg.startsWith("401") || firstErrMsg.startsWith("403");

  // Mutations
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ type, id, isActive }: { type: string; id: string; isActive: boolean }) => {
      const endpoint = `/api/admin/ai-config/${type}/${id}`;
      return await apiRequest("PATCH", endpoint, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/ai-config/${variables.type}`] });
      toast({ title: "Status updated", description: "The item has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      return await apiRequest("DELETE", `/api/admin/ai-config/${type}/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/ai-config/${variables.type}`] });
      setDeleteDialogOpen(false);
      toast({ title: "Deleted", description: "The item has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied",
      description: "Correlation ID copied to clipboard",
    });
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "ok":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "degraded":
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "unhealthy":
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-blue-500/10 text-blue-500";
      case "POST":
        return "bg-green-500/10 text-green-500";
      case "PUT":
      case "PATCH":
        return "bg-yellow-500/10 text-yellow-500";
      case "DELETE":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-green-500";
    if (code >= 300 && code < 400) return "text-blue-500";
    if (code >= 400 && code < 500) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-operations">
              Operations
            </h1>
            <p className="text-muted-foreground">
              System health, request monitoring, and SEO tools
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchHealth();
              refetchLogs();
            }}
            className="gap-2"
            data-testid="button-refresh-all"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        </div>

        {queryErrors.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5" data-testid="banner-operations-errors">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-destructive mb-1">
                    {looksLikeAuth
                      ? "Admin access required"
                      : `${queryErrors.length} of 9 endpoints failed to load`}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {looksLikeAuth
                      ? "You're signed in but Clerk doesn't see you as an admin. Set publicMetadata.role='admin' on your user in the Clerk dashboard, then sign out and back in."
                      : "Server reachable but some queries returned errors. Try Refresh All — if errors persist, check server logs."}
                  </p>
                  <details className="text-xs text-muted-foreground/80">
                    <summary className="cursor-pointer hover:text-muted-foreground">
                      Failed endpoints ({queryErrors.length})
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {queryErrors.map((e) => (
                        <li key={e.label}>
                          <span className="font-medium">{e.label}:</span>{" "}
                          {e.error instanceof Error ? e.error.message : String(e.error)}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-operations">
            <TabsTrigger value="health" className="gap-2" data-testid="tab-health">
              <Heart className="h-4 w-4" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2" data-testid="tab-logs">
              <List className="h-4 w-4" />
              Request Logs
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2" data-testid="tab-seo">
              <Globe className="h-4 w-4" />
              SEO Tools
            </TabsTrigger>
            <TabsTrigger value="ai-config" className="gap-2" data-testid="tab-ai-config">
              <Brain className="h-4 w-4" />
              AI Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-4">
            {healthLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : health ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card data-testid="card-status">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Status</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <Badge className={getStatusColor(health.status)} data-testid="badge-status">
                        {health.status === "healthy" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {health.status === "degraded" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {health.status === "unhealthy" && <XCircle className="h-3 w-3 mr-1" />}
                        {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Environment: {health.environment}
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-uptime">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-uptime">
                        {formatUptime(health.uptime)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Version: {health.version}
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-memory">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Memory</CardTitle>
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-memory">
                        {health.checks.memory.percentage.toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(health.checks.memory.used)} / {formatBytes(health.checks.memory.total)}
                      </p>
                      <Badge className={getStatusColor(health.checks.memory.status)} variant="outline">
                        {health.checks.memory.status}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-cpu">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">CPU Load</CardTitle>
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-cpu">
                        {health.checks.cpu.loadAverage[0]?.toFixed(2) || "N/A"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        5m: {health.checks.cpu.loadAverage[1]?.toFixed(2) || "N/A"} | 
                        15m: {health.checks.cpu.loadAverage[2]?.toFixed(2) || "N/A"}
                      </p>
                      <Badge className={getStatusColor(health.checks.cpu.status)} variant="outline">
                        {health.checks.cpu.status}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="card-database">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Database Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(health.checks.database.status)} data-testid="badge-db-status">
                        {health.checks.database.status === "ok" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {health.checks.database.status}
                      </Badge>
                      {health.checks.database.latency && (
                        <span className="text-sm text-muted-foreground">
                          Latency: {health.checks.database.latency.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {stats && (
                  <Card data-testid="card-request-stats">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Request Statistics
                      </CardTitle>
                      <CardDescription>
                        Real-time request monitoring metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Requests</p>
                          <p className="text-2xl font-bold" data-testid="text-total-requests">
                            {stats.totalRequests.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Response Time</p>
                          <p className="text-2xl font-bold" data-testid="text-avg-response">
                            {stats.avgResponseTime.toFixed(0)}ms
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Success Rate</p>
                          <p className="text-2xl font-bold" data-testid="text-success-rate">
                            {stats.successRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      {stats.topEndpoints.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Top Endpoints</p>
                          <div className="space-y-2">
                            {stats.topEndpoints.slice(0, 5).map((endpoint, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {endpoint.path}
                                </code>
                                <span className="text-muted-foreground">{endpoint.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Failed to load health data</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card data-testid="card-request-logs">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    Recent Request Logs
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => refetchLogs()}
                    data-testid="button-refresh-logs"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  Last 100 requests with correlation IDs for debugging
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : logs?.logs && logs.logs.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {logs.logs.map((log) => (
                        <div 
                          key={log.id} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted text-sm"
                          data-testid={`log-entry-${log.id}`}
                        >
                          <Badge className={getMethodColor(log.method)} variant="outline">
                            {log.method}
                          </Badge>
                          <code className="flex-1 truncate text-xs">{log.path}</code>
                          <span className={`font-mono ${getStatusCodeColor(log.statusCode)}`}>
                            {log.statusCode}
                          </span>
                          <span className="text-muted-foreground w-16 text-right">
                            {log.duration}ms
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(log.correlationId, log.id)}
                            className="h-6 w-6 p-0"
                            title={`Copy correlation ID: ${log.correlationId}`}
                            data-testid={`button-copy-correlation-${log.id}`}
                          >
                            {copiedId === log.id ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          <span className="text-xs text-muted-foreground w-20">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No request logs available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card data-testid="card-sitemap">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Sitemap
                  </CardTitle>
                  <CardDescription>
                    XML sitemap for search engine crawlers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {seoLoading ? (
                    <Skeleton className="h-20" />
                  ) : seoStatus ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total URLs</span>
                        <span className="font-medium" data-testid="text-total-urls">
                          {seoStatus.totalUrls}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Generated</span>
                        <span className="text-sm" data-testid="text-sitemap-generated">
                          {seoStatus.sitemapLastGenerated 
                            ? new Date(seoStatus.sitemapLastGenerated).toLocaleString()
                            : "Not yet generated"}
                        </span>
                      </div>
                      <Separator />
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => window.open("/sitemap.xml", "_blank")}
                        data-testid="button-view-sitemap"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Sitemap
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Failed to load SEO status</p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-robots">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Robots.txt
                  </CardTitle>
                  <CardDescription>
                    Search engine crawler directives
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {seoLoading ? (
                    <Skeleton className="h-20" />
                  ) : seoStatus ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Allow All Crawlers</span>
                        <Badge variant={seoStatus.robotsConfig.allowAll ? "default" : "secondary"}>
                          {seoStatus.robotsConfig.allowAll ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Blocked Paths</span>
                        <span className="text-sm">
                          {seoStatus.robotsConfig.disallowedPaths.length} paths
                        </span>
                      </div>
                      <Separator />
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => window.open("/robots.txt", "_blank")}
                        data-testid="button-view-robots"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View robots.txt
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Failed to load robots config</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-seo-links">
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>
                  Public SEO resources and tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 justify-start"
                    onClick={() => window.open("/api/health", "_blank")}
                    data-testid="button-api-health"
                  >
                    <Heart className="h-4 w-4" />
                    Health Check API
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 justify-start"
                    onClick={() => window.open("/sitemap.xml", "_blank")}
                    data-testid="button-sitemap-xml"
                  >
                    <Globe className="h-4 w-4" />
                    sitemap.xml
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 justify-start"
                    onClick={() => window.open("/robots.txt", "_blank")}
                    data-testid="button-robots-txt"
                  >
                    <Bot className="h-4 w-4" />
                    robots.txt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-config" className="space-y-4">
            <Card data-testid="card-ai-config">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  FinanceCompass AI Configuration
                </CardTitle>
                <CardDescription>
                  Manage system prompts, guardrails, grounding rules, knowledge base, and follow-up templates for the AI assessment engine.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={aiConfigTab} onValueChange={setAiConfigTab} className="space-y-4">
                  <TabsList className="grid grid-cols-5 w-full">
                    <TabsTrigger value="prompts" className="gap-1 text-xs" data-testid="tab-prompts">
                      <MessageSquare className="h-3 w-3" />
                      Prompts
                    </TabsTrigger>
                    <TabsTrigger value="guardrails" className="gap-1 text-xs" data-testid="tab-guardrails">
                      <Shield className="h-3 w-3" />
                      Guardrails
                    </TabsTrigger>
                    <TabsTrigger value="grounding" className="gap-1 text-xs" data-testid="tab-grounding">
                      <BookOpen className="h-3 w-3" />
                      Grounding
                    </TabsTrigger>
                    <TabsTrigger value="knowledge" className="gap-1 text-xs" data-testid="tab-knowledge">
                      <BookOpen className="h-3 w-3" />
                      Knowledge
                    </TabsTrigger>
                    <TabsTrigger value="followup" className="gap-1 text-xs" data-testid="tab-followup">
                      <MessageSquare className="h-3 w-3" />
                      Follow-up
                    </TabsTrigger>
                  </TabsList>

                  {/* System Prompts Tab */}
                  <TabsContent value="prompts" className="space-y-4">
                    {promptsLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {systemPrompts?.map((prompt) => (
                            <Card key={prompt.id} className="p-4" data-testid={`card-prompt-${prompt.id}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium truncate">{prompt.name}</h4>
                                    <Badge variant="outline">{prompt.category}</Badge>
                                    <Badge variant="secondary">{prompt.persona}</Badge>
                                    <Badge variant={prompt.isActive ? "default" : "secondary"}>
                                      {prompt.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {prompt.description || prompt.content.substring(0, 100)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Key: {prompt.key} | Version: {prompt.version}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleActiveMutation.mutate({
                                      type: "system-prompts",
                                      id: prompt.id,
                                      isActive: !prompt.isActive
                                    })}
                                    data-testid={`button-toggle-prompt-${prompt.id}`}
                                  >
                                    {prompt.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setCurrentEntity(prompt);
                                      setEntityType("system-prompts");
                                      setDeleteDialogOpen(true);
                                    }}
                                    data-testid={`button-delete-prompt-${prompt.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                          {(!systemPrompts || systemPrompts.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              No system prompts configured yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  {/* Guardrails Tab */}
                  <TabsContent value="guardrails" className="space-y-4">
                    {guardrailsLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {guardrails?.map((guardrail) => (
                            <Card key={guardrail.id} className="p-4" data-testid={`card-guardrail-${guardrail.id}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium truncate">{guardrail.name}</h4>
                                    <Badge variant="outline">{guardrail.category}</Badge>
                                    <Badge variant={guardrail.priority === "critical" ? "destructive" : guardrail.priority === "high" ? "default" : "secondary"}>
                                      {guardrail.priority}
                                    </Badge>
                                    {guardrail.isBlocking && <Badge variant="destructive">Blocking</Badge>}
                                    <Badge variant={guardrail.isActive ? "default" : "secondary"}>
                                      {guardrail.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {guardrail.description || guardrail.errorMessage}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Key: {guardrail.key} | Type: {guardrail.validationType}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleActiveMutation.mutate({
                                      type: "guardrails",
                                      id: guardrail.id,
                                      isActive: !guardrail.isActive
                                    })}
                                    data-testid={`button-toggle-guardrail-${guardrail.id}`}
                                  >
                                    {guardrail.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setCurrentEntity(guardrail);
                                      setEntityType("guardrails");
                                      setDeleteDialogOpen(true);
                                    }}
                                    data-testid={`button-delete-guardrail-${guardrail.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                          {(!guardrails || guardrails.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              No guardrails configured yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  {/* Grounding Rules Tab */}
                  <TabsContent value="grounding" className="space-y-4">
                    {groundingLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {groundingRules?.map((rule) => (
                            <Card key={rule.id} className="p-4" data-testid={`card-grounding-${rule.id}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium truncate">{rule.name}</h4>
                                    <Badge variant="outline">{rule.category}</Badge>
                                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                                      {rule.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {rule.description || rule.content.substring(0, 100)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Key: {rule.key} | Version: {rule.version}
                                    {rule.applicableTiers?.length ? ` | Tiers: ${rule.applicableTiers.join(", ")}` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleActiveMutation.mutate({
                                      type: "grounding-rules",
                                      id: rule.id,
                                      isActive: !rule.isActive
                                    })}
                                    data-testid={`button-toggle-grounding-${rule.id}`}
                                  >
                                    {rule.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setCurrentEntity(rule);
                                      setEntityType("grounding-rules");
                                      setDeleteDialogOpen(true);
                                    }}
                                    data-testid={`button-delete-grounding-${rule.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                          {(!groundingRules || groundingRules.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              No grounding rules configured yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  {/* Knowledge Base Tab */}
                  <TabsContent value="knowledge" className="space-y-4">
                    {kbLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {knowledgeBase?.map((kb) => (
                            <Card key={kb.id} className="p-4" data-testid={`card-kb-${kb.id}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium truncate">{kb.title}</h4>
                                    <Badge variant="outline">{kb.category}</Badge>
                                    <Badge variant={kb.isActive ? "default" : "secondary"}>
                                      {kb.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {kb.description || kb.content.substring(0, 100)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Key: {kb.key} | Version: {kb.version}
                                    {kb.tags?.length ? ` | Tags: ${kb.tags.join(", ")}` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleActiveMutation.mutate({
                                      type: "knowledge-base",
                                      id: kb.id,
                                      isActive: !kb.isActive
                                    })}
                                    data-testid={`button-toggle-kb-${kb.id}`}
                                  >
                                    {kb.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setCurrentEntity(kb);
                                      setEntityType("knowledge-base");
                                      setDeleteDialogOpen(true);
                                    }}
                                    data-testid={`button-delete-kb-${kb.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                          {(!knowledgeBase || knowledgeBase.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              No knowledge base entries configured yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  {/* Follow-up Templates Tab */}
                  <TabsContent value="followup" className="space-y-4">
                    {followupLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {followupTemplates?.map((template) => (
                            <Card key={template.id} className="p-4" data-testid={`card-followup-${template.id}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium truncate">{template.name}</h4>
                                    {template.dimension && <Badge variant="outline">{template.dimension}</Badge>}
                                    <Badge variant="secondary">Priority: {template.priority}</Badge>
                                    <Badge variant={template.isActive ? "default" : "secondary"}>
                                      {template.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {template.description || template.promptTemplate.substring(0, 100)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Key: {template.key}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleActiveMutation.mutate({
                                      type: "followup-templates",
                                      id: template.id,
                                      isActive: !template.isActive
                                    })}
                                    data-testid={`button-toggle-followup-${template.id}`}
                                  >
                                    {template.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setCurrentEntity(template);
                                      setEntityType("followup-templates");
                                      setDeleteDialogOpen(true);
                                    }}
                                    data-testid={`button-delete-followup-${template.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                          {(!followupTemplates || followupTemplates.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              No follow-up templates configured yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{currentEntity?.name || currentEntity?.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (currentEntity && entityType) {
                        deleteMutation.mutate({ type: entityType, id: currentEntity.id });
                      }
                    }}
                    className="bg-red-500 hover:bg-red-600"
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
