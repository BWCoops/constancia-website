import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { ConnectivityShowcase } from "@/components/ConnectivityShowcase";

/**
 * Services page — May 2026 partner-led restructure.
 *
 * Three sections: Abacum (mid-market FP&A), OneStream (enterprise
 * EPM integration), AI Development Partner (custom build). The
 * connectivity showcase that used to live on the home hero now
 * anchors the AI Development Partner section.
 *
 * Glass-morphism on this page is restricted to the partner-logo
 * chips (one shared GlassSurface primitive). Body copy sits outside
 * cards.
 */

interface PartnerDeliverable {
  text: string;
}

interface PartnerSection {
  id: string;
  eyebrow: string;
  partner: string;
  heading: string;
  sub: string;
  deliverables: PartnerDeliverable[];
}

const ABACUM: PartnerSection = {
  id: "abacum",
  eyebrow: "Mid-market FP&A",
  partner: "Abacum",
  heading: "FP&A that finally keeps up with the business.",
  sub: "Official Abacum partner. AI-augmented planning that connects to your ERP, HRIS and CRM without months of consultancy overhead.",
  deliverables: [
    { text: "Implementation, end to end." },
    { text: "Data model design and integration." },
    { text: "Driver-based planning configuration." },
    { text: "Workforce planning and headcount modelling." },
    { text: "Reporting and management pack design." },
    { text: "Team enablement and admin handover." },
  ],
};

const ONESTREAM: PartnerSection = {
  id: "onestream",
  eyebrow: "Enterprise EPM",
  partner: "OneStream",
  heading: "OneStream, integrated and adopted.",
  sub: "Official OneStream partner. We deliver consolidation, planning, narrative reporting and account reconciliations on a single, governed platform — built by the senior people who scoped it.",
  deliverables: [
    { text: "Financial close and consolidation." },
    { text: "Statutory and management reporting." },
    { text: "Driver-based planning and forecasting." },
    { text: "Account reconciliations and certifications." },
    { text: "Narrative reporting and disclosure management." },
    { text: "Hypercare, optimisation, and capability handover." },
  ],
};

const AI_DEV: PartnerSection = {
  id: "ai-development-partner",
  eyebrow: "AI Development Partner",
  partner: "Constancia AI Engineering",
  heading: "When the off-the-shelf tool doesn't fit, we build the one that does.",
  sub: "Edge-case AI use cases, custom model build, and applications that sit on top of your existing systems. Connected to your data, owned by your team.",
  deliverables: [
    { text: "Use case scoping and ROI modelling." },
    { text: "Custom model build and fine-tuning." },
    { text: "Retrieval and grounding architecture." },
    { text: "Application development on your stack." },
    { text: "Integration with ERP, EPM, CRM, warehouse." },
    { text: "Production deployment and monitoring." },
  ],
};

