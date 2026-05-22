import { ArrowRight, Search, Target, Map, Rocket, Zap, BarChart3, LineChart, CheckCircle2, Brain, Globe, Cpu, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


const journeySteps = [
  {
    number: 1,
    title: "Explore",
    icon: Search,
    subtitle: "Understand Your Options",
    description: "Before committing budget or resources, understand which platforms align with your finance strategy. Our independent comparison tools help you evaluate Enterprise Performance Management solutions against your specific requirements.",
    examples: [
      "Compare consolidation and close capabilities across OneStream, Anaplan, and Planful",
      "Evaluate planning and forecasting features for your budgeting cycles",
      "Assess integration requirements with your existing ERP and data sources"
    ],
    cta: "Compare Platforms",
    link: "/tools/epm-comparison",
    isAnchor: false,
  },
  {
    number: 2,
    title: "Assess",
    icon: Target,
    subtitle: "Benchmark Your Finance Function",
    description: "Quantify your current state across planning, consolidation, reporting, and governance. Our maturity assessment gives CFOs a clear view of transformation readiness and highlights the areas with the greatest impact.",
    examples: [
      "Benchmark your close cycle against industry standards",
      "Identify bottlenecks in your planning and forecasting processes",
      "Understand gaps in data quality and governance maturity"
    ],
    cta: "Start Assessment",
    link: "/finance-compass",
    isAnchor: false,
  },
  {
    number: 3,
    title: "Plan",
    icon: Map,
    subtitle: "Build Your Business Case",
    description: "Translate assessment insights into a board-ready business case. We help CFOs articulate ROI projections, define success metrics, and create implementation roadmaps that secure stakeholder buy-in.",
    examples: [
      "Develop TCO analysis comparing build versus buy options",
      "Define KPIs for month-end close reduction and forecast accuracy",
      "Create phased implementation roadmap aligned with budget cycles"
    ],
    cta: "Get Expert Guidance",
    link: "/contact",
    isAnchor: false,
  },
  {
    number: 4,
    title: "Implement",
    icon: Rocket,
    subtitle: "Execute with Confidence",
    description: "Our structured methodologies and proven templates help you deliver on time and on budget. We prioritise quick wins that demonstrate value to the board while building toward your target operating model.",
    examples: [
      "Accelerated consolidation setup using pre-built templates",
      "Rapid driver-based planning models tailored to your business",
      "Change management and user adoption programmes for finance teams"
    ],
    cta: "Discuss Implementation",
    link: "/contact",
    isAnchor: false,
  },
];

const comparisonTools = [
  {
    title: "Enterprise Performance Management",
    description: "Compare 11+ leading vendors including Anaplan, OneStream, Planful, and Oracle across 15 key drivers.",
    link: "/tools/epm-comparison",
    icon: BarChart3,
    features: ["11+ Vendors", "15 Key Drivers", "PDF Export"],
    highlight: "Most Popular",
  },
  {
    title: "ERP Platforms",
    description: "Evaluate leading ERP platforms to understand integration requirements and find the best fit for your organisation.",
    link: "/tools/epm-comparison?tab=erp",
    icon: Globe,
    features: ["Major ERPs", "Integration Focus", "Fit Scoring"],
    highlight: null,
  },
  {
    title: "AI for Finance",
    description: "Assess AI capabilities across platforms and understand how artificial intelligence can transform your finance function.",
    link: "/tools/epm-comparison?tab=ai",
    icon: Brain,
    features: ["AI Readiness", "Use Case Mapping", "ROI Analysis"],
    highlight: null,
  },
];

const maturityFeatures = [
  "Comprehensive analysis across 8 finance dimensions",
  "AI-generated insights tailored to your responses",
  "Industry benchmarking and gap analysis",
  "ROI projections and vendor affinity scoring",
  "Instant results with no waiting, no sales pitch",
];

const benefits = [
  {
    icon: Zap,
    title: "Efficiency",
    description: "Eliminate manual bottlenecks and accelerate planning cycles so your team can focus on strategic decisions, not spreadsheet wrangling.",
  },
  {
    icon: BarChart3,
    title: "Integration",
    description: "Break down silos between finance, operations, and supply chain to gain a single source of truth and respond faster to change.",
  },
  {
    icon: LineChart,
    title: "Intelligence",
    description: "Move from reactive reporting to proactive insights with AI that anticipates risks, surfaces opportunities, and supports confident decision-making.",
  },
];

const aiCapabilities = [
  {
    icon: Brain,
    title: "Predictive Analytics",
    description: "AI analyses historical data to forecast trends, identify risks, and optimise planning cycles.",
  },
  {
    icon: Cpu,
    title: "Process Automation",
    description: "Automate repetitive tasks like reconciliations, reporting, and data validation.",
  },
  {
    icon: Globe,
    title: "Real-time Insights",
    description: "Generate instant analysis and recommendations from complex financial data.",
  },
];

export default function SolutionsPage() {
  const { flags } = useFeatureFlags();

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };
  
  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="Solutions & Tools | Constancia - Enterprise Performance Management"
        description="Structured analysis tools, expert advisory, and proven methodologies for your EPM journey. Interactive comparison and maturity assessment for finance leaders."
        keywords={["enterprise performance management", "EPM solutions", "finance transformation", "ERP solutions", "AI finance tools"]}
      />
      

      <main className="pt-16 sm:pt-20">
        <PageHero
          badge="Solutions & Tools"
          title="Your Transformation Journey"
          highlightedText="Starts Here"
          description="Whether you're exploring options or ready to implement, we have the tools and expertise to guide you. Start with our tools, engage when you need expert guidance, and get quality outcomes."
        />

        <section className="py-8 sm:py-16 lg:py-24" id="user-journey">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Your Path to Finance Transformation
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A clear journey from exploration to implementation. Start anywhere, progress at your own pace.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              {journeySteps.map((step, index) => (
                <div
                  key={step.title}
                  className="relative"
                >
                  <div className="flex gap-6 md:gap-8">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-brand-navy via-brand-teal to-brand-cyan flex items-center justify-center flex-shrink-0 shadow-xl shadow-[#8E4F67]/30">
                        <step.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      </div>
                      {index < journeySteps.length - 1 && (
                        <div className="w-1 flex-1 min-h-[40px] bg-gradient-to-b from-[#7FB8A3] to-[#8E4F67]/30 my-4 rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-12">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-teal bg-[#7FB8A3]/10 px-3 py-1 rounded-full">
                          Step {step.number}
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                        {step.title}
                      </h3>
                      <p className="text-base md:text-lg font-medium text-brand-teal mb-4">
                        {step.subtitle}
                      </p>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {step.description}
                      </p>
                      
                      <div className="bg-muted/50 dark:bg-muted/20 rounded-xl p-5 mb-6">
                        <p className="text-sm font-semibold text-foreground mb-3">For example:</p>
                        <ul className="space-y-2">
                          {step.examples.map((example, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 flex-shrink-0" />
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {step.isAnchor ? (
                        <Button
                          variant="brand"
                          asChild
                          data-testid={`link-journey-${step.title.toLowerCase()}`}
                        >
                          <a href={step.link} onClick={(e) => handleAnchorClick(e, step.link)}>
                            {step.cta}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="brand"
                          asChild
                          data-testid={`link-journey-${step.title.toLowerCase()}`}
                        >
                          <Link href={step.link}>
                            {step.cta}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-secondary" id="comparison-tools">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-[#7FB8A3]/10 text-brand-teal border-0">
                Comparison Tools
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Compare Leading Platforms
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Independent comparison across Enterprise Performance Management, ERP, and AI platforms. No registration required. Export professional reports.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {comparisonTools.map((tool, index) => (
                <div key={tool.title}>
                  <Link href={tool.link}>
                    <Card className="h-full hover-elevate cursor-pointer group relative overflow-visible border-0 shadow-md hover:shadow-xl transition-shadow">
                      {tool.highlight && (
                        <div className="absolute -top-3 left-4 z-10">
                          <Badge className="bg-[#7FB8A3] text-[#252826] font-semibold text-xs px-3 py-1 shadow-sm">
                            {tool.highlight}
                          </Badge>
                        </div>
                      )}
                      <div className="bg-gradient-to-br from-brand-navy to-brand-teal p-5 rounded-t-lg">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3">
                          <tool.icon className="w-6 h-6 text-brand-cyan" />
                        </div>
                        <h3 className="text-lg font-bold text-white leading-tight">
                          {tool.title}
                        </h3>
                      </div>
                      <CardContent className="flex flex-col min-h-[180px] pt-4 pb-5 bg-background rounded-b-lg">
                        <p className="text-muted-foreground text-sm flex-grow">{tool.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3 mb-4">
                          {tool.features.map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs font-medium bg-muted/50">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-auto pt-3 border-t border-border/50">
                          <span className="inline-flex items-center text-sm font-semibold text-brand-teal group-hover:gap-2 transition-all" data-testid={`link-tool-${index}`}>
                            Try Now
                            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24" id="maturity-assessment">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-[#7FB8A3]/10 text-brand-teal border-0">
                Maturity Assessment
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Finance Maturity Assessment
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover your organisation's transformation readiness and get personalised recommendations. Rigorous analysis in 10 minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center">
              <div>
                <ul className="space-y-4">
                  {maturityFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-br from-brand-navy to-brand-teal p-4 sm:p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
                      <Target className="w-10 h-10 text-brand-cyan" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Start Your Assessment</h3>
                    <p className="text-white/80 text-sm mb-6">
                      Complete in 10 minutes. Results immediately.
                    </p>
                    <Link href="/finance-compass">
                      <Button
                        size="lg"
                        className="bg-[#7FB8A3] text-[#252826] hover:bg-[#7FB8A3]/90 font-semibold"
                        data-testid="button-maturity-assessment-cta"
                      >
                        Begin Assessment
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Enterprise Performance Management
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Address the challenges holding your finance function back and unlock its full potential.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {benefits.map((benefit) => (
                <div key={benefit.title}>
                  <Card className="h-full text-center hover-elevate bg-gradient-to-br from-background via-background to-[#8E4F67]/5">
                    <CardHeader>
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-navy via-brand-teal to-brand-cyan flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#8E4F67]/20">
                        <benefit.icon className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-xl text-foreground">{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                AI in Finance
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                AI helps finance teams work smarter by automating manual tasks, 
                detecting patterns in data, and generating predictive insights. It enables 
                faster, more accurate decision-making and frees up time for strategic thinking.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {aiCapabilities.map((capability) => (
                <div key={capability.title}>
                  <Card className="h-full hover-elevate text-center bg-gradient-to-br from-background via-background to-[#7FB8A3]/5">
                    <CardHeader className="items-center">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-navy via-brand-teal to-brand-cyan flex items-center justify-center mb-4 shadow-lg shadow-[#7FB8A3]/20">
                        <capability.icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-lg text-foreground">{capability.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">{capability.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 bg-hp-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-6 h-6 text-brand-cyan" />
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Why Act Now</h2>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  The market for Enterprise Performance Management, ERP, and AI in finance is accelerating. 
                  Organisations that modernise their finance function now gain a competitive edge, reduce operational 
                  risk, and position themselves for growth in an increasingly digital economy.
                </p>
                <p className="text-lg text-muted-foreground">
                  Waiting means falling behind competitors who are already using these technologies to 
                  drive efficiency, improve decision-making, and unlock new value from their financial data.
                </p>
              </div>

              <div className="p-4 sm:p-8 rounded-xl bg-card border border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Market Acceleration Drivers
                </h3>
                <ul className="space-y-3">
                  {[
                    "AI-led decision-making transforming finance operations",
                    "Integrated planning becoming a competitive necessity",
                    "Cloud platforms enabling real-time analytics and automation",
                    "ESG reporting compliance driving technology adoption",
                  ].map((stat) => (
                    <li key={stat} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{stat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-16 lg:py-24 lg:pb-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Card className="border border-border/50">
              <CardContent className="p-4 sm:p-8 lg:p-12 text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Take the Next Step
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
                  Start with our tools, or speak to us when you need guidance. 
                  We're here to help you get the right outcome.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                  <Link href="/tools/epm-comparison">
                    <Button
                      size="lg"
                      variant="outline"
                      data-testid="button-final-compare"
                    >
                      Compare Platforms
                    </Button>
                  </Link>
                  <Link href="/finance-compass">
                    <Button
                      size="lg"
                      data-testid="button-final-assessment"
                    >
                      Start Assessment
                    </Button>
                  </Link>
                  {flags.contact && (
                    <Link href="/contact">
                      <Button
                        size="lg"
                        variant="outline"
                        data-testid="button-final-contact"
                      >
                        Talk to an Expert
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
