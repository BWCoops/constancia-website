import { db } from "../db";
import { createChildLogger } from "../lib/logger";
import { redactEmail } from "../utils/log-privacy";
import { escapeHtml } from "../utils/html-escape";
import {
  adminMfaSettings,
  adminIpAllowlist,
  adminBypassCodes,
  adminLoginHistory,
  adminSecuritySettings,
  adminUsers,
  adminAuthorizedEmails,
  type AdminSecuritySettingsDb,
} from "@shared/schema";
import { eq, and, gt, isNull, or, lt, ne } from "drizzle-orm";
import crypto from "crypto";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { sendEmail, SENDER_EMAIL, isEmailConfigured } from "./email-sender";
import {
  EMAIL_BRAND,
  generateEmailHeader,
  generateEmailFooter,
  generateEmailWrapper,
  generateNotificationHeader,
  generateInfoCard,
  generateWarningBox,
  wrapEmailContent,
} from "../core/email/components";

const log = createChildLogger("admin-security");

const hashCode = (code: string): string =>
  crypto.createHash("sha256").update(code).digest("hex");

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!key) {
    throw new Error("ENCRYPTION_KEY or SESSION_SECRET must be set for secure encryption");
  }
  return key;
}

const encryptSecret = (secret: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", crypto.scryptSync(key, "salt", 32), iv);
  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decryptSecret = (encryptedSecret: string): string => {
  const key = getEncryptionKey();
  const [ivHex, encrypted] = encryptedSecret.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.scryptSync(key, "salt", 32), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

const generateRandomCode = (length: number): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomBytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomBytes[i] % chars.length);
  }
  return result;
};

export async function sendTestEmail(toEmail: string): Promise<{ success: boolean; message: string }> {
  const timestamp = new Date().toISOString();
  
  const body = `
    <p style="color: ${EMAIL_BRAND.mint}; font-weight: 600; font-size: 15px; margin: 0 0 16px 0;">Email configuration is working correctly.</p>
    ${generateInfoCard(`
      <p style="margin: 0 0 8px 0; color: ${EMAIL_BRAND.darkGray}; font-size: 14px;"><strong>Timestamp:</strong> ${timestamp}</p>
      <p style="margin: 0 0 8px 0; color: ${EMAIL_BRAND.darkGray}; font-size: 14px;"><strong>Recipient:</strong> ${toEmail}</p>
      <p style="margin: 0; color: ${EMAIL_BRAND.darkGray}; font-size: 14px;"><strong>Sender:</strong> ${SENDER_EMAIL}</p>
    `)}
    <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 13px; margin: 16px 0 0 0;">
      This is an automated test email from the Constancia Admin Centre verifying Microsoft Graph API configuration.
    </p>
  `;

  const htmlContent = generateEmailWrapper(
    generateEmailHeader({ variant: 'dark' }),
    body,
    generateEmailFooter({ variant: 'dark' })
  );

  try {
    await sendEmail({ to: toEmail, subject: "[Constancia] Email Configuration Test", htmlContent });
    log.info({ toEmail: redactEmail(toEmail) }, "Test email sent successfully");
    return { success: true, message: `Test email sent successfully to ${toEmail}` };
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Test email failed");
    return { success: false, message: error.message || "Failed to send test email" };
  }
}

export async function generateTotpSecret(
  adminId: string
): Promise<{ secret: string; qrCodeUrl: string; otpauthUrl: string }> {
  const [admin] = await db
    .select({ email: adminUsers.email, displayName: adminUsers.displayName })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  if (!admin) {
    throw new Error("Admin user not found");
  }

  const secret = authenticator.generateSecret(32);
  const accountName = admin.email || admin.displayName || adminId;
  const otpauthUrl = authenticator.keyuri(accountName, "Constancia Admin", secret);

  const encryptedSecret = encryptSecret(secret);

  const existingSettings = await db
    .select()
    .from(adminMfaSettings)
    .where(eq(adminMfaSettings.adminId, adminId))
    .limit(1);

  if (existingSettings.length > 0) {
    await db
      .update(adminMfaSettings)
      .set({
        totpSecret: encryptedSecret,
        totpEnabled: false,
        totpVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(adminMfaSettings.adminId, adminId));
  } else {
    await db.insert(adminMfaSettings).values({
      adminId,
      totpSecret: encryptedSecret,
      totpEnabled: false,
    });
  }

  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret, qrCodeUrl, otpauthUrl };
}

