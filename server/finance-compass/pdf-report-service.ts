import PdfPrinter from "pdfmake";
import type { TDocumentDefinitions, Content, StyleDictionary, ContentColumns, ContentTable } from "pdfmake/interfaces";
import { createChildLogger } from "../lib/logger";
import { fcStorage } from "./storage";
import { LOGO_TURQUOISE_BASE64 } from "../pdf-logo-base64";

const log = createChildLogger("pdf-report-service");
import type { FcAssessment, FcCompany, FcContact } from "@shared/finance-compass-schema";
import {
  BRAND_COLORS,
  DIMENSION_LABELS,
  MATURITY_LEVELS_PERCENTAGE as MATURITY_LEVELS,
  TARGET_MATURITY,
  BENCHMARK_TARGETS,
  getMaturityLevelFromPercentage as getMaturityLevel,
  getStatusInfo,
} from "@shared/finance-compass-constants";
import { generateImplementationPhases, getAggregatedTimeline } from "./intelligence-engine";

const BENCHMARK_TARGET = BENCHMARK_TARGETS.DEFAULT;

const SECTIONS = {
  COVER: "Cover",
  EXECUTIVE: "Executive Summary",
  DIAGNOSIS: "Diagnosis",
  SOLUTION: "Solution",
  EVIDENCE: "Evidence",
  APPENDIX: "Appendix",
};

function extractDimensionScores(dimensionScores: unknown): Record<string, number> {
  if (!dimensionScores) return {};
  
  if (typeof dimensionScores === "object" && dimensionScores !== null) {
    const scores: Record<string, number> = {};
    for (const [key, value] of Object.entries(dimensionScores)) {
      if (typeof value === "number") {
        scores[key] = value;
      } else if (typeof value === "object" && value !== null && "score" in value) {
        scores[key] = (value as { score: number }).score;
      }
    }
    return scores;
  }
  
  return {};
}

const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const printer = new PdfPrinter(fonts);

const styles: StyleDictionary = {
  coverTitle: {
    fontSize: 32,
    bold: true,
    color: BRAND_COLORS.white,
    alignment: "center" as const,
  },
  coverSubtitle: {
    fontSize: 18,
    color: BRAND_COLORS.brightCyan,
    alignment: "center" as const,
  },
  header: {
    fontSize: 18,
    bold: true,
    color: BRAND_COLORS.darkNavy,
    margin: [0, 0, 0, 10],
  },
  subheader: {
    fontSize: 14,
    bold: true,
    color: BRAND_COLORS.teal,
    margin: [0, 12, 0, 6],
  },
  actionTitle: {
    fontSize: 14,
    bold: true,
    color: BRAND_COLORS.darkNavy,
    margin: [0, 0, 0, 12],
  },
  sectionTitle: {
    fontSize: 12,
    bold: true,
    color: BRAND_COLORS.darkNavy,
    margin: [0, 10, 0, 6],
  },
  body: {
    fontSize: 10,
    color: BRAND_COLORS.darkGray,
    lineHeight: 1.4,
  },
  bodySmall: {
    fontSize: 9,
    color: BRAND_COLORS.darkGray,
    lineHeight: 1.3,
  },
  tableHeader: {
    fontSize: 9,
    bold: true,
    color: BRAND_COLORS.white,
    fillColor: BRAND_COLORS.darkNavy,
    alignment: "center" as const,
  },
  tableCell: {
    fontSize: 9,
    color: BRAND_COLORS.darkGray,
    alignment: "left" as const,
  },
  tableCellCenter: {
    fontSize: 9,
    color: BRAND_COLORS.darkGray,
    alignment: "center" as const,
  },
  bigNumber: {
    fontSize: 48,
    bold: true,
    color: BRAND_COLORS.teal,
    alignment: "center" as const,
  },
  mediumNumber: {
    fontSize: 28,
    bold: true,
    color: BRAND_COLORS.teal,
    alignment: "center" as const,
  },
  calloutBox: {
    fontSize: 10,
    color: BRAND_COLORS.darkGray,
  },
  footer: {
    fontSize: 8,
    color: "#666666",
    alignment: "center" as const,
  },
  tracker: {
    fontSize: 8,
    color: BRAND_COLORS.mediumGray,
  },
  trackerActive: {
    fontSize: 9,
    bold: true,
    color: BRAND_COLORS.darkNavy,
  },
  confidential: {
    fontSize: 9,
    bold: true,
    color: BRAND_COLORS.brightCyan,
  },
};

interface ReportData {
  assessment: FcAssessment;
  company: FcCompany;
  contact: FcContact;
}

interface ScoreTransparencyItem {
  dimension?: string;
  questionId?: string;
  question?: string;
  questionText?: string;
  score?: number;
  maxScore?: number;
  contribution?: number;
  responseValue?: string | number;
  pointsEarned?: number;
  maxPoints?: number;
  percentage?: number;
}

export async function generateAssessmentPdf(assessmentId: string): Promise<Buffer> {
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    throw new Error("Assessment not found");
  }

  const company = assessment.companyId 
    ? await fcStorage.getCompanyById(assessment.companyId) 
    : null;
  const contact = assessment.contactId 
    ? await fcStorage.getContactById(assessment.contactId) 
    : null;

  const fallbackCompany: FcCompany = company || {
    id: "unknown",
    name: "Your Organisation",
    sector: "Multi-sector",
    sizeBand: null,
    entities: null,
    financeFte: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as FcCompany;

  const fallbackContact = contact || {
    id: "unknown",
    email: "contact@example.com",
    firstName: "Finance",
    lastName: "Leader",
    roleTitle: "Finance Leader",
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: null,
    emailHash: null,
    phone: null,
    priorities: null,
    preferredContactMethod: null,
    gdprConsent: true,
    marketingConsent: false,
    consentTimestamp: new Date(),
    otpCode: null,
    otpExpiresAt: null,
    hasFullAssessmentAccess: false,
  } as unknown as FcContact;

  const docDefinition = buildDocumentDefinition({ 
    assessment, 
    company: fallbackCompany, 
    contact: fallbackContact 
  });
  
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);
      
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function buildDocumentDefinition(data: ReportData): TDocumentDefinitions {
  log.info("Building Big 4 consulting landscape document");
  
  const content: Content[] = [];
  
  content.push(...buildCoverPage(data));
  content.push(...buildExecutiveSummary(data));
  content.push(...buildDiagnosisSection(data));
  content.push(...buildSolutionSection(data));
  content.push(...buildEvidenceSection(data));
  content.push(...buildAppendix(data));

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [160, 45, 45, 45],
    content,
    styles,
    defaultStyle: {
      font: "Helvetica",
      fontSize: 10,
    },
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return null;
      
      const section = getSectionForPage(currentPage);
      
      return {
        columns: [
          { 
            text: "Constancia Finance Transformation Advisors", 
            style: "footer", 
            width: "*",
            margin: [160, 0, 0, 0],
          },
          { 
            text: `${section} | Page ${currentPage} of ${pageCount}`, 
            style: "footer", 
            width: "auto" 
          },
          { 
            text: "CONFIDENTIAL", 
            style: "footer", 
            width: "*", 
            alignment: "right",
            margin: [0, 0, 45, 0],
          },
        ],
        margin: [0, 10, 0, 0],
      };
    },
    background: (currentPage: number) => {
      if (currentPage === 1) {
        return {
          canvas: [
            {
              type: "rect",
              x: 0,
              y: 0,
              w: 842,
              h: 595,
              color: BRAND_COLORS.darkNavy,
            },
          ],
        };
      }
      
      return {
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: 120,
            h: 595,
            color: BRAND_COLORS.trackerGray,
          },
        ],
      };
    },
  };
}

