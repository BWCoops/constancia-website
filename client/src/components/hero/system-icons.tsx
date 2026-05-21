/**
 * System icons used in the hero connection diagram.
 *
 * Inline SVG path data (single-colour, currentColor-styled) so each
 * icon themes to whatever palette colour the parent sets. No asset
 * files, no trademark licence issues — these are simplified glyphs,
 * not the trademarked vendor marks. The diagram makes clear in copy
 * that they represent system *categories* Constancia connects to.
 *
 * Each icon ships at 48×48 viewbox so they all align in the ring
 * without per-icon scaling logic.
 */

export interface SystemIcon {
  /** Stable identifier used by the diagram for positioning. */
  id: string;
  /** Human-readable label shown under the icon. */
  label: string;
  /** What category of system this represents — drives palette accent. */
  category: "erp" | "crm" | "hris" | "procurement" | "data" | "spreadsheet" | "bi" | "comms";
  /** Inline SVG <path> or grouped paths drawn on a 48×48 viewbox. */
  svg: JSX.Element;
}

// Geometric, brand-neutral glyphs that suggest each system category
// without infringing on any logo IP. Designed at 48×48; rendered with
// currentColor so the diagram can tint them per palette accent.

const cubeStack = (
  <g fill="currentColor">
    <path d="M24 6 L40 14 L24 22 L8 14 Z" opacity="0.95" />
    <path d="M8 14 L8 30 L24 38 L24 22 Z" opacity="0.70" />
    <path d="M40 14 L40 30 L24 38 L24 22 Z" opacity="0.55" />
  </g>
);

const cloudGlyph = (
  <g fill="currentColor">
    <path d="M15 28 Q9 28 9 22 Q9 16 15 16 Q16 11 22 11 Q29 11 30 17 Q36 17 36 22 Q36 28 30 28 Z" />
    <circle cx="22" cy="34" r="1.5" opacity="0.5" />
    <circle cx="28" cy="34" r="1.5" opacity="0.5" />
  </g>
);

const peopleGlyph = (
  <g fill="currentColor">
    <circle cx="18" cy="17" r="5" />
    <circle cx="30" cy="17" r="5" />
    <path d="M9 36 Q9 26 18 26 Q27 26 27 36 Z" />
    <path d="M21 36 Q21 26 30 26 Q39 26 39 36 Z" opacity="0.7" />
  </g>
);

const cartGlyph = (
  <g fill="currentColor">
    <path d="M9 12 L13 12 L17 28 L37 28 L40 16 L17 16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="20" cy="36" r="3" />
    <circle cx="34" cy="36" r="3" />
  </g>
);

const databaseGlyph = (
  <g fill="currentColor">
    <ellipse cx="24" cy="12" rx="14" ry="4" />
    <path d="M10 12 L10 24 Q10 28 24 28 Q38 28 38 24 L38 12" />
    <path d="M10 24 L10 36 Q10 40 24 40 Q38 40 38 36 L38 24" opacity="0.65" />
  </g>
);

const gridGlyph = (
  <g fill="currentColor" stroke="currentColor" strokeWidth="1.2">
    <rect x="9" y="9" width="30" height="30" rx="2" fill="none" />
    <line x1="9" y1="18" x2="39" y2="18" />
    <line x1="9" y1="27" x2="39" y2="27" />
    <line x1="9" y1="36" x2="39" y2="36" />
    <line x1="19" y1="9" x2="19" y2="39" />
    <line x1="29" y1="9" x2="29" y2="39" />
  </g>
);

const barChartGlyph = (
  <g fill="currentColor">
    <rect x="9" y="26" width="6" height="14" rx="1" opacity="0.65" />
    <rect x="18" y="19" width="6" height="21" rx="1" opacity="0.80" />
    <rect x="27" y="13" width="6" height="27" rx="1" opacity="0.95" />
    <rect x="36" y="9" width="6" height="31" rx="1" />
  </g>
);

const chatGlyph = (
  <g fill="currentColor">
    <path d="M10 12 Q10 9 13 9 L35 9 Q38 9 38 12 L38 27 Q38 30 35 30 L20 30 L14 36 L14 30 Q10 30 10 27 Z" />
    <circle cx="18" cy="19" r="1.5" fill="#F6F3EE" />
    <circle cx="24" cy="19" r="1.5" fill="#F6F3EE" />
    <circle cx="30" cy="19" r="1.5" fill="#F6F3EE" />
  </g>
);

