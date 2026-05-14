import { storage } from "../storage";

async function publishBlog() {
  const jobId = "93a2eb0a-0e1f-4c7d-b744-e982a637d2ba";
  
  const job = await storage.getBlogGenerationJob(jobId);
  if (!job) {
    console.log("Job not found");
    return;
  }
  
  if (!job.finalContent) {
    console.log("No content");
    return;
  }
  
  const generatedPost = JSON.parse(job.finalContent);
  console.log("Title from content:", generatedPost.title);
  console.log("Title from job:", job.title);
  
  const categories = await storage.getBlogCategories();
  const categoryId = job.categoryId || (categories.length > 0 ? categories[0].id : "");
  
  const content = generatedPost.content || "";
  const title = generatedPost.title || job.title || "Untitled";
  const excerpt = generatedPost.excerpt || content.substring(0, 160);
  const tags = generatedPost.tags || job.targetKeywords || [];
  
  const slug = "cfos-guide-ai-fpa-" + Date.now().toString(36);
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200) + " min read";
  
  const newPost = {
    id: "blog-" + Date.now().toString(36) + "-" + Math.random().toString(36).substr(2, 5),
    title,
    slug,
    excerpt,
    content,
    heroImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop",
    author: "Constancia Editorial Team",
    authorAvatar: "/avatars/1qg-avatar.png",
    readingTime,
    publishedAt: new Date().toISOString(),
    categoryId,
    tags,
    featured: false,
    views: 0,
    rating: 0,
    ratingCount: 0,
  };
  
  console.log("Publishing:", newPost.title);
  console.log("Slug:", newPost.slug);
  console.log("Word count:", wordCount);
  
  const savedPost = await storage.createBlogPost(newPost);
  console.log("Published successfully:", savedPost.id);
  
  await storage.updateBlogGenerationJob(jobId, {
    status: "published",
    updatedAt: new Date()
  });
  
  console.log("Job marked as published");
  console.log("View at: /blog/" + savedPost.slug);
}

publishBlog().catch(console.error);
