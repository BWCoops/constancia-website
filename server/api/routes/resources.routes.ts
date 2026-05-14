import { Router, Request, Response } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs";
import * as crypto from "crypto";
import { storage, generateOtp, hashOtp, verifyOtp } from "../../storage";
import { isBusinessEmail } from "@shared/schema";
import { getServerFeatureFlags } from "@shared/feature-flags";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("resources-routes");

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

const leadCaptureSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  company: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  resourceId: z.string().optional(),
  honeypot: z.string().optional(),
  subscribeNewsletter: z.boolean().default(true),
  screenResolution: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  platform: z.string().optional(),
  deviceMemory: z.number().optional(),
  hardwareConcurrency: z.number().optional(),
  referrer: z.string().optional(),
  pageUrl: z.string().optional(),
  clickTimestamp: z.string().optional(),
  turnstileToken: z.string().optional(),
});

const otpVerifySchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});
import { requireResources } from "../../middleware/feature-flags";
import { getClientIp, checkRateLimit } from "../../middleware/security";
import { validateContactForm, isDisposableEmail } from "../../services/content-validation";
import { verifyTurnstileToken, isTurnstileConfigured } from "../../services/turnstile";
import { logSecurityEvent as logSecurityEventConsole } from "../../index";
import { sendOtpEmail, sendLeadVerificationNotification, syncLeadToHubSpot } from "./shared/email-helpers";

const router = Router();

const SESSION_COOKIE_NAME = "1qg_resource_session";
const SESSION_EXPIRY_DAYS = 30;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_LEAD_ATTEMPTS = 10;
const LEAD_LOCKOUT_MINUTES = 30;
const RESOURCES_DIR = path.join(process.cwd(), "public", "resources");

const leadAttemptTracker = new Map<string, { attempts: number; lockedUntil: number | null }>();

async function checkLeadLockout(leadId: string): Promise<{ locked: boolean; remainingTime?: number }> {
  const tracker = leadAttemptTracker.get(leadId);
  if (!tracker || !tracker.lockedUntil) {
    return { locked: false };
  }
  
  const now = Date.now();
  if (tracker.lockedUntil > now) {
    return { 
      locked: true, 
      remainingTime: Math.ceil((tracker.lockedUntil - now) / 1000 / 60)
    };
  }
  
  leadAttemptTracker.delete(leadId);
  return { locked: false };
}

async function recordLeadAttempt(leadId: string): Promise<{ locked: boolean; remainingAttempts: number }> {
  let tracker = leadAttemptTracker.get(leadId);
  if (!tracker) {
    tracker = { attempts: 0, lockedUntil: null };
    leadAttemptTracker.set(leadId, tracker);
  }
  
  tracker.attempts++;
  
  if (tracker.attempts >= MAX_LEAD_ATTEMPTS) {
    tracker.lockedUntil = Date.now() + LEAD_LOCKOUT_MINUTES * 60 * 1000;
    return { locked: true, remainingAttempts: 0 };
  }
  
  return { locked: false, remainingAttempts: MAX_LEAD_ATTEMPTS - tracker.attempts };
}

function isValidResourceId(id: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(id);
}

function isPathTraversalAttempt(path: string): boolean {
  return path.includes("..") || path.includes("./") || path.includes("\\");
}

async function checkHubspotSyncRateLimit(email: string): Promise<boolean> {
  const { allowed } = await checkRateLimit(email.toLowerCase(), 'hubspot');
  return allowed;
}

router.get("/files", requireResources, async (_req: Request, res: Response) => {
  try {
    const files = await storage.getResourceFiles();
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch files" });
  }
});

router.get("/files/featured", requireResources, async (_req: Request, res: Response) => {
  try {
    const files = await storage.getFeaturedResourceFiles();
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch featured files" });
  }
});

router.get("/files/:slug", requireResources, async (req: Request, res: Response) => {
  try {
    const file = await storage.getResourceFileBySlug(req.params.slug);
    if (!file) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    res.json({ success: true, data: file });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch file" });
  }
});

router.get("/files/category/:category", requireResources, async (req: Request, res: Response) => {
  try {
    const files = await storage.getResourceFilesByCategory(req.params.category);
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch files by category" });
  }
});

