import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "@/lib/icons";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { preloadRoute } from "@/lib/preload";
import { useFeatureFlags } from "@/lib/feature-flags";
import type { FeatureFlags } from "@shared/feature-flags";
import { ConstanciaMark } from "@/components/ui/constancia-mark";

interface NavLink {
  href: string;
  label: string;
  featureKey: keyof FeatureFlags;
}

interface NavDropdown {
  label: string;
  featureKey: keyof FeatureFlags;
  children: NavLink[];
}

type NavItem = NavLink | NavDropdown;

function isDropdown(item: NavItem): item is NavDropdown {
  return "children" in item;
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", featureKey: "home" },
  { href: "/about", label: "About", featureKey: "about" },
  { href: "/services", label: "Services", featureKey: "services" },
  { href: "/solutions", label: "Solutions", featureKey: "solutions" },
  {
    label: "Tools",
    featureKey: "comparisonTools",
    children: [
      { href: "/tools/epm-comparison", label: "Comparison Tools", featureKey: "comparisonTools" },
      { href: "/vendors", label: "Vendor Profiles", featureKey: "comparisonTools" },
      { href: "/finance-compass", label: "FinanceCompass", featureKey: "financeCompass" },
    ],
  },
  { href: "/blog", label: "Insights Hub", featureKey: "blog" },
  { href: "/files", label: "Resources", featureKey: "resources" },
  { href: "/contact", label: "Contact", featureKey: "contact" },
];

function NavDropdownMenu({ item, location }: { item: NavDropdown; location: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { flags } = useFeatureFlags();

  const enabledChildren = item.children.filter((c) => flags[c.featureKey]);
  const isChildActive = enabledChildren.some((c) => location === c.href || location.startsWith(c.href + "/"));

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  if (enabledChildren.length === 0) return null;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex items-center gap-1 px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
          isChildActive ? "text-brand-teal font-semibold" : "text-[#F6F3EE]/60 font-medium hover:text-brand-teal"
        }`}
        data-testid="button-nav-tools-dropdown"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span>{item.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute top-full left-0 mt-1 w-52 rounded-lg border border-white/[0.08] bg-[#12161D]/95 backdrop-blur-md shadow-lg py-1 z-50 transition-all duration-150 origin-top ${
          open
            ? "opacity-100 scale-y-100 pointer-events-auto"
            : "opacity-0 scale-y-95 pointer-events-none"
        }`}
        data-testid="container-nav-dropdown"
      >
        {enabledChildren.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            onMouseEnter={() => preloadRoute(child.href)}
            onClick={() => setOpen(false)}
            className={`block px-4 py-2.5 text-sm transition-colors ${
              location === child.href || location.startsWith(child.href + "/")
                ? "text-brand-teal bg-white/[0.06]"
                : "text-[#F6F3EE]/60 hover:text-brand-teal hover:bg-white/[0.04]"
            }`}
            data-testid={`link-nav-dropdown-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [location] = useLocation();
  const { flags } = useFeatureFlags();

  const enabledItems = navItems.filter((item) => flags[item.featureKey]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[#12161D]/95 backdrop-blur-md border-b border-white/[0.05]"
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4"
        role="navigation"
        aria-label="Main navigation"
      >
        <Link href="/" className="flex items-center gap-3 group" data-testid="link-logo">
          <ConstanciaMark
            size={42}
            aria-label="Constancia"
            className="transition-transform duration-300 group-hover:scale-110"
          />
          <span
            className="hidden sm:inline-block text-[#F6F3EE] font-semibold tracking-tight"
            style={{
              fontFamily: 'var(--brand-font-sans)',
              fontSize: '20px',
              letterSpacing: '-0.01em',
              fontWeight: 600,
            }}
          >
            constancia<span style={{ color: 'var(--brand-mineral-green)' }}>.</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {enabledItems.map((item) => {
            if (isDropdown(item)) {
              return <NavDropdownMenu key={item.label} item={item} location={location} />;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => preloadRoute(item.href)}
                className={`relative px-4 py-2 text-sm rounded-lg transition-colors duration-200 group ${
                  location === item.href
                    ? "text-brand-teal font-semibold"
                    : "text-[#F6F3EE]/60 font-medium hover:text-brand-teal"
                }`}
                data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="relative z-10">{item.label}</span>
                <span className="nav-link-glow absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="nav-link-underline absolute bottom-0 left-1/2 h-[2px] w-0 group-hover:w-4/5 rounded-full transition-all duration-300 -translate-x-1/2" />
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-brand-cream" />
            ) : (
              <Menu className="h-5 w-5 text-brand-cream" />
            )}
          </Button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#12161D]/95 backdrop-blur-md border-b border-white/[0.05] nav-slide-down">
          <div className="px-6 py-4 space-y-1">
            {enabledItems.map((item) => {
              if (isDropdown(item)) {
                const enabledChildren = item.children.filter((c) => flags[c.featureKey]);
                if (enabledChildren.length === 0) return null;
                const isExpanded = mobileExpanded === item.label;

                return (
                  <div key={item.label}>
                    <button
                      onClick={() => setMobileExpanded(isExpanded ? null : item.label)}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-left text-[#F6F3EE]/60 hover:text-brand-teal hover:bg-white/[0.04] transition-colors"
                      data-testid="button-mobile-tools-dropdown"
                    >
                      <span>{item.label}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="pl-4 space-y-1 pb-1">
                        {enabledChildren.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => { setIsMobileMenuOpen(false); setMobileExpanded(null); }}
                            onMouseEnter={() => preloadRoute(child.href)}
                            className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                              location === child.href
                                ? "bg-white/[0.06] text-brand-teal"
                                : "text-[#F6F3EE]/60 hover:text-brand-teal hover:bg-white/[0.04]"
                            }`}
                            data-testid={`link-mobile-nav-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  onMouseEnter={() => preloadRoute(item.href)}
                  className={`block w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    location === item.href
                      ? "bg-white/[0.06] text-brand-teal"
                      : "text-[#F6F3EE]/60 hover:text-brand-teal hover:bg-white/[0.04]"
                  }`}
                  data-testid={`link-mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
