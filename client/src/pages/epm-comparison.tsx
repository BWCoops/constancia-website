import { useState, useMemo, Fragment, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Hook to detect reduced motion preference for accessibility and performance
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Hook to detect mobile/touch devices for performance optimizations
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches || 
           window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  });

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
    
    const handleChange = () => {
      setIsMobile(mobileQuery.matches || touchQuery.matches);
    };
    
    mobileQuery.addEventListener('change', handleChange);
    touchQuery.addEventListener('change', handleChange);
    return () => {
      mobileQuery.removeEventListener('change', handleChange);
      touchQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}

import { 
  trackPageView, 
  trackComparisonToolOpened, 
  trackComparisonExport 
} from "@/lib/funnel-analytics";
import { 
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle2, 
  XCircle,
  Trophy,
  Scale,
  BarChart3,
  Brain,
  Cog,
  DollarSign,
  HeadphonesIcon,
  TrendingUp,
  Building2,
  Sparkles,
  Globe,
  Layers,
  Target,
  Clock,
  Star,
  ShoppingCart,
  Link2,
  Shield,
  Zap,
  Users,
  Bot,
  Database,
  FileText,
  Cpu,
  Info,
  Download,
  FileSpreadsheet,
  Loader2,
  Lock,
  Search,
  Award,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Settings,
  Wrench,
  PiggyBank,
  Server,
  Calculator,
  Cloud,
  Eye,
  Factory,
  Lightbulb,
  Briefcase,
  Heart,
  HeartPulse,
  Landmark,
  Phone,
  Truck,
  Shield as ShieldIcon,
  Home,
  Film,
  GraduationCap,
  UtensilsCrossed,
  HelpCircle,
  Sliders,
  LineChart,
} from "lucide-react";
// Export utilities loaded dynamically on-demand to reduce initial bundle
const loadExportUtils = () => import("@/lib/export-utils");
import { ChartPopoutModal, captureChartToImage } from "@/components/chart-popout-modal";
import { TablePopoutModal } from "@/components/table-popout-modal";
import { Link } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { EPM_SCORING, affordabilityPenalty, normaliseWeights, clamp } from "@shared/scoring-engine";
import { SEOHead } from "@/components/seo-head";
import { CookiePreferencesIcon } from "@/components/cookie-consent";
import { DownloadGateModal } from "@/components/download-gate-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { epmPlatforms } from "@/data/comparison-platforms/epm-platforms";
import { erpPlatforms } from "@/data/comparison-platforms/erp-platforms";
import { aiPlatforms } from "@/data/comparison-platforms/ai-platforms";
import {
  aiPlatformContextMap,
  erpStackAlignmentMap,
  companySizeOptions,
  techStackOptions,
  erpLandscapeOptions,
  epmCategories,
  erpCategories,
  aiCategories,
  epmWeightPresets,
  erpWeightPresets,
  industryWeightPresets,
} from "@/data/comparison-platforms/platform-config";
import type {
  Platform,
  Category,
  WeightPreset,
  AIPlatformContext,
  ERPStackAlignment,
  AICompanyProfile,
  ERPAffinityLevel,
  SweetSpot,
  CompanyProfile,
  FitResult,
} from "@/data/comparison-platforms/types";

interface FeatureCategory {
  category: string;
  features: {
    name: string;
    values: Record<string, boolean | string>;
  }[];
}

interface ImplementationPhase {
  name: string;
  startWeek: number;
  endWeek: number;
  color: string;
}

interface PlatformTimeline {
  platformId: string;
  platformName: string;
  totalMonths: { min: number; max: number };
  phases: ImplementationPhase[];
}

const revenueRanges = [
  { id: 'under-10m', label: 'Under £10M', value: 10 },
  { id: '10m-50m', label: '£10M - £50M', value: 50 },
  { id: '50m-250m', label: '£50M - £250M', value: 250 },
  { id: '250m-1b', label: '£250M - £1B', value: 1000 },
  { id: 'over-1b', label: 'Over £1B', value: 5000 },
] as const;

const companySizes = [
  { id: 'startup', label: 'Under 50 employees', value: 50 },
  { id: 'small', label: '50-250 employees', value: 250 },
  { id: 'medium', label: '250-1,000 employees', value: 1000 },
  { id: 'large', label: '1,000-5,000 employees', value: 5000 },
  { id: 'enterprise', label: '5,000+ employees', value: 10000 },
] as const;

const erpLandscapes = [
  { id: 'oracle', label: 'Oracle ERP' },
  { id: 'sap', label: 'SAP S/4HANA' },
  { id: 'microsoft', label: 'Microsoft 365' },
  { id: 'netsuite', label: 'NetSuite' },
  { id: 'workday', label: 'Workday' },
  { id: 'sage', label: 'Sage Intacct' },
  { id: 'xero', label: 'Xero' },
  { id: 'quickbooks', label: 'QuickBooks' },
  { id: 'zoho', label: 'Zoho Books' },
  { id: 'freshbooks', label: 'FreshBooks' },
  { id: 'multi-vendor', label: 'Multiple ERPs' },
  { id: 'greenfield', label: 'Greenfield/Other' },
] as const;

const industries = [
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'financial-services', label: 'Financial Services' },
  { id: 'retail', label: 'Retail & Consumer' },
  { id: 'healthcare', label: 'Healthcare & Life Sciences' },
  { id: 'professional-services', label: 'Professional Services' },
  { id: 'technology', label: 'Technology & Software' },
  { id: 'energy', label: 'Energy & Utilities' },
  { id: 'public-sector', label: 'Public Sector & Government' },
  { id: 'agriculture', label: 'Agriculture & Agribusiness' },
  { id: 'real-estate', label: 'Real Estate & Property' },
  { id: 'transport-logistics', label: 'Transport & Logistics' },
  { id: 'construction', label: 'Construction & Engineering' },
  { id: 'media-entertainment', label: 'Media & Entertainment' },
  { id: 'telecommunications', label: 'Telecommunications' },
  { id: 'hospitality', label: 'Hospitality & Travel' },
  { id: 'education', label: 'Education' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'aerospace-defence', label: 'Aerospace & Defence' },
  { id: 'chemicals', label: 'Chemicals & Materials' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'banking', label: 'Banking & Capital Markets' },
  { id: 'private-equity', label: 'Private Equity & Investment' },
  { id: 'pharma', label: 'Pharmaceuticals' },
  { id: 'biotech', label: 'Biotechnology' },
  { id: 'medical-devices', label: 'Medical Devices' },
  { id: 'food-beverage', label: 'Food & Beverage' },
  { id: 'consumer-goods', label: 'Consumer Goods (FMCG)' },
  { id: 'fashion-apparel', label: 'Fashion & Apparel' },
  { id: 'ecommerce', label: 'E-commerce & Marketplace' },
  { id: 'gaming', label: 'Gaming & Interactive' },
  { id: 'sports', label: 'Sports & Entertainment' },
  { id: 'legal', label: 'Legal Services' },
  { id: 'consulting', label: 'Consulting & Advisory' },
  { id: 'recruitment', label: 'Recruitment & Staffing' },
  { id: 'mining', label: 'Mining & Extraction' },
  { id: 'renewables', label: 'Renewable Energy' },
  { id: 'oil-gas', label: 'Oil & Gas' },
  { id: 'shipping', label: 'Shipping & Maritime' },
  { id: 'aviation', label: 'Aviation & Airlines' },
  { id: 'nonprofit', label: 'Non-Profit & Charities' },
  { id: 'higher-education', label: 'Higher Education' },
  { id: 'government-local', label: 'Local Government' },
  { id: 'government-central', label: 'Central Government' },
  { id: 'fintech', label: 'FinTech' },
  { id: 'saas', label: 'SaaS & Cloud Services' },
  { id: 'cybersecurity', label: 'Cybersecurity' },
  { id: 'data-analytics', label: 'Data & Analytics' },
  { id: 'ai-ml', label: 'AI & Machine Learning' },
] as const;

const rankingSources = [
  {
    name: 'Constancia Industry Experience',
    year: 2025,
    description: 'Scores, fit recommendations, and vendor comparisons are based on Constancia consultant experience and publicly available information.',
    isPrimary: true
  },
  {
    name: 'Gartner Magic Quadrant for Financial Planning Software 2025',
    year: 2025,
    description: 'Vendor placements referenced from publicly available announcements. Key 2025 theme: AI and Agentic Automation driving planning transformation.',
    verifiedLeaders: ['Anaplan', 'Jedox', 'OneStream', 'SAP', 'CCH Tagetik', 'Workday']
  },
  {
    name: 'Forrester, IDC & Industry Research',
    year: 2025,
    description: 'Additional context drawn from publicly available analyst commentary and vendor materials.'
  }
];

const epmSweetSpots: Record<string, SweetSpot> = {
  onestream: {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['oracle', 'sap', 'microsoft', 'workday', 'multi-vendor', 'greenfield'],
    industries: ['manufacturing', 'financial-services', 'healthcare', 'retail', 'energy', 'real-estate'],
    winningScenario: 'Complex multi-entity consolidation with regulatory reporting',
    narrative: 'OneStream excels for large enterprises with complex group structures requiring unified consolidation, planning, and reporting. 5th consecutive year as Leader in Gartner MQ 2025. SensibleAI delivers agentic automation for finance. Particularly strong for organisations with multiple ERPs. The XF Marketplace accelerates value with pre-built solutions. Industry strength: Manufacturing (multi-plant), Financial Services (profitability analysis), Healthcare (operational analytics). When this tool wins: Choose for complex multi-ERP consolidation + planning when cost and complexity are acceptable. Best all-rounder for statutory close with enterprise planning.',
    sources: ['Gartner MQ 2025: Leader']
  },
  "onestream-cpm-express": {
    revenueBands: ['50m-250m'],
    companySizes: ['medium'],
    erpLandscapes: ['microsoft', 'netsuite', 'sage', 'quickbooks'],
    industries: ['manufacturing', 'professional-services', 'retail', 'healthcare', 'technology'],
    winningScenario: 'Mid-market organisations (£50M-£250M) seeking enterprise-grade EPM without enterprise complexity',
    narrative: 'OneStream CPM Express delivers full OneStream capabilities purpose-built for mid-market organisations (£50M-£250M revenue, 200-1,000 employees). Pre-configured solutions enable 3-6 month implementation with optimised licensing for under 50 users. Too expensive for startups and smaller companies - Jedox, Vena, or Pigment offer better value at lower revenue bands. Industry strength: Mid-market manufacturing, professional services, healthcare. When this tool wins: Choose when you want enterprise EPM capabilities at mid-market pace and price. Not suitable for smaller companies (under £50M) or large enterprises requiring extensive customisation.',
    sources: ['OneStream Product Portfolio 2025']
  },
  pigment: {
    revenueBands: ['50m-250m', '250m-1b'],
    companySizes: ['medium', 'large'],
    erpLandscapes: ['greenfield', 'netsuite', 'microsoft', 'oracle', 'sap'],
    industries: ['technology', 'professional-services', 'media-entertainment', 'financial-services', 'saas'],
    winningScenario: 'Mid-market organisations seeking modern AI-driven planning - can extend into enterprise',
    narrative: 'Pigment is a next-generation planning platform with its sweet spot in the mid-market (250-5,000 employees) but increasingly playing in the enterprise space. Agentic AI, real-time scenario planning, and modern UX differentiate it from legacy EPM. Strong for connected planning across Finance, Sales, and HR. Pricing (£50K-£200K/year) suits mid-market and above. Native financial consolidation (launched 2025) with IFRS starter kit expanding use cases but not yet at the depth of OneStream or Tagetik for complex statutory needs. Industry strength: Technology (SaaS metrics, ARR forecasting), Financial Services (connected planning), Professional Services (resource planning). When this tool wins: Choose for mid-market organisations wanting modern, AI-driven planning with faster deployment than legacy EPM vendors. Can extend into enterprise when connected planning and UX matter more than deep statutory consolidation.',
    sources: ['Gartner MQ 2025: Visionary']
  },
  oracle: {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['oracle'],
    industries: ['manufacturing', 'financial-services', 'retail', 'healthcare', 'professional-services', 'technology', 'energy', 'public-sector', 'telecommunications'],
    winningScenario: 'Oracle ERP ecosystem customers seeking integrated EPM',
    narrative: 'Oracle Cloud EPM provides unmatched integration for Oracle ERP customers. The unified platform delivers comprehensive financial close, planning, and reporting with enterprise-grade scalability. Industry strength: Retail (merchandise planning), Energy (capital planning), Telecommunications (revenue management). When this tool wins: Choose when you have Oracle ERP ecosystem. Strongest value proposition when native Oracle integration drives data strategy.',
    sources: ['Gartner MQ 2025: Included']
  },
  anaplan: {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['oracle', 'sap', 'microsoft', 'workday', 'multi-vendor', 'greenfield'],
    industries: ['manufacturing', 'retail', 'technology', 'healthcare', 'automotive', 'transport-logistics'],
    winningScenario: 'Connected enterprise-wide planning across finance, sales, and supply chain',
    narrative: 'Anaplan leads in connected planning scenarios where cross-functional alignment is critical. 9th consecutive year as Leader in Gartner MQ 2025. IDC Leader for Supply Chain Planning 2025. Hyperblock technology handles massive datasets across the enterprise. Industry strength: Manufacturing (S&OP), Retail (inventory optimisation), Automotive (production planning). When this tool wins: Choose for connected enterprise-wide planning across finance, sales, and supply chain. Best when consolidation is handled elsewhere or not required.',
    sources: ['Gartner MQ 2025: Leader']
  },
  board: {
    revenueBands: ['50m-250m', '250m-1b'],
    companySizes: ['medium', 'large'],
    erpLandscapes: ['microsoft', 'netsuite', 'sage', 'greenfield'],
    industries: ['retail', 'manufacturing', 'hospitality', 'transport-logistics'],
    winningScenario: 'Unified BI and EPM for mid-market data-driven decisions',
    narrative: 'Board uniquely combines Business Intelligence with EPM for organisations wanting a single platform for analytics, planning, and simulation. Excellent for mid-market companies valuing self-service capabilities without separate BI tools. Industry strength: Retail (merchandising analytics), Hospitality (revenue management). When this tool wins: Choose for unified BI + EPM when separate analytics tools are undesirable. Good mid-market value when management consolidation (not statutory) is sufficient.',
    sources: ['Gartner MQ 2025: Included']
  },
  sapbpc: {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['sap'],
    industries: ['manufacturing', 'energy', 'chemicals', 'automotive', 'aerospace-defence'],
    winningScenario: 'SAP S/4HANA environment requiring integrated planning',
    narrative: 'SAP BPC is the natural choice for SAP-centric organisations. Deep integration with S/4HANA and Group Reporting provides seamless data flow and consistent processes. Industry strength: Manufacturing (materials planning), Chemicals (process manufacturing), Automotive (complex BoM management). When this tool wins: Choose only for existing SAP BPC estates requiring near-term stability. Plan migration to SAP SAC + Group Reporting. Legacy status limits future investment.',
    sources: ['Gartner MQ 2025: Leader (SAP Analytics Cloud)']
  },
  "sap-sac-gr": {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['sap'],
    industries: ['manufacturing', 'automotive', 'chemicals', 'energy', 'retail', 'financial-services'],
    winningScenario: 'SAP S/4HANA or SAP ECC customers wanting native planning, consolidation and reporting integrated with SAP ERP and BI',
    narrative: 'SAP Analytics Cloud + Group Reporting is the strategic choice for SAP-centric enterprises. Real-time integration with S/4HANA Universal Journal eliminates data latency. SAP Business AI with Joule enables conversational analytics. Group Reporting handles statutory consolidation with multi-GAAP support. Best for organisations committed to SAP ecosystem long-term. When this tool wins: Choose when you have SAP S/4HANA or ECC and want a unified, future-proof EPM stack from SAP with native integration.',
    sources: ['Gartner MQ 2025: Leader (SAP Analytics Cloud)']
  },
  "cch-tagetik": {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['oracle', 'sap', 'microsoft', 'workday', 'multi-vendor', 'greenfield'],
    industries: ['financial-services', 'insurance', 'public-sector', 'healthcare'],
    winningScenario: 'Heavy regulatory and compliance requirements with disclosure management',
    narrative: 'CCH Tagetik from Wolters Kluwer leads for organisations with complex regulatory reporting, ESG disclosure, and compliance requirements. 5th time as Leader in Gartner MQ 2025. AI-powered automation for financial close and compliance. Pre-built templates for IFRS 16, IFRS 17, Solvency II, Basel III. Industry strength: Insurance (IFRS 17), Banking (Basel III, FINREP/COREP), Public Sector (statutory reporting). When this tool wins: Choose when regulatory compliance, ESG disclosure, or tax reporting are primary drivers. Unmatched for IFRS 16/17, Solvency II, Basel III requirements.',
    sources: ['Gartner MQ 2025: Leader']
  },
  jedox: {
    revenueBands: ['under-10m', '10m-50m', '50m-250m'],
    companySizes: ['startup', 'small', 'medium'],
    erpLandscapes: ['sage', 'microsoft', 'netsuite', 'xero', 'quickbooks', 'zoho', 'freshbooks', 'greenfield'],
    industries: ['manufacturing', 'retail', 'professional-services', 'healthcare'],
    winningScenario: 'Excel-centric FP&A teams seeking governance without complexity',
    narrative: 'Jedox empowers finance teams who love Excel but need enterprise planning capabilities. 2,900+ customers across 140 countries. Self-service approach enables rapid model building. Excellent value for small companies with basic accounting systems like Xero or QuickBooks. Industry strength: Manufacturing (decentralised planning), Retail (promotions management), Healthcare (service line reporting). When this tool wins: Choose for Excel-centric finance teams in cost-sensitive mid-market. Best when governance over spreadsheets matters more than enterprise-scale consolidation.',
    sources: ['Gartner MQ 2025: Leader']
  },
  "ibm-planning-analytics": {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['oracle', 'sap', 'microsoft', 'multi-vendor', 'greenfield'],
    industries: ['manufacturing', 'financial-services', 'retail', 'hospitality', 'automotive'],
    winningScenario: 'Complex multidimensional modelling and what-if analysis',
    narrative: 'IBM TM1 delivers unmatched power for complex, calculation-intensive planning scenarios. The in-memory OLAP engine handles sophisticated models that other platforms struggle with. Industry strength: Retail (buying budgets - Sports Direct), Hospitality (budget consolidation - Riu Hotels), Automotive (HR planning - Volkswagen). When this tool wins: Choose for complex multidimensional modelling where existing TM1 skills exist. Best TCO when internal expertise reduces implementation dependency.',
    sources: ['Gartner MQ 2025: Included']
  },
  vena: {
    revenueBands: ['10m-50m', '50m-250m'],
    companySizes: ['small', 'medium'],
    erpLandscapes: ['microsoft', 'netsuite', 'sage', 'xero', 'quickbooks', 'zoho', 'freshbooks', 'greenfield'],
    industries: ['professional-services', 'technology', 'education', 'hospitality'],
    winningScenario: 'Small-to-mid-market Excel-native planning with Microsoft 365 integration',
    narrative: 'Vena leverages existing Excel skills with native M365 Copilot integration. 100% recommendation score in Dresner 2025. Offers financial close and consolidation with multi-entity, multi-currency support alongside pre-built templates and rapid deployment. Primary sweet spot is small-to-mid-market organisations (£10M-£250M revenue) outgrowing basic accounting systems. Very early-stage companies and those under £10M revenue are better served by lighter tools such as Runway or Datarails. Industry strength: Professional Services (resource planning), Technology (headcount planning), Education (budget management). When this tool wins: Choose for small-to-mid-market Microsoft 365 organisations needing planning, consolidation, and Excel-native governance.',
    sources: ['IDC MarketScape 2025: Leader for Mid-Market']
  },
  "workday-adaptive": {
    revenueBands: ['50m-250m', '250m-1b', 'over-1b'],
    companySizes: ['medium', 'large', 'enterprise'],
    erpLandscapes: ['workday', 'greenfield'],
    industries: ['technology', 'professional-services', 'healthcare', 'retail', 'financial-services'],
    winningScenario: 'Mid-market FP&A teams with Workday HCM or Workday Finance seeking native planning integration',
    narrative: 'Workday Adaptive Planning excels for organisations in the Workday ecosystem. Native HCM integration enables sophisticated workforce planning with automatic headcount cost modelling. Strong for driver-based budgeting and rolling forecasts. Less suited for complex statutory consolidation. Industry strength: Professional Services (resource planning), Healthcare (workforce planning), Technology (SaaS planning). When this tool wins: Choose when you have Workday HCM/Finance and need integrated workforce + financial planning with fast implementation.',
    sources: ['Gartner MQ 2025: Leader']
  },
  abacum: {
    revenueBands: ['10m-50m', '50m-250m', '250m-1b'],
    companySizes: ['small', 'medium'],
    erpLandscapes: ['netsuite', 'sage', 'xero', 'quickbooks', 'zoho', 'freshbooks', 'greenfield'],
    industries: ['technology', 'professional-services', 'saas', 'fintech', 'ecommerce'],
    winningScenario: 'Mid-market finance teams seeking modern FP&A with rapid deployment and low TCO',
    narrative: 'Abacum is a modern FP&A platform where intelligent forecasting, anomaly detection, and variance analysis are foundational, not modules. Primary sweet spot is mid-market organisations seeking modern FP&A without enterprise complexity. Fastest deployment in the segment: 4-6 weeks vs months for comparable platforms. £40-60K/year licensing with minimal consulting (£20-35K vs £75-150K+ for Pigment). 700+ native integrations including Rippling, NetSuite, and Xero. Growth-stage companies also benefit from its rapid time-to-value and low TCO. Not suitable for statutory consolidation, group structures, or regulatory reporting. Industry strength: Technology (ARR/SaaS metrics), Professional Services (headcount and project forecasting), Fintech (unit economics). When this tool wins: Choose for mid-market FP&A when speed of deployment and low total cost matter more than statutory consolidation depth.',
    sources: ['Abacum Product 2025']
  },
  runway: {
    revenueBands: ['under-10m', '10m-50m', '50m-250m'],
    companySizes: ['startup', 'small', 'medium'],
    erpLandscapes: ['netsuite', 'sage', 'xero', 'quickbooks', 'zoho', 'freshbooks', 'greenfield'],
    industries: ['technology', 'saas', 'fintech', 'professional-services', 'ecommerce'],
    winningScenario: 'Startups and growth-stage companies (20-500 employees) wanting visual, AI-first FP&A',
    narrative: 'Runway is an AI-first FP&A platform built for modern finance teams at startups and growth-stage companies. Visual drag-and-drop modelling makes financial planning accessible to non-finance stakeholders. 200+ native integrations with ERP, HRIS, and billing systems. Competes directly with Abacum and Mosaic in the SMB AI-first FP&A segment. Strongest for SaaS unit economics, headcount planning, and scenario modelling. No statutory consolidation - purely operational planning. Industry strength: SaaS (ARR/MRR modelling), Technology (headcount planning), Fintech (unit economics). When this tool wins: Choose when visual modelling, fast deployment, and collaboration matter more than consolidation or regulatory reporting.',
    sources: ['Runway Product 2025 (runway.com)', 'G2 Reviews']
  },
  datarails: {
    revenueBands: ['under-10m', '10m-50m', '50m-250m'],
    companySizes: ['startup', 'small', 'medium'],
    erpLandscapes: ['netsuite', 'sage', 'xero', 'quickbooks', 'microsoft', 'zoho', 'freshbooks', 'greenfield'],
    industries: ['technology', 'professional-services', 'manufacturing', 'retail', 'healthcare'],
    winningScenario: 'Excel-centric finance teams wanting automated FP&A without leaving spreadsheets',
    narrative: 'Datarails keeps Excel as the primary interface whilst automating data consolidation from ERP, CRM, and HRIS systems. AI-powered narrative insights explain variances automatically. Competes with Vena and Jedox in the Excel-native segment but with stronger AI capabilities and faster deployment. Particularly strong for NetSuite and Sage customers. 400+ integrations. No statutory consolidation - focused on management reporting and FP&A automation. Industry strength: Broad industry applicability for Excel-centric teams. When this tool wins: Choose when your team loves Excel but needs automated data gathering, AI-powered insights, and rapid deployment without change management risk.',
    sources: ['Datarails Product 2025', 'G2 Reviews']
  },
  cube: {
    revenueBands: ['10m-50m', '50m-250m'],
    companySizes: ['small', 'medium'],
    erpLandscapes: ['netsuite', 'sage', 'microsoft', 'xero', 'quickbooks', 'greenfield'],
    industries: ['technology', 'professional-services', 'retail', 'healthcare', 'manufacturing'],
    winningScenario: 'Mid-market finance teams wanting spreadsheet-connected planning with strong modelling',
    narrative: 'Cube bridges the gap between spreadsheet flexibility and enterprise planning rigour. Multi-dimensional data model supports complex analysis whilst maintaining native Excel and Google Sheets connectivity. Strong approval workflows and governance. Competes with Vena and Datarails but with deeper multi-dimensional modelling. Less suited for startups (pricing) or enterprises (scale). Industry strength: Technology (departmental budgeting), Professional Services (resource planning). When this tool wins: Choose when you need more modelling power than Datarails but want to keep spreadsheet workflows. Best for mid-market teams outgrowing basic FP&A tools.',
    sources: ['Cube Product 2025', 'G2 Reviews']
  },
  mosaic: {
    revenueBands: ['under-10m', '10m-50m'],
    companySizes: ['startup', 'small'],
    erpLandscapes: ['netsuite', 'xero', 'quickbooks', 'zoho', 'freshbooks', 'greenfield'],
    industries: ['technology', 'saas', 'fintech', 'ecommerce'],
    winningScenario: 'Fast-growing SaaS companies wanting real-time financial insights and automated reporting',
    narrative: 'Mosaic is purpose-built for SaaS and technology companies. Automated metric calculations (ARR, burn rate, runway, unit economics) with real-time dashboards. Board-ready reporting out of the box. Competes with Runway and Abacum but with stronger SaaS-specific metrics focus. Narrow vertical focus limits broader applicability. Very limited consolidation. Industry strength: SaaS (automated metrics), Fintech (unit economics). When this tool wins: Choose for early-stage SaaS companies (seed to Series C) wanting automated SaaS metrics, real-time visibility, and board reporting without spreadsheet dependency.',
    sources: ['Mosaic Product 2025']
  },
  drivetrain: {
    revenueBands: ['10m-50m', '50m-250m'],
    companySizes: ['small', 'medium'],
    erpLandscapes: ['netsuite', 'sage', 'microsoft', 'xero', 'quickbooks', 'greenfield'],
    industries: ['technology', 'saas', 'professional-services', 'retail', 'healthcare'],
    winningScenario: 'Revenue-focused mid-market teams wanting driver-based planning and scenario modelling',
    narrative: 'Drivetrain provides powerful driver-based modelling for mid-market finance teams. Flexible KPI framework supports custom metrics and complex revenue models. Strong pipeline and revenue planning capabilities. Competes with Cube and Pigment but with deeper driver-based modelling. Less established brand than competitors. Industry strength: Technology (revenue forecasting), SaaS (pipeline modelling). When this tool wins: Choose when driver-based planning and scenario modelling are top priorities. Best for mid-market teams needing more modelling depth than Runway or Abacum.',
    sources: ['Drivetrain Product 2025']
  },
  liveflow: {
    revenueBands: ['under-10m', '10m-50m'],
    companySizes: ['startup', 'small'],
    erpLandscapes: ['xero', 'quickbooks', 'greenfield'],
    industries: ['technology', 'professional-services', 'saas', 'ecommerce', 'retail'],
    winningScenario: 'Small finance teams wanting automated real-time reporting from QuickBooks or Xero',
    narrative: 'LiveFlow is the lightest-weight option in the FP&A category - a reporting automation tool rather than a full planning platform. Automatically syncs QuickBooks and Xero data into Google Sheets for real-time P&L, cash flow, and multi-entity reports. Fastest time-to-value (1-2 weeks) and lowest cost entry point. Very limited planning and modelling depth. Competes at the entry level below Abacum and Runway. Industry strength: Small business reporting automation. When this tool wins: Choose when you only need automated financial reporting, not planning or modelling. Best for very small finance teams (1-5 people) on QuickBooks or Xero.',
    sources: ['LiveFlow Product 2025']
  },
  vareto: {
    revenueBands: ['10m-50m', '50m-250m'],
    companySizes: ['small', 'medium'],
    erpLandscapes: ['netsuite', 'sage', 'microsoft', 'xero', 'quickbooks', 'greenfield'],
    industries: ['technology', 'saas', 'professional-services', 'fintech'],
    winningScenario: 'Strategic finance teams wanting unified planning, analysis, and reporting',
    narrative: 'Vareto unifies planning, analysis, and reporting for mid-market strategic finance teams. Strong cross-functional collaboration between finance and business teams. Sophisticated variance analysis with drill-down capabilities. Competes with Pigment and Cube but with stronger board-ready reporting focus. Newer entrant with smaller customer base. Industry strength: Technology (strategic planning), SaaS (cross-functional budgets). When this tool wins: Choose when strategic finance alignment across departments is the priority. Best for mid-market companies (100-2,000 employees) wanting unified planning and analysis.',
    sources: ['Vareto Product 2025']
  },
  planful: {
    revenueBands: ['10m-50m', '50m-250m', '250m-1b'],
    companySizes: ['small', 'medium', 'large'],
    erpLandscapes: ['netsuite', 'sage', 'microsoft', 'oracle', 'greenfield'],
    industries: ['technology', 'professional-services', 'healthcare', 'manufacturing', 'financial-services'],
    winningScenario: 'Mid-market organisations wanting structured FP&A with consolidation capabilities',
    narrative: 'Planful bridges the gap between lightweight FP&A tools and enterprise EPM. Structured Predict capabilities for AI-powered forecasting. Stronger consolidation than AI-first competitors but lighter than OneStream or Tagetik. Strong for mid-market companies needing both planning and consolidation. Industry strength: Healthcare (budget management), Technology (revenue forecasting). When this tool wins: Choose when you need planning AND light consolidation in one platform. Best for mid-market companies that need more depth than Abacum but less complexity than OneStream.',
    sources: ['Gartner MQ 2025: Challenger']
  },
  prophix: {
    revenueBands: ['10m-50m', '50m-250m'],
    companySizes: ['small', 'medium'],
    erpLandscapes: ['sage', 'microsoft', 'netsuite', 'quickbooks', 'greenfield'],
    industries: ['manufacturing', 'retail', 'professional-services', 'healthcare'],
    winningScenario: 'Mid-market companies wanting affordable budgeting and reporting',
    narrative: 'Prophix (now part of Pound & Grain) provides mid-market budgeting and financial reporting. Strong automated reporting capabilities and affordable pricing. Less AI-forward than newer competitors but solid for traditional FP&A workflows. Industry strength: Manufacturing (operational budgets), Retail (store-level planning). When this tool wins: Choose when traditional budgeting, reporting, and consolidation matter more than AI innovation. Good value for mid-market companies with straightforward FP&A needs.',
    sources: ['IDC MarketScape 2025']
  }
};

