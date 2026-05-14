/**
 * Core Domain Types
 * 
 * This file defines base types used across all core services.
 * Core types represent domain concepts independent of HTTP or database concerns.
 * 
 * @generated-by-ai (human-reviewed)
 */

/**
 * Result type for operations that can fail
 * Provides type-safe error handling without exceptions
 */
export type Result<T, E = DomainError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Base domain error class
 * All domain-specific errors should extend this
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * Entity not found error
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly fields: Record<string, string>;
  
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.fields = fields;
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      fields: this.fields,
    };
  }
}

/**
 * Authorization error
 */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;
  
  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;
  
  constructor(message: string = 'Access denied') {
    super(message);
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends DomainError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly retryAfterSeconds: number;
  
  constructor(message: string, retryAfterSeconds: number = 60) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * External service error (AI, email, etc.)
 */
export class ExternalServiceError extends DomainError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly statusCode = 502;
  readonly service: string;
  
  constructor(service: string, message: string) {
    super(`${service}: ${message}`);
    this.service = service;
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends DomainError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly statusCode = 500;
  
  constructor(message: string) {
    super(message);
  }
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Helper to create success result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Helper to create failure result
 */
export function failure<E extends DomainError>(error: E): Result<never, E> {
  return { success: false, error };
}
