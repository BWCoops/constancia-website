/**
 * ScrollyStage — reusable scrollytelling shell.
 *
 * Renders a tall outer section with a sticky 100vh inner that holds
 * the fabric shader + mesh background + a stack of "panels". Each
 * direct child becomes a panel; the stage drives each panel's
 * opacity + transform from scroll progress so they pop in / hold /
 * pop out as the user scrolls.
 *
 * Used by LandingHero (home) and every public marketing sub-page
 * (About / Services / Solutions / Day-to-Day AI / Toolkit / Contact)
 * so the look-and-feel is consistent.
 *
 * Parameterisation:
 *   - heightVh — total scroll length of the stage. Default 580vh.
 *   - ranges    — custom per-panel active ranges. If omitted, panels
 *                 are distributed evenly across [0..1] with small
 *                 gaps for fade.
 *   - enterFade / exitFade — scroll fraction over which each panel
 *                 fades in / out (default 0.05 each).
 *
 * Functional pages (Comparison Tool, Finance Compass, Vendor
 * Directory, Admin) deliberately do NOT use this component — they
 * need plain top-down layouts for data work.
 */

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { MeshBackground } from "./MeshBackground";
import { HeroFabricCanvas } from "./HeroFabricCanvas";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export interface PanelRange {
  start: number;
  end: number;
}

interface ScrollyStageProps {
  children: ReactNode;
  /** Total stage height (outer section) in vh. Default 580. */
  heightVh?: number;
  /** Same, for narrow viewports. Default 520. */
  heightVhMobile?: number;
  /** Override per-panel active ranges. If omitted, evenly spaced. */
  ranges?: PanelRange[];
  /** Scroll fraction each panel takes fading in. Default 0.05. */
  enterFade?: number;
  /** Scroll fraction each panel takes fading out. Default 0.05. */
  exitFade?: number;
  /** `aria-label` for the section. */
  label?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function autoRanges(n: number): PanelRange[] {
  if (n <= 0) return [];
  if (n === 1) return [{ start: 0, end: 1 }];
  const seg = 1 / n;
  const padding = Math.min(0.04, seg * 0.18);
  return Array.from({ length: n }, (_, i) => ({
    start: i === 0 ? 0 : i * seg + padding,
    end: i === n - 1 ? 1 : (i + 1) * seg - padding,
  }));
}

export function ScrollyStage({
  children,
  heightVh = 580,
  heightVhMobile = 520,
  ranges,
  enterFade = 0.05,
  exitFade = 0.05,
  label = "Constancia",
}: ScrollyStageProps) {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [fabricMounted, setFabricMounted] = useState(false);

  const stageRef = useRef<HTMLElement | null>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const childArray = Children.toArray(children);
  const panelCount = childArray.length;
  const resolvedRanges = ranges ?? autoRanges(panelCount);

  // Defer the WebGL fabric to idle so first paint stays cheap.
  useEffect(() => {
    const idle = window.requestIdleCallback
      ?? ((cb: () => void) => window.setTimeout(cb, 180));
    const cancelIdle = window.cancelIdleCallback
      ?? ((id: number) => window.clearTimeout(id));
    const id = idle(() => setFabricMounted(true)) as number;
    return () => cancelIdle(id as unknown as number);
  }, []);

  // Scroll-driven panel transitions.
  useEffect(() => {
    if (prefersReducedMotion) {
      panelRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.opacity = i === 0 ? "1" : "0.92";
        el.style.transform = "translateY(0) scale(1)";
      });
      return;
    }

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      const p = clamp(-rect.top / total, 0, 1);

      resolvedRanges.forEach((range, i) => {
        const panel = panelRefs.current[i];
        if (!panel) return;

        let opacity: number;
        let translateY: number;
        let scale: number;

        if (p < range.start - enterFade) {
          opacity = 0;
          translateY = 80;
          scale = 0.92;
        } else if (p < range.start) {
          const t = (p - (range.start - enterFade)) / enterFade;
          opacity = t;
          translateY = 80 * (1 - t);
          scale = 0.92 + 0.08 * t;
        } else if (p <= range.end) {
          opacity = 1;
          translateY = 0;
          scale = 1;
        } else if (p < range.end + exitFade) {
          const t = (p - range.end) / exitFade;
          opacity = 1 - t;
          translateY = -80 * t;
          scale = 1 - 0.08 * t;
        } else {
          opacity = 0;
          translateY = -80;
          scale = 0.92;
        }

        panel.style.opacity = String(opacity);
        panel.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
      });
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [prefersReducedMotion, panelCount, enterFade, exitFade, resolvedRanges]);

  return (
    <section
      ref={stageRef}
      className="scrolly-stage"
      style={{
        // CSS picks these up so consumers can tune per-page height.
        ["--scrolly-h" as never]: `${heightVh}vh`,
        ["--scrolly-h-mobile" as never]: `${heightVhMobile}vh`,
      }}
      aria-label={label}
    >
      <div className="scrolly-stage__inner">
        <MeshBackground className="scrolly-stage__mesh" />
        {fabricMounted && (
          <div className="scrolly-stage__fabric-wrap">
            <HeroFabricCanvas className="scrolly-stage__fabric" />
          </div>
        )}
        {childArray.map((child, i) => (
          <div
            key={i}
            ref={(el) => { panelRefs.current[i] = el; }}
            className="scrolly-panel"
          >
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}
