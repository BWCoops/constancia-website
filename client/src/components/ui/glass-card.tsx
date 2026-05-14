import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * GlassCard
 * ─────────────────────────────────────────────────────────────────
 * Standard dark glass card used throughout the public site.
 * Replaces all inline style={{ background: 'rgba(255,255,255,0.025)' }}
 * patterns that were scattered across the codebase.
 *
 * All values sourced from CSS variables — see index.css .glass-card.
 *
 * Usage:
 *   <GlassCard>...</GlassCard>
 *   <GlassCard hover={false}>...</GlassCard>    -- disables hover state
 *   <GlassCard className="p-8">...</GlassCard>  -- extra classes
 *   <GlassCard gradient>...</GlassCard>          -- gradient bg variant
 */

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  gradient?: boolean
  as?: React.ElementType
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    { className, hover = true, gradient = false, as: Tag = "div", ...props },
    ref
  ) => {
    return (
      <Tag
        ref={ref}
        className={cn(
          "glass-card",
          gradient && "bg-gradient-to-br from-brand-navy to-brand-teal border-transparent",
          !hover && "hover:border-[var(--brand-border)] hover:bg-[var(--brand-bg-surface)]",
          className
        )}
        {...props}
      />
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
