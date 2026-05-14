/**
 * Content Service
 * 
 * Pure business logic for content management (blog posts, resources).
 * This service contains NO HTTP or database imports - it operates
 * through repository interfaces for full testability.
 * 
 * @generated-by-ai (human-reviewed)
 */

import {
  Result,
  success,
  failure,
  NotFoundError,
  ValidationError,
} from '../../types';
import type {
  BlogPost,
  BlogCategory,
  BlogPostFilters,
  BlogPostWithCategory,
  Resource,
  ResourceFilters,
  ResourceSession,
  ResourceLead,
  ContentAccessResult,
  ContentAccessDeniedReason,
} from '../types';
import type {
  IBlogPostRepository,
  IBlogCategoryRepository,
  IResourceRepository,
  IResourceSessionRepository,
  IResourceLeadRepository,
  IContentService,
} from '../interfaces';

/**
 * Content access denied error
 */
export class ContentAccessError extends Error {
  readonly reason: ContentAccessDeniedReason;
  
  constructor(reason: ContentAccessDeniedReason, message: string) {
    super(message);
    this.name = 'ContentAccessError';
    this.reason = reason;
  }
}

/**
 * ContentService Dependencies
 */
export interface ContentServiceDependencies {
  blogPostRepository: IBlogPostRepository;
  blogCategoryRepository: IBlogCategoryRepository;
  resourceRepository: IResourceRepository;
  resourceSessionRepository: IResourceSessionRepository;
  resourceLeadRepository: IResourceLeadRepository;
}

/**
 * ContentService Implementation
 * 
 * Provides pure business logic for content operations.
 * All data access is abstracted through repository interfaces.
 */
export class ContentService implements IContentService {
  private readonly blogPostRepo: IBlogPostRepository;
  private readonly blogCategoryRepo: IBlogCategoryRepository;
  private readonly resourceRepo: IResourceRepository;
  private readonly sessionRepo: IResourceSessionRepository;
  private readonly leadRepo: IResourceLeadRepository;

  constructor(deps: ContentServiceDependencies) {
    this.blogPostRepo = deps.blogPostRepository;
    this.blogCategoryRepo = deps.blogCategoryRepository;
    this.resourceRepo = deps.resourceRepository;
    this.sessionRepo = deps.resourceSessionRepository;
    this.leadRepo = deps.resourceLeadRepository;
  }

  /**
   * Get blog posts with optional filtering
   */
  async getBlogPosts(filters?: BlogPostFilters): Promise<Result<BlogPost[]>> {
    try {
      const posts = await this.blogPostRepo.findAll(filters);
      return success(posts);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch blog posts'));
    }
  }

  /**
   * Get a single blog post by slug with category info
   */
  async getBlogPostBySlug(slug: string): Promise<Result<BlogPostWithCategory>> {
    try {
      if (!slug || typeof slug !== 'string') {
        return failure(new ValidationError('Invalid slug provided'));
      }

      const post = await this.blogPostRepo.findBySlug(slug);
      if (!post) {
        return failure(new NotFoundError('BlogPost', slug));
      }

      const category = await this.blogCategoryRepo.findById(post.categoryId);

      const postWithCategory: BlogPostWithCategory = {
        ...post,
        category,
      };

      return success(postWithCategory);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch blog post'));
    }
  }

  /**
   * Get a single blog post by ID
   */
  async getBlogPostById(id: string): Promise<Result<BlogPost>> {
    try {
      if (!id || typeof id !== 'string') {
        return failure(new ValidationError('Invalid ID provided'));
      }

      const post = await this.blogPostRepo.findById(id);
      if (!post) {
        return failure(new NotFoundError('BlogPost', id));
      }

      return success(post);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch blog post'));
    }
  }

  /**
   * Get featured blog posts
   */
  async getFeaturedBlogPosts(limit?: number): Promise<Result<BlogPost[]>> {
    try {
      const posts = await this.blogPostRepo.findFeatured(limit);
      return success(posts);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch featured posts'));
    }
  }

  /**
   * Search blog posts by query
   */
  async searchBlogPosts(query: string): Promise<Result<BlogPost[]>> {
    try {
      if (!query || typeof query !== 'string') {
        return success([]);
      }

      const sanitizedQuery = this.sanitizeSearchQuery(query);
      const posts = await this.blogPostRepo.search(sanitizedQuery);
      return success(posts);
    } catch (error) {
      return failure(new ValidationError('Search failed'));
    }
  }

  /**
   * Get all blog categories
   */
  async getBlogCategories(): Promise<Result<BlogCategory[]>> {
    try {
      const categories = await this.blogCategoryRepo.findAll();
      return success(categories);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch categories'));
    }
  }

  /**
   * Get blog category by slug with associated posts
   */
  async getBlogCategoryBySlug(
    slug: string
  ): Promise<Result<{ category: BlogCategory; posts: BlogPost[] }>> {
    try {
      if (!slug || typeof slug !== 'string') {
        return failure(new ValidationError('Invalid category slug'));
      }

      const category = await this.blogCategoryRepo.findBySlug(slug);
      if (!category) {
        return failure(new NotFoundError('BlogCategory', slug));
      }

      const posts = await this.blogPostRepo.findByCategory(category.id);

      return success({ category, posts });
    } catch (error) {
      return failure(new ValidationError('Failed to fetch category'));
    }
  }

