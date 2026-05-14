/**
 * Content Domain Repository Index
 * 
 * Exports all repository implementations and factory functions
 * for the content domain (blog posts, categories, resources).
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IStorage } from '../../storage';
import type {
  IBlogPostRepository,
  IBlogCategoryRepository,
  IResourceRepository,
} from '../../core/content/interfaces';

import { BlogPostRepository } from './blog-post.repository';
import { BlogCategoryRepository } from './blog-category.repository';
import { ResourceRepository } from './resource.repository';

export { BlogPostRepository } from './blog-post.repository';
export { BlogCategoryRepository } from './blog-category.repository';
export { ResourceRepository } from './resource.repository';

export function createBlogPostRepository(storage: IStorage): IBlogPostRepository {
  return new BlogPostRepository(storage);
}

export function createBlogCategoryRepository(storage: IStorage): IBlogCategoryRepository {
  return new BlogCategoryRepository(storage);
}

export function createResourceRepository(storage: IStorage): IResourceRepository {
  return new ResourceRepository(storage);
}
