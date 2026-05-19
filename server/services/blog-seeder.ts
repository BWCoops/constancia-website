import { db } from "../db";
import { blogPosts, blogCategories } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("blog-seeder");

interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface SeedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  heroImage: string;
  categoryId: string;
  categorySlug: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readingTime: string;
  featured: boolean;
  views: number;
}

interface SeedData {
  categories: SeedCategory[];
  posts: SeedPost[];
  exportedAt: string;
}

export async function seedBlogsOnStartup(forceReseed: boolean = false): Promise<void> {
  try {
    if (forceReseed) {
      const existingPosts = await db.select().from(blogPosts).limit(1);
      if (existingPosts.length > 0) {
        log.info("Force reseed enabled, clearing existing blogs...");
        await db.delete(blogPosts);
        log.info("Existing blogs cleared");
      }
    }

    log.info("Checking blog seed data for missing posts...");

    let seedData: SeedData;
    try {
      // dynamic path string keeps TS from trying to resolve the JSON at compile time
      const modPath = "../scripts/blog-seed-data.json";
      seedData = (await import(/* @vite-ignore */ modPath)) as unknown as SeedData;
    } catch (err) {
      // The seed JSON is optional — when it's absent (current repo state) we
      // skip seeding rather than crash the boot. Add server/scripts/blog-seed-data.json
      // if you want canonical seed data on first boot.
      log.info("No blog-seed-data.json present, skipping blog seed");
      return;
    }

    const categories = seedData.categories;
    const posts = seedData.posts;
    
    log.info({ count: categories.length }, "Seeding categories...");
    for (const category of categories) {
      const existing = await db.select().from(blogCategories).where(eq(blogCategories.slug, category.slug)).limit(1);
      if (existing.length === 0) {
        await db.insert(blogCategories).values({
          name: category.name,
          slug: category.slug,
          description: category.description,
        });
      }
    }
    
    const allCategories = await db.select().from(blogCategories);
    const categoryMap = new Map(allCategories.map(c => [c.slug, c.id]));
    
    log.info({ count: posts.length }, "Seeding blog posts...");
    for (const post of posts) {
      const existing = await db.select().from(blogPosts).where(eq(blogPosts.slug, post.slug)).limit(1);
      if (existing.length === 0) {
        const newCategoryId = categoryMap.get(post.categorySlug) || allCategories[0]?.id;
        if (!newCategoryId) {
          log.warn({ slug: post.slug }, "Skipping post (no category)");
          continue;
        }
        await db.insert(blogPosts).values({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          heroImage: post.heroImage,
          categoryId: newCategoryId,
          tags: post.tags,
          author: post.author,
          publishedAt: post.publishedAt,
          readingTime: post.readingTime,
          featured: post.featured,
          views: 0,
        });
      }
    }
    
    log.info("Blog seeding complete!");
  } catch (error) {
    log.error({ err: error }, "Failed to seed blogs");
  }
}

export function scheduleBlogSeed(delayMs: number = 5000, forceReseed: boolean = false): void {
  setTimeout(() => {
    seedBlogsOnStartup(forceReseed).catch(err => {
      log.error({ err }, "Scheduled seed failed");
    });
  }, delayMs);
}
