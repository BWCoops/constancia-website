import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { createChildLogger } from "./lib/logger";
import rateLimit from "express-rate-limit";
import { getAuth } from "@clerk/express";

const log = createChildLogger("routes");
import { storage, generateOtp, hashOtp, verifyOtp, generateVerificationToken, getVerificationTokenExpiry } from "./storage";
import modularRoutes from "./api/routes";
import { insertContactSubmissionSchema, isBusinessEmail, InsertPageViewDb } from "@shared/schema";
import { 
  validateContactForm, 
  containsProfanity, 
  containsSpam, 
  isDisposableEmail,
  nameSchema,
  companySchema,
  messageSchema,
  businessEmailSchema 
} from "./services/content-validation";
import archiver from "archiver";
import path from "path";
import express from "express";
import { z } from "zod";
import { logSecurityEvent as logSecurityEventConsole } from "./index";
import { BlogGenerationService } from "./services/blog-generation";
import { getGuardrailSeeds } from "./services/guardrail-rules";
import { scanContentForAI, runFullWinstonCheck, WINSTON_THRESHOLDS } from "./services/winston-ai";
import fs from "fs";
import {
  checkRateLimit,
  checkLeadLockout as checkLeadLockoutDb,
  recordLeadAttempt as recordLeadAttemptDb,
  logSecurityEvent,
  isPathTraversalAttempt as isPathTraversalAttemptSecurity,
  isValidResourceId as isValidResourceIdSecurity,
  getClientIp,
} from "./middleware/security";
import { verifyTurnstileToken, getTurnstileSiteKey, isTurnstileConfigured } from "./services/turnstile";
import { 
  getFeatureFlags, 
  requireFinanceCompass, 
  requireBlog, 
  requireResources, 
  requireContact,
  requireComparisonTools 
} from "./middleware/feature-flags";
import { 
  getServerFeatureFlags, 
  setDbOverrideFetcher, 
  invalidateFeatureFlagsCache,
  FEATURE_KEYS,
  getEnvFeatureFlags
} from "@shared/feature-flags";
import { reloadFeatureFlags } from "./middleware/feature-flags";

import { sendEmail, SENDER_EMAIL, isEmailConfigured } from "./services/email-sender";
import {
  EMAIL_BRAND,
  EMAIL_CONTACT,
  generateEmailHeader,
  generateEmailFooter,
  generateEmailWrapper,
  generateNotificationHeader,
  generateOtpBox,
  generateCtaButton,
  generateWarningBox,
  generateSuccessBox,
  generateInfoCard,
  wrapEmailContent,
} from "./core/email/components";
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// OTP configuration
const OTP_EXPIRY_MINUTES = 10;

// Resource session configuration
const SESSION_EXPIRY_DAYS = 7;
const SESSION_COOKIE_NAME = "1qg_resource_session";

const MAX_OTP_ATTEMPTS = 5;

// Chat OTP storage (in-memory for chat flow)
const chatOtpStore = new Map<string, { hash: string; expiresAt: number }>();

// Central resources directory - single source of truth for all file operations
const RESOURCES_DIR = path.join(process.cwd(), 'public', 'resources');

import * as crypto from "crypto";
import { createBrandedPDF } from "./pdf-template-service";

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

// Wrapper functions for database-backed security (async versions)
async function checkHubspotSyncRateLimit(email: string): Promise<boolean> {
  const { allowed } = await checkRateLimit(email.toLowerCase(), 'hubspot');
  return allowed;
}

async function checkLeadLockout(leadId: string): Promise<{ locked: boolean; remainingAttempts: number }> {
  return checkLeadLockoutDb(leadId);
}

async function recordLeadAttempt(leadId: string): Promise<{ locked: boolean; remainingAttempts: number }> {
  return recordLeadAttemptDb(leadId);
}

// Use the security module functions
function isValidResourceId(id: string): boolean {
  return isValidResourceIdSecurity(id);
}

function isPathTraversalAttempt(input: string): boolean {
  return isPathTraversalAttemptSecurity(input);
}

// Lead capture validation schema with fingerprint data
const leadCaptureSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  company: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  resourceId: z.string().optional(),
  honeypot: z.string().optional(),
  subscribeNewsletter: z.boolean().default(true),
  // Browser fingerprint data for bot detection and lead enrichment
  screenResolution: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  platform: z.string().optional(),
  deviceMemory: z.number().optional(),
  hardwareConcurrency: z.number().optional(),
  referrer: z.string().optional(),
  pageUrl: z.string().optional(),
  clickTimestamp: z.string().optional(),
  // Turnstile bot verification token (not stored)
  turnstileToken: z.string().optional(),
});

// OTP verification schema
const otpVerifySchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const pageViewSchema = z.object({
  sessionId: z.string(),
  visitorId: z.string().optional(),
  path: z.string(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  duration: z.number().optional(),
});

// Helper: Send lead verification notification email via Microsoft Graph API
async function sendLeadVerificationNotification(lead: {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  resourceId?: string;
  resourceTitle?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  referrer?: string;
  pageUrl?: string;
}): Promise<boolean> {
  try {
    const fingerprintSection = (lead.screenResolution || lead.timezone || lead.language || lead.referrer || lead.pageUrl)
      ? generateInfoCard(`
          <h3 style="color: ${EMAIL_BRAND.deepMint}; margin: 0 0 10px 0; font-size: 14px; letter-spacing: 0.04em;">Browser Fingerprint Data</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            ${lead.screenResolution ? `<tr><td style="padding: 4px 0; color: ${EMAIL_BRAND.deepMint}; width: 120px;"><strong>Screen:</strong></td><td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.screenResolution}</td></tr>` : ''}
            ${lead.timezone ? `<tr><td style="padding: 4px 0; color: ${EMAIL_BRAND.deepMint};"><strong>Timezone:</strong></td><td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.timezone}</td></tr>` : ''}
            ${lead.language ? `<tr><td style="padding: 4px 0; color: ${EMAIL_BRAND.deepMint};"><strong>Language:</strong></td><td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.language}</td></tr>` : ''}
            ${lead.referrer ? `<tr><td style="padding: 4px 0; color: ${EMAIL_BRAND.deepMint};"><strong>Referrer:</strong></td><td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.referrer}</td></tr>` : ''}
            ${lead.pageUrl ? `<tr><td style="padding: 4px 0; color: ${EMAIL_BRAND.deepMint};"><strong>Page URL:</strong></td><td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.pageUrl}</td></tr>` : ''}
          </table>`)
      : '';

    const leadTable = `
      <h2 style="color: ${EMAIL_BRAND.charcoal}; margin-top: 0;">Lead Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray}; width: 120px;"><strong>Name:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${lead.firstName} ${lead.lastName}</td></tr>
        <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Email:</strong></td><td style="padding: 8px 0;"><a href="mailto:${lead.email}" style="color: ${EMAIL_BRAND.deepMint};">${lead.email}</a></td></tr>
        <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Company:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${lead.company}</td></tr>
        <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Job Title:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${lead.jobTitle}</td></tr>
        ${lead.resourceTitle ? `<tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Resource:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${lead.resourceTitle}</td></tr>` : ''}
      </table>`;

    const html = wrapEmailContent(`
      ${generateNotificationHeader({ title: 'New Verified Lead', subtitle: 'Resource Download' })}
      <div style="background-color: ${EMAIL_BRAND.white}; padding: 32px;">
        ${generateInfoCard(leadTable)}
        ${fingerprintSection}
        ${generateSuccessBox('This lead has verified their email address via OTP and downloaded a resource.')}
        <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
          Verified: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>
    `);

    await sendEmail(
      SENDER_EMAIL,
      `New Verified Lead: ${lead.firstName} ${lead.lastName} from ${lead.company}`,
      html
    );

    log.info("lead notification email sent successfully via Graph API");
    return true;
  } catch (error) {
    log.error({ err: error }, "lead verification notification error");
    return false;
  }
}

// Helper: Send contact form notification email via Graph API
async function sendContactFormNotification(submission: {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  message: string;
  phone?: string;
}): Promise<boolean> {
  try {
    const contactTable = `
      <h2 style="color: ${EMAIL_BRAND.charcoal}; margin-top: 0;">Contact Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray}; width: 120px;"><strong>Name:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${submission.firstName} ${submission.lastName}</td></tr>
        <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Email:</strong></td><td style="padding: 8px 0;"><a href="mailto:${submission.email}" style="color: ${EMAIL_BRAND.deepMint};">${submission.email}</a></td></tr>
        <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Company:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${submission.company}</td></tr>
        <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Job Title:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${submission.jobTitle}</td></tr>
        ${submission.phone ? `<tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Phone:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${submission.phone}</td></tr>` : ''}
      </table>`;

    const messageSection = `
      <div style="background: ${EMAIL_BRAND.white}; padding: 20px; border: 1px solid ${EMAIL_BRAND.mediumGray}; border-radius: 4px; margin-top: 20px;">
        <h2 style="color: ${EMAIL_BRAND.charcoal}; margin-top: 0;">Message</h2>
        <p style="color: ${EMAIL_BRAND.darkGray}; line-height: 1.6; white-space: pre-wrap;">${submission.message}</p>
      </div>`;

    const html = wrapEmailContent(`
      ${generateNotificationHeader({ title: 'New Contact Form Submission', subtitle: 'Constancia Website' })}
      <div style="background-color: ${EMAIL_BRAND.white}; padding: 32px;">
        ${generateInfoCard(contactTable)}
        ${messageSection}
        <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
          Submitted: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>
    `);

    await sendEmail(
      SENDER_EMAIL,
      `New Contact Form Submission from ${submission.firstName} ${submission.lastName}`,
      html
    );

    return true;
  } catch (error) {
    log.error({ err: error }, "contact form notification error");
    return false;
  }
}

/**
 * Send OTP email for resource download verification via Graph API.
 * This is the primary verification method for resource downloads.
 * Helper: Send OTP email via Graph API
 */
