import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, Clock, Tag, ArrowRight, Loader2 } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { PageHero } from "@/components/page-hero";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/seo-head";
import type { BlogPost, BlogCategory } from "@shared/schema";


export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: postsData, isLoading: postsLoading } = useQuery<{ success: boolean; data: BlogPost[] | { items: BlogPost[] } }>({
    queryKey: ["/api/blog/posts"],
  });

  const { data: categoriesData } = useQuery<{ success: boolean; data: BlogCategory[] | { items: BlogCategory[] } }>({
    queryKey: ["/api/blog/categories"],
  });

  const { data: featuredData } = useQuery<{ success: boolean; data: BlogPost[] | { items: BlogPost[] } }>({
    queryKey: ["/api/blog/posts/featured"],
  });

  // Handle both array format and paginated {items: [...]} format
  const posts: BlogPost[] = Array.isArray(postsData?.data) ? postsData.data : ((postsData?.data as { items: BlogPost[] })?.items || []);
  const categories: BlogCategory[] = Array.isArray(categoriesData?.data) ? categoriesData.data : ((categoriesData?.data as { items: BlogCategory[] })?.items || []);
  const featuredPosts: BlogPost[] = Array.isArray(featuredData?.data) ? featuredData.data : ((featuredData?.data as { items: BlogPost[] })?.items || []);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || post.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Uncategorized";
  };

  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="Constancia Insights Hub - Finance Transformation & EPM Insights"
        description="Expert insights on finance transformation, EPM platform selection, ERP optimisation, and AI for finance from Constancia's independent advisory team."
        keywords={[
          "AI insights",
          "digital transformation blog",
          "business intelligence articles",
          "enterprise AI trends",
          "automation insights",
          "technology blog"
        ]}
      />
      <Navigation />
      
      <main className="pt-16 sm:pt-20 pb-16">
        <PageHero
          badge="Insights & Updates"
          title="Constancia Insights Hub"
          description="Expert insights on finance transformation, ERP, EPM, and AI-driven business solutions."
        />

        <div className="max-w-7xl mx-auto px-6 pt-8">

          {featuredPosts.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--hp-text-primary)' }}>Featured Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredPosts.slice(0, 3).map(post => (
                  <Card 
                    key={post.id} 
                    className="group overflow-hidden hover-elevate"
                    data-testid={`card-featured-post-${post.id}`}
                  >
                    {post.heroImage && (
                      <div className="aspect-video overflow-hidden">
                        <img 
                          src={post.heroImage} 
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-[#C77A93]/10 text-brand-teal">
                          {getCategoryName(post.categoryId)}
                        </Badge>
                        <Badge variant="outline">Featured</Badge>
                      </div>
                      <CardTitle className="line-clamp-2 group-hover:text-brand-cyan transition-colors">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.publishedAt).toLocaleDateString('en-GB')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-blog-search"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                data-testid="button-category-all"
              >
                All
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`button-category-${category.slug}`}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {postsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--hp-text-secondary)' }}>No articles found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map(post => (
                <div key={post.id}>
                  <Card 
                    className="group h-full flex flex-col hover-elevate"
                    data-testid={`card-post-${post.id}`}
                  >
                    {post.heroImage && (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img 
                          src={post.heroImage} 
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2 flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-[#C77A93]/10 text-brand-teal">
                          {getCategoryName(post.categoryId)}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-brand-cyan transition-colors">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.publishedAt).toLocaleDateString('en-GB')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.readingTime}
                          </span>
                        </div>
                        <Link href={`/blog/${post.slug}`}>
                          <Button variant="ghost" size="sm" className="group/btn">
                            Read
                            <ArrowRight className="ml-1 h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </div>
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {post.tags.slice(0, 3).map(tag => (
                            <span 
                              key={tag}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
