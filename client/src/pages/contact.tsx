/**
 * Contact — simple single-pane form. No scrolly panels, no sticky
 * stage. Form posts to /api/contact (the same endpoint Marketing
 * Scrolly used). Best-practice contact pattern: short hero, the
 * essentials, one form, clear submit state.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackGoogleAdsConversion } from "@/components/google-analytics";
import { useVisitor } from "@/contexts/VisitorContext";
import { Turnstile, useTurnstileToken } from "@/components/turnstile";
import { SEOHead } from "@/components/seo-head";
import { Footer } from "@/components/footer";

const SEO = {
  title: "Contact Us | Constancia",
  description:
    "Talk to Constancia about enterprise intelligence — platform selection, integration, transformation planning, and senior-level guidance.",
  keywords: [
    "contact Constancia",
    "enterprise intelligence",
    "intelligent agentic enterprise",
    "EPM partner",
  ],
};

type Step = "form" | "verify" | "done";

export default function ContactPage() {
  const [step, setStep] = useState<Step>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const { visitor, getFirstName, getLastName, isLoaded } = useVisitor();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    message: "",
  });
  const { toast } = useToast();

  const { data: turnstileConfig } = useQuery<{ enabled: boolean; siteKey: string | null }>({
    queryKey: ["/api/config/turnstile"],
  });

  const [captchaToken, setCaptchaToken, clearCaptcha] = useTurnstileToken();

  useEffect(() => {
    if (isLoaded && visitor) {
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || getFirstName(),
        lastName: prev.lastName || getLastName(),
        email: prev.email || visitor.email || "",
        phone: prev.phone || visitor.phone || "",
      }));
    }
  }, [isLoaded, visitor, getFirstName, getLastName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const recaptchaToken = turnstileConfig?.enabled ? captchaToken : null;
      if (turnstileConfig?.enabled && !recaptchaToken) {
        toast({
          title: "Verification required",
          description: "Please complete the \"I'm not a robot\" check before submitting.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      const submitData = {
        firstName: formData.firstName,
        lastName: formData.lastName || formData.firstName,
        email: formData.email,
        phone: formData.phone || undefined,
        message: formData.message,
        consentMarketing: false,
        turnstileToken: recaptchaToken,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
        referrer: document.referrer,
        pageUrl: window.location.href,
      };
      const response = await apiRequest("POST", "/api/contact", submitData);
      const result = await response.json();
      if (result.success) {
        trackGoogleAdsConversion();
        setSubmittedEmail(result.email || formData.email);
        setStep("verify");
        clearCaptcha();
      } else {
        toast({
          title: "Unable to send message",
          description: result.error || "Please check your details and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      let errorMessage = "Please try again in a moment.";
      if (error?.message) {
        try {
          const jsonPart = error.message.replace(/^\d+:\s*/, "");
          const parsed = JSON.parse(jsonPart);
          errorMessage = parsed.error || errorMessage;
        } catch {
          errorMessage = error.message.replace(/^\d+:\s*/, "") || errorMessage;
        }
      }
      toast({ title: "Unable to send message", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6 || !/^\d{6}$/.test(otpCode.trim())) {
      toast({ title: "Invalid code", description: "Please enter the 6-digit code from your email.", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    try {
      const response = await apiRequest("POST", "/api/contact/verify", {
        email: submittedEmail,
        code: otpCode.trim(),
      });
      const result = await response.json();
      if (result.success) {
        setStep("done");
      } else {
        toast({
          title: "Incorrect code",
          description: result.error || "Please check the code and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      let errorMessage = "Please try again.";
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message.replace(/^\d+:\s*/, ""));
          errorMessage = parsed.error || errorMessage;
        } catch {
          errorMessage = error.message.replace(/^\d+:\s*/, "") || errorMessage;
        }
      }
      toast({ title: "Verification failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="contact-simple">
      <SEOHead {...SEO} />

      <main className="contact-simple__main">
        <header className="contact-simple__header">
          <p className="contact-simple__eyebrow">Get in touch</p>
          <h1 className="contact-simple__title">
            Talk to us about <span className="contact-simple__title-accent">enterprise intelligence.</span>
          </h1>
          <p className="contact-simple__lede">
            Whether you are scoping a programme, evaluating platforms, or want a second opinion on
            something already in motion, we are happy to talk. Drop us a line and we will get back
            to you within 24 hours.
          </p>
        </header>

        <div className="contact-simple__channels" aria-label="How to reach us">
          <a href="mailto:info@constancia.io" className="contact-simple__channel">
            <Mail className="contact-simple__channel-icon" aria-hidden="true" />
            <span>info@constancia.io</span>
          </a>
          <span className="contact-simple__channel-sep" aria-hidden="true" />
          <span className="contact-simple__channel">
            <MapPin className="contact-simple__channel-icon" aria-hidden="true" />
            <span>Blount House, Hall Court, Hall Park Way, Telford, Shropshire, TF3 4NQ, UK</span>
          </span>
        </div>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="contact-form" data-testid="form-contact">
            <div className="contact-form__row">
              <div className="contact-form__field">
                <Label htmlFor="firstName">First name *</Label>
                <Input id="firstName" name="firstName" placeholder="John"
                  value={formData.firstName} onChange={handleChange} required
                  data-testid="input-first-name" />
              </div>
              <div className="contact-form__field">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" placeholder="Smith"
                  value={formData.lastName} onChange={handleChange}
                  data-testid="input-last-name" />
              </div>
            </div>
            <div className="contact-form__row">
              <div className="contact-form__field">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" placeholder="john@company.com"
                  value={formData.email} onChange={handleChange} required
                  data-testid="input-email" />
              </div>
              <div className="contact-form__field">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+44 1234 567890"
                  value={formData.phone} onChange={handleChange}
                  data-testid="input-phone" />
              </div>
            </div>
            <div className="contact-form__field">
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" name="message" rows={6} required
                placeholder="Tell us what you are working on and how we can help."
                value={formData.message} onChange={handleChange}
                className="resize-none" data-testid="input-message" />
            </div>
            {turnstileConfig?.enabled && turnstileConfig.siteKey && (
              <Turnstile siteKey={turnstileConfig.siteKey} onVerify={setCaptchaToken}
                onExpire={clearCaptcha} className="contact-form__turnstile" />
            )}
            <Button
              type="submit"
              variant="brand"
              className="contact-form__submit"
              disabled={isSubmitting || (turnstileConfig?.enabled ? !captchaToken : false)}
              data-testid="button-submit-contact"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  Send message
                  <Send className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerify} className="contact-form" data-testid="form-verify-otp">
            <div className="contact-form__field">
              <p className="contact-simple__lede" style={{ marginBottom: "1.5rem" }}>
                We sent a 6-digit code to <strong>{submittedEmail}</strong>. Enter it below to confirm your enquiry.
              </p>
              <Label htmlFor="otpCode">Verification code</Label>
              <Input
                id="otpCode"
                name="otpCode"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
                className="text-center text-2xl tracking-widest font-mono"
                data-testid="input-otp-code"
              />
              <p className="contact-simple__lede" style={{ fontSize: "0.8rem", marginTop: "0.5rem", opacity: 0.7 }}>
                The code expires in 10 minutes. Check your spam folder if you don't see it.
              </p>
            </div>
            <Button
              type="submit"
              variant="brand"
              className="contact-form__submit"
              disabled={isVerifying || otpCode.length !== 6}
              data-testid="button-verify-otp"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying
                </>
              ) : (
                "Confirm code"
              )}
            </Button>
          </form>
        )}

        {step === "done" && (
          <div className="contact-form" data-testid="contact-verified-success" style={{ textAlign: "center", padding: "2rem 0" }}>
            <CheckCircle style={{ width: "3rem", height: "3rem", color: "var(--color-mint, #7FB8A3)", margin: "0 auto 1rem" }} />
            <h2 style={{ marginBottom: "0.75rem" }}>All confirmed</h2>
            <p className="contact-simple__lede">
              Your enquiry is verified and in our inbox. We will get back to you within 24 hours.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
