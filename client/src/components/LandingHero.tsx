/**
 * LandingHero — soft 3D fabric shader under Apple Liquid Glass card.
 *
 * No chip-assembly diagram. No converging dots. The hero is the
 * fabric shader (5 stacked WebGL planes flowing with brand-coloured
 * displacement) softly waving beneath the wordmark, with the
 * mission statement in a Liquid Glass card that refracts the
 * fabric directly underneath it (that's where the Apple effect
 * actually reads — the displacement map needs varied colour to
 * refract against).
 *
 * Layer stack (back to front):
 *   1. Mesh blob drift (very soft ambient)
 *   2. HeroFabricCanvas (the 3D wave/band shader)
 *   3. Continuous wave rings (subtle CSS pulses from centre)
 *   4. Wordmark + Liquid Glass mission card
 *
 * Outer section is 320vh tall; the inner is sticky so the fabric
 * keeps flowing while the user scrolls toward the body sections
 * below. Below the hero the page resumes normal flow with the
 * connected band / services / contact sections.
 */

import { useEffect, useState } from "react";
import { MeshBackground } from "./MeshBackground";
import { HeroFabricCanvas } from "./HeroFabricCanvas";
import { WordmarkIntro } from "./WordmarkIntro";
import { LiquidGlassCard } from "@/components/ui/LiquidGlassCard";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function LandingHero() {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [loaded, setLoaded] = useState(prefersReducedMotion);
  const [fabricMounted, setFabricMounted] = useState(false);

  // Stage the loaded class after mount so the wordmark + mission
  // card fade-in sequence fires. Reduced motion shows everything
  // immediately.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setTimeout(() => setLoaded(true), 30);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  // Defer the WebGL fabric shader to idle so it doesn't block the
  // first paint of the wordmark + mission card.
  useEffect(() => {
    const idle = window.requestIdleCallback
      ?? ((cb: () => void) => window.setTimeout(cb, 180));
    const cancelIdle = window.cancelIdleCallback
      ?? ((id: number) => window.clearTimeout(id));
    const id = idle(() => setFabricMounted(true)) as number;
    return () => cancelIdle(id as unknown as number);
  }, []);

  return (
    <section
      className={`landing-hero ${loaded ? "is-loaded" : ""}`}
      aria-labelledby="hero-heading"
    >
      <div className="landing-hero__inner">
        {/* 1. Soft ambient mesh drift. */}
        <MeshBackground className="landing-hero__mesh" />

        {/* 2. 3D fabric / wave / band shader — the main visual.
           Lazy-mounted via requestIdleCallback so first paint stays
           cheap. WebGL failure is silent (no crash on weak GPUs). */}
        {fabricMounted && <HeroFabricCanvas className="landing-hero__fabric" />}

        {/* 3. Centre stack: wordmark scales into place + Liquid
           Glass mission card refracts the fabric beneath. */}
        <div className="landing-hero__content">
          <WordmarkIntro className="landing-hero__wordmark" />

          <div className="landing-hero__mission">
            <LiquidGlassCard variant="hero" cornerRadius={28}>
              <div className="landing-hero__mission-inner">
                <div className="landing-hero__mission-eyebrow">On a mission to deliver</div>
                <div className="landing-hero__mission-lede">Real-time enterprise intelligence.</div>
              </div>
            </LiquidGlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
