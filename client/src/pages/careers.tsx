import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Linkedin, ArrowRight, Send, Loader2, CheckCircle2, Compass, BarChart3, Lightbulb, Info } from "lucide-react";
import { Link } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Turnstile, useTurnstileToken } from "@/components/turnstile";

const stats = [
  { value: "40+", label: "Years combined EPM delivery experience" },
  { value: "3", label: "Platforms we know cold" },
  { value: "100%", label: "Senior delivery, every programme" },
  { value: "Fixed", label: "Fee. Always." },
];

const whyItems = [
  {
    num: "01",
    title: "We recommend what fits, not what pays",
    body: "No vendor targets. No pipeline pressure. The right answer for the client, full stop.",
  },
  {
    num: "02",
    title: "Senior delivery, always",
    body: "Every engagement is delivered by a senior practitioner. We don't staff juniors to protect margin.",
  },
  {
    num: "03",
    title: "Fixed fee, scoped properly",
    body: "No time-and-materials, no pressure to extend. We price it right and we deliver it.",
  },
  {
    num: "04",
    title: "AI-powered tools that make you faster",
    body: "Our delivery methodology is built on tools we've designed ourselves. You're not starting from scratch on every engagement.",
  },
  {
    num: "05",
    title: "Small team, direct client relationships",
    body: "You're not account-managed out of the room. You're the practitioner the client trusts.",
  },
];

const profileCards = [
  {
    icon: Compass,
    title: "EPM Consultants & Architects",
    description:
      "You have delivered OneStream, Pigment, Anaplan, or IBM Planning Analytics in a real programme. You can navigate a CFO's budget concerns and a complex data model in the same afternoon. You are done doing good work inside a bad structure.",
    tags: ["OneStream", "Pigment", "Anaplan", "FP&A", "CPM"],
  },
  {
    icon: BarChart3,
    title: "Finance Analysts & Associates",
    description:
      "You have an FP&A or management accounting background and you have started hitting the ceiling of what Excel and manual processes can do. You want to understand what better looks like. We take the time to develop people properly in this space.",
    tags: ["FP&A", "Management Accounts", "Excel Power User", "Curious"],
  },
  {
    icon: Lightbulb,
    title: "Finance Transformation Advisors",
    description:
      "You have helped finance leaders choose platforms, build business cases, and manage the people side of change. You know the real reasons transformation programmes fail, and it is rarely the technology.",
    tags: ["Transformation", "Advisory", "CFO Relations", "Change"],
  },
];

const expectItems = [
  {
    title: "Genuine autonomy",
    body: "You will own your workstreams. We hire people we trust, and we treat them accordingly.",
  },
  {
    title: "Real client access",
    body: "You will work directly with CFOs, Finance Directors, and Group FP&A leads. No layers between you and the actual brief.",
  },
  {
    title: "Breadth of exposure",
    body: "EPM architecture, business rule design, vendor selection, board-ready output. You will cover a lot of ground, and that is deliberate.",
  },
  {
    title: "Flexible, remote-first",
    body: "We operate across the UK, South Africa, and the Middle East. We judge output, not hours on camera.",
  },
  {
    title: "Competitive, transparent pay",
    body: "We pay to market and we are direct about it. Your rate moves when your contribution does, not on a fixed annual cycle.",
  },
  {
    title: "A firm worth building",
    body: "We are a growing practice, and the people who join now will shape how we work, what we take on, and where we go next. That is not for everyone, but for the right person it matters.",
  },
];