export async function verifyTotpSetup(
  adminId: string,
  token: string
): Promise<boolean> {
  const [mfaSettings] = await db
    .select()
    .from(adminMfaSettings)
    .where(eq(adminMfaSettings.adminId, adminId))
    .limit(1);

  if (!mfaSettings || !mfaSettings.totpSecret) {
    throw new Error("MFA not set up for this admin");
  }

  const secret = decryptSecret(mfaSettings.totpSecret);
  const isValid = authenticator.verify({ token, secret });

  if (isValid) {
    await db
      .update(adminMfaSettings)
      .set({
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(adminMfaSettings.adminId, adminId));

    await db
      .update(adminUsers)
      .set({
        mfaEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, adminId));
  }

  return isValid;
}

export async function verifyTotpLogin(
  adminId: string,
  token: string
): Promise<boolean> {
  const [mfaSettings] = await db
    .select()
    .from(adminMfaSettings)
    .where(
      and(
        eq(adminMfaSettings.adminId, adminId),
        eq(adminMfaSettings.totpEnabled, true)
      )
    )
    .limit(1);

  if (!mfaSettings || !mfaSettings.totpSecret) {
    return false;
  }

  const secret = decryptSecret(mfaSettings.totpSecret);
  return authenticator.verify({ token, secret });
}

export async function generateBackupCodes(adminId: string): Promise<string[]> {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 10; i++) {
    const code = generateRandomCode(8);
    codes.push(code);
    hashedCodes.push(hashCode(code));
  }

  const existingSettings = await db
    .select()
    .from(adminMfaSettings)
    .where(eq(adminMfaSettings.adminId, adminId))
    .limit(1);

  if (existingSettings.length > 0) {
    await db
      .update(adminMfaSettings)
      .set({
        backupCodes: hashedCodes,
        updatedAt: new Date(),
      })
      .where(eq(adminMfaSettings.adminId, adminId));
  } else {
    await db.insert(adminMfaSettings).values({
      adminId,
      backupCodes: hashedCodes,
    });
  }

  return codes;
}

export async function verifyBackupCode(
  adminId: string,
  code: string
): Promise<boolean> {
  const [mfaSettings] = await db
    .select()
    .from(adminMfaSettings)
    .where(eq(adminMfaSettings.adminId, adminId))
    .limit(1);

  if (!mfaSettings || !mfaSettings.backupCodes) {
    return false;
  }

  const hashedCode = hashCode(code.toUpperCase().replace(/\s/g, ""));
  const codeIndex = mfaSettings.backupCodes.indexOf(hashedCode);

  if (codeIndex === -1) {
    return false;
  }

  const updatedCodes = [...mfaSettings.backupCodes];
  updatedCodes.splice(codeIndex, 1);

  await db
    .update(adminMfaSettings)
    .set({
      backupCodes: updatedCodes,
      updatedAt: new Date(),
    })
    .where(eq(adminMfaSettings.adminId, adminId));

  return true;
}

export async function disableMfa(adminId: string): Promise<void> {
  await db
    .update(adminMfaSettings)
    .set({
      totpEnabled: false,
      totpSecret: null,
      totpVerifiedAt: null,
      backupCodes: null,
      updatedAt: new Date(),
    })
    .where(eq(adminMfaSettings.adminId, adminId));

  await db
    .update(adminUsers)
    .set({
      mfaEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, adminId));
}

