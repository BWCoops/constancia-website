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
import constanciaLogo from "@assets/constancia-logo.png";
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

// Centre is where Constancia sits.
const CENTRE = { x: VIEW_W / 2, y: VIEW_H / 2 };

// Vendor chips originate from the left edge in a vertical column,
// then fly to one of several insertion points around the centre.
// Their "start" position lives just outside the visible area so
// they slide IN, not appear.
const LEFT_LANE_X = 80;
const LEFT_LANE_Y_TOP = 110;
const LEFT_LANE_Y_BOTTOM = VIEW_H - 110;

// Right output anchor.
const OUTPUT_X = VIEW_W - 120;
const OUTPUT_Y = CENTRE.y;

const PHASE = {
  CHIPS_START: 0.10,
  CHIPS_END: 0.45,
  BEAMS_START: 0.30,
  BEAMS_END: 0.60,
  OUTPUT_START: 0.55,
  OUTPUT_END: 0.85,
} as const;

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
      if (Math.abs(next - lastValue) > 0.003) {
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

  // Phase progress values.
  const chipsPhase = ease(PHASE.CHIPS_START, PHASE.CHIPS_END, p);
  const beamsPhase = ease(PHASE.BEAMS_START, PHASE.BEAMS_END, p);
  const outputPhase = ease(PHASE.OUTPUT_START, PHASE.OUTPUT_END, p);

  // Logo breathes throughout; pulses harder as data arrives.
  const logoPulse = useMemo(() => {
    const base = 1 + Math.sin(p * Math.PI * 3.5) * 0.014;
    const dataLoad = (chipsPhase + beamsPhase + outputPhase) / 3;
    return base * (1 + dataLoad * 0.05);
  }, [p, chipsPhase, beamsPhase, outputPhase]);

  // Wrapping perspective: slight rotateX for depth, plus a barely-
  // perceptible Y-wobble that follows scroll.
  const stageTransform = `perspective(1800px) rotateX(8deg) rotateY(${-2 + p * 4}deg)`;

  return (
    <div
      ref={wrapperRef}
      className={`hero-connection-diagram ${className ?? ""}`}
      aria-hidden="true"
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

        {/* Soft halo behind the Constancia mark. Scales with data load. */}
        <ellipse
          cx={CENTRE.x}
          cy={CENTRE.y}
          rx={260 * logoPulse}
          ry={180 * logoPulse}
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

            // Current chip position along the arrival curve.
            const t = chipLocal;
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

        {/* Constancia centre — the real wordmark PNG, embedded with
            a subtle scale pulse driven by data load. */}
        <g style={{
          transformOrigin: `${CENTRE.x}px ${CENTRE.y}px`,
          transform: `scale(${logoPulse})`,
        }}>
          <image
            href={constanciaLogo}
            x={CENTRE.x - 180}
            y={CENTRE.y - 60}
            width={360}
            height={120}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        {/* Vendor chips — flying in from the left along Bézier arcs. */}
        <g>
          {layout.map(v => {
            const vendor = HERO_VENDORS[v.index];
            const local = clamp01((chipsPhase - v.delay) / (1 - v.delay));
            if (local <= 0) return null;
            const t = smoothstep(local);
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
                {/* Vendor logo */}
                <g
                  transform={`translate(${cx - half + 10}, ${cy - half + 10}) scale(${(chipSize - 20) / 48})`}
                  style={{ color: logoColor }}
                >
                  {vendor.svg}
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

        {/* Output ribbon — emerges from the right side of the centre,
            text appearing as the beam completes. */}
        {outputPhase > 0 && (
          <g
            style={{
              opacity: outputPhase,
              transform: `translateX(${20 * (1 - outputPhase)}px)`,
            }}
          >
            <text
              x={OUTPUT_X}
              y={OUTPUT_Y - 8}
              textAnchor="end"
              fontSize="34"
              fontWeight={300}
              letterSpacing="0.04em"
              fontFamily="var(--brand-font-sans, system-ui)"
              fill="#12161D"
            >
              Connected enterprise
            </text>
            <text
              x={OUTPUT_X}
              y={OUTPUT_Y + 36}
              textAnchor="end"
              fontSize="34"
              fontWeight={500}
              letterSpacing="0.04em"
              fontFamily="var(--brand-font-sans, system-ui)"
              fill="#8E4F67"
            >
              intelligence.
            </text>
            <text
              x={OUTPUT_X}
              y={OUTPUT_Y + 70}
              textAnchor="end"
              fontSize="14"
              letterSpacing="0.18em"
              fontFamily="var(--brand-font-sans, system-ui)"
              fill="#1E2630"
              opacity={0.65}
            >
              ONE SOURCE OF TRUTH
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
