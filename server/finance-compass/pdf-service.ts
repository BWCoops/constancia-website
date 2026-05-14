/**
 * FinanceCompass PDF Report Generation Service
 * 
 * Generates branded, consulting-grade PDF reports for assessment tiers.
 * Uses ReportNarrativeService for AI-driven dynamic content generation.
 */

import jsPDFModule from "jspdf";
const jsPDF = (jsPDFModule as any).jsPDF ?? (jsPDFModule as any).default ?? jsPDFModule;
type jsPDFType = InstanceType<typeof jsPDF>;
import type { 
  FcAssessment, 
  FcCompany, 
  FcContact,
  FcResponse 
} from "@shared/finance-compass-schema";
import type { AnalysisResult, GenerationTierResult } from "./ai-service";
import { fcStorage } from "./storage";
import {
  generateAllNarratives,
  generateReportStructure,
  generateExecutiveSummary,
  generateDimensionNarratives,
  generateActionPlan,
  generateBenchmarkComparison,
  generateKeyFindings,
  clearNarrativeCache,
  type FullReportNarratives,
  type ActionPlanItem,
  type DimensionNarrative,
  type ReportSection,
} from "./report-narrative-service";
import {
  DIMENSION_BENCHMARKS,
  WORLD_CLASS_BENCHMARK,
  GAP_CLASSIFICATION,
  MATURITY_LEVELS,
  DIMENSION_LABELS,
  classifyGap,
  getMaturityLevel,
  calculateGapAnalysis,
  BENEFITS_CATEGORIES,
} from "./benchmarks";
import {
  PDF_BRAND_COLORS,
  PDF_CONTACT_INFO,
  PDF_MARGINS,
  PDF_PAGE_SIZE,
  PDF_FOOTER_HEIGHT,
  formatDateUK,
} from "@shared/pdf-config";
import { getLogoTurquoise, getIconWhite } from "../pdf-logo-constants";
import {
  calculateSensitivityGrid,
  calculateWorkingCapitalImpact,
  calculateHiddenCosts,
  runMonteCarloSimulation,
  type SensitivityGrid,
  type WorkingCapitalAnalysis,
  type HiddenCostAnalysis,
  type MonteCarloResult,
} from "@shared/roi-enhanced";
import {
  getVendorRecommendations,
  type VendorRecommendation,
  type DimensionScores,
  type OrganizationProfile,
} from "@shared/vendor-affinity";
import type { RoiInputs } from "@shared/roi-calculator";

const BRAND = {
  navy: "#12161D",
  cyan: "#C77A93",
  teal: "#0891B2",
  darkGrey: "#374151",
  lightGrey: "#F3F4F6",
  white: "#FFFFFF",
  green: "#10B981",
  amber: "#F59E0B",
  orange: "#F97316",
  red: "#EF4444",
};

const RGB = {
  navy: [PDF_BRAND_COLORS.navy.rgb.r, PDF_BRAND_COLORS.navy.rgb.g, PDF_BRAND_COLORS.navy.rgb.b] as [number, number, number],
  cyan: [PDF_BRAND_COLORS.cyan.rgb.r, PDF_BRAND_COLORS.cyan.rgb.g, PDF_BRAND_COLORS.cyan.rgb.b] as [number, number, number],
  teal: [PDF_BRAND_COLORS.teal.rgb.r, PDF_BRAND_COLORS.teal.rgb.g, PDF_BRAND_COLORS.teal.rgb.b] as [number, number, number],
  darkGrey: [PDF_BRAND_COLORS.darkGray.rgb.r, PDF_BRAND_COLORS.darkGray.rgb.g, PDF_BRAND_COLORS.darkGray.rgb.b] as [number, number, number],
  lightGrey: [PDF_BRAND_COLORS.lightGray.rgb.r, PDF_BRAND_COLORS.lightGray.rgb.g, PDF_BRAND_COLORS.lightGray.rgb.b] as [number, number, number],
  white: [PDF_BRAND_COLORS.white.rgb.r, PDF_BRAND_COLORS.white.rgb.g, PDF_BRAND_COLORS.white.rgb.b] as [number, number, number],
  cream: [PDF_BRAND_COLORS.cream.rgb.r, PDF_BRAND_COLORS.cream.rgb.g, PDF_BRAND_COLORS.cream.rgb.b] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  slateGray: [148, 163, 184] as [number, number, number],
  lightBlue: [232, 240, 252] as [number, number, number],
  borderGray: [204, 204, 204] as [number, number, number],
};

const SPACING = {
  xs: 3,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
};

const FONT_SIZES = {
  xs: 7,
  sm: 8,
  body: 9,
  subtitle: 11,
  title: 14,
  header: 18,
  hero: 24,
};

const LINE_HEIGHTS = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

interface PDFConfig {
  title: string;
  subtitle: string;
  tier: string;
  company: FcCompany;
  contact: FcContact;
  assessment: FcAssessment;
}

interface SectionBuilder {
  id: string;
  title: string;
  build: (doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives) => number;
}

function addHeader(doc: jsPDFType, config: PDFConfig): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  const headerY = 12;
  
  const headerLogo = getLogoTurquoise();
  if (headerLogo) {
    try {
      doc.addImage(headerLogo, "PNG", margin, 6, 25, 8);
    } catch (e) {
      doc.setFontSize(9);
      doc.setTextColor(...RGB.navy);
      doc.setFont("helvetica", "bold");
      doc.text("Constancia", margin, headerY);
    }
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Constancia", margin, headerY);
  }
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  doc.text(config.title, pageWidth / 2, headerY, { align: "center" });
  
  const assessmentDate = config.assessment?.startedAt 
    ? new Date(config.assessment.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : formatDateUK();
  doc.text(assessmentDate, pageWidth - margin, headerY, { align: "right" });
  
  doc.setDrawColor(...RGB.navy);
  doc.setLineWidth(0.5);
  doc.line(margin, 15, pageWidth - margin, 15);
  
  return PDF_MARGINS.top;
}

function addFooter(doc: jsPDFType, pageNum: number, totalPages: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGINS.left;
  const footerY = pageHeight - 12;
  
  doc.setDrawColor(...RGB.borderGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setFontSize(7);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  
  doc.text("Confidential", margin, footerY);
  
  const currentDate = formatDateUK();
  doc.text(`© Constancia Finance Transformation | ${currentDate}`, pageWidth / 2, footerY, { align: "center" });
  
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
}

function addSection(doc: jsPDFType, title: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  
  y += SPACING.lg;
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin - 2, y - 6, pageWidth - margin * 2 + 4, 16, 2, 2, "F");
  
  doc.setFontSize(FONT_SIZES.title + 2);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  
  doc.setFillColor(...RGB.teal);
  doc.rect(margin, y + 4, 60, 2, "F");
  
  return y + SPACING.xl;
}

type TextBoxType = 'key_finding' | 'red_flag' | 'action_item' | 'success_metric';

function drawTextBox(
  doc: jsPDFType,
  x: number,
  y: number,
  width: number,
  type: TextBoxType,
  title: string,
  content: string
): number {
  const accentColors: Record<TextBoxType, [number, number, number]> = {
    key_finding: RGB.navy,
    red_flag: RGB.red,
    action_item: RGB.amber,
    success_metric: RGB.green,
  };
  
  const accentColor = accentColors[type];
  const padding = 12;
  const titleHeight = 6;
  
  const contentLines = wrapText(doc, content, width - padding * 2 - 4);
  const contentHeight = contentLines.length * 4 + padding * 2 + titleHeight;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.rect(x, y, width, contentHeight, "F");
  
  doc.setFillColor(...accentColor);
  doc.rect(x, y, 4, contentHeight, "F");
  
  doc.setDrawColor(...RGB.borderGray);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, contentHeight, "S");
  
  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + padding, y + padding);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.setFont("helvetica", "normal");
  doc.text(contentLines, x + padding, y + padding + titleHeight + 2);
  
  return y + contentHeight + 8;
}

function drawMetricBox(
  doc: jsPDFType,
  x: number,
  y: number,
  value: string,
  label: string,
  unit?: string
): number {
  const boxWidth = 50;
  const boxHeight = 35;
  
  doc.setFillColor(...RGB.lightBlue);
  doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, "F");
  
  doc.setDrawColor(...RGB.borderGray);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, "S");
  
  doc.setFontSize(20);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  const valueText = unit ? `${value}${unit}` : value;
  doc.text(valueText, x + boxWidth / 2, y + 18, { align: "center" });
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + boxWidth / 2, y + 28, { align: "center" });
  
  return boxWidth + 8;
}

function drawProfessionalTable(
  doc: jsPDFType,
  x: number,
  y: number,
  headers: string[],
  rows: string[][],
  colWidths?: number[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - x - PDF_MARGINS.right;
  const numCols = headers.length;
  const defaultColWidth = tableWidth / numCols;
  const widths = colWidths || headers.map(() => defaultColWidth);
  const headerRowHeight = 10;
  const bodyRowHeight = 9;
  const cellPadding = 4;
  
  doc.setFillColor(...RGB.navy);
  doc.rect(x, y, tableWidth, headerRowHeight, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  let headerX = x + cellPadding;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], headerX, y + 7);
    headerX += widths[i];
  }
  y += headerRowHeight;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const isEven = rowIdx % 2 === 0;
    
    doc.setFillColor(...(isEven ? RGB.white : RGB.lightGrey));
    doc.rect(x, y, tableWidth, bodyRowHeight, "F");
    
    doc.setDrawColor(...RGB.borderGray);
    doc.setLineWidth(0.25);
    doc.line(x, y + bodyRowHeight, x + tableWidth, y + bodyRowHeight);
    
    doc.setTextColor(...RGB.darkGrey);
    let cellX = x + cellPadding;
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      doc.text(row[colIdx] || "", cellX, y + 6);
      cellX += widths[colIdx];
    }
    y += bodyRowHeight;
  }
  
  doc.setDrawColor(...RGB.borderGray);
  doc.setLineWidth(0.5);
  doc.rect(x, y - (rows.length * bodyRowHeight) - headerRowHeight, tableWidth, (rows.length * bodyRowHeight) + headerRowHeight, "S");
  
  return y + 8;
}

function wrapText(doc: jsPDFType, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

function checkNewPage(
  doc: jsPDFType, 
  currentY: number, 
  requiredSpace: number,
  minContentHeight: number = 0
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 30;
  const effectiveRequired = Math.max(requiredSpace, minContentHeight);
  
  if (currentY + effectiveRequired > pageHeight - bottomMargin) {
    doc.addPage();
    return 25;
  }
  return currentY;
}

function getScoreColor(score: number): [number, number, number] {
  if (score >= 75) return RGB.green;
  if (score >= 50) return RGB.amber;
  if (score >= 30) return RGB.orange;
  return RGB.red;
}

function getPriorityColor(priority: string): [number, number, number] {
  switch (priority) {
    case "critical": return RGB.red;
    case "high": return RGB.orange;
    case "medium": return RGB.amber;
    case "low": return RGB.green;
    default: return RGB.teal;
  }
}

function getTrafficLightColor(rating: 'red' | 'amber' | 'green'): [number, number, number] {
  switch (rating) {
    case 'red': return RGB.red;
    case 'amber': return RGB.amber;
    case 'green': return RGB.green;
    default: return RGB.teal;
  }
}

function drawProgressBar(
  doc: jsPDFType,
  x: number,
  y: number,
  width: number,
  height: number,
  value: number,
  maxValue: number,
  color: [number, number, number],
  showLabel: boolean = true
): number {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const filledWidth = (width * percentage) / 100;
  
  doc.setFillColor(235, 238, 242);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");
  
  if (filledWidth > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(x, y, filledWidth, height, height / 2, height / 2, "F");
  }
  
  if (showLabel) {
    doc.setFontSize(FONT_SIZES.xs);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "bold");
    const labelText = `${Math.round(percentage)}%`;
    doc.text(labelText, x + width + SPACING.sm, y + height - 1);
  }
  
  return y + height + SPACING.sm;
}

function drawKpiCard(
  doc: jsPDFType,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  value: string,
  subtitle: string,
  accentColor: [number, number, number]
): number {
  doc.setFillColor(250, 251, 252);
  doc.roundedRect(x, y, width, height, 4, 4, "F");
  
  doc.setFillColor(...accentColor);
  doc.rect(x, y + 4, 4, height - 8, "F");
  
  doc.setDrawColor(230, 233, 239);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, 4, 4, "S");
  
  doc.setFontSize(FONT_SIZES.sm);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  doc.text(title, x + SPACING.md, y + SPACING.lg);
  
  doc.setFontSize(FONT_SIZES.hero);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + SPACING.md, y + height / 2 + SPACING.sm);
  
  doc.setFontSize(FONT_SIZES.xs);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, x + SPACING.md, y + height - SPACING.md);
  
  return y + height + SPACING.md;
}

