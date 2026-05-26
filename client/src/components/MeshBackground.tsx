/**
 * MeshBackground — soft cream mesh with subtle rose + mint accents.
 *
 * Three large blurred radial blobs (rose / mineral green / berry)
 * drift across a cream surface, providing the colour variance the
 * glass tablets refract against. Blob blur 36px (~55% cheaper to
 * composite per frame on mobile GPUs than the original 80px).
 */

interface MeshBackgroundProps {
  className?: string;
}

export function MeshBackground({ className = "" }: MeshBackgroundProps) {
  return (
    <div aria-hidden="true" className={`mesh-background ${className}`}>
      <div className="mesh-blob mesh-blob--a" />
      <div className="mesh-blob mesh-blob--b" />
      <div className="mesh-blob mesh-blob--c" />
      <div className="mesh-grain" />
    </div>
  );
}
