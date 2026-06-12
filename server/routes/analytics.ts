import { Router, Request, Response } from "express";
import { z } from "zod";
import { createChildLogger } from "../lib/logger";
import { db } from "../db";

const log = createChildLogger("analytics");
import { widgetAnalytics, widgetAbTests, abTestVariantSchema, pageAnalytics, funnelTargets, insertPageAnalyticsSchema, analyticsInsights } from "@shared/schema";
import { desc, gte, sql, eq, and, isNull, count, avg, between, lte, asc } from "drizzle-orm";
import { sendEmail, isEmailConfigured } from "../services/email-sender";
import {
  EMAIL_BRAND,
  generateNotificationHeader,
  generateInfoCard,
  generateCtaButton,
  generateSuccessBox,
  generateWarningBox,
  wrapEmailContent,
} from "../core/email/components";
import { createOrUpdateContact, isHubSpotConnected, type HubSpotContactResult } from "../services/hubspot";
import {
  ANALYTICS_EVENTS,
  canonicalEvent,
  categoryForEvent,
  CONVERSION_MODE,
  LEAD_CAPTURE_EVENTS,
  type ConversionMode,
} from "@shared/analytics-taxonomy";
import { computeFunnel } from "../services/analytics/funnel";
import { refreshInsightCache } from "../services/analytics/insights";
import { compareInsights } from "@shared/analytics-insights";
import { hashIp } from "../services/analytics/ip-hash";
import { isAuthenticated } from "../clerkAuth";

const router = Router();

const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID || "";
const LEAD_NOTIFICATION_EMAIL = process.env.LEAD_NOTIFICATION_EMAIL || "info@constancia.io";

const EXCLUDED_ANALYTICS_IPS = [
  "2a06:5906:1423:7000:8de0:ce1:adef:4e1",
];

function getClientIP(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const firstIP = forwarded.toString().split(",")[0].trim();
    return firstIP;
  }
  return req.ip;
}

function isExcludedIP(ip: string | undefined): boolean {
  if (!ip) return false;
  const cleanIP = ip.replace(/^::ffff:/, "").trim();
  return EXCLUDED_ANALYTICS_IPS.some(excluded => {
    if (cleanIP === excluded) return true;
    const excludedPrefix = excluded.split(":").slice(0, 4).join(":");
    const cleanPrefix = cleanIP.split(":").slice(0, 4).join(":");
    return cleanPrefix === excludedPrefix;
  });
}

function excludeAdminIPsFilter(events: any[]): any[] {
  return events.filter(e => !isExcludedIP(e.ipAddress));
}

/**
 * Parse a name from an email address
 * Examples:
 * - "john.smith@company.com" → { firstName: "John", lastName: "Smith" }
 * - "jsmith@company.com" → { firstName: "Jsmith", lastName: "" }
 * - "john_doe@company.com" → { firstName: "John", lastName: "Doe" }
 * - "john+tag@company.com" → { firstName: "John", lastName: "" }
 * - "john.smith.doe@company.com" → { firstName: "John", lastName: "Smith Doe" }
 */
function parseNameFromEmail(email: string): { firstName: string; lastName: string } {
  let localPart = email.split("@")[0] || "";
  
  // Remove plus-addressing suffix (e.g., "john+tag" → "john")
  if (localPart.includes("+")) {
    localPart = localPart.split("+")[0];
  }
  
  // Try to split by common separators
  const separators = [".", "_", "-"];
  for (const sep of separators) {
    if (localPart.includes(sep)) {
      const parts = localPart.split(sep).filter(p => p.length > 0);
      if (parts.length >= 2) {
        const firstName = capitalise(parts[0]);
        // Capitalise each part of multi-part last names
        const lastName = parts.slice(1).map(p => capitalise(p)).join(" ");
        return { firstName, lastName };
      }
    }
  }
  
  // If no separator found, use the whole local part as first name
  return { firstName: capitalise(localPart), lastName: "" };
}

function capitalise(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Extract company domain from email (e.g., "john@acme.co.uk" → "acme.co.uk")
 */
function extractCompanyFromEmail(email: string): { company: string; needsVerification: boolean } {
  const domain = email.split("@")[1] || "";
  const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "live.com", "msn.com", "googlemail.com", "protonmail.com", "proton.me", "me.com", "mail.com", "ymail.com"];
  
  if (genericDomains.includes(domain.toLowerCase())) {
    return { company: "To be verified", needsVerification: true };
  }
  return { company: domain, needsVerification: false };
}

// Label mappings for qualification data
const INDUSTRY_LABELS: Record<string, string> = {
  financial_services: "Financial Services & Banking",
  insurance: "Insurance",
  healthcare: "Healthcare & Life Sciences",
  manufacturing: "Manufacturing",
  retail: "Retail & Consumer Goods",
  technology: "Technology & Software",
  energy: "Energy & Utilities",
  professional_services: "Professional Services",
  public_sector: "Public Sector & Government",
  real_estate: "Real Estate & Construction",
  telecommunications: "Telecommunications",
  transport_logistics: "Transport & Logistics",
  other: "Other",
};

const ROLE_LABELS: Record<string, string> = {
  cfo: "CFO / Finance Director",
  group_controller: "Group Controller / Financial Controller",
  head_fpa: "Head of FP&A / Planning Director",
  head_reporting: "Head of Reporting / Analytics",
  senior_manager: "Senior Manager / Director",
  manager: "Manager",
  analyst: "Analyst / Associate",
  consultant: "Consultant / Advisor",
  other: "Other",
};

const SIZE_LABELS: Record<string, string> = {
  "1_50": "1-50 employees",
  "51_200": "51-200 employees",
  "201_500": "201-500 employees",
  "501_1000": "501-1,000 employees",
  "1001_5000": "1,001-5,000 employees",
  "5001_10000": "5,001-10,000 employees",
  "10001_plus": "10,000+ employees",
};

const REVENUE_LABELS: Record<string, string> = {
  "under_10m": "Under GBP10 million",
  "10m_50m": "GBP10-50 million",
  "50m_100m": "GBP50-100 million",
  "100m_500m": "GBP100-500 million",
  "500m_1b": "GBP500 million - GBP1 billion",
  "1b_5b": "GBP1-5 billion",
  "5b_plus": "GBP5+ billion",
  "prefer_not_say": "Prefer not to say",
};

/**
 * Build a HubSpot contact creation URL with pre-filled fields
 */
function buildHubSpotContactUrl(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  industry?: string;
  companySize?: string;
  revenue?: string;
  role?: string;
  score?: number;
  maturityLevel?: string;
}): string {
  if (!HUBSPOT_PORTAL_ID) {
    // Fallback: just create a search URL
    return `https://app.hubspot.com/contacts/search?query=${encodeURIComponent(data.email)}`;
  }
  
  const params = new URLSearchParams();
  params.set("email", data.email);
  if (data.firstName) params.set("firstname", data.firstName);
  if (data.lastName) params.set("lastname", data.lastName);
  if (data.company) params.set("company", data.company);
  
  // Map to HubSpot standard properties with human-readable labels
  if (data.role) params.set("jobtitle", ROLE_LABELS[data.role] || data.role);
  if (data.industry) params.set("industry", INDUSTRY_LABELS[data.industry] || data.industry);
  
  // Standard HubSpot properties
  if (data.companySize) params.set("numberofemployees", mapCompanySizeToRange(data.companySize));
  if (data.revenue) params.set("annualrevenue", mapRevenueToValue(data.revenue));
  
  // Build assessment summary for the message field (standard HubSpot property)
  const assessmentParts: string[] = [];
  if (data.score !== undefined) assessmentParts.push(`Finance Readiness Score: ${data.score}%`);
  if (data.maturityLevel) assessmentParts.push(`Maturity Level: ${data.maturityLevel}`);
  if (assessmentParts.length > 0) {
    params.set("hs_content_membership_notes", `[Constancia FinanceCompass Assessment] ${assessmentParts.join(' | ')}`);
  }
  
  return `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/contact/new?${params.toString()}`;
}

/**
 * Map company size label to HubSpot numberofemployees range
 */
function mapCompanySizeToRange(size: string): string {
  const mapping: Record<string, string> = {
    "1_50": "1-50",
    "51_200": "51-200",
    "201_500": "201-500",
    "501_1000": "501-1000",
    "1001_5000": "1001-5000",
    "5001_10000": "5001-10000",
    "10001_plus": "10001+",
  };
  return mapping[size] || size;
}

/**
 * Map revenue label to approximate value
 */
function mapRevenueToValue(revenue: string): string {
  const mapping: Record<string, string> = {
    "under_10m": "10000000",
    "10m_50m": "50000000",
    "50m_100m": "100000000",
    "100m_500m": "500000000",
    "500m_1b": "1000000000",
    "1b_5b": "5000000000",
    "5b_plus": "10000000000",
  };
  return mapping[revenue] || "";
}

/**
 * Build and send lead notification email to Constancia team
 */
