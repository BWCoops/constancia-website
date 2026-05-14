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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Trash2,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  Plus,
  UserPlus,
  Shield,
  Calendar,
  StickyNote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";

interface BetaAccessEntry {
  id: string;
  email: string;
  addedBy: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BetaAccessResponse {
  success: boolean;
  data: BetaAccessEntry[];
}

const addEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

type AddEmailFormValues = z.infer<typeof addEmailSchema>;

function BetaAccessContent() {
  const { toast } = useToast();
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const form = useForm<AddEmailFormValues>({
    resolver: zodResolver(addEmailSchema),
    defaultValues: {
      email: "",
      notes: "",
    },
  });

  const { data, isLoading, error } = useQuery<BetaAccessResponse>({
    queryKey: ["/api/admin/finance-compass/beta-access"],
  });

  const entries = data?.data ?? [];

  const addMutation = useMutation({
    mutationFn: async (values: AddEmailFormValues) => {
      const res = await apiRequest("POST", "/api/admin/finance-compass/beta-access", values);
      return res.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Email Added",
        description: response.message || "Email has been added to the beta access list.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/beta-access"] });
      form.reset();
      setIsFormVisible(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Email",
        description: error.message || "Could not add email to the beta access list.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/finance-compass/beta-access/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Removed",
        description: "Email has been removed from the beta access list.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/beta-access"] });
      setDeleteEntryId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Remove",
        description: error.message || "Could not remove email from the beta access list.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: AddEmailFormValues) => {
    addMutation.mutate(values);
  };

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2" data-testid="text-error-title">
          Unable to Load Beta Access List
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-4" data-testid="text-error">
          {errorMessage.includes("401") || errorMessage.includes("403") 
            ? "Your session may have expired or you don't have permission to view this page."
            : "Failed to load the beta access list. Please try again."}
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
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Beta Access</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage email whitelist for FinanceCompass beta access
          </p>
        </div>
        <Button
          onClick={() => setIsFormVisible(!isFormVisible)}
          data-testid="button-toggle-add-form"
        >
          {isFormVisible ? (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Email
            </>
          )}
        </Button>
      </div>

      {isFormVisible && (
        <Card data-testid="card-add-email-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Add Email to Whitelist
            </CardTitle>
            <CardDescription>
              Add a new email address to allow beta access to FinanceCompass
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="user@example.com" 
                            type="email"
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., Beta tester, Company name"
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      form.reset();
                      setIsFormVisible(false);
                    }}
                    data-testid="button-cancel-add"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addMutation.isPending}
                    data-testid="button-submit-add"
                  >
                    {addMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Whitelist
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-beta-access-list">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Whitelisted Emails
          </CardTitle>
          <CardDescription>
            {entries.length} email{entries.length !== 1 ? "s" : ""} with beta access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow 
                    key={entry.id}
                    data-testid={`row-beta-access-${entry.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm" data-testid={`text-email-${entry.id}`}>
                          {entry.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-added-by-${entry.id}`}>
                      {entry.addedBy || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell data-testid={`text-notes-${entry.id}`}>
                      {entry.notes ? (
                        <div className="flex items-center gap-1 max-w-[200px]">
                          <StickyNote className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate text-sm">{entry.notes}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-date-${entry.id}`}>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-sm">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.isActive ? (
                        <Badge variant="default" className="bg-green-600" data-testid={`badge-active-${entry.id}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-inactive-${entry.id}`}>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteEntryId(entry.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        data-testid={`button-delete-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-entries">
                No emails in the beta access list yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add emails to allow users to access FinanceCompass
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteEntryId} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Beta Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the email from the beta access whitelist. 
              The user will no longer be able to access FinanceCompass.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEntryId && deleteMutation.mutate(deleteEntryId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminFcBetaAccess() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <BetaAccessContent />
        </div>
      </div>
    </AdminLayout>
  );
}
