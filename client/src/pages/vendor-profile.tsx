import { useState, useEffect, useMemo, memo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  TrendingUp,
  Tag,
  Building2,
  Star,
  BookOpen,
  Target,
  Sparkles,
  BarChart3,
  ThumbsUp,
  AlertTriangle,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { Navigation } from "@/components/navigation";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  trackPageView,
  setupScrollTracking,
  setupDwellTimeTracking,
} from "@/lib/funnel-analytics";

import { epmPlatforms } from "@/data/comparison-platforms/epm-platforms";
import { erpPlatforms } from "@/data/comparison-platforms/erp-platforms";
import { aiPlatforms } from "@/data/comparison-platforms/ai-platforms";
import {
  epmCategories,
  erpCategories,
  aiCategories,
} from "@/data/comparison-platforms/platform-config";
import { vendorMetadata } from "@/data/comparison-platforms/vendor-metadata";
import type { Platform, Category } from "@/data/comparison-platforms/types";

type ToolType = "epm" | "erp" | "ai";

interface VendorLookupResult {
  platform: Platform;
  toolType: ToolType;
  categories: Category[];
}

function findVendor(id: string): VendorLookupResult | null {
  const epm = epmPlatforms.find((p) => p.id === id);
  if (epm) return { platform: epm, toolType: "epm", categories: epmCategories };

  const erp = erpPlatforms.find((p) => p.id === id);
  if (erp) return { platform: erp, toolType: "erp", categories: erpCategories };

  const ai = aiPlatforms.find((p) => p.id === id);
  if (ai) return { platform: ai, toolType: "ai", categories: aiCategories };

  return null;
}

const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  epm: "EPM/CPM",
  erp: "ERP",
  ai: "AI for Finance",
};

const ROI_COLORS: Record<string, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-red-600 dark:text-red-400",
};

const ROI_BG: Record<string, string> = {
  high: "bg-emerald-500/10",
  medium: "bg-amber-500/10",
  low: "bg-red-500/10",
};

