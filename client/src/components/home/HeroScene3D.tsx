/**
 * HeroScene3D — Constancia overlapping spheres in real WebGL
 * ─────────────────────────────────────────────────────────────────
 * Replaces the 2D HeroParticleCanvas with a real Three.js scene:
 * two large semi-transparent spheres (rose + mineral-green) slowly
 * orbiting in 3D, responding to scroll position and cursor parallax.
 *
 * Performance: lazy-loaded, gated by reduced-motion + low-power devices.
 * Renders behind hero content at low opacity so text stays the hero.
 *
 * Brand fidelity: uses the Constancia palette (rose #C77A93, mint #7FB8A3)
 * at ~0.55 material opacity so the overlap zone reads as the brand mark.
 */

import { Suspense, useRef } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Mesh } from "three";

interface SphereProps {
  position: [number, number, number];
  color: string;
  radius?: number;
  rotateSpeed?: number;
}

function BrandSphere({ position, color, radius = 1.6, rotateSpeed = 0.08 }: SphereProps) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * rotateSpeed;
    ref.current.rotation.y += delta * rotateSpeed * 0.65;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[radius, 96, 96]} />
      {/*
        Material tuned for editorial feel — NOT bubble-gum:
        - low transmission so it reads as solid pigment, not glass candy
        - subtle metalness for sophistication (think gallery sculpture)
        - matte clearcoat for understated sheen
        - higher roughness so highlights are diffused
      */}
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
        sheen={0.25}
        sheenColor="#F6F3EE"
        sheenRoughness={0.6}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      {/* Editorial lighting — restrained, museum-quality */}
      <ambientLight intensity={0.28} />
      <directionalLight position={[6, 10, 6]} intensity={0.85} color="#F6F3EE" />
      <directionalLight position={[-4, 4, -2]} intensity={0.35} color="#D8D0C6" />
      <pointLight position={[-5, -2, -3]} intensity={0.32} color="#8E4F67" />
      <pointLight position={[5, 2, 3]} intensity={0.26} color="#5E8D7A" />

      {/* Deep berry sphere — upper-left, the grounded primary */}
      <Float speed={0.4} rotationIntensity={0.25} floatIntensity={0.7}>
        <BrandSphere position={[-1.0, 0.6, 0]} color="#8E4F67" radius={1.75} />
      </Float>

      {/* Deep mint sphere — lower-right, overlapping */}
      <Float speed={0.35} rotationIntensity={0.2} floatIntensity={0.6}>
        <BrandSphere position={[0.9, -0.5, 0.35]} color="#5E8D7A" radius={1.75} rotateSpeed={0.06} />
      </Float>
    </>
  );
}

export function HeroScene3D() {
  // Respect prefers-reduced-motion at the canvas level
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 42 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
