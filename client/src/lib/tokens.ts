/**
 * Constancia Design Tokens
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for every brand value used across the app.
 *
 * Palette per Constancia brand sheet (2026):
 *  • Primary Dark   — graphite text, dark surfaces
 *  • Secondary Dark — slate for borders, layered panels
 *  • Main Light     — warm cream, dominant background
 *  • Support Neutral — muted stone for subtle support surfaces
 *  • Muted Rose     — pink accent (sparingly)
 *  • Deep Berry     — stronger rose for moments / hover
 *  • Mineral Green  — fresh mint accent (sparingly)
 *  • Deep Mint      — grounded mint
 */

// ─── Colour palette ──────────────────────────────────────────────────────────

export const COLOR = {
  // Primary brand — Constancia
  graphite:        '#12161D',
  slate:           '#12161D',
  cream:           '#F6F3EE',
  stone:           '#D8D0C6',
  rose:            '#C77A93',
  berry:           '#8E4F67',
  mint:            '#7FB8A3',
  deepMint:        '#5E8D7A',

  // Surface helpers (composed against cream)
  bgPrimary:        '#F6F3EE',
  bgSecondary:      '#EFEAE0',
  bgSurface:        'rgba(37,40,38,0.025)',
  bgSurfaceHover:   'rgba(199,122,147,0.06)',

  // Borders
  border:           'rgba(37,40,38,0.08)',
  borderHover:      'rgba(142,79,103,0.30)',
  borderMuted:      'rgba(37,40,38,0.05)',
  borderStrong:     'rgba(37,40,38,0.16)',

  // Text
  textPrimary:      '#12161D',
  textSecondary:    'rgba(37,40,38,0.66)',
  textMuted:        'rgba(37,40,38,0.42)',
  textTertiary:     'rgba(37,40,38,0.30)',

  // Translucent rose / mint for circles and overlays
  roseSoft:         'rgba(199,122,147,0.55)',
  mintSoft:         'rgba(127,184,163,0.55)',
  infoBg:           'rgba(127,184,163,0.08)',
  infoBorder:       'rgba(127,184,163,0.18)',

  // ─── LEGACY ALIASES ─────────────────────────────────────────────────
  // Kept so existing components compiled against the previous palette
  // still resolve. Map onto the closest Constancia equivalent.
  teal:             '#5E8D7A',
  cyan:             '#7FB8A3',
  navy:             '#12161D',

  gradientBannerFrom:   '#12161D',
  gradientBannerMid:    '#5E8D7A',
  gradientBannerTo:     '#7FB8A3',
  gradientHeroFrom:     '#F6F3EE',
  gradientHeroTo:       '#EFEAE0',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const FONT = {
  sans: "'Noto Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
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
  sm:      '4px',
  md:      '8px',
  lg:      '16px',
  full:    '999px',
  none:    '0px',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOW = {
  card:    '0 1px 0 rgba(37,40,38,0.04), 0 8px 24px -12px rgba(37,40,38,0.06)',
  glow:    '0 0 24px rgba(199,122,147,0.10)',
} as const;

// ─── Animation ───────────────────────────────────────────────────────────────

export const ANIMATION = {
  transitionBase:  '0.15s ease',
  transitionSlow:  '0.3s ease',
  transitionColor: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
} as const;
