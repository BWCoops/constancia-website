const preloadedRoutes = new Set<string>();
const preloadedImages = new Set<string>();
const imageCache = new Map<string, HTMLImageElement>();

const safeRequestIdleCallback = (callback: () => void, delayMs: number = 0): void => {
  if (typeof window === 'undefined') return;
  
  const run = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => callback(), { timeout: 2000 });
    } else {
      setTimeout(callback, 50);
    }
  };

  if (delayMs > 0) {
    setTimeout(run, delayMs);
  } else {
    run();
  }
};

// Public routes only - admin routes excluded to reduce bundle fetches for public users
// Admin routes are preloaded separately via preloadAdminRoutes() when user is authenticated
const routeImports: Record<string, () => Promise<unknown>> = {
  '/about': () => import('@/pages/about'),
  '/services': () => import('@/pages/services'),
  '/solutions': () => import('@/pages/solutions'),
  '/contact': () => import('@/pages/contact'),
  '/blog': () => import('@/pages/blog'),
  '/files': () => import('@/pages/files'),
  '/resources': () => import('@/pages/files'),
  '/tools/epm-comparison': () => import('@/pages/epm-comparison'),
  '/terms': () => import('@/pages/terms'),
  '/privacy': () => import('@/pages/privacy'),
  '/cookies': () => import('@/pages/cookies'),
  '/careers': () => import('@/pages/careers'),
  '/finance-compass': () => import('@/pages/FinanceCompassLanding'),
  '/finance-compass/dashboard': () => import('@/pages/FinanceCompassDashboard'),
  '/finance-compass/results': () => import('@/pages/FinanceCompassResults'),
  '/finance-compass/methodology': () => import('@/pages/FinanceCompassMethodology'),
};

// Admin routes - only preloaded when authenticated via preloadAdminRoutes()
const adminRouteImports: Record<string, () => Promise<unknown>> = {
  '/admin': () => import('@/pages/admin/AdminHub'),
  '/admin/dashboard': () => import('@/pages/admin/AdminDashboard'),
  '/admin/leads': () => import('@/pages/admin/AdminLeads'),
  '/admin/blog-posts': () => import('@/pages/admin/AdminBlogPosts'),
  '/admin/resources': () => import('@/pages/admin/AdminResources'),
  '/admin/feature-flags': () => import('@/pages/admin/AdminFeatureFlags'),
  '/admin/finance-compass': () => import('@/pages/admin/FinanceCompassDashboard'),
  '/admin/finance-compass/assessments': () => import('@/pages/admin/FinanceCompassAssessments'),
  '/admin/analytics': () => import('@/pages/admin/AdminAnalytics'),
  '/admin/operations': () => import('@/pages/admin/AdminOperations'),
  '/admin/security': () => import('@/pages/admin/AdminSecurity'),
};

const adminPriorityRoutes = [
  '/admin/dashboard', 
  '/admin/leads', 
  '/admin/finance-compass',
  '/admin/feature-flags'
];

const priorityRoutes = ['/solutions', '/services', '/about', '/contact'];
const heavyRoutes = ['/tools/epm-comparison'];

export function preloadFinanceCompassComponents(): void {
  if (typeof window === 'undefined') return;
  
  safeRequestIdleCallback(() => {
    preloadRoute('/finance-compass/dashboard');
    preloadRoute('/finance-compass/results');
    preloadRoute('/finance-compass/methodology');
  }, 1500);
}

export function preloadAdminRoutes(): void {
  if (typeof window === 'undefined') return;
  
  safeRequestIdleCallback(() => {
    adminPriorityRoutes.forEach(route => preloadRoute(route));
  }, 500);
}

export function preloadPriorityRoutes(): void {
  if (typeof window === 'undefined') return;
  
  // Delay priority routes to 8 seconds to not interfere with initial page metrics
  safeRequestIdleCallback(() => {
    priorityRoutes.forEach(route => preloadRoute(route));
  }, 8000);
}

export function preloadHeavyRoutes(): void {
  // Heavy routes should only be preloaded on user intent (hover/focus on link)
  // Not automatically - the 272KB epm-comparison chunk hurts PageSpeed
  return;
}

export function preloadRoute(path: string) {
  if (preloadedRoutes.has(path)) return;
  
  // Check public routes first, then admin routes
  const importFn = routeImports[path] || adminRouteImports[path];
  if (importFn) {
    preloadedRoutes.add(path);
    importFn().catch(() => {
      preloadedRoutes.delete(path);
    });
  }
}

export function preloadImage(src: string): Promise<void> {
  const normalizedSrc = src.split('?')[0];
  if (preloadedImages.has(normalizedSrc)) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.add(normalizedSrc);
      imageCache.set(normalizedSrc, img);
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(src => preloadImage(src)));
}

export function preloadCriticalImages(): void {
  if (typeof window === 'undefined') return;
  
  safeRequestIdleCallback(() => {
    const heroImages = document.querySelectorAll<HTMLImageElement>('img[loading="eager"]');
    const seen = new Set<string>();
    heroImages.forEach(img => {
      const src = img.src?.split('?')[0];
      if (src && !seen.has(src)) {
        seen.add(src);
        preloadImage(img.src);
      }
    });
  }, 1000);
}

export function preloadBlogImages(imageUrls: string[]): void {
  if (typeof window === 'undefined') return;
  
  safeRequestIdleCallback(() => {
    imageUrls.forEach(url => preloadImage(url));
  }, 2000);
}

export function getOptimizedImageUrl(src: string, width?: number, quality: number = 75): string {
  if (src.includes('unsplash.com')) {
    const baseUrl = src.split('?')[0];
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    params.set('q', quality.toString());
    params.set('auto', 'format');
    params.set('fit', 'crop');
    return `${baseUrl}?${params.toString()}`;
  }
  return src;
}

export function generateImageSrcSet(src: string, sizes: number[] = [640, 768, 1024, 1280, 1920]): string {
  if (src.includes('unsplash.com')) {
    return sizes.map(size => `${src.split('?')[0]}?w=${size}&q=75&auto=format ${size}w`).join(', ');
  }
  return '';
}

export function initializeImagePreconnects(): void {
  if (typeof document === 'undefined') return;
  
  const preconnectOrigins = [
    'https://images.unsplash.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];
  
  preconnectOrigins.forEach(origin => {
    if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
  
  const dnsPrefetchOrigins = [
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ];
  
  dnsPrefetchOrigins.forEach(origin => {
    if (document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = origin;
    document.head.appendChild(link);
  });
}
