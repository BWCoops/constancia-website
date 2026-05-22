/**
 * GlassSurface — single shared frosted-glass primitive.
 *
 * Replaces the vendored liquid-glass-react library + LiquidGlassCard
 * wrapper. CSS-only frosting (cream/rose radial gradient + chromatic
 * border + 24px backdrop-blur + soft shadows) so the same visual
 * works across Chrome / Safari / Firefox, with a Chromium-only SVG
 * displacement enhancement layered on via @supports — see
 * GlassFilterDef and the `.glass-surface` CSS rules in index.css.
 *
 * Replaces 17KB of vendored JS + a self-maintained fork with one
 * 10-line component and one CSS class, and unifies the visual
 * language so the hero mission card and the services partner chips
 * share the same surface (the library presets used to differ).
 */

import type { ReactNode, HTMLAttributes } from "react";

interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function GlassSurface({ children, className = "", ...rest }: GlassSurfaceProps) {
  return (
    <div className={`glass-surface ${className}`} {...rest}>
      {children}
    </div>
  );
}

/**
 * GlassFilterDef — the inline SVG filter that the `.glass-surface`
 * class picks up via `@supports (backdrop-filter: url(#glass))`.
 * Mount once at the app root (above any GlassSurface usage). Safari
 * and Firefox don't implement url() backdrop-filter, so they fall
 * through to the plain blur fallback automatically.
 */
export function GlassFilterDef() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <filter id="glass" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.008"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="18"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
