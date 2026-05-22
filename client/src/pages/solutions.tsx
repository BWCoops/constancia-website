/**
 * Solutions — framework-driven. The four-stage methodology
 * (Explore → Assess → Plan → Implement) + comparison categories +
 * outcomes, declared as panel data.
 */

import { useFeatureFlags } from "@/lib/feature-flags";
import { MarketingScrollyPage } from "@/components/scrolly/MarketingScrollyPage";
import {
  ScrollyHero,
  ScrollyText,
  ScrollyGrid,
  ScrollyCTA,
} from "@/components/scrolly/ScrollyPanels";

const SEO = {
  title: "Solutions — Productised Intelligence for Finance + Operations | Constancia",
  description:
    "Explore, Assess, Plan, Implement — Constancia's four-stage methodology for taking a finance function from debate to outcomes.",
  keywords: [
    "EPM solutions",
    "finance transformation methodology",
    "FP&A advisory",
    "Constancia methodology",
    "platform selection",
  ],
};

const STAGES = [
  { eyebrow: "Stage 01", title: "Explore", body: "Understand your options. Before committing budget, see which platforms align with your finance strategy. Independent comparison across EPM, ERP and AI for finance." },
  { eyebrow: "Stage 02", title: "Assess", body: "Benchmark your finance function. Quantify the current state across planning, consolidation, reporting, and governance. Clear view of transformation readiness." },
  { eyebrow: "Stage 03", title: "Plan", body: "Build the business case. Translate assessment insights into a board-ready case with ROI projections, success metrics, and implementation roadmaps." },
  { eyebrow: "Stage 04", title: "Implement", body: "Execute with confidence. Structured methodologies and proven templates so you deliver on time, on budget, with quick wins for the board." },
];

const COMPARISONS = [
  { eyebrow: "Compare", title: "Enterprise Performance Management", body: "Anaplan, OneStream, Planful, Oracle and 8 more, scored across 15 key drivers." },
  { eyebrow: "Compare", title: "ERP Platforms", body: "Leading ERPs evaluated for integration requirements and finance-function fit." },
  { eyebrow: "Compare", title: "AI for Finance", body: "AI capability assessment across platforms — what's real, what's marketing." },
];

const OUTCOMES = [
  { eyebrow: "Outcome", title: "Efficiency", body: "Eliminate manual bottlenecks. Faster planning cycles so the team can focus on strategy, not spreadsheets." },
  { eyebrow: "Outcome", title: "Insight", body: "Real-time visibility across every system you own. One source of truth for finance and operations." },
  { eyebrow: "Outcome", title: "Confidence", body: "Audit-ready close, governed reporting, evidence trails. The board sees the numbers; you sleep at night." },
  { eyebrow: "Outcome", title: "Speed", body: "Forecasts that move with the business — not three months behind it." },
];

export default function SolutionsPage() {
  const { flags } = useFeatureFlags();

  return (
    <MarketingScrollyPage seo={SEO} label="Constancia Solutions" heightVh={720} heightVhMobile={640}>
      <ScrollyHero
        eyebrow="Solutions"
        heading="Productised intelligence for"
        headingAccent="finance and operations."
        body="A four-stage methodology that takes a finance function from debate to outcomes — without the manual rework in Excel and PowerPoint."
      />

      <ScrollyGrid
        eyebrow="Methodology"
        heading="Explore. Assess. Plan. Implement."
        items={STAGES}
      />

      <ScrollyText
        eyebrow="Independent comparison"
        heading="Choose your platform"
        headingAccent="with eyes open."
        body="Constancia's comparison engines score the leading EPM, ERP and AI-for-finance platforms across the criteria that actually move the needle — not the marketing surface area."
      />

      <ScrollyGrid
        eyebrow="What we compare"
        heading="Three engines, one decision framework."
        items={COMPARISONS}
      />

      <ScrollyText
        eyebrow="Outcomes"
        heading="What this looks like"
        headingAccent="six months in."
      />
      <ScrollyGrid
        eyebrow="What you get"
        heading="Four outcomes, not slogans."
        items={OUTCOMES}
      />

      {flags.contact && (
        <ScrollyCTA
          eyebrow="No deck. No pitch."
          heading="Ready to start with"
          headingAccent="Explore?"
          body="A 30-minute conversation with a senior practitioner to scope where you are and where you want to be."
          cta={{ label: "Start the conversation", href: "/contact", testId: "button-solutions-cta" }}
        />
      )}
    </MarketingScrollyPage>
  );
}
