import { Link } from "wouter";
import { Linkedin, Mail, MapPin, ArrowUpRight } from "@/lib/icons";
// `-dark.png` is the cream/light wordmark intended for use on dark
// surfaces (the suffix names the *intended surface*, not the logo
// colour itself). The footer sits on graphite, so this is the right
// asset; using the graphite-on-cream logo here would render invisible.
import logoWhite from "@assets/constancia-logo-dark.png";
import { useFeatureFlags } from "@/lib/feature-flags";
import type { FeatureFlags } from "@shared/feature-flags";

type FooterLink = {
  label: string;
  href: string;
  featureKey: keyof FeatureFlags | null;
};

const footerLinks: Record<string, FooterLink[]> = {
  company: [
    { label: "About Us", href: "/about", featureKey: "about" },
    { label: "Our Services", href: "/services", featureKey: "services" },
    { label: "Careers", href: "/careers", featureKey: null },
    { label: "Insights Hub", href: "/blog", featureKey: "blog" },
    { label: "Resources", href: "/files", featureKey: "resources" },
  ],
  solutions: [
    { label: "EPM Solutions", href: "/solutions", featureKey: "solutions" },
    { label: "Performance Frameworks", href: "/solutions", featureKey: "solutions" },
    { label: "Advisory Services", href: "/services", featureKey: "services" },
  ],
  resources: [
    { label: "Insights Hub", href: "/blog", featureKey: "blog" },
    { label: "Downloads", href: "/files", featureKey: "resources" },
    { label: "Case Studies", href: "/blog", featureKey: "blog" },
    { label: "Contact", href: "/contact", featureKey: "contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy", featureKey: null },
    { label: "Terms of Use", href: "/terms", featureKey: null },
    { label: "Cookie Policy", href: "/cookies", featureKey: null },
    { label: "Operations", href: "/admin/login", featureKey: null },
  ],
};

interface FooterProps {
  /**
   * Holding-screen variant. Drops the four-column nav block above the
   * thin bar — the launch screen is meant to be a single quiet pane,
   * so only the slim Constancia Holdings line shows. Other pages keep
   * the full footer.
   */
  variant?: "default" | "minimal";
}

export function Footer({ variant = "default" }: FooterProps) {
  const { flags } = useFeatureFlags();

  const filterLinks = (links: FooterLink[]) =>
    links.filter((link) => link.featureKey === null || flags[link.featureKey]);

  const minimal = variant === "minimal";

  return (
    <footer
      className="bg-brand-navy text-brand-cream relative overflow-hidden"
      style={{ fontFamily: "var(--hp-font-sans)", paddingTop: minimal ? 24 : 56, paddingBottom: 20 }}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {!minimal && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-10">
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link href="/" className="inline-block mb-2 group" data-testid="link-footer-home">
                <img
                  src={logoWhite}
                  alt="Constancia"
                  className="h-14 w-auto max-w-[180px]"
                />
              </Link>

              <div className="mb-4 text-sm leading-relaxed">
                <p className="text-brand-cream">Connected finance intelligence.</p>
                <p className="text-brand-cream">Make sense of every system.</p>
                <p style={{ color: "var(--hp-cyan)", fontStyle: "italic" }}>
                  One source of truth.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-brand-cyan mb-4">Company</h3>
              <ul className="space-y-3">
                {filterLinks(footerLinks.company).map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[#F6F3EE]/70 hover:text-brand-cyan transition-colors text-sm"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-brand-cyan mb-4">Solutions</h3>
              <ul className="space-y-3">
                {filterLinks(footerLinks.solutions).map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[#F6F3EE]/70 hover:text-brand-cyan transition-colors text-sm"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-brand-cyan mb-4">Resources</h3>
              <ul className="space-y-3">
                {filterLinks(footerLinks.resources).map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[#F6F3EE]/70 hover:text-brand-cyan transition-colors text-sm flex items-center gap-1"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-brand-cyan mb-4">Legal</h3>
              <ul className="space-y-3">
                {filterLinks(footerLinks.legal).map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[#F6F3EE]/70 hover:text-brand-cyan transition-colors text-sm"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* One thin line. Copyright | LinkedIn | (Contact on non-home
            only) | Address. Wraps on narrow screens but stays a single
            horizontal flow on tablet+. */}
        <div
          className={`${
            minimal ? "" : "pt-6 border-t border-[#F6F3EE]/10"
          } flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[#F6F3EE]/70 tracking-wide`}
        >
          <span>© {new Date().getFullYear()} Constancia Holdings Limited. All rights reserved.</span>

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

          {!minimal && (
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