function getSectionForPage(page: number): string {
  if (page === 1) return SECTIONS.COVER;
  if (page >= 2 && page <= 4) return SECTIONS.EXECUTIVE;
  if (page >= 5 && page <= 9) return SECTIONS.DIAGNOSIS;
  if (page >= 10 && page <= 14) return SECTIONS.SOLUTION;
  if (page >= 15 && page <= 17) return SECTIONS.EVIDENCE;
  return SECTIONS.APPENDIX;
}

function buildTrackerSidebar(currentSection: string): Content {
  const sections = [
    SECTIONS.EXECUTIVE,
    SECTIONS.DIAGNOSIS,
    SECTIONS.SOLUTION,
    SECTIONS.EVIDENCE,
    SECTIONS.APPENDIX,
  ];
  
  return {
    absolutePosition: { x: 8, y: 55 },
    stack: sections.map((section, index) => {
      const isActive = section === currentSection;
      return {
        columns: [
          {
            width: 4,
            text: "",
            canvas: isActive ? [{
              type: "rect",
              x: 0,
              y: 0,
              w: 3,
              h: 14,
              color: BRAND_COLORS.teal,
            }] : [],
          },
          {
            width: "*",
            text: section,
            style: isActive ? "trackerActive" : "tracker",
            margin: [4, 2, 0, 0] as [number, number, number, number],
          },
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number],
      };
    }),
  } as Content;
}

function buildCalloutBox(title: string, content: string | Content[]): Content {
  const bodyContent = typeof content === "string" 
    ? [{ text: content, style: "body" }]
    : content;
    
  return {
    table: {
      widths: ["*"],
      body: [[
        {
          stack: [
            { text: title.toUpperCase(), style: { fontSize: 8, bold: true, color: BRAND_COLORS.teal }, margin: [0, 0, 0, 6] },
            ...bodyContent,
          ],
          margin: [12, 10, 12, 10],
        }
      ]],
    },
    layout: {
      fillColor: () => BRAND_COLORS.calloutBg,
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => BRAND_COLORS.calloutBorder,
      vLineColor: () => BRAND_COLORS.calloutBorder,
    },
    margin: [0, 0, 0, 15] as [number, number, number, number],
  };
}

function buildActionTitle(text: string): Content {
  return {
    text,
    style: "actionTitle",
  };
}

