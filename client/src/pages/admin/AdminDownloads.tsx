import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  Download, 
  FolderOpen, 
  ShieldCheck, 
  Users,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import AdminLayout from "./AdminLayout";

interface DownloadSummary {
  totalDownloads: number;
  uniqueResources: number;
  verifiedDownloads: number;
  uniqueVerifiedUsers: number;
}

interface ResourceDownload {
  resourceId: string;
  title: string;
  category: string;
  totalDownloads: number;
  verifiedDownloads: number;
  lastDownloadedAt: string | null;
}

interface DownloadHistoryItem {
  id: string;
  downloadedAt: string;
  resourceTitle: string;
  resourceId: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  verified: boolean;
}

interface DownloadHistoryResponse {
  downloads: DownloadHistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  isLoading
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
}) {
  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-semibold" data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function DownloadsContent() {
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery<DownloadSummary>({
    queryKey: ["/api/admin/downloads/summary"],
  });

  const { data: byResource, isLoading: byResourceLoading } = useQuery<ResourceDownload[]>({
    queryKey: ["/api/admin/downloads/by-resource"],
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<DownloadHistoryResponse>({
    queryKey: ["/api/admin/downloads/history", verifiedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (verifiedOnly) params.set("verifiedOnly", "true");
      const res = await fetch(`/api/admin/downloads/history?${params.toString()}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch download history");
      return res.json();
    },
  });

  const downloads = historyData?.downloads ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Download Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track resource downloads and user engagement
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Downloads"
          value={summary?.totalDownloads ?? 0}
          icon={Download}
          description="All-time downloads"
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Resources with Downloads"
          value={summary?.uniqueResources ?? 0}
          icon={FolderOpen}
          description="Unique resources downloaded"
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Verified Downloads"
          value={summary?.verifiedDownloads ?? 0}
          icon={ShieldCheck}
          description="Downloads by verified users"
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Unique Verified Users"
          value={summary?.uniqueVerifiedUsers ?? 0}
          icon={Users}
          description="Verified users who downloaded"
          isLoading={summaryLoading}
        />
      </div>

      <Card data-testid="card-downloads-by-resource">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Downloads by Resource
          </CardTitle>
          <CardDescription>Resource download statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {byResourceLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : byResource && byResource.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total Downloads</TableHead>
                  <TableHead className="text-right">Verified Downloads</TableHead>
                  <TableHead>Last Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byResource.map((resource, index) => (
                  <TableRow key={resource.resourceId} data-testid={`row-resource-${index}`}>
                    <TableCell className="font-medium" data-testid={`text-resource-title-${index}`}>
                      {resource.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" data-testid={`badge-category-${index}`}>
                        {resource.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-total-downloads-${index}`}>
                      {resource.totalDownloads.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-verified-downloads-${index}`}>
                      {resource.verifiedDownloads.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-last-download-${index}`}>
                      {formatDate(resource.lastDownloadedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No download data available yet
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-download-history">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download History
              </CardTitle>
              <CardDescription>Recent downloads with user details</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="verified-filter"
                checked={verifiedOnly}
                onCheckedChange={setVerifiedOnly}
                data-testid="switch-verified-filter"
              />
              <Label htmlFor="verified-filter" className="text-sm cursor-pointer">
                Verified Only
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : downloads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-center">Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downloads.map((download, index) => (
                  <TableRow key={download.id} data-testid={`row-history-${index}`}>
                    <TableCell className="text-muted-foreground" data-testid={`text-download-date-${index}`}>
                      {formatDate(download.downloadedAt)}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-download-resource-${index}`}>
                      {download.resourceTitle}
                    </TableCell>
                    <TableCell data-testid={`text-download-user-${index}`}>
                      {download.firstName} {download.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-download-email-${index}`}>
                      {download.email}
                    </TableCell>
                    <TableCell data-testid={`text-download-company-${index}`}>
                      {download.company || "-"}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`badge-verified-${index}`}>
                      {download.verified ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {verifiedOnly ? "No verified downloads yet" : "No download history available"}
            </p>
          )}
          {historyData?.pagination && historyData.pagination.total > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {downloads.length} of {historyData.pagination.total} downloads
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDownloads() {
  return (
    <AdminLayout>
      <DownloadsContent />
    </AdminLayout>
  );
}
