/**
 * Astral - Constancia AI Advisory Assistant
 * 
 * Professional slide-in panel chatbot interface with:
 * - Real-time processing visualization
 * - SSE streaming for progress updates
 * - Constancia brand styling
 * - Strict guardrails messaging
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Search, 
  Brain, 
  FileText,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  Download,
  Calendar,
  ArrowRight,
  Lightbulb,
  Shield,
  AlertCircle,
  Mail,
  RotateCcw,
  Globe,
  Database,
  BookOpen,
  CheckCircle2,
  Zap,
  FileSearch,
  Link2,
  Maximize2,
  Minimize2,
  Square,
  History,
  ExternalLink as PopOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { nanoid } from "nanoid";

/**
 * Parse inline markdown formatting (bold, italic, code, links)
 */
function parseInlineFormatting(text: string, keyPrefix: string): JSX.Element[] {
  const elements: JSX.Element[] = [];
  // Match bold, italic, inline code, and links
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  
  parts.forEach((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      elements.push(
        <strong key={`${keyPrefix}-bold-${idx}`} className="font-semibold text-[#7FB8A3] dark:text-[#C77A93]">
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      elements.push(
        <code key={`${keyPrefix}-code-${idx}`} className="px-1.5 py-0.5 rounded bg-[#C77A93]/10 text-[#7FB8A3] dark:text-[#C77A93] font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith('[') && part.includes('](')) {
      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a 
            key={`${keyPrefix}-link-${idx}`} 
            href={linkMatch[2]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#7FB8A3] dark:text-[#C77A93] underline underline-offset-2 hover:text-[#C77A93] transition-colors"
          >
            {linkMatch[1]}
          </a>
        );
      }
    } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      elements.push(
        <em key={`${keyPrefix}-italic-${idx}`} className="text-muted-foreground">{part.slice(1, -1)}</em>
      );
    } else if (part) {
      elements.push(<span key={`${keyPrefix}-text-${idx}`}>{part}</span>);
    }
  });
  
  return elements;
}

/**
 * Parse markdown table into structured data
 */
function parseTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  
  const headerLine = lines[0];
  const separatorLine = lines[1];
  
  // Check if it's a valid table (separator line has |---|)
  if (!separatorLine.includes('---')) return null;
  
  const parseRow = (line: string): string[] => {
    return line.split('|').map(cell => cell.trim()).filter(cell => cell);
  };
  
  const headers = parseRow(headerLine);
  const rows = lines.slice(2).map(parseRow).filter(row => row.length > 0);
  
  return { headers, rows };
}

/**
 * Enhanced markdown renderer with rich Constancia brand styling
 * Supports: tables, styled lists, headers, code blocks, blockquotes
 */
function renderMarkdown(text: string): JSX.Element[] {
  const elements: JSX.Element[] = [];
  const lines = text.split('\n');
  
  let currentList: { type: 'bullet' | 'number'; items: string[] } | null = null;
  let currentTable: string[] = [];
  let inTable = false;
  let listKey = 0;
  let tableKey = 0;
  
  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'bullet') {
        elements.push(
          <ul key={`list-${listKey}`} className="space-y-2 my-3">
            {currentList.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7FB8A3] dark:bg-[#C77A93] mt-2 flex-shrink-0" />
                <span className="leading-relaxed">{parseInlineFormatting(item, `li-${listKey}-${i}`)}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${listKey}`} className="space-y-2 my-3">
            {currentList.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="h-5 w-5 rounded-full bg-gradient-to-br from-[#12161D] to-[#7FB8A3] text-white text-xs flex items-center justify-center flex-shrink-0 font-medium">
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{parseInlineFormatting(item, `oli-${listKey}-${i}`)}</span>
              </li>
            ))}
          </ol>
        );
      }
      listKey++;
      currentList = null;
    }
  };
  
  const flushTable = () => {
    if (currentTable.length > 0) {
      const tableData = parseTable(currentTable);
      if (tableData) {
        elements.push(
          <div key={`table-${tableKey}`} className="my-2 sm:my-3 rounded-lg border border-[#7FB8A3]/20 overflow-x-auto -mx-1 sm:mx-0 touch-pan-x">
            <div className="text-[9px] sm:hidden text-muted-foreground px-2 py-1 bg-muted/30 flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" /><span>Swipe to view more</span><ChevronRight className="h-3 w-3" />
            </div>
            <table className="w-full text-[10px] sm:text-xs min-w-[400px] sm:min-w-[500px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#12161D] to-[#7FB8A3]">
                  {tableData.headers.map((header, i) => (
                    <th key={i} className={cn(
                      "px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-left font-semibold text-white whitespace-nowrap",
                      i === 0 ? "min-w-[80px] sm:min-w-[100px]" : "min-w-[60px] sm:min-w-[80px]"
                    )}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className={cn(
                      "border-t border-[#7FB8A3]/10",
                      rowIdx % 2 === 0 ? "bg-background" : "bg-[#C77A93]/5"
                    )}
                  >
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className={cn(
                        "px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-foreground align-top",
                        cellIdx === 0 ? "font-medium" : ""
                      )}>
                        <div className="leading-relaxed">
                          {parseInlineFormatting(cell, `cell-${tableKey}-${rowIdx}-${cellIdx}`)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableKey++;
      currentTable = [];
      inTable = false;
    }
  };
  
  lines.forEach((line, lineIdx) => {
    const trimmedLine = line.trim();
    
    // Check for table row (starts with |)
    if (trimmedLine.startsWith('|') || (inTable && trimmedLine.includes('|'))) {
      flushList();
      inTable = true;
      currentTable.push(trimmedLine);
      return;
    } else if (inTable) {
      flushTable();
    }
    
    // Empty line - flush list and add spacing
    if (!trimmedLine) {
      flushList();
      if (lineIdx > 0 && lineIdx < lines.length - 1) {
        elements.push(<div key={`space-${lineIdx}`} className="h-2" />);
      }
      return;
    }
    
    // Blockquote
    if (trimmedLine.startsWith('>')) {
      flushList();
      elements.push(
        <blockquote key={`quote-${lineIdx}`} className="border-l-3 border-[#7FB8A3] pl-3 my-3 py-2 bg-[#C77A93]/5 rounded-r-lg">
          <p className="text-sm text-muted-foreground italic">
            {parseInlineFormatting(trimmedLine.slice(1).trim(), `quote-${lineIdx}`)}
          </p>
        </blockquote>
      );
      return;
    }
    
    // Header with icon styling (## or ###)
    if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h3-${lineIdx}`} className="flex items-center gap-2 font-semibold text-sm mt-4 mb-2 text-foreground">
          <span className="h-1 w-4 bg-gradient-to-r from-[#7FB8A3] to-[#C77A93] rounded-full" />
          {parseInlineFormatting(trimmedLine.slice(4), `h3-${lineIdx}`)}
        </h4>
      );
      return;
    }
    
    if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h2-${lineIdx}`} className="flex items-center gap-2 font-bold text-base mt-4 mb-2 text-foreground">
          <span className="h-1.5 w-5 bg-gradient-to-r from-[#12161D] to-[#7FB8A3] rounded-full" />
          {parseInlineFormatting(trimmedLine.slice(3), `h2-${lineIdx}`)}
        </h3>
      );
      return;
    }
    
    // Key-value pairs (Key: Value format) - styled as mini cards
    const keyValueMatch = trimmedLine.match(/^([A-Za-z][A-Za-z\s&]+):\s*(.+)$/);
    if (keyValueMatch && !trimmedLine.includes('http')) {
      flushList();
      elements.push(
        <div key={`kv-${lineIdx}`} className="flex items-start gap-2 my-1.5 text-sm">
          <span className="font-medium text-[#7FB8A3] dark:text-[#C77A93] min-w-fit">{keyValueMatch[1]}:</span>
          <span className="text-foreground">{parseInlineFormatting(keyValueMatch[2], `kv-${lineIdx}`)}</span>
        </div>
      );
      return;
    }
    
    // Bullet list (- or • or *)
    const bulletMatch = trimmedLine.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bullet') {
        flushList();
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }
    
    // Numbered list (1. 2. 3.)
    const numberMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (numberMatch) {
      if (!currentList || currentList.type !== 'number') {
        flushList();
        currentList = { type: 'number', items: [] };
      }
      currentList.items.push(numberMatch[1]);
      return;
    }
    
    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${lineIdx}`} className="text-sm leading-relaxed text-foreground">
        {parseInlineFormatting(trimmedLine, `p-${lineIdx}`)}
      </p>
    );
  });
  
  flushList();
  flushTable();
  return elements;
}