export async function checkIpAllowed(ipAddress: string): Promise<boolean> {
  const settings = await getSecuritySettings();

  if (!settings.ipAllowlistEnabled) {
    return true;
  }

  const allowedIps = await db
    .select()
    .from(adminIpAllowlist)
    .where(eq(adminIpAllowlist.isActive, true));

  const normalizedIp = ipAddress.replace("::ffff:", "");

  return allowedIps.some((entry) => {
    const entryIp = entry.ipAddress.replace("::ffff:", "");
    if (entryIp.includes("/")) {
      return isIpInCidr(normalizedIp, entryIp);
    }
    if (entryIp === "*") {
      log.warn("IP allowlist contains wildcard '*' — all IPs are permitted. This should be temporary.");
      return true;
    }
    return entryIp === normalizedIp;
  });
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split("/");
  const mask = parseInt(bits, 10);

  if (isNaN(mask) || mask < 0 || mask > 32) {
    return false;
  }

  const ipParts = ip.split(".").map(Number);
  const rangeParts = range.split(".").map(Number);

  if (ipParts.length !== 4 || rangeParts.length !== 4) {
    return false;
  }

  const ipNum =
    (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum =
    (rangeParts[0] << 24) |
    (rangeParts[1] << 16) |
    (rangeParts[2] << 8) |
    rangeParts[3];
  const maskNum = ~((1 << (32 - mask)) - 1);

  return (ipNum & maskNum) === (rangeNum & maskNum);
}

export async function addIpToAllowlist(
  ip: string,
  description: string,
  addedBy: string
): Promise<{ id: string }> {
  const [result] = await db
    .insert(adminIpAllowlist)
    .values({
      ipAddress: ip,
      description,
      addedBy,
      isActive: true,
    })
    .returning({ id: adminIpAllowlist.id });

  return result;
}

export async function removeIpFromAllowlist(id: string): Promise<void> {
  await db
    .update(adminIpAllowlist)
    .set({ isActive: false })
    .where(eq(adminIpAllowlist.id, id));
}

export async function getIpAllowlist(): Promise<
  Array<{
    id: string;
    ipAddress: string;
    description: string | null;
    addedBy: string;
    isActive: boolean;
    createdAt: Date;
  }>
> {
  return await db
    .select()
    .from(adminIpAllowlist)
    .where(eq(adminIpAllowlist.isActive, true));
}

/**
 * Break-glass emergency access — replaces the old persistent bypass code system.
 *
 * Key differences from the removed bypass codes:
 *  - Tokens expire in exactly EMERGENCY_TOKEN_TTL_MINUTES (15 min), not configurable
 *  - Every request immediately emails ALL active admin accounts as an alert
 *  - Tokens are single-use and cannot be pre-generated or stored outside the DB
 *  - All emergency access events are recorded in the audit log
 */
const EMERGENCY_TOKEN_TTL_MINUTES = 15;

export async function requestEmergencyAccess(
  requestedBy: string,
  justification: string,
  ipAddress: string
): Promise<{ token: string; id: string; expiresAt: Date }> {
  const token = generateRandomCode(10);
  const hashedToken = hashCode(token);
  const expiresAt = new Date(Date.now() + EMERGENCY_TOKEN_TTL_MINUTES * 60 * 1000);

  const [result] = await db
    .insert(adminBypassCodes)
    .values({
      code: hashedToken,
      createdBy: requestedBy,
      description: `EMERGENCY ACCESS — ${justification} — requested from ${ipAddress} at ${new Date().toISOString()}`,
      expiresAt,
    })
    .returning({ id: adminBypassCodes.id });

  const admins = await db
    .select({ email: adminUsers.email, displayName: adminUsers.displayName })
    .from(adminUsers)
    .where(and(eq(adminUsers.isActive, true), ne(adminUsers.email, "info@constancia.io")));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #B91C1C; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #FEF2F2; border: 2px solid #B91C1C; }
        .detail { margin: 10px 0; }
        .label { font-weight: bold; color: #B91C1C; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>EMERGENCY ACCESS REQUESTED</h2>
        </div>
        <div class="content">
          <p><strong>An emergency access token has been generated for your admin panel.</strong></p>
          <div class="detail"><span class="label">Requested by:</span> ${escapeHtml(requestedBy)}</div>
          <div class="detail"><span class="label">IP Address:</span> ${escapeHtml(ipAddress)}</div>
          <div class="detail"><span class="label">Justification:</span> ${escapeHtml(justification)}</div>
          <div class="detail"><span class="label">Time:</span> ${new Date().toISOString()}</div>
          <div class="detail"><span class="label">Expires:</span> ${expiresAt.toISOString()} (${EMERGENCY_TOKEN_TTL_MINUTES} minutes)</div>
          <p style="margin-top: 20px; color: #B91C1C;"><strong>If this request was not authorised, revoke admin access immediately.</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated security alert from Constancia Admin Centre.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  for (const admin of admins) {
    if (!admin.email) continue;
    try {
      await sendEmail({
        to: admin.email,
        subject: `[Constancia Admin] EMERGENCY ACCESS REQUESTED by ${requestedBy}`,
        htmlContent,
      });
    } catch (error) {
      log.error(
        { err: error instanceof Error ? error : new Error(String(error)), email: admin.email },
        "Failed to send emergency access notification"
      );
    }
  }

  return { token, id: result.id, expiresAt };
}

export async function validateEmergencyToken(
  token: string,
  adminId: string
): Promise<{ valid: boolean; tokenId?: string }> {
  const hashedToken = hashCode(token.toUpperCase().replace(/\s/g, ""));
  const now = new Date();

  const [record] = await db
    .select()
    .from(adminBypassCodes)
    .where(
      and(
        eq(adminBypassCodes.code, hashedToken),
        eq(adminBypassCodes.isUsed, false),
        gt(adminBypassCodes.expiresAt, now)
      )
    )
    .limit(1);

  if (!record) {
    return { valid: false };
  }

  await db
    .update(adminBypassCodes)
    .set({ isUsed: true, usedBy: adminId, usedAt: now })
    .where(eq(adminBypassCodes.id, record.id));

  return { valid: true, tokenId: record.id };
}

export async function sendLoginNotification(
  adminId: string,
  adminEmail: string,
  adminName: string,
  ipAddress: string,
  userAgent: string,
  loginMethod: string
): Promise<void> {
  const settings = await getSecuritySettings();

  if (!settings.notifyOnLogin) {
    return;
  }

  // Fetch all admin emails except info@constancia.io
  const admins = await db
    .select({ email: adminUsers.email, displayName: adminUsers.displayName })
    .from(adminUsers)
    .where(
      and(
        eq(adminUsers.isActive, true),
        ne(adminUsers.email, "info@constancia.io")
      )
    );

  if (admins.length === 0) {
    return;
  }

  const timestamp = new Date().toISOString();
  const browserInfo = parseUserAgent(userAgent);

  const loginBody = `
    <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 15px; margin: 0 0 20px 0;">A new admin login has been detected on the Constancia platform.</p>
    ${generateInfoCard(`
      <p style="margin: 0 0 8px 0; color: ${EMAIL_BRAND.darkGray}; font-size: 14px;"><strong>Admin:</strong> ${escapeHtml(adminName)} (${escapeHtml(adminEmail)})</p>
      <p style="margin: 0 0 8px 0; color: ${EMAIL_BRAND.darkGray}; font-size: 14px;"><strong>Time:</strong> ${escapeHtml(timestamp)}</p>
      <p style="margin: 0 0 8px 0; color: ${EMAIL_BRAND.darkGray}; font-size: 14px;"><strong>IP Address:</strong> ${escapeHtml(ipAddress)}</p>
      <p style="margin: 0 0 8px 0; color: ${EMAIL_BRAND.darkGray}; font-size: 14px;"><strong>Browser:</strong> ${escapeHtml(browserInfo)}</p>
      <p style="margin: 0; color: ${EMAIL_BRAND.darkGray}; font-size: 14px;"><strong>Method:</strong> ${escapeHtml(loginMethod)}</p>
    `)}
    ${generateWarningBox('If this was not you, please take immediate action to secure the admin account.')}
  `;

  const htmlContent = generateEmailWrapper(
    generateNotificationHeader({ title: 'Admin Login Notification' }),
    loginBody,
    generateEmailFooter({ variant: 'dark' })
  );

  // Send to all active admins (except info@constancia.io)
  for (const admin of admins) {
    if (!admin.email) continue;
    try {
      await sendEmail({
        to: admin.email,
        subject: `[Constancia Admin] Login Alert: ${adminName}`,
        htmlContent,
      });
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)), email: redactEmail(admin.email) }, "Failed to send login notification");
    }
  }
}

