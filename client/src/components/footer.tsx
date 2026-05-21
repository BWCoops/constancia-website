import { Link } from "wouter";
import { Linkedin, Mail, MapPin, ArrowUpRight } from "@/lib/icons";
import logoWhite from "@assets/constancia-logo.png";
import { VisitorDataManager } from "@/components/visitor-data-manager";
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

const socialLinks = [
  { icon: Linkedin, href: "https://www.linkedin.com/company/constancia-group/", label: "LinkedIn" },
];

export function Footer() {
  const { flags } = useFeatureFlags();

  const filterLinks = (links: FooterLink[]) =>
    links.filter((link) => link.featureKey === null || flags[link.featureKey]);

  return (
    <footer
      className="bg-brand-navy text-brand-cream py-16 lg:py-20 relative overflow-hidden"
      style={{ fontFamily: 'var(--hp-font-sans)' }}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-block mb-2 group" data-testid="link-footer-home">
              <img
                src={logoWhite}
                alt="Constancia"
                className="h-16 w-auto max-w-[200px]"
              />
            </Link>
            
            <div className="mb-4 text-sm leading-relaxed">
              <p className="text-brand-cream">Connected finance intelligence.</p>
              <p className="text-brand-cream">Make sense of every system.</p>
              <p style={{ color: 'var(--hp-cyan)', fontStyle: 'italic' }}>One source of truth.</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-brand-cyan mb-4">Company</h3>
            <ul className="space-y-3">
              {filterLinks(footerLinks.company).map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[#FEFFF3]/70 hover:text-brand-cyan transition-colors text-sm"
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
                    className="text-[#FEFFF3]/70 hover:text-brand-cyan transition-colors text-sm"
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
                    className="text-[#FEFFF3]/70 hover:text-brand-cyan transition-colors text-sm flex items-center gap-1"
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
                    className="text-[#FEFFF3]/70 hover:text-brand-cyan transition-colors text-sm"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#FEFFF3]/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#FEFFF3]/60">
            © {new Date().getFullYear()} Constancia Holdings Limited. All rights reserved. Company number 17227112.
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-sm text-[#FEFFF3]/60">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="flex items-center gap-2 hover:text-brand-cyan transition-colors"
                aria-label={social.label}
                data-testid={`link-social-${social.label.toLowerCase()}`}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
            <a href="mailto:info@1qg.com" className="flex items-center gap-2 hover:text-brand-cyan transition-colors">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="break-all">info@constancia.com</span>
            </a>
            <span className="flex items-start gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Blount House, Hall Court, Hall Park Way, Telford, Shropshire, TF3 4NQ, UK</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
