import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { trackPageView, setupScrollTracking, setupWidgetVisibilityTracking, trackCTAClicked } from "@/lib/funnel-analytics";
import { ArrowRight, ArrowLeft, CheckCircle2, Building2, Mail, User, Briefcase, Phone, Loader2, RefreshCw, Shield, AlertCircle, Target, Sparkles, BarChart3, Star, TrendingUp, Users, Award, Bot, LineChart, Rocket, ClipboardCheck, Search, Cpu, FileText, Clock, Calendar, FileCheck, Zap, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { preloadFinanceCompassComponents } from "@/lib/preload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useUser, useClerk } from "@clerk/clerk-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
import { InstantPreview } from "@/components/finance-compass/InstantPreview";
import { SampleResultsPreview } from "@/components/finance-compass/SampleResultsPreview";
import { HeroResultsVisual } from "@/components/finance-compass/HeroResultsVisual";

import {
  CompassIcon,
  PreAssessmentIcon,
  FullAssessmentIcon,
  QualificationIcon,
} from "@/components/finance-compass-icons";
import { useFeatureFlags } from "@/lib/feature-flags";

// Floating CTA Button Component - Mobile First Design
function FloatingCTAButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  const [showButton, setShowButton] = useState(false);
  const lastScrollY = useRef(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const heroHeight = 400; // Show after scrolling past hero
      
      // Show button after hero section
      setShowButton(currentScrollY > heroHeight && visible);
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visible]);
  
  if (!showButton) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-50"
    >
      <Button
        onClick={onClick}
        size="lg"
        variant="default"
        className="bg-brand-berry border-brand-berry text-white shadow-lg sm:shadow-2xl shadow-brand-berry/40 rounded-full text-sm sm:text-base"
        data-testid="button-floating-cta"
      >
        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        Get Your Score
        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-2" />
      </Button>
    </motion.div>
  );
}

interface SessionStatus {
  verified: boolean;
  contactId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  expiresAt?: string;
}

interface UserAssessment {
  id: string;
  tier: string;
  status: string;
  startedAt: string;
  updatedAt: string;
}

interface MyAssessmentsResponse {
  success: boolean;
  data?: {
    assessments: UserAssessment[];
  };
  error?: string;
}


const tiers = [
  {
    id: "pre_assessment",
    name: "Pre-Assessment",
    tagline: "AI-Powered Strategic Analysis",
    description: "Forward-looking Finance Transformation readiness evaluation with AI-powered insights, peer benchmarking, and autonomous finance capability gaps",
    duration: "20-25 minutes",
    badge: "Open Access",
    badgeVariant: "default" as const,
    IconComponent: PreAssessmentIcon,
    whyChoose: "Ideal for finance leaders preparing for the AI-driven future of finance",
    benefits: [
      { text: "AI-powered insights and recommendations", icon: Sparkles },
      { text: "Finance function readiness scoring across 7 dimensions", icon: TrendingUp },
      { text: "Forward-looking capability gap analysis", icon: Search },
      { text: "Peer benchmarking and industry comparisons", icon: Users },
      { text: "Autonomous finance readiness indicators", icon: Bot },
    ],
    cta: "Start Pre-Assessment",
    popular: true,
    stage: 1,
    completeness: 50,
    requiresContact: false,
  },
  {
    id: "full",
    name: "Full Assessment",
    tagline: "Complete AI-Ready Transformation",
    description: "74 questions across 7 dimensions. AI-validated insights, execution tracking, and a sequenced roadmap. Built for finance leaders who want depth.",
    duration: "35-45 minutes",
    badge: "Premium",
    badgeVariant: "outline" as const,
    IconComponent: FullAssessmentIcon,
    whyChoose: "For organisations ready to transform with expert consultant support and AI enablement",
    benefits: [
      { text: "74 questions covering 7 dimensions", icon: Star },
      { text: "In-depth analysis with AI-powered insights", icon: Cpu },
      { text: "AI maturity and agentic readiness assessment", icon: Bot },
      { text: "Execution tracking with AI monitoring", icon: LineChart },
      { text: "Executive-ready PDF roadmap report", icon: FileText },
      { text: "Dedicated consultant support", icon: Award },
    ],
    cta: "Contact Us to Begin",
    popular: false,
    stage: 2,
    completeness: 100,
    requiresContact: true,
  },
];

