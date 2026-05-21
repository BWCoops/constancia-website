/**
 * HeroFabricCanvas — 3D soft wave / flame / band shader background.
 *
 * Five stacked WebGL plane meshes with a brand-coloured displacement
 * shader. The vertex shader animates organic multi-frequency sine
 * waves on the z-axis; the fragment shader lights them with a soft
 * mint↔rose gradient + spec highlight + rim light + cream fog so the
 * whole stack reads as soft flowing bands of fabric/flame moving
 * behind the content.
 *
 * Designed for the May 2026 landing hero as ambient depth. Renders
 * BEHIND the mesh blobs, wave rings, and connection diagram so it's
 * the deepest layer of the composition.
 *
 * Performance:
 *   - Mobile gets a trimmed segment count + tighter DPR cap.
 *   - Lazy-mounted via requestIdleCallback by the parent so it
 *     doesn't block first paint.
 *   - prefers-reduced-motion freezes the time uniform.
 *   - WebGL context failure is silent (canvas just stays blank) so
 *     no crash on low-spec or headless environments.
 *
 * Extracted from the legacy HeroSectionStatic shader. Opacity values
 * dialled down (~50% of the original) so the effect is markedly
 * softer in the new composition.
 */

import { useEffect, useRef } from "react";
import type * as THREENS from "three";

interface HeroFabricCanvasProps {
  className?: string;
}

const VERT = `
  uniform float uTime; uniform float uPhase; uniform float uAmp;
  varying vec2 vUv; varying float vEle; varying vec3 vNormal; varying vec3 vWorldPos;
  float wave(vec2 p, float t, float ph) {
    return sin(p.x * 0.75 + t * 0.08 + ph)         * 0.40
         + cos(p.y * 0.55 - t * 0.06 + ph * 1.3)    * 0.34
         + sin((p.x + p.y) * 1.05 + t * 0.10 + ph)  * 0.18
         + cos((p.x * 1.7 - p.y * 0.85) + t * 0.05) * 0.13
         + sin((p.x * 0.4 + p.y * 1.2) - t * 0.07)  * 0.08;
  }
  void main() {
    vUv = uv;
    vec3 pos = position;
    float h = wave(pos.xy, uTime, uPhase) * uAmp;
    pos.z += h; vEle = h;
    float e = 0.06;
    float hx = (wave(pos.xy + vec2(e,0.0), uTime, uPhase) - wave(pos.xy - vec2(e,0.0), uTime, uPhase)) * uAmp;
    float hy = (wave(pos.xy + vec2(0.0,e), uTime, uPhase) - wave(pos.xy - vec2(0.0,e), uTime, uPhase)) * uAmp;
    vec3 n = normalize(vec3(-hx/(2.0*e), -hy/(2.0*e), 1.0));
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = `
  uniform float uTime; uniform vec3 uMint; uniform vec3 uDeepMint;
  uniform vec3 uRose; uniform vec3 uBerry;
  uniform vec3 uSlate; uniform vec3 uGraphite;
  uniform vec3 uLightDir; uniform vec3 uCamPos; uniform float uOpacity;
  varying vec2 vUv; varying float vEle; varying vec3 vNormal; varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 H = normalize(L + V);
    float ndl = dot(N, L);
    float lit = clamp(ndl * 0.5 + 0.6, 0.0, 1.0);
    float ele = smoothstep(-0.45, 0.55, vEle);
    vec3 hueLit   = mix(uMint, uRose, ele);
    vec3 hueShade = mix(uDeepMint, uBerry, ele);
    vec3 deepShade = mix(uSlate, uGraphite, ele);
    hueShade = mix(deepShade, hueShade, 0.55);
    vec3 col = mix(hueShade, hueLit, lit);
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 64.0);
    col += vec3(1.0, 0.97, 0.94) * spec * 0.22;
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.8);
    col = mix(col, mix(uMint, uRose, ele) * 1.08, rim * 0.22);
    float edgeX = smoothstep(0.0, 0.26, vUv.x) * smoothstep(1.0, 0.74, vUv.x);
    float edgeY = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    float edge = edgeX * edgeY;
    float depth = smoothstep(2.0, 14.0, length(vWorldPos.xz));
    // Slate depth-tint dialled down (0.45→0.18, mix factor 0.32→0.18)
    // so the rear fabric layers don't read as a navy/blue band at the
    // top of the canvas. Per user feedback.
    col = mix(col, uSlate * 0.18, depth * 0.18);
    float fog = smoothstep(22.0, 4.0, length(vWorldPos.xz));
    col = mix(vec3(0.965, 0.953, 0.933), col, fog * 0.88);
    gl_FragColor = vec4(col, edge * uOpacity);
  }
