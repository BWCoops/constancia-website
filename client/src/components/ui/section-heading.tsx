import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * SectionHeading
 * ─────────────────────────────────────────────────────────────────
 * Standardises the [TAG pill → h2 → optional description] pattern
 * that appears at the top of every content section.
 *
 * All colours reference CSS variables. No hardcoded values.
 *
 * Usage:
 *   <SectionHeading tag="What We Do" title="We Fix Finance Technology Problems." />
 *
 *   <SectionHeading
 *     tag="Our Services"
 *     title="Senior EPM Delivery"
 *     description="Priced upfront, no vendor agenda."
 *     align="left"
 *   />
 */

interface SectionHeadingProps {
  tag?: string
  title: string
  titleHighlight?: string
  description?: string
  align?: "left" | "center"
  className?: string
  mb?: string
}

function SectionHeading({
  tag,
  title,
  titleHighlight,
  description,
  align = "center",
  className,
  mb = "mb-12",
}: SectionHeadingProps) {
  const isCenter = align === "center"

  return (
    <div
      className={cn(
        isCenter ? "text-center" : "text-left",
        mb,
        className
      )}
    >
      {tag && (
        <span className="section-tag mb-4 block">
          {tag}
        </span>
      )}

      <h2
        className="text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-4"
        style={{ color: "var(--brand-text-primary)" }}
      >
        {title}
        {titleHighlight && (
          <>
            <br />
            <span style={{ color: "var(--brand-cyan)" }}>{titleHighlight}</span>
          </>
        )}
      </h2>

      {description && (
        <p
          className={cn(
            "text-lg leading-relaxed",
            isCenter && "max-w-3xl mx-auto"
          )}
          style={{ color: "var(--brand-text-secondary)" }}
        >
          {description}
        </p>
      )}
    </div>
  )
}

export { SectionHeading }
