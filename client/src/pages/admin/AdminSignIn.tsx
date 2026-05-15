/**
 * /admin/sign-in — Admin sign-in via Clerk.
 * Admin role enforced via Clerk publicMetadata.role === 'admin'.
 * Set this in the Clerk dashboard (User -> Public metadata) for each admin.
 */

import { SignIn, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { CLERK_ENABLED } from "@/lib/clerk";
import { ConstanciaMark } from "@/components/ui/constancia-mark";

/**
 * Inner component — assumes Clerk is enabled. Calls useUser() unconditionally
 * (Rules of Hooks). Wrapped by AdminSignInPage which gates on CLERK_ENABLED.
 */
function AdminSignInInner() {
  const [, navigate] = useLocation();
  const { isLoaded, isSignedIn, user } = useUser();

  // Once signed in, check role and route
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const role = (user.publicMetadata?.role as string | undefined) ?? "user";
    if (role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/admin/access-denied");
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  return (
    <SignIn
      path="/admin/sign-in"
      routing="path"
      signUpUrl=""
      fallbackRedirectUrl="/admin/dashboard"
    />
  );
}

export default function AdminSignInPage() {
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
        <p
          className="text-xs uppercase tracking-[0.2em]"
          style={{
            color: "var(--brand-mineral-green)",
            fontFamily: "var(--brand-font-mono)",
            fontWeight: 500,
          }}
        >
          Constancia · Admin
        </p>
      </div>

      {CLERK_ENABLED ? (
        <AdminSignInInner />
      ) : (
        <div
          className="max-w-md text-center text-[#F6F3EE]/80 p-6 rounded-xl"
          style={{
            background: "rgba(199,122,147,0.05)",
            border: "1px solid rgba(199,122,147,0.18)",
          }}
        >
          <p className="font-medium mb-2 text-[#F6F3EE]">Authentication not configured</p>
          <p className="text-sm">
            Set <code className="font-mono text-[#C77A93]">VITE_CLERK_PUBLISHABLE_KEY</code> and{" "}
            <code className="font-mono text-[#C77A93]">CLERK_SECRET_KEY</code> in Replit Secrets,
            then restart the dev server.
          </p>
        </div>
      )}
    </div>
  );
}
