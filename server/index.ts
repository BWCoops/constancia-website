import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import fileUpload from "express-fileupload";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { correlationIdMiddleware, requestLoggingMiddleware, getSystemHealth } from "./services/operations";
import { generateSitemapWithTracking } from "./services/seo";
import { errorHandler } from "./middleware/error-handler";
import { scheduleStartupBackfill } from "./finance-compass/services/data-quality";
import { scheduleBotBackfill } from "./services/bot-backfill";
import { scheduleBlogSeed } from "./services/blog-seeder";
import { createChildLogger } from "./lib/logger";

const log = createChildLogger("server");

// ============================================
// GLOBAL ERROR HANDLERS (Prevents 5xx crashes)
// ============================================

// Handle uncaught exceptions - log and continue if possible
process.on('uncaughtException', (error: Error) => {
  log.fatal({ err: error }, "[CRITICAL] Uncaught exception");
  // In production, we log but don't exit to maintain availability
  // The error handler middleware will catch most issues before this
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  log.fatal({ err: reason instanceof Error ? reason : new Error(String(reason)) }, "[CRITICAL] Unhandled promise rejection");
});

// ============================================
// STARTUP CONFIGURATION VALIDATION
// ============================================

interface ConfigWarning {
  key: string;
  required: boolean;
  description: string;
}

const CONFIG_CHECKS: ConfigWarning[] = [
  { key: "MS_GRAPH_CLIENT_ID", required: true, description: "Microsoft Graph API (email sending)" },
  { key: "MS_GRAPH_CLIENT_SECRET", required: true, description: "Microsoft Graph API (email sending)" },
  { key: "MS_GRAPH_TENANT_ID", required: true, description: "Microsoft Graph API (email sending)" },
  { key: "SESSION_SECRET", required: true, description: "Session security and encryption" },
  { key: "PII_ENCRYPTION_KEY", required: true, description: "Field-level encryption for GDPR compliance" },
  { key: "HUBSPOT_ACCESS_TOKEN", required: false, description: "CRM lead sync (optional)" },
];

function validateStartupConfig() {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  for (const config of CONFIG_CHECKS) {
    const value = process.env[config.key];
    
    if (!value || value.trim() === "") {
      if (config.required) {
        missing.push(`${config.key} (${config.description})`);
      } else {
        warnings.push(`${config.key} not set - ${config.description} will be disabled`);
      }
    }
  }
  
  // Log warnings but don't exit
  if (warnings.length > 0) {
    log.warn({ warnings }, "Configuration warnings");
  }
  
  if (missing.length > 0 && process.env.NODE_ENV === "production") {
    log.fatal({ missing }, "Required environment variables are missing");
    process.exit(1);
  } else if (missing.length > 0) {
    log.warn({ missing }, "Development mode — missing required secrets");
  }
}

// Run validation on startup
validateStartupConfig();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Production mode flag (used for security configuration)
const isProduction = process.env.NODE_ENV === "production";


// ============================================
// ENTERPRISE SECURITY HARDENING
// ============================================

// Trust exactly one hop: Replit terminates TLS via a single nginx reverse proxy.
// Using the integer 1 (rather than `true`) means Express trusts only the
// nearest proxy's X-Forwarded-For value and will not blindly trust a chain of
// forwarded headers that an attacker could forge from outside the platform.
app.set("trust proxy", 1);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.path.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  }
  next();
});

// ============================================
// HELMET BASELINE SECURITY HEADERS
// ============================================
// Helmet adds headers not already covered by our manual middleware below.
// CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
// and COEP/COOP/CORP are all set explicitly further down, so we disable
// the helmet equivalents to avoid conflicts.
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false,
  xFrameOptions: false,
  xContentTypeOptions: false,
  referrerPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  dnsPrefetchControl: false,
}));

// ============================================
// CORS CONFIGURATION
// ============================================
const ALLOWED_ORIGINS = [
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
  process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : null,
  'https://constancia.com',
  'https://www.constancia.com',
].filter(Boolean) as string[];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some(allowed => origin === allowed)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Correlation-ID');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ============================================
// COMPRESSION MIDDLEWARE
// ============================================
// Compress responses using gzip/brotli for JSON, HTML, CSS, JS
// Only compress responses larger than 1KB (1024 bytes)
// Skip compression for SSE (Server-Sent Events) endpoints to prevent buffering
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Don't compress SSE responses - they need immediate delivery without buffering
    if (req.url.includes('/stream') || res.getHeader('Content-Type') === 'text/event-stream') {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// ============================================
// CORRELATION ID & REQUEST LOGGING (Operations)
// ============================================
app.use(correlationIdMiddleware);
app.use(requestLoggingMiddleware);

// ============================================
// PUBLIC HEALTH CHECK & SEO ENDPOINTS
// ============================================

// Health check endpoint (unauthenticated for load balancers)
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const health = await getSystemHealth();
    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: "unhealthy", error: "Health check failed" });
  }
});

