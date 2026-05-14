/**
 * FinanceCompass RBAC Middleware
 * 
 * Role-Based Access Control for the FinanceCompass module.
 * Controls access to different features based on admin user roles.
 */

import type { Request, Response, NextFunction } from "express";
import { fcStorage } from "./storage";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("fc-middleware");
import { FC_PERMISSIONS, type FCPermission } from "@shared/finance-compass-schema";

interface AuthenticatedRequest extends Request {
  user?: {
    claims?: {
      sub?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
    dbUser?: {
      id: string;
      role: string;
      email: string;
      displayName: string;
    };
  };
}

export function isAuthenticated(req: AuthenticatedRequest): boolean {
  return !!(req.user?.claims?.sub || req.user?.dbUser?.id);
}

export function getAdminRole(req: AuthenticatedRequest): string {
  // SECURITY: Never default to a privileged role
  // If no user is authenticated, return "none" which has no permissions
  if (!isAuthenticated(req)) {
    return "none";
  }
  return req.user?.dbUser?.role || "read_only";
}

export function getAdminId(req: AuthenticatedRequest): string {
  if (!isAuthenticated(req)) {
    return "unauthenticated";
  }
  return req.user?.dbUser?.id || req.user?.claims?.sub || "unknown";
}

export function getAdminEmail(req: AuthenticatedRequest): string {
  if (!isAuthenticated(req)) {
    return "unauthenticated";
  }
  return req.user?.dbUser?.email || req.user?.claims?.email || "unknown";
}

export function ensureFinanceCompassAccess(permission: FCPermission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // SECURITY: First check authentication
      if (!isAuthenticated(req)) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Authentication required to access this resource.",
        });
      }
      
      const role = getAdminRole(req);
      log.info({ permission, role, claims: req.user?.claims, dbUser: req.user?.dbUser ? { id: req.user.dbUser.id, role: req.user.dbUser.role } : null }, "RBAC Check");
      const hasAccess = await fcStorage.hasPermission(role, permission);
      log.info({ hasAccess }, "RBAC Check result");
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: `You do not have permission to access this feature. Required permission: ${permission}`,
        });
      }
      
      next();
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "RBAC check error");
      return res.status(500).json({
        success: false,
        error: "Authorization check failed",
      });
    }
  };
}

export function ensureAnyFinanceCompassPermission(permissions: FCPermission[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // SECURITY: First check authentication
      if (!isAuthenticated(req)) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Authentication required to access this resource.",
        });
      }
      
      const role = getAdminRole(req);
      
      for (const permission of permissions) {
        const hasAccess = await fcStorage.hasPermission(role, permission);
        if (hasAccess) {
          return next();
        }
      }
      
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "You do not have permission to access this feature.",
      });
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "RBAC check error");
      return res.status(500).json({
        success: false,
        error: "Authorization check failed",
      });
    }
  };
}

export async function logAuditAction(
  req: AuthenticatedRequest,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, any>
) {
  try {
    await fcStorage.createAuditLog({
      adminId: getAdminId(req),
      action,
      entityType,
      entityId,
      details,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.get("user-agent"),
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Audit log error");
  }
}
