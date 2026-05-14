import * as React from "react"

/*
 * ProofBar
 * ─────────────────────────────────────────────────────────────────
 * The 4-column stat strip shown below the hero on the homepage.
 * Previously built as inline styles inside BelowFoldSections.tsx.
 * Now a standalone component — all values from CSS variables.
 *
 * Usage:
 *   <ProofBar items={proofBarItems} />
 *
 * Define items in the page file, not here — keeps data separate from
 * presentation.
 */

export interface ProofBarItem {
  stat:  string
  label: string
  body:  string
}

interface ProofBarProps {
  items: ProofBarItem[]
}

function ProofBar({ items }: ProofBarProps) {
  return (
    <div
      style={{
        display:        "flex",
        flexWrap:       "wrap",
        justifyContent: "center",
        background:     "var(--brand-bg-secondary)",
        borderTop:      "1px solid var(--brand-border-muted)",
        borderBottom:   "1px solid var(--brand-border-muted)",
        fontFamily:     "var(--brand-font-sans)",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.stat}
          className="proof-bar-item"
          style={{
            flex:        "1 1 180px",
            padding:     "28px 24px",
            textAlign:   "center",
            borderRight: i < items.length - 1
              ? "1px solid var(--brand-border-muted)"
              : "none",
          }}
        >
          <div
            style={{
              fontFamily:    "var(--brand-font-mono)",
              fontSize:      item.stat.length > 4
                ? "clamp(18px, 1.8vw, 26px)"
                : "clamp(26px, 2.8vw, 40px)",
              fontWeight:    "600",
              color:         "var(--brand-text-primary)",
              letterSpacing: "-0.03em",
              lineHeight:    "1",
              marginBottom:  "6px",
            }}
          >
            {item.stat}
          </div>

          <div
            style={{
              fontSize:      "11px",
              fontWeight:    "600",
              color:         "var(--brand-cyan)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom:  "6px",
              fontFamily:    "var(--brand-font-mono)",
            }}
          >
            {item.label}
          </div>

          <div
            style={{
              fontSize:   "10px",
              color:      "var(--brand-text-muted)",
              lineHeight: "1.5",
              maxWidth:   "160px",
              margin:     "0 auto",
            }}
          >
            {item.body}
          </div>
        </div>
      ))}
    </div>
  )
}

export { ProofBar }
