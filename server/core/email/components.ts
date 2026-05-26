/**
 * Modular Email Components
 *
 * Reusable HTML components for email templates with Constancia branding.
 * Includes headers with logo, footers, and common styling.
 */

import { TYPE_LOGO_TURQUOISE_SMALL_BASE64, TYPE_LOGO_WHITE_SMALL_BASE64 } from '../../pdf-logo-base64';

export const EMAIL_BRAND = {
  navy: '#02205B',
  cyan: '#12EBFC',
  teal: '#0884AA',
  cream: '#FEFFF3',
  white: '#FFFFFF',
  lightGray: '#f8f9fa',
  mediumGray: '#e5e7eb',
  darkGray: '#252826',
  mutedGray: '#666666',
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
    showTagline = false 
  } = options;

  const isDark = variant === 'dark';
  const logo = isDark ? TYPE_LOGO_WHITE_SMALL_BASE64 : TYPE_LOGO_TURQUOISE_SMALL_BASE64;
  const bgColor = isDark ? EMAIL_BRAND.navy : EMAIL_BRAND.white;
  const taglineColor = isDark ? EMAIL_BRAND.white : EMAIL_BRAND.teal;

  return `
    <div style="background-color: ${bgColor}; padding: 30px 20px; text-align: center;">
      <img src="${logo}" alt="Constancia" style="height: 36px; max-width: 140px;" />
      ${showTagline ? `
        <p style="color: ${taglineColor}; margin: 12px 0 0 0; font-size: 13px; opacity: 0.9;">${tagline}</p>
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
    disclaimer = 'Constancia delivers connected finance intelligence — bringing ERP, EPM, HRIS, CRM and your data warehouse into one source of truth. Official Abacum partner for mid-market FP&A. OneStream partner for enterprise EPM.'
  } = options;

  const isDark = variant === 'dark';
  const bgColor = isDark ? EMAIL_BRAND.navy : EMAIL_BRAND.lightGray;
  const textColor = isDark ? EMAIL_BRAND.white : EMAIL_BRAND.darkGray;
  const mutedColor = isDark ? '#aaaaaa' : EMAIL_BRAND.mutedGray;
  const linkColor = isDark ? EMAIL_BRAND.cyan : EMAIL_BRAND.teal;

  const financeCompassCta = showFinanceCompass ? `
    <div style="margin-bottom: 16px;">
      <a href="${EMAIL_CONTACT.financeCompassUrl}" 
         style="display: inline-block; background-color: ${EMAIL_BRAND.cyan}; color: ${EMAIL_BRAND.navy}; 
                padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
        Try FinanceCompass Free
      </a>
    </div>
  ` : '';

  return `
    <div style="background-color: ${bgColor}; padding: 25px 20px; text-align: center;">
      ${financeCompassCta}
      <p style="color: ${textColor}; font-size: 12px; margin: 0 0 10px 0; line-height: 1.6;">
        ${disclaimer}
      </p>
      <p style="color: ${mutedColor}; font-size: 12px; margin: 0 0 10px 0;">
        ${EMAIL_CONTACT.address}
      </p>
      <a href="${EMAIL_CONTACT.websiteUrl}" style="color: ${linkColor}; font-size: 12px; text-decoration: none;">${EMAIL_CONTACT.website}</a>
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
    <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, ${EMAIL_BRAND.navy} 0%, ${EMAIL_BRAND.teal} 100%); border-radius: 8px;">
      <h1 style="color: ${EMAIL_BRAND.cyan}; margin: 0; font-size: 22px;">${title}</h1>
      ${subtitle ? `<p style="color: ${EMAIL_BRAND.white}; margin: 8px 0 0 0; font-size: 13px;">${subtitle}</p>` : ''}
    </div>
  `;
}

export function generateOtpBox(otp: string): string {
  return `
    <div style="background: linear-gradient(135deg, ${EMAIL_BRAND.navy} 0%, ${EMAIL_BRAND.teal} 100%); padding: 24px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: ${EMAIL_BRAND.cyan};">${otp}</span>
    </div>
  `;
}

export function generateCtaButton(text: string, href: string): string {
  return `
    <div style="text-align: center; margin: 35px 0;">
      <a href="${href}" 
         style="display: inline-block; background-color: ${EMAIL_BRAND.cyan}; color: ${EMAIL_BRAND.navy}; 
                padding: 16px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

export function generateWarningBox(message: string): string {
  return `
    <div style="background-color: #fff8e6; border-left: 4px solid #f0b429; padding: 12px 16px; margin: 25px 0;">
      <p style="color: #8a6d3b; font-size: 14px; margin: 0;">
        ${message}
      </p>
    </div>
  `;
}

export function generateSuccessBox(message: string): string {
  return `
    <div style="background: #e8f4e8; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
      <p style="color: #155724; margin: 0; font-weight: 500;">
        ${message}
      </p>
    </div>
  `;
}

export function generateInfoCard(content: string): string {
  return `
    <div style="background: ${EMAIL_BRAND.lightGray}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      ${content}
    </div>
  `;
}

export function wrapEmailContent(content: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #EFEAE0;">
      ${content}
    </div>
  `;
}

export function generateEmailWrapper(header: string, body: string, footer: string): string {
  return wrapEmailContent(`
    ${header}
    <div style="background-color: ${EMAIL_BRAND.white}; padding: 40px 30px;">
      ${body}
    </div>
    ${footer}
  `);
}
