/**
 * Feature Flags React Context and Components
 * 
 * Provides feature flag state to the entire application.
 * Used to hide navigation, routes, and internal links for disabled features.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FeatureFlags } from "@shared/feature-flags";

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  isLoading: boolean;
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean;
}

// Default flags used before the API response settles. Aligned with
// the May 2026 go-live brief: Solutions and Toolkit (resources) ship
// hidden by default so they don't briefly appear in the nav during
// the cold-start before the API confirms the DB overrides. Admins
// can flip either on via /admin/feature-flags.
//
// Launch holding page configuration: only Tools (Comparison, Finance
// Compass, Vendor Directory) + Contact stay public. Marketing pages
// (about / services / solutions / blog / resources) are all flagged
// off until the full site goes live. Home renders the dark holding
// screen at /pages/holding.tsx.
const DEFAULT_FLAGS: FeatureFlags = {
  home: true,
  about: false,
  services: false,
  solutions: false,
  comparisonTools: true,
  financeCompass: true,
  blog: false,
  resources: false,
  contact: true,
  requireBusinessEmail: false,
};

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: DEFAULT_FLAGS,
  isLoading: true,
  isFeatureEnabled: () => true,
});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [shouldFetch, setShouldFetch] = useState(false);
  
  // Defer feature flags fetch until well after LCP to avoid blocking rendering.
  // LCP is typically ~1.6s, so we defer to 2.5s to ensure it loads after page is interactive.
  useEffect(() => {
    const timer = setTimeout(() => setShouldFetch(true), 2500);
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch feature flags in background - DEFERRED and NON-BLOCKING
  // We use default flags immediately and update when API responds
  const { data } = useQuery<FeatureFlags>({
    queryKey: ["/api/feature-flags"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    enabled: shouldFetch, // Only fetch after initial paint
  });
  
  useEffect(() => {
    if (data) {
      setFlags(data);
    }
  }, [data]);
  
  const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
    return flags[feature] ?? true;
  };
  
  // Always return isLoading: false to prevent blocking render
  // Since all flags default to true, content will show immediately
  return (
    <FeatureFlagContext.Provider value={{ flags, isLoading: false, isFeatureEnabled }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// Hook to access feature flags
export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

// Hook to check if a specific feature is enabled
export function useIsFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const { flags } = useFeatureFlags();
  return flags[feature] ?? true;
}

/**
 * FeatureGate Component
 * 
 * Wraps content that should only be shown when a feature is enabled.
 * When disabled, shows nothing (or optional fallback).
 */
interface FeatureGateProps {
  feature: keyof FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { flags, isLoading } = useFeatureFlags();
  
  // While loading, don't render anything to prevent flicker
  if (isLoading) {
    return null;
  }
  
  if (!flags[feature]) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * FeatureLink Component
 * 
 * A link that only renders when its target feature is enabled.
 * Use this for all internal navigation links.
 */
interface FeatureLinkProps {
  feature: keyof FeatureFlags;
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  "data-testid"?: string;
}

export function FeatureLink({ 
  feature, 
  href, 
  children, 
  className,
  onClick,
  onMouseEnter,
  "data-testid": testId,
}: FeatureLinkProps) {
  const { flags } = useFeatureFlags();
  
  // Don't render if feature is disabled
  if (!flags[feature]) {
    return null;
  }
  
  // Use wouter Link (imported in consuming component)
  return (
    <a 
      href={href} 
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      data-testid={testId}
    >
      {children}
    </a>
  );
}

// Map routes to their feature keys for easy lookup
export const ROUTE_TO_FEATURE: Record<string, keyof FeatureFlags> = {
  "/": "home",
  "/about": "about",
  "/services": "services",
  "/solutions": "solutions",
  "/tools": "comparisonTools",
  "/tools/epm-comparison": "comparisonTools",
  "/tools/erp-comparison": "comparisonTools",
  "/tools/ai-comparison": "comparisonTools",
  "/finance-compass": "financeCompass",
  "/blog": "blog",
  "/files": "resources",
  "/contact": "contact",
};

// Get feature key for a route
export function getFeatureForRoute(path: string): keyof FeatureFlags | null {
  // Check exact match first
  if (ROUTE_TO_FEATURE[path]) {
    return ROUTE_TO_FEATURE[path];
  }
  
  // Check prefix matches
  for (const [route, feature] of Object.entries(ROUTE_TO_FEATURE)) {
    if (route !== "/" && path.startsWith(route)) {
      return feature;
    }
  }
  
  return null;
}
