import { useRef } from "react";
import { ArrowRight, CheckCircle2, Target } from "@/lib/icons";
import { m, LazyMotion, domAnimation, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import { CutIcon } from "@/components/ui/cut-icon";
import { ConstanciaMark } from "@/components/ui/constancia-mark";
import { HeroParticleCanvas } from "@/components/home/HeroParticleCanvas";

// Visible reveal — bigger displacement so motion is clearly seen on arrival.
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.95, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function HeroSectionStatic() {
  const { flags } = useFeatureFlags();
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll-driven parallax — background CutIcon circles drift on scroll
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const yRose   = useTransform(scrollYProgress, [0, 1], [0,  140]);
  const yMint   = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const yMark   = useTransform(scrollYProgress, [0, 1], [0,  -80]);
  const opacityFade = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={sectionRef}
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

      {/* Cut Icon decoration — Constancia signature circles, drifting + scroll parallax.
          Echoes the wordmark's terminal period. Visible motion, classy, low opacity. */}
      <m.div
        style={{ y: yRose, opacity: opacityFade }}
        className="hidden md:block absolute -top-40 -right-40 pointer-events-none"
      >
        <CutIcon
          size={520}
          variant="rose"
          className="opacity-[0.16] blur-[2px] constancia-drift constancia-pulse"
        />
      </m.div>
      <m.div
        style={{ y: yMint, opacity: opacityFade }}
        className="hidden md:block absolute -bottom-32 -left-32 pointer-events-none"
      >
        <CutIcon
          size={360}
          variant="mint"
          className="opacity-[0.20] blur-[1px] constancia-drift-reverse"
        />
      </m.div>
      <CutIcon
        size={180}
        variant="rose"
        className="hidden lg:block absolute top-1/3 right-[12%] opacity-[0.18] pointer-events-none constancia-drift-reverse"
      />
      <CutIcon
        size={80}
        variant="mint"
        className="hidden lg:block absolute bottom-[18%] right-[24%] opacity-[0.28] pointer-events-none constancia-drift constancia-pulse"
      />

      {/* Text — centered, on top */}
      <LazyMotion features={domAnimation} strict>
        <div
          className="relative w-full max-w-4xl mx-auto px-6 sm:px-10 py-24 text-center"
          style={{ zIndex: 2 }}
        >
          {/* Brand mark — full Constancia overlapping-circles icon, big + interactive tilt */}
          <m.div
            className="mb-10 flex justify-center"
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
            style={{ y: yMark }}
          >
            <ConstanciaMark
              size={240}
              interactive
              aria-label="Constancia"
              className="constancia-breath drop-shadow-[0_8px_40px_rgba(199,122,147,0.18)]"
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

          {/* H1 — heavier weight + tighter tracking for impact + legibility */}
          <m.h1
            id="hero-heading"
            className="mb-6"
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            style={{
              fontSize: 'clamp(44px, 6.4vw, 88px)',
              color: 'var(--brand-text-primary)',
              lineHeight: '1.02',
              letterSpacing: '-0.028em',
              fontWeight: 700,
            }}
          >
            The EPM firm that charges less
            <br />
            <span style={{ color: 'var(--brand-muted-rose)', fontWeight: 600 }}>
              and delivers more
            </span>
            <CutIcon size={20} variant="mint" className="ml-2 constancia-breath inline-block align-baseline" />
          </m.h1>

          {/* Body — bigger, more legible (0.85 opacity, 18-20px) */}
          <m.p
            className="mx-auto mb-10"
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            style={{
              fontSize: 'clamp(17px, 1.7vw, 20px)',
              color: 'rgba(246,243,238,0.85)',
              lineHeight: '1.6',
              maxWidth: '640px',
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
