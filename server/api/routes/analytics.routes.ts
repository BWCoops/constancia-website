import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { InsertPageViewDb } from "@shared/schema";
import { z } from "zod";
import { checkRateLimit } from "../../middleware/security";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("analytics-routes");
const router = Router();

const pageViewSchema = z.object({
  sessionId: z.string(),
  visitorId: z.string().optional(),
  path: z.string(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  duration: z.number().optional(),
});

router.post("/page-view", async (req: Request, res: Response) => {
  try {
    const validationResult = pageViewSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: "Invalid page view data" });
    }

    const pageViewData = validationResult.data;
    const userAgent = req.get("user-agent") || pageViewData.userAgent || "";
    const sessionId = pageViewData.sessionId || `session-${Date.now()}`;
    const referrer = pageViewData.referrer || req.get("referer") || null;
    
    const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) 
      ? "mobile" 
      : /tablet/i.test(userAgent) 
        ? "tablet" 
        : "desktop";
    
    const browserMatch = userAgent.match(/(chrome|firefox|safari|edge|opera|msie|trident)/i);
    const browser = browserMatch ? browserMatch[1].toLowerCase() : "unknown";
    
    const osMatch = userAgent.match(/(windows|mac|linux|android|ios)/i);
    const os = osMatch ? osMatch[1].toLowerCase() : "unknown";
    
    const pageView: InsertPageViewDb = {
      sessionId,
      path: pageViewData.path,
      referrer,
      userAgent,
      duration: pageViewData.duration || 0,
      deviceType,
      browser,
      os,
    };

    await storage.createPageView(pageView);
    
    await storage.upsertVisitorSession({
      sessionId,
      visitorId: pageViewData.visitorId || sessionId,
      path: pageViewData.path,
      referrer,
      deviceType,
      browser,
      os,
      duration: pageViewData.duration || 0,
    });
    
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Page view tracking error");
    res.status(500).json({ error: "Failed to track page view" });
  }
});

function parseUserAgent(ua: string): { deviceType: string; browser: string; os: string } {
  const deviceType = /mobile|android|iphone|ipad/i.test(ua) 
    ? "mobile" 
    : /tablet/i.test(ua) 
      ? "tablet" 
      : "desktop";
  
  const browserMatch = ua.match(/(chrome|firefox|safari|edge|opera|msie|trident)/i);
  const browser = browserMatch ? browserMatch[1].toLowerCase() : "unknown";
  
  const osMatch = ua.match(/(windows|mac|linux|android|ios)/i);
  const os = osMatch ? osMatch[1].toLowerCase() : "unknown";
  
  return { deviceType, browser, os };
}

function calculateFraudScore(data: {
  userAgent: string;
  recentClicks: number;
  hasMouseMovement?: boolean;
  hasScrolled?: boolean;
  hasClicked?: boolean;
  hasFormInteraction?: boolean;
  sessionDuration?: number;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  if (!data.userAgent || data.userAgent.length < 20) {
    score += 30;
    reasons.push("suspicious_user_agent");
  }
  
  if (data.userAgent?.toLowerCase().includes("bot") || 
      data.userAgent?.toLowerCase().includes("crawler") ||
      data.userAgent?.toLowerCase().includes("spider")) {
    score += 50;
    reasons.push("bot_user_agent");
  }
  
  if (data.recentClicks > 5) {
    score += 20;
    reasons.push("high_click_frequency");
  }
  
  if (data.hasMouseMovement === false && data.hasScrolled === false && data.hasClicked === false) {
    score += 25;
    reasons.push("no_interaction");
  }
  
  if (data.sessionDuration && data.sessionDuration < 2) {
    score += 15;
    reasons.push("short_session");
  }
  
  return { score: Math.min(score, 100), reasons };
}

router.post("/ad-click", async (req: Request, res: Response) => {
  try {
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
    } = req.body;

    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.get("user-agent") || "";
    
    const geoHeaders = {
      country: req.get("cf-ipcountry") || req.get("x-vercel-ip-country") || null,
      city: req.get("cf-ipcity") || null,
      region: req.get("cf-region") || null,
    };
    const { country, city, region } = geoHeaders;

    const { allowed } = await checkRateLimit(clientIp, 'ad_click');
    const recentClicks = allowed ? 0 : 10;

    const { score, reasons } = calculateFraudScore({
      userAgent,
      recentClicks,
      sessionDuration,
    });

    const { deviceType, browser, os } = parseUserAgent(userAgent);

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

    res.json({ success: true });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error tracking ad click");
    res.status(500).json({ success: false, error: 'Failed to track click' });
  }
});

const webVitalsSchema = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  delta: z.number().optional(),
  id: z.string().optional(),
  navigationType: z.union([z.string(), z.number()]).optional(),
  sessionId: z.string(),
  visitorId: z.string(),
  page: z.string(),
  url: z.string().optional(),
  deviceType: z.string(),
  browser: z.string(),
  operatingSystem: z.string(),
  screenResolution: z.string().optional(),
  screenWidth: z.number().optional(),
  screenHeight: z.number().optional(),
  userAgent: z.string().optional(),
  timestamp: z.string(),
});

router.post("/web-vitals", async (req: Request, res: Response) => {
  try {
    const validationResult = webVitalsSchema.safeParse(req.body);
    if (!validationResult.success) {
      log.warn({ errors: validationResult.error.errors }, "WebVitals validation failed");
      return res.status(400).json({ error: "Invalid web vitals data" });
    }

    const data = validationResult.data;
    
    log.info({ metric: data.name, value: data.value, rating: data.rating, deviceType: data.deviceType, page: data.page }, "WebVitals metric received");

    res.json({ success: true });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error tracking web vitals");
    res.status(500).json({ success: false, error: 'Failed to track web vitals' });
  }
});

export default router;
