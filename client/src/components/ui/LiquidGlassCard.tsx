import { useMemo, type ReactNode, type CSSProperties } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/**
 * LiquidGlassCard — Apple-style liquid glass morphism panel.
 *
 * Self-contained CSS implementation. Previously this wrapped
 * `liquid-glass-react`, but that package declared React 19 as a
 * hard peer dep and broke Replit's `npm install`. The visual
 * goal — layered translucency, edge specular highlight, hint of
 * chromatic aberration on the rim — is achievable with pure CSS:
 *
 *   - `backdrop-filter: blur() saturate()` for the refraction
 *   - layered radial gradients for the inner specular sheen
 *   - 1px inset highlight + 1px outer rim for the "frosted edge"
 *   - subtle SVG noise inside the card for film-grain texture
 *   - hover-scale + reduced-motion fallback baked in
 *
 * Same API as before so existing call-sites don't change:
 *   <LiquidGlassCard variant="hero" cornerRadius={28}>...</LiquidGlassCard>
 *
 * **Hard cap: max 5 instances per page.** The CSS still does real
 * GPU compositing work (backdrop-filter on a moving page is the
 * single most expensive thing CSS can do). Use plain
 * `bg-white/5 backdrop-blur-sm border border-white/10` for any
 * additional surfaces.
 */

interface LiquidGlassCardProps {
  children: ReactNode;
  variant?: "hero" | "default" | "subtle";
  cornerRadius?: number;
  onClick?: () => void;
  className?: string;
}

// Variant tuning — driven by CSS variables on the card so the
// stylesheet can pull values without React props leaking into
// every selector.
const VARIANT_VARS: Record<"hero" | "default" | "subtle", Record<string, string>> = {
  hero: {
    "--lgc-blur": "22px",
    "--lgc-saturate": "1.4",
    "--lgc-bg": "rgba(246, 243, 238, 0.06)",
    "--lgc-rim": "rgba(246, 243, 238, 0.22)",
    "--lgc-inset": "rgba(246, 243, 238, 0.10)",
    "--lgc-aberration": "1",
  },
  default: {
    "--lgc-blur": "16px",
    "--lgc-saturate": "1.3",
    "--lgc-bg": "rgba(246, 243, 238, 0.05)",
    "--lgc-rim": "rgba(246, 243, 238, 0.18)",
    "--lgc-inset": "rgba(246, 243, 238, 0.08)",
    "--lgc-aberration": "0.7",
  },
  subtle: {
    "--lgc-blur": "10px",
    "--lgc-saturate": "1.2",
    "--lgc-bg": "rgba(246, 243, 238, 0.04)",
    "--lgc-rim": "rgba(246, 243, 238, 0.12)",
    "--lgc-inset": "rgba(246, 243, 238, 0.06)",
    "--lgc-aberration": "0.4",
  },
};

export function LiquidGlassCard({
  children,
  variant = "default",
  cornerRadius = 24,
  onClick,
  className,
}: LiquidGlassCardProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const style = useMemo<CSSProperties>(() => {
    const base = { ...VARIANT_VARS[variant] } as Record<string, string>;
    // Halve the blur on mobile — backdrop-filter is the most
    // expensive per-frame CSS operation on mobile GPUs.
    if (isMobile) {
      const blurNum = parseInt(base["--lgc-blur"], 10) || 16;
      base["--lgc-blur"] = `${Math.round(blurNum * 0.6)}px`;
    }
    // Reduced-motion stills the hover-scale via the CSS rule below;
    // nothing extra needed in the inline style.
    base["--lgc-radius"] = `${cornerRadius}px`;
    return base as CSSProperties;
  }, [variant, cornerRadius, isMobile]);

  const interactive = onClick != null;
  const Tag = interactive ? "button" : "div";

  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      style={style}
      className={[
        "lgc",
        `lgc--${variant}`,
        interactive ? "lgc--interactive" : "",
        prefersReducedMotion ? "lgc--reduced" : "",
        "glass-fallback", // browser fallback class (see index.css §12)
        className ?? "",
      ].filter(Boolean).join(" ")}
    >
      <span className="lgc__inner">{children}</span>
    </Tag>
  );
}
