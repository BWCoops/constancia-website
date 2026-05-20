import { ANALYTICS_EVENTS } from "@shared/analytics-taxonomy";

const ANALYTICS_ENDPOINT = "/api/analytics/page-event";

let sessionId: string | null = null;
let visitorId: string | null = null;
let pageLoadTime: number | null = null;
let scrollDepthTracked: Set<number> = new Set();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getSessionId(): string {
  if (!sessionId) {
    const stored = sessionStorage.getItem("funnel_session_id");
    if (stored) {
      sessionId = stored;
    } else {
      sessionId = generateId();
      sessionStorage.setItem("funnel_session_id", sessionId);
    }
  }
  return sessionId;
}

function getVisitorId(): string {
  if (!visitorId) {
    const stored = localStorage.getItem("funnel_visitor_id");
    if (stored) {
      visitorId = stored;
    } else {
      visitorId = generateId();
      localStorage.setItem("funnel_visitor_id", visitorId);
    }
  }
  return visitorId;
}

function getDeviceType(): string {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("MSIE") || ua.includes("Trident")) return "IE";
  return "Other";
}

function getUTMParams(): Record<string, string | undefined> {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    utmContent: params.get("utm_content") || undefined,
    utmTerm: params.get("utm_term") || undefined,
  };
}

function getOperatingSystem(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("CrOS")) return "ChromeOS";
  return "Unknown";
}

function getScreenResolution(): string {
  return `${window.innerWidth}x${window.innerHeight}`;
}

function getReferrer(): string | undefined {
  const referrer = document.referrer;
  if (!referrer) return undefined;
  try {
    const url = new URL(referrer);
    if (url.hostname === window.location.hostname) return undefined;
    return url.hostname;
  } catch {
    return referrer;
  }
}

async function sendEvent(eventType: string, page: string, data: Record<string, unknown> = {}, keepalive = false): Promise<void> {
  try {
    const utmParams = getUTMParams();
    const payload = {
      eventType,
      page,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      referrer: getReferrer(),
      ...utmParams,
      deviceType: getDeviceType(),
      browser: getBrowser(),
      screenWidth: window.innerWidth,
      timeToEventMs: pageLoadTime ? Date.now() - pageLoadTime : undefined,
      ...data,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const sent = navigator.sendBeacon?.(ANALYTICS_ENDPOINT, blob);
    if (!sent) {
      await fetch(ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive,
      });
    }
  } catch (error) {
    console.debug("[FunnelAnalytics] Failed to send event:", error);
  }
}

export function trackPageView(page: string, metadata?: Record<string, unknown>): void {
  pageLoadTime = Date.now();
  scrollDepthTracked = new Set();
  sendEvent(ANALYTICS_EVENTS.PAGE_VIEW, page, { metadata });
}

export function trackScrollDepth(page: string, depth: number): void {
  const thresholds = [25, 50, 75, 100] as const;
  const threshold = thresholds.find(t => depth >= t && !scrollDepthTracked.has(t));
  if (!threshold) return;
  scrollDepthTracked.add(threshold);
  const eventByThreshold: Record<number, string> = {
    25: ANALYTICS_EVENTS.SCROLL_DEPTH_25,
    50: ANALYTICS_EVENTS.SCROLL_DEPTH_50,
    75: ANALYTICS_EVENTS.SCROLL_DEPTH_75,
    100: ANALYTICS_EVENTS.SCROLL_DEPTH_100,
  };
  sendEvent(eventByThreshold[threshold], page, { scrollDepth: threshold });
}

export function trackWidgetVisible(page: string): void {
  sendEvent(ANALYTICS_EVENTS.WIDGET_VISIBLE, page);
}

export function trackWidgetInteraction(page: string, action: string): void {
  sendEvent(ANALYTICS_EVENTS.WIDGET_INTERACTION, page, { metadata: { action } });
}

export function trackWidgetComplete(page: string, score?: number): void {
  sendEvent(ANALYTICS_EVENTS.WIDGET_COMPLETED, page, { currentScore: score });
}

export function trackCTAClicked(page: string, ctaType: string): void {
  sendEvent(ANALYTICS_EVENTS.CTA_CLICKED, page, { metadata: { ctaType } });
}

export function trackAssessmentPageView(assessmentId?: string): void {
  sendEvent(ANALYTICS_EVENTS.ASSESSMENT_PAGE_VIEW, "fc_assess", { assessmentId });
}

export function trackAssessmentStart(assessmentId?: string): void {
  sendEvent(ANALYTICS_EVENTS.ASSESSMENT_STARTED, "fc_assess", { assessmentId });
}

export function trackAssessmentProgress(milestone: number, questionNumber: number, assessmentId?: string): void {
  const eventByMilestone: Record<number, string> = {
    25: ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_25,
    50: ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_50,
    75: ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_75,
    100: ANALYTICS_EVENTS.ASSESSMENT_PROGRESS_100,
  };
  const eventName = eventByMilestone[milestone] ?? `assessment_progress_${milestone}`;
  sendEvent(eventName, "fc_assess", { milestone, questionNumber, assessmentId });
}

