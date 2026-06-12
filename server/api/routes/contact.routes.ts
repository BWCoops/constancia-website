import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { insertContactSubmissionSchema, isBusinessEmail } from "@shared/schema";
import { getServerFeatureFlags } from "@shared/feature-flags";
import { requireContact } from "../../middleware/feature-flags";
import { getClientIp } from "../../middleware/security";
import { createChildLogger } from "../../lib/logger";
import { redactEmail } from "../../utils/log-privacy";

const log = createChildLogger("contact-routes");
import { 
  validateContactForm, 
  isDisposableEmail
} from "../../services/content-validation";
import { verifyTurnstileToken, isTurnstileConfigured } from "../../services/turnstile";
import { logSecurityEvent as logSecurityEventConsole } from "../../index";
import { sendContactFormNotification, sendContactVerificationEmail, syncLeadToHubSpot } from "../routes/shared/email-helpers";

const router = Router();

router.post("/", requireContact, async (req: Request, res: Response) => {
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
          details: `Turnstile verification failed for contact form`,
          severity: "WARN",
        });
        return res.status(400).json({ 
          success: false, 
          error: verification.error || "Bot verification failed. Please try again."
        });
      }
    }

    const { turnstileToken: _, ...contactData } = req.body;
    
    const rawMessage = contactData.message;
    const messageValue = typeof rawMessage === 'string' ? rawMessage.trim() : "";
    if (!messageValue || messageValue.length < 10) {
      logSecurityEventConsole({
        type: "SUSPICIOUS_ACTIVITY",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        details: `Contact form missing or short message field`,
        severity: "INFO",
      });
      
      return res.status(400).json({ 
        success: false, 
        error: "Message is required and must be at least 10 characters.",
        details: { message: ["Message is required and must be at least 10 characters"] }
      });
    }
    
    const contentValidation = validateContactForm({
      firstName: contactData.firstName || "",
      lastName: contactData.lastName || "",
      email: contactData.email || "",
      company: contactData.company,
      jobTitle: contactData.jobTitle,
      message: messageValue,
      phone: contactData.phone,
    });
    
    if (!contentValidation.isValid) {
      const errorMessages = Object.entries(contentValidation.errors)
        .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
        .join("; ");
      
      logSecurityEventConsole({
        type: "SUSPICIOUS_ACTIVITY",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        details: `Contact form validation failed: ${errorMessages}`,
        severity: "INFO",
      });
      
      return res.status(400).json({ 
        success: false, 
        error: "Please check your submission and try again.",
        details: contentValidation.errors
      });
    }
    
    const email = contactData.email?.trim().toLowerCase() || "";
    
    // Check if business email is required (can be toggled via admin)
    const featureFlags = await getServerFeatureFlags();
    if (featureFlags.requireBusinessEmail && !isBusinessEmail(email)) {
      logSecurityEventConsole({
        type: "SUSPICIOUS_ACTIVITY",
        timestamp: new Date().toISOString(),
        ip: clientIp,
        details: `Contact form blocked personal email domain: ${email.split("@")[1]}`,
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
        details: `Contact form blocked disposable email: ${email.split("@")[1]}`,
        severity: "WARN",
      });
      
      return res.status(400).json({ 
        success: false, 
        error: "Temporary or disposable email addresses are not accepted. Please use your business email."
      });
    }
    
    const sanitizedContactData = {
      ...contactData,
      firstName: contentValidation.sanitizedData.firstName,
      lastName: contentValidation.sanitizedData.lastName,
      email: email,
      company: contentValidation.sanitizedData.company,
      jobTitle: contentValidation.sanitizedData.jobTitle,
      message: contentValidation.sanitizedData.message,
      phone: contentValidation.sanitizedData.phone,
    };
    
    const validatedData = insertContactSubmissionSchema.parse(sanitizedContactData);
    const submission = await storage.createContactSubmission(validatedData);
    
    // Generate and store OTP before responding so the token is in the DB
    // when the user enters the code. Email is fired in background.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenKey = `${validatedData.email.toLowerCase()}|${otp}`;
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await storage.createEmailVerificationToken({
      contactSubmissionId: submission.id,
      token: tokenKey,
      expiresAt: otpExpiresAt,
    });

    // Fire background tasks (email + integrations) without blocking the response
    sendContactVerificationEmail(validatedData.email, validatedData.firstName, otp)
      .then((sent) => {
        if (sent) {
          log.info({ email: redactEmail(validatedData.email) }, "Contact verification OTP sent");
        } else {
          log.error({ email: redactEmail(validatedData.email) }, "Failed to send contact verification OTP");
        }
      })
      .catch((err) => log.error({ err }, "Contact verification OTP error"));

    sendContactFormNotification({
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      company: validatedData.company || "Not provided",
      jobTitle: validatedData.jobTitle || "Not provided",
      message: validatedData.message,
      phone: validatedData.phone || undefined,
    })
      .then(async (emailSent) => {
        if (emailSent) {
          await storage.updateContactSubmissionStatus(submission.id, { emailSent: true });
        }
      })
      .catch((err) => log.error({ err }, "Email notification error"));

    syncLeadToHubSpot({
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      company: validatedData.company || "",
      jobTitle: validatedData.jobTitle || "",
    })
      .then(async (result) => {
        if (result.success) {
          await storage.updateContactSubmissionStatus(submission.id, { hubspotSynced: true });
        }
      })
      .catch((err) => log.error({ err }, "HubSpot sync error"));

    res.json({
      success: true,
      data: submission,
      email: validatedData.email,
      message: "Thank you for your enquiry. A 6-digit verification code has been sent to your email.",
    });
  } catch (error) {
    log.error({ err: error }, "Contact form error");
    res.status(400).json({ success: false, error: "Invalid submission data" });
  }
});

router.post("/verify", requireContact, async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || typeof email !== "string" || !code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    if (!/^\d{6}$/.test(code.trim())) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code format",
      });
    }

    const tokenKey = `${email.toLowerCase().trim()}|${code.trim()}`;
    const tokenRecord = await storage.getEmailVerificationToken(tokenKey);

    if (!tokenRecord) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code. Please check your code and try again.",
      });
    }

    if (!tokenRecord.contactSubmissionId || tokenRecord.leadId) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code",
      });
    }

    await storage.markEmailVerificationTokenUsed(tokenRecord.id);
    await storage.verifyContactSubmission(tokenRecord.contactSubmissionId);

    res.json({
      success: true,
      message: "Email verified successfully. Thank you — our team will be in touch within 24 hours.",
    });
  } catch (error) {
    log.error({ err: error }, "Contact OTP verification error");
    res.status(500).json({ success: false, error: "Verification failed. Please try again." });
  }
});

router.get("/verify", requireContact, async (req: Request, res: Response) => {
  try {
    const token = req.query.token;
    
    if (!token || typeof token !== "string") {
      return res.redirect("/?verified=error&message=missing-token");
    }
    
    const tokenRecord = await storage.getEmailVerificationToken(token);
    
    if (!tokenRecord) {
      return res.redirect("/?verified=error&message=invalid-token");
    }
    
    if (!tokenRecord.contactSubmissionId || tokenRecord.leadId) {
      return res.redirect("/?verified=error&message=invalid-token-type");
    }
    
    await storage.markEmailVerificationTokenUsed(tokenRecord.id);
    await storage.verifyContactSubmission(tokenRecord.contactSubmissionId);
    
    res.redirect("/?verified=success");
  } catch (error) {
    log.error({ err: error }, "Contact verification error");
    res.redirect("/?verified=error&message=verification-failed");
  }
});

export default router;
