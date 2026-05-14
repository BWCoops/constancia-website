/**
 * AmbientScene3D — reusable Constancia 3D background
 * ─────────────────────────────────────────────────────────────────
 * Subtle 3-sphere drift scene for use as a background layer on any
 * page hero. Less dramatic than HeroScene3D — calibrated for restraint.
 *
 *   <AmbientScene3D variant="rose-mint" intensity={0.6} />
 *
 * Performance:
 *   - Single Canvas, lazy-loaded by caller
 *   - Reduced-motion: returns null
 *   - low-power GL preference, capped DPR
 *   - All meshes use Float wrapper for organic motion (no per-frame state)
 */

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";

interface AmbientSceneProps {
  /** Visual intensity 0-1. Maps to material opacity + light strength. */
  intensity?: number;
  /** Colour mood. */
  variant?: "rose-mint" | "rose-only" | "mint-only";
  /** Mount-positioning class on the wrapper div. */
  className?: string;
}

const ROSE = "#C77A93";
const MINT = "#7FB8A3";
const BERRY = "#8E4F67";
const DEEP_MINT = "#5E8D7A";

interface SphereCfg {
  pos: [number, number, number];
  r: number;
  color: string;
  speed: number;
  rot: number;
  float: number;
}

function configFor(variant: AmbientSceneProps["variant"]): SphereCfg[] {
  switch (variant) {
    case "rose-only":
      return [
        { pos: [-1.6, 0.4, 0],  r: 1.4, color: ROSE,  speed: 0.5, rot: 0.3, float: 0.8 },
        { pos: [1.4, -0.3, 0.5], r: 1.1, color: BERRY, speed: 0.4, rot: 0.2, float: 0.6 },
      ];
    case "mint-only":
      return [
        { pos: [-1.5, -0.4, 0],  r: 1.3, color: MINT,      speed: 0.5, rot: 0.3, float: 0.8 },
        { pos: [1.4,  0.3, 0.4], r: 1.1, color: DEEP_MINT, speed: 0.4, rot: 0.2, float: 0.6 },
      ];
    case "rose-mint":
    default:
      return [
        { pos: [-1.4, 0.5, 0],   r: 1.3, color: ROSE, speed: 0.5, rot: 0.3, float: 0.8 },
        { pos: [1.2, -0.4, 0.3], r: 1.3, color: MINT, speed: 0.4, rot: 0.25, float: 0.7 },
        { pos: [0.2, 1.2, -0.6], r: 0.6, color: BERRY, speed: 0.6, rot: 0.4, float: 1.0 },
      ];
  }
}

function SphereField({ spheres, intensity }: { spheres: SphereCfg[]; intensity: number }) {
  const opacity = Math.max(0.3, Math.min(0.85, 0.55 + intensity * 0.3));
  return (
    <>
      <ambientLight intensity={0.3 + intensity * 0.2} />
      <directionalLight position={[5, 8, 5]} intensity={0.7 + intensity * 0.4} color="#F6F3EE" />
      <pointLight position={[-3, -2, -3]} intensity={0.3 + intensity * 0.3} color={ROSE} />
      <pointLight position={[3, 2, 3]} intensity={0.25 + intensity * 0.25} color={MINT} />

      {spheres.map((s, i) => (
        <Float key={i} speed={s.speed} rotationIntensity={s.rot} floatIntensity={s.float}>
          <mesh position={s.pos}>
            <sphereGeometry args={[s.r, 48, 48]} />
            <meshPhysicalMaterial
              color={s.color}
              roughness={0.35}
              metalness={0.04}
              transmission={0.35}
              thickness={1.1}
              ior={1.32}
              opacity={opacity}
              transparent
              clearcoat={0.5}
              clearcoatRoughness={0.22}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

export function AmbientScene3D({
  intensity = 0.6,
  variant = "rose-mint",
  className,
}: AmbientSceneProps) {
  const prefersReducedMotion =
    typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const spheres = useMemo(() => configFor(variant), [variant]);

  if (prefersReducedMotion) return null;

  return (
    <div className={className ?? "absolute inset-0 pointer-events-none"} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <SphereField spheres={spheres} intensity={intensity} />
        </Suspense>
      </Canvas>
    </div>
  );
}
