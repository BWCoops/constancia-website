import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { 
  Search, 
  Download, 
  FileText, 
  Video, 
  Image, 
  Archive,
  FileSpreadsheet,
  File,
  Star,
  Loader2,
  Eye,
  Lock
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { PageHero } from "@/components/page-hero";
import { DownloadGateModal } from "@/components/download-gate-modal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/seo-head";
import { apiRequest } from "@/lib/queryClient";
import type { ResourceFile } from "@shared/schema";


const fileTypeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  xls: FileSpreadsheet,
  zip: Archive,
  video: Video,
  image: Image,
  other: File,
};

const fileTypeColors: Record<string, string> = {
  pdf: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  doc: "bg-[#7FB8A3]/10 text-[#8E4F67] dark:bg-[#1E2630]/30 dark:text-[#7FB8A3]",
  xls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  zip: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  video: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  image: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceFile | null>(null);
  const downloadTriggered = useRef(false);
  const searchString = useSearch();

  const { data: filesData, isLoading } = useQuery<{ success: boolean; data: ResourceFile[] | { items: ResourceFile[] } }>({
    queryKey: ["/api/files"],
  });

  const { data: featuredData } = useQuery<{ success: boolean; data: ResourceFile[] | { items: ResourceFile[] } }>({
    queryKey: ["/api/files/featured"],
  });

  // Handle both array format and paginated {items: [...]} format
  const files: ResourceFile[] = Array.isArray(filesData?.data) ? filesData.data : ((filesData?.data as { items: ResourceFile[] })?.items || []);
  const featuredFiles: ResourceFile[] = Array.isArray(featuredData?.data) ? featuredData.data : ((featuredData?.data as { items: ResourceFile[] })?.items || []);

  const categories = Array.from(new Set(files.map(f => f.category)));

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || 
      file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || file.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    if (files.length > 0 && !downloadTriggered.current) {
      const params = new URLSearchParams(searchString);
      const downloadSlug = params.get("download");
      
      if (downloadSlug) {
        const resourceToDownload = files.find(f => f.slug === downloadSlug);
        if (resourceToDownload) {
          downloadTriggered.current = true;
          setSelectedResource(resourceToDownload);
          setGateModalOpen(true);
          
          // Track view for deep-linked resource
          apiRequest("POST", `/api/files/${resourceToDownload.id}/view`).catch(() => {});
        }
      }
    }
  }, [files, searchString]);

  const handleDownload = async (file: ResourceFile) => {
    setSelectedResource(file);
    setGateModalOpen(true);
    
    // Track view when user opens download modal
    try {
      await apiRequest("POST", `/api/files/${file.id}/view`);
    } catch (error) {
      // Silently fail view tracking - not critical
      console.debug("View tracking failed:", error);
    }
  };

  const FileIcon = ({ type }: { type: string }) => {
    const Icon = fileTypeIcons[type] || fileTypeIcons.other;
    return <Icon className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="Constancia Resources - Guides, Frameworks & Downloads"
        description="Access guides, whitepapers, frameworks, and documentation for finance transformation. Download resources on EPM, ERP optimisation, and AI-driven solutions."
        keywords={[
          "AI resources",
          "business whitepapers",
          "automation guides",
          "digital transformation tools",
          "enterprise documentation",
          "EPM downloads"
        ]}
      />
      <Navigation />
      
      <main className="pt-16 sm:pt-20 pb-16">
        <PageHero
          badge="Resources & Downloads"
          title="Constancia Resources"
          description="Access guides, whitepapers, frameworks, and documentation to help you get the most out of your finance transformation."
        />

        <div className="max-w-7xl mx-auto px-6 pt-8">

          {featuredFiles.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Featured Resources</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredFiles.map(file => (
                  <Card 
                    key={file.id} 
                    className="group hover-elevate relative overflow-hidden"
                    data-testid={`card-featured-file-${file.id}`}
                  >
                    <div className="absolute top-3 right-3">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${fileTypeColors[file.fileType]}`}>
                        <FileIcon type={file.fileType} />
                      </div>
                      <CardTitle className="text-lg line-clamp-2">
                        {file.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {file.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <Badge variant="outline">{file.category}</Badge>
                        <span>{file.fileSize}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-gradient-to-r from-[#12161D] to-[#8E4F67]"
                          onClick={() => handleDownload(file)}
                          data-testid={`button-download-${file.id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {file.viewCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {file.downloadCount.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-files"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Categories</h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        !selectedCategory 
                          ? "bg-[#7FB8A3]/10 text-brand-teal dark:text-brand-cyan" 
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                      data-testid="button-file-category-all"
                    >
                      All Resources
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedCategory === category 
                            ? "bg-[#7FB8A3]/10 text-brand-teal dark:text-brand-cyan" 
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                        data-testid={`button-file-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">File Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(fileTypeIcons).map(([type, Icon]) => (
                      <div 
                        key={type}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${fileTypeColors[type]}`}
                      >
                        <Icon className="w-3 h-3" />
                        {type.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {selectedCategory || "All Resources"}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {filteredFiles.length} resource{filteredFiles.length !== 1 ? "s" : ""}
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No resources found matching your criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFiles.map(file => (
                    <Card 
                      key={file.id} 
                      className="group hover-elevate"
                      data-testid={`card-file-${file.id}`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${fileTypeColors[file.fileType]}`}>
                          <FileIcon type={file.fileType} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">
                              {file.title}
                            </h3>
                            {file.featured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                            {file.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {file.category}
                            </Badge>
                            <span>{file.fileType.toUpperCase()}</span>
                            <span>{file.fileSize}</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {file.viewCount.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {file.downloadCount.toLocaleString()}
                            </span>
                            <span>{new Date(file.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button 
                            variant="outline" 
                            size="icon"
                            data-testid={`button-preview-${file.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-gradient-to-r from-[#12161D] to-[#8E4F67]"
                            onClick={() => handleDownload(file)}
                            data-testid={`button-download-${file.id}`}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      
      <DownloadGateModal
        resource={selectedResource}
        open={gateModalOpen}
        onOpenChange={setGateModalOpen}
      />
    </div>
  );
}