async function sendWidgetLeadNotification(data: {
  email: string;
  sessionId: string;
  score: number;
  maturityLevel: string;
  qualificationData: Record<string, string>;
  strongestArea: { dimension: string; maturityLevel: string };
  weakestArea: { dimension: string; maturityLevel: string };
  recommendations: string[];
}): Promise<void> {
  const { firstName, lastName } = parseNameFromEmail(data.email);
  const { company, needsVerification } = extractCompanyFromEmail(data.email);
  
  // Use shared label constants
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : firstName || data.email;
  const displayIndustry = INDUSTRY_LABELS[data.qualificationData.industry] || data.qualificationData.industry || "Not specified";
  const displayRole = ROLE_LABELS[data.qualificationData.role] || data.qualificationData.role || "Not specified";
  const displaySize = SIZE_LABELS[data.qualificationData.companySize] || data.qualificationData.companySize || "Not specified";
  const displayRevenue = REVENUE_LABELS[data.qualificationData.revenue]?.replace(/GBP/g, "£") || data.qualificationData.revenue || "Not specified";
  
  // Determine lead quality/priority
  let leadPriority = "Standard";
  let priorityColor = "#8E4F67";
  if (data.score >= 60 || ["cfo", "group_controller", "head_fpa"].includes(data.qualificationData.role)) {
    leadPriority = "High Priority";
    priorityColor = "#7FB8A3";
  } else if (data.score <= 40) {
    leadPriority = "High Potential";
    priorityColor = "#FF6B35";
  }
  
  // Create/update contact in HubSpot via API
  let hubspotResult: HubSpotContactResult = { success: false };
  try {
    hubspotResult = await createOrUpdateContact({
      email: data.email,
      firstName,
      lastName,
      company,
      industry: displayIndustry,
      jobTitle: displayRole,
      numberOfEmployees: mapCompanySizeToRange(data.qualificationData.companySize),
      annualRevenue: mapRevenueToValue(data.qualificationData.revenue),
      financeReadinessScore: data.score,
      maturityLevel: data.maturityLevel,
      leadSource: "FinanceCompass Widget",
      leadPriority,
    });
  } catch (error) {
    log.error({ err: error }, "HubSpot API error");
  }
  
  // Build HubSpot status message for email
  let hubspotStatusHtml = "";
  if (hubspotResult.success) {
    const action = hubspotResult.isNew ? "created" : "updated";
    hubspotStatusHtml = `
      <div style="background-color: #edf5f1; border: 1px solid #7FB8A3; border-radius: 4px; padding: 12px; margin-bottom: 16px; text-align: center;">
        <span style="color: #5E8D7A; font-weight: 500;">Contact ${action} in HubSpot</span>
        ${hubspotResult.contactId ? `<br><span style="color: #7a7773; font-size: 12px;">ID: ${hubspotResult.contactId}</span>` : ""}
      </div>`;
  } else {
    hubspotStatusHtml = `
      <div style="background-color: #f9f3e8; border: 1px solid #dedad2; border-radius: 4px; padding: 12px; margin-bottom: 16px; text-align: center;">
        <span style="color: #7a6a50; font-weight: 500;">Manual HubSpot action required</span>
        <br><span style="color: #7a7773; font-size: 12px;">${hubspotResult.error || "API connection unavailable"}</span>
      </div>`;
  }
  
  // Fallback link for manual action
  const hubspotUrl = buildHubSpotContactUrl({
    email: data.email,
    firstName,
    lastName,
    company,
    industry: data.qualificationData.industry,
    companySize: data.qualificationData.companySize,
    revenue: data.qualificationData.revenue,
    role: data.qualificationData.role,
    score: data.score,
    maturityLevel: data.maturityLevel,
  });
  
  const leadBody = `
    ${generateInfoCard(`
      <h3 style="color: ${EMAIL_BRAND.charcoal}; margin: 0 0 14px 0; font-size: 15px; font-weight: 600; border-bottom: 1px solid ${EMAIL_BRAND.mediumGray}; padding-bottom: 10px;">Contact Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; width: 130px;">Name</td>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.charcoal}; font-size: 14px; font-weight: 500;">${displayName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px;">Email</td>
          <td style="padding: 6px 0; font-size: 14px;"><a href="mailto:${data.email}" style="color: ${EMAIL_BRAND.deepMint}; text-decoration: none;">${data.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px;">Company</td>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.charcoal}; font-size: 14px; font-weight: 500;">${company}${needsVerification ? ' <span style="color: ' + EMAIL_BRAND.mutedGray + '; font-size: 11px;">(verify)</span>' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px;">Role</td>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.charcoal}; font-size: 14px; font-weight: 500;">${displayRole}</td>
        </tr>
      </table>
    `)}

    ${generateInfoCard(`
      <h3 style="color: ${EMAIL_BRAND.charcoal}; margin: 0 0 14px 0; font-size: 15px; font-weight: 600; border-bottom: 1px solid ${EMAIL_BRAND.mediumGray}; padding-bottom: 10px;">Organisation Profile</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; width: 130px;">Industry</td>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.charcoal}; font-size: 14px; font-weight: 500;">${displayIndustry}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px;">Company Size</td>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.charcoal}; font-size: 14px; font-weight: 500;">${displaySize}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px;">Revenue</td>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.charcoal}; font-size: 14px; font-weight: 500;">${displayRevenue}</td>
        </tr>
      </table>
    `)}

    ${generateInfoCard(`
      <h3 style="color: ${EMAIL_BRAND.charcoal}; margin: 0 0 14px 0; font-size: 15px; font-weight: 600; border-bottom: 1px solid ${EMAIL_BRAND.mediumGray}; padding-bottom: 10px;">Assessment Results</h3>
      <div style="background-color: ${EMAIL_BRAND.charcoal}; border-radius: 4px; padding: 20px; text-align: center; margin-bottom: 16px;">
        <div style="font-size: 40px; font-weight: 700; color: ${EMAIL_BRAND.mint}; line-height: 1;">${data.score}%</div>
        <div style="color: ${EMAIL_BRAND.cream}; font-size: 14px; margin-top: 6px;">${data.maturityLevel}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; width: 130px;">Strongest Area</td>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.charcoal}; font-size: 14px; font-weight: 500;">${data.strongestArea.dimension} (${data.strongestArea.maturityLevel})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 14px;">Weakest Area</td>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.charcoal}; font-size: 14px; font-weight: 500;">${data.weakestArea.dimension} (${data.weakestArea.maturityLevel})</td>
        </tr>
      </table>
    `)}

    ${hubspotStatusHtml}

    ${!hubspotResult.success
      ? generateCtaButton('Add to HubSpot Manually', hubspotUrl)
      : generateCtaButton('View in HubSpot', 'https://app.hubspot.com/contacts')
    }

    ${generateInfoCard(`
      <p style="margin: 0; color: ${EMAIL_BRAND.mutedGray}; font-size: 12px;">
        <strong>Session ID:</strong> ${data.sessionId}<br>
        <strong>Timestamp:</strong> ${new Date().toISOString()}
      </p>
    `)}
  `;

  const emailHtml = wrapEmailContent(`
    ${generateNotificationHeader({ title: 'New Widget Lead', subtitle: leadPriority })}
    <div style="background-color: ${EMAIL_BRAND.white}; padding: 32px 28px;">
      ${leadBody}
    </div>
    <div style="background-color: ${EMAIL_BRAND.charcoal}; padding: 20px; text-align: center;">
      <p style="color: ${EMAIL_BRAND.mutedCream}; margin: 0; font-size: 12px;">Automated lead notification from the FinanceCompass Widget</p>
    </div>
  `);

  await sendEmail({
    to: LEAD_NOTIFICATION_EMAIL,
    subject: `New Widget Lead: ${displayName} (${data.score}% - ${data.maturityLevel})`,
    htmlContent: emailHtml,
  });
  
  log.info({ email: data.email.substring(0, 3) + "***", score: data.score, maturityLevel: data.maturityLevel, hubspotSync: hubspotResult.success ? (hubspotResult.isNew ? "created" : "updated") : "failed" }, "Lead notification sent for widget submission");
}

const fingerprintSchema = z.object({
  timezone: z.string().optional(),
  locale: z.string().optional(),
  languages: z.string().optional(),
  screen: z.string().optional(),
  colorDepth: z.number().optional(),
  platform: z.string().optional(),
  cookiesEnabled: z.boolean().optional(),
  deviceMemory: z.number().optional(),
  cores: z.number().optional(),
}).optional();

const widgetEventSchema = z.object({
  widget: z.string(),
  eventType: z.string(),
  timestamp: z.string(),
  sessionId: z.string().optional(),
  questionId: z.string().optional(),
  questionNumber: z.number().optional(),
  dimension: z.string().optional(),
  dimensionKey: z.string().optional(),
  answerValue: z.union([z.number(), z.string()]).optional(),
  answerLabel: z.string().optional(),
  maturityLevel: z.string().optional(),
  finalScore: z.number().optional(),
  rawScore: z.number().optional(),
  maxPossible: z.number().optional(),
  normalizedScore: z.string().optional(),
  answers: z.record(z.number()).optional(),
  qualificationData: z.record(z.string()).optional(),
  completionTime: z.number().optional(),
  previousScore: z.number().optional(),
  action: z.string().optional(),
  fingerprint: fingerprintSchema,
  field: z.string().optional(),
  selectedVendors: z.array(z.string()).optional(),
  categoryWeights: z.record(z.number()).optional(),
  vendorId: z.string().optional(),
  driverId: z.string().optional(),
  newWeight: z.number().optional(),
  format: z.string().optional(),
  metadata: z.object({
    abVariant: z.string().optional(),
    abTestId: z.number().optional(),
    dimensionKey: z.string().optional(),
    maturityLevel: z.string().optional(),
    rawScore: z.number().optional(),
    maxPossible: z.number().optional(),
    normalizedScore: z.string().optional(),
    selectedVendors: z.array(z.string()).optional(),
    categoryWeights: z.record(z.number()).optional(),
    vendorId: z.string().optional(),
    driverId: z.string().optional(),
    newWeight: z.number().optional(),
    format: z.string().optional(),
  }).passthrough().optional(),
});

router.post("/widget-event", async (req: Request, res: Response) => {
  try {
    const parsed = widgetEventSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid event data" });
    }

    const { 
      widget, 
      eventType, 
      sessionId, 
      questionId,
      questionNumber,
      dimension,
      dimensionKey,
      answerValue,
      answerLabel,
      maturityLevel,
      finalScore,
      rawScore,
      maxPossible,
      normalizedScore,
      answers,
      qualificationData,
      completionTime,
      previousScore,
      action,
      fingerprint,
      field,
      selectedVendors,
      categoryWeights,
      vendorId,
      driverId,
      newWeight,
      format,
      metadata: incomingMetadata,
    } = parsed.data;

    // Store numeric answerValue in column, string values in metadata
    const numericAnswerValue = typeof answerValue === 'number' ? answerValue : null;
    
    // Collect all server-derived metadata
    const derivedMetadata: Record<string, any> = {};
    if (typeof answerValue === 'string') derivedMetadata.answerValueStr = answerValue;
    if (dimensionKey) derivedMetadata.dimensionKey = dimensionKey;
    if (maturityLevel) derivedMetadata.maturityLevel = maturityLevel;
    if (rawScore !== undefined) derivedMetadata.rawScore = rawScore;
    if (maxPossible !== undefined) derivedMetadata.maxPossible = maxPossible;
    if (normalizedScore) derivedMetadata.normalizedScore = normalizedScore;
    if (selectedVendors) derivedMetadata.selectedVendors = selectedVendors;
    if (categoryWeights) derivedMetadata.categoryWeights = categoryWeights;
    if (vendorId) derivedMetadata.vendorId = vendorId;
    if (driverId) derivedMetadata.driverId = driverId;
    if (newWeight !== undefined) derivedMetadata.newWeight = newWeight;
    if (format) derivedMetadata.format = format;

    // Merge incoming metadata (abVariant, abTestId, etc.) with derived metadata
    const finalMetadata = {
      ...incomingMetadata,  // Client-provided metadata (abVariant, abTestId, etc.)
      ...derivedMetadata,   // Server-derived metadata (takes precedence)
    };

    // Check if IP should be excluded from analytics (admin users)
    const clientIP = getClientIP(req);
    if (isExcludedIP(clientIP)) {
      log.info("Skipping event from excluded IP");
      return res.json({ success: true, excluded: true });
    }

    // Extract device/browser info from user-agent
    const userAgent = req.headers["user-agent"] || "";
    let deviceType = "unknown";
    let browser = "unknown";
    let operatingSystem = "unknown";
    
    // Bot detection - comprehensive list of known bot patterns
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /headless/i, /phantom/i, /selenium/i, /puppeteer/i, /playwright/i,
      /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
      /yandexbot/i, /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
      /whatsapp/i, /telegrambot/i, /discordbot/i, /slackbot/i,
      /curl/i, /wget/i, /httpie/i, /python-requests/i, /axios/i, /node-fetch/i,
      /gptbot/i, /claudebot/i, /anthropic/i, /perplexitybot/i, /ccbot/i,
      /applebot/i, /amazonbot/i, /bytespider/i,
      /semrush/i, /ahrefs/i, /mj12bot/i, /dotbot/i, /rogerbot/i,
      /screaming frog/i, /gtmetrix/i, /pingdom/i, /uptimerobot/i,
      /lighthouse/i, /pagespeed/i,
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent)) || 
                  !userAgent || 
                  userAgent.length < 20;
    
    // Simple device type detection
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
      deviceType = /ipad|tablet/i.test(userAgent) ? "tablet" : "mobile";
    } else if (/windows|macintosh|linux/i.test(userAgent)) {
      deviceType = "desktop";
    }
    
    // Simple browser detection
    if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) {
      browser = "Chrome";
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      browser = "Safari";
    } else if (/firefox/i.test(userAgent)) {
      browser = "Firefox";
    } else if (/edge|edg/i.test(userAgent)) {
      browser = "Edge";
    }
    
    // Simple OS detection
    if (/windows/i.test(userAgent)) {
      operatingSystem = "Windows";
    } else if (/macintosh|mac os/i.test(userAgent)) {
      operatingSystem = "macOS";
    } else if (/iphone|ipad/i.test(userAgent)) {
      operatingSystem = "iOS";
    } else if (/android/i.test(userAgent)) {
      operatingSystem = "Android";
    } else if (/linux/i.test(userAgent)) {
      operatingSystem = "Linux";
    }

    // Extract screen resolution from fingerprint if available
    const screenResolution = fingerprint?.screen || null;

    // Extract comparison tool specific fields from metadata
    const isComparisonTool = widget?.includes('_comparison');
    let industry: string | null = null;
    let sizeBand: string | null = null;
    let revenueBand: string | null = null;
    let erpLandscape: string | null = null;
    let comparisonCategory: string | null = null;
    let selectedPreset: string | null = null;
    let topVendors: string[] | null = null;

    if (isComparisonTool && incomingMetadata && typeof incomingMetadata === 'object') {
      const meta = incomingMetadata as Record<string, any>;
      const profile = meta.profile as Record<string, any> | undefined;
      
      // Extract industry from metadata
      industry = (typeof meta.industry === 'string' ? meta.industry : null) || 
                 (typeof profile?.industry === 'string' ? profile.industry : null);
      
      // Extract company size
      sizeBand = (typeof meta.companySize === 'string' ? meta.companySize : null) || 
                 (typeof profile?.companySize === 'string' ? profile.companySize : null);
      
      // Extract revenue band
      revenueBand = typeof profile?.revenue === 'string' ? profile.revenue : null;
      
      // Extract ERP landscape
      erpLandscape = (typeof meta.erpLandscape === 'string' ? meta.erpLandscape : null) || 
                     (typeof profile?.erpLandscape === 'string' ? profile.erpLandscape : null);
      
      // Extract comparison category (EPM/ERP/AI)
      comparisonCategory = (typeof meta.category === 'string' ? meta.category : null) || 
                           (widget?.replace('_comparison', '') || null);
      
      // Extract selected preset
      selectedPreset = typeof meta.preset === 'string' ? meta.preset : null;
      
      // Extract top vendors/platforms
      if (Array.isArray(meta.selectedVendors)) {
        topVendors = meta.selectedVendors.filter((v: any) => typeof v === 'string');
      }
    }

    await db.insert(widgetAnalytics).values({
      widget,
      eventType,
      sessionId,
      questionId,
      questionNumber,
      dimension,
      answerValue: numericAnswerValue,
      answerLabel,
      field,
      finalScore,
      answers: answers || null,
      qualificationData: qualificationData || null,
      completionTime,
      previousScore,
      action,
      fingerprint: fingerprint || null,
      metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : null,
      userAgent,
      ipAddress: clientIP,
      deviceType,
      browser,
      operatingSystem,
      screenResolution,
      widgetVersion: "1.0",
      // Bot detection
      isBot,
      // Comparison tool specific fields
      industry,
      sizeBand,
      revenueBand,
      erpLandscape,
      comparisonCategory,
      selectedPreset,
      topVendors,
    });

    log.info({ widget, eventType, sessionId, ...(finalScore !== undefined && { score: finalScore }), ...(questionNumber !== undefined && { question: questionNumber }) }, "Widget event recorded");

    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error recording widget event");
    res.status(500).json({ success: false, error: "Failed to record event" });
  }
});