const areaOptions = [
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
        toast({ title: "Verification required", description: "Please complete the \"I'm not a robot\" check before submitting.", variant: "destructive" });
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
        toast({ title: "Thank you for reaching out.", description: "We will review your details and be in touch if there is a fit." });
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
    <div className="min-h-screen page-dark">
      <SEOHead
        title="EPM Consultant Jobs UK | Constancia Careers"
        description="Join Constancia. We build a firm of practitioners, not a bench of consultants. No vendor targets, no utilisation pressure. Roles in EPM delivery, finance systems, and FP&A advisory."
        keywords={["EPM consultant jobs UK", "finance systems consultant", "FP&A consultant", "OneStream consultant", "finance transformation jobs", "EPM careers UK"]}
        breadcrumbs={[
          { name: "Home", url: "https://constancia.com" },
          { name: "Careers", url: "https://constancia.com/careers" },
        ]}
      />


      <main className="pt-16 sm:pt-20">
        <PageHero
          badge="Careers at Constancia"
          title="We're Not Building a Consulting Firm."
          highlightedText="We're Dismantling One."
          description="If you've delivered EPM programmes and you're tired of working for firms with vendor targets, bench pressure, and junior staff on your engagements, let's talk."
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-[#7FB8A3] text-[#252826] border-[#7FB8A3] font-semibold"
              data-testid="button-join-talent"
            >
              <a href="#apply">
                Join Our Talent Community
                <Send className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 text-white backdrop-blur-md"
              data-testid="button-see-profiles"
            >
              <a href="#profiles">
                See Who We Hire
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </PageHero>

        <section className="relative -mt-16 z-10 pb-4 bg-hp-primary" data-testid="section-stats">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <Card
                  key={stat.value}
                  className="text-center p-6"
                  data-testid={`stat-item-${index}`}
                >
                  <div className="text-3xl sm:text-4xl font-bold text-brand-cyan tracking-tight mb-2" data-testid={`stat-value-${index}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground leading-snug" data-testid={`stat-label-${index}`}>
                    {stat.label}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-secondary" data-testid="section-why">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Why Constancia
                </h2>
                <p className="text-xl font-medium text-foreground/80 mb-6">
                  We do the work others talk about.
                </p>
                <p className="text-lg text-muted-foreground mb-4">
                  Most EPM programmes are run by large firms with a lot of staff between the partner
                  and the work. We built Constancia because that model produces reports, not results.
                </p>
                <p className="text-lg text-muted-foreground">
                  You will work on client problems directly, alongside people who have run them at
                  senior level before. Not on the bench waiting for a slot.
                </p>
              </div>

              <div className="flex flex-col">
                {whyItems.map((item, index) => (
                  <div
                    key={item.num}
                    className="py-6"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', ...(index === 0 ? { borderTop: '1px solid rgba(255,255,255,0.07)' } : {}) }}
                    data-testid={`why-item-${index}`}
                  >
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-primary" id="profiles" data-testid="section-profiles">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                We hire people who've actually done this.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Not career consultants. Not people who've studied EPM. People who've designed models, managed go-lives, and come out the other side with scar tissue that's worth something.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {profileCards.map((card, index) => (
                <Card key={card.title} className="hover-elevate transition-all" data-testid={`card-profile-${index}`}>
                  <CardContent className="flex flex-col items-center text-center p-4 sm:p-6 space-y-4">
                    <div className="w-12 h-12 rounded-md bg-gradient-to-br from-brand-navy to-brand-teal flex items-center justify-center">
                      <card.icon className="w-6 h-6 text-brand-cream" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {card.tags.map((tag) => (
                        <Badge key={tag} variant="outline" data-testid={`badge-tag-${tag.toLowerCase().replace(/[&\s]+/g, "-")}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-secondary" data-testid="section-expect">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Life at Constancia
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                What you can expect from us.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
              {expectItems.map((item, index) => (
                <div key={item.title} className="flex gap-4" data-testid={`expect-item-${index}`}>
                  <div
                    className="w-0.5 min-h-[64px] flex-shrink-0 mt-1 rounded-full bg-gradient-to-b from-[#7FB8A3] via-[#8E4F67] to-transparent"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-primary" id="apply" data-testid="section-apply">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                No Open Roles Right Now. <span className="text-brand-cyan">Still Worth Sending a Note.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                We keep a running list. If you've got the background and think there's a fit, send us your details. No commitment on either side, and we'll come back to you within two weeks if we think there's something worth exploring.
              </p>
              <div className="info-box flex gap-3 p-4 rounded-md text-left" data-testid="info-review-process">
                <Info className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">How we review submissions</span>
                  <br />
                  We review every submission personally. If there is a potential fit, we will reach out within two weeks. We don't keep candidates waiting without an answer.
                </div>
              </div>
            </div>

            <div>
                {isSubmitted ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center text-center p-4 sm:p-8" data-testid="container-success">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-navy to-brand-teal flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-8 h-8 text-brand-cyan" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3" data-testid="text-success-heading">Thank you for reaching out.</h3>
                      <p className="text-muted-foreground max-w-sm mb-6">
                        We will review your details and be in touch if there is a fit. Follow Constancia on LinkedIn in the meantime.
                      </p>
                      <Button
                        asChild
                        data-testid="link-linkedin-success"
                      >
                        <a
                          href="https://www.linkedin.com/company/constancia-group/"
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                        >
                          <Linkedin className="mr-2 h-4 w-4" />
                          Follow on LinkedIn
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-talent">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First name *</Label>
                            <Input
                              id="firstName"
                              name="firstName"
                              placeholder="First name"
                              value={formData.firstName}
                              onChange={handleChange}
                              required
                              data-testid="input-first-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last name *</Label>
                            <Input
                              id="lastName"
                              name="lastName"
                              placeholder="Last name"
                              value={formData.lastName}
                              onChange={handleChange}
                              required
                              data-testid="input-last-name"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email address *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            data-testid="input-email"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="linkedIn">LinkedIn profile URL</Label>
                          <Input
                            id="linkedIn"
                            name="linkedIn"
                            type="url"
                            placeholder="linkedin.com/in/your-profile"
                            value={formData.linkedIn}
                            onChange={handleChange}
                            data-testid="input-linkedin"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="areaOfInterest">Area of interest *</Label>
                          <Select
                            value={formData.areaOfInterest}
                            onValueChange={(val) => setFormData((prev) => ({ ...prev, areaOfInterest: val }))}
                            required
                          >
                            <SelectTrigger id="areaOfInterest" data-testid="select-area">
                              <SelectValue placeholder="Select one" />
                            </SelectTrigger>
                            <SelectContent>
                              {areaOptions.map((opt) => (
                                <SelectItem key={opt} value={opt} data-testid={`option-${opt.toLowerCase().replace(/[\s/]+/g, "-")}`}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Tell us about yourself *</Label>
                          <Textarea
                            id="message"
                            name="message"
                            placeholder="Your background, what you are looking for, and why Constancia interests you..."
                            rows={5}
                            value={formData.message}
                            onChange={handleChange}
                            required
                            className="resize-none"
                            data-testid="input-message"
                          />
                        </div>

                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="consent"
                            checked={consent}
                            onCheckedChange={(checked) => setConsent(checked === true)}
                            data-testid="checkbox-consent"
                          />
                          <Label htmlFor="consent" className="text-sm font-normal text-muted-foreground leading-relaxed cursor-pointer">
                            I am happy for Constancia to retain my details and contact me about relevant opportunities. I can withdraw consent at any time.
                          </Label>
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
                          data-testid="button-submit-talent"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              Send My Details
                              <Send className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        </section>

        <section
          className="py-8 sm:py-16 lg:py-24 lg:pb-40 bg-hp-secondary"
          data-testid="section-careers-cta"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Card className="p-4 sm:p-8 lg:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                Stay Connected
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
                Follow us on LinkedIn to stay updated on company news and future career
                opportunities, or get in touch to learn more about Constancia.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                >
                  <a
                    href="https://www.linkedin.com/company/constancia-group/"
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    data-testid="link-linkedin"
                  >
                    <Linkedin className="w-5 h-5 mr-2" />
                    Follow Us on LinkedIn
                  </a>
                </Button>
                {flags.contact && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                  >
                    <Link href="/contact" data-testid="link-contact-cta">
                      Contact Us
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
