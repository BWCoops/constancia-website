/**
 * LibraryNavigation — drawer-style top nav that "opens up".
 *
 * Replaces the horizontal tabbed nav on landing pages per the May
 * 2026 brief. A small top bar shows just the wordmark and a single
 * "Menu" trigger; clicking opens a full-height drawer from the
 * right containing every nav item as a labelled entry with a
 * numbered eyebrow, a bold heading, and a short description.
 *
 * Items can have children — rendered as an expandable subsection
 * the user toggles open with chevron + aria-expanded. Used to group
 * the three tool destinations (Comparison Tool, Finance Compass,
 * Vendor Directory) under one "Tools" parent so the top level stays
 * readable.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import { Menu, X, ChevronDown } from "lucide-react";
import type { FeatureFlags } from "@shared/feature-flags";
import { HeroFabricCanvas } from "./HeroFabricCanvas";

interface LibraryItem {
  href?: string;
  num: string;
  label: string;
  description: string;
  featureKey: keyof FeatureFlags | null;
  children?: LibraryItem[];
}

const LIBRARY: LibraryItem[] = [
  { href: "/",          num: "00", label: "Home",          description: "Connected enterprise intelligence.",                          featureKey: null },
  { href: "/about",     num: "01", label: "About",         description: "An enterprise intelligence company.",                          featureKey: "about" },
  { href: "/services",  num: "02", label: "Services",      description: "Abacum. OneStream. AI development partner.",                  featureKey: "services" },
  { href: "/solutions", num: "03", label: "Solutions",     description: "Productised intelligence for finance and operations.",         featureKey: "solutions" },
  {
    num: "04",
    label: "Tools",
    description: "Comparison engines, Finance Compass, vendor profiles.",
    featureKey: "comparisonTools",
    children: [
      { href: "/tools/epm-comparison", num: "01", label: "Comparison Tool",  description: "Independent platform benchmarks across EPM and AI vendors.", featureKey: "comparisonTools" },
      { href: "/finance-compass",      num: "02", label: "Finance Compass",  description: "Diagnostic for finance maturity and EPM readiness.",         featureKey: "financeCompass" },
      { href: "/vendors",              num: "03", label: "Vendor Directory", description: "Curated reference of the platforms we evaluate.",            featureKey: "comparisonTools" },
    ],
  },
  { href: "/blog",      num: "05", label: "Day to Day AI", description: "Practical notes on running AI inside finance.",                featureKey: "blog" },
  { href: "/files",     num: "06", label: "Toolkit",       description: "Frameworks and templates from real programmes.",               featureKey: "resources" },
  { href: "/contact",   num: "07", label: "Contact",       description: "Tell us about your data challenge.",                           featureKey: "contact" },
];

interface LibraryNavigationProps {
  variant?: "light" | "dark";
}

export function LibraryNavigation({ variant = "light" }: LibraryNavigationProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();
  const { flags } = useFeatureFlags();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

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

  const toggleExpanded = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visible = (item: LibraryItem): boolean =>
    item.featureKey === null || !!flags[item.featureKey];

  const items = LIBRARY.filter(visible).map(item => ({
    ...item,
    children: item.children?.filter(visible),
  })).filter(item => item.href || (item.children && item.children.length > 0));

  const triggerColor = variant === "dark" ? "#F6F3EE" : "#252826";

  return (
    <>
      <header className={`library-nav-bar library-nav-bar--${variant}`}>
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

      <div
        className={`library-nav-backdrop ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      >
        {/* Fabric shader inside the backdrop — mounted only when the
            menu is open so we don't pay the GPU cost the rest of the
            time. The fabric's own caustic + shimmer + breathing
            animations are the visual on the LEFT side; no separate
            stamp on top (the page's wordmark shows through
            naturally where it already sits). */}
        {open && (
          <HeroFabricCanvas className="library-nav-backdrop__fabric" />
        )}
      </div>
      <aside
        ref={drawerRef}
        id="library-nav-drawer"
        className={`library-nav-drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <div className="library-nav-drawer__header">
          <span className="library-nav-drawer__eyebrow">Library</span>
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
            {items.map(item => {
              const isExpandable = !!item.children?.length;
              const isOpen = expanded.has(item.label);

              if (isExpandable) {
                const subId = `library-nav-sub-${item.num}`;
                return (
                  <li key={item.label} className="library-nav-drawer__group">
                    <button
                      type="button"
                      className={`library-nav-drawer__parent ${isOpen ? "is-open" : ""}`}
                      aria-expanded={isOpen}
                      aria-controls={subId}
                      onClick={() => toggleExpanded(item.label)}
                    >
                      <span className="library-nav-drawer__num">{item.num}</span>
                      <span className="library-nav-drawer__label">{item.label}</span>
                      <span className="library-nav-drawer__desc">{item.description}</span>
                      <ChevronDown
                        size={18}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="library-nav-drawer__chevron"
                      />
                    </button>
                    <ol
                      id={subId}
                      className={`library-nav-drawer__sub ${isOpen ? "is-open" : ""}`}
                    >
                      {item.children!.map(child => (
                        <li key={child.href}>
                          <a
                            href={child.href}
                            onClick={e => {
                              e.preventDefault();
                              if (child.href) handleItemClick(child.href);
                            }}
                          >
                            <span className="library-nav-drawer__num">{child.num}</span>
                            <span className="library-nav-drawer__label">{child.label}</span>
                            <span className="library-nav-drawer__desc">{child.description}</span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={e => {
                      e.preventDefault();
                      if (item.href) handleItemClick(item.href);
                    }}
                  >
                    <span className="library-nav-drawer__num">{item.num}</span>
                    <span className="library-nav-drawer__label">{item.label}</span>
                    <span className="library-nav-drawer__desc">{item.description}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>
    </>
  );
}
