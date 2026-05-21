import { Compass, UserCheck, DollarSign, Zap, MessageSquare, Wrench, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";


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

// Each pair becomes a "from / to" line in the Why-Work-With-Us
// section, replacing the AI-default bulleted-check-mark list with
// a contrast pattern that makes the differentiator visible by
// stating what it isn't.
const differentiatorContrasts: Array<{ before: string; after: string }> = [
  { before: "The sales team you'll never see again", after: "The senior person who delivers it" },
  { before: "Vendor referral kickbacks shaping the recommendation", after: "Independent on every platform except our two declared partners" },
  { before: "Time-and-materials creeping past the budget", after: "Fixed fee, agreed before we start" },
  { before: "Polite advice that doesn't change anything", after: "The straight version, even when it's awkward" },
  { before: "Slideware demos and stock implementation playbooks", after: "Tools we built ourselves, used on real programmes" },
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
                {/* From/to contrast list. Each row makes the
                    differentiator visible by stating what we're not.
                    No check-marks, no badges — just opposed type
                    weights so the eye reads "this, not that". */}
                <ul className="divide-y divide-[#1E2630]/8">
                  {differentiatorContrasts.map((item) => (
                    <li key={item.after} className="grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-5 items-baseline py-3">
                      <span className="text-sm text-[#1E2630]/55 line-through decoration-[#8E4F67]/40 decoration-[1px]">
                        {item.before}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#8E4F67]">
                        instead
                      </span>
                      <span className="text-sm font-medium text-[#12161D]">
                        {item.after}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Vision panel — bespoke composition with a quote-mark
                  graphic and the vision as a single declarative pull
                  quote, followed by two supporting beats. Replaces
                  the navy-teal gradient card from the old palette. */}
              <div className="relative p-6 sm:p-10 bg-[#12161D] text-[#F6F3EE] rounded-2xl overflow-hidden">
                <div
                  aria-hidden="true"
                  className="absolute -top-8 -right-12 text-[#8E4F67]/25 select-none pointer-events-none font-serif"
                  style={{ fontSize: "240px", lineHeight: 1 }}
                >
                  &ldquo;
                </div>
                <div className="relative">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#7FB8A3] mb-6">
                    Our vision
                  </div>
                  <p className="text-2xl sm:text-3xl font-light leading-snug text-[#F6F3EE] mb-8">
                    Make every finance system in your business agree with itself.
                  </p>
                  <div className="space-y-4 text-[#F6F3EE]/70 text-sm leading-relaxed border-l border-[#7FB8A3]/40 pl-4">
                    <p>
                      Most finance functions choose between an expensive consultancy with a vendor incentive problem and going it alone with a team that hasn't done it before.
                    </p>
                    <p>
                      We're the third option. Senior. Independent on every vendor except our two declared partners. Fixed fee. Tools we built and use ourselves.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing band — bespoke composition with the offer on the
            left and a single dominant link on the right. Replaces
            the stock "centred CTA card with rounded button" pattern
            that reads as AI-generated wherever it appears. */}
        <section className="py-12 sm:py-20 lg:py-32 lg:pb-40 bg-[#F6F3EE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-end border-t border-[#1E2630]/15 pt-12">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#8E4F67] mb-4">
                  No pitch. No deck.
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight text-[#12161D] max-w-2xl">
                  When you're ready,<br />
                  start the <em className="text-[#8E4F67] not-italic font-normal">conversation.</em>
                </h2>
              </div>
              {flags.contact && (
                <Link
                  href="/contact"
                  className="group inline-flex items-baseline gap-3 text-[#12161D] hover:text-[#8E4F67] transition-colors"
                  data-testid="button-about-cta"
                >
                  <span className="text-xl sm:text-2xl font-light underline decoration-[#8E4F67]/40 decoration-1 underline-offset-8 group-hover:decoration-[#8E4F67] group-hover:decoration-2">
                    Talk to a partner
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
