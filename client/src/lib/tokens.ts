/**
 * Constancia Design Tokens
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for every brand value used across the app.
 *
 * HOW TO USE
 *  • CSS variables  → index.css references these as string literals
 *  • Tailwind       → tailwind.config.ts maps them via `var(--brand-*)`
 *  • Components     → never import this file directly; use CSS vars or
 *                     Tailwind utilities instead. This file exists so
 *                     there is ONE place to change a colour and have it
 *                     cascade everywhere automatically.
 *
 * NEVER hardcode a hex value, rgba, or pixel measurement anywhere else
 * in the codebase. Add it here first, then reference it as a variable.
 *
 * BRAND RULE — Rose and Mineral Green are accent colours, not dominant
 * fills. The identity stays dark-led and restrained.
 */

// ─── Colour palette ──────────────────────────────────────────────────────────

export const COLOR = {
  // ── Constancia canonical palette ─────────────────────────────────
  primaryDark:      '#12161D',   // brand anchor, main background
  secondaryDark:    '#1E2630',   // panels, layering, depth
  mainLight:        '#F6F3EE',   // warm off-white, body text on dark
  supportNeutral:   '#D8D0C6',   // muted stone, supporting surfaces
  mutedRose:        '#C77A93',   // accent — warmth & emphasis
  deepBerry:        '#8E4F67',   // accent — premium moments, depth
  mineralGreen:     '#7FB8A3',   // accent — freshness, digital cues
  deepMint:         '#5E8D7A',   // accent — understated balance

  // ── Semantic role tokens (used throughout the codebase) ─────────
  // Backgrounds
  bgPrimary:        '#12161D',   // primary-dark
  bgSecondary:      '#1E2630',   // secondary-dark
  bgSurface:        'rgba(246,243,238,0.025)',  // glass card fill — main-light tint
  bgSurfaceHover:   'rgba(199,122,147,0.05)',   // glass card hover — rose tint

  // Borders
  border:           'rgba(246,243,238,0.07)',
  borderHover:      'rgba(199,122,147,0.28)',   // rose-tinted hover
  borderMuted:      'rgba(246,243,238,0.05)',
  borderStrong:     'rgba(246,243,238,0.14)',

  // Text — bumped opacity vs Constancia palette for "highly legible" spec requirement
  textPrimary:      '#F6F3EE',
  textSecondary:    'rgba(246,243,238,0.68)',
  textMuted:        'rgba(246,243,238,0.42)',
  textTertiary:     'rgba(246,243,238,0.30)',

  // Brand accents — semantic legacy names mapped to Constancia palette
  teal:             '#7FB8A3',   // teal role → mineral green (digital/product cue)
  cyan:             '#C77A93',   // cyan role → muted rose (signature accent — the `i`)
  navy:             '#0A0E14',   // deepest, footer/gradient endpoint
  cream:            '#F6F3EE',   // main-light alias

  // Gradient stops
  gradientBannerFrom:   '#12161D',
  gradientBannerMid:    '#1E2630',
  gradientBannerTo:     '#5E8D7A',   // deep mint at end — subtle, classy
  gradientHeroFrom:     '#0A0E14',
  gradientHeroTo:       '#12161D',

  // Info box — rose-tinted for warmth (was cyan electric)
  infoBg:           'rgba(199,122,147,0.05)',
  infoBorder:       'rgba(199,122,147,0.12)',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const FONT = {
  sans: "'Noto Sans', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const SPACING = {
  sectionPy:     '72px',
  sectionPySm:   '40px',
  navHeight:     '64px',
  maxWidth:      '80rem',
  containerPx:   '1.5rem',
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────

export const RADIUS = {
  sm:      '3px',
  md:      '8px',
  lg:      '12px',
  none:    '0px',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOW = {
  card:    '0 0 0 1px rgba(127,184,163,0.10)',   // mineral-green tint
  glow:    '0 0 24px rgba(199,122,147,0.08)',    // muted-rose glow
} as const;

// ─── Animation ───────────────────────────────────────────────────────────────

export const ANIMATION = {
  transitionBase:  '0.18s ease',    // slightly slower for "considered" feel
  transitionSlow:  '0.32s ease',
  transitionColor: 'color 0.18s ease, border-color 0.18s ease, background 0.18s ease',
} as const;
