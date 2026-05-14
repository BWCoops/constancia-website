import { db } from "../db";
import { blogPosts, blogCategories } from "@shared/schema";
import { writeFileSync } from "fs";
import { eq } from "drizzle-orm";

async function exportBlogs() {
  console.log("Exporting blog categories...");
  const categories = await db.select().from(blogCategories);
  const categoryMap = new Map(categories.map(c => [c.id, c.slug]));
  
  console.log("Exporting blog posts...");
  const posts = await db.select().from(blogPosts).limit(5);
  
  const postsWithCategorySlug = posts.map(post => ({
    ...post,
    categorySlug: categoryMap.get(post.categoryId) || 'industry-insights'
  }));
  
  const exportData = {
    categories: categories.filter(c => !c.slug.includes('test')),
    posts: postsWithCategorySlug,
    exportedAt: new Date().toISOString()
  };
  
  writeFileSync(
    "server/scripts/blog-seed-data.json",
    JSON.stringify(exportData, null, 2)
  );
  
  console.log(`Exported ${exportData.categories.length} categories and ${posts.length} posts`);
}

exportBlogs().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