  /**
   * Get resources with optional filtering
   */
  async getResources(filters?: ResourceFilters): Promise<Result<Resource[]>> {
    try {
      const resources = await this.resourceRepo.findAll(filters);
      return success(resources);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch resources'));
    }
  }

  /**
   * Get a single resource by slug
   */
  async getResourceBySlug(slug: string): Promise<Result<Resource>> {
    try {
      if (!slug || typeof slug !== 'string') {
        return failure(new ValidationError('Invalid slug provided'));
      }

      const resource = await this.resourceRepo.findBySlug(slug);
      if (!resource) {
        return failure(new NotFoundError('Resource', slug));
      }

      return success(resource);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch resource'));
    }
  }

  /**
   * Get a single resource by ID
   */
  async getResourceById(id: string): Promise<Result<Resource>> {
    try {
      if (!id || typeof id !== 'string') {
        return failure(new ValidationError('Invalid ID provided'));
      }

      const resource = await this.resourceRepo.findById(id);
      if (!resource) {
        return failure(new NotFoundError('Resource', id));
      }

      return success(resource);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch resource'));
    }
  }

  /**
   * Get featured resources
   */
  async getFeaturedResources(limit?: number): Promise<Result<Resource[]>> {
    try {
      const resources = await this.resourceRepo.findFeatured(limit);
      return success(resources);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch featured resources'));
    }
  }

  /**
   * Get resources by category
   */
  async getResourcesByCategory(category: string): Promise<Result<Resource[]>> {
    try {
      if (!category || typeof category !== 'string') {
        return failure(new ValidationError('Invalid category'));
      }

      const resources = await this.resourceRepo.findByCategory(category);
      return success(resources);
    } catch (error) {
      return failure(new ValidationError('Failed to fetch resources by category'));
    }
  }

  /**
   * Validate if a user has access to gated content
   * 
   * Business rules:
   * 1. Session must exist and be valid
   * 2. Session must not be expired or revoked
   * 3. Associated lead must exist and be verified
   * 4. Resource must exist
   */
  async validateContentAccess(
    resourceId: string,
    sessionId: string | null
  ): Promise<Result<ContentAccessResult>> {
    try {
      if (!sessionId) {
        return success({
          hasAccess: false,
          leadId: null,
          reason: 'no_session',
        });
      }

      const resource = await this.resourceRepo.findById(resourceId);
      if (!resource) {
        return success({
          hasAccess: false,
          leadId: null,
          reason: 'resource_not_found',
        });
      }

      const session = await this.sessionRepo.findValidSession(sessionId);
      if (!session) {
        return success({
          hasAccess: false,
          leadId: null,
          reason: 'no_session',
        });
      }

      if (session.revoked) {
        return success({
          hasAccess: false,
          leadId: session.leadId,
          reason: 'session_revoked',
        });
      }

      if (this.isSessionExpired(session)) {
        return success({
          hasAccess: false,
          leadId: session.leadId,
          reason: 'session_expired',
        });
      }

      const lead = await this.leadRepo.findById(session.leadId);
      if (!lead) {
        return success({
          hasAccess: false,
          leadId: session.leadId,
          reason: 'lead_not_found',
        });
      }

      if (!lead.verified) {
        return success({
          hasAccess: false,
          leadId: lead.id,
          reason: 'lead_not_verified',
        });
      }

      return success({
        hasAccess: true,
        leadId: lead.id,
        reason: null,
      });
    } catch (error) {
      return failure(new ValidationError('Failed to validate content access'));
    }
  }

  /**
   * Track a resource view
   */
  async trackResourceView(resourceId: string): Promise<Result<void>> {
    try {
      if (!resourceId || typeof resourceId !== 'string') {
        return failure(new ValidationError('Invalid resource ID'));
      }

      const resource = await this.resourceRepo.findById(resourceId);
      if (!resource) {
        return failure(new NotFoundError('Resource', resourceId));
      }

      await this.resourceRepo.incrementViewCount(resourceId);
      return success(undefined);
    } catch (error) {
      return failure(new ValidationError('Failed to track resource view'));
    }
  }

  /**
   * Track a blog post view
   */
  async trackBlogPostView(postId: string): Promise<Result<void>> {
    try {
      if (!postId || typeof postId !== 'string') {
        return failure(new ValidationError('Invalid post ID'));
      }

      const post = await this.blogPostRepo.findById(postId);
      if (!post) {
        return failure(new NotFoundError('BlogPost', postId));
      }

      await this.blogPostRepo.incrementViews(postId);
      return success(undefined);
    } catch (error) {
      return failure(new ValidationError('Failed to track blog post view'));
    }
  }

  /**
   * Check if a session is expired
   */
  private isSessionExpired(session: ResourceSession): boolean {
    return new Date(session.expiresAt) < new Date();
  }

  /**
   * Sanitize search query to prevent injection
   */
  private sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .slice(0, 200)
      .replace(/[<>\"'&]/g, '');
  }
}
