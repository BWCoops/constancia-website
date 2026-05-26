/**
 * Vendor Directory — Constancia POV index.
 *
 * Differentiated from cfoshortlist.com/vendors on three axes:
 *   1. Editorial voice — every entry leads with our take, not the
 *      vendor's marketing line.
 *   2. Side-by-side comparison — select up to 3 vendors, see them
 *      compared inline on the brand drivers that move the needle.
 *   3. Visual — same cream + glass + brand typography as the rest
 *      of the site. Functional structure preserved.
 *
 * Filter / search / segmentation logic preserved from the previous
 * version (inferSegment + buildVendorEntries data utilities).
 */

import { useState, useMemo, memo } from "react";
import { ArrowRight, Search, X, Plus, Check } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
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

// ─── Data ─────────────────────────────────────────────────────────────

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
  const marketPosLower = platform.marketPosition.toLowerCase();
  if (marketPosLower.includes("mid-market") || marketPosLower.includes("midmarket")) return "midmarket";
  if (marketPosLower.includes("enterprise") || (marketPosLower.includes("leader") && !marketPosLower.includes("mid"))) return "enterprise";
  if (priceTier <= 1) return "sme";
  if (priceTier >= 4) return "enterprise";
  const hasSmeSignal =
    bestForLower.includes("smb") || bestForLower.includes("sme") ||
    bestForLower.includes("small business") || bestForLower.includes("startup") ||
    descLower.includes("smb") || descLower.includes("small business");
  if (hasSmeSignal) return "sme";
  if (
    bestForLower.includes("large enterprise") || bestForLower.includes("large global") ||
    bestForLower.includes("complex consolidation") || bestForLower.includes("regulated")
  ) return "enterprise";
  return "midmarket";
}

const VENDORS: VendorEntry[] = [
  ...epmPlatforms.map((p): VendorEntry => ({ platform: p, toolType: "epm", segment: inferSegment(p, "epm") })),
  ...erpPlatforms.map((p): VendorEntry => ({ platform: p, toolType: "erp", segment: inferSegment(p, "erp") })),
  ...aiPlatforms.map((p): VendorEntry => ({ platform: p, toolType: "ai", segment: inferSegment(p, "ai") })),
];

// ─── Config ───────────────────────────────────────────────────────────

const SEO = {
  title: "Vendor Directory — Our take on every platform we evaluate | Constancia",
  description:
    "Constancia practitioner POV on every EPM, ERP and AI-for-finance platform we evaluate. Independent, scored against the drivers that move the needle. Compare up to 3 side by side.",
  keywords: [
    "EPM vendor comparison",
    "ERP vendor directory",
    "AI for finance platforms",
    "OneStream vs Anaplan",
    "Abacum review",
    "Constancia vendor directory",
  ],
};

const TOOL_LABELS: Record<ToolType, string> = { epm: "EPM / CPM", erp: "ERP", ai: "AI for Finance" };
const SEGMENT_LABELS: Record<Segment, string> = {
  all: "All sizes",
  sme: "SME",
  midmarket: "Mid-market",
  enterprise: "Enterprise",
};

// ─── Vendor logo ──────────────────────────────────────────────────────

const getLogoUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const VendorLogo = memo(function VendorLogo({ platformId, logo }: { platformId: string; logo: string }) {
  const [failed, setFailed] = useState(false);
  const meta = vendorMetadata[platformId];
  if (!meta || failed) {
    return <div className="vendor-logo vendor-logo--initials">{logo.slice(0, 2)}</div>;
  }
  const src = meta.logoOverride || getLogoUrl(meta.logoDomain);
  return (
    <div className="vendor-logo">
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
});

// ─── Vendor card ──────────────────────────────────────────────────────

interface VendorCardProps {
  entry: VendorEntry;
  selected: boolean;
  canSelect: boolean;
  onToggle: () => void;
}

const VendorCard = memo(function VendorCard({ entry, selected, canSelect, onToggle }: VendorCardProps) {
  const { platform, toolType, segment } = entry;
  return (
    <article className={`glass-surface vendor-card ${selected ? "is-selected" : ""}`}>
      <header className="vendor-card__head">
        <VendorLogo platformId={platform.id} logo={platform.logo} />
        <div className="vendor-card__head-text">
          <h3 className="vendor-card__name">{platform.name}</h3>
          <div className="vendor-card__tags">
            <span className="vendor-card__tag vendor-card__tag--type">{TOOL_LABELS[toolType]}</span>
            {segment !== "all" && <span className="vendor-card__tag">{SEGMENT_LABELS[segment]}</span>}
          </div>
        </div>
      </header>

      <div className="vendor-card__pov">
        <div className="vendor-card__pov-label">Our take</div>
        <p>{platform.bestFor}</p>
      </div>

      {platform.strengths.length > 0 && (
        <ul className="vendor-card__strengths">
          {platform.strengths.slice(0, 3).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}

      <footer className="vendor-card__foot">
        <span className="vendor-card__price">{platform.priceRange}</span>
        <div className="vendor-card__actions">
          <button
            type="button"
            className={`vendor-card__compare ${selected ? "is-selected" : ""}`}
            disabled={!canSelect && !selected}
            onClick={onToggle}
            aria-pressed={selected}
            data-testid={`btn-compare-${platform.id}`}
          >
            {selected ? <><Check size={14} /> Selected</> : <><Plus size={14} /> Compare</>}
          </button>
          <Link
            href={`/vendors/${platform.id}`}
            className="vendor-card__link"
            data-testid={`link-vendor-${platform.id}`}
          >
            Our take <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </article>
  );
});

// ─── Comparison view ──────────────────────────────────────────────────

interface ComparisonViewProps {
  vendors: VendorEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

function ComparisonView({ vendors, onRemove, onClear }: ComparisonViewProps) {
  const rows: Array<{ label: string; get: (p: Platform) => React.ReactNode }> = [
    { label: "Our take", get: (p) => p.bestFor },
    { label: "Market position", get: (p) => p.marketPosition },
    { label: "Pricing", get: (p) => `${p.priceRange} (Tier ${p.priceTier}/5)` },
    { label: "Time to value", get: (p) => p.implementationTime },
    { label: "ROI potential", get: (p) => <span className={`vendor-compare__roi vendor-compare__roi--${p.roiPotential}`}>{p.roiPotential}</span> },
    {
      label: "Top strengths",
      get: (p) => (
        <ul className="vendor-compare__list">
          {p.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      ),
    },
    {
      label: "Watch-outs",
      get: (p) => (
        <ul className="vendor-compare__list">
          {p.limitations.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      ),
    },
  ];

  return (
    <section className="vendor-compare" aria-label="Vendor comparison">
      <div className="glass-surface vendor-compare__inner">
        <header className="vendor-compare__head">
          <div>
            <div className="page-hero__badge">
              <span className="page-hero__badge-dot" aria-hidden="true" />
              <span>Side by side</span>
            </div>
            <h2 className="vendor-compare__heading">
              {vendors.length} platforms,{" "}
              <em className="scrolly-tablet__heading-accent">our drivers</em>.
            </h2>
          </div>
          <button type="button" className="vendor-compare__clear" onClick={onClear}>
            Clear comparison
          </button>
        </header>

        <div
          className="vendor-compare__grid"
          style={{ ["--cols" as never]: vendors.length }}
        >
          {/* Column headers */}
          <div className="vendor-compare__row vendor-compare__row--head">
            <div className="vendor-compare__rowlabel" />
            {vendors.map(({ platform }) => (
              <div key={platform.id} className="vendor-compare__col-head">
                <VendorLogo platformId={platform.id} logo={platform.logo} />
                <div>
                  <h3>{platform.name}</h3>
                  <p>{platform.marketPosition}</p>
                </div>
                <button
                  type="button"
                  className="vendor-compare__remove"
                  aria-label={`Remove ${platform.name} from comparison`}
                  onClick={() => onRemove(platform.id)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {rows.map((row) => (
            <div key={row.label} className="vendor-compare__row">
              <div className="vendor-compare__rowlabel">{row.label}</div>
              {vendors.map(({ platform }) => (
                <div key={platform.id} className="vendor-compare__cell">
                  {row.get(platform)}
                </div>
              ))}
            </div>
          ))}
        </div>

        <footer className="vendor-compare__foot">
          {vendors.map(({ platform }) => (
            <Link
              key={platform.id}
              href={`/vendors/${platform.id}`}
              className="scrolly-tablet__link"
            >
              Full take on {platform.name} →
            </Link>
          ))}
        </footer>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function VendorDirectoryPage() {
  const [toolType, setToolType] = useState<ToolType>("epm");
  const [segment, setSegment] = useState<Segment>("all");
  const [search, setSearch] = useState("");
  const [comparison, setComparison] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let list = VENDORS.filter((v) => v.toolType === toolType);
    if (segment !== "all") list = list.filter((v) => v.segment === segment);
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (v) =>
          v.platform.name.toLowerCase().includes(s) ||
          v.platform.bestFor.toLowerCase().includes(s) ||
          v.platform.description.toLowerCase().includes(s)
      );
    }
    return list;
  }, [toolType, segment, search]);

  const toggleCompare = (id: string) => {
    setComparison((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const selectedVendors = useMemo(
    () => comparison
      .map((id) => VENDORS.find((v) => v.platform.id === id))
      .filter((v): v is VendorEntry => !!v),
    [comparison]
  );

  return (
    <div className="marketing-page">
      <SEOHead {...SEO} />

      <main className="vendor-directory">
        <header className="vendor-directory__hero">
          <div className="vendor-directory__hero-inner">
            <div className="page-hero__badge">
              <span className="page-hero__badge-dot" aria-hidden="true" />
              <span>Vendor Directory</span>
            </div>
            <h1 className="vendor-directory__title">
              Our take on every platform{" "}
              <em className="scrolly-tablet__heading-accent">we evaluate</em>.
            </h1>
            <p className="vendor-directory__subtitle">
              Curated by Constancia practitioners. Each entry leads with our point of view —
              when it fits, where it doesn't, and how we'd score it across the drivers that
              actually move the needle. Compare up to three side by side.
            </p>
          </div>
        </header>

        <section className="vendor-directory__filters">
          <div className="glass-surface vendor-directory__filters-inner">
            <div className="vendor-filter-row" role="tablist" aria-label="Category">
              {(["epm", "erp", "ai"] as ToolType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={toolType === t}
                  className={`vendor-pill ${toolType === t ? "is-active" : ""}`}
                  onClick={() => setToolType(t)}
                  data-testid={`tab-${t}`}
                >
                  {TOOL_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="vendor-filter-row" role="tablist" aria-label="Segment">
              {(["all", "sme", "midmarket", "enterprise"] as Segment[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={segment === s}
                  className={`vendor-pill vendor-pill--small ${segment === s ? "is-active" : ""}`}
                  onClick={() => setSegment(s)}
                  data-testid={`seg-${s}`}
                >
                  {SEGMENT_LABELS[s]}
                </button>
              ))}
            </div>

            <label className="vendor-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder="Search by name or use case…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-vendor-search"
              />
              {search && (
                <button
                  type="button"
                  className="vendor-search__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </section>

        <section className="vendor-directory__count" aria-live="polite">
          <span>
            {filtered.length} {filtered.length === 1 ? "platform" : "platforms"} in{" "}
            <strong>{TOOL_LABELS[toolType]}</strong>
            {segment !== "all" && <> · {SEGMENT_LABELS[segment]}</>}
          </span>
        </section>

        {selectedVendors.length >= 2 && (
          <ComparisonView
            vendors={selectedVendors}
            onRemove={toggleCompare}
            onClear={() => setComparison([])}
          />
        )}

        <section className="vendor-directory__grid">
          {filtered.length === 0 ? (
            <div className="vendor-directory__empty">
              <p>No platforms match your filter.</p>
              <button
                type="button"
                className="scrolly-tablet__link"
                onClick={() => { setSearch(""); setSegment("all"); }}
              >
                Reset filters →
              </button>
            </div>
          ) : (
            filtered.map((entry) => (
              <VendorCard
                key={entry.platform.id}
                entry={entry}
                selected={comparison.includes(entry.platform.id)}
                canSelect={comparison.length < 3 || comparison.includes(entry.platform.id)}
                onToggle={() => toggleCompare(entry.platform.id)}
              />
            ))
          )}
        </section>
      </main>

      {/* Floating compare tray */}
      {comparison.length > 0 && (
        <div
          className={`vendor-compare-tray ${selectedVendors.length >= 2 ? "is-active" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>{comparison.length} selected · max 3</span>
          {selectedVendors.length < 2 ? (
            <span className="vendor-compare-tray__hint">Add one more to compare</span>
          ) : (
            <a href="#vendor-compare" className="vendor-compare-tray__cta">
              Comparing now ↑
            </a>
          )}
          <button
            type="button"
            className="vendor-compare-tray__clear"
            onClick={() => setComparison([])}
          >
            Clear
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
