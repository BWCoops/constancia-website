import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

interface GoogleAnalyticsProps {
  measurementId?: string;
}

function isProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  
  // Only enable analytics on the production domain
  return hostname === '1qg.com' || hostname === 'www.1qg.com';
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const gaId = measurementId || import.meta.env.VITE_GA4_ID;

  useEffect(() => {
    if (!gaId) return;
    
    if (!isProductionEnvironment()) {
      console.log('[GoogleAnalytics] Skipping analytics in development environment');
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
    
    gtag("js", new Date());
    gtag("config", gaId, {
      page_title: document.title,
      page_location: window.location.href,
    });

    return () => {
      const existingScript = document.querySelector(`script[src*="${gaId}"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [gaId]);

  return null;
}

export function trackEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && window.gtag && isProductionEnvironment()) {
    window.gtag("event", eventName, eventParams);
  }
}

export function trackPageView(
  pageTitle: string,
  pageLocation: string
) {
  if (typeof window !== "undefined" && window.gtag && isProductionEnvironment()) {
    window.gtag("event", "page_view", {
      page_title: pageTitle,
      page_location: pageLocation,
    });
  }
}

export function trackGoogleAdsConversion() {
  if (typeof window !== "undefined" && window.gtag && isProductionEnvironment()) {
    window.gtag("event", "conversion", {
      send_to: "AW-17757915012/Wv1XCK_Dr8YbEISP0ZNC"
    });
  }
}

export { isProductionEnvironment };
