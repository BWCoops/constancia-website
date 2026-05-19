import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { SignIn, useAuth } from "@clerk/clerk-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import logo from "@assets/constancia-logo-dark.png";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { isLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const errorParam = params.get("error");
    if (errorParam) setError(decodeURIComponent(errorParam));
  }, [search]);

  // If Clerk reports the user is signed in, also verify the server-side
  // session+allowlist check before redirecting into the dashboard.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/auth/session", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.authenticated) {
          setLocation("/admin/dashboard");
        } else if (data.reason === "email_not_authorized") {
          setLocation("/admin/access-denied");
        }
      } catch (err) {
        console.error("Session check failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F3EE]">
        <div className="animate-pulse text-[#1E2630] text-lg">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#12161D] p-6 relative overflow-hidden">
      {/* Soft brand-circle backdrop */}
      <div className="absolute pointer-events-none" style={{
        top: "20%", right: "10%",
        width: "32vmin", height: "32vmin",
        borderRadius: "50%",
        background: "rgba(199,122,147,0.55)",
        mixBlendMode: "screen",
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: "15%", right: "20%",
        width: "28vmin", height: "28vmin",
        borderRadius: "50%",
        background: "rgba(127,184,163,0.5)",
        mixBlendMode: "screen",
      }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="Constancia"
            className="h-10 object-contain mx-auto mb-4"
            data-testid="logo-image"
          />
          <h1 className="text-[#F6F3EE] text-2xl font-light tracking-tight" data-testid="text-title">
            Admin Centre
          </h1>
          <p className="text-[#F6F3EE]/60 text-sm mt-2" data-testid="text-description">
            Sign in to access the Constancia administration dashboard.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6" data-testid="alert-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <SignIn
          path="/admin/login"
          routing="path"
          afterSignInUrl="/admin/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[#F6F3EE] shadow-xl border border-[#12161D]/10",
              headerTitle: "text-[#12161D]",
              headerSubtitle: "text-[#1E2630]",
              formButtonPrimary: "bg-[#12161D] hover:bg-[#8E4F67] text-[#F6F3EE]",
              footerActionLink: "text-[#8E4F67]",
            },
          }}
        />

        <p className="text-xs text-center text-[#F6F3EE]/40 mt-6" data-testid="text-security-notice">
          Access restricted to authorised Constancia staff.
        </p>
      </div>
    </div>
  );
}
