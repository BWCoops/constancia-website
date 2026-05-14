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

export default function AdminSignInPage() {
  const [, navigate] = useLocation();
  const { isLoaded, isSignedIn, user } = CLERK_ENABLED
    ? useUser()
    : { isLoaded: true, isSignedIn: false, user: null as any };

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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{
        background: "var(--brand-bg-primary)",
        fontFamily: "var(--brand-font-sans)",
      }}
    >
      <div className="mb-10 flex flex-col items-center gap-3">
        <ConstanciaMark size={56} />
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
        <SignIn
          path="/admin/sign-in"
          routing="path"
          signUpUrl=""
          fallbackRedirectUrl="/admin/dashboard"
        />
      ) : (
        <div className="max-w-md text-center text-[#F6F3EE]/80">
          <p>Admin authentication is not yet configured. Set <code>VITE_CLERK_PUBLISHABLE_KEY</code>.</p>
        </div>
      )}
    </div>
  );
}
