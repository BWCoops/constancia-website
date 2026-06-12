import { Link } from "wouter";
import { Linkedin, Mail, MapPin } from "@/lib/icons";
import { useFeatureFlags } from "@/lib/feature-flags";
import type { FeatureFlags } from "@shared/feature-flags";

type FooterLink = {
  label: string;
  href: string;
  featureKey: keyof FeatureFlags | null;
  external?: boolean;
};

// Top slim row. Site + legal + ops links, all feature-gated so the
// holding-page state shows only what makes sense (Careers, Privacy,
// Terms, Cookies, Operations).
const SLIM_LINKS: FooterLink[] = [
  { label: "About", href: "/about", featureKey: "about" },
  { label: "Services", href: "/services", featureKey: "services" },
  { label: "Insights", href: "/blog", featureKey: "blog" },
  { label: "Resources", href: "/files", featureKey: "resources" },
  { label: "Contact", href: "/contact", featureKey: "contact" },
  { label: "Privacy", href: "/privacy", featureKey: null },
  { label: "Terms", href: "/terms", featureKey: null },
  { label: "Cookies", href: "/cookies", featureKey: null },
  { label: "Operations", href: "/admin/login", featureKey: null },
];

interface FooterProps {
  /**
   * Hide the info@constancia.io entry from the bottom row. Used on
   * the launch holding page where the Notify-me form is the primary
   * email path and a contact email link is redundant.
   */
  hideContactEmail?: boolean;
}

export function Footer({ hideContactEmail = false }: FooterProps) {
  const { flags } = useFeatureFlags();
  const year = new Date().getFullYear();

  const visibleLinks = SLIM_LINKS.filter(
    (link) => link.featureKey === null || flags[link.featureKey],
  );

  return (
    <footer
      className="bg-brand-navy text-brand-cream relative overflow-hidden"
      style={{ fontFamily: "var(--hp-font-sans)", paddingTop: 28, paddingBottom: 22 }}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Top slim row — site + legal + operations links. */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] uppercase tracking-[0.14em] text-[#F6F3EE]/65 mb-4">
          {visibleLinks.map((link, idx) => (
            <span key={link.href} className="inline-flex items-center gap-4">
              <Link
                href={link.href}
                className="hover:text-brand-cyan transition-colors"
                data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {link.label}
              </Link>
              {idx < visibleLinks.length - 1 && (
                <span className="opacity-25" aria-hidden="true">·</span>
              )}
            </span>
          ))}
        </div>

        {/* Bottom slim row — copyright + LinkedIn + (info@) + address. */}
        <div className="pt-4 border-t border-[#F6F3EE]/10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[#F6F3EE]/70 tracking-wide">
          <span>© {year} Constancia Holdings Limited. All rights reserved.</span>

          <span className="opacity-30" aria-hidden="true">·</span>

          <a
            href="https://www.linkedin.com/company/constancia-group/"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-brand-cyan transition-colors"
            aria-label="LinkedIn"
            data-testid="link-social-linkedin"
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
          </a>

          {!hideContactEmail && (
            <>
              <span className="opacity-30" aria-hidden="true">·</span>
              <a
                href="mailto:info@constancia.io"
                className="inline-flex items-center gap-1.5 hover:text-brand-cyan transition-colors"
                data-testid="link-footer-email"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>info@constancia.io</span>
              </a>
            </>
          )}

          <span className="opacity-30" aria-hidden="true">·</span>

          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>Blount House, Hall Court, Hall Park Way, Telford, Shropshire, TF3 4NQ, UK</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