/**
 * Get greeting based on time of day
 */
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  researchUsed?: boolean;
  sources?: string[];
  tier?: string;
  followUpSuggestions?: string[];
  feedback?: "positive" | "negative" | null;
  confidenceLevel?: "high" | "medium" | "low";
  createdAt: Date;
}

/**
 * Generate proactive insight based on assessment context
 */
function getProactiveInsight(context: AssessmentContext | null): { title: string; message: string } | null {
  if (!context?.dimensionScores) return null;
  
  const scores = context.dimensionScores;
  const entries = Object.entries(scores);
  if (entries.length === 0) return null;
  
  // Find the weakest dimension
  const sorted = entries.sort((a, b) => (a[1] as number) - (b[1] as number));
  const weakest = sorted[0];
  const weakestName = DIMENSION_LABELS[weakest[0]] || weakest[0];
  const weakestScore = (weakest[1] as number).toFixed(1);
  
  if ((weakest[1] as number) < 2.5) {
    return {
      title: "Priority Development Area",
      message: `Your ${weakestName} scored ${weakestScore}/5.0. This represents a significant opportunity for improvement. Would you like to explore strategies to uplift this capability?`
    };
  }
  
  if (context.overallScore && context.overallScore >= 3.5) {
    return {
      title: "Strong Foundation Identified",
      message: `With an overall maturity of ${context.overallScore.toFixed(1)}/5.0, you're well-positioned for EPM transformation. Let's explore how to move from good to best-in-class.`
    };
  }
  
  if (context.overallScore && context.overallScore < 2.5) {
    return {
      title: "Transformation Starting Point",
      message: `Based on your assessment, there are several foundational areas to address. I can help you prioritise quick wins and build a phased roadmap.`
    };
  }
  
  return {
    title: "Assessment Insights Ready",
    message: `I've analysed your ${entries.length}-dimension assessment. Ask me about specific dimensions, vendor recommendations, or your transformation roadmap.`
  };
}

interface ProcessingStage {
  stage: "researching" | "analyzing" | "synthesizing" | "complete" | "error";
  message: string;
  progress: number;
}

interface ChatbotWidgetProps {
  assessmentId?: string;
  contactId?: string;
  className?: string;
}

const STAGE_ICONS = {
  researching: Search,
  analyzing: Brain,
  synthesizing: FileText,
  complete: Sparkles,
  error: X,
} as const;

// Cycling icons for research phase to show activity
const RESEARCH_CYCLE_ICONS = [Search, Globe, Database, BookOpen, Brain] as const;
  
const STAGE_LABELS = {
  researching: "Researching",
  analyzing: "Analysing",
  synthesizing: "Compiling",
  complete: "Ready",
  error: "Error",
};

const PROACTIVE_PROMPTS = [
  "Need help understanding your EPM readiness?",
  "Have questions about your assessment results?",
  "Wondering which vendors might suit you best?",
  "Want guidance on your transformation journey?",
];

const DIMENSION_LABELS: Record<string, string> = {
  financial_planning_analysis: "Financial Planning & Analysis",
  organisation_people: "Organisation & People",
  data_analytics: "Data & Analytics",
  technology_systems: "Technology & Systems",
  financial_controls_compliance: "Financial Controls",
  management_reporting: "Management Reporting",
  consolidation_close: "Consolidation & Close",
  ai_machine_learning: "AI & Machine Learning",
};

interface AssessmentContext {
  overallScore?: number;
  dimensionScores?: Record<string, number>;
  strongestDimension?: string;
  weakestDimension?: string;
  industry?: string;
}

