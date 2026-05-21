/**
 * ServicesQuadrant — four-card services band on the landing page.
 *
 * 2×2 desktop grid, stacked on mobile. Each card uses
 * LiquidGlassCard variant="default". With the hero's hero-variant
 * card, this totals 5 Liquid Glass instances on the landing page —
 * the brief's hard cap. Any further glass surfaces on this page
 * MUST use the cheaper backdrop-blur fallback.
 *
 * Icons via Lucide. Defaults: Sparkles / BarChart3 / Code2 /
 * GitMerge. Each is marked aria-hidden because the card heading
 * carries the meaning.
 */

import { Sparkles, BarChart3, Code2, GitMerge } from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/LiquidGlassCard";
import { MeshBackground } from "./MeshBackground";
import type { LucideIcon } from "lucide-react";

interface ServiceCardData {
  icon: LucideIcon;
  title: string;
  body: string;
}

const CARDS: ServiceCardData[] = [
  {
    icon: Sparkles,
    title: "AI Advisory & Roadmapping",
    body: "Education, benchmarking, use case development, P&L and ROI modelling.",
  },
  {
    icon: BarChart3,
    title: "Enterprise Performance Management — Advisors & Implementation Experts",
    body: "Management reporting, statutory consolidation, financial planning and analysis, narrative reporting.",
  },
  {
    icon: Code2,
    title: "Software & AI Development",
    body: "Edge-case AI use case development, model build, custom application development.",
  },
  {
    icon: GitMerge,
    title: "Business Transformation Advisory",
    body: "Operating model design, M&A integration, value realisation.",
  },
];

export function ServicesQuadrant() {
  return (
    <section id="services" className="services-quadrant" aria-labelledby="services-quadrant-heading">
      <MeshBackground className="services-quadrant__mesh" />
      <div className="services-quadrant__inner">
        <header className="services-quadrant__header">
          <div className="services-quadrant__eyebrow">Constancia Services</div>
          <h2 id="services-quadrant-heading" className="services-quadrant__heading">
            What we do, end to end.
          </h2>
        </header>

        <div className="services-quadrant__grid">
          {CARDS.map(({ icon: Icon, title, body }) => (
            <LiquidGlassCard key={title} variant="default" cornerRadius={20}>
              <div className="services-quadrant__card-body">
                <div className="services-quadrant__card-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.6} />
                </div>
                <h3 className="services-quadrant__card-title">{title}</h3>
                <p>{body}</p>
              </div>
            </LiquidGlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
