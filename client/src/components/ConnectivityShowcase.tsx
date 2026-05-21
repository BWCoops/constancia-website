/**
 * ConnectivityShowcase — auto-looping wrapper around
 * HeroConnectionDiagram.
 *
 * Used inside the Services page (AI Development Partner section).
 * The diagram was originally driven by scroll progress on the home
 * hero; here we play it on a self-contained loop instead. Each
 * cycle plays the assembly, holds for a beat, then resets.
 *
 * Pauses the loop when the showcase is off-screen so we don't burn
 * frames for no one.
 */

import { useEffect, useRef } from "react";
import { HeroConnectionDiagram, type HeroDiagramHandle } from "./hero/HeroConnectionDiagram";

interface ConnectivityShowcaseProps {
  /** Total duration of one full loop in seconds (assembly + hold + reset). */
  loopSeconds?: number;
  className?: string;
}

export function ConnectivityShowcase({ loopSeconds = 14, className }: ConnectivityShowcaseProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const diagramRef = useRef<HeroDiagramHandle | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let inView = false;
    let rafId = 0;
    let startedAt = performance.now();

    // Honour reduced-motion — render the diagram in its assembled
    // state and skip the loop entirely.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      diagramRef.current?.setProgress(0.85);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        inView = entries[0]?.isIntersecting ?? false;
        if (inView) startedAt = performance.now();
      },
      { threshold: 0.2 },
    );
    observer.observe(wrapper);

    const tick = () => {
      if (inView) {
        // Map elapsed time to a 0-1 progress that follows the
        // hero's two-cycle timing: assembly → hold → fade → reset.
        // Compress into a single cycle (skip the dead zone) since
        // we don't have body panels eating the middle.
        const elapsed = (performance.now() - startedAt) / 1000;
        const phase = (elapsed % loopSeconds) / loopSeconds;
        // Map 0..1 phase to the diagram's cycle 1 + hold (0..0.28).
        const mapped = phase * 0.28;
        diagramRef.current?.setProgress(mapped);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [loopSeconds]);

  return (
    <div
      ref={wrapperRef}
      className={`connectivity-showcase ${className ?? ""}`}
      data-hero-stage
      aria-label="System integrations connecting into Constancia"
    >
      <HeroConnectionDiagram ref={diagramRef} />
    </div>
  );
}
