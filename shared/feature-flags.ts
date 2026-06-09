/**
 * Feature Flags Configuration
 * 
 * Controls which sections of the website are enabled/disabled.
 * 
 * Priority Order:
 * 1. Database overrides (set via Admin UI) - highest priority
 * 2. Environment variables - baseline defaults
 * 
 * Environment Variables:
 * - FEATURE_ABOUT=false          (disable About section)
 * - FEATURE_SERVICES=false       (disable Services section)
 * - FEATURE_SOLUTIONS=false      (disable Solutions section)
 * - FEATURE_COMPARISON_TOOLS=false (disable Comparison Tools)
 * - FEATURE_FINANCE_COMPASS=false (disable FinanceCompass)
 * - FEATURE_BLOG=false           (disable Blog/Insights Hub)
 * - FEATURE_RESOURCES=false      (disable Resources/Files)
 * - FEATURE_CONTACT=false        (disable Contact section)
 * 
 * All flags default to TRUE (enabled) unless explicitly set to "false"
 */

export interface FeatureFlags {
  home: boolean;
  about: boolean;
  services: boolean;
  solutions: boolean;
  comparisonTools: boolean;
  financeCompass: boolean;
  blog: boolean;
  resources: boolean;
  contact: boolean;
  requireBusinessEmail: boolean;
}

// Feature key mapping for database storage
export const FEATURE_KEY_MAP: Record<keyof Omit<FeatureFlags, 'home'>, string> = {
  about: 'about',
  services: 'services',
  solutions: 'solutions',
  comparisonTools: 'comparisonTools',
  financeCompass: 'financeCompass',
  blog: 'blog',
  resources: 'resources',
  contact: 'contact',
  requireBusinessEmail: 'requireBusinessEmail',
};

// All feature keys except home (which is always enabled)
export const FEATURE_KEYS = Object.keys(FEATURE_KEY_MAP) as (keyof Omit<FeatureFlags, 'home'>)[];

// Helper to parse boolean env vars (defaults to true if not set)
function parseEnvFlag(value: string | undefined, defaultValue: boolean = true): boolean {
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() !== 'false';
}

// Server-side feature flags from environment only (synchronous baseline).
// Launch holding-page baseline: marketing pages (about / services /
// solutions / blog / resources) default OFF so the server matches the
// holding-page nav. Admins can flip individual flags on through
// /admin/feature-flags (DB overrides win over env defaults) once the
// full site is ready to go live.
export function getEnvFeatureFlags(): FeatureFlags {
  return {
    home: true, // Home is always enabled
    about: parseEnvFlag(process.env.FEATURE_ABOUT, false),
    services: parseEnvFlag(process.env.FEATURE_SERVICES, false),
    solutions: parseEnvFlag(process.env.FEATURE_SOLUTIONS, false),
    comparisonTools: parseEnvFlag(process.env.FEATURE_COMPARISON_TOOLS),
    financeCompass: parseEnvFlag(process.env.FEATURE_FINANCE_COMPASS),
    blog: parseEnvFlag(process.env.FEATURE_BLOG, false),
    resources: parseEnvFlag(process.env.FEATURE_RESOURCES, false),
    contact: parseEnvFlag(process.env.FEATURE_CONTACT),
    requireBusinessEmail: parseEnvFlag(process.env.FEATURE_REQUIRE_BUSINESS_EMAIL, false),
  };
}

// Cache for merged feature flags
let cachedFlags: FeatureFlags | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5000; // 5 second cache to reduce DB hits

// Invalidate the feature flags cache (call after updates)
export function invalidateFeatureFlagsCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}

// Database override fetcher - injected from server to avoid circular dependencies
let dbOverrideFetcher: (() => Promise<Array<{ featureKey: string; isEnabled: boolean }>>) | null = null;

export function setDbOverrideFetcher(fetcher: () => Promise<Array<{ featureKey: string; isEnabled: boolean }>>): void {
  dbOverrideFetcher = fetcher;
}

// Server-side feature flags with database overrides (async)
export async function getServerFeatureFlags(): Promise<FeatureFlags> {
  // Check cache
  const now = Date.now();
  if (cachedFlags && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedFlags;
  }

  // Start with environment defaults
  const flags = getEnvFeatureFlags();

  // Apply database overrides if fetcher is available
  if (dbOverrideFetcher) {
    try {
      const overrides = await dbOverrideFetcher();
      for (const override of overrides) {
        const key = override.featureKey as keyof FeatureFlags;
        if (key in flags && key !== 'home') {
          flags[key] = override.isEnabled;
        }
      }
    } catch (error) {
      console.error('[FeatureFlags] Error fetching database overrides:', error);
      // Fall back to env-only flags on error
    }
  }

  // Update cache
  cachedFlags = flags;
  cacheTimestamp = now;

  return flags;
}

// Synchronous version for backwards compatibility (uses cache or env defaults)
export function getServerFeatureFlagsSync(): FeatureFlags {
  if (cachedFlags) {
    return cachedFlags;
  }
  return getEnvFeatureFlags();
}

// Complete list of frontend route patterns for each feature
export const FRONTEND_ROUTE_PATTERNS: Record<keyof FeatureFlags, string[]> = {
  home: ['/'],
  about: ['/about'],
  services: ['/services'],
  solutions: ['/solutions', '/industries'],
  comparisonTools: [
    '/tools',
    '/tools/epm-comparison',
    '/tools/erp-comparison', 
    '/tools/ai-comparison',
    '/vendors',
  ],
  financeCompass: [
    '/finance-compass',
    '/financecompass',
  ],
  blog: [
    '/blog',
    '/insights',
  ],
  resources: [
    '/files',
    '/resources',
  ],
  contact: ['/contact'],
  requireBusinessEmail: [], // Not a page feature
};

