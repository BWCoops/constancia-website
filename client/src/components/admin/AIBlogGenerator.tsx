import { useState, useEffect, useRef, Children, isValidElement } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  Lightbulb,
  Target,
  Send,
  Image as ImageIcon,
  Eye,
  Wand2,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  RotateCcw,
  Save,
  MinusCircle,
  History,
  ThumbsDown,
  Maximize2,
  Code,
  HelpCircle,
  Calendar,
  Tag,
  Wrench,
  FolderOpen,
  Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  KeyTakeawayGrid,
  SuccessFactorsDiagram,
  ImplementationTimeline,
  BlogChart,
  FAQAccordion,
  StatHighlight,
  RadialPillarsChart,
  HorizonTimeline,
  KeyTakeawayBox,
  ImpactBox,
} from "@/components/blog-components";
import {
  parseFAQFromContent,
  parseChartsFromContent,
  parseTimelinesFromContent,
  type ChartData,
} from "@/lib/blog-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const generateFormSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  brief: z.string().min(50, "Brief must be at least 50 characters to provide enough context"),
  targetKeywords: z.string().min(3, "Enter at least one keyword"),
  targetAudience: z.string().optional(),
  categoryId: z.string().optional(),
});

type GenerateFormData = z.infer<typeof generateFormSchema>;

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface GenerationJob {
  id: string;
  title: string;
  brief: string;
  targetKeywords: string[];
  targetAudience: string | null;
  categoryId: string | null;
  status: "pending" | "in_progress" | "completed" | "failed" | "published";
  stage: "research" | "deep_research" | "deep_research_1" | "deep_research_2" | "deep_research_3" | "deep_research_4" | "deep_research_5" | "deep_research_6" | "deep_research_7" | "deep_research_8" | "deep_research_9" | "deep_research_10" | "outline" | "winston_outline_check" | "outline_retry" | "draft" | "winston_final_check" | "draft_retry" | "finalizing" | "completed" | null;
  researchData: string | null;
  citations: string | null;
  outlineData: string | null;
  finalContent: string | null;
  guardrailResults: string | null;
  errorMessage: string | null;
  totalTokensUsed: number;
  estimatedCost: string | null;
  aiScore: number | null;
  plagiarismScore: number | null;
  triggeredBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface StockImage {
  url: string;
  alt: string;
  category: string;
}

interface AIBlogGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishSuccess?: () => void;
}

interface EditableContent {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
}

interface FixTarget {
  type: "chart" | "timeline" | "faq" | "key_takeaway_grid" | "five_pillars" | "success_factors" | "implementation_timeline" | "section" | "stat";
  id: number | string;
  label: string;
  sourceSlice?: { start: number; end: number };
  rawMarker?: string;
}

const FIX_ISSUE_CATEGORIES = [
  { id: "broken_visual", label: "Visual not rendering correctly" },
  { id: "wrong_data", label: "Incorrect data or values" },
  { id: "formatting", label: "Poor formatting or layout" },
  { id: "missing_content", label: "Missing expected content" },
  { id: "wrong_style", label: "Style doesn't match blog theme" },
  { id: "other", label: "Other issue" },
];

interface FixableWrapperProps {
  children: React.ReactNode;
  target: FixTarget;
  onFixClick: (target: FixTarget) => void;
}