const erpSweetSpots: Record<string, SweetSpot> = {
  "oracle-erp": {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['oracle', 'multi-vendor', 'greenfield'],
    industries: ['manufacturing', 'financial-services', 'healthcare', 'retail', 'technology', 'energy', 'public-sector'],
    winningScenario: 'Large enterprise with complex global operations and Oracle ecosystem',
    narrative: 'Oracle Cloud ERP excels for large enterprises requiring comprehensive, AI-embedded ERP with strong financial management and regulatory compliance. Particularly strong when paired with Oracle EPM for unified finance operations. Industry strength: Financial Services (complex regulatory), Manufacturing (multi-plant operations), Healthcare (compliance-heavy).',
    sources: ['Gartner MQ 2025: Leader for Cloud ERP']
  },
  "sap-s4hana": {
    revenueBands: ['250m-1b', 'over-1b'],
    companySizes: ['large', 'enterprise'],
    erpLandscapes: ['sap', 'greenfield'],
    industries: ['manufacturing', 'automotive', 'chemicals', 'aerospace-defence', 'energy', 'retail'],
    winningScenario: 'Very large enterprise with complex manufacturing and global supply chains',
    narrative: 'SAP S/4HANA is the gold standard for complex manufacturing enterprises. In-memory HANA database delivers real-time analytics. 25+ industry-specific solutions cover automotive, chemicals, aerospace, and more. Best for organisations committed to SAP ecosystem long-term.',
    sources: ['Gartner MQ 2025: Leader for Cloud ERP']
  },
  "dynamics365": {
    revenueBands: ['50m-250m', '250m-1b'],
    companySizes: ['medium', 'large'],
    erpLandscapes: ['microsoft', 'greenfield'],
    industries: ['professional-services', 'technology', 'retail', 'manufacturing', 'financial-services'],
    winningScenario: 'Microsoft ecosystem organisation seeking modern, integrated ERP',
    narrative: 'Microsoft Dynamics 365 provides seamless integration with Microsoft 365, Power Platform, and Azure. Copilot AI assistant accelerates productivity. Best for organisations already invested in Microsoft stack seeking cloud-first ERP with strong user experience.',
    sources: ['Gartner MQ 2025: Challenger for Cloud ERP']
  },
  "workday-fin": {
    revenueBands: ['50m-250m', '250m-1b', 'over-1b'],
    companySizes: ['medium', 'large', 'enterprise'],
    erpLandscapes: ['workday', 'greenfield'],
    industries: ['professional-services', 'technology', 'healthcare', 'education', 'financial-services'],
    winningScenario: 'Service-centric organisations prioritising unified HCM and finance',
    narrative: 'Workday Financial Management excels where human capital is the primary asset. 4th consecutive year as Leader in Gartner MQ 2025 for Financial Planning Software. Workday Planning Agent delivers agentic automation for FP&A. Unified HCM-Finance platform delivers exceptional user experience and real-time analytics. Less suitable for heavy manufacturing or distribution, but unmatched for services and people-centric industries.',
    sources: ['Gartner MQ 2025: Visionary for Cloud ERP']
  },
  "netsuite": {
    revenueBands: ['10m-50m', '50m-250m', '250m-1b'],
    companySizes: ['small', 'medium', 'large'],
    erpLandscapes: ['netsuite', 'greenfield', 'multi-vendor'],
    industries: ['technology', 'retail', 'professional-services', 'media-entertainment', 'manufacturing'],
    winningScenario: 'Growing mid-market company with multi-subsidiary and e-commerce needs',
    narrative: 'NetSuite leads the mid-market as the original cloud ERP. Strong multi-subsidiary support, built-in e-commerce, and SuiteApps ecosystem. Rapid implementation (4-10 months) and scalable architecture. Best for fast-growing companies that will outgrow entry-level systems.',
    sources: ['Gartner MQ 2025: Leader (Mid-Market)']
  },
  "sage-intacct": {
    revenueBands: ['10m-50m', '50m-250m'],
    companySizes: ['small', 'medium'],
    erpLandscapes: ['sage', 'greenfield', 'microsoft'],
    industries: ['professional-services', 'technology', 'healthcare', 'financial-services', 'education'],
    winningScenario: 'Mid-market finance-focused organisation with complex multi-entity needs',
    narrative: 'Sage Intacct is purpose-built for finance teams. AICPA-preferred solution with best-in-class multi-entity consolidation and dimensional reporting. Fastest implementation (4-8 months) and excellent TCO. Lighter on manufacturing/distribution but unmatched for finance-centric mid-market.',
    sources: ['Gartner MQ 2025: Leader (Mid-Market)']
  },
  "infor-cloudsuite": {
    revenueBands: ['50m-250m', '250m-1b', 'over-1b'],
    companySizes: ['medium', 'large', 'enterprise'],
    erpLandscapes: ['infor', 'greenfield'],
    industries: ['manufacturing', 'food-beverage', 'distribution', 'hospitality', 'healthcare'],
    winningScenario: 'Manufacturing or food & beverage organisation requiring deep industry functionality',
    narrative: 'Infor CloudSuite leads for Food & Beverage with traceability, shelf-life management, and recall capabilities. Industry-specific editions reduce implementation risk and deliver faster time-to-value. Coleman AI drives yield optimisation and product intelligence. Gartner MQ 2025 Leader for Product-Centric Cloud ERP.',
    sources: ['Gartner MQ 2025: Leader (Product-Centric)']
  },
  "ifs-cloud": {
    revenueBands: ['50m-250m', '250m-1b'],
    companySizes: ['medium', 'large'],
    erpLandscapes: ['ifs', 'greenfield'],
    industries: ['aerospace-defence', 'energy', 'manufacturing', 'transport-logistics', 'professional-services'],
    winningScenario: 'Asset-intensive or service-centric organisation with field operations',
    narrative: 'IFS Cloud excels in aerospace, defence, and asset-intensive industries. Industry-leading enterprise asset management and field service capabilities. Composable architecture enables tailored solutions. Strong for organisations where service delivery and asset lifecycle are critical.',
    sources: ['Gartner MQ 2025: Visionary for Cloud ERP']
  },
  "epicor-kinetic": {
    revenueBands: ['10m-50m', '50m-250m'],
    companySizes: ['small', 'medium'],
    erpLandscapes: ['epicor', 'greenfield'],
    industries: ['manufacturing', 'automotive', 'aerospace-defence', 'distribution'],
    winningScenario: 'Discrete manufacturing with complex configure-to-order requirements',
    narrative: 'Epicor Kinetic is purpose-built for discrete and make-to-order manufacturing. Deep shop floor integration, advanced MES, and configure-to-order capabilities. Good mid-market value proposition with flexible deployment. Best for manufacturers who need deep production capabilities without enterprise complexity.',
    sources: ['IDC MarketScape 2025: Major Player']
  },
  "acumatica": {
    revenueBands: ['under-10m', '10m-50m', '50m-250m'],
    companySizes: ['startup', 'small', 'medium'],
    erpLandscapes: ['acumatica', 'greenfield', 'sage'],
    industries: ['distribution', 'manufacturing', 'retail', 'professional-services', 'construction'],
    winningScenario: 'Budget-conscious mid-market seeking flexible, unlimited-user ERP',
    narrative: 'Acumatica offers unique consumption-based pricing with unlimited users. Best TCO in the market with rapid implementation (4-10 months). Strong open API and partner ecosystem. Best for cost-conscious growing companies in distribution and light manufacturing.',
    sources: ['Gartner MQ 2025: Challenger for Cloud ERP']
  },
  "campfire": {
    revenueBands: ['under-10m', '10m-50m'],
    companySizes: ['startup', 'small'],
    erpLandscapes: ['greenfield'],
    industries: ['technology', 'saas', 'professional-services', 'ecommerce', 'retail'],
    winningScenario: 'Small businesses and startups wanting AI-first accounting that automates bookkeeping',
    narrative: 'Campfire is an AI-first cloud accounting platform that automates bookkeeping for small businesses. Machine learning categorises transactions and reconciles accounts with minimal manual input. Competes with Xero and QuickBooks in the small business segment but with stronger AI automation. Very early-stage with limited track record. Not suited for multi-entity, manufacturing, or complex operations. Industry strength: Technology (automated categorisation), E-commerce (transaction volumes). When this tool wins: Choose when you want modern AI-first accounting for a small business with straightforward needs and no legacy ERP investment.',
    sources: ['Campfire Product 2025']
  },
  "xero": {
    revenueBands: ['under-10m', '10m-50m'],
    companySizes: ['startup', 'small'],
    erpLandscapes: ['xero', 'greenfield'],
    industries: ['professional-services', 'retail', 'technology', 'hospitality', 'construction'],
    winningScenario: 'Small businesses wanting cloud accounting with strong ecosystem and mobile experience',
    narrative: 'Xero is a leading cloud accounting platform for small businesses with 3.9M+ subscribers globally. Strong mobile app, bank reconciliation, and app marketplace. Best for small businesses (1-50 employees) with straightforward accounting needs. Not suited for complex multi-entity or manufacturing.',
    sources: ['Xero Annual Report 2025']
  },
  "quickbooks": {
    revenueBands: ['under-10m', '10m-50m'],
    companySizes: ['startup', 'small'],
    erpLandscapes: ['quickbooks', 'greenfield'],
    industries: ['professional-services', 'retail', 'construction', 'technology', 'healthcare'],
    winningScenario: 'Small businesses wanting established cloud accounting with strong tax and payroll',
    narrative: 'QuickBooks Online is the most widely used small business accounting platform. Strong tax integration, payroll, and accountant ecosystem. Best for small businesses (1-100 employees) in markets with strong Intuit presence. Less international than Xero.',
    sources: ['Intuit Product 2025']
  },
  "freshbooks": {
    revenueBands: ['under-10m'],
    companySizes: ['startup', 'small'],
    erpLandscapes: ['freshbooks', 'greenfield'],
    industries: ['professional-services', 'freelance', 'creative'],
    winningScenario: 'Freelancers and micro-businesses wanting simple invoicing and time tracking',
    narrative: 'FreshBooks is purpose-built for freelancers and micro-businesses focused on invoicing, time tracking, and expense management. Very simple to use but limited accounting depth. Not suited for growing businesses with complex needs.',
    sources: ['FreshBooks Product 2025']
  },
  "zoho": {
    revenueBands: ['under-10m', '10m-50m'],
    companySizes: ['startup', 'small'],
    erpLandscapes: ['zoho', 'greenfield'],
    industries: ['technology', 'professional-services', 'retail', 'ecommerce'],
    winningScenario: 'Small businesses wanting affordable accounting within the Zoho ecosystem',
    narrative: 'Zoho Books provides affordable cloud accounting as part of the broader Zoho ecosystem. Best for small businesses already using Zoho CRM, Projects, or People. Good value but less mature than Xero or QuickBooks for standalone use.',
    sources: ['Zoho Product 2025']
  }
};

// Scoring config is now centralised in shared/scoring-engine.ts.
// SCORING_CONFIG is preserved as a thin alias so the rest of the file
// reads unchanged; affordability penalty also re-exported from there
// (and uses max() semantics instead of stacking size + revenue).
const SCORING_CONFIG = {
  SWEET_SPOT_MATCH: EPM_SCORING.SWEET_SPOT_MATCH,
  SWEET_SPOT_MISS: EPM_SCORING.SWEET_SPOT_MISS,
  SWEET_SPOT_MISS_SMB: EPM_SCORING.SWEET_SPOT_MISS_SMB,
  EXPENSIVE_TIER: EPM_SCORING.EXPENSIVE_TIER,
  VERY_EXPENSIVE_TIER: EPM_SCORING.VERY_EXPENSIVE_TIER,
  AFFORDABILITY_BASE_PENALTY: EPM_SCORING.AFFORDABILITY_BASE_PENALTY,
  SIZE_REVENUE_MISMATCH_BASE: EPM_SCORING.SIZE_REVENUE_MISMATCH_BASE,
  FPA_FOCUS_BONUS: EPM_SCORING.FPA_FOCUS_BONUS,
  CONSOLIDATION_OVERHEAD_PENALTY: EPM_SCORING.CONSOLIDATION_OVERHEAD_PENALTY,
};

const calculateAffordabilityPenalty = affordabilityPenalty;

