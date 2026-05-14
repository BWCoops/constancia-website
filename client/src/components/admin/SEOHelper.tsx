import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Lightbulb,
  TrendingUp,
  Target,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  BarChart3,
  Link,
  Image,
  Clock,
  Heading2,
  Copy,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO_TRENDS_2025 } from "@shared/seo-trends";

interface SEOHelperProps {
  type: "blog" | "resource";
}

const BLOG_BEST_PRACTICES = [
  {
    icon: FileText,
    title: "Word Count",
    description: "Aim for 2,000+ words for comprehensive coverage",
    target: "2,000+ words"
  },
  {
    icon: Heading2,
    title: "Title Length",
    description: "Keep titles between 50-60 characters for optimal display",
    target: "50-60 characters"
  },
  {
    icon: Search,
    title: "Meta Description",
    description: "Write compelling excerpts of 150-160 characters",
    target: "150-160 characters"
  },
  {
    icon: BarChart3,
    title: "Headings Structure",
    description: "Use H2/H3 headings every 300-400 words",
    target: "1 heading per 300-400 words"
  },
  {
    icon: Image,
    title: "Visual Content",
    description: "Include at least 1 image per 500 words",
    target: "1 image per 500 words"
  },
  {
    icon: Link,
    title: "Internal & External Links",
    description: "Add 2-5 relevant internal and external links",
    target: "2-5 links minimum"
  },
  {
    icon: Clock,
    title: "Reading Time",
    description: "Optimal reading time is 8-15 minutes",
    target: "8-15 minutes"
  }
];

const RESOURCE_BEST_PRACTICES = [
  {
    icon: FileText,
    title: "Title Clarity",
    description: "Use descriptive titles that clearly explain what the resource offers",
    target: "Clear, benefit-focused titles"
  },
  {
    icon: Search,
    title: "Description Length",
    description: "Write detailed descriptions of 150-300 characters",
    target: "150-300 characters"
  },
  {
    icon: Target,
    title: "Keyword Integration",
    description: "Include 2-3 trending keywords in title and description",
    target: "2-3 keywords"
  },
  {
    icon: BarChart3,
    title: "Category Accuracy",
    description: "Ensure resources are correctly categorized for discoverability",
    target: "Accurate categorization"
  }
];

const QUICK_TIPS = {
  blog: [
    "Start with a compelling hook in the first paragraph",
    "Include a clear call-to-action at the end",
    "Use bullet points and numbered lists for readability",
    "Add internal links to related blog posts",
    "Include data, statistics, and expert quotes",
    "Optimize images with descriptive alt text",
    "End with a summary or key takeaways section",
    "Update older posts with fresh information regularly"
  ],
  resource: [
    "Use action-oriented titles (e.g., 'Complete Guide to...')",
    "Highlight the value proposition in the description",
    "Mention the file format and size upfront",
    "Include what users will learn or gain",
    "Tag resources with relevant categories",
    "Feature high-performing resources prominently",
    "Update resources periodically to keep them current",
    "Cross-link related resources in blog posts"
  ]
};

export function SEOHelper({ type }: SEOHelperProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedTrends, setCopiedTrends] = useState(false);
  const [copiedTips, setCopiedTips] = useState(false);

  const bestPractices = type === "blog" ? BLOG_BEST_PRACTICES : RESOURCE_BEST_PRACTICES;
  const quickTips = QUICK_TIPS[type];

  const handleCopyTrends = async () => {
    const text = `2025 SEO Market Trends:\n${SEO_TRENDS_2025.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
    await navigator.clipboard.writeText(text);
    setCopiedTrends(true);
    toast({
      title: "Copied!",
      description: "Market trends copied to clipboard",
    });
    setTimeout(() => setCopiedTrends(false), 2000);
  };

  const handleCopyTips = async () => {
    const header = type === "blog" ? "Blog SEO Best Practices" : "Resource SEO Best Practices";
    let text = `${header}:\n\n`;
    text += bestPractices.map(p => `- ${p.title}: ${p.description} (${p.target})`).join("\n");
    text += "\n\nQuick Tips:\n";
    text += quickTips.map((t, i) => `${i + 1}. ${t}`).join("\n");
    
    await navigator.clipboard.writeText(text);
    setCopiedTips(true);
    toast({
      title: "Copied!",
      description: "SEO tips copied to clipboard",
    });
    setTimeout(() => setCopiedTips(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="card-seo-helper">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">SEO Optimization Guide</CardTitle>
                  <CardDescription>
                    2025 market trends and best practices for {type === "blog" ? "blog content" : "resources"}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" data-testid="button-toggle-seo-helper">
                {isOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">2025 Market Trends</h4>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyTrends}
                  data-testid="button-copy-trends"
                >
                  {copiedTrends ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy Trends
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Include these trending topics in your content to improve SEO relevance. The weekly scan checks for these keywords.
              </p>
              <div className="flex flex-wrap gap-2">
                {SEO_TRENDS_2025.map((trend) => (
                  <Badge 
                    key={trend} 
                    variant="secondary" 
                    className="text-xs"
                    data-testid={`badge-trend-${trend.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {trend}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">
                    {type === "blog" ? "Blog" : "Resource"} SEO Best Practices
                  </h4>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyTips}
                  data-testid="button-copy-tips"
                >
                  {copiedTips ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy All Tips
                </Button>
              </div>
              
              <div className="grid gap-3 md:grid-cols-2">
                {bestPractices.map((practice) => (
                  <div 
                    key={practice.title}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                    data-testid={`tip-${practice.title.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary flex-shrink-0">
                      <practice.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{practice.title}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {practice.target}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {practice.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Quick Tips</h4>
              </div>
              <ScrollArea className="h-[180px] pr-4">
                <ul className="space-y-2">
                  {quickTips.map((tip, index) => (
                    <li 
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                      data-testid={`quick-tip-${index}`}
                    >
                      <span className="font-medium text-primary min-w-[20px]">{index + 1}.</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-sm text-amber-700 dark:text-amber-400">Weekly Scan Insight</h5>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    The automated weekly scan checks all {type === "blog" ? "blog posts" : "resources"} against these SEO trends 
                    and best practices. {type === "blog" ? "It also runs Winston AI plagiarism and AI detection." : ""} 
                    Results are emailed to admins with actionable recommendations.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default SEOHelper;
