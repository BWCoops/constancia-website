/**
 * Day to Day AI (blog) — framework-driven. The full article archive
 * lives at /blog/all (route to add when curated content arrives).
 * This page is curated — hero, what-we-write-about, featured story
 * preview, browse-all CTA.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MarketingScrollyPage } from "@/components/scrolly/MarketingScrollyPage";
import {
  ScrollyHero,
  ScrollyGrid,
  ScrollyCustom,
  ScrollyCTA,
} from "@/components/scrolly/ScrollyPanels";
import type { BlogPost, BlogCategory } from "@shared/schema";

const SEO = {
  title: "Day to Day AI — Practical Notes on Finance + AI | Constancia",
  description:
    "Short, practical writing on running AI inside finance — what works, what fails, and how to choose between platforms.",
  keywords: [
    "AI for finance",
    "FP&A AI",
    "EPM platforms",
    "Abacum vs OneStream",
    "finance transformation blog",
  ],
};

const TOPICS = [
  { eyebrow: "Topic", title: "Platforms", body: "Honest takes on Abacum, OneStream, Anaplan, Planful, Oracle, and where each one actually fits." },
  { eyebrow: "Topic", title: "AI in practice", body: "What survives contact with a real finance team — and what doesn't." },
  { eyebrow: "Topic", title: "Programmes", body: "Lessons from real EPM and AI delivery, including the bits we got wrong." },
  { eyebrow: "Topic", title: "Selection", body: "How to scope, demo and pick a platform without losing six months." },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

interface BlogPostsResponse {
  success: boolean;
  data: { items: BlogPost[]; total: number; hasMore: boolean };
}

function ArticleList() {
  const { data: postsData, isLoading, isError } = useQuery<BlogPostsResponse>({
    queryKey: ["/api/blog/posts"],
  });

  const { data: categoriesData } = useQuery<{ success: boolean; data: BlogCategory[] }>({
    queryKey: ["/api/blog/categories"],
  });

  const posts = postsData?.data?.items ?? [];
  const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  if (isLoading) {
    return (
      <ul className="scrolly-articles" aria-label="Loading articles">
        {[0, 1, 2].map((i) => (
          <li key={i} className="scrolly-articles__item scrolly-articles__item--skeleton" aria-hidden="true">
            <div className="scrolly-articles__skeleton-title" />
            <div className="scrolly-articles__skeleton-meta" />
            <div className="scrolly-articles__skeleton-excerpt" />
          </li>
        ))}
      </ul>
    );
  }

  if (isError) {
    return (
      <p className="scrolly-tablet__body">
        We weren't able to load the article list right now. Please try refreshing the page.
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="scrolly-tablet__body">
        We're curating the first set of pieces now. In the meantime, if you'd
        like a specific take — platform choice, programme post-mortem, AI use
        case shape — drop us a line and we'll write it next.
      </p>
    );
  }

  return (
    <ul className="scrolly-articles" aria-label="Latest articles">
      {posts.map((post) => (
        <li key={post.id} className="scrolly-articles__item">
          <Link href={`/blog/${post.slug}`} className="scrolly-articles__link" data-testid={`link-article-${post.slug}`}>
            <span className="scrolly-articles__title">{post.title}</span>
            <span className="scrolly-articles__meta">
              {categoryMap[post.categoryId] && (
                <span className="scrolly-articles__category">{categoryMap[post.categoryId]}</span>
              )}
              <span className="scrolly-articles__date">{formatDate(post.publishedAt)}</span>
              {post.readingTime && (
                <span className="scrolly-articles__reading-time">{post.readingTime}</span>
              )}
            </span>
            {post.excerpt && (
              <span className="scrolly-articles__excerpt">{post.excerpt}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function BlogPage() {
  return (
    <MarketingScrollyPage seo={SEO} label="Day to Day AI" heightVh={600} heightVhMobile={580}>
      <ScrollyHero
        eyebrow="Day to Day AI"
        heading="Practical notes on running AI"
        headingAccent="inside finance."
        body="Short reads from senior practitioners. No hype, no jargon — what we'd actually tell a peer."
      />

      <ScrollyGrid
        eyebrow="What we write about"
        heading="Four lenses, one job."
        items={TOPICS}
      />

      <ScrollyCustom
        eyebrow="Latest"
        heading="From the archive."
        wide
      >
        <ArticleList />
      </ScrollyCustom>

      <ScrollyCTA
        eyebrow="Coming soon"
        heading="Want a piece on a specific platform"
        headingAccent="or programme?"
        body="Tell us what you want to read about. We'll write it."
        cta={{ label: "Ask for a piece", href: "/contact", testId: "button-blog-cta" }}
      />
    </MarketingScrollyPage>
  );
}
