/**
 * /sign-in — FinanceCompass user sign-in via Clerk.
 * Used by FC users to access assessments, downloads, and the dashboard.
 */

import { SignIn } from "@clerk/clerk-react";
import { CLERK_ENABLED } from "@/lib/clerk";
import { ConstanciaMark } from "@/components/ui/constancia-mark";
import { Link } from "wouter";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{
        background: "var(--brand-bg-primary)",
        fontFamily: "var(--brand-font-sans)",
      }}
    >
      <Link href="/" className="mb-10 flex items-center gap-3 group" data-testid="link-home-from-signin">
        <ConstanciaMark
          size={56}
          className="transition-transform duration-300 group-hover:scale-110"
        />
        <span
          className="text-[#F6F3EE] font-semibold tracking-tight"
          style={{ fontSize: "24px", letterSpacing: "-0.01em" }}
        >
          constancia<span style={{ color: "var(--brand-mineral-green)" }}>.</span>
        </span>
      </Link>

      {CLERK_ENABLED ? (
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/finance-compass"
        />
      ) : (
        <div className="max-w-md text-center text-[#F6F3EE]/80">
          <p>Authentication is not yet configured. Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your environment.</p>
        </div>
      )}
    </div>
  );
}
