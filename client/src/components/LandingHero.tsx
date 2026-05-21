/**
 * LandingHero — scroll-driven assembly + Liquid Glass mission card.
 *
 * Restores the rich scroll hero (mesh waves, vendor chip assembly,
 * deconstructing logo) underneath, with the mission statement
 * layered on top in a Liquid Glass card. No right-hand chapter
 * nav — top nav handles routing.
 *
 * Layout:
 *
 *   Outer section is a 500vh tall stage; the inner is sticky so
 *   the composition stays fixed on screen while the outer scrolls.
 *   The scroll progress through the stage drives the diagram
 *   underneath, while the wordmark + mission card stay sticky in
 *   the middle.
 *
 *   Below the hero stage, ConnectedBand / ServicesQuadrant /
 *   Contact sections flow naturally (handled by home.tsx).
 *
 * Performance:
 *   - HeroConnectionDiagram is lazy-mounted via requestIdleCallback
 *     so it doesn't block first paint.
 *   - Mesh blur reduced for cheaper compositing.
 *   - rAF loop uses a 0.002 change threshold to avoid waste.
 *   - The wordmark is the actual brand mark scaling into place —
 *     no abstract converging dots.
 */

import { useEffect, useRef, useState } from "react";
import constanciaLogoDark from "@assets/constancia-logo-dark.png";
import { MeshBackground } from "./MeshBackground";
import { LiquidGlassCard } from "@/components/ui/LiquidGlassCard";
import { HeroConnectionDiagram, type HeroDiagramHandle } from "./hero/HeroConnectionDiagram";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function LandingHero() {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [loaded, setLoaded] = useState(prefersReducedMotion);
  const [diagramMounted, setDiagramMounted] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const diagramRef = useRef<HeroDiagramHandle | null>(null);

  // Stage the loaded class after mount so the wordmark + mission
  // card scale-fade-in sequence fires. With reduced motion the
  // flag is true from the start and everything appears immediately.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setTimeout(() => setLoaded(true), 30);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  // Defer the heavy connection diagram to idle so it doesn't block
  // first paint of the wordmark + mission card.
  useEffect(() => {
    const idle = window.requestIdleCallback
      ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancelIdle = window.cancelIdleCallback
      ?? ((id: number) => window.clearTimeout(id));
    const id = idle(() => setDiagramMounted(true)) as number;
    return () => cancelIdle(id as unknown as number);
  }, []);

  // Scroll-driven diagram. rAF loop reads stage position and calls
  // setProgress imperatively — no React state during scroll.
  useEffect(() => {
    if (!diagramMounted) return;
    if (prefersReducedMotion) {
      diagramRef.current?.setProgress(0.18);
      return;
    }
    let rafId = 0;
    let lastProg = -1;
    const tick = () => {
      const stage = stageRef.current;
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const total = stage.offsetHeight - window.innerHeight;
        const prog = total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : 0;
        if (Math.abs(prog - lastProg) > 0.002) {
          lastProg = prog;
          diagramRef.current?.setProgress(prog);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [diagramMounted, prefersReducedMotion]);

  return (
    <section
      ref={stageRef}
      className={`landing-hero ${loaded ? "is-loaded" : ""}`}
      aria-labelledby="hero-heading"
      data-hero-stage
    >
      <div className="landing-hero__inner">
        {/* Background: animated mesh waves. */}
        <MeshBackground className="landing-hero__mesh" />

        {/* Connection diagram — scroll-driven, lazy-mounted. */}
        {diagramMounted && (
          <div className="landing-hero__diagram">
            <HeroConnectionDiagram ref={diagramRef} />
          </div>
        )}

        {/* Centre stack: wordmark scales into place from a small
            point on load (the brand mark is the intro animation —
            no abstract dots), then sits centred while the diagram
            animates beneath. Mission statement floats below in a
            Liquid Glass card. */}
        <div className="landing-hero__content">
          <img
            src={constanciaLogoDark}
            alt="Constancia"
            className="landing-hero__wordmark"
            id="hero-heading"
            decoding="async"
            fetchPriority="high"
          />

          <div className="landing-hero__mission">
            <LiquidGlassCard variant="hero" cornerRadius={28}>
              <div className="landing-hero__mission-inner">
                <div className="landing-hero__mission-eyebrow">On a mission to deliver</div>
                <div className="landing-hero__mission-lede">real-time enterprise intelligence.</div>
              </div>
            </LiquidGlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