function drawGauge(
  doc: jsPDFType,
  centerX: number,
  centerY: number,
  radius: number,
  value: number,
  maxValue: number,
  color: [number, number, number]
): void {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const valueAngle = startAngle + ((endAngle - startAngle) * percentage) / 100;
  
  doc.setDrawColor(235, 238, 242);
  doc.setLineWidth(8);
  
  const segments = 30;
  for (let i = 0; i < segments; i++) {
    const angle1 = startAngle + (i / segments) * (endAngle - startAngle);
    const angle2 = startAngle + ((i + 1) / segments) * (endAngle - startAngle);
    const x1 = centerX + radius * Math.cos(angle1);
    const y1 = centerY + radius * Math.sin(angle1);
    const x2 = centerX + radius * Math.cos(angle2);
    const y2 = centerY + radius * Math.sin(angle2);
    doc.line(x1, y1, x2, y2);
  }
  
  doc.setDrawColor(...color);
  doc.setLineWidth(8);
  const valueSegments = Math.round((percentage / 100) * segments);
  for (let i = 0; i < valueSegments; i++) {
    const angle1 = startAngle + (i / segments) * (endAngle - startAngle);
    const angle2 = startAngle + ((i + 1) / segments) * (endAngle - startAngle);
    const x1 = centerX + radius * Math.cos(angle1);
    const y1 = centerY + radius * Math.sin(angle1);
    const x2 = centerX + radius * Math.cos(angle2);
    const y2 = centerY + radius * Math.sin(angle2);
    doc.line(x1, y1, x2, y2);
  }
  
  doc.setFontSize(FONT_SIZES.hero);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(percentage)}%`, centerX, centerY - 2, { align: "center" });
  
  doc.setFontSize(FONT_SIZES.xs);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  doc.text("Score", centerX, centerY + 6, { align: "center" });
}

type CalloutType = 'info' | 'warning' | 'success' | 'critical';

function drawCalloutCard(
  doc: jsPDFType,
  x: number,
  y: number,
  width: number,
  type: CalloutType,
  title: string,
  content: string,
  icon?: string
): number {
  const typeConfig: Record<CalloutType, { color: [number, number, number]; bgColor: [number, number, number]; defaultIcon: string }> = {
    info: { color: RGB.teal, bgColor: [240, 249, 255], defaultIcon: 'i' },
    warning: { color: RGB.amber, bgColor: [255, 251, 235], defaultIcon: '!' },
    success: { color: RGB.green, bgColor: [236, 253, 245], defaultIcon: '✓' },
    critical: { color: RGB.red, bgColor: [254, 242, 242], defaultIcon: '✗' },
  };
  
  const config = typeConfig[type];
  const padding = SPACING.md;
  const iconSize = 14;
  
  const contentLines = wrapText(doc, content, width - padding * 3 - iconSize);
  const contentHeight = Math.max(contentLines.length * 4.5 + padding * 2 + 10, 35);
  
  const gradientSteps = 5;
  for (let i = 0; i < gradientSteps; i++) {
    const ratio = i / gradientSteps;
    const r = Math.round(config.bgColor[0] + (255 - config.bgColor[0]) * ratio * 0.15);
    const g = Math.round(config.bgColor[1] + (255 - config.bgColor[1]) * ratio * 0.15);
    const b = Math.round(config.bgColor[2] + (255 - config.bgColor[2]) * ratio * 0.15);
    const stepWidth = width / gradientSteps;
    doc.setFillColor(r, g, b);
    if (i === 0) {
      doc.roundedRect(x + i * stepWidth, y, stepWidth + 1, contentHeight, 3, 0, "F");
    } else if (i === gradientSteps - 1) {
      doc.roundedRect(x + i * stepWidth - 1, y, stepWidth + 1, contentHeight, 0, 3, "F");
    } else {
      doc.rect(x + i * stepWidth, y, stepWidth + 1, contentHeight, "F");
    }
  }
  
  doc.setFillColor(...config.color);
  doc.rect(x, y, 4, contentHeight, "F");
  
  doc.setFillColor(...config.color);
  doc.circle(x + padding + iconSize / 2, y + padding + iconSize / 2 - 2, iconSize / 2, "F");
  doc.setFontSize(FONT_SIZES.sm);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(icon || config.defaultIcon, x + padding + iconSize / 2 - 2, y + padding + iconSize / 2 + 1);
  
  doc.setFontSize(FONT_SIZES.subtitle);
  doc.setTextColor(...config.color);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + padding + iconSize + SPACING.sm, y + padding + 3);
  
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...RGB.darkGrey);
  doc.setFont("helvetica", "normal");
  doc.text(contentLines, x + padding + iconSize + SPACING.sm, y + padding + 14);
  
  return y + contentHeight + SPACING.md;
}

function formatDimensionName(dimension: string): string {
  const nameMap: Record<string, string> = {
    'data_analytics': 'Data & Analytics',
    'consolidation_close': 'Consolidation & Close',
    'financial_planning_analysis': 'Financial Planning & Analysis',
    'technology_systems': 'Technology & Systems',
    'organisation_people': 'Organisation & People',
  };
  return nameMap[dimension] || dimension.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

interface DimensionRatingForPDF {
  dimension: string;
  score: number;
  rating: 'red' | 'amber' | 'green';
  summary: string;
  improvements: string[];
  strengths: string[];
}

function drawTrafficLightRatings(
  doc: jsPDFType,
  x: number,
  y: number,
  dimensionRatings: DimensionRatingForPDF[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = pageWidth - x - PDF_MARGINS.right;
  
  if (!dimensionRatings || dimensionRatings.length === 0) {
    return y;
  }
  
  for (const rating of dimensionRatings) {
    y = checkNewPage(doc, y, 55);
    
    const trafficColor = getTrafficLightColor(rating.rating);
    
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(x, y, cardWidth, 48, 3, 3, "F");
    
    doc.setFillColor(...trafficColor);
    doc.roundedRect(x, y, 4, 48, 2, 0, "F");
    
    doc.setFillColor(...trafficColor);
    doc.circle(x + 16, y + 12, 6, "F");
    
    doc.setFontSize(13);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text(formatDimensionName(rating.dimension), x + 28, y + 14);
    
    doc.setFontSize(11);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    doc.text(`${rating.score}%`, x + cardWidth - 40, y + 14);
    
    const ratingLabel = rating.rating.toUpperCase();
    doc.setFillColor(...trafficColor);
    doc.roundedRect(x + cardWidth - 35, y + 6, 30, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...RGB.white);
    doc.setFont("helvetica", "bold");
    doc.text(ratingLabel, x + cardWidth - 20, y + 13, { align: "center" });
    
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    const summaryLines = wrapText(doc, rating.summary, cardWidth - 20);
    doc.text(summaryLines.slice(0, 2), x + 12, y + 26);
    
    let bottomY = y + 38;
    if (rating.strengths && rating.strengths.length > 0) {
      doc.setFillColor(...RGB.green);
      doc.circle(x + 14, bottomY, 2, "F");
      doc.setFontSize(8);
      doc.setTextColor(...RGB.darkGrey);
      const strengthText = rating.strengths[0].substring(0, 50) + (rating.strengths[0].length > 50 ? "..." : "");
      doc.text(strengthText, x + 20, bottomY + 2);
    }
    
    if (rating.improvements && rating.improvements.length > 0) {
      doc.setFillColor(...RGB.amber);
      doc.circle(x + cardWidth / 2 + 4, bottomY, 2, "F");
      doc.setFontSize(8);
      const improvementText = rating.improvements[0].substring(0, 40) + (rating.improvements[0].length > 40 ? "..." : "");
      doc.text(improvementText, x + cardWidth / 2 + 10, bottomY + 2);
    }
    
    y += 56;
  }
  
  return y;
}

type DimensionScoreValue = number | { score: number; analysis?: string; recommendations?: string[] };

interface NormalizedDimensionScore {
  score: number;
  analysis: string;
  recommendations: string[];
  rating: 'red' | 'amber' | 'green';
}

function normalizeDimensionScore(val: DimensionScoreValue | null | undefined): NormalizedDimensionScore {
  if (val === null || val === undefined) {
    return { score: 0, analysis: '', recommendations: [], rating: 'red' };
  }
  
  let score: number;
  let analysis = '';
  let recommendations: string[] = [];
  
  if (typeof val === 'number') {
    score = val;
  } else if (typeof val === 'object' && val !== null) {
    score = typeof val.score === 'number' ? val.score : 0;
    analysis = val.analysis || '';
    recommendations = val.recommendations || [];
  } else {
    score = 0;
  }
  
  // Cap score at 100 to prevent display issues
  score = Math.min(100, Math.max(0, score));
  
  const rating: 'red' | 'amber' | 'green' = score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red';
  
  return { score, analysis, recommendations, rating };
}

function normalizeDimensionScores(
  raw: Record<string, DimensionScoreValue | any> | null | undefined
): Record<string, NormalizedDimensionScore> {
  if (!raw) return {};
  
  const result: Record<string, NormalizedDimensionScore> = {};
  for (const [key, val] of Object.entries(raw)) {
    result[key] = normalizeDimensionScore(val);
  }
  return result;
}

function drawSpiderChart(
  doc: jsPDFType,
  centerX: number,
  centerY: number,
  radius: number,
  dimensionScores: Record<string, DimensionScoreValue>,
  showBenchmarks: boolean = true
): void {
  const dimensions = Object.keys(dimensionScores);
  const numPoints = dimensions.length;
  
  if (numPoints < 3) return;
  
  const getScore = (val: DimensionScoreValue): number => {
    let score = 0;
    if (typeof val === 'number') score = val;
    else if (typeof val === 'object' && val !== null && typeof val.score === 'number') score = val.score;
    // Cap at 100 to prevent chart overflow
    return Math.min(100, Math.max(0, score));
  };
  
  const angleStep = (2 * Math.PI) / numPoints;
  const levels = 5;
  
  // Dimension key mapping for benchmarks
  const dimensionMapping: Record<string, keyof typeof DIMENSION_BENCHMARKS> = {
    financial_planning_analysis: 'D1_STRATEGY',
    consolidation_close: 'D2_PROCESS',
    organisation_people: 'D3_ORGANISATION',
    technology_systems: 'D4_TECHNOLOGY',
    data_analytics: 'D5_DATA',
    management_reporting: 'D6_KPIS',
    financial_controls_compliance: 'D7_GOVERNANCE',
    ai_machine_learning: 'D8_AI',
  };
  
  // Draw grid levels
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  for (let level = 1; level <= levels; level++) {
    const levelRadius = (radius * level) / levels;
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep - Math.PI / 2;
      points.push({
        x: centerX + levelRadius * Math.cos(angle),
        y: centerY + levelRadius * Math.sin(angle)
      });
    }
    
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      doc.line(points[i].x, points[i].y, points[next].x, points[next].y);
    }
  }
  
  // Draw axis lines
  doc.setDrawColor(180, 180, 180);
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    doc.line(centerX, centerY, x, y);
  }
  
  // Draw Industry Average benchmark (dashed green line)
  if (showBenchmarks) {
    const industryPoints: { x: number; y: number }[] = [];
    dimensions.forEach((dim, i) => {
      const benchmarkKey = dimensionMapping[dim];
      const benchmark = benchmarkKey ? DIMENSION_BENCHMARKS[benchmarkKey] : { industryAverage: 2.5 };
      const normalizedScore = benchmark.industryAverage / 5; // Convert 1-5 scale to 0-1
      const angle = i * angleStep - Math.PI / 2;
      const r = radius * normalizedScore;
      industryPoints.push({
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle)
      });
    });
    
    // Draw industry average polygon - green dashed
    doc.setDrawColor(34, 197, 94); // green-500
    doc.setLineWidth(1);
    doc.setLineDashPattern([2, 2], 0);
    for (let i = 0; i < industryPoints.length; i++) {
      const next = (i + 1) % industryPoints.length;
      if (isFinite(industryPoints[i].x) && isFinite(industryPoints[i].y)) {
        doc.line(industryPoints[i].x, industryPoints[i].y, industryPoints[next].x, industryPoints[next].y);
      }
    }
    doc.setLineDashPattern([], 0); // Reset dash pattern
    
    // Draw World Class benchmark (dashed gold/amber line)
    const worldClassPoints: { x: number; y: number }[] = [];
    dimensions.forEach((dim, i) => {
      const benchmarkKey = dimensionMapping[dim];
      const benchmark = benchmarkKey ? DIMENSION_BENCHMARKS[benchmarkKey] : { worldClass: 4.0 };
      const normalizedScore = benchmark.worldClass / 5; // Convert 1-5 scale to 0-1
      const angle = i * angleStep - Math.PI / 2;
      const r = radius * normalizedScore;
      worldClassPoints.push({
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle)
      });
    });
    
    // Draw world class polygon - amber dashed
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.setLineWidth(1);
    doc.setLineDashPattern([4, 2], 0);
    for (let i = 0; i < worldClassPoints.length; i++) {
      const next = (i + 1) % worldClassPoints.length;
      if (isFinite(worldClassPoints[i].x) && isFinite(worldClassPoints[i].y)) {
        doc.line(worldClassPoints[i].x, worldClassPoints[i].y, worldClassPoints[next].x, worldClassPoints[next].y);
      }
    }
    doc.setLineDashPattern([], 0); // Reset dash pattern
  }
  
  // Draw user's data points (solid navy line)
  const dataPoints: { x: number; y: number }[] = [];
  dimensions.forEach((dim, i) => {
    const score = getScore(dimensionScores[dim]);
    const normalizedScore = score / 100;
    const angle = i * angleStep - Math.PI / 2;
    const r = radius * normalizedScore;
    dataPoints.push({
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    });
  });
  
  doc.setDrawColor(...RGB.navy);
  doc.setLineWidth(2);
  
  for (let i = 0; i < dataPoints.length; i++) {
    const next = (i + 1) % dataPoints.length;
    if (isFinite(dataPoints[i].x) && isFinite(dataPoints[i].y) && isFinite(dataPoints[next].x) && isFinite(dataPoints[next].y)) {
      doc.line(dataPoints[i].x, dataPoints[i].y, dataPoints[next].x, dataPoints[next].y);
    }
  }
  
  // Draw data points as circles
  doc.setFillColor(...RGB.teal);
  for (const point of dataPoints) {
    if (isFinite(point.x) && isFinite(point.y)) {
      doc.circle(point.x, point.y, 2.5, "F");
    }
  }
  
  // Draw dimension labels
  doc.setFontSize(7);
  doc.setTextColor(...RGB.darkGrey);
  dimensions.forEach((dim, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 12;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    
    // Use short dimension label if available
    const benchmarkKey = dimensionMapping[dim];
    const labelInfo = benchmarkKey && DIMENSION_LABELS[benchmarkKey] ? DIMENSION_LABELS[benchmarkKey] : null;
    const dimName = labelInfo ? labelInfo.short : dim.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    const rawScore = dimensionScores[dim];
    const score = (typeof rawScore === 'object' && rawScore !== null ? rawScore.score : rawScore) || 0;
    const label = `${dimName}\n${score}%`;
    
    const align = x < centerX - 5 ? "right" : x > centerX + 5 ? "left" : "center";
    doc.text(label, x, y, { align: align as any });
  });
}

/**
 * Render a Tornado Chart for sensitivity analysis
 * Shows NPV swing for each driver with pessimistic (left/red) and optimistic (right/green) bars
 */
function renderTornadoChart(
  doc: jsPDFType,
  y: number,
  sensitivityGrid: SensitivityGrid
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  const chartWidth = pageWidth - margin * 2;
  const chartLeft = margin;
  
  const drivers = [...sensitivityGrid.drivers].sort((a, b) => b.npvSwing - a.npvSwing);
  
  if (drivers.length === 0) {
    return y;
  }
  
  const barHeight = 10;
  const barGap = 4;
  const labelWidth = 55;
  const valueWidth = 30;
  const chartAreaWidth = chartWidth - labelWidth - valueWidth * 2;
  const centerX = chartLeft + labelWidth + valueWidth + chartAreaWidth / 2;
  
  const chartHeight = drivers.length * (barHeight + barGap) + 50;
  y = checkNewPage(doc, y, chartHeight);
  
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Sensitivity Analysis - Tornado Chart", margin, y);
  y += 6;
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  doc.text("NPV impact of ±20% change in key drivers (£000s)", margin, y);
  y += 10;
  
  const legendY = y;
  doc.setFillColor(...RGB.red);
  doc.rect(pageWidth - margin - 80, legendY - 3, 8, 4, "F");
  doc.setFontSize(7);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Pessimistic", pageWidth - margin - 70, legendY);
  
  doc.setFillColor(...RGB.green);
  doc.rect(pageWidth - margin - 40, legendY - 3, 8, 4, "F");
  doc.text("Optimistic", pageWidth - margin - 30, legendY);
  y += 8;
  
  doc.setDrawColor(...RGB.slateGray);
  doc.setLineWidth(0.5);
  doc.line(centerX, y, centerX, y + drivers.length * (barHeight + barGap));
  
  const maxSwing = Math.max(...drivers.map(d => d.npvSwing));
  const scale = maxSwing > 0 ? (chartAreaWidth / 2) / maxSwing : 1;
  
  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    const rowY = y + i * (barHeight + barGap);
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    const truncatedName = driver.driverName.length > 20 
      ? driver.driverName.substring(0, 18) + "..." 
      : driver.driverName;
    doc.text(truncatedName, chartLeft, rowY + barHeight / 2 + 2);
    
    const pessimisticDelta = driver.variations.pessimistic.deltaFromBaseline;
    const optimisticDelta = driver.variations.optimistic.deltaFromBaseline;
    
    if (pessimisticDelta < 0) {
      const barWidth = Math.abs(pessimisticDelta) * scale;
      doc.setFillColor(...RGB.red);
      doc.rect(centerX - barWidth, rowY, barWidth, barHeight, "F");
      
      doc.setFontSize(7);
      doc.setTextColor(...RGB.red);
      const pessValue = `${Math.round(pessimisticDelta / 1000)}k`;
      doc.text(pessValue, centerX - barWidth - 2, rowY + barHeight / 2 + 2, { align: "right" });
    } else if (pessimisticDelta > 0) {
      const barWidth = pessimisticDelta * scale;
      doc.setFillColor(...RGB.amber);
      doc.rect(centerX, rowY, barWidth, barHeight, "F");
    }
    
    if (optimisticDelta > 0) {
      const barWidth = optimisticDelta * scale;
      doc.setFillColor(...RGB.green);
      doc.rect(centerX, rowY, barWidth, barHeight, "F");
      
      doc.setFontSize(7);
      doc.setTextColor(...RGB.green);
      const optValue = `+${Math.round(optimisticDelta / 1000)}k`;
      doc.text(optValue, centerX + barWidth + 2, rowY + barHeight / 2 + 2);
    } else if (optimisticDelta < 0) {
      const barWidth = Math.abs(optimisticDelta) * scale;
      doc.setFillColor(...RGB.orange);
      doc.rect(centerX - barWidth, rowY, barWidth, barHeight, "F");
    }
    
    doc.setFontSize(7);
    doc.setTextColor(...RGB.slateGray);
    const swingText = `±${Math.round(driver.npvSwing / 1000)}k`;
    doc.text(swingText, pageWidth - margin, rowY + barHeight / 2 + 2, { align: "right" });
  }
  
  y += drivers.length * (barHeight + barGap) + 8;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, y, chartWidth, 16, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Key Insight: ", margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...RGB.darkGrey);
  const summaryLines = wrapText(doc, sensitivityGrid.summary, chartWidth - 25);
  doc.text(summaryLines[0] || "", margin + 25, y + 6);
  if (summaryLines[1]) {
    doc.text(summaryLines[1], margin + 4, y + 12);
  }
  
  return y + 24;
}

/**
 * Render a Waterfall Chart for cashflow analysis
 * Shows cumulative cash position over implementation timeline with costs (red) and benefits (green)
 */
function renderWaterfallChart(
  doc: jsPDFType,
  y: number,
  workingCapital: WorkingCapitalAnalysis
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  const chartWidth = pageWidth - margin * 2;
  const chartHeight = 80;
  const chartLeft = margin + 20;
  const chartRight = pageWidth - margin - 10;
  const chartBottom = y + chartHeight + 40;
  const chartTop = y + 30;
  const barAreaWidth = chartRight - chartLeft;
  
  const totalChartHeight = chartHeight + 70;
  y = checkNewPage(doc, y, totalChartHeight);
  
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Cash Flow Waterfall - Implementation Timeline", margin, y);
  y += 6;
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  doc.text("Cumulative cash position showing implementation costs and benefit realisation (£000s)", margin, y);
  y += 10;
  
  const legendY = y;
  doc.setFillColor(...RGB.red);
  doc.rect(pageWidth - margin - 110, legendY - 3, 8, 4, "F");
  doc.setFontSize(7);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Outflow", pageWidth - margin - 100, legendY);
  
  doc.setFillColor(...RGB.green);
  doc.rect(pageWidth - margin - 70, legendY - 3, 8, 4, "F");
  doc.text("Inflow", pageWidth - margin - 60, legendY);
  
  doc.setDrawColor(...RGB.teal);
  doc.setLineWidth(1.5);
  doc.line(pageWidth - margin - 40, legendY - 1, pageWidth - margin - 30, legendY - 1);
  doc.text("Cumulative", pageWidth - margin - 28, legendY);
  
  const flows = workingCapital.monthlyFlows;
  if (!flows || flows.length === 0) {
    return y + 20;
  }
  
  const sampleInterval = Math.max(1, Math.floor(flows.length / 12));
  const sampledFlows = flows.filter((_, i) => i % sampleInterval === 0 || i === flows.length - 1);
  
  const allValues = flows.flatMap(f => [f.cumulativePosition, f.outflow, f.inflow]);
  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;
  
  const scaleY = (val: number) => {
    const normalized = (val - minVal) / range;
    return chartBottom - normalized * chartHeight;
  };
  
  const zeroLine = scaleY(0);
  doc.setDrawColor(...RGB.slateGray);
  doc.setLineWidth(0.5);
  doc.line(chartLeft, zeroLine, chartRight, zeroLine);
  
  doc.setDrawColor(...RGB.borderGray);
  doc.setLineWidth(0.3);
  doc.line(chartLeft, chartTop, chartLeft, chartBottom);
  
  const barWidth = barAreaWidth / sampledFlows.length - 2;
  
  for (let i = 0; i < sampledFlows.length; i++) {
    const flow = sampledFlows[i];
    const x = chartLeft + i * (barAreaWidth / sampledFlows.length) + 1;
    
    if (flow.outflow > 0) {
      const barTop = scaleY(0);
      const barBottom = scaleY(-flow.outflow);
      const barH = Math.abs(barBottom - barTop);
      doc.setFillColor(...RGB.red);
      doc.rect(x, barTop, barWidth / 2, barH, "F");
    }
    
    if (flow.inflow > 0) {
      const barTop = scaleY(flow.inflow);
      const barBottom = scaleY(0);
      const barH = Math.abs(barBottom - barTop);
      doc.setFillColor(...RGB.green);
      doc.rect(x + barWidth / 2, barTop, barWidth / 2, barH, "F");
    }
  }
  
  doc.setDrawColor(...RGB.teal);
  doc.setLineWidth(1.5);
  for (let i = 0; i < sampledFlows.length - 1; i++) {
    const x1 = chartLeft + i * (barAreaWidth / sampledFlows.length) + barWidth / 2;
    const x2 = chartLeft + (i + 1) * (barAreaWidth / sampledFlows.length) + barWidth / 2;
    const y1 = scaleY(sampledFlows[i].cumulativePosition);
    const y2 = scaleY(sampledFlows[i + 1].cumulativePosition);
    doc.line(x1, y1, x2, y2);
  }
  
  doc.setFillColor(...RGB.navy);
  for (let i = 0; i < sampledFlows.length; i++) {
    const x = chartLeft + i * (barAreaWidth / sampledFlows.length) + barWidth / 2;
    const flowY = scaleY(sampledFlows[i].cumulativePosition);
    doc.circle(x, flowY, 1.5, "F");
  }
  
  doc.setFontSize(6);
  doc.setTextColor(...RGB.slateGray);
  for (let i = 0; i < sampledFlows.length; i++) {
    if (i % 2 === 0 || i === sampledFlows.length - 1) {
      const x = chartLeft + i * (barAreaWidth / sampledFlows.length) + barWidth / 2;
      doc.text(`M${sampledFlows[i].month}`, x, chartBottom + 6, { align: "center" });
    }
  }
  
  doc.setFontSize(6);
  doc.setTextColor(...RGB.darkGrey);
  const yAxisValues = [maxVal, maxVal / 2, 0, minVal / 2, minVal].filter(v => !isNaN(v));
  for (const val of yAxisValues) {
    const labelY = scaleY(val);
    if (labelY >= chartTop && labelY <= chartBottom) {
      doc.text(`${Math.round(val / 1000)}k`, chartLeft - 3, labelY + 1, { align: "right" });
    }
  }
  
  const goLiveMonth = 12;
  if (goLiveMonth <= flows.length) {
    const goLiveIndex = sampledFlows.findIndex(f => f.month >= goLiveMonth);
    if (goLiveIndex >= 0) {
      const goLiveX = chartLeft + goLiveIndex * (barAreaWidth / sampledFlows.length) + barWidth / 2;
      doc.setDrawColor(...RGB.navy);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(goLiveX, chartTop, goLiveX, chartBottom);
      doc.setLineDashPattern([], 0);
      
      doc.setFillColor(...RGB.navy);
      doc.setFontSize(6);
      doc.setTextColor(...RGB.navy);
      doc.text("Go-Live", goLiveX, chartTop - 2, { align: "center" });
    }
  }
  
  if (workingCapital.breakEvenMonth > 0 && workingCapital.breakEvenMonth <= flows.length) {
    const beIndex = sampledFlows.findIndex(f => f.month >= workingCapital.breakEvenMonth);
    if (beIndex >= 0) {
      const beX = chartLeft + beIndex * (barAreaWidth / sampledFlows.length) + barWidth / 2;
      doc.setDrawColor(...RGB.green);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(beX, chartTop, beX, chartBottom);
      doc.setLineDashPattern([], 0);
      
      doc.setFontSize(6);
      doc.setTextColor(...RGB.green);
      doc.text("Breakeven", beX, chartTop - 2, { align: "center" });
    }
  }
  
  const summaryY = chartBottom + 14;
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, summaryY, chartWidth, 20, 2, 2, "F");
  
  const metricSpacing = chartWidth / 4;
  doc.setFontSize(8);
  
  doc.setTextColor(...RGB.red);
  doc.setFont("helvetica", "bold");
  doc.text(`£${Math.round(Math.abs(workingCapital.peakFundingRequirement) / 1000)}k`, margin + metricSpacing * 0.5, summaryY + 8, { align: "center" });
  doc.setTextColor(...RGB.darkGrey);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Peak Funding", margin + metricSpacing * 0.5, summaryY + 14, { align: "center" });
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text(`Month ${workingCapital.peakFundingMonth}`, margin + metricSpacing * 1.5, summaryY + 8, { align: "center" });
  doc.setTextColor(...RGB.darkGrey);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Peak Month", margin + metricSpacing * 1.5, summaryY + 14, { align: "center" });
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.green);
  doc.setFont("helvetica", "bold");
  doc.text(`Month ${workingCapital.breakEvenMonth}`, margin + metricSpacing * 2.5, summaryY + 8, { align: "center" });
  doc.setTextColor(...RGB.darkGrey);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Breakeven", margin + metricSpacing * 2.5, summaryY + 14, { align: "center" });
  
  const profileLabels: Record<string, string> = {
    front_loaded: "Front-Loaded",
    steady: "Steady",
    back_loaded: "Back-Loaded",
  };
  doc.setFontSize(8);
  doc.setTextColor(...RGB.teal);
  doc.setFont("helvetica", "bold");
  doc.text(profileLabels[workingCapital.cashFlowProfile] || workingCapital.cashFlowProfile, margin + metricSpacing * 3.5, summaryY + 8, { align: "center" });
  doc.setTextColor(...RGB.darkGrey);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Profile", margin + metricSpacing * 3.5, summaryY + 14, { align: "center" });
  
  return summaryY + 28;
}

function drawActionPriorityHeatmap(
  doc: jsPDFType,
  x: number,
  y: number,
  items: ActionPlanItem[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - x - PDF_MARGINS.right;
  const colWidths = [tableWidth * 0.40, tableWidth * 0.18, tableWidth * 0.20, tableWidth * 0.22];
  const headerRowHeight = 10;
  const bodyRowHeight = 18;
  
  doc.setFontSize(13);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Action Priority Matrix", x, y);
  
  doc.setFillColor(...RGB.teal);
  doc.rect(x, y + 3, 35, 2, "F");
  y += 16;
  
  const headers = ["Action", "Priority", "Effort", "Timeframe"];
  doc.setFillColor(...RGB.navy);
  doc.rect(x, y, tableWidth, headerRowHeight, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  let headerX = x + 4;
  headers.forEach((header, idx) => {
    doc.text(header, headerX, y + 7);
    headerX += colWidths[idx];
  });
  y += headerRowHeight;
  
  const safeItems = items ?? [];
  if (safeItems.length === 0) {
    doc.setFillColor(...RGB.lightGrey);
    doc.rect(x, y, tableWidth, 20, "F");
    doc.setFontSize(9);
    doc.setTextColor(...RGB.slateGray);
    doc.setFont("helvetica", "normal");
    doc.text("Action items will be available upon report regeneration.", x + 8, y + 12);
    return y + 28;
  }
  
  const sortedItems = [...safeItems].sort((a, b) => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a?.priority] ?? 4) - (priorityOrder[b?.priority] ?? 4);
  }).slice(0, 6);
  
  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    const priority = item?.priority ?? "medium";
    const priorityColor = getPriorityColor(priority);
    const isEven = i % 2 === 0;
    
    doc.setFillColor(...(isEven ? RGB.white : RGB.lightGrey));
    doc.rect(x, y, tableWidth, bodyRowHeight, "F");
    
    doc.setDrawColor(...RGB.borderGray);
    doc.setLineWidth(0.25);
    doc.line(x, y + bodyRowHeight, x + tableWidth, y + bodyRowHeight);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    const title = item?.title ?? "Action Item";
    const truncatedTitle = title.length > 45 ? title.substring(0, 42) + "..." : title;
    doc.text(truncatedTitle, x + 4, y + 11);
    
    doc.setFillColor(...priorityColor);
    doc.roundedRect(x + colWidths[0] + 2, y + 5, 22, 8, 2, 2, "F");
    doc.setTextColor(...RGB.white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(priority.toUpperCase(), x + colWidths[0] + 4, y + 11);
    
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(item?.effort ?? "TBD", x + colWidths[0] + colWidths[1] + 4, y + 11);
    doc.text(item?.timeframe ?? "TBD", x + colWidths[0] + colWidths[1] + colWidths[2] + 4, y + 11);
    
    y += bodyRowHeight;
  }
  
  doc.setDrawColor(...RGB.borderGray);
  doc.setLineWidth(0.5);
  doc.rect(x, y - (sortedItems.length * bodyRowHeight) - headerRowHeight, tableWidth, (sortedItems.length * bodyRowHeight) + headerRowHeight, "S");
  
  return y + 12;
}

function drawMaturityProgressionChart(
  doc: jsPDFType,
  x: number,
  y: number,
  currentScore: number,
  targetScore: number = 75
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const chartWidth = pageWidth - 60;
  const chartHeight = 40;
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.navy);
  doc.text("Finance Capability Progression", x, y);
  y += 10;
  
  const levels = [
    { name: "Foundational", min: 0, max: 20, color: RGB.red },
    { name: "Developing", min: 20, max: 40, color: RGB.orange },
    { name: "Established", min: 40, max: 60, color: RGB.amber },
    { name: "Advanced", min: 60, max: 80, color: RGB.teal },
    { name: "Leading", min: 80, max: 100, color: RGB.green },
  ];
  
  const levelWidth = chartWidth / 5;
  levels.forEach((level, idx) => {
    doc.setFillColor(...level.color, 0.3);
    doc.rect(x + (idx * levelWidth), y, levelWidth, chartHeight, "F");
    
    doc.setFontSize(7);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(level.name, x + (idx * levelWidth) + 2, y + chartHeight + 8);
  });
  
  const currentX = x + (currentScore / 100) * chartWidth;
  doc.setFillColor(...RGB.navy);
  doc.circle(currentX, y + chartHeight / 2, 6, "F");
  doc.setTextColor(...RGB.white);
  doc.setFontSize(6);
  doc.text(`${currentScore}%`, currentX - 5, y + chartHeight / 2 + 2);
  
  const targetX = x + (targetScore / 100) * chartWidth;
  doc.setDrawColor(...RGB.teal);
  doc.setLineWidth(2);
  doc.line(targetX, y, targetX, y + chartHeight);
  doc.setFontSize(6);
  doc.setTextColor(...RGB.teal);
  doc.text("Target", targetX - 5, y - 2);
  
  if (currentScore < targetScore) {
    doc.setDrawColor(...RGB.teal);
    doc.setLineWidth(1);
    const arrowY = y + chartHeight / 2;
    doc.line(currentX + 8, arrowY, targetX - 4, arrowY);
    doc.line(targetX - 8, arrowY - 3, targetX - 4, arrowY);
    doc.line(targetX - 8, arrowY + 3, targetX - 4, arrowY);
  }
  
  return y + chartHeight + 15;
}

function drawScoreBreakdown(
  doc: jsPDFType,
  x: number,
  y: number,
  dimensionScores: Record<string, { score: number } | number>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const barWidth = pageWidth - 80;
  const barHeight = 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.navy);
  doc.text("Dimension Score Breakdown", x, y);
  y += 12;
  
  const sorted = Object.entries(dimensionScores)
    .map(([key, val]) => {
      const score = (typeof val === 'object' && val !== null ? val.score : val) || 0;
      return [key, score] as [string, number];
    })
    .sort((a, b) => b[1] - a[1]);
  
  for (const [dimension, score] of sorted) {
    const dimName = dimension.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    const truncatedName = dimName.length > 25 ? dimName.substring(0, 22) + "..." : dimName;
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(truncatedName, x, y + 5);
    
    const barX = x + 60;
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(barX, y, barWidth - 60, barHeight, 2, 2, "F");
    
    const filledWidth = ((barWidth - 60) * score) / 100;
    const color = getScoreColor(score);
    doc.setFillColor(...color);
    doc.roundedRect(barX, y, filledWidth, barHeight, 2, 2, "F");
    
    doc.setTextColor(...RGB.navy);
    doc.text(`${score}%`, barX + barWidth - 55, y + 5);
    
    y += barHeight + 6;
  }
  
  return y + 5;
}

function buildCoverPage(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGINS.left;
  
  doc.setFillColor(...RGB.navy);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  const coverLogo = getLogoTurquoise();
  if (coverLogo) {
    try {
      doc.addImage(coverLogo, "PNG", margin, 25, 45, 15);
    } catch (e) {
      doc.setFontSize(28);
      doc.setTextColor(...RGB.cyan);
      doc.setFont("helvetica", "bold");
      doc.text("Constancia", margin, 40);
    }
  } else {
    doc.setFontSize(28);
    doc.setTextColor(...RGB.cyan);
    doc.setFont("helvetica", "bold");
    doc.text("Constancia", margin, 40);
  }
  
  doc.setFontSize(28);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "bold");
  doc.text("FinanceCompass", margin, 85);
  
  const tierLabel = config.tier === "pre_assessment" ? "Pre-Assessment Report" : "Comprehensive Assessment Report";
  doc.setFontSize(14);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  doc.text(tierLabel, margin, 102);
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.cyan);
  doc.text("Navigate Your Finance Transformation Journey with Confidence", margin, 122);
  
  doc.setDrawColor(...RGB.teal);
  doc.setLineWidth(2);
  doc.line(margin, 135, margin + 80, 135);
  
  doc.setFontSize(20);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "bold");
  doc.text(config.company.name, margin, pageHeight / 2 - 15);
  
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(`Prepared for: ${config.contact.firstName} ${config.contact.lastName}`, margin, pageHeight / 2 + 8);
  if (config.contact.roleTitle) {
    doc.setFontSize(11);
    doc.setTextColor(...RGB.slateGray);
    doc.text(config.contact.roleTitle, margin, pageHeight / 2 + 22);
  }
  
  const assessmentDate = config.assessment.startedAt 
    ? new Date(config.assessment.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : formatDateUK();
  doc.setFontSize(11);
  doc.setTextColor(...RGB.slateGray);
  doc.text(`Assessment Date: ${assessmentDate}`, margin, pageHeight / 2 + 40);
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "bold");
  doc.text("Finance Transformed, Designed for Change, ", margin, pageHeight - 75);
  const taglineWidth = doc.getTextWidth("Finance Transformed, Designed for Change, ");
  doc.setTextColor(...RGB.cyan);
  doc.setFont("helvetica", "italic");
  doc.text("Driven by Technology.", margin + taglineWidth, pageHeight - 75);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "normal");
  doc.text(PDF_CONTACT_INFO.address, margin, pageHeight - 58);
  doc.text(`${PDF_CONTACT_INFO.email}  |  ${PDF_CONTACT_INFO.website}`, margin, pageHeight - 46);
  doc.text(PDF_CONTACT_INFO.linkedin, margin, pageHeight - 34);
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.slateGray);
  doc.text(`Generated: ${formatDateUK()}  |  Confidential`, margin, pageHeight - 20);
  
  return pageHeight;
}

function buildExecutiveSummarySection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = addSection(doc, "Executive Summary", y);
  
  const execSummary = narratives?.executiveSummary;
  const opening = execSummary?.opening ?? "Assessment analysis is being processed. Please regenerate the report for complete analysis.";
  const keyInsights = execSummary?.keyInsights ?? [];
  const strategicContext = execSummary?.strategicContext ?? "Detailed strategic analysis will be available upon report regeneration.";
  const callToAction = execSummary?.callToAction ?? "Contact Constancia to discuss your transformation journey.";
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.darkGrey);
  const openingLines = wrapText(doc, opening, pageWidth - 40);
  doc.text(openingLines, 20, y);
  y += openingLines.length * 6 + 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.navy);
  doc.text("Key Insights:", 20, y);
  y += 8;
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  
  if (keyInsights.length === 0) {
    doc.text("• Analysis pending - please regenerate report for detailed insights", 25, y);
    y += 8;
  } else {
    for (const insight of keyInsights) {
      const lines = wrapText(doc, `• ${insight}`, pageWidth - 50);
      y = checkNewPage(doc, y, lines.length * 5);
      doc.text(lines, 25, y);
      y += lines.length * 5 + 3;
    }
  }
  
  y += 5;
  y = checkNewPage(doc, y, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  const contextLines = wrapText(doc, strategicContext, pageWidth - 40);
  doc.text(contextLines, 20, y);
  y += contextLines.length * 5 + 10;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(20, y, pageWidth - 40, 25, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.teal);
  const ctaLines = wrapText(doc, callToAction, pageWidth - 50);
  doc.text(ctaLines, 25, y + 10);
  
  return y + 35;
}

function buildReadinessScoreSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  const score = config.assessment.epmReadinessScore || config.assessment.overallMaturityScore || 0;
  const readinessLevel = score >= 75 ? "Advanced" : score >= 50 ? "Established" : score >= 30 ? "Developing" : "Foundational";
  const levelColor = getScoreColor(score);
  
  y = addSection(doc, "EPM Readiness Score", y);
  
  const cardWidth = 85;
  const cardHeight = 55;
  const cardGap = SPACING.md;
  
  drawGauge(doc, margin + 45, y + 30, 35, score, 100, levelColor);
  
  const kpiStartX = margin + 100;
  drawKpiCard(doc, kpiStartX, y, cardWidth, cardHeight, "Readiness Level", readinessLevel, score >= 50 ? "Above Average" : "Improvement Needed", levelColor);
  drawKpiCard(doc, kpiStartX + cardWidth + cardGap, y, cardWidth, cardHeight, "Overall Score", `${score}%`, "Out of 100%", levelColor);
  
  y += cardHeight + SPACING.lg;
  
  const progressBarWidth = pageWidth - margin * 2;
  doc.setFontSize(FONT_SIZES.sm);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Score Progress", margin, y);
  y += SPACING.sm;
  
  y = drawProgressBar(doc, margin, y, progressBarWidth - 30, 10, score, 100, levelColor, true);
  y += SPACING.md;
  
  y = drawMaturityProgressionChart(doc, margin, y, score);
  
  const dimensionScores = config.assessment.dimensionScores as Record<string, { score: number }> || {};
  if (Object.keys(dimensionScores).length > 0) {
    y = checkNewPage(doc, y, 100, 80);
    y = drawScoreBreakdown(doc, margin, y, dimensionScores);
  }
  
  return y;
}

function buildDimensionAnalysisSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const dimensionScores = config.assessment.dimensionScores as Record<string, DimensionScoreValue> || {};
  
  if (Object.keys(dimensionScores).length < 3) {
    return y;
  }
  
  doc.addPage();
  y = 25;
  
  y = addSection(doc, "Dimension Analysis", y);
  
  const chartCenterX = pageWidth / 2;
  const chartCenterY = y + 70;
  const chartRadius = 50;
  
  drawSpiderChart(doc, chartCenterX, chartCenterY, chartRadius, dimensionScores);
  
  // Add legend for the chart
  y = chartCenterY + chartRadius + 20;
  const legendX = 25;
  doc.setFontSize(7);
  
  // Your Score legend
  doc.setFillColor(...RGB.teal);
  doc.circle(legendX, y, 2, "F");
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Your Score", legendX + 5, y + 1);
  
  // Industry Average legend
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(legendX + 45, y, legendX + 55, y);
  doc.setLineDashPattern([], 0);
  doc.text("Industry Average", legendX + 58, y + 1);
  
  // World Class legend
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(1);
  doc.setLineDashPattern([4, 2], 0);
  doc.line(legendX + 110, y, legendX + 120, y);
  doc.setLineDashPattern([], 0);
  doc.text("World Class", legendX + 123, y + 1);
  
  y += 15;
  
  const dimensionNarratives = narratives?.dimensionNarratives ?? [];
  
  if (dimensionNarratives.length === 0) {
    y = checkNewPage(doc, y, 30);
    doc.setFontSize(10);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Detailed dimension analysis will be available upon report regeneration.", 20, y);
    return y + 20;
  }
  
  for (const narrative of dimensionNarratives) {
    y = checkNewPage(doc, y, 50);
    
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(20, y, pageWidth - 40, 45, 3, 3, "F");
    
    doc.setFontSize(11);
    doc.setTextColor(...RGB.navy);
    doc.text(narrative?.dimensionLabel ?? "Dimension", 25, y + 10);
    
    const score = narrative?.score ?? 0;
    const scoreColor = getScoreColor(score);
    doc.setFillColor(...scoreColor);
    doc.roundedRect(pageWidth - 55, y + 5, 30, 8, 2, 2, "F");
    doc.setTextColor(...RGB.white);
    doc.setFontSize(8);
    doc.text(`${score}%`, pageWidth - 50, y + 11);
    
    doc.setFontSize(7);
    doc.setTextColor(...RGB.teal);
    doc.text(narrative?.maturityLevel ?? "Pending", pageWidth - 55, y + 20);
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    const narrativeText = narrative?.narrative ?? "Analysis pending.";
    const narrativeLines = wrapText(doc, narrativeText, pageWidth - 80);
    doc.text(narrativeLines.slice(0, 3), 25, y + 22);
    
    const recommendations = narrative?.recommendations ?? [];
    if (recommendations.length > 0) {
      doc.setTextColor(...RGB.teal);
      doc.setFontSize(7);
      doc.text(`Key action: ${recommendations[0]}`, 25, y + 40);
    }
    
    y += 52;
  }
  
  return y;
}

function buildKeyFindingsSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = checkNewPage(doc, y, 60);
  y = addSection(doc, "Key Findings & Gaps", y);
  
  const keyFindings = narratives?.keyFindings;
  const overallAssessment = keyFindings?.overallAssessment ?? "Assessment analysis is being processed. Please regenerate report for detailed findings.";
  const findings = keyFindings?.findings ?? [];
  const gapsIdentified = keyFindings?.gapsIdentified ?? [];
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  const assessmentLines = wrapText(doc, overallAssessment, pageWidth - 40);
  doc.text(assessmentLines, 20, y);
  y += assessmentLines.length * 5 + 10;
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.text("Findings", 20, y);
  y += 8;
  
  if (findings.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Detailed findings will be available upon report regeneration.", 20, y);
    y += 15;
  } else {
    for (const finding of findings.slice(0, 5)) {
      y = checkNewPage(doc, y, 25);
      
      const impact = finding?.impact ?? "medium";
      const impactColor = impact === "high" ? RGB.red : impact === "medium" ? RGB.amber : RGB.green;
      doc.setFillColor(...impactColor);
      doc.roundedRect(20, y - 3, 12, 5, 1, 1, "F");
      doc.setTextColor(...RGB.white);
      doc.setFontSize(5);
      doc.text(impact.toUpperCase(), 22, y);
      
      doc.setFontSize(9);
      doc.setTextColor(...RGB.darkGrey);
      const findingText = finding?.finding ?? "Finding pending analysis.";
      const findingLines = wrapText(doc, findingText, pageWidth - 55);
      doc.text(findingLines, 35, y);
      y += findingLines.length * 4 + 6;
    }
  }
  
  if (gapsIdentified.length > 0) {
    y += 8;
    y = checkNewPage(doc, y, 40);
    
    doc.setFontSize(11);
    doc.setTextColor(...RGB.navy);
    doc.text("Gaps Identified", 20, y);
    y += 8;
    
    for (const gap of gapsIdentified.slice(0, 3)) {
      y = checkNewPage(doc, y, 20);
      
      doc.setFontSize(9);
      doc.setTextColor(...RGB.navy);
      doc.text(gap?.area ?? "Area", 20, y);
      
      doc.setFontSize(8);
      doc.setTextColor(...RGB.darkGrey);
      const currentState = gap?.currentState ?? "Current state pending";
      const targetState = gap?.targetState ?? "Target state pending";
      doc.text(`Current: ${currentState} → Target: ${targetState}`, 25, y + 6);
      
      y += 15;
    }
  }
  
  return y;
}

function buildRecommendationsSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.addPage();
  y = 25;
  
  y = addSection(doc, "Prioritised Recommendations", y);
  
  const actionPlan = narratives?.actionPlan;
  const summary = actionPlan?.summary ?? "Recommendations will be available after AI processing completes.";
  const items = actionPlan?.items ?? [];
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  const summaryLines = wrapText(doc, summary, pageWidth - 40);
  doc.text(summaryLines, 20, y);
  y += summaryLines.length * 5 + 10;
  
  if (items.length > 0) {
    y = drawActionPriorityHeatmap(doc, 20, y, items);
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Action items will be available upon report regeneration.", 20, y);
    y += 15;
  }
  
  y = checkNewPage(doc, y, 60);
  y = addSection(doc, "Detailed Action Items", y);
  
  if (items.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Detailed action items will be available upon report regeneration.", 20, y);
    return y + 15;
  }
  
  for (const item of items.slice(0, 6)) {
    y = checkNewPage(doc, y, 35);
    
    const priority = item?.priority ?? "medium";
    const priorityColor = getPriorityColor(priority);
    doc.setFillColor(...priorityColor);
    doc.roundedRect(20, y - 3, 18, 6, 1, 1, "F");
    doc.setFontSize(6);
    doc.setTextColor(...RGB.white);
    doc.text(priority.toUpperCase(), 22, y);
    
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.text(item?.title ?? "Action Item", 42, y);
    y += 8;
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    const description = item?.description ?? "Description pending.";
    const descLines = wrapText(doc, description, pageWidth - 50);
    doc.text(descLines.slice(0, 2), 25, y);
    y += descLines.slice(0, 2).length * 4 + 4;
    
    doc.setTextColor(...RGB.green);
    doc.setFontSize(7);
    doc.text(`Benefit: ${item?.expectedBenefit ?? "Pending analysis"}`, 25, y);
    
    doc.setTextColor(...RGB.teal);
    doc.text(`Timeframe: ${item?.timeframe ?? "TBD"} | Effort: ${item?.effort ?? "TBD"}`, 100, y);
    
    y += 10;
  }
  
  return y;
}

function buildQuickWinsSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const quickWins = narratives?.actionPlan?.quickWins ?? [];
  
  if (quickWins.length === 0) return y;
  
  y = checkNewPage(doc, y, 60);
  y = addSection(doc, "Quick Wins", y);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("High-impact, low-effort actions to achieve early momentum:", 20, y);
  y += 10;
  
  for (const win of quickWins) {
    y = checkNewPage(doc, y, 25);
    
    doc.setFillColor(...RGB.green, 0.1);
    doc.roundedRect(20, y - 2, pageWidth - 40, 20, 3, 3, "F");
    
    doc.setFontSize(9);
    doc.setTextColor(...RGB.navy);
    doc.text(`✓ ${win?.title ?? "Quick Win"}`, 25, y + 5);
    
    doc.setFontSize(7);
    doc.setTextColor(...RGB.darkGrey);
    const description = win?.description ?? "Description pending.";
    const descLines = wrapText(doc, description, pageWidth - 55);
    doc.text(descLines[0] || "", 30, y + 12);
    
    doc.setTextColor(...RGB.green);
    doc.text(win?.timeframe ?? "TBD", pageWidth - 50, y + 5);
    
    y += 24;
  }
  
  return y;
}

function buildBenchmarksSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = checkNewPage(doc, y, 80);
  y = addSection(doc, "Industry Benchmarks", y);
  
  const benchmarksData = narratives?.benchmarks;
  const summary = benchmarksData?.summary ?? "Benchmark analysis will be available upon report regeneration.";
  const benchmarks = benchmarksData?.benchmarks ?? [];
  const positioningNarrative = benchmarksData?.positioningNarrative ?? "Detailed positioning analysis pending.";
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  const summaryLines = wrapText(doc, summary, pageWidth - 40);
  doc.text(summaryLines, 20, y);
  y += summaryLines.length * 5 + 10;
  
  if (benchmarks.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Benchmark comparison data will be available upon report regeneration.", 20, y);
    return y + 20;
  }
  
  const colWidth = (pageWidth - 40) / 4;
  
  doc.setFillColor(...RGB.navy);
  doc.rect(20, y, pageWidth - 40, 10, "F");
  doc.setTextColor(...RGB.white);
  doc.setFontSize(8);
  doc.text("Metric", 25, y + 7);
  doc.text("Your Score", 25 + colWidth, y + 7);
  doc.text("Median", 25 + colWidth * 2, y + 7);
  doc.text("Top Quartile", 25 + colWidth * 3, y + 7);
  y += 12;
  
  for (const benchmark of benchmarks) {
    doc.setFillColor(...RGB.lightGrey);
    doc.rect(20, y, pageWidth - 40, 12, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(benchmark?.metric ?? "Metric", 25, y + 8);
    
    const position = benchmark?.position ?? "at";
    const posColor = position === "above" ? RGB.green : position === "at" ? RGB.amber : RGB.red;
    doc.setTextColor(...posColor);
    doc.text(String(benchmark?.organisationValue ?? "N/A"), 25 + colWidth, y + 8);
    
    doc.setTextColor(...RGB.darkGrey);
    doc.text(String(benchmark?.industryMedian ?? "N/A"), 25 + colWidth * 2, y + 8);
    doc.text(String(benchmark?.topQuartile ?? "N/A"), 25 + colWidth * 3, y + 8);
    
    y += 14;
  }
  
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  const narrativeLines = wrapText(doc, positioningNarrative, pageWidth - 40);
  doc.text(narrativeLines, 20, y);
  
  return y + narrativeLines.length * 5 + 10;
}

function buildGapAnalysisPDFSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  // Defensive guard: return early if no dimension scores available
  if (!config.assessment.dimensionScores || typeof config.assessment.dimensionScores !== 'object') {
    return y;
  }
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const dimensionScores = config.assessment.dimensionScores as Record<string, number>;
  
  if (Object.keys(dimensionScores).length === 0) {
    return y;
  }
  
  y = checkNewPage(doc, y, 80);
  y = addSection(doc, "Gap Analysis vs World-Class Benchmark", y);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.text(`Comparison against world-class benchmark (${WORLD_CLASS_BENCHMARK.toFixed(1)}/5.0)`, 20, y);
  y += 12;
  
  // Draw legend
  const legendItems = [
    { label: 'Minor', color: RGB.green },
    { label: 'Moderate', color: RGB.amber },
    { label: 'Significant', color: RGB.orange },
    { label: 'Critical', color: RGB.red },
  ];
  
  let legendX = 20;
  doc.setFontSize(7);
  for (const item of legendItems) {
    doc.setFillColor(...item.color);
    doc.circle(legendX + 3, y, 3, "F");
    doc.setTextColor(...RGB.darkGrey);
    doc.text(item.label, legendX + 8, y + 2);
    legendX += 35;
  }
  y += 12;
  
  const gapAnalysis = calculateGapAnalysis(dimensionScores);
  
  for (const [key, data] of Object.entries(gapAnalysis)) {
    y = checkNewPage(doc, y, 22);
    
    const dimKey = Object.entries(DIMENSION_LABELS).find(([_, v]) => v.key === key)?.[0];
    const label = dimKey ? DIMENSION_LABELS[dimKey as keyof typeof DIMENSION_LABELS].full : key;
    const classification = data.classification;
    const gapInfo = GAP_CLASSIFICATION[classification];
    
    // Traffic light indicator
    const gapColor = classification === 'MINOR' ? RGB.green :
                     classification === 'MODERATE' ? RGB.amber :
                     classification === 'SIGNIFICANT' ? RGB.orange : RGB.red;
    doc.setFillColor(...gapColor);
    doc.circle(28, y + 4, 4, "F");
    
    // Dimension label and scores
    doc.setFontSize(9);
    doc.setTextColor(...RGB.navy);
    doc.text(label, 38, y + 3);
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(`Score: ${data.score.toFixed(2)} | Benchmark: ${data.benchmark.toFixed(2)} | Gap: ${data.gap.toFixed(2)}`, 38, y + 10);
    
    // Gap classification badge
    doc.setFillColor(...gapColor);
    doc.roundedRect(pageWidth - 55, y + 1, 30, 7, 2, 2, "F");
    doc.setFontSize(6);
    doc.setTextColor(...RGB.white);
    doc.text(gapInfo.label.toUpperCase(), pageWidth - 52, y + 6);
    
    y += 18;
  }
  
  return y + 5;
}

function buildMaturityLevelPDFSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const score = config.assessment.epmReadinessScore || config.assessment.overallMaturityScore || 0;
  const scaleScore = (score / 100) * 5; // Convert to 1-5 scale
  const maturityKey = getMaturityLevel(scaleScore);
  const maturity = MATURITY_LEVELS[maturityKey];
  
  y = checkNewPage(doc, y, 100);
  y = addSection(doc, "Maturity Level Assessment", y);
  
  // Maturity level header
  const maturityColor = maturityKey === 'FOUNDATIONAL' ? RGB.red :
                        maturityKey === 'TRANSITIONAL' ? RGB.orange :
                        maturityKey === 'GOOD_BASELINE' ? RGB.amber : RGB.green;
  
  doc.setFillColor(...maturityColor);
  doc.roundedRect(20, y, 50, 12, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(...RGB.white);
  doc.text(maturity.label, 25, y + 8);
  
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.text(`${scaleScore.toFixed(2)} / 5.0`, 80, y + 8);
  
  y += 20;
  
  // Description
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  const descLines = wrapText(doc, maturity.description, pageWidth - 40);
  doc.text(descLines, 20, y);
  y += descLines.length * 5 + 8;
  
  // Progress bar showing maturity levels
  const barWidth = pageWidth - 40;
  const levels = Object.values(MATURITY_LEVELS);
  const levelWidth = barWidth / 4;
  
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const levelColor = level.label === 'Foundational' ? RGB.red :
                       level.label === 'Transitional' ? RGB.orange :
                       level.label === 'Good Baseline' ? RGB.amber : RGB.green;
    doc.setFillColor(...levelColor, 0.3);
    doc.rect(20 + (i * levelWidth), y, levelWidth, 10, "F");
    
    doc.setFontSize(6);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(level.label, 22 + (i * levelWidth), y + 18);
  }
  
  // Current position marker
  const positionX = 20 + ((scaleScore - 1) / 4) * barWidth;
  doc.setFillColor(...RGB.navy);
  doc.circle(Math.min(Math.max(positionX, 25), 20 + barWidth - 5), y + 5, 4, "F");
  
  y += 28;
  
  // Timeline and recommendations
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(20, y, pageWidth - 40, 35, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.teal);
  doc.text(`Recommended Timeline: ${maturity.timeline} to reach next level`, 25, y + 10);
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Key Recommendations:", 25, y + 18);
  
  let recY = y + 24;
  for (const rec of maturity.recommendations.slice(0, 2)) {
    doc.text(`• ${rec}`, 30, recY);
    recY += 5;
  }
  
  return y + 45;
}

function buildBenefitsSummaryPDFSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  const score = config.assessment.epmReadinessScore || config.assessment.overallMaturityScore || 0;
  
  y = checkNewPage(doc, y, 130);
  y = addSection(doc, "Potential Benefits Summary", y);
  
  const scaleScore = (score / 100) * 5;
  const maturityKey = getMaturityLevel(scaleScore);
  const multiplier = maturityKey === 'FOUNDATIONAL' ? 1.0 :
                     maturityKey === 'TRANSITIONAL' ? 0.85 :
                     maturityKey === 'GOOD_BASELINE' ? 0.65 : 0.4;
  const potentialLabel = maturityKey === 'FOUNDATIONAL' ? 'Maximum Potential' :
                         maturityKey === 'TRANSITIONAL' ? 'High Potential' :
                         maturityKey === 'GOOD_BASELINE' ? 'Moderate Potential' : 'Optimisation Focus';
  
  doc.setFillColor(...RGB.navy);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 4, 4, "F");
  
  doc.setFontSize(20);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(multiplier * 100)}%`, margin + 15, y + 18);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Benefit Potential", margin + 45, y + 14);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.cyan);
  doc.text(potentialLabel, margin + 45, y + 23);
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text("6", pageWidth - margin - 45, y + 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Categories", pageWidth - margin - 35, y + 15);
  
  y += 42;
  
  const categories = [
    { key: 'FTE_SAVINGS', label: 'FTE Savings', range: '30-50%', color: RGB.teal },
    { key: 'COST_SAVINGS', label: 'Cost Savings', range: '15-30%', color: RGB.green },
    { key: 'CYCLE_TIME', label: 'Cycle Time', range: '30-50%', color: [139, 92, 246] as [number, number, number] },
    { key: 'REVENUE_MARGIN', label: 'Revenue/Margin', range: '1-5%', color: RGB.orange },
    { key: 'RISK_REDUCTION', label: 'Risk Reduction', range: '40-60%', color: RGB.red },
    { key: 'STRATEGIC_VALUE', label: 'Strategic Value', range: '25-40%', color: RGB.navy },
  ];
  
  const colWidth = (pageWidth - margin * 2 - 15) / 3;
  const rowHeight = 28;
  let startY = y;
  
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cellX = margin + (col * (colWidth + 5));
    const cellY = startY + (row * (rowHeight + 6));
    
    doc.setFillColor(...RGB.lightBlue);
    doc.roundedRect(cellX, cellY, colWidth, rowHeight, 3, 3, "F");
    
    doc.setFillColor(...cat.color);
    doc.roundedRect(cellX, cellY, 4, rowHeight, 2, 0, "F");
    
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text(cat.label, cellX + 10, cellY + 12);
    
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    doc.text(`Potential: ${cat.range}`, cellX + 10, cellY + 22);
  }
  
  return startY + (rowHeight + 6) * 2 + 12;
}

function buildVendorRecommendationsSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  
  y = checkNewPage(doc, y, 100);
  y = addSection(doc, "EPM Vendor Recommendations", y);
  
  const dimensionScores: DimensionScores = {};
  const rawScores = config.assessment?.dimensionScores as Record<string, any> || {};
  let hasValidScores = false;
  
  for (const [key, val] of Object.entries(rawScores)) {
    if (val === null || val === undefined) continue;
    
    let rawScore: number | undefined;
    if (typeof val === 'object' && val?.score != null) {
      rawScore = val.score / 20;
    } else if (typeof val === 'number') {
      rawScore = val / 20;
    }
    
    if (rawScore !== undefined && !isNaN(rawScore) && rawScore >= 0) {
      dimensionScores[key as keyof DimensionScores] = Math.max(0, Math.min(5, rawScore));
      hasValidScores = true;
    }
  }
  
  const sectorValue = config.company?.sector;
  const revenueValue = config.company?.revenueMillions;
  const employeeValue = config.company?.totalFte;
  
  const orgProfile: OrganizationProfile = {
    industry: typeof sectorValue === 'string' ? sectorValue : undefined,
    revenueMillions: typeof revenueValue === 'number' ? revenueValue : undefined,
    employeeCount: typeof employeeValue === 'number' ? employeeValue : undefined,
  };
  
  if (!hasValidScores) {
    doc.setFontSize(10);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Complete the full assessment to receive personalised vendor recommendations.", margin, y);
    return y + 15;
  }
  
  const recommendations = getVendorRecommendations({ dimensionScores, orgProfile }, 3);
  
  if (recommendations.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Vendor recommendations will be available after completing the full assessment.", margin, y);
    return y + 15;
  }
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Based on your assessment profile and industry, the following EPM vendors align with your requirements:", margin, y);
  y += 12;
  
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const vendor = rec.vendor;
    y = checkNewPage(doc, y, 55);
    
    const matchColor = vendor.matchQuality === 'excellent' ? RGB.green :
                       vendor.matchQuality === 'good' ? RGB.teal :
                       vendor.matchQuality === 'moderate' ? RGB.amber : RGB.orange;
    
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 48, 3, 3, "F");
    
    doc.setFillColor(...matchColor);
    doc.roundedRect(margin, y, 4, 48, 2, 0, "F");
    
    doc.setFontSize(12);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text(`#${i + 1}  ${vendor.vendorName}`, margin + 12, y + 10);
    
    doc.setFillColor(...matchColor);
    doc.roundedRect(pageWidth - margin - 45, y + 4, 40, 8, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.white);
    doc.text(vendor.matchQuality.toUpperCase(), pageWidth - margin - 25, y + 10, { align: "center" });
    
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    const rationaleLines = wrapText(doc, rec.primaryRationale, pageWidth - margin * 2 - 20);
    doc.text(rationaleLines.slice(0, 2), margin + 12, y + 20);
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.green);
    doc.text("Strengths:", margin + 12, y + 32);
    doc.setTextColor(...RGB.darkGrey);
    const strengthText = vendor.strengths.slice(0, 2).join("; ");
    const strengthLines = wrapText(doc, strengthText, pageWidth - margin * 2 - 50);
    doc.text(strengthLines[0] || "", margin + 35, y + 32);
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.amber);
    doc.text("Consider:", margin + 12, y + 40);
    doc.setTextColor(...RGB.darkGrey);
    const considerText = vendor.considerations.slice(0, 1).join("; ");
    const considerLines = wrapText(doc, considerText, pageWidth - margin * 2 - 50);
    doc.text(considerLines[0] || "", margin + 35, y + 40);
    
    y += 55;
  }
  
  return y + 5;
}

function buildSensitivityAnalysisSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  
  const roiProfile = (config.assessment as any).roiProfile as RoiInputs | undefined;
  if (!roiProfile) {
    return y;
  }
  
  y = checkNewPage(doc, y, 120);
  y = addSection(doc, "Sensitivity Analysis", y);
  
  const sensitivity = calculateSensitivityGrid(roiProfile);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  const summaryLines = wrapText(doc, sensitivity.summary, pageWidth - margin * 2);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 10;
  
  const tableWidth = pageWidth - margin * 2;
  const colWidths = [tableWidth * 0.30, tableWidth * 0.14, tableWidth * 0.14, tableWidth * 0.14, tableWidth * 0.14, tableWidth * 0.14];
  const headerHeight = 10;
  const rowHeight = 9;
  
  doc.setFillColor(...RGB.navy);
  doc.rect(margin, y, tableWidth, headerHeight, "F");
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  let headerX = margin + 4;
  const headers = ["Driver", "Pessimistic", "Mild -", "Baseline", "Mild +", "Optimistic"];
  headers.forEach((header, idx) => {
    doc.text(header, headerX, y + 7);
    headerX += colWidths[idx];
  });
  y += headerHeight;
  doc.setFont("helvetica", "normal");
  
  for (let i = 0; i < Math.min(sensitivity.drivers.length, 6); i++) {
    const driver = sensitivity.drivers[i];
    const isEven = i % 2 === 0;
    
    doc.setFillColor(...(isEven ? RGB.white : RGB.lightGrey));
    doc.rect(margin, y, tableWidth, rowHeight, "F");
    
    doc.setFontSize(7);
    doc.setTextColor(...RGB.darkGrey);
    let cellX = margin + 4;
    
    const driverLabel = driver.isCostDriver ? `${driver.driverName} *` : driver.driverName;
    doc.text(driverLabel, cellX, y + 6);
    cellX += colWidths[0];
    
    const variations = [
      driver.variations.pessimistic,
      driver.variations.mildPessimistic,
      driver.variations.baseline,
      driver.variations.mildOptimistic,
      driver.variations.optimistic,
    ];
    const baseNpv = driver.variations.baseline.npv;
    
    for (const v of variations) {
      const npvDiff = v.npv - baseNpv;
      if (npvDiff > 0) {
        doc.setTextColor(...RGB.green);
      } else if (npvDiff < 0) {
        doc.setTextColor(...RGB.red);
      } else {
        doc.setTextColor(...RGB.darkGrey);
      }
      doc.text(`£${Math.round(v.npv)}k`, cellX, y + 6);
      cellX += colWidths[1];
    }
    
    y += rowHeight;
  }
  
  doc.setDrawColor(...RGB.borderGray);
  doc.setLineWidth(0.5);
  doc.rect(margin, y - (Math.min(sensitivity.drivers.length, 6) * rowHeight) - headerHeight, tableWidth, (Math.min(sensitivity.drivers.length, 6) * rowHeight) + headerHeight, "S");
  
  y += 10;
  
  const hasCostDrivers = sensitivity.drivers.some(d => d.isCostDriver);
  if (hasCostDrivers) {
    doc.setFontSize(7);
    doc.setTextColor(...RGB.slateGray);
    doc.text("* Cost drivers: pessimistic = higher costs, optimistic = lower costs", margin, y);
    y += 6;
  }
  
  doc.setFillColor(...RGB.lightBlue);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Most Sensitive Driver:", margin + 8, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...RGB.darkGrey);
  doc.text(sensitivity.mostSensitiveDriver, margin + 60, y + 8);
  doc.setFontSize(8);
  doc.text(`Least Sensitive: ${sensitivity.leastSensitiveDriver}`, margin + 8, y + 14);
  
  return y + 25;
}

function buildMonteCarloSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  
  const roiProfile = (config.assessment as any).roiProfile as RoiInputs | undefined;
  if (!roiProfile) {
    return y;
  }
  
  y = checkNewPage(doc, y, 100);
  y = addSection(doc, "Monte Carlo Risk Analysis", y);
  
  const simulation = runMonteCarloSimulation(roiProfile, { iterations: 1000 });
  
  const riskColor = simulation.riskAssessment === 'low' ? RGB.green :
                    simulation.riskAssessment === 'medium' ? RGB.amber : RGB.red;
  
  doc.setFillColor(...RGB.navy);
  doc.roundedRect(margin, y, 60, 35, 4, 4, "F");
  doc.setFontSize(22);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(simulation.probabilityPositiveNpv * 100)}%`, margin + 30, y + 18, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Probability of", margin + 30, y + 26, { align: "center" });
  doc.text("Positive NPV", margin + 30, y + 32, { align: "center" });
  
  doc.setFillColor(...riskColor);
  doc.roundedRect(margin + 70, y, 50, 35, 4, 4, "F");
  doc.setFontSize(14);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(simulation.riskAssessment.toUpperCase(), margin + 95, y + 18, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Risk Level", margin + 95, y + 28, { align: "center" });
  
  doc.setFillColor(...RGB.lightBlue);
  doc.roundedRect(margin + 130, y, 55, 35, 4, 4, "F");
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(simulation.probabilityPaybackUnder3Years * 100)}%`, margin + 157, y + 18, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Payback <3 Years", margin + 157, y + 28, { align: "center" });
  
  y += 45;
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("NPV Distribution (£k)", margin, y);
  y += 10;
  
  const percentiles = [
    { label: "P5 (Pessimistic)", value: simulation.npv.p5 },
    { label: "P25", value: simulation.npv.p25 },
    { label: "P50 (Median)", value: simulation.npv.median },
    { label: "P75", value: simulation.npv.p75 },
    { label: "P95 (Optimistic)", value: simulation.npv.p95 },
  ];
  
  const barMaxWidth = pageWidth - margin * 2 - 80;
  const maxAbsValue = Math.max(...percentiles.map(p => Math.abs(p.value)));
  
  for (const p of percentiles) {
    y = checkNewPage(doc, y, 12);
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(p.label, margin, y + 5);
    
    const barWidth = (Math.abs(p.value) / maxAbsValue) * barMaxWidth;
    const barColor = p.value >= 0 ? RGB.green : RGB.red;
    doc.setFillColor(...barColor);
    doc.roundedRect(margin + 55, y, barWidth, 8, 2, 2, "F");
    
    doc.setTextColor(...barColor);
    doc.setFont("helvetica", "bold");
    doc.text(`£${Math.round(p.value)}k`, margin + 60 + barWidth, y + 6);
    doc.setFont("helvetica", "normal");
    
    y += 12;
  }
  
  y += 8;
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, "F");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.darkGrey);
  const confLines = wrapText(doc, simulation.confidenceStatement, pageWidth - margin * 2 - 15);
  doc.text(confLines.slice(0, 2), margin + 8, y + 8);
  
  return y + 28;
}

function buildHiddenCostsSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  
  const roiProfile = (config.assessment as any).roiProfile as RoiInputs | undefined;
  if (!roiProfile) {
    return y;
  }
  
  y = checkNewPage(doc, y, 100);
  y = addSection(doc, "Hidden Cost Analysis", y);
  
  const dimensionScores = config.assessment.dimensionScores as Record<string, any> || {};
  const extractScore = (val: any): number => {
    let score = 0;
    if (typeof val === 'number') score = val;
    else if (typeof val === 'object' && val !== null && typeof val.score === 'number') score = val.score;
    else return 2.5;
    // Cap at 100% before converting to 1-5 scale to prevent overflow
    return Math.min(5, Math.max(0, Math.min(100, score) / 20));
  };
  const assessmentScores = {
    technology_systems: extractScore(dimensionScores.technology_systems),
    data_analytics: extractScore(dimensionScores.data_analytics),
    process_automation: extractScore(dimensionScores.consolidation_close),
    overall_maturity: (config.assessment.overallMaturityScore || 50) / 20,
  };
  
  const hiddenCosts = calculateHiddenCosts(roiProfile, assessmentScores);
  
  if (hiddenCosts.categories.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Hidden cost analysis requires additional profile data.", margin, y);
    return y + 15;
  }
  
  doc.setFillColor(...RGB.red);
  doc.roundedRect(margin, y, 55, 30, 4, 4, "F");
  doc.setFontSize(16);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(`£${hiddenCosts.totalAnnualHiddenCosts}k`, margin + 27, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Annual Hidden", margin + 27, y + 22, { align: "center" });
  doc.text("Costs", margin + 27, y + 27, { align: "center" });
  
  doc.setFillColor(...RGB.amber);
  doc.roundedRect(margin + 65, y, 55, 30, 4, 4, "F");
  doc.setFontSize(16);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(`£${hiddenCosts.monthlyOpportunityCost}k`, margin + 92, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Monthly Delay", margin + 92, y + 22, { align: "center" });
  doc.text("Cost", margin + 92, y + 27, { align: "center" });
  
  doc.setFillColor(...RGB.navy);
  doc.roundedRect(margin + 130, y, 55, 30, 4, 4, "F");
  doc.setFontSize(14);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(`${hiddenCosts.hiddenCostsAsPercentOfBaseline}%`, margin + 157, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("of Baseline", margin + 157, y + 22, { align: "center" });
  doc.text("Operating Cost", margin + 157, y + 27, { align: "center" });
  
  y += 40;
  
  const headers = ["Category", "Annual Cost", "Confidence", "Basis"];
  const rows = hiddenCosts.categories.map(c => [
    c.category,
    `£${c.annualCost}k`,
    c.confidence.toUpperCase(),
    c.calculationBasis.substring(0, 35) + (c.calculationBasis.length > 35 ? "..." : ""),
  ]);
  
  y = drawProfessionalTable(doc, margin, y, headers, rows, [55, 30, 30, 60]);
  
  if (hiddenCosts.insights.length > 0) {
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Key Insights", margin, y);
    y += 8;
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    for (const insight of hiddenCosts.insights.slice(0, 3)) {
      y = checkNewPage(doc, y, 12);
      const insightLines = wrapText(doc, `• ${insight}`, pageWidth - margin * 2 - 10);
      doc.text(insightLines, margin + 5, y);
      y += insightLines.length * 4 + 4;
    }
  }
  
  return y + 5;
}

function buildWorkingCapitalSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGINS.left;
  
  const roiProfile = (config.assessment as any).roiProfile as RoiInputs | undefined;
  if (!roiProfile) {
    return y;
  }
  
  y = checkNewPage(doc, y, 100);
  y = addSection(doc, "Working Capital Impact", y);
  
  const capitalAnalysis = calculateWorkingCapitalImpact(roiProfile);
  
  const profileColor = capitalAnalysis.cashFlowProfile === 'front_loaded' ? RGB.red :
                       capitalAnalysis.cashFlowProfile === 'steady' ? RGB.amber : RGB.green;
  const profileLabel = capitalAnalysis.cashFlowProfile === 'front_loaded' ? 'Front-Loaded' :
                       capitalAnalysis.cashFlowProfile === 'steady' ? 'Steady' : 'Back-Loaded';
  
  doc.setFillColor(...RGB.navy);
  doc.roundedRect(margin, y, 55, 35, 4, 4, "F");
  doc.setFontSize(16);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(`£${capitalAnalysis.peakFundingRequirement}k`, margin + 27, y + 15, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Peak Funding", margin + 27, y + 24, { align: "center" });
  doc.text(`(Month ${capitalAnalysis.peakFundingMonth})`, margin + 27, y + 30, { align: "center" });
  
  const breakEvenText = capitalAnalysis.breakEvenMonth > 0 
    ? `Month ${capitalAnalysis.breakEvenMonth}` 
    : "Beyond Horizon";
  doc.setFillColor(...RGB.teal);
  doc.roundedRect(margin + 65, y, 55, 35, 4, 4, "F");
  doc.setFontSize(14);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(breakEvenText, margin + 92, y + 15, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Break-Even", margin + 92, y + 26, { align: "center" });
  
  doc.setFillColor(...profileColor);
  doc.roundedRect(margin + 130, y, 55, 35, 4, 4, "F");
  doc.setFontSize(12);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text(profileLabel, margin + 157, y + 15, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Cash Flow", margin + 157, y + 24, { align: "center" });
  doc.text("Profile", margin + 157, y + 30, { align: "center" });
  
  y += 45;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.text(`Average Monthly Burn: £${capitalAnalysis.averageMonthlyBurn}k`, margin + 10, y + 8);
  doc.text(`Estimated Financing Cost: £${capitalAnalysis.financingCostEstimate}k`, margin + 10, y + 14);
  
  y += 26;
  
  if (capitalAnalysis.recommendations.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendations", margin, y);
    y += 8;
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    for (const rec of capitalAnalysis.recommendations.slice(0, 4)) {
      y = checkNewPage(doc, y, 12);
      
      doc.setFillColor(...RGB.teal);
      doc.circle(margin + 4, y, 2, "F");
      
      const recLines = wrapText(doc, rec, pageWidth - margin * 2 - 15);
      doc.text(recLines, margin + 10, y + 2);
      y += recLines.length * 4 + 5;
    }
  }
  
  return y + 5;
}

function buildNextStepsSection(doc: jsPDFType, y: number, config: PDFConfig, narratives: FullReportNarratives): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  y = checkNewPage(doc, y, 100);
  y = addSection(doc, "Next Steps", y);
  
  const steps = [
    "Review this report with your leadership team to align on priorities",
    "Engage with Constancia for a detailed discovery workshop to validate findings",
    "Develop a detailed transformation roadmap with implementation timelines",
    "Establish governance and change management approach",
    "Begin with quick wins to build momentum and stakeholder confidence",
  ];
  
  for (let i = 0; i < steps.length; i++) {
    y = checkNewPage(doc, y, 15);
    
    doc.setFillColor(...RGB.teal);
    doc.circle(25, y, 4, "F");
    doc.setTextColor(...RGB.white);
    doc.setFontSize(8);
    doc.text(String(i + 1), 23, y + 2);
    
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    const stepLines = wrapText(doc, steps[i], pageWidth - 55);
    doc.text(stepLines, 35, y + 2);
    y += stepLines.length * 5 + 8;
  }
  
  y += 10;
  y = checkNewPage(doc, y, 50);
  
  doc.setFillColor(...RGB.navy);
  doc.roundedRect(20, y, pageWidth - 40, 40, 5, 5, "F");
  
  doc.setTextColor(...RGB.white);
  doc.setFontSize(12);
  doc.text("Ready to Transform Your Finance Function?", pageWidth / 2, y + 15, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.cyan);
  doc.text("Contact Constancia to discuss your transformation journey", pageWidth / 2, y + 25, { align: "center" });
  doc.text("info@constancia.io | www.constancia.io", pageWidth / 2, y + 33, { align: "center" });
  
  return y + 50;
}

const SECTION_BUILDERS: Record<string, SectionBuilder> = {
  cover: {
    id: "cover",
    title: "Cover Page",
    build: buildCoverPage,
  },
  executive_summary: {
    id: "executive_summary",
    title: "Executive Summary",
    build: buildExecutiveSummarySection,
  },
  readiness_score: {
    id: "readiness_score",
    title: "EPM Readiness Score",
    build: buildReadinessScoreSection,
  },
  dimension_analysis: {
    id: "dimension_analysis",
    title: "Dimension Analysis",
    build: buildDimensionAnalysisSection,
  },
  key_findings: {
    id: "key_findings",
    title: "Key Findings & Gaps",
    build: buildKeyFindingsSection,
  },
  recommendations: {
    id: "recommendations",
    title: "Prioritised Recommendations",
    build: buildRecommendationsSection,
  },
  quick_wins: {
    id: "quick_wins",
    title: "Quick Wins",
    build: buildQuickWinsSection,
  },
  benchmarks: {
    id: "benchmarks",
    title: "Industry Benchmarks",
    build: buildBenchmarksSection,
  },
  gap_analysis_pdf: {
    id: "gap_analysis_pdf",
    title: "Gap Analysis",
    build: buildGapAnalysisPDFSection,
  },
  maturity_level_pdf: {
    id: "maturity_level_pdf",
    title: "Maturity Assessment",
    build: buildMaturityLevelPDFSection,
  },
  benefits_summary_pdf: {
    id: "benefits_summary_pdf",
    title: "Benefits Summary",
    build: buildBenefitsSummaryPDFSection,
  },
  next_steps: {
    id: "next_steps",
    title: "Next Steps & CTA",
    build: buildNextStepsSection,
  },
  vendor_recommendations: {
    id: "vendor_recommendations",
    title: "EPM Vendor Recommendations",
    build: buildVendorRecommendationsSection,
  },
  sensitivity_analysis: {
    id: "sensitivity_analysis",
    title: "Sensitivity Analysis",
    build: buildSensitivityAnalysisSection,
  },
  monte_carlo: {
    id: "monte_carlo",
    title: "Monte Carlo Risk Analysis",
    build: buildMonteCarloSection,
  },
  hidden_costs: {
    id: "hidden_costs",
    title: "Hidden Cost Analysis",
    build: buildHiddenCostsSection,
  },
  working_capital: {
    id: "working_capital",
    title: "Working Capital Impact",
    build: buildWorkingCapitalSection,
  },
};

export function generateGenerationReport(
  config: PDFConfig,
  analysis: GenerationTierResult
): jsPDFType {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let y = addHeader(doc, config);
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.darkGrey);
  
  y = addSection(doc, "Executive Summary", y);
  const summaryLines = wrapText(doc, analysis.summary, pageWidth - 40);
  doc.text(summaryLines, 20, y);
  y += summaryLines.length * 6 + 10;
  
  y = addSection(doc, "EPM Readiness Score", y);
  
  const scoreBarWidth = 100;
  const scoreFilled = (analysis.epmReadinessScore / 100) * scoreBarWidth;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(20, y, scoreBarWidth, 10, 2, 2, "F");
  
  const scoreColor = getScoreColor(analysis.epmReadinessScore);
  doc.setFillColor(...scoreColor);
  doc.roundedRect(20, y, scoreFilled, 10, 2, 2, "F");
  
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.text(`${analysis.epmReadinessScore}%`, 130, y + 8);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Readiness Level: ${analysis.readinessLevel.toUpperCase()}`, 150, y + 8);
  
  y += 20;
  
  // Add traffic light dimension ratings if available
  if (analysis.dimensionRatings && analysis.dimensionRatings.length > 0) {
    y = checkNewPage(doc, y, 60);
    y = addSection(doc, "Dimension Analysis (Traffic Light Rating)", y);
    
    // Add legend
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFillColor(...RGB.green);
    doc.circle(25, y + 2, 3, "F");
    doc.text("GREEN: Strength (>70%)", 32, y + 3);
    doc.setFillColor(...RGB.amber);
    doc.circle(85, y + 2, 3, "F");
    doc.text("AMBER: Improvement needed (40-70%)", 92, y + 3);
    doc.setFillColor(...RGB.red);
    doc.circle(165, y + 2, 3, "F");
    doc.text("RED: Critical gap (<40%)", 172, y + 3);
    y += 12;
    
    y = drawTrafficLightRatings(doc, 20, y, analysis.dimensionRatings as DimensionRatingForPDF[]);
    y += 10;
  }
  
  y = checkNewPage(doc, y, 30);
  y = addSection(doc, "Key Challenges Identified", y);
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  
  for (const challenge of analysis.topChallenges) {
    const lines = wrapText(doc, `• ${challenge}`, pageWidth - 50);
    y = checkNewPage(doc, y, lines.length * 5);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 3;
  }
  
  y += 5;
  
  y = addSection(doc, "Quick Wins to Consider", y);
  
  for (const win of analysis.quickWins) {
    const lines = wrapText(doc, `• ${win}`, pageWidth - 50);
    y = checkNewPage(doc, y, lines.length * 5);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 3;
  }
  
  y += 10;
  
  y = checkNewPage(doc, y, 40);
  y = addSection(doc, "Next Steps", y);
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(20, y, pageWidth - 40, 35, 3, 3, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  const recLines = wrapText(doc, analysis.upgradeRecommendation, pageWidth - 50);
  doc.text(recLines, 25, y + 10);
  
  y += 45;
  doc.setFontSize(10);
  doc.setTextColor(...RGB.navy);
  doc.text("Ready for a deeper analysis? Contact Constancia at info@constancia.io", 20, y);
  
  addFooter(doc, 1, 1);
  
  return doc;
}

/**
 * TIER 1: Pre-Assessment Report (5-6 pages)
 * Per JSON spec: Diagnostic screening before full assessment
 * 
 * Structure:
 * - COVER PAGE: Title, company, date, tagline, confidentiality notice
 * - PAGE 1: Executive Overview - Company snapshot, preliminary summary
 * - PAGE 2: Health Check Findings - 5 key metrics with traffic lights
 * - PAGE 3: Red Flags Identified - 5 concerns with severity
 * - PAGE 4: What Comes Next - Recommendation, next steps, full assessment overview
 * - PAGE 5: Quick Facts - One-pager summary
 * - BACK PAGE: Contact and confidentiality
 */
export function generateTier1PreAssessmentReport(
  config: PDFConfig,
  analysis: AnalysisResult
): jsPDFType {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGINS.left;
  
  // Calculate metrics from ACTUAL assessment data only
  const overallScore = Math.max(0, Math.min(100, analysis.overallScore || 0));
  
  // Extract dimension scores from actual analysis using normalization
  const rawDimensionScores = analysis.dimensionScores || {};
  const dimensionDetails = analysis.dimensionDetails || {};
  const hasActualDimensionData = Object.keys(rawDimensionScores).length > 0 || Object.keys(dimensionDetails).length > 0;
  
  // Build dimension entries using normalization helper for consistent handling
  const normalizedFromDetails = Object.entries(dimensionDetails).length > 0
    ? Object.entries(dimensionDetails).map(([key, val]) => ({
        name: key,
        ...normalizeDimensionScore(val)
      }))
    : null;
  
  const normalizedFromScores = normalizeDimensionScores(rawDimensionScores);
  
  const dimensionEntries = normalizedFromDetails 
    ? normalizedFromDetails
    : Object.entries(normalizedFromScores).map(([key, val]) => ({
        name: key,
        ...val
      }));
  
  // Sort dimensions by score (lowest first for gap analysis)
  const sortedDimensions = [...dimensionEntries].sort((a, b) => a.score - b.score);
  const lowestDimension = sortedDimensions.length > 0 
    ? sortedDimensions[0]
    : { name: 'assessment', score: overallScore, rating: 'amber' as const, analysis: '', recommendations: [] };
  const biggestGapName = lowestDimension.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // Get actual key findings and recommendations
  const keyFindings = analysis.keyFindings || [];
  const prioritisedRecommendations = analysis.prioritisedRecommendations || [];
  const nextSteps = analysis.nextSteps || [];
  
  // Helper function to get status label from rating
  const getStatusLabel = (rating: 'red' | 'amber' | 'green'): string => {
    switch (rating) {
      case 'red': return 'Needs Attention';
      case 'amber': return 'Room for Improvement';
      case 'green': return 'Strong';
      default: return 'Under Review';
    }
  };
  
  const assessmentDate = config.assessment.startedAt 
    ? new Date(config.assessment.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : formatDateUK();
  
  // === COVER PAGE ===
  doc.setFillColor(...RGB.navy);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Constancia logo
  const preAssessmentLogo = getLogoTurquoise();
  if (preAssessmentLogo) {
    try {
      doc.addImage(preAssessmentLogo, "PNG", margin, 25, 45, 15);
    } catch (e) {
      doc.setFontSize(32);
      doc.setTextColor(...RGB.cyan);
      doc.setFont("helvetica", "bold");
      doc.text("Constancia", margin, 40);
    }
  } else {
    doc.setFontSize(32);
    doc.setTextColor(...RGB.cyan);
    doc.setFont("helvetica", "bold");
    doc.text("Constancia", margin, 40);
  }
  
  // Main title
  doc.setFontSize(28);
  doc.setTextColor(...RGB.cream);
  doc.text("Pre-Assessment Report", margin, 85);
  
  // Tagline
  doc.setFontSize(14);
  doc.setTextColor(...RGB.cyan);
  doc.setFont("helvetica", "normal");
  doc.text("Initial Health Check - Diagnostic Screening Before Full Assessment", margin, 105);
  
  // Decorative line
  doc.setDrawColor(...RGB.cyan);
  doc.setLineWidth(2);
  doc.line(margin, 120, margin + 80, 120);
  
  // Company name
  doc.setFontSize(22);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "bold");
  doc.text(config.company.name, margin, pageHeight / 2 - 20);
  
  // Prepared for
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Prepared for: ${config.contact.firstName} ${config.contact.lastName}`, margin, pageHeight / 2);
  if (config.contact.roleTitle) {
    doc.setTextColor(...RGB.slateGray);
    doc.text(config.contact.roleTitle, margin, pageHeight / 2 + 12);
  }
  
  // Assessment date
  doc.setFontSize(11);
  doc.setTextColor(...RGB.cream);
  doc.text(`Assessment Date: ${assessmentDate}`, margin, pageHeight / 2 + 30);
  
  // Confidentiality notice
  doc.setFillColor(...RGB.red);
  doc.roundedRect(margin, pageHeight / 2 + 45, 120, 18, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.text("Confidential - For CFO review only", margin + 5, pageHeight / 2 + 56);
  
  // Footer - prepared by
  doc.setFontSize(11);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "bold");
  doc.text("Prepared by: Constancia Finance Transformation", margin, pageHeight - 70);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "normal");
  doc.text(PDF_CONTACT_INFO.address, margin, pageHeight - 55);
  doc.text(`${PDF_CONTACT_INFO.email}  |  ${PDF_CONTACT_INFO.website}`, margin, pageHeight - 43);
  
  doc.setFontSize(8);
  doc.text(`Generated: ${formatDateUK()}`, margin, pageHeight - 25);
  
  // === PAGE 1: EXECUTIVE OVERVIEW ===
  doc.addPage();
  let y = addHeader(doc, config);
  
  y = addSection(doc, "Executive Overview", y);
  
  // Opening text - use actual summary if available
  const openingText = analysis.summary || "This pre-assessment provides a diagnostic screening of your finance function based on your questionnaire responses and self-reported operational metrics.";
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  const openingLines = wrapText(doc, openingText, pageWidth - 40);
  doc.text(openingLines, 20, y);
  y += openingLines.length * 5 + 5;
  
  const scopeText = "We have analysed your responses to identify preliminary gaps and determine if a full assessment is warranted.";
  const scopeLines = wrapText(doc, scopeText, pageWidth - 40);
  doc.text(scopeLines, 20, y);
  y += scopeLines.length * 5 + 10;
  
  // Important note box
  doc.setFillColor(...RGB.cyan);
  doc.roundedRect(20, y, pageWidth - 40, 22, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Important:", 25, y + 8);
  doc.setFont("helvetica", "normal");
  const noteText = "This is a pre-assessment screening based on your questionnaire responses. A comprehensive full assessment provides detailed analysis across all dimensions.";
  const noteLines = wrapText(doc, noteText, pageWidth - 60);
  doc.text(noteLines, 50, y + 8);
  y += 32;
  
  // Company Snapshot box
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Company Snapshot", 20, y);
  y += 8;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(20, y, pageWidth - 40, 70, 3, 3, "F");
  
  const revenue = config.company.revenueMillions 
    ? `£${config.company.revenueMillions.toFixed(0)}M` 
    : "Not specified";
  const employees = config.company.totalFte || "Not specified";
  
  const snapshotFields = [
    { label: "Company Name:", value: config.company.name },
    { label: "Size Band:", value: config.company.sizeBand || "Not specified" },
    { label: "Sector:", value: config.company.sector || "Not specified" },
    { label: "Revenue:", value: revenue },
    { label: "Employees:", value: String(employees) },
    { label: "Country:", value: config.company.country || "United Kingdom" },
    { label: "Assessment Scope:", value: "Finance transformation, operational efficiency, reporting quality" },
  ];
  
  let fieldY = y + 10;
  doc.setFontSize(9);
  for (const field of snapshotFields) {
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text(field.label, 25, fieldY);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    doc.text(field.value, 75, fieldY);
    fieldY += 9;
  }
  y += 80;
  
  // Preliminary Assessment Summary
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Preliminary Assessment Summary", 20, y);
  y += 8;
  
  // Use actual key findings if available, otherwise generic summary based on readiness level
  const readinessDesc = analysis.readinessLevel === 'advanced' ? 'strong maturity' : 
                        analysis.readinessLevel === 'high' ? 'good foundation with optimisation opportunities' :
                        analysis.readinessLevel === 'moderate' ? 'moderate maturity with clear improvement areas' :
                        'foundational stage with significant transformation potential';
  const summaryText = keyFindings.length > 0 
    ? `Based on your pre-assessment responses, your finance function shows ${readinessDesc}. ${keyFindings[0]}`
    : `Based on your pre-assessment responses, your finance function shows ${readinessDesc}. We have identified areas for improvement that could enhance your financial reporting and operational efficiency.`;
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.setFont("helvetica", "normal");
  const summaryLines = wrapText(doc, summaryText, pageWidth - 40);
  doc.text(summaryLines, 20, y);
  y += summaryLines.length * 5 + 8;
  
  // Key finding box - use actual key finding if available
  const keyFindingText = keyFindings.length > 1 ? keyFindings[1] : 
                         keyFindings.length > 0 ? keyFindings[0] :
                         "Assessment complete - detailed findings available in the following pages.";
  doc.setFillColor(...RGB.amber);
  doc.roundedRect(20, y, pageWidth - 40, 15, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Key Finding:", 25, y + 10);
  doc.setFont("helvetica", "normal");
  const keyFindingShort = keyFindingText.length > 80 ? keyFindingText.substring(0, 77) + '...' : keyFindingText;
  doc.text(keyFindingShort, 60, y + 10);
  
  // === PAGE 2: DIMENSION HEALTH CHECK ===
  doc.addPage();
  y = addHeader(doc, config);
  
  y = addSection(doc, "Dimension Health Check", y);
  
  // Findings overview
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  const findingsOpening = "We assessed your finance function across key dimensions based on your pre-assessment questionnaire responses.";
  const findingsLines = wrapText(doc, findingsOpening, pageWidth - 40);
  doc.text(findingsLines, 20, y);
  y += findingsLines.length * 5 + 3;
  
  doc.setFontSize(8);
  doc.setTextColor(...RGB.slateGray);
  doc.text("Data source: Pre-assessment questionnaire responses", 20, y);
  y += 12;
  
  // Helper function to draw dimension card using actual data
  const drawDimensionCard = (
    startY: number,
    dimensionName: string,
    score: number,
    rating: 'red' | 'amber' | 'green',
    analysisText: string
  ): number => {
    const cardHeight = 38;
    const statusColor = rating === 'red' ? RGB.red : rating === 'amber' ? RGB.amber : RGB.green;
    const statusIcon = rating === 'green' ? '✓' : rating === 'amber' ? '~' : '✗';
    const statusLabel = getStatusLabel(rating);
    
    // Use a subtle, light background that works with all status colors
    // Light grey background provides good contrast for all text
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(20, startY, pageWidth - 40, cardHeight, 3, 3, "F");
    
    // Left border accent with status color for visual indicator
    doc.setFillColor(...statusColor);
    doc.rect(20, startY, 4, cardHeight, "F");
    
    // Status circle
    doc.setFillColor(...statusColor);
    doc.circle(32, startY + 12, 5, "F");
    doc.setFontSize(8);
    doc.setTextColor(...RGB.white);
    doc.text(statusIcon, 30, startY + 14);
    
    // Dimension name - use navy for good contrast
    doc.setFontSize(11);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    const formattedName = dimensionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    doc.text(formattedName, 42, startY + 10);
    
    // Score value - use navy instead of status color for better readability
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "normal");
    doc.text(`Assessment Score: ${Math.round(score)}%`, 42, startY + 18);
    
    // Status badge
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - 70, startY + 5, 45, 10, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.white);
    doc.text(statusLabel, pageWidth - 68, startY + 12);
    
    // Analysis text - use darker grey for better readability
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    const analysisDisplay = analysisText || (rating === 'green' ? "Strong performance in this dimension." : rating === 'amber' ? "Moderate performance with improvement opportunities." : "Significant gaps identified requiring attention.");
    const analysisLines = wrapText(doc, analysisDisplay, pageWidth - 60);
    doc.text(analysisLines[0] || "", 42, startY + 30);
    
    return startY + cardHeight + 4;
  };
  
  // Draw dimension cards using actual data (up to 5 dimensions)
  const dimensionsToShow = dimensionEntries.slice(0, 5);
  
  if (dimensionsToShow.length === 0) {
    // No dimension data available
    doc.setFontSize(10);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Dimension scores not available from pre-assessment.", 20, y);
    y += 15;
    
    // Show overall score instead
    y = checkNewPage(doc, y, 45);
    y = drawDimensionCard(y, "Overall Readiness", overallScore, 
      overallScore >= 70 ? 'green' : overallScore >= 40 ? 'amber' : 'red',
      analysis.summary || "Assessment analysis pending."
    );
  } else {
    // Show actual dimension scores with page break checks
    for (const dim of dimensionsToShow) {
      y = checkNewPage(doc, y, 45);
      y = drawDimensionCard(y, dim.name, dim.score, dim.rating, dim.analysis);
    }
  }
  
  // Overall Assessment Score card
  y += 5;
  y = checkNewPage(doc, y, 45);
  const overallRating = overallScore >= 70 ? 'green' as const : overallScore >= 40 ? 'amber' as const : 'red' as const;
  y = drawDimensionCard(y, "Overall Assessment Score", overallScore, overallRating,
    `Readiness level: ${analysis.readinessLevel?.charAt(0).toUpperCase()}${analysis.readinessLevel?.slice(1) || 'Moderate'}. Full assessment will provide detailed analysis.`
  );
  
  // === PAGE 3: RED FLAGS IDENTIFIED ===
  doc.addPage();
  y = addHeader(doc, config);
  
  y = addSection(doc, "Areas Requiring Attention", y);
  
  // Introduction
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  const redFlagIntro = "Based on your assessment responses, we have identified the following areas that may benefit from attention:";
  doc.text(redFlagIntro, 20, y);
  y += 10;
  
  // Red flag data - derive ONLY from actual keyFindings and dimension ratings
  interface RedFlagData {
    flag: string;
    concern: string;
    rootCause: string;
    impact: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  }
  
  const redFlagsData: RedFlagData[] = [];
  
  // Helper to map priority to severity
  const priorityToSeverity = (priority: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' => {
    if (priority === 'high') return 'CRITICAL';
    if (priority === 'medium') return 'HIGH';
    return 'MEDIUM';
  };
  
  // 1. Add red flags for dimensions with red ratings
  for (const dim of dimensionEntries) {
    if (dim.rating === 'red' && redFlagsData.length < 5) {
      const dimLabel = dim.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      redFlagsData.push({
        flag: `${dimLabel}: Assessment Score ${Math.round(dim.score)}%`,
        concern: dim.analysis || `${dimLabel} shows significant gaps requiring attention`,
        rootCause: "Identified from assessment responses",
        impact: "Limits transformation readiness in this area",
        severity: 'CRITICAL'
      });
    }
  }
  
  // 2. Extract from prioritisedRecommendations (high priority items indicate issues)
  for (const rec of prioritisedRecommendations) {
    if (rec.priority === 'high' && redFlagsData.length < 5) {
      redFlagsData.push({
        flag: rec.title.length > 40 ? rec.title.substring(0, 37) + '...' : rec.title,
        concern: rec.description,
        rootCause: "Identified from assessment analysis",
        impact: rec.expectedBenefit,
        severity: 'HIGH'
      });
    }
  }
  
  // 3. Extract concerning patterns from keyFindings
  const concernKeywords = ['concern', 'issue', 'gap', 'weak', 'manual', 'lack', 'missing', 'poor', 'limited', 'risk', 'challenge'];
  for (const finding of keyFindings) {
    const lowerFinding = finding.toLowerCase();
    if (concernKeywords.some(kw => lowerFinding.includes(kw)) && redFlagsData.length < 5) {
      redFlagsData.push({
        flag: finding.length > 40 ? finding.substring(0, 37) + '...' : finding,
        concern: finding,
        rootCause: "Identified during assessment analysis",
        impact: "May affect operational efficiency",
        severity: 'MEDIUM'
      });
    }
  }
  
  // 4. If no red flags found, show positive message
  if (redFlagsData.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...RGB.green);
    doc.text("No critical concerns identified from the pre-assessment.", 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("A full assessment will provide deeper analysis of improvement opportunities.", 20, y);
    y += 15;
  }
  
  // Draw red flags
  for (const rf of redFlagsData.slice(0, 5)) {
    y = checkNewPage(doc, y, 35);
    
    const severityColor = rf.severity === 'CRITICAL' ? RGB.red : rf.severity === 'HIGH' ? RGB.orange : RGB.amber;
    
    // Flag icon and name
    doc.setFillColor(...severityColor);
    doc.circle(25, y + 4, 4, "F");
    doc.setFontSize(8);
    doc.setTextColor(...RGB.white);
    doc.text("!", 23.5, y + 6);
    
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text(rf.flag, 35, y + 5);
    
    // Severity badge
    doc.setFillColor(...severityColor);
    doc.roundedRect(pageWidth - 50, y, 28, 10, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.white);
    doc.text(rf.severity, pageWidth - 48, y + 7);
    
    y += 12;
    
    // Details
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...RGB.darkGrey);
    doc.text(`Concern: ${rf.concern}`, 35, y);
    y += 6;
    doc.text(`Root Cause: ${rf.rootCause}`, 35, y);
    y += 6;
    doc.setTextColor(...RGB.red);
    doc.text(`Impact: ${rf.impact}`, 35, y);
    y += 12;
  }
  
  // === PAGE 4: WHAT COMES NEXT ===
  doc.addPage();
  y = addHeader(doc, config);
  
  y = addSection(doc, "What Comes Next", y);
  
  // Recommendation section
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Recommendation", 20, y);
  y += 8;
  
  const recommendFullAssessment = overallScore < 80;
  const recommendColor = recommendFullAssessment ? RGB.teal : RGB.green;
  doc.setFillColor(...recommendColor);
  doc.roundedRect(20, y, pageWidth - 40, 15, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(...RGB.white);
  doc.text(recommendFullAssessment ? "Based on preliminary findings, we recommend proceeding with a full assessment." : "Strong foundation identified. Full assessment optional but recommended.", 25, y + 10);
  y += 22;
  
  // Rationale bullets - derived from actual analysis findings
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.setFont("helvetica", "normal");
  
  // Build dynamic rationale based on actual findings
  const rationalePoints: string[] = [];
  
  // Add based on biggest gap dimension
  if (lowestDimension.score < 50) {
    rationalePoints.push(`${biggestGapName} shows significant improvement opportunity (${Math.round(lowestDimension.score)}%)`);
  } else {
    rationalePoints.push(`${biggestGapName} identified as primary focus area for optimization`);
  }
  
  // Add based on keyFindings if available
  if (keyFindings.length > 0) {
    rationalePoints.push(keyFindings[0].length > 70 ? keyFindings[0].substring(0, 67) + '...' : keyFindings[0]);
  } else {
    rationalePoints.push("Clear operational process improvement opportunities identified");
  }
  
  // Add peer comparison point based on overall score
  const estimatedPercentile = Math.max(1, Math.min(99, Math.round(overallScore * 0.9)));
  if (estimatedPercentile < 50) {
    rationalePoints.push(`Current performance indicates room for improvement vs industry peers`);
  } else {
    rationalePoints.push(`Strong foundation - opportunity to reach leading practice level`);
  }
  
  // Add value potential with appropriate disclaimer
  const estimatedValueMin = Math.max(30, Math.round((100 - overallScore) * 2));
  const estimatedValueMax = Math.max(80, Math.round((100 - overallScore) * 5));
  rationalePoints.push(`Indicative value range: £${estimatedValueMin}K-£${estimatedValueMax}K annually (subject to validation)`);
  
  for (const point of rationalePoints) {
    const pointLines = wrapText(doc, `• ${point}`, pageWidth - 50);
    doc.text(pointLines[0], 25, y);
    y += 6;
  }
  y += 8;
  
  // If You Proceed section
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("If You Proceed with Full Assessment", 20, y);
  y += 8;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(20, y, pageWidth - 40, 65, 3, 3, "F");
  
  // Calculate indicative value ranges with appropriate bounds
  const valueRangeMin = Math.max(25, Math.round((100 - overallScore) * 2.5));
  const valueRangeMax = Math.max(75, Math.round((100 - overallScore) * 6));
  
  const proceedItems = [
    { label: "Timing:", value: "2-3 weeks from pre-assessment to delivery" },
    { label: "Investment:", value: "Complimentary - assessment is free" },
    { label: "CFO Involvement:", value: "12 workshops (36 hours over 4 months)" },
    { label: "Indicative Value*:", value: `£${valueRangeMin}K-£${valueRangeMax}K annual range` },
    { label: "Typical ROI*:", value: "3-6x depending on implementation scope" },
  ];
  
  let proceedY = y + 8;
  doc.setFontSize(8);
  for (const item of proceedItems) {
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text(item.label, 25, proceedY);
    doc.setTextColor(...RGB.darkGrey);
    doc.setFont("helvetica", "normal");
    doc.text(item.value, 65, proceedY);
    proceedY += 8;
  }
  
  // Deliverables list
  doc.setTextColor(...RGB.teal);
  doc.setFont("helvetica", "bold");
  doc.text("Deliverables:", 25, proceedY);
  proceedY += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...RGB.darkGrey);
  const deliverables = ["18-page comprehensive report", "8 detailed benchmarks", "Transformation roadmap", "Workshop schedule"];
  for (const d of deliverables) {
    doc.text(`• ${d}`, 30, proceedY);
    proceedY += 5;
  }
  y += 75;
  
  // Add disclaimer footnote for financial estimates
  doc.setFontSize(7);
  doc.setTextColor(...RGB.slateGray);
  doc.setFont("helvetica", "italic");
  doc.text("* Indicative estimates based on industry benchmarks. Actual results will vary based on implementation scope and organisational factors.", 20, y);
  y += 8;
  
  // Full Assessment Covers
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Full Assessment Covers", 20, y);
  y += 8;
  
  const benchmarks = [
    "Benchmark 1: Filing Speed & Strategic Clarity",
    "Benchmark 2: Close Cycle Efficiency",
    "Benchmark 3: Reporting Accuracy (Amendment Rate)",
    "Benchmark 4: Working Capital Efficiency (DSO)",
    "Benchmark 5: Data Quality (composite)",
    "Benchmark 6: Profitability Control (Margin Tracking)",
    "Benchmark 7: Audit Readiness",
    "Benchmark 8: Technology Foundation",
  ];
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const colWidth = (pageWidth - 40) / 2;
  for (let i = 0; i < benchmarks.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(`${benchmarks[i]}`, 25 + (col * colWidth), y + (row * 6));
  }
  y += Math.ceil(benchmarks.length / 2) * 6 + 10;
  
  // Next Steps Table
  y = checkNewPage(doc, y, 60);
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Next Steps", 20, y);
  y += 8;
  
  // Table header
  doc.setFillColor(...RGB.navy);
  doc.rect(20, y, pageWidth - 40, 10, "F");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.white);
  doc.text("Step", 25, y + 7);
  doc.text("Action", 45, y + 7);
  doc.text("Owner", 120, y + 7);
  doc.text("Timeline", 155, y + 7);
  y += 12;
  
  const nextStepsTable = [
    { step: "1", action: "Review this pre-assessment", owner: "CFO", timeline: "This week" },
    { step: "2", action: "Decide to proceed with full assessment", owner: "CFO / Finance", timeline: "By end of week" },
    { step: "3", action: "Schedule kickoff call", owner: "Constancia", timeline: "Next week" },
    { step: "4", action: "Full assessment delivery", owner: "Constancia", timeline: "2-3 weeks after" },
    { step: "5", action: "Review findings and approve roadmap", owner: "CFO", timeline: "Week after delivery" },
  ];
  
  doc.setFont("helvetica", "normal");
  for (const step of nextStepsTable) {
    doc.setFillColor(...RGB.lightGrey);
    doc.rect(20, y, pageWidth - 40, 9, "F");
    doc.setTextColor(...RGB.darkGrey);
    doc.text(step.step, 25, y + 6);
    doc.text(step.action, 45, y + 6);
    doc.text(step.owner, 120, y + 6);
    doc.text(step.timeline, 155, y + 6);
    y += 10;
  }
  
  // === PAGE 5: QUICK FACTS ===
  doc.addPage();
  y = addHeader(doc, config);
  
  y = addSection(doc, "Quick Facts", y);
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("One-Page Summary - Based on Assessment Responses", 20, y);
  y += 12;
  
  // Section 1: Dimension Scores Grid
  doc.setFontSize(10);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Dimension Scores Overview", 20, y);
  y += 8;
  
  // Build quick facts from actual dimension data
  const quickFacts: { label: string; score: number; rating: 'red' | 'amber' | 'green' }[] = [];
  
  // Add dimension scores (up to 5)
  for (const dim of dimensionEntries.slice(0, 5)) {
    const dimLabel = dim.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    quickFacts.push({
      label: dimLabel,
      score: Math.round(dim.score),
      rating: dim.rating
    });
  }
  
  // Draw dimension score rows with colored status badges
  const rowHeight = 12;
  for (const fact of quickFacts) {
    const statusColor = fact.rating === 'green' ? RGB.green : fact.rating === 'amber' ? RGB.amber : RGB.red;
    const statusLabel = getStatusLabel(fact.rating);
    
    // Light background row
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, y - 3, pageWidth - 40, rowHeight, 2, 2, "F");
    
    // Dimension name
    doc.setFontSize(9);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text(fact.label, 25, y + 5);
    
    // Score value
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`${fact.score}%`, 115, y + 5);
    
    // Status badge with colored background
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - 65, y - 1, 40, 9, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.white);
    doc.text(statusLabel, pageWidth - 63, y + 5);
    
    y += rowHeight + 2;
  }
  
  // Overall Assessment row (highlighted with gauge and KPI cards)
  y += SPACING.md;
  const overallRatingQF = overallScore >= 70 ? 'green' as const : overallScore >= 40 ? 'amber' as const : 'red' as const;
  const overallStatusColor = overallRatingQF === 'green' ? RGB.green : overallRatingQF === 'amber' ? RGB.amber : RGB.red;
  const readinessLabel = `${analysis.readinessLevel?.charAt(0).toUpperCase()}${analysis.readinessLevel?.slice(1) || 'Moderate'}`;
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, y - 3, pageWidth - 40, 45, 3, 3, "F");
  
  drawGauge(doc, 55, y + 25, 22, overallScore, 100, overallStatusColor);
  
  const kpiCardWidth = 70;
  drawKpiCard(doc, 90, y, kpiCardWidth, 40, "Overall Score", `${Math.round(overallScore)}%`, readinessLabel, overallStatusColor);
  
  y = drawProgressBar(doc, 90 + kpiCardWidth + SPACING.md, y + 15, pageWidth - 190, 8, overallScore, 100, overallStatusColor, true);
  
  y += 35;
  
  // Section 2: Key Findings
  doc.setFontSize(10);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Key Findings from Assessment", 20, y);
  y += 8;
  
  doc.setFillColor(248, 250, 252);
  const findingsBoxHeight = Math.max(35, (Math.min(keyFindings.length, 3) || 1) * 10 + 15);
  doc.roundedRect(20, y, pageWidth - 40, findingsBoxHeight, 3, 3, "F");
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  
  let findingY = y + 10;
  if (keyFindings.length > 0) {
    for (const finding of keyFindings.slice(0, 3)) {
      const findingShort = finding.length > 80 ? finding.substring(0, 77) + '...' : finding;
      doc.text(`• ${findingShort}`, 25, findingY);
      findingY += 9;
    }
  } else {
    doc.text("• Detailed findings available in full assessment", 25, findingY);
  }
  
  y += findingsBoxHeight + 10;
  
  // Section 3: Top Recommendations
  doc.setFontSize(10);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Top Recommendations", 20, y);
  y += 8;
  
  doc.setFillColor(248, 250, 252);
  const recsBoxHeight = Math.max(30, (Math.min(prioritisedRecommendations.length, 2) || 1) * 10 + 12);
  doc.roundedRect(20, y, pageWidth - 40, recsBoxHeight, 3, 3, "F");
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  
  let recY = y + 10;
  if (prioritisedRecommendations.length > 0) {
    for (const rec of prioritisedRecommendations.slice(0, 2)) {
      const recShort = rec.title.length > 75 ? rec.title.substring(0, 72) + '...' : rec.title;
      doc.text(`• ${recShort}`, 25, recY);
      recY += 9;
    }
  } else {
    doc.text("• Recommendations available upon full assessment", 25, recY);
  }
  
  y += recsBoxHeight + 15;
  
  // CTA box
  doc.setFillColor(...RGB.navy);
  doc.roundedRect(20, y, pageWidth - 40, 40, 5, 5, "F");
  
  doc.setTextColor(...RGB.cyan);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to Transform Your Finance Function?", pageWidth / 2, y + 15, { align: "center" });
  
  doc.setTextColor(...RGB.cream);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Contact Constancia to discuss your transformation journey", pageWidth / 2, y + 26, { align: "center" });
  doc.text(`${PDF_CONTACT_INFO.email}  |  ${PDF_CONTACT_INFO.website}`, pageWidth / 2, y + 35, { align: "center" });
  
  // === BACK PAGE: CONTACT & CONFIDENTIALITY ===
  doc.addPage();
  doc.setFillColor(...RGB.navy);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Prepared by
  doc.setFontSize(14);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "bold");
  doc.text("Prepared by", margin, 40);
  
  doc.setFontSize(20);
  doc.setTextColor(...RGB.cyan);
  doc.text("Constancia Finance Transformation", margin, 60);
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "normal");
  doc.text("CFO Assessment Team", margin, 80);
  
  // Contact details
  doc.setFontSize(10);
  doc.setTextColor(...RGB.slateGray);
  doc.text(`Email: ${PDF_CONTACT_INFO.email}`, margin, 100);
  doc.text(`Website: ${PDF_CONTACT_INFO.website}`, margin, 112);
  doc.text(`Address: ${PDF_CONTACT_INFO.address}`, margin, 124);
  
  // Confidentiality notice
  doc.setFontSize(12);
  doc.setTextColor(...RGB.cyan);
  doc.setFont("helvetica", "bold");
  doc.text("Confidentiality Notice", margin, 160);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "normal");
  const confidentialityText = "This report is confidential and for CFO review only. It contains preliminary assessment findings based on your questionnaire responses and should not be shared externally without prior approval.";
  const confidentialityLines = wrapText(doc, confidentialityText, pageWidth - 40);
  doc.text(confidentialityLines, margin, 175);
  
  // Disclaimer
  doc.setFontSize(12);
  doc.setTextColor(...RGB.cyan);
  doc.setFont("helvetica", "bold");
  doc.text("Disclaimer", margin, 210);
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "normal");
  const disclaimerText = "This pre-assessment is based on your self-reported questionnaire responses. A full assessment will include detailed interviews and deeper analysis. Findings may be refined based on additional information discovered during the full assessment process.";
  const disclaimerLines = wrapText(doc, disclaimerText, pageWidth - 40);
  doc.text(disclaimerLines, margin, 225);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...RGB.slateGray);
  doc.text(`© ${new Date().getFullYear()} Constancia Finance Transformation. All rights reserved.`, margin, pageHeight - 30);
  doc.text(`Report generated: ${formatDateUK()}`, margin, pageHeight - 20);
  
  // Add footers to content pages (pages 2-6)
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages - 1; i++) { // Skip cover and back page
    doc.setPage(i);
    addFooter(doc, i - 1, totalPages - 2);
  }
  
  return doc;
}

