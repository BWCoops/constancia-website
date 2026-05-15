/**
 * AmbientScene3D — reusable Constancia 3D background
 * ─────────────────────────────────────────────────────────────────
 * Subtle wave background for use on any page hero. Calmer than
 * <HeroScene3D /> — lower amplitude, softer vignette, restraint.
 *
 *   <AmbientScene3D variant="rose-mint" intensity={0.5} />
 *
 * Implementation lives in WaveScene3D — this just dials in ambient
 * presets. Same export + prop API as before so existing call-sites
 * (PageHero, FinanceCompassDashboard, FinanceCompassResults) work
 * unchanged.
 */

import { WaveScene3D } from "@/components/3d/WaveScene3D";

interface AmbientSceneProps {
  /** Visual intensity 0-1. Maps to material opacity. */
  intensity?: number;
  /** Colour mood. */
  variant?: "rose-mint" | "rose-only" | "mint-only";
  /** Mount-positioning class on the wrapper div. */
  className?: string;
}

export function AmbientScene3D({
  intensity = 0.5,
  variant   = "rose-mint",
  className,
}: AmbientSceneProps) {
  return (
    <WaveScene3D
      variant={variant}
      tone="deep"
      intensity={intensity}
      amplitude={0.14}
      frequency={1.25}
      vignette={1.05}
      className={className}
    />
  );
}
