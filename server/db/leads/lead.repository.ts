/**
 * Lead Repository Implementation
 * 
 * Wraps the existing storage layer to implement the ILeadRepository interface.
 * Maps between database records (ResourceLeadDb) and domain types (Lead).
 */

import type { IStorage } from '../../storage';
import type { ILeadRepository, LeadFilters, UpdateLeadData } from '../../core/leads/interfaces';
import type { PaginationParams, PaginatedResult } from '../../core/types';
import { Lead, CreateLeadData, LeadStatus, LeadSource } from '../../core/leads/types';
import type { ResourceLeadDb } from '@shared/schema';

/**
 * Maps a database lead record to the domain Lead type
 */
function mapDbLeadToDomain(dbLead: ResourceLeadDb): Lead {
  return {
    id: dbLead.id,
    firstName: dbLead.firstName,
    lastName: dbLead.lastName,
    email: dbLead.email,
    emailHash: dbLead.emailHash || '',
    company: dbLead.company,
    jobTitle: dbLead.jobTitle,
    resourceId: dbLead.resourceId,
    subscribeNewsletter: dbLead.subscribeNewsletter,
    status: dbLead.verified ? LeadStatus.VERIFIED : LeadStatus.PENDING_VERIFICATION,
    source: LeadSource.RESOURCE_DOWNLOAD,
    verified: dbLead.verified,
    verifiedAt: dbLead.verifiedAt,
    hubspotContactId: dbLead.hubspotContactId,
    ipAddress: dbLead.ipAddress,
    userAgent: dbLead.userAgent,
    createdAt: dbLead.createdAt,
    updatedAt: null,
  };
}

export class LeadRepository implements ILeadRepository {
  constructor(private readonly storage: IStorage) {}

  async findById(id: string): Promise<Lead | null> {
    const dbLead = await this.storage.getResourceLeadById(id);
    return dbLead ? mapDbLeadToDomain(dbLead) : null;
  }

  async findByEmail(email: string): Promise<Lead | null> {
    const dbLead = await this.storage.getResourceLeadByEmail(email);
    return dbLead ? mapDbLeadToDomain(dbLead) : null;
  }

  /**
   * Find lead by email hash
   * Note: Requires storage.getResourceLeadByEmailHash method - not yet implemented
   * @throws Error when called - implement storage layer method first
   */
  async findByEmailHash(_emailHash: string): Promise<Lead | null> {
    throw new Error(
      'LeadRepository.findByEmailHash: Not implemented. ' +
      'Storage layer does not yet support lookup by email hash. ' +
      'Implement storage.getResourceLeadByEmailHash to enable this method.'
    );
  }

  /**
   * Find all leads with pagination and filters
   * Note: Requires storage.getResourceLeads method - not yet implemented
   * @throws Error when called - implement storage layer method first
   */
  async findAll(_params?: PaginationParams & LeadFilters): Promise<PaginatedResult<Lead>> {
    throw new Error(
      'LeadRepository.findAll: Not implemented. ' +
      'Storage layer does not yet support listing all leads. ' +
      'Implement storage.getResourceLeads to enable this method.'
    );
  }

  /**
   * Create a new lead
   * Note: emailHash in the signature is for interface compatibility.
   * The storage layer automatically computes the hash from the email
   * via hashForLookup(email), so the passed emailHash is not used directly.
   */
  async create(data: CreateLeadData & { emailHash: string }): Promise<Lead> {
    // Storage layer auto-generates emailHash from email via hashForLookup()
    const dbLead = await this.storage.createResourceLead({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      company: data.company,
      jobTitle: data.jobTitle,
      resourceId: data.resourceId,
      subscribeNewsletter: data.subscribeNewsletter,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      screenResolution: data.screenResolution,
      timezone: data.timezone,
      language: data.language,
      platform: data.platform,
      deviceMemory: data.deviceMemory,
      hardwareConcurrency: data.hardwareConcurrency,
      referrer: data.referrer,
      pageUrl: data.pageUrl,
      clickTimestamp: data.clickTimestamp,
    });
    return mapDbLeadToDomain(dbLead);
  }

  /**
   * Update lead data
   * Note: Requires storage.updateResourceLead method - not yet implemented
   * @throws Error when called - implement storage layer method first
   */
  async update(_id: string, _data: UpdateLeadData): Promise<Lead | null> {
    throw new Error(
      'LeadRepository.update: Not implemented. ' +
      'Storage layer does not yet support updating leads. ' +
      'Implement storage.updateResourceLead to enable this method.'
    );
  }

  async markVerified(id: string): Promise<Lead | null> {
    await this.storage.verifyResourceLead(id);
    return this.findById(id);
  }

  async updateHubSpotSync(id: string, contactId: string): Promise<void> {
    await this.storage.updateLeadHubspotSync(id, contactId);
  }

  /**
   * Delete lead
   * Note: Requires storage.deleteResourceLead method - not yet implemented
   * @throws Error when called - implement storage layer method first
   */
  async delete(_id: string): Promise<boolean> {
    throw new Error(
      'LeadRepository.delete: Not implemented. ' +
      'Storage layer does not yet support deleting leads. ' +
      'Implement storage.deleteResourceLead to enable this method.'
    );
  }
}

/**
 * Factory function to create a LeadRepository instance
 */
export function createLeadRepository(storage: IStorage): ILeadRepository {
  return new LeadRepository(storage);
}
