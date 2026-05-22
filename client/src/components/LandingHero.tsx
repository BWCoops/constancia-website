/**
 * LandingHero — home scrollytelling stage.
 *
 * Thin wrapper around the shared <ScrollyStage>. Each direct child
 * becomes a panel; ScrollyStage handles the fabric / mesh / scroll-
 * driven opacity + transform. Panel content is the only thing
 * unique to this page.
 *
 * Panels in scroll order:
 *   0. Wordmark alone (calm opening)
 *   1. Mission card
 *   2. Who we are
 *   3. Connected enterprise (Abacum + OneStream)
 *   4. Services (four practices)
 *   5. Contact — wordmark returns + CTA
 */

import { Link } from "wouter";
import { ScrollyStage } from "./ScrollyStage";
import { WordmarkIntro } from "./WordmarkIntro";

const SERVICES = [
  { eyebrow: "Service 01", title: "AI Advisory & Roadmapping", body: "Education, benchmarking, use case development, P&L and ROI modelling." },
  { eyebrow: "Service 02", title: "Enterprise Performance Management", body: "Management reporting, statutory consolidation, financial planning and analysis, narrative reporting." },
  { eyebrow: "Service 03", title: "Software & AI Development", body: "Edge-case AI use case development, model build, custom application development." },
  { eyebrow: "Service 04", title: "Business Transformation Advisory", body: "Operating model design, M&A integration, value realisation." },
];

const HERO_RANGES = [
  { start: 0.00, end: 0.10 }, // wordmark alone
  { start: 0.16, end: 0.30 }, // mission card
  { start: 0.36, end: 0.50 }, // who we are
  { start: 0.56, end: 0.70 }, // connected
  { start: 0.74, end: 0.86 }, // services
  { start: 0.90, end: 1.00 }, // contact
];

export function LandingHero() {
  return (
    <ScrollyStage heightVh={580} heightVhMobile={540} ranges={HERO_RANGES}>
      {/* Panel 1 — Wordmark alone */}
      <WordmarkIntro className="landing-hero__wordmark" />

      {/* Panel 2 — Mission card */}
      <div className="landing-hero__mission">
        <div className="glass-surface landing-hero__mission-inner">
          <div className="landing-hero__mission-eyebrow">On a mission to deliver</div>
          <div className="landing-hero__mission-lede">Real-time enterprise intelligence.</div>
        </div>
      </div>

      {/* Panel 3 — Who we are */}
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

      {/* Panel 4 — Connected enterprise */}
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

      {/* Panel 5 — Services */}
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

      {/* Panel 6 — Contact (wordmark returns) */}
      <div className="scrolly-panel--stacked">
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
    </ScrollyStage>
  );
}
