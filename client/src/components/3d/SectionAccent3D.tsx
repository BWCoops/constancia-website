/**
 * SectionAccent3D — small floating sphere for between-section punctuation
 * ─────────────────────────────────────────────────────────────────
 * Single matte sphere. Sits in section dividers to bring the brand mark's
 * geometry through to the body of the page without flooding it.
 *
 *   <SectionAccent3D variant="berry" />
 *   <SectionAccent3D variant="mint" align="left" />
 *
 * Lazy by default — caller wraps in <Suspense>.
 */

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";

interface Props {
  variant?: "berry" | "mint" | "stone";
  align?: "left" | "center" | "right";
  /** Pixel height of the SVG-like accent. Default 180. */
  size?: number;
  className?: string;
}

const COLOR: Record<NonNullable<Props["variant"]>, string> = {
  berry: "#8E4F67",
  mint:  "#5E8D7A",
  stone: "#D8D0C6",
};

function Sphere({ color }: { color: string }) {
  return (
    <Float speed={0.45} rotationIntensity={0.25} floatIntensity={0.7}>
      <mesh>
        <sphereGeometry args={[1.4, 96, 96]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.55}
          metalness={0.18}
          transmission={0.06}
          thickness={0.6}
          ior={1.08}
          opacity={0.92}
          transparent
          clearcoat={0.18}
          clearcoatRoughness={0.55}
          sheen={0.22}
          sheenColor="#F6F3EE"
          sheenRoughness={0.6}
        />
      </mesh>
    </Float>
  );
}

export function SectionAccent3D({
  variant = "berry",
  align = "center",
  size = 180,
  className,
}: Props) {
  const prefersReducedMotion =
    typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) return null;

  const justify =
    align === "left"   ? "justify-start" :
    align === "right"  ? "justify-end"   : "justify-center";

  return (
    <div className={`flex ${justify} ${className ?? ""}`} aria-hidden="true">
      <div style={{ width: size, height: size }}>
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 38 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.32} />
          <directionalLight position={[5, 8, 5]} intensity={0.9} color="#F6F3EE" />
          <directionalLight position={[-3, 3, -2]} intensity={0.35} color="#D8D0C6" />
          <pointLight position={[-3, -2, -3]} intensity={0.3} color={COLOR[variant]} />
          <Suspense fallback={null}>
            <Sphere color={COLOR[variant]} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
