import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createChildLogger } from "./lib/logger";
import { storage } from "./storage";

const log = createChildLogger("static");

const SITE_URL = process.env.SITE_URL || "https://constancia.com";

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
  "/export",
  "/tools/epm-comparison",
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

// Route-specific SEO metadata for known public routes.
// These are injected server-side so non-JS crawlers receive the
// correct title/description/OG tags on the initial HTTP response.
interface RouteMeta {
  title: string;
  description: string;
  ogImage?: string;
}

const ROUTE_METADATA: Record<string, RouteMeta> = {
  "/": {
    title: "Constancia — Building Intelligent Agentic Enterprise",
    description: "Constancia is launching. Building Intelligent Agentic Enterprise. Official OneStream and Abacum partner.",
  },
  "/about": {
    title: "About Constancia — Enterprise Intelligence Company",
    description: "Constancia is an enterprise intelligence company that helps leaders move from debate to outcomes. Real-time visibility across organisational data, delivered by senior practitioners. Official Abacum and OneStream partner.",
  },
  "/services": {
    title: "Services — Abacum, OneStream, AI Development Partner | Constancia",
    description: "Official Abacum partner for mid-market FP&A, OneStream partner for enterprise EPM, and an AI development partner for custom build. Senior practitioners, fixed-fee delivery.",
  },
  "/solutions": {
    title: "Solutions — Productised Intelligence for Finance + Operations | Constancia",
    description: "Explore, Assess, Plan, Implement — Constancia's four-stage methodology for taking a finance function from debate to outcomes.",
  },
  "/contact": {
    title: "Contact Us | Constancia",
    description: "Talk to Constancia about enterprise intelligence — platform selection, integration, transformation planning, and senior-level guidance.",
  },
  "/blog": {
    title: "Day to Day AI — Practical Notes on Finance + AI | Constancia",
    description: "Short, practical writing on running AI inside finance — what works, what fails, and how to choose between platforms.",
  },
  "/files": {
    title: "Toolkit — Frameworks + Templates from Real Programmes | Constancia",
    description: "Downloadable frameworks, scoping templates, and reference architectures pulled straight from real Constancia delivery.",
  },
  "/resources": {
    title: "Resources — Finance Transformation Guides | Constancia",
    description: "Finance transformation resources, guides, and templates from Constancia's delivery practice.",
  },
  "/tools/epm-comparison": {
    title: "EPM Comparison Tool — Compare Enterprise Performance Management Platforms | Constancia",
    description: "Independent comparison of EPM platforms — Anaplan, OneStream, Planful, Oracle, and more. Scored across 15 key drivers for your organisation's specific requirements.",
  },
  "/vendors": {
    title: "Finance Platform Vendors — EPM, ERP & AI Tools | Constancia",
    description: "Browse and compare finance platform vendors across EPM, ERP, and AI categories. Independent analysis from Constancia.",
  },
  "/finance-compass": {
    title: "FinanceCompass | Map every finance system you own | Constancia",
    description: "Where are your finance systems disconnected? FinanceCompass scores your finance function against 200+ benchmarks in 12 minutes and shows where the gaps cost you most. Free, no call required.",
  },
  "/finance-compass/methodology": {
    title: "Benchmarking Methodology | FinanceCompass | Constancia",
    description: "How Constancia builds accurate finance benchmarks using UK government data. Full transparency into our scoring methodology, data sources, and calculations.",
  },
  "/terms": {
    title: "Terms of Service | Constancia",
    description: "Terms of service for Constancia — the enterprise intelligence company.",
  },
  "/privacy": {
    title: "Privacy Policy | Constancia",
    description: "Privacy policy for Constancia. How we collect, use, and protect your data.",
  },
  "/cookies": {
    title: "Cookie Policy | Constancia",
    description: "Cookie policy for Constancia. How we use cookies on constancia.com.",
  },
};

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

