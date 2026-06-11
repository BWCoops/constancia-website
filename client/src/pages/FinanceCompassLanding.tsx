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
import { LazyInputOTP } from "@/components/finance-compass/LazyFormComponents";
import { Turnstile, useTurnstileToken } from "@/components/turnstile";
import { InstantPreview } from "@/components/finance-compass/InstantPreview";
import { SampleResultsPreview } from "@/components/finance-compass/SampleResultsPreview";
import { HeroResultsVisual } from "@/components/finance-compass/HeroResultsVisual";

import {
  CompassIcon,
  PreAssessmentIcon,
  FullAssessmentIcon,
  QualificationIcon,
} from "@/components/finance-compass-icons";
import { INDUSTRY_SECTORS, getSimplifiedIndustryList } from "@shared/finance-compass-industries";
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
        className="bg-[#8E4F67] border-[#8E4F67] text-white shadow-lg sm:shadow-2xl shadow-[#8E4F67]/40 rounded-full text-sm sm:text-base"
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

// Expanded industry list from APQC benchmarks - 47 industries across 16 sectors
const expandedIndustries = getSimplifiedIndustryList();

const companySizes = [
  "1-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1001-5000 employees",
  "5000+ employees",
];

// Transformation priority options for the registration form
// Users rank these 1-5 to indicate their strategic focus areas
const TRANSFORMATION_PRIORITIES = [
  { id: "epm", label: "Planning & Forecasting (EPM)", icon: Target, description: "Budgeting, forecasting, financial planning" },
  { id: "erp", label: "Core Finance Systems (ERP)", icon: Building2, description: "GL, AP, AR, core transactional systems" },
  { id: "ai", label: "AI & Automation", icon: Bot, description: "Machine learning, process automation, intelligent insights" },
  { id: "analytics", label: "Data & Analytics", icon: LineChart, description: "Reporting, dashboards, data integration" },
  { id: "consolidation", label: "Consolidation & Close", icon: ClipboardCheck, description: "Month-end close, consolidation, intercompany" },
];

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