function buildCoverPage(data: ReportData): Content[] {
  const { company, contact } = data;
  const assessmentDate = data.assessment.completedAt 
    ? new Date(data.assessment.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  
  return [
    {
      stack: [
        { text: "", margin: [0, 120, 0, 0] },
        {
          image: LOGO_TURQUOISE_BASE64,
          width: 180,
          alignment: "center",
          margin: [0, 0, 0, 50],
        },
        {
          text: "EPM READINESS ASSESSMENT",
          style: "coverTitle",
          margin: [0, 0, 0, 20],
        },
        {
          text: company.name || "Your Organisation",
          style: "coverSubtitle",
          margin: [0, 0, 0, 80],
        },
        {
          text: assessmentDate,
          style: { fontSize: 12, color: BRAND_COLORS.offWhite, alignment: "center" as const },
          margin: [0, 0, 0, 10],
        },
        {
          text: "CONFIDENTIAL",
          style: "confidential",
          alignment: "center",
        },
        {
          text: "",
          margin: [0, 60, 0, 0],
        },
        {
          text: `Prepared for: ${contact.firstName} ${contact.lastName}, ${contact.roleTitle || "Finance Leader"}`,
          style: { fontSize: 10, color: BRAND_COLORS.offWhite, alignment: "center" as const },
          pageBreak: "after",
        },
      ],
    },
  ];
}

function buildExecutiveSummary(data: ReportData): Content[] {
  const { assessment, company, contact } = data;
  const overallScore = assessment.overallMaturityScore || assessment.epmReadinessScore || 0;
  const dimensionScores = extractDimensionScores(assessment.dimensionScores);
  const sortedDimensions = Object.entries(dimensionScores).sort(([, a], [, b]) => b - a);
  
  const criticalDims = sortedDimensions.filter(([, s]) => s < 50);
  const atRiskDims = sortedDimensions.filter(([, s]) => s >= 50 && s <= 70);
  const onTrackDims = sortedDimensions.filter(([, s]) => s > 70);
  
  const maturityLevel = getMaturityLevel(overallScore);
  const gapToBenchmark = BENCHMARK_TARGET - overallScore;
  const gapToTarget = TARGET_MATURITY - overallScore;
  
  const content: Content[] = [];
  
  content.push({
    text: "Executive Summary",
    style: "header",
    margin: [0, 0, 0, 20],
  });
  
  content.push(buildTrackerSidebar(SECTIONS.EXECUTIVE));
  
  const situationText = generateSituationContext(company, overallScore, criticalDims.length, atRiskDims.length);
  content.push({
    text: situationText,
    style: "body",
    margin: [0, 0, 0, 20],
  });
  
  const primaryRecommendation = generatePrimaryRecommendation(overallScore, criticalDims, atRiskDims, sortedDimensions);
  content.push(buildCalloutBox("Recommendation", primaryRecommendation));
  
  content.push({
    columns: [
      {
        width: "30%",
        stack: [
          { text: "Overall Maturity Score", style: { fontSize: 10, color: BRAND_COLORS.mediumGray, alignment: "center" as const }, margin: [0, 0, 0, 10] },
          { text: `${Math.round(overallScore)}%`, style: "bigNumber" },
          { 
            text: maturityLevel.label.toUpperCase(), 
            style: { fontSize: 12, bold: true, color: maturityLevel.color, alignment: "center" as const },
            margin: [0, 8, 0, 0],
          },
        ],
      },
      {
        width: "35%",
        stack: [
          buildMetricBox("Gap to Benchmark", `${Math.abs(Math.round(gapToBenchmark))}%`, gapToBenchmark > 0 ? "below" : "above", gapToBenchmark > 0 ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusGreen),
          buildMetricBox("Gap to Target", `${Math.abs(Math.round(gapToTarget))}%`, gapToTarget > 0 ? "to close" : "exceeded", gapToTarget > 0 ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusGreen),
        ],
      },
      {
        width: "35%",
        stack: [
          buildMetricBox("Critical Gaps", `${criticalDims.length}`, "dimensions", BRAND_COLORS.statusRed),
          buildMetricBox("At Risk", `${atRiskDims.length}`, "dimensions", BRAND_COLORS.statusOrange),
          buildMetricBox("On Track", `${onTrackDims.length}`, "dimensions", BRAND_COLORS.statusGreen),
        ],
      },
    ],
    margin: [0, 20, 0, 0],
  });
  
  content.push({
    text: "Key Factors",
    style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
    margin: [0, 20, 0, 10],
  });
  
  const supportingArgs = generateSupportingArguments(overallScore, criticalDims, atRiskDims, onTrackDims, sortedDimensions);
  
  for (const arg of supportingArgs) {
    content.push({
      columns: [
        {
          width: 20,
          text: "►",
          style: { fontSize: 12, color: BRAND_COLORS.teal },
        },
        {
          width: "*",
          stack: [
            { text: arg.title, style: { fontSize: 11, bold: true, color: BRAND_COLORS.darkNavy }, margin: [0, 0, 0, 4] },
            { text: arg.detail, style: "body" },
          ],
        },
      ],
      margin: [0, 0, 0, 15] as [number, number, number, number],
    });
  }
  
  const roiEstimate = calculateROIEstimate(overallScore, criticalDims.length);
  content.push(buildCalloutBox("Value Opportunity", [
    { 
      text: `Evidence suggests targeted improvements could deliver ${roiEstimate.efficiency}% efficiency gains and reduce close cycle by ${roiEstimate.closeDays} days, representing potential annual savings of £${roiEstimate.savings}k based on industry benchmarks.`,
      style: "body",
    },
  ]));
  
  content.push({
    text: "Transformation Roadmap",
    style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
    margin: [0, 5, 0, 6],
  });
  
  content.push(buildTransformationTimeline(data));
  
  return content;
}

function buildMetricBox(label: string, value: string, suffix: string, color: string): Content {
  return {
    columns: [
      {
        width: "auto",
        text: value,
        style: { fontSize: 20, bold: true, color },
      },
      {
        width: "*",
        stack: [
          { text: label, style: { fontSize: 9, color: BRAND_COLORS.mediumGray }, margin: [8, 0, 0, 0] },
          { text: suffix, style: { fontSize: 8, color: BRAND_COLORS.mediumGray }, margin: [8, 2, 0, 0] },
        ],
      },
    ],
    margin: [0, 0, 0, 12] as [number, number, number, number],
  };
}

function buildTransformationTimeline(data: ReportData): Content {
  const { company, assessment } = data;
  const dimensionScores = extractDimensionScores(assessment.dimensionScores);
  
  const dynamicPhases = generateImplementationPhases(
    company.sizeBand || undefined,
    undefined,
    dimensionScores,
    company.sector || undefined
  );
  
  const phaseColors = [
    BRAND_COLORS.statusGreen,
    BRAND_COLORS.statusCyan,
    BRAND_COLORS.teal,
    BRAND_COLORS.darkNavy,
  ];
  
  const phases = dynamicPhases.map((phase, index) => {
    const startMonth = phase.monthRange.start;
    const endMonth = phase.monthRange.end;
    const duration = startMonth === 0 
      ? `Months 1-${endMonth}` 
      : `Months ${startMonth + 1}-${endMonth}`;
    
    return {
      name: `Phase ${index + 1}: ${phase.name}`,
      duration,
      color: phaseColors[index] || BRAND_COLORS.darkNavy,
      activities: phase.keyActivities,
    };
  });
  
  const timelineContent: Content = {
    table: {
      widths: ["25%", "25%", "25%", "25%"],
      body: [
        phases.map(p => ({
          stack: [
            { text: p.name, style: { fontSize: 10, bold: true, color: BRAND_COLORS.white }, margin: [8, 8, 8, 4] },
            { text: p.duration, style: { fontSize: 9, color: BRAND_COLORS.offWhite }, margin: [8, 0, 8, 8] },
          ],
          fillColor: p.color,
        })),
        phases.map((p) => ({
          stack: [
            { text: p.activities.slice(0, 3).map(a => `• ${a}`).join("\n"), style: { fontSize: 8, color: BRAND_COLORS.darkGray }, margin: [8, 8, 8, 8] },
          ],
          fillColor: BRAND_COLORS.lightGray,
        })),
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 1,
      vLineColor: () => BRAND_COLORS.white,
    },
    margin: [0, 0, 0, 10] as [number, number, number, number],
  };
  
  return timelineContent;
}

function buildDiagnosisSection(data: ReportData): Content[] {
  const { assessment, company } = data;
  const overallScore = assessment.overallMaturityScore || assessment.epmReadinessScore || 0;
  const dimensionScores = extractDimensionScores(assessment.dimensionScores);
  const sortedDimensions = Object.entries(dimensionScores).sort(([, a], [, b]) => b - a);
  
  const criticalDims = sortedDimensions.filter(([, s]) => s < 50);
  const atRiskDims = sortedDimensions.filter(([, s]) => s >= 50 && s <= 70);
  
  const content: Content[] = [];
  
  content.push(buildTrackerSidebar(SECTIONS.DIAGNOSIS));
  
  const diagnosisTitle = `Maturity assessment reveals ${criticalDims.length > 0 ? criticalDims.length + " critical gaps" : atRiskDims.length + " areas at risk"} across ${Object.keys(dimensionScores).length} dimensions`;
  content.push(buildActionTitle(diagnosisTitle));
  
  content.push(buildDimensionScorecard(sortedDimensions));
  
  content.push({
    columns: MATURITY_LEVELS.map(level => ({
      stack: [
        {
          canvas: [{
            type: "rect",
            x: 0,
            y: 0,
            w: 8,
            h: 8,
            r: 4,
            color: level.color,
          }],
        },
        { text: `${level.label} (${level.min}-${level.max}%)`, style: { fontSize: 7, color: BRAND_COLORS.mediumGray }, margin: [12, -8, 0, 0] },
      ],
      width: "auto",
      margin: [0, 0, 15, 0] as [number, number, number, number],
    })),
    margin: [0, 10, 0, 0] as [number, number, number, number],
  });
  
  const dimensionGroups = [];
  for (let i = 0; i < sortedDimensions.length; i += 3) {
    dimensionGroups.push(sortedDimensions.slice(i, i + 3));
  }
  
  for (let groupIndex = 0; groupIndex < dimensionGroups.length; groupIndex++) {
    const group = dimensionGroups[groupIndex];
    const isFirstGroup = groupIndex === 0;
    const isLastGroup = groupIndex === dimensionGroups.length - 1;
    
    content.push({
      text: `Dimension Analysis ${groupIndex + 1}/${dimensionGroups.length}`,
      style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
      margin: [0, 0, 0, 12],
      pageBreak: "before",
    });
    
    content.push(buildTrackerSidebar(SECTIONS.DIAGNOSIS));
    
    for (const [dim, score] of group) {
      content.push(buildDimensionDeepDive(dim, score, data));
    }
    
    if (isLastGroup) {
      content.push({ text: "", margin: [0, 0, 0, 1], pageBreak: "after" });
    }
  }
  
  return content;
}

function buildDimensionScorecard(sortedDimensions: [string, number][]): Content {
  const tableBody: Content[][] = [
    [
      { text: "DIMENSION", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "SCORE", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "GAP TO TARGET", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "MATURITY LEVEL", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "STATUS", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "PRIORITY", style: "tableHeader", margin: [8, 8, 8, 8] },
    ],
  ];

  for (const [dim, score] of sortedDimensions) {
    const dimLabel = DIMENSION_LABELS[dim]?.name || dim.replace(/_/g, " ");
    const maturity = getMaturityLevel(score);
    const status = getStatusInfo(score);
    const gap = TARGET_MATURITY - score;
    const priority = score < 50 ? "HIGH" : score < 70 ? "MEDIUM" : "LOW";
    const priorityColor = score < 50 ? BRAND_COLORS.statusRed : score < 70 ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusGreen;
    
    tableBody.push([
      { text: dimLabel, style: "tableCell", margin: [8, 6, 8, 6] },
      { 
        text: `${Math.round(score)}%`, 
        style: { fontSize: 10, bold: true, color: maturity.color, alignment: "center" as const },
        margin: [8, 6, 8, 6],
      },
      { 
        text: gap > 0 ? `${Math.round(gap)}%` : "On Target", 
        style: { fontSize: 9, color: gap > 0 ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusGreen, alignment: "center" as const },
        margin: [8, 6, 8, 6],
      },
      { 
        text: maturity.label, 
        style: { fontSize: 9, color: maturity.color, bold: true, alignment: "center" as const },
        margin: [8, 6, 8, 6],
      },
      { 
        stack: [{
          table: {
            widths: ["*"],
            body: [[{ text: status.text, style: { fontSize: 8, color: BRAND_COLORS.white, bold: true, alignment: "center" as const }, margin: [4, 3, 4, 3] }]],
          },
          layout: {
            fillColor: () => status.color,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
          },
        }],
        margin: [8, 4, 8, 4],
      },
      { 
        text: priority, 
        style: { fontSize: 9, color: priorityColor, bold: true, alignment: "center" as const },
        margin: [8, 6, 8, 6],
      },
    ]);
  }

  return {
    table: {
      headerRows: 1,
      widths: ["*", 70, 90, 100, 80, 70],
      body: tableBody,
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0,
      hLineColor: (i: number) => i === 1 ? BRAND_COLORS.darkNavy : "#E5E7EB",
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 15] as [number, number, number, number],
  };
}

function buildDimensionDeepDive(dim: string, score: number, data: ReportData): Content {
  const dimInfo = DIMENSION_LABELS[dim] || { name: dim.replace(/_/g, " "), shortName: dim, description: "" };
  const maturity = getMaturityLevel(score);
  const status = getStatusInfo(score);
  const gap = TARGET_MATURITY - score;
  
  const assessmentData = data.assessment as unknown as { scoreTransparency?: Record<string, unknown> };
  const scoreTransparencyRaw = assessmentData.scoreTransparency || {};
  const scoreTransparency: ScoreTransparencyItem[] = [];
  
  if (typeof scoreTransparencyRaw === "object" && scoreTransparencyRaw !== null) {
    for (const [dimension, dimData] of Object.entries(scoreTransparencyRaw)) {
      if (dimData && typeof dimData === "object" && "questions" in dimData) {
        const questions = (dimData as { questions?: Record<string, unknown> }).questions || {};
        for (const [_, qData] of Object.entries(questions)) {
          if (qData && typeof qData === "object") {
            scoreTransparency.push({
              dimension,
              questionId: (qData as { questionId?: string }).questionId || "",
              questionText: (qData as { questionText?: string }).questionText || "",
              responseValue: (qData as { responseValue?: string | number }).responseValue,
              pointsEarned: (qData as { pointsEarned?: number }).pointsEarned || 0,
              maxPoints: (qData as { maxPoints?: number }).maxPoints || 0,
              percentage: (qData as { percentage?: number }).percentage || 0,
            });
          }
        }
      }
    }
  }
  
  const dimTransparency = scoreTransparency.filter((t: ScoreTransparencyItem) => t.dimension === dim);
  
  const observations = generateDimensionObservations(dim, score, dimTransparency);
  
  return {
    stack: [
      {
        columns: [
          {
            width: "auto",
            stack: [
              { text: `${Math.round(score)}%`, style: { fontSize: 32, bold: true, color: maturity.color } },
              { text: maturity.label, style: { fontSize: 10, color: maturity.color, bold: true }, margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: "*",
            stack: [
              { text: dimInfo.name, style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy }, margin: [16, 0, 0, 4] },
              { text: dimInfo.description, style: { fontSize: 9, color: BRAND_COLORS.mediumGray, lineHeight: 1.3 }, margin: [16, 0, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },
      {
        table: {
          widths: ["25%", "25%", "25%", "25%"],
          body: [
            [
              { text: "Gap to Target", style: { fontSize: 8, color: BRAND_COLORS.mediumGray }, margin: [8, 5, 8, 2] },
              { text: "Status", style: { fontSize: 8, color: BRAND_COLORS.mediumGray }, margin: [8, 5, 8, 2] },
              { text: "Priority", style: { fontSize: 8, color: BRAND_COLORS.mediumGray }, margin: [8, 5, 8, 2] },
              { text: "Target", style: { fontSize: 8, color: BRAND_COLORS.mediumGray }, margin: [8, 5, 8, 2] },
            ],
            [
              { text: gap > 0 ? `${Math.round(gap)}% below` : "On target", style: { fontSize: 10, bold: true, color: gap > 0 ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusGreen }, margin: [8, 2, 8, 5] },
              { text: status.text, style: { fontSize: 10, bold: true, color: status.color }, margin: [8, 2, 8, 5] },
              { text: score < 50 ? "HIGH" : score < 70 ? "MEDIUM" : "LOW", style: { fontSize: 10, bold: true, color: score < 50 ? BRAND_COLORS.statusRed : score < 70 ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusGreen }, margin: [8, 2, 8, 5] },
              { text: "70%", style: { fontSize: 10, bold: true, color: BRAND_COLORS.darkNavy }, margin: [8, 2, 8, 5] },
            ],
          ],
        },
        layout: {
          fillColor: () => BRAND_COLORS.lightGray,
          hLineWidth: () => 0,
          vLineWidth: () => 0,
        },
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },
      { text: "Key Findings", style: { fontSize: 10, bold: true, color: BRAND_COLORS.darkNavy }, margin: [0, 0, 0, 4] },
      {
        ul: observations.slice(0, 2).map(obs => ({
          text: obs,
          style: { fontSize: 9, color: BRAND_COLORS.darkGray, lineHeight: 1.3 },
          margin: [0, 0, 0, 3] as [number, number, number, number],
        })),
        markerColor: BRAND_COLORS.teal,
      },
    ],
    margin: [0, 0, 0, 22] as [number, number, number, number],
  };
}

function generateDimensionObservations(dim: string, score: number, transparency: ScoreTransparencyItem[]): string[] {
  const observations: string[] = [];
  const maturity = getMaturityLevel(score);
  const gap = TARGET_MATURITY - score;
  
  if (score < 50) {
    observations.push(`${maturity.label} maturity indicates capability gaps requiring urgent remediation.`);
    observations.push(`${Math.round(gap)}% gap to 70% target represents substantial improvement opportunity.`);
  } else if (score < 70) {
    observations.push(`${maturity.label} maturity suggests optimisation needed to reach target.`);
    observations.push(`Close ${Math.round(gap)}% gap within 12 months through targeted initiatives.`);
  } else {
    observations.push(`Strong ${maturity.label.toLowerCase()} maturity meets or exceeds benchmarks.`);
    observations.push(`Maintain excellence and share best practices across organisation.`);
  }
  
  return observations.slice(0, 2);
}

function buildSolutionSection(data: ReportData): Content[] {
  const { assessment } = data;
  const recommendations = (assessment.recommendations || []) as Array<string | { title?: string; recommendation?: string; description?: string; priority?: string }>;
  const quickWins = (assessment.quickWins || []) as Array<string | { title?: string; action?: string }>;
  
  const content: Content[] = [];
  
  content.push(buildTrackerSidebar(SECTIONS.SOLUTION));
  
  content.push(buildActionTitle("Prioritised improvement roadmap will accelerate maturity gains and deliver measurable ROI"));
  
  const overallScore = assessment.overallMaturityScore || assessment.epmReadinessScore || 0;
  const roiEstimate = calculateROIEstimate(overallScore, 0);
  
  content.push(buildCalloutBox("Value Case", [
    { 
      text: `Implementing the recommended improvements could deliver annual value of £${roiEstimate.savings}k through efficiency gains of ${roiEstimate.efficiency}% and close cycle reduction of ${roiEstimate.closeDays} days.`,
      style: "body",
    },
  ]));
  
  content.push({
    text: "Recommendation Priority Matrix",
    style: "sectionTitle",
    margin: [0, 10, 0, 10],
  });
  
  content.push(buildPriorityMatrix(recommendations));
  
  content.push({
    text: "High Priority Recommendations",
    style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
    margin: [0, 0, 0, 8],
    pageBreak: "before",
  });
  
  content.push(buildTrackerSidebar(SECTIONS.SOLUTION));
  
  content.push(buildActionTitle("High priority recommendations target critical capability gaps"));
  
  const highPriorityRecs = recommendations.slice(0, 4);
  content.push(buildRecommendationCards(highPriorityRecs, "HIGH"));
  
  content.push({
    text: "Medium Priority Recommendations",
    style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
    margin: [0, 0, 0, 8],
    pageBreak: "before",
  });
  
  content.push(buildTrackerSidebar(SECTIONS.SOLUTION));
  
  content.push(buildActionTitle("Medium priority recommendations strengthen foundational capabilities"));
  
  const mediumPriorityRecs = recommendations.slice(4, 8);
  if (mediumPriorityRecs.length > 0) {
    content.push(buildRecommendationCards(mediumPriorityRecs, "MEDIUM"));
  } else {
    content.push({
      text: "Additional medium priority recommendations will be identified during detailed assessment workshops.",
      style: "body",
      margin: [0, 0, 0, 15],
    });
  }
  
  content.push({
    text: "Quick Wins",
    style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
    margin: [0, 0, 0, 8],
    pageBreak: "before",
  });
  
  content.push(buildTrackerSidebar(SECTIONS.SOLUTION));
  
  content.push(buildActionTitle("Quick wins deliver immediate value within 90 days"));
  
  content.push(buildQuickWinsTimeline(quickWins));
  
  content.push({ text: "", margin: [0, 0, 0, 1], pageBreak: "after" });
  
  return content;
}

function buildPriorityMatrix(recommendations: Array<string | { title?: string; recommendation?: string; description?: string; priority?: string }>): Content {
  const matrixBody: Content[][] = [
    [
      { text: "RECOMMENDATION", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "PRIORITY", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "IMPACT", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "EFFORT", style: "tableHeader", margin: [8, 8, 8, 8] },
    ],
  ];
  
  const recsToShow = recommendations.slice(0, 6);
  
  for (let i = 0; i < recsToShow.length; i++) {
    const rec = recsToShow[i];
    const recText = typeof rec === "string" ? rec : (rec.title || rec.recommendation || rec.description || "");
    const priority = i < 2 ? "HIGH" : i < 4 ? "MEDIUM" : "LOW";
    const priorityColor = i < 2 ? BRAND_COLORS.statusRed : i < 4 ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusGreen;
    const impact = i < 3 ? "High" : "Medium";
    const effort = i % 2 === 0 ? "Medium" : "Low";
    
    matrixBody.push([
      { text: recText.substring(0, 80) + (recText.length > 80 ? "..." : ""), style: "tableCell", margin: [8, 6, 8, 6] },
      { text: priority, style: { fontSize: 9, bold: true, color: priorityColor, alignment: "center" as const }, margin: [8, 6, 8, 6] },
      { text: impact, style: "tableCellCenter", margin: [8, 6, 8, 6] },
      { text: effort, style: "tableCellCenter", margin: [8, 6, 8, 6] },
    ]);
  }
  
  return {
    table: {
      headerRows: 1,
      widths: ["*", 90, 80, 80],
      body: matrixBody,
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0,
      hLineColor: (i: number) => i === 1 ? BRAND_COLORS.darkNavy : "#E5E7EB",
    },
    margin: [0, 0, 0, 15] as [number, number, number, number],
  };
}

function buildRecommendationCards(recommendations: Array<string | { title?: string; recommendation?: string; description?: string }>, priority: string): Content {
  const priorityColor = priority === "HIGH" ? BRAND_COLORS.statusRed : priority === "MEDIUM" ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusGreen;
  
  const cards: Content[] = recommendations.map((rec, i) => {
    const recText = typeof rec === "string" ? rec : (rec.title || rec.recommendation || rec.description || "");
    
    return {
      table: {
        widths: ["*"],
        body: [[
          {
            stack: [
              {
                columns: [
                  { text: `${priority} PRIORITY`, style: { fontSize: 8, bold: true, color: priorityColor }, width: "auto" },
                  { text: `R${i + 1}`, style: { fontSize: 8, color: BRAND_COLORS.mediumGray }, width: "*", alignment: "right" },
                ],
                margin: [0, 0, 0, 8],
              },
              { text: recText, style: "body" },
            ],
            margin: [12, 10, 12, 10],
          }
        ]],
      },
      layout: {
        fillColor: () => BRAND_COLORS.lightGray,
        hLineWidth: () => 0,
        vLineWidth: (i: number) => i === 0 ? 3 : 0,
        vLineColor: () => priorityColor,
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    };
  });
  
  return {
    stack: cards,
  };
}

function buildQuickWinsTimeline(quickWins: Array<string | { title?: string; action?: string }>): Content {
  const weeks = [
    { label: "Week 1-2", color: BRAND_COLORS.statusGreen },
    { label: "Week 3-4", color: BRAND_COLORS.statusCyan },
    { label: "Week 5-8", color: BRAND_COLORS.teal },
    { label: "Week 9-12", color: BRAND_COLORS.darkNavy },
  ];
  
  const qwToShow = quickWins.slice(0, 8);
  const qwPerPhase = Math.ceil(qwToShow.length / 4);
  
  const timelineRows: Content[][] = [
    weeks.map(w => ({
      text: w.label,
      style: { fontSize: 10, bold: true, color: BRAND_COLORS.white },
      fillColor: w.color,
      margin: [8, 8, 8, 8],
      alignment: "center" as const,
    })),
  ];
  
  for (let row = 0; row < qwPerPhase; row++) {
    const rowContent = weeks.map((_, weekIndex) => {
      const qwIndex = weekIndex * qwPerPhase + row;
      const qw = qwToShow[qwIndex];
      if (!qw) return { text: "", margin: [8, 6, 8, 6] as [number, number, number, number] };
      const qwText = typeof qw === "string" ? qw : (qw.title || qw.action || "");
      return {
        text: `• ${qwText.substring(0, 50)}${qwText.length > 50 ? "..." : ""}`,
        style: "bodySmall",
        margin: [8, 6, 8, 6] as [number, number, number, number],
      };
    });
    timelineRows.push(rowContent as Content[]);
  }
  
  return {
    table: {
      widths: ["25%", "25%", "25%", "25%"],
      body: timelineRows,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#E5E7EB",
      vLineColor: () => "#E5E7EB",
    },
    margin: [0, 0, 0, 20] as [number, number, number, number],
  };
}

function buildEvidenceSection(data: ReportData): Content[] {
  const { assessment } = data;
  const dimensionScores = extractDimensionScores(assessment.dimensionScores);
  
  const assessmentData = assessment as unknown as { scoreTransparency?: Record<string, unknown> };
  const scoreTransparencyRaw = assessmentData.scoreTransparency || {};
  const scoreTransparency: ScoreTransparencyItem[] = [];
  
  if (typeof scoreTransparencyRaw === "object" && scoreTransparencyRaw !== null) {
    for (const [dimension, dimData] of Object.entries(scoreTransparencyRaw)) {
      if (dimData && typeof dimData === "object" && "questions" in dimData) {
        const questions = (dimData as { questions?: Record<string, unknown> }).questions || {};
        for (const [_, qData] of Object.entries(questions)) {
          if (qData && typeof qData === "object") {
            scoreTransparency.push({
              dimension,
              questionId: (qData as { questionId?: string }).questionId || "",
              questionText: (qData as { questionText?: string }).questionText || "",
              responseValue: (qData as { responseValue?: string | number }).responseValue,
              pointsEarned: (qData as { pointsEarned?: number }).pointsEarned || 0,
              maxPoints: (qData as { maxPoints?: number }).maxPoints || 0,
              percentage: (qData as { percentage?: number }).percentage || 0,
            });
          }
        }
      }
    }
  }
  
  const content: Content[] = [];
  
  content.push(buildTrackerSidebar(SECTIONS.EVIDENCE));
  
  content.push(buildActionTitle("Score transparency provides granular visibility into assessment methodology"));
  
  const transparencyByDim: Record<string, ScoreTransparencyItem[]> = {};
  for (const item of scoreTransparency) {
    const dim = item.dimension || "unknown";
    if (!transparencyByDim[dim]) transparencyByDim[dim] = [];
    transparencyByDim[dim].push(item);
  }
  
  content.push(buildScoreTransparencyTable(transparencyByDim, dimensionScores));
  
  content.push({
    text: "Question Contribution Analysis",
    style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
    margin: [0, 0, 0, 8],
    pageBreak: "before",
  });
  
  content.push(buildTrackerSidebar(SECTIONS.EVIDENCE));
  
  content.push(buildActionTitle("Question-level contribution analysis identifies specific improvement opportunities"));
  
  content.push(buildQuestionContributionAnalysis(scoreTransparency));
  
  content.push({
    text: "Benchmark Comparison",
    style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
    margin: [0, 0, 0, 8],
    pageBreak: "before",
  });
  
  content.push(buildTrackerSidebar(SECTIONS.EVIDENCE));
  
  content.push(buildActionTitle("Benchmark comparison positions organisation against industry standards"));
  
  content.push(buildBenchmarkComparison(dimensionScores));
  
  content.push({ text: "", margin: [0, 0, 0, 1], pageBreak: "after" });
  
  return content;
}

function buildScoreTransparencyTable(transparencyByDim: Record<string, ScoreTransparencyItem[]>, dimensionScores: Record<string, number>): Content {
  const tableBody: Content[][] = [
    [
      { text: "DIMENSION", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "QUESTIONS", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "AVG SCORE", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "DIMENSION SCORE", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "CONTRIBUTION", style: "tableHeader", margin: [8, 8, 8, 8] },
    ],
  ];
  
  for (const [dim, items] of Object.entries(transparencyByDim)) {
    const dimLabel = DIMENSION_LABELS[dim]?.shortName || dim.replace(/_/g, " ");
    const dimScore = dimensionScores[dim] || 0;
    const avgScore = items.reduce((sum, i) => sum + (i.score || 0), 0) / (items.length || 1);
    const contribution = ((dimScore / 100) * 12.5).toFixed(1);
    
    tableBody.push([
      { text: dimLabel, style: "tableCell", margin: [8, 6, 8, 6] },
      { text: `${items.length}`, style: "tableCellCenter", margin: [8, 6, 8, 6] },
      { text: avgScore.toFixed(1), style: "tableCellCenter", margin: [8, 6, 8, 6] },
      { text: `${Math.round(dimScore)}%`, style: { fontSize: 9, bold: true, color: getMaturityLevel(dimScore).color, alignment: "center" as const }, margin: [8, 6, 8, 6] },
      { text: `${contribution}%`, style: "tableCellCenter", margin: [8, 6, 8, 6] },
    ]);
  }
  
  if (tableBody.length === 1) {
    for (const dim of Object.keys(dimensionScores)) {
      const dimLabel = DIMENSION_LABELS[dim]?.shortName || dim.replace(/_/g, " ");
      const dimScore = dimensionScores[dim] || 0;
      const contribution = ((dimScore / 100) * 12.5).toFixed(1);
      
      tableBody.push([
        { text: dimLabel, style: "tableCell", margin: [8, 6, 8, 6] },
        { text: "-", style: "tableCellCenter", margin: [8, 6, 8, 6] },
        { text: "-", style: "tableCellCenter", margin: [8, 6, 8, 6] },
        { text: `${Math.round(dimScore)}%`, style: { fontSize: 9, bold: true, color: getMaturityLevel(dimScore).color, alignment: "center" as const }, margin: [8, 6, 8, 6] },
        { text: `${contribution}%`, style: "tableCellCenter", margin: [8, 6, 8, 6] },
      ]);
    }
  }
  
  return {
    table: {
      headerRows: 1,
      widths: ["*", 80, 80, 100, 90],
      body: tableBody,
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0,
      hLineColor: (i: number) => i === 1 ? BRAND_COLORS.darkNavy : "#E5E7EB",
    },
    margin: [0, 0, 0, 20] as [number, number, number, number],
  };
}

function buildQuestionContributionAnalysis(transparency: ScoreTransparencyItem[]): Content {
  const lowScoreItems = transparency
    .filter(t => (t.score || 0) < 3)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 8);
  
  if (lowScoreItems.length === 0) {
    return {
      text: "No significant gaps identified at question level. All responses indicate adequate capability maturity.",
      style: "body",
      margin: [0, 0, 0, 15],
    };
  }
  
  const tableBody: Content[][] = [
    [
      { text: "DIMENSION", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "QUESTION AREA", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "SCORE", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "GAP", style: "tableHeader", margin: [8, 8, 8, 8] },
    ],
  ];
  
  for (const item of lowScoreItems) {
    const dimLabel = DIMENSION_LABELS[item.dimension || ""]?.shortName || item.dimension || "";
    const questionText = item.question || item.questionId || "Question";
    const score = item.score || 0;
    const maxScore = item.maxScore || 5;
    const gap = maxScore - score;
    
    tableBody.push([
      { text: dimLabel, style: "tableCell", margin: [8, 6, 8, 6] },
      { text: questionText.substring(0, 60) + (questionText.length > 60 ? "..." : ""), style: "tableCell", margin: [8, 6, 8, 6] },
      { text: `${score}/${maxScore}`, style: { fontSize: 9, color: BRAND_COLORS.statusRed, alignment: "center" as const }, margin: [8, 6, 8, 6] },
      { text: `${gap} points`, style: { fontSize: 9, color: BRAND_COLORS.statusOrange, alignment: "center" as const }, margin: [8, 6, 8, 6] },
    ]);
  }
  
  return {
    table: {
      headerRows: 1,
      widths: [100, "*", 80, 80],
      body: tableBody,
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0,
      hLineColor: (i: number) => i === 1 ? BRAND_COLORS.darkNavy : "#E5E7EB",
    },
    margin: [0, 0, 0, 20] as [number, number, number, number],
  };
}

function buildBenchmarkComparison(dimensionScores: Record<string, number>): Content {
  const benchmarks: Record<string, number> = {
    financial_planning_analysis: 58,
    consolidation_close: 55,
    financial_controls_compliance: 62,
    technology_systems: 52,
    organisation_people: 56,
    data_analytics: 48,
    ai_machine_learning: 35,
    strategic_finance: 54,
  };
  
  const tableBody: Content[][] = [
    [
      { text: "DIMENSION", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "YOUR SCORE", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "INDUSTRY AVG", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "VARIANCE", style: "tableHeader", margin: [8, 8, 8, 8] },
      { text: "POSITION", style: "tableHeader", margin: [8, 8, 8, 8] },
    ],
  ];
  
  for (const [dim, score] of Object.entries(dimensionScores)) {
    const dimLabel = DIMENSION_LABELS[dim]?.shortName || dim.replace(/_/g, " ");
    const benchmark = benchmarks[dim] || 55;
    const variance = score - benchmark;
    const position = variance > 10 ? "Leader" : variance > 0 ? "Above Avg" : variance > -10 ? "Below Avg" : "Laggard";
    const positionColor = variance > 10 ? BRAND_COLORS.statusGreen : variance > 0 ? BRAND_COLORS.statusCyan : variance > -10 ? BRAND_COLORS.statusOrange : BRAND_COLORS.statusRed;
    
    tableBody.push([
      { text: dimLabel, style: "tableCell", margin: [8, 6, 8, 6] },
      { text: `${Math.round(score)}%`, style: { fontSize: 9, bold: true, color: getMaturityLevel(score).color, alignment: "center" as const }, margin: [8, 6, 8, 6] },
      { text: `${benchmark}%`, style: "tableCellCenter", margin: [8, 6, 8, 6] },
      { text: `${variance > 0 ? "+" : ""}${Math.round(variance)}pp`, style: { fontSize: 9, color: variance >= 0 ? BRAND_COLORS.statusGreen : BRAND_COLORS.statusOrange, alignment: "center" as const }, margin: [8, 6, 8, 6] },
      { text: position, style: { fontSize: 9, bold: true, color: positionColor, alignment: "center" as const }, margin: [8, 6, 8, 6] },
    ]);
  }
  
  return {
    table: {
      headerRows: 1,
      widths: ["*", 90, 90, 80, 90],
      body: tableBody,
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0,
      hLineColor: (i: number) => i === 1 ? BRAND_COLORS.darkNavy : "#E5E7EB",
    },
    margin: [0, 0, 0, 20] as [number, number, number, number],
  };
}

function buildAppendix(data: ReportData): Content[] {
  const { assessment, company, contact } = data;
  const assessmentDate = assessment.completedAt 
    ? new Date(assessment.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  
  const content: Content[] = [];
  
  content.push(buildTrackerSidebar(SECTIONS.APPENDIX));
  
  content.push(buildActionTitle("Assessment methodology ensures rigorous and repeatable evaluation"));
  
  content.push({
    columns: [
      {
        width: "50%",
        stack: [
          { text: "Methodology", style: "sectionTitle" },
          { text: "The Constancia Finance Technology & Maturity Assessment utilises a proprietary 8-dimension maturity model developed from best practices across 200+ finance transformation programmes.", style: "body", margin: [0, 0, 0, 10] },
          { text: "Each dimension is scored using weighted criteria aligned to industry benchmarks and validated through client interviews and document review.", style: "body", margin: [0, 0, 0, 10] },
          { text: "Scoring Framework", style: "sectionTitle", margin: [0, 10, 0, 6] },
          buildScoringTable(),
        ],
      },
      {
        width: "50%",
        stack: [
          { text: "Assessment Scope", style: "sectionTitle" },
          buildScopeDetail("Organisation", company.name || "Your Organisation"),
          buildScopeDetail("Industry", company.sector || "Multi-sector"),
          buildScopeDetail("Revenue Band", company.sizeBand?.replace(/_/g, " to ").replace("m", "M").replace("b", "B") || "Not specified"),
          buildScopeDetail("Assessment Date", assessmentDate),
          buildScopeDetail("Contact", `${contact.firstName} ${contact.lastName}`),
          buildScopeDetail("Role", contact.roleTitle || "Finance Leader"),
          { text: "Dimensions Assessed", style: "sectionTitle", margin: [0, 15, 0, 6] },
          {
            ol: Object.values(DIMENSION_LABELS).map(d => ({
              text: d.name,
              style: "bodySmall",
              margin: [0, 0, 0, 2] as [number, number, number, number],
            })),
          },
        ],
        margin: [20, 0, 0, 0],
      },
    ],
  });
  
  content.push({
    text: "Next Steps",
    style: { fontSize: 12, bold: true, color: BRAND_COLORS.darkNavy },
    margin: [0, 0, 0, 8],
    pageBreak: "before",
  });
  
  content.push(buildTrackerSidebar(SECTIONS.APPENDIX));
  
  content.push(buildActionTitle("Next steps and engagement options"));
  
  content.push({
    columns: [
      {
        width: "50%",
        stack: [
          { text: "Recommended Next Steps", style: "sectionTitle" },
          {
            ol: [
              { text: "Mobilise leadership team to review assessment findings", style: "body", margin: [0, 0, 0, 6] },
              { text: "Validate and prioritise improvement initiatives", style: "body", margin: [0, 0, 0, 6] },
              { text: "Develop detailed transformation roadmap", style: "body", margin: [0, 0, 0, 6] },
              { text: "Establish governance and change management framework", style: "body", margin: [0, 0, 0, 6] },
              { text: "Initiate quick wins to demonstrate early value", style: "body", margin: [0, 0, 0, 6] },
            ],
          },
        ],
      },
      {
        width: "50%",
        stack: [
          { text: "Constancia Engagement Options", style: "sectionTitle" },
          buildEngagementOption("Discovery Workshop", "Half-day session to deep-dive into findings and co-develop improvement roadmap"),
          buildEngagementOption("Transformation Programme", "End-to-end programme management for EPM and ERP implementations"),
          buildEngagementOption("Advisory Retainer", "Ongoing strategic advice and programme governance support"),
        ],
        margin: [20, 0, 0, 0],
      },
    ],
  });
  
  content.push({
    stack: [
      { text: "", margin: [0, 40, 0, 0] },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 700, y2: 0, lineWidth: 2, lineColor: BRAND_COLORS.teal }],
        margin: [0, 0, 0, 20],
      },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "CONTACT Constancia", style: { fontSize: 10, bold: true, color: BRAND_COLORS.darkNavy } },
              { text: "info@constancia.com", style: { fontSize: 10, color: BRAND_COLORS.teal }, margin: [0, 4, 0, 0] },
              { text: "https://constancia.com", style: { fontSize: 10, color: BRAND_COLORS.teal } },
              { text: "linkedin.com/company/1qg-group-limited", style: { fontSize: 10, color: BRAND_COLORS.teal } },
              { text: "86-90 Paul Street, London, UK", style: { fontSize: 10, color: BRAND_COLORS.darkGray }, margin: [0, 4, 0, 0] },
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "PREPARED FOR", style: { fontSize: 10, bold: true, color: BRAND_COLORS.darkNavy } },
              { text: `${contact.firstName} ${contact.lastName}`, style: { fontSize: 10, color: BRAND_COLORS.darkGray }, margin: [0, 4, 0, 0] },
              { text: contact.roleTitle || "Finance Leader", style: { fontSize: 10, color: BRAND_COLORS.darkGray } },
              { text: contact.email, style: { fontSize: 10, color: BRAND_COLORS.teal }, margin: [0, 4, 0, 0] },
            ],
            alignment: "right",
          },
        ],
      },
    ],
  });
  
  return content;
}

