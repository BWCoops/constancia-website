/**
 * HeroConnectionDiagram
 *
 * The new hero centrepiece. A ring of 12 system icons (ERP, CRM,
 * HRIS, procurement, data warehouse, spreadsheets, etc.) sits around
 * a central Constancia "brain". As the user scrolls, the diagram
 * progressively assembles:
 *
 *   0.00 – 0.10  brain alone, faint pulse
 *   0.10 – 0.35  system icons fade in around the ring, staggered
 *   0.35 – 0.60  connection lines draw inward from each system
 *   0.60 – 0.80  data particles flow along the lines into the brain
 *   0.80 – 1.00  output label "Connected Enterprise Intelligence"
 *                emerges from the brain, ring rotation eases out
 *
 * Driven by a single `progress` prop (0-1) so the parent scroll
 * controller can wire it without this component knowing about
 * scroll events. 3D feel is achieved through subtle Y-axis rotation
 * of the ring (CSS transform), parallax scaling, and gradient stroked
 * paths with animated dash offsets for the connection lines.
 *
 * All colours pulled from the Constancia palette via tokens.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { HERO_SYSTEMS, CATEGORY_ACCENT } from "./system-icons";

interface HeroConnectionDiagramProps {
  /**
   * Optional explicit progress (0–1). When omitted, the component
   * reads scroll progress from its closest scroll-driver parent —
   * specifically, it walks up until it finds an element with the
   * `data-hero-stage` attribute and computes progress from that
   * element's bounding rect vs the viewport. This lets the diagram
   * drop in without any wiring from the parent hero component.
   */
  progress?: number;
  /** Optional className for the outer wrapper. */
  className?: string;
}

// 3D-ish parameters — the ring is laid out on a flat SVG but the
// per-node Y-axis rotation + scale gives it depth. Tuned by eye.
const RING_RADIUS_X = 38; // % of viewbox
const RING_RADIUS_Y = 18; // % of viewbox — squashed for perspective
const CENTRE = { x: 50, y: 50 };

