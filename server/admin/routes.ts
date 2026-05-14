import { Router, Request, Response } from "express";
import { createChildLogger } from "../lib/logger";
import { db } from "../db";
import { 
  blogPosts,
  blogCategories,
  resourceFiles, 
  resourceLeads, 
  resourceDownloads,
  winstonAiScans,
  adminUsers,
  pageViews,
  visitorSessions,
  marketingAssets,
  insertMarketingAssetDbSchema,
  auditLogs,
  contactSubmissions,
  fcAiSystemPrompts,
  fcAiGuardrails,
  fcAiGroundingRules,
  fcAiKnowledgeBase,
  fcAiFollowupTemplates,
  insertFcAiSystemPromptSchema,
  insertFcAiGuardrailSchema,
  insertFcAiGroundingRuleSchema,
  insertFcAiKnowledgeBaseSchema,
  insertFcAiFollowupTemplateSchema,
  adClickLogs,
} from "@shared/schema";
import { eq, desc, count, gte, sql, and, inArray } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../replitAuth";
import { scanBlogPost, getAllScans, getScanHistory } from "../services/winston-ai";
import { 
  runScheduledScan, 
  getSchedulerStatus, 
  configureScheduler, 
  getScheduledScans,
  cancelCurrentScan 
} from "../services/scan-scheduler";
import { runComprehensiveWeeklyScan } from "../services/weekly-scan-service";
import * as AdminSecurity from "../services/admin-security";
import { logAuditEvent, createActorFromRequest } from "../services/audit-logger";
import { 
  getRetentionConfig, 
  processErasureRequest, 
  runRetentionCleanup,
  findUserData,
  exportUserData
} from "../services/gdpr-compliance";
import { encryptField, hashForLookup, safeDecrypt } from "../services/encryption";
import { getSystemHealth, getRequestLogs, getRequestStats } from "../services/operations";
import { generateSitemapWithTracking, generateRobotsTxt, getSeoStatus, getRobotsConfig, setRobotsConfig } from "../services/seo";

const log = createChildLogger("admin-routes");

const router = Router();

const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for polling endpoints that refresh frequently
    return req.path === "/blog/generate" && req.method === "GET";
  },
});

router.use(adminRateLimit);

function getAdminId(req: any): string {
  return req.user?.claims?.sub || "unknown";
}

async function auditLog(
  adminId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: string,
  req?: Request
): Promise<void> {
  try {
    const actionMap: Record<string, string> = {
      "DASHBOARD_STATS_VIEWED": "READ",
      "RECENT_LEADS_VIEWED": "READ",
      "BLOG_POSTS_VIEWED": "READ",
      "BLOG_POST_VIEWED": "READ",
      "BLOG_POST_CREATED": "CREATE",
      "BLOG_POST_UPDATED": "UPDATE",
      "BLOG_POST_PUBLISHED": "UPDATE",
      "BLOG_POST_HIDDEN": "UPDATE",
      "BLOG_POST_DELETED": "DELETE",
      "BLOG_POST_SCANNED": "READ",
      "RESOURCES_VIEWED": "READ",
      "RESOURCE_CREATED": "CREATE",
      "RESOURCE_UPDATED": "UPDATE",
      "RESOURCE_DELETED": "DELETE",
      "LEADS_VIEWED": "READ",
      "LEADS_EXPORTED": "EXPORT",
      "LEAD_VIEWED": "READ",
      "LEAD_UPDATED": "UPDATE",
      "LEAD_VERIFIED": "UPDATE",
      "LEAD_UNVERIFIED": "UPDATE",
      "LEAD_DELETED": "DELETE",
      "DOWNLOADS_VIEWED": "READ",
      "DOWNLOAD_STATS_VIEWED": "READ",
      "DOWNLOAD_COUNTS_RESET": "UPDATE",
      "DOWNLOAD_HISTORY_CLEARED": "DELETE",
      "DOWNLOADS_EXPORTED": "EXPORT",
      "DOWNLOADS_SUMMARY_VIEWED": "READ",
      "DOWNLOADS_BY_RESOURCE_VIEWED": "READ",
      "DOWNLOADS_HISTORY_VIEWED": "READ",
      "SCANS_VIEWED": "READ",
      "CONTENT_SCANNED": "READ",
      "ANALYTICS_VIEWED": "READ",
      "BULK_SCAN_TRIGGERED": "CREATE",
      "COMPREHENSIVE_WEEKLY_SCAN_TRIGGERED": "CREATE",
      "SCHEDULER_CONFIGURED": "CONFIG_CHANGE",
      "SCAN_CANCELLED": "UPDATE",
      "AUDIT_LOGS_VIEWED": "READ",
      "MFA_SETUP_INITIATED": "UPDATE",
      "MFA_ENABLED": "UPDATE",
      "MFA_DISABLED": "UPDATE",
      "BACKUP_CODES_GENERATED": "CREATE",
      "MFA_BACKUP_CODES_REGENERATED": "CREATE",
      "SECURITY_SETTINGS_UPDATED": "CONFIG_CHANGE",
      "IP_ADDED_ALLOWLIST": "CONFIG_CHANGE",
      "IP_REMOVED_ALLOWLIST": "CONFIG_CHANGE",
      "EMAIL_ADDED_WHITELIST": "CONFIG_CHANGE",
      "EMAIL_REMOVED_WHITELIST": "CONFIG_CHANGE",
      "BYPASS_CODE_CREATED": "CREATE",
      "BYPASS_CODE_REVOKED": "DELETE",
      "CREATE_MARKETING_ASSET": "CREATE",
      "UPDATE_MARKETING_ASSET": "UPDATE",
      "DELETE_MARKETING_ASSET": "DELETE",
      "TOGGLE_FEATURED_MARKETING_ASSET": "UPDATE",
      "TEST_EMAIL_SENT": "CREATE",
      "GDPR_RETENTION_CONFIG_VIEWED": "READ",
      "GDPR_ERASURE_PROCESSED": "DELETE",
      "GDPR_CLEANUP_EXECUTED": "DELETE",
      "GDPR_USER_DATA_ACCESSED": "READ",
      "GDPR_DATA_EXPORTED": "EXPORT",
    };

    const resourceTypeMap: Record<string, string> = {
      "dashboard": "config",
      "blog_posts": "blog_post",
      "blog_post": "blog_post",
      "resources": "resource_file",
      "resource": "resource_file",
      "leads": "lead",
      "lead": "lead",
      "downloads": "resource_file",
      "scans": "security_event",
      "analytics": "config",
      "scheduled_scans": "security_event",
      "audit_logs": "security_event",
      "mfa": "admin_user",
      "marketing_asset": "marketing_asset",
      "email": "contact_submission",
      "gdpr": "gdpr_request",
    };

    const mappedAction = actionMap[action] || "READ";
    const mappedResourceType = entityType ? (resourceTypeMap[entityType] || "config") : "config";

    await logAuditEvent(
      { id: adminId, email: "admin@system" },
      mappedAction as any,
      mappedResourceType as any,
      entityId || null,
      null,
      null,
      req as any,
      details ? { legacyDetails: details, originalAction: action } : { originalAction: action }
    );
  } catch (error) {
    log.error({ err: error }, "Failed to log audit action");
  }
}

async function getAdminIdFromDb(req: any): Promise<string> {
  const replitId = req.user?.claims?.sub;
  if (!replitId) throw new Error("No user in session");
  
  const [admin] = await db.select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.replitId, replitId))
    .limit(1);
  
  if (!admin) throw new Error("Admin user not found");
  return admin.id;
}

router.get("/auth/session", (req: any, res: Response) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.json({ authenticated: false });
    return;
  }
  
  const user = req.user;
  const claims = user?.claims;
  
  // Check token expiration (consistent with isAuthenticated middleware)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = user?.expires_at;
  
  // If token is expired and we can't refresh, mark as unauthenticated
  if (expiresAt && now > expiresAt && !user?.refresh_token) {
    res.json({ 
      authenticated: false,
      reason: "session_expired",
      message: "Your session has expired. Please log in again."
    });
    return;
  }
  
  res.json({
    authenticated: true,
    user: {
      id: claims?.sub,
      email: claims?.email,
      displayName: [claims?.first_name, claims?.last_name].filter(Boolean).join(" ") || claims?.email,
      profileImageUrl: claims?.profile_image_url,
    },
  });
});

router.use(isAuthenticated);

// Dashboard Stats
router.get("/dashboard/stats", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalPosts,
      publishedPosts,
      totalResources,
      totalLeads,
      verifiedLeads,
      recentDownloads,
      totalScans,
      totalPageViews,
      totalSessions
    ] = await Promise.all([
      db.select({ count: count() }).from(blogPosts),
      db.select({ count: count() }).from(blogPosts).where(eq(blogPosts.isPublished, true)),
      db.select({ count: count() }).from(resourceFiles),
      db.select({ count: count() }).from(resourceLeads),
      db.select({ count: count() }).from(resourceLeads).where(eq(resourceLeads.verified, true)),
      db.select({ count: count() }).from(resourceDownloads)
        .where(gte(resourceDownloads.downloadedAt, thirtyDaysAgo)),
      db.select({ count: count() }).from(winstonAiScans),
      db.select({ count: count() }).from(pageViews)
        .where(gte(pageViews.createdAt, thirtyDaysAgo)),
      db.select({ count: count() }).from(visitorSessions)
        .where(gte(visitorSessions.startedAt, thirtyDaysAgo)),
    ]);

    await auditLog(adminId, "DASHBOARD_STATS_VIEWED", "dashboard", undefined, undefined, req);

    res.json({
      blogPosts: totalPosts[0]?.count || 0,
      publishedPosts: publishedPosts[0]?.count || 0,
      resources: totalResources[0]?.count || 0,
      totalLeads: totalLeads[0]?.count || 0,
      verifiedLeads: verifiedLeads[0]?.count || 0,
      recentDownloads: recentDownloads[0]?.count || 0,
      totalScans: totalScans[0]?.count || 0,
      pageViews30d: totalPageViews[0]?.count || 0,
      sessions30d: totalSessions[0]?.count || 0,
    });
  } catch (error: any) {
    log.error({ err: error }, "Dashboard stats error");
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

router.get("/dashboard/recent-leads", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const rawLeads = await db.select({
      id: resourceLeads.id,
      firstName: resourceLeads.firstName,
      lastName: resourceLeads.lastName,
      email: resourceLeads.email,
      company: resourceLeads.company,
      jobTitle: resourceLeads.jobTitle,
      verified: resourceLeads.verified,
      createdAt: resourceLeads.createdAt,
    })
    .from(resourceLeads)
    .orderBy(desc(resourceLeads.createdAt))
    .limit(10);

    // Decrypt PII fields
    const leads = rawLeads.map(lead => ({
      ...lead,
      firstName: safeDecrypt(lead.firstName),
      lastName: safeDecrypt(lead.lastName),
      email: safeDecrypt(lead.email),
    }));

    await auditLog(adminId, "RECENT_LEADS_VIEWED", "leads", undefined, undefined, req);

    res.json(leads);
  } catch (error: any) {
    log.error({ err: error }, "Recent leads error");
    res.status(500).json({ error: "Failed to fetch recent leads" });
  }
});

router.get("/scans/recent", async (req: Request, res: Response) => {
  try {
    // Get all recent scans grouped by content
    const allScans = await db.select({
      blogPostId: winstonAiScans.blogPostId,
      resourceId: winstonAiScans.resourceId,
      aiScore: winstonAiScans.aiScore,
      humanScore: winstonAiScans.humanScore,
      plagiarismScore: winstonAiScans.plagiarismScore,
      seoScore: winstonAiScans.seoScore,
      contentType: winstonAiScans.contentType,
      completedAt: winstonAiScans.completedAt,
    })
    .from(winstonAiScans)
    .orderBy(desc(winstonAiScans.completedAt))
    .limit(100);

    // Aggregate scans by content with averages
    const aggregated = new Map<string, any>();
    
    allScans.forEach(scan => {
      const key = scan.blogPostId ? `blog-${scan.blogPostId}` : `resource-${scan.resourceId}`;
      
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          blogPostId: scan.blogPostId,
          resourceId: scan.resourceId,
          contentType: scan.contentType,
          aiScores: scan.aiScore !== null ? [scan.aiScore] : [],
          humanScores: scan.humanScore !== null ? [scan.humanScore] : [],
          plagiarismScores: scan.plagiarismScore !== null ? [scan.plagiarismScore] : [],
          seoScores: scan.seoScore !== null ? [scan.seoScore] : [],
          completedAt: scan.completedAt,
          lastCompletedAt: scan.completedAt,
        });
      } else {
        // Accumulate scores for averaging
        const existing = aggregated.get(key);
        if (scan.aiScore !== null) existing.aiScores.push(scan.aiScore);
        if (scan.humanScore !== null) existing.humanScores.push(scan.humanScore);
        if (scan.plagiarismScore !== null) existing.plagiarismScores.push(scan.plagiarismScore);
        if (scan.seoScore !== null) existing.seoScores.push(scan.seoScore);
        existing.lastCompletedAt = scan.completedAt;
      }
    });

    // Calculate averages and sort
    const topScans = Array.from(aggregated.values())
      .map(entry => ({
        blogPostId: entry.blogPostId,
        resourceId: entry.resourceId,
        contentType: entry.contentType,
        aiScore: entry.aiScores.length > 0 ? Math.round(entry.aiScores.reduce((a: number, b: number) => a + b, 0) / entry.aiScores.length) : 0,
        plagiarismScore: entry.plagiarismScores.length > 0 ? Math.round(entry.plagiarismScores.reduce((a: number, b: number) => a + b, 0) / entry.plagiarismScores.length) : 0,
        seoScore: entry.seoScores.length > 0 ? Math.round(entry.seoScores.reduce((a: number, b: number) => a + b, 0) / entry.seoScores.length) : 0,
        completedAt: entry.lastCompletedAt,
      }))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5);

    // Get titles
    const scansWithTitles = await Promise.all(topScans.map(async (scan) => {
      let title = "Unknown";
      if (scan.blogPostId) {
        const [blog] = await db.select({ title: blogPosts.title })
          .from(blogPosts)
          .where(eq(blogPosts.id, scan.blogPostId))
          .limit(1);
        title = blog?.title || "Unknown Blog";
      } else if (scan.resourceId) {
        const [resource] = await db.select({ title: resourceFiles.title })
          .from(resourceFiles)
          .where(eq(resourceFiles.id, scan.resourceId))
          .limit(1);
        title = resource?.title || "Unknown Resource";
      }
      return { ...scan, title };
    }));

    res.json(scansWithTitles);
  } catch (error: any) {
    log.error({ err: error }, "Get recent scans error");
    res.status(500).json({ error: "Failed to fetch recent scans" });
  }
});

// ============ BLOG POSTS CRUD ============

