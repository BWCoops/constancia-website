import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, Lock, Home, Save, Sparkles, ListChecks, Edit3, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SEOHead } from "@/components/seo-head";
import { Link } from "wouter";
import { AssessmentQuestion } from "@/components/finance-compass/AssessmentQuestion";
import type { Question } from "@/components/finance-compass/AssessmentQuestion";
import { ChatbotWidget } from "@/components/finance-compass/ChatbotWidget";
import { 
  trackAssessmentPageView, 
  trackAssessmentStart, 
  trackAssessmentProgress, 
  trackQuestionAnswered, 
  trackAssessmentComplete 
} from "@/lib/funnel-analytics";

interface AnsweredQuestion {
  questionId: string;
  questionKey: string;
  prompt: string;
  dimension: string;
  sequence: number;
  displayValue: string;
  rawValue?: string;
  response: unknown;
  answeredAt: string;
}

interface SessionStatus {
  verified: boolean;
  contactId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AdaptiveQuestionData {
  question: {
    id: string;
    questionKey: string;
    prompt: string;
    type: string;
    options?: Array<{ value: string; label: string; description?: string }>;
    helpText?: string;
    dimension: string;
    sequence: number;
    required?: boolean;
    sliderConfig?: { min: number; max: number; labels: Record<number, string> };
    structuredFields?: Array<{ id: string; label: string; type: string; placeholder?: string }>;
    scoringConfig?: { maxSelections?: number; allowOther?: boolean };
  };
  isGenerated: boolean;
  isComplete: boolean;
  skippedQuestionIds: string[];
  totalQuestions: number;
  answeredQuestions: number;
  savedResponse?: {
    value: any;
    rawValue?: string;
  } | null;
}

interface NextQuestionResponse {
  success: boolean;
  data: AdaptiveQuestionData;
}

interface AdaptiveResponseResult {
  success: boolean;
  data: {
    saved: boolean;
    responseId?: string;
    nextQuestion: AdaptiveQuestionData;
  };
}

const tierNames: Record<string, string> = {
  pre_assessment: "Pre-Assessment",
  full: "Full Assessment",
};

const DIMENSION_CONFIG: Record<string, { name: string; shortName: string; icon: string; color: string }> = {
  qualification: {
    name: "Qualification",
    shortName: "Qualification",
    icon: "Shield",
    color: "#0884AA",
  },
  sizing: {
    name: "Organisation Sizing",
    shortName: "Sizing",
    icon: "Building2",
    color: "#02205B",
  },
  financial_planning_analysis: {
    name: "Financial Planning & Analysis",
    shortName: "FP&A",
    icon: "TrendingUp",
    color: "#0884AA",
  },
  management_reporting: {
    name: "Management Reporting",
    shortName: "Reporting",
    icon: "BarChart3",
    color: "#12EBFC",
  },
  consolidation_close: {
    name: "Consolidation & Close",
    shortName: "Close",
    icon: "RefreshCw",
    color: "#02205B",
  },
  financial_controls_compliance: {
    name: "Controls & Compliance",
    shortName: "Controls",
    icon: "Shield",
    color: "#6366F1",
  },
  technology_systems: {
    name: "Technology & Systems",
    shortName: "Technology",
    icon: "Server",
    color: "#10B981",
  },
  organisation_people: {
    name: "Organisation & People",
    shortName: "People",
    icon: "Users",
    color: "#F59E0B",
  },
  data_analytics: {
    name: "Data & Analytics",
    shortName: "Data",
    icon: "Database",
    color: "#EC4899",
  },
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

export default function FinanceCompassAssess() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const assessmentId = params.id;
  
  // Check for retake mode from URL query param - use ref to track initial retake state
  const urlParams = new URLSearchParams(window.location.search);
  const isRetakeMode = urlParams.get('retake') === 'true';

  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [direction, setDirection] = useState(0);
  const [currentQuestionData, setCurrentQuestionData] = useState<AdaptiveQuestionData | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [tier, setTier] = useState<string>("quick_assessment");
  const [questionsBySequence, setQuestionsBySequence] = useState<Record<number, AdaptiveQuestionData>>({});
  // In retake mode, auto-show the answered panel so users can see their previous answers
  const [showAnsweredPanel, setShowAnsweredPanel] = useState(isRetakeMode);
  // Track retake mode - stays true throughout the retake session
  const [retakeModeActive, setRetakeModeActive] = useState(isRetakeMode);
  // Track if initial retake fetch has been done
  const [initialRetakeFetchDone, setInitialRetakeFetchDone] = useState(false);
  // Track the current sequence number for explicit navigation in retake mode
  const [currentSequence, setCurrentSequence] = useState<number>(1);

  const { data: sessionData, isLoading: sessionLoading } = useQuery<SessionStatus>({
    queryKey: ["/api/finance-compass/public/session"],
  });

  // Use stable query key - don't change it based on retake mode to avoid refetch
  // Only use startFromFirst on initial retake fetch
  const { data: nextQuestionResult, isLoading: initialLoading, error: nextQuestionError, refetch: refetchQuestion } = useQuery<NextQuestionResponse>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "next-question"],
    queryFn: async () => {
      // Only add startFromFirst on the FIRST fetch in retake mode
      const shouldUseStartFromFirst = retakeModeActive && !initialRetakeFetchDone;
      const url = shouldUseStartFromFirst 
        ? `/api/finance-compass/public/assessments/${assessmentId}/next-question?startFromFirst=true`
        : `/api/finance-compass/public/assessments/${assessmentId}/next-question`;
      const res = await fetch(url, { credentials: 'include' });
      return res.json();
    },
    enabled: !!assessmentId && sessionData?.verified === true,
    // Prevent automatic refetches - we manually control when to refetch
    staleTime: retakeModeActive ? Infinity : 0,
    refetchOnWindowFocus: false,
  });

  // Fetch answered questions for inline editing panel
  // In retake mode, always fetch so users can see which questions have been answered
  const { data: answeredQuestionsResult, refetch: refetchAnsweredQuestions } = useQuery<{ success: boolean; data: { answeredQuestions: AnsweredQuestion[]; totalAnswered: number } }>({
    queryKey: ["/api/finance-compass/public/assessments", assessmentId, "answered-questions"],
    enabled: !!assessmentId && sessionData?.verified === true && (showAnsweredPanel || retakeModeActive),
  });

  const answeredQuestionsList = answeredQuestionsResult?.data?.answeredQuestions || [];

  // Refs for tracking
  const assessmentStartTimeRef = useRef<number | null>(null);
  const questionStartTimeRef = useRef<number | null>(null);
  const previousAnsweredCountRef = useRef(0);

  // Track page view on mount
  useEffect(() => {
    trackAssessmentPageView(assessmentId);
  }, [assessmentId]);

  // Track assessment start and progress milestones
  useEffect(() => {
    if (!currentQuestionData?.question) return;

    const totalQuestions = currentQuestionData.totalQuestions;
    const answeredQuestions = currentQuestionData.answeredQuestions;
    const currentQuestionNumber = currentQuestionData.question.sequence;

    // Track assessment start on first question load
    if (previousAnsweredCountRef.current === 0 && answeredQuestions === 0) {
      assessmentStartTimeRef.current = Date.now();
      trackAssessmentStart(assessmentId);
    }

    // Set question start time for tracking time-to-answer
    questionStartTimeRef.current = Date.now();

    // Track progress at milestones (25%, 50%, 75%, 100%)
    if (totalQuestions > 0) {
      const progressPercent = Math.round((answeredQuestions / totalQuestions) * 100);
      const milestones = [25, 50, 75, 100];
      const previousProgressPercent = previousAnsweredCountRef.current > 0 
        ? Math.round((previousAnsweredCountRef.current / totalQuestions) * 100)
        : 0;

      for (const milestone of milestones) {
        if (progressPercent >= milestone && previousProgressPercent < milestone) {
          trackAssessmentProgress(milestone, currentQuestionNumber, assessmentId);
        }
      }
    }

    previousAnsweredCountRef.current = answeredQuestions;
  }, [currentQuestionData, assessmentId]);

  useEffect(() => {
    if (nextQuestionResult?.success && nextQuestionResult.data) {
      const data = nextQuestionResult.data;
      
      // In retake mode, don't redirect to results - show questions for review
      if (data.isComplete && !retakeModeActive) {
        toast({
          title: "Assessment Complete!",
          description: "Redirecting to your results...",
        });
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'finance_compass_submission', {
            event_category: 'lead_generation',
            event_label: 'FinanceCompass Assessment',
          });
        }
        navigate(`/finance-compass/results/${assessmentId}`);
        return;
      }
      
      // Mark initial retake fetch as done after first question loads successfully
      // This prevents future refetches from using startFromFirst
      if (retakeModeActive && data.question && !initialRetakeFetchDone) {
        setInitialRetakeFetchDone(true);
        // Clear the URL query param for clean navigation
        window.history.replaceState({}, '', `/finance-compass/assess/${assessmentId}`);
      }
      
      setCurrentQuestionData(data);
      
      if (data.question?.sequence) {
        // Track the current sequence for navigation
        setCurrentSequence(data.question.sequence);
        setQuestionsBySequence(prev => ({
          ...prev,
          [data.question.sequence]: data
        }));
      }
      
      // Hydrate responses from savedResponse or set slider defaults
      if (data.question?.id) {
        const questionId = data.question.id;
        const savedValue = data.savedResponse?.value;
        const sliderConfig = data.question.sliderConfig;
        
        if (savedValue !== undefined) {
          // Restore saved response
          setResponses(prev => ({
            ...prev,
            [questionId]: savedValue
          }));
        } else if (data.question.type === 'slider' && sliderConfig) {
          // Initialize slider with min value so user can proceed without moving it
          setResponses(prev => ({
            ...prev,
            [questionId]: sliderConfig.min
          }));
        }
      }
    }
  }, [nextQuestionResult, navigate, assessmentId, toast, retakeModeActive, initialRetakeFetchDone]);

  const adaptiveResponseMutation = useMutation({
    mutationFn: async ({ questionId, response, requestedNextSequence }: { questionId: string; response: any; requestedNextSequence?: number }) => {
      const res = await apiRequest("POST", `/api/finance-compass/public/assessments/${assessmentId}/adaptive-response`, {
        questionId,
        response,
        rawValue: typeof response === "string" ? response : JSON.stringify(response),
        requestedNextSequence,
      });
      return res.json() as Promise<AdaptiveResponseResult>;
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        const { nextQuestion } = result.data;
        const currentQNum = currentQuestionData?.question?.sequence || 1;
        
        // Track question answered with time taken
        if (questionStartTimeRef.current) {
          const timeToAnswer = Date.now() - questionStartTimeRef.current;
          trackQuestionAnswered(currentQNum, assessmentId, timeToAnswer);
        }
        
        // In retake mode, don't redirect to results - let user continue reviewing
        // Only redirect if not in retake mode
        if (nextQuestion.isComplete && !retakeModeActive) {
          // Track assessment completion with total time and final score
          if (assessmentStartTimeRef.current) {
            const totalTime = Date.now() - assessmentStartTimeRef.current;
            // We can calculate a score based on dimension scores if available
            trackAssessmentComplete(assessmentId, totalTime, undefined);
          }
          
          toast({
            title: "Assessment Complete!",
            description: "Redirecting to your results...",
          });
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'finance_compass_submission', {
              event_category: 'lead_generation',
              event_label: 'FinanceCompass Assessment',
            });
          }
          navigate(`/finance-compass/results/${assessmentId}`);
          return;
        }
        
        if (nextQuestion.question?.sequence) {
          // Track the current sequence for navigation
          setCurrentSequence(nextQuestion.question.sequence);
          setQuestionsBySequence(prev => ({
            ...prev,
            [nextQuestion.question.sequence]: nextQuestion
          }));
        }
        
        // Hydrate responses for next question (prefill with saved answers in retake mode)
        if (nextQuestion.question?.id) {
          const questionId = nextQuestion.question.id;
          const savedValue = nextQuestion.savedResponse?.value;
          const sliderConfig = nextQuestion.question.sliderConfig;
          
          if (savedValue !== undefined) {
            setResponses(prev => ({
              ...prev,
              [questionId]: savedValue
            }));
          } else if (nextQuestion.question.type === 'slider' && sliderConfig) {
            setResponses(prev => ({
              ...prev,
              [questionId]: sliderConfig.min
            }));
          }
        }
        
        setDirection(1);
        setCurrentQuestionData(nextQuestion);
        setIsLoadingQuestion(false);
      }
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Your response couldn't be saved. Please try again.",
        variant: "destructive",
      });
      setIsLoadingQuestion(false);
    },
  });

  const currentQuestion: Question | null = currentQuestionData?.question ? {
    id: currentQuestionData.question.id,
    questionKey: currentQuestionData.question.questionKey,
    questionType: currentQuestionData.question.type,
    questionText: currentQuestionData.question.prompt,
    helpText: currentQuestionData.question.helpText,
    required: currentQuestionData.question.required ?? true,
    options: currentQuestionData.question.options,
    sliderConfig: currentQuestionData.question.sliderConfig,
    structuredFields: currentQuestionData.question.structuredFields,
    scoringConfig: currentQuestionData.question.scoringConfig,
    dimension: currentQuestionData.question.dimension,
    order: currentQuestionData.question.sequence,
  } : null;

  const currentValue = currentQuestion ? responses[currentQuestion.id] : undefined;
  const isGenerated = currentQuestionData?.isGenerated ?? false;
  const totalQuestions = currentQuestionData?.totalQuestions ?? 0;
  const answeredQuestions = currentQuestionData?.answeredQuestions ?? 0;
  const progress = totalQuestions > 0 ? Math.min((answeredQuestions / totalQuestions) * 100, 100) : 0;

  const isAnswered = useCallback((val: any) => {
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === "object" && !Array.isArray(val)) {
      if (val.selections) {
        return val.selections.length > 0;
      }
      return Object.values(val).some((v) => v !== undefined && v !== null && v !== "");
    }
    return true;
  }, []);

  const canProceed = !currentQuestion?.required || isAnswered(currentValue);

  const handleResponseChange = useCallback((value: any) => {
    if (currentQuestion) {
      setResponses((prev) => ({
        ...prev,
        [currentQuestion.id]: value,
      }));
    }
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (!currentQuestion || !canProceed) return;

    setIsSaving(true);
    setIsLoadingQuestion(true);
    
    const currentSequence = currentQuestionData?.question?.sequence ?? 0;
    const nextSequence = currentSequence + 1;
    
    adaptiveResponseMutation.mutate(
      { 
        questionId: currentQuestion.id, 
        response: currentValue,
        requestedNextSequence: nextSequence
      },
      {
        onSettled: () => {
          setIsSaving(false);
        },
      }
    );
  }, [currentQuestion, canProceed, currentValue, currentQuestionData, adaptiveResponseMutation]);

  const handleBack = useCallback(async () => {
    const seq = currentQuestionData?.question?.sequence;
    if (!seq || seq <= 1) return;
    
    const previousSequence = seq - 1;
    const cachedQuestion = questionsBySequence[previousSequence];
    
    if (cachedQuestion) {
      setDirection(-1);
      setCurrentSequence(previousSequence);
      setCurrentQuestionData(cachedQuestion);
      return;
    }
    
    // Question not in cache - fetch from API
    setIsLoadingQuestion(true);
    try {
      const response = await fetch(`/api/finance-compass/public/assessments/${assessmentId}/question-by-sequence/${previousSequence}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.question) {
        const fetchedQuestion = result.data as AdaptiveQuestionData;
        
        // Cache the fetched question
        setQuestionsBySequence(prev => ({
          ...prev,
          [previousSequence]: fetchedQuestion
        }));
        
        // Restore the saved response if available
        if (result.data.savedResponse?.value !== undefined && fetchedQuestion.question?.id) {
          setResponses(prev => ({
            ...prev,
            [fetchedQuestion.question.id]: result.data.savedResponse.value
          }));
        }
        
        setDirection(-1);
        setCurrentSequence(previousSequence);
        setCurrentQuestionData(fetchedQuestion);
      } else {
        toast({
          title: "Navigation failed",
          description: "Could not load the previous question.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch previous question:", error);
      toast({
        title: "Navigation failed",
        description: "Could not load the previous question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [currentQuestionData, questionsBySequence, assessmentId, toast, setCurrentSequence]);

  // Navigate directly to a specific question (for inline editing)
  const handleJumpToQuestion = useCallback(async (sequence: number) => {
    if (isLoadingQuestion) return;
    
    const cachedQuestion = questionsBySequence[sequence];
    if (cachedQuestion) {
      const currentSeq = currentQuestionData?.question?.sequence ?? 0;
      setDirection(sequence > currentSeq ? 1 : -1);
      setCurrentSequence(sequence);
      setCurrentQuestionData(cachedQuestion);
      setShowAnsweredPanel(false);
      return;
    }
    
    setIsLoadingQuestion(true);
    setShowAnsweredPanel(false);
    
    try {
      const response = await fetch(`/api/finance-compass/public/assessments/${assessmentId}/question-by-sequence/${sequence}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.question) {
        const fetchedQuestion = result.data as AdaptiveQuestionData;
        
        setQuestionsBySequence(prev => ({
          ...prev,
          [sequence]: fetchedQuestion
        }));
        
        if (result.data.savedResponse?.value !== undefined && fetchedQuestion.question?.id) {
          setResponses(prev => ({
            ...prev,
            [fetchedQuestion.question.id]: result.data.savedResponse.value
          }));
        }
        
        const currentSeq = currentQuestionData?.question?.sequence ?? 0;
        setDirection(sequence > currentSeq ? 1 : -1);
        setCurrentSequence(sequence);
        setCurrentQuestionData(fetchedQuestion);
        
        toast({
          title: "Question loaded",
          description: "Edit your answer and continue from here.",
        });
      } else {
        toast({
          title: "Navigation failed",
          description: "Could not load the question.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to jump to question:", error);
      toast({
        title: "Navigation failed",
        description: "Could not load the question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [currentQuestionData, questionsBySequence, assessmentId, toast, isLoadingQuestion]);

  // canGoBack should be true if we're past the first question (sequence > 1)
  const canGoBack = (currentQuestionData?.question?.sequence ?? 0) > 1;

  if (sessionLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="px-4 sm:px-6">
            <Skeleton className="h-6 sm:h-8 w-32 sm:w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-20 sm:h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionData?.verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="text-center">
            <CardContent className="pt-6 sm:pt-8 pb-5 sm:pb-6 px-4 sm:px-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-amber-500" />
              </div>
              <CardTitle className="text-lg sm:text-xl mb-2">Session Required</CardTitle>
              <CardDescription className="mb-5 sm:mb-6 text-sm sm:text-base">
                Please verify your email to access the assessment. This helps us personalise your experience and save your progress.
              </CardDescription>
              <div className="space-y-2 sm:space-y-3">
                <Link href="/finance-compass">
                  <Button className="w-full min-h-[48px] h-12 sm:h-auto text-base sm:text-sm bg-gradient-to-r from-[#02205B] to-[#0884AA]" data-testid="button-start-session">
                    Start New Session
                  </Button>
                </Link>
                <Link href="/finance-compass">
                  <Button variant="outline" className="w-full min-h-[48px] h-12 sm:h-auto text-base sm:text-sm" data-testid="button-back-home">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to FinanceCompass
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (nextQuestionError || (nextQuestionResult && !nextQuestionResult.success)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="text-center">
            <CardContent className="pt-6 sm:pt-8 pb-5 sm:pb-6 px-4 sm:px-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" />
              </div>
              <CardTitle className="text-lg sm:text-xl mb-2">Assessment Not Found</CardTitle>
              <CardDescription className="mb-5 sm:mb-6 text-sm sm:text-base">
                This assessment may have expired, been completed, or the link is invalid.
              </CardDescription>
              <div className="space-y-2 sm:space-y-3">
                <Link href="/finance-compass">
                  <Button className="w-full min-h-[48px] h-12 sm:h-auto text-base sm:text-sm bg-gradient-to-r from-[#02205B] to-[#0884AA]" data-testid="button-new-assessment">
                    Start New Assessment
                  </Button>
                </Link>
                <Link href="/finance-compass">
                  <Button variant="outline" className="w-full min-h-[48px] h-12 sm:h-auto text-base sm:text-sm" data-testid="button-back-home">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to FinanceCompass
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="text-center">
            <CardContent className="pt-6 sm:pt-8 pb-5 sm:pb-6 px-4 sm:px-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground animate-spin" />
              </div>
              <CardTitle className="text-lg sm:text-xl mb-2">Preparing Questions</CardTitle>
              <CardDescription className="mb-5 sm:mb-6 text-sm sm:text-base">
                The assessment questions are being prepared. Please wait a moment or try refreshing.
              </CardDescription>
              <Button 
                onClick={() => refetchQuestion()}
                variant="outline"
                className="min-h-[48px] h-12 sm:h-auto text-base sm:text-sm"
                data-testid="button-refresh"
              >
                Refresh
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const tierName = tierNames[tier] || "Assessment";

  return (
    <>
      <SEOHead
        title={`${tierName} | FinanceCompass | Constancia`}
        description="Complete your FinanceCompass assessment to receive a personalised maturity score, transformation roadmap, vendor recommendations, and ROI projections."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        {/* Fixed header with progress - optimized for mobile */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
            {/* Top row with navigation and actions */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 mb-1.5 sm:mb-2">
              <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink min-w-0">
                <Link href="/finance-compass">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 min-h-[44px] w-9 sm:w-auto sm:px-2 p-0 text-muted-foreground hover:text-foreground"
                    data-testid="button-back-to-home"
                  >
                    <Home className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Exit</span>
                  </Button>
                </Link>
                <Badge variant="outline" className="text-brand-teal border-[#0884AA]/30 text-xs sm:text-sm shrink-0">
                  {tierName}
                </Badge>
                {isGenerated && (
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hidden sm:flex">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Follow-up
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <AnimatePresence>
                  {isSaving && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <Save className="h-3 w-3 animate-pulse" />
                      <span className="hidden xs:inline">Saving...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {answeredQuestions > 0 && (
                  <Sheet open={showAnsweredPanel} onOpenChange={setShowAnsweredPanel}>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 min-h-[44px] px-2 sm:px-3 gap-1 sm:gap-1.5"
                        data-testid="button-edit-answers"
                      >
                        <ListChecks className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Edit Answers</span>
                        <Badge variant="secondary" className="h-5 px-1 sm:px-1.5 text-xs ml-0.5 sm:ml-1">
                          {answeredQuestions}
                        </Badge>
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md p-4 sm:p-6">
                      <SheetHeader className="pb-3 sm:pb-4">
                        <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 text-brand-teal" />
                          Edit Your Answers
                        </SheetTitle>
                        <SheetDescription className="text-sm">
                          Tap any question to edit your response.
                        </SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] -mx-4 px-4 sm:mx-0 sm:px-0 sm:pr-4">
                        <div className="space-y-2 sm:space-y-3">
                          {answeredQuestionsList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-3" />
                              <p className="text-sm text-muted-foreground">Loading your answers...</p>
                            </div>
                          ) : (
                            answeredQuestionsList.map((q, index) => {
                              const isCurrentQuestion = currentQuestionData?.question?.sequence === q.sequence;
                              const dimConfig = DIMENSION_CONFIG[q.dimension];
                              
                              return (
                                <button
                                  key={q.questionId}
                                  onClick={() => handleJumpToQuestion(q.sequence)}
                                  disabled={isLoadingQuestion || isCurrentQuestion}
                                  className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all min-h-[56px] active:scale-[0.98] ${
                                    isCurrentQuestion 
                                      ? "bg-[#0884AA]/10 border-[#0884AA]/30 cursor-default" 
                                      : "bg-card hover:bg-muted/50 border-border hover:border-[#0884AA]/30 active:bg-muted"
                                  }`}
                                  data-testid={`button-edit-question-${q.sequence}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                        <Badge 
                                          variant="secondary" 
                                          className="text-[10px] px-1.5"
                                          style={{ 
                                            backgroundColor: `${dimConfig?.color || '#0884AA'}15`,
                                            color: dimConfig?.color || '#0884AA'
                                          }}
                                        >
                                          {dimConfig?.shortName || q.dimension}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          Q{index + 1}
                                        </span>
                                        {isCurrentQuestion && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 text-brand-teal border-[#0884AA]/30">
                                            Current
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                                        {q.prompt}
                                      </p>
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {q.displayValue || "No answer recorded"}
                                      </p>
                                    </div>
                                    {!isCurrentQuestion && (
                                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                )}
                <Badge variant="secondary" className="text-xs font-medium px-2">
                  {Math.round(progress)}%
                </Badge>
              </div>
            </div>
            {/* Question counter - shown on mobile below the actions row */}
            <div className="flex items-center justify-between mb-1.5 sm:hidden">
              <span className="text-xs text-muted-foreground">
                Question {Math.min(answeredQuestions + 1, totalQuestions)} of {totalQuestions}
              </span>
              {isGenerated && (
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block mb-2">
              Question {Math.min(answeredQuestions + 1, totalQuestions)} of {totalQuestions}
            </span>
            <Progress value={progress} className="h-1.5 sm:h-2" data-testid="progress-bar" />
          </div>
        </div>

        {/* Main content area - responsive padding for header/footer heights */}
        <main className="pt-[100px] sm:pt-28 pb-24 sm:pb-28 px-3 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentQuestion.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Card className="shadow-lg border-0 bg-card" data-testid={`card-question-${currentQuestion.id}`}>
                  <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                    {currentQuestion?.dimension && (
                      <Badge variant="secondary" className="w-fit text-xs sm:text-sm">
                        {DIMENSION_CONFIG[currentQuestion.dimension]?.name || 
                          currentQuestion.dimension.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="pt-3 sm:pt-4 pb-6 sm:pb-8 px-4 sm:px-6">
                    {isLoadingQuestion ? (
                      <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-3 sm:space-y-4">
                        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-brand-teal animate-spin" />
                        <p className="text-sm sm:text-base text-muted-foreground">Loading next question...</p>
                      </div>
                    ) : (
                      <AssessmentQuestion
                        question={currentQuestion}
                        value={currentValue}
                        onChange={handleResponseChange}
                        isGenerated={isGenerated}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Fixed bottom navigation - full-width buttons on mobile with 44px min touch targets */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-50 safe-area-inset-bottom">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            {/* Mobile: stack buttons or use full-width grid */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              {/* Mobile progress indicator - centered above buttons */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:hidden pb-1">
                <span className="font-medium">{Math.min(answeredQuestions + 1, totalQuestions)}/{totalQuestions}</span>
              </div>
              
              {/* Button row - full width on mobile */}
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {canGoBack ? (
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 sm:flex-none min-h-[48px] sm:min-h-[44px] h-12 sm:h-auto gap-2 text-base sm:text-sm"
                    disabled={isLoadingQuestion || adaptiveResponseMutation.isPending}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
                    <span>Back</span>
                  </Button>
                ) : (
                  <Link href="/finance-compass" className="flex-1 sm:flex-none">
                    <Button
                      variant="outline"
                      className="w-full min-h-[48px] sm:min-h-[44px] h-12 sm:h-auto gap-2 text-base sm:text-sm"
                      data-testid="button-exit"
                    >
                      <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
                      <span>Exit</span>
                    </Button>
                  </Link>
                )}

                <Button
                  onClick={handleNext}
                  disabled={!canProceed || isLoadingQuestion || adaptiveResponseMutation.isPending}
                  className="flex-[2] sm:flex-none min-h-[48px] sm:min-h-[44px] h-12 sm:h-auto gap-2 text-base sm:text-sm bg-gradient-to-r from-[#02205B] to-[#0884AA] hover:from-[#0884AA] hover:to-[#12EBFC]"
                  data-testid="button-next"
                >
                  {isLoadingQuestion || adaptiveResponseMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Next Question</span>
                      <span className="sm:hidden">Next</span>
                      <ArrowRight className="h-5 w-5 sm:h-4 sm:w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ChatbotWidget assessmentId={params.id} />
    </>
  );
}
