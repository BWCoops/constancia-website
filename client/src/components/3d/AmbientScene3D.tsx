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

// Editorial palette — deeper variants of the brand accents (the "grounded" tones
// from the brand sheet). Avoids the soft-pastel "bubble gum" look.
const BERRY     = "#8E4F67";
const DEEP_MINT = "#5E8D7A";
const STONE     = "#D8D0C6";

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
        { pos: [-1.6, 0.4, 0],  r: 1.4, color: BERRY, speed: 0.32, rot: 0.18, float: 0.55 },
        { pos: [1.4, -0.3, 0.5], r: 1.1, color: BERRY, speed: 0.28, rot: 0.14, float: 0.45 },
      ];
    case "mint-only":
      return [
        { pos: [-1.5, -0.4, 0],  r: 1.3, color: DEEP_MINT, speed: 0.32, rot: 0.18, float: 0.55 },
        { pos: [1.4,  0.3, 0.4], r: 1.1, color: DEEP_MINT, speed: 0.28, rot: 0.14, float: 0.45 },
      ];
    case "rose-mint":
    default:
      return [
        { pos: [-1.4, 0.5, 0],   r: 1.3, color: BERRY,     speed: 0.32, rot: 0.18, float: 0.55 },
        { pos: [1.2, -0.4, 0.3], r: 1.3, color: DEEP_MINT, speed: 0.28, rot: 0.16, float: 0.5 },
        { pos: [0.2, 1.2, -0.6], r: 0.55, color: STONE,    speed: 0.42, rot: 0.25, float: 0.7 },
      ];
  }
}

function SphereField({ spheres, intensity }: { spheres: SphereCfg[]; intensity: number }) {
  // Material opacity tuned UP (more solid, less translucent) to avoid bubble-gum
  const opacity = Math.max(0.55, Math.min(0.95, 0.7 + intensity * 0.25));
  return (
    <>
      <ambientLight intensity={0.22 + intensity * 0.15} />
      <directionalLight position={[5, 8, 5]} intensity={0.6 + intensity * 0.3} color="#F6F3EE" />
      <directionalLight position={[-3, 3, -2]} intensity={0.25 + intensity * 0.15} color="#D8D0C6" />
      <pointLight position={[-3, -2, -3]} intensity={0.2 + intensity * 0.2} color={BERRY} />
      <pointLight position={[3, 2, 3]} intensity={0.18 + intensity * 0.18} color={DEEP_MINT} />

      {spheres.map((s, i) => (
        <Float key={i} speed={s.speed} rotationIntensity={s.rot} floatIntensity={s.float}>
          <mesh position={s.pos}>
            <sphereGeometry args={[s.r, 64, 64]} />
            {/*
              Matte editorial material:
              - low transmission (0.06) — solid pigment, not glass candy
              - higher roughness (0.55) — diffuse highlights
              - subtle metalness (0.18) — sophisticated sculpted feel
              - subtle sheen — luxe but not shiny
            */}
            <meshPhysicalMaterial
              color={s.color}
              roughness={0.55}
              metalness={0.18}
              transmission={0.06}
              thickness={0.6}
              ior={1.08}
              opacity={opacity}
              transparent
              clearcoat={0.18}
              clearcoatRoughness={0.55}
              sheen={0.2}
              sheenColor="#F6F3EE"
              sheenRoughness={0.6}
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