router.get("/blog-posts", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { includeHidden = "true" } = req.query;
    
    let query = db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      categoryId: blogPosts.categoryId,
      author: blogPosts.author,
      publishedAt: blogPosts.publishedAt,
      featured: blogPosts.featured,
      readingTime: blogPosts.readingTime,
      isPublished: blogPosts.isPublished,
      views: sql<number>`COALESCE(${blogPosts.views}, 0)`,
      updatedAt: blogPosts.updatedAt,
    }).from(blogPosts);

    if (includeHidden !== "true") {
      query = query.where(eq(blogPosts.isPublished, true)) as any;
    }

    const posts = await query.orderBy(desc(blogPosts.publishedAt));

    // Fetch latest completed scan for each post
    const postsWithScans = await Promise.all(posts.map(async (post) => {
      // Get all scans and find the latest completed one with scores
      const scans = await db.select({
        id: winstonAiScans.id,
        scanType: winstonAiScans.scanType,
        aiScore: winstonAiScans.aiScore,
        humanScore: winstonAiScans.humanScore,
        plagiarismScore: winstonAiScans.plagiarismScore,
        seoScore: winstonAiScans.seoScore,
        status: winstonAiScans.status,
        errorMessage: winstonAiScans.errorMessage,
        creditsUsed: winstonAiScans.creditsUsed,
        createdAt: winstonAiScans.createdAt,
        completedAt: winstonAiScans.completedAt,
      })
        .from(winstonAiScans)
        .where(eq(winstonAiScans.blogPostId, post.id))
        .orderBy(desc(winstonAiScans.createdAt))
        .limit(10);

      // Find the latest completed scan with actual scores
      const latestScan = scans.find(
        (scan) => scan.status === "completed" && (scan.aiScore !== null || scan.plagiarismScore !== null || scan.seoScore !== null)
      ) || null;

      return { ...post, latestScan };
    }));

    await auditLog(adminId, "BLOG_POSTS_VIEWED", "blog_posts", undefined, undefined, req);

    res.json(postsWithScans);
  } catch (error: any) {
    log.error({ err: error }, "Blog posts error");
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

router.get("/blog-posts/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    const post = await db.select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!post[0]) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    const scans = await db.select({
      id: winstonAiScans.id,
      scanType: winstonAiScans.scanType,
      aiScore: winstonAiScans.aiScore,
      humanScore: winstonAiScans.humanScore,
      plagiarismScore: winstonAiScans.plagiarismScore,
      seoScore: winstonAiScans.seoScore,
      seoRecommendations: winstonAiScans.seoRecommendations,
      status: winstonAiScans.status,
      errorMessage: winstonAiScans.errorMessage,
      creditsUsed: winstonAiScans.creditsUsed,
      createdAt: winstonAiScans.createdAt,
      completedAt: winstonAiScans.completedAt,
    })
    .from(winstonAiScans)
    .where(eq(winstonAiScans.blogPostId, id))
    .orderBy(desc(winstonAiScans.createdAt))
    .limit(10);

    await auditLog(adminId, "BLOG_POST_VIEWED", "blog_post", id, undefined, req);

    res.json({ ...post[0], scans });
  } catch (error: any) {
    log.error({ err: error }, "Blog post error");
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

router.post("/blog-posts", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { title, slug, excerpt, content, heroImage, categoryId, tags, author, authorImage, readingTime, featured } = req.body;

    const [newPost] = await db.insert(blogPosts).values({
      title,
      slug,
      excerpt,
      content,
      heroImage,
      categoryId,
      tags: tags || [],
      author,
      authorImage,
      publishedAt: new Date().toISOString(),
      readingTime: readingTime || "5 min read",
      featured: featured || false,
      isPublished: true,
    }).returning();

    await auditLog(adminId, "BLOG_POST_CREATED", "blog_post", newPost.id, JSON.stringify({ title }), req);

    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "CREATE",
        "blog_post",
        newPost.id,
        null,
        newPost as unknown as Record<string, unknown>,
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }

    res.status(201).json(newPost);
  } catch (error: any) {
    log.error({ err: error }, "Create blog post error");
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

router.put("/blog-posts/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    const { title, slug, excerpt, content, heroImage, categoryId, tags, author, authorImage, readingTime, featured, isPublished, skipValidation } = req.body;

    const [previousPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);

    // If content is provided, clean it before saving
    let cleanedContent = content;
    if (content) {
      const { blogGenerationService } = await import("../services/blog-generation");
      cleanedContent = blogGenerationService.cleanupBlogContent(content);
      
      // If publishing, validate content
      if (isPublished && !skipValidation) {
        const validation = blogGenerationService.validateContentForPublishing(cleanedContent);
        if (!validation.isValid) {
          res.status(400).json({ 
            error: "Content validation failed", 
            issues: validation.issues,
            message: "Please fix these issues before publishing or set skipValidation to true"
          });
          return;
        }
      }
    }

    const [updatedPost] = await db.update(blogPosts)
      .set({
        title,
        slug,
        excerpt,
        content: cleanedContent,
        heroImage,
        categoryId,
        tags,
        author,
        authorImage,
        readingTime,
        featured,
        isPublished,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    if (!updatedPost) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    await auditLog(adminId, "BLOG_POST_UPDATED", "blog_post", id, JSON.stringify({ title }), req);

    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "UPDATE",
        "blog_post",
        id,
        previousPost as unknown as Record<string, unknown>,
        updatedPost as unknown as Record<string, unknown>,
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }

    res.json(updatedPost);
  } catch (error: any) {
    log.error({ err: error }, "Update blog post error");
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

router.patch("/blog-posts/:id/visibility", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    const { isPublished, skipValidation } = req.body;

    // If publishing, validate and clean content first
    if (isPublished) {
      const [existingPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
      if (existingPost && existingPost.content) {
        // Clean content before publishing
        const { blogGenerationService } = await import("../services/blog-generation");
        const cleanedContent = blogGenerationService.cleanupBlogContent(existingPost.content);
        
        // Validate content for publishing
        const validation = blogGenerationService.validateContentForPublishing(cleanedContent);
        if (!validation.isValid && !skipValidation) {
          res.status(400).json({ 
            error: "Content validation failed", 
            issues: validation.issues,
            message: "Please fix these issues before publishing or set skipValidation to true"
          });
          return;
        }
        
        // Update content with cleaned version
        if (cleanedContent !== existingPost.content) {
          await db.update(blogPosts)
            .set({ content: cleanedContent, updatedAt: new Date() })
            .where(eq(blogPosts.id, id));
        }
      }
    }

    const [updatedPost] = await db.update(blogPosts)
      .set({
        isPublished,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    if (!updatedPost) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    await auditLog(
      adminId, 
      isPublished ? "BLOG_POST_PUBLISHED" : "BLOG_POST_HIDDEN", 
      "blog_post", 
      id, 
      undefined, 
      req
    );

    res.json(updatedPost);
  } catch (error: any) {
    log.error({ err: error }, "Toggle blog post visibility error");
    res.status(500).json({ error: "Failed to update blog post visibility" });
  }
});

router.delete("/blog-posts/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;

    const [deletedPost] = await db.delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .returning();

    if (!deletedPost) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    await auditLog(adminId, "BLOG_POST_DELETED", "blog_post", id, JSON.stringify({ title: deletedPost.title }), req);

    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "DELETE",
        "blog_post",
        id,
        deletedPost as unknown as Record<string, unknown>,
        null,
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }

    res.json({ success: true, deleted: deletedPost });
  } catch (error: any) {
    log.error({ err: error }, "Delete blog post error");
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

router.post("/blog-posts/:id/scan", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    const { scanType = "both" } = req.body;

    const results = await scanBlogPost(id, adminId, scanType);

    await auditLog(
      adminId, 
      "BLOG_POST_SCANNED", 
      "blog_post", 
      id, 
      JSON.stringify({ scanType, results: results.length }), 
      req
    );

    res.json({ success: true, results });
  } catch (error: any) {
    log.error({ err: error }, "Blog post scan error");
    res.status(500).json({ error: error.message || "Failed to scan blog post" });
  }
});

// ============ BLOG DATA EXPORT/IMPORT ============

const MAX_IMPORT_POSTS = 50;
const MAX_IMPORT_CATEGORIES = 20;
const MAX_CONTENT_LENGTH = 500000;

function sanitizeString(str: string | undefined | null, maxLength: number = 10000): string {
  if (!str || typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length <= 200;
}

function validateId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 100;
}

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         req.socket?.remoteAddress || 
         'unknown';
}

router.post("/blog-posts/export", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const clientIP = getClientIP(req);
    const { ids } = req.body;
    
    if (ids && (!Array.isArray(ids) || ids.length > MAX_IMPORT_POSTS)) {
      res.status(400).json({ error: `Invalid ids - must be array with max ${MAX_IMPORT_POSTS} items` });
      return;
    }
    
    if (ids) {
      for (const id of ids) {
        if (!validateId(id)) {
          res.status(400).json({ error: "Invalid post ID format" });
          return;
        }
      }
    }
    
    let posts;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      posts = await db.select().from(blogPosts).where(inArray(blogPosts.id, ids));
    } else {
      posts = await db.select().from(blogPosts);
    }
    
    const categories = await db.select().from(blogCategories);
    
    await auditLog(adminId, "BLOG_POSTS_EXPORTED", "blog_posts", undefined, 
      JSON.stringify({ count: posts.length, ip: clientIP, selective: !!ids }), req);
    
    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "EXPORT",
        "blog_post",
        null,
        null,
        { postCount: posts.length, categoryCount: categories.length, ip: clientIP },
        req
      );
    } catch (auditErr) {
      log.error({ err: auditErr }, "Audit log error");
    }
    
    res.json({
      exportedAt: new Date().toISOString(),
      postCount: posts.length,
      categoryCount: categories.length,
      posts: posts,
      categories: categories
    });
  } catch (error: any) {
    log.error({ err: error }, "Blog posts export error");
    res.status(500).json({ error: "Failed to export blog posts" });
  }
});

router.post("/blog-posts/import", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const clientIP = getClientIP(req);
    const { posts, categories } = req.body;
    
    const contentSize = JSON.stringify(req.body).length;
    if (contentSize > MAX_CONTENT_LENGTH) {
      res.status(400).json({ error: `Payload too large (max ${MAX_CONTENT_LENGTH / 1000}KB)` });
      return;
    }
    
    let categoriesImported = 0;
    let categoriesUpdated = 0;
    let categoriesSkipped = 0;
    
    if (categories && Array.isArray(categories)) {
      if (categories.length > MAX_IMPORT_CATEGORIES) {
        res.status(400).json({ error: `Too many categories (max ${MAX_IMPORT_CATEGORIES})` });
        return;
      }
      
      for (const cat of categories) {
        try {
          if (!cat.id || !validateId(cat.id) || !cat.slug || !validateSlug(cat.slug)) {
            log.info({ id: cat.id, slug: cat.slug }, "Skipping category - invalid id or slug");
            categoriesSkipped++;
            continue;
          }
          
          if (!cat.name) {
            log.info({ id: cat.id }, "Skipping category - missing name");
            categoriesSkipped++;
            continue;
          }
          
          const categoryData = {
            name: sanitizeString(cat.name, 200),
            slug: sanitizeString(cat.slug, 200),
            description: sanitizeString(cat.description, 1000) || null,
          };
          
          // Check if category exists by ID first, then by slug
          const [existingById] = await db.select().from(blogCategories).where(eq(blogCategories.id, cat.id)).limit(1);
          
          if (existingById) {
            // Update existing category by ID
            await db.update(blogCategories)
              .set(categoryData)
              .where(eq(blogCategories.id, cat.id));
            log.info({ id: cat.id, name: cat.name }, "Updated category by ID");
            categoriesUpdated++;
            continue;
          }
          
          const [existingBySlug] = await db.select().from(blogCategories).where(eq(blogCategories.slug, cat.slug)).limit(1);
          
          if (existingBySlug) {
            // Update existing category by slug (different ID but same slug)
            await db.update(blogCategories)
              .set({ ...categoryData, id: sanitizeString(cat.id, 100) })
              .where(eq(blogCategories.slug, cat.slug));
            log.info({ id: cat.id, slug: cat.slug }, "Updated category by slug");
            categoriesUpdated++;
            continue;
          }
          
          // Insert new category
          await db.insert(blogCategories).values({
            id: sanitizeString(cat.id, 100),
            ...categoryData,
          });
          log.info({ id: cat.id, name: cat.name, slug: cat.slug }, "Inserted new category");
          categoriesImported++;
        } catch (err) {
          log.error({ err, categoryId: cat.id }, "Failed to import category");
          categoriesSkipped++;
        }
      }
    }
    
    if (!posts || !Array.isArray(posts)) {
      res.status(400).json({ error: "Invalid import data - posts array required" });
      return;
    }
    
    if (posts.length > MAX_IMPORT_POSTS) {
      res.status(400).json({ error: `Too many posts (max ${MAX_IMPORT_POSTS})` });
      return;
    }
    
    let postsImported = 0;
    let postsUpdated = 0;
    let postsSkipped = 0;
    
    for (const post of posts) {
      try {
        if (!post.id || !validateId(post.id) || !post.slug || !validateSlug(post.slug)) {
          log.info({ id: post.id, slug: post.slug }, "Skipping post - invalid id or slug");
          postsSkipped++;
          continue;
        }
        
        if (!post.title || !post.content || !post.excerpt) {
          log.info({ id: post.id, hasTitle: !!post.title, hasContent: !!post.content, hasExcerpt: !!post.excerpt }, "Skipping post - missing required fields");
          postsSkipped++;
          continue;
        }
        
        if (!post.categoryId) {
          log.info({ id: post.id, slug: post.slug }, "Skipping post - missing categoryId");
          postsSkipped++;
          continue;
        }
        
        const postData = {
          title: sanitizeString(post.title, 500),
          slug: sanitizeString(post.slug, 200),
          excerpt: sanitizeString(post.excerpt, 2000),
          content: sanitizeString(post.content, 200000),
          heroImage: sanitizeString(post.heroImage, 500) || null,
          categoryId: sanitizeString(post.categoryId, 100),
          tags: Array.isArray(post.tags) ? post.tags.slice(0, 20).map((t: any) => sanitizeString(String(t), 100)) : [],
          author: sanitizeString(post.author, 200),
          authorImage: sanitizeString(post.authorImage, 500) || null,
          publishedAt: sanitizeString(post.publishedAt, 50),
          readingTime: sanitizeString(post.readingTime, 50),
          featured: post.featured === true,
          isPublished: post.isPublished !== false,
          views: typeof post.views === 'number' ? post.views : (post.views ? parseInt(post.views, 10) || 0 : 0),
          updatedAt: post.updatedAt ? new Date(post.updatedAt) : new Date(),
        };
        
        // Check if post exists by slug
        const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.slug, post.slug)).limit(1);
        
        if (existing) {
          // Update existing post with all fields from import
          await db.update(blogPosts)
            .set(postData)
            .where(eq(blogPosts.slug, post.slug));
          log.info({ id: existing.id, slug: post.slug, categoryId: post.categoryId }, "Updated post");
          postsUpdated++;
          continue;
        }
        
        // Insert new post
        await db.insert(blogPosts).values({
          id: sanitizeString(post.id, 100),
          ...postData,
        });
        log.info({ id: post.id, slug: post.slug, categoryId: post.categoryId, tags: post.tags?.length || 0 }, "Inserted new post");
        postsImported++;
      } catch (err) {
        log.error({ err, postId: post.id, slug: post.slug }, "Failed to import post");
        postsSkipped++;
      }
    }
    
    await auditLog(adminId, "BLOG_POSTS_IMPORTED", "blog_posts", undefined, 
      JSON.stringify({ postsImported, postsUpdated, postsSkipped, categoriesImported, categoriesUpdated, categoriesSkipped, ip: clientIP }), req);
    
    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "CREATE",
        "blog_post",
        null,
        null,
        { postsImported, postsUpdated, postsSkipped, categoriesImported, categoriesUpdated, categoriesSkipped, ip: clientIP },
        req
      );
    } catch (auditErr) {
      log.error({ err: auditErr }, "Audit log error");
    }
    
    res.json({ 
      success: true, 
      posts: { imported: postsImported, updated: postsUpdated, skipped: postsSkipped },
      categories: { imported: categoriesImported, updated: categoriesUpdated, skipped: categoriesSkipped },
      message: `Posts: ${postsImported} new, ${postsUpdated} updated, ${postsSkipped} skipped. Categories: ${categoriesImported} new, ${categoriesUpdated} updated, ${categoriesSkipped} skipped.`
    });
  } catch (error: any) {
    log.error({ err: error }, "Blog posts import error");
    res.status(500).json({ error: "Failed to import blog posts" });
  }
});

