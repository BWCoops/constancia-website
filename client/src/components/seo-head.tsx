import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  type?: "website" | "article" | "service" | "organization";
  article?: {
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
  includeOrganizationSchema?: boolean;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Constancia",
  "alternateName": "Constancia Group",
  "url": "https://constancia.io",
  "logo": "https://constancia.io/logo.png",
  "description": "Independent ERP and EPM consultancy delivering AI-powered finance transformation across the UK and Ireland.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "86-90 Paul Street",
    "addressLocality": "London",
    "addressRegion": "London",
    "postalCode": "EC2A 4NE",
    "addressCountry": "GB"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "info@constancia.io",
    "contactType": "customer service",
    "availableLanguage": "English"
  },
  "sameAs": [
    "https://www.linkedin.com/company/1qg-group-limited/"
  ],
  "areaServed": ["GB", "IE", "ZA", "US", "CA", "150"],
  "knowsAbout": [
    "Enterprise Resource Planning",
    "Enterprise Performance Management",
    "Finance Transformation",
    "Artificial Intelligence",
    "Oracle Cloud",
    "Anaplan",
    "OneStream",
    "Board"
  ]
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Constancia",
  "url": "https://constancia.io",
  "description": "Independent ERP and EPM consultancy delivering AI-powered finance transformation.",
  "publisher": {
    "@type": "Organization",
    "name": "Constancia"
  }
};

export function SEOHead({
  title,
  description,
  keywords = [],
  ogImage = "https://constancia.io/og-image.png",
  canonicalUrl,
  type = "website",
  article,
  includeOrganizationSchema = false,
  breadcrumbs,
}: SEOHeadProps) {
  const fullTitle = title.includes("Constancia") ? title : `${title} | Constancia`;
  const url = canonicalUrl || (typeof window !== "undefined" ? window.location.href : "https://constancia.io");

  useEffect(() => {
    document.title = fullTitle;

    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMeta("description", description);
    updateMeta("keywords", keywords.join(", "));
    updateMeta("robots", "index, follow");
    updateMeta("author", "Constancia");

    updateMeta("og:type", type === "article" ? "article" : "website", true);
    updateMeta("og:url", url, true);
    updateMeta("og:title", fullTitle, true);
    updateMeta("og:description", description, true);
    updateMeta("og:image", ogImage, true);
    updateMeta("og:site_name", "Constancia", true);

    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:url", url);
    updateMeta("twitter:title", fullTitle);
    updateMeta("twitter:description", description);
    updateMeta("twitter:image", ogImage);

    if (type === "article" && article) {
      if (article.author) updateMeta("article:author", article.author, true);
      if (article.publishedTime) updateMeta("article:published_time", article.publishedTime, true);
      if (article.modifiedTime) updateMeta("article:modified_time", article.modifiedTime, true);
      if (article.section) updateMeta("article:section", article.section, true);
      article.tags?.forEach((tag, i) => {
        updateMeta(`article:tag${i > 0 ? i : ""}`, tag, true);
      });
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    const existingJsonLd = document.querySelectorAll('script[type="application/ld+json"][data-seo-head]');
    existingJsonLd.forEach(el => el.remove());

    if (includeOrganizationSchema) {
      const orgScript = document.createElement("script");
      orgScript.type = "application/ld+json";
      orgScript.setAttribute("data-seo-head", "true");
      orgScript.textContent = JSON.stringify(organizationSchema);
      document.head.appendChild(orgScript);

      const webScript = document.createElement("script");
      webScript.type = "application/ld+json";
      webScript.setAttribute("data-seo-head", "true");
      webScript.textContent = JSON.stringify(websiteSchema);
      document.head.appendChild(webScript);
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url
        }))
      };
      const bcScript = document.createElement("script");
      bcScript.type = "application/ld+json";
      bcScript.setAttribute("data-seo-head", "true");
      bcScript.textContent = JSON.stringify(breadcrumbSchema);
      document.head.appendChild(bcScript);
    }

    return () => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"][data-seo-head]');
      scripts.forEach(el => el.remove());
    };
  }, [fullTitle, description, keywords, ogImage, url, type, article, includeOrganizationSchema, breadcrumbs]);

  return null;
}
