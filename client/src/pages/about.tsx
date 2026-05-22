import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { ScrollyStage } from "@/components/ScrollyStage";
import { WordmarkIntro } from "@/components/WordmarkIntro";

/**
 * About — uses the shared ScrollyStage so the page reads with the
 * same fabric backdrop, shimmer, and glass tablets as the landing.
 * Every direct child of <ScrollyStage> is one scroll panel.
 *
 * Wordmark is the compact variant — about 60 % of the landing size
 * so the brand mark introduces the page without dominating it.
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
        <ScrollyStage heightVh={520} heightVhMobile={500} label="About Constancia">
          {/* Panel 1 — Wordmark + page intro tablet (compact) */}
          <div className="scrolly-panel--stacked">
            <WordmarkIntro className="landing-hero__wordmark landing-hero__wordmark--compact" />
            <div className="glass-surface scrolly-tablet">
              <div className="scrolly-tablet__eyebrow">About</div>
              <h1 className="scrolly-tablet__heading">An enterprise intelligence company.</h1>
              <p className="scrolly-tablet__body">
                We help leaders move from debate to outcomes. Real-time visibility across your data,
                without the manual rework.
              </p>
            </div>
          </div>

          {/* Panel 2 — Lead perspective */}
          <div className="glass-surface scrolly-tablet">
            <div className="scrolly-tablet__eyebrow">Our perspective</div>
            <h2 className="scrolly-tablet__heading">
              From debate{" "}
              <em className="scrolly-tablet__heading-accent">to outcomes</em>.
            </h2>
            <p className="scrolly-tablet__body">
              Our focus is giving finance and operations teams real-time visibility across their
              data, without the manual rework in Excel and PowerPoint. We work with enterprise
              software and AI partners so you stay in the driver's seat of your company's health.
            </p>
            <p className="scrolly-tablet__sub" style={{ marginTop: 12 }}>
              You're the expert on your business. Technology should work that way too.
            </p>
          </div>

          {/* Panel 3 — Founders */}
          <div className="glass-surface scrolly-tablet scrolly-tablet--wide">
            <div className="scrolly-tablet__eyebrow">The founders</div>
            <h2 className="scrolly-tablet__heading">
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
          </div>

          {/* Panel 4 — Off-duty photo placeholder */}
          <div className="glass-surface scrolly-tablet scrolly-tablet--wide">
            <div className="scrolly-tablet__eyebrow">Off-duty</div>
            <h2 className="scrolly-tablet__heading">
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
          </div>

          {/* Panel 5 — Closing CTA */}
          {flags.contact && (
            <div className="glass-surface scrolly-tablet">
              <div className="scrolly-tablet__eyebrow">No pitch. No deck.</div>
              <h2 className="scrolly-tablet__heading">
                When you're ready,{" "}
                <em className="scrolly-tablet__heading-accent">start the conversation.</em>
              </h2>
              <Link
                href="/contact"
                className="scrolly-tablet__link scrolly-tablet__link--strong"
                data-testid="button-about-cta"
              >
                Talk to a partner{" "}
                <ArrowRight style={{ width: 16, height: 16, display: "inline-block", verticalAlign: "middle" }} />
              </Link>
            </div>
          )}
        </ScrollyStage>
      </main>

      <Footer />
    </div>
  );
}
