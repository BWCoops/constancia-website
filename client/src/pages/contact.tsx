import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Send, Loader2, Globe, Briefcase, Sparkles, Rocket } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackGoogleAdsConversion } from "@/components/google-analytics";
import { useVisitor } from "@/contexts/VisitorContext";
import { Turnstile, useTurnstileToken } from "@/components/turnstile";


const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "info@constancia.io",
    href: "mailto:info@constancia.io",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "86-90 Paul Street, London, EC2A 4NE, United Kingdom",
    href: "https://maps.google.com/?q=86-90+Paul+Street+London+EC2A+4NE",
  },
  {
    icon: Globe,
    label: "Website",
    value: "constancia.io",
    href: "https://constancia.io",
  },
];

const stats = [
  { icon: Briefcase, value: "40+", label: "Years combined EPM delivery experience" },
  { icon: Rocket, value: "£100m+", label: "Finance technology programmes delivered" },
  { icon: Sparkles, value: "< 24h", label: "Typical response time" },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { visitor, updateVisitor, getFirstName, getLastName, isLoaded } = useVisitor();
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
        toast({ title: "Verification required", description: "Please complete the \"I'm not a robot\" check before submitting.", variant: "destructive" });
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
      let errorMessage = "Please try again later or contact us directly.";
      
      if (error?.message) {
        try {
          // Error format is "STATUS: {json}" from apiRequest
          const jsonPart = error.message.replace(/^\d+:\s*/, "");
          const parsed = JSON.parse(jsonPart);
          errorMessage = parsed.error || errorMessage;
        } catch {
          // If not JSON, use the raw message but strip status code
          errorMessage = error.message.replace(/^\d+:\s*/, "") || errorMessage;
        }
      }
      
      toast({
        title: "Unable to send message",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="Contact Us | Constancia - Get In Touch"
        description="Get in touch with Constancia for independent Enterprise Performance Management advisory. Platform selection, transformation planning, and senior-level guidance for finance teams."
        keywords={["contact Constancia", "Enterprise Performance Management", "finance transformation", "independent advisory"]}
      />
      
      <Navigation />

      <main className="pt-16 sm:pt-20">
        <PageHero
          badge="Get In Touch"
          title="No Pitch. No Obligation. Just a Conversation."
          description="If you've got a programme coming up, a platform decision to make, or you just want a straight answer from someone who's done this before, we're happy to talk."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mt-8 max-w-2xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 mb-2 sm:mb-3">
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-cyan" />
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs sm:text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </PageHero>

        <section className="py-8 sm:py-16 lg:py-24 lg:pb-40 bg-hp-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--hp-text-primary)' }}>
                    Contact Information
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    We're a remote-first team based in London. If you have a programme coming up, a platform decision to make, or a question about our work, drop us a message and we'll come back to you within 24 hours.
                  </p>
                </div>

                {contactInfo.map((item, index) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-start gap-4 p-4 glass-card hover-elevate transition-all"
                    data-testid={`link-contact-${index}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-navy to-brand-teal flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-brand-cream" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                      <div className="font-medium text-foreground">{item.value}</div>
                    </div>
                  </a>
                ))}

                <Card className="bg-gradient-to-br from-brand-navy to-brand-teal text-brand-cream border-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">How We Work</CardTitle>
                    <CardDescription className="text-brand-cream/80">
                      We scope everything properly and agree the price before we start. You know exactly what you're getting.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-brand-cream/70">
                      No time-and-materials, no bill shock at month three. A fixed fee, delivered by the senior practitioner who scoped it.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Tell us what you're working on</CardTitle>
                    <CardDescription>
                      We'll come back to you within 24 hours.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-contact">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            data-testid="input-first-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            placeholder="Smith"
                            value={formData.lastName}
                            onChange={handleChange}
                            data-testid="input-last-name"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone *</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="+44 1234 567890"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            data-testid="input-phone"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="john@company.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            data-testid="input-email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Tell us about your project and how we can help..."
                          rows={5}
                          value={formData.message}
                          onChange={handleChange}
                          className="resize-none"
                          data-testid="input-message"
                        />
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
                        variant="brand"
                        className="w-full"
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
                            Send Message
                            <Send className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
