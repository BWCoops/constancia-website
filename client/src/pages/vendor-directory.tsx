import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { Search, ArrowRight, X, Building2, ExternalLink, BarChart3, BrainCircuit, Layers } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  trackPageView,
  setupScrollTracking,
  setupDwellTimeTracking,
  trackCTAClicked,
  trackWidgetInteraction,
} from "@/lib/funnel-analytics";

import { epmPlatforms } from "@/data/comparison-platforms/epm-platforms";
import { erpPlatforms } from "@/data/comparison-platforms/erp-platforms";
import { aiPlatforms } from "@/data/comparison-platforms/ai-platforms";
import { aiPlatformContextMap } from "@/data/comparison-platforms/platform-config";
import { vendorMetadata } from "@/data/comparison-platforms/vendor-metadata";
import type { Platform } from "@/data/comparison-platforms/types";


type ToolType = "epm" | "erp" | "ai";
type Segment = "all" | "sme" | "midmarket" | "enterprise";

interface VendorEntry {
  platform: Platform;
  toolType: ToolType;
  segment: Segment;
}

const TOOL_TYPE_INITIALS_BG: Record<ToolType, string> = {
  epm: "bg-gradient-to-br from-[#12161D] to-[#8E4F67]",
  erp: "bg-gradient-to-br from-[#8E4F67] to-[#7FB8A3]",
  ai: "bg-gradient-to-br from-[#5E8D7A] to-[#12161D]",
};

const SEGMENT_COLORS: Record<string, { bg: string; text: string }> = {
  sme: { bg: "bg-emerald-500/10 dark:bg-emerald-400/10", text: "text-emerald-700 dark:text-emerald-400" },
  midmarket: { bg: "bg-amber-500/10 dark:bg-amber-400/10", text: "text-amber-700 dark:text-amber-400" },
  enterprise: { bg: "bg-violet-500/10 dark:bg-violet-400/10", text: "text-violet-700 dark:text-violet-400" },
};

const SEGMENT_LABELS_BY_TYPE: Record<ToolType, Record<Segment, string>> = {
  epm: { all: "All Segments", sme: "Small FP&A", midmarket: "Midmarket", enterprise: "Enterprise" },
  erp: { all: "All Segments", sme: "SME ERP", midmarket: "Midmarket", enterprise: "Enterprise" },
  ai: { all: "All Segments", sme: "SME AI", midmarket: "Midmarket", enterprise: "Enterprise" },
};

const CATEGORY_CONFIG: Record<ToolType, {
  label: string;
  icon: typeof BarChart3;
  title: string;
  description: string;
  count: number;
}> = {
  epm: {
    label: "EPM/CPM",
    icon: BarChart3,
    title: "Enterprise Performance Management",
    description: "Platforms for financial consolidation, close management, planning, forecasting, and reporting. These tools help CFOs and finance teams move beyond spreadsheets to unified planning and analysis.",
    count: epmPlatforms.length,
  },
  erp: {
    label: "ERP",
    icon: Layers,
    title: "Enterprise Resource Planning",
    description: "Core financial and operational systems that manage accounting, procurement, supply chain, and business processes. From cloud-native SME solutions to complex global deployments.",
    count: erpPlatforms.length,
  },
  ai: {
    label: "AI for Finance",
    icon: BrainCircuit,
    title: "AI & Intelligent Automation",
    description: "Emerging AI platforms, large language models, and intelligent automation tools with specific applications in finance, from automated reconciliation to predictive analytics and natural-language reporting.",
    count: aiPlatforms.length,
  },
};