function calculateFitScore(
  platformId: string,
  sweetSpot: SweetSpot,
  profile: CompanyProfile,
  baseScore: number,
  priceTier: number = 3
): FitResult {
  let modifier = 0;
  const matchReasons: string[] = [];
  const concerns: string[] = [];

  const isSmallCompany = profile.companySize === 'startup' || profile.companySize === 'small';
  const isLowRevenue = profile.revenue === 'under-10m' || profile.revenue === '10m-50m';
  const isExpensiveVendor = priceTier >= SCORING_CONFIG.EXPENSIVE_TIER;
  const isVeryExpensiveVendor = priceTier >= SCORING_CONFIG.VERY_EXPENSIVE_TIER;

  if (profile.revenue) {
    if (sweetSpot.revenueBands.includes(profile.revenue)) {
      modifier += SCORING_CONFIG.SWEET_SPOT_MATCH;
      matchReasons.push('Revenue range aligns with vendor sweet spot');
    } else {
      // Reduced revenue penalty for SMB platforms when targeting startups/small companies
      // (prioritize company size over revenue for smaller organisations)
      if (isSmallCompany && ['jedox', 'vena', 'board', 'workday-adaptive', 'abacum', 'runway', 'datarails', 'cube', 'mosaic', 'drivetrain', 'liveflow', 'vareto'].includes(platformId)) {
        modifier += SCORING_CONFIG.SWEET_SPOT_MISS_SMB;
        // Specific concern for mid-market-focused platforms at very small revenue levels
        if (profile.revenue === 'under-10m' && (platformId === 'abacum' || platformId === 'vena')) {
          concerns.push('Optimised for established mid-market organisations; consider Runway or Datarails for earlier-stage companies');
        } else {
          concerns.push('Revenue range differs but platform scales with growth');
        }
      } else {
        modifier += SCORING_CONFIG.SWEET_SPOT_MISS;
        concerns.push('Revenue range outside typical customer profile');
      }
    }
  }

  if (profile.companySize) {
    if (sweetSpot.companySizes.includes(profile.companySize)) {
      modifier += 0.4;
      matchReasons.push('Organisation size matches vendor target market');
      
      // Boost SMB platforms when company size matches their sweet spot
      if (isSmallCompany) {
        if (['jedox', 'vena', 'board', 'abacum', 'runway', 'datarails', 'cube', 'mosaic', 'drivetrain', 'liveflow', 'vareto'].includes(platformId)) {
          modifier += 0.8;
          matchReasons.push('Right-sized platform for smaller organisations - faster implementation, lower TCO');
        }
      }
    } else {
      modifier -= 0.4;
      concerns.push('Organisation size differs from typical customer base');
      
      // Strong penalties for enterprise platforms targeting startups/small companies
      if (isSmallCompany) {
        // OneStream full platform - VERY expensive and complex, totally unsuitable for small companies
        if (platformId === 'onestream') {
          modifier -= 2.5;
          concerns.push('Enterprise platform with very high cost and complexity - not appropriate for smaller organisations');
        }
        // Anaplan - expensive enterprise platform, unsuitable for small companies
        if (platformId === 'anaplan') {
          modifier -= 2.0;
          concerns.push('Enterprise-focused platform with high TCO - consider Jedox, Vena, or Pigment');
        }
        // CPM Express - still relatively expensive for small companies, designed for £50M+ revenue
        if (platformId === 'onestream-cpm-express') {
          modifier -= 1.2;
          concerns.push('Designed for mid-market (£50M+ revenue) - consider Jedox, Vena, or Abacum for smaller organisations');
        }
        // Other enterprise platforms
        if (['sap-sac-gr', 'oracle', 'sapbpc', 'cch-tagetik', 'ibm-planning-analytics'].includes(platformId)) {
          modifier -= 1.5;
          concerns.push('Enterprise platform with high complexity and cost - not suited for smaller organisations');
        }
      }
      
      // Medium-sized company boosts - CPM Express sweet spot
      if (profile.companySize === 'medium') {
        if (platformId === 'onestream-cpm-express') {
          modifier += 1.0;
          matchReasons.push('Purpose-built for mid-market organisations with enterprise-grade capabilities');
        }
        // Full OneStream still gets a penalty for medium companies - it's overkill
        if (platformId === 'onestream') {
          modifier -= 0.8;
          concerns.push('Full OneStream platform may be over-engineered - consider CPM Express for mid-market');
        }
      }
    }
  }

  if (profile.erpLandscape) {
    if (sweetSpot.erpLandscapes.includes(profile.erpLandscape)) {
      if (platformId === 'oracle' && profile.erpLandscape === 'oracle') {
        // Reduced from 0.6 to 0.4 to prevent Oracle domination in billion+ category
        modifier += 0.4;
        matchReasons.push('Native ecosystem integration - optimal data flow and unified experience');
      } else if (profile.erpLandscape === 'sap') {
        if (platformId === 'sap-sac-gr') {
          modifier += 0.6;
          matchReasons.push('Native SAP S/4HANA integration - optimal data flow and unified experience');
        } else if (platformId === 'sapbpc') {
          modifier += 0.2;
          matchReasons.push('SAP ecosystem compatibility - consider migration to SAC+GR');
        } else if (['onestream', 'cch-tagetik'].includes(platformId)) {
          modifier += 0.35;
          matchReasons.push('Strong SAP connectivity via certified connectors - enterprise-proven');
        } else {
          modifier += 0.2;
          matchReasons.push('Compatible with your ERP landscape');
        }
      } else if (profile.erpLandscape === 'multi-vendor') {
        // Enhanced bonuses for multi-ERP specialists
        if (['onestream', 'anaplan'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Purpose-built for multi-ERP data unification - industry leading');
        } else if (['cch-tagetik', 'ibm-planning-analytics'].includes(platformId)) {
          modifier += 0.4;
          matchReasons.push('Strong multi-ERP integration capabilities');
        } else {
          modifier += 0.2;
          matchReasons.push('Compatible with multi-ERP environments');
        }
      } else if (profile.erpLandscape === 'workday' && platformId === 'workday-adaptive') {
        modifier += 0.5;
        matchReasons.push('Native Workday HCM/Finance integration - optimal workforce and financial planning');
      } else if (profile.erpLandscape === 'microsoft') {
        // Microsoft stack specialists - Vena built natively on Microsoft stack
        if (platformId === 'vena') {
          if (profile.companySize === 'startup' || profile.companySize === 'small') {
            modifier += 1.5;
            matchReasons.push('Built natively on the Microsoft stack - Excel-first planning with M365 Copilot integration, ideal for smaller Microsoft organisations');
          } else {
            modifier += 1.0;
            matchReasons.push('Built natively on the Microsoft stack - deep M365, Copilot, and Excel integration for enterprise planning');
          }
        } else if (platformId === 'jedox') {
          if (profile.companySize === 'medium') {
            modifier += 0.9;
            matchReasons.push('Strong Microsoft Excel integration with enterprise scalability for growing organisations');
          } else if (profile.companySize === 'small') {
            modifier += 0.7;
            matchReasons.push('Microsoft Excel integration - consider Vena for smaller organisations');
          } else {
            modifier += 0.4;
            matchReasons.push('Microsoft Excel integration with planning governance');
          }
        } else if (platformId === 'board') {
          modifier += 0.35;
          matchReasons.push('Compatible with Microsoft stack - unified planning and analytics');
        } else if (platformId === 'pigment') {
          // Pigment targets larger companies - penalize for small Microsoft shops
          if (profile.companySize === 'startup' || profile.companySize === 'small') {
            modifier += 0.0;
            concerns.push('Targeting larger organisations - consider Vena or Jedox for smaller Microsoft shops');
          } else {
            modifier += 0.3;
            matchReasons.push('Compatible with Microsoft stack');
          }
        } else {
          modifier += 0.2;
          matchReasons.push('Compatible with your ERP landscape');
        }
      } else {
        modifier += 0.2;
        matchReasons.push('Compatible with your ERP landscape');
      }
    } else {
      if ((platformId === 'oracle' && profile.erpLandscape === 'sap') ||
          (platformId === 'sapbpc' && profile.erpLandscape === 'oracle') ||
          (platformId === 'sap-sac-gr' && profile.erpLandscape === 'oracle')) {
        modifier -= 0.5;
        concerns.push('Designed for competitor ERP ecosystem');
      } else if (profile.erpLandscape === 'multi-vendor' && 
                 (platformId === 'oracle' || platformId === 'sapbpc' || platformId === 'sap-sac-gr')) {
        // Increased penalty for single-ecosystem tools in multi-vendor environments
        modifier -= 0.4;
        concerns.push('Primarily optimised for single ERP ecosystem - integration overhead expected');
      }
      // Add Workday ecosystem matching for greenfield/other landscapes
      if (profile.erpLandscape === 'greenfield' && platformId === 'workday-adaptive') {
        modifier += 0.3;
        matchReasons.push('Consider if Workday HCM/Finance is your ERP - native integration available');
      }
      // Add OneStream bonus for greenfield - ERP-agnostic design
      if (profile.erpLandscape === 'greenfield' && platformId === 'onestream') {
        modifier += 0.25;
        matchReasons.push('ERP-agnostic design works with any future ERP selection');
      }
    }
  }
  
  // Large enterprise diversity bonus - prevent single vendor domination in billion+ category
  const isLargeEnterprise = profile.revenue === 'over-1b' || profile.revenue === '250m-1b';
  if (isLargeEnterprise && profile.erpLandscape !== 'oracle') {
    // Boost best-of-breed vendors for large enterprises not committed to Oracle
    if (['onestream', 'anaplan', 'cch-tagetik'].includes(platformId)) {
      modifier += 0.2;
      matchReasons.push('Enterprise-grade platform with strong large enterprise track record');
    }
    // Slight penalty for Oracle when organisation is not in Oracle ecosystem
    if (platformId === 'oracle') {
      modifier -= 0.15;
      concerns.push('Consider if Oracle ecosystem lock-in aligns with your IT strategy');
    }
  }

  // Scenario-based modifiers
  if (profile.primaryObjective) {
    switch (profile.primaryObjective) {
      case 'statutory-close':
        // Boost consolidation-first tools - differentiated bonuses
        if (['onestream', 'cch-tagetik'].includes(platformId)) {
          modifier += 0.6;
          matchReasons.push('Industry-leading statutory close and regulatory reporting');
        }
        if (['oracle', 'sap-sac-gr'].includes(platformId)) {
          modifier += 0.4;
          matchReasons.push('Strong statutory close and regulatory reporting capabilities');
        }
        if (platformId === 'sapbpc' && profile.erpLandscape === 'sap') {
          modifier += 0.2;
          matchReasons.push('Existing SAP BPC investment - consider migration timeline');
        }
        if (['pigment', 'ibm-planning-analytics'].includes(platformId)) {
          modifier -= 0.4;
          concerns.push('Limited statutory consolidation - may require separate close engine');
        }
        break;
      case 'agile-fpa':
        // Boost planning-first tools - differentiated bonuses
        if (['pigment', 'anaplan'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Purpose-built for agile FP&A with rapid modelling capabilities');
        }
        if (['runway', 'abacum', 'datarails', 'cube', 'drivetrain', 'vareto', 'mosaic'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('AI-first FP&A platform built for agile planning and rapid deployment');
        }
        if (['onestream', 'jedox', 'vena', 'board'].includes(platformId)) {
          modifier += 0.4;
          matchReasons.push('Strong agile FP&A and planning capabilities');
        }
        if (platformId === 'oracle') {
          modifier += 0.25;
          matchReasons.push('Capable FP&A features within broader EPM suite');
        }
        if (['sapbpc', 'cch-tagetik'].includes(platformId)) {
          modifier -= 0.3;
          concerns.push('Consolidation-first design may be overkill for pure planning needs');
        }
        break;
      case 'unified-epm':
        // Boost unified platforms - differentiated bonuses
        if (platformId === 'onestream') {
          modifier += 0.6;
          matchReasons.push('Purpose-built unified platform - close + planning with no integration complexity');
        }
        if (['cch-tagetik', 'sap-sac-gr'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Unified platform for close + planning eliminates integration complexity');
        }
        if (platformId === 'oracle') {
          modifier += 0.35;
          matchReasons.push('Unified Oracle EPM suite for close and planning');
        }
        if (['pigment', 'ibm-planning-analytics'].includes(platformId)) {
          modifier -= 0.3;
          concerns.push('May require separate close engine for unified EPM needs');
        }
        break;
      case 'excel-heavy':
        // Boost Excel-native tools
        if (['vena', 'jedox', 'datarails'].includes(platformId)) {
          modifier += 0.6;
          matchReasons.push('Excel-native interface leverages existing team skills');
        }
        if (['cube'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Native Excel and Google Sheets integration with centralised data model');
        }
        if (['board', 'ibm-planning-analytics', 'pigment'].includes(platformId)) {
          modifier += 0.3;
          matchReasons.push('Good Excel integration or familiar interface');
        }
        if (['onestream', 'oracle', 'sap-sac-gr', 'anaplan', 'cch-tagetik'].includes(platformId)) {
          modifier -= 0.4;
          concerns.push('Enterprise platforms may overwhelm smaller Excel-centric teams');
        }
        break;
      case 'multi-erp':
        // Boost tools that handle multi-ERP complexity well
        if (['onestream', 'anaplan'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Strong multi-ERP data integration and unification capabilities');
        }
        if (['oracle', 'sap-sac-gr', 'sapbpc'].includes(platformId)) {
          modifier -= 0.4;
          concerns.push('Native ERP tools work best in homogeneous ERP landscapes');
        }
        break;
      case 'ai-forecasting':
        // Boost tools with strong AI/ML forecasting
        if (['onestream', 'oracle', 'pigment', 'workday-adaptive'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Advanced AI-driven forecasting and predictive capabilities');
        }
        // AI-native platforms: AI embedded in core architecture, not a bolt-on module
        if (platformId === 'abacum') {
          modifier += 0.8;
          matchReasons.push('Forecasting, anomaly detection, and variance analysis built into the core platform from day one');
        } else if (['runway', 'datarails', 'mosaic', 'drivetrain', 'vareto'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('AI-first platform with modern predictive forecasting and automated insights');
        }
        if (['sapbpc', 'ibm-planning-analytics'].includes(platformId)) {
          modifier -= 0.3;
          concerns.push('AI capabilities less mature compared to modern platforms');
        }
        break;
      case 'microsoft-salesforce':
        // Boost Anaplan for Salesforce ecosystem (Salesforce-owned)
        if (platformId === 'anaplan') {
          modifier += 0.6;
          matchReasons.push('Salesforce-owned with deep CRM integration for sales planning');
        }
        if (['vena', 'jedox'].includes(platformId)) {
          modifier += 0.3;
          matchReasons.push('Strong Microsoft 365 and Excel integration');
        }
        break;
      
      // ERP Scenario 1: Complex global manufacturing / supply chain
      case 'manufacturing':
        if (['sap-s4hana'].includes(platformId)) {
          modifier += 1.0;
          matchReasons.push('Deep manufacturing processes and global supply chain');
        }
        if (['infor-cloudsuite'].includes(platformId)) {
          modifier += 0.9;
          matchReasons.push('Manufacturing vertical strength and pre-built industry processes');
        }
        if (['ifs-cloud'].includes(platformId)) {
          modifier += 0.8;
          matchReasons.push('Asset and project complexity management');
        }
        if (['epicor-kinetic'].includes(platformId)) {
          modifier += 0.7;
          matchReasons.push('Manufacturing strength for discrete and job shop');
        }
        if (['oracle-erp'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Capable manufacturing but less depth than specialists');
        }
        if (['sage-intacct', 'workday-fin'].includes(platformId)) {
          modifier -= 0.8;
          concerns.push('Finance-first with lighter operational/manufacturing capabilities');
        }
        break;

      // ERP Scenario 2: Service-centric / people-first org
      case 'service-people':
        if (['workday-fin'].includes(platformId)) {
          modifier += 1.0;
          matchReasons.push('Unified HCM + Finance for people-centric organisations');
        }
        if (['oracle-erp'].includes(platformId)) {
          modifier += 0.6;
          matchReasons.push('Strong HCM/Finance integration');
        }
        if (['dynamics365'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Good HCM integration via Microsoft ecosystem');
        }
        if (['sage-intacct'].includes(platformId)) {
          modifier += 0.6;
          matchReasons.push('Strong services accounting and professional services verticals');
        }
        if (['sap-s4hana', 'epicor-kinetic'].includes(platformId)) {
          modifier -= 0.5;
          concerns.push('Manufacturing-centric design may be overkill for services');
        }
        break;

      // ERP Scenario 3: Microsoft-centric stack
      case 'microsoft-stack':
        if (['dynamics365'].includes(platformId)) {
          modifier += 1.0;
          matchReasons.push('Native Microsoft integration with M365, Power BI, Azure, Copilot');
        }
        if (['netsuite', 'acumatica'].includes(platformId)) {
          modifier += 0.2;
          matchReasons.push('Cloud-native with good Microsoft connectivity');
        }
        if (['sap-s4hana', 'oracle-erp'].includes(platformId)) {
          modifier -= 0.1;
          concerns.push('Less native Microsoft integration');
        }
        break;

      // ERP Scenario 4: Finance-only or light operations
      case 'finance-only':
        if (['sage-intacct'].includes(platformId)) {
          modifier += 1.0;
          matchReasons.push('Purpose-built for multi-entity finance with fast implementation');
        }
        if (['workday-fin'].includes(platformId)) {
          modifier += 0.6;
          matchReasons.push('Strong finance module with HCM integration');
        }
        if (['sap-s4hana'].includes(platformId)) {
          modifier -= 1.0;
          concerns.push('Overkill - complex and expensive for finance-only needs');
        }
        if (['oracle-erp'].includes(platformId)) {
          modifier -= 0.8;
          concerns.push('Over-featured for finance-only use cases');
        }
        if (['epicor-kinetic', 'infor-cloudsuite'].includes(platformId)) {
          modifier -= 0.6;
          concerns.push('Manufacturing/operations focus may be over-featured');
        }
        break;

      // ERP Scenario 5: Budget-conscious mid-market
      case 'budget-conscious':
        if (['sage-intacct'].includes(platformId)) {
          modifier += 1.0;
          matchReasons.push('Lowest TCO tier with strong mid-market features');
        }
        if (['acumatica'].includes(platformId)) {
          modifier += 0.9;
          matchReasons.push('Low TCO with modern cloud-native architecture');
        }
        if (['netsuite'].includes(platformId)) {
          modifier += 0.6;
          matchReasons.push('Good mid-market value with unified platform');
        }
        if (['epicor-kinetic'].includes(platformId)) {
          modifier += 0.5;
          matchReasons.push('Reasonable TCO for manufacturing mid-market');
        }
        if (['sap-s4hana', 'oracle-erp'].includes(platformId)) {
          modifier -= 1.5;
          concerns.push('Very high cost - tier 5 enterprise pricing');
        }
        if (['workday-fin'].includes(platformId)) {
          modifier -= 1.0;
          concerns.push('Higher cost for full suite');
        }
        break;

      // ERP Scenario 6: AI-driven finance & operations priority
      case 'ai-priority':
        if (['oracle-erp'].includes(platformId)) {
          modifier += 1.0;
          matchReasons.push('Strong AI Agent Studio, Redwood copilots, embedded ML');
        }
        if (['sap-s4hana'].includes(platformId)) {
          modifier += 1.0;
          matchReasons.push('Joule AI assistant, agentic automation, strong finance AI');
        }
        if (['dynamics365'].includes(platformId)) {
          modifier += 0.9;
          matchReasons.push('Copilot Stack, Power Automate, strong AI integration');
        }
        if (['workday-fin'].includes(platformId)) {
          modifier += 0.8;
          matchReasons.push('Growing AI/ML capabilities with Skills Cloud');
        }
        if (['infor-cloudsuite', 'ifs-cloud'].includes(platformId)) {
          modifier += 0.6;
          matchReasons.push('AI for supply chain/asset management');
        }
        if (['epicor-kinetic'].includes(platformId)) {
          modifier -= 0.2;
          concerns.push('AI features emerging but not core focus');
        }
        break;
    }
  }

  if (profile.industry) {
    if (sweetSpot.industries.includes(profile.industry)) {
      modifier += 0.3;
      matchReasons.push('Strong industry specialisation and references');
    }
  }

  // Apply modular affordability penalty based on priceTier and company profile
  const isMidMarket = profile.companySize === 'medium';
  const isMidRevenue = profile.revenue === '50m-250m';
  const affordabilityPenalty = calculateAffordabilityPenalty(priceTier, isSmallCompany, isLowRevenue, isMidMarket, isMidRevenue);
  if (affordabilityPenalty > 0) {
    modifier -= affordabilityPenalty;
    if (isSmallCompany && isExpensiveVendor) {
      concerns.push('Enterprise pricing likely prohibitive for smaller organisations');
    }
    if (isMidMarket && isExpensiveVendor) {
      concerns.push('Pricing may exceed mid-market budgets - consider total cost carefully');
    }
    if (isLowRevenue && isExpensiveVendor) {
      concerns.push('Total cost of ownership may exceed budget constraints');
    }
    if (isMidRevenue && isExpensiveVendor) {
      concerns.push('Evaluate total cost against mid-market budget expectations');
    }
  }

  if (profile.companySize === 'startup' && (platformId === 'onestream' || platformId === 'oracle' || platformId === 'sapbpc')) {
    modifier -= 1.0;
    concerns.push('Vendor typically requires minimum deal sizes unsuitable for startups');
  }

  // OneStream CPM Express - heavy penalties for large/enterprise organisations
  if (platformId === 'onestream-cpm-express') {
    const isLargeOrEnterprise = profile.companySize === 'large' || profile.companySize === 'enterprise';
    const isHighRevenue = profile.revenue === '250m-1b' || profile.revenue === 'over-1b';
    
    if (isLargeOrEnterprise || isHighRevenue) {
      // Heavy penalty - pre-built elements unsuitable for complex implementations
      modifier -= 2.5;
      concerns.push('Pre-configured solutions not designed for complex enterprise implementations requiring extensive customisation');
    }
    
    if (profile.companySize === 'enterprise') {
      // Additional penalty for enterprise specifically
      modifier -= 1.0;
      concerns.push('Consider full OneStream platform for enterprise-scale complexity and multi-entity requirements');
    }
    
    if (profile.revenue === 'over-1b') {
      // Additional penalty for very large organisations
      modifier -= 0.8;
      concerns.push('Organisations of this scale typically require bespoke configuration beyond pre-built accelerators');
    }
    
    // Penalty for complex primary objectives
    if (profile.primaryObjective === 'multi-erp' || profile.primaryObjective === 'statutory-close') {
      modifier -= 0.6;
      concerns.push('Complex consolidation or multi-ERP scenarios require full platform flexibility');
    }
    
    // CPM Express penalties for SMALL companies - it's too expensive for them
    if (profile.companySize === 'startup') {
      modifier -= 2.5;
      concerns.push('Too expensive for startups - consider Jedox, Vena, or Pigment for better value');
    } else if (profile.companySize === 'small') {
      modifier -= 1.8;
      concerns.push('Pricing exceeds typical small company budget - Jedox or Vena offer better value at this scale');
    }
    
    // CPM Express penalties for LOW revenue companies
    if (profile.revenue === 'under-10m') {
      modifier -= 2.0;
      concerns.push('Annual licensing cost prohibitive for under £10M revenue organisations');
    } else if (profile.revenue === '10m-50m') {
      modifier -= 1.0;
      concerns.push('Consider lower-cost alternatives like Jedox or Vena for organisations under £50M revenue');
    }
    
    // Bonus ONLY for ideal CPM Express scenarios (mid-market sweet spot)
    if (profile.companySize === 'medium' && profile.revenue === '50m-250m') {
      modifier += 1.2;
      matchReasons.push('Ideal mid-market fit - enterprise EPM at optimised pace and price');
    }
    
    // Penalty for FP&A-only focus - CPM Express is an all-in-one platform with strong consolidation
    // When users only need FP&A (not consolidation), simpler tools like Abacum/Pigment are better value
    if (profile.primaryObjective === 'finance-only' || profile.primaryObjective === 'budget-conscious') {
      modifier -= SCORING_CONFIG.CONSOLIDATION_OVERHEAD_PENALTY;
      concerns.push('All-in-one platform includes consolidation capabilities you may not need - consider Abacum or Pigment for FP&A-focused deployment');
    }
  }

  // Pigment - penalties for small companies (pricing suits medium+ companies)
  if (platformId === 'pigment') {
    if (profile.companySize === 'startup') {
      modifier -= 1.8;
      concerns.push('Pricing typically exceeds startup budgets - consider Jedox or Vena for better value');
    } else if (profile.companySize === 'small') {
      modifier -= 1.2;
      concerns.push('Better suited to medium+ companies - Jedox or Vena offer stronger value at this scale');
    }
    
    if (profile.revenue === 'under-10m') {
      modifier -= 1.5;
      concerns.push('Annual licensing may exceed budget for under £10M revenue organisations');
    } else if (profile.revenue === '10m-50m') {
      modifier -= 0.8;
      concerns.push('Consider Jedox or Vena for better value at this revenue band');
    }
    
    // Bonus for ideal Pigment scenarios (tech/SaaS medium+ companies)
    if ((profile.companySize === 'medium' || profile.companySize === 'large') && 
        (profile.revenue === '50m-250m' || profile.revenue === '250m-1b') &&
        profile.industry === 'technology') {
      modifier += 0.8;
      matchReasons.push('Ideal fit for growing tech/SaaS companies with modern planning needs');
    }
  }

  // Abacum - ideal for small to mid-market FP&A, penalty for large enterprises and consolidation needs
  if (platformId === 'abacum') {
    // Strong bonuses for ideal Abacum scenarios
    if (profile.companySize === 'startup' || profile.companySize === 'small') {
      modifier += 1.2;
      matchReasons.push('Purpose-built for fast-growing SMBs - industry-fastest 4-6 week deployment');
      matchReasons.push('Lowest TCO with minimal implementation consulting fees (£20-35K vs £75-150K+ for competitors)');
    } else if (profile.companySize === 'medium') {
      modifier += 0.7;
      matchReasons.push('Strong fit for mid-market FP&A teams seeking speed and value');
      matchReasons.push('4-6 week implementation vs 3-18 months for enterprise EPM vendors');
    }
    
    if (profile.revenue === 'under-10m' || profile.revenue === '10m-50m') {
      modifier += 1.0;
      matchReasons.push('Best-in-class value at this revenue band - 50-70% lower Year 1 cost than Pigment');
    } else if (profile.revenue === '50m-250m') {
      modifier += 0.5;
      matchReasons.push('Strong ROI for scaling companies - go live in weeks, not months');
    }
    
    // Penalties for larger organisations
    if (profile.companySize === 'large' || profile.companySize === 'enterprise') {
      modifier -= 1.8;
      concerns.push('Not suited for large enterprises - consider OneStream, Anaplan, or Oracle EPM');
    }
    
    if (profile.revenue === '250m-1b' || profile.revenue === 'over-1b') {
      modifier -= 1.5;
      concerns.push('Platform designed for smaller organisations - enterprise EPM vendors offer better fit');
    }
    
    // Industry bonuses
    if (profile.industry === 'technology' || profile.industry === 'saas' || profile.industry === 'fintech') {
      modifier += 0.6;
      matchReasons.push('Strong fit for tech/SaaS companies with ARR forecasting and headcount planning');
    }
    
    // FP&A-only focus bonus - Abacum is purpose-built for FP&A without consolidation overhead
    if (profile.primaryObjective === 'finance-only' || profile.primaryObjective === 'budget-conscious') {
      modifier += SCORING_CONFIG.FPA_FOCUS_BONUS;
      matchReasons.push('Purpose-built for FP&A - no consolidation overhead, faster deployment, lower TCO');
    }
    
    // ERP integration bonuses
    if (['netsuite', 'xero', 'quickbooks', 'sage', 'zoho', 'freshbooks'].includes(profile.erpLandscape || '')) {
      modifier += 0.5;
      matchReasons.push('700+ native integrations including excellent support for mid-market ERPs');
    }
  }

  // Runway - AI-first FP&A for startups and growth-stage companies
  if (platformId === 'runway') {
    if (profile.companySize === 'startup' || profile.companySize === 'small') {
      modifier += 1.2;
      matchReasons.push('Purpose-built for startups and growth-stage companies - visual, collaborative FP&A');
    } else if (profile.companySize === 'medium') {
      modifier += 0.5;
      matchReasons.push('Scales to mid-market FP&A with driver-based modelling and scenario planning');
    }
    if (profile.revenue === 'under-10m' || profile.revenue === '10m-50m') {
      modifier += 0.8;
      matchReasons.push('Strong value proposition at this revenue band - fast deployment and competitive pricing');
    }
    if (profile.companySize === 'large' || profile.companySize === 'enterprise') {
      modifier -= 1.8;
      concerns.push('Not suited for large enterprises - consider Anaplan, OneStream, or Pigment');
    }
    if (profile.revenue === '250m-1b' || profile.revenue === 'over-1b') {
      modifier -= 1.5;
      concerns.push('Platform designed for smaller organisations - enterprise EPM vendors offer better fit');
    }
    if (profile.industry === 'technology' || profile.industry === 'saas' || profile.industry === 'fintech') {
      modifier += 0.6;
      matchReasons.push('Strong fit for tech/SaaS with ARR modelling, headcount planning, and unit economics');
    }
    if (profile.primaryObjective === 'finance-only' || profile.primaryObjective === 'budget-conscious') {
      modifier += SCORING_CONFIG.FPA_FOCUS_BONUS;
      matchReasons.push('Lightweight FP&A - no consolidation overhead, lower TCO');
    }
    if (['netsuite', 'xero', 'quickbooks', 'sage', 'zoho', 'freshbooks'].includes(profile.erpLandscape || '')) {
      modifier += 0.5;
      matchReasons.push('200+ native integrations - strong ERP connectivity for mid-market systems');
    }
  }

  // Datarails - Excel-native FP&A with AI insights
  if (platformId === 'datarails') {
    if (profile.companySize === 'startup' || profile.companySize === 'small') {
      modifier += 1.0;
      matchReasons.push('Excel-native FP&A - automates data gathering without leaving spreadsheets');
    } else if (profile.companySize === 'medium') {
      modifier += 0.6;
      matchReasons.push('Strong fit for mid-market Excel-centric teams - AI-powered insights and automation');
    }
    if (profile.revenue === 'under-10m' || profile.revenue === '10m-50m') {
      modifier += 0.8;
      matchReasons.push('Competitive pricing and fast deployment for smaller organisations');
    }
    if (profile.companySize === 'large' || profile.companySize === 'enterprise') {
      modifier -= 1.8;
      concerns.push('Not suited for large enterprises - consider Jedox, Vena, or Anaplan for enterprise scale');
    }
    if (profile.revenue === '250m-1b' || profile.revenue === 'over-1b') {
      modifier -= 1.5;
      concerns.push('Platform designed for SMB/mid-market - enterprise vendors offer better fit');
    }
    if (profile.primaryObjective === 'excel-heavy') {
      modifier += 0.8;
      matchReasons.push('Best-in-class Excel-native experience - keeps spreadsheet workflows whilst adding automation');
    }
    if (profile.primaryObjective === 'finance-only' || profile.primaryObjective === 'budget-conscious') {
      modifier += SCORING_CONFIG.FPA_FOCUS_BONUS;
      matchReasons.push('FP&A-focused platform - no consolidation overhead, fast ROI');
    }
    if (['netsuite', 'sage', 'xero', 'quickbooks', 'zoho', 'freshbooks'].includes(profile.erpLandscape || '')) {
      modifier += 0.6;
      matchReasons.push('400+ native integrations - particularly strong with NetSuite and Sage');
    }
    if (profile.erpLandscape === 'microsoft') {
      modifier += 0.4;
      matchReasons.push('Strong Excel integration - works natively with Microsoft stack');
    }
  }

  // Cube - spreadsheet-connected mid-market FP&A
  if (platformId === 'cube') {
    if (profile.companySize === 'small' || profile.companySize === 'medium') {
      modifier += 0.8;
      matchReasons.push('Multi-dimensional planning with Excel and Google Sheets connectivity');
    }
    if (profile.revenue === '10m-50m' || profile.revenue === '50m-250m') {
      modifier += 0.6;
      matchReasons.push('Strong mid-market value - more modelling power than lightweight tools');
    }
    if (profile.companySize === 'large' || profile.companySize === 'enterprise') {
      modifier -= 1.5;
      concerns.push('Not suited for large enterprises - consider Anaplan or OneStream');
    }
    if (profile.revenue === '250m-1b' || profile.revenue === 'over-1b') {
      modifier -= 1.2;
      concerns.push('Platform designed for mid-market - enterprise vendors offer better fit');
    }
    if (profile.companySize === 'startup') {
      modifier -= 0.5;
      concerns.push('Pricing may exceed startup budgets - consider Runway, Mosaic, or LiveFlow');
    }
    if (profile.primaryObjective === 'excel-heavy') {
      modifier += 0.5;
      matchReasons.push('Native Excel and Google Sheets integration with governance and approval workflows');
    }
    if (profile.primaryObjective === 'finance-only' || profile.primaryObjective === 'budget-conscious') {
      modifier += 1.0;
      matchReasons.push('FP&A-focused with strong modelling - no consolidation overhead');
    }
    if (['netsuite', 'sage', 'microsoft'].includes(profile.erpLandscape || '')) {
      modifier += 0.4;
      matchReasons.push('Good integration with mid-market ERP systems');
    }
  }

  // Mosaic - strategic finance for SaaS companies
  if (platformId === 'mosaic') {
    if (profile.companySize === 'startup') {
      modifier += 1.2;
      matchReasons.push('Purpose-built for fast-growing SaaS companies - automated metrics and board reporting');
    } else if (profile.companySize === 'small') {
      modifier += 0.8;
      matchReasons.push('Strong for small SaaS/tech teams wanting real-time financial insights');
    }
    if (profile.revenue === 'under-10m') {
      modifier += 1.0;
      matchReasons.push('Ideal for early-stage companies - lowest-friction entry to FP&A automation');
    } else if (profile.revenue === '10m-50m') {
      modifier += 0.6;
      matchReasons.push('Good value for scaling companies with automated SaaS metrics');
    }
    if (profile.companySize === 'medium' || profile.companySize === 'large' || profile.companySize === 'enterprise') {
      modifier -= 1.5;
      concerns.push('Not suited for mid-market or larger - consider Pigment, Cube, or Drivetrain');
    }
    if (profile.revenue === '50m-250m' || profile.revenue === '250m-1b' || profile.revenue === 'over-1b') {
      modifier -= 1.2;
      concerns.push('Platform designed for smaller companies - mid-market tools offer better depth');
    }
    if (profile.industry === 'technology' || profile.industry === 'saas' || profile.industry === 'fintech' || profile.industry === 'ecommerce') {
      modifier += 0.8;
      matchReasons.push('Purpose-built SaaS metrics - ARR, burn rate, runway, unit economics');
    } else if (profile.industry === 'manufacturing' || profile.industry === 'energy') {
      modifier -= 0.5;
      concerns.push('SaaS/tech-focused platform - limited applicability for manufacturing or industrial sectors');
    }
    if (profile.primaryObjective === 'finance-only' || profile.primaryObjective === 'budget-conscious') {
      modifier += 1.0;
      matchReasons.push('Lightweight strategic finance - fastest time-to-value with no overhead');
    }
  }

  // Drivetrain - driver-based planning for mid-market
  if (platformId === 'drivetrain') {
    if (profile.companySize === 'small' || profile.companySize === 'medium') {
      modifier += 0.8;
      matchReasons.push('Strong driver-based planning engine for mid-market finance teams');
    }
    if (profile.revenue === '10m-50m' || profile.revenue === '50m-250m') {
      modifier += 0.6;
      matchReasons.push('Good mid-market value with deep modelling capabilities');
    }
    if (profile.companySize === 'large' || profile.companySize === 'enterprise') {
      modifier -= 1.5;
      concerns.push('Not suited for large enterprises - consider Anaplan or Pigment');
    }
    if (profile.revenue === '250m-1b' || profile.revenue === 'over-1b') {
      modifier -= 1.2;
      concerns.push('Platform designed for mid-market - enterprise vendors offer better scale');
    }
    if (profile.companySize === 'startup') {
      modifier -= 0.3;
      concerns.push('Pricing may exceed startup budgets - consider Runway or Mosaic');
    }
    if (profile.industry === 'technology' || profile.industry === 'saas') {
      modifier += 0.5;
      matchReasons.push('Strong for revenue forecasting and pipeline modelling in tech/SaaS');
    }
    if (profile.primaryObjective === 'finance-only' || profile.primaryObjective === 'budget-conscious') {
      modifier += 1.0;
      matchReasons.push('FP&A-focused with deep driver-based modelling - no consolidation overhead');
    }
    if (['netsuite', 'sage', 'microsoft'].includes(profile.erpLandscape || '')) {
      modifier += 0.4;
      matchReasons.push('Good integration with mid-market ERP systems');
    }
  }

  // LiveFlow - lightweight reporting automation
  if (platformId === 'liveflow') {
    if (profile.companySize === 'startup') {
      modifier += 1.2;
      matchReasons.push('Fastest and cheapest entry to FP&A automation - go live in 1-2 weeks');
    } else if (profile.companySize === 'small') {
      modifier += 0.6;
      matchReasons.push('Good for small teams wanting automated reporting from QuickBooks or Xero');
    }
    if (profile.revenue === 'under-10m') {
      modifier += 1.0;
      matchReasons.push('Lowest cost FP&A tool - ideal for very small organisations');
    }
    if (profile.companySize === 'medium' || profile.companySize === 'large' || profile.companySize === 'enterprise') {
      modifier -= 2.0;
      concerns.push('Reporting tool only - not a full FP&A platform. Consider Datarails, Cube, or Vena');
    }
    if (profile.revenue === '50m-250m' || profile.revenue === '250m-1b' || profile.revenue === 'over-1b') {
      modifier -= 1.5;
      concerns.push('Too lightweight for organisations of this size - consider mid-market FP&A platforms');
    }
    if (profile.erpLandscape === 'xero' || profile.erpLandscape === 'quickbooks') {
      modifier += 0.8;
      matchReasons.push('Native QuickBooks/Xero sync - real-time automated reports in Google Sheets');
    } else if (profile.erpLandscape && !['greenfield'].includes(profile.erpLandscape)) {
      modifier -= 0.5;
      concerns.push('Only integrates with QuickBooks and Xero - limited ERP connectivity');
    }
    if (profile.primaryObjective === 'budget-conscious') {
      modifier += 1.0;
      matchReasons.push('Lowest-cost entry point - £12-36K/year with minimal implementation');
    }
    if (profile.primaryObjective === 'statutory-close' || profile.primaryObjective === 'unified-epm' || profile.primaryObjective === 'multi-erp') {
      modifier -= 1.5;
      concerns.push('Reporting tool only - no consolidation, planning, or modelling capabilities');
    }
  }

  // Vareto - strategic finance for mid-market
  if (platformId === 'vareto') {
    if (profile.companySize === 'small' || profile.companySize === 'medium') {
      modifier += 0.8;
      matchReasons.push('Unified planning, analysis, and reporting for mid-market strategic finance');
    }
    if (profile.revenue === '10m-50m' || profile.revenue === '50m-250m') {
      modifier += 0.6;
      matchReasons.push('Strong fit for scaling companies wanting strategic finance alignment');
    }
    if (profile.companySize === 'large' || profile.companySize === 'enterprise') {
      modifier -= 1.5;
      concerns.push('Not suited for large enterprises - consider Pigment or Anaplan');
    }
    if (profile.revenue === '250m-1b' || profile.revenue === 'over-1b') {
      modifier -= 1.2;
      concerns.push('Platform designed for mid-market - enterprise vendors offer better scale');
    }
    if (profile.companySize === 'startup') {
      modifier -= 0.3;
      concerns.push('Pricing may exceed startup budgets - consider Runway or Mosaic');
    }
    if (profile.industry === 'technology' || profile.industry === 'saas' || profile.industry === 'fintech') {
      modifier += 0.5;
      matchReasons.push('Strong for tech/SaaS strategic finance with cross-functional collaboration');
    }
    if (profile.primaryObjective === 'finance-only' || profile.primaryObjective === 'budget-conscious') {
      modifier += 1.0;
      matchReasons.push('Unified FP&A platform - no consolidation overhead, strong board reporting');
    }
    if (['netsuite', 'sage', 'microsoft'].includes(profile.erpLandscape || '')) {
      modifier += 0.4;
      matchReasons.push('Good integration with mid-market ERP systems');
    }
  }

  if (!isSmallCompany && !isLowRevenue && !isExpensiveVendor && priceTier <= 2) {
    if (profile.companySize === 'enterprise' || profile.revenue === 'over-1b') {
      modifier -= 0.4;
      concerns.push('Platform may lack enterprise-grade scalability for very large organisations');
    }
  }

  // Cap the maximum positive modifier to prevent scores hitting 10.
  // clamp() is NaN-safe — if modifier or baseScore drifts to NaN
  // (e.g., empty weights), we fall back to 0 instead of propagating it.
  const cappedModifier = clamp(modifier, -5, 1.2, 0);
  let adjustedScore = clamp(baseScore + cappedModifier, EPM_SCORING.SCORE_FLOOR, 9.8, EPM_SCORING.SCORE_FLOOR);
  
  let fitLevel: 'excellent' | 'good' | 'fair' | 'poor';
  if (matchReasons.length >= 3 && concerns.length === 0) {
    fitLevel = 'excellent';
  } else if (matchReasons.length >= 2 && concerns.length <= 1) {
    fitLevel = 'good';
  } else if (matchReasons.length >= 1 && concerns.length <= 2) {
    fitLevel = 'fair';
  } else {
    fitLevel = 'poor';
  }

  const explanation = matchReasons.length > 0 
    ? matchReasons.join('. ') + '.'
    : 'Limited profile match - consider detailed evaluation.';

  return {
    platformId,
    score: parseFloat(adjustedScore.toFixed(2)),
    baseScore,
    modifier: cappedModifier,
    fitLevel,
    explanation,
    matchReasons,
    concerns
  };
}

function getFitLevelColor(level: 'excellent' | 'good' | 'fair' | 'poor') {
  switch (level) {
    case 'excellent': return 'bg-green-500/10 text-green-600 border-green-500/30';
    case 'good': return 'bg-[#7FB8A3]/100/10 text-[#8E4F67] border-[#7FB8A3]/30';
    case 'fair': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    case 'poor': return 'bg-red-500/10 text-red-600 border-red-500/30';
  }
}

function getFitLevelLabel(level: 'excellent' | 'good' | 'fair' | 'poor') {
  switch (level) {
    case 'excellent': return 'Excellent Fit';
    case 'good': return 'Good Fit';
    case 'fair': return 'Fair Fit';
    case 'poor': return 'Limited Fit';
  }
}

// Segment-Relative Ranking - shows platform rank within user's segment
interface SegmentContext {
  rank: number;
  total: number;
  percentile: number;
  segmentLabel: string;
  isTopForSegment: boolean;
}

function getSegmentRelevantPlatforms(
  platformId: string,
  allPlatforms: Platform[],
  sweetSpots: Record<string, SweetSpot>,
  profile: CompanyProfile
): string[] {
  // Get platforms that are relevant for this user's segment
  return allPlatforms.filter(p => {
    const spot = sweetSpots[p.id];
    if (!spot) return true; // Include platforms without sweet spots
    
    // Check if platform is relevant for user's segment
    const revenueMatch = !profile.revenue || spot.revenueBands.includes(profile.revenue);
    const sizeMatch = !profile.companySize || spot.companySizes.includes(profile.companySize);
    
    // Platform is relevant if it matches at least one profile criterion
    return revenueMatch || sizeMatch;
  }).map(p => p.id);
}

function calculateSegmentContext(
  platformId: string,
  rankedPlatforms: { id: string; score: number }[],
  profile: CompanyProfile,
  sweetSpots: Record<string, SweetSpot>
): SegmentContext {
  // Build segment label
  const segmentParts: string[] = [];
  if (profile.companySize) {
    const sizeLabels: Record<string, string> = {
      'startup': 'startups',
      'small': 'small businesses',
      'medium': 'mid-market',
      'large': 'large enterprises',
      'enterprise': 'enterprise organisations'
    };
    segmentParts.push(sizeLabels[profile.companySize] || profile.companySize);
  }
  if (profile.revenue) {
    const revenueLabels: Record<string, string> = {
      'under-10m': 'under £10M',
      '10m-50m': '£10M-£50M',
      '50m-250m': '£50M-£250M',
      '250m-1b': '£250M-£1B',
      'over-1b': '£1B+'
    };
    if (!profile.companySize) {
      segmentParts.push(revenueLabels[profile.revenue] || profile.revenue);
    }
  }
  
  const segmentLabel = segmentParts.length > 0 
    ? segmentParts.join(' ') 
    : 'your profile';

  const rank = rankedPlatforms.findIndex(p => p.id === platformId) + 1;
  const total = rankedPlatforms.length;
  const percentile = Math.round(((total - rank + 1) / total) * 100);
  const isTopForSegment = rank <= 3;

  return {
    rank,
    total,
    percentile,
    segmentLabel,
    isTopForSegment
  };
}

// Score Breakdown - shows category contributions to weighted score
interface ScoreBreakdown {
  categoryId: string;
  categoryName: string;
  rawScore: number;
  weight: number;
  normalizedWeight: number;
  contribution: number;
}

function calculateScoreBreakdown(
  platform: Platform,
  categories: Category[],
  weights: Record<string, number>
): ScoreBreakdown[] {
  // Build a complete weights record (filling in defaults), then
  // normalise to fractions that sum to 1. The all-zero case is
  // handled inside normaliseWeights (equal fractions instead of NaN).
  const completeWeights: Record<string, number> = {};
  for (const category of categories) {
    completeWeights[category.id] = weights[category.id] ?? category.weight;
  }
  const normalised = normaliseWeights(completeWeights);

  return categories.map(category => {
    const rawScore = platform.scores[category.id] ?? 0;
    const weight = completeWeights[category.id];
    const fraction = normalised[category.id]; // 0..1
    return {
      categoryId: category.id,
      categoryName: category.name,
      rawScore,
      weight,
      normalizedWeight: fraction * 100,
      contribution: rawScore * fraction,
    };
  }).sort((a, b) => b.contribution - a.contribution);
}

// "Why This Ranking" Summary - generates one-line explanation per platform
function generateWhyThisRanking(
  platform: Platform,
  fitResult: FitResult | null,
  rank: number,
  segmentContext: SegmentContext | null
): string {
  const parts: string[] = [];
  
  // Start with the rank
  if (rank === 1) {
    parts.push('Top recommendation');
  } else if (rank <= 3) {
    parts.push(`#${rank} choice`);
  } else {
    parts.push(`Ranked #${rank}`);
  }
  
  // Add fit level context
  if (fitResult) {
    if (fitResult.fitLevel === 'excellent') {
      parts.push('excellent match for your profile');
    } else if (fitResult.fitLevel === 'good') {
      parts.push('good alignment with requirements');
    } else if (fitResult.fitLevel === 'fair') {
      parts.push('moderate fit with some considerations');
    } else {
      parts.push('limited match for your criteria');
    }
    
    // Add key reason if available
    if (fitResult.matchReasons.length > 0) {
      const keyReason = fitResult.matchReasons[0].toLowerCase();
      if (keyReason.length < 60) {
        parts.push(keyReason);
      }
    }
  } else {
    // No fit scoring - use platform characteristics
    parts.push(`best for ${platform.bestFor.toLowerCase()}`);
  }
  
  return parts.join(' - ');
}

// Implementation Timeline Gantt Data
interface GanttPhase {
  name: string;
  startMonth: number;
  endMonth: number;
  color: string;
}

interface PlatformGanttData {
  platformId: string;
  platformName: string;
  minMonths: number;
  maxMonths: number;
  phases: GanttPhase[];
}

function getImplementationGanttData(platforms: Platform[]): PlatformGanttData[] {
  const phaseColors = {
    discovery: '#7FB8A3',
    design: '#8E4F67',
    build: '#252826',
    testing: '#6366f1',
    deployment: '#7FB8A3',
    training: '#C77A93'
  };
  
  return platforms.map(platform => {
    // Parse implementation time from platform data
    const timeMatch = platform.implementationTime.match(/(\d+)-(\d+)\s*months?/i);
    const minMonths = timeMatch ? parseInt(timeMatch[1]) : 6;
    const maxMonths = timeMatch ? parseInt(timeMatch[2]) : 12;
    
    // Generate phases based on total duration
    const totalMonths = maxMonths;
    const phases: GanttPhase[] = [
      { name: 'Discovery & Planning', startMonth: 0, endMonth: Math.ceil(totalMonths * 0.15), color: phaseColors.discovery },
      { name: 'Design & Architecture', startMonth: Math.ceil(totalMonths * 0.1), endMonth: Math.ceil(totalMonths * 0.3), color: phaseColors.design },
      { name: 'Build & Configure', startMonth: Math.ceil(totalMonths * 0.25), endMonth: Math.ceil(totalMonths * 0.7), color: phaseColors.build },
      { name: 'Testing & UAT', startMonth: Math.ceil(totalMonths * 0.6), endMonth: Math.ceil(totalMonths * 0.85), color: phaseColors.testing },
      { name: 'Deployment', startMonth: Math.ceil(totalMonths * 0.8), endMonth: Math.ceil(totalMonths * 0.95), color: phaseColors.deployment },
      { name: 'Training & Handover', startMonth: Math.ceil(totalMonths * 0.85), endMonth: totalMonths, color: phaseColors.training }
    ];
    
    return {
      platformId: platform.id,
      platformName: platform.shortName,
      minMonths,
      maxMonths,
      phases
    };
  });
}

function getERPAffinityLabel(affinity: ERPAffinityLevel): string {
  switch (affinity) {
    case 'native': return 'Native Integration';
    case 'connector': return 'Pre-built Connector';
    case 'partnership': return 'Partnership';
    case 'custom': return 'Custom Development';
  }
}

function calculateAIContextualScore(
  platform: Platform,
  profile: AICompanyProfile,
  baseScore: number
): { score: number; modifiers: { label: string; value: number; detail?: string }[] } {
  const context = aiPlatformContextMap[platform.id];
  if (!context || (!profile.techStack && !profile.erpLandscape)) {
    return { score: baseScore, modifiers: [] };
  }

  const normalizedBase = Math.min(baseScore, 75);
  let totalModifier = 0;
  const modifiers: { label: string; value: number; detail?: string }[] = [];

  // ERP Affinity scoring (HIGHEST WEIGHT for synergies)
  if (profile.erpLandscape && profile.erpLandscape !== 'multi-vendor' && profile.erpLandscape !== 'other') {
    const erpAffinity = context.erpAffinity[profile.erpLandscape as keyof typeof context.erpAffinity];
    let erpMod = 0;
    let erpDetail = '';
    
    if (erpAffinity === 'native') {
      erpMod = 20;
      erpDetail = 'Native same-vendor integration';
    } else if (erpAffinity === 'connector') {
      erpMod = 12;
      erpDetail = 'Pre-built connector available';
    } else if (erpAffinity === 'partnership') {
      erpMod = 8;
      erpDetail = 'Vendor partnership';
    }
    
    if (erpMod > 0) {
      const erpLabel = erpLandscapeOptions.find(e => e.id === profile.erpLandscape)?.label || profile.erpLandscape;
      modifiers.push({ label: "ERP Integration", value: erpMod, detail: `${erpDetail} with ${erpLabel}` });
      totalModifier += erpMod;
    }
  }

  // Stack Alignment scoring
  const stackKey = profile.techStack === "aws-linux" ? "aws" : 
                   profile.techStack === "mixed" ? null : profile.techStack;
  
  if (stackKey) {
    const affinity = context.stackAffinity[stackKey as keyof typeof context.stackAffinity];
    let stackMod = 0;
    let stackDetail = '';
    
    if (affinity === "strong") {
      stackMod = 15;
      stackDetail = 'Strong ecosystem alignment';
    } else if (affinity === "weak") {
      stackMod = -15;
      stackDetail = 'Limited compatibility';
    }
    
    if (profile.techStack === "aws-linux") {
      const linuxAffinity = context.stackAffinity.linux;
      if (linuxAffinity === "strong") {
        stackMod = Math.max(stackMod, 15);
        stackDetail = 'Strong Linux/open-source alignment';
      } else if (linuxAffinity === "weak" && stackMod === 0) {
        stackMod = -8;
        stackDetail = 'Limited Linux support';
      }
    }
    
    if (stackMod !== 0) {
      const stackLabel = techStackOptions.find(t => t.id === profile.techStack)?.label || profile.techStack;
      modifiers.push({ label: "Stack Alignment", value: stackMod, detail: `${stackDetail} (${stackLabel})` });
      totalModifier += stackMod;
    }
  }

  // Company Size scoring
  const sizeOption = companySizeOptions.find(s => s.id === profile.companySize);
  if (sizeOption) {
    const scaleFit = context.scaleFit[sizeOption.scaleKey];
    let scaleMod = 0;
    let scaleDetail = '';
    
    if (scaleFit === "high") {
      scaleMod = 10;
      scaleDetail = 'Well-suited for your scale';
    } else if (scaleFit === "low") {
      scaleMod = -10;
      scaleDetail = 'May not fit your organisation size';
    }
    
    if (scaleMod !== 0) {
      modifiers.push({ label: "Company Size Fit", value: scaleMod, detail: scaleDetail });
      totalModifier += scaleMod;
    }
    
    if ((profile.companySize === "startup" || profile.companySize === "small")) {
      if (platform.priceTier <= 2) {
        modifiers.push({ label: "Budget Friendly", value: 8, detail: "Lower pricing suits smaller organisations" });
        totalModifier += 8;
      } else if (platform.priceTier >= 4) {
        modifiers.push({ label: "Premium Pricing", value: -8, detail: "Enterprise pricing may exceed budget" });
        totalModifier -= 8;
      }
    }
  }

  // Industry Fit scoring
  if (profile.industry) {
    const industryKey = profile.industry.toLowerCase().replace(/\s+/g, '') as keyof typeof context.industryFit;
    const industryFit = context.industryFit[industryKey];
    if (industryFit) {
      let industryMod = 0;
      let industryDetail = '';
      
      if (industryFit === "high") {
        industryMod = 8;
        industryDetail = 'Strong industry specialisation';
      } else if (industryFit === "low") {
        industryMod = -8;
        industryDetail = 'Limited industry focus';
      }
      
      if (industryMod !== 0) {
        modifiers.push({ label: "Industry Fit", value: industryMod, detail: industryDetail });
        totalModifier += industryMod;
      }
    }
  }

  // Finance Focus scoring
  if (profile.financeFocus === "high") {
    let financeMod = 0;
    let financeDetail = '';
    
    if (context.financeSpecificity === "purpose-built") {
      financeMod = 10;
      financeDetail = 'Purpose-built for finance teams';
    } else if (context.financeSpecificity === "finance-capable") {
      financeMod = 5;
      financeDetail = 'Finance-aware capabilities';
    }
    
    if (financeMod !== 0) {
      modifiers.push({ label: "Finance Focus", value: financeMod, detail: financeDetail });
      totalModifier += financeMod;
    }
  }

  // Deployment Ease scoring
  let easeMod = 0;
  let easeDetail = '';
  
  if (context.deploymentEase === "plug-and-play") {
    easeMod = 8;
    easeDetail = 'Quick deployment, minimal setup';
  } else if (context.deploymentEase === "low-code") {
    easeMod = 4;
    easeDetail = 'Low-code configuration';
  } else if (context.deploymentEase === "developer-required") {
    easeMod = -4;
    easeDetail = 'Requires developer resources';
  }
  
  if (easeMod !== 0) {
    modifiers.push({ label: "Ease of Deployment", value: easeMod, detail: easeDetail });
    totalModifier += easeMod;
  }

  // Allow wider range for ERP synergies. NaN-safe via clamp().
  totalModifier = clamp(totalModifier, -30, 35, 0);
  const finalScore = Math.round(clamp(normalizedBase + totalModifier, 0, 100, 0));

  return { score: finalScore, modifiers };
}

const epmFeatureComparison: FeatureCategory[] = [
  {
    category: "Financial Close",
    features: [
      { name: "Consolidation", values: { onestream: true, "onestream-cpm-express": true, pigment: false, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: true, abacum: false } },
      { name: "Intercompany Matching", values: { onestream: true, "onestream-cpm-express": true, pigment: false, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": "partial", vena: true, abacum: false } },
      { name: "Currency Translation", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: true, abacum: true } },
      { name: "Journal Entries", values: { onestream: true, "onestream-cpm-express": true, pigment: false, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": "partial", vena: true, abacum: false } },
    ],
  },
  {
    category: "Planning",
    features: [
      { name: "Driver-based Planning", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: true, abacum: true } },
      { name: "Scenario Modelling", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: true, abacum: true } },
      { name: "Rolling Forecasts", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: true, abacum: true } },
      { name: "Workforce Planning", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: true, abacum: true } },
    ],
  },
  {
    category: "Technology",
    features: [
      { name: "Cloud-native", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: true, anaplan: true, board: true, sapbpc: false, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: true, abacum: true } },
      { name: "In-memory Processing", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: true, anaplan: true, board: true, sapbpc: true, "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: "partial", abacum: true } },
      { name: "AI/ML Native", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: true, anaplan: true, board: true, sapbpc: "partial", "sap-sac-gr": true, "cch-tagetik": true, jedox: true, "ibm-planning-analytics": true, vena: true, abacum: true } },
      { name: "Low-code Extensions", values: { onestream: true, "onestream-cpm-express": true, pigment: true, oracle: "partial", anaplan: true, board: true, sapbpc: "partial", "sap-sac-gr": "partial", "cch-tagetik": true, jedox: true, "ibm-planning-analytics": "partial", vena: true, abacum: true } },
    ],
  },
];

const erpFeatureComparison: FeatureCategory[] = [
  {
    category: "Financial Core",
    features: [
      { name: "General Ledger", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": true, netsuite: true, "sage-intacct": true, "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": true, acumatica: true } },
      { name: "Multi-Currency", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": true, netsuite: true, "sage-intacct": true, "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": true, acumatica: true } },
      { name: "Revenue Recognition", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": true, netsuite: "partial", "sage-intacct": true, "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": "partial", acumatica: true } },
      { name: "Fixed Assets", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": true, netsuite: true, "sage-intacct": true, "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": true, acumatica: true } },
    ],
  },
  {
    category: "Operations",
    features: [
      { name: "Inventory Management", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": "partial", netsuite: true, "sage-intacct": "partial", "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": true, acumatica: true } },
      { name: "Procurement", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": true, netsuite: true, "sage-intacct": true, "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": true, acumatica: true } },
      { name: "Manufacturing", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: "partial", "workday-fin": false, netsuite: "partial", "sage-intacct": false, "infor-cloudsuite": true, "ifs-cloud": "partial", "epicor-kinetic": true, acumatica: "partial" } },
      { name: "Project Management", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": true, netsuite: true, "sage-intacct": true, "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": true, acumatica: true } },
    ],
  },
  {
    category: "Technology",
    features: [
      { name: "Cloud-Native", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": true, netsuite: true, "sage-intacct": true, "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": true, acumatica: true } },
      { name: "API-First", values: { "oracle-erp": true, "sap-s4hana": "partial", dynamics365: true, "workday-fin": true, netsuite: true, "sage-intacct": true, "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": "partial", acumatica: true } },
      { name: "AI/ML Built-in", values: { "oracle-erp": true, "sap-s4hana": true, dynamics365: true, "workday-fin": true, netsuite: "partial", "sage-intacct": "partial", "infor-cloudsuite": true, "ifs-cloud": true, "epicor-kinetic": "partial", acumatica: "partial" } },
      { name: "Low-Code Extensions", values: { "oracle-erp": "partial", "sap-s4hana": "partial", dynamics365: true, "workday-fin": "partial", netsuite: true, "sage-intacct": true, "infor-cloudsuite": "partial", "ifs-cloud": "partial", "epicor-kinetic": "partial", acumatica: true } },
    ],
  },
];

const aiFeatureComparison: FeatureCategory[] = [
  {
    category: "Finance Capabilities",
    features: [
      { name: "Financial Analysis", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": "partial", "claude-enterprise": true, watsonx: true, "automation-anywhere": "partial", "uipath-ai": "partial", "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": "partial", "deepseek-r1": true, "aleph-alpha": true, "xai-grok": "partial", langchain: true, autogen: true, crewai: true, "nvidia-nim": "partial" } },
      { name: "Report Generation", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": true, "claude-enterprise": true, watsonx: true, "automation-anywhere": "partial", "uipath-ai": "partial", "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": true, "deepseek-r1": true, "aleph-alpha": true, "xai-grok": "partial", langchain: true, autogen: true, crewai: true, "nvidia-nim": "partial" } },
      { name: "Variance Analysis", values: { "copilot-finance": true, "chatgpt-enterprise": "partial", "gemini-workspace": "partial", "claude-enterprise": true, watsonx: true, "automation-anywhere": "partial", "uipath-ai": "partial", "cohere-enterprise": "partial", "aws-bedrock": "partial", "salesforce-einstein": true, "mistral-ai": "partial", "meta-llama": "partial", "deepseek-r1": true, "aleph-alpha": "partial", "xai-grok": "partial", langchain: "partial", autogen: "partial", crewai: "partial", "nvidia-nim": "partial" } },
      { name: "Process Automation", values: { "copilot-finance": true, "chatgpt-enterprise": "partial", "gemini-workspace": "partial", "claude-enterprise": "partial", watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": "partial", "salesforce-einstein": true, "mistral-ai": "partial", "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": "partial", "xai-grok": "partial", langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "Reconciliation QA", values: { "copilot-finance": true, "chatgpt-enterprise": "partial", "gemini-workspace": "partial", "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": "partial", "salesforce-einstein": "partial", "mistral-ai": "partial", "meta-llama": "partial", "deepseek-r1": true, "aleph-alpha": "partial", "xai-grok": "partial", langchain: true, autogen: true, crewai: true, "nvidia-nim": "partial" } },
    ],
  },
  {
    category: "Security & Compliance",
    features: [
      { name: "SOC 2 Compliant", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": true, "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": true, "xai-grok": "partial", langchain: "partial", autogen: "partial", crewai: "partial", "nvidia-nim": true } },
      { name: "Data Encryption", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": true, "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": true, "deepseek-r1": true, "aleph-alpha": true, "xai-grok": true, langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "No Training on Data", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": true, "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": true, "deepseek-r1": true, "aleph-alpha": true, "xai-grok": true, langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "On-Premise Option", values: { "copilot-finance": "partial", "chatgpt-enterprise": false, "gemini-workspace": false, "claude-enterprise": false, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": "partial", "salesforce-einstein": false, "mistral-ai": true, "meta-llama": true, "deepseek-r1": "partial", "aleph-alpha": true, "xai-grok": false, langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "EU Data Sovereignty", values: { "copilot-finance": "partial", "chatgpt-enterprise": "partial", "gemini-workspace": "partial", "claude-enterprise": "partial", watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": "partial", "salesforce-einstein": "partial", "mistral-ai": true, "meta-llama": true, "deepseek-r1": "partial", "aleph-alpha": true, "xai-grok": false, langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "Audit Trail/Explainability", values: { "copilot-finance": true, "chatgpt-enterprise": "partial", "gemini-workspace": "partial", "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": "partial", "salesforce-einstein": true, "mistral-ai": "partial", "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": true, "xai-grok": "partial", langchain: true, autogen: true, crewai: "partial", "nvidia-nim": "partial" } },
    ],
  },
  {
    category: "Integration & Deployment",
    features: [
      { name: "API Access", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": true, "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": true, "deepseek-r1": true, "aleph-alpha": true, "xai-grok": true, langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "ERP Integration", values: { "copilot-finance": true, "chatgpt-enterprise": "partial", "gemini-workspace": "partial", "claude-enterprise": "partial", watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": "partial", "salesforce-einstein": true, "mistral-ai": "partial", "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": "partial", "xai-grok": "partial", langchain: true, autogen: true, crewai: true, "nvidia-nim": "partial" } },
      { name: "Excel Integration", values: { "copilot-finance": true, "chatgpt-enterprise": "partial", "gemini-workspace": "partial", "claude-enterprise": "partial", watsonx: "partial", "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": "partial", "salesforce-einstein": "partial", "mistral-ai": "partial", "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": "partial", "xai-grok": "partial", langchain: "partial", autogen: "partial", crewai: "partial", "nvidia-nim": "partial" } },
      { name: "Custom Workflows", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": "partial", "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": true, "deepseek-r1": true, "aleph-alpha": true, "xai-grok": "partial", langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "Self-Host Containers", values: { "copilot-finance": false, "chatgpt-enterprise": false, "gemini-workspace": false, "claude-enterprise": false, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": false, "salesforce-einstein": false, "mistral-ai": true, "meta-llama": true, "deepseek-r1": "partial", "aleph-alpha": true, "xai-grok": false, langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
    ],
  },
  {
    category: "AI Architecture",
    features: [
      { name: "Model Agnostic", values: { "copilot-finance": false, "chatgpt-enterprise": false, "gemini-workspace": false, "claude-enterprise": false, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": false, "aws-bedrock": true, "salesforce-einstein": false, "mistral-ai": false, "meta-llama": false, "deepseek-r1": false, "aleph-alpha": false, "xai-grok": false, langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "Multi-Agent Support", values: { "copilot-finance": "partial", "chatgpt-enterprise": true, "gemini-workspace": "partial", "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": "partial", "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": "partial", "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": "partial", "xai-grok": "partial", langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "RAG Built-in", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": "partial", "claude-enterprise": true, watsonx: true, "automation-anywhere": "partial", "uipath-ai": "partial", "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": "partial", "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": "partial", "xai-grok": "partial", langchain: true, autogen: true, crewai: true, "nvidia-nim": "partial" } },
      { name: "Tool Calling/Function Use", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": true, "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": "partial", "xai-grok": true, langchain: true, autogen: true, crewai: true, "nvidia-nim": true } },
      { name: "Guardrails/Safety", values: { "copilot-finance": true, "chatgpt-enterprise": true, "gemini-workspace": true, "claude-enterprise": true, watsonx: true, "automation-anywhere": true, "uipath-ai": true, "cohere-enterprise": true, "aws-bedrock": true, "salesforce-einstein": true, "mistral-ai": true, "meta-llama": "partial", "deepseek-r1": "partial", "aleph-alpha": true, "xai-grok": "partial", langchain: true, autogen: true, crewai: "partial", "nvidia-nim": true } },
    ],
  },
];

const categoryDescriptions = {
  epm: {
    title: "Enterprise Performance Management (EPM)",
    description: "EPM platforms enable financial consolidation, planning, budgeting, and reporting. Compare leading solutions to find the right fit for your organisation's corporate performance management needs."
  },
  erp: {
    title: "Enterprise Resource Planning (ERP)",
    description: "ERP systems integrate core business processes including finance, supply chain, and procurement. Evaluate enterprise platforms to support your organisation's operational requirements."
  },
  ai: {
    title: "AI Tools for Finance",
    description: "AI-powered tools are transforming finance operations through automation, analysis, and intelligent insights. Compare leading AI solutions designed for finance professionals."
  }
};

function PriceTierBadge({ tier, priceRange, isHighlighted = false }: { tier: number; priceRange?: string; isHighlighted?: boolean }) {
  const config = [
    { label: "Budget", colour: "bg-green-500", textColour: "text-white", dotColour: "bg-green-400" },
    { label: "Value", colour: "bg-emerald-500", textColour: "text-white", dotColour: "bg-emerald-400" },
    { label: "Mid-Range", colour: "bg-yellow-500", textColour: "text-white", dotColour: "bg-yellow-400" },
    { label: "Premium", colour: "bg-orange-500", textColour: "text-white", dotColour: "bg-orange-400" },
    { label: "Enterprise", colour: "bg-red-500", textColour: "text-white", dotColour: "bg-red-400" },
  ];
  const { label, colour, textColour, dotColour } = config[tier - 1];
  const displayLabel = priceRange || label;
  
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      className="inline-block"
    >
      <UITooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${colour} ${textColour} text-xs cursor-help flex items-center gap-1.5 ${isHighlighted ? 'ring-2 ring-[#7FB8A3] ring-offset-1' : ''}`} 
            data-testid={`badge-price-tier-${tier}`}
          >
            <motion.span
              className={`w-2 h-2 rounded-full ${dotColour}`}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            {displayLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {tier === 1 && "Most affordable - best for budget-conscious organisations"}
            {tier === 2 && "Good value - balanced cost and features"}
            {tier === 3 && "Mid-range pricing - comprehensive functionality"}
            {tier === 4 && "Premium tier - advanced features and support"}
            {tier === 5 && "Enterprise level - full capabilities and dedicated support"}
          </p>
        </TooltipContent>
      </UITooltip>
    </motion.div>
  );
}

function ROIPotentialBadge({ potential, isHighlighted = false }: { potential: "high" | "medium" | "low"; isHighlighted?: boolean }) {
  const config = {
    high: { 
      label: "High ROI", 
      colour: "bg-green-500",
      textColour: "text-white",
      dotColour: "bg-green-300",
      icon: TrendingUp 
    },
    medium: { 
      label: "Medium ROI", 
      colour: "bg-yellow-500",
      textColour: "text-white",
      dotColour: "bg-yellow-300",
      icon: TrendingUp 
    },
    low: { 
      label: "Lower ROI", 
      colour: "bg-orange-500",
      textColour: "text-white",
      dotColour: "bg-orange-300",
      icon: TrendingUp 
    },
  };
  const { label, colour, textColour, dotColour, icon: Icon } = config[potential];
  
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      className="inline-block"
    >
      <UITooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${colour} ${textColour} text-xs cursor-help flex items-center gap-1.5 ${isHighlighted ? 'ring-2 ring-[#7FB8A3] ring-offset-1' : ''}`} 
            data-testid={`badge-roi-${potential}`}
          >
            <motion.span
              className={`w-2 h-2 rounded-full ${dotColour}`}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [1, 0.6, 1]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <Icon className="w-3 h-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {potential === "high" && "Strong return potential - typically 150-300% ROI within 2-3 years"}
            {potential === "medium" && "Moderate return potential - typically 100-150% ROI within 3-4 years"}
            {potential === "low" && "Lower return potential - typically 50-100% ROI, longer payback period"}
          </p>
        </TooltipContent>
      </UITooltip>
    </motion.div>
  );
}

// Segment Rank Badge Component
function SegmentRankBadge({ 
  segmentContext, 
  compact = false 
}: { 
  segmentContext: SegmentContext; 
  compact?: boolean;
}) {
  const { rank, total, percentile, segmentLabel, isTopForSegment } = segmentContext;
  
  const getRankColor = () => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-yellow-400';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-600';
    if (rank <= 5) return 'bg-[#7FB8A3]/100/20 text-[#8E4F67] border-[#7FB8A3]/50';
    return 'bg-muted text-muted-foreground border-border';
  };
  
  const getRankIcon = () => {
    if (rank === 1) return <Trophy className="w-3 h-3" />;
    if (rank <= 3) return <Award className="w-3 h-3" />;
    return null;
  };
  
  if (compact) {
    return (
      <UITooltip>
        <TooltipTrigger asChild>
          <Badge className={`${getRankColor()} text-[10px] px-1.5 py-0 cursor-help`}>
            {getRankIcon()}
            <span className="ml-0.5">#{rank}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-sm">
            Rank #{rank} of {total} for {segmentLabel}
            <br />
            <span className="text-muted-foreground">{percentile}th percentile</span>
          </p>
        </TooltipContent>
      </UITooltip>
    );
  }
  
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <Badge className={`${getRankColor()} text-xs cursor-help flex items-center gap-1`}>
          {getRankIcon()}
          <span>#{rank} for {segmentLabel}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[250px]">
        <div className="space-y-1">
          <p className="font-medium">Segment Ranking</p>
          <p className="text-sm text-muted-foreground">
            Ranked #{rank} out of {total} platforms for {segmentLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {percentile}th percentile in this segment
          </p>
        </div>
      </TooltipContent>
    </UITooltip>
  );
}

// Why This Ranking Summary Component
function WhyThisRankingSummary({ 
  summary, 
  compact = false 
}: { 
  summary: string; 
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground italic truncate">
        {summary}
      </p>
    );
  }
  
  return (
    <div className="flex items-start gap-2 mt-2 p-2 bg-muted/50 rounded-md">
      <Info className="w-4 h-4 text-brand-teal mt-0.5 flex-shrink-0" />
      <p className="text-sm text-muted-foreground">
        {summary}
      </p>
    </div>
  );
}

// Score Breakdown Tooltip Component
function ScoreBreakdownTooltip({
  platform,
  categories,
  weights,
  children
}: {
  platform: Platform;
  categories: Category[];
  weights: Record<string, number>;
  children: React.ReactNode;
}) {
  const breakdown = calculateScoreBreakdown(platform, categories, weights);
  const topContributors = breakdown.slice(0, 5);
  
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[320px] p-0">
        <div className="p-3">
          <div className="font-medium text-sm mb-2 flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5 text-brand-cyan" />
            Score Breakdown
          </div>
          <div className="space-y-1.5 text-xs">
            {topContributors.map((item) => (
              <div key={item.categoryId} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground truncate flex-1">
                  {item.categoryName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {item.rawScore.toFixed(1)} × {item.normalizedWeight.toFixed(0)}%
                  </span>
                  <span className="font-medium w-8 text-right">
                    = {item.contribution.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {breakdown.length > 5 && (
              <div className="text-muted-foreground text-center pt-1">
                +{breakdown.length - 5} more categories
              </div>
            )}
            <div className="border-t pt-1.5 mt-1.5 flex justify-between font-medium">
              <span>Total Weighted Score</span>
              <span className="text-brand-cyan">
                {breakdown.reduce((sum, b) => sum + b.contribution, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </UITooltip>
  );
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <UITooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Full support - feature is fully available</p>
        </TooltipContent>
      </UITooltip>
    );
  }
  if (value === false) {
    return (
      <UITooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <XCircle className="w-5 h-5 text-muted-foreground/30 mx-auto" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Not available - feature is not supported</p>
        </TooltipContent>
      </UITooltip>
    );
  }
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium cursor-help">Partial</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Partial support - feature available with limitations</p>
      </TooltipContent>
    </UITooltip>
  );
}

const IMPLEMENTATION_PHASES_TEMPLATE: { name: string; startPct: number; endPct: number; color: string }[] = [
  { name: "Discovery & Planning", startPct: 0, endPct: 0.17, color: "#252826" },
  { name: "Design & Configuration", startPct: 0.17, endPct: 0.50, color: "#5E8D7A" },
  { name: "Data Migration", startPct: 0.33, endPct: 0.67, color: "#8E4F67" },
  { name: "Testing & UAT", startPct: 0.50, endPct: 0.75, color: "#7FB8A3" },
  { name: "Training", startPct: 0.58, endPct: 0.83, color: "#6366f1" },
  { name: "Go-Live & Hypercare", startPct: 0.75, endPct: 1.0, color: "#5E8D7A" },
];

function parseImplementationTime(timeStr: string): { min: number; max: number } {
  // Handle weeks (convert to months)
  const weeksMatch = timeStr.match(/(\d+)-(\d+)\s*weeks?/i);
  if (weeksMatch) {
    const minWeeks = parseInt(weeksMatch[1], 10);
    const maxWeeks = parseInt(weeksMatch[2], 10);
    // Convert weeks to months (4 weeks = 1 month), minimum 1 month
    return { 
      min: Math.max(1, Math.round(minWeeks / 4)), 
      max: Math.max(1, Math.round(maxWeeks / 4)) 
    };
  }
  const singleWeeksMatch = timeStr.match(/(\d+)\s*weeks?/i);
  if (singleWeeksMatch) {
    const weeks = parseInt(singleWeeksMatch[1], 10);
    const months = Math.max(1, Math.round(weeks / 4));
    return { min: months, max: months };
  }
  
  // Handle months
  const match = timeStr.match(/(\d+)-(\d+)\s*months?/i);
  if (match) {
    return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
  }
  const singleMatch = timeStr.match(/(\d+)\s*months?/i);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    return { min: val, max: val };
  }
  return { min: 12, max: 18 };
}

function generatePlatformTimeline(platform: Platform): PlatformTimeline {
  const totalMonths = parseImplementationTime(platform.implementationTime);
  const avgMonths = (totalMonths.min + totalMonths.max) / 2;
  const totalWeeks = avgMonths * 4;
  
  const phases: ImplementationPhase[] = IMPLEMENTATION_PHASES_TEMPLATE.map((template) => ({
    name: template.name,
    startWeek: Math.round(template.startPct * totalWeeks),
    endWeek: Math.round(template.endPct * totalWeeks),
    color: template.color,
  }));
  
  return {
    platformId: platform.id,
    platformName: platform.shortName,
    totalMonths,
    phases,
  };
}

function TimelineVisualization({ 
  platforms, 
  selectedPlatformIds 
}: { 
  platforms: Platform[]; 
  selectedPlatformIds: string[];
}) {
  const [selectedTimelinePlatforms, setSelectedTimelinePlatforms] = useState<string[]>(
    selectedPlatformIds.slice(0, 4)
  );

  useEffect(() => {
    setSelectedTimelinePlatforms(selectedPlatformIds.slice(0, 4));
  }, [selectedPlatformIds]);

  const selectedPlatformsForTimeline = platforms.filter(p => 
    selectedTimelinePlatforms.includes(p.id)
  );

  const timelines = selectedPlatformsForTimeline.map(generatePlatformTimeline);
  
  const maxWeeks = Math.max(
    ...timelines.flatMap(t => t.phases.map(p => p.endWeek)),
    24
  );
  const maxMonths = Math.ceil(maxWeeks / 4);

  const handleTimelinePlatformToggle = (platformId: string) => {
    setSelectedTimelinePlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(id => id !== platformId);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, platformId];
    });
  };

  const monthMarkers = Array.from({ length: maxMonths + 1 }, (_, i) => i);

  return (
    <Card className="mt-4 sm:mt-6" data-testid="card-timeline-visualizer">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cream" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Implementation Timeline</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Typical implementation phases</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="w-fit">
            {selectedTimelinePlatforms.length}/4 platforms
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-6">
        <div className="mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">Select platforms to compare (max 4):</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {platforms.slice(0, 8).map((platform) => (
              <Button
                key={platform.id}
                variant={selectedTimelinePlatforms.includes(platform.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimelinePlatformToggle(platform.id)}
                disabled={!selectedTimelinePlatforms.includes(platform.id) && selectedTimelinePlatforms.length >= 4}
                className={selectedTimelinePlatforms.includes(platform.id) 
                  ? "bg-[#7FB8A3] text-[#252826] hover:bg-[#7FB8A3]/90" 
                  : ""
                }
                data-testid={`button-timeline-platform-${platform.id}`}
              >
                {platform.shortName}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2 sm:gap-3">
          {IMPLEMENTATION_PHASES_TEMPLATE.map((phase) => (
            <div key={phase.name} className="flex items-center gap-1">
              <div 
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" 
                style={{ backgroundColor: phase.color }}
              />
              <span className="text-[10px] sm:text-xs text-muted-foreground">{phase.name}</span>
            </div>
          ))}
        </div>

        <div 
          className="relative overflow-x-auto" 
          data-testid="chart-implementation-gantt"
        >
          <div className="min-w-[600px]">
            <div className="flex items-center border-b border-border pb-2 mb-2">
              <div className="w-28 sm:w-36 flex-shrink-0 text-xs font-medium text-muted-foreground">
                Platform
              </div>
              <div className="flex-1 relative">
                <div className="flex justify-between">
                  {monthMarkers.map((month) => (
                    <div 
                      key={month} 
                      className="text-xs text-muted-foreground text-center"
                      style={{ width: `${100 / maxMonths}%` }}
                    >
                      {month}M
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {timelines.map((timeline) => (
                <div key={timeline.platformId} className="flex items-center gap-2">
                  <div className="w-28 sm:w-36 flex-shrink-0">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm font-medium truncate block cursor-help">
                          {timeline.platformName}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{timeline.totalMonths.min}-{timeline.totalMonths.max} months typical</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <div className="flex-1 relative h-8 bg-muted/30 rounded">
                    {timeline.phases.map((phase, idx) => {
                      const startPct = (phase.startWeek / maxWeeks) * 100;
                      const widthPct = ((phase.endWeek - phase.startWeek) / maxWeeks) * 100;
                      
                      return (
                        <UITooltip key={phase.name}>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute h-6 top-1 rounded cursor-help transition-opacity hover:opacity-90"
                              style={{
                                left: `${startPct}%`,
                                width: `${Math.max(widthPct, 2)}%`,
                                backgroundColor: phase.color,
                                opacity: 0.8 + (idx * 0.03),
                                zIndex: idx,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-semibold">{phase.name}</p>
                              <p className="text-muted-foreground">
                                Week {phase.startWeek} - Week {phase.endWeek}
                              </p>
                              <p className="text-muted-foreground">
                                ({Math.round(phase.startWeek / 4)}-{Math.round(phase.endWeek / 4)} months)
                              </p>
                            </div>
                          </TooltipContent>
                        </UITooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {timelines.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Select platforms above to view implementation timelines</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 hidden md:block">
          <h4 className="text-sm font-semibold mb-3">Timeline Comparison</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {timelines.map((timeline) => {
              const platform = platforms.find(p => p.id === timeline.platformId);
              // Use actual implementationTime string from platform data
              const durationDisplay = platform?.implementationTime || 
                `${timeline.totalMonths.min}-${timeline.totalMonths.max} months`;
              // Calculate go-live based on actual duration
              const avgMonths = (timeline.totalMonths.min + timeline.totalMonths.max) / 2;
              const goLiveMonth = Math.max(1, Math.round(avgMonths * 0.75));
              const goLiveDisplay = avgMonths <= 2 
                ? `~Week ${Math.round(goLiveMonth * 4 * 0.75)}`
                : `~Month ${goLiveMonth}`;
              
              return (
                <Card key={timeline.platformId} className="p-3">
                  <div className="text-sm font-medium mb-2">{timeline.platformName}</div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium text-foreground">
                        {durationDisplay}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Go-Live:</span>
                      <span className="font-medium text-foreground">
                        {goLiveDisplay}
                      </span>
                    </div>
                    {platform && (
                      <div className="flex justify-between">
                        <span>Price Tier:</span>
                        <span className="font-medium text-foreground">
                          {"£".repeat(Math.min(platform.priceTier, 5))}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MobilePlatformCarouselProps {
  platforms: Platform[];
  selectedPlatforms: string[];
  onPlatformToggle: (platformId: string) => void;
  onViewDetails: (platformId: string) => void;
  fitResults?: FitResult[];
  bestFitPlatform?: Platform | null;
  calculatedScores: {
    id: string;
    calculatedScore: number;
    fitAdjustedScore?: number;
    fitModifier?: number;
    fitLevel?: 'excellent' | 'good' | 'fair' | 'poor';
  }[];
  showFitAnalysis: boolean;
  categoryType: "epm" | "erp" | "ai";
}

function MobilePlatformCarousel({
  platforms,
  selectedPlatforms,
  onPlatformToggle,
  onViewDetails,
  fitResults,
  bestFitPlatform,
  calculatedScores,
  showFitAnalysis,
  categoryType,
}: MobilePlatformCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-brand-cyan';
    if (score >= 4) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBarWidth = (score: number) => {
    return `${(score / 10) * 100}%`;
  };

  return (
    <div 
      className="block md:hidden"
      data-testid="carousel-mobile-platforms"
    >
      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {platforms.map((platform, index) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              const fitResult = showFitAnalysis && fitResults ? fitResults.find(r => r.platformId === platform.id) : null;
              const isBestFit = bestFitPlatform?.id === platform.id;
              const calcScore = calculatedScores.find(p => p.id === platform.id);
              const displayScore = calcScore?.fitAdjustedScore ?? calcScore?.calculatedScore ?? 0;
              const rank = index + 1;

              return (
                <div
                  key={platform.id}
                  className="flex-none w-[85%] min-w-0 pl-4 first:pl-4"
                  data-testid={`card-mobile-platform-${platform.id}`}
                >
                  <Card
                    className={`h-full transition-all ${
                      isSelected
                        ? "ring-2 ring-[#7FB8A3] bg-[#7FB8A3]/5 shadow-lg"
                        : "shadow-md"
                    } ${selectedIndex === index ? 'scale-100' : 'scale-[0.98] opacity-90'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={`${getRankBadgeColor(rank)} text-xs font-semibold px-2 py-0.5`}
                          >
                            #{rank}
                          </Badge>
                          <div>
                            <h3 className="font-semibold text-base leading-tight">{platform.shortName}</h3>
                            <Badge variant="secondary" className="text-[10px] mt-0.5">
                              {platform.marketPosition}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlatformToggle(platform.id);
                          }}
                          className={`min-h-[44px] min-w-[44px] ${
                            isSelected 
                              ? "bg-[#7FB8A3] text-[#252826] hover:bg-[#7FB8A3]/90" 
                              : "border-[#5E8D7A] text-[#5E8D7A]"
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span className="text-xs">Select</span>
                          )}
                        </Button>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Overall Score</span>
                          <span className={`text-lg font-semibold ${getScoreColor(displayScore)}`}>
                            {displayScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-[#252826] to-[#7FB8A3] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: getScoreBarWidth(displayScore) }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                        {calcScore?.fitModifier !== undefined && calcScore.fitModifier !== 0 && (
                          <div className={`text-xs mt-1 ${calcScore.fitModifier > 0 ? 'text-green-500' : 'text-amber-500'}`}>
                            {calcScore.fitModifier > 0 ? '+' : ''}{calcScore.fitModifier.toFixed(1)} fit adjustment
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <Clock className="w-4 h-4 mx-auto mb-1 text-brand-teal" />
                          <div className="text-[10px] text-muted-foreground leading-tight">Implementation</div>
                          <div className="text-xs font-medium mt-0.5">{platform.implementationTime}</div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <DollarSign className="w-4 h-4 mx-auto mb-1 text-brand-teal" />
                          <div className="text-[10px] text-muted-foreground leading-tight">Price Tier</div>
                          <div className="text-xs font-medium mt-0.5">{'£'.repeat(Math.min(platform.priceTier, 5))}</div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-brand-teal" />
                          <div className="text-[10px] text-muted-foreground leading-tight">ROI</div>
                          <div className="text-xs font-medium mt-0.5 capitalize">{platform.roiPotential}</div>
                        </div>
                      </div>

                      {fitResult && (
                        <div className="mb-3">
                          <Badge 
                            className={`text-xs w-full justify-center py-1 ${
                              isBestFit 
                                ? 'bg-[#7FB8A3]/20 text-brand-teal ring-1 ring-[#7FB8A3]' 
                                : 'bg-muted'
                            }`}
                          >
                            {isBestFit && <Trophy className="w-3 h-3 mr-1" />}
                            {fitResult.fitLevel.charAt(0).toUpperCase() + fitResult.fitLevel.slice(1)} Fit
                          </Badge>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full min-h-[44px] border-[#5E8D7A] text-[#5E8D7A] hover:bg-[#5E8D7A] hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(platform.id);
                        }}
                        data-testid={`button-mobile-view-details-${platform.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {showSwipeHint && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-1/2 right-6 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm"
            >
              <span>Swipe</span>
              <ChevronRight className="w-4 h-4 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="outline"
          size="icon"
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm shadow-md border-[#8E4F67]/30 ${
            !canScrollPrev ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#7FB8A3]/10'
          }`}
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          aria-label="Previous platform"
        >
          <ChevronLeft className="w-5 h-5 text-brand-teal" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm shadow-md border-[#8E4F67]/30 ${
            !canScrollNext ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#7FB8A3]/10'
          }`}
          onClick={scrollNext}
          disabled={!canScrollNext}
          aria-label="Next platform"
        >
          <ChevronRight className="w-5 h-5 text-brand-teal" />
        </Button>
      </div>

      <div className="flex justify-center gap-1.5 mt-4">
        {platforms.map((platform, index) => (
          <button
            key={platform.id}
            onClick={() => scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              selectedIndex === index 
                ? 'bg-[#7FB8A3] w-6' 
                : 'bg-muted hover:bg-[#8E4F67]/50'
            }`}
            aria-label={`Go to ${platform.shortName}`}
            data-testid={`indicator-carousel-dot-${index}`}
          />
        ))}
      </div>

      <div className="text-center mt-3">
        <span className="text-xs text-muted-foreground">
          {selectedIndex + 1} of {platforms.length} platforms
        </span>
      </div>
    </div>
  );
}

interface ComparisonSectionProps {
  platforms: Platform[];
  categories: Category[];
  featureComparison: FeatureCategory[];
  categoryType: "epm" | "erp" | "ai";
}

function ComparisonSection({ platforms, categories, featureComparison, categoryType }: ComparisonSectionProps) {
  const { toast } = useToast();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(platforms.slice(0, 4).map(p => p.id));
  const [categoryWeights, setCategoryWeights] = useState<Record<string, number>>(() => {
    const weights: Record<string, number> = {};
    categories.forEach(cat => {
      weights[cat.id] = cat.weight;
    });
    return weights;
  });
  const userHasCustomWeights = useRef(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [pendingExportFn, setPendingExportFn] = useState<(() => Promise<void>) | undefined>(undefined);
  const [pendingExportTitle, setPendingExportTitle] = useState<string>("");
  const [pendingExportDescription, setPendingExportDescription] = useState<string>("");
  const [requireFreshVerification, setRequireFreshVerification] = useState(false);
  
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    revenue: null,
    companySize: null,
    erpLandscape: null,
    industry: null,
  });
  const [aiCompanyProfile, setAICompanyProfile] = useState<AICompanyProfile>({
    techStack: null,
    erpLandscape: null,
    companySize: null,
    industry: null,
    financeFocus: null,
  });
  const [showFitAnalysis, setShowFitAnalysis] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  
  const [wizardStep, setWizardStep] = useState<'industry' | 'preset' | 'profile' | 'results'>('industry');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  // Deep Dive Mode state
  const [deepDiveSelectedPlatforms, setDeepDiveSelectedPlatforms] = useState<string[]>([]);
  const [deepDiveModalOpen, setDeepDiveModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // Timeline Visualizer state
  const [showTimeline, setShowTimeline] = useState(true);

  const hasProfileFilters = !!(companyProfile.revenue || companyProfile.companySize || companyProfile.erpLandscape || companyProfile.industry);
  const hasAIProfileFilters = !!(aiCompanyProfile.techStack || aiCompanyProfile.erpLandscape || aiCompanyProfile.companySize || aiCompanyProfile.industry || aiCompanyProfile.financeFocus);

  useEffect(() => {
    if (categoryType !== 'epm' || userHasCustomWeights.current) return;
    const size = companyProfile.companySize;
    const revenue = companyProfile.revenue;
    const isSmallMid = size === 'startup' || size === 'small' || size === 'medium' 
      || revenue === 'under-10m' || revenue === '10m-50m' || revenue === '50m-250m';

    if (isSmallMid) {
      setCategoryWeights((prev) => ({
        ...prev,
        totalCostOwnership: 14,
        timeToValue: 12,
      }));
    } else {
      const defaults: Record<string, number> = {};
      categories.forEach(cat => { defaults[cat.id] = cat.weight; });
      setCategoryWeights(defaults);
    }
  }, [companyProfile.companySize, companyProfile.revenue, categoryType, categories]);

  // Analytics tracking for active engagement only
  const [comparisonSessionId] = useState(() => `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  
  const trackComparisonEvent = useCallback(async (eventType: string, data: Record<string, any> = {}) => {
    try {
      const fingerprint = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
        platform: navigator.platform,
      };
      
      await fetch("/api/analytics/widget-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widget: `${categoryType}_comparison`,
          eventType,
          timestamp: new Date().toISOString(),
          sessionId: comparisonSessionId,
          fingerprint,
          metadata: data,  // Store event-specific data in metadata field
        }),
      });
    } catch (e) {
      // Silent fail for analytics
    }
  }, [categoryType, comparisonSessionId]);

  // Track comparison loaded when component mounts
  useEffect(() => {
    trackComparisonEvent("comparison_loaded", {
      category: categoryType,
    });
  }, [trackComparisonEvent, categoryType]);

  const handlePlatformToggle = useCallback((platformId: string) => {
    setSelectedPlatforms((prev) => {
      const isRemoving = prev.includes(platformId);
      // Track vendor selection changes (active engagement)
      trackComparisonEvent("vendor_toggled", {
        category: categoryType,
        vendorId: platformId,
        action: isRemoving ? "removed" : "added",
      });
      return isRemoving
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId];
    });
  }, [categoryType, trackComparisonEvent]);

  const handleWeightChange = useCallback((categoryId: string, value: number[]) => {
    userHasCustomWeights.current = true;
    setCategoryWeights((prev) => ({
      ...prev,
      [categoryId]: value[0],
    }));
    trackComparisonEvent("driver_weight_changed", {
      category: categoryType,
      driverId: categoryId,
      newWeight: value[0],
    });
  }, [categoryType, trackComparisonEvent]);

  const handleIndustrySelect = useCallback((industryId: string) => {
    setCompanyProfile((prev) => ({ ...prev, industry: industryId }));
    // Also update AI profile for consistency across categories
    setAICompanyProfile((prev) => ({ ...prev, industry: industryId }));
    trackComparisonEvent("wizard_step_changed", { 
      step: 'preset', 
      fromStep: 'industry',
      category: categoryType,
      industry: industryId 
    });
    setWizardStep('preset');
  }, [categoryType, trackComparisonEvent]);

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    
    // Use centralized presets from the current category's preset array
    const currentPresets = categoryType === 'epm' ? epmWeightPresets : 
                           categoryType === 'erp' ? erpWeightPresets : 
                           epmWeightPresets;
    const selectedPresetData = currentPresets.find(p => p.id === presetId);
    
    if (presetId === 'industry-recommended' && companyProfile.industry && industryWeightPresets[companyProfile.industry]) {
      // Use industry-specific weights
      setCategoryWeights((prev) => ({
        ...prev,
        ...industryWeightPresets[companyProfile.industry!],
      }));
    } else if (selectedPresetData && Object.keys(selectedPresetData.weights).length > 0) {
      // Use preset weights from the centralized array
      setCategoryWeights((prev) => ({
        ...prev,
        ...selectedPresetData.weights,
      }));
    }
    trackComparisonEvent("wizard_step_changed", { 
      step: 'profile', 
      fromStep: 'preset',
      category: categoryType,
      preset: presetId,
      industry: companyProfile.industry 
    });
    setWizardStep('profile');
  };

  const handleViewRecommendations = () => {
    // Capture the appropriate profile based on category
    const profileData = categoryType === 'ai' ? aiCompanyProfile : companyProfile;
    
    // Validate required fields before proceeding - different fields for AI vs EPM/ERP
    const missingFields: string[] = [];
    
    if (categoryType === 'ai') {
      // AI category required fields
      if (!aiCompanyProfile?.companySize) {
        missingFields.push('Company Size');
      }
      if (!aiCompanyProfile?.erpLandscape) {
        missingFields.push('Current ERP/Finance System');
      }
      if (!aiCompanyProfile?.industry) {
        missingFields.push('Industry');
      }
    } else {
      // EPM/ERP category required fields
      if (!companyProfile?.revenue) {
        missingFields.push('Annual Revenue');
      }
      if (!companyProfile?.companySize) {
        missingFields.push('Company Size');
      }
      if (!companyProfile?.erpLandscape) {
        missingFields.push('Your existing ERP / accounting system');
      }
    }
    
    if (missingFields.length > 0) {
      toast({
        title: "Please complete your profile",
        description: `To provide accurate recommendations, we need: ${missingFields.join(', ')}. This helps us tailor platform scores to your organisation's specific context.`,
        variant: "destructive",
      });
      return;
    }
    
    // Get top 5 platform recommendations based on current scores
    const topPlatforms = sortedByFit.slice(0, 5).map(p => p.id);
    
    trackComparisonEvent("wizard_step_changed", { 
      step: 'results', 
      fromStep: 'profile',
      category: categoryType,
      profile: profileData,
      preset: selectedPreset 
    });
    // Track results viewed with complete context including top recommendations
    trackComparisonEvent("results_viewed", {
      category: categoryType,
      industry: companyProfile.industry || aiCompanyProfile.industry,
      preset: selectedPreset,
      profile: profileData,
      companySize: profileData?.companySize,
      erpLandscape: profileData?.erpLandscape,
      selectedVendors: topPlatforms, // Top 5 recommended platforms
    });
    setWizardStep('results');
    // Auto-select top 4 platforms based on fit analysis
    // Sort ALL calculatedScores (not filtered sortedScores) to get true top 4
    const allPlatformsSorted = [...calculatedScores].sort((a, b) => {
      const scoreA = a.fitAdjustedScore ?? a.calculatedScore;
      const scoreB = b.fitAdjustedScore ?? b.calculatedScore;
      return scoreB - scoreA;
    });
    if (allPlatformsSorted.length >= 4) {
      const top4Ids = allPlatformsSorted.slice(0, 4).map(p => p.id);
      setSelectedPlatforms(top4Ids);
    }
  };

  const handleBackToIndustry = () => {
    trackComparisonEvent("wizard_step_changed", { 
      step: 'industry', 
      fromStep: wizardStep,
      category: categoryType,
    });
    setWizardStep('industry');
    setCompanyProfile({ revenue: null, companySize: null, erpLandscape: null, industry: null });
    setSelectedPreset(null);
    userHasCustomWeights.current = false;
    const defaultWeights: Record<string, number> = {};
    categories.forEach(cat => {
      defaultWeights[cat.id] = cat.weight;
    });
    setCategoryWeights(defaultWeights);
  };

  const handleBackToPreset = () => {
    trackComparisonEvent("wizard_step_changed", { 
      step: 'preset', 
      fromStep: wizardStep,
      category: categoryType,
    });
    setWizardStep('preset');
  };

  // Industry options for wizard with icons
  const industryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'manufacturing': Factory,
    'financial-services': Building2,
    'technology': Cpu,
    'healthcare': Heart,
    'retail': ShoppingCart,
    'professional-services': Briefcase,
    'energy': Zap,
    'public-sector': Landmark,
    'telecommunications': Phone,
    'transportation-logistics': Truck,
    'insurance': ShieldIcon,
    'real-estate': Home,
    'media-entertainment': Film,
    'education': GraduationCap,
    'hospitality': UtensilsCrossed,
    'other': HelpCircle,
  };

  const industryOptions = [
    { id: 'financial-services', label: 'Financial Services' },
    { id: 'manufacturing', label: 'Manufacturing' },
    { id: 'technology', label: 'Technology' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'retail', label: 'Retail & Consumer' },
    { id: 'professional-services', label: 'Professional Services' },
    { id: 'energy', label: 'Energy & Utilities' },
    { id: 'public-sector', label: 'Public Sector & Government' },
    { id: 'telecommunications', label: 'Telecommunications' },
    { id: 'transportation-logistics', label: 'Transportation & Logistics' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'real-estate', label: 'Real Estate & Property' },
    { id: 'media-entertainment', label: 'Media & Entertainment' },
    { id: 'education', label: 'Education' },
    { id: 'hospitality', label: 'Hospitality & Travel' },
    { id: 'other', label: 'Other Industry' },
  ];

  // Preset options for weight configuration - uses centralized presets from platform-config.ts
  // Icon mapping for preset display
  const presetIconMap: Record<string, any> = {
    'balanced': Scale,
    'consolidation': Building2,
    'planning': LineChart,
    'ai-native': Sparkles,
    'mid-market': Zap,
    'regulatory': Shield,
    'industry-recommended': Target,
    'innovation-focused': Sparkles,
    'compliance-first': Shield,
    'cost-conscious': DollarSign,
    'manufacturing': Building2,
    'retail': ShoppingCart,
    'services': Briefcase,
    'healthcare': HeartPulse,
    'financial-services': TrendingUp,
  };
  
  // Use centralized presets from platform-config.ts
  const presetOptions = useMemo(() => {
    const basePresets = categoryType === 'epm' ? epmWeightPresets : 
                        categoryType === 'erp' ? erpWeightPresets : 
                        epmWeightPresets;
    
    return basePresets.map(preset => ({
      id: preset.id,
      label: preset.name,
      icon: presetIconMap[preset.id] || Scale,
      description: preset.description,
      weights: preset.weights,
    }));
  }, [categoryType]);

  // Deep Dive Mode handlers
  const handleDeepDivePlatformToggle = (platformId: string) => {
    setDeepDiveSelectedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        return prev.filter((id) => id !== platformId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, platformId];
    });
  };

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const canEnterDeepDive = selectedPlatforms.length >= 2;
  const canCompareSelected = deepDiveSelectedPlatforms.length >= 2 && deepDiveSelectedPlatforms.length <= 3;

  const deepDiveSelectedPlatformsData = platforms.filter((p) => deepDiveSelectedPlatforms.includes(p.id));

  // Calculate verdicts for each feature category
  const getCategoryVerdict = (category: FeatureCategory) => {
    const selectedPlats = deepDiveSelectedPlatformsData;
    if (selectedPlats.length < 2) return null;

    const scores: Record<string, number> = {};
    selectedPlats.forEach((p) => {
      scores[p.id] = 0;
    });

    category.features.forEach((feature) => {
      selectedPlats.forEach((p) => {
        const value = feature.values[p.id];
        if (value === true) scores[p.id] += 2;
        else if (value === "partial") scores[p.id] += 1;
      });
    });

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0];
    const runnerUp = sorted[1];

    if (winner[1] === runnerUp[1]) {
      return { winnerId: null, verdict: "Tie - Both platforms perform equally" };
    }

    const winnerPlatform = selectedPlats.find((p) => p.id === winner[0]);
    return {
      winnerId: winner[0],
      verdict: `${winnerPlatform?.shortName || "Winner"} leads in ${category.category}`,
    };
  };

  // Check if a feature is a differentiator (one platform has it, others don't)
  const isDifferentiator = (feature: { name: string; values: Record<string, boolean | string> }) => {
    const selectedPlats = deepDiveSelectedPlatformsData;
    if (selectedPlats.length < 2) return false;

    const values = selectedPlats.map((p) => feature.values[p.id]);
    const hasTrue = values.some((v) => v === true);
    const hasFalse = values.some((v) => v === false);
    return hasTrue && hasFalse;
  };

  const normalizedWeights = useMemo(() => {
    const total = Object.values(categoryWeights).reduce((sum, w) => sum + w, 0);
    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(categoryWeights)) {
      normalized[key] = (value / total) * 100;
    }
    return normalized;
  }, [categoryWeights]);

  const calculatedScores = useMemo(() => {
    return platforms.map((platform) => {
      let totalScore = 0;
      for (const category of categories) {
        let score = platform.scores[category.id] || 0;
        const weight = normalizedWeights[category.id] / 100;
        
        // Apply priceTier multiplier to TCO score - formula-based penalty for expensive vendors
        // Uses inverse relationship: higher priceTier = lower multiplier
        // Formula: multiplier = 1.1 - (priceTier * 0.1), clamped between 0.6 and 1.0
        if (category.id === 'totalCostOwnership' && platform.priceTier) {
          const tcoMultiplier = Math.max(0.6, Math.min(1.0, 1.1 - (platform.priceTier * 0.1)));
          score = score * tcoMultiplier;
        }
        
        totalScore += score * weight;
      }
      
      if (categoryType === 'epm') {
        const WEIGHT_TRIGGER = 10;

        const consolWeight = normalizedWeights['consolidationClose'] || 0;
        const consolScore = platform.scores['consolidationClose'] || 0;
        const CONSOL_THRESHOLD = 5.5;
        if (consolWeight >= WEIGHT_TRIGGER && consolScore < CONSOL_THRESHOLD) {
          const gap = CONSOL_THRESHOLD - consolScore;
          const weightFactor = consolWeight / 100;
          const consolPenalty = gap * weightFactor * 6.0;
          totalScore -= consolPenalty;
        }

        const regWeight = normalizedWeights['regulatoryCompliance'] || 0;
        const regScore = platform.scores['regulatoryCompliance'] || 0;
        const REG_THRESHOLD = 5.0;
        if (regWeight >= WEIGHT_TRIGGER && regScore < REG_THRESHOLD) {
          const gap = REG_THRESHOLD - regScore;
          const weightFactor = regWeight / 100;
          const regPenalty = gap * weightFactor * 5.0;
          totalScore -= regPenalty;
        }
      }
      
      const baseScore = Math.round(totalScore * 10) / 10;
      
      let fitAdjustedScore = baseScore;
      let fitModifier = 0;
      let fitLevel: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';
      let aiModifiers: { label: string; value: number; detail?: string }[] = [];
      
      if ((categoryType === 'epm' || categoryType === 'erp') && hasProfileFilters) {
        const sweetSpots = categoryType === 'epm' ? epmSweetSpots : erpSweetSpots;
        const sweetSpot = sweetSpots[platform.id];
        if (sweetSpot) {
          const result = calculateFitScore(platform.id, sweetSpot, companyProfile, baseScore, platform.priceTier);
          fitAdjustedScore = Math.round(result.score * 10) / 10;
          fitModifier = Math.round((result.score - baseScore) * 10) / 10;
          fitLevel = result.fitLevel;
        }
      }
      
      if (categoryType === 'ai' && hasAIProfileFilters) {
        const baseScoreConverted = baseScore * 10;
        const contextResult = calculateAIContextualScore(platform, aiCompanyProfile, baseScoreConverted);
        fitAdjustedScore = Math.round(contextResult.score / 10 * 10) / 10;
        fitModifier = Math.round((fitAdjustedScore - baseScore) * 10) / 10;
        aiModifiers = contextResult.modifiers;
        
        const absModifier = Math.abs(fitModifier);
        if (absModifier >= 1.5) fitLevel = fitModifier > 0 ? 'excellent' : 'poor';
        else if (absModifier >= 0.8) fitLevel = fitModifier > 0 ? 'good' : 'fair';
        else fitLevel = 'fair';
      }
      
      return {
        ...platform,
        calculatedScore: baseScore,
        fitAdjustedScore,
        fitModifier,
        fitLevel,
        aiModifiers,
      };
    });
  }, [platforms, categories, normalizedWeights, categoryType, hasProfileFilters, companyProfile, hasAIProfileFilters, aiCompanyProfile]);

  const sortedScores = useMemo(() => {
    return [...calculatedScores]
      .filter((p) => selectedPlatforms.includes(p.id))
      .sort((a, b) => {
        if ((categoryType === 'epm' || categoryType === 'erp') && hasProfileFilters) {
          return b.fitAdjustedScore - a.fitAdjustedScore;
        }
        if (categoryType === 'ai' && hasAIProfileFilters) {
          return b.fitAdjustedScore - a.fitAdjustedScore;
        }
        return b.calculatedScore - a.calculatedScore;
      });
  }, [calculatedScores, selectedPlatforms, categoryType, hasProfileFilters, hasAIProfileFilters]);

  const recommendedPlatform = sortedScores[0];
  const usesFitScoring = ((categoryType === 'epm' || categoryType === 'erp') && hasProfileFilters) || (categoryType === 'ai' && hasAIProfileFilters);


  // Memoize chartData to prevent unnecessary recalculations
  const chartData = useMemo(() => sortedScores.map((platform) => ({
    name: platform.shortName,
    score: usesFitScoring ? platform.fitAdjustedScore : platform.calculatedScore,
    baseScore: platform.calculatedScore,
    fitModifier: platform.fitModifier,
    fill: platform.id === recommendedPlatform?.id ? "#7FB8A3" : "#8E4F67",
  })), [sortedScores, usesFitScoring, recommendedPlatform?.id]);

  // Create unique short labels for radar chart categories to avoid duplicates
  const getCategoryShortLabel = (categoryId: string, categoryName: string): string => {
    const labelMap: Record<string, string> = {
      // ERP categories
      'aiAutomation': 'AI Auto',
      'aiEcosystemFit': 'AI Eco',
      'businessProcessAlignment': 'Process',
      'industryCapabilities': 'Industry',
      'cloudArchitecture': 'Cloud',
      'reportingAnalytics': 'Reporting',
      'scalabilityGrowth': 'Scale',
      'integrationCapabilities': 'Integrate',
      'tcoRoi': 'TCO/ROI',
      'vendorSupport': 'Support',
      'customizationFlexibility': 'Custom',
      'implementationTime': 'Implement',
      'userExperience': 'UX',
      'securityCompliance': 'Security',
      // EPM categories
      'consolidationClose': 'Consol',
      'planningForecasting': 'Planning',
      'modellingExtensibility': 'Modelling',
      'integrationDataFabric': 'Data Fabric',
      'reportingVisualization': 'Reporting',
      'governanceCompliance': 'Governance',
      'regulatoryCompliance': 'Regulatory',
      'timeToValue': 'Time2Value',
      'totalCostOwnership': 'TCO',
      'supportEcosystem': 'Ecosystem',
      // AI categories
      'modelCapabilities': 'Model',
      'contextWindow': 'Context',
      'multimodal': 'Multimodal',
      'codeGeneration': 'Code Gen',
      'enterpriseFeatures': 'Enterprise',
      'pricing': 'Pricing',
      'financeSpecific': 'Finance',
      'dataConnectors': 'Connectors',
      'securityPrivacy': 'Privacy',
      'deployment': 'Deploy',
    };
    return labelMap[categoryId] || categoryName.split(" ")[0];
  };

  // Memoize radarData to prevent unnecessary recalculations on every render
  const radarData = useMemo(() => categories.map((category) => {
    const data: Record<string, number | string> = { 
      category: getCategoryShortLabel(category.id, category.name),
      fullCategory: category.name,
      categoryId: category.id,
      // Background rings for gradient effect (scale with chart)
      bgGreen: 10,
      bgAmber: 6,
      bgRed: 3,
    };
    sortedScores.forEach((platform) => {
      data[platform.shortName] = platform.scores[category.id] || 0;
    });
    return data;
  }), [categories, sortedScores]);
  
  // Custom tooltip for radar chart with detailed information
  const RadarCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    // Filter out background rings from display
    const platformPayloads = payload.filter((p: any) => 
      !['bgGreen', 'bgAmber', 'bgRed'].includes(p.dataKey)
    );
    
    if (platformPayloads.length === 0) return null;
    
    const categoryData = payload[0]?.payload;
    const fullCategoryName = categoryData?.fullCategory || label;
    
    // Get rating label based on score
    const getRatingLabel = (score: number): { label: string; color: string } => {
      if (score >= 8) return { label: 'Excellent', color: 'text-green-500' };
      if (score >= 6) return { label: 'Good', color: 'text-emerald-500' };
      if (score >= 4) return { label: 'Fair', color: 'text-amber-500' };
      return { label: 'Limited', color: 'text-red-500' };
    };
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <div className="font-semibold text-sm mb-2 text-foreground border-b border-border pb-2">
          {fullCategoryName}
        </div>
        <div className="space-y-1.5">
          {platformPayloads.map((entry: any, index: number) => {
            const score = typeof entry.value === 'number' ? entry.value : 0;
            const rating = getRatingLabel(score);
            return (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{score.toFixed(1)}</span>
                  <span className={`text-xs ${rating.color}`}>{rating.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
          Scale: 0-10 (higher is better)
        </div>
      </div>
    );
  };

  const selectedPlatformsData = platforms.filter((p) => selectedPlatforms.includes(p.id));

  const fitResults = useMemo(() => {
    if ((categoryType !== 'epm' && categoryType !== 'erp') || !hasProfileFilters) return null;
    
    const sweetSpots = categoryType === 'epm' ? epmSweetSpots : erpSweetSpots;
    
    return sortedScores.map((platform) => {
      const sweetSpot = sweetSpots[platform.id];
      if (!sweetSpot) return null;
      
      return calculateFitScore(
        platform.id,
        sweetSpot,
        companyProfile,
        platform.calculatedScore,
        platform.priceTier
      );
    }).filter(Boolean) as FitResult[];
  }, [categoryType, hasProfileFilters, sortedScores, companyProfile]);

  const sortedByFit = useMemo(() => {
    if (!fitResults) return sortedScores;
    
    const fitMap = new Map(fitResults.map(r => [r.platformId, r]));
    return [...sortedScores].sort((a, b) => {
      const fitA = fitMap.get(a.id);
      const fitB = fitMap.get(b.id);
      if (fitA && fitB) {
        return fitB.score - fitA.score;
      }
      return b.calculatedScore - a.calculatedScore;
    });
  }, [fitResults, sortedScores]);

  const bestFitPlatform = fitResults && fitResults.length > 0 
    ? sortedByFit[0] 
    : null;

  const bestFitResult = fitResults && bestFitPlatform 
    ? fitResults.find(r => r.platformId === bestFitPlatform.id) 
    : null;

  // Create export function with current data snapshot - avoids stale closure issues
  const createExportFunction = (exportType: "pdf" | "excel") => {
    // Capture all current state values at function creation time
    const currentCategoryType = categoryType;
    const currentSelectedPlatformsData = selectedPlatformsData;
    const currentCategories = categories;
    const currentSortedScores = sortedScores;
    const currentCategoryWeights = categoryWeights;
    const currentRecommendedPlatform = recommendedPlatform;
    const currentUsesFitScoring = usesFitScoring;
    const currentCompanyProfile = companyProfile;
    const currentAiCompanyProfile = aiCompanyProfile;
    const currentFitResults = fitResults;
    const currentSelectedPreset = selectedPreset;
    const currentSortedByFit = sortedByFit;
    const currentIndustryLabel = companyProfile.industry ? industryOptions.find(i => i.id === companyProfile.industry)?.label : null;
    const currentPresetLabel = selectedPreset ? presetOptions.find(p => p.id === selectedPreset)?.label : null;
    
    return async () => {
      console.log("[ExportFunction] Export function called, type:", exportType);
      console.log("[ExportFunction] Data snapshot:", {
        categoryType: currentCategoryType,
        platformsCount: currentSelectedPlatformsData?.length,
        categoriesCount: currentCategories?.length,
        scoresCount: currentSortedScores?.length,
      });
      
      // Capture chart images for export
      let chartImages: { radarChart?: string; featureChart?: string } = {};
      try {
        const radarChartId = `radar-chart-${currentCategoryType}`;
        const radarImage = await captureChartToImage(radarChartId);
        if (radarImage) {
          chartImages.radarChart = radarImage;
        }
      } catch (e) {
        console.warn('Could not capture chart image:', e);
      }

      // Prepare export profile data based on category type
      const exportProfile = currentCategoryType === 'ai' ? {
        revenue: null,
        companySize: currentAiCompanyProfile.companySize,
        erpLandscape: currentAiCompanyProfile.erpLandscape,
        industry: currentAiCompanyProfile.industry,
        primaryObjective: null,
      } : currentCompanyProfile;

      if (exportType === "pdf") {
        console.log("[ExportFunction] Starting PDF export...");
        setIsExportingPDF(true);
        try {
          // Dynamic import - only loads PDF export code when user actually exports
          const { exportToPDF } = await loadExportUtils();
          await exportToPDF({
            categoryType: currentCategoryType,
            platforms: currentSelectedPlatformsData,
            categories: currentCategories,
            calculatedScores: currentSortedScores,
            categoryWeights: currentCategoryWeights,
            recommendedPlatform: currentRecommendedPlatform,
            usesFitScoring: currentUsesFitScoring,
            companyProfile: exportProfile,
            chartImages,
            fitResults: currentFitResults,
            selectedPreset: currentSelectedPreset,
            sortedByFit: currentSortedByFit,
            industryLabel: currentIndustryLabel,
            presetLabel: currentPresetLabel,
          }, toast);
          console.log("[ExportFunction] PDF export completed successfully");
          trackComparisonExport("epm", "pdf");
        } catch (error) {
          console.error("[ExportFunction] PDF export error:", error);
          throw error;
        } finally {
          setIsExportingPDF(false);
        }
      } else if (exportType === "excel") {
        console.log("[ExportFunction] Starting Excel export...");
        setIsExportingExcel(true);
        try {
          // Dynamic import - only loads Excel export code when user actually exports
          const { exportToExcel } = await loadExportUtils();
          await exportToExcel({
            categoryType: currentCategoryType,
            platforms: currentSelectedPlatformsData,
            categories: currentCategories,
            calculatedScores: currentSortedScores,
            categoryWeights: currentCategoryWeights,
            recommendedPlatform: currentRecommendedPlatform,
            usesFitScoring: currentUsesFitScoring,
            companyProfile: exportProfile,
            chartImages,
          }, toast);
          console.log("[ExportFunction] Excel export completed successfully");
          trackComparisonExport("epm", "excel");
        } catch (error) {
          console.error("[ExportFunction] Excel export error:", error);
          throw error;
        } finally {
          setIsExportingExcel(false);
        }
      }
    };
  };

  const handleExportPDF = () => {
    const exportFn = createExportFunction("pdf");
    setPendingExportFn(() => exportFn);
    setPendingExportTitle(`${categoryType.toUpperCase()} Platform Comparison - PDF`);
    setPendingExportDescription("Professional PDF report with charts and analysis");
    setRequireFreshVerification(false); // PDF exports use session-based verification
    setExportModalOpen(true);
    // Track export action (active engagement)
    trackComparisonEvent("export_initiated", {
      category: categoryType,
      format: "pdf",
      selectedVendors: selectedPlatforms,
      categoryWeights,
      industry: companyProfile.industry,
      preset: selectedPreset,
    });
  };

  const handleExportExcel = () => {
    const exportFn = createExportFunction("excel");
    setPendingExportFn(() => exportFn);
    setPendingExportTitle(`${categoryType.toUpperCase()} Platform Comparison - Excel`);
    setPendingExportDescription("Detailed spreadsheet with all comparison data and formulas");
    setRequireFreshVerification(true); // Excel exports require fresh OTP verification
    setExportModalOpen(true);
    // Track export action (active engagement)
    trackComparisonEvent("export_initiated", {
      category: categoryType,
      format: "excel",
      selectedVendors: selectedPlatforms,
      categoryWeights,
      industry: companyProfile.industry,
      preset: selectedPreset,
    });
  };

  return (
    <div className="space-y-12">
      {/* Wizard Step 1: Industry Selection (all categories) */}
      {wizardStep === 'industry' && (
        <Card className="mb-8 border-[#8E4F67]/30">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl md:text-3xl">Select Your Industry</CardTitle>
            <CardDescription className="text-base">
              We'll tailor the EPM analysis to your sector's priorities
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
              {industryOptions.map(industry => {
                const IconComponent = industryIconMap[industry.id] || Building2;
                return (
                  <motion.div
                    key={industry.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleIndustrySelect(industry.id)}
                    className="cursor-pointer p-3 sm:p-5 rounded-lg border border-border hover:border-[#7FB8A3] hover:bg-[#7FB8A3]/5 transition-all text-center"
                    data-testid={`button-industry-${industry.id}`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-full bg-[#8E4F67]/10 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal" />
                    </div>
                    <span className="font-medium text-xs sm:text-sm md:text-base leading-tight block">{industry.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wizard Step 2: Preset Selection (all categories) */}
      {wizardStep === 'preset' && (
        <Card className="mb-8 border-[#8E4F67]/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBackToIndustry}
                className="flex-shrink-0"
                data-testid="button-back-to-industry-from-preset"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center flex-1">
                <CardTitle className="text-2xl md:text-3xl">What Matters Most to You?</CardTitle>
                <CardDescription className="text-base">
                  Choose how we should prioritise the EPM capabilities in your evaluation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {presetOptions.map(preset => {
                const IconComponent = preset.icon;
                const isSelected = selectedPreset === preset.id;
                const isRecommended = preset.id === 'industry-recommended';
                return (
                  <motion.div
                    key={preset.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`cursor-pointer p-4 sm:p-6 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-[#7FB8A3] bg-[#7FB8A3]/10 ring-2 ring-[#7FB8A3]/50'
                        : isRecommended 
                          ? 'border-[#7FB8A3]/50 bg-[#7FB8A3]/5 hover:ring-2 hover:ring-[#7FB8A3]/30' 
                          : 'border-border hover:border-[#7FB8A3] hover:bg-[#7FB8A3]/5'
                    }`}
                    data-testid={`button-preset-${preset.id}`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[#7FB8A3]/30' : isRecommended ? 'bg-[#7FB8A3]/20' : 'bg-[#8E4F67]/10'
                      }`}>
                        <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${
                          isSelected ? 'text-brand-cyan' : isRecommended ? 'text-brand-cyan' : 'text-brand-teal'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base">{preset.label}</span>
                          {isSelected && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-[#7FB8A3] text-[#252826]">
                              Selected
                            </Badge>
                          )}
                          {isRecommended && !isSelected && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-[#7FB8A3]/20 text-brand-teal">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{preset.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wizard Step 3: Company Profile (all categories) */}
      {wizardStep === 'profile' && (
        <Card className="mb-8 border-[#8E4F67]/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBackToPreset}
                className="flex-shrink-0"
                data-testid="button-back-to-preset"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="text-xl md:text-2xl">Tell Us About Your Organisation</CardTitle>
                <CardDescription>This helps us refine recommendations for your situation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
            {/* Fit Modifier Explanation */}
            <div className="bg-brand-navy/5 dark:bg-brand-navy/20 rounded-lg p-4 mb-4 border border-[#8E4F67]/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">How We Score Platforms</p>
                  <p>Scores are based on your weighted priorities, then adjusted with <span className="text-brand-teal font-medium">fit modifiers</span> based on your company profile. For example, enterprise-focused platforms receive a boost for large organisations, while agile solutions score higher for smaller companies. These adjustments ensure recommendations match your operational context.</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-teal" />
                  Annual Revenue
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={companyProfile.revenue || ""}
                  onValueChange={(value) => setCompanyProfile((prev: CompanyProfile) => ({ ...prev, revenue: value || null }))}
                >
                  <SelectTrigger className="w-full h-9 sm:h-10 text-sm" data-testid="wizard-select-revenue">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-10m">Under £10M</SelectItem>
                    <SelectItem value="10m-50m">£10M - £50M</SelectItem>
                    <SelectItem value="50m-250m">£50M - £250M</SelectItem>
                    <SelectItem value="250m-1b">£250M - £1B</SelectItem>
                    <SelectItem value="over-1b">Over £1B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-teal" />
                  Company Size
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={companyProfile.companySize || ""}
                  onValueChange={(value) => setCompanyProfile((prev: CompanyProfile) => ({ ...prev, companySize: value || null }))}
                >
                  <SelectTrigger className="w-full h-9 sm:h-10 text-sm" data-testid="wizard-select-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Startup (1-50)</SelectItem>
                    <SelectItem value="small">Small (51-250)</SelectItem>
                    <SelectItem value="medium">Medium (251-1,000)</SelectItem>
                    <SelectItem value="large">Large (1,001-5,000)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (5,000+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-teal" />
                  Current ERP
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={companyProfile.erpLandscape || ""}
                  onValueChange={(value) => setCompanyProfile((prev: CompanyProfile) => ({ ...prev, erpLandscape: value || null }))}
                >
                  <SelectTrigger className="w-full h-9 sm:h-10 text-sm" data-testid="wizard-select-erp">
                    <SelectValue placeholder="Select ERP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sap">SAP (S/4HANA, ECC)</SelectItem>
                    <SelectItem value="oracle">Oracle (Cloud, EBS)</SelectItem>
                    <SelectItem value="microsoft">Microsoft 365</SelectItem>
                    <SelectItem value="workday">Workday</SelectItem>
                    <SelectItem value="netsuite">NetSuite</SelectItem>
                    <SelectItem value="sage">Sage Intacct</SelectItem>
                    <SelectItem value="xero">Xero</SelectItem>
                    <SelectItem value="quickbooks">QuickBooks</SelectItem>
                    <SelectItem value="zoho">Zoho Books</SelectItem>
                    <SelectItem value="freshbooks">FreshBooks</SelectItem>
                    <SelectItem value="multi-vendor">Multiple ERPs</SelectItem>
                    <SelectItem value="greenfield">No ERP / Greenfield</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleViewRecommendations} 
              className="w-full bg-[#7FB8A3] text-[#252826]"
              data-testid="button-view-recommendations"
            >
              View Tailored Recommendations
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Wizard Step 4: Results */}
      {wizardStep === 'results' && (
        <>
          {/* Selected Configuration Display for wizard results */}
          {wizardStep === 'results' && (
            <Card className="mb-6 border-[#7FB8A3]/30 bg-gradient-to-r from-[#252826]/5 to-[#8E4F67]/5 dark:from-[#252826]/20 dark:to-[#8E4F67]/20">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#7FB8A3]/20 flex items-center justify-center flex-shrink-0">
                      <Sliders className="w-5 h-5 text-brand-cyan" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Your Configuration</CardTitle>
                      <CardDescription className="text-sm">
                        Personalised recommendations based on your selections
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToIndustry}
                    className="border-[#8E4F67]/30"
                    data-testid="button-restart-wizard"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Restart Wizard
                  </Button>
                </div>
                {/* Configuration Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Industry
                    </div>
                    <div className="text-sm font-medium">
                      {industryOptions.find(i => i.id === companyProfile.industry)?.label || 'Not selected'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sliders className="w-3 h-3" />
                      Priority Preset
                    </div>
                    <div className="text-sm font-medium">
                      {selectedPreset ? presetOptions.find(p => p.id === selectedPreset)?.label : 'Balanced'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Revenue
                    </div>
                    <div className="text-sm font-medium">
                      {companyProfile.revenue === 'under-10m' ? 'Under £10M' :
                       companyProfile.revenue === '10m-50m' ? '£10M - £50M' :
                       companyProfile.revenue === '50m-250m' ? '£50M - £250M' :
                       companyProfile.revenue === '250m-1b' ? '£250M - £1B' :
                       companyProfile.revenue === 'over-1b' ? 'Over £1B' : 'Not selected'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Company Size
                    </div>
                    <div className="text-sm font-medium">
                      {companyProfile.companySize === 'startup' ? 'Startup (1-50)' :
                       companyProfile.companySize === 'small' ? 'Small (51-250)' :
                       companyProfile.companySize === 'medium' ? 'Medium (251-1,000)' :
                       companyProfile.companySize === 'large' ? 'Large (1,001-5,000)' :
                       companyProfile.companySize === 'enterprise' ? 'Enterprise (5,000+)' : 'Not selected'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      Current ERP
                    </div>
                    <div className="text-sm font-medium">
                      {companyProfile.erpLandscape === 'sap' ? 'SAP' :
                       companyProfile.erpLandscape === 'oracle' ? 'Oracle' :
                       companyProfile.erpLandscape === 'microsoft' ? 'Microsoft 365' :
                       companyProfile.erpLandscape === 'workday' ? 'Workday' :
                       companyProfile.erpLandscape === 'netsuite' ? 'NetSuite' :
                       companyProfile.erpLandscape === 'sage' ? 'Sage Intacct' :
                       companyProfile.erpLandscape === 'xero' ? 'Xero' :
                       companyProfile.erpLandscape === 'quickbooks' ? 'QuickBooks' :
                       companyProfile.erpLandscape === 'zoho' ? 'Zoho Books' :
                       companyProfile.erpLandscape === 'freshbooks' ? 'FreshBooks' :
                       companyProfile.erpLandscape === 'multi-vendor' ? 'Multiple ERPs' :
                       companyProfile.erpLandscape === 'greenfield' ? 'No ERP' : 'Not selected'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground" data-testid="button-toggle-weights">
                      <span className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Adjust Category Weights
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((category) => (
                        <div key={category.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-2">
                              {category.icon && <category.icon className="w-4 h-4 text-brand-teal" />}
                              <span className="truncate">{category.name}</span>
                            </label>
                            <span className="text-sm font-semibold text-brand-cyan">{categoryWeights[category.id] || category.weight}%</span>
                          </div>
                          <Slider
                            value={[categoryWeights[category.id] || category.weight]}
                            onValueChange={(value) => handleWeightChange(category.id, value)}
                            min={0}
                            max={30}
                            step={1}
                            className="py-1"
                            data-testid={`slider-weight-${category.id}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      Adjusting weights will recalculate platform scores in real-time
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}

      {wizardStep === 'results' && (
        <section className="py-6">
          <Collapsible open={methodologyOpen} onOpenChange={setMethodologyOpen}>
            <Card className="border-border/50">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-brand-teal" />
                      <CardTitle className="text-lg">Methodology & Sources</CardTitle>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${methodologyOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Research Sources</h4>
                      <ul className="space-y-4">
                        {rankingSources.map((source, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded-full flex items-center justify-center ${(source as any).isPrimary ? 'bg-[#7FB8A3]' : 'bg-[#8E4F67]/20'}`}>
                              {(source as any).isPrimary ? (
                                <Star className="w-2.5 h-2.5 text-[#252826]" />
                              ) : (
                                <ExternalLink className="w-2.5 h-2.5 text-brand-teal" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium flex items-center gap-2">
                                {source.name}
                                {(source as any).isPrimary && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Primary</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {source.description}
                              </div>
                              {(source as any).verifiedLeaders && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">Verified Leaders:</span>{' '}
                                  {(source as any).verifiedLeaders.join(', ')}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Scoring Methodology</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Scores are calculated using a weighted average across multiple capability dimensions. 
                        Fit analysis applies additional modifiers based on your organisation profile matching 
                        each vendor's typical customer base and specialisation areas.
                      </p>
                      <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-brand-teal" />
                          Constancia Independent Assessment
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          Scores, fit recommendations, and vendor comparisons are based on Constancia consultant experience 
                          and publicly available information including analyst reports and vendor materials.
                        </p>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <Info className="w-4 h-4" />
                          Important Disclaimer
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          Rankings are indicative and for guidance only. Always validate through vendor demonstrations, 
                          proof-of-concept evaluations, and reference checks specific to your requirements before making selection decisions.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </section>
      )}

      {/* Recommendations Summary Card */}
      {wizardStep === 'results' && calculatedScores && calculatedScores.length > 0 && (
        <section className="py-4 sm:py-6">
          <Card className="border-[#8E4F67]/30">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#7FB8A3]/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Your Top Recommendations</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Analysis of {platforms.length} EPM platforms based on your {companyProfile.industry ? industryOptions.find(i => i.id === companyProfile.industry)?.label + ' industry context, ' : ''}
                    {selectedPreset ? presetOptions.find(p => p.id === selectedPreset)?.label.toLowerCase() + ' priorities' : 'balanced criteria'}, and organisation profile
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4 sm:space-y-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-lg sm:text-2xl font-semibold text-brand-cyan">{platforms.length}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Platforms Analysed</div>
                </div>
                <div className="text-center border-x border-border">
                  <div className="text-lg sm:text-2xl font-semibold text-brand-teal">{categories.length}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Capability Areas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-2xl font-semibold text-green-600">{Math.round((sortedByFit[0]?.fitAdjustedScore || sortedByFit[0]?.calculatedScore || 0) * 10)}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Top Score</div>
                </div>
              </div>

              {/* Top 3 Recommendations */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Top 4 Recommended Platforms</h4>
                {sortedByFit.slice(0, 4).map((platformScore, index) => {
                  const platform = platforms.find(p => p.id === platformScore.id);
                  const fitResult = fitResults?.find(f => f.platformId === platformScore.id);
                  const rawScore = fitResult?.score || platformScore.fitAdjustedScore || platformScore.calculatedScore;
                  const score = Math.round(rawScore * 10); // Convert to 0-100 scale for display
                  const topScore = sortedByFit[0]?.fitAdjustedScore || sortedByFit[0]?.calculatedScore || 10;
                  const scorePercentage = Math.round((rawScore / topScore) * 100);
                  if (!platform) return null;
                  return (
                    <div 
                      key={platformScore.id}
                      className={`p-3 sm:p-4 rounded-lg border ${index === 0 ? 'border-[#7FB8A3]/50 bg-[#7FB8A3]/5' : 'border-border'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          index === 0 ? 'bg-[#7FB8A3] text-[#252826]' : index === 1 ? 'bg-[#8E4F67]/20 text-brand-teal' : 'bg-muted text-muted-foreground'
                        }`}>
                          <span className="text-sm sm:text-base font-semibold">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm sm:text-base">{platform.shortName}</span>
                              {index === 0 && (
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-[10px] sm:text-xs">
                                  Best Match
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                {platform.marketPosition}
                              </Badge>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-base sm:text-lg font-semibold text-brand-cyan">{score}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground ml-1">/ 100</span>
                            </div>
                          </div>
                          
                          {/* Score bar */}
                          <div className="w-full h-1.5 sm:h-2 bg-muted rounded-full mb-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${index === 0 ? 'bg-[#7FB8A3]' : index === 1 ? 'bg-[#8E4F67]' : 'bg-muted-foreground'}`}
                              style={{ width: `${scorePercentage}%` }}
                            />
                          </div>
                          
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2">{platform.bestFor}</p>
                          
                          {/* Key strengths */}
                          <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2">
                            {platform.strengths.slice(0, 2).map((strength: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-green-700 dark:text-green-400 bg-green-500/10 px-1.5 sm:px-2 py-0.5 rounded">
                                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {strength.length > 40 ? strength.substring(0, 37) + '...' : strength}
                              </span>
                            ))}
                          </div>
                          
                          {/* Fit reasons if available */}
                          {fitResult?.matchReasons && fitResult.matchReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 sm:gap-1.5">
                              {fitResult.matchReasons.slice(0, 2).map((reason: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-brand-teal bg-[#8E4F67]/10 px-1.5 sm:px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  {reason.length > 40 ? reason.substring(0, 37) + '...' : reason}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Quick stats row */}
                          <div className="flex items-center gap-3 sm:gap-4 mt-2 pt-2 border-t border-border/50 text-[10px] sm:text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {platform.implementationTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {platform.priceRange}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Insight callout */}
              <div className="p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Key Insight</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {sortedByFit[0] && sortedByFit[1] && (() => {
                        const topPlatform = platforms.find(p => p.id === sortedByFit[0].id)?.shortName;
                        const secondPlatform = platforms.find(p => p.id === sortedByFit[1].id)?.shortName;
                        const leadMargin = Math.round(
                          (sortedByFit[0].fitAdjustedScore || sortedByFit[0].calculatedScore) - 
                          (sortedByFit[1].fitAdjustedScore || sortedByFit[1].calculatedScore)
                        );
                        
                        if (leadMargin === 0) {
                          return <>
                            {topPlatform} and {secondPlatform} are closely matched for your requirements. 
                            Download the full report to compare their specific strengths and implementation approaches.
                          </>;
                        } else if (leadMargin <= 3) {
                          return <>
                            {topPlatform} edges ahead of {secondPlatform} by just {leadMargin} point{leadMargin > 1 ? 's' : ''}. 
                            Both are strong contenders - download the report for detailed capability comparisons.
                          </>;
                        } else {
                          return <>
                            {topPlatform} leads by {leadMargin} points over {secondPlatform}. 
                            Download the full report for detailed capability comparisons and implementation guidance.
                          </>;
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {selectedPlatforms.length > 0 && (
        <section className="py-4 sm:py-6">
          <Card className="border-[#7FB8A3]/30 bg-gradient-to-r from-[#252826]/5 to-[#8E4F67]/5 dark:from-[#252826]/20 dark:to-[#8E4F67]/20">
            <CardContent className="py-4 sm:py-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#7FB8A3]/20 flex items-center justify-center flex-shrink-0">
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">Your Personalised Comparison Report</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Share with stakeholders and accelerate your selection process</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Board-ready executive summary with key findings</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Detailed scoring across {categories.length} capability dimensions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Industry-specific fit analysis for {companyProfile.industry ? industryOptions.find(i => i.id === companyProfile.industry)?.label || 'your sector' : 'your sector'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Ready-to-use vendor evaluation framework</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 flex-shrink-0" />
                      <span>Your custom analysis reflects current weights and selections - download now to preserve your configuration</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 sm:gap-3 lg:min-w-[200px]">
                  <Button
                    onClick={handleExportPDF}
                    disabled={isExportingPDF || selectedPlatforms.length === 0}
                    className="bg-brand-navy hover:bg-brand-navy/90 text-white dark:bg-[#7FB8A3] dark:text-[#252826] dark:hover:bg-[#7FB8A3]/90"
                    data-testid={`button-export-pdf-cta-${categoryType}`}
                  >
                    {isExportingPDF ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Get Your PDF Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel || selectedPlatforms.length === 0}
                    className="border-[#8E4F67] text-brand-teal hover:bg-[#8E4F67] hover:text-white dark:border-[#7FB8A3] dark:text-brand-cyan dark:hover:bg-[#7FB8A3] dark:hover:text-[#252826]"
                    data-testid={`button-export-excel-cta-${categoryType}`}
                  >
                    {isExportingExcel ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    )}
                    Get Excel Workbook
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="py-6 sm:py-8 bg-muted/30 rounded-xl">
        <div className="px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Select Platforms to Compare</h2>
          </div>
          
          <MobilePlatformCarousel
            platforms={platforms}
            selectedPlatforms={selectedPlatforms}
            onPlatformToggle={handlePlatformToggle}
            onViewDetails={(platformId) => setExpandedPlatform(expandedPlatform === platformId ? null : platformId)}
            fitResults={fitResults ?? undefined}
            bestFitPlatform={bestFitPlatform}
            calculatedScores={calculatedScores}
            showFitAnalysis={showFitAnalysis}
            categoryType={categoryType}
          />
          
          <div className={`hidden md:grid grid-cols-2 md:grid-cols-3 ${platforms.length <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6'} gap-4`}>
            {platforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              const fitResult = showFitAnalysis && fitResults ? fitResults.find(r => r.platformId === platform.id) : null;
              const isBestFit = bestFitPlatform?.id === platform.id;
              
              return (
                <UITooltip key={platform.id}>
                  <TooltipTrigger asChild>
                    <Card
                      className={`cursor-pointer transition-all hover-elevate ${
                        isSelected
                          ? "ring-2 ring-[#7FB8A3] bg-[#7FB8A3]/5"
                          : ""
                      }`}
                      onClick={() => handlePlatformToggle(platform.id)}
                      data-testid={`card-platform-${platform.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm flex-1">{platform.shortName}</span>
                          <AnimatePresence mode="wait">
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                data-testid={`icon-selected-${platform.id}`}
                              >
                                <CheckCircle2 className="w-5 h-5 text-brand-cyan" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-2 min-w-0">
                          <Badge className="text-[10px] px-1.5 py-0.5 max-w-full truncate" variant="secondary">
                            {platform.marketPosition}
                          </Badge>
                          {fitResult && (
                            <Badge 
                              className={`text-[10px] px-1.5 py-0.5 ${getFitLevelColor(fitResult.fitLevel)} ${isBestFit ? 'ring-1 ring-[#7FB8A3]' : ''}`}
                              data-testid={`badge-fit-level-${platform.id}`}
                            >
                              {isBestFit && <Trophy className="w-2.5 h-2.5 mr-0.5" />}
                              {getFitLevelLabel(fitResult.fitLevel)}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[300px]">
                    <p className="font-semibold">{platform.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{platform.description}</p>
                    <p className="text-xs mt-2">
                      <span className="text-brand-cyan">Best for:</span> {platform.bestFor}
                    </p>
                  </TooltipContent>
                </UITooltip>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-brand-cream" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Priority Scoring</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Adjust importance weights for each category</p>
          </div>
        </div>

        {categoryType === "epm" && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Presets</h3>
            <div className="flex flex-wrap gap-2">
              {epmWeightPresets.map((preset) => (
                <UITooltip key={preset.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryWeights(preset.weights)}
                      className="border-[#8E4F67]/30 hover:border-[#7FB8A3] hover:bg-[#7FB8A3]/10"
                      data-testid={`button-preset-${preset.id}`}
                    >
                      {preset.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-sm max-w-[250px]">{preset.description}</p>
                  </TooltipContent>
                </UITooltip>
              ))}
            </div>
          </div>
        )}

        {categoryType === "erp" && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">ERP Selection Presets</h3>
            <div className="flex flex-wrap gap-2">
              {erpWeightPresets.map((preset) => (
                <UITooltip key={preset.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryWeights(preset.weights)}
                      className="border-[#8E4F67]/30 hover:border-[#7FB8A3] hover:bg-[#7FB8A3]/10"
                      data-testid={`button-erp-preset-${preset.id}`}
                    >
                      {preset.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-sm max-w-[250px]">{preset.description}</p>
                  </TooltipContent>
                </UITooltip>
              ))}
            </div>
          </div>
        )}

        {/* Organisation Profile Card for EPM/ERP */}
        {(categoryType === 'epm' || categoryType === 'erp') && (
          <Card className="mb-6 sm:mb-8 border-[#8E4F67]/30">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Building2 className="w-5 h-5 text-brand-teal flex-shrink-0" />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Your Organisation Profile</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Customise results based on your company characteristics
                    </CardDescription>
                  </div>
                </div>
                {hasProfileFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompanyProfile({ revenue: null, companySize: null, erpLandscape: null, industry: null })}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-profile"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-brand-teal" />
                    Annual Revenue
                  </label>
                  <Select
                    value={companyProfile.revenue || ""}
                    onValueChange={(value) => setCompanyProfile((prev: CompanyProfile) => ({ ...prev, revenue: value || null }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-revenue-priority">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-10m">Under £10M</SelectItem>
                      <SelectItem value="10m-50m">£10M - £50M</SelectItem>
                      <SelectItem value="50m-250m">£50M - £250M</SelectItem>
                      <SelectItem value="250m-1b">£250M - £1B</SelectItem>
                      <SelectItem value="over-1b">Over £1B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-teal" />
                    Company Size
                  </label>
                  <Select
                    value={companyProfile.companySize || ""}
                    onValueChange={(value) => setCompanyProfile((prev: CompanyProfile) => ({ ...prev, companySize: value || null }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-size-priority">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup (1-50)</SelectItem>
                      <SelectItem value="small">Small (51-250)</SelectItem>
                      <SelectItem value="medium">Medium (251-1,000)</SelectItem>
                      <SelectItem value="large">Large (1,001-5,000)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (5,000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-teal" />
                    Current ERP
                  </label>
                  <Select
                    value={companyProfile.erpLandscape || ""}
                    onValueChange={(value) => setCompanyProfile((prev: CompanyProfile) => ({ ...prev, erpLandscape: value || null }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-erp-priority">
                      <SelectValue placeholder="Select ERP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sap">SAP (S/4HANA, ECC)</SelectItem>
                      <SelectItem value="oracle">Oracle (Cloud, EBS)</SelectItem>
                      <SelectItem value="microsoft">Microsoft 365</SelectItem>
                      <SelectItem value="workday">Workday</SelectItem>
                      <SelectItem value="netsuite">NetSuite</SelectItem>
                      <SelectItem value="sage">Sage Intacct</SelectItem>
                      <SelectItem value="xero">Xero</SelectItem>
                      <SelectItem value="quickbooks">QuickBooks</SelectItem>
                      <SelectItem value="zoho">Zoho Books</SelectItem>
                      <SelectItem value="freshbooks">FreshBooks</SelectItem>
                      <SelectItem value="multi-vendor">Multiple ERPs</SelectItem>
                      <SelectItem value="greenfield">No ERP / Greenfield</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-teal" />
                    Industry
                  </label>
                  <Select
                    value={companyProfile.industry || ""}
                    onValueChange={(value) => setCompanyProfile((prev: CompanyProfile) => ({ ...prev, industry: value || null }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-industry-priority">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {industries.map((ind) => (
                        <SelectItem key={ind.id} value={ind.id}>{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasProfileFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-3 bg-[#7FB8A3]/10 rounded-lg border border-[#7FB8A3]/30"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-brand-cyan" />
                    <span className="text-brand-teal font-medium">Fit analysis active</span>
                    <span className="text-muted-foreground">- Scores adjusted based on vendor specialisation match</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Company Profile Card */}
        {categoryType === 'ai' && (
          <Card className="mb-6 sm:mb-8 border-[#8E4F67]/30">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Bot className="w-5 h-5 text-brand-teal flex-shrink-0" />
                  <div>
                    <CardTitle className="text-base sm:text-lg">Your Company Profile</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Customise AI recommendations for your technology stack
                    </CardDescription>
                  </div>
                </div>
                {hasAIProfileFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAICompanyProfile({ techStack: null, erpLandscape: null, companySize: null, industry: null, financeFocus: null })}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-ai-profile"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-teal" />
                    Technology Stack
                  </label>
                  <Select
                    value={aiCompanyProfile.techStack || ""}
                    onValueChange={(value) => setAICompanyProfile(prev => ({ ...prev, techStack: (value || null) as AICompanyProfile['techStack'] }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-tech-stack">
                      <SelectValue placeholder="Select stack" />
                    </SelectTrigger>
                    <SelectContent>
                      {techStackOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-teal" />
                    ERP Landscape
                    <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={aiCompanyProfile.erpLandscape || ""}
                    onValueChange={(value) => setAICompanyProfile(prev => ({ ...prev, erpLandscape: (value || null) as AICompanyProfile['erpLandscape'] }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-ai-erp">
                      <SelectValue placeholder="Select ERP" />
                    </SelectTrigger>
                    <SelectContent>
                      {erpLandscapeOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-teal" />
                    Company Size
                    <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={aiCompanyProfile.companySize || ""}
                    onValueChange={(value) => setAICompanyProfile(prev => ({ ...prev, companySize: (value || null) as AICompanyProfile['companySize'] }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-ai-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySizeOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-teal" />
                    Primary Industry
                    <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={aiCompanyProfile.industry || ""}
                    onValueChange={(value) => setAICompanyProfile(prev => ({ ...prev, industry: value || null }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-ai-industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {industries.map((ind) => (
                        <SelectItem key={ind.id} value={ind.id}>{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-teal" />
                    Finance Focus
                  </label>
                  <Select
                    value={aiCompanyProfile.financeFocus || ""}
                    onValueChange={(value) => setAICompanyProfile(prev => ({ ...prev, financeFocus: (value || null) as AICompanyProfile['financeFocus'] }))}
                  >
                    <SelectTrigger className="w-full" data-testid="select-finance-focus">
                      <SelectValue placeholder="Select focus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (Finance-first AI)</SelectItem>
                      <SelectItem value="balanced">Balanced (General purpose)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasAIProfileFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-3 bg-[#7FB8A3]/10 rounded-lg border border-[#7FB8A3]/30"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-brand-cyan" />
                    <span className="text-brand-teal font-medium">Contextual scoring active</span>
                    <span className="text-muted-foreground">- Platforms ranked by fit with your tech stack, size, and priorities</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Category Weights</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Drag sliders to adjust the importance of each category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <Icon className="w-4 h-4 text-brand-teal" />
                            <span className="text-sm font-medium">{category.name}</span>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[250px]">
                          <p className="text-sm">{category.description}</p>
                        </TooltipContent>
                      </UITooltip>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <span className="text-sm text-muted-foreground">
                              {categoryWeights[category.id]}
                            </span>
                            <Badge variant="outline" className="text-xs min-w-[60px] justify-center">
                              {Math.round(normalizedWeights[category.id])}%
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Normalised weight: {Math.round(normalizedWeights[category.id])}% of total scoring</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <Slider
                      value={[categoryWeights[category.id]]}
                      onValueChange={(value) => handleWeightChange(category.id, value)}
                      max={100}
                      min={1}
                      step={1}
                      className="cursor-pointer"
                      data-testid={`slider-${categoryType}-${category.id}`}
                    />
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {recommendedPlatform && (
              <Card className="border-[#7FB8A3] bg-gradient-to-br from-[#7FB8A3]/5 to-transparent">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan" />
                    <CardTitle className="text-base sm:text-lg">
                      {usesFitScoring ? 'Best Fit Platform' : 'Recommended Platform'}
                    </CardTitle>
                    {usesFitScoring && (
                      <Badge className="bg-[#7FB8A3]/20 text-brand-teal border-[#7FB8A3]/50">
                        <Target className="w-3 h-3 mr-1" />
                        Profile Match
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-foreground">{recommendedPlatform.name}</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm">{recommendedPlatform.bestFor}</p>
                      {usesFitScoring && recommendedPlatform.fitLevel && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getFitLevelColor(recommendedPlatform.fitLevel)}>
                            {getFitLevelLabel(recommendedPlatform.fitLevel)}
                          </Badge>
                          {recommendedPlatform.fitModifier !== 0 && (
                            <span className={`text-xs font-medium ${recommendedPlatform.fitModifier > 0 ? 'text-green-500' : 'text-amber-500'}`}>
                              {recommendedPlatform.fitModifier > 0 ? '+' : ''}{recommendedPlatform.fitModifier} fit modifier
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-2xl sm:text-3xl font-semibold text-brand-cyan">
                        {Math.round((usesFitScoring ? recommendedPlatform.fitAdjustedScore : recommendedPlatform.calculatedScore) * 10)}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {usesFitScoring ? 'Fit-Adjusted Score' : 'Weighted Score'} / 100
                      </div>
                      {usesFitScoring && (
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          Base: {Math.round(recommendedPlatform.calculatedScore * 10)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scoring Breakdown Section */}
                  {usesFitScoring && categoryType === 'ai' && recommendedPlatform.aiModifiers && recommendedPlatform.aiModifiers.length > 0 && (
                    <div className="pt-4 border-t border-[#7FB8A3]/20">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-brand-cyan" />
                        Scoring Breakdown
                      </h4>
                      <div className="space-y-2 text-sm font-mono bg-muted/50 rounded-lg p-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Score:</span>
                          <span className="font-semibold">{(recommendedPlatform.calculatedScore * 10).toFixed(0)}</span>
                        </div>
                        {recommendedPlatform.aiModifiers.map((mod, idx) => (
                          <div key={idx} className={`flex justify-between ${mod.value > 0 ? 'text-green-600 dark:text-green-400' : mod.value < 0 ? 'text-red-500 dark:text-orange-400' : 'text-muted-foreground'}`}>
                            <span className="flex items-center gap-1">
                              {mod.value > 0 ? <ArrowUp className="w-3 h-3" /> : mod.value < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                              {mod.label}
                            </span>
                            <span>{mod.value > 0 ? '+' : ''}{mod.value}</span>
                          </div>
                        ))}
                        <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
                          <span>Contextual Score:</span>
                          <span className="text-brand-cyan">{(recommendedPlatform.fitAdjustedScore * 10).toFixed(0)}</span>
                        </div>
                      </div>

                      {/* Why This Platform Section */}
                      {recommendedPlatform.aiModifiers.filter(m => m.value > 0).length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Why this platform?
                          </h5>
                          <ul className="space-y-1.5">
                            {recommendedPlatform.aiModifiers.filter(m => m.value > 0).map((mod, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 text-xs">
                                  +{mod.value}
                                </Badge>
                                <span className="text-muted-foreground">{mod.detail || mod.label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Considerations Section */}
                      {recommendedPlatform.aiModifiers.filter(m => m.value < 0).length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Considerations
                          </h5>
                          <ul className="space-y-1.5">
                            {recommendedPlatform.aiModifiers.filter(m => m.value < 0).map((mod, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Badge className="bg-red-500/10 text-red-500 dark:text-orange-400 border-red-500/30 text-xs">
                                  {mod.value}
                                </Badge>
                                <span className="text-muted-foreground">{mod.detail || mod.label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Modifier Badges */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {recommendedPlatform.aiModifiers.map((mod, idx) => (
                          <UITooltip key={idx}>
                            <TooltipTrigger asChild>
                              <Badge 
                                className={`text-xs cursor-help ${
                                  mod.value > 0 
                                    ? 'bg-[#7FB8A3]/20 text-brand-teal border-[#7FB8A3]/50' 
                                    : mod.value < 0 
                                    ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                    : 'bg-muted'
                                }`}
                              >
                                {mod.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">{mod.detail || mod.label}: {mod.value > 0 ? '+' : ''}{mod.value}</p>
                            </TooltipContent>
                          </UITooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EPM/ERP Fit Results */}
                  {usesFitScoring && (categoryType === 'epm' || categoryType === 'erp') && fitResults && fitResults.length > 0 && (
                    <div className="pt-4 border-t border-[#7FB8A3]/20">
                      {(() => {
                        const topFit = fitResults.find(f => f.platformId === recommendedPlatform.id);
                        if (!topFit) return null;
                        return (
                          <>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Calculator className="w-4 h-4 text-brand-cyan" />
                              Fit Analysis
                            </h4>
                            <div className="space-y-2 text-sm font-mono bg-muted/50 rounded-lg p-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Base Score:</span>
                                <span className="font-semibold">{(topFit.baseScore).toFixed(1)}</span>
                              </div>
                              <div className={`flex justify-between ${topFit.modifier >= 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}`}>
                                <span>Fit Modifier:</span>
                                <span>{topFit.modifier >= 0 ? '+' : ''}{topFit.modifier.toFixed(1)}</span>
                              </div>
                              <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
                                <span>Adjusted Score:</span>
                                <span className="text-brand-cyan">{topFit.score.toFixed(1)}</span>
                              </div>
                            </div>
                            
                            {topFit.matchReasons.length > 0 && (
                              <div className="mt-4">
                                <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  Match Reasons
                                </h5>
                                <ul className="space-y-1.5">
                                  {topFit.matchReasons.map((reason: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                      <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                      <span className="text-muted-foreground">{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {topFit.concerns.length > 0 && (
                              <div className="mt-4">
                                <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  Considerations
                                </h5>
                                <ul className="space-y-1.5">
                                  {topFit.concerns.map((concern: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                      <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                      <span className="text-muted-foreground">{concern}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Scoring Methodology Section */}
            {usesFitScoring && (
              <Collapsible open={methodologyOpen} onOpenChange={setMethodologyOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover-elevate">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-brand-teal" />
                          <CardTitle className="text-base">Scoring Methodology</CardTitle>
                        </div>
                        {methodologyOpen ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Base Score Calculation</h4>
                        <p className="text-sm text-muted-foreground">
                          Platform base scores are calculated using weighted category scores across {categories.length} evaluation dimensions. 
                          Adjust category weights using the sliders to reflect your organisation's priorities.
                        </p>
                      </div>
                      
                      {categoryType === 'ai' && (
                        <>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">ERP Synergy Bonuses</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li className="flex items-center gap-2">
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-xs">+20</Badge>
                                <span><strong>Native Integration:</strong> Same-vendor ERP (e.g., Microsoft Copilot + Dynamics 365)</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-xs">+12</Badge>
                                <span><strong>Pre-built Connector:</strong> RPA bots and integrations available (e.g., UiPath, Automation Anywhere)</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-xs">+8</Badge>
                                <span><strong>Partnership:</strong> Vendor partnership agreements (e.g., IBM watsonx + SAP)</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Badge className="bg-muted text-xs">0</Badge>
                                <span><strong>Custom Required:</strong> General-purpose LLMs require custom development</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Technology Stack Alignment</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li className="flex items-center gap-2">
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-xs">+15</Badge>
                                <span><strong>Strong Alignment:</strong> Platform deeply integrated with your tech ecosystem</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Badge className="bg-red-500/10 text-red-500 text-xs">-15</Badge>
                                <span><strong>Limited Compatibility:</strong> Platform designed for different ecosystems</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Company Size & Scale Fit</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li className="flex items-center gap-2">
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-xs">+10</Badge>
                                <span><strong>Optimal Fit:</strong> Platform designed for your company scale</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Badge className="bg-red-500/10 text-red-500 text-xs">-8</Badge>
                                <span><strong>Size Mismatch:</strong> Enterprise pricing for SMB, or vice versa</span>
                              </li>
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Industry & Finance Focus</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li className="flex items-center gap-2">
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-xs">+10</Badge>
                                <span><strong>Purpose-built for Finance:</strong> Dedicated finance automation features</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-xs">+8</Badge>
                                <span><strong>Industry Specialisation:</strong> Strong vertical expertise</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Badge className="bg-[#7FB8A3]/20 text-brand-teal text-xs">+8</Badge>
                                <span><strong>Deployment Ease:</strong> Plug-and-play implementation</span>
                              </li>
                            </ul>
                          </div>
                        </>
                      )}
                      
                      {(categoryType === 'epm' || categoryType === 'erp') && (
                        <>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Fit Modifiers</h4>
                            <p className="text-sm text-muted-foreground">
                              Scores are adjusted based on how well each platform's sweet spot aligns with your company profile, 
                              including revenue range, company size, existing ERP landscape, and industry focus.
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Price Sensitivity</h4>
                            <p className="text-sm text-muted-foreground">
                              Smaller companies receive penalties for enterprise-priced platforms to ensure practical recommendations 
                              that consider budget constraints.
                            </p>
                          </div>
                        </>
                      )}
                      
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground italic">
                          Scores based on Constancia consulting experience and publicly available information. 
                          These assessments should be validated through vendor demonstrations and proof-of-concept evaluations.
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Score Comparison Chart - with performance optimizations */}
            <Card className="chart-section-lazy">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Score Comparison</CardTitle>
                  {usesFitScoring && (
                    <Badge variant="outline" className="text-xs border-[#7FB8A3]/50 text-brand-teal">
                      <Target className="w-3 h-3 mr-1" />
                      Fit-Adjusted
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80 chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 10]} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string, props: any) => {
                          if (usesFitScoring && props?.payload) {
                            const { baseScore, fitModifier } = props.payload;
                            return [
                              <span key="value">
                                {value.toFixed(1)} 
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Base: {baseScore} {fitModifier >= 0 ? '+' : ''}{fitModifier})
                                </span>
                              </span>,
                              'Score'
                            ];
                          }
                          return [value.toFixed(1), 'Score'];
                        }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Detailed Comparison Section - lazy loaded for performance */}
      <section className="py-6 sm:py-8 bg-muted/30 rounded-xl comparison-section-lazy">
        <div className="px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-cream" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Detailed Comparison</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Side-by-side platform analysis</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
            <TabsList className="w-full justify-start flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm md:text-base px-2 sm:px-3" data-testid={`tab-${categoryType}-overview`}>Overview</TabsTrigger>
              <TabsTrigger value="features" className="text-xs sm:text-sm md:text-base px-2 sm:px-3" data-testid={`tab-${categoryType}-features`}>Features</TabsTrigger>
              <TabsTrigger value="radar" className="text-xs sm:text-sm md:text-base px-2 sm:px-3" data-testid={`tab-${categoryType}-radar`}>Radar</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="relative">
                <TablePopoutModal 
                  title={`${categoryType.toUpperCase()} Platform Overview Comparison`}
                  tableId={`overview-table-${categoryType}`}
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Metric</TableHead>
                          {selectedPlatformsData.map((platform) => (
                            <TableHead key={platform.id} className="text-center min-w-[140px]">
                              <div className="font-semibold">{platform.shortName}</div>
                              <Badge className="mt-1 text-[10px] px-1.5" variant="outline">{platform.marketPosition}</Badge>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            {usesFitScoring ? "Fit-Adjusted Score" : "Weighted Score"}
                          </TableCell>
                          {selectedPlatformsData.map((platform) => {
                            const calcScore = calculatedScores.find((p) => p.id === platform.id);
                            const isTop = calcScore?.id === recommendedPlatform?.id;
                            const displayScore = Math.round(((usesFitScoring ? calcScore?.fitAdjustedScore : calcScore?.calculatedScore) ?? 0) * 10);
                            return (
                              <TableCell key={platform.id} className="text-center">
                                <span className={`text-xl font-semibold ${isTop ? "text-brand-cyan" : "text-foreground"}`}>
                                  {displayScore}
                                </span>
                                {isTop && <Trophy className="w-4 h-4 text-brand-cyan inline ml-1" />}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Implementation Time</TableCell>
                          {selectedPlatformsData.map((platform) => (
                            <TableCell key={platform.id} className="text-center text-sm">{platform.implementationTime}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Price Range</TableCell>
                          {selectedPlatformsData.map((platform) => (
                            <TableCell key={platform.id} className="text-center text-sm">{platform.priceRange}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">ROI Potential</TableCell>
                          {selectedPlatformsData.map((platform) => (
                            <TableCell key={platform.id} className="text-center">
                              <Badge variant="secondary" className="capitalize">{platform.roiPotential}</Badge>
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Best For</TableCell>
                          {selectedPlatformsData.map((platform) => (
                            <TableCell key={platform.id} className="text-center text-sm">{platform.bestFor}</TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TablePopoutModal>
                <div className="overflow-x-auto">
                  <p className="text-xs text-muted-foreground mb-2 md:hidden flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 animate-pulse" /> Scroll horizontally to view all platforms
                </p>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Metric</TableHead>
                      {selectedPlatformsData.map((platform) => (
                        <TableHead key={platform.id} className="text-center min-w-[140px]">
                          <div className="font-semibold">{platform.shortName}</div>
                          <Badge className="mt-1 text-[10px] px-1.5" variant="outline">{platform.marketPosition}</Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        {usesFitScoring ? "Fit-Adjusted Score" : "Weighted Score"}
                      </TableCell>
                      {selectedPlatformsData.map((platform) => {
                        const calcScore = calculatedScores.find((p) => p.id === platform.id);
                        const isTop = calcScore?.id === recommendedPlatform?.id;
                        const displayScore = Math.round(((usesFitScoring ? calcScore?.fitAdjustedScore : calcScore?.calculatedScore) ?? 0) * 10);
                        return (
                          <TableCell key={platform.id} className="text-center">
                            <span className={`text-xl font-semibold ${isTop ? "text-brand-cyan" : "text-foreground"}`}>
                              {displayScore}
                            </span>
                            {isTop && <Trophy className="w-4 h-4 text-brand-cyan inline ml-1" />}
                            {usesFitScoring && calcScore?.fitModifier !== 0 && (
                              <div className={`text-xs ${(calcScore?.fitModifier ?? 0) > 0 ? "text-green-500" : "text-orange-500"}`}>
                                ({(calcScore?.fitModifier ?? 0) > 0 ? "+" : ""}{Math.round((calcScore?.fitModifier ?? 0) * 10)} fit)
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">ROI Potential</TableCell>
                      {selectedPlatformsData.map((platform) => {
                        const isTop = platform.id === recommendedPlatform?.id;
                        return (
                          <TableCell key={platform.id} className="text-center">
                            <ROIPotentialBadge potential={platform.roiPotential} isHighlighted={isTop} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Implementation Time</TableCell>
                      {selectedPlatformsData.map((platform) => (
                        <TableCell key={platform.id} className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {platform.implementationTime}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Price Range</TableCell>
                      {selectedPlatformsData.map((platform) => {
                        const isTop = platform.id === recommendedPlatform?.id;
                        return (
                          <TableCell key={platform.id} className="text-center">
                            <PriceTierBadge tier={platform.priceTier} priceRange={platform.priceRange} isHighlighted={isTop} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Best For</TableCell>
                      {selectedPlatformsData.map((platform) => (
                        <TableCell key={platform.id} className="text-center text-sm">
                          {platform.bestFor}
                        </TableCell>
                      ))}
                    </TableRow>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <category.icon className="w-4 h-4 text-brand-teal" />
                                {category.name}
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p>{category.description}</p>
                            </TooltipContent>
                          </UITooltip>
                        </TableCell>
                        {selectedPlatformsData.map((platform) => {
                          const score = platform.scores[category.id] || 0;
                          return (
                            <TableCell key={platform.id} className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#8E4F67] to-[#7FB8A3]"
                                    style={{ width: `${score * 10}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-8">{score}</span>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features">
              <div className="relative">
                <TablePopoutModal 
                  title={`${categoryType.toUpperCase()} Platform Feature Comparison`}
                  tableId={`features-table-${categoryType}`}
                >
                  <div className="overflow-x-auto max-h-[70vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px] sticky top-0 bg-background">Feature</TableHead>
                          {selectedPlatformsData.map((platform) => (
                            <TableHead key={platform.id} className="text-center min-w-[100px] sticky top-0 bg-background">
                              {platform.shortName}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featureComparison.map((category) => (
                          <Fragment key={category.category}>
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={selectedPlatformsData.length + 1} className="font-semibold">
                                {category.category}
                              </TableCell>
                            </TableRow>
                            {category.features.map((feature) => (
                              <TableRow key={feature.name}>
                                <TableCell>{feature.name}</TableCell>
                                {selectedPlatformsData.map((platform) => (
                                  <TableCell key={platform.id} className="text-center">
                                    <FeatureCell value={feature.values[platform.id]} />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TablePopoutModal>
                <div className="overflow-x-auto">
                  <p className="text-xs text-muted-foreground mb-2 md:hidden flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 animate-pulse" /> Scroll horizontally to view all platforms
                </p>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Feature</TableHead>
                      {selectedPlatformsData.map((platform) => (
                        <TableHead key={platform.id} className="text-center min-w-[100px]">
                          {platform.shortName}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureComparison.map((category) => (
                      <Fragment key={category.category}>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={selectedPlatformsData.length + 1} className="font-semibold">
                            {category.category}
                          </TableCell>
                        </TableRow>
                        {category.features.map((feature) => (
                          <TableRow key={feature.name}>
                            <TableCell>{feature.name}</TableCell>
                            {selectedPlatformsData.map((platform) => (
                              <TableCell key={platform.id} className="text-center">
                                <FeatureCell value={feature.values[platform.id]} />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="radar">
              <Card className="relative chart-section-lazy">
                <ChartPopoutModal 
                  title={`${categoryType.toUpperCase()} Platform Radar Comparison`}
                  chartId={`radar-chart-${categoryType}`}
                >
                  <div className="h-[500px] chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        {/* Background gradient rings - render first so they're behind */}
                        <Radar dataKey="bgGreen" fill="#10b981" fillOpacity={0.12} stroke="none" isAnimationActive={false} legendType="none" />
                        <Radar dataKey="bgAmber" fill="#C77A93" fillOpacity={0.08} stroke="none" isAnimationActive={false} legendType="none" />
                        <Radar dataKey="bgRed" fill="#8E4F67" fillOpacity={0.08} stroke="none" isAnimationActive={false} legendType="none" />
                        <PolarGrid stroke="hsl(var(--border))" gridType="circle" />
                        <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 14 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        {sortedScores.map((platform, index) => {
                          const colours = ["#7FB8A3", "#8E4F67", "#5E8D7A", "#252826", "#6366f1", "#5E8D7A"];
                          return (
                            <Radar
                              key={platform.id}
                              name={platform.shortName}
                              dataKey={platform.shortName}
                              stroke={colours[index % colours.length]}
                              fill={colours[index % colours.length]}
                              fillOpacity={0.15}
                            />
                          );
                        })}
                        <Legend />
                        <Tooltip content={<RadarCustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartPopoutModal>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    {/* Score Zone Key */}
                    <div className="hidden md:flex flex-col justify-center gap-1.5 text-xs">
                      <div className="font-medium text-muted-foreground mb-1">Score Zones</div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500/50" />
                        <span className="text-muted-foreground">8-10 Excellent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500/50" />
                        <span className="text-muted-foreground">4-7 Good</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/50" />
                        <span className="text-muted-foreground">0-3 Limited</span>
                      </div>
                    </div>
                    <div className="h-64 md:h-80 flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          {/* Background gradient rings - render first so they're behind */}
                          <Radar dataKey="bgGreen" fill="#10b981" fillOpacity={0.12} stroke="none" isAnimationActive={false} legendType="none" />
                          <Radar dataKey="bgAmber" fill="#C77A93" fillOpacity={0.08} stroke="none" isAnimationActive={false} legendType="none" />
                          <Radar dataKey="bgRed" fill="#8E4F67" fillOpacity={0.08} stroke="none" isAnimationActive={false} legendType="none" />
                        <PolarGrid stroke="hsl(var(--border))" gridType="circle" />
                        <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        {sortedScores.map((platform, index) => {
                          const colours = ["#7FB8A3", "#8E4F67", "#5E8D7A", "#252826", "#6366f1", "#5E8D7A"];
                          return (
                            <Radar
                              key={platform.id}
                              name={platform.shortName}
                              dataKey={platform.shortName}
                              stroke={colours[index % colours.length]}
                              fill={colours[index % colours.length]}
                              fillOpacity={0.1}
                            />
                          );
                        })}
                        <Legend />
                        <Tooltip content={<RadarCustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Hidden chart container for export capture - always mounted with fixed dimensions */}
            <div 
              id={`radar-chart-${categoryType}`} 
              className="fixed -left-[9999px] top-0 w-[800px] h-[400px] bg-white pointer-events-none"
              aria-hidden="true"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  {/* Background gradient rings for export */}
                  <Radar dataKey="bgGreen" fill="#10b981" fillOpacity={0.12} stroke="none" isAnimationActive={false} legendType="none" />
                  <Radar dataKey="bgAmber" fill="#C77A93" fillOpacity={0.08} stroke="none" isAnimationActive={false} legendType="none" />
                  <Radar dataKey="bgRed" fill="#8E4F67" fillOpacity={0.08} stroke="none" isAnimationActive={false} legendType="none" />
                  <PolarGrid stroke="#e5e7eb" gridType="circle" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: "#374151", fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                  {sortedScores.map((platform, index) => {
                    const colours = ["#7FB8A3", "#8E4F67", "#5E8D7A", "#252826", "#6366f1", "#5E8D7A"];
                    return (
                      <Radar
                        key={platform.id}
                        name={platform.shortName}
                        dataKey={platform.shortName}
                        stroke={colours[index % colours.length]}
                        fill={colours[index % colours.length]}
                        fillOpacity={0.15}
                      />
                    );
                  })}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Tabs>
        </div>
      </section>

      <section className="py-8">
        <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center">
                <Clock className="w-5 h-5 text-brand-cream" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Implementation Timeline</h2>
                <p className="text-sm text-muted-foreground">Compare typical implementation phases</p>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                data-testid="button-view-timeline"
                className="gap-2"
              >
                <Clock className="w-4 h-4" />
                {showTimeline ? "Hide Timeline" : "View Timeline"}
                {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <TimelineVisualization 
              platforms={platforms} 
              selectedPlatformIds={selectedPlatforms} 
            />
          </CollapsibleContent>
        </Collapsible>
      </section>

      <section className="py-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center">
              <Layers className="w-6 h-6 text-brand-cream" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Platform Deep Dives</h2>
              <p className="text-muted-foreground">Detailed analysis of selected platforms</p>
            </div>
          </div>
          
          {/* Deep Dive Mode Controls */}
          {canEnterDeepDive && (
            <div className="flex flex-wrap items-center gap-3">
              {deepDiveSelectedPlatforms.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {deepDiveSelectedPlatforms.length}/3 selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeepDiveSelectedPlatforms([])}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                </div>
              )}
              <Button
                onClick={() => setDeepDiveModalOpen(true)}
                disabled={!canCompareSelected}
                className={`${canCompareSelected 
                  ? 'bg-gradient-to-r from-[#252826] to-[#8E4F67] hover:from-[#252826]/90 hover:to-[#8E4F67]/90 text-white' 
                  : ''
                }`}
                data-testid="button-compare-selected"
              >
                <Scale className="w-4 h-4 mr-2" />
                Compare Selected ({deepDiveSelectedPlatforms.length})
              </Button>
            </div>
          )}
        </div>
        
        {canEnterDeepDive && (
          <div className="mb-6 p-4 bg-[#7FB8A3]/5 border border-[#7FB8A3]/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm" data-testid="button-enter-deep-dive">Side-by-Side Deep Dive Mode</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Select 2-3 platforms using the checkboxes below to compare them in a detailed feature matrix. 
                  See key differentiators and verdicts for each capability area.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {selectedPlatformsData.map((platform) => (
            <Card
              key={platform.id}
              className={`overflow-hidden transition-all ${
                expandedPlatform === platform.id ? "ring-2 ring-[#8E4F67]" : ""
              } ${deepDiveSelectedPlatforms.includes(platform.id) ? "ring-2 ring-[#7FB8A3]" : ""}`}
              data-testid={`card-deepdive-${platform.id}`}
            >
              <CardHeader
                className="cursor-pointer hover-elevate"
                onClick={() => setExpandedPlatform(expandedPlatform === platform.id ? null : platform.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Deep Dive Checkbox */}
                    {canEnterDeepDive && (
                      <div 
                        className="flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={deepDiveSelectedPlatforms.includes(platform.id)}
                          onCheckedChange={() => handleDeepDivePlatformToggle(platform.id)}
                          disabled={!deepDiveSelectedPlatforms.includes(platform.id) && deepDiveSelectedPlatforms.length >= 3}
                          className="h-5 w-5 border-[#8E4F67] data-[state=checked]:bg-[#7FB8A3] data-[state=checked]:border-[#7FB8A3]"
                          data-testid={`checkbox-platform-${platform.id}`}
                        />
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center text-white font-semibold text-lg">
                      {platform.logo}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{platform.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="text-[10px] px-1.5" variant="secondary">{platform.marketPosition}</Badge>
                        <PriceTierBadge tier={platform.priceTier} priceRange={platform.priceRange} />
                        {/* Segment Ranking Badge */}
                        {usesFitScoring && (categoryType === 'epm' || categoryType === 'erp') && (() => {
                          const rankedPlatforms = [...calculatedScores]
                            .sort((a, b) => (b.fitAdjustedScore ?? 0) - (a.fitAdjustedScore ?? 0))
                            .map(p => ({ id: p.id, score: p.fitAdjustedScore ?? 0 }));
                          const sweetSpots = categoryType === 'epm' ? epmSweetSpots : erpSweetSpots;
                          const segmentContext = calculateSegmentContext(
                            platform.id,
                            rankedPlatforms,
                            companyProfile,
                            sweetSpots
                          );
                          return <SegmentRankBadge segmentContext={segmentContext} compact />;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      {(() => {
                        const calcScore = calculatedScores.find((p) => p.id === platform.id);
                        const rawScore = usesFitScoring ? calcScore?.fitAdjustedScore : calcScore?.calculatedScore;
                        const displayScore = Math.round((rawScore ?? 0) * 10);
                        const hasModifiers = categoryType === 'ai' && calcScore?.aiModifiers && calcScore.aiModifiers.length > 0;
                        
                        // Use ScoreBreakdownTooltip for EPM/ERP
                        if ((categoryType === 'epm' || categoryType === 'erp') && calcScore) {
                          return (
                            <ScoreBreakdownTooltip
                              platform={platform}
                              categories={categories}
                              weights={categoryWeights}
                            >
                              <div className="cursor-help">
                                <div className="text-2xl font-semibold text-brand-cyan">
                                  {displayScore}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {usesFitScoring ? "Fit Score" : "Score"} / 100
                                </div>
                                {usesFitScoring && calcScore?.fitModifier !== 0 && (
                                  <div className={`text-xs font-medium ${(calcScore?.fitModifier ?? 0) > 0 ? 'text-green-500' : 'text-amber-500'}`}>
                                    ({(calcScore?.fitModifier ?? 0) > 0 ? '+' : ''}{Math.round((calcScore?.fitModifier ?? 0) * 10)})
                                  </div>
                                )}
                              </div>
                            </ScoreBreakdownTooltip>
                          );
                        }
                        
                        return (
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="text-2xl font-semibold text-brand-cyan">
                                  {displayScore}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {usesFitScoring ? "Fit Score" : "Score"} / 100
                                </div>
                                {usesFitScoring && calcScore?.fitModifier !== 0 && (
                                  <div className={`text-xs font-medium ${(calcScore?.fitModifier ?? 0) > 0 ? 'text-green-500' : 'text-amber-500'}`}>
                                    ({(calcScore?.fitModifier ?? 0) > 0 ? '+' : ''}{Math.round((calcScore?.fitModifier ?? 0) * 10)})
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[280px]">
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between gap-4">
                                  <span>Base Score:</span>
                                  <span className="font-medium">{Math.round((calcScore?.calculatedScore ?? 0) * 10)}</span>
                                </div>
                                {hasModifiers && calcScore?.aiModifiers?.map((mod, idx) => (
                                  <div key={idx} className={`flex justify-between gap-4 ${mod.value > 0 ? 'text-green-500' : mod.value < 0 ? 'text-red-400' : ''}`}>
                                    <span>{mod.label}:</span>
                                    <span>{mod.value > 0 ? '+' : ''}{mod.value}</span>
                                  </div>
                                ))}
                                {usesFitScoring && (
                                  <div className="flex justify-between gap-4 pt-1 border-t border-border font-semibold">
                                    <span>Fit-Adjusted:</span>
                                    <span className="text-brand-cyan">{Math.round((calcScore?.fitAdjustedScore ?? 0) * 10)}</span>
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </UITooltip>
                        );
                      })()}
                    </div>
                    {expandedPlatform === platform.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {/* Modifier Badges on Card Header */}
                {usesFitScoring && categoryType === 'ai' && (() => {
                  const calcScore = calculatedScores.find((p) => p.id === platform.id);
                  const hasModifiers = calcScore?.aiModifiers && calcScore.aiModifiers.length > 0;
                  if (!hasModifiers) return null;
                  
                  const positiveModifiers = calcScore.aiModifiers.filter(m => m.value > 0);
                  const negativeModifiers = calcScore.aiModifiers.filter(m => m.value < 0);
                  
                  return (
                    <div className="flex flex-wrap gap-1 mt-2 ml-16">
                      {positiveModifiers.slice(0, 3).map((mod, idx) => (
                        <Badge 
                          key={idx} 
                          className="text-[9px] px-1 py-0 bg-[#7FB8A3]/20 text-brand-teal border-[#7FB8A3]/50"
                        >
                          {mod.label}
                        </Badge>
                      ))}
                      {negativeModifiers.slice(0, 2).map((mod, idx) => (
                        <Badge 
                          key={`neg-${idx}`} 
                          className="text-[9px] px-1 py-0 bg-red-500/10 text-red-500 border-red-500/30"
                        >
                          {mod.label}
                        </Badge>
                      ))}
                      {(positiveModifiers.length > 3 || negativeModifiers.length > 2) && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          +{Math.max(0, positiveModifiers.length - 3) + Math.max(0, negativeModifiers.length - 2)} more
                        </Badge>
                      )}
                    </div>
                  );
                })()}
                
                {/* Why This Ranking Summary for EPM/ERP */}
                {usesFitScoring && (categoryType === 'epm' || categoryType === 'erp') && (() => {
                  const rankedPlatforms = [...calculatedScores]
                    .sort((a, b) => (b.fitAdjustedScore ?? 0) - (a.fitAdjustedScore ?? 0));
                  const rank = rankedPlatforms.findIndex(p => p.id === platform.id) + 1;
                  const fitResult = fitResults?.find(f => f.platformId === platform.id) ?? null;
                  const sweetSpots = categoryType === 'epm' ? epmSweetSpots : erpSweetSpots;
                  const segmentContext = calculateSegmentContext(
                    platform.id,
                    rankedPlatforms.map(p => ({ id: p.id, score: p.fitAdjustedScore ?? 0 })),
                    companyProfile,
                    sweetSpots
                  );
                  const summary = generateWhyThisRanking(platform, fitResult, rank, segmentContext);
                  
                  return (
                    <div className="mt-2 ml-16">
                      <WhyThisRankingSummary summary={summary} compact />
                    </div>
                  );
                })()}
              </CardHeader>

              {expandedPlatform === platform.id && (
                <CardContent className="border-t">
                  {/* AI Platform Scoring Breakdown */}
                  {usesFitScoring && categoryType === 'ai' && (() => {
                    const calcScore = calculatedScores.find((p) => p.id === platform.id);
                    const hasModifiers = calcScore?.aiModifiers && calcScore.aiModifiers.length > 0;
                    if (!hasModifiers) return null;
                    
                    return (
                      <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                          <Calculator className="w-4 h-4 text-brand-cyan" />
                          Contextual Scoring Breakdown
                        </h4>
                        <div className="space-y-2 text-sm font-mono">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base Score:</span>
                            <span className="font-semibold">{(calcScore.calculatedScore * 10).toFixed(0)}</span>
                          </div>
                          {calcScore.aiModifiers.map((mod, idx) => (
                            <div key={idx} className={`flex justify-between ${mod.value > 0 ? 'text-green-600 dark:text-green-400' : mod.value < 0 ? 'text-red-500 dark:text-orange-400' : 'text-muted-foreground'}`}>
                              <span className="flex items-center gap-1">
                                {mod.value > 0 ? <ArrowUp className="w-3 h-3" /> : mod.value < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                                {mod.label}
                                {mod.detail && <span className="text-xs text-muted-foreground ml-1">({mod.detail})</span>}
                              </span>
                              <span>{mod.value > 0 ? '+' : ''}{mod.value}</span>
                            </div>
                          ))}
                          <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
                            <span>Contextual Score:</span>
                            <span className="text-brand-cyan">{(calcScore.fitAdjustedScore * 10).toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="grid md:grid-cols-2 gap-8 py-4">
                    <div>
                      <h4 className="font-semibold mb-3">Overview</h4>
                      <p className="text-muted-foreground text-sm mb-4">{platform.description}</p>
                      
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-cyan" />
                        Key Features
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {platform.keyFeatures.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Implementation:</span>
                          <div className="font-medium flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {platform.implementationTime}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ROI Potential:</span>
                          <div className="mt-1">
                            <ROIPotentialBadge potential={platform.roiPotential} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Strengths
                      </h4>
                      <ul className="space-y-2 mb-4">
                        {platform.strengths.map((strength) => (
                          <li key={strength} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>

                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-orange-500" />
                        Limitations
                      </h4>
                      <ul className="space-y-2">
                        {platform.limitations.map((limitation) => (
                          <li key={limitation} className="flex items-start gap-2 text-sm">
                            <XCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-brand-teal" />
                      <span className="font-medium">Best For:</span>
                      <span className="text-muted-foreground">{platform.bestFor}</span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Deep Dive Comparison Modal */}
      <Dialog open={deepDiveModalOpen} onOpenChange={setDeepDiveModalOpen}>
        <DialogContent 
          className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-3 sm:p-6"
          data-testid="modal-deep-dive"
        >
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan" />
              <span className="hidden sm:inline">Side-by-Side Deep Dive Comparison</span>
              <span className="sm:hidden">Deep Dive Comparison</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Compare: {deepDiveSelectedPlatformsData.map(p => p.shortName).join(', ')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto px-1">
            {/* Platform Summary Header */}
            <div className={`grid gap-4 mb-6 ${deepDiveSelectedPlatformsData.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {deepDiveSelectedPlatformsData.map((platform) => {
                const calcScore = calculatedScores.find((p) => p.id === platform.id);
                return (
                  <Card key={platform.id} className="border-[#7FB8A3]/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center text-white font-semibold text-sm">
                          {platform.logo}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{platform.shortName}</h4>
                          <Badge variant="outline" className="text-[9px]">{platform.marketPosition}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Score:</span>
                          <span className="font-semibold text-brand-cyan ml-1">{Math.round(((usesFitScoring ? calcScore?.fitAdjustedScore : calcScore?.calculatedScore) ?? 0) * 10)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-medium ml-1">{platform.implementationTime}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium ml-1">{platform.priceRange}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Feature Matrix Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table data-testid="table-feature-matrix" className="text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[200px] font-semibold">Feature</TableHead>
                    {deepDiveSelectedPlatformsData.map((platform) => (
                      <TableHead key={platform.id} className="text-center min-w-[120px] font-semibold">
                        {platform.shortName}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureComparison.map((category) => {
                    const verdict = getCategoryVerdict(category);
                    const isExpanded = expandedCategories.includes(category.category);
                    
                    return (
                      <Fragment key={category.category}>
                        {/* Category Header with Verdict */}
                        <TableRow 
                          className="bg-gradient-to-r from-[#252826]/10 to-[#8E4F67]/10 cursor-pointer hover:from-[#252826]/15 hover:to-[#8E4F67]/15"
                          onClick={() => handleCategoryToggle(category.category)}
                        >
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                              {category.category}
                            </div>
                          </TableCell>
                          {deepDiveSelectedPlatformsData.map((platform) => {
                            const isWinner = verdict?.winnerId === platform.id;
                            return (
                              <TableCell key={platform.id} className="text-center">
                                {isWinner && (
                                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Leader
                                  </Badge>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        
                        {/* Verdict Row */}
                        {isExpanded && verdict && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={deepDiveSelectedPlatformsData.length + 1}>
                              <div className="flex items-center gap-2 text-sm py-1">
                                <Award className="w-4 h-4 text-brand-cyan" />
                                <span className="font-medium text-muted-foreground">Verdict:</span>
                                <span className="font-semibold">{verdict.verdict}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {/* Feature Rows (expanded) */}
                        {isExpanded && category.features.map((feature) => {
                          const isKeyDiff = isDifferentiator(feature);
                          return (
                            <TableRow 
                              key={feature.name}
                              className={isKeyDiff ? "bg-yellow-500/5 border-l-2 border-l-yellow-500" : ""}
                            >
                              <TableCell className="pl-8">
                                <div className="flex items-center gap-2">
                                  {feature.name}
                                  {isKeyDiff && (
                                    <UITooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-[9px] px-1">
                                          Key Differentiator
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>This feature differs significantly between platforms</p>
                                      </TooltipContent>
                                    </UITooltip>
                                  )}
                                </div>
                              </TableCell>
                              {deepDiveSelectedPlatformsData.map((platform) => {
                                const value = feature.values[platform.id];
                                return (
                                  <TableCell key={platform.id} className="text-center">
                                    {value === true && (
                                      <div className="flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                      </div>
                                    )}
                                    {value === false && (
                                      <div className="flex items-center justify-center">
                                        <XCircle className="w-5 h-5 text-muted-foreground/30" />
                                      </div>
                                    )}
                                    {value === "partial" && (
                                      <div className="flex items-center justify-center">
                                        <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Partial</span>
                                      </div>
                                    )}
                                    {value !== true && value !== false && value !== "partial" && value && (
                                      <span className="text-sm">{String(value)}</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Strengths & Limitations Comparison */}
            <div className="mt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-cyan" />
                Strengths & Limitations Comparison
              </h4>
              <div className={`grid gap-4 ${deepDiveSelectedPlatformsData.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                {deepDiveSelectedPlatformsData.map((platform) => (
                  <Card key={platform.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{platform.shortName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h5 className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Strengths
                        </h5>
                        <ul className="space-y-1">
                          {platform.strengths.slice(0, 3).map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-orange-500 mb-2 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Limitations
                        </h5>
                        <ul className="space-y-1">
                          {platform.limitations.slice(0, 3).map((l, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {l}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sticky bottom CTA for mobile */}
      {selectedPlatforms.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-sm border-t border-border p-3 safe-bottom">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-muted-foreground">Get your personalised report</p>
            </div>
            <Button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              size="sm"
              className="bg-[#7FB8A3] text-[#252826] flex-shrink-0"
              data-testid="button-sticky-export-pdf"
            >
              {isExportingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <DownloadGateModal
        resource={null}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        customExportFn={pendingExportFn}
        customExportTitle={pendingExportTitle}
        customExportDescription={pendingExportDescription}
        requireFreshVerification={requireFreshVerification}
      />
        </>
      )}
    </div>
  );
}

export default function TechComparisonPage() {
  const { flags } = useFeatureFlags();
  const [activeCategory, setActiveCategory] = useState<"epm" | "erp" | "ai">("epm");

  // Track page view and comparison tool opened on mount
  useEffect(() => {
    trackPageView(`${activeCategory}_comparison`);
    trackComparisonToolOpened(activeCategory);
  }, [activeCategory]);

  return (
    <div className="marketing-page">
      <SEOHead
        title="Enterprise Technology Comparison Tool | Constancia - Compare EPM, ERP & AI Solutions"
        description="Compare EPM platforms like OneStream, Anaplan, and Pigment side by side. Filter by requirements, view detailed scoring, and export analysis for your evaluation."
        keywords={["EPM comparison", "ERP comparison", "AI for finance", "OneStream vs Anaplan", "Oracle ERP", "SAP S/4HANA", "Microsoft Copilot", "financial technology"]}
      />

      <main>
        <section className="py-8 md:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div>
              <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as "epm" | "erp" | "ai")} className="space-y-8">
                <div className="flex flex-col items-center">
                  <TabsList className="h-auto p-1 bg-muted/50 flex-wrap">
                    <TabsTrigger 
                      value="epm" 
                      className="data-[state=active]:bg-[#7FB8A3] data-[state=active]:text-[#252826] px-3 md:px-6 py-2 md:py-3 text-sm md:text-base"
                      data-testid="tab-category-epm"
                    >
                      <Target className="w-4 h-4 mr-1 md:mr-2" />
                      EPM Solutions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="erp" 
                      className="data-[state=active]:bg-[#7FB8A3] data-[state=active]:text-[#252826] px-3 md:px-6 py-2 md:py-3 text-sm md:text-base"
                      data-testid="tab-category-erp"
                    >
                      <Database className="w-4 h-4 mr-1 md:mr-2" />
                      ERP Systems
                    </TabsTrigger>
                    <TabsTrigger 
                      value="ai" 
                      className="data-[state=active]:bg-[#7FB8A3] data-[state=active]:text-[#252826] px-3 md:px-6 py-2 md:py-3 text-sm md:text-base"
                      data-testid="tab-category-ai"
                    >
                      <Bot className="w-4 h-4 mr-1 md:mr-2" />
                      AI Tools
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6 text-center max-w-2xl">
                    <h2 className="text-2xl font-semibold text-foreground mb-2">
                      {categoryDescriptions[activeCategory].title}
                    </h2>
                    <p className="text-muted-foreground">
                      {categoryDescriptions[activeCategory].description}
                    </p>
                  </div>
                </div>

                <TabsContent value="epm" className="mt-8">
                  <ComparisonSection 
                    platforms={epmPlatforms} 
                    categories={epmCategories} 
                    featureComparison={epmFeatureComparison}
                    categoryType="epm"
                  />
                </TabsContent>

                <TabsContent value="erp" className="mt-8">
                  <ComparisonSection 
                    platforms={erpPlatforms} 
                    categories={erpCategories} 
                    featureComparison={erpFeatureComparison}
                    categoryType="erp"
                  />
                </TabsContent>

                <TabsContent value="ai" className="mt-8">
                  <ComparisonSection 
                    platforms={aiPlatforms} 
                    categories={aiCategories} 
                    featureComparison={aiFeatureComparison}
                    categoryType="ai"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <CookiePreferencesIcon />
    </div>
  );
}
