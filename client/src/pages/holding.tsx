/**
 * HoldingPage — minimal launch screen.
 *
 * Single dark screen: wordmark + tagline (Intelligent in mint,
 * Agentic in rose) + launch film + partner names + footer. Contact
 * is reachable through the pill drawer, so no email-capture form is
 * needed here.
 */

import { useEffect } from "react";
import { SEOHead } from "@/components/seo-head";
import { Footer } from "@/components/footer";
import constanciaLogoDarkWebp from "@assets/constancia-logo-dark.webp";
import constanciaLogoDarkPng from "@assets/constancia-logo-dark.png";

const SEO = {
  title: "Constancia — Building Intelligent Agentic Enterprise",
  description:
    "Constancia is launching. Building Intelligent Agentic Enterprise. Official OneStream and Abacum partner.",
  keywords: [
    "Constancia",
    "Intelligent Agentic Enterprise",
    "OneStream partner",
    "Abacum partner",
    "AI for finance",
    "enterprise intelligence",
  ],
  includeOrganizationSchema: true,
};

export default function HoldingPage() {
  useEffect(() => {
    document.body.classList.add("is-holding-page");
    return () => document.body.classList.remove("is-holding-page");
  }, []);

  return (
    <div className="holding-page">
      <SEOHead {...SEO} />

      <main className="holding-page__main">
        {/* Wordmark. */}
        <div className="holding-wordmark">
          <picture>
            <source srcSet={constanciaLogoDarkWebp} type="image/webp" />
            <img src={constanciaLogoDarkPng} alt="Constancia" />
          </picture>
        </div>

        {/* Tagline — Intelligent in mint, Agentic in rose. */}
        <h1 className="holding-tagline">
          Building{" "}
          <em className="holding-tagline__intelligent">Intelligent</em>{" "}
          <em className="holding-tagline__agentic">Agentic</em>{" "}
          Enterprise
        </h1>

        {/* Launch film — 4:5 vertical intro. AV1 (WebM) for modern
            browsers, H.264 (MP4) fallback. Faststart on the MP4 +
            preload="auto" so the first paint isn't delayed waiting
            for the container. WebP poster shown while the video
            buffers; JPEG fallback for old Safari. */}
        <div className="holding-film" aria-label="Constancia launch film">
          <video
            className="holding-film__video"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="auto"
            poster="/launch-film-poster.jpg"
          >
            <source src="/launch-film.webm" type="video/webm" />
            <source src="/launch-film.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Partners */}
        <div className="holding-partners" aria-label="Partners">
          <span>OneStream</span>
          <span className="holding-partners__sep" aria-hidden="true" />
          <span>Abacum</span>
        </div>
      </main>

      <Footer hideContactEmail />
    </div>
  );
}
