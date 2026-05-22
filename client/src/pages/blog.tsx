/**
 * Day to Day AI (blog) — framework-driven. The full article archive
 * lives at /blog/all (route to add when curated content arrives).
 * This page is curated — hero, what-we-write-about, featured story
 * preview, browse-all CTA.
 */

import { MarketingScrollyPage } from "@/components/scrolly/MarketingScrollyPage";
import {
  ScrollyHero,
  ScrollyText,
  ScrollyGrid,
  ScrollyCTA,
} from "@/components/scrolly/ScrollyPanels";

const SEO = {
  title: "Day to Day AI — Practical Notes on Finance + AI | Constancia",
  description:
    "Short, practical writing on running AI inside finance — what works, what fails, and how to choose between platforms.",
  keywords: [
    "AI for finance",
    "FP&A AI",
    "EPM platforms",
    "Abacum vs OneStream",
    "finance transformation blog",
  ],
};

const TOPICS = [
  { eyebrow: "Topic", title: "Platforms", body: "Honest takes on Abacum, OneStream, Anaplan, Planful, Oracle, and where each one actually fits." },
  { eyebrow: "Topic", title: "AI in practice", body: "What survives contact with a real finance team — and what doesn't." },
  { eyebrow: "Topic", title: "Programmes", body: "Lessons from real EPM and AI delivery, including the bits we got wrong." },
  { eyebrow: "Topic", title: "Selection", body: "How to scope, demo and pick a platform without losing six months." },
];

export default function BlogPage() {
  return (
    <MarketingScrollyPage seo={SEO} label="Day to Day AI" heightVh={540} heightVhMobile={520}>
      <ScrollyHero
        eyebrow="Day to Day AI"
        heading="Practical notes on running AI"
        headingAccent="inside finance."
        body="Short reads from senior practitioners. No hype, no jargon — what we'd actually tell a peer."
      />

      <ScrollyGrid
        eyebrow="What we write about"
        heading="Four lenses, one job."
        items={TOPICS}
      />

      <ScrollyText
        eyebrow="Latest"
        heading="The archive is coming."
        body="We're curating the first set of pieces now. In the meantime, if you'd like a specific take — platform choice, programme post-mortem, AI use case shape — drop us a line and we'll write it next."
      />

      <ScrollyCTA
        eyebrow="Coming soon"
        heading="Want a piece on a specific platform"
        headingAccent="or programme?"
        body="Tell us what you want to read about. We'll write it."
        cta={{ label: "Ask for a piece", href: "/contact", testId: "button-blog-cta" }}
      />
    </MarketingScrollyPage>
  );
}
