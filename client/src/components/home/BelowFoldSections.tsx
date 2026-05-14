import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { ArrowRight, Compass, Settings, Brain, FileCheck, Briefcase, BarChart3, TrendingUp, CheckCircle2, Target, Users, Zap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ProofBar, GlassCard } from "@/components/ui/constancia";
import type { ProofBarItem } from "@/components/ui/constancia";
import { useFeatureFlags } from "@/lib/feature-flags";

// 3D section accent — single floating sphere between sections
const SectionAccent3D = lazy(() =>
  import("@/components/3d/SectionAccent3D").then((m) => ({ default: m.SectionAccent3D })),
);

const proofBarItems: ProofBarItem[] = [
  { stat: 'AI',        label: 'Delivery, augmented',     body: 'Our tools standardise process, output, and outcome across every engagement. Faster delivery, lower cost, no loss of quality.' },
  { stat: '100%',      label: 'Senior, always',          body: 'The practitioner who scopes the work is the one who delivers it. No bait and switch.' },
  { stat: 'Fixed',     label: 'Fee agreed upfront',      body: "You know what you're paying before we start. Scope locked, price locked, no surprises." },
  { stat: 'Right fit', label: 'Platform matched to you', body: "We recommend the platform that fits your business. Not the one that fits our pipeline." },
];

const services = [
  {
    icon: Compass,
    title: "Platform Selection",
    description: "We match platforms to businesses, not budgets to vendor relationships. Our comparison tools and methodology get you to the right shortlist faster and with more confidence.",
  },
  {
    icon: Settings,
    title: "EPM Implementation",
    description: "Delivered by senior practitioners, accelerated by AI-powered delivery tools. The same quality you'd expect from a Big 4 engagement, at a fraction of the cost and risk.",
  },
  {
    icon: Brain,
    title: "AI for Finance",
    description: "We help finance teams identify where AI adds real value and embed it from day one. Our own tools are built on the same approach, so you're working with a team that actually does this.",
  },
  {
    icon: FileCheck,
    title: "Finance Transformation",
    description: "Technology is only part of the answer. We design the process, build the capability, and implement the platform, in the right order, with the right people.",
  },
];

const coreValues = [
  "Senior delivery. Every engagement, no exceptions.",
  "Fixed fee. Scoped and priced before we start.",
  "AI-augmented tools that cut time and cost without cutting corners.",
  "Platform recommendations matched to your business, not our pipeline.",
  "Straight advice. Even when it's not what you want to hear.",
];

const partners = [
  { name: 'OneStream', tag: 'Enterprise CPM' },
  { name: 'Abacum',    tag: 'Mid-market FP&A' },
  { name: 'Runway',    tag: 'Scaleup Finance' },
];

const toolCards = [
  {
    href:        '/tools/epm-comparison',
    testId:      'card-tool-comparison',
    iconClass:   'icon-gradient',
    Icon:        BarChart3,
    title:       'Platform Comparison',
    description: 'Compare leading Enterprise Performance Management vendors across key drivers. Filter by requirements, see detailed scoring, and export for your evaluation.',
    cta:         'Compare Platforms',
  },
  {
    href:        '/finance-compass',
    testId:      'card-tool-financecompass',
    iconClass:   'icon-gradient-teal-cyan',
    Icon:        Target,
    title:       'Finance Maturity Assessment',
    description: 'Understand where your finance function stands today. Ten minutes. Personalised insights, ROI projections, and platform recommendations.',
    cta:         'Start Your Assessment',
  },
];

