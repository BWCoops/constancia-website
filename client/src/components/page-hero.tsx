import { memo } from "react";
import { MeshBackground } from "./MeshBackground";

/**
 * PageHero — shared hero for every public sub-page (About, Services,
 * Solutions, Day-to-Day AI, Toolkit, Contact).
 *
 * Matches the landing's visual language: cream surface, mesh ambient
 * underneath, glass-surface card carrying the badge / title /
 * description. The dark navy hero from the May 2026 cycle is gone —
 * every public marketing surface now reads as part of the same brand
 * world.
 *
 * Functional surfaces (Comparison Tool, Finance Compass, Vendor
 * Directory, admin) are explicitly excluded — they keep their own
 * data-led shells.
 */

interface PageHeroProps {
  badge: string;
  title: string;
  highlightedText?: string;
  subtitle?: string;
  description: string;
  children?: React.ReactNode;
}

const PageHeroComponent = ({
  badge,
  title,
  highlightedText,
  subtitle,
  description,
  children,
}: PageHeroProps) => {
  return (
    <section className="page-hero" aria-labelledby="page-hero-title">
      <MeshBackground className="page-hero__mesh" />

      <div className="page-hero__inner">
        <div className="glass-surface page-hero__card">
          <div className="page-hero__badge">
            <span className="page-hero__badge-dot" aria-hidden="true" />
            <span>{badge}</span>
          </div>

          <h1 id="page-hero-title" className="page-hero__title">
            {title}
            {highlightedText && (
              <>
                {" "}
                <span className="page-hero__title-accent">{highlightedText}</span>
              </>
            )}
          </h1>

          {subtitle && <p className="page-hero__subtitle">{subtitle}</p>}
          <p className="page-hero__description">{description}</p>

          {children && <div className="page-hero__actions">{children}</div>}
        </div>
      </div>
    </section>
  );
};

export const PageHero = memo(PageHeroComponent);
