/**
 * Modular Email Components
 *
 * Reusable HTML components for email templates with Constancia branding.
 * Palette: charcoal #252826 · cream #F6F3EE · rose #C77A93 · mint #7FB8A3
 */

// CID reference — logo.png is attached as a MIME part by email-sender.ts on
// every outgoing email, so this renders correctly in Gmail and all major clients
// without any external URL or base64 bloat.
const LOGO_URL = "cid:constancia-logo";

export const EMAIL_BRAND = {
  // Core Constancia palette
  charcoal: '#252826',    // brand-slate — dark headers / footers
  cream: '#F6F3EE',       // brand-cream — primary light ink
  warmCream: '#EFEAE0',   // outer wrapper background
  rose: '#C77A93',        // brand-rose — CTA buttons / accents
  mint: '#7FB8A3',        // brand-mint — secondary accent
  deepMint: '#5E8D7A',    // brand-teal — links / deep accent
  // Utility
  white: '#FFFFFF',
  lightGray: '#f5f2ec',   // warm light card surface
  mediumGray: '#dedad2',  // warm border colour
  darkGray: '#252826',    // alias for charcoal (used in body text)
  mutedGray: '#7a7773',   // muted body text on light backgrounds
  mutedCream: '#b8b4ae',  // muted text on dark backgrounds
};

export const EMAIL_CONTACT = {
  legalName: 'Constancia Holdings Limited',
  companyNumber: '17227112',
  email: 'info@constancia.io',
  website: 'constancia.com',
  websiteUrl: 'https://constancia.com',
  address: 'Blount House, Hall Court, Hall Park Way, Telford, Shropshire, TF3 4NQ',
  financeCompassUrl: 'https://constancia.com/finance-compass',
};

export interface EmailHeaderOptions {
  variant?: 'light' | 'dark';
  tagline?: string;
  showTagline?: boolean;
}

export function generateEmailHeader(options: EmailHeaderOptions = {}): string {
  const {
    variant = 'dark',
    tagline = '',
    showTagline = false,
  } = options;

  const isDark = variant === 'dark';
  const bgColor = isDark ? EMAIL_BRAND.charcoal : EMAIL_BRAND.warmCream;
  const taglineColor = isDark ? EMAIL_BRAND.mint : EMAIL_BRAND.deepMint;

  return `
    <div style="background-color: ${bgColor}; padding: 32px 24px; text-align: center;">
      <img src="${LOGO_URL}" alt="Constancia" style="height: 38px; max-width: 160px; display: block; margin: 0 auto;" />
      ${showTagline ? `
        <p style="color: ${taglineColor}; margin: 12px 0 0 0; font-size: 13px; letter-spacing: 0.04em;">${tagline}</p>
      ` : ''}
    </div>
  `;
}

export interface EmailFooterOptions {
  variant?: 'light' | 'dark';
  showFinanceCompass?: boolean;
  disclaimer?: string;
}

export function generateEmailFooter(options: EmailFooterOptions = {}): string {
  const {
    variant = 'dark',
    showFinanceCompass = false,
    disclaimer = 'Constancia delivers connected finance intelligence — bringing ERP, EPM, HRIS, CRM and your data warehouse into one source of truth. Official Abacum partner for mid-market FP&A. OneStream partner for enterprise EPM.',
  } = options;

  const isDark = variant === 'dark';
  const bgColor = isDark ? EMAIL_BRAND.charcoal : EMAIL_BRAND.warmCream;
  const textColor = isDark ? EMAIL_BRAND.mutedCream : EMAIL_BRAND.mutedGray;
  const linkColor = isDark ? EMAIL_BRAND.mint : EMAIL_BRAND.deepMint;

  const financeCompassCta = showFinanceCompass ? `
    <div style="margin-bottom: 20px;">
      <a href="${EMAIL_CONTACT.financeCompassUrl}"
         style="display: inline-block; background-color: ${EMAIL_BRAND.rose}; color: ${EMAIL_BRAND.cream};
                padding: 12px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.02em;">
        Try FinanceCompass Free
      </a>
    </div>
  ` : '';

  return `
    <div style="background-color: ${bgColor}; padding: 28px 24px; text-align: center;">
      ${financeCompassCta}
      <p style="color: ${textColor}; font-size: 12px; margin: 0 0 10px 0; line-height: 1.7;">
        ${disclaimer}
      </p>
      <p style="color: ${textColor}; font-size: 12px; margin: 0 0 10px 0;">
        ${EMAIL_CONTACT.address}
      </p>
      <a href="${EMAIL_CONTACT.websiteUrl}" style="color: ${linkColor}; font-size: 12px; text-decoration: none; letter-spacing: 0.03em;">${EMAIL_CONTACT.website}</a>
    </div>
  `;
}

