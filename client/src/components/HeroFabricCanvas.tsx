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
  uniform vec3 uStone;
  uniform vec3 uLightDir;  uniform vec3 uLightDir2;
  uniform vec3 uLightTint2;
  uniform vec3 uCamPos; uniform float uOpacity;
  varying vec2 vUv; varying float vEle; varying vec3 vNormal; varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCamPos - vWorldPos);

    // Primary key light — warm white from upper-right.
    vec3 L  = normalize(uLightDir);
    vec3 H  = normalize(L + V);
    float ndl = dot(N, L);
    float lit = clamp(ndl * 0.5 + 0.6, 0.0, 1.0);

    // Secondary light — animated direction, rose/peach tint. Gives
    // the fabric a roaming secondary highlight (the "shimmer") that
    // drifts across the surface independently of the key light.
    vec3 L2anim = normalize(uLightDir2 + vec3(
      sin(uTime * 0.18) * 0.35,
      cos(uTime * 0.13) * 0.15,
      sin(uTime * 0.11) * 0.30
    ));
    vec3 H2 = normalize(L2anim + V);
    float ndl2 = clamp(dot(N, L2anim), 0.0, 1.0);
    float lit2 = ndl2 * 0.35;

    float ele = smoothstep(-0.45, 0.55, vEle);
    vec3 hueLit   = mix(uMint, uRose, ele);
    vec3 hueShade = mix(uDeepMint, uBerry, ele);
    vec3 deepShade = mix(uSlate, uGraphite, ele);
    hueShade = mix(deepShade, hueShade, 0.55);
    vec3 col = mix(hueShade, hueLit, lit);
    // Secondary fill — adds rose-tinted brightness to the lit side,
    // softens the dark side. Reads as bounce light / ambient warmth.
    col += uLightTint2 * lit2 * 0.18;

    // Primary specular — sharp warm-white pinpoint.
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 96.0);
    col += vec3(1.0, 0.97, 0.94) * spec * 0.40;
    // Secondary specular — softer, stone-tinted, animated. This is
    // the shimmer that travels across the fabric.
    float spec2 = pow(clamp(dot(N, H2), 0.0, 1.0), 52.0);
    col += uLightTint2 * spec2 * 0.55;
    // Low-frequency sheen — wet-glass catching light across the
    // whole plane. Tinted with Stone (support neutral) so the broad
    // glaze reads as cool glass, not warm pearl. This is the main
    // glass-morphic body lift.
    float sheen = pow(clamp(dot(N, H), 0.0, 1.0), 12.0);
    col += uStone * sheen * 0.22;

    // Anisotropic highlight — stretches the spec along an approximate
    // tangent direction so the gleam reads as silk / polished glass
    // (a long streak), not a point light. Built from the surface
    // slope so it follows the wave flow.
    vec3 T = normalize(vec3(1.0, 0.0, -vEle * 0.6));
    float TdH = dot(T, H2);
    float aniso = sqrt(max(0.0, 1.0 - TdH * TdH));
    float anisoSpec = pow(aniso, 26.0);
    col += uStone * anisoSpec * 0.20;

    // Travelling caustic band — a single diagonal bright ripple
    // sweeps across the surface (was two crossed bands; one delivers
    // ~95% of the visual at half the cost). Intensity bumped to
    // 0.20 to keep the glassy refraction punch.
    float causticPos = vUv.x * 1.8 + vUv.y * 1.0 - uTime * 0.16;
    float caustic = pow(0.5 + 0.5 * sin(causticPos * 5.5), 8.0);
    col += uStone * caustic * 0.20;

    // Iridescent rim with a view-angle hue shift — Stone neutral
    // through to Mineral green to Muted rose across the rim. The
    // Stone in the middle softens the chromatic transition and adds
    // that frosted-glass edge quality.
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);
    vec3 rimHue = mix(uMint * 1.05, uStone, smoothstep(0.0, 0.5, rim));
    rimHue = mix(rimHue, uRose * 1.08, smoothstep(0.5, 1.0, rim));
    col = mix(col, rimHue, rim * 0.38);

    // Breathing — overall surface luminance pulses subtly so the
    // fabric feels alive even when held still. 7s cycle, ±3% range.
    float breath = 0.5 + 0.5 * sin(uTime * 0.42);
    col *= 0.97 + 0.06 * breath;
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
      // Official Constancia palette — see brand brief.
      MINT:     new THREE.Color("#7FB8A3"),  // Mineral green
      DEEPMINT: new THREE.Color("#5E8D7A"),  // Deep mint
      ROSE:     new THREE.Color("#C77A93"),  // Muted rose
      BERRY:    new THREE.Color("#8E4F67"),  // Deep berry
      SLATE:    new THREE.Color("#252826"),  // Secondary dark (soft graphite charcoal)
      GRAPHITE: new THREE.Color("#1A1B1A"),  // Deeper variant of secondary dark
      STONE:    new THREE.Color("#D8D0C6"),  // Support neutral light (folded into shimmer)
    };
    const LIGHT_DIR  = new THREE.Vector3(0.6, 0.85, 0.7).normalize();
    // Secondary light — comes from the opposite-lower angle so the
    // two highlights cross. Tint is the Support neutral (#D8D0C6)
    // not a peach pearl — gives the fabric a stone-cool glass-
    // morphic shimmer instead of a warm sunset feel. Shader animates
    // the direction over uTime, this is just the rest position.
    const LIGHT_DIR_2  = new THREE.Vector3(-0.7, 0.45, 0.55).normalize();
    const LIGHT_TINT_2 = COL.STONE.clone();

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
          uStone:    { value: COL.STONE },
          uLightDir:   { value: LIGHT_DIR },
          uLightDir2:  { value: LIGHT_DIR_2 },
          uLightTint2: { value: LIGHT_TINT_2 },
          uCamPos:     { value: camera.position },
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

    // Five stacked fabric layers. Amplitudes + opacities bumped so
    // the waves pop a touch more under the glass mission card — the
    // displacement scale on the card needs varied colour underneath
    // to read as Apple-style liquid glass.
    // Four stacked fabric layers (was 5 — the back-most at posZ -11.5
    // was almost entirely fogged out, dropping it gives ~20 % less
    // GPU per frame with zero visible change). The remaining four
    // have their opacities bumped slightly to preserve the same
    // overall depth feel.
    const LAYERS = [
      makeFabric({ size: 10.0, segs: seg(200), amp: 1.05, phase: 2.4, posY: -0.20, posZ:  0.4,   rotX: -Math.PI * 0.50, rotZ: -0.04, baseOpacity: 0.24 }),
      makeFabric({ size: 11.0, segs: seg(180), amp: 1.20, phase: 0.0, posY: -0.30, posZ: -2.5,   rotX: -Math.PI * 0.46, rotZ:  0.08, baseOpacity: 0.33 }),
      makeFabric({ size: 12.0, segs: seg(160), amp: 1.30, phase: 1.1, posY: -0.45, posZ: -5.5,   rotX: -Math.PI * 0.52, rotZ: -0.06, baseOpacity: 0.40 }),
      makeFabric({ size: 13.0, segs: seg(140), amp: 1.35, phase: 3.0, posY: -0.55, posZ: -8.5,   rotX: -Math.PI * 0.44, rotZ:  0.05, baseOpacity: 0.44 }),
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

    const startTime = performance.now();
    let pausedDuration = 0;
    let pauseStart = -1;
    let rafId = 0;
    let pSmooth = 0;
    // The ScrollyStage IntersectionObserver toggles data-paused on
    // the .scrolly-stage__fabric-wrap parent when the stage is off
    // screen — we skip rendering entirely while paused so the GPU is
    // freed for the rest of the page (or saved on battery).
    function isPaused(): boolean {
      const wrap = canvas?.parentElement as HTMLElement | null;
      return wrap?.dataset.paused === "true";
    }
    function tick() {
      if (isPaused()) {
        // Don't advance uTime while paused so the wave doesn't snap
        // when we come back.
        if (pauseStart < 0) pauseStart = performance.now();
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (pauseStart >= 0) {
        pausedDuration += performance.now() - pauseStart;
        pauseStart = -1;
      }
      const t = (performance.now() - startTime - pausedDuration) / 1000;
      // Smooth the scroll progress so jumps don't snap.
      pSmooth += (scrollProgress - pSmooth) * 0.08;
      // Map 0..1 to a -0.5..0.5 range for symmetric tilt about the
      // hero midpoint.
      const sx = pSmooth - 0.5;
      // Camera dollies forward on scroll so the user feels they're
      // moving through the stacked fabric layers. From z=5 (default)
      // to z=-2 takes the camera past the first three planes
      // (z = 0.4, -2.5, -5.5), revealing the back layers as the
      // front ones slide overhead.
      camera.position.z = 5.0 - pSmooth * 7.0;
      // Subtle counter-tilt about the hero midpoint so the fabric
      // still feels alive when you scroll. Small angle — too much
      // here turns the dolly into a tumble.
      camera.rotation.z = sx * 0.04;

      LAYERS.forEach((mesh, i) => {
        const mat = mesh.material as THREENS.ShaderMaterial;
        if (!reduced) mat.uniforms.uTime.value = t;
        // Each layer also tilts a touch in y for parallax body.
        // Front layers tilt more than back, scaled by index.
        const depthFactor = 1 - i * 0.12;
        mesh.rotation.y = sx * 0.10 * depthFactor;
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
