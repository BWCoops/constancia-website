/**
 * HeroConnectionDiagram — left-to-right flow
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
 * Real vendor logos (Salesforce, HubSpot, SAP, Oracle, etc.) sweep
 * in from the left edge along curved 3D paths, fly toward the
 * Constancia wordmark in the centre, the wordmark absorbs the
 * incoming data with a pulse, and "Connected enterprise
 * intelligence" emerges from the right side as a single resolved
 * output stream.
 *
 * Driven by scroll progress 0–1, read directly from the parent
 * [data-hero-stage] container. Self-contained — no prop drilling
 * from the parent hero.
 *
 * Phases:
 *   0.00–0.10  empty stage, Constancia logo pulsing softly centre
 *   0.10–0.45  12 vendor chips fly in from the left, staggered
 *              with 3D rotateY entry + arc paths
 *   0.30–0.60  beams from each chip to centre, brand-colour →
 *              mint gradient. Data particles streak inward
 *   0.60–0.80  centre logo glows + scales; outbound beam emerges
 *              to the right; "Connected enterprise intelligence"
 *              fades in from x+offset
 *   0.80–1.00  steady-state composition holds; subtle breathing
 *
 * 3D feel: SVG `perspective` via wrapping CSS transform, per-chip
 * z-depth scaling, curved Bézier flight paths, gradient strokes
 * with animated dash offsets, particles streaking along the curves.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { HERO_VENDORS } from "./vendor-logos";

interface HeroConnectionDiagramProps {
  /** Optional explicit progress 0–1. When omitted, reads from the
   *  closest `[data-hero-stage]` ancestor's bounding rect. */
  progress?: number;
  className?: string;
}

// SVG viewbox — wide aspect to give the left→centre→right flow
// room without cramping. Designed at 1600×900 logical units.
const VIEW_W = 1600;
const VIEW_H = 900;

// Centre is where Constancia sits. y at 30% of VIEW_H to align
// with the wordmark's top:30% in the parent layout — beams
// converge on the real wordmark, panels (which sit at top:72%)
// never overlap the diagram or the wordmark.
const CENTRE = { x: VIEW_W / 2, y: VIEW_H * 0.30 };

// Vendor chips originate from the left edge in a vertical column,
// then fly to one of several insertion points around the centre.
// Lane spans 180px above and below CENTRE.y so the column stays
// in the upper third of the viewport, never reaching down into
// the body-copy panel area.
const LEFT_LANE_Y_TOP = CENTRE.y - 180;
const LEFT_LANE_Y_BOTTOM = CENTRE.y + 180;

// Right output anchor — sits on the same line as the wordmark.
const OUTPUT_X = VIEW_W - 120;
const OUTPUT_Y = CENTRE.y;

// Two-cycle choreography with HOLD windows so the assembled state
// dwells visible for a meaningful slice of scroll, not just a
// flash. Trace:
//   0.00-0.12  CYCLE 1 — assembly plays (chips, beams, output)
//   0.12-0.22  HOLD — diagram fully visible, no body panels yet
//   0.22-0.28  FADE OUT — alpha smoothly decays
//   0.30-0.72  body panels read on a clean stage
//   0.66-0.72  FADE IN — diagram alpha rises back to 1
//   0.72-1.00  CYCLE 2 — assembly replays for the contact panel,
//                          panel 8 co-visible from 0.86

const CYCLE_ONE = { start: 0.00, end: 0.12 } as const;
const HOLD_ONE_END = 0.22;
const FADE_OUT_END = 0.28;
const FADE_IN_START = 0.66;
const CYCLE_TWO = { start: 0.72, end: 1.00 } as const;

// Internal sub-phase timings (within a 0–1 local cycle). Chips
// finish their flight at 0.5 of the cycle so they reach their
// resting position halfway through; the rest of the cycle is
// dedicated to beams, particles, and the output reveal.
const SUB_PHASE = {
  CHIPS_START: 0.00,
  CHIPS_END: 0.50,
  BEAMS_START: 0.35,
  BEAMS_END: 0.80,
  OUTPUT_START: 0.55,
  OUTPUT_END: 1.00,
} as const;

