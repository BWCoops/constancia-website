/**
 * ConstanciaMark — the brand icon
 * ─────────────────────────────────────────────────────────────────
 * Two overlapping circles, mint over rose, ~45° diagonal axis.
 * This is THE Constancia mark — the icon used for favicon, hero mark,
 * loading states, social previews. Distillation of the wordmark's two
 * signature accents (the `i` rose dot + the terminal mint period) blown
 * up to brand-icon scale and overlapped per the official brand pack.
 *
 *   <ConstanciaMark size={240} />               // hero use
 *   <ConstanciaMark size={64} />                // header / chip
 *   <ConstanciaMark size={32} interactive />    // cursor-tilt micro 3D
 */

import { useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export interface ConstanciaMarkProps {
  /** Total bounding box edge in px. The mark is rendered square. */
  size?: number;
  /** Tailwind extras (animation classes, positioning, etc). */
  className?: string;
  /** Adds a subtle perspective tilt that follows the cursor. */
  interactive?: boolean;
  /** Accessible label. Omit for purely decorative. */
  "aria-label"?: string;
}

export function ConstanciaMark({
  size = 120,
  className,
  interactive = false,
  "aria-label": ariaLabel,
}: ConstanciaMarkProps) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  const handleMove = (e: MouseEvent<HTMLSpanElement>) => {
    if (!interactive || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    // Subtle: max 8 deg tilt
    wrapRef.current.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`;
  };

  const handleLeave = () => {
    if (!interactive || !wrapRef.current) return;
    wrapRef.current.style.transform = `perspective(800px) rotateX(0) rotateY(0)`;
  };

  return (
    <span
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn(
        "inline-block",
        interactive && "transition-transform duration-300 ease-out will-change-transform cursor-pointer",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        {/* Rose circle — upper-left */}
        <circle
          cx="38"
          cy="40"
          r="28"
          fill="var(--brand-muted-rose)"
          opacity="0.78"
        />
        {/* Mint circle — lower-right, overlapping */}
        <circle
          cx="62"
          cy="62"
          r="28"
          fill="var(--brand-mineral-green)"
          opacity="0.78"
        />
      </svg>
    </span>
  );
}