function FixableWrapper({ children, target, onFixClick }: FixableWrapperProps) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="secondary"
              className="h-7 px-2 bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onFixClick(target);
              }}
              data-testid={`button-fix-${target.type}-${target.id}`}
            >
              <Wrench className="h-3 w-3 mr-1" />
              Fix
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Report an issue with this {target.label}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function AIBlogGenerator({ isOpen, onClose, onPublishSuccess }: AIBlogGeneratorProps) {
  const { toast } = useToast();
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");
  
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState<EditableContent>({
    title: "",
    excerpt: "",
    content: "",
    tags: [],
  });
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [editMode, setEditMode] = useState<"visual" | "source">("visual");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState<string>("");
  
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [fixTarget, setFixTarget] = useState<FixTarget | null>(null);
  const [fixIssueCategory, setFixIssueCategory] = useState<string>("");
  const [fixDescription, setFixDescription] = useState<string>("");
  
  const editableContentRef = useRef(editableContent);
  const activeJobRef = useRef(activeJob);
  useEffect(() => { editableContentRef.current = editableContent; }, [editableContent]);
  useEffect(() => { activeJobRef.current = activeJob; }, [activeJob]);
  
  // Auto-populate editableContent when activeJob changes and has finalContent
  useEffect(() => {
    if (activeJob?.finalContent) {
      try {
        const parsed = JSON.parse(activeJob.finalContent);
        if (parsed) {
          setEditableContent({
            title: parsed.title || activeJob.title || "",
            excerpt: parsed.excerpt || "",
            content: parsed.content || "",
            tags: parsed.tags || activeJob.targetKeywords || [],
          });
        }
      } catch (e) {
        console.error("Failed to parse finalContent for preview:", e);
      }
    }
  }, [activeJob?.id, activeJob?.finalContent]);

  const form = useForm<GenerateFormData>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      title: "",
      brief: "",
      targetKeywords: "",
      targetAudience: "CFOs and senior finance professionals in mid-to-large enterprises",
      categoryId: "",
    },
  });

  const { data: categoriesData } = useQuery<{ success: boolean; data: BlogCategory[] }>({
    queryKey: ["/api/blog/categories"],
  });

  const categories = categoriesData?.data || [];

  const { data: stockImages } = useQuery<{ images: StockImage[] }>({
    queryKey: ["/api/admin/blog/stock-images"],
  });

  const { data: jobs, refetch: refetchJobs } = useQuery<GenerationJob[]>({
    queryKey: ["/api/admin/blog/generate"],
    refetchInterval: pollingInterval || false,
  });

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateFormData) => {
      const res = await apiRequest("POST", "/api/admin/blog/generate", {
        title: data.title,
        brief: data.brief,
        targetKeywords: data.targetKeywords.split(",").map(k => k.trim()).filter(k => k),
        targetAudience: data.targetAudience,
        categoryId: data.categoryId || null,
        useDeepResearch: true, // Always use deep research for comprehensive content
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Generation Started",
        description: "AI blog generation with Deep Research (8-10 searches) has been started. This may take 5-8 minutes.",
      });
      setPollingInterval(3000);
      setActiveTab("progress");
      refetchJobs();
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async ({ jobId, feedback, fromStage }: { jobId: string; feedback: string; fromStage: string }) => {
      const res = await apiRequest("POST", `/api/admin/blog/generate/${jobId}/regenerate`, {
        feedback,
        fromStage,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Regeneration Started",
        description: "AI is regenerating your content with improvements.",
      });
      setPollingInterval(3000);
      setShowRegenerateDialog(false);
      setRegenerateFeedback("");
      setActiveTab("progress"); // Navigate to Progress tab to show regeneration status
      refetchJobs();
    },
    onError: (error: Error) => {
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async ({ jobId, fromStage }: { jobId: string; fromStage?: string }) => {
      const res = await apiRequest("POST", `/api/admin/blog/generate/${jobId}/retry`, { fromStage });
      return res.json();
    },
    onSuccess: (data) => {
      const resumeMsg = data.resumeStage !== "research" 
        ? `Resuming from ${data.resumeStage} stage (checkpoints preserved).`
        : "Restarting from the beginning.";
      toast({
        title: "Retry Started",
        description: resumeMsg + " This may take 2-3 minutes.",
      });
      setPollingInterval(3000);
      setActiveTab("progress"); // Navigate to Progress tab to show retry status
      refetchJobs();
    },
    onError: (error: Error) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ jobId, heroImageUrl, additionalEdits }: { 
      jobId: string; 
      heroImageUrl: string;
      additionalEdits?: EditableContent;
    }) => {
      const res = await apiRequest("POST", `/api/admin/blog/generate/${jobId}/publish`, {
        heroImageUrl,
        additionalEdits,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Blog Published",
        description: `"${data.post?.title}" has been published successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog/generate"] });
      setActiveJob(null);
      onPublishSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Publish Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const seedGuardrailsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/guardrails/seed", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Guardrails Ready",
        description: `${data.categories} categories and ${data.rules} rules loaded.`,
      });
    },
  });

  const fixSectionMutation = useMutation({
    mutationFn: async ({ 
      jobId, 
      targetType, 
      issueCategory, 
      description,
      rawMarker,
    }: { 
      jobId: string; 
      targetType: string; 
      issueCategory: string;
      description: string;
      rawMarker: string;
    }) => {
      const res = await apiRequest("POST", `/api/admin/blog/generate/${jobId}/fix-section`, {
        targetType,
        issueCategory,
        description,
        rawMarker,
      });
      const result = await res.json();
      return { ...result, originalMarker: rawMarker };
    },
    onSuccess: (data) => {
      if (data.fixedMarker && data.originalMarker) {
        const latestEditable = editableContentRef.current;
        const latestJob = activeJobRef.current;
        
        let currentContent = latestEditable.content;
        if (!currentContent && latestJob?.finalContent) {
          try {
            const parsed = JSON.parse(latestJob.finalContent);
            currentContent = parsed.content || "";
          } catch {
            currentContent = "";
          }
        }
        
        const updatedContent = currentContent.replace(data.originalMarker, data.fixedMarker);
        
        if (updatedContent === currentContent) {
          console.warn("[Fix] Original marker not found in content. Marker may have been modified.");
        }
        
        let title = latestEditable.title;
        let excerpt = latestEditable.excerpt;
        let tags = latestEditable.tags;
        
        if (latestJob?.finalContent && (!title || !excerpt || tags.length === 0)) {
          try {
            const parsed = JSON.parse(latestJob.finalContent);
            if (!title) title = parsed.title || latestJob.title || "";
            if (!excerpt) excerpt = parsed.excerpt || "";
            if (tags.length === 0) tags = parsed.tags || latestJob.targetKeywords || [];
          } catch {
            title = title || "";
            excerpt = excerpt || "";
            tags = tags || [];
          }
        }
        
        setEditableContent({
          title,
          excerpt,
          content: updatedContent,
          tags,
        });
        
        if (latestJob?.finalContent) {
          try {
            const parsedFinal = JSON.parse(latestJob.finalContent);
            parsedFinal.content = updatedContent;
            const newFinalContent = JSON.stringify(parsedFinal);
            setActiveJob({
              ...latestJob,
              finalContent: newFinalContent,
            });
          } catch (e) {
            console.error("Failed to update activeJob.finalContent", e);
          }
        }
        
        toast({
          title: "Section Fixed",
          description: "The component has been regenerated and updated in the preview.",
        });
        
        setTimeout(() => refetchJobs(), 500);
      } else {
        toast({
          title: "Fix Applied",
          description: "The component was regenerated. Refresh to see changes.",
        });
        refetchJobs();
      }
      setShowFixDialog(false);
      setFixTarget(null);
      setFixIssueCategory("");
      setFixDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenFixDialog = (target: FixTarget) => {
    setFixTarget(target);
    setShowFixDialog(true);
    setFixIssueCategory("");
    setFixDescription("");
  };

  const handleSubmitFix = () => {
    if (!activeJob || !fixTarget || !fixIssueCategory) {
      toast({
        title: "Missing Information",
        description: "Please select an issue category.",
        variant: "destructive",
      });
      return;
    }
    
    if (!fixTarget.rawMarker) {
      toast({
        title: "Cannot Fix",
        description: "This component doesn't have the source marker available. Try using Source mode editing instead.",
        variant: "destructive",
      });
      return;
    }
    
    fixSectionMutation.mutate({
      jobId: activeJob.id,
      targetType: fixTarget.type,
      issueCategory: fixIssueCategory,
      description: fixDescription,
      rawMarker: fixTarget.rawMarker,
    });
  };

  useEffect(() => {
    if (isOpen) {
      seedGuardrailsMutation.mutate();
    }
  }, [isOpen]);

  // Track the previous job status and ID to detect completion
  const [previousJobStatus, setPreviousJobStatus] = useState<string | null>(null);
  const [previousJobId, setPreviousJobId] = useState<string | null>(null);
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState<string | null>(null);

  useEffect(() => {
    if (jobs && jobs.length > 0) {
      // Sort jobs by createdAt to get the most recent first
      const sortedJobs = [...jobs].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      const runningJob = sortedJobs.find(j => j.status === "in_progress" || j.status === "pending");
      if (runningJob) {
        setActiveJob(runningJob);
        setPreviousJobStatus(runningJob.status);
        setPreviousJobId(runningJob.id);
      } else {
        setPollingInterval(null);
        const latestCompleted = sortedJobs.find(j => j.status === "completed");
        const latestFailed = sortedJobs.find(j => j.status === "failed");
        
        // Detect when a job just completed (was running/pending, now completed)
        // Also check if we haven't already shown toast for this job
        const wasTracking = previousJobStatus === "in_progress" || previousJobStatus === "pending";
        const isNewCompletion = latestCompleted && hasShownCompletionToast !== latestCompleted.id;
        
        if (latestCompleted && wasTracking && isNewCompletion && previousJobId === latestCompleted.id) {
          toast({
            title: "Generation Complete!",
            description: "Your blog post has been generated and saved as a draft. You can review it in the Preview tab or find it in All Blogs.",
          });
          setActiveTab("preview");
          setHasShownCompletionToast(latestCompleted.id);
        }
        
        // Detect when a job just failed
        if (latestFailed && wasTracking && previousJobId === latestFailed.id && !latestCompleted) {
          toast({
            title: "Generation Failed",
            description: latestFailed.errorMessage || "Pipeline encountered an error. You can retry from the Progress tab.",
            variant: "destructive",
          });
        }
        
        if (latestCompleted) {
          setActiveJob(latestCompleted);
          setPreviousJobStatus(latestCompleted.status);
          setPreviousJobId(latestCompleted.id);
          const parsed = parseFinalContent(latestCompleted);
          if (parsed && !editableContent.title) {
            setEditableContent({
              title: parsed.title || latestCompleted.title,
              excerpt: parsed.excerpt || "",
              content: parsed.content || "",
              tags: parsed.tags || latestCompleted.targetKeywords || [],
            });
          }
          // Auto-switch to preview tab if we have completed content
          if (parsed && activeTab === "progress") {
            setActiveTab("preview");
          }
        } else if (latestFailed) {
          setActiveJob(latestFailed);
          setPreviousJobStatus(latestFailed.status);
          setPreviousJobId(latestFailed.id);
        }
      }
    }
  }, [jobs]);

  const onSubmit = (data: GenerateFormData) => {
    generateMutation.mutate(data);
  };

  const normalizeStage = (stage: string): string => {
    if (stage.startsWith("deep_research_")) return stage; // Keep deep research number
    if (stage.startsWith("outline_retry")) return "outline_retry";
    if (stage.startsWith("draft_retry")) return "draft_retry";
    if (stage.startsWith("winston_outline_check")) return "winston_outline_check";
    if (stage.startsWith("winston_final_check")) return "winston_final_check";
    return stage;
  };

  const getRetryAttempt = (stage: string): number | null => {
    const match = stage.match(/_(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  };

  const formatStageName = (stage: string): string => {
    if (stage.startsWith("deep_research_")) {
      const num = stage.replace("deep_research_", "");
      return `Deep Research (${num}/10)`;
    }
    if (stage === "deep_research") return "Deep Research";
    
    const names: Record<string, string> = {
      research: "Research",
      outline: "Outline",
      winston_outline_check: "AI Check (Outline)",
      outline_retry: "Outline Retry",
      draft: "Draft",
      winston_final_check: "AI Check (Draft)",
      draft_retry: "Draft Retry",
      finalizing: "Finalizing",
      completed: "Completed",
    };
    return names[stage] || stage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const getStageProgress = () => {
    if (!activeJob) return 0;
    if (activeJob.status === "completed" || activeJob.status === "published") return 100;
    if (activeJob.status === "failed") return 0;
    
    const stage = activeJob.stage || "";
    const normalized = normalizeStage(stage);
    
    // Handle deep research stages (deep_research_1 through deep_research_10)
    if (normalized.startsWith("deep_research")) {
      const match = normalized.match(/deep_research_(\d+)/);
      if (match) {
        const searchNum = parseInt(match[1], 10);
        // Deep research takes up 0-25% of progress (2.5% per search)
        return Math.min(25, Math.round(searchNum * 2.5));
      }
      return 5; // Just starting deep research
    }
    
    switch (normalized) {
      case "research": return 15;
      case "outline": return 30;
      case "winston_outline_check": return 40;
      case "outline_retry": return 50;
      case "draft": return 60;
      case "winston_final_check": return 75;
      case "draft_retry": return 85;
      case "finalizing": return 95;
      default: return 10;
    }
  };

  const isOptionalStage = (stage: string): boolean => {
    return ["outline_retry", "draft_retry"].includes(stage);
  };

  const getExecutedStages = (): Set<string> => {
    if (!activeJob?.guardrailResults) return new Set();
    try {
      const results = JSON.parse(activeJob.guardrailResults);
      if (!Array.isArray(results)) return new Set();
      return new Set(results.map((r: any) => normalizeStage(r.stage || "")));
    } catch {
      return new Set();
    }
  };

  const wasRetryTriggered = (retryStage: string): boolean => {
    if (!activeJob) return false;
    
    const executedStages = getExecutedStages();
    const currentStage = normalizeStage(activeJob.stage || "");
    
    if (currentStage === retryStage) return true;
    
    switch (retryStage) {
      case "outline_retry":
        return executedStages.has("outline_retry");
      case "draft_retry":
        return Array.from(executedStages).some(
          stage => stage.startsWith("draft_retry") || stage === "draft_retry"
        );
      default:
        return executedStages.has(retryStage);
    }
  };

  const getStageStatus = (stage: string) => {
    if (!activeJob) return "pending";
    if (activeJob.status === "failed") return "failed";
    
    const stageOrder = [
      "research", 
      "outline", 
      "winston_outline_check",
      "outline_retry",
      "draft", 
      "winston_final_check",
      "draft_retry",
      "finalizing",
      "completed"
    ];
    
    const currentStage = activeJob.stage || "";
    const normalizedCurrent = normalizeStage(currentStage);
    const normalizedCheck = normalizeStage(stage);
    
    const currentIndex = stageOrder.indexOf(normalizedCurrent);
    const checkIndex = stageOrder.indexOf(normalizedCheck);
    
    if (activeJob.status === "completed" || activeJob.status === "published") {
      if (isOptionalStage(normalizedCheck)) {
        return wasRetryTriggered(normalizedCheck) ? "completed" : "skipped";
      }
      return "completed";
    }
    if (checkIndex === -1 || currentIndex === -1) return "pending";
    if (checkIndex < currentIndex) {
      if (isOptionalStage(normalizedCheck)) {
        return wasRetryTriggered(normalizedCheck) ? "completed" : "skipped";
      }
      return "completed";
    }
    if (checkIndex === currentIndex) return "in_progress";
    return "pending";
  };

  const getStageName = (stage: string) => {
    switch (stage) {
      case "research": return "Research";
      case "outline": return "Outline";
      case "winston_outline_check": return "AI Check";
      case "outline_retry": return "Outline Retry";
      case "draft": return "Draft";
      case "winston_final_check": return "Final Check";
      case "draft_retry": return "Draft Retry";
      case "finalizing": return "Finalizing";
      default: return stage;
    }
  };

  const getStageModel = (stage: string) => {
    switch (stage) {
      case "research": return "Perplexity";
      case "outline": return "Claude Sonnet 4.5";
      case "winston_outline_check": return "Winston AI";
      case "outline_retry": return "Claude Sonnet 4.5";
      case "draft": return "GPT-5.1";
      case "winston_final_check": return "Winston AI";
      case "draft_retry": return "GPT-5.1";
      case "finalizing": return "";
      default: return "";
    }
  };

  const isRetryStage = (stage: string) => {
    return stage.includes("_retry");
  };

  const isWinstonStage = (stage: string) => {
    return stage.includes("winston");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseGuardrailResults = () => {
    if (!activeJob?.guardrailResults) return [];
    try {
      return JSON.parse(activeJob.guardrailResults);
    } catch {
      return [];
    }
  };

  const parseFinalContent = (job?: GenerationJob | null) => {
    const targetJob = job || activeJob;
    if (!targetJob?.finalContent) return null;
    try {
      return JSON.parse(targetJob.finalContent);
    } catch {
      return null;
    }
  };

  const handleStartEditing = () => {
    const parsed = parseFinalContent();
    if (parsed) {
      setEditableContent({
        title: parsed.title || activeJob?.title || "",
        excerpt: parsed.excerpt || "",
        content: parsed.content || "",
        tags: parsed.tags || activeJob?.targetKeywords || [],
      });
    }
    setIsEditing(true);
  };

  const handleSaveEdits = () => {
    setIsEditing(false);
    toast({
      title: "Edits Saved",
      description: "Your changes have been saved. Click Publish when ready.",
    });
  };

  const handleCancelEdits = () => {
    const parsed = parseFinalContent();
    if (parsed) {
      setEditableContent({
        title: parsed.title || activeJob?.title || "",
        excerpt: parsed.excerpt || "",
        content: parsed.content || "",
        tags: parsed.tags || activeJob?.targetKeywords || [],
      });
    }
    setIsEditing(false);
  };

  const handlePublish = () => {
    if (!activeJob || !selectedImage) {
      toast({
        title: "Missing Information",
        description: "Please select a hero image before publishing.",
        variant: "destructive",
      });
      return;
    }

    publishMutation.mutate({
      jobId: activeJob.id,
      heroImageUrl: selectedImage,
      additionalEdits: editableContent.title ? editableContent : undefined,
    });
  };

  const countWords = (text: string) => {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  };

  const extractBalancedJson = (content: string, startIndex: number): string | null => {
    if (content[startIndex] !== '{') return null;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (char === '\\' && inString) { escapeNext = true; continue; }
      if (char === '"' && !escapeNext) { inString = !inString; continue; }
      if (!inString) {
        if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 0) return content.slice(startIndex, i + 1);
        }
      }
    }
    return null;
  };

  const parseComponentMarkersForPreview = <T,>(
    content: string,
    markerName: string,
    placeholderPrefix: string,
    results: T[]
  ): string => {
    let processedContent = content;
    const openTag = `[${markerName}]`;
    const closeTag = `[/${markerName}]`;
    let searchStart = 0;
    while (true) {
      const markerStart = processedContent.indexOf(openTag, searchStart);
      if (markerStart === -1) break;
      const jsonStart = markerStart + openTag.length;
      let jsonActualStart = jsonStart;
      while (jsonActualStart < processedContent.length && /\s/.test(processedContent[jsonActualStart])) {
        jsonActualStart++;
      }
      if (processedContent[jsonActualStart] !== '{') {
        searchStart = markerStart + openTag.length;
        continue;
      }
      const jsonStr = extractBalancedJson(processedContent, jsonActualStart);
      if (!jsonStr) {
        searchStart = markerStart + openTag.length;
        continue;
      }
      let markerEnd = jsonActualStart + jsonStr.length;
      while (markerEnd < processedContent.length && /\s/.test(processedContent[markerEnd])) {
        markerEnd++;
      }
      if (processedContent.slice(markerEnd, markerEnd + closeTag.length) === closeTag) {
        markerEnd += closeTag.length;
      }
      try {
        const data = JSON.parse(jsonStr) as T;
        results.push(data);
        const placeholder = `\n[${placeholderPrefix}_${results.length - 1}]\n\n`;
        processedContent = processedContent.slice(0, markerStart) + placeholder + processedContent.slice(markerEnd);
        searchStart = markerStart + placeholder.length;
      } catch {
        searchStart = markerStart + openTag.length;
      }
    }
    return processedContent;
  };

  interface KeyTakeawayGridData { takeaways: string[]; }
  interface PillarData { title: string; pillars: { title: string; description: string; icon?: string }[]; }
  interface SuccessFactorData { title: string; factors: { title: string; description: string; icon?: string }[]; }
  interface ImplementationPhaseData { phases: { phase: number; title: string; timeframe: string; description: string }[]; }

  const processMarkdownForPreview = (rawContent: string) => {
    const { faqs, contentWithoutFAQ } = parseFAQFromContent(rawContent);
    let processedContent = contentWithoutFAQ.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const { charts, contentWithChartMarkers } = parseChartsFromContent(processedContent);
    processedContent = contentWithChartMarkers;
    const { horizons, contentWithTimelineMarkers } = parseTimelinesFromContent(processedContent);
    processedContent = contentWithTimelineMarkers;
    const statRegex = /\[STAT:\s*(\d+[%+]?[MBK]?|\£[\d,.]+[MBK]?)\s*-\s*(.*?)(?:\s*\|\s*Source:\s*(.*?))?\]/gi;
    const stats: { stat: string; label: string; source?: string; rawMarker?: string }[] = [];
    let match;
    while ((match = statRegex.exec(processedContent)) !== null) {
      stats.push({ stat: match[1], label: match[2].trim(), source: match[3]?.trim(), rawMarker: match[0] });
      processedContent = processedContent.replace(match[0], `[STAT_${stats.length - 1}]`);
    }
    const rawMarkers: { [key: string]: string } = {};
    const extractRawMarkers = (content: string, tag: string): void => {
      const regex = new RegExp(`\\[${tag}\\]\\s*\\{[\\s\\S]*?\\}\\s*\\[\\/${tag}\\]`, 'gi');
      let m;
      let idx = 0;
      while ((m = regex.exec(rawContent)) !== null) {
        rawMarkers[`${tag}_${idx}`] = m[0];
        idx++;
      }
    };
    extractRawMarkers(rawContent, 'KEY_TAKEAWAY_GRID');
    extractRawMarkers(rawContent, 'FIVE_PILLARS');
    extractRawMarkers(rawContent, 'SUCCESS_FACTORS');
    extractRawMarkers(rawContent, 'IMPLEMENTATION_TIMELINE');
    const chartMarkerRegex = /\[CHART:(bar|line|pie):([^\]]+)\]\s*\{[\s\S]*?\}\s*\[\/CHART\]/gi;
    let chartIdx = 0;
    let cm;
    while ((cm = chartMarkerRegex.exec(rawContent)) !== null) {
      rawMarkers[`CHART_${chartIdx}`] = cm[0];
      chartIdx++;
    }
    const timelineMarkerRegex = /\[HORIZON_TIMELINE\][\s\S]*?\[\/HORIZON_TIMELINE\]/gi;
    let tm;
    let timelineIdx = 0;
    while ((tm = timelineMarkerRegex.exec(rawContent)) !== null) {
      rawMarkers[`HORIZON_TIMELINE_${timelineIdx}`] = tm[0];
      timelineIdx++;
    }
    const keyTakeawayGrids: KeyTakeawayGridData[] = [];
    processedContent = parseComponentMarkersForPreview<KeyTakeawayGridData>(processedContent, 'KEY_TAKEAWAY_GRID', 'KEY_TAKEAWAY_GRID', keyTakeawayGrids);
    const fivePillars: PillarData[] = [];
    processedContent = parseComponentMarkersForPreview<PillarData>(processedContent, 'FIVE_PILLARS', 'FIVE_PILLARS', fivePillars);
    const successFactors: SuccessFactorData[] = [];
    processedContent = parseComponentMarkersForPreview<SuccessFactorData>(processedContent, 'SUCCESS_FACTORS', 'SUCCESS_FACTORS', successFactors);
    const implementationTimelines: ImplementationPhaseData[] = [];
    processedContent = parseComponentMarkersForPreview<ImplementationPhaseData>(processedContent, 'IMPLEMENTATION_TIMELINE', 'IMPLEMENTATION_TIMELINE', implementationTimelines);
    processedContent = processedContent.replace(/\[SUCCESS_FACTORS\]\s*(?!\{)/g, '');
    processedContent = processedContent.replace(/\[\/SUCCESS_FACTORS\]/g, '');
    processedContent = processedContent.replace(/\[KEY_TAKEAWAY_GRID\]\s*(?!\{)/g, '');
    processedContent = processedContent.replace(/\[\/KEY_TAKEAWAY_GRID\]/g, '');
    processedContent = processedContent.replace(/\[FIVE_PILLARS\]\s*(?!\{)/g, '');
    processedContent = processedContent.replace(/\[\/FIVE_PILLARS\]/g, '');
    processedContent = processedContent.replace(/\[IMPLEMENTATION_TIMELINE\]\s*(?!\{)/g, '');
    processedContent = processedContent.replace(/\[\/IMPLEMENTATION_TIMELINE\]/g, '');
    return { content: processedContent, faqs, stats, charts, horizons, keyTakeawayGrids, fivePillars, successFactors, implementationTimelines, rawMarkers };
  };

  const REJECT_REASONS = [
    { id: "tone", label: "Tone not right" },
    { id: "missing_points", label: "Missing key points" },
    { id: "ai_sounding", label: "Too AI-sounding" },
    { id: "factual", label: "Factual concerns" },
    { id: "structure", label: "Structure issues" },
  ];

  const handleRejectReasonToggle = (reasonId: string) => {
    setRejectReasons(prev => 
      prev.includes(reasonId) 
        ? prev.filter(r => r !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleRejectAndRegenerate = () => {
    if (!activeJob) return;
    const reasonLabels = rejectReasons
      .map(id => REJECT_REASONS.find(r => r.id === id)?.label)
      .filter((label): label is string => !!label);
    const feedbackParts: string[] = [];
    if (reasonLabels.length > 0) {
      feedbackParts.push(`Issues identified: ${reasonLabels.join(", ")}`);
    }
    if (rejectFeedback.trim()) {
      feedbackParts.push(`Required changes: ${rejectFeedback.trim()}`);
    }
    const combinedFeedback = feedbackParts.join("\n\n");
    if (!combinedFeedback) {
      toast({
        title: "Feedback Required",
        description: "Please select at least one issue or provide change details.",
        variant: "destructive",
      });
      return;
    }
    regenerateMutation.mutate({
      jobId: activeJob.id,
      feedback: combinedFeedback,
      fromStage: "draft",
    });
    setShowRejectDialog(false);
    setRejectFeedback("");
    setRejectReasons([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Blog Generator
          </DialogTitle>
          <DialogDescription>
            Generate consulting-grade blog content with verified research and citations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-5 gap-1 flex-shrink-0 mx-6 mt-4" style={{ width: 'calc(100% - 3rem)' }}>
              <TabsTrigger value="generate" data-testid="tab-generate">
                <Wand2 className="h-4 w-4 mr-2" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="drafts" data-testid="tab-drafts">
                <FolderOpen className="h-4 w-4 mr-2" />
                Drafts
                {jobs && jobs.filter(j => j.status === "completed" || j.status === "in_progress").length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {jobs.filter(j => j.status === "completed" || j.status === "in_progress").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="progress" data-testid="tab-progress">
                <RefreshCw className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                data-testid="tab-preview" 
                disabled={!activeJob || (!activeJob.finalContent && activeJob.status !== "completed")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
                {activeJob?.finalContent && activeJob.status !== "completed" && (
                  <Badge variant="secondary" className="ml-1 text-xs">Draft</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="publish" 
                data-testid="tab-publish" 
                disabled={!activeJob || activeJob.status !== "completed"}
              >
                <Send className="h-4 w-4 mr-2" />
                Publish
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 mt-4 overflow-y-auto px-6">
              {/* Generate Tab */}
              <TabsContent value="generate" className="space-y-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Working Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., How AI is Transforming Financial Close Processes" 
                              {...field}
                              data-testid="input-title"
                            />
                          </FormControl>
                          <FormDescription>
                            A working title to guide the AI (will be refined during generation)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brief"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content Brief</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the article you want to create. Include key topics, angles, and any specific points to cover..."
                              className="min-h-[120px]"
                              {...field}
                              data-testid="input-brief"
                            />
                          </FormControl>
                          <FormDescription>
                            Provide detailed context for the AI to generate relevant content
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="targetKeywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Keywords</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="EPM, financial planning, AI automation" 
                                {...field}
                                data-testid="input-keywords"
                              />
                            </FormControl>
                            <FormDescription>
                              Comma-separated keywords for SEO
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
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
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Audience</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="CFOs and senior finance professionals" 
                              {...field}
                              data-testid="input-audience"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium mb-1">Deep Research AI Pipeline</p>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                              <li><strong>Deep Research:</strong> 8-10 iterative Perplexity searches with intelligent query generation</li>
                              <li><strong>Outline:</strong> Claude structures content with visual components</li>
                              <li><strong>Draft:</strong> GPT writes consulting-grade final content with humanization</li>
                            </ol>
                            <p className="mt-2 text-xs text-muted-foreground italic">Generation typically takes 5-8 minutes for comprehensive research</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={generateMutation.isPending}
                      data-testid="button-generate"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Starting Generation...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Blog Post
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Drafts Tab - All saved jobs */}
              <TabsContent value="drafts" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Saved Drafts
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Resume or publish previously generated blog posts
                    </p>
                  </div>
                  <Badge variant="outline">
                    {jobs?.length || 0} total jobs
                  </Badge>
                </div>

                {jobs && jobs.length > 0 ? (
                  <div className="space-y-3">
                    {[...jobs]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((job) => {
                        const isActive = activeJob?.id === job.id;
                        return (
                          <Card 
                            key={job.id}
                            className={`transition-all cursor-pointer ${
                              isActive ? "ring-2 ring-primary" : "hover-elevate"
                            }`}
                            onClick={() => {
                              setActiveJob(job);
                              if (job.status === "completed") {
                                const parsed = parseFinalContent(job);
                                if (parsed) {
                                  setEditableContent({
                                    title: parsed.title || job.title,
                                    excerpt: parsed.excerpt || "",
                                    content: parsed.content || "",
                                    tags: parsed.tags || job.targetKeywords || [],
                                  });
                                }
                              }
                            }}
                            data-testid={`draft-card-${job.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium truncate" data-testid={`text-draft-title-${job.id}`}>{job.title}</h4>
                                    <Badge 
                                      variant={
                                        job.status === "completed" ? "default" :
                                        job.status === "published" ? "secondary" :
                                        job.status === "failed" ? "destructive" :
                                        job.status === "in_progress" ? "outline" :
                                        "outline"
                                      }
                                      className="flex-shrink-0"
                                      data-testid={`badge-draft-status-${job.id}`}
                                    >
                                      {job.status === "in_progress" && (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      )}
                                      {job.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(job.createdAt).toLocaleDateString()} at {new Date(job.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    {job.stage && job.status !== "completed" && job.status !== "published" && (
                                      <span className="capitalize flex items-center gap-1">
                                        <RefreshCw className="h-3 w-3" />
                                        Stage: {job.stage.replace(/_/g, " ")}
                                      </span>
                                    )}
                                    {job.totalTokensUsed > 0 && (
                                      <span>{job.totalTokensUsed.toLocaleString()} tokens</span>
                                    )}
                                  </div>

                                  {job.targetKeywords && job.targetKeywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {job.targetKeywords.slice(0, 3).map((kw, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          <Tag className="h-2.5 w-2.5 mr-1" />
                                          {kw}
                                        </Badge>
                                      ))}
                                      {job.targetKeywords.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{job.targetKeywords.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  {job.errorMessage && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      {job.errorMessage}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-col gap-2 flex-shrink-0">
                                  {job.status === "completed" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveJob(job);
                                          const parsed = parseFinalContent(job);
                                          if (parsed) {
                                            setEditableContent({
                                              title: parsed.title || job.title,
                                              excerpt: parsed.excerpt || "",
                                              content: parsed.content || "",
                                              tags: parsed.tags || job.targetKeywords || [],
                                            });
                                          }
                                          setActiveTab("preview");
                                        }}
                                        data-testid={`button-preview-draft-${job.id}`}
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Preview
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveJob(job);
                                          const parsed = parseFinalContent(job);
                                          if (parsed) {
                                            setEditableContent({
                                              title: parsed.title || job.title,
                                              excerpt: parsed.excerpt || "",
                                              content: parsed.content || "",
                                              tags: parsed.tags || job.targetKeywords || [],
                                            });
                                          }
                                          setActiveTab("publish");
                                        }}
                                        data-testid={`button-publish-draft-${job.id}`}
                                      >
                                        <Send className="h-4 w-4 mr-1" />
                                        Publish
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveJob(job);
                                          setActiveTab("progress");
                                          retryMutation.mutate({ jobId: job.id, fromStage: "draft" });
                                        }}
                                        disabled={retryMutation.isPending}
                                        data-testid={`button-regenerate-draft-${job.id}`}
                                      >
                                        <RotateCcw className="h-4 w-4 mr-1" />
                                        Regenerate
                                      </Button>
                                    </>
                                  )}
                                  {job.status === "in_progress" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveJob(job);
                                        setActiveTab("progress");
                                      }}
                                      data-testid={`button-view-progress-${job.id}`}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      View Progress
                                    </Button>
                                  )}
                                  {job.status === "failed" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        retryMutation.mutate({ jobId: job.id });
                                      }}
                                      disabled={retryMutation.isPending}
                                      data-testid={`button-retry-draft-${job.id}`}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-1" />
                                      Retry
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground">No drafts yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generate your first blog post to see it here
                      </p>
                      <Button 
                        className="mt-4"
                        onClick={() => setActiveTab("generate")}
                        data-testid="button-go-to-generate"
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        Start Generating
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-4">
                {activeJob ? (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-lg">{activeJob.title}</CardTitle>
                          <Badge variant={
                            activeJob.status === "completed" ? "default" :
                            activeJob.status === "published" ? "secondary" :
                            activeJob.status === "failed" ? "destructive" :
                            "outline"
                          }>
                            {activeJob.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Started {new Date(activeJob.createdAt).toLocaleString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Progress value={getStageProgress()} className="h-2 mb-4" />
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                          {["research", "outline", "winston_outline_check", "outline_retry", "draft", "winston_final_check", "draft_retry", "finalizing"].map((stage) => {
                            const status = getStageStatus(stage);
                            const winston = isWinstonStage(stage);
                            const retry = isRetryStage(stage);
                            const optional = isOptionalStage(stage);
                            const currentAttempt = activeJob && retry && normalizeStage(activeJob.stage || "") === stage 
                              ? getRetryAttempt(activeJob.stage || "") 
                              : null;
                            return (
                              <div 
                                key={stage}
                                className={`p-2 rounded-lg border text-center ${
                                  status === "completed" ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" :
                                  status === "skipped" ? "bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-60" :
                                  status === "in_progress" ? (
                                    retry ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800" : 
                                    winston ? "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800" :
                                    "bg-[#7FB8A3]/10 dark:bg-[#1E2630] border-[#7FB8A3] dark:border-[#12161D]"
                                  ) :
                                  status === "failed" ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" :
                                  "bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  {status === "completed" ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  ) : status === "skipped" ? (
                                    <MinusCircle className="h-3 w-3 text-gray-400" />
                                  ) : status === "in_progress" ? (
                                    retry ? (
                                      <RefreshCw className="h-3 w-3 animate-spin text-orange-600" />
                                    ) : winston ? (
                                      <Sparkles className="h-3 w-3 animate-pulse text-purple-600" />
                                    ) : (
                                      <Loader2 className="h-3 w-3 animate-spin text-[#8E4F67]" />
                                    )
                                  ) : status === "failed" ? (
                                    <XCircle className="h-3 w-3 text-red-600" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className={`text-xs font-medium ${
                                    status === "skipped" ? "text-gray-400 line-through" :
                                    winston ? "text-purple-600 dark:text-purple-400" : 
                                    retry ? "text-orange-600 dark:text-orange-400" : ""
                                  }`}>
                                    {getStageName(stage)}
                                    {currentAttempt !== null && (
                                      <span className="ml-1 text-[10px] bg-orange-200 dark:bg-orange-800 px-1 rounded">
                                        #{currentAttempt}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {status === "skipped" ? "Not needed" : getStageModel(stage)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Cumulative Stage Progress Log */}
                        {parseGuardrailResults().length > 0 && (
                          <div className="mt-4 p-3 rounded-lg border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="h-4 w-4 text-slate-600" />
                              <span className="font-medium text-slate-800 dark:text-slate-200">Stage Progress Log</span>
                              <Badge variant="outline" className="text-xs">
                                {parseGuardrailResults().length} stages
                              </Badge>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {parseGuardrailResults().map((result: any, idx: number) => (
                                <div 
                                  key={idx} 
                                  className={`flex items-center justify-between p-2 rounded text-xs ${
                                    result.passed 
                                      ? "bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800" 
                                      : result.skipped 
                                        ? "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 opacity-60"
                                        : "bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {result.passed ? (
                                      <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                                    ) : result.skipped ? (
                                      <MinusCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                    ) : (
                                      <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                                    )}
                                    <span className="font-medium capitalize">
                                      {result.stage?.replace(/_/g, " ") || "Unknown"}
                                    </span>
                                    {result.type && (
                                      <Badge variant="outline" className="text-[10px] px-1">
                                        {result.type}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {result.aiScore !== undefined && (
                                      <Badge 
                                        variant={result.aiScore < 30 ? "default" : result.aiScore < 40 ? "secondary" : "destructive"}
                                        className="text-[10px] px-1"
                                      >
                                        AI: {result.aiScore}%
                                      </Badge>
                                    )}
                                    {result.plagiarismScore !== undefined && (
                                      <Badge 
                                        variant={result.plagiarismScore < 15 ? "default" : result.plagiarismScore < 25 ? "secondary" : "destructive"}
                                        className="text-[10px] px-1"
                                      >
                                        Plag: {result.plagiarismScore}%
                                      </Badge>
                                    )}
                                    {result.requiresRewrite && (
                                      <Badge variant="destructive" className="text-[10px] px-1">
                                        Rewrite
                                      </Badge>
                                    )}
                                    {result.violations?.length > 0 && (
                                      <Badge variant="outline" className="text-[10px] px-1">
                                        {result.violations.length} issues
                                      </Badge>
                                    )}
                                    {result.creditsUsed !== undefined && result.creditsUsed > 0 && (
                                      <span className="text-muted-foreground text-[10px]">
                                        {result.creditsUsed} credits
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(activeJob.aiScore !== null || activeJob.plagiarismScore !== null) && (
                          <div className="mt-4 p-3 rounded-lg border bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-purple-800 dark:text-purple-200">Current Winston AI Scores</span>
                            </div>
                            <div className="flex gap-4 text-sm">
                              {activeJob.aiScore !== null && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">AI Detection:</span>
                                  <Badge variant={activeJob.aiScore < 30 ? "default" : activeJob.aiScore < 40 ? "secondary" : "destructive"}>
                                    {activeJob.aiScore}%
                                  </Badge>
                                </div>
                              )}
                              {activeJob.plagiarismScore !== null && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Plagiarism:</span>
                                  <Badge variant={activeJob.plagiarismScore < 15 ? "default" : activeJob.plagiarismScore < 25 ? "secondary" : "destructive"}>
                                    {activeJob.plagiarismScore}%
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeJob.status === "failed" && (
                          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border-2 border-red-300 dark:border-red-700 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="font-semibold text-red-800 dark:text-red-200 text-base">Pipeline Failed</p>
                                  <Badge variant="destructive" className="text-xs">
                                    ERR_{activeJob.stage?.toUpperCase() || "UNKNOWN"}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-600 dark:text-red-400 font-medium">Stage:</span>
                                    <span className="text-red-700 dark:text-red-300 capitalize">
                                      {activeJob.stage?.replace(/_/g, " ") || "Unknown"}
                                    </span>
                                  </div>
                                  
                                  {activeJob.errorMessage && (
                                    <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/50 rounded border border-red-200 dark:border-red-800">
                                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Error Details:</p>
                                      <p className="text-sm text-red-700 dark:text-red-300 font-mono break-all">
                                        {activeJob.errorMessage}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                    <p className="text-xs text-red-600 dark:text-red-400 mb-2">Troubleshooting:</p>
                                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                                      {(activeJob.stage === "research" || activeJob.stage?.startsWith("deep_research")) && (
                                        <>
                                          <li>Check Perplexity API key is valid and has credits</li>
                                          <li>Verify API model is supported (sonar-pro or sonar-reasoning-pro)</li>
                                          <li>Try simplifying the topic or keywords</li>
                                          {activeJob.stage?.startsWith("deep_research") && (
                                            <li>Deep Research uses multiple API calls - check for rate limiting</li>
                                          )}
                                        </>
                                      )}
                                      {activeJob.stage === "outline" && (
                                        <>
                                          <li>Research data may be incomplete</li>
                                          <li>Check Claude API key and credits</li>
                                          <li>Review guardrail rules for conflicts</li>
                                        </>
                                      )}
                                      {activeJob.stage === "draft" && (
                                        <>
                                          <li>Outline may have quality issues</li>
                                          <li>Check OpenAI API key and credits</li>
                                          <li>Try regenerating the outline first</li>
                                        </>
                                      )}
                                      {activeJob.errorMessage?.includes("regex") && (
                                        <li>Guardrail regex pattern error - check Guardrails Manager</li>
                                      )}
                                      {activeJob.errorMessage?.includes("API") && (
                                        <li>API connection issue - verify API keys in environment</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                                
                                {/* Checkpoint Status */}
                                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                  <p className="text-xs text-green-600 dark:text-green-400 mb-2 font-medium">Saved Checkpoints:</p>
                                  <div className="flex gap-2 flex-wrap mb-3">
                                    <Badge variant={activeJob.researchData ? "default" : "outline"} className="text-xs">
                                      {activeJob.researchData ? "✓" : "○"} Research
                                    </Badge>
                                    <Badge variant={activeJob.outlineData ? "default" : "outline"} className="text-xs">
                                      {activeJob.outlineData ? "✓" : "○"} Outline
                                    </Badge>
                                    <Badge variant={activeJob.finalContent ? "default" : "outline"} className="text-xs">
                                      {activeJob.finalContent ? "✓" : "○"} Draft
                                    </Badge>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {/* View Partial Content - for failed jobs that have draft/outline content */}
                                  {(activeJob.finalContent || activeJob.outlineData) && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        const parsed = parseFinalContent(activeJob);
                                        if (parsed) {
                                          setEditableContent({
                                            title: parsed.title || activeJob.title,
                                            excerpt: parsed.excerpt || "",
                                            content: parsed.content || "",
                                            tags: parsed.tags || activeJob.targetKeywords || [],
                                          });
                                        }
                                        setActiveTab("preview");
                                      }}
                                      data-testid="button-view-partial-content"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Partial Content
                                    </Button>
                                  )}
                                  
                                  {/* Smart Resume - Auto-detects best checkpoint */}
                                  {(() => {
                                    const hasCheckpoints = !!(activeJob.researchData || activeJob.outlineData || activeJob.finalContent);
                                    const resumeFromStage = activeJob.finalContent ? "finalizing" :
                                                           activeJob.outlineData ? "draft" :
                                                           activeJob.researchData ? "outline" :
                                                           undefined;
                                    const buttonLabel = resumeFromStage === "finalizing" ? "Resume from Finalizing" :
                                                        resumeFromStage === "draft" ? "Resume from Draft" :
                                                        resumeFromStage === "outline" ? "Resume from Outline" :
                                                        "Retry Job";
                                    return (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() => retryMutation.mutate({ jobId: activeJob.id, fromStage: resumeFromStage })}
                                          disabled={retryMutation.isPending}
                                          data-testid="button-retry-job"
                                        >
                                          {retryMutation.isPending ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          ) : (
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                          )}
                                          {buttonLabel}
                                        </Button>
                                        
                                        {/* Force restart from beginning - only show when there are actual checkpoints */}
                                        {hasCheckpoints && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => retryMutation.mutate({ jobId: activeJob.id, fromStage: "research" })}
                                            disabled={retryMutation.isPending}
                                            data-testid="button-restart-fresh"
                                          >
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            Start Fresh
                                          </Button>
                                        )}
                                      </>
                                    );
                                  })()}
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `Error Code: ERR_${activeJob.stage?.toUpperCase() || "UNKNOWN"}\n` +
                                        `Stage: ${activeJob.stage || "unknown"}\n` +
                                        `Message: ${activeJob.errorMessage || "No details"}\n` +
                                        `Job ID: ${activeJob.id}\n` +
                                        `Checkpoints: Research=${!!activeJob.researchData}, Outline=${!!activeJob.outlineData}, Draft=${!!activeJob.finalContent}\n` +
                                        `Time: ${new Date().toISOString()}`
                                      );
                                      toast({
                                        title: "Error details copied",
                                        description: "Error information copied to clipboard",
                                      });
                                    }}
                                    className="text-red-600 border-red-300 hover:bg-red-100 dark:hover:bg-red-900"
                                    data-testid="button-copy-error"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy Error
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeJob.status === "completed" && (
                          <div className="mt-4 flex gap-2">
                            <Button 
                              onClick={() => setActiveTab("preview")}
                              className="flex-1"
                              data-testid="button-view-preview"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View & Edit Content
                            </Button>
                          </div>
                        )}

                        {activeJob.totalTokensUsed > 0 && (
                          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Tokens: {activeJob.totalTokensUsed.toLocaleString()}</span>
                            {activeJob.estimatedCost && (
                              <span>Est. Cost: ${activeJob.estimatedCost}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Separator />

                    {activeJob.researchData && (
                      <Card>
                        <CardHeader 
                          className="cursor-pointer"
                          onClick={() => setExpandedSection(expandedSection === "research" ? null : "research")}
                        >
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Search className="h-4 w-4" />
                              Research Output
                            </CardTitle>
                            {expandedSection === "research" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedSection === "research" && (
                          <CardContent>
                            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-60">
                              {activeJob.researchData}
                            </pre>
                            {/* Citations Section */}
                            <div className="mt-4 pt-3 border-t">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <ExternalLink className="h-4 w-4 text-[#8E4F67]" />
                                Sources & Citations
                                {activeJob.citations && (() => {
                                  try {
                                    const parsed = JSON.parse(activeJob.citations);
                                    return <Badge variant="secondary" className="ml-2">{parsed.length}</Badge>;
                                  } catch { return null; }
                                })()}
                              </p>
                              {activeJob.citations ? (() => {
                                try {
                                  const citations = JSON.parse(activeJob.citations);
                                  if (!Array.isArray(citations) || citations.length === 0) {
                                    return <p className="text-xs text-muted-foreground">No citations found in research data</p>;
                                  }
                                  return (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {citations.map((c: { url: string; domain?: string; title?: string }, i: number) => (
                                        <a 
                                          key={i}
                                          href={c.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-[#8E4F67] hover:underline flex items-start gap-2 py-1 px-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                                          data-testid={`link-citation-${i}`}
                                        >
                                          <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                          <div className="min-w-0 flex-1">
                                            {c.title && (
                                              <span className="block font-medium text-foreground truncate">{c.title}</span>
                                            )}
                                            <span className="text-muted-foreground truncate block">{c.domain || new URL(c.url).hostname}</span>
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  );
                                } catch (e) {
                                  console.error("Failed to parse citations:", e, activeJob.citations);
                                  return <p className="text-xs text-red-500">Error parsing citations data</p>;
                                }
                              })() : (
                                <p className="text-xs text-muted-foreground">Citations will appear after research completes</p>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}

                    {activeJob.outlineData && (
                      <Card>
                        <CardHeader 
                          className="cursor-pointer"
                          onClick={() => setExpandedSection(expandedSection === "outline" ? null : "outline")}
                        >
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Outline
                            </CardTitle>
                            {expandedSection === "outline" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedSection === "outline" && (
                          <CardContent>
                            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-60">
                              {activeJob.outlineData}
                            </pre>
                          </CardContent>
                        )}
                      </Card>
                    )}

                    {/* Winston AI Scan Results */}
                    {parseGuardrailResults().some((r: any) => r.stage?.includes("winston") || r.type === "ai_detection") && (
                      <Card className="border-purple-200 dark:border-purple-800">
                        <CardHeader 
                          className="cursor-pointer bg-purple-50 dark:bg-purple-950"
                          onClick={() => setExpandedSection(expandedSection === "winston" ? null : "winston")}
                        >
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2 text-purple-800 dark:text-purple-200">
                              <Sparkles className="h-4 w-4" />
                              Winston AI Scan Results
                            </CardTitle>
                            {expandedSection === "winston" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedSection === "winston" && (
                          <CardContent className="pt-4">
                            <div className="space-y-4">
                              {parseGuardrailResults()
                                .filter((r: any) => r.stage?.includes("winston") || r.type === "ai_detection")
                                .map((result: any, i: number) => (
                                <div key={i} className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/50">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      {result.passed ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                      ) : (
                                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                                      )}
                                      <span className="font-medium capitalize">
                                        {result.stage?.replace(/_/g, " ") || "AI Detection Check"}
                                      </span>
                                    </div>
                                    <Badge variant={result.passed ? "default" : "secondary"}>
                                      {result.passed ? "Passed" : "Needs Review"}
                                    </Badge>
                                  </div>
                                  
                                  {/* Score Display */}
                                  <div className="grid grid-cols-2 gap-4 mb-3">
                                    {result.aiScore !== undefined && (
                                      <div className="p-3 rounded-lg bg-background border">
                                        <p className="text-xs text-muted-foreground mb-1">AI Detection Score</p>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-2xl font-bold ${
                                            result.aiScore < 30 ? "text-green-600" :
                                            result.aiScore < 50 ? "text-yellow-600" :
                                            "text-red-600"
                                          }`}>
                                            {result.aiScore}%
                                          </span>
                                          <Badge variant={
                                            result.aiScore < 30 ? "default" :
                                            result.aiScore < 50 ? "secondary" :
                                            "destructive"
                                          } className="text-xs">
                                            {result.aiScore < 30 ? "Good" : result.aiScore < 50 ? "Moderate" : "High"}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Target: &lt;30% for publishing
                                        </p>
                                      </div>
                                    )}
                                    {result.humanScore !== undefined && (
                                      <div className="p-3 rounded-lg bg-background border">
                                        <p className="text-xs text-muted-foreground mb-1">Human Score</p>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-2xl font-bold ${
                                            result.humanScore > 70 ? "text-green-600" :
                                            result.humanScore > 50 ? "text-yellow-600" :
                                            "text-red-600"
                                          }`}>
                                            {result.humanScore}%
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {result.creditsUsed && (
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Winston AI credits used: {result.creditsUsed.toLocaleString()}
                                    </p>
                                  )}
                                  
                                  {/* Violations/Flagged Content */}
                                  {result.violations && result.violations.length > 0 && (
                                    <div className="space-y-2 mt-3">
                                      <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Flagged Issues:</p>
                                      {result.violations.map((v: any, j: number) => (
                                        <div key={j} className="text-xs bg-background p-2 rounded border">
                                          <div className="flex items-center gap-2">
                                            <Badge variant={
                                              v.severity === "error" ? "destructive" : 
                                              v.severity === "warning" ? "secondary" : 
                                              "outline"
                                            } className="text-xs">
                                              {v.severity}
                                            </Badge>
                                            <span className="font-medium">{v.ruleName}</span>
                                          </div>
                                          <p className="mt-1 text-muted-foreground">{v.message}</p>
                                          {v.suggestedFix && (
                                            <p className="mt-1 text-purple-600 dark:text-purple-400 italic">
                                              Tip: {v.suggestedFix}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}

                    {/* Guardrail Validation Results */}
                    {parseGuardrailResults().filter((r: any) => !r.stage?.includes("winston") && r.type !== "ai_detection").length > 0 && (
                      <Card>
                        <CardHeader 
                          className="cursor-pointer"
                          onClick={() => setExpandedSection(expandedSection === "guardrails" ? null : "guardrails")}
                        >
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Guardrail Validation
                            </CardTitle>
                            {expandedSection === "guardrails" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedSection === "guardrails" && (
                          <CardContent>
                            <div className="space-y-3">
                              {parseGuardrailResults()
                                .filter((r: any) => !r.stage?.includes("winston") && r.type !== "ai_detection")
                                .map((result: { passed: boolean; stage: string; violations?: { severity: string; ruleName: string; message: string }[] }, i: number) => (
                                <div key={i} className="border rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    {result.passed ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    )}
                                    <span className="font-medium capitalize">{result.stage} Stage</span>
                                    <Badge variant={result.passed ? "default" : "destructive"}>
                                      {result.passed ? "Passed" : "Failed"}
                                    </Badge>
                                  </div>
                                  {result.violations && result.violations.length > 0 && (
                                    <div className="space-y-2 mt-2">
                                      {result.violations.slice(0, 5).map((v, j: number) => (
                                        <div key={j} className="text-xs bg-muted p-2 rounded">
                                          <div className="flex items-center gap-2">
                                            <Badge variant={
                                              v.severity === "error" ? "destructive" : 
                                              v.severity === "warning" ? "secondary" : 
                                              "outline"
                                            } className="text-xs">
                                              {v.severity}
                                            </Badge>
                                            <span className="font-medium">{v.ruleName}</span>
                                          </div>
                                          <p className="mt-1 text-muted-foreground">{v.message}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No active generation job</p>
                    <p className="text-sm">Start a new generation from the Generate tab</p>
                  </div>
                )}

                {/* Job History Log */}
                {jobs && jobs.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Generation Job History
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {jobs.length} jobs
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        All generation jobs are logged here for reference
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {[...jobs]
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((job) => (
                          <div 
                            key={job.id}
                            className={`flex items-center justify-between p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                              activeJob?.id === job.id 
                                ? "bg-primary/10 border-primary" 
                                : "bg-muted/30 hover:bg-muted/50"
                            }`}
                            onClick={() => {
                              setActiveJob(job);
                              if (job.status === "completed") {
                                const parsed = parseFinalContent(job);
                                if (parsed) {
                                  setEditableContent({
                                    title: parsed.title || job.title,
                                    excerpt: parsed.excerpt || "",
                                    content: parsed.content || "",
                                    tags: parsed.tags || job.targetKeywords || [],
                                  });
                                }
                              }
                            }}
                            data-testid={`job-history-item-${job.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">{job.title}</span>
                                <Badge 
                                  variant={
                                    job.status === "completed" ? "default" :
                                    job.status === "published" ? "secondary" :
                                    job.status === "failed" ? "destructive" :
                                    job.status === "in_progress" ? "outline" :
                                    "outline"
                                  }
                                  className="text-xs flex-shrink-0"
                                >
                                  {job.status === "in_progress" && (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  )}
                                  {job.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{new Date(job.createdAt).toLocaleString()}</span>
                                {job.stage && job.status !== "completed" && job.status !== "published" && (
                                  <span className="capitalize">Stage: {job.stage.replace(/_/g, " ")}</span>
                                )}
                                {job.totalTokensUsed > 0 && (
                                  <span>{job.totalTokensUsed.toLocaleString()} tokens</span>
                                )}
                              </div>
                              {job.errorMessage && (
                                <p className="text-xs text-red-500 mt-1 truncate">{job.errorMessage}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              {job.status === "completed" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveJob(job);
                                    const parsed = parseFinalContent(job);
                                    if (parsed) {
                                      setEditableContent({
                                        title: parsed.title || job.title,
                                        excerpt: parsed.excerpt || "",
                                        content: parsed.content || "",
                                        tags: parsed.tags || job.targetKeywords || [],
                                      });
                                    }
                                    setActiveTab("preview");
                                  }}
                                  data-testid={`button-view-job-${job.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status === "failed" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    retryMutation.mutate({ jobId: job.id });
                                  }}
                                  disabled={retryMutation.isPending}
                                  data-testid={`button-retry-job-${job.id}`}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Preview & Edit Tab */}
              <TabsContent value="preview" className="space-y-4">
                {(activeJob?.finalContent || (activeJob?.status === "completed" && parseFinalContent())) ? (
                  <>
                    {/* Status Banner for non-completed jobs */}
                    {activeJob?.status !== "completed" && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 mb-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Draft Preview - Job Status: {activeJob?.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          This content is still being processed. You can preview and edit it, but publishing requires the job to complete.
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {countWords(editableContent.content || parseFinalContent()?.content || "")} words
                        </Badge>
                        <Badge variant="outline">
                          {Math.ceil(countWords(editableContent.content || parseFinalContent()?.content || "") / 200)} min read
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!isEditing ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowFullPreview(true)}
                              data-testid="button-full-preview"
                            >
                              <Maximize2 className="h-4 w-4 mr-2" />
                              Full Preview
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleStartEditing}
                              data-testid="button-start-editing"
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Content
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowRegenerateDialog(true)}
                              data-testid="button-regenerate"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Regenerate
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowRejectDialog(true)}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                              data-testid="button-reject-request-changes"
                            >
                              <ThumbsDown className="h-4 w-4 mr-2" />
                              Reject & Request Changes
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleCancelEdits}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={handleSaveEdits}
                              data-testid="button-save-edits"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Title</Label>
                          {isEditing ? (
                            <Input
                              value={editableContent.title}
                              onChange={(e) => setEditableContent(prev => ({ ...prev, title: e.target.value }))}
                              className="mt-1"
                              data-testid="input-edit-title"
                            />
                          ) : (
                            <h2 className="text-xl font-bold mt-1">{editableContent.title || parseFinalContent()?.title}</h2>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Excerpt</Label>
                          {isEditing ? (
                            <Textarea
                              value={editableContent.excerpt}
                              onChange={(e) => setEditableContent(prev => ({ ...prev, excerpt: e.target.value }))}
                              className="mt-1"
                              rows={3}
                              data-testid="input-edit-excerpt"
                            />
                          ) : (
                            <p className="text-muted-foreground mt-1">{editableContent.excerpt || parseFinalContent()?.excerpt}</p>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Tags</Label>
                          {isEditing ? (
                            <Input
                              value={editableContent.tags.join(", ")}
                              onChange={(e) => setEditableContent(prev => ({ 
                                ...prev, 
                                tags: e.target.value.split(",").map(t => t.trim()).filter(t => t)
                              }))}
                              placeholder="Tag1, Tag2, Tag3"
                              className="mt-1"
                              data-testid="input-edit-tags"
                            />
                          ) : (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(editableContent.tags.length ? editableContent.tags : parseFinalContent()?.tags || []).map((tag: string, i: number) => (
                                <Badge key={i} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm">Content</CardTitle>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="font-semibold mb-1">Visual Component Syntax</p>
                                <ul className="text-xs space-y-1">
                                  <li><code>[KEY_TAKEAWAY_GRID]</code> - Grid of takeaways</li>
                                  <li><code>[CHART:bar:id]</code> - Bar/line/pie chart</li>
                                  <li><code>[SUCCESS_FACTORS]</code> - Success factors diagram</li>
                                  <li><code>[IMPLEMENTATION_TIMELINE]</code> - Timeline</li>
                                  <li><code>[STAT: value - label]</code> - Stat highlight</li>
                                  <li><code>**Key Takeaway:**</code> - Takeaway box</li>
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing && (
                              <div className="flex items-center border rounded-lg overflow-hidden">
                                <Button
                                  variant={editMode === "visual" ? "default" : "ghost"}
                                  size="sm"
                                  className="rounded-none h-8"
                                  onClick={() => setEditMode("visual")}
                                  data-testid="button-edit-mode-visual"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visual
                                </Button>
                                <Button
                                  variant={editMode === "source" ? "default" : "ghost"}
                                  size="sm"
                                  className="rounded-none h-8"
                                  onClick={() => setEditMode("source")}
                                  data-testid="button-edit-mode-source"
                                >
                                  <Code className="h-3 w-3 mr-1" />
                                  Source
                                </Button>
                              </div>
                            )}
                            {!isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(editableContent.content || parseFinalContent()?.content || "")}
                              >
                                {copied ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isEditing ? (
                          editMode === "source" ? (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Editing raw markdown. Use the Visual mode for rendered preview editing.
                              </p>
                              <Textarea
                                value={editableContent.content}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, content: e.target.value }))}
                                className="min-h-[400px] font-mono text-sm bg-muted/30"
                                data-testid="input-edit-content"
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Visual preview with section editing. Click a section heading to edit. For complex changes, use Source mode.
                              </p>
                              <div className="border rounded-lg p-4 min-h-[400px]">
                                {(() => {
                                  const content = editableContent.content || "";
                                  const sectionRegex = /^(## .+)$/gm;
                                  const matches = Array.from(content.matchAll(sectionRegex));
                                  
                                  if (matches.length === 0) {
                                    return (
                                      <div 
                                        className="relative group rounded-lg p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                                        onClick={() => {
                                          setEditingSection("full");
                                          setSectionContent(content);
                                        }}
                                      >
                                        {editingSection === "full" ? (
                                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                            <Textarea
                                              value={sectionContent}
                                              onChange={(e) => setSectionContent(e.target.value)}
                                              className="min-h-[300px] font-mono text-sm"
                                              autoFocus
                                            />
                                            <div className="flex gap-2">
                                              <Button size="sm" onClick={() => {
                                                setEditableContent(prev => ({ ...prev, content: sectionContent }));
                                                setEditingSection(null);
                                                setSectionContent("");
                                              }}>
                                                <Check className="h-3 w-3 mr-1" /> Apply
                                              </Button>
                                              <Button size="sm" variant="outline" onClick={() => { setEditingSection(null); setSectionContent(""); }}>
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown 
                                              remarkPlugins={[remarkGfm]}
                                              components={{
                                                a: ({href, children}) => {
                                                  const isExternal = href?.startsWith('http');
                                                  return (
                                                    <a 
                                                      href={href} 
                                                      target={isExternal ? '_blank' : undefined}
                                                      rel={isExternal ? 'nofollow noopener noreferrer' : undefined}
                                                    >
                                                      {children}
                                                    </a>
                                                  );
                                                },
                                              }}
                                            >
                                              {content}
                                            </ReactMarkdown>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  
                                  const sections: { title: string; start: number; end: number }[] = [];
                                  matches.forEach((match, i) => {
                                    const start = match.index!;
                                    const end = i < matches.length - 1 ? matches[i + 1].index! : content.length;
                                    sections.push({ title: match[1], start, end });
                                  });
                                  
                                  const preContent = matches[0].index! > 0 ? content.slice(0, matches[0].index!) : "";
                                  
                                  const preContentEnd = matches[0].index!;
                                  
                                  return (
                                    <>
                                      {preContent && (
                                        <div 
                                          className={`relative group rounded-lg p-3 mb-4 pb-4 border-b transition-colors ${
                                            editingSection === "preface" ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/30 cursor-pointer"
                                          }`}
                                          onClick={() => {
                                            if (editingSection !== "preface") {
                                              setEditingSection("preface");
                                              setSectionContent(preContent);
                                            }
                                          }}
                                        >
                                          {editingSection === "preface" ? (
                                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                              <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="secondary" className="text-xs">Introduction / Preface</Badge>
                                              </div>
                                              <Textarea
                                                value={sectionContent}
                                                onChange={(e) => setSectionContent(e.target.value)}
                                                className="min-h-[150px] font-mono text-sm"
                                                autoFocus
                                              />
                                              <div className="flex gap-2">
                                                <Button size="sm" onClick={() => {
                                                  const after = content.slice(preContentEnd);
                                                  setEditableContent(prev => ({ ...prev, content: sectionContent + after }));
                                                  setEditingSection(null);
                                                  setSectionContent("");
                                                }}>
                                                  <Check className="h-3 w-3 mr-1" /> Apply
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => { setEditingSection(null); setSectionContent(""); }}>
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex items-center justify-between mb-2">
                                                <Badge variant="secondary" className="text-xs">Introduction</Badge>
                                                <Badge variant="outline" className="opacity-0 group-hover:opacity-100 text-xs">
                                                  <Edit3 className="h-3 w-3 mr-1" /> Edit
                                                </Badge>
                                              </div>
                                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown 
                                                  remarkPlugins={[remarkGfm]}
                                                  components={{
                                                    a: ({href, children}) => {
                                                      const isExternal = href?.startsWith('http');
                                                      return (
                                                        <a 
                                                          href={href} 
                                                          target={isExternal ? '_blank' : undefined}
                                                          rel={isExternal ? 'nofollow noopener noreferrer' : undefined}
                                                        >
                                                          {children}
                                                        </a>
                                                      );
                                                    },
                                                  }}
                                                >
                                                  {preContent.slice(0, 300) + (preContent.length > 300 ? "..." : "")}
                                                </ReactMarkdown>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                      {sections.map((section, idx) => {
                                        const sectionKey = `section-${idx}`;
                                        const sectionText = content.slice(section.start, section.end);
                                        const isEditingThis = editingSection === sectionKey;
                                        
                                        return (
                                          <div 
                                            key={sectionKey}
                                            className={`relative group rounded-lg p-3 mb-2 transition-colors ${
                                              isEditingThis ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/30"
                                            }`}
                                          >
                                            <div 
                                              className="flex items-center gap-2 cursor-pointer"
                                              onClick={() => {
                                                if (!isEditingThis) {
                                                  setEditingSection(sectionKey);
                                                  setSectionContent(sectionText);
                                                }
                                              }}
                                            >
                                              <h3 className="text-lg font-bold text-[#12161D] dark:text-[#7FB8A3] flex-1">
                                                {section.title.replace("## ", "")}
                                              </h3>
                                              {!isEditingThis && (
                                                <Badge variant="outline" className="opacity-0 group-hover:opacity-100 text-xs">
                                                  <Edit3 className="h-3 w-3 mr-1" /> Edit
                                                </Badge>
                                              )}
                                            </div>
                                            {isEditingThis ? (
                                              <div className="space-y-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                                <Textarea
                                                  value={sectionContent}
                                                  onChange={(e) => setSectionContent(e.target.value)}
                                                  className="min-h-[200px] font-mono text-sm"
                                                  autoFocus
                                                />
                                                <div className="flex gap-2">
                                                  <Button size="sm" onClick={() => {
                                                    const before = content.slice(0, section.start);
                                                    const after = content.slice(section.end);
                                                    setEditableContent(prev => ({ ...prev, content: before + sectionContent + after }));
                                                    setEditingSection(null);
                                                    setSectionContent("");
                                                  }}>
                                                    <Check className="h-3 w-3 mr-1" /> Apply
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => { setEditingSection(null); setSectionContent(""); }}>
                                                    Cancel
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="prose prose-sm dark:prose-invert max-w-none mt-2 text-muted-foreground">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                  {sectionText.replace(section.title, "").trim().slice(0, 200) + (sectionText.length > 250 ? "..." : "")}
                                                </ReactMarkdown>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {editableContent.content || parseFinalContent()?.content || ""}
                            </ReactMarkdown>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => setActiveTab("publish")}
                        disabled={isEditing}
                        data-testid="button-proceed-to-publish"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Proceed to Publish
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No content to preview</p>
                    <p className="text-sm">Complete a generation to preview content</p>
                  </div>
                )}
              </TabsContent>

              {/* Publish Tab */}
              <TabsContent value="publish" className="space-y-4">
                {activeJob?.status === "completed" && parseFinalContent() ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ImageIcon className="h-5 w-5" />
                          Select Hero Image
                        </CardTitle>
                        <CardDescription>Choose an image for your blog post header</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-3">
                          {stockImages?.images.map((img, i) => (
                            <div 
                              key={i}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                selectedImage === img.url ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
                              }`}
                              onClick={() => setSelectedImage(img.url)}
                              data-testid={`image-option-${i}`}
                            >
                              <img 
                                src={img.url} 
                                alt={img.alt}
                                className="w-full h-24 object-cover"
                              />
                              {selectedImage === img.url && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <CheckCircle2 className="h-6 w-6 text-primary" />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                                <span className="text-xs text-white">{img.category}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Final Review</CardTitle>
                        <CardDescription>Review your content before publishing</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Title</Label>
                          <p className="font-semibold">{editableContent.title || parseFinalContent()?.title}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Excerpt</Label>
                          <p className="text-sm">{editableContent.excerpt || parseFinalContent()?.excerpt}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Word Count</Label>
                          <p className="text-sm">{countWords(editableContent.content || parseFinalContent()?.content || "")} words</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Tags</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(editableContent.tags.length ? editableContent.tags : parseFinalContent()?.tags || []).map((tag: string, i: number) => (
                              <Badge key={i} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        {selectedImage && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Selected Hero Image</Label>
                            <img 
                              src={selectedImage} 
                              alt="Selected hero" 
                              className="mt-2 w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!selectedImage || publishMutation.isPending}
                      onClick={handlePublish}
                      data-testid="button-publish"
                    >
                      {publishMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Publish to Blog
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Send className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Complete a generation to publish</p>
                    <p className="text-sm">The publish tab will be available when content is ready</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="border-t px-6 py-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Regenerate Content
            </DialogTitle>
            <DialogDescription>
              Provide feedback to improve the generated content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Improvement Feedback</Label>
              <Textarea
                placeholder="What would you like to improve? E.g., 'Make the introduction more compelling', 'Add more specific statistics', 'Focus more on ROI benefits'..."
                value={regenerateFeedback}
                onChange={(e) => setRegenerateFeedback(e.target.value)}
                className="mt-2 min-h-[100px]"
                data-testid="input-regenerate-feedback"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">What will be regenerated:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The final draft will be regenerated with your feedback</li>
                <li>Research and outline data will be preserved</li>
                <li>This may take 1-2 minutes</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (activeJob) {
                  regenerateMutation.mutate({
                    jobId: activeJob.id,
                    feedback: regenerateFeedback,
                    fromStage: "draft",
                  });
                }
              }}
              disabled={regenerateMutation.isPending || !regenerateFeedback.trim()}
              data-testid="button-confirm-regenerate"
            >
              {regenerateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate Draft
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject & Request Changes Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <ThumbsDown className="h-5 w-5" />
              Reject & Request Changes
            </DialogTitle>
            <DialogDescription>
              Identify issues with the current draft and request specific changes. This will regenerate the content with your feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Common Issues</Label>
              <div className="space-y-2">
                {REJECT_REASONS.map((reason) => (
                  <div key={reason.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={reason.id}
                      checked={rejectReasons.includes(reason.id)}
                      onCheckedChange={() => handleRejectReasonToggle(reason.id)}
                      data-testid={`checkbox-reject-${reason.id}`}
                    />
                    <label
                      htmlFor={reason.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {reason.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Required Changes</Label>
              <Textarea
                placeholder="Describe what must be fixed or changed. Be specific about what you need..."
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                className="mt-2 min-h-[100px]"
                data-testid="input-reject-feedback"
              />
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>This will regenerate the draft from scratch using your feedback. Research and outline will be preserved.</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectFeedback("");
              setRejectReasons([]);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleRejectAndRegenerate}
              disabled={regenerateMutation.isPending || (!rejectFeedback.trim() && rejectReasons.length === 0)}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-reject"
            >
              {regenerateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Regenerating...
                </>
              ) : (
                <>
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject & Regenerate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Blog Preview Dialog */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Maximize2 className="h-5 w-5" />
              Full Blog Preview
            </DialogTitle>
            <DialogDescription>
              Preview how this blog will appear on the live website
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6" data-testid="preview-scroll-container">
            <article className="py-6">
              {/* Mock Blog Header */}
              <header className="mb-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="secondary" className="bg-[#7FB8A3]/10 text-[#8E4F67] dark:text-[#7FB8A3]">
                    Blog Post
                  </Badge>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {editableContent.title || parseFinalContent()?.title || "Untitled"}
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  {editableContent.excerpt || parseFinalContent()?.excerpt || ""}
                </p>
                <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-border text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">1QG Editorial</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {Math.ceil(countWords(editableContent.content || parseFinalContent()?.content || "") / 200)} min read
                  </span>
                  <div className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    {(editableContent.tags.length ? editableContent.tags : parseFinalContent()?.tags || []).slice(0, 3).map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </header>

              {/* Blog Content with Visual Components */}
              <div className="prose prose-lg dark:prose-invert max-w-none
                prose-headings:text-foreground prose-headings:font-bold
                prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-[#12161D] dark:prose-h2:text-[#7FB8A3]
                prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-[#8E4F67] dark:prose-h3:text-[#7FB8A3]/80
                prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
                prose-li:text-muted-foreground prose-li:my-1
                prose-strong:text-foreground prose-strong:font-semibold
                prose-a:text-[#8E4F67] dark:prose-a:text-[#7FB8A3] prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-[#7FB8A3] prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
              >
                {(() => {
                  const rawContent = editableContent.content || parseFinalContent()?.content || "";
                  const processed = processMarkdownForPreview(rawContent);
                  
                  return (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({children}) => (
                          <h2 className="text-2xl font-bold mt-12 mb-6 text-[#12161D] dark:text-[#7FB8A3] flex items-center gap-3">
                            <span className="w-1 h-8 bg-gradient-to-b from-[#7FB8A3] to-[#8E4F67] rounded-full" />
                            {children}
                          </h2>
                        ),
                        h3: ({children}) => (
                          <h3 className="text-xl font-semibold mt-8 mb-4 text-[#8E4F67] dark:text-[#7FB8A3]/80 flex items-center gap-2">
                            <span className="w-0.5 h-6 bg-[#7FB8A3]/50 rounded-full" />
                            {children}
                          </h3>
                        ),
                        p: ({children}) => {
                          const childArray = Children.toArray(children);
                          
                          if (childArray.length > 0) {
                            const firstChild = childArray[0];
                            if (isValidElement(firstChild) && firstChild.type === 'strong') {
                              const strongText = String(firstChild.props.children);
                              if (strongText.toLowerCase().includes('key takeaway')) {
                                const restOfText = childArray.slice(1).map(c => 
                                  typeof c === 'string' ? c.replace(/^:\s*/, '').trim() : ''
                                ).join('').trim();
                                return <KeyTakeawayBox>{restOfText}</KeyTakeawayBox>;
                              }
                              if (strongText.toLowerCase().includes('impact')) {
                                const restOfText = childArray.slice(1).map(c => 
                                  typeof c === 'string' ? c.replace(/^:\s*/, '').trim() : ''
                                ).join('').trim();
                                return <ImpactBox>{restOfText}</ImpactBox>;
                              }
                            }
                          }
                          
                          const text = String(children).trim();
                          
                          const statMatch = text.match(/^\[STAT_(\d+)\]$/);
                          if (statMatch) {
                            const id = parseInt(statMatch[1]);
                            const stat = processed.stats[id];
                            if (stat) {
                              return <StatHighlight stat={stat.stat} label={stat.label} source={stat.source} />;
                            }
                          }
                          
                          const chartMatch = text.match(/^\[CHART_PLACEHOLDER_(\d+)\]$/);
                          if (chartMatch) {
                            const chartId = parseInt(chartMatch[1]);
                            const chart = processed.charts[chartId];
                            if (chart) {
                              return (
                                <FixableWrapper 
                                  target={{ type: "chart", id: chartId, label: "chart", rawMarker: processed.rawMarkers[`CHART_${chartId}`] }}
                                  onFixClick={handleOpenFixDialog}
                                >
                                  <BlogChart chart={chart} />
                                </FixableWrapper>
                              );
                            }
                          }
                          
                          if (text === '[HORIZON_TIMELINE_PLACEHOLDER]') {
                            if (processed.horizons.length > 0) {
                              return (
                                <FixableWrapper 
                                  target={{ type: "timeline", id: 0, label: "timeline", rawMarker: processed.rawMarkers[`HORIZON_TIMELINE_0`] }}
                                  onFixClick={handleOpenFixDialog}
                                >
                                  <HorizonTimeline horizons={processed.horizons} />
                                </FixableWrapper>
                              );
                            }
                            return null;
                          }
                          
                          const keyTakeawayGridMatch = text.match(/^\[KEY_TAKEAWAY_GRID_(\d+)\]$/);
                          if (keyTakeawayGridMatch) {
                            const id = parseInt(keyTakeawayGridMatch[1]);
                            const data = processed.keyTakeawayGrids[id];
                            if (data) {
                              return (
                                <FixableWrapper 
                                  target={{ type: "key_takeaway_grid", id, label: "key takeaways", rawMarker: processed.rawMarkers[`KEY_TAKEAWAY_GRID_${id}`] }}
                                  onFixClick={handleOpenFixDialog}
                                >
                                  <KeyTakeawayGrid takeaways={data.takeaways} />
                                </FixableWrapper>
                              );
                            }
                            return null;
                          }
                          
                          const fivePillarsMatch = text.match(/^\[FIVE_PILLARS_(\d+)\]$/);
                          if (fivePillarsMatch) {
                            const id = parseInt(fivePillarsMatch[1]);
                            const data = processed.fivePillars[id];
                            if (data) {
                              return (
                                <FixableWrapper 
                                  target={{ type: "five_pillars", id, label: "pillars diagram", rawMarker: processed.rawMarkers[`FIVE_PILLARS_${id}`] }}
                                  onFixClick={handleOpenFixDialog}
                                >
                                  <RadialPillarsChart title={data.title} pillars={data.pillars} />
                                </FixableWrapper>
                              );
                            }
                            return null;
                          }
                          
                          const successFactorsMatch = text.match(/^\[SUCCESS_FACTORS_(\d+)\]$/);
                          if (successFactorsMatch) {
                            const id = parseInt(successFactorsMatch[1]);
                            const data = processed.successFactors[id];
                            if (data) {
                              return (
                                <FixableWrapper 
                                  target={{ type: "success_factors", id, label: "success factors", rawMarker: processed.rawMarkers[`SUCCESS_FACTORS_${id}`] }}
                                  onFixClick={handleOpenFixDialog}
                                >
                                  <SuccessFactorsDiagram title={data.title} factors={data.factors} />
                                </FixableWrapper>
                              );
                            }
                            return null;
                          }
                          
                          const implTimelineMatch = text.match(/^\[IMPLEMENTATION_TIMELINE_(\d+)\]$/);
                          if (implTimelineMatch) {
                            const id = parseInt(implTimelineMatch[1]);
                            const data = processed.implementationTimelines[id];
                            if (data) {
                              return (
                                <FixableWrapper 
                                  target={{ type: "implementation_timeline", id, label: "implementation timeline", rawMarker: processed.rawMarkers[`IMPLEMENTATION_TIMELINE_${id}`] }}
                                  onFixClick={handleOpenFixDialog}
                                >
                                  <ImplementationTimeline phases={data.phases} />
                                </FixableWrapper>
                              );
                            }
                            return null;
                          }
                          
                          if (!text || text === '') return null;
                          
                          return <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>;
                        },
                        ul: ({children}) => (
                          <ul className="my-4 ml-6 list-disc space-y-2 marker:text-[#7FB8A3]">
                            {children}
                          </ul>
                        ),
                        ol: ({children}) => (
                          <ol className="my-4 ml-6 list-decimal space-y-2 marker:text-[#7FB8A3] marker:font-bold">
                            {children}
                          </ol>
                        ),
                        blockquote: ({children}) => (
                          <blockquote className="border-l-4 border-[#7FB8A3] bg-muted/30 py-3 px-4 rounded-r-lg my-6 italic">
                            {children}
                          </blockquote>
                        ),
                        a: ({href, children}) => {
                          const isExternal = href?.startsWith('http');
                          return (
                            <a 
                              href={href} 
                              className="text-[#8E4F67] dark:text-[#7FB8A3] hover:underline"
                              target={isExternal ? '_blank' : undefined}
                              rel={isExternal ? 'nofollow noopener noreferrer' : undefined}
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {processed.content}
                    </ReactMarkdown>
                  );
                })()}
              </div>

              {/* FAQ Section if exists */}
              {(() => {
                const rawContent = editableContent.content || parseFinalContent()?.content || "";
                const processed = processMarkdownForPreview(rawContent);
                if (processed.faqs.length > 0) {
                  return <FAQAccordion items={processed.faqs} />;
                }
                return null;
              })()}
            </article>
          </div>
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setShowFullPreview(false)}>
              Close Preview
            </Button>
            <Button onClick={() => {
              setShowFullPreview(false);
              setActiveTab("publish");
            }}>
              <Send className="h-4 w-4 mr-2" />
              Proceed to Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix Section Dialog */}
      <Dialog open={showFixDialog} onOpenChange={setShowFixDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Wrench className="h-5 w-5" />
              Fix {fixTarget?.label || "Component"}
            </DialogTitle>
            <DialogDescription>
              Describe the issue and the AI will regenerate this component.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">What's the issue?</Label>
              <RadioGroup value={fixIssueCategory} onValueChange={setFixIssueCategory}>
                {FIX_ISSUE_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={cat.id} id={`fix-${cat.id}`} />
                    <Label htmlFor={`fix-${cat.id}`} className="text-sm cursor-pointer">
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Additional Details (optional)</Label>
              <Textarea
                placeholder="Describe what's wrong or what you expect to see..."
                value={fixDescription}
                onChange={(e) => setFixDescription(e.target.value)}
                className="mt-2 min-h-[80px]"
                data-testid="input-fix-description"
              />
            </div>
            <div className="p-3 bg-[#7FB8A3]/10 dark:bg-[#1E2630] border border-[#7FB8A3] dark:border-[#12161D] rounded-lg">
              <p className="text-sm text-[#8E4F67] dark:text-[#7FB8A3] flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>This will regenerate just this component, not the entire blog. Quick fix!</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowFixDialog(false);
              setFixTarget(null);
              setFixIssueCategory("");
              setFixDescription("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitFix}
              disabled={fixSectionMutation.isPending || !fixIssueCategory}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-fix"
            >
              {fixSectionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Fix This
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