router.post("/files/:id/view", requireResources, async (req: Request, res: Response) => {
  try {
    const resourceId = req.params.id;
    
    const file = await storage.getResourceFileById(resourceId);
    if (!file) {
      return res.status(404).json({ success: false, error: "Resource not found" });
    }
    
    await storage.incrementViewCount(resourceId);
    
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "View tracking error");
    res.status(500).json({ success: false, error: "Failed to track view" });
  }
});

router.get("/resources/session", requireResources, async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    
    if (!sessionId) {
      return res.json({ verified: false });
    }

    const session = await storage.getResourceSession(sessionId);
    
    if (!session || session.revoked || new Date(session.expiresAt) < new Date()) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.json({ verified: false });
    }

    const lead = await storage.getResourceLeadById(session.leadId);
    if (!lead || !lead.verified) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.json({ verified: false });
    }

    const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await storage.refreshSessionExpiry(session.id, newExpiresAt);

    res.cookie(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "strict",
      expires: newExpiresAt,
      path: "/",
    });

    return res.json({ 
      verified: true,
      leadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      expiresAt: newExpiresAt.toISOString(),
    });
  } catch (error) {
    log.error({ err: error }, "Session status check error");
    return res.json({ verified: false });
  }
});

router.post("/files/:id/download", requireResources, async (req: Request, res: Response) => {
  try {
    const { leadId: bodyLeadId } = req.body;
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    const resourceId = req.params.id;
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const referrer = req.headers.referer;
    
    let leadId: string | null = bodyLeadId || null;
    let validSessionId: string | null = null;
    
    if (sessionId) {
      const session = await storage.getResourceSession(sessionId);
      if (session && !session.revoked && new Date(session.expiresAt) > new Date()) {
        const lead = await storage.getResourceLeadById(session.leadId);
        if (lead?.verified) {
          leadId = session.leadId;
          validSessionId = session.id;
          
          const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
          await storage.refreshSessionExpiry(session.id, newExpiresAt);
        }
      }
    }
    
    if (!leadId) {
      return res.status(403).json({ 
        success: false, 
        error: "Email verification required to download this resource." 
      });
    }
    
    const lead = await storage.getResourceLeadById(leadId);
    if (!lead) {
      return res.status(403).json({ 
        success: false, 
        error: "Invalid verification session. Please verify your email again." 
      });
    }
    
    if (!lead.verified) {
      return res.status(403).json({ 
        success: false, 
        error: "Email verification required to download this resource." 
      });
    }
    
    await storage.createResourceDownload({
      sessionId: validSessionId || undefined,
      leadId,
      resourceId,
      ipAddress: clientIp,
      userAgent,
      referrer,
    });
    
    await storage.incrementDownloadCount(resourceId);
    
    logSecurityEventConsole({
      type: "DOWNLOAD_STARTED",
      timestamp: new Date().toISOString(),
      ip: clientIp,
      leadId,
      resourceId,
      details: validSessionId ? "Session-based download" : "Direct lead ID download",
      severity: "INFO",
    });
    
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Download tracking error");
    res.status(500).json({ success: false, error: "Failed to track download" });
  }
});

