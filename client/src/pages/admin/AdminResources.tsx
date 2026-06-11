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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileImage,
  File,
  Download,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Calendar,
  Tag
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { SEOHelper } from "@/components/admin/SEOHelper";

interface Resource {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  fileType: string;
  fileUrl: string;
  fileSize: string;
  downloadCount: number;
  featured: boolean;
  publishedAt: string;
  isPublished: boolean;
}

const CATEGORIES = ["Templates", "Guides", "Checklists", "White Papers"] as const;
const FILE_TYPES = ["pdf", "xls", "doc", "zip"] as const;

const resourceFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  fileType: z.string().min(1, "File type is required"),
  fileUrl: z.string().url("Must be a valid URL"),
  fileSize: z.string().min(1, "File size is required (e.g., 2.5 MB)"),
  featured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

type ResourceFormData = z.infer<typeof resourceFormSchema>;

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf":
    case "doc":
      return FileText;
    case "xls":
      return FileSpreadsheet;
    case "zip":
      return FileArchive;
    case "video":
      return FileVideo;
    case "image":
      return FileImage;
    default:
      return File;
  }
}

function getFileTypeBadgeColor(fileType: string): string {
  switch (fileType) {
    case "pdf":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "xls":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "doc":
      return "bg-[#7FB8A3]/100/10 text-[#8E4F67] dark:text-[#7FB8A3]";
    case "zip":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    default:
      return "";
  }
}