// ─── HTML escaping helpers ─────────────────────────────────────────────────

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Markdown → plain text (for server-side article body) ─────────────────

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')              // fenced code blocks
    .replace(/`[^`]+`/g, '')                      // inline code
    .replace(/^\s*#+\s+/gm, '')                   // ATX headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // bold
    .replace(/\*([^*]+)\*/g, '$1')                // italic asterisk
    .replace(/_([^_]+)_/g, '$1')                  // italic underscore
    .replace(/~~([^~]+)~~/g, '$1')                // strikethrough
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // links → text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')       // images → remove
    .replace(/^[-*+]\s+/gm, '')                   // unordered list markers
    .replace(/^\d+\.\s+/gm, '')                   // ordered list markers
    .replace(/^\s*>\s?/gm, '')                    // blockquotes
    .replace(/^---+$/gm, '')                      // horizontal rules
    .replace(/\{[^}]{0,500}\}/g, '')              // custom JSON component blocks
    .replace(/\n{3,}/g, '\n\n')                   // collapse excess newlines
    .trim();
}

/**
 * Convert markdown text to simple HTML paragraphs.
 * Used to embed readable article content in the server-rendered shell
 * so non-JS crawlers can index the actual article body.
 */
function markdownToSimpleHtml(md: string): string {
  const plain = stripMarkdown(md);
  const paragraphs = plain
    .split(/\n\n+/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 20);  // skip very short fragments

  return paragraphs
    .slice(0, 40)  // cap at ~40 paragraphs for the server-rendered version
    .map(p => `<p>${escapeText(p)}</p>`)
    .join('\n');
}

// ─── Template cache ────────────────────────────────────────────────────────

let cachedTemplate: string | null = null;

function getTemplate(distPath: string): string {
  if (!cachedTemplate) {
    cachedTemplate = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
  }
  return cachedTemplate;
}

// ─── Metadata injection ────────────────────────────────────────────────────

interface MetaPayload {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  ogImage?: string;
}

/**
 * Inject route-specific metadata into the SPA shell HTML.
 * Replaces the default title, description, canonical, and OG/Twitter tags
 * so non-JS crawlers receive correct metadata on the first HTTP response.
 */
function injectHeadMetadata(html: string, meta: MetaPayload): string {
  const fullTitle = meta.title.includes("Constancia") ? meta.title : `${meta.title} | Constancia`;
  const ea = escapeAttr;
  let result = html;

  // <title>
  result = result.replace(/<title>[^<]*<\/title>/, `<title>${escapeText(fullTitle)}</title>`);

  // <meta name="title">
  result = result.replace(
    /(<meta name="title" content=")[^"]*(")/,
    `$1${ea(fullTitle)}$2`
  );

  // <meta name="description">
  result = result.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${ea(meta.description)}$2`
  );

  // canonical
  result = result.replace(
    /(<link rel="canonical" href=")[^"]*(")/,
    `$1${ea(meta.canonical)}$2`
  );

  // og:type
  if (meta.ogType) {
    result = result.replace(
      /(<meta property="og:type" content=")[^"]*(")/,
      `$1${ea(meta.ogType)}$2`
    );
  }

  // og:url
  result = result.replace(
    /(<meta property="og:url" content=")[^"]*(")/,
    `$1${ea(meta.canonical)}$2`
  );

  // og:title
  result = result.replace(
    /(<meta property="og:title" content=")[^"]*(")/,
    `$1${ea(fullTitle)}$2`
  );

  // og:description
  result = result.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${ea(meta.description)}$2`
  );

  // og:image (only replace if a custom image is provided)
  if (meta.ogImage) {
    result = result.replace(
      /(<meta property="og:image" content=")[^"]*(")/,
      `$1${ea(meta.ogImage)}$2`
    );
  }

  // twitter:url
  result = result.replace(
    /(<meta name="twitter:url" content=")[^"]*(")/,
    `$1${ea(meta.canonical)}$2`
  );

  // twitter:title
  result = result.replace(
    /(<meta name="twitter:title" content=")[^"]*(")/,
    `$1${ea(fullTitle)}$2`
  );

  // twitter:description
  result = result.replace(
    /(<meta name="twitter:description" content=")[^"]*(")/,
    `$1${ea(meta.description)}$2`
  );

  // twitter:image (only replace if a custom image is provided)
  if (meta.ogImage) {
    result = result.replace(
      /(<meta name="twitter:image" content=")[^"]*(")/,
      `$1${ea(meta.ogImage)}$2`
    );
  }

  return result;
}

/**
 * Inject article JSON-LD schema into the <head>.
 */
function injectArticleSchema(html: string, schema: object): string {
  const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  return html.replace('</head>', `${scriptTag}\n</head>`);
}

/**
 * Inject server-rendered article content into <div id="root">.
 * React will replace this with the full rendered app once JS runs.
 * Non-JS crawlers see the article title, excerpt, and body text.
 */
function injectArticleBody(html: string, article: {
  title: string;
  excerpt: string;
  author?: string;
  publishedAt?: string;
  heroImage?: string;
  bodyHtml: string;
}): string {
  const heroImg = article.heroImage
    ? `<img src="${escapeAttr(article.heroImage)}" alt="${escapeAttr(article.title)}" style="width:100%;max-height:420px;object-fit:cover;border-radius:8px;margin-bottom:24px">`
    : '';

  const byline = [
    article.author ? `By ${escapeText(article.author)}` : '',
    article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
  ].filter(Boolean).join(' · ');

  const srContent = `<article style="font-family:system-ui,-apple-system,sans-serif;max-width:860px;margin:80px auto 48px;padding:0 24px;color:#1a1a1a">
${heroImg}
<h1 style="font-size:2rem;line-height:1.2;font-weight:700;margin-bottom:16px">${escapeText(article.title)}</h1>
<p style="font-size:1.125rem;color:#555;margin-bottom:24px">${escapeText(article.excerpt)}</p>
${byline ? `<p style="font-size:0.875rem;color:#888;margin-bottom:32px">${byline}</p>` : ''}
<div style="font-size:1rem;line-height:1.7;color:#333">
${article.bodyHtml}
</div>
</article>`;

  return html.replace(
    '<div id="root"></div>',
    `<div id="root">${srContent}</div>`
  );
}

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

Sitemap: https://constancia.com/sitemap.xml
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
      } else if (['.mp4', '.webm', '.mov', '.m4v', '.ogg', '.ogv'].includes(ext)) {
        // Launch-film + any future video. Long-cache the bytes —
        // we never overwrite a video at the same path; a new asset
        // would land at a new name. Range requests still served
        // correctly via express.static.
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
      } else if (ext === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // ── Blog post SSR handler ──────────────────────────────────────────────
  // Intercepts /blog/:slug before the generic SPA fallback.
  // Fetches the post from the database and injects the article metadata
  // and body content into the HTML shell so non-JS crawlers receive the
  // full article text and correct <title>/OG tags on the first response.
  app.get("/blog/:slug", async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const template = getTemplate(distPath);
    const { slug } = req.params;
    const canonical = `${SITE_URL}/blog/${slug}`;

    try {
      const post = await storage.getBlogPostBySlug(slug);

      if (!post) {
        // Unknown slug → 404 with minimal metadata
        const html = injectHeadMetadata(template, {
          title: "Article Not Found | Constancia",
          description: "The blog article you are looking for could not be found.",
          canonical,
        });
        return res.status(404).send(html);
      }

      const ogImage = post.heroImage || undefined;

      // 1. Inject <head> metadata
      let html = injectHeadMetadata(template, {
        title: post.title,
        description: post.excerpt,
        canonical,
        ogType: "article",
        ogImage,
      });

      // 2. Inject Article JSON-LD schema
      const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt,
        "url": canonical,
        "datePublished": post.publishedAt || undefined,
        "author": post.author
          ? { "@type": "Person", "name": post.author }
          : { "@type": "Organization", "name": "Constancia" },
        "publisher": {
          "@type": "Organization",
          "name": "Constancia",
          "logo": { "@type": "ImageObject", "url": `${SITE_URL}/logo.png` },
        },
        ...(ogImage ? { "image": ogImage } : {}),
        ...(post.tags?.length ? { "keywords": post.tags.join(", ") } : {}),
      };
      html = injectArticleSchema(html, articleSchema);

      // 3. Inject server-rendered article body for non-JS crawlers
      const bodyHtml = markdownToSimpleHtml(post.content || '');
      html = injectArticleBody(html, {
        title: post.title,
        excerpt: post.excerpt,
        author: post.author || undefined,
        publishedAt: post.publishedAt || undefined,
        heroImage: ogImage,
        bodyHtml,
      });

      return res.status(200).send(html);
    } catch (err) {
      log.error({ err: err instanceof Error ? err : new Error(String(err)) }, "Blog SSR injection failed, falling back to shell");
      // Fall back to generic SPA shell on any storage error
      return res.status(200).send(template);
    }
  });

  // ── General SPA fallback with metadata injection ───────────────────────
  // Returns 404 for unknown routes (fixes soft 404 issue for Google Search Console)
  // Returns 200 for known routes, with route-specific metadata injected.
  app.get("/*", (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const template = getTemplate(distPath);
    const pathname = req.path.split("?")[0].split("#")[0];
    const routeMeta = ROUTE_METADATA[pathname];
    const known = isKnownRoute(req.path);

    if (routeMeta) {
      const canonical = `${SITE_URL}${pathname === "/" ? "" : pathname}`;
      const html = injectHeadMetadata(template, {
        title: routeMeta.title,
        description: routeMeta.description,
        canonical: canonical || SITE_URL,
        ogImage: routeMeta.ogImage,
      });
      return res.status(known ? 200 : 404).send(html);
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (known) {
      return res.status(200).sendFile(indexPath);
    } else {
      return res.status(404).sendFile(indexPath);
    }
  });
}
