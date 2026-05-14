/**
 * Contact Repository Implementation
 * 
 * Wraps the existing storage layer to implement the IContactRepository interface.
 * Maps between database records (ContactSubmission) and domain types.
 */

import type { IStorage } from '../../storage';
import type { IContactRepository, ContactFilters, UpdateContactData } from '../../core/leads/interfaces';
import type { PaginationParams, PaginatedResult } from '../../core/types';
import type { ContactSubmission, CreateContactData } from '../../core/leads/types';
import type { ContactSubmission as ContactSubmissionDb } from '@shared/schema';

/**
 * Maps a database contact record to the domain ContactSubmission type
 */
function mapDbContactToDomain(dbContact: ContactSubmissionDb): ContactSubmission {
  return {
    id: dbContact.id,
    firstName: dbContact.firstName,
    lastName: dbContact.lastName,
    email: dbContact.email,
    emailHash: dbContact.emailHash,
    company: dbContact.company,
    jobTitle: dbContact.jobTitle,
    phone: dbContact.phone,
    message: dbContact.message,
    consentMarketing: dbContact.consentMarketing,
    verified: dbContact.verified,
    verifiedAt: dbContact.verifiedAt,
    hubspotSynced: dbContact.hubspotSynced,
    emailSent: dbContact.emailSent,
    createdAt: dbContact.createdAt,
  };
}

export class ContactRepository implements IContactRepository {
  constructor(private readonly storage: IStorage) {}

  async findById(id: string): Promise<ContactSubmission | null> {
    const dbContact = await this.storage.getContactSubmissionById(id);
    return dbContact ? mapDbContactToDomain(dbContact) : null;
  }

  async findByEmail(email: string): Promise<ContactSubmission[]> {
    const result = await this.storage.getContactSubmissions();
    return result.items
      .filter((s) => s.email.toLowerCase() === email.toLowerCase())
      .map(mapDbContactToDomain);
  }

  async findByEmailHash(emailHash: string): Promise<ContactSubmission[]> {
    const result = await this.storage.getContactSubmissions();
    return result.items
      .filter((s) => s.emailHash === emailHash)
      .map(mapDbContactToDomain);
  }

  async findAll(params?: PaginationParams & ContactFilters): Promise<PaginatedResult<ContactSubmission>> {
    const result = await this.storage.getContactSubmissions();
    let filtered = result.items.map(mapDbContactToDomain);

    // Apply filters
    if (params?.verified !== undefined) {
      filtered = filtered.filter((s) => s.verified === params.verified);
    }
    if (params?.hubspotSynced !== undefined) {
      filtered = filtered.filter((s) => s.hubspotSynced === params.hubspotSynced);
    }
    if (params?.emailSent !== undefined) {
      filtered = filtered.filter((s) => s.emailSent === params.emailSent);
    }
    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter((s) => 
        s.firstName.toLowerCase().includes(search) ||
        s.lastName.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search) ||
        (s.company?.toLowerCase().includes(search) ?? false)
      );
    }
    if (params?.createdAfter) {
      filtered = filtered.filter((s) => s.createdAt >= params.createdAfter!);
    }
    if (params?.createdBefore) {
      filtered = filtered.filter((s) => s.createdAt <= params.createdBefore!);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    const totalPages = Math.ceil(filtered.length / limit);

    return {
      items: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages,
    };
  }

  async create(data: CreateContactData & { emailHash?: string }): Promise<ContactSubmission> {
    const dbContact = await this.storage.createContactSubmission({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      company: data.company ?? null,
      jobTitle: data.jobTitle ?? null,
      phone: data.phone ?? null,
      message: data.message,
      consentMarketing: data.consentMarketing ?? false,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      screenResolution: data.screenResolution ?? null,
      timezone: data.timezone ?? null,
      language: data.language ?? null,
      platform: data.platform ?? null,
      deviceMemory: data.deviceMemory ?? null,
      hardwareConcurrency: data.hardwareConcurrency ?? null,
      referrer: data.referrer ?? null,
      pageUrl: data.pageUrl ?? null,
    });
    return mapDbContactToDomain(dbContact);
  }

  async update(id: string, data: UpdateContactData): Promise<ContactSubmission | null> {
    if (data.emailSent !== undefined || data.hubspotSynced !== undefined) {
      await this.storage.updateContactSubmissionStatus(id, {
        emailSent: data.emailSent,
        hubspotSynced: data.hubspotSynced,
      });
    }
    return this.findById(id);
  }

  async markVerified(id: string): Promise<ContactSubmission | null> {
    await this.storage.verifyContactSubmission(id);
    return this.findById(id);
  }

  async markEmailSent(id: string): Promise<void> {
    await this.storage.updateContactSubmissionStatus(id, { emailSent: true });
  }

  async markHubSpotSynced(id: string): Promise<void> {
    await this.storage.updateContactSubmissionStatus(id, { hubspotSynced: true });
  }
}

/**
 * Factory function to create a ContactRepository instance
 */
export function createContactRepository(storage: IStorage): IContactRepository {
  return new ContactRepository(storage);
}
