import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, bigint, jsonb, json, index, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const contactSubmissions = pgTable("contact_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  emailHash: text("email_hash"),  // For encrypted email lookups
  company: text("company"),
  jobTitle: text("job_title"),
  phone: text("phone"),
  message: text("message").notNull(),
  consentMarketing: boolean("consent_marketing").default(false).notNull(),
  hubspotSynced: boolean("hubspot_synced").default(false).notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  verified: boolean("verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  // Browser fingerprint data for lead enrichment
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  screenResolution: text("screen_resolution"),
  timezone: text("timezone"),
  language: text("language"),
  platform: text("platform"),
  deviceMemory: integer("device_memory"),
  hardwareConcurrency: integer("hardware_concurrency"),
  referrer: text("referrer"),
  pageUrl: text("page_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
  hubspotSynced: true,
  emailSent: true,
  verified: true,
  verifiedAt: true,
});

export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;

// Blog Categories Table
export const blogCategories = pgTable("blog_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
});

export const insertBlogCategoryDbSchema = createInsertSchema(blogCategories).omit({
  id: true,
});

export type InsertBlogCategoryDb = z.infer<typeof insertBlogCategoryDbSchema>;
export type BlogCategoryDb = typeof blogCategories.$inferSelect;

// Blog Posts Table
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  heroImage: text("hero_image"),
  categoryId: varchar("category_id").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  author: text("author").notNull(),
  authorImage: text("author_image"),
  publishedAt: text("published_at").notNull(),
  readingTime: text("reading_time").notNull(),
  featured: boolean("featured").default(false).notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  views: integer("views").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBlogPostDbSchema = createInsertSchema(blogPosts).omit({
  id: true,
});

export type InsertBlogPostDb = z.infer<typeof insertBlogPostDbSchema>;
export type BlogPostDb = typeof blogPosts.$inferSelect;

// Blog Drafts Table - Persists AI-generated blog drafts for later editing
export const blogDrafts = pgTable("blog_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  targetKeywords: text("target_keywords").array().notNull().default(sql`'{}'::text[]`),
  targetAudience: text("target_audience"),
  categoryId: varchar("category_id"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed, published
  stage: text("stage"), // research, outline, winston_outline_check, outline_retry, draft, winston_final_check, draft_retry, finalizing, completed
  researchData: text("research_data"),
  citations: text("citations"),
  outlineData: text("outline_data"),
  finalContent: text("final_content"),
  guardrailResults: text("guardrail_results"),
  errorMessage: text("error_message"),
  totalTokensUsed: integer("total_tokens_used").default(0).notNull(),
  estimatedCost: text("estimated_cost"),
  aiScore: integer("ai_score"),
  plagiarismScore: integer("plagiarism_score"),
  triggeredBy: text("triggered_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertBlogDraftSchema = createInsertSchema(blogDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogDraft = z.infer<typeof insertBlogDraftSchema>;
export type BlogDraft = typeof blogDrafts.$inferSelect;

// Resource Files Table
export const resourceFiles = pgTable("resource_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  fileType: text("file_type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: text("file_size").notNull(),
  downloadCount: integer("download_count").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  featured: boolean("featured").default(false).notNull(),
  publishedAt: text("published_at").notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResourceFileDbSchema = createInsertSchema(resourceFiles).omit({
  id: true,
  downloadCount: true,
  viewCount: true,
});

export type InsertResourceFileDb = z.infer<typeof insertResourceFileDbSchema>;
export type ResourceFileDb = typeof resourceFiles.$inferSelect;

// Blog Categories
export const blogCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
});

export type BlogCategory = z.infer<typeof blogCategorySchema>;

export const insertBlogCategorySchema = blogCategorySchema.omit({ id: true });
export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;

// Blog Posts
export const blogPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  content: z.string(),
  heroImage: z.string().optional(),
  categoryId: z.string(),
  tags: z.array(z.string()),
  author: z.string(),
  authorImage: z.string().optional(),
  publishedAt: z.string(),
  readingTime: z.string(),
  featured: z.boolean().default(false),
  views: z.number().default(0),
});

export type BlogPost = z.infer<typeof blogPostSchema>;

export const insertBlogPostSchema = blogPostSchema.omit({ id: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

// Resource Files
export const resourceFileSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string(),
  fileType: z.enum(["pdf", "doc", "xls", "zip", "video", "image", "other"]),
  fileUrl: z.string(),
  fileSize: z.string(),
  downloadCount: z.number().default(0),
  viewCount: z.number().default(0),
  featured: z.boolean().default(false),
  publishedAt: z.string(),
});

export type ResourceFile = z.infer<typeof resourceFileSchema>;

export const insertResourceFileSchema = resourceFileSchema.omit({ id: true, downloadCount: true, viewCount: true });
export type InsertResourceFile = z.infer<typeof insertResourceFileSchema>;

// SEO Metadata
export const seoMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  ogImage: z.string().optional(),
  canonicalUrl: z.string(),
});

export type SEOMetadata = z.infer<typeof seoMetadataSchema>;

export const structuredDataSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.string(),
  name: z.string(),
  url: z.string(),
  logo: z.string().optional(),
  description: z.string(),
  contactPoint: z.object({
    "@type": z.literal("ContactPoint"),
    contactType: z.string(),
    availableLanguage: z.string(),
  }).optional(),
  sameAs: z.array(z.string()).optional(),
});

export type StructuredData = z.infer<typeof structuredDataSchema>;

export const sitemapEntrySchema = z.object({
  loc: z.string(),
  lastmod: z.string(),
  changefreq: z.enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]),
  priority: z.number().min(0).max(1),
});

export type SitemapEntry = z.infer<typeof sitemapEntrySchema>;

export const exportOptionsSchema = z.object({
  includeHtml: z.boolean().default(true),
  includeCss: z.boolean().default(true),
  includeAssets: z.boolean().default(true),
  includeMetaFiles: z.boolean().default(true),
});

export type ExportOptions = z.infer<typeof exportOptionsSchema>;

// Article Structured Data for Blog Posts
export const articleStructuredDataSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("Article"),
  headline: z.string(),
  description: z.string(),
  image: z.string().optional(),
  author: z.object({
    "@type": z.literal("Person"),
    name: z.string(),
  }),
  publisher: z.object({
    "@type": z.literal("Organization"),
    name: z.string(),
    logo: z.object({
      "@type": z.literal("ImageObject"),
      url: z.string(),
    }),
  }),
  datePublished: z.string(),
  dateModified: z.string(),
  mainEntityOfPage: z.object({
    "@type": z.literal("WebPage"),
    "@id": z.string(),
  }),
});

export type ArticleStructuredData = z.infer<typeof articleStructuredDataSchema>;

