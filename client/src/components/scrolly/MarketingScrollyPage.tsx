/**
 * MarketingScrollyPage — top-level wrapper used by every public
 * marketing sub-page (About / Services / Solutions / Day-to-Day AI /
 * Toolkit / Contact).
 *
 * Renders the cream marketing canvas, SEO head, the shared
 * <ScrollyStage>, and the Footer. Children are panel primitives
 * (<ScrollyHero>, <ScrollyText>, <ScrollyGrid>, <ScrollyPhoto>,
 * <ScrollyCTA>, <ScrollyCustom>) — one per stage panel.
 *
 * Every visual update lives in this wrapper or in
 * ScrollyPanels.tsx / index.css — page code only declares content.
 */

import type { ReactNode } from "react";
import { Footer } from "../footer";
import { SEOHead } from "../seo-head";
import { ScrollyStage, type PanelRange } from "../ScrollyStage";

interface SEO {
  title: string;
  description: string;
  keywords?: string[];
  includeOrganizationSchema?: boolean;
}

interface MarketingScrollyPageProps {
  seo: SEO;
  children: ReactNode;
  /** aria-label on the stage section. */
  label?: string;
  /** Override stage total height (vh). Default sizes to panel count. */
  heightVh?: number;
  /** Override per-panel ranges. Falls back to even distribution. */
  ranges?: PanelRange[];
}

export function MarketingScrollyPage({
  seo,
  children,
  label,
  heightVh,
  ranges,
}: MarketingScrollyPageProps) {
  return (
    <div className="marketing-page">
      <SEOHead {...seo} />
      <main>
        <ScrollyStage label={label} heightVh={heightVh} ranges={ranges}>
          {children}
        </ScrollyStage>
      </main>
      <Footer />
    </div>
  );
}
