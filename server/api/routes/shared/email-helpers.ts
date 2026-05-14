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
  EMAIL_CONTACT,
} from '../../../core/email/components';
import { createChildLogger } from '../../../lib/logger';
import { sendEmailViaGraph, SENDER_EMAIL } from '../../../services/ms-graph-email';
import { escapeHtml } from '../../../utils/html-escape';

const log = createChildLogger('email-helpers');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const OTP_EXPIRY_MINUTES = 10;

export async function sendContactFormNotification(submission: {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  message: string;
  phone?: string;
}): Promise<boolean> {
  try {
    const contactDetailsTable = `
      <h2 style="color: ${EMAIL_BRAND.navy}; margin-top: 0;">Contact Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray}; width: 120px;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${escapeHtml(submission.firstName)} ${escapeHtml(submission.lastName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Email:</strong></td>
          <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(submission.email)}" style="color: ${EMAIL_BRAND.teal};">${escapeHtml(submission.email)}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Company:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${escapeHtml(submission.company)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Job Title:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${escapeHtml(submission.jobTitle)}</td>
        </tr>
        ${submission.phone ? `
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Phone:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${escapeHtml(submission.phone)}</td>
        </tr>
        ` : ''}
      </table>
    `;

    const messageSection = `
      <div style="background: ${EMAIL_BRAND.white}; padding: 20px; border: 1px solid ${EMAIL_BRAND.mediumGray}; border-radius: 8px; margin-top: 20px;">
        <h2 style="color: ${EMAIL_BRAND.navy}; margin-top: 0;">Message</h2>
        <p style="color: ${EMAIL_BRAND.darkGray}; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(submission.message)}</p>
      </div>
    `;

    await sendEmailViaGraph(
      SENDER_EMAIL,
      `New Contact Form Submission from ${submission.firstName} ${submission.lastName}`,
      `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${generateNotificationHeader({ title: 'New Contact Form Submission', subtitle: 'Constancia Website' })}
          
          ${generateInfoCard(contactDetailsTable)}
          ${messageSection}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 12px; text-align: center;">
            This notification was sent from the Constancia website contact form.
            <br>
            Submitted: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      `
    );

    return true;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Contact form notification error");
    return false;
  }
}

export async function sendContactVerificationEmail(to: string, firstName: string, token: string): Promise<boolean> {
  try {
    const baseUrl = process.env.BASE_URL || 'https://constancia.io';
    const verificationLink = `${baseUrl}/api/contact/verify?token=${token}`;
    
    const header = generateEmailHeader({ variant: 'dark' });
    
    const body = `
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; margin: 0 0 20px 0;">Hi ${escapeHtml(firstName)},</p>
      
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for contacting Constancia. Please verify your email address to confirm your enquiry.
      </p>
      
      ${generateCtaButton('Verify Email Address', verificationLink)}
      
      <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; margin: 25px 0 10px 0;">
        If the button above doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color: ${EMAIL_BRAND.cyan}; font-size: 13px; word-break: break-all; background-color: ${EMAIL_BRAND.lightGray}; padding: 12px; border-radius: 4px; margin: 0 0 25px 0;">
        ${verificationLink}
      </p>
      
      ${generateWarningBox('<strong>Note:</strong> This link expires in 24 hours. After expiration, you\'ll need to submit a new contact request.')}
      
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
        Once verified, our team will review your enquiry and get back to you shortly.
      </p>
    `;
    
    const footer = generateEmailFooter({ variant: 'dark', showFinanceCompass: true });
    
    await sendEmailViaGraph(
      to,
      `Verify your email - Constancia Contact`,
      generateEmailWrapper(header, body, footer)
    );

    return true;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to send contact verification email");
    return false;
  }
}

export async function sendOtpEmail(email: string, firstName: string, otp: string): Promise<boolean> {
  try {
    const header = generateEmailHeader({ variant: 'light' });
    
    const body = `
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; margin: 0 0 20px 0;">Hi ${escapeHtml(firstName)},</p>
      
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for your interest in Constancia resources. Please use the following code to access your download:
      </p>
      
      ${generateOtpBox(otp)}
      
      <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; margin: 0;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
    `;
    
    const footer = generateEmailFooter({ variant: 'dark', showFinanceCompass: true });
    
    await sendEmailViaGraph(
      email,
      "Your Constancia Resource Access Code",
      generateEmailWrapper(header, body, footer)
    );

    return true;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to send OTP email");
    return false;
  }
}

