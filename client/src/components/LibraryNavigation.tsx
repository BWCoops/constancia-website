/**
 * LibraryNavigation — drawer-style top nav that "opens up".
 *
 * Replaces the horizontal tabbed nav on landing pages per the May
 * 2026 brief. A small top bar shows just the wordmark and a single
 * "Menu" trigger; clicking opens a full-height drawer from the
 * right containing every nav item as a labelled entry with a
 * numbered eyebrow, a bold heading, and a short description.
 *
 * Behaviour:
 *   - Trigger button (top-right) toggles the drawer.
 *   - Clicking any item navigates + closes.
 *   - ESC closes.
 *   - Backdrop click closes.
 *   - Drawer scrolls if content overflows on short viewports.
 *   - Honours the existing feature-flag system; flagged-off pages
 *     simply don't appear in the drawer.
 *   - Accessible: aria-expanded on the trigger, focus management
 *     when the drawer opens, ESC handler, role="dialog" on the
 *     drawer panel.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import constanciaLogo from "@assets/constancia-logo.png";
import constanciaLogoDark from "@assets/constancia-logo-dark.png";
import { Menu, X } from "lucide-react";
import type { FeatureFlags } from "@shared/feature-flags";

interface LibraryItem {
  href: string;
  num: string;
  label: string;
  description: string;
  featureKey: keyof FeatureFlags | null;
}

const LIBRARY: LibraryItem[] = [
  { href: "/",         num: "00", label: "Home",          description: "Connected enterprise intelligence.", featureKey: null },
  { href: "/about",    num: "01", label: "About",         description: "An enterprise intelligence company.", featureKey: "about" },
  { href: "/services", num: "02", label: "Services",      description: "Abacum. OneStream. AI development partner.", featureKey: "services" },
  { href: "/solutions", num: "03", label: "Solutions",     description: "Productised intelligence for finance and operations.", featureKey: "solutions" },
  { href: "/tools/epm-comparison", num: "04", label: "Tools", description: "Comparison engines, FinanceCompass, vendor directory.", featureKey: "comparisonTools" },
  { href: "/blog",     num: "05", label: "Day to Day AI", description: "Practical notes on running AI inside finance.", featureKey: "blog" },
  { href: "/files",    num: "06", label: "Toolkit",       description: "Frameworks and templates from real programmes.", featureKey: "resources" },
  { href: "/contact",  num: "07", label: "Contact",       description: "Tell us about your data challenge.", featureKey: "contact" },
];

interface LibraryNavigationProps {
  /** "light" puts a dark wordmark + dark trigger on cream surfaces;
   *  "dark" puts a cream wordmark + cream trigger on dark surfaces. */
  variant?: "light" | "dark";
}

export function LibraryNavigation({ variant = "light" }: LibraryNavigationProps) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { flags } = useFeatureFlags();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  // Lock body scroll while the drawer is open and restore on close.
  // Esc handler closes the drawer.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Move focus into the drawer when it opens; return it to the
  // trigger when it CLOSES (not on initial mount — focusing a fixed
  // top-of-page element on mount caused Chrome to scroll to top even
  // with preventScroll: true).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && drawerRef.current) {
      const first = drawerRef.current.querySelector<HTMLElement>("a, button");
      first?.focus();
    } else if (!open && wasOpenRef.current && triggerRef.current) {
      triggerRef.current.focus({ preventScroll: true });
    }
    wasOpenRef.current = open;
  }, [open]);

  const handleItemClick = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const items = LIBRARY.filter(i => i.featureKey === null || flags[i.featureKey]);
  const wordmark = variant === "dark" ? constanciaLogoDark : constanciaLogo;
  const triggerColor = variant === "dark" ? "#F6F3EE" : "#12161D";

  return (
    <>
      {/* Top bar — minimal: wordmark + Menu trigger. */}
      <header className={`library-nav-bar library-nav-bar--${variant}`}>
        <Link href="/" className="library-nav-bar__brand" aria-label="Constancia home">
          <img src={wordmark} alt="Constancia" />
        </Link>
        <button
          ref={triggerRef}
          type="button"
          className="library-nav-bar__trigger"
          aria-expanded={open}
          aria-controls="library-nav-drawer"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(o => !o)}
          style={{ color: triggerColor }}
          data-testid="library-nav-trigger"
        >
          <span className="library-nav-bar__trigger-label">Menu</span>
          <Menu size={20} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </header>

      {/* Drawer + backdrop. Rendered always so the slide-in/out
          transitions can run on toggle. */}
      <div
        className={`library-nav-backdrop ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        id="library-nav-drawer"
        className={`library-nav-drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <div className="library-nav-drawer__header">
          <span className="library-nav-drawer__eyebrow">Constancia · Library</span>
          <button
            type="button"
            className="library-nav-drawer__close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        <nav className="library-nav-drawer__nav" aria-label="Main">
          <ol>
            {items.map(item => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={e => {
                    e.preventDefault();
                    handleItemClick(item.href);
                  }}
                >
                  <span className="library-nav-drawer__num">{item.num}</span>
                  <span className="library-nav-drawer__label">{item.label}</span>
                  <span className="library-nav-drawer__desc">{item.description}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </>
  );
}
