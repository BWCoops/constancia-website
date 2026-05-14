/**
 * Clerk authentication helpers
 * ─────────────────────────────────────────────────────────────────
 * Constancia uses Clerk for ALL authentication:
 *   • FinanceCompass user sign-up / sign-in
 *   • Admin sign-in (with role-based access)
 *
 * Replaces the previous stack:
 *   ✗ Replit OIDC (server/replitAuth.ts)
 *   ✗ OTP-gated FC downloads (server/finance-compass/otp-service.ts)
 *   ✗ Email + password + TOTP admin auth (server/services/admin-security.ts)
 *
 * Required env vars:
 *   VITE_CLERK_PUBLISHABLE_KEY   — Clerk frontend key (pk_live_… or pk_test_…)
 *   CLERK_SECRET_KEY             — Clerk backend key (sk_live_… or sk_test_…)
 *
 * Admin role check uses Clerk's publicMetadata.role === 'admin' — set this
 * in the Clerk dashboard for admin users.
 */

export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export const CLERK_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY);

/** Clerk-managed routes that the app exposes. */
export const ROUTES = {
  signIn:        "/sign-in",
  signUp:        "/sign-up",
  adminSignIn:   "/admin/sign-in",
  // Post-auth landing pages
  fcAfterSignIn: "/finance-compass",
  fcAfterSignUp: "/finance-compass",
  adminAfter:    "/admin/dashboard",
} as const;

/**
 * Appearance overrides — Constancia palette + Noto Sans for the Clerk UI.
 * Spread into <SignIn appearance={{...}} /> etc.
 */
export const CLERK_APPEARANCE = {
  variables: {
    colorPrimary:       "#C77A93",   // muted-rose (signature accent)
    colorBackground:    "#12161D",   // primary-dark
    colorInputBackground:"#1E2630",  // secondary-dark
    colorInputText:     "#F6F3EE",   // main-light
    colorText:          "#F6F3EE",
    colorTextSecondary: "rgba(246,243,238,0.68)",
    colorDanger:        "#8E4F67",   // deep-berry
    colorSuccess:       "#7FB8A3",   // mineral-green
    colorWarning:       "#C77A93",
    colorNeutral:       "#D8D0C6",
    fontFamily:         "'Noto Sans', system-ui, -apple-system, sans-serif",
    fontFamilyButtons:  "'IBM Plex Mono', monospace",
    borderRadius:       "8px",
    fontSize:           "15px",
  },
  elements: {
    rootBox:           "constancia-clerk-root",
    card:              "shadow-[0_8px_36px_rgba(199,122,147,0.12)] border border-[rgba(246,243,238,0.08)]",
    headerTitle:       "text-[#F6F3EE] font-semibold tracking-tight",
    headerSubtitle:    "text-[#F6F3EE]/70",
    socialButtonsBlockButton: "border border-[rgba(246,243,238,0.12)] hover:border-[#C77A93]/40 transition-colors",
    formButtonPrimary: "bg-[#C77A93] hover:bg-[#8E4F67] text-[#12161D] font-medium tracking-wide uppercase text-xs",
    formFieldInput:    "border border-[rgba(246,243,238,0.10)] focus:border-[#C77A93]/60",
    footerActionLink:  "text-[#7FB8A3] hover:text-[#5E8D7A]",
  },
} as const;
