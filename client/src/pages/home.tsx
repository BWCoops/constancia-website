import { useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { HeroSectionStatic } from "@/components/hero-section-static";
import { Footer } from "@/components/footer";
import { CookiePreferencesIcon } from "@/components/cookie-consent";
import { SEOHead } from "@/components/seo-head";
import { trackPageView, setupScrollTracking, setupDwellTimeTracking } from "@/lib/funnel-analytics";

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
    <div className="min-h-screen bg-background" style={{ fontFamily: 'var(--brand-font-sans)', overflowX: 'clip' }}>
      <SEOHead
        title="Constancia — Connected Finance Intelligence · Abacum + OneStream Partner"
        description="Connected finance intelligence. Make sense of your finance data, from ERP to EPM, and everything in between. Official Abacum partner for mid-market FP&A. OneStream partner for enterprise."
        keywords={[
          "connected finance intelligence",
          "enterprise finance intelligence",
          "Abacum partner",
          "OneStream partner",
          "AI-first EPM",
          "Enterprise Performance Management",
          "finance transformation",
          "FP&A connectivity",
          "ERP EPM integration"
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
        <HeroSectionStatic />
      </main>

      <Footer />
      <CookiePreferencesIcon />
    </div>
  );
}
