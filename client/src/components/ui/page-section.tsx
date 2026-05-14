import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * PageSection
 * ─────────────────────────────────────────────────────────────────
 * Standard public-page section wrapper.
 * Replaces all style={{ background: 'var(--hp-bg-primary)', padding: '72px 0' }}
 * patterns scattered across page files.
 *
 * All spacing and colour values are sourced from CSS variables.
 *
 * Usage:
 *   <PageSection>...</PageSection>
 *   <PageSection variant="secondary">...</PageSection>
 *   <PageSection variant="banner">...</PageSection>
 *   <PageSection id="services" className="pb-40">...</PageSection>
 *   <PageSection contained={false}>...</PageSection>  -- full bleed, no inner container
 */

interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "primary" | "secondary" | "banner"
  contained?: boolean
}

const variantClass: Record<NonNullable<PageSectionProps["variant"]>, string> = {
  primary:   "section-primary",
  secondary: "section-secondary",
  banner:    "section-banner",
}

const PageSection = React.forwardRef<HTMLElement, PageSectionProps>(
  (
    {
      className,
      variant = "primary",
      contained = true,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <section
        ref={ref}
        className={cn(variantClass[variant], className)}
        {...props}
      >
        {contained ? (
          <div className="max-w-site mx-auto px-6">{children}</div>
        ) : (
          children
        )}
      </section>
    )
  }
)
PageSection.displayName = "PageSection"

export { PageSection }
