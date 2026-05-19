/**
 * Email Test Suite — sends every email type to a nominated address.
 * Run with:  npx tsx server/scripts/test-all-emails.ts
 *
 * All emails are redirected to TEST_RECIPIENT regardless of the
 * original intended recipient, so the real templates are exercised
 * without touching live user inboxes.
 */

const TEST_RECIPIENT = "bradley.cooper@1qg.com";
const TEST_NAME      = "Bradley";
const SENDER         = "info@constancia.com";

import { sendEmailViaGraph } from "../services/ms-graph-email";
import {
  generateEmailHeader,
  generateEmailFooter,
  generateEmailWrapper,
  generateNotificationHeader,
  generateOtpBox,
  generateCtaButton,
  generateWarningBox,
  generateSuccessBox,
  generateInfoCard,
  EMAIL_BRAND,
} from "../core/email/components";

// ── Runner ────────────────────────────────────────────────────────────────────
async function send(label: string, subject: string, html: string): Promise<boolean> {
  process.stdout.write(`  Sending: ${label.padEnd(38)}`);
  try {
    await sendEmailViaGraph({ to: TEST_RECIPIENT, subject, htmlContent: html });
    console.log("✓");
    return true;
  } catch (err) {
    console.log(`✗  ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

// 1. Admin config / connection test
function tplConfigTest(): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#12161D;color:#fff;padding:24px;text-align:center">
        <h2 style="margin:0">Constancia Email Configuration Test</h2>
      </div>
      <div style="padding:24px;background:#f9f9f9">
        <p style="color:#22c55e;font-weight:bold;font-size:16px">Email service is working correctly!</p>
        <p>This test was sent at <strong>${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "long" })}</strong></p>
        <p><strong>Transport:</strong> Gmail SMTP (info@constancia.com)</p>
        <p><strong>Recipient:</strong> ${TEST_RECIPIENT}</p>
      </div>
      <div style="text-align:center;padding:16px;font-size:12px;color:#888">Automated test from Constancia Admin Centre.</div>
    </div>`;
}

// 2. Contact form notification (admin alert)
function tplContactFormNotification(): string {
  const table = `
    <h2 style="color:${EMAIL_BRAND.navy};margin-top:0">Contact Details</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray};width:120px"><strong>Name:</strong></td><td>Jane Smith (test)</td></tr>
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray}"><strong>Email:</strong></td><td><a href="mailto:jane.smith@acmecorp.com" style="color:${EMAIL_BRAND.teal}">jane.smith@acmecorp.com</a></td></tr>
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray}"><strong>Company:</strong></td><td>Acme Corp</td></tr>
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray}"><strong>Job Title:</strong></td><td>Finance Director</td></tr>
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray}"><strong>Phone:</strong></td><td>+44 7700 900123</td></tr>
    </table>`;
  const msg = `
    <div style="background:#fff;padding:20px;border:1px solid ${EMAIL_BRAND.mediumGray};border-radius:8px;margin-top:20px">
      <h2 style="color:${EMAIL_BRAND.navy};margin-top:0">Message</h2>
      <p style="color:${EMAIL_BRAND.darkGray};line-height:1.6">We are evaluating OneStream vs Anaplan for our FP&amp;A transformation. Could you advise on typical timelines and costs for a 500-user implementation?</p>
    </div>`;
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      ${generateNotificationHeader({ title: "New Contact Form Submission", subtitle: "Constancia Website" })}
      ${generateInfoCard(table)}
      ${msg}
      <hr style="border:none;border-top:1px solid #eee;margin:30px 0">
      <p style="color:${EMAIL_BRAND.mutedGray};font-size:12px;text-align:center">
        Submitted: ${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
      </p>
    </div>`;
}

// 3. Contact email verification (sent to submitter)
function tplContactVerification(): string {
  const verificationLink = "https://constancia.com/api/contact/verify?token=test-token-abc123";
  const header = generateEmailHeader({ variant: "dark" });
  const body = `
    <p style="color:${EMAIL_BRAND.darkGray};font-size:16px;margin:0 0 20px">Hi ${TEST_NAME},</p>
    <p style="color:${EMAIL_BRAND.darkGray};font-size:16px;line-height:1.6;margin:0 0 20px">
      Thank you for contacting Constancia. Please verify your email address to confirm your enquiry.
    </p>
    ${generateCtaButton("Verify Email Address", verificationLink)}
    <p style="color:${EMAIL_BRAND.mutedGray};font-size:14px;margin:25px 0 10px">
      If the button above doesn't work, copy and paste this link into your browser:
    </p>
    <p style="color:${EMAIL_BRAND.cyan};font-size:13px;word-break:break-all;background:${EMAIL_BRAND.lightGray};padding:12px;border-radius:4px;margin:0 0 25px">
      ${verificationLink}
    </p>
    ${generateWarningBox("<strong>Note:</strong> This link expires in 24 hours.")}
    <p style="color:${EMAIL_BRAND.darkGray};font-size:16px;line-height:1.6;margin:25px 0 0">
      Once verified, our team will review your enquiry and get back to you shortly.
    </p>`;
  const footer = generateEmailFooter({ variant: "dark", showFinanceCompass: true });
  return generateEmailWrapper(header, body, footer);
}

// 4. Resource access OTP (sent to user requesting a download)
function tplResourceOtp(): string {
  const header = generateEmailHeader({ variant: "light" });
  const body = `
    <p style="color:${EMAIL_BRAND.darkGray};font-size:16px;margin:0 0 20px">Hi ${TEST_NAME},</p>
    <p style="color:${EMAIL_BRAND.darkGray};font-size:16px;line-height:1.6;margin:0 0 20px">
      Thank you for your interest in Constancia resources. Please use the following code to access your download:
    </p>
    ${generateOtpBox("847 291")}
    <p style="color:${EMAIL_BRAND.mutedGray};font-size:14px;margin:0">This code expires in 10 minutes.</p>`;
  const footer = generateEmailFooter({ variant: "dark", showFinanceCompass: true });
  return generateEmailWrapper(header, body, footer);
}

// 5. FinanceCompass OTP (separate flow)
function tplFinanceCompassOtp(): string {
  const code = "523 847";
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:0">
      <div style="background:#12161D;padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">FinanceCompass</h1>
        <p style="color:rgba(255,255,255,.75);margin:6px 0 0;font-size:14px">by Constancia</p>
      </div>
      <div style="padding:32px 24px;background:#fff">
        <h2 style="color:#12161D;margin:0 0 16px">Your Verification Code</h2>
        <p style="color:#555;font-size:16px;margin:0 0 24px">Hi ${TEST_NAME}, please use this code to access FinanceCompass:</p>
        <div style="background:#f0f4ff;border:2px solid #12161D;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#12161D">${code}</span>
        </div>
        <p style="color:#888;font-size:14px">This code expires in 10 minutes. If you didn't request this code, please ignore this email.</p>
      </div>
      <div style="padding:16px;text-align:center;color:#999;font-size:12px">&copy; Constancia Ltd. All rights reserved.</div>
    </div>`;
}

// 6. Lead verified notification (admin alert after OTP confirmed)
function tplLeadVerified(): string {
  const table = `
    <h2 style="color:${EMAIL_BRAND.navy};margin-top:0">Lead Details</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray};width:120px"><strong>Name:</strong></td><td>${TEST_NAME} Cooper (test)</td></tr>
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray}"><strong>Email:</strong></td><td><a href="mailto:${TEST_RECIPIENT}" style="color:${EMAIL_BRAND.teal}">${TEST_RECIPIENT}</a></td></tr>
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray}"><strong>Company:</strong></td><td>Constancia</td></tr>
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray}"><strong>Job Title:</strong></td><td>Director</td></tr>
      <tr><td style="padding:8px 0;color:${EMAIL_BRAND.mutedGray}"><strong>Resource:</strong></td><td>EPM Vendor Comparison Guide 2025</td></tr>
    </table>`;
  const fingerprint = `
    <div style="background:#fff3cd;padding:15px;border-radius:8px;margin-bottom:20px;border-left:4px solid #ffc107">
      <h3 style="color:#856404;margin:0 0 10px;font-size:14px">Browser Fingerprint Data</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr><td style="padding:4px 0;color:#856404;width:120px"><strong>Screen:</strong></td><td>2560×1440</td></tr>
        <tr><td style="padding:4px 0;color:#856404"><strong>Timezone:</strong></td><td>Europe/London</td></tr>
        <tr><td style="padding:4px 0;color:#856404"><strong>Language:</strong></td><td>en-GB</td></tr>
        <tr><td style="padding:4px 0;color:#856404"><strong>Referrer:</strong></td><td>https://www.linkedin.com/</td></tr>
        <tr><td style="padding:4px 0;color:#856404"><strong>Page:</strong></td><td>https://constancia.com/resources</td></tr>
      </table>
    </div>`;
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      ${generateNotificationHeader({ title: "New Verified Lead", subtitle: "Resource Download" })}
      ${generateInfoCard(table)}
      ${fingerprint}
      ${generateSuccessBox("This lead has verified their email address via OTP and downloaded a resource.")}
      <hr style="border:none;border-top:1px solid #eee;margin:30px 0">
      <p style="color:${EMAIL_BRAND.mutedGray};font-size:12px;text-align:center">
        Verified: ${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
      </p>
    </div>`;
}

// 7. Admin login alert
function tplLoginAlert(): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#12161D;color:#fff;padding:24px;text-align:center">
        <h2 style="margin:0">Login Alert</h2>
        <p style="margin:4px 0 0;opacity:.75;font-size:14px">Constancia Admin Centre</p>
      </div>
      <div style="padding:24px;background:#f9f9f9">
        <p style="font-size:15px;margin:0 0 20px;color:#333">A successful login to the Constancia Admin Centre was recorded.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;width:130px;color:#555;font-weight:bold">Admin</td><td>Test Admin (test)</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#555;font-weight:bold">Email</td><td>${TEST_RECIPIENT}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#555;font-weight:bold">Method</td><td>Password + MFA (TEST)</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#555;font-weight:bold">IP Address</td><td>203.0.113.42</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#555;font-weight:bold">Browser</td><td>Chrome 122 / macOS 14</td></tr>
          <tr><td style="padding:8px 0;color:#555;font-weight:bold">Time</td><td>${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "long" })}</td></tr>
        </table>
        <p style="margin-top:24px;color:#666;font-size:13px">
          If you did not perform this login, please contact your security team immediately.
        </p>
      </div>
      <div style="text-align:center;padding:16px;font-size:12px;color:#888">Automated security alert from Constancia Admin Centre.</div>
    </div>`;
}

// ── Run all tests ─────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(62)}`);
console.log(`  Constancia Email Test Suite`);
console.log(`  All 7 types → ${TEST_RECIPIENT}`);
console.log(`${"─".repeat(62)}\n`);

(async () => {
  const passed = [
    await send("1. Admin config test",             "[Constancia] Email Configuration Test",                           tplConfigTest()),
    await send("2. Contact form notification",       `New Contact Form Submission from Jane Smith`,             tplContactFormNotification()),
    await send("3. Contact email verification",      "Verify your email - Constancia Contact",                        tplContactVerification()),
    await send("4. Resource access OTP",             "Your Constancia Resource Access Code",                          tplResourceOtp()),
    await send("5. FinanceCompass OTP",              "Your FinanceCompass Verification Code",                   tplFinanceCompassOtp()),
    await send("6. Lead verified notification",      `New Verified Lead: ${TEST_NAME} Cooper from Constancia`,        tplLeadVerified()),
    await send("7. Admin login alert",               `[Constancia Admin] Login Alert: Test Admin`,                    tplLoginAlert()),
  ].filter(Boolean).length;

  console.log(`\n${"─".repeat(62)}`);
  if (passed === 7) {
    console.log(`  ✓  All 7 emails sent. Check ${TEST_RECIPIENT} inbox.`);
  } else {
    console.log(`  ${passed}/7 emails sent — see errors above.`);
  }
  console.log(`${"─".repeat(62)}\n`);
  process.exit(passed === 7 ? 0 : 1);
})();
