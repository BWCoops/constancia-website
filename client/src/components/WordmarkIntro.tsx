/**
 * WordmarkIntro — landing-hero wordmark.
 *
 * Renders the brand mark via <picture> so WebP-capable browsers get
 * a ~58 % smaller asset, others fall back to the PNG. Dramatic
 * small-to-large fade-in (scale 0.35 → 1 with a tiny overshoot)
 * so the logo draws the eye on first paint. Reused on the contact
 * panel at the bottom of the scrolly stage where the logo reappears.
 *
 * Honours prefers-reduced-motion — wordmark shows immediately.
 */

import { useEffect, useState } from "react";
import constanciaLogoDarkWebp from "@assets/constancia-logo-dark.webp";
import constanciaLogoDarkPng from "@assets/constancia-logo-dark.png";
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
      <picture>
        <source srcSet={constanciaLogoDarkWebp} type="image/webp" />
        <img
          src={constanciaLogoDarkPng}
          alt="Constancia"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </div>
  );
}
