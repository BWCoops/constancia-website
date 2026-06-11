/**
 * FinanceCompassLoading — branded splash shown while the Finance
 * Compass route bundle resolves and the start flow loads. Same
 * dark palette as the rest of the site, with the wordmark + a
 * concise compass-eyebrow + a slow mint ring spinner. No marketing
 * copy here — this is meant to be a quick, on-brand transition.
 */
import constanciaLogoDarkPng from "@assets/constancia-logo-dark.webp";

export function FinanceCompassLoading() {
  return (
    <div className="fc-loading">
      <div className="fc-loading__inner">
        <img
          className="fc-loading__wordmark"
          src={constanciaLogoDarkPng}
          alt="Constancia"
        />
        <span className="fc-loading__eyebrow">Finance Compass</span>
        <span className="fc-loading__spinner" aria-hidden="true" />
        <span className="sr-only">Loading Finance Compass</span>
      </div>
    </div>
  );
}
