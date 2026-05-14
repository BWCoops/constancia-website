/**
 * Analytics/Tracking API Handlers
 * 
 * Thin HTTP handlers for tracking page views and ad clicks.
 * Uses DI context pattern with repository abstraction where available.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { buildPublicApiContext } from '../context';
import { asyncHandler, sendSuccess, sendError, getClientIp, getUserAgent } from '../utils';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger('analytics-handlers');

const pageViewSchema = z.object({
  sessionId: z.string(),
  visitorId: z.string().optional(),
  path: z.string(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  duration: z.number().optional(),
});

const adClickSchema = z.object({
  landingPage: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  gclid: z.string().optional(),
  screenResolution: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  sessionDuration: z.number().optional(),
  hasMouseMovement: z.boolean().optional(),
  hasScrolled: z.boolean().optional(),
  hasClicked: z.boolean().optional(),
  hasFormInteraction: z.boolean().optional(),
});

/**
 * Bot Detection Helper
 * 
 * Detects if a user agent string belongs to a bot/crawler.
 * Used to filter bot traffic from analytics metrics.
 */
export function detectBot(ua: string): boolean {
  if (!ua || ua.length < 10) return true;
  
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /headless/i, /phantom/i, /selenium/i, /puppeteer/i, /playwright/i,
    /googlebot/i, /bingbot/i, /yandexbot/i, /baiduspider/i,
    /duckduckbot/i, /slurp/i, /facebookexternalhit/i, /twitterbot/i,
    /linkedinbot/i, /whatsapp/i, /telegrambot/i, /discordbot/i,
    /applebot/i, /gptbot/i, /claudebot/i, /claude-web/i, /perplexitybot/i,
    /ccbot/i, /cohere-ai/i, /youbot/i, /google-extended/i,
    /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i, /petalbot/i,
    /bytespider/i, /amazonbot/i, /sogou/i, /exabot/i,
    /ia_archiver/i, /archive\.org_bot/i, /wget/i, /curl/i, /httpie/i,
    /python-requests/i, /python-urllib/i, /java\//i, /axios/i, /node-fetch/i,
    /go-http-client/i, /okhttp/i, /libwww/i, /lwp-/i,
    /pingdom/i, /uptimerobot/i, /statuscake/i, /site24x7/i, /newrelic/i,
    /datadog/i, /gtmetrix/i, /pagespeed/i, /lighthouse/i,
  ];
  
  return botPatterns.some(pattern => pattern.test(ua));
}

/**
 * User Agent Parsing Helper
 * 
 * Parses user agent string to extract device type, browser, and OS.
 * Consolidates all UA parsing logic into a single reusable function.
 */
export function parseUserAgent(ua: string): { deviceType: string; browser: string; os: string } {
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
  const isTablet = /tablet|ipad/i.test(ua);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  let browser = 'unknown';
  if (/edge/i.test(ua)) browser = 'edge';
  else if (/chrome/i.test(ua)) browser = 'chrome';
  else if (/safari/i.test(ua)) browser = 'safari';
  else if (/firefox/i.test(ua)) browser = 'firefox';
  else if (/msie|trident/i.test(ua)) browser = 'ie';

  let os = 'unknown';
  if (/windows/i.test(ua)) os = 'windows';
  else if (/mac/i.test(ua)) os = 'macos';
  else if (/linux/i.test(ua)) os = 'linux';
  else if (/android/i.test(ua)) os = 'android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'ios';

  return { deviceType, browser, os };
}

