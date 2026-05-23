/**
 * Careers — declares its panels; framework renders the shell.
 * Form state + submit logic stays here (interactive); everything
 * else (background, fabric, footer, SEO) comes from the framework.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Turnstile, useTurnstileToken } from "@/components/turnstile";
import { MarketingScrollyPage } from "@/components/scrolly/MarketingScrollyPage";
import {
  ScrollyHero,
  ScrollyText,
  ScrollyGrid,
  ScrollyCustom,
  ScrollyCTA,
} from "@/components/scrolly/ScrollyPanels";

const SEO = {
  title: "Careers at Constancia — Senior Practitioners Only",
  description:
    "We hire senior practitioners and give them autonomy. EPM consultants, FP&A analysts, transformation advisors. Fixed-fee delivery, direct client relationships, no juniors staffed to protect margin.",
  keywords: [
    "EPM consultant jobs",
    "OneStream careers",
    "Abacum careers",
    "finance transformation jobs",
    "FP&A analyst careers",
    "Constancia careers",
  ],
};

const STATS = [
  { eyebrow: "Experience", title: "40+ years", body: "Combined EPM delivery experience across the founding team." },
  { eyebrow: "Platforms", title: "3 platforms", body: "Abacum, OneStream and a custom AI development practice — known cold." },
  { eyebrow: "Delivery", title: "100% senior", body: "Every engagement is delivered by a senior practitioner. No juniors to protect margin." },
  { eyebrow: "Pricing", title: "Fixed fee", body: "Scoped properly, priced once. No bill-shock and no scope-creep games." },
];

const WHY_ITEMS = [
  { eyebrow: "Why 01", title: "We recommend what fits, not what pays", body: "No vendor targets. No pipeline pressure. The right answer for the client, full stop." },
  { eyebrow: "Why 02", title: "Senior delivery, always", body: "Every engagement is delivered by a senior practitioner. We don't staff juniors to protect margin." },
  { eyebrow: "Why 03", title: "Fixed fee, scoped properly", body: "No time-and-materials, no pressure to extend. We price it right and we deliver it." },
  { eyebrow: "Why 04", title: "AI-powered delivery tools", body: "Our methodology is built on tools we've designed ourselves. You're not starting from scratch on every engagement." },
  { eyebrow: "Why 05", title: "Direct client relationships", body: "You're not account-managed out of the room. You're the practitioner the client trusts." },
];

const PROFILES = [
  { eyebrow: "Profile 01", title: "EPM Consultants & Architects", body: "You've delivered OneStream, Pigment, Anaplan, or IBM Planning Analytics on real programmes. You can navigate a CFO's budget and a complex data model in the same afternoon. Done doing good work inside a bad structure." },
  { eyebrow: "Profile 02", title: "Finance Analysts & Associates", body: "FP&A or management accounting background, hitting the ceiling of what Excel and manual process can do. You want to understand what better looks like. We develop people properly." },
  { eyebrow: "Profile 03", title: "Finance Transformation Advisors", body: "You've helped finance leaders choose platforms, build business cases, and manage the people side of change. You know why transformations fail and it's rarely the technology." },
];

const EXPECT = [
  { eyebrow: "Expect 01", title: "Genuine autonomy", body: "You'll own your workstreams. We hire people we trust, and we treat them accordingly." },
  { eyebrow: "Expect 02", title: "Real client access", body: "Direct work with CFOs, Finance Directors, Group FP&A leads. No layers between you and the brief." },
  { eyebrow: "Expect 03", title: "Breadth of exposure", body: "EPM architecture, business rule design, vendor selection, board-ready output. Deliberately wide." },
  { eyebrow: "Expect 04", title: "Remote-first", body: "We operate across the UK, South Africa, and the Middle East. We judge output, not hours on camera." },
  { eyebrow: "Expect 05", title: "Transparent pay", body: "We pay to market and we're direct about it. Your rate moves when your contribution does." },
  { eyebrow: "Expect 06", title: "A firm worth building", body: "Growing practice; people who join now will shape how we work and where we go." },
];

const AREAS = [
  "EPM Consultant / Architect",
  "Finance Analyst / Associate",
  "Finance Transformation Advisor",
  "Business Development",
  "Other",
];

export default function CareersPage() {
  const { flags } = useFeatureFlags();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    linkedIn: "",
    areaOfInterest: "",
    message: "",
  });

  const { data: turnstileConfig } = useQuery<{ enabled: boolean; siteKey: string | null }>({
    queryKey: ["/api/config/turnstile"],
  });
  const [captchaToken, setCaptchaToken, clearCaptcha] = useTurnstileToken();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.areaOfInterest) {
      toast({ title: "Area of interest required", description: "Please select an area of interest.", variant: "destructive" });
      return;
    }
    if (!formData.message.trim()) {
      toast({ title: "Message required", description: "Please tell us a bit about yourself.", variant: "destructive" });
      return;
    }
    if (!consent) {
      toast({ title: "Consent required", description: "Please confirm you are happy for us to retain your details.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (turnstileConfig?.enabled && !captchaToken) {
        toast({ title: "Verification required", description: "Please complete the \"I'm not a robot\" check.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const submitData = {
        ...formData,
        consent,
        turnstileToken: turnstileConfig?.enabled ? captchaToken : null,
      };
      const response = await apiRequest("POST", "/api/careers/apply", submitData);
      const result = await response.json();
      if (result.success) {
        setIsSubmitted(true);
        clearCaptcha();
        toast({ title: "Thank you for reaching out.", description: "We'll review your details and be in touch if there's a fit." });
      } else {
        toast({ title: "Unable to submit", description: result.error || "Please check your details and try again.", variant: "destructive" });
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
      toast({ title: "Unable to submit", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MarketingScrollyPage seo={SEO} label="Constancia Careers" heightVh={780} heightVhMobile={680}>
      <ScrollyHero
        eyebrow="Careers"
        heading="Senior practitioners, given"
        headingAccent="real autonomy."
        body="We hire senior people, give them real client access, and trust them to deliver. No juniors staffed to protect margin. No bill-shock. No pipeline pressure that bends the recommendation."
      />

      <ScrollyGrid eyebrow="Why join" heading="A practice you can shape." items={WHY_ITEMS} />

      <ScrollyText
        eyebrow="Who we hire"
        heading="Three profiles,"
        headingAccent="senior-led every time."
      />
      <ScrollyGrid eyebrow="Profiles" heading="Where you might fit." items={PROFILES} />

      <ScrollyGrid eyebrow="What you can expect" heading="The shape of the role." items={EXPECT} />

      <ScrollyCustom
        eyebrow="Apply"
        heading="Tell us about"
        headingAccent="your work."
        wide
      >
        {isSubmitted ? (
          <p className="careers-form__success">
            Thank you for reaching out. We'll review your details and be in touch if there's a fit.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="contact-form careers-form" data-testid="form-careers">
            <div className="contact-form__row">
              <div className="contact-form__field">
                <Label htmlFor="firstName">First name *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName}
                  onChange={handleChange} required data-testid="input-first-name" />
              </div>
              <div className="contact-form__field">
                <Label htmlFor="lastName">Last name *</Label>
                <Input id="lastName" name="lastName" value={formData.lastName}
                  onChange={handleChange} required data-testid="input-last-name" />
              </div>
            </div>
            <div className="contact-form__row">
              <div className="contact-form__field">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" value={formData.email}
                  onChange={handleChange} required data-testid="input-email" />
              </div>
              <div className="contact-form__field">
                <Label htmlFor="linkedIn">LinkedIn</Label>
                <Input id="linkedIn" name="linkedIn" type="url"
                  placeholder="https://linkedin.com/in/..." value={formData.linkedIn}
                  onChange={handleChange} data-testid="input-linkedin" />
              </div>
            </div>
            <div className="contact-form__field">
              <Label htmlFor="areaOfInterest">Area of interest *</Label>
              <Select
                value={formData.areaOfInterest}
                onValueChange={(v) => setFormData((p) => ({ ...p, areaOfInterest: v }))}
              >
                <SelectTrigger data-testid="select-area"><SelectValue placeholder="Select an area" /></SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="contact-form__field">
              <Label htmlFor="message">Tell us about yourself *</Label>
              <Textarea id="message" name="message" rows={5}
                placeholder="What you've delivered, what you're looking for next."
                value={formData.message} onChange={handleChange} required
                className="resize-none" data-testid="input-message" />
            </div>
            <label className="careers-form__consent">
              <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} data-testid="check-consent" />
              <span>I'm happy for Constancia to retain my details so they can come back to me if there's a fit.</span>
            </label>
            {turnstileConfig?.enabled && turnstileConfig.siteKey && (
              <Turnstile siteKey={turnstileConfig.siteKey} onVerify={setCaptchaToken}
                onExpire={clearCaptcha} className="contact-form__turnstile" />
            )}
            <Button
              type="submit"
              variant="brand"
              className="contact-form__submit"
              disabled={isSubmitting || (turnstileConfig?.enabled ? !captchaToken : false)}
              data-testid="button-submit-careers"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Submitting...</>
              ) : (
                <>Submit application<Send className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </form>
        )}
      </ScrollyCustom>

      <ScrollyGrid eyebrow="By the numbers" heading="A small practice with the depth that matters." items={STATS} />

      {flags.contact && (
        <ScrollyCTA
          eyebrow="Not the right role today?"
          heading="Stay in"
          headingAccent="touch anyway."
          body="If you're senior in the EPM or finance transformation space, we always want to know who's around."
          cta={{ label: "Email info@constancia.io", href: "mailto:info@constancia.io", testId: "button-careers-cta" }}
        />
      )}
    </MarketingScrollyPage>
  );
}
