import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("error-handler");

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = "VALIDATION_ERROR";
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = "NOT_FOUND";
  isOperational = true;
  
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  code = "UNAUTHORIZED";
  isOperational = true;
  
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error implements AppError {
  statusCode = 403;
  code = "FORBIDDEN";
  isOperational = true;
  
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  code = "RATE_LIMIT_EXCEEDED";
  isOperational = true;
  
  constructor(message: string = "Too many requests") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class InternalError extends Error implements AppError {
  statusCode = 500;
  code = "INTERNAL_ERROR";
  isOperational = false;
  
  constructor(message: string = "An internal error occurred") {
    super(message);
    this.name = "InternalError";
  }
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

function formatZodError(error: ZodError): string {
  return error.errors
    .map(err => `${err.path.join(".")}: ${err.message}`)
    .join(", ");
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req.headers["x-correlation-id"] as string) || undefined;
  
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "An internal error occurred";
  let details: unknown = undefined;
  
  if (err instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = formatZodError(err);
    details = isProduction ? undefined : err.errors;
  } else if ("statusCode" in err && typeof err.statusCode === "number") {
    statusCode = err.statusCode;
    code = (err as AppError).code || "ERROR";
    message = err.message;
    
    if ((err as AppError).isOperational === false) {
      log.error({
        correlationId,
        err,
        path: req.path,
        method: req.method,
      }, "Non-operational error");
    }
  } else {
    log.error({
      correlationId,
      err,
      path: req.path,
      method: req.method,
    }, "Unhandled error");
  }
  
  const response: ErrorResponse = {
    error: message,
    code,
  };
  
  if (correlationId) {
    response.requestId = correlationId;
  }
  
  if (!isProduction && details) {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Not found",
    code: "NOT_FOUND",
    path: req.path,
  });
}
