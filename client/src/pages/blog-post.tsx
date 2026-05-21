import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo, Children, isValidElement, useEffect, useRef } from "react";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Calendar, Clock, Tag, ArrowLeft, Share2, Loader2, CheckCircle2, BarChart3 } from "lucide-react";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/seo-head";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BlogPost, BlogCategory } from "@shared/schema";
import {
  KeyTakeawayBox,
  KeyTakeawayGrid,
  FAQAccordion,
  StatHighlight,
  ComparisonTable,
  ComparisonTableHead,
  ComparisonTableHeader,
  ComparisonTableBody,
  ComparisonTableRow,
  ComparisonTableCell,
  ImpactBox,
  BlogChart,
  HorizonTimeline,
  TransformationTimeline,
  RadialPillarsChart,
  SuccessFactorsDiagram,
  ImplementationTimeline,
  ResourceDownload,
  ReferencesSection,
} from "@/components/blog-components";
import {
  parseFAQFromContent,
  parseChartsFromContent,
  parseTimelinesFromContent,
  parseReferencesFromContent,
  type ChartData,
  type HorizonData,
  type TimelinePhase,
  type ReferenceItem,
} from "@/lib/blog-utils";

interface KeyTakeawayGridData {
  takeaways: string[];
}

interface PillarData {
  title: string;
  pillars: { title: string; description: string; icon?: string }[];
}

interface SuccessFactorData {
  title: string;
  factors: { title: string; description: string; icon?: string }[];
}

interface ImplementationPhaseData {
  phases: { phase: number; title: string; timeframe: string; description: string }[];
}

interface ResourceLinkData {
  slug: string;
  label: string;
  description?: string;
}

interface ProcessedContent {
  content: string;
  faqs: { question: string; answer: string }[];
  stats: { stat: string; label: string; source?: string }[];
  charts: ChartData[];
  horizons: HorizonData[];
  timelines: TimelinePhase[];
  references: ReferenceItem[];
  keyTakeawayGrids: KeyTakeawayGridData[];
  fivePillars: PillarData[];
  successFactors: SuccessFactorData[];
  implementationTimelines: ImplementationPhaseData[];
  resourceLinks: ResourceLinkData[];
}

// Helper function to extract balanced JSON object from a string starting at position
function extractBalancedJson(content: string, startIndex: number): string | null {
  if (content[startIndex] !== '{') return null;
  
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          return content.slice(startIndex, i + 1);
        }
      }
    }
  }
  
  return null;
}

// Helper function to parse component markers with complex JSON
function parseComponentMarkers<T>(
  content: string,
  markerName: string,
  placeholderPrefix: string,
  results: T[]
): string {
  let processedContent = content;
  const openTag = `[${markerName}]`;
  const closeTag = `[/${markerName}]`;
  
  let searchStart = 0;
  while (true) {
    const markerStart = processedContent.indexOf(openTag, searchStart);
    if (markerStart === -1) break;
    
    const jsonStart = markerStart + openTag.length;
    // Skip any whitespace after the opening tag
    let jsonActualStart = jsonStart;
    while (jsonActualStart < processedContent.length && /\s/.test(processedContent[jsonActualStart])) {
      jsonActualStart++;
    }
    
    // Check if there's a JSON object following the marker
    if (processedContent[jsonActualStart] !== '{') {
      // This is a bare marker without JSON, skip it for now
      searchStart = markerStart + openTag.length;
      continue;
    }
    
    const jsonStr = extractBalancedJson(processedContent, jsonActualStart);
    if (!jsonStr) {
      searchStart = markerStart + openTag.length;
      continue;
    }
    
    // Find the end of the marker (including optional closing tag)
    let markerEnd = jsonActualStart + jsonStr.length;
    // Skip whitespace after JSON
    while (markerEnd < processedContent.length && /\s/.test(processedContent[markerEnd])) {
      markerEnd++;
    }
    // Check for closing tag
    if (processedContent.slice(markerEnd, markerEnd + closeTag.length) === closeTag) {
      markerEnd += closeTag.length;
    }
    
    try {
      const data = JSON.parse(jsonStr) as T;
      results.push(data);
      const placeholder = `\n[${placeholderPrefix}_${results.length - 1}]\n\n`;
      processedContent = processedContent.slice(0, markerStart) + placeholder + processedContent.slice(markerEnd);
      searchStart = markerStart + placeholder.length;
    } catch (e) {
      console.warn(`Failed to parse ${markerName} JSON:`, e);
      searchStart = markerStart + openTag.length;
    }
  }
  
  return processedContent;
}

