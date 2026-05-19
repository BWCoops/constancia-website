import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Loader2,
  ToggleLeft,
  ToggleRight,
  RefreshCcw,
  Info,
  CheckCircle2,
  XCircle,
  Undo2,
  AlertTriangle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";

interface FeatureFlagDetail {
  key: string;
  label: string;
  envDefault: boolean;
  hasOverride: boolean;
  overrideValue: boolean | null;
  effectiveValue: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

interface FeatureFlagsApiResponse {
  success?: boolean;
  data?: {
    flags: FeatureFlagDetail[] | Record<string, FeatureFlagDetail>;
  };
  flags?: FeatureFlagDetail[];
}

const featureDescriptions: Record<string, string> = {
  about: "About Us page and company information",
  services: "Services section showcasing Constancia offerings",
  solutions: "Industry solutions and use cases",
  comparisonTools: "EPM, ERP, and AI comparison tools",
  financeCompass: "AI-enabled finance technology & maturity assessment platform",
  blog: "Insights Hub with blog posts and articles",
  resources: "Downloadable resources and files",
  contact: "Contact form and enquiry submission",
  requireBusinessEmail: "Require business email addresses (blocks Gmail, Yahoo, Hotmail, etc.)",
};

// Helper to normalize the API response which may come in different formats
function normalizeFlags(response: FeatureFlagsApiResponse | undefined): FeatureFlagDetail[] {
  if (!response) return [];
  
  // Handle { success: true, data: { flags: {...} } } format from modular routes
  if (response.data?.flags) {
    const flags = response.data.flags;
    if (Array.isArray(flags)) return flags;
    // Convert object with numeric keys to array
    return Object.values(flags);
  }
  
  // Handle { flags: [...] } format from legacy routes
  if (response.flags) {
    if (Array.isArray(response.flags)) return response.flags;
    return Object.values(response.flags);
  }
  
  return [];
}

export default function AdminFeatureFlags() {
  const { toast } = useToast();
  const [updatingFlags, setUpdatingFlags] = useState<Set<string>>(new Set());

  const { data: rawData, isLoading, error, refetch } = useQuery<FeatureFlagsApiResponse>({
    queryKey: ["/api/admin/feature-flags"],
  });
  
  // Normalize the response to always get an array of flags
  const flags = normalizeFlags(rawData);

  const updateFlagMutation = useMutation({
    mutationFn: async ({ featureKey, isEnabled }: { featureKey: string; isEnabled: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/feature-flags/${featureKey}`, { isEnabled, updatedBy: "admin" });
    },
    onMutate: ({ featureKey }) => {
      setUpdatingFlags(prev => new Set(prev).add(featureKey));
    },
    onSuccess: (_, { featureKey, isEnabled }) => {
      toast({
        title: "Feature flag updated",
        description: `${featureKey} is now ${isEnabled ? "enabled" : "disabled"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update feature flag",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
    onSettled: (_, __, { featureKey }) => {
      setUpdatingFlags(prev => {
        const next = new Set(prev);
        next.delete(featureKey);
        return next;
      });
    },
  });

  const resetFlagMutation = useMutation({
    mutationFn: async ({ featureKey }: { featureKey: string }) => {
      return await apiRequest("DELETE", `/api/admin/feature-flags/${featureKey}`);
    },
    onMutate: ({ featureKey }) => {
      setUpdatingFlags(prev => new Set(prev).add(featureKey));
    },
    onSuccess: (_, { featureKey }) => {
      toast({
        title: "Override removed",
        description: `${featureKey} reverted to environment default`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove override",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
    onSettled: (_, __, { featureKey }) => {
      setUpdatingFlags(prev => {
        const next = new Set(prev);
        next.delete(featureKey);
        return next;
      });
    },
  });

  const handleToggle = (flag: FeatureFlagDetail) => {
    updateFlagMutation.mutate({
      featureKey: flag.key,
      isEnabled: !flag.effectiveValue,
    });
  };

  const handleReset = (flag: FeatureFlagDetail) => {
    resetFlagMutation.mutate({ featureKey: flag.key });
  };

  const enabledCount = flags.filter(f => f.effectiveValue).length;
  const disabledCount = flags.filter(f => !f.effectiveValue).length;
  const overrideCount = flags.filter(f => f.hasOverride).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Feature Flags Manager</h1>
            <p className="text-muted-foreground">
              Control which sections of the website are visible to users
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-flags"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enabled Features</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-enabled-count">{enabledCount}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disabled Features</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-disabled-count">{disabledCount}</div>
              <p className="text-xs text-muted-foreground">Currently hidden</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Overrides</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600" data-testid="text-override-count">{overrideCount}</div>
              <p className="text-xs text-muted-foreground">Overriding env defaults</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              Feature Toggles
            </CardTitle>
            <CardDescription>
              Toggle features on or off. Changes take effect immediately across the website.
              Environment defaults can be overridden here - reset to revert to the default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <XCircle className="h-12 w-12 mx-auto mb-2" />
                <p>Failed to load feature flags</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Feature</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[120px] text-center">Env Default</TableHead>
                    <TableHead className="w-[120px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-center">Enabled</TableHead>
                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags.map(flag => (
                    <TableRow key={flag.key} data-testid={`row-feature-${flag.key}`}>
                      <TableCell>
                        <div className="font-medium">{flag.label}</div>
                        <code className="text-xs text-muted-foreground">{flag.key}</code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {featureDescriptions[flag.key] || "Website feature"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={flag.envDefault ? "default" : "secondary"}>
                          {flag.envDefault ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {flag.hasOverride ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="border-amber-500 text-amber-600">
                                Override
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Overriding environment default</p>
                              {flag.updatedBy && <p className="text-xs">By: {flag.updatedBy}</p>}
                              {flag.updatedAt && (
                                <p className="text-xs">
                                  At: {new Date(flag.updatedAt).toLocaleDateString()}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {updatingFlags.has(flag.key) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Switch
                              checked={flag.effectiveValue}
                              onCheckedChange={() => handleToggle(flag)}
                              disabled={updatingFlags.has(flag.key)}
                              data-testid={`switch-feature-${flag.key}`}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {flag.hasOverride && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReset(flag)}
                                disabled={updatingFlags.has(flag.key)}
                                data-testid={`button-reset-${flag.key}`}
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Reset to environment default
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How Feature Flags Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground">Priority Order</h4>
              <p>
                Admin overrides (set here) take precedence over environment variables.
                If you remove an override, the feature reverts to its environment default.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Immediate Effect</h4>
              <p>
                Changes take effect immediately across the website. All navigation links,
                pages, and API endpoints for disabled features will return 404.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Multi-Layer Protection</h4>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Navigation links are hidden for disabled features</li>
                <li>Direct URL access returns 404</li>
                <li>API endpoints return 404</li>
                <li>Sitemap excludes disabled pages</li>
                <li>CTAs and cross-links are filtered</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
