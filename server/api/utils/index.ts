/**
 * API Utilities
 * 
 * Shared utilities for route handlers including:
 * - Async handler wrapper for error handling
 * - Response helpers for consistent API responses
 * - Request validation utilities
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';
import type { Result } from '../../core/types';
import { DomainError } from '../../core/types';

/**
 * Wraps an async route handler to automatically catch errors
 * and forward them to Express error handling middleware
 */
export function asyncHandler<T = any>(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Send a successful response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Send an error response
 */
export function sendError(res: Response, code: string, message: string, statusCode = 400): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

/**
 * Convert Result type to API response
 */
export function sendResult<T>(res: Response, result: Result<T>): void {
  if (result.success) {
    sendSuccess(res, result.data);
  } else {
    const error = result.error;
    if (error instanceof DomainError) {
      sendError(res, error.code, error.message, error.statusCode);
    } else {
      sendError(res, 'UNKNOWN_ERROR', String(error), 500);
    }
  }
}

/**
 * Validate request body against a Zod schema
 * Returns the parsed data or sends error response
 */
export function validateBody<T extends z.ZodSchema>(
  schema: T,
  req: Request,
  res: Response
): z.infer<T> | null {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    sendError(res, 'VALIDATION_ERROR', errors, 400);
    return null;
  }
  return result.data;
}

/**
 * Validate request query against a Zod schema
 * Returns the parsed data or sends error response
 */
export function validateQuery<T extends z.ZodSchema>(
  schema: T,
  req: Request,
  res: Response
): z.infer<T> | null {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    sendError(res, 'VALIDATION_ERROR', errors, 400);
    return null;
  }
  return result.data;
}

/**
 * Validate request params against a Zod schema
 * Returns the parsed data or sends error response
 */
export function validateParams<T extends z.ZodSchema>(
  schema: T,
  req: Request,
  res: Response
): z.infer<T> | null {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    sendError(res, 'VALIDATION_ERROR', errors, 400);
    return null;
  }
  return result.data;
}

/**
 * Get client IP from request (handles proxies)
 */
export function getClientIp(req: Request): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string {
  return req.get('user-agent') || 'unknown';
}

/**
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
