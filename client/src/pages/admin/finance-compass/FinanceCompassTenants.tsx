import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Building2,
  Calendar,
  Eye,
  RefreshCw,
  Plus,
  Edit,
  Globe,
  Palette
} from "lucide-react";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  primaryColor?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  settings?: Record<string, unknown> | null;
}

function getStatusBadgeClass(active: boolean) {
  return active
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function TenantsContent() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: "",
    slug: "",
    domain: "",
    primaryColor: "#C77A93",
    active: true,
  });
  const { toast } = useToast();

  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; data: Tenant[] }>({
    queryKey: ["/api/admin/finance-compass/tenants"],
  });

  const createMutation = useMutation({
    mutationFn: async (tenant: typeof newTenant) => {
      return apiRequest("POST", "/api/admin/finance-compass/tenants", tenant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/tenants"] });
      setIsCreateOpen(false);
      setNewTenant({ name: "", slug: "", domain: "", primaryColor: "#C77A93", active: true });
      toast({ title: "Tenant created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create tenant", variant: "destructive" });
    },
  });

  const tenants = data?.data ?? [];

  const handleViewDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailOpen(true);
  };

  const handleCreateTenant = () => {
    if (!newTenant.name || !newTenant.slug) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(newTenant);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage multi-tenant companies
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button 
            size="sm" 
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-tenant"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Tenant
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            All Tenants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Primary Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant, index) => (
                  <TableRow 
                    key={tenant.id} 
                    className="cursor-pointer"
                    onClick={() => handleViewDetails(tenant)}
                    data-testid={`row-tenant-${index}`}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {tenant.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tenant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{tenant.slug}</TableCell>
                    <TableCell>
                      {tenant.domain ? (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{tenant.domain}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.primaryColor ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: tenant.primaryColor }}
                          />
                          <span className="text-xs font-mono">{tenant.primaryColor}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(tenant.active)} data-testid={`badge-status-${index}`}>
                        {tenant.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(tenant);
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
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No tenants found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a new tenant to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Tenant Details
            </DialogTitle>
            <DialogDescription>
              {selectedTenant?.id && `ID: ${selectedTenant.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedTenant.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Slug</Label>
                  <p className="font-mono text-sm">{selectedTenant.slug}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Domain</Label>
                  <p className="text-sm">{selectedTenant.domain || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedTenant.primaryColor && (
                      <div 
                        className="w-5 h-5 rounded border"
                        style={{ backgroundColor: selectedTenant.primaryColor }}
                      />
                    )}
                    <span className="text-sm font-mono">{selectedTenant.primaryColor || "-"}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusBadgeClass(selectedTenant.active)}>
                      {selectedTenant.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="text-sm">{new Date(selectedTenant.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedTenant.settings && Object.keys(selectedTenant.settings).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Settings</Label>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                    {JSON.stringify(selectedTenant.settings, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Tenant
            </DialogTitle>
            <DialogDescription>
              Add a new tenant to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                placeholder="Acme Corp"
                data-testid="input-tenant-name"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={newTenant.slug}
                onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                placeholder="acme-corp"
                data-testid="input-tenant-slug"
              />
            </div>
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={newTenant.domain}
                onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
                placeholder="acme.example.com"
                data-testid="input-tenant-domain"
              />
            </div>
            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={newTenant.primaryColor}
                  onChange={(e) => setNewTenant({ ...newTenant, primaryColor: e.target.value })}
                  className="w-12 h-9 p-1"
                  data-testid="input-tenant-color"
                />
                <Input
                  value={newTenant.primaryColor}
                  onChange={(e) => setNewTenant({ ...newTenant, primaryColor: e.target.value })}
                  placeholder="#C77A93"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={newTenant.active}
                onCheckedChange={(checked) => setNewTenant({ ...newTenant, active: checked })}
                data-testid="switch-tenant-active"
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTenant}
              disabled={createMutation.isPending}
              data-testid="button-save-tenant"
            >
              {createMutation.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FinanceCompassTenants() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <TenantsContent />
        </div>
      </div>
    </AdminLayout>
  );
}
