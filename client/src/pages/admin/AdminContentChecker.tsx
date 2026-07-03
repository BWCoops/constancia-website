/**
 * Editorial content quality page.
 *
 * Replaces the old AI-detection-score view, which fingered everything as
 * "AI generated" and never gave the editor anything to do about it. The
 * new flow surfaces concrete, actionable issues (brand voice, generic
 * phrases, unsourced claims, readability, heading hygiene) and offers a
 * one-click rewrite pass that targets the specific issues found.
 *
 * The route URL stays /admin/content-checker for backwards link
 * compatibility; everything inside is new.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Copy,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "./AdminLayout";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  publishedAt: string;
  isPublished: boolean;
}

interface ContentIssue {
  kind: string;
  severity: "high" | "medium" | "low";
  message: string;
  excerpt?: string;
  position?: number;
}

interface ContentQualityReport {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  sentenceLengthVariance: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  issues: ContentIssue[];
  readabilitySummary: string;
  overallGrade: "A" | "B" | "C" | "D" | "F";
}

const GRADE_COLOR: Record<string, string> = {
  A: "text-[#5E8D7A] bg-[#5E8D7A]/10",
  B: "text-[#5E8D7A] bg-[#5E8D7A]/10",
  C: "text-[#C77A93] bg-[#C77A93]/10",
  D: "text-[#8E4F67] bg-[#8E4F67]/10",
  F: "text-[#8E4F67] bg-[#8E4F67]/20",
};

const SEVERITY_ICON = {
  high: AlertCircle,
  medium: AlertTriangle,
  low: Info,
} as const;

const SEVERITY_BADGE: Record<string, string> = {
  high: "bg-[#8E4F67] text-white",
  medium: "bg-[#C77A93] text-white",
  low: "bg-[#12161D]/60 text-white",
};

function ContentQualityContent() {
  const { toast } = useToast();
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [report, setReport] = useState<ContentQualityReport | null>(null);
  const [rewritten, setRewritten] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("analyze");

  const { data: posts, isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog-posts"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (blogPostId: string) => {
      const res = await apiRequest("POST", "/api/admin/content-quality/analyze", { blogPostId });
      return (await res.json()) as { success: boolean; report: ContentQualityReport };
    },
    onSuccess: data => {
      setReport(data.report);
      setRewritten(null);
      setActiveTab("results");
    },
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message ?? "Unknown error", variant: "destructive" });
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: async ({ html, issues }: { html: string; issues: ContentIssue[] }) => {
      const res = await apiRequest("POST", "/api/admin/content-quality/rewrite", { html, issues });
      return (await res.json()) as { success: boolean; rewritten: string };
    },
    onSuccess: data => {
      setRewritten(data.rewritten);
      toast({ title: "Rewrite complete", description: "Review the proposed changes below before publishing." });
    },
    onError: (err: any) => {
      toast({ title: "Rewrite failed", description: err.message ?? "Unknown error", variant: "destructive" });
    },
  });

  const handleAnalyze = () => {
    if (!selectedPostId) {
      toast({ title: "Pick a post", description: "Select a post to analyse.", variant: "destructive" });
      return;
    }
    analyzeMutation.mutate(selectedPostId);
  };

  const handleRewrite = async () => {
    if (!selectedPostId || !report) return;
    const post = posts?.find(p => p.id === selectedPostId);
    if (!post?.content) {
      toast({ title: "Source unavailable", description: "Could not load the post content.", variant: "destructive" });
      return;
    }
    rewriteMutation.mutate({ html: post.content, issues: report.issues });
  };

  const handleCopyRewrite = () => {
    if (!rewritten) return;
    navigator.clipboard.writeText(rewritten);
    toast({ title: "Copied", description: "Rewritten content copied to clipboard." });
  };

  const issueGroups = report
    ? {
        high: report.issues.filter(i => i.severity === "high"),
        medium: report.issues.filter(i => i.severity === "medium"),
        low: report.issues.filter(i => i.severity === "low"),
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold" data-testid="text-page-title">Content quality</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Editorial review and humanisation. Replaces the AI-detection score with concrete, actionable issues an editor can fix.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What we check</CardTitle>
          <CardDescription>
            Deterministic editorial checks — no opaque "AI score". Each issue identifies a specific thing to fix.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#5E8D7A]" />
              <div><b>Brand voice:</b> legacy "1QG" references, missing Constancia context.</div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#5E8D7A]" />
              <div><b>Generic LLM phrasing:</b> "delve into", "fast-paced world", "in conclusion", etc.</div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#5E8D7A]" />
              <div><b>Unsourced claims:</b> statistics without inline citations.</div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#5E8D7A]" />
              <div><b>Readability:</b> Flesch reading ease + Flesch-Kincaid grade level.</div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#5E8D7A]" />
              <div><b>Heading structure:</b> single H1, H2 cadence for long posts.</div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#5E8D7A]" />
              <div><b>Cadence:</b> low sentence-length variance flagged as robotic.</div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#5E8D7A]" />
              <div><b>Freshness:</b> posts &gt; 365 days old flagged for refresh.</div>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 mt-0.5 text-[#8E4F67]" />
              <div><b>One-click rewrite:</b> LLM pass targeting the specific issues found, not generic "humanise".</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="analyze" data-testid="tab-analyze">Analyse</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results" disabled={!report}>
            Results{report ? ` (${report.issues.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="rewrite" data-testid="tab-rewrite" disabled={!rewritten}>
            Rewrite{rewritten ? " ✓" : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pick a post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedPostId} onValueChange={setSelectedPostId}>
                <SelectTrigger data-testid="select-post">
                  <SelectValue placeholder={postsLoading ? "Loading posts…" : "Select a blog post"} />
                </SelectTrigger>
                <SelectContent>
                  {(posts ?? []).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        {p.isPublished ? <Badge className="bg-[#5E8D7A] text-white">Live</Badge> : <Badge variant="outline">Draft</Badge>}
                        <FileText className="h-3.5 w-3.5" />
                        <span className="truncate">{p.title}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAnalyze}
                disabled={!selectedPostId || analyzeMutation.isPending}
                data-testid="button-analyze"
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing…</>
                ) : (
                  <>Analyse content</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {report && issueGroups && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Overall grade</div>
                    <div className={`mt-1 inline-flex items-center justify-center h-12 w-12 rounded-lg text-2xl font-semibold ${GRADE_COLOR[report.overallGrade]}`}>
                      {report.overallGrade}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Reading ease</div>
                    <div className="text-2xl font-semibold mt-1">{report.fleschReadingEase.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{report.readabilitySummary}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Grade level</div>
                    <div className="text-2xl font-semibold mt-1">{report.fleschKincaidGrade.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Flesch-Kincaid</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Word count</div>
                    <div className="text-2xl font-semibold mt-1">{report.wordCount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Sentence avg {report.avgSentenceLength.toFixed(1)} (variance {report.sentenceLengthVariance.toFixed(0)})
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">Issues ({report.issues.length})</CardTitle>
                    <CardDescription>
                      {issueGroups.high.length} high, {issueGroups.medium.length} medium, {issueGroups.low.length} low.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleRewrite}
                    disabled={rewriteMutation.isPending || report.issues.length === 0}
                    data-testid="button-rewrite"
                  >
                    {rewriteMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rewriting…</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Rewrite to fix issues</>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.issues.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-[#5E8D7A]">
                      <CheckCircle2 className="h-4 w-4" />
                      Nothing to flag. Content meets editorial standards.
                    </div>
                  ) : (
                    report.issues.map((issue, idx) => {
                      const Icon = SEVERITY_ICON[issue.severity];
                      return (
                        <div key={idx} className="border rounded-lg p-3 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={SEVERITY_BADGE[issue.severity]}>{issue.severity}</Badge>
                                <span className="text-xs text-muted-foreground">{issue.kind.replace(/_/g, " ")}</span>
                              </div>
                              <div className="text-sm text-foreground">{issue.message}</div>
                              {issue.excerpt && (
                                <div className="mt-1.5 text-sm italic text-[#12161D]/70 bg-[#F6F3EE] rounded p-2">
                                  …{issue.excerpt}…
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="rewrite" className="space-y-4">
          {rewritten && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Proposed rewrite</CardTitle>
                  <CardDescription>
                    Review carefully before publishing. The model targets the issues found but doesn't preserve every nuance.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyRewrite}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap font-sans bg-[#F6F3EE] rounded p-4 max-h-[600px] overflow-y-auto">
                  {rewritten}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminContentChecker() {
  return (
    <AdminLayout>
      <ContentQualityContent />
    </AdminLayout>
  );
}
