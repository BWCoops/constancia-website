/**
 * HubSpot Integration Service
 * Uses Replit's HubSpot connector for OAuth-based API access
 * 
 * Integration: connection:conn_hubspot_01K82146WPTCAR5CJTMDC3382T
 */

import { Client } from '@hubspot/api-client';
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("hubspot");

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 5 min buffer for safety)
  if (connectionSettings?.settings?.access_token) {
    const expiresAt = connectionSettings.settings.expires_at;
    if (expiresAt) {
      const expiryTime = new Date(expiresAt).getTime();
      const bufferMs = 5 * 60 * 1000; // 5 minute buffer
      if (expiryTime - bufferMs > Date.now()) {
        return connectionSettings.settings.access_token;
      }
    }
  }
  
  // Clear cached settings to force refresh
  connectionSettings = null;
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=hubspot',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('HubSpot not connected');
  }
  return accessToken;
}

async function getUncachableHubSpotClient(): Promise<Client> {
  const accessToken = await getAccessToken();
  return new Client({ accessToken });
}

export interface HubSpotContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  industry?: string;
  jobTitle?: string;
  numberOfEmployees?: string;
  annualRevenue?: string;
  financeReadinessScore?: number;
  maturityLevel?: string;
  leadSource?: string;
  leadPriority?: string;
}

export interface HubSpotContactResult {
  success: boolean;
  contactId?: string;
  isNew?: boolean;
  error?: string;
}

/**
 * Create or update a contact in HubSpot
 * If contact exists (by email), updates it; otherwise creates new
 */
export async function createOrUpdateContact(data: HubSpotContactData): Promise<HubSpotContactResult> {
  try {
    const client = await getUncachableHubSpotClient();
    
    const properties: Record<string, string> = {
      email: data.email,
    };
    
    if (data.firstName) properties.firstname = data.firstName;
    if (data.lastName) properties.lastname = data.lastName;
    if (data.company) properties.company = data.company;
    if (data.industry) properties.industry = data.industry;
    if (data.jobTitle) properties.jobtitle = data.jobTitle;
    if (data.numberOfEmployees) properties.numberofemployees = data.numberOfEmployees;
    if (data.annualRevenue) properties.annualrevenue = data.annualRevenue;
    
    // Build assessment summary for the message field (using standard HubSpot properties)
    const assessmentDetails: string[] = [];
    if (data.financeReadinessScore !== undefined) {
      assessmentDetails.push(`Finance Readiness Score: ${data.financeReadinessScore}%`);
    }
    if (data.maturityLevel) {
      assessmentDetails.push(`Maturity Level: ${data.maturityLevel}`);
    }
    if (data.leadSource) {
      assessmentDetails.push(`Lead Source: ${data.leadSource}`);
    }
    if (data.leadPriority) {
      assessmentDetails.push(`Lead Priority: ${data.leadPriority}`);
    }
    
    if (assessmentDetails.length > 0) {
      properties.message = `[Constancia FinanceCompass Assessment]\n${assessmentDetails.join('\n')}`;
    }
    
    let contactId: string | undefined;
    let isNew = false;
    
    try {
      const existingContact = await client.crm.contacts.basicApi.getById(
        data.email,
        undefined,
        undefined,
        undefined,
        undefined,
        'email'
      );
      contactId = existingContact.id;
      
      await client.crm.contacts.basicApi.update(contactId, { properties });
      log.info({ contactId }, "Updated existing contact");
    } catch (err: any) {
      const statusCode = err.code || err.response?.statusCode;
      const isNotFound = statusCode === 404 || err.message?.includes('not found') || err.message?.includes('resource not found');
      
      if (isNotFound) {
        const newContact = await client.crm.contacts.basicApi.create({ properties });
        contactId = newContact.id;
        isNew = true;
        log.info({ contactId }, "Created new contact");
      } else {
        throw err;
      }
    }
    
    return {
      success: true,
      contactId,
      isNew,
    };
  } catch (error: any) {
    log.error({ err: error instanceof Error ? error : new Error(String(error.message || error)) }, "Error creating/updating contact");
    return {
      success: false,
      error: error.message || 'Unknown HubSpot error',
    };
  }
}

/**
 * Check if HubSpot integration is available
 */
export async function isHubSpotConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
