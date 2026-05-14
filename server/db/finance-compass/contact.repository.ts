/**
 * Contact Repository Implementation
 * 
 * Implements IContactRepository interface by wrapping the FinanceCompass storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IContactRepository, CreateContactData } from '../../core/finance-compass/interfaces';
import type { Contact } from '../../core/finance-compass/types';
import { mapDbContactToDomain } from './mappers';
import * as fcStorage from '../../finance-compass/storage';
import crypto from 'crypto';

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

export class ContactRepository implements IContactRepository {
  async findById(id: string): Promise<Contact | null> {
    const dbContact = await fcStorage.getContactById(id);
    return dbContact ? mapDbContactToDomain(dbContact) : null;
  }

  async findByEmail(email: string): Promise<Contact | null> {
    const dbContact = await fcStorage.getContactByEmail(email);
    return dbContact ? mapDbContactToDomain(dbContact) : null;
  }

  async findByEmailHash(_emailHash: string): Promise<Contact | null> {
    throw new Error(
      'ContactRepository.findByEmailHash: Not implemented. ' +
      'FinanceCompass storage layer does not yet support lookup by email hash. ' +
      'Implement fcStorage.getContactByEmailHash to enable this method.'
    );
  }

  async create(data: CreateContactData): Promise<Contact> {
    const dbContact = await fcStorage.createContact({
      email: data.email,
      emailHash: hashEmail(data.email),
      firstName: data.firstName,
      lastName: data.lastName,
      roleTitle: data.jobTitle,
      phone: data.phoneNumber,
    });
    return mapDbContactToDomain(dbContact);
  }

  async update(id: string, data: Partial<Contact>): Promise<Contact | null> {
    const updateData: Parameters<typeof fcStorage.updateContact>[1] = {};
    
    if (data.email) {
      updateData.email = data.email;
      updateData.emailHash = hashEmail(data.email);
    }
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.jobTitle !== undefined) updateData.roleTitle = data.jobTitle;
    if (data.phoneNumber !== undefined) updateData.phone = data.phoneNumber;

    const dbContact = await fcStorage.updateContact(id, updateData);
    return dbContact ? mapDbContactToDomain(dbContact) : null;
  }
}

export function createContactRepository(): IContactRepository {
  return new ContactRepository();
}
