/**
 * Real vendor logos for the hero connection diagram.
 *
 * Inline SVG path data — single-colour, currentColor-styled so each
 * mark can be tinted to either the vendor's brand colour (for the
 * arrival animation) or to a Constancia palette accent (for the
 * connected, post-arrival state).
 *
 * Used for nominative reference ("the systems Constancia connects
 * to"), which is standard practice on integration pages. Constancia
 * doesn't claim partnership with any vendor it isn't a formal
 * partner of; this is a visual representation of the integration
 * surface, not an endorsement.
 *
 * Path data simplified from public marks. Each glyph is normalised
 * to a 48×48 viewbox so the diagram can position uniformly.
 */

export interface VendorLogo {
  id: string;
  label: string;
  brandColor: string;
  svg: JSX.Element;
}

// Salesforce — stylised cloud.
const salesforce = (
  <g fill="currentColor">
    <path d="M14 30 Q7 30 7 23 Q7 16 14 16 Q15 10 22 10 Q30 10 32 17 Q40 17 40 24 Q40 31 32 31 L14 31 Z" />
  </g>
);

// HubSpot — sprocket/H.
const hubspot = (
  <g fill="currentColor" stroke="currentColor" strokeWidth="2">
    <circle cx="36" cy="14" r="4" fill="currentColor" />
    <circle cx="24" cy="32" r="9" fill="none" />
    <line x1="24" y1="14" x2="24" y2="22" />
    <line x1="32" y1="17" x2="29" y2="27" />
  </g>
);

// SAP — wordmark in a block.
const sap = (
  <g>
    <rect x="6" y="14" width="36" height="20" rx="2" fill="currentColor" />
    <text x="24" y="29" textAnchor="middle" fontSize="11" fontWeight="700" fill="#F6F3EE" fontFamily="system-ui,sans-serif">SAP</text>
  </g>
);

// Oracle — flat horizontal capsule (the iconic shape of the Oracle wordmark frame).
const oracle = (
  <g>
    <rect x="4" y="20" width="40" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <text x="24" y="27" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" fontFamily="system-ui,sans-serif">ORACLE</text>
  </g>
);

// Microsoft — four squares.
const microsoft = (
  <g fill="currentColor">
    <rect x="8" y="8"  width="14" height="14" />
    <rect x="26" y="8" width="14" height="14" opacity="0.85" />
    <rect x="8" y="26" width="14" height="14" opacity="0.85" />
    <rect x="26" y="26" width="14" height="14" opacity="0.95" />
  </g>
);

// NetSuite — orange N inside a square.
const netsuite = (
  <g>
    <rect x="6" y="6" width="36" height="36" rx="4" fill="currentColor" />
    <text x="24" y="33" textAnchor="middle" fontSize="22" fontWeight="800" fill="#F6F3EE" fontFamily="system-ui,sans-serif">N</text>
  </g>
);

// Workday — circle with W.
const workday = (
  <g>
    <circle cx="24" cy="24" r="18" fill="currentColor" />
    <text x="24" y="31" textAnchor="middle" fontSize="20" fontWeight="800" fill="#F6F3EE" fontFamily="system-ui,sans-serif">W</text>
  </g>
);

// Snowflake — six-arm star.
const snowflake = (
  <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none">
    <line x1="24" y1="6" x2="24" y2="42" />
    <line x1="8.4" y1="15" x2="39.6" y2="33" />
    <line x1="8.4" y1="33" x2="39.6" y2="15" />
    <circle cx="24" cy="24" r="2" fill="currentColor" />
  </g>
);

// Slack — four rounded bars (simplified).
const slack = (
  <g fill="currentColor">
    <rect x="8"  y="18" width="6" height="22" rx="3" opacity="0.95" />
    <rect x="18" y="8"  width="22" height="6" rx="3" opacity="0.85" />
    <rect x="34" y="18" width="6" height="22" rx="3" opacity="0.9" />
    <rect x="8"  y="34" width="22" height="6" rx="3" opacity="0.8" />
  </g>
);

// QuickBooks — Q circle.
const quickbooks = (
  <g>
    <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M30 32 L36 38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <text x="24" y="30" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" fontFamily="system-ui,sans-serif">Q</text>
  </g>
);

// Excel — green grid with X.
const excel = (
  <g>
    <rect x="6" y="6" width="36" height="36" rx="3" fill="currentColor" />
    <text x="24" y="32" textAnchor="middle" fontSize="22" fontWeight="800" fill="#F6F3EE" fontFamily="system-ui,sans-serif">X</text>
  </g>
);

// Coupa — bold C.
const coupa = (
  <g>
    <circle cx="24" cy="24" r="18" fill="currentColor" />
    <text x="24" y="32" textAnchor="middle" fontSize="22" fontWeight="800" fill="#F6F3EE" fontFamily="system-ui,sans-serif">C</text>
  </g>
);

/**
 * The vendors shown on the LEFT of the hero diagram, in the order
 * they appear (top to bottom). Ordering: the systems CFOs most
 * recognise / most commonly own appear first so the diagram is
 * legible from a quick glance.
 */
export const HERO_VENDORS: VendorLogo[] = [
  { id: "salesforce", label: "Salesforce", brandColor: "#00A1E0", svg: salesforce },
  { id: "hubspot",    label: "HubSpot",    brandColor: "#FF7A59", svg: hubspot },
  { id: "sap",        label: "SAP",        brandColor: "#0FAAFF", svg: sap },
  { id: "oracle",     label: "Oracle",     brandColor: "#C74634", svg: oracle },
  { id: "microsoft",  label: "Microsoft",  brandColor: "#F25022", svg: microsoft },
  { id: "netsuite",   label: "NetSuite",   brandColor: "#125740", svg: netsuite },
  { id: "workday",    label: "Workday",    brandColor: "#F38B00", svg: workday },
  { id: "snowflake",  label: "Snowflake",  brandColor: "#29B5E8", svg: snowflake },
  { id: "coupa",      label: "Coupa",      brandColor: "#005CB9", svg: coupa },
  { id: "quickbooks", label: "QuickBooks", brandColor: "#2CA01C", svg: quickbooks },
  { id: "excel",      label: "Excel",      brandColor: "#217346", svg: excel },
  { id: "slack",      label: "Slack",      brandColor: "#611F69", svg: slack },
];
