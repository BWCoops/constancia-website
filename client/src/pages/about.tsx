import { Compass, UserCheck, DollarSign, Zap, MessageSquare, Wrench, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";


const howWeWork = [
  {
    num: "01",
    icon: Compass,
    title: "We recommend what fits",
    description: "We match platforms to your business, your team, and your data. If your current system can do the job, we'll tell you that too.",
  },
  {
    num: "02",
    icon: UserCheck,
    title: "Senior delivery, no exceptions",
    description: "The practitioner who scopes the engagement delivers it. No juniors learning on your programme, no account managers in the middle.",
  },
  {
    num: "03",
    icon: DollarSign,
    title: "Fixed fee, always",
    description: "We scope properly and price upfront. You know what you're committing to before we start, and it doesn't change.",
  },
  {
    num: "04",
    icon: Zap,
    title: "AI-augmented from day one",
    description: "Our delivery tools standardise process and output across every engagement. That's how we cut cost and delivery time without cutting quality.",
  },
  {
    num: "05",
    icon: MessageSquare,
    title: "Straight advice",
    description: "We tell you what you need to hear. If your programme is heading off track, we say so. If the platform you want isn't the right one, we'll explain why.",
  },
  {
    num: "06",
    icon: Wrench,
    title: "Built on real delivery experience",
    description: "Our tools, our methodology, and our advice are all built on programmes we've actually delivered, at enterprise scale, under real pressure.",
  },
];

const differentiators = [
  "The senior person, not the sales team",
  "No vendor fees, no conflicts of interest",
  "Fixed fee, agreed before we start",
  "Straight advice, even when it's not what you want to hear",
  "Platform recommendations that aren't shaped by referral payments",
  "We've delivered this. Many times.",
];

export const aboutCoreValues = howWeWork;

export default function AboutPage() {
  const { flags } = useFeatureFlags();
  
  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="About Constancia — Connected Finance Intelligence · Abacum + OneStream Partner"
        description="Constancia is a connected finance intelligence firm. We bring every finance system you own into one source of truth: ERP, EPM, HRIS, CRM, data warehouse, and the spreadsheets nobody talks about. Official Abacum partner for mid-market FP&A. OneStream partner for enterprise. Built by senior practitioners with deep FTSE 100 finance experience."
        keywords={["about Constancia", "connected finance intelligence", "EPM consultancy", "finance systems integration", "senior finance practitioners", "finance technology advisory"]}
      />
      
      <Navigation />

      <main className="pt-16 sm:pt-20">
        <PageHero
          badge="About Us"
          title="We've Delivered It. Now We're Disrupting It."
          description="We're practitioners who've spent careers inside the consulting model that's been overcharging finance leaders for decades. We built Constancia because we knew there was a better way."
        />

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--hp-text-primary)' }}>
                How We Work
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Not principles. Behaviours. This is how we work on every engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {howWeWork.map((item, index) => (
                <div
                  key={item.title}
                  className="flex flex-col p-4 sm:p-6 glass-card hover-elevate transition-all"
                  data-testid={`card-value-${index}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      style={{
                        fontFamily: 'var(--hp-font-mono)',
                        fontSize: '11px',
                        color: 'var(--hp-cyan)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {item.num}
                    </span>
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-navy to-brand-teal flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-brand-cream" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--hp-text-primary)' }}>
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: 'var(--hp-text-primary)' }}>
                  Why Work With Us?
                </h2>
                <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                  Because the firms that know EPM best are usually the ones selling it, or charging three times what the work is worth to deliver it.
                </p>
                <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                  We've spent years inside those firms. We know how the model works and where the value leaks out. Constancia is built on the premise that a small team of senior practitioners, armed with the right tools, can outdeliver a 20-person consulting team at a fraction of the cost. Our tools, FinanceCompass, the EPM Comparison Tool, and detailed Vendor Profiles, aren't sales aids. They're how we standardise the quality of our work and get you to the right answer faster.
                </p>
                <ul className="space-y-4">
                  {differentiators.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                      <span style={{ color: 'var(--hp-text-primary)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 sm:p-8 rounded-xl bg-gradient-to-br from-brand-navy to-brand-teal text-brand-cream">
                <h3 className="text-2xl font-bold mb-6">Our Vision</h3>
                <div className="space-y-4">
                  <p className="leading-relaxed text-white/90">
                    To make every finance system in your business agree with itself, so finance leaders decide on one truth rather than seven approximations.
                  </p>
                  <p className="leading-relaxed text-white/80">
                    Most businesses end up choosing between an expensive consultancy with a vendor incentive problem, or going it alone with a team that hasn't done it before. We're the third option.
                  </p>
                  <p className="leading-relaxed text-white/70">
                    The person who scopes your programme is the person who delivers it. The fee is fixed before we start. The recommendation is based on what's right for your business, nothing else.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 lg:pb-40 bg-hp-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="p-4 sm:p-8 lg:p-12 rounded-md bg-card border border-border text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--hp-text-primary)' }}>
                Let's Have a Conversation.
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
                Whether you're planning an EPM programme, evaluating platforms, or looking for a straight answer on whether your current approach is working, we're happy to talk. No pitch. No obligation.
              </p>
              {flags.contact && (
                <Button
                  variant="brand"
                  data-testid="button-about-cta"
                  asChild
                >
                  <Link href="/contact">
                    Get in Touch
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