export async function sendLeadVerificationNotification(lead: {
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
    const hasFingerprintData = lead.screenResolution || lead.timezone || lead.language || lead.referrer || lead.pageUrl;
    
    const fingerprintSection = hasFingerprintData ? `
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 14px;">Browser Fingerprint Data</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          ${lead.screenResolution ? `
          <tr>
            <td style="padding: 4px 0; color: #856404; width: 120px;"><strong>Screen:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.screenResolution}</td>
          </tr>` : ''}
          ${lead.timezone ? `
          <tr>
            <td style="padding: 4px 0; color: #856404;"><strong>Timezone:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.timezone}</td>
          </tr>` : ''}
          ${lead.language ? `
          <tr>
            <td style="padding: 4px 0; color: #856404;"><strong>Language:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.language}</td>
          </tr>` : ''}
          ${lead.referrer ? `
          <tr>
            <td style="padding: 4px 0; color: #856404;"><strong>Referrer:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.referrer}</td>
          </tr>` : ''}
          ${lead.pageUrl ? `
          <tr>
            <td style="padding: 4px 0; color: #856404;"><strong>Page URL:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${lead.pageUrl}</td>
          </tr>` : ''}
        </table>
      </div>
    ` : '';

    const leadDetailsTable = `
      <h2 style="color: ${EMAIL_BRAND.navy}; margin-top: 0;">Lead Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray}; width: 120px;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${lead.firstName} ${lead.lastName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Email:</strong></td>
          <td style="padding: 8px 0;"><a href="mailto:${lead.email}" style="color: ${EMAIL_BRAND.teal};">${lead.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Company:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${lead.company}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Job Title:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${lead.jobTitle}</td>
        </tr>
        ${lead.resourceTitle ? `
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Resource:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${lead.resourceTitle}</td>
        </tr>
        ` : ''}
      </table>
    `;

    await sendEmailViaGraph(
      SENDER_EMAIL,
      `New Verified Lead: ${lead.firstName} ${lead.lastName} from ${lead.company}`,
      `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${generateNotificationHeader({ title: 'New Verified Lead', subtitle: 'Resource Download' })}
          
          ${generateInfoCard(leadDetailsTable)}
          
          ${fingerprintSection}
          
          ${generateSuccessBox('This lead has verified their email address via OTP and downloaded a resource.')}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 12px; text-align: center;">
            This notification was sent automatically from the Constancia website.
            <br>
            Verified: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      `
    );

    log.info("Lead notification email sent successfully via Graph API");
    return true;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Lead verification notification error");
    return false;
  }
}

export interface HubSpotLeadData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  transformationPriorities?: string[];
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

export async function syncLeadToHubSpot(lead: HubSpotLeadData): Promise<{ success: boolean; contactId?: string }> {
  if (!HUBSPOT_ACCESS_TOKEN) {
    log.warn("HubSpot access token not configured");
    return { success: false };
  }

  const properties: Record<string, string> = {
    firstname: lead.firstName,
    lastname: lead.lastName,
    email: lead.email,
    company: lead.company,
    jobtitle: lead.jobTitle,
    hs_lead_status: "NEW",
    newsletter_subscribed: lead.subscribeNewsletter !== false ? "true" : "false",
  };
  
  // Add phone if provided
  if (lead.phone) {
    properties.phone = lead.phone;
  }
  
  // Add industry if provided
  if (lead.industry) {
    properties.industry = lead.industry;
  }
  
  // Add company size if provided (using HubSpot's company_size property)
  if (lead.companySize) {
    properties.company_size = lead.companySize;
  }

  const messageLines: string[] = [];
  messageLines.push("Source: Constancia Website Resource Download");
  messageLines.push(`Newsletter: ${lead.subscribeNewsletter !== false ? 'Yes' : 'No'}`);
  
  if (lead.resourceId) messageLines.push(`Resource: ${lead.resourceId}`);
  if (lead.resourceTitle) messageLines.push(`Title: ${lead.resourceTitle}`);
  if (lead.transformationPriorities && lead.transformationPriorities.length > 0) {
    messageLines.push(`Transformation Priorities: ${lead.transformationPriorities.join(", ")}`);
  }
  if (lead.ipAddress) messageLines.push(`IP: ${lead.ipAddress}`);
  if (lead.screenResolution) messageLines.push(`Screen: ${lead.screenResolution}`);
  if (lead.timezone) messageLines.push(`Timezone: ${lead.timezone}`);
  if (lead.language) messageLines.push(`Language: ${lead.language}`);
  if (lead.referrer) messageLines.push(`Referrer: ${lead.referrer}`);
  if (lead.pageUrl) messageLines.push(`Page: ${lead.pageUrl}`);
  if (lead.clickTimestamp) messageLines.push(`Click: ${lead.clickTimestamp}`);

  if (messageLines.length > 0) {
    properties.message = messageLines.join("\n");
  }

  try {
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

    if (createResponse.status === 409) {
      log.info("Contact exists in HubSpot, attempting update");
      
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
          delete properties.hs_lead_status;
          
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
            log.error({ updateError }, "HubSpot update failed");
            return { success: false };
          }
        }
      }
      
      log.warn("Could not update existing HubSpot contact");
      return { success: true };
    }

    const errorData = await createResponse.text();
    log.error({ status: createResponse.status, errorData }, "HubSpot sync failed");
    return { success: false };
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "HubSpot sync error");
    return { success: false };
  }
}

export { SENDER_EMAIL, OTP_EXPIRY_MINUTES };