// ============ RESOURCES CRUD ============

router.get("/resources", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { includeHidden = "true" } = req.query;

    let query = db.select().from(resourceFiles);

    if (includeHidden !== "true") {
      query = query.where(eq(resourceFiles.isPublished, true)) as any;
    }

    const resources = await query.orderBy(desc(resourceFiles.publishedAt));

    await auditLog(adminId, "RESOURCES_VIEWED", "resources", undefined, undefined, req);

    res.json(resources);
  } catch (error: any) {
    log.error({ err: error }, "Resources error");
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.post("/resources", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { title, slug, description, category, fileType, fileUrl, fileSize, featured } = req.body;

    const [newResource] = await db.insert(resourceFiles).values({
      title,
      slug,
      description,
      category,
      fileType,
      fileUrl,
      fileSize,
      featured: featured || false,
      publishedAt: new Date().toISOString(),
      isPublished: true,
    }).returning();

    await auditLog(adminId, "RESOURCE_CREATED", "resource", newResource.id, JSON.stringify({ title }), req);

    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "CREATE",
        "resource_file",
        newResource.id,
        null,
        newResource as unknown as Record<string, unknown>,
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }

    res.status(201).json(newResource);
  } catch (error: any) {
    log.error({ err: error }, "Create resource error");
    res.status(500).json({ error: "Failed to create resource" });
  }
});

router.put("/resources/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    const { title, slug, description, category, fileType, fileUrl, fileSize, featured, isPublished } = req.body;

    const [previousResource] = await db.select().from(resourceFiles).where(eq(resourceFiles.id, id)).limit(1);

    const [updatedResource] = await db.update(resourceFiles)
      .set({
        title,
        slug,
        description,
        category,
        fileType,
        fileUrl,
        fileSize,
        featured,
        isPublished,
        updatedAt: new Date(),
      })
      .where(eq(resourceFiles.id, id))
      .returning();

    if (!updatedResource) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    await auditLog(adminId, "RESOURCE_UPDATED", "resource", id, JSON.stringify({ title }), req);

    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "UPDATE",
        "resource_file",
        id,
        previousResource as unknown as Record<string, unknown>,
        updatedResource as unknown as Record<string, unknown>,
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }

    res.json(updatedResource);
  } catch (error: any) {
    log.error({ err: error }, "Update resource error");
    res.status(500).json({ error: "Failed to update resource" });
  }
});

router.patch("/resources/:id/visibility", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    const { isPublished } = req.body;

    const [updatedResource] = await db.update(resourceFiles)
      .set({
        isPublished,
        updatedAt: new Date(),
      })
      .where(eq(resourceFiles.id, id))
      .returning();

    if (!updatedResource) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    await auditLog(
      adminId, 
      isPublished ? "RESOURCE_PUBLISHED" : "RESOURCE_HIDDEN", 
      "resource", 
      id, 
      undefined, 
      req
    );

    res.json(updatedResource);
  } catch (error: any) {
    log.error({ err: error }, "Toggle resource visibility error");
    res.status(500).json({ error: "Failed to update resource visibility" });
  }
});

router.delete("/resources/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;

    const [deletedResource] = await db.delete(resourceFiles)
      .where(eq(resourceFiles.id, id))
      .returning();

    if (!deletedResource) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    await auditLog(adminId, "RESOURCE_DELETED", "resource", id, JSON.stringify({ title: deletedResource.title }), req);

    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "DELETE",
        "resource_file",
        id,
        deletedResource as unknown as Record<string, unknown>,
        null,
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }

    res.json({ success: true, deleted: deletedResource });
  } catch (error: any) {
    log.error({ err: error }, "Delete resource error");
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

// ============ CONTACT SUBMISSIONS ============

router.get("/contact-submissions", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { verified, limit = "50", offset = "0" } = req.query;

    let query = db.select({
      id: contactSubmissions.id,
      firstName: contactSubmissions.firstName,
      lastName: contactSubmissions.lastName,
      email: contactSubmissions.email,
      company: contactSubmissions.company,
      jobTitle: contactSubmissions.jobTitle,
      phone: contactSubmissions.phone,
      message: contactSubmissions.message,
      consentMarketing: contactSubmissions.consentMarketing,
      verified: contactSubmissions.verified,
      verifiedAt: contactSubmissions.verifiedAt,
      createdAt: contactSubmissions.createdAt,
    }).from(contactSubmissions);

    if (verified === "true") {
      query = query.where(eq(contactSubmissions.verified, true)) as any;
    } else if (verified === "false") {
      query = query.where(eq(contactSubmissions.verified, false)) as any;
    }

    const submissions = await query
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const totalCount = await db.select({ count: count() }).from(contactSubmissions);

    await auditLog(adminId, "CONTACT_SUBMISSIONS_VIEWED", "contact_submissions", undefined, JSON.stringify({ verified, limit, offset }), req);

    res.json({
      submissions,
      total: totalCount[0]?.count || 0,
      page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
      limit: parseInt(limit as string),
    });
  } catch (error: any) {
    log.error({ err: error }, "Contact submissions error");
    res.status(500).json({ error: "Failed to fetch contact submissions" });
  }
});

router.get("/contact-submissions/export", async (req: Request, res: Response) => {
  try {
    const submissions = await db.select({
      firstName: contactSubmissions.firstName,
      lastName: contactSubmissions.lastName,
      email: contactSubmissions.email,
      company: contactSubmissions.company,
      jobTitle: contactSubmissions.jobTitle,
      phone: contactSubmissions.phone,
      message: contactSubmissions.message,
      consentMarketing: contactSubmissions.consentMarketing,
      verified: contactSubmissions.verified,
      createdAt: contactSubmissions.createdAt,
    })
    .from(contactSubmissions)
    .orderBy(desc(contactSubmissions.createdAt));

    const csvHeader = "First Name,Last Name,Email,Company,Job Title,Phone,Message,Marketing Consent,Verified,Created At\n";
    const csvRows = submissions.map(sub => 
      `"${sub.firstName}","${sub.lastName}","${sub.email}","${sub.company || ''}","${sub.jobTitle || ''}","${sub.phone || ''}","${(sub.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}","${sub.consentMarketing ? 'Yes' : 'No'}","${sub.verified ? 'Yes' : 'No'}","${sub.createdAt?.toISOString() || ''}"`
    ).join("\n");

    const adminId = getAdminId(req);
    await auditLog(
      adminId,
      "CONTACT_SUBMISSIONS_EXPORTED",
      "contact_submissions",
      undefined,
      JSON.stringify({ count: submissions.length }),
      req
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=1qg-contact-submissions-export.csv");
    res.send(csvHeader + csvRows);
  } catch (error: any) {
    log.error({ err: error }, "Contact submissions export error");
    res.status(500).json({ error: "Failed to export contact submissions" });
  }
});

router.get("/contact-submissions/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;

    const submission = await db.select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, id))
      .limit(1);

    if (!submission[0]) {
      res.status(404).json({ error: "Contact submission not found" });
      return;
    }

    await auditLog(adminId, "CONTACT_SUBMISSION_VIEWED", "contact_submission", id, undefined, req);

    res.json(submission[0]);
  } catch (error: any) {
    log.error({ err: error }, "Contact submission fetch error");
    res.status(500).json({ error: "Failed to fetch contact submission" });
  }
});

router.delete("/contact-submissions/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;

    const [deleted] = await db.delete(contactSubmissions)
      .where(eq(contactSubmissions.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Contact submission not found" });
      return;
    }

    await auditLog(adminId, "CONTACT_SUBMISSION_DELETED", "contact_submission", id, JSON.stringify({ email: deleted.email }), req);

    res.json({ success: true, deleted });
  } catch (error: any) {
    log.error({ err: error }, "Contact submission delete error");
    res.status(500).json({ error: "Failed to delete contact submission" });
  }
});

// ============ LEADS ============

router.get("/leads", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { verified, limit = "50", offset = "0" } = req.query;

    let query = db.select({
      id: resourceLeads.id,
      firstName: resourceLeads.firstName,
      lastName: resourceLeads.lastName,
      email: resourceLeads.email,
      company: resourceLeads.company,
      jobTitle: resourceLeads.jobTitle,
      verified: resourceLeads.verified,
      resourceId: resourceLeads.resourceId,
      subscribeNewsletter: resourceLeads.subscribeNewsletter,
      createdAt: resourceLeads.createdAt,
      verifiedAt: resourceLeads.verifiedAt,
    }).from(resourceLeads);

    if (verified === "true") {
      query = query.where(eq(resourceLeads.verified, true)) as any;
    } else if (verified === "false") {
      query = query.where(eq(resourceLeads.verified, false)) as any;
    }

    const rawLeads = await query
      .orderBy(desc(resourceLeads.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Decrypt PII fields
    const leads = rawLeads.map(lead => ({
      ...lead,
      firstName: safeDecrypt(lead.firstName),
      lastName: safeDecrypt(lead.lastName),
      email: safeDecrypt(lead.email),
    }));

    const totalCount = await db.select({ count: count() }).from(resourceLeads);

    await auditLog(adminId, "LEADS_VIEWED", "leads", undefined, JSON.stringify({ verified, limit, offset }), req);

    res.json({
      leads,
      total: totalCount[0]?.count || 0,
      page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
      limit: parseInt(limit as string),
    });
  } catch (error: any) {
    log.error({ err: error }, "Leads error");
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.get("/leads/export", async (req: Request, res: Response) => {
  try {
    const rawLeads = await db.select({
      firstName: resourceLeads.firstName,
      lastName: resourceLeads.lastName,
      email: resourceLeads.email,
      company: resourceLeads.company,
      jobTitle: resourceLeads.jobTitle,
      verified: resourceLeads.verified,
      subscribeNewsletter: resourceLeads.subscribeNewsletter,
      createdAt: resourceLeads.createdAt,
    })
    .from(resourceLeads)
    .where(eq(resourceLeads.verified, true))
    .orderBy(desc(resourceLeads.createdAt));

    // Decrypt PII fields for export
    const leads = rawLeads.map(lead => ({
      ...lead,
      firstName: safeDecrypt(lead.firstName),
      lastName: safeDecrypt(lead.lastName),
      email: safeDecrypt(lead.email),
    }));

    const csvHeader = "First Name,Last Name,Email,Company,Job Title,Newsletter,Created At\n";
    const csvRows = leads.map(lead => 
      `"${lead.firstName}","${lead.lastName}","${lead.email}","${lead.company || ''}","${lead.jobTitle || ''}","${lead.subscribeNewsletter ? 'Yes' : 'No'}","${lead.createdAt?.toISOString() || ''}"`
    ).join("\n");

    const adminId = getAdminId(req);
    await auditLog(
      adminId,
      "LEADS_EXPORTED",
      "leads",
      undefined,
      JSON.stringify({ count: leads.length }),
      req
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=1qg-leads-export.csv");
    res.send(csvHeader + csvRows);
  } catch (error: any) {
    log.error({ err: error }, "Leads export error");
    res.status(500).json({ error: "Failed to export leads" });
  }
});

router.get("/leads/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;

    const rawLead = await db.select()
      .from(resourceLeads)
      .where(eq(resourceLeads.id, id))
      .limit(1);

    if (!rawLead[0]) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    // Decrypt PII fields
    const lead = {
      ...rawLead[0],
      firstName: safeDecrypt(rawLead[0].firstName),
      lastName: safeDecrypt(rawLead[0].lastName),
      email: safeDecrypt(rawLead[0].email),
    };

    await auditLog(adminId, "LEAD_VIEWED", "lead", id, undefined, req);

    res.json(lead);
  } catch (error: any) {
    log.error({ err: error }, "Lead detail error");
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

router.put("/leads/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    const { firstName, lastName, email, company, jobTitle, verified, subscribeNewsletter } = req.body;

    const [previousLead] = await db.select().from(resourceLeads).where(eq(resourceLeads.id, id)).limit(1);

    const updateData: Record<string, any> = {
      company,
      jobTitle,
      verified,
      subscribeNewsletter,
      verifiedAt: verified ? new Date() : null,
    };

    if (email !== undefined) {
      updateData.email = encryptField(email);
      updateData.emailHash = hashForLookup(email);
    }
    if (firstName !== undefined) {
      updateData.firstName = encryptField(firstName);
    }
    if (lastName !== undefined) {
      updateData.lastName = encryptField(lastName);
    }

    const [updatedLead] = await db.update(resourceLeads)
      .set(updateData)
      .where(eq(resourceLeads.id, id))
      .returning();

    if (!updatedLead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    const decryptedLead = {
      ...updatedLead,
      email: safeDecrypt(updatedLead.email),
      firstName: safeDecrypt(updatedLead.firstName),
      lastName: safeDecrypt(updatedLead.lastName),
    };

    await auditLog(adminId, "LEAD_UPDATED", "lead", id, JSON.stringify({ email }), req);

    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "UPDATE",
        "lead",
        id,
        previousLead as unknown as Record<string, unknown>,
        decryptedLead as unknown as Record<string, unknown>,
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }

    res.json(decryptedLead);
  } catch (error: any) {
    log.error({ err: error }, "Update lead error");
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.patch("/leads/:id/verify", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    const { verified } = req.body;

    const [updatedLead] = await db.update(resourceLeads)
      .set({
        verified,
        verifiedAt: verified ? new Date() : null,
      })
      .where(eq(resourceLeads.id, id))
      .returning();

    if (!updatedLead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    await auditLog(
      adminId, 
      verified ? "LEAD_VERIFIED" : "LEAD_UNVERIFIED", 
      "lead", 
      id, 
      undefined, 
      req
    );

    res.json(updatedLead);
  } catch (error: any) {
    log.error({ err: error }, "Verify lead error");
    res.status(500).json({ error: "Failed to update lead verification" });
  }
});

router.delete("/leads/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;

    const [deletedLead] = await db.delete(resourceLeads)
      .where(eq(resourceLeads.id, id))
      .returning();

    if (!deletedLead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    await auditLog(adminId, "LEAD_DELETED", "lead", id, JSON.stringify({ email: deletedLead.email }), req);

    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "DELETE",
        "lead",
        id,
        deletedLead as unknown as Record<string, unknown>,
        null,
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }

    res.json({ success: true, deleted: deletedLead });
  } catch (error: any) {
    log.error({ err: error }, "Delete lead error");
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

// ============ DOWNLOAD TRACKING & MANAGEMENT ============

// Get all downloads with lead info for tracking purposes
router.get("/downloads", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    
    // Get all downloads with lead and resource info
    const downloads = await db
      .select({
        id: resourceDownloads.id,
        sessionId: resourceDownloads.sessionId,
        leadId: resourceDownloads.leadId,
        resourceId: resourceDownloads.resourceId,
        downloadedAt: resourceDownloads.downloadedAt,
        ipAddress: resourceDownloads.ipAddress,
        userAgent: resourceDownloads.userAgent,
        referrer: resourceDownloads.referrer,
        leadEmail: resourceLeads.email,
        leadFirstName: resourceLeads.firstName,
        leadLastName: resourceLeads.lastName,
        leadCompany: resourceLeads.company,
        leadJobTitle: resourceLeads.jobTitle,
        resourceTitle: resourceFiles.title,
        resourceCategory: resourceFiles.category,
      })
      .from(resourceDownloads)
      .leftJoin(resourceLeads, eq(resourceDownloads.leadId, resourceLeads.id))
      .leftJoin(resourceFiles, eq(resourceDownloads.resourceId, resourceFiles.id))
      .orderBy(desc(resourceDownloads.downloadedAt));

    await auditLog(adminId, "DOWNLOADS_VIEWED", "downloads", undefined, undefined, req);

    res.json({
      downloads,
      totalCount: downloads.length,
    });
  } catch (error: any) {
    log.error({ err: error }, "Get downloads error");
    res.status(500).json({ error: "Failed to fetch downloads" });
  }
});

// Get download stats summary
router.get("/downloads/stats", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalDownloads,
      uniqueLeads,
      last30Days,
      last7Days,
      topResources
    ] = await Promise.all([
      db.select({ count: count() }).from(resourceDownloads),
      db.select({ count: sql<number>`count(distinct ${resourceDownloads.leadId})` }).from(resourceDownloads),
      db.select({ count: count() }).from(resourceDownloads)
        .where(gte(resourceDownloads.downloadedAt, thirtyDaysAgo)),
      db.select({ count: count() }).from(resourceDownloads)
        .where(gte(resourceDownloads.downloadedAt, sevenDaysAgo)),
      db.select({
        resourceId: resourceDownloads.resourceId,
        resourceTitle: resourceFiles.title,
        downloadCount: count(),
      })
      .from(resourceDownloads)
      .leftJoin(resourceFiles, eq(resourceDownloads.resourceId, resourceFiles.id))
      .groupBy(resourceDownloads.resourceId, resourceFiles.title)
      .orderBy(desc(count()))
      .limit(10),
    ]);

    await auditLog(adminId, "DOWNLOAD_STATS_VIEWED", "downloads", undefined, undefined, req);

    res.json({
      totalDownloads: totalDownloads[0]?.count || 0,
      uniqueLeads: uniqueLeads[0]?.count || 0,
      last30Days: last30Days[0]?.count || 0,
      last7Days: last7Days[0]?.count || 0,
      topResources,
    });
  } catch (error: any) {
    log.error({ err: error }, "Get download stats error");
    res.status(500).json({ error: "Failed to fetch download stats" });
  }
});

// Reset all download counts on resources (the aggregate counters)
router.post("/downloads/reset-counts", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);

    const result = await db.update(resourceFiles)
      .set({ downloadCount: 0 })
      .returning();

    await auditLog(
      adminId, 
      "DOWNLOAD_COUNTS_RESET", 
      "resources", 
      undefined, 
      JSON.stringify({ resourcesReset: result.length }), 
      req
    );

    res.json({ 
      success: true, 
      resourcesReset: result.length,
      message: `Reset download counts on ${result.length} resources` 
    });
  } catch (error: any) {
    log.error({ err: error }, "Reset download counts error");
    res.status(500).json({ error: "Failed to reset download counts" });
  }
});

