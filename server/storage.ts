import { 
  type User, 
  type InsertUser, 
  type ContactSubmission, 
  type InsertContactSubmission, 
  type SitemapEntry,
  type BlogPost,
  type BlogCategory,
  type ResourceFile,
  type ResourceLeadDb,
  type ResourceOtpDb,
  type ResourceSessionDb,
  type ResourceDownloadDb,
  type EmailVerificationToken,
  users,
  contactSubmissions,
  blogPosts,
  blogCategories,
  resourceFiles,
  resourceLeads,
  resourceOtps,
  resourceSessions,
  resourceDownloads,
  emailVerificationTokens,
  type BlogPostDb,
  type BlogCategoryDb,
  type ResourceFileDb,
  type MarketingAssetDb,
  type InsertMarketingAssetDb,
  marketingAssets,
  type GuardrailCategoryDb,
  type GuardrailRuleDb,
  type BlogGenerationJobDb,
  type InsertGuardrailCategoryDb,
  type InsertGuardrailRuleDb,
  type InsertBlogGenerationJobDb,
  guardrailCategories,
  guardrailRules,
  blogGenerationJobs,
  pageViews,
  visitorSessions,
  type InsertPageViewDb,
  type PageViewDb,
  type InsertVisitorSessionDb,
  type VisitorSessionDb,
  fcAiSystemPrompts,
  fcAiGuardrails,
  fcAiGroundingRules,
  fcAiKnowledgeBase,
  fcAiFollowupTemplates,
  type FcAiSystemPrompt,
  type InsertFcAiSystemPrompt,
  type FcAiGuardrail,
  type InsertFcAiGuardrail,
  type FcAiGroundingRule,
  type InsertFcAiGroundingRule,
  type FcAiKnowledgeBase as FcAiKnowledgeBaseType,
  type InsertFcAiKnowledgeBase,
  type FcAiFollowupTemplate,
  type InsertFcAiFollowupTemplate,
  adClickLogs,
  type AdClickLog,
  type InsertAdClickLog,
  featureFlagOverrides,
  type FeatureFlagOverride,
  type InsertFeatureFlagOverride,
} from "@shared/schema";
import { db } from "./db";
import { eq, like, or, desc, sql, and, gt, lt, count } from "drizzle-orm";
import * as crypto from "crypto";
import { encryptField, decryptField, hashForLookup, safeDecrypt } from "./services/encryption";
import { createChildLogger } from "./lib/logger";

