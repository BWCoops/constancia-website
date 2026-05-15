/**
 * WaveScene3D — Constancia editorial wave plane
 * ─────────────────────────────────────────────────────────────────
 * Replaces the previous sphere-based scenes. A high-poly plane is
 * displaced by a stack of sine waves in the vertex shader and lit
 * by a rose↔mint gradient in the fragment shader. The whole plane
 * "opens up" as the user scrolls — amplitude grows, the surface
 * unfurls, opacity reveals.
 *
 * Used by both <HeroScene3D /> (centre stage) and <AmbientScene3D />
 * (page-background layer). Both wrap this with different intensity +
 * tilt presets.
 *
 * Performance:
 *   - Single Canvas, lazy-loaded by caller
 *   - prefers-reduced-motion → returns null
 *   - DPR capped at 1.5; low-power GL preference
 *   - 128×96 plane segments (12,288 verts) — comfortably 60fps on integrated GPUs
 *   - Scroll listener is passive + writes to a ref (no React re-render)
 */

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, type ShaderMaterial as ShaderMaterialType } from "three";

// Editorial palette — same deep tones as the rest of the 3D system
const BERRY     = "#8E4F67";
const DEEP_MINT = "#5E8D7A";
const ROSE      = "#C77A93";
const MINT      = "#7FB8A3";

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;     // 0..1 — drives the "opening up" feel
  uniform float uAmplitude;
  uniform float uFrequency;

  varying vec2  vUv;
  varying float vElevation;

  void main() {
    vec3 pos = position;

    // Layered sine waves — three octaves at different speeds and phases so
    // the surface never repeats visibly. Subtle phase shifts driven by
    // (x + y) for diagonal flow that matches the brand sweep.
    float wave1 = sin(pos.x * uFrequency               + uTime * 0.40) * uAmplitude;
    float wave2 = sin(pos.y * uFrequency * 0.70        + uTime * 0.27) * uAmplitude * 0.62;
    float wave3 = sin((pos.x + pos.y * 0.5) * uFrequency * 0.45
                       - uTime * 0.18) * uAmplitude * 0.42;

    float elevation = wave1 + wave2 + wave3;

    // Scroll opens the waves: amplitude grows, surface unfurls (Y lift)
    pos.z += elevation * (1.0 + uScroll * 1.1);
    pos.y += elevation * uScroll * 0.35;

    vUv        = uv;
    vElevation = elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec3  uColorA;     // rose
  uniform vec3  uColorB;     // mint
  uniform float uOpacity;
  uniform float uVignette;   // 0..1 — softness of edge fade

  varying vec2  vUv;
  varying float vElevation;

  void main() {
    // Diagonal gradient — rose flows into mint along the page sweep
    float t = vUv.x * 0.55 + vUv.y * 0.45;

    // Subtle organic distortion so the gradient breathes
    t += sin(vUv.y * 4.0 + uTime * 0.30) * 0.08;
    t += cos(vUv.x * 3.0 - uTime * 0.22) * 0.05;

    vec3 color = mix(uColorA, uColorB, smoothstep(0.15, 0.85, t));

    // Wave peaks brighten — what catches the light
    float intensity = 0.55 + vElevation * 1.3;

    // Soft radial vignette: keep the glow centred, fade to dark at edges
    vec2  centred  = vUv - 0.5;
    float vignette = 1.0 - smoothstep(0.32, 0.85, length(centred) * uVignette);

    // Scroll reveals — fully opaque around the half-scroll mark
    float scrollAlpha = mix(0.45, 0.92, smoothstep(0.0, 0.55, uScroll));

    float alpha = uOpacity * intensity * vignette * scrollAlpha;
    gl_FragColor = vec4(color, alpha);
  }
`;

interface WavePlaneProps {
  intensity: number;
  colorA: string;
  colorB: string;
  amplitude: number;
  frequency: number;
  vignette: number;
  scrollRef: React.MutableRefObject<number>;
}

function WavePlane({
  intensity,
  colorA,
  colorB,
  amplitude,
  frequency,
  vignette,
  scrollRef,
}: WavePlaneProps) {
  const matRef = useRef<ShaderMaterialType>(null);

  // Construct uniforms ONCE — subsequent prop changes patch in via useEffect
  const uniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uScroll:    { value: 0 },
      uAmplitude: { value: amplitude },
      uFrequency: { value: frequency },
      uColorA:    { value: new Color(colorA) },
      uColorB:    { value: new Color(colorB) },
      uOpacity:   { value: intensity },
      uVignette:  { value: vignette },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Patch uniforms when props change without rebuilding the material
  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uAmplitude.value = amplitude;
    matRef.current.uniforms.uFrequency.value = frequency;
    matRef.current.uniforms.uOpacity.value   = intensity;
    matRef.current.uniforms.uVignette.value  = vignette;
    matRef.current.uniforms.uColorA.value.set(colorA);
    matRef.current.uniforms.uColorB.value.set(colorB);
  }, [amplitude, frequency, intensity, vignette, colorA, colorB]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value   = state.clock.elapsedTime;
    matRef.current.uniforms.uScroll.value = scrollRef.current;
  });

  return (
    // Tilt + slight roll = the diagonal sweep from the brand mark
    <mesh rotation={[-Math.PI / 7, 0, -Math.PI / 14]}>
      <planeGeometry args={[12, 7, 128, 96]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/** Map "rose-mint" / "rose-only" / "mint-only" + tone to the two-color pair. */
function paletteFor(
  variant: WaveSceneProps["variant"],
  tone: WaveSceneProps["tone"],
): { a: string; b: string } {
  const useDeep = tone === "deep";
  const rose = useDeep ? BERRY : ROSE;
  const mint = useDeep ? DEEP_MINT : MINT;
  switch (variant) {
    case "rose-only": return { a: rose, b: rose };
    case "mint-only": return { a: mint, b: mint };
    case "rose-mint":
    default:          return { a: rose, b: mint };
  }
}

export interface WaveSceneProps {
  /** 0..1, drives material opacity. 0.4 ambient, 0.7 hero. */
  intensity?: number;
  /** Colour mood. */
  variant?: "rose-mint" | "rose-only" | "mint-only";
  /** "deep" uses the grounded berry/deep-mint pair. "bright" uses lighter accents. */
  tone?: "deep" | "bright";
  /** Wave-displacement strength. Hero ≈ 0.22, ambient ≈ 0.14. */
  amplitude?: number;
  /** Wave density. 1.4 reads as "ribbons", 0.8 as "swells". */
  frequency?: number;
  /** Edge fade strength. 1.0 = standard, >1 = tighter centre, <1 = wider glow. */
  vignette?: number;
  /** Mount-positioning class on the wrapper div. */
  className?: string;
}

export function WaveScene3D({
  intensity = 0.6,
  variant   = "rose-mint",
  tone      = "deep",
  amplitude = 0.18,
  frequency = 1.4,
  vignette  = 1.0,
  className,
}: WaveSceneProps) {
  // Reduced-motion users get nothing — surface is purely decorative
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Scroll progress in a ref → useFrame reads it without re-rendering
  const scrollRef = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const update = () => {
      // Map the first 1.5 viewport heights of scroll to 0..1 — by the time
      // you're a viewport-and-a-half down, the wave is fully "open".
      const max = window.innerHeight * 1.5;
      scrollRef.current = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  const { a, b } = paletteFor(variant, tone);

  return (
    <div className={className ?? "absolute inset-0 pointer-events-none"} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <WavePlane
            intensity={intensity}
            colorA={a}
            colorB={b}
            amplitude={amplitude}
            frequency={frequency}
            vignette={vignette}
            scrollRef={scrollRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
