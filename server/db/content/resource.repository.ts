/**
 * Resource Repository Implementation
 * 
 * Implements IResourceRepository interface by wrapping the existing storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IStorage } from '../../storage';
import type {
  IResourceRepository,
  CreateResourceData,
  UpdateResourceData,
} from '../../core/content/interfaces';
import type { Resource, ResourceFilters } from '../../core/content/types';
import type { ResourceFile as SchemaResourceFile } from '@shared/schema';

function mapToDomainResource(file: SchemaResourceFile): Resource {
  return {
    id: file.id,
    title: file.title,
    slug: file.slug,
    description: file.description,
    category: file.category,
    fileType: file.fileType,
    fileUrl: file.fileUrl,
    fileSize: file.fileSize,
    downloadCount: file.downloadCount ?? 0,
    viewCount: file.viewCount ?? 0,
    featured: file.featured ?? false,
    publishedAt: file.publishedAt,
    isPublished: true,
    updatedAt: null,
  };
}

export class ResourceRepository implements IResourceRepository {
  constructor(private storage: IStorage) {}

  async findById(id: string): Promise<Resource | null> {
    const file = await this.storage.getResourceFileById(id);
    return file ? mapToDomainResource(file) : null;
  }

  async findBySlug(slug: string): Promise<Resource | null> {
    const file = await this.storage.getResourceFileBySlug(slug);
    return file ? mapToDomainResource(file) : null;
  }

  async findAll(filters?: ResourceFilters): Promise<Resource[]> {
    const result = await this.storage.getResourceFiles();
    let files = result.items;
    
    if (filters?.category) {
      files = files.filter((f) => f.category === filters.category);
    }
    
    if (filters?.fileType) {
      files = files.filter((f) => f.fileType === filters.fileType);
    }
    
    if (filters?.featured !== undefined) {
      files = files.filter((f) => f.featured === filters.featured);
    }
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      files = files.filter((f) => 
        f.title.toLowerCase().includes(searchLower) ||
        f.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters?.limit) {
      const offset = filters.offset ?? 0;
      files = files.slice(offset, offset + filters.limit);
    }
    
    return files.map(mapToDomainResource);
  }

  async findFeatured(limit?: number): Promise<Resource[]> {
    const files = await this.storage.getFeaturedResourceFiles();
    const limitedFiles = limit ? files.slice(0, limit) : files;
    return limitedFiles.map(mapToDomainResource);
  }

  async findByCategory(category: string): Promise<Resource[]> {
    const files = await this.storage.getResourceFilesByCategory(category);
    return files.map(mapToDomainResource);
  }

  /**
   * CREATE - Not yet implemented in storage layer
   * Resources are currently managed via admin panel direct SQL
   * @throws Error when called - implement storage.createResourceFile first
   */
  async create(_data: CreateResourceData): Promise<Resource> {
    throw new Error(
      'ResourceRepository.create: Not implemented. ' +
      'Resources are managed via admin panel. ' +
      'Implement storage.createResourceFile to enable this method.'
    );
  }

  /**
   * UPDATE - Not yet implemented in storage layer
   * @throws Error when called - implement storage.updateResourceFile first
   */
  async update(_id: string, _data: UpdateResourceData): Promise<Resource | null> {
    throw new Error(
      'ResourceRepository.update: Not implemented. ' +
      'Resources are managed via admin panel. ' +
      'Implement storage.updateResourceFile to enable this method.'
    );
  }

  /**
   * DELETE - Not yet implemented in storage layer
   * @throws Error when called - implement storage.deleteResourceFile first
   */
  async delete(_id: string): Promise<boolean> {
    throw new Error(
      'ResourceRepository.delete: Not implemented. ' +
      'Resources are managed via admin panel. ' +
      'Implement storage.deleteResourceFile to enable this method.'
    );
  }

  async incrementDownloadCount(id: string): Promise<void> {
    await this.storage.incrementDownloadCount(id);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.storage.incrementViewCount(id);
  }
}
