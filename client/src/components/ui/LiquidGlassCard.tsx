import LiquidGlass from "liquid-glass-react";
import { useMemo, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/**
 * LiquidGlassCard — wraps `liquid-glass-react` with three preset
 * intensity variants. The library renders a real WebGL/shader
 * displacement map that produces Apple's actual Liquid Glass
 * refraction effect (the React 19 peer-dep mismatch that broke
 * Replit's install is now handled by .npmrc legacy-peer-deps=true).
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
  hero:    { displacementScale: 80, blurAmount: 0.12, saturation: 140, aberrationIntensity: 2.5, elasticity: 0.40 },
  default: { displacementScale: 60, blurAmount: 0.08, saturation: 130, aberrationIntensity: 2.0, elasticity: 0.30 },
  subtle:  { displacementScale: 40, blurAmount: 0.05, saturation: 120, aberrationIntensity: 1.0, elasticity: 0.20 },
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
