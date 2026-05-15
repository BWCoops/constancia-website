/**
 * Constancia ClerkProvider — wraps the app with Clerk auth.
 * No-ops if VITE_CLERK_PUBLISHABLE_KEY is not set, so the build doesn't
 * break in environments where Clerk isn't configured yet.
 */

import { ClerkProvider } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY, CLERK_APPEARANCE } from "@/lib/clerk";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function ConstanciaClerkProvider({ children }: Props) {
  if (!CLERK_PUBLISHABLE_KEY) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        "[Constancia] VITE_CLERK_PUBLISHABLE_KEY is not set. " +
        "Clerk auth is disabled — set it in .env to enable sign-in / sign-up.",
      );
    }
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={CLERK_APPEARANCE as any}
      signInFallbackRedirectUrl="/finance-compass"
      signUpFallbackRedirectUrl="/finance-compass"
    >
      {children}
    </ClerkProvider>
  );
}
