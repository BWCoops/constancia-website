import { storage } from "../storage";
import { getServerFeatureFlags, type FeatureFlags } from "@shared/feature-flags";
import { createChildLogger } from "../lib/logger";
import { escapeHtml as escapeXml } from "../utils/html-escape";

const log = createChildLogger("seo");

const SITE_URL = process.env.SITE_URL || "https://constancia.io";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

// Static page configurations with feature flag associations
// Priority: home=1.0, main pages=0.8, blog posts=0.6, legal=0.3
const allStaticPages: Array<SitemapUrl & { featureKey?: keyof FeatureFlags }> = [
  { loc: "/", lastmod: "2026-02-02", changefreq: "weekly", priority: 1.0, featureKey: "home" },
  { loc: "/about", lastmod: "2026-01-15", changefreq: "monthly", priority: 0.8, featureKey: "about" },
  { loc: "/services", lastmod: "2026-01-15", changefreq: "monthly", priority: 0.8, featureKey: "services" },
  { loc: "/solutions", lastmod: "2026-01-15", changefreq: "monthly", priority: 0.8, featureKey: "solutions" },
  { loc: "/contact", lastmod: "2026-01-15", changefreq: "monthly", priority: 0.8, featureKey: "contact" },
  { loc: "/blog", lastmod: "2026-02-02", changefreq: "daily", priority: 0.8, featureKey: "blog" },
  { loc: "/tools/epm-comparison", lastmod: "2026-02-01", changefreq: "monthly", priority: 0.8, featureKey: "comparisonTools" },
  { loc: "/finance-compass", lastmod: "2026-02-02", changefreq: "monthly", priority: 0.9, featureKey: "financeCompass" },
  { loc: "/finance-compass/methodology", lastmod: "2026-01-20", changefreq: "monthly", priority: 0.7, featureKey: "financeCompass" },
  { loc: "/files", lastmod: "2026-02-01", changefreq: "weekly", priority: 0.8, featureKey: "resources" },
  { loc: "/vendors", lastmod: "2026-02-01", changefreq: "weekly", priority: 0.7, featureKey: "comparisonTools" },
  { loc: "/careers", lastmod: "2026-01-10", changefreq: "monthly", priority: 0.6 },
  { loc: "/terms", lastmod: "2025-12-01", changefreq: "yearly", priority: 0.3 },
  { loc: "/privacy", lastmod: "2025-12-01", changefreq: "yearly", priority: 0.3 },
  { loc: "/cookies", lastmod: "2025-12-01", changefreq: "yearly", priority: 0.3 },
];

export async function generateSitemap(): Promise<string> {
  const flags = await getServerFeatureFlags();
  
  // Filter static pages based on feature flags
  const staticPages = allStaticPages.filter(page => {
    if (!page.featureKey) return true; // No feature key = always included
    return flags[page.featureKey];
  });
  
  const urls: SitemapUrl[] = [...staticPages];

  // Only include blog posts in sitemap if blog feature is enabled
  if (flags.blog) {
    try {
      const blogPostsResult = await storage.getBlogPosts();
      const blogPosts = blogPostsResult.items || [];

      for (const post of blogPosts) {
        urls.push({
          loc: `/blog/${post.slug}`,
          lastmod: post.publishedAt
            ? new Date(post.publishedAt).toISOString().split("T")[0]
            : undefined,
          changefreq: "monthly",
          priority: 0.6,
        });
      }
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error fetching blog posts for sitemap");
    }
  }

  // Note: Individual /files/{slug} URLs are NOT included because the frontend
  // only has a /files listing page, not individual resource pages.
  // Including them would cause 404 errors in Google Search Console.

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${SITE_URL}${escapeXml(url.loc)}</loc>
${url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>\n` : ""}${url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>\n` : ""}${url.priority !== undefined ? `    <priority>${url.priority}</priority>\n` : ""}  </url>`
  )
  .join("\n")}
</urlset>`;

  return xml;
}

export interface RobotsConfig {
  allowAll: boolean;
  disallowPaths: string[];
  crawlDelay?: number;
  sitemapUrl: string;
}

const defaultRobotsConfig: RobotsConfig = {
  allowAll: true,
  disallowPaths: [
    "/admin", "/api", "/cdn-cgi/",
    "/home", "/thank-you", "/page-not-found",
    "/empowering-finance-teams", "/support-your-business-contact",
    "/finance-transformation-epm-implementation",
    "/*.php", "/*.asp", "/*.aspx", "/*.jsp", "/*.cgi", "/*.kml",
    "/wp-admin", "/wp-login", "/wp-content", "/wp-includes",
  ],
  crawlDelay: 1,
  sitemapUrl: `${SITE_URL}/sitemap.xml`,
};

let customRobotsConfig: RobotsConfig | null = null;

export function getRobotsConfig(): RobotsConfig {
  return customRobotsConfig || defaultRobotsConfig;
}

export function setRobotsConfig(config: Partial<RobotsConfig>): RobotsConfig {
  customRobotsConfig = {
    ...defaultRobotsConfig,
    ...config,
  };
  return customRobotsConfig;
}

export function generateRobotsTxt(): string {
  const config = getRobotsConfig();

  let content = `# robots.txt for ${SITE_URL}
# Generated: ${new Date().toISOString()}
# Note: AI bot restrictions are managed by Cloudflare

User-agent: *
`;

  if (config.allowAll) {
    content += "Allow: /\n";
  } else {
    content += "Disallow: /\n";
  }

  for (const path of config.disallowPaths) {
    content += `Disallow: ${path}\n`;
  }

  if (config.crawlDelay) {
    content += `\nCrawl-delay: ${config.crawlDelay}\n`;
  }

  content += `\nSitemap: ${config.sitemapUrl}\n`;

  return content;
}

let sitemapLastGenerated: string | null = null;
let lastUrlCount = 0;

export async function generateSitemapWithTracking(): Promise<string> {
  const sitemap = await generateSitemap();
  sitemapLastGenerated = new Date().toISOString();
  const urlMatches = sitemap.match(/<url>/g);
  lastUrlCount = urlMatches ? urlMatches.length : 0;
  return sitemap;
}

export function getSeoStatus(): {
  sitemapLastGenerated: string | null;
  totalUrls: number;
  robotsConfig: {
    allowAll: boolean;
    disallowedPaths: string[];
    sitemapUrl: string;
  };
} {
  const config = getRobotsConfig();
  return {
    sitemapLastGenerated,
    totalUrls: lastUrlCount || allStaticPages.length,
    robotsConfig: {
      allowAll: config.allowAll,
      disallowedPaths: config.disallowPaths,
      sitemapUrl: config.sitemapUrl,
    },
  };
}
