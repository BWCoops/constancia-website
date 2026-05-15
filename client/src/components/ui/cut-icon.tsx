/**
 * CutIcon — Constancia's signature dot
 * ─────────────────────────────────────────────────────────────────
 * The brand mark is the terminal period of the `constancia.` wordmark.
 * Scaled up, the dot becomes the icon system. This component renders it
 * as a single circle, in either of the two brand accents.
 *
 * Use sparingly per brand spec: rose and mineral-green are accent colours,
 * not dominant fills.
 *
 *   <CutIcon size={12} variant="rose" />        // signature i-dot
 *   <CutIcon size={48} variant="mint" />        // hero accent
 *   <CutIcon className="absolute -bottom-6 -right-6" size={120} />
 */

import { cn } from "@/lib/utils";

export type CutIconVariant = "rose" | "mint" | "berry" | "deep-mint" | "neutral";

export interface CutIconProps {
  /** Diameter in pixels. */
  size?: number;
  /** Accent colour — defaults to mineral-green (the wordmark's terminal period). */
  variant?: CutIconVariant;
  /** Tailwind extras (positioning, opacity, etc). */
  className?: string;
  /** Accessible label; omit for purely decorative use (aria-hidden). */
  "aria-label"?: string;
}

const variantColor: Record<CutIconVariant, string> = {
  rose:        "var(--brand-muted-rose)",
  mint:        "var(--brand-mineral-green)",
  berry:       "var(--brand-deep-berry)",
  "deep-mint": "var(--brand-deep-mint)",
  neutral:     "var(--brand-support-neutral)",
};

export function CutIcon({
  size = 14,
  variant = "mint",
  className,
  "aria-label": ariaLabel,
}: CutIconProps) {
  return (
    <span
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn("inline-block rounded-full align-baseline", className)}
      style={{
        width: size,
        height: size,
        background: variantColor[variant],
      }}
    />
  );
}
