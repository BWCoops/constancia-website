/**
 * HeroConnectionDiagram — imperative, ref-based, single-pass.
 *
 *      ┌─────────┐
 *      │ vendor  │──┐
 *      └─────────┘  │
 *      ┌─────────┐  │   ╔════════════╗      Connected enterprise
 *      │ vendor  │──┼──→║ CONSTANCIA ║ ───→ intelligence  →
 *      └─────────┘  │   ╚════════════╝
 *      ┌─────────┐  │
 *      │ vendor  │──┘
 *      └─────────┘
 *      (×12, staggered)
 *
 * ARCHITECTURE (different from the previous version on purpose).
 *
 * The previous build drove animation via React state — every scroll
 * tick called setState, React reconciled the whole SVG tree, browser
 * re-rasterised the Gaussian-blurred chip shadows, ~12 chips × every
 * frame. That produced the lag the user reported.
 *
 * This rewrite:
 *
 *   1. SVG structure is rendered ONCE. Every animated element holds
 *      a stable React ref (chip <g>, beam <path>, particle <circle>,
 *      output <g>, halo <ellipse>, wrapper <div>).
 *
 *   2. The parent's existing rAF loop in hero-section-static.tsx
 *      calls our imperative `setProgress(p)` method via a forwarded
 *      ref. We mutate DOM attributes / styles directly. No setState,
 *      no React reconciliation during scroll.
 *
 *   3. Gaussian-blur filters removed. Each chip used to apply two
 *      `feGaussianBlur` shadow/glow filters per frame — the most
 *      expensive SVG operation. Replaced with a static offset
 *      <rect> behind each chip (free, GPU-friendly).
 *
 *   4. Wave rings moved to pure CSS @keyframes (in index.css). They
 *      pulse continuously without touching JS — the browser's
 *      compositor handles them on the GPU.
 *
 *  The parent rAF loop already polls `getBoundingClientRect()` once
 *  per frame to drive the letter animation. We piggyback on that
 *  rather than running our own loop.
 */

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { HERO_VENDORS } from "./vendor-logos";

export interface HeroDiagramHandle {
  /** Drives the diagram from the parent's rAF loop. */
  setProgress: (p: number) => void;
}

interface HeroConnectionDiagramProps {
  className?: string;
}

// SVG geometry constants — unchanged from before.
const VIEW_W = 1600;
const VIEW_H = 900;
const CENTRE = { x: VIEW_W / 2, y: VIEW_H * 0.30 };
const LEFT_LANE_Y_TOP = CENTRE.y - 180;
const LEFT_LANE_Y_BOTTOM = CENTRE.y + 180;
const OUTPUT_X = VIEW_W - 120;
const OUTPUT_Y = CENTRE.y;

// Two-cycle choreography with HOLD windows.
const CYCLE_ONE_END = 0.12;
const HOLD_ONE_END = 0.22;
const FADE_OUT_END = 0.28;
const FADE_IN_START = 0.66;
const CYCLE_TWO_START = 0.72;

const SUB = {
  CHIPS_END: 0.50,
  BEAMS_START: 0.35,
  BEAMS_END: 0.80,
  OUTPUT_START: 0.55,
};

// -- Math helpers ----------------------------------------------------------

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}
function easeInCubic(t: number) {
  return t * t * t;
}
function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}
function ease(start: number, end: number, p: number): number {
  if (p <= start) return 0;
  if (p >= end) return 1;
  return smoothstep((p - start) / (end - start));
}
function bezier3(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const it = 1 - t;
  return it * it * it * p0 + 3 * it * it * t * p1 + 3 * it * t * t * p2 + t * t * t * p3;
}

// -- Layout (computed once) ------------------------------------------------

interface VendorLayout {
  index: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  c1x: number; c1y: number;
  c2x: number; c2y: number;
  delay: number;
}

function buildLayout(): VendorLayout[] {
  const n = HERO_VENDORS.length;
  const laneSpacing = (LEFT_LANE_Y_BOTTOM - LEFT_LANE_Y_TOP) / (n - 1);
  const restX1 = 220;
  const restX2 = 320;
  return HERO_VENDORS.map((_, i) => {
    const startY = LEFT_LANE_Y_TOP + i * laneSpacing;
    const endX = i % 2 === 0 ? restX1 : restX2;
    const endY = startY * 0.85 + CENTRE.y * 0.15;
    const c1x = -120;
    const c1y = startY + (CENTRE.y - startY) * 0.2 + (i % 2 === 0 ? -30 : 30);
    const c2x = endX - 100;
    const c2y = endY + (i % 2 === 0 ? -20 : 20);
    return {
      index: i,
      startX: -160,
      startY,
      endX,
      endY,
      c1x, c1y, c2x, c2y,
      delay: (i / n) * 0.8,
    };
  });
}

