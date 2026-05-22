/**
 * LandingHero — full scrollytelling stage.
 *
 * First impression is the wordmark alone on a calm cream surface
 * (mesh ambient stays subtle, fabric is hidden). As the user starts
 * to scroll, the fabric shader fades in underneath and the rest of
 * the page reveals as a sequence of glass tablets popping in / out
 * over the fabric — ending with the wordmark returning for the
 * contact CTA.
 *
 * Panels in scroll order (active range out of 1.0):
 *   1. 0.00 – 0.10  Wordmark alone (calm intro)
 *   2. 0.16 – 0.30  Mission card  — "On a mission to deliver..."
 *   3. 0.36 – 0.50  Who we are
 *   4. 0.56 – 0.70  Connected     — Abacum + OneStream partners
 *   5. 0.74 – 0.86  Services      — four practices
 *   6. 0.90 – 1.00  Contact       — wordmark returns + CTA
 *
 * Fabric shader opacity is tied to scroll progress (0 → 1 between
 * scroll 0.08 and 0.20) so the calm opening reads as truly calm,
 * then the world comes alive as you scroll.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { MeshBackground } from "./MeshBackground";
import { HeroFabricCanvas } from "./HeroFabricCanvas";
import { WordmarkIntro } from "./WordmarkIntro";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface PanelRange {
  start: number;
  end: number;
}

const PANELS: PanelRange[] = [
  { start: 0.00, end: 0.10 }, // wordmark alone
  { start: 0.16, end: 0.30 }, // mission card
  { start: 0.36, end: 0.50 }, // who we are
  { start: 0.56, end: 0.70 }, // connected
  { start: 0.74, end: 0.86 }, // services
  { start: 0.90, end: 1.00 }, // contact (wordmark returns)
];

const ENTER_FADE = 0.05;
const EXIT_FADE  = 0.05;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const SERVICES = [
  { eyebrow: "Service 01", title: "AI Advisory & Roadmapping", body: "Education, benchmarking, use case development, P&L and ROI modelling." },
  { eyebrow: "Service 02", title: "Enterprise Performance Management", body: "Management reporting, statutory consolidation, financial planning and analysis, narrative reporting." },
  { eyebrow: "Service 03", title: "Software & AI Development", body: "Edge-case AI use case development, model build, custom application development." },
  { eyebrow: "Service 04", title: "Business Transformation Advisory", body: "Operating model design, M&A integration, value realisation." },
];

export function LandingHero() {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [loaded, setLoaded] = useState(prefersReducedMotion);
  const [fabricMounted, setFabricMounted] = useState(false);

  const stageRef = useRef<HTMLElement | null>(null);
  const fabricRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setTimeout(() => setLoaded(true), 30);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  useEffect(() => {
    const idle = window.requestIdleCallback
      ?? ((cb: () => void) => window.setTimeout(cb, 180));
    const cancelIdle = window.cancelIdleCallback
      ?? ((id: number) => window.clearTimeout(id));
    const id = idle(() => setFabricMounted(true)) as number;
    return () => cancelIdle(id as unknown as number);
  }, []);

  // Scroll-driven panels + fabric reveal.
  useEffect(() => {
    if (prefersReducedMotion) {
      panelRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.opacity = i === 0 ? "1" : "0.92";
        el.style.transform = "translateY(0) scale(1)";
      });
      if (fabricRef.current) fabricRef.current.style.opacity = "1";
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

      PANELS.forEach((range, i) => {
        const panel = panelRefs.current[i];
        if (!panel) return;

        let opacity: number;
        let translateY: number;
        let scale: number;

        if (p < range.start - ENTER_FADE) {
          opacity = 0;
          translateY = 80;
          scale = 0.92;
        } else if (p < range.start) {
          const t = (p - (range.start - ENTER_FADE)) / ENTER_FADE;
          opacity = t;
          translateY = 80 * (1 - t);
          scale = 0.92 + 0.08 * t;
        } else if (p <= range.end) {
          opacity = 1;
          translateY = 0;
          scale = 1;
        } else if (p < range.end + EXIT_FADE) {
          const t = (p - range.end) / EXIT_FADE;
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
  }, [prefersReducedMotion, fabricMounted]);

  return (
    <section
      ref={stageRef}
      className={`landing-hero landing-hero--scrolly ${loaded ? "is-loaded" : ""}`}
      aria-label="Constancia"
    >
      <div className="landing-hero__inner">
        <MeshBackground className="landing-hero__mesh" />
        {fabricMounted && (
          <div ref={fabricRef} className="landing-hero__fabric-wrap">
            <HeroFabricCanvas className="landing-hero__fabric" />
          </div>
        )}

        {/* Panel 1 — Wordmark alone (calm cream opening) */}
        <div ref={(el) => { panelRefs.current[0] = el; }} className="scrolly-panel scrolly-panel--solo">
          <WordmarkIntro className="landing-hero__wordmark" />
        </div>

        {/* Panel 2 — Mission card */}
        <div ref={(el) => { panelRefs.current[1] = el; }} className="scrolly-panel">
          <div className="landing-hero__mission">
            <div className="glass-surface landing-hero__mission-inner">
              <div className="landing-hero__mission-eyebrow">On a mission to deliver</div>
              <div className="landing-hero__mission-lede">Real-time enterprise intelligence.</div>
            </div>
          </div>
        </div>

        {/* Panel 3 — Who we are */}
        <div ref={(el) => { panelRefs.current[2] = el; }} className="scrolly-panel">
          <div className="glass-surface scrolly-tablet">
            <div className="scrolly-tablet__eyebrow">Who we are</div>
            <h2 className="scrolly-tablet__heading">An enterprise intelligence company.</h2>
            <p className="scrolly-tablet__body">
              Constancia combines AI, advisory and development to deliver real-time insight from
              organisational data. We help finance and operations leaders move from debate to
              outcomes, without the manual rework in Excel and PowerPoint.
            </p>
            <Link href="/about" className="scrolly-tablet__link" data-testid="landing-who-link">
              About Constancia →
            </Link>
          </div>
        </div>

        {/* Panel 4 — Connected enterprise */}
        <div ref={(el) => { panelRefs.current[3] = el; }} className="scrolly-panel">
          <div className="glass-surface scrolly-tablet">
            <div className="scrolly-tablet__eyebrow">Connected Enterprise Business Transformation</div>
            <h2 className="scrolly-tablet__heading">
              Keep your finance function{" "}
              <em className="scrolly-tablet__heading-accent">finally connected</em>.
            </h2>
            <p className="scrolly-tablet__sub">Proudly partnering with Abacum and OneStream.</p>
            <p className="scrolly-tablet__body">
              Make sense of your finance data from ERP and EPM. One source of truth across every system you own.
            </p>
          </div>
        </div>

        {/* Panel 5 — Services */}
        <div ref={(el) => { panelRefs.current[4] = el; }} className="scrolly-panel">
          <div className="glass-surface scrolly-tablet scrolly-tablet--wide">
            <div className="scrolly-tablet__eyebrow">What we do</div>
            <h2 className="scrolly-tablet__heading">Four practices, one outcome.</h2>
            <div className="scrolly-services">
              {SERVICES.map((s) => (
                <article key={s.title} className="scrolly-services__item">
                  <div className="scrolly-services__eyebrow">{s.eyebrow}</div>
                  <h3 className="scrolly-services__title">{s.title}</h3>
                  <p className="scrolly-services__body">{s.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 6 — Contact (wordmark returns) */}
        <div ref={(el) => { panelRefs.current[5] = el; }} className="scrolly-panel">
          <WordmarkIntro className="landing-hero__wordmark landing-hero__wordmark--contact" />
          <div className="landing-hero__mission">
            <div className="glass-surface landing-hero__mission-inner">
              <div className="landing-hero__mission-eyebrow">Contact</div>
              <div className="landing-hero__mission-lede">Tell us about your data challenge.</div>
              <Link href="/contact" className="scrolly-tablet__link" data-testid="landing-contact-link">
                Start the conversation →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
