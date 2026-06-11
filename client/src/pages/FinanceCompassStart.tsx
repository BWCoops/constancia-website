import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Clock, CheckCircle2, ArrowLeft, AlertTriangle, RotateCcw, Trash2, Play } from "lucide-react";
import { trackPageView, trackCTAClicked, getTrackingData } from "@/lib/funnel-analytics";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatbotWidget } from "@/components/finance-compass/ChatbotWidget";

interface SessionStatus {
  verified: boolean;
  contactId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
}

interface ExistingAssessment {
  id: string;
  tier: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  questionsAnswered: number;
  totalQuestions: number;
  overallMaturityScore: number | null;
}

interface CheckExistingResponse {
  success: boolean;
  data: {
    hasExisting: boolean;
    assessment?: ExistingAssessment;
    hasMultiple?: boolean;
    hasInProgress?: boolean;
    hasCompleted?: boolean;
    latestCompletedId?: string | null;
  };
}

const tierInfo: Record<string, { name: string; duration: string; questions: number; description: string }> = {
  pre_assessment: {
    name: "Pre-Assessment",
    duration: "20-25 minutes",
    questions: 50,
    description: "Comprehensive Finance Transformation readiness evaluation for finance leaders",
  },
  full: {
    name: "Full Assessment",
    duration: "35-45 minutes",
    questions: 74,
    description: "Complete 7-dimension finance transformation analysis",
  },
};