function getSmartSuggestions(context: AssessmentContext | null): string[] {
  const baseSuggestions = [
    "Compare EPM vendors for my needs",
    "What's the latest in AI for finance?",
  ];
  
  if (!context?.dimensionScores) {
    return [
      "What does my readiness score mean?",
      "Which EPM vendors should I consider?",
      ...baseSuggestions,
    ];
  }
  
  const suggestions: string[] = [];
  
  // Add contextual suggestion based on weakest dimension
  if (context.weakestDimension) {
    const dimLabel = DIMENSION_LABELS[context.weakestDimension] || context.weakestDimension;
    suggestions.push(`How do I improve my ${dimLabel}?`);
  }
  
  // Add suggestion based on overall score
  if (context.overallScore) {
    if (context.overallScore < 50) {
      suggestions.push("What quick wins can I achieve first?");
    } else if (context.overallScore >= 70) {
      suggestions.push("How do I get to best-in-class?");
    } else {
      suggestions.push("What should be my transformation priorities?");
    }
  }
  
  // Add vendor comparison suggestion
  suggestions.push("Which vendors suit my profile?");
  
  // Add tool suggestions
  suggestions.push("Show me the EPM comparison tool");
  
  return suggestions.slice(0, 4);
}

const STORAGE_KEY = 'fc-chatbot-session-token';
const HISTORY_KEY = 'fc-chatbot-token-history';

function getTokenHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addTokenToHistory(token: string): void {
  if (typeof window === 'undefined') return;
  const history = getTokenHistory();
  if (!history.includes(token)) {
    // Keep last 20 tokens
    const updated = [token, ...history].slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }
}

function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') return nanoid(16);
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    addTokenToHistory(stored);
    return stored;
  }
  
  const newToken = nanoid(16);
  localStorage.setItem(STORAGE_KEY, newToken);
  addTokenToHistory(newToken);
  return newToken;
}

interface ChatSession {
  id: string;
  sessionToken: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  assessmentId: string | null;
}

function getConfidenceLevel(tier?: string): "high" | "medium" | "low" {
  if (tier === 'deep_research') return 'high';
  if (tier === 'light_research') return 'medium';
  return 'low';
}

function shouldShowQuickActions(content: string): boolean {
  const keywords = ['vendor', 'epm', 'comparison', 'tool', 'onestream', 'anaplan', 'workday', 'oracle', 'pigment', 'workiva'];
  const lowerContent = content.toLowerCase();
  return keywords.some(keyword => lowerContent.includes(keyword));
}

