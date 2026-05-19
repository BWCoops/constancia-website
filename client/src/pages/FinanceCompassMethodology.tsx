import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  Database, 
  FileText, 
  CheckCircle2, 
  ExternalLink, 
  Calculator, 
  BarChart3, 
  Shield, 
  Award, 
  ArrowRight,
  BookOpen,
  Building2,
  Globe,
  Layers,
  Target,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BENCHMARK_SOURCES, BENCHMARK_METRICS, INDUSTRIES } from "@shared/epm-benchmarks";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const dataSourceCategories = [
  {
    id: "government",
    name: "UK Government Open Data",
    icon: Building2,
    description: "Primary authoritative sources from UK government departments and agencies",
    sources: BENCHMARK_SOURCES.filter(s => s.type === "government"),
  },
  {
    id: "proprietary",
    name: "Constancia Analysis & Methodology",
    icon: Award,
    description: "Our proprietary analysis built on 40+ years of combined consulting experience",
    sources: BENCHMARK_SOURCES.filter(s => s.type === "proprietary"),
  },
];

const calculationExamples = [
  {
    id: "slider",
    title: "Slider Questions",
    description: "Continuous scale scoring from 0-10",
    formula: "Score = (User Value / Maximum Value) × Weight",
    example: {
      question: "How would you rate your current forecast accuracy?",
      userInput: "7 out of 10",
      weight: 15,
      calculation: "(7 / 10) × 15 = 10.5 points",
      maxPossible: "15 points",
    },
    color: "bg-[#7FB8A3]/100/10 border-[#7FB8A3]/30",
  },
  {
    id: "weighted",
    title: "Weighted Multiple Choice",
    description: "Options with different point values based on maturity",
    formula: "Score = Selected Option Value × Weight Multiplier",
    example: {
      question: "What planning tools do you use?",
      options: [
        { label: "Spreadsheets only", value: 0.2 },
        { label: "Basic planning software", value: 0.5 },
        { label: "Integrated EPM platform", value: 0.8 },
        { label: "AI-augmented planning", value: 1.0 },
      ],
      userSelection: "Integrated EPM platform (0.8)",
      weight: 20,
      calculation: "0.8 × 20 = 16 points",
      maxPossible: "20 points",
    },
    color: "bg-teal-500/10 border-teal-500/30",
  },
  {
    id: "single_select",
    title: "Single Select",
    description: "Binary or categorical scoring",
    formula: "Score = (Selected = Target) ? Weight : 0",
    example: {
      question: "Do you have a dedicated FP&A team?",
      options: ["Yes", "No"],
      userSelection: "Yes",
      weight: 10,
      calculation: "Yes = 10 points (full weight)",
      maxPossible: "10 points",
    },
    color: "bg-emerald-500/10 border-emerald-500/30",
  },
  {
    id: "multi_select",
    title: "Multi-Select",
    description: "Cumulative scoring for multiple selections",
    formula: "Score = (Count Selected / Total Options) × Weight",
    example: {
      question: "Which reporting capabilities do you have?",
      options: ["Real-time dashboards", "Self-service analytics", "Mobile reporting", "Automated distribution", "Exception alerts"],
      userSelections: ["Real-time dashboards", "Self-service analytics", "Mobile reporting"],
      weight: 15,
      calculation: "(3 / 5) × 15 = 9 points",
      maxPossible: "15 points",
    },
    color: "bg-[#7FB8A3]/100/10 border-[#7FB8A3]/30",
  },
];

const maturityLevels = [
  { level: 1, name: "Foundation", range: "0-25%", description: "Manual processes, spreadsheet-based, reactive decision-making", color: "bg-red-500" },
  { level: 2, name: "Developing", range: "26-50%", description: "Some automation, basic systems in place, limited integration", color: "bg-orange-500" },
  { level: 3, name: "Established", range: "51-75%", description: "Integrated systems, standardised processes, proactive insights", color: "bg-yellow-500" },
  { level: 4, name: "Advanced", range: "76-100%", description: "AI-augmented, real-time analytics, predictive capabilities", color: "bg-green-500" },
];