router.post("/resources/lead", requireResources, async (req: Request, res: Response) => {
  try {
    const parsed = leadCaptureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid form data",
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { 
      firstName, lastName, email, company, jobTitle, resourceId, honeypot,
      subscribeNewsletter,
      screenResolution, timezone, language, platform, deviceMemory, hardwareConcurrency,
      referrer, pageUrl, clickTimestamp
    } = parsed.data;

    const clientIp = getClientIp(req);
    
    if (honeypot && honeypot.length > 0) {
      return res.json({ 
        success: true, 
        message: "Verification email sent",
        leadId: "fake-id-for-bot" 
      });
    }

    if (isTurnstileConfigured()) {
      const turnstileToken = req.body.turnstileToken;
      const verification = await verifyTurnstileToken(turnstileToken, clientIp);
      
      if (!verification.success) {
        logSecurityEventConsole({
          type: "SUSPICIOUS_ACTIVITY",
          timestamp: new Date().toISOString(),
          ip: clientIp,
          details: `Turnstile verification failed for lead form`,
          severity: "WARN",
        });
        return res.status(400).json({ 
          success: false, 
          error: verification.error || "Bot verification failed. Please try again."
        });
      }
    }
    
    const contentValidation = validateContactForm({
      firstName,
      lastName,
      email,
      company,
      jobTitle,
    });
    
    if (!contentValidation.isValid) {
      const errorMessages = Object.entries(contentValidation.errors)
        .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
        .join("; ");
      
      logSecurityEventConsole({
        type: "SUSPICIOUS_ACTIVITY",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        details: `Lead form validation failed: ${errorMessages}`,
        severity: "INFO",
      });
      
      return res.status(400).json({ 
        success: false, 
        error: "Please check your submission and try again.",
        details: contentValidation.errors
      });
    }

    // Check if business email is required (can be toggled via admin)
    const featureFlags = await getServerFeatureFlags();
    if (featureFlags.requireBusinessEmail && !isBusinessEmail(email)) {
      logSecurityEventConsole({
        type: "SUSPICIOUS_ACTIVITY",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        details: `Lead form blocked personal email domain: ${email.split("@")[1]}`,
        severity: "INFO",
      });
      
      return res.status(400).json({ 
        success: false, 
        error: "Please use a business email address. Personal email providers (Gmail, Yahoo, Hotmail, etc.) are not accepted."
      });
    }
    
    if (isDisposableEmail(email)) {
      logSecurityEventConsole({
        type: "SUSPICIOUS_ACTIVITY",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        details: `Lead form blocked disposable email: ${email.split("@")[1]}`,
        severity: "WARN",
      });
      
      return res.status(400).json({ 
        success: false, 
        error: "Temporary or disposable email addresses are not accepted. Please use your business email."
      });
    }

    const otpRateLimitResult = await checkRateLimit(email, 'otp');
    if (!otpRateLimitResult.allowed) {
      return res.status(429).json({ 
        success: false, 
        error: "Too many verification requests. Please try again in 10 minutes."
      });
    }

    const existingLead = await storage.getResourceLeadByEmail(email);
    if (existingLead?.verified) {
      return res.json({ 
        success: true, 
        message: "Email already verified",
        leadId: existingLead.id,
        verified: true
      });
    }

    const lead = await storage.createResourceLead({
      firstName,
      lastName,
      email: email.toLowerCase(),
      company,
      jobTitle,
      resourceId,
      subscribeNewsletter: subscribeNewsletter ?? true,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("user-agent"),
      screenResolution,
      timezone,
      language,
      platform,
      deviceMemory,
      hardwareConcurrency,
      referrer,
      pageUrl,
      clickTimestamp: clickTimestamp ? new Date(clickTimestamp) : undefined,
    });

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await storage.invalidateOtpsForLead(lead.id);
    await storage.createOtp(lead.id, otpHash, otpExpiresAt);

    const emailSent = await sendOtpEmail(email, firstName, otp);
    if (!emailSent) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to send verification email. Please try again."
      });
    }

    logSecurityEventConsole({
      type: "LEAD_CREATED",
      timestamp: new Date().toISOString(),
      ip: req.ip || req.socket.remoteAddress,
      leadId: lead.id,
      email: email,
      resourceId: resourceId || undefined,
      severity: "INFO",
    });

    logSecurityEventConsole({
      type: "OTP_SENT",
      timestamp: new Date().toISOString(),
      ip: req.ip || req.socket.remoteAddress,
      leadId: lead.id,
      email: email,
      severity: "INFO",
    });

    res.json({ 
      success: true, 
      message: "Verification code sent. Please check your email for the 6-digit code.",
      leadId: lead.id
    });
  } catch (error) {
    log.error({ err: error }, "Lead capture error");
    res.status(500).json({ success: false, error: "An error occurred. Please try again." });
  }
});