export function trackQuestionAnswered(questionNumber: number, assessmentId?: string, timeToAnswerMs?: number): void {
  sendEvent(ANALYTICS_EVENTS.QUESTION_ANSWERED, "fc_assess", {
    questionNumber,
    assessmentId,
    timeToEventMs: timeToAnswerMs,
  });
}

export function trackAssessmentComplete(assessmentId?: string, totalTimeMs?: number, finalScore?: number): void {
  sendEvent(ANALYTICS_EVENTS.ASSESSMENT_COMPLETED, "fc_assess", {
    assessmentId,
    dwellTimeMs: totalTimeMs,
    currentScore: finalScore,
  });
}

export function trackAssessmentAbandoned(questionNumber: number, assessmentId?: string): void {
  sendEvent(ANALYTICS_EVENTS.ASSESSMENT_ABANDONED, "fc_assess", {
    questionNumber,
    assessmentId,
  });
}

export function trackResultsView(assessmentId?: string, score?: number): void {
  sendEvent(ANALYTICS_EVENTS.RESULTS_VIEWED, "fc_results", { assessmentId, currentScore: score });
}

export function trackReportDownload(assessmentId?: string, format?: string): void {
  sendEvent(ANALYTICS_EVENTS.REPORT_DOWNLOADED, "fc_results", { assessmentId, metadata: { format } });
}

export function trackComparisonToolOpened(toolType: string): void {
  sendEvent(ANALYTICS_EVENTS.COMPARISON_OPENED, "comparison", { metadata: { toolType } });
}

export function trackComparisonExport(toolType: string, format: string): void {
  sendEvent(ANALYTICS_EVENTS.COMPARISON_EXPORTED, "comparison", { metadata: { toolType, format } });
}

export function trackLeadCaptured(source: string, metadata?: Record<string, unknown>): void {
  sendEvent(ANALYTICS_EVENTS.LEAD_CAPTURED, source, { metadata });
}

export function trackEmailCaptured(source: string): void {
  sendEvent(ANALYTICS_EVENTS.EMAIL_CAPTURED, source);
}

export function trackDwellTime(page: string, dwellTimeMs: number, useKeepalive = false): void {
  sendEvent(ANALYTICS_EVENTS.DWELL_TIME, page, { dwellTimeMs }, useKeepalive);
}

export function setupScrollTracking(page: string): () => void {
  let lastTrackedDepth = 0;
  let scrollTimeoutId: number | null = null;
  
  // Debounce scroll tracking to avoid forced reflows on every scroll event.
  // Cache scroll height to avoid repeated layout measurements.
  const handleScroll = () => {
    if (scrollTimeoutId !== null) return; // Ignore if already scheduled
    
    scrollTimeoutId = window.setTimeout(() => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollTop = window.scrollY;
      const depth = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 100;
      
      // Only track if depth changed by at least 5% to reduce noise
      if (Math.abs(depth - lastTrackedDepth) >= 5) {
        trackScrollDepth(page, depth);
        lastTrackedDepth = depth;
      }
      
      scrollTimeoutId = null;
    }, 200); // Fire at most every 200ms
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", handleScroll);
    if (scrollTimeoutId !== null) clearTimeout(scrollTimeoutId);
  };
}

export function setupDwellTimeTracking(page: string): () => void {
  const startTime = Date.now();
  
  const handleBeforeUnload = () => {
    const dwellTime = Date.now() - startTime;
    trackDwellTime(page, dwellTime, true);
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}

export function setupWidgetVisibilityTracking(
  elementRef: HTMLElement | null,
  page: string,
  onVisible?: () => void
): () => void {
  if (!elementRef) return () => {};
  
  let hasTracked = false;
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasTracked) {
          hasTracked = true;
          trackWidgetVisible(page);
          onVisible?.();
        }
      });
    },
    { threshold: 0.5 }
  );

  observer.observe(elementRef);
  return () => observer.disconnect();
}

export function getAnalyticsSession(): { sessionId: string; visitorId: string } {
  return {
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
  };
}

export function resetSession(): void {
  sessionId = null;
  sessionStorage.removeItem("funnel_session_id");
  scrollDepthTracked = new Set();
  pageLoadTime = null;
}

export interface AssessmentTrackingData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser?: string;
  operatingSystem?: string;
  screenResolution?: string;
}

export function getTrackingData(): AssessmentTrackingData {
  const utmParams = getUTMParams();
  const deviceType = getDeviceType();
  
  return {
    utmSource: utmParams.utmSource,
    utmMedium: utmParams.utmMedium,
    utmCampaign: utmParams.utmCampaign,
    utmContent: utmParams.utmContent,
    utmTerm: utmParams.utmTerm,
    referrer: getReferrer(),
    deviceType: (deviceType === "desktop" || deviceType === "mobile" || deviceType === "tablet") 
      ? deviceType 
      : "unknown",
    browser: getBrowser(),
    operatingSystem: getOperatingSystem(),
    screenResolution: getScreenResolution(),
  };
}
