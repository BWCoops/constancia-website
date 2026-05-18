import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { useFeatureFlags } from "@/lib/feature-flags";
import * as THREE from "three";
import constanciaLogo from "@assets/constancia-logo.png";

// =============================================================================
// HeroSectionStatic — Constancia deconstruct + dive hero
// Ported from the design mockup. Wraps everything in a fixed-positioned stage
// so the rest of the page scrolls behind it; uses a tall in-flow scroll driver
// to give us scroll runway.
// =============================================================================

const STOPS = [0.05, 0.27, 0.47, 0.70, 0.95];
const SECTION = 0.20;

const LETTER_FLY = [
  { dx: -360, dy: -280, rot: -10 },
  { dx: -200, dy: -360, rot: -6 },
  { dx: -70, dy: -400, rot: 0 },
  { dx: 80, dy: -400, rot: 4 },
  { dx: 220, dy: -360, rot: 8 },
  { dx: 360, dy: -260, rot: 14 },
  { dx: 440, dy: -100, rot: 20 },
  { dx: 420, dy: -10, rot: 24 },
  { dx: -420, dy: -10, rot: -24 },
  { dx: -440, dy: -100, rot: -20 },
];

const MINT_DOT_FLY = { dx: -480, dy: 220, scale: 1.6 };
const ROSE_BAR_FLY = { dx: 0, dy: -380, scale: 1.8, rot: 6 };

type Frame = { p: number; top: number; left: number; size: number; op: number };

const CIRCLE_FRAMES: { rose: Frame[]; mint: Frame[] } = {
  rose: [
    { p: 0.0, top: 22, left: 54, size: 16, op: 0.78 },
    { p: 0.1, top: 22, left: 54, size: 16, op: 0.78 },
    { p: 0.25, top: 20, left: 84, size: 36, op: 0.5 },
    { p: 0.45, top: 78, left: 18, size: 40, op: 0.52 },
    { p: 0.65, top: 22, left: 18, size: 42, op: 0.5 },
    { p: 0.85, top: 78, left: 82, size: 38, op: 0.52 },
    { p: 0.96, top: 22, left: 54, size: 16, op: 0.78 },
    { p: 1.0, top: 22, left: 54, size: 16, op: 0.78 },
  ],
  mint: [
    { p: 0.0, top: 24, left: 57, size: 14, op: 0.78 },
    { p: 0.1, top: 24, left: 57, size: 14, op: 0.78 },
    { p: 0.25, top: 80, left: 18, size: 32, op: 0.5 },
    { p: 0.45, top: 22, left: 82, size: 34, op: 0.52 },
    { p: 0.65, top: 80, left: 82, size: 38, op: 0.5 },
    { p: 0.85, top: 22, left: 18, size: 36, op: 0.52 },
    { p: 0.96, top: 24, left: 57, size: 14, op: 0.78 },
    { p: 1.0, top: 24, left: 57, size: 14, op: 0.78 },
  ],
};

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function sampleFrames(frames: Frame[], p: number): Frame {
  for (let i = 0; i < frames.length - 1; i++) {
    if (p <= frames[i + 1].p) {
      const a = frames[i], b = frames[i + 1];
      const t = (p - a.p) / Math.max(0.0001, b.p - a.p);
      const e = smoothstep(Math.min(1, Math.max(0, t)));
      return {
        p,
        top: lerp(a.top, b.top, e),
        left: lerp(a.left, b.left, e),
        size: lerp(a.size, b.size, e),
        op: lerp(a.op, b.op, e),
      };
    }
  }
  return frames[frames.length - 1];
}
function letterProg(p: number) {
  if (p < 0.03) return 0;
  if (p < 0.11) return smoothstep((p - 0.03) / 0.08);
  if (p < 0.94) return 1;
  return smoothstep(1 - (p - 0.94) / 0.06);
}
function intactness(p: number) {
  if (p < 0.03) return 1;
  if (p > 0.97) return 1;
  if (p < 0.07) return smoothstep(1 - (p - 0.03) / 0.04);
  if (p > 0.93) return smoothstep((p - 0.93) / 0.04);
  return 0;
}
function damp(c: number, t: number, lambda: number, dt: number) {
  return c + (t - c) * (1 - Math.exp(-lambda * dt));
}

