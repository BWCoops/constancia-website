/**
 * Knowledge Base Service with Full-Text Search
 * 
 * Provides CRUD operations and PostgreSQL full-text search for the
 * FinanceCompass AI knowledge base.
 */

import { z } from "zod";
import { db } from "../../db";
import { 
  fcAiKnowledgeBase, 
  fcKnowledgeBaseSearch,
  type InsertFcAiKnowledgeBase,
  type FcAiKnowledgeBase,
} from "@shared/finance-compass-schema";
import { eq, and, or, ilike, sql, desc, asc } from "drizzle-orm";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("knowledge-base-service");

// Input validation schemas
const knowledgeBaseCreateSchema = z.object({
  key: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/, "Key must be alphanumeric with underscores and hyphens only"),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(100),
  content: z.string().min(1).max(100000),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  applicableTiers: z.array(z.string().max(50)).max(10).optional().default([]),
  applicableDimensions: z.array(z.string().max(100)).max(20).optional().default([]),
  sourceCitation: z.string().max(500).optional(),
  isActive: z.boolean().optional().default(true),
  version: z.number().int().min(1).optional().default(1),
});

const knowledgeBaseUpdateSchema = knowledgeBaseCreateSchema.partial();

const searchOptionsSchema = z.object({
  query: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  tier: z.string().max(50).optional(),
  dimension: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  sortBy: z.enum(["relevance", "title", "createdAt", "updatedAt"]).optional().default("relevance"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

interface SearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  tier?: string;
  dimension?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "title" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

interface SearchResult {
  items: FcAiKnowledgeBase[];
  total: number;
  hasMore: boolean;
}

// SQL injection prevention - sanitize strings for LIKE patterns
function sanitizeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// Sanitize string for tsquery
function sanitizeTsQuery(input: string): string {
  // Remove special characters that could break tsquery
  return input.replace(/[&|!():*<>'"\\]/g, ' ').trim();
}

export class KnowledgeBaseService {
  
  async create(data: InsertFcAiKnowledgeBase): Promise<FcAiKnowledgeBase> {
    // Validate input
    const validated = knowledgeBaseCreateSchema.parse(data);
    
    try {
      const [entry] = await db.insert(fcAiKnowledgeBase)
        .values(validated)
        .returning();
      
      await this.updateSearchIndex(entry.id, entry);
      
      return entry;
    } catch (error) {
      log.error({ err: error }, "Create error");
      throw new Error("Failed to create knowledge base entry");
    }
  }

  async update(id: string, data: Partial<InsertFcAiKnowledgeBase>): Promise<FcAiKnowledgeBase | null> {
    if (!id || typeof id !== 'string') {
      throw new Error("Invalid entry ID");
    }

    // Validate input
    const validated = knowledgeBaseUpdateSchema.parse(data);
    
    try {
      const [updated] = await db.update(fcAiKnowledgeBase)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(fcAiKnowledgeBase.id, id))
        .returning();
      
      if (updated) {
        await this.updateSearchIndex(id, updated);
      }
      
      return updated || null;
    } catch (error) {
      log.error({ err: error }, "Update error");
      throw new Error("Failed to update knowledge base entry");
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      throw new Error("Invalid entry ID");
    }

    try {
      await db.delete(fcKnowledgeBaseSearch)
        .where(eq(fcKnowledgeBaseSearch.knowledgeBaseId, id));
      
      const result = await db.delete(fcAiKnowledgeBase)
        .where(eq(fcAiKnowledgeBase.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      log.error({ err: error }, "Delete error");
      throw new Error("Failed to delete knowledge base entry");
    }
  }

  async getById(id: string): Promise<FcAiKnowledgeBase | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    try {
      const [entry] = await db.select()
        .from(fcAiKnowledgeBase)
        .where(eq(fcAiKnowledgeBase.id, id));
      
      return entry || null;
    } catch (error) {
      log.error({ err: error }, "GetById error");
      return null;
    }
  }

  async getByKey(key: string): Promise<FcAiKnowledgeBase | null> {
    if (!key || typeof key !== 'string') {
      return null;
    }

    try {
      const [entry] = await db.select()
        .from(fcAiKnowledgeBase)
        .where(eq(fcAiKnowledgeBase.key, key));
      
      return entry || null;
    } catch (error) {
      log.error({ err: error }, "GetByKey error");
      return null;
    }
  }

  async getAll(options: { isActive?: boolean } = {}): Promise<FcAiKnowledgeBase[]> {
    try {
      const conditions = [];
      
      if (options.isActive !== undefined) {
        conditions.push(eq(fcAiKnowledgeBase.isActive, options.isActive));
      }
      
      const query = db.select().from(fcAiKnowledgeBase);
      
      if (conditions.length > 0) {
        return query.where(and(...conditions)).orderBy(desc(fcAiKnowledgeBase.createdAt));
      }
      
      return query.orderBy(desc(fcAiKnowledgeBase.createdAt));
    } catch (error) {
      log.error({ err: error }, "GetAll error");
      return [];
    }
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    // Validate and sanitize options
    const validated = searchOptionsSchema.parse(options);
    
    const {
      query,
      category,
      tags,
      tier,
      dimension,
      isActive = true,
      limit = 20,
      offset = 0,
      sortBy = "relevance",
      sortOrder = "desc",
    } = validated;

    // Enforce max limits
    const safeLimit = Math.min(limit, 500);
    const safeOffset = Math.max(0, offset);

    try {
      const conditions = [];
      
      if (isActive !== undefined) {
        conditions.push(eq(fcAiKnowledgeBase.isActive, isActive));
      }
      
      if (category) {
        conditions.push(eq(fcAiKnowledgeBase.category, category));
      }
      
      if (tier) {
        // Use parameterized query to prevent SQL injection
        conditions.push(sql`${tier} = ANY(${fcAiKnowledgeBase.applicableTiers})`);
      }
      
      if (dimension) {
        conditions.push(sql`${dimension} = ANY(${fcAiKnowledgeBase.applicableDimensions})`);
      }
      
      if (tags && tags.length > 0) {
        // Safely build the array for PostgreSQL
        const sanitizedTags = tags.map(t => t.replace(/'/g, "''"));
        conditions.push(sql`${fcAiKnowledgeBase.tags} && ARRAY[${sql.raw(sanitizedTags.map(t => `'${t}'`).join(','))}]::text[]`);
      }

      if (query && query.trim()) {
        const sanitizedQuery = sanitizeLikePattern(query.trim().toLowerCase());
        const searchTerms = sanitizedQuery.split(/\s+/).filter(t => t.length > 0).slice(0, 10); // Limit terms
        
        if (searchTerms.length > 0) {
          const searchConditions = searchTerms.map(term => 
            or(
              ilike(fcAiKnowledgeBase.title, `%${term}%`),
              ilike(fcAiKnowledgeBase.content, `%${term}%`),
              ilike(fcAiKnowledgeBase.description, `%${term}%`),
              sql`EXISTS (SELECT 1 FROM unnest(${fcAiKnowledgeBase.tags}) AS tag WHERE tag ILIKE ${`%${term}%`})`
            )
          );
          conditions.push(and(...searchConditions));
        }
      }

      let orderBy;
      switch (sortBy) {
        case "title":
          orderBy = sortOrder === "asc" ? asc(fcAiKnowledgeBase.title) : desc(fcAiKnowledgeBase.title);
          break;
        case "createdAt":
          orderBy = sortOrder === "asc" ? asc(fcAiKnowledgeBase.createdAt) : desc(fcAiKnowledgeBase.createdAt);
          break;
        case "updatedAt":
          orderBy = sortOrder === "asc" ? asc(fcAiKnowledgeBase.updatedAt) : desc(fcAiKnowledgeBase.updatedAt);
          break;
        default:
          orderBy = desc(fcAiKnowledgeBase.updatedAt);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(fcAiKnowledgeBase)
        .where(whereClause);
      
      const total = countResult?.count || 0;
      
      const items = await db.select()
        .from(fcAiKnowledgeBase)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(safeLimit)
        .offset(safeOffset);

      return {
        items,
        total,
        hasMore: safeOffset + items.length < total,
      };
    } catch (error) {
      log.error({ err: error }, "Search error");
      return { items: [], total: 0, hasMore: false };
    }
  }

  async fullTextSearch(query: string, options: { limit?: number; category?: string; tier?: string } = {}): Promise<FcAiKnowledgeBase[]> {
    const limit = Math.min(options.limit || 10, 100);
    const { category, tier } = options;
    
    if (!query || !query.trim()) {
      return [];
    }

    try {
      // Sanitize query for tsquery
      const sanitizedQuery = sanitizeTsQuery(query.trim());
      if (!sanitizedQuery) {
        return [];
      }

      const tsQuery = sanitizedQuery.split(/\s+/)
        .filter(term => term.length > 0)
        .slice(0, 10) // Limit number of terms
        .map(term => `${term}:*`)
        .join(' & ');
      
      if (!tsQuery) {
        return [];
      }
      
      const conditions = [
        eq(fcAiKnowledgeBase.isActive, true),
      ];
      
      if (category) {
        conditions.push(eq(fcAiKnowledgeBase.category, category));
      }
      
      if (tier) {
        conditions.push(sql`${tier} = ANY(${fcAiKnowledgeBase.applicableTiers})`);
      }

      const results = await db.select({
        entry: fcAiKnowledgeBase,
        rank: sql<number>`ts_rank(
          to_tsvector('english', COALESCE(${fcAiKnowledgeBase.title}, '') || ' ' || 
                                 COALESCE(${fcAiKnowledgeBase.description}, '') || ' ' || 
                                 COALESCE(${fcAiKnowledgeBase.content}, '')),
          to_tsquery('english', ${tsQuery})
        )`.as('rank'),
      })
      .from(fcAiKnowledgeBase)
      .where(and(
        ...conditions,
        sql`to_tsvector('english', COALESCE(${fcAiKnowledgeBase.title}, '') || ' ' || 
                                    COALESCE(${fcAiKnowledgeBase.description}, '') || ' ' || 
                                    COALESCE(${fcAiKnowledgeBase.content}, '')) 
            @@ to_tsquery('english', ${tsQuery})`
      ))
      .orderBy(sql`rank DESC`)
      .limit(limit);

      return results.map(r => r.entry);
    } catch (error) {
      log.error({ err: error }, "FullTextSearch error");
      return [];
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const results = await db.selectDistinct({ category: fcAiKnowledgeBase.category })
        .from(fcAiKnowledgeBase)
        .where(eq(fcAiKnowledgeBase.isActive, true))
        .orderBy(asc(fcAiKnowledgeBase.category));
      
      return results.map(r => r.category);
    } catch (error) {
      log.error({ err: error }, "GetCategories error");
      return [];
    }
  }

  async getAllTags(): Promise<string[]> {
    try {
      const results = await db.select({ tags: fcAiKnowledgeBase.tags })
        .from(fcAiKnowledgeBase)
        .where(eq(fcAiKnowledgeBase.isActive, true));
      
      const tagSet = new Set<string>();
      for (const row of results) {
        if (row.tags && Array.isArray(row.tags)) {
          for (const tag of row.tags) {
            if (typeof tag === 'string') {
              tagSet.add(tag);
            }
          }
        }
      }
      
      return Array.from(tagSet).sort();
    } catch (error) {
      log.error({ err: error }, "GetAllTags error");
      return [];
    }
  }

  async getByCategory(category: string): Promise<FcAiKnowledgeBase[]> {
    if (!category || typeof category !== 'string') {
      return [];
    }

    try {
      return db.select()
        .from(fcAiKnowledgeBase)
        .where(and(
          eq(fcAiKnowledgeBase.category, category),
          eq(fcAiKnowledgeBase.isActive, true)
        ))
        .orderBy(asc(fcAiKnowledgeBase.title));
    } catch (error) {
      log.error({ err: error }, "GetByCategory error");
      return [];
    }
  }

  async getForContext(tier: string, dimension?: string): Promise<FcAiKnowledgeBase[]> {
    if (!tier || typeof tier !== 'string') {
      return [];
    }

    try {
      const conditions = [
        eq(fcAiKnowledgeBase.isActive, true),
        sql`${tier} = ANY(${fcAiKnowledgeBase.applicableTiers})`,
      ];
      
      if (dimension) {
        conditions.push(sql`${dimension} = ANY(${fcAiKnowledgeBase.applicableDimensions})`);
      }
      
      return db.select()
        .from(fcAiKnowledgeBase)
        .where(and(...conditions))
        .orderBy(asc(fcAiKnowledgeBase.title));
    } catch (error) {
      log.error({ err: error }, "GetForContext error");
      return [];
    }
  }

  async toggleActive(id: string): Promise<FcAiKnowledgeBase | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    try {
      const entry = await this.getById(id);
      if (!entry) return null;
      
      return this.update(id, { isActive: !entry.isActive });
    } catch (error) {
      log.error({ err: error }, "ToggleActive error");
      return null;
    }
  }

  async incrementVersion(id: string): Promise<FcAiKnowledgeBase | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    try {
      const entry = await this.getById(id);
      if (!entry) return null;
      
      return this.update(id, { version: entry.version + 1 });
    } catch (error) {
      log.error({ err: error }, "IncrementVersion error");
      return null;
    }
  }

  async markReviewed(id: string): Promise<FcAiKnowledgeBase | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    try {
      return this.update(id, { lastReviewedAt: new Date() });
    } catch (error) {
      log.error({ err: error }, "MarkReviewed error");
      return null;
    }
  }

  private async updateSearchIndex(knowledgeBaseId: string, entry: FcAiKnowledgeBase): Promise<void> {
    try {
      const combinedText = [
        entry.title,
        entry.description,
        entry.content,
        ...(entry.tags || []),
      ].filter(Boolean).join(' ');

      await db.delete(fcKnowledgeBaseSearch)
        .where(eq(fcKnowledgeBaseSearch.knowledgeBaseId, knowledgeBaseId));
      
      await db.insert(fcKnowledgeBaseSearch).values({
        knowledgeBaseId,
        titleTokens: entry.title,
        contentTokens: entry.content.substring(0, 5000),
        tagTokens: (entry.tags || []).join(' '),
        combinedText: combinedText.substring(0, 10000),
      });
    } catch (error) {
      log.error({ err: error }, "UpdateSearchIndex error");
      // Don't throw - index update failure shouldn't block the main operation
    }
  }

  async rebuildSearchIndex(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;
    
    try {
      const entries = await this.getAll();
      
      for (const entry of entries) {
        try {
          await this.updateSearchIndex(entry.id, entry);
          processed++;
        } catch (error) {
          log.error({ err: error, entryId: entry.id }, "Failed to index entry");
          errors++;
        }
      }
      
      return { processed, errors };
    } catch (error) {
      log.error({ err: error }, "RebuildSearchIndex error");
      return { processed: 0, errors: 1 };
    }
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    categories: number;
    recentlyUpdated: number;
    needsReview: number;
  }> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const [stats] = await db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) FILTER (WHERE ${fcAiKnowledgeBase.isActive} = true)::int`,
        inactive: sql<number>`count(*) FILTER (WHERE ${fcAiKnowledgeBase.isActive} = false)::int`,
        recentlyUpdated: sql<number>`count(*) FILTER (WHERE ${fcAiKnowledgeBase.updatedAt} >= ${thirtyDaysAgo})::int`,
        needsReview: sql<number>`count(*) FILTER (WHERE ${fcAiKnowledgeBase.lastReviewedAt} IS NULL OR ${fcAiKnowledgeBase.lastReviewedAt} < ${ninetyDaysAgo})::int`,
      }).from(fcAiKnowledgeBase);
      
      const categories = await this.getCategories();
      
      return {
        total: stats?.total || 0,
        active: stats?.active || 0,
        inactive: stats?.inactive || 0,
        categories: categories.length,
        recentlyUpdated: stats?.recentlyUpdated || 0,
        needsReview: stats?.needsReview || 0,
      };
    } catch (error) {
      log.error({ err: error }, "GetStats error");
      return {
        total: 0,
        active: 0,
        inactive: 0,
        categories: 0,
        recentlyUpdated: 0,
        needsReview: 0,
      };
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
