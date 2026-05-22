/**
 * Toolkit — framework-driven curated landing. Full downloadable
 * resource library lives behind /resources/library (when populated).
 */

import { MarketingScrollyPage } from "@/components/scrolly/MarketingScrollyPage";
import {
  ScrollyHero,
  ScrollyText,
  ScrollyGrid,
  ScrollyCTA,
} from "@/components/scrolly/ScrollyPanels";

const SEO = {
  title: "Toolkit — Frameworks + Templates from Real Programmes | Constancia",
  description:
    "Downloadable frameworks, scoping templates, and reference architectures pulled straight from real Constancia delivery.",
  keywords: [
    "EPM templates",
    "finance transformation frameworks",
    "FP&A toolkit",
    "OneStream reference architecture",
    "Abacum scoping template",
  ],
};

const CATEGORIES = [
  { eyebrow: "Pack 01", title: "Scoping", body: "Discovery, requirements gathering, RFP support — the structured questions we ask before any platform choice." },
  { eyebrow: "Pack 02", title: "Selection", body: "Vendor evaluation matrices, weighted scoring, demo scripts. Strip the marketing from a platform decision." },
  { eyebrow: "Pack 03", title: "Delivery", body: "Implementation plans, hypercare runbooks, RACI templates. The plumbing that keeps programmes on time." },
  { eyebrow: "Pack 04", title: "Operating model", body: "Target-state operating models for FP&A and consolidation. Ready to adapt to your business." },
];

export default function FilesPage() {
  return (
    <MarketingScrollyPage seo={SEO} label="Constancia Toolkit" heightVh={540} heightVhMobile={520}>
      <ScrollyHero
        eyebrow="Toolkit"
        heading="Frameworks pulled straight from"
        headingAccent="real programmes."
        body="The artefacts we actually use on Constancia delivery — scoping, selection, runbooks, operating models. Tested by senior practitioners on live engagements."
      />

      <ScrollyGrid
        eyebrow="What's inside"
        heading="Four packs, organised by stage."
        items={CATEGORIES}
      />

      <ScrollyText
        eyebrow="How we share them"
        heading="Curated, not dumped."
        body="We share the artefacts that have survived contact with real programmes. Each pack is reviewed by the senior practitioner who developed it; nothing here is generic consulting boilerplate."
      />

      <ScrollyCTA
        eyebrow="Want a specific pack?"
        heading="Tell us what you need —"
        headingAccent="we'll send the right one."
        body="We don't gate them behind a marketing funnel. Drop us a line and we'll point you at the right artefacts."
        cta={{ label: "Request a pack", href: "/contact", testId: "button-toolkit-cta" }}
      />
    </MarketingScrollyPage>
  );
}