export interface NotificationHeaderOptions {
  title: string;
  subtitle?: string;
}

export function generateNotificationHeader(options: NotificationHeaderOptions): string {
  const { title, subtitle } = options;

  return `
    <div style="text-align: center; margin-bottom: 28px; padding: 28px 24px; background-color: ${EMAIL_BRAND.charcoal}; border-radius: 4px;">
      <img src="${LOGO_URL}" alt="Constancia" style="height: 32px; max-width: 140px; display: block; margin: 0 auto 16px;" />
      <h1 style="color: ${EMAIL_BRAND.cream}; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.02em;">${title}</h1>
      ${subtitle ? `<p style="color: ${EMAIL_BRAND.mint}; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 0.04em;">${subtitle}</p>` : ''}
    </div>
  `;
}

export function generateOtpBox(otp: string): string {
  return `
    <div style="background-color: ${EMAIL_BRAND.charcoal}; padding: 28px 24px; border-radius: 4px; text-align: center; margin: 28px 0;">
      <p style="color: ${EMAIL_BRAND.mint}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 12px 0;">Your access code</p>
      <span style="font-size: 38px; font-weight: 700; letter-spacing: 12px; color: ${EMAIL_BRAND.cream}; font-family: 'Courier New', monospace;">${otp}</span>
    </div>
  `;
}

export function generateCtaButton(text: string, href: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${href}"
         style="display: inline-block; background-color: ${EMAIL_BRAND.rose}; color: ${EMAIL_BRAND.cream};
                padding: 15px 40px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.03em;">
        ${text}
      </a>
    </div>
  `;
}

export function generateWarningBox(message: string): string {
  return `
    <div style="background-color: #f9f3e8; border: 1px solid #dedad2; border-radius: 4px; padding: 14px 18px; margin: 24px 0;">
      <p style="color: #7a6a50; font-size: 14px; margin: 0; line-height: 1.6;">
        ${message}
      </p>
    </div>
  `;
}

export function generateSuccessBox(message: string): string {
  return `
    <div style="background-color: #edf5f1; border: 1px solid ${EMAIL_BRAND.mint}; border-radius: 4px; padding: 14px 18px; margin: 24px 0;">
      <p style="color: ${EMAIL_BRAND.deepMint}; margin: 0; font-weight: 500; font-size: 14px; line-height: 1.6;">
        ${message}
      </p>
    </div>
  `;
}

export function generateInfoCard(content: string): string {
  return `
    <div style="background: ${EMAIL_BRAND.lightGray}; padding: 22px; border-radius: 4px; margin-bottom: 20px; border: 1px solid ${EMAIL_BRAND.mediumGray};">
      ${content}
    </div>
  `;
}

export function wrapEmailContent(content: string): string {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${EMAIL_BRAND.warmCream};">
      ${content}
    </div>
  `;
}

export function generateEmailWrapper(header: string, body: string, footer: string): string {
  return wrapEmailContent(`
    ${header}
    <div style="background-color: ${EMAIL_BRAND.white}; padding: 40px 32px;">
      ${body}
    </div>
    ${footer}
  `);
}
