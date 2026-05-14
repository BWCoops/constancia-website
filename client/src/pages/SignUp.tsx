/**
 * /sign-up — FinanceCompass user registration via Clerk.
 */

import { SignUp } from "@clerk/clerk-react";
import { CLERK_ENABLED } from "@/lib/clerk";
import { ConstanciaMark } from "@/components/ui/constancia-mark";
import { Link } from "wouter";

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{
        background: "var(--brand-bg-primary)",
        fontFamily: "var(--brand-font-sans)",
      }}
    >
      <Link href="/" className="mb-10 flex items-center gap-3 group" data-testid="link-home-from-signup">
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
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/finance-compass"
        />
      ) : (
        <div className="max-w-md text-center text-[#F6F3EE]/80">
          <p>Registration is not yet configured. Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your environment.</p>
        </div>
      )}
    </div>
  );
}