function ResourcesContent() {
  const { toast } = useToast();
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);

  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      category: "",
      fileType: "",
      fileUrl: "",
      fileSize: "",
      featured: false,
      isPublished: true,
    },
  });

  const { data: resources, isLoading, error } = useQuery<Resource[]>({
    queryKey: ["/api/admin/resources"],
  });

  const selectedResourceData = resources?.find(r => r.id === selectedResource);

  const createMutation = useMutation({
    mutationFn: async (data: ResourceFormData) => {
      const res = await apiRequest("POST", "/api/admin/resources", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource Created",
        description: "The resource has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Create Failed",
        description: error.message || "Failed to create resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ResourceFormData }) => {
      const res = await apiRequest("PUT", `/api/admin/resources/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource Updated",
        description: "The resource has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      setIsFormOpen(false);
      setEditingResource(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/resources/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource Deleted",
        description: "The resource has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      setSelectedResource(null);
      setDeletingResourceId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete resource. Please try again.",
        variant: "destructive",
      });
      setDeletingResourceId(null);
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/resources/${id}/visibility`, { isPublished });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.isPublished ? "Resource Published" : "Resource Hidden",
        description: variables.isPublished 
          ? "The resource is now visible to the public." 
          : "The resource has been hidden from the public.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Visibility Update Failed",
        description: error.message || "Failed to update visibility. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNewResource = () => {
    setEditingResource(null);
    form.reset({
      title: "",
      slug: "",
      description: "",
      category: "",
      fileType: "",
      fileUrl: "",
      fileSize: "",
      featured: false,
      isPublished: true,
    });
    setIsFormOpen(true);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    form.reset({
      title: resource.title,
      slug: resource.slug,
      description: resource.description,
      category: resource.category,
      fileType: resource.fileType,
      fileUrl: resource.fileUrl,
      fileSize: resource.fileSize,
      featured: resource.featured,
      isPublished: resource.isPublished,
    });
    setSelectedResource(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: ResourceFormData) => {
    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleVisibilityToggle = (id: string, currentState: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    visibilityMutation.mutate({ id, isPublished: !currentState });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingResourceId(id);
  };

  const confirmDelete = () => {
    if (deletingResourceId) {
      deleteMutation.mutate(deletingResourceId);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive" data-testid="text-error">
          Failed to load resources. Please try again.
        </p>
      </div>
    );
  }

  const totalDownloads = resources?.reduce((sum, r) => sum + r.downloadCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Resources</h1>
          <p className="text-muted-foreground mt-1">
            Manage downloadable resources and their statistics
          </p>
        </div>
        <Button onClick={handleNewResource} data-testid="button-new-resource">
          <Plus className="h-4 w-4 mr-2" />
          New Resource
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-total-resources">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold" data-testid="text-total-resources">
                {resources?.length ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-total-downloads">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold" data-testid="text-total-downloads">
                {totalDownloads.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-featured">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold" data-testid="text-featured-count">
                {resources?.filter(r => r.featured).length ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-categories">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FileArchive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold" data-testid="text-categories-count">
                {new Set(resources?.map(r => r.category)).size}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SEOHelper type="resource" />

      <Card data-testid="card-resources">
        <CardHeader>
          <CardTitle>All Resources</CardTitle>
          <CardDescription>
            Click on a row to view details. Use actions to edit, toggle visibility, or delete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : resources && resources.length > 0 ? (
            <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => {
                  const FileIcon = getFileIcon(resource.fileType);
                  return (
                    <TableRow 
                      key={resource.id} 
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedResource(resource.id)}
                      data-testid={`row-resource-${resource.id}`}
                    >
                      <TableCell className="font-medium" data-testid={`text-resource-title-${resource.id}`}>
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-xs">{resource.title}</span>
                          {resource.featured && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-resource-category-${resource.id}`}>
                        <Badge variant="secondary">
                          {resource.category}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-resource-type-${resource.id}`}>
                        <Badge 
                          variant="outline" 
                          className={getFileTypeBadgeColor(resource.fileType)}
                        >
                          {resource.fileType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-resource-size-${resource.id}`}>
                        {resource.fileSize}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={resource.isPublished ? "default" : "secondary"}
                          data-testid={`badge-status-${resource.id}`}
                        >
                          {resource.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium" data-testid={`text-resource-downloads-${resource.id}`}>
                        <div className="flex items-center justify-end gap-1">
                          <Download className="h-3 w-3 text-muted-foreground" />
                          {resource.downloadCount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => handleVisibilityToggle(resource.id, resource.isPublished, e)}
                            disabled={visibilityMutation.isPending}
                            title={resource.isPublished ? "Hide resource" : "Publish resource"}
                            data-testid={`button-visibility-${resource.id}`}
                          >
                            {resource.isPublished ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog open={deletingResourceId === resource.id} onOpenChange={(open) => !open && setDeletingResourceId(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => handleDelete(resource.id, e)}
                                title="Delete resource"
                                data-testid={`button-delete-${resource.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent data-testid="dialog-delete-confirm">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{resource.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={confirmDelete}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={deleteMutation.isPending}
                                  data-testid="button-delete-confirm"
                                >
                                  {deleteMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : null}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8" data-testid="text-no-resources">
              No resources found.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-resource-detail">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {selectedResourceData?.title || "Loading..."}
            </DialogTitle>
            <DialogDescription>
              Resource details and download statistics
            </DialogDescription>
          </DialogHeader>
          
          {selectedResourceData ? (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    <span data-testid="text-detail-category">{selectedResourceData.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span data-testid="text-detail-date">
                      {new Date(selectedResourceData.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span data-testid="text-detail-downloads">
                      {selectedResourceData.downloadCount.toLocaleString()} downloads
                    </span>
                  </div>
                  <Badge variant={selectedResourceData.isPublished ? "default" : "secondary"}>
                    {selectedResourceData.isPublished ? "Published" : "Draft"}
                  </Badge>
                  {selectedResourceData.featured && (
                    <Badge variant="outline">Featured</Badge>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-detail-description">
                      {selectedResourceData.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">File Type</h4>
                      <Badge 
                        variant="outline" 
                        className={getFileTypeBadgeColor(selectedResourceData.fileType)}
                      >
                        {selectedResourceData.fileType.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">File Size</h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-detail-size">
                        {selectedResourceData.fileSize}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">File URL</h4>
                    <a 
                      href={selectedResourceData.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                      data-testid="link-detail-url"
                    >
                      {selectedResourceData.fileUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Slug</h4>
                    <p className="text-sm text-muted-foreground font-mono" data-testid="text-detail-slug">
                      {selectedResourceData.slug}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-4 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedResource(null)}
              data-testid="button-close-detail"
            >
              Close
            </Button>
            <Button 
              onClick={() => selectedResourceData && handleEditResource(selectedResourceData)}
              data-testid="button-edit-resource"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        if (!open) {
          setIsFormOpen(false);
          setEditingResource(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-resource-form">
          <DialogHeader>
            <DialogTitle data-testid="text-form-title">
              {editingResource ? "Edit Resource" : "Create New Resource"}
            </DialogTitle>
            <DialogDescription>
              {editingResource 
                ? "Update the resource details below." 
                : "Fill in the details to create a new resource."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 pb-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Resource title" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (!editingResource && !form.getValues("slug")) {
                                form.setValue("slug", generateSlug(e.target.value));
                              }
                            }}
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="resource-slug" 
                            {...field} 
                            data-testid="input-slug"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="A brief description of the resource..." 
                            className="min-h-[100px]"
                            {...field} 
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fileType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>File Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-file-type">
                                <SelectValue placeholder="Select file type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FILE_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="fileUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/file.pdf" 
                            {...field} 
                            data-testid="input-file-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fileSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File Size</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="2.5 MB" 
                            {...field} 
                            data-testid="input-file-size"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-wrap gap-6">
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-featured"
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Featured resource
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isPublished"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-published"
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Published
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingResource(null);
                    form.reset();
                  }}
                  data-testid="button-cancel-form"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-form"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingResource ? "Update Resource" : "Create Resource"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminResources() {
  return (
    <AdminLayout>
      <ResourcesContent />
    </AdminLayout>
  );
}
