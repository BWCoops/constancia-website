/**
 * Contact — declares its panels; framework renders the shell.
 * Form state + submit logic stays here (it's interactive);
 * everything else (background, fabric, footer, SEO) comes from
 * <MarketingScrollyPage>.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Send, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackGoogleAdsConversion } from "@/components/google-analytics";
import { useVisitor } from "@/contexts/VisitorContext";
import { Turnstile, useTurnstileToken } from "@/components/turnstile";
import { MarketingScrollyPage } from "@/components/scrolly/MarketingScrollyPage";
import {
  ScrollyHero,
  ScrollyText,
  ScrollyCustom,
} from "@/components/scrolly/ScrollyPanels";

const SEO = {
  title: "Contact Us | Constancia — Get In Touch",
  description:
    "No pitch, no obligation. Talk to Constancia about platform selection, integration, transformation planning, and senior-level guidance for finance teams.",
  keywords: [
    "contact Constancia",
    "connected finance intelligence",
    "finance systems integration",
    "Enterprise Performance Management",
    "EPM partner",
  ],
};

const CONTACT_INFO = [
  {
    Icon: Mail,
    label: "Email",
    value: "info@constancia.io",
    href: "mailto:info@constancia.io",
  },
  {
    Icon: MapPin,
    label: "Office",
    value: "Blount House, Hall Court, Hall Park Way, Telford, Shropshire, TF3 4NQ, UK",
    href: "https://maps.google.com/?q=Blount+House+Hall+Court+Hall+Park+Way+Telford+TF3+4NQ",
  },
  {
    Icon: Globe,
    label: "Website",
    value: "constancia.com",
    href: "https://constancia.com",
  },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        toast({
          title: "Message sent successfully!",
          description: "We will get back to you within 24 hours.",
        });
        setFormData({ firstName: "", lastName: "", phone: "", email: "", message: "" });
        clearCaptcha();
      } else {
        toast({
          title: "Unable to send message",
          description: result.error || "Please check your details and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      let errorMessage = "Please try again later or email info@constancia.io directly.";
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <MarketingScrollyPage seo={SEO} label="Contact Constancia" heightVh={520} heightVhMobile={520}>
      <ScrollyHero
        eyebrow="Get in touch"
        heading="No pitch."
        headingAccent="Just a conversation."
        body="If you've got a programme coming up, a platform decision to make, or you just want a straight answer from someone who's done this before, we're happy to talk."
      />

      <ScrollyCustom eyebrow="How to reach us" heading="A few ways in." wide>
        <div className="contact-channels">
          {CONTACT_INFO.map((c, i) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="contact-channel"
              data-testid={`link-contact-${i}`}
            >
              <c.Icon className="contact-channel__icon" />
              <div>
                <div className="contact-channel__label">{c.label}</div>
                <div className="contact-channel__value">{c.value}</div>
              </div>
            </a>
          ))}
        </div>
      </ScrollyCustom>

      <ScrollyCustom
        eyebrow="Tell us what you're working on"
        heading="We come back within"
        headingAccent="24 hours."
        wide
      >
        <form onSubmit={handleSubmit} className="contact-form" data-testid="form-contact">
          <div className="contact-form__row">
            <div className="contact-form__field">
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" name="firstName" placeholder="John" value={formData.firstName}
                onChange={handleChange} required data-testid="input-first-name" />
            </div>
            <div className="contact-form__field">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" placeholder="Smith" value={formData.lastName}
                onChange={handleChange} data-testid="input-last-name" />
            </div>
          </div>
          <div className="contact-form__row">
            <div className="contact-form__field">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+44 1234 567890"
                value={formData.phone} onChange={handleChange} required data-testid="input-phone" />
            </div>
            <div className="contact-form__field">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="john@company.com"
                value={formData.email} onChange={handleChange} required data-testid="input-email" />
            </div>
          </div>
          <div className="contact-form__field">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={5}
              placeholder="Tell us about your project and how we can help..."
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
                Sending...
              </>
            ) : (
              <>
                Send message
                <Send className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </ScrollyCustom>

      <ScrollyText
        eyebrow="How we work"
        heading="Scoped properly,"
        headingAccent="priced fixed."
        body="No time-and-materials, no bill shock at month three. A fixed fee, delivered by the senior practitioner who scoped it."
      />
    </MarketingScrollyPage>
  );
}
