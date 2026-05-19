import { useState } from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  FileText,
  FileSpreadsheet
} from "lucide-react";
import { trackLeadCaptured } from "@/lib/funnel-analytics";

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
  honeypot: z.string().optional(),
});

const otpFormSchema = z.object({
  otp: z.string().length(6, "Enter 6-digit code"),
});

type LeadFormData = z.infer<typeof leadFormSchema>;
type OtpFormData = z.infer<typeof otpFormSchema>;

type Step = "form" | "otp" | "success";

export interface ExportConfig {
  type: "pdf" | "excel";
  categoryType: "epm" | "erp" | "ai";
  title: string;
}

interface ExportGateModalProps {
  exportConfig: ExportConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportApproved: (config: ExportConfig) => void;
  onVerificationComplete?: (config: ExportConfig) => void;
}

export function ExportGateModal({ exportConfig, open, onOpenChange, onExportApproved }: ExportGateModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const { toast } = useToast();

  const { data: turnstileConfig } = useQuery<{ enabled: boolean; siteKey: string }>({
    queryKey: ["/api/config/turnstile"],
  });

  const [captchaToken, setCaptchaToken, clearCaptcha] = useTurnstileToken();

  const leadForm = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      jobTitle: "",
      honeypot: "",
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: "",
    },
  });

  const submitLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      if (turnstileConfig?.enabled && !captchaToken) {
        throw new Error("Please complete the \"I'm not a robot\" check before continuing.");
      }
      const response = await apiRequest("POST", "/api/resources/lead", {
        ...data,
        resourceId: `export-${exportConfig?.categoryType}-${exportConfig?.type}`,
        ...(turnstileConfig?.enabled && captchaToken ? { turnstileToken: captchaToken } : {}),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.verified) {
        setLeadId(data.leadId);
        trackLeadCaptured("comparison_export", { exportType: exportConfig?.type, categoryType: exportConfig?.categoryType, verified: true });
        clearCaptcha();
        handleExportApproved();
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
      console.log("[ExportGateModal] OTP verification success, data:", data);
      if (data.verified) {
        console.log("[ExportGateModal] OTP verified, calling handleExportApproved");
        setStep("success");
        trackLeadCaptured("comparison_export_otp", { exportType: exportConfig?.type, categoryType: exportConfig?.categoryType, verified: true });
        handleExportApproved();
        console.log("[ExportGateModal] handleExportApproved returned");
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

  const handleExportApproved = () => {
    // Debug alert - remove after testing
    alert("Export approved! Calling parent function...");
    
    if (!exportConfig) {
      toast({
        title: "Export Error",
        description: "Export configuration is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Call the parent's export function
    try {
      onExportApproved(exportConfig);
    } catch (error) {
      toast({
        title: "Export Error", 
        description: `Failed to start export: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Export Starting",
      description: `Your ${exportConfig.type.toUpperCase()} export is being generated.`,
    });

    setTimeout(() => {
      onOpenChange(false);
      resetModal();
    }, 2000);
  };

  const resetModal = () => {
    setStep("form");
    setLeadId(null);
    setEmail("");
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
    if (data.honeypot) {
      return;
    }
    setEmail(data.email);
    submitLeadMutation.mutate(data);
  };

  const onOtpSubmit = (data: OtpFormData) => {
    if (!leadId) return;
    verifyOtpMutation.mutate({ leadId, otp: data.otp });
  };

  const getCategoryLabel = () => {
    switch (exportConfig?.categoryType) {
      case "epm": return "EPM Platform";
      case "erp": return "ERP System";
      case "ai": return "AI Tool";
      default: return "Technology";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-[#12161D]">
            {step === "form" && "Export Comparison Report"}
            {step === "otp" && "Verify Your Email"}
            {step === "success" && "Export Ready"}
          </DialogTitle>
          <DialogDescription>
            {step === "form" && "Enter your business details to download this comparison report."}
            {step === "otp" && `We've sent a 6-digit code to ${email}`}
            {step === "success" && "Your export will begin shortly."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {exportConfig && (
            <div className="bg-gradient-to-r from-[#12161D]/5 to-[#8E4F67]/5 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                {exportConfig.type === "pdf" ? (
                  <FileText className="h-8 w-8 text-[#12161D]" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-[#8E4F67]" />
                )}
                <div>
                  <p className="text-sm font-medium text-[#12161D]">
                    {getCategoryLabel()} Comparison - {exportConfig.type.toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detailed analysis with weighted scores and recommendations
                  </p>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
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
                                data-testid="input-export-first-name"
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
                                data-testid="input-export-last-name"
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
                              data-testid="input-export-email"
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
                              data-testid="input-export-company"
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
                              data-testid="input-export-job-title"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
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
                    data-testid="button-export-submit-lead"
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
                            data-testid="input-export-otp"
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
                    data-testid="button-export-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Export
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
                      data-testid="button-export-resend-otp"
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
              <h3 className="text-lg font-semibold text-[#12161D] dark:text-[#7FB8A3] mb-2">Export Started!</h3>
              <p className="text-sm text-muted-foreground">
                Your {exportConfig?.type.toUpperCase()} report is being generated. Thank you for your interest in Constancia.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
