/**
 * MeshBackground — animated gradient mesh + grain layer.
 *
 * Sits BEHIND the landing-page content. Liquid Glass needs a varied
 * background to refract; without colour variance the displacement
 * collapses to looking like cheap blur. Stack (bottom → top):
 *
 *   1. solid charcoal base (the page background)
 *   2. two stacked radial gradients drifting on a 45s loop
 *   3. fine SVG grain at ~3% opacity for film texture
 *   4. content above
 *
 * No JS. Pure CSS — the browser composites the whole thing on the
 * GPU. Respects `prefers-reduced-motion` by stilling the drift.
 *
 * Mesh colour stops are tunable via CSS variables on the wrapper
 * (--mesh-a, --mesh-b, --mesh-c) so we can change palette without
 * touching the component.
 */

interface MeshBackgroundProps {
  className?: string;
}

export function MeshBackground({ className = "" }: MeshBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`mesh-background ${className}`}
      style={{
        // Default palette: charcoal → deep navy → charcoal.
        // Override via inline style if a page wants different stops.
        // Defined as CSS vars so the keyframes can reference them.
        ["--mesh-a" as never]: "#0a0d14",
        ["--mesh-b" as never]: "#11203a",
        ["--mesh-c" as never]: "#0d1320",
      }}
    >
      <div className="mesh-blob mesh-blob--a" />
      <div className="mesh-blob mesh-blob--b" />
      <div className="mesh-blob mesh-blob--c" />
      <div className="mesh-grain" />
    </div>
  );
}