function exportConversation(messages: Message[]): void {
  const lines = [
    'Astral Conversation Export',
    `Exported: ${new Date().toLocaleString()}`,
    '='.repeat(50),
    ''
  ];
  
  messages.forEach(msg => {
    const role = msg.role === 'user' ? 'You' : 'Astral';
    const time = msg.createdAt.toLocaleTimeString();
    lines.push(`[${time}] ${role}:`);
    lines.push(msg.content);
    lines.push('');
  });
  
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financecompass-chat-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ChatbotWidget({ assessmentId: propAssessmentId, contactId, className }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage | null>(null);
  const [cyclingIconIndex, setCyclingIconIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Array<{ stage: string; message: string; icon: typeof Search }>>([]);
  const [responseMode, setResponseMode] = useState<'detailed' | 'quick'>('detailed');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [windowSize, setWindowSize] = useState<'small' | 'medium' | 'large' | 'maximized'>('medium');
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef<number>(0);
  const resizeStartY = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showProactivePopup, setShowProactivePopup] = useState(false);
  const [proactivePrompt, setProactivePrompt] = useState("");
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [assessmentContext, setAssessmentContext] = useState<AssessmentContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [effectiveAssessmentId, setEffectiveAssessmentId] = useState<string | undefined>(propAssessmentId);
  const lastInitializedAssessmentId = useRef<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionToken = useRef(getOrCreateSessionToken());
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);

  // Auto-detect user's most recent completed assessment if none provided
  useEffect(() => {
    if (propAssessmentId) {
      setEffectiveAssessmentId(propAssessmentId);
      return;
    }
    
    const fetchUserAssessments = async () => {
      try {
        const response = await fetch('/api/finance-compass/public/my-assessments');
        const data = await response.json();
        if (data.success && data.data?.assessments) {
          const assessments = data.data.assessments;
          // Find most recent usable assessment - include in_progress for partial context
          // Prefer analysed/completed over in-progress, and full over pre-assessment
          const usableStatuses = ['analysed', 'report_generated', 'completed', 'processing', 'in_progress', 'paused'];
          const completed = assessments
            .filter((a: any) => usableStatuses.includes(a.status))
            .sort((a: any, b: any) => {
              // Prefer full assessments
              if (a.tier === 'full' && b.tier !== 'full') return -1;
              if (b.tier === 'full' && a.tier !== 'full') return 1;
              // Prefer analysed/completed over in_progress/processing
              const statusPriority = (s: string) => 
                s === 'analysed' || s === 'report_generated' ? 0 : 
                s === 'completed' ? 1 : 
                s === 'processing' ? 2 :
                s === 'in_progress' || s === 'paused' ? 3 : 4;
              const priorityDiff = statusPriority(a.status) - statusPriority(b.status);
              if (priorityDiff !== 0) return priorityDiff;
              // Then by date
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });
          
          if (completed.length > 0) {
            setEffectiveAssessmentId(completed[0].id);
          } else {
            // No completed assessments found - clear stale state
            setEffectiveAssessmentId(undefined);
          }
        } else {
          // Failed to fetch or no assessments - clear stale state
          setEffectiveAssessmentId(undefined);
        }
      } catch (error) {
        console.error('[Chatbot] Failed to fetch user assessments:', error);
        setEffectiveAssessmentId(undefined);
      }
    };
    
    fetchUserAssessments();
  }, [propAssessmentId]);

  // Fetch assessment context if we have an assessment ID
  useEffect(() => {
    if (!effectiveAssessmentId) return;
    
    const fetchContext = async () => {
      try {
        const response = await fetch(`/api/finance-compass/public/assessments/${effectiveAssessmentId}/results`);
        const data = await response.json();
        if (data.success && data.data?.assessment) {
          const assessment = data.data.assessment;
          const scores = assessment.dimensionScores || {};
          
          // Find weakest and strongest dimensions
          let weakest = '', strongest = '';
          let minScore = 100, maxScore = 0;
          for (const [dim, score] of Object.entries(scores)) {
            const numScore = score as number;
            if (numScore < minScore) { minScore = numScore; weakest = dim; }
            if (numScore > maxScore) { maxScore = numScore; strongest = dim; }
          }
          
          setAssessmentContext({
            overallScore: assessment.overallMaturityScore || assessment.epmReadinessScore,
            dimensionScores: scores,
            weakestDimension: weakest,
            strongestDimension: strongest,
            industry: data.data.assessment.industry,
          });
        }
      } catch (error) {
        console.error('[Chatbot] Failed to fetch assessment context:', error);
      }
    };
    
    fetchContext();
  }, [effectiveAssessmentId]);

  // Show proactive popup after delay (only once per session)
  useEffect(() => {
    if (popupDismissed || isOpen) return;
    
    const randomPrompt = PROACTIVE_PROMPTS[Math.floor(Math.random() * PROACTIVE_PROMPTS.length)];
    setProactivePrompt(randomPrompt);
    
    const timer = setTimeout(() => {
      if (!isOpen && !popupDismissed) {
        setShowProactivePopup(true);
      }
    }, 5000); // Show after 5 seconds
    
    return () => clearTimeout(timer);
  }, [isOpen, popupDismissed]);

  // Hide proactive popup when chat opens
  useEffect(() => {
    if (isOpen) {
      setShowProactivePopup(false);
    }
  }, [isOpen]);

  const dismissPopup = () => {
    setShowProactivePopup(false);
    setPopupDismissed(true);
  };

  // Initialize session on mount or when assessment changes
  useEffect(() => {
    // On first load, always initialize regardless of assessment ID
    const shouldInitialize = !isInitialized || 
      (isInitialized && lastInitializedAssessmentId.current !== effectiveAssessmentId);
    
    if (shouldInitialize) {
      // Reset UI state when assessment context changes (not on first load)
      if (isInitialized) {
        setMessages([]);
        setSessionId(null);
        setAssessmentContext(null);
      }
      lastInitializedAssessmentId.current = effectiveAssessmentId;
      initSession();
      setIsInitialized(true);
    }
  }, [effectiveAssessmentId, isInitialized]);

  // Cycle through research icons during active research phase
  useEffect(() => {
    if (processingStage?.stage === 'researching' || processingStage?.stage === 'analyzing') {
      const interval = setInterval(() => {
        setCyclingIconIndex(prev => (prev + 1) % RESEARCH_CYCLE_ICONS.length);
      }, 600); // Cycle every 600ms
      return () => clearInterval(interval);
    }
    setCyclingIconIndex(0);
  }, [processingStage?.stage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
      setHasNewMessages(false);
    }
  }, [isOpen]);

  // Keyboard shortcuts: Cmd/Ctrl+K to toggle, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle feedback on messages
  const handleFeedback = useCallback((messageId: string, feedback: "positive" | "negative") => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
  }, []);

  // Window size configurations - large sizes to display vendor comparison tables properly
  const windowSizeConfig = {
    small: { width: 'sm:w-[500px]', height: 'sm:h-[550px]' },
    medium: { width: 'sm:w-[650px]', height: 'sm:h-[700px]' },
    large: { width: 'sm:w-[800px]', height: 'sm:h-[800px]' },
    maximized: { width: 'sm:w-[95vw] sm:max-w-[1200px]', height: 'sm:h-[92vh]' },
  };

  // Pop-out chat to new window - larger to accommodate vendor tables
  const popOutChat = useCallback(() => {
    const width = 800;
    const height = 800;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popoutUrl = `/finance-compass/chat-popup${effectiveAssessmentId ? `?assessmentId=${effectiveAssessmentId}` : ''}`;
    
    window.open(
      popoutUrl,
      'AstralChat',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    setIsOpen(false);
  }, [effectiveAssessmentId]);

  // Cycle through window sizes
  const cycleWindowSize = useCallback(() => {
    const sizes: Array<'small' | 'medium' | 'large' | 'maximized'> = ['small', 'medium', 'large', 'maximized'];
    const currentIndex = sizes.indexOf(windowSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setWindowSize(sizes[nextIndex]);
    // Clear custom dimensions when cycling
    setCustomWidth(null);
    setCustomHeight(null);
  }, [windowSize]);

  // Drag-to-resize handlers
  // Use computed style or customWidth/customHeight to avoid getBoundingClientRect reflows.
  // These are already tracked in state, so no need to measure on every resize start.
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    resizeStartX.current = clientX;
    resizeStartY.current = clientY;
    
    // Use current state values instead of measuring via getBoundingClientRect
    // This avoids forced reflow on every resize start
    if (chatContainerRef.current) {
      const styles = window.getComputedStyle(chatContainerRef.current);
      resizeStartWidth.current = customWidth || parseInt(styles.width, 10);
      resizeStartHeight.current = customHeight || parseInt(styles.height, 10);
    }
  }, [customWidth, customHeight]);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      
      // Calculate delta (resizing from left edge of slide-in panel)
      const deltaX = resizeStartX.current - clientX;
      
      // Apply new width with constraints - allow wider for vendor tables
      const newWidth = Math.max(350, Math.min(900, resizeStartWidth.current + deltaX));
      
      setCustomWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing]);

  // Fetch chat history from previous sessions
  const fetchChatHistory = useCallback(async () => {
    try {
      const tokens = getTokenHistory();
      if (tokens.length === 0) {
        setChatHistory([]);
        return;
      }
      
      const response = await fetch("/api/finance-compass/public/chatbot/sessions/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Filter out sessions with no messages and sort by date
        const sessionsWithMessages = data.data
          .filter((s: ChatSession) => s.messageCount > 0)
          .sort((a: ChatSession, b: ChatSession) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        setChatHistory(sessionsWithMessages);
      }
    } catch (error) {
      console.error("[Chatbot] Failed to fetch chat history:", error);
    }
  }, []);

  // Switch to a previous chat session
  const switchToSession = useCallback(async (session: ChatSession) => {
    sessionToken.current = session.sessionToken;
    localStorage.setItem(STORAGE_KEY, session.sessionToken);
    setSessionId(session.id);
    setMessages([]);
    setShowHistory(false);
    
    // Load messages for this session
    try {
      const response = await fetch(`/api/finance-compass/public/chatbot/sessions/${session.id}/messages`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        })));
      }
    } catch (error) {
      console.error("[Chatbot] Failed to load session messages:", error);
    }
  }, []);

  // Restart chat - creates a fresh session while preserving history in database
  const restartChat = useCallback(async () => {
    // Generate new session token to get fresh session
    const newToken = nanoid(16);
    sessionToken.current = newToken;
    // Update localStorage so the new token persists
    localStorage.setItem(STORAGE_KEY, newToken);
    // Add to token history for later retrieval
    addTokenToHistory(newToken);
    setMessages([]);
    setSessionId(null);
    lastInitializedAssessmentId.current = undefined;
    
    // Re-initialize with new token
    try {
      const response = await fetch("/api/finance-compass/public/chatbot/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: sessionToken.current,
          assessmentId: effectiveAssessmentId,
          contactId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        lastInitializedAssessmentId.current = effectiveAssessmentId;
      }
    } catch (error) {
      console.error("[Chatbot] Failed to restart session:", error);
    }
  }, [effectiveAssessmentId, contactId]);

  const initSession = async () => {
    try {
      const response = await fetch("/api/finance-compass/public/chatbot/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: sessionToken.current,
          assessmentId: effectiveAssessmentId,
          contactId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        // Load any existing messages
        loadMessages(data.data.sessionId);
      }
    } catch (error) {
      console.error("[Chatbot] Failed to init session:", error);
    }
  };

  const loadMessages = async (sid: string) => {
    try {
      const response = await fetch(`/api/finance-compass/public/chatbot/sessions/${sid}/messages`);
      const data = await response.json();
      if (data.success) {
        const loadedMessages = data.data.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }));
        
        // If no messages exist and no assessment context, show a helpful intro
        if (loadedMessages.length === 0 && !assessmentContext?.overallScore) {
          const introMessage: Message = {
            id: nanoid(),
            role: "assistant",
            content: `Hello! I'm the FinanceCompass AI Assistant, here to help with your EPM and finance transformation questions.

${effectiveAssessmentId ? "I can see you have an assessment in progress. Once it's complete and analysed, I'll be able to provide personalised insights based on your results." : ""}

In the meantime, I can help you with:
• **EPM platform comparisons** – understand how vendors like OneStream, Anaplan, and Oracle EPM compare
• **Finance transformation best practices** – learn about successful approaches
• **Readiness considerations** – explore what to think about before selecting a platform

What would you like to know?`,
            createdAt: new Date(),
          };
          setMessages([introMessage]);
        } else {
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error("[Chatbot] Failed to load messages:", error);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: inputValue.trim(),
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setCompletedSteps([]);
    setProcessingStage({ stage: "researching", message: "Starting...", progress: 0 });

    try {
      const response = await fetch(
        `/api/finance-compass/public/chatbot/sessions/${sessionId}/messages/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: userMessage.content,
            responseMode: responseMode 
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No response body");

      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const sseMessages = buffer.split("\n\n");
        buffer = sseMessages.pop() || "";

        for (const sseMessage of sseMessages) {
          if (!sseMessage.trim()) continue; // Skip empty messages
          const lines = sseMessage.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "progress") {
                  const newStage = parsed.data.stage;
                  const newMessage = parsed.data.message;
                  
                  // Track completed steps as we progress through stages
                  setProcessingStage(prev => {
                    if (prev && prev.stage !== newStage) {
                      // Stage changed - add previous stage to completed steps
                      const stageIcon = STAGE_ICONS[prev.stage as keyof typeof STAGE_ICONS] || Search;
                      setCompletedSteps(steps => [...steps, {
                        stage: STAGE_LABELS[prev.stage as keyof typeof STAGE_LABELS] || prev.stage,
                        message: prev.message,
                        icon: stageIcon
                      }]);
                    }
                    return {
                      stage: newStage,
                      message: newMessage,
                      progress: parsed.data.progress,
                    };
                  });
                } else if (parsed.type === "response") {
                  const assistantMessage: Message = {
                    id: nanoid(),
                    role: "assistant",
                    content: parsed.data.message,
                    researchUsed: parsed.data.researchUsed,
                    sources: parsed.data.sources,
                    tier: parsed.data.tier,
                    followUpSuggestions: parsed.data.followUpSuggestions,
                    createdAt: new Date(),
                  };
                  setMessages(prev => [...prev, assistantMessage]);

                  if (!isOpen) {
                    setHasNewMessages(true);
                  }
                } else if (parsed.type === "error") {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                console.error("[Chatbot] SSE parse error:", e, "Data:", data.substring(0, 100));
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[Chatbot] Error sending message:", error);
      setMessages(prev => [...prev, {
        id: nanoid(),
        role: "assistant",
        content: "I apologise, but I encountered an issue processing your request. Please try again.",
        createdAt: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      setProcessingStage(null);
      setCompletedSteps([]);
    }
  }, [inputValue, sessionId, isLoading, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Proactive Notification Card - Mobile optimized */}
      {showProactivePopup && !isOpen && (
        <div 
          className="fixed bottom-20 sm:bottom-24 z-50 animate-in slide-in-from-right-4 fade-in duration-300 left-4 right-4 sm:left-auto sm:right-6"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-[#7FB8A3]/20 p-3 sm:p-4 max-w-full sm:max-w-[280px] sm:ml-auto">
            {/* Close button - touch-friendly */}
            <button
              onClick={dismissPopup}
              className="absolute -top-3 -right-3 h-8 w-8 sm:h-6 sm:w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors active:scale-95"
              data-testid="button-dismiss-popup"
            >
              <X className="h-4 w-4 sm:h-3 sm:w-3 text-slate-600 dark:text-slate-300" />
            </button>
            
            {/* Notification content */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#12161D] to-[#7FB8A3] flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-[#C77A93]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">
                  {proactivePrompt}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Astral is here to help.
                </p>
                <Button
                  onClick={() => setIsOpen(true)}
                  className="bg-gradient-to-r from-[#12161D] to-[#7FB8A3] hover:from-[#7FB8A3] hover:to-[#C77A93] text-white min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                  data-testid="button-popup-chat"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button - Clean circular icon */}
      <div
        className={cn(
          "fixed bottom-6 z-50 transition-all duration-300",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100",
          className
        )}
        style={{ right: '24px' }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg p-0",
            "bg-gradient-to-br from-[#12161D] to-[#7FB8A3] hover:from-[#7FB8A3] hover:to-[#C77A93]",
            "transition-all duration-300 hover:shadow-xl hover:scale-105"
          )}
          data-testid="button-open-chatbot"
          title="Ask Astral"
        >
          <div className="relative">
            <Sparkles className="h-6 w-6 text-white" />
            {hasNewMessages && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#C77A93] animate-pulse" />
            )}
          </div>
        </Button>
      </div>

      {/* Backdrop overlay for slide-in panel */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          data-testid="chatbot-backdrop"
        />
      )}

      {/* Slide-in Panel from Right Edge - Full screen on mobile */}
      <div
        ref={chatContainerRef}
        className={cn(
          "fixed top-0 right-0 z-50",
          "w-full h-[100dvh] sm:h-full",
          "sm:w-[400px] md:w-[450px] lg:w-[500px]",
          isOpen ? "translate-x-0" : "translate-x-full",
          isResizing ? "" : "transition-transform duration-300 ease-out",
          "safe-area-inset-top safe-area-inset-bottom"
        )}
        style={customWidth ? { width: `${customWidth}px` } : undefined}
      >
        {/* Resize handle - left edge for expanding width */}
        <div
          className="absolute top-1/2 -left-1 w-2 h-16 -translate-y-1/2 cursor-ew-resize z-10 hidden sm:flex items-center justify-center group"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          data-testid="resize-handle"
        >
          <div className="w-1 h-12 rounded-full bg-[#7FB8A3]/30 group-hover:bg-[#C77A93] transition-colors" />
        </div>
        
        <Card 
          className={cn(
            "flex flex-col h-full overflow-hidden border-l-2 border-[#7FB8A3]/20 shadow-2xl rounded-none",
            isResizing ? "" : "transition-all duration-300"
          )}
        >
          {/* Header - Touch-friendly with safe area */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-[#12161D] to-[#7FB8A3] pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-[#C77A93]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white text-sm">Astral</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setResponseMode(responseMode === 'detailed' ? 'quick' : 'detailed')}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full transition-all flex items-center gap-1",
                      responseMode === 'detailed' 
                        ? "bg-[#C77A93]/30 text-[#C77A93]"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                    data-testid="button-toggle-response-mode"
                    title={responseMode === 'detailed' ? 'Click for quick responses' : 'Click for detailed responses'}
                  >
                    {responseMode === 'detailed' ? (
                      <>
                        <FileSearch className="h-3 w-3" />
                        <span>Detailed</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3" />
                        <span>Quick</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {/* Primary actions - always visible, 44px touch targets on mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={restartChat}
                className="text-white/90 hover:text-white hover:bg-white/10 h-11 w-11 sm:h-9 sm:w-9"
                disabled={isLoading}
                data-testid="button-restart-chat"
                title="Start new conversation"
              >
                <RotateCcw className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
              
              {/* Secondary actions - hidden on mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) fetchChatHistory();
                }}
                className="text-white/90 hover:text-white hover:bg-white/10 h-9 w-9 hidden sm:flex"
                disabled={isLoading}
                data-testid="button-chat-history"
                title="View chat history"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => exportConversation(messages)}
                className="text-white/90 hover:text-white hover:bg-white/10 h-9 w-9 hidden sm:flex"
                disabled={messages.length === 0}
                data-testid="button-export-conversation"
                title="Export conversation"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {/* Desktop-only actions */}
              <div className="hidden md:flex items-center gap-1">
                <div className="h-5 w-px bg-white/20 mx-0.5" />
                <a 
                  href={`mailto:info@constancia.io?subject=FinanceCompass%20Enquiry${assessmentContext?.overallScore ? `%20-%20Score%3A%20${assessmentContext.overallScore.toFixed(1)}` : ''}&body=Hi%20Constancia%20Team%2C%0A%0AI%27ve%20been%20using%20FinanceCompass%20and%20would%20like%20to%20discuss%20my%20EPM%20requirements.%0A%0APlease%20contact%20me%20at%20your%20earliest%20convenience.%0A%0ABest%20regards`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/90 hover:text-white hover:bg-white/10 h-9 w-9"
                    data-testid="button-email-constancia"
                    title="Email Constancia"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={popOutChat}
                  className="text-white/90 hover:text-white hover:bg-white/10 h-9 w-9"
                  data-testid="button-popout-chat"
                  title="Open in new window"
                >
                  <PopOut className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Close button - always visible with proper touch target */}
              <div className="h-5 w-px bg-white/20 mx-0.5 hidden sm:block" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white/90 hover:text-white hover:bg-white/10 h-11 w-11 sm:h-9 sm:w-9"
                data-testid="button-close-chatbot"
                title="Close"
              >
                <X className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* Chat History Panel */}
          {showHistory && (
            <div className="flex-1 overflow-auto p-4 bg-background">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHistory(false)}
                    className="h-7 w-7"
                    data-testid="button-close-history"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-semibold text-sm">Chat History</h3>
                </div>
              </div>
              
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No previous conversations</p>
                  <p className="text-xs mt-1">Start chatting to build your history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatHistory.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => switchToSession(session)}
                      className={cn(
                        "w-full text-left p-3 sm:p-3 min-h-[56px] rounded-lg border transition-colors hover-elevate active:scale-[0.99]",
                        session.sessionToken === sessionToken.current
                          ? "border-[#7FB8A3] bg-[#7FB8A3]/5"
                          : "border-border hover:border-[#7FB8A3]/50"
                      )}
                      data-testid={`button-session-${session.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {session.title || `Conversation ${new Date(session.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {session.messageCount} messages
                          </p>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(session.createdAt).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Area - both scrollbars on main container, touch-optimized */}
          {!showHistory && (
          <div className="flex-1 overflow-auto p-2 sm:p-4 scrollbar-thin scrollbar-thumb-[#7FB8A3]/30 scrollbar-track-transparent hover:scrollbar-thumb-[#7FB8A3]/50 overscroll-contain touch-pan-y">
            {messages.length === 0 ? (
              <div className="text-center py-4 sm:py-6">
                <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-[#7FB8A3] mb-3 sm:mb-4 opacity-50" />
                <h4 className="font-medium text-foreground mb-2 text-sm sm:text-base">
                  {getTimeBasedGreeting()}! I'm your EPM Assistant
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-[280px] mx-auto">
                  Ask me about Enterprise Performance Management, your assessment results, or implementation guidance.
                </p>
                
                {/* Proactive Insight Panel */}
                {(() => {
                  const insight = getProactiveInsight(assessmentContext);
                  if (!insight) return null;
                  return (
                    <div className="mt-3 sm:mt-4 mx-1 sm:mx-2 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-[#C77A93]/10 to-[#7FB8A3]/10 border border-[#C77A93]/20">
                      <div className="flex items-start gap-2 sm:gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-[#C77A93]/20 flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="h-4 w-4 text-[#7FB8A3] dark:text-[#C77A93]" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[#7FB8A3] dark:text-[#C77A93] mb-0.5">
                            {insight.title}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                            {insight.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Quick action buttons - touch-friendly with min 44px height */}
                <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:flex-wrap justify-center gap-2">
                  {getSmartSuggestions(assessmentContext).map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputValue(suggestion);
                        textareaRef.current?.focus();
                      }}
                      className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm rounded-full bg-[#C77A93]/10 text-[#7FB8A3] dark:text-[#C77A93] hover-elevate active:scale-[0.98] transition-all text-left sm:text-center"
                      data-testid={`button-suggestion-${i}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {messages.map((message) => {
                  const confidenceLevel = message.role === "assistant" ? getConfidenceLevel(message.tier) : null;
                  const showActions = message.role === "assistant" && shouldShowQuickActions(message.content);
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex flex-col",
                        message.role === "user" ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[90%] sm:max-w-[85%] rounded-2xl px-2.5 sm:px-4 py-2 sm:py-2.5 min-w-0",
                          message.role === "user"
                            ? "bg-[#7FB8A3]/10 dark:bg-[#7FB8A3]/15 text-foreground border border-[#7FB8A3]/20 rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        )}
                      >
                        {/* Confidence Badge for assistant messages */}
                        {message.role === "assistant" && confidenceLevel && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                confidenceLevel === 'high' && "bg-green-500/10 text-green-600 dark:text-green-400",
                                confidenceLevel === 'medium' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                confidenceLevel === 'low' && "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                              )}
                              data-testid={`badge-confidence-${message.id}`}
                            >
                              {confidenceLevel === 'high' && <Shield className="h-2.5 w-2.5 mr-0.5" />}
                              {confidenceLevel === 'low' && <AlertCircle className="h-2.5 w-2.5 mr-0.5" />}
                              {confidenceLevel === 'high' ? 'High Confidence' : confidenceLevel === 'medium' ? 'Medium Confidence' : 'Basic Response'}
                            </Badge>
                          </div>
                        )}
                        
                        <div 
                          className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap overflow-hidden [&_table]:text-[10px] [&_table]:sm:text-xs [&_table]:w-full [&_table]:table-fixed [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_code]:break-all [&_ul]:list-disc [&_ul]:pl-3 [&_ul]:sm:pl-4 [&_ol]:list-decimal [&_ol]:pl-3 [&_ol]:sm:pl-4 [&_li]:my-0.5 [&_li]:sm:my-1 [&_p]:my-1.5 [&_p]:sm:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0"
                          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {renderMarkdown(message.content)}
                        </div>
                        {message.researchUsed && message.sources && message.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-[#7FB8A3]/20">
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedSources);
                                if (newExpanded.has(message.id)) {
                                  newExpanded.delete(message.id);
                                } else {
                                  newExpanded.add(message.id);
                                }
                                setExpandedSources(newExpanded);
                              }}
                              className="min-h-[44px] flex items-center gap-2 text-xs sm:text-sm text-[#7FB8A3] dark:text-[#C77A93] hover:underline py-2 -my-1 active:bg-[#7FB8A3]/5 rounded-md px-1 -mx-1 transition-colors"
                              data-testid={`button-toggle-sources-${message.id}`}
                            >
                              {expandedSources.has(message.id) ? (
                                <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              ) : (
                                <ChevronRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              )}
                              <FileSearch className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              <span>{message.sources.length} source{message.sources.length !== 1 ? 's' : ''} referenced</span>
                            </button>
                            
                            {expandedSources.has(message.id) && (
                              <div className="mt-2 space-y-2 sm:space-y-1.5 pl-2 sm:pl-4 border-l-2 border-[#7FB8A3]/20 animate-in fade-in slide-in-from-top-2 duration-200">
                                {message.sources.map((source, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2 p-2.5 sm:p-2 rounded-lg bg-[#7FB8A3]/5 text-xs"
                                  >
                                    <div className="h-6 w-6 sm:h-5 sm:w-5 rounded-full bg-[#7FB8A3]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Link2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-[#7FB8A3] dark:text-[#C77A93]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground text-xs sm:text-xs leading-relaxed">{source}</p>
                                      <p className="text-muted-foreground text-[10px] mt-0.5">
                                        {source.toLowerCase().includes('gartner') || source.toLowerCase().includes('forrester') || source.toLowerCase().includes('idc')
                                          ? 'Tier-1 Industry Analyst'
                                          : source.toLowerCase().includes('oracle') || source.toLowerCase().includes('sap') || source.toLowerCase().includes('workday')
                                          ? 'Vendor Documentation'
                                          : 'Industry Research'}
                                      </p>
                                    </div>
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 whitespace-nowrap"
                                    >
                                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                      Verified
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Quick Action Buttons */}
                        {showActions && (
                          <div className="mt-3 pt-2 border-t border-[#7FB8A3]/10">
                            <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
                            <div className="flex flex-wrap gap-1.5">
                              <Link href="/tools/epm-comparison">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 text-xs bg-[#C77A93]/10 hover:bg-[#C77A93]/20 text-[#7FB8A3] dark:text-[#C77A93]"
                                  data-testid={`button-action-comparison-${message.id}`}
                                >
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Open EPM Comparison Tool
                                </Button>
                              </Link>
                              <Link href="/contact">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 text-xs bg-[#C77A93]/10 hover:bg-[#C77A93]/20 text-[#7FB8A3] dark:text-[#C77A93]"
                                  data-testid={`button-action-consultation-${message.id}`}
                                >
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Book a Consultation
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                        
                        {message.role === "assistant" && message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
                          <div className="mt-2 sm:mt-3 pt-2 border-t border-[#7FB8A3]/10">
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">Continue exploring:</p>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-2">
                              {message.followUpSuggestions.map((suggestion, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setInputValue(suggestion);
                                    textareaRef.current?.focus();
                                  }}
                                  className="min-h-[40px] sm:min-h-0 px-3 sm:px-2.5 py-2 sm:py-1 text-xs rounded-full bg-[#C77A93]/10 text-[#7FB8A3] dark:text-[#C77A93] hover:bg-[#C77A93]/20 active:scale-[0.98] transition-all text-left sm:text-center"
                                  data-testid={`button-followup-${i}`}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Feedback Buttons for assistant messages - touch-friendly 44px targets */}
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-0.5 mt-1 ml-0.5 sm:ml-1">
                          <button
                            onClick={() => handleFeedback(message.id, "positive")}
                            className={cn(
                              "p-2.5 sm:p-1.5 rounded-md transition-colors active:scale-95 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center",
                              message.feedback === "positive"
                                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                : "text-muted-foreground hover:text-green-600 dark:hover:text-green-400 hover:bg-green-500/10"
                            )}
                            data-testid={`button-feedback-positive-${message.id}`}
                            title="Helpful response"
                          >
                            <ThumbsUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(message.id, "negative")}
                            className={cn(
                              "p-2.5 sm:p-1.5 rounded-md transition-colors active:scale-95 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center",
                              message.feedback === "negative"
                                ? "bg-red-500/20 text-red-600 dark:text-red-400"
                                : "text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
                            )}
                            data-testid={`button-feedback-negative-${message.id}`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Processing Indicator - Shows completed steps building up like Replit */}
            {(processingStage || completedSteps.length > 0) && isLoading && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-br from-[#12161D]/5 to-[#7FB8A3]/10 rounded-xl border border-[#7FB8A3]/20">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-[#7FB8A3]/20">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#12161D] to-[#7FB8A3] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-3 w-3 text-[#C77A93]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-foreground">Preparing analysis</span>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                      {responseMode === 'detailed' 
                        ? 'Deep research: 1-3 min' 
                        : 'Quick: 15-30 sec'}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 sm:w-1 sm:h-1 rounded-full bg-[#7FB8A3] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 sm:w-1 sm:h-1 rounded-full bg-[#7FB8A3] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 sm:w-1 sm:h-1 rounded-full bg-[#7FB8A3] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>

                {/* Completed Steps */}
                <div className="space-y-2">
                  {completedSteps.map((step, idx) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={idx} className="flex items-start gap-2 text-xs animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <StepIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-foreground">{step.stage}</span>
                          </div>
                          <p className="text-muted-foreground truncate">{step.message}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Current Step */}
                  {processingStage && (
                    <div className="flex items-start gap-2 text-xs">
                      <div className="h-5 w-5 rounded-full bg-[#7FB8A3]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {/* Cycling icons for current step */}
                        {(() => {
                          const CycleIcon = RESEARCH_CYCLE_ICONS[cyclingIconIndex];
                          return <CycleIcon className="h-3 w-3 text-[#7FB8A3] dark:text-[#C77A93] animate-pulse" />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[#7FB8A3] dark:text-[#C77A93]">
                            {STAGE_LABELS[processingStage.stage as keyof typeof STAGE_LABELS] || processingStage.stage}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-[#7FB8A3] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 rounded-full bg-[#7FB8A3] animate-bounce" style={{ animationDelay: '100ms' }} />
                            <span className="w-1 h-1 rounded-full bg-[#7FB8A3] animate-bounce" style={{ animationDelay: '200ms' }} />
                          </div>
                        </div>
                        <p className="text-muted-foreground">{processingStage.message}</p>
                        
                        {/* Source checking indicator for research phase */}
                        {(processingStage.stage === 'researching' || processingStage.stage === 'analyzing') && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground/70">
                            <span>Verifying sources:</span>
                            <div className="flex items-center gap-1">
                              {RESEARCH_CYCLE_ICONS.map((Icon, idx) => (
                                <Icon 
                                  key={idx}
                                  className={cn(
                                    "h-3 w-3 transition-all duration-300",
                                    idx <= cyclingIconIndex 
                                      ? "text-[#7FB8A3] dark:text-[#C77A93]" 
                                      : "text-muted-foreground/30"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {processingStage && (
                  <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#7FB8A3] to-[#C77A93] transition-all duration-300"
                      style={{ width: `${processingStage.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Input Area - Mobile optimized with safe area */}
          <div className="p-2 sm:p-4 border-t bg-background/50 backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about EPM, your assessment, or next steps..."
                className="min-h-[48px] sm:min-h-[44px] max-h-[120px] resize-none rounded-xl border-[#7FB8A3]/20 focus:border-[#C77A93] text-base sm:text-sm py-3 px-3 sm:px-4"
                disabled={isLoading || !sessionId}
                data-testid="input-chatbot-message"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading || !sessionId}
                className="h-12 w-12 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-[#12161D] to-[#7FB8A3] hover:from-[#7FB8A3] hover:to-[#C77A93] flex-shrink-0 active:scale-95 transition-transform"
                size="icon"
                data-testid="button-send-message"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 sm:h-5 sm:w-5" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 sm:mt-2 text-center">
              AI-powered by Constancia | Responses may be refined by research
            </p>
          </div>
        </Card>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