// Clear all download history records (the individual download tracking entries)
router.delete("/downloads/history", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);

    const result = await db.delete(resourceDownloads).returning();

    await auditLog(
      adminId, 
      "DOWNLOAD_HISTORY_CLEARED", 
      "downloads", 
      undefined, 
      JSON.stringify({ downloadsCleared: result.length }), 
      req
    );

    res.json({ 
      success: true, 
      downloadsCleared: result.length,
      message: `Cleared ${result.length} download history records` 
    });
  } catch (error: any) {
    log.error({ err: error }, "Clear download history error");
    res.status(500).json({ error: "Failed to clear download history" });
  }
});

// Export downloads as CSV for lead tracking
router.get("/downloads/export", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    
    const downloads = await db
      .select({
        downloadedAt: resourceDownloads.downloadedAt,
        leadEmail: resourceLeads.email,
        leadFirstName: resourceLeads.firstName,
        leadLastName: resourceLeads.lastName,
        leadCompany: resourceLeads.company,
        leadJobTitle: resourceLeads.jobTitle,
        resourceTitle: resourceFiles.title,
        resourceCategory: resourceFiles.category,
        referrer: resourceDownloads.referrer,
      })
      .from(resourceDownloads)
      .leftJoin(resourceLeads, eq(resourceDownloads.leadId, resourceLeads.id))
      .leftJoin(resourceFiles, eq(resourceDownloads.resourceId, resourceFiles.id))
      .orderBy(desc(resourceDownloads.downloadedAt));

    // Generate CSV
    const headers = ['Downloaded At', 'Email', 'First Name', 'Last Name', 'Company', 'Job Title', 'Resource', 'Category', 'Referrer'];
    const rows = downloads.map(d => [
      d.downloadedAt?.toISOString() || '',
      d.leadEmail || '',
      d.leadFirstName || '',
      d.leadLastName || '',
      d.leadCompany || '',
      d.leadJobTitle || '',
      d.resourceTitle || '',
      d.resourceCategory || '',
      d.referrer || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    await auditLog(adminId, "DOWNLOADS_EXPORTED", "downloads", undefined, JSON.stringify({ count: downloads.length }), req);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=downloads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error: any) {
    log.error({ err: error }, "Export downloads error");
    res.status(500).json({ error: "Failed to export downloads" });
  }
});

// ============ WINSTON AI SCANNING ============

router.get("/scans", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { limit = "50" } = req.query;

    const scans = await getAllScans(parseInt(limit as string));

    await auditLog(adminId, "SCANS_VIEWED", "scans", undefined, undefined, req);

    res.json(scans);
  } catch (error: any) {
    log.error({ err: error }, "Scans error");
    res.status(500).json({ error: "Failed to fetch scans" });
  }
});

router.get("/scans/blog-post/:blogPostId", async (req: Request, res: Response) => {
  try {
    const { blogPostId } = req.params;
    const scans = await getScanHistory(blogPostId);
    res.json(scans);
  } catch (error: any) {
    log.error({ err: error }, "Blog post scans error");
    res.status(500).json({ error: "Failed to fetch scan history" });
  }
});

router.post("/scans", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { blogPostId, scanType = "both" } = req.body;

    if (!blogPostId) {
      res.status(400).json({ error: "blogPostId is required" });
      return;
    }

    const results = await scanBlogPost(blogPostId, adminId, scanType);

    await auditLog(
      adminId, 
      "CONTENT_SCANNED", 
      "blog_post", 
      blogPostId, 
      JSON.stringify({ scanType, results: results.length }), 
      req
    );

    res.json({ success: true, results });
  } catch (error: any) {
    log.error({ err: error }, "Scan error");
    res.status(500).json({ error: error.message || "Failed to scan content" });
  }
});

// ============ VISITOR ANALYTICS ============

router.get("/analytics/overview", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Exclude bot traffic from all metrics
    const notBot = eq(pageViews.isBot, false);
    const sessionNotBot = eq(visitorSessions.isBot, false);

    const [
      totalPageViews,
      totalSessions,
      uniqueVisitors,
      avgSessionDuration,
      botPageViews,
      botSessions
    ] = await Promise.all([
      db.select({ count: count() }).from(pageViews)
        .where(and(gte(pageViews.createdAt, daysAgo), notBot)),
      db.select({ count: count() }).from(visitorSessions)
        .where(and(gte(visitorSessions.startedAt, daysAgo), sessionNotBot)),
      db.select({ count: sql<number>`count(DISTINCT ${visitorSessions.visitorId})` })
        .from(visitorSessions)
        .where(and(gte(visitorSessions.startedAt, daysAgo), sessionNotBot)),
      db.select({ avg: sql<number>`avg(${visitorSessions.totalDuration})` })
        .from(visitorSessions)
        .where(and(gte(visitorSessions.startedAt, daysAgo), sessionNotBot)),
      db.select({ count: count() }).from(pageViews)
        .where(and(gte(pageViews.createdAt, daysAgo), eq(pageViews.isBot, true))),
      db.select({ count: count() }).from(visitorSessions)
        .where(and(gte(visitorSessions.startedAt, daysAgo), eq(visitorSessions.isBot, true))),
    ]);

    await auditLog(adminId, "ANALYTICS_VIEWED", "analytics", undefined, JSON.stringify({ days }), req);

    res.json({
      pageViews: totalPageViews[0]?.count || 0,
      sessions: totalSessions[0]?.count || 0,
      uniqueVisitors: uniqueVisitors[0]?.count || 0,
      avgSessionDuration: Math.round(avgSessionDuration[0]?.avg || 0),
      period: parseInt(days as string),
      botPageViews: botPageViews[0]?.count || 0,
      botSessions: botSessions[0]?.count || 0,
    });
  } catch (error: any) {
    log.error({ err: error }, "Analytics overview error");
    res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

router.get("/analytics/top-pages", async (req: Request, res: Response) => {
  try {
    const { days = "30", limit = "10" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const topPages = await db.select({
      path: pageViews.path,
      views: count(),
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, daysAgo), eq(pageViews.isBot, false)))
    .groupBy(pageViews.path)
    .orderBy(desc(count()))
    .limit(parseInt(limit as string));

    res.json(topPages);
  } catch (error: any) {
    log.error({ err: error }, "Top pages error");
    res.status(500).json({ error: "Failed to fetch top pages" });
  }
});

router.get("/analytics/traffic-sources", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const sources = await db.select({
      referrer: visitorSessions.referrer,
      sessions: count(),
    })
    .from(visitorSessions)
    .where(and(gte(visitorSessions.startedAt, daysAgo), eq(visitorSessions.isBot, false)))
    .groupBy(visitorSessions.referrer)
    .orderBy(desc(count()))
    .limit(10);

    res.json(sources);
  } catch (error: any) {
    log.error({ err: error }, "Traffic sources error");
    res.status(500).json({ error: "Failed to fetch traffic sources" });
  }
});

router.get("/analytics/devices", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const devices = await db.select({
      deviceType: visitorSessions.deviceType,
      sessions: count(),
    })
    .from(visitorSessions)
    .where(and(gte(visitorSessions.startedAt, daysAgo), eq(visitorSessions.isBot, false)))
    .groupBy(visitorSessions.deviceType)
    .orderBy(desc(count()));

    res.json(devices);
  } catch (error: any) {
    log.error({ err: error }, "Devices error");
    res.status(500).json({ error: "Failed to fetch device breakdown" });
  }
});

router.get("/analytics/daily", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const dailyStats = await db.select({
      date: sql<string>`DATE(${pageViews.createdAt})`,
      views: count(),
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, daysAgo), eq(pageViews.isBot, false)))
    .groupBy(sql`DATE(${pageViews.createdAt})`)
    .orderBy(sql`DATE(${pageViews.createdAt})`);

    res.json(dailyStats);
  } catch (error: any) {
    log.error({ err: error }, "Daily stats error");
    res.status(500).json({ error: "Failed to fetch daily statistics" });
  }
});

// ============ ADVANCED ANALYTICS ============

// Trends comparison (current period vs previous period)
router.get("/analytics/trends", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const periodDays = parseInt(days as string);
    
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);
    
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (periodDays * 2));
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodDays);

    // Exclude bot traffic from trends
    const notBotPV = eq(pageViews.isBot, false);
    const notBotSession = eq(visitorSessions.isBot, false);

    const [
      currentPageViews,
      previousPageViews,
      currentSessions,
      previousSessions,
      currentVisitors,
      previousVisitors,
      currentAvgDuration,
      previousAvgDuration
    ] = await Promise.all([
      db.select({ count: count() }).from(pageViews)
        .where(and(gte(pageViews.createdAt, currentPeriodStart), notBotPV)),
      db.select({ count: count() }).from(pageViews)
        .where(and(
          gte(pageViews.createdAt, previousPeriodStart),
          sql`${pageViews.createdAt} < ${previousPeriodEnd}`,
          notBotPV
        )),
      db.select({ count: count() }).from(visitorSessions)
        .where(and(gte(visitorSessions.startedAt, currentPeriodStart), notBotSession)),
      db.select({ count: count() }).from(visitorSessions)
        .where(and(
          gte(visitorSessions.startedAt, previousPeriodStart),
          sql`${visitorSessions.startedAt} < ${previousPeriodEnd}`,
          notBotSession
        )),
      db.select({ count: sql<number>`count(DISTINCT ${visitorSessions.visitorId})` })
        .from(visitorSessions)
        .where(and(gte(visitorSessions.startedAt, currentPeriodStart), notBotSession)),
      db.select({ count: sql<number>`count(DISTINCT ${visitorSessions.visitorId})` })
        .from(visitorSessions)
        .where(and(
          gte(visitorSessions.startedAt, previousPeriodStart),
          sql`${visitorSessions.startedAt} < ${previousPeriodEnd}`,
          notBotSession
        )),
      db.select({ avg: sql<number>`avg(${visitorSessions.totalDuration})` })
        .from(visitorSessions)
        .where(and(gte(visitorSessions.startedAt, currentPeriodStart), notBotSession)),
      db.select({ avg: sql<number>`avg(${visitorSessions.totalDuration})` })
        .from(visitorSessions)
        .where(and(
          gte(visitorSessions.startedAt, previousPeriodStart),
          sql`${visitorSessions.startedAt} < ${previousPeriodEnd}`,
          notBotSession
        )),
    ]);

    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
      pageViews: {
        current: currentPageViews[0]?.count || 0,
        previous: previousPageViews[0]?.count || 0,
        change: calculateChange(currentPageViews[0]?.count || 0, previousPageViews[0]?.count || 0),
      },
      sessions: {
        current: currentSessions[0]?.count || 0,
        previous: previousSessions[0]?.count || 0,
        change: calculateChange(currentSessions[0]?.count || 0, previousSessions[0]?.count || 0),
      },
      uniqueVisitors: {
        current: currentVisitors[0]?.count || 0,
        previous: previousVisitors[0]?.count || 0,
        change: calculateChange(currentVisitors[0]?.count || 0, previousVisitors[0]?.count || 0),
      },
      avgDuration: {
        current: Math.round(currentAvgDuration[0]?.avg || 0),
        previous: Math.round(previousAvgDuration[0]?.avg || 0),
        change: calculateChange(
          Math.round(currentAvgDuration[0]?.avg || 0),
          Math.round(previousAvgDuration[0]?.avg || 0)
        ),
      },
      period: periodDays,
    });
  } catch (error: any) {
    log.error({ err: error }, "Analytics trends error");
    res.status(500).json({ error: "Failed to fetch analytics trends" });
  }
});

