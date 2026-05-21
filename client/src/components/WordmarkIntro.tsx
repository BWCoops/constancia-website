/**
 * WordmarkIntro — landing-hero intro animation.
 *
 * Sequence on first paint:
 *   1. Two oversized frosted-glass spheres fly in from off-screen (one
 *      rose from the top-right, one mint from the bottom-left).
 *   2. They converge towards the centre of the hero with a spring-out
 *      easing, scaling down as they near the wordmark anchor.
 *   3. The wordmark scales up from 0.4 → 1 with an overshoot bounce,
 *      passing through the converging spheres so the "i" dot and the
 *      "a." dot in the logo line up with where the spheres settle.
 *   4. After ~1.6s the spheres dissolve into the wordmark's baked-in
 *      brand circles (opacity 1 → 0.18 over 600ms), leaving the
 *      logo standing alone.
 *
 * Honours prefers-reduced-motion — the spheres skip the fly-in and
 * just fade in alongside the wordmark.
 *
 * Glass effect: each sphere is a radial gradient with a strong inner
 * highlight + 28px backdrop-blur ring + saturated colour core, so it
 * reads as 3D glass rather than a flat circle.
 */

import { useEffect, useState } from "react";
import constanciaLogoDark from "@assets/constancia-logo-dark.png";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface WordmarkIntroProps {
  className?: string;
}

export function WordmarkIntro({ className }: WordmarkIntroProps) {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [phase, setPhase] = useState<"init" | "fly" | "settle" | "dissolve">("init");

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase("dissolve");
      return;
    }
    // Sequence the phases so the spheres lead the wordmark by ~400ms
    // and then dissolve once the logo is on screen. Timing tuned for
    // the fly-in to be visible to the user — quicker than this and
    // the spheres just appear settled, slower and the page feels
    // unresponsive.
    const t1 = window.setTimeout(() => setPhase("fly"), 200);
    const t2 = window.setTimeout(() => setPhase("settle"), 1600);
    const t3 = window.setTimeout(() => setPhase("dissolve"), 2800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [prefersReducedMotion]);

  return (
    <div className={`wordmark-intro wordmark-intro--${phase} ${className ?? ""}`}>
      {/* Two glass-morph spheres — one rose, one mint. Sized to roughly
          match the brand circles in the wordmark when settled, but
          start much larger so the fly-in feels weighty. */}
      <span className="wordmark-intro__sphere wordmark-intro__sphere--rose" aria-hidden="true" />
      <span className="wordmark-intro__sphere wordmark-intro__sphere--mint" aria-hidden="true" />

      <img
        src={constanciaLogoDark}
        alt="Constancia"
        className="wordmark-intro__wordmark"
        id="hero-heading"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