function processMarkdownContent(rawContent: string): ProcessedContent {
  const { faqs, contentWithoutFAQ } = parseFAQFromContent(rawContent);
  const { references, contentWithoutReferences } = parseReferencesFromContent(contentWithoutFAQ);
  
  let processedContent = contentWithoutReferences.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const { charts, contentWithChartMarkers } = parseChartsFromContent(processedContent);
  processedContent = contentWithChartMarkers;
  
  const { horizons, timelines, contentWithTimelineMarkers } = parseTimelinesFromContent(processedContent);
  processedContent = contentWithTimelineMarkers;
  
  const statRegex = /\[STAT:\s*(\d+[%+]?[MBK]?|\£[\d,.]+[MBK]?)\s*-\s*(.*?)(?:\s*\|\s*Source:\s*(.*?))?\]/gi;
  const stats: { stat: string; label: string; source?: string }[] = [];
  
  let match;
  while ((match = statRegex.exec(processedContent)) !== null) {
    stats.push({
      stat: match[1],
      label: match[2].trim(),
      source: match[3]?.trim(),
    });
    processedContent = processedContent.replace(match[0], `[STAT_${stats.length - 1}]`);
  }
  
  // Use the balanced JSON parser for all component markers
  const keyTakeawayGrids: KeyTakeawayGridData[] = [];
  processedContent = parseComponentMarkers<KeyTakeawayGridData>(
    processedContent, 'KEY_TAKEAWAY_GRID', 'KEY_TAKEAWAY_GRID', keyTakeawayGrids
  );
  
  const fivePillars: PillarData[] = [];
  processedContent = parseComponentMarkers<PillarData>(
    processedContent, 'FIVE_PILLARS', 'FIVE_PILLARS', fivePillars
  );
  
  const successFactors: SuccessFactorData[] = [];
  processedContent = parseComponentMarkers<SuccessFactorData>(
    processedContent, 'SUCCESS_FACTORS', 'SUCCESS_FACTORS', successFactors
  );
  
  const implementationTimelines: ImplementationPhaseData[] = [];
  processedContent = parseComponentMarkers<ImplementationPhaseData>(
    processedContent, 'IMPLEMENTATION_TIMELINE', 'IMPLEMENTATION_TIMELINE', implementationTimelines
  );
  
  const resourceLinks: ResourceLinkData[] = [];
  processedContent = parseComponentMarkers<ResourceLinkData>(
    processedContent, 'RESOURCE_LINK', 'RESOURCE_LINK', resourceLinks
  );
  
  // Clean up any bare/legacy markers without JSON that weren't parsed
  // These are leftover markers from old content format
  processedContent = processedContent.replace(/\[SUCCESS_FACTORS\]\s*(?!\{)/g, '');
  processedContent = processedContent.replace(/\[\/SUCCESS_FACTORS\]/g, '');
  processedContent = processedContent.replace(/\[KEY_TAKEAWAY_GRID\]\s*(?!\{)/g, '');
  processedContent = processedContent.replace(/\[\/KEY_TAKEAWAY_GRID\]/g, '');
  processedContent = processedContent.replace(/\[FIVE_PILLARS\]\s*(?!\{)/g, '');
  processedContent = processedContent.replace(/\[\/FIVE_PILLARS\]/g, '');
  processedContent = processedContent.replace(/\[IMPLEMENTATION_TIMELINE\]\s*(?!\{)/g, '');
  processedContent = processedContent.replace(/\[\/IMPLEMENTATION_TIMELINE\]/g, '');
  processedContent = processedContent.replace(/\[RESOURCE_LINK\]\s*(?!\{)/g, '');
  processedContent = processedContent.replace(/\[\/RESOURCE_LINK\]/g, '');
  
  return {
    content: processedContent,
    faqs,
    stats,
    charts,
    horizons,
    timelines,
    references,
    keyTakeawayGrids,
    fivePillars,
    successFactors,
    implementationTimelines,
    resourceLinks,
  };
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const { flags } = useFeatureFlags();

  const { data: postData, isLoading } = useQuery<{ success: boolean; data: BlogPost }>({
    queryKey: ["/api/blog/posts", slug],
    enabled: !!slug,
  });

  const { data: categoriesData } = useQuery<{ success: boolean; data: BlogCategory[] }>({
    queryKey: ["/api/blog/categories"],
  });

  const { data: allPostsData } = useQuery<{ success: boolean; data: BlogPost[] }>({
    queryKey: ["/api/blog/posts"],
  });

  const post = postData?.data;
  const categories = categoriesData?.data || [];
  const allPosts = Array.isArray(allPostsData?.data) ? allPostsData.data : [];

  // Track blog post views (only once per session per post)
  const viewTrackedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (post?.id && viewTrackedRef.current !== post.id) {
      // Mark as tracked immediately to prevent duplicate calls
      viewTrackedRef.current = post.id;
      
      // Track the view
      fetch(`/api/blog/posts/${post.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => console.error('Failed to track blog view:', err));
    }
  }, [post?.id]);

  const processedContent = useMemo(() => {
    if (!post?.content) return { content: '', faqs: [], stats: [], charts: [], horizons: [], timelines: [], references: [], keyTakeawayGrids: [], fivePillars: [], successFactors: [], implementationTimelines: [], resourceLinks: [] };
    return processMarkdownContent(post.content);
  }, [post?.content]);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Uncategorised";
  };

  const relatedPosts = allPosts
    .filter(p => p.id !== post?.id && p.categoryId === post?.categoryId)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          {flags.blog && (
            <Link href="/blog">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  let tableRowIndex = 0;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={post.title}
        description={post.excerpt}
        keywords={post.tags}
        type="article"
        ogImage={post.heroImage}
        article={{
          author: post.author,
          publishedTime: post.publishedAt,
          section: getCategoryName(post.categoryId),
          tags: post.tags,
        }}
      />
      
      <main className="pt-16 sm:pt-20 pb-16">
        <article className="max-w-4xl mx-auto px-6">
          {flags.blog && (
            <Link href="/blog">
              <Button variant="ghost" className="mb-6" data-testid="button-back-to-blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          )}

          {post.heroImage && (
            <div 
              className="aspect-video overflow-hidden rounded-xl mb-8 shadow-xl"
            >
              <img 
                src={post.heroImage} 
                alt={post.title}
                loading="eager"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <header className="mb-8">
            <div 
              className="flex flex-wrap items-center gap-2 mb-4"
            >
              <Badge variant="secondary" className="bg-[#7FB8A3]/10 text-brand-teal dark:text-brand-cyan">
                {getCategoryName(post.categoryId)}
              </Badge>
              {post.featured && <Badge variant="outline">Featured</Badge>}
            </div>

            <h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4" 
              data-testid="text-post-title"
            >
              {post.title}
            </h1>

            <p 
              className="text-lg text-muted-foreground mb-6"
            >
              {post.excerpt}
            </p>

            <div 
              className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border"
            >
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{post.author}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {post.readingTime}
                </span>
              </div>
              <Button variant="outline" size="sm" data-testid="button-share">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </header>

          <div 
            className="prose prose-lg dark:prose-invert max-w-none mb-12 
              prose-headings:text-foreground prose-headings:font-bold
              prose-h1:text-3xl prose-h1:mt-10 prose-h1:mb-6 prose-h1:border-b prose-h1:border-border prose-h1:pb-4
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-[#12161D] dark:prose-h2:text-brand-cyan
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-brand-teal dark:prose-h3:text-brand-cyan/80
              prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
              prose-li:text-muted-foreground prose-li:my-1
              prose-ul:my-4 prose-ol:my-4
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-brand-teal dark:prose-a:text-brand-cyan prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-[#7FB8A3] prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8"
            data-testid="text-post-content"
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => (
                  <h1 className="text-3xl font-bold mt-10 mb-6 border-b border-border pb-4 text-foreground">
                    {children}
                  </h1>
                ),
                h2: ({children}) => {
                  const text = String(children).toLowerCase();
                  if (text.includes('frequently asked questions') || text.includes('faq')) {
                    return null;
                  }
                  return (
                    <h2 
                      className="text-xl sm:text-2xl font-bold mt-12 mb-6 text-[#12161D] dark:text-brand-cyan relative pl-5"
                    >
                      <span className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-[#7FB8A3] to-[#8E4F67]" />
                      {children}
                    </h2>
                  );
                },
                h3: ({children}) => (
                  <h3 
                    className="text-lg sm:text-xl font-semibold mt-8 mb-4 text-brand-teal dark:text-brand-cyan/80 border-l-2 border-[#7FB8A3]/50 pl-3"
                  >
                    {children}
                  </h3>
                ),
                h4: ({children}) => (
                  <h4 className="text-lg font-semibold mt-6 mb-3 text-foreground">{children}</h4>
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
                    const stat = processedContent.stats[id];
                    if (stat) {
                      return <StatHighlight stat={stat.stat} label={stat.label} source={stat.source} />;
                    }
                  }
                  
                  const chartMatch = text.match(/^\[CHART_PLACEHOLDER_(\d+)\]$/);
                  if (chartMatch) {
                    const chartId = parseInt(chartMatch[1]);
                    const chart = processedContent.charts[chartId];
                    if (chart) {
                      return <BlogChart chart={chart} />;
                    }
                  }
                  
                  if (text === '[HORIZON_TIMELINE_PLACEHOLDER]') {
                    if (processedContent.horizons.length > 0) {
                      return <HorizonTimeline horizons={processedContent.horizons} />;
                    }
                    return null;
                  }
                  
                  const keyTakeawayGridMatch = text.match(/^\[KEY_TAKEAWAY_GRID_(\d+)\]$/);
                  if (keyTakeawayGridMatch) {
                    const id = parseInt(keyTakeawayGridMatch[1]);
                    const data = processedContent.keyTakeawayGrids[id];
                    if (data) {
                      return <KeyTakeawayGrid takeaways={data.takeaways} />;
                    }
                    return null;
                  }
                  
                  const fivePillarsMatch = text.match(/^\[FIVE_PILLARS_(\d+)\]$/);
                  if (fivePillarsMatch) {
                    const id = parseInt(fivePillarsMatch[1]);
                    const data = processedContent.fivePillars[id];
                    if (data) {
                      return <RadialPillarsChart title={data.title} pillars={data.pillars} />;
                    }
                    return null;
                  }
                  
                  const successFactorsMatch = text.match(/^\[SUCCESS_FACTORS_(\d+)\]$/);
                  if (successFactorsMatch) {
                    const id = parseInt(successFactorsMatch[1]);
                    const data = processedContent.successFactors[id];
                    if (data) {
                      return <SuccessFactorsDiagram title={data.title} factors={data.factors} />;
                    }
                    return null;
                  }
                  
                  const implTimelineMatch = text.match(/^\[IMPLEMENTATION_TIMELINE_(\d+)\]$/);
                  if (implTimelineMatch) {
                    const id = parseInt(implTimelineMatch[1]);
                    const data = processedContent.implementationTimelines[id];
                    if (data) {
                      return <ImplementationTimeline phases={data.phases} />;
                    }
                    return null;
                  }
                  
                  const resourceLinkMatch = text.match(/^\[RESOURCE_LINK_(\d+)\]$/);
                  if (resourceLinkMatch) {
                    const id = parseInt(resourceLinkMatch[1]);
                    const data = processedContent.resourceLinks[id];
                    if (data) {
                      return <ResourceDownload slug={data.slug} label={data.label} description={data.description} />;
                    }
                    return null;
                  }
                  
                  if (!text || text === '') {
                    return null;
                  }
                  
                  return <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>;
                },
                ul: ({children}) => {
                  const items = Array.isArray(children) ? children : [children];
                  const validItems = items.filter(item => item != null);
                  return (
                    <div 
                      className="my-6 p-4 bg-gradient-to-br from-[#12161D]/5 via-transparent to-[#7FB8A3]/5 dark:from-[#12161D]/15 dark:to-[#7FB8A3]/10 border border-[#7FB8A3]/20 rounded-xl"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {validItems}
                      </div>
                    </div>
                  );
                },
                ol: ({children}) => {
                  const items = Array.isArray(children) ? children : [children];
                  const validItems = items.filter(item => item != null);
                  return (
                    <div 
                      className="my-6 p-4 bg-gradient-to-br from-[#12161D]/5 via-transparent to-[#7FB8A3]/5 dark:from-[#12161D]/15 dark:to-[#7FB8A3]/10 border border-[#7FB8A3]/20 rounded-xl"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {validItems}
                      </div>
                    </div>
                  );
                },
                li: ({children}) => (
                  <div className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-[#7FB8A3]/5 transition-colors group">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center mt-0.5 shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-foreground leading-relaxed flex-1">{children}</span>
                  </div>
                ),
                blockquote: ({children}) => (
                  <blockquote 
                    className="my-8 border-l-4 border-[#7FB8A3] bg-gradient-to-r from-[#7FB8A3]/5 to-transparent py-5 px-6 rounded-r-lg italic text-muted-foreground"
                  >
                    {children}
                  </blockquote>
                ),
                table: ({children}) => {
                  tableRowIndex = 0;
                  return (
                    <ComparisonTable>
                      {children}
                    </ComparisonTable>
                  );
                },
                thead: ({children}) => (
                  <ComparisonTableHead>{children}</ComparisonTableHead>
                ),
                th: ({children}) => (
                  <ComparisonTableHeader>{children}</ComparisonTableHeader>
                ),
                tbody: ({children}) => (
                  <ComparisonTableBody>{children}</ComparisonTableBody>
                ),
                tr: ({children}) => {
                  const currentIndex = tableRowIndex++;
                  return <ComparisonTableRow index={currentIndex}>{children}</ComparisonTableRow>;
                },
                td: ({children}) => (
                  <ComparisonTableCell>{children}</ComparisonTableCell>
                ),
                strong: ({children}) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                a: ({href, children}) => {
                  const isExternal = href?.startsWith('http');
                  return (
                    <a 
                      href={href} 
                      className="text-brand-teal dark:text-brand-cyan hover:text-brand-cyan font-medium cursor-pointer transition-colors"
                      style={{ textDecoration: 'underline', textDecorationColor: 'rgba(8, 132, 170, 0.6)', textUnderlineOffset: '3px' }}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'nofollow noopener noreferrer' : undefined}
                      data-testid="blog-citation-link"
                    >
                      {children}
                    </a>
                  );
                },
                hr: () => (
                  <div className="my-12 flex items-center gap-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#7FB8A3]/30 to-transparent" />
                    <div className="w-2 h-2 rounded-full bg-[#7FB8A3]/30" />
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#7FB8A3]/30 to-transparent" />
                  </div>
                ),
                code: ({className, children, ...props}) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-brand-teal dark:text-brand-cyan">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {processedContent.content}
            </ReactMarkdown>

            {processedContent.faqs.length > 0 && (
              <FAQAccordion items={processedContent.faqs} />
            )}

            {processedContent.references.length > 0 && (
              <ReferencesSection references={processedContent.references} />
            )}
          </div>

          <div 
            className="flex flex-wrap gap-2 mb-12 pt-6 border-t border-border"
          >
            {post.tags.map(tag => (
              <Badge key={tag} variant="outline" className="hover:bg-[#7FB8A3]/10 transition-colors">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>

          {relatedPosts.length > 0 && (
            <section 
              className="pt-8 border-t border-border"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-gradient-to-b from-[#7FB8A3] to-[#8E4F67] rounded-full" />
                Related Articles
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relPost, index) => (
                  <div
                    key={relPost.id}
                  >
                    <Card className="group hover-elevate h-full">
                      {relPost.heroImage && (
                        <div className="aspect-video overflow-hidden rounded-t-lg">
                          <img 
                            src={relPost.heroImage} 
                            alt={relPost.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base line-clamp-2 group-hover:text-brand-teal dark:group-hover:text-brand-cyan transition-colors">
                          <Link href={`/blog/${relPost.slug}`}>{relPost.title}</Link>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {relPost.excerpt}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.excerpt,
          "image": post.heroImage,
          "author": {
            "@type": "Person",
            "name": post.author
          },
          "publisher": {
            "@type": "Organization",
            "name": "Constancia",
            "logo": {
              "@type": "ImageObject",
              "url": "https://constancia.com/logo.png"
            }
          },
          "datePublished": post.publishedAt,
          "dateModified": post.publishedAt,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://constancia.com/blog/${post.slug}`
          }
        })
      }} />

      {processedContent.faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": processedContent.faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
        }} />
      )}

      <Footer />
    </div>
  );
}
