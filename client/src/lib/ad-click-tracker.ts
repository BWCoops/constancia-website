let hasMouseMovement = false;
let hasScrolled = false;
let hasClicked = false;
let hasFormInteraction = false;
let trackingSent = false;

function getUrlParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function shouldTrack(): boolean {
  const params = getUrlParams();
  const gclid = params.get('gclid');
  const utmSource = params.get('utm_source');
  return !!(gclid || utmSource === 'google');
}

function setupEventListeners(): void {
  document.addEventListener('mousemove', () => {
    hasMouseMovement = true;
  }, { passive: true, once: true });

  document.addEventListener('scroll', () => {
    hasScrolled = true;
  }, { passive: true, once: true });

  document.addEventListener('click', () => {
    hasClicked = true;
  }, { passive: true, once: true });

  document.addEventListener('focus', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      hasFormInteraction = true;
    }
  }, { capture: true, passive: true, once: true });
}

async function sendTrackingData(sessionDuration: number): Promise<void> {
  if (trackingSent) return;
  trackingSent = true;

  const params = getUrlParams();

  const payload = {
    landingPage: window.location.pathname,
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmContent: params.get('utm_content'),
    utmTerm: params.get('utm_term'),
    gclid: params.get('gclid'),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sessionDuration,
    hasMouseMovement,
    hasScrolled,
    hasClicked,
    hasFormInteraction,
  };

  try {
    await fetch('/api/track/ad-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Failed to send ad click tracking data:', error);
  }
}

export function initAdClickTracker(): void {
  if (typeof window === 'undefined') return;
  if (!shouldTrack()) return;

  const startTime = Date.now();
  setupEventListeners();

  setTimeout(() => {
    const sessionDuration = Date.now() - startTime;
    sendTrackingData(sessionDuration);
  }, 5000);

  window.addEventListener('beforeunload', () => {
    if (!trackingSent) {
      const sessionDuration = Date.now() - startTime;
      navigator.sendBeacon('/api/track/ad-click', JSON.stringify({
        landingPage: window.location.pathname,
        utmSource: getUrlParams().get('utm_source'),
        utmMedium: getUrlParams().get('utm_medium'),
        utmCampaign: getUrlParams().get('utm_campaign'),
        utmContent: getUrlParams().get('utm_content'),
        utmTerm: getUrlParams().get('utm_term'),
        gclid: getUrlParams().get('gclid'),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sessionDuration,
        hasMouseMovement,
        hasScrolled,
        hasClicked,
        hasFormInteraction,
      }));
    }
  });
}