router.post("/resources/otp/verify", requireResources, async (req: Request, res: Response) => {
  try {
    const parsed = otpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid verification code format"
      });
    }

    const { leadId, otp } = parsed.data;
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    const lockoutStatus = await checkLeadLockout(leadId);
    if (lockoutStatus.locked) {
      logSecurityEventConsole({
        type: "LEAD_LOCKOUT",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        leadId,
        details: "Lead attempted verification while locked out",
        severity: "WARN",
      });
      return res.status(429).json({ 
        success: false, 
        error: "Too many failed attempts. Please try again in 30 minutes."
      });
    }

    const lead = await storage.getResourceLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        error: "Verification session not found. Please start again."
      });
    }

    if (lead.verified) {
      return res.json({ 
        success: true, 
        message: "Email already verified",
        verified: true
      });
    }

    const storedOtp = await storage.getValidOtp(leadId);
    if (!storedOtp) {
      return res.status(400).json({ 
        success: false, 
        error: "Verification code expired. Please request a new code."
      });
    }

    if (storedOtp.attempts >= MAX_OTP_ATTEMPTS) {
      await storage.markOtpUsed(storedOtp.id);
      return res.status(429).json({ 
        success: false, 
        error: "Too many incorrect attempts for this code. Please request a new code."
      });
    }

    if (!verifyOtp(otp, storedOtp.otpHash)) {
      await storage.incrementOtpAttempts(storedOtp.id);
      const attemptResult = await recordLeadAttempt(leadId);
      
      logSecurityEventConsole({
        type: "OTP_FAILED",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        leadId,
        email: lead.email,
        details: `Remaining attempts: ${attemptResult.remainingAttempts}`,
        severity: attemptResult.remainingAttempts <= 2 ? "WARN" : "INFO",
      });
      
      if (attemptResult.locked) {
        logSecurityEventConsole({
          type: "LEAD_LOCKOUT",
          timestamp: new Date().toISOString(),
          ip: clientIp,
          leadId,
          email: lead.email,
          details: "Lead locked out after max failed attempts",
          severity: "WARN",
        });
        return res.status(429).json({ 
          success: false, 
          error: "Too many failed attempts. Your account is locked for 30 minutes."
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        error: `Incorrect verification code. ${attemptResult.remainingAttempts} attempt${attemptResult.remainingAttempts !== 1 ? 's' : ''} remaining before lockout.`
      });
    }

    await storage.markOtpUsed(storedOtp.id);
    await storage.verifyResourceLead(leadId);

    logSecurityEventConsole({
      type: "OTP_VERIFIED",
      timestamp: new Date().toISOString(),
      ip: req.ip || req.socket.remoteAddress,
      leadId,
      email: lead.email,
      resourceId: lead.resourceId || undefined,
      severity: "INFO",
    });

    if (await checkHubspotSyncRateLimit(lead.email)) {
      syncLeadToHubSpot({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        company: lead.company,
        jobTitle: lead.jobTitle,
        resourceId: lead.resourceId || undefined,
        subscribeNewsletter: lead.subscribeNewsletter ?? true,
        ipAddress: lead.ipAddress || undefined,
        screenResolution: lead.screenResolution || undefined,
        timezone: lead.timezone || undefined,
        language: lead.language || undefined,
        referrer: lead.referrer || undefined,
        pageUrl: lead.pageUrl || undefined,
        clickTimestamp: lead.clickTimestamp?.toISOString() || undefined,
      }).then(result => {
        if (result.success) {
          logSecurityEventConsole({
            type: "HUBSPOT_SYNC",
            timestamp: new Date().toISOString(),
            email: lead.email,
            leadId,
            details: result.contactId ? `Contact ID: ${result.contactId}` : "Synced",
            severity: "INFO",
          });
          if (result.contactId) {
            storage.updateLeadHubspotSync(leadId, result.contactId).catch(err => 
              log.error({ err }, "Failed to update HubSpot sync status")
            );
          }
        } else {
          logSecurityEventConsole({
            type: "HUBSPOT_SYNC_FAILED",
            timestamp: new Date().toISOString(),
            email: lead.email,
            leadId,
            severity: "WARN",
          });
        }
      }).catch(err => {
        log.error({ err }, "HubSpot sync failed");
        logSecurityEventConsole({
          type: "HUBSPOT_SYNC_FAILED",
          timestamp: new Date().toISOString(),
          email: lead.email,
          leadId,
          details: String(err),
          severity: "ERROR",
        });
      });
    } else {
      log.info({ emailPrefix: lead.email.substring(0, 3) }, "HubSpot sync rate limited for email");
    }

    let resourceTitle: string | undefined;
    if (lead.resourceId) {
      const resource = await storage.getResourceFileById(lead.resourceId);
      resourceTitle = resource?.title;
    }
    
    sendLeadVerificationNotification({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company,
      jobTitle: lead.jobTitle,
      resourceId: lead.resourceId || undefined,
      resourceTitle,
      screenResolution: lead.screenResolution || undefined,
      timezone: lead.timezone || undefined,
      language: lead.language || undefined,
      referrer: lead.referrer || undefined,
      pageUrl: lead.pageUrl || undefined,
    }).then(sent => {
      if (sent) {
        log.info({ emailPrefix: lead.email.substring(0, 3) }, "Lead verification email sent");
      }
    }).catch(err => {
      log.error({ err }, "Failed to send lead verification email");
    });

    const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const emailHash = hashEmail(lead.email);
    const session = await storage.createResourceSession({
      leadId: lead.id,
      emailHash,
      expiresAt: sessionExpiresAt,
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"],
    });

    res.cookie(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "strict",
      expires: sessionExpiresAt,
      path: "/",
    });

    logSecurityEventConsole({
      type: "SESSION_CREATED" as any,
      timestamp: new Date().toISOString(),
      ip: clientIp,
      leadId: lead.id,
      email: lead.email,
      details: `Session expires: ${sessionExpiresAt.toISOString()}`,
      severity: "INFO",
    });

    res.json({ 
      success: true, 
      message: "Email verified successfully",
      verified: true,
      session: {
        expiresAt: sessionExpiresAt.toISOString(),
        firstName: lead.firstName,
        lastName: lead.lastName,
      }
    });
  } catch (error) {
    log.error({ err: error }, "OTP verification error");
    res.status(500).json({ success: false, error: "Verification failed. Please try again." });
  }
});

