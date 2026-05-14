/**
 * Rate Limit Service
 * 
 * Pure business logic for rate limiting operations.
 * Uses repository abstraction for storage, making it testable and framework-agnostic.
 */

import type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitType,
} from '../types';
import { RATE_LIMIT_PRESETS } from '../types';
import type { IRateLimitService, IRateLimitRepository } from '../interfaces';

/**
 * In-memory rate limit store for when no repository is provided
 */
class InMemoryRateLimitStore implements IRateLimitRepository {
  private store = new Map<string, { count: number; resetAt: Date }>();
  
  async getAttempts(key: string): Promise<{ count: number; resetAt: Date } | null> {
    const record = this.store.get(key);
    if (!record) return null;
    
    if (new Date() > record.resetAt) {
      this.store.delete(key);
      return null;
    }
    
    return record;
  }
  
  async incrementAttempts(key: string, resetAt: Date): Promise<number> {
    const existing = this.store.get(key);
    
    if (!existing || new Date() > existing.resetAt) {
      this.store.set(key, { count: 1, resetAt });
      return 1;
    }
    
    existing.count += 1;
    return existing.count;
  }
  
  async resetAttempts(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Rate limiting service implementation
 */
export class RateLimitService implements IRateLimitService {
  private repository: IRateLimitRepository;
  private bypassIdentifiers: Set<string>;
  
  constructor(
    repository?: IRateLimitRepository,
    bypassIdentifiers: string[] = []
  ) {
    this.repository = repository || new InMemoryRateLimitStore();
    this.bypassIdentifiers = new Set(bypassIdentifiers.map(id => id.toLowerCase()));
  }
  
  /**
   * Check if an identifier should bypass rate limiting
   */
  private shouldBypass(key: string): boolean {
    return this.bypassIdentifiers.has(key.toLowerCase());
  }
  
  /**
   * Create a composite key with optional prefix
   */
  private createKey(key: string, config: RateLimitConfig): string {
    return config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  }
  
  /**
   * Check if the rate limit has been exceeded
   */
  async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    if (this.shouldBypass(key)) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(),
      };
    }
    
    const compositeKey = this.createKey(key, config);
    const now = new Date();
    const resetAt = new Date(now.getTime() + config.windowMs);
    
    const record = await this.repository.getAttempts(compositeKey);
    
    if (!record) {
      return {
        allowed: true,
        remaining: config.limit,
        resetAt,
      };
    }
    
    if (now > record.resetAt) {
      return {
        allowed: true,
        remaining: config.limit,
        resetAt,
      };
    }
    
    const remaining = Math.max(0, config.limit - record.count);
    const allowed = record.count < config.limit;
    
    return {
      allowed,
      remaining,
      resetAt: record.resetAt,
      retryAfterSeconds: allowed ? undefined : Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000),
    };
  }
  
  /**
   * Check rate limit using a preset type
   */
  async checkLimitByType(key: string, type: RateLimitType): Promise<RateLimitResult> {
    const config = RATE_LIMIT_PRESETS[type];
    return this.checkLimit(key, { ...config, keyPrefix: type });
  }
  
  /**
   * Record an attempt and return updated status
   */
  async recordAttempt(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    if (this.shouldBypass(key)) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(),
      };
    }
    
    const compositeKey = this.createKey(key, config);
    const now = new Date();
    const resetAt = new Date(now.getTime() + config.windowMs);
    
    const existingRecord = await this.repository.getAttempts(compositeKey);
    const useResetAt = existingRecord && now <= existingRecord.resetAt 
      ? existingRecord.resetAt 
      : resetAt;
    
    const count = await this.repository.incrementAttempts(compositeKey, useResetAt);
    const remaining = Math.max(0, config.limit - count);
    const allowed = count <= config.limit;
    
    return {
      allowed,
      remaining,
      resetAt: useResetAt,
      retryAfterSeconds: allowed ? undefined : Math.ceil((useResetAt.getTime() - now.getTime()) / 1000),
    };
  }
  
  /**
   * Get remaining attempts before rate limit is exceeded
   */
  async getRemainingAttempts(key: string, config: RateLimitConfig): Promise<number> {
    if (this.shouldBypass(key)) {
      return Infinity;
    }
    
    const compositeKey = this.createKey(key, config);
    const record = await this.repository.getAttempts(compositeKey);
    
    if (!record || new Date() > record.resetAt) {
      return config.limit;
    }
    
    return Math.max(0, config.limit - record.count);
  }
  
  /**
   * Check if a key is currently blocked
   */
  async isBlocked(key: string, config: RateLimitConfig): Promise<boolean> {
    const result = await this.checkLimit(key, config);
    return !result.allowed;
  }
  
  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    await this.repository.resetAttempts(key);
  }
}

/**
 * Factory function to create a rate limit service with test bypass accounts
 */
export function createRateLimitService(
  repository?: IRateLimitRepository,
  isProduction: boolean = process.env.NODE_ENV === 'production'
): RateLimitService {
  const bypassAccounts = isProduction 
    ? [] 
    : ['test@1qg.com', 'demo@1qg.com'];
  
  return new RateLimitService(repository, bypassAccounts);
}
