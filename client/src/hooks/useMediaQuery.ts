import { useEffect, useState } from "react";

/**
 * useMediaQuery — subscribes to a CSS media query and returns its
 * current match state. SSR-safe (starts at false on the server,
 * resolves on mount). Used by LiquidGlassCard to scale down on
 * mobile and to honour `prefers-reduced-motion`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
