/**
 * OTP Repository Implementation
 * 
 * Wraps the existing storage layer to implement the IOtpRepository interface.
 * Maps between database records (ResourceOtpDb) and domain types (OtpVerification).
 */

import type { IStorage } from '../../storage';
import type { IOtpRepository } from '../../core/leads/interfaces';
import type { OtpVerification } from '../../core/leads/types';
import type { ResourceOtpDb } from '@shared/schema';

const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Maps a database OTP record to the domain OtpVerification type
 */
function mapDbOtpToDomain(dbOtp: ResourceOtpDb): OtpVerification {
  return {
    id: dbOtp.id,
    leadId: dbOtp.leadId,
    otpHash: dbOtp.otpHash,
    attempts: dbOtp.attempts,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    expiresAt: dbOtp.expiresAt,
    used: dbOtp.used,
    createdAt: dbOtp.createdAt,
  };
}

export class OtpRepository implements IOtpRepository {
  constructor(private readonly storage: IStorage) {}

  async create(leadId: string, otpHash: string, expiresAt: Date): Promise<OtpVerification> {
    const dbOtp = await this.storage.createOtp(leadId, otpHash, expiresAt);
    return mapDbOtpToDomain(dbOtp);
  }

  async findValidByLeadId(leadId: string): Promise<OtpVerification | null> {
    const dbOtp = await this.storage.getValidOtp(leadId);
    return dbOtp ? mapDbOtpToDomain(dbOtp) : null;
  }

  async incrementAttempts(otpId: string): Promise<number> {
    return this.storage.incrementOtpAttempts(otpId);
  }

  async markUsed(otpId: string): Promise<void> {
    await this.storage.markOtpUsed(otpId);
  }

  async invalidateForLead(leadId: string): Promise<void> {
    await this.storage.invalidateOtpsForLead(leadId);
  }
}

/**
 * Factory function to create an OtpRepository instance
 */
export function createOtpRepository(storage: IStorage): IOtpRepository {
  return new OtpRepository(storage);
}
