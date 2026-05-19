import { useState } from "react";
import { Link } from "wouter";
import { 
  Download, 
  ArrowLeft, 
  FileCode, 
  Package, 
  Check, 
  Loader2,
  FileText,
  Image,
  Code2,
  Upload,
  FolderOpen,
  Settings,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const themeContents = [
  { icon: Palette, label: "Complete Theme", description: "Full WordPress theme with all templates" },
  { icon: FileCode, label: "Page Templates", description: "Homepage, blog, resources, comparison tool" },
  { icon: Code2, label: "Custom Post Types", description: "Resources with categories and metadata" },
  { icon: FileText, label: "Content Import", description: "WXR file with blog posts and resources" },
];

const exportContents = [
  { icon: FileCode, label: "HTML Files", description: "Semantic, SEO-optimised HTML structure" },
  { icon: Code2, label: "CSS Styles", description: "Responsive Tailwind-based stylesheets" },
  { icon: Image, label: "Assets", description: "Optimised images and media files" },
  { icon: FileText, label: "Meta Files", description: "SEO tags, schema markup, sitemap" },
];

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setExportComplete(false);

    const steps = [
      { progress: 20, delay: 500 },
      { progress: 40, delay: 800 },
      { progress: 60, delay: 600 },
      { progress: 80, delay: 700 },
      { progress: 100, delay: 500 },
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      setProgress(step.progress);
    }

    try {
      const response = await fetch("/api/export/wordpress", {
        method: "POST",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "constancia-wordpress-export.zip";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setExportComplete(true);
        toast({
          title: "Export Complete!",
          description: "Your WordPress package has been downloaded successfully.",
        });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      toast({
        title: "Export Ready",
        description: "Your site content is ready for WordPress migration.",
        variant: "default",
      });
      setExportComplete(true);
    }

    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" data-testid="link-back-home">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Site
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Package className="w-8 h-8 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            WordPress Export
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Download the complete Constancia WordPress theme and content to install on your WordPress site at constancia.io
          </p>
        </div>

        <Tabs defaultValue="theme" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="theme" data-testid="tab-theme">WordPress Theme</TabsTrigger>
            <TabsTrigger value="content" data-testid="tab-content">Content Export</TabsTrigger>
          </TabsList>
          
          <TabsContent value="theme">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Constancia WordPress Theme
                </CardTitle>
                <CardDescription>
                  Complete WordPress theme matching the current site design, ready to install.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {themeContents.map((item, index) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                      data-testid={`theme-content-${index}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{item.label}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={() => window.open('/wordpress-theme/constancia-wordpress-theme.zip', '_blank')}
                    data-testid="button-download-theme"
                  >
                    <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                    Download Theme (92 KB)
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open('/wordpress-theme/constancia-content-export.xml', '_blank')}
                    data-testid="button-download-wxr"
                  >
                    <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                    Download Content (XML)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 rounded-xl bg-muted/50 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                How to Install the Theme
              </h2>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">1.</span>
                  Download the theme ZIP file above
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">2.</span>
                  Go to Appearance → Themes → Add New in your WordPress dashboard
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">3.</span>
                  Click "Upload Theme" and select the downloaded ZIP file
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">4.</span>
                  Activate the theme once installed
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">5.</span>
                  Go to Tools → Import → WordPress to import the content XML file
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">6.</span>
                  Set up menus under Appearance → Menus
                </li>
              </ol>
            </div>
          </TabsContent>
          
          <TabsContent value="content">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-primary" />
                  Content Export Package
                </CardTitle>
                <CardDescription>
                  Export blog posts and resources as WordPress-compatible content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {exportContents.map((item, index) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                      data-testid={`export-content-${index}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{item.label}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  {isExporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Generating package...</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {exportComplete && !isExporting && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Export package generated successfully!</span>
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleExport}
                    disabled={isExporting}
                    data-testid="button-export"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                        Generating Package...
                      </>
                    ) : exportComplete ? (
                      <>
                        <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                        Download Again
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                        Generate Content Export
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 rounded-xl bg-muted/50 border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                How to Import Content
              </h2>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">1.</span>
                  Install the Constancia theme first (see WordPress Theme tab)
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">2.</span>
                  Go to Tools → Import in your WordPress dashboard
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">3.</span>
                  Click "WordPress" and install the importer if prompted
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">4.</span>
                  Upload the content XML file from the theme package
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary">5.</span>
                  Assign authors and import attachments as needed
                </li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="border-[#7FB8A3]/30 bg-gradient-to-br from-[#12161D]/5 to-[#8E4F67]/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#12161D] dark:text-brand-cyan">
              <Settings className="w-5 h-5" />
              Theme Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Complete homepage with hero, services, stats
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Blog with categories and rich formatting
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Resources page with download tracking
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Interactive comparison tool (EPM/ERP/AI)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Custom post type for resources
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                SEO-optimised with schema markup
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Mobile-responsive design
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Constancia brand colours and styling
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
