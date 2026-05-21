/**
 * LandingHero — Liquid Glass treatment for the new home page.
 *
 * Replaces the previous 1000vh sticky scroll-driven hero. New design
 * per the brief is intentionally calmer: an enlarged centred
 * wordmark, the mission statement in a Liquid Glass card directly
 * beneath, and a right-hand chapter-style nav (sticky scroll-spy)
 * jumping to the page's main sections.
 *
 * Loading sequence (~1.2s total, skipped when prefers-reduced-motion):
 *   0-400ms    two circles converge into the wordmark
 *   300-700ms  wordmark fades in
 *   500-900ms  mesh background fades in
 *   800-1100ms mission statement fades up
 *   1000-1200ms right-hand chapter nav slides in from the right
 *
 * The connectivity diagram + deconstructing wordmark used to live
 * here. They've moved to /services (AI Development Partner section)
 * per the brief.
 */

import { useEffect, useState } from "react";
import constanciaLogoDark from "@assets/constancia-logo-dark.png";
import { MeshBackground } from "./MeshBackground";
import { LiquidGlassCard } from "@/components/ui/LiquidGlassCard";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Chapter {
  id: string;
  label: string;
}

const CHAPTERS: Chapter[] = [
  { id: "who-we-are", label: "Who we are" },
  { id: "partners",   label: "Partners" },
  { id: "services",   label: "Services" },
  { id: "contact",    label: "Contact" },
];

export function LandingHero() {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // Bumped to true at the end of the load sequence so CSS reveals
  // the staged layers via the `.is-loaded` class.
  const [loaded, setLoaded] = useState(prefersReducedMotion);
  const [activeChapter, setActiveChapter] = useState<string>(CHAPTERS[0].id);

  // Stage the loaded flag so CSS keyframes can pace themselves off
  // the mount. With reduced motion the flag is true from the start
  // and nothing animates.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setTimeout(() => setLoaded(true), 50);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  // Sticky scroll-spy. IntersectionObserver fires whenever a chapter
  // section enters / leaves the viewport; we pick whichever is
  // closest to the top to drive the right-hand nav indicator.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const targets = CHAPTERS
      .map(ch => document.getElementById(ch.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        // Pick the section whose top is closest to the viewport top
        // among those currently intersecting.
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        if (visible[0]) {
          setActiveChapter(visible[0].target.id);
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
    );
    targets.forEach(t => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={`landing-hero ${loaded ? "is-loaded" : ""}`}
      aria-labelledby="hero-heading"
    >
      {/* Background layers — mesh + grain. Sit at z-index 0. */}
      <MeshBackground className="landing-hero__mesh" />

      {/* Converging circles intro — purely decorative, faded out
          once the wordmark is in. */}
      <div className="landing-hero__intro" aria-hidden="true">
        <span className="landing-hero__circle landing-hero__circle--rose" />
        <span className="landing-hero__circle landing-hero__circle--mint" />
      </div>

      {/* Centre stack: wordmark + Liquid Glass mission card. */}
      <div className="landing-hero__content">
        <img
          src={constanciaLogoDark}
          alt="Constancia"
          className="landing-hero__wordmark"
          id="hero-heading"
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

      {/* Right-hand sticky chapter nav. Keyboard-navigable. */}
      <nav
        className="landing-hero__chapters"
        aria-label="Page sections"
      >
        <ol>
          {CHAPTERS.map((ch, idx) => (
            <li
              key={ch.id}
              className={ch.id === activeChapter ? "is-active" : ""}
            >
              <a
                href={`#${ch.id}`}
                aria-current={ch.id === activeChapter ? "true" : undefined}
              >
                <span className="landing-hero__chapter-num">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="landing-hero__chapter-label">{ch.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}