function parseUserAgent(userAgent: string): string {
  const browsers = [
    { name: "Chrome", pattern: /Chrome\/(\d+)/ },
    { name: "Firefox", pattern: /Firefox\/(\d+)/ },
    { name: "Safari", pattern: /Safari\/(\d+)/ },
    { name: "Edge", pattern: /Edg\/(\d+)/ },
    { name: "Opera", pattern: /OPR\/(\d+)/ },
  ];

  const os = [
    { name: "Windows", pattern: /Windows NT (\d+\.\d+)/ },
    { name: "macOS", pattern: /Mac OS X (\d+[._]\d+)/ },
    { name: "Linux", pattern: /Linux/ },
    { name: "iOS", pattern: /iPhone|iPad/ },
    { name: "Android", pattern: /Android (\d+)/ },
  ];

  let browserInfo = "Unknown Browser";
  let osInfo = "Unknown OS";

  for (const browser of browsers) {
    const match = userAgent.match(browser.pattern);
    if (match) {
      browserInfo = `${browser.name} ${match[1]}`;
      break;
    }
  }

  for (const osItem of os) {
    const match = userAgent.match(osItem.pattern);
    if (match) {
      osInfo = osItem.name + (match[1] ? ` ${match[1].replace("_", ".")}` : "");
      break;
    }
  }

  return `${browserInfo} on ${osInfo}`;
}