/**
 * Original detailed pre-assessment report (now used as base for full assessment)
 * This provides more comprehensive analysis with spider charts and detailed dimensions
 */
export function generatePreAssessmentReport(
  config: PDFConfig,
  analysis: AnalysisResult
): jsPDFType {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let y = addHeader(doc, config);
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.darkGrey);
  doc.text(`Company: ${config.company.name}`, 20, y);
  doc.text(`Contact: ${config.contact.firstName} ${config.contact.lastName}`, 20, y + 6);
  doc.text(`Assessment Date: ${new Date(config.assessment.startedAt || new Date()).toLocaleDateString("en-GB")}`, 20, y + 12);
  y += 25;
  
  y = addSection(doc, "Executive Summary", y);
  const summaryLines = wrapText(doc, analysis.summary, pageWidth - 40);
  doc.text(summaryLines, 20, y);
  y += summaryLines.length * 6 + 10;
  
  y = addSection(doc, "Overall EPM Readiness", y);
  
  doc.setFontSize(24);
  doc.setTextColor(...RGB.navy);
  doc.text(`${analysis.overallScore}%`, 20, y + 5);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(analysis.readinessLevel.charAt(0).toUpperCase() + analysis.readinessLevel.slice(1) + " Readiness", 60, y + 5);
  
  y += 20;
  
  if (analysis.dimensionScores && Object.keys(analysis.dimensionScores).length >= 3) {
    doc.addPage();
    y = 25;
    
    y = addSection(doc, "Dimension Analysis - Spider Chart", y);
    
    const chartCenterX = pageWidth / 2;
    const chartCenterY = y + 70;
    const chartRadius = 50;
    
    drawSpiderChart(doc, chartCenterX, chartCenterY, chartRadius, analysis.dimensionScores);
    
    y = chartCenterY + chartRadius + 30;
    
    y = addSection(doc, "Dimension Details", y);
    
    const normalizedScores = normalizeDimensionScores(analysis.dimensionScores);
    for (const [dimension, dimData] of Object.entries(normalizedScores)) {
      y = checkNewPage(doc, y, 35);
      
      const dimName = dimension.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      
      const scoreBarWidth = 60;
      const scoreFilled = (dimData.score / 100) * scoreBarWidth;
      const scoreColor = getScoreColor(dimData.score);
      
      doc.setFontSize(11);
      doc.setTextColor(...RGB.navy);
      doc.text(dimName, 20, y);
      
      doc.setFillColor(...RGB.lightGrey);
      doc.roundedRect(90, y - 4, scoreBarWidth, 6, 1, 1, "F");
      doc.setFillColor(...scoreColor);
      doc.roundedRect(90, y - 4, scoreFilled, 6, 1, 1, "F");
      
      doc.setFontSize(10);
      doc.text(`${dimData.score}%`, 155, y);
      y += 8;
      
      if (dimData.analysis) {
        doc.setFontSize(9);
        doc.setTextColor(...RGB.darkGrey);
        const analysisLines = wrapText(doc, dimData.analysis, pageWidth - 45);
        doc.text(analysisLines, 25, y);
        y += analysisLines.length * 4 + 5;
      }
      
      if (dimData.recommendations.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(...RGB.teal);
        const firstRec = dimData.recommendations[0];
        if (firstRec) {
          const recLines = wrapText(doc, `→ ${firstRec}`, pageWidth - 50);
          doc.text(recLines, 28, y);
          y += recLines.length * 3.5;
        }
      }
      
      y += 5;
    }
  }
  
  y = checkNewPage(doc, y, 40);
  y = addSection(doc, "Key Findings", y);
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  
  for (let i = 0; i < analysis.keyFindings.length; i++) {
    const lines = wrapText(doc, `${i + 1}. ${analysis.keyFindings[i]}`, pageWidth - 50);
    y = checkNewPage(doc, y, lines.length * 5);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 3;
  }
  
  doc.addPage();
  y = 25;
  
  y = addSection(doc, "Prioritised Recommendations", y);
  
  for (const rec of analysis.prioritisedRecommendations) {
    y = checkNewPage(doc, y, 25);
    
    const priorityColor = getPriorityColor(rec.priority);
    doc.setFillColor(...priorityColor);
    doc.roundedRect(20, y - 3, 15, 5, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.white);
    doc.text(rec.priority.toUpperCase(), 22, y);
    
    doc.setFontSize(11);
    doc.setTextColor(...RGB.navy);
    doc.text(rec.title, 40, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    const descLines = wrapText(doc, rec.description, pageWidth - 50);
    doc.text(descLines, 25, y);
    y += descLines.length * 4 + 3;
    
    doc.setTextColor(...RGB.green);
    doc.text(`Expected Benefit: ${rec.expectedBenefit}`, 25, y);
    y += 10;
  }
  
  y = checkNewPage(doc, y, 40);
  y = addSection(doc, "Recommended Next Steps", y);
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  
  for (let i = 0; i < analysis.nextSteps.length; i++) {
    const lines = wrapText(doc, `${i + 1}. ${analysis.nextSteps[i]}`, pageWidth - 50);
    y = checkNewPage(doc, y, lines.length * 5);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 3;
  }
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i - 1, totalPages - 1);
  }
  
  return doc;
}

