/**
 * WordmarkIntro — landing-hero wordmark.
 *
 * Renders the brand PNG with a dramatic small-to-large fade-in
 * (scale 0.35 → 1.04 → 1, with a tiny overshoot bounce) so the
 * logo draws the eye on first paint. Reused on the contact panel
 * at the bottom of the scrolly stage where the logo reappears.
 *
 * Honours prefers-reduced-motion — wordmark shows immediately.
 */

import { useEffect, useState } from "react";
import constanciaLogoDark from "@assets/constancia-logo-dark.png";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface WordmarkIntroProps {
  className?: string;
}

export function WordmarkIntro({ className }: WordmarkIntroProps) {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [loaded, setLoaded] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setTimeout(() => setLoaded(true), 80);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  return (
    <div className={`wordmark-img ${loaded ? "is-loaded" : ""} ${className ?? ""}`}>
      <img
        src={constanciaLogoDark}
        alt="Constancia"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