export async function recordLoginAttempt(
  adminId: string,
  ipAddress: string,
  userAgent: string,
  method: string,
  success: boolean,
  failureReason?: string,
  bypassCodeId?: string
): Promise<void> {
  await db.insert(adminLoginHistory).values({
    adminId,
    ipAddress,
    userAgent,
    loginMethod: method,
    success,
    failureReason,
    bypassCodeId,
  });

  if (success) {
    await db
      .update(adminUsers)
      .set({
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, adminId));
  }
}

export async function getSecuritySettings(): Promise<AdminSecuritySettingsDb> {
  const [settings] = await db
    .select()
    .from(adminSecuritySettings)
    .where(eq(adminSecuritySettings.id, "global"))
    .limit(1);

  if (!settings) {
    const [newSettings] = await db
      .insert(adminSecuritySettings)
      .values({
        id: "global",
        ipAllowlistEnabled: false,
        mfaRequired: true,
        sessionTimeoutMinutes: 30,
        notifyOnLogin: true,
        notifyEmails: [],
      })
      .returning();

    return newSettings;
  }

  return settings;
}

export async function updateSecuritySettings(
  settings: Partial<Omit<AdminSecuritySettingsDb, "id" | "updatedAt">>,
  updatedBy: string
): Promise<AdminSecuritySettingsDb> {
  const [updated] = await db
    .update(adminSecuritySettings)
    .set({
      ...settings,
      updatedAt: new Date(),
      updatedBy,
    })
    .where(eq(adminSecuritySettings.id, "global"))
    .returning();

  if (!updated) {
    const [newSettings] = await db
      .insert(adminSecuritySettings)
      .values({
        id: "global",
        ...settings,
        updatedBy,
      } as any)
      .returning();

    return newSettings;
  }

  return updated;
}

export async function isIpAllowlistEnabled(): Promise<boolean> {
  const settings = await getSecuritySettings();
  return settings.ipAllowlistEnabled;
}

export async function isMfaRequired(): Promise<boolean> {
  const settings = await getSecuritySettings();
  return settings.mfaRequired;
}

export async function updateLastActivity(adminId: string): Promise<void> {
  await db
    .update(adminUsers)
    .set({
      lastActivityAt: new Date(),
    })
    .where(eq(adminUsers.id, adminId));
}

export async function checkSessionTimeout(adminId: string): Promise<boolean> {
  const settings = await getSecuritySettings();

  const [admin] = await db
    .select({ lastActivityAt: adminUsers.lastActivityAt })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  if (!admin || !admin.lastActivityAt) {
    return true;
  }

  const timeoutMs = settings.sessionTimeoutMinutes * 60 * 1000;
  const now = Date.now();
  const lastActivity = admin.lastActivityAt.getTime();

  return now - lastActivity > timeoutMs;
}

