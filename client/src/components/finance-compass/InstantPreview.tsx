import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Zap, RefreshCw, ChevronRight, Info, Mail, CheckCircle, AlertCircle, Lightbulb, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getPreferredCurrency, getCurrencySymbol, formatCurrency, storeCurrency, getConvertedRevenueLabel, CURRENCY_CONVERSION_RATES } from "@/lib/currency";
import { CurrencySelector } from "@/components/ui/currency-selector";

interface PreviewQuestion {
  id: string;
  text: string;
  dimension: string;
  dimensionKey: string;
  tooltip: string;
  whyItMatters: string;
  options: { value: number; label: string; maturityLevel: string }[];
}

interface QualificationQuestion {
  id: string;
  text: string;
  field: string;
  tooltip: string;
  options: { value: string; label: string }[];
}

interface AbTestVariant {
  id: string;
  name: string;
  weight: number;
}

interface AbTest {
  id: number;
  testName: string;
  variants: AbTestVariant[];
}

// Deterministically assign a variant based on session ID hash
function getAbVariant(testId: string, sessionId: string, variants: AbTestVariant[]): string {
  if (!variants || variants.length === 0) return "control";
  
  // Simple hash function for deterministic assignment
  let hash = 0;
  const str = `${testId}_${sessionId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Normalise to 0-100
  const normalised = Math.abs(hash % 100);
  
  // Assign based on cumulative weights
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (normalised < cumulative) {
      return variant.id;
    }
  }
  
  // Fallback to last variant
  return variants[variants.length - 1].id;
}

const QUALIFICATION_QUESTIONS: QualificationQuestion[] = [
  {
    id: "qual_industry",
    text: "What industry does your organisation operate in?",
    field: "industry",
    tooltip: "Industry context helps us benchmark your results against similar organisations and provide relevant recommendations.",
    options: [
      { value: "financial_services", label: "Financial Services & Banking" },
      { value: "insurance", label: "Insurance" },
      { value: "healthcare", label: "Healthcare & Life Sciences" },
      { value: "manufacturing", label: "Manufacturing" },
      { value: "retail", label: "Retail & Consumer Goods" },
      { value: "technology", label: "Technology & Software" },
      { value: "energy", label: "Energy & Utilities" },
      { value: "professional_services", label: "Professional Services" },
      { value: "public_sector", label: "Public Sector & Government" },
      { value: "real_estate", label: "Real Estate & Construction" },
      { value: "telecommunications", label: "Telecommunications" },
      { value: "transport_logistics", label: "Transport & Logistics" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "qual_company_size",
    text: "How many employees does your organisation have?",
    field: "companySize",
    tooltip: "Organisation size influences the complexity of finance transformation and the resources typically available for change initiatives.",
    options: [
      { value: "1_50", label: "1-50 employees" },
      { value: "51_200", label: "51-200 employees" },
      { value: "201_500", label: "201-500 employees" },
      { value: "501_1000", label: "501-1,000 employees" },
      { value: "1001_5000", label: "1,001-5,000 employees" },
      { value: "5001_10000", label: "5,001-10,000 employees" },
      { value: "10001_plus", label: "10,000+ employees" },
    ],
  },
  {
    id: "qual_revenue",
    text: "What is your organisation's approximate annual revenue?",
    field: "revenue",
    tooltip: "Revenue scale helps us understand the potential value of transformation and compare your maturity against organisations of similar size.",
    options: [
      { value: "under_10m", label: "Under £10 million" },
      { value: "10m_50m", label: "£10-50 million" },
      { value: "50m_100m", label: "£50-100 million" },
      { value: "100m_500m", label: "£100-500 million" },
      { value: "500m_1b", label: "£500 million - £1 billion" },
      { value: "1b_5b", label: "£1-5 billion" },
      { value: "5b_plus", label: "£5+ billion" },
      { value: "prefer_not_say", label: "Prefer not to say" },
    ],
  },
  {
    id: "qual_role",
    text: "What is your role within the finance function?",
    field: "role",
    tooltip: "Understanding your role helps us tailor recommendations to your sphere of influence and priorities within the organisation.",
    options: [
      { value: "cfo", label: "CFO / Finance Director" },
      { value: "group_controller", label: "Group Controller / Financial Controller" },
      { value: "head_fpa", label: "Head of FP&A / Planning Director" },
      { value: "head_reporting", label: "Head of Reporting / Analytics" },
      { value: "senior_manager", label: "Senior Manager / Director" },
      { value: "manager", label: "Manager" },
      { value: "analyst", label: "Analyst / Associate" },
      { value: "consultant", label: "Consultant / Advisor" },
      { value: "other", label: "Other" },
    ],
  },
];

const PREVIEW_QUESTIONS: PreviewQuestion[] = [
  {
    id: "preview_fpa",
    text: "How would you describe your finance function's planning capability?",
    dimension: "Financial Planning",
    dimensionKey: "financial_planning",
    tooltip: "Measures how effectively your organisation plans budgets, forecasts, and strategic financial scenarios across the business.",
    whyItMatters: "Strong planning capabilities enable faster response to market changes and better capital allocation. Leading organisations achieve 40% faster planning cycles.",
    options: [
      { value: 1, label: "Manual spreadsheets with limited integration", maturityLevel: "Ad-hoc" },
      { value: 2, label: "Basic planning tools with some automation", maturityLevel: "Developing" },
      { value: 3, label: "Standardised planning processes across departments", maturityLevel: "Established" },
      { value: 4, label: "Integrated EPM platform with driver-based models", maturityLevel: "Advanced" },
      { value: 5, label: "AI-enhanced continuous planning with real-time scenarios", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_reporting",
    text: "How quickly can your team produce management reports?",
    dimension: "Management Reporting",
    dimensionKey: "management_reporting",
    tooltip: "Assesses the speed and efficiency of producing financial and management reports for stakeholders.",
    whyItMatters: "Faster reporting enables quicker decision-making. Best-in-class finance teams deliver insights within hours, not weeks.",
    options: [
      { value: 1, label: "2+ weeks with significant manual effort", maturityLevel: "Ad-hoc" },
      { value: 2, label: "1-2 weeks with some automation", maturityLevel: "Developing" },
      { value: 3, label: "Within a week using integrated tools", maturityLevel: "Established" },
      { value: 4, label: "Within days with automated dashboards", maturityLevel: "Advanced" },
      { value: 5, label: "Real-time self-service analytics", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_technology",
    text: "How integrated are your finance technology systems?",
    dimension: "Technology Systems",
    dimensionKey: "technology_systems",
    tooltip: "Evaluates the level of integration and modernisation across your finance technology stack including ERP, EPM, and analytics platforms.",
    whyItMatters: "Integrated systems reduce manual effort by up to 70% and eliminate data silos that cause reporting delays and errors.",
    options: [
      { value: 1, label: "Siloed legacy systems with manual data transfers", maturityLevel: "Ad-hoc" },
      { value: 2, label: "Partially connected with some integration", maturityLevel: "Developing" },
      { value: 3, label: "Core systems integrated with standard interfaces", maturityLevel: "Established" },
      { value: 4, label: "Well-integrated cloud platform ecosystem", maturityLevel: "Advanced" },
      { value: 5, label: "Unified intelligent finance platform with AI", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_analytics",
    text: "How mature is your data analytics capability?",
    dimension: "Data & Analytics",
    dimensionKey: "data_analytics",
    tooltip: "Measures your ability to transform data into actionable insights, from basic reporting to predictive and prescriptive analytics.",
    whyItMatters: "Advanced analytics capabilities enable proactive decision-making. Organisations with mature analytics are 3x more likely to outperform peers.",
    options: [
      { value: 1, label: "Basic spreadsheet analysis only", maturityLevel: "Ad-hoc" },
      { value: 2, label: "Standard reports with limited self-service", maturityLevel: "Developing" },
      { value: 3, label: "BI dashboards with departmental analytics", maturityLevel: "Established" },
      { value: 4, label: "Advanced analytics with predictive capabilities", maturityLevel: "Advanced" },
      { value: 5, label: "AI-driven insights with prescriptive recommendations", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_governance",
    text: "How strong are your finance controls and compliance?",
    dimension: "Governance",
    dimensionKey: "governance_controls",
    tooltip: "This measures how well you manage financial risks and stay compliant. Most organisations are somewhere in the middle - don't worry if controls aren't fully automated yet.",
    whyItMatters: "Good controls prevent costly audit issues and build trust. You don't need to be perfect - even basic documented processes put you ahead of many peers.",
    options: [
      { value: 1, label: "Informal - we handle issues as they come up", maturityLevel: "Ad-hoc" },
      { value: 2, label: "Basic - some controls but not consistent", maturityLevel: "Developing" },
      { value: 3, label: "Documented - clear policies and regular reviews", maturityLevel: "Established" },
      { value: 4, label: "Automated - continuous monitoring in place", maturityLevel: "Advanced" },
      { value: 5, label: "Predictive - AI helps spot issues early", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_close",
    text: "How effective is your month-end close process?",
    dimension: "Close Process",
    dimensionKey: "close_process",
    tooltip: "Measures the efficiency and speed of your periodic financial close, including reconciliations and journal processing.",
    whyItMatters: "Faster close frees finance teams to focus on analysis. Leading organisations close in under 5 days, releasing capacity for value-added work.",
    options: [
      { value: 1, label: "15+ business days, highly manual", maturityLevel: "Ad-hoc" },
      { value: 2, label: "10-15 days with some automation", maturityLevel: "Developing" },
      { value: 3, label: "7-10 days with standardised processes", maturityLevel: "Established" },
      { value: 4, label: "5-7 days with automated reconciliations", maturityLevel: "Advanced" },
      { value: 5, label: "Under 5 days approaching continuous close", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_forecasting",
    text: "How accurate and agile is your forecasting process?",
    dimension: "Forecasting",
    dimensionKey: "forecasting",
    tooltip: "Evaluates the accuracy, frequency, and agility of your financial forecasting and reforecasting capabilities.",
    whyItMatters: "Accurate forecasting improves cash management and investor confidence. Best-in-class achieve <5% variance consistently.",
    options: [
      { value: 1, label: "Annual budget with >15% variance", maturityLevel: "Ad-hoc" },
      { value: 2, label: "Quarterly reforecasts with 10-15% variance", maturityLevel: "Developing" },
      { value: 3, label: "Monthly rolling forecasts with 5-10% variance", maturityLevel: "Established" },
      { value: 4, label: "Continuous forecasting with <5% variance", maturityLevel: "Advanced" },
      { value: 5, label: "Driver-based with AI adjustments, <3% variance", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_skills",
    text: "How would you rate your finance team's digital and analytical skills?",
    dimension: "Team & Skills",
    dimensionKey: "team_skills",
    tooltip: "Assesses the digital literacy, analytical capabilities, and technical proficiency of your finance team members.",
    whyItMatters: "Skilled teams deliver 50% more value from technology investments. Upskilling is critical for successful transformation.",
    options: [
      { value: 1, label: "Traditional accounting focus, limited tech skills", maturityLevel: "Ad-hoc" },
      { value: 2, label: "Basic Excel/BI skills, some training underway", maturityLevel: "Developing" },
      { value: 3, label: "Good analytical skills with data visualisation", maturityLevel: "Established" },
      { value: 4, label: "Advanced analytics with some automation skills", maturityLevel: "Advanced" },
      { value: 5, label: "Data science capabilities with AI/ML literacy", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_ai_adoption",
    text: "Most teams are early in their AI journey. Where would you place yours?",
    dimension: "AI Adoption",
    dimensionKey: "ai_adoption",
    tooltip: "This reflects your current position - most organisations are early in their AI journey. Understanding where you are helps identify the right next steps for your context.",
    whyItMatters: "AI adoption in finance is accelerating rapidly. Knowing your starting point is essential for planning a realistic transformation roadmap. Don't worry if you're just starting - most organisations are in the early research or experimentation phase.",
    options: [
      { value: 1, label: "Not yet started - focused on core operations", maturityLevel: "Ad-hoc" },
      { value: 2, label: "Researching - exploring what AI could do for us", maturityLevel: "Developing" },
      { value: 3, label: "Experimenting - running pilot projects in specific areas", maturityLevel: "Established" },
      { value: 4, label: "Scaling - AI deployed across multiple processes", maturityLevel: "Advanced" },
      { value: 5, label: "Transforming - AI integral to daily operations", maturityLevel: "Leading" },
    ],
  },
  {
    id: "preview_ai_readiness",
    text: "How prepared is your finance function for autonomous AI operations?",
    dimension: "AI Readiness",
    dimensionKey: "ai_readiness",
    tooltip: "Evaluates your organisation's preparedness for advanced AI including data quality, governance, and defined use cases.",
    whyItMatters: "AI readiness determines transformation success. Organisations with clean data and clear use cases see 3x faster AI adoption. Most businesses drop off here because the transition from manual to autonomous feels like a 'black box' - we help bridge that gap with clear, stepped roadmaps.",
    options: [
      { value: 1, label: "Not prepared - data and processes not ready", maturityLevel: "Ad-hoc" },
      { value: 2, label: "Early stage - exploring requirements", maturityLevel: "Developing" },
      { value: 3, label: "Building foundations - data quality initiatives", maturityLevel: "Established" },
      { value: 4, label: "Ready - clean data, defined use cases", maturityLevel: "Advanced" },
      { value: 5, label: "Leading - agentic AI pilots underway", maturityLevel: "Leading" },
    ],
  },
];

const MAX_SCORE = 5;

const INDUSTRY_INSIGHTS: Record<string, { challenge: string; opportunity: string }> = {
  financial_services: {
    challenge: "Regulatory complexity and legacy system constraints often slow transformation",
    opportunity: "AI-driven compliance and real-time risk analytics can create significant competitive advantage",
  },
  insurance: {
    challenge: "Complex actuarial processes and claims management require specialised solutions",
    opportunity: "Predictive analytics and automated underwriting can transform profitability",
  },
  healthcare: {
    challenge: "Balancing cost control with patient outcomes requires sophisticated analytics",
    opportunity: "AI-powered forecasting can optimise resource allocation and improve margins",
  },
  manufacturing: {
    challenge: "Supply chain volatility and cost management complexity demand agile planning",
    opportunity: "Integrated planning across operations and finance can reduce working capital by 15-25%",
  },
  retail: {
    challenge: "Margin pressure and inventory management require real-time visibility",
    opportunity: "AI demand forecasting and dynamic pricing can significantly improve profitability",
  },
  technology: {
    challenge: "Rapid growth and complex revenue recognition require scalable systems",
    opportunity: "Cloud-native EPM can enable scaling while maintaining finance agility",
  },
  energy: {
    challenge: "Commodity volatility and regulatory requirements drive planning complexity",
    opportunity: "Scenario modelling and risk analytics can improve hedging and capital decisions",
  },
  professional_services: {
    challenge: "Project-based revenue and utilisation tracking require granular visibility",
    opportunity: "Real-time resource planning can improve margins by 5-10%",
  },
  public_sector: {
    challenge: "Budget constraints and accountability requirements limit flexibility",
    opportunity: "Outcome-based budgeting and transparency can improve public value delivery",
  },
  real_estate: {
    challenge: "Long investment cycles and capital intensity require sophisticated modelling",
    opportunity: "AI-enhanced valuation and scenario planning can improve investment decisions",
  },
  telecommunications: {
    challenge: "Network investment decisions and competitive pricing require integrated analytics",
    opportunity: "Customer lifetime value analytics can optimise investment and pricing strategies",
  },
  transport_logistics: {
    challenge: "Fuel volatility and capacity planning create forecasting challenges",
    opportunity: "Predictive analytics can optimise routes and improve asset utilisation",
  },
  other: {
    challenge: "Every organisation faces unique transformation challenges",
    opportunity: "A tailored approach can unlock significant value across your specific context",
  },
};

const INDUSTRY_BENCHMARKS: Record<string, { avg: number; topPerformer: number }> = {
  financial_services: { avg: 62, topPerformer: 78 },
  insurance: { avg: 58, topPerformer: 74 },
  healthcare: { avg: 52, topPerformer: 68 },
  manufacturing: { avg: 48, topPerformer: 65 },
  retail: { avg: 45, topPerformer: 62 },
  technology: { avg: 65, topPerformer: 82 },
  energy: { avg: 50, topPerformer: 66 },
  professional_services: { avg: 55, topPerformer: 72 },
  public_sector: { avg: 42, topPerformer: 58 },
  real_estate: { avg: 44, topPerformer: 60 },
  telecommunications: { avg: 54, topPerformer: 70 },
  transport_logistics: { avg: 46, topPerformer: 63 },
  other: { avg: 50, topPerformer: 68 },
};

const PRIORITY_OPTIONS = [
  { id: "peer_comparison", label: "See detailed benchmarks vs my industry" },
  { id: "action_items", label: "Get specific action items for improvement" },
  { id: "vendor_fit", label: "Understand which solutions fit my gaps" },
  { id: "best_practices", label: "Learn best practices from top performers" },
];

function getEstimatedSavings(companySize: string, currencyCode: string = "GBP"): number {
  const savingsGBP: Record<string, number> = {
    "1_50": 15000,
    "51_200": 45000,
    "201_500": 120000,
    "501_1000": 250000,
    "1001_5000": 500000,
    "5001_10000": 1200000,
    "10001_plus": 2500000,
  };
  const baseAmount = savingsGBP[companySize] || 75000;
  const rate = CURRENCY_CONVERSION_RATES[currencyCode] || 1;
  return Math.round(baseAmount * rate);
}

function getBrowserFingerprint() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language || (navigator as any).userLanguage;
    const languages = navigator.languages ? navigator.languages.join(",") : locale;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const colorDepth = window.screen.colorDepth;
    const platform = navigator.platform;
    const cookiesEnabled = navigator.cookieEnabled;
    const deviceMemory = (navigator as any).deviceMemory;
    const hardwareConcurrency = navigator.hardwareConcurrency;
    
    return {
      timezone: tz,
      locale,
      languages,
      screen: `${screenWidth}x${screenHeight}`,
      colorDepth,
      platform,
      cookiesEnabled,
      deviceMemory,
      cores: hardwareConcurrency,
    };
  } catch (e) {
    return {};
  }
}

async function trackWidgetEvent(eventType: string, data: Record<string, any> = {}) {
  try {
    const fingerprint = getBrowserFingerprint();
    
    await fetch("/api/analytics/widget-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widget: "instant_preview",
        eventType,
        timestamp: new Date().toISOString(),
        ...data,
        fingerprint,
      }),
    });
  } catch (e) {
    // Silent fail for analytics
  }
}

function getNextStepsRecommendations(dimensionScores: { dimension: string; dimensionKey: string; rawScore: number }[], qualificationData: Record<string, string>) {
  const weakAreas = [...dimensionScores]
    .sort((a, b) => a.rawScore - b.rawScore)
    .slice(0, 3);

  const recommendations: { title: string; description: string }[] = [];

  for (const area of weakAreas) {
    switch (area.dimensionKey) {
      case "financial_planning":
        recommendations.push({
          title: "Modernise Your Planning Process",
          description: "Consider implementing driver-based planning with integrated scenario modelling to reduce cycle times by 40%.",
        });
        break;
      case "management_reporting":
        recommendations.push({
          title: "Accelerate Reporting Delivery",
          description: "Deploy self-service analytics and automated dashboards to move from weeks to days for management reporting.",
        });
        break;
      case "technology_systems":
        recommendations.push({
          title: "Integrate Your Finance Systems",
          description: "Map your current system landscape and identify integration opportunities to eliminate manual data transfers.",
        });
        break;
      case "data_analytics":
        recommendations.push({
          title: "Build Analytics Capabilities",
          description: "Develop a data strategy with clear use cases for predictive analytics to drive proactive decision-making.",
        });
        break;
      case "governance_controls":
        recommendations.push({
          title: "Strengthen Financial Controls",
          description: "Implement continuous monitoring and automated controls to reduce risk and improve audit outcomes.",
        });
        break;
      case "close_process":
        recommendations.push({
          title: "Accelerate Your Close Process",
          description: "Focus on automated reconciliations and parallel processing to reduce close duration significantly.",
        });
        break;
      case "forecasting":
        recommendations.push({
          title: "Improve Forecast Accuracy",
          description: "Implement rolling forecasts with driver-based models to achieve consistent accuracy below 5% variance.",
        });
        break;
      case "team_skills":
        recommendations.push({
          title: "Upskill Your Finance Team",
          description: "Invest in digital literacy and analytics training to maximise value from technology investments.",
        });
        break;
      case "ai_adoption":
        recommendations.push({
          title: "Accelerate AI Adoption",
          description: "Identify high-value AI use cases in automation, forecasting, and anomaly detection to pilot first.",
        });
        break;
      case "ai_readiness":
        recommendations.push({
          title: "Build AI Foundations",
          description: "Focus on data quality, governance, and clear use case prioritisation to enable successful AI deployment.",
        });
        break;
    }
  }

  return recommendations.slice(0, 3);
}

interface InstantPreviewProps {
  onStartFullAssessment: () => void;
  className?: string;
}

const STORAGE_KEY = "fc_instant_preview_state";

interface PersistedState {
  sessionId: string;
  phase: "qualification" | "maturity";
  qualificationIndex: number;
  currentQuestion: number;
  qualificationData: Record<string, string>;
  answers: Record<string, number>;
  showResults: boolean;
  priorities: string[];
  timestamp: number;
}

function loadPersistedState(): PersistedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as PersistedState;
    // Expire after 24 hours
    if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silent fail if localStorage is full or unavailable
  }
}

export function InstantPreview({ onStartFullAssessment, className }: InstantPreviewProps) {
  // Load persisted state on initial mount
  const persistedState = useRef(loadPersistedState());
  const initialState = persistedState.current;

  const [phase, setPhase] = useState<"qualification" | "maturity">(initialState?.phase || "qualification");
  const [qualificationIndex, setQualificationIndex] = useState(initialState?.qualificationIndex || 0);
  const [currentQuestion, setCurrentQuestion] = useState(initialState?.currentQuestion || 0);
  const [qualificationData, setQualificationData] = useState<Record<string, string>>(initialState?.qualificationData || {});
  const [answers, setAnswers] = useState<Record<string, number>>(initialState?.answers || {});
  const [showResults, setShowResults] = useState(initialState?.showResults || false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sessionId] = useState(() => initialState?.sessionId || `preview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [priorities, setPriorities] = useState<string[]>(initialState?.priorities || []);
  
  const [ctaHoverStart, setCtaHoverStart] = useState<number | null>(null);
  const [benchmarkViewed, setBenchmarkViewed] = useState(false);
  const [resultsViewed, setResultsViewed] = useState(false);
  const [sessionStartTime] = useState(() => Date.now());
  const peerComparisonRef = useRef<HTMLDivElement>(null);
  
  const [currency, setCurrency] = useState(() => getPreferredCurrency());
  const currencySymbol = getCurrencySymbol(currency);

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    storeCurrency(newCurrency);
  };

  // Persist state changes to localStorage
  useEffect(() => {
    savePersistedState({
      sessionId,
      phase,
      qualificationIndex,
      currentQuestion,
      qualificationData,
      answers,
      showResults,
      priorities,
      timestamp: Date.now(),
    });
  }, [sessionId, phase, qualificationIndex, currentQuestion, qualificationData, answers, showResults, priorities]);

  // A/B Test state
  const [activeAbTest, setActiveAbTest] = useState<AbTest | null>(null);
  const [abVariant, setAbVariant] = useState<string>("control");
  const abTestLoadedRef = useRef(false);

  // Helper to track events with A/B variant metadata - returns Promise for critical events
  const trackWithAbVariant = async (eventType: string, data: Record<string, any> = {}): Promise<void> => {
    const metadata = data.metadata || {};
    await trackWidgetEvent(eventType, {
      ...data,
      metadata: {
        ...metadata,
        abVariant,
        ...(activeAbTest && { abTestId: activeAbTest.id }),
      },
    });
  };

  const totalQuestions = QUALIFICATION_QUESTIONS.length + PREVIEW_QUESTIONS.length;
  const currentOverallQuestion = phase === "qualification" 
    ? qualificationIndex 
    : QUALIFICATION_QUESTIONS.length + currentQuestion;

  // Fetch active A/B tests and assign variant on mount
  useEffect(() => {
    if (abTestLoadedRef.current) return;
    abTestLoadedRef.current = true;

    const loadAbTestAndTrack = async () => {
      let assignedVariant = "control";
      let testId: number | null = null;

      try {
        const response = await fetch("/api/analytics/ab-tests/active?widget=instant_preview");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.length > 0) {
            // Use the first active test
            const test = data.data[0] as AbTest;
            setActiveAbTest(test);
            testId = test.id;
            
            // Assign variant deterministically based on session ID
            assignedVariant = getAbVariant(test.id.toString(), sessionId, test.variants);
            setAbVariant(assignedVariant);
          }
        }
      } catch (e) {
        // Silent fail - continue without A/B test
      }

      // Track widget loaded with A/B test variant
      trackWidgetEvent("widget_loaded", { 
        sessionId,
        metadata: {
          abVariant: assignedVariant,
          ...(testId !== null && { abTestId: testId }),
        },
      });
    };

    loadAbTestAndTrack();
  }, [sessionId]);

  useEffect(() => {
    if (showResults && !resultsViewed) {
      setResultsViewed(true);
      trackWithAbVariant("results_viewed", {
        sessionId,
        finalScore: calculateScore(),
        maturityLevel: getMaturityLabel(calculateScore()).label,
        qualificationData,
        timeToComplete: Date.now() - sessionStartTime,
      });
    }
  }, [showResults, resultsViewed, sessionId, sessionStartTime, qualificationData, abVariant, activeAbTest]);

  useEffect(() => {
    if (!showResults || benchmarkViewed || !qualificationData.industry) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !benchmarkViewed) {
            setBenchmarkViewed(true);
            trackWithAbVariant("benchmark_comparison_viewed", {
              sessionId,
              finalScore: calculateScore(),
              industry: qualificationData.industry,
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    if (peerComparisonRef.current) {
      observer.observe(peerComparisonRef.current);
    }

    return () => observer.disconnect();
  }, [showResults, benchmarkViewed, sessionId, qualificationData]);

  const handleQualificationAnswer = (value: string) => {
    const question = QUALIFICATION_QUESTIONS[qualificationIndex];
    
    trackWithAbVariant("qualification_answered", {
      sessionId,
      questionId: question.id,
      field: question.field,
      answerValue: value,
      answerLabel: question.options.find(o => o.value === value)?.label,
    });
    
    const updatedData = { ...qualificationData, [question.field]: value };
    setQualificationData(updatedData);
    
    if (qualificationIndex < QUALIFICATION_QUESTIONS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setQualificationIndex(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      trackWithAbVariant("qualification_completed", {
        sessionId,
        qualificationData: updatedData,
      });
      setIsAnimating(true);
      setTimeout(() => {
        setPhase("maturity");
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleAnswer = async (value: number) => {
    const question = PREVIEW_QUESTIONS[currentQuestion];
    const questionId = question.id;
    
    // Fire-and-forget for regular question tracking
    trackWithAbVariant("question_answered", {
      sessionId,
      questionId,
      questionNumber: currentQuestion + 1,
      dimension: question.dimension,
      dimensionKey: question.dimensionKey,
      answerValue: value,
      maturityLevel: question.options.find(o => o.value === value)?.maturityLevel,
    });
    
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    if (currentQuestion < PREVIEW_QUESTIONS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      const allAnswers = { ...answers, [questionId]: value };
      const total = Object.values(allAnswers).reduce((sum, val) => sum + val, 0);
      const maxPossible = PREVIEW_QUESTIONS.length * MAX_SCORE;
      const normalizedScore = total / maxPossible;
      const percentageScore = Math.round(normalizedScore * 100);
      
      // CRITICAL: Await completion tracking before showing results
      await trackWithAbVariant("preview_completed", {
        sessionId,
        finalScore: percentageScore,
        rawScore: total,
        maxPossible,
        normalizedScore: normalizedScore.toFixed(3),
        answers: allAnswers,
        qualificationData,
        completionTime: Date.now(),
      });
      
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    const total = Object.values(answers).reduce((sum, val) => sum + val, 0);
    const maxPossible = PREVIEW_QUESTIONS.length * MAX_SCORE;
    return Math.round((total / maxPossible) * 100);
  };

  const getMaturityLabel = (score: number) => {
    if (score >= 80) return { label: "Leading", color: "text-emerald-600", bg: "bg-emerald-500", description: "Your finance function demonstrates best-in-class capabilities" };
    if (score >= 60) return { label: "Advanced", color: "text-blue-600", bg: "bg-blue-500", description: "Strong foundation with opportunities for strategic enhancement" };
    if (score >= 40) return { label: "Established", color: "text-amber-600", bg: "bg-amber-500", description: "Solid fundamentals with clear transformation opportunities" };
    if (score >= 20) return { label: "Developing", color: "text-orange-600", bg: "bg-orange-500", description: "Building capabilities with significant room for improvement" };
    return { label: "Ad-hoc", color: "text-red-600", bg: "bg-red-500", description: "Early stage with substantial transformation potential" };
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 80) {
      return {
        summary: "Your finance function is operating at a leading level, demonstrating best-in-class capabilities across most dimensions.",
        detail: "You're well-positioned to leverage advanced AI and automation to maintain competitive advantage. Focus on continuous improvement and innovation to stay ahead.",
      };
    }
    if (score >= 60) {
      return {
        summary: "Your finance function has a strong foundation with opportunities for strategic enhancement.",
        detail: "You've made good progress on modernisation. Targeted investments in your weaker areas could deliver significant returns and move you towards leading practice.",
      };
    }
    if (score >= 40) {
      return {
        summary: "Your finance function has solid fundamentals but clear opportunities for transformation.",
        detail: "This is a common position for organisations beginning their transformation journey. A structured approach to improvement can deliver 30-50% efficiency gains.",
      };
    }
    if (score >= 20) {
      return {
        summary: "Your finance function is building capabilities with significant room for improvement.",
        detail: "There's substantial opportunity to transform your operations. Prioritising key areas can deliver quick wins while building towards longer-term goals.",
      };
    }
    return {
      summary: "Your finance function is at an early stage with substantial transformation potential.",
      detail: "While the journey ahead is significant, this also represents the greatest opportunity for improvement. Focused investment can deliver transformational results.",
    };
  };

  const resetPreview = () => {
    trackWithAbVariant("preview_reset", { sessionId, previousScore: calculateScore() });
    setPhase("qualification");
    setQualificationIndex(0);
    setQualificationData({});
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setShowEmailDialog(false);
    setEmailStatus("idle");
    setEmail("");
    setEmailError("");
    setPriorities([]);
    // Clear persisted state
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleGoBack = () => {
    if (isAnimating) return;
    
    if (phase === "maturity") {
      if (currentQuestion > 0) {
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentQuestion(prev => prev - 1);
          setIsAnimating(false);
        }, 300);
      } else {
        setIsAnimating(true);
        setTimeout(() => {
          setPhase("qualification");
          setQualificationIndex(QUALIFICATION_QUESTIONS.length - 1);
          setIsAnimating(false);
        }, 300);
      }
    } else if (phase === "qualification") {
      if (qualificationIndex > 0) {
        setIsAnimating(true);
        setTimeout(() => {
          setQualificationIndex(prev => prev - 1);
          setIsAnimating(false);
        }, 300);
      }
    }
  };

  const canGoBack = phase === "qualification" ? qualificationIndex > 0 : true;

  const handleStartFullAssessment = async () => {
    // CRITICAL: Await CTA tracking before navigating away
    await trackWithAbVariant("cta_clicked", {
      sessionId,
      finalScore: calculateScore(),
      action: "start_full_assessment",
      priorities: priorities,
    });
    // Clear persisted state when starting full assessment
    localStorage.removeItem(STORAGE_KEY);
    onStartFullAssessment();
  };

  const handlePriorityChange = (optionId: string, checked: boolean) => {
    if (checked) {
      setPriorities([...priorities, optionId]);
      trackWithAbVariant("priority_selected", { sessionId, priority: optionId });
    } else {
      setPriorities(priorities.filter(p => p !== optionId));
      trackWithAbVariant("priority_deselected", { sessionId, priority: optionId });
    }
  };

  const handleEmailResults = async () => {
    if (!email || !email.includes("@")) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailStatus("sending");
    setEmailError("");

    const score = calculateScore();
    const maturity = getMaturityLabel(score);
    const dimensionScores = PREVIEW_QUESTIONS.map(q => ({
      dimension: q.dimension,
      dimensionKey: q.dimensionKey,
      rawScore: answers[q.id] || 0,
      maxScore: MAX_SCORE,
      percentage: Math.round(((answers[q.id] || 0) / MAX_SCORE) * 100),
      maturityLevel: q.options.find(o => o.value === (answers[q.id] || 0))?.maturityLevel || "Unknown",
    }));

    const strongestDim = dimensionScores.reduce((a, b) => a.percentage > b.percentage ? a : b);
    const weakestDim = dimensionScores.reduce((a, b) => a.percentage < b.percentage ? a : b);
    const recommendationObjs = getNextStepsRecommendations(dimensionScores, qualificationData);
    const industryData = INDUSTRY_INSIGHTS[qualificationData.industry] || INDUSTRY_INSIGHTS.other;

    try {
      const response = await fetch("/api/analytics/widget-email-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sessionId,
          score,
          maturityLevel: maturity.label,
          maturityDescription: maturity.description,
          qualificationData,
          dimensionScores,
          strongestArea: {
            dimension: strongestDim.dimension,
            maturityLevel: strongestDim.maturityLevel,
          },
          weakestArea: {
            dimension: weakestDim.dimension,
            maturityLevel: weakestDim.maturityLevel,
          },
          recommendations: recommendationObjs.map(r => `${r.title}: ${r.description}`),
          industryInsight: `${industryData.challenge}. ${industryData.opportunity}`,
        }),
      });

      if (response.ok) {
        setEmailStatus("success");
        trackWithAbVariant("email_results_sent", { sessionId, email });
      } else {
        const data = await response.json();
        setEmailError(data.error || "Failed to send email. Please try again.");
        setEmailStatus("error");
      }
    } catch (err) {
      setEmailError("Failed to send email. Please check your connection and try again.");
      setEmailStatus("error");
    }
  };

  if (showResults) {
    const score = calculateScore();
    const maturity = getMaturityLabel(score);
    const interpretation = getScoreInterpretation(score);

    const dimensionScores = PREVIEW_QUESTIONS.map(q => {
      const rawScore = answers[q.id] || 0;
      const normalizedPct = Math.round((rawScore / MAX_SCORE) * 100);
      return {
        dimension: q.dimension,
        dimensionKey: q.dimensionKey,
        rawScore,
        maxScore: MAX_SCORE,
        percentage: normalizedPct,
        maturityLevel: q.options.find(o => o.value === rawScore)?.maturityLevel || "Unknown",
      };
    });

    const strongest = dimensionScores.reduce((a, b) => a.percentage > b.percentage ? a : b);
    const weakest = dimensionScores.reduce((a, b) => a.percentage < b.percentage ? a : b);
    const recommendations = getNextStepsRecommendations(dimensionScores, qualificationData);
    const industryInsight = INDUSTRY_INSIGHTS[qualificationData.industry] || INDUSTRY_INSIGHTS.other;

    return (
      <TooltipProvider>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn("w-full", className)}
        >
          <Card className="border-2 border-[#12EBFC]/30 bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#02205B] via-[#0884AA] to-[#12EBFC]" />
            <CardContent className="p-4 sm:p-6">
              <div className="text-center mb-4 sm:mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="inline-flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-[#0884AA] to-[#12EBFC] mb-3 sm:mb-4"
                >
                  <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </motion.div>
                <h3 className="text-lg sm:text-xl font-bold text-[#02205B] mb-1">Finance Readiness Score</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Based on 10 key dimensions (1-5 scale)</p>
              </div>

              <div className="relative mb-4 sm:mb-6">
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl sm:text-5xl font-bold text-[#02205B]"
                  >
                    {score}
                  </motion.span>
                  <span className="text-xl sm:text-2xl text-muted-foreground">/100</span>
                </div>
                <Progress value={score} className="h-2.5 sm:h-3 bg-slate-100" />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mt-2"
                >
                  <span className={cn("font-bold text-base sm:text-lg", maturity.color)}>
                    {maturity.label}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">{maturity.description}</p>
                </motion.div>
              </div>

              {/* Peer Comparison Section */}
              {qualificationData.industry && (
                <motion.div
                  ref={peerComparisonRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mb-4 p-3 rounded-lg bg-[#02205B]/5 border border-[#02205B]/10"
                  data-testid="peer-comparison-section"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-[#0884AA]" />
                    <p className="text-[10px] font-semibold text-[#02205B] uppercase tracking-wide">How You Compare</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2" data-testid="peer-comparison-your-score">
                      <span className="text-[10px] text-muted-foreground w-24 sm:w-28 flex-shrink-0">Your Score</span>
                      <div className="flex-1">
                        <Progress value={score} className="h-2 bg-slate-200" />
                      </div>
                      <span className="text-xs font-semibold text-[#02205B] w-10 text-right">{score}%</span>
                    </div>
                    <div className="flex items-center gap-2" data-testid="peer-comparison-industry-avg">
                      <span className="text-[10px] text-muted-foreground w-24 sm:w-28 flex-shrink-0">Industry Average</span>
                      <div className="flex-1">
                        <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-[#0884AA]/60 rounded-full"
                            style={{ width: `${INDUSTRY_BENCHMARKS[qualificationData.industry]?.avg || 50}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#0884AA] w-10 text-right">
                        {INDUSTRY_BENCHMARKS[qualificationData.industry]?.avg || 50}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2" data-testid="peer-comparison-top-performers">
                      <span className="text-[10px] text-muted-foreground w-24 sm:w-28 flex-shrink-0">Top Performers</span>
                      <div className="flex-1">
                        <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-emerald-500/60 rounded-full"
                            style={{ width: `${INDUSTRY_BENCHMARKS[qualificationData.industry]?.topPerformer || 68}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 w-10 text-right">
                        {INDUSTRY_BENCHMARKS[qualificationData.industry]?.topPerformer || 68}%
                      </span>
                    </div>
                  </div>
                  {score < (INDUSTRY_BENCHMARKS[qualificationData.industry]?.avg || 50) && (
                    <p className="text-xs text-amber-600 mt-2.5 flex items-center gap-1.5" data-testid="peer-comparison-gap-message">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      You're {(INDUSTRY_BENCHMARKS[qualificationData.industry]?.avg || 50) - score} points below your industry average
                    </p>
                  )}
                  {score >= (INDUSTRY_BENCHMARKS[qualificationData.industry]?.avg || 50) && score < (INDUSTRY_BENCHMARKS[qualificationData.industry]?.topPerformer || 68) && (
                    <p className="text-xs text-[#0884AA] mt-2.5 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
                      You're above average – {(INDUSTRY_BENCHMARKS[qualificationData.industry]?.topPerformer || 68) - score} points from top performer status
                    </p>
                  )}
                  {score >= (INDUSTRY_BENCHMARKS[qualificationData.industry]?.topPerformer || 68) && (
                    <p className="text-xs text-emerald-600 mt-2.5 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      You're performing at the top level in your industry
                    </p>
                  )}
                </motion.div>
              )}

              {/* What This Means Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-4 p-3 rounded-lg bg-[#02205B]/5 border border-[#02205B]/10"
              >
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-[#0884AA] mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-semibold text-[#02205B] uppercase tracking-wide">What This Means</p>
                </div>
                <p className="text-xs text-[#02205B] mb-1.5">{interpretation.summary}</p>
                <p className="text-[10px] text-muted-foreground">{interpretation.detail}</p>
              </motion.div>

              {/* Organisation Profile */}
              {Object.keys(qualificationData).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <p className="text-[10px] text-slate-500 font-medium mb-2">Your Organisation Profile</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {qualificationData.industry && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Industry</p>
                        <p className="font-medium text-[#02205B] truncate">
                          {QUALIFICATION_QUESTIONS.find(q => q.field === "industry")?.options.find(o => o.value === qualificationData.industry)?.label || qualificationData.industry}
                        </p>
                      </div>
                    )}
                    {qualificationData.companySize && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Size</p>
                        <p className="font-medium text-[#02205B] truncate">
                          {QUALIFICATION_QUESTIONS.find(q => q.field === "companySize")?.options.find(o => o.value === qualificationData.companySize)?.label || qualificationData.companySize}
                        </p>
                      </div>
                    )}
                    {qualificationData.revenue && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Revenue</p>
                        <p className="font-medium text-[#02205B] truncate">
                          {QUALIFICATION_QUESTIONS.find(q => q.field === "revenue")?.options.find(o => o.value === qualificationData.revenue)?.label || qualificationData.revenue}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Industry Context */}
              {qualificationData.industry && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-4 p-3 rounded-lg bg-[#0884AA]/5 border border-[#0884AA]/20"
                >
                  <p className="text-[10px] font-semibold text-[#0884AA] uppercase tracking-wide mb-2">Industry Context</p>
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    <span className="font-medium text-[#02205B]">Challenge:</span> {industryInsight.challenge}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-medium text-[#02205B]">Opportunity:</span> {industryInsight.opportunity}
                  </p>
                </motion.div>
              )}

              {/* Critical Gaps Alert */}
              {dimensionScores.filter(d => d.rawScore <= 2).length > 0 && (
                <motion.div 
                  className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.52 }}
                  data-testid="critical-gaps-alert"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-bold text-sm text-red-700">
                      {dimensionScores.filter(d => d.rawScore <= 2).length} Critical Gap{dimensionScores.filter(d => d.rawScore <= 2).length > 1 ? 's' : ''} Identified
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {dimensionScores.filter(d => d.rawScore <= 2).map(gap => (
                      <li key={gap.dimensionKey} className="text-xs text-red-600 flex items-center gap-2" data-testid={`critical-gap-${gap.dimensionKey}`}>
                        <span className="font-medium">{gap.dimension}:</span>
                        <span>{gap.rawScore}/5 ({gap.maturityLevel})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-red-500 mt-2">
                    These areas require immediate attention to avoid operational inefficiencies
                  </p>
                </motion.div>
              )}

              {/* Potential Impact Callout */}
              {score < 50 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.53 }}
                  className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200"
                  data-testid="potential-impact-callout"
                >
                  <p className="text-xs text-amber-800">
                    <strong>Estimated Impact:</strong> Finance teams at your maturity level typically spend 
                    15+ additional hours per month on manual processes. Addressing your gaps could 
                    save <span className="font-bold">{currencySymbol}{getEstimatedSavings(qualificationData.companySize, currency).toLocaleString()}</span> annually.
                  </p>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 }}
                  className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200"
                >
                  <p className="text-[10px] text-emerald-600 font-medium">Strongest Area</p>
                  <p className="text-sm font-semibold text-emerald-700 truncate">{strongest.dimension}</p>
                  <p className="text-xs text-emerald-600">{strongest.maturityLevel}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="p-2.5 rounded-lg bg-amber-50 border border-amber-200"
                >
                  <p className="text-[10px] text-amber-600 font-medium">Key Opportunity</p>
                  <p className="text-sm font-semibold text-amber-700 truncate">{weakest.dimension}</p>
                  <p className="text-xs text-amber-600">{weakest.maturityLevel}</p>
                </motion.div>
              </div>

              {/* Next Steps Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="mb-4 p-3 rounded-lg bg-gradient-to-br from-[#02205B]/5 to-[#0884AA]/5 border border-[#02205B]/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-[#02205B]" />
                  <p className="text-[10px] font-semibold text-[#02205B] uppercase tracking-wide">Recommended Next Steps</p>
                </div>
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#0884AA] text-white text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                      <div>
                        <p className="text-xs font-medium text-[#02205B]">{rec.title}</p>
                        <p className="text-[10px] text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-4 sm:mb-6 max-h-[160px] sm:max-h-[180px] overflow-y-auto" data-testid="dimension-scores-grid">
                {dimensionScores.map((dim, idx) => (
                  <motion.button
                    key={dim.dimensionKey}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + idx * 0.03 }}
                    onClick={() => {
                      trackWithAbVariant("dimension_viewed_result", {
                        sessionId,
                        dimension: dim.dimension,
                        dimensionKey: dim.dimensionKey,
                        score: dim.rawScore,
                        viewDuration: null,
                      });
                    }}
                    className={cn(
                      "flex items-center justify-between text-xs p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer",
                      "hover:ring-2 hover:ring-[#0884AA]/40 hover:scale-[1.02]",
                      dim.rawScore === 1 ? "bg-red-50 border-2 border-red-400 animate-pulse" :
                      dim.rawScore === 2 ? "bg-amber-50 border-2 border-amber-400" :
                      "bg-slate-50"
                    )}
                    data-testid={`dimension-score-${dim.dimensionKey}`}
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {dim.rawScore === 1 && <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                      {dim.rawScore === 2 && <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                      <span className="text-muted-foreground truncate">{dim.dimension}</span>
                    </div>
                    <span className={cn(
                      "font-semibold flex-shrink-0 tabular-nums ml-1",
                      dim.rawScore >= 4 ? "text-emerald-600" : dim.rawScore >= 3 ? "text-blue-600" : dim.rawScore >= 2 ? "text-amber-600" : "text-red-600"
                    )}>
                      {dim.rawScore}/{MAX_SCORE}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Value Proposition */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-4 p-3 rounded-lg bg-gradient-to-r from-[#02205B] to-[#0884AA] text-white"
              >
                <p className="text-xs font-semibold mb-1">Unlock Your Full Potential</p>
                <p className="text-[10px] opacity-90">
                  The full FinanceCompass assessment provides detailed analysis across 95+ questions, 
                  personalised benchmarking against your industry peers, and AI-powered recommendations 
                  with projected ROI for your transformation initiatives.
                </p>
              </motion.div>

              {/* Pre-CTA Micro-Commitment Checkboxes */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
                className="mb-4"
                data-testid="pre-cta-commitment-section"
              >
                <p className="text-sm font-medium text-[#02205B] mb-2">
                  What would you like to discover? (Select all that apply)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRIORITY_OPTIONS.map(option => (
                    <label 
                      key={option.id} 
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-[#0884AA]/50 transition-colors"
                      data-testid={`priority-option-${option.id}`}
                    >
                      <Checkbox 
                        checked={priorities.includes(option.id)}
                        onCheckedChange={(checked) => handlePriorityChange(option.id, checked === true)}
                        className="data-[state=checked]:bg-[#02205B] data-[state=checked]:border-[#02205B]"
                      />
                      <span className="text-xs sm:text-sm text-[#02205B]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </motion.div>

              {/* Unlock More Value Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-4 p-3 rounded-lg bg-gradient-to-r from-[#02205B]/10 to-[#0884AA]/10 border border-[#0884AA]/20"
                data-testid="section-unlock-value"
              >
                <p className="text-[10px] font-semibold text-[#02205B] uppercase tracking-wide mb-2">Unlock Your Full Potential</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#02205B]" data-testid="text-value-74-questions">
                    <CheckCircle className="h-3.5 w-3.5 text-[#0884AA] flex-shrink-0" />
                    <span>74 questions across 7 comprehensive dimensions</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#02205B]" data-testid="text-value-ai-recommendations">
                    <CheckCircle className="h-3.5 w-3.5 text-[#0884AA] flex-shrink-0" />
                    <span>AI-powered personalised recommendations</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#02205B]" data-testid="text-value-roadmap">
                    <CheckCircle className="h-3.5 w-3.5 text-[#0884AA] flex-shrink-0" />
                    <span>Detailed transformation roadmap & ROI projections</span>
                  </div>
                </div>
              </motion.div>

              <div className="space-y-2 sm:space-y-3">
                <Button
                  onClick={handleStartFullAssessment}
                  onMouseEnter={() => setCtaHoverStart(Date.now())}
                  onMouseLeave={() => {
                    if (ctaHoverStart) {
                      const hoverDuration = Date.now() - ctaHoverStart;
                      if (hoverDuration >= 3000) {
                        trackWithAbVariant("cta_hover_hesitation", {
                          sessionId,
                          hoverDurationMs: hoverDuration,
                          finalScore: calculateScore(),
                          maturityLevel: getMaturityLabel(calculateScore()).label,
                        });
                      }
                      setCtaHoverStart(null);
                    }
                  }}
                  className="w-full"
                  data-testid="button-start-full-assessment"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Full Assessment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      trackWithAbVariant("email_dialog_opened", {
                        sessionId,
                        finalScore: calculateScore(),
                      });
                      setShowEmailDialog(true);
                    }}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-email-results"
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    Email Results
                  </Button>
                  <Button
                    onClick={resetPreview}
                    variant="ghost"
                    className="flex-1"
                    data-testid="button-retake-preview"
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Retake
                  </Button>
                </div>
              </div>

              <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-3 sm:mt-4">
                Takes 20 minutes · £20k+ consulting value · Free access
              </p>
            </CardContent>
          </Card>

          {/* Email Dialog */}
          <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#02205B]">
                  <Mail className="h-5 w-5" />
                  Email Your Results
                </DialogTitle>
                <DialogDescription>
                  We'll send your Finance Readiness results to your email address for future reference.
                </DialogDescription>
              </DialogHeader>
              
              {emailStatus === "success" ? (
                <div className="py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium text-[#02205B] mb-1">Results Sent Successfully!</p>
                  <p className="text-sm text-muted-foreground">Check your inbox for your Finance Readiness summary.</p>
                  <Button
                    onClick={() => setShowEmailDialog(false)}
                    className="mt-4 bg-[#02205B]"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Enter your work email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full"
                      data-testid="input-email"
                      disabled={emailStatus === "sending"}
                    />
                    {emailError && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {emailError}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowEmailDialog(false)}
                      variant="outline"
                      className="flex-1"
                      disabled={emailStatus === "sending"}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEmailResults}
                      className="flex-1 bg-[#02205B]"
                      disabled={emailStatus === "sending"}
                      data-testid="button-send-email"
                    >
                      {emailStatus === "sending" ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Results
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    We respect your privacy. Your email will only be used to send your results.
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </motion.div>
      </TooltipProvider>
    );
  }

  const progress = ((currentOverallQuestion + 1) / totalQuestions) * 100;

  if (phase === "qualification") {
    const qualQuestion = QUALIFICATION_QUESTIONS[qualificationIndex];
    
    return (
      <TooltipProvider>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("w-full", className)}
        >
          <Card className="border-2 border-[#12EBFC]/30 bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden">
            {/* Enhanced Progress Bar for Mobile */}
            <div className="h-2 bg-slate-200">
              <motion.div
                className="h-full bg-gradient-to-r from-[#02205B] via-[#0884AA] to-[#12EBFC]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <CardContent className="p-3 sm:p-6">
                  {/* Mobile-First Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {canGoBack && (
                        <button
                          onClick={handleGoBack}
                          disabled={isAnimating}
                          className="h-9 w-9 sm:h-8 sm:w-8 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center transition-colors disabled:opacity-50 touch-manipulation"
                          data-testid="button-go-back"
                        >
                          <ArrowLeft className="h-4 w-4 text-slate-600" />
                        </button>
                      )}
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#02205B] to-[#0884AA] flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {qualQuestion.field === "revenue" && (
                        <CurrencySelector 
                          value={currency} 
                          onChange={handleCurrencyChange}
                          compact
                          className="h-8 w-[85px]"
                        />
                      )}
                      {/* Mobile-optimized progress counter */}
                      <div className="bg-[#02205B] text-white px-3 py-1.5 rounded-full text-xs font-bold">
                        {currentOverallQuestion + 1} of {totalQuestions}
                      </div>
                    </div>
                  </div>
                  {/* Visible step label on mobile */}
                  <div className="mb-2">
                    <span className="text-xs text-[#02205B] font-medium">Step 1 · About Your Organisation</span>
                  </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={qualQuestion.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start gap-2 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-[#02205B] leading-snug flex-1">
                      {qualQuestion.text}
                    </h3>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="flex-shrink-0 h-5 w-5 rounded-full bg-[#02205B]/10 hover:bg-[#02205B]/20 flex items-center justify-center transition-colors">
                          <Info className="h-3 w-3 text-[#02205B]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[250px] text-xs">
                        {qualQuestion.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Mobile-optimized options with larger touch targets */}
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                    {qualQuestion.options.map((option, idx) => {
                      const displayLabel = qualQuestion.field === "revenue" 
                        ? getConvertedRevenueLabel(option.label, currency)
                        : option.label;
                      return (
                        <motion.button
                          key={option.value}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => handleQualificationAnswer(option.value)}
                          disabled={isAnimating}
                          className={cn(
                            "w-full text-left p-3 sm:p-3.5 rounded-xl border-2 transition-all touch-manipulation min-h-[48px]",
                            "hover:border-[#02205B] hover:bg-[#02205B]/5",
                            "active:scale-[0.98] active:border-[#02205B] active:bg-[#02205B]/10",
                            "focus:outline-none focus:ring-2 focus:ring-[#12EBFC]/50",
                            isAnimating && "opacity-50 pointer-events-none"
                          )}
                          data-testid={`qual-option-${option.value}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-foreground">{displayLabel}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </TooltipProvider>
    );
  }

  const question = PREVIEW_QUESTIONS[currentQuestion];

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("w-full", className)}
      >
        <Card className="border-2 border-[#12EBFC]/30 bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden">
          {/* Enhanced Progress Bar for Mobile */}
          <div className="h-2 bg-slate-200">
            <motion.div
              className="h-full bg-gradient-to-r from-[#02205B] via-[#0884AA] to-[#12EBFC]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <CardContent className="p-3 sm:p-6">
            {/* Mobile-First Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoBack}
                  disabled={isAnimating}
                  className="h-9 w-9 sm:h-8 sm:w-8 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center transition-colors disabled:opacity-50 touch-manipulation"
                  data-testid="button-go-back-maturity"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-4 sm:w-4 text-slate-600" />
                </button>
                <div className="h-8 w-8 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-[#0884AA] to-[#12EBFC] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              </div>
              {/* Mobile-optimized progress counter */}
              <div className="flex items-center gap-2">
                <div className="bg-[#02205B] text-white px-3 py-1.5 rounded-full text-xs font-bold">
                  {currentOverallQuestion + 1} of {totalQuestions}
                </div>
              </div>
            </div>
            {/* Visible dimension badge on mobile */}
            <div className="mb-2">
              <span className="text-xs text-[#0884AA] font-medium">Step 2 · Maturity Assessment</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-3 sm:mb-4">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold text-white bg-[#0884AA] rounded uppercase tracking-wide">
                    {question.dimension}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[#02205B] mb-3 leading-snug">
                  {question.text}
                </h3>
                <div className="bg-gradient-to-r from-[#0884AA]/10 to-[#12EBFC]/10 border-l-3 border-[#0884AA] rounded-r-lg p-3 mb-4">
                  <p className="text-sm text-[#02205B] leading-relaxed">
                    {question.tooltip}
                  </p>
                  <p className="text-xs text-[#0884AA] mt-1.5 font-medium">
                    {question.whyItMatters}
                  </p>
                </div>

                {/* Mobile-optimized option buttons with larger touch targets */}
                <div className="space-y-2.5">
                  {question.options.map((option, idx) => (
                    <motion.button
                      key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => handleAnswer(option.value)}
                      disabled={isAnimating}
                      className={cn(
                        "w-full text-left p-3 sm:p-3.5 rounded-xl border-2 transition-all touch-manipulation min-h-[52px]",
                        "hover:border-[#0884AA] hover:bg-[#0884AA]/5",
                        "active:scale-[0.98] active:border-[#0884AA] active:bg-[#0884AA]/10",
                        "focus:outline-none focus:ring-2 focus:ring-[#12EBFC]/50",
                        isAnimating && "opacity-50 pointer-events-none"
                      )}
                      data-testid={`preview-option-${option.value}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                            option.value >= 4 ? "bg-emerald-100 text-emerald-700" :
                            option.value >= 3 ? "bg-blue-100 text-blue-700" :
                            option.value >= 2 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {option.value}
                          </span>
                          <span className="text-xs sm:text-sm text-foreground truncate">{option.label}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-3 sm:mt-4">
              Using 1-5 maturity scale consistent with full assessment
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
