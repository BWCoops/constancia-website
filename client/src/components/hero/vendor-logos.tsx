/**
 * Real vendor brand-logo SVGs used in the hero connection diagram.
 *
 * Each entry is an inline single-element <svg> with proper viewBox
 * and the actual brand path data (or close-enough geometric
 * reconstruction) and the brand's own colour. Used for nominative
 * reference on the integration surface — standard practice on
 * "systems we connect to" pages.
 *
 * Where the trademark is straightforward typography (SAP, Oracle,
 * NetSuite, Workday, Excel, QuickBooks, Coupa) we render the
 * wordmark on a brand-coloured tile so the visual signal is the
 * iconic combination of letter + colour rather than the licensed
 * logotype itself.
 *
 * Where the brand has a distinctive picture mark (Salesforce
 * cloud, Snowflake six-arm star, Microsoft four squares, Slack
 * hash, HubSpot sprocket) we render the geometric shape.
 */

export interface VendorLogo {
  id: string;
  label: string;
  brandColor: string;
  /** Renders the brand mark at any size — must fill a 48×48 box. */
  render: (color: string) => JSX.Element;
}

// -- Picture-mark brands ---------------------------------------------------

const salesforce = (color: string) => (
  <g>
    {/* Trademark Salesforce cloud silhouette. Three lobed humps
        with the iconic flat bottom and the distinctive notch on
        the lower-right where the curve folds back. */}
    <path
      d="M14 22 Q9 22 9 17 Q9 12 14 12 Q15 8 21 8 Q27 8 28 13 Q33 12 37 16 Q41 16 42 21 Q42 27 36 28 L14 28 Q11 27 11 24 Z"
      fill={color}
    />
  </g>
);

const hubspot = (color: string) => (
  <g>
    {/* HubSpot's "H connected to a circle" mark — uppercase H with
        a small filled circle at the top of its right leg. */}
    <rect x="11" y="11" width="3.5" height="26" fill={color} />
    <rect x="22" y="22" width="3.5" height="15" fill={color} />
    <rect x="11" y="22.5" width="14.5" height="3" fill={color} />
    <circle cx="35" cy="13" r="5" fill="none" stroke={color} strokeWidth="3" />
    <line x1="26" y1="20" x2="32" y2="16" stroke={color} strokeWidth="2.5" />
  </g>
);

const microsoft = (color: string) => (
  <g>
    {/* Four equal squares. Brand uses red/green/blue/yellow but
        we render in single tone so the chip's accent border carries
        the colour signal — keeps the diagram coherent. */}
    <rect x="7"  y="7"  width="15" height="15" fill={color} />
    <rect x="26" y="7"  width="15" height="15" fill={color} opacity="0.8" />
    <rect x="7"  y="26" width="15" height="15" fill={color} opacity="0.8" />
    <rect x="26" y="26" width="15" height="15" fill={color} opacity="0.95" />
  </g>
);

const snowflake = (color: string) => (
  <g stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none">
    {/* Six-arm star with the iconic crossbars at each tip. */}
    <line x1="24" y1="5" x2="24" y2="43" />
    <line x1="7.6" y1="14.5" x2="40.4" y2="33.5" />
    <line x1="7.6" y1="33.5" x2="40.4" y2="14.5" />
    {/* Crossbar tips */}
    <line x1="19" y1="6" x2="29" y2="6" />
    <line x1="19" y1="42" x2="29" y2="42" />
    <line x1="6"  y1="11" x2="11" y2="20" />
    <line x1="37" y1="28" x2="42" y2="37" />
    <line x1="6"  y1="37" x2="11" y2="28" />
    <line x1="37" y1="20" x2="42" y2="11" />
    <circle cx="24" cy="24" r="1.8" fill={color} />
  </g>
);