function buildScoringTable(): Content {
  const scoringBody: Content[][] = [
    [
      { text: "LEVEL", style: { fontSize: 8, bold: true, color: BRAND_COLORS.darkNavy }, margin: [4, 4, 4, 4] },
      { text: "RANGE", style: { fontSize: 8, bold: true, color: BRAND_COLORS.darkNavy }, margin: [4, 4, 4, 4] },
      { text: "DESCRIPTION", style: { fontSize: 8, bold: true, color: BRAND_COLORS.darkNavy }, margin: [4, 4, 4, 4] },
    ],
  ];
  
  const descriptions = [
    "Limited or no formal processes",
    "Ad-hoc processes, inconsistent",
    "Documented, standardised processes",
    "Optimised, measured processes",
    "Industry-leading, innovative",
  ];
  
  for (let i = 0; i < MATURITY_LEVELS.length; i++) {
    const level = MATURITY_LEVELS[i];
    scoringBody.push([
      { text: level.label, style: { fontSize: 8, color: level.color, bold: true }, margin: [4, 3, 4, 3] },
      { text: `${level.min}-${level.max}%`, style: { fontSize: 8, color: BRAND_COLORS.darkGray }, margin: [4, 3, 4, 3] },
      { text: descriptions[i], style: { fontSize: 8, color: BRAND_COLORS.darkGray }, margin: [4, 3, 4, 3] },
    ]);
  }
  
  return {
    table: {
      widths: [70, 50, "*"],
      body: scoringBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => "#E5E7EB",
    },
    margin: [0, 0, 0, 15] as [number, number, number, number],
  };
}

