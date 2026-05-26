/**
 * Vendor Profile — editorial deep-dive on a single platform.
 *
 * Brand-styled (cream canvas, glass tablets, brand typography) so it
 * reads as part of the Constancia site rather than a generic
 * comparison table. Each section is a glass-surface card; layout
 * is editorial, not data-dense.
 */

import { useState, memo } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Check, AlertCircle, Star } from "lucide-react";
import { Link, useParams } from "wouter";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { epmPlatforms } from "@/data/comparison-platforms/epm-platforms";
import { erpPlatforms } from "@/data/comparison-platforms/erp-platforms";
import { aiPlatforms } from "@/data/comparison-platforms/ai-platforms";
import { vendorMetadata } from "@/data/comparison-platforms/vendor-metadata";
import type { Platform } from "@/data/comparison-platforms/types";

const ALL_PLATFORMS: Array<Platform & { _category: "EPM / CPM" | "ERP" | "AI for Finance" }> = [
  ...epmPlatforms.map((p) => ({ ...p, _category: "EPM / CPM" as const })),
  ...erpPlatforms.map((p) => ({ ...p, _category: "ERP" as const })),
  ...aiPlatforms.map((p) => ({ ...p, _category: "AI for Finance" as const })),
];

const SCORE_LABELS: Record<string, string> = {
  consolidationClose: "Consolidation & close",
  planningForecasting: "Planning & forecasting",
  aiAutomation: "AI & automation",
  modellingExtensibility: "Modelling & extensibility",
  integrationDataFabric: "Integration & data fabric",
  reportingVisualization: "Reporting & visualisation",
  governanceCompliance: "Governance & compliance",
  regulatoryCompliance: "Regulatory compliance",
  timeToValue: "Time to value",
  totalCostOwnership: "Total cost of ownership",
  supportEcosystem: "Support & ecosystem",
};

const getLogoUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const VendorLogo = memo(function VendorLogo({ platformId, logo, large }: { platformId: string; logo: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const meta = vendorMetadata[platformId];
  const klass = `vendor-logo ${large ? "vendor-logo--large" : ""}`;
  if (!meta || failed) {
    return <div className={`${klass} vendor-logo--initials`}>{logo.slice(0, 2)}</div>;
  }
  return (
    <div className={klass}>
      <img
        src={meta.logoOverride || getLogoUrl(meta.logoDomain)}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
});

export default function VendorProfilePage() {
  const params = useParams<{ id: string }>();
  const platform = ALL_PLATFORMS.find((p) => p.id === params.id);

  if (!platform) {
    return (
      <div className="marketing-page">
        <SEOHead title="Vendor not found | Constancia" description="" />
        <main className="vendor-profile vendor-profile--missing">
          <div className="glass-surface vendor-profile__missing">
            <div className="page-hero__badge">
              <span className="page-hero__badge-dot" aria-hidden="true" />
              <span>Not found</span>
            </div>
            <h1>We don't have a take on this one yet.</h1>
            <p>The vendor you're looking for isn't in our directory — yet.</p>
            <Link href="/vendors" className="scrolly-tablet__link">
              Back to the directory →
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const meta = vendorMetadata[platform.id];
  const scores = Object.entries(platform.scores).sort((a, b) => b[1] - a[1]);
  const topScore = scores[0];
  const avgScore = scores.reduce((s, [, v]) => s + v, 0) / scores.length;

  const seo = {
    title: `${platform.name} — Constancia's take | ${platform._category}`,
    description: `${platform.bestFor}. Independent practitioner view from Constancia: strengths, watch-outs, pricing tier ${platform.priceTier}/5, time to value ${platform.implementationTime}.`,
    keywords: [
      platform.name,
      platform._category,
      "Constancia vendor review",
      ...platform.strengths.slice(0, 3).map((s) => s.split(" ").slice(0, 3).join(" ")),
    ],
  };

  return (
    <div className="marketing-page">
      <SEOHead {...seo} />

      <main className="vendor-profile">
        {/* Back link */}
        <nav className="vendor-profile__back">
          <Link href="/vendors" className="vendor-profile__back-link" data-testid="link-back">
            <ArrowLeft size={16} /> All vendors
          </Link>
        </nav>

        {/* Hero card */}
        <section className="vendor-profile__hero">
          <div className="glass-surface vendor-profile__hero-card">
            <div className="vendor-profile__hero-head">
              <VendorLogo platformId={platform.id} logo={platform.logo} large />
              <div className="vendor-profile__hero-meta">
                <div className="page-hero__badge">
                  <span className="page-hero__badge-dot" aria-hidden="true" />
                  <span>{platform._category}</span>
                </div>
                <h1 className="vendor-profile__name">{platform.name}</h1>
                <p className="vendor-profile__position">{platform.marketPosition}</p>
              </div>
            </div>

            <div className="vendor-profile__hero-pov">
              <div className="vendor-profile__pov-label">Constancia's take</div>
              <p>{platform.bestFor}</p>
            </div>

            <div className="vendor-profile__hero-stats">
              <div className="vendor-stat">
                <div className="vendor-stat__label">Pricing</div>
                <div className="vendor-stat__value">{platform.priceRange}</div>
                <div className="vendor-stat__sub">Tier {platform.priceTier} of 5</div>
              </div>
              <div className="vendor-stat">
                <div className="vendor-stat__label">Time to value</div>
                <div className="vendor-stat__value">{platform.implementationTime}</div>
              </div>
              <div className="vendor-stat">
                <div className="vendor-stat__label">ROI potential</div>
                <div className={`vendor-stat__value vendor-stat__value--${platform.roiPotential}`}>
                  {platform.roiPotential}
                </div>
              </div>
              <div className="vendor-stat">
                <div className="vendor-stat__label">Top driver</div>
                <div className="vendor-stat__value">
                  {SCORE_LABELS[topScore[0]] ?? topScore[0]}
                </div>
                <div className="vendor-stat__sub">{topScore[1].toFixed(1)} / 10</div>
              </div>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="vendor-profile__section">
          <div className="glass-surface vendor-profile__card">
            <div className="scrolly-tablet__eyebrow">Overview</div>
            <h2 className="vendor-profile__heading">In one paragraph.</h2>
            <p className="vendor-profile__body">{platform.description}</p>
          </div>
        </section>

        {/* Strengths + Limitations side by side */}
        <section className="vendor-profile__section vendor-profile__split">
          <div className="glass-surface vendor-profile__card">
            <div className="scrolly-tablet__eyebrow">Strengths</div>
            <h2 className="vendor-profile__heading">What they do well.</h2>
            <ul className="vendor-list vendor-list--positive">
              {platform.strengths.map((s, i) => (
                <li key={i}>
                  <Check size={16} className="vendor-list__icon" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-surface vendor-profile__card">
            <div className="scrolly-tablet__eyebrow">Watch-outs</div>
            <h2 className="vendor-profile__heading">Where it's not a fit.</h2>
            <ul className="vendor-list vendor-list--caution">
              {platform.limitations.map((s, i) => (
                <li key={i}>
                  <AlertCircle size={16} className="vendor-list__icon" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Scores */}
        <section className="vendor-profile__section">
          <div className="glass-surface vendor-profile__card">
            <div className="scrolly-tablet__eyebrow">Driver scores</div>
            <h2 className="vendor-profile__heading">
              How we'd rate it{" "}
              <em className="scrolly-tablet__heading-accent">out of 10</em>.
            </h2>
            <p className="vendor-profile__body" style={{ marginBottom: 24 }}>
              Average score across drivers: <strong>{avgScore.toFixed(1)} / 10</strong>. Scores
              based on the Constancia evaluation framework — independent, weighted to the
              drivers that move the needle in real programmes.
            </p>
            <div className="vendor-scores">
              {scores.map(([key, value]) => (
                <div key={key} className="vendor-score-row">
                  <div className="vendor-score-row__label">{SCORE_LABELS[key] ?? key}</div>
                  <div className="vendor-score-row__bar">
                    <div
                      className="vendor-score-row__fill"
                      style={{ width: `${value * 10}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="vendor-score-row__value">{value.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key features */}
        {platform.keyFeatures.length > 0 && (
          <section className="vendor-profile__section">
            <div className="glass-surface vendor-profile__card">
              <div className="scrolly-tablet__eyebrow">Capabilities</div>
              <h2 className="vendor-profile__heading">Capabilities worth flagging.</h2>
              <ul className="vendor-features">
                {platform.keyFeatures.map((f, i) => (
                  <li key={i}>
                    <Star size={14} className="vendor-features__icon" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* CTAs */}
        <section className="vendor-profile__section vendor-profile__split">
          {meta && (
            <a
              href={meta.website}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-surface vendor-profile__card vendor-profile__cta-card"
            >
              <div className="scrolly-tablet__eyebrow">Visit</div>
              <div className="vendor-profile__cta-row">
                <h2 className="vendor-profile__heading">
                  See {platform.name}'s site <ExternalLink size={18} />
                </h2>
              </div>
              <p className="vendor-profile__body">Their marketing line, in their own words.</p>
            </a>
          )}
          <Link
            href="/contact"
            className="glass-surface vendor-profile__card vendor-profile__cta-card"
          >
            <div className="scrolly-tablet__eyebrow">Talk to us</div>
            <div className="vendor-profile__cta-row">
              <h2 className="vendor-profile__heading">
                Considering {platform.name}? <ArrowRight size={18} />
              </h2>
            </div>
            <p className="vendor-profile__body">
              We'll tell you straight whether it fits — no kickbacks, no pipeline pressure.
            </p>
          </Link>
        </section>

        <nav className="vendor-profile__back vendor-profile__back--bottom">
          <Link href="/vendors" className="vendor-profile__back-link" data-testid="link-back-bottom">
            <ArrowLeft size={16} /> Back to all vendors
          </Link>
        </nav>
      </main>

      <Footer />
    </div>
  );
}
