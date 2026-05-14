import { db } from "../db";
import { blogPosts, blogCategories } from "@shared/schema";
import { eq } from "drizzle-orm";
import seedData from "./blog-seed-data.json";

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

async function seedBlogs() {
  console.log("Starting blog seeding...");
  
  const categories = seedData.categories as unknown as SeedCategory[];
  const posts = seedData.posts as unknown as SeedPost[];
  
  console.log(`Seeding ${categories.length} categories...`);
  for (const category of categories) {
    const existing = await db.select().from(blogCategories).where(eq(blogCategories.slug, category.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(blogCategories).values({
        name: category.name,
        slug: category.slug,
        description: category.description,
      });
      console.log(`  Created category: ${category.name}`);
    } else {
      console.log(`  Category exists: ${category.name}`);
    }
  }
  
  const allCategories = await db.select().from(blogCategories);
  const categoryMap = new Map(allCategories.map(c => [c.slug, c.id]));
  
  console.log(`\nSeeding ${posts.length} blog posts...`);
  for (const post of posts) {
    const existing = await db.select().from(blogPosts).where(eq(blogPosts.slug, post.slug)).limit(1);
    if (existing.length === 0) {
      const newCategoryId = categoryMap.get(post.categorySlug) || allCategories[0]?.id;
      if (!newCategoryId) {
        console.warn(`  Skipping post (no category): ${post.title.substring(0, 50)}...`);
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
      console.log(`  Created post: ${post.title.substring(0, 50)}...`);
    } else {
      console.log(`  Post exists: ${post.title.substring(0, 50)}...`);
    }
  }
  
  console.log("\nBlog seeding complete!");
}

seedBlogs().then(() => process.exit(0)).catch(e => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