function buildScopeDetail(label: string, value: string): Content {
  return {
    columns: [
      { text: label + ":", width: 90, style: { fontSize: 9, color: BRAND_COLORS.mediumGray } },
      { text: value, width: "*", style: { fontSize: 9, color: BRAND_COLORS.darkGray, bold: true } },
    ],
    margin: [0, 0, 0, 4] as [number, number, number, number],
  };
}

function buildEngagementOption(title: string, description: string): Content {
  return {
    stack: [
      { text: title, style: { fontSize: 10, bold: true, color: BRAND_COLORS.teal }, margin: [0, 8, 0, 3] },
      { text: description, style: "bodySmall" },
    ],
  };
}

function generateSituationContext(company: FcCompany, overallScore: number, criticalCount: number, atRiskCount: number): string {
  const maturityLevel = getMaturityLevel(overallScore);
  const companyName = company.name || "Your organisation";
  const sector = company.sector || "multi-sector";
  
  let context = `${companyName} operates in the ${sector} sector and has completed a comprehensive Finance Transformation Assessment across 8 key dimensions. `;
  
  if (overallScore < 50) {
    context += `The assessment reveals significant capability gaps, with overall maturity at ${Math.round(overallScore)}% (${maturityLevel.label}), indicating substantial transformation opportunity. `;
    context += `${criticalCount} dimension${criticalCount > 1 ? "s require" : " requires"} immediate remediation to mitigate operational risk.`;
  } else if (overallScore < 70) {
    context += `Analysis indicates current maturity of ${Math.round(overallScore)}% (${maturityLevel.label}), with ${atRiskCount} dimension${atRiskCount > 1 ? "s" : ""} below target benchmark. `;
    context += `Focused improvement in these areas will accelerate the finance transformation journey.`;
  } else {
    context += `The organisation demonstrates strong maturity at ${Math.round(overallScore)}% (${maturityLevel.label}), exceeding industry benchmarks. `;
    context += `Opportunities exist to optimise further and establish industry-leading capabilities.`;
  }
  
  return context;
}