function getScoreColour(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-[#0884AA]";
  if (score >= 4) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreTextColour(score: number): string {
  if (score >= 8) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 6) return "text-brand-teal dark:text-brand-cyan";
  if (score >= 4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

interface VendorLogoProps {
  platform: Platform;
  logoDomain?: string;
  size?: "sm" | "lg";
}

const VendorLogo = memo(function VendorLogo({
  platform,
  logoDomain,
  size = "lg",
}: VendorLogoProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === "lg" ? "w-16 h-16" : "w-11 h-11";
  const textSize = size === "lg" ? "text-xl" : "text-sm";

  const meta = vendorMetadata[platform.id];
  const logoSrc = meta?.logoOverride || (logoDomain ? `https://www.google.com/s2/favicons?domain=${logoDomain}&sz=128` : null);

  if (!logoSrc || imgError) {
    return (
      <div
        className={`${sizeClasses} rounded-lg bg-gradient-to-br from-[#02205B] to-[#0884AA] flex items-center justify-center flex-shrink-0`}
        data-testid={`logo-vendor-${platform.id}`}
      >
        <span className={`text-white font-bold ${textSize} leading-none`}>
          {platform.logo.slice(0, 3)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-lg bg-white dark:bg-white/95 flex items-center justify-center flex-shrink-0 border border-border/30`}
      data-testid={`logo-vendor-${platform.id}`}
    >
      <img
        src={logoSrc}
        alt={`${platform.name} logo`}
        className={size === "lg" ? "w-10 h-10 object-contain" : "w-7 h-7 object-contain"}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    </div>
  );
});

interface ScoreBarProps {
  label: string;
  score: number;
  categoryId: string;
}

const ScoreBar = memo(function ScoreBar({ label, score, categoryId }: ScoreBarProps) {
  return (
    <div className="space-y-1" data-testid={`score-bar-${categoryId}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground truncate">{label}</span>
        <span
          className={`text-sm font-semibold tabular-nums ${getScoreTextColour(score)}`}
          data-testid={`score-value-${categoryId}`}
        >
          {score.toFixed(1)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${getScoreColour(score)}`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
    </div>
  );
});

export default function VendorProfilePage() {
  const params = useParams<{ id: string }>();
  const vendorId = params.id || "";
  const { flags } = useFeatureFlags();

  const result = useMemo(() => findVendor(vendorId), [vendorId]);
  const meta = vendorMetadata[vendorId];

  useEffect(() => {
    trackPageView("vendor-profile", { vendorId });
    const cleanupScroll = setupScrollTracking("vendor-profile");
    const cleanupDwell = setupDwellTimeTracking("vendor-profile");
    return () => {
      cleanupScroll();
      cleanupDwell();
    };
  }, [vendorId]);

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-24 sm:pt-28 pb-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h1
              className="text-2xl font-bold text-foreground mb-4"
              data-testid="text-vendor-not-found"
            >
              Platform not found
            </h1>
            <p className="text-muted-foreground mb-8">
              The platform you are looking for does not exist in our directory.
            </p>
            <Link href="/vendors">
              <Button data-testid="link-back-to-directory">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendor Directory
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { platform, toolType, categories } = result;

  const scoreEntries = useMemo(() => {
    return categories
      .filter((cat) => platform.scores[cat.id] !== undefined)
      .map((cat) => ({
        categoryId: cat.id,
        label: cat.name,
        score: platform.scores[cat.id],
      }))
      .sort((a, b) => b.score - a.score);
  }, [platform, categories]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${platform.name} Profile | Constancia - Independent ${TOOL_TYPE_LABELS[toolType]} Review`}
        description={`Independent review of ${platform.name}: ${platform.bestFor}. Objective capability scores, strengths, limitations and pricing analysis.`}
        keywords={[
          platform.name,
          `${platform.name} review`,
          `${TOOL_TYPE_LABELS[toolType]} comparison`,
          "independent platform review",
          "vendor-agnostic analysis",
        ]}
        canonicalUrl={`https://constancia.io/vendors/${platform.id}`}
      />

      <Navigation />

      <main className="pt-20 sm:pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <Link href="/vendors">
              <span
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid="link-back-to-directory"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Vendor Directory
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <Card>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4 mb-5">
                      <VendorLogo
                        platform={platform}
                        logoDomain={meta?.logoDomain}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h1
                          className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5"
                          data-testid="text-vendor-name"
                        >
                          {platform.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge
                            variant="outline"
                            data-testid="badge-vendor-position"
                          >
                            <Star className="mr-1 h-3 w-3" />
                            {platform.marketPosition}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-brand-navy/10 text-[#02205B] dark:text-brand-cyan border-[#02205B]/20 dark:border-[#12EBFC]/20"
                            data-testid="badge-vendor-type"
                          >
                            {TOOL_TYPE_LABELS[toolType]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span
                            className="flex items-center gap-1"
                            data-testid="text-vendor-price"
                          >
                            <Tag className="h-3.5 w-3.5" />
                            {platform.priceRange}
                          </span>
                          <span
                            className="flex items-center gap-1"
                            data-testid="text-vendor-impl-time"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {platform.implementationTime}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${ROI_COLORS[platform.roiPotential]}`}
                            data-testid="text-vendor-roi"
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                            {platform.roiPotential.charAt(0).toUpperCase() +
                              platform.roiPotential.slice(1)}{" "}
                            ROI
                          </span>
                        </div>
                      </div>
                      {meta?.website && (
                        <a
                          href={meta.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-vendor-website"
                        >
                          <Button variant="outline" size="sm">
                            Visit Website
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overview + Best For */}
              <Card>
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="flex-shrink-0 p-1.5 rounded-md bg-[#0884AA]/10 dark:bg-[#12EBFC]/10">
                        <BookOpen className="h-4 w-4 text-brand-teal dark:text-brand-cyan" />
                      </div>
                      <h2
                        className="text-base font-semibold text-foreground"
                        data-testid="heading-description"
                      >
                        Overview
                      </h2>
                    </div>
                    <p
                      className="text-sm text-muted-foreground leading-relaxed"
                      data-testid="text-vendor-description"
                    >
                      {platform.description}
                    </p>
                  </div>

                  <div className="border-t border-border" />

                  <div className="p-6">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="flex-shrink-0 p-1.5 rounded-md bg-[#0884AA]/10 dark:bg-[#12EBFC]/10">
                        <Target className="h-4 w-4 text-brand-teal dark:text-brand-cyan" />
                      </div>
                      <h3
                        className="text-base font-semibold text-foreground"
                        data-testid="heading-best-for"
                      >
                        Best For
                      </h3>
                    </div>
                    <p
                      className="text-sm text-foreground/80 leading-relaxed"
                      data-testid="text-vendor-bestfor"
                    >
                      {platform.bestFor}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Key Features */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex-shrink-0 p-1.5 rounded-md bg-[#0884AA]/10 dark:bg-[#12EBFC]/10">
                      <Sparkles className="h-4 w-4 text-brand-teal dark:text-brand-cyan" />
                    </div>
                    <h2
                      className="text-base font-semibold text-foreground"
                      data-testid="heading-key-features"
                    >
                      Key Features
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {platform.keyFeatures.map((feature, idx) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2.5 rounded-md bg-muted/50 px-3 py-2.5"
                        data-testid={`feature-item-${idx}`}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-[#0884AA] dark:bg-[#12EBFC] flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Capability Scores */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex-shrink-0 p-1.5 rounded-md bg-[#0884AA]/10 dark:bg-[#12EBFC]/10">
                      <BarChart3 className="h-4 w-4 text-brand-teal dark:text-brand-cyan" />
                    </div>
                    <h2
                      className="text-base font-semibold text-foreground"
                      data-testid="heading-capability-scores"
                    >
                      Capability Scores
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {scoreEntries.map((entry) => (
                      <ScoreBar
                        key={entry.categoryId}
                        label={entry.label}
                        score={entry.score}
                        categoryId={entry.categoryId}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths + Limitations */}
              <div className="grid sm:grid-cols-2 gap-6">
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="flex-shrink-0 p-1.5 rounded-md bg-emerald-500/10">
                        <ThumbsUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h2
                        className="text-base font-semibold text-foreground"
                        data-testid="heading-strengths"
                      >
                        Strengths
                      </h2>
                    </div>
                    <ul className="space-y-2">
                      {platform.strengths.map((strength, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 rounded-md bg-emerald-500/5 dark:bg-emerald-400/5 px-3 py-2.5"
                          data-testid={`strength-item-${idx}`}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground/80">
                            {strength}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="flex-shrink-0 p-1.5 rounded-md bg-amber-500/10">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h2
                        className="text-base font-semibold text-foreground"
                        data-testid="heading-limitations"
                      >
                        Limitations
                      </h2>
                    </div>
                    <ul className="space-y-2">
                      {platform.limitations.map((limitation, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 rounded-md bg-amber-500/5 dark:bg-amber-400/5 px-3 py-2.5"
                          data-testid={`limitation-item-${idx}`}
                        >
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground/80">
                            {limitation}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div
                className="p-5 sm:p-8 rounded-xl bg-gradient-to-r from-[#02205B] via-[#0070C0] to-[#0884AA] text-center"
              >
                <h2
                  className="text-xl sm:text-2xl font-bold text-white mb-3"
                  data-testid="heading-cta"
                >
                  Want to compare {platform.shortName} against alternatives?
                </h2>
                <p className="text-white/80 max-w-2xl mx-auto mb-6">
                  Use our interactive comparison tool for a side-by-side evaluation, or speak to our independent advisory team for personalised guidance.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {flags.comparisonTools && (
                    <Link href="/tools/epm-comparison">
                      <Button
                        size="lg"
                        className="bg-[#12EBFC] text-[#02205B] font-semibold"
                        data-testid="button-cta-compare"
                      >
                        Compare Platforms
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {flags.contact && (
                    <Link href="/contact">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white/30 text-white backdrop-blur-sm bg-white/5"
                        data-testid="button-cta-contact"
                      >
                        Speak to an Adviser
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div>
                  <Card>
                    <CardContent className="p-5 sm:p-6">
                      <h3
                        className="text-base font-semibold text-foreground mb-4"
                        data-testid="heading-quick-facts"
                      >
                        Quick Facts
                      </h3>
                      <dl className="space-y-4">
                        <div data-testid="fact-implementation-time">
                          <dt className="text-xs text-muted-foreground mb-0.5">
                            Implementation Time
                          </dt>
                          <dd className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {platform.implementationTime}
                          </dd>
                        </div>
                        <div data-testid="fact-price-range">
                          <dt className="text-xs text-muted-foreground mb-0.5">
                            Price Range
                          </dt>
                          <dd className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            {platform.priceRange}
                          </dd>
                        </div>
                        <div data-testid="fact-roi-potential">
                          <dt className="text-xs text-muted-foreground mb-0.5">
                            ROI Potential
                          </dt>
                          <dd className="text-sm font-medium">
                            <Badge
                              variant="outline"
                              className={`${ROI_BG[platform.roiPotential]} ${ROI_COLORS[platform.roiPotential]} border-0`}
                              data-testid="badge-roi-potential"
                            >
                              <TrendingUp className="mr-1 h-3 w-3" />
                              {platform.roiPotential.charAt(0).toUpperCase() +
                                platform.roiPotential.slice(1)}
                            </Badge>
                          </dd>
                        </div>
                        <div data-testid="fact-price-tier">
                          <dt className="text-xs text-muted-foreground mb-0.5">
                            Price Tier
                          </dt>
                          <dd className="text-sm font-medium text-foreground flex items-center gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span
                                key={i}
                                className={`w-2.5 h-2.5 rounded-full ${
                                  i < platform.priceTier
                                    ? "bg-[#0884AA] dark:bg-[#12EBFC]"
                                    : "bg-muted"
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({platform.priceTier}/5)
                            </span>
                          </dd>
                        </div>
                        <div data-testid="fact-market-position">
                          <dt className="text-xs text-muted-foreground mb-0.5">
                            Market Position
                          </dt>
                          <dd className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {platform.marketPosition}
                          </dd>
                        </div>
                        <div data-testid="fact-category">
                          <dt className="text-xs text-muted-foreground mb-0.5">
                            Category
                          </dt>
                          <dd className="text-sm font-medium text-foreground">
                            {TOOL_TYPE_LABELS[toolType]}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                {meta?.website && (
                  <div>
                    <a
                      href={meta.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-sidebar-website"
                    >
                      <Button variant="outline" className="w-full">
                        Visit {platform.shortName} Website
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
