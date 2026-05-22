/**
 * WordmarkIntro — landing-hero intro animation.
 *
 * The wordmark is RENDERED, not a PNG. Each letter of "constancia"
 * is an individually animated span that fades + slides into place
 * with a stagger, and two glass-morph spheres fly in from off-screen
 * to land as the rose dot above the "i" (rendered as dotless "ı")
 * and the mint period after "a". Final state: the spheres are the
 * brand dots — they literally construct the logo.
 *
 * Sequence:
 *   0 → 250ms      init      — everything hidden
 *   250 → 1400ms   letters   — letters stagger in left-to-right
 *   1400 → 2600ms  balls     — spheres fly in from off-screen corners
 *   2600 → 3400ms  settle    — spheres land at i-tittle and period
 *   3400ms+        settled   — final glass dots
 *
 * Honours prefers-reduced-motion — letters + dots fade in together
 * with no fly-in.
 */

import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface WordmarkIntroProps {
  className?: string;
}

// "constancia" with the "i" rendered as dotless ı so the flying rose
// sphere becomes its tittle. The final mint dot sits after the "a"
// as the brand period.
const LETTERS = ["c", "o", "n", "s", "t", "a", "n", "c", "ı", "a"];

export function WordmarkIntro({ className }: WordmarkIntroProps) {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [phase, setPhase] = useState<"init" | "letters" | "balls" | "settle" | "settled">("init");

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase("settled");
      return;
    }
    const t1 = window.setTimeout(() => setPhase("letters"), 250);
    const t2 = window.setTimeout(() => setPhase("balls"), 1400);
    const t3 = window.setTimeout(() => setPhase("settle"), 2600);
    const t4 = window.setTimeout(() => setPhase("settled"), 3400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      className={`wordmark-built wordmark-built--${phase} ${className ?? ""}`}
      id="hero-heading"
      role="img"
      aria-label="Constancia"
    >
      <div className="wordmark-built__row" aria-hidden="true">
        {LETTERS.map((char, i) => (
          <span
            key={i}
            className={`wordmark-built__letter${char === "ı" ? " wordmark-built__letter--i" : ""}`}
            style={{ ["--i" as any]: i }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* The two glass-morph spheres. Off-screen at init, fly in
          during "balls", settle on the brand-dot positions during
          "settle"/"settled". They're the logo's coloured dots. */}
      <span className="wordmark-built__sphere wordmark-built__sphere--rose" aria-hidden="true" />
      <span className="wordmark-built__sphere wordmark-built__sphere--mint" aria-hidden="true" />
    </div>
  );
}