function PartnerBlock({ section, dark = false }: { section: PartnerSection; dark?: boolean }) {
  return (
    <section
      id={section.id}
      className={`partner-section ${dark ? "partner-section--dark" : ""}`}
      aria-labelledby={`${section.id}-heading`}
    >
      <div className="partner-section__inner">
        <div className="partner-section__layout">
          <div>
            <div className="partner-section__eyebrow">{section.eyebrow}</div>
            <h2 id={`${section.id}-heading`} className="partner-section__heading">
              {section.heading}
            </h2>
            <p className="partner-section__sub">{section.sub}</p>
            <GlassSurface className="partner-section__partner-card">
              {section.partner}
            </GlassSurface>
          </div>

          <div>
            <div className="partner-section__chip">What we deliver</div>
            <div className="partner-section__deliverables">
              {section.deliverables.map((d, i) => (
                <div key={d.text} className="partner-section__deliverable">
                  <span className="partner-section__deliverable-num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{d.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ServicesPage() {
  const { flags } = useFeatureFlags();

  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="Services — Abacum, OneStream, AI Development Partner | Constancia"
        description="Constancia is an enterprise intelligence company. Official Abacum partner for mid-market FP&A, OneStream partner for enterprise EPM, and an AI development partner for custom build."
        keywords={[
          "Abacum partner",
          "OneStream partner",
          "AI development partner",
          "Enterprise Performance Management",
          "FP&A implementation",
          "custom AI development",
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Enterprise Intelligence",
            provider: { "@type": "Organization", name: "Constancia", url: "https://constancia.com" },
            areaServed: ["GB", "IE", "ZA", "AE"],
            description:
              "Abacum (mid-market FP&A), OneStream (enterprise EPM) implementation, and AI development partner services. Connecting ERP, EPM, HRIS, CRM and data warehouse into one source of truth.",
          }),
        }}
      />


      <main className="pt-16 sm:pt-20">
        <PageHero
          badge="Services"
          title="Three ways we deliver enterprise intelligence."
          description="A senior team, two declared platform partners, and a development practice for everything in between."
        />

        <PartnerBlock section={ABACUM} />
        <PartnerBlock section={ONESTREAM} dark />
        <PartnerBlock section={AI_DEV} />

        {/* Connectivity showcase — anchored to AI Development Partner. */}
        <section className="partner-section" style={{ paddingTop: 0 }}>
          <div className="partner-section__inner">
            <div className="partner-section__eyebrow" style={{ marginBottom: 24 }}>
              Live integration view
            </div>
            <ConnectivityShowcase />
            <p className="partner-section__sub" style={{ marginTop: 24, maxWidth: 760 }}>
              Every system you already own — ERP, CRM, HRIS, procurement, data warehouse, spreadsheets — feeding one source of truth. Connected once, owned forever.
            </p>
          </div>
        </section>

        {/* Closing band — three ways to start. */}
        <section className="py-12 sm:py-20 lg:py-28 bg-[#12161D] text-[#F6F3EE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-16 items-start">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#7FB8A3] mb-6">
                  Three ways to start
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight mb-6">
                  No pitch. No deck.<br />
                  Just a real <em className="text-[#C77A93] not-italic font-normal">conversation.</em>
                </h2>
                <p className="text-[#F6F3EE]/70 leading-relaxed max-w-md">
                  We start where it's most useful, and work back from there.
                </p>
              </div>
              <div className="space-y-px">
                <Link
                  href="/finance-compass"
                  className="group flex items-center justify-between gap-4 py-5 border-t border-[#F6F3EE]/15 hover:border-[#7FB8A3]/60 transition-colors"
                >
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest text-[#7FB8A3] mb-1">01 — Diagnose</div>
                    <div className="text-lg font-medium">Run FinanceCompass</div>
                    <div className="text-sm text-[#F6F3EE]/55">12 minutes. Free. No call required.</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#F6F3EE]/40 group-hover:text-[#7FB8A3] group-hover:translate-x-1 transition" />
                </Link>
                <Link
                  href="/tools/epm-comparison"
                  className="group flex items-center justify-between gap-4 py-5 border-t border-[#F6F3EE]/15 hover:border-[#7FB8A3]/60 transition-colors"
                >
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest text-[#7FB8A3] mb-1">02 — Compare</div>
                    <div className="text-lg font-medium">Map your platform options</div>
                    <div className="text-sm text-[#F6F3EE]/55">Side-by-side, scored against your profile.</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#F6F3EE]/40 group-hover:text-[#7FB8A3] group-hover:translate-x-1 transition" />
                </Link>
                {flags.contact && (
                  <Link
                    href="/contact"
                    className="group flex items-center justify-between gap-4 py-5 border-t border-b border-[#F6F3EE]/15 hover:border-[#7FB8A3]/60 transition-colors"
                    data-testid="button-services-cta"
                  >
                    <div>
                      <div className="text-xs font-mono uppercase tracking-widest text-[#7FB8A3] mb-1">03 — Talk</div>
                      <div className="text-lg font-medium">Book a 30-min call</div>
                      <div className="text-sm text-[#F6F3EE]/55">The senior person you'd actually work with.</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#F6F3EE]/40 group-hover:text-[#7FB8A3] group-hover:translate-x-1 transition" />
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
