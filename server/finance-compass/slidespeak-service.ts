/**
 * SlideSpeak Integration Service for FinanceCompass
 * 
 * Generates Big 4 quality presentation reports using SlideSpeak API.
 * Supports async pre-generation with status polling.
 */

import { createChildLogger } from "../lib/logger";
import type { 
  FcAssessment, 
  FcCompany, 
  FcContact,
  FcReport 
} from "@shared/finance-compass-schema";
import type { AnalysisResult } from "./ai-service";
import { fcStorage } from "./storage";

const log = createChildLogger("slidespeak-service");
import { 
  DIMENSION_LABELS_BY_CODE as DIMENSION_LABELS,
  CANONICAL_DIMENSIONS,
  formatDimensionName,
  getStatusInfo,
} from "@shared/finance-compass-constants";
import { generateImplementationPhases, getAggregatedTimeline } from "./intelligence-engine";

const SLIDESPEAK_API_BASE = "https://api.slidespeak.co/api/v1";

export type SlidesSpeakStatus = "pending" | "generating" | "ready" | "failed";

interface SlidesSpeakGenerateResponse {
  task_id: string;
}

interface SlidesSpeakTaskStatus {
  task_id: string;
  task_status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY";
  task_result?: {
    url: string;
    presentation_id: string;
    request_id: string;
  };
  task_info?: {
    url: string;
    presentation_id: string;
    request_id: string;
  };
}

interface AssessmentReportData {
  assessment: FcAssessment;
  company: FcCompany;
  contact: FcContact;
  analysis?: AnalysisResult;
}

// Slide-by-slide API types
interface SlideImage {
  type: "url" | "stock" | "ai";
  data: string;
}

interface SlideDefinition {
  title: string;
  layout: string;
  item_amount: number;
  content: string;
  images?: SlideImage[];
}

// Helper to get stock image search term for traffic light status
function getTrafficLightImageSearch(score: number): string {
  if (score > 70) {
    return "green traffic light signal go";
  } else if (score >= 50) {
    return "yellow amber traffic light signal caution";
  } else {
    return "red traffic light signal stop";
  }
}

function getStatusText(score: number): string {
  return getStatusInfo(score).text;
}

function getMaturityRating(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Developing";
  return "Foundational";
}

function extractDimensionScores(rawScores: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  
  if (!rawScores || typeof rawScores !== "object") {
    // Return all dimensions with 0 if no data
    for (const dim of CANONICAL_DIMENSIONS) {
      result[dim] = 0;
    }
    return result;
  }
  
  const scores = rawScores as Record<string, unknown>;
  
  for (const dim of CANONICAL_DIMENSIONS) {
    const value = scores[dim];
    if (typeof value === "number" && !isNaN(value)) {
      result[dim] = Math.max(0, Math.min(100, value));
    } else if (typeof value === "object" && value !== null && "score" in value) {
      const objScore = (value as { score: unknown }).score;
      if (typeof objScore === "number" && !isNaN(objScore)) {
        result[dim] = Math.max(0, Math.min(100, objScore));
      } else {
        result[dim] = 0;
      }
    } else {
      result[dim] = 0;
    }
  }
  
  return result;
}

// ============================================
// TIER 1: PRE-ASSESSMENT REPORT (6-8 Slides)
// Quick diagnostic, no AI analysis, no ROI
// ============================================

