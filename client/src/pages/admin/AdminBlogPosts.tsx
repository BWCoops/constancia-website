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
import { Progress } from "@/components/ui/progress";
import { 
  Loader2,
  ScanSearch,
  FileText,
  Calendar,
  User,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  X,
  Search,
  Copy,
  Check,
  Link,
  Image,
  FileType,
  ListChecks,
  Heading2,
  AlertCircle,
  CheckCircle2,
  Play,
  Settings,
  Timer,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  LayoutGrid,
  Target,
  Milestone,
  ExternalLink,
  BarChart3,
  Layers,
  Sparkles,
  Download,
  Upload,
  FileDown,
  FileUp
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { AIBlogGenerator } from "@/components/admin/AIBlogGenerator";
import { SEOHelper } from "@/components/admin/SEOHelper";

interface LatestScan {
  id: string;
  scanType: string;
  aiScore: number | null;
  humanScore: number | null;
  plagiarismScore: number | null;
  seoScore: number | null;
  seoRecommendations: string | null;
  status: string;
  errorMessage: string | null;
  creditsUsed: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string;
  author: string;
  publishedAt: string;
  featured: boolean;
  readingTime: string;
  isPublished: boolean;
  views: number;
  latestScan: LatestScan | null;
}

interface BlogPostDetail extends BlogPost {
  content: string;
  heroImage: string | null;
  tags: string[];
  authorImage: string | null;
  scans: LatestScan[];
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ScanProgress {
  scanId: string;
  totalPosts: number;
  scannedPosts: number;
  failedPosts: number;
  currentPostTitle: string | null;
  startedAt: string;
}

interface SchedulerStatus {
  enabled: boolean;
  interval: "disabled" | "weekly" | "monthly";
  isRunning: boolean;
  lastScanDate: string | null;
  nextScheduledScan: string | null;
  currentProgress: ScanProgress | null;
}

interface ScheduledScan {
  id: string;
  scanType: "monthly_full" | "manual_bulk";
  status: "pending" | "running" | "completed" | "failed";
  totalPosts: number | null;
  scannedPosts: number | null;
  failedPosts: number | null;
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

const blogPostFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().min(1, "Excerpt is required"),
  content: z.string().min(1, "Content is required"),
  heroImage: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  author: z.string().min(1, "Author is required"),
  authorImage: z.string().optional(),
  readingTime: z.string().min(1, "Reading time is required"),
  tags: z.string().optional(),
  featured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

type BlogPostFormData = z.infer<typeof blogPostFormSchema>;

function getScoreInfo(score: number | null): { variant: "default" | "secondary" | "destructive" | "outline"; className: string; icon: string } {
  if (score === null) {
    return { variant: "outline", className: "text-muted-foreground", icon: "-" };
  }
  if (score < 20) {
    return { variant: "default", className: "bg-emerald-600 hover:bg-emerald-600 text-white border-0", icon: "✓" };
  }
  if (score < 40) {
    return { variant: "default", className: "bg-green-500 hover:bg-green-500 text-white border-0", icon: "" };
  }
  if (score < 60) {
    return { variant: "default", className: "bg-yellow-500 hover:bg-yellow-500 text-white border-0", icon: "" };
  }
  if (score < 80) {
    return { variant: "default", className: "bg-orange-500 hover:bg-orange-500 text-white border-0", icon: "!" };
  }
  return { variant: "destructive", className: "bg-red-600 hover:bg-red-600 text-white border-0", icon: "!!" };
}

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  const { variant, className, icon } = getScoreInfo(score);
  
  return (
    <Badge 
      variant={variant} 
      className={`min-w-[70px] justify-center ${className}`}
      data-testid={`badge-${label.toLowerCase()}-score`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}: {score !== null ? `${score}%` : "N/A"}
    </Badge>
  );
}

interface SEOMetrics {
  wordCount: number;
  wordCountScore: number;
  titleLength: number;
  titleScore: number;
  excerptLength: number;
  excerptScore: number;
  headingCount: number;
  headingScore: number;
  imageCount: number;
  imageScore: number;
  linkCount: number;
  linkScore: number;
  readingTimeMinutes: number;
  readingTimeScore: number;
  overallScore: number;
}

interface SEOSuggestion {
  priority: "high" | "medium" | "low";
  message: string;
}

function calculateWordCount(content: string): number {
  const text = content.replace(/[#*_`~\[\]()!]/g, " ").trim();
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function calculateTitleScore(title: string): number {
  const length = title.length;
  if (length >= 50 && length <= 60) return 100;
  if (length >= 45 && length <= 65) return 80;
  if (length >= 40 && length <= 70) return 60;
  if (length >= 30 && length <= 80) return 40;
  return 20;
}

function calculateExcerptScore(excerpt: string): number {
  const length = excerpt.length;
  if (length >= 150 && length <= 160) return 100;
  if (length >= 140 && length <= 170) return 80;
  if (length >= 120 && length <= 200) return 60;
  if (length >= 80 && length <= 250) return 40;
  return 20;
}

function countHeadings(content: string): number {
  const h2Count = (content.match(/^##\s+.+$/gm) || []).length;
  const h3Count = (content.match(/^###\s+.+$/gm) || []).length;
  return h2Count + h3Count;
}

function calculateHeadingScore(headingCount: number, wordCount: number): number {
  if (wordCount < 500) return headingCount >= 1 ? 100 : 40;
  if (wordCount < 1000) {
    if (headingCount >= 3) return 100;
    if (headingCount >= 2) return 70;
    return headingCount >= 1 ? 40 : 20;
  }
  const expectedHeadings = Math.floor(wordCount / 300);
  const ratio = headingCount / expectedHeadings;
  if (ratio >= 0.8) return 100;
  if (ratio >= 0.5) return 70;
  if (ratio >= 0.3) return 40;
  return 20;
}

function countImages(content: string): number {
  const mdImages = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const htmlImages = (content.match(/<img\s+[^>]*>/gi) || []).length;
  return mdImages + htmlImages;
}

function calculateImageScore(imageCount: number, wordCount: number): number {
  if (wordCount < 500) return imageCount >= 1 ? 100 : 50;
  const expectedImages = Math.max(1, Math.floor(wordCount / 500));
  const ratio = imageCount / expectedImages;
  if (ratio >= 1) return 100;
  if (ratio >= 0.5) return 70;
  if (imageCount >= 1) return 50;
  return 20;
}

function countLinks(content: string): number {
  const mdLinks = (content.match(/\[.*?\]\(.*?\)/g) || []).filter(match => !match.startsWith("!")).length;
  const htmlLinks = (content.match(/<a\s+[^>]*href[^>]*>/gi) || []).length;
  return mdLinks + htmlLinks;
}

function calculateLinkScore(linkCount: number, wordCount: number): number {
  if (wordCount < 500) return linkCount >= 1 ? 100 : 50;
  const expectedLinks = Math.max(2, Math.floor(wordCount / 400));
  const ratio = linkCount / expectedLinks;
  if (ratio >= 1) return 100;
  if (ratio >= 0.5) return 70;
  if (linkCount >= 1) return 40;
  return 20;
}

function calculateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 200);
}

function calculateReadingTimeScore(minutes: number): number {
  if (minutes >= 8 && minutes <= 15) return 100;
  if (minutes >= 5 && minutes <= 20) return 80;
  if (minutes >= 3 && minutes <= 25) return 60;
  return 40;
}

function calculateWordCountScore(wordCount: number): number {
  if (wordCount >= 2000) return 100;
  if (wordCount >= 1500) return 80;
  if (wordCount >= 1000) return 60;
  if (wordCount >= 500) return 40;
  return 20;
}

function calculateSEOMetrics(title: string, excerpt: string, content: string): SEOMetrics {
  const wordCount = calculateWordCount(content);
  const wordCountScore = calculateWordCountScore(wordCount);
  
  const titleLength = title.length;
  const titleScore = calculateTitleScore(title);
  
  const excerptLength = excerpt.length;
  const excerptScore = calculateExcerptScore(excerpt);
  
  const headingCount = countHeadings(content);
  const headingScore = calculateHeadingScore(headingCount, wordCount);
  
  const imageCount = countImages(content);
  const imageScore = calculateImageScore(imageCount, wordCount);
  
  const linkCount = countLinks(content);
  const linkScore = calculateLinkScore(linkCount, wordCount);
  
  const readingTimeMinutes = calculateReadingTime(wordCount);
  const readingTimeScore = calculateReadingTimeScore(readingTimeMinutes);
  
  const weights = {
    wordCount: 0.25,
    title: 0.15,
    excerpt: 0.15,
    headings: 0.15,
    images: 0.10,
    links: 0.10,
    readingTime: 0.10
  };
  
  const overallScore = Math.round(
    wordCountScore * weights.wordCount +
    titleScore * weights.title +
    excerptScore * weights.excerpt +
    headingScore * weights.headings +
    imageScore * weights.images +
    linkScore * weights.links +
    readingTimeScore * weights.readingTime
  );
  
  return {
    wordCount,
    wordCountScore,
    titleLength,
    titleScore,
    excerptLength,
    excerptScore,
    headingCount,
    headingScore,
    imageCount,
    imageScore,
    linkCount,
    linkScore,
    readingTimeMinutes,
    readingTimeScore,
    overallScore
  };
}

function generateSEOSuggestions(metrics: SEOMetrics): SEOSuggestion[] {
  const suggestions: SEOSuggestion[] = [];
  
  if (metrics.wordCount < 2000) {
    const wordsNeeded = 2000 - metrics.wordCount;
    suggestions.push({
      priority: "high",
      message: `Add ${wordsNeeded.toLocaleString()} more words to reach the recommended 2,000-word minimum for optimal SEO performance.`
    });
  }
  
  if (metrics.titleLength < 50) {
    suggestions.push({
      priority: "high",
      message: `Expand your title by ${50 - metrics.titleLength} characters. Optimal title length is 50-60 characters for search results display.`
    });
  } else if (metrics.titleLength > 60) {
    suggestions.push({
      priority: "medium",
      message: `Shorten your title by ${metrics.titleLength - 60} characters. Titles over 60 characters may be truncated in search results.`
    });
  }
  
  if (metrics.excerptLength < 150) {
    suggestions.push({
      priority: "high",
      message: `Expand your excerpt/meta description by ${150 - metrics.excerptLength} characters. Optimal length is 150-160 characters.`
    });
  } else if (metrics.excerptLength > 160) {
    suggestions.push({
      priority: "medium",
      message: `Shorten your excerpt by ${metrics.excerptLength - 160} characters to avoid truncation in search results.`
    });
  }
  
  if (metrics.headingCount === 0) {
    suggestions.push({
      priority: "high",
      message: "Add H2 and H3 headings to structure your content. Use ## for H2 and ### for H3 in markdown. Aim for one heading every 300-400 words."
    });
  } else {
    const expectedHeadings = Math.max(3, Math.floor(metrics.wordCount / 350));
    if (metrics.headingCount < expectedHeadings) {
      suggestions.push({
        priority: "medium",
        message: `Add ${expectedHeadings - metrics.headingCount} more headings (H2/H3) to improve content structure and readability.`
      });
    }
  }
  
  if (metrics.imageCount === 0) {
    suggestions.push({
      priority: "high",
      message: "Add at least one relevant image to your content. Images improve engagement and can rank in image search results."
    });
  } else {
    const expectedImages = Math.max(2, Math.floor(metrics.wordCount / 500));
    if (metrics.imageCount < expectedImages) {
      suggestions.push({
        priority: "low",
        message: `Consider adding ${expectedImages - metrics.imageCount} more image(s) to break up the text and improve visual appeal.`
      });
    }
  }
  
  if (metrics.linkCount === 0) {
    suggestions.push({
      priority: "medium",
      message: "Add internal and external links to improve SEO and provide additional value to readers. Link to related blog posts and authoritative external sources."
    });
  } else if (metrics.linkCount < 3) {
    suggestions.push({
      priority: "low",
      message: `Add ${3 - metrics.linkCount} more links to related content. Internal linking helps distribute page authority and improves navigation.`
    });
  }
  
  if (metrics.readingTimeMinutes < 5) {
    suggestions.push({
      priority: "medium",
      message: "Your content is quite short. Articles with 8-15 minute read times typically perform better in search rankings."
    });
  }
  
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getSEOScoreInfo(score: number): { variant: "default" | "secondary" | "destructive" | "outline"; className: string; label: string } {
  if (score >= 80) {
    return { variant: "default", className: "bg-emerald-600 hover:bg-emerald-600 text-white border-0", label: "Excellent" };
  }
  if (score >= 50) {
    return { variant: "default", className: "bg-yellow-500 hover:bg-yellow-500 text-white border-0", label: "Moderate" };
  }
  if (score >= 30) {
    return { variant: "default", className: "bg-orange-500 hover:bg-orange-500 text-white border-0", label: "Needs Work" };
  }
  return { variant: "destructive", className: "bg-red-600 hover:bg-red-600 text-white border-0", label: "Poor" };
}

function SEOScoreBadge({ title, excerpt, content, seoScore }: { title: string; excerpt: string; content?: string; seoScore?: number | null }) {
  // Use database score if available
  if (seoScore !== null && seoScore !== undefined) {
    const { variant, className } = getSEOScoreInfo(seoScore);
    return (
      <Badge 
        variant={variant} 
        className={`min-w-[70px] justify-center ${className}`}
        data-testid="badge-seo-score"
      >
        SEO: {seoScore}%
      </Badge>
    );
  }

  // Fall back to calculating from content
  if (!content) {
    return (
      <Badge variant="outline" className="min-w-[70px] justify-center text-muted-foreground" data-testid="badge-seo-score">
        SEO: N/A
      </Badge>
    );
  }
  
  const metrics = calculateSEOMetrics(title, excerpt, content);
  const { variant, className } = getSEOScoreInfo(metrics.overallScore);
  
  return (
    <Badge 
      variant={variant} 
      className={`min-w-[70px] justify-center ${className}`}
      data-testid="badge-seo-score"
    >
      SEO: {metrics.overallScore}%
    </Badge>
  );
}

function SEOAnalysisSection({ title, excerpt, content, onCopySuggestions }: { 
  title: string; 
  excerpt: string; 
  content: string;
  onCopySuggestions: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const metrics = calculateSEOMetrics(title, excerpt, content);
  const suggestions = generateSEOSuggestions(metrics);
  const { label } = getSEOScoreInfo(metrics.overallScore);
  
  const getMetricColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-yellow-600";
    if (score >= 30) return "text-orange-500";
    return "text-red-600";
  };
  
  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-emerald-600";
    if (score >= 50) return "bg-yellow-500";
    if (score >= 30) return "bg-orange-500";
    return "bg-red-600";
  };
  
  const getPriorityBadge = (priority: "high" | "medium" | "low") => {
    const styles = {
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      low: "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#1E2630]/30 dark:text-[#7FB8A3]"
    };
    return styles[priority];
  };
  
  const generateCopyText = () => {
    let text = `SEO Optimization Instructions for: "${title}"\n`;
    text += `Current SEO Score: ${metrics.overallScore}% (${label})\n\n`;
    text += `CURRENT METRICS:\n`;
    text += `- Word Count: ${metrics.wordCount.toLocaleString()} words (Target: 2,000+)\n`;
    text += `- Title Length: ${metrics.titleLength} characters (Optimal: 50-60)\n`;
    text += `- Excerpt Length: ${metrics.excerptLength} characters (Optimal: 150-160)\n`;
    text += `- Headings (H2/H3): ${metrics.headingCount} found\n`;
    text += `- Images: ${metrics.imageCount} found\n`;
    text += `- Links: ${metrics.linkCount} found\n`;
    text += `- Reading Time: ~${metrics.readingTimeMinutes} minutes\n\n`;
    
    if (suggestions.length > 0) {
      text += `IMPROVEMENT SUGGESTIONS:\n\n`;
      suggestions.forEach((suggestion, index) => {
        text += `${index + 1}. [${suggestion.priority.toUpperCase()}] ${suggestion.message}\n\n`;
      });
    } else {
      text += `Great job! Your content meets all SEO best practices.\n`;
    }
    
    return text;
  };
  
  const handleCopy = async () => {
    const text = generateCopyText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onCopySuggestions(text);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const metricItems = [
    { 
      icon: FileType, 
      label: "Word Count", 
      value: `${metrics.wordCount.toLocaleString()} words`, 
      target: "Target: 2,000+",
      score: metrics.wordCountScore 
    },
    { 
      icon: Heading2, 
      label: "Title Length", 
      value: `${metrics.titleLength} chars`, 
      target: "Optimal: 50-60",
      score: metrics.titleScore 
    },
    { 
      icon: FileText, 
      label: "Excerpt Length", 
      value: `${metrics.excerptLength} chars`, 
      target: "Optimal: 150-160",
      score: metrics.excerptScore 
    },
    { 
      icon: ListChecks, 
      label: "Headings", 
      value: `${metrics.headingCount} H2/H3`, 
      target: "Use for structure",
      score: metrics.headingScore 
    },
    { 
      icon: Image, 
      label: "Images", 
      value: `${metrics.imageCount} found`, 
      target: "1 per 500 words",
      score: metrics.imageScore 
    },
    { 
      icon: Link, 
      label: "Links", 
      value: `${metrics.linkCount} found`, 
      target: "Internal + external",
      score: metrics.linkScore 
    },
    { 
      icon: Clock, 
      label: "Reading Time", 
      value: `~${metrics.readingTimeMinutes} min`, 
      target: "Optimal: 8-15 min",
      score: metrics.readingTimeScore 
    }
  ];
  
  return (
    <Card className="border-border/50" data-testid="card-seo-analysis">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          SEO Analysis
        </CardTitle>
        <CardDescription>
          Content optimization score and improvement suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall SEO Score</span>
            <span className={`text-2xl font-bold ${getMetricColor(metrics.overallScore)}`}>
              {metrics.overallScore}%
            </span>
          </div>
          <div className="relative">
            <Progress value={metrics.overallScore} className="h-3" />
            <div 
              className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(metrics.overallScore)}`}
              style={{ width: `${metrics.overallScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Poor</span>
            <span>Needs Work</span>
            <span>Moderate</span>
            <span>Excellent</span>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="text-sm font-medium mb-3">Individual Metrics</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metricItems.map((item) => (
              <div 
                key={item.label}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                data-testid={`metric-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`p-2 rounded-md ${getMetricColor(item.score)} bg-current/10`}>
                  <item.icon className={`h-4 w-4 ${getMetricColor(item.score)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    <span className={`text-sm font-semibold ${getMetricColor(item.score)}`}>
                      {item.score}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.value}</div>
                  <div className="text-xs text-muted-foreground/70">{item.target}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {suggestions.length > 0 && (
          <>
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Improvement Suggestions ({suggestions.length})
              </h4>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-2 text-sm"
                    data-testid={`suggestion-${index}`}
                  >
                    <Badge 
                      variant="secondary" 
                      className={`text-xs shrink-0 mt-0.5 ${getPriorityBadge(suggestion.priority)}`}
                    >
                      {suggestion.priority}
                    </Badge>
                    <span className="text-muted-foreground">{suggestion.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
        
        {suggestions.length === 0 && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Excellent! Your content meets all SEO best practices.</span>
            </div>
          </>
        )}
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleCopy}
          data-testid="button-copy-seo-suggestions"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied to Clipboard
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Optimization Instructions
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

const CONTENT_MARKERS = [
  {
    id: "key-takeaway",
    name: "Key Takeaway Grid",
    icon: Lightbulb,
    description: "Display a grid of key points with icons",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    syntax: `[KEY_TAKEAWAY_GRID]{
  "title": "Key Takeaways",
  "takeaways": [
    { "icon": "lightbulb", "title": "Point 1", "description": "Description here" },
    { "icon": "target", "title": "Point 2", "description": "Description here" }
  ]
}[/KEY_TAKEAWAY_GRID]`,
  },
  {
    id: "success-factors",
    name: "Success Factors",
    icon: Target,
    description: "Highlight critical success factors",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    syntax: `[SUCCESS_FACTORS]{
  "title": "Success Factors",
  "factors": [
    { "title": "Factor 1", "description": "Why it matters" },
    { "title": "Factor 2", "description": "Why it matters" }
  ]
}[/SUCCESS_FACTORS]`,
  },
  {
    id: "five-pillars",
    name: "Five Pillars",
    icon: Layers,
    description: "Display 5 interconnected pillars/principles",
    color: "text-[#7FB8A3]",
    bgColor: "bg-[#7FB8A3]/100/10",
    syntax: `[FIVE_PILLARS]{
  "title": "The Five Pillars",
  "pillars": [
    { "title": "Pillar 1", "description": "Details here" },
    { "title": "Pillar 2", "description": "Details here" }
  ]
}[/FIVE_PILLARS]`,
  },
  {
    id: "implementation-timeline",
    name: "Implementation Timeline",
    icon: Milestone,
    description: "Show phased implementation steps",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    syntax: `[IMPLEMENTATION_TIMELINE]{
  "title": "Implementation Phases",
  "phases": [
    { "phase": "Phase 1", "title": "Planning", "duration": "2 weeks", "tasks": ["Task 1", "Task 2"] },
    { "phase": "Phase 2", "title": "Execution", "duration": "4 weeks", "tasks": ["Task 1", "Task 2"] }
  ]
}[/IMPLEMENTATION_TIMELINE]`,
  },
  {
    id: "resource-link",
    name: "Resource Link",
    icon: ExternalLink,
    description: "Featured resource card with link",
    color: "text-[#7FB8A3]",
    bgColor: "bg-[#7FB8A3]/100/10",
    syntax: `[RESOURCE_LINK]{
  "title": "Related Resource",
  "description": "Download our comprehensive guide",
  "url": "https://example.com/resource.pdf",
  "type": "pdf"
}[/RESOURCE_LINK]`,
  },
  {
    id: "stat",
    name: "Statistic Highlight",
    icon: BarChart3,
    description: "Inline highlighted statistic",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    syntax: `[STAT: 85% - Companies seeing ROI improvement | Source: Industry Report 2024]`,
  },
  {
    id: "chart",
    name: "Data Chart",
    icon: LayoutGrid,
    description: "Interactive bar/line chart",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    syntax: `[CHART]{
  "type": "bar",
  "title": "Performance Metrics",
  "data": [
    { "label": "Q1", "value": 45 },
    { "label": "Q2", "value": 65 },
    { "label": "Q3", "value": 80 }
  ]
}[/CHART]`,
  },
];

function ContentMarkersHelper({ onInsert }: { onInsert: (marker: string, success: boolean) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (marker: typeof CONTENT_MARKERS[0]) => {
    let clipboardSuccess = false;
    
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(marker.syntax);
        clipboardSuccess = true;
        setCopiedId(marker.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      clipboardSuccess = false;
    }
    
    onInsert(marker.syntax, clipboardSuccess);
  };

  return (
    <div className="border rounded-lg bg-muted/30" data-testid="container-content-markers">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-lg"
        data-testid="button-toggle-markers"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium" data-testid="text-markers-title">Visual Content Markers</span>
          <Badge variant="secondary" className="text-xs" data-testid="badge-markers-count">
            {CONTENT_MARKERS.length} available
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2" data-testid="container-markers-list">
          <p className="text-xs text-muted-foreground mb-3" data-testid="text-markers-description">
            Click to copy a marker template, then paste it into your content. Customize the JSON data as needed.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {CONTENT_MARKERS.map((marker) => (
              <button
                key={marker.id}
                type="button"
                onClick={() => handleCopy(marker)}
                className={`flex items-start gap-3 p-3 rounded-md border text-left transition-all hover:border-primary/50 ${
                  copiedId === marker.id ? 'border-emerald-500 bg-emerald-500/10' : 'bg-background'
                }`}
                data-testid={`button-marker-${marker.id}`}
              >
                <div className={`p-2 rounded-md ${marker.bgColor} shrink-0`} data-testid={`icon-marker-${marker.id}`}>
                  <marker.icon className={`h-4 w-4 ${marker.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium" data-testid={`text-marker-name-${marker.id}`}>{marker.name}</span>
                    {copiedId === marker.id ? (
                      <Badge className="bg-emerald-500 text-white border-0 text-xs" data-testid={`badge-copied-${marker.id}`}>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </Badge>
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate" data-testid={`text-marker-desc-${marker.id}`}>{marker.description}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground" data-testid="text-markers-tip">
            <strong>Tip:</strong> Markers are parsed at render time. Ensure JSON is valid and properly formatted.
          </div>
        </div>
      )}
    </div>
  );
}

function BlogPostsContent() {
  const { toast } = useToast();
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostDetail | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const form = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      heroImage: "",
      categoryId: "",
      author: "",
      authorImage: "",
      readingTime: "5 min read",
      tags: "",
      featured: false,
      isPublished: true,
    },
  });

  const { data: posts, isLoading, error } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog-posts"],
  });

  const { data: postDetail, isLoading: detailLoading } = useQuery<BlogPostDetail>({
    queryKey: ["/api/admin/blog-posts", selectedPost],
    enabled: !!selectedPost,
  });

  const { data: categoriesData } = useQuery<{ success: boolean; data: BlogCategory[] }>({
    queryKey: ["/api/blog/categories"],
  });

  const categories = categoriesData?.data || [];

  const { data: schedulerStatus, isLoading: schedulerLoading } = useQuery<SchedulerStatus>({
    queryKey: ["/api/admin/scheduled-scans/status"],
    refetchInterval: (query) => {
      const data = query.state.data as SchedulerStatus | undefined;
      return data?.isRunning ? 5000 : false;
    },
  });

  const { data: scanHistory, isLoading: historyLoading } = useQuery<ScheduledScan[]>({
    queryKey: ["/api/admin/scheduled-scans"],
    refetchInterval: schedulerStatus?.isRunning ? 5000 : false,
  });

  const runScanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scheduled-scans/run-now", {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bulk Scan Started",
        description: "All published blog posts are being scanned for AI content.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-scans/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-scans"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Scan",
        description: error.message || "Could not start the bulk scan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const configureMutation = useMutation({
    mutationFn: async (config: { enabled?: boolean; interval?: string }) => {
      const res = await apiRequest("POST", "/api/admin/scheduled-scans/configure", config);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Scheduler settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-scans/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Settings",
        description: error.message || "Could not update scheduler settings.",
        variant: "destructive",
      });
    },
  });

  const cancelScanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scheduled-scans/cancel", {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Scan Cancellation Requested",
        description: "The current scan will be cancelled after the current post completes.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scheduled-scans/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Cancel Scan",
        description: error.message || "Could not cancel the running scan.",
        variant: "destructive",
      });
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest("POST", `/api/admin/blog-posts/${postId}/scan`, {
        scanType: "both",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Scan Initiated",
        description: "The content scan has been started. Results will appear shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      if (selectedPost) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts", selectedPost] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to initiate scan. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setScanningId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BlogPostFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        heroImage: data.heroImage || null,
        authorImage: data.authorImage || null,
      };
      const res = await apiRequest("POST", "/api/admin/blog-posts", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Created",
        description: "The blog post has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Create Failed",
        description: error.message || "Failed to create blog post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BlogPostFormData }) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        heroImage: data.heroImage || null,
        authorImage: data.authorImage || null,
      };
      const res = await apiRequest("PUT", `/api/admin/blog-posts/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Updated",
        description: "The blog post has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      if (selectedPost) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts", selectedPost] });
      }
      setIsFormOpen(false);
      setEditingPost(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update blog post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/blog-posts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Deleted",
        description: "The blog post has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      setSelectedPost(null);
      setDeletingPostId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete blog post. Please try again.",
        variant: "destructive",
      });
      setDeletingPostId(null);
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/blog-posts/${id}/visibility`, { isPublished });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.isPublished ? "Post Published" : "Post Hidden",
        description: variables.isPublished 
          ? "The blog post is now visible to the public." 
          : "The blog post has been hidden from the public.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      if (selectedPost) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts", selectedPost] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Visibility Update Failed",
        description: error.message || "Failed to update visibility. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScan = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScanningId(postId);
    scanMutation.mutate(postId);
  };

  const handleNewPost = () => {
    setEditingPost(null);
    form.reset({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      heroImage: "",
      categoryId: "",
      author: "",
      authorImage: "",
      readingTime: "5 min read",
      tags: "",
      featured: false,
      isPublished: true,
    });
    setIsFormOpen(true);
  };

  const handleEditPost = (post: BlogPostDetail) => {
    setEditingPost(post);
    form.reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      heroImage: post.heroImage || "",
      categoryId: post.categoryId,
      author: post.author,
      authorImage: post.authorImage || "",
      readingTime: post.readingTime,
      tags: post.tags.join(", "),
      featured: post.featured,
      isPublished: post.isPublished,
    });
    setSelectedPost(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: BlogPostFormData) => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
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
    setDeletingPostId(id);
  };

  const confirmDelete = () => {
    if (deletingPostId) {
      deleteMutation.mutate(deletingPostId);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleSelectPost = (postId: string, checked: boolean) => {
    const newSet = new Set(selectedPostIds);
    if (checked) {
      newSet.add(postId);
    } else {
      newSet.delete(postId);
    }
    setSelectedPostIds(newSet);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && posts) {
      setSelectedPostIds(new Set(posts.map(p => p.id)));
    } else {
      setSelectedPostIds(new Set());
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const body = selectedPostIds.size > 0 
        ? { ids: Array.from(selectedPostIds) } 
        : {};
      
      const res = await apiRequest("POST", "/api/admin/blog-posts/export", body);
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blog-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Exported ${data.postCount} posts and ${data.categoryCount} categories.`,
      });
      setSelectedPostIds(new Set());
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export blog posts.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      setIsImporting(true);
      const text = await importFile.text();
      const data = JSON.parse(text);
      
      if (!data.posts || !Array.isArray(data.posts)) {
        throw new Error("Invalid import file - missing posts array");
      }
      
      const res = await apiRequest("POST", "/api/admin/blog-posts/import", {
        posts: data.posts,
        categories: data.categories || [],
      });
      const result = await res.json();
      
      if (result.success) {
        toast({
          title: "Import Successful",
          description: result.message,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
        setIsImportDialogOpen(false);
        setImportFile(null);
      } else {
        throw new Error(result.error || "Import failed");
      }
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import blog posts.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2" data-testid="text-error-title">
          Unable to Load Blog Posts
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-4" data-testid="text-error">
          {errorMessage.includes("401") || errorMessage.includes("403") 
            ? "Your session may have expired. Please sign in again."
            : errorMessage.includes("500") 
            ? "Our server encountered an issue. Please try again in a few moments."
            : "Failed to load blog posts. Please check your connection and try again."}
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Blog Posts</h1>
          <p className="text-muted-foreground mt-1">
            Manage blog content and run Winston AI scans
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleExport} 
            variant="outline" 
            disabled={isExporting}
            data-testid="button-export"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {selectedPostIds.size > 0 ? `Export (${selectedPostIds.size})` : "Export All"}
          </Button>
          <Button 
            onClick={() => setIsImportDialogOpen(true)} 
            variant="outline"
            data-testid="button-import"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setIsAIGeneratorOpen(true)} variant="outline" data-testid="button-ai-generate">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generate
          </Button>
          <Button onClick={handleNewPost} data-testid="button-new-post">
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      <SEOHelper type="blog" />

      <Card data-testid="card-blog-posts">
        <CardHeader>
          <CardTitle>All Blog Posts</CardTitle>
          <CardDescription>
            Click on a row to view full details. Use the Scan button to check content authenticity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={posts && posts.length > 0 && selectedPostIds.size === posts.length}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      aria-label="Select all posts"
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SEO Score</TableHead>
                  <TableHead>AI Score</TableHead>
                  <TableHead>Plagiarism</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow 
                    key={post.id} 
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedPost(post.id)}
                    data-testid={`row-post-${post.id}`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedPostIds.has(post.id)}
                        onCheckedChange={(checked) => handleSelectPost(post.id, checked as boolean)}
                        aria-label={`Select ${post.title}`}
                        data-testid={`checkbox-select-${post.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate" data-testid={`text-post-title-${post.id}`}>
                      {post.title}
                      {post.featured && (
                        <Badge variant="outline" className="ml-2 text-xs">Featured</Badge>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-post-author-${post.id}`}>
                      {post.author}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-post-views-${post.id}`}>
                      {(post.views || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={post.isPublished ? "default" : "secondary"}
                        data-testid={`badge-status-${post.id}`}
                      >
                        {post.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SEOScoreBadge 
                        title={post.title} 
                        excerpt={post.excerpt}
                        seoScore={post.latestScan?.seoScore ?? null}
                      />
                    </TableCell>
                    <TableCell>
                      <ScoreBadge 
                        score={post.latestScan?.aiScore ?? null} 
                        label="AI"
                      />
                    </TableCell>
                    <TableCell>
                      <ScoreBadge 
                        score={post.latestScan?.plagiarismScore ?? null} 
                        label="Plag"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleVisibilityToggle(post.id, post.isPublished, e)}
                          disabled={visibilityMutation.isPending}
                          title={post.isPublished ? "Hide post" : "Publish post"}
                          data-testid={`button-visibility-${post.id}`}
                        >
                          {post.isPublished ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleScan(post.id, e)}
                          disabled={scanningId === post.id}
                          title="Scan content"
                          data-testid={`button-scan-${post.id}`}
                        >
                          {scanningId === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ScanSearch className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog open={deletingPostId === post.id} onOpenChange={(open) => !open && setDeletingPostId(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => handleDelete(post.id, e)}
                              title="Delete post"
                              data-testid={`button-delete-${post.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent data-testid="dialog-delete-confirm">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{post.title}"? This action cannot be undone.
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
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8" data-testid="text-no-posts">
              No blog posts found.
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-scheduled-scans">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Scheduled Scans
          </CardTitle>
          <CardDescription>
            Configure automatic AI content scanning for all blog posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {schedulerLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          ) : schedulerStatus ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1" data-testid="scheduler-last-scan">
                  <p className="text-sm text-muted-foreground">Last Scan</p>
                  <p className="font-medium">
                    {schedulerStatus.lastScanDate 
                      ? new Date(schedulerStatus.lastScanDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </p>
                </div>
                <div className="space-y-1" data-testid="scheduler-next-scan">
                  <p className="text-sm text-muted-foreground">Next Scheduled Scan</p>
                  <p className="font-medium">
                    {schedulerStatus.nextScheduledScan 
                      ? new Date(schedulerStatus.nextScheduledScan).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Not scheduled"}
                  </p>
                </div>
                <div className="space-y-2" data-testid="scheduler-interval">
                  <p className="text-sm text-muted-foreground">Scan Interval</p>
                  <Select
                    value={schedulerStatus.interval}
                    onValueChange={(value) => configureMutation.mutate({ interval: value })}
                    disabled={configureMutation.isPending}
                  >
                    <SelectTrigger className="w-full" data-testid="select-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2" data-testid="scheduler-toggle">
                  <p className="text-sm text-muted-foreground">Automatic Scanning</p>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedulerStatus.enabled}
                      onCheckedChange={(checked) => configureMutation.mutate({ enabled: checked })}
                      disabled={configureMutation.isPending}
                      data-testid="switch-scheduler-enabled"
                    />
                    <span className="text-sm">
                      {schedulerStatus.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              {schedulerStatus.isRunning && schedulerStatus.currentProgress && (
                <>
                  <Separator />
                  <div className="space-y-4" data-testid="scan-progress-section">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scan in Progress
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelScanMutation.mutate()}
                        disabled={cancelScanMutation.isPending}
                        data-testid="button-cancel-scan"
                      >
                        {cancelScanMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Cancel
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span data-testid="text-current-post">
                          Scanning: {schedulerStatus.currentProgress.currentPostTitle || "Preparing..."}
                        </span>
                        <span data-testid="text-scan-count">
                          {schedulerStatus.currentProgress.scannedPosts} / {schedulerStatus.currentProgress.totalPosts} posts
                        </span>
                      </div>
                      <Progress 
                        value={(schedulerStatus.currentProgress.scannedPosts / schedulerStatus.currentProgress.totalPosts) * 100} 
                        className="h-2"
                        data-testid="progress-scan"
                      />
                      {schedulerStatus.currentProgress.failedPosts > 0 && (
                        <p className="text-sm text-destructive" data-testid="text-failed-count">
                          {schedulerStatus.currentProgress.failedPosts} post(s) failed
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => runScanMutation.mutate()}
                  disabled={schedulerStatus.isRunning || runScanMutation.isPending}
                  data-testid="button-run-scan-now"
                >
                  {runScanMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Scan Now
                </Button>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Scan History</h4>
                {historyLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : scanHistory && scanHistory.length > 0 ? (
                  <Table data-testid="table-scan-history">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posts Scanned</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scanHistory.slice(0, 10).map((scan) => (
                        <TableRow key={scan.id} data-testid={`row-scan-${scan.id}`}>
                          <TableCell>
                            <Badge variant="outline" data-testid={`badge-type-${scan.id}`}>
                              {scan.scanType === "monthly_full" ? "Scheduled" : "Manual"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                scan.status === "completed" ? "default" :
                                scan.status === "running" ? "secondary" :
                                scan.status === "failed" ? "destructive" : "outline"
                              }
                              className={
                                scan.status === "completed" ? "bg-emerald-600 hover:bg-emerald-600 text-white" :
                                scan.status === "running" ? "bg-[#8E4F67] hover:bg-[#8E4F67] text-white" :
                                scan.status === "failed" ? "bg-red-600 hover:bg-red-600 text-white" : ""
                              }
                              data-testid={`badge-status-${scan.id}`}
                            >
                              {scan.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-scanned-${scan.id}`}>
                            {scan.scannedPosts ?? 0} / {scan.totalPosts ?? 0}
                          </TableCell>
                          <TableCell data-testid={`text-failed-${scan.id}`}>
                            {scan.failedPosts ?? 0}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm" data-testid={`text-started-${scan.id}`}>
                            {scan.startedAt 
                              ? new Date(scan.startedAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm" data-testid={`text-completed-${scan.id}`}>
                            {scan.completedAt 
                              ? new Date(scan.completedAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4" data-testid="text-no-scan-history">
                    No scan history available.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-4" data-testid="text-scheduler-error">
              Unable to load scheduler status.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]" data-testid="dialog-post-detail">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {postDetail?.title || "Loading..."}
            </DialogTitle>
            <DialogDescription>
              Blog post details and scan history
            </DialogDescription>
          </DialogHeader>
          
          {detailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : postDetail ? (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span data-testid="text-detail-author">{postDetail.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span data-testid="text-detail-date">
                      {new Date(postDetail.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span data-testid="text-detail-reading-time">{postDetail.readingTime}</span>
                  </div>
                  <Badge variant={postDetail.isPublished ? "default" : "secondary"}>
                    {postDetail.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {postDetail.tags.map((tag) => (
                    <Badge key={tag} variant="outline" data-testid={`badge-tag-${tag}`}>
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Excerpt</h4>
                  <p className="text-muted-foreground" data-testid="text-detail-excerpt">
                    {postDetail.excerpt}
                  </p>
                </div>

                <Separator />

                {(() => {
                  const latestCompletedScan = postDetail.scans?.find(
                    (scan) => scan.status === "completed" && (scan.aiScore !== null || scan.plagiarismScore !== null || scan.seoScore !== null)
                  );
                  if (!latestCompletedScan) return null;
                  
                  return (
                    <>
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Latest Scan Scores
                        </h4>
                        <Card className="p-4 bg-muted/50 border-muted">
                          <div className="flex flex-wrap items-center gap-3">
                            <ScoreBadge 
                              score={latestCompletedScan.aiScore ?? null} 
                              label="AI Detection"
                            />
                            <ScoreBadge 
                              score={latestCompletedScan.plagiarismScore ?? null} 
                              label="Plagiarism"
                            />
                            <ScoreBadge 
                              score={latestCompletedScan.seoScore ?? null} 
                              label="SEO"
                            />
                            {latestCompletedScan.completedAt && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(latestCompletedScan.completedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </Card>
                      </div>

                      <Separator />
                    </>
                  );
                })()}

                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Scan History
                  </h4>
                  {postDetail.scans && postDetail.scans.length > 0 ? (
                    <div className="space-y-3">
                      {postDetail.scans.map((scan, index) => (
                        <Card key={scan.id} className="p-4" data-testid={`card-scan-${index}`}>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" data-testid={`badge-scan-type-${index}`}>
                                  {scan.scanType === "ai_detection" ? "AI Detection" : 
                                   scan.scanType === "plagiarism" ? "Plagiarism" : "Both"}
                                </Badge>
                                {scan.status === "completed" ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0" data-testid={`badge-scan-status-${index}`}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                ) : scan.status === "failed" ? (
                                  <Badge variant="destructive" data-testid={`badge-scan-status-${index}`}>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" data-testid={`badge-scan-status-${index}`}>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Pending
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground" data-testid={`text-scan-date-${index}`}>
                                {new Date(scan.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              {scan.aiScore !== null && (
                                <ScoreBadge score={scan.aiScore} label="AI Content" />
                              )}
                              {scan.humanScore !== null && (
                                <div className="text-xs text-muted-foreground" data-testid={`text-human-score-${index}`}>
                                  Human: {scan.humanScore}%
                                </div>
                              )}
                              {scan.plagiarismScore !== null && (
                                <ScoreBadge score={scan.plagiarismScore} label="Plagiarism" />
                              )}
                              {scan.seoScore !== null && (
                                <ScoreBadge score={scan.seoScore} label="SEO" />
                              )}
                              {scan.creditsUsed !== null && scan.creditsUsed > 0 && (
                                <div className="text-xs text-muted-foreground" data-testid={`text-credits-${index}`}>
                                  Credits: {scan.creditsUsed}
                                </div>
                              )}
                            </div>
                            {scan.seoRecommendations && (
                              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2 border-l-2 border-amber-500">
                                <strong className="text-amber-600 dark:text-amber-400">SEO Tips:</strong> {
                                  (() => {
                                    try {
                                      const recs = JSON.parse(scan.seoRecommendations);
                                      return Array.isArray(recs) ? recs.slice(0, 2).join("; ") : String(recs).slice(0, 100);
                                    } catch {
                                      return String(scan.seoRecommendations).slice(0, 100);
                                    }
                                  })()
                                }
                              </div>
                            )}
                            {scan.status === "failed" && scan.errorMessage && (
                              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded" data-testid={`text-error-${index}`}>
                                {scan.errorMessage}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm" data-testid="text-no-scans">
                      No scans have been run for this post yet.
                    </p>
                  )}
                </div>

                <Separator />

                <SEOAnalysisSection 
                  title={postDetail.title}
                  excerpt={postDetail.excerpt}
                  content={postDetail.content}
                  onCopySuggestions={(text) => {
                    toast({
                      title: "Copied to Clipboard",
                      description: "SEO optimization instructions have been copied.",
                    });
                  }}
                />

                <div className="flex flex-wrap gap-2 pt-4">
                  <Button
                    onClick={() => handleEditPost(postDetail)}
                    data-testid="button-edit-post"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Post
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => postDetail && scanMutation.mutate(postDetail.id)}
                    disabled={scanMutation.isPending}
                    data-testid="button-run-scan"
                  >
                    {scanMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ScanSearch className="h-4 w-4 mr-2" />
                    )}
                    Run New Scan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => visibilityMutation.mutate({ 
                      id: postDetail.id, 
                      isPublished: !postDetail.isPublished 
                    })}
                    disabled={visibilityMutation.isPending}
                    data-testid="button-toggle-visibility"
                  >
                    {visibilityMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : postDetail.isPublished ? (
                      <EyeOff className="h-4 w-4 mr-2" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    {postDetail.isPublished ? "Hide" : "Publish"}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        if (!open) {
          setIsFormOpen(false);
          setEditingPost(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-post-form">
          <DialogHeader>
            <DialogTitle data-testid="text-form-title">
              {editingPost ? "Edit Blog Post" : "Create New Blog Post"}
            </DialogTitle>
            <DialogDescription>
              {editingPost ? "Update the blog post details below." : "Fill in the details to create a new blog post."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter post title"
                              onChange={(e) => {
                                field.onChange(e);
                                if (!editingPost && !form.getValues("slug")) {
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
                          <FormLabel>Slug *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="post-url-slug" data-testid="input-slug" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Excerpt *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Brief summary of the post"
                            rows={2}
                            data-testid="input-excerpt"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <ContentMarkersHelper 
                    onInsert={(syntax, success) => {
                      setTimeout(() => {
                        const currentContent = form.getValues("content") || "";
                        form.setValue("content", currentContent + "\n\n" + syntax + "\n");
                        toast({
                          title: success ? "Marker copied" : "Marker added",
                          description: success 
                            ? "The marker has been copied to clipboard and appended to your content."
                            : "The marker has been appended to your content. Clipboard access was unavailable.",
                        });
                      }, 0);
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Full blog post content (Markdown supported)"
                            rows={8}
                            data-testid="input-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="heroImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hero Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." data-testid="input-hero-image" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="author"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Author name" data-testid="input-author" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="authorImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." data-testid="input-author-image" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="readingTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reading Time *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="5 min read" data-testid="input-reading-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (comma-separated)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="AI, Finance, EPM" data-testid="input-tags" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-featured"
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Featured Post</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isPublished"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-published"
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Publish immediately</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingPost(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingPost ? "Update Post" : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AIBlogGenerator
        isOpen={isAIGeneratorOpen}
        onClose={() => setIsAIGeneratorOpen(false)}
        onPublishSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
          setIsAIGeneratorOpen(false);
        }}
      />

      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsImportDialogOpen(false);
          setImportFile(null);
        }
      }}>
        <DialogContent data-testid="dialog-import">
          <DialogHeader>
            <DialogTitle data-testid="text-import-title">Import Blog Posts</DialogTitle>
            <DialogDescription>
              Upload a JSON file exported from another environment to import blog posts.
              Posts with matching slugs will be skipped.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="hidden"
                id="import-file-input"
                data-testid="input-import-file"
              />
              <label
                htmlFor="import-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileUp className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {importFile ? importFile.name : "Click to select a JSON file"}
                </span>
              </label>
            </div>
            
            {importFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <FileDown className="h-4 w-4" />
                <span>Selected: {importFile.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setImportFile(null)}
                  className="ml-auto h-6 w-6 p-0"
                  data-testid="button-clear-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Security notes:</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Maximum 50 posts per import</li>
                <li>Maximum 500KB file size</li>
                <li>Script tags will be removed from content</li>
                <li>Existing posts (by slug) will be skipped</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
              }}
              data-testid="button-import-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              data-testid="button-import-confirm"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import Posts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminBlogPosts() {
  return (
    <AdminLayout>
      <BlogPostsContent />
    </AdminLayout>
  );
}