// Engagement metrics (bounce rate, pages per session) - excludes bot traffic
router.get("/analytics/engagement", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Exclude bot traffic from engagement metrics
    const notBotSession = eq(visitorSessions.isBot, false);
    const notBotPV = eq(pageViews.isBot, false);

    const [
      totalSessions,
      bouncedSessions,
      totalPageViews,
      returningVisitors
    ] = await Promise.all([
      db.select({ count: count() }).from(visitorSessions)
        .where(and(gte(visitorSessions.startedAt, daysAgo), notBotSession)),
      db.select({ count: count() }).from(visitorSessions)
        .where(and(
          gte(visitorSessions.startedAt, daysAgo),
          eq(visitorSessions.pageCount, 1),
          notBotSession
        )),
      db.select({ count: count() }).from(pageViews)
        .where(and(gte(pageViews.createdAt, daysAgo), notBotPV)),
      db.select({ 
        count: sql<number>`count(*)` 
      })
        .from(sql`(
          SELECT ${visitorSessions.visitorId}
          FROM ${visitorSessions}
          WHERE ${visitorSessions.startedAt} >= ${daysAgo}
            AND ${visitorSessions.isBot} = false
          GROUP BY ${visitorSessions.visitorId}
          HAVING count(*) > 1
        ) as returning_visitors`),
    ]);

    const sessions = totalSessions[0]?.count || 0;
    const bounced = bouncedSessions[0]?.count || 0;
    const pages = totalPageViews[0]?.count || 0;
    const returning = returningVisitors[0]?.count || 0;

    const uniqueVisitors = await db.select({ count: sql<number>`count(DISTINCT ${visitorSessions.visitorId})` })
      .from(visitorSessions)
      .where(and(gte(visitorSessions.startedAt, daysAgo), notBotSession));

    res.json({
      bounceRate: sessions > 0 ? Math.round((bounced / sessions) * 100) : 0,
      pagesPerSession: sessions > 0 ? Math.round((pages / sessions) * 10) / 10 : 0,
      returningVisitorsPercent: (uniqueVisitors[0]?.count || 0) > 0 
        ? Math.round((returning / (uniqueVisitors[0]?.count || 1)) * 100) 
        : 0,
      totalSessions: sessions,
      bouncedSessions: bounced,
      totalPageViews: pages,
      returningVisitors: returning,
    });
  } catch (error: any) {
    log.error({ err: error }, "Analytics engagement error");
    res.status(500).json({ error: "Failed to fetch engagement metrics" });
  }
});

// Blog-specific analytics - excludes bot traffic
router.get("/analytics/blog-stats", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Exclude bot traffic
    const notBot = eq(pageViews.isBot, false);

    const [
      blogPageViews,
      totalPageViews,
      topBlogPosts,
      avgBlogDuration
    ] = await Promise.all([
      db.select({ count: count() }).from(pageViews)
        .where(and(
          gte(pageViews.createdAt, daysAgo),
          sql`${pageViews.path} LIKE '/blog/%'`,
          notBot
        )),
      db.select({ count: count() }).from(pageViews)
        .where(and(gte(pageViews.createdAt, daysAgo), notBot)),
      db.select({
        path: pageViews.path,
        views: count(),
      })
      .from(pageViews)
      .where(and(
        gte(pageViews.createdAt, daysAgo),
        sql`${pageViews.path} LIKE '/blog/%'`,
        notBot
      ))
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(10),
      db.select({ avg: sql<number>`avg(${pageViews.duration})` })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, daysAgo),
          sql`${pageViews.path} LIKE '/blog/%'`,
          notBot
        )),
    ]);

    const blogViews = blogPageViews[0]?.count || 0;
    const total = totalPageViews[0]?.count || 0;

    res.json({
      blogViews,
      totalViews: total,
      blogViewsPercent: total > 0 ? Math.round((blogViews / total) * 100) : 0,
      avgTimeOnBlog: Math.round(avgBlogDuration[0]?.avg || 0),
      topBlogPosts: topBlogPosts.map(post => ({
        path: post.path,
        title: post.path.replace('/blog/', '').replace(/-/g, ' '),
        views: post.views,
      })),
    });
  } catch (error: any) {
    log.error({ err: error }, "Blog stats error");
    res.status(500).json({ error: "Failed to fetch blog statistics" });
  }
});

// Geographic data (countries) - excludes bot traffic
router.get("/analytics/countries", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const countries = await db.select({
      country: visitorSessions.country,
      sessions: count(),
    })
    .from(visitorSessions)
    .where(and(
      gte(visitorSessions.startedAt, daysAgo),
      sql`${visitorSessions.country} IS NOT NULL`,
      eq(visitorSessions.isBot, false)
    ))
    .groupBy(visitorSessions.country)
    .orderBy(desc(count()))
    .limit(10);

    res.json(countries);
  } catch (error: any) {
    log.error({ err: error }, "Countries error");
    res.status(500).json({ error: "Failed to fetch country data" });
  }
});

// Lead conversion tracking
router.get("/analytics/leads-summary", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const [
      totalLeads,
      verifiedLeads,
      uniqueVisitors,
      leadsBySource
    ] = await Promise.all([
      db.select({ count: count() }).from(resourceLeads)
        .where(gte(resourceLeads.createdAt, daysAgo)),
      db.select({ count: count() }).from(resourceLeads)
        .where(and(
          gte(resourceLeads.createdAt, daysAgo),
          eq(resourceLeads.verified, true)
        )),
      db.select({ count: sql<number>`count(DISTINCT ${visitorSessions.visitorId})` })
        .from(visitorSessions)
        .where(gte(visitorSessions.startedAt, daysAgo)),
      db.select({
        referrer: resourceLeads.referrer,
        count: count(),
      })
      .from(resourceLeads)
      .where(gte(resourceLeads.createdAt, daysAgo))
      .groupBy(resourceLeads.referrer)
      .orderBy(desc(count()))
      .limit(5),
    ]);

    const leads = totalLeads[0]?.count || 0;
    const visitors = uniqueVisitors[0]?.count || 0;

    res.json({
      totalLeads: leads,
      verifiedLeads: verifiedLeads[0]?.count || 0,
      conversionRate: visitors > 0 ? Math.round((leads / visitors) * 10000) / 100 : 0,
      uniqueVisitors: visitors,
      leadsBySource: leadsBySource.map(s => ({
        source: s.referrer || 'Direct',
        count: s.count,
      })),
    });
  } catch (error: any) {
    log.error({ err: error }, "Leads summary error");
    res.status(500).json({ error: "Failed to fetch leads summary" });
  }
});

// Hourly traffic breakdown - shows traffic patterns by hour
router.get("/analytics/hourly", async (req: Request, res: Response) => {
  try {
    const { days = "7" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const hourlyStats = await db.select({
      hour: sql<number>`EXTRACT(HOUR FROM ${pageViews.createdAt})::int`,
      views: count(),
    })
    .from(pageViews)
    .where(gte(pageViews.createdAt, daysAgo))
    .groupBy(sql`EXTRACT(HOUR FROM ${pageViews.createdAt})`)
    .orderBy(sql`EXTRACT(HOUR FROM ${pageViews.createdAt})`);

    // Fill in missing hours with 0
    const fullHourlyData = Array.from({ length: 24 }, (_, hour) => {
      const existing = hourlyStats.find(h => h.hour === hour);
      return { hour, views: existing?.views || 0 };
    });

    res.json(fullHourlyData);
  } catch (error: any) {
    log.error({ err: error }, "Hourly stats error");
    res.status(500).json({ error: "Failed to fetch hourly statistics" });
  }
});

// Browser breakdown analytics
router.get("/analytics/browsers", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const browsers = await db.select({
      browser: pageViews.browser,
      views: count(),
    })
    .from(pageViews)
    .where(gte(pageViews.createdAt, daysAgo))
    .groupBy(pageViews.browser)
    .orderBy(desc(count()))
    .limit(10);

    res.json(browsers);
  } catch (error: any) {
    log.error({ err: error }, "Browser stats error");
    res.status(500).json({ error: "Failed to fetch browser statistics" });
  }
});

// Operating system breakdown
router.get("/analytics/os", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const osStats = await db.select({
      os: pageViews.os,
      views: count(),
    })
    .from(pageViews)
    .where(gte(pageViews.createdAt, daysAgo))
    .groupBy(pageViews.os)
    .orderBy(desc(count()))
    .limit(10);

    res.json(osStats);
  } catch (error: any) {
    log.error({ err: error }, "OS stats error");
    res.status(500).json({ error: "Failed to fetch OS statistics" });
  }
});

// Resource download analytics
router.get("/analytics/downloads", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const [
      totalDownloads,
      downloadsByResource,
      dailyDownloads
    ] = await Promise.all([
      db.select({ count: count() }).from(resourceDownloads)
        .where(gte(resourceDownloads.downloadedAt, daysAgo)),
      db.select({
        resourceId: resourceDownloads.resourceId,
        title: resourceFiles.title,
        downloads: count(),
      })
      .from(resourceDownloads)
      .leftJoin(resourceFiles, eq(resourceDownloads.resourceId, resourceFiles.id))
      .where(gte(resourceDownloads.downloadedAt, daysAgo))
      .groupBy(resourceDownloads.resourceId, resourceFiles.title)
      .orderBy(desc(count()))
      .limit(10),
      db.select({
        date: sql<string>`DATE(${resourceDownloads.downloadedAt})`,
        downloads: count(),
      })
      .from(resourceDownloads)
      .where(gte(resourceDownloads.downloadedAt, daysAgo))
      .groupBy(sql`DATE(${resourceDownloads.downloadedAt})`)
      .orderBy(sql`DATE(${resourceDownloads.downloadedAt})`),
    ]);

    res.json({
      totalDownloads: totalDownloads[0]?.count || 0,
      topResources: downloadsByResource,
      dailyDownloads,
    });
  } catch (error: any) {
    log.error({ err: error }, "Download analytics error");
    res.status(500).json({ error: "Failed to fetch download analytics" });
  }
});

// Weekly comparison - compare this week vs last week
router.get("/analytics/weekly-comparison", async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - today.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const [
      thisWeekViews,
      lastWeekViews,
      thisWeekSessions,
      lastWeekSessions,
      thisWeekLeads,
      lastWeekLeads
    ] = await Promise.all([
      db.select({ count: count() }).from(pageViews)
        .where(gte(pageViews.createdAt, startOfThisWeek)),
      db.select({ count: count() }).from(pageViews)
        .where(and(
          gte(pageViews.createdAt, startOfLastWeek),
          sql`${pageViews.createdAt} < ${startOfThisWeek}`
        )),
      db.select({ count: count() }).from(visitorSessions)
        .where(gte(visitorSessions.startedAt, startOfThisWeek)),
      db.select({ count: count() }).from(visitorSessions)
        .where(and(
          gte(visitorSessions.startedAt, startOfLastWeek),
          sql`${visitorSessions.startedAt} < ${startOfThisWeek}`
        )),
      db.select({ count: count() }).from(resourceLeads)
        .where(gte(resourceLeads.createdAt, startOfThisWeek)),
      db.select({ count: count() }).from(resourceLeads)
        .where(and(
          gte(resourceLeads.createdAt, startOfLastWeek),
          sql`${resourceLeads.createdAt} < ${startOfThisWeek}`
        )),
    ]);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
      thisWeek: {
        pageViews: thisWeekViews[0]?.count || 0,
        sessions: thisWeekSessions[0]?.count || 0,
        leads: thisWeekLeads[0]?.count || 0,
      },
      lastWeek: {
        pageViews: lastWeekViews[0]?.count || 0,
        sessions: lastWeekSessions[0]?.count || 0,
        leads: lastWeekLeads[0]?.count || 0,
      },
      changes: {
        pageViews: calculateChange(thisWeekViews[0]?.count || 0, lastWeekViews[0]?.count || 0),
        sessions: calculateChange(thisWeekSessions[0]?.count || 0, lastWeekSessions[0]?.count || 0),
        leads: calculateChange(thisWeekLeads[0]?.count || 0, lastWeekLeads[0]?.count || 0),
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Weekly comparison error");
    res.status(500).json({ error: "Failed to fetch weekly comparison" });
  }
});