export function generateFullAssessmentReport(
  config: PDFConfig,
  analysis: AnalysisResult
): jsPDFType {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGINS.left;
  
  // Helper to get dimension label from key
  const getDimensionLabel = (key: string): { short: string; full: string } => {
    const mapping: Record<string, string> = {
      financial_planning_analysis: 'D1_STRATEGY',
      consolidation_close: 'D2_PROCESS',
      organisation_people: 'D3_ORGANISATION',
      technology_systems: 'D4_TECHNOLOGY',
      data_analytics: 'D5_DATA',
      management_reporting: 'D6_KPIS',
      financial_controls_compliance: 'D7_GOVERNANCE',
      ai_machine_learning: 'D8_AI',
    };
    const dimKey = mapping[key];
    if (dimKey && DIMENSION_LABELS[dimKey]) {
      return DIMENSION_LABELS[dimKey];
    }
    return { short: key.replace(/_/g, ' '), full: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
  };

  // Helper to get benchmark data for a dimension
  const getBenchmarkForDimension = (key: string) => {
    const mapping: Record<string, keyof typeof DIMENSION_BENCHMARKS> = {
      financial_planning_analysis: 'D1_STRATEGY',
      consolidation_close: 'D2_PROCESS',
      organisation_people: 'D3_ORGANISATION',
      technology_systems: 'D4_TECHNOLOGY',
      data_analytics: 'D5_DATA',
      management_reporting: 'D6_KPIS',
      financial_controls_compliance: 'D7_GOVERNANCE',
      ai_machine_learning: 'D8_AI',
    };
    const dimKey = mapping[key];
    if (dimKey) {
      return DIMENSION_BENCHMARKS[dimKey];
    }
    return { industryAverage: 2.5, worldClass: 4.0 };
  };

  // Helper to calculate percentile from score
  const calculatePercentile = (score: number): number => {
    if (score >= 80) return 90 + Math.min(10, (score - 80) / 2);
    if (score >= 60) return 60 + ((score - 60) / 20) * 30;
    if (score >= 40) return 30 + ((score - 40) / 20) * 30;
    return Math.max(5, (score / 40) * 30);
  };

  // Helper to estimate financial impact based on gap
  const estimateFinancialImpact = (gap: number, dimensionKey: string): { min: number; max: number } => {
    const baseFactors: Record<string, number> = {
      financial_planning_analysis: 75000,
      consolidation_close: 50000,
      organisation_people: 40000,
      technology_systems: 100000,
      data_analytics: 60000,
      management_reporting: 45000,
      financial_controls_compliance: 80000,
      ai_machine_learning: 120000,
    };
    const baseFactor = baseFactors[dimensionKey] || 50000;
    const min = Math.round(gap * baseFactor * 0.8);
    const max = Math.round(gap * baseFactor * 1.5);
    return { min, max };
  };

  // ========== COVER PAGE ==========
  doc.setFillColor(...RGB.navy);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  const fullAssessmentLogo = getLogoTurquoise();
  if (fullAssessmentLogo) {
    try {
      doc.addImage(fullAssessmentLogo, "PNG", margin, 25, 45, 15);
    } catch (e) {
      doc.setFontSize(32);
      doc.setTextColor(...RGB.cyan);
      doc.text("Constancia", margin, 40);
    }
  } else {
    doc.setFontSize(32);
    doc.setTextColor(...RGB.cyan);
    doc.text("Constancia", margin, 40);
  }
  
  doc.setFontSize(28);
  doc.setTextColor(...RGB.cream);
  doc.text("FinanceCompass", margin, 85);
  
  doc.setFontSize(18);
  doc.text("Full Assessment Report", margin, 105);
  
  doc.setFontSize(13);
  doc.setTextColor(...RGB.cyan);
  doc.text("Navigate Your Finance Transformation Journey with Confidence", margin, 130);
  
  doc.setDrawColor(...RGB.cyan);
  doc.setLineWidth(2);
  doc.line(margin, 145, margin + 80, 145);
  
  doc.setFontSize(22);
  doc.setTextColor(...RGB.cream);
  doc.text(config.company.name, margin, pageHeight / 2 - 5);
  
  doc.setFontSize(14);
  doc.text(`Prepared for: ${config.contact.firstName} ${config.contact.lastName}`, margin, pageHeight / 2 + 20);
  if (config.contact.roleTitle) {
    doc.setFontSize(12);
    doc.setTextColor(...RGB.slateGray);
    doc.text(config.contact.roleTitle, margin, pageHeight / 2 + 35);
  }
  
  const assessmentDate = config.assessment.startedAt 
    ? new Date(config.assessment.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : formatDateUK();
  doc.setFontSize(11);
  doc.setTextColor(...RGB.slateGray);
  doc.text(`Assessment Date: ${assessmentDate}`, margin, pageHeight / 2 + 55);
  
  // Confidentiality notice
  doc.setFillColor(255, 255, 255, 0.1);
  doc.roundedRect(margin, pageHeight - 95, pageWidth - 2 * margin, 35, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.cream);
  doc.text("CONFIDENTIAL", margin + 5, pageHeight - 82);
  doc.setFontSize(8);
  doc.setTextColor(...RGB.slateGray);
  const confidentialText = "This document contains proprietary information intended solely for the named recipient. Unauthorised distribution, copying, or disclosure is strictly prohibited.";
  const confLines = wrapText(doc, confidentialText, pageWidth - 2 * margin - 10);
  doc.text(confLines, margin + 5, pageHeight - 72);
  
  // Footer on cover
  doc.setFontSize(10);
  doc.setTextColor(...RGB.cream);
  doc.text(`${PDF_CONTACT_INFO.email}  |  ${PDF_CONTACT_INFO.website}`, margin, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(...RGB.slateGray);
  doc.text(`Generated: ${formatDateUK()}`, pageWidth - margin, pageHeight - 20, { align: "right" });

  // ========== PAGES 1-2: EXECUTIVE SUMMARY ==========
  doc.addPage();
  let y = addHeader(doc, config);
  y = addSection(doc, "Executive Summary", y);
  
  const overallScore = analysis.overallScore || 0;
  const peerMedian = 55; // Industry average benchmark
  const gap = Math.max(0, peerMedian - overallScore);
  const percentile = calculatePercentile(overallScore);
  
  // Company Overview Box
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Company Overview", margin + 5, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.text(`Company: ${config.company.name}`, margin + 5, y + 20);
  doc.text(`Sector: ${config.company.sector || 'Not specified'}`, margin + 5, y + 28);
  const companySize = config.company.totalFte ? `${config.company.totalFte} employees` : 'Not specified';
  doc.text(`Size: ${companySize}`, pageWidth / 2, y + 20);
  const revenueText = config.company.revenueMillions ? `£${config.company.revenueMillions.toFixed(1)}M` : 'Not specified';
  doc.text(`Revenue: ${revenueText}`, pageWidth / 2, y + 28);
  y += 45;
  
  // Overall Assessment Section
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Assessment", margin, y);
  doc.setFont("helvetica", "normal");
  y += 10;
  
  // Score display with visual indicator
  const scoreColor = getScoreColor(overallScore);
  doc.setFillColor(...scoreColor);
  doc.circle(margin + 20, y + 12, 15, "F");
  doc.setFontSize(14);
  doc.setTextColor(...RGB.white);
  doc.text(`${overallScore}%`, margin + 12, y + 15);
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.darkGrey);
  doc.text(`Your Score: ${overallScore}/100`, margin + 45, y + 8);
  doc.text(`Peer Median: ${peerMedian}/100`, margin + 45, y + 16);
  doc.text(`Gap to Median: ${gap > 0 ? gap : 'At or above'} points`, margin + 45, y + 24);
  doc.text(`Percentile Ranking: ${Math.round(percentile)}th`, margin + 45, y + 32);
  
  // Readiness level badge
  const readinessColors: Record<string, [number, number, number]> = {
    low: RGB.red,
    moderate: RGB.amber,
    high: RGB.teal,
    advanced: RGB.green,
  };
  const readinessColor = readinessColors[analysis.readinessLevel] || RGB.amber;
  doc.setFillColor(...readinessColor);
  doc.roundedRect(pageWidth - margin - 60, y + 5, 50, 18, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.white);
  doc.text(analysis.readinessLevel.toUpperCase(), pageWidth - margin - 55, y + 17);
  y += 45;
  
  // What's Working Well
  y = checkNewPage(doc, y, 60);
  doc.setFillColor(16, 185, 129, 0.1);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(...RGB.green);
  doc.setFont("helvetica", "bold");
  doc.text("✓ What's Working Well", margin + 5, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  
  // Get top 3 strengths from dimension scores
  const dimensionScores = analysis.dimensionScores || {};
  const sortedDimensions = Object.entries(dimensionScores)
    .map(([key, score]) => ({ key, score: typeof score === 'number' ? score : 0 }))
    .sort((a, b) => b.score - a.score);
  
  const strengths = sortedDimensions.slice(0, 3).map(d => {
    const label = getDimensionLabel(d.key);
    return `${label.full}: ${d.score}% - performing above expectations`;
  });
  
  if (strengths.length === 0) {
    strengths.push("Assessment data being processed - strengths analysis pending");
  }
  
  let strengthY = y + 22;
  strengths.forEach(strength => {
    const lines = wrapText(doc, `• ${strength}`, pageWidth - 2 * margin - 15);
    doc.text(lines[0], margin + 8, strengthY);
    strengthY += 10;
  });
  y += 60;
  
  // Primary Concerns with severity badges
  y = checkNewPage(doc, y, 80);
  doc.setFillColor(239, 68, 68, 0.1);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 65, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(...RGB.red);
  doc.setFont("helvetica", "bold");
  doc.text("⚠ Primary Concerns", margin + 5, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  // Get bottom 4 dimensions as concerns
  const concerns = sortedDimensions.slice(-4).reverse().map((d, idx) => {
    const label = getDimensionLabel(d.key);
    const severity = d.score < 30 ? 'CRITICAL' : d.score < 50 ? 'HIGH' : 'MEDIUM';
    return { text: `${label.full}: ${d.score}%`, severity };
  });
  
  if (concerns.length === 0) {
    concerns.push({ text: "Assessment data being processed - concerns analysis pending", severity: 'MEDIUM' });
  }
  
  let concernY = y + 22;
  concerns.slice(0, 4).forEach(concern => {
    doc.setTextColor(...RGB.darkGrey);
    doc.text(`• ${concern.text}`, margin + 8, concernY);
    
    // Severity badge
    const severityColor = concern.severity === 'CRITICAL' ? RGB.red : concern.severity === 'HIGH' ? RGB.orange : RGB.amber;
    doc.setFillColor(...severityColor);
    doc.roundedRect(pageWidth - margin - 50, concernY - 4, 40, 8, 2, 2, "F");
    doc.setFontSize(6);
    doc.setTextColor(...RGB.white);
    doc.text(concern.severity, pageWidth - margin - 48, concernY + 1);
    doc.setFontSize(9);
    concernY += 12;
  });
  y += 75;
  
  // Financial Impact Summary
  y = checkNewPage(doc, y, 50);
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 40, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Impact Summary", margin + 5, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  
  // Calculate total estimated impact
  let totalMinImpact = 0;
  let totalMaxImpact = 0;
  Object.entries(dimensionScores).forEach(([key, score]) => {
    const scoreNum = typeof score === 'number' ? score : 0;
    const normalizedScore = scoreNum / 100 * 5;
    const benchmark = getBenchmarkForDimension(key);
    const gapToWorldClass = Math.max(0, benchmark.worldClass - normalizedScore);
    const impact = estimateFinancialImpact(gapToWorldClass, key);
    totalMinImpact += impact.min;
    totalMaxImpact += impact.max;
  });
  
  doc.text(`Estimated Value Creation Opportunity: £${(totalMinImpact / 1000).toFixed(0)}K - £${(totalMaxImpact / 1000).toFixed(0)}K annually`, margin + 8, y + 24);
  doc.text(`Based on closing gaps to world-class benchmarks across ${Object.keys(dimensionScores).length} dimensions`, margin + 8, y + 34);
  y += 50;

  // 4-Month Roadmap Preview
  y = checkNewPage(doc, y, 45);
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("4-Month Transformation Roadmap Preview", margin, y);
  doc.setFont("helvetica", "normal");
  y += 10;
  
  const roadmapMonths = [
    { month: "Month 1", focus: "Discovery & Quick Wins", activities: "Stakeholder alignment, data collection, immediate improvements" },
    { month: "Month 2", focus: "Foundation Building", activities: "Process mapping, technology assessment, skills gap analysis" },
    { month: "Month 3", focus: "Implementation", activities: "Priority gap remediation, system enhancements, training" },
    { month: "Month 4", focus: "Optimisation", activities: "Performance monitoring, continuous improvement, scaling" },
  ];
  
  const monthWidth = (pageWidth - 2 * margin) / 4;
  roadmapMonths.forEach((rm, idx) => {
    const x = margin + idx * monthWidth;
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(x + 2, y, monthWidth - 4, 30, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text(rm.month, x + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.teal);
    doc.text(rm.focus, x + 5, y + 15);
    doc.setTextColor(...RGB.darkGrey);
    const actLines = wrapText(doc, rm.activities, monthWidth - 10);
    doc.text(actLines[0], x + 5, y + 22);
  });
  y += 42;
  
  // Next Steps Table
  y = checkNewPage(doc, y, 60);
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Recommended Next Steps", margin, y);
  doc.setFont("helvetica", "normal");
  y += 8;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Step", margin + 5, y + 5);
  doc.text("Action", margin + 30, y + 5);
  doc.text("Timeline", pageWidth - margin - 30, y + 5);
  y += 10;
  
  const nextSteps = analysis.nextSteps || ["Schedule discovery workshop", "Review detailed findings", "Prioritise quick wins", "Develop implementation roadmap"];
  nextSteps.slice(0, 5).forEach((step, idx) => {
    doc.setFontSize(8);
    doc.setTextColor(...RGB.navy);
    doc.text(`${idx + 1}.`, margin + 5, y + 5);
    doc.setTextColor(...RGB.darkGrey);
    const stepLines = wrapText(doc, step, pageWidth - margin - 80);
    doc.text(stepLines[0], margin + 30, y + 5);
    doc.text(`Week ${idx + 1}`, pageWidth - margin - 30, y + 5);
    y += 10;
  });

  // ========== PAGES 3-8: BENCHMARK ANALYSIS ==========
  doc.addPage();
  y = addHeader(doc, config);
  y = addSection(doc, "Detailed Benchmark Analysis", y);
  
  // Map dimension keys to benchmark keys
  const dimensionToBenchmarkMap: Record<string, keyof typeof DIMENSION_BENCHMARKS> = {
    financial_planning_analysis: 'D1_STRATEGY',
    consolidation_close: 'D2_PROCESS',
    organisation_people: 'D3_ORGANISATION',
    technology_systems: 'D4_TECHNOLOGY',
    data_analytics: 'D5_DATA',
    management_reporting: 'D6_KPIS',
    financial_controls_compliance: 'D7_GOVERNANCE',
    ai_machine_learning: 'D8_AI',
  };
  
  // Get all benchmarks to display
  const benchmarkEntries = Object.entries(DIMENSION_LABELS);
  let benchmarkCount = 0;
  
  for (const [benchmarkKey, labelInfo] of benchmarkEntries) {
    // Check if we need a new page (2 benchmarks per page)
    if (benchmarkCount > 0 && benchmarkCount % 2 === 0) {
      doc.addPage();
      y = addHeader(doc, config);
      y = addSection(doc, "Detailed Benchmark Analysis (continued)", y);
    }
    
    y = checkNewPage(doc, y, 100);
    
    const benchmark = DIMENSION_BENCHMARKS[benchmarkKey as keyof typeof DIMENSION_BENCHMARKS];
    const dimensionKey = labelInfo.key;
    const dimensionScore = dimensionScores[dimensionKey];
    const scoreNum = typeof dimensionScore === 'number' ? dimensionScore : (typeof dimensionScore === 'object' && (dimensionScore as any)?.score) || 0;
    const normalizedScore = (scoreNum / 100) * 5;
    const gapToWorldClass = Math.max(0, benchmark.worldClass - normalizedScore);
    const gapClassification = classifyGap(gapToWorldClass);
    const gapInfo = GAP_CLASSIFICATION[gapClassification];
    
    // Benchmark header box
    doc.setFillColor(...RGB.navy);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 14, 2, 2, "F");
    doc.setFontSize(11);
    doc.setTextColor(...RGB.white);
    doc.setFont("helvetica", "bold");
    doc.text(`${benchmarkKey.replace('_', ' ')}: ${labelInfo.full}`, margin + 5, y + 9);
    doc.setFont("helvetica", "normal");
    y += 18;
    
    // Two-column layout for metrics
    const colWidth = (pageWidth - 2 * margin - 10) / 2;
    
    // Left column: Your Metrics
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(margin, y, colWidth, 35, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Your Assessment", margin + 5, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...RGB.darkGrey);
    doc.setFontSize(8);
    doc.text(`Score: ${scoreNum}% (${normalizedScore.toFixed(1)}/5.0)`, margin + 5, y + 20);
    
    // Score indicator
    const indicatorColor = getScoreColor(scoreNum);
    doc.setFillColor(...indicatorColor);
    doc.circle(margin + colWidth - 15, y + 17, 8, "F");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.white);
    doc.text(`${scoreNum}%`, margin + colWidth - 22, y + 19);
    
    doc.setTextColor(...RGB.darkGrey);
    doc.setFontSize(8);
    doc.text(`Gap to World Class: ${gapToWorldClass.toFixed(1)}`, margin + 5, y + 30);
    
    // Right column: Peer Comparison
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(margin + colWidth + 10, y, colWidth, 35, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Peer Benchmarks", margin + colWidth + 15, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...RGB.darkGrey);
    doc.setFontSize(8);
    doc.text(`Industry Average: ${benchmark.industryAverage.toFixed(1)}/5.0`, margin + colWidth + 15, y + 20);
    doc.text(`World Class: ${benchmark.worldClass.toFixed(1)}/5.0`, margin + colWidth + 15, y + 30);
    y += 40;
    
    // Gap Classification Badge
    const gapColorRGB = gapClassification === 'CRITICAL' ? RGB.red : gapClassification === 'SIGNIFICANT' ? RGB.orange : gapClassification === 'MODERATE' ? RGB.amber : RGB.green;
    doc.setFillColor(...gapColorRGB);
    doc.roundedRect(margin, y, 60, 10, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.white);
    doc.text(`${gapInfo.label.toUpperCase()} GAP`, margin + 5, y + 7);
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(gapInfo.description, margin + 65, y + 7);
    y += 15;
    
    // Interpretation and recommendations
    const dimensionDetail = analysis.dimensionDetails?.[dimensionKey];
    const interpretation = dimensionDetail?.analysis || `This dimension requires ${gapClassification === 'CRITICAL' || gapClassification === 'SIGNIFICANT' ? 'significant' : 'moderate'} attention to reach world-class performance.`;
    
    doc.setFontSize(9);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Interpretation:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    const interpLines = wrapText(doc, interpretation, pageWidth - 2 * margin);
    doc.text(interpLines.slice(0, 2), margin, y + 8);
    y += 8 + Math.min(interpLines.length, 2) * 4 + 5;
    
    // Action Plan
    const recommendations = dimensionDetail?.recommendations || [`Conduct detailed assessment of ${labelInfo.full}`, `Identify quick wins and long-term improvements`, `Develop targeted improvement roadmap`];
    doc.setFontSize(9);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Action Plan:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    let actionY = y + 8;
    recommendations.slice(0, 2).forEach(rec => {
      const recLines = wrapText(doc, `• ${rec}`, pageWidth - 2 * margin - 10);
      doc.text(recLines[0], margin + 5, actionY);
      actionY += 8;
    });
    y = actionY + 5;
    
    // Financial Impact
    const impact = estimateFinancialImpact(gapToWorldClass, dimensionKey);
    doc.setFontSize(8);
    doc.setTextColor(...RGB.teal);
    doc.text(`Estimated Value: £${(impact.min / 1000).toFixed(0)}K - £${(impact.max / 1000).toFixed(0)}K annually`, margin, y);
    y += 15;
    
    benchmarkCount++;
  }

  // ========== PAGES 9-12: TOP 3 PRIORITY GAPS ==========
  doc.addPage();
  y = addHeader(doc, config);
  y = addSection(doc, "Top 3 Priority Gaps - Deep Dive", y);
  
  // Get bottom 3 dimensions (biggest gaps)
  const gapAnalysis = calculateGapAnalysis(
    Object.fromEntries(
      Object.entries(dimensionScores).map(([k, v]) => [k, typeof v === 'number' ? v : 0])
    )
  );
  
  const sortedGaps = Object.entries(gapAnalysis)
    .sort((a, b) => b[1].gap - a[1].gap)
    .slice(0, 3);
  
  let gapNum = 1;
  for (const [gapKey, gapData] of sortedGaps) {
    y = checkNewPage(doc, y, 150);
    
    if (gapNum > 1 && y < 50) {
      // Already on new page, continue
    } else if (y > pageHeight - 150) {
      doc.addPage();
      y = addHeader(doc, config);
      y = addSection(doc, `Priority Gap ${gapNum}: ${getDimensionLabel(gapKey).full}`, y);
    }
    
    const label = getDimensionLabel(gapKey);
    const dimensionDetail = analysis.dimensionDetails?.[gapKey];
    const scoreNum = (gapData.score / 5) * 100;
    const targetScore = (gapData.benchmark / 5) * 100 + 15; // Target slightly above industry average
    
    // Gap header
    doc.setFillColor(...RGB.navy);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 16, 3, 3, "F");
    doc.setFontSize(12);
    doc.setTextColor(...RGB.white);
    doc.setFont("helvetica", "bold");
    doc.text(`Priority ${gapNum}: ${label.full}`, margin + 5, y + 11);
    
    // Classification badge
    const classColor = gapData.classification === 'CRITICAL' ? RGB.red : gapData.classification === 'SIGNIFICANT' ? RGB.orange : RGB.amber;
    doc.setFillColor(...classColor);
    doc.roundedRect(pageWidth - margin - 55, y + 3, 50, 10, 2, 2, "F");
    doc.setFontSize(7);
    doc.text(gapData.classification, pageWidth - margin - 50, y + 10);
    doc.setFont("helvetica", "normal");
    y += 22;
    
    // Current vs Target State
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(margin, y, (pageWidth - 2 * margin - 10) / 2, 45, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(...RGB.red);
    doc.setFont("helvetica", "bold");
    doc.text("Current State", margin + 5, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(`Score: ${Math.round(scoreNum)}%`, margin + 5, y + 24);
    doc.text(`Gap to World Class: ${gapData.gap.toFixed(1)} points`, margin + 5, y + 34);
    const currentAnalysis = dimensionDetail?.analysis || "Requires improvement to reach industry standards";
    const currentLines = wrapText(doc, currentAnalysis, (pageWidth - 2 * margin - 20) / 2);
    
    doc.setFillColor(16, 185, 129, 0.1);
    doc.roundedRect(margin + (pageWidth - 2 * margin) / 2 + 5, y, (pageWidth - 2 * margin - 10) / 2, 45, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(...RGB.green);
    doc.setFont("helvetica", "bold");
    doc.text("Target State", margin + (pageWidth - 2 * margin) / 2 + 10, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(`Target Score: ${Math.round(targetScore)}%`, margin + (pageWidth - 2 * margin) / 2 + 10, y + 24);
    doc.text("Timeline: 4-6 months", margin + (pageWidth - 2 * margin) / 2 + 10, y + 34);
    y += 50;
    
    // Financial Impact
    const impact = estimateFinancialImpact(gapData.gap, gapKey);
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Impact", margin, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    
    doc.setFillColor(...RGB.lightGrey);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(`Annual Value Creation: £${(impact.min / 1000).toFixed(0)}K - £${(impact.max / 1000).toFixed(0)}K`, margin + 5, y + 10);
    doc.text(`Estimated Investment: £${((impact.min * 0.3) / 1000).toFixed(0)}K - £${((impact.max * 0.4) / 1000).toFixed(0)}K`, margin + 5, y + 18);
    const roi = ((impact.min + impact.max) / 2) / (((impact.min * 0.3) + (impact.max * 0.4)) / 2) * 100;
    doc.setTextColor(...RGB.green);
    doc.text(`Expected ROI: ${Math.round(roi)}% (1-year payback)`, pageWidth / 2, y + 14);
    y += 32;
    
    // Timeline with monthly activities
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Implementation Timeline", margin, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    
    const timeline = [
      { month: "Month 1", activity: "Assessment & Planning" },
      { month: "Month 2", activity: "Quick Wins Implementation" },
      { month: "Month 3", activity: "Core Improvements" },
      { month: "Month 4", activity: "Optimisation & Measurement" },
    ];
    
    const timelineWidth = (pageWidth - 2 * margin) / 4;
    timeline.forEach((t, idx) => {
      const x = margin + idx * timelineWidth;
      doc.setFillColor(...RGB.teal);
      doc.roundedRect(x + 2, y, timelineWidth - 4, 20, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(...RGB.white);
      doc.text(t.month, x + 5, y + 8);
      doc.setFontSize(6);
      doc.text(t.activity, x + 5, y + 15);
    });
    y += 28;
    
    // Success Metrics
    doc.setFontSize(10);
    doc.setTextColor(...RGB.navy);
    doc.setFont("helvetica", "bold");
    doc.text("Success Metrics", margin, y);
    doc.setFont("helvetica", "normal");
    y += 8;
    
    const metrics = dimensionDetail?.recommendations?.slice(0, 3) || [
      `Increase ${label.short} score by ${Math.round(gapData.gap * 20)}%`,
      "Reduce manual effort by 30%",
      "Improve data accuracy to 95%+"
    ];
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    metrics.forEach(metric => {
      doc.text(`✓ ${metric}`, margin + 5, y);
      y += 8;
    });
    
    y += 15;
    gapNum++;
  }

  // ========== PAGES 13-14: FINANCIAL IMPACT & VALUE CREATION ==========
  doc.addPage();
  y = addHeader(doc, config);
  y = addSection(doc, "Financial Impact & Value Creation", y);
  
  // Total Value Creation Summary
  doc.setFillColor(...RGB.navy);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3, "F");
  doc.setFontSize(14);
  doc.setTextColor(...RGB.cyan);
  doc.setFont("helvetica", "bold");
  doc.text("Total Value Creation Opportunity", margin + 10, y + 15);
  doc.setFontSize(24);
  doc.setTextColor(...RGB.white);
  doc.text(`£${(totalMinImpact / 1000).toFixed(0)}K - £${(totalMaxImpact / 1000).toFixed(0)}K`, margin + 10, y + 35);
  doc.setFontSize(10);
  doc.setTextColor(...RGB.cream);
  doc.setFont("helvetica", "normal");
  doc.text("Annual potential value from closing all identified gaps", margin + 10, y + 45);
  y += 60;
  
  // Value Breakdown by Gap
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Value Breakdown by Dimension", margin, y);
  doc.setFont("helvetica", "normal");
  y += 12;
  
  // Table header
  doc.setFillColor(...RGB.lightGrey);
  doc.rect(margin, y, pageWidth - 2 * margin, 10, "F");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Dimension", margin + 5, y + 7);
  doc.text("Gap", margin + 80, y + 7);
  doc.text("Value (Min)", margin + 105, y + 7);
  doc.text("Value (Max)", margin + 140, y + 7);
  doc.text("Priority", pageWidth - margin - 25, y + 7);
  y += 12;
  
  // Table rows
  Object.entries(gapAnalysis)
    .sort((a, b) => b[1].gap - a[1].gap)
    .forEach(([key, data]) => {
      y = checkNewPage(doc, y, 12);
      const label = getDimensionLabel(key);
      const impact = estimateFinancialImpact(data.gap, key);
      const priorityColor = data.classification === 'CRITICAL' ? RGB.red : data.classification === 'SIGNIFICANT' ? RGB.orange : data.classification === 'MODERATE' ? RGB.amber : RGB.green;
      
      doc.setFontSize(8);
      doc.setTextColor(...RGB.darkGrey);
      doc.text(label.short, margin + 5, y + 5);
      doc.text(data.gap.toFixed(1), margin + 85, y + 5);
      doc.text(`£${(impact.min / 1000).toFixed(0)}K`, margin + 105, y + 5);
      doc.text(`£${(impact.max / 1000).toFixed(0)}K`, margin + 140, y + 5);
      
      doc.setFillColor(...priorityColor);
      doc.roundedRect(pageWidth - margin - 35, y, 30, 8, 2, 2, "F");
      doc.setFontSize(6);
      doc.setTextColor(...RGB.white);
      doc.text(data.classification, pageWidth - margin - 33, y + 5);
      
      y += 12;
    });
  
  y += 10;
  
  // ROI Analysis
  y = checkNewPage(doc, y, 80);
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("ROI Analysis", margin, y);
  doc.setFont("helvetica", "normal");
  y += 12;
  
  const totalInvestment = (totalMinImpact * 0.35 + totalMaxImpact * 0.35) / 2;
  const avgValue = (totalMinImpact + totalMaxImpact) / 2;
  const overallROI = (avgValue / totalInvestment) * 100;
  const paybackMonths = (totalInvestment / (avgValue / 12));
  
  // ROI metrics boxes
  const roiBoxWidth = (pageWidth - 2 * margin - 20) / 3;
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, y, roiBoxWidth, 40, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.navy);
  doc.text("Total Investment", margin + 5, y + 12);
  doc.setFontSize(14);
  doc.setTextColor(...RGB.teal);
  doc.text(`£${(totalInvestment / 1000).toFixed(0)}K`, margin + 5, y + 28);
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin + roiBoxWidth + 10, y, roiBoxWidth, 40, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.navy);
  doc.text("Expected ROI", margin + roiBoxWidth + 15, y + 12);
  doc.setFontSize(14);
  doc.setTextColor(...RGB.green);
  doc.text(`${Math.round(overallROI)}%`, margin + roiBoxWidth + 15, y + 28);
  
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin + 2 * roiBoxWidth + 20, y, roiBoxWidth, 40, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.navy);
  doc.text("Payback Period", margin + 2 * roiBoxWidth + 25, y + 12);
  doc.setFontSize(14);
  doc.setTextColor(...RGB.teal);
  doc.text(`${Math.round(paybackMonths)} months`, margin + 2 * roiBoxWidth + 25, y + 28);

  // ========== PAGES 15-16: SECTOR COMPARISON & PEER BENCHMARKING ==========
  doc.addPage();
  y = addHeader(doc, config);
  y = addSection(doc, "Sector Comparison & Peer Benchmarking", y);
  
  // Percentile positioning text
  doc.setFontSize(11);
  doc.setTextColor(...RGB.darkGrey);
  const percentileText = `Your organisation ranks in the ${Math.round(percentile)}th percentile compared to peer organisations in the ${config.company.sector || 'Finance'} sector. This positions you ${percentile >= 50 ? 'above' : 'below'} the median, with ${percentile >= 75 ? 'strong competitive positioning' : percentile >= 50 ? 'opportunities for improvement' : 'significant room for growth'}.`;
  const percLines = wrapText(doc, percentileText, pageWidth - 2 * margin);
  doc.text(percLines, margin, y);
  y += percLines.length * 6 + 10;
  
  // Spider/Radar Chart
  y = checkNewPage(doc, y, 140);
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Multi-Dimensional Performance Comparison", margin, y);
  doc.setFont("helvetica", "normal");
  y += 10;
  
  // Prepare dimension scores for radar chart
  const radarData: Record<string, { score: number }> = {};
  Object.entries(dimensionScores).forEach(([key, score]) => {
    const label = getDimensionLabel(key);
    radarData[label.short] = { score: typeof score === 'number' ? score : 0 };
  });
  
  // Draw radar chart centered
  const chartCenterX = pageWidth / 2;
  const chartCenterY = y + 65;
  const chartRadius = 50;
  
  if (Object.keys(radarData).length >= 3) {
    drawSpiderChart(doc, chartCenterX, chartCenterY, chartRadius, radarData);
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...RGB.darkGrey);
    doc.text("Insufficient data for radar chart visualization", chartCenterX - 40, chartCenterY);
  }
  
  y = chartCenterY + chartRadius + 30;
  
  // Legend
  y = checkNewPage(doc, y, 40);
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 30, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Legend", margin + 5, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.darkGrey);
  doc.setFillColor(...RGB.navy);
  doc.circle(margin + 10, y + 20, 3, "F");
  doc.text("Your Score", margin + 18, y + 22);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin + 70, y + 20, margin + 85, y + 20);
  doc.text("Industry Average Grid", margin + 90, y + 22);
  y += 40;
  
  // Peer Comparison Table
  y = checkNewPage(doc, y, 80);
  doc.setFontSize(12);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Dimension-by-Dimension Peer Comparison", margin, y);
  doc.setFont("helvetica", "normal");
  y += 12;
  
  // Table header
  doc.setFillColor(...RGB.lightGrey);
  doc.rect(margin, y, pageWidth - 2 * margin, 10, "F");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Dimension", margin + 5, y + 7);
  doc.text("Your Score", margin + 65, y + 7);
  doc.text("Industry Avg", margin + 100, y + 7);
  doc.text("World Class", margin + 135, y + 7);
  doc.text("Status", pageWidth - margin - 25, y + 7);
  y += 12;
  
  Object.entries(DIMENSION_LABELS).forEach(([benchKey, labelInfo]) => {
    y = checkNewPage(doc, y, 12);
    const benchmark = DIMENSION_BENCHMARKS[benchKey as keyof typeof DIMENSION_BENCHMARKS];
    const dimScore = dimensionScores[labelInfo.key];
    const scoreNum = typeof dimScore === 'number' ? dimScore : 0;
    const normalizedScore = (scoreNum / 100) * 5;
    
    const status = normalizedScore >= benchmark.worldClass ? 'LEADING' : 
                   normalizedScore >= benchmark.industryAverage ? 'ON TRACK' : 'BELOW';
    const statusColor = status === 'LEADING' ? RGB.green : status === 'ON TRACK' ? RGB.amber : RGB.red;
    
    doc.setFontSize(8);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(labelInfo.short, margin + 5, y + 5);
    doc.text(`${normalizedScore.toFixed(1)}/5.0`, margin + 65, y + 5);
    doc.text(`${benchmark.industryAverage.toFixed(1)}/5.0`, margin + 100, y + 5);
    doc.text(`${benchmark.worldClass.toFixed(1)}/5.0`, margin + 135, y + 5);
    
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - margin - 35, y, 30, 8, 2, 2, "F");
    doc.setFontSize(6);
    doc.setTextColor(...RGB.white);
    doc.text(status, pageWidth - margin - 33, y + 5);
    
    y += 12;
  });

  // ========== PAGES 17-18: 4-MONTH ROADMAP & WORKSHOPS ==========
  doc.addPage();
  y = addHeader(doc, config);
  y = addSection(doc, "4-Month Transformation Roadmap", y);
  
  // Month-by-month detailed activities
  const detailedRoadmap = [
    {
      month: "Month 1: Discovery & Quick Wins",
      activities: [
        "Stakeholder alignment workshops",
        "Current state documentation",
        "Quick win identification and implementation",
        "Technology landscape assessment"
      ],
      cfoTime: "8-10 hours"
    },
    {
      month: "Month 2: Foundation Building",
      activities: [
        "Process optimization workshops",
        "Skills gap analysis and training plan",
        "Technology requirements definition",
        "Data quality assessment"
      ],
      cfoTime: "6-8 hours"
    },
    {
      month: "Month 3: Implementation",
      activities: [
        "Priority gap remediation execution",
        "System configuration and testing",
        "Change management rollout",
        "Performance baseline establishment"
      ],
      cfoTime: "8-10 hours"
    },
    {
      month: "Month 4: Optimisation",
      activities: [
        "Performance monitoring and tuning",
        "Continuous improvement processes",
        "Success metrics validation",
        "Future roadmap planning"
      ],
      cfoTime: "4-6 hours"
    }
  ];
  
  for (const rm of detailedRoadmap) {
    y = checkNewPage(doc, y, 55);
    
    doc.setFillColor(...RGB.navy);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(...RGB.white);
    doc.setFont("helvetica", "bold");
    doc.text(rm.month, margin + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`CFO Time: ${rm.cfoTime}`, pageWidth - margin - 50, y + 8);
    y += 16;
    
    doc.setFontSize(9);
    doc.setTextColor(...RGB.darkGrey);
    rm.activities.forEach(activity => {
      doc.text(`• ${activity}`, margin + 10, y);
      y += 8;
    });
    y += 5;
  }
  
  // Workshop Schedule
  y = checkNewPage(doc, y, 100);
  doc.addPage();
  y = addHeader(doc, config);
  y = addSection(doc, "Workshop Schedule & Next Steps", y);
  
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Recommended Workshop Programme (12 Sessions)", margin, y);
  doc.setFont("helvetica", "normal");
  y += 12;
  
  const workshops = [
    { name: "Discovery Workshop", duration: "4 hours", week: "Week 1", focus: "Current state & pain points" },
    { name: "Strategy Alignment", duration: "3 hours", week: "Week 2", focus: "Vision & objectives" },
    { name: "Process Mapping", duration: "4 hours", week: "Week 3", focus: "End-to-end processes" },
    { name: "Technology Review", duration: "3 hours", week: "Week 4", focus: "Systems & integration" },
    { name: "Data Assessment", duration: "3 hours", week: "Week 5", focus: "Data quality & governance" },
    { name: "Skills Analysis", duration: "2 hours", week: "Week 6", focus: "Team capabilities" },
    { name: "Quick Wins Planning", duration: "3 hours", week: "Week 7", focus: "Immediate improvements" },
    { name: "Implementation Design", duration: "4 hours", week: "Week 8", focus: "Solution architecture" },
    { name: "Change Management", duration: "3 hours", week: "Week 10", focus: "Adoption strategy" },
    { name: "Testing & Validation", duration: "3 hours", week: "Week 12", focus: "Quality assurance" },
    { name: "Go-Live Preparation", duration: "3 hours", week: "Week 14", focus: "Launch readiness" },
    { name: "Review & Optimise", duration: "3 hours", week: "Week 16", focus: "Performance review" },
  ];
  
  // Workshop table header
  doc.setFillColor(...RGB.lightGrey);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
  doc.setFontSize(7);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Workshop", margin + 5, y + 5);
  doc.text("Duration", margin + 60, y + 5);
  doc.text("Timing", margin + 95, y + 5);
  doc.text("Focus Area", margin + 125, y + 5);
  y += 10;
  
  workshops.forEach((w, idx) => {
    y = checkNewPage(doc, y, 10);
    doc.setFontSize(7);
    doc.setTextColor(...RGB.darkGrey);
    doc.text(`${idx + 1}. ${w.name}`, margin + 5, y + 5);
    doc.text(w.duration, margin + 60, y + 5);
    doc.text(w.week, margin + 95, y + 5);
    doc.text(w.focus, margin + 125, y + 5);
    y += 9;
  });
  
  y += 10;
  
  // CFO Time Commitment Summary
  y = checkNewPage(doc, y, 45);
  doc.setFillColor(...RGB.lightGrey);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("CFO Time Commitment", margin + 5, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...RGB.darkGrey);
  doc.text("Total Programme Duration: 4 months", margin + 5, y + 22);
  doc.text("Estimated CFO Time: 26-34 hours total (2-3 hours/week average)", margin + 5, y + 30);
  y += 45;
  
  // Call-to-Action
  y = checkNewPage(doc, y, 50);
  doc.setFillColor(...RGB.cyan);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 40, 3, 3, "F");
  doc.setFontSize(14);
  doc.setTextColor(...RGB.navy);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to Transform Your Finance Function?", margin + 10, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Contact Constancia to schedule your Discovery Workshop and begin your transformation journey.", margin + 10, y + 28);
  doc.setTextColor(...RGB.teal);
  doc.text(`${PDF_CONTACT_INFO.email}  |  ${PDF_CONTACT_INFO.website}`, margin + 10, y + 36);

  // ========== BACK PAGE ==========
  doc.addPage();
  doc.setFillColor(...RGB.navy);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Constancia Logo
  const backPageLogo = getLogoTurquoise();
  if (backPageLogo) {
    try {
      doc.addImage(backPageLogo, "PNG", pageWidth / 2 - 22.5, 35, 45, 15);
    } catch (e) {
      doc.setFontSize(36);
      doc.setTextColor(...RGB.cyan);
      doc.text("Constancia", pageWidth / 2, 50, { align: "center" });
    }
  } else {
    doc.setFontSize(36);
    doc.setTextColor(...RGB.cyan);
    doc.text("Constancia", pageWidth / 2, 50, { align: "center" });
  }
  
  // Tagline
  doc.setFontSize(14);
  doc.setTextColor(...RGB.cream);
  doc.text("FinanceTransformed, DesignedforChange,", pageWidth / 2, 80, { align: "center" });
  doc.setTextColor(...RGB.cyan);
  doc.setFont("helvetica", "italic");
  doc.text("Driven by Technology.", pageWidth / 2, 95, { align: "center" });
  doc.setFont("helvetica", "normal");
  
  // Contact Information
  doc.setFontSize(12);
  doc.setTextColor(...RGB.cream);
  doc.text("Contact Us", pageWidth / 2, 130, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(...RGB.slateGray);
  doc.text(PDF_CONTACT_INFO.email, pageWidth / 2, 145, { align: "center" });
  doc.text(PDF_CONTACT_INFO.website, pageWidth / 2, 157, { align: "center" });
  doc.text(PDF_CONTACT_INFO.address, pageWidth / 2, 169, { align: "center" });
  doc.text(PDF_CONTACT_INFO.linkedin, pageWidth / 2, 181, { align: "center" });
  
  // Disclaimer
  doc.setFillColor(255, 255, 255, 0.05);
  doc.roundedRect(margin, pageHeight - 100, pageWidth - 2 * margin, 70, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(...RGB.cream);
  doc.text("Disclaimer", margin + 5, pageHeight - 88);
  
  doc.setFontSize(7);
  doc.setTextColor(...RGB.slateGray);
  const disclaimerText = `This report is provided for informational purposes only and represents Constancia's assessment based on the information provided during the evaluation process. The findings, recommendations, and financial projections contained herein are estimates and should not be construed as guarantees of future performance.

The implementation of any recommendations should be undertaken in consultation with qualified professionals and subject to your organisation's specific circumstances, risk tolerance, and strategic objectives. Constancia accepts no liability for any decisions made based on this report.

This document is confidential and intended solely for the use of ${config.company.name}. Reproduction or distribution without written consent from Constancia is prohibited.

© ${new Date().getFullYear()} Constancia Limited. All rights reserved.`;
  
  const disclaimerLines = wrapText(doc, disclaimerText, pageWidth - 2 * margin - 10);
  doc.text(disclaimerLines, margin + 5, pageHeight - 78);

  // Add footers to all pages except cover and back
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i < totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i - 1, totalPages - 2);
  }
  
  return doc;
}