// Cycle 1 assembly runs CYCLE_ONE.start → CYCLE_ONE.end (0.00–0.12).
// Then a HOLD window keeps the diagram fully visible until
// HOLD_ONE_END (0.22). Then alpha fades smoothly to 0 by
// FADE_OUT_END (0.28). Cycle 2 mirrors on the way out:
// FADE_IN_START (0.66) → CYCLE_TWO.start (0.72), then the
// assembly replays through to scroll = 1.00. The inner SVG keeps
// rendering during the fade windows so the viewer sees a smooth
// dissolve rather than a hard cut.

function cycleProgress(p: number): { localP: number; visible: boolean; alpha: number } {
  if (p <= CYCLE_ONE.end) {
    // Cycle 1 assembly in progress.
    return {
      localP: clamp01((p - CYCLE_ONE.start) / (CYCLE_ONE.end - CYCLE_ONE.start)),
      visible: true,
      alpha: 1,
    };
  }
  if (p < HOLD_ONE_END) {
    // HOLD — fully assembled, alpha stays at 1 so the user can
    // see the resolved diagram before scrolling on.
    return { localP: 1, visible: true, alpha: 1 };
  }
  if (p < FADE_OUT_END) {
    // Cycle 1 fade-out — alpha eases 1→0 while the inner state
    // remains at its resolved end.
    const t = (p - HOLD_ONE_END) / (FADE_OUT_END - HOLD_ONE_END);
    return { localP: 1, visible: true, alpha: 1 - smoothstep(t) };
  }
  if (p >= CYCLE_TWO.start) {
    // Cycle 2 assembly in progress.
    return {
      localP: clamp01((p - CYCLE_TWO.start) / (CYCLE_TWO.end - CYCLE_TWO.start)),
      visible: true,
      alpha: 1,
    };
  }
  if (p >= FADE_IN_START) {
    // Cycle 2 fade-in — render at localP=0, alpha eases 0→1
    // before the assembly itself kicks off at CYCLE_TWO.start.
    const t = (p - FADE_IN_START) / (CYCLE_TWO.start - FADE_IN_START);
    return { localP: 0, visible: true, alpha: smoothstep(t) };
  }
  return { localP: 0, visible: false, alpha: 0 };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}
function ease(start: number, end: number, p: number): number {
  if (p <= start) return 0;
  if (p >= end) return 1;
  return smoothstep((p - start) / (end - start));
}

// Strong ease-in cubic — chips drift slowly from off-screen, then
// accelerate hard as they approach the centre. Reads as "pulled in
// by gravity" rather than constant-velocity. Pair with the Bézier
// path so the motion is both curved AND accelerating.
function easeInCubic(t: number): number {
  return t * t * t;
}

// Ease-out for the wave/halo expansions — fast start that settles
// into a slow drift outward. Pairs visually with the gravitational
// pull of the chips moving the other direction.
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// Cubic Bézier evaluation for the arrival curves.
function bezier3(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const it = 1 - t;
  return it * it * it * p0 + 3 * it * it * t * p1 + 3 * it * t * t * p2 + t * t * t * p3;
}

interface VendorLayout {
  index: number;
  startX: number;
  startY: number;
  endX: number;     // resting position after arrival
  endY: number;
  /** Bézier control points for the arrival curve. */
  c1x: number; c1y: number;
  c2x: number; c2y: number;
  delay: number;    // 0..1 fraction of the chips phase before this chip starts
}

function buildLayout(): VendorLayout[] {
  const n = HERO_VENDORS.length;
  const laneSpacing = (LEFT_LANE_Y_BOTTOM - LEFT_LANE_Y_TOP) / (n - 1);
  // Final resting positions form a tighter, staggered column —
  // closer to centre, two columns deep for visual rhythm.
  const restX1 = 220;
  const restX2 = 320;
  return HERO_VENDORS.map((_, i) => {
    const startY = LEFT_LANE_Y_TOP + i * laneSpacing;
    // Alternate resting column for depth.
    const endX = i % 2 === 0 ? restX1 : restX2;
    const endY = startY * 0.85 + CENTRE.y * 0.15; // ease a little toward centre vertically
    // Bézier control points: curve outward to the left first, then
    // sweep up/down to the resting spot. Creates a swooping arc
    // entry rather than a straight slide.
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
      delay: i / n * 0.8, // stagger over 80% of the chips phase
    };
  });
}

