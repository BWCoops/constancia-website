/**
 * ScrollyPanels — primitive panel components for the marketing
 * scrollytelling pages.
 *
 * Every marketing sub-page is composed from these five panels +
 * <MarketingScrollyPage>. Page code declares the data; these
 * components render the glass tablet. Update the visual in ONE
 * place (here / index.css) and it propagates to every page.
 *
 * Primitives:
 *   <ScrollyHero>     wordmark + intro tablet (compact wordmark)
 *   <ScrollyText>     eyebrow + heading + body paragraphs + sub
 *   <ScrollyGrid>     eyebrow + heading + a grid of {title, body}
 *   <ScrollyPhoto>    eyebrow + heading + a 16:9 image / placeholder
 *   <ScrollyCTA>      eyebrow + heading + a single primary link
 *   <ScrollyCustom>   eyebrow + heading + arbitrary children
 *                     (escape hatch for one-off content)
 *
 * All panels accept an optional `wide` prop that switches the tablet
 * to the wider max-width (use for grids / multi-column content).
 */

import { Link } from "wouter";
import type { ReactNode } from "react";
import { WordmarkIntro } from "../WordmarkIntro";

interface HeadingProps {
  eyebrow?: string;
  heading?: ReactNode;
  /** Mixes in a Berry-tinted accent inside the heading. */
  headingAccent?: string;
}

function HeadingBlock({ eyebrow, heading, headingAccent, asH1 = false }: HeadingProps & { asH1?: boolean }) {
  const H = asH1 ? "h1" : "h2";
  return (
    <>
      {eyebrow && <div className="scrolly-tablet__eyebrow">{eyebrow}</div>}
      {heading && (
        <H className="scrolly-tablet__heading">
          {heading}
          {headingAccent && (
            <>
              {" "}
              <em className="scrolly-tablet__heading-accent">{headingAccent}</em>
            </>
          )}
        </H>
      )}
    </>
  );
}

// — Hero: wordmark + intro tablet ────────────────────────────────────
export interface ScrollyHeroProps extends HeadingProps {
  body?: string;
}
export function ScrollyHero({ eyebrow, heading, headingAccent, body }: ScrollyHeroProps) {
  return (
    <div className="scrolly-panel--stacked">
      <WordmarkIntro className="landing-hero__wordmark landing-hero__wordmark--compact" />
      <div className="glass-surface scrolly-tablet">
        <HeadingBlock eyebrow={eyebrow} heading={heading} headingAccent={headingAccent} asH1 />
        {body && <p className="scrolly-tablet__body">{body}</p>}
      </div>
    </div>
  );
}

// — Text: eyebrow + heading + bodies ─────────────────────────────────
export interface ScrollyTextProps extends HeadingProps {
  /** Single string or array of paragraphs. */
  body?: string | string[];
  sub?: string;
  wide?: boolean;
}
export function ScrollyText({ eyebrow, heading, headingAccent, body, sub, wide }: ScrollyTextProps) {
  const bodies = body == null ? [] : Array.isArray(body) ? body : [body];
  return (
    <div className={`glass-surface scrolly-tablet ${wide ? "scrolly-tablet--wide" : ""}`}>
      <HeadingBlock eyebrow={eyebrow} heading={heading} headingAccent={headingAccent} />
      {sub && <p className="scrolly-tablet__sub">{sub}</p>}
      {bodies.map((b, i) => (
        <p key={i} className="scrolly-tablet__body">{b}</p>
      ))}
    </div>
  );
}

// — Grid: eyebrow + heading + grid of items ──────────────────────────
export interface ScrollyGridItem {
  eyebrow?: string;
  title: string;
  body: string;
}
export interface ScrollyGridProps extends HeadingProps {
  items: ScrollyGridItem[];
  wide?: boolean;
}
export function ScrollyGrid({ eyebrow, heading, headingAccent, items, wide = true }: ScrollyGridProps) {
  return (
    <div className={`glass-surface scrolly-tablet ${wide ? "scrolly-tablet--wide" : ""}`}>
      <HeadingBlock eyebrow={eyebrow} heading={heading} headingAccent={headingAccent} />
      <div className="scrolly-services">
        {items.map((item) => (
          <article key={item.title} className="scrolly-services__item">
            {item.eyebrow && <div className="scrolly-services__eyebrow">{item.eyebrow}</div>}
            <h3 className="scrolly-services__title">{item.title}</h3>
            <p className="scrolly-services__body">{item.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

// — Photo: eyebrow + heading + 16:9 image / placeholder ──────────────
export interface ScrollyPhotoProps extends HeadingProps {
  /** When omitted, a soft brand-tinted placeholder renders instead. */
  src?: string;
  alt: string;
  caption?: string;
  placeholder?: ReactNode;
  wide?: boolean;
}
export function ScrollyPhoto({ eyebrow, heading, headingAccent, src, alt, caption, placeholder, wide = true }: ScrollyPhotoProps) {
  return (
    <div className={`glass-surface scrolly-tablet ${wide ? "scrolly-tablet--wide" : ""}`}>
      <HeadingBlock eyebrow={eyebrow} heading={heading} headingAccent={headingAccent} />
      {src ? (
        <img src={src} alt={alt} className="marketing-photo marketing-photo--img" />
      ) : (
        <div className="marketing-photo" role="img" aria-label={alt}>
          <div className="marketing-photo__caption">
            <div className="marketing-photo__caption-eye">Image placeholder</div>
            <div>{placeholder ?? caption ?? alt}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// — CTA: eyebrow + heading + primary link ────────────────────────────
export interface ScrollyCTAProps extends HeadingProps {
  body?: string;
  cta: { label: string; href: string; testId?: string };
}
export function ScrollyCTA({ eyebrow, heading, headingAccent, body, cta }: ScrollyCTAProps) {
  return (
    <div className="glass-surface scrolly-tablet">
      <HeadingBlock eyebrow={eyebrow} heading={heading} headingAccent={headingAccent} />
      {body && <p className="scrolly-tablet__body">{body}</p>}
      <Link
        href={cta.href}
        className="scrolly-tablet__link scrolly-tablet__link--strong"
        data-testid={cta.testId}
      >
        {cta.label} →
      </Link>
    </div>
  );
}

// — Custom: escape hatch for one-off panels ──────────────────────────
export interface ScrollyCustomProps extends HeadingProps {
  children: ReactNode;
  wide?: boolean;
}
export function ScrollyCustom({ eyebrow, heading, headingAccent, children, wide }: ScrollyCustomProps) {
  return (
    <div className={`glass-surface scrolly-tablet ${wide ? "scrolly-tablet--wide" : ""}`}>
      <HeadingBlock eyebrow={eyebrow} heading={heading} headingAccent={headingAccent} />
      {children}
    </div>
  );
}
