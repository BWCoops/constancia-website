/**
 * WordmarkIntro — landing-hero wordmark.
 *
 * Renders the brand PNG with a soft opacity + scale fade-in. The
 * spheres / constructed-text experiments are gone for now — we
 * need brand consistency first; we can add a deconstruction-on-
 * scroll effect (or a constructed intro) on top of this baseline
 * later.
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
        id="hero-heading"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
