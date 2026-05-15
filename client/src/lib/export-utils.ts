import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Workbook, Cell } from "exceljs";
import { dlog } from "@/lib/dev-log";

import logoWhite from "@assets/brand/Constancia-Logo-ML-Transparent.png";
import logoBlue from "@assets/brand/Constancia-Logo-PD-Transparent.png";

import {
  PDF_MARGINS,
  PDF_FOOTER_HEIGHT,
  PDF_TYPOGRAPHY,
  PDF_PAGE_SIZE,
  scaleToFit,
  formatDateUK,
} from "@shared/pdf-config";

import {
  drawStandardHeader,
  drawStandardFooter,
  addImagePreserveRatioSync,
  ensureSpaceForTable,
  ensureSpaceForText,
  ensureSpaceForImage,
  ensureSpaceForSection,
  ensureSpaceForCard,
  measureTableHeight,
  measureBulletListHeight,
  measureCardHeight,
  measureAndEnsureSpace,
  renderBulletList,
  renderCard,
  renderSection,
  PDF_CONTENT_AREA,
} from "./pdf-helpers";

const BRAND_COLORS = {
  navy: "#12161D",
  cyan: "#C77A93",
  teal: "#7FB8A3",
  cream: "#F6F3EE",
  white: "#FFFFFF",
};

const EXCEL_COLORS = {
  navy: "02205B",
  cyan: "12EBFC",
  teal: "0884AA",
  cream: "FEFFF3",
  white: "FFFFFF",
  lightBlue: "E8F4FC",
  lightGreen: "E8F5E9",
  lightYellow: "FFF8E1",
  lightRed: "FFEBEE",
  mediumGray: "F5F5F5",
  darkGray: "333333",
};

const CONTACT_INFO = {
  address: "86-90 Paul Street, London, EC2A 4NE, United Kingdom",
  email: "info@constancia.io",
  website: "https://constancia.io",
  linkedin: "linkedin.com/company/1qg-group-limited",
};

interface AIModifier {
  label: string;
  value: number;
  detail?: string;
}

interface Platform {
  id: string;
  name: string;
  shortName: string;
  marketPosition: string;
  roiPotential: string;
  implementationTime: string;
  priceRange: string;
  bestFor: string;
  scores: Record<string, number>;
  strengths: string[];
  limitations: string[];
}

interface CalculatedPlatform extends Platform {
  calculatedScore: number;
  fitAdjustedScore?: number;
  fitModifier?: number;
  fitLevel?: string;
  aiModifiers?: AIModifier[];
}

interface Category {
  id: string;
  name: string;
}

interface CompanyProfile {
  revenue: string | null;
  companySize: string | null;
  erpLandscape: string | null;
  industry: string | null;
  primaryObjective?: string | null;
}

interface FitReasonData {
  matchReasons: string[];
  concerns: string[];
}

interface ChartImages {
  radarChart?: string;
  featureChart?: string;
}

interface FitResultExport {
  platformId: string;
  score: number;
  baseScore?: number;
  modifier?: number;
  matchReasons?: string[];
  concerns?: string[];
}

interface ExportData {
  categoryType: "epm" | "erp" | "ai";
  platforms: Platform[];
  categories: Category[];
  calculatedScores: CalculatedPlatform[];
  categoryWeights: Record<string, number>;
  recommendedPlatform?: CalculatedPlatform;
  usesFitScoring?: boolean;
  companyProfile?: CompanyProfile;
  fitReasons?: Record<string, FitReasonData>;
  chartImages?: ChartImages;
  fitResults?: FitResultExport[] | null;
  selectedPreset?: string | null;
  sortedByFit?: CalculatedPlatform[];
  industryLabel?: string | null;
  presetLabel?: string | null;
}

const PROFILE_LABELS: Record<string, Record<string, string>> = {
  revenue: {
    'under-10m': 'Under £10M',
    '10m-50m': '£10M - £50M',
    '50m-250m': '£50M - £250M',
    '250m-1b': '£250M - £1B',
    'over-1b': 'Over £1B',
  },
  companySize: {
    'startup': 'Startup (<50)',
    'small': 'Small (50-200)',
    'medium': 'Medium (200-1000)',
    'large': 'Large (1000-5000)',
    'enterprise': 'Enterprise (5000+)',
  },
  erpLandscape: {
    'oracle': 'Oracle ERP',
    'sap': 'SAP S/4HANA',
    'microsoft': 'Microsoft 365',
    'dynamics365': 'Microsoft 365',
    'netsuite': 'NetSuite',
    'workday': 'Workday',
    'sage': 'Sage',
    'multi-vendor': 'Multi-Vendor',
    'greenfield': 'Greenfield/Other',
    'other': 'Other',
  },
  industry: {
    'manufacturing': 'Manufacturing',
    'financial-services': 'Financial Services',
    'professional-services': 'Professional Services',
    'retail': 'Retail & Consumer',
    'technology': 'Technology',
    'healthcare': 'Healthcare',
    'energy': 'Energy & Utilities',
    'real-estate': 'Real Estate',
    'media-entertainment': 'Media & Entertainment',
    'education': 'Education',
    'government': 'Government & Public Sector',
    'other': 'Other',
  },
  primaryObjective: {
    'statutory-close': 'Statutory Close & Consolidation',
    'agile-fpa': 'Agile FP&A & Planning',
    'unified-epm': 'Unified EPM Platform',
    'excel-heavy': 'Excel-Heavy Environment',
    'multi-erp': 'Multi-ERP Consolidation',
    'ai-forecasting': 'AI-Powered Forecasting',
    'microsoft-salesforce': 'Microsoft/Salesforce Integration',
    'manufacturing': 'Manufacturing Operations',
    'service-people': 'Service/People-Based',
    'microsoft-stack': 'Microsoft Stack',
    'finance-only': 'Finance-Only Focus',
    'budget-conscious': 'Budget-Conscious',
    'ai-priority': 'AI Priority',
  },
};

function getProfileLabel(field: keyof typeof PROFILE_LABELS, value: string | null): string {
  if (!value) return 'Not specified';
  return PROFILE_LABELS[field]?.[value] || value;
}

const categoryTitles = {
  epm: "Enterprise Performance Management Platform Comparison",
  erp: "Enterprise Resource Planning System Comparison",
  ai: "AI Tools for Finance Comparison",
};

const categorySubtitles = {
  epm: "Independent Analysis and Recommendations",
  erp: "Independent Analysis and Recommendations", 
  ai: "Independent Analysis and Recommendations",
};

// 2025 Gartner Magic Quadrant Data
const GARTNER_MQ_2025 = {
  title: "Gartner Magic Quadrant for Financial Planning Software 2025",
  keyTheme: "AI and Agentic Automation driving planning transformation",
  leaders: [
    { name: "Anaplan", years: 9, highlight: "9th consecutive year as Leader. Hyperblock technology for connected enterprise planning." },
    { name: "OneStream", years: 5, highlight: "5th consecutive year as Leader. SensibleAI delivers agentic automation for finance." },
    { name: "CCH Tagetik", years: 5, highlight: "5th time as Leader. AI-powered automation for financial close and compliance." },
    { name: "Workday", years: 4, highlight: "4th consecutive year as Leader. Augmented analytics and unified HCM/Finance." },
    { name: "SAP (SAC)", years: 1, highlight: "SAP Analytics Cloud - deep S/4HANA integration with embedded AI." },
    { name: "Jedox", years: 1, highlight: "Excel-centric approach with enterprise governance. 2,900+ customers globally." },
  ],
  included: [
    { name: "Oracle Cloud EPM", note: "Comprehensive suite for Oracle ERP customers" },
    { name: "Board", note: "Unified BI and EPM for mid-market" },
    { name: "IBM Planning Analytics", note: "Powerful TM1 engine for complex modelling" },
  ],
  otherNotable: [
    { name: "Vena", note: "IDC MarketScape 2025 Leader for Mid-Market. Native M365 Copilot integration." },
    { name: "Pigment", note: "Modern cloud-native platform for fast-growing companies" },
  ],
  marketTrends: [
    "AI-Powered Forecasting: Machine learning driving predictive accuracy improvements",
    "Agentic Automation: Autonomous agents handling routine finance tasks (SensibleAI, Planning Agent)",
    "Connected Planning: Cross-functional alignment across Finance, Sales, Supply Chain, and HR",
    "Real-Time Consolidation: Continuous close capabilities replacing periodic batch processing",
    "ESG Integration: Sustainability metrics embedded in financial planning workflows",
    "Low-Code/No-Code: Business users building models without IT dependency",
  ],
};

// Vendor AI Capabilities for EPM platforms
const VENDOR_AI_CAPABILITIES: Record<string, { aiFeatures: string[]; aiMaturity: string }> = {
  onestream: {
    aiFeatures: ["SensibleAI agentic automation", "Predictive forecasting", "Anomaly detection", "Natural language querying"],
    aiMaturity: "Advanced",
  },
  "onestream-cpm-express": {
    aiFeatures: ["SensibleAI agentic automation", "Predictive forecasting", "Anomaly detection", "30+ AI routines"],
    aiMaturity: "Advanced",
  },
  anaplan: {
    aiFeatures: ["PlanIQ predictive analytics", "Connected planning AI", "Scenario optimization", "Demand sensing"],
    aiMaturity: "Advanced",
  },
  pigment: {
    aiFeatures: ["Agentic AI Analysts", "Natural language queries", "Automated scenario planning", "AI-powered insights"],
    aiMaturity: "Advanced",
  },
  planful: {
    aiFeatures: ["Planful Predict AI", "Structured planning AI", "Automated forecasting", "Variance analysis"],
    aiMaturity: "Moderate",
  },
  "cch-tagetik": {
    aiFeatures: ["AI-powered financial close", "Intelligent automation", "Predictive consolidation", "Smart narrative reporting"],
    aiMaturity: "Advanced",
  },
  oracle: {
    aiFeatures: ["Oracle AI for EPM", "Predictive planning", "Smart View analytics", "Automated commentary"],
    aiMaturity: "Moderate",
  },
  sapbpc: {
    aiFeatures: ["SAP Business AI", "Predictive scenarios", "Smart Predict", "Joule assistant"],
    aiMaturity: "Moderate",
  },
  jedox: {
    aiFeatures: ["Jedox AIssisted planning", "Predictive forecasting", "Automated data cleansing"],
    aiMaturity: "Emerging",
  },
  board: {
    aiFeatures: ["Board AI assistant", "Predictive analytics", "Pattern recognition"],
    aiMaturity: "Emerging",
  },
  "ibm-planning-analytics": {
    aiFeatures: ["Watson AI integration", "Predictive modelling", "Cognitive insights"],
    aiMaturity: "Moderate",
  },
  vena: {
    aiFeatures: ["Vena Copilot agentic AI", "M365 Copilot integration", "AI-powered insights", "Automated variance analysis"],
    aiMaturity: "Moderate",
  },
  workday: {
    aiFeatures: ["Workday AI", "Predictive analytics", "Natural language querying", "Automated insights"],
    aiMaturity: "Moderate",
  },
};

// EPM Scoring Criteria with max scores and descriptions
const EPM_SCORING_CRITERIA: {
  id: string;
  name: string;
  maxScore: number;
  description: string;
}[] = [
  {
    id: "consolidation",
    name: "Consolidation & Close",
    maxScore: 17,
    description: "Multi-entity consolidation, intercompany eliminations, journal management, reconciliations, close task management, and statutory reporting capabilities.",
  },
  {
    id: "planning",
    name: "Planning & Forecasting",
    maxScore: 18,
    description: "Driver-based planning, rolling forecasts, workforce planning, capital planning, profitability modelling, and scenario analysis capabilities.",
  },
  {
    id: "ai",
    name: "AI & Automation",
    maxScore: 16,
    description: "AI-powered forecasting, anomaly detection, natural language querying, agentic automation, and machine learning capabilities embedded in finance workflows.",
  },
  {
    id: "modelling",
    name: "Modelling & Extensibility",
    maxScore: 9,
    description: "Custom calculation engine, complex modelling capabilities, dimensional flexibility, and ability to extend beyond standard finance use cases.",
  },
  {
    id: "integration",
    name: "Integration & Data Fabric",
    maxScore: 8,
    description: "Pre-built ERP connectors, API capabilities, data warehouse integration, real-time data connectivity, and unified data layer support.",
  },
  {
    id: "reporting",
    name: "Reporting & Visualisation",
    maxScore: 7,
    description: "Self-service reporting, dashboards, visualisation capabilities, narrative reporting, and Microsoft Office integration.",
  },
  {
    id: "governance",
    name: "Governance & Compliance",
    maxScore: 7,
    description: "Audit trails, workflow approvals, data lineage, access controls, SOX compliance support, and change management capabilities.",
  },
  {
    id: "regulatory",
    name: "Regulatory Compliance",
    maxScore: 8,
    description: "IFRS/GAAP support, tax provisioning, country-by-country reporting, ESG reporting, and statutory disclosure management.",
  },
  {
    id: "timeToValue",
    name: "Time-to-Value",
    maxScore: 4,
    description: "Implementation speed, pre-built content, templates availability, and ability to achieve rapid value realisation.",
  },
  {
    id: "tco",
    name: "Total Cost of Ownership",
    maxScore: 4,
    description: "Licensing model flexibility, implementation cost predictability, ongoing support costs, and long-term value for money.",
  },
  {
    id: "support",
    name: "Support & Ecosystem",
    maxScore: 2,
    description: "Vendor support quality, partner ecosystem depth, user community, training resources, and marketplace of pre-built solutions.",
  },
];

