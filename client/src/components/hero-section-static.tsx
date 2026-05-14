import { ArrowRight, CheckCircle2, Target } from "@/lib/icons";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import { CutIcon } from "@/components/ui/cut-icon";
import logoWhite from "@assets/brand/Constancia-Logo-ML-Transparent.png";
import { HeroParticleCanvas } from "@/components/home/HeroParticleCanvas";

// Subtle reveal — slow, considered, classy. Constancia identity rule.
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function HeroSectionStatic() {
  const { flags } = useFeatureFlags();

  return (
    <section
      className="relative overflow-hidden flex items-center justify-center"
      style={{
        background: 'var(--brand-bg-primary)',
        minHeight: 'calc(100vh - 58px)',
        fontFamily: 'var(--brand-font-sans)',
      }}
      aria-labelledby="hero-heading"
    >
      {/* Canvas — full bleed background layer */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <HeroParticleCanvas />
      </div>

      {/* Dark overlay so text stays readable over the canvas */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(18,22,29,0.30) 0%, rgba(18,22,29,0.82) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Cut Icon decoration — Constancia signature dots placed for visual rhythm.
          Subtle, low-opacity, large radius. Echoes the wordmark's terminal period. */}
      <CutIcon
        size={520}
        variant="rose"
        className="hidden md:block absolute -top-40 -right-40 opacity-[0.06] blur-[2px] pointer-events-none"
      />
      <CutIcon
        size={360}
        variant="mint"
        className="hidden md:block absolute -bottom-32 -left-32 opacity-[0.08] blur-[1px] pointer-events-none"
      />
      <CutIcon
        size={140}
        variant="rose"
        className="hidden lg:block absolute top-1/3 right-[12%] opacity-[0.10] pointer-events-none"
      />

      {/* Text — centered, on top */}
      <LazyMotion features={domAnimation} strict>
        <div
          className="relative w-full max-w-4xl mx-auto px-6 sm:px-10 py-24 text-center"
          style={{ zIndex: 2 }}
        >
          {/* Logo */}
          <m.div
            className="mb-7"
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
          >
            <img
              src={logoWhite}
              alt="Constancia"
              className="h-9 md:h-11 w-auto mx-auto opacity-95"
              loading="eager"
              {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
            />
          </m.div>

          {/* Eyebrow badge */}
          <m.div
            className="inline-flex items-center gap-2 mb-6"
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            style={{
              padding: '4px 14px',
              borderRadius: '100px',
              background: 'rgba(246,243,238,0.05)',
              border: '1px solid rgba(246,243,238,0.08)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--brand-mineral-green)', animation: 'hp-blink 2.4s ease-in-out infinite' }}
            />
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--brand-font-mono)',
                color: 'rgba(246,243,238,0.7)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              EPM Advisory. Rebuilt for the AI Era.
            </span>
          </m.div>

          {/* H1 — slimmer weight, optical-aligned letter spacing for editorial feel */}
          <m.h1
            id="hero-heading"
            className="mb-5"
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            style={{
              fontSize: 'clamp(36px, 5.5vw, 72px)',
              color: 'var(--brand-text-primary)',
              lineHeight: '1.05',
              letterSpacing: '-0.022em',
              fontWeight: 500,
            }}
          >
            The EPM firm that charges less
            <br />
            <span style={{ color: 'var(--brand-muted-rose)', fontWeight: 400 }}>
              and delivers more
            </span>
            <CutIcon size={14} variant="mint" className="ml-1" />
          </m.h1>

          {/* Body */}
          <m.p
            className="mx-auto mb-8"
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            style={{
              fontSize: 'clamp(15px, 1.6vw, 18px)',
              color: 'var(--brand-text-secondary)',
              lineHeight: '1.7',
              maxWidth: '600px',
              fontWeight: 400,
            }}
          >
            Senior practitioners, AI-powered tools, and a fixed fee model that removes the cost and uncertainty of a typical consulting project. We've delivered these programmes. We've built the tools. Now we're changing how it works.
          </m.p>

          {/* CTAs */}
          <m.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8"
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeUp}
          >
            {flags.financeCompass && (
              <Button
                variant="brand"
                asChild
                data-testid="button-hero-assessment"
              >
                <Link href="/finance-compass">
                  Start Your Assessment
                </Link>
              </Button>
            )}
            {flags.comparisonTools && (
              <Button
                variant="brand-secondary"
                asChild
                data-testid="button-hero-compare"
              >
                <Link href="/tools/epm-comparison">
                  Compare Platforms
                </Link>
              </Button>
            )}
          </m.div>

          {/* Mono social proof strip */}
          <m.div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10"
            initial="hidden"
            animate="visible"
            custom={5}
            variants={fadeUp}
          >
            {['AI-Augmented', '100% Senior', 'Fixed Fee'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: 'var(--brand-mineral-green)' }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--brand-font-mono)',
                    color: 'rgba(246,243,238,0.55)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </m.div>

          {/* AI confidence gap callout */}
          <m.div
            className="mx-auto"
            data-testid="section-ai-confidence-gap"
            initial="hidden"
            animate="visible"
            custom={6}
            variants={fadeUp}
            style={{
              maxWidth: '580px',
              borderRadius: '12px',
              background: 'rgba(246,243,238,0.035)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(246,243,238,0.08)',
              padding: '26px 30px',
              textAlign: 'center',
            }}
          >
            <div className="space-y-3 mb-4">
              <p
                className="leading-snug"
                style={{ fontSize: 'clamp(14px, 1.4vw, 17px)', color: 'rgba(246,243,238,0.92)', fontWeight: 500 }}
                data-testid="text-stat-headline"
              >
                87% of CFOs say AI is critical to their finance function in 2026.
              </p>
              <p
                className="leading-snug"
                style={{ fontSize: 'clamp(14px, 1.4vw, 17px)', color: 'var(--brand-muted-rose)', fontWeight: 500 }}
                data-testid="text-stat-contrast"
              >
                Only 36% feel confident they can actually deliver the impact.
              </p>
              <p
                style={{
                  fontSize: 'clamp(12px, 1.1vw, 14px)',
                  color: 'rgba(246,243,238,0.55)',
                  lineHeight: '1.7',
                }}
                data-testid="text-stat-body"
              >
                The gap is not the technology. It is knowing where your finance
                function sits today, and which investments will move the needle.
              </p>
            </div>
            <Button
              size="lg"
              variant="brand"
              asChild
              data-testid="button-confidence-gap-cta"
            >
              <Link href="/finance-compass">
                <Target className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="sm:hidden">Get Your Benchmark</span>
                <span className="hidden sm:inline">Get your FinanceCompass benchmark</span>
                <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
              </Link>
            </Button>
          </m.div>
        </div>
      </LazyMotion>
    </section>
  );
}
