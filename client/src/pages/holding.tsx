/**
 * HoldingPage — minimal launch screen.
 *
 * Single dark screen, one phone-height of content, no scrolling.
 * Wordmark + tagline (Intelligent in mint, Agentic in rose) +
 * one email field + Notify me + two partner names + footer.
 *
 * Spec ref: provided 2026-05-23. UK English, no em dashes.
 */

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/seo-head";
import constanciaLogoDarkWebp from "@assets/constancia-logo-dark.webp";
import constanciaLogoDarkPng from "@assets/constancia-logo-dark.png";

const SEO = {
  title: "Constancia — Building Intelligent Agentic Enterprise",
  description:
    "Constancia is launching. Building Intelligent Agentic Enterprise. Official OneStream and Abacum partner. Leave your email to know when the full site is live.",
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "success" | "error";

export default function HoldingPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const isValid = EMAIL_RE.test(email.trim());
  const showError = touched && email.length > 0 && !isValid;

  useEffect(() => {
    document.body.classList.add("is-holding-page");
    return () => document.body.classList.remove("is-holding-page");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || status === "submitting") return;
    setStatus("submitting");
    try {
      const response = await apiRequest("POST", "/api/notify-me", {
        email: email.trim(),
        source: "holding-page",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer,
      });
      const result = await response.json();
      if (result.success) {
        setStatus("success");
        setEmail("");
        setTouched(false);
      } else {
        setStatus("error");
        toast({
          title: "We could not save that",
          description: result.error || "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } catch {
      setStatus("error");
      toast({
        title: "We could not save that",
        description: "Please try again in a moment, or email info@constancia.io.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="holding-page">
      <SEOHead {...SEO} />

      <main className="holding-page__main">
        {/* Launch film — 4:5, autoplay muted looped, controls so user
            can unmute. When the video file is dropped in
            client/public/launch-film.mp4 it renders; until then the
            poster (wordmark on ink) shows. */}
        <div className="holding-film" aria-label="Constancia launch film">
          <video
            className="holding-film__video"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            poster={constanciaLogoDarkPng}
          >
            <source src="/launch-film.webm" type="video/webm" />
            <source src="/launch-film.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Wordmark — the brand PNG. The "mint full stop" requirement
            from the spec is intrinsic to the wordmark file itself. */}
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

        {/* Email capture */}
        {status === "success" ? (
          <div className="holding-success" role="status" aria-live="polite">
            <p>Thank you. We will let you know.</p>
          </div>
        ) : (
          <form className="holding-form" onSubmit={handleSubmit} noValidate>
            <label className="holding-form__label" htmlFor="holding-email">
              Email
            </label>
            <input
              ref={inputRef}
              id="holding-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={showError}
              aria-describedby={showError ? "holding-email-error" : "holding-email-hint"}
              className={`holding-form__input ${showError ? "is-invalid" : ""}`}
              data-testid="input-holding-email"
            />
            {showError && (
              <span
                id="holding-email-error"
                className="holding-form__error"
                role="alert"
              >
                Please use a valid email address.
              </span>
            )}
            <button
              type="submit"
              className="holding-form__button"
              disabled={!isValid || status === "submitting"}
              data-testid="button-holding-notify"
            >
              {status === "submitting" ? "Sending" : "Notify me"}
            </button>
            <span id="holding-email-hint" className="holding-form__hint">
              We will let you know when the full site is live.
            </span>
          </form>
        )}

        {/* Partners */}
        <div className="holding-partners" aria-label="Partners">
          <span>OneStream</span>
          <span className="holding-partners__sep" aria-hidden="true" />
          <span>Abacum</span>
        </div>
      </main>

      <footer className="holding-footer">
        Constancia. London. Copyright {new Date().getFullYear()}.
      </footer>
    </div>
  );
}
