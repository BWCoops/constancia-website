import { useEffect, useRef, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LazyMotionProvider } from "@/components/lazy-motion-provider";
import { CookieConsentBanner, CookiePreferencesModal } from "@/components/cookie-consent";
import { LibraryNavigation } from "@/components/LibraryNavigation";
import { GlassFilterDef } from "@/components/ui/GlassSurface";
import { VisitorProvider } from "@/contexts/VisitorContext";
import { initializeImagePreconnects, preloadCriticalImages, preloadPriorityRoutes, preloadHeavyRoutes } from "@/lib/preload";
import { initAdClickTracker } from "@/lib/ad-click-tracker";
import { FeatureFlagProvider, useFeatureFlags } from "@/lib/feature-flags";
import { LoadingFallback } from "@/components/loading-spinner";
import { FinanceCompassLoading } from "@/components/finance-compass-loading";
import { AdminLoadingFallback } from "@/components/admin/AdminLoadingFallback";
import type { FeatureFlags } from "@shared/feature-flags";

import NotFound from "@/pages/not-found";
import Home from "@/pages/holding";
const AboutPage = lazy(() => import("@/pages/about"));
const ServicesPage = lazy(() => import("@/pages/services"));
const SolutionsPage = lazy(() => import("@/pages/solutions"));
const ContactPage = lazy(() => import("@/pages/contact"));
const BlogPage = lazy(() => import("@/pages/blog"));
const BlogPostPage = lazy(() => import("@/pages/blog-post"));
const FilesPage = lazy(() => import("@/pages/files"));
const ExportPage = lazy(() => import("@/pages/export"));
const EPMComparisonPage = lazy(() => import("@/pages/epm-comparison"));
const TermsOfUsePage = lazy(() => import("@/pages/terms"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy"));
const CookiePolicyPage = lazy(() => import("@/pages/cookies"));

const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminAccessDenied = lazy(() => import("@/pages/admin/AdminAccessDenied"));
const AdminHub = lazy(() => import("@/pages/admin/AdminHub"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminBlogPosts = lazy(() => import("@/pages/admin/AdminBlogPosts"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminResources = lazy(() => import("@/pages/admin/AdminResources"));
const AdminContentChecker = lazy(() => import("@/pages/admin/AdminContentChecker"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminMarketingAssets = lazy(() => import("@/pages/admin/AdminMarketingAssets"));
const AdminSecurity = lazy(() => import("@/pages/admin/AdminSecurity"));
const AdminSecurityMfaVerify = lazy(() => import("@/pages/admin/AdminSecurityMfaVerify"));
const AdminGuardrails = lazy(() => import("@/pages/admin/AdminGuardrails"));
const AdminDownloads = lazy(() => import("@/pages/admin/AdminDownloads"));
const AdminOperations = lazy(() => import("@/pages/admin/AdminOperations"));
const AdminContactSubmissions = lazy(() => import("@/pages/admin/AdminContactSubmissions"));
const AdminAdFraud = lazy(() => import("@/pages/admin/AdminAdFraud"));
const AdminFeatureFlags = lazy(() => import("@/pages/admin/AdminFeatureFlags"));
const FinanceCompassDashboard = lazy(() => import("@/pages/admin/FinanceCompassDashboard"));
const FinanceCompassAssessments = lazy(() => import("@/pages/admin/FinanceCompassAssessments"));
const FinanceCompassQuestions = lazy(() => import("@/pages/admin/FinanceCompassQuestions"));
const FinanceCompassAIConfiguration = lazy(() => import("@/pages/admin/finance-compass/AIConfiguration"));
const FinanceCompassTenants = lazy(() => import("@/pages/admin/finance-compass/FinanceCompassTenants"));
const FinanceCompassAuditLogs = lazy(() => import("@/pages/admin/finance-compass/FinanceCompassAuditLogs"));
const FinanceCompassKnowledgeBase = lazy(() => import("@/pages/admin/finance-compass/FinanceCompassKnowledgeBase"));
const FinanceCompassScenarios = lazy(() => import("@/pages/admin/finance-compass/FinanceCompassScenarios"));
const FinanceCompassBenchmarks = lazy(() => import("@/pages/admin/finance-compass/FinanceCompassBenchmarks"));
const FinanceCompassScoringLogic = lazy(() => import("@/pages/admin/finance-compass/FinanceCompassScoringLogic"));
const FinanceCompassWeightings = lazy(() => import("@/pages/admin/finance-compass/FinanceCompassWeightings"));
const AdminFcBetaAccess = lazy(() => import("@/pages/admin/finance-compass/AdminFcBetaAccess"));
const FinanceCompassInsights = lazy(() => import("@/pages/admin/finance-compass/FinanceCompassInsights"));
const WidgetAnalytics = lazy(() => import("@/pages/admin/WidgetAnalytics"));
const FunnelAnalytics = lazy(() => import("@/pages/admin/FunnelAnalytics"));
const ComparisonToolsAnalytics = lazy(() => import("@/pages/admin/ComparisonToolsAnalytics"));

const FinanceCompassUserDashboard = lazy(() => import("@/pages/FinanceCompassDashboard"));
const FinanceCompassLanding = lazy(() => import("@/pages/FinanceCompassLanding"));
const FinanceCompassStart = lazy(() => import("@/pages/FinanceCompassStart"));
const FinanceCompassAssess = lazy(() => import("@/pages/FinanceCompassAssess"));
const FinanceCompassResults = lazy(() => import("@/pages/FinanceCompassResults"));
const FinanceCompassROI = lazy(() => import("@/pages/FinanceCompassROI"));
const FinanceCompassInteractiveDashboard = lazy(() => import("@/pages/finance-compass-dashboard"));
const FinanceCompassMethodology = lazy(() => import("@/pages/FinanceCompassMethodology"));
const ChatPopupPage = lazy(() => import("@/pages/finance-compass/chat-popup"));


function ScrollToTop() {
  const [location] = useLocation();
  const isFirstMount = useRef(true);
  const previousLocation = useRef(location);

  useEffect(() => {
    // Don't fire on initial mount — the browser will restore the user's
    // previous scroll position (or land at 0) on its own. Smooth scrolls
    // here used to compete with user interaction in the hero and look
    // like the page was "jumping to the top" when the user moved their
    // mouse.
    if (isFirstMount.current) {
      isFirstMount.current = false;
      previousLocation.current = location;
      return;
    }
    if (location === previousLocation.current) return;
    previousLocation.current = location;
    const hash = window.location.hash;
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location]);

  return null;
}

/**
 * GlobalNav — renders the LibraryNavigation drawer on every public
 * page. Admin routes have their own AdminSidebar; FinanceCompass has
 * its own header. Both are excluded so we don't double-stack nav.
 */
/**
 * FinanceCompassEntry — smart gateway for /finance-compass.
 *
 * The product gates everything behind an email-verified session.
 * Verifying happens on the FinanceCompassLanding page; once
 * verified, the assessment surface at
 * /finance-compass/start/:tier becomes reachable.
 *
 * Implementation:
 * - The Suspense fallback IS the branded loader, so we render
 *   exactly one loader instance from first paint until the
 *   Landing chunk arrives. No mount → unmount → re-mount cycle,
 *   no perceived flicker.
 * - Session check + redirect-if-verified live inside the inner
 *   FinanceCompassEntryInner component, which is gated by both
 *   the chunk being downloaded and the query state. Verified
 *   users see the loader while navigate() fires.
 */
function FinanceCompassEntryInner() {
  const [, navigate] = useLocation();
  const { data: sessionData, isLoading } = useQuery<{ verified: boolean }>({
    queryKey: ["/api/finance-compass/public/session"],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!isLoading && sessionData?.verified) {
      navigate("/finance-compass/start/pre_assessment", { replace: true });
    }
  }, [isLoading, sessionData, navigate]);

  // While the session is in flight, or once we know the user is
  // verified, stay on the same loader the Suspense fallback rendered.
  // Verified users see it for the single frame the navigation needs.
  if (isLoading || sessionData?.verified) {
    return <FinanceCompassLoading />;
  }
  return <FinanceCompassLanding />;
}

function FinanceCompassEntry() {
  return (
    <Suspense fallback={<FinanceCompassLoading />}>
      <FinanceCompassEntryInner />
    </Suspense>
  );
}

function GlobalNav() {
  const [location] = useLocation();
  // Admin centre runs its own AdminSidebar, so the pill would
  // duplicate nav. Everywhere else (including Finance Compass) gets
  // the same pill drawer.
  if (location === "/admin" || location.startsWith("/admin/")) {
    return null;
  }
  // Entire public site is on the dark palette since the launch holding
  // page flip, so the trigger pill defaults to the dark variant —
  // readable cream-on-ink rather than ink-on-cream.
  return <LibraryNavigation variant="dark" />;
}

function RoutePreloader() {
  useEffect(() => {
    // Critical path: images and preloading
    initializeImagePreconnects();
    preloadCriticalImages();
    preloadPriorityRoutes();
    preloadHeavyRoutes();
  }, []);
  
  // Defer ad tracker to after FCP (separate effect, runs after paint)
  useEffect(() => {
    const timer = setTimeout(() => initAdClickTracker(), 100);
    return () => clearTimeout(timer);
  }, []);
  
  return null;
}

function FeatureGatedRoute({ 
  feature, 
  component: Component 
}: { 
  feature: keyof FeatureFlags; 
  component: React.ComponentType<any>;
}) {
  const { flags, isLoading } = useFeatureFlags();
  
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  if (!flags[feature]) {
    return <NotFound />;
  }
  
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <Component />
    </Suspense>
  );
}

function AdminFeatureGatedRoute({ 
  feature, 
  component: Component 
}: { 
  feature: keyof FeatureFlags; 
  component: React.ComponentType<any>;
}) {
  const { flags, isLoading } = useFeatureFlags();
  
  if (isLoading) {
    return <AdminLoadingFallback />;
  }
  
  if (!flags[feature]) {
    return <NotFound />;
  }
  
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <Component />
    </Suspense>
  );
}

function Router() {
  const { flags, isLoading } = useFeatureFlags();
  
  return (
    <>
      <ScrollToTop />
      <RoutePreloader />
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          {/* Home - always enabled */}
          <Route path="/" component={Home} />
          
          {/* Feature-gated public routes */}
          <Route path="/about">
            <FeatureGatedRoute feature="about" component={AboutPage} />
          </Route>
          <Route path="/services">
            <FeatureGatedRoute feature="services" component={ServicesPage} />
          </Route>
          <Route path="/solutions">
            <FeatureGatedRoute feature="solutions" component={SolutionsPage} />
          </Route>
          <Route path="/contact">
            <FeatureGatedRoute feature="contact" component={ContactPage} />
          </Route>
          
          {/* Blog routes */}
          <Route path="/blog">
            <FeatureGatedRoute feature="blog" component={BlogPage} />
          </Route>
          <Route path="/blog/:slug">
            {() => flags.blog ? <BlogPostPage /> : <NotFound />}
          </Route>
          
          {/* Resources routes */}
          <Route path="/files">
            <FeatureGatedRoute feature="resources" component={FilesPage} />
          </Route>
          <Route path="/resources">
            <FeatureGatedRoute feature="resources" component={FilesPage} />
          </Route>
          
          {/* Comparison tool */}
          <Route path="/tools/epm-comparison">
            <FeatureGatedRoute feature="comparisonTools" component={EPMComparisonPage} />
          </Route>
          
          {/* Export - always enabled */}
          <Route path="/export" component={ExportPage} />
          
          {/* Legal pages - always enabled */}
          <Route path="/terms" component={TermsOfUsePage} />
          <Route path="/privacy" component={PrivacyPolicyPage} />
          <Route path="/cookies" component={CookiePolicyPage} />
          
          {/* FinanceCompass public routes - gated with custom loading.
              The /finance-compass entry skips the old marketing
              landing and routes the visitor straight into the
              assessment-start flow. The branded loader shows during
              the brief transition. */}
          <Route path="/finance-compass">
            <FeatureGatedRoute feature="financeCompass" component={FinanceCompassEntry} />
          </Route>
          <Route path="/finance-compass/dashboard">
            <Suspense fallback={<FinanceCompassLoading />}>
              <FeatureGatedRoute feature="financeCompass" component={FinanceCompassUserDashboard} />
            </Suspense>
          </Route>
          <Route path="/finance-compass/start/:tier">
            {() => (
              <Suspense fallback={<FinanceCompassLoading />}>
                {flags.financeCompass ? <FinanceCompassStart /> : <NotFound />}
              </Suspense>
            )}
          </Route>
          <Route path="/finance-compass/assess/:id">
            {() => (
              <Suspense fallback={<FinanceCompassLoading />}>
                {flags.financeCompass ? <FinanceCompassAssess /> : <NotFound />}
              </Suspense>
            )}
          </Route>
          <Route path="/finance-compass/results/:id">
            {() => (
              <Suspense fallback={<FinanceCompassLoading />}>
                {flags.financeCompass ? <FinanceCompassResults /> : <NotFound />}
              </Suspense>
            )}
          </Route>
          <Route path="/finance-compass/roi/:id">
            {() => (
              <Suspense fallback={<FinanceCompassLoading />}>
                {flags.financeCompass ? <FinanceCompassROI /> : <NotFound />}
              </Suspense>
            )}
          </Route>
          <Route path="/finance-compass/dashboard/:assessmentId">
            {() => (
              <Suspense fallback={<FinanceCompassLoading />}>
                {flags.financeCompass ? <FinanceCompassInteractiveDashboard /> : <NotFound />}
              </Suspense>
            )}
          </Route>
          <Route path="/finance-compass/methodology">
            <Suspense fallback={<FinanceCompassLoading />}>
              <FeatureGatedRoute feature="financeCompass" component={FinanceCompassMethodology} />
            </Suspense>
          </Route>
          <Route path="/finance-compass/chat-popup">
            {() => (
              <Suspense fallback={<FinanceCompassLoading />}>
                {flags.financeCompass ? <ChatPopupPage /> : <NotFound />}
              </Suspense>
            )}
          </Route>
          
          {/* Admin routes - always enabled (admin auth handles access) */}
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/access-denied" component={AdminAccessDenied} />
          <Route path="/admin/login/mfa-verify" component={AdminSecurityMfaVerify} />
          {/* Clerk's <SignIn> uses sub-routes during multi-step / OAuth flows
              (e.g. /admin/login/sso-callback, /admin/login/factor-one).
              Wildcard keeps them all on AdminLogin so Clerk handles them
              internally instead of bouncing to NotFound. Must come AFTER the
              specific /admin/login/mfa-verify route above. */}
          <Route path="/admin/login/:rest*" component={AdminLogin} />
          <Route path="/admin/dashboard">
            <AdminRoute component={AdminDashboard} />
          </Route>
          <Route path="/admin/blog-posts">
            <AdminRoute component={AdminBlogPosts} />
          </Route>
          <Route path="/admin/leads">
            <AdminRoute component={AdminLeads} />
          </Route>
          <Route path="/admin/resources">
            <AdminRoute component={AdminResources} />
          </Route>
          <Route path="/admin/content-checker">
            <AdminRoute component={AdminContentChecker} />
          </Route>
          <Route path="/admin/analytics">
            <AdminRoute component={AdminAnalytics} />
          </Route>
          <Route path="/admin/marketing-assets">
            <AdminRoute component={AdminMarketingAssets} />
          </Route>
          <Route path="/admin/guardrails">
            <AdminRoute component={AdminGuardrails} />
          </Route>
          <Route path="/admin/downloads">
            <AdminRoute component={AdminDownloads} />
          </Route>
          <Route path="/admin/operations">
            <AdminRoute component={AdminOperations} />
          </Route>
          <Route path="/admin/security">
            <AdminRoute component={AdminSecurity} />
          </Route>
          <Route path="/admin/contact-submissions">
            <AdminRoute component={AdminContactSubmissions} />
          </Route>
          <Route path="/admin/ad-fraud">
            <AdminRoute component={AdminAdFraud} />
          </Route>
          <Route path="/admin/feature-flags">
            <AdminRoute component={AdminFeatureFlags} />
          </Route>
          
          {/* Admin FinanceCompass routes - gated */}
          <Route path="/admin/finance-compass">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassDashboard} />
          </Route>
          <Route path="/admin/finance-compass/assessments">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassAssessments} />
          </Route>
          <Route path="/admin/finance-compass/questions">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassQuestions} />
          </Route>
          <Route path="/admin/finance-compass/weightings">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassWeightings} />
          </Route>
          <Route path="/admin/finance-compass/ai-config">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassAIConfiguration} />
          </Route>
          <Route path="/admin/finance-compass/tenants">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassTenants} />
          </Route>
          <Route path="/admin/finance-compass/audit-logs">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassAuditLogs} />
          </Route>
          <Route path="/admin/finance-compass/knowledge-base">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassKnowledgeBase} />
          </Route>
          <Route path="/admin/finance-compass/scenarios">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassScenarios} />
          </Route>
          <Route path="/admin/finance-compass/benchmarks">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassBenchmarks} />
          </Route>
          <Route path="/admin/finance-compass/scoring-logic">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassScoringLogic} />
          </Route>
          <Route path="/admin/finance-compass/beta-access">
            <AdminFeatureGatedRoute feature="financeCompass" component={AdminFcBetaAccess} />
          </Route>
          <Route path="/admin/finance-compass/insights">
            <AdminFeatureGatedRoute feature="financeCompass" component={FinanceCompassInsights} />
          </Route>
          <Route path="/admin/widget-analytics">
            <AdminRoute component={WidgetAnalytics} />
          </Route>
          <Route path="/admin/funnel-analytics">
            <AdminRoute component={FunnelAnalytics} />
          </Route>
          <Route path="/admin/comparison-analytics">
            <AdminRoute component={ComparisonToolsAnalytics} />
          </Route>
          
          <Route path="/admin">
            <AdminRoute component={AdminHub} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <LazyMotionProvider>
      <QueryClientProvider client={queryClient}>
        <FeatureFlagProvider>
          <VisitorProvider>
            <TooltipProvider>
              <Toaster />
              <GlassFilterDef />
              <GlobalNav />
              <Router />
              <CookieConsentBanner />
              <CookiePreferencesModal />
            </TooltipProvider>
          </VisitorProvider>
        </FeatureFlagProvider>
      </QueryClientProvider>
    </LazyMotionProvider>
  );
}

export default App;