router.get("/widget-stats", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const daysParam = req.query.days as string | undefined;
    const days = daysParam && daysParam !== "all" ? parseInt(daysParam) : null;
    
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const periodStart = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;
    
    const widgetParam = req.query.widget as string | undefined;
    const comparisonWidgets = ['epm_comparison', 'erp_comparison', 'ai_comparison'];
    
    const filterByWidget = (events: any[]) => {
      if (!widgetParam || widgetParam === "all") return events;
      if (widgetParam === "comparison_tools") {
        return events.filter(e => comparisonWidgets.includes(e.widget));
      }
      return events.filter(e => e.widget === widgetParam);
    };

    const recentEventsRaw = await db.select()
      .from(widgetAnalytics)
      .where(gte(widgetAnalytics.createdAt, last24h));

    const periodEventsRaw = periodStart 
      ? await db.select().from(widgetAnalytics).where(gte(widgetAnalytics.createdAt, periodStart))
      : await db.select().from(widgetAnalytics);
    
    // Filter out bots and admin IPs
    const filterBots = (events: any[]) => events.filter(e => e.isBot !== true);
    const recentEvents = filterByWidget(filterBots(excludeAdminIPsFilter(recentEventsRaw)));
    const periodEvents = filterByWidget(filterBots(excludeAdminIPsFilter(periodEventsRaw)));
    
    // Track bot counts separately
    const recentBotEvents = filterByWidget(excludeAdminIPsFilter(recentEventsRaw)).filter(e => e.isBot === true);
    const periodBotEvents = filterByWidget(excludeAdminIPsFilter(periodEventsRaw)).filter(e => e.isBot === true);

    const uniqueSessions24h = new Set(recentEvents.filter(e => e.sessionId).map(e => e.sessionId)).size;
    const uniqueSessionsPeriod = new Set(periodEvents.filter(e => e.sessionId).map(e => e.sessionId)).size;

    const completionEvents = ["preview_completed", "results_viewed"];
    const completions24h = recentEvents.filter(e => completionEvents.includes(e.eventType)).length;
    const completionsPeriod = periodEvents.filter(e => completionEvents.includes(e.eventType)).length;

    const ctaClicks24h = recentEvents.filter(e => e.eventType === "cta_clicked").length;
    const ctaClicksPeriod = periodEvents.filter(e => e.eventType === "cta_clicked").length;
    
    const impressions24h = recentEvents.filter(e => e.eventType === "widget_loaded").length;
    const impressionsPeriod = periodEvents.filter(e => e.eventType === "widget_loaded").length;

    const scores = periodEvents
      .filter(e => completionEvents.includes(e.eventType) && e.finalScore !== null)
      .map(e => e.finalScore as number);

    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const questionDropoff: Record<number, number> = {};
    periodEvents
      .filter(e => e.eventType === "question_answered" && e.questionNumber)
      .forEach(e => {
        const qNum = e.questionNumber as number;
        questionDropoff[qNum] = (questionDropoff[qNum] || 0) + 1;
      });

    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(widgetAnalytics);

    res.json({
      success: true,
      data: {
        last24h: {
          uniqueSessions: uniqueSessions24h,
          completions: completions24h,
          ctaClicks: ctaClicks24h,
          impressions: impressions24h,
          conversionRate: uniqueSessions24h > 0 ? Math.round((ctaClicks24h / uniqueSessions24h) * 100) : 0,
        },
        period: {
          uniqueSessions: uniqueSessionsPeriod,
          completions: completionsPeriod,
          ctaClicks: ctaClicksPeriod,
          impressions: impressionsPeriod,
          conversionRate: uniqueSessionsPeriod > 0 ? Math.round((ctaClicksPeriod / uniqueSessionsPeriod) * 100) : 0,
          avgScore,
          days: days || "all",
        },
        questionDropoff,
        totalEvents: totalCount[0]?.count || 0,
        // Bot traffic (excluded from metrics above)
        botTraffic: {
          recent: recentBotEvents.length,
          period: periodBotEvents.length,
          recentPercentage: (recentEvents.length + recentBotEvents.length) > 0
            ? Math.round((recentBotEvents.length / (recentEvents.length + recentBotEvents.length)) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    log.error({ err: error }, "Error fetching widget stats");
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

router.get("/widget-events", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const daysParam = req.query.days as string | undefined;
    
    let dateFilter: Date | null = null;
    if (daysParam && daysParam !== "all") {
      const days = parseInt(daysParam);
      if (!isNaN(days) && days > 0) {
        dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }
    }
    
    let query = db.select().from(widgetAnalytics);
    if (dateFilter) {
      query = query.where(gte(widgetAnalytics.createdAt, dateFilter)) as typeof query;
    }
    
    const eventsRaw = await query
      .orderBy(desc(widgetAnalytics.createdAt))
      .limit(limit * 2);

    const events = excludeAdminIPsFilter(eventsRaw).slice(0, limit);

    res.json({ success: true, data: events });
  } catch (error) {
    log.error({ err: error }, "Error fetching widget events");
    res.status(500).json({ success: false, error: "Failed to fetch events" });
  }
});

const dimensionScoreSchema = z.object({
  dimension: z.string(),
  dimensionKey: z.string(),
  rawScore: z.number().min(1).max(5),
  maxScore: z.number(),
  percentage: z.number(),
  maturityLevel: z.string(),
});

const qualificationDataSchema = z.object({
  industry: z.string().optional(),
  companySize: z.string().optional(),
  revenue: z.string().optional(),
  role: z.string().optional(),
});

const widgetEmailResultsSchema = z.object({
  email: z.string().email("Invalid email address"),
  sessionId: z.string(),
  score: z.number().min(0).max(100),
  maturityLevel: z.string(),
  maturityDescription: z.string(),
  dimensionScores: z.array(dimensionScoreSchema),
  qualificationData: qualificationDataSchema,
  strongestArea: z.object({
    dimension: z.string(),
    maturityLevel: z.string(),
  }),
  weakestArea: z.object({
    dimension: z.string(),
    maturityLevel: z.string(),
  }),
  recommendations: z.array(z.string()),
  industryInsight: z.string().optional(),
});

function getMaturityBadgeColour(level: string): { bg: string; text: string } {
  const colours: Record<string, { bg: string; text: string }> = {
    "Leading": { bg: "#10b981", text: "#ffffff" },
    "Advanced": { bg: "#3b82f6", text: "#ffffff" },
    "Established": { bg: "#C77A93", text: "#ffffff" },
    "Developing": { bg: "#C77A93", text: "#ffffff" },
    "Ad-hoc": { bg: "#8E4F67", text: "#ffffff" },
  };
  return colours[level] || { bg: "#6b7280", text: "#ffffff" };
}

function getScoreBarColour(score: number): string {
  if (score >= 4) return "#10b981";
  if (score >= 3) return "#C77A93";
  return "#8E4F67";
}

function formatQualificationLabel(key: string, value: string): string {
  const labels: Record<string, Record<string, string>> = {
    industry: {
      financial_services: "Financial Services & Banking",
      insurance: "Insurance",
      healthcare: "Healthcare & Life Sciences",
      manufacturing: "Manufacturing",
      retail: "Retail & Consumer Goods",
      technology: "Technology & Software",
      energy: "Energy & Utilities",
      professional_services: "Professional Services",
      public_sector: "Public Sector & Government",
      real_estate: "Real Estate & Construction",
      telecommunications: "Telecommunications",
      transport_logistics: "Transport & Logistics",
      other: "Other",
    },
    companySize: {
      "1_50": "1-50 employees",
      "51_200": "51-200 employees",
      "201_500": "201-500 employees",
      "501_1000": "501-1,000 employees",
      "1001_5000": "1,001-5,000 employees",
      "5001_10000": "5,001-10,000 employees",
      "10001_plus": "10,000+ employees",
    },
    revenue: {
      under_10m: "Under £10 million",
      "10m_50m": "£10-50 million",
      "50m_100m": "£50-100 million",
      "100m_500m": "£100-500 million",
      "500m_1b": "£500 million - £1 billion",
      "1b_5b": "£1-5 billion",
      "5b_plus": "£5+ billion",
      prefer_not_say: "Prefer not to say",
    },
    role: {
      cfo: "CFO / Finance Director",
      group_controller: "Group Controller / Financial Controller",
      head_fpa: "Head of FP&A / Planning Director",
      head_reporting: "Head of Reporting / Analytics",
      senior_manager: "Senior Manager / Director",
      manager: "Manager",
      analyst: "Analyst / Associate",
      consultant: "Consultant / Advisor",
      other: "Other",
    },
  };
  return labels[key]?.[value] || value;
}

function buildWidgetResultsEmailHtml(data: z.infer<typeof widgetEmailResultsSchema>): string {
  const maturityColours = getMaturityBadgeColour(data.maturityLevel);
  const strongestColours = getMaturityBadgeColour(data.strongestArea.maturityLevel);
  const weakestColours = getMaturityBadgeColour(data.weakestArea.maturityLevel);

  const hasQualificationData = data.qualificationData.industry || 
    data.qualificationData.companySize || 
    data.qualificationData.revenue || 
    data.qualificationData.role;

  const dimensionRows = data.dimensionScores.map((dim) => {
    const barColour = getScoreBarColour(dim.rawScore);
    const barWidth = (dim.rawScore / dim.maxScore) * 100;
    const dimMaturityColours = getMaturityBadgeColour(dim.maturityLevel);
    
    return `
      <tr style="background-color: #ffffff;">
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; background-color: #ffffff;">
          ${dim.dimension}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; background-color: #ffffff;">
          <span style="font-weight: 600; color: #1f2937;">${dim.rawScore}/${dim.maxScore}</span>
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; width: 120px; background-color: #ffffff;">
          <div style="background-color: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
            <div style="background-color: ${barColour}; height: 100%; width: ${barWidth}%; border-radius: 4px;"></div>
          </div>
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; background-color: #ffffff;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; background-color: ${dimMaturityColours.bg}; color: ${dimMaturityColours.text};">
            ${dim.maturityLevel}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  const qualificationSection = hasQualificationData ? `
    <table role="presentation" style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
      <tr>
        <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #12161D;">Your Organisation Profile</h2>
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              ${data.qualificationData.industry ? `
                <td style="padding: 8px 16px 8px 0; vertical-align: top; width: 50%;">
                  <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Industry</div>
                  <div style="font-size: 14px; color: #1f2937; font-weight: 500;">${formatQualificationLabel("industry", data.qualificationData.industry)}</div>
                </td>
              ` : ""}
              ${data.qualificationData.companySize ? `
                <td style="padding: 8px 0 8px 16px; vertical-align: top; width: 50%;">
                  <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Company Size</div>
                  <div style="font-size: 14px; color: #1f2937; font-weight: 500;">${formatQualificationLabel("companySize", data.qualificationData.companySize)}</div>
                </td>
              ` : ""}
            </tr>
            <tr>
              ${data.qualificationData.revenue ? `
                <td style="padding: 8px 16px 8px 0; vertical-align: top; width: 50%;">
                  <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Annual Revenue</div>
                  <div style="font-size: 14px; color: #1f2937; font-weight: 500;">${formatQualificationLabel("revenue", data.qualificationData.revenue)}</div>
                </td>
              ` : ""}
              ${data.qualificationData.role ? `
                <td style="padding: 8px 0 8px 16px; vertical-align: top; width: 50%;">
                  <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Your Role</div>
                  <div style="font-size: 14px; color: #1f2937; font-weight: 500;">${formatQualificationLabel("role", data.qualificationData.role)}</div>
                </td>
              ` : ""}
            </tr>
          </table>
        </td>
      </tr>
    </table>
  ` : "";

  const industrySection = data.industryInsight ? `
    <table role="presentation" style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
      <tr>
        <td style="padding: 20px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #8E4F67;">
          <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #12161D;">Industry Context</h2>
          <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
            ${data.industryInsight}
          </p>
        </td>
      </tr>
    </table>
  ` : "";

  const recommendationsList = data.recommendations.map((rec, idx) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: ${idx < data.recommendations.length - 1 ? "1px solid #e5e7eb" : "none"};">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 32px; vertical-align: top; padding-right: 12px;">
              <div style="width: 28px; height: 28px; background-color: #8E4F67; border-radius: 50%; text-align: center; line-height: 28px; color: #ffffff; font-weight: 600; font-size: 14px;">
                ${idx + 1}
              </div>
            </td>
            <td style="vertical-align: top;">
              <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                ${rec}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Finance Readiness Assessment Results</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #EFEAE0; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #EFEAE0;">
    <tr>
      <td style="padding: 20px 10px;">
        <table role="presentation" style="max-width: 600px; width: 100%; margin: 0 auto; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with solid background (gradients don't work in all email clients) -->
          <tr>
            <td align="center" style="background-color: #12161D; padding: 40px 30px;">
              ${getEmailLogoHtml({ variant: "white", marginBottom: 20, maxWidth: 200 })}
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #7FB8A3; line-height: 1.3;">
                Your Finance Readiness Assessment Results
              </h1>
            </td>
          </tr>

          <!-- Score Summary Section -->
          <tr>
            <td style="padding: 40px 30px 24px 30px; text-align: center;">
              <div style="margin-bottom: 20px;">
                <span style="font-size: 64px; font-weight: 700; color: #12161D; line-height: 1;">${data.score}</span>
                <span style="font-size: 28px; color: #6b7280; font-weight: 400;">/100</span>
              </div>
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 10px 24px; border-radius: 24px; font-size: 16px; font-weight: 600; background-color: ${maturityColours.bg}; color: ${maturityColours.text}; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${data.maturityLevel}
                </span>
              </div>
              <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6; max-width: 480px; margin: 0 auto;">
                ${data.maturityDescription}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              
              ${qualificationSection}

              <!-- Dimension Breakdown -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #12161D;">Dimension Breakdown</h2>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f9fafb;">
                          <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Dimension</th>
                          <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Score</th>
                          <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Progress</th>
                          <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${dimensionRows}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Strongest Area & Key Opportunity -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
                <tr>
                  <td style="padding-right: 10px; width: 50%; vertical-align: top;">
                    <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; height: 100%; border: 1px solid #a7f3d0;">
                      <div style="font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; margin-bottom: 8px;">Strongest Area</div>
                      <div style="font-size: 16px; font-weight: 600; color: #065f46; margin-bottom: 8px;">${data.strongestArea.dimension}</div>
                      <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; background-color: ${strongestColours.bg}; color: ${strongestColours.text};">
                        ${data.strongestArea.maturityLevel}
                      </span>
                    </div>
                  </td>
                  <td style="padding-left: 10px; width: 50%; vertical-align: top;">
                    <div style="background-color: #fffbeb; border-radius: 8px; padding: 20px; height: 100%; border: 1px solid #fde68a;">
                      <div style="font-size: 12px; font-weight: 600; color: #d97706; text-transform: uppercase; margin-bottom: 8px;">Key Opportunity</div>
                      <div style="font-size: 16px; font-weight: 600; color: #92400e; margin-bottom: 8px;">${data.weakestArea.dimension}</div>
                      <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; background-color: ${weakestColours.bg}; color: ${weakestColours.text};">
                        ${data.weakestArea.maturityLevel}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              ${industrySection}

              <!-- Recommendations -->
              ${data.recommendations.length > 0 ? `
              <table role="presentation" style="width: 100%; margin-bottom: 32px; border-collapse: collapse;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #12161D;">Personalised Recommendations</h2>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      ${recommendationsList}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- Call to Action -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #12161D; border-radius: 12px; padding: 32px; text-align: center;">
                    <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 600; color: #7FB8A3;">Ready for Deeper Insights?</h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #ffffff; line-height: 1.6;">
                      Get detailed analysis across 95+ questions with AI-powered recommendations tailored to your organisation.
                    </p>
                    <a href="https://constancia.com/finance-compass" target="_blank" style="display: inline-block; padding: 16px 40px; background-color: #7FB8A3; color: #12161D; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Start Your Full Assessment
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    ${getEmailLogoHtml({ variant: "turquoise", marginBottom: 12, maxWidth: 120 })}
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
                      Finance Transformation & EPM Specialists
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">
                      <a href="mailto:info@constancia.io" style="color: #8E4F67; text-decoration: none;">info@constancia.io</a>
                      &nbsp;|&nbsp;
                      <a href="https://constancia.com" style="color: #8E4F67; text-decoration: none;">www.constancia.com</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #6b7280;">
                      © ${new Date().getFullYear()} Constancia Group. All rights reserved.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #6b7280;">
                      You received this email because you completed a Finance Readiness Assessment on our website.
                      <br>If you did not request this, please disregard this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================
// Widget Analytics Benchmarking Endpoints
// ============================================

// Label helper functions
function getIndustryLabel(value: string): string {
  const labels: Record<string, string> = {
    financial_services: "Financial Services & Banking",
    insurance: "Insurance",
    healthcare: "Healthcare & Life Sciences",
    manufacturing: "Manufacturing",
    retail: "Retail & Consumer Goods",
    technology: "Technology & Software",
    energy: "Energy & Utilities",
    professional_services: "Professional Services",
    public_sector: "Public Sector & Government",
    real_estate: "Real Estate & Construction",
    telecommunications: "Telecommunications",
    transport_logistics: "Transport & Logistics",
    other: "Other",
  };
  return labels[value] || value;
}

function getCompanySizeLabel(value: string): string {
  const labels: Record<string, string> = {
    "1_50": "1-50 employees",
    "51_200": "51-200 employees",
    "201_500": "201-500 employees",
    "501_1000": "501-1,000 employees",
    "1001_5000": "1,001-5,000 employees",
    "5001_10000": "5,001-10,000 employees",
    "10001_plus": "10,000+ employees",
  };
  return labels[value] || value;
}

function getConfidenceLevel(sampleSize: number): "High" | "Medium" | "Low" | "Very Low" {
  if (sampleSize >= 100) return "High";
  if (sampleSize >= 30) return "Medium";
  if (sampleSize >= 10) return "Low";
  return "Very Low";
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// In-memory cache for benchmarks (30 minute TTL)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const benchmarkCache: { 
  widgetBenchmarks?: CacheEntry<any>; 
  dimensionAnalysis?: CacheEntry<any>; 
} = {};

function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// GET /api/analytics/widget-benchmarks
router.get("/widget-benchmarks", async (req: Request, res: Response) => {
  try {
    // Check cache first
    if (isCacheValid(benchmarkCache.widgetBenchmarks)) {
      return res.json({
        success: true,
        data: benchmarkCache.widgetBenchmarks.data,
      });
    }

    // Fetch all relevant events for processing (excluding admin IPs)
    const allEventsRaw = await db.select()
      .from(widgetAnalytics)
      .where(sql`${widgetAnalytics.eventType} IN ('qualification_completed', 'preview_completed', 'cta_clicked', 'widget_started')`);
    
    const allEvents = excludeAdminIPsFilter(allEventsRaw);

    // Group events by session
    const sessionData: Map<string, {
      industry?: string;
      companySize?: string;
      finalScore?: number;
      hasQualification: boolean;
      hasCompletion: boolean;
      hasCtaClick: boolean;
    }> = new Map();

    for (const event of allEvents) {
      const sessionId = event.sessionId;
      if (!sessionId) continue;

      if (!sessionData.has(sessionId)) {
        sessionData.set(sessionId, {
          hasQualification: false,
          hasCompletion: false,
          hasCtaClick: false,
        });
      }

      const session = sessionData.get(sessionId)!;

      if (event.eventType === "qualification_completed" && event.qualificationData) {
        session.hasQualification = true;
        const qualData = event.qualificationData as Record<string, string>;
        session.industry = qualData.industry;
        session.companySize = qualData.companySize;
      }

      if (event.eventType === "preview_completed") {
        session.hasCompletion = true;
        if (event.finalScore !== null) {
          session.finalScore = event.finalScore;
        }
      }

      if (event.eventType === "cta_clicked") {
        session.hasCtaClick = true;
      }
    }

    // Aggregate by industry
    const industryStats: Map<string, {
      totalSessions: number;
      completedSessions: number;
      ctaClicks: number;
      scores: number[];
    }> = new Map();

    // Aggregate by company size
    const companySizeStats: Map<string, {
      totalSessions: number;
      ctaClicks: number;
      scores: number[];
    }> = new Map();

    // Overall stats
    let totalSessions = 0;
    let totalCompletions = 0;
    let totalCtaClicks = 0;
    const allScores: number[] = [];

    sessionData.forEach((session) => {
      totalSessions++;
      if (session.hasCompletion) totalCompletions++;
      if (session.hasCtaClick) totalCtaClicks++;
      if (session.finalScore !== undefined) allScores.push(session.finalScore);

      // Industry aggregation
      if (session.industry) {
        if (!industryStats.has(session.industry)) {
          industryStats.set(session.industry, {
            totalSessions: 0,
            completedSessions: 0,
            ctaClicks: 0,
            scores: [],
          });
        }
        const stats = industryStats.get(session.industry)!;
        stats.totalSessions++;
        if (session.hasCompletion) stats.completedSessions++;
        if (session.hasCtaClick) stats.ctaClicks++;
        if (session.finalScore !== undefined) stats.scores.push(session.finalScore);
      }

      // Company size aggregation
      if (session.companySize) {
        if (!companySizeStats.has(session.companySize)) {
          companySizeStats.set(session.companySize, {
            totalSessions: 0,
            ctaClicks: 0,
            scores: [],
          });
        }
        const stats = companySizeStats.get(session.companySize)!;
        stats.totalSessions++;
        if (session.hasCtaClick) stats.ctaClicks++;
        if (session.finalScore !== undefined) stats.scores.push(session.finalScore);
      }
    });

    // Build response
    const byIndustry = Array.from(industryStats.entries()).map(([industry, stats]) => ({
      industry,
      industryLabel: getIndustryLabel(industry),
      totalSessions: stats.totalSessions,
      completedSessions: stats.completedSessions,
      completionRate: stats.totalSessions > 0 
        ? Math.round((stats.completedSessions / stats.totalSessions) * 100) 
        : 0,
      ctaClicks: stats.ctaClicks,
      ctr: stats.completedSessions > 0 
        ? Math.round((stats.ctaClicks / stats.completedSessions) * 100) 
        : 0,
      avgFinalScore: stats.scores.length > 0 
        ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) 
        : 0,
      medianScore: Math.round(calculateMedian(stats.scores)),
      sampleSize: stats.scores.length,
      confidenceLevel: getConfidenceLevel(stats.scores.length),
    }));

    const byCompanySize = Array.from(companySizeStats.entries()).map(([companySize, stats]) => ({
      companySize,
      companySizeLabel: getCompanySizeLabel(companySize),
      totalSessions: stats.totalSessions,
      avgFinalScore: stats.scores.length > 0 
        ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) 
        : 0,
      ctr: stats.totalSessions > 0 
        ? Math.round((stats.ctaClicks / stats.totalSessions) * 100) 
        : 0,
      sampleSize: stats.scores.length,
    }));

    const responseData = {
      byIndustry,
      byCompanySize,
      overall: {
        totalSessions,
        totalCompletions,
        overallCompletionRate: totalSessions > 0 
          ? Math.round((totalCompletions / totalSessions) * 100) 
          : 0,
        overallCtr: totalCompletions > 0 
          ? Math.round((totalCtaClicks / totalCompletions) * 100) 
          : 0,
        avgScore: allScores.length > 0 
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) 
          : 0,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    benchmarkCache.widgetBenchmarks = {
      data: responseData,
      timestamp: Date.now(),
    };

    log.info({ industries: byIndustry.length, companySizes: byCompanySize.length, totalSessions }, "Widget benchmarks computed");

    res.json({ success: true, data: responseData });
  } catch (error) {
    log.error({ err: error }, "Error fetching widget benchmarks");
    res.status(500).json({ success: false, error: "Failed to fetch benchmarks" });
  }
});

// GET /api/analytics/widget-dimension-analysis
router.get("/widget-dimension-analysis", async (req: Request, res: Response) => {
  try {
    // Check cache first
    if (isCacheValid(benchmarkCache.dimensionAnalysis)) {
      return res.json({
        success: true,
        data: benchmarkCache.dimensionAnalysis.data,
      });
    }

    // Fetch question answered events and qualification data (excluding admin IPs)
    const questionEventsRaw = await db.select()
      .from(widgetAnalytics)
      .where(eq(widgetAnalytics.eventType, "question_answered"));

    const qualificationEventsRaw = await db.select()
      .from(widgetAnalytics)
      .where(eq(widgetAnalytics.eventType, "qualification_completed"));
    
    const questionEvents = excludeAdminIPsFilter(questionEventsRaw);
    const qualificationEvents = excludeAdminIPsFilter(qualificationEventsRaw);

    // Map sessions to their industry
    const sessionIndustry: Map<string, string> = new Map();
    for (const event of qualificationEvents) {
      if (event.sessionId && event.qualificationData) {
        const qualData = event.qualificationData as Record<string, string>;
        if (qualData.industry) {
          sessionIndustry.set(event.sessionId, qualData.industry);
        }
      }
    }

    // Aggregate by dimension
    const dimensionStats: Map<string, {
      dimensionKey: string;
      scores: number[];
      distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    }> = new Map();

    // Aggregate by industry + dimension
    const industryDimensionStats: Map<string, {
      industry: string;
      dimension: string;
      scores: number[];
    }> = new Map();

    // Track question funnel
    const questionSessions: Map<number, Set<string>> = new Map();

    for (const event of questionEvents) {
      const dimension = event.dimension;
      const dimensionKey = (event.metadata as Record<string, any>)?.dimensionKey || event.dimension?.toLowerCase().replace(/\s+/g, '_') || '';
      const score = event.answerValue;
      const sessionId = event.sessionId;
      const questionNumber = event.questionNumber;

      // Track funnel
      if (questionNumber && sessionId) {
        if (!questionSessions.has(questionNumber)) {
          questionSessions.set(questionNumber, new Set());
        }
        questionSessions.get(questionNumber)!.add(sessionId);
      }

      if (!dimension || score === null || score === undefined) continue;

      // Dimension stats
      if (!dimensionStats.has(dimension)) {
        dimensionStats.set(dimension, {
          dimensionKey,
          scores: [],
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
      }
      const dimStats = dimensionStats.get(dimension)!;
      dimStats.scores.push(score);
      const scoreKey = Math.min(5, Math.max(1, Math.round(score))) as 1 | 2 | 3 | 4 | 5;
      dimStats.distribution[scoreKey]++;

      // Industry + dimension cross-reference
      if (sessionId && sessionIndustry.has(sessionId)) {
        const industry = sessionIndustry.get(sessionId)!;
        const key = `${industry}:${dimension}`;
        if (!industryDimensionStats.has(key)) {
          industryDimensionStats.set(key, {
            industry,
            dimension,
            scores: [],
          });
        }
        industryDimensionStats.get(key)!.scores.push(score);
      }
    }

    // Build dimensions response
    const dimensions = Array.from(dimensionStats.entries()).map(([dimension, stats]) => {
      const totalResponses = stats.scores.length;
      const struggling = stats.distribution[1] + stats.distribution[2];
      const mature = stats.distribution[4] + stats.distribution[5];

      return {
        dimension,
        dimensionKey: stats.dimensionKey,
        avgScore: totalResponses > 0 
          ? Math.round((stats.scores.reduce((a, b) => a + b, 0) / totalResponses) * 10) / 10 
          : 0,
        responseCount: totalResponses,
        pctStruggling: totalResponses > 0 
          ? Math.round((struggling / totalResponses) * 100) 
          : 0,
        pctMature: totalResponses > 0 
          ? Math.round((mature / totalResponses) * 100) 
          : 0,
        scoreDistribution: {
          score1: stats.distribution[1],
          score2: stats.distribution[2],
          score3: stats.distribution[3],
          score4: stats.distribution[4],
          score5: stats.distribution[5],
        },
      };
    });

    // Build industry-dimension cross-reference
    const byIndustryDimension = Array.from(industryDimensionStats.values()).map((stats) => ({
      industry: stats.industry,
      dimension: stats.dimension,
      avgScore: stats.scores.length > 0 
        ? Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 10) / 10 
        : 0,
      sampleSize: stats.scores.length,
    }));

    // Build funnel analysis
    const sortedQuestions = Array.from(questionSessions.entries())
      .sort(([a], [b]) => a - b);
    
    const questionDropoff = sortedQuestions.map(([questionNumber, sessions], idx) => {
      const sessionsAtQuestion = sessions.size;
      const prevSessions = idx > 0 ? sortedQuestions[idx - 1][1].size : sessionsAtQuestion;
      const dropoffRate = prevSessions > 0 
        ? Math.round(((prevSessions - sessionsAtQuestion) / prevSessions) * 100) 
        : 0;

      return {
        questionNumber,
        sessionsAtQuestion,
        dropoffRate: Math.max(0, dropoffRate),
      };
    });

    const responseData = {
      dimensions,
      byIndustryDimension,
      funnelAnalysis: {
        questionDropoff,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    benchmarkCache.dimensionAnalysis = {
      data: responseData,
      timestamp: Date.now(),
    };

    log.info({ dimensions: dimensions.length, industryDimensionCombos: byIndustryDimension.length, funnelSteps: questionDropoff.length }, "Widget dimension analysis computed");

    res.json({ success: true, data: responseData });
  } catch (error) {
    log.error({ err: error }, "Error fetching widget dimension analysis");
    res.status(500).json({ success: false, error: "Failed to fetch dimension analysis" });
  }
});

// A/B Test API Endpoints

const createAbTestSchema = z.object({
  testName: z.string().min(1).max(100),
  testDescription: z.string().optional(),
  variants: z.array(abTestVariantSchema).min(2),
  targetWidget: z.string().max(50).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const updateAbTestSchema = z.object({
  isActive: z.boolean().optional(),
  testDescription: z.string().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

// GET /api/analytics/ab-tests - List all A/B tests with basic stats
router.get("/ab-tests", async (req: Request, res: Response) => {
  try {
    const tests = await db.select().from(widgetAbTests).orderBy(desc(widgetAbTests.createdAt));

    // Get basic stats for each test (excluding admin IPs)
    const testsWithStats = await Promise.all(tests.map(async (test) => {
      const eventsRaw = await db.select()
        .from(widgetAnalytics)
        .where(
          and(
            sql`${widgetAnalytics.metadata}->>'abTestId' = ${test.id.toString()}`,
            eq(widgetAnalytics.eventType, "widget_loaded")
          )
        );
      
      const events = excludeAdminIPsFilter(eventsRaw);

      const variantCounts: Record<string, number> = {};
      test.variants.forEach(v => { variantCounts[v.id] = 0; });
      
      events.forEach(e => {
        const variant = (e.metadata as any)?.abVariant;
        if (variant && variantCounts[variant] !== undefined) {
          variantCounts[variant]++;
        }
      });

      return {
        ...test,
        stats: {
          totalSessions: events.length,
          variantDistribution: variantCounts,
        },
      };
    }));

    res.json({ success: true, data: testsWithStats });
  } catch (error) {
    log.error({ err: error }, "Error fetching A/B tests");
    res.status(500).json({ success: false, error: "Failed to fetch A/B tests" });
  }
});

// POST /api/analytics/ab-tests - Create a new A/B test
router.post("/ab-tests", async (req: Request, res: Response) => {
  try {
    const parsed = createAbTestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid request data",
        details: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
      });
    }

    const { testName, testDescription, variants, targetWidget, startDate, endDate } = parsed.data;

    // Validate weights sum to 100
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      return res.status(400).json({ 
        success: false, 
        error: `Variant weights must sum to 100, got ${totalWeight}`,
      });
    }

    const [newTest] = await db.insert(widgetAbTests).values({
      testName,
      testDescription: testDescription || null,
      variants,
      targetWidget: targetWidget || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    }).returning();

    log.info({ testName, id: newTest.id, variantCount: variants.length }, "A/B test created");

    res.status(201).json({ success: true, data: newTest });
  } catch (error) {
    log.error({ err: error }, "Error creating A/B test");
    res.status(500).json({ success: false, error: "Failed to create A/B test" });
  }
});

// PATCH /api/analytics/ab-tests/:id - Update an A/B test
router.patch("/ab-tests/:id", async (req: Request, res: Response) => {
  try {
    const testId = parseInt(req.params.id, 10);
    if (isNaN(testId)) {
      return res.status(400).json({ success: false, error: "Invalid test ID" });
    }

    const parsed = updateAbTestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid request data",
        details: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
      });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
    if (parsed.data.testDescription !== undefined) updates.testDescription = parsed.data.testDescription;
    if (parsed.data.startDate !== undefined) {
      updates.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    }
    if (parsed.data.endDate !== undefined) {
      updates.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
    }

    const [updatedTest] = await db.update(widgetAbTests)
      .set(updates)
      .where(eq(widgetAbTests.id, testId))
      .returning();

    if (!updatedTest) {
      return res.status(404).json({ success: false, error: "A/B test not found" });
    }

    log.info({ testName: updatedTest.testName, id: testId, updates: Object.keys(updates) }, "A/B test updated");

    res.json({ success: true, data: updatedTest });
  } catch (error) {
    log.error({ err: error }, "Error updating A/B test");
    res.status(500).json({ success: false, error: "Failed to update A/B test" });
  }
});

// GET /api/analytics/ab-tests/:id/results - Get detailed results for a test
router.get("/ab-tests/:id/results", async (req: Request, res: Response) => {
  try {
    const testId = parseInt(req.params.id, 10);
    if (isNaN(testId)) {
      return res.status(400).json({ success: false, error: "Invalid test ID" });
    }

    const [test] = await db.select().from(widgetAbTests).where(eq(widgetAbTests.id, testId));
    if (!test) {
      return res.status(404).json({ success: false, error: "A/B test not found" });
    }

    // Fetch all events for this test (excluding admin IPs)
    const allEventsRaw = await db.select()
      .from(widgetAnalytics)
      .where(sql`${widgetAnalytics.metadata}->>'abTestId' = ${testId.toString()}`);
    
    const allEvents = excludeAdminIPsFilter(allEventsRaw);

    // Group events by variant
    const variantStats: Record<string, {
      sessions: Set<string>;
      completions: number;
      ctaClicks: number;
      scores: number[];
    }> = {};

    // Initialise stats for each variant
    test.variants.forEach(v => {
      variantStats[v.id] = {
        sessions: new Set(),
        completions: 0,
        ctaClicks: 0,
        scores: [],
      };
    });

    // Process events
    allEvents.forEach(event => {
      const variant = (event.metadata as any)?.abVariant;
      if (!variant || !variantStats[variant]) return;

      const stats = variantStats[variant];
      if (event.sessionId) stats.sessions.add(event.sessionId);

      switch (event.eventType) {
        case "preview_completed":
          stats.completions++;
          if (event.finalScore !== null) stats.scores.push(event.finalScore);
          break;
        case "cta_clicked":
          stats.ctaClicks++;
          break;
      }
    });

    // Calculate results per variant
    const results = test.variants.map(variant => {
      const stats = variantStats[variant.id];
      const sessionCount = stats.sessions.size;
      const avgScore = stats.scores.length > 0
        ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length * 10) / 10
        : null;

      return {
        variantId: variant.id,
        variantName: variant.name,
        weight: variant.weight,
        sessionCount,
        completions: stats.completions,
        completionRate: sessionCount > 0 ? Math.round((stats.completions / sessionCount) * 100 * 10) / 10 : 0,
        ctaClicks: stats.ctaClicks,
        ctr: sessionCount > 0 ? Math.round((stats.ctaClicks / sessionCount) * 100 * 10) / 10 : 0,
        avgScore,
      };
    });

    // Calculate statistical significance (simple chi-squared test)
    const totalSessions = results.reduce((sum, r) => sum + r.sessionCount, 0);
    const totalCompletions = results.reduce((sum, r) => sum + r.completions, 0);
    
    let chiSquared = 0;
    if (totalSessions > 0 && totalCompletions > 0) {
      const expectedRate = totalCompletions / totalSessions;
      
      results.forEach(r => {
        if (r.sessionCount > 0) {
          const expected = r.sessionCount * expectedRate;
          const observedDiff = r.completions - expected;
          chiSquared += (observedDiff * observedDiff) / expected;
        }
      });
    }

    // Degrees of freedom = number of variants - 1
    const df = results.length - 1;
    
    // Critical values for chi-squared (simplified lookup)
    const criticalValues: Record<number, number> = {
      1: 3.841,  // 95% confidence
      2: 5.991,
      3: 7.815,
      4: 9.488,
    };
    
    const criticalValue = criticalValues[df] || 3.841;
    const isSignificant = chiSquared > criticalValue;
    const confidenceLevel = isSignificant ? 95 : null;

    res.json({
      success: true,
      data: {
        test: {
          id: test.id,
          testName: test.testName,
          testDescription: test.testDescription,
          isActive: test.isActive,
          startDate: test.startDate,
          endDate: test.endDate,
          createdAt: test.createdAt,
        },
        results,
        statistics: {
          totalSessions,
          totalCompletions,
          overallCompletionRate: totalSessions > 0 ? Math.round((totalCompletions / totalSessions) * 100 * 10) / 10 : 0,
          chiSquared: Math.round(chiSquared * 100) / 100,
          degreesOfFreedom: df,
          isStatisticallySignificant: isSignificant,
          confidenceLevel,
          recommendation: isSignificant 
            ? "Results are statistically significant. Consider implementing the winning variant."
            : "Results are not yet statistically significant. Continue collecting data for more reliable conclusions.",
        },
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Error fetching A/B test results");
    res.status(500).json({ success: false, error: "Failed to fetch A/B test results" });
  }
});

// GET /api/analytics/ab-tests/active - Get active tests for a widget
router.get("/ab-tests/active", async (req: Request, res: Response) => {
  try {
    const widget = req.query.widget as string || "instant_preview";
    const now = new Date();

    const activeTests = await db.select()
      .from(widgetAbTests)
      .where(
        and(
          eq(widgetAbTests.isActive, true),
          sql`(${widgetAbTests.targetWidget} IS NULL OR ${widgetAbTests.targetWidget} = ${widget})`,
          sql`(${widgetAbTests.startDate} IS NULL OR ${widgetAbTests.startDate} <= ${now})`,
          sql`(${widgetAbTests.endDate} IS NULL OR ${widgetAbTests.endDate} >= ${now})`
        )
      )
      .orderBy(desc(widgetAbTests.createdAt));

    res.json({ success: true, data: activeTests });
  } catch (error) {
    log.error({ err: error }, "Error fetching active A/B tests");
    res.status(500).json({ success: false, error: "Failed to fetch active A/B tests" });
  }
});

router.post("/widget-email-results", async (req: Request, res: Response) => {
  try {
    const parsed = widgetEmailResultsSchema.safeParse(req.body);
    
    if (!parsed.success) {
      log.error({ errors: parsed.error.errors }, "Widget email validation error");
      return res.status(400).json({ 
        success: false, 
        error: "Invalid request data",
        details: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
      });
    }

    const data = parsed.data;

    if (!isEmailConfigured()) {
      log.warn("Email not configured - cannot send widget results email");
      return res.status(503).json({ 
        success: false, 
        error: "Email service not configured" 
      });
    }

    const htmlContent = buildWidgetResultsEmailHtml(data);
    const subject = `Your Finance Readiness Score: ${data.score}% - ${data.maturityLevel} | Constancia`;

    // Save email HTML for debugging/inspection
    const fs = await import("fs");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const debugPath = `/tmp/email_debug_${timestamp}.html`;
    fs.writeFileSync(debugPath, htmlContent);
    log.debug({ debugPath }, "Email HTML saved for debugging");

    await sendEmail({
      to: data.email,
      subject,
      htmlContent,
    });

    // Record analytics event (unless from excluded IP)
    const clientIP = getClientIP(req);
    if (!isExcludedIP(clientIP)) {
      await db.insert(widgetAnalytics).values({
        widget: "instant_preview",
        eventType: "email_results_sent",
        sessionId: data.sessionId,
        finalScore: data.score,
        qualificationData: data.qualificationData || null,
        metadata: {
          email: data.email,
          maturityLevel: data.maturityLevel,
          strongestArea: data.strongestArea.dimension,
          weakestArea: data.weakestArea.dimension,
          recommendationsCount: data.recommendations.length,
        },
        userAgent: req.headers["user-agent"],
        ipAddress: clientIP,
      });
    }

    log.info({ sessionId: data.sessionId, email: data.email.substring(0, 3) + "***", score: data.score, maturityLevel: data.maturityLevel }, "Widget results email sent");

    // Send lead notification email to Constancia team (non-blocking)
    sendWidgetLeadNotification({
      email: data.email,
      sessionId: data.sessionId,
      score: data.score,
      maturityLevel: data.maturityLevel,
      qualificationData: data.qualificationData || {},
      strongestArea: data.strongestArea,
      weakestArea: data.weakestArea,
      recommendations: data.recommendations,
    }).catch(err => {
      log.error({ err }, "Failed to send lead notification (non-blocking)");
    });

    res.json({ success: true, message: "Results email sent successfully" });
  } catch (error) {
    log.error({ err: error }, "Error sending widget results email");
    res.status(500).json({ 
      success: false, 
      error: "Failed to send results email" 
    });
  }
});

// ============================================================================
// FULL-FUNNEL ANALYTICS ENDPOINTS
// ============================================================================

const pageEventSchema = z.object({
  eventType: z.string(),
  page: z.string(),
  sessionId: z.string(),
  visitorId: z.string().optional(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  deviceType: z.string().optional(),
  browser: z.string().optional(),
  screenWidth: z.number().optional(),
  scrollDepth: z.number().optional(),
  milestone: z.number().optional(),
  dwellTimeMs: z.number().optional(),
  timeToEventMs: z.number().optional(),
  questionNumber: z.number().optional(),
  assessmentId: z.string().optional(),
  previousScore: z.number().optional(),
  currentScore: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/analytics/page-event - Capture page/funnel events
router.post("/page-event", async (req: Request, res: Response) => {
  try {
    const clientIP = getClientIP(req);
    
    // Exclude admin IPs from tracking
    if (isExcludedIP(clientIP)) {
      return res.json({ success: true, excluded: true });
    }
    
    const data = pageEventSchema.parse(req.body);

    // Canonicalise legacy event names on write so the table converges on
    // a single vocabulary; categorise so dashboards can group cheaply.
    const canonical = canonicalEvent(data.eventType);
    const category = categoryForEvent(canonical) ?? null;

    await db.insert(pageAnalytics).values({
      eventType: canonical,
      eventCategory: category,
      page: data.page,
      sessionId: data.sessionId,
      visitorId: data.visitorId,
      referrer: data.referrer,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmContent: data.utmContent,
      deviceType: data.deviceType,
      browser: data.browser,
      screenWidth: data.screenWidth,
      scrollDepth: data.scrollDepth,
      milestone: data.milestone,
      dwellTimeMs: data.dwellTimeMs,
      timeToEventMs: data.timeToEventMs,
      questionNumber: data.questionNumber,
      assessmentId: data.assessmentId,
      previousScore: data.previousScore,
      currentScore: data.currentScore,
      metadata: data.metadata,
      userAgent: req.headers["user-agent"],
      ipAddress: clientIP,
      ipHash: hashIp(clientIP),
    });
    
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error capturing page event");
    res.status(500).json({ success: false, error: "Failed to capture event" });
  }
});

// GET /api/analytics/funnel-stats - DB-backed funnel computation
//
// Stages are read from the funnel_stages table (seeded from
// shared/analytics-taxonomy.ts on first boot). Event-type matching
// canonicalises legacy aliases so historic rows still count. Both
// stepwise and cumulative conversion rates are returned; low-N
// stages are marked low-confidence rather than silently shown.
router.get("/funnel-stats", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const mode: ConversionMode =
      req.query.mode === CONVERSION_MODE.CUMULATIVE
        ? CONVERSION_MODE.CUMULATIVE
        : CONVERSION_MODE.STEPWISE;
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const funnel = await computeFunnel({
      windowStart,
      windowEnd,
      conversionMode: mode,
      filter: {
        deviceType: typeof req.query.device === "string" ? req.query.device : undefined,
        utmSource: typeof req.query.source === "string" ? req.query.source : undefined,
      },
    });

    // Build device + source breakdowns from the raw window (cheap second
    // query, only needed when the user is on the segmentation tab).
    const events = await db
      .select({
        deviceType: pageAnalytics.deviceType,
        utmSource: pageAnalytics.utmSource,
        referrer: pageAnalytics.referrer,
        eventType: pageAnalytics.eventType,
        sessionId: pageAnalytics.sessionId,
      })
      .from(pageAnalytics)
      .where(and(gte(pageAnalytics.createdAt, windowStart), lte(pageAnalytics.createdAt, windowEnd)));

    const filteredEvents = excludeAdminIPsFilter(events as any);

    type SegmentAgg = { sessions: Set<string>; completed: Set<string> };
    const completionEvents = new Set<string>([
      ANALYTICS_EVENTS.ASSESSMENT_COMPLETED,
      ANALYTICS_EVENTS.PREVIEW_COMPLETED,
      ANALYTICS_EVENTS.WIDGET_COMPLETED,
    ]);

    const deviceAgg = new Map<string, SegmentAgg>();
    const sourceAgg = new Map<string, SegmentAgg>();

    for (const event of filteredEvents) {
      const device = event.deviceType || "unknown";
      const source = event.utmSource || (event.referrer ? "organic" : "direct");
      const canonical = canonicalEvent(event.eventType);
      const isCompletion = completionEvents.has(canonical as never);

      let d = deviceAgg.get(device);
      if (!d) {
        d = { sessions: new Set(), completed: new Set() };
        deviceAgg.set(device, d);
      }
      d.sessions.add(event.sessionId);
      if (isCompletion) d.completed.add(event.sessionId);

      let s = sourceAgg.get(source);
      if (!s) {
        s = { sessions: new Set(), completed: new Set() };
        sourceAgg.set(source, s);
      }
      s.sessions.add(event.sessionId);
      if (isCompletion) s.completed.add(event.sessionId);
    }

    const deviceBreakdown = Array.from(deviceAgg.entries()).map(([device, agg]) => ({
      device,
      count: agg.sessions.size,
      completed: agg.completed.size,
      completionRate: agg.sessions.size > 0 ? Math.round((agg.completed.size / agg.sessions.size) * 100) : 0,
    }));
    const sourceBreakdown = Array.from(sourceAgg.entries()).map(([source, agg]) => ({
      source,
      count: agg.sessions.size,
      completed: agg.completed.size,
      completionRate: agg.sessions.size > 0 ? Math.round((agg.completed.size / agg.sessions.size) * 100) : 0,
    }));

    res.json({
      success: true,
      period: { days, startDate: windowStart.toISOString(), endDate: windowEnd.toISOString() },
      conversionMode: mode,
      totalSessions: funnel.totalSessions,
      totalEvents: funnel.totalEvents,
      funnel: funnel.stages,
      biggestDropOffs: funnel.biggestDropOffs,
      deviceBreakdown,
      sourceBreakdown,
    });
  } catch (error) {
    log.error({ err: error }, "Error getting funnel stats");
    res.status(500).json({ success: false, error: "Failed to get funnel stats" });
  }
});

// GET /api/analytics/insights - Ranked insights for the dashboard.
//
// Reads from the analytics_insights cache (refreshed by the nightly
// job). When ?refresh=1 is passed, regenerates first — useful from
// the admin "refresh" button.
router.get("/insights", async (req: Request, res: Response) => {
  try {
    if (req.query.refresh === "1") {
      await refreshInsightCache();
    }
    const rows = await db
      .select()
      .from(analyticsInsights)
      .where(isNull(analyticsInsights.dismissedAt))
      .orderBy(desc(analyticsInsights.generatedAt));

    const insights = rows
      .map(r => ({
        id: r.id,
        kind: r.kind,
        severity: r.severity,
        headline: r.headline,
        detail: r.detail,
        recommendedAction: r.recommendedAction,
        link: r.linkLabel && r.linkHref ? { label: r.linkLabel, href: r.linkHref } : undefined,
        metrics: r.metrics as Record<string, number | string>,
        generatedAt: r.generatedAt.toISOString(),
        windowStart: r.windowStart.toISOString(),
        windowEnd: r.windowEnd.toISOString(),
        acknowledged: !!r.acknowledgedAt,
      }))
      .sort(compareInsights as any);

    res.json({ success: true, insights });
  } catch (error) {
    log.error({ err: error }, "Error getting insights");
    res.status(500).json({ success: false, error: "Failed to get insights" });
  }
});

// POST /api/analytics/insights/:id/acknowledge - Mark an insight as seen.
router.post("/insights/:id/acknowledge", isAuthenticated, async (req: Request, res: Response) => {
  try {
    await db
      .update(analyticsInsights)
      .set({ acknowledgedAt: new Date(), acknowledgedBy: (req as any).user?.claims?.email ?? "unknown" })
      .where(eq(analyticsInsights.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error acknowledging insight");
    res.status(500).json({ success: false, error: "Failed" });
  }
});

// POST /api/analytics/insights/:id/dismiss - Hide an insight permanently.
router.post("/insights/:id/dismiss", isAuthenticated, async (req: Request, res: Response) => {
  try {
    await db
      .update(analyticsInsights)
      .set({ dismissedAt: new Date(), acknowledgedBy: (req as any).user?.claims?.email ?? "unknown" })
      .where(eq(analyticsInsights.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error dismissing insight");
    res.status(500).json({ success: false, error: "Failed" });
  }
});

// GET /api/analytics/funnel-targets - Get target configurations
router.get("/funnel-targets", async (req: Request, res: Response) => {
  try {
    const targets = await db.select().from(funnelTargets).orderBy(asc(funnelTargets.stageOrder));
    res.json({ success: true, targets });
  } catch (error) {
    log.error({ err: error }, "Error getting funnel targets");
    res.status(500).json({ success: false, error: "Failed to get targets" });
  }
});

// PUT /api/analytics/funnel-targets/:id - Update a target
router.put("/funnel-targets/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { targetPercentage, warningThreshold, isActive } = req.body;
    
    await db.update(funnelTargets)
      .set({
        targetPercentage: targetPercentage !== undefined ? targetPercentage : undefined,
        warningThreshold: warningThreshold !== undefined ? warningThreshold : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(funnelTargets.id, id));
    
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error updating funnel target");
    res.status(500).json({ success: false, error: "Failed to update target" });
  }
});

// GET /api/analytics/cohort-analysis - Get cohort data for time-based analysis
router.get("/cohort-analysis", async (req: Request, res: Response) => {
  try {
    const weeks = parseInt(req.query.weeks as string) || 8;
    const cohorts: Array<{
      week: string;
      weekStart: string;
      sessions: number;
      widgetComplete: number;
      assessmentStart: number;
      assessmentComplete: number;
      leadsCaptured: number;
      avgTimeToComplete: number | null;
    }> = [];
    
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      
      const events = await db.select()
        .from(pageAnalytics)
        .where(and(
          gte(pageAnalytics.createdAt, weekStart),
          lte(pageAnalytics.createdAt, weekEnd)
        ));
      
      const filtered = excludeAdminIPsFilter(events);
      const sessions = new Set(filtered.map(e => e.sessionId));
      
      const matchEvent = (event: typeof filtered[number], canonicals: Set<string>) =>
        canonicals.has(canonicalEvent(event.eventType));

      const widgetCompleteEvents = new Set<string>([
        ANALYTICS_EVENTS.WIDGET_COMPLETED,
        ANALYTICS_EVENTS.PREVIEW_COMPLETED,
      ]);
      const assessmentStartEvents = new Set<string>([
        ANALYTICS_EVENTS.ASSESSMENT_STARTED,
        ANALYTICS_EVENTS.ASSESSMENT_PAGE_VIEW,
      ]);
      const assessmentCompleteEvents = new Set<string>([
        ANALYTICS_EVENTS.ASSESSMENT_COMPLETED,
        ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_100,
      ]);
      const leadEvents = new Set<string>(LEAD_CAPTURE_EVENTS);

      const widgetComplete = new Set(filtered.filter(e => matchEvent(e, widgetCompleteEvents)).map(e => e.sessionId)).size;
      const assessmentStart = new Set(filtered.filter(e => matchEvent(e, assessmentStartEvents)).map(e => e.sessionId)).size;
      const assessmentComplete = new Set(filtered.filter(e => matchEvent(e, assessmentCompleteEvents)).map(e => e.sessionId)).size;
      const leadsCaptured = new Set(filtered.filter(e => matchEvent(e, leadEvents)).map(e => e.sessionId)).size;

      const completionTimes = filtered
        .filter(e => matchEvent(e, assessmentCompleteEvents) && e.dwellTimeMs)
        .map(e => e.dwellTimeMs!);
      
      const avgTimeToComplete = completionTimes.length > 0 
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / 1000)
        : null;
      
      cohorts.push({
        week: `Week ${i + 1}`,
        weekStart: weekStart.toISOString().split("T")[0],
        sessions: sessions.size,
        widgetComplete,
        assessmentStart,
        assessmentComplete,
        leadsCaptured,
        avgTimeToComplete,
      });
    }
    
    res.json({ success: true, cohorts: cohorts.reverse() });
  } catch (error) {
    log.error({ err: error }, "Error getting cohort analysis");
    res.status(500).json({ success: false, error: "Failed to get cohort analysis" });
  }
});

// GET /api/analytics/question-heatmap - Question-level drop-off + dwell.
//
// Fixed from the previous implementation:
//   - Each (sessionId, questionNumber) pair counts once. Re-edits no
//     longer inflate the answered count.
//   - Returns `sessionsReached` (denominator for survivorship-bias
//     awareness) so the UI can show "10% drop-off but only 12 people
//     ever got here" instead of treating it like a 1000-person signal.
//   - Marks `lowConfidence` when the denominator is below the sample
//     threshold; the UI greys these cells out rather than ranking by them.
//   - Uses canonical event names — legacy aliases still match because
//     of the canonicalisation step on insert.
router.get("/question-heatmap", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const events = await db
      .select({
        eventType: pageAnalytics.eventType,
        sessionId: pageAnalytics.sessionId,
        questionNumber: pageAnalytics.questionNumber,
        timeToEventMs: pageAnalytics.timeToEventMs,
      })
      .from(pageAnalytics)
      .where(and(
        gte(pageAnalytics.createdAt, windowStart),
        sql`${pageAnalytics.questionNumber} IS NOT NULL`,
      ))
      .orderBy(asc(pageAnalytics.questionNumber));

    const filtered = excludeAdminIPsFilter(events as any) as typeof events;

    // (sessionId, qNumber) dedup keys
    const answeredKey = new Set<string>();
    const abandonedKey = new Set<string>();
    const reachedKey = new Set<string>();

    const timesByQuestion = new Map<number, number[]>();

    for (const ev of filtered) {
      const qNum = ev.questionNumber!;
      const key = `${ev.sessionId}|${qNum}`;
      reachedKey.add(key);
      const canonical = canonicalEvent(ev.eventType);
      if (canonical === ANALYTICS_EVENTS.QUESTION_ANSWERED) {
        if (!answeredKey.has(key)) {
          answeredKey.add(key);
          if (ev.timeToEventMs && ev.timeToEventMs > 0) {
            const arr = timesByQuestion.get(qNum) ?? [];
            arr.push(ev.timeToEventMs);
            timesByQuestion.set(qNum, arr);
          }
        }
      } else if (
        canonical === ANALYTICS_EVENTS.QUESTION_ABANDONED ||
        canonical === ANALYTICS_EVENTS.ASSESSMENT_ABANDONED
      ) {
        abandonedKey.add(key);
      }
    }

    const perQuestion = new Map<number, { reached: number; answered: number; abandoned: number }>();
    const incr = (q: number, field: "reached" | "answered" | "abandoned") => {
      let agg = perQuestion.get(q);
      if (!agg) {
        agg = { reached: 0, answered: 0, abandoned: 0 };
        perQuestion.set(q, agg);
      }
      agg[field]++;
    };
    reachedKey.forEach(k => incr(Number(k.split("|")[1]), "reached"));
    answeredKey.forEach(k => incr(Number(k.split("|")[1]), "answered"));
    abandonedKey.forEach(k => incr(Number(k.split("|")[1]), "abandoned"));

    const { SAMPLE_SIZE } = await import("@shared/analytics-taxonomy");

    const heatmap = Array.from(perQuestion.entries()).map(([qNum, d]) => {
      const times = timesByQuestion.get(qNum) ?? [];
      const sortedTimes = [...times].sort((a, b) => a - b);
      const median = sortedTimes.length
        ? sortedTimes[Math.floor(sortedTimes.length / 2)]
        : null;
      const mean = sortedTimes.length
        ? Math.round(sortedTimes.reduce((a, c) => a + c, 0) / sortedTimes.length)
        : null;
      const denom = d.answered + d.abandoned;
      return {
        questionNumber: qNum,
        sessionsReached: d.reached,
        answered: d.answered,
        abandoned: d.abandoned,
        abandonmentRate: denom > 0 ? Math.round((d.abandoned / denom) * 1000) / 10 : 0,
        meanTimeSeconds: mean !== null ? Math.round(mean / 1000) : null,
        medianTimeSeconds: median !== null ? Math.round(median / 1000) : null,
        lowConfidence: d.reached < SAMPLE_SIZE.HEATMAP_MIN_N,
      };
    }).sort((a, b) => a.questionNumber - b.questionNumber);

    res.json({ success: true, heatmap });
  } catch (error) {
    log.error({ err: error }, "Error getting question heatmap");
    res.status(500).json({ success: false, error: "Failed to get question heatmap" });
  }
});

// GET /api/analytics/time-to-conversion - Time from first event to milestone.
//
// Fixed:
//   - Milestones matched against canonical event sets (not .includes()
//     substring — that was matching things like "assessment_progress_50"
//     against milestone "assessment_").
//   - Returns the count of sessions that DIDN'T reach each milestone
//     (`nonConverters`) alongside the timed sessions — the operator can
//     see right-censoring rather than thinking the data is "n converters
//     in 22s on average" without context.
//   - p95 alongside mean/median.
router.get("/time-to-conversion", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const events = await db.select()
      .from(pageAnalytics)
      .where(and(gte(pageAnalytics.createdAt, windowStart), lte(pageAnalytics.createdAt, windowEnd)))
      .orderBy(asc(pageAnalytics.createdAt));

    const filtered = excludeAdminIPsFilter(events as any) as typeof events;

    const sessionEvents: Record<string, typeof filtered> = {};
    for (const ev of filtered) {
      if (!sessionEvents[ev.sessionId]) sessionEvents[ev.sessionId] = [];
      sessionEvents[ev.sessionId].push(ev);
    }
    const totalSessions = Object.keys(sessionEvents).length;

    const milestones: Array<{ key: string; label: string; events: Set<string> }> = [
      {
        key: "widget_visible",
        label: "Time to widget visible",
        events: new Set([ANALYTICS_EVENTS.WIDGET_VISIBLE, ANALYTICS_EVENTS.WIDGET_LOADED]),
      },
      {
        key: "widget_completed",
        label: "Time to widget completed",
        events: new Set([ANALYTICS_EVENTS.WIDGET_COMPLETED, ANALYTICS_EVENTS.PREVIEW_COMPLETED]),
      },
      {
        key: "assessment_started",
        label: "Time to assessment started",
        events: new Set([ANALYTICS_EVENTS.ASSESSMENT_STARTED, ANALYTICS_EVENTS.ASSESSMENT_PAGE_VIEW]),
      },
      {
        key: "assessment_completed",
        label: "Time to assessment completed",
        events: new Set([ANALYTICS_EVENTS.ASSESSMENT_COMPLETED, ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_100]),
      },
      {
        key: "lead_captured",
        label: "Time to lead captured",
        events: new Set(LEAD_CAPTURE_EVENTS),
      },
    ];

    const timeMetrics = milestones.map(milestone => {
      const times: number[] = [];
      let nonConverters = 0;

      for (const evts of Object.values(sessionEvents)) {
        const sorted = evts.slice().sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        const firstEvent = sorted[0];
        const milestoneEvent = sorted.find(e => milestone.events.has(canonicalEvent(e.eventType) as never));
        if (!milestoneEvent) {
          nonConverters++;
          continue;
        }
        const dt = new Date(milestoneEvent.createdAt).getTime() - new Date(firstEvent.createdAt).getTime();
        if (dt > 0 && dt < 3600 * 1000 * 24) times.push(dt); // 24h cutoff
      }

      const sortedTimes = times.slice().sort((a, b) => a - b);
      const median = sortedTimes.length ? sortedTimes[Math.floor(sortedTimes.length / 2)] : null;
      const p95 = sortedTimes.length ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] : null;
      const mean = sortedTimes.length ? Math.round(sortedTimes.reduce((a, c) => a + c, 0) / sortedTimes.length) : null;

      return {
        milestone: milestone.key,
        label: milestone.label,
        converters: times.length,
        nonConverters,
        totalSessions,
        conversionRate: totalSessions > 0 ? Math.round((times.length / totalSessions) * 1000) / 10 : 0,
        meanSeconds: mean !== null ? Math.round(mean / 1000) : null,
        medianSeconds: median !== null ? Math.round(median / 1000) : null,
        p95Seconds: p95 !== null ? Math.round(p95 / 1000) : null,
      };
    });

    res.json({ success: true, metrics: timeMetrics });
  } catch (error) {
    log.error({ err: error }, "Error getting time to conversion");
    res.status(500).json({ success: false, error: "Failed to get time metrics" });
  }
});

// GET /api/analytics/trend-data - Daily totals for sparklines.
//
// Fixed: every metric is "unique sessions that did X today" — no more
// mixing raw event counts with deduplicated sessions in the same chart.
// One session that emits 10 widget_completed events counts once.
router.get("/trend-data", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const windowStart = new Date();
    windowStart.setUTCHours(0, 0, 0, 0);
    windowStart.setUTCDate(windowStart.getUTCDate() - days + 1);

    const events = await db
      .select({
        eventType: pageAnalytics.eventType,
        sessionId: pageAnalytics.sessionId,
        createdAt: pageAnalytics.createdAt,
      })
      .from(pageAnalytics)
      .where(gte(pageAnalytics.createdAt, windowStart))
      .orderBy(asc(pageAnalytics.createdAt));

    const filtered = excludeAdminIPsFilter(events as any) as typeof events;

    const dailyData: Record<string, {
      sessions: Set<string>;
      widgetCompleted: Set<string>;
      assessmentCompleted: Set<string>;
      leads: Set<string>;
    }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(windowStart);
      date.setUTCDate(date.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      dailyData[key] = {
        sessions: new Set(),
        widgetCompleted: new Set(),
        assessmentCompleted: new Set(),
        leads: new Set(),
      };
    }

    const widgetCompletionEvents = new Set<string>([
      ANALYTICS_EVENTS.WIDGET_COMPLETED,
      ANALYTICS_EVENTS.PREVIEW_COMPLETED,
    ]);
    const assessmentCompletionEvents = new Set<string>([
      ANALYTICS_EVENTS.ASSESSMENT_COMPLETED,
      ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_100,
    ]);
    const leadEvents = new Set<string>(LEAD_CAPTURE_EVENTS);

    for (const event of filtered) {
      const dateStr = new Date(event.createdAt).toISOString().slice(0, 10);
      const bucket = dailyData[dateStr];
      if (!bucket) continue;
      bucket.sessions.add(event.sessionId);
      const canonical = canonicalEvent(event.eventType);
      if (widgetCompletionEvents.has(canonical as never)) bucket.widgetCompleted.add(event.sessionId);
      if (assessmentCompletionEvents.has(canonical as never)) bucket.assessmentCompleted.add(event.sessionId);
      if (leadEvents.has(canonical as never)) bucket.leads.add(event.sessionId);
    }

    const trendData = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        sessions: data.sessions.size,
        widgetCompleted: data.widgetCompleted.size,
        assessmentCompleted: data.assessmentCompleted.size,
        leads: data.leads.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, trendData });
  } catch (error) {
    log.error({ err: error }, "Error getting trend data");
    res.status(500).json({ success: false, error: "Failed to get trend data" });
  }
});

// ============================================================================
// COMPARISON TOOLS ANALYTICS ENDPOINT
// ============================================================================

// GET /api/analytics/comparison-stats - Get aggregated stats for comparison tools
router.get("/comparison-stats", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const category = (req.query.category as string)?.toUpperCase() || "ALL";
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Build category filter based on parameter
    let categoryFilter;
    if (category === "EPM") {
      categoryFilter = sql`${widgetAnalytics.widget} LIKE 'epm_%'`;
    } else if (category === "ERP") {
      categoryFilter = sql`${widgetAnalytics.widget} LIKE 'erp_%'`;
    } else if (category === "AI") {
      categoryFilter = sql`${widgetAnalytics.widget} LIKE 'ai_%'`;
    } else {
      // Default: all comparison tools
      categoryFilter = sql`${widgetAnalytics.widget} LIKE '%_comparison%'`;
    }
    
    // Query comparison tool events with optional category filter
    const events = await db.select()
      .from(widgetAnalytics)
      .where(
        and(
          gte(widgetAnalytics.createdAt, startDate),
          categoryFilter
        )
      )
      .orderBy(desc(widgetAnalytics.createdAt));
    
    const filtered = excludeAdminIPsFilter(events);
    
    // Separate bots from humans (use is_bot flag)
    const flaggedBotEvents = filtered.filter(e => e.isBot === true);
    const unflaggedEvents = filtered.filter(e => e.isBot !== true);
    
    // Detect bot-like sessions based on session duration (< 20 seconds to complete is suspicious)
    const sessionTimestamps: Map<string, { first: Date; last: Date; hasCompletion: boolean }> = new Map();
    unflaggedEvents.forEach(e => {
      if (!e.sessionId) return;
      const ts = new Date(e.createdAt!);
      const hasCompletion = e.eventType === "results_viewed" || e.eventType === "export_initiated";
      
      if (!sessionTimestamps.has(e.sessionId)) {
        sessionTimestamps.set(e.sessionId, { first: ts, last: ts, hasCompletion });
      } else {
        const existing = sessionTimestamps.get(e.sessionId)!;
        if (ts < existing.first) existing.first = ts;
        if (ts > existing.last) existing.last = ts;
        if (hasCompletion) existing.hasCompletion = true;
      }
    });
    
    // Identify bot-like sessions using the centralised heuristics from
    // shared/analytics-taxonomy.ts. Anything below IMPOSSIBLE_COMPLETION_MS
    // is dropped as bot; SUSPICIOUSLY_FAST_MS is the soft warning band.
    const { BOT_HEURISTICS } = await import("@shared/analytics-taxonomy");
    const botLikeSessions = new Set<string>();
    sessionTimestamps.forEach((data, sessionId) => {
      const durationMs = data.last.getTime() - data.first.getTime();
      if (data.hasCompletion && durationMs < BOT_HEURISTICS.IMPOSSIBLE_COMPLETION_MS) {
        botLikeSessions.add(sessionId);
      }
    });
    
    // Filter out bot-like sessions from human events
    const humanEvents = unflaggedEvents.filter(e => !e.sessionId || !botLikeSessions.has(e.sessionId));
    const botEvents = [...flaggedBotEvents, ...unflaggedEvents.filter(e => e.sessionId && botLikeSessions.has(e.sessionId))];
    
    // Bot traffic summary (enhanced with more details)
    const uniqueBotSessions = new Set(botEvents.filter(e => e.sessionId).map(e => e.sessionId)).size;
    const uniqueHumanSessions = new Set(humanEvents.filter(e => e.sessionId).map(e => e.sessionId)).size;
    const totalUniqueSessions = new Set(filtered.filter(e => e.sessionId).map(e => e.sessionId)).size;
    const botLikeSessionCount = botLikeSessions.size;
    
    const botTrafficSummary = {
      totalBotEvents: botEvents.length,
      totalHumanEvents: humanEvents.length,
      uniqueBotSessions,
      uniqueHumanSessions,
      botLikeSessions: botLikeSessionCount,
      botEventPercentage: filtered.length > 0 
        ? Math.round((botEvents.length / filtered.length) * 100) 
        : 0,
      botSessionPercentage: totalUniqueSessions > 0
        ? Math.round((uniqueBotSessions / totalUniqueSessions) * 100)
        : 0,
      // Legacy field for backward compatibility
      botPercentage: filtered.length > 0 
        ? Math.round((botEvents.length / filtered.length) * 100) 
        : 0,
    };
    
    // Use human events for all analytics
    const analyticsEvents = humanEvents;
    
    // Usage by category (EPM, ERP, AI)
    const categoryUsage: Record<string, { sessions: Set<string>; events: number; completedSessions: Set<string> }> = {
      epm: { sessions: new Set(), events: 0, completedSessions: new Set() },
      erp: { sessions: new Set(), events: 0, completedSessions: new Set() },
      ai: { sessions: new Set(), events: 0, completedSessions: new Set() },
    };
    
    // Industry breakdown
    const industryBreakdown: Record<string, number> = {};
    
    // Cross-tabulations
    const industryByErp: Record<string, Record<string, number>> = {};
    const industryBySize: Record<string, Record<string, number>> = {};
    const industryByRevenue: Record<string, Record<string, number>> = {};
    const vendorsByIndustry: Record<string, Record<string, number>> = {};
    
    // Company size breakdown
    const companySizeBreakdown: Record<string, number> = {};
    
    // ERP landscape breakdown (what ERPs users currently have)
    const erpLandscapeBreakdown: Record<string, number> = {};
    
    // Revenue band breakdown
    const revenueBandBreakdown: Record<string, number> = {};
    
    // Preset selection tracking
    const presetSelections: Record<string, number> = {};
    const presetChanges: { from: string; to: string; count: number }[] = [];
    const sessionPresets: Map<string, string[]> = new Map(); // Track preset history per session
    
    // Outcomes - most recommended platforms
    const platformRecommendations: Record<string, number> = {};
    
    // Daily trends by category
    const dailyTrends: Record<string, { epm: number; erp: number; ai: number; total: number }> = {};
    
    // Initialize daily trends
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyTrends[dateStr] = { epm: 0, erp: 0, ai: 0, total: 0 };
    }
    
    // Unique sessions for deduplication - track each field separately
    const processedIndustry: Record<string, boolean> = {};
    const processedCompanySize: Record<string, boolean> = {};
    const processedErpLandscape: Record<string, boolean> = {};
    const processedRevenueBand: Record<string, boolean> = {};
    const processedPreset: Record<string, boolean> = {};
    
    // ========== NEW: Wizard Funnel Analysis ==========
    const funnelSteps = {
      industry_selected: new Set<string>(),
      preset_selected: new Set<string>(),
      profile_completed: new Set<string>(),
      results_viewed: new Set<string>(),
    };
    
    // ========== NEW: Export Tracking ==========
    const exportTracking = {
      formatBreakdown: { pdf: 0, excel: 0 },
      byCategory: { epm: 0, erp: 0, ai: 0 },
      vendorCombinations: new Map<string, number>(),
    };
    
    // ========== NEW: Weight Modification Patterns ==========
    const weightModifications: Record<string, { count: number; weights: number[] }> = {};
    
    // ========== NEW: Vendor Selection Analysis ==========
    const vendorSelections: Record<string, number> = {};
    const sessionVendors: Map<string, Set<string>> = new Map();
    
    // ========== NEW: Session Duration Tracking ==========
    const sessionStepTimestamps: Map<string, { step: string; timestamp: Date }[]> = new Map();
    const stepDurations: Record<string, number[]> = {};
    
    // Track sessions for cross-tabulations (deduplicate by session)
    const sessionProfiles: Map<string, { industry: string | null; size: string | null; erp: string | null; revenue: string | null; vendors: string[] }> = new Map();
    
    analyticsEvents.forEach(event => {
      const widget = event.widget || "";
      const sessionId = event.sessionId || "";
      const metadata = event.metadata as Record<string, any> | null;
      const dateStr = new Date(event.createdAt!).toISOString().split("T")[0];
      
      // Determine category from widget name
      let category = "";
      if (widget.includes("epm")) {
        category = "epm";
      } else if (widget.includes("erp")) {
        category = "erp";
      } else if (widget.includes("ai")) {
        category = "ai";
      }
      
      if (category && categoryUsage[category]) {
        categoryUsage[category].events++;
        if (sessionId) {
          categoryUsage[category].sessions.add(sessionId);
        }
        
        // Track completions as unique sessions (results_viewed indicates wizard completion)
        if (sessionId && (event.eventType === "results_viewed" || 
            event.eventType === "export_initiated")) {
          categoryUsage[category].completedSessions.add(sessionId);
        }
        
        // Update daily trends
        if (dailyTrends[dateStr]) {
          dailyTrends[dateStr][category as "epm" | "erp" | "ai"]++;
          dailyTrends[dateStr].total++;
        }
      }
      
      // Build session profiles for cross-tabulations
      if (sessionId) {
        if (!sessionProfiles.has(sessionId)) {
          sessionProfiles.set(sessionId, { industry: null, size: null, erp: null, revenue: null, vendors: [] });
        }
        const sessionProfile = sessionProfiles.get(sessionId)!;
        
        // Use dedicated columns first, fall back to metadata
        if (event.industry && !sessionProfile.industry) sessionProfile.industry = event.industry;
        if (event.sizeBand && !sessionProfile.size) sessionProfile.size = event.sizeBand;
        if (event.erpLandscape && !sessionProfile.erp) sessionProfile.erp = event.erpLandscape;
        if (event.revenueBand && !sessionProfile.revenue) sessionProfile.revenue = event.revenueBand;
        
        // Extract from metadata.profile (nested profile data from wizard)
        if (metadata) {
          const metaProfile = metadata.profile as Record<string, any> | undefined;
          
          // Industry from metadata (direct or nested)
          if (!sessionProfile.industry) {
            const ind = metadata.industry || metaProfile?.industry;
            if (ind && typeof ind === "string") sessionProfile.industry = ind;
          }
          
          // Company size from profile
          if (!sessionProfile.size) {
            const size = metaProfile?.companySize || metaProfile?.company_size || metadata.companySize;
            if (size && typeof size === "string") sessionProfile.size = size;
          }
          
          // ERP landscape from profile
          if (!sessionProfile.erp) {
            const erp = metaProfile?.erpLandscape || metaProfile?.erp_landscape || metadata.erpLandscape;
            if (erp && typeof erp === "string") sessionProfile.erp = erp;
          }
          
          // Revenue from profile
          if (!sessionProfile.revenue) {
            const rev = metaProfile?.revenue || metadata.revenue;
            if (rev && typeof rev === "string") sessionProfile.revenue = rev;
          }
        }
        
        // Collect vendors from topVendors column or metadata
        if (event.topVendors && Array.isArray(event.topVendors)) {
          event.topVendors.forEach((v: string) => {
            if (!sessionProfile.vendors.includes(v)) sessionProfile.vendors.push(v);
          });
        }
      }
      
      // Extract metadata fields - track each field separately per session for deduplication
      if (metadata && sessionId) {
        const sessionKey = `${sessionId}-${category}`;
        
        // Industry from metadata (check in any relevant event, not just first one)
        const industry = metadata.industry;
        if (industry && typeof industry === "string" && !processedIndustry[sessionKey]) {
          processedIndustry[sessionKey] = true;
          industryBreakdown[industry] = (industryBreakdown[industry] || 0) + 1;
        }
        
        // Profile data (companySize, erpLandscape) - can come from profile object or direct fields
        const profile = metadata.profile as Record<string, any> | undefined;
        
        // Company size - check both profile object and direct metadata field
        const companySize = profile?.companySize || profile?.company_size || metadata.companySize;
        if (companySize && typeof companySize === "string" && !processedCompanySize[sessionKey]) {
          processedCompanySize[sessionKey] = true;
          companySizeBreakdown[companySize] = (companySizeBreakdown[companySize] || 0) + 1;
        }
        
        // ERP landscape (current ERPs) - check both profile object and direct metadata field
        const erpLandscape = profile?.erpLandscape || profile?.erp_landscape || metadata.erpLandscape;
        if (!processedErpLandscape[sessionKey]) {
          if (Array.isArray(erpLandscape) && erpLandscape.length > 0) {
            processedErpLandscape[sessionKey] = true;
            erpLandscape.forEach((erp: string) => {
              if (erp && typeof erp === "string") {
                erpLandscapeBreakdown[erp] = (erpLandscapeBreakdown[erp] || 0) + 1;
              }
            });
          } else if (erpLandscape && typeof erpLandscape === "string") {
            processedErpLandscape[sessionKey] = true;
            erpLandscapeBreakdown[erpLandscape] = (erpLandscapeBreakdown[erpLandscape] || 0) + 1;
          }
        }
        
        // Revenue band - check profile object and direct metadata field
        const revenueBand = profile?.revenue || metadata.revenue || metadata.revenueBand;
        if (revenueBand && typeof revenueBand === "string" && !processedRevenueBand[sessionKey]) {
          processedRevenueBand[sessionKey] = true;
          revenueBandBreakdown[revenueBand] = (revenueBandBreakdown[revenueBand] || 0) + 1;
        }
        
        // Preset selection tracking
        const preset = metadata.preset || profile?.preset;
        if (preset && typeof preset === "string" && sessionId) {
          // Track preset history per session to detect changes
          if (!sessionPresets.has(sessionId)) {
            sessionPresets.set(sessionId, []);
          }
          const presetHistory = sessionPresets.get(sessionId)!;
          const lastPreset = presetHistory.length > 0 ? presetHistory[presetHistory.length - 1] : null;
          
          // Only count if this is a new preset for this session
          if (lastPreset !== preset) {
            presetHistory.push(preset);
            
            // Count initial selections (first preset in session)
            if (!processedPreset[sessionKey]) {
              processedPreset[sessionKey] = true;
              presetSelections[preset] = (presetSelections[preset] || 0) + 1;
            }
          }
        }
        
        // Track recommended platforms from results and exports
        // Include results_viewed and export_initiated events (comparison tools use these)
        if (event.eventType === "wizard_completed" || 
            event.eventType === "comparison_completed" ||
            event.eventType === "results_viewed" ||
            event.eventType === "export_initiated") {
          const selectedVendors = metadata.selectedVendors || metadata.topResults || metadata.recommendations;
          if (selectedVendors) {
            // Handle both array and object formats
            const vendorList = Array.isArray(selectedVendors) 
              ? selectedVendors 
              : Object.values(selectedVendors);
            vendorList.slice(0, 5).forEach((vendor: string, idx: number) => {
              if (vendor && typeof vendor === "string") {
                // Weight by position (1st place gets 5 points, 2nd gets 4, etc.)
                const weight = 5 - idx;
                platformRecommendations[vendor] = (platformRecommendations[vendor] || 0) + weight;
              }
            });
          }
        }
      }
      
      // ========== NEW ANALYTICS PROCESSING ==========
      
      // 1. Wizard Funnel Analysis - Track step progression
      if (sessionId && event.eventType === "wizard_step_changed") {
        const step = metadata?.step || metadata?.toStep;
        if (step === "industry" || metadata?.industry) {
          funnelSteps.industry_selected.add(sessionId);
        }
        if (step === "preset" || step === "preset-selection" || metadata?.preset) {
          funnelSteps.preset_selected.add(sessionId);
        }
        if (step === "profile" || step === "profile-completed" || metadata?.profile) {
          funnelSteps.profile_completed.add(sessionId);
        }
        if (step === "results" || step === "comparison" || step === "results-view") {
          funnelSteps.results_viewed.add(sessionId);
        }
        
        // Track timestamps for duration calculation
        if (!sessionStepTimestamps.has(sessionId)) {
          sessionStepTimestamps.set(sessionId, []);
        }
        if (step && event.createdAt) {
          sessionStepTimestamps.get(sessionId)!.push({
            step: step as string,
            timestamp: new Date(event.createdAt),
          });
        }
      }
      
      // Also track from other funnel-related events
      if (sessionId) {
        if (metadata?.industry || event.eventType === "industry_selected") {
          funnelSteps.industry_selected.add(sessionId);
        }
        if (metadata?.preset || event.eventType === "preset_selected") {
          funnelSteps.preset_selected.add(sessionId);
        }
        if (event.eventType === "wizard_completed" || event.eventType === "comparison_completed") {
          funnelSteps.profile_completed.add(sessionId);
          funnelSteps.results_viewed.add(sessionId);
        }
      }
      
      // 2. Export Tracking
      if (event.eventType === "export_initiated" || event.eventType === "export_pdf" || event.eventType === "export_excel") {
        const format = metadata?.format || (event.eventType === "export_pdf" ? "pdf" : event.eventType === "export_excel" ? "excel" : "pdf");
        if (format === "pdf") {
          exportTracking.formatBreakdown.pdf++;
        } else if (format === "excel") {
          exportTracking.formatBreakdown.excel++;
        }
        
        // Track by category
        if (category === "epm") exportTracking.byCategory.epm++;
        else if (category === "erp") exportTracking.byCategory.erp++;
        else if (category === "ai") exportTracking.byCategory.ai++;
        
        // Track vendor combinations from exports
        const exportVendors = metadata?.selectedVendors;
        if (Array.isArray(exportVendors) && exportVendors.length > 0) {
          const vendorKey = [...exportVendors].sort().join(", ");
          exportTracking.vendorCombinations.set(
            vendorKey,
            (exportTracking.vendorCombinations.get(vendorKey) || 0) + 1
          );
        }
      }
      
      // 3. Weight Modification Patterns
      if (event.eventType === "driver_weight_changed") {
        const driverId = metadata?.driverId || "unknown";
        const newWeight = metadata?.newWeight;
        
        if (!weightModifications[driverId]) {
          weightModifications[driverId] = { count: 0, weights: [] };
        }
        weightModifications[driverId].count++;
        if (typeof newWeight === "number") {
          weightModifications[driverId].weights.push(newWeight);
        }
      }
      
      // 4. Vendor Selection Analysis
      if (event.eventType === "vendor_toggled" || event.eventType === "vendor_selected" || event.eventType === "vendor_deselected") {
        const vendorId = metadata?.vendorId || event.action;
        if (vendorId && typeof vendorId === "string") {
          // Count total selections
          if (event.eventType !== "vendor_deselected") {
            vendorSelections[vendorId] = (vendorSelections[vendorId] || 0) + 1;
          }
          
          // Track vendors per session for pair analysis
          if (sessionId) {
            if (!sessionVendors.has(sessionId)) {
              sessionVendors.set(sessionId, new Set());
            }
            if (event.eventType !== "vendor_deselected") {
              sessionVendors.get(sessionId)!.add(vendorId);
            }
          }
        }
      }
    });
    
    // Format category usage for response
    const categoryStats = Object.entries(categoryUsage).map(([category, data]) => ({
      category: category.toUpperCase(),
      sessions: data.sessions.size,
      events: data.events,
      completions: data.completedSessions.size,
      completionRate: data.sessions.size > 0 
        ? Math.round((data.completedSessions.size / data.sessions.size) * 100) 
        : 0,
    }));
    
    // Format daily trends
    const trendData = Object.entries(dailyTrends)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Format industry breakdown
    const industryData = Object.entries(industryBreakdown)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Format company size breakdown
    const companySizeData = Object.entries(companySizeBreakdown)
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => b.count - a.count);
    
    // Format ERP landscape breakdown
    const erpLandscapeData = Object.entries(erpLandscapeBreakdown)
      .map(([erp, count]) => ({ erp, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Format revenue band breakdown
    const revenueBandData = Object.entries(revenueBandBreakdown)
      .map(([band, count]) => ({ band, count }))
      .sort((a, b) => b.count - a.count);
    
    // Format preset selections
    const presetData = Object.entries(presetSelections)
      .map(([preset, count]) => ({ preset, count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate preset changes (sessions that changed presets)
    const presetChangeMap: Record<string, number> = {};
    sessionPresets.forEach((history) => {
      // If session had more than one preset, track the transitions
      for (let i = 1; i < history.length; i++) {
        const changeKey = `${history[i - 1]} → ${history[i]}`;
        presetChangeMap[changeKey] = (presetChangeMap[changeKey] || 0) + 1;
      }
    });
    
    const presetChangeData = Object.entries(presetChangeMap)
      .map(([change, count]) => ({ change, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Format platform recommendations (outcomes)
    const platformData = Object.entries(platformRecommendations)
      .map(([platform, score]) => ({ platform, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    // Summary stats (humans only)
    const totalSessions = new Set(analyticsEvents.filter(e => e.sessionId).map(e => e.sessionId)).size;
    const totalEvents = analyticsEvents.length;
    const totalCompletions = categoryStats.reduce((sum, c) => sum + c.completions, 0);
    
    // Enhanced session metrics
    const sessionsWithLoad = new Set(
      analyticsEvents.filter(e => e.sessionId && e.eventType === "comparison_loaded").map(e => e.sessionId)
    ).size;
    const sessionsWithResults = new Set(
      analyticsEvents.filter(e => e.sessionId && e.eventType === "results_viewed").map(e => e.sessionId)
    ).size;
    const sessionsWithExport = new Set(
      analyticsEvents.filter(e => e.sessionId && e.eventType === "export_initiated").map(e => e.sessionId)
    ).size;
    
    // Sessions that changed presets
    const sessionsWithPresetChange = Array.from(sessionPresets.values()).filter(h => h.length > 1).length;
    
    // ========== CROSS-TABULATIONS ==========
    // Process session profiles into cross-tabulations
    sessionProfiles.forEach((profile) => {
      const { industry, size, erp, revenue, vendors } = profile;
      
      // Industry × ERP cross-tab
      if (industry && erp) {
        if (!industryByErp[industry]) industryByErp[industry] = {};
        industryByErp[industry][erp] = (industryByErp[industry][erp] || 0) + 1;
      }
      
      // Industry × Size cross-tab
      if (industry && size) {
        if (!industryBySize[industry]) industryBySize[industry] = {};
        industryBySize[industry][size] = (industryBySize[industry][size] || 0) + 1;
      }
      
      // Industry × Revenue cross-tab
      if (industry && revenue) {
        if (!industryByRevenue[industry]) industryByRevenue[industry] = {};
        industryByRevenue[industry][revenue] = (industryByRevenue[industry][revenue] || 0) + 1;
      }
      
      // Vendors by Industry
      if (industry && vendors.length > 0) {
        if (!vendorsByIndustry[industry]) vendorsByIndustry[industry] = {};
        vendors.forEach(v => {
          vendorsByIndustry[industry][v] = (vendorsByIndustry[industry][v] || 0) + 1;
        });
      }
    });
    
    // Format cross-tabs for response
    const crossTabs = {
      industryByErp: Object.entries(industryByErp).map(([industry, erps]) => ({
        industry,
        breakdown: Object.entries(erps).map(([erp, count]) => ({ erp, count })).sort((a, b) => b.count - a.count),
      })).sort((a, b) => b.breakdown.reduce((s, x) => s + x.count, 0) - a.breakdown.reduce((s, x) => s + x.count, 0)),
      
      industryBySize: Object.entries(industryBySize).map(([industry, sizes]) => ({
        industry,
        breakdown: Object.entries(sizes).map(([size, count]) => ({ size, count })).sort((a, b) => b.count - a.count),
      })).sort((a, b) => b.breakdown.reduce((s, x) => s + x.count, 0) - a.breakdown.reduce((s, x) => s + x.count, 0)),
      
      industryByRevenue: Object.entries(industryByRevenue).map(([industry, revenues]) => ({
        industry,
        breakdown: Object.entries(revenues).map(([revenue, count]) => ({ revenue, count })).sort((a, b) => b.count - a.count),
      })).sort((a, b) => b.breakdown.reduce((s, x) => s + x.count, 0) - a.breakdown.reduce((s, x) => s + x.count, 0)),
      
      vendorsByIndustry: Object.entries(vendorsByIndustry).map(([industry, vendors]) => ({
        industry,
        topVendors: Object.entries(vendors).map(([vendor, count]) => ({ vendor, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      })).sort((a, b) => b.topVendors.reduce((s, x) => s + x.count, 0) - a.topVendors.reduce((s, x) => s + x.count, 0)),
    };
    
    // ========== NEW: Format Funnel Analysis ==========
    const funnelData = [
      { step: "Industry Selected", sessions: funnelSteps.industry_selected.size },
      { step: "Preset Selected", sessions: funnelSteps.preset_selected.size },
      { step: "Profile Completed", sessions: funnelSteps.profile_completed.size },
      { step: "Results Viewed", sessions: funnelSteps.results_viewed.size },
    ];
    
    // Calculate dropoff rates
    const funnelWithDropoff = funnelData.map((item, idx) => {
      const prevSessions = idx > 0 ? funnelData[idx - 1].sessions : totalSessions;
      const dropoffRate = prevSessions > 0 
        ? Math.round(((prevSessions - item.sessions) / prevSessions) * 100) 
        : 0;
      const conversionRate = totalSessions > 0 
        ? Math.round((item.sessions / totalSessions) * 100) 
        : 0;
      return {
        ...item,
        dropoffRate: Math.max(0, dropoffRate),
        conversionRate,
      };
    });
    
    // ========== NEW: Format Export Tracking ==========
    const exportData = {
      formatBreakdown: [
        { format: "PDF", count: exportTracking.formatBreakdown.pdf },
        { format: "Excel", count: exportTracking.formatBreakdown.excel },
      ],
      categoryBreakdown: [
        { category: "EPM", count: exportTracking.byCategory.epm },
        { category: "ERP", count: exportTracking.byCategory.erp },
        { category: "AI", count: exportTracking.byCategory.ai },
      ],
      vendorCombinations: Array.from(exportTracking.vendorCombinations.entries())
        .map(([vendors, count]) => ({ vendors, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      totalExports: exportTracking.formatBreakdown.pdf + exportTracking.formatBreakdown.excel,
    };
    
    // ========== NEW: Format Weight Modifications ==========
    const weightData = Object.entries(weightModifications)
      .map(([driver, data]) => ({
        driver,
        changeCount: data.count,
        avgWeight: data.weights.length > 0 
          ? Math.round((data.weights.reduce((a, b) => a + b, 0) / data.weights.length) * 100) / 100
          : null,
      }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 15);
    
    // ========== NEW: Format Vendor Pairs ==========
    const vendorPairs: Record<string, number> = {};
    sessionVendors.forEach((vendors) => {
      const vendorArray = Array.from(vendors).sort();
      // Generate pairs from each session's vendor set
      for (let i = 0; i < vendorArray.length; i++) {
        for (let j = i + 1; j < vendorArray.length; j++) {
          const pairKey = `${vendorArray[i]} + ${vendorArray[j]}`;
          vendorPairs[pairKey] = (vendorPairs[pairKey] || 0) + 1;
        }
      }
    });
    
    const vendorPairData = Object.entries(vendorPairs)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const vendorSelectionData = Object.entries(vendorSelections)
      .map(([vendor, count]) => ({ vendor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    
    // ========== NEW: Calculate Step Durations ==========
    const stepDurationData: Record<string, number[]> = {};
    
    sessionStepTimestamps.forEach((steps) => {
      // Sort steps by timestamp
      const sortedSteps = [...steps].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      for (let i = 1; i < sortedSteps.length; i++) {
        const prevStep = sortedSteps[i - 1];
        const currentStep = sortedSteps[i];
        const durationSeconds = (currentStep.timestamp.getTime() - prevStep.timestamp.getTime()) / 1000;
        
        // Only count reasonable durations (between 1 second and 30 minutes)
        if (durationSeconds >= 1 && durationSeconds <= 1800) {
          const stepKey = `${prevStep.step} → ${currentStep.step}`;
          if (!stepDurationData[stepKey]) {
            stepDurationData[stepKey] = [];
          }
          stepDurationData[stepKey].push(durationSeconds);
        }
      }
    });
    
    const avgStepDurations = Object.entries(stepDurationData)
      .map(([transition, durations]) => ({
        transition,
        avgDurationSeconds: durations.length > 0 
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0,
        sampleSize: durations.length,
      }))
      .filter(d => d.sampleSize >= 2) // Only show transitions with enough data
      .sort((a, b) => b.sampleSize - a.sampleSize)
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        period: { days, startDate: startDate.toISOString() },
        summary: {
          totalSessions,
          totalEvents,
          totalCompletions,
          avgCompletionRate: totalSessions > 0 
            ? Math.round((totalCompletions / totalSessions) * 100) 
            : 0,
          // Enhanced session metrics
          sessionsStarted: sessionsWithLoad,
          sessionsCompleted: sessionsWithResults,
          sessionsExported: sessionsWithExport,
          startedCompletionRate: sessionsWithLoad > 0
            ? Math.round((sessionsWithResults / sessionsWithLoad) * 100)
            : 0,
          exportRate: sessionsWithResults > 0
            ? Math.round((sessionsWithExport / sessionsWithResults) * 100)
            : 0,
        },
        // Bot traffic (shown separately, excluded from analytics)
        botTraffic: botTrafficSummary,
        categoryStats,
        trends: trendData,
        // Individual selection breakdowns
        industryBreakdown: industryData,
        companySizeBreakdown: companySizeData,
        erpLandscapeBreakdown: erpLandscapeData,
        revenueBandBreakdown: revenueBandData,
        // Preset analytics
        presetSelections: presetData,
        presetChanges: presetChangeData,
        sessionsWithPresetChange,
        topPlatforms: platformData,
        // Cross-tabulations for deeper insights
        crossTabs,
        // Funnel and engagement analytics
        wizardFunnel: funnelWithDropoff,
        exportTracking: exportData,
        weightModifications: weightData,
        vendorSelections: vendorSelectionData,
        vendorPairs: vendorPairData,
        stepDurations: avgStepDurations,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Error getting comparison stats");
    res.status(500).json({ success: false, error: "Failed to get comparison stats" });
  }
});

export default router;
