import { memo } from "react";
import logoWhite from "@assets/brand/Constancia-Logo-ML-Transparent.png";

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
    <div className="relative" style={{ fontFamily: 'var(--hp-font-sans)' }}>
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-brand-navy"
          aria-hidden="true"
        />

        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#02205B] via-[#041E52] to-[#0A2E6E]"
          aria-hidden="true"
        />

        <div
          className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-[#0884AA]/12 via-transparent to-transparent"
          aria-hidden="true"
        />

        <div
          className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-[#12EBFC]/5 via-transparent to-transparent"
          aria-hidden="true"
        />

        <div
          className="hidden md:block absolute top-[15%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#0884AA]/8 blur-[100px]"
          aria-hidden="true"
        />
        <div
          className="hidden md:block absolute bottom-[20%] left-[5%] w-[300px] h-[300px] rounded-full bg-[#12EBFC]/5 blur-[80px]"
          aria-hidden="true"
        />

        <div
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#12EBFC]/20 to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
          <div className="mb-8">
            <img
              src={logoWhite}
              alt="Constancia"
              className="h-14 md:h-16 mx-auto mb-6 opacity-90"
              loading="eager"
              {...{ fetchpriority: "high" } as any}
            />
          </div>

          <div className="inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] mb-8 max-w-[90vw]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#12EBFC] flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium text-white/70 tracking-wider sm:tracking-widest uppercase text-center leading-snug">{badge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            {title}
            {highlightedText && (
              <>
                <br />
                <span className="text-brand-cyan">
                  {highlightedText}
                </span>
              </>
            )}
          </h1>

          {subtitle && (
            <p className="text-lg md:text-xl text-brand-cyan/80 font-medium mb-4">
              {subtitle}
            </p>
          )}

          <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>

          {children && (
            <div className="mt-10">
              {children}
            </div>
          )}
        </div>

      </section>
      
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-b from-transparent to-[#010E2A] pointer-events-none" 
        aria-hidden="true" 
      />
    </div>
  );
};

export const PageHero = memo(PageHeroComponent);
