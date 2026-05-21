/**
 * MeshBackground — soft cream mesh with subtle rose + mint accents.
 *
 * Previously dark-navy on charcoal — that read as "blue" and was too
 * heavy. New palette is cream-led with very low-saturation brand
 * accents drifting beneath. Provides the colour variance Liquid Glass
 * needs to refract against without becoming a foreground element.
 *
 * Mesh blob blur reduced from 80px to 36px (~55% cheaper to composite
 * per frame on mobile GPUs).
 */

interface MeshBackgroundProps {
  className?: string;
  /** When true, switches to the dark-stage palette (Services page). */
  dark?: boolean;
}

export function MeshBackground({ className = "", dark = false }: MeshBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`mesh-background ${dark ? "mesh-background--dark" : ""} ${className}`}
    >
      <div className="mesh-blob mesh-blob--a" />
      <div className="mesh-blob mesh-blob--b" />
      <div className="mesh-blob mesh-blob--c" />
      <div className="mesh-grain" />
    </div>
  );
}
