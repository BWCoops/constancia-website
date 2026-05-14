/**
 * Content API Handlers
 * 
 * Thin HTTP handlers that:
 * 1. Parse request parameters
 * 2. Call the ContentService
 * 3. Format and return the response
 * 
 * These handlers contain NO business logic - they only bridge HTTP and domain.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Request, Response } from 'express';
import { buildPublicApiContext } from '../context';

/**
 * GET /api/blog/posts
 * Lists blog posts with optional filtering
 */
export async function getBlogPosts(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const filters = {
    categoryId: req.query.categoryId as string | undefined,
    status: req.query.status as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    search: req.query.search as string | undefined,
  };

  const result = await ctx.content.service.getBlogPosts(filters);

  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/blog/posts/:slug
 * Gets a single blog post by slug
 */
export async function getBlogPostBySlug(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' });
  }

  const result = await ctx.content.service.getBlogPostBySlug(slug);

  if (!result.success) {
    if (result.error.name === 'NotFoundError') {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/blog/posts/:id (by ID)
 * Gets a single blog post by ID
 */
export async function getBlogPostById(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  const result = await ctx.content.service.getBlogPostById(id);

  if (!result.success) {
    if (result.error.name === 'NotFoundError') {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/blog/categories
 * Lists all blog categories
 */
export async function getBlogCategories(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const result = await ctx.content.service.getBlogCategories();

  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/blog/categories/:slug
 * Gets a single category by slug
 */
export async function getBlogCategoryBySlug(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' });
  }

  const result = await ctx.content.service.getBlogCategoryBySlug(slug);

  if (!result.success) {
    if (result.error.name === 'NotFoundError') {
      return res.status(404).json({ error: 'Category not found' });
    }
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/blog/featured
 * Lists featured blog posts
 */
export async function getFeaturedBlogPosts(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

  const result = await ctx.content.service.getFeaturedBlogPosts(limit);

  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/blog/search
 * Searches blog posts
 */
export async function searchBlogPosts(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const query = req.query.q as string | undefined;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const result = await ctx.content.service.searchBlogPosts(query);

  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/resources
 * Lists resources with optional filtering
 */
export async function getResources(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const filters = {
    category: req.query.category as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
  };

  const result = await ctx.content.service.getResources(filters);

  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/resources/:slug
 * Gets a single resource by slug
 */
export async function getResourceBySlug(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' });
  }

  const result = await ctx.content.service.getResourceBySlug(slug);

  if (!result.success) {
    if (result.error.name === 'NotFoundError') {
      return res.status(404).json({ error: 'Resource not found' });
    }
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}

/**
 * GET /api/resources/featured
 * Lists featured resources
 */
export async function getFeaturedResources(req: Request, res: Response) {
  const ctx = buildPublicApiContext(req);
  if (!ctx) {
    return res.status(500).json({ error: 'Context not available' });
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

  const result = await ctx.content.service.getFeaturedResources(limit);

  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.json(result.data);
}