export async function getMfaSettings(
  adminId: string
): Promise<{
  totpEnabled: boolean;
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
} | null> {
  const [mfaSettings] = await db
    .select()
    .from(adminMfaSettings)
    .where(eq(adminMfaSettings.adminId, adminId))
    .limit(1);

  if (!mfaSettings) {
    return null;
  }

  return {
    totpEnabled: mfaSettings.totpEnabled,
    hasBackupCodes: (mfaSettings.backupCodes?.length ?? 0) > 0,
    backupCodesRemaining: mfaSettings.backupCodes?.length ?? 0,
  };
}

export async function getLoginHistory(
  adminId?: string,
  limit: number = 50
): Promise<
  Array<{
    id: string;
    adminId: string;
    ipAddress: string | null;
    userAgent: string | null;
    loginMethod: string;
    success: boolean;
    failureReason: string | null;
    createdAt: Date;
  }>
> {
  if (adminId) {
    return await db
      .select()
      .from(adminLoginHistory)
      .where(eq(adminLoginHistory.adminId, adminId))
      .orderBy(adminLoginHistory.createdAt)
      .limit(limit);
  }

  return await db
    .select()
    .from(adminLoginHistory)
    .orderBy(adminLoginHistory.createdAt)
    .limit(limit);
}

export async function cleanupExpiredEmergencyTokens(): Promise<number> {
  const now = new Date();

  const result = await db
    .delete(adminBypassCodes)
    .where(
      and(
        lt(adminBypassCodes.expiresAt, now),
        eq(adminBypassCodes.isUsed, false)
      )
    )
    .returning({ id: adminBypassCodes.id });

  return result.length;
}

/** @deprecated Use cleanupExpiredEmergencyTokens instead */
export const cleanupExpiredBypassCodes = cleanupExpiredEmergencyTokens;

export async function getAuthorizedEmails(): Promise<
  Array<{
    id: string;
    email: string;
    description: string | null;
    addedBy: string;
    isActive: boolean;
    createdAt: Date;
  }>
> {
  return await db
    .select()
    .from(adminAuthorizedEmails)
    .where(eq(adminAuthorizedEmails.isActive, true));
}

export async function addAuthorizedEmail(
  email: string,
  description: string,
  addedBy: string
): Promise<{ id: string }> {
  const [result] = await db
    .insert(adminAuthorizedEmails)
    .values({
      email: email.toLowerCase().trim(),
      description,
      addedBy,
      isActive: true,
    })
    .returning({ id: adminAuthorizedEmails.id });

  return result;
}

export async function removeAuthorizedEmail(id: string): Promise<void> {
  await db
    .update(adminAuthorizedEmails)
    .set({ isActive: false })
    .where(eq(adminAuthorizedEmails.id, id));
}

export async function isEmailInWhitelist(email: string): Promise<boolean> {
  if (!email) return false;
  const result = await db
    .select()
    .from(adminAuthorizedEmails)
    .where(
      and(
        eq(adminAuthorizedEmails.email, email.toLowerCase().trim()),
        eq(adminAuthorizedEmails.isActive, true)
      )
    )
    .limit(1);
  return result.length > 0;
}

export const AdminSecurityService = {
  generateTotpSecret,
  verifyTotpSetup,
  verifyTotpLogin,
  generateBackupCodes,
  verifyBackupCode,
  disableMfa,
  checkIpAllowed,
  addIpToAllowlist,
  removeIpFromAllowlist,
  getIpAllowlist,
  requestEmergencyAccess,
  validateEmergencyToken,
  cleanupExpiredEmergencyTokens,
  sendLoginNotification,
  recordLoginAttempt,
  getSecuritySettings,
  updateSecuritySettings,
  isIpAllowlistEnabled,
  isMfaRequired,
  updateLastActivity,
  checkSessionTimeout,
  getMfaSettings,
  getLoginHistory,
  getAuthorizedEmails,
  addAuthorizedEmail,
  removeAuthorizedEmail,
  isEmailInWhitelist,
};

export default AdminSecurityService;