// Phase boundaries, kept as constants so they read as a story.
const PHASE = {
  brain_alone_end: 0.10,
  icons_fade_start: 0.10,
  icons_fade_end: 0.35,
  lines_draw_start: 0.35,
  lines_draw_end: 0.60,
  particles_start: 0.60,
  particles_end: 0.80,
  output_start: 0.80,
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

interface NodePosition {
  x: number;
  y: number;
  depth: number; // 0 (back) -> 1 (front), used for scale & opacity
}

function positionOnRing(index: number, total: number, rotation: number): NodePosition {
  const angle = (index / total) * Math.PI * 2 + rotation;
  const x = CENTRE.x + Math.cos(angle) * RING_RADIUS_X;
  const y = CENTRE.y + Math.sin(angle) * RING_RADIUS_Y;
  // Depth: how close the node is to the bottom of the ring (closer = larger).
  // sin(angle) ranges -1..1; map to 0..1 with bottom of ring = max.
  const depth = (Math.sin(angle) + 1) / 2;
  return { x, y, depth };
}

export function HeroConnectionDiagram({ progress, className }: HeroConnectionDiagramProps) {
  // When `progress` is supplied externally, use it directly. Otherwise
  // run a self-contained rAF loop reading the hero stage's bounding
  // rect and keep `internalProgress` in step. The rAF guards against
  // re-rendering when progress hasn't materially changed (>0.4%).
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [internalProgress, setInternalProgress] = useState(0);

  useEffect(() => {
    if (progress !== undefined) return; // externally driven, no listener needed
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
      if (Math.abs(next - lastValue) > 0.004) {
        lastValue = next;
        setInternalProgress(next);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [progress]);

  const p = clamp01(progress ?? internalProgress);

  // Stage progress values, derived from the global progress.
  const iconsRevealed = ease(PHASE.icons_fade_start, PHASE.icons_fade_end, p);
  const linesDrawn = ease(PHASE.lines_draw_start, PHASE.lines_draw_end, p);
  const particlesActive = ease(PHASE.particles_start, PHASE.particles_end, p);
  const outputRevealed = ease(PHASE.output_start, 1, p);

  // Ring rotation: starts slightly tilted, rotates ~12° through the
  // scroll, eases back to centre at the end. Subtle, not dizzying.
  const ringRotationDeg = useMemo(() => {
    const t = smoothstep(p);
    return -6 + t * 12 + Math.sin(p * Math.PI) * 4;
  }, [p]);

  // Brain pulse: slow breathing throughout, intensifies as data
  // arrives (lines drawn + particles active).
  const brainPulse = useMemo(() => {
    const base = 1 + Math.sin(p * Math.PI * 4) * 0.012;
    const dataLoad = (linesDrawn + particlesActive) / 2;
    return base * (1 + dataLoad * 0.06);
  }, [p, linesDrawn, particlesActive]);

  const nodes = useMemo(() => {
    return HERO_SYSTEMS.map((sys, i) => {
      const pos = positionOnRing(i, HERO_SYSTEMS.length, 0);
      // Stagger reveal across icons so they cascade in.
      const localReveal = clamp01(iconsRevealed * HERO_SYSTEMS.length - i);
      return { sys, pos, reveal: smoothstep(localReveal), index: i };
    });
  }, [iconsRevealed]);

  return (
    <div
      ref={wrapperRef}
      className={`hero-connection-diagram ${className ?? ""}`}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "100%",
          // 3D-ish tilt of the whole ring stage. Y-rotation creates
          // the perspective so the top of the ring recedes.
          transform: `perspective(1200px) rotateX(14deg) rotateY(${ringRotationDeg}deg)`,
          transformOrigin: "50% 50%",
          transition: "none",
        }}
      >
        <defs>
          {/* Gradient used for the connection lines. Rose at the
              system end, mint at the brain end — the brand carrying
              data toward the centre. */}
          <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C77A93" stopOpacity="0.0" />
            <stop offset="40%" stopColor="#C77A93" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7FB8A3" stopOpacity="0.85" />
          </linearGradient>

          {/* Soft radial wash behind the brain — cream-into-mint
              halo that intensifies with data flow. */}
          <radialGradient id="brain-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7FB8A3" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#C77A93" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#F6F3EE" stopOpacity="0" />
          </radialGradient>

          {/* Drop shadow used on icon chips to lift them. */}
          <filter id="chip-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" />
            <feOffset dx="0" dy="0.4" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.25" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines (drawn first so chips sit on top). */}
        <g>
          {nodes.map(({ pos, index }) => {
            // Curved path from node toward the brain. Quadratic
            // Bézier with a control point pulled toward centre but
            // biased outward for an organic arc.
            const cpX = (pos.x + CENTRE.x) / 2;
            const cpY = (pos.y + CENTRE.y) / 2 - 4 * Math.sign(pos.x - CENTRE.x);
            const d = `M ${pos.x} ${pos.y} Q ${cpX} ${cpY} ${CENTRE.x} ${CENTRE.y}`;

            // Stagger per-line drawing so lines appear sequentially.
            const localDraw = clamp01(linesDrawn * HERO_SYSTEMS.length - index * 0.5);
            const pathLength = 100;
            const dashOffset = pathLength * (1 - smoothstep(localDraw));

            // Particle along this line: appears once line is drawn,
            // animates from system end to brain end via dash-offset trick.
            const localParticle = clamp01(particlesActive * HERO_SYSTEMS.length - index * 0.4);
            const particleProgress = smoothstep(localParticle % 1);

            // Position particle along the curve (rough linear interp on
            // the Bézier; close enough at this scale).
            const t = particleProgress;
            const px = (1 - t) * (1 - t) * pos.x + 2 * (1 - t) * t * cpX + t * t * CENTRE.x;
            const py = (1 - t) * (1 - t) * pos.y + 2 * (1 - t) * t * cpY + t * t * CENTRE.y;

            return (
              <g key={`line-${index}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="url(#connection-gradient)"
                  strokeWidth={0.35}
                  strokeLinecap="round"
                  strokeDasharray={pathLength}
                  strokeDashoffset={dashOffset}
                  pathLength={pathLength}
                  opacity={0.7 * smoothstep(localDraw)}
                />
                {particlesActive > 0 && localParticle > 0 && (
                  <circle
                    cx={px}
                    cy={py}
                    r={0.6}
                    fill="#7FB8A3"
                    opacity={0.9 * smoothstep(localParticle)}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Brain halo behind the brain itself. */}
        <circle cx={CENTRE.x} cy={CENTRE.y} r={20 * brainPulse} fill="url(#brain-halo)" />

        {/* The brain. Triple-circle composition mirroring the
            Constancia logomark — cream centre, rose + mint accents. */}
        <g style={{ transformOrigin: `${CENTRE.x}px ${CENTRE.y}px`, transform: `scale(${brainPulse})` }}>
          <circle cx={CENTRE.x} cy={CENTRE.y} r={9} fill="#F6F3EE" stroke="#1E2630" strokeWidth={0.3} />
          <circle cx={CENTRE.x - 2.2} cy={CENTRE.y - 1.4} r={3.4} fill="#C77A93" opacity={0.85} />
          <circle cx={CENTRE.x + 2.4} cy={CENTRE.y + 1.0} r={2.8} fill="#7FB8A3" opacity={0.85} />
        </g>

        {/* System icon chips. Rendered last so they sit above the lines. */}
        <g>
          {nodes.map(({ sys, pos, reveal, index }) => {
            const accent = CATEGORY_ACCENT[sys.category];
            // Depth-based scale + opacity. Bottom-of-ring nodes are
            // larger and crisper than top-of-ring (mild perspective).
            const depthScale = 0.85 + pos.depth * 0.30;
            const chipScale = reveal * depthScale;

            return (
              <g
                key={sys.id}
                style={{
                  transformOrigin: `${pos.x}px ${pos.y}px`,
                  transform: `scale(${chipScale})`,
                  opacity: reveal,
                  transition: "none",
                }}
              >
                {/* Chip background — cream rounded square. */}
                <rect
                  x={pos.x - 4.5}
                  y={pos.y - 4.5}
                  width={9}
                  height={9}
                  rx={1.8}
                  fill="#F6F3EE"
                  stroke={accent}
                  strokeWidth={0.35}
                  filter="url(#chip-shadow)"
                />
                {/* Icon body, tinted to the category accent. */}
                <g
                  transform={`translate(${pos.x - 3.5}, ${pos.y - 3.5}) scale(${7 / 48})`}
                  style={{ color: accent }}
                >
                  {sys.svg}
                </g>
                {/* Label sits below the chip. */}
                <text
                  x={pos.x}
                  y={pos.y + 7.5}
                  textAnchor="middle"
                  fontSize={1.6}
                  fontFamily="var(--brand-font-sans, system-ui)"
                  fill="#1E2630"
                  opacity={reveal * 0.85}
                  // Counter-rotate so labels read flat to the viewer
                  // even as the ring tilts.
                  transform={`rotate(${-ringRotationDeg * 0.4} ${pos.x} ${pos.y + 7.5})`}
                >
                  {sys.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Output ribbon — text emerges from the brain on the right
            side once the diagram has assembled. */}
        {outputRevealed > 0 && (
          <g
            style={{
              opacity: outputRevealed,
              transformOrigin: `${CENTRE.x}px ${CENTRE.y}px`,
              transform: `translateY(${20 * (1 - outputRevealed)}px)`,
            }}
          >
            <text
              x={CENTRE.x}
              y={CENTRE.y + 22}
              textAnchor="middle"
              fontSize={2.6}
              fontWeight={300}
              letterSpacing="0.04em"
              fontFamily="var(--brand-font-sans, system-ui)"
              fill="#12161D"
            >
              Connected enterprise intelligence
            </text>
            <line
              x1={CENTRE.x - 14}
              y1={CENTRE.y + 24}
              x2={CENTRE.x + 14}
              y2={CENTRE.y + 24}
              stroke="#8E4F67"
              strokeWidth={0.25}
              opacity={0.5}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
