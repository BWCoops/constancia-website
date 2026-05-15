import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Button variants
 * ───────────────────────────────────────────────────────────────────
 *  default          — shadcn primary (used in admin / tools)
 *  destructive      — red, errors / deletions
 *  outline          — transparent with outline (admin UI)
 *  secondary        — secondary action in admin / tools
 *  ghost            — no border, no background
 *  brand            — Constancia public site primary CTA (Option D: zero radius,
 *                     mono uppercase, cyan left accent bar)
 *  brand-secondary  — Constancia public site secondary CTA (muted left accent)
 *  brand-ghost      — Constancia public site quiet link-style action
 *
 * All brand colours are sourced from CSS variables — never hardcoded.
 * See /src/lib/tokens.ts and the brand-* vars in index.css.
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium " +
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-md bg-primary text-primary-foreground border border-primary-border hover-elevate active-elevate-2",
        destructive:
          "rounded-md bg-destructive text-destructive-foreground border border-destructive-border hover-elevate active-elevate-2",
        outline:
          "rounded-md border [border-color:var(--button-outline)] shadow-xs active:shadow-none hover-elevate active-elevate-2",
        secondary:
          "rounded-md border bg-secondary text-secondary-foreground border-secondary-border hover-elevate active-elevate-2",
        ghost:
          "rounded-md border border-transparent hover-elevate active-elevate-2",

        brand:
          "btn-brand-base btn-brand",
        "brand-secondary":
          "btn-brand-base btn-brand-secondary",
        "brand-ghost":
          "btn-brand-ghost !px-0 !py-0 text-sm",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm:      "min-h-8 rounded-md px-3 text-xs",
        lg:      "min-h-10 rounded-md px-8",
        icon:    "h-9 w-9",
        brand:   "",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const resolvedSize =
      size ??
      (variant === "brand" || variant === "brand-secondary" ? "brand" : "default")

    return (
      <Comp
        className={cn(buttonVariants({ variant, size: resolvedSize, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
