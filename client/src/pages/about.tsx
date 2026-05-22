import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";

/**
 * About — single cream canvas with glass-morphic tablets. No dark
 * banded sub-sections; every block flows through one continuous
 * surface to match the landing's visual language.
 */

interface Founder {
  name: string;
  role: string;
  bio: string;
  avatarInitials: string;
  accent: string;
}

const FOUNDERS: Founder[] = [
  {
    name: "Bradley Cooper",
    role: "Founder, Constancia",
    bio: "Twenty years inside enterprise finance transformation. Worked on the buy side and the consulting side, ran EPM and AI programmes at scale, started Constancia to do it without the agenda.",
    avatarInitials: "BC",
    accent: "#8E4F67",
  },
  {
    name: "Alex",
    role: "Co-Founder",
    bio: "Operating model and value realisation specialist. Spent his career inside the consultancy model that overcharges finance leaders and walked out to build something better.",
    avatarInitials: "AL",
    accent: "#5E8D7A",
  },
];

export default function AboutPage() {
  const { flags } = useFeatureFlags();

  return (
    <div className="marketing-page">
      <SEOHead
        title="About Constancia — Enterprise Intelligence Company"
        description="Constancia is an enterprise intelligence company that helps leaders move from debate to outcomes. Real-time visibility across organisational data, delivered by senior practitioners. Official Abacum and OneStream partner."
        keywords={[
          "about Constancia",
          "enterprise intelligence",
          "founders",
          "AI advisory",
          "EPM partner",
          "finance transformation team",
        ]}
      />

      <main>
        <PageHero
          badge="About"
          title="An enterprise intelligence company."
          description="We help leaders move from debate to outcomes. Real-time visibility across your data, without the manual rework."
        />

        <div className="marketing-stack">
          {/* Approved Constancia overview — the lead copy per the brief. */}
          <article className="glass-surface marketing-card">
            <div className="marketing-card__eyebrow">Our perspective</div>
            <p className="marketing-card__lede">
              We're an enterprise intelligence company that helps leaders move from debate to outcomes.
            </p>
            <p className="marketing-card__body">
              Our focus is giving finance and operations teams real-time visibility across their data, without the manual rework in Excel and PowerPoint.
            </p>
            <p className="marketing-card__body">
              We work with enterprise software and AI partners so you stay in the driver's seat of your company's health.
            </p>
            <p className="marketing-card__body">
              You're the expert on your business. Technology should work that way too.
            </p>
          </article>

          {/* Founders block. */}
          <article className="glass-surface marketing-card marketing-card--wide">
            <div className="marketing-card__eyebrow">The founders</div>
            <h2 className="marketing-card__heading">
              The senior people you'd actually want in the room.
            </h2>
            <div className="marketing-founders">
              {FOUNDERS.map((f) => (
                <article key={f.name} className="marketing-founder">
                  <div
                    className="marketing-founder__avatar"
                    style={{ background: f.accent }}
                    aria-hidden="true"
                  >
                    {f.avatarInitials}
                  </div>
                  <h3 className="marketing-founder__name">{f.name}</h3>
                  <div className="marketing-founder__role">{f.role}</div>
                  <p className="marketing-founder__bio">{f.bio}</p>
                </article>
              ))}
            </div>
          </article>

          {/* Off-duty photo placeholder. */}
          <article className="glass-surface marketing-card marketing-card--wide">
            <div className="marketing-card__eyebrow">Off-duty</div>
            <h2 className="marketing-card__heading">
              Bradley, Alex, and the team mascots Georgie and Sammy.
            </h2>
            <div
              className="marketing-photo"
              role="img"
              aria-label="Placeholder: founders Bradley and Alex with Labrador Retrievers Georgie and Sammy"
            >
              <div className="marketing-photo__caption">
                <div className="marketing-photo__caption-eye">Image placeholder</div>
                <div>Founders with Georgie and Sammy</div>
              </div>
            </div>
          </article>

          {/* Closing CTA — last tablet. */}
          {flags.contact && (
            <article className="glass-surface marketing-card">
              <div className="marketing-card__eyebrow">No pitch. No deck.</div>
              <h2 className="marketing-card__heading">
                When you're ready,{" "}
                <em className="marketing-card__heading-accent">start the conversation.</em>
              </h2>
              <Link
                href="/contact"
                className="marketing-card__cta"
                data-testid="button-about-cta"
              >
                <span>Talk to a partner</span>
                <ArrowRight className="marketing-card__cta-icon" />
              </Link>
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
