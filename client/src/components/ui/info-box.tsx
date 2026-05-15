import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * InfoBox
 * ─────────────────────────────────────────────────────────────────
 * Cyan-tinted callout box used for highlighted information, career
 * process notes, and legal page callouts.
 *
 * Replaces ad-hoc inline style blocks like:
 *   style={{ background: 'rgba(199,122,147,0.05)', border: '1px solid rgba(199,122,147,0.12)' }}
 *
 * All values sourced from --brand-info-* CSS variables.
 */

interface InfoBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function InfoBox({ className, children, ...props }: InfoBoxProps) {
  return (
    <div className={cn("info-box", className)} {...props}>
      {children}
    </div>
  )
}

export { InfoBox }