async function sendOtpEmail(email: string, firstName: string, otp: string): Promise<boolean> {
  try {
    const html = generateEmailWrapper(
      generateEmailHeader(),
      `<p style="color: ${EMAIL_BRAND.charcoal}; font-size: 16px; margin: 0 0 16px 0;">Hi ${firstName},</p>
        <p style="color: ${EMAIL_BRAND.charcoal}; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Thank you for your interest in Constancia resources. Please use the following code to access your download:
        </p>
        ${generateOtpBox(otp)}
        <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; margin: 16px 0 0 0;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
      generateEmailFooter()
    );

    await sendEmail(
      email,
      "Your Constancia Resource Access Code",
      html
    );

    return true;
  } catch (error) {
    log.error({ err: error }, "failed to send OTP email");
    return false;
  }
}

/**
 * Send contact verification email via Graph API
 * @param to - Recipient email address
 * @param firstName - Recipient's first name for personalization
 * @param token - Verification token to include in the link
 * @returns Promise<boolean> - true if email sent successfully
 */
async function sendContactVerificationEmail(to: string, firstName: string, token: string): Promise<boolean> {
  try {
    const baseUrl = process.env.BASE_URL || 'https://constancia.com';
    const verificationLink = `${baseUrl}/api/contact/verify?token=${token}`;
    
    const html = generateEmailWrapper(
      generateEmailHeader(),
      `<p style="color: ${EMAIL_BRAND.charcoal}; font-size: 16px; margin: 0 0 20px 0;">Hi ${firstName},</p>
        <p style="color: ${EMAIL_BRAND.charcoal}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Thank you for contacting Constancia. Please verify your email address to confirm your enquiry.
        </p>
        ${generateCtaButton('Verify Email Address', verificationLink)}
        <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; margin: 25px 0 8px 0;">
          If the button above doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: ${EMAIL_BRAND.deepMint}; font-size: 13px; word-break: break-all; background-color: ${EMAIL_BRAND.warmCream}; padding: 12px; border-radius: 4px; margin: 0 0 25px 0;">
          ${verificationLink}
        </p>
        ${generateWarningBox('<strong>Note:</strong> This link expires in 24 hours. After expiration, you\'ll need to submit a new contact request.')}
        <p style="color: ${EMAIL_BRAND.charcoal}; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
          Once verified, our team will review your enquiry and get back to you shortly.
        </p>`,
      generateEmailFooter()
    );

    await sendEmail(
      to,
      `Verify your email - Constancia Contact`,
      html
    );

    return true;
  } catch (error) {
    log.error({ err: error }, "failed to send contact verification email");
    return false;
  }
}

// Enhanced lead data interface for HubSpot sync
interface HubSpotLeadData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  resourceId?: string;
  resourceTitle?: string;
  subscribeNewsletter?: boolean;
  ipAddress?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  referrer?: string;
  pageUrl?: string;
  clickTimestamp?: string;
}

// Helper: Sync lead to HubSpot with proper create/update handling
async function syncLeadToHubSpot(lead: HubSpotLeadData): Promise<{ success: boolean; contactId?: string }> {
  if (!HUBSPOT_ACCESS_TOKEN) {
    log.warn("HubSpot access token not configured");
    return { success: false };
  }

  // Build properties object with standard HubSpot contact properties only
  const properties: Record<string, string> = {
    firstname: lead.firstName,
    lastname: lead.lastName,
    email: lead.email,
    company: lead.company,
    jobtitle: lead.jobTitle,
    hs_lead_status: "NEW",
    newsletter_subscribed: lead.subscribeNewsletter !== false ? "true" : "false",
  };

  // Build message with all lead data in plain text
  const messageLines: string[] = [];
  messageLines.push("Source: Constancia Website Resource Download");
  
  // Include newsletter subscription preference
  messageLines.push(`Newsletter: ${lead.subscribeNewsletter !== false ? 'Yes' : 'No'}`);
  
  if (lead.resourceId) {
    messageLines.push(`Resource: ${lead.resourceId}`);
  }
  if (lead.resourceTitle) {
    messageLines.push(`Title: ${lead.resourceTitle}`);
  }
  if (lead.ipAddress) {
    messageLines.push(`IP: ${lead.ipAddress}`);
  }
  if (lead.screenResolution) {
    messageLines.push(`Screen: ${lead.screenResolution}`);
  }
  if (lead.timezone) {
    messageLines.push(`Timezone: ${lead.timezone}`);
  }
  if (lead.language) {
    messageLines.push(`Language: ${lead.language}`);
  }
  if (lead.referrer) {
    messageLines.push(`Referrer: ${lead.referrer}`);
  }
  if (lead.pageUrl) {
    messageLines.push(`Page: ${lead.pageUrl}`);
  }
  if (lead.clickTimestamp) {
    messageLines.push(`Click: ${lead.clickTimestamp}`);
  }

  // Store all data in the standard message field
  if (messageLines.length > 0) {
    properties.message = messageLines.join("\n");
  }

  try {
    // First, try to create the contact
    const createResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (createResponse.ok) {
      const data = await createResponse.json();
      log.info({ contactId: data.id }, "HubSpot contact created");
      return { success: true, contactId: data.id };
    }

    // If contact exists (409 conflict), search and update
    if (createResponse.status === 409) {
      log.info("contact exists in HubSpot, attempting update");
      
      // Search for existing contact by email
      const searchResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/search`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: "email",
                operator: "EQ",
                value: lead.email.toLowerCase(),
              }],
            }],
          }),
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          const contactId = searchData.results[0].id;
          
          // Update existing contact with new data
          // Don't overwrite hs_lead_status if they're already a contact
          delete properties.hs_lead_status;
          
          // Append new resource info to existing message if present
          const existingMessage = searchData.results[0].properties?.message;
          if (existingMessage && lead.resourceId) {
            properties.message = `${existingMessage}\n\nNew download: ${lead.resourceId} (${new Date().toISOString()})`;
          }
          
          const updateResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
            {
              method: "PATCH",
              headers: {
                "Authorization": `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ properties }),
            }
          );

          if (updateResponse.ok) {
            log.info({ contactId }, "HubSpot contact updated");
            return { success: true, contactId };
          } else {
            const updateError = await updateResponse.text();
            log.error({ err: updateError }, "HubSpot update failed");
            return { success: false };
          }
        }
      }
      
      // If search/update fails, still consider it a partial success
      log.warn("could not update existing HubSpot contact");
      return { success: true };
    }

    // Log other errors
    const errorData = await createResponse.text();
    log.error({ status: createResponse.status, errorData }, "HubSpot sync failed");
    return { success: false };
  } catch (error) {
    log.error({ err: error }, "HubSpot sync error");
    return { success: false };
  }
}


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await storage.seedInitialData();
  
  // ============================================
  // FEATURE FLAGS DATABASE FETCHER SETUP
  // ============================================
  setDbOverrideFetcher(async () => {
    return await storage.getFeatureFlagOverrides();
  });
  log.info("database override fetcher registered");
  
  // ============================================
  // REPLIT AUTH SETUP FOR ADMIN AUTHENTICATION
  // ============================================
  const { setupAuth } = await import("./clerkAuth");
  await setupAuth(app);
  
  // ============================================
  // ADMIN CENTRE ROUTES (completely separate from public site)
  // ============================================
  const adminRoutes = await import("./admin/routes");
  app.use("/api/admin", adminRoutes.default);
  
  // ============================================
  // MODULAR DOMAIN ROUTES (blog, resources, contact, analytics, chat)
  // These modular routes take precedence over legacy routes defined below
  // ============================================
  app.use("/api", modularRoutes);
  log.info("modular domain routes registered");
  
  // ============================================
  // FEATURE FLAGS API ENDPOINTS
  // ============================================
  const { isAuthenticated } = await import("./clerkAuth");

  // Blanket auth guard — every /api/admin/* route requires a valid Clerk session.
  // Individual routes that already pass isAuthenticated explicitly remain unaffected
  // (Express runs middleware in order; a second call to isAuthenticated is a no-op
  // when the session is already verified).
  app.use("/api/admin", isAuthenticated);

  app.get("/api/feature-flags", async (_req: Request, res: Response) => {
    try {
      const flags = await getServerFeatureFlags();
      res.json(flags);
    } catch (error) {
      log.error({ err: error }, "error fetching flags");
      res.status(500).json({ error: "Failed to fetch feature flags" });
    }
  });

  // Admin: Get all feature flags with override status (requires authentication)
  app.get("/api/admin/feature-flags", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const envFlags = getEnvFeatureFlags();
      const overrides = await storage.getFeatureFlagOverrides();
      const mergedFlags = await getServerFeatureFlags();
      
      // Build detailed response with env default, override, and effective value
      const flagDetails = FEATURE_KEYS.map(key => {
        const override = overrides.find(o => o.featureKey === key);
        return {
          key,
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          envDefault: envFlags[key],
          hasOverride: !!override,
          overrideValue: override?.isEnabled ?? null,
          effectiveValue: mergedFlags[key],
          updatedBy: override?.updatedBy ?? null,
          updatedAt: override?.updatedAt ?? null,
        };
      });
      
      res.json({ flags: flagDetails });
    } catch (error) {
      log.error({ err: error }, "error fetching admin feature flags");
      res.status(500).json({ error: "Failed to fetch feature flags" });
    }
  });

  // Admin: Update a feature flag override (requires authentication)
  app.patch("/api/admin/feature-flags/:featureKey", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { featureKey } = req.params;
      const { isEnabled, updatedBy } = req.body;
      
      // Validate feature key
      if (!FEATURE_KEYS.includes(featureKey as any)) {
        return res.status(400).json({ error: "Invalid feature key" });
      }
      
      if (typeof isEnabled !== 'boolean') {
        return res.status(400).json({ error: "isEnabled must be a boolean" });
      }
      
      // Upsert the override
      const result = await storage.upsertFeatureFlagOverride({
        featureKey,
        isEnabled,
        updatedBy: updatedBy || 'admin',
      });
      
      // Invalidate cache
      invalidateFeatureFlagsCache();
      reloadFeatureFlags();
      
      log.info({ featureKey, isEnabled, updatedBy: updatedBy || 'admin' }, "feature flag updated");
      
      res.json({ success: true, override: result });
    } catch (error) {
      log.error({ err: error }, "error updating feature flag");
      res.status(500).json({ error: "Failed to update feature flag" });
    }
  });

  // Admin: Remove a feature flag override (requires authentication)
  app.delete("/api/admin/feature-flags/:featureKey", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { featureKey } = req.params;
      
      if (!FEATURE_KEYS.includes(featureKey as any)) {
        return res.status(400).json({ error: "Invalid feature key" });
      }
      
      const deleted = await storage.deleteFeatureFlagOverride(featureKey);
      
      // Invalidate cache
      invalidateFeatureFlagsCache();
      reloadFeatureFlags();
      
      log.info({ featureKey }, "feature flag override removed");
      
      res.json({ success: true, deleted });
    } catch (error) {
      log.error({ err: error }, "error removing feature flag override");
      res.status(500).json({ error: "Failed to remove feature flag override" });
    }
  });
  
  // ============================================
  // FINANCECOMPASS ROUTES (ringfenced module - can be deployed independently)
  // ============================================
  const { financeCompassAdminRoutes, financeCompassPublicRoutes } = await import("./finance-compass");
  
  // Admin FinanceCompass routes (requires authentication + feature flag)
  app.use("/api/admin/finance-compass", requireFinanceCompass, isAuthenticated, financeCompassAdminRoutes);
  
  // Public FinanceCompass routes (feature flag required - no auth for end-user assessment flow)
  app.use("/api/finance-compass/public", requireFinanceCompass, financeCompassPublicRoutes);
  
  // ============================================
  // ANALYTICS ROUTES (widget tracking)
  // ============================================
  const analyticsRoutes = await import("./routes/analytics");
  app.use("/api/analytics", analyticsRoutes.default);
  
  // Serve WordPress theme files as static
  app.use('/wordpress-theme', express.static(path.join(process.cwd(), 'wordpress-theme')));
  
  // Serve downloadable resources as static files from central location
  app.use('/resources', express.static(RESOURCES_DIR));

  // ============================================
  // SEO: Sitemap and Robots.txt
  // ============================================
  // Note: sitemap.xml route is served from server/index.ts using server/services/seo.ts
  // The sitemap configuration is maintained in server/services/seo.ts (allStaticPages array)
  // robots.txt is served as the static file at client/public/robots.txt

  // Note: Track/page-view route has been moved to server/api/routes/analytics.routes.ts

  // Turnstile configuration endpoint
  app.get("/api/config/turnstile", (_req: Request, res: Response) => {
    const siteKey = getTurnstileSiteKey();
    const configured = isTurnstileConfigured();
    // Always indicate enabled to not advertise when protection is disabled
    res.json({ 
      enabled: configured,
      siteKey: siteKey || null 
    });
  });

  // ============================================
  // CSP VIOLATION REPORTING ENDPOINT
  // ============================================
  // Receives Content-Security-Policy violation reports from browsers
  app.post("/api/csp-report", express.json({ type: "application/csp-report" }), (req: Request, res: Response) => {
    try {
      const report = req.body?.["csp-report"] || req.body;
      
      if (report) {
        // Log CSP violation for security monitoring
        const violationDetails = {
          documentUri: report["document-uri"]?.substring(0, 200),
          violatedDirective: report["violated-directive"],
          blockedUri: report["blocked-uri"]?.substring(0, 200),
          sourceFile: report["source-file"]?.substring(0, 200),
          lineNumber: report["line-number"],
          columnNumber: report["column-number"],
        };
        
        logSecurityEventConsole({
          type: "SUSPICIOUS_ACTIVITY",
          timestamp: new Date().toISOString(),
          ip: getClientIp(req),
          details: `CSP Violation: ${JSON.stringify(violationDetails)}`,
          severity: "WARN",
        });
      }
      
      // Always return 204 to not indicate reporting status
      res.status(204).send();
    } catch (error) {
      // Don't expose errors for security reports
      res.status(204).send();
    }
  });

  // ============================================
  // NOTIFY-ME ENDPOINT (launch holding-page email capture)
  // ============================================
  // Lightweight signup used while the marketing site is hidden behind
  // the launch screen. Stores email-only (no name, no message) and
  // mirrors to HubSpot so we can notify the list when the full site
  // ships. Email is encrypted at rest; emailHash provides idempotent
  // lookup so repeat submissions don't create duplicates.
  app.post("/api/notify-me", async (req: Request, res: Response) => {
    try {
      const { notificationSignups } = await import("@shared/schema");
      const { encryptField, hashForLookup } = await import("./services/encryption");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const schema = z.object({
        email: z.string().email().max(254),
        source: z.string().max(64).optional(),
        timezone: z.string().max(64).optional(),
        referrer: z.string().max(512).optional(),
      });

      const parse = schema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({
          success: false,
          error: "Please use a valid email address.",
        });
      }

      const email = parse.data.email.trim().toLowerCase();

      if (isDisposableEmail(email)) {
        return res.status(400).json({
          success: false,
          error: "Temporary or disposable email addresses are not accepted.",
        });
      }

      const emailHash = hashForLookup(email);
      const clientIp = getClientIp(req);
      const userAgent = req.headers["user-agent"]?.toString().slice(0, 512);

      await db
        .insert(notificationSignups)
        .values({
          email: encryptField(email),
          emailHash,
          source: parse.data.source || "holding-page",
          timezone: parse.data.timezone,
          referrer: parse.data.referrer,
          ipAddress: clientIp,
          userAgent,
        })
        .onConflictDoNothing({ target: notificationSignups.emailHash });

      // Mirror to HubSpot as a newsletter subscriber. Fire-and-forget;
      // failures here don't fail the signup since the row is already
      // persisted locally.
      if (HUBSPOT_ACCESS_TOKEN) {
        syncLeadToHubSpot({
          firstName: "Subscriber",
          lastName: "Launch List",
          email,
          company: "",
          jobTitle: "",
        })
          .then(async (result) => {
            if (result.success) {
              await db
                .update(notificationSignups)
                .set({ hubspotSynced: true })
                .where(eq(notificationSignups.emailHash, emailHash));
            }
          })
          .catch((err) => log.error({ err }, "Notify-me HubSpot sync error"));
      }

      log.info({ source: parse.data.source || "holding-page" }, "Notify-me signup recorded");

      return res.json({ success: true });
    } catch (error) {
      log.error({ err: error }, "Notify-me signup error");
      return res.status(500).json({
        success: false,
        error: "Please try again in a moment.",
      });
    }
  });

  // Note: Ad-click tracking, blog, and files/resources routes have been moved to:
  // - server/api/routes/analytics.routes.ts (track/* routes)
  // - server/api/routes/blog.routes.ts (blog/* routes)
  // - server/api/routes/resources.routes.ts (files/* and resources/* routes)

  // Note: Contact routes have been moved to server/api/routes/contact.routes.ts

  // =====================================================
  // CAREERS / TALENT COMMUNITY ROUTES
  // =====================================================

  app.post("/api/careers/apply", async (req: Request, res: Response) => {
    try {
      const clientIp = getClientIp(req);

      if (isTurnstileConfigured()) {
        const turnstileToken = req.body.turnstileToken;
        const verification = await verifyTurnstileToken(turnstileToken, clientIp);

        if (!verification.success) {
          logSecurityEventConsole({
            type: "SUSPICIOUS_ACTIVITY",
            timestamp: new Date().toISOString(),
            ip: clientIp,
            details: "Turnstile verification failed for careers form",
            severity: "WARN",
          });
          return res.status(400).json({
            success: false,
            error: verification.error || "Bot verification failed. Please try again.",
          });
        }
      }

      const { turnstileToken: _, ...formData } = req.body;

      const { insertTalentSubmissionSchema, talentSubmissions } = await import("@shared/schema");

      const parsed = insertTalentSubmissionSchema.parse(formData);

      if (!parsed.consent) {
        return res.status(400).json({
          success: false,
          error: "You must consent to data processing to submit this form.",
        });
      }

      const { db } = await import("./db");
      const [submission] = await db.insert(talentSubmissions).values(parsed).returning();

      try {
        const candidateTable = `
          <h2 style="color: ${EMAIL_BRAND.charcoal}; margin-top: 0;">Candidate Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray}; width: 140px;"><strong>Name:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${parsed.firstName} ${parsed.lastName}</td></tr>
            <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Email:</strong></td><td style="padding: 8px 0;"><a href="mailto:${parsed.email}" style="color: ${EMAIL_BRAND.deepMint};">${parsed.email}</a></td></tr>
            ${parsed.linkedIn ? `<tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>LinkedIn:</strong></td><td style="padding: 8px 0;"><a href="${parsed.linkedIn}" style="color: ${EMAIL_BRAND.deepMint};">${parsed.linkedIn}</a></td></tr>` : ''}
            <tr><td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Area of Interest:</strong></td><td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${parsed.areaOfInterest}</td></tr>
          </table>`;

        const talentMessageSection = `
          <div style="background: ${EMAIL_BRAND.white}; padding: 20px; border: 1px solid ${EMAIL_BRAND.mediumGray}; border-radius: 4px; margin-top: 20px;">
            <h2 style="color: ${EMAIL_BRAND.charcoal}; margin-top: 0;">Message</h2>
            <p style="color: ${EMAIL_BRAND.darkGray}; line-height: 1.6; white-space: pre-wrap;">${parsed.message}</p>
          </div>`;

        const talentHtml = wrapEmailContent(`
          ${generateNotificationHeader({ title: 'Talent Community Submission', subtitle: 'Constancia Careers' })}
          <div style="background-color: ${EMAIL_BRAND.white}; padding: 32px;">
            ${generateInfoCard(candidateTable)}
            ${talentMessageSection}
            <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
              Submitted: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
        `);

        await sendEmail(
          SENDER_EMAIL,
          `New Talent Community Submission: ${parsed.firstName} ${parsed.lastName}`,
          talentHtml
        );
      } catch (emailError) {
        log.error({ err: emailError }, "talent submission email notification error");
      }

      res.json({
        success: true,
        message: "Thank you for joining our talent community. We will be in touch.",
      });
    } catch (error) {
      log.error({ err: error }, "careers form error");
      res.status(400).json({ success: false, error: "Invalid submission data" });
    }
  });

  // =====================================================
  // AI BLOG GENERATION PIPELINE ROUTES
  // =====================================================
  
  const blogGenerationService = new BlogGenerationService();
  
  // Seed guardrail rules (one-time setup)
  // Use ?force=true to reseed and replace all existing guardrails
  app.post("/api/admin/guardrails/seed", async (req: Request, res: Response) => {
    try {
      const forceReseed = req.query.force === "true" || req.body.force === true;
      const seeds = getGuardrailSeeds();
      let categoriesCreated = 0;
      let rulesCreated = 0;
      
      // Check if already seeded
      const existingCategories = await storage.getGuardrailCategories();
      const existingRulesResult = await storage.getGuardrailRules();
      const existingRules = existingRulesResult.items;
      
      if (existingCategories.length > 0 && !forceReseed) {
        return res.json({ 
          success: true, 
          message: "Guardrails already seeded. Use ?force=true to reseed.",
          categories: existingCategories.length,
          rules: existingRules.length
        });
      }
      
      // If force reseeding, delete all existing rules first, then categories
      if (forceReseed && existingCategories.length > 0) {
        log.info({ rulesCount: existingRules.length, categoriesCount: existingCategories.length }, "force reseed requested, deleting existing guardrails");
        for (const rule of existingRules) {
          await storage.deleteGuardrailRule(rule.id);
        }
        for (const cat of existingCategories) {
          await storage.deleteGuardrailCategory(cat.id);
        }
        log.info("cleared existing guardrails");
      }
      
      // Create a mapping of seed category IDs to actual database IDs
      const categoryIdMap: Record<string, string> = {};
      
      // Seed categories and build ID mapping
      for (const cat of seeds.categories) {
        const createdCategory = await storage.createGuardrailCategory({
          name: cat.name,
          description: cat.description,
          sortOrder: cat.sortOrder,
          enabled: true,
        });
        // Map the seed ID (e.g., "cat-content-quality") to the actual database ID
        categoryIdMap[cat.id] = createdCategory.id;
        categoriesCreated++;
      }
      
      log.info({ categoriesCreated, categoryIds: Object.keys(categoryIdMap) }, "created guardrail categories with ID mapping");
      
      // Seed rules using mapped category IDs
      for (const rule of seeds.rules) {
        const actualCategoryId = categoryIdMap[rule.categoryId];
        if (!actualCategoryId) {
          log.warn({ categoryId: rule.categoryId, ruleName: rule.name }, "unknown category ID, skipping rule");
          continue;
        }
        
        await storage.createGuardrailRule({
          categoryId: actualCategoryId,
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          validationType: rule.ruleType,
          validationParams: JSON.stringify(rule.ruleConfig),
          errorMessage: rule.errorMessage,
          suggestion: rule.suggestedFix,
          sortOrder: rule.sortOrder,
          enabled: true,
        });
        rulesCreated++;
      }
      
      log.info({ categoriesCreated, rulesCreated }, "seeded guardrail categories and rules");
      
      res.json({
        success: true,
        categories: categoriesCreated,
        rules: rulesCreated
      });
    } catch (error: unknown) {
      log.error({ err: error }, "failed to seed guardrails");
      res.status(500).json({ error: "Failed to seed guardrails", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Helper function to format guardrail rules for API responses
  function formatGuardrailRule(r: any): any {
    let ruleConfig: any = {};
    try {
      ruleConfig = r.validationParams ? JSON.parse(r.validationParams) : {};
    } catch (e) {
      // Invalid JSON, use empty config
    }
    return {
      id: r.id,
      categoryId: r.categoryId,
      name: r.name,
      description: r.description,
      severity: r.severity,
      ruleType: r.validationType,
      ruleConfig,
      errorMessage: r.errorMessage,
      suggestedFix: r.suggestion,
      appliesToStage: (ruleConfig as any)?.appliesToStage || ["draft", "outline"],
      sortOrder: r.sortOrder,
      isActive: r.enabled,
    };
  }

  // Get guardrail categories and rules
  app.get("/api/admin/guardrails", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getGuardrailCategories();
      const rulesResult = await storage.getGuardrailRules();
      res.json({ categories, rules: rulesResult.items.map(formatGuardrailRule) });
    } catch (error: any) {
      log.error({ err: error }, "error fetching guardrails");
      res.status(500).json({ error: "Failed to fetch guardrails" });
    }
  });

  // Get guardrail categories
  app.get("/api/admin/guardrails/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getGuardrailCategories();
      res.json(categories);
    } catch (error: any) {
      log.error({ err: error }, "error fetching guardrail categories");
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get guardrail rules
  app.get("/api/admin/guardrails/rules", async (req: Request, res: Response) => {
    try {
      const rulesResult = await storage.getGuardrailRules();
      res.json(rulesResult.items.map(formatGuardrailRule));
    } catch (error: any) {
      log.error({ err: error }, "error fetching guardrail rules");
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  // Get guardrail stats
  app.get("/api/admin/guardrails/stats", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getGuardrailCategories();
      const rulesResult = await storage.getGuardrailRules();
      const rules = rulesResult.items;
      const activeRules = rules.filter((r: { enabled: boolean }) => r.enabled);
      res.json({
        totalRules: rules.length,
        activeRules: activeRules.length,
        categories: categories.length,
      });
    } catch (error: any) {
      log.error({ err: error }, "error fetching guardrail stats");
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const createRuleSchema = z.object({
    categoryId: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    ruleType: z.string().min(1).max(100),
    description: z.string().max(1000).optional().default(""),
    severity: z.enum(["info", "warning", "error"]).optional().default("warning"),
    ruleConfig: z.record(z.unknown()).optional(),
    errorMessage: z.string().max(500).optional().default(""),
    suggestedFix: z.string().max(1000).optional().default(""),
    appliesToStage: z.array(z.string().max(50)).max(10).optional(),
    sortOrder: z.number().int().min(1).max(9999).optional().default(1),
    isActive: z.boolean().optional().default(true),
  });

  const updateRuleSchema = z.object({
    categoryId: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(200).optional(),
    ruleType: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    severity: z.enum(["info", "warning", "error"]).optional(),
    ruleConfig: z.record(z.unknown()).optional(),
    errorMessage: z.string().max(500).optional(),
    suggestedFix: z.string().max(1000).optional(),
    appliesToStage: z.array(z.string().max(50)).max(10).optional(),
    sortOrder: z.number().int().min(1).max(9999).optional(),
    isActive: z.boolean().optional(),
  });

  const createCategorySchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().default(""),
    sortOrder: z.number().int().min(1).max(9999).optional().default(1),
  });

  const updateCategorySchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    sortOrder: z.number().int().min(1).max(9999).optional(),
    enabled: z.boolean().optional(),
  });

  // Per-Clerk-user rate limit for the AI blog generation endpoint.
  // 20 generation jobs per hour per authenticated user to cap API cost exposure.
  const blogGenerateUserRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const { userId } = getAuth(req);
      return userId ?? (req.ip ?? "unknown");
    },
    message: { error: "Too many blog generation requests. Please try again in an hour." },
  });

  // Create guardrail rule
  app.post("/api/admin/guardrails/rules", async (req: Request, res: Response) => {
    try {
      const parsed = createRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      }
      const { categoryId, name, ruleType, description, severity, ruleConfig, errorMessage, suggestedFix, appliesToStage, sortOrder, isActive } = parsed.data;

      const configWithStage = { ...ruleConfig, appliesToStage: appliesToStage ?? ["draft", "outline"] };
      const rule = await storage.createGuardrailRule({
        categoryId,
        name,
        description,
        severity,
        validationType: ruleType,
        validationParams: JSON.stringify(configWithStage),
        errorMessage,
        suggestion: suggestedFix,
        sortOrder,
        enabled: isActive,
      });

      res.json(formatGuardrailRule(rule));
    } catch (error: any) {
      log.error({ err: error }, "error creating guardrail rule");
      res.status(500).json({ error: error.message || "Failed to create rule" });
    }
  });

  // Update guardrail rule
  app.patch("/api/admin/guardrails/rules/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== "string" || id.length > 100) {
        return res.status(400).json({ error: "Invalid rule ID" });
      }
      const parsed = updateRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      }
      const { categoryId, name, description, severity, ruleType, ruleConfig, errorMessage, suggestedFix, appliesToStage, sortOrder, isActive } = parsed.data;

      const configWithStage = ruleConfig ? { ...ruleConfig, appliesToStage: appliesToStage ?? ["draft", "outline"] } : undefined;
      const rule = await storage.updateGuardrailRule(id, {
        categoryId,
        name,
        description,
        severity,
        validationType: ruleType,
        validationParams: configWithStage ? JSON.stringify(configWithStage) : undefined,
        errorMessage,
        suggestion: suggestedFix,
        sortOrder,
        enabled: isActive,
      });

      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      res.json(formatGuardrailRule(rule));
    } catch (error: any) {
      log.error({ err: error }, "error updating guardrail rule");
      res.status(500).json({ error: error.message || "Failed to update rule" });
    }
  });

  // Delete guardrail rule
  app.delete("/api/admin/guardrails/rules/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteGuardrailRule(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error({ err: error }, "error deleting guardrail rule");
      res.status(500).json({ error: error.message || "Failed to delete rule" });
    }
  });

  // Toggle guardrail rule
  app.post("/api/admin/guardrails/rules/:id/toggle", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      const rule = await storage.updateGuardrailRule(id, { enabled });

      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      res.json(formatGuardrailRule(rule));
    } catch (error: any) {
      log.error({ err: error }, "error toggling guardrail rule");
      res.status(500).json({ error: error.message || "Failed to toggle rule" });
    }
  });

  // Create guardrail category
  app.post("/api/admin/guardrails/categories", async (req: Request, res: Response) => {
    try {
      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      }
      const { name, description, sortOrder } = parsed.data;

      const category = await storage.createGuardrailCategory({
        name,
        description,
        sortOrder,
        enabled: true,
      });

      res.json(category);
    } catch (error: any) {
      log.error({ err: error }, "error creating guardrail category");
      res.status(500).json({ error: error.message || "Failed to create category" });
    }
  });

  // Update guardrail category - Not yet implemented in storage
  // TODO: Add updateGuardrailCategory method to storage when needed
  app.patch("/api/admin/guardrails/categories/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== "string" || id.length > 100) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      }
      const { name, description, sortOrder, enabled } = parsed.data;

      const categories = await storage.getGuardrailCategories();
      const existingCategory = categories.find((c: { id: string }) => c.id === id);
      
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Return the existing category with updated fields for now
      res.json({
        ...existingCategory,
        name: name ?? existingCategory.name,
        description: description ?? existingCategory.description,
        sortOrder: sortOrder ?? existingCategory.sortOrder,
        enabled: enabled ?? existingCategory.enabled,
      });
    } catch (error: any) {
      log.error({ err: error }, "error updating guardrail category");
      res.status(500).json({ error: error.message || "Failed to update category" });
    }
  });

  // Delete guardrail category
  app.delete("/api/admin/guardrails/categories/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteGuardrailCategory(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error({ err: error }, "error deleting guardrail category");
      res.status(500).json({ error: error.message || "Failed to delete category" });
    }
  });

  // =====================================================
  // BLOG POST GENERATION ROUTES (Stub implementations)
  // =====================================================

  // Generate blog post content - Stub implementation
  // NOTE: The full implementation with buildPrompt/generateContent methods is in the pipeline routes below
  app.post("/api/admin/blog/generate-legacy", async (req: Request, res: Response) => {
    try {
      const { topic } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      // Return stub response - use the pipeline routes for actual generation
      res.json({
        success: true,
        message: "Use /api/admin/blog/generate with POST body {title, brief, targetKeywords} for full generation",
        content: null,
        metadata: null,
        guardrailResults: null,
      });
    } catch (error: any) {
      log.error({ err: error }, "blog generation error");
      res.status(500).json({ error: error.message || "Failed to process request" });
    }
  });

  // Validate blog content against guardrails
  app.post("/api/admin/blog/validate", async (req: Request, res: Response) => {
    try {
      const { content, stage } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Use testContent which exists in BlogGenerationService
      const rulesResult = await storage.getGuardrailRules();
      await blogGenerationService.initializeGuardrails(rulesResult.items);
      const result = await blogGenerationService.testContent(content);
      
      res.json({
        success: true,
        validationResults: result.violations.map((v: { ruleId: string; passed?: boolean }) => ({ ...v, passed: false })),
        passedRules: result.passed ? rulesResult.items.filter((r: { enabled: boolean }) => r.enabled).length - result.violations.length : 0,
        failedRules: result.violations.length,
      });
    } catch (error: any) {
      log.error({ err: error }, "error validating blog content");
      res.status(500).json({ error: error.message || "Failed to validate content" });
    }
  });

  // Get blog generation templates - Stub implementation
  app.get("/api/admin/blog/templates", async (_req: Request, res: Response) => {
    try {
      // Return predefined templates since getTemplates method doesn't exist
      const templates = [
        { id: "thought-leadership", name: "Thought Leadership Article", description: "CFO-focused strategic insight piece", wordCount: 2500 },
        { id: "how-to-guide", name: "How-To Guide", description: "Step-by-step implementation guide", wordCount: 2000 },
        { id: "industry-analysis", name: "Industry Analysis", description: "Market trends and analysis", wordCount: 3000 },
        { id: "case-study", name: "Case Study", description: "Real-world implementation story", wordCount: 1800 },
      ];
      res.json(templates);
    } catch (error: any) {
      log.error({ err: error }, "error fetching blog templates");
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // =====================================================
  // ADVANCED ANALYTICS ROUTES (Admin only)
  // =====================================================

  // Get real-time analytics data
  // Note: This endpoint returns stub data - full implementation would require AnalyticsService integration
  app.get("/api/admin/analytics/realtime", async (_req: Request, res: Response) => {
    try {
      // Return stub realtime analytics data
      // TODO: Wire up AnalyticsService.getRealtimeStats() for full implementation
      const realtimeData = {
        activeNow: 0,
        activePages: [],
        timestamp: new Date().toISOString(),
      };
      res.json(realtimeData);
    } catch (error: any) {
      log.error({ err: error }, "error fetching realtime analytics data");
      res.status(500).json({ error: "Failed to fetch realtime analytics" });
    }
  });

  // Note: /api/files/* and /api/resources/* routes have been moved to server/api/routes/resources.routes.ts

  // =====================================================
  // AI BLOG GENERATION PIPELINE ROUTES (with middleware)
  // =====================================================
  
  // Test guardrails against content
  app.post("/api/admin/guardrails/test", async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const rulesResult = await storage.getGuardrailRules();
      await blogGenerationService.initializeGuardrails(rulesResult.items);
      
      const result = await blogGenerationService.testContent(content);
      
      res.json({
        passed: result.passed,
        violations: result.violations,
      });
    } catch (error: any) {
      log.error({ err: error }, "error testing guardrail content");
      res.status(500).json({ error: error.message || "Failed to test content" });
    }
  });
  
  // Start a new blog generation job
  app.post("/api/admin/blog/generate", requireBlog, blogGenerateUserRateLimit, async (req: Request, res: Response) => {
    try {
      const { title, brief, targetKeywords, targetAudience, categoryId, useDeepResearch } = req.body;
      
      if (!title || !brief || !targetKeywords?.length) {
        return res.status(400).json({ 
          error: "Missing required fields: title, brief, and targetKeywords are required" 
        });
      }
      
      // Create job in database
      const job = await storage.createBlogGenerationJob({
        title,
        brief,
        targetKeywords,
        targetAudience: targetAudience || null,
        categoryId: categoryId || null,
        status: "pending",
        stage: null,
        researchData: null,
        citations: null,
        outlineData: null,
        finalContent: null,
        guardrailResults: null,
        errorMessage: null,
        totalTokensUsed: 0,
        estimatedCost: null,
        triggeredBy: "admin",
        updatedAt: null,
        completedAt: null,
      });
      
      // Load guardrail rules
      const rulesResult = await storage.getGuardrailRules();
      await blogGenerationService.initializeGuardrails(rulesResult.items);
      
      // Start async pipeline (don't await - respond immediately)
      runBlogGenerationPipeline(job.id, title, brief, targetKeywords, targetAudience, categoryId, useDeepResearch === true)
        .catch(async (err: any) => {
          log.error({ err, jobId: job.id }, "unhandled rejection in blog generation pipeline");
          try {
            const currentJob = await storage.getBlogGenerationJob(job.id);
            if (currentJob && currentJob.status !== "completed" && currentJob.status !== "failed") {
              await storage.updateBlogGenerationJob(job.id, {
                status: "failed",
                errorMessage: `Pipeline crashed: ${err.message}`,
                completedAt: new Date(),
                updatedAt: new Date()
              });
            }
          } catch (dbErr: any) {
            log.error({ err: dbErr, jobId: job.id }, "CRITICAL: failed to mark job as failed after crash");
          }
        });
      
      res.json({ 
        success: true, 
        jobId: job.id, 
        message: useDeepResearch ? "Blog generation started with Deep Research (8-10 searches)" : "Blog generation started"
      });
    } catch (error: any) {
      log.error({ err: error }, "error starting blog generation job");
      res.status(500).json({ error: error.message || "Failed to start blog generation" });
    }
  });
  
  // Get job status
  app.get("/api/admin/blog/generate/:id", requireBlog, async (req: Request, res: Response) => {
    try {
      const job = await storage.getBlogGenerationJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error: any) {
      log.error({ err: error }, "error fetching blog generation job");
      res.status(500).json({ error: "Failed to fetch job status" });
    }
  });
  
  // List all jobs
  app.get("/api/admin/blog/generate", requireBlog, async (req: Request, res: Response) => {
    try {
      const jobs = await storage.getBlogGenerationJobs();
      res.json(jobs);
    } catch (error: any) {
      log.error({ err: error }, "error fetching blog generation jobs");
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });
  
  // Publish generated blog to frontend
  app.post("/api/admin/blog/generate/:id/publish", requireBlog, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const { heroImageUrl, additionalEdits } = req.body;
      
      // Get the completed job
      const job = await storage.getBlogGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      if (job.status !== "completed") {
        return res.status(400).json({ 
          error: "Job is not completed. Current status: " + job.status 
        });
      }
      
      if (!job.finalContent) {
        return res.status(400).json({ error: "No content available to publish" });
      }
      
      // Parse the generated content
      let generatedPost;
      try {
        generatedPost = JSON.parse(job.finalContent);
      } catch {
        return res.status(400).json({ error: "Invalid content format" });
      }
      
      // Get category for proper linking
      const categories = await storage.getBlogCategories();
      let categoryId = job.categoryId;
      if (!categoryId && categories.length > 0) {
        categoryId = categories[0].id;
      }
      
      // Use stored content as the base
      const storedContent = generatedPost.content || "";
      const storedTitle = generatedPost.title || job.title;
      const storedExcerpt = generatedPost.excerpt || storedContent.substring(0, 160) + "...";
      const storedTags = generatedPost.tags || job.targetKeywords || [];
      
      const title = (additionalEdits?.title && additionalEdits.title.trim()) 
        ? additionalEdits.title 
        : storedTitle;
      const excerpt = (additionalEdits?.excerpt && additionalEdits.excerpt.trim()) 
        ? additionalEdits.excerpt 
        : storedExcerpt;
      
      let content = storedContent;
      if (additionalEdits?.content && additionalEdits.content.trim()) {
        const clientWordCount = additionalEdits.content.split(/\s+/).length;
        const storedWordCount = storedContent.split(/\s+/).length;
        
        if (clientWordCount >= storedWordCount * 0.8 || clientWordCount >= 1500) {
          content = additionalEdits.content;
        } else {
          log.warn("client content appears truncated, using stored content");
        }
      }
      
      const tags = (additionalEdits?.tags && Array.isArray(additionalEdits.tags) && additionalEdits.tags.length > 0)
        ? additionalEdits.tags 
        : storedTags;
      
      const baseSlug = generatedPost.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const slug = baseSlug + "-" + Date.now().toString(36);
      const heroImage = heroImageUrl || generatedPost.heroImage || "/placeholder-blog.jpg";
      
      const wordCount = content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200) + " min read";
      
      const newPost = {
        id: "blog-" + Date.now().toString(36) + "-" + Math.random().toString(36).substr(2, 5),
        title,
        slug,
        excerpt,
        content,
        heroImage,
        author: generatedPost.author || "Constancia Editorial Team",
        authorAvatar: "/avatars/constancia-avatar.png",
        readingTime,
        publishedAt: new Date().toISOString(),
        categoryId: categoryId || "",
        tags,
        featured: false,
        views: 0,
        rating: 0,
        ratingCount: 0,
      };
      
      log.info({ title: newPost.title }, "publishing blog post");
      const savedPost = await storage.createBlogPost(newPost);
      log.info({ postId: savedPost.id }, "blog post saved successfully");
      
      await storage.updateBlogGenerationJob(jobId, {
        status: "published",
        updatedAt: new Date()
      });
      
      res.json({ 
        success: true, 
        post: savedPost,
        message: "Blog post published successfully",
        viewUrl: "/blog/" + savedPost.slug
      });
      
    } catch (error: any) {
      log.error({ err: error }, "error publishing blog");
      res.status(500).json({ error: error.message || "Failed to publish blog" });
    }
  });
  
  // Regenerate content with feedback
  app.post("/api/admin/blog/generate/:id/regenerate", requireBlog, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const { feedback, fromStage } = req.body;
      
      const job = await storage.getBlogGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      if (job.status !== "completed" && job.status !== "failed") {
        return res.status(400).json({ 
          error: "Can only regenerate completed or failed jobs" 
        });
      }
      
      await storage.updateBlogGenerationJob(jobId, {
        status: "in_progress",
        stage: fromStage || "draft",
        finalContent: null,
        errorMessage: null,
        completedAt: null,
        updatedAt: new Date()
      });
      
      const rulesResult = await storage.getGuardrailRules();
      await blogGenerationService.initializeGuardrails(rulesResult.items);
      
      runRegenerationPipeline(
        jobId, 
        job.brief, 
        job.targetKeywords as string[], 
        job.targetAudience || undefined,
        job.categoryId || undefined,
        feedback,
        job.researchData || "",
        job.outlineData || "",
        JSON.parse(job.citations || "[]")
      );
      
      res.json({ 
        success: true, 
        jobId, 
        message: "Regeneration started" 
      });
    } catch (error: any) {
      log.error({ err: error }, "error starting blog regeneration");
      res.status(500).json({ error: error.message || "Failed to start regeneration" });
    }
  });
  
  // Quick fix for a specific section
  app.post("/api/admin/blog/generate/:id/fix-section", requireBlog, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const { targetType, issueCategory, description, rawMarker } = req.body;
      
      if (!rawMarker) {
        return res.status(400).json({ error: "rawMarker is required" });
      }
      
      const job = await storage.getBlogGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      // Invoke fix section logic
      // This is a placeholder that should call the blog generation service
      res.json({ 
        success: true, 
        message: "Section fix functionality available in full implementation" 
      });
    } catch (error: any) {
      log.error({ err: error }, "error fixing blog section");
      res.status(500).json({ error: error.message || "Failed to fix section" });
    }
  });
  
  // Retry failed job
  app.post("/api/admin/blog/generate/:id/retry", requireBlog, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      
      const job = await storage.getBlogGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      if (job.status !== "failed") {
        return res.status(400).json({ error: "Can only retry failed jobs" });
      }
      
      await storage.updateBlogGenerationJob(jobId, {
        status: "pending",
        errorMessage: null,
        updatedAt: new Date()
      });
      
      const rulesResult = await storage.getGuardrailRules();
      await blogGenerationService.initializeGuardrails(rulesResult.items);
      
      runBlogGenerationPipeline(job.id, job.title, job.brief, job.targetKeywords as string[], job.targetAudience || undefined, job.categoryId || undefined, false);
      
      res.json({ success: true, jobId, message: "Job retry started" });
    } catch (error: any) {
      log.error({ err: error }, "error retrying blog generation job");
      res.status(500).json({ error: error.message || "Failed to retry job" });
    }
  });

  // Get stock images for blog hero
  app.get("/api/admin/blog/stock-images", requireBlog, async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      const searchQuery = (query as string) || "business technology";
      
      // Return curated professional images for blog headers
      const stockImages = [
        { 
          url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop",
          alt: "Business analytics dashboard",
          category: "EPM"
        },
        { 
          url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop",
          alt: "Financial data visualization",
          category: "Finance"
        },
        { 
          url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&h=630&fit=crop",
          alt: "Enterprise planning meeting",
          category: "Strategy"
        },
        { 
          url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=630&fit=crop",
          alt: "AI and machine learning",
          category: "AI"
        },
        { 
          url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&h=630&fit=crop",
          alt: "Digital transformation",
          category: "Digital"
        },
        { 
          url: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=630&fit=crop",
          alt: "Cloud computing infrastructure",
          category: "Cloud"
        },
        { 
          url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=630&fit=crop",
          alt: "Technology innovation",
          category: "Innovation"
        },
        { 
          url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=630&fit=crop",
          alt: "Team collaboration",
          category: "Collaboration"
        }
      ];
      
      res.json({ images: stockImages });
    } catch (error: any) {
      log.error({ err: error }, "error fetching stock images");
      res.status(500).json({ error: "Failed to fetch stock images" });
    }
  });
  
  // Startup recovery: Mark abandoned "in_progress" jobs as failed
  async function recoverAbandonedJobs(): Promise<void> {
    try {
      const jobs = await storage.getBlogGenerationJobs();
      const inProgressJobs = jobs.filter(j => j.status === "in_progress");
      
      for (const job of inProgressJobs) {
        const updatedAt = job.updatedAt ? new Date(job.updatedAt).getTime() : 0;
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        
        if (updatedAt < twoMinutesAgo) {
          log.info({ jobId: job.id }, "marking abandoned job as failed");
          await storage.updateBlogGenerationJob(job.id, {
            status: "failed",
            errorMessage: "Job was interrupted by server restart. Click 'Retry' to resume from the last checkpoint.",
            completedAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    } catch (error) {
      log.error({ err: error }, "error recovering abandoned jobs");
    }
  }
  
  // Run recovery on startup
  recoverAbandonedJobs();

  // Pipeline context type
  interface PipelineContext {
    jobId: string;
    totalTokens: number;
    currentStage: string;
    guardrailResults: any[];
    retryCount: number;
    maxRetries: number;
  }

  // Update job status helper
  async function updateJobStatus(ctx: PipelineContext, updates: any): Promise<void> {
    await storage.updateBlogGenerationJob(ctx.jobId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  // Mark job as failed helper
  async function markJobFailed(ctx: PipelineContext, stage: string, errorMessage: string): Promise<void> {
    try {
      await storage.updateBlogGenerationJob(ctx.jobId, {
        status: "failed",
        stage,
        errorMessage,
        totalTokensUsed: ctx.totalTokens,
        guardrailResults: JSON.stringify(ctx.guardrailResults),
        completedAt: new Date(),
        updatedAt: new Date()
      });
    } catch (dbError: any) {
      log.error({ err: dbError, jobId: ctx.jobId }, "CRITICAL: could not update failure status");
    }
  }

  // Async pipeline runner
  async function runBlogGenerationPipeline(
    jobId: string,
    title: string,
    brief: string,
    targetKeywords: string[],
    targetAudience?: string,
    categoryId?: string,
    useDeepResearch: boolean = false
  ): Promise<void> {
    const ctx: PipelineContext = {
      jobId,
      totalTokens: 0,
      currentStage: "initializing",
      guardrailResults: [],
      retryCount: 0,
      maxRetries: 2
    };

    try {
      // Update status to in_progress
      await updateJobStatus(ctx, { status: "in_progress", stage: "research" });

      // Stage 1: Research
      ctx.currentStage = "research";
      let researchResult: any;
      
      try {
        researchResult = await blogGenerationService.runStage1Research(brief, targetKeywords, targetAudience);
        ctx.totalTokens += researchResult.tokensUsed || 0;
        
        await updateJobStatus(ctx, {
          stage: "outline",
          researchData: researchResult.output,
          citations: JSON.stringify(researchResult.citations || [])
        });
      } catch (err: any) {
        await markJobFailed(ctx, "research", `Research failed: ${err.message}`);
        return;
      }

      // Stage 2: Outline
      ctx.currentStage = "outline";
      let outlineResult: any;
      
      try {
        outlineResult = await blogGenerationService.runStage2Outline(
          brief,
          researchResult.output,
          researchResult.citations || [],
          targetKeywords
        );
        ctx.totalTokens += outlineResult.tokensUsed || 0;
        
        await updateJobStatus(ctx, {
          stage: "draft",
          outlineData: outlineResult.output
        });
      } catch (err: any) {
        await markJobFailed(ctx, "outline", `Outline failed: ${err.message}`);
        return;
      }

      // Stage 3: Draft (returns finalized mappedPost)
      ctx.currentStage = "draft";
      let draftResult: any;
      const categoryName = categoryId ? categoryId : "EPM Insights";
      
      try {
        draftResult = await blogGenerationService.runStage3DraftSectional(
          brief,
          outlineResult.output,
          researchResult.output,
          researchResult.citations || [],
          targetKeywords,
          categoryName
        );
        ctx.totalTokens += draftResult.tokensUsed || 0;
        
        await updateJobStatus(ctx, {
          stage: "quality_check",
          finalContent: draftResult.output
        });
      } catch (err: any) {
        await markJobFailed(ctx, "draft", `Draft failed: ${err.message}`);
        return;
      }

      // Stage 4: Quality Check with Winston AI
      ctx.currentStage = "quality_check";
      let winstonResults: any = null;
      let finalContent = draftResult.output;
      
      try {
        log.info({ jobId }, "running Winston AI quality check");
        
        // Run full Winston AI check (both AI detection and plagiarism)
        winstonResults = await runFullWinstonCheck(draftResult.output, title);
        
        log.info({ aiScore: winstonResults.aiResult.aiScore, plagiarismScore: winstonResults.plagiarismResult.plagiarismScore }, "Winston AI check complete");
        
        // Add Winston results to guardrails
        ctx.guardrailResults.push({
          source: "winston_ai",
          aiScore: winstonResults.aiResult.aiScore,
          humanScore: winstonResults.aiResult.humanScore,
          plagiarismScore: winstonResults.plagiarismResult.plagiarismScore,
          passed: winstonResults.passed,
          requiresRewrite: winstonResults.requiresRewrite,
          violations: winstonResults.allViolations,
          creditsUsed: winstonResults.totalCreditsUsed
        });
        
        // If AI score is too high and requires rewrite, attempt additional humanization
        if (winstonResults.requiresRewrite && winstonResults.aiResult.aiScore >= WINSTON_THRESHOLDS.AI_DETECTION.REQUIRE_REWRITE_SCORE) {
          log.info({ aiScore: winstonResults.aiResult.aiScore }, "AI score too high, attempting enhanced humanization");
          
          await updateJobStatus(ctx, { stage: "re_humanizing" });
          
          // Use lightweight humanization on existing content (not full draft regeneration)
          try {
            finalContent = await blogGenerationService.humanizeContent(draftResult.output);
            log.info("re-humanization complete");
            
            ctx.guardrailResults.push({
              source: "re_humanization",
              action: "enhanced_humanization_applied",
              originalAiScore: winstonResults.aiResult.aiScore
            });
          } catch (rehumanizeErr: any) {
            log.warn({ err: rehumanizeErr }, "re-humanization failed, using original content");
          }
        }
        
      } catch (winstonErr: any) {
        log.warn({ err: winstonErr }, "Winston AI check failed (non-blocking)");
        ctx.guardrailResults.push({
          source: "winston_ai",
          error: winstonErr.message,
          passed: true // Don't block on Winston AI failures
        });
      }

      // Stage 5: Complete
      await storage.updateBlogGenerationJob(jobId, {
        status: "completed",
        stage: "completed",
        finalContent: finalContent,
        totalTokensUsed: ctx.totalTokens,
        guardrailResults: JSON.stringify(ctx.guardrailResults),
        completedAt: new Date(),
        updatedAt: new Date()
      });
      
      log.info({ jobId, totalTokens: ctx.totalTokens }, "pipeline job completed successfully")

    } catch (error: any) {
      log.error({ err: error, jobId }, "unhandled error in pipeline job");
      await markJobFailed(ctx, ctx.currentStage, `Pipeline error: ${error.message}`);
    }
  }

  // Regeneration pipeline
  async function runRegenerationPipeline(
    jobId: string,
    brief: string,
    targetKeywords: string[],
    targetAudience?: string,
    categoryId?: string,
    feedback?: string,
    existingResearch?: string,
    existingOutline?: string,
    existingCitations?: any[]
  ): Promise<void> {
    const ctx: PipelineContext = {
      jobId,
      totalTokens: 0,
      currentStage: "regenerating",
      guardrailResults: [],
      retryCount: 0,
      maxRetries: 2
    };

    try {
      // Get the original job for title
      const originalJob = await storage.getBlogGenerationJob(jobId);
      if (!originalJob) {
        throw new Error("Original job not found");
      }

      const categoryName = categoryId ? categoryId : "EPM Insights";

      // Run draft (returns finalized mappedPost)
      const draftResult = await blogGenerationService.runStage3DraftSectional(
        brief,
        existingOutline || "",
        existingResearch || "",
        existingCitations || [],
        targetKeywords,
        categoryName
      );
      ctx.totalTokens += draftResult.tokensUsed || 0;

      // Run Winston AI quality check (non-blocking)
      let finalContent = draftResult.output;
      try {
        log.info({ jobId }, "running Winston AI check for regeneration job");
        const winstonResults = await runFullWinstonCheck(draftResult.output, originalJob.title || "");
        
        log.info({ aiScore: winstonResults.aiResult.aiScore, plagiarismScore: winstonResults.plagiarismResult.plagiarismScore }, "Winston AI check results for regeneration");
        
        ctx.guardrailResults.push({
          source: "winston_ai",
          aiScore: winstonResults.aiResult.aiScore,
          humanScore: winstonResults.aiResult.humanScore,
          plagiarismScore: winstonResults.plagiarismResult.plagiarismScore,
          passed: winstonResults.passed,
          creditsUsed: winstonResults.totalCreditsUsed
        });
      } catch (winstonErr: any) {
        log.warn({ err: winstonErr }, "Winston AI check failed for regeneration (non-blocking)");
        ctx.guardrailResults.push({
          source: "winston_ai",
          error: winstonErr.message,
          passed: true
        });
      }

      await storage.updateBlogGenerationJob(jobId, {
        status: "completed",
        stage: "completed",
        finalContent: finalContent,
        totalTokensUsed: ctx.totalTokens,
        guardrailResults: JSON.stringify(ctx.guardrailResults),
        completedAt: new Date(),
        updatedAt: new Date()
      });

      log.info({ jobId, totalTokens: ctx.totalTokens }, "regeneration completed");
    } catch (error: any) {
      log.error({ err: error, jobId }, "regeneration error");
      await markJobFailed(ctx, ctx.currentStage, `Regeneration failed: ${error.message}`);
    }
  }

  // =====================================================
  // SEO AND EXPORT ROUTES
  // =====================================================

  // Get structured data for SEO
  app.get("/api/seo/structured-data", async (_req: Request, res: Response) => {
    try {
      // Return organization schema
      const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Constancia",
        url: "https://constancia.com",
        logo: "https://constancia.com/logo.png"
      };
      res.json(schema);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate structured data" });
    }
  });

  // Export to WordPress format
  app.post("/api/export/wordpress", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      // Placeholder for WordPress export
      res.json({ 
        success: true, 
        message: "WordPress export functionality" 
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to export" });
    }
  });

  // Continue with remaining legitimate routes below
  // Note: /api/resources/* and /api/files/* routes are in server/api/routes/resources.routes.ts

  // =====================================================
  // FINANCECOMPASS ROUTES
  // =====================================================

  // Public routes registration is handled in server/finance-compass/public-routes.ts
  // Admin routes registration is handled in server/finance-compass/admin-routes.ts

  // =====================================================
  // PDF TEST ENDPOINT (DEV ONLY)
  // =====================================================
  app.get("/dev/test-adobe-pdf", async (_req: Request, res: Response) => {
    try {
      const { generateDocumentPDF, isAdobePDFConfigured } = await import("./services/pdf");
      
      const testDocument = {
        title: "Sample PDF Test Document",
        subtitle: "Adobe PDF Services Integration",
        category: "Development Test",
        description: "This is a test document to validate the Adobe PDF Services integration. It demonstrates the pixel-perfect PDF generation capabilities with professional branding and typography.",
        sections: [
          {
            heading: "Introduction",
            type: "text" as const,
            content: "This document tests the unified PDF generation service. It supports multiple content types including text, lists, checklists, tables, and metric cards.",
          },
          {
            heading: "Key Features",
            type: "list" as const,
            content: "",
            items: [
              { text: "Professional branding with Constancia colours", context: "Graphite, cream, rose, mint palette" },
              { text: "Pixel-perfect typography using Inter font", context: "Consistent font weights and sizes" },
              { text: "Support for multiple content types", context: "Text, lists, tables, metrics" },
              "Adobe PDF Services API integration",
              "Puppeteer fallback for development",
            ],
          },
          {
            heading: "Sample Metrics",
            type: "metrics" as const,
            content: "",
            cards: [
              { title: "PDF Quality", value: "100%", subtitle: "Pixel-perfect output" },
              { title: "Formats", value: "4+", subtitle: "Content types supported" },
              { title: "API Status", value: isAdobePDFConfigured() ? "Active" : "Fallback", color: isAdobePDFConfigured() ? "#10B981" : "#C77A93" },
            ],
          },
        ],
        publishedAt: new Date().toISOString(),
        version: "1.0.0",
        showTableOfContents: true,
        showExecutiveSummary: true,
        showAboutSection: true,
        showDisclaimer: true,
      };

      const result = await generateDocumentPDF(testDocument, {
        compress: 'MEDIUM',
        linearize: true,
        watermark: { position: 'corner', opacity: 0.15 }
      });
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="constancia-pdf-test.pdf"');
      res.setHeader("X-PDF-Method", result.method);
      res.send(result.buffer);
    } catch (error: any) {
      log.error({ err: error }, "PDF test error");
      res.status(500).json({ 
        error: "PDF generation failed", 
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  });

  // End of registerRoutes function
  // All modular routes (blog, chat, contact, analytics, resources) are registered via modularRoutes at line 762

  return httpServer;
}

// Helper functions for static site export (kept outside registerRoutes)
// DUPLICATE_ROUTES_REMOVED: All content between here and the helper functions
function generateWordPressHTML(): string {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>Constancia | Connected Finance Intelligence</title>
  <meta name="title" content="Constancia | Connected Finance Intelligence">
  <meta name="description" content="Constancia delivers connected finance intelligence. We bring disparate finance systems together — ERP, EPM, HRIS, CRM, data warehouse — so finance leaders get one source of truth. Official Abacum partner for mid-market FP&amp;A. OneStream partner for enterprise EPM.">
  <meta name="keywords" content="EPM advisory, FP&amp;A, finance transformation, Abacum partner, OneStream partner, AI finance, CFO advisory">
  <meta name="author" content="Constancia">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://constancia.com/">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://constancia.com/">
  <meta property="og:title" content="Constancia | Connected Finance Intelligence">
  <meta property="og:description" content="AI-first EPM advisory. Official Abacum and OneStream partner.">
  <meta property="og:image" content="https://constancia.com/og-image.png">
  <meta property="og:site_name" content="Constancia">
  <meta property="og:locale" content="en_GB">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://constancia.com/">
  <meta name="twitter:title" content="Constancia | Connected Finance Intelligence">
  <meta name="twitter:description" content="AI-first EPM advisory. Official Abacum and OneStream partner.">
  <meta name="twitter:image" content="https://constancia.com/og-image.png">

  <meta name="theme-color" content="#12161D">
  
  <link rel="stylesheet" href="style.css">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Constancia",
    "legalName": "Constancia Holdings Limited",
    "url": "https://constancia.com",
    "logo": "https://constancia.com/logo.png",
    "description": "AI-first EPM advisory. Official Abacum and OneStream partner.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Blount House, Hall Court, Hall Park Way",
      "addressLocality": "Telford",
      "addressRegion": "Shropshire",
      "postalCode": "TF3 4NQ",
      "addressCountry": "GB"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "info@constancia.io",
      "contactType": "customer service",
      "availableLanguage": "English"
    },
    "areaServed": ["GB", "IE"],
    "knowsAbout": ["Enterprise Performance Management", "Financial Planning and Analysis", "Finance Transformation", "Abacum", "OneStream", "AI for Finance"]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Constancia",
    "url": "https://constancia.com",
    "description": "AI-first EPM advisory."
  }
  </script>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  
  <header class="site-header" role="banner">
    <nav class="nav-container" role="navigation" aria-label="Main navigation">
      <a href="/" class="logo">
        <div class="logo-icon">1Q</div>
        <span class="logo-text">Constancia</span>
      </a>
      <div class="nav-links">
        <a href="#services">Services</a>
        <a href="#about">About</a>
        <a href="#solutions">Solutions</a>
        <a href="#contact">Contact</a>
      </div>
      <a href="#contact" class="btn btn-primary">Get Started</a>
    </nav>
  </header>

  <main id="main-content">
    <section class="hero" aria-labelledby="hero-heading">
      <div class="hero-content">
        <span class="badge">Independent Finance Consultancy</span>
        <h1 id="hero-heading">Modernise Your Finance Function with Confidence</h1>
        <p class="hero-description">Your finance function, finally connected. Constancia brings disparate finance systems together so CFOs get one source of truth — from ERP to EPM, and everything in between. Official Abacum partner for mid-market FP&amp;A. OneStream partner for enterprise EPM.</p>
        <div class="hero-buttons">
          <a href="#contact" class="btn btn-primary btn-lg">Start Your Transformation</a>
          <a href="#services" class="btn btn-outline btn-lg">Explore Services</a>
        </div>
      </div>
    </section>

    <section id="services" class="services" aria-labelledby="services-heading">
      <div class="container">
        <span class="badge">Our Services</span>
        <h2 id="services-heading">Expert Finance Transformation Services</h2>
        <p class="section-description">From independent advisory to full implementation, we deliver comprehensive solutions that optimise your finance function.</p>
        
        <div class="services-grid">
          <article class="service-card">
            <h3>Independent Advisory</h3>
            <p>Vendor-neutral guidance for finance transformation, ERP selection, and strategic roadmap development.</p>
          </article>
          <article class="service-card">
            <h3>EPM Implementation</h3>
            <p>Expert deployment of planning, budgeting, and consolidation solutions including Anaplan, OneStream, and Board.</p>
          </article>
          <article class="service-card">
            <h3>ERP Transformation</h3>
            <p>Oracle Cloud and enterprise system implementations tailored to finance requirements.</p>
          </article>
          <article class="service-card">
            <h3>Process Optimisation</h3>
            <p>Streamline financial close, reporting, and analytical processes for greater efficiency.</p>
          </article>
          <article class="service-card">
            <h3>AI-Driven Insights</h3>
            <p>Leverage artificial intelligence to enhance forecasting, anomaly detection, and decision support.</p>
          </article>
          <article class="service-card">
            <h3>Expert Support</h3>
            <p>Ongoing managed services and technical support for your finance technology estate.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="about" class="about" aria-labelledby="about-heading">
      <div class="container">
        <span class="badge">About Constancia</span>
        <h2 id="about-heading">Your Trusted Finance Technology Partner</h2>
        <p>Constancia delivers connected finance intelligence. We bring every finance system together — ERP, EPM, HRIS, CRM, data warehouse, and the spreadsheets nobody talks about — into one source of truth, so CFOs decide on agreement instead of approximation.</p>
        
        <ul class="benefits-list">
          <li>Vendor-neutral advice focused on your organisation's needs</li>
          <li>Experienced consultants with finance and technology backgrounds</li>
          <li>Proven methodologies refined across diverse implementations</li>
          <li>Commitment to knowledge transfer and sustainable solutions</li>
        </ul>
      </div>
    </section>

    <section class="stats" aria-labelledby="stats-heading">
      <h2 id="stats-heading" class="sr-only">Our Track Record</h2>
      <div class="stats-grid">
        <div class="stat">
          <span class="stat-value">15+</span>
          <span class="stat-label">Years Experience</span>
        </div>
        <div class="stat">
          <span class="stat-value">100+</span>
          <span class="stat-label">Successful Projects</span>
        </div>
        <div class="stat">
          <span class="stat-value">50+</span>
          <span class="stat-label">Enterprise Clients</span>
        </div>
        <div class="stat">
          <span class="stat-value">UK & IE</span>
          <span class="stat-label">Primary Markets</span>
        </div>
      </div>
    </section>

    <section id="solutions" class="solutions" aria-labelledby="solutions-heading">
      <div class="container">
        <span class="badge">Platform Expertise</span>
        <h2 id="solutions-heading">Leading Technology Platforms</h2>
        
        <div class="solutions-grid">
          <article class="solution-card">
            <h3>Oracle Cloud</h3>
            <p>Comprehensive ERP and EPM implementations for enterprise finance</p>
          </article>
          <article class="solution-card">
            <h3>Anaplan</h3>
            <p>Connected planning across finance, sales, and operations</p>
          </article>
          <article class="solution-card">
            <h3>OneStream</h3>
            <p>Unified platform for financial consolidation and planning</p>
          </article>
          <article class="solution-card">
            <h3>Board</h3>
            <p>Intelligent planning and business intelligence solutions</p>
          </article>
        </div>
      </div>
    </section>

    <section class="cta" aria-labelledby="cta-heading">
      <div class="container">
        <h2 id="cta-heading">Ready to Transform Your Finance Function?</h2>
        <p>Partner with Constancia for AI-first EPM advisory on your finance transformation journey.</p>
        <div class="cta-buttons">
          <a href="#contact" class="btn btn-white btn-lg">Schedule a Consultation</a>
          <a href="#contact" class="btn btn-outline-white btn-lg">Contact Us</a>
        </div>
      </div>
    </section>

    <section id="contact" class="contact" aria-labelledby="contact-heading">
      <div class="container">
        <span class="badge">Get in Touch</span>
        <h2 id="contact-heading">Let's Discuss Your Requirements</h2>
        
        <div class="contact-grid">
          <div class="contact-info">
            <h3>Contact Information</h3>
            <div class="contact-item">
              <span>Email:</span>
              <a href="mailto:info@constancia.io">info@constancia.io</a>
            </div>
            <div class="contact-item">
              <span>Address:</span>
              <address>Blount House, Hall Court, Hall Park Way, Telford, TF3 4NQ</address>
            </div>
          </div>
          
          <form class="contact-form" action="#" method="post">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="company">Organisation</label>
              <input type="text" id="company" name="company">
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-lg">Send Message</button>
          </form>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer" role="contentinfo">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="logo">
            <div class="logo-icon">1Q</div>
            <span class="logo-text">Constancia</span>
          </a>
          <p>Independent ERP and EPM consultancy delivering AI-powered finance transformation.</p>
        </div>
        
        <div class="footer-links">
          <h4>Company</h4>
          <ul>
            <li><a href="#about">About Us</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/resources">Resources</a></li>
          </ul>
        </div>
        
        <div class="footer-links">
          <h4>Platforms</h4>
          <ul>
            <li><a href="#solutions">Oracle Cloud</a></li>
            <li><a href="#solutions">Anaplan</a></li>
            <li><a href="#solutions">OneStream</a></li>
            <li><a href="#solutions">Board</a></li>
          </ul>
        </div>
        
        <div class="footer-links">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Cookie Policy</a></li>
          </ul>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Constancia Holdings Limited. All rights reserved. Company number 17227112.</p>
        <div class="footer-meta">
          <a href="/sitemap.xml">Sitemap</a>
          <a href="/robots.txt">Robots.txt</a>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function generateWordPressCSS(): string {
  return `/* Constancia WordPress Theme Styles */
:root {
  --dark-navy: #12161D;
  --bright-cyan: #7FB8A3;
  --teal: #8E4F67;
  --primary: #12161D;
  --primary-foreground: #ffffff;
  --accent: #7FB8A3;
  --background: #F6F3EE;
  --foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --border: #D8D0C6;
  --card: #ffffff;
  --radius: 0.5rem;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--background);
  color: var(--foreground);
  line-height: 1.6;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Skip Link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: var(--primary-foreground);
  padding: 8px 16px;
  z-index: 100;
  text-decoration: none;
}
.skip-link:focus {
  top: 0;
}