export async function generateDynamicReport(
  assessmentId: string,
  responses: FcResponse[]
): Promise<Buffer> {
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    throw new Error("Assessment not found");
  }
  
  const company = assessment.companyId ? await fcStorage.getCompanyById(assessment.companyId) : null;
  const contact = assessment.contactId ? await fcStorage.getContactById(assessment.contactId) : null;
  
  if (!company || !contact) {
    throw new Error("Company or contact not found");
  }
  
  const dimensionScores = normalizeDimensionScores(assessment.dimensionScores as Record<string, any> | null | undefined);
  
  const narratives = await generateAllNarratives(assessment, responses, dimensionScores, company);
  
  const config: PDFConfig = {
    title: "Finance Transformation Assessment Report",
    subtitle: assessment.tier === "pre_assessment" ? "Pre-Assessment Report" : "Comprehensive Assessment Report",
    tier: assessment.tier,
    company,
    contact,
    assessment,
  };
  
  const doc = new jsPDF();
  
  const orderedSections = narratives.structure.sections
    .filter(s => s.include)
    .sort((a, b) => a.priority - b.priority);
  
  let isFirstPage = true;
  
  for (const section of orderedSections) {
    const builder = SECTION_BUILDERS[section.id];
    if (!builder) continue;
    
    if (!isFirstPage && section.id !== "cover") {
      const currentY = 25;
    }
    
    if (section.id === "cover") {
      builder.build(doc, 0, config, narratives);
      doc.addPage();
      let y = addHeader(doc, config);
      isFirstPage = false;
    } else {
      let y = isFirstPage ? addHeader(doc, config) : 25;
      builder.build(doc, y, config, narratives);
      isFirstPage = false;
    }
  }
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i - 1, totalPages - 1);
  }
  
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export async function generateAssessmentPDF(
  assessmentId: string,
  analysis: AnalysisResult | GenerationTierResult
): Promise<Buffer> {
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    throw new Error("Assessment not found");
  }
  
  const company = assessment.companyId ? await fcStorage.getCompanyById(assessment.companyId) : null;
  const contact = assessment.contactId ? await fcStorage.getContactById(assessment.contactId) : null;
  
  if (!company || !contact) {
    throw new Error("Company or contact not found");
  }
  
  const config: PDFConfig = {
    title: "Finance Transformation Assessment Report",
    subtitle: assessment.tier === "pre_assessment" ? "Pre-Assessment Report" : "Comprehensive Assessment Report",
    tier: assessment.tier,
    company,
    contact,
    assessment,
  };
  
  let doc: jsPDFType;
  
  switch (assessment.tier) {
    case "registration":
      // Registration tier doesn't generate PDFs - throw helpful error
      throw new Error("Registration tier does not support PDF reports. Complete a Pre-Assessment or Full Assessment first.");
    case "quick_assessment": // Legacy support
    case "pre_assessment":
      // TIER 1: Streamlined 3-5 page pre-assessment report per JSON spec
      doc = generateTier1PreAssessmentReport(config, analysis as AnalysisResult);
      break;
    case "full":
      // TIER 2: Comprehensive 18-page full assessment report
      doc = generateFullAssessmentReport(config, analysis as AnalysisResult);
      break;
    default:
      throw new Error(`Unknown tier: ${assessment.tier}`);
  }
  
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export async function saveReportToStorage(
  assessmentId: string,
  pdfBuffer: Buffer,
  analysis: AnalysisResult | GenerationTierResult
): Promise<string> {
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    throw new Error("Assessment not found");
  }
  
  const report = await fcStorage.createReport({
    assessmentId,
    tier: assessment.tier,
    executiveSummary: analysis.summary,
    summary: {
      overallScore: "overallScore" in analysis ? analysis.overallScore : (analysis as GenerationTierResult).epmReadinessScore,
      keyFindings: "keyFindings" in analysis ? analysis.keyFindings : (analysis as GenerationTierResult).topChallenges,
    },
    recommendations: "prioritisedRecommendations" in analysis ? 
      (analysis as AnalysisResult).prioritisedRecommendations.map(r => r.description) : 
      (analysis as GenerationTierResult).quickWins,
    generatedBy: "ai",
  });
  
  await fcStorage.updateAssessment(assessmentId, { 
    status: "report_generated" as any 
  });
  
  clearNarrativeCache(assessmentId);
  
  return report.id;
}

export { clearNarrativeCache };