export function HeroSectionStatic() {
  const { flags } = useFeatureFlags();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const logoRealRef = useRef<HTMLImageElement | null>(null);
  const heroLogoRef = useRef<HTMLDivElement | null>(null);
  const roseBarRef = useRef<HTMLSpanElement | null>(null);
  const mintDotRef = useRef<HTMLSpanElement | null>(null);
  const circleRoseRef = useRef<HTMLDivElement | null>(null);
  const circleMintRef = useRef<HTMLDivElement | null>(null);
  const lettersRef = useRef<HTMLSpanElement[]>([]);
  const panelsRef = useRef<HTMLDivElement[]>([]);
  const progBarRef = useRef<HTMLSpanElement | null>(null);

  // Three.js setup + scroll loop in a single effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xF6F3EE, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(0, 0.9, 5.0);
    camera.lookAt(0, 0, 0);

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const VERT = `
      uniform float uTime; uniform float uPhase; uniform float uAmp;
      varying vec2 vUv; varying float vEle; varying vec3 vNormal; varying vec3 vWorldPos;
      float wave(vec2 p, float t, float ph) {
        return sin(p.x * 0.75 + t * 0.18 + ph)         * 0.40
             + cos(p.y * 0.55 - t * 0.14 + ph * 1.3)    * 0.34
             + sin((p.x + p.y) * 1.05 + t * 0.22 + ph)  * 0.18
             + cos((p.x * 1.7 - p.y * 0.85) + t * 0.11) * 0.13
             + sin((p.x * 0.4 + p.y * 1.2) - t * 0.16)  * 0.08;
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
      uniform vec3 uLightDir; uniform vec3 uCamPos; uniform float uOpacity;
      uniform float uDissolve;
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
        vec3 col = mix(hueShade, hueLit, lit);
        float spec = pow(clamp(dot(N, H), 0.0, 1.0), 64.0);
        col += vec3(1.0, 0.97, 0.94) * spec * 0.22;
        float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.8);
        col = mix(col, mix(uMint, uRose, ele) * 1.08, rim * 0.22);
        float edgeX = smoothstep(0.0, 0.26, vUv.x) * smoothstep(1.0, 0.74, vUv.x);
        float edgeY = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        float edge = edgeX * edgeY;
        float r = distance(vUv, vec2(0.5));
        float dissolveMask = smoothstep(uDissolve, max(uDissolve - 0.20, 0.001), r);
        float fog = smoothstep(22.0, 4.0, length(vWorldPos.xz));
        col = mix(vec3(0.965, 0.953, 0.933), col, fog * 0.88);
        gl_FragColor = vec4(col, edge * uOpacity * dissolveMask);
      }
    `;

    const COL = {
      MINT: new THREE.Color("#7FB8A3"),
      DEEPMINT: new THREE.Color("#5E8D7A"),
      ROSE: new THREE.Color("#C77A93"),
      BERRY: new THREE.Color("#8E4F67"),
    };
    const LIGHT_DIR = new THREE.Vector3(0.6, 0.85, 0.7).normalize();

    function makeFabric(opts: {
      size: number; segs: number; amp: number; phase: number;
      posY: number; posZ: number; rotX: number; rotZ: number; baseOpacity: number;
    }) {
      const geo = new THREE.PlaneGeometry(opts.size, opts.size * 0.62, opts.segs, Math.floor(opts.segs * 0.62));
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: {
          uTime: { value: 0 }, uPhase: { value: opts.phase }, uAmp: { value: opts.amp },
          uOpacity: { value: opts.baseOpacity },
          uMint: { value: COL.MINT }, uDeepMint: { value: COL.DEEPMINT },
          uRose: { value: COL.ROSE }, uBerry: { value: COL.BERRY },
          uLightDir: { value: LIGHT_DIR }, uCamPos: { value: camera.position },
          uDissolve: { value: 0 },
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = opts.rotX;
      mesh.rotation.z = opts.rotZ;
      mesh.position.set(0, opts.posY, opts.posZ);
      mesh.userData.baseOpacity = opts.baseOpacity;
      scene.add(mesh);
      return mesh;
    }

    const LAYERS = [
      makeFabric({ size: 10.0, segs: 200, amp: 0.85, phase: 2.4, posY: -0.20, posZ:  0.4,   rotX: -Math.PI * 0.50, rotZ: -0.04, baseOpacity: 0.30 }),
      makeFabric({ size: 11.0, segs: 180, amp: 0.95, phase: 0.0, posY: -0.30, posZ: -2.5,   rotX: -Math.PI * 0.46, rotZ:  0.08, baseOpacity: 0.42 }),
      makeFabric({ size: 12.0, segs: 160, amp: 1.00, phase: 1.1, posY: -0.45, posZ: -5.5,   rotX: -Math.PI * 0.52, rotZ: -0.06, baseOpacity: 0.52 }),
      makeFabric({ size: 13.0, segs: 140, amp: 1.05, phase: 3.0, posY: -0.55, posZ: -8.5,   rotX: -Math.PI * 0.44, rotZ:  0.05, baseOpacity: 0.60 }),
      makeFabric({ size: 14.0, segs: 120, amp: 1.10, phase: 4.2, posY: -0.65, posZ: -11.5,  rotX: -Math.PI * 0.50, rotZ: -0.03, baseOpacity: 0.62 }),
    ];

    resize();
    window.addEventListener("resize", resize);

    let mxSmooth = 0, mySmooth = 0, tx = 0.5, ty = 0.5;
    function onMove(e: PointerEvent) {
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
    }
    window.addEventListener("pointermove", onMove);

    const stage = stageRef.current;
    const stageH = () => stage ? stage.offsetHeight : window.innerHeight;
    function readScrollProg() {
      if (!stage) return 0;
      const top = stage.offsetTop;
      const h = stage.offsetHeight - window.innerHeight;
      return Math.min(1, Math.max(0, (window.scrollY - top) / Math.max(1, h)));
    }

    const clock = new THREE.Clock();
    let lastT = 0;
    let rafId = 0;

    const loadStart = performance.now();

    function frame() {
      const t = clock.getElapsedTime();
      const dt = Math.min(0.05, t - lastT);
      lastT = t;

      const scrollProg = readScrollProg();

      // Mouse parallax
      mxSmooth = damp(mxSmooth, tx - 0.5, 10, dt);
      mySmooth = damp(mySmooth, ty - 0.5, 10, dt);

      // Real logo / pieces crossfade
      const introT = (performance.now() - loadStart) / 1000;
      const loadEased = smoothstep(Math.max(0, Math.min(1, introT / 1.5)));
      const intact = intactness(scrollProg);
      const realOpacity = loadEased * intact;
      const piecesOpacity = loadEased * (1 - intact);

      const breath = 1 + Math.sin(t * 0.45) * 0.008;
      const parX = mxSmooth * 6;
      const parY = mySmooth * 4;
      const logoReal = logoRealRef.current;
      if (logoReal) {
        logoReal.style.opacity = realOpacity.toFixed(3);
        logoReal.style.transform = `translate(calc(-50% + ${parX.toFixed(2)}px), calc(-50% + ${parY.toFixed(2)}px)) scale(${breath.toFixed(4)})`;
      }
      const heroLogo = heroLogoRef.current;
      if (heroLogo) heroLogo.style.opacity = piecesOpacity.toFixed(3);

      // Letters
      const lProg = letterProg(scrollProg);
      lettersRef.current.forEach((el, i) => {
        if (!el) return;
        const fly = LETTER_FLY[i] || LETTER_FLY[0];
        const sx = fly.dx * lProg;
        const sy = fly.dy * lProg;
        const srot = fly.rot * lProg;
        el.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0) rotate(${srot.toFixed(2)}deg)`;
        el.style.opacity = (1 - lProg).toFixed(3);
      });

      const roseBar = roseBarRef.current;
      if (roseBar) {
        const bx = ROSE_BAR_FLY.dx * lProg;
        const by = ROSE_BAR_FLY.dy * lProg;
        const brot = ROSE_BAR_FLY.rot * lProg;
        const bsc = 1 + (ROSE_BAR_FLY.scale - 1) * lProg;
        roseBar.style.transform = `translate(-50%, 0) translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, 0) rotate(${brot.toFixed(2)}deg) scaleY(${bsc.toFixed(3)})`;
        roseBar.style.opacity = (1 - lProg * 0.5).toFixed(3);
      }
      const mintDot = mintDotRef.current;
      if (mintDot) {
        const dx = MINT_DOT_FLY.dx * lProg;
        const dy = MINT_DOT_FLY.dy * lProg;
        const dsc = 1 + (MINT_DOT_FLY.scale - 1) * lProg;
        mintDot.style.transform = `translateY(-2px) translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${dsc.toFixed(3)})`;
        mintDot.style.opacity = (1 - lProg * 0.5).toFixed(3);
      }

      // Brand circles
      const rFrame = sampleFrames(CIRCLE_FRAMES.rose, scrollProg);
      const mFrame = sampleFrames(CIRCLE_FRAMES.mint, scrollProg);
      const circleVis = loadEased * (1 - intact);
      const mxPar = mxSmooth * 24;
      const myPar = mySmooth * 16;
      const cr = circleRoseRef.current;
      if (cr) {
        cr.style.top = rFrame.top + "%";
        cr.style.left = rFrame.left + "%";
        cr.style.width = rFrame.size + "vmin";
        cr.style.height = rFrame.size + "vmin";
        cr.style.opacity = (rFrame.op * circleVis).toFixed(3);
        cr.style.transform = `translate(-50%, -50%) translate3d(${mxPar.toFixed(2)}px, ${myPar.toFixed(2)}px, 0)`;
      }
      const cm = circleMintRef.current;
      if (cm) {
        cm.style.top = mFrame.top + "%";
        cm.style.left = mFrame.left + "%";
        cm.style.width = mFrame.size + "vmin";
        cm.style.height = mFrame.size + "vmin";
        cm.style.opacity = (mFrame.op * circleVis).toFixed(3);
        cm.style.transform = `translate(-50%, -50%) translate3d(${(-mxPar).toFixed(2)}px, ${(-myPar).toFixed(2)}px, 0)`;
      }

      // Panels
      let activeIdx = 0;
      let minAbs = Infinity;
      panelsRef.current.forEach((panel, i) => {
        if (!panel) return;
        let offset = (scrollProg - STOPS[i]) / SECTION;
        if (i === STOPS.length - 1) offset = Math.min(0, offset);
        const absOffset = Math.abs(offset);
        if (absOffset < minAbs) { minAbs = absOffset; activeIdx = i; }
        const cl = Math.max(-1.6, Math.min(1.6, offset));
        const ty = -cl * 60;
        const tz = cl > 0 ? cl * 380 : cl * 600;
        const rx = -cl * 11;
        const parentOpacity = Math.max(0, 1 - Math.pow(absOffset, 1.35));
        panel.style.transform = `translate(0, calc(-50% + ${ty.toFixed(2)}vh)) translate3d(0, 0, ${tz.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg)`;
        panel.style.opacity = parentOpacity.toFixed(3);
        panel.style.pointerEvents = parentOpacity > 0.4 ? "auto" : "none";

        const kids = panel.querySelectorAll<HTMLElement>(".stagger");
        if (absOffset < 0.85) {
          const centered = 1 - Math.min(1, absOffset / 0.85);
          const eased = smoothstep(centered);
          kids.forEach((kid, j) => {
            const start = j * 0.16;
            const range = 0.45;
            const k = Math.max(0, Math.min(1, (eased - start) / range));
            kid.style.opacity = k.toFixed(3);
            kid.style.transform = `translate3d(0, ${((1 - k) * 14).toFixed(2)}px, 0)`;
          });
        } else {
          kids.forEach((kid) => {
            kid.style.opacity = "0";
            kid.style.transform = "translate3d(0, 14px, 0)";
          });
        }
      });
      if (progBarRef.current) progBarRef.current.style.width = (scrollProg * 100).toFixed(2) + "%";

      // Camera dive
      const camZ = 5.0 - scrollProg * 17;
      camera.position.x = damp(camera.position.x, mxSmooth * 1.0, 8, dt);
      camera.position.y = damp(camera.position.y, 0.9 - mySmooth * 0.5 + Math.cos(t * 0.10) * 0.06, 8, dt);
      camera.position.z = camZ;
      camera.rotation.z = damp(camera.rotation.z, Math.sin(scrollProg * Math.PI * 1.4) * 0.04 + mxSmooth * 0.03, 6, dt);
      camera.lookAt(camera.position.x * 0.25, 0, camera.position.z - 5);

      LAYERS.forEach((mesh) => {
        const u = mesh.material.uniforms as Record<string, { value: unknown }>;
        (u.uTime.value as number) = t;
        u.uCamPos.value = camera.position;
        const dist = camera.position.z - mesh.position.z;
        let dissolve = 0;
        if (dist < 1.6) dissolve = 1 - Math.max(0, dist / 1.6);
        if (dist < 0) dissolve = 1;
        (u.uDissolve.value as number) = dissolve;
        let baseOp = (mesh.userData.baseOpacity as number);
        if (dist > 12) baseOp *= Math.max(0, 1 - (dist - 12) / 8);
        if (dist < 0) baseOp *= Math.max(0, 1 + dist / 2);
        (u.uOpacity.value as number) = baseOp;
      });

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      LAYERS.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        scene.remove(mesh);
      });
      renderer.dispose();
    };
  }, []);

  // Helper to push letter refs in order
  const letterRef = (i: number) => (el: HTMLSpanElement | null) => {
    if (el) lettersRef.current[i] = el;
  };
  const panelRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) panelsRef.current[i] = el;
  };

  return (
    <section
      ref={stageRef}
      aria-labelledby="hero-heading"
      style={{
        position: "relative",
        width: "100%",
        // 5× viewport scroll runway — enough room for the dive sequence
        height: "500vh",
        background: "var(--brand-bg-primary)",
        fontFamily: "var(--brand-font-sans)",
      }}
    >
      {/* Fixed viewport stage that the scroll drives */}
      <div className="hero-fixed-stage">
        {/* Fabric canvas — full bleed atmosphere */}
        <canvas ref={canvasRef} className="hero-fabric-canvas" />

        {/* Grain overlay */}
        <div className="hero-grain" aria-hidden="true" />
        {/* Vignette */}
        <div className="hero-vignette" aria-hidden="true" />

        {/* Brand circles (DOM, mix-blend) */}
        <div ref={circleRoseRef} className="hero-brand-circle hero-brand-circle--rose" />
        <div ref={circleMintRef} className="hero-brand-circle hero-brand-circle--mint" />

        {/* Real logo image (intact state) */}
        <img
          ref={logoRealRef}
          src={constanciaLogo}
          alt="constancia"
          className="hero-logo-real"
        />

        {/* Deconstructable CSS logo (pieces) */}
        <div ref={heroLogoRef} className="hero-logo-pieces" aria-hidden="true">
          {["c", "o", "n", "s", "t", "a", "n", "c"].map((ch, i) => (
            <span key={i} className="hero-letter" ref={letterRef(i)}>{ch}</span>
          ))}
          <span className="hero-i-stack">
            <span className="hero-letter hero-letter-i" ref={letterRef(8)}>i</span>
            <span className="hero-rose-bar" ref={roseBarRef} />
          </span>
          <span className="hero-letter" ref={letterRef(9)}>a</span>
          <span className="hero-mint-dot" ref={mintDotRef} />
        </div>

        {/* Panel stack */}
        <div className="hero-panel-stack">
          <div ref={panelRef(0)} className="hero-panel">
            <div className="hero-eyebrow stagger">
              EPM Advisory · 2026
              <span className="hero-eyebrow-mint" />
            </div>
            <h1 id="hero-heading" className="hero-h1 stagger">
              The EPM firm<br />
              that charges <span className="hero-rose-mark">less</span><br />
              and <em>delivers more</em>
              <span className="hero-period" />
            </h1>
            <p className="hero-body stagger">
              Senior practitioners, AI-augmented tools, and a fixed-fee model
              that removes the cost and uncertainty of a typical consulting engagement.
            </p>
            <div className="hero-ctas stagger">
              {flags.financeCompass && (
                <Link href="/finance-compass" className="hero-btn">
                  Start your assessment <span className="hero-arrow">→</span>
                </Link>
              )}
              {flags.comparisonTools && (
                <Link href="/tools/epm-comparison" className="hero-btn hero-btn--ghost">
                  Compare platforms
                </Link>
              )}
            </div>
          </div>

          <div ref={panelRef(1)} className="hero-panel">
            <div className="hero-num stagger">01 · Senior practitioners</div>
            <h2 className="hero-h2 stagger">No juniors learning <em>on your dime</em>.</h2>
            <p className="hero-body stagger">
              Every engagement is staffed entirely with people who have already shipped this work at scale. The first person you meet is the person who builds it.
            </p>
          </div>

          <div ref={panelRef(2)} className="hero-panel">
            <div className="hero-num stagger">02 · Fixed price</div>
            <h2 className="hero-h2 stagger">One price. <em>No time-and-materials.</em></h2>
            <p className="hero-body stagger">
              You know what it costs before we start, and that number does not move. Scope changes are conversations, not invoices.
            </p>
          </div>

          <div ref={panelRef(3)} className="hero-panel">
            <div className="hero-num stagger">03 · AI-native delivery</div>
            <h2 className="hero-h2 stagger">Tooling embedded from <em>day one</em>.</h2>
            <p className="hero-body stagger">
              Our delivery model and your operating model are built around AI from the first conversation — not stapled on at the end.
            </p>
          </div>

          <div ref={panelRef(4)} className="hero-panel">
            <div className="hero-num stagger">04 · Start here</div>
            <h2 className="hero-h2 stagger">
              Know where you sit <span className="hero-rose-mark">today</span>
              <span className="hero-period" />
            </h2>
            <p className="hero-body stagger">
              FinanceCompass scores your finance function against 200+ EPM benchmarks in 12 minutes. Free. No call required.
            </p>
            {flags.financeCompass && (
              <div className="hero-ctas stagger">
                <Link href="/finance-compass" className="hero-btn">
                  Run the assessment <span className="hero-arrow">→</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Scroll progress hairline */}
        <div className="hero-scroll-prog"><span ref={progBarRef} /></div>
      </div>
    </section>
  );
}
