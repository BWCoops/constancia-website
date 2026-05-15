/**
 * /onboarding — first-time profile completion after Clerk sign-up.
 * Captures the lead fields that Clerk's standard sign-up doesn't have:
 * company + jobTitle + consentMarketing.
 *
 * Email + firstName + lastName come from Clerk; we don't ask again.
 *
 * Skipped automatically by useClerkLead() once isProfileComplete === true,
 * so existing users land directly on /finance-compass after sign-in.
 */

import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConstanciaMark } from "@/components/ui/constancia-mark";
import { CLERK_ENABLED } from "@/lib/clerk";
import { useClerkLead, syncLead, updateClerkProfile } from "@/lib/clerk-lead-sync";
import { Loader2, ArrowRight } from "lucide-react";

const FALLBACK_REDIRECT = "/finance-compass";

function OnboardingInner() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const returnUrl = new URLSearchParams(search).get("return") ?? FALLBACK_REDIRECT;
  const { toast } = useToast();
  const { user } = useUser();
  const lead = useClerkLead();

  const [company, setCompany]   = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [consent, setConsent]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // If the user already has a complete profile, skip onboarding entirely.
  useEffect(() => {
    if (lead.isLoaded && lead.isProfileComplete) {
      navigate(returnUrl);
    }
  }, [lead.isLoaded, lead.isProfileComplete, navigate, returnUrl]);

  // Pre-fill from existing metadata (in case the user partially completed before)
  useEffect(() => {
    if (!lead.profile) return;
    if (lead.profile.company)  setCompany(lead.profile.company);
    if (lead.profile.jobTitle) setJobTitle(lead.profile.jobTitle);
  }, [lead.profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !lead.profile) return;
    if (!company.trim() || !jobTitle.trim()) {
      toast({ title: "Please fill in both fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await updateClerkProfile(user, {
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        consentMarketing: consent,
      });
      await syncLead({
        email:      lead.profile.email,
        firstName:  lead.profile.firstName,
        lastName:   lead.profile.lastName,
        company:    company.trim(),
        jobTitle:   jobTitle.trim(),
        consentMarketing: consent,
        clerkUserId: lead.profile.clerkUserId,
      });
      toast({ title: "Profile saved", description: "Welcome to Constancia." });
      navigate(returnUrl);
    } catch (err) {
      toast({
        title: "Couldn't save your profile",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (!lead.isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#F6F3EE]/60" />
      </div>
    );
  }

  if (!lead.isSignedIn) {
    navigate(`/sign-in?return=${encodeURIComponent(returnUrl)}`);
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-5"
      style={{ fontFamily: "var(--brand-font-sans)" }}
    >
      <div>
        <Label htmlFor="company" className="text-[#F6F3EE] mb-2 block" style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "-0.005em" }}>
          Company
        </Label>
        <Input
          id="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Aercap"
          required
          autoComplete="organization"
          data-testid="input-onboarding-company"
        />
      </div>

      <div>
        <Label htmlFor="jobTitle" className="text-[#F6F3EE] mb-2 block" style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "-0.005em" }}>
          Job Title
        </Label>
        <Input
          id="jobTitle"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. CFO, FP&A Director"
          required
          autoComplete="organization-title"
          data-testid="input-onboarding-jobtitle"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch
          id="consent"
          checked={consent}
          onCheckedChange={setConsent}
          className="switch-brand"
          data-testid="switch-onboarding-marketing"
        />
        <Label htmlFor="consent" className="text-[#F6F3EE]/72 text-xs leading-snug">
          Send me occasional updates on EPM, AI, and finance transformation. Unsubscribe any time.
        </Label>
      </div>

      <Button
        type="submit"
        variant="brand"
        size="lg"
        disabled={submitting}
        className="w-full"
        data-testid="button-onboarding-submit"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}

export default function OnboardingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{
        background: "var(--brand-bg-primary)",
        fontFamily: "var(--brand-font-sans)",
      }}
    >
      <div className="mb-10 flex flex-col items-center gap-3">
        <ConstanciaMark size={56} className="constancia-breath" />
        <h1
          className="text-[#F6F3EE] mt-4"
          style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.018em" }}
        >
          Tell us a little about you
        </h1>
        <p
          className="text-[#F6F3EE]/68 text-sm text-center max-w-sm"
          style={{ lineHeight: 1.55 }}
        >
          Two quick fields and you're in. We use this to tailor your assessment and recommendations.
        </p>
      </div>

      {CLERK_ENABLED ? (
        <OnboardingInner />
      ) : (
        <div className="max-w-md text-center text-[#F6F3EE]/80">
          <p>Authentication is not yet configured.</p>
        </div>
      )}
    </div>
  );
}