// Sitemap.xml for SEO
app.get("/sitemap.xml", async (req: Request, res: Response) => {
  try {
    const sitemap = await generateSitemapWithTracking();
    const { createHash } = await import("node:crypto");
    const etag = `"${createHash("sha1").update(sitemap).digest("hex").slice(0, 16)}"`;
    res.setHeader("Content-Type", "application/xml; charset=UTF-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.setHeader("Vary", "Accept-Encoding");
    res.setHeader("ETag", etag);
    res.setHeader("X-Robots-Tag", "noindex");
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }
    res.send(sitemap);
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Sitemap generation error");
    res.status(500).json({ error: "Failed to generate sitemap" });
  }
});

// robots.txt is served as a static file from client/public/robots.txt
// (comprehensive AI-bot rules, per-agent directives, and LLMs.txt pointer are maintained there)
// Cloudflare additionally manages crawl policy at the edge.

// Trailing slash normalization - prevents duplicate content (SEO)
// Redirects /about/ to /about (removes trailing slash)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip API routes and static assets
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  
  // Remove trailing slash (except for root)
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    const safePath = req.path.slice(0, -1) + query;
    return res.redirect(301, safePath);
  }
  
  next();
});

// Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking attacks
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Enable XSS filtering
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Referrer policy for privacy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Permissions policy (formerly Feature-Policy) - DISABLED: app installation, notifications
  res.setHeader("Permissions-Policy", 
    "geolocation=(), microphone=(), camera=(), payment=(), " +
    "display-capture=(), fullscreen=(self), " +
    "accelerometer=(), gyroscope=(), magnetometer=(), " +
    "usb=(), bluetooth=(), serial=(), hid=()"
  );
  
  // PREVENT PWA/APP INSTALLATION - This is a website only
  // X-PWA-Installable header tells browsers not to prompt for installation
  res.setHeader("X-UA-Compatible", "IE=edge");
  
  // Content Security Policy - enterprise grade with comprehensive third-party support
  // Security note: 'unsafe-inline' in script-src is required because the React/Vite SPA
  // injects inline scripts at runtime. The long-term path to removing it is to adopt
  // server-side nonce injection (see CSP Level 3 'nonce-' approach), which requires
  // Vite to support per-request HTML transforms. Until then, the allow-listed third-party
  // origins and report-uri monitoring provide the primary XSS defence layer.
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: self + GA/GTM + HubSpot (all EU/US variants) + Cloudflare + LinkedIn + Apollo
    "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://js-eu1.hs-scripts.com https://js.hs-scripts.com https://js.hsforms.net https://js-eu1.hsforms.net https://js.hs-analytics.net https://js-eu1.hs-analytics.net https://js.hscollectedforms.net https://js-eu1.hscollectedforms.net https://js.usemessages.com https://js-eu1.usemessages.com https://js-eu1.hs-banner.com https://js.hs-banner.com https://js-eu1.hsadspixel.net https://js.hsadspixel.net https://challenges.cloudflare.com https://static.cloudflareinsights.com https://snap.licdn.com https://assets.apollo.io https://*.clerk.accounts.dev https://npm.clerk.dev" + 
      (isProduction ? "" : " 'unsafe-eval'"),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // img-src: self + data URIs (avatars) + https CDNs (blog images, GA pixel) + blob (canvas)
    "img-src 'self' data: blob: https://www.google-analytics.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://px.ads.linkedin.com https://www.linkedin.com https:",
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://stats.g.doubleclick.net https://www.google.com https://api.hubapi.com https://api-eu1.hubapi.com https://api-eu1.hubspot.com https://forms.hubspot.com https://forms-eu1.hubspot.com https://api.hsforms.com https://forms-eu1.hscollectedforms.net https://challenges.cloudflare.com https://px.ads.linkedin.com https://aplo-evnt.com https://*.clerk.accounts.dev https://*.clerk.dev wss:",
    // Frames: HubSpot + Cloudflare + GTM + reCAPTCHA v2 challenge popup
    "frame-src 'self' https://app.hubspot.com https://app-eu1.hubspot.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google.com https://www.recaptcha.net",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https://forms.hubspot.com",
    // Explicitly block Flash/Java/plugins (belt-and-suspenders, default-src covers this)
    "object-src 'none'",
    // Restrict web app manifests to same origin
    "manifest-src 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    // Allow service worker for performance (asset caching) - restricted to self origin only
    "worker-src 'self'",
    // CSP violation reporting - both legacy report-uri and modern report-to
    "report-uri /api/csp-report",
    "report-to security-violations",
  ].join("; ");
  res.setHeader("Content-Security-Policy", cspDirectives);
  
  // Strict Transport Security (HSTS) - enforces HTTPS
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  // Cross-Origin policies for enhanced security
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  // COEP for enhanced site isolation (require-corp for stricter isolation)
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  
  // Prevent DNS prefetching to external domains for privacy
  res.setHeader("X-DNS-Prefetch-Control", "off");
  
  // NEL (Network Error Logging) and Report-To for security telemetry
  // These allow monitoring of security policy violations in production
  if (isProduction) {
    res.setHeader("Report-To", JSON.stringify({
      "group": "security-violations",
      "max_age": 86400,
      "endpoints": [{ "url": "/api/csp-report" }]
    }));
  }
  
  // Download options - prevent automatic execution of downloads
  res.setHeader("X-Download-Options", "noopen");
  
  // Permitted cross-domain policies
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  
  // Cache control for security
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  
  next();
});

