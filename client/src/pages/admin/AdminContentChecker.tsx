import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  ShieldCheck, 
  Bot, 
  Search, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string;
  author: string;
  publishedAt: string;
  isPublished: boolean;
}

interface Scan {
  id: string;
  blogPostId: string;
  scanType: string;
  aiScore: number | null;
  humanScore: number | null;
  plagiarismScore: number | null;
  creditsUsed: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ScanResult {
  scanId: string;
  blogPostId: string;
  scanType: string;
  aiScore?: number;
  humanScore?: number;
  plagiarismScore?: number;
  creditsUsed: number;
  status: string;
  errorMessage?: string;
}

function ContentCheckerContent() {
  const { toast } = useToast();
  const [selectedPost, setSelectedPost] = useState<string>("");
  const [scanType, setScanType] = useState<"ai_detection" | "plagiarism" | "both">("both");
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [lastScanResults, setLastScanResults] = useState<ScanResult[]>([]);

  const { data: posts, isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog-posts"],
  });

  const { data: scans, isLoading: scansLoading } = useQuery<Scan[]>({
    queryKey: ["/api/admin/scans"],
  });

  const scanMutation = useMutation({
    mutationFn: async (data: { blogPostId: string; scanType: string }) => {
      const response = await apiRequest("POST", "/api/admin/scans", data);
      return response.json();
    },
    onSuccess: (data) => {
      setLastScanResults(data.results || []);
      setScanDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scans"] });
      toast({
        title: "Scan Complete",
        description: "Content has been analyzed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScan = () => {
    if (!selectedPost) {
      toast({
        title: "Select a Post",
        description: "Please select a blog post to scan.",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate({ blogPostId: selectedPost, scanType });
  };

  const getScoreColor = (score: number | null, type: "ai" | "plagiarism" | "human") => {
    if (score === null) return "text-muted-foreground";
    if (type === "human") {
      if (score >= 80) return "text-emerald-600";
      if (score >= 60) return "text-green-500";
      if (score >= 40) return "text-yellow-500";
      return "text-red-600";
    }
    if (type === "ai" || type === "plagiarism") {
      if (score <= 20) return "text-emerald-600";
      if (score <= 40) return "text-green-500";
      if (score <= 60) return "text-yellow-500";
      if (score <= 80) return "text-orange-500";
      return "text-red-600";
    }
    return "text-muted-foreground";
  };

  const getProgressColor = (score: number | null, type: "ai" | "plagiarism" | "human") => {
    if (score === null) return "";
    if (type === "human") {
      if (score >= 80) return "[&>div]:bg-emerald-600";
      if (score >= 60) return "[&>div]:bg-green-500";
      if (score >= 40) return "[&>div]:bg-yellow-500";
      return "[&>div]:bg-red-600";
    }
    if (type === "ai" || type === "plagiarism") {
      if (score <= 20) return "[&>div]:bg-emerald-600";
      if (score <= 40) return "[&>div]:bg-green-500";
      if (score <= 60) return "[&>div]:bg-yellow-500";
      if (score <= 80) return "[&>div]:bg-orange-500";
      return "[&>div]:bg-red-600";
    }
    return "";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPostTitle = (blogPostId: string) => {
    const post = posts?.find(p => p.id === blogPostId);
    return post?.title || "Unknown Post";
  };

  if (postsLoading || scansLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Content Checker</h1>
        <p className="text-muted-foreground mt-1">
          Scan blog posts for AI-generated content and plagiarism using Winston AI
        </p>
      </div>

      <Card data-testid="card-scan-controls">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-cyan" />
            New Scan
          </CardTitle>
          <CardDescription>
            Select a blog post and scan type to analyze content integrity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedPost} onValueChange={setSelectedPost}>
                <SelectTrigger data-testid="select-blog-post">
                  <SelectValue placeholder="Select a blog post to scan" />
                </SelectTrigger>
                <SelectContent>
                  {posts?.map((post) => (
                    <SelectItem key={post.id} value={post.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="truncate max-w-[300px]">{post.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={scanType} onValueChange={(v) => setScanType(v as typeof scanType)}>
                <SelectTrigger data-testid="select-scan-type">
                  <SelectValue placeholder="Scan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both Scans</SelectItem>
                  <SelectItem value="ai_detection">AI Detection Only</SelectItem>
                  <SelectItem value="plagiarism">Plagiarism Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleScan} 
              disabled={!selectedPost || scanMutation.isPending}
              data-testid="button-scan"
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Scan Content
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Winston AI scans content for AI-generated text and plagiarism. Each scan uses API credits.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-scan-history">
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>
            Recent content integrity scans and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scans && scans.length > 0 ? (
            <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Blog Post</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Human Score</TableHead>
                  <TableHead>AI Score</TableHead>
                  <TableHead>Plagiarism</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.slice(0, 20).map((scan) => (
                  <TableRow key={scan.id} data-testid={`row-scan-${scan.id}`}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {getPostTitle(scan.blogPostId)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {scan.scanType === "ai_detection" ? (
                          <><Bot className="h-3 w-3 mr-1" />AI</>
                        ) : scan.scanType === "plagiarism" ? (
                          <><Search className="h-3 w-3 mr-1" />Plagiarism</>
                        ) : (
                          "Both"
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {scan.humanScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold min-w-[36px] ${getScoreColor(scan.humanScore, "human")}`}>
                            {scan.humanScore}%
                          </span>
                          <Progress value={scan.humanScore} className={`w-16 h-2 ${getProgressColor(scan.humanScore, "human")}`} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {scan.aiScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold min-w-[36px] ${getScoreColor(scan.aiScore, "ai")}`}>
                            {scan.aiScore}%
                          </span>
                          <Progress value={scan.aiScore} className={`w-16 h-2 ${getProgressColor(scan.aiScore, "ai")}`} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {scan.plagiarismScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold min-w-[36px] ${getScoreColor(scan.plagiarismScore, "plagiarism")}`}>
                            {scan.plagiarismScore}%
                          </span>
                          <Progress value={scan.plagiarismScore} className={`w-16 h-2 ${getProgressColor(scan.plagiarismScore, "plagiarism")}`} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(scan.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-scans">
                No scans have been performed yet.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Select a blog post above to run your first content integrity scan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Scan Results
            </DialogTitle>
            <DialogDescription>
              Content integrity analysis complete
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {lastScanResults.map((result, index) => (
              <div key={index} className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {result.scanType === "ai_detection" ? "AI Detection" : "Plagiarism Check"}
                  </span>
                  {result.status === "completed" ? (
                    <Badge variant="default" className="bg-green-600">Complete</Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </div>
                
                {result.status === "completed" && (
                  <div className="grid grid-cols-2 gap-4">
                    {result.humanScore !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Human Score</p>
                        <p className={`text-2xl font-bold ${getScoreColor(result.humanScore, "human")}`}>
                          {result.humanScore}%
                        </p>
                      </div>
                    )}
                    {result.aiScore !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">AI Score</p>
                        <p className={`text-2xl font-bold ${getScoreColor(result.aiScore, "ai")}`}>
                          {result.aiScore}%
                        </p>
                      </div>
                    )}
                    {result.plagiarismScore !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Plagiarism</p>
                        <p className={`text-2xl font-bold ${getScoreColor(result.plagiarismScore, "plagiarism")}`}>
                          {result.plagiarismScore}%
                        </p>
                      </div>
                    )}
                    {result.creditsUsed !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Credits Used</p>
                        <p className="text-lg font-medium">{result.creditsUsed}</p>
                      </div>
                    )}
                  </div>
                )}

                {result.errorMessage && (
                  <div className="flex items-start gap-2 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span>{result.errorMessage}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminContentChecker() {
  return (
    <AdminLayout>
      <ContentCheckerContent />
    </AdminLayout>
  );
}
