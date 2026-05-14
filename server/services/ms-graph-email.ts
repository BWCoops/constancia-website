// Email Service — sends via Gmail SMTP (primary) with MS Graph as fallback
// Migrated from Microsoft Graph-only to Gmail App Password in March 2026.

import nodemailer from "nodemailer";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("email-service");

export const SENDER_EMAIL = "info@constancia.io";

// --- Gmail (primary) ---
const GMAIL_USER = process.env.GMAIL_USER || SENDER_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// --- MS Graph (fallback) ---
const MS_GRAPH_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
const MS_GRAPH_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
const MS_GRAPH_TENANT_ID = process.env.MS_GRAPH_TENANT_ID;

// Cached nodemailer transporter (created once, reused)
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transporter;
}

// --- MS Graph token cache (fallback path only) ---
let msGraphToken: { token: string; expiresAt: number } | null = null;

async function getMsGraphTokenInternal(): Promise<string> {
  if (msGraphToken && msGraphToken.expiresAt > Date.now() + 300_000) {
    return msGraphToken.token;
  }

  if (!MS_GRAPH_CLIENT_ID || !MS_GRAPH_CLIENT_SECRET || !MS_GRAPH_TENANT_ID) {
    throw new Error("MS Graph credentials not configured");
  }

  const tokenUrl = `https://login.microsoftonline.com/${MS_GRAPH_TENANT_ID}/oauth2/v2.0/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MS_GRAPH_CLIENT_ID,
      client_secret: MS_GRAPH_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get MS Graph token: ${error}`);
  }

  const data = await response.json();
  msGraphToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return msGraphToken.token;
}

async function sendViaGraph(to: string, subject: string, htmlContent: string): Promise<void> {
  const token = await getMsGraphTokenInternal();
  const body = JSON.stringify({
    message: {
      subject,
      body: { contentType: "HTML", content: htmlContent },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MS Graph sendMail failed: ${error}`);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  /** @deprecated no-op for Gmail; kept for API compatibility */
  saveToSentItems?: boolean;
}

export async function sendEmailViaGraph(options: SendEmailOptions): Promise<void>;
export async function sendEmailViaGraph(to: string, subject: string, htmlContent: string): Promise<void>;
export async function sendEmailViaGraph(
  optionsOrTo: SendEmailOptions | string,
  subject?: string,
  htmlContent?: string
): Promise<void> {
  let to: string;
  let sub: string;
  let html: string;

  if (typeof optionsOrTo === "string") {
    to = optionsOrTo;
    sub = subject!;
    html = htmlContent!;
  } else {
    to = optionsOrTo.to;
    sub = optionsOrTo.subject;
    html = optionsOrTo.htmlContent;
  }

  // Try Gmail first
  if (GMAIL_APP_PASSWORD) {
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"Constancia" <${GMAIL_USER}>`,
        to,
        subject: sub,
        html,
      });
      log.info({ to, subject: sub }, "Email sent via Gmail");
      return;
    } catch (gmailErr) {
      log.warn({ err: gmailErr, to }, "Gmail send failed, trying MS Graph fallback");
      // fall through to MS Graph
    }
  }

  // Fallback to MS Graph
  if (MS_GRAPH_CLIENT_ID && MS_GRAPH_CLIENT_SECRET && MS_GRAPH_TENANT_ID) {
    await sendViaGraph(to, sub, html);
    log.info({ to, subject: sub }, "Email sent via MS Graph (fallback)");
    return;
  }

  throw new Error("No email transport configured (neither GMAIL_APP_PASSWORD nor MS Graph credentials are set)");
}

// Re-export for callers that import getMsGraphToken directly (admin-security, email-helpers)
/** @deprecated Use sendEmailViaGraph instead */
export async function getMsGraphToken(): Promise<string> {
  return getMsGraphTokenInternal();
}

export function isEmailConfigured(): boolean {
  const hasGmail = !!(GMAIL_APP_PASSWORD);
  const hasGraph = !!(MS_GRAPH_CLIENT_ID && MS_GRAPH_CLIENT_SECRET && MS_GRAPH_TENANT_ID);
  return hasGmail || hasGraph;
}