const benchmarkTiers = [
  { tier: "typical", label: "Typical", description: "Median performance (P50) - where most organisations operate", color: "text-slate-600 dark:text-slate-400" },
  { tier: "constancia_good", label: "Above Average", description: "Top quartile (P75) - what good looks like in modern finance", color: "text-[#8E4F67] dark:text-[#7FB8A3]" },
  { tier: "constancia_best", label: "Best in Class", description: "Digital world class (P90+) - aspirational excellence", color: "text-teal-600 dark:text-teal-400" },
];

export default function FinanceCompassMethodology() {
  const totalMetrics = BENCHMARK_METRICS.length;
  const totalIndustries = INDUSTRIES.length;
  const totalSources = BENCHMARK_SOURCES.length;

  return (
    <>
      <SEOHead
        title="Benchmarking Methodology | FinanceCompass | Constancia"
        description="How Constancia builds accurate finance benchmarks using UK government data. Full transparency into our scoring methodology, data sources, and calculations."
        canonicalUrl="/finance-compass/methodology"
      />
      <Navigation />
      
      <main className="min-h-screen bg-background">
        <section className="relative py-20 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--fc-navy))] via-[hsl(var(--fc-navy-light))] to-[hsl(var(--fc-teal))]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#7FB8A3]/100/20 via-transparent to-transparent" />
          
          <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 bg-[#7FB8A3]/100/20 text-[#7FB8A3] border-[#7FB8A3]/30" data-testid="badge-methodology">
                <Shield className="w-3 h-3 mr-1" />
                Complete Transparency
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6" data-testid="heading-methodology-title">
                Our Benchmarking{" "}
                <span className="bg-gradient-to-r from-[#5E8D7A] to-teal-400 bg-clip-text text-transparent">
                  Methodology
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-3xl mx-auto" data-testid="text-methodology-description">
                Built on UK open source government data and 40+ years of combined consulting experience. 
                We believe in complete transparency - here's exactly how we calculate your benchmarks.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Database className="w-4 h-4 text-[#7FB8A3]" />
                  <span className="text-white text-sm font-medium" data-testid="stat-sources">{totalSources} Data Sources</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <BarChart3 className="w-4 h-4 text-teal-400" />
                  <span className="text-white text-sm font-medium" data-testid="stat-metrics">{totalMetrics} Metrics</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white text-sm font-medium" data-testid="stat-industries">{totalIndustries} Industries</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-12"
              {...fadeInUp}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-data-sources">
                Our Data Sources
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                We exclusively use UK open source government data to build our benchmarks. 
                No proprietary third-party data - just transparent, verifiable public information.
              </p>
            </motion.div>

            <div className="space-y-8">
              {dataSourceCategories.map((category, idx) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card className="border-border/50">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7FB8A3]/100/20 to-teal-500/20 flex items-center justify-center">
                          <category.icon className="w-5 h-5 text-[#8E4F67] dark:text-[#7FB8A3]" />
                        </div>
                        <div>
                          <CardTitle className="text-xl" data-testid={`heading-category-${category.id}`}>{category.name}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.sources.map((source) => (
                          <a
                            key={source.id}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 rounded-lg border border-border/50 hover:border-[#7FB8A3]/50 hover:bg-[#7FB8A3]/100/5 transition-all duration-200"
                            data-testid={`link-source-${source.id}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-foreground group-hover:text-[#8E4F67] dark:group-hover:text-[#7FB8A3] transition-colors">
                                {source.name}
                              </h4>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-[#7FB8A3] transition-colors flex-shrink-0" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {source.description}
                            </p>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-12"
              {...fadeInUp}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-scoring">
                Scoring Methodology
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Every assessment question contributes to your overall score using transparent, consistent calculations.
                Here are detailed examples of how we calculate each question type.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {calculationExamples.map((calc, idx) => (
                <motion.div
                  key={calc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card className={`h-full border-2 ${calc.color}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                          <Calculator className="w-4 h-4 text-[#8E4F67]" />
                        </div>
                        <div>
                          <CardTitle className="text-lg" data-testid={`heading-calc-${calc.id}`}>{calc.title}</CardTitle>
                          <CardDescription>{calc.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Formula</p>
                        <code className="text-sm font-mono text-foreground">{calc.formula}</code>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">Example:</p>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-muted-foreground">Question:</span>
                            <span className="text-foreground text-right">{calc.example.question}</span>
                          </div>
                          
                          {calc.example.options && (
                            <div className="p-2 bg-background rounded border border-border/50">
                              <p className="text-xs text-muted-foreground mb-2">Options:</p>
                              <div className="space-y-1">
                                {Array.isArray(calc.example.options) && calc.example.options.map((opt: any, i: number) => (
                                  <div key={i} className="flex justify-between text-xs">
                                    <span>{typeof opt === 'string' ? opt : opt.label}</span>
                                    {typeof opt !== 'string' && <span className="text-[#8E4F67]">({opt.value})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between">
                            <span className="text-muted-foreground">User Input:</span>
                            <span className="text-[#8E4F67] font-medium">
                              {calc.example.userInput || calc.example.userSelection || calc.example.userSelections?.join(", ")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Weight:</span>
                            <span className="text-foreground">{calc.example.weight} points</span>
                          </div>
                          <div className="pt-2 border-t border-border/50">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Calculation:</span>
                              <span className="font-mono text-sm text-foreground">{calc.example.calculation}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-muted-foreground">Max Possible:</span>
                              <span className="text-muted-foreground">{calc.example.maxPossible}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-12"
              {...fadeInUp}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-maturity">
                Maturity Framework
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Your scores map to our 4-level maturity framework, helping you understand where you are
                and what's needed to advance to the next level.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {maturityLevels.map((level, idx) => (
                <motion.div
                  key={level.level}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card className="h-full text-center">
                    <CardHeader className="pb-2">
                      <div className={`w-12 h-12 rounded-full ${level.color} mx-auto mb-3 flex items-center justify-center`}>
                        <span className="text-white font-bold text-xl">{level.level}</span>
                      </div>
                      <CardTitle data-testid={`heading-level-${level.level}`}>{level.name}</CardTitle>
                      <Badge variant="outline" className="mt-2">{level.range}</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card className="border-[#7FB8A3]/30 bg-gradient-to-r from-[#7FB8A3]/100/5 to-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="heading-benchmark-tiers">
                  <Target className="w-5 h-5 text-[#8E4F67]" />
                  Benchmark Tiers
                </CardTitle>
                <CardDescription>
                  How we define performance tiers for industry benchmarking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {benchmarkTiers.map((tier) => (
                    <div key={tier.tier} className="p-4 bg-background rounded-lg border border-border/50">
                      <h4 className={`font-semibold mb-2 ${tier.color}`}>{tier.label}</h4>
                      <p className="text-sm text-muted-foreground">{tier.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-12"
              {...fadeInUp}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-transparency">
                Metric Transparency
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                We believe in complete transparency. Each benchmark metric is clearly labelled by how it was derived.
                As we collect more assessment data, we'll transition expert estimates to data-driven benchmarks.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-lg">Data-Derived</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Raw statistics sourced directly from ONS and Companies House publications.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Employment counts by sector (ONS EMP13)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Labour productivity by industry
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Average wages by sector
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-[#7FB8A3]/30 bg-[#7FB8A3]/100/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#7FB8A3]/100 flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-lg">Constancia Insights + APQC</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Benchmarks enriched with APQC Open Standards Benchmarking data (2024), covering 47 industries with top performer, median, and laggard bands.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7FB8A3]/100" />
                      Budget cycle duration (APQC: top ~25 days, median ~32 days)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7FB8A3]/100" />
                      Days to close monthly books
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7FB8A3]/100" />
                      Forecast accuracy and cycle duration
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7FB8A3]/100" />
                      Industry-specific adjustments (47 industries)
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    Source: APQC Open Standards Benchmarking, accessed December 2024. Cross-industry summaries indicate most organisations fall in the 1-3 month budget cycle range.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-[#7FB8A3]/30 bg-[#7FB8A3]/100/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#7FB8A3]/100 flex items-center justify-center">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-lg">Continuous Improvement</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    As organisations complete FinanceCompass assessments, we aggregate anonymised responses to continuously refine our benchmarks.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7FB8A3]/100" />
                      Statistically validated over time
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7FB8A3]/100" />
                      Industry-specific refinements
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  <strong>Our Commitment:</strong> As organisations complete FinanceCompass assessments, 
                  we'll aggregate anonymised responses to build proprietary benchmarks - following the same 
                  rigorous methodology used by organisations like APQC. Expert estimates will be progressively 
                  replaced with statistically validated, data-driven benchmarks.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-12"
              {...fadeInUp}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-dimensions">
                7 Assessment Dimensions
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                The Constancia Finance Transformation Framework assesses your organisation across 7 key dimensions,
                each contributing to your overall finance transformation readiness score.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { code: "D1", name: "Data & Master Data", icon: Database, description: "Quality, governance, and integration of financial data across systems" },
                { code: "D2", name: "Process Maturity", icon: Layers, description: "Standardisation, automation, and efficiency of finance processes" },
                { code: "D3", name: "Planning & Forecasting", icon: TrendingUp, description: "Budgeting, forecasting, and scenario planning capabilities" },
                { code: "D4", name: "Reporting & Analytics", icon: BarChart3, description: "Management reporting, dashboards, and analytical capabilities" },
                { code: "D5", name: "Technology & Integration", icon: Zap, description: "Systems landscape, integration, and technology enablement" },
                { code: "D6", name: "Governance & Controls", icon: Shield, description: "Financial controls, compliance, and governance frameworks" },
                { code: "D7", name: "People & Skills", icon: Users, description: "Team capabilities, skills development, and organisational structure" },
              ].map((dimension, idx) => (
                <motion.div
                  key={dimension.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                >
                  <Card className="h-full hover:border-[#7FB8A3]/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7FB8A3]/100 to-teal-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{dimension.code}</span>
                        </div>
                        <dimension.icon className="w-5 h-5 text-[#8E4F67]" />
                      </div>
                      <CardTitle className="text-lg mt-3" data-testid={`heading-dimension-${dimension.code}`}>
                        {dimension.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{dimension.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-12"
              {...fadeInUp}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-faq">
                Frequently Asked Questions
              </h2>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="data-sources" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left" data-testid="accordion-data-sources">
                    Where does your benchmark data come from?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    All our benchmarks are derived from UK open source government data including ONS (Office for National Statistics), 
                    Companies House filings, NAO (National Audit Office) studies, LG Inform local authority data, and other 
                    publicly available government statistics. We do not use proprietary third-party research data - ensuring 
                    complete transparency and verifiability.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="methodology" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left" data-testid="accordion-methodology">
                    How do you calculate the benchmark ranges?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Our Constancia analysis team aggregates data from multiple government sources, applying statistical analysis 
                    to derive percentile ranges. "Typical" represents median (P50) performance, "Above Average" represents top 
                    quartile (P75), and "Best in Class" represents digital world class (P90+). These ranges are validated 
                    against our 40+ years of combined consulting experience working with UK enterprises.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="industry" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left" data-testid="accordion-industry">
                    How do industry-specific benchmarks work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We maintain cross-industry baseline benchmarks that apply to all organisations. For specific industries 
                    (we currently support {totalIndustries} sectors), we apply statistically-derived overrides based on 
                    sector-specific data from sources like HESA for education, DEFRA for agriculture, Ofcom for telecoms, 
                    and so on. These overrides adjust key metrics to reflect genuine industry variations.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="updates" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left" data-testid="accordion-updates">
                    How often are benchmarks updated?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We review and update our benchmarks quarterly, incorporating the latest government data releases. 
                    Major updates occur annually following the release of key statistical publications. All benchmark 
                    data includes source citations and "last updated" timestamps for full transparency.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="scoring" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left" data-testid="accordion-scoring">
                    Can I see exactly how my score was calculated?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! After completing an assessment, your results include a detailed score breakdown showing 
                    exactly how each question contributed to your dimension scores. We show your response, the 
                    points earned, the maximum possible, and the calculation methodology used. Complete transparency 
                    is a core principle of our platform.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-gradient-to-br from-[hsl(var(--fc-navy))] to-[hsl(var(--fc-teal))]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="max-w-3xl mx-auto text-center"
              {...fadeInUp}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" data-testid="heading-cta">
                Ready to Benchmark Your Finance Function?
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Take our pre-assessment to see how you compare against industry benchmarks 
                using our transparent, open-source methodology.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/finance-compass">
                  <Button size="lg" className="bg-white text-[hsl(var(--fc-navy))] hover:bg-slate-100" data-testid="button-start-assessment">
                    Start Assessment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/finance-compass/results">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" data-testid="button-view-benchmarks">
                    View Industry Benchmarks
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
