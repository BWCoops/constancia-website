import { useEffect, Component } from "react";
import { Navigation } from "@/components/navigation";
import { HeroSectionStatic } from "@/components/hero-section-static";
import { Footer } from "@/components/footer";
import { CookiePreferencesIcon } from "@/components/cookie-consent";
import { SEOHead } from "@/components/seo-head";
import { trackPageView, setupScrollTracking, setupDwellTimeTracking } from "@/lib/funnel-analytics";

class HeroErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: '#F6F3EE' }}
        />
      );
    }
    return this.props.children;
  }
}

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
        title="Constancia | Independent Enterprise Performance Management Advisory"
        description="Independent Enterprise Performance Management advisory for finance leaders. Senior practitioners, AI-augmented tooling, fixed-fee delivery."
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

      <main id="main-content">
        <HeroErrorBoundary>
          <HeroSectionStatic />
        </HeroErrorBoundary>
      </main>

      <Footer />
      <CookiePreferencesIcon />
    </div>
  );
}