const stats = [
  { icon: Briefcase,  value: '40+',    label: 'Years combined EPM delivery experience' },
  { icon: BarChart3,  value: '£100m+', label: 'Finance technology programmes delivered' },
  { icon: TrendingUp, value: '3x',     label: 'Faster than a typical consulting engagement, through AI-augmented delivery' },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const revealStyle = (visible: boolean) => ({
  opacity:    visible ? 1 : 0,
  transform:  visible ? 'translateY(0)' : 'translateY(20px)',
  transition: 'opacity 0.6s ease, transform 0.6s ease',
});

export function BelowFoldSections() {
  const { flags } = useFeatureFlags();
  const servicesReveal = useReveal();
  const toolsReveal    = useReveal();
  const aboutReveal    = useReveal();
  const ctaReveal      = useReveal();

  return (
    <div>

      {/* ── Proof bar ── */}
      <ProofBar items={proofBarItems} />

      {/* ── Partners strip ── */}
      <div className="partners-strip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="partners-strip-label">The platforms we know inside out</p>
          <div
            className="flex items-center justify-center flex-wrap"
            style={{ gap: 'clamp(24px, 5vw, 72px)' }}
          >
            {partners.map((p) => (
              <div key={p.name} className="text-center">
                <div className="partners-strip-name">{p.name}</div>
                <div className="partners-strip-category">{p.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <section className="section-primary relative">
        {/* 3D accent — small berry sphere top-right of section */}
        <Suspense fallback={null}>
          <div className="absolute top-12 right-8 lg:right-20 opacity-50 pointer-events-none">
            <SectionAccent3D variant="berry" size={140} />
          </div>
        </Suspense>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12">
            <span className="section-tag mb-4">What We Do</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Consulting Firms Charge More for Doing Less.
            </h2>
            <p className="text-lg max-w-3xl mx-auto text-muted-foreground">
              The typical EPM project is expensive, unpredictable, and delivered by people who've never done it before at your level. We've rebuilt the model. Senior delivery, AI-powered tools that standardise the process, and a fixed fee that removes the financial risk before the project starts.
            </p>
          </div>

          <div ref={servicesReveal.ref} style={revealStyle(servicesReveal.visible)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {services.map((service, index) => (
                <div
                  key={service.title}
                  className="h-full text-center p-6 glass-card"
                  data-testid={`card-service-${index}`}
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto icon-gradient">
                    <service.icon className="w-6 h-6 text-brand-cream" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{service.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                </div>
              ))}
            </div>
          </div>

          {flags.services && (
            <div className="text-center">
              <Button variant="brand" data-testid="button-view-services" asChild>
                <Link href="/services">
                  See How We Work
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── How We Work banner ── */}
      <section className="section-banner" data-testid="section-how-we-work">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row flex-wrap lg:items-start gap-6 lg:gap-10">
            <div className="flex-shrink-0 hidden lg:flex pt-1">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center banner-icon-wrapper">
                <Zap className="w-7 h-7 text-brand-cyan" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6 lg:hidden">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10">
                  <Zap className="w-5 h-5 text-brand-cyan" />
                </div>
                <span
                  className="text-xs font-medium uppercase tracking-wider text-[#C77A93]/80"
                  data-testid="text-how-we-work-label"
                >
                  How We Work
                </span>
              </div>
              <div className="space-y-4 mb-6">
                <p
                  className="text-xl sm:text-2xl font-semibold leading-snug text-foreground"
                  data-testid="text-how-we-work-headline"
                >
                  Consulting firms have spent decades charging more for the same output. We're changing that.
                </p>
                <p
                  className="text-base sm:text-lg leading-relaxed text-[#F6F3EE]/80"
                  data-testid="text-how-we-work-body"
                >
                  Our AI-augmented delivery model standardises the process, the output, and the outcome across every engagement. That means faster delivery, lower cost, and a result you can predict from the start, not one you're hoping for at go-live.
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-[#F6F3EE]/60">
                  We've delivered programmes at AerCap, Howden, Reckitt Benckiser, and BAT. We know what good looks like. Now we've built the tools to make it repeatable.
                </p>
              </div>
              {flags.contact && (
                <Button
                  size="lg"
                  variant="brand-secondary"
                  data-testid="button-how-we-work-cta"
                  asChild
                >
                  <Link href="/contact">
                    See how it works
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tools ── */}
      <section className="section-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="section-tag mb-4">Tools &amp; Accelerators</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Your Evaluation</h2>
            <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
              Use our interactive tools to evaluate platforms and assess your transformation readiness. Rigorous analysis. No sales pitch.
            </p>
          </div>

          <div ref={toolsReveal.ref} style={revealStyle(toolsReveal.visible)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
              {toolCards.map((card) => (
                <Link key={card.href} href={card.href}>
                  <div className="h-full cursor-pointer p-6 text-center glass-card" data-testid={card.testId}>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto ${card.iconClass}`}>
                      <card.Icon className="w-6 h-6 text-brand-cream" />
                    </div>
                    <h3 className="text-lg font-semibold mb-3">{card.title}</h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                    <div className="flex items-center justify-center text-sm font-medium text-brand-teal">
                      {card.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}

              {flags.comparisonTools && (
                <Link href="/vendors">
                  <div className="h-full cursor-pointer p-6 text-center glass-card" data-testid="card-tool-vendor-profiles">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto icon-gradient-navy-cyan">
                      <Users className="w-6 h-6 text-brand-cream" />
                    </div>
                    <h3 className="text-lg font-semibold mb-3">Vendor Profiles</h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      Detailed profiles of leading EPM, ERP, and AI platforms. Objective capability scores, strengths, limitations, and pricing, all in one place.
                    </p>
                    <div className="flex items-center justify-center text-sm font-medium text-brand-teal">
                      Browse Profiles <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="section-stats-banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center" data-testid={`stat-${index}`}>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 stat-icon-wrapper">
                  <stat.icon className="w-7 h-7 text-brand-cyan" />
                </div>
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-base font-medium leading-snug">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="section-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div ref={aboutReveal.ref} style={revealStyle(aboutReveal.visible)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <span className="section-tag mb-4">About Us</span>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  We've Done This Before. Now We're Doing It Differently.
                </h2>
                <p className="text-base mb-4 leading-relaxed text-muted-foreground">
                  Our team has delivered EPM programmes across some of the world's most complex finance functions, AerCap, Howden, Reckitt Benckiser, BAT. We know what these projects cost, where they go wrong, and what good delivery actually looks like.
                </p>
                <p className="text-base mb-6 leading-relaxed text-muted-foreground">
                  We built Constancia to do it at a fraction of the cost and risk, by combining senior practitioners with AI-powered tools that standardise the work from day one.
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {coreValues.map((value) => (
                    <li key={value} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-brand-cyan" />
                      <span className="text-sm">{value}</span>
                    </li>
                  ))}
                </ul>
                {flags.about && (
                  <Button
                    variant="brand-secondary"
                    size="lg"
                    data-testid="button-learn-about"
                    asChild
                  >
                    <Link href="/about">
                      Learn More
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                )}
              </div>

              <GlassCard className="p-8">
                <h3 className="text-2xl font-bold mb-6">Our Mission</h3>
                <p className="text-base mb-4 leading-relaxed text-muted-foreground">
                  To disrupt the consulting model that's been overcharging finance leaders for decades.
                </p>
                <p className="text-base mb-4 leading-relaxed text-muted-foreground">
                  We're doing it by combining hands-on delivery experience with AI-powered tools that standardise process and outcome across every engagement, so you get the quality of a senior Big 4 team at a price that doesn't require a board sign-off.
                </p>
                <p className="text-base leading-relaxed text-muted-foreground">
                  That's not a pitch. It's what we've built.
                </p>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-secondary" style={{ paddingBottom: '120px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div ref={ctaReveal.ref} style={revealStyle(ctaReveal.visible)}>
            <GlassCard className="p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Ready to Talk?
              </h2>
              <p className="text-lg max-w-3xl mx-auto mb-4 text-muted-foreground">
                Whether you're evaluating platforms, planning a programme, or just want a straight answer on whether your current approach is working, we're happy to have that conversation.
              </p>
              <p className="text-base max-w-2xl mx-auto mb-8 text-muted-foreground">
                No pitch. No commitment. Just someone who's done this before.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
                <Button variant="brand" data-testid="button-cta-assessment" asChild>
                  <Link href="/finance-compass">Start Your Assessment</Link>
                </Button>
                <Button variant="brand-secondary" data-testid="button-cta-comparison" asChild>
                  <Link href="/tools/epm-comparison">Compare Platforms</Link>
                </Button>
                {flags.contact && (
                  <Button variant="brand-ghost" data-testid="button-cta-contact" asChild>
                    <Link href="/contact">
                      Get in Touch
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

    </div>
  );
}