// -- Component -------------------------------------------------------------

export const HeroConnectionDiagram = forwardRef<HeroDiagramHandle, HeroConnectionDiagramProps>(
  function HeroConnectionDiagram({ className }, ref) {
    const layout = useMemo(() => buildLayout(), []);

    // All animated elements get refs so we can mutate them imperatively.
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const haloRef = useRef<SVGEllipseElement | null>(null);
    const chipRefs = useRef<(SVGGElement | null)[]>([]);
    const beamRefs = useRef<(SVGPathElement | null)[]>([]);
    const particleRefs = useRef<(SVGCircleElement | null)[]>([]);
    const beamGroupRefs = useRef<(SVGGElement | null)[]>([]);
    const outputGroupRef = useRef<SVGGElement | null>(null);
    const shockwaveRef = useRef<SVGCircleElement | null>(null);
    const headlineRefs = useRef<(SVGTextElement | null)[]>([]);
    const underlineRef = useRef<SVGLineElement | null>(null);
    const statGroupRef = useRef<SVGGElement | null>(null);
    const statValueRef = useRef<SVGTextElement | null>(null);

    // setProgress is the imperative entry point. The parent calls
    // this once per rAF tick — we read scroll progress as a number
    // and mutate every animated DOM node accordingly. No setState.
    useImperativeHandle(ref, () => ({
      setProgress(p: number) {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        // -- Phase 1: resolve cycle + alpha ------------------------
        let alpha = 0;
        let localP = 0;
        let visible = false;
        if (p <= CYCLE_ONE_END) {
          localP = clamp01(p / CYCLE_ONE_END);
          alpha = 1;
          visible = true;
        } else if (p < HOLD_ONE_END) {
          localP = 1;
          alpha = 1;
          visible = true;
        } else if (p < FADE_OUT_END) {
          localP = 1;
          alpha = 1 - smoothstep((p - HOLD_ONE_END) / (FADE_OUT_END - HOLD_ONE_END));
          visible = true;
        } else if (p >= CYCLE_TWO_START) {
          localP = clamp01((p - CYCLE_TWO_START) / (1 - CYCLE_TWO_START));
          alpha = 1;
          visible = true;
        } else if (p >= FADE_IN_START) {
          localP = 0;
          alpha = smoothstep((p - FADE_IN_START) / (CYCLE_TWO_START - FADE_IN_START));
          visible = true;
        }

        // Wrapper opacity drives everything.
        wrapper.style.opacity = String(alpha);
        // When fully invisible, hide the SVG from the compositor
        // entirely so it doesn't paint at all. Big perf win during
        // the long body-panel scroll window.
        if (svgRef.current) {
          svgRef.current.style.visibility = visible && alpha > 0.01 ? "visible" : "hidden";
        }
        if (!visible || alpha < 0.01) return;

        // -- Phase 2: sub-phase values -----------------------------
        const chipsPhase = ease(0, SUB.CHIPS_END, localP);
        const beamsPhase = ease(SUB.BEAMS_START, SUB.BEAMS_END, localP);
        const outputPhase = ease(SUB.OUTPUT_START, 1, localP);

        // -- Phase 3: stage 3D transform on the SVG ----------------
        if (svgRef.current) {
          svgRef.current.style.transform =
            `perspective(1800px) rotateX(8deg) rotateY(${(-2 + localP * 4).toFixed(2)}deg)`;
        }

        // -- Phase 4: halo pulse -----------------------------------
        if (haloRef.current) {
          const dataLoad = (chipsPhase + beamsPhase + outputPhase) / 3;
          const grow = 1 + dataLoad * 0.08;
          haloRef.current.setAttribute("rx", String(260 * grow));
          haloRef.current.setAttribute("ry", String(180 * grow));
        }

        // -- Phase 5: chips + beams + particles --------------------
        for (let i = 0; i < layout.length; i++) {
          const v = layout[i];
          const chipEl = chipRefs.current[i];
          const beamGroupEl = beamGroupRefs.current[i];
          const beamEl = beamRefs.current[i];
          const particleEl = particleRefs.current[i];
          if (!chipEl || !beamGroupEl || !beamEl || !particleEl) continue;

          // Chip arrival progress with ease-in cubic ("pulled in" feel).
          const chipLocal = clamp01((chipsPhase - v.delay) / (1 - v.delay));
          if (chipLocal <= 0) {
            chipEl.style.opacity = "0";
            beamGroupEl.style.opacity = "0";
            continue;
          }
          const t = easeInCubic(chipLocal);
          const cx = bezier3(t, v.startX, v.c1x, v.c2x, v.endX);
          const cy = bezier3(t, v.startY, v.c1y, v.c2y, v.endY);
          const rotY = 90 * (1 - t);
          const scale = 0.4 + 0.6 * t;

          // Apply chip transform via a single transform string. The
          // chip <g> sits at the SVG origin; we translate + rotate +
          // scale here. GPU-friendly because we never touch SVG
          // attributes that trigger layout — only the inline transform.
          chipEl.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) scale(${scale.toFixed(3)}) rotateY(${rotY.toFixed(1)}deg)`;
          chipEl.style.opacity = String(t);

          // Beam — same chip-local for ramp + draw direction. Compute
          // its current path d-attribute from the live chip position.
          const beamLocal = clamp01((beamsPhase - v.delay) / Math.max(0.001, 1 - v.delay));
          if (beamLocal <= 0) {
            beamGroupEl.style.opacity = "0";
          } else {
            const d = `M ${cx} ${cy} Q ${(cx + CENTRE.x) / 2} ${(cy + CENTRE.y) / 2 - 40} ${CENTRE.x - 90} ${CENTRE.y}`;
            beamEl.setAttribute("d", d);
            const pathLength = 800;
            beamEl.style.strokeDasharray = String(pathLength);
            beamEl.style.strokeDashoffset = String(pathLength * (1 - smoothstep(beamLocal)));
            beamGroupEl.style.opacity = String(0.7 * beamLocal);

            // Particle position along the same Bézier.
            const pt = (beamLocal * 1.6) % 1;
            const px = (1 - pt) * (1 - pt) * cx + 2 * (1 - pt) * pt * ((cx + CENTRE.x) / 2) + pt * pt * (CENTRE.x - 90);
            const py = (1 - pt) * (1 - pt) * cy + 2 * (1 - pt) * pt * ((cy + CENTRE.y) / 2 - 40) + pt * pt * CENTRE.y;
            particleEl.setAttribute("cx", String(px));
            particleEl.setAttribute("cy", String(py));
            particleEl.style.opacity = String(0.9 * beamLocal);
          }
        }

        // -- Phase 6: output reveal --------------------------------
        if (outputGroupRef.current) {
          if (outputPhase <= 0) {
            outputGroupRef.current.style.opacity = "0";
          } else {
            outputGroupRef.current.style.opacity = "1";
            const shockwave = clamp01(outputPhase / 0.40);
            const wordsP = clamp01((outputPhase - 0.30) / 0.50);
            const underlineP = clamp01((outputPhase - 0.60) / 0.40);
            const statP = clamp01((outputPhase - 0.70) / 0.30);

            // Shockwave ring expanding from centre.
            if (shockwaveRef.current) {
              if (shockwave > 0 && shockwave < 1) {
                shockwaveRef.current.style.opacity = String((1 - shockwave) * 0.85);
                shockwaveRef.current.setAttribute("r", String(40 + easeOutQuart(shockwave) * 320));
                shockwaveRef.current.style.strokeWidth = String(2 * (1 - shockwave) + 0.5);
              } else {
                shockwaveRef.current.style.opacity = "0";
              }
            }

            // Three-word headline, staggered.
            for (let i = 0; i < 3; i++) {
              const el = headlineRefs.current[i];
              if (!el) continue;
              const reveal = clamp01(wordsP * 3 - i);
              const eased = smoothstep(reveal);
              el.style.opacity = String(eased);
              el.style.transform = `translateX(${(30 * (1 - eased)).toFixed(1)}px)`;
            }

            // Underline draws right-to-left via dash offset.
            if (underlineRef.current) {
              const ulLen = 360;
              underlineRef.current.style.opacity = underlineP > 0 ? "1" : "0";
              underlineRef.current.style.strokeDasharray = String(ulLen);
              underlineRef.current.style.strokeDashoffset = String(ulLen * (1 - underlineP));
            }

            // Stat tick from 1 → 12.
            if (statGroupRef.current && statValueRef.current) {
              statGroupRef.current.style.opacity = String(statP);
              const val = Math.round(1 + statP * 11);
              if (statValueRef.current.textContent !== String(val)) {
                statValueRef.current.textContent = String(val);
              }
            }
          }
        }
      },
    }), [layout]);

    return (
      <div
        ref={wrapperRef}
        className={`hero-connection-diagram ${className ?? ""}`}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          willChange: "opacity",
        }}
      >
        {/* Wave rings now render in LandingHero directly so they
            appear from first paint, not gated on this component's
            lazy mount. See .hero-wave-layer in index.css. */}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: "100%",
            height: "100%",
            transformOrigin: "50% 50%",
            willChange: "transform, opacity",
          }}
        >
          <defs>
            <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C77A93" stopOpacity="0.0" />
              <stop offset="35%" stopColor="#C77A93" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#5E8D7A" stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id="logo-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7FB8A3" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#C77A93" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F6F3EE" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Halo */}
          <ellipse ref={haloRef} cx={CENTRE.x} cy={CENTRE.y} rx={260} ry={180} fill="url(#logo-halo)" />

          {/* Beam group rendered FIRST so chips sit on top. */}
          <g>
            {layout.map((v) => (
              <g
                key={`beam-${v.index}`}
                ref={el => { beamGroupRefs.current[v.index] = el; }}
                style={{ opacity: 0, willChange: "opacity" }}
              >
                <path
                  ref={el => { beamRefs.current[v.index] = el; }}
                  d=""
                  fill="none"
                  stroke="url(#beam-gradient)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  pathLength={800}
                  style={{ willChange: "stroke-dashoffset" }}
                />
                <circle
                  ref={el => { particleRefs.current[v.index] = el; }}
                  cx={0}
                  cy={0}
                  r={4}
                  fill="#7FB8A3"
                  style={{ opacity: 0, willChange: "opacity, cx, cy" }}
                />
              </g>
            ))}
          </g>

          {/* Chips. Each chip is a <g> with transform-origin at its
              own (cx,cy) — we apply the live translate+scale+rotate
              via inline style.transform from setProgress(). Static
              offset-rect serves as the chip shadow (no filter blur). */}
          <g>
            {layout.map((v) => {
              const vendor = HERO_VENDORS[v.index];
              const chipSize = 72;
              const half = chipSize / 2;
              return (
                <g
                  key={`chip-${v.index}`}
                  ref={el => { chipRefs.current[v.index] = el; }}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    opacity: 0,
                    willChange: "transform, opacity",
                  }}
                >
                  {/* Static shadow — offset rect with low-opacity
                      black fill, no Gaussian blur. Cheap on GPU. */}
                  <rect
                    x={-half + 2}
                    y={-half + 5}
                    width={chipSize}
                    height={chipSize}
                    rx={12}
                    fill="rgba(37,40,38,0.16)"
                  />
                  {/* Chip plate */}
                  <rect
                    x={-half}
                    y={-half}
                    width={chipSize}
                    height={chipSize}
                    rx={12}
                    fill="#F6F3EE"
                    stroke={vendor.brandColor}
                    strokeOpacity={0.85}
                    strokeWidth={1.5}
                  />
                  <g transform={`translate(${-half + 6}, ${-half + 6}) scale(${(chipSize - 12) / 48})`}>
                    {vendor.render(vendor.brandColor)}
                  </g>
                  <text
                    x={0}
                    y={half + 18}
                    textAnchor="middle"
                    fontSize="14"
                    fontFamily="var(--brand-font-sans, system-ui)"
                    fill="#252826"
                    opacity={0.85}
                  >
                    {vendor.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Shockwave + headline + underline + stat. All driven
              imperatively from setProgress(). */}
          <g ref={outputGroupRef} style={{ opacity: 0, willChange: "opacity" }}>
            <circle
              ref={shockwaveRef}
              cx={CENTRE.x}
              cy={CENTRE.y}
              r={40}
              fill="none"
              stroke="#7FB8A3"
              strokeWidth={1.5}
              style={{ opacity: 0 }}
            />
            {["Connected", "enterprise", "intelligence."].map((word, i) => (
              <text
                key={word}
                ref={el => { headlineRefs.current[i] = el; }}
                x={OUTPUT_X}
                y={OUTPUT_Y - 30 + i * 42}
                textAnchor="end"
                fontSize="38"
                fontWeight={i === 2 ? 500 : 300}
                letterSpacing="0.02em"
                fontFamily="var(--brand-font-sans, system-ui)"
                fill={i === 2 ? "#8E4F67" : "#252826"}
                style={{ opacity: 0, willChange: "opacity, transform" }}
              >
                {word}
              </text>
            ))}
            <line
              ref={underlineRef}
              x1={OUTPUT_X - 360}
              y1={OUTPUT_Y + 70}
              x2={OUTPUT_X}
              y2={OUTPUT_Y + 70}
              stroke="#7FB8A3"
              strokeWidth={2}
              strokeLinecap="round"
              style={{ opacity: 0 }}
            />
            <g ref={statGroupRef} style={{ opacity: 0, willChange: "opacity" }}>
              <text
                ref={statValueRef}
                x={OUTPUT_X}
                y={OUTPUT_Y + 110}
                textAnchor="end"
                fontSize="60"
                fontWeight={300}
                letterSpacing="-0.02em"
                fontFamily="var(--brand-font-sans, system-ui)"
                fill="#252826"
              >
                1
              </text>
              <text
                x={OUTPUT_X}
                y={OUTPUT_Y + 134}
                textAnchor="end"
                fontSize="12"
                letterSpacing="0.20em"
                fontFamily="var(--brand-font-sans, system-ui)"
                fill="#252826"
                opacity={0.65}
              >
                SYSTEMS · ONE TRUTH
              </text>
            </g>
          </g>
        </svg>
      </div>
    );
  },
);
