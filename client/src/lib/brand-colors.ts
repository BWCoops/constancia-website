/**
 * Brand colour constants — single source of truth for hex values
 * used in JS data structures (chart configs, recharts <Bar fill>,
 * inline style objects, etc.) where a Tailwind class name doesn't
 * apply.
 *
 * For className usage prefer the brand-* utility classes wired up in
 * tailwind.config.ts (bg-brand-mint, text-brand-cream, etc.). These
 * constants exist for the places className isn't available.
 *
 * Keep in sync with the --brand-* CSS variables in client/src/index.css.
 */

export const BRAND_INK        = "#12161D"; // primary surface (ink)
export const BRAND_GRAPHITE   = "#1A1B1A"; // secondary surface
export const BRAND_CREAM      = "#F6F3EE"; // primary text
export const BRAND_STONE      = "#D8D0C6"; // support neutral
export const BRAND_ROSE       = "#C77A93"; // muted rose accent
export const BRAND_BERRY      = "#8E4F67"; // deep berry accent
export const BRAND_MINT       = "#7FB8A3"; // mineral green accent
export const BRAND_DEEP_MINT  = "#5E8D7A"; // deep mint accent

/** Convenience map for legacy `[hex]: label` lookups. */
export const BRAND_COLOR_NAMES: Record<string, string> = {
  [BRAND_INK]:       "ink",
  [BRAND_GRAPHITE]:  "graphite",
  [BRAND_CREAM]:     "cream",
  [BRAND_STONE]:     "stone",
  [BRAND_ROSE]:      "rose",
  [BRAND_BERRY]:     "berry",
  [BRAND_MINT]:      "mint",
  [BRAND_DEEP_MINT]: "deep-mint",
};