function inferSegment(platform: Platform, toolType: ToolType): Segment {
  const bestForLower = platform.bestFor.toLowerCase();
  const descLower = platform.description.toLowerCase();
  const priceTier = platform.priceTier;

  if (toolType === "ai") {
    const ctx = aiPlatformContextMap[platform.id];
    if (ctx) {
      const sf = ctx.scaleFit;
      if (sf.enterprise === "high" && sf.sme !== "high") return "enterprise";
      if (sf.sme === "high" && sf.enterprise !== "high") return "sme";
      if (sf.midmarket === "high") return "midmarket";
    }
  }

  // Explicit market position overrides price-tier heuristics
  const marketPosLower = platform.marketPosition.toLowerCase();
  if (marketPosLower.includes("mid-market") || marketPosLower.includes("midmarket")) {
    return "midmarket";
  }
  if (marketPosLower.includes("enterprise") || marketPosLower.includes("leader") && !marketPosLower.includes("mid")) {
    return "enterprise";
  }

  if (priceTier <= 1) return "sme";
  if (priceTier >= 4) return "enterprise";

  const hasSmeSignal =
    bestForLower.includes("smb") ||
    bestForLower.includes("sme") ||
    bestForLower.includes("small business") ||
    bestForLower.includes("freelancer") ||
    bestForLower.includes("startup") ||
    bestForLower.includes("small team") ||
    descLower.includes("smb") ||
    descLower.includes("small business");

  if (hasSmeSignal) return "sme";

  if (
    bestForLower.includes("large enterprise") ||
    bestForLower.includes("large global") ||
    bestForLower.includes("complex consolidation") ||
    bestForLower.includes("regulated") ||
    bestForLower.includes("asset-intensive")
  ) {
    return "enterprise";
  }

  return "midmarket";
}

function buildVendorEntries(): Record<ToolType, VendorEntry[]> {
  const result: Record<ToolType, VendorEntry[]> = { epm: [], erp: [], ai: [] };

  for (const p of epmPlatforms) {
    result.epm.push({ platform: p, toolType: "epm", segment: inferSegment(p, "epm") });
  }
  for (const p of erpPlatforms) {
    result.erp.push({ platform: p, toolType: "erp", segment: inferSegment(p, "erp") });
  }
  for (const p of aiPlatforms) {
    result.ai.push({ platform: p, toolType: "ai", segment: inferSegment(p, "ai") });
  }

  return result;
}

const VENDORS_BY_TYPE = buildVendorEntries();
const TOTAL_COUNT = epmPlatforms.length + erpPlatforms.length + aiPlatforms.length;


function getLogoUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

