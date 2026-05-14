/**
 * Rate Limit Repository Implementation
 *
 * Implements IRateLimitRepository using the PostgreSQL rate_limits table.
 * Survives server restarts and is safe across multiple instances.
 */

import { and, eq, gt } from 'drizzle-orm';
import { db } from '../../db';
import { rateLimits } from '@shared/schema';
import type { IRateLimitRepository } from '../../core/security/interfaces';

const LIMIT_TYPE = 'rate-limit-service';

export class RateLimitRepository implements IRateLimitRepository {
  async getAttempts(key: string): Promise<{ count: number; resetAt: Date } | null> {
    const now = new Date();

    const [record] = await db
      .select({ count: rateLimits.count, resetAt: rateLimits.resetAt })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, key),
          eq(rateLimits.limitType, LIMIT_TYPE),
          gt(rateLimits.resetAt, now)
        )
      )
      .limit(1);

    if (!record) return null;
    return { count: record.count, resetAt: record.resetAt };
  }

  async incrementAttempts(key: string, resetAt: Date): Promise<number> {
    const now = new Date();

    const [existing] = await db
      .select({ id: rateLimits.id, count: rateLimits.count, resetAt: rateLimits.resetAt })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, key),
          eq(rateLimits.limitType, LIMIT_TYPE),
          gt(rateLimits.resetAt, now)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(rateLimits)
        .set({ count: existing.count + 1 })
        .where(eq(rateLimits.id, existing.id))
        .returning({ count: rateLimits.count });
      return updated.count;
    }

    await db
      .delete(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, key),
          eq(rateLimits.limitType, LIMIT_TYPE)
        )
      );

    const [inserted] = await db
      .insert(rateLimits)
      .values({
        identifier: key,
        limitType: LIMIT_TYPE,
        count: 1,
        resetAt,
      })
      .returning({ count: rateLimits.count });

    return inserted.count;
  }

  async resetAttempts(key: string): Promise<void> {
    await db
      .delete(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, key),
          eq(rateLimits.limitType, LIMIT_TYPE)
        )
      );
  }
}

export function createRateLimitRepository(): IRateLimitRepository {
  return new RateLimitRepository();
}
