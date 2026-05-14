/**
 * Content Service Interfaces
 * 
 * Defines contracts for content management business logic services.
 * These interfaces enable dependency injection and testability.
 * 
 * IMPORTANT: Core services MUST NOT import from /api or /db directly.
 * They receive dependencies through these interfaces.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Result } from '../types';
import type {
  BlogPost,
  BlogCategory,
  BlogPostFilters,
  BlogPostWithCategory,
  Resource,
  ResourceFilters,
  ResourceSession,
  ResourceLead,
  ResourceDownload,
  ContentAccessResult,
} from './types';

/**
 * Blog Post Repository Interface
 * Abstracts data access for blog posts
 */
export interface IBlogPostRepository {
  findById(id: string): Promise<BlogPost | null>;
  findBySlug(slug: string): Promise<BlogPost | null>;
  findAll(filters?: BlogPostFilters): Promise<BlogPost[]>;
  findFeatured(limit?: number): Promise<BlogPost[]>;
  findByCategory(categoryId: string): Promise<BlogPost[]>;
  search(query: string): Promise<BlogPost[]>;
  create(data: CreateBlogPostData): Promise<BlogPost>;
  update(id: string, data: UpdateBlogPostData): Promise<BlogPost | null>;
  delete(id: string): Promise<boolean>;
  publish(id: string): Promise<BlogPost | null>;
  unpublish(id: string): Promise<BlogPost | null>;
  incrementViews(id: string): Promise<void>;
}

/**
 * Data for creating a new blog post
 */
export interface CreateBlogPostData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  heroImage?: string;
  categoryId: string;
  tags: string[];
  author: string;
  authorImage?: string;
  publishedAt: string;
  readingTime: string;
  featured?: boolean;
  isPublished?: boolean;
}

/**
 * Data for updating a blog post
 */
export interface UpdateBlogPostData {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  heroImage?: string;
  categoryId?: string;
  tags?: string[];
  author?: string;
  authorImage?: string;
  publishedAt?: string;
  readingTime?: string;
  featured?: boolean;
  isPublished?: boolean;
}

/**
 * Blog Category Repository Interface
 */
export interface IBlogCategoryRepository {
  findById(id: string): Promise<BlogCategory | null>;
  findBySlug(slug: string): Promise<BlogCategory | null>;
  findAll(): Promise<BlogCategory[]>;
  create(data: CreateBlogCategoryData): Promise<BlogCategory>;
  update(id: string, data: UpdateBlogCategoryData): Promise<BlogCategory | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Data for creating a blog category
 */
export interface CreateBlogCategoryData {
  name: string;
  slug: string;
  description?: string;
}

/**
 * Data for updating a blog category
 */
export interface UpdateBlogCategoryData {
  name?: string;
  slug?: string;
  description?: string;
}

/**
 * Resource Repository Interface
 * Abstracts data access for downloadable resources
 */
export interface IResourceRepository {
  findById(id: string): Promise<Resource | null>;
  findBySlug(slug: string): Promise<Resource | null>;
  findAll(filters?: ResourceFilters): Promise<Resource[]>;
  findFeatured(limit?: number): Promise<Resource[]>;
  findByCategory(category: string): Promise<Resource[]>;
  create(data: CreateResourceData): Promise<Resource>;
  update(id: string, data: UpdateResourceData): Promise<Resource | null>;
  delete(id: string): Promise<boolean>;
  incrementDownloadCount(id: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
}

/**
 * Data for creating a resource
 */
export interface CreateResourceData {
  title: string;
  slug: string;
  description: string;
  category: string;
  fileType: string;
  fileUrl: string;
  fileSize: string;
  publishedAt: string;
  featured?: boolean;
  isPublished?: boolean;
}

/**
 * Data for updating a resource
 */
export interface UpdateResourceData {
  title?: string;
  slug?: string;
  description?: string;
  category?: string;
  fileType?: string;
  fileUrl?: string;
  fileSize?: string;
  publishedAt?: string;
  featured?: boolean;
  isPublished?: boolean;
}

/**
 * Resource Session Repository Interface
 * Manages session-based access to gated content
 */
export interface IResourceSessionRepository {
  findById(id: string): Promise<ResourceSession | null>;
  findByEmailHash(emailHash: string): Promise<ResourceSession | null>;
  findValidSession(sessionId: string): Promise<ResourceSession | null>;
  create(data: CreateResourceSessionData): Promise<ResourceSession>;
  revoke(id: string): Promise<void>;
  refreshExpiry(id: string, newExpiresAt: Date): Promise<void>;
}

/**
 * Data for creating a resource session
 */
export interface CreateResourceSessionData {
  leadId: string;
  emailHash: string;
  expiresAt: Date;
}

/**
 * Resource Lead Repository Interface
 * Manages verified leads who can access gated content
 */
export interface IResourceLeadRepository {
  findById(id: string): Promise<ResourceLead | null>;
  findByEmailHash(emailHash: string): Promise<ResourceLead | null>;
  create(data: CreateResourceLeadData): Promise<ResourceLead>;
  update(id: string, data: UpdateResourceLeadData): Promise<ResourceLead | null>;
  markVerified(id: string): Promise<ResourceLead | null>;
}

/**
 * Data for creating a resource lead
 */
export interface CreateResourceLeadData {
  firstName: string;
  lastName: string;
  email: string;
  emailHash: string;
  company: string;
  jobTitle: string;
}

/**
 * Data for updating a resource lead
 */
export interface UpdateResourceLeadData {
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
}

/**
 * Resource Download Repository Interface
 */
export interface IResourceDownloadRepository {
  create(data: CreateResourceDownloadData): Promise<ResourceDownload>;
  findByLeadId(leadId: string): Promise<ResourceDownload[]>;
  findByResourceId(resourceId: string): Promise<ResourceDownload[]>;
}

/**
 * Data for recording a resource download
 */
export interface CreateResourceDownloadData {
  sessionId?: string;
  leadId: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}

/**
 * Content Service Interface
 * High-level business logic for content management
 */
export interface IContentService {
  getBlogPosts(filters?: BlogPostFilters): Promise<Result<BlogPost[]>>;
  getBlogPostBySlug(slug: string): Promise<Result<BlogPostWithCategory>>;
  getBlogPostById(id: string): Promise<Result<BlogPost>>;
  getFeaturedBlogPosts(limit?: number): Promise<Result<BlogPost[]>>;
  searchBlogPosts(query: string): Promise<Result<BlogPost[]>>;
  getBlogCategories(): Promise<Result<BlogCategory[]>>;
  getBlogCategoryBySlug(slug: string): Promise<Result<{ category: BlogCategory; posts: BlogPost[] }>>;
  
  getResources(filters?: ResourceFilters): Promise<Result<Resource[]>>;
  getResourceBySlug(slug: string): Promise<Result<Resource>>;
  getResourceById(id: string): Promise<Result<Resource>>;
  getFeaturedResources(limit?: number): Promise<Result<Resource[]>>;
  getResourcesByCategory(category: string): Promise<Result<Resource[]>>;
  
  validateContentAccess(resourceId: string, sessionId: string | null): Promise<Result<ContentAccessResult>>;
  trackResourceView(resourceId: string): Promise<Result<void>>;
  trackBlogPostView(postId: string): Promise<Result<void>>;
}
