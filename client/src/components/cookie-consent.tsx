import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Cookie, Settings, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const CONSENT_KEY = "cookie-consent";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    // localStorage throws in iOS Private Browsing mode — treat as no consent
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

export function CookiePreferencesIcon() {
  const [showModal, setShowModal] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (consent) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }
  }, []);

  const saveConsent = (consent: CookieConsent) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch {
      // Silently ignore — Private Browsing or storage quota exceeded
    }
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

  return createPortal(
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 left-6 z-cookie-fab w-12 h-12 rounded-full bg-gradient-to-br from-brand-navy to-brand-teal hover-elevate active-elevate-2 flex items-center justify-center animate-cookie-float"
        aria-label="Cookie preferences"
        data-testid="button-cookie-preferences"
      >
        <Cookie className="w-5 h-5 text-brand-cyan" />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-navy to-brand-teal flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-brand-cyan" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Cookie Preferences</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Manage your cookie preferences. Essential cookies are always active as they are required for the website to function.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="min-w-0 flex flex-col justify-center">
                  <Label className="block font-medium leading-snug">Essential Cookies</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Required for core functionality</p>
                </div>
                <Switch checked disabled />
              </div>

              <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="min-w-0 flex flex-col justify-center">
                  <Label className="block font-medium leading-snug">Analytics Cookies</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Help us improve our website</p>
                </div>
                <Switch
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                  data-testid="switch-modal-analytics"
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="min-w-0 flex flex-col justify-center">
                  <Label className="block font-medium leading-snug">Marketing Cookies</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Used for targeted advertising</p>
                </div>
                <Switch
                  checked={marketing}
                  onCheckedChange={setMarketing}
                  data-testid="switch-modal-marketing"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                variant="default"
                className="flex-1"
                data-testid="button-save-cookie-prefs"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-cookie-prefs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
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
      if (!existingConsent) {
        setShowBanner(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (consent: CookieConsent) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch {
      // Silently ignore — Private Browsing or storage quota exceeded
    }
    window.dispatchEvent(new CustomEvent("consent-updated", { detail: consent }));
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
  };

  const handleAcceptSelected = () => {
    saveConsent({
      essential: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    });
  };

  const handleRejectNonEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
  };

  if (!showBanner) return null;

  return createPortal(
    <div
      className="fixed bottom-0 left-0 right-0 z-cookie-banner p-4 md:p-6"
      data-testid="cookie-consent-banner"
    >
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-navy to-brand-teal flex items-center justify-center flex-shrink-0">
              <Cookie className="w-6 h-6 text-brand-cyan" />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                We value your privacy
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We use cookies to enhance your browsing experience, analyse site traffic, and personalise content.
                By clicking "Accept All", you consent to our use of cookies. You can manage your preferences below.
              </p>

              {showPreferences && (
                <div className="space-y-4 mb-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex flex-col justify-center">
                        <Label className="block font-medium leading-snug">Essential Cookies</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Required for the website to function properly</p>
                      </div>
                      <Switch checked disabled />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex flex-col justify-center">
                        <Label className="block font-medium leading-snug">Analytics Cookies</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Help us understand how visitors use our site</p>
                      </div>
                      <Switch
                        checked={analytics}
                        onCheckedChange={setAnalytics}
                        data-testid="switch-analytics"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex flex-col justify-center">
                        <Label className="block font-medium leading-snug">Marketing Cookies</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Used to deliver relevant advertisements</p>
                      </div>
                      <Switch
                        checked={marketing}
                        onCheckedChange={setMarketing}
                        data-testid="switch-marketing"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {showPreferences ? (
                  <>
                    <Button
                      onClick={handleAcceptSelected}
                      variant="default"
                      data-testid="button-save-preferences"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save Preferences
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPreferences(false)}
                      data-testid="button-back"
                    >
                      Back
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleAcceptAll}
                      variant="default"
                      data-testid="button-accept-all"
                    >
                      Accept All
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPreferences(true)}
                      data-testid="button-manage-preferences"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Preferences
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleRejectNonEssential}
                      className="text-muted-foreground"
                      data-testid="button-reject"
                    >
                      Reject Non-Essential
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
