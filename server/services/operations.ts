import { getPool } from "../db-pool";
import { randomUUID } from "crypto";
import * as os from "os";
import type { Request, Response, NextFunction } from "express";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("operations");

const pool = getPool();

const startTime = Date.now();

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: string;
      latency?: number;
    };
    memory: {
      status: string;
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      status: string;
      loadAverage: number[];
    };
  };
  services: {
    name: string;
    status: "operational" | "degraded" | "down";
    lastCheck: string;
  }[];
}

export interface RequestLog {
  id: string;
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent: string | null;
  timestamp: string;
}

const requestLogs: RequestLog[] = [];
const MAX_LOGS = 1000;

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const now = Date.now();
  const uptimeMs = now - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const memUsage = process.memoryUsage();
  const loadAverage = os.loadavg();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

  let dbStatus = "error";
  let dbLatency: number | undefined;

  try {
    const dbStart = Date.now();
    await pool.query("SELECT 1");
    dbLatency = Date.now() - dbStart;
    dbStatus = "ok";
  } catch (error) {
    log.error({ err: error }, "Database health check failed");
  }

  // More tolerant CPU thresholds for containerized environments
  // During startup (first 2 minutes), be more lenient with CPU checks
  const isStartupGracePeriod = uptimeSeconds < 120;
  const cpuThresholdWarning = isStartupGracePeriod ? 8 : 2;
  const cpuThresholdError = isStartupGracePeriod ? 15 : 5;
  const cpuStatus = loadAverage[0] < cpuThresholdWarning ? "ok" : loadAverage[0] < cpuThresholdError ? "warning" : "error";
  const memoryStatus = memoryPercentage < 80 ? "ok" : memoryPercentage < 90 ? "warning" : "error";

  const services = [
    {
      name: "Web Server",
      status: "operational" as const,
      lastCheck: new Date().toISOString(),
    },
    {
      name: "Database",
      status: dbStatus === "ok" ? "operational" as const : "down" as const,
      lastCheck: new Date().toISOString(),
    },
    {
      name: "Email Service",
      status: process.env.MS_GRAPH_CLIENT_ID ? "operational" as const : "degraded" as const,
      lastCheck: new Date().toISOString(),
    },
    {
      name: "HubSpot CRM",
      status: process.env.HUBSPOT_ACCESS_TOKEN ? "operational" as const : "degraded" as const,
      lastCheck: new Date().toISOString(),
    },
  ];

  const hasDownService = services.some((s) => s.status === "down");
  const hasDegradedService = services.some((s) => s.status === "degraded");
  const hasWarningChecks = cpuStatus === "warning" || memoryStatus === "warning";
  const hasErrorChecks = cpuStatus === "error" || memoryStatus === "error" || dbStatus === "error";

  const overallStatus = hasDownService || hasErrorChecks 
    ? "unhealthy" 
    : hasDegradedService || hasWarningChecks 
      ? "degraded" 
      : "healthy";

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: {
        status: dbStatus,
        latency: dbLatency,
      },
      memory: {
        status: memoryStatus,
        used: usedMemory,
        total: totalMemory,
        percentage: memoryPercentage,
      },
      cpu: {
        status: cpuStatus,
        loadAverage: loadAverage,
      },
    },
    services,
  };
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers["x-correlation-id"] as string) || randomUUID();
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on("finish", () => {
    if (req.path.startsWith("/assets") || req.path.startsWith("/@") || req.path.includes(".")) {
      return;
    }

    const duration = Date.now() - startTime;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "unknown";

    const requestLog: RequestLog = {
      id: randomUUID(),
      correlationId: req.correlationId || "unknown",
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip,
      userAgent: req.headers["user-agent"] || null,
      timestamp: new Date().toISOString(),
    };

    requestLogs.unshift(requestLog);
    if (requestLogs.length > MAX_LOGS) {
      requestLogs.pop();
    }

    const logData = {
      correlationId: requestLog.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip,
    };

    if (res.statusCode >= 500) {
      log.error(logData, "Request failed");
    } else if (res.statusCode >= 400) {
      log.warn(logData, "Request error");
    } else if (duration > 2000) {
      log.warn(logData, "Slow request");
    }
  });

  next();
}

export function getRequestLogs(options: {
  limit?: number;
  offset?: number;
  method?: string;
  statusCode?: number;
  path?: string;
}): { logs: RequestLog[]; total: number } {
  let filtered = [...requestLogs];

  if (options.method) {
    const methodUpper = options.method.toUpperCase();
    filtered = filtered.filter((l) => l.method === methodUpper);
  }
  if (options.statusCode) {
    const statusCode = options.statusCode;
    filtered = filtered.filter((l) => l.statusCode === statusCode);
  }
  if (options.path) {
    const pathFilter = options.path;
    filtered = filtered.filter((l) => l.path.includes(pathFilter));
  }

  const total = filtered.length;
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  return {
    logs: filtered.slice(offset, offset + limit),
    total,
  };
}

export function getRequestStats(): {
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
  statusCodes: Record<string, number>;
  topEndpoints: { path: string; count: number }[];
} {
  if (requestLogs.length === 0) {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      successRate: 100,
      statusCodes: {},
      topEndpoints: [],
    };
  }

  const totalRequests = requestLogs.length;
  const avgResponseTime = Math.round(
    requestLogs.reduce((sum, l) => sum + l.duration, 0) / totalRequests
  );
  const successes = requestLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 400).length;
  const successRate = Math.round((successes / totalRequests) * 100);

  const statusCodes: Record<string, number> = {};
  const pathCounts: Record<string, number> = {};

  for (const log of requestLogs) {
    const statusGroup = `${Math.floor(log.statusCode / 100)}xx`;
    statusCodes[statusGroup] = (statusCodes[statusGroup] || 0) + 1;

    const basePath = log.path.split("?")[0];
    pathCounts[basePath] = (pathCounts[basePath] || 0) + 1;
  }

  const topEndpoints = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  return {
    totalRequests,
    avgResponseTime,
    successRate,
    statusCodes,
    topEndpoints,
  };
}

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
