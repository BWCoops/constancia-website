import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Download,
  CheckCircle2,
  XCircle,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldX,
  Loader2,
  Mail,
  Building,
  Briefcase,
  Calendar,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  jobTitle: string | null;
  verified: boolean;
  subscribeNewsletter?: boolean;
  resourceId?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  verified: z.boolean(),
  subscribeNewsletter: z.boolean(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

function LeadsContent() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      jobTitle: "",
      verified: false,
      subscribeNewsletter: true,
    },
  });

  const { data, isLoading, error } = useQuery<LeadsResponse>({
    queryKey: ["/api/admin/leads"],
  });

  const leads = data?.leads ?? [];

  const updateLeadMutation = useMutation({
    mutationFn: async (data: { id: string; values: LeadFormValues }) => {
      const res = await apiRequest("PUT", `/api/admin/leads/${data.id}`, data.values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead Updated",
        description: "The lead has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      setIsViewDialogOpen(false);
      setIsEditMode(false);
      setSelectedLead(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const verifyLeadMutation = useMutation({
    mutationFn: async (data: { id: string; verified: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/leads/${data.id}/verify`, { verified: data.verified });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.verified ? "Lead Verified" : "Lead Unverified",
        description: `The lead has been ${variables.verified ? "verified" : "unverified"} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to update verification status.",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/leads/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead Deleted",
        description: "The lead has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      setDeleteLeadId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/admin/leads/export", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Leads have been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditMode(false);
    form.reset({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company || "",
      jobTitle: lead.jobTitle || "",
      verified: lead.verified,
      subscribeNewsletter: lead.subscribeNewsletter ?? true,
    });
    setIsViewDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditMode(true);
    form.reset({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company || "",
      jobTitle: lead.jobTitle || "",
      verified: lead.verified,
      subscribeNewsletter: lead.subscribeNewsletter ?? true,
    });
    setIsViewDialogOpen(true);
  };

  const handleSubmit = (values: LeadFormValues) => {
    if (selectedLead) {
      updateLeadMutation.mutate({ id: selectedLead.id, values });
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (filter === "all") return true;
    if (filter === "verified") return lead.verified;
    if (filter === "unverified") return !lead.verified;
    return true;
  });

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <User className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2" data-testid="text-error-title">
          Unable to Load Leads
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-4" data-testid="text-error">
          {errorMessage.includes("401") || errorMessage.includes("403") 
            ? "Your session may have expired. Please sign in again."
            : errorMessage.includes("500") 
            ? "Our server encountered an issue. Please try again in a few moments."
            : "Failed to load leads. Please check your connection and try again."}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-sm text-primary hover:underline"
          data-testid="button-retry"
        >
          Click to retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage and export lead submissions
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || leads.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : "Export to CSV"}
        </Button>
      </div>

      <Card data-testid="card-leads">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 space-y-0">
          <div>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>
              {data?.total ?? leads.length} total leads collected
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filter}
              onValueChange={(value: "all" | "verified" | "unverified") => setFilter(value)}
            >
              <SelectTrigger className="w-40" data-testid="select-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLeads && filteredLeads.length > 0 ? (
            <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleViewLead(lead)}
                    data-testid={`row-lead-${lead.id}`}
                  >
                    <TableCell className="font-medium" data-testid={`text-lead-name-${lead.id}`}>
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell data-testid={`text-lead-email-${lead.id}`}>
                      <span className="font-mono text-sm">{lead.email}</span>
                    </TableCell>
                    <TableCell data-testid={`text-lead-company-${lead.id}`}>
                      {lead.company || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell data-testid={`text-lead-job-title-${lead.id}`}>
                      {lead.jobTitle || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {lead.verified ? (
                        <Badge variant="default" className="bg-green-600" data-testid={`badge-verified-${lead.id}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-unverified-${lead.id}`}>
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-lead-date-${lead.id}`}>
                      {new Date(lead.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${lead.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleViewLead(lead); }}
                            data-testid={`menu-view-${lead.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleEditLead(lead); }}
                            data-testid={`menu-edit-${lead.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Lead
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              verifyLeadMutation.mutate({ id: lead.id, verified: !lead.verified }); 
                            }}
                            data-testid={`menu-verify-${lead.id}`}
                          >
                            {lead.verified ? (
                              <>
                                <ShieldX className="h-4 w-4 mr-2" />
                                Unverify Lead
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Verify Lead
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); setDeleteLeadId(lead.id); }}
                            className="text-destructive focus:text-destructive"
                            data-testid={`menu-delete-${lead.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground" data-testid="text-no-leads">
                {filter === "all" 
                  ? "No leads found yet." 
                  : `No ${filter} leads found.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={(open) => { 
        if (!open) {
          setIsViewDialogOpen(false);
          setIsEditMode(false);
          setSelectedLead(null);
        }
      }}>
        <DialogContent className="max-w-lg" data-testid="dialog-lead-detail">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {isEditMode ? "Edit Lead" : "Lead Details"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the lead information below" 
                : "View lead information and contact details"}
            </DialogDescription>
          </DialogHeader>

          {selectedLead && !isEditMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium" data-testid="text-detail-name">
                      {selectedLead.firstName} {selectedLead.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium font-mono text-sm" data-testid="text-detail-email">
                      {selectedLead.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium" data-testid="text-detail-company">
                      {selectedLead.company || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Job Title</p>
                    <p className="font-medium" data-testid="text-detail-job-title">
                      {selectedLead.jobTitle || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium" data-testid="text-detail-created">
                      {new Date(selectedLead.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div data-testid="text-detail-status">
                      {selectedLead.verified ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => verifyLeadMutation.mutate({ 
                    id: selectedLead.id, 
                    verified: !selectedLead.verified 
                  })}
                  disabled={verifyLeadMutation.isPending}
                  data-testid="button-toggle-verify"
                >
                  {verifyLeadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : selectedLead.verified ? (
                    <ShieldX className="h-4 w-4 mr-2" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  {selectedLead.verified ? "Unverify" : "Verify"}
                </Button>
                <Button onClick={() => setIsEditMode(true)} data-testid="button-edit-lead">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Lead
                </Button>
              </DialogFooter>
            </div>
          ) : selectedLead && isEditMode ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-job-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-6">
                  <FormField
                    control={form.control}
                    name="verified"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-verified"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">Verified</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subscribeNewsletter"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-newsletter"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">Newsletter</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditMode(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateLeadMutation.isPending}
                    data-testid="button-save-lead"
                  >
                    {updateLeadMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLeadId} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
              {deleteLeadId && leads.find(l => l.id === deleteLeadId) && (
                <span className="block mt-2 font-medium text-foreground">
                  {leads.find(l => l.id === deleteLeadId)?.firstName} {leads.find(l => l.id === deleteLeadId)?.lastName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLeadId && deleteLeadMutation.mutate(deleteLeadId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLeadMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteLeadMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminLeads() {
  return (
    <AdminLayout>
      <LeadsContent />
    </AdminLayout>
  );
}