// Block service worker registration attempts
app.get("/sw.js", (_req: Request, res: Response) => {
  res.status(404).send("Service workers are not supported on this website.");
});
app.get("/service-worker.js", (_req: Request, res: Response) => {
  res.status(404).send("Service workers are not supported on this website.");
});

// Rate Limiting for API endpoints (DDoS protection)
const apiRateLimits = new Map<string, { count: number; resetAt: number }>();
const API_RATE_LIMIT = 100; // requests per window
const API_RATE_WINDOW = 60 * 1000; // 1 minute

// Paths exempt from the per-IP API rate limit. These are high-frequency
// poll/telemetry endpoints — rate-limiting them creates redirect loops
// for legitimate authenticated users. Each handler enforces its own
// auth + per-action limits internally.
const RATE_LIMIT_EXEMPT_PATHS = new Set<string>([
  "/admin/auth/session",  // polled by AdminLayout to keep auth state fresh
  "/track/page-view",     // fired on every route change
  "/health/clerk",        // diagnostic endpoint
]);

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  // Skip exempt paths — they have their own per-action throttles
  if (RATE_LIMIT_EXEMPT_PATHS.has(req.path)) return next();

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  
  const rateData = apiRateLimits.get(ip);
  
  if (!rateData || now > rateData.resetAt) {
    apiRateLimits.set(ip, { count: 1, resetAt: now + API_RATE_WINDOW });
  } else if (rateData.count >= API_RATE_LIMIT) {
    const retryAfterSec = Math.ceil((rateData.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec.toString());
    res.setHeader("X-RateLimit-Limit", API_RATE_LIMIT.toString());
    res.setHeader("X-RateLimit-Remaining", "0");
    res.setHeader("X-RateLimit-Reset", Math.ceil(rateData.resetAt / 1000).toString());
    return res.status(429).json({ 
      error: "Too many requests. Please try again later.",
      retryAfter: retryAfterSec
    });
  } else {
    rateData.count++;
  }
  
  const currentData = apiRateLimits.get(ip);
  if (currentData) {
    res.setHeader("X-RateLimit-Limit", API_RATE_LIMIT.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, API_RATE_LIMIT - currentData.count).toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(currentData.resetAt / 1000).toString());
  }
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    Array.from(apiRateLimits.entries()).forEach(([key, value]) => {
      if (now > value.resetAt) {
        apiRateLimits.delete(key);
      }
    });
  }
  
  next();
});

// Request size limits (prevent payload attacks)
// Conservative limits: 1MB for most APIs, larger for specific endpoints handled separately
const DEFAULT_BODY_LIMIT = "1mb";
const LARGE_BODY_LIMIT = "10mb"; // For file uploads and admin operations

app.use(
  express.json({
    limit: DEFAULT_BODY_LIMIT,
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: DEFAULT_BODY_LIMIT }));

// File upload middleware for Excel imports and other file uploads
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  abortOnLimit: true,
  useTempFiles: false,
  parseNested: true,
}));