type Step = "checking" | "form" | "otp" | "verified";

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
                      ? "bg-[#7FB8A3] text-[#F6F3EE]" 
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
  
  const [step, setStep] = useState<Step>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionStatus | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [isResending, setIsResending] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    companyDescription: "", // What the company does - for AI context
    jobTitle: "",
    industry: "",
    companySize: "",
    transformationPriorities: [] as string[], // Ordered list of priority IDs
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Handle priority ranking - users click to add/remove from their ranked list
  const togglePriority = (priorityId: string) => {
    setFormData(prev => {
      const currentPriorities = [...prev.transformationPriorities];
      const index = currentPriorities.indexOf(priorityId);
      
      if (index >= 0) {
        // Remove from list
        currentPriorities.splice(index, 1);
      } else {
        // Add to end of list
        currentPriorities.push(priorityId);
      }
      
      return { ...prev, transformationPriorities: currentPriorities };
    });
  };
  
  const getPriorityRank = (priorityId: string): number | null => {
    const index = formData.transformationPriorities.indexOf(priorityId);
    return index >= 0 ? index + 1 : null;
  };

  const { data: turnstileConfig } = useQuery<{ enabled: boolean; siteKey: string | null }>({
    queryKey: ["/api/config/turnstile"],
  });

  const [captchaToken, setCaptchaToken, clearCaptcha] = useTurnstileToken();

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

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);
  
  // Removed skeleton loader effect - caused white flash on mobile
  
  // Track page view and scroll on mount
  useEffect(() => {
    trackPageView("fc_landing");
    const cleanupScroll = setupScrollTracking("fc_landing");
    
    return () => {
      cleanupScroll();
    };
  }, []);
  
  // Setup widget visibility tracking for InstantPreview
  useEffect(() => {
    if (step === "form" && instantPreviewRef.current) {
      const cleanup = setupWidgetVisibilityTracking(
        instantPreviewRef.current,
        "fc_landing"
      );
      return cleanup;
    }
  }, [step]);
  
  useEffect(() => {
    if (step === "otp") {
      const otpCard = document.querySelector('[data-testid="input-otp"]');
      if (otpCard) {
        otpCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [step]);

  // Only preload heavy components after user is verified
  useEffect(() => {
    if (step === "verified") {
      preloadFinanceCompassComponents();
    }
  }, [step]);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/finance-compass/public/session", {
        credentials: "include",
      });
      const data: SessionStatus = await response.json();
      
      if (data.verified && data.contactId) {
        setSessionInfo(data);
        setContactId(data.contactId);
        setFormData(prev => ({
          ...prev,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
        }));
        setStep("verified");
      } else {
        setStep("form");
      }
    } catch (error) {
      console.error("Session check error:", error);
      setStep("form");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (featureFlags.requireBusinessEmail && !isBusinessEmail(formData.email)) {
      newErrors.email = "Please use your business email address";
    }
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!formData.jobTitle.trim()) newErrors.jobTitle = "Job title is required";
    if (!formData.industry) newErrors.industry = "Please select your industry";
    if (!formData.companySize) newErrors.companySize = "Please select company size";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (turnstileConfig?.enabled && !captchaToken) {
        toast({ title: "Verification required", description: "Please complete the \"I'm not a robot\" check before submitting.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const response = await apiRequest("POST", "/api/finance-compass/public/qualify", {
        ...formData,
        turnstileToken: turnstileConfig?.enabled ? captchaToken : null,
      });
      const result = await response.json();
      
      if (result.success) {
        setContactId(result.data.contactId);
        clearCaptcha();
        setStep("otp");
        setTimeout(() => {
          const otpCard = document.querySelector('[data-testid="input-otp"]');
          if (otpCard) {
            otpCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        toast({
          title: "Verification code sent",
          description: `We've sent a 6-digit code to ${formData.email}`,
        });
      } else {
        toast({
          title: "Something went wrong",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again or contact us for assistance.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6 || !contactId) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/finance-compass/public/verify-otp", {
        contactId,
        otp: otpValue,
      });
      const result = await response.json();
      
      if (result.success) {
        setSessionInfo({
          verified: true,
          contactId: result.data.contactId,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email,
        });
        setStep("verified");
        toast({
          title: "Email verified",
          description: "You now have access to all assessment tools.",
        });
      } else {
        toast({
          title: "Verification failed",
          description: result.error || "Please check the code and try again.",
          variant: "destructive",
        });
        setOtpValue("");
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setOtpValue("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!contactId) return;
    
    setIsResending(true);
    try {
      const response = await apiRequest("POST", "/api/finance-compass/public/resend-otp", {
        contactId,
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "New code sent",
          description: "Please check your email for the new verification code.",
        });
        setOtpValue("");
      } else {
        toast({
          title: "Failed to resend",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to resend",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleStartAssessment = (tierId: string) => {
    trackCTAClicked("fc_landing", "start_assessment");
    navigate(`/finance-compass/start/${tierId}?qualified=true&email=${encodeURIComponent(formData.email || sessionInfo?.email || "")}&company=${encodeURIComponent(formData.companyName)}`);
  };

  // Render different card content based on step
  const renderFormCard = () => {
    if (step === "checking") {
      return (
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal mb-4" />
            <p className="text-muted-foreground">Checking your session...</p>
          </CardContent>
        </Card>
      );
    }

    if (step === "verified") {
      return (
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
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
            <CardTitle className="text-xl text-[#F6F3EE]">
              Welcome back, {sessionInfo?.firstName || formData.firstName}!
            </CardTitle>
            <CardDescription className="text-sm">
              Your email <span className="font-medium text-[#F6F3EE]">{sessionInfo?.email || formData.email}</span> is verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button 
              className="w-full bg-brand-navy hover:bg-[#8E4F67]"
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

    if (step === "otp") {
      return (
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#8E4F67]/10">
                <Mail className="h-5 w-5 text-brand-teal" />
              </div>
              <Badge className="bg-[#7FB8A3]/20 text-brand-teal border-[#7FB8A3]/30">
                Verification Required
              </Badge>
            </div>
            <CardTitle className="text-xl text-[#F6F3EE]">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to <span className="font-medium">{formData.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4" data-testid="input-otp">
              <LazyInputOTP
                maxLength={6}
                value={otpValue}
                onChange={setOtpValue}
              />
              
              <p className="text-sm text-muted-foreground text-center">
                Enter the code from your email
              </p>
            </div>

            <Button
              className="w-full bg-[#8E4F67] hover:bg-brand-navy"
              onClick={handleVerifyOtp}
              disabled={otpValue.length !== 6 || isSubmitting}
              data-testid="button-verify-otp"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Verify Email
            </Button>

            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Didn't receive it?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOtp}
                disabled={isResending}
                className="text-brand-teal px-2 h-auto"
                data-testid="button-resend-otp"
              >
                {isResending ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Resend code
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("form");
                setOtpValue("");
                setContactId(null);
              }}
              className="w-full text-muted-foreground"
              data-testid="button-back-to-form"
            >
              Use a different email
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Form step
    return (
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#8E4F67]/10">
              <QualificationIcon className="h-5 w-5 text-brand-teal" />
            </div>
            <Badge className="bg-[#7FB8A3]/20 text-brand-teal border-[#7FB8A3]/30">
              Step 2 of 3
            </Badge>
          </div>
          <CardTitle className="text-xl text-[#F6F3EE]">Continue to Full Assessment</CardTitle>
          <CardDescription>
            Register to run the full 74-question assessment. Get the deeper scoring, the AI analysis, and a roadmap that's actually about your stack.
          </CardDescription>
          {/* Progression indicator */}
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
        <CardContent>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`pl-9 ${errors.firstName ? "border-destructive" : ""}`}
                    data-testid="input-firstName"
                  />
                </div>
                {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={errors.lastName ? "border-destructive" : ""}
                  data-testid="input-lastName"
                />
                {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
              </div>
            </div>
            
            <div>
              <Label htmlFor="email" className="text-xs">{featureFlags.requireBusinessEmail ? "Business Email" : "Email"} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={featureFlags.requireBusinessEmail ? "john.smith@company.com" : "you@example.com"}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`pl-9 ${errors.email ? "border-destructive" : ""}`}
                  data-testid="input-email"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <Label htmlFor="phone" className="text-xs">Phone (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+44 20 1234 5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-9"
                  data-testid="input-phone"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="companyName" className="text-xs">Company Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="companyName"
                  placeholder="Company Ltd"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className={`pl-9 ${errors.companyName ? "border-destructive" : ""}`}
                  data-testid="input-companyName"
                />
              </div>
              {errors.companyName && <p className="text-xs text-destructive mt-1">{errors.companyName}</p>}
            </div>
            
            <div>
              <Label htmlFor="companyDescription" className="text-xs">What does your company do? (Optional)</Label>
              <Textarea
                id="companyDescription"
                placeholder="Brief description of your business, products or services..."
                value={formData.companyDescription}
                onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
                className="min-h-[60px] resize-none text-sm"
                data-testid="input-companyDescription"
              />
              <p className="text-xs text-muted-foreground mt-1">Helps us provide more relevant insights</p>
            </div>
            
            <div>
              <Label htmlFor="jobTitle" className="text-xs">Job Title *</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="jobTitle"
                  placeholder="CFO, Finance Director..."
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className={`pl-9 ${errors.jobTitle ? "border-destructive" : ""}`}
                  data-testid="input-jobTitle"
                />
              </div>
              {errors.jobTitle && <p className="text-xs text-destructive mt-1">{errors.jobTitle}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Industry *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                >
                  <SelectTrigger className={errors.industry ? "border-destructive" : ""} data-testid="select-industry">
                    <SelectValue placeholder="Select industry..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {INDUSTRY_SECTORS.map((sector) => (
                      <div key={sector.code}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {sector.name}
                        </div>
                        {sector.industries.map((industry) => (
                          <SelectItem key={industry.code} value={industry.name}>
                            {industry.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {errors.industry && <p className="text-xs text-destructive mt-1">{errors.industry}</p>}
              </div>
              <div>
                <Label className="text-xs">Company Size *</Label>
                <Select
                  value={formData.companySize}
                  onValueChange={(value) => setFormData({ ...formData, companySize: value })}
                >
                  <SelectTrigger className={errors.companySize ? "border-destructive" : ""} data-testid="select-companySize">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.companySize && <p className="text-xs text-destructive mt-1">{errors.companySize}</p>}
              </div>
            </div>

            {/* Transformation Priorities - Click to rank */}
            <div className="pt-2">
              <Label className="text-xs flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-brand-teal" />
                Transformation Priorities (click to rank)
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select your top priorities in order of importance. This helps us tailor your assessment.
              </p>
              <div className="space-y-1.5">
                {TRANSFORMATION_PRIORITIES.map((priority) => {
                  const rank = getPriorityRank(priority.id);
                  const isSelected = rank !== null;
                  const PriorityIcon = priority.icon;
                  
                  return (
                    <button
                      key={priority.id}
                      type="button"
                      onClick={() => togglePriority(priority.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-md border transition-all text-left ${
                        isSelected 
                          ? "border-[#8E4F67] bg-[#8E4F67]/10 dark:bg-[#8E4F67]/20" 
                          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                      }`}
                      data-testid={`priority-${priority.id}`}
                    >
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#8E4F67] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {rank}
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                          <PriorityIcon className="h-3 w-3 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium block ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                          {priority.label}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block">
                          {priority.description}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-brand-teal flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              {formData.transformationPriorities.length > 0 && (
                <p className="text-xs text-brand-teal mt-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {formData.transformationPriorities.length} priorit{formData.transformationPriorities.length === 1 ? "y" : "ies"} selected
                </p>
              )}
            </div>

            {turnstileConfig?.enabled && turnstileConfig.siteKey && (
              <Turnstile
                siteKey={turnstileConfig.siteKey}
                onVerify={setCaptchaToken}
                onExpire={clearCaptcha}
                className="my-2"
              />
            )}

            <Button
              type="submit"
              className="w-full bg-[#8E4F67] hover:bg-brand-navy"
              disabled={isSubmitting || (turnstileConfig?.enabled ? !captchaToken : false)}
              data-testid="button-submit-qualification"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Verify & Unlock Access
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              We'll send a verification code to your email. Your data is protected under GDPR.
            </p>
          </form>
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
        <section className="relative min-h-[500px] sm:min-h-[600px] flex items-center overflow-hidden bg-gradient-to-br from-[#252826] via-[#5E8D7A] to-[#8E4F67]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-[#7FB8A3] rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-[#8E4F67] rounded-full blur-3xl" />
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
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight max-w-4xl mx-auto">
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center flex-shrink-0">
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
                    <div className="text-lg sm:text-xl font-bold text-brand-cyan">{stat.value}</div>
                    <div className="text-[10px] sm:text-xs text-white/70 leading-tight">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col">
                {step === "form" && (
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
                {step === "form" ? (
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
        <section className="py-10 sm:py-16 bg-gradient-to-b from-white to-slate-50 dark:from-background dark:to-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div 
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-3 sm:mb-4 bg-[#7FB8A3]/20 text-brand-teal border-[#7FB8A3]/30">
                <Rocket className="h-3 w-3 mr-1" />
                The AI Imperative
              </Badge>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#F6F3EE] mb-2 sm:mb-3 px-2">
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
                  color: "from-[#8E4F67] to-[#252826]"
                },
                {
                  stat: "47%",
                  label: "GenAI in FP&A",
                  description: "Organisations using GenAI in 2025, up from 6% in 2024",
                  source: "Gartner Survey",
                  icon: TrendingUp,
                  color: "from-[#7FB8A3] to-[#8E4F67]"
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
                  color: "from-purple-500 to-[#252826]"
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
                      <div className="text-xl sm:text-2xl font-bold text-[#F6F3EE] mb-1">
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
        <section id="registration-form" className="py-10 sm:py-16 bg-gradient-to-br from-[#252826] via-[#5E8D7A] to-[#8E4F67] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 sm:right-20 w-48 sm:w-64 h-48 sm:h-64 bg-[#7FB8A3] rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 sm:left-20 w-56 sm:w-80 h-56 sm:h-80 bg-[#8E4F67] rounded-full blur-3xl" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div 
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#7FB8A3] mb-4">
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
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-muted/20 dark:via-background dark:to-muted/20" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7FB8A3]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#8E4F67]/5 rounded-full blur-3xl" />
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
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#8E4F67] mb-4">
                Start the assessment
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-light leading-tight text-[#F6F3EE] mb-3">
                The diagnostic a consulting firm would charge you<br className="hidden sm:inline" /> <em className="not-italic font-normal text-[#8E4F67]">five figures</em> to run.
              </h2>
              <p className="text-base sm:text-lg text-[#F6F3EE]/70 max-w-2xl mx-auto mb-4">
                74 questions across 7 dimensions. AI-validated against 200+ EPM benchmarks. Done in 12 minutes. Yours, calibrated to your stack and your industry.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7FB8A3]/10 border border-[#7FB8A3]/30">
                <Zap className="h-4 w-4 text-brand-teal" />
                <span className="text-sm font-medium text-[#F6F3EE]">Enterprise-grade analysis | Months of work in 20 minutes</span>
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
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-[#F6F3EE] text-sm">10-15 min</p>
                  <p className="text-xs text-muted-foreground">Quick assessment</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#8E4F67] to-[#252826] flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-[#F6F3EE] text-sm">7 Dimensions</p>
                  <p className="text-xs text-muted-foreground">Full diagnostic</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-[#F6F3EE] text-sm">AI-Powered</p>
                  <p className="text-xs text-muted-foreground">Smart insights</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-[#F6F3EE] text-sm">Secure</p>
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
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#8E4F67] text-center mb-5">
                What you walk out with
              </div>
              <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-sm text-[#F6F3EE]/85">
                {[
                  "Readiness score",
                  "Dimension breakdown",
                  "AI-validated insights",
                  "Peer benchmarks",
                  "Sequenced roadmap",
                ].map((item, idx, arr) => (
                  <span key={item} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#8E4F67]/60 tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium">{item}</span>
                    {idx < arr.length - 1 && (
                      <span aria-hidden="true" className="text-[#F6F3EE]/25">·</span>
                    )}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Your Assessment Journey Section */}
        <section className="py-12 sm:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#252826]/5 via-transparent to-[#8E4F67]/5" />
          <div className="absolute top-20 left-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-[#7FB8A3]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-56 sm:w-80 h-56 sm:h-80 bg-[#8E4F67]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div 
              className="text-center mb-10 sm:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#F6F3EE] mb-2 sm:mb-3">
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
              <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-green-500/30 via-[#8E4F67]/30 to-[#252826]/30 -translate-y-1/2" />
              
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
                      <CardTitle className="text-lg text-[#F6F3EE]">
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
                      <div className="w-0.5 h-3 bg-gradient-to-b from-green-500/50 to-[#7FB8A3]/50" />
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
                  <Card className="lg:h-full border-[#8E4F67]/30 bg-gradient-to-b from-[#8E4F67]/10 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <motion.div 
                          className="h-12 w-12 rounded-full bg-gradient-to-br from-[#8E4F67] to-[#252826] flex items-center justify-center shadow-lg"
                          whileHover={{ scale: 1.05 }}
                        >
                          <PreAssessmentIcon className="h-6 w-6 text-white" />
                        </motion.div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-[#8E4F67]/10 text-brand-teal border-[#8E4F67]/20">
                            Step 2
                          </Badge>
                          <Badge variant="default" className="text-xs">
                            Open Access
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg text-[#F6F3EE]">
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
                          className="h-full bg-gradient-to-r from-[#8E4F67] to-[#7FB8A3] rounded-full"
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
                      <div className="w-0.5 h-3 bg-gradient-to-b from-[#8E4F67]/50 to-[#252826]/50" />
                      <ArrowRight className="h-4 w-4 text-[#F6F3EE] rotate-90" />
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
                  <Card className="lg:h-full border-[#252826]/30 bg-gradient-to-b from-[#252826]/5 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <motion.div 
                          className="h-12 w-12 rounded-full bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center shadow-lg"
                          whileHover={{ scale: 1.05 }}
                        >
                          <FullAssessmentIcon className="h-6 w-6 text-white" />
                        </motion.div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-brand-navy/10 text-[#F6F3EE] border-[#252826]/20 dark:text-white dark:border-white/20">
                            Step 3
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Contact Us
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg text-[#F6F3EE]">
                        Full Assessment
                      </CardTitle>
                      <CardDescription className="text-sm">
                        The deepest tier. A senior consultant works the diagnostic with you, and the roadmap is built around your stack, not a template.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[#F6F3EE]/70">
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Executive-ready PDF report</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#F6F3EE]/70">
                        <Award className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Consultant follow-up session</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#F6F3EE]/70">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Personalised transformation roadmap</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#F6F3EE]/70">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Industry benchmarking insights</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#252826] to-[#8E4F67] rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Insight depth</span>
                        <span className="font-medium text-[#F6F3EE]">100%</span>
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
              <div className="absolute inset-0 bg-gradient-to-r from-[#252826]/5 via-[#8E4F67]/10 to-[#7FB8A3]/5 rounded-2xl" />
              <Card className="relative border-dashed border-[#8E4F67]/30 bg-transparent overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#7FB8A3]/20 to-transparent rounded-full blur-2xl" />
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center shadow-lg flex-shrink-0"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-base sm:text-lg text-[#F6F3EE]">
                          Beyond the Assessment
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Your complete transformation journey continues with expert-led workshops
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-[#8E4F67] to-[#252826] text-white border-0 self-start sm:self-auto">
                      Premium Journey
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* Workshop Series */}
                    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-background/50 border border-[#8E4F67]/20">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-[#8E4F67]/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[#F6F3EE] text-xs sm:text-sm mb-1">
                          4-Workshop Series
                        </h4>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          Expert-facilitated sessions over 8 weeks covering strategy, implementation, and change management
                        </p>
                      </div>
                    </div>

                    {/* Execution Tracking */}
                    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-background/50 border border-[#8E4F67]/20">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-[#8E4F67]/10 flex items-center justify-center flex-shrink-0">
                        <LineChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[#F6F3EE] text-xs sm:text-sm mb-1">
                          AI-Powered Tracking
                        </h4>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          Real-time execution monitoring with AI insights to keep your transformation on track
                        </p>
                      </div>
                    </div>

                    {/* Final Deliverables */}
                    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-background/50 border border-[#8E4F67]/20">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-[#8E4F67]/10 flex items-center justify-center flex-shrink-0">
                        <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-teal" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[#F6F3EE] text-xs sm:text-sm mb-1">
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
                      className="border-[#8E4F67] text-brand-teal hover:bg-[#8E4F67]/10"
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
              <h2 className="text-3xl md:text-4xl font-bold text-[#F6F3EE]">
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
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center mb-5 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#F6F3EE] mb-3">
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
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#8E4F67] to-[#252826] flex items-center justify-center mb-5 shadow-lg">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#F6F3EE] mb-3">
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
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#252826] to-[#8E4F67] flex items-center justify-center mb-5 shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#F6F3EE] mb-3">
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
              <div className="p-6 rounded-xl bg-gradient-to-r from-[#252826]/5 via-[#8E4F67]/10 to-[#7FB8A3]/5 border border-[#8E4F67]/20">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#7FB8A3] to-[#8E4F67] flex items-center justify-center shadow-lg">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-[#F6F3EE] mb-3">
                  Future-Ready Finance
                </h3>
                <p className="text-muted-foreground mb-4">
                  Prepare your finance function for the autonomous future. Our assessment evaluates your readiness for agentic AI, 
                  continuous close processes, and self-service analytics - positioning your team to lead rather than follow the AI revolution in finance.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Badge variant="outline" className="border-[#8E4F67]/30 text-brand-teal">
                    <Cpu className="h-3 w-3 mr-1" />
                    Agentic AI Readiness
                  </Badge>
                  <Badge variant="outline" className="border-[#8E4F67]/30 text-brand-teal">
                    <LineChart className="h-3 w-3 mr-1" />
                    Continuous Close
                  </Badge>
                  <Badge variant="outline" className="border-[#8E4F67]/30 text-brand-teal">
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
        visible={step === "form"}
      />
    </div>
  );
}
