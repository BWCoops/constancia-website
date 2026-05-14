import { Compass, Brain, Sparkles, FileCheck, BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
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
        title="EPM Implementation & Platform Selection | 1QG Services"
        description="Senior EPM implementation, platform selection, AI for finance, and finance transformation services. Fixed fee. Scoped upfront. Delivered by practitioners, not graduates."
        keywords={["EPM implementation", "platform selection advisory", "OneStream consulting", "Abacum implementation", "FP&A tools", "finance transformation advisory"]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Enterprise Performance Management Advisory",
        "provider": { "@type": "Organization", "name": "1QG", "url": "https://1qg.com" },
        "areaServed": ["GB", "IE", "ZA", "AE"],
        "description": "Senior EPM advisory, platform selection, implementation, AI readiness, and finance transformation services. Fixed fee, no vendor agenda."
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
                        <h4 className="text-lg font-semibold text-foreground mb-4">
                          What We Deliver
                        </h4>
                        <ul className="grid sm:grid-cols-2 gap-3 mb-6">
                          {service.details.map((detail) => (
                            <li key={detail} className="flex items-start gap-2">
                              <CheckCircle2 className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground text-sm">{detail}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="info-box p-4 rounded-md">
                          <p className="text-foreground text-sm">
                            <strong>Outcome:</strong> {service.outcome}
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

        <section className="py-8 sm:py-16 lg:py-24 lg:pb-40 bg-hp-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Card className="p-4 sm:p-8 lg:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Talk About Your Programme?
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
                Whether you're evaluating platforms, planning an implementation, or looking to improve what you already have, we're happy to have a straight conversation about whether we can help.
              </p>
              {flags.contact && (
                <Button
                  variant="brand"
                  data-testid="button-services-cta"
                  asChild
                >
                  <Link href="/contact">
                    Discuss Your Requirements
                  </Link>
                </Button>
              )}
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
