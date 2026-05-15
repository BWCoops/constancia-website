import { useState, useEffect } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConstanciaMark } from "@/components/ui/constancia-mark";

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const CONSENT_KEY = "cookie-consent";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CONSENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.analytics ?? false;
}

export function hasMarketingConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.marketing ?? false;
}

// ── Shared toggle row — same look in both modal and inline banner ──────────
interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  testId?: string;
}

function ToggleRow({ title, description, checked, onChange, disabled, testId }: ToggleRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl"
      style={{
        background: "rgba(246,243,238,0.04)",
        border: "1px solid rgba(246,243,238,0.07)",
      }}
    >
      <div className="min-w-0">
        <Label
          className="block text-[#F6F3EE]"
          style={{
            fontFamily: "var(--brand-font-sans)",
            fontWeight: 600,
            fontSize: "15px",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </Label>
        <p
          className="mt-0.5 text-[#F6F3EE]/55"
          style={{ fontSize: "12.5px", letterSpacing: "0.005em" }}
        >
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="switch-brand flex-shrink-0"
        data-testid={testId}
      />
    </div>
  );
}

export function CookiePreferencesIcon() {
  const [showModal, setShowModal] = useState(false);
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    const consent = getCookieConsent();
    if (consent) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (consent: CookieConsent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("consent-updated", { detail: consent }));
    setShowModal(false);
  };

  const handleSave = () => {
    saveConsent({
      essential: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <>
      {/* Floating preferences pill — small Constancia mark, restrained */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 left-6 z-[90] w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"
        style={{
          background: "var(--brand-secondary-dark)",
          border: "1px solid rgba(246,243,238,0.10)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.32)",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.85)",
          pointerEvents: visible ? "auto" : "none",
        }}
        aria-label="Cookie preferences"
        data-testid="button-cookie-preferences"
      >
        <ConstanciaMark size={22} className="transition-transform duration-300 group-hover:scale-110" />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(10,14,20,0.78)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-[480px] overflow-hidden"
            style={{
              background: "var(--brand-bg-primary)",
              border: "1px solid rgba(246,243,238,0.10)",
              borderRadius: "20px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 1px rgba(199,122,147,0.18)",
              fontFamily: "var(--brand-font-sans)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-7 pt-7 pb-5">
              <div className="flex items-center gap-3">
                <ConstanciaMark size={36} aria-label="Constancia" />
                <h3
                  className="text-[#F6F3EE]"
                  style={{
                    fontWeight: 600,
                    fontSize: "20px",
                    letterSpacing: "-0.018em",
                    lineHeight: 1.15,
                  }}
                >
                  Cookie Preferences
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-md text-[#F6F3EE]/60 hover:text-[#F6F3EE] hover:bg-[#F6F3EE]/[0.06] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body copy */}
            <p
              className="px-7 pb-6 text-[#F6F3EE]/68"
              style={{ fontSize: "14px", lineHeight: 1.6 }}
            >
              Essential cookies are always active so the site can function. You decide on the rest.
            </p>

            {/* Toggles */}
            <div className="space-y-2.5 px-5 pb-7">
              <ToggleRow
                title="Essential"
                description="Required for core functionality."
                checked
                disabled
              />
              <ToggleRow
                title="Analytics"
                description="Anonymised usage data so we can improve the site."
                checked={analytics}
                onChange={setAnalytics}
                testId="switch-modal-analytics"
              />
              <ToggleRow
                title="Marketing"
                description="Used for relevant advertising and remarketing."
                checked={marketing}
                onChange={setMarketing}
                testId="switch-modal-marketing"
              />
            </div>

            {/* Actions */}
            <div
              className="flex items-center justify-between gap-4 px-7 py-5"
              style={{ borderTop: "1px solid rgba(246,243,238,0.07)" }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="text-[#F6F3EE]/55 hover:text-[#F6F3EE]/85 transition-colors"
                style={{ fontSize: "13px", fontFamily: "var(--brand-font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}
                data-testid="button-cancel-cookie-prefs"
              >
                Cancel
              </button>
              <Button
                onClick={handleSave}
                variant="brand"
                data-testid="button-save-cookie-prefs"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const existingConsent = getCookieConsent();
      if (!existingConsent) setShowBanner(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (consent: CookieConsent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("consent-updated", { detail: consent }));
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ essential: true, analytics: true, marketing: true, timestamp: new Date().toISOString() });
  };

  const handleAcceptSelected = () => {
    saveConsent({ essential: true, analytics, marketing, timestamp: new Date().toISOString() });
  };

  const handleRejectNonEssential = () => {
    saveConsent({ essential: true, analytics: false, marketing: false, timestamp: new Date().toISOString() });
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
      data-testid="cookie-consent-banner"
      style={{ fontFamily: "var(--brand-font-sans)" }}
    >
      <div
        className="max-w-3xl mx-auto overflow-hidden"
        style={{
          background: "var(--brand-bg-primary)",
          border: "1px solid rgba(246,243,238,0.10)",
          borderRadius: "20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex flex-shrink-0">
              <ConstanciaMark size={44} aria-label="Constancia" />
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className="text-[#F6F3EE] mb-2"
                style={{ fontWeight: 600, fontSize: "18px", letterSpacing: "-0.018em", lineHeight: 1.2 }}
              >
                We value your privacy.
              </h3>
              <p
                className="text-[#F6F3EE]/68 mb-5"
                style={{ fontSize: "14px", lineHeight: 1.6 }}
              >
                Essential cookies keep the site running. Analytics and marketing cookies are off until you say otherwise.
              </p>

              {showPreferences && (
                <div className="space-y-2.5 mb-5">
                  <ToggleRow
                    title="Essential"
                    description="Required for the website to function properly."
                    checked
                    disabled
                  />
                  <ToggleRow
                    title="Analytics"
                    description="Anonymised data so we can improve the site."
                    checked={analytics}
                    onChange={setAnalytics}
                    testId="switch-analytics"
                  />
                  <ToggleRow
                    title="Marketing"
                    description="Used to deliver relevant advertisements."
                    checked={marketing}
                    onChange={setMarketing}
                    testId="switch-marketing"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {showPreferences ? (
                  <>
                    <Button onClick={handleAcceptSelected} variant="brand" data-testid="button-save-preferences">
                      Save Preferences
                    </Button>
                    <Button variant="brand-secondary" onClick={() => setShowPreferences(false)} data-testid="button-back">
                      Back
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleAcceptAll} variant="brand" data-testid="button-accept-all">
                      Accept All
                    </Button>
                    <Button variant="brand-secondary" onClick={() => setShowPreferences(true)} data-testid="button-manage-preferences">
                      <Settings className="w-3.5 h-3.5 mr-2" />
                      Customise
                    </Button>
                    <button
                      onClick={handleRejectNonEssential}
                      className="text-[#F6F3EE]/55 hover:text-[#F6F3EE]/85 transition-colors"
                      style={{ fontSize: "13px", fontFamily: "var(--brand-font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}
                      data-testid="button-reject"
                    >
                      Reject Non-Essential
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
