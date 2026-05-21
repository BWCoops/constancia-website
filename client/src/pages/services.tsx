import { Compass, Brain, Sparkles, FileCheck, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


const services = [
  {
    icon: Compass,
    title: "Platform Selection",
    description: "The right platform before you're locked into the wrong one.",
    details: [
      "Business and data landscape assessment",
      "Vendor shortlisting and evaluation",
      "Demonstration facilitation",
      "Reference client engagement",
      "Commercial negotiation support",
      "Business case development",
    ],
    outcome: "A clear, evidenced recommendation. Matched to your need, not our pipeline.",
  },
  {
    icon: Brain,
    title: "EPM Implementation",
    description: "Delivered by the people who scoped it.",
    details: [
      "Programme design and configuration",
      "Data migration and integration",
      "User acceptance testing",
      "Go-live support and hypercare",
      "Post-implementation optimisation",
      "Senior practitioners on every workstream",
    ],
    outcome: "A go-live that delivers what was promised, on the budget you signed off.",
  },
  {
    icon: Sparkles,
    title: "AI for Finance",
    description: "Practical AI. Not AI theatre.",
    details: [
      "AI readiness assessment",
      "Use case identification and prioritisation",
      "Build and integration support",
      "Change management for AI adoption",
      "Measurable outcome definition",
      "Embedded from day one, not retrofitted",
    ],
    outcome: "Live AI use cases that are measurable, adopted, and actually used by your finance team.",
  },
  {
    icon: FileCheck,
    title: "Finance Transformation",
    description: "The technology is only part of it.",
    details: [
      "Operating model redesign",
      "Process improvement and standardisation",
      "Capability assessment and development",
      "Change management",
      "Technology and people alignment",
      "Board-ready reporting design",
    ],
    outcome: "A finance function that works better. Not just one with a new tool installed.",
  },
  {
    icon: BookOpen,
    title: "Training and Enablement",
    description: "So your team can run it without us.",
    details: [
      "Platform training design and delivery",
      "Admin handover and documentation",
      "Self-sufficiency planning",
      "Ongoing support and upskilling",
      "Written by the people who built it",
      "Tailored to your team's capability level",
    ],
    outcome: "A finance team that owns its platform.",
  },
];

export default function ServicesPage() {
  const { flags } = useFeatureFlags();
  
  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="EPM Services — Abacum + OneStream Implementation, AI-First Delivery | Constancia"
        description="Senior EPM implementation, platform selection, AI for finance, and finance transformation services. Fixed fee. Scoped upfront. Delivered by practitioners, not graduates."
        keywords={["EPM implementation", "platform selection advisory", "OneStream consulting", "Abacum implementation", "FP&A tools", "finance transformation advisory"]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Connected Finance Intelligence",
        "provider": { "@type": "Organization", "name": "Constancia", "url": "https://constancia.com" },
        "areaServed": ["GB", "IE", "ZA", "AE"],
        "description": "Connected finance intelligence: bringing ERP, EPM, HRIS, CRM, and data warehouse together so finance leaders get one source of truth. Platform selection, implementation, AI readiness, and ongoing intelligence delivery."
      }) }} />
      
      <Navigation />

      <main className="pt-16 sm:pt-20">
        <PageHero
          badge="Our Services"
          title="Senior EPM Delivery, Priced Upfront, with No Vendor Agenda."
          description="We help finance leaders, from high-growth mid-market businesses to global enterprises, select, implement, and get real value from their EPM platforms."
        />

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="space-y-12">
              {services.map((service, index) => (
                <div
                  key={service.title}
                  data-testid={`service-detail-${index}`}
                >
                  <Card className="overflow-hidden">
                    <div className="grid lg:grid-cols-5 gap-0">
                      <CardHeader className="lg:col-span-2 bg-gradient-to-br from-brand-navy to-brand-teal text-white p-4 sm:p-8">
                        <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                          <service.icon className="w-8 h-8 text-brand-cyan" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl md:text-3xl text-white mb-4">
                          {service.title}
                        </CardTitle>
                        <CardDescription className="text-white/80 text-base">
                          {service.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="lg:col-span-3 p-4 sm:p-8">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-[#8E4F67] mb-4">
                          What you walk out with
                        </div>
                        {/* Numbered detail list — replaces the stock
                            check-mark grid. The number itself does
                            the visual work; no decorative icons. */}
                        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-6">
                          {service.details.map((detail, idx) => (
                            <li key={detail} className="flex items-start gap-3 text-sm text-[#1E2630]">
                              <span className="font-mono text-[11px] text-[#8E4F67]/70 mt-0.5 tabular-nums">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ol>
                        {/* Outcome callout — graphite text on a soft
                            mint band so it visually pops without
                            another generic "info box" border. */}
                        <div className="border-l-2 border-[#7FB8A3] pl-4 py-2 bg-[#7FB8A3]/8">
                          <div className="font-mono text-[10px] uppercase tracking-widest text-[#5E8D7A] mb-1">
                            Outcome
                          </div>
                          <p className="text-[#12161D] text-sm leading-relaxed">
                            {service.outcome}
                          </p>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing band — replaces the standard centred-CTA card
            with an asymmetric two-column layout. Left side states
            the offer in plain language; right side shows the three
            ways to actually start. Far less "AI-templated" than the
            rounded card + headline + button pattern. */}
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
                  We don't put new prospects through a sales funnel. You start where it's most useful, and we work back from there.
                </p>
              </div>
              <div className="space-y-px">
                <Link href="/finance-compass" className="group flex items-center justify-between gap-4 py-5 border-t border-[#F6F3EE]/15 hover:border-[#7FB8A3]/60 transition-colors">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest text-[#7FB8A3] mb-1">01 — Diagnose</div>
                    <div className="text-lg font-medium">Run FinanceCompass</div>
                    <div className="text-sm text-[#F6F3EE]/55">12 minutes. Free. No call required.</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#F6F3EE]/40 group-hover:text-[#7FB8A3] group-hover:translate-x-1 transition" />
                </Link>
                <Link href="/tools/epm-comparison" className="group flex items-center justify-between gap-4 py-5 border-t border-[#F6F3EE]/15 hover:border-[#7FB8A3]/60 transition-colors">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest text-[#7FB8A3] mb-1">02 — Compare</div>
                    <div className="text-lg font-medium">Map your platform options</div>
                    <div className="text-sm text-[#F6F3EE]/55">Side-by-side, scored against your profile.</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#F6F3EE]/40 group-hover:text-[#7FB8A3] group-hover:translate-x-1 transition" />
                </Link>
                {flags.contact && (
                  <Link href="/contact" className="group flex items-center justify-between gap-4 py-5 border-t border-b border-[#F6F3EE]/15 hover:border-[#7FB8A3]/60 transition-colors" data-testid="button-services-cta">
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