type ToastFunction = (options: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

function getExcelColumnLetter(columnIndex: number): string {
  let result = '';
  let index = columnIndex;
  while (index >= 0) {
    result = String.fromCharCode((index % 26) + 65) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

function validateExportData(data: ExportData): { valid: boolean; error?: string } {
  if (!data) {
    return { valid: false, error: "Export data is missing" };
  }
  if (!Array.isArray(data.platforms) || data.platforms.length === 0) {
    return { valid: false, error: "No platforms selected for export" };
  }
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    return { valid: false, error: "No categories available for comparison" };
  }
  if (!Array.isArray(data.calculatedScores)) {
    return { valid: false, error: "Platform scores are not available" };
  }
  if (!data.categoryWeights || typeof data.categoryWeights !== "object") {
    return { valid: false, error: "Category weights are not configured" };
  }
  return { valid: true };
}

export async function exportToPDF(data: ExportData, toast?: ToastFunction): Promise<void> {
  const validation = validateExportData(data);
  if (!validation.valid) {
    console.error("PDF Export validation failed:", validation.error);
    toast?.({
      title: "Export Failed",
      description: validation.error || "Invalid export data",
      variant: "destructive",
    });
    return;
  }

  dlog("[PDFExport] Using server-side Adobe PDF generation");
  
  try {
    toast?.({
      title: "Generating PDF",
      description: "This may take up to 30 seconds...",
    });

    const response = await fetch("/api/comparison/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const blob = await response.blob();
    const fileName = `Constancia-${data.categoryType.toUpperCase()}-Comparison-${new Date().toISOString().split("T")[0]}.pdf`;

    // Detect mobile/iOS for different download handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    const blobUrl = URL.createObjectURL(blob);
    
    if (isIOS) {
      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow) {
        window.location.href = blobUrl;
      }
      toast?.({
        title: "PDF Generated",
        description: "Your PDF has opened in a new tab. Use the share button to save it.",
      });
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else if (isMobile) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      toast?.({
        title: "PDF Downloaded",
        description: "Check your downloads folder for the PDF.",
      });
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast?.({
        title: "PDF Downloaded",
        description: "Your comparison report has been saved.",
      });
    }
  } catch (error) {
    console.error("PDF Export error:", error);
    toast?.({
      title: "PDF Export Failed",
      description: error instanceof Error ? error.message : "An error occurred while generating the PDF. Please try again.",
      variant: "destructive",
    });
    throw error;
  }
}

// Legacy client-side PDF generation (kept as fallback reference)
async function _legacyExportToPDF(data: ExportData, toast?: ToastFunction): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // === COVER PAGE ===
  // Navy background
  doc.setFillColor(2, 32, 91); // Navy
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Add white logo
  try {
    const logoImg = new Image();
    logoImg.src = logoWhite;
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });
    doc.addImage(logoImg, "PNG", margin, 25, 50, 15);
  } catch (e) {
    console.warn("Failed to load white logo for PDF export:", e);
    doc.setFontSize(28);
    doc.setTextColor(BRAND_COLORS.cyan);
    doc.text("Constancia", margin, 35);
  }

  // Title
  doc.setFontSize(24);
  doc.setTextColor(BRAND_COLORS.cream);
  doc.text(categoryTitles[data.categoryType], margin, 80, { maxWidth: pageWidth - margin * 2 });

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(BRAND_COLORS.cyan);
  doc.text(categorySubtitles[data.categoryType], margin, 110);

  // Category badge
  doc.setFontSize(11);
  doc.setTextColor(BRAND_COLORS.cream);
  doc.text(`Category: Technology Comparison`, margin, 130);

  // Decorative line
  doc.setDrawColor(BRAND_COLORS.cyan);
  doc.setLineWidth(2);
  doc.line(margin, 145, margin + 60, 145);

  // Report contents preview (compact to avoid footer overlap)
  doc.setFontSize(10);
  doc.setTextColor(BRAND_COLORS.cream);
  doc.setFont("helvetica", "bold");
  doc.text("This Report Includes:", margin, 160);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const contentItems = [
    "Executive summary with key findings",
    "Visual platform score comparison",
    "Capability analysis across all dimensions",
    data.categoryType === 'epm' ? "2025 market insights" : "Market positioning",
  ];
  
  contentItems.forEach((item, idx) => {
    doc.setFillColor(18, 235, 252); // Cyan bullet
    doc.circle(margin + 3, 171 + (idx * 8), 1.2, "F");
    doc.setTextColor(BRAND_COLORS.cream);
    doc.text(item, margin + 8, 172 + (idx * 8));
  });

  // Platform count badge
  doc.setFillColor(8, 132, 170); // Teal
  doc.roundedRect(pageWidth - margin - 55, 158, 55, 22, 3, 3, "F");
  doc.setFontSize(16);
  doc.setTextColor(BRAND_COLORS.cream);
  doc.setFont("helvetica", "bold");
  doc.text(data.platforms.length.toString(), pageWidth - margin - 27, 168, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Platforms Analysed", pageWidth - margin - 27, 176, { align: "center" });

  // Cover footer with tagline and contact details
  doc.setFontSize(9);
  doc.setTextColor(BRAND_COLORS.cream);
  doc.setFont("helvetica", "bold");
  doc.text("Finance Transformed. Designed for Change.", margin, pageHeight - 58);
  doc.setTextColor(BRAND_COLORS.cyan);
  doc.setFont("helvetica", "italic");
  doc.text("Driven by Technology.", margin, pageHeight - 48);

  doc.setFontSize(8);
  doc.setTextColor(BRAND_COLORS.cream);
  doc.setFont("helvetica", "normal");
  doc.text(`${CONTACT_INFO.email}  |  ${CONTACT_INFO.website}`, margin, pageHeight - 32);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Gray
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, margin, pageHeight - 20);

  // === CONTENT PAGES ===
  doc.addPage();
  let yPos = margin;

  // Add blue logo to content pages header
  try {
    const logoImg = new Image();
    logoImg.src = logoBlue;
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });
    doc.addImage(logoImg, "PNG", margin, 12, 35, 10);
  } catch (e) {
    console.warn("Failed to load blue logo for PDF export:", e);
    doc.setFontSize(16);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.text("Constancia", margin, 18);
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(categoryTitles[data.categoryType], pageWidth - margin, 18, { align: "right" });

  yPos = 35;

  // === YOUR ORGANISATION PROFILE SECTION ===
  const hasProfile = data.companyProfile && (
    data.companyProfile.revenue || 
    data.companyProfile.companySize || 
    data.companyProfile.erpLandscape || 
    data.companyProfile.industry ||
    data.companyProfile.primaryObjective
  );
  
  if (hasProfile && data.companyProfile) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 55, 3, 3, "F");
    
    doc.setFillColor(8, 132, 170);
    doc.rect(margin, yPos, 3, 55, "F");
    
    doc.setFontSize(12);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Your Organisation Profile", margin + 10, yPos + 12);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    
    let profileY = yPos + 22;
    const profileItems = [
      { label: "Revenue Band", value: getProfileLabel('revenue', data.companyProfile.revenue) },
      { label: "Company Size", value: getProfileLabel('companySize', data.companyProfile.companySize) },
      { label: "ERP Landscape", value: getProfileLabel('erpLandscape', data.companyProfile.erpLandscape) },
      { label: "Industry", value: getProfileLabel('industry', data.companyProfile.industry) },
      { label: "Primary Objective", value: getProfileLabel('primaryObjective', data.companyProfile.primaryObjective || null) },
    ].filter(item => item.value !== 'Not specified');
    
    const colWidth = (pageWidth - margin * 2 - 20) / 2;
    profileItems.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const xPos = margin + 10 + (col * colWidth);
      const itemY = profileY + (row * 10);
      
      doc.setFont("helvetica", "bold");
      doc.text(`${item.label}: `, xPos, itemY);
      const labelWidth = doc.getTextWidth(`${item.label}: `);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(BRAND_COLORS.teal);
      doc.text(item.value, xPos + labelWidth, itemY);
      doc.setTextColor(60, 60, 60);
    });
    
    yPos += 65;
  }

  if (data.recommendedPlatform) {
    const fitResult = data.fitResults?.find((f: any) => f.platformId === data.recommendedPlatform?.id);
    const hasFitDetails = data.usesFitScoring && fitResult;
    const recHeight = hasFitDetails ? 85 : (data.usesFitScoring && data.recommendedPlatform.fitModifier ? 45 : 30);
    
    doc.setFillColor(18, 235, 252);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 3, 3, "S");
    doc.setDrawColor(18, 235, 252);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 3, 3, "S");
    
    doc.setFillColor(18, 235, 252, 0.05);
    doc.roundedRect(margin + 0.5, yPos + 0.5, pageWidth - margin * 2 - 1, recHeight - 1, 3, 3, "F");

    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.teal);
    doc.setFont("helvetica", "bold");
    doc.text(data.usesFitScoring ? "Best Fit Platform" : "Recommended Platform", margin + 8, yPos + 10);
    
    if (data.usesFitScoring) {
      doc.setFillColor(18, 235, 252, 0.2);
      doc.roundedRect(margin + 90, yPos + 4, 30, 8, 2, 2, "F");
      doc.setFontSize(6);
      doc.setTextColor(BRAND_COLORS.teal);
      doc.text("Profile Match", margin + 105, yPos + 9, { align: "center" });
    }

    doc.setFontSize(18);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text(data.recommendedPlatform.name, margin + 8, yPos + 24);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const bestForText = data.recommendedPlatform.bestFor.length > 70 
      ? data.recommendedPlatform.bestFor.substring(0, 67) + '...' 
      : data.recommendedPlatform.bestFor;
    doc.text(bestForText, margin + 8, yPos + 32);

    const displayScore = data.usesFitScoring && data.recommendedPlatform.fitAdjustedScore 
      ? data.recommendedPlatform.fitAdjustedScore 
      : data.recommendedPlatform.calculatedScore;
    doc.setFontSize(28);
    doc.setTextColor(BRAND_COLORS.cyan);
    doc.setFont("helvetica", "bold");
    doc.text(`${displayScore}`, pageWidth - margin - 8, yPos + 22, { align: "right" });
    
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(data.usesFitScoring ? "Fit-Adjusted Score / 100" : "Weighted Score / 100", pageWidth - margin - 8, yPos + 28, { align: "right" });
    
    if (data.usesFitScoring) {
      doc.setFontSize(7);
      doc.text(`Base: ${Math.round(data.recommendedPlatform.calculatedScore * 10)}`, pageWidth - margin - 8, yPos + 35, { align: "right" });
    }
    
    if (data.usesFitScoring && data.recommendedPlatform.fitLevel) {
      const fitColor = data.recommendedPlatform.fitLevel === 'excellent' ? [34, 197, 94] :
                       data.recommendedPlatform.fitLevel === 'good' ? [59, 130, 246] : [245, 158, 11];
      doc.setFillColor(fitColor[0], fitColor[1], fitColor[2], 0.15);
      doc.roundedRect(margin + 8, yPos + 36, 35, 8, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
      doc.setFont("helvetica", "bold");
      const fitLabel = data.recommendedPlatform.fitLevel === 'excellent' ? 'Excellent Fit' : 
                       data.recommendedPlatform.fitLevel === 'good' ? 'Good Fit' : 'Moderate Fit';
      doc.text(fitLabel, margin + 25, yPos + 41, { align: "center" });
      
      const fitMod = data.recommendedPlatform.fitModifier ?? 0;
      if (fitMod !== 0) {
        doc.setFontSize(7);
        doc.setTextColor(fitMod > 0 ? 34 : 245, fitMod > 0 ? 197 : 158, fitMod > 0 ? 94 : 11);
        doc.text(`${fitMod > 0 ? '+' : ''}${fitMod} fit modifier`, margin + 50, yPos + 41);
      }
    }
    
    if (hasFitDetails && fitResult) {
      const baseScoreVal = fitResult.baseScore ?? fitResult.score;
      const modifierVal = fitResult.modifier ?? 0;
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin + 8, yPos + 48, pageWidth - margin - 8, yPos + 48);
      
      doc.setFontSize(8);
      doc.setTextColor(BRAND_COLORS.navy);
      doc.setFont("helvetica", "bold");
      doc.text("Fit Analysis", margin + 8, yPos + 56);
      
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + 8, yPos + 59, 70, 22, 2, 2, "F");
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Base Score:", margin + 12, yPos + 67);
      doc.setTextColor(BRAND_COLORS.navy);
      doc.setFont("helvetica", "bold");
      doc.text(`${baseScoreVal.toFixed(1)}`, margin + 45, yPos + 67);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(modifierVal >= 0 ? 34 : 245, modifierVal >= 0 ? 197 : 158, modifierVal >= 0 ? 94 : 11);
      doc.text("Fit Modifier:", margin + 12, yPos + 74);
      doc.setFont("helvetica", "bold");
      doc.text(`${modifierVal >= 0 ? '+' : ''}${modifierVal.toFixed(1)}`, margin + 45, yPos + 74);
      
      if (fitResult.matchReasons && fitResult.matchReasons.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(34, 197, 94);
        doc.setFont("helvetica", "bold");
        doc.text("Match Reasons:", margin + 85, yPos + 64);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        
        let matchY = yPos + 71;
        fitResult.matchReasons.slice(0, 2).forEach((reason: string) => {
          const shortReason = reason.length > 55 ? reason.substring(0, 52) + '...' : reason;
          doc.text(`• ${shortReason}`, margin + 85, matchY);
          matchY += 6;
        });
      }
    }

    yPos += recHeight + 10;
  }

  // === EVALUATION CONTEXT SECTION (Wizard Analysis) ===
  if (data.industryLabel || data.presetLabel) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 35, 3, 3, "F");
    
    doc.setFillColor(18, 235, 252); // Cyan accent
    doc.rect(margin, yPos, 3, 35, "F");
    
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Evaluation Context", margin + 10, yPos + 10);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    
    let contextY = yPos + 20;
    if (data.industryLabel) {
      doc.setFont("helvetica", "bold");
      doc.text("Industry: ", margin + 10, contextY);
      const labelWidth = doc.getTextWidth("Industry: ");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(BRAND_COLORS.teal);
      doc.text(data.industryLabel, margin + 10 + labelWidth, contextY);
      doc.setTextColor(60, 60, 60);
    }
    
    if (data.presetLabel) {
      const presetX = data.industryLabel ? pageWidth / 2 : margin + 10;
      doc.setFont("helvetica", "bold");
      doc.text("Evaluation Focus: ", presetX, contextY);
      const labelWidth = doc.getTextWidth("Evaluation Focus: ");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(BRAND_COLORS.teal);
      doc.text(data.presetLabel, presetX + labelWidth, contextY);
      doc.setTextColor(60, 60, 60);
    }
    
    yPos += 45;
  }

  // === TOP RECOMMENDATIONS SECTION (from Fit Analysis) ===
  if (data.fitResults && data.fitResults.length > 0 && data.sortedByFit) {
    // Check if we need a new page
    if (yPos > pageHeight - 120) {
      doc.addPage();
      yPos = 35;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Top 4 Recommended Platforms", margin, yPos);
    yPos += 8;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Based on your industry, priorities, and organisation profile", margin, yPos);
    yPos += 10;
    
    // Show top 4 platforms with match reasons
    const top4 = data.sortedByFit.slice(0, 4);
    top4.forEach((platformScore, idx) => {
      const platform = data.platforms.find(p => p.id === platformScore.id);
      const fitResult = data.fitResults?.find(f => f.platformId === platformScore.id);
      if (!platform) return;
      
      const cardHeight = 22;
      const cardY = yPos;
      
      // Card background
      doc.setFillColor(idx === 0 ? 232 : 248, idx === 0 ? 248 : 250, idx === 0 ? 255 : 252);
      doc.roundedRect(margin, cardY, pageWidth - margin * 2, cardHeight, 2, 2, "F");
      
      // Rank circle
      doc.setFillColor(idx === 0 ? 18 : 148, idx === 0 ? 235 : 163, idx === 0 ? 252 : 184);
      doc.circle(margin + 10, cardY + cardHeight / 2, 6, "F");
      doc.setFontSize(10);
      doc.setTextColor(idx === 0 ? BRAND_COLORS.navy : BRAND_COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.text((idx + 1).toString(), margin + 10, cardY + cardHeight / 2 + 3, { align: "center" });
      
      // Platform name and score
      doc.setFontSize(10);
      doc.setTextColor(BRAND_COLORS.navy);
      doc.setFont("helvetica", "bold");
      doc.text(platform.shortName, margin + 22, cardY + 8);
      
      const score = fitResult?.score || platformScore.fitAdjustedScore || platformScore.calculatedScore;
      doc.setFontSize(11);
      doc.setTextColor(BRAND_COLORS.cyan);
      doc.text(`${score}`, pageWidth - margin - 15, cardY + 8, { align: "right" });
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("/ 100", pageWidth - margin - 5, cardY + 8, { align: "right" });
      
      // Best for text
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const bestForText = platform.bestFor.length > 80 ? platform.bestFor.substring(0, 77) + '...' : platform.bestFor;
      doc.text(bestForText, margin + 22, cardY + 16);
      
      // Match reason if available
      if (fitResult?.matchReasons && fitResult.matchReasons.length > 0) {
        const matchReason = fitResult.matchReasons[0];
        const displayReason = matchReason.length > 50 ? matchReason.substring(0, 47) + '...' : matchReason;
        doc.setFontSize(6);
        doc.setTextColor(8, 132, 170);
        doc.text(`✓ ${displayReason}`, margin + 22, cardY + 20);
      }
      
      yPos += cardHeight + 4;
    });
    
    yPos += 5;
  }

  // === EXECUTIVE SUMMARY SECTION ===
  const topThree = data.calculatedScores.slice(0, 3);
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 75, 3, 3, "F");
  
  // Left accent bar
  doc.setFillColor(18, 235, 252); // Cyan
  doc.rect(margin, yPos, 4, 75, "F");
  
  doc.setFontSize(12);
  doc.setTextColor(BRAND_COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", margin + 12, yPos + 12);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  
  const categoryLabel = data.categoryType === 'epm' ? 'Enterprise Performance Management' : 
                        data.categoryType === 'erp' ? 'Enterprise Resource Planning' : 'AI Tools for Finance';
  
  const summaryText = `This independent analysis evaluated ${data.platforms.length} ${categoryLabel} platforms against your organisation's priorities. Based on weighted scoring across ${data.categories.length} capability dimensions, we identified the optimal platform fit for your requirements.`;
  doc.text(summaryText, margin + 12, yPos + 24, { maxWidth: pageWidth - margin * 2 - 24 });
  
  // Key findings bullets
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Key Findings:", margin + 12, yPos + 44);
  doc.setFont("helvetica", "normal");
  
  const keyFindings = [
    `Leading option: ${topThree[0]?.name || 'N/A'} (Score: ${topThree[0]?.calculatedScore || 0}) - ${topThree[0]?.bestFor || ''}`,
    `Alternative: ${topThree[1]?.name || 'N/A'} (Score: ${topThree[1]?.calculatedScore || 0}) - ${topThree[1]?.implementationTime || ''} implementation`,
    topThree[2] ? `Third option: ${topThree[2].name} (Score: ${topThree[2].calculatedScore}) - ${topThree[2].priceRange}` : '',
  ].filter(f => f);
  
  keyFindings.forEach((finding, idx) => {
    doc.setFillColor(8, 132, 170); // Teal bullet
    doc.circle(margin + 15, yPos + 52 + (idx * 8), 1.5, "F");
    doc.text(finding, margin + 20, yPos + 53 + (idx * 8), { maxWidth: pageWidth - margin * 2 - 35 });
  });
  
  yPos += 85;
  
  // === VISUAL SCORE COMPARISON ===
  yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 80 }, () => {
    return drawStandardHeader(doc, categoryTitles[data.categoryType]);
  });
  
  doc.setFontSize(14);
  doc.setTextColor(BRAND_COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Platform Score Comparison", margin, yPos);
  yPos += 12;
  
  // Draw visual score bars for top platforms
  const maxScore = Math.max(...data.calculatedScores.map(p => p.calculatedScore));
  const barMaxWidth = pageWidth - margin * 2 - 70;
  
  data.calculatedScores.slice(0, 5).forEach((platform, idx) => {
    const barY = yPos + (idx * 14);
    const barWidth = (platform.calculatedScore / maxScore) * barMaxWidth;
    const isTop = idx === 0;
    
    // Platform name
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", isTop ? "bold" : "normal");
    doc.text(platform.shortName, margin, barY + 4);
    
    // Background bar
    doc.setFillColor(230, 235, 240);
    doc.roundedRect(margin + 45, barY, barMaxWidth, 8, 2, 2, "F");
    
    // Score bar
    if (isTop) {
      doc.setFillColor(2, 32, 91); // Navy for top
    } else if (idx === 1) {
      doc.setFillColor(8, 132, 170); // Teal for second
    } else {
      doc.setFillColor(18, 235, 252); // Cyan for others
    }
    doc.roundedRect(margin + 45, barY, barWidth, 8, 2, 2, "F");
    
    // Score value
    doc.setFontSize(9);
    if (isTop) {
      doc.setTextColor(2, 32, 91); // Navy
    } else {
      doc.setTextColor(80, 80, 80); // Gray
    }
    doc.setFont("helvetica", "bold");
    doc.text(platform.calculatedScore.toString(), margin + 45 + barMaxWidth + 5, barY + 5);
  });
  
  yPos += (Math.min(data.calculatedScores.length, 5) * 14) + 15;
  
  // === RADAR CHART IMAGE (if available) ===
  if (data.chartImages?.radarChart) {
    const maxChartWidth = pageWidth - margin * 2;
    const maxChartHeight = 100;
    const headerCallback = () => drawStandardHeader(doc, categoryTitles[data.categoryType]);
    
    // Use intelligent image space helper - dynamically calculates required height
    const { y: newY } = ensureSpaceForImage(
      doc, 
      yPos, 
      data.chartImages.radarChart,
      { maxWidth: maxChartWidth, maxHeight: maxChartHeight, titleHeight: 8 },
      headerCallback
    );
    yPos = newY;
    
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.text("Platform Comparison Radar", margin, yPos);
    yPos += 8;
    
    try {
      // Use shared aspect-ratio-preserving image helper with automatic centering
      const { height: chartHeight } = addImagePreserveRatioSync(
        doc,
        data.chartImages.radarChart,
        margin,
        yPos,
        maxChartWidth,
        maxChartHeight,
        'JPEG',
        true // center horizontally
      );
      
      yPos += chartHeight + 15;
    } catch (e) {
      console.warn('Failed to add radar chart to PDF:', e);
    }
  }

  doc.setFontSize(14);
  doc.setTextColor(BRAND_COLORS.navy);
  doc.text("Platform Comparison Overview", margin, yPos);
  yPos += 8;

  const overviewHeaders = ["Platform", "Score", "ROI Potential", "Implementation", "Price Range"];
  const overviewData = data.calculatedScores.map((platform) => [
    platform.name,
    platform.calculatedScore.toString(),
    platform.roiPotential.charAt(0).toUpperCase() + platform.roiPotential.slice(1),
    platform.implementationTime,
    platform.priceRange,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [overviewHeaders],
    body: overviewData,
    theme: "grid",
    headStyles: {
      fillColor: BRAND_COLORS.navy,
      textColor: BRAND_COLORS.cream,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [245, 250, 255],
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Build table data first so we can measure it
  const categoryHeaders = ["Category", ...data.calculatedScores.map((p) => p.shortName)];
  const categoryData = data.categories.map((category) => [
    category.name,
    ...data.calculatedScores.map((platform) => (platform.scores[category.id] || 0).toString()),
  ]);
  
  // Dynamically calculate table height for pagination
  const categoryTableHeight = measureTableHeight(doc, categoryHeaders, categoryData);
  yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: categoryTableHeight + 15 }, () => {
    return drawStandardHeader(doc, categoryTitles[data.categoryType]);
  });

  doc.setFontSize(14);
  doc.setTextColor(BRAND_COLORS.navy);
  doc.text("Category Scores by Platform", margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [categoryHeaders],
    body: categoryData,
    theme: "grid",
    headStyles: {
      fillColor: BRAND_COLORS.teal,
      textColor: BRAND_COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [240, 248, 255],
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Build weight table data first for measurement
  const totalWeight = Object.values(data.categoryWeights).reduce((sum, w) => sum + w, 0);
  const weightHeaders = ["Category", "Weight", "Normalised %", "Impact"];
  const weightData = data.categories.map((category) => {
    const weight = data.categoryWeights[category.id] || 0;
    const percentage = Math.round((weight / totalWeight) * 100);
    const impact = percentage >= 15 ? "High" : percentage >= 8 ? "Medium" : "Low";
    return [category.name, weight.toString(), `${percentage}%`, impact];
  });

  // Dynamically calculate table height for pagination
  const weightTableHeight = measureTableHeight(doc, weightHeaders, weightData);
  yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: weightTableHeight + 15 }, () => {
    return drawStandardHeader(doc, categoryTitles[data.categoryType]);
  });

  doc.setFontSize(14);
  doc.setTextColor(BRAND_COLORS.navy);
  doc.text("Priority Weights Applied", margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Category", "Weight", "Normalised %", "Impact"]],
    body: weightData,
    theme: "grid",
    headStyles: {
      fillColor: BRAND_COLORS.navy,
      textColor: BRAND_COLORS.cream,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    didParseCell: (hookData) => {
      if (hookData.column.index === 3 && hookData.section === 'body') {
        const impact = hookData.cell.raw as string;
        if (impact === 'High') {
          hookData.cell.styles.fillColor = [232, 245, 233];
          hookData.cell.styles.fontStyle = 'bold';
        } else if (impact === 'Medium') {
          hookData.cell.styles.fillColor = [232, 244, 252];
        } else {
          hookData.cell.styles.fillColor = [245, 245, 245];
        }
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: 150,
  });
  
  // === PLATFORM ANALYSIS SECTION ===
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 80 }, () => {
    return drawStandardHeader(doc, categoryTitles[data.categoryType]);
  });
  
  doc.setFontSize(14);
  doc.setTextColor(BRAND_COLORS.navy);
  doc.text("Platform Analysis", margin, yPos);
  yPos += 10;
  
  const topPlatforms = data.calculatedScores.slice(0, 4);
  const CARD_HEIGHT = 60; // Increased card height for more content
  
  topPlatforms.forEach((platform, idx) => {
    yPos = ensureSpaceForCard(doc, yPos, { 
      contentLines: Math.ceil(CARD_HEIGHT / 5),
      lineHeight: 5,
      padding: 0,
      extraSpace: 0
    }, () => {
      return drawStandardHeader(doc, categoryTitles[data.categoryType]);
    });
    
    // Card background
    doc.setFillColor(idx === 0 ? 2 : 248, idx === 0 ? 32 : 250, idx === 0 ? 91 : 252);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 55, 2, 2, "F");
    
    // Accent bar for top platform
    if (idx === 0) {
      doc.setFillColor(18, 235, 252);
      doc.rect(margin, yPos, 4, 55, "F");
    }
    
    // Rank number and platform name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    if (idx === 0) {
      doc.setTextColor(18, 235, 252); // Cyan for top platform
    } else {
      doc.setTextColor(8, 132, 170); // Teal for others
    }
    const rankLabel = `#${idx + 1}`;
    doc.text(rankLabel, margin + 8, yPos + 12);
    const rankWidth = doc.getTextWidth(rankLabel);
    
    // Platform name
    if (idx === 0) {
      doc.setTextColor(18, 235, 252); // Cyan
    } else {
      doc.setTextColor(BRAND_COLORS.navy);
    }
    const displayScore = data.usesFitScoring && platform.fitAdjustedScore ? platform.fitAdjustedScore : platform.calculatedScore;
    doc.text(platform.name, margin + 8 + rankWidth + 4, yPos + 12);
    
    // Score badge on right
    doc.setFillColor(idx === 0 ? 18 : 2, idx === 0 ? 235 : 32, idx === 0 ? 252 : 91);
    doc.roundedRect(pageWidth - margin - 35, yPos + 5, 30, 14, 2, 2, "F");
    doc.setFontSize(11);
    doc.setTextColor(idx === 0 ? 2 : 255, idx === 0 ? 32 : 255, idx === 0 ? 91 : 255);
    doc.text(displayScore.toString(), pageWidth - margin - 20, yPos + 14, { align: "center" });
    
    // Implementation time and price - aligned with rank/name
    const contentLeftMargin = margin + 8;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (idx === 0) {
      doc.setTextColor(254, 255, 243); // Cream
    } else {
      doc.setTextColor(100, 100, 100);
    }
    doc.text(`${platform.implementationTime}  |  ${platform.priceRange}  |  ROI: ${platform.roiPotential.charAt(0).toUpperCase() + platform.roiPotential.slice(1)}`, contentLeftMargin, yPos + 22);
    
    // Strengths - single line with truncation if needed
    const labelWidth = 28;
    const contentStartX = contentLeftMargin + labelWidth;
    const maxContentWidth = pageWidth - margin * 2 - labelWidth - 12;
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    if (idx === 0) {
      doc.setTextColor(18, 235, 252); // Cyan
    } else {
      doc.setTextColor(34, 139, 34); // Green
    }
    doc.text("Strengths:", contentLeftMargin, yPos + 32);
    doc.setFont("helvetica", "normal");
    if (idx === 0) {
      doc.setTextColor(254, 255, 243); // Cream
    } else {
      doc.setTextColor(60, 60, 60);
    }
    const strengthsText = platform.strengths.slice(0, 2).join('; ');
    const strengthLines = doc.splitTextToSize(strengthsText, maxContentWidth);
    doc.text(strengthLines[0], contentStartX, yPos + 32);
    if (strengthLines[1]) {
      doc.text(strengthLines[1], contentStartX, yPos + 36);
    }
    
    // Considerations - single line with truncation if needed
    doc.setFont("helvetica", "bold");
    if (idx === 0) {
      doc.setTextColor(255, 193, 7); // Amber
    } else {
      doc.setTextColor(200, 150, 50);
    }
    doc.text("Considerations:", contentLeftMargin, yPos + 44);
    doc.setFont("helvetica", "normal");
    if (idx === 0) {
      doc.setTextColor(254, 255, 243); // Cream
    } else {
      doc.setTextColor(60, 60, 60);
    }
    const consText = platform.limitations.slice(0, 2).join('; ');
    const consLines = doc.splitTextToSize(consText, maxContentWidth);
    doc.text(consLines[0], contentStartX, yPos + 44);
    if (consLines[1]) {
      doc.text(consLines[1], contentStartX, yPos + 48);
    }
    
    yPos += 60;
  });

  // === 2025 MARKET ANALYSIS SECTION (EPM only) ===
  if (data.categoryType === 'epm') {
    doc.addPage();
    yPos = margin;
    
    // Add header with logo
    try {
      const logoImg = new Image();
      logoImg.src = logoBlue;
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });
      doc.addImage(logoImg, "PNG", margin, 12, 35, 10);
    } catch (e) {
      console.warn("Failed to load blue logo for PDF export:", e);
      doc.setFontSize(16);
      doc.setTextColor(BRAND_COLORS.navy);
      doc.text("Constancia", margin, 18);
    }
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("2025 Market Analysis", pageWidth - margin, 18, { align: "right" });
    
    yPos = 35;
    
    // Section title with navy background
    doc.setFillColor(2, 32, 91);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, "F");
    
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLORS.cyan);
    doc.text("2025 Gartner Magic Quadrant Analysis", margin + 5, yPos + 13);
    
    yPos += 30;
    
    // Key theme callout
    doc.setFillColor(18, 235, 252); // Cyan
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 18, 3, 3, "F");
    
    doc.setFontSize(10);
    doc.setTextColor(2, 32, 91);
    doc.setFont("helvetica", "bold");
    doc.text("2025 Key Theme: ", margin + 5, yPos + 12);
    const themeWidth = doc.getTextWidth("2025 Key Theme: ");
    doc.setFont("helvetica", "normal");
    doc.text(GARTNER_MQ_2025.keyTheme, margin + 5 + themeWidth, yPos + 12);
    
    yPos += 28;
    
    // Gartner Leaders Table
    doc.setFontSize(12);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Gartner Magic Quadrant 2025 Leaders", margin, yPos);
    yPos += 8;
    
    const leaderData = GARTNER_MQ_2025.leaders.map(leader => [
      leader.name,
      `${leader.years} ${leader.years === 1 ? 'year' : 'consecutive years'}`,
      leader.highlight
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Vendor", "Leader Status", "Key Highlights"]],
      body: leaderData,
      theme: "grid",
      headStyles: {
        fillColor: BRAND_COLORS.navy,
        textColor: BRAND_COLORS.cream,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255],
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Other Notable Vendors
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.teal);
    doc.setFont("helvetica", "bold");
    doc.text("Other Notable Vendors", margin, yPos);
    yPos += 8;
    
    const otherVendorData = [
      ...GARTNER_MQ_2025.included.map(v => [v.name, "Gartner MQ Included", v.note]),
      ...GARTNER_MQ_2025.otherNotable.map(v => [v.name, "Industry Recognition", v.note])
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [["Vendor", "Recognition", "Notes"]],
      body: otherVendorData,
      theme: "grid",
      headStyles: {
        fillColor: BRAND_COLORS.teal,
        textColor: BRAND_COLORS.white,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // 2025 Market Trends
    yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 80 }, () => {
      return drawStandardHeader(doc, categoryTitles[data.categoryType]);
    });
    
    doc.setFontSize(12);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text("2025 EPM Market Trends", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    
    GARTNER_MQ_2025.marketTrends.forEach((trend, idx) => {
      yPos = ensureSpaceForText(doc, yPos, trend, { fontSize: 10 }, () => {
        return drawStandardHeader(doc, categoryTitles[data.categoryType]);
      });
      const [title, desc] = trend.split(': ');
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${title}: `, margin, yPos);
      const titleWidth = doc.getTextWidth(`${idx + 1}. ${title}: `);
      doc.setFont("helvetica", "normal");
      doc.text(desc, margin + titleWidth, yPos, { maxWidth: pageWidth - margin * 2 - titleWidth });
      yPos += 10;
    });
    
    yPos += 10;
    
    // AI Capabilities by Vendor
    yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 60 }, () => {
      return drawStandardHeader(doc, categoryTitles[data.categoryType]);
    });
    
    doc.setFontSize(12);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text("AI Capabilities by Vendor", margin, yPos);
    yPos += 8;
    
    const aiCapabilityData = data.calculatedScores.slice(0, 6).map(platform => {
      const capabilities = VENDOR_AI_CAPABILITIES[platform.id];
      if (capabilities) {
        return [
          platform.name,
          capabilities.aiMaturity,
          capabilities.aiFeatures.slice(0, 3).join(", ")
        ];
      }
      return [platform.name, "N/A", "Contact vendor for AI roadmap"];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [["Platform", "AI Maturity", "Key AI Features"]],
      body: aiCapabilityData,
      theme: "grid",
      headStyles: {
        fillColor: BRAND_COLORS.navy,
        textColor: BRAND_COLORS.cream,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' },
      },
      alternateRowStyles: {
        fillColor: [245, 250, 255],
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 1 && hookData.section === 'body') {
          const maturity = hookData.cell.raw as string;
          if (maturity === 'Advanced') {
            hookData.cell.styles.textColor = [34, 139, 34];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (maturity === 'Moderate') {
            hookData.cell.styles.textColor = [0, 100, 150];
          }
        }
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Source note
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "italic");
    doc.text("Source: Vendor placements referenced from publicly available Gartner announcements and vendor press releases.", margin, yPos);
  }

  // Add Scoring Methodology Section for AI
  if (data.categoryType === 'ai' && data.usesFitScoring) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 100 }, () => {
      return drawStandardHeader(doc, categoryTitles[data.categoryType]);
    });
    
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.text("Scoring Methodology", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    
    const methodologyText = [
      "• Base scores are calculated using weighted category scores across 15 Key Drivers for AI tool selection",
      "• Contextual modifiers are applied based on your company profile:",
      "  - ERP Integration: +20 (native), +12 (connector), +8 (partnership), 0 (custom required)",
      "  - Technology Stack Alignment: ±15 points based on ecosystem compatibility",
      "  - Company Size: ±10 points based on scale fit",
      "  - Industry Focus: ±8 points based on vertical expertise",
      "  - Finance Specificity: +10 points for purpose-built finance tools",
      "  - Deployment Ease: +8 points for plug-and-play solutions",
    ];
    
    methodologyText.forEach((line) => {
      yPos = ensureSpaceForText(doc, yPos, line, {}, () => {
        return drawStandardHeader(doc, categoryTitles[data.categoryType]);
      });
      doc.text(line, margin, yPos, { maxWidth: pageWidth - margin * 2 });
      yPos += 6;
    });
    
    yPos += 5;
    
    // Add platform breakdown if we have modifiers
    const platformsWithModifiers = data.calculatedScores.filter(p => p.aiModifiers && p.aiModifiers.length > 0);
    if (platformsWithModifiers.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(BRAND_COLORS.navy);
      doc.text("Platform Scoring Breakdown", margin, yPos);
      yPos += 8;
      
      const breakdownData = platformsWithModifiers.map(platform => {
        const baseScore = (platform.calculatedScore * 10).toFixed(0);
        const adjustedScore = platform.fitAdjustedScore ? (platform.fitAdjustedScore * 10).toFixed(0) : baseScore;
        const modifiers = platform.aiModifiers?.map(m => `${m.value > 0 ? '+' : ''}${m.value} ${m.label}`).join(', ') || 'N/A';
        return [platform.name, baseScore, modifiers, adjustedScore];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [["Platform", "Base", "Modifiers Applied", "Adjusted"]],
        body: breakdownData,
        theme: "grid",
        headStyles: {
          fillColor: BRAND_COLORS.teal,
          textColor: BRAND_COLORS.white,
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [50, 50, 50],
        },
        columnStyles: {
          2: { cellWidth: 80 },
        },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Add Scoring Methodology Section for EPM/ERP
  if ((data.categoryType === 'epm' || data.categoryType === 'erp') && data.usesFitScoring) {
    yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 15;
    
    yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 120 }, () => {
      return drawStandardHeader(doc, categoryTitles[data.categoryType]);
    });
    
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Scoring Methodology", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    
    const epmErpMethodology = [
      `• Base scores are calculated using weighted category scores across ${data.categories?.length || 11} evaluation dimensions`,
      "• Category weights can be adjusted to reflect your organisation's specific priorities",
      "",
      "Fit Modifiers:",
      "• Scores are adjusted based on how well each platform's target market aligns with your company profile",
      "• Fit adjustments consider: revenue range, organisation size, ERP landscape, and industry focus",
      "",
      "Price Sensitivity:",
      "• Smaller companies receive adjustments for enterprise-priced platforms to ensure practical recommendations",
      "• TCO Multiplier formula: MAX(0.6, MIN(1.0, 1.1 - PriceTier × 0.1))",
      "",
      "Fit Level Classifications:",
      "• Excellent Fit (+0.8 to +1.5): Platform's sweet spot directly matches your profile",
      "• Good Fit (+0.3 to +0.7): Strong alignment with minor considerations",
      "• Moderate Fit (-0.5 to +0.2): Workable fit, may require compromises",
    ];
    
    epmErpMethodology.forEach((line) => {
      if (line === "") {
        yPos += 3;
        return;
      }
      yPos = ensureSpaceForText(doc, yPos, line, {}, () => {
        return drawStandardHeader(doc, categoryTitles[data.categoryType]);
      });
      
      if (line.startsWith("Fit Modifiers:") || line.startsWith("Price Sensitivity:") || line.startsWith("Fit Level")) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(BRAND_COLORS.navy);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
      }
      
      doc.text(line, margin, yPos, { maxWidth: pageWidth - margin * 2 });
      yPos += 6;
    });
    
    yPos += 5;
    
    // Add fit results breakdown if available
    if (data.fitResults && data.fitResults.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(BRAND_COLORS.navy);
      doc.setFont("helvetica", "bold");
      doc.text("Platform Fit Analysis", margin, yPos);
      yPos += 8;
      
      const fitData = data.fitResults.slice(0, 6).map((fit: any) => {
        const platform = data.platforms.find(p => p.id === fit.platformId);
        const fitLevel = fit.modifier >= 0.8 ? 'Excellent' : fit.modifier >= 0.3 ? 'Good' : 'Moderate';
        return [
          platform?.shortName || fit.platformId,
          fit.baseScore.toFixed(1),
          `${fit.modifier >= 0 ? '+' : ''}${fit.modifier.toFixed(1)}`,
          fitLevel,
          fit.score.toFixed(1)
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [["Platform", "Base", "Modifier", "Fit Level", "Final"]],
        body: fitData,
        theme: "grid",
        headStyles: {
          fillColor: BRAND_COLORS.teal,
          textColor: BRAND_COLORS.white,
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [50, 50, 50],
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (hookData) => {
          if (hookData.column.index === 3 && hookData.section === 'body') {
            const level = hookData.cell.raw as string;
            if (level === 'Excellent') {
              hookData.cell.styles.textColor = [34, 197, 94];
              hookData.cell.styles.fontStyle = 'bold';
            } else if (level === 'Good') {
              hookData.cell.styles.textColor = [59, 130, 246];
            } else {
              hookData.cell.styles.textColor = [245, 158, 11];
            }
          }
          if (hookData.column.index === 2 && hookData.section === 'body') {
            const val = parseFloat(hookData.cell.raw as string);
            if (val > 0) {
              hookData.cell.styles.textColor = [34, 197, 94];
            } else if (val < 0) {
              hookData.cell.styles.textColor = [245, 158, 11];
            }
          }
        },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // === NEXT STEPS SECTION ===
  yPos = (doc as any).lastAutoTable.finalY + 20;
  
  yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 95 }, () => {
    return drawStandardHeader(doc, categoryTitles[data.categoryType]);
  });
  
  // Next Steps box with navy header
  doc.setFillColor(2, 32, 91); // Navy
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 18, 3, 3, "F");
  
  doc.setFontSize(12);
  doc.setTextColor(BRAND_COLORS.cyan);
  doc.setFont("helvetica", "bold");
  doc.text("Recommended Next Steps", margin + 10, yPos + 12);
  
  yPos += 22;
  
  // Next steps content box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 70, 3, 3, "F");
  
  const nextSteps = [
    { step: "1", title: "Validate Requirements", desc: "Review this analysis with your finance leadership team to confirm priorities align with strategic objectives." },
    { step: "2", title: "Arrange Vendor Demonstrations", desc: "Request tailored demonstrations from shortlisted vendors, focusing on your specific use cases and data scenarios." },
    { step: "3", title: "Conduct Reference Checks", desc: "Speak with organisations of similar size and industry who have implemented the platforms you are considering." },
    { step: "4", title: "Engage Independent Advisory", desc: "Consider engaging Constancia for independent guidance on selection, business case development, and implementation planning." },
  ];
  
  let stepY = yPos + 12;
  const stepContentLeft = margin + 22;
  const stepContentWidth = pageWidth - margin * 2 - 30;
  
  nextSteps.forEach((ns, idx) => {
    // Step number - simple text, no badge for cleaner look
    doc.setFontSize(9);
    doc.setTextColor(8, 132, 170); // Teal
    doc.setFont("helvetica", "bold");
    doc.text(ns.step + ".", margin + 8, stepY);
    
    // Step title (bold) on same baseline
    doc.setTextColor(BRAND_COLORS.navy);
    doc.text(ns.title, stepContentLeft, stepY);
    const titleWidth = doc.getTextWidth(ns.title);
    
    // Description (normal) - inline after title with dash
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const descWithDash = " - " + ns.desc;
    const remainingWidth = stepContentWidth - titleWidth;
    const descLines = doc.splitTextToSize(descWithDash, remainingWidth);
    
    // First line continues after title
    if (descLines.length > 0) {
      doc.text(descLines[0], stepContentLeft + titleWidth, stepY);
    }
    // Subsequent lines align with title start
    for (let i = 1; i < descLines.length; i++) {
      doc.text(descLines[i].trim(), stepContentLeft, stepY + (i * 4));
    }
    
    stepY += 16;
  });
  
  yPos += 80;
  
  // === CONTACT CTA BOX ===
  yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 35 }, () => {
    return drawStandardHeader(doc, categoryTitles[data.categoryType]);
  });
  
  doc.setFillColor(18, 235, 252); // Cyan
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 3, 3, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(2, 32, 91);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to take the next step?", margin + 10, yPos + 11);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Contact Constancia for a consultation: ${CONTACT_INFO.email}`, margin + 10, yPos + 20);
  
  yPos += 40;

  // Add Disclaimer Section
  yPos = ensureSpaceForSection(doc, yPos, { followingContentHeight: 50 }, () => {
    return drawStandardHeader(doc, categoryTitles[data.categoryType]);
  });
  
  // Disclaimer box background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 55, 3, 3, "F");
  
  // Left accent bar
  doc.setFillColor(8, 132, 170); // Teal
  doc.rect(margin, yPos, 3, 55, "F");
  
  // Disclaimer title
  doc.setFontSize(10);
  doc.setTextColor(BRAND_COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Disclaimer", margin + 10, yPos + 12);
  
  // Disclaimer text
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  const disclaimerText1 = "This document has been prepared using publicly available information and is intended for general informational purposes only. It does not constitute professional advice, a formal recommendation, or an offer of services. The content should not be relied upon as a substitute for tailored guidance specific to your organisation.";
  const disclaimerText2 = `To discuss how Constancia can support your specific requirements, please contact us at ${CONTACT_INFO.email} or visit ${CONTACT_INFO.website} to arrange a consultation.`;
  
  doc.text(disclaimerText1, margin + 10, yPos + 22, { maxWidth: pageWidth - margin * 2 - 20 });
  doc.text(disclaimerText2, margin + 10, yPos + 42, { maxWidth: pageWidth - margin * 2 - 20 });

  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(BRAND_COLORS.teal);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    // Footer text with full contact
    doc.setFontSize(7);
    doc.setTextColor(BRAND_COLORS.teal);
    doc.text(`Constancia  |  ${CONTACT_INFO.email}  |  ${CONTACT_INFO.website}  |  London, UK`, margin, pageHeight - 10);
    doc.text(`Page ${i - 1} of ${pageCount - 1}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  // Save PDF with mobile-compatible error handling
  const fileName = `Constancia-${data.categoryType.toUpperCase()}-Comparison-${new Date().toISOString().split("T")[0]}.pdf`;
  try {
    // Detect mobile/iOS for different download handling
    // iPadOS 13+ reports as MacIntel but has touch support, so check maxTouchPoints
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      // iOS Safari doesn't support download attribute - open in new tab
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow) {
        // Popup blocked - fall back to location change
        window.location.href = blobUrl;
      }
      toast?.({
        title: "PDF Generated",
        description: "Your PDF has opened in a new tab. Use the share button to save it.",
      });
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else if (isMobile) {
      // Android and other mobile - use blob with explicit link
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      toast?.({
        title: "PDF Downloaded",
        description: "Check your downloads folder for the PDF.",
      });
    } else {
      // Desktop - standard save
      doc.save(fileName);
      toast?.({
        title: "PDF Downloaded",
        description: "Your comparison report has been saved.",
      });
    }
  } catch (error) {
    console.error("PDF Export error:", error);
    toast?.({
      title: "PDF Export Failed",
      description: "An error occurred while generating the PDF. Please try again.",
      variant: "destructive",
    });
    throw error; // Re-throw so caller knows export failed
  }
}

export async function exportToExcel(data: ExportData, toast?: ToastFunction): Promise<void> {
  dlog("[ExcelExport] Starting Excel export...");
  
  const validation = validateExportData(data);
  if (!validation.valid) {
    console.error("Excel Export validation failed:", validation.error);
    toast?.({
      title: "Export Failed",
      description: validation.error || "Invalid export data",
      variant: "destructive",
    });
    return;
  }

  dlog("[ExcelExport] Loading ExcelJS...");
  
  // Dynamic import of ExcelJS - try multiple import patterns for compatibility
  let ExcelJS: any;
  try {
    // Try the main exceljs package first (works with most bundlers)
    const module = await import("exceljs");
    // Handle various export patterns: default export, named Workbook, or the module itself
    ExcelJS = module.default || module;
    
    // If we got the module but Workbook is nested, extract it
    if (!ExcelJS.Workbook && module.Workbook) {
      ExcelJS = { Workbook: module.Workbook };
    }
    
    dlog("[ExcelExport] ExcelJS loaded, checking Workbook...");
    
    // Verify Workbook class exists
    if (!ExcelJS.Workbook) {
      // Last resort: try the browser bundle
      dlog("[ExcelExport] Workbook not found, trying browser bundle...");
      const browserModule = await import("exceljs/dist/exceljs.min.js");
      ExcelJS = browserModule.default || browserModule;
    }
    
    if (!ExcelJS.Workbook) {
      throw new Error("ExcelJS.Workbook class not found in any loaded module");
    }
    
    dlog("[ExcelExport] ExcelJS ready with Workbook class");
  } catch (error) {
    console.error("[ExcelExport] Failed to load ExcelJS:", error);
    toast?.({
      title: "Export Failed",
      description: "Failed to load Excel library. Please try again.",
      variant: "destructive",
    });
    return;
  }

  dlog("[ExcelExport] Creating workbook...");
  
  let workbook: Workbook;
  try {
    workbook = new ExcelJS.Workbook();
    dlog("[ExcelExport] Workbook created successfully");
  } catch (error) {
    console.error("[ExcelExport] Failed to create workbook:", error);
    toast?.({
      title: "Export Failed",
      description: "Failed to initialize Excel export. Please try again.",
      variant: "destructive",
    });
    return;
  }
  workbook.creator = "Constancia";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Helper to apply header styling
  const applyHeaderStyle = (cell: Cell, isBrand = false) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isBrand ? EXCEL_COLORS.navy : EXCEL_COLORS.teal },
    };
    cell.font = {
      bold: true,
      color: { argb: isBrand ? EXCEL_COLORS.cyan : EXCEL_COLORS.white },
      size: isBrand ? 14 : 11,
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: EXCEL_COLORS.navy } },
      bottom: { style: "thin", color: { argb: EXCEL_COLORS.navy } },
      left: { style: "thin", color: { argb: EXCEL_COLORS.navy } },
      right: { style: "thin", color: { argb: EXCEL_COLORS.navy } },
    };
  };

  // Helper to apply data cell styling
  const applyDataStyle = (cell: Cell, isAlt = false) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isAlt ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white },
    };
    cell.font = { size: 10, color: { argb: EXCEL_COLORS.darkGray } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "CCCCCC" } },
      bottom: { style: "thin", color: { argb: "CCCCCC" } },
      left: { style: "thin", color: { argb: "CCCCCC" } },
      right: { style: "thin", color: { argb: "CCCCCC" } },
    };
  };

  // Helper to get score color
  const getScoreColor = (score: number): string => {
    if (score >= 8) return EXCEL_COLORS.lightGreen;
    if (score >= 6) return EXCEL_COLORS.lightBlue;
    if (score >= 4) return EXCEL_COLORS.lightYellow;
    return EXCEL_COLORS.lightRed;
  };

  // ===== 1. COVER SHEET =====
  const coverSheet = workbook.addWorksheet("Cover", {
    properties: { tabColor: { argb: EXCEL_COLORS.navy } },
  });
  coverSheet.columns = [{ width: 80 }];

  // Add padding rows at top
  for (let i = 1; i <= 4; i++) {
    coverSheet.addRow([""]);
  }

  // Brand header
  const brandRow = coverSheet.addRow(["Constancia"]);
  brandRow.height = 40;
  brandRow.getCell(1).font = { size: 36, bold: true, color: { argb: EXCEL_COLORS.navy } };
  brandRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  coverSheet.addRow([""]);

  const taglineRow = coverSheet.addRow(["FinanceTransformed, DesignedforChange, Driven by Technology."]);
  taglineRow.getCell(1).font = { size: 12, italic: true, color: { argb: EXCEL_COLORS.teal } };
  taglineRow.getCell(1).alignment = { horizontal: "center" };

  // Add spacing
  for (let i = 0; i < 3; i++) coverSheet.addRow([""]);

  // Report title with navy background
  const titleRow = coverSheet.addRow(["TECHNOLOGY COMPARISON REPORT"]);
  titleRow.height = 35;
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  titleRow.getCell(1).font = { size: 18, bold: true, color: { argb: EXCEL_COLORS.cyan } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  coverSheet.addRow([""]);

  const subtitleRow = coverSheet.addRow([categoryTitles[data.categoryType]]);
  subtitleRow.getCell(1).font = { size: 14, bold: true, color: { argb: EXCEL_COLORS.navy } };
  subtitleRow.getCell(1).alignment = { horizontal: "center" };

  coverSheet.addRow([""]);

  const dateRow = coverSheet.addRow([`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`]);
  dateRow.getCell(1).font = { size: 11, color: { argb: EXCEL_COLORS.teal } };
  dateRow.getCell(1).alignment = { horizontal: "center" };

  // Add spacing
  for (let i = 0; i < 4; i++) coverSheet.addRow([""]);

  // About section
  const aboutHeaderRow = coverSheet.addRow(["About Constancia"]);
  aboutHeaderRow.getCell(1).font = { size: 12, bold: true, color: { argb: EXCEL_COLORS.navy } };

  coverSheet.addRow([""]);

  const aboutText = "Constancia is an independent EPM & ERP advisory firm helping finance leaders modernise through technology, process optimisation, and AI-driven insights. We provide vendor-agnostic guidance to help organisations select and implement the right enterprise solutions.";
  const aboutRow = coverSheet.addRow([aboutText]);
  aboutRow.getCell(1).font = { size: 10, color: { argb: EXCEL_COLORS.darkGray } };
  aboutRow.getCell(1).alignment = { wrapText: true };

  // Add spacing
  for (let i = 0; i < 2; i++) coverSheet.addRow([""]);

  // Contact info
  coverSheet.addRow([CONTACT_INFO.address]).getCell(1).font = { size: 10, color: { argb: EXCEL_COLORS.darkGray } };
  coverSheet.addRow([`${CONTACT_INFO.email}  |  ${CONTACT_INFO.website}`]).getCell(1).font = { size: 10, color: { argb: EXCEL_COLORS.teal } };
  coverSheet.addRow([CONTACT_INFO.linkedin]).getCell(1).font = { size: 10, color: { argb: EXCEL_COLORS.darkGray } };

  // Add spacing
  for (let i = 0; i < 3; i++) coverSheet.addRow([""]);

  // Disclaimer
  const disclaimerHeaderRow = coverSheet.addRow(["Disclaimer"]);
  disclaimerHeaderRow.getCell(1).font = { size: 10, bold: true, color: { argb: EXCEL_COLORS.navy } };

  const disclaimerText = "This document has been prepared using publicly available information and is intended for general informational purposes only. It does not constitute professional advice, a formal recommendation, or an offer of services. The content should not be relied upon as a substitute for tailored guidance specific to your organisation. To discuss how Constancia can support your specific requirements, please contact us.";
  const disclaimerRow = coverSheet.addRow([disclaimerText]);
  disclaimerRow.getCell(1).font = { size: 9, color: { argb: "666666" } };
  disclaimerRow.getCell(1).alignment = { wrapText: true };

  // Add spacing and copyright
  for (let i = 0; i < 2; i++) coverSheet.addRow([""]);
  const copyrightRow = coverSheet.addRow(["© 2025 Constancia GROUP LIMITED. All rights reserved."]);
  copyrightRow.getCell(1).font = { size: 9, color: { argb: "999999" } };
  copyrightRow.getCell(1).alignment = { horizontal: "center" };

  // ===== 1B. GETTING STARTED GUIDE =====
  const guideSheet = workbook.addWorksheet("Getting Started", {
    properties: { tabColor: { argb: EXCEL_COLORS.cyan } },
  });
  guideSheet.columns = [{ width: 8 }, { width: 35 }, { width: 80 }];

  const guideHeaderRow = guideSheet.addRow(["", "HOW TO USE THIS WORKBOOK", ""]);
  guideSheet.mergeCells(guideHeaderRow.number, 2, guideHeaderRow.number, 3);
  guideHeaderRow.getCell(2).font = { size: 20, bold: true, color: { argb: EXCEL_COLORS.navy } };
  guideHeaderRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.cyan } };
  guideHeaderRow.height = 40;

  guideSheet.addRow([""]);

  const guideIntro = [
    "This comprehensive workbook guides you through evaluating EPM/ERP platforms and building a robust business case.",
    "Follow the steps below in order to complete your analysis. Each worksheet builds on the previous one.",
    "",
    "COLOUR KEY:",
    "  YELLOW cells = Input required (enter your values here)",
    "  BLUE cells = Calculated automatically (formulas)",
    "  GREEN cells = Results and outputs",
    "  GREY cells = Reference/guidance information",
  ];

  guideIntro.forEach((text) => {
    const row = guideSheet.addRow(["", text, ""]);
    guideSheet.mergeCells(row.number, 2, row.number, 3);
    row.getCell(2).font = { size: 10, color: { argb: text.startsWith("  ") ? EXCEL_COLORS.teal : EXCEL_COLORS.darkGray } };
    row.getCell(2).alignment = { wrapText: true };
  });

  guideSheet.addRow([""]);

  const guideSteps = [
    { step: "Step 1", sheet: "Business Profile", description: "Enter your organisation details, current challenges, and strategic priorities. This information helps contextualise the analysis and ensures the business case reflects your specific situation." },
    { step: "Step 2", sheet: "Cost Drivers", description: "Work through each cost category to build your investment estimate. The worksheet provides typical ranges and guidance for each line item. Be thorough - hidden costs are a major cause of budget overruns." },
    { step: "Step 3", sheet: "Benefit Drivers", description: "Quantify the expected benefits from your EPM/ERP implementation. Use the calculation helpers to convert time savings and efficiency gains into financial values. Be conservative - understating benefits strengthens your business case." },
    { step: "Step 4", sheet: "ROI Calculator", description: "Review the automatically calculated ROI, NPV, and payback period. Adjust assumptions and test sensitivity scenarios. The formulas pull from your Cost Drivers and Benefit Drivers inputs." },
    { step: "Step 5", sheet: "TCO Analysis", description: "Review the 5-year Total Cost of Ownership breakdown. Compare your TCO per user against industry benchmarks. Use this for vendor negotiations and budget planning." },
    { step: "Step 6", sheet: "Comparison Scores", description: "Review the platform comparison scores based on Constancia's independent analysis. Adjust priority weights to reflect your organisation's specific requirements." },
    { step: "Step 7", sheet: "Implementation Roadmap", description: "Use the template implementation timeline to plan your project. Adjust phases and durations based on your organisation's complexity and resource availability." },
    { step: "Step 8", sheet: "Risk Assessment", description: "Review common implementation risks and add your own. Score likelihood and impact to prioritise mitigation efforts. Assign owners to ensure accountability." },
  ];

  const guideStepsHeader = guideSheet.addRow(["", "Step", "What to Do"]);
  guideStepsHeader.getCell(2).font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
  guideStepsHeader.getCell(3).font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
  guideStepsHeader.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  guideStepsHeader.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };

  guideSteps.forEach((item, idx) => {
    const row = guideSheet.addRow(["", `${item.step}: ${item.sheet}`, item.description]);
    row.getCell(2).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    row.getCell(3).font = { size: 10 };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    row.getCell(3).alignment = { wrapText: true };
    row.height = 45;
  });

  guideSheet.addRow([""]);
  guideSheet.addRow([""]);

  const tipsHeader = guideSheet.addRow(["", "TIPS FOR SUCCESS", ""]);
  guideSheet.mergeCells(tipsHeader.number, 2, tipsHeader.number, 3);
  tipsHeader.getCell(2).font = { bold: true, size: 14, color: { argb: EXCEL_COLORS.navy } };

  guideSheet.addRow([""]);

  const tips = [
    ["Be Conservative", "Understate benefits and overstate costs. A business case that delivers more than promised builds credibility."],
    ["Involve Stakeholders", "Get input from Finance, IT, and business users. Different perspectives improve accuracy and build buy-in."],
    ["Document Assumptions", "Record the basis for your estimates. You'll need to defend them in business case reviews."],
    ["Use Ranges", "Where uncertain, calculate low/medium/high scenarios. Present the medium case with sensitivity analysis."],
    ["Include All Costs", "Don't forget internal time, opportunity cost, and ongoing support. These often exceed external costs."],
    ["Benchmark Externally", "Compare your estimates against industry data. Gartner, Forrester, and vendor case studies provide reference points."],
    ["Plan for Change", "Include change management costs. Technology implementations fail due to people issues, not technology."],
    ["Think Long-Term", "Consider 5-year TCO, not just Year 1. Ongoing costs often exceed implementation costs over the investment period."],
  ];

  tips.forEach(([tip, detail], idx) => {
    const row = guideSheet.addRow(["", tip, detail]);
    row.getCell(2).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.teal } };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightGreen : EXCEL_COLORS.white } };
    row.getCell(3).font = { size: 10 };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightGreen : EXCEL_COLORS.white } };
    row.getCell(3).alignment = { wrapText: true };
    row.height = 30;
  });

  // ===== 1C. BUSINESS PROFILE INPUT =====
  const profileSheet = workbook.addWorksheet("Business Profile", {
    properties: { tabColor: { argb: EXCEL_COLORS.lightYellow.replace('#', '') } },
  });
  profileSheet.columns = [{ width: 35 }, { width: 45 }, { width: 55 }];

  const profileHeaderRow = profileSheet.addRow(["BUSINESS PROFILE", "", ""]);
  profileSheet.mergeCells(profileHeaderRow.number, 1, profileHeaderRow.number, 3);
  profileHeaderRow.getCell(1).font = { size: 18, bold: true, color: { argb: EXCEL_COLORS.white } };
  profileHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  profileHeaderRow.height = 35;

  profileSheet.addRow([""]);

  const profileIntro = profileSheet.addRow(["Complete this section to document your organisation's context. This information helps tailor the business case to your specific situation.", "", ""]);
  profileSheet.mergeCells(profileIntro.number, 1, profileIntro.number, 3);
  profileIntro.getCell(1).font = { size: 10, italic: true, color: { argb: EXCEL_COLORS.teal } };

  profileSheet.addRow([""]);

  // Organisation Details Section
  const orgHeader = profileSheet.addRow(["ORGANISATION DETAILS", "Your Input", "Guidance"]);
  orgHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  const orgDetails = [
    ["Organisation Name", "", "Your company or business unit name"],
    ["Industry Sector", "", "e.g., Financial Services, Manufacturing, Retail, Healthcare"],
    ["Annual Revenue (£)", "", "Group or business unit revenue"],
    ["Number of Employees", "", "Total headcount or FTEs"],
    ["Number of Legal Entities", "", "Subsidiaries, divisions requiring consolidation"],
    ["Geographic Presence", "", "Countries/regions of operation"],
    ["Financial Year End", "", "e.g., December, March, June"],
    ["Regulatory Environment", "", "e.g., FCA regulated, SOX compliant, Listed company"],
  ];

  orgDetails.forEach(([field, input, guidance], idx) => {
    const row = profileSheet.addRow([field, input, guidance]);
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
    row.getCell(3).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.mediumGray } };
    row.getCell(3).alignment = { wrapText: true };
  });

  profileSheet.addRow([""]);

  // Current State Section
  const currentHeader = profileSheet.addRow(["CURRENT STATE ASSESSMENT", "Your Input", "Guidance"]);
  currentHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
  });

  const currentState = [
    ["Current ERP System(s)", "", "e.g., SAP S/4HANA, Oracle EBS, Microsoft 365, NetSuite"],
    ["Current EPM/FP&A Tools", "", "e.g., Excel, Hyperion, Adaptive, Board, Anaplan"],
    ["Current Close Timeline (Days)", "", "Working days from period end to results"],
    ["Current Forecast Cycle (Days)", "", "Time to complete a full forecast refresh"],
    ["Finance Team Size (FTEs)", "", "Staff involved in planning, reporting, close"],
    ["Time Spent on Data Gathering (%)", "", "% of finance time on data vs. analysis"],
    ["Manual Spreadsheet Reliance", "", "High/Medium/Low - extent of Excel dependency"],
    ["Data Quality Confidence", "", "High/Medium/Low - trust in financial data"],
  ];

  currentState.forEach(([field, input, guidance], idx) => {
    const row = profileSheet.addRow([field, input, guidance]);
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
    row.getCell(3).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.mediumGray } };
    row.getCell(3).alignment = { wrapText: true };
  });

  profileSheet.addRow([""]);

  // Strategic Drivers Section
  const driversHeader = profileSheet.addRow(["STRATEGIC DRIVERS", "Priority (1-5)", "Guidance"]);
  driversHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  const stratDrivers = [
    ["Faster Close & Reporting", "", "Reduce time to insights for management and board"],
    ["Improved Forecast Accuracy", "", "Better predictions for business planning"],
    ["Enhanced Decision Support", "", "Real-time analytics and scenario modelling"],
    ["Regulatory Compliance", "", "IFRS, local GAAP, statutory reporting requirements"],
    ["Cost Reduction", "", "Reduce finance function operating costs"],
    ["System Consolidation", "", "Replace fragmented tools and legacy systems"],
    ["Support for Growth", "", "Scalable platform for M&A, new entities, expansion"],
    ["AI/Automation", "", "Leverage AI for forecasting, anomaly detection, automation"],
    ["Self-Service Analytics", "", "Empower business users with reporting capabilities"],
    ["Data Governance", "", "Single source of truth, improved data lineage"],
  ];

  stratDrivers.forEach(([driver, priority, guidance], idx) => {
    const row = profileSheet.addRow([driver, priority, guidance]);
    row.getCell(1).font = { size: 10 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightGreen : EXCEL_COLORS.white } };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.mediumGray } };
    row.getCell(3).alignment = { wrapText: true };
  });

  const priorityNote = profileSheet.addRow(["Rate each driver: 5 = Critical, 4 = Very Important, 3 = Important, 2 = Nice to Have, 1 = Not Relevant", "", ""]);
  profileSheet.mergeCells(priorityNote.number, 1, priorityNote.number, 3);
  priorityNote.getCell(1).font = { size: 9, italic: true, color: { argb: EXCEL_COLORS.teal } };

  profileSheet.addRow([""]);

  // Pain Points Section
  const painHeader = profileSheet.addRow(["CURRENT PAIN POINTS", "Severity (1-5)", "Guidance"]);
  painHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
  });

  const painPoints = [
    ["Excessive Manual Data Entry", "", "Time spent keying data between systems"],
    ["Spreadsheet Errors & Version Control", "", "Mistakes from Excel-based processes"],
    ["Slow/Late Reporting", "", "Inability to meet management reporting deadlines"],
    ["Lack of Visibility", "", "Cannot see consolidated position in real-time"],
    ["Audit Findings", "", "Control weaknesses identified by auditors"],
    ["Staff Burnout at Close", "", "Excessive overtime during reporting periods"],
    ["Inability to Scenario Plan", "", "Cannot model what-if scenarios effectively"],
    ["Integration Gaps", "", "Data silos between systems"],
  ];

  painPoints.forEach(([pain, severity, guidance], idx) => {
    const row = profileSheet.addRow([pain, severity, guidance]);
    row.getCell(1).font = { size: 10 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightRed.replace('#', '') : EXCEL_COLORS.white } };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.mediumGray } };
  });

  const severityNote = profileSheet.addRow(["Rate each pain point: 5 = Severe, 4 = Significant, 3 = Moderate, 2 = Minor, 1 = Not Applicable", "", ""]);
  profileSheet.mergeCells(severityNote.number, 1, severityNote.number, 3);
  severityNote.getCell(1).font = { size: 9, italic: true, color: { argb: EXCEL_COLORS.teal } };

  // ===== 1D. COST DRIVERS WORKSHEET =====
  const costDriversSheet = workbook.addWorksheet("Cost Drivers", {
    properties: { tabColor: { argb: EXCEL_COLORS.lightYellow.replace('#', '') } },
  });
  costDriversSheet.columns = [{ width: 40 }, { width: 18 }, { width: 12 }, { width: 18 }, { width: 55 }];

  const costHeaderRow = costDriversSheet.addRow(["COST DRIVERS WORKSHEET", "", "", "", ""]);
  costDriversSheet.mergeCells(costHeaderRow.number, 1, costHeaderRow.number, 5);
  costHeaderRow.getCell(1).font = { size: 18, bold: true, color: { argb: EXCEL_COLORS.white } };
  costHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  costHeaderRow.height = 35;

  costDriversSheet.addRow([""]);

  const costIntro = costDriversSheet.addRow(["Use this worksheet to calculate your cost inputs. Enter values in yellow cells. Results flow to the ROI Calculator.", "", "", "", ""]);
  costDriversSheet.mergeCells(costIntro.number, 1, costIntro.number, 5);
  costIntro.getCell(1).font = { size: 10, italic: true, color: { argb: EXCEL_COLORS.teal } };

  costDriversSheet.addRow([""]);

  // Licensing Cost Drivers
  const licenseHeader = costDriversSheet.addRow(["SOFTWARE LICENSING DRIVERS", "Your Value", "Unit", "Calculated Cost", "Guidance & Typical Ranges"]);
  licenseHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  const licenseDrivers: [string, number | string, string, string, string][] = [
    ["Number of Named Users", 50, "users", "", "Finance, FP&A users with individual logins"],
    ["Cost Per Named User (Annual)", 2000, "£/user/yr", "", "Typical: £1,500-£3,000 for enterprise EPM"],
    ["Named User Total", "", "", "=B6*B7", ""],
    ["", "", "", "", ""],
    ["Number of Concurrent Users", 20, "users", "", "Users who can be logged in simultaneously"],
    ["Cost Per Concurrent User (Annual)", 4500, "£/user/yr", "", "Typically 2-3x named user cost"],
    ["Concurrent User Total", "", "", "=B10*B11", ""],
    ["", "", "", "", ""],
    ["Enterprise/Unlimited Licence Option", 0, "£/year", "", "Alternative to per-user: flat annual fee"],
    ["", "", "", "", ""],
    ["Additional Modules Required:", "", "", "", ""],
    ["  Consolidation Module", 25000, "£/year", "", "Multi-entity close & consolidation"],
    ["  Planning & Budgeting Module", 30000, "£/year", "", "Driver-based planning, workforce planning"],
    ["  Reporting & Analytics Module", 20000, "£/year", "", "Self-service BI, dashboards"],
    ["  Close Management Module", 15000, "£/year", "", "Task management, reconciliations"],
    ["  Tax Reporting Module", 20000, "£/year", "", "Tax provisioning, country-by-country"],
    ["  Intercompany Module", 15000, "£/year", "", "IC eliminations, transfer pricing"],
    ["", "", "", "", ""],
    ["TOTAL ANNUAL SOFTWARE COST", "", "", "=MAX(D8,D12,B14)+SUM(B17:B22)", "Choose named, concurrent, or enterprise"],
  ];

  const licenseStartRow = costDriversSheet.rowCount + 1;
  licenseDrivers.forEach(([item, value, unit, formula, guidance], idx) => {
    const row = costDriversSheet.addRow([item, value, unit, formula ? 0 : "", guidance]);
    const isTotal = item.includes("TOTAL");
    const isSubheader = item.includes("Modules Required");
    const isEmpty = item === "";

    row.getCell(1).font = { size: 10, bold: isTotal || isSubheader, italic: item.startsWith("  ") };
    if (isTotal) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
      row.getCell(1).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
    } else if (!isEmpty) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    }

    if (typeof value === 'number' && value > 0) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      row.getCell(2).numFmt = item.includes("£") || item.includes("Cost") || item.includes("Module") ? '"£"#,##0' : '#,##0';
    }
    row.getCell(2).alignment = { horizontal: "right" };

    row.getCell(3).font = { size: 9, color: { argb: "666666" } };

    if (formula) {
      row.getCell(4).value = { formula: formula.replace(/B(\d+)/g, (_, num) => `B${licenseStartRow + parseInt(num) - 6}`) };
      row.getCell(4).numFmt = '"£"#,##0';
      row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
    }
    if (isTotal) {
      row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
      row.getCell(4).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
    }
    row.getCell(4).alignment = { horizontal: "right" };

    row.getCell(5).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(5).alignment = { wrapText: true };
  });

  costDriversSheet.addRow([""]);

  // Implementation Cost Drivers
  const implCostHeader = costDriversSheet.addRow(["IMPLEMENTATION COST DRIVERS", "Your Value", "Unit", "Calculated Cost", "Guidance & Typical Ranges"]);
  implCostHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  const implDrivers: [string, number | string, string, string][] = [
    ["SI/Consultant Daily Rate (Blended)", 1200, "£/day", "Average across junior, senior, manager resources"],
    ["", "", "", ""],
    ["DESIGN PHASE:", "", "", ""],
    ["  Requirements & Discovery (Days)", 20, "days", "Workshops, interviews, documentation"],
    ["  Solution Architecture (Days)", 15, "days", "Technical design, data model, integration design"],
    ["  Design Documentation (Days)", 10, "days", "Functional specs, test cases"],
    ["Design Phase Total", "", "", ""],
    ["", "", "", ""],
    ["BUILD PHASE:", "", "", ""],
    ["  Configuration (Days)", 40, "days", "System setup, forms, reports, workflows"],
    ["  Custom Development (Days)", 25, "days", "Bespoke reports, calculations, integrations"],
    ["  Integration Development (Days)", 30, "days", "ERP connectors, data pipelines, APIs"],
    ["  Testing (Days)", 20, "days", "Unit, integration, regression testing"],
    ["Build Phase Total", "", "", ""],
    ["", "", "", ""],
    ["DEPLOYMENT PHASE:", "", "", ""],
    ["  Data Migration (Days)", 25, "days", "Historical data loading, validation"],
    ["  UAT Support (Days)", 15, "days", "Testing support, defect resolution"],
    ["  Training Delivery (Days)", 15, "days", "End-user and super-user training"],
    ["  Go-Live Support (Days)", 10, "days", "Cutover, parallel run, hypercare"],
    ["Deployment Phase Total", "", "", ""],
    ["", "", "", ""],
    ["PROJECT MANAGEMENT:", "", "", ""],
    ["  SI Project Manager (Days)", 60, "days", "Throughout project lifecycle"],
    ["  SI PMO Overhead (%)", 10, "%", "Applied to total SI days"],
    ["", "", "", ""],
    ["TOTAL IMPLEMENTATION COST", "", "", "Sum of all phases + PM + overhead"],
  ];

  const implStartRow = costDriversSheet.rowCount + 1;
  let dailyRateRowNum = 0;
  let designPhaseStartRow = 0;
  let designPhaseTotalRowNum = 0;
  let buildPhaseStartRow = 0;
  let buildPhaseTotalRowNum = 0;
  let deployPhaseStartRow = 0;
  let deployPhaseTotalRowNum = 0;
  let pmDaysRowNum = 0;
  let pmOverheadRowNum = 0;
  let totalImplRowNum = 0;

  implDrivers.forEach(([item, value, unit, guidance], idx) => {
    const row = costDriversSheet.addRow([item, value, unit, "", guidance]);
    const currentRowNum = costDriversSheet.rowCount;
    const isTotal = item.includes("Total") || item.includes("TOTAL");
    const isPhaseHeader = item.includes("PHASE:") || item.includes("MANAGEMENT:");
    const isEmpty = item === "";

    if (item.includes("Daily Rate (Blended)")) {
      dailyRateRowNum = currentRowNum;
    } else if (item === "DESIGN PHASE:") {
      designPhaseStartRow = currentRowNum;
    } else if (item === "Design Phase Total") {
      designPhaseTotalRowNum = currentRowNum;
    } else if (item === "BUILD PHASE:") {
      buildPhaseStartRow = currentRowNum;
    } else if (item === "Build Phase Total") {
      buildPhaseTotalRowNum = currentRowNum;
    } else if (item === "DEPLOYMENT PHASE:") {
      deployPhaseStartRow = currentRowNum;
    } else if (item === "Deployment Phase Total") {
      deployPhaseTotalRowNum = currentRowNum;
    } else if (item.includes("SI Project Manager")) {
      pmDaysRowNum = currentRowNum;
    } else if (item.includes("PMO Overhead")) {
      pmOverheadRowNum = currentRowNum;
    } else if (item === "TOTAL IMPLEMENTATION COST") {
      totalImplRowNum = currentRowNum;
    }

    row.getCell(1).font = { size: 10, bold: isTotal || isPhaseHeader, italic: item.startsWith("  ") };
    if (isTotal && item.includes("TOTAL IMPLEMENTATION")) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
      row.getCell(1).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
      row.getCell(4).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
    } else if (isTotal) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
      row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
    } else if (isPhaseHeader) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
      row.getCell(1).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.white } };
    } else if (!isEmpty) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    }

    if (typeof value === 'number' && value > 0) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      row.getCell(2).numFmt = unit === "£/day" ? '"£"#,##0' : '#,##0';
    }
    row.getCell(2).alignment = { horizontal: "right" };

    row.getCell(3).font = { size: 9, color: { argb: "666666" } };
    row.getCell(5).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(5).alignment = { wrapText: true };
  });

  if (designPhaseTotalRowNum && dailyRateRowNum) {
    const designPhaseRow = costDriversSheet.getRow(designPhaseTotalRowNum);
    designPhaseRow.getCell(4).value = { formula: `SUM(B${designPhaseStartRow + 1}:B${designPhaseTotalRowNum - 1})*B${dailyRateRowNum}` };
    designPhaseRow.getCell(4).numFmt = '"£"#,##0';
  }
  if (buildPhaseTotalRowNum && dailyRateRowNum) {
    const buildPhaseRow = costDriversSheet.getRow(buildPhaseTotalRowNum);
    buildPhaseRow.getCell(4).value = { formula: `SUM(B${buildPhaseStartRow + 1}:B${buildPhaseTotalRowNum - 1})*B${dailyRateRowNum}` };
    buildPhaseRow.getCell(4).numFmt = '"£"#,##0';
  }
  if (deployPhaseTotalRowNum && dailyRateRowNum) {
    const deployPhaseRow = costDriversSheet.getRow(deployPhaseTotalRowNum);
    deployPhaseRow.getCell(4).value = { formula: `SUM(B${deployPhaseStartRow + 1}:B${deployPhaseTotalRowNum - 1})*B${dailyRateRowNum}` };
    deployPhaseRow.getCell(4).numFmt = '"£"#,##0';
  }
  if (totalImplRowNum && dailyRateRowNum && pmDaysRowNum && pmOverheadRowNum) {
    const totalImplRow = costDriversSheet.getRow(totalImplRowNum);
    totalImplRow.getCell(4).value = { formula: `D${designPhaseTotalRowNum}+D${buildPhaseTotalRowNum}+D${deployPhaseTotalRowNum}+(B${pmDaysRowNum}*B${dailyRateRowNum})*(1+B${pmOverheadRowNum}/100)` };
    totalImplRow.getCell(4).numFmt = '"£"#,##0';
  }

  costDriversSheet.addRow([""]);

  // Internal Resource Drivers
  const internalHeader = costDriversSheet.addRow(["INTERNAL RESOURCE DRIVERS", "Your Value", "Unit", "Calculated Cost", "Guidance"]);
  internalHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  const internalDrivers: [string, number | string, string, string][] = [
    ["Average Internal FTE Cost (Annual)", 75000, "£/year", "Fully-loaded: salary + benefits + overhead"],
    ["Internal Daily Rate (Calculated)", "", "", "Annual cost / 220 working days"],
    ["", "", "", ""],
    ["Project Team Allocation:", "", "", ""],
    ["  Finance Business Lead (% time)", 50, "%", "Product owner, requirements, testing"],
    ["  Finance SMEs (% time each)", 25, "%", "Process experts, UAT participants"],
    ["  Number of Finance SMEs", 3, "people", ""],
    ["  IT Technical Lead (% time)", 30, "%", "Integration, security, infrastructure"],
    ["  IT Support Resources (% time)", 20, "%", ""],
    ["  Number of IT Resources", 2, "people", ""],
    ["Project Duration (Months)", 12, "months", "Total project timeline"],
    ["", "", "", ""],
    ["TOTAL INTERNAL RESOURCE COST", "", "", "Sum of FTE allocations x duration"],
  ];

  let internalAnnualCostRowNum = 0;
  let internalDailyRateRowNum = 0;
  let internalBusinessLeadRowNum = 0;
  let internalSMEPercentRowNum = 0;
  let internalSMECountRowNum = 0;
  let internalITLeadRowNum = 0;
  let internalITSupportRowNum = 0;
  let internalITCountRowNum = 0;
  let internalDurationRowNum = 0;
  let internalTotalRowNum = 0;

  internalDrivers.forEach(([item, value, unit, guidance], idx) => {
    const row = costDriversSheet.addRow([item, value, unit, "", guidance]);
    const currentRowNum = costDriversSheet.rowCount;
    const isTotal = item.includes("TOTAL");
    const isSubheader = item.includes("Allocation:");
    const isEmpty = item === "";

    if (item.includes("Average Internal FTE Cost")) {
      internalAnnualCostRowNum = currentRowNum;
    } else if (item.includes("Internal Daily Rate")) {
      internalDailyRateRowNum = currentRowNum;
    } else if (item.includes("Finance Business Lead")) {
      internalBusinessLeadRowNum = currentRowNum;
    } else if (item.includes("Finance SMEs (% time")) {
      internalSMEPercentRowNum = currentRowNum;
    } else if (item.includes("Number of Finance SMEs")) {
      internalSMECountRowNum = currentRowNum;
    } else if (item.includes("IT Technical Lead")) {
      internalITLeadRowNum = currentRowNum;
    } else if (item.includes("IT Support Resources")) {
      internalITSupportRowNum = currentRowNum;
    } else if (item.includes("Number of IT Resources")) {
      internalITCountRowNum = currentRowNum;
    } else if (item.includes("Project Duration")) {
      internalDurationRowNum = currentRowNum;
    } else if (item.includes("TOTAL INTERNAL RESOURCE COST")) {
      internalTotalRowNum = currentRowNum;
    }

    row.getCell(1).font = { size: 10, bold: isTotal || isSubheader, italic: item.startsWith("  ") };
    if (isTotal) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
      row.getCell(1).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
      row.getCell(4).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
    } else if (!isEmpty) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    }

    if (typeof value === 'number' && value > 0) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      row.getCell(2).numFmt = item.includes("Cost") || item.includes("£") ? '"£"#,##0' : '#,##0';
    }
    row.getCell(2).alignment = { horizontal: "right" };
    row.getCell(3).font = { size: 9, color: { argb: "666666" } };
    row.getCell(5).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(5).alignment = { wrapText: true };
  });

  if (internalDailyRateRowNum && internalAnnualCostRowNum) {
    const dailyRateRow = costDriversSheet.getRow(internalDailyRateRowNum);
    dailyRateRow.getCell(4).value = { formula: `B${internalAnnualCostRowNum}/220` };
    dailyRateRow.getCell(4).numFmt = '"£"#,##0';
    dailyRateRow.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
  }
  if (internalTotalRowNum && internalAnnualCostRowNum && internalDurationRowNum) {
    const totalRow = costDriversSheet.getRow(internalTotalRowNum);
    totalRow.getCell(4).value = { formula: `(B${internalAnnualCostRowNum}/12)*(B${internalBusinessLeadRowNum}/100+B${internalSMEPercentRowNum}/100*B${internalSMECountRowNum}+B${internalITLeadRowNum}/100+B${internalITSupportRowNum}/100*B${internalITCountRowNum})*B${internalDurationRowNum}` };
    totalRow.getCell(4).numFmt = '"£"#,##0';
  }

  // ===== 1E. BENEFIT DRIVERS WORKSHEET =====
  const benefitDriversSheet = workbook.addWorksheet("Benefit Drivers", {
    properties: { tabColor: { argb: EXCEL_COLORS.lightGreen.replace('#', '') } },
  });
  benefitDriversSheet.columns = [{ width: 45 }, { width: 16 }, { width: 12 }, { width: 18 }, { width: 50 }];

  const benefitHeaderRow = benefitDriversSheet.addRow(["BENEFIT DRIVERS WORKSHEET", "", "", "", ""]);
  benefitDriversSheet.mergeCells(benefitHeaderRow.number, 1, benefitHeaderRow.number, 5);
  benefitHeaderRow.getCell(1).font = { size: 18, bold: true, color: { argb: EXCEL_COLORS.white } };
  benefitHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
  benefitHeaderRow.height = 35;

  benefitDriversSheet.addRow([""]);

  const benefitIntro = benefitDriversSheet.addRow(["Use this worksheet to calculate benefit values from your specific metrics. Enter values in yellow cells. Be conservative with estimates.", "", "", "", ""]);
  benefitDriversSheet.mergeCells(benefitIntro.number, 1, benefitIntro.number, 5);
  benefitIntro.getCell(1).font = { size: 10, italic: true, color: { argb: EXCEL_COLORS.teal } };

  benefitDriversSheet.addRow([""]);

  // Baseline Metrics
  const baselineHeader = benefitDriversSheet.addRow(["BASELINE METRICS (Current State)", "Your Value", "Unit", "", "Why This Matters"]);
  baselineHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  const baselineMetrics: [string, number | string, string, string][] = [
    ["Finance Team Size (FTEs)", 15, "FTEs", "Total people in scope of EPM/ERP change"],
    ["Average FTE Cost (Annual)", 75000, "£/year", "Fully loaded cost for benefit calculations"],
    ["Hourly Rate (Calculated)", "", "£/hour", "= Annual Cost / 1,800 hours"],
    ["", "", "", ""],
    ["Current Close Timeline (Working Days)", 10, "days", "Month-end close duration"],
    ["Current Forecast Cycle (Days)", 15, "days", "Full forecast refresh duration"],
    ["Current Budget Cycle (Weeks)", 12, "weeks", "Annual budget process duration"],
    ["", "", "", ""],
    ["Hours/Month on Manual Data Entry", 200, "hours", "Across finance team"],
    ["Hours/Month on Spreadsheet Manipulation", 150, "hours", "Formatting, copying, version control"],
    ["Hours/Month on Report Generation", 100, "hours", "Creating management reports"],
    ["Hours/Month on Ad-Hoc Requests", 80, "hours", "Responding to data requests"],
  ];

  let annualFTECostRowNum = 0;
  let benefitHourlyRateRowNum = 0;
  let dataEntryHoursRowNum = 0;
  let spreadsheetHoursRowNum = 0;
  let reportGenHoursRowNum = 0;
  let adHocHoursRowNum = 0;

  baselineMetrics.forEach(([item, value, unit, guidance], idx) => {
    const row = benefitDriversSheet.addRow([item, value, unit, "", guidance]);
    const currentRowNum = benefitDriversSheet.rowCount;
    const isEmpty = item === "";

    if (item.includes("Average FTE Cost (Annual)")) {
      annualFTECostRowNum = currentRowNum;
    } else if (item.includes("Hourly Rate (Calculated)")) {
      benefitHourlyRateRowNum = currentRowNum;
    } else if (item.includes("Manual Data Entry")) {
      dataEntryHoursRowNum = currentRowNum;
    } else if (item.includes("Spreadsheet Manipulation")) {
      spreadsheetHoursRowNum = currentRowNum;
    } else if (item.includes("Report Generation")) {
      reportGenHoursRowNum = currentRowNum;
    } else if (item.includes("Ad-Hoc Requests")) {
      adHocHoursRowNum = currentRowNum;
    }

    row.getCell(1).font = { size: 10 };
    if (!isEmpty) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    }

    if (typeof value === 'number' && value > 0) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      row.getCell(2).numFmt = item.includes("£") || item.includes("Cost") ? '"£"#,##0' : '#,##0';
    } else if (item.includes("Calculated")) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
    }
    row.getCell(2).alignment = { horizontal: "right" };

    row.getCell(3).font = { size: 9, color: { argb: "666666" } };
    row.getCell(5).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(5).alignment = { wrapText: true };
  });

  if (benefitHourlyRateRowNum && annualFTECostRowNum) {
    const benefitHourlyRateRow = benefitDriversSheet.getRow(benefitHourlyRateRowNum);
    benefitHourlyRateRow.getCell(2).value = { formula: `B${annualFTECostRowNum}/1800` };
    benefitHourlyRateRow.getCell(2).numFmt = '"£"#,##0.00';
  }

  benefitDriversSheet.addRow([""]);

  // Efficiency Improvements
  const efficiencyHeader = benefitDriversSheet.addRow(["EFFICIENCY IMPROVEMENTS", "% Reduction", "Hours Saved", "Annual Value", "Calculation Basis"]);
  efficiencyHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
  });

  const efficiencyItems: [string, number | string, string, string, string][] = [
    ["Data Entry Automation", 60, "", "", "Typical: 50-70% reduction with automated feeds"],
    ["Report Generation Automation", 70, "", "", "Typical: 60-80% reduction with self-service"],
    ["Spreadsheet Elimination", 50, "", "", "Typical: 40-60% reduction in manipulation time"],
    ["Ad-Hoc Request Reduction", 40, "", "", "Typical: 30-50% reduction with self-service"],
    ["Close Cycle Acceleration", "", "", "", "Days reduced x FTEs x daily rate"],
    ["Forecast Cycle Acceleration", "", "", "", "Days reduced x FTEs x daily rate"],
    ["", "", "", "", ""],
    ["TOTAL EFFICIENCY SAVINGS", "", "", "", "Sum of above"],
  ];

  let efficiencyRowNums: { name: string; rowNum: number; baselineHoursRow: number }[] = [];
  let efficiencyTotalRowNum = 0;
  let efficiencyStartRowNum = 0;

  efficiencyItems.forEach(([item, value, hours, annual, guidance], idx) => {
    const row = benefitDriversSheet.addRow([item, value, hours, annual, guidance]);
    const currentRowNum = benefitDriversSheet.rowCount;
    const isTotal = item.includes("TOTAL");
    const isEmpty = item === "";

    if (efficiencyStartRowNum === 0 && !isEmpty) {
      efficiencyStartRowNum = currentRowNum;
    }

    if (item.includes("Data Entry")) {
      efficiencyRowNums.push({ name: item, rowNum: currentRowNum, baselineHoursRow: dataEntryHoursRowNum });
    } else if (item.includes("Report Generation")) {
      efficiencyRowNums.push({ name: item, rowNum: currentRowNum, baselineHoursRow: reportGenHoursRowNum });
    } else if (item.includes("Spreadsheet")) {
      efficiencyRowNums.push({ name: item, rowNum: currentRowNum, baselineHoursRow: spreadsheetHoursRowNum });
    } else if (item.includes("Ad-Hoc")) {
      efficiencyRowNums.push({ name: item, rowNum: currentRowNum, baselineHoursRow: adHocHoursRowNum });
    } else if (item.includes("TOTAL EFFICIENCY")) {
      efficiencyTotalRowNum = currentRowNum;
    }

    row.getCell(1).font = { size: 10, bold: isTotal };
    if (isTotal) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
      row.getCell(1).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
      row.getCell(4).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
    } else if (!isEmpty) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightGreen : EXCEL_COLORS.white } };
    }

    if (typeof value === 'number' && value > 0) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      row.getCell(2).numFmt = '0"%"';
    }
    row.getCell(2).alignment = { horizontal: "center" };

    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightBlue } };
    row.getCell(3).alignment = { horizontal: "right" };

    row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightBlue } };
    row.getCell(4).numFmt = '"£"#,##0';
    row.getCell(4).alignment = { horizontal: "right" };

    row.getCell(5).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(5).alignment = { wrapText: true };
  });

  efficiencyRowNums.forEach(({ rowNum, baselineHoursRow }) => {
    if (baselineHoursRow && benefitHourlyRateRowNum) {
      const row = benefitDriversSheet.getRow(rowNum);
      row.getCell(3).value = { formula: `B${baselineHoursRow}*B${rowNum}/100` };
      row.getCell(3).numFmt = '#,##0';
      row.getCell(4).value = { formula: `C${rowNum}*B${benefitHourlyRateRowNum}*12` };
      row.getCell(4).numFmt = '"£"#,##0';
    }
  });

  if (efficiencyTotalRowNum && efficiencyStartRowNum) {
    const totalRow = benefitDriversSheet.getRow(efficiencyTotalRowNum);
    totalRow.getCell(3).value = { formula: `SUM(C${efficiencyStartRowNum}:C${efficiencyTotalRowNum - 1})` };
    totalRow.getCell(3).numFmt = '#,##0';
    totalRow.getCell(4).value = { formula: `SUM(D${efficiencyStartRowNum}:D${efficiencyTotalRowNum - 1})` };
    totalRow.getCell(4).numFmt = '"£"#,##0';
  }

  benefitDriversSheet.addRow([""]);

  // Strategic Benefits
  const strategicHeader = benefitDriversSheet.addRow(["STRATEGIC & RISK BENEFITS", "Your Estimate", "Confidence", "Annual Value", "Valuation Approach"]);
  strategicHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  const strategicItems: [string, number | string, string, string, string][] = [
    ["Improved Forecast Accuracy", 50000, "Medium", "", "1-2% margin improvement on revenue base"],
    ["Faster Decision Making", 30000, "Low", "", "Value of reduced decision latency"],
    ["Better Capital Allocation", 40000, "Medium", "", "ROI improvement on capex decisions"],
    ["Scenario Planning Capability", 25000, "Low", "", "Risk mitigation, opportunity capture"],
    ["", "", "", "", ""],
    ["Audit Fee Reduction", 15000, "High", "", "Faster audit, fewer findings, reduced fees"],
    ["Compliance Risk Avoidance", 25000, "Medium", "", "Probability-weighted regulatory risk"],
    ["Error/Restatement Avoidance", 20000, "Medium", "", "Historical cost of errors/corrections"],
    ["", "", "", "", ""],
    ["Legacy System Retirement", 40000, "High", "", "Direct cost savings from decommissioning"],
    ["Infrastructure Consolidation", 15000, "High", "", "Server, licence, support cost reduction"],
    ["", "", "", "", ""],
    ["TOTAL STRATEGIC BENEFITS", "", "", "", "Sum of above"],
  ];

  let strategicRowNums: number[] = [];
  let strategicTotalRowNum = 0;
  let strategicStartRowNum = 0;

  strategicItems.forEach(([item, value, confidence, annual, guidance], idx) => {
    const row = benefitDriversSheet.addRow([item, value, confidence, annual, guidance]);
    const currentRowNum = benefitDriversSheet.rowCount;
    const isTotal = item.includes("TOTAL");
    const isEmpty = item === "";

    if (strategicStartRowNum === 0 && !isEmpty && !isTotal) {
      strategicStartRowNum = currentRowNum;
    }

    if (typeof value === 'number' && value > 0 && !isTotal) {
      strategicRowNums.push(currentRowNum);
    } else if (item.includes("TOTAL STRATEGIC")) {
      strategicTotalRowNum = currentRowNum;
    }

    row.getCell(1).font = { size: 10, bold: isTotal };
    if (isTotal) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
      row.getCell(1).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
      row.getCell(4).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
    } else if (!isEmpty) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    }

    if (typeof value === 'number' && value > 0) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      row.getCell(2).numFmt = '"£"#,##0';
    }
    row.getCell(2).alignment = { horizontal: "right" };

    if (confidence) {
      row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      const confColor = confidence === "High" ? EXCEL_COLORS.lightGreen : confidence === "Medium" ? EXCEL_COLORS.lightYellow : EXCEL_COLORS.lightRed;
      row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: confColor.replace('#', '') } };
    }
    row.getCell(3).alignment = { horizontal: "center" };

    row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightBlue } };
    row.getCell(4).numFmt = '"£"#,##0';
    row.getCell(4).alignment = { horizontal: "right" };

    row.getCell(5).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(5).alignment = { wrapText: true };
  });

  strategicRowNums.forEach((rowNum) => {
    const row = benefitDriversSheet.getRow(rowNum);
    row.getCell(4).value = { formula: `IF(C${rowNum}="High",B${rowNum},IF(C${rowNum}="Medium",B${rowNum}*0.7,B${rowNum}*0.5))` };
    row.getCell(4).numFmt = '"£"#,##0';
  });

  if (strategicTotalRowNum && strategicStartRowNum) {
    const totalRow = benefitDriversSheet.getRow(strategicTotalRowNum);
    totalRow.getCell(4).value = { formula: `SUM(D${strategicStartRowNum}:D${strategicTotalRowNum - 1})` };
    totalRow.getCell(4).numFmt = '"£"#,##0';
  }

  benefitDriversSheet.addRow([""]);

  // Benefit Phasing
  const phasingHeader = benefitDriversSheet.addRow(["BENEFIT REALISATION PHASING", "Year 1", "Year 2", "Year 3", "Steady State"]);
  phasingHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
  });

  const phasingNote = benefitDriversSheet.addRow(["Enter % of steady-state benefits realised each year:", "", "", "", ""]);
  benefitDriversSheet.mergeCells(phasingNote.number, 1, phasingNote.number, 5);
  phasingNote.getCell(1).font = { size: 10, italic: true };

  const phasingItems: [string, number, number, number, number][] = [
    ["Efficiency Benefits Realisation", 20, 60, 90, 100],
    ["Strategic Benefits Realisation", 10, 40, 70, 100],
    ["Risk/Compliance Benefits Realisation", 30, 70, 90, 100],
  ];

  phasingItems.forEach(([item, y1, y2, y3, ss], idx) => {
    const row = benefitDriversSheet.addRow([item, y1, y2, y3, ss]);
    row.getCell(1).font = { size: 10 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightGreen : EXCEL_COLORS.white } };
    
    [2, 3, 4, 5].forEach(col => {
      row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      row.getCell(col).numFmt = '0"%"';
      row.getCell(col).alignment = { horizontal: "center" };
    });
  });

  const phasingGuidance = benefitDriversSheet.addRow(["Guidance: Year 1 often has minimal benefits during implementation. Full benefits typically realised by Year 3-4.", "", "", "", ""]);
  benefitDriversSheet.mergeCells(phasingGuidance.number, 1, phasingGuidance.number, 5);
  phasingGuidance.getCell(1).font = { size: 9, italic: true, color: { argb: "666666" } };

  // ===== 2. EXECUTIVE SUMMARY =====
  if (data.recommendedPlatform) {
    const summarySheet = workbook.addWorksheet("Executive Summary", {
      properties: { tabColor: { argb: EXCEL_COLORS.teal } },
    });
    summarySheet.columns = [{ width: 25 }, { width: 50 }];

    // Add padding rows at top
    for (let i = 1; i <= 3; i++) {
      summarySheet.addRow([""]);
    }

    // Header
    const summaryHeaderRow = summarySheet.addRow(["Constancia Executive Summary", ""]);
    summarySheet.mergeCells(summaryHeaderRow.number, 1, summaryHeaderRow.number, 2);
    applyHeaderStyle(summaryHeaderRow.getCell(1), true);
    summaryHeaderRow.height = 30;

    summarySheet.addRow([""]);

    // === YOUR ORGANISATION PROFILE SECTION (if available) ===
    if (data.companyProfile && (data.companyProfile.revenue || data.companyProfile.companySize || data.companyProfile.erpLandscape || data.companyProfile.industry)) {
      const profileHeader = summarySheet.addRow(["Your Organisation Profile", ""]);
      summarySheet.mergeCells(profileHeader.number, 1, profileHeader.number, 2);
      profileHeader.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightBlue } };
      profileHeader.getCell(1).font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.navy } };
      
      const profileItems = [
        { label: "Revenue Band", value: getProfileLabel('revenue', data.companyProfile.revenue) },
        { label: "Company Size", value: getProfileLabel('companySize', data.companyProfile.companySize) },
        { label: "ERP Landscape", value: getProfileLabel('erpLandscape', data.companyProfile.erpLandscape) },
        { label: "Industry", value: getProfileLabel('industry', data.companyProfile.industry) },
      ].filter(item => item.value !== 'Not specified');
      
      profileItems.forEach(({ label, value }) => {
        const row = summarySheet.addRow([label, value]);
        row.getCell(1).font = { bold: true, size: 10 };
        row.getCell(2).font = { size: 10, color: { argb: EXCEL_COLORS.teal } };
        row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.white } };
      });
      
      summarySheet.addRow([""]);
    }

    // Recommendation box
    const recLabelRow = summarySheet.addRow(["Recommended Platform:", data.recommendedPlatform.name]);
    recLabelRow.getCell(1).font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.navy } };
    recLabelRow.getCell(2).font = { bold: true, size: 14, color: { argb: EXCEL_COLORS.teal } };
    recLabelRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };

    summarySheet.addRow([""]);

    // Key metrics
    const metricsData = [
      ["Weighted Score", data.recommendedPlatform.calculatedScore.toString()],
      ["Market Position", data.recommendedPlatform.marketPosition],
      ["ROI Potential", data.recommendedPlatform.roiPotential.charAt(0).toUpperCase() + data.recommendedPlatform.roiPotential.slice(1)],
      ["Implementation Time", data.recommendedPlatform.implementationTime],
      ["Price Range", data.recommendedPlatform.priceRange],
      ["Best For", data.recommendedPlatform.bestFor],
    ];

    metricsData.forEach(([label, value], idx) => {
      const row = summarySheet.addRow([label, value]);
      applyDataStyle(row.getCell(1), idx % 2 === 0);
      applyDataStyle(row.getCell(2), idx % 2 === 0);
      row.getCell(1).font = { bold: true, size: 10 };
    });

    summarySheet.addRow([""]);

    // Strengths section
    const strengthsHeaderRow = summarySheet.addRow(["Key Strengths", ""]);
    summarySheet.mergeCells(strengthsHeaderRow.number, 1, strengthsHeaderRow.number, 2);
    strengthsHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
    strengthsHeaderRow.getCell(1).font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.darkGray } };

    data.recommendedPlatform.strengths.forEach((strength) => {
      const row = summarySheet.addRow(["", strength]);
      row.getCell(2).font = { size: 10 };
      row.getCell(2).alignment = { wrapText: true };
    });

    summarySheet.addRow([""]);

    // Limitations section
    const limitationsHeaderRow = summarySheet.addRow(["Considerations", ""]);
    summarySheet.mergeCells(limitationsHeaderRow.number, 1, limitationsHeaderRow.number, 2);
    limitationsHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
    limitationsHeaderRow.getCell(1).font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.darkGray } };

    data.recommendedPlatform.limitations.forEach((limitation) => {
      const row = summarySheet.addRow(["", limitation]);
      row.getCell(2).font = { size: 10 };
      row.getCell(2).alignment = { wrapText: true };
    });
  }

  // ===== 3. PLATFORM COMPARISON =====
  const comparisonSheet = workbook.addWorksheet("Platform Comparison", {
    properties: { tabColor: { argb: EXCEL_COLORS.navy } },
  });

  const compColWidths = [22, 12, 16, 14, 18, 22, 45];
  comparisonSheet.columns = compColWidths.map((w) => ({ width: w }));

  // Add padding rows at top
  for (let i = 1; i <= 3; i++) {
    comparisonSheet.addRow([""]);
  }

  // Header
  const compHeaderRow = comparisonSheet.addRow(["Platform Comparison Overview", "", "", "", "", "", ""]);
  comparisonSheet.mergeCells(compHeaderRow.number, 1, compHeaderRow.number, 7);
  applyHeaderStyle(compHeaderRow.getCell(1), true);
  compHeaderRow.height = 30;

  comparisonSheet.addRow([""]);

  // Table header
  const tableHeaderRow = comparisonSheet.addRow(["Platform", "Score", "Market Position", "ROI Potential", "Implementation", "Price Range", "Best For"]);
  tableHeaderRow.eachCell((cell) => applyHeaderStyle(cell));
  tableHeaderRow.height = 25;

  // Data rows
  data.calculatedScores.forEach((platform, idx) => {
    const row = comparisonSheet.addRow([
      platform.name,
      platform.calculatedScore,
      platform.marketPosition,
      platform.roiPotential.charAt(0).toUpperCase() + platform.roiPotential.slice(1),
      platform.implementationTime,
      platform.priceRange,
      platform.bestFor,
    ]);

    row.eachCell((cell, colNumber) => {
      applyDataStyle(cell, idx % 2 === 0);
      if (colNumber === 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: getScoreColor(platform.calculatedScore) } };
        cell.font = { bold: true, size: 11 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
    row.height = 30;
  });

  // ===== 4. CATEGORY SCORES =====
  const scoresSheet = workbook.addWorksheet("Category Scores", {
    properties: { tabColor: { argb: EXCEL_COLORS.teal } },
  });

  const scoreColWidths = [28, ...data.calculatedScores.map(() => 14)];
  scoresSheet.columns = scoreColWidths.map((w) => ({ width: w }));

  // Add padding rows at top
  for (let i = 1; i <= 3; i++) {
    scoresSheet.addRow([""]);
  }

  // Header
  const scoresHeaderRow = scoresSheet.addRow(["Category Scores Analysis", ...data.calculatedScores.map(() => "")]);
  scoresSheet.mergeCells(scoresHeaderRow.number, 1, scoresHeaderRow.number, data.calculatedScores.length + 1);
  applyHeaderStyle(scoresHeaderRow.getCell(1), true);
  scoresHeaderRow.height = 30;

  scoresSheet.addRow([""]);

  // Legend
  const legendRow = scoresSheet.addRow(["Score Legend: Green (8-10) = Excellent  |  Blue (6-7) = Good  |  Yellow (4-5) = Fair  |  Red (1-3) = Poor", ...data.calculatedScores.map(() => "")]);
  scoresSheet.mergeCells(legendRow.number, 1, legendRow.number, data.calculatedScores.length + 1);
  legendRow.getCell(1).font = { size: 9, italic: true, color: { argb: "666666" } };

  scoresSheet.addRow([""]);

  // Table header
  const scoresTableHeaderRow = scoresSheet.addRow(["Category", ...data.calculatedScores.map((p) => p.shortName)]);
  scoresTableHeaderRow.eachCell((cell) => applyHeaderStyle(cell));
  scoresTableHeaderRow.height = 25;

  // Track data start row for named range
  const scoresDataStartRow = scoresSheet.rowCount + 1;

  // Data rows with conditional formatting
  data.categories.forEach((category, idx) => {
    const scores = data.calculatedScores.map((platform) => platform.scores[category.id] || 0);
    const row = scoresSheet.addRow([category.name, ...scores]);

    row.eachCell((cell, colNumber) => {
      applyDataStyle(cell, idx % 2 === 0);
      if (colNumber > 1) {
        const score = scores[colNumber - 2];
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: getScoreColor(score) } };
        cell.font = { bold: true, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  // Add named range for platform scores matrix (EPM only)
  if (data.categoryType === 'epm' && data.calculatedScores.length > 0) {
    try {
      const endColIndex = data.calculatedScores.length + 1;
      const endRowIndex = scoresDataStartRow + data.categories.length - 1;
      const lastScoreCol = getExcelColumnLetter(endColIndex - 1);
      const rangeRef = `'${scoresSheet.name}'!$A$${scoresDataStartRow}:$${lastScoreCol}$${endRowIndex}`;
      workbook.definedNames.add('PlatformScores', rangeRef);
    } catch (e) {
      console.warn("[ExcelExport] Could not add PlatformScores named range:", e);
    }
  }

  // ===== 5. PRIORITY WEIGHTS =====
  const weightsSheet = workbook.addWorksheet("Priority Weights", {
    properties: { tabColor: { argb: EXCEL_COLORS.navy } },
  });
  weightsSheet.columns = [{ width: 28 }, { width: 15 }, { width: 20 }, { width: 40 }];

  // Add padding rows at top
  for (let i = 1; i <= 3; i++) {
    weightsSheet.addRow([""]);
  }

  // Header
  const weightsHeaderRow = weightsSheet.addRow(["Your Priority Weights Configuration", "", "", ""]);
  weightsSheet.mergeCells(weightsHeaderRow.number, 1, weightsHeaderRow.number, 4);
  applyHeaderStyle(weightsHeaderRow.getCell(1), true);
  weightsHeaderRow.height = 30;

  weightsSheet.addRow([""]);

  const totalWeight = Object.values(data.categoryWeights).reduce((sum, w) => sum + w, 0);

  // Table header
  const weightsTableHeaderRow = weightsSheet.addRow(["Category", "Weight", "Percentage", "Impact on Scoring"]);
  weightsTableHeaderRow.eachCell((cell) => applyHeaderStyle(cell));
  weightsTableHeaderRow.height = 25;

  // Track data start row for named range
  const weightsDataStartRow = weightsSheet.rowCount + 1;

  // Data rows
  data.categories.forEach((category, idx) => {
    const weight = data.categoryWeights[category.id] || 0;
    const percentage = Math.round((weight / totalWeight) * 100);
    const impact = percentage >= 20 ? "High Impact" : percentage >= 10 ? "Medium Impact" : "Low Impact";

    const row = weightsSheet.addRow([category.name, weight, `${percentage}%`, impact]);
    row.eachCell((cell, colNumber) => {
      applyDataStyle(cell, idx % 2 === 0);
      if (colNumber === 3) {
        cell.alignment = { horizontal: "center" };
      }
      if (colNumber === 4) {
        const impactColor = percentage >= 20 ? EXCEL_COLORS.lightGreen : percentage >= 10 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.mediumGray;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: impactColor } };
      }
    });
  });

  // Add named range for category weights (EPM only)
  if (data.categoryType === 'epm') {
    try {
      const endRowIndex = weightsDataStartRow + data.categories.length - 1;
      const rangeRef = `'${weightsSheet.name}'!$A$${weightsDataStartRow}:$D$${endRowIndex}`;
      workbook.definedNames.add('CategoryWeights', rangeRef);
    } catch (e) {
      console.warn("[ExcelExport] Could not add CategoryWeights named range:", e);
    }
  }

  // ===== 5A. SCORE CALCULATOR (with formulas) =====
  const calcSheet = workbook.addWorksheet("Score Calculator", {
    properties: { tabColor: { argb: EXCEL_COLORS.cyan } },
  });
  
  const calcColWidths = [30, ...data.calculatedScores.map(() => 14)];
  calcSheet.columns = calcColWidths.map((w) => ({ width: w }));

  for (let i = 1; i <= 2; i++) {
    calcSheet.addRow([""]);
  }

  const calcHeaderRow = calcSheet.addRow(["Weighted Score Calculator", ...data.calculatedScores.map(() => "")]);
  calcSheet.mergeCells(calcHeaderRow.number, 1, calcHeaderRow.number, data.calculatedScores.length + 1);
  applyHeaderStyle(calcHeaderRow.getCell(1), true);
  calcHeaderRow.height = 30;

  calcSheet.addRow([""]);

  const calcIntroRow = calcSheet.addRow(["Scores are calculated using: Weighted Score = Category Score × (Weight / 100)", ...data.calculatedScores.map(() => "")]);
  calcSheet.mergeCells(calcIntroRow.number, 1, calcIntroRow.number, data.calculatedScores.length + 1);
  calcIntroRow.getCell(1).font = { size: 10, italic: true, color: { argb: EXCEL_COLORS.teal } };

  calcSheet.addRow([""]);

  // Platform headers
  const calcTableHeaderRow = calcSheet.addRow(["Category / Vendor", ...data.calculatedScores.map((p) => p.shortName)]);
  calcTableHeaderRow.eachCell((cell) => applyHeaderStyle(cell));
  calcTableHeaderRow.height = 25;

  const calcStartRow = calcSheet.rowCount + 1;

  // Weighted score rows with formulas
  data.categories.forEach((category, catIdx) => {
    const weight = data.categoryWeights[category.id] || 0;
    const normalizedWeight = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
    
    const rowData: (string | number | { formula: string })[] = [category.name];
    
    data.calculatedScores.forEach((platform, pIdx) => {
      const score = platform.scores[category.id] || 0;
      const weightedScore = score * (normalizedWeight / 100);
      rowData.push({ formula: `${score}*(${normalizedWeight.toFixed(2)}/100)` });
    });
    
    const row = calcSheet.addRow(rowData);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.mediumGray } };
    
    for (let i = 2; i <= data.calculatedScores.length + 1; i++) {
      row.getCell(i).numFmt = '0.00';
      row.getCell(i).alignment = { horizontal: "center" };
    }
  });

  calcSheet.addRow([""]);

  // Total Score row (0-10 scale)
  const totalRowData: (string | { formula: string })[] = ["Total (0-10 scale)"];
  data.calculatedScores.forEach((_, pIdx) => {
    const col = getExcelColumnLetter(pIdx + 1);
    totalRowData.push({ formula: `SUM(${col}${calcStartRow}:${col}${calcStartRow + data.categories.length - 1})` });
  });
  const totalRow = calcSheet.addRow(totalRowData);
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    if (colNumber === 1) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.cyan } };
    } else {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.cyan } };
      cell.numFmt = '0.00';
      cell.alignment = { horizontal: "center" };
    }
  });
  const totalRowNum = calcSheet.rowCount;

  // Display Score row (0-100 scale)
  const displayRowData: (string | { formula: string })[] = ["Display Score (0-100)"];
  data.calculatedScores.forEach((_, pIdx) => {
    const col = getExcelColumnLetter(pIdx + 1);
    displayRowData.push({ formula: `${col}${totalRowNum}*10` });
  });
  const displayRow = calcSheet.addRow(displayRowData);
  displayRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
    if (colNumber > 1) {
      cell.numFmt = '0.0';
      cell.alignment = { horizontal: "center" };
    }
  });
  const displayRowNum = calcSheet.rowCount;

  calcSheet.addRow([""]);
  calcSheet.addRow([""]);

  // TCO Adjustment Section
  const calcTcoHeaderRow = calcSheet.addRow(["TCO Adjustment Formula", ...data.calculatedScores.map(() => "")]);
  calcTcoHeaderRow.getCell(1).font = { bold: true, size: 12, color: { argb: EXCEL_COLORS.navy } };

  const calcTcoSubHeaderRow = calcSheet.addRow(["Metric / Vendor", ...data.calculatedScores.map((p) => p.shortName)]);
  calcTcoSubHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: EXCEL_COLORS.navy } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.cyan } };
    cell.alignment = { horizontal: "center" };
  });

  // Price Tier row
  const priceTierRowData: (string | number)[] = ["Price Tier"];
  const priceTiers = data.calculatedScores.map(p => {
    const priceRange = p.priceRange || "";
    if (priceRange.includes("1M") || priceRange.includes("500K+")) return 5;
    if (priceRange.includes("400K") || priceRange.includes("350K")) return 4;
    if (priceRange.includes("200K") || priceRange.includes("300K")) return 3;
    if (priceRange.includes("100K") || priceRange.includes("80K")) return 2;
    return 1;
  });
  priceTierRowData.push(...priceTiers);
  const priceTierRow = calcSheet.addRow(priceTierRowData);
  priceTierRow.getCell(1).font = { bold: true };
  for (let i = 2; i <= data.calculatedScores.length + 1; i++) {
    priceTierRow.getCell(i).alignment = { horizontal: "center" };
  }
  const priceTierRowNum = calcSheet.rowCount;

  // TCO Multiplier row with formula
  const tcoMultiplierRowData: (string | { formula: string })[] = ["TCO Multiplier"];
  data.calculatedScores.forEach((_, pIdx) => {
    const col = getExcelColumnLetter(pIdx + 1);
    tcoMultiplierRowData.push({ formula: `MAX(0.6,MIN(1.0,1.1-${col}${priceTierRowNum}*0.1))` });
  });
  const tcoMultiplierRow = calcSheet.addRow(tcoMultiplierRowData);
  tcoMultiplierRow.getCell(1).font = { bold: true };
  for (let i = 2; i <= data.calculatedScores.length + 1; i++) {
    tcoMultiplierRow.getCell(i).numFmt = '0.00';
    tcoMultiplierRow.getCell(i).alignment = { horizontal: "center" };
  }
  const tcoMultiplierRowNum = calcSheet.rowCount;

  // TCO-Adjusted Score row
  const adjustedRowData: (string | { formula: string })[] = ["TCO-Adjusted Score"];
  data.calculatedScores.forEach((_, pIdx) => {
    const col = getExcelColumnLetter(pIdx + 1);
    adjustedRowData.push({ formula: `${col}${displayRowNum}*${col}${tcoMultiplierRowNum}` });
  });
  const adjustedRow = calcSheet.addRow(adjustedRowData);
  adjustedRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
    if (colNumber > 1) {
      cell.numFmt = '0.0';
      cell.alignment = { horizontal: "center" };
    }
  });

  calcSheet.addRow([""]);
  calcSheet.addRow([""]);

  // Formula Reference
  const formulaRefRow = calcSheet.addRow(["Formula Reference:"]);
  formulaRefRow.getCell(1).font = { bold: true };
  calcSheet.addRow(["• Weighted Score = Category Score × (Weight / 100)"]);
  calcSheet.addRow(["• Total Score = Sum of all weighted scores (0-10 scale)"]);
  calcSheet.addRow(["• Display Score = Total Score × 10 (0-100 scale)"]);
  calcSheet.addRow(["• TCO Multiplier = MAX(0.6, MIN(1.0, 1.1 - PriceTier × 0.1))"]);
  calcSheet.addRow(["• TCO-Adjusted Score = Display Score × TCO Multiplier"]);

  // ===== 5B. SCORING CRITERIA (EPM only) =====
  if (data.categoryType === 'epm') {
    const scoringCriteriaSheet = workbook.addWorksheet("Scoring Criteria", {
      properties: { tabColor: { argb: EXCEL_COLORS.teal } },
    });
    scoringCriteriaSheet.columns = [{ width: 28 }, { width: 12 }, { width: 12 }, { width: 65 }];

    for (let i = 1; i <= 3; i++) {
      scoringCriteriaSheet.addRow([""]);
    }

    const scoringHeaderRow = scoringCriteriaSheet.addRow(["EPM Scoring Methodology", "", "", ""]);
    scoringCriteriaSheet.mergeCells(scoringHeaderRow.number, 1, scoringHeaderRow.number, 4);
    applyHeaderStyle(scoringHeaderRow.getCell(1), true);
    scoringHeaderRow.height = 30;

    scoringCriteriaSheet.addRow([""]);

    const scoringIntroRow = scoringCriteriaSheet.addRow([
      "This worksheet explains the 11 scoring categories used in our EPM platform evaluation. Total maximum score is 100 points across all categories.",
      "", "", ""
    ]);
    scoringCriteriaSheet.mergeCells(scoringIntroRow.number, 1, scoringIntroRow.number, 4);
    scoringIntroRow.getCell(1).font = { size: 10, italic: true, color: { argb: EXCEL_COLORS.teal } };

    scoringCriteriaSheet.addRow([""]);

    const scoringTableHeader = scoringCriteriaSheet.addRow(["Category", "Max Score", "Your Weight", "What This Category Measures"]);
    scoringTableHeader.eachCell((cell) => applyHeaderStyle(cell));
    scoringTableHeader.height = 25;

    const scoringDataStartRow = scoringCriteriaSheet.rowCount + 1;
    EPM_SCORING_CRITERIA.forEach((criteria, idx) => {
      const userWeight = data.categoryWeights[criteria.id] || 0;
      const row = scoringCriteriaSheet.addRow([criteria.name, criteria.maxScore, userWeight, criteria.description]);
      row.eachCell((cell, colNumber) => {
        applyDataStyle(cell, idx % 2 === 0);
        if (colNumber === 2) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.navy } };
        }
        if (colNumber === 3) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
        }
        if (colNumber === 4) {
          cell.alignment = { wrapText: true, vertical: "top" };
        }
      });
      row.height = 45;
    });

    scoringCriteriaSheet.addRow([""]);

    const totalMaxScore = EPM_SCORING_CRITERIA.reduce((sum, c) => sum + c.maxScore, 0);
    const totalUserWeight = Object.values(data.categoryWeights).reduce((sum, w) => sum + w, 0);
    const scoringTotalRow = scoringCriteriaSheet.addRow(["TOTAL", totalMaxScore, totalUserWeight, ""]);
    scoringTotalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
      if (colNumber === 2 || colNumber === 3) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    scoringCriteriaSheet.addRow([""]);
    scoringCriteriaSheet.addRow([""]);

    const scoringNoteHeader = scoringCriteriaSheet.addRow(["Scoring Guidance", "", "", ""]);
    scoringCriteriaSheet.mergeCells(scoringNoteHeader.number, 1, scoringNoteHeader.number, 2);
    applyHeaderStyle(scoringNoteHeader.getCell(1));

    const scoringNotes = [
      ["Score 8-10", "Excellent capability, market-leading features, minimal gaps"],
      ["Score 6-7", "Good capability, meets most requirements, some enhancement potential"],
      ["Score 4-5", "Fair capability, basic functionality, notable gaps or limitations"],
      ["Score 1-3", "Weak capability, significant gaps, may require workarounds or third-party tools"],
    ];

    scoringNotes.forEach(([score, description], idx) => {
      const row = scoringCriteriaSheet.addRow([score, "", "", description]);
      scoringCriteriaSheet.mergeCells(row.number, 1, row.number, 2);
      scoringCriteriaSheet.mergeCells(row.number, 3, row.number, 4);
      row.getCell(1).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: getScoreColor(parseInt(score.split('-')[0])) } };
      row.getCell(3).font = { size: 10 };
      row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    });

    // Add named range for scoring criteria
    try {
      const endRowIndex = scoringDataStartRow + EPM_SCORING_CRITERIA.length - 1;
      const rangeRef = `'${scoringCriteriaSheet.name}'!$A$${scoringDataStartRow}:$D$${endRowIndex}`;
      workbook.definedNames.add('EPM_ScoringCriteria', rangeRef);
    } catch (e) {
      console.warn("[ExcelExport] Could not add EPM_ScoringCriteria named range:", e);
    }
  }

  // ===== 5C. 2025 MARKET CONTEXT (EPM only) =====
  if (data.categoryType === 'epm') {
    const marketContextSheet = workbook.addWorksheet("2025 Market Context", {
      properties: { tabColor: { argb: EXCEL_COLORS.navy } },
    });
    marketContextSheet.columns = [{ width: 22 }, { width: 18 }, { width: 55 }];

    for (let i = 1; i <= 3; i++) {
      marketContextSheet.addRow([""]);
    }

    const marketHeaderRow = marketContextSheet.addRow(["2025 EPM Market Intelligence", "", ""]);
    marketContextSheet.mergeCells(marketHeaderRow.number, 1, marketHeaderRow.number, 3);
    applyHeaderStyle(marketHeaderRow.getCell(1), true);
    marketHeaderRow.height = 30;

    marketContextSheet.addRow([""]);

    const marketIntroRow = marketContextSheet.addRow([
      "Market intelligence from Gartner Magic Quadrant 2025 and vendor AI capability analysis to inform your EPM platform selection.",
      "", ""
    ]);
    marketContextSheet.mergeCells(marketIntroRow.number, 1, marketIntroRow.number, 3);
    marketIntroRow.getCell(1).font = { size: 10, italic: true, color: { argb: EXCEL_COLORS.teal } };

    marketContextSheet.addRow([""]);

    // Section: Magic Quadrant Leaders
    const mqLeadersHeader = marketContextSheet.addRow(["GARTNER MAGIC QUADRANT 2025 LEADERS", "", ""]);
    marketContextSheet.mergeCells(mqLeadersHeader.number, 1, mqLeadersHeader.number, 3);
    applyHeaderStyle(mqLeadersHeader.getCell(1));

    const mqTableHeader = marketContextSheet.addRow(["Vendor", "Years as Leader", "Key Highlights"]);
    mqTableHeader.eachCell((cell) => applyHeaderStyle(cell));
    mqTableHeader.height = 25;

    GARTNER_MQ_2025.leaders.forEach((vendorData, idx) => {
      const row = marketContextSheet.addRow([vendorData.name, `${vendorData.years} years`, vendorData.highlight]);
      row.eachCell((cell, colNumber) => {
        applyDataStyle(cell, idx % 2 === 0);
        if (colNumber === 1) {
          cell.font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
        }
        if (colNumber === 2) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
        if (colNumber === 3) {
          cell.alignment = { wrapText: true };
        }
      });
      row.height = 40;
    });

    marketContextSheet.addRow([""]);
    marketContextSheet.addRow([""]);

    // Section: Market Trends
    const trendsHeader = marketContextSheet.addRow(["KEY MARKET TRENDS 2025", "", ""]);
    marketContextSheet.mergeCells(trendsHeader.number, 1, trendsHeader.number, 3);
    applyHeaderStyle(trendsHeader.getCell(1));

    GARTNER_MQ_2025.marketTrends.forEach((trend, idx) => {
      const row = marketContextSheet.addRow([`Trend ${idx + 1}`, "", trend]);
      marketContextSheet.mergeCells(row.number, 2, row.number, 3);
      row.getCell(1).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.teal } };
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
      row.getCell(2).font = { size: 10 };
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
      row.getCell(2).alignment = { wrapText: true };
      row.height = 35;
    });

    marketContextSheet.addRow([""]);
    marketContextSheet.addRow([""]);

    // Section: AI Capabilities by Vendor
    const aiHeader = marketContextSheet.addRow(["VENDOR AI CAPABILITIES", "", ""]);
    marketContextSheet.mergeCells(aiHeader.number, 1, aiHeader.number, 3);
    applyHeaderStyle(aiHeader.getCell(1));

    const aiTableHeader = marketContextSheet.addRow(["Vendor", "AI Maturity", "Key AI Features"]);
    aiTableHeader.eachCell((cell) => applyHeaderStyle(cell));
    aiTableHeader.height = 25;

    const vendorDisplayNames: Record<string, string> = {
      "oracle-cloud-epm": "Oracle Cloud EPM",
      "sap-sac": "SAP Analytics Cloud",
      "workday-adaptive": "Workday Adaptive Planning",
      onestream: "OneStream",
      anaplan: "Anaplan",
      "ibm-planning-analytics": "IBM Planning Analytics",
      vena: "Vena Solutions",
    };

    Object.entries(VENDOR_AI_CAPABILITIES).forEach(([vendorId, vendorData], idx) => {
      const displayName = vendorDisplayNames[vendorId] || vendorId;
      const row = marketContextSheet.addRow([displayName, vendorData.aiMaturity, vendorData.aiFeatures.join("; ")]);
      row.eachCell((cell, colNumber) => {
        applyDataStyle(cell, idx % 2 === 0);
        if (colNumber === 1) {
          cell.font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
        }
        if (colNumber === 2) {
          const maturityColor = vendorData.aiMaturity === "Advanced" ? EXCEL_COLORS.lightGreen :
            vendorData.aiMaturity === "Moderate" ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.lightYellow;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: maturityColor } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
        if (colNumber === 3) {
          cell.alignment = { wrapText: true };
        }
      });
      row.height = 40;
    });

    marketContextSheet.addRow([""]);

    const aiLegendRow = marketContextSheet.addRow(["AI Maturity Legend: Advanced = production-ready AI features; Moderate = emerging AI capabilities; Emerging = early-stage AI development", "", ""]);
    marketContextSheet.mergeCells(aiLegendRow.number, 1, aiLegendRow.number, 3);
    aiLegendRow.getCell(1).font = { size: 9, italic: true, color: { argb: "666666" } };
  }

  // ===== 6. STRENGTHS & LIMITATIONS =====
  const strengthsSheet = workbook.addWorksheet("Strengths & Limitations", {
    properties: { tabColor: { argb: EXCEL_COLORS.teal } },
  });
  strengthsSheet.columns = [{ width: 22 }, { width: 14 }, { width: 70 }];

  // Add padding rows at top
  for (let i = 1; i <= 3; i++) {
    strengthsSheet.addRow([""]);
  }

  // Header
  const strengthsHeaderRow = strengthsSheet.addRow(["Platform Strengths & Limitations", "", ""]);
  strengthsSheet.mergeCells(strengthsHeaderRow.number, 1, strengthsHeaderRow.number, 3);
  applyHeaderStyle(strengthsHeaderRow.getCell(1), true);
  strengthsHeaderRow.height = 30;

  strengthsSheet.addRow([""]);

  // Table header
  const strengthsTableHeaderRow = strengthsSheet.addRow(["Platform", "Type", "Details"]);
  strengthsTableHeaderRow.eachCell((cell) => applyHeaderStyle(cell));
  strengthsTableHeaderRow.height = 25;

  // Data rows
  data.calculatedScores.forEach((platform) => {
    let isFirst = true;
    platform.strengths.forEach((strength) => {
      const row = strengthsSheet.addRow([isFirst ? platform.name : "", "Strength", strength]);
      row.getCell(1).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
      row.getCell(2).font = { size: 10 };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).font = { size: 10 };
      row.getCell(3).alignment = { wrapText: true };
      isFirst = false;
    });

    platform.limitations.forEach((limitation) => {
      const row = strengthsSheet.addRow([isFirst ? platform.name : "", "Limitation", limitation]);
      row.getCell(1).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      row.getCell(2).font = { size: 10 };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).font = { size: 10 };
      row.getCell(3).alignment = { wrapText: true };
      isFirst = false;
    });

    strengthsSheet.addRow(["", "", ""]);
  });

  // ===== 7. IMPLEMENTATION CONSIDERATIONS =====
  const implSheet = workbook.addWorksheet("Implementation Guide", {
    properties: { tabColor: { argb: EXCEL_COLORS.navy } },
  });
  implSheet.columns = [{ width: 22 }, { width: 60 }];

  // Add padding rows at top
  for (let i = 1; i <= 3; i++) {
    implSheet.addRow([""]);
  }

  // Header
  const implHeaderRow = implSheet.addRow(["Implementation Considerations", ""]);
  implSheet.mergeCells(implHeaderRow.number, 1, implHeaderRow.number, 2);
  applyHeaderStyle(implHeaderRow.getCell(1), true);
  implHeaderRow.height = 30;

  implSheet.addRow([""]);

  const implConsiderations = [
    ["Pre-Implementation", "Define clear business objectives and success metrics before vendor selection. Ensure executive sponsorship and cross-functional alignment."],
    ["Data Readiness", "Assess data quality, completeness, and integration requirements. Plan for data cleansing and migration early in the project."],
    ["Change Management", "Develop a comprehensive change management strategy including stakeholder communication, training programmes, and adoption metrics."],
    ["Resource Planning", "Identify internal resource requirements and skill gaps. Consider the balance between internal team and external consultancy support."],
    ["Phased Approach", "Consider a phased implementation approach starting with core functionality and expanding over time to reduce risk."],
    ["Integration Strategy", "Map all integration points with existing systems (ERP, HR, CRM) and define API requirements and data flows."],
    ["Testing Strategy", "Plan for comprehensive UAT including parallel running with existing systems where applicable."],
    ["Go-Live Support", "Ensure adequate hypercare support post go-live with clear escalation paths and rollback procedures."],
  ];

  implConsiderations.forEach(([area, description], idx) => {
    const row = implSheet.addRow([area, description]);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    row.getCell(2).font = { size: 10 };
    row.getCell(2).alignment = { wrapText: true };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    row.height = 40;
  });

  // ===== 8. EVALUATION CHECKLIST =====
  const checklistSheet = workbook.addWorksheet("Evaluation Checklist", {
    properties: { tabColor: { argb: EXCEL_COLORS.teal } },
  });
  checklistSheet.columns = [{ width: 8 }, { width: 35 }, { width: 50 }];

  // Add padding rows at top
  for (let i = 1; i <= 3; i++) {
    checklistSheet.addRow([""]);
  }

  // Header
  const checklistHeaderRow = checklistSheet.addRow(["Vendor Evaluation Checklist", "", ""]);
  checklistSheet.mergeCells(checklistHeaderRow.number, 1, checklistHeaderRow.number, 3);
  applyHeaderStyle(checklistHeaderRow.getCell(1), true);
  checklistHeaderRow.height = 30;

  checklistSheet.addRow([""]);

  const checklistItems = [
    ["Functional Requirements", "Does the solution meet all critical functional requirements identified in your RFP?"],
    ["Technical Architecture", "Is the architecture (cloud, hybrid, on-premise) aligned with your IT strategy?"],
    ["Integration Capabilities", "Can the solution integrate with your existing technology stack?"],
    ["Scalability", "Will the solution scale with your organisation's growth plans?"],
    ["Security & Compliance", "Does the vendor meet your security, data residency, and compliance requirements?"],
    ["Implementation Timeline", "Is the proposed implementation timeline realistic for your organisation?"],
    ["Total Cost of Ownership", "Have you fully assessed TCO including licences, implementation, and ongoing costs?"],
    ["Vendor Stability", "Is the vendor financially stable with a clear product roadmap?"],
    ["Reference Customers", "Have you spoken with reference customers in similar industries?"],
    ["Support Model", "Is the support model (SLAs, escalation, UK hours) acceptable?"],
    ["Training & Documentation", "Does the vendor provide comprehensive training and documentation?"],
    ["Exit Strategy", "Have you understood data portability and contract exit terms?"],
  ];

  // Table header
  const checklistTableHeaderRow = checklistSheet.addRow(["Done", "Evaluation Area", "Key Questions to Address"]);
  checklistTableHeaderRow.eachCell((cell) => applyHeaderStyle(cell));
  checklistTableHeaderRow.height = 25;

  checklistItems.forEach(([area, question], idx) => {
    const row = checklistSheet.addRow(["", area, question]);
    row.getCell(1).border = {
      top: { style: "thin", color: { argb: "CCCCCC" } },
      bottom: { style: "thin", color: { argb: "CCCCCC" } },
      left: { style: "thin", color: { argb: "CCCCCC" } },
      right: { style: "thin", color: { argb: "CCCCCC" } },
    };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.white } };
    row.getCell(2).font = { bold: true, size: 10 };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.mediumGray : EXCEL_COLORS.white } };
    row.getCell(3).font = { size: 10 };
    row.getCell(3).alignment = { wrapText: true };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.mediumGray : EXCEL_COLORS.white } };
    row.height = 35;
  });

  // ===== 9. ROI CALCULATOR (Comprehensive with working formulas) =====
  const roiSheet = workbook.addWorksheet("ROI Calculator", {
    properties: { tabColor: { argb: EXCEL_COLORS.lightGreen.replace('#', '') } },
  });
  roiSheet.columns = [
    { width: 45 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 50 }
  ];

  // Title Section
  const roiHeaderRow = roiSheet.addRow(["EPM/ERP ROI Calculator - Comprehensive Investment Analysis", "", "", "", "", "", "", ""]);
  roiSheet.mergeCells(roiHeaderRow.number, 1, roiHeaderRow.number, 8);
  applyHeaderStyle(roiHeaderRow.getCell(1), true);
  roiHeaderRow.height = 35;

  roiSheet.addRow([""]);

  // Instructions
  const instructionRows = [
    "HOW TO USE THIS CALCULATOR:",
    "1. Enter your specific values in the YELLOW highlighted cells - these are your input cells",
    "2. All BLUE and GREEN cells contain formulas that calculate automatically",
    "3. Start with the ASSUMPTIONS section to set your discount rate and organisation size",
    "4. Then work through INVESTMENT COSTS, entering your estimated costs for each category",
    "5. Finally, estimate QUANTIFIED BENEFITS - be conservative with year 1, then ramp up",
    "6. Review the SUMMARY METRICS and SENSITIVITY ANALYSIS to understand your business case",
  ];
  
  instructionRows.forEach((text, idx) => {
    const row = roiSheet.addRow([text, "", "", "", "", "", "", ""]);
    roiSheet.mergeCells(row.number, 1, row.number, 8);
    row.getCell(1).font = { 
      size: idx === 0 ? 11 : 10, 
      bold: idx === 0,
      italic: idx > 0,
      color: { argb: idx === 0 ? EXCEL_COLORS.navy : EXCEL_COLORS.teal } 
    };
  });

  roiSheet.addRow([""]);

  // ===== ASSUMPTIONS SECTION =====
  const assumptionsHeader = roiSheet.addRow(["KEY ASSUMPTIONS", "Value", "", "", "", "", "", "Guidance"]);
  assumptionsHeader.eachCell((cell, colNumber) => {
    if (colNumber === 1 || colNumber === 2 || colNumber === 8) {
      applyHeaderStyle(cell);
    }
  });
  roiSheet.mergeCells(assumptionsHeader.number, 1, assumptionsHeader.number, 1);
  
  const discountRateRow = roiSheet.addRow(["Discount Rate (WACC)", 0.08, "", "", "", "", "", "Typical range: 6-12%. Use your organisation's WACC or hurdle rate"]);
  discountRateRow.getCell(1).font = { size: 10 };
  discountRateRow.getCell(2).numFmt = '0.0%';
  discountRateRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
  discountRateRow.getCell(8).font = { size: 9, italic: true, color: { argb: "666666" } };
  discountRateRow.getCell(8).alignment = { wrapText: true };
  const discountRateRowNum = roiSheet.rowCount;

  const numUsersRow = roiSheet.addRow(["Number of Users", 100, "", "", "", "", "", "Finance, FP&A, and other EPM/ERP users"]);
  numUsersRow.getCell(1).font = { size: 10 };
  numUsersRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
  numUsersRow.getCell(8).font = { size: 9, italic: true, color: { argb: "666666" } };
  numUsersRow.getCell(8).alignment = { wrapText: true };
  const numUsersRowNum = roiSheet.rowCount;

  const avgSalaryRow = roiSheet.addRow(["Average FTE Fully-Loaded Cost (£)", 75000, "", "", "", "", "", "Include salary, benefits, overhead. UK Finance avg: £65K-£95K"]);
  avgSalaryRow.getCell(1).font = { size: 10 };
  avgSalaryRow.getCell(2).numFmt = '"£"#,##0';
  avgSalaryRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
  avgSalaryRow.getCell(8).font = { size: 9, italic: true, color: { argb: "666666" } };
  avgSalaryRow.getCell(8).alignment = { wrapText: true };
  const avgSalaryRowNum = roiSheet.rowCount;

  const hoursPerYearRow = roiSheet.addRow(["Working Hours Per Year", 1800, "", "", "", "", "", "Standard: 1,800-2,000 (accounts for holidays/training)"]);
  hoursPerYearRow.getCell(1).font = { size: 10 };
  hoursPerYearRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
  hoursPerYearRow.getCell(8).font = { size: 9, italic: true, color: { argb: "666666" } };
  hoursPerYearRow.getCell(8).alignment = { wrapText: true };
  const hoursPerYearRowNum = roiSheet.rowCount;

  const hourlyRateRow = roiSheet.addRow(["Calculated Hourly Rate", 0, "", "", "", "", "", "Auto-calculated from salary and hours"]);
  hourlyRateRow.getCell(1).font = { size: 10 };
  hourlyRateRow.getCell(2).value = { formula: `B${avgSalaryRowNum}/B${hoursPerYearRowNum}` };
  hourlyRateRow.getCell(2).numFmt = '"£"#,##0.00';
  hourlyRateRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightBlue } };
  hourlyRateRow.getCell(8).font = { size: 9, italic: true, color: { argb: "666666" } };
  hourlyRateRow.getCell(8).alignment = { wrapText: true };
  const hourlyRateRowNum = roiSheet.rowCount;

  roiSheet.addRow([""]);
  roiSheet.addRow([""]);

  // ===== INVESTMENT COSTS SECTION =====
  const roiInvestmentHeader = roiSheet.addRow(["INVESTMENT COSTS", "Year 0", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Notes & Typical Ranges"]);
  roiInvestmentHeader.eachCell((cell) => applyHeaderStyle(cell));

  const investmentItems: [string, number, number, number, number, number, number, string][] = [
    ["SOFTWARE & LICENSING", 0, 0, 0, 0, 0, 0, ""],
    ["Platform Licence Fees (Annual)", 0, 150000, 150000, 155000, 160000, 165000, "Typical: £800-£2,500 per user/year for enterprise EPM"],
    ["Additional Module Licences", 0, 25000, 25000, 25000, 30000, 30000, "Consolidation, planning, reporting add-ons"],
    ["Third-Party Tool Licences", 0, 15000, 15000, 15000, 15000, 15000, "BI tools, data integration, middleware"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["IMPLEMENTATION SERVICES", 0, 0, 0, 0, 0, 0, ""],
    ["Systems Integrator / Consultancy", 300000, 50000, 0, 0, 0, 0, "Typical ratio: 1.5x-3x of Year 1 licence cost"],
    ["Solution Architecture & Design", 40000, 0, 0, 0, 0, 0, "Blueprint, data model, integration design"],
    ["Configuration & Development", 120000, 20000, 0, 0, 0, 0, "Core build, custom reports, workflows"],
    ["Testing & Quality Assurance", 35000, 0, 0, 0, 0, 0, "UAT, regression, performance testing"],
    ["Project Management", 50000, 10000, 0, 0, 0, 0, "SI PM plus internal PMO allocation"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["DATA & INTEGRATION", 0, 0, 0, 0, 0, 0, ""],
    ["Data Migration & Cleansing", 60000, 0, 0, 0, 0, 0, "Historical data, mapping, validation"],
    ["ERP/Source System Integration", 45000, 8000, 8000, 8000, 8000, 8000, "APIs, connectors, ongoing maintenance"],
    ["Data Quality Remediation", 25000, 5000, 0, 0, 0, 0, "Source system fixes, MDM activities"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["CHANGE MANAGEMENT & TRAINING", 0, 0, 0, 0, 0, 0, ""],
    ["Change Management Programme", 30000, 10000, 5000, 5000, 5000, 5000, "Communications, stakeholder engagement"],
    ["Initial Training (End Users)", 40000, 0, 0, 0, 0, 0, "Workshops, materials, hands-on training"],
    ["Super User / Power User Training", 20000, 5000, 5000, 5000, 5000, 5000, "Advanced training, certification"],
    ["Annual Refresher Training", 0, 10000, 10000, 10000, 10000, 10000, "New joiners, updates, best practice"],
    ["Training Materials & Documentation", 15000, 3000, 3000, 3000, 3000, 3000, "User guides, videos, quick reference"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["INFRASTRUCTURE & OPERATIONS", 0, 0, 0, 0, 0, 0, ""],
    ["Cloud Hosting / Infrastructure", 0, 30000, 32000, 34000, 36000, 38000, "SaaS included in licence, or IaaS costs"],
    ["Security & Compliance Setup", 20000, 5000, 5000, 5000, 5000, 5000, "SSO, RBAC, audit logging, penetration testing"],
    ["Disaster Recovery / Backup", 0, 8000, 8000, 8000, 8000, 8000, "DR environment, backup storage"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["INTERNAL RESOURCES", 0, 0, 0, 0, 0, 0, ""],
    ["Internal Project Team (FTEs)", 80000, 40000, 0, 0, 0, 0, "Product owner, business analysts, testers"],
    ["IT Support Resource Allocation", 0, 25000, 25000, 25000, 25000, 25000, "System admin, support desk, monitoring"],
    ["Finance SME Time Allocation", 30000, 15000, 0, 0, 0, 0, "Requirements, UAT, knowledge transfer"],
    ["Ongoing BAU Support", 0, 20000, 20000, 20000, 20000, 20000, "Admin, configuration changes, upgrades"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["CONTINGENCY & RISK", 0, 0, 0, 0, 0, 0, ""],
  ];

  const investmentStartRow = roiSheet.rowCount + 1;
  let lastInvestmentDataRow = investmentStartRow;

  investmentItems.forEach(([label, y0, y1, y2, y3, y4, y5, notes], idx) => {
    const isHeader = label.toUpperCase() === label && label !== "" && !label.includes("Contingency");
    const isEmpty = label === "";
    const row = roiSheet.addRow([label, y0, y1, y2, y3, y4, y5, notes]);
    
    if (!isEmpty && !isHeader) {
      lastInvestmentDataRow = roiSheet.rowCount;
    }

    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { size: 10, bold: isHeader };
        if (isHeader) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
          cell.font = { size: 10, bold: true, color: { argb: EXCEL_COLORS.white } };
        } else if (!isEmpty) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
        }
      } else if (colNumber >= 2 && colNumber <= 7) {
        if (!isHeader && !isEmpty) {
          cell.numFmt = '"£"#,##0';
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
          cell.alignment = { horizontal: "right" };
        } else if (isHeader) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
        }
      } else if (colNumber === 8) {
        cell.font = { size: 9, italic: true, color: { argb: "666666" } };
        cell.alignment = { wrapText: true };
      }
      if (!isEmpty) {
        cell.border = {
          top: { style: "thin", color: { argb: "CCCCCC" } },
          bottom: { style: "thin", color: { argb: "CCCCCC" } },
          left: { style: "thin", color: { argb: "CCCCCC" } },
          right: { style: "thin", color: { argb: "CCCCCC" } },
        };
      }
    });
  });

  // Contingency row with formula
  const contingencyRow = roiSheet.addRow(["Contingency (15% of above)", 0, 0, 0, 0, 0, 0, "Industry standard: 10-20% contingency"]);
  contingencyRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { size: 10, italic: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.mediumGray } };
    } else if (colNumber >= 2 && colNumber <= 7) {
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `SUMIF(A${investmentStartRow}:A${lastInvestmentDataRow},"<>",${colLetter}${investmentStartRow}:${colLetter}${lastInvestmentDataRow})*0.15` };
      cell.numFmt = '"£"#,##0';
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.mediumGray } };
      cell.alignment = { horizontal: "right" };
    } else if (colNumber === 8) {
      cell.font = { size: 9, italic: true, color: { argb: "666666" } };
      cell.alignment = { wrapText: true };
    }
    cell.border = {
      top: { style: "thin", color: { argb: "CCCCCC" } },
      bottom: { style: "thin", color: { argb: "CCCCCC" } },
      left: { style: "thin", color: { argb: "CCCCCC" } },
      right: { style: "thin", color: { argb: "CCCCCC" } },
    };
  });
  const contingencyRowNum = roiSheet.rowCount;

  // Total Investment row
  const totalInvestmentRow = roiSheet.addRow(["TOTAL INVESTMENT", 0, 0, 0, 0, 0, 0, ""]);
  totalInvestmentRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    } else if (colNumber >= 2 && colNumber <= 7) {
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `SUMIF(A${investmentStartRow}:A${contingencyRowNum},"<>",${colLetter}${investmentStartRow}:${colLetter}${contingencyRowNum})` };
      cell.numFmt = '"£"#,##0';
      cell.font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.alignment = { horizontal: "right" };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });
  const totalInvestmentRowNum = roiSheet.rowCount;

  roiSheet.addRow([""]);
  roiSheet.addRow([""]);

  // ===== BENEFITS SECTION =====
  const roiBenefitsHeader = roiSheet.addRow(["QUANTIFIED BENEFITS", "Year 0", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Calculation Methodology"]);
  roiBenefitsHeader.eachCell((cell) => applyHeaderStyle(cell));

  const benefitItems: [string, number, number, number, number, number, number, string][] = [
    ["EFFICIENCY & PRODUCTIVITY GAINS", 0, 0, 0, 0, 0, 0, ""],
    ["Reduced Manual Data Entry (Hours/month saved)", 0, 120, 180, 240, 260, 280, "Multiply by hourly rate for £ value"],
    ["Automated Reporting (Hours/month saved)", 0, 80, 120, 160, 180, 200, "Replace manual Excel report builds"],
    ["Faster Month-End Close (Days reduced)", 0, 2, 3, 4, 5, 5, "Convert days to £: days x FTEs x daily rate"],
    ["Reduced Overtime During Close", 0, 15000, 25000, 35000, 40000, 40000, "Actual overtime cost reduction"],
    ["Self-Service Reporting (Hours saved)", 0, 40, 80, 120, 150, 180, "Finance team ad-hoc request reduction"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["ERROR REDUCTION & QUALITY", 0, 0, 0, 0, 0, 0, ""],
    ["Reduced Manual Errors (£ impact)", 0, 10000, 20000, 30000, 35000, 40000, "Audit findings, restatements, corrections"],
    ["Improved Data Accuracy (Rework saved)", 0, 8000, 15000, 20000, 25000, 25000, "Time spent fixing errors"],
    ["Faster Error Detection", 0, 5000, 10000, 15000, 18000, 20000, "Automated validation, exception reports"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["STRATEGIC & DECISION VALUE", 0, 0, 0, 0, 0, 0, ""],
    ["Better Forecasting Accuracy (Opportunity)", 0, 25000, 50000, 75000, 100000, 125000, "1-2% margin improvement from better decisions"],
    ["Faster Decision Making", 0, 15000, 30000, 45000, 60000, 75000, "Time-to-insight reduction value"],
    ["Improved Capital Allocation", 0, 20000, 40000, 60000, 80000, 100000, "ROI from better investment decisions"],
    ["Scenario Planning Capability", 0, 10000, 25000, 40000, 50000, 60000, "Risk mitigation, opportunity capture"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["COST AVOIDANCE", 0, 0, 0, 0, 0, 0, ""],
    ["Legacy System Retirement", 0, 30000, 40000, 50000, 60000, 70000, "Maintenance, licences, support for old systems"],
    ["Reduced External Audit Fees", 0, 5000, 10000, 15000, 18000, 20000, "Better controls, faster audit completion"],
    ["IT Infrastructure Savings", 0, 10000, 15000, 18000, 20000, 22000, "Decommissioned servers, reduced complexity"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["COMPLIANCE & RISK MITIGATION", 0, 0, 0, 0, 0, 0, ""],
    ["Regulatory Compliance (Risk Value)", 0, 15000, 20000, 25000, 30000, 35000, "IFRS 16, revenue rec, statutory reporting"],
    ["SOX/Controls Improvement", 0, 8000, 12000, 15000, 18000, 20000, "Audit trail, segregation of duties"],
    ["Penalty/Fine Avoidance (Risk Value)", 0, 10000, 15000, 20000, 25000, 30000, "Probability-weighted regulatory risk"],
    ["", 0, 0, 0, 0, 0, 0, ""],
    ["FTE OPTIMISATION", 0, 0, 0, 0, 0, 0, ""],
    ["FTE Reallocation to Value-Add", 0, 0.5, 1.0, 1.5, 2.0, 2.0, "FTEs shifted to analysis vs. data gathering"],
  ];

  const benefitsStartRow = roiSheet.rowCount + 1;
  let lastBenefitDataRow = benefitsStartRow;
  let fteReallocationRowNum = 0;

  benefitItems.forEach(([label, y0, y1, y2, y3, y4, y5, notes], idx) => {
    const isHeader = label.toUpperCase() === label && label !== "";
    const isEmpty = label === "";
    const isFteRow = label.includes("FTE Reallocation");
    const row = roiSheet.addRow([label, y0, y1, y2, y3, y4, y5, notes]);
    
    if (!isEmpty && !isHeader) {
      lastBenefitDataRow = roiSheet.rowCount;
    }
    if (isFteRow) {
      fteReallocationRowNum = roiSheet.rowCount;
    }

    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { size: 10, bold: isHeader };
        if (isHeader) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
          cell.font = { size: 10, bold: true, color: { argb: EXCEL_COLORS.white } };
        } else if (!isEmpty) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightGreen : EXCEL_COLORS.white } };
        }
      } else if (colNumber >= 2 && colNumber <= 7) {
        if (!isHeader && !isEmpty) {
          cell.numFmt = isFteRow ? '0.0' : '"£"#,##0';
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
          cell.alignment = { horizontal: "right" };
        } else if (isHeader) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
        }
      } else if (colNumber === 8) {
        cell.font = { size: 9, italic: true, color: { argb: "666666" } };
        cell.alignment = { wrapText: true };
      }
      if (!isEmpty) {
        cell.border = {
          top: { style: "thin", color: { argb: "CCCCCC" } },
          bottom: { style: "thin", color: { argb: "CCCCCC" } },
          left: { style: "thin", color: { argb: "CCCCCC" } },
          right: { style: "thin", color: { argb: "CCCCCC" } },
        };
      }
    });
  });

  // FTE Value Calculation Row
  const fteValueRow = roiSheet.addRow(["FTE Value (Calculated)", 0, 0, 0, 0, 0, 0, "Auto: FTEs x Avg Salary"]);
  fteValueRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { size: 10, italic: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightBlue } };
    } else if (colNumber >= 2 && colNumber <= 7) {
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `${colLetter}${fteReallocationRowNum}*B${avgSalaryRowNum}` };
      cell.numFmt = '"£"#,##0';
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightBlue } };
      cell.alignment = { horizontal: "right" };
    } else if (colNumber === 8) {
      cell.font = { size: 9, italic: true, color: { argb: "666666" } };
      cell.alignment = { wrapText: true };
    }
    cell.border = {
      top: { style: "thin", color: { argb: "CCCCCC" } },
      bottom: { style: "thin", color: { argb: "CCCCCC" } },
      left: { style: "thin", color: { argb: "CCCCCC" } },
      right: { style: "thin", color: { argb: "CCCCCC" } },
    };
  });
  const fteValueRowNum = roiSheet.rowCount;

  // Total Benefits row
  const totalBenefitsRow = roiSheet.addRow(["TOTAL BENEFITS", 0, 0, 0, 0, 0, 0, ""]);
  totalBenefitsRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    } else if (colNumber >= 2 && colNumber <= 7) {
      const colLetter = String.fromCharCode(64 + colNumber);
      // Sum all numeric benefit rows (excluding headers and FTE row which is a count)
      cell.value = { formula: `SUMIF(A${benefitsStartRow}:A${fteReallocationRowNum-1},"<>",${colLetter}${benefitsStartRow}:${colLetter}${fteReallocationRowNum-1})+${colLetter}${fteValueRowNum}` };
      cell.numFmt = '"£"#,##0';
      cell.font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.alignment = { horizontal: "right" };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
  });
  const totalBenefitsRowNum = roiSheet.rowCount;

  roiSheet.addRow([""]);
  roiSheet.addRow([""]);

  // ===== CASH FLOW & ROI CALCULATIONS =====
  const roiCalcHeader = roiSheet.addRow(["CASH FLOW ANALYSIS", "Year 0", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Formula"]);
  roiCalcHeader.eachCell((cell) => applyHeaderStyle(cell));

  // Net Cash Flow
  const netCashFlowRow = roiSheet.addRow(["Net Cash Flow (Undiscounted)", 0, 0, 0, 0, 0, 0, "Benefits - Investment"]);
  netCashFlowRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 10 };
    } else if (colNumber >= 2 && colNumber <= 7) {
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `${colLetter}${totalBenefitsRowNum}-${colLetter}${totalInvestmentRowNum}` };
      cell.numFmt = '"£"#,##0';
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
    } else if (colNumber === 8) {
      cell.font = { size: 9, italic: true, color: { argb: "666666" } };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightBlue } };
  });
  const netCashFlowRowNum = roiSheet.rowCount;

  // Discount Factor
  const discountFactorRow = roiSheet.addRow(["Discount Factor", 1, 0, 0, 0, 0, 0, "1/(1+rate)^year"]);
  discountFactorRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { size: 10 };
    } else if (colNumber === 2) {
      cell.value = 1;
      cell.numFmt = '0.0000';
    } else if (colNumber >= 3 && colNumber <= 7) {
      const year = colNumber - 2;
      cell.value = { formula: `1/(1+B${discountRateRowNum})^${year}` };
      cell.numFmt = '0.0000';
    } else if (colNumber === 8) {
      cell.font = { size: 9, italic: true, color: { argb: "666666" } };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.mediumGray } };
    cell.alignment = { horizontal: "right" };
  });
  const discountFactorRowNum = roiSheet.rowCount;

  // Discounted Cash Flow
  const discountedCFRow = roiSheet.addRow(["Discounted Cash Flow", 0, 0, 0, 0, 0, 0, "Net CF x Discount Factor"]);
  discountedCFRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 10 };
    } else if (colNumber >= 2 && colNumber <= 7) {
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `${colLetter}${netCashFlowRowNum}*${colLetter}${discountFactorRowNum}` };
      cell.numFmt = '"£"#,##0';
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
    } else if (colNumber === 8) {
      cell.font = { size: 9, italic: true, color: { argb: "666666" } };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
  });
  const discountedCFRowNum = roiSheet.rowCount;

  // Cumulative Discounted CF
  const cumulativeRow = roiSheet.addRow(["Cumulative Discounted CF", 0, 0, 0, 0, 0, 0, "Running total for payback"]);
  cumulativeRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 10 };
    } else if (colNumber === 2) {
      cell.value = { formula: `B${discountedCFRowNum}` };
      cell.numFmt = '"£"#,##0';
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
    } else if (colNumber >= 3 && colNumber <= 7) {
      const prevColLetter = String.fromCharCode(64 + colNumber - 1);
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `${prevColLetter}${roiSheet.rowCount}+${colLetter}${discountedCFRowNum}` };
      cell.numFmt = '"£"#,##0';
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
    } else if (colNumber === 8) {
      cell.font = { size: 9, italic: true, color: { argb: "666666" } };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightGreen } };
  });
  const cumulativeCFRowNum = roiSheet.rowCount;

  roiSheet.addRow([""]);
  roiSheet.addRow([""]);

  // ===== SUMMARY METRICS =====
  const summaryMetricsHeader = roiSheet.addRow(["KEY METRICS SUMMARY", "Value", "", "Interpretation", "", "", "", ""]);
  roiSheet.mergeCells(summaryMetricsHeader.number, 4, summaryMetricsHeader.number, 8);
  applyHeaderStyle(summaryMetricsHeader.getCell(1), true);
  applyHeaderStyle(summaryMetricsHeader.getCell(2), true);
  applyHeaderStyle(summaryMetricsHeader.getCell(4), true);

  const summaryMetrics: [string, { formula: string }, string, string][] = [
    ["Total Investment (6 Years)", { formula: `SUM(B${totalInvestmentRowNum}:G${totalInvestmentRowNum})` }, '"£"#,##0', "Complete cost including Year 0 setup"],
    ["Total Benefits (6 Years)", { formula: `SUM(B${totalBenefitsRowNum}:G${totalBenefitsRowNum})` }, '"£"#,##0', "All quantified benefits over project life"],
    ["Net Present Value (NPV)", { formula: `SUM(B${discountedCFRowNum}:G${discountedCFRowNum})` }, '"£"#,##0', "Positive = value-creating investment"],
    ["Simple ROI %", { formula: `(SUM(B${totalBenefitsRowNum}:G${totalBenefitsRowNum})-SUM(B${totalInvestmentRowNum}:G${totalInvestmentRowNum}))/SUM(B${totalInvestmentRowNum}:G${totalInvestmentRowNum})*100` }, '0.0"%"', "Target: >100% for strong business case"],
    ["Cost Per User (Annual)", { formula: `SUM(C${totalInvestmentRowNum}:G${totalInvestmentRowNum})/5/B${numUsersRowNum}` }, '"£"#,##0', "Ongoing annual cost per user"],
    ["Benefit Per User (Annual)", { formula: `SUM(C${totalBenefitsRowNum}:G${totalBenefitsRowNum})/5/B${numUsersRowNum}` }, '"£"#,##0', "Average annual benefit per user"],
  ];

  summaryMetrics.forEach(([label, formula, format, interpretation], idx) => {
    const row = roiSheet.addRow([label, 0, "", interpretation, "", "", "", ""]);
    roiSheet.mergeCells(row.number, 4, row.number, 8);
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    row.getCell(2).value = formula;
    row.getCell(2).numFmt = format;
    row.getCell(2).font = { bold: true, size: 12, color: { argb: EXCEL_COLORS.navy } };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
    row.getCell(4).font = { size: 9, italic: true, color: { argb: "666666" } };
    row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
  });

  roiSheet.addRow([""]);

  // Payback Period estimation
  const paybackHeader = roiSheet.addRow(["PAYBACK ANALYSIS", "", "", "", "", "", "", ""]);
  roiSheet.mergeCells(paybackHeader.number, 1, paybackHeader.number, 3);
  applyHeaderStyle(paybackHeader.getCell(1));

  const paybackNote = roiSheet.addRow(["Review 'Cumulative Discounted CF' row above. Payback occurs when value turns positive.", "", "", "", "", "", "", ""]);
  roiSheet.mergeCells(paybackNote.number, 1, paybackNote.number, 8);
  paybackNote.getCell(1).font = { size: 10, italic: true };

  const yr1Positive = roiSheet.addRow(["Year 1 Cumulative Positive?", "", "", "If positive, payback < 1 year", "", "", "", ""]);
  yr1Positive.getCell(2).value = { formula: `IF(C${cumulativeCFRowNum}>0,"Yes","No")` };
  yr1Positive.getCell(4).font = { size: 9, italic: true };

  const yr2Positive = roiSheet.addRow(["Year 2 Cumulative Positive?", "", "", "If positive, payback 1-2 years", "", "", "", ""]);
  yr2Positive.getCell(2).value = { formula: `IF(D${cumulativeCFRowNum}>0,"Yes","No")` };
  yr2Positive.getCell(4).font = { size: 9, italic: true };

  const yr3Positive = roiSheet.addRow(["Year 3 Cumulative Positive?", "", "", "If positive, payback 2-3 years", "", "", "", ""]);
  yr3Positive.getCell(2).value = { formula: `IF(E${cumulativeCFRowNum}>0,"Yes","No")` };
  yr3Positive.getCell(4).font = { size: 9, italic: true };

  roiSheet.addRow([""]);

  // Sensitivity guidance
  const sensitivityHeader = roiSheet.addRow(["SENSITIVITY CONSIDERATIONS", "", "", "", "", "", "", ""]);
  roiSheet.mergeCells(sensitivityHeader.number, 1, sensitivityHeader.number, 3);
  applyHeaderStyle(sensitivityHeader.getCell(1));

  const sensitivityNotes = [
    ["Conservative Case", "Reduce benefits by 20-30%, increase costs by 10-15%", "Tests downside risk"],
    ["Optimistic Case", "Increase benefits by 15-20%, reduce implementation timeline", "Tests upside potential"],
    ["Break-Even Analysis", "What benefit level makes NPV = 0?", "Understand minimum required benefits"],
    ["Discount Rate Sensitivity", "Test with ±2% discount rate", "Higher rates reduce NPV"],
  ];

  sensitivityNotes.forEach(([scenario, action, purpose]) => {
    const row = roiSheet.addRow([scenario, action, "", purpose, "", "", "", ""]);
    roiSheet.mergeCells(row.number, 2, row.number, 3);
    roiSheet.mergeCells(row.number, 4, row.number, 8);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
    row.getCell(2).font = { size: 10 };
    row.getCell(4).font = { size: 9, italic: true, color: { argb: "666666" } };
  });

  // ===== 10. TCO ANALYSIS =====
  const tcoSheet = workbook.addWorksheet("TCO Analysis", {
    properties: { tabColor: { argb: EXCEL_COLORS.navy } },
  });
  tcoSheet.columns = [{ width: 35 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 45 }];

  for (let i = 1; i <= 2; i++) tcoSheet.addRow([""]);

  const tcoHeaderRow = tcoSheet.addRow(["Total Cost of Ownership (TCO) Analysis", "", "", "", ""]);
  tcoSheet.mergeCells(tcoHeaderRow.number, 1, tcoHeaderRow.number, 5);
  applyHeaderStyle(tcoHeaderRow.getCell(1), true);
  tcoHeaderRow.height = 30;

  tcoSheet.addRow([""]);

  const tcoTableHeader = tcoSheet.addRow(["Cost Category", "One-Time", "Annual", "5-Year Total", "Notes/Assumptions"]);
  tcoTableHeader.eachCell((cell) => applyHeaderStyle(cell));

  const tcoItems = [
    ["Software Licensing", 0, 150000, "=B6+C6*5", "Per-user or enterprise licensing model"],
    ["Implementation Partner Fees", 250000, 0, "=B7+C7*5", "Typical range: 1.5-3x license cost"],
    ["Data Migration & Integration", 75000, 10000, "=B8+C8*5", "Initial migration plus ongoing maintenance"],
    ["Training & Enablement", 50000, 15000, "=B9+C9*5", "Initial plus annual refresher training"],
    ["Change Management", 40000, 5000, "=B10+C10*5", "Communications, adoption support"],
    ["Infrastructure/Cloud Hosting", 10000, 30000, "=B11+C11*5", "Cloud subscription or on-premise hosting"],
    ["Internal IT Support", 0, 40000, "=B12+C12*5", "Dedicated support resource allocation"],
    ["Ongoing Customisation", 0, 25000, "=B13+C13*5", "Annual enhancement budget"],
    ["Third-Party Integrations", 30000, 12000, "=B14+C14*5", "API connections, middleware"],
    ["Audit & Compliance", 0, 8000, "=B15+C15*5", "Annual audit support, controls testing"],
  ];

  const tcoDataStartRow = tcoSheet.rowCount + 1;
  tcoItems.forEach(([label, oneTime, annual, formula, notes], idx) => {
    const row = tcoSheet.addRow([label, oneTime, annual, 0, notes]);
    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { size: 10 };
      } else if (colNumber === 2 || colNumber === 3) {
        cell.numFmt = '"£"#,##0';
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
        cell.alignment = { horizontal: "right" };
      } else if (colNumber === 4) {
        cell.value = { formula: formula as string };
        cell.numFmt = '"£"#,##0';
        cell.font = { bold: true };
        cell.alignment = { horizontal: "right" };
      } else {
        cell.font = { size: 9, italic: true, color: { argb: "666666" } };
        cell.alignment = { wrapText: true };
      }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colNumber === 4 ? EXCEL_COLORS.lightGreen : (idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white) } };
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
    });
  });

  const tcoTotalRow = tcoSheet.addRow(["TOTAL COST OF OWNERSHIP", 0, 0, 0, ""]);
  tcoTotalRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    } else if (colNumber >= 2 && colNumber <= 4) {
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `SUM(${colLetter}${tcoDataStartRow}:${colLetter}${tcoDataStartRow + 9})` };
      cell.numFmt = '"£"#,##0';
      cell.font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.alignment = { horizontal: "right" };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  tcoSheet.addRow([""]);

  // TCO Per User calculation
  const tcoPerUserHeader = tcoSheet.addRow(["PER-USER ANALYSIS", "", "", "", ""]);
  applyHeaderStyle(tcoPerUserHeader.getCell(1));
  tcoSheet.mergeCells(tcoPerUserHeader.number, 1, tcoPerUserHeader.number, 2);

  const tcoNumUsersRow = tcoSheet.addRow(["Number of Users", 100, "", "", "Enter your expected user count"]);
  tcoNumUsersRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
  tcoNumUsersRow.getCell(5).font = { size: 9, italic: true };

  const tcoPerUserRow = tcoSheet.addRow(["5-Year TCO Per User", 0, "", "", ""]);
  tcoPerUserRow.getCell(2).value = { formula: `D${tcoTotalRow.number}/B${tcoNumUsersRow.number}` };
  tcoPerUserRow.getCell(2).numFmt = '"£"#,##0';
  tcoPerUserRow.getCell(2).font = { bold: true, size: 12, color: { argb: EXCEL_COLORS.teal } };

  const annualPerUserRow = tcoSheet.addRow(["Annual TCO Per User", 0, "", "", ""]);
  annualPerUserRow.getCell(2).value = { formula: `D${tcoTotalRow.number}/5/B${tcoNumUsersRow.number}` };
  annualPerUserRow.getCell(2).numFmt = '"£"#,##0';
  annualPerUserRow.getCell(2).font = { bold: true, size: 11 };

  // ===== 11. IMPLEMENTATION ROADMAP =====
  const roadmapSheet = workbook.addWorksheet("Implementation Roadmap", {
    properties: { tabColor: { argb: EXCEL_COLORS.teal } },
  });
  roadmapSheet.columns = [
    { width: 25 }, { width: 35 }, { width: 12 }, { width: 12 },
    { width: 6 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 6 },
    { width: 6 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 6 },
  ];

  for (let i = 1; i <= 2; i++) roadmapSheet.addRow([""]);

  const roadmapHeaderRow = roadmapSheet.addRow(["Implementation Roadmap", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  roadmapSheet.mergeCells(roadmapHeaderRow.number, 1, roadmapHeaderRow.number, 16);
  applyHeaderStyle(roadmapHeaderRow.getCell(1), true);
  roadmapHeaderRow.height = 30;

  roadmapSheet.addRow([""]);

  const monthHeaders = ["Phase", "Key Activities", "Start", "End", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];
  const roadmapTableHeader = roadmapSheet.addRow(monthHeaders);
  roadmapTableHeader.eachCell((cell) => applyHeaderStyle(cell));

  const phases = [
    { phase: "1. Initiation", activities: "Project setup, stakeholder alignment, governance", start: "Month 1", end: "Month 1", months: [1, 1] },
    { phase: "2. Discovery", activities: "Requirements gathering, current state analysis", start: "Month 1", end: "Month 2", months: [1, 2] },
    { phase: "3. Design", activities: "Solution design, data model, integration architecture", start: "Month 2", end: "Month 4", months: [2, 4] },
    { phase: "4. Build", activities: "Configuration, development, unit testing", start: "Month 4", end: "Month 7", months: [4, 7] },
    { phase: "5. Data Migration", activities: "Data cleansing, mapping, migration, validation", start: "Month 5", end: "Month 8", months: [5, 8] },
    { phase: "6. Integration", activities: "System integration, API testing, end-to-end testing", start: "Month 6", end: "Month 8", months: [6, 8] },
    { phase: "7. UAT", activities: "User acceptance testing, defect resolution", start: "Month 8", end: "Month 9", months: [8, 9] },
    { phase: "8. Training", activities: "End-user training, super-user certification", start: "Month 8", end: "Month 10", months: [8, 10] },
    { phase: "9. Go-Live", activities: "Deployment, parallel run, cutover", start: "Month 10", end: "Month 10", months: [10, 10] },
    { phase: "10. Hypercare", activities: "Post go-live support, stabilisation, optimisation", start: "Month 10", end: "Month 12", months: [10, 12] },
  ];

  phases.forEach((phaseData, idx) => {
    const rowData = [phaseData.phase, phaseData.activities, phaseData.start, phaseData.end];
    for (let m = 1; m <= 12; m++) {
      rowData.push("");
    }
    const row = roadmapSheet.addRow(rowData);

    row.eachCell((cell, colNumber) => {
      if (colNumber <= 4) {
        cell.font = { size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
        cell.alignment = { wrapText: true, vertical: "middle" };
        if (colNumber === 1) cell.font = { bold: true, size: 10 };
      } else {
        const monthNum = colNumber - 4;
        const isActive = monthNum >= phaseData.months[0] && monthNum <= phaseData.months[1];
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isActive ? EXCEL_COLORS.teal : EXCEL_COLORS.mediumGray } };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
    });
    row.height = 28;
  });

  roadmapSheet.addRow([""]);

  // Milestones
  const milestonesHeader = roadmapSheet.addRow(["Key Milestones", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  roadmapSheet.mergeCells(milestonesHeader.number, 1, milestonesHeader.number, 4);
  applyHeaderStyle(milestonesHeader.getCell(1));

  const milestones = [
    ["Project Kick-off", "Month 1", "Formal project initiation with executive sponsor"],
    ["Design Sign-off", "Month 4", "Solution design approval from business stakeholders"],
    ["Development Complete", "Month 7", "All build activities completed and unit tested"],
    ["UAT Sign-off", "Month 9", "Business acceptance of tested solution"],
    ["Go-Live", "Month 10", "Production deployment and cutover"],
    ["Project Closure", "Month 12", "Transition to BAU support, lessons learned"],
  ];

  milestones.forEach(([milestone, timing, description]) => {
    const row = roadmapSheet.addRow([milestone, timing, description, "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    roadmapSheet.mergeCells(row.number, 3, row.number, 16);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: EXCEL_COLORS.navy } };
    row.getCell(2).font = { size: 10, color: { argb: EXCEL_COLORS.teal } };
    row.getCell(3).font = { size: 10 };
    row.getCell(3).alignment = { wrapText: true };
  });

  // ===== 12. RISK ASSESSMENT MATRIX =====
  const riskSheet = workbook.addWorksheet("Risk Assessment", {
    properties: { tabColor: { argb: EXCEL_COLORS.lightRed.replace('#', '') } },
  });
  riskSheet.columns = [{ width: 30 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 40 }, { width: 25 }];

  for (let i = 1; i <= 2; i++) riskSheet.addRow([""]);

  const riskHeaderRow = riskSheet.addRow(["Risk Assessment Matrix", "", "", "", "", ""]);
  riskSheet.mergeCells(riskHeaderRow.number, 1, riskHeaderRow.number, 6);
  applyHeaderStyle(riskHeaderRow.getCell(1), true);
  riskHeaderRow.height = 30;

  riskSheet.addRow([""]);

  const riskLegendRow = riskSheet.addRow(["Impact/Probability: 1=Low, 2=Medium, 3=High. Risk Score = Impact x Probability. Edit yellow cells.", "", "", "", "", ""]);
  riskSheet.mergeCells(riskLegendRow.number, 1, riskLegendRow.number, 6);
  riskLegendRow.getCell(1).font = { size: 9, italic: true };

  riskSheet.addRow([""]);

  const riskTableHeader = riskSheet.addRow(["Risk Description", "Impact (1-3)", "Probability (1-3)", "Risk Score", "Mitigation Strategy", "Owner"]);
  riskTableHeader.eachCell((cell) => applyHeaderStyle(cell));

  const risks = [
    ["Data quality issues during migration", 3, 2, "Data profiling, cleansing sprints, validation gates"],
    ["Scope creep affecting timeline", 2, 3, "Formal change control, steering committee approval"],
    ["Insufficient internal resources", 3, 2, "Resource planning, external contractor backup"],
    ["Integration complexity underestimated", 3, 2, "Early integration POC, middleware evaluation"],
    ["User adoption challenges", 2, 2, "Change management plan, super-user network"],
    ["Vendor delays or issues", 2, 2, "Contractual SLAs, escalation procedures"],
    ["Budget overrun", 3, 2, "Contingency allocation, monthly cost reviews"],
    ["Key personnel departure", 2, 2, "Knowledge transfer, documentation requirements"],
    ["Security/compliance gaps", 3, 1, "Security assessment, compliance checklist"],
    ["Business process resistance", 2, 2, "Stakeholder engagement, process workshops"],
  ];

  const riskDataStartRow = riskSheet.rowCount + 1;
  risks.forEach(([risk, impact, probability, mitigation], idx) => {
    const row = riskSheet.addRow([risk, impact, probability, 0, mitigation, ""]);
    const rowNum = riskSheet.rowCount;

    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { size: 10 };
        cell.alignment = { wrapText: true };
      } else if (colNumber === 2 || colNumber === 3) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
        cell.alignment = { horizontal: "center" };
      } else if (colNumber === 4) {
        cell.value = { formula: `B${rowNum}*C${rowNum}` };
        cell.alignment = { horizontal: "center" };
        cell.font = { bold: true };
      } else if (colNumber === 5) {
        cell.font = { size: 9 };
        cell.alignment = { wrapText: true };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
    });
    row.height = 35;
  });

  riskSheet.addRow([""]);

  // Risk summary
  const riskSummaryHeader = riskSheet.addRow(["RISK SUMMARY", "", "", "", "", ""]);
  riskSheet.mergeCells(riskSummaryHeader.number, 1, riskSummaryHeader.number, 2);
  applyHeaderStyle(riskSummaryHeader.getCell(1));

  const totalRiskRow = riskSheet.addRow(["Total Risk Exposure", 0, "", "", "", ""]);
  totalRiskRow.getCell(2).value = { formula: `SUM(D${riskDataStartRow}:D${riskDataStartRow + 9})` };
  totalRiskRow.getCell(2).font = { bold: true, size: 14, color: { argb: EXCEL_COLORS.navy } };

  const avgRiskRow = riskSheet.addRow(["Average Risk Score", 0, "", "", "", ""]);
  avgRiskRow.getCell(2).value = { formula: `AVERAGE(D${riskDataStartRow}:D${riskDataStartRow + 9})` };
  avgRiskRow.getCell(2).numFmt = '0.0';
  avgRiskRow.getCell(2).font = { bold: true, size: 12 };

  const highRiskRow = riskSheet.addRow(["High Risk Items (Score >= 6)", 0, "", "", "", ""]);
  highRiskRow.getCell(2).value = { formula: `COUNTIF(D${riskDataStartRow}:D${riskDataStartRow + 9},">=6")` };
  highRiskRow.getCell(2).font = { bold: true, size: 12, color: { argb: "CC0000" } };

  // ===== 13. DECISION MATRIX =====
  const decisionSheet = workbook.addWorksheet("Decision Matrix", {
    properties: { tabColor: { argb: EXCEL_COLORS.navy } },
  });
  
  const vendorCount = Math.min(data.calculatedScores.length, 5);
  const decisionColWidths = [30, 12, ...Array(vendorCount).fill(15)];
  decisionSheet.columns = decisionColWidths.map(w => ({ width: w }));

  for (let i = 1; i <= 2; i++) decisionSheet.addRow([""]);

  const decisionHeaderRow = decisionSheet.addRow(["Weighted Decision Matrix", "", ...Array(vendorCount).fill("")]);
  decisionSheet.mergeCells(decisionHeaderRow.number, 1, decisionHeaderRow.number, vendorCount + 2);
  applyHeaderStyle(decisionHeaderRow.getCell(1), true);
  decisionHeaderRow.height = 30;

  decisionSheet.addRow([""]);

  const decisionInstructRow = decisionSheet.addRow(["Enter weights (1-10) and scores (1-10) in yellow cells. Weighted scores calculate automatically.", "", ...Array(vendorCount).fill("")]);
  decisionSheet.mergeCells(decisionInstructRow.number, 1, decisionInstructRow.number, vendorCount + 2);
  decisionInstructRow.getCell(1).font = { size: 9, italic: true };

  decisionSheet.addRow([""]);

  const vendorNames = data.calculatedScores.slice(0, vendorCount).map(p => p.shortName);
  const decisionTableHeader = decisionSheet.addRow(["Evaluation Criteria", "Weight", ...vendorNames]);
  decisionTableHeader.eachCell((cell) => applyHeaderStyle(cell));

  const evaluationCriteria = [
    ["Functional Fit", 10],
    ["Ease of Use", 8],
    ["Integration Capabilities", 9],
    ["Vendor Stability & Support", 7],
    ["Total Cost of Ownership", 9],
    ["Implementation Timeline", 6],
    ["Scalability", 7],
    ["Reporting & Analytics", 8],
    ["Mobile Capabilities", 5],
    ["AI/ML Features", 6],
  ];

  const criteriaStartRow = decisionSheet.rowCount + 1;
  evaluationCriteria.forEach(([criteria, weight], idx) => {
    const vendorScores = data.calculatedScores.slice(0, vendorCount).map(p => {
      const catScores = Object.values(p.scores);
      return catScores.length > 0 ? Math.round(catScores.reduce((a, b) => a + b, 0) / catScores.length) : 7;
    });

    const row = decisionSheet.addRow([criteria, weight, ...vendorScores]);
    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { size: 10 };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
        cell.alignment = { horizontal: "center" };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
    });
  });

  decisionSheet.addRow([""]);

  // Weighted Score row
  const weightedScoreRow = decisionSheet.addRow(["WEIGHTED SCORE", "", ...Array(vendorCount).fill(0)]);
  weightedScoreRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    } else if (colNumber >= 3) {
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `SUMPRODUCT(B${criteriaStartRow}:B${criteriaStartRow + 9},${colLetter}${criteriaStartRow}:${colLetter}${criteriaStartRow + 9})` };
      cell.font = { bold: true, size: 12, color: { argb: EXCEL_COLORS.white } };
      cell.alignment = { horizontal: "center" };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });
  const weightedScoreRowNum = decisionSheet.rowCount;

  // Ranking row
  const rankingRow = decisionSheet.addRow(["RANK", "", ...Array(vendorCount).fill(0)]);
  rankingRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    } else if (colNumber >= 3) {
      const colLetter = String.fromCharCode(64 + colNumber);
      const startCol = "C";
      const endCol = String.fromCharCode(66 + vendorCount);
      cell.value = { formula: `RANK(${colLetter}${weightedScoreRowNum},$${startCol}$${weightedScoreRowNum}:$${endCol}$${weightedScoreRowNum},0)` };
      cell.font = { bold: true, size: 14, color: { argb: EXCEL_COLORS.cyan } };
      cell.alignment = { horizontal: "center" };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
  });

  // ===== 14. BUDGET TEMPLATE =====
  const budgetSheet = workbook.addWorksheet("Budget Template", {
    properties: { tabColor: { argb: EXCEL_COLORS.lightGreen.replace('#', '') } },
  });
  budgetSheet.columns = [{ width: 35 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];

  for (let i = 1; i <= 2; i++) budgetSheet.addRow([""]);

  const budgetHeaderRow = budgetSheet.addRow(["Project Budget Template", "", "", "", "", "", ""]);
  budgetSheet.mergeCells(budgetHeaderRow.number, 1, budgetHeaderRow.number, 7);
  applyHeaderStyle(budgetHeaderRow.getCell(1), true);
  budgetHeaderRow.height = 30;

  budgetSheet.addRow([""]);

  const budgetTableHeader = budgetSheet.addRow(["Budget Category", "Q1", "Q2", "Q3", "Q4", "Total", "% of Budget"]);
  budgetTableHeader.eachCell((cell) => applyHeaderStyle(cell));

  const budgetItems = [
    ["Software Licensing", 37500, 37500, 37500, 37500],
    ["Implementation Services", 150000, 75000, 25000, 0],
    ["Data Migration", 25000, 35000, 15000, 0],
    ["Training & Change Management", 15000, 20000, 10000, 5000],
    ["Infrastructure", 15000, 5000, 2500, 2500],
    ["Internal Resources", 35000, 30000, 20000, 15000],
    ["Testing & Quality Assurance", 0, 15000, 20000, 5000],
    ["Contingency (10%)", 0, 0, 0, 0],
  ];

  const budgetDataStartRow = budgetSheet.rowCount + 1;
  budgetItems.forEach(([label, q1, q2, q3, q4], idx) => {
    const row = budgetSheet.addRow([label, q1, q2, q3, q4, 0, 0]);
    const rowNum = budgetSheet.rowCount;

    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { size: 10 };
      } else if (colNumber >= 2 && colNumber <= 5) {
        if (label === "Contingency (10%)") {
          const sumFormula = `(SUM(B${budgetDataStartRow}:B${budgetDataStartRow + 6})+SUM(C${budgetDataStartRow}:C${budgetDataStartRow + 6})+SUM(D${budgetDataStartRow}:D${budgetDataStartRow + 6})+SUM(E${budgetDataStartRow}:E${budgetDataStartRow + 6}))*0.1/4`;
          cell.value = { formula: sumFormula };
        }
        cell.numFmt = '"£"#,##0';
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: label === "Contingency (10%)" ? EXCEL_COLORS.mediumGray : EXCEL_COLORS.lightYellow } };
        cell.alignment = { horizontal: "right" };
      } else if (colNumber === 6) {
        cell.value = { formula: `SUM(B${rowNum}:E${rowNum})` };
        cell.numFmt = '"£"#,##0';
        cell.font = { bold: true };
        cell.alignment = { horizontal: "right" };
      } else if (colNumber === 7) {
        cell.value = { formula: `F${rowNum}/F${budgetDataStartRow + 8}*100` };
        cell.numFmt = '0.0"%"';
        cell.alignment = { horizontal: "center" };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
    });
  });

  const budgetTotalRow = budgetSheet.addRow(["TOTAL PROJECT BUDGET", 0, 0, 0, 0, 0, ""]);
  budgetTotalRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) {
      cell.font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    } else if (colNumber >= 2 && colNumber <= 6) {
      const colLetter = String.fromCharCode(64 + colNumber);
      cell.value = { formula: `SUM(${colLetter}${budgetDataStartRow}:${colLetter}${budgetDataStartRow + 7})` };
      cell.numFmt = '"£"#,##0';
      cell.font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.alignment = { horizontal: "right" };
    } else {
      cell.value = "100%";
      cell.font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.alignment = { horizontal: "center" };
    }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  // ===== 15. STAKEHOLDER RACI =====
  const raciSheet = workbook.addWorksheet("Stakeholder RACI", {
    properties: { tabColor: { argb: EXCEL_COLORS.teal } },
  });
  raciSheet.columns = [{ width: 30 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }];

  for (let i = 1; i <= 2; i++) raciSheet.addRow([""]);

  const raciHeaderRow = raciSheet.addRow(["Stakeholder RACI Matrix", "", "", "", "", "", "", ""]);
  raciSheet.mergeCells(raciHeaderRow.number, 1, raciHeaderRow.number, 8);
  applyHeaderStyle(raciHeaderRow.getCell(1), true);
  raciHeaderRow.height = 30;

  raciSheet.addRow([""]);

  const raciLegendRow = raciSheet.addRow(["R = Responsible, A = Accountable, C = Consulted, I = Informed", "", "", "", "", "", "", ""]);
  raciSheet.mergeCells(raciLegendRow.number, 1, raciLegendRow.number, 8);
  raciLegendRow.getCell(1).font = { size: 9, italic: true };

  raciSheet.addRow([""]);

  const raciRoles = ["Exec Sponsor", "Project Manager", "Business Lead", "IT Lead", "Finance SME", "Vendor PM", "End Users"];
  const raciTableHeader = raciSheet.addRow(["Activity / Deliverable", ...raciRoles]);
  raciTableHeader.eachCell((cell) => applyHeaderStyle(cell));

  const raciActivities = [
    ["Project Charter & Governance", "A", "R", "C", "C", "I", "C", "I"],
    ["Requirements Definition", "I", "A", "R", "C", "R", "C", "C"],
    ["Vendor Selection", "A", "R", "R", "R", "C", "I", "I"],
    ["Solution Design", "I", "A", "R", "R", "C", "R", "C"],
    ["Data Migration Strategy", "I", "A", "C", "R", "R", "C", "I"],
    ["Configuration & Development", "I", "A", "C", "R", "C", "R", "I"],
    ["Integration Testing", "I", "A", "C", "R", "C", "R", "I"],
    ["User Acceptance Testing", "I", "A", "R", "C", "R", "C", "R"],
    ["Training Programme", "I", "A", "R", "C", "R", "C", "R"],
    ["Go-Live Decision", "A", "R", "R", "R", "C", "C", "I"],
    ["Post Go-Live Support", "I", "A", "C", "R", "C", "R", "R"],
  ];

  raciActivities.forEach(([activity, ...assignments], idx) => {
    const row = raciSheet.addRow([activity, ...assignments]);
    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white } };
      } else {
        const value = cell.value as string;
        let bgColor = EXCEL_COLORS.white;
        if (value === "R") bgColor = EXCEL_COLORS.lightGreen;
        else if (value === "A") bgColor = EXCEL_COLORS.lightYellow;
        else if (value === "C") bgColor = EXCEL_COLORS.lightBlue;
        else if (value === "I") bgColor = EXCEL_COLORS.mediumGray;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.font = { bold: true, size: 10 };
        cell.alignment = { horizontal: "center" };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
    });
  });

  // ===== 16. VENDOR SCORECARD =====
  const scorecardSheet = workbook.addWorksheet("Vendor Scorecard", {
    properties: { tabColor: { argb: EXCEL_COLORS.navy } },
  });
  scorecardSheet.columns = [{ width: 30 }, { width: 12 }, { width: 50 }, { width: 12 }];

  for (let i = 1; i <= 2; i++) scorecardSheet.addRow([""]);

  const scorecardHeaderRow = scorecardSheet.addRow(["Vendor Due Diligence Scorecard", "", "", ""]);
  scorecardSheet.mergeCells(scorecardHeaderRow.number, 1, scorecardHeaderRow.number, 4);
  applyHeaderStyle(scorecardHeaderRow.getCell(1), true);
  scorecardHeaderRow.height = 30;

  scorecardSheet.addRow([""]);

  const scorecardInstruct = scorecardSheet.addRow(["Score each criterion 1-5 (5=Excellent). Enter scores in yellow cells.", "", "", ""]);
  scorecardSheet.mergeCells(scorecardInstruct.number, 1, scorecardInstruct.number, 4);
  scorecardInstruct.getCell(1).font = { size: 9, italic: true };

  scorecardSheet.addRow([""]);

  const scorecardTableHeader = scorecardSheet.addRow(["Evaluation Criterion", "Score (1-5)", "Evidence / Notes", "Max Score"]);
  scorecardTableHeader.eachCell((cell) => applyHeaderStyle(cell));

  const scorecardCategories = [
    { category: "FINANCIAL STABILITY", items: [
      ["Profitability & Revenue Growth", 4],
      ["Funding / Investment Status", 4],
      ["Customer Retention Rate", 4],
    ]},
    { category: "PRODUCT CAPABILITY", items: [
      ["Core Functionality Match", 4],
      ["Configurability vs. Customisation", 4],
      ["Reporting & Analytics", 4],
      ["Mobile & Remote Access", 3],
    ]},
    { category: "TECHNICAL ARCHITECTURE", items: [
      ["Cloud Infrastructure & Scalability", 4],
      ["Security & Compliance Certifications", 5],
      ["API & Integration Capabilities", 4],
      ["Data Residency Options", 4],
    ]},
    { category: "IMPLEMENTATION & SUPPORT", items: [
      ["Implementation Methodology", 4],
      ["Partner Ecosystem Quality", 4],
      ["Support Model & SLAs", 4],
      ["Training & Documentation", 3],
    ]},
    { category: "STRATEGIC FIT", items: [
      ["Product Roadmap Alignment", 4],
      ["Industry Expertise", 4],
      ["Reference Customer Quality", 4],
      ["Cultural Fit", 3],
    ]},
  ];

  let scorecardDataStart = 0;
  let totalItems = 0;

  scorecardCategories.forEach((cat) => {
    const catRow = scorecardSheet.addRow([cat.category, "", "", ""]);
    scorecardSheet.mergeCells(catRow.number, 1, catRow.number, 4);
    catRow.getCell(1).font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
    catRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };

    cat.items.forEach(([item, score]) => {
      const row = scorecardSheet.addRow([item, score, "", 5]);
      if (scorecardDataStart === 0) scorecardDataStart = row.number;
      totalItems++;

      row.eachCell((cell, colNumber) => {
        if (colNumber === 2) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
          cell.alignment = { horizontal: "center" };
        } else if (colNumber === 3) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.lightYellow } };
          cell.alignment = { wrapText: true };
        } else if (colNumber === 4) {
          cell.alignment = { horizontal: "center" };
          cell.font = { color: { argb: "999999" } };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "CCCCCC" } },
          bottom: { style: "thin", color: { argb: "CCCCCC" } },
          left: { style: "thin", color: { argb: "CCCCCC" } },
          right: { style: "thin", color: { argb: "CCCCCC" } },
        };
      });
    });
  });

  scorecardSheet.addRow([""]);

  const scorecardTotalRow = scorecardSheet.addRow(["TOTAL SCORE", 0, "", 0]);
  scorecardTotalRow.getCell(1).font = { bold: true, size: 11, color: { argb: EXCEL_COLORS.white } };
  scorecardTotalRow.getCell(2).value = { formula: `SUMIF(B${scorecardDataStart}:B${scorecardDataStart + totalItems + 4},"<>",B${scorecardDataStart}:B${scorecardDataStart + totalItems + 4})` };
  scorecardTotalRow.getCell(2).font = { bold: true, size: 14, color: { argb: EXCEL_COLORS.white } };
  scorecardTotalRow.getCell(2).alignment = { horizontal: "center" };
  scorecardTotalRow.getCell(4).value = totalItems * 5;
  scorecardTotalRow.getCell(4).font = { bold: true, color: { argb: EXCEL_COLORS.white } };
  scorecardTotalRow.getCell(4).alignment = { horizontal: "center" };
  scorecardTotalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
  });

  const scorecardPctRow = scorecardSheet.addRow(["PERCENTAGE SCORE", 0, "", ""]);
  scorecardPctRow.getCell(1).font = { bold: true, size: 11 };
  scorecardPctRow.getCell(2).value = { formula: `B${scorecardTotalRow.number}/D${scorecardTotalRow.number}*100` };
  scorecardPctRow.getCell(2).numFmt = '0.0"%"';
  scorecardPctRow.getCell(2).font = { bold: true, size: 14, color: { argb: EXCEL_COLORS.teal } };
  scorecardPctRow.getCell(2).alignment = { horizontal: "center" };

  // ===== SCORING METHODOLOGY SHEET (for AI with fit scoring) =====
  if (data.categoryType === 'ai' && data.usesFitScoring) {
    const methodologySheet = workbook.addWorksheet("Scoring Methodology", {
      properties: { tabColor: { argb: EXCEL_COLORS.cyan } },
    });
    methodologySheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 50 },
    ];

    // Header
    const methodologyHeaderRow = methodologySheet.addRow(["15 Key Drivers Scoring Methodology"]);
    methodologyHeaderRow.getCell(1).font = { size: 16, bold: true, color: { argb: EXCEL_COLORS.navy } };
    methodologySheet.addRow([""]);

    // Base Score explanation
    const baseScoreRow = methodologySheet.addRow(["Base Score Calculation"]);
    baseScoreRow.getCell(1).font = { size: 12, bold: true, color: { argb: EXCEL_COLORS.teal } };
    methodologySheet.addRow(["Base scores are calculated using weighted category scores across 15 evaluation dimensions."]);
    methodologySheet.addRow([""]);

    // Modifier explanations
    const modifierHeaderRow = methodologySheet.addRow(["Contextual Modifier", "Points", "Description"]);
    modifierHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
      cell.alignment = { horizontal: "center" };
    });

    const modifiers = [
      ["ERP Integration - Native", "+20", "Same-vendor ERP integration (e.g., Microsoft Copilot + Microsoft 365)"],
      ["ERP Integration - Connector", "+12", "Pre-built RPA bots and connectors available"],
      ["ERP Integration - Partnership", "+8", "Vendor partnership agreements (e.g., IBM watsonx + SAP)"],
      ["ERP Integration - Custom", "0", "General-purpose tools requiring custom development"],
      ["Tech Stack - Strong Alignment", "+15", "Platform deeply integrated with your tech ecosystem"],
      ["Tech Stack - Weak Alignment", "-15", "Platform designed for different ecosystems"],
      ["Company Size - Optimal Fit", "+10", "Platform designed for your company scale"],
      ["Company Size - Mismatch", "-8", "Enterprise pricing for SMB, or vice versa"],
      ["Finance Focus", "+10", "Purpose-built finance automation features"],
      ["Industry Specialisation", "+8", "Strong vertical expertise matching your industry"],
      ["Deployment Ease", "+8", "Plug-and-play implementation available"],
    ];

    modifiers.forEach((mod, idx) => {
      const row = methodologySheet.addRow(mod);
      const isPositive = mod[1].startsWith("+");
      const isNegative = mod[1].startsWith("-");
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white },
        };
        if (colNumber === 2) {
          cell.font = {
            bold: true,
            color: { argb: isPositive ? "228B22" : isNegative ? "CC3300" : EXCEL_COLORS.darkGray },
          };
          cell.alignment = { horizontal: "center" };
        }
      });
    });

    methodologySheet.addRow([""]);
    methodologySheet.addRow([""]);

    // Platform Breakdown section
    const platformsWithModifiers = data.calculatedScores.filter(p => p.aiModifiers && p.aiModifiers.length > 0);
    if (platformsWithModifiers.length > 0) {
      const breakdownHeaderRow = methodologySheet.addRow(["Platform Scoring Breakdown"]);
      breakdownHeaderRow.getCell(1).font = { size: 12, bold: true, color: { argb: EXCEL_COLORS.teal } };
      methodologySheet.addRow([""]);

      const breakdownColsRow = methodologySheet.addRow(["Platform", "Base Score", "Modifiers Applied", "Adjusted Score"]);
      breakdownColsRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: EXCEL_COLORS.white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.teal } };
        cell.alignment = { horizontal: "center" };
      });

      platformsWithModifiers.forEach((platform, idx) => {
        const baseScore = (platform.calculatedScore * 10).toFixed(0);
        const adjustedScore = platform.fitAdjustedScore ? (platform.fitAdjustedScore * 10).toFixed(0) : baseScore;
        const modifiers = platform.aiModifiers?.map(m => `${m.value > 0 ? '+' : ''}${m.value} ${m.label}`).join('; ') || 'N/A';
        
        const row = methodologySheet.addRow([platform.name, baseScore, modifiers, adjustedScore]);
        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: idx % 2 === 0 ? EXCEL_COLORS.lightBlue : EXCEL_COLORS.white },
          };
          if (colNumber === 2 || colNumber === 4) {
            cell.alignment = { horizontal: "center" };
          }
          if (colNumber === 4) {
            cell.font = { bold: true, color: { argb: EXCEL_COLORS.teal } };
          }
        });
      });
    }

    methodologySheet.addRow([""]);
    methodologySheet.addRow([""]);
    
    // Disclaimer
    const disclaimerRow = methodologySheet.addRow(["Scores based on Constancia consulting experience and publicly available information."]);
    disclaimerRow.getCell(1).font = { italic: true, size: 9, color: { argb: "666666" } };
  }

  // ===== 17. CONTACT PAGE (Final) =====
  const contactSheet = workbook.addWorksheet("Next Steps", {
    properties: { tabColor: { argb: EXCEL_COLORS.navy } },
  });
  contactSheet.columns = [{ width: 70 }];

  for (let i = 1; i <= 5; i++) {
    contactSheet.addRow([""]);
  }

  const nextStepsHeaderRow = contactSheet.addRow(["Ready to Take the Next Step?"]);
  nextStepsHeaderRow.getCell(1).font = { size: 20, bold: true, color: { argb: EXCEL_COLORS.navy } };
  nextStepsHeaderRow.getCell(1).alignment = { horizontal: "center" };
  nextStepsHeaderRow.height = 35;

  contactSheet.addRow([""]);

  const ctaText = "This comprehensive analysis toolkit provides a starting point for your evaluation. For a detailed assessment tailored to your organisation's specific requirements, our team of independent advisors can help.";
  const ctaRow = contactSheet.addRow([ctaText]);
  ctaRow.getCell(1).font = { size: 11, color: { argb: EXCEL_COLORS.darkGray } };
  ctaRow.getCell(1).alignment = { horizontal: "center", wrapText: true };

  for (let i = 0; i < 3; i++) contactSheet.addRow([""]);

  const servicesHeader = contactSheet.addRow(["Our Services Include:"]);
  servicesHeader.getCell(1).font = { size: 14, bold: true, color: { argb: EXCEL_COLORS.teal } };
  servicesHeader.getCell(1).alignment = { horizontal: "center" };

  contactSheet.addRow([""]);

  const services = [
    "Vendor-agnostic platform selection and RFP support",
    "Implementation planning and project governance",
    "Change management and user adoption programmes",
    "Data migration strategy and execution",
    "Post-implementation optimisation and support",
  ];

  services.forEach((service) => {
    const row = contactSheet.addRow([service]);
    row.getCell(1).font = { size: 10 };
    row.getCell(1).alignment = { horizontal: "center" };
  });

  for (let i = 0; i < 3; i++) contactSheet.addRow([""]);

  const contactHeader = contactSheet.addRow(["Contact Us"]);
  contactHeader.getCell(1).font = { size: 14, bold: true, color: { argb: EXCEL_COLORS.navy } };
  contactHeader.getCell(1).alignment = { horizontal: "center" };

  contactSheet.addRow([""]);

  const emailRow = contactSheet.addRow([CONTACT_INFO.email]);
  emailRow.getCell(1).font = { size: 12, color: { argb: EXCEL_COLORS.teal } };
  emailRow.getCell(1).alignment = { horizontal: "center" };

  const webRow = contactSheet.addRow([CONTACT_INFO.website]);
  webRow.getCell(1).font = { size: 12, color: { argb: EXCEL_COLORS.teal } };
  webRow.getCell(1).alignment = { horizontal: "center" };

  contactSheet.addRow([""]);

  const addressRow = contactSheet.addRow([CONTACT_INFO.address]);
  addressRow.getCell(1).font = { size: 10, color: { argb: EXCEL_COLORS.darkGray } };
  addressRow.getCell(1).alignment = { horizontal: "center" };

  // Generate and download with error handling
  const fileName = `Constancia-${data.categoryType.toUpperCase()}-Comparison-${new Date().toISOString().split("T")[0]}.xlsx`;
  
  dlog("[ExcelExport] Generating Excel buffer...");
  
  let buffer: ArrayBuffer;
  try {
    buffer = await workbook.xlsx.writeBuffer();
    dlog("[ExcelExport] Buffer generated, size:", buffer.byteLength, "bytes");
    
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    dlog("[ExcelExport] Blob created, size:", blob.size, "bytes");
    
    const url = URL.createObjectURL(blob);
    dlog("[ExcelExport] Object URL created:", url);
    
    // Detect mobile/iOS for different download handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      // iOS Safari doesn't support download attribute well - open in new tab
      dlog("[ExcelExport] iOS detected, opening in new tab");
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Popup blocked - fall back to location change
        window.location.href = url;
      }
      toast?.({
        title: "Excel Generated",
        description: "Your Excel file has opened. Use the share button to save it.",
      });
      // Clean up after a long delay for iOS
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      // Desktop and Android - use anchor link with download attribute
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      dlog("[ExcelExport] Triggering download for:", fileName);
      link.click();
      
      // Delay cleanup to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        dlog("[ExcelExport] Download triggered and cleaned up");
      }, isMobile ? 3000 : 1000);
      
      toast?.({
        title: "Excel Downloaded",
        description: "Check your downloads folder for the Excel file.",
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ExcelExport] Error during buffer/download:", errorMessage, error);
    toast?.({
      title: "Excel Export Failed",
      description: `Error: ${errorMessage.substring(0, 100)}`,
      variant: "destructive",
    });
    throw error;
  }
}
