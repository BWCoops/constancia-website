import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createChildLogger } from "./lib/logger";

const log = createChildLogger("static");

// Known valid frontend routes - used to return proper HTTP 404 for unknown routes
// This prevents soft 404 issues flagged by Google Search Console
const KNOWN_ROUTES = new Set([
  "/",
  "/about",
  "/services",
  "/solutions",
  "/contact",
  "/blog",
  "/files",
  "/resources",
  "/terms",
  "/privacy",
  "/cookies",
  "/careers",
  "/export",
  "/tools/epm-comparison",
  "/vendors",
  "/finance-compass",
  "/finance-compass/dashboard",
  "/finance-compass/methodology",
  "/finance-compass/chat-popup",
]);

// Route patterns that accept dynamic segments
const DYNAMIC_ROUTE_PATTERNS = [
  /^\/blog\/[^/]+$/,                          // /blog/:slug
  /^\/finance-compass\/start\/[^/]+$/,        // /finance-compass/start/:tier
  /^\/finance-compass\/assess\/[^/]+$/,       // /finance-compass/assess/:id
  /^\/finance-compass\/results\/[^/]+$/,      // /finance-compass/results/:id
  /^\/finance-compass\/roi\/[^/]+$/,          // /finance-compass/roi/:id
  /^\/finance-compass\/dashboard\/[^/]+$/,    // /finance-compass/dashboard/:assessmentId
  /^\/admin(\/.*)?$/,                         // All admin routes
];

// Legacy file extensions that should always return 404
// These are from old websites, spam bots, or hack attempts
const LEGACY_FILE_EXTENSIONS = new Set([
  '.php', '.asp', '.aspx', '.jsp', '.cgi',
  '.kml', '.xml', '.rss',
  '.env', '.git', '.svn',
  '.sql', '.bak', '.old', '.orig',
  '.wp-login', '.wp-admin',
]);

/**
 * Check if a URL path has a legacy file extension that should return 404
 */
function isLegacyFileRequest(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  const extensions = Array.from(LEGACY_FILE_EXTENSIONS);
  for (let i = 0; i < extensions.length; i++) {
    const ext = extensions[i];
    if (lower.endsWith(ext) || lower.includes(ext + '?') || lower.includes(ext + '/')) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a URL path is a known valid route
 * Returns true for known routes, false for unknown (404) routes
 */
function isKnownRoute(urlPath: string): boolean {
  const pathname = urlPath.split("?")[0].split("#")[0];
  
  if (isLegacyFileRequest(pathname)) {
    return false;
  }
  
  if (KNOWN_ROUTES.has(pathname)) {
    return true;
  }
  
  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    if (pattern.test(pathname)) {
      return true;
    }
  }
  
  return false;
}

// Sensitive directory prefixes that must never be served over HTTP
const BLOCKED_PATH_PREFIXES = [
  "/.git",
  "/.env",
  "/.local",
  "/.agents",
  "/.svn",
  "/node_modules",
  "/server",
  "/scripts",
];

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Block access to sensitive directories and files before any static serving
  app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    for (const prefix of BLOCKED_PATH_PREFIXES) {
      if (p === prefix || p.startsWith(prefix + "/")) {
        res.status(403).send("Forbidden");
        return;
      }
    }
    next();
  });

  // Serve robots.txt explicitly before catch-all
  app.get("/robots.txt", (_req, res) => {
    const robotsPath = path.resolve(distPath, "robots.txt");
    if (fs.existsSync(robotsPath)) {
      res.type('text/plain');
      res.sendFile(robotsPath);
    } else {
      res.type('text/plain');
      res.send(`# Constancia Website - Robots.txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /cdn-cgi/
Disallow: /home
Disallow: /thank-you
Disallow: /page-not-found
Disallow: /*.php
Disallow: /*.asp
Disallow: /*.kml
Disallow: /wp-admin
Disallow: /wp-login

Sitemap: https://constancia.io/sitemap.xml
`);
    }
  });

  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      
      if (['.js', '.css', '.woff', '.woff2', '.ttf', '.otf'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
      } else if (ext === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Discover the hashed hero image filename once at startup so the Link
  // preload header always points to the actual built asset.
  let heroPreloadHeader = "";
  try {
    const assetsDir = path.resolve(distPath, "assets");
    const heroFile = fs.readdirSync(assetsDir).find(f => f.startsWith("dark_navy_cyan_abstract_hero") && f.endsWith(".webp"));
    if (heroFile) {
      heroPreloadHeader = `</assets/${heroFile}>; rel=preload; as=image; type="image/webp"; fetchpriority=high`;
      log.info({ heroFile }, "Hero image preload header configured");
    }
  } catch {
    log.warn("Could not discover hero image for Link preload header");
  }

  // SPA fallback with proper HTTP status codes
  // Returns 404 for unknown routes (fixes soft 404 issue for Google Search Console)
  // Returns 200 for known routes
  app.get("/*", (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    if (heroPreloadHeader) {
      res.setHeader('Link', heroPreloadHeader);
    }
    
    const indexPath = path.resolve(distPath, "index.html");
    
    // Check if this is a known valid route
    if (isKnownRoute(req.path)) {
      // Known route - return 200 OK
      res.status(200).sendFile(indexPath);
    } else {
      // Unknown route - return proper 404 status (fixes soft 404)
      // Still serve index.html so React can show the nice 404 page
      res.status(404).sendFile(indexPath);
    }
  });
}