function buildPreAssessmentPrompt(data: AssessmentReportData): string {
  const { assessment, company, contact } = data;
  const companyName = company.name || "Your Organisation";
  const contactName = `${contact.firstName} ${contact.lastName}`;
  const assessmentDate = assessment.completedAt 
    ? new Date(assessment.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  
  const overallScore = assessment.overallMaturityScore || assessment.epmReadinessScore || 0;
  const urgencyScore = (assessment as any).urgencyScore || 50;
  
  // Extract dimension scores
  const dimensionScores = extractDimensionScores(assessment.dimensionScores);
  const sortedDimensions = Object.entries(dimensionScores).sort(([, a], [, b]) => a - b);
  
  // Get top 3 lowest scoring dimensions (priority areas)
  const top3PriorityAreas = sortedDimensions.slice(0, 3).map(([dim, score]) => ({
    name: formatDimensionName(dim),
    score: Math.round(score),
    rating: getMaturityRating(score)
  }));
  
  // Maturity level label
  const maturityLabel = overallScore >= 80 ? "Leader" : 
                        overallScore >= 60 ? "Established" :
                        overallScore >= 40 ? "Developing" : "Foundational";

  const prompt = `
Create a quick diagnostic EPM assessment presentation for ${companyName}, a ${company.sector || "multi-sector"} company with ${(company as any).fteCount || company.entities || "N/A"} employees.

AUDIENCE: Finance leadership (CFO, Finance Director)

PRESENTATION PURPOSE: Quick diagnostic to establish urgency and top priorities. Generate interest in full assessment.

## KEY DATA
- Company: ${companyName}
- Contact: ${contactName} (${contact.roleTitle || "Finance Leader"})
- Assessment Date: ${assessmentDate}
- Assessment Tier: Pre-Assessment
- EPM Readiness Score: ${Math.round(overallScore)}%
- Maturity Level: ${maturityLabel}
- Urgency Score: ${Math.round(urgencyScore)}%
- Industry: ${company.sector || "Multi-sector"}

## TOP 3 PRIORITY AREAS (Lowest Scoring)
${top3PriorityAreas.map((area, i) => `${i + 1}. ${area.name}: ${area.score}% (${area.rating})`).join("\n")}

## PRESENTATION STRUCTURE (7 slides)

SLIDE 1 - COVER:
- Title: "EPM Readiness Quick Assessment"
- Subtitle: "${companyName} | ${assessmentDate}"
- Footer: "Constancia Finance Transformation Advisors | Confidential"

SLIDE 2 - ASSESSMENT COMPLETION SUMMARY:
- Assessment Type: Pre-Assessment Diagnostic
- Completion Date: ${assessmentDate}
- Scope: 8 EPM dimensions evaluated
- Purpose: Identify priority areas for finance transformation

SLIDE 3 - EPM READINESS SCORE:
- Headline Score: ${Math.round(overallScore)}%
- Maturity Level: ${maturityLabel}
- Score Interpretation: Brief explanation of what this score means
- Visual: Simple gauge or progress bar

SLIDE 4 - TOP 3 PRIORITY AREAS:
- Ranked list of 3 lowest-scoring dimensions:
${top3PriorityAreas.map((area, i) => `  ${i + 1}. ${area.name}: ${area.score}% - Brief implication`).join("\n")}
- Each with urgency indicator

SLIDE 5 - URGENCY & CHANGE READINESS:
- Urgency Score: ${Math.round(urgencyScore)}%
- Implications for timeline
- Resource availability considerations
- Market/competitive pressure context

SLIDE 6 - RECOMMENDED NEXT STEPS:
- Proceed to Full Assessment for detailed analysis
- Expected timeline: 2-4 weeks
- Benefits: Detailed ROI, implementation roadmap, AI-powered insights
- Constancia support options

SLIDE 7 - CONTACT INFORMATION:
- Primary Contact: ${contactName}
- Email: ${contact.email}
- Constancia Enquiries: info@constancia.io
- Next meeting suggestion

## DESIGN REQUIREMENTS
- Professional, clean design
- Dark navy (#12161D) and teal (#0891B2) accent colors
- Maximum 3 bullets per slide
- Scores as whole numbers with %
- NO detailed dimension analysis
- NO AI commentary
- NO ROI calculations
- NO radar charts

## TONE
- Diagnostic, not prescriptive
- Light, encouraging
- Professional but approachable
- Focus: "Here's where to focus first"

## QUALITY STANDARD
Suitable for email or quick leadership review. Should take <5 minutes to review.
`;

  return prompt;
}

// ============================================
// TIER 2: FULL ASSESSMENT REPORT (18-22 Slides)
// Comprehensive with AI insights, ROI, roadmap
// ============================================

function buildFullAssessmentPrompt(data: AssessmentReportData): string {
  const { assessment, company, contact, analysis } = data;
  const companyName = company.name || "Your Organisation";
  const contactName = `${contact.firstName} ${contact.lastName}`;
  const assessmentDate = assessment.completedAt 
    ? new Date(assessment.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  
  const overallScore = assessment.overallMaturityScore || assessment.epmReadinessScore || 0;
  const urgencyScore = (assessment as any).urgencyScore || 50;
  
  // Extract dimension scores
  const dimensionScores = extractDimensionScores(assessment.dimensionScores);
  
  log.info({ dimensionScores }, "Building Full Assessment prompt with dimension scores");
  
  const sortedDimensions = Object.entries(dimensionScores).sort(([, a], [, b]) => b - a);
  
  const topStrength = sortedDimensions[0];
  const topWeakness = sortedDimensions[sortedDimensions.length - 1];
  
  const dimensionDetails = sortedDimensions.map(([dim, score]) => {
    const rating = getMaturityRating(score);
    const status = score > 70 ? "ON TRACK" : score >= 50 ? "AT RISK" : "CRITICAL";
    return `${formatDimensionName(dim)} – ${Math.round(score)}% (${rating}) | Status: ${status}`;
  }).join("\n");
  
  // Maturity level label
  const maturityLabel = overallScore >= 80 ? "Leader" : 
                        overallScore >= 60 ? "Established" :
                        overallScore >= 40 ? "Developing" : "Foundational";

  // Extract AI analysis data if available
  const aiSummary = analysis?.summary || (assessment as any).aiSummary || "";
  const keyFindings = analysis?.keyFindings || (assessment as any).keyFindings || [];
  const recommendations = (assessment.recommendations || []) as Array<string | { title?: string; recommendation?: string; description?: string; priority?: string }>;
  const quickWins = (assessment.quickWins || []) as Array<string | { title?: string; action?: string }>;
  
  // ROI data if available
  const roiData = (assessment as any).roiData || {};
  const implementationCost = roiData.totalCost || "£500,000 - £1,500,000";
  const paybackPeriod = roiData.paybackMonths || "12-18 months";
  const annualBenefits = roiData.totalAnnualBenefit || "£300,000 - £800,000";

  // Generate dynamic implementation phases based on sizeBand and sector
  const dynamicPhases = generateImplementationPhases(
    company.sizeBand || undefined,
    undefined,
    dimensionScores,
    company.sector || undefined
  );
  
  // Format phases for the prompt
  const formattedPhases = dynamicPhases.map((phase, index) => {
    const startMonth = phase.monthRange.start;
    const endMonth = phase.monthRange.end;
    const monthLabel = startMonth === 0 
      ? `Months 1-${endMonth}` 
      : `Months ${startMonth + 1}-${endMonth}`;
    const activities = phase.keyActivities.slice(0, 2).join(", ");
    return `- Phase ${index + 1}: ${phase.name} (${monthLabel}) - ${activities}`;
  }).join("\n");
  
  // Get aggregated timeline info
  const timeline = getAggregatedTimeline(company.sizeBand || undefined, company.sector || undefined);
  const totalDuration = `${timeline.min}-${timeline.max} months`;

  const prompt = `
Create a comprehensive Enterprise Performance Management (EPM) assessment and strategic roadmap for ${companyName}, a ${company.sector || "multi-sector"} company with ${(company as any).fteCount || company.entities || "N/A"} employees and ${company.sizeBand?.replace(/_/g, " to ").replace("m", "M").replace("b", "B") || "mid-market"} revenue.

AUDIENCE: C-Suite (CFO, CEO, Finance Director, COO) and steering committee

PRESENTATION PURPOSE:
Provide ${companyName} with:
1. Clear maturity assessment across all 8 EPM dimensions
2. AI-generated insights on current state vs. target state
3. Detailed ROI analysis and business case for improvement
4. Phased implementation roadmap with timeline and resource requirements
5. Risk mitigation strategies and change management approach
6. Actionable quick wins and strategic priorities

## CRITICAL DATA INPUTS

### Company Profile
- Company: ${companyName}
- Contact: ${contactName} (${contact.roleTitle || "Finance Leader"})
- Email: ${contact.email}
- Industry: ${company.sector || "Multi-sector"}
- Revenue Band: ${company.sizeBand?.replace(/_/g, " to ").replace("m", "M").replace("b", "B") || "Mid-market"}
- FTE Count: ${(company as any).fteCount || company.entities || "N/A"}
- Finance FTE: ${company.financeFte || "N/A"}

### Assessment Results
- Assessment Date: ${assessmentDate}
- Assessment Tier: Full Assessment
- EPM Readiness Score: ${Math.round(overallScore)}%
- Maturity Level: ${maturityLabel}
- Urgency Score: ${Math.round(urgencyScore)}%

### Dimension Scores (8 Key Areas)
${dimensionDetails}

### Traffic Light Status System
Apply colored text or backgrounds to status labels:
- CRITICAL = RED text/background - requires immediate attention
- AT RISK = ORANGE text/background - needs improvement  
- ON TRACK = GREEN text/background - performing well

### Strongest Dimension
${topStrength ? `${formatDimensionName(topStrength[0])}: ${Math.round(topStrength[1])}%` : "N/A"}

### Priority Gap (Weakest Dimension)
${topWeakness ? `${formatDimensionName(topWeakness[0])}: ${Math.round(topWeakness[1])}%` : "N/A"}

${aiSummary ? `
### AI Analysis Summary
${aiSummary}
` : ""}

${keyFindings.length > 0 ? `
### Key Findings
${keyFindings.slice(0, 5).map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}
` : ""}

${recommendations.length > 0 ? `
### Strategic Recommendations
${recommendations.slice(0, 6).map((r, i) => `${i + 1}. ${typeof r === "string" ? r : r.title || r.recommendation || r.description || ""}`).join("\n")}
` : ""}

${quickWins.length > 0 ? `
### Quick Wins (0-3 Months)
${quickWins.slice(0, 4).map((q, i) => `${i + 1}. ${typeof q === "string" ? q : q.title || q.action || ""}`).join("\n")}
` : ""}

### ROI Estimates
- Estimated Implementation Cost: ${implementationCost}
- Expected Payback Period: ${paybackPeriod}
- Estimated Annual Benefits: ${annualBenefits}

## PRESENTATION STRUCTURE (20 slides)

SLIDE 1 - COVER:
- Title: "Finance Technology & Maturity Assessment | Strategic Roadmap"
- Subtitle: "${companyName} | ${assessmentDate}"
- Footer: "Constancia Finance Transformation Advisors | Confidential"

SLIDE 2 - TABLE OF CONTENTS:
- Executive Summary
- Assessment Overview
- Maturity Assessment Results
- Dimension Deep-Dives
- Strategic Recommendations
- ROI & Business Case
- Implementation Roadmap
- Next Steps

SLIDE 3 - EXECUTIVE SUMMARY (with AI insights):
- Overall EPM Readiness Score: ${Math.round(overallScore)}% → ${maturityLabel}
- 3 Key Findings from assessment
- 3 Strategic Priorities with expected impact
- Call to Action: Implementation timeline recommendation

SLIDE 4 - ASSESSMENT OVERVIEW & METHODOLOGY:
- Assessment Scope: Full Assessment (comprehensive)
- Completion Date: ${assessmentDate}
- Company Profile summary
- 8-dimension maturity model methodology
- Benchmarking approach: ${company.sector || "Industry"} standards

SLIDE 5 - OVERALL MATURITY SCORE & BENCHMARKING:
- EPM Readiness Score: ${Math.round(overallScore)}%
- Maturity Level: ${maturityLabel}
- Score interpretation and implications
- Industry benchmarking comparison
- Percentile positioning

SLIDE 6 - 8-DIMENSION RADAR/SPIDER CHART:
CRITICAL: Create a RADAR CHART (spider chart), NOT a bar chart. Must show 8 axes radiating from center.
The radar chart MUST include THREE data series/lines:
1. "Assessment Score" - The actual scores from this assessment (use data below)
2. "Industry Benchmark" - 60% baseline for all dimensions
3. "World-Class" - 85% target for all dimensions

Radar chart data points (8 dimensions):
- Financial Planning & Analysis: ${Math.round(dimensionScores.financial_planning_analysis || 0)}%
- Organisation & People: ${Math.round(dimensionScores.organisation_people || 0)}%
- Data & Analytics: ${Math.round(dimensionScores.data_analytics || 0)}%
- Technology & Systems: ${Math.round(dimensionScores.technology_systems || 0)}%
- Financial Controls & Compliance: ${Math.round(dimensionScores.financial_controls_compliance || 0)}%
- Management Reporting: ${Math.round(dimensionScores.management_reporting || 0)}%
- Consolidation & Close: ${Math.round(dimensionScores.consolidation_close || 0)}%
- AI & Machine Learning: ${Math.round(dimensionScores.ai_machine_learning || 0)}%

Include a legend showing the three lines with different colors.

SLIDES 7-14 - DIMENSION DEEP-DIVES (one per dimension):

For each of the 8 dimensions, create one slide with:
- Slide title format: "Dimension Name – Score%" followed by a STATUS BADGE on the RIGHT side of the title
- The status badge should be a larger, prominent colored shape (rectangle or rounded box) containing the status text
- Current State Summary (2-3 sentences)
- Key Strengths identified (2-3 bullet points)
- Gaps Identified with business impact
- Specific Recommendations for this dimension

Dimensions with status (style the status text with colored background as instructed):
1. Financial Planning & Analysis – ${Math.round(dimensionScores.financial_planning_analysis || 0)}% | ${(dimensionScores.financial_planning_analysis || 0) > 70 ? "ON TRACK" : (dimensionScores.financial_planning_analysis || 0) >= 50 ? "AT RISK" : "CRITICAL"}
2. Organisation & People – ${Math.round(dimensionScores.organisation_people || 0)}% | ${(dimensionScores.organisation_people || 0) > 70 ? "ON TRACK" : (dimensionScores.organisation_people || 0) >= 50 ? "AT RISK" : "CRITICAL"}
3. Data & Analytics – ${Math.round(dimensionScores.data_analytics || 0)}% | ${(dimensionScores.data_analytics || 0) > 70 ? "ON TRACK" : (dimensionScores.data_analytics || 0) >= 50 ? "AT RISK" : "CRITICAL"}
4. Technology & Systems – ${Math.round(dimensionScores.technology_systems || 0)}% | ${(dimensionScores.technology_systems || 0) > 70 ? "ON TRACK" : (dimensionScores.technology_systems || 0) >= 50 ? "AT RISK" : "CRITICAL"}
5. Financial Controls & Compliance – ${Math.round(dimensionScores.financial_controls_compliance || 0)}% | ${(dimensionScores.financial_controls_compliance || 0) > 70 ? "ON TRACK" : (dimensionScores.financial_controls_compliance || 0) >= 50 ? "AT RISK" : "CRITICAL"}
6. Management Reporting – ${Math.round(dimensionScores.management_reporting || 0)}% | ${(dimensionScores.management_reporting || 0) > 70 ? "ON TRACK" : (dimensionScores.management_reporting || 0) >= 50 ? "AT RISK" : "CRITICAL"}
7. Consolidation & Close – ${Math.round(dimensionScores.consolidation_close || 0)}% | ${(dimensionScores.consolidation_close || 0) > 70 ? "ON TRACK" : (dimensionScores.consolidation_close || 0) >= 50 ? "AT RISK" : "CRITICAL"}
8. AI & Machine Learning – ${Math.round(dimensionScores.ai_machine_learning || 0)}% | ${(dimensionScores.ai_machine_learning || 0) > 70 ? "ON TRACK" : (dimensionScores.ai_machine_learning || 0) >= 50 ? "AT RISK" : "CRITICAL"}

SLIDE 15 - BUSINESS IMPACT ANALYSIS:
- Financial Impact: Efficiency gains, cost reduction opportunities
- Operational Impact: Process improvements, time savings
- Risk Impact: Compliance improvements, control enhancements
- Strategic Impact: Forecasting accuracy, decision-making speed

SLIDE 16 - ROI & FINANCIAL BENEFITS SUMMARY:
- Implementation Investment breakdown
- Expected Benefits (annual, post-implementation)
- Payback Period: ${paybackPeriod}
- Sensitivity Analysis: Conservative, Base, Optimistic scenarios

SLIDE 17 - IMPLEMENTATION ROADMAP:
${formattedPhases}
- Total estimated duration: ${totalDuration}${timeline.industryRationale ? ` (${timeline.industryRationale})` : ""}
- Timeline visual with milestones

SLIDE 18 - STRATEGIC RECOMMENDATIONS (with ROI):
- Top 3-5 prioritised recommendations
- Each with: Rationale, Effort, Expected Benefit, Timeline, Owner

SLIDE 19 - QUICK WINS (30-90 Day Actions):
- 3-4 quick wins with effort/impact details
- Immediate value opportunities
- Low effort, high impact actions

SLIDE 20 - CHANGE MANAGEMENT & RISKS:
- Change Readiness Assessment
- Key Success Factors
- Potential Resistance Areas with Mitigations
- Risk Assessment: Top 3 risks with severity and mitigation

SLIDE 21 - NEXT STEPS & CONTACT:
- Immediate Actions (within 30 days)
- Steering committee kickoff recommendation
- Governance structure proposal
- Contact Information: ${contactName}, ${contact.email}
- Constancia Support: info@constancia.io

## DESIGN REQUIREMENTS
- Professional, executive-ready styling
- Dark navy (#12161D) and teal (#0891B2) accent colors
- Clean data visualizations with clear labels
- Consistent header/footer on all slides
- Page numbers on all slides except title
- Confidential marking on each slide
- Constancia branding subtle but present
- Radar chart for dimension visualization
- Color coding: Green (strength) | Amber (developing) | Red (gap)

## FORMATTING STANDARDS
- 4-5 bullets maximum per slide
- 10-20 words per bullet
- Numbers formatted with separators (£1,250,000 or £1.2M)
- Percentages as whole numbers with %
- All dimension slides use identical structure

## QUALITY STANDARD
This presentation should meet Big 4 consulting firm standards:
- Suitable for Board/Executive review without further editing
- Data accuracy is paramount
- Every claim supported by assessment data
- Actionable insights justify the assessment investment
- ROI case is compelling and realistic
- Implementation plan is achievable and detailed
- Professional design reflecting Constancia premium brand
`;

  return prompt;
}

// Legacy function - delegates to appropriate tier-specific builder
function buildBig4PresentationPrompt(data: AssessmentReportData): string {
  const tier = data.assessment.tier;
  
  if (tier === "pre_assessment") {
    return buildPreAssessmentPrompt(data);
  }
  
  // Default to full assessment for "full" tier or any other
  return buildFullAssessmentPrompt(data);
}

// ============================================
// SLIDE-BY-SLIDE API BUILDER
// Provides precise control over each slide with AI-generated status icons
// ============================================

function buildSlideBySlidePresentation(data: AssessmentReportData): SlideDefinition[] {
  const { assessment, company, contact, analysis } = data;
  const companyName = company.name || "Your Organisation";
  const contactName = `${contact.firstName} ${contact.lastName}`;
  const assessmentDate = assessment.completedAt 
    ? new Date(assessment.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  
  const overallScore = assessment.overallMaturityScore || assessment.epmReadinessScore || 0;
  const dimensionScores = extractDimensionScores(assessment.dimensionScores);
  const sortedDimensions = Object.entries(dimensionScores).sort(([, a], [, b]) => b - a);
  
  const maturityLabel = overallScore >= 80 ? "Leader" : 
                        overallScore >= 60 ? "Established" :
                        overallScore >= 40 ? "Developing" : "Foundational";

  const aiSummary = analysis?.summary || (assessment as any).aiSummary || "";
  const keyFindings = analysis?.keyFindings || (assessment as any).keyFindings || [];
  const recommendations = (assessment.recommendations || []) as Array<string | { title?: string; recommendation?: string; description?: string; priority?: string }>;
  const quickWins = (assessment.quickWins || []) as Array<string | { title?: string; action?: string }>;
  
  const roiData = (assessment as any).roiData || {};
  const implementationCost = roiData.totalCost || "£500,000 - £1,500,000";
  const paybackPeriod = roiData.paybackMonths || "12-18 months";
  const annualBenefits = roiData.totalAnnualBenefit || "£300,000 - £800,000";

  // Generate dynamic implementation phases based on sizeBand and sector
  const dynamicPhases = generateImplementationPhases(
    company.sizeBand || undefined,
    undefined,
    dimensionScores,
    company.sector || undefined
  );
  
  // Format phases for timeline slide
  const phaseContent = dynamicPhases.map((phase, index) => {
    const startMonth = phase.monthRange.start;
    const endMonth = phase.monthRange.end;
    const monthLabel = startMonth === 0 
      ? `Months 1-${endMonth}` 
      : `Months ${startMonth + 1}-${endMonth}`;
    const activities = phase.keyActivities.slice(0, 2).join(", ");
    return `Phase ${index + 1} (${monthLabel}): ${phase.name} - ${activities}`;
  }).join(". ");

  const slides: SlideDefinition[] = [];

  // Slide 1: Table of Contents (cover is auto-generated)
  slides.push({
    title: "Contents",
    layout: "ITEMS",
    item_amount: 5,
    content: `Executive Summary. Assessment Overview & Methodology. Overall Maturity Score & Benchmarking. 8-Dimension Analysis with Status Indicators. Strategic Recommendations, ROI & Implementation Roadmap.`
  });

  // Slide 2: Executive Summary
  slides.push({
    title: "Executive Summary",
    layout: "BIG_NUMBER",
    item_amount: 3,
    content: `${Math.round(overallScore)}% EPM Readiness Score - ${maturityLabel} maturity level. ${sortedDimensions[0] ? `Strongest: ${formatDimensionName(sortedDimensions[0][0])} at ${Math.round(sortedDimensions[0][1])}%` : ""}. ${sortedDimensions[sortedDimensions.length - 1] ? `Priority Gap: ${formatDimensionName(sortedDimensions[sortedDimensions.length - 1][0])} at ${Math.round(sortedDimensions[sortedDimensions.length - 1][1])}%` : ""}.`
  });

  // Slide 3: Assessment Overview
  slides.push({
    title: "Assessment Overview & Methodology",
    layout: "ITEMS",
    item_amount: 4,
    content: `Company: ${companyName}, ${company.sector || "Multi-sector"}, ${company.sizeBand?.replace(/_/g, " to ").replace("m", "M").replace("b", "B") || "Mid-market"} revenue. Assessment Date: ${assessmentDate}. Methodology: 8-dimension Finance Transformation readiness model benchmarked against industry standards. Scope: Full comprehensive assessment covering all finance transformation pillars.`
  });

  // Slide 4: Overall Score & Benchmarking
  slides.push({
    title: "Overall Maturity Score & Benchmarking",
    layout: "BIG_NUMBER",
    item_amount: 3,
    content: `${Math.round(overallScore)}% Overall EPM Readiness Score. ${maturityLabel} maturity level - ${overallScore >= 60 ? "above" : "below"} industry benchmark of 60%. Target: World-class organisations achieve 85%+ across all dimensions.`
  });

  // Slide 5: Dimension Overview with all 8 dimensions
  const dimensionSummary = sortedDimensions.map(([dim, score]) => 
    `${formatDimensionName(dim)}: ${Math.round(score)}% - ${getStatusText(score)}`
  ).join(". ");
  
  slides.push({
    title: "8-Dimension Maturity Overview",
    layout: "ITEMS",
    item_amount: 4,
    content: dimensionSummary
  });

  // Slides 6-13: Individual dimension deep-dives with colored status text
  for (const [dim, score] of sortedDimensions) {
    const status = getStatusText(score);
    const rating = getMaturityRating(score);
    const statusColor = score > 70 ? "GREEN" : score >= 50 ? "ORANGE" : "RED";
    
    slides.push({
      title: `${formatDimensionName(dim)} – ${Math.round(score)}% | ${status}`,
      layout: "ITEMS",
      item_amount: 4,
      content: `Current Score: ${Math.round(score)}% (${rating}). Status: ${status} (${statusColor}) - ${score > 70 ? "performing well, build on this strength" : score >= 50 ? "needs improvement to reach target" : "critical gap requiring immediate attention"}. Benchmark: Industry average 60%, World-class 85%. Recommendation: ${score > 70 ? "Maintain excellence and share best practices across the organisation" : score >= 50 ? "Develop improvement plan targeting 70%+ within 12 months" : "Prioritise urgent remediation within 3-6 months"}.`
    });
  }

  // Slide 14: Business Impact Analysis
  slides.push({
    title: "Business Impact Analysis",
    layout: "COMPARISON",
    item_amount: 2,
    content: `Current State Challenges: Manual processes consuming finance team capacity, limited forecasting accuracy, compliance risks in weak areas, delayed decision-making from slow reporting. Future State Benefits: Streamlined automated processes, improved forecast accuracy, strengthened controls and compliance, real-time insights for faster decisions.`
  });

  // Slide 15: ROI Summary
  slides.push({
    title: "ROI & Financial Benefits",
    layout: "BIG_NUMBER",
    item_amount: 3,
    content: `${implementationCost} Estimated Implementation Investment. ${annualBenefits} Expected Annual Benefits post-implementation. ${paybackPeriod} Payback Period with positive ROI thereafter.`
  });

  // Slide 16: Implementation Roadmap (using dynamic phases from intelligence-engine)
  slides.push({
    title: "Implementation Roadmap",
    layout: "TIMELINE",
    item_amount: 4,
    content: phaseContent
  });

  // Slide 17: Strategic Recommendations
  const recsContent = recommendations.length > 0 
    ? recommendations.slice(0, 4).map((r, i) => `${i + 1}. ${typeof r === "string" ? r : r.title || r.recommendation || r.description || ""}`).join(". ")
    : "Develop comprehensive improvement plan. Prioritise critical gap areas. Implement quick wins for early value. Establish governance framework.";
  
  slides.push({
    title: "Strategic Recommendations",
    layout: "STEPS",
    item_amount: 4,
    content: recsContent
  });

  // Slide 18: Quick Wins
  const quickWinsContent = quickWins.length > 0
    ? quickWins.slice(0, 4).map((q, i) => `${i + 1}. ${typeof q === "string" ? q : q.title || q.action || ""}`).join(". ")
    : "Automate key manual processes. Standardise reporting templates. Implement basic dashboards. Quick compliance fixes.";
  
  slides.push({
    title: "Quick Wins (30-90 Days)",
    layout: "ITEMS",
    item_amount: 4,
    content: quickWinsContent
  });

  // Slide 19: Next Steps & Contact
  slides.push({
    title: "Next Steps & Contact",
    layout: "ITEMS",
    item_amount: 4,
    content: `Schedule steering committee kickoff meeting. Review and prioritise recommendations. Develop detailed implementation plan. Contact: ${contactName} (${contact.email}). Constancia Support: info@constancia.io`
  });

  return slides;
}

export async function triggerSlidesSpeakGeneration(
  assessmentId: string,
  reportId?: string,
  options?: { force?: boolean }
): Promise<{ success: boolean; taskId?: string; reportId?: string; url?: string; status?: SlidesSpeakStatus; cached?: boolean; error?: string }> {
  const apiKey = process.env.SLIDESPEAK_API_KEY;
  
  if (!apiKey) {
    log.error("API key not configured");
    return { success: false, error: "SlideSpeak API key not configured" };
  }

  const force = options?.force ?? false;

  try {
    const assessment = await fcStorage.getAssessmentById(assessmentId);
    if (!assessment) {
      return { success: false, error: "Assessment not found" };
    }

    const company = assessment.companyId 
      ? await fcStorage.getCompanyById(assessment.companyId) 
      : null;
    const contact = assessment.contactId 
      ? await fcStorage.getContactById(assessment.contactId) 
      : null;

    if (!company || !contact) {
      return { success: false, error: "Company or contact not found" };
    }

    let report: FcReport | null = null;
    if (reportId) {
      report = await fcStorage.getReportById(reportId);
    }
    
    if (!report) {
      const reports = await fcStorage.getReportsByAssessmentId(assessmentId);
      report = reports.find(r => r.tier === assessment.tier) || null;
    }

    // Check if presentation already exists and is ready - return cached version unless force regeneration
    if (report && report.slidesSpeakStatus === "ready" && report.slidesSpeakUrl && !force) {
      log.info({ assessmentId }, "Using cached presentation");
      return { 
        success: true, 
        reportId: report.id,
        taskId: report.slidesSpeakTaskId || undefined,
        url: report.slidesSpeakUrl,
        status: "ready",
        cached: true,
      };
    }

    // Check if currently generating - don't start new generation
    if (report && (report.slidesSpeakStatus === "generating" || report.slidesSpeakStatus === "pending") && !force) {
      log.info({ assessmentId }, "Generation already in progress");
      return {
        success: true,
        reportId: report.id,
        taskId: report.slidesSpeakTaskId || undefined,
        status: report.slidesSpeakStatus as SlidesSpeakStatus,
        cached: false,
      };
    }

    if (!report) {
      report = await fcStorage.createReport({
        assessmentId,
        tier: assessment.tier,
        slidesSpeakStatus: "pending",
        slidesSpeakRequestedAt: new Date(),
      });
    }

    if (!report) {
      return { success: false, error: "Failed to create report record" };
    }

    const analysis = assessment.aiAnalysis as AnalysisResult | undefined;
    
    log.info({ assessmentId, tier: assessment.tier }, "Triggering generation");

    // Create AbortController for 10-minute timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10 * 60 * 1000); // 10 minutes

    // Use the Constancia branded template from SlideSpeak
    const templateValue = "cmhujze6f00dll504qzet2gqm"; // Constancia - Slide Master Deck Final 2025.pptx
    const isPreAssessment = assessment.tier === "pre_assessment";
    
    let response: Response;
    try {
      if (isPreAssessment) {
        // Pre-assessment uses the basic generate endpoint with plain text
        const prompt = buildPreAssessmentPrompt({ assessment, company, contact, analysis });
        
        log.info("Using basic generate for pre-assessment");
        
        response = await fetch(`${SLIDESPEAK_API_BASE}/presentation/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            plain_text: prompt,
            length: 7,
            template: templateValue,
            language: "ORIGINAL",
            fetch_images: false,
            tone: "professional",
            verbosity: "concise",
            include_cover: true,
            include_table_of_contents: false,
            add_speaker_notes: true,
            use_general_knowledge: false,
            response_format: "pdf",
            custom_user_instructions: `Create a quick diagnostic EPM assessment presentation.
               Professional, clean design with maximum 3 bullets per slide.
               For each dimension, show status with colored text:
               - "CRITICAL" in RED for scores below 50%
               - "AT RISK" in ORANGE for scores 50-70%
               - "ON TRACK" in GREEN for scores above 70%`,
          }),
        });
      } else {
        // Full assessment uses slide-by-slide API with AI-generated status icons
        const slides = buildSlideBySlidePresentation({ assessment, company, contact, analysis });
        
        log.info({ slideCount: slides.length }, "Using slide-by-slide API with AI status icons");
        
        response = await fetch(`${SLIDESPEAK_API_BASE}/presentation/generate/slide-by-slide`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            slides: slides,
            template: templateValue,
            language: "ORIGINAL",
            fetch_images: false,
            verbosity: "text-heavy",
            include_cover: true,
            include_table_of_contents: false,
            add_speaker_notes: true,
            response_format: "pdf",
          }),
        });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === "AbortError") {
        log.error("Request timed out after 10 minutes");
        await fcStorage.updateReport(report.id, {
          slidesSpeakStatus: "failed",
          slidesSpeakError: "Request timed out after 10 minutes. Please try again.",
        });
        return { success: false, error: "Request timed out. Please try again." };
      }
      
      log.error({ err: new Error(fetchError.message) }, "Network error");
      await fcStorage.updateReport(report.id, {
        slidesSpeakStatus: "failed",
        slidesSpeakError: `Network error: ${fetchError.message}`,
      });
      return { success: false, error: `Network error: ${fetchError.message}. Please check your connection and try again.` };
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch {
        errorText = "Unable to read error response";
      }
      
      log.error({ statusCode: response.status, errorText }, "API error");
      
      // Provide user-friendly error messages based on status code
      let userMessage = "Failed to generate presentation.";
      if (response.status === 401) {
        userMessage = "Authentication failed. Please contact support.";
      } else if (response.status === 402) {
        userMessage = "Presentation service subscription required. Please contact Constancia to enable this feature.";
        log.error("402 Payment Required - subscription needs to be upgraded");
      } else if (response.status === 403) {
        userMessage = "Access denied. Please contact support.";
      } else if (response.status === 429) {
        userMessage = "Too many requests. Please wait a few minutes and try again.";
      } else if (response.status >= 500) {
        userMessage = "Presentation service is temporarily unavailable. Please try again later.";
      } else if (response.status === 400) {
        userMessage = "Invalid request. Please try again or contact support.";
      }
      
      await fcStorage.updateReport(report.id, {
        slidesSpeakStatus: "failed",
        slidesSpeakError: userMessage,
      });
      
      return { success: false, error: userMessage };
    }

    const result: SlidesSpeakGenerateResponse = await response.json();
    log.info({ taskId: result.task_id }, "Generation triggered");

    await fcStorage.updateReport(report.id, {
      slidesSpeakTaskId: result.task_id,
      slidesSpeakStatus: "generating",
      slidesSpeakRequestedAt: new Date(),
    });

    return { 
      success: true, 
      taskId: result.task_id,
      reportId: report.id,
    };
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Generation error");
    return { success: false, error: error.message };
  }
}

export async function checkSlidesSpeakStatus(
  taskId: string,
  reportId: string
): Promise<{ status: SlidesSpeakStatus; url?: string; error?: string }> {
  const apiKey = process.env.SLIDESPEAK_API_KEY;
  
  if (!apiKey) {
    return { status: "failed", error: "Presentation service not configured. Please contact support." };
  }

  try {
    // Add 30 second timeout for status checks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let response: Response;
    try {
      response = await fetch(`${SLIDESPEAK_API_BASE}/task_status/${taskId}`, {
        headers: {
          "X-API-Key": apiKey,
        },
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        log.error("Status check timed out");
        return { status: "generating" }; // Keep showing as generating, don't fail on timeout
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      log.error({ statusCode: response.status }, "Status check failed");
      // Don't mark as failed for transient errors - keep as generating
      if (response.status >= 500) {
        return { status: "generating" };
      }
      return { status: "generating" };
    }

    const result: SlidesSpeakTaskStatus = await response.json();
    log.info({ taskStatus: result.task_status }, "Task status");

    switch (result.task_status) {
      case "SUCCESS":
        const url = result.task_result?.url || result.task_info?.url;
        
        await fcStorage.updateReport(reportId, {
          slidesSpeakStatus: "ready",
          slidesSpeakPdfUrl: url,
          slidesSpeakUrl: url,
          slidesSpeakCompletedAt: new Date(),
        });
        
        return { status: "ready", url };

      case "FAILURE":
        await fcStorage.updateReport(reportId, {
          slidesSpeakStatus: "failed",
          slidesSpeakError: "Presentation generation failed. Please try again.",
        });
        return { status: "failed", error: "Presentation generation failed. Please try again." };

      case "PENDING":
      case "STARTED":
      case "RETRY":
      default:
        return { status: "generating" };
    }
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Status check error");
    // Don't mark as failed for transient errors
    return { status: "generating" };
  }
}

export async function getReportGenerationStatus(
  assessmentId: string
): Promise<{
  hasReport: boolean;
  status?: SlidesSpeakStatus;
  url?: string;
  taskId?: string;
  reportId?: string;
  error?: string;
}> {
  try {
    const reports = await fcStorage.getReportsByAssessmentId(assessmentId);
    const report = reports[0];

    if (!report) {
      return { hasReport: false };
    }

    const status = (report.slidesSpeakStatus as SlidesSpeakStatus) || undefined;
    
    if (status === "generating" && report.slidesSpeakTaskId) {
      const statusCheck = await checkSlidesSpeakStatus(
        report.slidesSpeakTaskId,
        report.id
      );
      
      return {
        hasReport: true,
        status: statusCheck.status,
        url: statusCheck.url || report.slidesSpeakPdfUrl || undefined,
        taskId: report.slidesSpeakTaskId || undefined,
        reportId: report.id,
        error: statusCheck.error,
      };
    }

    return {
      hasReport: true,
      status,
      url: report.slidesSpeakPdfUrl || report.slidesSpeakUrl || undefined,
      taskId: report.slidesSpeakTaskId || undefined,
      reportId: report.id,
    };
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Status retrieval error");
    return { hasReport: false, error: error.message };
  }
}

export async function pollUntilComplete(
  taskId: string,
  reportId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<{ success: boolean; url?: string; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await checkSlidesSpeakStatus(taskId, reportId);
    
    if (result.status === "ready") {
      return { success: true, url: result.url };
    }
    
    if (result.status === "failed") {
      return { success: false, error: result.error };
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return { success: false, error: "Timeout waiting for generation" };
}
