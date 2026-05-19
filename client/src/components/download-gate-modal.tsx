import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Turnstile, useTurnstileToken } from "@/components/turnstile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Mail, 
  CheckCircle, 
  Loader2, 
  Download, 
  User, 
  Building2, 
  Briefcase,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  UserCheck
} from "lucide-react";
import type { ResourceFile } from "@shared/schema";
import { trackResourceDownload } from "@/lib/google-ads";
import { trackLeadCaptured } from "@/lib/funnel-analytics";

interface SessionStatus {
  verified: boolean;
  leadId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  expiresAt?: string;
}

const BLOCKED_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", 
  "hotmail.com", "hotmail.co.uk", "outlook.com", "outlook.co.uk",
  "live.com", "live.co.uk", "msn.com", "aol.com", "icloud.com",
  "me.com", "mac.com", "protonmail.com", "proton.me", "mail.com",
  "zoho.com", "yandex.com", "gmx.com", "gmx.net", "fastmail.com",
  "tutanota.com", "hey.com", "btinternet.com", "virginmedia.com",
  "sky.com", "talktalk.net", "inbox.com", "rocketmail.com"
];

const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string()
    .email("Valid email is required")
    .refine((email) => {
      const domain = email.split("@")[1]?.toLowerCase();
      return domain && !BLOCKED_DOMAINS.includes(domain);
    }, "Please use a business email address"),
  company: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  subscribeNewsletter: z.boolean().default(true),
  honeypot: z.string().optional(),
});

const otpFormSchema = z.object({
  otp: z.string().length(6, "Enter 6-digit code"),
});

type LeadFormData = z.infer<typeof leadFormSchema>;
type OtpFormData = z.infer<typeof otpFormSchema>;

type Step = "checking" | "session" | "form" | "otp" | "downloading" | "success";

interface DownloadGateModalProps {
  resource: ResourceFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional: For comparison tool exports - called instead of default download
  customExportFn?: () => Promise<void>;
  customExportTitle?: string;
  customExportDescription?: string;
  // Optional: Require fresh OTP verification even if session exists (for high-value exports)
  requireFreshVerification?: boolean;
}