// Real-time active sessions
router.get("/analytics/realtime", async (req: Request, res: Response) => {
  try {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const [activeSessions, activePages] = await Promise.all([
      db.select({ count: count() }).from(visitorSessions)
        .where(sql`${visitorSessions.endedAt} IS NULL OR ${visitorSessions.endedAt} >= ${fiveMinutesAgo}`),
      db.select({
        path: pageViews.path,
        count: count(),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, fiveMinutesAgo))
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(5),
    ]);

    res.json({
      activeNow: activeSessions[0]?.count || 0,
      activePages,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error({ err: error }, "Realtime error");
    res.status(500).json({ error: "Failed to fetch realtime data" });
  }
});

// ============ SCHEDULED SCANS ============

// Get scheduler status
router.get("/scheduled-scans/status", async (req: Request, res: Response) => {
  try {
    const status = getSchedulerStatus();
    res.json(status);
  } catch (error: any) {
    log.error({ err: error }, "Scheduler status error");
    res.status(500).json({ error: "Failed to fetch scheduler status" });
  }
});

// Get scheduled scan history
router.get("/scheduled-scans", async (req: Request, res: Response) => {
  try {
    const { limit = "20" } = req.query;
    const scans = await getScheduledScans(parseInt(limit as string));
    res.json(scans);
  } catch (error: any) {
    log.error({ err: error }, "Scheduled scans error");
    res.status(500).json({ error: "Failed to fetch scheduled scans" });
  }
});

// Manually trigger a bulk scan
router.post("/scheduled-scans/run-now", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const result = await runScheduledScan(adminId, "manual_bulk");
    
    if (result.success) {
      await auditLog(adminId, "BULK_SCAN_TRIGGERED", "scheduled_scans", result.scanId, undefined, req);
      res.json({ success: true, scanId: result.scanId });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    log.error({ err: error }, "Bulk scan error");
    res.status(500).json({ error: "Failed to start bulk scan" });
  }
});

// Trigger comprehensive weekly scan (with AI detection, plagiarism, SEO analysis, email notifications)
router.post("/scheduled-scans/comprehensive-weekly", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { async: runAsync = true } = req.body;
    
    await auditLog(adminId, "COMPREHENSIVE_WEEKLY_SCAN_TRIGGERED", "scheduled_scans", undefined, undefined, req);
    
    if (runAsync) {
      res.json({ 
        success: true, 
        message: "Comprehensive weekly scan started. You will receive an email report when complete.",
        status: "running"
      });
      
      runComprehensiveWeeklyScan(adminId).then(result => {
        if (result.success) {
          log.info("Comprehensive weekly scan completed successfully");
        } else {
          log.error({ err: result.error }, "Comprehensive weekly scan failed");
        }
      }).catch(error => {
        log.error({ err: error }, "Comprehensive weekly scan error");
      });
    } else {
      const result = await runComprehensiveWeeklyScan(adminId);
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Comprehensive weekly scan completed successfully",
          status: "completed",
          summary: result.summary
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error,
          status: "failed"
        });
      }
    }
  } catch (error: any) {
    log.error({ err: error }, "Comprehensive weekly scan error");
    res.status(500).json({ error: "Failed to start comprehensive weekly scan" });
  }
});

// Configure scheduler settings
router.post("/scheduled-scans/configure", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { enabled, interval } = req.body;
    
    const result = configureScheduler({ enabled, interval });
    
    await auditLog(adminId, "SCHEDULER_CONFIGURED", "scheduled_scans", undefined, 
      JSON.stringify({ enabled, interval }), req);
    
    res.json(result);
  } catch (error: any) {
    log.error({ err: error }, "Configure scheduler error");
    res.status(500).json({ error: "Failed to configure scheduler" });
  }
});

// Cancel running scan
router.post("/scheduled-scans/cancel", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const result = cancelCurrentScan();
    
    if (result.success) {
      await auditLog(adminId, "SCAN_CANCELLED", "scheduled_scans", undefined, undefined, req);
    }
    
    res.json(result);
  } catch (error: any) {
    log.error({ err: error }, "Cancel scan error");
    res.status(500).json({ error: "Failed to cancel scan" });
  }
});

// ============ AUDIT LOGS ============

router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { limit = "100" } = req.query;

    const logs = await db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(parseInt(limit as string));

    await auditLog(adminId, "AUDIT_LOGS_VIEWED", "audit_logs", undefined, JSON.stringify({ limit }), req);

    res.json(logs);
  } catch (error: any) {
    log.error({ err: error }, "Audit logs error");
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// ============ SECURITY MANAGEMENT ============

// MFA Setup - Get TOTP secret for MFA setup
router.get("/mfa/setup", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    const { secret, qrCodeUrl } = await AdminSecurity.generateTotpSecret(adminId);
    
    await auditLog(adminId, "MFA_SETUP_INITIATED", "mfa", undefined, undefined, req);
    
    res.json({ secret, qrCodeUrl });
  } catch (error: any) {
    log.error({ err: error }, "MFA setup error");
    res.status(400).json({ error: error.message });
  }
});

// MFA Setup (POST - legacy/alternative)
router.post("/mfa/setup", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    const result = await AdminSecurity.generateTotpSecret(adminId);
    await auditLog(adminId, "MFA_SETUP_INITIATED", "mfa", undefined, undefined, req);
    res.json(result);
  } catch (error: any) {
    log.error({ err: error }, "MFA setup error");
    res.status(500).json({ error: "Failed to set up MFA" });
  }
});

// Verify TOTP during setup
router.post("/mfa/verify-setup", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) throw new Error("TOTP token required");
    
    const adminId = await getAdminIdFromDb(req);
    await AdminSecurity.verifyTotpSetup(adminId, token);
    
    await auditLog(adminId, "MFA_ENABLED", undefined, undefined, undefined, req);
    
    res.json({ success: true, message: "MFA enabled successfully" });
  } catch (error: any) {
    log.error({ err: error }, "MFA verify setup error");
    res.status(400).json({ error: error.message });
  }
});

// Disable MFA
router.post("/mfa/disable", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    await AdminSecurity.disableMfa(adminId);
    
    await auditLog(adminId, "MFA_DISABLED", undefined, undefined, undefined, req);
    
    res.json({ success: true, message: "MFA disabled" });
  } catch (error: any) {
    log.error({ err: error }, "MFA disable error");
    res.status(400).json({ error: error.message });
  }
});

router.get("/mfa/status", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    const mfaSettings = await AdminSecurity.getMfaSettings(adminId);
    res.json({ 
      enabled: !!mfaSettings?.totpEnabled,
      hasBackupCodes: mfaSettings?.hasBackupCodes ?? false,
      backupCodesRemaining: mfaSettings?.backupCodesRemaining ?? 0
    });
  } catch (error: any) {
    log.error({ err: error }, "MFA status error");
    res.status(500).json({ error: "Failed to get MFA status" });
  }
});

// Generate backup codes
router.post("/mfa/generate-backup-codes", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    const codes = await AdminSecurity.generateBackupCodes(adminId);
    
    await auditLog(adminId, "BACKUP_CODES_GENERATED", "mfa", undefined, undefined, req);
    
    res.json({ codes });
  } catch (error: any) {
    log.error({ err: error }, "Generate backup codes error");
    res.status(400).json({ error: error.message });
  }
});

router.post("/mfa/regenerate-backup-codes", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    const backupCodes = await AdminSecurity.generateBackupCodes(adminId);
    
    await auditLog(adminId, "MFA_BACKUP_CODES_REGENERATED", "mfa", undefined, undefined, req);
    res.json({ success: true, backupCodes });
  } catch (error: any) {
    log.error({ err: error }, "Regenerate backup codes error");
    res.status(500).json({ error: "Failed to regenerate backup codes" });
  }
});

// ============ Security Settings ============

router.get("/security/settings", async (req: Request, res: Response) => {
  try {
    const settings = await AdminSecurity.getSecuritySettings();
    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/security/settings", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    const settings = await AdminSecurity.updateSecuritySettings(req.body, adminId);
    
    await auditLog(adminId, "SECURITY_SETTINGS_UPDATED", undefined, undefined, JSON.stringify(req.body), req);
    
    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Keep PATCH for backwards compatibility
router.patch("/security/settings", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    const updatedSettings = await AdminSecurity.updateSecuritySettings(req.body, adminId);
    
    await auditLog(adminId, "SECURITY_SETTINGS_UPDATED", undefined, undefined, JSON.stringify(req.body), req);
    res.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    log.error({ err: error }, "Update security settings error");
    res.status(500).json({ error: "Failed to update security settings" });
  }
});

// ============ IP Allowlist Management ============

router.get("/security/ip-allowlist", async (req: Request, res: Response) => {
  try {
    const allowlist = await AdminSecurity.getIpAllowlist();
    res.json(allowlist);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/security/ip-allowlist", async (req: Request, res: Response) => {
  try {
    const { ipAddress, description } = req.body;
    if (!ipAddress) throw new Error("IP address required");
    
    const adminId = await getAdminIdFromDb(req);
    const entry = await AdminSecurity.addIpToAllowlist(ipAddress, description || "", adminId);
    
    await auditLog(adminId, "IP_ADDED_ALLOWLIST", undefined, undefined, `IP: ${ipAddress}`, req);
    
    res.json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/security/ip-allowlist/:id", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    await AdminSecurity.removeIpFromAllowlist(req.params.id);
    
    await auditLog(adminId, "IP_REMOVED_ALLOWLIST", undefined, req.params.id, undefined, req);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============ Authorized Emails Whitelist ============

router.get("/security/authorized-emails", async (req: Request, res: Response) => {
  try {
    const emails = await AdminSecurity.getAuthorizedEmails();
    res.json(emails);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/security/authorized-emails", async (req: Request, res: Response) => {
  try {
    const { email, description } = req.body;
    if (!email) throw new Error("Email address required");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }
    
    const adminId = await getAdminIdFromDb(req);
    const entry = await AdminSecurity.addAuthorizedEmail(email, description || "", adminId);
    
    await auditLog(adminId, "EMAIL_ADDED_WHITELIST", undefined, undefined, `Email: ${email}`, req);
    
    res.json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/security/authorized-emails/:id", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    await AdminSecurity.removeAuthorizedEmail(req.params.id);
    
    await auditLog(adminId, "EMAIL_REMOVED_WHITELIST", undefined, req.params.id, undefined, req);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============ Break-Glass Emergency Access ============

router.post("/security/emergency-access/request", async (req: Request, res: Response) => {
  try {
    const { justification } = req.body;
    if (!justification || String(justification).trim().length < 10) {
      return res.status(400).json({ error: "A justification of at least 10 characters is required" });
    }
    const adminId = await getAdminIdFromDb(req);
    const ipAddress = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";

    const { token, id, expiresAt } = await AdminSecurity.requestEmergencyAccess(adminId, justification.trim(), ipAddress);

    await auditLog(adminId, "EMERGENCY_ACCESS_REQUESTED", undefined, id, justification, req);

    res.json({ token, id, expiresAt, ttlMinutes: 15 });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login History
router.get("/security/login-history", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const adminId = req.query.adminId as string | undefined;
    const history = await AdminSecurity.getLoginHistory(adminId, limit);
    res.json(history);
  } catch (error: any) {
    log.error({ err: error }, "Get login history error");
    res.status(500).json({ error: "Failed to get login history" });
  }
});

// Get current admin's login history
router.get("/security/my-login-history", async (req: Request, res: Response) => {
  try {
    const adminId = await getAdminIdFromDb(req);
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await AdminSecurity.getLoginHistory(adminId, limit);
    res.json(history);
  } catch (error: any) {
    log.error({ err: error }, "Get my login history error");
    res.status(500).json({ error: "Failed to get login history" });
  }
});

// Check current IP against allowlist
router.get("/security/check-my-ip", async (req: Request, res: Response) => {
  try {
    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
    const isAllowed = await AdminSecurity.checkIpAllowed(ipAddress);
    const ipAllowlistEnabled = await AdminSecurity.isIpAllowlistEnabled();
    
    res.json({ 
      ipAddress, 
      isAllowed, 
      ipAllowlistEnabled,
      message: !ipAllowlistEnabled ? 'IP allowlist is disabled' : (isAllowed ? 'Your IP is allowed' : 'Your IP is not in the allowlist')
    });
  } catch (error: any) {
    log.error({ err: error }, "Check IP error");
    res.status(500).json({ error: "Failed to check IP" });
  }
});


// Marketing Assets CRUD Operations
router.get("/marketing-assets", async (req: Request, res: Response) => {
  try {
    const { category, type } = req.query;
    
    const conditions = [];
    if (category) {
      conditions.push(eq(marketingAssets.category, category as string));
    }
    if (type) {
      conditions.push(eq(marketingAssets.type, type as string));
    }
    
    const query = conditions.length > 0
      ? db.select().from(marketingAssets).where(and(...conditions))
      : db.select().from(marketingAssets);
    
    const assets = await query.orderBy(desc(marketingAssets.createdAt));
    res.json(assets);
  } catch (error: any) {
    log.error({ err: error }, "Get marketing assets error");
    res.status(500).json({ error: "Failed to fetch marketing assets" });
  }
});

router.get("/marketing-assets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [asset] = await db.select().from(marketingAssets).where(eq(marketingAssets.id, id));
    
    if (!asset) {
      return res.status(404).json({ error: "Marketing asset not found" });
    }
    
    res.json(asset);
  } catch (error: any) {
    log.error({ err: error }, "Get marketing asset error");
    res.status(500).json({ error: "Failed to fetch marketing asset" });
  }
});

router.post("/marketing-assets", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    log.info({ body: req.body }, "Creating marketing asset");
    
    const parsed = insertMarketingAssetDbSchema.safeParse(req.body);
    
    if (!parsed.success) {
      log.error({ fieldErrors: parsed.error.flatten().fieldErrors }, "Validation failed");
      return res.status(400).json({ 
        error: "Invalid marketing asset data",
        details: parsed.error.flatten().fieldErrors 
      });
    }
    
    log.info({ data: parsed.data }, "Parsed marketing asset data");
    
    const [created] = await db.insert(marketingAssets).values({
      ...parsed.data,
      uploadedBy: adminId,
    }).returning();
    
    await auditLog(adminId, "CREATE_MARKETING_ASSET", "marketing_asset", created.id, 
      `Created marketing asset: ${created.name}`, req);
    
    log.info({ assetId: created.id }, "Created marketing asset");
    res.status(201).json(created);
  } catch (error: any) {
    log.error({ err: error }, "Create marketing asset error");
    res.status(500).json({ error: "Failed to create marketing asset" });
  }
});

router.patch("/marketing-assets/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    
    const [existing] = await db.select().from(marketingAssets).where(eq(marketingAssets.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Marketing asset not found" });
    }
    
    // Merge existing data with updates (only update fields that are explicitly provided)
    // Convert empty strings to null for nullable text fields
    const updates: Record<string, any> = { updatedAt: new Date() };
    
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description || null;
    if (req.body.type !== undefined) updates.type = req.body.type;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.platform !== undefined) updates.platform = req.body.platform || null;
    if (req.body.fileUrl !== undefined) updates.fileUrl = req.body.fileUrl;
    if (req.body.thumbnailUrl !== undefined) updates.thumbnailUrl = req.body.thumbnailUrl || null;
    if (req.body.tags !== undefined) updates.tags = req.body.tags;
    if (req.body.featured !== undefined) updates.featured = req.body.featured;
    if (req.body.metadata !== undefined) updates.metadata = req.body.metadata || null;
    
    const [updated] = await db.update(marketingAssets)
      .set(updates)
      .where(eq(marketingAssets.id, id))
      .returning();
    
    await auditLog(adminId, "UPDATE_MARKETING_ASSET", "marketing_asset", id,
      `Updated marketing asset: ${updated.name}`, req);
    
    res.json(updated);
  } catch (error: any) {
    log.error({ err: error }, "Update marketing asset error");
    res.status(500).json({ error: "Failed to update marketing asset" });
  }
});

router.delete("/marketing-assets/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    
    const [existing] = await db.select().from(marketingAssets).where(eq(marketingAssets.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Marketing asset not found" });
    }
    
    await db.delete(marketingAssets).where(eq(marketingAssets.id, id));
    
    await auditLog(adminId, "DELETE_MARKETING_ASSET", "marketing_asset", id,
      `Deleted marketing asset: ${existing.name}`, req);
    
    res.json({ success: true, message: "Marketing asset deleted" });
  } catch (error: any) {
    log.error({ err: error }, "Delete marketing asset error");
    res.status(500).json({ error: "Failed to delete marketing asset" });
  }
});

router.post("/marketing-assets/:id/toggle-featured", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { id } = req.params;
    
    const [existing] = await db.select().from(marketingAssets).where(eq(marketingAssets.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Marketing asset not found" });
    }
    
    const [updated] = await db.update(marketingAssets)
      .set({ featured: !existing.featured, updatedAt: new Date() })
      .where(eq(marketingAssets.id, id))
      .returning();
    
    await auditLog(adminId, "TOGGLE_FEATURED_MARKETING_ASSET", "marketing_asset", id,
      `Toggled featured status for: ${updated.name} (now ${updated.featured ? 'featured' : 'not featured'})`, req);
    
    res.json(updated);
  } catch (error: any) {
    log.error({ err: error }, "Toggle featured error");
    res.status(500).json({ error: "Failed to toggle featured status" });
  }
});

// Test email endpoint - validates Microsoft Graph API configuration
router.post("/test-email", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { email } = req.body;
    
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email address is required" });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email address format" });
    }
    
    const result = await AdminSecurity.sendTestEmail(email);
    
    await auditLog(adminId, "TEST_EMAIL_SENT", "email", undefined,
      `Test email sent to: ${email} - Result: ${result.success ? 'Success' : 'Failed'}`, req);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    log.error({ err: error }, "Test email error");
    res.status(500).json({ error: error.message || "Failed to send test email" });
  }
});

