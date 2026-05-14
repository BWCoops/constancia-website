import {
  onCLS,
  onFCP,
  onLCP,
  onTTFB,
  onINP,
  type Metric,
} from 'web-vitals';

const ANALYTICS_ENDPOINT = '/api/track/web-vitals';
let sessionId: string | null = null;
let visitorId: string | null = null;

/**
 * Generate a unique identifier
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get or create a session ID
 */
function getSessionId(): string {
  if (!sessionId) {
    const stored = sessionStorage.getItem('webvitals_session_id');
    if (stored) {
      sessionId = stored;
    } else {
      sessionId = generateId();
      sessionStorage.setItem('webvitals_session_id', sessionId);
    }
  }
  return sessionId;
}

/**
 * Get or create a visitor ID
 */
function getVisitorId(): string {
  if (!visitorId) {
    const stored = localStorage.getItem('webvitals_visitor_id');
    if (stored) {
      visitorId = stored;
    } else {
      visitorId = generateId();
      localStorage.setItem('webvitals_visitor_id', visitorId);
    }
  }
  return visitorId;
}

/**
 * Get device type based on screen width
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get browser name from user agent
 */
function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('MSIE') || ua.includes('Trident')) return 'IE';
  return 'Other';
}

/**
 * Get operating system from user agent
 */
function getOperatingSystem(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('CrOS')) return 'ChromeOS';
  return 'Unknown';
}

/**
 * Get screen resolution
 */
function getScreenResolution(): string {
  return `${window.innerWidth}x${window.innerHeight}`;
}

/**
 * Determine if the metric is good, needs improvement, or poor
 * Based on Web Vitals thresholds
 */
function getRating(
  metricName: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  switch (metricName) {
    case 'LCP': // Largest Contentful Paint
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'needs-improvement';
      return 'poor';
    case 'FID': // First Input Delay
      if (value <= 100) return 'good';
      if (value <= 300) return 'needs-improvement';
      return 'poor';
    case 'CLS': // Cumulative Layout Shift
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    case 'TTFB': // Time to First Byte
      if (value <= 800) return 'good';
      if (value <= 1800) return 'needs-improvement';
      return 'poor';
    case 'INP': // Interaction to Next Paint
      if (value <= 200) return 'good';
      if (value <= 500) return 'needs-improvement';
      return 'poor';
    case 'FCP': // First Contentful Paint
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';
    default:
      return 'needs-improvement';
  }
}

/**
 * Send metric data to analytics endpoint
 */
async function sendMetric(
  metric: Metric,
  isDevelopment: boolean = false
): Promise<void> {
  try {
    const payload = {
      name: metric.name,
      value: metric.value,
      rating: getRating(metric.name, metric.value),
      delta: metric.delta,
      id: metric.id,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      page: window.location.pathname,
      url: window.location.href,
      deviceType: getDeviceType(),
      browser: getBrowser(),
      operatingSystem: getOperatingSystem(),
      screenResolution: getScreenResolution(),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      navigationType: (performance.navigation as any)?.type || 'navigate',
    };

    if (isDevelopment) {
      console.log('[WebVitals]', metric.name, {
        value: metric.value.toFixed(2),
        rating: payload.rating,
      });
    }

    if (!isDevelopment || (isDevelopment && import.meta.env.VITE_SEND_VITALS_DEV === 'true')) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const sent = navigator.sendBeacon?.(ANALYTICS_ENDPOINT, blob);
      if (!sent) {
        fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch((error) => {
          console.debug('[WebVitals] Failed to send metric:', error);
        });
      }
    }

    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', `core_web_vital_${metric.name.toLowerCase()}`, {
        value: Math.round(metric.value),
        event_category: 'web_vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    }
  } catch (error) {
    console.debug('[WebVitals] Error processing metric:', error);
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once in your app initialization (e.g., in main.tsx)
 */
export function initializeWebVitals(isDevelopment: boolean = false): void {
  // Only initialize once
  if ((window as any).__webVitalsInitialized) {
    return;
  }
  (window as any).__webVitalsInitialized = true;

  // Track all Core Web Vitals (web-vitals v4 uses on* prefix)
  // Note: FID was deprecated in web-vitals v4 and replaced by INP (Interaction to Next Paint)
  // INP is the official responsiveness metric as of March 2024
  onLCP((metric: Metric) => sendMetric(metric, isDevelopment));  // Largest Contentful Paint
  onCLS((metric: Metric) => sendMetric(metric, isDevelopment));  // Cumulative Layout Shift
  onTTFB((metric: Metric) => sendMetric(metric, isDevelopment)); // Time to First Byte
  onINP((metric: Metric) => sendMetric(metric, isDevelopment));  // Interaction to Next Paint (replaces FID)
  onFCP((metric: Metric) => sendMetric(metric, isDevelopment));  // First Contentful Paint

  if (!isDevelopment) {
    console.log('[WebVitals] Performance monitoring initialized');
  }
}

/**
 * Get session analytics data (for use in other parts of the app)
 */
export function getWebVitalsSession(): { sessionId: string; visitorId: string } {
  return {
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
  };
}

/**
 * Reset session (useful for testing)
 */
export function resetWebVitalsSession(): void {
  sessionId = null;
  visitorId = null;
  sessionStorage.removeItem('webvitals_session_id');
  localStorage.removeItem('webvitals_visitor_id');
}

/**
 * Get device and environment information
 */
export interface WebVitalsEnvironment {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  operatingSystem: string;
  screenResolution: string;
}

export function getWebVitalsEnvironment(): WebVitalsEnvironment {
  return {
    deviceType: getDeviceType(),
    browser: getBrowser(),
    operatingSystem: getOperatingSystem(),
    screenResolution: getScreenResolution(),
  };
}

declare global {
  interface Window {
    __webVitalsInitialized?: boolean;
  }
}
