/**
 * Blog Post Repository Implementation
 * 
 * Implements IBlogPostRepository interface by wrapping the existing storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IStorage } from '../../storage';
import type {
  IBlogPostRepository,
  CreateBlogPostData,
  UpdateBlogPostData,
} from '../../core/content/interfaces';
import type { BlogPost, BlogPostFilters } from '../../core/content/types';
import type { BlogPost as SchemaBlogPost } from '@shared/schema';

function mapToDomainBlogPost(post: SchemaBlogPost): BlogPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    heroImage: post.heroImage ?? null,
    categoryId: post.categoryId,
    tags: post.tags ?? [],
    author: post.author,
    authorImage: post.authorImage ?? null,
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    featured: post.featured ?? false,
    isPublished: true,
    views: post.views ?? 0,
    updatedAt: null,
  };
}

export class BlogPostRepository implements IBlogPostRepository {
  constructor(private storage: IStorage) {}

  async findById(id: string): Promise<BlogPost | null> {
    const post = await this.storage.getBlogPostById(id);
    return post ? mapToDomainBlogPost(post) : null;
  }

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const post = await this.storage.getBlogPostBySlug(slug);
    return post ? mapToDomainBlogPost(post) : null;
  }

  async findAll(filters?: BlogPostFilters): Promise<BlogPost[]> {
    const result = await this.storage.getBlogPosts();
    let posts = result.items;
    
    if (filters?.categoryId) {
      posts = posts.filter((p) => p.categoryId === filters.categoryId);
    }
    
    if (filters?.featured !== undefined) {
      posts = posts.filter((p) => p.featured === filters.featured);
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      posts = posts.filter((p) => 
        filters.tags!.some(tag => p.tags.includes(tag))
      );
    }
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      posts = posts.filter((p) => 
        p.title.toLowerCase().includes(searchLower) ||
        p.excerpt.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters?.limit) {
      const offset = filters.offset ?? 0;
      posts = posts.slice(offset, offset + filters.limit);
    }
    
    return posts.map(mapToDomainBlogPost);
  }

  async findFeatured(limit?: number): Promise<BlogPost[]> {
    const posts = await this.storage.getFeaturedBlogPosts();
    const limitedPosts = limit ? posts.slice(0, limit) : posts;
    return limitedPosts.map(mapToDomainBlogPost);
  }

  async findByCategory(categoryId: string): Promise<BlogPost[]> {
    const posts = await this.storage.getBlogPostsByCategory(categoryId);
    return posts.map(mapToDomainBlogPost);
  }

  async search(query: string): Promise<BlogPost[]> {
    const posts = await this.storage.searchBlogPosts(query);
    return posts.map(mapToDomainBlogPost);
  }

  async create(data: CreateBlogPostData): Promise<BlogPost> {
    const newPost: SchemaBlogPost = {
      id: crypto.randomUUID(),
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      heroImage: data.heroImage,
      categoryId: data.categoryId,
      tags: data.tags,
      author: data.author,
      authorImage: data.authorImage,
      publishedAt: data.publishedAt,
      readingTime: data.readingTime,
      featured: data.featured ?? false,
      views: 0,
    };
    
    const created = await this.storage.createBlogPost(newPost);
    return mapToDomainBlogPost(created);
  }

  async update(id: string, data: UpdateBlogPostData): Promise<BlogPost | null> {
    const updated = await this.storage.updateBlogPost(id, data);
    return updated ? mapToDomainBlogPost(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.storage.getBlogPostById(id);
    if (!existing) return false;
    
    await this.storage.updateBlogPost(id, { featured: false });
    return true;
  }

  async publish(id: string): Promise<BlogPost | null> {
    const updated = await this.storage.updateBlogPost(id, {});
    return updated ? mapToDomainBlogPost(updated) : null;
  }

  async unpublish(id: string): Promise<BlogPost | null> {
    const updated = await this.storage.updateBlogPost(id, {});
    return updated ? mapToDomainBlogPost(updated) : null;
  }

  async incrementViews(id: string): Promise<void> {
    await this.storage.incrementBlogViews(id);
  }
}