// Resource Leads Table (for gated downloads)
export const resourceLeads = pgTable("resource_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  emailHash: text("email_hash"),  // For encrypted email lookups
  company: text("company").notNull(),
  jobTitle: text("job_title").notNull(),
  verified: boolean("verified").default(false).notNull(),
  resourceId: varchar("resource_id"),
  subscribeNewsletter: boolean("subscribe_newsletter").default(true).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // Browser fingerprint data for bot detection and lead enrichment
  screenResolution: text("screen_resolution"),
  timezone: text("timezone"),
  language: text("language"),
  platform: text("platform"),
  deviceMemory: integer("device_memory"),
  hardwareConcurrency: integer("hardware_concurrency"),
  referrer: text("referrer"),
  pageUrl: text("page_url"),
  clickTimestamp: timestamp("click_timestamp"),
  hubspotSynced: boolean("hubspot_synced").default(false).notNull(),
  hubspotContactId: text("hubspot_contact_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

export const insertResourceLeadDbSchema = createInsertSchema(resourceLeads).omit({
  id: true,
  verified: true,
  hubspotSynced: true,
  hubspotContactId: true,
  createdAt: true,
  verifiedAt: true,
});

export type InsertResourceLeadDb = z.infer<typeof insertResourceLeadDbSchema>;
export type ResourceLeadDb = typeof resourceLeads.$inferSelect;

// Resource OTPs Table (legacy - kept for backwards compatibility)
export const resourceOtps = pgTable("resource_otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResourceOtpDbSchema = createInsertSchema(resourceOtps).omit({
  id: true,
  attempts: true,
  used: true,
  createdAt: true,
});

export type InsertResourceOtpDb = z.infer<typeof insertResourceOtpDbSchema>;
export type ResourceOtpDb = typeof resourceOtps.$inferSelect;

// Email Verification Tokens Table (for link-based verification)
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id"),  // For resource downloads (nullable for contact submissions)
  contactSubmissionId: varchar("contact_submission_id"),  // For contact form submissions
  token: text("token").notNull().unique(), // Secure random token
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  used: true,
  usedAt: true,
  createdAt: true,
});

export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// Resource Lead Zod Schema (for API validation)
export const resourceLeadSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  company: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  verified: z.boolean(),
  resourceId: z.string().optional(),
  createdAt: z.string(),
  verifiedAt: z.string().optional(),
});

export type ResourceLead = z.infer<typeof resourceLeadSchema>;

export const insertResourceLeadSchema = resourceLeadSchema.omit({ 
  id: true, 
  verified: true, 
  createdAt: true, 
  verifiedAt: true 
});
export type InsertResourceLead = z.infer<typeof insertResourceLeadSchema>;

// Blocked email domains (consumer/free email providers)
export const BLOCKED_EMAIL_DOMAINS = [
  // Major free email providers
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de",
  "outlook.com", "outlook.co.uk",
  "live.com", "live.co.uk",
  "msn.com",
  "aol.com", "aol.co.uk",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me",
  "mail.com",
  "zoho.com",
  "yandex.com", "yandex.ru",
  "gmx.com", "gmx.net", "gmx.de",
  "fastmail.com",
  "tutanota.com",
  "hey.com",
  // UK specific
  "btinternet.com", "btopenworld.com",
  "virginmedia.com", "ntlworld.com",
  "sky.com", "talktalk.net",
  "blueyonder.co.uk",
  // Other common free providers
  "inbox.com", "rocketmail.com",
  "rediffmail.com", "qq.com", "163.com", "126.com",
  "seznam.cz", "wp.pl", "o2.pl",
];

// Email validation helper
export function isBusinessEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  // Allow constancia domains
  if (domain.includes("constancia")) return true;
  return !BLOCKED_EMAIL_DOMAINS.includes(domain);
}

// Resource Sessions Table (for caching verified user state)
export const resourceSessions = pgTable("resource_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  emailHash: text("email_hash").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  revoked: boolean("revoked").default(false).notNull(),
});

export const insertResourceSessionDbSchema = createInsertSchema(resourceSessions).omit({
  id: true,
  issuedAt: true,
  lastSeenAt: true,
  revoked: true,
});

export type InsertResourceSessionDb = z.infer<typeof insertResourceSessionDbSchema>;
export type ResourceSessionDb = typeof resourceSessions.$inferSelect;

// Resource Downloads Table (for tracking all downloads with session context)
export const resourceDownloads = pgTable("resource_downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id"),
  leadId: varchar("lead_id").notNull(),
  resourceId: varchar("resource_id").notNull(),
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
});

export const insertResourceDownloadDbSchema = createInsertSchema(resourceDownloads).omit({
  id: true,
  downloadedAt: true,
});

export type InsertResourceDownloadDb = z.infer<typeof insertResourceDownloadDbSchema>;
export type ResourceDownloadDb = typeof resourceDownloads.$inferSelect;

// Resource Session Zod Schema (for API responses)
export const resourceSessionSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  emailHash: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
  lastSeenAt: z.string(),
  revoked: z.boolean(),
});

export type ResourceSession = z.infer<typeof resourceSessionSchema>;

