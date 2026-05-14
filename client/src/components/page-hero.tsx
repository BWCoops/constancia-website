import { memo } from "react";
import { CutIcon } from "@/components/ui/cut-icon";
import { ConstanciaMark } from "@/components/ui/constancia-mark";

interface PageHeroProps {
  badge: string;
  title: string;
  highlightedText?: string;
  subtitle?: string;
  description: string;
  children?: React.ReactNode;
}

const PageHeroComponent = ({
  badge,
  title,
  highlightedText,
  subtitle,
  description,
  children,
}: PageHeroProps) => {
  return (
    <div className="relative" style={{ fontFamily: 'var(--brand-font-sans)' }}>
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Base anchor — Constancia primary-dark */}
        <div
          className="absolute inset-0"
          style={{ background: 'var(--brand-bg-primary)' }}
          aria-hidden="true"
        />

        {/* Slow-shifting Constancia gradient — visible continuous motion */}
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: 'linear-gradient(135deg, #12161D 0%, #1E2630 50%, #2A2F3C 100%)',
          }}
          aria-hidden="true"
        />

        {/* Cut Icon decoration — Constancia signature dots, drifting continuously */}
        <CutIcon
          size={520}
          variant="rose"
          className="hidden md:block absolute -top-40 -right-40 opacity-[0.10] blur-[2px] pointer-events-none constancia-drift constancia-pulse"
        />
        <CutIcon
          size={360}
          variant="mint"
          className="hidden md:block absolute -bottom-32 -left-32 opacity-[0.12] blur-[1px] pointer-events-none constancia-drift-reverse"
        />
        <CutIcon
          size={180}
          variant="rose"
          className="hidden lg:block absolute top-[18%] right-[14%] opacity-[0.14] pointer-events-none constancia-drift-reverse"
        />
        <CutIcon
          size={90}
          variant="mint"
          className="hidden lg:block absolute bottom-[24%] right-[28%] opacity-[0.18] pointer-events-none constancia-drift constancia-pulse"
        />

        {/* Top hairline — rose tint */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(199,122,147,0.22), transparent)' }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
          {/* Brand mark — two-dot Constancia signature, breathing */}
          <div className="mb-9 reveal-up reveal-up-1 flex justify-center">
            <ConstanciaMark
              size={96}
              aria-label="Constancia"
              className="constancia-breath"
            />
          </div>

          {/* Eyebrow badge */}
          <div className="reveal-up reveal-up-2 inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 rounded-full bg-[#F6F3EE]/[0.05] backdrop-blur-sm border border-[#F6F3EE]/[0.10] mb-8 max-w-[90vw]">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 constancia-pulse"
              style={{ background: 'var(--brand-mineral-green)' }}
            />
            <span
              className="text-[10px] sm:text-xs font-medium tracking-wider sm:tracking-widest uppercase text-center leading-snug"
              style={{ color: 'rgba(246,243,238,0.7)', fontFamily: 'var(--brand-font-mono)' }}
            >
              {badge}
            </span>
          </div>

          {/* H1 with reveal + signature dot — heavier weight, more legible */}
          <h1
            className="reveal-up reveal-up-3 mb-6"
            style={{
              fontSize: 'clamp(40px, 5.8vw, 80px)',
              color: 'var(--brand-text-primary)',
              lineHeight: '1.02',
              letterSpacing: '-0.028em',
              fontWeight: 700,
            }}
          >
            {title}
            {highlightedText && (
              <>
                <br />
                <span style={{ color: 'var(--brand-muted-rose)', fontWeight: 600 }}>
                  {highlightedText}
                </span>
                <CutIcon size={18} variant="mint" className="ml-2 constancia-breath inline-block align-baseline" />
              </>
            )}
          </h1>

          {subtitle && (
            <p
              className="reveal-up reveal-up-4 mb-4"
              style={{
                fontSize: 'clamp(17px, 1.6vw, 21px)',
                color: 'var(--brand-mineral-green)',
                fontWeight: 500,
                letterSpacing: '-0.005em',
              }}
            >
              {subtitle}
            </p>
          )}

          <p
            className="reveal-up reveal-up-5 max-w-2xl mx-auto"
            style={{
              fontSize: 'clamp(17px, 1.5vw, 20px)',
              color: 'rgba(246,243,238,0.85)',
              lineHeight: '1.6',
              fontWeight: 400,
            }}
          >
            {description}
          </p>

          {children && (
            <div className="reveal-up reveal-up-6 mt-10">
              {children}
            </div>
          )}
        </div>

      </section>

      {/* Soft fade to next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 md:h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--brand-bg-primary))' }}
        aria-hidden="true"
      />
    </div>
  );
};

export const PageHero = memo(PageHeroComponent);
