import { ArrowRight, CheckCircle2, Target } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import logoWhite from "@assets/1QG-TypeLogo-320.png";
import { HeroParticleCanvas } from "@/components/home/HeroParticleCanvas";

export function HeroSectionStatic() {
  const { flags } = useFeatureFlags();

  return (
    <section
      className="relative overflow-hidden flex items-center justify-center"
      style={{
        background: 'var(--hp-bg-primary)',
        minHeight: 'calc(100vh - 58px)',
        fontFamily: 'var(--hp-font-sans)',
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
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(1,14,42,0.25) 0%, rgba(1,14,42,0.72) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Text — centered, on top */}
      <div
        className="relative w-full max-w-4xl mx-auto px-6 sm:px-10 py-24 text-center"
        style={{ zIndex: 2 }}
      >
        {/* Logo */}
        <div className="mb-6">
          <img
            src={logoWhite}
            alt="1QG"
            className="h-10 md:h-12 w-auto mx-auto opacity-90"
            loading="eager"
            {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
          />
        </div>

        {/* Eyebrow badge */}
        <div
          className="inline-flex items-center gap-2 mb-6"
          style={{
            padding: '4px 14px',
            borderRadius: '100px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: 'var(--hp-cyan)', animation: 'hp-blink 2s infinite' }}
          />
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--hp-font-mono)',
              color: 'rgba(254,255,243,0.7)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            EPM Advisory. Rebuilt for the AI Era.
          </span>
        </div>

        {/* H1 */}
        <h1
          id="hero-heading"
          className="font-bold mb-5"
          style={{
            fontSize: 'clamp(36px, 5.5vw, 72px)',
            color: 'var(--hp-text-primary)',
            lineHeight: '1.05',
            letterSpacing: '-0.035em',
          }}
        >
          The EPM Firm That Charges Less
          <br />
          <span style={{ color: 'var(--hp-cyan)', fontStyle: 'italic' }}>and Delivers More.</span>
        </h1>

        {/* Body */}
        <p
          className="mx-auto mb-8"
          style={{
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            color: 'var(--hp-text-secondary)',
            lineHeight: '1.7',
            maxWidth: '600px',
            fontWeight: '400',
          }}
        >
          Senior practitioners, AI-powered tools, and a fixed fee model that removes the cost and uncertainty of a typical consulting project. We've delivered these programmes. We've built the tools. Now we're changing how it works.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
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
        </div>

        {/* Mono social proof strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10">
          {['AI-Augmented', '100% Senior', 'Fixed Fee'].map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <CheckCircle2
                className="h-4 w-4 flex-shrink-0"
                style={{ color: 'rgba(18,235,252,0.7)' }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--hp-font-mono)',
                  color: 'rgba(254,255,243,0.5)',
                  letterSpacing: '0.04em',
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* AI confidence gap callout */}
        <div
          className="mx-auto"
          data-testid="section-ai-confidence-gap"
          style={{
            maxWidth: '580px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '24px 28px',
            textAlign: 'center',
          }}
        >
          <div className="space-y-3 mb-4">
            <p
              className="font-semibold leading-snug"
              style={{ fontSize: 'clamp(14px, 1.4vw, 17px)', color: 'rgba(254,255,243,0.9)' }}
              data-testid="text-stat-headline"
            >
              87% of CFOs say AI is critical to their finance function in 2026.
            </p>
            <p
              className="font-semibold leading-snug"
              style={{ fontSize: 'clamp(14px, 1.4vw, 17px)', color: 'var(--hp-cyan)' }}
              data-testid="text-stat-contrast"
            >
              Only 36% feel confident they can actually deliver the impact.
            </p>
            <p
              style={{
                fontSize: 'clamp(12px, 1.1vw, 14px)',
                color: 'rgba(254,255,243,0.5)',
                lineHeight: '1.6',
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
        </div>
      </div>
    </section>
  );
}
