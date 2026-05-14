/**
 * Content Domain Types
 * 
 * Pure domain types for blog posts, resources, and content management.
 * These types represent business concepts without any infrastructure concerns.
 * 
 * @generated-by-ai (human-reviewed)
 */

/**
 * Content visibility states
 */
export enum ContentVisibility {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Resource categories
 */
export type ResourceCategory =
  | 'epm-selection'
  | 'erp-selection'
  | 'ai-finance'
  | 'finance-transformation'
  | 'implementation'
  | 'governance'
  | 'templates'
  | 'guides'
  | 'toolkits';

/**
 * Resource file types
 */
export type ResourceFileType = 'pdf' | 'xlsx' | 'docx' | 'html';

/**
 * Blog post domain entity
 */
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  heroImage: string | null;
  categoryId: string;
  tags: string[];
  author: string;
  authorImage: string | null;
  publishedAt: string;
  readingTime: string;
  featured: boolean;
  isPublished: boolean;
  views: number;
  updatedAt: Date | null;
}

/**
 * Blog category domain entity
 */
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

/**
 * Resource file domain entity
 */
export interface Resource {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: ResourceCategory | string;
  fileType: ResourceFileType | string;
  fileUrl: string;
  fileSize: string;
  downloadCount: number;
  viewCount: number;
  featured: boolean;
  publishedAt: string;
  isPublished: boolean;
  updatedAt: Date | null;
}

/**
 * Resource session for gated content access
 */
export interface ResourceSession {
  id: string;
  leadId: string;
  emailHash: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

/**
 * Resource lead (verified user who can access gated content)
 */
export interface ResourceLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailHash: string;
  company: string;
  jobTitle: string;
  verified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
}

/**
 * Filters for querying blog posts
 */
export interface BlogPostFilters {
  categoryId?: string;
  categorySlug?: string;
  featured?: boolean;
  isPublished?: boolean;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Filters for querying resources
 */
export interface ResourceFilters {
  category?: ResourceCategory | string;
  fileType?: ResourceFileType | string;
  featured?: boolean;
  isPublished?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Content filters union type
 */
export type ContentFilters = BlogPostFilters | ResourceFilters;

/**
 * Content access validation result
 */
export interface ContentAccessResult {
  hasAccess: boolean;
  leadId: string | null;
  reason: ContentAccessDeniedReason | null;
}

/**
 * Reasons for content access denial
 */
export type ContentAccessDeniedReason =
  | 'no_session'
  | 'session_expired'
  | 'session_revoked'
  | 'lead_not_found'
  | 'lead_not_verified'
  | 'resource_not_found';

/**
 * Blog post with category information
 */
export interface BlogPostWithCategory extends BlogPost {
  category: BlogCategory | null;
}

/**
 * Resource download record
 */
export interface ResourceDownload {
  id: string;
  sessionId: string | null;
  leadId: string;
  resourceId: string;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  downloadedAt: Date;
}
