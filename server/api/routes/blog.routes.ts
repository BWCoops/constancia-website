import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireBlog } from "../../middleware/feature-flags";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("blog-routes");

const router = Router();

router.get("/posts", requireBlog, async (_req: Request, res: Response) => {
  try {
    const posts = await storage.getBlogPosts();
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch blog posts" });
  }
});

router.get("/posts/featured", requireBlog, async (_req: Request, res: Response) => {
  try {
    const posts = await storage.getFeaturedBlogPosts();
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch featured posts" });
  }
});

router.get("/posts/:slug", requireBlog, async (req: Request, res: Response) => {
  try {
    const post = await storage.getBlogPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch blog post" });
  }
});

router.get("/categories", requireBlog, async (_req: Request, res: Response) => {
  try {
    const categories = await storage.getBlogCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

router.get("/categories/:slug", requireBlog, async (req: Request, res: Response) => {
  try {
    const category = await storage.getBlogCategoryBySlug(req.params.slug);
    if (!category) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }
    const posts = await storage.getBlogPostsByCategory(category.id);
    res.json({ success: true, data: { category, posts } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch category" });
  }
});

router.get("/search", requireBlog, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || "";
    const posts = await storage.searchBlogPosts(query);
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: "Search failed" });
  }
});

router.post("/posts/:id/view", requireBlog, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const post = await storage.getBlogPostById(id);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }
    
    await storage.incrementBlogViews(id);
    
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Blog view tracking error");
    res.status(500).json({ success: false, error: "Failed to track view" });
  }
});

export default router;
