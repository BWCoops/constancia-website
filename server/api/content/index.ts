/**
 * Content API Module
 * 
 * Exports all content-related handlers for use in route registration.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Express } from 'express';
import { asyncHandler } from '../utils';
import * as handlers from './handlers';

export * from './handlers';

/**
 * Register content routes on the Express app
 */
export function registerContentRoutes(app: Express): void {
  // Blog posts
  app.get('/api/blog/posts', asyncHandler(handlers.getBlogPosts));
  app.get('/api/blog/posts/:slug', asyncHandler(handlers.getBlogPostBySlug));
  app.get('/api/blog/posts/id/:id', asyncHandler(handlers.getBlogPostById));
  
  // Blog categories
  app.get('/api/blog/categories', asyncHandler(handlers.getBlogCategories));
  app.get('/api/blog/categories/:slug', asyncHandler(handlers.getBlogCategoryBySlug));
  
  // Featured content
  app.get('/api/blog/featured', asyncHandler(handlers.getFeaturedBlogPosts));
  
  // Search
  app.get('/api/blog/search', asyncHandler(handlers.searchBlogPosts));
  
  // Resources
  app.get('/api/resources', asyncHandler(handlers.getResources));
  app.get('/api/resources/featured', asyncHandler(handlers.getFeaturedResources));
  app.get('/api/resources/:slug', asyncHandler(handlers.getResourceBySlug));
}
