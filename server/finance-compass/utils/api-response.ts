/**
 * FinanceCompass API Response Utilities
 * 
 * Provides standardized response formatting for consistent API responses
 * across all FinanceCompass endpoints.
 */

import { Response } from "express";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("fc-api-response");

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  PDF_GENERATION_ERROR: "PDF_GENERATION_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  ASSESSMENT_LOCKED: "ASSESSMENT_LOCKED",
  OTP_INVALID: "OTP_INVALID",
  OTP_EXPIRED: "OTP_EXPIRED",
  SESSION_REQUIRED: "SESSION_REQUIRED",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  } as ApiSuccessResponse<T>);
}

export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
  statusCode = 200
): void {
  res.status(statusCode).json({
    success: true,
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      hasMore: pagination.page * pagination.limit < pagination.total,
    },
  } as ApiSuccessResponse<T[]>);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code?: ErrorCode,
  details?: Record<string, unknown>
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
  };
  
  if (code) {
    response.code = code;
  }
  
  if (details) {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
}

export function sendValidationError(
  res: Response,
  message: string,
  details?: Record<string, unknown>
): void {
  sendError(res, message, 400, ErrorCodes.VALIDATION_ERROR, details);
}

export function sendNotFound(res: Response, resource = "Resource"): void {
  sendError(res, `${resource} not found`, 404, ErrorCodes.NOT_FOUND);
}

export function sendUnauthorized(res: Response, message = "Authentication required"): void {
  sendError(res, message, 401, ErrorCodes.UNAUTHORIZED);
}

export function sendForbidden(res: Response, message = "Access denied"): void {
  sendError(res, message, 403, ErrorCodes.FORBIDDEN);
}

export function sendRateLimited(res: Response, message = "Too many requests"): void {
  sendError(res, message, 429, ErrorCodes.RATE_LIMITED);
}

export function sendInternalError(
  res: Response,
  message = "Internal server error",
  error?: unknown
): void {
  if (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Internal error");
  }
  sendError(res, message, 500, ErrorCodes.INTERNAL_ERROR);
}

export function handleRouteError(
  res: Response,
  error: unknown,
  context: string
): void {
  log.error({ err: error instanceof Error ? error : new Error(String(error)), context }, "Route error");
  
  if (error instanceof Error) {
    if (error.message.includes("not found")) {
      return sendNotFound(res);
    }
    if (error.message.includes("validation") || error.message.includes("invalid")) {
      return sendValidationError(res, error.message);
    }
  }
  
  sendInternalError(res, `Failed to ${context.toLowerCase()}`);
}

export function parseZodError(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
    return zodError.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
  }
  return "Validation failed";
}