// Session status response schema
export const sessionStatusSchema = z.object({
  verified: z.boolean(),
  leadId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

// ============================================
// ADMIN CENTRE TABLES
// ============================================

// Admin Users Table (Replit Auth linked)
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  replitId: text("replit_id").unique(),
  email: text("email").unique(),
  displayName: text("display_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").default(true).notNull(),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdminUserDbSchema = createInsertSchema(adminUsers).omit({
  id: true,
  lastLoginAt: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdminUserDb = z.infer<typeof insertAdminUserDbSchema>;
export type AdminUserDb = typeof adminUsers.$inferSelect;

// Admin Audit Logs Table
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminAuditLogDbSchema = createInsertSchema(adminAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminAuditLogDb = z.infer<typeof insertAdminAuditLogDbSchema>;
export type AdminAuditLogDb = typeof adminAuditLogs.$inferSelect;

// Admin MFA Settings Table
export const adminMfaSettings = pgTable("admin_mfa_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").default(false).notNull(),
  totpVerifiedAt: timestamp("totp_verified_at"),
  backupCodes: text("backup_codes").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdminMfaSettingsDbSchema = createInsertSchema(adminMfaSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdminMfaSettingsDb = z.infer<typeof insertAdminMfaSettingsDbSchema>;
export type AdminMfaSettingsDb = typeof adminMfaSettings.$inferSelect;

// Admin IP Allowlist Table
export const adminIpAllowlist = pgTable("admin_ip_allowlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull(),
  description: text("description"),
  addedBy: varchar("added_by").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminIpAllowlistDbSchema = createInsertSchema(adminIpAllowlist).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminIpAllowlistDb = z.infer<typeof insertAdminIpAllowlistDbSchema>;
export type AdminIpAllowlistDb = typeof adminIpAllowlist.$inferSelect;

// Admin Authorized Emails Table (whitelist for admin access)
export const adminAuthorizedEmails = pgTable("admin_authorized_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  description: text("description"),
  addedBy: varchar("added_by").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminAuthorizedEmailsDbSchema = createInsertSchema(adminAuthorizedEmails).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminAuthorizedEmailsDb = z.infer<typeof insertAdminAuthorizedEmailsDbSchema>;
export type AdminAuthorizedEmailsDb = typeof adminAuthorizedEmails.$inferSelect;

// Admin Bypass Codes Table (for remote work access)
export const adminBypassCodes = pgTable("admin_bypass_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  createdBy: varchar("created_by").notNull(),
  usedBy: varchar("used_by"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  description: text("description"),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminBypassCodesDbSchema = createInsertSchema(adminBypassCodes).omit({
  id: true,
  usedBy: true,
  usedAt: true,
  isUsed: true,
  createdAt: true,
});

export type InsertAdminBypassCodesDb = z.infer<typeof insertAdminBypassCodesDbSchema>;
export type AdminBypassCodesDb = typeof adminBypassCodes.$inferSelect;

// Admin Login History Table
export const adminLoginHistory = pgTable("admin_login_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  loginMethod: text("login_method").notNull(),
  success: boolean("success").default(true).notNull(),
  failureReason: text("failure_reason"),
  bypassCodeId: varchar("bypass_code_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminLoginHistoryDbSchema = createInsertSchema(adminLoginHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminLoginHistoryDb = z.infer<typeof insertAdminLoginHistoryDbSchema>;
export type AdminLoginHistoryDb = typeof adminLoginHistory.$inferSelect;

// Admin Security Settings Table (global settings)
export const adminSecuritySettings = pgTable("admin_security_settings", {
  id: varchar("id").primaryKey().default(sql`'global'`),
  ipAllowlistEnabled: boolean("ip_allowlist_enabled").default(false).notNull(),
  mfaRequired: boolean("mfa_required").default(true).notNull(),
  sessionTimeoutMinutes: integer("session_timeout_minutes").default(30).notNull(),
  notifyOnLogin: boolean("notify_on_login").default(true).notNull(),
  notifyEmails: text("notify_emails").array().default(sql`'{}'::text[]`),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by"),
});

export const insertAdminSecuritySettingsDbSchema = createInsertSchema(adminSecuritySettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertAdminSecuritySettingsDb = z.infer<typeof insertAdminSecuritySettingsDbSchema>;
export type AdminSecuritySettingsDb = typeof adminSecuritySettings.$inferSelect;

// Site Configuration Table (operational settings)
export const siteConfig = pgTable("site_config", {
  id: varchar("id").primaryKey().default(sql`'global'`),
  forceBlogReseed: boolean("force_blog_reseed").default(false).notNull(),
  lastBlogReseedAt: timestamp("last_blog_reseed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by"),
});

export const insertSiteConfigDbSchema = createInsertSchema(siteConfig).omit({
  id: true,
  updatedAt: true,
});

export type InsertSiteConfigDb = z.infer<typeof insertSiteConfigDbSchema>;
export type SiteConfigDb = typeof siteConfig.$inferSelect;

// Winston AI Scan Results Table
export const winstonAiScans = pgTable("winston_ai_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blogPostId: varchar("blog_post_id"),
  resourceId: varchar("resource_id"),
  contentType: text("content_type").notNull().default("blog"),
  scanType: text("scan_type").notNull(),
  aiScore: integer("ai_score"),
  plagiarismScore: integer("plagiarism_score"),
  humanScore: integer("human_score"),
  seoScore: integer("seo_score"),
  seoRecommendations: text("seo_recommendations"),
  creditsUsed: integer("credits_used"),
  sentenceResults: text("sentence_results"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  isSevere: boolean("is_severe").default(false),
  severityReason: text("severity_reason"),
  scannedBy: varchar("scanned_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertWinstonAiScanDbSchema = createInsertSchema(winstonAiScans).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertWinstonAiScanDb = z.infer<typeof insertWinstonAiScanDbSchema>;
export type WinstonAiScanDb = typeof winstonAiScans.$inferSelect;

// Admin Zod Schemas (for API validation)
export const adminUserSchema = z.object({
  id: z.string(),
  replitId: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  role: z.enum(["superadmin", "admin", "editor"]),
  isActive: z.boolean(),
  mfaEnabled: z.boolean(),
  lastLoginAt: z.string().optional(),
  lastActivityAt: z.string().optional(),
  createdAt: z.string(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

// Admin MFA Settings Zod Schema
export const adminMfaSettingsSchema = z.object({
  id: z.string(),
  adminId: z.string(),
  totpSecret: z.string().optional(),
  totpEnabled: z.boolean(),
  totpVerifiedAt: z.string().optional(),
  backupCodes: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AdminMfaSettings = z.infer<typeof adminMfaSettingsSchema>;

// Admin IP Allowlist Zod Schema
export const adminIpAllowlistSchema = z.object({
  id: z.string(),
  ipAddress: z.string(),
  description: z.string().optional(),
  addedBy: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type AdminIpAllowlist = z.infer<typeof adminIpAllowlistSchema>;

// Admin Bypass Codes Zod Schema
export const adminBypassCodesSchema = z.object({
  id: z.string(),
  code: z.string(),
  createdBy: z.string(),
  usedBy: z.string().optional(),
  usedAt: z.string().optional(),
  expiresAt: z.string(),
  description: z.string().optional(),
  isUsed: z.boolean(),
  createdAt: z.string(),
});

export type AdminBypassCodes = z.infer<typeof adminBypassCodesSchema>;

// Admin Login History Zod Schema
export const adminLoginHistorySchema = z.object({
  id: z.string(),
  adminId: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  location: z.string().optional(),
  loginMethod: z.enum(["standard", "bypass_code", "mfa"]),
  success: z.boolean(),
  failureReason: z.string().optional(),
  bypassCodeId: z.string().optional(),
  createdAt: z.string(),
});

export type AdminLoginHistory = z.infer<typeof adminLoginHistorySchema>;

// Admin Security Settings Zod Schema
export const adminSecuritySettingsSchema = z.object({
  id: z.string(),
  ipAllowlistEnabled: z.boolean(),
  mfaRequired: z.boolean(),
  sessionTimeoutMinutes: z.number(),
  notifyOnLogin: z.boolean(),
  notifyEmails: z.array(z.string()),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
});

export type AdminSecuritySettings = z.infer<typeof adminSecuritySettingsSchema>;

export const winstonAiScanSchema = z.object({
  id: z.string(),
  blogPostId: z.string(),
  scanType: z.enum(["ai_detection", "plagiarism", "both"]),
  aiScore: z.number().optional(),
  plagiarismScore: z.number().optional(),
  humanScore: z.number().optional(),
  creditsUsed: z.number().optional(),
  sentenceResults: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  errorMessage: z.string().optional(),
  scannedBy: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export type WinstonAiScan = z.infer<typeof winstonAiScanSchema>;

// Visitor Analytics Tables
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  path: text("path").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  duration: integer("duration"),
  isBot: boolean("is_bot").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_page_views_session").on(table.sessionId),
  index("idx_page_views_path").on(table.path),
  index("idx_page_views_created").on(table.createdAt),
  index("idx_page_views_is_bot").on(table.isBot),
]);

export const visitorSessions = pgTable("visitor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  pageCount: integer("page_count").default(1).notNull(),
  totalDuration: integer("total_duration").default(0).notNull(),
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  isBot: boolean("is_bot").default(false),
}, (table) => [
  index("idx_visitor_sessions_visitor").on(table.visitorId),
  index("idx_visitor_sessions_started").on(table.startedAt),
  index("idx_visitor_sessions_is_bot").on(table.isBot),
]);

export const insertPageViewDbSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});

export const insertVisitorSessionDbSchema = createInsertSchema(visitorSessions).omit({
  id: true,
  startedAt: true,
});

export type InsertPageViewDb = z.infer<typeof insertPageViewDbSchema>;
export type PageViewDb = typeof pageViews.$inferSelect;
export type InsertVisitorSessionDb = z.infer<typeof insertVisitorSessionDbSchema>;
export type VisitorSessionDb = typeof visitorSessions.$inferSelect;

// Scheduled Scans Table (for bulk/monthly AI content scanning)
export const scheduledScans = pgTable("scheduled_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanType: text("scan_type").notNull(),
  status: text("status").notNull().default("pending"),
  totalPosts: integer("total_posts").default(0),
  scannedPosts: integer("scanned_posts").default(0),
  failedPosts: integer("failed_posts").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  triggeredBy: varchar("triggered_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledScanDbSchema = createInsertSchema(scheduledScans).omit({
  id: true,
  createdAt: true,
});

export type InsertScheduledScanDb = z.infer<typeof insertScheduledScanDbSchema>;
export type ScheduledScanDb = typeof scheduledScans.$inferSelect;

export const scheduledScanSchema = z.object({
  id: z.string(),
  scanType: z.enum(["monthly_full", "manual_bulk"]),
  status: z.enum(["pending", "running", "completed", "failed"]),
  totalPosts: z.number().optional(),
  scannedPosts: z.number().optional(),
  failedPosts: z.number().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  triggeredBy: z.string().optional(),
  createdAt: z.string(),
});

export type ScheduledScan = z.infer<typeof scheduledScanSchema>;

// Marketing Assets Table
export const marketingAssets = pgTable("marketing_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "image" | "video" | "template"
  category: text("category").notNull(), // "linkedin" | "google" | "social" | "website" | "email"
  platform: text("platform"), // specific platform (linkedin-cover, google-display, etc.)
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  dimensions: jsonb("dimensions"), // { width: number, height: number }
  fileSize: integer("file_size"), // in bytes
  mimeType: text("mime_type"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  featured: boolean("featured").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketingAssetDbSchema = createInsertSchema(marketingAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketingAssetDb = z.infer<typeof insertMarketingAssetDbSchema>;
export type MarketingAssetDb = typeof marketingAssets.$inferSelect;

export const marketingAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(["image", "video", "template"]),
  category: z.enum(["linkedin", "google", "social", "website", "email"]),
  platform: z.string().nullable(),
  fileUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  dimensions: z.object({ width: z.number(), height: z.number() }).nullable(),
  fileSize: z.number().nullable(),
  mimeType: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type MarketingAsset = z.infer<typeof marketingAssetSchema>;

// ============================================
// AI BLOG GENERATION PIPELINE TABLES
// ============================================

// Guardrail Categories Table (23 categories for consulting-grade standards)
export const guardrailCategories = pgTable("guardrail_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(1).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuardrailCategoryDbSchema = createInsertSchema(guardrailCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertGuardrailCategoryDb = z.infer<typeof insertGuardrailCategoryDbSchema>;
export type GuardrailCategoryDb = typeof guardrailCategories.$inferSelect;

// Guardrail Rules Table (314+ rules across categories)
export const guardrailRules = pgTable("guardrail_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  severity: varchar("severity").notNull().default("warning"), // "error" | "warning" | "info"
  validationType: varchar("validation_type").notNull(), // "regex" | "word_count" | "structure" | "citations" | "custom"
  validationParams: text("validation_params"), // JSON string for validation config
  errorMessage: text("error_message"),
  suggestion: text("suggestion"),
  sortOrder: integer("sort_order").default(1).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuardrailRuleDbSchema = createInsertSchema(guardrailRules).omit({
  id: true,
  createdAt: true,
});

export type InsertGuardrailRuleDb = z.infer<typeof insertGuardrailRuleDbSchema>;
export type GuardrailRuleDb = typeof guardrailRules.$inferSelect;

// Blog Generation Jobs Table - tracks AI pipeline runs
export const blogGenerationJobs = pgTable("blog_generation_jobs", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: varchar("title", { length: 500 }).notNull(),
  brief: text("brief").notNull(),
  targetKeywords: text("target_keywords").array().notNull(),
  targetAudience: varchar("target_audience", { length: 255 }),
  categoryId: varchar("category_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  stage: varchar("stage", { length: 50 }),
  researchData: text("research_data"),
  citations: text("citations"),
  outlineData: text("outline_data"),
  finalContent: text("final_content"),
  guardrailResults: text("guardrail_results"),
  errorMessage: text("error_message"),
  totalTokensUsed: integer("total_tokens_used").default(0),
  estimatedCost: varchar("estimated_cost", { length: 50 }),
  triggeredBy: varchar("triggered_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  completedAt: timestamp("completed_at"),
});

export const insertBlogGenerationJobDbSchema = createInsertSchema(blogGenerationJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertBlogGenerationJobDb = z.infer<typeof insertBlogGenerationJobDbSchema>;
export type BlogGenerationJobDb = typeof blogGenerationJobs.$inferSelect;

// Blog Generation Pipeline Runs Table
export const blogPipelineRuns = pgTable("blog_pipeline_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // Working title
  brief: text("brief").notNull(), // User's content brief
  targetKeywords: text("target_keywords").array().default(sql`'{}'::text[]`),
  targetAudience: text("target_audience"),
  categoryId: varchar("category_id"),
  
  // Pipeline status
  status: text("status").notNull().default("pending"), // "pending" | "research" | "outline" | "drafting" | "review" | "completed" | "failed"
  currentStage: integer("current_stage").default(0).notNull(), // 0=not started, 1=research, 2=outline, 3=draft
  
  // Stage 1: Perplexity Research
  researchPrompt: text("research_prompt"),
  researchOutput: text("research_output"),
  researchCitations: jsonb("research_citations"), // Array of { url, title, snippet }
  researchCompletedAt: timestamp("research_completed_at"),
  researchTokensUsed: integer("research_tokens_used"),
  
  // Stage 2: Claude Outline
  outlinePrompt: text("outline_prompt"),
  outlineOutput: text("outline_output"),
  outlineCompletedAt: timestamp("outline_completed_at"),
  outlineTokensUsed: integer("outline_tokens_used"),
  
  // Stage 3: GPT Final Content
  draftPrompt: text("draft_prompt"),
  draftOutput: text("draft_output"),
  draftCompletedAt: timestamp("draft_completed_at"),
  draftTokensUsed: integer("draft_tokens_used"),
  
  // Final blog post reference
  finalBlogPostId: varchar("final_blog_post_id"),
  winstonScanId: varchar("winston_scan_id"),
  
  // Guardrail validation results
  guardrailResults: jsonb("guardrail_results"), // Array of validation results per stage
  guardrailsPassed: boolean("guardrails_passed").default(false),
  
  // Metadata
  triggeredBy: varchar("triggered_by"),
  errorMessage: text("error_message"),
  totalTokensUsed: integer("total_tokens_used").default(0),
  estimatedCost: text("estimated_cost"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertBlogPipelineRunDbSchema = createInsertSchema(blogPipelineRuns).omit({
  id: true,
  currentStage: true,
  researchCompletedAt: true,
  outlineCompletedAt: true,
  draftCompletedAt: true,
  createdAt: true,
  completedAt: true,
});

export type InsertBlogPipelineRunDb = z.infer<typeof insertBlogPipelineRunDbSchema>;
export type BlogPipelineRunDb = typeof blogPipelineRuns.$inferSelect;

// Zod Schemas for API validation
export const guardrailCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  priority: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type GuardrailCategory = z.infer<typeof guardrailCategorySchema>;

export const guardrailRuleSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ruleType: z.enum(["regex", "word_count", "structure", "citation", "tone", "seo", "custom"]),
  ruleConfig: z.record(z.any()),
  severity: z.enum(["error", "warning", "info"]),
  errorMessage: z.string().nullable(),
  suggestedFix: z.string().nullable(),
  isActive: z.boolean(),
  appliesToStage: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type GuardrailRule = z.infer<typeof guardrailRuleSchema>;

export const blogPipelineRunSchema = z.object({
  id: z.string(),
  title: z.string(),
  brief: z.string(),
  targetKeywords: z.array(z.string()),
  targetAudience: z.string().nullable(),
  categoryId: z.string().nullable(),
  status: z.enum(["pending", "research", "outline", "drafting", "review", "completed", "failed"]),
  currentStage: z.number(),
  researchOutput: z.string().nullable(),
  researchCitations: z.array(z.object({
    url: z.string(),
    title: z.string().optional(),
    snippet: z.string().optional(),
  })).nullable(),
  outlineOutput: z.string().nullable(),
  draftOutput: z.string().nullable(),
  finalBlogPostId: z.string().nullable(),
  winstonScanId: z.string().nullable(),
  guardrailResults: z.array(z.object({
    stage: z.string(),
    passed: z.boolean(),
    violations: z.array(z.object({
      ruleId: z.string(),
      ruleName: z.string(),
      severity: z.string(),
      message: z.string(),
      suggestedFix: z.string().optional(),
    })),
  })).nullable(),
  guardrailsPassed: z.boolean(),
  triggeredBy: z.string().nullable(),
  errorMessage: z.string().nullable(),
  totalTokensUsed: z.number(),
  estimatedCost: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export type BlogPipelineRun = z.infer<typeof blogPipelineRunSchema>;

// Input schema for starting a new pipeline run
export const startBlogPipelineSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  brief: z.string().min(50, "Brief must be at least 50 characters to provide enough context"),
  targetKeywords: z.array(z.string()).min(1, "At least one target keyword is required"),
  targetAudience: z.string().optional(),
  categoryId: z.string().optional(),
});

export type StartBlogPipeline = z.infer<typeof startBlogPipelineSchema>;

// Citation type for research stage
export const citationSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  domain: z.string().optional(),
  isVerified: z.boolean().optional(),
});

export type Citation = z.infer<typeof citationSchema>;

// Whitelisted Admin Emails (only these accounts can access admin)
// For Replit Auth, any logged in Replit user can access admin (for development)
export const ADMIN_WHITELIST_EMAILS = [
  "grant.vanwyk@1qg.com",
  "info@constancia.io",
];

// ============================================
// SECURITY TABLES - Rate Limiting & Tracking
// ============================================

// Rate limiting table - tracks API rate limits per IP/identifier
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(), // IP address or email
  limitType: text("limit_type").notNull(), // 'api', 'otp', 'hubspot', 'login'
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rate_limits_identifier_type").on(table.identifier, table.limitType),
  index("idx_rate_limits_reset_at").on(table.resetAt),
]);

export type RateLimit = typeof rateLimits.$inferSelect;

// Lead attempt tracking - tracks OTP verification attempts per lead
export const leadAttempts = pgTable("lead_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: text("lead_id").notNull().unique(),
  totalAttempts: integer("total_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_lead_attempts_lead_id").on(table.leadId),
  index("idx_lead_attempts_locked").on(table.lockedUntil),
]);

export type LeadAttempt = typeof leadAttempts.$inferSelect;

// Security events log - comprehensive audit trail
export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // 'rate_limit_exceeded', 'otp_failed', 'login_failed', 'path_traversal', etc.
  severity: text("severity").notNull().default("info"), // 'info', 'warning', 'critical'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  identifier: text("identifier"), // email, lead_id, etc.
  details: jsonb("details"), // Additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_security_events_type").on(table.eventType),
  index("idx_security_events_severity").on(table.severity),
  index("idx_security_events_ip").on(table.ipAddress),
  index("idx_security_events_created").on(table.createdAt),
]);

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;

// OTP storage table - replaces in-memory Map
export const otpStorage = pgTable("otp_storage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull().unique(), // email hash for chat OTP, lead_id for resource OTP
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_otp_storage_identifier").on(table.identifier),
  index("idx_otp_storage_expires").on(table.expiresAt),
]);

export type OtpStorage = typeof otpStorage.$inferSelect;

// ============================================
// SOC 2 COMPLIANCE - Audit Logs Table
// ============================================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  actorId: varchar("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: varchar("resource_id"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_action").on(table.action),
  index("idx_audit_logs_actor").on(table.actorId),
  index("idx_audit_logs_resource_type").on(table.resourceType),
  index("idx_audit_logs_resource_id").on(table.resourceId),
  index("idx_audit_logs_created").on(table.createdAt),
]);

export const insertAuditLogDbSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLogDb = z.infer<typeof insertAuditLogDbSchema>;
export type AuditLogDb = typeof auditLogs.$inferSelect;

// ============================================
// GDPR COMPLIANCE - Data Retention Configuration
// ============================================

export const dataRetentionConfig = pgTable("data_retention_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceType: text("resource_type").notNull().unique(),
  retentionMonths: integer("retention_months").notNull(),
  lastCleanupAt: timestamp("last_cleanup_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_retention_config_type").on(table.resourceType),
]);

export const insertDataRetentionConfigDbSchema = createInsertSchema(dataRetentionConfig).omit({
  id: true,
  lastCleanupAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDataRetentionConfigDb = z.infer<typeof insertDataRetentionConfigDbSchema>;
export type DataRetentionConfigDb = typeof dataRetentionConfig.$inferSelect;

// ============================================
// FINANCECOMPASS AI CONFIGURATION TABLES
// ============================================

// AI System Prompts - 3 core personas for assessment AI
export const fcAiSystemPrompts = pgTable("fc_ai_system_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  persona: text("persona").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  lastReviewedAt: timestamp("last_reviewed_at"),
  lastReviewedBy: varchar("last_reviewed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_ai_prompts_key").on(table.key),
  index("idx_fc_ai_prompts_category").on(table.category),
  index("idx_fc_ai_prompts_active").on(table.isActive),
]);

export const insertFcAiSystemPromptSchema = createInsertSchema(fcAiSystemPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFcAiSystemPrompt = z.infer<typeof insertFcAiSystemPromptSchema>;
export type FcAiSystemPrompt = typeof fcAiSystemPrompts.$inferSelect;

// AI Guardrails - 15 mandatory guardrails across 5 categories
export const fcAiGuardrails = pgTable("fc_ai_guardrails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  validationType: text("validation_type").notNull(),
  validationConfig: jsonb("validation_config"),
  errorMessage: text("error_message").notNull(),
  isBlocking: boolean("is_blocking").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_ai_guardrails_key").on(table.key),
  index("idx_fc_ai_guardrails_category").on(table.category),
  index("idx_fc_ai_guardrails_active").on(table.isActive),
]);

export const insertFcAiGuardrailSchema = createInsertSchema(fcAiGuardrails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFcAiGuardrail = z.infer<typeof insertFcAiGuardrailSchema>;
export type FcAiGuardrail = typeof fcAiGuardrails.$inferSelect;

// AI Grounding Rules - Context and benchmark data for AI responses
export const fcAiGroundingRules = pgTable("fc_ai_grounding_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  content: text("content").notNull(),
  applicableTiers: text("applicable_tiers").array(),
  applicableDimensions: text("applicable_dimensions").array(),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_ai_grounding_key").on(table.key),
  index("idx_fc_ai_grounding_category").on(table.category),
  index("idx_fc_ai_grounding_active").on(table.isActive),
]);

export const insertFcAiGroundingRuleSchema = createInsertSchema(fcAiGroundingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFcAiGroundingRule = z.infer<typeof insertFcAiGroundingRuleSchema>;
export type FcAiGroundingRule = typeof fcAiGroundingRules.$inferSelect;

// AI Knowledge Base - Reference documents for AI grounding
export const fcAiKnowledgeBase = pgTable("fc_ai_knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(),
  applicableTiers: text("applicable_tiers").array(),
  applicableDimensions: text("applicable_dimensions").array(),
  sourceCitation: text("source_citation"),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_ai_kb_key").on(table.key),
  index("idx_fc_ai_kb_category").on(table.category),
  index("idx_fc_ai_kb_active").on(table.isActive),
]);

export const insertFcAiKnowledgeBaseSchema = createInsertSchema(fcAiKnowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFcAiKnowledgeBase = z.infer<typeof insertFcAiKnowledgeBaseSchema>;
export type FcAiKnowledgeBase = typeof fcAiKnowledgeBase.$inferSelect;

// AI Follow-up Templates - Adaptive follow-up questions
export const fcAiFollowupTemplates = pgTable("fc_ai_followup_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  triggerCondition: jsonb("trigger_condition").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  dimension: text("dimension"),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_ai_followup_key").on(table.key),
  index("idx_fc_ai_followup_dimension").on(table.dimension),
  index("idx_fc_ai_followup_active").on(table.isActive),
]);

export const insertFcAiFollowupTemplateSchema = createInsertSchema(fcAiFollowupTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFcAiFollowupTemplate = z.infer<typeof insertFcAiFollowupTemplateSchema>;
export type FcAiFollowupTemplate = typeof fcAiFollowupTemplates.$inferSelect;

// Ad Click Fraud Tracking
export const adClickLogs = pgTable("ad_click_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull(),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  landingPage: text("landing_page"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  gclid: text("gclid"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  screenResolution: text("screen_resolution"),
  language: text("language"),
  timezone: text("timezone"),
  sessionDuration: integer("session_duration"),
  pageViews: integer("page_views").default(1),
  hasMouseMovement: boolean("has_mouse_movement"),
  hasScrolled: boolean("has_scrolled"),
  hasClicked: boolean("has_clicked"),
  hasFormInteraction: boolean("has_form_interaction"),
  suspiciousScore: integer("suspicious_score").default(0),
  flaggedReasons: text("flagged_reasons").array(),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ad_click_ip").on(table.ipAddress),
  index("idx_ad_click_country").on(table.country),
  index("idx_ad_click_gclid").on(table.gclid),
  index("idx_ad_click_suspicious").on(table.suspiciousScore),
  index("idx_ad_click_created").on(table.createdAt),
]);

export const insertAdClickLogSchema = createInsertSchema(adClickLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAdClickLog = z.infer<typeof insertAdClickLogSchema>;
export type AdClickLog = typeof adClickLogs.$inferSelect;

// Feature Flag Overrides - allows admin UI to control feature visibility
export const featureFlagOverrides = pgTable("feature_flag_overrides", {
  featureKey: text("feature_key").primaryKey(),
  isEnabled: boolean("is_enabled").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFeatureFlagOverrideSchema = createInsertSchema(featureFlagOverrides);
export type InsertFeatureFlagOverride = z.infer<typeof insertFeatureFlagOverrideSchema>;
export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect;

// ============================================
// FINANCECOMPASS BETA ACCESS WHITELIST
// ============================================

export const financeCompassBetaAccess = pgTable("finance_compass_beta_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  emailHash: text("email_hash").notNull(),
  addedBy: text("added_by"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_fc_beta_email").on(table.email),
  index("idx_fc_beta_email_hash").on(table.emailHash),
]);

export const insertFcBetaAccessSchema = createInsertSchema(financeCompassBetaAccess).omit({
  id: true,
  createdAt: true,
});
export type InsertFcBetaAccess = z.infer<typeof insertFcBetaAccessSchema>;
export type FcBetaAccess = typeof financeCompassBetaAccess.$inferSelect;

// ============================================
// LINK HEALTH AUTO-REPAIR SYSTEM
// ============================================

export const linkScans = pgTable("link_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull().default("running"),
  triggeredBy: text("triggered_by").notNull().default("scheduled"),
  filesScanned: integer("files_scanned").default(0),
  linksInspected: integer("links_inspected").default(0),
  issuesFound: integer("issues_found").default(0),
  issuesFixed: integer("issues_fixed").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_link_scan_status").on(table.status),
  index("idx_link_scan_started").on(table.startedAt),
]);

export const insertLinkScanSchema = createInsertSchema(linkScans).omit({
  id: true,
  startedAt: true,
});
export type InsertLinkScan = z.infer<typeof insertLinkScanSchema>;
export type LinkScan = typeof linkScans.$inferSelect;

export const linkFindings = pgTable("link_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull(),
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number"),
  href: text("href").notNull(),
  anchorText: text("anchor_text"),
  relAttribute: text("rel_attribute"),
  location: text("location").notNull(),
  isExternal: boolean("is_external").notNull(),
  isInternal: boolean("is_internal").notNull(),
  ruleTriggered: text("rule_triggered"),
  severity: text("severity").notNull().default("info"),
  status: text("status").notNull().default("detected"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_link_finding_scan").on(table.scanId),
  index("idx_link_finding_file").on(table.filePath),
  index("idx_link_finding_rule").on(table.ruleTriggered),
  index("idx_link_finding_status").on(table.status),
]);

export const insertLinkFindingSchema = createInsertSchema(linkFindings).omit({
  id: true,
  createdAt: true,
});
export type InsertLinkFinding = z.infer<typeof insertLinkFindingSchema>;
export type LinkFinding = typeof linkFindings.$inferSelect;

export const linkChangeLogs = pgTable("link_change_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull(),
  findingId: varchar("finding_id"),
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number"),
  ruleApplied: text("rule_applied").notNull(),
  beforeSnippet: text("before_snippet").notNull(),
  afterSnippet: text("after_snippet").notNull(),
  changeType: text("change_type").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
}, (table) => [
  index("idx_link_changelog_scan").on(table.scanId),
  index("idx_link_changelog_file").on(table.filePath),
  index("idx_link_changelog_rule").on(table.ruleApplied),
]);

export const insertLinkChangeLogSchema = createInsertSchema(linkChangeLogs).omit({
  id: true,
  appliedAt: true,
});
export type InsertLinkChangeLog = z.infer<typeof insertLinkChangeLogSchema>;
export type LinkChangeLog = typeof linkChangeLogs.$inferSelect;

export const linkHealthConfig = pgTable("link_health_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  primaryDomain: text("primary_domain").notNull().default("constancia.co.uk"),
  whitelistedDomains: text("whitelisted_domains").array().default(sql`'{}'::text[]`),
  excludedPaths: text("excluded_paths").array().default(sql`'{}'::text[]`),
  rule1Enabled: boolean("rule1_enabled").notNull().default(true),
  rule2Enabled: boolean("rule2_enabled").notNull().default(true),
  rule3Enabled: boolean("rule3_enabled").notNull().default(true),
  rule4Enabled: boolean("rule4_enabled").notNull().default(false),
  siteWideThreshold: integer("site_wide_threshold").notNull().default(50),
  autoApplyFixes: boolean("auto_apply_fixes").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLinkHealthConfigSchema = createInsertSchema(linkHealthConfig).omit({
  id: true,
  updatedAt: true,
});
export type InsertLinkHealthConfig = z.infer<typeof insertLinkHealthConfigSchema>;
export type LinkHealthConfig = typeof linkHealthConfig.$inferSelect;

// Widget Analytics for FinanceCompass InstantPreview and Comparison Tools
export const widgetAnalytics = pgTable("widget_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  widget: text("widget").notNull(),
  eventType: text("event_type").notNull(),
  sessionId: text("session_id"),
  questionId: text("question_id"),
  questionNumber: integer("question_number"),
  dimension: text("dimension"),
  answerValue: integer("answer_value"),
  answerLabel: text("answer_label"),
  field: text("field"),
  finalScore: integer("final_score"),
  answers: jsonb("answers"),
  qualificationData: jsonb("qualification_data"),
  completionTime: bigint("completion_time", { mode: "number" }),
  previousScore: integer("previous_score"),
  action: text("action"),
  fingerprint: jsonb("fingerprint"),
  metadata: jsonb("metadata"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // ============================================
  // DATA QUALITY & MONETIZATION FIELDS (v1.0)
  // ============================================
  
  // Widget/schema version for tracking evolution
  widgetVersion: text("widget_version").default("1.0"),
  
  // Traffic attribution
  sourceChannel: text("source_channel"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  referrer: text("referrer"),
  
  // Device/browser metadata
  deviceType: text("device_type"),
  browser: text("browser"),
  operatingSystem: text("operating_system"),
  screenResolution: text("screen_resolution"),
  
  // Standardized demographics (for tool comparison)
  countryCode: text("country_code"),
  industry: text("industry"),
  sizeBand: text("size_band"),
  
  // Comparison tool specific fields
  revenueBand: text("revenue_band"),
  erpLandscape: text("erp_landscape"),
  comparisonCategory: text("comparison_category"),
  selectedPreset: text("selected_preset"),
  topVendors: text("top_vendors").array(),
  
  // Bot detection
  isBot: boolean("is_bot").default(false),
  
  // Data quality flags
  isValidRecord: boolean("is_valid_record").default(true),
  qualityFlags: text("quality_flags").array().default(sql`'{}'::text[]`),
  qualityScore: integer("quality_score"),
  qualityCheckedAt: timestamp("quality_checked_at"),
  
  // Session aggregation
  isSessionComplete: boolean("is_session_complete").default(false),
  sessionCompletionTime: bigint("session_completion_time", { mode: "number" }),
  sessionQuestionsAnswered: integer("session_questions_answered"),
  
  // IP/geo metadata (hashed for privacy)
  ipHash: text("ip_hash"),
  geoCountry: text("geo_country"),
  geoRegion: text("geo_region"),
}, (table) => [
  index("idx_widget_analytics_session").on(table.sessionId),
  index("idx_widget_analytics_event").on(table.eventType),
  index("idx_widget_analytics_created").on(table.createdAt),
  index("idx_widget_analytics_valid").on(table.isValidRecord),
  index("idx_widget_analytics_widget_version").on(table.widgetVersion),
  index("idx_widget_analytics_source").on(table.sourceChannel),
]);

export const insertWidgetAnalyticsSchema = createInsertSchema(widgetAnalytics).omit({
  id: true,
  createdAt: true,
});
export type InsertWidgetAnalytics = z.infer<typeof insertWidgetAnalyticsSchema>;
export type WidgetAnalytics = typeof widgetAnalytics.$inferSelect;

// A/B Test Variants Table for Widget Analytics
export const abTestVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number().min(0).max(100),
});

export type AbTestVariant = z.infer<typeof abTestVariantSchema>;

export const widgetAbTests = pgTable("widget_ab_tests", {
  id: serial("id").primaryKey(),
  testName: varchar("test_name", { length: 100 }).notNull(),
  testDescription: text("test_description"),
  variants: json("variants").$type<Array<AbTestVariant>>().notNull(),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  targetWidget: varchar("target_widget", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_widget_ab_tests_active").on(table.isActive),
  index("idx_widget_ab_tests_widget").on(table.targetWidget),
]);

export const insertWidgetAbTestSchema = createInsertSchema(widgetAbTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWidgetAbTest = z.infer<typeof insertWidgetAbTestSchema>;
export type WidgetAbTest = typeof widgetAbTests.$inferSelect;

// Full-Funnel Page Analytics for complete user journey tracking
export const pageAnalytics = pgTable("page_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category"),
  page: text("page").notNull(),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  deviceType: text("device_type"),
  browser: text("browser"),
  screenWidth: integer("screen_width"),
  scrollDepth: integer("scroll_depth"),
  milestone: integer("milestone"),
  dwellTimeMs: integer("dwell_time_ms"),
  timeToEventMs: integer("time_to_event_ms"),
  questionNumber: integer("question_number"),
  assessmentId: text("assessment_id"),
  previousScore: integer("previous_score"),
  currentScore: integer("current_score"),
  metadata: jsonb("metadata"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_page_analytics_session").on(table.sessionId),
  index("idx_page_analytics_event").on(table.eventType),
  index("idx_page_analytics_page").on(table.page),
  index("idx_page_analytics_created").on(table.createdAt),
  index("idx_page_analytics_visitor").on(table.visitorId),
  index("idx_page_analytics_created_event").on(table.createdAt, table.eventType),
  index("idx_page_analytics_category").on(table.eventCategory),
]);

export const insertPageAnalyticsSchema = createInsertSchema(pageAnalytics).omit({
  id: true,
  createdAt: true,
});
export type InsertPageAnalytics = z.infer<typeof insertPageAnalyticsSchema>;
export type PageAnalytics = typeof pageAnalytics.$inferSelect;

// Funnel Target Metrics for goal tracking
export const funnelTargets = pgTable("funnel_targets", {
  id: serial("id").primaryKey(),
  stageName: text("stage_name").notNull().unique(),
  stageOrder: integer("stage_order").notNull(),
  targetPercentage: integer("target_percentage").notNull(),
  warningThreshold: integer("warning_threshold").default(10),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFunnelTargetSchema = createInsertSchema(funnelTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFunnelTarget = z.infer<typeof insertFunnelTargetSchema>;
export type FunnelTarget = typeof funnelTargets.$inferSelect;

// Funnel stage definitions — DB-backed source of truth for what events
// roll up into which stage. Seeded from shared/analytics-taxonomy.ts on
// first boot; after that, the operator can edit stages without a deploy.
export const funnelStages = pgTable("funnel_stages", {
  id: serial("id").primaryKey(),
  stageKey: text("stage_key").notNull().unique(),
  stageOrder: integer("stage_order").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  eventTypes: jsonb("event_types").$type<string[]>().notNull(),
  targetConversionPct: integer("target_conversion_pct").notNull(),
  warningPct: integer("warning_pct").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_funnel_stages_order").on(table.stageOrder),
]);

export const insertFunnelStageSchema = createInsertSchema(funnelStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFunnelStage = z.infer<typeof insertFunnelStageSchema>;
export type FunnelStage = typeof funnelStages.$inferSelect;

// Daily rollups — populated by the nightly aggregation job (server/
// services/analytics/rollup.ts). One row per (utc_day, page,
// event_category, source_channel). Raw events are dropped after
// RETENTION.RAW_DAYS; rollups never expire so YoY always works.
export const analyticsDailyRollup = pgTable("analytics_daily_rollup", {
  id: serial("id").primaryKey(),
  utcDay: timestamp("utc_day").notNull(),
  page: text("page"),
  eventCategory: text("event_category"),
  eventType: text("event_type"),
  sourceChannel: text("source_channel"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  deviceType: text("device_type"),
  countryCode: text("country_code"),
  uniqueSessions: integer("unique_sessions").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  eventCount: integer("event_count").notNull().default(0),
  avgDwellMs: integer("avg_dwell_ms"),
  medianDwellMs: integer("median_dwell_ms"),
  isBotShare: integer("is_bot_share"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_daily_rollup_day").on(table.utcDay),
  index("idx_daily_rollup_day_category").on(table.utcDay, table.eventCategory),
  index("idx_daily_rollup_day_source").on(table.utcDay, table.sourceChannel),
  index("idx_daily_rollup_day_page").on(table.utcDay, table.page),
]);

export const insertAnalyticsDailyRollupSchema = createInsertSchema(analyticsDailyRollup).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAnalyticsDailyRollup = z.infer<typeof insertAnalyticsDailyRollupSchema>;
export type AnalyticsDailyRollup = typeof analyticsDailyRollup.$inferSelect;

// Monthly rollups — first-of-month rows aggregated from daily. The
// permanent record for year-over-year. Stays compact; never expires.
export const analyticsMonthlyRollup = pgTable("analytics_monthly_rollup", {
  id: serial("id").primaryKey(),
  utcMonth: timestamp("utc_month").notNull(),
  eventCategory: text("event_category"),
  sourceChannel: text("source_channel"),
  uniqueSessions: integer("unique_sessions").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  eventCount: integer("event_count").notNull().default(0),
  leadCount: integer("lead_count").notNull().default(0),
  assessmentCompletedCount: integer("assessment_completed_count").notNull().default(0),
  reportDownloadedCount: integer("report_downloaded_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_monthly_rollup_month").on(table.utcMonth),
  index("idx_monthly_rollup_category").on(table.eventCategory),
  index("idx_monthly_rollup_source").on(table.sourceChannel),
]);

export const insertAnalyticsMonthlyRollupSchema = createInsertSchema(analyticsMonthlyRollup).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAnalyticsMonthlyRollup = z.infer<typeof insertAnalyticsMonthlyRollupSchema>;
export type AnalyticsMonthlyRollup = typeof analyticsMonthlyRollup.$inferSelect;

// Generated insights — cached output of the insight rules. Refreshed by
// the same nightly job that builds rollups. Dashboards read from here so
// the page is fast and the ranked list is consistent across operators.
export const analyticsInsights = pgTable("analytics_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: text("kind").notNull(),
  severity: text("severity").notNull(),
  headline: text("headline").notNull(),
  detail: text("detail").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  linkLabel: text("link_label"),
  linkHref: text("link_href"),
  metrics: jsonb("metrics").$type<Record<string, number | string>>().notNull(),
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by"),
  dismissedAt: timestamp("dismissed_at"),
}, (table) => [
  index("idx_insights_severity").on(table.severity),
  index("idx_insights_kind").on(table.kind),
  index("idx_insights_generated").on(table.generatedAt),
]);

export const insertAnalyticsInsightSchema = createInsertSchema(analyticsInsights).omit({
  id: true,
  generatedAt: true,
});
export type InsertAnalyticsInsight = z.infer<typeof insertAnalyticsInsightSchema>;
export type AnalyticsInsight = typeof analyticsInsights.$inferSelect;

// Tracks the last run of each scheduled analytics job. The rollup/
// insights job uses this to avoid re-processing days it's already done.
export const analyticsJobRuns = pgTable("analytics_job_runs", {
  id: serial("id").primaryKey(),
  jobName: text("job_name").notNull(),
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  rowsProcessed: integer("rows_processed").notNull().default(0),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
}, (table) => [
  index("idx_job_runs_job_started").on(table.jobName, table.startedAt),
]);

export type AnalyticsJobRun = typeof analyticsJobRuns.$inferSelect;

export const talentSubmissions = pgTable("talent_submissions", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  linkedIn: text("linked_in"),
  areaOfInterest: text("area_of_interest").notNull(),
  message: text("message").notNull(),
  consent: boolean("consent").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTalentSubmissionSchema = createInsertSchema(talentSubmissions).omit({
  id: true,
  createdAt: true,
});
export type InsertTalentSubmission = z.infer<typeof insertTalentSubmissionSchema>;
export type TalentSubmission = typeof talentSubmissions.$inferSelect;
