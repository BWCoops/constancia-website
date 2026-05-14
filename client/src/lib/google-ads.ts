function isProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  const devPatterns = [
    'localhost', '127.0.0.1', '0.0.0.0',
    '.replit.dev', '.repl.co', '.replit.app',
    'webcontainer.io', '.stackblitz.io', '.codesandbox.io',
  ];
  
  return !devPatterns.some(pattern => 
    hostname === pattern || hostname.endsWith(pattern)
  );
}

export function trackConversion(conversionLabel?: string) {
  if (typeof window === 'undefined') return;
  if (!isProductionEnvironment()) return;
  
  const gtag = (window as any).gtag;
  if (!gtag) return;
  
  try {
    gtag('event', 'conversion', {
      'send_to': conversionLabel || 'AW-17757915012/Wv1XCK_Dr8YbEISP0ZNC'
    });
  } catch (e) {
    console.warn('[GoogleAds] Conversion tracking error:', e);
  }
}

export function trackContactFormSubmission() {
  trackConversion('AW-17757915012/Wv1XCK_Dr8YbEISP0ZNC');
}

export function trackResourceDownload(resourceTitle?: string) {
  if (typeof window === 'undefined') return;
  const gtag = (window as any).gtag;
  if (!gtag) return;
  
  try {
    gtag('event', 'conversion', {
      'send_to': 'AW-17757915012/Wv1XCK_Dr8YbEISP0ZNC',
      'event_category': 'Resource Download',
      'event_label': resourceTitle || 'Resource'
    });
  } catch (e) {
    console.warn('[GoogleAds] Resource download tracking error:', e);
  }
}

export function trackLeadCapture(source?: string) {
  if (typeof window === 'undefined') return;
  const gtag = (window as any).gtag;
  if (!gtag) return;
  
  try {
    gtag('event', 'conversion', {
      'send_to': 'AW-17757915012/Wv1XCK_Dr8YbEISP0ZNC',
      'event_category': 'Lead Capture',
      'event_label': source || 'General'
    });
  } catch (e) {
    console.warn('[GoogleAds] Lead capture tracking error:', e);
  }
}
