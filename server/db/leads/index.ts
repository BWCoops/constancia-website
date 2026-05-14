/**
 * Leads Domain Repository Implementations
 * 
 * This module exports repository implementations for the leads domain.
 * All repositories wrap the existing storage layer and map between
 * database records and domain types.
 */

import type { IStorage } from '../../storage';
import type { 
  ILeadRepository, 
  IContactRepository, 
  IOtpRepository 
} from '../../core/leads/interfaces';

export { LeadRepository, createLeadRepository } from './lead.repository';
export { ContactRepository, createContactRepository } from './contact.repository';
export { OtpRepository, createOtpRepository } from './otp.repository';

/**
 * Leads repositories container
 * Provides all lead-related repositories with dependency injection
 */
export interface LeadsRepositories {
  leads: ILeadRepository;
  contacts: IContactRepository;
  otp: IOtpRepository;
}

/**
 * Factory function to create all leads repositories
 * 
 * @param storage - The storage implementation to wrap
 * @returns Container with all leads repositories
 */
export function createLeadsRepositories(storage: IStorage): LeadsRepositories {
  const { createLeadRepository } = require('./lead.repository');
  const { createContactRepository } = require('./contact.repository');
  const { createOtpRepository } = require('./otp.repository');

  return {
    leads: createLeadRepository(storage),
    contacts: createContactRepository(storage),
    otp: createOtpRepository(storage),
  };
}