const storageLog = createChildLogger("storage");

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface BlogPostPaginationParams extends PaginationParams {
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

/**
 * @deprecated IStorage is a monolithic data-access facade retained for backwards
 * compatibility.  New features should use typed Drizzle ORM repositories in
 * `server/db/` rather than adding methods here.  Existing callers will be
 * progressively migrated; do not add new methods to this interface.
 */
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(params?: PaginationParams): Promise<PaginatedResult<ContactSubmission>>;
  updateContactSubmissionStatus(id: string, updates: { emailSent?: boolean; hubspotSynced?: boolean }): Promise<void>;
  getContactSubmissionById(id: string): Promise<ContactSubmission | undefined>;
  verifyContactSubmission(id: string): Promise<void>;
  getSitemapEntries(): Promise<SitemapEntry[]>;
  
  getBlogPosts(params?: BlogPostPaginationParams): Promise<PaginatedResult<BlogPost>>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  getBlogPostById(id: string): Promise<BlogPost | undefined>;
  createBlogPost(post: BlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost | undefined>;
  getFeaturedBlogPosts(): Promise<BlogPost[]>;
  getBlogPostsByCategory(categoryId: string): Promise<BlogPost[]>;
  searchBlogPosts(query: string): Promise<BlogPost[]>;
  incrementBlogViews(id: string): Promise<void>;
  getBlogCategories(): Promise<BlogCategory[]>;
  getBlogCategoryBySlug(slug: string): Promise<BlogCategory | undefined>;
  
  getResourceFiles(params?: PaginationParams): Promise<PaginatedResult<ResourceFile>>;
  getResourceFileBySlug(slug: string): Promise<ResourceFile | undefined>;
  getResourceFileById(id: string): Promise<ResourceFile | undefined>;
  getResourceFilesByCategory(category: string): Promise<ResourceFile[]>;
  getFeaturedResourceFiles(): Promise<ResourceFile[]>;
  incrementDownloadCount(id: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
  
  // Lead capture and OTP operations
  createResourceLead(lead: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    jobTitle: string;
    resourceId?: string;
    subscribeNewsletter?: boolean;
    ipAddress?: string;
    userAgent?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    platform?: string;
    deviceMemory?: number;
    hardwareConcurrency?: number;
    referrer?: string;
    pageUrl?: string;
    clickTimestamp?: Date;
  }): Promise<ResourceLeadDb>;
  getResourceLeadByEmail(email: string): Promise<ResourceLeadDb | undefined>;
  getResourceLeadById(id: string): Promise<ResourceLeadDb | undefined>;
  verifyResourceLead(leadId: string): Promise<void>;
  updateLeadHubspotSync(leadId: string, hubspotContactId: string): Promise<void>;
  
  createOtp(leadId: string, otpHash: string, expiresAt: Date): Promise<ResourceOtpDb>;
  getValidOtp(leadId: string): Promise<ResourceOtpDb | undefined>;
  incrementOtpAttempts(otpId: string): Promise<number>;
  markOtpUsed(otpId: string): Promise<void>;
  invalidateOtpsForLead(leadId: string): Promise<void>;
  
  // Email verification token operations (link-based verification)
  createEmailVerificationToken(params: { leadId?: string; contactSubmissionId?: string; token: string; expiresAt: Date }): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenUsed(tokenId: string): Promise<void>;
  invalidateTokensForLead(leadId: string): Promise<void>;
  invalidateTokensForContactSubmission(contactSubmissionId: string): Promise<void>;
  
  // Session management operations
  createResourceSession(data: {
    leadId: string;
    emailHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ResourceSessionDb>;
  getResourceSession(sessionId: string): Promise<ResourceSessionDb | undefined>;
  getValidSessionByEmailHash(emailHash: string): Promise<ResourceSessionDb | undefined>;
  refreshSessionExpiry(sessionId: string, newExpiresAt: Date): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllSessionsForLead(leadId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<number>;
  
  // Download tracking operations
  createResourceDownload(data: {
    sessionId?: string;
    leadId: string;
    resourceId: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }): Promise<ResourceDownloadDb>;
  getDownloadsByLead(leadId: string): Promise<ResourceDownloadDb[]>;
  getDownloadsByResource(resourceId: string): Promise<ResourceDownloadDb[]>;
  getAllDownloads(params?: PaginationParams): Promise<PaginatedResult<ResourceDownloadDb>>;
  resetAllDownloadCounts(): Promise<{ resourcesReset: number }>;
  clearDownloadHistory(): Promise<{ downloadsCleared: number }>;
  
  // Marketing assets operations
  getMarketingAssets(params?: PaginationParams): Promise<PaginatedResult<MarketingAssetDb>>;
  getMarketingAssetById(id: string): Promise<MarketingAssetDb | undefined>;
  getMarketingAssetsByCategory(category: string): Promise<MarketingAssetDb[]>;
  getMarketingAssetsByType(type: string): Promise<MarketingAssetDb[]>;
  createMarketingAsset(asset: InsertMarketingAssetDb): Promise<MarketingAssetDb>;
  updateMarketingAsset(id: string, updates: Partial<InsertMarketingAssetDb>): Promise<MarketingAssetDb | undefined>;
  deleteMarketingAsset(id: string): Promise<boolean>;
  
  // Guardrail operations
  getGuardrailCategories(): Promise<GuardrailCategoryDb[]>;
  getGuardrailRules(params?: PaginationParams): Promise<PaginatedResult<GuardrailRuleDb>>;
  getGuardrailRulesByCategory(categoryId: string): Promise<GuardrailRuleDb[]>;
  updateGuardrailRule(id: string, updates: Partial<GuardrailRuleDb>): Promise<GuardrailRuleDb | undefined>;
  deleteGuardrailRule(id: string): Promise<boolean>;
  deleteGuardrailCategory(id: string): Promise<boolean>;
  createGuardrailCategory(category: InsertGuardrailCategoryDb): Promise<GuardrailCategoryDb>;
  createGuardrailRule(rule: InsertGuardrailRuleDb): Promise<GuardrailRuleDb>;
  
  // Blog generation pipeline operations
  createBlogGenerationJob(job: InsertBlogGenerationJobDb): Promise<BlogGenerationJobDb>;
  getBlogGenerationJob(id: string): Promise<BlogGenerationJobDb | undefined>;
  updateBlogGenerationJob(id: string, updates: Partial<BlogGenerationJobDb>): Promise<BlogGenerationJobDb | undefined>;
  getBlogGenerationJobs(): Promise<BlogGenerationJobDb[]>;
  
  // FinanceCompass AI Configuration
  getFcAiSystemPrompts(): Promise<FcAiSystemPrompt[]>;
  getFcAiSystemPromptById(id: string): Promise<FcAiSystemPrompt | undefined>;
  createFcAiSystemPrompt(data: InsertFcAiSystemPrompt): Promise<FcAiSystemPrompt>;
  updateFcAiSystemPrompt(id: string, data: Partial<InsertFcAiSystemPrompt>): Promise<FcAiSystemPrompt | undefined>;
  deleteFcAiSystemPrompt(id: string): Promise<boolean>;

  getFcAiGuardrails(): Promise<FcAiGuardrail[]>;
  getFcAiGuardrailById(id: string): Promise<FcAiGuardrail | undefined>;
  createFcAiGuardrail(data: InsertFcAiGuardrail): Promise<FcAiGuardrail>;
  updateFcAiGuardrail(id: string, data: Partial<InsertFcAiGuardrail>): Promise<FcAiGuardrail | undefined>;
  deleteFcAiGuardrail(id: string): Promise<boolean>;

  getFcAiGroundingRules(): Promise<FcAiGroundingRule[]>;
  getFcAiGroundingRuleById(id: string): Promise<FcAiGroundingRule | undefined>;
  createFcAiGroundingRule(data: InsertFcAiGroundingRule): Promise<FcAiGroundingRule>;
  updateFcAiGroundingRule(id: string, data: Partial<InsertFcAiGroundingRule>): Promise<FcAiGroundingRule | undefined>;
  deleteFcAiGroundingRule(id: string): Promise<boolean>;

  getFcAiKnowledgeBaseEntries(): Promise<FcAiKnowledgeBaseType[]>;
  getFcAiKnowledgeBaseById(id: string): Promise<FcAiKnowledgeBaseType | undefined>;
  createFcAiKnowledgeBase(data: InsertFcAiKnowledgeBase): Promise<FcAiKnowledgeBaseType>;
  updateFcAiKnowledgeBase(id: string, data: Partial<InsertFcAiKnowledgeBase>): Promise<FcAiKnowledgeBaseType | undefined>;
  deleteFcAiKnowledgeBase(id: string): Promise<boolean>;

  getFcAiFollowupTemplates(): Promise<FcAiFollowupTemplate[]>;
  getFcAiFollowupTemplateById(id: string): Promise<FcAiFollowupTemplate | undefined>;
  createFcAiFollowupTemplate(data: InsertFcAiFollowupTemplate): Promise<FcAiFollowupTemplate>;
  updateFcAiFollowupTemplate(id: string, data: Partial<InsertFcAiFollowupTemplate>): Promise<FcAiFollowupTemplate | undefined>;
  deleteFcAiFollowupTemplate(id: string): Promise<boolean>;

  // Ad Click Fraud Tracking
  logAdClick(data: InsertAdClickLog): Promise<AdClickLog>;
  getAdClickLogs(limit?: number, offset?: number): Promise<AdClickLog[]>;
  getSuspiciousClicks(minScore?: number): Promise<AdClickLog[]>;
  getClicksByIP(ipAddress: string): Promise<AdClickLog[]>;
  getClickCountryStats(): Promise<{ country: string; count: number; avgScore: number }[]>;
  getRecentClicksByIP(ipAddress: string, withinMinutes: number): Promise<number>;

  createPageView(pageView: InsertPageViewDb): Promise<PageViewDb>;
  upsertVisitorSession(data: {
    sessionId: string;
    visitorId: string;
    path: string;
    referrer?: string | null;
    deviceType?: string;
    browser?: string;
    os?: string;
    duration?: number;
  }): Promise<void>;
  seedInitialData(): Promise<void>;

  // Feature Flag Overrides
  getFeatureFlagOverrides(): Promise<FeatureFlagOverride[]>;
  getFeatureFlagOverride(featureKey: string): Promise<FeatureFlagOverride | undefined>;
  upsertFeatureFlagOverride(data: InsertFeatureFlagOverride): Promise<FeatureFlagOverride>;
  deleteFeatureFlagOverride(featureKey: string): Promise<boolean>;
}

// OTP utility functions
export function generateOtp(): string {
  const bytes = crypto.randomBytes(3);
  const num = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 900000 + 100000;
  const otp = num.toString();
  if (process.env.NODE_ENV !== 'production') {
    storageLog.info({ otp }, "DEV: Generated OTP");
  }
  return otp;
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function verifyOtp(otp: string, hash: string): boolean {
  const computed = hashOtp(otp);
  if (computed.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

// Email verification token utility functions
export function generateVerificationToken(): string {
  // Generate a cryptographically secure 32-byte token (256 bits)
  return crypto.randomBytes(32).toString('base64url');
}

export function getVerificationTokenExpiry(): Date {
  // Token expires in 24 hours
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function mapDbPostToBlogPost(post: BlogPostDb): BlogPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    heroImage: post.heroImage || undefined,
    categoryId: post.categoryId,
    tags: post.tags || [],
    author: post.author,
    authorImage: post.authorImage || undefined,
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    featured: post.featured,
    views: post.views ?? 0,
  };
}

function mapDbCategoryToBlogCategory(cat: BlogCategoryDb): BlogCategory {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || undefined,
  };
}

function mapDbFileToResourceFile(file: ResourceFileDb): ResourceFile {
  return {
    id: file.id,
    title: file.title,
    slug: file.slug,
    description: file.description,
    category: file.category,
    fileType: file.fileType as "pdf" | "doc" | "xls" | "zip" | "video" | "image" | "other",
    fileUrl: file.fileUrl,
    fileSize: file.fileSize,
    downloadCount: file.downloadCount,
    viewCount: file.viewCount,
    featured: file.featured,
    publishedAt: file.publishedAt,
  };
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    const encryptedSubmission = {
      ...submission,
      email: encryptField(submission.email),
      firstName: encryptField(submission.firstName),
      lastName: encryptField(submission.lastName),
      emailHash: hashForLookup(submission.email),
    };
    const [result] = await db.insert(contactSubmissions).values(encryptedSubmission).returning();
    return {
      ...result,
      email: safeDecrypt(result.email),
      firstName: safeDecrypt(result.firstName),
      lastName: safeDecrypt(result.lastName),
    };
  }

  async getContactSubmissions(params?: PaginationParams): Promise<PaginatedResult<ContactSubmission>> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const [countResult] = await db.select({ total: count() }).from(contactSubmissions);
    const total = countResult?.total ?? 0;

    const results = await db.select().from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);

    const items = results.map(result => ({
      ...result,
      email: safeDecrypt(result.email),
      firstName: safeDecrypt(result.firstName),
      lastName: safeDecrypt(result.lastName),
    }));

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async updateContactSubmissionStatus(id: string, updates: { emailSent?: boolean; hubspotSynced?: boolean }): Promise<void> {
    await db.update(contactSubmissions)
      .set(updates)
      .where(eq(contactSubmissions.id, id));
  }

  async getContactSubmissionById(id: string): Promise<ContactSubmission | undefined> {
    const [result] = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id));
    if (result) {
      return {
        ...result,
        email: safeDecrypt(result.email),
        firstName: safeDecrypt(result.firstName),
        lastName: safeDecrypt(result.lastName),
      };
    }
    return undefined;
  }

  async verifyContactSubmission(id: string): Promise<void> {
    await db.update(contactSubmissions)
      .set({ 
        verified: true, 
        verifiedAt: new Date() 
      })
      .where(eq(contactSubmissions.id, id));
  }

  async getSitemapEntries(): Promise<SitemapEntry[]> {
    const baseUrl = "https://constancia.com";
    const today = new Date().toISOString().split("T")[0];
    
    const staticEntries: SitemapEntry[] = [
      { loc: baseUrl, lastmod: today, changefreq: "weekly", priority: 1.0 },
      { loc: `${baseUrl}/about`, lastmod: today, changefreq: "monthly", priority: 0.9 },
      { loc: `${baseUrl}/services`, lastmod: today, changefreq: "monthly", priority: 0.9 },
      { loc: `${baseUrl}/solutions`, lastmod: today, changefreq: "monthly", priority: 0.9 },
      { loc: `${baseUrl}/blog`, lastmod: today, changefreq: "daily", priority: 0.9 },
      { loc: `${baseUrl}/files`, lastmod: today, changefreq: "weekly", priority: 0.8 },
      { loc: `${baseUrl}/contact`, lastmod: today, changefreq: "monthly", priority: 0.9 },
    ];

    const posts = await db.select().from(blogPosts);
    const blogEntries: SitemapEntry[] = posts.map(post => ({
      loc: `${baseUrl}/blog/${post.slug}`,
      lastmod: post.publishedAt,
      changefreq: "monthly" as const,
      priority: 0.7,
    }));

    const categories = await db.select().from(blogCategories);
    const categoryEntries: SitemapEntry[] = categories.map(cat => ({
      loc: `${baseUrl}/blog/category/${cat.slug}`,
      lastmod: today,
      changefreq: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticEntries, ...blogEntries, ...categoryEntries];
  }

  async getBlogPosts(params?: BlogPostPaginationParams): Promise<PaginatedResult<BlogPost>> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const [countResult] = await db.select({ total: count() }).from(blogPosts).where(eq(blogPosts.isPublished, true));
    const total = countResult?.total ?? 0;

    const posts = await db.select().from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);

    const items = posts.map(mapDbPostToBlogPost);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)));
    return post ? mapDbPostToBlogPost(post) : undefined;
  }

  async getBlogPostById(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post ? mapDbPostToBlogPost(post) : undefined;
  }

  async incrementBlogViews(id: string): Promise<void> {
    await db.update(blogPosts)
      .set({ views: sql`${blogPosts.views} + 1` })
      .where(eq(blogPosts.id, id));
  }

  async createBlogPost(post: BlogPost): Promise<BlogPost> {
    const dbPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      heroImage: post.heroImage || null,
      author: post.author,
      authorImage: post.authorImage || null,
      readingTime: post.readingTime,
      publishedAt: post.publishedAt,
      categoryId: post.categoryId,
      tags: post.tags,
      featured: post.featured || false,
      isPublished: true,  // Explicitly set to true when publishing
    };
    
    const result = await db.insert(blogPosts).values(dbPost).returning();
    return mapDbPostToBlogPost(result[0]);
  }

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost | undefined> {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.excerpt !== undefined) dbUpdates.excerpt = updates.excerpt;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.heroImage !== undefined) dbUpdates.heroImage = updates.heroImage;
    if (updates.author !== undefined) dbUpdates.author = updates.author;
    if (updates.authorImage !== undefined) dbUpdates.authorImage = updates.authorImage;
    if (updates.readingTime !== undefined) dbUpdates.readingTime = updates.readingTime;
    if (updates.categoryId !== undefined) dbUpdates.categoryId = updates.categoryId;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.featured !== undefined) dbUpdates.featured = updates.featured;
    
    const result = await db.update(blogPosts).set(dbUpdates).where(eq(blogPosts.id, id)).returning();
    if (result.length === 0) return undefined;
    return mapDbPostToBlogPost(result[0]);
  }

  async getFeaturedBlogPosts(): Promise<BlogPost[]> {
    const posts = await db.select().from(blogPosts)
      .where(and(eq(blogPosts.featured, true), eq(blogPosts.isPublished, true)))
      .orderBy(desc(blogPosts.publishedAt));
    return posts.map(mapDbPostToBlogPost);
  }

  async getBlogPostsByCategory(categoryId: string): Promise<BlogPost[]> {
    const posts = await db.select().from(blogPosts)
      .where(and(eq(blogPosts.categoryId, categoryId), eq(blogPosts.isPublished, true)))
      .orderBy(desc(blogPosts.publishedAt));
    return posts.map(mapDbPostToBlogPost);
  }

  async searchBlogPosts(query: string): Promise<BlogPost[]> {
    const searchPattern = `%${query}%`;
    const posts = await db.select().from(blogPosts)
      .where(
        and(
          or(
            like(blogPosts.title, searchPattern),
            like(blogPosts.excerpt, searchPattern),
            like(blogPosts.content, searchPattern)
          ),
          eq(blogPosts.isPublished, true)
        )
      )
      .orderBy(desc(blogPosts.publishedAt));
    return posts.map(mapDbPostToBlogPost);
  }

  async getBlogCategories(): Promise<BlogCategory[]> {
    const cats = await db.select().from(blogCategories);
    return cats.map(mapDbCategoryToBlogCategory);
  }

  async getBlogCategoryBySlug(slug: string): Promise<BlogCategory | undefined> {
    const [cat] = await db.select().from(blogCategories).where(eq(blogCategories.slug, slug));
    return cat ? mapDbCategoryToBlogCategory(cat) : undefined;
  }

  async getResourceFiles(params?: PaginationParams): Promise<PaginatedResult<ResourceFile>> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const [countResult] = await db.select({ total: count() }).from(resourceFiles);
    const total = countResult?.total ?? 0;

    const files = await db.select().from(resourceFiles)
      .orderBy(desc(resourceFiles.publishedAt))
      .limit(limit)
      .offset(offset);

    const items = files.map(mapDbFileToResourceFile);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async getResourceFileBySlug(slug: string): Promise<ResourceFile | undefined> {
    const [file] = await db.select().from(resourceFiles).where(eq(resourceFiles.slug, slug));
    return file ? mapDbFileToResourceFile(file) : undefined;
  }

  async getResourceFileById(id: string): Promise<ResourceFile | undefined> {
    const [file] = await db.select().from(resourceFiles).where(eq(resourceFiles.id, id));
    return file ? mapDbFileToResourceFile(file) : undefined;
  }

  async getResourceFilesByCategory(category: string): Promise<ResourceFile[]> {
    const files = await db.select().from(resourceFiles)
      .where(eq(resourceFiles.category, category))
      .orderBy(desc(resourceFiles.publishedAt));
    return files.map(mapDbFileToResourceFile);
  }

  async getFeaturedResourceFiles(): Promise<ResourceFile[]> {
    const files = await db.select().from(resourceFiles)
      .where(eq(resourceFiles.featured, true))
      .orderBy(desc(resourceFiles.publishedAt));
    return files.map(mapDbFileToResourceFile);
  }

  async incrementDownloadCount(id: string): Promise<void> {
    await db.update(resourceFiles)
      .set({ downloadCount: sql`${resourceFiles.downloadCount} + 1` })
      .where(eq(resourceFiles.id, id));
  }

  async incrementViewCount(id: string): Promise<void> {
    await db.update(resourceFiles)
      .set({ viewCount: sql`${resourceFiles.viewCount} + 1` })
      .where(eq(resourceFiles.id, id));
  }

  // Lead capture operations
  async createResourceLead(lead: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    jobTitle: string;
    resourceId?: string;
    subscribeNewsletter?: boolean;
    ipAddress?: string;
    userAgent?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    platform?: string;
    deviceMemory?: number;
    hardwareConcurrency?: number;
    referrer?: string;
    pageUrl?: string;
    clickTimestamp?: Date;
  }): Promise<ResourceLeadDb> {
    const encryptedLead = {
      ...lead,
      email: encryptField(lead.email),
      firstName: encryptField(lead.firstName),
      lastName: encryptField(lead.lastName),
      emailHash: hashForLookup(lead.email),
    };
    const [result] = await db.insert(resourceLeads).values(encryptedLead).returning();
    return {
      ...result,
      email: safeDecrypt(result.email),
      firstName: safeDecrypt(result.firstName),
      lastName: safeDecrypt(result.lastName),
    };
  }

  async getResourceLeadByEmail(email: string): Promise<ResourceLeadDb | undefined> {
    const emailHash = hashForLookup(email);
    const [lead] = await db.select().from(resourceLeads)
      .where(eq(resourceLeads.emailHash, emailHash));
    if (lead) {
      return {
        ...lead,
        email: safeDecrypt(lead.email),
        firstName: safeDecrypt(lead.firstName),
        lastName: safeDecrypt(lead.lastName),
      };
    }
    return lead;
  }

  async getResourceLeadById(id: string): Promise<ResourceLeadDb | undefined> {
    const [lead] = await db.select().from(resourceLeads)
      .where(eq(resourceLeads.id, id));
    if (lead) {
      return {
        ...lead,
        email: safeDecrypt(lead.email),
        firstName: safeDecrypt(lead.firstName),
        lastName: safeDecrypt(lead.lastName),
      };
    }
    return lead;
  }

  async verifyResourceLead(leadId: string): Promise<void> {
    await db.update(resourceLeads)
      .set({ 
        verified: true, 
        verifiedAt: new Date() 
      })
      .where(eq(resourceLeads.id, leadId));
  }

  async updateLeadHubspotSync(leadId: string, hubspotContactId: string): Promise<void> {
    await db.update(resourceLeads)
      .set({ 
        hubspotSynced: true, 
        hubspotContactId 
      })
      .where(eq(resourceLeads.id, leadId));
  }

  // OTP operations
  async createOtp(leadId: string, otpHash: string, expiresAt: Date): Promise<ResourceOtpDb> {
    const [result] = await db.insert(resourceOtps).values({
      leadId,
      otpHash,
      expiresAt,
    }).returning();
    return result;
  }

  async getValidOtp(leadId: string): Promise<ResourceOtpDb | undefined> {
    const now = new Date();
    const [otp] = await db.select().from(resourceOtps)
      .where(
        and(
          eq(resourceOtps.leadId, leadId),
          eq(resourceOtps.used, false),
          gt(resourceOtps.expiresAt, now)
        )
      )
      .orderBy(desc(resourceOtps.createdAt))
      .limit(1);
    return otp;
  }

  async incrementOtpAttempts(otpId: string): Promise<number> {
    const [result] = await db.update(resourceOtps)
      .set({ attempts: sql`${resourceOtps.attempts} + 1` })
      .where(eq(resourceOtps.id, otpId))
      .returning({ attempts: resourceOtps.attempts });
    return result?.attempts || 0;
  }

  async markOtpUsed(otpId: string): Promise<void> {
    await db.update(resourceOtps)
      .set({ used: true })
      .where(eq(resourceOtps.id, otpId));
  }

  async invalidateOtpsForLead(leadId: string): Promise<void> {
    await db.update(resourceOtps)
      .set({ used: true })
      .where(eq(resourceOtps.leadId, leadId));
  }

  // Email verification token operations (link-based verification)
  // Tokens must be scoped exclusively to either a lead OR a contact submission, never both
  async createEmailVerificationToken(params: { leadId?: string; contactSubmissionId?: string; token: string; expiresAt: Date }): Promise<EmailVerificationToken> {
    // Enforce mutual exclusivity: exactly one of leadId or contactSubmissionId must be provided
    const hasLeadId = Boolean(params.leadId);
    const hasContactId = Boolean(params.contactSubmissionId);
    
    if (hasLeadId && hasContactId) {
      throw new Error("Token cannot be associated with both a lead and a contact submission");
    }
    if (!hasLeadId && !hasContactId) {
      throw new Error("Token must be associated with either a lead or a contact submission");
    }
    
    const [result] = await db.insert(emailVerificationTokens).values({
      leadId: params.leadId || null,
      contactSubmissionId: params.contactSubmissionId || null,
      token: params.token,
      expiresAt: params.expiresAt,
    }).returning();
    return result;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const now = new Date();
    const [tokenRecord] = await db.select().from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.token, token),
          eq(emailVerificationTokens.used, false),
          gt(emailVerificationTokens.expiresAt, now)
        )
      );
    return tokenRecord;
  }

  async markEmailVerificationTokenUsed(tokenId: string): Promise<void> {
    await db.update(emailVerificationTokens)
      .set({ used: true, usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, tokenId));
  }

  async invalidateTokensForLead(leadId: string): Promise<void> {
    await db.update(emailVerificationTokens)
      .set({ used: true })
      .where(eq(emailVerificationTokens.leadId, leadId));
  }

  async invalidateTokensForContactSubmission(contactSubmissionId: string): Promise<void> {
    await db.update(emailVerificationTokens)
      .set({ used: true })
      .where(eq(emailVerificationTokens.contactSubmissionId, contactSubmissionId));
  }

  // Session management operations
  async createResourceSession(data: {
    leadId: string;
    emailHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ResourceSessionDb> {
    const [result] = await db.insert(resourceSessions).values(data).returning();
    return result;
  }

  async getResourceSession(sessionId: string): Promise<ResourceSessionDb | undefined> {
    const [session] = await db.select().from(resourceSessions)
      .where(eq(resourceSessions.id, sessionId));
    return session;
  }

  async getValidSessionByEmailHash(emailHash: string): Promise<ResourceSessionDb | undefined> {
    const now = new Date();
    const [session] = await db.select().from(resourceSessions)
      .where(
        and(
          eq(resourceSessions.emailHash, emailHash),
          eq(resourceSessions.revoked, false),
          gt(resourceSessions.expiresAt, now)
        )
      )
      .orderBy(desc(resourceSessions.issuedAt))
      .limit(1);
    return session;
  }

  async refreshSessionExpiry(sessionId: string, newExpiresAt: Date): Promise<void> {
    await db.update(resourceSessions)
      .set({ 
        expiresAt: newExpiresAt,
        lastSeenAt: new Date()
      })
      .where(eq(resourceSessions.id, sessionId));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await db.update(resourceSessions)
      .set({ revoked: true })
      .where(eq(resourceSessions.id, sessionId));
  }

  async revokeAllSessionsForLead(leadId: string): Promise<void> {
    await db.update(resourceSessions)
      .set({ revoked: true })
      .where(eq(resourceSessions.leadId, leadId));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await db.delete(resourceSessions)
      .where(lt(resourceSessions.expiresAt, now))
      .returning();
    return result.length;
  }

  // Download tracking operations
  async createResourceDownload(data: {
    sessionId?: string;
    leadId: string;
    resourceId: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }): Promise<ResourceDownloadDb> {
    const [result] = await db.insert(resourceDownloads).values(data).returning();
    return result;
  }

  async getDownloadsByLead(leadId: string): Promise<ResourceDownloadDb[]> {
    return db.select().from(resourceDownloads)
      .where(eq(resourceDownloads.leadId, leadId))
      .orderBy(desc(resourceDownloads.downloadedAt));
  }

  async getDownloadsByResource(resourceId: string): Promise<ResourceDownloadDb[]> {
    return db.select().from(resourceDownloads)
      .where(eq(resourceDownloads.resourceId, resourceId))
      .orderBy(desc(resourceDownloads.downloadedAt));
  }

  async getAllDownloads(params?: PaginationParams): Promise<PaginatedResult<ResourceDownloadDb>> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const [countResult] = await db.select({ total: count() }).from(resourceDownloads);
    const total = countResult?.total ?? 0;

    const items = await db.select().from(resourceDownloads)
      .orderBy(desc(resourceDownloads.downloadedAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async resetAllDownloadCounts(): Promise<{ resourcesReset: number }> {
    const result = await db.update(resourceFiles)
      .set({ downloadCount: 0 })
      .returning();
    return { resourcesReset: result.length };
  }

  async clearDownloadHistory(): Promise<{ downloadsCleared: number }> {
    const result = await db.delete(resourceDownloads).returning();
    return { downloadsCleared: result.length };
  }

  private getEnhancedFilesData() {
    return [
      // ============================================
      // FLAGSHIP PDF GUIDES (Comprehensive Resources)
      // ============================================
      {
        title: "EPM Selection & Implementation Guide",
        slug: "epm-selection-implementation-guide",
        description: "The definitive PDF guide for EPM platform selection and implementation. This comprehensive guide consolidates everything finance leaders need to evaluate, select, and deploy enterprise performance management solutions. CHAPTER 1 - MARKET OVERVIEW: Comprehensive vendor-agnostic comparison of leading EPM platforms including OneStream, Pigment, Oracle Cloud EPM, and Anaplan with 2026 roadmap insights, Gartner Magic Quadrant analysis, and UK market focus. CHAPTER 2 - PLATFORM DEEP DIVES: Detailed evaluation frameworks for OneStream (120-point implementation checklist), Pigment (capability scoring and use case fit), and Oracle Cloud EPM (AI integration, sustainability reporting, continuous close). CHAPTER 3 - READINESS ASSESSMENT: 120+ point organisational readiness checklist covering data harmonisation, hierarchy design, master data quality, process documentation, and UAT resourcing with go/no-go decision framework. CHAPTER 4 - VENDOR EVALUATION: 30 detailed demonstration scripts for consolidation, planning, reporting, and close management with scoring rubrics and 120+ probing questions. CHAPTER 5 - CONTROLS & COMPLIANCE: 150+ control matrix for SOX, IFRS, and ESG compliance with CSRD checklist, audit trail specifications, and COSO 2013 alignment. CHAPTER 6 - CHANGE MANAGEMENT: Stakeholder analysis templates, communication calendars, training curriculum frameworks, and adoption metrics dashboards. CHAPTER 7 - HIERARCHY ARCHITECTURE: Cost versus performance trade-offs for dynamic hierarchy capabilities with vendor capability comparison. Includes professional Constancia branding, table of contents, and executive summary. Based on 75+ successful EPM selections across UK mid-market and enterprise organisations.",
        category: "Flagship Guides",
        fileType: "pdf",
        fileUrl: "/resources/epm-selection-implementation-guide.pdf",
        fileSize: "8.2 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-28",
      },
      {
        title: "ERP Selection & Implementation Guide",
        slug: "erp-selection-implementation-guide",
        description: "The definitive PDF guide for ERP platform selection and implementation. This comprehensive guide consolidates everything finance and IT leaders need to evaluate, select, and deploy enterprise resource planning solutions. CHAPTER 1 - SELECTION METHODOLOGY: 80+ point evaluation checklist covering regulatory compliance (UK GAAP, IFRS 16, FRS 102, FCA requirements), functional capability requirements across core financials, procurement, inventory, manufacturing, and HR modules, and total cost of ownership modelling. CHAPTER 2 - VENDOR DEMONSTRATIONS: 25 detailed scenario scripts for procure-to-pay, order-to-cash, record-to-report, and project accounting workflows with scoring rubrics, evaluation forms, and 150+ probing questions. CHAPTER 3 - PROGRAMME GOVERNANCE: SteerCo charter templates, decision rights matrices, 200+ activity-level RACI assignments, meeting templates, and escalation procedures aligned to UK corporate governance standards. CHAPTER 4 - READINESS ASSESSMENT: 100+ point organisational readiness checklist covering data quality, process documentation, segregation of duties, UAT resourcing, and gate review criteria. CHAPTER 5 - HYPERCARE MODEL: Post-go-live stabilisation playbook with team composition, SLA definitions, issue triage workflows, root cause analysis templates, knowledge transfer plans, and exit criteria for organisations processing 10,000+ daily transactions. CHAPTER 6 - PROJECT CHARTER: Complete project charter template with scope definition, timeline, budget summary, governance structure, risk profile, and approval log. Includes professional Constancia branding, table of contents, and executive summary. Based on 100+ successful UK ERP selections across manufacturing, distribution, and professional services sectors.",
        category: "Flagship Guides",
        fileType: "pdf",
        fileUrl: "/resources/erp-selection-implementation-guide.pdf",
        fileSize: "7.4 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-27",
      },
      {
        title: "AI for Finance Transformation Guide",
        slug: "ai-finance-transformation-guide",
        description: "The definitive PDF guide for CFOs evaluating and implementing AI across finance functions. This comprehensive guide consolidates everything finance leaders need to assess, deploy, and govern artificial intelligence solutions. CHAPTER 1 - AI GOVERNANCE FRAMEWORK: 75+ point governance checklist covering explainability requirements, bias detection methodology, audit trail specifications, GDPR and FCA compliance, model documentation templates, and human oversight protocols with board reporting structures. CHAPTER 2 - USE CASE LIBRARY: 40+ proven AI use cases for finance including predictive forecasting (demand, revenue, cash flow, working capital), anomaly detection (fraud, expense violations, journal entry risk), and ESG reporting automation with implementation complexity ratings and ROI estimates. CHAPTER 3 - PLATFORM INTEGRATION: Technical blueprints for AI integration within ERP/EPM platforms including Microsoft Copilot for Dynamics 365, SAP Business AI, Oracle Fusion Cloud AI, Pigment AI, and Workday AI with architecture patterns, data flow diagrams, API specifications, and security considerations. CHAPTER 4 - RISK & COMPLIANCE: 50+ criteria evaluation scorecard for transparency, bias detection, data privacy, FCA alignment, and vendor comparison with contract clause recommendations. CHAPTER 5 - ROI METHODOLOGY: Frameworks for quantifying returns across 15 finance AI use cases with UK salary benchmarks, productivity gains modelling, NPV/IRR calculations, and sensitivity analysis. CHAPTER 6 - IMPLEMENTATION ROADMAP: Maturity assessment framework, phased adoption guidance, resource requirements, and change management strategies. Includes professional Constancia branding, table of contents, and executive summary. Based on AI initiatives across 35+ UK finance functions.",
        category: "Flagship Guides",
        fileType: "pdf",
        fileUrl: "/resources/ai-finance-transformation-guide.pdf",
        fileSize: "6.8 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-26",
      },
      // ============================================
      // FLAGSHIP EXCEL TOOLKITS (Comprehensive Workbooks)
      // ============================================
      {
        title: "EPM Selection & Implementation Toolkit",
        slug: "epm-selection-implementation-toolkit",
        description: "The definitive Excel workbook for EPM platform selection and implementation planning. This comprehensive 12-worksheet toolkit consolidates everything finance leaders need to evaluate, select, and deploy enterprise performance management solutions. VENDOR EVALUATION MODULE: 100+ detailed scoring criteria across 9 functional categories (Consolidation, Planning, Reporting, AI/Innovation, Governance, Integration, UX, Commercial, Security) with weighted scoring formulas, benchmark data for OneStream/Anaplan/Oracle/Pigment/Workiva, and automated recommendation engine. RFP TEMPLATE: Complete request for proposal sections covering functional requirements, technical specifications, and commercial terms with pre-written requirement statements for consolidation, planning, and close management. ROI CALCULATOR: Pre-built formulas for 3-year NPV, payback period, and sensitivity analysis with UK-specific labour cost benchmarks and scenario modelling. IMPLEMENTATION READINESS: 120+ point assessment checklist covering data harmonisation, hierarchy design, master data quality, and UAT resourcing. TCO COMPARISON MODEL: Licensing, implementation, training, and ongoing support cost modelling across vendors. DEMO EVALUATION SCORECARD: Structured assessment criteria for vendor demonstrations. GO/NO-GO DECISION MATRIX: Executive summary dashboard with risk ratings and recommendation frameworks. Includes conditional formatting, automated calculations, and board-ready visualisations. Based on 75+ successful EPM selections across UK mid-market and enterprise organisations.",
        category: "Flagship Toolkits",
        fileType: "xls",
        fileUrl: "/resources/epm-selection-implementation-toolkit.xlsx",
        fileSize: "5.8 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-28",
      },
      {
        title: "AI for Finance Transformation Toolkit",
        slug: "ai-finance-transformation-toolkit",
        description: "The comprehensive Excel workbook for CFOs evaluating and implementing AI across finance functions. This 10-worksheet flagship toolkit combines readiness assessment, ROI modelling, risk evaluation, and implementation planning into a single powerful resource. READINESS ASSESSMENT MODULE: 50+ criteria evaluating data foundation, process maturity, technology infrastructure, skills, and governance with automated scoring, maturity level interpretation, and gap analysis. ROI CALCULATOR: Pre-built formulas quantifying returns across 15 finance AI use cases including invoice processing, cash flow forecasting, anomaly detection, and reconciliation automation with UK salary benchmarks, productivity gains modelling, NPV/IRR calculations, and sensitivity analysis. RISK & COMPLIANCE SCORECARD: 50+ criteria for evaluating AI vendors on transparency, bias detection, data privacy, FCA alignment, and GDPR compliance with weighted scoring and contract clause recommendations. USE CASE PRIORITISATION MATRIX: Business value vs implementation complexity scoring for 40+ AI applications with phased adoption roadmap generator. VENDOR CAPABILITY COMPARISON: Side-by-side evaluation of Oracle, SAP, Microsoft, Workday, and specialist AI providers. GOVERNANCE FRAMEWORK: Model documentation templates, human oversight protocols, and board reporting structures. IMPLEMENTATION PLANNING: Resource requirements, timeline templates, and change management checklist. All worksheets feature automated calculations, conditional formatting, and executive-ready dashboards. Based on AI initiatives across 35+ UK finance functions.",
        category: "Flagship Toolkits",
        fileType: "xls",
        fileUrl: "/resources/ai-finance-transformation-toolkit.xlsx",
        fileSize: "4.6 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-27",
      },
      // ERP PROGRAMME RESOURCES
      {
        title: "ERP Selection & Implementation Toolkit",
        slug: "erp-selection-implementation-toolkit",
        description: "The comprehensive Excel workbook for ERP platform selection and implementation planning. This flagship 14-worksheet toolkit provides everything finance and IT leaders need to evaluate, select, and deploy enterprise resource planning solutions. VENDOR EVALUATION MODULE: 120+ detailed scoring criteria across 8 functional categories (Core Financials, Procurement, Inventory, Manufacturing, HR, Integration, Technical, Commercial) with weighted scoring formulas and benchmark data for SAP S/4HANA, Oracle Fusion Cloud, Microsoft Dynamics 365, NetSuite, and Workday. RFP TEMPLATE: Complete request for proposal sections covering company background, project scope, functional requirements (AP, AR, GL, Fixed Assets, Cash Management), technical specifications, and commercial terms with pre-written requirement statements. ROI CALCULATOR: Pre-built formulas for TCO analysis, 5-year NPV, payback period, and sensitivity modelling with UK-specific labour and licensing benchmarks. IMPLEMENTATION READINESS: 100+ point assessment checklist covering data quality, process documentation, segregation of duties, and UAT resourcing with gate review criteria. DEMO EVALUATION SCORECARD: 25 scenario scripts with structured scoring rubrics for vendor demonstrations across procure-to-pay, order-to-cash, and record-to-report workflows. RISK MANAGEMENT: Complete risk register template with probability/impact matrices, mitigation tracking, and escalation thresholds. OPERATING MODEL & RACI: Role definitions for 25+ programme and steady-state roles with detailed RACI matrices. BENEFITS TRACKER: Pre-built KPI dashboards for tracking efficiency gains, cost reduction, and cycle time improvements. Includes conditional formatting, automated calculations, and board-ready visualisations. Based on 100+ successful UK ERP selections across manufacturing, distribution, and professional services sectors.",
        category: "Flagship Toolkits",
        fileType: "xls",
        fileUrl: "/resources/erp-selection-implementation-toolkit.xlsx",
        fileSize: "6.4 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-26",
      },
      {
        title: "Benefits Realisation Tracker",
        slug: "benefits-realisation-tracker",
        description: "A comprehensive Excel-based benefits tracking workbook designed to capture, measure, and report ROI metrics throughout ERP and EPM programme delivery and into steady-state operations. The benefit categories framework organises expected benefits across efficiency gains (including automated consolidation and reduced reporting effort), cost reduction, cycle time improvements (close calendar compression and planning cycle shortening), quality improvements (forecast accuracy enhancement and reconciliation exception reduction), agility benefits (scenario analysis speed and reforecast frequency enablement), risk mitigation, and compliance improvement dimensions with standard KPI definitions for each category. Baseline capture templates provide structured collection of pre-implementation metrics including process cycle times, FTE effort, error rates, processing costs, consolidation elapsed days, and spreadsheet dependency levels enabling accurate benefit measurement post-implementation. The measurement methodology section defines data sources, calculation formulas, measurement frequency, and responsibility assignments for each tracked benefit ensuring consistent, auditable benefit reporting aligned to business case commitments. Value driver analysis templates link platform capabilities to specific business outcomes with cause-effect documentation. Pre-built dashboard templates generate executive-ready visualisations showing planned versus actual benefit realisation, benefit trajectory trends, and variance analysis with root cause commentary. The executive reporting pack provides monthly and quarterly benefit summary formats aligned to typical SteerCo and board reporting requirements with NPV, payback, and IRR calculations demonstrating investment returns to executive stakeholders. Benefit dependency mapping identifies prerequisite changes, process adoption milestones, and technology enablers that must be achieved for each benefit to materialise. Risk adjustment factors enable realistic benefit forecasting accounting for adoption delays, scope changes, and organisational constraints. Includes benefit owner accountability matrix, benefit realisation workshop facilitation guide, and case study examples demonstrating 15-40% efficiency improvements achieved by UK organisations. Compatible with programme business case formats from all major consultancies.",
        category: "Frameworks & Templates",
        fileType: "xls",
        fileUrl: "/resources/benefits-realisation-tracker.xlsx",
        fileSize: "2.2 MB",
        downloadCount: 0,
        featured: false,
        publishedAt: "2024-12-09",
      },
      // ERP MIGRATION PROGRAMME RESOURCES
      {
        title: "ERP Migration Programme Tracker & RAID Register",
        slug: "erp-migration-programme-tracker",
        description: "Comprehensive programme management toolkit with 7-phase tracker covering Initiation through Go-Live, plus integrated RAID (Risks, Assumptions, Issues, Dependencies) register with severity scoring and mitigation tracking. Includes 85+ pre-populated tasks with dependencies, status tracking, and programme health metrics.",
        category: "ERP Implementation",
        fileType: "xls",
        fileUrl: "/resources/erp-migration-programme-tracker.xlsx",
        fileSize: "2.8 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-08",
      },
      {
        title: "ERP Fit-Gap Analysis & Remediation Log",
        slug: "erp-fit-gap-remediation-log",
        description: "Structured fit-gap analysis framework covering P2P, O2C, R2R, and HR processes with 70+ requirement assessments. Includes remediation tracking with effort estimation in days, cost analysis in GBP, and priority-weighted scoring for gap closure planning.",
        category: "ERP Implementation",
        fileType: "xls",
        fileUrl: "/resources/erp-fit-gap-remediation-log.xlsx",
        fileSize: "2.4 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-07",
      },
      {
        title: "Data Cleansing & Cutover Readiness Matrix",
        slug: "erp-data-cleansing-cutover-matrix",
        description: "Data quality assessment matrix with 48+ entity types across master data, transactional, and historical categories. Includes quality scoring (1-5 scale), cleansing action tracking, and comprehensive cutover checklist with T-minus timing for go-live activities.",
        category: "ERP Implementation",
        fileType: "xls",
        fileUrl: "/resources/erp-data-cleansing-cutover-matrix.xlsx",
        fileSize: "2.1 MB",
        downloadCount: 0,
        featured: false,
        publishedAt: "2024-12-06",
      },
      {
        title: "Integration & Interface Validation Plan",
        slug: "erp-integration-validation-plan",
        description: "Interface inventory and validation framework with 48+ integration points covering Financial, CRM, Supply Chain, HR, and Compliance systems. Includes detailed test case library with 35+ scenarios, dependency mapping, and validation status tracking.",
        category: "ERP Implementation",
        fileType: "xls",
        fileUrl: "/resources/erp-integration-validation-plan.xlsx",
        fileSize: "2.3 MB",
        downloadCount: 0,
        featured: false,
        publishedAt: "2024-12-05",
      },
      {
        title: "Change Impact Heatmap & Stakeholder Readiness",
        slug: "erp-change-impact-heatmap",
        description: "Change impact assessment across Finance, Procurement, HR, Sales, and Operations with 37+ impact areas. Includes ADKAR-based stakeholder readiness scoring for 33+ stakeholder groups, training needs analysis, and communication planning framework.",
        category: "ERP Implementation",
        fileType: "xls",
        fileUrl: "/resources/erp-change-impact-heatmap.xlsx",
        fileSize: "2.5 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-04",
      },
      {
        title: "Financial Benefits & TCO Tracking Dashboard",
        slug: "erp-financial-benefits-tco-dashboard",
        description: "Benefits realisation register with 32+ benefits across Efficiency, Revenue, Working Capital, Risk, and IT categories. Includes 5-year TCO analysis with NPV and ROI calculations, variance tracking, and financial impact measurement in GBP.",
        category: "ERP Implementation",
        fileType: "xls",
        fileUrl: "/resources/erp-financial-benefits-tco-dashboard.xlsx",
        fileSize: "2.6 MB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-03",
      },
      // ERP IMPLEMENTATION RESOURCES
      {
        title: "ERP Data Migration Checklist",
        slug: "erp-data-migration-checklist",
        description: "A comprehensive Excel-based data migration checklist with 65+ tasks across pre-migration, execution, and post-migration phases. Includes data quality scorecard for 20 key entities with automated completeness and accuracy calculations, reconciliation log with variance tracking, and status dashboards. Features pre-populated task IDs, owner assignments, status dropdowns, and conditional formatting. Essential for ensuring data integrity during ERP cutover.",
        category: "Checklists",
        fileType: "xls",
        fileUrl: "/resources/erp-data-migration-checklist.xlsx",
        fileSize: "32 KB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-02",
      },
      {
        title: "ERP Cutover Execution Checklist",
        slug: "erp-cutover-execution-checklist",
        description: "A detailed Excel-based cutover execution checklist with 70+ tasks spanning T-5 days through hypercare. Covers pre-cutover preparation, final preparation, go-live execution, and post-go-live stabilisation phases. Includes Go/No-Go criteria assessment, issue log with priority tracking, and stakeholder contact matrix. Features timing columns, dependency mapping, and status dropdowns. Based on cutover runbooks from enterprise ERP deployments processing 10,000+ daily transactions.",
        category: "Checklists",
        fileType: "xls",
        fileUrl: "/resources/erp-cutover-execution-checklist.xlsx",
        fileSize: "35 KB",
        downloadCount: 0,
        featured: true,
        publishedAt: "2024-12-02",
      },
    ];
  }


  // Marketing assets operations
  async getMarketingAssets(params?: PaginationParams): Promise<PaginatedResult<MarketingAssetDb>> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const [countResult] = await db.select({ total: count() }).from(marketingAssets);
    const total = countResult?.total ?? 0;

    const items = await db.select().from(marketingAssets)
      .orderBy(desc(marketingAssets.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async getMarketingAssetById(id: string): Promise<MarketingAssetDb | undefined> {
    const [asset] = await db.select().from(marketingAssets).where(eq(marketingAssets.id, id));
    return asset;
  }

  async getMarketingAssetsByCategory(category: string): Promise<MarketingAssetDb[]> {
    return await db.select().from(marketingAssets)
      .where(eq(marketingAssets.category, category))
      .orderBy(desc(marketingAssets.createdAt));
  }

  async getMarketingAssetsByType(type: string): Promise<MarketingAssetDb[]> {
    return await db.select().from(marketingAssets)
      .where(eq(marketingAssets.type, type))
      .orderBy(desc(marketingAssets.createdAt));
  }

  async createMarketingAsset(asset: InsertMarketingAssetDb): Promise<MarketingAssetDb> {
    const [created] = await db.insert(marketingAssets).values(asset).returning();
    return created;
  }

  async updateMarketingAsset(id: string, updates: Partial<InsertMarketingAssetDb>): Promise<MarketingAssetDb | undefined> {
    const [updated] = await db.update(marketingAssets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketingAssets.id, id))
      .returning();
    return updated;
  }

  async deleteMarketingAsset(id: string): Promise<boolean> {
    const result = await db.delete(marketingAssets).where(eq(marketingAssets.id, id)).returning();
    return result.length > 0;
  }

  // GUARDRAIL OPERATIONS
  
  async getGuardrailCategories(): Promise<GuardrailCategoryDb[]> {
    return await db.select().from(guardrailCategories).orderBy(guardrailCategories.sortOrder);
  }
  
  async getGuardrailRules(params?: PaginationParams): Promise<PaginatedResult<GuardrailRuleDb>> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const [countResult] = await db.select({ total: count() }).from(guardrailRules);
    const total = countResult?.total ?? 0;

    const items = await db.select().from(guardrailRules)
      .orderBy(guardrailRules.sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }
  
  async getGuardrailRulesByCategory(categoryId: string): Promise<GuardrailRuleDb[]> {
    return await db.select().from(guardrailRules)
      .where(eq(guardrailRules.categoryId, categoryId))
      .orderBy(guardrailRules.sortOrder);
  }
  
  async updateGuardrailRule(id: string, updates: Partial<GuardrailRuleDb>): Promise<GuardrailRuleDb | undefined> {
    const result = await db.update(guardrailRules)
      .set(updates)
      .where(eq(guardrailRules.id, id))
      .returning();
    return result[0];
  }
  
  async deleteGuardrailRule(id: string): Promise<boolean> {
    const result = await db.delete(guardrailRules).where(eq(guardrailRules.id, id)).returning();
    return result.length > 0;
  }

  async deleteGuardrailCategory(id: string): Promise<boolean> {
    const result = await db.delete(guardrailCategories).where(eq(guardrailCategories.id, id)).returning();
    return result.length > 0;
  }
  
  async createGuardrailCategory(category: InsertGuardrailCategoryDb): Promise<GuardrailCategoryDb> {
    const result = await db.insert(guardrailCategories).values(category).returning();
    return result[0];
  }
  
  async createGuardrailRule(rule: InsertGuardrailRuleDb): Promise<GuardrailRuleDb> {
    const result = await db.insert(guardrailRules).values(rule).returning();
    return result[0];
  }
  
  // BLOG GENERATION PIPELINE OPERATIONS
  async createBlogGenerationJob(job: InsertBlogGenerationJobDb): Promise<BlogGenerationJobDb> {
    const result = await db.insert(blogGenerationJobs).values(job).returning();
    return result[0];
  }
  
  async getBlogGenerationJob(id: string): Promise<BlogGenerationJobDb | undefined> {
    const result = await db.select().from(blogGenerationJobs).where(eq(blogGenerationJobs.id, id));
    return result[0];
  }
  
  async updateBlogGenerationJob(id: string, updates: Partial<BlogGenerationJobDb>): Promise<BlogGenerationJobDb | undefined> {
    const result = await db.update(blogGenerationJobs)
      .set(updates)
      .where(eq(blogGenerationJobs.id, id))
      .returning();
    return result[0];
  }
  
  async getBlogGenerationJobs(): Promise<BlogGenerationJobDb[]> {
    return await db.select().from(blogGenerationJobs).orderBy(desc(blogGenerationJobs.createdAt));
  }

  // FinanceCompass AI Configuration Operations
  async getFcAiSystemPrompts(): Promise<FcAiSystemPrompt[]> {
    return await db.select().from(fcAiSystemPrompts).orderBy(desc(fcAiSystemPrompts.createdAt));
  }

  async getFcAiSystemPromptById(id: string): Promise<FcAiSystemPrompt | undefined> {
    const [result] = await db.select().from(fcAiSystemPrompts).where(eq(fcAiSystemPrompts.id, id));
    return result;
  }

  async createFcAiSystemPrompt(data: InsertFcAiSystemPrompt): Promise<FcAiSystemPrompt> {
    const [result] = await db.insert(fcAiSystemPrompts).values(data).returning();
    return result;
  }

  async updateFcAiSystemPrompt(id: string, data: Partial<InsertFcAiSystemPrompt>): Promise<FcAiSystemPrompt | undefined> {
    const [result] = await db.update(fcAiSystemPrompts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fcAiSystemPrompts.id, id))
      .returning();
    return result;
  }

  async deleteFcAiSystemPrompt(id: string): Promise<boolean> {
    const result = await db.delete(fcAiSystemPrompts).where(eq(fcAiSystemPrompts.id, id)).returning();
    return result.length > 0;
  }

  async getFcAiGuardrails(): Promise<FcAiGuardrail[]> {
    return await db.select().from(fcAiGuardrails).orderBy(desc(fcAiGuardrails.createdAt));
  }

  async getFcAiGuardrailById(id: string): Promise<FcAiGuardrail | undefined> {
    const [result] = await db.select().from(fcAiGuardrails).where(eq(fcAiGuardrails.id, id));
    return result;
  }

  async createFcAiGuardrail(data: InsertFcAiGuardrail): Promise<FcAiGuardrail> {
    const [result] = await db.insert(fcAiGuardrails).values(data).returning();
    return result;
  }

  async updateFcAiGuardrail(id: string, data: Partial<InsertFcAiGuardrail>): Promise<FcAiGuardrail | undefined> {
    const [result] = await db.update(fcAiGuardrails)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fcAiGuardrails.id, id))
      .returning();
    return result;
  }

  async deleteFcAiGuardrail(id: string): Promise<boolean> {
    const result = await db.delete(fcAiGuardrails).where(eq(fcAiGuardrails.id, id)).returning();
    return result.length > 0;
  }

  async getFcAiGroundingRules(): Promise<FcAiGroundingRule[]> {
    return await db.select().from(fcAiGroundingRules).orderBy(desc(fcAiGroundingRules.createdAt));
  }

  async getFcAiGroundingRuleById(id: string): Promise<FcAiGroundingRule | undefined> {
    const [result] = await db.select().from(fcAiGroundingRules).where(eq(fcAiGroundingRules.id, id));
    return result;
  }

  async createFcAiGroundingRule(data: InsertFcAiGroundingRule): Promise<FcAiGroundingRule> {
    const [result] = await db.insert(fcAiGroundingRules).values(data).returning();
    return result;
  }

  async updateFcAiGroundingRule(id: string, data: Partial<InsertFcAiGroundingRule>): Promise<FcAiGroundingRule | undefined> {
    const [result] = await db.update(fcAiGroundingRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fcAiGroundingRules.id, id))
      .returning();
    return result;
  }

  async deleteFcAiGroundingRule(id: string): Promise<boolean> {
    const result = await db.delete(fcAiGroundingRules).where(eq(fcAiGroundingRules.id, id)).returning();
    return result.length > 0;
  }

  async getFcAiKnowledgeBaseEntries(): Promise<FcAiKnowledgeBaseType[]> {
    return await db.select().from(fcAiKnowledgeBase).orderBy(desc(fcAiKnowledgeBase.createdAt));
  }

  async getFcAiKnowledgeBaseById(id: string): Promise<FcAiKnowledgeBaseType | undefined> {
    const [result] = await db.select().from(fcAiKnowledgeBase).where(eq(fcAiKnowledgeBase.id, id));
    return result;
  }

  async createFcAiKnowledgeBase(data: InsertFcAiKnowledgeBase): Promise<FcAiKnowledgeBaseType> {
    const [result] = await db.insert(fcAiKnowledgeBase).values(data).returning();
    return result;
  }

  async updateFcAiKnowledgeBase(id: string, data: Partial<InsertFcAiKnowledgeBase>): Promise<FcAiKnowledgeBaseType | undefined> {
    const [result] = await db.update(fcAiKnowledgeBase)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fcAiKnowledgeBase.id, id))
      .returning();
    return result;
  }

  async deleteFcAiKnowledgeBase(id: string): Promise<boolean> {
    const result = await db.delete(fcAiKnowledgeBase).where(eq(fcAiKnowledgeBase.id, id)).returning();
    return result.length > 0;
  }

  async getFcAiFollowupTemplates(): Promise<FcAiFollowupTemplate[]> {
    return await db.select().from(fcAiFollowupTemplates).orderBy(desc(fcAiFollowupTemplates.createdAt));
  }

  async getFcAiFollowupTemplateById(id: string): Promise<FcAiFollowupTemplate | undefined> {
    const [result] = await db.select().from(fcAiFollowupTemplates).where(eq(fcAiFollowupTemplates.id, id));
    return result;
  }

  async createFcAiFollowupTemplate(data: InsertFcAiFollowupTemplate): Promise<FcAiFollowupTemplate> {
    const [result] = await db.insert(fcAiFollowupTemplates).values(data).returning();
    return result;
  }

  async updateFcAiFollowupTemplate(id: string, data: Partial<InsertFcAiFollowupTemplate>): Promise<FcAiFollowupTemplate | undefined> {
    const [result] = await db.update(fcAiFollowupTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fcAiFollowupTemplates.id, id))
      .returning();
    return result;
  }

  async deleteFcAiFollowupTemplate(id: string): Promise<boolean> {
    const result = await db.delete(fcAiFollowupTemplates).where(eq(fcAiFollowupTemplates.id, id)).returning();
    return result.length > 0;
  }

  async createPageView(pageView: InsertPageViewDb): Promise<PageViewDb> {
    const [result] = await db.insert(pageViews).values(pageView).returning();
    return result;
  }

  async upsertVisitorSession(data: {
    sessionId: string;
    visitorId: string;
    path: string;
    referrer?: string | null;
    deviceType?: string;
    browser?: string;
    os?: string;
    duration?: number;
    isBot?: boolean;
  }): Promise<void> {
    try {
      // Check if session already exists
      const [existingSession] = await db.select()
        .from(visitorSessions)
        .where(eq(visitorSessions.id, data.sessionId))
        .limit(1);
      
      if (existingSession) {
        // Update existing session: increment page count, add duration, update exit page
        await db.update(visitorSessions)
          .set({
            pageCount: sql`${visitorSessions.pageCount} + 1`,
            totalDuration: sql`${visitorSessions.totalDuration} + ${data.duration || 0}`,
            exitPage: data.path,
            endedAt: new Date(),
          })
          .where(eq(visitorSessions.id, data.sessionId));
      } else {
        // Create new session
        await db.insert(visitorSessions).values({
          id: data.sessionId,
          visitorId: data.visitorId,
          entryPage: data.path,
          exitPage: data.path,
          referrer: data.referrer,
          deviceType: data.deviceType,
          browser: data.browser,
          os: data.os,
          pageCount: 1,
          totalDuration: data.duration || 0,
          isBot: data.isBot ?? false,
        });
      }
    } catch (error) {
      storageLog.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to upsert visitor session");
    }
  }

  // Ad Click Fraud Tracking Methods
  async logAdClick(data: InsertAdClickLog): Promise<AdClickLog> {
    const [result] = await db.insert(adClickLogs).values(data).returning();
    return result;
  }

  async getAdClickLogs(limit = 100, offset = 0): Promise<AdClickLog[]> {
    return await db.select()
      .from(adClickLogs)
      .orderBy(desc(adClickLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getSuspiciousClicks(minScore = 50): Promise<AdClickLog[]> {
    return await db.select()
      .from(adClickLogs)
      .where(sql`${adClickLogs.suspiciousScore} >= ${minScore}`)
      .orderBy(desc(adClickLogs.suspiciousScore));
  }

  async getClicksByIP(ipAddress: string): Promise<AdClickLog[]> {
    return await db.select()
      .from(adClickLogs)
      .where(eq(adClickLogs.ipAddress, ipAddress))
      .orderBy(desc(adClickLogs.createdAt));
  }

  async getClickCountryStats(): Promise<{ country: string; count: number; avgScore: number }[]> {
    const result = await db.select({
      country: adClickLogs.country,
      count: sql<number>`count(*)::int`,
      avgScore: sql<number>`round(avg(${adClickLogs.suspiciousScore}))::int`,
    })
      .from(adClickLogs)
      .groupBy(adClickLogs.country)
      .orderBy(sql`count(*) desc`);
    
    return result.map(r => ({
      country: r.country || 'Unknown',
      count: r.count,
      avgScore: r.avgScore || 0,
    }));
  }

  async getRecentClicksByIP(ipAddress: string, withinMinutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(adClickLogs)
      .where(and(
        eq(adClickLogs.ipAddress, ipAddress),
        gt(adClickLogs.createdAt, cutoff)
      ));
    return result[0]?.count || 0;
  }

  async seedInitialData(): Promise<void> {
    // Check current state for resources and categories
    const existingFiles = await db.select().from(resourceFiles);
    const existingCategories = await db.select().from(blogCategories);
    
    // Seed categories if not present
    if (existingCategories.length === 0) {
      const categoriesData = [
        { name: "Finance Transformation", slug: "finance-transformation", description: "Modern finance function strategies and insights" },
        { name: "EPM & ERP", slug: "epm-erp", description: "Enterprise Performance Management and Resource Planning" },
        { name: "AI & Technology", slug: "ai-technology", description: "AI-powered solutions for finance" },
        { name: "Industry Insights", slug: "industry-insights", description: "Expert analysis and market trends" },
        { name: "Case Studies", slug: "case-studies", description: "Industry transformation examples and analysis" },
      ];
      await db.insert(blogCategories).values(categoriesData).onConflictDoNothing();
    }
    
    // Upsert resources: insert new ones with downloadCount: 0, preserve existing download counts
    // This ensures real download statistics are never overwritten by seed data
    const filesData = this.getEnhancedFilesData();
    const existingSlugs = new Set(existingFiles.map(f => f.slug));
    
    for (const fileData of filesData) {
      if (!existingSlugs.has(fileData.slug)) {
        // New resource - insert with downloadCount: 0 (no fake stats)
        await db.insert(resourceFiles).values({
          ...fileData,
          downloadCount: 0,
        }).onConflictDoNothing();
        storageLog.info({ slug: fileData.slug }, "Added new resource");
      }
      // Existing resources are left untouched - their real download counts are preserved
    }
  }

  async getFeatureFlagOverrides(): Promise<FeatureFlagOverride[]> {
    return await db.select().from(featureFlagOverrides);
  }

  async getFeatureFlagOverride(featureKey: string): Promise<FeatureFlagOverride | undefined> {
    const result = await db.select().from(featureFlagOverrides).where(eq(featureFlagOverrides.featureKey, featureKey));
    return result[0];
  }

  async upsertFeatureFlagOverride(data: InsertFeatureFlagOverride): Promise<FeatureFlagOverride> {
    const result = await db.insert(featureFlagOverrides)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: featureFlagOverrides.featureKey,
        set: {
          isEnabled: data.isEnabled,
          updatedBy: data.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async deleteFeatureFlagOverride(featureKey: string): Promise<boolean> {
    const result = await db.delete(featureFlagOverrides).where(eq(featureFlagOverrides.featureKey, featureKey)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