export function HeroConnectionDiagram({ progress, className }: HeroConnectionDiagramProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [internalProgress, setInternalProgress] = useState(0);

  // Self-syncing scroll reader. The diagram finds its hero-stage
  // ancestor and computes progress directly, so it drops in with
  // zero wiring from the parent component.
  useEffect(() => {
    if (progress !== undefined) return;
    let rafId = 0;
    let lastValue = -1;
    const readProgress = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return 0;
      const stage = wrapper.closest<HTMLElement>("[data-hero-stage]");
      const target = stage ?? wrapper;
      const rect = target.getBoundingClientRect();
      const total = target.offsetHeight - window.innerHeight;
      if (total <= 0) return 0;
      return Math.max(0, Math.min(1, -rect.top / total));
    };
    const tick = () => {
      const next = readProgress();
      // Tighter threshold — 0.0015 — for visibly smoother chip motion
      // during the assembly sequences. Updates ~660 per scroll of the
      // hero (vs ~330 before). Still cheap because of the dead-zone
      // skip below.
      if (Math.abs(next - lastValue) > 0.0015) {
        lastValue = next;
        setInternalProgress(next);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [progress]);

  const p = clamp01(progress ?? internalProgress);
  const layout = useMemo(() => buildLayout(), []);

  // Map global scroll into the local cycle (0-1 within cycle, or
  // 0 + invisible in the dead zone between cycles). The diagram
  // plays the SAME animation in cycle 1 and cycle 2.
  const { localP, visible, alpha } = cycleProgress(p);

  const chipsPhase = ease(SUB_PHASE.CHIPS_START, SUB_PHASE.CHIPS_END, localP);
  const beamsPhase = ease(SUB_PHASE.BEAMS_START, SUB_PHASE.BEAMS_END, localP);
  const outputPhase = ease(SUB_PHASE.OUTPUT_START, SUB_PHASE.OUTPUT_END, localP);

  // Wrapping perspective: subtle 3D tilt that follows the local
  // cycle phase rather than global scroll, so both cycles get the
  // same visual sweep.
  const stageTransform = `perspective(1800px) rotateX(8deg) rotateY(${-2 + localP * 4}deg)`;

  // Layer visibility: hidden in the dead zone (0.20-0.78) so body
  // copy panels read on a clean stage with no diagram artefacts
  // bleeding through.
  return (
    <div
      ref={wrapperRef}
      className={`hero-connection-diagram ${className ?? ""}`}
      aria-hidden="true"
      style={{
        opacity: alpha,
        pointerEvents: "none",
        // alpha is computed every frame via cycleProgress() so the
        // wrapper transitions via the JS value directly — no CSS
        // transition needed (it would lag the rAF).
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "100%",
          transform: stageTransform,
          transformOrigin: "50% 50%",
          willChange: "transform",
        }}
      >
        <defs>
          {/* Beam gradient — vendor brand-colour at the chip end,
              brand mint at the Constancia end. */}
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C77A93" stopOpacity="0.0" />
            <stop offset="35%" stopColor="#C77A93" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#5E8D7A" stopOpacity="0.85" />
          </linearGradient>

          {/* Output beam — mint at centre, deep-mint at the output
              text end. */}
          <linearGradient id="output-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7FB8A3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#5E8D7A" stopOpacity="0.0" />
          </linearGradient>

          {/* Radial halo behind the centre logo, intensifying with
              data load. */}
          <radialGradient id="logo-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7FB8A3" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#C77A93" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F6F3EE" stopOpacity="0" />
          </radialGradient>

          {/* Drop shadow used to lift chips off the background. */}
          <filter id="chip-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
            <feOffset dx="0" dy="6" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.18" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft glow halo applied to chips during arrival. */}
          <filter id="chip-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.6" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Everything below is skipped when the diagram is in the
            dead zone (scroll 0.20-0.78). Saves ~12 chip Bézier
            evaluations + ~12 beam paths + ~12 particles + halos
            per frame for ~60% of the scroll runway. */}
        {visible && <>
        {/* 3D wave layer — three concentric rings radiating outward
            from the centre, brand-coloured, slightly offset in phase.
            Reads as energy waves pulling the chips in. Each ring's
            radius grows with the local cycle phase via easeOutQuart,
            so they expand fast initially and settle into a slow
            outward drift. */}
        {[0, 1, 2].map((i) => {
          const phaseOffset = i * 0.33;
          const waveLocal = clamp01((localP * 1.8 - phaseOffset) % 1);
          const r = 60 + easeOutQuart(waveLocal) * 480;
          const op = (1 - waveLocal) * 0.35;
          const colors = ["#C77A93", "#7FB8A3", "#8E4F67"];
          return (
            <circle
              key={`wave-${i}`}
              cx={CENTRE.x}
              cy={CENTRE.y}
              r={r}
              fill="none"
              stroke={colors[i]}
              strokeWidth={1.2}
              opacity={op}
            />
          );
        })}

        {/* Soft halo behind the Constancia mark. Pulses with the
            chips + beams + output sub-phases (averaged so the halo
            grows as data accumulates). */}
        <ellipse
          cx={CENTRE.x}
          cy={CENTRE.y}
          rx={260 * (1 + ((chipsPhase + beamsPhase + outputPhase) / 3) * 0.08)}
          ry={180 * (1 + ((chipsPhase + beamsPhase + outputPhase) / 3) * 0.08)}
          fill="url(#logo-halo)"
        />

        {/* Connection beams — drawn BEFORE chips so chips sit on top. */}
        <g>
          {layout.map(v => {
            // Chip progress and beam progress are separate so beams
            // start drawing once the chip has begun arriving.
            const chipLocal = clamp01((chipsPhase - v.delay) / (1 - v.delay));
            const beamLocal = clamp01((beamsPhase - v.delay) / Math.max(0.001, 1 - v.delay));
            if (chipLocal <= 0) return null;

            // Current chip position along the arrival curve. Use
            // easeInCubic on the parameter so the chip drifts slowly
            // from the left, then accelerates hard as it nears the
            // centre — the "pulled in" feel. Bézier shapes the path;
            // ease-in shapes the velocity along that path.
            const t = easeInCubic(chipLocal);
            const cx = bezier3(t, v.startX, v.c1x, v.c2x, v.endX);
            const cy = bezier3(t, v.startY, v.c1y, v.c2y, v.endY);

            const d = `M ${cx} ${cy} Q ${(cx + CENTRE.x) / 2} ${(cy + CENTRE.y) / 2 - 40} ${CENTRE.x - 90} ${CENTRE.y}`;
            const pathLength = 800;
            const dashOffset = pathLength * (1 - smoothstep(beamLocal));

            // Particle position along the beam.
            const particleT = (beamLocal * 1.6) % 1;
            const px = (1 - particleT) * (1 - particleT) * cx + 2 * (1 - particleT) * particleT * ((cx + CENTRE.x) / 2) + particleT * particleT * (CENTRE.x - 90);
            const py = (1 - particleT) * (1 - particleT) * cy + 2 * (1 - particleT) * particleT * ((cy + CENTRE.y) / 2 - 40) + particleT * particleT * CENTRE.y;

            return (
              <g key={`beam-${v.index}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="url(#beam-gradient)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={pathLength}
                  strokeDashoffset={dashOffset}
                  pathLength={pathLength}
                  opacity={0.7 * beamLocal}
                />
                {beamLocal > 0.1 && (
                  <circle cx={px} cy={py} r={4} fill="#7FB8A3" opacity={0.9 * beamLocal}>
                    <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </g>

        {/* Output beam — emerges from the right side of the logo to
            the output text once data load is high enough. */}
        {outputPhase > 0 && (() => {
          const beamX1 = CENTRE.x + 80;
          const beamX2 = OUTPUT_X - 40;
          const dashOffset = (beamX2 - beamX1) * (1 - outputPhase);
          return (
            <g>
              <line
                x1={beamX1}
                y1={OUTPUT_Y}
                x2={beamX2}
                y2={OUTPUT_Y}
                stroke="url(#output-gradient)"
                strokeWidth={4}
                strokeDasharray={beamX2 - beamX1}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
              <polygon
                points={`${beamX2},${OUTPUT_Y - 8} ${beamX2 + 14},${OUTPUT_Y} ${beamX2},${OUTPUT_Y + 8}`}
                fill="#5E8D7A"
                opacity={outputPhase}
              />
            </g>
          );
        })()}

        {/* The wordmark itself is rendered by the parent hero
            component (.hero-logo-real) at top:38%, which is the
            same vertical anchor as the diagram's CENTRE. The
            diagram converges its beams onto that point but doesn't
            redraw the logo — avoids a double-wordmark on screen and
            lets the parent's intact/exploded crossfade run cleanly. */}

        {/* Vendor chips — flying in from the left along Bézier arcs. */}
        <g>
          {layout.map(v => {
            const vendor = HERO_VENDORS[v.index];
            const local = clamp01((chipsPhase - v.delay) / (1 - v.delay));
            if (local <= 0) return null;
            // Same ease-in curve as the beam-side computation above
            // so the chip body and its beam stay in sync. Gives the
            // unified "pulled in by gravity" motion across both
            // visual layers.
            const t = easeInCubic(local);
            const cx = bezier3(t, v.startX, v.c1x, v.c2x, v.endX);
            const cy = bezier3(t, v.startY, v.c1y, v.c2y, v.endY);

            // 3D-style entry: rotateY starts at 90° (edge-on) and
            // resolves to 0° as the chip lands. Scale grows from 0.4.
            const rotY = 90 * (1 - t);
            const scale = 0.4 + 0.6 * t;
            const opacity = t;

            // Once landed (t close to 1), tint the chip's logo to a
            // muted graphite — "absorbed into the Constancia system".
            // Before that, keep the brand colour vivid.
            const landed = t > 0.92 ? (t - 0.92) / 0.08 : 0;
            const logoColor = `color-mix(in srgb, ${vendor.brandColor} ${100 - landed * 60}%, #12161D ${landed * 60}%)`;

            const chipSize = 72;
            const half = chipSize / 2;

            return (
              <g
                key={`chip-${v.index}`}
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: `rotateY(${rotY}deg) scale(${scale})`,
                  opacity,
                }}
              >
                {/* Chip plate */}
                <rect
                  x={cx - half}
                  y={cy - half}
                  width={chipSize}
                  height={chipSize}
                  rx={12}
                  fill="#F6F3EE"
                  stroke={vendor.brandColor}
                  strokeOpacity={0.85}
                  strokeWidth={1.5}
                  filter="url(#chip-shadow)"
                />
                {/* Vendor logo — rendered via the new render(color)
                    API so the colour drives both stroke and fill. */}
                <g
                  transform={`translate(${cx - half + 6}, ${cy - half + 6}) scale(${(chipSize - 12) / 48})`}
                >
                  {vendor.render(logoColor)}
                </g>
                {/* Label sits below the chip */}
                <text
                  x={cx}
                  y={cy + half + 16}
                  textAnchor="middle"
                  fontSize="14"
                  fontFamily="var(--brand-font-sans, system-ui)"
                  fill="#1E2630"
                  opacity={0.85 * t}
                >
                  {vendor.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Cinematic end reveal. Three stages within the output
            sub-phase:
              0.00–0.40  shockwave ring expands from centre
              0.30–0.80  word-by-word reveal of headline
              0.60–1.00  underline draws + stat reveal
            All driven by `outputPhase` (0–1). The shockwave fades
            as it grows; the underline draws right-to-left as a
            stroke-dash animation; the stat ticks up via a simple
            interpolation. */}
        {outputPhase > 0 && (() => {
          // Sub-stages of the output reveal.
          const shockwave = clamp01(outputPhase / 0.40);
          const wordsP = clamp01((outputPhase - 0.30) / 0.50);
          const underlineP = clamp01((outputPhase - 0.60) / 0.40);
          const statP = clamp01((outputPhase - 0.70) / 0.30);

          // Words reveal with stagger across all three.
          const wordCount = 3;
          const wordReveal = (i: number) => clamp01(wordsP * wordCount - i);
          const words = ["Connected", "enterprise", "intelligence."];

          // Tick the stat 1 → 12 as `statP` runs.
          const statValue = Math.round(1 + statP * 11);

          // Underline geometry — drawn under the second text line.
          const ulX1 = OUTPUT_X - 360;
          const ulX2 = OUTPUT_X;
          const ulLen = ulX2 - ulX1;
          const ulOffset = ulLen * (1 - underlineP);

          return (
            <g>
              {/* Shockwave — single ring expanding outward from
                  centre at the moment the output starts. Reads as
                  the moment of resolution: "all those systems
                  agree, here's the result". */}
              {shockwave > 0 && shockwave < 1 && (
                <circle
                  cx={CENTRE.x}
                  cy={CENTRE.y}
                  r={40 + easeOutQuart(shockwave) * 320}
                  fill="none"
                  stroke="#7FB8A3"
                  strokeWidth={2 * (1 - shockwave) + 0.5}
                  opacity={(1 - shockwave) * 0.85}
                />
              )}

              {/* Headline — three words, each fades + slides in
                  with cubic easing, staggered. */}
              {words.map((word, i) => {
                const reveal = wordReveal(i);
                const eased = smoothstep(reveal);
                const yOffset = OUTPUT_Y - 30 + i * 42;
                return (
                  <text
                    key={word}
                    x={OUTPUT_X}
                    y={yOffset}
                    textAnchor="end"
                    fontSize="38"
                    fontWeight={i === wordCount - 1 ? 500 : 300}
                    letterSpacing="0.02em"
                    fontFamily="var(--brand-font-sans, system-ui)"
                    fill={i === wordCount - 1 ? "#8E4F67" : "#12161D"}
                    opacity={eased}
                    style={{
                      transform: `translateX(${30 * (1 - eased)}px)`,
                    }}
                  >
                    {word}
                  </text>
                );
              })}

              {/* Underline beneath the final word, drawing in
                  right-to-left as the headline finishes. */}
              {underlineP > 0 && (
                <line
                  x1={ulX1}
                  y1={OUTPUT_Y + 70}
                  x2={ulX2}
                  y2={OUTPUT_Y + 70}
                  stroke="#7FB8A3"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={ulLen}
                  strokeDashoffset={ulOffset}
                />
              )}

              {/* Stat — surfaces a tangible payoff number once the
                  underline has drawn. Ticks up to 12 (the number
                  of systems we're showing in the diagram). */}
              {statP > 0 && (
                <g style={{ opacity: statP }}>
                  <text
                    x={OUTPUT_X}
                    y={OUTPUT_Y + 110}
                    textAnchor="end"
                    fontSize="60"
                    fontWeight={300}
                    letterSpacing="-0.02em"
                    fontFamily="var(--brand-font-sans, system-ui)"
                    fill="#12161D"
                  >
                    {statValue}
                  </text>
                  <text
                    x={OUTPUT_X}
                    y={OUTPUT_Y + 134}
                    textAnchor="end"
                    fontSize="12"
                    letterSpacing="0.20em"
                    fontFamily="var(--brand-font-sans, system-ui)"
                    fill="#1E2630"
                    opacity={0.65}
                  >
                    SYSTEMS · ONE TRUTH
                  </text>
                </g>
              )}
            </g>
          );
        })()}
        </>}
      </svg>
    </div>
  );
}
