/**
 * Services — declares its panels; framework renders them.
 *
 * No layout code on this page. All visual treatment lives in
 * client/src/components/scrolly/* and index.css. To restyle every
 * marketing page, edit those — not this file.
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
  title: "Services — Abacum, OneStream, AI Development Partner | Constancia",
  description:
    "Official Abacum partner for mid-market FP&A, OneStream partner for enterprise EPM, and an AI development partner for custom build. Senior practitioners, fixed-fee delivery.",
  keywords: [
    "Abacum partner",
    "OneStream partner",
    "AI development partner",
    "Enterprise Performance Management",
    "FP&A implementation",
    "custom AI development",
  ],
};

const ABACUM_DELIVERABLES = [
  { eyebrow: "01", title: "Implementation, end to end", body: "Scoping, build, migration, hypercare." },
  { eyebrow: "02", title: "Data model design", body: "Integration with your ERP, HRIS and CRM." },
  { eyebrow: "03", title: "Driver-based planning", body: "Configured around how your business actually runs." },
  { eyebrow: "04", title: "Workforce planning", body: "Headcount modelling and labour cost." },
  { eyebrow: "05", title: "Reporting design", body: "Management packs and live dashboards." },
  { eyebrow: "06", title: "Team enablement", body: "Admin handover so your team owns it." },
];

const ONESTREAM_DELIVERABLES = [
  { eyebrow: "01", title: "Close and consolidation", body: "Financial close on a single governed platform." },
  { eyebrow: "02", title: "Statutory + management reporting", body: "Two books from one source of truth." },
  { eyebrow: "03", title: "Driver-based planning", body: "Rolling forecasts and scenario modelling." },
  { eyebrow: "04", title: "Account reconciliations", body: "Certifications and audit-ready trails." },
  { eyebrow: "05", title: "Narrative reporting", body: "Disclosure management and board narrative." },
  { eyebrow: "06", title: "Hypercare + handover", body: "Optimisation and capability transfer." },
];

const AI_DEV_DELIVERABLES = [
  { eyebrow: "01", title: "Use case scoping", body: "ROI modelling and prioritisation." },
  { eyebrow: "02", title: "Custom model build", body: "Fine-tuning, eval harnesses, guardrails." },
  { eyebrow: "03", title: "Retrieval + grounding", body: "RAG architecture on your data." },
  { eyebrow: "04", title: "Application development", body: "Apps that sit on top of your stack." },
  { eyebrow: "05", title: "Integration", body: "ERP, EPM, CRM, warehouse, file shares." },
  { eyebrow: "06", title: "Production + monitoring", body: "Deployment, drift detection, evals." },
];

export default function ServicesPage() {
  const { flags } = useFeatureFlags();

  return (
    <MarketingScrollyPage seo={SEO} label="Constancia Services" heightVh={780} heightVhMobile={680}>
      <ScrollyHero
        eyebrow="Services"
        heading="Three ways we deliver"
        headingAccent="enterprise intelligence."
        body="A senior team, two declared platform partners, and a development practice for everything in between."
      />

      {/* Abacum */}
      <ScrollyText
        eyebrow="Mid-market FP&A · Abacum partner"
        heading="FP&A that finally keeps up with the business."
        body="AI-augmented planning that connects to your ERP, HRIS and CRM — without months of consultancy overhead."
      />
      <ScrollyGrid
        eyebrow="What we deliver — Abacum"
        heading="From scoping to handover, end to end."
        items={ABACUM_DELIVERABLES}
      />

      {/* OneStream */}
      <ScrollyText
        eyebrow="Enterprise EPM · OneStream partner"
        heading="OneStream, integrated and adopted."
        body="Consolidation, planning, narrative reporting and account reconciliations on a single, governed platform — built by the senior people who scoped it."
      />
      <ScrollyGrid
        eyebrow="What we deliver — OneStream"
        heading="One platform, every reporting need."
        items={ONESTREAM_DELIVERABLES}
      />

      {/* AI Development Partner */}
      <ScrollyText
        eyebrow="AI Development Partner"
        heading="When the off-the-shelf tool doesn't fit,"
        headingAccent="we build the one that does."
        body="Edge-case AI use cases, custom model build, and applications that sit on top of your existing systems. Connected to your data, owned by your team."
      />
      <ScrollyGrid
        eyebrow="What we deliver — AI Engineering"
        heading="Custom build, production-grade."
        items={AI_DEV_DELIVERABLES}
      />

      {flags.contact && (
        <ScrollyCTA
          eyebrow="Three ways to start"
          heading="Tell us about your"
          headingAccent="programme."
          body="A 30-minute conversation with a senior practitioner. No pitch, no deck."
          cta={{ label: "Start the conversation", href: "/contact", testId: "button-services-cta" }}
        />
      )}
    </MarketingScrollyPage>
  );
}