router.post("/resources/otp/resend", requireResources, async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ 
        success: false, 
        error: "Lead ID is required"
      });
    }

    const lead = await storage.getResourceLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        error: "Session not found. Please start again."
      });
    }

    if (lead.verified) {
      return res.json({ 
        success: true, 
        message: "Email already verified",
        verified: true
      });
    }

    const otpResendRateLimitResult = await checkRateLimit(lead.email, 'otp');
    if (!otpResendRateLimitResult.allowed) {
      return res.status(429).json({ 
        success: false, 
        error: "Too many verification requests. Please try again in 10 minutes."
      });
    }

    await storage.invalidateOtpsForLead(leadId);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await storage.createOtp(leadId, otpHash, expiresAt);

    const emailSent = await sendOtpEmail(lead.email, lead.firstName, otp);
    if (!emailSent) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to send verification email. Please try again."
      });
    }

    res.json({ 
      success: true, 
      message: "New verification code sent"
    });
  } catch (error) {
    log.error({ err: error }, "OTP resend error");
    res.status(500).json({ success: false, error: "Failed to resend code. Please try again." });
  }
});

router.get("/resources/:id/download", requireResources, async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  
  try {
    const resourceId = req.params.id;
    let { leadId } = req.query;
    let validSessionId: string | null = null;

    if (!resourceId || !isValidResourceId(resourceId) || isPathTraversalAttempt(resourceId)) {
      logSecurityEventConsole({
        type: "DOWNLOAD_BLOCKED",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        resourceId: resourceId?.substring(0, 50),
        details: "Invalid resource ID or path traversal attempt",
        severity: "WARN",
      });
      return res.status(400).json({ 
        success: false, 
        error: "Invalid resource identifier"
      });
    }

    if (sessionId) {
      const session = await storage.getResourceSession(sessionId);
      if (session && !session.revoked && new Date(session.expiresAt) > new Date()) {
        const sessionLead = await storage.getResourceLeadById(session.leadId);
        if (sessionLead?.verified) {
          leadId = session.leadId;
          validSessionId = session.id;
          
          const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
          await storage.refreshSessionExpiry(session.id, newExpiresAt);
          
          res.cookie(SESSION_COOKIE_NAME, session.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "strict",
            expires: newExpiresAt,
            path: "/",
          });
        }
      }
    }

    if (!leadId || typeof leadId !== "string") {
      logSecurityEventConsole({
        type: "DOWNLOAD_BLOCKED",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        resourceId,
        details: "No lead ID or session provided",
        severity: "INFO",
      });
      return res.status(401).json({ 
        success: false, 
        error: "Verification required to download"
      });
    }

    if (!isValidResourceId(leadId) || isPathTraversalAttempt(leadId)) {
      logSecurityEventConsole({
        type: "DOWNLOAD_BLOCKED",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        leadId: leadId.substring(0, 50),
        details: "Invalid lead ID format",
        severity: "WARN",
      });
      return res.status(400).json({ 
        success: false, 
        error: "Invalid verification session"
      });
    }

    const lead = await storage.getResourceLeadById(leadId as string);
    if (!lead || !lead.verified) {
      logSecurityEventConsole({
        type: "DOWNLOAD_BLOCKED",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        leadId: leadId as string,
        resourceId,
        details: lead ? "Lead not verified" : "Lead not found",
        severity: "WARN",
      });
      return res.status(401).json({ 
        success: false, 
        error: "Please complete email verification to download"
      });
    }

    const file = await storage.getResourceFileById(resourceId);
    if (!file) {
      logSecurityEventConsole({
        type: "DOWNLOAD_BLOCKED",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        leadId,
        resourceId,
        details: "Resource not found in database",
        severity: "WARN",
      });
      return res.status(404).json({ 
        success: false, 
        error: "Resource not found"
      });
    }

    if (isPathTraversalAttempt(file.fileUrl)) {
      logSecurityEventConsole({
        type: "DOWNLOAD_BLOCKED",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        resourceId,
        details: "Stored file URL contains suspicious pattern",
        severity: "CRITICAL",
      });
      return res.status(500).json({ 
        success: false, 
        error: "Resource configuration error"
      });
    }

    await storage.createResourceDownload({
      sessionId: validSessionId || undefined,
      leadId: leadId as string,
      resourceId: file.id,
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"],
      referrer: req.headers.referer,
    });
    
    await storage.incrementDownloadCount(file.id);

    logSecurityEventConsole({
      type: "DOWNLOAD_STARTED",
      timestamp: new Date().toISOString(),
      ip: clientIp,
      leadId: leadId as string,
      resourceId: file.id,
      email: lead.email,
      details: validSessionId ? "Session-based download" : "Direct lead ID download",
      severity: "INFO",
    });

    try {
      // Resources are pre-generated static files - serve directly
      // Dynamic PDF generation (Adobe) is only for comparison tools and FinanceCompass reports
      const fileName = path.basename(file.fileUrl);
      
      if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
        logSecurityEventConsole({
          type: "DOWNLOAD_BLOCKED",
          timestamp: new Date().toISOString(),
          ip: clientIp,
          resourceId,
          details: "Filename contains disallowed characters",
          severity: "CRITICAL",
        });
        return res.status(400).json({ 
          success: false, 
          error: "Invalid resource filename"
        });
      }
      
      const filePath = path.join(RESOURCES_DIR, fileName);
      
      const resolvedPath = path.resolve(filePath);
      const resolvedResourcesDir = path.resolve(RESOURCES_DIR);
      if (!resolvedPath.startsWith(resolvedResourcesDir + path.sep) && resolvedPath !== resolvedResourcesDir) {
        logSecurityEventConsole({
          type: "DOWNLOAD_BLOCKED",
          timestamp: new Date().toISOString(),
          ip: clientIp,
          resourceId,
          details: "Path traversal attempt detected in resolved path",
          severity: "CRITICAL",
        });
        return res.status(403).json({ 
          success: false, 
          error: "Access denied"
        });
      }
      
      if (!fs.existsSync(resolvedPath)) {
        log.error({ filePath: resolvedPath }, "Resource file not found");
        return res.status(404).json({ 
          success: false, 
          error: "Resource file not found"
        });
      }

      const fileBuffer = fs.readFileSync(resolvedPath);
      const mimeType = file.fileType === 'pdf' ? 'application/pdf' : 
                      file.fileType === 'xls' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                      'application/octet-stream';
      
      const fileExtension = file.fileType === 'xls' ? 'xlsx' : file.fileType;
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.title}.${fileExtension}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
    } catch (error) {
      log.error({ err: error }, "File serving error");
      res.status(500).json({ 
        success: false, 
        error: "Failed to serve resource file"
      });
    }
  } catch (error) {
    log.error({ err: error }, "Download error");
    res.status(500).json({ success: false, error: "Download failed. Please try again." });
  }
});

export default router;
