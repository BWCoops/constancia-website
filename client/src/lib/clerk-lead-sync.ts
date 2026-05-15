/**
 * Clerk → leads bridge
 * ─────────────────────────────────────────────────────────────────
 * Provides:
 *   useClerkLead() — exposes the signed-in user's profile completeness
 *   syncLead()     — POSTs the user's Clerk + onboarding data to /api/leads/sync
 *
 * Profile fields stored in Clerk's `unsafeMetadata`:
 *   { company, jobTitle, consentMarketing }
 *
 * Email + firstName + lastName come from Clerk's primary user object
 * (set during sign-up). The DownloadGateModal short-circuits when
 * isProfileComplete is true.
 */

import { useUser } from "@clerk/clerk-react";
import { CLERK_ENABLED } from "@/lib/clerk";
import { apiRequest } from "@/lib/queryClient";

export interface ClerkLeadProfile {
  email:           string;
  firstName:       string;
  lastName:        string;
  company:         string;
  jobTitle:        string;
  consentMarketing: boolean;
  clerkUserId:     string;
}

interface ClerkLeadStatus {
  /** Clerk has loaded its session state. */
  isLoaded:           boolean;
  /** A Clerk user is signed in. */
  isSignedIn:         boolean;
  /** All four lead fields (firstName, lastName, company, jobTitle) are present. */
  isProfileComplete:  boolean;
  /** Profile data flattened, or null if not signed in. */
  profile:            ClerkLeadProfile | null;
}

export function useClerkLead(): ClerkLeadStatus {
  // useUser() is safe to call here — when CLERK_ENABLED is false the
  // ConstanciaClerkProvider returns its children unwrapped, so calling
  // useUser would throw. Gate accordingly.
  if (!CLERK_ENABLED) {
    return { isLoaded: true, isSignedIn: false, isProfileComplete: false, profile: null };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn || !user) {
    return { isLoaded, isSignedIn: !!isSignedIn, isProfileComplete: false, profile: null };
  }

  const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
  const company   = String(meta.company  ?? "").trim();
  const jobTitle  = String(meta.jobTitle ?? "").trim();
  const consent   = Boolean(meta.consentMarketing ?? false);
  const firstName = String(user.firstName ?? "").trim();
  const lastName  = String(user.lastName  ?? "").trim();
  const email     = user.primaryEmailAddress?.emailAddress ?? "";

  const isProfileComplete = Boolean(firstName && lastName && company && jobTitle && email);

  return {
    isLoaded,
    isSignedIn: true,
    isProfileComplete,
    profile: {
      email,
      firstName,
      lastName,
      company,
      jobTitle,
      consentMarketing: consent,
      clerkUserId: user.id,
    },
  };
}

/**
 * Persists the lead to our DB. Backend dedupes by clerkUserId.
 * Call after onboarding form submit OR after first download gate completion.
 */
export async function syncLead(profile: ClerkLeadProfile): Promise<void> {
  await apiRequest("POST", "/api/leads/sync", profile);
}

/**
 * Update the Clerk user's unsafeMetadata in one shot.
 * Returns the updated user; caller can re-trigger useClerkLead.
 */
export async function updateClerkProfile(
  user: NonNullable<ReturnType<typeof useUser>["user"]>,
  patch: { firstName?: string; lastName?: string; company?: string; jobTitle?: string; consentMarketing?: boolean },
): Promise<void> {
  const ops: Promise<unknown>[] = [];
  // first/last live on the user object, not metadata
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    ops.push(user.update({
      firstName: patch.firstName ?? user.firstName ?? undefined,
      lastName:  patch.lastName  ?? user.lastName  ?? undefined,
    }));
  }
  if (patch.company !== undefined || patch.jobTitle !== undefined || patch.consentMarketing !== undefined) {
    ops.push(user.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        ...(patch.company  !== undefined && { company:  patch.company  }),
        ...(patch.jobTitle !== undefined && { jobTitle: patch.jobTitle }),
        ...(patch.consentMarketing !== undefined && { consentMarketing: patch.consentMarketing }),
      },
    }));
  }
  await Promise.all(ops);
}
