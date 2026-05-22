import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
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
  BookOpen,
  Calendar,
  Eye,
  RefreshCw,
  Plus,
  Search,
  Edit,
  Trash2,
  FileText
} from "lucide-react";
import AdminLayout from "../AdminLayout";
import { FCAdminTopNav } from "@/components/admin/FCAdminTopNav";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  contentType: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown> | null;
}

function getContentTypeBadgeClass(contentType: string) {
  switch (contentType) {
    case "article":
      return "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#252826]/30 dark:text-[#7FB8A3]";
    case "faq":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    case "guide":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "reference":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getCategoryBadgeClass(category: string) {
  switch (category) {
    case "epm":
      return "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#252826]/30 dark:text-[#7FB8A3]";
    case "erp":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "finance":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "ai":
      return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getStatusBadgeClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function KnowledgeBaseContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    contentType: "article",
    category: "general",
    isActive: true,
  });
  const { toast } = useToast();

  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; data: KnowledgeBaseEntry[] }>({
    queryKey: ["/api/admin/finance-compass/knowledge-base", searchQuery],
  });

  const createMutation = useMutation({
    mutationFn: async (entry: typeof formData) => {
      return apiRequest("POST", "/api/admin/finance-compass/knowledge-base", entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/knowledge-base"] });
      setIsCreateOpen(false);
      setFormData({ title: "", content: "", contentType: "article", category: "general", isActive: true });
      toast({ title: "Entry created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create entry", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...entry }: { id: string } & typeof formData) => {
      return apiRequest("PATCH", `/api/admin/finance-compass/knowledge-base/${id}`, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/knowledge-base"] });
      setIsEditOpen(false);
      setSelectedEntry(null);
      toast({ title: "Entry updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update entry", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/finance-compass/knowledge-base/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finance-compass/knowledge-base"] });
      setDeleteId(null);
      toast({ title: "Entry deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete entry", variant: "destructive" });
    },
  });

  const entries = data?.data ?? [];

  const handleViewDetails = (entry: KnowledgeBaseEntry) => {
    setSelectedEntry(entry);
    setIsDetailOpen(true);
  };

  const handleEdit = (entry: KnowledgeBaseEntry) => {
    setSelectedEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      contentType: entry.contentType,
      category: entry.category,
      isActive: entry.isActive,
    });
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    if (!formData.title || !formData.content) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedEntry || !formData.title || !formData.content) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: selectedEntry.id, ...formData });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage knowledge base entries and AI context
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
            onClick={() => {
              setFormData({ title: "", content: "", contentType: "article", category: "general", isActive: true });
              setIsCreateOpen(true);
            }}
            data-testid="button-create-entry"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Knowledge Base Entries
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                className="pl-10"
                data-testid="input-search"
              />
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
          ) : entries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Content Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow 
                    key={entry.id} 
                    className="cursor-pointer"
                    onClick={() => handleViewDetails(entry)}
                    data-testid={`row-entry-${index}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getContentTypeBadgeClass(entry.contentType)} data-testid={`badge-content-type-${index}`}>
                        {entry.contentType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryBadgeClass(entry.category)} data-testid={`badge-category-${index}`}>
                        {entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(entry.isActive)} data-testid={`badge-status-${index}`}>
                        {entry.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(entry.createdAt).toLocaleDateString()}
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
                            handleViewDetails(entry);
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
                            handleEdit(entry);
                          }}
                          data-testid={`button-edit-${index}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(entry.id);
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
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No entries found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : "Create a new entry to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Entry Details
            </DialogTitle>
            <DialogDescription>
              {selectedEntry?.id && `ID: ${selectedEntry.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Title</p>
                <p className="font-medium text-lg">{selectedEntry.title}</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Content Type</p>
                  <Badge className={getContentTypeBadgeClass(selectedEntry.contentType)}>
                    {selectedEntry.contentType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Category</p>
                  <Badge className={getCategoryBadgeClass(selectedEntry.category)}>
                    {selectedEntry.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge className={getStatusBadgeClass(selectedEntry.isActive)}>
                    {selectedEntry.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Content</p>
                <div className="bg-muted p-4 rounded max-h-64 overflow-auto">
                  <p className="text-sm whitespace-pre-wrap">{selectedEntry.content}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Created: {new Date(selectedEntry.createdAt).toLocaleString()}</span>
                {selectedEntry.updatedAt && (
                  <span>Updated: {new Date(selectedEntry.updatedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Entry
            </DialogTitle>
            <DialogDescription>
              Add a new knowledge base entry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-title">Title *</Label>
              <Input
                id="create-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Entry title"
                data-testid="input-entry-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-content-type">Content Type</Label>
                <Select value={formData.contentType} onValueChange={(v) => setFormData({ ...formData, contentType: v })}>
                  <SelectTrigger id="create-content-type" data-testid="select-content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger id="create-category" data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="epm">EPM</SelectItem>
                    <SelectItem value="erp">ERP</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="create-content">Content *</Label>
              <Textarea
                id="create-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Entry content..."
                rows={6}
                data-testid="textarea-entry-content"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="create-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-entry-active"
              />
              <Label htmlFor="create-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-save-entry"
            >
              {createMutation.isPending ? "Creating..." : "Create Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Entry
            </DialogTitle>
            <DialogDescription>
              Update knowledge base entry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Entry title"
                data-testid="input-edit-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-content-type">Content Type</Label>
                <Select value={formData.contentType} onValueChange={(v) => setFormData({ ...formData, contentType: v })}>
                  <SelectTrigger id="edit-content-type" data-testid="select-edit-content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger id="edit-category" data-testid="select-edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="epm">EPM</SelectItem>
                    <SelectItem value="erp">ERP</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Entry content..."
                rows={6}
                data-testid="textarea-edit-content"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-edit-active"
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              data-testid="button-update-entry"
            >
              {updateMutation.isPending ? "Updating..." : "Update Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this knowledge base entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function FinanceCompassKnowledgeBase() {
  return (
    <AdminLayout>
      <div className="-m-6">
        <FCAdminTopNav />
        <div className="p-6">
          <KnowledgeBaseContent />
        </div>
      </div>
    </AdminLayout>
  );
}
