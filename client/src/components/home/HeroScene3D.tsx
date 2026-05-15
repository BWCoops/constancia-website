/**
 * HeroScene3D — Constancia hero wave background
 * ─────────────────────────────────────────────────────────────────
 * Centre-stage wave plane behind the home hero copy. Replaces the
 * previous overlapping-spheres scene (a.k.a. "the bubbles") with a
 * shader-driven sweep that opens up as you scroll.
 *
 * All rendering lives in WaveScene3D — this file just dials in the
 * hero-tier intensity and amplitude. Same export name as before so
 * call-sites in <home /> are unchanged.
 */

import { WaveScene3D } from "@/components/3d/WaveScene3D";

export function HeroScene3D() {
  return (
    <WaveScene3D
      variant="rose-mint"
      tone="deep"
      intensity={0.78}
      amplitude={0.22}
      frequency={1.35}
      vignette={0.85}
    />
  );
}