/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Header */
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.nav-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  background: var(--primary);
  color: var(--primary-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--foreground);
}

.nav-links {
  display: flex;
  gap: 0.25rem;
}

.nav-links a {
  padding: 0.5rem 1rem;
  color: var(--foreground);
  text-decoration: none;
  font-weight: 500;
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.nav-links a:hover {
  background: var(--muted);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--border);
  color: var(--foreground);
}

.btn-outline:hover {
  background: var(--muted);
}

.btn-white {
  background: white;
  color: var(--primary);
}

.btn-outline-white {
  background: transparent;
  border: 2px solid rgba(255,255,255,0.3);
  color: white;
}

.btn-lg {
  padding: 0.875rem 2rem;
  font-size: 1.125rem;
}

/* Badge */
.badge {
  display: inline-block;
  padding: 0.375rem 1rem;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 999px;
  margin-bottom: 1rem;
}

/* Hero */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--dark-navy) 0%, var(--teal) 50%, var(--bright-cyan) 100%);
  color: white;
  text-align: center;
  padding: 6rem 1.5rem 4rem;
}

.hero-content {
  max-width: 900px;
}

.hero h1 {
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.hero .badge {
  background: rgba(255,255,255,0.15);
  color: white;
}

.hero-description {
  font-size: 1.25rem;
  opacity: 0.9;
  max-width: 700px;
  margin: 0 auto 2.5rem;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Sections */
section {
  padding: 6rem 0;
}

section h2 {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
}

.section-description {
  font-size: 1.125rem;
  color: var(--muted-foreground);
  text-align: center;
  max-width: 800px;
  margin: 0 auto 3rem;
}

/* Services */
.services {
  background: var(--muted);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.service-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.service-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.service-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.service-card p {
  color: var(--muted-foreground);
}

/* About */
.benefits-list {
  list-style: none;
  max-width: 600px;
  margin: 2rem auto 0;
}

.benefits-list li {
  padding: 0.75rem 0;
  padding-left: 2rem;
  position: relative;
}

.benefits-list li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--primary);
  font-weight: 700;
}

/* Stats */
.stats {
  background: var(--primary);
  color: white;
  padding: 5rem 1.5rem;
}

.stats-grid {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1.125rem;
  opacity: 0.9;
}

/* Solutions */
.solutions {
  background: var(--muted);
}

.solutions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.solution-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
}

