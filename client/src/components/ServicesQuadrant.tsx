/**
 * ServicesQuadrant — cream editorial services band on the landing page.
 *
 * Four services laid out as a 2×2 typographic grid (single column on
 * mobile). No card chrome, no Liquid Glass refraction — just numbered
 * eyebrows, declarative headings, body copy, and hairline dividers on
 * the cream page surface. With LiquidGlassCard chrome removed, only
 * the hero mission card remains as a Liquid Glass instance on this
 * page (1/5 of the brief's hard cap).
 */

const SERVICES = [
  {
    eyebrow: "Service 01",
    title: "AI Advisory & Roadmapping",
    body: "Education, benchmarking, use case development, P&L and ROI modelling.",
  },
  {
    eyebrow: "Service 02",
    title: "Enterprise Performance Management",
    body: "Management reporting, statutory consolidation, financial planning and analysis, narrative reporting. Advisors and implementation experts.",
  },
  {
    eyebrow: "Service 03",
    title: "Software & AI Development",
    body: "Edge-case AI use case development, model build, custom application development.",
  },
  {
    eyebrow: "Service 04",
    title: "Business Transformation Advisory",
    body: "Operating model design, M&A integration, value realisation.",
  },
];

export function ServicesQuadrant() {
  return (
    <section id="services" className="services-quadrant" aria-label="Services">
      <div className="services-quadrant__inner">
        <div className="services-quadrant__grid">
          {SERVICES.map(({ eyebrow, title, body }) => (
            <article key={title} className="services-quadrant__item">
              <div className="services-quadrant__item-eyebrow">{eyebrow}</div>
              <h3 className="services-quadrant__item-title">{title}</h3>
              <p className="services-quadrant__item-body">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