const VendorLogo = memo(function VendorLogo({ platformId, logo, initialsBg }: { platformId: string; logo: string; initialsBg: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const meta = vendorMetadata[platformId];

  if (!meta || imgFailed) {
    return (
      <div
        className={`w-10 h-10 rounded-md ${initialsBg} flex items-center justify-center flex-shrink-0`}
        data-testid={`logo-vendor-${platformId}`}
      >
        <span className="text-white font-bold text-xs leading-none">{logo.slice(0, 3)}</span>
      </div>
    );
  }

  const logoSrc = meta.logoOverride || getLogoUrl(meta.logoDomain);

  return (
    <div
      className="w-10 h-10 rounded-md bg-white dark:bg-white/95 flex items-center justify-center flex-shrink-0 border border-border/30"
      data-testid={`logo-vendor-${platformId}`}
    >
      <img
        src={logoSrc}
        alt={`${platformId} logo`}
        className="w-7 h-7 object-contain"
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    </div>
  );
});

interface VendorCardProps {
  entry: VendorEntry;
}

const VendorCard = memo(function VendorCard({ entry }: VendorCardProps) {
  const { platform, toolType, segment } = entry;
  const initialsBg = TOOL_TYPE_INITIALS_BG[toolType];
  const segmentColors = SEGMENT_COLORS[segment];
  const meta = vendorMetadata[platform.id];
  const [, navigate] = useLocation();

  const handleCardClick = useCallback(() => {
    navigate(`/vendors/${platform.id}`);
  }, [navigate, platform.id]);

  const handleWebsiteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div data-testid={`card-vendor-${platform.id}`}>
      <Card
        className="h-full hover-elevate group overflow-visible cursor-pointer"
        onClick={handleCardClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleCardClick(); }}
      >
        <CardContent className="p-4 flex flex-col h-full gap-2.5">
          <div className="flex items-start gap-3">
            <VendorLogo platformId={platform.id} logo={platform.logo} initialsBg={initialsBg} />
            <div className="flex-1 min-w-0">
              <h3
                className="text-sm font-semibold text-foreground truncate"
                data-testid={`text-vendor-name-${platform.id}`}
              >
                {platform.name}
              </h3>
              <p
                className="text-xs text-muted-foreground"
                data-testid={`text-vendor-position-${platform.id}`}
              >
                {platform.marketPosition}
              </p>
            </div>
            {meta && (
              <a
                href={meta.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWebsiteClick}
                className="text-muted-foreground hover:text-brand-teal transition-colors flex-shrink-0 p-1"
                aria-label={`Visit ${platform.name} website`}
                data-testid={`link-vendor-website-${platform.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <p
            className="text-xs text-muted-foreground line-clamp-2 flex-1"
            data-testid={`text-vendor-bestfor-${platform.id}`}
          >
            {platform.bestFor}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] ${segmentColors.bg} ${segmentColors.text} border-0`}
              data-testid={`badge-vendor-segment-${platform.id}`}
            >
              {SEGMENT_LABELS_BY_TYPE[toolType][segment]}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
            <span
              className="text-xs text-muted-foreground truncate"
              data-testid={`text-vendor-price-${platform.id}`}
            >
              {platform.priceRange}
            </span>
            <span
              className="inline-flex items-center text-xs font-semibold text-brand-teal dark:text-brand-cyan whitespace-nowrap group-hover:gap-1.5 transition-all"
              data-testid={`link-vendor-profile-${platform.id}`}
            >
              View Profile
              <ArrowRight className="ml-0.5 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

function CategoryTabContent({
  toolType,
  vendors,
}: {
  toolType: ToolType;
  vendors: VendorEntry[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState<Segment>("all");

  const config = CATEGORY_CONFIG[toolType];

  const segmentCounts = useMemo(() => {
    const counts: Record<Segment, number> = { all: vendors.length, sme: 0, midmarket: 0, enterprise: 0 };
    for (const v of vendors) {
      counts[v.segment]++;
    }
    return counts;
  }, [vendors]);

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return vendors.filter((v) => {
      if (activeSegment !== "all" && v.segment !== activeSegment) return false;
      if (query) {
        const p = v.platform;
        const haystack = `${p.name} ${p.shortName} ${p.bestFor} ${p.marketPosition} ${p.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [vendors, searchQuery, activeSegment]);

  const handleSegmentChange = (seg: Segment) => {
    setActiveSegment(seg);
    trackWidgetInteraction("vendor-directory", `filter-segment-${seg}`);
  };

  return (
    <div className="space-y-6">
      <div
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#8E4F67]/10">
            <config.icon className="h-5 w-5 text-brand-teal dark:text-brand-cyan" />
          </div>
          <div>
            <h2
              className="text-lg sm:text-xl font-semibold text-foreground"
              data-testid={`heading-category-${toolType}`}
            >
              {config.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {config.count} platforms profiled
            </p>
          </div>
        </div>
        <p
          className="text-sm text-muted-foreground leading-relaxed max-w-3xl"
          data-testid={`text-category-description-${toolType}`}
        >
          {config.description}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={`Search ${config.label} platforms...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            data-testid={`input-vendor-search-${toolType}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
              data-testid={`button-clear-search-${toolType}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {(["all", "sme", "midmarket", "enterprise"] as Segment[]).map((seg) => {
            const count = segmentCounts[seg];
            if (count === 0 && seg !== "all") return null;
            return (
              <Button
                key={seg}
                variant={activeSegment === seg ? "default" : "outline"}
                size="sm"
                onClick={() => handleSegmentChange(seg)}
                data-testid={`button-filter-segment-${toolType}-${seg}`}
              >
                {SEGMENT_LABELS_BY_TYPE[toolType][seg]}
                <span className="ml-1 opacity-60">({count})</span>
              </Button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground" data-testid={`text-results-count-${toolType}`}>
        Showing {filtered.length} of {vendors.length} {config.label} platforms
      </p>

      {filtered.length > 0 ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map((entry) => (
              <VendorCard key={entry.platform.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div
            className="text-center py-12"
            data-testid={`container-empty-state-${toolType}`}
          >
            <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              No platforms match your filters
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or segment filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearchQuery(""); setActiveSegment("all"); }}
              data-testid={`button-clear-filters-${toolType}`}
            >
              Clear Filters
            </Button>
          </div>
        )}
    </div>
  );
}

export default function VendorDirectoryPage() {
  const { flags } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState<ToolType>("epm");

  useEffect(() => {
    trackPageView("vendor-directory");
    const cleanupScroll = setupScrollTracking("vendor-directory");
    const cleanupDwell = setupDwellTimeTracking("vendor-directory");
    return () => {
      cleanupScroll();
      cleanupDwell();
    };
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value as ToolType);
    trackWidgetInteraction("vendor-directory", `tab-${value}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Independent Platform Profiles | Constancia - EPM, ERP & AI Vendor Directory"
        description="Explore 49 independent platform profiles across EPM, ERP and AI for Finance. Objective analysis with no vendor bias, built for buyers evaluating finance technology."
        keywords={[
          "EPM vendor comparison",
          "ERP platform directory",
          "AI for finance tools",
          "vendor-agnostic platform profiles",
          "finance technology comparison",
          "independent EPM advisory",
        ]}
      />

      <Navigation />

      <main className="pt-16 sm:pt-20">
        <PageHero
          badge="Platform Profiles"
          title="Independent Platform Profiles"
          highlightedText="Across EPM, ERP & AI"
          description="Objective, vendor-agnostic profiles of leading finance technology platforms. No bias, no sponsorship. Built to help CFOs and finance leaders make informed decisions."
        />

        <section className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div
              className="text-center mb-8"
            >
              <span className="inline-block px-4 py-1.5 bg-[#7FB8A3]/10 text-brand-teal dark:text-brand-cyan text-sm font-medium rounded-full mb-4">Platform Directory</span>
              <h2
                className="text-xl sm:text-2xl font-bold text-foreground mb-2"
                data-testid="heading-how-to-use"
              >
                Your Independent Platform Guide
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
                Objective, independent profiles across EPM, ERP, and AI categories. Filter by market segment, explore capability scores, and find the right platform for your organisation.
              </p>
              <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                <Badge variant="secondary">{epmPlatforms.length} EPM</Badge>
                <Badge variant="secondary">{erpPlatforms.length} ERP</Badge>
                <Badge variant="secondary">{aiPlatforms.length} AI</Badge>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="h-auto p-1 bg-muted/50 flex-wrap w-full sm:w-auto justify-start">
                {(["epm", "erp", "ai"] as ToolType[]).map((type) => {
                  const config = CATEGORY_CONFIG[type];
                  const Icon = config.icon;
                  return (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className="text-xs sm:text-sm px-3 sm:px-4 gap-1.5"
                      data-testid={`tab-vendor-${type}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{config.label}</span>
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 min-h-0 h-5">
                        {config.count}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {(["epm", "erp", "ai"] as ToolType[]).map((type) => (
                <TabsContent key={type} value={type} className="mt-0">
                  <CategoryTabContent
                    toolType={type}
                    vendors={VENDORS_BY_TYPE[type]}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        <section className="py-8 sm:py-12 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div
              className="p-5 sm:p-8 lg:p-10 rounded-xl bg-gradient-to-r from-[#12161D] via-[#5E8D7A] to-[#8E4F67] text-center"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3">
                Need help identifying the right platform?
              </h2>
              <p className="text-base text-white/80 max-w-2xl mx-auto mb-6">
                Use our interactive comparison tool to evaluate platforms side-by-side, or speak to our independent advisory team for personalised guidance.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {flags.comparisonTools && (
                  <Link href="/tools/epm-comparison">
                    <Button
                      size="lg"
                      className="bg-[#7FB8A3] text-[#12161D] font-semibold"
                      onClick={() => trackCTAClicked("vendor-directory", "compare-platforms")}
                      data-testid="button-cta-compare"
                    >
                      Compare Platforms
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
                {flags.contact && (
                  <Link href="/contact">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/30 text-white backdrop-blur-sm bg-white/5"
                      onClick={() => trackCTAClicked("vendor-directory", "contact-advisory")}
                      data-testid="button-cta-contact"
                    >
                      Speak to an Adviser
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
