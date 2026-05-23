import { useEffect, useRef, useCallback, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      render: (
        container: string | HTMLElement,
        parameters: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
          size?: "normal" | "compact";
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    __recaptchaV2Loaded?: boolean;
  }
}

export interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark";
  size?: "normal" | "compact";
  className?: string;
}

// ── Script loader ──────────────────────────────────────────────────────────────
// Loads reCAPTCHA v2 with explicit rendering so we control when widgets appear.
function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.__recaptchaV2Loaded && window.grecaptcha) {
      window.grecaptcha.ready(resolve);
      return;
    }
    const existing = document.querySelector("script[data-recaptcha-v2]") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => window.grecaptcha?.ready(resolve));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaV2 = "true";
    script.onload = () => {
      window.__recaptchaV2Loaded = true;
      window.grecaptcha?.ready(resolve);
    };
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA v2 script"));
    document.head.appendChild(script);
  });
}

// ── reCAPTCHA v2 checkbox widget ───────────────────────────────────────────────
export function Turnstile({
  siteKey, onVerify, onError, onExpire,
  theme = "light", size = "normal", className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef  = useRef<number | null>(null);
  const onVerifyRef  = useRef(onVerify);
  const onErrorRef   = useRef(onError);
  const onExpireRef  = useRef(onExpire);

  useEffect(() => { onVerifyRef.current  = onVerify;  });
  useEffect(() => { onErrorRef.current   = onError;   });
  useEffect(() => { onExpireRef.current  = onExpire;  });

  useEffect(() => {
    if (!containerRef.current || widgetIdRef.current !== null) return;

    loadRecaptchaScript()
      .then(() => {
        if (!containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
          sitekey: siteKey,
          callback:           (token) => onVerifyRef.current(token),
          "expired-callback": ()      => onExpireRef.current?.(),
          "error-callback":   ()      => onErrorRef.current?.(),
          theme,
          size,
        });
      })
      .catch(() => onErrorRef.current?.());

    return () => { widgetIdRef.current = null; };
  }, [siteKey, theme, size]);

  return <div ref={containerRef} className={className} data-testid="recaptcha-widget" />;
}

// ── Hook: manage reCAPTCHA v2 token state for a form ──────────────────────────
// Pair with <Turnstile siteKey={key} onVerify={setToken} onExpire={clearToken} />
// Returns [token, setToken, clearToken]
export function useTurnstileToken(): [string | null, (t: string) => void, () => void] {
  const [token, setToken] = useState<string | null>(null);
  const clearToken = useCallback(() => setToken(null), []);
  return [token, setToken, clearToken];
}

export function useTurnstileReset() {
  return () => {};
}
