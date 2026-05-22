import { useEffect, useRef, useState } from "react";
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

  // Probe state — drives the hold-screen displayed when Clerk says signed-in
  // but we haven't yet confirmed allowlist authorisation with the server.
  const [probeState, setProbeState] = useState<
    "idle" | "checking" | "retrying" | "stuck" | "transient_error"
  >("idle");
  const probedRef = useRef(false);
  const probeAttemptRef = useRef(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      probedRef.current = false;
      probeAttemptRef.current = 0;
      setProbeState("idle");
      return;
    }
    if (probedRef.current) return;
    probedRef.current = true;

    let cancelled = false;
    const runProbe = async (attempt: number): Promise<void> => {
      if (cancelled) return;
      probeAttemptRef.current = attempt;
      setProbeState(attempt === 0 ? "checking" : "retrying");

      try {
        const res = await fetch("/api/admin/auth/session", {
          credentials: "include",
          // Avoid the browser/CDN caching a stale "false" answer
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 429) {
          // Rate-limited — surface as transient and retry with backoff.
          if (attempt < 3) {
            setTimeout(() => runProbe(attempt + 1), 1000 * (attempt + 1));
          } else {
            setProbeState("transient_error");
          }
          return;
        }
        if (!res.ok) {
          if (attempt < 3) {
            setTimeout(() => runProbe(attempt + 1), 1500 * (attempt + 1));
          } else {
            setProbeState("transient_error");
          }
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        if (data.authenticated === true) {
          setLocation("/admin/dashboard");
          return;
        }
        if (data.reason === "email_not_authorized") {
          setLocation("/admin/access-denied");
          return;
        }
        if (data.reason === "session_expired") {
          // Clerk session is stale — reset probe state and let <SignIn /> re-mount.
          probedRef.current = false;
          setProbeState("idle");
          return;
        }
        if (data.reason === "clerk_fetch_failed") {
          // Server couldn't talk to Clerk's API. Retry with backoff.
          if (attempt < 3) {
            setTimeout(() => runProbe(attempt + 1), 2000 * (attempt + 1));
          } else {
            setProbeState("transient_error");
          }
          return;
        }
        // authenticated: false with no reason — stay on this page so user can sign in
        setProbeState("idle");
      } catch (err) {
        if (cancelled) return;
        console.warn("Session probe failed:", err);
        if (attempt < 3) {
          setTimeout(() => runProbe(attempt + 1), 2000 * (attempt + 1));
        } else {
          setProbeState("transient_error");
        }
      }
    };

    runProbe(0);
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, setLocation]);

  // If the hold-screen has been showing for too long without resolving,
  // give the user a way out instead of an infinite spinner.
  const [probeStuck, setProbeStuck] = useState(false);
  useEffect(() => {
    if (probeState !== "checking" && probeState !== "retrying") {
      setProbeStuck(false);
      return;
    }
    const t = window.setTimeout(() => setProbeStuck(true), 12000);
    return () => window.clearTimeout(t);
  }, [probeState]);

  // Clerk-load timeout — if Clerk's runtime hasn't initialised within 6s
  // surface a useful error rather than spin forever. Usual causes: CSP
  // blocking the script, deleted Clerk instance, network/DNS to clerk.dev.
  const [clerkStuck, setClerkStuck] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const t = window.setTimeout(() => setClerkStuck(true), 6000);
    return () => window.clearTimeout(t);
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F3EE] p-6 text-center">
        {!clerkStuck ? (
          <div className="animate-pulse text-[#252826] text-lg">Loading sign-in…</div>
        ) : (
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-light text-[#252826]">Authentication unavailable</h1>
            <p className="text-[#252826] text-sm leading-relaxed">
              Clerk's runtime hasn't loaded after 6 seconds. The usual causes
              are a blocked Content-Security-Policy origin, a rotated or
              deleted Clerk instance, or a network issue between this browser
              and <code className="text-[#8E4F67]">clerk.accounts.dev</code>.
            </p>
            <p className="text-[#252826] text-xs">
              Server diagnostics: <a className="underline text-[#8E4F67]" href="/api/health/clerk">/api/health/clerk</a>
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-full bg-[#252826] text-[#F6F3EE] text-sm"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // Critical: if Clerk reports a signed-in session, do NOT render <SignIn/>.
  // Clerk's component auto-redirects to afterSignInUrl as soon as it sees an
  // active session — which causes the dashboard <-> login ping-pong when the
  // user's email isn't on the allowlist. Hold here with state-aware messages
  // while the probe runs, then it'll setLocation us to the right destination.
  if (isSignedIn) {
    if (probeState === "transient_error") {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F3EE] p-6 text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-light text-[#252826]">Authentication check failed</h1>
            <p className="text-[#252826] text-sm leading-relaxed">
              The server couldn't confirm your authorisation after several
              attempts. This usually means a transient network issue between
              the server and Clerk's API, or rate-limiting from too many
              recent attempts.
            </p>
            <p className="text-[#252826] text-xs">
              Diagnostics: <a className="underline text-[#8E4F67]" href="/api/health/clerk">/api/health/clerk</a>
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => { probedRef.current = false; probeAttemptRef.current = 0; setProbeState("idle"); window.location.reload(); }}
                className="px-4 py-2 rounded-full bg-[#252826] text-[#F6F3EE] text-sm"
              >
                Retry
              </button>
              <button
                onClick={() => (window.location.href = "/api/logout")}
                className="px-4 py-2 rounded-full bg-transparent text-[#252826] text-sm border border-[#252826]/20"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F3EE] p-6 text-center">
        <div className="animate-pulse text-[#252826] text-lg">
          {probeState === "retrying"
            ? `Checking authorisation… (retry ${probeAttemptRef.current})`
            : "Checking authorisation…"}
        </div>
        {probeStuck && (
          <div className="mt-6 max-w-md space-y-2">
            <p className="text-[#252826] text-sm">
              This is taking longer than expected. You can retry, sign out, or
              check the server diagnostics.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-full bg-[#252826] text-[#F6F3EE] text-sm"
              >
                Retry
              </button>
              <button
                onClick={() => (window.location.href = "/api/logout")}
                className="px-4 py-2 rounded-full bg-transparent text-[#252826] text-sm border border-[#252826]/20"
              >
                Sign out
              </button>
              <a
                href="/api/health/clerk"
                className="px-4 py-2 rounded-full bg-transparent text-[#8E4F67] text-sm underline"
              >
                Diagnostics
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#252826] p-6 relative overflow-hidden">
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
          /* No afterSignInUrl — if we set one, Clerk's <SignIn /> auto-redirects
             to it the moment isSignedIn flips true, racing our server-side
             allowlist check and creating the dashboard <-> login loop when
             the email is denied. Our useEffect above probes the server and
             redirects to /admin/dashboard or /admin/access-denied itself. */
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[#F6F3EE] shadow-xl border border-[#252826]/10",
              headerTitle: "text-[#252826]",
              headerSubtitle: "text-[#252826]",
              formButtonPrimary: "bg-[#252826] hover:bg-[#8E4F67] text-[#F6F3EE]",
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
