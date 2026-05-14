import { useEffect, lazy, Suspense } from "react";
import { Navigation } from "@/components/navigation";
import { HeroSectionStatic } from "@/components/hero-section-static";
import { HomeTicker } from "@/components/home/HomeTicker";
import { Footer } from "@/components/footer";
import { CookiePreferencesIcon } from "@/components/cookie-consent";
import { SEOHead } from "@/components/seo-head";
import { trackPageView, setupScrollTracking, setupDwellTimeTracking } from "@/lib/funnel-analytics";

const BelowFoldSections = lazy(() => 
  import("@/components/home/BelowFoldSections").then(m => ({ default: m.BelowFoldSections }))
);

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
    <div className="min-h-screen bg-background overflow-x-hidden" style={{ fontFamily: 'var(--hp-font-sans)' }}>
      <SEOHead
        title="1QG | Independent Enterprise Performance Management Advisory"
        description="Independent Enterprise Performance Management advisory for finance leaders. Platform selection, transformation planning, and AI readiness from senior practitioners."
        keywords={[
          "Enterprise Performance Management",
          "finance transformation",
          "EPM comparison tools",
          "fractional advisory",
          "independent advisory"
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

      <main id="main-content" className="pt-16 sm:pt-20">
        <HomeTicker />
        <HeroSectionStatic />
        
        <Suspense fallback={null}>
          <BelowFoldSections />
        </Suspense>
      </main>

      <Footer />
      <CookiePreferencesIcon />
    </div>
  );
}