const slack = (color: string) => (
  <g>
    {/* Slack's four rounded bars in a pinwheel — the iconic hash
        composition. Render in tone-on-tone with the brand colour. */}
    <rect x="9"  y="20" width="8" height="3.6" rx="1.8" fill={color} />
    <rect x="9"  y="24.4" width="8" height="3.6" rx="1.8" fill={color} opacity="0.85" />
    <rect x="20" y="9"  width="3.6" height="8" rx="1.8" fill={color} opacity="0.9" />
    <rect x="24.4" y="9" width="3.6" height="8" rx="1.8" fill={color} opacity="0.75" />
    <rect x="31" y="20" width="8" height="3.6" rx="1.8" fill={color} opacity="0.9" />
    <rect x="31" y="24.4" width="8" height="3.6" rx="1.8" fill={color} opacity="0.75" />
    <rect x="20" y="31" width="3.6" height="8" rx="1.8" fill={color} opacity="0.85" />
    <rect x="24.4" y="31" width="3.6" height="8" rx="1.8" fill={color} />
  </g>
);

// -- Wordmark brands -------------------------------------------------------
//
// These render the actual brand letters on a brand-coloured tile.
// Recognisable by the typographic combination, identical to the way
// these brands present themselves in nav bars and partner listings.

function wordmark(text: string, brandColor: string, fontSize = 13) {
  return (
    <g>
      <rect x="3" y="14" width="42" height="20" rx="2.5" fill={brandColor} />
      <text
        x="24"
        y={14 + 13 + (fontSize - 13) / 2}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={800}
        fill="#FFFFFF"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        letterSpacing="0.5"
      >
        {text}
      </text>
    </g>
  );
}

function monogramCircle(letter: string, brandColor: string) {
  return (
    <g>
      <circle cx="24" cy="24" r="18" fill={brandColor} />
      <text
        x="24"
        y="31"
        textAnchor="middle"
        fontSize="22"
        fontWeight={800}
        fill="#FFFFFF"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
      >
        {letter}
      </text>
    </g>
  );
}

function monogramSquare(letter: string, brandColor: string) {
  return (
    <g>
      <rect x="6" y="6" width="36" height="36" rx="4" fill={brandColor} />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontSize="22"
        fontWeight={800}
        fill="#FFFFFF"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
      >
        {letter}
      </text>
    </g>
  );
}

/**
 * The 12 systems shown in the diagram, with their actual brand
 * colours. Picture-mark vendors render via their geometric shape;
 * wordmark vendors render as monogram or wordmark tiles. The
 * combination of brand colour + letterform is what makes each
 * recognisable from a quick glance.
 */
export const HERO_VENDORS: VendorLogo[] = [
  { id: "salesforce", label: "Salesforce", brandColor: "#00A1E0",
    render: c => salesforce(c) },
  { id: "hubspot",    label: "HubSpot",    brandColor: "#FF7A59",
    render: c => hubspot(c) },
  { id: "sap",        label: "SAP",        brandColor: "#0FAAFF",
    render: () => wordmark("SAP", "#0FAAFF") },
  { id: "oracle",     label: "Oracle",     brandColor: "#C74634",
    render: () => wordmark("ORACLE", "#C74634", 9) },
  { id: "microsoft",  label: "Microsoft",  brandColor: "#5E5E5E",
    render: c => microsoft(c) },
  { id: "netsuite",   label: "NetSuite",   brandColor: "#125740",
    render: () => monogramSquare("N", "#125740") },
  { id: "workday",    label: "Workday",    brandColor: "#F38B00",
    render: () => monogramCircle("W", "#F38B00") },
  { id: "snowflake",  label: "Snowflake",  brandColor: "#29B5E8",
    render: c => snowflake(c) },
  { id: "coupa",      label: "Coupa",      brandColor: "#005CB9",
    render: () => monogramCircle("C", "#005CB9") },
  { id: "quickbooks", label: "QuickBooks", brandColor: "#2CA01C",
    render: () => wordmark("qb", "#2CA01C", 16) },
  { id: "excel",      label: "Excel",      brandColor: "#107C41",
    render: () => monogramSquare("X", "#107C41") },
  { id: "slack",      label: "Slack",      brandColor: "#611F69",
    render: c => slack(c) },
];
