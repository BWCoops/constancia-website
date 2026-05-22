import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PageHero } from "@/components/page-hero";

/**
 * About — May 2026 editorial refresh.
 *
 * Leads with the approved Constancia overview copy, followed by a
 * short founders block and a closing image of Bradley, Alex and
 * the dogs. No Liquid Glass on this page per the brief; the design
 * stays clean and editorial. Placeholder portraits and dog photo
 * until supplied.
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


      <main className="pt-16 sm:pt-20">
        <PageHero
          badge="About"
          title="An enterprise intelligence company."
          description="We help leaders move from debate to outcomes. Real-time visibility across your data, without the manual rework."
        />

        {/* Approved Constancia overview — the lead copy per the brief.
            Editorial composition, no glass, no card chrome. */}
        <section className="py-16 sm:py-24 lg:py-28 bg-[#F6F3EE]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#8E4F67] mb-6">
              Our perspective
            </div>
            <p className="text-xl sm:text-2xl font-light leading-relaxed text-[#252826] mb-6">
              We're an enterprise intelligence company that helps leaders move from debate to outcomes.
            </p>
            <p className="text-base sm:text-lg text-[#252826]/85 leading-relaxed mb-5">
              Our focus is giving finance and operations teams real-time visibility across their data, without the manual rework in Excel and PowerPoint.
            </p>
            <p className="text-base sm:text-lg text-[#252826]/85 leading-relaxed mb-5">
              We work with enterprise software and AI partners so you stay in the driver's seat of your company's health.
            </p>
            <p className="text-base sm:text-lg text-[#252826]/85 leading-relaxed">
              You're the expert on your business. Technology should work that way too.
            </p>
          </div>
        </section>

        {/* Founders block. Placeholder portraits (initials-on-tint)
            until the real images come in. */}
        <section className="py-16 sm:py-24 bg-[#0a0d14] text-[#F6F3EE]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#7FB8A3] mb-6 text-center">
              The founders
            </div>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight text-center mb-14 max-w-2xl mx-auto">
              The senior people you'd actually want in the room.
            </h2>

            <div className="grid sm:grid-cols-2 gap-10 lg:gap-16">
              {FOUNDERS.map((f) => (
                <article key={f.name} className="flex flex-col items-center text-center sm:text-left sm:items-start">
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center text-3xl font-light mb-6"
                    style={{ background: f.accent, color: "#F6F3EE" }}
                    aria-hidden="true"
                  >
                    {f.avatarInitials}
                  </div>
                  <h3 className="text-xl font-medium mb-1">{f.name}</h3>
                  <div className="text-sm font-mono uppercase tracking-widest text-[#F6F3EE]/55 mb-4">
                    {f.role}
                  </div>
                  <p className="text-[15px] leading-relaxed text-[#F6F3EE]/80">{f.bio}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Closing photo: Bradley + Alex with Georgie and Sammy.
            Placeholder until the photo is supplied. */}
        <section className="py-16 sm:py-24 bg-[#F6F3EE]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#8E4F67] mb-6 text-center">
              Off-duty
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-center text-[#252826] mb-10 max-w-xl mx-auto">
              Bradley, Alex, and the team mascots Georgie and Sammy.
            </h2>
            <div
              className="aspect-[16/9] w-full rounded-2xl bg-[#252826] text-[#F6F3EE]/40 flex items-center justify-center text-sm"
              role="img"
              aria-label="Placeholder: founders Bradley and Alex with Labrador Retrievers Georgie and Sammy"
            >
              <div className="text-center">
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2">Image placeholder</div>
                <div>Founders with Georgie and Sammy</div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA. */}
        <section className="py-12 sm:py-20 lg:py-28 lg:pb-36 bg-[#F6F3EE]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-end border-t border-[#252826]/15 pt-12">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#8E4F67] mb-4">
                  No pitch. No deck.
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight text-[#252826] max-w-2xl">
                  When you're ready,<br />
                  start the <em className="text-[#8E4F67] not-italic font-normal">conversation.</em>
                </h2>
              </div>
              {flags.contact && (
                <Link
                  href="/contact"
                  className="group inline-flex items-baseline gap-3 text-[#252826] hover:text-[#8E4F67] transition-colors"
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