// ============ DOWNLOAD ANALYTICS ============

router.get("/downloads/summary", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);

    const [
      totalDownloadsResult,
      uniqueResourcesResult,
      verifiedDownloadsResult,
      uniqueVerifiedUsersResult
    ] = await Promise.all([
      db.select({ count: count() }).from(resourceDownloads),
      db.select({ count: sql<number>`COUNT(DISTINCT ${resourceDownloads.resourceId})` }).from(resourceDownloads),
      db.select({ count: count() })
        .from(resourceDownloads)
        .innerJoin(resourceLeads, eq(resourceDownloads.leadId, resourceLeads.id))
        .where(eq(resourceLeads.verified, true)),
      db.select({ count: sql<number>`COUNT(DISTINCT ${resourceDownloads.leadId})` })
        .from(resourceDownloads)
        .innerJoin(resourceLeads, eq(resourceDownloads.leadId, resourceLeads.id))
        .where(eq(resourceLeads.verified, true)),
    ]);

    await auditLog(adminId, "DOWNLOADS_SUMMARY_VIEWED", "downloads", undefined, undefined, req);

    res.json({
      totalDownloads: totalDownloadsResult[0]?.count || 0,
      uniqueResources: uniqueResourcesResult[0]?.count || 0,
      verifiedDownloads: verifiedDownloadsResult[0]?.count || 0,
      uniqueVerifiedUsers: uniqueVerifiedUsersResult[0]?.count || 0,
    });
  } catch (error: any) {
    log.error({ err: error }, "Downloads summary error");
    res.status(500).json({ error: "Failed to fetch downloads summary" });
  }
});

router.get("/downloads/by-resource", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);

    const downloadsByResource = await db
      .select({
        resourceId: resourceDownloads.resourceId,
        title: resourceFiles.title,
        category: resourceFiles.category,
        totalDownloads: sql<number>`COUNT(*)::int`,
        verifiedDownloads: sql<number>`COUNT(CASE WHEN ${resourceLeads.verified} = true THEN 1 END)::int`,
        lastDownloadedAt: sql<string>`MAX(${resourceDownloads.downloadedAt})`,
      })
      .from(resourceDownloads)
      .innerJoin(resourceFiles, eq(resourceDownloads.resourceId, resourceFiles.id))
      .innerJoin(resourceLeads, eq(resourceDownloads.leadId, resourceLeads.id))
      .groupBy(resourceDownloads.resourceId, resourceFiles.title, resourceFiles.category)
      .orderBy(sql`COUNT(*) DESC`);

    await auditLog(adminId, "DOWNLOADS_BY_RESOURCE_VIEWED", "downloads", undefined, undefined, req);

    res.json(downloadsByResource);
  } catch (error: any) {
    log.error({ err: error }, "Downloads by resource error");
    res.status(500).json({ error: "Failed to fetch downloads by resource" });
  }
});

router.get("/downloads/history", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { 
      limit: limitParam = "50", 
      offset: offsetParam = "0", 
      resourceId, 
      verifiedOnly 
    } = req.query;

    const limitNum = Math.min(Math.max(1, parseInt(limitParam as string) || 50), 200);
    const offsetNum = Math.max(0, parseInt(offsetParam as string) || 0);

    const conditions = [];
    if (resourceId && typeof resourceId === "string") {
      conditions.push(eq(resourceDownloads.resourceId, resourceId));
    }
    if (verifiedOnly === "true") {
      conditions.push(eq(resourceLeads.verified, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const downloads = await db
      .select({
        id: resourceDownloads.id,
        resourceId: resourceDownloads.resourceId,
        resourceTitle: resourceFiles.title,
        leadId: resourceDownloads.leadId,
        firstName: resourceLeads.firstName,
        lastName: resourceLeads.lastName,
        email: resourceLeads.email,
        company: resourceLeads.company,
        verified: resourceLeads.verified,
        downloadedAt: resourceDownloads.downloadedAt,
        ipAddress: resourceDownloads.ipAddress,
      })
      .from(resourceDownloads)
      .innerJoin(resourceFiles, eq(resourceDownloads.resourceId, resourceFiles.id))
      .innerJoin(resourceLeads, eq(resourceDownloads.leadId, resourceLeads.id))
      .where(whereClause)
      .orderBy(desc(resourceDownloads.downloadedAt))
      .limit(limitNum)
      .offset(offsetNum);

    const [totalResult] = await db
      .select({ count: count() })
      .from(resourceDownloads)
      .innerJoin(resourceFiles, eq(resourceDownloads.resourceId, resourceFiles.id))
      .innerJoin(resourceLeads, eq(resourceDownloads.leadId, resourceLeads.id))
      .where(whereClause);

    await auditLog(adminId, "DOWNLOADS_HISTORY_VIEWED", "downloads", undefined, 
      JSON.stringify({ limit: limitNum, offset: offsetNum, resourceId, verifiedOnly }), req);

    res.json({
      downloads,
      pagination: {
        total: totalResult?.count || 0,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + downloads.length < (totalResult?.count || 0),
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Downloads history error");
    res.status(500).json({ error: "Failed to fetch downloads history" });
  }
});

// ============ GDPR COMPLIANCE ============

router.get("/gdpr/retention-config", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const config = await getRetentionConfig();
    
    await auditLog(adminId, "GDPR_RETENTION_CONFIG_VIEWED", "gdpr", undefined, undefined, req);
    
    res.json(config);
  } catch (error: any) {
    log.error({ err: error }, "GDPR retention config error");
    res.status(500).json({ error: "Failed to fetch retention configuration" });
  }
});

router.post("/gdpr/erasure-request", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { email, reason } = req.body;
    
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    
    const actor = createActorFromRequest(req);
    const result = await processErasureRequest(email, actor, req);
    
    await auditLog(
      adminId, 
      "GDPR_ERASURE_PROCESSED", 
      "gdpr", 
      undefined, 
      JSON.stringify({ email, totalDeleted: result.totalDeleted, deletedRecords: result.deletedRecords }), 
      req
    );
    
    try {
      await logAuditEvent(
        actor,
        "DELETE",
        "gdpr_request",
        email,
        { email },
        { erasureResult: result, reason: reason || "Admin-initiated erasure request" },
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }
    
    res.json(result);
  } catch (error: any) {
    log.error({ err: error }, "GDPR erasure request error");
    res.status(500).json({ error: "Failed to process erasure request" });
  }
});

router.post("/gdpr/run-cleanup", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const actor = createActorFromRequest(req);
    const results = await runRetentionCleanup(actor, req);
    
    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
    
    await auditLog(
      adminId, 
      "GDPR_CLEANUP_EXECUTED", 
      "gdpr", 
      undefined, 
      JSON.stringify({ totalDeleted, results: results.map(r => ({ resourceType: r.resourceType, deletedCount: r.deletedCount })) }), 
      req
    );
    
    res.json(results);
  } catch (error: any) {
    log.error({ err: error }, "GDPR cleanup error");
    res.status(500).json({ error: "Failed to run retention cleanup" });
  }
});

router.get("/gdpr/user-data/:email", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { email } = req.params;
    
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    
    const userData = await findUserData(email);
    
    await auditLog(
      adminId, 
      "GDPR_USER_DATA_ACCESSED", 
      "gdpr", 
      undefined, 
      JSON.stringify({ email, recordsFound: Object.values(userData).flat().length }), 
      req
    );
    
    res.json(userData);
  } catch (error: any) {
    log.error({ err: error }, "GDPR user data error");
    res.status(500).json({ error: "Failed to find user data" });
  }
});

router.get("/gdpr/export-data/:email", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { email } = req.params;
    
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    
    const exportData = await exportUserData(email);
    
    await auditLog(
      adminId, 
      "GDPR_DATA_EXPORTED", 
      "gdpr", 
      undefined, 
      JSON.stringify({ email }), 
      req
    );
    
    try {
      await logAuditEvent(
        createActorFromRequest(req),
        "EXPORT",
        "gdpr_request",
        email,
        null,
        { email, exportTimestamp: new Date().toISOString() },
        req
      );
    } catch (auditError) {
      log.error({ err: auditError }, "Audit logging failed");
    }
    
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=user-data-export-${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    res.json(exportData);
  } catch (error: any) {
    log.error({ err: error }, "GDPR export error");
    res.status(500).json({ error: "Failed to export user data" });
  }
});

// ============================================
// OPERATIONS & SYSTEM HEALTH ENDPOINTS
// ============================================

router.get("/operations/health", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const health = await getSystemHealth();
    
    await auditLog(adminId, "SYSTEM_HEALTH_VIEWED", "operations", undefined, undefined, req);
    
    res.json(health);
  } catch (error: any) {
    log.error({ err: error }, "Health check error");
    res.status(500).json({ error: "Failed to get system health" });
  }
});

router.get("/operations/request-logs", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const { limit, offset, method, statusCode, path } = req.query;
    
    const logs = getRequestLogs({
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      method: method as string | undefined,
      statusCode: statusCode ? parseInt(statusCode as string) : undefined,
      path: path as string | undefined,
    });
    
    res.json(logs);
  } catch (error: any) {
    log.error({ err: error }, "Request logs error");
    res.status(500).json({ error: "Failed to get request logs" });
  }
});

router.get("/operations/request-stats", async (req: Request, res: Response) => {
  try {
    const stats = getRequestStats();
    res.json(stats);
  } catch (error: any) {
    log.error({ err: error }, "Request stats error");
    res.status(500).json({ error: "Failed to get request stats" });
  }
});

// ============================================
// SEO ENDPOINTS
// ============================================

router.get("/operations/seo/status", async (req: Request, res: Response) => {
  try {
    const status = getSeoStatus();
    res.json(status);
  } catch (error: any) {
    log.error({ err: error }, "SEO status error");
    res.status(500).json({ error: "Failed to get SEO status" });
  }
});

router.get("/operations/seo/sitemap", async (req: Request, res: Response) => {
  try {
    const sitemap = await generateSitemapWithTracking();
    res.setHeader("Content-Type", "application/xml");
    res.send(sitemap);
  } catch (error: any) {
    log.error({ err: error }, "Sitemap generation error");
    res.status(500).json({ error: "Failed to generate sitemap" });
  }
});

router.get("/operations/seo/robots", async (req: Request, res: Response) => {
  try {
    const config = getRobotsConfig();
    res.json(config);
  } catch (error: any) {
    log.error({ err: error }, "Robots config error");
    res.status(500).json({ error: "Failed to get robots config" });
  }
});

router.patch("/operations/seo/robots", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const updates = req.body;
    
    const config = setRobotsConfig(updates);
    
    await auditLog(adminId, "ROBOTS_CONFIG_UPDATED", "operations", undefined, JSON.stringify(updates), req);
    
    res.json(config);
  } catch (error: any) {
    log.error({ err: error }, "Robots config update error");
    res.status(500).json({ error: "Failed to update robots config" });
  }
});

// ============================================
// AI CONFIGURATION MANAGEMENT ROUTES
// ============================================

// System Prompts
router.get("/ai-config/system-prompts", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const prompts = await db.select().from(fcAiSystemPrompts).orderBy(desc(fcAiSystemPrompts.createdAt));
    await auditLog(adminId, "AI_SYSTEM_PROMPTS_VIEWED", "ai_config", undefined, undefined, req);
    res.json(prompts);
  } catch (error) {
    log.error({ err: error }, "Error fetching system prompts");
    res.status(500).json({ error: "Failed to fetch system prompts" });
  }
});

router.get("/ai-config/system-prompts/:id", async (req: Request, res: Response) => {
  try {
    const [prompt] = await db.select().from(fcAiSystemPrompts).where(eq(fcAiSystemPrompts.id, req.params.id));
    if (!prompt) {
      res.status(404).json({ error: "System prompt not found" });
      return;
    }
    res.json(prompt);
  } catch (error) {
    log.error({ err: error }, "Error fetching system prompt");
    res.status(500).json({ error: "Failed to fetch system prompt" });
  }
});

router.post("/ai-config/system-prompts", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const parsed = insertFcAiSystemPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      return;
    }
    const [created] = await db.insert(fcAiSystemPrompts).values(parsed.data).returning();
    await auditLog(adminId, "AI_SYSTEM_PROMPT_CREATED", "ai_config", created.id, JSON.stringify(parsed.data), req);
    res.status(201).json(created);
  } catch (error) {
    log.error({ err: error }, "Error creating system prompt");
    res.status(500).json({ error: "Failed to create system prompt" });
  }
});

router.patch("/ai-config/system-prompts/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [updated] = await db.update(fcAiSystemPrompts)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(fcAiSystemPrompts.id, req.params.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "System prompt not found" });
      return;
    }
    await auditLog(adminId, "AI_SYSTEM_PROMPT_UPDATED", "ai_config", updated.id, JSON.stringify(req.body), req);
    res.json(updated);
  } catch (error) {
    log.error({ err: error }, "Error updating system prompt");
    res.status(500).json({ error: "Failed to update system prompt" });
  }
});

router.delete("/ai-config/system-prompts/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [deleted] = await db.delete(fcAiSystemPrompts).where(eq(fcAiSystemPrompts.id, req.params.id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "System prompt not found" });
      return;
    }
    await auditLog(adminId, "AI_SYSTEM_PROMPT_DELETED", "ai_config", deleted.id, undefined, req);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error deleting system prompt");
    res.status(500).json({ error: "Failed to delete system prompt" });
  }
});

