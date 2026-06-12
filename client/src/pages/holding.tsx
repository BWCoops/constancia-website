/**
 * HoldingPage — minimal launch screen.
 *
 * Single dark screen: wordmark + tagline (Intelligent in mint,
 * Agentic in rose) + launch film + partner names + footer. Contact
 * is reachable through the pill drawer, so no email-capture form is
 * needed here.
 */

import { useEffect, useRef } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.body.classList.add("is-holding-page");
    return () => document.body.classList.remove("is-holding-page");
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const unmute = () => {
      video.muted = false;
      document.removeEventListener("click", unmute);
      document.removeEventListener("touchstart", unmute);
      document.removeEventListener("keydown", unmute);
    };

    document.addEventListener("click", unmute, { once: true });
    document.addEventListener("touchstart", unmute, { once: true });
    document.addEventListener("keydown", unmute, { once: true });

    return () => {
      document.removeEventListener("click", unmute);
      document.removeEventListener("touchstart", unmute);
      document.removeEventListener("keydown", unmute);
    };
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

        {/* Launch film — 4:5 vertical intro at 1080×1350. Explicit
            width/height attributes match the source so the browser
            reserves the slot before any bytes arrive (no CLS). AV1
            WebM for modern browsers, H.264 MP4 fallback with
            +faststart for progressive playback. The poster JPEG is
            preloaded in index.html so it lights up the LCP slot
            without waiting on metadata. */}
        <div className="holding-film" aria-label="Constancia launch film">
          <video
            ref={videoRef}
            className="holding-film__video"
            width={1080}
            height={1350}
            autoPlay
            loop
            playsInline
            muted
            controls
            preload="auto"
            poster="/launch-film-poster.jpg"
            disablePictureInPicture
            disableRemotePlayback
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