const networkGlyph = (
  <g fill="currentColor" stroke="currentColor" strokeWidth="1.5">
    <circle cx="24" cy="24" r="4" fill="currentColor" />
    <circle cx="10" cy="14" r="3" fill="currentColor" />
    <circle cx="38" cy="14" r="3" fill="currentColor" />
    <circle cx="10" cy="34" r="3" fill="currentColor" />
    <circle cx="38" cy="34" r="3" fill="currentColor" />
    <line x1="13" y1="16" x2="21" y2="22" />
    <line x1="35" y1="16" x2="27" y2="22" />
    <line x1="13" y1="32" x2="21" y2="26" />
    <line x1="35" y1="32" x2="27" y2="26" />
  </g>
);

const documentGlyph = (
  <g fill="currentColor">
    <path d="M12 6 L30 6 L38 14 L38 42 L12 42 Z" />
    <path d="M30 6 L30 14 L38 14" fill="#F6F3EE" opacity="0.4" />
    <line x1="16" y1="22" x2="33" y2="22" stroke="#F6F3EE" strokeWidth="1.5" opacity="0.5" />
    <line x1="16" y1="28" x2="33" y2="28" stroke="#F6F3EE" strokeWidth="1.5" opacity="0.5" />
    <line x1="16" y1="34" x2="26" y2="34" stroke="#F6F3EE" strokeWidth="1.5" opacity="0.5" />
  </g>
);

const dollarGlyph = (
  <g fill="currentColor">
    <circle cx="24" cy="24" r="16" />
    <text x="24" y="30" textAnchor="middle" fontSize="20" fontWeight="700" fill="#F6F3EE">£</text>
  </g>
);

const cogGlyph = (
  <g fill="currentColor">
    <path d="M24 8 L27 14 L33 13 L34 19 L40 22 L37 28 L40 33 L34 36 L33 42 L27 41 L24 47 L21 41 L15 42 L14 36 L8 33 L11 28 L8 22 L14 19 L15 13 L21 14 Z" transform="scale(0.85) translate(4, 0)" />
    <circle cx="24" cy="24" r="5" fill="#F6F3EE" />
  </g>
);

/**
 * The 12 systems shown in the ring. Order is the natural finance
 * sequence (source-of-truth systems first, then operational, then
 * the spreadsheet that survives despite everything).
 */
export const HERO_SYSTEMS: SystemIcon[] = [
  { id: "erp",          label: "ERP",          category: "erp",         svg: cubeStack },
  { id: "crm",          label: "CRM",          category: "crm",         svg: cloudGlyph },
  { id: "hris",         label: "HRIS",         category: "hris",        svg: peopleGlyph },
  { id: "procurement",  label: "Procurement",  category: "procurement", svg: cartGlyph },
  { id: "warehouse",    label: "Data warehouse", category: "data",      svg: databaseGlyph },
  { id: "excel",        label: "Spreadsheets", category: "spreadsheet", svg: gridGlyph },
  { id: "bi",           label: "BI / reporting", category: "bi",        svg: barChartGlyph },
  { id: "ledger",       label: "General ledger", category: "erp",       svg: documentGlyph },
  { id: "ap",           label: "AP / AR",      category: "procurement", svg: dollarGlyph },
  { id: "operations",   label: "Operations",   category: "comms",       svg: cogGlyph },
  { id: "comms",        label: "Comms",        category: "comms",       svg: chatGlyph },
  { id: "network",      label: "External feeds", category: "data",      svg: networkGlyph },
];

/** Brand palette accent assigned to each category. */
export const CATEGORY_ACCENT: Record<SystemIcon["category"], string> = {
  erp:         "#8E4F67", // berry
  crm:         "#C77A93", // rose
  hris:        "#5E8D7A", // deep mint
  procurement: "#7FB8A3", // mint
  data:        "#1E2630", // slate
  spreadsheet: "#8E4F67", // berry
  bi:          "#7FB8A3", // mint
  comms:       "#C77A93", // rose
};
