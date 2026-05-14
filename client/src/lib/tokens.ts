/**
 * 1QG Design Tokens
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
 */

// ─── Colour palette ──────────────────────────────────────────────────────────

export const COLOR = {
  // Backgrounds — dark first, used on every public page
  bgPrimary:        '#010E2A',   // deepest navy, outer / odd sections
  bgSecondary:      '#011630',   // slightly lighter, even sections
  bgSurface:        'rgba(255,255,255,0.025)', // glass card fill
  bgSurfaceHover:   'rgba(8,132,170,0.05)',    // glass card hover fill

  // Borders
  border:           'rgba(255,255,255,0.07)',  // default card / divider
  borderHover:      'rgba(8,132,170,0.28)',    // card hover state
  borderMuted:      'rgba(255,255,255,0.05)',  // section dividers
  borderStrong:     'rgba(255,255,255,0.14)',  // btn-brand full border

  // Text
  textPrimary:      '#FEFFF3',                        // headings, strong copy
  textSecondary:    'rgba(254,255,243,0.55)',          // body, descriptions
  textMuted:        'rgba(254,255,243,0.28)',          // labels
  textTertiary:     'rgba(254,255,243,0.22)',          // mono captions

  // Brand accents
  teal:             '#0884AA',   // primary CTA, active nav, icons
  cyan:             '#12EBFC',   // highlights, btn accent bar, hover
  navy:             '#02205B',   // deep gradient start, footer bg
  cream:            '#FEFFF3',   // primary text on dark

  // Gradient stops
  gradientBannerFrom:   '#02205B',
  gradientBannerMid:    '#0070C0',
  gradientBannerTo:     '#0884AA',
  gradientHeroFrom:     '#010E2A',
  gradientHeroTo:       '#02205B',

  // Cyan info box (used in careers, legal pages)
  infoBg:           'rgba(18,235,252,0.05)',
  infoBorder:       'rgba(18,235,252,0.12)',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const FONT = {
  sans: "'DM Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const SPACING = {
  sectionPy:     '72px',  // full section vertical padding
  sectionPySm:   '40px',  // reduced on mobile
  navHeight:     '64px',  // sticky nav height — used for pt-nav offsets
  maxWidth:      '80rem', // max-w-7xl = 1280px
  containerPx:   '1.5rem', // px-6
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────

export const RADIUS = {
  sm:      '3px',   // pill tags, small badges
  md:      '8px',   // form elements, dropdown items
  lg:      '12px',  // cards
  none:    '0px',   // brand buttons (Option D style)
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOW = {
  card:    '0 0 0 1px rgba(8,132,170,0.1)',
  glow:    '0 0 24px rgba(18,235,252,0.08)',
} as const;

// ─── Animation ───────────────────────────────────────────────────────────────

export const ANIMATION = {
  transitionBase:  '0.15s ease',
  transitionSlow:  '0.3s ease',
  transitionColor: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
} as const;