// TODO: Extract fraud scoring logic to a dedicated FraudDetectionService in server/core/analytics/services/
// The service should handle:
// - Suspicious score calculation based on behavioral signals
// - IP reputation checking
// - Bot detection patterns
// - Rate limiting integration
function calculateSuspiciousScore(data: {
  hasMouseMovement?: boolean;
  hasScrolled?: boolean;
  hasClicked?: boolean;
  userAgent: string;
  country: string;
  recentClicks: number;
  sessionDuration?: number;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (!data.hasMouseMovement) {
    score += 20;
    reasons.push('No mouse movement detected');
  }
  if (!data.hasScrolled) {
    score += 15;
    reasons.push('No scroll activity');
  }
  if (!data.hasClicked) {
    score += 10;
    reasons.push('No click activity on page');
  }

  const suspiciousUAPatterns = [
    /bot/i, /crawler/i, /spider/i, /headless/i,
    /phantom/i, /selenium/i, /puppeteer/i
  ];
  if (suspiciousUAPatterns.some(pattern => pattern.test(data.userAgent))) {
    score += 40;
    reasons.push('Bot-like user agent detected');
  }

  if (!data.userAgent || data.userAgent.length < 10) {
    score += 25;
    reasons.push('Missing or minimal user agent');
  }

  if (data.recentClicks > 5) {
    score += Math.min(30, data.recentClicks * 5);
    reasons.push(`High click frequency: ${data.recentClicks} clicks in 10 minutes`);
  }

  if (data.sessionDuration !== undefined && data.sessionDuration < 3) {
    score += 15;
    reasons.push('Very short session duration');
  }

  return { score: Math.min(100, score), reasons };
}

/**
 * POST /api/track/page-view
 * Tracks a page view with session and device information
 */
export const trackPageView = asyncHandler(async (req: Request, res: Response) => {
  const ctx = buildPublicApiContext(req);
  
  const validationResult = pageViewSchema.safeParse(req.body);
  if (!validationResult.success) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid page view data', 400);
  }

  const pageViewData = validationResult.data;
  const userAgent = getUserAgent(req) || pageViewData.userAgent || '';
  const sessionId = pageViewData.sessionId || `session-${Date.now()}`;
  const referrer = pageViewData.referrer || req.get('referer') || null;

  const { deviceType, browser, os } = parseUserAgent(userAgent);
  const isBot = detectBot(userAgent);

  await ctx.analytics.pageViewRepo.record({
    sessionId,
    path: pageViewData.path,
    referrer: referrer ?? undefined,
    userAgent,
    duration: pageViewData.duration || 0,
    deviceType,
    browser,
    os,
    isBot,
  });

  // Session upsert uses storage directly as the repository is not fully implemented
  // TODO: Once SessionRepository.record() returns the session, migrate this call
  await storage.upsertVisitorSession({
    sessionId,
    visitorId: pageViewData.visitorId || sessionId,
    path: pageViewData.path,
    referrer,
    deviceType,
    browser,
    os,
    duration: pageViewData.duration || 0,
    isBot,
  });

  return sendSuccess(res, { tracked: true });
});

/**
 * POST /api/track/ad-click
 * Tracks ad clicks with fraud detection scoring
 * 
 * Note: Ad click tracking uses storage directly as there is no repository abstraction yet.
 * TODO: Create IAdClickRepository interface and implementation when refactoring to full DI
 */
export const trackAdClick = asyncHandler(async (req: Request, res: Response) => {
  const ctx = buildPublicApiContext(req);
  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);

  const validationResult = adClickSchema.safeParse(req.body);
  if (!validationResult.success) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid ad click data', 400);
  }

  const {
    landingPage,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    gclid,
    screenResolution,
    language,
    timezone,
    sessionDuration,
    hasMouseMovement,
    hasScrolled,
    hasClicked,
    hasFormInteraction,
  } = validationResult.data;

  let country = '';
  let city = '';
  let region = '';

  try {
    const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city,regionName`);
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (geoData.status === 'success') {
        country = geoData.country || '';
        city = geoData.city || '';
        region = geoData.regionName || '';
      }
    }
  } catch (geoError) {
    log.error({ err: geoError instanceof Error ? geoError : new Error(String(geoError)) }, 'IP geolocation lookup failed');
  }

  // TODO: Move to IAdClickRepository.getRecentClicksByIP() when repository is implemented
  const recentClicks = await storage.getRecentClicksByIP(clientIp, 10);

  const { score, reasons } = calculateSuspiciousScore({
    hasMouseMovement,
    hasScrolled,
    hasClicked,
    userAgent,
    country,
    recentClicks,
    sessionDuration,
  });

  const { deviceType, browser, os } = parseUserAgent(userAgent);

  // TODO: Move to IAdClickRepository.record() when repository is implemented
  await storage.logAdClick({
    ipAddress: clientIp,
    country: country || null,
    city: city || null,
    region: region || null,
    userAgent: userAgent || null,
    referrer: req.headers.referer || null,
    landingPage: landingPage || null,
    utmSource: utmSource || null,
    utmMedium: utmMedium || null,
    utmCampaign: utmCampaign || null,
    utmContent: utmContent || null,
    utmTerm: utmTerm || null,
    gclid: gclid || null,
    deviceType,
    browser,
    os,
    screenResolution: screenResolution || null,
    language: language || null,
    timezone: timezone || null,
    sessionDuration: sessionDuration || null,
    pageViews: 1,
    hasMouseMovement: hasMouseMovement ?? null,
    hasScrolled: hasScrolled ?? null,
    hasClicked: hasClicked ?? null,
    hasFormInteraction: hasFormInteraction ?? null,
    suspiciousScore: score,
    flaggedReasons: reasons.length > 0 ? reasons : null,
    isBlocked: false,
  });

  return sendSuccess(res, { tracked: true });
});
