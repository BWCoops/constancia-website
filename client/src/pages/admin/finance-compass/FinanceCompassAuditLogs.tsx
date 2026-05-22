import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  History,
  Calendar,
  Eye,
  RefreshCw,
  Filter,
  User,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  adminId: string | null;
  contactId: string | null;
  assessmentId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLog[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

function getActionBadgeClass(action: string) {
  if (action.includes("create") || action.includes("add") || action.includes("seed") || action.includes("started")) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  }
  if (action.includes("update") || action.includes("edit") || action.includes("submitted")) {
    return "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#252826]/30 dark:text-[#7FB8A3]";
  }
  if (action.includes("delete") || action.includes("remove")) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
  if (action.includes("completed") || action.includes("generated") || action.includes("verified")) {
    return "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#252826]/30 dark:text-[#7FB8A3]";
  }
  if (action.includes("sent") || action.includes("export")) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function getEntityTypeBadgeClass(entityType: string) {
  switch (entityType) {
    case "assessment":
      return "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#252826]/30 dark:text-[#7FB8A3]";
    case "question":
    case "question_correlation":
    case "question_correlations":
    case "question_weightings":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    case "contact":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "response":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "report":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "scoring_logic":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatAction(action: string) {
  return action.split(":").map(s => 
    s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  ).join(" - ");
}

function AuditLogsContent() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 50;

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(page * limit));
    if (actionFilter !== "all") params.set("actionPrefix", actionFilter);
    if (entityTypeFilter !== "all") params.set("entityType", entityTypeFilter);
    if (dateFrom) params.set("fromDate", dateFrom);
    if (dateTo) params.set("toDate", dateTo);
    return params.toString();
  };

  const { data, isLoading, refetch, isFetching } = useQuery<AuditLogsResponse>({
    queryKey: ["/api/admin/finance-compass/audit-logs", actionFilter, entityTypeFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/finance-compass/audit-logs?${buildQueryParams()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    }
  });

  const logs = data?.data?.logs ?? [];
  const pagination = data?.data?.pagination;

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View system audit events and activity history ({pagination?.total ?? 0} total records)
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
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[180px]" data-testid="select-action-filter">
                  <SelectValue placeholder="Action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="response">Response</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="otp">OTP</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="correlation">Correlation</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]" data-testid="select-entity-type-filter">
                  <SelectValue placeholder="Entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="response">Response</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="question_correlation">Correlation</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="w-[140px]"
                placeholder="From date"
                data-testid="input-date-from"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="w-[140px]"
                placeholder="To date"
                data-testid="input-date-to"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow 
                      key={log.id} 
                      className="cursor-pointer"
                      onClick={() => handleViewDetails(log)}
                      data-testid={`row-log-${index}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeClass(log.action)} data-testid={`badge-action-${index}`}>
                          {formatAction(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEntityTypeBadgeClass(log.entityType)} data-testid={`badge-entity-type-${index}`}>
                          {log.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.entityId ? `${log.entityId.slice(0, 8)}...` : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {log.adminId ? "Admin" : log.contactId ? "Contact" : "System"}
                            {(log.adminId || log.contactId) && (
                              <span className="text-muted-foreground ml-1">
                                ({(log.adminId || log.contactId)?.slice(0, 6)}...)
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            {Object.keys(log.details).length} field(s)
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(log);
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
              
              {pagination && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1} - {Math.min((page + 1) * limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0 || isFetching}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!pagination.hasMore || isFetching}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No audit logs found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {actionFilter !== "all" || entityTypeFilter !== "all" || dateFrom || dateTo
                  ? "Try adjusting your filters"
                  : "Audit logs will appear here as actions are performed"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>
              {selectedLog?.id && `Log ID: ${selectedLog.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Timestamp</p>
                  <p className="font-medium">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Action</p>
                  <Badge className={getActionBadgeClass(selectedLog.action)}>
                    {formatAction(selectedLog.action)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Entity Type</p>
                  <Badge className={getEntityTypeBadgeClass(selectedLog.entityType)}>
                    {selectedLog.entityType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Entity ID</p>
                  <p className="font-mono text-sm">{selectedLog.entityId || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Admin ID</p>
                  <p className="font-mono text-sm">{selectedLog.adminId || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contact ID</p>
                  <p className="font-mono text-sm">{selectedLog.contactId || "-"}</p>
                </div>
              </div>
              {selectedLog.assessmentId && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Assessment ID</p>
                  <p className="font-mono text-sm">{selectedLog.assessmentId}</p>
                </div>
              )}
              {selectedLog.ipAddress && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">IP Address</p>
                  <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                </div>
              )}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Details</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.details, null, 2)}
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

export default function FinanceCompassAuditLogs() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <AuditLogsContent />
        </div>
      </div>
    </AdminLayout>
  );
}
