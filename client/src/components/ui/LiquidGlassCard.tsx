import LiquidGlass from "liquid-glass-react";
import { useMemo, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/**
 * LiquidGlassCard — Apple-style "liquid glass" morphism panel.
 *
 * Wraps `liquid-glass-react` with three preset intensity variants
 * (hero / default / subtle), mobile down-scaling, and
 * `prefers-reduced-motion` handling. Falls back to standard
 * backdrop-blur on Safari / Firefox automatically (handled by the
 * underlying library) and to a solid translucent panel on very old
 * browsers via the `.glass-fallback` class defined in index.css.
 *
 * **Hard cap: 5 instances per page.** Use plain
 * `bg-white/5 backdrop-blur-sm border border-white/10` for any
 * additional surfaces.
 *
 * Required: the page background MUST have varied colour underneath
 * for the refraction to look right. Pair with the animated mesh +
 * grain layers used on the landing page.
 */

interface LiquidGlassCardProps {
  children: ReactNode;
  variant?: "hero" | "default" | "subtle";
  cornerRadius?: number;
  onClick?: () => void;
  className?: string;
}

const variants = {
  hero: {
    displacementScale: 80,
    blurAmount: 0.12,
    saturation: 140,
    aberrationIntensity: 2.5,
    elasticity: 0.40,
  },
  default: {
    displacementScale: 60,
    blurAmount: 0.08,
    saturation: 130,
    aberrationIntensity: 2.0,
    elasticity: 0.30,
  },
  subtle: {
    displacementScale: 40,
    blurAmount: 0.05,
    saturation: 120,
    aberrationIntensity: 1.0,
    elasticity: 0.20,
  },
} as const;

export function LiquidGlassCard({
  children,
  variant = "default",
  cornerRadius = 24,
  onClick,
  className,
}: LiquidGlassCardProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const config = useMemo(() => {
    const base = variants[variant];
    // Halve the displacement and reduce the blur on mobile — the
    // shader cost is non-trivial, and the visual delta is barely
    // perceptible at small sizes.
    const mobileScaled = isMobile
      ? {
          ...base,
          displacementScale: base.displacementScale * 0.5,
          blurAmount: base.blurAmount * 0.6,
        }
      : base;
    // `prefers-reduced-motion` kills the elastic interaction so
    // hover / pointer movement doesn't flex the surface.
    return prefersReducedMotion
      ? { ...mobileScaled, elasticity: 0 }
      : mobileScaled;
  }, [variant, isMobile, prefersReducedMotion]);

  return (
    <div className={className}>
      <LiquidGlass
        displacementScale={config.displacementScale}
        blurAmount={config.blurAmount}
        saturation={config.saturation}
        aberrationIntensity={config.aberrationIntensity}
        elasticity={config.elasticity}
        cornerRadius={cornerRadius}
        onClick={onClick}
      >
        {children}
      </LiquidGlass>
    </div>
  );
}
