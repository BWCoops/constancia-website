import { useEffect } from "react";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { LandingHero } from "@/components/LandingHero";
import { ConnectedBand } from "@/components/ConnectedBand";
import { ServicesQuadrant } from "@/components/ServicesQuadrant";
import { Footer } from "@/components/footer";
import { CookiePreferencesIcon } from "@/components/cookie-consent";
import { SEOHead } from "@/components/seo-head";
import { trackPageView, setupScrollTracking, setupDwellTimeTracking } from "@/lib/funnel-analytics";

/**
 * Constancia landing page — May 2026 Liquid Glass refresh.
 *
 * Sections in scroll order (match the chapter-nav anchors in
 * LandingHero):
 *   1. Hero          — wordmark + mission statement + chapter nav
 *   2. Who we are    — short editorial intro to Constancia
 *   3. Partners      — Connected Enterprise Business Transformation band
 *   4. Services      — four-quadrant LiquidGlassCard grid
 *   5. Contact       — short stub linking to /contact
 */

export default function Home() {
  useEffect(() => {
    trackPageView("home");
    const cleanupScroll = setupScrollTracking("home");
    const cleanupDwell = setupDwellTimeTracking("home");
    return () => {
      cleanupScroll();
      cleanupDwell();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "var(--brand-font-sans)", overflowX: "clip" }}>
      <SEOHead
        title="Constancia — Enterprise Intelligence · Abacum + OneStream Partner"
        description="Constancia is an enterprise intelligence company combining AI, advisory and development to deliver real-time insight from organisational data. Official Abacum and OneStream partner."
        keywords={[
          "enterprise intelligence",
          "AI advisory",
          "Abacum partner",
          "OneStream partner",
          "Enterprise Performance Management",
          "business transformation",
          "AI development partner",
          "finance systems integration"
        ]}
        includeOrganizationSchema={true}
      />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
      >
        Skip to main content
      </a>

      <Navigation />

      <main id="main-content">
        <LandingHero />

        {/* Who we are — short editorial intro on cream. */}
        <section id="who-we-are" className="landing-who" aria-labelledby="landing-who-heading">
          <div className="landing-who__inner">
            <div className="landing-who__eyebrow">Who we are</div>
            <h2 id="landing-who-heading" className="landing-who__heading">
              An enterprise intelligence company.
            </h2>
            <p className="landing-who__body">
              Constancia combines AI, advisory and development to deliver real-time insight from
              organisational data. We help finance and operations leaders move from debate to
              outcomes, without the manual rework in Excel and PowerPoint.
            </p>
            <Link
              href="/about"
              className="landing-who__link"
              data-testid="landing-who-link"
            >
              About Constancia →
            </Link>
          </div>
        </section>

        <ConnectedBand />
        <ServicesQuadrant />

        {/* Contact stub — full form lives at /contact. */}
        <section id="contact" className="landing-contact" aria-labelledby="landing-contact-heading">
          <div className="landing-contact__inner">
            <div className="landing-contact__eyebrow">Contact</div>
            <h2 id="landing-contact-heading" className="landing-contact__heading">
              Tell us about your data challenge.
            </h2>
            <p className="landing-contact__body">
              We'll come back within one working day. No pitch, no deck.
            </p>
            <Link
              href="/contact"
              className="landing-contact__link"
              data-testid="landing-contact-link"
            >
              Start the conversation →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <CookiePreferencesIcon />
    </div>
  );
}
