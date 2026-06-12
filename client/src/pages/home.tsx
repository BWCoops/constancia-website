import { useEffect } from "react";
import { LandingHero } from "@/components/LandingHero";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { trackPageView, setupScrollTracking, setupDwellTimeTracking } from "@/lib/funnel-analytics";

/**
 * Constancia landing page.
 *
 * The whole page is now one scrollytelling stage (<LandingHero>):
 * the fabric shader stays animated underneath while a sequence of
 * glass tablets pops in / holds / pops out as the user scrolls,
 * ending with the wordmark reappearing for the contact CTA. The
 * old "Who we are / Partners / Services / Contact" sections are
 * gone — their content now lives inside the LandingHero panels.
 *
 * Footer remains below the stage.
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

      <main id="main-content">
        <LandingHero />
      </main>

      <Footer />
    </div>
  );
}
