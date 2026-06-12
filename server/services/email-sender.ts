// Email sender — Gmail SMTP via nodemailer.

import nodemailer from "nodemailer";
import path from "path";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("email-service");

export const SENDER_EMAIL = process.env.GMAIL_USER || "";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

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

// Resolved once at module load — works in dev and in any deployment because
// the logo lives at client/public/logo.png relative to the project root.
const LOGO_ATTACHMENT = {
  filename: "logo.png",
  path: path.join(process.cwd(), "client", "public", "logo.png"),
  cid: "constancia-logo",
};

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  /** @deprecated no-op; kept for API compatibility */
  saveToSentItems?: boolean;
}

export async function sendEmail(options: SendEmailOptions): Promise<void>;
export async function sendEmail(to: string, subject: string, htmlContent: string): Promise<void>;
export async function sendEmail(
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

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error(
      `Email not configured: missing secret(s) — ${!GMAIL_USER ? "GMAIL_USER " : ""}${!GMAIL_APP_PASSWORD ? "GMAIL_APP_PASSWORD" : ""}`.trim()
    );
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Constancia" <${GMAIL_USER}>`,
    to,
    subject: sub,
    html,
    attachments: [LOGO_ATTACHMENT],
  });
  log.info({ to, subject: sub }, "Email sent via Gmail");
}

export function isEmailConfigured(): boolean {
  return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
}
