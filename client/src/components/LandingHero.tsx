/**
 * LandingHero — full scrollytelling stage.
 *
 * Outer section is ~580vh tall; the inner is sticky 100vh and holds
 * the fabric shader + the mesh + a stack of glass tablets. As the
 * user scrolls, a single rAF-throttled scroll listener drives each
 * tablet's opacity + transform: tablets pop in from below, hold
 * during their active range, then pop out upward — like cards
 * sliding past the fabric.
 *
 * Panels in scroll order (active range out of 1.0):
 *   1. 0.00 – 0.15  Hero          — wordmark + mission card
 *   2. 0.22 – 0.39  Who we are
 *   3. 0.44 – 0.61  Connected     — Abacum + OneStream partners
 *   4. 0.66 – 0.83  Services      — four practices
 *   5. 0.88 – 1.00  Contact       — wordmark returns + CTA
 *
 * Below this stage the page resumes with the Footer.
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

// Active ranges per panel. Tuned so each gets ~17% of the scroll
// (the hero takes a bit less so the first impression isn't a
// lingering load state). Small gaps between panels give the eye
// time to register the swap.
const PANELS: PanelRange[] = [
  { start: 0.00, end: 0.15 },
  { start: 0.22, end: 0.39 },
  { start: 0.44, end: 0.61 },
  { start: 0.66, end: 0.83 },
  { start: 0.88, end: 1.00 },
];

const ENTER_FADE = 0.06; // scroll-fraction over which a panel fades in
const EXIT_FADE  = 0.06; // and fades out

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
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Stage the loaded class so the first wordmark's intro plays.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setTimeout(() => setLoaded(true), 30);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  // Defer the WebGL fabric to idle so first paint stays cheap.
  useEffect(() => {
    const idle = window.requestIdleCallback
      ?? ((cb: () => void) => window.setTimeout(cb, 180));
    const cancelIdle = window.cancelIdleCallback
      ?? ((id: number) => window.clearTimeout(id));
    const id = idle(() => setFabricMounted(true)) as number;
    return () => cancelIdle(id as unknown as number);
  }, []);

  // Scroll-driven panel transitions. Reads progress 0..1 across the
  // outer stage's scrollable range, then maps each panel range to
  // its opacity + translateY + scale. Updates DOM directly to avoid
  // React renders on every scroll tick.
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
  }, [prefersReducedMotion]);

  return (
    <section
      ref={stageRef}
      className={`landing-hero landing-hero--scrolly ${loaded ? "is-loaded" : ""}`}
      aria-label="Constancia"
    >
      <div className="landing-hero__inner">
        <MeshBackground className="landing-hero__mesh" />
        {fabricMounted && <HeroFabricCanvas className="landing-hero__fabric" />}

        {/* Panel 1 — Hero */}
        <div ref={(el) => { panelRefs.current[0] = el; }} className="scrolly-panel">
          <WordmarkIntro className="landing-hero__wordmark" />
          <div className="landing-hero__mission">
            <div className="glass-surface landing-hero__mission-inner">
              <div className="landing-hero__mission-eyebrow">On a mission to deliver</div>
              <div className="landing-hero__mission-lede">Real-time enterprise intelligence.</div>
            </div>
          </div>
        </div>

        {/* Panel 2 — Who we are */}
        <div ref={(el) => { panelRefs.current[1] = el; }} className="scrolly-panel">
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

        {/* Panel 3 — Connected enterprise */}
        <div ref={(el) => { panelRefs.current[2] = el; }} className="scrolly-panel">
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

        {/* Panel 4 — Services */}
        <div ref={(el) => { panelRefs.current[3] = el; }} className="scrolly-panel">
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

        {/* Panel 5 — Contact (wordmark returns) */}
        <div ref={(el) => { panelRefs.current[4] = el; }} className="scrolly-panel">
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
