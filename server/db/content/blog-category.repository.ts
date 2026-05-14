/**
 * Blog Category Repository Implementation
 * 
 * Implements IBlogCategoryRepository interface by wrapping the existing storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IStorage } from '../../storage';
import type {
  IBlogCategoryRepository,
  CreateBlogCategoryData,
  UpdateBlogCategoryData,
} from '../../core/content/interfaces';
import type { BlogCategory } from '../../core/content/types';
import type { BlogCategory as SchemaBlogCategory } from '@shared/schema';

function mapToDomainBlogCategory(category: SchemaBlogCategory): BlogCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
  };
}

export class BlogCategoryRepository implements IBlogCategoryRepository {
  constructor(private storage: IStorage) {}

  async findById(id: string): Promise<BlogCategory | null> {
    const categories = await this.storage.getBlogCategories();
    const category = categories.find(c => c.id === id);
    return category ? mapToDomainBlogCategory(category) : null;
  }

  async findBySlug(slug: string): Promise<BlogCategory | null> {
    const category = await this.storage.getBlogCategoryBySlug(slug);
    return category ? mapToDomainBlogCategory(category) : null;
  }

  async findAll(): Promise<BlogCategory[]> {
    const categories = await this.storage.getBlogCategories();
    return categories.map(mapToDomainBlogCategory);
  }

  async create(data: CreateBlogCategoryData): Promise<BlogCategory> {
    const newCategory: BlogCategory = {
      id: crypto.randomUUID(),
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
    };
    return newCategory;
  }

  async update(id: string, data: UpdateBlogCategoryData): Promise<BlogCategory | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    
    return {
      ...existing,
      name: data.name ?? existing.name,
      slug: data.slug ?? existing.slug,
      description: data.description !== undefined ? data.description ?? null : existing.description,
    };
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    return existing !== null;
  }
}