// Complete list of API route patterns for each feature
export const API_ROUTE_PATTERNS: Record<keyof FeatureFlags, string[]> = {
  home: [],
  about: [],
  services: [],
  solutions: [],
  comparisonTools: [
    '/api/comparison',
    '/api/tools',
  ],
  financeCompass: [
    '/api/finance-compass',
    '/api/admin/finance-compass',
  ],
  blog: [
    '/api/blog',
    '/api/posts',
    '/api/categories',
  ],
  resources: [
    '/api/resources',
    '/api/files',
    '/api/downloads',
    '/api/leads',
  ],
  contact: [
    '/api/contact',
  ],
  requireBusinessEmail: [], // Not a route feature
};

// Admin routes that should be blocked when feature is disabled
export const ADMIN_ROUTE_PATTERNS: Record<keyof FeatureFlags, string[]> = {
  home: [],
  about: [],
  services: [],
  solutions: [],
  comparisonTools: [],
  financeCompass: [
    '/admin/finance-compass',
  ],
  blog: [
    '/admin/blog',
    '/admin/posts',
  ],
  resources: [
    '/admin/resources',
    '/admin/leads',
    '/admin/downloads',
  ],
  contact: [],
  requireBusinessEmail: [], // Not a route feature
};

// Check if a frontend route matches a feature
export function getFeatureForRoute(path: string): keyof FeatureFlags | null {
  const normalizedPath = path.toLowerCase();
  
  for (const [feature, patterns] of Object.entries(FRONTEND_ROUTE_PATTERNS)) {
    for (const pattern of patterns) {
      // Exact match or starts with pattern (for nested routes)
      if (normalizedPath === pattern || 
          (pattern !== '/' && normalizedPath.startsWith(pattern + '/')) ||
          (pattern !== '/' && normalizedPath.startsWith(pattern))) {
        return feature as keyof FeatureFlags;
      }
    }
  }
  
  // Check admin routes
  for (const [feature, patterns] of Object.entries(ADMIN_ROUTE_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalizedPath.startsWith(pattern)) {
        return feature as keyof FeatureFlags;
      }
    }
  }
  
  return null;
}

// Check if an API route matches a feature
export function getFeatureForApiRoute(path: string): keyof FeatureFlags | null {
  const normalizedPath = path.toLowerCase();
  
  for (const [feature, patterns] of Object.entries(API_ROUTE_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalizedPath.startsWith(pattern)) {
        return feature as keyof FeatureFlags;
      }
    }
  }
  
  return null;
}

// Check if a route is enabled
export function isRouteEnabled(path: string, flags: FeatureFlags): boolean {
  const feature = getFeatureForRoute(path);
  if (!feature) return true; // Unknown routes are enabled by default
  return flags[feature];
}

// Check if an API route is enabled
export function isApiRouteEnabled(path: string, flags: FeatureFlags): boolean {
  const feature = getFeatureForApiRoute(path);
  if (!feature) return true; // Unknown routes are enabled by default
  return flags[feature];
}

// Navigation link definitions with feature flag keys
export const NAV_LINKS = [
  { href: '/', label: 'Home', featureKey: 'home' as keyof FeatureFlags },
  { href: '/about', label: 'About', featureKey: 'about' as keyof FeatureFlags },
  { href: '/services', label: 'Services', featureKey: 'services' as keyof FeatureFlags },
  { href: '/solutions', label: 'Solutions', featureKey: 'solutions' as keyof FeatureFlags },
  { href: '/tools/epm-comparison', label: 'Enterprise Technology Comparison', featureKey: 'comparisonTools' as keyof FeatureFlags },
  { href: '/vendors', label: 'Vendors', featureKey: 'comparisonTools' as keyof FeatureFlags },
  { href: '/finance-compass', label: 'FinanceCompass', featureKey: 'financeCompass' as keyof FeatureFlags },
  { href: '/blog', label: 'Day to Day AI', featureKey: 'blog' as keyof FeatureFlags },
  { href: '/files', label: 'Toolkit', featureKey: 'resources' as keyof FeatureFlags },
  { href: '/contact', label: 'Contact', featureKey: 'contact' as keyof FeatureFlags },
];

// Get filtered navigation links based on feature flags
export function getEnabledNavLinks(flags: FeatureFlags) {
  return NAV_LINKS.filter(link => flags[link.featureKey]);
}

// Sitemap paths that should be excluded when feature is disabled
export const SITEMAP_PATHS: Record<keyof FeatureFlags, string[]> = {
  home: ['/'],
  about: ['/about'],
  services: ['/services'],
  solutions: ['/solutions'],
  comparisonTools: ['/tools/epm-comparison', '/tools/erp-comparison', '/tools/ai-comparison', '/vendors'],
  financeCompass: ['/finance-compass'],
  blog: ['/blog'],
  resources: ['/files'],
  contact: ['/contact'],
  requireBusinessEmail: [], // Not a page feature
};

// Get sitemap paths filtered by feature flags
export function getEnabledSitemapPaths(flags: FeatureFlags): string[] {
  const enabledPaths: string[] = [];
  
  for (const [feature, paths] of Object.entries(SITEMAP_PATHS)) {
    if (flags[feature as keyof FeatureFlags]) {
      enabledPaths.push(...paths);
    }
  }
  
  return enabledPaths;
}