function isBusinessEmail(email: string): boolean {
  const personalDomains = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
    "gmx.com", "live.com", "msn.com", "me.com", "mac.com",
  ];
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? !personalDomains.includes(domain) : false;
}

type Step = "checking" | "sign-in" | "qualifying" | "verified";

// Progression Step Indicator Component
function ProgressionStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = [
    { id: 1, label: "Quick Preview", time: "60 sec", highlight: "Instant score", icon: Zap },
    { id: 2, label: "Pre-Assessment", time: "20 min", highlight: "74 questions", icon: Target },
    { id: 3, label: "Full Assessment", time: "Guided", highlight: "Expert insights", icon: Award },
  ];
  
  return (
    <div className="flex items-center justify-center w-full px-4" data-testid="progression-stepper">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {steps.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isComplete = step.id < currentStep;
          
          return (
            <div key={step.id} className="flex items-center gap-2 sm:gap-3">
              <div 
                className={`flex flex-col items-center text-center ${isActive ? "" : ""}`}
                data-testid={`step-indicator-${step.id}`}
              >
                {/* Step number/icon circle */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 ${
                  isComplete 
                    ? "bg-green-500/20 text-green-400" 
                    : isActive 
                      ? "bg-brand-mint text-brand-cream" 
                      : "bg-white/10 text-white/40"
                }`}>
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </div>
                {/* Highlight value */}
                <div className={`text-[11px] sm:text-xs font-semibold ${
                  isActive ? "text-brand-cyan" : isComplete ? "text-green-400" : "text-white/50"
                }`}>
                  {step.highlight}
                </div>
                {/* Time */}
                <div className={`text-[9px] sm:text-[10px] ${
                  isActive ? "text-white/70" : "text-white/30"
                }`}>
                  {step.time}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-6 sm:w-10 h-[2px] ${
                  isComplete ? "bg-green-500/40" : "bg-white/10"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FinanceCompassLanding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { flags: featureFlags } = useFeatureFlags();
  const instantPreviewRef = useRef<HTMLDivElement>(null);
  // Removed isPageReady state - skeleton loader caused white flash on mobile
  
  const { isSignedIn, isLoaded: isClerkLoaded, user } = useUser();
  const clerk = useClerk();

  const [step, setStep] = useState<Step>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionStatus | null>(null);
  const [fcChecked, setFcChecked] = useState(false);

  // Fetch user's existing assessments when verified
  const { data: myAssessmentsData, isLoading: assessmentsLoading, error: assessmentsError } = useQuery<MyAssessmentsResponse>({
    queryKey: ["/api/finance-compass/public/my-assessments"],
    enabled: step === "verified",
  });

  const userAssessments = myAssessmentsData?.data?.assessments || [];

  // Helper to find in-progress assessment for a tier
  const getAssessmentForTier = (tierId: string) => {
    return userAssessments.find(a => a.tier === tierId && a.status === "in_progress");
  };

  // Helper to check if tier has a completed assessment
  const hasCompletedAssessment = (tierId: string) => {
    return userAssessments.some(a => a.tier === tierId && (a.status === "completed" || a.status === "initial_complete"));
  };

  // Step 1: Check existing FC session on mount
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/finance-compass/public/session", { credentials: "include" });
        const data: SessionStatus = await response.json();
        if (data.verified && data.contactId) {
          setContactId(data.contactId);
          setSessionInfo(data);
          setStep("verified");
        }
      } catch {
        // handled by Clerk effect below
      } finally {
        setFcChecked(true);
      }
    })();
  }, []);

  // Track page view on mount
  useEffect(() => {
    trackPageView("fc_landing");
    const cleanupScroll = setupScrollTracking("fc_landing");
    return () => { cleanupScroll(); };
  }, []);

  // Setup widget visibility tracking for InstantPreview
  useEffect(() => {
    if (step === "sign-in" && instantPreviewRef.current) {
      const cleanup = setupWidgetVisibilityTracking(instantPreviewRef.current, "fc_landing");
      return cleanup;
    }
  }, [step]);

  // Preload heavy components after user is verified
  useEffect(() => {
    if (step === "verified") {
      preloadFinanceCompassComponents();
    }
  }, [step]);

  // Step 2: When both FC check and Clerk load resolve, decide next step
  useEffect(() => {
    if (!fcChecked || !isClerkLoaded) return;
    if (step === "verified" || step === "qualifying") return;
    if (isSignedIn) {
      handleClerkQualify();
    } else {
      setStep("sign-in");
    }
  }, [fcChecked, isClerkLoaded, isSignedIn]);

  const handleClerkQualify = async () => {
    setStep("qualifying");
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/finance-compass/public/qualify-clerk", {});
      const result = await response.json();
      if (result.success) {
        setContactId(result.data.contactId);
        setSessionInfo({ verified: true, ...result.data });
        navigate("/finance-compass/start/pre_assessment", { replace: true });
      } else {
        toast({ title: "Sign-in failed", description: result.error || "Please try again.", variant: "destructive" });
        setStep("sign-in");
      }
    } catch (error: any) {
      toast({ title: "Something went wrong", description: error.message || "Please try again.", variant: "destructive" });
      setStep("sign-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAssessment = (tierId: string) => {
    trackCTAClicked("fc_landing", "start_assessment");
    const email = user?.primaryEmailAddress?.emailAddress || sessionInfo?.email || "";
    navigate(`/finance-compass/start/${tierId}?qualified=true&email=${encodeURIComponent(email)}&company=`);
  };

  // Render different card content based on step
  const renderFormCard = () => {
    if (step === "checking") {
      return (
        <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal mb-4" />
            <p className="text-muted-foreground">Checking your session...</p>
          </CardContent>
        </Card>
      );
    }

    if (step === "verified") {
      return (
        <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
              <motion.div 
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                <CheckCircle2 className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  Verified
                </Badge>
              </div>
            </div>
            <CardTitle className="text-xl text-brand-cream">
              Welcome back, {sessionInfo?.firstName || user?.firstName}!
            </CardTitle>
            <CardDescription className="text-sm">
              Signed in as <span className="font-medium text-brand-cream">{sessionInfo?.email || user?.primaryEmailAddress?.emailAddress}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button 
              className="w-full bg-brand-navy hover:bg-brand-berry"
              onClick={() => navigate("/finance-compass/dashboard")}
              data-testid="button-go-to-dashboard"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      );
    }

    // sign-in step
    return (
      <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-brand-berry/10">
              <QualificationIcon className="h-5 w-5 text-brand-teal" />
            </div>
            <Badge className="bg-brand-mint/20 text-brand-teal border-brand-mint/30">
              Free Access
            </Badge>
          </div>
          <CardTitle className="text-xl text-brand-cream">Get Your Finance Score</CardTitle>
          <CardDescription>
            Sign in with Google to run the full 74-question assessment and get your personalised roadmap — no call required.
          </CardDescription>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Quick Preview
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="flex items-center gap-1 text-brand-teal font-medium">
              <Target className="h-3.5 w-3.5" />
              Pre-Assessment
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="flex items-center gap-1 text-muted-foreground">
              <Award className="h-3.5 w-3.5" />
              Full Assessment
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full bg-brand-berry hover:bg-brand-navy"
            onClick={() => clerk.openSignIn()}
            data-testid="button-sign-in-google"
            disabled={isSubmitting}
          >
            <GoogleIcon className="h-4 w-4 mr-2" />
            Continue with Google
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Your data is protected under GDPR. No card required.
          </p>
        </CardContent>
      </Card>
    );
  };

  // Removed skeleton loader to prevent white flash on mobile
  // The page loads fast enough without it

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="FinanceCompass | Map every finance system you own | Constancia"
        description="Where are your finance systems disconnected? FinanceCompass scores your finance function against 200+ benchmarks in 12 minutes and shows where the gaps cost you most. Free, no call required."
        keywords={["connected finance intelligence", "finance systems integration", "finance readiness assessment", "finance maturity benchmark", "CFO diagnostic", "FP&A connectivity", "finance technology audit"]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "FinanceCompass",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "GBP" },
        "description": "Finance function maturity assessment tool for CFOs and finance leaders. Benchmark across 7 dimensions and receive a personalised transformation roadmap.",
        "url": "https://constancia.com/finance-compass"
      }) }} />

      <main className="pt-16 sm:pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[500px] sm:min-h-[600px] flex items-center overflow-hidden bg-gradient-to-br from-brand-ink via-brand-deep-mint to-brand-berry">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-brand-mint rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-brand-berry rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 w-full">
            {/* Centered Hero Header */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
                <div className="h-10 w-10 sm:h-14 sm:w-14 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <CompassIcon className="h-6 w-6 sm:h-8 sm:w-8 text-brand-cyan" />
                </div>
                <div className="text-left">
                  <h2 className="text-brand-cyan font-semibold text-base sm:text-lg">FinanceCompass</h2>
                  <p className="text-white/70 text-xs sm:text-sm">by Constancia</p>
                </div>
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-4 sm:mb-6 leading-tight max-w-4xl mx-auto">
                See where your finance systems are{" "}
                <span className="text-brand-cyan">disconnected</span>
              </h1>
              
              {/* Stat row: replaces the three identical "✓ feature"
                  pills with something specific. Numbers feel real;
                  generic check-marks read as filler. */}
              <div className="grid grid-cols-3 max-w-2xl mx-auto mb-6 sm:mb-8 divide-x divide-white/15">
                <div className="px-3 sm:px-6 text-center">
                  <div className="text-2xl sm:text-3xl font-light text-brand-cyan">12<span className="text-sm sm:text-base text-white/60 ml-1">min</span></div>
                  <div className="text-[11px] sm:text-xs text-white/65 uppercase tracking-wider mt-1">to a score</div>
                </div>
                <div className="px-3 sm:px-6 text-center">
                  <div className="text-2xl sm:text-3xl font-light text-brand-cyan">200<span className="text-sm sm:text-base text-white/60 ml-0.5">+</span></div>
                  <div className="text-[11px] sm:text-xs text-white/65 uppercase tracking-wider mt-1">EPM benchmarks</div>
                </div>
                <div className="px-3 sm:px-6 text-center">
                  <div className="text-2xl sm:text-3xl font-light text-brand-cyan">£0</div>
                  <div className="text-[11px] sm:text-xs text-white/65 uppercase tracking-wider mt-1">no call required</div>
                </div>
              </div>

              <p className="text-white/75 text-sm sm:text-base max-w-xl mx-auto mb-8">
                Run the diagnostic. See where your finance systems disagree with each other. Walk away with a sequenced roadmap, not a sales pitch.
              </p>
            </div>
            
            <div className="mb-8 sm:mb-10">
              <h3 className="text-white/80 text-xs sm:text-sm font-medium mb-4 text-center">
                Why Finance Leaders Choose FinanceCompass
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 max-w-3xl mx-auto">
                {[
                  { icon: Sparkles, title: "AI-Powered Insights", desc: "Benchmarks your finance function against industry standards" },
                  { icon: Target, title: "Actionable Roadmap", desc: "Prioritised plan tailored to your organisation" },
                  { icon: Users, title: "Expert Guidance", desc: "Consultant support to execute your transformation" },
                ].map((benefit) => (
                  <div key={benefit.title} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-mint to-brand-berry flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium text-xs sm:text-sm">{benefit.title}</div>
                      <div className="text-white/60 text-[10px] sm:text-xs leading-relaxed">{benefit.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl mx-auto">
                {[
                  { value: "£20k+", label: "Analysis Value" },
                  { value: "7", label: "Dimensions" },
                  { value: "20 min", label: "Full Assessment" },
                  { value: "60sec", label: "Quick Preview" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center">
                    <div className="text-lg sm:text-xl font-semibold text-brand-cyan">{stat.value}</div>
                    <div className="text-[10px] sm:text-xs text-white/70 leading-tight">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col">
                {step === "sign-in" && (
                  <div className="mb-4 text-center">
                    <div className="mb-4">
                      <ProgressionStepper currentStep={1} />
                    </div>
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-3">
                      <Zap className="h-4 w-4 text-brand-cyan" />
                      <span className="text-sm text-white font-medium">Start with Quick Preview</span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed max-w-lg mx-auto">
                      Get a taste of your EPM maturity in 60 seconds. No registration required. 
                      Continue to the full assessment after seeing your results.
                    </p>
                  </div>
                )}
                {step === "sign-in" ? (
                  <div ref={instantPreviewRef}>
                    <InstantPreview 
                      onStartFullAssessment={() => {
                        const formSection = document.getElementById('start-assessment');
                        if (formSection) {
                          formSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }} 
                    />
                  </div>
                ) : (
                  renderFormCard()
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Industry Context Section - The AI Imperative */}
        <section className="py-10 sm:py-16 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div 
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-3 sm:mb-4 bg-brand-mint/20 text-brand-teal border-brand-mint/30">
                <Rocket className="h-3 w-3 mr-1" />
                The AI Imperative
              </Badge>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-brand-cream mb-2 sm:mb-3 px-2">
                Finance is Transforming. Are You Ready?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-2">
                The rise of Agentic AI is reshaping the CFO agenda. Organisations that prepare now 
                will lead the autonomous finance revolution.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                {
                  stat: "90%",
                  label: "AI Adoption by 2026",
                  description: "Finance functions expected to deploy AI capabilities",
                  source: "Gartner",
                  icon: Cpu,
                  color: "from-brand-berry to-brand-ink"
                },
                {
                  stat: "47%",
                  label: "GenAI in FP&A",
                  description: "Organisations using GenAI in 2025, up from 6% in 2024",
                  source: "Gartner Survey",
                  icon: TrendingUp,
                  color: "from-brand-mint to-brand-berry"
                },
                {
                  stat: "40-60%",
                  label: "Planning Cycle Reduction",
                  description: "Time savings achieved through AI-powered forecasting",
                  source: "Industry Analysis",
                  icon: Clock,
                  color: "from-green-500 to-emerald-600"
                },
                {
                  stat: "Agentic AI",
                  label: "CFO Role Evolution",
                  description: "Autonomous agents transforming finance operations",
                  source: "2025 Trend",
                  icon: Bot,
                  color: "from-purple-500 to-brand-ink"
                }
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full border-0 shadow-md hover-elevate">
                    <CardContent className="p-4 sm:p-5">
                      <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-2 sm:mb-3`}>
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div className="text-xl sm:text-2xl font-semibold text-brand-cream mb-1">
                        {item.stat}
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-brand-teal mb-1 sm:mb-2">
                        {item.label}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 sm:mb-2">
                        {item.description}
                      </p>
                      <div className="text-[10px] text-muted-foreground/70 italic">
                        Source: {item.source}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* See What You'll Get Section - Sample Results Preview */}
        <section id="registration-form" className="py-10 sm:py-16 bg-gradient-to-br from-brand-ink via-brand-deep-mint to-brand-berry relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 sm:right-20 w-48 sm:w-64 h-48 sm:h-64 bg-brand-mint rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 sm:left-20 w-56 sm:w-80 h-56 sm:h-80 bg-brand-berry rounded-full blur-3xl" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div 
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-brand-mint mb-4">
                Your report
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-light text-white mb-2 sm:mb-3 px-2">
                In plain English. No scorecard theatre.
              </h2>
              <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto px-2">
                Finish the assessment and you get a scored breakdown across 7 dimensions, the gaps that matter most, and a sequenced roadmap that names the systems involved.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <HeroResultsVisual />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <SampleResultsPreview 
                  onStartAssessment={() => {
                    const formSection = document.getElementById('start-assessment');
                    if (formSection) {
                      formSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }} 
                />
              </motion.div>
            </div>

          </div>
        </section>

        {/* Registration Form Section */}
        <section id="start-assessment" className="py-12 sm:py-20 relative overflow-hidden">
          {/* Premium gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-muted/20" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-mint/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-berry/5 rounded-full blur-3xl" />
          </div>
          
          <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
            {/* Header */}
            <motion.div 
              className="text-center mb-8 sm:mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-brand-berry mb-4">
                Start the assessment
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-light leading-tight text-brand-cream mb-3">
                The diagnostic a consulting firm would charge you<br className="hidden sm:inline" /> <em className="not-italic font-normal text-brand-berry">five figures</em> to run.
              </h2>
              <p className="text-base sm:text-lg text-brand-cream/70 max-w-2xl mx-auto mb-4">
                74 questions across 7 dimensions. AI-validated against 200+ EPM benchmarks. Done in 12 minutes. Yours, calibrated to your stack and your industry.{" "}
                <Link href="/finance-compass/methodology" className="underline underline-offset-2 text-brand-cream/90 hover:text-brand-cream transition-colors">See the benchmarking methodology</Link>.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-mint/10 border border-brand-mint/30">
                <Zap className="h-4 w-4 text-brand-teal" />
                <span className="text-sm font-medium text-brand-cream">Enterprise-grade analysis | Months of work in 20 minutes</span>
              </div>
            </motion.div>
            
            {/* Benefits bar - horizontal on desktop */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-mint to-brand-berry flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-brand-cream text-sm">10-15 min</p>
                  <p className="text-xs text-muted-foreground">Quick assessment</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-berry to-brand-ink flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-brand-cream text-sm">7 Dimensions</p>
                  <p className="text-xs text-muted-foreground">Full diagnostic</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-brand-cream text-sm">AI-Powered</p>
                  <p className="text-xs text-muted-foreground">Smart insights</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-brand-cream text-sm">Secure</p>
                  <p className="text-xs text-muted-foreground">GDPR compliant</p>
                </div>
              </div>
            </motion.div>

            {/* Form Card - wider */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-3xl mx-auto"
            >
              {renderFormCard()}
            </motion.div>
            
            {/* What you'll receive - horizontal below form */}
            <motion.div
              className="mt-8 sm:mt-10 pt-8 border-t border-border/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* What-you-get row. Old: five identical pill-shaped
                  ✓ check-mark chips — the AI-pattern. New: an
                  inline-text strip with mono numbering, each item
                  separated by a thin divider. Reads as "here are
                  the five deliverables" without the chip chrome. */}
              <div className="font-mono text-[10px] uppercase tracking-widest text-brand-berry text-center mb-5">
                What you walk out with
              </div>
              <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-sm text-brand-cream/85">
                {[
                  "Readiness score",
                  "Dimension breakdown",
                  "AI-validated insights",
                  "Peer benchmarks",
                  "Sequenced roadmap",
                ].map((item, idx, arr) => (
                  <span key={item} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-brand-berry/60 tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium">{item}</span>
                    {idx < arr.length - 1 && (
                      <span aria-hidden="true" className="text-brand-cream/25">·</span>
                    )}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Your Assessment Journey Section */}
        <section className="py-12 sm:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-ink/5 via-transparent to-brand-berry/5" />
          <div className="absolute top-20 left-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-brand-mint/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-56 sm:w-80 h-56 sm:h-80 bg-brand-berry/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div 
              className="text-center mb-10 sm:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-brand-cream mb-2 sm:mb-3">
                How It Works
              </h2>
              <p className="text-base sm:text-xl text-brand-teal font-medium mb-3 sm:mb-4">
                Your Path to Finance Excellence
              </p>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
                Our assessment platform evaluates your finance function across seven key dimensions, 
                including Financial Planning & Analysis, Management Reporting, Technology Systems, and Data Analytics. 
                You leave with a Finance Readiness score, the dimensions where you're disconnected, and a sequenced roadmap. Minutes, not weeks.
              </p>
            </motion.div>

            {/* Journey Flow Visual */}
            <div className="relative mb-10 sm:mb-16">
              {/* Connection Line */}
              <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-green-500/30 via-brand-berry/30 to-brand-ink/30 -translate-y-1/2" />
              
              <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Step 1: Verify */}
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0 }}
                >
                  <Card className="lg:h-full border-green-500/30 bg-gradient-to-b from-green-500/5 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <motion.div 
                          className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Shield className="h-6 w-6 text-white" />
                        </motion.div>
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          Step 1
                        </Badge>
                      </div>
                      <CardTitle className="text-lg text-brand-cream">
                        Quick Verification
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Verify your business email to unlock all assessments and ensure a secure experience.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>One-time verification process</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Secure OTP sent to your email</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Takes less than 30 seconds</span>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Arrow for mobile */}
                  <div className="lg:hidden flex justify-center py-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-0.5 h-3 bg-gradient-to-b from-green-500/50 to-brand-mint/50" />
                      <ArrowRight className="h-4 w-4 text-brand-cyan rotate-90" />
                    </div>
                  </div>
                </motion.div>

                {/* Step 2: Pre-Assessment */}
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="lg:h-full border-brand-berry/30 bg-gradient-to-b from-brand-berry/10 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <motion.div 
                          className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-berry to-brand-ink flex items-center justify-center shadow-lg"
                          whileHover={{ scale: 1.05 }}
                        >
                          <PreAssessmentIcon className="h-6 w-6 text-white" />
                        </motion.div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-brand-berry/10 text-brand-teal border-brand-berry/20">
                            Step 2
                          </Badge>
                          <Badge variant="default" className="text-xs">
                            Open Access
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg text-brand-cream">
                        Pre-Assessment
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Dive deeper into your finance function with AI-powered strategic analysis and actionable recommendations.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-brand-teal">
                        <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Detailed finance transformation readiness analysis</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-teal">
                        <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Process performance scoring</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-teal">
                        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>AI-generated recommendations</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-teal">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>10-15 minutes to complete</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-brand-berry to-brand-mint rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: "60%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Insight depth</span>
                        <span className="font-medium text-brand-teal">60%</span>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Arrow for mobile */}
                  <div className="lg:hidden flex justify-center py-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-0.5 h-3 bg-gradient-to-b from-brand-berry/50 to-brand-ink/50" />
                      <ArrowRight className="h-4 w-4 text-brand-cream rotate-90" />
                    </div>
                  </div>
                </motion.div>

                {/* Step 3: Full Assessment */}
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.45 }}
                >
                  <Card className="lg:h-full border-brand-ink/30 bg-gradient-to-b from-brand-ink/5 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <motion.div 
                          className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center shadow-lg"
                          whileHover={{ scale: 1.05 }}
                        >
                          <FullAssessmentIcon className="h-6 w-6 text-white" />
                        </motion.div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-brand-navy/10 text-brand-cream border-brand-ink/20 dark:text-white dark:border-white/20">
                            Step 3
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Contact Us
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg text-brand-cream">
                        Full Assessment
                      </CardTitle>
                      <CardDescription className="text-sm">
                        The deepest tier. A senior consultant works the diagnostic with you, and the roadmap is built around your stack, not a template.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-brand-cream/70">
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Executive-ready PDF report</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-cream/70">
                        <Award className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Consultant follow-up session</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-cream/70">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Personalised transformation roadmap</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-cream/70">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Industry benchmarking insights</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-brand-ink to-brand-berry rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Insight depth</span>
                        <span className="font-medium text-brand-cream">100%</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Beyond the Assessment - Premium Journey Teaser */}
            <motion.div
              className="mt-8 sm:mt-12 relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-ink/5 via-brand-berry/10 to-brand-mint/5 rounded-2xl" />
              <Card className="relative border-dashed border-brand-berry/30 bg-transparent overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-mint/20 to-transparent rounded-full blur-2xl" />
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-brand-mint to-brand-berry flex items-center justify-center shadow-lg flex-shrink-0"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-base sm:text-lg text-brand-cream">
                          Beyond the Assessment
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Your complete transformation journey continues with expert-led workshops
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-brand-berry to-brand-ink text-white border-0 self-start sm:self-auto">
                      Premium Journey
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* Workshop Series */}
                    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-background/50 border border-brand-berry/20">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-brand-berry/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-brand-cream text-xs sm:text-sm mb-1">
                          4-Workshop Series
                        </h4>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          Expert-facilitated sessions over 8 weeks covering strategy, implementation, and change management
                        </p>
                      </div>
                    </div>

                    {/* Execution Tracking */}
                    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-background/50 border border-brand-berry/20">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-brand-berry/10 flex items-center justify-center flex-shrink-0">
                        <LineChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-brand-cream text-xs sm:text-sm mb-1">
                          AI-Powered Tracking
                        </h4>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          Real-time execution monitoring with AI insights to keep your transformation on track
                        </p>
                      </div>
                    </div>

                    {/* Final Deliverables */}
                    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-background/50 border border-brand-berry/20">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-brand-berry/10 flex items-center justify-center flex-shrink-0">
                        <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-brand-cream text-xs sm:text-sm mb-1">
                          Executive Deliverables
                        </h4>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          Complete transformation roadmap, business case, and implementation plan ready for the board
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center">
                    <Button
                      variant="outline"
                      className="border-brand-berry text-brand-teal hover:bg-brand-berry/10"
                      onClick={() => navigate("/contact")}
                      data-testid="button-learn-more-workshops"
                    >
                      Learn More About Our Workshop Programme
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tagline Section */}
            <motion.div 
              className="text-center pt-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                Finance Transformed.<br />
                Designed for Change.<br />
                <span className="italic text-brand-cyan">Driven by Technology.</span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* Why FinanceCompass Section */}
        <section className="py-20 relative overflow-hidden bg-gradient-to-b from-muted/30 via-background to-muted/30">
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-semibold text-brand-cream">
                Why Finance Leaders Choose FinanceCompass
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Benefit 1 */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0 }}
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-brand-mint to-brand-berry flex items-center justify-center mb-5 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-brand-cream mb-3">
                  AI-Powered Insights
                </h3>
                <p className="text-muted-foreground">
                  Intelligent analysis benchmarks your finance function against industry standards and identifies improvement opportunities.
                </p>
              </motion.div>

              {/* Benefit 2 */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-brand-berry to-brand-ink flex items-center justify-center mb-5 shadow-lg">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-brand-cream mb-3">
                  Actionable Roadmap
                </h3>
                <p className="text-muted-foreground">
                  Receive a prioritised transformation plan with clear next steps tailored to your organisation's goals.
                </p>
              </motion.div>

              {/* Benefit 3 */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-brand-ink to-brand-berry flex items-center justify-center mb-5 shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-brand-cream mb-3">
                  Expert Guidance
                </h3>
                <p className="text-muted-foreground">
                  Access consultant support and expert follow-up sessions to help you execute your finance transformation.
                </p>
              </motion.div>
            </div>

            {/* Forward-Looking AI Benefit */}
            <motion.div
              className="mt-12 text-center max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="p-6 rounded-xl bg-gradient-to-r from-brand-ink/5 via-brand-berry/10 to-brand-mint/5 border border-brand-berry/20">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-mint to-brand-berry flex items-center justify-center shadow-lg">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-brand-cream mb-3">
                  Future-Ready Finance
                </h3>
                <p className="text-muted-foreground mb-4">
                  Prepare your finance function for the autonomous future. Our assessment evaluates your readiness for agentic AI, 
                  continuous close processes, and self-service analytics - positioning your team to lead rather than follow the AI revolution in finance.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Badge variant="outline" className="border-brand-berry/30 text-brand-teal">
                    <Cpu className="h-3 w-3 mr-1" />
                    Agentic AI Readiness
                  </Badge>
                  <Badge variant="outline" className="border-brand-berry/30 text-brand-teal">
                    <LineChart className="h-3 w-3 mr-1" />
                    Continuous Close
                  </Badge>
                  <Badge variant="outline" className="border-brand-berry/30 text-brand-teal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Self-Service Analytics
                  </Badge>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      
      {/* Floating CTA Button - Mobile First */}
      <FloatingCTAButton 
        onClick={() => {
          if (instantPreviewRef.current) {
            instantPreviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            trackCTAClicked("finance_compass_landing", "floating_cta");
          }
        }}
        visible={step === "sign-in"}
      />
    </div>
  );
}