// Guardrails
router.get("/ai-config/guardrails", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const guardrails = await db.select().from(fcAiGuardrails).orderBy(desc(fcAiGuardrails.createdAt));
    await auditLog(adminId, "AI_GUARDRAILS_VIEWED", "ai_config", undefined, undefined, req);
    res.json(guardrails);
  } catch (error) {
    log.error({ err: error }, "Error fetching guardrails");
    res.status(500).json({ error: "Failed to fetch guardrails" });
  }
});

router.get("/ai-config/guardrails/:id", async (req: Request, res: Response) => {
  try {
    const [guardrail] = await db.select().from(fcAiGuardrails).where(eq(fcAiGuardrails.id, req.params.id));
    if (!guardrail) {
      res.status(404).json({ error: "Guardrail not found" });
      return;
    }
    res.json(guardrail);
  } catch (error) {
    log.error({ err: error }, "Error fetching guardrail");
    res.status(500).json({ error: "Failed to fetch guardrail" });
  }
});

router.post("/ai-config/guardrails", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const parsed = insertFcAiGuardrailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      return;
    }
    const [created] = await db.insert(fcAiGuardrails).values(parsed.data).returning();
    await auditLog(adminId, "AI_GUARDRAIL_CREATED", "ai_config", created.id, JSON.stringify(parsed.data), req);
    res.status(201).json(created);
  } catch (error) {
    log.error({ err: error }, "Error creating guardrail");
    res.status(500).json({ error: "Failed to create guardrail" });
  }
});

router.patch("/ai-config/guardrails/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [updated] = await db.update(fcAiGuardrails)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(fcAiGuardrails.id, req.params.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Guardrail not found" });
      return;
    }
    await auditLog(adminId, "AI_GUARDRAIL_UPDATED", "ai_config", updated.id, JSON.stringify(req.body), req);
    res.json(updated);
  } catch (error) {
    log.error({ err: error }, "Error updating guardrail");
    res.status(500).json({ error: "Failed to update guardrail" });
  }
});

router.delete("/ai-config/guardrails/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [deleted] = await db.delete(fcAiGuardrails).where(eq(fcAiGuardrails.id, req.params.id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Guardrail not found" });
      return;
    }
    await auditLog(adminId, "AI_GUARDRAIL_DELETED", "ai_config", deleted.id, undefined, req);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error deleting guardrail");
    res.status(500).json({ error: "Failed to delete guardrail" });
  }
});

// Grounding Rules
router.get("/ai-config/grounding-rules", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const rules = await db.select().from(fcAiGroundingRules).orderBy(desc(fcAiGroundingRules.createdAt));
    await auditLog(adminId, "AI_GROUNDING_RULES_VIEWED", "ai_config", undefined, undefined, req);
    res.json(rules);
  } catch (error) {
    log.error({ err: error }, "Error fetching grounding rules");
    res.status(500).json({ error: "Failed to fetch grounding rules" });
  }
});

router.get("/ai-config/grounding-rules/:id", async (req: Request, res: Response) => {
  try {
    const [rule] = await db.select().from(fcAiGroundingRules).where(eq(fcAiGroundingRules.id, req.params.id));
    if (!rule) {
      res.status(404).json({ error: "Grounding rule not found" });
      return;
    }
    res.json(rule);
  } catch (error) {
    log.error({ err: error }, "Error fetching grounding rule");
    res.status(500).json({ error: "Failed to fetch grounding rule" });
  }
});

router.post("/ai-config/grounding-rules", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const parsed = insertFcAiGroundingRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      return;
    }
    const [created] = await db.insert(fcAiGroundingRules).values(parsed.data).returning();
    await auditLog(adminId, "AI_GROUNDING_RULE_CREATED", "ai_config", created.id, JSON.stringify(parsed.data), req);
    res.status(201).json(created);
  } catch (error) {
    log.error({ err: error }, "Error creating grounding rule");
    res.status(500).json({ error: "Failed to create grounding rule" });
  }
});

router.patch("/ai-config/grounding-rules/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [updated] = await db.update(fcAiGroundingRules)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(fcAiGroundingRules.id, req.params.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Grounding rule not found" });
      return;
    }
    await auditLog(adminId, "AI_GROUNDING_RULE_UPDATED", "ai_config", updated.id, JSON.stringify(req.body), req);
    res.json(updated);
  } catch (error) {
    log.error({ err: error }, "Error updating grounding rule");
    res.status(500).json({ error: "Failed to update grounding rule" });
  }
});

router.delete("/ai-config/grounding-rules/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [deleted] = await db.delete(fcAiGroundingRules).where(eq(fcAiGroundingRules.id, req.params.id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Grounding rule not found" });
      return;
    }
    await auditLog(adminId, "AI_GROUNDING_RULE_DELETED", "ai_config", deleted.id, undefined, req);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error deleting grounding rule");
    res.status(500).json({ error: "Failed to delete grounding rule" });
  }
});

// Knowledge Base
router.get("/ai-config/knowledge-base", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const entries = await db.select().from(fcAiKnowledgeBase).orderBy(desc(fcAiKnowledgeBase.createdAt));
    await auditLog(adminId, "AI_KNOWLEDGE_BASE_VIEWED", "ai_config", undefined, undefined, req);
    res.json(entries);
  } catch (error) {
    log.error({ err: error }, "Error fetching knowledge base");
    res.status(500).json({ error: "Failed to fetch knowledge base" });
  }
});

router.get("/ai-config/knowledge-base/:id", async (req: Request, res: Response) => {
  try {
    const [entry] = await db.select().from(fcAiKnowledgeBase).where(eq(fcAiKnowledgeBase.id, req.params.id));
    if (!entry) {
      res.status(404).json({ error: "Knowledge base entry not found" });
      return;
    }
    res.json(entry);
  } catch (error) {
    log.error({ err: error }, "Error fetching knowledge base entry");
    res.status(500).json({ error: "Failed to fetch knowledge base entry" });
  }
});

router.post("/ai-config/knowledge-base", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const parsed = insertFcAiKnowledgeBaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      return;
    }
    const [created] = await db.insert(fcAiKnowledgeBase).values(parsed.data).returning();
    await auditLog(adminId, "AI_KNOWLEDGE_BASE_CREATED", "ai_config", created.id, JSON.stringify(parsed.data), req);
    res.status(201).json(created);
  } catch (error) {
    log.error({ err: error }, "Error creating knowledge base entry");
    res.status(500).json({ error: "Failed to create knowledge base entry" });
  }
});

router.patch("/ai-config/knowledge-base/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [updated] = await db.update(fcAiKnowledgeBase)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(fcAiKnowledgeBase.id, req.params.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Knowledge base entry not found" });
      return;
    }
    await auditLog(adminId, "AI_KNOWLEDGE_BASE_UPDATED", "ai_config", updated.id, JSON.stringify(req.body), req);
    res.json(updated);
  } catch (error) {
    log.error({ err: error }, "Error updating knowledge base entry");
    res.status(500).json({ error: "Failed to update knowledge base entry" });
  }
});

router.delete("/ai-config/knowledge-base/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [deleted] = await db.delete(fcAiKnowledgeBase).where(eq(fcAiKnowledgeBase.id, req.params.id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Knowledge base entry not found" });
      return;
    }
    await auditLog(adminId, "AI_KNOWLEDGE_BASE_DELETED", "ai_config", deleted.id, undefined, req);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error deleting knowledge base entry");
    res.status(500).json({ error: "Failed to delete knowledge base entry" });
  }
});

// Followup Templates
router.get("/ai-config/followup-templates", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const templates = await db.select().from(fcAiFollowupTemplates).orderBy(desc(fcAiFollowupTemplates.createdAt));
    await auditLog(adminId, "AI_FOLLOWUP_TEMPLATES_VIEWED", "ai_config", undefined, undefined, req);
    res.json(templates);
  } catch (error) {
    log.error({ err: error }, "Error fetching followup templates");
    res.status(500).json({ error: "Failed to fetch followup templates" });
  }
});

router.get("/ai-config/followup-templates/:id", async (req: Request, res: Response) => {
  try {
    const [template] = await db.select().from(fcAiFollowupTemplates).where(eq(fcAiFollowupTemplates.id, req.params.id));
    if (!template) {
      res.status(404).json({ error: "Followup template not found" });
      return;
    }
    res.json(template);
  } catch (error) {
    log.error({ err: error }, "Error fetching followup template");
    res.status(500).json({ error: "Failed to fetch followup template" });
  }
});

router.post("/ai-config/followup-templates", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const parsed = insertFcAiFollowupTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      return;
    }
    const [created] = await db.insert(fcAiFollowupTemplates).values(parsed.data).returning();
    await auditLog(adminId, "AI_FOLLOWUP_TEMPLATE_CREATED", "ai_config", created.id, JSON.stringify(parsed.data), req);
    res.status(201).json(created);
  } catch (error) {
    log.error({ err: error }, "Error creating followup template");
    res.status(500).json({ error: "Failed to create followup template" });
  }
});

router.patch("/ai-config/followup-templates/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [updated] = await db.update(fcAiFollowupTemplates)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(fcAiFollowupTemplates.id, req.params.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Followup template not found" });
      return;
    }
    await auditLog(adminId, "AI_FOLLOWUP_TEMPLATE_UPDATED", "ai_config", updated.id, JSON.stringify(req.body), req);
    res.json(updated);
  } catch (error) {
    log.error({ err: error }, "Error updating followup template");
    res.status(500).json({ error: "Failed to update followup template" });
  }
});

router.delete("/ai-config/followup-templates/:id", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const [deleted] = await db.delete(fcAiFollowupTemplates).where(eq(fcAiFollowupTemplates.id, req.params.id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Followup template not found" });
      return;
    }
    await auditLog(adminId, "AI_FOLLOWUP_TEMPLATE_DELETED", "ai_config", deleted.id, undefined, req);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error deleting followup template");
    res.status(500).json({ error: "Failed to delete followup template" });
  }
});

// ============================================
// AD CLICK FRAUD TRACKING ADMIN ROUTES
// ============================================

router.get("/ad-fraud/stats", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    
    const totalClicks = await db.select({ count: sql<number>`count(*)::int` }).from(adClickLogs);
    const suspiciousClicks = await db.select({ count: sql<number>`count(*)::int` })
      .from(adClickLogs)
      .where(sql`${adClickLogs.suspiciousScore} >= 50`);
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const clicksLast24h = await db.select({ count: sql<number>`count(*)::int` })
      .from(adClickLogs)
      .where(gte(adClickLogs.createdAt, last24h));
    
    const suspiciousLast24h = await db.select({ count: sql<number>`count(*)::int` })
      .from(adClickLogs)
      .where(and(
        gte(adClickLogs.createdAt, last24h),
        sql`${adClickLogs.suspiciousScore} >= 50`
      ));
    
    const avgScore = await db.select({ avg: sql<number>`round(avg(${adClickLogs.suspiciousScore}))::int` })
      .from(adClickLogs);
    
    const uniqueIPs = await db.select({ count: sql<number>`count(distinct ${adClickLogs.ipAddress})::int` })
      .from(adClickLogs);

    await auditLog(adminId, "AD_FRAUD_STATS_VIEWED", "ad_fraud", undefined, undefined, req);

    res.json({
      totalClicks: totalClicks[0]?.count || 0,
      suspiciousClicks: suspiciousClicks[0]?.count || 0,
      clicksLast24h: clicksLast24h[0]?.count || 0,
      suspiciousLast24h: suspiciousLast24h[0]?.count || 0,
      avgSuspiciousScore: avgScore[0]?.avg || 0,
      uniqueIPs: uniqueIPs[0]?.count || 0,
    });
  } catch (error) {
    log.error({ err: error }, "Error fetching ad fraud stats");
    res.status(500).json({ error: "Failed to fetch ad fraud statistics" });
  }
});

router.get("/ad-fraud/suspicious", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const minScore = parseInt(req.query.minScore as string) || 50;
    
    const suspiciousIPs = await db.select({
      ipAddress: adClickLogs.ipAddress,
      country: adClickLogs.country,
      city: adClickLogs.city,
      clickCount: sql<number>`count(*)::int`,
      avgScore: sql<number>`round(avg(${adClickLogs.suspiciousScore}))::int`,
      maxScore: sql<number>`max(${adClickLogs.suspiciousScore})::int`,
      firstSeen: sql<string>`min(${adClickLogs.createdAt})`,
      lastSeen: sql<string>`max(${adClickLogs.createdAt})`,
    })
      .from(adClickLogs)
      .where(sql`${adClickLogs.suspiciousScore} >= ${minScore}`)
      .groupBy(adClickLogs.ipAddress, adClickLogs.country, adClickLogs.city)
      .orderBy(sql`avg(${adClickLogs.suspiciousScore}) desc`);

    await auditLog(adminId, "AD_FRAUD_SUSPICIOUS_VIEWED", "ad_fraud", undefined, `minScore: ${minScore}`, req);

    res.json(suspiciousIPs);
  } catch (error) {
    log.error({ err: error }, "Error fetching suspicious IPs");
    res.status(500).json({ error: "Failed to fetch suspicious IPs" });
  }
});

router.get("/ad-fraud/logs", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await db.select()
      .from(adClickLogs)
      .orderBy(desc(adClickLogs.createdAt))
      .limit(limit)
      .offset(offset);
    
    const totalCount = await db.select({ count: sql<number>`count(*)::int` }).from(adClickLogs);

    await auditLog(adminId, "AD_FRAUD_LOGS_VIEWED", "ad_fraud", undefined, `limit: ${limit}, offset: ${offset}`, req);

    res.json({
      logs,
      total: totalCount[0]?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    log.error({ err: error }, "Error fetching ad click logs");
    res.status(500).json({ error: "Failed to fetch ad click logs" });
  }
});

router.get("/ad-fraud/countries", async (req: Request, res: Response) => {
  try {
    const adminId = getAdminId(req);
    
    const countryStats = await db.select({
      country: adClickLogs.country,
      clickCount: sql<number>`count(*)::int`,
      avgScore: sql<number>`round(avg(${adClickLogs.suspiciousScore}))::int`,
      suspiciousCount: sql<number>`count(*) filter (where ${adClickLogs.suspiciousScore} >= 50)::int`,
    })
      .from(adClickLogs)
      .groupBy(adClickLogs.country)
      .orderBy(sql`count(*) desc`);

    await auditLog(adminId, "AD_FRAUD_COUNTRIES_VIEWED", "ad_fraud", undefined, undefined, req);

    res.json(countryStats.map(c => ({
      country: c.country || 'Unknown',
      clickCount: c.clickCount,
      avgScore: c.avgScore || 0,
      suspiciousCount: c.suspiciousCount || 0,
    })));
  } catch (error) {
    log.error({ err: error }, "Error fetching country stats");
    res.status(500).json({ error: "Failed to fetch country statistics" });
  }
});

export default router;
