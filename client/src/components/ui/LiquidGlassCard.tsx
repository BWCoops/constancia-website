import LiquidGlass from "@/vendor/liquid-glass";
import { useMemo, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/**
 * LiquidGlassCard — wraps the vendored liquid-glass component (see
 * client/src/vendor/liquid-glass/) with three preset intensity
 * variants. Renders a real WebGL/shader displacement map that
 * produces Apple's actual Liquid Glass refraction effect.
 *
 * Hard cap: 5 instances per page. The shader is GPU-expensive; any
 * additional surfaces should use the plain
 * `bg-white/5 backdrop-blur-sm border border-white/10` pattern.
 */

interface LiquidGlassCardProps {
  children: ReactNode;
  variant?: "hero" | "default" | "subtle";
  cornerRadius?: number;
  onClick?: () => void;
  className?: string;
}

const variants = {
  // Hero card refracts the fabric shader behind it — bumped
  // displacement/saturation/aberration for a stronger Apple-style
  // liquid feel (the chromatic edges + caustic ripple are what sell
  // the effect).
  hero:    { displacementScale: 110, blurAmount: 0.16, saturation: 160, aberrationIntensity: 3.4, elasticity: 0.45 },
  default: { displacementScale: 60,  blurAmount: 0.08, saturation: 130, aberrationIntensity: 2.0, elasticity: 0.30 },
  subtle:  { displacementScale: 40,  blurAmount: 0.05, saturation: 120, aberrationIntensity: 1.0, elasticity: 0.20 },
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
    const mobileScaled = isMobile
      ? { ...base, displacementScale: base.displacementScale * 0.5, blurAmount: base.blurAmount * 0.6 }
      : base;
    return prefersReducedMotion ? { ...mobileScaled, elasticity: 0 } : mobileScaled;
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