`;

export function HeroFabricCanvas({ className }: HeroFabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    // Three.js is heavy — dynamic-import it so the public landing
    // bundle doesn't carry ~120KB of WebGL machinery on first paint.
    // The canvas itself is already lazy-mounted via requestIdleCallback
    // upstream, so by the time we get here first paint is past.
    import("three").then((THREE) => {
      if (cancelled || !canvas) return;
      cleanup = boot(THREE);
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };

    function boot(THREE: typeof THREENS): () => void {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREENS.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas!, antialias: true, alpha: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0xF6F3EE, 0); // transparent so the mesh blobs show through
    } catch {
      return () => {}; // silent fallback — no shader, just static page
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(0, 0.9, 5.0);
    camera.lookAt(0, 0, 0);

    const COL = {
      MINT:     new THREE.Color("#7FB8A3"),
      DEEPMINT: new THREE.Color("#5E8D7A"),
      ROSE:     new THREE.Color("#C77A93"),
      BERRY:    new THREE.Color("#8E4F67"),
      SLATE:    new THREE.Color("#1E2630"),
      GRAPHITE: new THREE.Color("#12161D"),
    };
    const LIGHT_DIR = new THREE.Vector3(0.6, 0.85, 0.7).normalize();

    interface FabricOpts {
      size: number; segs: number; amp: number; phase: number;
      posY: number; posZ: number; rotX: number; rotZ: number; baseOpacity: number;
    }
    function makeFabric(opts: FabricOpts) {
      const geo = new THREE.PlaneGeometry(opts.size, opts.size * 0.62, opts.segs, Math.floor(opts.segs * 0.62));
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: {
          uTime:     { value: 0 },
          uPhase:    { value: opts.phase },
          uAmp:      { value: opts.amp },
          uOpacity:  { value: opts.baseOpacity },
          uMint:     { value: COL.MINT },
          uDeepMint: { value: COL.DEEPMINT },
          uRose:     { value: COL.ROSE },
          uBerry:    { value: COL.BERRY },
          uSlate:    { value: COL.SLATE },
          uGraphite: { value: COL.GRAPHITE },
          uLightDir: { value: LIGHT_DIR },
          uCamPos:   { value: camera.position },
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = opts.rotX;
      mesh.rotation.z = opts.rotZ;
      mesh.position.set(0, opts.posY, opts.posZ);
      // Stash the resting transform on userData so the per-frame tick
      // can offset from it without drift.
      mesh.userData.posY = opts.posY;
      mesh.userData.rotZ = opts.rotZ;
      scene.add(mesh);
      return mesh;
    }

    const isMobile = window.innerWidth <= 768;
    const segScale = isMobile ? 0.55 : 1;
    const seg = (n: number) => Math.max(48, Math.floor(n * segScale));

    // Five stacked fabric layers. Opacity values ~50% of the legacy
    // hero so the effect is markedly softer behind the new mission
    // card + diagram + waves.
    const LAYERS = [
      makeFabric({ size: 10.0, segs: seg(200), amp: 0.85, phase: 2.4, posY: -0.20, posZ:  0.4,   rotX: -Math.PI * 0.50, rotZ: -0.04, baseOpacity: 0.15 }),
      makeFabric({ size: 11.0, segs: seg(180), amp: 0.95, phase: 0.0, posY: -0.30, posZ: -2.5,   rotX: -Math.PI * 0.46, rotZ:  0.08, baseOpacity: 0.21 }),
      makeFabric({ size: 12.0, segs: seg(160), amp: 1.00, phase: 1.1, posY: -0.45, posZ: -5.5,   rotX: -Math.PI * 0.52, rotZ: -0.06, baseOpacity: 0.26 }),
      makeFabric({ size: 13.0, segs: seg(140), amp: 1.05, phase: 3.0, posY: -0.55, posZ: -8.5,   rotX: -Math.PI * 0.44, rotZ:  0.05, baseOpacity: 0.30 }),
      makeFabric({ size: 14.0, segs: seg(120), amp: 1.10, phase: 4.2, posY: -0.65, posZ: -11.5,  rotX: -Math.PI * 0.50, rotZ: -0.03, baseOpacity: 0.31 }),
    ];

    function resizeWithDpr() {
      const w = window.innerWidth, h = window.innerHeight;
      const dprCap = isMobile ? 1.5 : 2;
      if (renderer) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
        renderer.setSize(w, h, false);
      }
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resizeWithDpr();
    window.addEventListener("resize", resizeWithDpr);

    // Scroll-driven parallax — the fabric stack tilts/drifts as the
    // user scrolls through the hero. Replaces the previous pointer
    // parallax, which felt like a mouse-tracker rather than a
    // narrative. Hero is 320vh tall, so scrollProgress goes 0 → 1
    // over 220vh of scroll (since the inner is 100vh sticky).
    let scrollProgress = 0;
    function readScrollProgress() {
      if (!canvas) return;
      const stage = canvas.parentElement; // .landing-hero__inner -> .landing-hero
      const hero = stage?.parentElement ?? null;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      // 0 when hero top is at viewport top; 1 when hero bottom hits
      // viewport bottom.
      scrollProgress = Math.min(1, Math.max(0, -rect.top / total));
    }
    readScrollProgress();
    window.addEventListener("scroll", readScrollProgress, { passive: true });

    const clock = new THREE.Clock();
    let rafId = 0;
    let pSmooth = 0;
    function tick() {
      const t = clock.getElapsedTime();
      // Smooth the scroll progress so jumps don't snap.
      pSmooth += (scrollProgress - pSmooth) * 0.08;
      // Map 0..1 to a -0.5..0.5 range for symmetric tilt about the
      // hero midpoint.
      const sx = pSmooth - 0.5;
      LAYERS.forEach((mesh, i) => {
        const mat = mesh.material as THREENS.ShaderMaterial;
        if (!reduced) mat.uniforms.uTime.value = t;
        // Scroll-driven tilt only — no position shifts. The fabric
        // stays anchored on screen across the whole 320vh scroll so
        // scrolling up/down moves "through" the fabric (like looking
        // through different angles of a folded sheet) instead of
        // pushing it off the edges. Front layers tilt more than back.
        const depthFactor = 1 - i * 0.12;
        mesh.rotation.y = sx * 0.18 * depthFactor;
        mesh.rotation.z = (mesh.userData.rotZ ?? mesh.rotation.z) + sx * 0.06 * depthFactor;
      });
      if (renderer) renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resizeWithDpr);
      window.removeEventListener("scroll", readScrollProgress);
      LAYERS.forEach(mesh => {
        mesh.geometry.dispose();
        (mesh.material as THREENS.ShaderMaterial).dispose();
      });
      renderer?.dispose();
    };
    } // close boot()
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`hero-fabric-canvas ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