// Content-Type validation middleware for API endpoints
// Ensures proper Content-Type headers to prevent type confusion attacks
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  // Skip for GET, HEAD, OPTIONS requests (no body)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  
  const contentType = req.headers["content-type"];
  
  // Require Content-Type for requests with body
  if (!contentType && req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({ 
      error: "Content-Type header is required for requests with body" 
    });
  }
  
  // Allow only expected content types for POST/PUT/PATCH
  if (contentType) {
    const allowedTypes = [
      "application/json",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "application/csp-report",   // CSP violation reports from browsers
      "application/reports+json", // Reporting API (modern CSP/NEL reports)
    ];
    
    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    if (!isAllowed) {
      return res.status(415).json({ 
        error: "Unsupported Content-Type. Use application/json or multipart/form-data" 
      });
    }
  }
  
  next();
});

// Request timeout middleware to prevent slow request attacks
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds for most endpoints
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set timeout for the request
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: "Request timeout" });
    }
  });
  next();
});

// Cookie parser for session management
app.use(cookieParser());

// CSRF Protection (double-submit cookie pattern)
import { csrfProtection, csrfTokenEndpoint } from "./middleware/csrf";
app.get("/api/csrf-token", csrfTokenEndpoint);
app.use(csrfProtection);

// Input sanitization - strip potentially dangerous characters from query params
app.use((req: Request, _res: Response, next: NextFunction) => {
  // Sanitize query parameters - create new object to avoid prototype pollution
  const sanitizedQuery: Record<string, any> = Object.create(null);
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  
  for (const key of Object.keys(req.query)) {
    // Skip dangerous property names that could pollute prototypes
    if (dangerousKeys.includes(key)) continue;
    
    // Only process string values (standard for query parameters)
    if (Object.hasOwn(req.query, key) && typeof req.query[key] === "string") {
      const sanitizedValue = (req.query[key] as string)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "");
      
      // Use defineProperty for explicit, safe assignment (avoids static analysis warnings)
      Object.defineProperty(sanitizedQuery, key, {
        value: sanitizedValue,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    // Note: Non-string query parameters are ignored as they're non-standard
  }
  req.query = sanitizedQuery;
  next();
});

// PII-safe logging - sanitize sensitive fields in production
function sanitizeForLog(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  
  const sensitiveKeys = [
    "email", "password", "firstName", "lastName", "phone", "company",
    "jobTitle", "ipAddress", "userAgent", "otpHash", "otp", "token",
    "accessToken", "refreshToken", "apiKey", "secret"
  ];
  
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLog(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function serverLog(message: string, source = "express") {
  log.info({ source }, message);
}

// ============================================
// STRUCTURED SECURITY EVENT LOGGING
// ============================================

export type SecurityEventType = 
  | "OTP_SENT" 
  | "OTP_VERIFIED" 
  | "OTP_FAILED" 
  | "OTP_EXPIRED"
  | "LEAD_LOCKOUT"
  | "LEAD_CREATED"
  | "DOWNLOAD_STARTED"
  | "DOWNLOAD_BLOCKED"
  | "RATE_LIMIT_EXCEEDED"
  | "SUSPICIOUS_ACTIVITY"
  | "HUBSPOT_SYNC"
  | "HUBSPOT_SYNC_FAILED"
  | "EMAIL_SEND_FAILED"
  | "VERIFICATION_LINK_SENT"
  | "VERIFICATION_FAILED"
  | "EMAIL_VERIFIED";

interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  ip?: string;
  email?: string;
  leadId?: string;
  resourceId?: string;
  details?: string;
  severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";
}

// Security event counters for anomaly detection
const securityEventCounters = new Map<string, { count: number; windowStart: number }>();
const ANOMALY_WINDOW = 60 * 1000; // 1 minute window
const ANOMALY_THRESHOLDS: Record<string, number> = {
  OTP_FAILED: 5,      // 5 failed OTPs per minute from same IP
  DOWNLOAD_BLOCKED: 3, // 3 blocked downloads per minute
  RATE_LIMIT_EXCEEDED: 10, // 10 rate limits per minute from same IP
};

export function logSecurityEvent(event: SecurityEvent): void {
  const redactedEvent = {
    ...event,
    email: event.email ? "[REDACTED]" : undefined,
  };
  
  const prefix = event.severity === "CRITICAL" ? "SECURITY ALERT" : "SECURITY";
  log.info({ event: redactedEvent, severity: event.severity }, `Security event: ${event.type}`);
  
  // Check for anomalies on high-risk events
  if (event.ip && ["OTP_FAILED", "DOWNLOAD_BLOCKED", "RATE_LIMIT_EXCEEDED"].includes(event.type)) {
    checkAnomalyThreshold(event.type, event.ip);
  }
}

function checkAnomalyThreshold(eventType: string, ip: string): void {
  const key = `${eventType}:${ip}`;
  const now = Date.now();
  const counter = securityEventCounters.get(key);
  
  if (!counter || now > counter.windowStart + ANOMALY_WINDOW) {
    securityEventCounters.set(key, { count: 1, windowStart: now });
    return;
  }
  
  counter.count++;
  const threshold = ANOMALY_THRESHOLDS[eventType] || 10;
  
  if (counter.count >= threshold) {
    logSecurityEvent({
      type: "SUSPICIOUS_ACTIVITY",
      timestamp: new Date().toISOString(),
      ip,
      details: `Threshold exceeded: ${counter.count} ${eventType} events in 1 minute`,
      severity: "CRITICAL",
    });
    // Reset counter after alert
    securityEventCounters.delete(key);
  }
}

// Periodic cleanup of old counters
setInterval(() => {
  const now = Date.now();
  Array.from(securityEventCounters.entries()).forEach(([key, value]) => {
    if (now > value.windowStart + ANOMALY_WINDOW * 2) {
      securityEventCounters.delete(key);
    }
  });
}, 60000); // Clean up every minute

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log sanitized response body in development, skip entirely in production
      if (capturedJsonResponse && !isProduction) {
        const sanitized = sanitizeForLog(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(sanitized)}`;
      }

      serverLog(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // API 404 catch-all: must be after all route handlers and before the SPA
  // fallback so unmatched /api/* paths return JSON 404 instead of index.html
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Initialize scan scheduler for monthly content scanning
  const { initializeScheduler } = await import("./services/scan-scheduler");
  initializeScheduler();

  // Auto-seed/sync FinanceCompass questions on every startup
  // Uses upsert logic so it's safe to run every time - creates new, updates existing
  try {
    const { seedQuestions, getQuestionBankCount, getInMemoryQuestionCount } = await import("./finance-compass/seed-questions");
    const dbCount = await getQuestionBankCount();
    const codeCount = getInMemoryQuestionCount();
    log.info({ dbCount, codeCount }, "FinanceCompass question counts");
    
    log.info("Running FinanceCompass question sync");
    const result = await seedQuestions();
    log.info({ seeded: result.seeded, updated: result.updated, total: result.total }, "FinanceCompass question sync complete");
  } catch (err) {
    log.error({ err: err instanceof Error ? err : new Error(String(err)) }, "FinanceCompass question sync failed");
  }

  // Initialize GDPR data retention configuration and cleanup scheduler
  const { initializeRetentionConfig, runRetentionCleanup } = await import("./services/gdpr-compliance");
  const { createSystemActor } = await import("./services/audit-logger");
  initializeRetentionConfig().catch(err => log.error({ err: err instanceof Error ? err : new Error(String(err)) }, "Failed to initialize GDPR retention config"));

  // Schedule GDPR retention cleanup (runs weekly on Sundays at 2 AM)
  function scheduleRetentionCleanup() {
    const ONE_HOUR = 60 * 60 * 1000;
    const checkInterval = ONE_HOUR; // Check hourly
    
    setInterval(async () => {
      const now = new Date();
      // Run on Sundays at 2 AM
      if (now.getDay() === 0 && now.getHours() === 2) {
        log.info("Running scheduled GDPR retention cleanup");
        try {
          const summary = await runRetentionCleanup(createSystemActor());
          log.info({ summary }, "GDPR cleanup completed");
        } catch (error) {
          log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "GDPR scheduled cleanup failed");
        }
      }
    }, checkInterval);
    
    log.info("GDPR retention cleanup scheduler initialized (runs Sunday 2 AM)");
  }
  
  scheduleRetentionCleanup();

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log.info({ port }, "Server started");
      
      // Seed blogs if database is empty (5 second delay)
      // Set second parameter to true for one-time force reseed
      scheduleBlogSeed(5000);
      
      // Schedule data quality backfill after server starts (30 second delay)
      // This ensures existing records are validated and standardized for monetization
      scheduleStartupBackfill(30000);
      
      // Schedule bot traffic backfill (35 second delay to run after data quality)
      // Flags historical page views and sessions with is_bot based on user agent
      scheduleBotBackfill(35000);
    },
  );
})();
