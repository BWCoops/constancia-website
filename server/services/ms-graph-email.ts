// Email Service — sends via Gmail SMTP using a Gmail App Password.

import nodemailer from "nodemailer";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("email-service");

export const SENDER_EMAIL = "info@constancia.io";

const GMAIL_USER = process.env.GMAIL_USER || SENDER_EMAIL;
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

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  /** @deprecated no-op; kept for API compatibility */
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

  if (!GMAIL_APP_PASSWORD) {
    throw new Error("Email not configured: GMAIL_APP_PASSWORD secret is not set");
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Constancia" <${GMAIL_USER}>`,
    to,
    subject: sub,
    html,
  });
  log.info({ to, subject: sub }, "Email sent via Gmail");
}

export function isEmailConfigured(): boolean {
  return !!(GMAIL_APP_PASSWORD);
}
