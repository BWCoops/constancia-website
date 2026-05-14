import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Download,
  CheckCircle2,
  XCircle,
  Filter,
  MoreHorizontal,
  Eye,
  Trash2,
  Mail,
  Building,
  Calendar,
  User,
  Phone,
  MessageSquare,
  Briefcase,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";

interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  message: string;
  consentMarketing: boolean;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

interface ContactSubmissionsResponse {
  submissions: ContactSubmission[];
  total: number;
  page: number;
  limit: number;
}

function ContactSubmissionsContent() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ContactSubmissionsResponse>({
    queryKey: ["/api/admin/contact-submissions"],
  });

  const submissions = data?.submissions ?? [];

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/contact-submissions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Submission Deleted",
        description: "The contact submission has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-submissions"] });
      setDeleteSubmissionId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete submission. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/admin/contact-submissions/export", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contact-submissions-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Contact submissions have been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export submissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewSubmission = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setIsViewDialogOpen(true);
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  const filteredSubmissions = submissions.filter((submission) => {
    if (filter === "all") return true;
    if (filter === "verified") return submission.verified;
    if (filter === "unverified") return !submission.verified;
    return true;
  });

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <MessageSquare className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2" data-testid="text-error-title">
          Unable to Load Contact Submissions
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-4" data-testid="text-error">
          {errorMessage.includes("401") || errorMessage.includes("403") 
            ? "Your session may have expired. Please sign in again."
            : errorMessage.includes("500") 
            ? "Our server encountered an issue. Please try again in a few moments."
            : "Failed to load submissions. Please check your connection and try again."}
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
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Contact Submissions</h1>
          <p className="text-muted-foreground mt-1">
            Manage and export contact form submissions
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting || submissions.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : "Export to CSV"}
        </Button>
      </div>

      <Card data-testid="card-contact-submissions">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 space-y-0">
          <div>
            <CardTitle>All Submissions</CardTitle>
            <CardDescription>
              {data?.total ?? submissions.length} total contact submissions
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
                <SelectItem value="all">All Submissions</SelectItem>
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
          ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow 
                    key={submission.id} 
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleViewSubmission(submission)}
                    data-testid={`row-submission-${submission.id}`}
                  >
                    <TableCell className="font-medium" data-testid={`text-submission-name-${submission.id}`}>
                      {submission.firstName} {submission.lastName}
                    </TableCell>
                    <TableCell data-testid={`text-submission-email-${submission.id}`}>
                      <span className="font-mono text-sm">{submission.email}</span>
                    </TableCell>
                    <TableCell data-testid={`text-submission-company-${submission.id}`}>
                      {submission.company || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell data-testid={`text-submission-phone-${submission.id}`}>
                      {submission.phone || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell data-testid={`text-submission-message-${submission.id}`}>
                      <span className="text-muted-foreground text-sm">
                        {truncateMessage(submission.message)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {submission.verified ? (
                        <Badge variant="default" className="bg-green-600" data-testid={`badge-verified-${submission.id}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-unverified-${submission.id}`}>
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-submission-date-${submission.id}`}>
                      {new Date(submission.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${submission.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleViewSubmission(submission); }}
                            data-testid={`menu-view-${submission.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); setDeleteSubmissionId(submission.id); }}
                            className="text-destructive focus:text-destructive"
                            data-testid={`menu-delete-${submission.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Submission
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground" data-testid="text-no-submissions">
                {filter === "all" 
                  ? "No contact submissions found yet." 
                  : `No ${filter} submissions found.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={(open) => { 
        if (!open) {
          setIsViewDialogOpen(false);
          setSelectedSubmission(null);
        }
      }}>
        <DialogContent className="max-w-lg" data-testid="dialog-submission-detail">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              Contact Submission Details
            </DialogTitle>
            <DialogDescription>
              View contact form submission details
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium" data-testid="text-detail-name">
                      {selectedSubmission.firstName} {selectedSubmission.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium font-mono text-sm" data-testid="text-detail-email">
                      {selectedSubmission.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium" data-testid="text-detail-company">
                      {selectedSubmission.company || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Job Title</p>
                    <p className="font-medium" data-testid="text-detail-job-title">
                      {selectedSubmission.jobTitle || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium" data-testid="text-detail-phone">
                      {selectedSubmission.phone || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium" data-testid="text-detail-created">
                      {new Date(selectedSubmission.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div data-testid="text-detail-status">
                      {selectedSubmission.verified ? (
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
                <div className="flex items-start gap-2">
                  <Bell className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Marketing Consent</p>
                    <p className="font-medium" data-testid="text-detail-marketing">
                      {selectedSubmission.consentMarketing ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t">
                <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Message</p>
                  <p className="font-medium whitespace-pre-wrap" data-testid="text-detail-message">
                    {selectedSubmission.message}
                  </p>
                </div>
              </div>

              {selectedSubmission.verifiedAt && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Verified at: {new Date(selectedSubmission.verifiedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSubmissionId} onOpenChange={(open) => !open && setDeleteSubmissionId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact submission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubmissionId && deleteSubmissionMutation.mutate(deleteSubmissionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteSubmissionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminContactSubmissions() {
  return (
    <AdminLayout>
      <ContactSubmissionsContent />
    </AdminLayout>
  );
}