export default function FinanceCompassStart() {
  const params = useParams<{ tier: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tier = params.tier as string;
  const info = tierInfo[tier] || tierInfo.pre_assessment;

  const [showExistingDialog, setShowExistingDialog] = useState(false);
  const [existingAssessment, setExistingAssessment] = useState<ExistingAssessment | null>(null);
  const [hasMultipleAssessments, setHasMultipleAssessments] = useState(false);
  const [latestCompletedId, setLatestCompletedId] = useState<string | null>(null);

  const { data: sessionData, isLoading: sessionLoading } = useQuery<SessionStatus>({
    queryKey: ["/api/finance-compass/public/session"],
  });

  // Track page view on mount
  useEffect(() => {
    trackPageView("fc_start");
  }, []);

  // Check for existing assessment on mount
  const checkExistingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/finance-compass/public/assessments/check-existing", {
        tier,
      });
      return response.json() as Promise<CheckExistingResponse>;
    },
    onSuccess: (result) => {
      if (result.success && result.data.hasExisting && result.data.assessment) {
        setExistingAssessment(result.data.assessment);
        setHasMultipleAssessments(!!result.data.hasMultiple);
        setLatestCompletedId(result.data.latestCompletedId || null);
        setShowExistingDialog(true);
      }
    },
  });

  const startMutation = useMutation({
    mutationFn: async (action: "start" | "resume" | "delete_and_start" | "retake" = "start") => {
      const tracking = getTrackingData();
      const response = await apiRequest("POST", "/api/finance-compass/public/assessments/start-verified", {
        tier,
        action,
        tracking,
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setShowExistingDialog(false);
        // When retaking, add query param so assess page knows to start from first question
        const retakeParam = result.data.retake ? '?retake=true' : '';
        navigate(`/finance-compass/assess/${result.data.assessmentId}${retakeParam}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to start assessment",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      let message = "Failed to start assessment. Please try again.";
      try {
        const jsonPart = error.message?.replace(/^\d+:\s*/, "");
        const parsed = JSON.parse(jsonPart);
        message = parsed.error || message;
      } catch {}
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!sessionLoading && sessionData) {
      if (!sessionData.verified) {
        toast({
          title: "Verification Required",
          description: "Please verify your email first to access assessments.",
          variant: "destructive",
        });
        navigate("/finance-compass");
      }
    }
  }, [sessionData, sessionLoading, navigate, toast]);

  // Check for existing assessment when session is verified
  useEffect(() => {
    if (sessionData?.verified && !checkExistingMutation.isPending && !checkExistingMutation.isSuccess) {
      checkExistingMutation.mutate();
    }
  }, [sessionData?.verified]);

  const handleStartAssessment = () => {
    trackCTAClicked("fc_start", "begin_assessment");
    if (existingAssessment) {
      setShowExistingDialog(true);
    } else {
      startMutation.mutate("start");
    }
  };

  const handleResume = () => {
    startMutation.mutate("resume");
  };

  const handleRetake = () => {
    startMutation.mutate("retake");
  };

  const handleDeleteAndStart = () => {
    startMutation.mutate("delete_and_start");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
      case "completed":
      case "analysed":
      case "report_generated":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (sessionLoading || checkExistingMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-teal mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!sessionData?.verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-teal mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Start ${info.name} | FinanceCompass | Constancia`}
        description={info.description}
      />

      {/* Existing Assessment Dialog */}
      <Dialog open={showExistingDialog} onOpenChange={setShowExistingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Existing Assessment Found
            </DialogTitle>
            <DialogDescription>
              You already have a {info.name} in progress. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          
          {existingAssessment && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(existingAssessment.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-medium">
                  {existingAssessment.questionsAnswered} / {existingAssessment.totalQuestions} questions
                </span>
              </div>
              {existingAssessment.overallMaturityScore !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-medium">{existingAssessment.overallMaturityScore}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started:</span>
                <span className="font-medium">
                  {new Date(existingAssessment.startedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {/* For completed assessments - show View Results and Retake options */}
            {existingAssessment && ["completed", "analysed", "report_generated"].includes(existingAssessment.status) ? (
              <>
                <Button
                  className="w-full bg-gradient-to-r from-brand-ink to-brand-berry"
                  onClick={() => navigate(`/finance-compass/results/${existingAssessment.id}`)}
                  data-testid="button-view-results"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  View Results
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRetake}
                  disabled={startMutation.isPending}
                  data-testid="button-retake-assessment"
                >
                  {startMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Retake Assessment (Keep Previous Answers)
                </Button>
              </>
            ) : (
              /* For in-progress assessments - show Continue option */
              <>
                <Button
                  className="w-full bg-gradient-to-r from-brand-ink to-brand-berry"
                  onClick={handleResume}
                  disabled={startMutation.isPending}
                  data-testid="button-resume-assessment"
                >
                  {startMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Continue Existing Assessment
                </Button>
                
                {/* Show View Completed Results if there's also a completed assessment */}
                {hasMultipleAssessments && latestCompletedId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/finance-compass/results/${latestCompletedId}`)}
                    data-testid="button-view-completed-results"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    View Previous Completed Results
                  </Button>
                )}
              </>
            )}
            
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleDeleteAndStart}
              disabled={startMutation.isPending}
              data-testid="button-delete-start-fresh"
            >
              {startMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete and Start Fresh
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowExistingDialog(false)}
              data-testid="button-cancel-dialog"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link href="/finance-compass">
              <Button variant="ghost" className="mb-6" data-testid="button-back">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>

            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{info.name}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {info.duration}
                      </div>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">Ready to Begin?</CardTitle>
                    <CardDescription>
                      Welcome back, {sessionData.firstName}! You're all set to start your {info.name}. 
                      Your progress will be saved automatically.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
                      <p className="text-sm font-medium">Your Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                        <div className="break-words">
                          <span className="text-muted-foreground">Name: </span>
                          <span className="font-medium">{sessionData.firstName} {sessionData.lastName}</span>
                        </div>
                        <div className="break-words">
                          <span className="text-muted-foreground">Email: </span>
                          <span className="font-medium text-xs sm:text-sm">{sessionData.email}</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      size="lg" 
                      className="w-full bg-gradient-to-r from-brand-ink to-brand-berry hover:from-brand-berry hover:to-brand-mint"
                      disabled={startMutation.isPending}
                      onClick={handleStartAssessment}
                      data-testid="button-start-assessment"
                    >
                      {startMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Starting...
                        </>
                      ) : existingAssessment ? (
                        <>
                          Continue or Start New
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      ) : (
                        <>
                          Start {info.name}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      By continuing, you agree to our{" "}
                      <Link href="/privacy" className="underline">Privacy Policy</Link>
                      {" "}and{" "}
                      <Link href="/terms" className="underline">Terms of Use</Link>.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="bg-gradient-to-br from-brand-ink to-brand-berry text-white border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">What You Will Get</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      "Personalised Finance Transformation Readiness score",
                      "Key transformation priorities",
                      "Actionable recommendations",
                      "Industry benchmark comparisons",
                      tier === "full" && "Executive PDF report",
                      tier === "full" && "Consultant follow-up session",
                    ].filter(Boolean).map((benefit) => (
                      <div key={benefit as string} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-brand-cyan flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-white/90">{benefit}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                      <div className="text-center">
                        <div className="text-2xl sm:text-4xl font-bold text-brand-teal mb-1">{info.questions}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Questions</div>
                      </div>
                      <div className="lg:border-t lg:pt-4 text-center">
                        <div className="text-lg sm:text-4xl font-bold text-brand-teal mb-1">{info.duration}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">To Complete</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
      
      <ChatbotWidget />
    </div>
  );
}