export function DownloadGateModal({ 
  resource, 
  open, 
  onOpenChange,
  customExportFn,
  customExportTitle,
  customExportDescription,
  requireFreshVerification = false,
}: DownloadGateModalProps) {
  const [step, setStep] = useState<Step>("checking");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<SessionStatus | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const { toast } = useToast();
  
  // Use ref to always have latest customExportFn available (avoids stale closures in setTimeout)
  const customExportFnRef = useRef(customExportFn);
  
  if (customExportFn !== customExportFnRef.current) {
    customExportFnRef.current = customExportFn;
  }
  
  useEffect(() => {
    customExportFnRef.current = customExportFn;
  }, [customExportFn]);

  const { data: turnstileConfig } = useQuery<{ enabled: boolean; siteKey: string | null }>({
    queryKey: ["/api/config/turnstile"],
  });

  const [captchaToken, setCaptchaToken, clearCaptcha] = useTurnstileToken();

  // Check for existing session when modal opens - use small delay to ensure props have propagated
  useEffect(() => {
    if (open && (resource || customExportFn)) {
      // If fresh verification is required, skip session check and go straight to form
      if (requireFreshVerification) {
        setSessionInfo(null);
        setStep("form");
        return;
      }
      // Small delay to ensure React state updates have propagated
      const timer = setTimeout(() => {
        checkSession();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, resource, customExportFn, requireFreshVerification]);

  // Helper to wait for export function to be set (polls until available or timeout)
  const waitForExportFn = (): Promise<(() => Promise<void>) | null> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20; // 20 attempts * 50ms = 1 second max wait
      
      const checkFn = () => {
        attempts++;
        const fn = customExportFnRef.current;
        if (fn) {
          resolve(fn);
        } else if (attempts >= maxAttempts) {
          console.warn("[DownloadGateModal] waitForExportFn timed out");
          resolve(null);
        } else {
          setTimeout(checkFn, 50);
        }
      };
      
      // Start checking immediately
      checkFn();
    });
  };

  const checkSession = async () => {
    setIsCheckingSession(true);
    setStep("checking");
    
    try {
      const response = await fetch("/api/resources/session", {
        credentials: "include",
      });
      const data: SessionStatus = await response.json();
      
      if (data.verified && data.leadId) {
        setSessionInfo(data);
        setLeadId(data.leadId);
        setStep("session");
        
        const exportFn = await waitForExportFn();
        
        if (exportFn || resource) {
          performSessionDownload();
        }
      } else {
        setSessionInfo(null);
        setStep("form");
      }
    } catch (error) {
      console.error("Session check error:", error);
      setStep("form");
    } finally {
      setIsCheckingSession(false);
    }
  };
  
  const performSessionDownload = async () => {
    // Show downloading state immediately for user feedback
    setStep("downloading");
    
    // Handle custom export function (for comparison tools) - use ref to get latest value
    const exportFn = customExportFnRef.current;
    if (exportFn) {
      try {
        await exportFn();
        setStep("success");
        toast({
          title: "Export Started",
          description: customExportDescription || "Your export is being generated.",
        });
        setTimeout(() => {
          onOpenChange(false);
          resetModal();
        }, 1500);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[DownloadGateModal] Custom export error:", errorMessage, error);
        toast({
          title: "Export Error",
          description: `Export failed: ${errorMessage.substring(0, 80)}`,
          variant: "destructive",
        });
      }
      return;
    }
    
    if (!resource) return;

    try {
      const response = await fetch(`/api/resources/${resource.id}/download`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileExtension = resource.fileType === 'xls' ? 'xlsx' : resource.fileType;
      link.download = `${resource.title || "download"}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setStep("success");
      trackResourceDownload(resource.title);
      toast({
        title: "Download Started",
        description: "Your resource is downloading.",
      });

      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 1500);
    } catch (error) {
      console.error("Auto download error:", error);
      setSessionInfo(null);
      setStep("form");
      toast({
        title: "Session Expired",
        description: "Please verify your email again.",
        variant: "destructive",
      });
    }
  };

  // Handle download with session-based auth (cookie-based, no leadId needed)
  const handleSessionDownload = async () => {
    if (!resource) return;

    try {
      // Use GET endpoint which supports session cookie authentication
      const response = await fetch(`/api/resources/${resource.id}/download`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Response is binary data (PDF, Excel, etc.)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Map fileType to correct extension (xls -> xlsx)
      const fileExtension = resource.fileType === 'xls' ? 'xlsx' : resource.fileType;
      link.download = `${resource.title || "download"}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setStep("success");
      trackResourceDownload(resource.title);
      toast({
        title: "Download Started",
        description: "Your resource is downloading.",
      });

      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 2000);
    } catch (error) {
      console.error("Session download error:", error);
      // Session may have expired, fallback to form
      setSessionInfo(null);
      setStep("form");
      toast({
        title: "Session Expired",
        description: "Please verify your email again.",
        variant: "destructive",
      });
    }
  };

  const leadForm = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      jobTitle: "",
      subscribeNewsletter: true,
      honeypot: "",
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Collect browser fingerprint data for bot detection and lead enrichment
  const collectFingerprint = () => {
    return {
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language || navigator.languages?.[0] || "unknown",
      platform: navigator.platform,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      referrer: document.referrer || "direct",
      pageUrl: window.location.href,
      clickTimestamp: new Date().toISOString(),
    };
  };

  const submitLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      if (turnstileConfig?.enabled && !captchaToken) {
        throw new Error("Please complete the \"I'm not a robot\" check before continuing.");
      }
      const fingerprint = collectFingerprint();
      const response = await apiRequest("POST", "/api/resources/lead", {
        ...data,
        resourceId: resource?.id,
        turnstileToken: turnstileConfig?.enabled ? captchaToken : null,
        ...fingerprint,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.verified) {
        setLeadId(data.leadId);
        trackLeadCaptured("resource_download", { resourceId: resource?.id, verified: true });
        clearCaptcha();
        handleDownload(data.leadId);
      } else {
        setLeadId(data.leadId);
        clearCaptcha();
        setStep("otp");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { leadId: string; otp: string }) => {
      const response = await apiRequest("POST", "/api/resources/otp/verify", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.verified) {
        setStep("success");
        trackLeadCaptured("resource_download_otp", { resourceId: resource?.id, verified: true });
        handleDownload(leadId!);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/resources/otp/resend", { leadId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Code Sent",
        description: "A new verification code has been sent to your email.",
      });
      otpForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (verifiedLeadId: string) => {
    // Handle custom export function (for comparison tools) - use ref to get latest value
    const exportFn = customExportFnRef.current;
    if (exportFn) {
      try {
        await exportFn();
        toast({
          title: "Export Started",
          description: customExportDescription || "Your export is being generated.",
        });
        setTimeout(() => {
          onOpenChange(false);
          resetModal();
        }, 2000);
      } catch (error) {
        console.error("Custom export error:", error);
        toast({
          title: "Export Error",
          description: "Failed to generate export. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }
    
    if (!resource) return;

    try {
      const response = await fetch(`/api/resources/${resource.id}/download?leadId=${verifiedLeadId}`);
      
      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Response is binary data (PDF, Excel, etc.)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Map fileType to correct extension (xls -> xlsx)
      const fileExtension = resource.fileType === 'xls' ? 'xlsx' : resource.fileType;
      link.download = `${resource.title || "download"}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: "Your resource is downloading.",
      });

      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 2000);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Error",
        description: "Failed to download. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetModal = () => {
    setStep("checking");
    setLeadId(null);
    setEmail("");
    setSessionInfo(null);
    setIsCheckingSession(false);
    leadForm.reset();
    otpForm.reset();
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  const onLeadSubmit = (data: LeadFormData) => {
    setEmail(data.email);
    submitLeadMutation.mutate(data);
  };

  const onOtpSubmit = (data: OtpFormData) => {
    if (!leadId) return;
    verifyOtpMutation.mutate({ leadId, otp: data.otp });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-[#12161D]">
            {step === "checking" && "Checking Access..."}
            {step === "session" && "Welcome Back"}
            {step === "form" && "Access Your Resource"}
            {step === "otp" && "Verify Your Email"}
            {step === "downloading" && "Preparing Your Download"}
            {step === "success" && "Download Ready"}
          </DialogTitle>
          <DialogDescription>
            {step === "checking" && "Verifying your session..."}
            {step === "session" && sessionInfo && `Hello ${sessionInfo.firstName}, you're already verified.`}
            {step === "form" && "Enter your business details to download this resource."}
            {step === "otp" && `We've sent a 6-digit code to ${email}`}
            {step === "downloading" && "Generating your personalised document..."}
            {step === "success" && "Your download will begin shortly."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {resource && (
            <div className="bg-gradient-to-r from-[#12161D]/5 to-[#8E4F67]/5 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium text-[#12161D]">{resource.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{resource.category} - {resource.fileSize}</p>
            </div>
          )}
          {!resource && customExportTitle && (
            <div className="bg-gradient-to-r from-[#12161D]/5 to-[#8E4F67]/5 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium text-[#12161D]">{customExportTitle}</p>
              {customExportDescription && (
                <p className="text-xs text-muted-foreground mt-1">{customExportDescription}</p>
              )}
            </div>
          )}

        <AnimatePresence mode="wait">
          {step === "checking" && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[#8E4F67] mb-4" />
              <p className="text-sm text-muted-foreground">Checking your access status...</p>
            </motion.div>
          )}

          {step === "session" && sessionInfo && (
            <motion.div
              key="session"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {sessionInfo.firstName} {sessionInfo.lastName}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">{sessionInfo.email}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Click below to download your resource instantly - no verification needed.
              </p>

              <Button
                onClick={handleSessionDownload}
                className="w-full bg-[#12161D] hover:bg-[#12161D]/90"
                data-testid="button-session-download"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Now
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("form")}
                className="w-full text-muted-foreground"
                data-testid="button-use-different-email"
              >
                Use a different email
              </Button>
            </motion.div>
          )}

          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Form {...leadForm}>
                <form onSubmit={leadForm.handleSubmit(onLeadSubmit)} className="space-y-4">
                  <div className="hidden">
                    <FormField
                      control={leadForm.control}
                      name="honeypot"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} tabIndex={-1} autoComplete="off" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leadForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">First Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                {...field} 
                                className="pl-9" 
                                placeholder="John"
                                data-testid="input-first-name"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={leadForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                {...field} 
                                className="pl-9" 
                                placeholder="Smith"
                                data-testid="input-last-name"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={leadForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Business Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              {...field} 
                              type="email" 
                              className="pl-9" 
                              placeholder="john.smith@company.com"
                              data-testid="input-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={leadForm.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Company</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              {...field} 
                              className="pl-9" 
                              placeholder="Acme Corporation"
                              data-testid="input-company"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={leadForm.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Job Title</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              {...field} 
                              className="pl-9" 
                              placeholder="Finance Director"
                              data-testid="input-job-title"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={leadForm.control}
                    name="subscribeNewsletter"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-gradient-to-r from-[#12161D]/5 to-[#8E4F67]/5">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-subscribe-newsletter"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium cursor-pointer">
                            Keep me informed about EPM insights and updates
                          </FormLabel>
                          <FormDescription className="text-xs text-muted-foreground">
                            Receive exclusive thought leadership, industry research, and practical guides directly to your inbox. Unsubscribe anytime.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      Business email required. Personal email addresses (Gmail, Yahoo, etc.) are not accepted.
                    </p>
                  </div>

                  {turnstileConfig?.enabled && turnstileConfig.siteKey && (
                    <Turnstile
                      siteKey={turnstileConfig.siteKey}
                      onVerify={setCaptchaToken}
                      onExpire={clearCaptcha}
                    />
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-[#12161D] to-[#8E4F67] hover:from-[#12161D]/90 hover:to-[#8E4F67]/90"
                    disabled={submitLeadMutation.isPending || (turnstileConfig?.enabled ? !captchaToken : false)}
                    data-testid="button-submit-lead"
                  >
                    {submitLeadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#12161D] to-[#8E4F67] flex items-center justify-center">
                  <Mail className="h-8 w-8 text-white" />
                </div>
              </div>

              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem className="text-center">
                        <FormLabel className="text-sm font-medium">Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            className="text-center text-2xl tracking-[0.5em] font-mono"
                            placeholder="000000"
                            autoComplete="one-time-code"
                            data-testid="input-otp"
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-[#12161D] to-[#8E4F67] hover:from-[#12161D]/90 hover:to-[#8E4F67]/90"
                    disabled={verifyOtpMutation.isPending || otpForm.watch("otp").length !== 6}
                    data-testid="button-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Download
                        <Download className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => resendOtpMutation.mutate()}
                      disabled={resendOtpMutation.isPending}
                      className="text-muted-foreground hover:text-[#8E4F67]"
                      data-testid="button-resend-otp"
                    >
                      {resendOtpMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Resend Code
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Code expires in 10 minutes. Check your spam folder if you don't see it.
                  </p>
                </form>
              </Form>
            </motion.div>
          )}

          {step === "downloading" && (
            <motion.div
              key="downloading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#12161D] to-[#8E4F67] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#7FB8A3]" />
              </div>
              <h3 className="text-lg font-semibold text-[#12161D] mb-2">Preparing Your Document</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please wait while we prepare your document. This might take a moment.
              </p>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-6"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#12161D] to-[#8E4F67] flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-[#7FB8A3]" />
              </div>
              <h3 className="text-lg font-semibold text-[#12161D] mb-2">Download Started!</h3>
              <p className="text-sm text-muted-foreground">
                Your resource is downloading. Thank you for your interest in 1QG.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