.solution-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.solution-card p {
  color: var(--muted-foreground);
}

/* CTA */
.cta {
  background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);
  color: white;
  text-align: center;
}

.cta h2 {
  color: white;
}

.cta p {
  font-size: 1.25rem;
  opacity: 0.9;
  margin-bottom: 2rem;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Contact */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 3rem;
  margin-top: 3rem;
}

@media (max-width: 768px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }
}

.contact-info h3 {
  margin-bottom: 1.5rem;
}

.contact-item {
  margin-bottom: 1rem;
}

.contact-item span {
  color: var(--muted-foreground);
}

.contact-item a {
  color: var(--foreground);
  text-decoration: none;
}

.contact-form {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Footer */
.site-footer {
  background: var(--foreground);
  color: var(--background);
  padding: 4rem 0 2rem;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.footer-brand .logo-text {
  color: var(--background);
}

.footer-brand p {
  margin-top: 1rem;
  opacity: 0.7;
  max-width: 300px;
}

.footer-links h4 {
  margin-bottom: 1rem;
}

.footer-links ul {
  list-style: none;
}

.footer-links li {
  margin-bottom: 0.5rem;
}

.footer-links a {
  color: inherit;
  opacity: 0.7;
  text-decoration: none;
  transition: opacity 0.2s;
}

.footer-links a:hover {
  opacity: 1;
}

.footer-bottom {
  padding-top: 2rem;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.footer-bottom p {
  opacity: 0.6;
  font-size: 0.875rem;
}

.footer-meta {
  display: flex;
  gap: 1.5rem;
}

.footer-meta a {
  color: inherit;
  opacity: 0.6;
  text-decoration: none;
  font-size: 0.875rem;
}

.footer-meta a:hover {
  opacity: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  
  .hero {
    padding-top: 5rem;
  }
  
  section {
    padding: 4rem 0;
  }
}

/* Blog Styles */
.blog-hero {
  background: linear-gradient(135deg, var(--primary) 0%, #8E4F67 100%);
  color: white;
  padding: 4rem 0;
  text-align: center;
}

.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  padding: 3rem 0;
}

.blog-card {
  background: var(--card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.blog-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.blog-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.blog-card-content {
  padding: 1.5rem;
}

.blog-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.blog-card p {
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

.blog-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--muted);
  margin-top: 1rem;
}

.article-header {
  background: linear-gradient(135deg, var(--primary) 0%, #8E4F67 100%);
  color: white;
  padding: 4rem 0 6rem;
  text-align: center;
}

.article-content {
  max-width: 800px;
  margin: -3rem auto 0;
  background: var(--background);
  padding: 3rem;
  border-radius: var(--radius);
  box-shadow: 0 10px 50px rgba(0,0,0,0.1);
}

.article-content h1 { font-size: 2rem; margin-top: 2rem; margin-bottom: 1rem; color: var(--primary); }
.article-content h2 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; color: var(--primary); border-bottom: 2px solid #7FB8A3; padding-bottom: 0.5rem; }
.article-content h3 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #8E4F67; }
.article-content h4 { font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem; }
.article-content p { margin-bottom: 1rem; line-height: 1.8; }
.article-content ul, .article-content ol { margin-bottom: 1rem; padding-left: 2rem; }
.article-content li { margin-bottom: 0.5rem; line-height: 1.6; }
.article-content blockquote { border-left: 4px solid #7FB8A3; padding-left: 1rem; margin: 1.5rem 0; background: rgba(18, 235, 252, 0.05); padding: 1rem; border-radius: 0 8px 8px 0; }
.article-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
.article-content th { background: var(--primary); color: white; padding: 1rem; text-align: left; }
.article-content td { padding: 1rem; border: 1px solid var(--border); }
.article-content tr:nth-child(even) { background: rgba(0,0,0,0.02); }
.article-content strong { color: var(--foreground); }

.callout-box {
  background: linear-gradient(135deg, rgba(18, 235, 252, 0.1) 0%, rgba(8, 132, 170, 0.1) 100%);
  border-left: 4px solid #7FB8A3;
  padding: 1.5rem;
  margin: 1.5rem 0;
  border-radius: 0 8px 8px 0;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.stat-box {
  background: linear-gradient(135deg, var(--primary) 0%, #8E4F67 100%);
  color: white;
  padding: 1.5rem;
  border-radius: var(--radius);
  text-align: center;
}

.stat-box .stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #7FB8A3;
}

.stat-box .stat-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.tag {
  background: rgba(18, 235, 252, 0.1);
  color: #8E4F67;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
}`;
}

function convertMarkdownToHTML(content: string): string {
  let html = content;
  
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  html = html.replace(/^\| (.+) \|$/gm, (match, content) => {
    const cells = content.split(' | ').map((cell: string) => `<td>${cell.trim()}</td>`).join('');
    return `<tr>${cells}</tr>`;
  });
  html = html.replace(/^\|[-|]+\|$/gm, '');
  html = html.replace(new RegExp('(<tr>.*<\\/tr>\\s*)+', 'gm'), '<table>$&</table>');
  
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(new RegExp('(<li>.*<\\/li>\\s*)+', 'gm'), '<ul>$&</ul>');
  
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  const lines = html.split('\n');
  const result: string[] = [];
  let inParagraph = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      continue;
    }
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || 
        trimmed.startsWith('<li') || trimmed.startsWith('<table') || trimmed.startsWith('<tr') ||
        trimmed.startsWith('<blockquote') || trimmed.startsWith('</')) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push('<p>');
        inParagraph = true;
      }
      result.push(trimmed);
    }
  }
  if (inParagraph) {
    result.push('</p>');
  }
  
  return result.join('\n');
}

function generateBlogPostHTML(post: { title: string; slug: string; excerpt: string; content: string; heroImage?: string; tags: string[]; author: string; publishedAt: string; readingTime: string; }, categoryName: string): string {
  const contentHtml = convertMarkdownToEnrichedHTML(post.content);
  
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title} | Constancia</title>
  <meta name="description" content="${post.excerpt}">
  <meta name="keywords" content="${post.tags.join(', ')}">
  <meta name="author" content="${post.author}">
  <link rel="canonical" href="https://constancia.com/blog/${post.slug}">
  
  <meta property="og:type" content="article">
  <meta property="og:title" content="${post.title}">
  <meta property="og:description" content="${post.excerpt}">
  ${post.heroImage ? `<meta property="og:image" content="${post.heroImage}">` : ''}
  <meta property="article:published_time" content="${post.publishedAt}">
  <meta property="article:author" content="${post.author}">
  <meta property="article:section" content="${categoryName}">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${post.title}">
  <meta name="twitter:description" content="${post.excerpt}">
  
  <link rel="stylesheet" href="../style.css">
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${post.title}",
    "description": "${post.excerpt}",
    ${post.heroImage ? `"image": "${post.heroImage}",` : ''}
    "author": {
      "@type": "Person",
      "name": "${post.author}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Constancia",
      "logo": {
        "@type": "ImageObject",
        "url": "https://constancia.com/logo.png"
      }
    },
    "datePublished": "${post.publishedAt}",
    "articleSection": "${categoryName}"
  }
  </script>
</head>
<body>
  <header class="site-header">
    <nav class="nav-container">
      <a href="../index.html" class="logo">
        <div class="logo-icon">1Q</div>
        <span class="logo-text">Constancia</span>
      </a>
      <div class="nav-links">
        <a href="../index.html#services">Services</a>
        <a href="../index.html#about">About</a>
        <a href="index.html">Blog</a>
        <a href="../index.html#contact">Contact</a>
      </div>
    </nav>
  </header>

  <main>
    <div class="article-header">
      <div class="container">
        <span class="badge">${categoryName}</span>
        <h1>${post.title}</h1>
        <p>${post.excerpt}</p>
        <div class="blog-meta" style="justify-content: center; color: rgba(255,255,255,0.8);">
          <span>${post.author}</span>
          <span>|</span>
          <span>${new Date(post.publishedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>|</span>
          <span>${post.readingTime}</span>
        </div>
      </div>
    </div>
    
    ${post.heroImage ? `<div class="container" style="margin-top: -3rem;"><img src="${post.heroImage}" alt="${post.title}" style="width: 100%; max-width: 900px; margin: 0 auto; display: block; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);"></div>` : ''}
    
    <article class="article-content">
      ${contentHtml}
      
      <div class="tag-list">
        ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </article>
    
    <div class="container" style="text-align: center; padding: 3rem 0;">
      <a href="index.html" class="btn btn-outline">← Back to Blog</a>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Constancia Holdings Limited. All rights reserved.</p>
        <div class="footer-meta">
          <a href="https://constancia.com">constancia.com</a>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function generateBlogIndexHTML(posts: Array<{ title: string; slug: string; excerpt: string; heroImage?: string; author: string; publishedAt: string; readingTime: string; categoryId: string; }>, categories: Array<{ id: string; name: string; }>): string {
  const getCategoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name || 'Uncategorised';
  
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog | Constancia Finance Transformation Insights</title>
  <meta name="description" content="Expert insights on finance transformation, EPM, ERP, AI, and technology from Constancia advisors.">
  <link rel="canonical" href="https://constancia.com/blog">
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="Constancia Blog - Finance Transformation Insights">
  <meta property="og:description" content="Expert insights on finance transformation, EPM, ERP, AI, and technology.">
  
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <header class="site-header">
    <nav class="nav-container">
      <a href="../index.html" class="logo">
        <div class="logo-icon">1Q</div>
        <span class="logo-text">Constancia</span>
      </a>
      <div class="nav-links">
        <a href="../index.html#services">Services</a>
        <a href="../index.html#about">About</a>
        <a href="index.html" class="active">Blog</a>
        <a href="../index.html#contact">Contact</a>
      </div>
    </nav>
  </header>

  <main>
    <section class="blog-hero">
      <div class="container">
        <span class="badge">Insights & Research</span>
        <h1>Constancia Blog</h1>
        <p>Expert analysis on finance transformation, EPM, ERP, and AI from our team of consultants.</p>
      </div>
    </section>
    
    <section class="container">
      <div class="blog-grid">
        ${posts.map(post => `
          <article class="blog-card">
            ${post.heroImage ? `<img src="${post.heroImage}" alt="${post.title}">` : ''}
            <div class="blog-card-content">
              <span class="badge" style="margin-bottom: 0.75rem; display: inline-block;">${getCategoryName(post.categoryId)}</span>
              <h3><a href="${post.slug}.html" style="color: inherit; text-decoration: none;">${post.title}</a></h3>
              <p>${post.excerpt}</p>
              <div class="blog-meta">
                <span>${post.author}</span>
                <span>${new Date(post.publishedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <span>${post.readingTime}</span>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Constancia Holdings Limited. All rights reserved.</p>
        <div class="footer-meta">
          <a href="https://constancia.com">constancia.com</a>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function generateResourcesIndexHTML(resources: Array<{ title: string; slug: string; description: string; category: string; fileType: string; fileSize: string; downloadCount: number; publishedAt: string; }>): string {
  const categories = Array.from(new Set(resources.map(r => r.category)));
  
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resources | Constancia Finance Transformation Downloads</title>
  <meta name="description" content="Download free guides, frameworks, playbooks, and templates for finance transformation, EPM, and ERP from Constancia.">
  <link rel="canonical" href="https://constancia.com/resources">
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <header class="site-header">
    <nav class="nav-container">
      <a href="../index.html" class="logo">
        <div class="logo-icon">1Q</div>
        <span class="logo-text">Constancia</span>
      </a>
      <div class="nav-links">
        <a href="../index.html#services">Services</a>
        <a href="../blog/index.html">Blog</a>
        <a href="index.html" class="active">Resources</a>
        <a href="../index.html#contact">Contact</a>
      </div>
    </nav>
  </header>
  <main>
    <section class="blog-hero">
      <div class="container">
        <span class="badge">Free Downloads</span>
        <h1>Constancia Resources</h1>
        <p>Guides, frameworks, playbooks, and templates to accelerate your finance transformation.</p>
      </div>
    </section>
    ${categories.map(category => `
      <section class="container" style="padding: 2rem 0;">
        <h2 style="color: #12161D; margin-bottom: 1.5rem; border-bottom: 2px solid #7FB8A3; padding-bottom: 0.5rem;">${category}</h2>
        <div class="blog-grid">
          ${resources.filter(r => r.category === category).map(resource => `
            <article class="blog-card">
              <div class="blog-card-content">
                <span class="badge" style="margin-bottom: 0.75rem; display: inline-block;">${resource.fileType.toUpperCase()}</span>
                <h3><a href="${resource.slug}.html" style="color: inherit; text-decoration: none;">${resource.title}</a></h3>
                <p>${resource.description}</p>
                <div class="blog-meta">
                  <span>${resource.fileSize}</span>
                  <span>${resource.downloadCount} downloads</span>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `).join('')}
  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Constancia Holdings Limited. All rights reserved.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function generateResourcePageHTML(resource: { title: string; slug: string; description: string; category: string; fileType: string; fileUrl: string; fileSize: string; downloadCount: number; publishedAt: string; }): string {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resource.title} | Constancia Resources</title>
  <meta name="description" content="${resource.description}">
  <link rel="canonical" href="https://constancia.com/resources/${resource.slug}">
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <header class="site-header">
    <nav class="nav-container">
      <a href="../index.html" class="logo">
        <div class="logo-icon">1Q</div>
        <span class="logo-text">Constancia</span>
      </a>
      <div class="nav-links">
        <a href="../index.html#services">Services</a>
        <a href="../blog/index.html">Blog</a>
        <a href="index.html">Resources</a>
        <a href="../index.html#contact">Contact</a>
      </div>
    </nav>
  </header>
  <main>
    <div class="article-header">
      <div class="container">
        <span class="badge">${resource.category}</span>
        <h1>${resource.title}</h1>
        <p>${resource.description}</p>
        <div class="blog-meta" style="justify-content: center; color: rgba(255,255,255,0.8);">
          <span>${resource.fileType.toUpperCase()}</span>
          <span>|</span>
          <span>${resource.fileSize}</span>
        </div>
      </div>
    </div>
    <article class="article-content">
      <div class="callout-box" style="text-align: center;">
        <h3 style="margin-top: 0;">Download This Resource</h3>
        <p>Click below to download this ${resource.fileType.toUpperCase()} file.</p>
        <a href="${resource.fileUrl}" class="btn btn-primary btn-lg" download>Download ${resource.title}</a>
      </div>
      <h2>About This Resource</h2>
      <p>${resource.description}</p>
      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-value">${resource.fileType.toUpperCase()}</div>
          <div class="stat-label">File Type</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${resource.fileSize}</div>
          <div class="stat-label">File Size</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${resource.downloadCount}</div>
          <div class="stat-label">Downloads</div>
        </div>
      </div>
    </article>
    <div class="container" style="text-align: center; padding: 3rem 0;">
      <a href="index.html" class="btn btn-outline">Back to Resources</a>
    </div>
  </main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Constancia Holdings Limited. All rights reserved.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function generateWordPressWXR(
  posts: Array<{ id: string; title: string; slug: string; excerpt: string; content: string; heroImage?: string; tags: string[]; author: string; publishedAt: string; categoryId: string; }>,
  categories: Array<{ id: string; name: string; slug: string; description?: string; }>,
  resources: Array<{ id: string; title: string; slug: string; description: string; category: string; fileType: string; fileUrl: string; fileSize: string; publishedAt: string; }>
): string {
  const getCategoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name || 'Uncategorised';
  const getCategorySlug = (categoryId: string) => categories.find(c => c.id === categoryId)?.slug || 'uncategorised';
  let postId = 1;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>Constancia</title>
  <link>https://constancia.com</link>
  <description>Finance Transformation and ERP/EPM Consultancy</description>
  <language>en-GB</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>https://constancia.com</wp:base_site_url>
  ${categories.map(cat => `
  <wp:category>
    <wp:term_id>${cat.id}</wp:term_id>
    <wp:category_nicename><![CDATA[${cat.slug}]]></wp:category_nicename>
    <wp:cat_name><![CDATA[${cat.name}]]></wp:cat_name>
    <wp:category_description><![CDATA[${cat.description}]]></wp:category_description>
  </wp:category>`).join('')}
  ${posts.map(post => {
    const id = postId++;
    const contentHtml = convertMarkdownToEnrichedHTML(post.content);
    return `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <link>https://constancia.com/blog/${post.slug}</link>
    <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
    <dc:creator><![CDATA[${post.author}]]></dc:creator>
    <guid isPermaLink="false">https://constancia.com/?p=${id}</guid>
    <description><![CDATA[${post.excerpt}]]></description>
    <content:encoded><![CDATA[${contentHtml}]]></content:encoded>
    <excerpt:encoded><![CDATA[${post.excerpt}]]></excerpt:encoded>
    <wp:post_id>${id}</wp:post_id>
    <wp:post_date>${new Date(post.publishedAt).toISOString().replace('T', ' ').slice(0, 19)}</wp:post_date>
    <wp:post_name><![CDATA[${post.slug}]]></wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_type>post</wp:post_type>
    <category domain="category" nicename="${getCategorySlug(post.categoryId)}"><![CDATA[${getCategoryName(post.categoryId)}]]></category>
    ${post.tags.map(tag => `<category domain="post_tag" nicename="${tag.toLowerCase().replace(/\s+/g, '-')}"><![CDATA[${tag}]]></category>`).join('\n    ')}
    ${post.heroImage ? `<wp:postmeta>
      <wp:meta_key>_thumbnail_url</wp:meta_key>
      <wp:meta_value><![CDATA[${post.heroImage}]]></wp:meta_value>
    </wp:postmeta>` : ''}
  </item>`;
  }).join('')}
  ${resources.map(resource => {
    const id = postId++;
    return `
  <item>
    <title><![CDATA[${resource.title}]]></title>
    <link>https://constancia.com/resources/${resource.slug}</link>
    <pubDate>${new Date(resource.publishedAt).toUTCString()}</pubDate>
    <dc:creator><![CDATA[Constancia Team]]></dc:creator>
    <guid isPermaLink="false">https://constancia.com/?p=${id}</guid>
    <description><![CDATA[${resource.description}]]></description>
    <content:encoded><![CDATA[
      <div style="background: linear-gradient(135deg, rgba(18, 235, 252, 0.1) 0%, rgba(8, 132, 170, 0.1) 100%); border-left: 4px solid #7FB8A3; padding: 2rem; margin: 1.5rem 0; border-radius: 0 8px 8px 0; text-align: center;">
        <h3 style="margin-top: 0; color: #12161D;">Download This Resource</h3>
        <p>${resource.description}</p>
        <p><strong>File Type:</strong> ${resource.fileType.toUpperCase()} | <strong>Size:</strong> ${resource.fileSize}</p>
        <a href="${resource.fileUrl}" style="display: inline-block; background: #12161D; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Download ${resource.fileType.toUpperCase()}</a>
      </div>
    ]]></content:encoded>
    <excerpt:encoded><![CDATA[${resource.description}]]></excerpt:encoded>
    <wp:post_id>${id}</wp:post_id>
    <wp:post_date>${new Date(resource.publishedAt).toISOString().replace('T', ' ').slice(0, 19)}</wp:post_date>
    <wp:post_name><![CDATA[${resource.slug}]]></wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_type>post</wp:post_type>
    <category domain="category" nicename="resources"><![CDATA[Resources]]></category>
    <category domain="post_tag" nicename="${resource.category.toLowerCase().replace(/\s+/g, '-')}"><![CDATA[${resource.category}]]></category>
  </item>`;
  }).join('')}
</channel>
</rss>`;
}

function convertMarkdownToEnrichedHTML(content: string): string {
  let html = content;
  
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem; color: #12161D;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #8E4F67;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; color: #12161D; border-bottom: 2px solid #7FB8A3; padding-bottom: 0.5rem;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 2rem; margin-top: 2rem; margin-bottom: 1rem; color: #12161D;">$1</h1>');
  
  html = html.replace(/\*\*Potential Impact\*\*:(.+)$/gm, '<div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%); border-left: 4px solid #7FB8A3; padding: 1rem; margin: 1rem 0; border-radius: 0 8px 8px 0;"><strong style="color: #7FB8A3;">Potential Impact:</strong>$1</div>');
  html = html.replace(/\*\*Key Takeaway\*\*:(.+)$/gm, '<div style="background: linear-gradient(135deg, rgba(2, 32, 91, 0.05) 0%, rgba(8, 132, 170, 0.1) 100%); border-left: 4px solid #7FB8A3; padding: 1.5rem; margin: 1.5rem 0; border-radius: 0 8px 8px 0;"><strong style="color: #7FB8A3;">Key Takeaway:</strong>$1</div>');
  
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #12161D;">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  html = html.replace(/^\| (.+) \|$/gm, (match, rowContent) => {
    const cells = rowContent.split(' | ').map((cell: string) => `<td style="padding: 1rem; border: 1px solid #e5e7eb;">${cell.trim()}</td>`).join('');
    return `<tr>${cells}</tr>`;
  });
  html = html.replace(/^\|[-|]+\|$/gm, '');
  html = html.replace(new RegExp('(<tr>.*</tr>\\s*)+', 'gm'), '<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;">$&</table>');
  
  html = html.replace(/^- (.+)$/gm, '<li style="margin-bottom: 0.5rem;">$1</li>');
  html = html.replace(new RegExp('(<li[^>]*>.*</li>\\s*)+', 'gm'), '<ul style="margin-bottom: 1rem; padding-left: 2rem;">$&</ul>');
  
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom: 0.5rem;">$1</li>');
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left: 4px solid #7FB8A3; padding: 1rem; margin: 1.5rem 0; background: rgba(18, 235, 252, 0.05); border-radius: 0 8px 8px 0; font-style: italic;">$1</blockquote>');
  
  const lines = html.split('\n');
  const result: string[] = [];
  let inParagraph = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      continue;
    }
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || 
        trimmed.startsWith('<li') || trimmed.startsWith('<table') || trimmed.startsWith('<tr') ||
        trimmed.startsWith('<blockquote') || trimmed.startsWith('<div') || trimmed.startsWith('</')) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push('<p style="margin-bottom: 1rem; line-height: 1.8;">');
        inParagraph = true;
      }
      result.push(trimmed);
    }
  }
  if (inParagraph) {
    result.push('</p>');
  }
  
  return result.join('\n');
}