function generatePrimaryRecommendation(
  overallScore: number, 
  criticalDims: [string, number][],
  atRiskDims: [string, number][],
  sortedDimensions: [string, number][]
): string {
  if (overallScore >= 70) {
    return `Leverage strong foundation to optimise ${DIMENSION_LABELS[sortedDimensions[sortedDimensions.length - 1]?.[0]]?.name || "remaining areas"} and establish industry-leading EPM capabilities within 12 months.`;
  }
  
  if (criticalDims.length > 0) {
    const primaryGap = DIMENSION_LABELS[criticalDims[0][0]]?.name || criticalDims[0][0];
    return `Mobilise immediate remediation of ${primaryGap} to address critical capability gaps, followed by structured improvement programme targeting 70%+ maturity within 18 months.`;
  }
  
  if (atRiskDims.length > 0) {
    const primaryGap = DIMENSION_LABELS[atRiskDims[0][0]]?.name || atRiskDims[0][0];
    return `Accelerate improvement in ${primaryGap} to close gap to industry benchmark, while strengthening foundational capabilities to enable strategic finance transformation.`;
  }
  
  return "Develop comprehensive EPM improvement programme to enhance finance function maturity and unlock strategic value through operational excellence.";
}

function generateSupportingArguments(
  overallScore: number,
  criticalDims: [string, number][],
  atRiskDims: [string, number][],
  onTrackDims: [string, number][],
  sortedDimensions: [string, number][]
): { title: string; detail: string }[] {
  const args: { title: string; detail: string }[] = [];

  if (criticalDims.length > 0) {
    const gapPp = Math.round(TARGET_MATURITY - criticalDims.reduce((sum, [, s]) => sum + s, 0) / criticalDims.length);
    args.push({
      title: `${criticalDims.length} Critical Gap${criticalDims.length > 1 ? "s" : ""} Identified`,
      detail: `${criticalDims.map(([dim]) => DIMENSION_LABELS[dim]?.shortName || dim).join(", ")} scoring below 50% require urgent intervention. Average gap of ${gapPp}% to target represents significant operational risk.`,
    });
  }

  if (atRiskDims.length > 0) {
    args.push({
      title: `${atRiskDims.length} Area${atRiskDims.length > 1 ? "s" : ""} Below Target`,
      detail: `${atRiskDims.map(([dim]) => DIMENSION_LABELS[dim]?.shortName || dim).join(", ")} performing below 70% benchmark. Prioritised improvement will close gaps within 12 months.`,
    });
  }

  if (onTrackDims.length > 0) {
    args.push({
      title: `${onTrackDims.length} Strength${onTrackDims.length > 1 ? "s" : ""} to Leverage`,
      detail: `${onTrackDims.map(([dim]) => DIMENSION_LABELS[dim]?.shortName || dim).join(", ")} demonstrating advanced capability. These foundations accelerate transformation success.`,
    });
  }

  const benchmarkGap = BENCHMARK_TARGET - overallScore;
  if (benchmarkGap > 0) {
    args.push({
      title: "Below Industry Benchmark",
      detail: `Overall maturity ${Math.round(benchmarkGap)}% below industry average of ${BENCHMARK_TARGET}%. Targeted improvements will achieve benchmark within 9-12 months.`,
    });
  } else {
    args.push({
      title: "Above Industry Benchmark",
      detail: `Overall maturity ${Math.abs(Math.round(benchmarkGap))}% above industry average. Focus on advancing to world-class 85%+ maturity to establish market leadership.`,
    });
  }

  return args.slice(0, 4);
}

function calculateROIEstimate(overallScore: number, criticalCount: number): { efficiency: number; closeDays: number; savings: number } {
  const baseEfficiency = Math.max(5, Math.round((70 - overallScore) * 0.3));
  const closeDays = Math.max(1, Math.round((70 - overallScore) * 0.15));
  const baseSavings = 150 + (criticalCount * 25) + Math.round((70 - overallScore) * 3);
  
  return {
    efficiency: Math.min(25, baseEfficiency),
    closeDays: Math.min(8, closeDays),
    savings: Math.min(500, baseSavings),
  };
}
