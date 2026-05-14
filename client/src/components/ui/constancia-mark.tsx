/**
 * ConstanciaMark — pure two-dot icon
 * ─────────────────────────────────────────────────────────────────
 * Distillation of the wordmark to its two signature accents:
 *   • Rose dot (the `i` in "constancia")
 *   • Mint dot (the terminal period)
 *
 * Use this where the full wordmark is too literal or too wide:
 * favicons, profile chips, watermarks, loading states.
 *
 *   <ConstanciaMark size={48} />              // default — rose then mint
 *   <ConstanciaMark size={120} variant="ml" /> // larger, on light bg
 *   <ConstanciaMark size={32} stacked />      // dots stacked vertically
 */

import { cn } from "@/lib/utils";

export interface ConstanciaMarkProps {
  /** Total bounding box size in px. Each dot is ~28% of this. */
  size?: number;
  /** Stack dots vertically instead of horizontally (square-ratio mark). */
  stacked?: boolean;
  /** Tailwind extras. */
  className?: string;
  /** Accessible label. Omit for purely decorative. */
  "aria-label"?: string;
}

export function ConstanciaMark({
  size = 56,
  stacked = false,
  className,
  "aria-label": ariaLabel,
}: ConstanciaMarkProps) {
  // Viewbox is 100x100 for stacked, 100x44 for inline
  const w = stacked ? 100 : 100;
  const h = stacked ? 100 : 44;
  // Dot radius — bigger so the two dots feel substantial
  const r = stacked ? 22 : 22;

  return (
    <svg
      width={size}
      height={(size * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn("inline-block", className)}
    >
      {stacked ? (
        <>
          <circle cx={50} cy={28} r={r} fill="var(--brand-muted-rose)" />
          <circle cx={50} cy={72} r={r} fill="var(--brand-mineral-green)" />
        </>
      ) : (
        <>
          <circle cx={28} cy={22} r={r} fill="var(--brand-muted-rose)" />
          <circle cx={72} cy={22} r={r} fill="var(--brand-mineral-green)" />
        </>
      )}
    </svg>
  );
}
