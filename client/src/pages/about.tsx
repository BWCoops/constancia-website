/**
 * About — declares its panels; framework renders them.
 *
 * No layout code here. <MarketingScrollyPage> + the <Scrolly*>
 * primitives in client/src/components/scrolly/ own all the visual
 * treatment. To restyle every marketing page, edit those — not
 * this file.
 */

import { useFeatureFlags } from "@/lib/feature-flags";
import { MarketingScrollyPage } from "@/components/scrolly/MarketingScrollyPage";
import {
  ScrollyHero,
  ScrollyText,
  ScrollyGrid,
  ScrollyPhoto,
  ScrollyCTA,
} from "@/components/scrolly/ScrollyPanels";

const SEO = {
  title: "About Constancia — Enterprise Intelligence Company",
  description:
    "Constancia is an enterprise intelligence company that helps leaders move from debate to outcomes. Real-time visibility across organisational data, delivered by senior practitioners. Official Abacum and OneStream partner.",
  keywords: [
    "about Constancia",
    "enterprise intelligence",
    "founders",
    "AI advisory",
    "EPM partner",
    "finance transformation team",
  ],
};

const FOUNDERS = [
  {
    eyebrow: "Founder, Constancia",
    title: "Bradley Cooper",
    body: "Twenty years inside enterprise finance transformation. Worked on the buy side and the consulting side, ran EPM and AI programmes at scale, started Constancia to do it without the agenda.",
  },
  {
    eyebrow: "Co-Founder",
    title: "Alex",
    body: "Operating model and value realisation specialist. Spent his career inside the consultancy model that overcharges finance leaders and walked out to build something better.",
  },
];

export default function AboutPage() {
  const { flags } = useFeatureFlags();

  return (
    <MarketingScrollyPage seo={SEO} label="About Constancia">
      <ScrollyHero
        eyebrow="About"
        heading="An enterprise intelligence company."
        body="We help leaders move from debate to outcomes. Real-time visibility across your data, without the manual rework."
      />

      <ScrollyText
        eyebrow="Our perspective"
        heading="From debate"
        headingAccent="to outcomes."
        body={[
          "Our focus is giving finance and operations teams real-time visibility across their data, without the manual rework in Excel and PowerPoint. We work with enterprise software and AI partners so you stay in the driver's seat of your company's health.",
        ]}
        sub="You're the expert on your business. Technology should work that way too."
      />

      <ScrollyGrid
        eyebrow="The founders"
        heading="The senior people you'd actually want in the room."
        items={FOUNDERS}
      />

      <ScrollyPhoto
        eyebrow="Off-duty"
        heading="Bradley, Alex, and the team mascots Georgie and Sammy."
        alt="Founders Bradley and Alex with Labrador Retrievers Georgie and Sammy"
        caption="Founders with Georgie and Sammy"
      />

      {flags.contact && (
        <ScrollyCTA
          eyebrow="No pitch. No deck."
          heading="When you're ready,"
          headingAccent="start the conversation."
          cta={{ label: "Talk to a partner", href: "/contact", testId: "button-about-cta" }}
        />
      )}
    </MarketingScrollyPage>
  );
}
